import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";
import type { User } from "../drizzle/schema";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "rutafy-secret-key-change-in-production");

/**
 * Hash a password using SHA-256 with salt
 * Simple but secure for MVP - can upgrade to bcrypt/argon2 later
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  
  const inputHash = createHash("sha256")
    .update(password + salt)
    .digest("hex");
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
  } catch {
    return false;
  }
}

/**
 * Generate a JWT token for a user
 */
export async function generateToken(user: User): Promise<string> {
  const token = await new SignJWT({
    sub: user.openId,
    userId: user.id,
    email: user.email,
    name: user.name,
    appRole: user.appRole,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  
  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<{
  sub: string;
  userId: number;
  email: string | null;
  name: string | null;
  appRole: string;
  role: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      sub: string;
      userId: number;
      email: string | null;
      name: string | null;
      appRole: string;
      role: string;
    };
  } catch {
    return null;
  }
}
