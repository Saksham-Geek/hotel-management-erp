import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createDecipheriv } from 'node:crypto';
import { AuthUser, CurrentUser } from '../common/current-user';
import { Roles } from '../common/roles';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { FEATURES } from '@erp/shared';
import { RequireFeature } from '../entitlements/require-feature';
import { env } from '../config';
import { guestDocumentUploadSchema, persistGuestIdentityDocument } from './guest-document-validation';

@Controller('hotel/guests/:guestId/documents')
@RequireFeature(FEATURES.HOTEL_RESERVATIONS)
export class GuestDocumentsController {
  constructor(private readonly db: DbService, private readonly audit: AuditService) {}

  @Get()
  @Roles('owner','manager','frontdesk')
  async list(@CurrentUser() user: AuthUser, @Param('guestId', ParseUUIDPipe) guestId: string) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const result = await c.query(
        `select id, document_type as "documentType", original_name as "fileName", mime_type as "mimeType", byte_length as "byteLength", uploaded_by as "uploadedBy", consent_method as "consentMethod", created_at as "createdAt" from guest_documents where guest_id = $1 order by created_at desc`, [guestId],
      );
      if (result.rowCount) await this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'guest.document.list', entity: 'guest', entityId: guestId, meta: { count: result.rowCount } });
      return result.rows;
    });
  }

  @Post()
  @Roles('owner','manager','frontdesk')
  upload(@CurrentUser() user: AuthUser, @Param('guestId', ParseUUIDPipe) guestId: string, @Body() body: unknown) {
    const parsed = guestDocumentUploadSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: parsed.error.issues[0]?.message ?? 'Provide consent and 1–8 valid identity images.' });
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const guest = await c.query('select id from guests where id = $1', [guestId]);
      if (!guest.rowCount) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Guest not found' });
      const created = [];
      for (const doc of parsed.data.documents) {
        const row = await persistGuestIdentityDocument(c, user, guestId, {
          ...doc,
          consentGiven: true,
          consentMethod: parsed.data.consentMethod,
          aadhaarMasked: parsed.data.aadhaarMasked,
        }, this.audit);
        created.push(row);
      }
      return created;
    });
  }

  @Get(':documentId/download')
  @Roles('owner','manager','frontdesk')
  async download(@CurrentUser() user: AuthUser, @Param('guestId', ParseUUIDPipe) guestId: string, @Param('documentId', ParseUUIDPipe) documentId: string, @Res() res: Response) {
    const row = await this.db.withTenant(user.tenantId, user.propertyId, async (c) => (await c.query(
      `select original_name, mime_type, ciphertext, iv, auth_tag from guest_documents where id = $1 and guest_id = $2`, [documentId, guestId],
    )).rows[0]);
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    if (!/^[0-9a-fA-F]{64}$/.test(env.guestDocumentEncryptionKey)) {
      throw new BadRequestException({ code: 'DOCUMENT_ENCRYPTION_NOT_CONFIGURED', message: 'Guest document encryption is not configured. Set GUEST_DOCUMENT_ENCRYPTION_KEY to a 64-character hex key.' });
    }
    await this.db.withTenant(user.tenantId, user.propertyId, async (c) => this.audit.log(c, { tenantId: user.tenantId, userId: user.id, action: 'guest.document.access', entity: 'guest_document', entityId: documentId, meta: { guestId } }));
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(env.guestDocumentEncryptionKey, 'hex'), row.iv);
    decipher.setAuthTag(row.auth_tag);
    const plaintext = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);
    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Length', plaintext.length);
    res.setHeader('Content-Disposition', `attachment; filename="${String(row.original_name).replace(/["\\\r\n]/g, '_')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(plaintext);
  }
}
