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
        customerId: 2,
        driverId: null,
        companyId: null,
        serviceType: "MESSAGING",
        serviceMode: "LIBRE",
        origin: "Test Origin",
        destination: "Test Destination",
        status: "CREATED",
        serviceCode: "ABCD1234",
        servicePin: "5678",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    if (id === 2) {
      return Promise.resolve({
        id: 2,
        customerId: 2,
        driverId: 3, // Already assigned
        companyId: null,
        serviceType: "MESSAGING",
        serviceMode: "LIBRE",
        origin: "Test Origin",
        destination: "Test Destination",
        status: "CREATED",
        serviceCode: "EFGH5678",
        servicePin: "1234",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(null);
  }),
  updateService: vi.fn().mockResolvedValue(true),
  getAllServices: vi.fn().mockResolvedValue([
    {
      id: 1,
      customerId: 2,
      driverId: null,
      companyId: null,
      serviceType: "MESSAGING",
      serviceMode: "LIBRE",
      origin: "Test Origin",
      destination: "Test Destination",
      status: "CREATED",
      serviceCode: "ABCD1234",
      servicePin: "5678",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      customerId: 2,
      driverId: 1,
      companyId: null,
      serviceType: "MESSAGING",
      serviceMode: "LIBRE",
      origin: "Another Origin",
      destination: "Another Destination",
      status: "IN_PROGRESS",
      serviceCode: "IJKL9012",
      servicePin: "3456",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

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

function createMensajeroContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "mensajero-user",
    email: "mensajero@test.com",
    name: "Mensajero User",
    loginMethod: "local",
    role: "user",
    appRole: "MENSAJERO",
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

describe("Regla EMPRESA solo MENSAJERIA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza servicio EMPRESA con serviceType=TRANSPORT", async () => {
    const ctx = createTransportistaContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.transportista.createService({
        serviceMode: "EMPRESA",
        serviceType: "TRANSPORT",
        companyId: 1,
        origin: "Puerto",
        destination: "Centro",
      })
    ).rejects.toThrow("Los servicios por empresa solo pueden ser de tipo Mensajería");
  });

  it("acepta servicio EMPRESA con serviceType=MESSAGING", async () => {
    const ctx = createTransportistaContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.transportista.createService({
      serviceMode: "EMPRESA",
      serviceType: "MESSAGING",
      companyId: 1,
      origin: "Puerto",
      destination: "Centro",
    });

    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("serviceCode");
    expect(result).toHaveProperty("servicePin");
  });

  it("acepta servicio LIBRE con cualquier serviceType", async () => {
    const ctx = createTransportistaContext();
    const caller = appRouter.createCaller(ctx);

    const resultMessaging = await caller.transportista.createService({
      serviceMode: "LIBRE",
      serviceType: "MESSAGING",
      origin: "Calle 1",
      destination: "Calle 2",
    });

    expect(resultMessaging).toHaveProperty("id");

    const resultTransport = await caller.transportista.createService({
      serviceMode: "LIBRE",
      serviceType: "TRANSPORT",
      origin: "Calle 1",
      destination: "Calle 2",
    });

    expect(resultTransport).toHaveProperty("id");
  });
});

describe("Mensajero - Servicios Disponibles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("obtiene solo servicios con status=CREATED y sin driverId", async () => {
    const ctx = createMensajeroContext();
    const caller = appRouter.createCaller(ctx);

    const services = await caller.mensajero.availableServices();

    expect(services).toBeInstanceOf(Array);
    // Should only return service with id=1 (CREATED, no driverId)
    expect(services.every((s: { status: string }) => s.status === "CREATED")).toBe(true);
    expect(services.every((s: { driverId: number | null }) => s.driverId === null)).toBe(true);
  });

  it("puede aceptar un servicio disponible", async () => {
    const ctx = createMensajeroContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mensajero.acceptService({ serviceId: 1 });

    expect(result).toEqual({ success: true, serviceId: 1 });
  });

  it("rechaza aceptar un servicio ya asignado", async () => {
    const ctx = createMensajeroContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mensajero.acceptService({ serviceId: 2 })
    ).rejects.toThrow("Este servicio ya fue asignado a otro mensajero");
  });

  it("rechaza aceptar un servicio inexistente", async () => {
    const ctx = createMensajeroContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.mensajero.acceptService({ serviceId: 999 })
    ).rejects.toThrow("Servicio no encontrado");
  });
});
