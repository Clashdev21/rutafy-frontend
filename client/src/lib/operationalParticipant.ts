/** Perfil operativo de transportista, mensajero o solicitante en servicios. */
export type OperationalParticipant = {
  name?: string | null;
  plate?: string | null;
  vehicle_type?: string | null;
  vehicle_reference?: string | null;
  company_name?: string | null;
};

function pickStr(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

export function normalizeOperationalParticipant(
  raw: unknown,
): OperationalParticipant | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;

  const name =
    pickStr(rec.name) ??
    pickStr(rec.full_name) ??
    pickStr(rec.display_name) ??
    pickStr(rec.messenger_name) ??
    pickStr(rec.mensajero_name) ??
    pickStr(rec.nombre);
  const plate =
    pickStr(rec.plate) ??
    pickStr(rec.vehicle_plate) ??
    pickStr(rec.vehiclePlate) ??
    pickStr(rec.license_plate) ??
    pickStr(rec.plate_number) ??
    pickStr(rec.placa);
  const vehicle_type =
    pickStr(rec.vehicle_type) ??
    pickStr(rec.vehicleType) ??
    pickStr(rec.tipo_vehiculo) ??
    pickStr(rec.tipoVehiculo) ??
    pickStr(rec.vehicle);
  const vehicle_reference =
    pickStr(rec.vehicle_reference) ?? pickStr(rec.vehicleReference);
  const company_name = pickStr(rec.company_name) ?? pickStr(rec.companyName);

  if (!name && !plate && !vehicle_type && !vehicle_reference && !company_name) {
    return null;
  }

  return {
    name,
    plate,
    vehicle_type,
    vehicle_reference,
    company_name,
  };
}

export function hasOperationalParticipant(
  participant: OperationalParticipant | null | undefined,
): boolean {
  return participant != null;
}

export function displayParticipantValue(value: string | null | undefined): string {
  const s = value?.trim();
  return s && s.length > 0 ? s : "—";
}
