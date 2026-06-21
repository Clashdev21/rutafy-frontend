# Documentación frontend — Rutafy (Portex)

## Propósito

Esta carpeta describe **cómo se comporta la app en pantalla**: estados operacionales, realtime, mapas y principios mobile-first. Está pensada para:

- Onboarding de desarrolladores frontend
- Prompts de IA (Cursor, Claude, etc.)
- Auditorías UX sin tocar backend
- Continuidad entre chats y PRs
- Evitar regresiones visuales en flujos en vivo

**Rutafy no es un ERP.** Es una app operativa tipo ride-hailing/logística ligera: el usuario reacciona a un servicio activo, no explora tablas ni informes complejos en el panel del mensajero o del transportista.

## Relación con documentación backend

| Backend (`docs/` u otro repo) | Frontend (`docs/frontend/`) |
|-------------------------------|-----------------------------|
| Contratos API, `status`, dispatch, SQL | Qué ve el usuario y cuándo |
| Geofence server-side, heartbeat | Overlay WS + copy en hero |
| ETA calculado al dispatch | ETA **estático** mostrado en UI |

No duplicamos arquitectura de dispatch ni workers. Si necesitas el contrato de estados en BD, consulta la doc del backend; aquí solo importa lo que **consume el cliente**.

## Enfoque UX realtime

1. **REST + polling** = fuente de verdad del `status` del servicio.
2. **WebSocket** (`/realtime?token=`) = acelerador para geofence y ofertas (mensajero).
3. **Geofence** = prioridad sobre copy genérico y sobre ETA numérico.
4. **Una acción principal** por pantalla operativa.

Flujo mental:

```
GPS mensajero → heartbeat → geofence backend → geofence.updated → overlay UI
                     ↘ polling cada 5s/15s confirma status
```

## Mapa rápido de documentos

| Archivo | Contenido |
|---------|-----------|
| [frontend-architecture.md](./frontend-architecture.md) | Stack, rutas, hooks, polling vs WS |
| [operational-interface.md](./operational-interface.md) | **Transportista y mensajero** — flujos, hooks, mapas, tracking |
| [admin-ops.md](../admin-ops.md) | **Operación en vivo** — capas, SLA, ETA, geofence, paneles |
| [admin-tracking.md](../admin-tracking.md) | **Trazabilidad GPS** — sesiones, mapa, timeline, KPIs, calidad |
| [admin-panel.md](./admin-panel.md) | **Panel admin** — ops map, trazabilidad, auth, API |
| [ui-operational-states.md](./ui-operational-states.md) | Estados mensajero/transportista, copy, componentes |
| [realtime-ui.md](./realtime-ui.md) | WS, geofence overlay, reconnect, limpieza |
| [maps-and-tracking.md](./maps-and-tracking.md) | `MessengerRouteMap`, GPS, Maps/Waze, ETA estático |
| [mobile-ux-principles.md](./mobile-ux-principles.md) | Principios mobile-first y anti-ruido |

## Guía para IA / Cursor

Al trabajar en UI operacional:

1. Lee **ui-operational-states.md** antes de cambiar hero/copy.
2. Lee **realtime-ui.md** si tocas WS, geofence o polling.
3. Lee **maps-and-tracking.md** si tocas mapas o ETA visible.
4. **No** asumas que `dispatch_status` controla las vistas hero (usa `status`).
5. **No** reintroduzcas countdown con `eta_pickup_at` / `Date.now()` en copy operacional.
6. Cambios mínimos; no refactorizar paneles enteros sin pedido explícito.

Referencias de código habituales:

- `client/src/hooks/useMessengerOperationalState.ts`
- `client/src/hooks/useTransportistaOperationalState.ts`
- `client/src/hooks/useTransportistaRealtime.ts`
- `client/src/lib/resolveOperationalCopy.ts`
- `client/src/pages/MensajeroPanel.tsx`
- `client/src/pages/TransportistaPanel.tsx`
- `client/src/components/MessengerRouteMap.tsx`
- `client/src/components/RouteNavigationLinks.tsx`

## Audiencias de la app (rutas)

| Ruta | Panel | Rol | Documentación |
|------|-------|-----|---------------|
| `/mensajero` | `MensajeroPanel` | Mensajero en campo | [operational-interface.md](./operational-interface.md) |
| `/transportista` | `TransportistaPanel` | Solicitante / transportista | [operational-interface.md](./operational-interface.md) |
| `/admin/*` | Vistas admin | Operaciones / soporte | [admin-panel.md](./admin-panel.md) |

Legacy `/client` y `/driver` existen pero no son el foco operativo actual.
