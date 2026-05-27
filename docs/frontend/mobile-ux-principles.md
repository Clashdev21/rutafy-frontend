# Principios mobile-first (UX operativa)

Rutafy en campo se usa en **teléfono**, a menos con una mano y bajo presión. La UI operativa prioriza **claridad y una acción**, no densidad de información.

## Filosofía

| Principio | En la práctica |
|-----------|----------------|
| **Operador reacciona, no analiza** | Texto corto, jerarquía clara, sin tablas en hero |
| **Una acción principal** | Un botón dominante por pantalla (Aceptar, Iniciar, Finalizar) |
| **Fullscreen operational states** | `AssignedView` / `InServiceView` ocupan pantalla; no modales anidados |
| **Geofence > ETA falso** | Si llegó o está recogiendo, decirlo; no un contador que miente |
| **Realtime > dashboards** | WS acelera copy; no sustituye el estado del servicio |
| **Claridad operacional** | Origen, destino, quién es el otro actor |
| **Inspiración ride-hailing** | Fases como Uber/DiDi: asignado → en camino → llegó → cerrado |
| **Minimizar ruido ERP** | Sin filtros avanzados, sin 12 columnas en campo |

**Rutafy no es ERP:** el transportista no “gestiona inventario” en el hero; solicita y sigue. El mensajero no “concilia” en ruta; ejecuta.

## Jerarquía visual por pantalla

1. **Estado** (título / subtítulo hero o `resolveOperationalCopy`)
2. **Mapa compacto** (contexto espacial)
3. **Direcciones + navegación** (Maps/Waze)
4. **Participante** (tarjeta transportista/mensajero)
5. **ETA estático o geofence** (línea secundaria)
6. **SLA alert** solo si breach (ámbar, no ruido constante)

## Feedback inmediato

| Acción | Feedback esperado |
|--------|-----------------|
| Aceptar oferta | Loading en botón + toast |
| Iniciar / cerrar | Disabled + spinner |
| GPS denegado | Mensaje claro, no mapa roto |
| WS caído | UI sigue con polling; geofence puede tardar |
| Error PIN | Mensaje inline rojo |

## Mapas compactos

- `MessengerRouteMap` altura fija (~`h-48`), no pantalla completa.
- Leyenda simple: Tú · Recoger · Entregar.
- Si falla Google Maps: mensaje local, app sigue usable con `RouteNavigationLinks`.

## Safe areas y teclado

| Tema | Guía |
|------|------|
| **Safe areas** | Padding en vistas fullscreen (`px-6 py-6`); botones principales no pegados al borde inferior del notch |
| **Teclado** | PIN de cierre: input numérico; botón finalizar visible (scroll si hace falta) |
| **Landscape** | Mapa y botones deben seguir siendo usables; evitar layouts solo portrait con columnas fijas |
| **Touch targets** | Botones full-width en acciones críticas; min ~44px altura efectiva |

## Colores de fase (mensajero)

| Fase | Fondo típico | Intención |
|------|--------------|-----------|
| Offer | Neutro / blanco | Decisión |
| Assigned | `orange-50` | Atención previa a movimiento |
| In service | `green-50` | Ejecución / cierre |

Transportista: card hero verde gradiente en home operativo.

## Realtime y ansiedad

- **No** parpadear listas en cada WS.
- Geofence: cambio de **una línea** de texto (ETA label / subtítulo).
- Evitar sonidos/vibraciones no solicitadas (v1 sin haptics).

## Qué evitar en mobile operativo

- Gráficos, KPIs, export CSV en pantalla de ruta.
- Múltiples CTAs competidores del mismo peso visual.
- Countdown que baja sin movimiento (confianza rota).
- Depender de rotar a horizontal para cerrar servicio.
- Texto legal largo en hero.

## Checklist PR UX (campo)

- [ ] ¿Se entiende la acción principal en 2 segundos?
- [ ] ¿Funciona sin geofence (solo polling)?
- [ ] ¿El mapa degrada bien sin GPS?
- [ ] ¿Copy pasa por `resolveOperationalCopy`?
- [ ] ¿No hay countdown ETA en hero?
- [ ] ¿Una mano alcanza el CTA principal?

## Referencias de código

- Pantallas fullscreen: `MensajeroPanel.tsx` (`AssignedView`, `InServiceView`, `OfferView`)
- Transportista hero: `TransportistaPanel.tsx` → `TransportistaHomeView`
- Copy: `resolveOperationalCopy.ts`
- Mapa: `MessengerRouteMap.tsx`
