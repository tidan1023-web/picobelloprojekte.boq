'use strict';
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY environment variable is not set');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  return key;
}

// Format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(ciphertext) {
  const key = getKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted value format');
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
