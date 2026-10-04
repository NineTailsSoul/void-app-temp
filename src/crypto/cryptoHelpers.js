import crypto from 'react-native-quick-crypto';
import { Buffer } from 'buffer';

export function base64UrlToBuffer(str) {
  let standardB64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (standardB64.length % 4)) % 4;
  standardB64 += '='.repeat(pad);
  return Buffer.from(standardB64, 'base64');
}

export function decryptAESGCM(keyBuffer, encryptedStr) {
  const parts = encryptedStr.split(".");
  if (parts.length !== 2) throw new Error("Invalid encrypted payload format");

  const iv = base64UrlToBuffer(parts[0]);
  const ciphertextWithTag = base64UrlToBuffer(parts[1]);

  // AES-GCM appends a 16-byte authentication tag at the end of the ciphertext
  const ciphertext = ciphertextWithTag.slice(0, -16);
  const authTag = ciphertextWithTag.slice(-16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}