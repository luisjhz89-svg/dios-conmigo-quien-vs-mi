import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const prefix = "enc:v1:";

export function getDataEncryptionKey() {
  const configuredKey = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!configuredKey) throw new Error("Configura DATA_ENCRYPTION_KEY para proteger los mensajes.");

  const key = Buffer.from(configuredKey, "base64");
  if (key.length !== 32 || key.toString("base64") !== configuredKey) {
    throw new Error("DATA_ENCRYPTION_KEY debe ser una clave Base64 válida de 32 bytes.");
  }
  return key;
}

export function encryptPrivateText(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getDataEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${prefix}${iv.toString("base64url")}:${authTag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function emailLookupHash(email: string) {
  const lookupKey = createHmac("sha256", getDataEncryptionKey())
    .update("email-lookup")
    .digest();
  return createHmac("sha256", lookupKey)
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export function decryptPrivateText(value: string) {
  if (!value.startsWith(prefix)) return value;

  const [iv, authTag, ciphertext, ...extra] = value.slice(prefix.length).split(":");
  if (!iv || !authTag || !ciphertext || extra.length) {
    throw new Error("El contenido cifrado está mal formado.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getDataEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
