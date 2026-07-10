import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const SYNC_REQUEST_TTL_MS = 15 * 60 * 1000;

export function createSyncToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSyncToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifySyncToken(token: string, expectedHash: string) {
  const actual = Buffer.from(hashSyncToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSyncExpiresAt(now = new Date()) {
  return new Date(now.getTime() + SYNC_REQUEST_TTL_MS);
}

