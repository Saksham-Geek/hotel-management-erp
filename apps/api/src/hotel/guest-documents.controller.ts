import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createDecipheriv } from 'node:crypto';
import { AuthUser, CurrentUser } from '../common/current-user';
import { RequirePermission } from '../common/permission-guard';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { FEATURES, PERMISSIONS } from '@erp/shared';
import { RequireFeature } from '../entitlements/require-feature';
import { env } from '../config';
import { guestDocumentUploadSchema, persistGuestIdentityDocument } from './guest-document-validation';

@Controller('hotel/guests/:guestId/documents')
@RequireFeature(FEATURES.HOTEL_RESERVATIONS)
export class GuestDocumentsController {
  constructor(private readonly db: DbService, private readonly audit: AuditService) {}

  @Get()
  @RequirePermission(PERMISSIONS.GUEST_DOCUMENT_METADATA_READ)
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
  @RequirePermission(PERMISSIONS.GUEST_DOCUMENT_WRITE)
  upload(@CurrentUser() user: AuthUser, @Param('guestId', ParseUUIDPipe) guestId: string, @Body() body: unknown) {
    const parsed = guestDocumentUploadSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException({ code: 'INVALID_DOCUMENT', message: parsed.error.issues[0]?.message ?? 'Provide consent and 1–8 valid identity documents.' });
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

  @Get(':documentId/view')
  @RequirePermission(PERMISSIONS.GUEST_DOCUMENT_IMAGE_READ)
  async view(
    @CurrentUser() user: AuthUser,
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res() res: Response,
  ) {
    const row = await this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (
        await c.query(
          `select original_name, mime_type, ciphertext, iv, auth_tag, sha256_hash from guest_documents where id = $1 and guest_id = $2`,
          [documentId, guestId],
        )
      ).rows[0],
    );
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    if (!/^[0-9a-fA-F]{64}$/.test(env.guestDocumentEncryptionKey)) {
      throw new BadRequestException({
        code: 'DOCUMENT_ENCRYPTION_NOT_CONFIGURED',
        message: 'Guest document encryption is not configured. Set GUEST_DOCUMENT_ENCRYPTION_KEY to a 64-character hex key.',
      });
    }

    await this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'guest.document.view',
        entity: 'guest_document',
        entityId: documentId,
        meta: { guestId, mimeType: row.mime_type, staffId: user.id, staffRole: user.role },
      }),
    );

    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(env.guestDocumentEncryptionKey, 'hex'), row.iv);
    decipher.setAuthTag(row.auth_tag);
    const plaintext = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);

    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Length', plaintext.length);
    res.setHeader('Content-Disposition', `inline; filename="${String(row.original_name).replace(/["\\\r\n]/g, '_')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.send(plaintext);
  }

  @Post(':documentId/export')
  @RequirePermission(PERMISSIONS.GUEST_DOCUMENT_IMAGE_READ)
  async exportDocument(
    @CurrentUser() user: AuthUser,
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: { reason?: string },
    @Res() res: Response,
  ) {
    const reason = String(body?.reason ?? '').trim();
    if (reason.length < 5) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'Statutory compliance requires documenting an official reason (minimum 5 characters) to export guest identity records.',
      });
    }

    const row = await this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      (
        await c.query(
          `select original_name, mime_type, ciphertext, iv, auth_tag, sha256_hash from guest_documents where id = $1 and guest_id = $2`,
          [documentId, guestId],
        )
      ).rows[0],
    );
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
    if (!/^[0-9a-fA-F]{64}$/.test(env.guestDocumentEncryptionKey)) {
      throw new BadRequestException({
        code: 'DOCUMENT_ENCRYPTION_NOT_CONFIGURED',
        message: 'Guest document encryption is not configured.',
      });
    }

    await this.db.withTenant(user.tenantId, user.propertyId, async (c) =>
      this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'guest.document.export',
        entity: 'guest_document',
        entityId: documentId,
        meta: { guestId, reason, staffId: user.id, staffRole: user.role },
      }),
    );

    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(env.guestDocumentEncryptionKey, 'hex'), row.iv);
    decipher.setAuthTag(row.auth_tag);
    const plaintext = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);

    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Length', plaintext.length);
    res.setHeader('Content-Disposition', `attachment; filename="${String(row.original_name).replace(/["\\\r\n]/g, '_')}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(plaintext);
  }

  @Post(':documentId/legal-hold')
  @RequirePermission(PERMISSIONS.GUEST_DOCUMENT_WRITE)
  async toggleLegalHold(
    @CurrentUser() user: AuthUser,
    @Param('guestId', ParseUUIDPipe) guestId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() body: { legalHold: boolean; reason?: string },
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const result = await c.query(
        `update guest_documents set legal_hold = $1 where id = $2 and guest_id = $3 returning id, legal_hold as "legalHold"`,
        [Boolean(body?.legalHold), documentId, guestId],
      );
      if (!result.rowCount) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Document not found' });
      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'guest.document.legal_hold',
        entity: 'guest_document',
        entityId: documentId,
        meta: { guestId, legalHold: Boolean(body?.legalHold), reason: body?.reason },
      });
      return result.rows[0];
    });
  }

  @Get(':documentId/download')
  @RequirePermission(PERMISSIONS.GUEST_DOCUMENT_IMAGE_READ)
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
