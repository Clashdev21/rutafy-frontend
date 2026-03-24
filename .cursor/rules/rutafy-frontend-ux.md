# Rutafy frontend UX rules

## Principio general
Rutafy no debe verse como una tienda ni como una app social.
Debe sentirse como una herramienta logística clara, rápida y confiable.

## Referencias UX elegidas
Usar como inspiración conceptual:
- Bolt: tracking + tarjeta de mensajero
- Chipotle: línea de progreso del servicio
- Snoonu: flujo simple de crear servicio
- Shopify Orders: historial con filtros
- Grab / Taco Bell: selector de ubicación
- Blank Street: home limpia con servicio activo destacado

## Pantallas núcleo del frontend
1. Inicio / panel del transportista
2. Crear servicio
3. Buscando mensajero
4. Servicio en progreso
5. Historial de servicios

## Componentes deseados
- PrimaryActionCard
- ServiceTypeSelector
- LocationInputCard
- NodePickerSheet
- ServiceStatusTimeline
- MessengerInfoCard
- ServiceHistoryCard
- EmptyState

## Reglas visuales
- mobile first
- cards limpias
- bordes redondeados moderados
- sombras suaves
- densidad compacta pero no apretada
- tipografía clara
- CTA principal visible
- no saturar de elementos

## Microanimaciones sí permitidas
- cambio de estado del servicio
- loading de búsqueda de mensajero
- aparición suave de tarjeta de servicio
- progreso visual ligero

## Microanimaciones no deseadas
- animaciones largas
- efectos 3D
- rebotes exagerados
- interfaces recargadas

## Empty states
Los empty states deben guiar a la acción.
No deben sentirse muertos.
Siempre que aplique, acompañarlos con CTA útil.