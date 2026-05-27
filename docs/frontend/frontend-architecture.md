# Arquitectura frontend (operativa)

Vista rápida del cliente Rutafy en `client/`. No sustituye la documentación del backend.

## Stack

| Capa | Tecnología |
|------|------------|
| UI | React 18 + TypeScript |
| Build | Vite |
| Routing | [wouter](https://github.com/molefrog/wouter) (`Route`, `Switch` en `App.tsx`) |
| HTTP | `axios` vía `client/src/api/http.ts` (base URL `VITE_RUTAFY_API_BASE`) |
| Estilos | Tailwind + componentes shadcn en `client/src/components/ui/` |
| Mapas | Google Maps (`MapView`, `MessengerRouteMap`) |
| Toasts | sonner |

## Auth y sesión

- Tokens en `client/src/authStorage.ts` (`rutafy_access_token`, refresh).
- `useAuth` (`client/src/_core/hooks/useAuth.ts`) expone usuario, rol, logout.
- Eventos globales: `auth:logout`, `auth:token-refreshed` (usados por sockets realtime).
- Mensajero puede usar `actor_id` de sesión o modo manual (UUID) en `useMessengerOperationalState`.

## Separación de producto

```
┌─────────────────────────────────────────────────────────┐
│  TransportistaPanel          MensajeroPanel               │
│  - Solicita servicio         - Ofertas + aceptar          │
│  - Hero por fase             - ASSIGNED / IN_SERVICE      │
│  - Polling 5s                - Polling 15s + WS           │
│  - useTransportistaRealtime  - useMessengerOperationalState│
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              Admin (AdminOpsMapPage, servicios, alertas)
              — supervisión, no flujo campo principal
```

## Hooks operacionales (corazón del UX)

### Mensajero — `useMessengerOperationalState`

- Carga: `/v1/services/my`, ofertas activas, heartbeat GPS, evidencias.
- Deriva `uiState`: `OFFLINE` | `AVAILABLE` | `OFFER` | `ASSIGNED` | `IN_SERVICE`.
- **Fuente de fase:** `dispatchCurrentService.status` (`CLAIMED` / `STARTED`), no `dispatch_status`.
- WebSocket en el mismo hook: `offer.created`, `service.cancelled`, `geofence.updated`.
- Estado geofence: `geofenceByServiceId` → `activeGeofenceState`.

### Transportista — `useTransportistaOperationalState` + panel

- `useTransportistaOperationalState`: solo mapea `activeService.status` → fase (`SEARCHING`, `ASSIGNED`, etc.).
- `TransportistaPanel`: lista `GET /v1/services`, elige `activeService` por prioridad (`STARTED` > `CLAIMED` > `REQUESTED`…).
- `useTransportistaRealtime`: overlay geofence (mismo WS URL, otro consumidor).

### Copy centralizado — `resolveOperationalCopy`

- Entrada: `serviceStatus`, `geofenceState`, `estimatedRouteDurationMinutes`, `audience`.
- Salida: `title`, `subtitle`, `etaLabel`.
- **Geofence gana** sobre `status` para el texto del hero.

## Modelo híbrido: polling + WebSocket

| Mecanismo | Transportista | Mensajero | Rol |
|-----------|---------------|-----------|-----|
| Polling REST | 5 s (`loadTransportistaHistory`) | 15 s (`refreshMyServices` + ofertas) | Verdad del `status` |
| WebSocket | `useTransportistaRealtime` | En `useMessengerOperationalState` | Overlay rápido (geofence, ofertas) |

Regla de oro: **nunca depender solo del WS** para saber si el servicio pasó a `STARTED` o `CLOSED`; el polling (o la respuesta de una acción POST) debe coincidir.

## Archivos panel por rol

| Rol | Página principal | Hook estado |
|-----|------------------|-------------|
| Mensajero | `pages/MensajeroPanel.tsx` | `useMessengerOperationalState` |
| Transportista | `pages/TransportistaPanel.tsx` | `useTransportistaOperationalState` + realtime hook |
| Admin mapa | `pages/admin/AdminOpsMapPage.tsx` | Lógica propia de mapa ops |

## Utilidades compartidas

| Módulo | Uso |
|--------|-----|
| `lib/formatOperationalLocation.ts` | Texto de origen/destino, coords para mapas |
| `lib/openMapsUrl.ts` | URLs Google Maps / Waze |
| `lib/messengerRealtimeWs.ts` | `buildRutafyRealtimeWebSocketUrl` (alias `buildMessengerRealtimeWebSocketUrl`) |
| `components/RouteNavigationLinks.tsx` | Botones abrir navegación externa |
| `components/OperationalParticipantCard.tsx` | Tarjeta transportista/mensajero |

## Qué no vive en el frontend operativo

- Lógica de dispatch/ofertas en servidor.
- Cálculo de geofence (solo consume eventos).
- Persistencia de ETA dinámico en BD.
- `dispatch_status` en heroes de transportista/mensajero (no se lee hoy).

## Extender sin romper

1. Nuevo copy operativo → solo `resolveOperationalCopy.ts` + vistas hero.
2. Nuevo evento WS → handler en hook realtime existente; no segundo socket.
3. Nueva fase UI → extender `uiState` / `OperationalPhase` y una vista fullscreen en el panel.
4. Admin puede mostrar más campos; no mezclar complejidad admin en `MensajeroPanel`.
