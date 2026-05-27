# Mapas y tracking en UI

Alcance: experiencia **mensajero** en flujo operativo. Transportista no tiene mini-mapa en hero (solo texto de direcciones).

## Componentes

| Componente | Archivo | Uso |
|------------|---------|-----|
| `MessengerRouteMap` | `components/MessengerRouteMap.tsx` | Mapa compacto en Offer / Assigned / In Service |
| `RouteNavigationLinks` | `components/RouteNavigationLinks.tsx` | Abrir Google Maps o Waze |
| `MapView` | `components/Map.tsx` | Wrapper Google Maps (carga script) |
| `parseServiceRouteCoords` | `lib/formatOperationalLocation.ts` | Coords origen/destino del servicio |
| `openMapsUrl` | `lib/openMapsUrl.ts` | Deep links externos |

## MessengerRouteMap — qué muestra

| Elemento | Marcador | Color / label |
|--------|----------|----------------|
| Mensajero (si GPS fresh) | Círculo “T” | Azul `#2563eb` |
| Recogida | “R” | Verde `#16a34a` |
| Entrega | “E” | Morado `#7c3aed` |
| Polyline | R → E | Gris `#64748b` (geodésica) |

- Altura típica: `h-48` (mapa compacto, no fullscreen).
- `fitBounds` para encuadrar puntos visibles.
- Si no hay coords de origen ni destino: **no renderiza** mapa (evita error vacío).
- Marcadores: API clásica `google.maps.Marker` (compatibilidad móvil / Safari).
- Errores de overlay: capturados; fallback “No se pudo cargar el mapa” sin tumbar React.

## Posición del mensajero (`messengerPosition`)

Proviene de `resolveMessengerMapPosition` en `MensajeroPanel`:

| `locationStatus` | ¿Pin “Tú”? |
|------------------|------------|
| `fresh` | Sí (`currentLat` / `currentLng` del hook) |
| `stale` / `unknown` / `unavailable` | No |

GPS se alimenta con:

- Bootstrap al entrar online
- Watch / heartbeat en `useMessengerOperationalState`
- TTL de frescura (`LOCATION_FRESH_TTL_MS`) → `stale`

**Principio UX:** pin en mapa solo si la ubicación es confiable; no inventar posición.

## Botones Maps / Waze

- `RouteNavigationLinks` recibe `coords` de `parseServiceRouteCoords(service, "origin" | "destination")`.
- Solo se muestran si hay lat/lng válidos.
- Prefijos: “Recoger” / “Entregar”.

## ETA en pantalla (estático)

| Fase | Copy ETA (vía `resolveOperationalCopy`) |
|------|----------------------------------------|
| `CLAIMED` | Tiempo estimado hacia recogida: ~N min |
| `STARTED` | Tiempo estimado de trayecto: ~N min |
| `AT_PICKUP` | Recogiendo documentos (sin minutos) |
| `AT_DROPOFF` | Finalizando servicio |

Fuente del número: **`estimated_route_duration_minutes`** del servicio (dispatch), formateado con `formatStaticRouteDurationMinutes`.

### Por qué se eliminó el countdown dinámico

Antes: `formatOperationalEtaMinutes(eta_pickup_at | eta_delivery_at)` hacía `target - Date.now()` → **bajaba aunque el mensajero estuviera quieto**, porque los ISO son deadlines fijados al crear ofertas.

Ahora: estimación **honesta y estable** hasta que cambie el servicio o llegue geofence.

`formatOperationalEtaMinutes` sigue exportado por si se usa fuera del hero; **no** en copy operacional principal.

## Relación mapa ↔ geofence ↔ copy

| Situación | Mapa | Copy hero |
|-----------|------|-----------|
| Camino a recogida | R + E + T? | Texto “hacia recogida” |
| `AT_PICKUP` | Igual | “Recogiendo documentos” (prioridad geofence) |
| Camino a entrega | Igual | “trayecto” estático |
| `AT_DROPOFF` | Igual | “Finalizando servicio” |

El mapa **no** cambia de modo por geofence (v1); solo el texto hero.

## Admin vs mensajero

- `AdminOpsMapPage`: mapa operaciones, muchos servicios/mensajeros — **no** documentado aquí en detalle.
- Mensajero: un servicio, un mapa pequeño, acción inmediata.

## Futuras mejoras (no implementadas)

Documentar como dirección, no como compromiso:

| Mejora | Beneficio |
|--------|-----------|
| Distancia operacional en UI | “A 1,2 km de recogida” con GPS fresh |
| Tracking suave del pin | Animación / throttling sin saltos |
| ETA dinámico real | Recalcular en servidor con GPS + re-mostrar con reglas claras |
| Mapa transportista | Ver aproximación del mensajero (requiere API + privacidad) |
| Ruta driving real | Directions API vs polyline geodésica |

Cualquier ETA dinámico futuro debe **no** repetir el error de countdown a timestamps fijos del dispatch.

## Regresiones a evitar

- `AdvancedMarkerElement` sin fallback en operativo móvil.
- Mapa fullscreen en ASSIGNED (rompe flujo una mano).
- Mostrar pin “Tú” con GPS stale.
- Reintroducir ETA countdown en hero.
- Depender del mapa para saber `status` (el status es REST).
