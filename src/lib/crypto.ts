import crypto from "crypto";

const FALLBACK_KEY = "dev-fallback-key-32chars!!";
const PRIMARY_KEY = process.env.MASTER_ENCRYPTION_KEY || FALLBACK_KEY;

function getKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "salt", 32);
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(PRIMARY_KEY), iv);
  let enc = cipher.update(text, "utf8", "hex");
  enc += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${tag}:${enc}`;
}

function decryptWith(encrypted: string, secret: string): string {
  const [ivHex, tagHex, data] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(secret), iv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(data, "hex", "utf8");
  dec += decipher.final("utf8");
  return dec;
}

export function decrypt(encrypted: string): string {
  try {
    return decryptWith(encrypted, PRIMARY_KEY);
  } catch (e) {
    // MASTER_ENCRYPTION_KEY 설정 이전(=fallback 키)에 저장된 과거 데이터 호환.
    // 현재 키로 복호화 실패 시 fallback 키로 한 번 더 시도한다.
    if (PRIMARY_KEY !== FALLBACK_KEY) {
      return decryptWith(encrypted, FALLBACK_KEY);
    }
    throw e;
  }
}
