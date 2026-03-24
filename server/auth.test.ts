import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth";
import type { User } from "../drizzle/schema";

describe("Password Hashing", () => {
  it("should hash a password and return a salt:hash format", async () => {
    const password = "testPassword123";
    const hashed = await hashPassword(password);
    
    expect(hashed).toBeDefined();
    expect(hashed).toContain(":");
    
    const [salt, hash] = hashed.split(":");
    expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(hash).toHaveLength(64); // SHA-256 = 64 hex chars
  });

  it("should generate different hashes for the same password (due to random salt)", async () => {
    const password = "testPassword123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
  });

  it("should verify a correct password", async () => {
    const password = "testPassword123";
    const hashed = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hashed);
    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const password = "testPassword123";
    const wrongPassword = "wrongPassword456";
    const hashed = await hashPassword(password);
    
    const isValid = await verifyPassword(wrongPassword, hashed);
    expect(isValid).toBe(false);
  });

  it("should handle malformed hash gracefully", async () => {
    const isValid = await verifyPassword("test", "malformed-hash");
    expect(isValid).toBe(false);
  });

  it("should handle empty hash gracefully", async () => {
    const isValid = await verifyPassword("test", "");
    expect(isValid).toBe(false);
  });
});

describe("JWT Token", () => {
  const mockUser: User = {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    phone: null,
    password: null,
    loginMethod: "local",
    role: "user",
    appRole: "TRANSPORTISTA",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  it("should generate a valid JWT token", async () => {
    const token = await generateToken(mockUser);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });

  it("should verify and decode a valid token", async () => {
    const token = await generateToken(mockUser);
    const decoded = await verifyToken(token);
    
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(mockUser.openId);
    expect(decoded?.userId).toBe(mockUser.id);
    expect(decoded?.email).toBe(mockUser.email);
    expect(decoded?.appRole).toBe(mockUser.appRole);
  });

  it("should return null for an invalid token", async () => {
    const decoded = await verifyToken("invalid.token.here");
    expect(decoded).toBeNull();
  });

  it("should return null for an empty token", async () => {
    const decoded = await verifyToken("");
    expect(decoded).toBeNull();
  });
});
