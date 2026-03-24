import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({}),
  getAllCompanies: vi.fn().mockResolvedValue([
    { id: 1, name: "Test Company", active: true },
  ]),
  createService: vi.fn().mockResolvedValue({
    id: 1,
    serviceCode: "ABCD1234",
    servicePin: "5678",
  }),
  getServiceById: vi.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve({
        id: 1,
        customerId: 1,
        driverId: null,
        companyId: null,
        serviceType: "MESSAGING",
        serviceMode: "LIBRE",
        origin: "Test Origin",
        destination: "Test Destination",
        status: "COMPLETED",
        serviceCode: "ABCD1234",
        servicePin: "5678",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(null);
  }),
  updateServiceStatus: vi.fn().mockResolvedValue(true),
  createServiceEvent: vi.fn().mockResolvedValue({ id: 1 }),
  getAllServices: vi.fn().mockResolvedValue([
    {
      id: 1,
      customerId: 1,
      driverId: null,
      companyId: null,
      serviceType: "MESSAGING",
      serviceMode: "LIBRE",
      origin: "Test Origin",
      destination: "Test Destination",
      status: "COMPLETED",
      serviceCode: "ABCD1234",
      servicePin: "5678",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getServicesByCustomerId: vi.fn().mockResolvedValue([]),
  getServicesByDriverId: vi.fn().mockResolvedValue([]),
  getAvailableServices: vi.fn().mockResolvedValue([]),
  assignDriverToService: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@test.com",
    name: "Admin User",
    loginMethod: "local",
    role: "admin",
    appRole: "ADMIN",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createTransportistaContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "transportista-user",
    email: "transportista@test.com",
    name: "Transportista User",
    loginMethod: "local",
    role: "user",
    appRole: "TRANSPORTISTA",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Service Mode - Modelo Híbrido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transportista puede crear servicio modo LIBRE sin empresa", async () => {
    const ctx = createTransportistaContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.transportista.createService({
      serviceType: "MESSAGING",
      serviceMode: "LIBRE",
      origin: "Calle 1",
      destination: "Calle 2",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("serviceCode");
    expect(result).toHaveProperty("servicePin");
    expect(result.serviceCode).toHaveLength(8);
    expect(result.servicePin).toHaveLength(4);
  });

  it("transportista puede crear servicio modo EMPRESA con companyId (solo MESSAGING)", async () => {
    const ctx = createTransportistaContext();
    const caller = appRouter.createCaller(ctx);

    // EMPRESA mode only allows MESSAGING serviceType
    const result = await caller.transportista.createService({
      serviceType: "MESSAGING",
      serviceMode: "EMPRESA",
      companyId: 1,
      origin: "Puerto",
      destination: "Centro",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("serviceCode");
    expect(result).toHaveProperty("servicePin");
  });
});

describe("Admin - Conversión COMPLETED a FULFILLED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin puede cambiar estado de COMPLETED a FULFILLED", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.services.updateStatus({
      id: 1,
      status: "FULFILLED",
    });

    expect(result).toEqual({ success: true });
  });

  it("admin puede listar servicios con sus códigos y PINs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const services = await caller.admin.services.list();

    expect(services).toBeInstanceOf(Array);
    expect(services.length).toBeGreaterThan(0);
    expect(services[0]).toHaveProperty("serviceCode");
    expect(services[0]).toHaveProperty("servicePin");
  });
});
