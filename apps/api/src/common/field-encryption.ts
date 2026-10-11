import { createCipheriv, randomBytes } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { env } from '../config';

export function encryptSensitiveField(value?: string | null) {
  if (!value?.trim()) return { ciphertext: null, iv: null, authTag: null };
  if (!/^[0-9a-fA-F]{64}$/.test(env.guestDocumentEncryptionKey)) {
    throw new BadRequestException({ code: 'FIELD_ENCRYPTION_NOT_CONFIGURED', message: 'Sensitive-field encryption is not configured. Set GUEST_DOCUMENT_ENCRYPTION_KEY before saving identity numbers.' });
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(env.guestDocumentEncryptionKey, 'hex'), iv);
  const ciphertext = Buffer.concat([cipher.update(value.trim(), 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}
