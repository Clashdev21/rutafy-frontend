import { describe, expect, it } from "vitest";
import { generateServiceCode, generateServicePin, ALLOWED_CHARS } from "./serviceCode";

describe("Service Code Generation", () => {
  it("generates a code of 8 characters", () => {
    const code = generateServiceCode();
    expect(code).toHaveLength(8);
  });

  it("generates only uppercase alphanumeric characters without confusing chars", () => {
    const code = generateServiceCode();
    for (const char of code) {
      expect(ALLOWED_CHARS).toContain(char);
    }
  });

  it("does not contain confusing characters (0, O, I, L, 1)", () => {
    const confusingChars = ["0", "O", "I", "L", "1"];
    // Generate multiple codes to increase confidence
    for (let i = 0; i < 100; i++) {
      const code = generateServiceCode();
      for (const char of confusingChars) {
        expect(code).not.toContain(char);
      }
    }
  });

  it("generates unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateServiceCode());
    }
    // With 8 chars from 31 allowed chars, collision probability is extremely low
    expect(codes.size).toBe(100);
  });
});

describe("Service PIN Generation", () => {
  it("generates a PIN of 4 digits", () => {
    const pin = generateServicePin();
    expect(pin).toHaveLength(4);
  });

  it("generates only numeric characters", () => {
    const pin = generateServicePin();
    expect(pin).toMatch(/^\d{4}$/);
  });

  it("generates PINs in valid range (0000-9999)", () => {
    for (let i = 0; i < 100; i++) {
      const pin = generateServicePin();
      const numericPin = parseInt(pin, 10);
      expect(numericPin).toBeGreaterThanOrEqual(0);
      expect(numericPin).toBeLessThanOrEqual(9999);
    }
  });

  it("generates varied PINs (not always the same)", () => {
    const pins = new Set<string>();
    for (let i = 0; i < 50; i++) {
      pins.add(generateServicePin());
    }
    // Should have at least 10 different PINs out of 50 attempts
    expect(pins.size).toBeGreaterThan(10);
  });
});
