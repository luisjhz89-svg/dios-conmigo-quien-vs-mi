import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptPrivateText,
  emailLookupHash,
  encryptPrivateText,
  getDataEncryptionKey,
} from "./data-encryption.js";

const originalKey = process.env.DATA_ENCRYPTION_KEY;
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

test("encrypts private text and decrypts it without exposing its contents", () => {
  const plaintext = "una conversación privada";
  const encrypted = encryptPrivateText(plaintext);
  assert.notEqual(encrypted, plaintext);
  assert.equal(encrypted.includes(plaintext), false);
  assert.equal(decryptPrivateText(encrypted), plaintext);
});

test("uses a fresh nonce and supports legacy plaintext during migration", () => {
  assert.notEqual(encryptPrivateText("same"), encryptPrivateText("same"));
  assert.equal(decryptPrivateText("mensaje anterior"), "mensaje anterior");
});

test("creates a deterministic, case-insensitive lookup hash without storing the email", () => {
  assert.equal(emailLookupHash("Luis@example.com"), emailLookupHash("luis@example.com"));
  assert.notEqual(emailLookupHash("luis@example.com"), "luis@example.com");
});

test("rejects missing or incorrectly sized encryption keys", () => {
  process.env.DATA_ENCRYPTION_KEY = "";
  assert.throws(() => getDataEncryptionKey());
  process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(16, 7).toString("base64");
  assert.throws(() => getDataEncryptionKey());
});

test.after(() => {
  if (originalKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
  else process.env.DATA_ENCRYPTION_KEY = originalKey;
});
