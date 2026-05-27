# Estados operacionales en UI

Contrato visual del producto. La **fuente de verdad de fase** en pantalla es:

```
status (API)  +  geofenceState (overlay WS, opcional)
```

`resolveOperationalCopy` aplica: **geofence primero**, luego `status`.

No usar `dispatch_status` en heroes de mensajero/transportista (el backend puede tener `dispatch_status=CLAIMED` con `status=STARTED`; la UI sigue `status`).

---

## Mensajero (`useMessengerOperationalState` → `MensajeroPanel`)

| uiState | Condición | Vista |
|---------|-----------|-------|
| `OFFLINE` | No disponible | `OfflineView` |
| `AVAILABLE` | Online, sin oferta ni servicio activo | `AvailableView` |
| `OFFER` | Primera oferta en cola | `OfferView` |
| `ASSIGNED` | Servicio activo `status === CLAIMED` | `AssignedView` |
| `IN_SERVICE` | Servicio activo `status === STARTED` | `InServiceView` |

Servicios `CLOSED` / cancelados salen del flujo activo (historial en panel expandido si aplica).

### OFFLINE

| | |
|--|--|
| **Objetivo UX** | Dejar claro que no recibe ofertas. |
| **Componente** | `OfflineView` |
| **Acción principal** | “Ponerte en línea” |
| **Copy** | “Desconectado” / activar disponibilidad |
| **Prioridad** | CTA único centrado |
| **No mostrar** | Mapas, ofertas, ETAs |

### AVAILABLE

| | |
|--|--|
| **Objetivo UX** | Esperar oferta; GPS opcional. |
| **Componente** | `AvailableView` |
| **Acción principal** | Permanecer en línea (toggle offline) |
| **Copy** | Estado GPS, permisos ubicación |
| **Prioridad** | Disponibilidad > mapa |
| **No mostrar** | Hero de servicio activo |

### OFFER

| | |
|--|--|
| **Objetivo UX** | Decidir aceptar u omitir rápido. |
| **Componente** | `OfferView` + `MessengerRouteMap` + timer de expiración de oferta |
| **Acción principal** | “Aceptar” |
| **Copy** | Origen/destino, participante; countdown solo de **expiración de oferta** (no ETA operacional) |
| **Prioridad** | Aceptar > omitir |
| **No mostrar** | PIN de cierre, evidencias |

### ASSIGNED (`CLAIMED`)

| | |
|--|--|
| **Objetivo UX** | Ir a recogida e iniciar servicio. |
| **Componente** | `AssignedView` |
| **Acción principal** | “Iniciar servicio” |
| **Copy** (sin geofence) | `resolveOperationalCopy`: “Dirígete al punto de recogida” + ETA estático “Tiempo estimado hacia recogida: ~N min” si hay `estimated_route_duration_minutes` |
| **Copy** (`AT_PICKUP`) | ETA línea: “Recogiendo documentos” |
| **Prioridad** | Mapa + navegación > ETA |
| **No mostrar** | Countdown a `eta_pickup_at`; formulario de cierre |

### IN_SERVICE (`STARTED`)

| | |
|--|--|
| **Objetivo UX** | Entregar y cerrar con PIN/evidencia. |
| **Componente** | `InServiceView` |
| **Acción principal** | “Finalizar servicio” (PIN 4 dígitos) |
| **Copy** (sin geofence) | “Ve en camino al destino” + “Tiempo estimado de trayecto: ~N min” |
| **Copy** (`AT_DROPOFF`) | “Finalizando servicio” |
| **Prioridad** | Cierre > evidencia opcional |
| **No mostrar** | Botón “Iniciar servicio”; ofertas |

### COMPLETED / CANCELLED (mensajero)

No hay vista hero dedicada en flujo principal; el servicio desaparece del `dispatchCurrentService`. Historial/terminal en UI secundaria.

---

## Transportista (`useTransportistaOperationalState` → `TransportistaHomeView`)

Fase derivada de `activeService.status` (prioridad al elegir servicio: `STARTED` > `CLAIMED` > `REQUESTED`…).

| operationalPhase | status típico | Vista hero |
|------------------|---------------|------------|
| `SEARCHING` | `REQUESTED` (y aliases en set de búsqueda) | `SearchingServiceView` |
| `ASSIGNED` | `CLAIMED` | `AssignedServiceView` |
| `IN_PROGRESS` | `STARTED` | `InProgressServiceView` |
| `COMPLETED` | `CLOSED` | `CompletedServiceView` |
| `CANCELLED` | cancel / expired / failed | `CancelledServiceView` |

### SEARCHING

| | |
|--|--|
| **Objetivo UX** | Confirmar que la solicitud está en mercado. |
| **Componente** | `SearchingServiceView` (card verde hero) |
| **Acción principal** | Esperar / cancelar solicitud (si permitido) |
| **Copy** | “Buscando mensajero”, origen/destino, código servicio |
| **Prioridad** | Estado de búsqueda > formulario de creación |
| **No mostrar** | Datos del mensajero asignado; geofence |

### ASSIGNED

| | |
|--|--|
| **Objetivo UX** | Saber que hay mensajero en camino a recogida. |
| **Componente** | `AssignedServiceView` |
| **Acción principal** | Esperar / cancelar (si aplica) |
| **Copy** | `resolveOperationalCopy` transportista: “El mensajero se dirige al punto de recogida” |
| **Geofence** | `AT_PICKUP`: “El mensajero llegó…” + “Recogiendo documentos” |
| **Prioridad** | Participante mensajero + PIN si existe |
| **No mostrar** | “Entrega estimada” como countdown |

### IN_PROGRESS

| | |
|--|--|
| **Objetivo UX** | Seguir entrega en curso. |
| **Componente** | `InProgressServiceView` |
| **Acción principal** | Pasivo (transportista no cierra aquí el flujo principal) |
| **Copy** | “El mensajero va en camino al destino” |
| **Geofence** | `AT_DROPOFF`: llegada + “Finalizando servicio” |
| **Prioridad** | Copy + SLA alert si breach |
| **No mostrar** | Copy de “solo aceptado” |

### COMPLETED

| | |
|--|--|
| **Objetivo UX** | Cierre claro y nueva solicitud. |
| **Componente** | `CompletedServiceView` |
| **Acción principal** | “Solicitar otro servicio” |
| **Copy** | Servicio finalizado exitosamente |
| **No mostrar** | ETA, geofence |

### CANCELLED

| | |
|--|--|
| **Objetivo UX** | Cierre sin culpa operativa confusa. |
| **Componente** | `CancelledServiceView` |
| **Acción principal** | Reintentar / nueva solicitud |
| **No mostrar** | Mapa en vivo del mensajero |

---

## Tabla geofence × copy (ambos roles)

| geofenceState | Requiere `status` | etaLabel típico |
|---------------|-------------------|-----------------|
| `AT_PICKUP` | `CLAIMED` | Recogiendo documentos |
| `AT_DROPOFF` | `STARTED` | Finalizando servicio |
| `NEAR_*` | — | No se persiste en UI; vuelve copy por `status` |

Persistencia frontend: solo `AT_PICKUP` y `AT_DROPOFF` en mapa por `service_id` (`useMessengerOperationalState`, `useTransportistaRealtime`).

---

## SLA vs ETA

| Elemento | Comportamiento |
|----------|----------------|
| **ETA en hero** | Estático (`estimated_route_duration_minutes`), sin `Date.now()` |
| **SLA breach** | Alertas “Recogida/Entrega retrasada” si `sla_*_deadline_at` superado |
| **Geofence** | Sustituye línea ETA mientras dura el estado AT_* |

---

## Regresiones a evitar

- Mostrar “El mensajero está realizando la entrega” en fase solo `CLAIMED`.
- Usar `formatOperationalEtaMinutes` en hero operacional (countdown falso).
- Ignorar geofence cuando `activeGeofenceState` está definido.
- Leer `dispatch_status` para cambiar entre `AssignedServiceView` e `InProgressServiceView`.
