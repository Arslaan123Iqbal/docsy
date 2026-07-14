import { describe, it, expect } from "vitest";
import { createToken, verifyToken } from "@/lib/token";

const SECRET = "test-secret";

describe("session tokens", () => {
  it("round-trips a valid token", () => {
    const token = createToken("user-123", SECRET);
    expect(verifyToken(token, SECRET)).toBe("user-123");
  });

  it("rejects a tampered user id", () => {
    const token = createToken("user-123", SECRET);
    const [, expires, mac] = token.split(".");
    expect(verifyToken(`user-456.${expires}.${mac}`, SECRET)).toBeNull();
  });

  it("rejects a tampered expiry", () => {
    const token = createToken("user-123", SECRET);
    const [userId, expires, mac] = token.split(".");
    expect(verifyToken(`${userId}.${Number(expires) + 1000}.${mac}`, SECRET)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createToken("user-123", "other-secret");
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it("rejects an expired token", () => {
    const past = Date.now() - 40 * 24 * 60 * 60 * 1000; // 40 days ago
    const token = createToken("user-123", SECRET, past);
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyToken("", SECRET)).toBeNull();
    expect(verifyToken("abc", SECRET)).toBeNull();
    expect(verifyToken("a.b", SECRET)).toBeNull();
  });
});
