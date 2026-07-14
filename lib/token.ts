import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Token format: `<userId>.<expiresAtEpochSeconds>.<hmac>` */
export function createToken(userId: string, secret: string, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyToken(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, mac] = parts;
  const expected = sign(`${userId}.${expires}`, secret);
  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (macBuf.length !== expectedBuf.length || !timingSafeEqual(macBuf, expectedBuf)) return null;
  if (!/^\d+$/.test(expires) || Number(expires) * 1000 < now) return null;
  return userId;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}
