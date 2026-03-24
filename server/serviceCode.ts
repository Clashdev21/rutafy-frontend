import { randomBytes } from "crypto";

/**
 * Caracteres permitidos para el código de servicio
 * Excluye caracteres confusos: 0, O, I, l, 1
 */
// Caracteres permitidos - excluye 0, O, I, L, 1 para evitar confusiones
export const ALLOWED_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Genera un código alfanumérico único para el servicio
 * - 8 caracteres por defecto
 * - Sin caracteres confusos (0, O, I, l, 1)
 * - Formato: XXXX-XXXX para mejor legibilidad
 */
export function generateServiceCode(length: number = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  
  for (let i = 0; i < length; i++) {
    const index = bytes[i] % ALLOWED_CHARS.length;
    code += ALLOWED_CHARS[index];
  }
  
  return code;
}

/**
 * Genera un PIN de 4 dígitos para el servicio
 * - Solo números del 0-9
 * - 4 dígitos exactos
 */
export function generateServicePin(): string {
  const bytes = randomBytes(4);
  let pin = "";
  
  for (let i = 0; i < 4; i++) {
    pin += (bytes[i] % 10).toString();
  }
  
  return pin;
}

/**
 * Valida que un código tenga el formato correcto
 */
export function isValidServiceCode(code: string): boolean {
  if (!code || code.length < 6 || code.length > 10) {
    return false;
  }
  
  // Solo caracteres permitidos
  const regex = new RegExp(`^[${ALLOWED_CHARS}]+$`);
  return regex.test(code.toUpperCase());
}

/**
 * Valida que un PIN tenga el formato correcto
 */
export function isValidServicePin(pin: string): boolean {
  if (!pin || pin.length !== 4) {
    return false;
  }
  
  // Solo dígitos
  return /^\d{4}$/.test(pin);
}

/**
 * Formatea el código para mostrar (con guión en el medio)
 */
export function formatServiceCode(code: string): string {
  if (code.length === 8) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  return code;
}
