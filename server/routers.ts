import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllServices,
  getServiceById,
  createService,
  updateServiceStatus,
  deleteService,
  getServiceEvents,
  getUserByEmail,
  updateUserPassword,
  startServiceWithCodePin,
  completeServiceWithCodePin,
} from "./db";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth";

// ============================================
// ROLE-BASED PROCEDURES
// ============================================

// Admin procedure - requires ADMIN appRole
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.appRole !== 'ADMIN' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acceso de administrador requerido' });
  }
  return next({ ctx });
});

// Mensajero procedure - requires MENSAJERO appRole
const mensajeroProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.appRole !== 'MENSAJERO') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acceso de mensajero requerido' });
  }
  return next({ ctx });
});

// Transportista procedure - requires TRANSPORTISTA appRole
const transportistaProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.appRole !== 'TRANSPORTISTA') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acceso de transportista requerido' });
  }
  return next({ ctx });
});

// ============================================
// ADMIN ROUTERS
// ============================================

const adminCompaniesRouter = router({
  list: adminProcedure.query(async () => {
    return getAllCompanies();
  }),

  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const company = await getCompanyById(input.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa no encontrada' });
      }
      return company;
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      active: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      const id = await createCompany(input);
      return { id, success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCompany(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCompany(input.id);
      return { success: true };
    }),
});

const adminUsersRouter = router({
  list: adminProcedure.query(async () => {
    return getAllUsers();
  }),

  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.id);
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuario no encontrado' });
      }
      return user;
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: z.string().min(6).optional(),
      appRole: z.enum(["ADMIN", "TRANSPORTISTA", "MENSAJERO"]).default("TRANSPORTISTA"),
      active: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      const hashedPassword = input.password ? await hashPassword(input.password) : undefined;
      const id = await createUser({
        name: input.name,
        email: input.email,
        phone: input.phone,
        password: hashedPassword,
        appRole: input.appRole,
        active: input.active,
      });
      return { id, success: true };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional().nullable(),
      phone: z.string().optional().nullable(),
      password: z.string().min(6).optional(),
      appRole: z.enum(["ADMIN", "TRANSPORTISTA", "MENSAJERO"]).optional(),
      active: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, password, ...data } = input;
      
      // If password is provided, hash it
      if (password) {
        const hashedPassword = await hashPassword(password);
        await updateUserPassword(id, hashedPassword);
      }
      
      await updateUser(id, data);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteUser(input.id);
      return { success: true };
    }),
});

const adminServicesRouter = router({
  list: adminProcedure.query(async () => {
    return getAllServices();
  }),

  get: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const service = await getServiceById(input.id);
      if (!service) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Servicio no encontrado' });
      }
      return service;
    }),

  getEvents: adminProcedure
    .input(z.object({ serviceId: z.number() }))
    .query(async ({ input }) => {
      return getServiceEvents(input.serviceId);
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["CREATED", "IN_PROGRESS", "COMPLETED", "FULFILLED"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await updateServiceStatus(input.id, input.status, ctx.user.id);
      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteService(input.id);
      return { success: true };
    }),
});

// ============================================
// MENSAJERO ROUTER
// ============================================

const mensajeroRouter = router({
  // Get current mensajero profile
  profile: mensajeroProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  // Get services assigned to this mensajero
  myServices: mensajeroProcedure.query(async ({ ctx }) => {
    const allServices = await getAllServices();
    return allServices.filter(s => s.driverId === ctx.user.id);
  }),

  // Get available services (CREATED status, not assigned)
  availableServices: mensajeroProcedure.query(async () => {
    const allServices = await getAllServices();
    return allServices.filter(s => s.status === "CREATED" && !s.driverId);
  }),

  // Accept a service (assign to this mensajero)
  acceptService: mensajeroProcedure
    .input(z.object({ serviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Validate service exists and is available
      const service = await getServiceById(input.serviceId);
      if (!service) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Servicio no encontrado' });
      }
      if (service.status !== 'CREATED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este servicio ya no está disponible' });
      }
      if (service.driverId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este servicio ya fue asignado a otro mensajero' });
      }
      
      // Assign the service to this mensajero
      const { updateService } = await import("./db");
      await updateService(input.serviceId, { driverId: ctx.user.id });
      return { success: true, serviceId: input.serviceId };
    }),

  // Start a service with code + PIN validation
  startServiceWithCodePin: mensajeroProcedure
    .input(z.object({
      serviceId: z.number(),
      code: z.string().min(6).max(10),
      pin: z.string().length(4),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await startServiceWithCodePin(
        input.serviceId,
        input.code,
        input.pin,
        ctx.user.id
      );
      
      if (!result.success) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'Error al iniciar servicio' });
      }
      
      return { success: true };
    }),

  // Complete a service with code + PIN validation
  completeServiceWithCodePin: mensajeroProcedure
    .input(z.object({
      serviceId: z.number(),
      code: z.string().min(6).max(10),
      pin: z.string().length(4),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await completeServiceWithCodePin(
        input.serviceId,
        input.code,
        input.pin,
        ctx.user.id
      );
      
      if (!result.success) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: result.error || 'Error al completar servicio' });
      }
      
      return { success: true };
    }),

  // Legacy: Complete a service without validation (deprecated)
  completeService: mensajeroProcedure
    .input(z.object({ serviceId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await updateServiceStatus(input.serviceId, "COMPLETED", ctx.user.id);
      return { success: true };
    }),
});

// ============================================
// TRANSPORTISTA ROUTER
// ============================================

const transportistaRouter = router({
  // Get current transportista profile
  profile: transportistaProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  // Get services created by this transportista
  myServices: transportistaProcedure.query(async ({ ctx }) => {
    const allServices = await getAllServices();
    return allServices.filter(s => s.customerId === ctx.user.id);
  }),

  // Get list of companies for service creation
  companies: transportistaProcedure.query(async () => {
    return getAllCompanies();
  }),

  // Create a new service request with hybrid mode (EMPRESA/LIBRE)
  createService: transportistaProcedure
    .input(z.object({
      serviceMode: z.enum(["EMPRESA", "LIBRE"]),
      serviceType: z.enum(["MESSAGING", "TRANSPORT"]),
      origin: z.string().min(1),
      destination: z.string().min(1),
      companyId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate: if EMPRESA mode, companyId is required
      if (input.serviceMode === "EMPRESA" && !input.companyId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debe seleccionar una empresa para el modo EMPRESA' });
      }
      
      // Validate: if EMPRESA mode, serviceType MUST be MESSAGING only
      if (input.serviceMode === "EMPRESA" && input.serviceType !== "MESSAGING") {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Los servicios por empresa solo pueden ser de tipo Mensajería' });
      }
      
      const result = await createService({
        customerId: ctx.user.id,
        serviceMode: input.serviceMode,
        serviceType: input.serviceType,
        origin: input.origin,
        destination: input.destination,
        companyId: input.serviceMode === "EMPRESA" ? input.companyId : null,
        status: "CREATED",
      });
      return { 
        id: result.id, 
        serviceCode: result.serviceCode,
        servicePin: result.servicePin,
        serviceMode: input.serviceMode,
        success: true 
      };
    }),
});

// ============================================
// APP ROUTERS (public services)
// ============================================

const servicesRouter = router({
  list: publicProcedure.query(async () => {
    return getAllServices();
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const service = await getServiceById(input.id);
      if (!service) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Servicio no encontrado' });
      }
      return service;
    }),

  create: publicProcedure
    .input(z.object({
      customerId: z.number(),
      driverId: z.number().optional(),
      companyId: z.number().optional(),
      serviceType: z.enum(["MESSAGING", "TRANSPORT"]),
      origin: z.string().min(1),
      destination: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const result = await createService({
        ...input,
        status: "CREATED",
      });
      return { 
        id: result.id, 
        serviceCode: result.serviceCode,
        servicePin: result.servicePin,
        success: true 
      };
    }),
});

// ============================================
// MAIN ROUTER
// ============================================

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Local login with email + password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        
        if (!user) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciales inválidas' });
        }

        if (!user.password) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Este usuario no tiene contraseña configurada. Use OAuth.' });
        }

        const isValid = await verifyPassword(input.password, user.password);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Credenciales inválidas' });
        }

        if (!user.active) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuario desactivado' });
        }

        // Generate JWT token and set cookie
        const token = await generateToken(user);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { 
          success: true, 
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            appRole: user.appRole,
          }
        };
      }),

    // Register new user
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(6),
        phone: z.string().optional(),
        appRole: z.enum(["TRANSPORTISTA", "MENSAJERO"]).default("TRANSPORTISTA"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if email already exists
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: 'CONFLICT', message: 'El email ya está registrado' });
        }

        const hashedPassword = await hashPassword(input.password);
        const id = await createUser({
          name: input.name,
          email: input.email,
          phone: input.phone,
          password: hashedPassword,
          appRole: input.appRole,
          active: true,
        });

        const newUser = await getUserById(id);
        if (!newUser) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error al crear usuario' });
        }

        // Auto-login after registration
        const token = await generateToken(newUser);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { 
          success: true, 
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            appRole: newUser.appRole,
          }
        };
      }),
  }),

  // Admin routes
  admin: router({
    companies: adminCompaniesRouter,
    users: adminUsersRouter,
    services: adminServicesRouter,
  }),

  // Role-specific routes
  mensajero: mensajeroRouter,
  transportista: transportistaRouter,

  // Public app routes
  services: servicesRouter,
});

export type AppRouter = typeof appRouter;
