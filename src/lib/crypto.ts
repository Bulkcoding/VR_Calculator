import crypto from "crypto";

const ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY || "dev-fallback-key-32chars!!";

function getKey(): Buffer {
  return crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  let enc = cipher.update(text, "utf8", "hex");
  enc += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${enc}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, tagHex, data] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(data, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}
