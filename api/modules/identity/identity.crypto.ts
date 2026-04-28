import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from '../../config';

const algorithm = 'aes-256-gcm';
const key = createHash('sha256').update(config.JWT_SECRET).digest();

export const hashToken = (value: string): string => {
  return createHash('sha256').update(value).digest('hex');
};

export const encryptSecret = (value: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString(
    'base64url'
  )}`;
};

export const decryptSecret = (value: string): string => {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split('.');
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
    throw new Error('Invalid encrypted secret');
  }

  const decipher = createDecipheriv(algorithm, key, Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextEncoded, 'base64url')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
};

export const hashClaims = (claims: Record<string, unknown>): string => {
  return createHash('sha256').update(JSON.stringify(claims)).digest('hex');
};
