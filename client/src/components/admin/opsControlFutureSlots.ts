/**
 * Extensiones planificadas del Centro de Control (no implementadas en V1).
 * Importar desde aquí cuando se activen nuevas capas del mapa / paneles.
 */
export type OpsControlFutureFeature =
  | "port_congestion"
  | "geofence_events"
  | "terminal_dwell"
  | "operational_eta"
  | "declared_vs_actual_port"
  | "operational_intelligence"
  | "logistics_heatmap";

export const OPS_CONTROL_FUTURE_FEATURES: OpsControlFutureFeature[] = [
  "port_congestion",
  "geofence_events",
  "terminal_dwell",
  "operational_eta",
  "declared_vs_actual_port",
  "operational_intelligence",
  "logistics_heatmap",
];
