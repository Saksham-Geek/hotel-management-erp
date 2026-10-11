import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { FEATURES } from '@erp/shared';
import { RequireFeature } from '../entitlements/require-feature';
import { env } from '../config';

const uploadSchema = z.object({
  documents: z.array(z.object({
    fileName: z.string().min(1).max(180),
    mimeType: z.enum(['image/jpeg','image/png','image/webp']),
    base64: z.string().min(1),
    documentType: z.string().max(40).default('identity'),
  })).min(1).max(8),
});

function encryptionKey(): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(env.guestDocumentEncryptionKey)) {
    throw new BadRequestException({ code: 'DOCUMENT_ENCRYPTION_NOT_CONFIGURED', message: 'Guest document encryption is not configured. Set GUEST_DOCUMENT_ENCRYPTION_KEY to a 64-character hex key.' });
  }
  return Buffer.from(env.guestDocumentEncryptionKey, 'hex');
}

@Controller('hotel/guests/:guestId/documents')
@RequireFeature(FEATURES.HOTEL_RESERVATIONS)
export class GuestDocumentsController {
  constructor(private readonly db: DbService, private readonly audit: AuditService) {}

  @Get()
  @Roles('owner','manager','frontdesk')
  list(@CurrentUser() user: AuthUser, @Param('guestId', ParseUUIDPipe) guestId: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => (await c.query(
      `select id, document_type as "documentType", original_name as "fileName", mime_type as "mimeType", byte_length as "byteLength", uploaded_by as "uploadedBy", created_at as "createdAt" from guest_documents where guest_id = $1 order by created_at desc`, [guestId],
    )).rows);
  }

  @Post()
  @Roles('owner','manager','frontdesk')
  upload(@CurrentUser() user: AuthUser, @Param('guestId', ParseUUIDPipe) guestId: string, @Body() body: unknown) {
    const parsed = uploadSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: 'Provide 1–8 JPEG, PNG or WebP images.' });
    const key = encryptionKey();
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const guest = await c.query('select id from guests where id = $1', [guestId]);
      if (!guest.rowCount) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Guest not found' });
      const created = [];
      for (const doc of parsed.data.documents) {
        const compact = doc.base64.replace(/^data:[^,]+,/, '').replace(/\s/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) throw new BadRequestException('Document must be valid base64.');
        const data = Buffer.from(compact, 'base64');
        if (!data.length || data.length > 5 * 1024 * 1024) throw new BadRequestException('Each document must be between 1 byte and 5 MB.');
        const iv = randomBytes(12);
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
        const authTag = cipher.getAuthTag();
        const row = (await c.query(
          `insert into guest_documents (tenant_id, guest_id, document_type, original_name, mime_type, byte_length, ciphertext, iv, auth_tag, uploaded_by)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id, document_type as "documentType", original_name as "fileName", mime_type as "mimeType", byte_length as "byteLength", created_at as "createdAt"`,
          [user.tenantId, guestId, doc.documentType, doc.fileName.replace(/[\\/\x00-\x1f]/g, '_'), doc.mimeType, data.length, ciphertext, iv, authTag, user.id],
        )).rows[0];
        await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'guest.document.upload', entity: 'guest_document', entityId: row.id, meta: { guestId, mimeType: doc.mimeType, byteLength: data.length } });
        created.push(row);
      }
      return created;
    });
  }

  @Get(':documentId/download')
  @Roles('owner','manager','frontdesk')
  async download(@CurrentUser() user: AuthUser, @Param('guestId', ParseUUIDPipe) guestId: string, @Param('documentId', ParseUUIDPipe) documentId: string, @Res() res: Response) {
    const key = encryptionKey();
    const row = await this.db.withTenant(user.tenantId, user.propertyId, async (c) => (await c.query(
      `select original_name, mime_type, ciphertext, iv, auth_tag from guest_documents where id = $1 and guest_id = $2`, [documentId, guestId],
    )).rows[0]);
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    await this.db.withTenant(user.tenantId, user.propertyId, async (c) => this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'guest.document.access', entity: 'guest_document', entityId: documentId, meta: { guestId } }));
    const decipher = createDecipheriv('aes-256-gcm', key, row.iv);
    decipher.setAuthTag(row.auth_tag);
    const plaintext = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);
    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Length', plaintext.length);
    res.setHeader('Content-Disposition', `attachment; filename="${String(row.original_name).replace(/["\\\r\n]/g, '_')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(plaintext);
  }
}
