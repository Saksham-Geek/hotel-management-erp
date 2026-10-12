import { BadRequestException } from '@nestjs/common';
import { createCipheriv, randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { guestIdentityAttachmentSchema, type GuestIdentityAttachment } from '@erp/shared';
import type { AuthUser } from '../common/current-user';
import type { AuditService } from '../audit/audit.service';
import { env } from '../config';
import { z } from 'zod';

export const GUEST_DOCUMENT_CONSENT_VERSION = 'guest-identity-v1';

const allowedTypes = ['aadhaar_masked', 'passport', 'driving_license', 'voter_id', 'other'] as const;
const guestDocumentFileSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z.string().min(1),
  documentType: z.enum(allowedTypes),
});
export const guestDocumentUploadSchema = z.object({
  consentGiven: z.literal(true),
  consentMethod: z.enum(['written', 'verbal', 'digital']),
  aadhaarMasked: z.boolean().default(false),
  documents: z.array(guestDocumentFileSchema).min(1).max(8),
}).superRefine((input, ctx) => {
  if (input.documents.some((document) => document.documentType === 'aadhaar_masked') && !input.aadhaarMasked) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['aadhaarMasked'], message: 'Confirm the Aadhaar image is masked before uploading.' });
  }
});

type MimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export function decodeGuestDocument(encoded: string, mimeType: MimeType): Buffer {
  const compact = encoded.replace(/^data:[^,]+,/, '').replace(/\s/g, '');
  if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new BadRequestException('Document must be valid base64.');
  }
  const data = Buffer.from(compact, 'base64');
  if (!data.length || data.length > 5 * 1024 * 1024) {
    throw new BadRequestException('Each document must be between 1 byte and 5 MB.');
  }
  if (data.toString('base64').replace(/=+$/, '') !== compact.replace(/=+$/, '')) {
    throw new BadRequestException('Document must be valid base64.');
  }

  const isJpeg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng = data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
  if ((mimeType === 'image/jpeg' && !isJpeg) || (mimeType === 'image/png' && !isPng) || (mimeType === 'image/webp' && !isWebp)) {
    throw new BadRequestException('Image contents do not match the selected file type.');
  }
  return data;
}

export async function persistGuestIdentityDocument(
  c: PoolClient,
  user: Pick<AuthUser, 'tenantId' | 'id'>,
  guestId: string,
  attachment: GuestIdentityAttachment,
  audit: AuditService,
) {
  const parsed = guestIdentityAttachmentSchema.safeParse(attachment);
  if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Invalid identity document.');
  if (!/^[0-9a-fA-F]{64}$/.test(env.guestDocumentEncryptionKey)) {
    throw new BadRequestException({ code: 'DOCUMENT_ENCRYPTION_NOT_CONFIGURED', message: 'Guest document encryption is not configured. Set GUEST_DOCUMENT_ENCRYPTION_KEY to a 64-character hex key.' });
  }
  const doc = parsed.data;
  const data = decodeGuestDocument(doc.base64, doc.mimeType);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(env.guestDocumentEncryptionKey, 'hex'), iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const extension = doc.mimeType === 'image/jpeg' ? 'jpg' : doc.mimeType.split('/')[1];
  const row = (await c.query(
    `insert into guest_documents (tenant_id, guest_id, document_type, original_name, mime_type, byte_length, ciphertext, iv, auth_tag, uploaded_by, consent_method, consent_version, consent_recorded_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$10)
     returning id, document_type as "documentType", created_at as "createdAt"`,
    [user.tenantId, guestId, doc.documentType, `${doc.documentType}-${randomUUID()}.${extension}`, doc.mimeType, data.length, ciphertext, iv, authTag, user.id, doc.consentMethod, GUEST_DOCUMENT_CONSENT_VERSION],
  )).rows[0];
  await audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'guest.document.upload', entity: 'guest_document', entityId: row.id, meta: { guestId, mimeType: doc.mimeType, byteLength: data.length } });
  return row;
}
