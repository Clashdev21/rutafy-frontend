import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with phone and appRole for Rutafy business logic.
 * Roles: ADMIN, TRANSPORTISTA, MENSAJERO
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  /** Hashed password for local authentication */
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** System role for Manus auth */
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Application role for Rutafy business logic: ADMIN, TRANSPORTISTA (antes Cliente), MENSAJERO (antes Conductor) */
  appRole: mysqlEnum("appRole", ["ADMIN", "TRANSPORTISTA", "MENSAJERO"]).default("TRANSPORTISTA").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Companies table for business entities
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Service status enum
 */
export const serviceStatusEnum = mysqlEnum("serviceStatus", [
  "CREATED",
  "IN_PROGRESS",
  "COMPLETED",
  "FULFILLED",
]);

/**
 * Service type enum
 */
export const serviceTypeEnum = mysqlEnum("serviceType", [
  "MESSAGING",
  "TRANSPORT",
]);

/**
 * Services table for tracking deliveries and transport
 * customerId = TRANSPORTISTA (quien solicita)
 * driverId = MENSAJERO (quien ejecuta)
 */
/**
 * Service mode enum: EMPRESA (asociado a una compañía) o LIBRE (sin compañía)
 */
export const serviceModeEnum = mysqlEnum("serviceMode", [
  "EMPRESA",
  "LIBRE",
]);

export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  driverId: int("driverId"),
  companyId: int("companyId"),
  /** Modo del servicio: EMPRESA (con compañía) o LIBRE (sin compañía) */
  serviceMode: mysqlEnum("serviceMode", ["EMPRESA", "LIBRE"]).default("LIBRE").notNull(),
  serviceType: mysqlEnum("serviceType", ["MESSAGING", "TRANSPORT"]).notNull(),
  origin: varchar("origin", { length: 500 }).notNull(),
  destination: varchar("destination", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["CREATED", "IN_PROGRESS", "COMPLETED", "FULFILLED"]).default("CREATED").notNull(),
  /** Código alfanumérico único para validar el servicio (6-10 chars, sin caracteres confusos) */
  serviceCode: varchar("serviceCode", { length: 10 }).notNull().unique(),
  /** PIN de 4 dígitos para validar el servicio */
  servicePin: varchar("servicePin", { length: 4 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

/**
 * Service events for tracking history
 */
export const serviceEvents = mysqlTable("serviceEvents", {
  id: int("id").autoincrement().primaryKey(),
  serviceId: int("serviceId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  actorUserId: int("actorUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ServiceEvent = typeof serviceEvents.$inferSelect;
export type InsertServiceEvent = typeof serviceEvents.$inferInsert;
