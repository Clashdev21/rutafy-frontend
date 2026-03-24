# Rutafy - Conversión a Web App Operativa

## Fase 1: Base de Datos
- [x] Crear esquema de Users (id, name, phone/email, role, active)
- [x] Crear esquema de Companies (id, name, active)
- [x] Crear esquema de Services (id, customerId, driverId, companyId, serviceType, origin, destination, status, createdAt, updatedAt)
- [x] Crear esquema de ServiceEvents (id, serviceId, eventType, createdAt, actorUserId)
- [x] Ejecutar migraciones de base de datos

## Fase 2: API REST Backend
- [x] POST /auth/login (admin hardcoded para MVP) - Usando Manus OAuth
- [x] POST /admin/companies - Crear empresa
- [x] GET /admin/companies - Listar empresas
- [x] PATCH /admin/companies/:id - Editar empresa
- [x] DELETE /admin/companies/:id - Eliminar empresa
- [x] POST /admin/users - Crear usuario
- [x] GET /admin/users - Listar usuarios
- [x] PATCH /admin/users/:id - Editar usuario
- [x] DELETE /admin/users/:id - Eliminar usuario
- [x] GET /admin/services - Listar servicios
- [x] GET /admin/services/:id - Ver detalle servicio
- [x] PATCH /admin/services/:id/status - Cambiar estado
- [x] DELETE /admin/services/:id - Eliminar servicio
- [x] POST /services - Crear servicio (app)
- [x] GET /services/:id - Ver servicio (app)
- [x] GET /services - Listar servicios (app)

## Fase 3: Panel Admin UI
- [x] Login admin simple (usando Manus OAuth)
- [x] Menú lateral (Empresas, Usuarios, Servicios)
- [x] Pantalla CRUD Empresas (tabla, crear, editar, eliminar)
- [x] Pantalla CRUD Usuarios (tabla, crear, editar, eliminar)
- [x] Pantalla Servicios (tabla con filtros, detalle, cambiar estado, eliminar)

## Fase 4: Integración y Pruebas
- [x] Conectar frontend con backend
- [x] Probar CRUD Empresas
- [x] Probar CRUD Usuarios
- [x] Probar gestión de Servicios

## Bugs
- [x] Fix: Google Maps API se carga múltiples veces en /client

## Fase 5: Limpieza de datos mock
- [x] Verificar que AdminDashboard consume datos reales de la API
- [x] Verificar que AdminCompanies consume datos reales de la API
- [x] Verificar que AdminUsers consume datos reales de la API
- [x] Verificar que AdminServices consume datos reales de la API
- [x] Eliminar cualquier array mock restante en el frontend (no había mocks)
- [x] Probar CRUD completo end-to-end

## Fase 6: Autenticación y Control de Acceso por Roles

### Base de datos
- [x] Actualizar enum de roles a ADMIN | TRANSPORTISTA | MENSAJERO
- [x] Agregar campo password (hash) a la tabla users
- [x] Ejecutar migraciones

### Autenticación
- [x] Implementar procedimiento tRPC auth.login (email + password)
- [x] Implementar hash de passwords con SHA-256 + salt
- [x] Implementar sesión con cookies/JWT
- [x] Implementar procedimiento auth.register

### Guards por rol
- [x] Crear middleware adminProcedure (solo ADMIN)
- [x] Crear middleware mensajeroProcedure (solo MENSAJERO)
- [x] Crear middleware transportistaProcedure (solo TRANSPORTISTA)

### Pantallas
- [x] Crear página /login
- [x] Crear página /mensajero (placeholder)
- [x] Crear página /transportista (placeholder)
- [ ] Proteger rutas en App.tsx según rol

### Nomenclatura UI
- [x] Cambiar "Cliente" por "Transportista" en toda la UI
- [x] Cambiar "Conductor" por "Mensajero" en toda la UI
- [x] Actualizar RoleSelector con nuevos nombres

## Fase 7: Sistema de Validación Código + PIN

### Base de datos
- [x] Agregar campo serviceCode (único, alfanumérico, 6-10 chars) a services
- [x] Agregar campo servicePin (4 dígitos) a services
- [x] Ejecutar migraciones

### Backend
- [x] Implementar función generateServiceCode() sin caracteres confusos
- [x] Implementar función generateServicePin() de 4 dígitos
- [x] Auto-generar código y PIN al crear servicio
- [x] Crear endpoint startServiceWithCodePin(serviceId, code, pin)
- [x] Crear endpoint completeServiceWithCodePin(serviceId, code, pin)
- [x] Registrar eventos en serviceEvents al iniciar y completar

### UI Mensajero
- [x] Mostrar campos para ingresar Código + PIN
- [x] Botón "Iniciar Servicio" con validación
- [x] Botón "Finalizar Servicio" con validación
- [x] Mensajes de error claros

### UI Admin
- [x] Mostrar serviceCode y servicePin en detalle de servicio
- [x] Solo visible para ADMIN

### Tests
- [x] Test de generación de código único
- [x] Test de validación código+PIN correcto
- [x] Test de validación código+PIN incorrecto

## Fase 8: Modelo Híbrido + Mapa Operativo

### Base de Datos
- [x] Agregar campo serviceMode (EMPRESA | LIBRE) a la tabla services
- [x] Ejecutar migraciones

### Panel Transportista
- [x] Agregar selector de modo (Empresa / Libre)
- [x] Mostrar selector de empresa solo si modo = EMPRESA
- [x] Guardar companyId según el modo seleccionado
- [x] NO mostrar mapa en panel Transportista

### Panel Mensajero - Mapa
- [x] Mostrar mapa SOLO si hay servicio con estado IN_PROGRESS
- [x] Centrar mapa en coordenadas del servicio si existen
- [ ] Si no hay coordenadas, centrar en Buenaventura (3.8776, -77.0266- [x] NO mostrar mapa si no hay servicio activo
### Validación Código+PIN (ya implementado)
- [x] serviceCode y servicePin en tabla services
- [x] Generación automática al crear servicio
- [x] Endpoints de inicio y finalización con validación
- [x] Registro de eventos

### Admin - Conversión a FULFILLED
- [x] Permitir cambiar COMPLETED → FULFILLED
- [x] Validar que el servicio tenga estado COMPLETED
- [x] Registrar evento FULFILLED

### Tests y Documentación
- [x] Probar crear servicio EMPRESA
- [x] Probar crear servicio LIBRE
- [x] Probar iniciar servicio con Código+PIN
- [x] Probar ver mapa en Mensajero con servicio activo
- [x] Probar finalizar servicio
- [x] Probar convertir a FULFILLED desde Admin

## Fase 9: Reglas Modelo Híbrido + Servicios Disponibles para Mensajero

### Backend - Validación EMPRESA solo MENSAJERIA
- [x] Validar en backend que serviceMode=EMPRESA solo permite serviceType=MESSAGING
- [x] Rechazar con error claro cualquier servicio EMPRESA con TRANSPORT

### Frontend - Formulario Transportista
- [x] Ocultar opción "Transporte" cuando modo=EMPRESA
- [x] Fijar automáticamente serviceType=MESSAGING en modo EMPRESA

### Backend - Servicios disponibles para Mensajero
- [x] Crear endpoint mensajero.getAvailableServices (status=CREATED, driverId=NULL)
- [x] Crear endpoint mensajero.acceptService(serviceId) para asignar mensajeroId

### Frontend - Panel Mensajero
- [x] Mostrar lista de servicios disponibles cuando está "En línea"
- [x] Botón "Aceptar servicio" funcional
- [x] Actualizar lista al aceptar un servicio

### Tests
- [x] Test validación EMPRESA solo MENSAJERIA
- [x] Test getAvailableServices
- [x] Test acceptService
