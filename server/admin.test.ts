import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getAllCompanies: vi.fn().mockResolvedValue([
    { id: 1, name: "Test Company", active: true, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getCompanyById: vi.fn().mockResolvedValue({ id: 1, name: "Test Company", active: true }),
  createCompany: vi.fn().mockResolvedValue(1),
  updateCompany: vi.fn().mockResolvedValue(undefined),
  deleteCompany: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([
    { id: 1, name: "Test User", email: "test@test.com", appRole: "TRANSPORTISTA", active: true },
  ]),
  getUserById: vi.fn().mockResolvedValue({ id: 1, name: "Test User", appRole: "TRANSPORTISTA" }),
  createUser: vi.fn().mockResolvedValue(1),
  updateUser: vi.fn().mockResolvedValue(undefined),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  getAllServices: vi.fn().mockResolvedValue([
    { id: 1, customerId: 1, serviceType: "MESSAGING", origin: "A", destination: "B", status: "CREATED" },
  ]),
  getServiceById: vi.fn().mockResolvedValue({ id: 1, customerId: 1, status: "CREATED" }),
  createService: vi.fn().mockResolvedValue({ id: 1, serviceCode: "ABCD1234", servicePin: "5678" }),
  updateServiceStatus: vi.fn().mockResolvedValue(undefined),
  deleteService: vi.fn().mockResolvedValue(undefined),
  getServiceEvents: vi.fn().mockResolvedValue([]),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin", // Admin role
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user", // Non-admin role
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Admin Companies CRUD", () => {
  it("lists companies for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.companies.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("creates a company for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.companies.create({
      name: "New Company",
      active: true,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("updates a company for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.companies.update({
      id: 1,
      name: "Updated Company",
      active: false,
    });

    expect(result.success).toBe(true);
  });

  it("deletes a company for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.companies.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("denies access to non-admin users", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.companies.list()).rejects.toThrow("Acceso de administrador requerido");
  });
});

describe("Admin Users CRUD", () => {
  it("lists users for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.users.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a user for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.users.create({
      name: "New User",
      email: "new@test.com",
      appRole: "MENSAJERO",
      active: true,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("updates a user for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.users.update({
      id: 1,
      name: "Updated User",
      appRole: "TRANSPORTISTA",
    });

    expect(result.success).toBe(true);
  });

  it("deletes a user for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.users.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Admin Services", () => {
  it("lists services for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.services.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("updates service status for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.services.updateStatus({
      id: 1,
      status: "IN_PROGRESS",
    });

    expect(result.success).toBe(true);
  });

  it("deletes a service for admin user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.services.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Public Services API", () => {
  it("creates a service without authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const result = await caller.services.create({
      customerId: 1,
      serviceType: "MESSAGING",
      origin: "Point A",
      destination: "Point B",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("lists services without authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    const result = await caller.services.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
