export const TRACKING_ACTOR_TYPE_LABELS: Record<string, string> = {
  messenger: "Mensajero",
  transporter: "Transportista",
  admin: "Admin",
};

export const TRACKING_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  ended: "Finalizada",
  abandoned: "Abandonada",
};

export const TRACKING_PURPOSE_LABELS: Record<string, string> = {
  terminal: "Terminal",
  patio: "Patio",
  puerto: "Puerto",
  operacion_interna: "Operación interna",
};

export function trackingActorTypeLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return TRACKING_ACTOR_TYPE_LABELS[key] ?? (key ? key : "—");
}

export function trackingStatusLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return TRACKING_STATUS_LABELS[key] ?? (key ? key : "—");
}

export function trackingPurposeLabel(value?: string | null): string {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  return TRACKING_PURPOSE_LABELS[key] ?? (key ? key : "—");
}

export function trackingStatusBadgeClass(status?: string | null): string {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  switch (key) {
    case "active":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "ended":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "abandoned":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export type CaptureQualityTier = "excellent" | "good" | "partial" | "incomplete";

export const CAPTURE_QUALITY_LABELS: Record<CaptureQualityTier, string> = {
  excellent: "Excelente",
  good: "Buena",
  partial: "Parcial",
  incomplete: "Incompleta",
};

export const CAPTURE_QUALITY_EMOJI: Record<CaptureQualityTier, string> = {
  excellent: "🟢",
  good: "🟡",
  partial: "🟠",
  incomplete: "🔴",
};

export function normalizeCaptureQuality(
  value?: string | null,
): CaptureQualityTier | null {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  if (
    key === "excellent" ||
    key === "good" ||
    key === "partial" ||
    key === "incomplete"
  ) {
    return key;
  }
  return null;
}

export function captureQualityLabel(value?: string | null): string {
  const tier = normalizeCaptureQuality(value);
  if (!tier) {
    const raw = String(value ?? "").trim();
    return raw || "—";
  }
  return CAPTURE_QUALITY_LABELS[tier];
}

export function captureQualityDisplay(value?: string | null): string {
  const tier = normalizeCaptureQuality(value);
  if (!tier) return captureQualityLabel(value);
  return `${CAPTURE_QUALITY_EMOJI[tier]} ${CAPTURE_QUALITY_LABELS[tier]}`;
}

export function captureQualityHeroClass(tier: CaptureQualityTier | null): string {
  switch (tier) {
    case "excellent":
      return "border-emerald-300 bg-emerald-50";
    case "good":
      return "border-amber-300 bg-amber-50";
    case "partial":
      return "border-orange-300 bg-orange-50";
    case "incomplete":
      return "border-red-300 bg-red-50";
    default:
      return "border-gray-200 bg-gray-50";
  }
}

export function captureQualityTextClass(tier: CaptureQualityTier | null): string {
  switch (tier) {
    case "excellent":
      return "text-emerald-900";
    case "good":
      return "text-amber-900";
    case "partial":
      return "text-orange-900";
    case "incomplete":
      return "text-red-900";
    default:
      return "text-gray-900";
  }
}

export function captureQualityAlertMessage(
  value?: string | null,
): string | null {
  const tier = normalizeCaptureQuality(value);
  switch (tier) {
    case "incomplete":
      return "Esta sesión presenta huecos prolongados de captura GPS y puede no representar todo el recorrido.";
    case "partial":
      return "La captura GPS es parcial. Algunas secciones del recorrido pueden no haber sido registradas.";
    case "good":
      return "La captura GPS tiene buena continuidad y representa la mayor parte del recorrido.";
    case "excellent":
      return "La captura GPS tiene excelente continuidad y representa prácticamente todo el recorrido.";
    default:
      return null;
  }
}

export function captureQualityAlertClass(tier: CaptureQualityTier | null): string {
  switch (tier) {
    case "incomplete":
      return "border-red-200 bg-red-50 text-red-900 [&_[data-slot=alert-description]]:text-red-800";
    case "partial":
      return "border-orange-200 bg-orange-50 text-orange-900 [&_[data-slot=alert-description]]:text-orange-800";
    case "good":
      return "border-amber-200 bg-amber-50 text-amber-900 [&_[data-slot=alert-description]]:text-amber-800";
    case "excellent":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 [&_[data-slot=alert-description]]:text-emerald-800";
    default:
      return "border-gray-200 bg-gray-50";
  }
}
