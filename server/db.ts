import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  InsertCompany, companies, Company,
  InsertService, services, Service,
  InsertServiceEvent, serviceEvents, ServiceEvent
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { generateServiceCode, generateServicePin } from './serviceCode';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// USER QUERIES
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.appRole !== undefined) {
      values.appRole = user.appRole;
      updateSet.appRole = user.appRole;
    }
    if (user.active !== undefined) {
      values.active = user.active;
      updateSet.active = user.active;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: Omit<InsertUser, 'openId'> & { openId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate a unique openId for manually created users
  const openId = user.openId || `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const result = await db.insert(users).values({
    ...user,
    openId,
  });
  return result[0].insertId;
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, id));
}

// ============================================
// COMPANY QUERIES
// ============================================

export async function getAllCompanies(): Promise<Company[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).orderBy(desc(companies.createdAt));
}

export async function getCompanyById(id: number): Promise<Company | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCompany(company: InsertCompany): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(company);
  return result[0].insertId;
}

export async function updateCompany(id: number, data: Partial<InsertCompany>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set(data).where(eq(companies.id, id));
}

export async function deleteCompany(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(companies).where(eq(companies.id, id));
}

// ============================================
// SERVICE QUERIES
// ============================================

export async function getAllServices(): Promise<Service[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(services).orderBy(desc(services.createdAt));
}

export async function getServiceById(id: number): Promise<Service | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createService(service: Omit<InsertService, 'serviceCode' | 'servicePin'>): Promise<{ id: number; serviceCode: string; servicePin: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate unique code and PIN
  let serviceCode = generateServiceCode();
  let servicePin = generateServicePin();
  
  // Ensure code is unique (retry if collision)
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(services).where(eq(services.serviceCode, serviceCode)).limit(1);
    if (existing.length === 0) break;
    serviceCode = generateServiceCode();
    attempts++;
  }
  
  const result = await db.insert(services).values({
    ...service,
    serviceCode,
    servicePin,
  });
  
  // Create initial service event
  await createServiceEvent({
    serviceId: result[0].insertId,
    eventType: "CREATED",
  });
  
  return { id: result[0].insertId, serviceCode, servicePin };
}

export async function updateService(id: number, data: Partial<InsertService>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(services).set(data).where(eq(services.id, id));
}

export async function updateServiceStatus(
  id: number, 
  status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FULFILLED",
  actorUserId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(services).set({ status }).where(eq(services.id, id));
  
  // Create service event for status change
  await createServiceEvent({
    serviceId: id,
    eventType: `STATUS_CHANGED_TO_${status}`,
    actorUserId,
  });
}

export async function deleteService(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related service events first
  await db.delete(serviceEvents).where(eq(serviceEvents.serviceId, id));
  // Then delete the service
  await db.delete(services).where(eq(services.id, id));
}

// ============================================
// SERVICE EVENT QUERIES
// ============================================

export async function getServiceEvents(serviceId: number): Promise<ServiceEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(serviceEvents)
    .where(eq(serviceEvents.serviceId, serviceId))
    .orderBy(desc(serviceEvents.createdAt));
}

export async function createServiceEvent(event: InsertServiceEvent): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(serviceEvents).values(event);
  return result[0].insertId;
}


// ============================================
// AUTH-RELATED QUERIES
// ============================================

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(id: number, hashedPassword: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
}


// ============================================
// SERVICE CODE+PIN VALIDATION
// ============================================

/**
 * Valida código y PIN de un servicio y devuelve el servicio si es válido
 */
export async function getServiceByCodeAndPin(
  serviceId: number,
  code: string,
  pin: string
): Promise<Service | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(services)
    .where(and(
      eq(services.id, serviceId),
      eq(services.serviceCode, code.toUpperCase()),
      eq(services.servicePin, pin)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

/**
 * Inicia un servicio validando código y PIN
 * Cambia estado de CREATED a IN_PROGRESS
 */
export async function startServiceWithCodePin(
  serviceId: number,
  code: string,
  pin: string,
  actorUserId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validar código y PIN
  const service = await getServiceByCodeAndPin(serviceId, code, pin);
  
  if (!service) {
    return { success: false, error: "Código o PIN inválido" };
  }
  
  if (service.status !== "CREATED") {
    return { success: false, error: `El servicio no puede iniciarse. Estado actual: ${service.status}` };
  }
  
  // Actualizar estado
  await db.update(services)
    .set({ status: "IN_PROGRESS" })
    .where(eq(services.id, serviceId));
  
  // Registrar evento
  await createServiceEvent({
    serviceId,
    eventType: "SERVICE_STARTED_WITH_CODE_PIN",
    actorUserId,
  });
  
  return { success: true };
}

/**
 * Completa un servicio validando código y PIN
 * Cambia estado de IN_PROGRESS a COMPLETED
 */
export async function completeServiceWithCodePin(
  serviceId: number,
  code: string,
  pin: string,
  actorUserId: number
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validar código y PIN
  const service = await getServiceByCodeAndPin(serviceId, code, pin);
  
  if (!service) {
    return { success: false, error: "Código o PIN inválido" };
  }
  
  if (service.status !== "IN_PROGRESS") {
    return { success: false, error: `El servicio no puede completarse. Estado actual: ${service.status}` };
  }
  
  // Actualizar estado
  await db.update(services)
    .set({ status: "COMPLETED" })
    .where(eq(services.id, serviceId));
  
  // Registrar evento
  await createServiceEvent({
    serviceId,
    eventType: "SERVICE_COMPLETED_WITH_CODE_PIN",
    actorUserId,
  });
  
  return { success: true };
}
