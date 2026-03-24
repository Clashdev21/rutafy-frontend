# Rutafy / Portex - contexto maestro del proyecto

## Producto
Rutafy es una plataforma logística para el corredor portuario de Buenaventura.
Conecta transportistas, mensajeros y nodos logísticos.

## Objetivo actual
Trabajar el frontend alineado con el backend ya validado.

## Stack frontend
- React
- Vite
- TypeScript

## Directorio real del frontend
C:\Users\yoine\OneDrive\Documentos\portex-rutafy

## Comando correcto para correr frontend
npm run web:dev

## Puerto habitual
5173

## Nomenclatura oficial del producto
- "Cliente" debe llamarse "Transportista"
- "Conductor" debe llamarse "Mensajero"

## Reglas de UX ya definidas
- usar "Recoger en" y "Entregar en"
- no usar "Origen" y "Destino" como labels principales en UI
- incluir iconos por tipo de servicio:
  - documentos
  - paquete
  - cumplido
  - transporte
- incluir iconos por estado:
  - solicitado
  - buscando mensajero
  - asignado
  - recogiendo
  - entregando
  - finalizado
- incluir microanimaciones ligeras
- mostrar distancia aproximada del mensajero al punto de recogida cuando aplique
- posible línea visual de progreso del servicio

## Flujo operativo oficial V1
REQUESTED
→ OFFERED
→ CLAIMED
→ STARTED
→ CLOSED

Interpretación UX:
- CLAIMED = mensajero asignado, va a recoger
- STARTED = ya recogió, va en camino a entregar
- CLOSED = ya entregó

## Restricciones de producto
- no agregar PIN obligatorio para aceptar
- no agregar PIN obligatorio para iniciar
- start_code puede existir como referencia informativa, no como fricción operativa
- el cierre puede tener confirmación visual en frontend
- la foto de entrega es deseable, pero no obligatoria por backend en V1

## Reglas de trabajo
- no romper rutas existentes
- no rehacer toda la app sin pedirlo
- trabajar por bloques
- preferir cambios pequeños, coherentes y verificables
- priorizar experiencia móvil