import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import {
  CreateGuestInput,
  FEATURES,
  PERMISSIONS,
  createGuestSchema,
  updateGuestSchema,
} from '@erp/shared';

import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { ZodPipe } from '../common/zod.pipe';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { decryptSensitiveField, encryptSensitiveField } from '../common/field-encryption';
import { RequirePermission } from '../common/permission-guard';
import { DbService } from '../db/db.service';
import { RequireFeature } from '../entitlements/require-feature';

@Controller('hotel/guests')
@RequireFeature(FEATURES.HOTEL_RESERVATIONS)
export class GuestsController {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly customFields: CustomFieldsService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.GUEST_READ)
  list(
    @CurrentUser() user: AuthUser,
    @Query('q') q?: string,
  ) {
    const term = q
      ? `%${q.replace(/[%_\\]/g, '\\$&')}%`
      : null;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const result = await c.query(
        `SELECT
           g.id,
           p.full_name AS "fullName",
           p.phone,
           p.email,
           g.vip,
           EXISTS (SELECT 1 FROM guest_documents gd WHERE gd.guest_id = g.id) AS "hasIdentityDocument",
           g.nationality,
           g.id_type AS "idType",
           g.notes,
           p.custom_fields AS "customFields",
           (
             SELECT json_agg(
               json_build_object(
                 'id', d.id,
                 'documentType', d.document_type,
                 'fileName', d.original_name,
                 'mimeType', d.mime_type,
                 'consentMethod', d.consent_method,
                 'createdAt', d.created_at,
                 'byteLength', d.byte_length,
                 'retentionUntil', d.retention_until,
                 'legalHold', d.legal_hold,
                 'sha256Hash', d.sha256_hash
               )
               ORDER BY d.created_at DESC
             )
             FROM guest_documents d
             WHERE d.guest_id = g.id
           ) AS documents
         FROM guests g
         JOIN parties p ON p.id = g.party_id
         WHERE
           (
             $1::text IS NULL
             OR p.full_name ILIKE $1
             OR p.phone ILIKE $1
             OR p.email ILIKE $1
           )
         ORDER BY
           CASE
             WHEN $1::text IS NOT NULL
              AND regexp_replace(
                coalesce(p.phone, ''),
                '[^0-9]',
                '',
                'g'
              ) = regexp_replace(
                trim($1, '%'),
                '[^0-9]',
                '',
                'g'
              )
             THEN 0
             ELSE 1
           END,
           CASE
             WHEN $1::text IS NOT NULL
              AND lower(trim(coalesce(p.email, ''))) =
                  lower(trim($1, '%'))
             THEN 0
             ELSE 1
           END,
           g.created_at DESC
         LIMIT 50`,
        [term],
      );

      for (const row of result.rows) {
        const documentCount = Array.isArray(row.documents) ? row.documents.length : 0;
        if (documentCount) {
          await this.audit.log(c, {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'guest.document.metadata_list',
            entity: 'guest',
            entityId: row.id,
            meta: { count: documentCount },
          });
        }
      }
      return result.rows;
    });
  }

  @Get(':id/identity')
  @RequirePermission(PERMISSIONS.GUEST_IDENTITY_DECRYPT)
  async getIdentity(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const row = (
        await c.query(
          `SELECT g.id, g.id_type AS "idType", g.id_number AS "legacyIdNumber",
                  g.id_number_ciphertext AS "ciphertext", g.id_number_iv AS "iv", g.id_number_auth_tag AS "authTag",
                  p.full_name AS "fullName"
           FROM guests g
           JOIN parties p ON p.id = g.party_id
           WHERE g.id = $1`,
          [id],
        )
      ).rows[0];

      if (!row) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Guest not found' });
      }

      let decryptedNumber: string | null = row.legacyIdNumber ?? null;
      if (row.ciphertext && row.iv && row.authTag) {
        decryptedNumber = decryptSensitiveField(row.ciphertext, row.iv, row.authTag);
      }

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'guest.identity.decrypt',
        entity: 'guest',
        entityId: id,
        meta: { idType: row.idType },
      });

      return {
        id: row.id,
        fullName: row.fullName,
        idType: row.idType,
        idNumber: decryptedNumber,
      };
    });
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.GUEST_WRITE)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const parsed = updateGuestSchema.safeParse(body);

    if (!parsed.success || !Object.keys(parsed.data ?? {}).length) {
      throw new NotFoundException({
        code: 'INVALID_GUEST',
        message: 'Provide valid guest fields to update.',
      });
    }

    const b = parsed.data;

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const current = (
        await c.query(
          `SELECT g.id, g.party_id AS "partyId"
           FROM guests g
           WHERE g.id = $1`,
          [id],
        )
      ).rows[0];

      if (!current) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'Guest not found',
        });
      }

      if (b.customFields) {
        const custom = await this.customFields.validate(
          c,
          'guest',
          b.customFields,
        );

        await c.query(
          `UPDATE parties
           SET custom_fields = $2
           WHERE id = $1`,
          [current.partyId, JSON.stringify(custom)],
        );
      }

      if (
        b.fullName !== undefined ||
        b.phone !== undefined ||
        b.email !== undefined
      ) {
        await c.query(
          `UPDATE parties
           SET
             full_name = COALESCE($2, full_name),
             phone = CASE
               WHEN $3::boolean THEN $4
               ELSE phone
             END,
             email = CASE
               WHEN $5::boolean THEN $6
               ELSE email
             END
           WHERE id = $1`,
          [
            current.partyId,
            b.fullName ?? null,
            b.phone !== undefined,
            b.phone ?? null,
            b.email !== undefined,
            b.email || null,
          ],
        );
      }

      const identity =
        b.idNumber !== undefined
          ? encryptSensitiveField(b.idNumber)
          : null;

      await c.query(
        `UPDATE guests
         SET
           nationality = COALESCE($2, nationality),
           id_type = COALESCE($3, id_type),
           id_number = CASE
             WHEN $4::boolean THEN NULL
             ELSE id_number
           END,
           id_number_ciphertext = CASE
             WHEN $4::boolean THEN $5
             ELSE id_number_ciphertext
           END,
           id_number_iv = CASE
             WHEN $4::boolean THEN $6
             ELSE id_number_iv
           END,
           id_number_auth_tag = CASE
             WHEN $4::boolean THEN $7
             ELSE id_number_auth_tag
           END,
           vip = COALESCE($8, vip),
           notes = COALESCE($9, notes)
         WHERE id = $1`,
        [
          id,
          b.nationality ?? null,
          b.idType ?? null,
          b.idNumber !== undefined,
          identity?.ciphertext ?? null,
          identity?.iv ?? null,
          identity?.authTag ?? null,
          b.vip ?? null,
          b.notes ?? null,
        ],
      );

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'guest.update',
        entity: 'guest',
        entityId: id,
        meta: { fields: Object.keys(b) },
      });

      return {
        id,
        updated: Object.keys(b),
      };
    });
  }

  /** Creates the shared party record and hotel-specific guest record together. */
  @Post()
  @RequirePermission(PERMISSIONS.GUEST_WRITE)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(createGuestSchema)) b: CreateGuestInput,
  ) {
    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      const duplicate = (
        await c.query(
          `SELECT
             g.id,
             p.full_name AS "fullName"
           FROM guests g
           JOIN parties p ON p.id = g.party_id
           WHERE
             lower(trim(p.full_name)) = lower(trim($1))
             AND (
               (
                 $2::text IS NOT NULL
                 AND regexp_replace(
                   coalesce(p.phone, ''),
                   '[^0-9]',
                   '',
                   'g'
                 ) = regexp_replace(
                   $2,
                   '[^0-9]',
                   '',
                   'g'
                 )
               )
               OR (
                 $3::text IS NOT NULL
                 AND lower(trim(p.email)) = lower(trim($3))
               )
             )
           LIMIT 1`,
          [
            b.fullName,
            b.phone ?? null,
            b.email ?? null,
          ],
        )
      ).rows[0];

      if (duplicate) {
        throw new ConflictException({
          code: 'POSSIBLE_DUPLICATE_GUEST',
          guestId: duplicate.id,
          message:
            `A matching guest profile already exists for ` +
            `${duplicate.fullName}. Select the existing profile ` +
            `instead of creating a duplicate.`,
        });
      }

      const custom = await this.customFields.validate(
        c,
        'guest',
        b.customFields,
      );

      const identity = encryptSensitiveField(b.idNumber);

      const party = (
        await c.query(
          `INSERT INTO parties (
             tenant_id,
             full_name,
             phone,
             email,
             custom_fields
           )
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            user.tenantId,
            b.fullName,
            b.phone ?? null,
            b.email ?? null,
            JSON.stringify(custom),
          ],
        )
      ).rows[0];

      const guest = (
        await c.query(
          `INSERT INTO guests (
             tenant_id,
             party_id,
             nationality,
             id_type,
             id_number,
             id_number_ciphertext,
             id_number_iv,
             id_number_auth_tag,
             vip,
             notes
           )
           VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            user.tenantId,
            party.id,
            b.nationality ?? null,
            b.idType ?? null,
            identity.ciphertext,
            identity.iv,
            identity.authTag,
            b.vip,
            b.notes ?? null,
          ],
        )
      ).rows[0];

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'guest.create',
        entity: 'guest',
        entityId: guest.id,
      });

      return {
        id: guest.id,
        fullName: b.fullName,
        phone: b.phone ?? null,
        email: b.email ?? null,
      };
    });
  }

  @Post('bulk-import')
  @RequirePermission(PERMISSIONS.GUEST_WRITE)
  async bulkImportGuests(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      guests: Array<{
        fullName: string;
        phone?: string | null;
        email?: string | null;
        nationality?: string | null;
        idType?: string | null;
        idNumber?: string | null;
        vip?: boolean;
        notes?: string | null;
      }>;
    },
  ) {
    if (!body?.guests || !Array.isArray(body.guests) || body.guests.length === 0) {
      throw new BadRequestException('Invalid payload. Expected a non-empty array of guests.');
    }
    if (body.guests.length > 500) {
      throw new BadRequestException('Maximum 500 guests can be imported in a single batch.');
    }

    return this.db.withTenant(user.tenantId, user.propertyId, async (c) => {
      let created = 0;
      let updated = 0;

      for (const item of body.guests) {
        const fullName = item.fullName?.trim();
        if (!fullName) continue;

        const phone = item.phone?.trim() || null;
        const email = item.email?.trim() || null;
        const nationality = item.nationality?.trim() || 'IN - India';
        const idType = item.idType?.trim() || null;
        const vip = Boolean(item.vip);
        const notes = item.notes?.trim() || null;

        const identity = item.idNumber?.trim()
          ? encryptSensitiveField(item.idNumber.trim())
          : null;

        // Check for existing party within this tenant by phone or email
        let partyId: string | null = null;
        if (phone || email) {
          const matchRes = await c.query(
            `SELECT p.id
             FROM parties p
             WHERE (
               ($1::text IS NOT NULL AND regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g') AND regexp_replace($1, '[^0-9]', '', 'g') <> '')
               OR ($2::text IS NOT NULL AND lower(trim(coalesce(p.email, ''))) = lower(trim($2)))
             )
             LIMIT 1`,
            [phone, email],
          );
          if (matchRes.rows.length > 0) {
            partyId = matchRes.rows[0].id;
          }
        }

        if (!partyId) {
          const newParty = await c.query(
            `INSERT INTO parties (tenant_id, full_name, phone, email, custom_fields)
             VALUES ($1, $2, $3, $4, '{}'::jsonb)
             RETURNING id`,
            [user.tenantId, fullName, phone, email],
          );
          partyId = newParty.rows[0].id;
        } else {
          // Keep party full_name / email updated if missing
          await c.query(
            `UPDATE parties
             SET full_name = COALESCE(full_name, $2),
                 phone = COALESCE(phone, $3),
                 email = COALESCE(email, $4)
             WHERE id = $1`,
            [partyId, fullName, phone, email],
          );
        }

        // Check if guest profile exists for this party in this tenant
        const existingGuest = await c.query(
          `SELECT id FROM guests WHERE party_id = $1 LIMIT 1`,
          [partyId],
        );

        if (existingGuest.rows.length > 0) {
          await c.query(
            `UPDATE guests
             SET
               nationality = COALESCE($2, nationality),
               id_type = COALESCE($3, id_type),
               vip = CASE WHEN $4::boolean THEN true ELSE vip END,
               notes = COALESCE($5, notes),
               id_number_ciphertext = COALESCE($6, id_number_ciphertext),
               id_number_iv = COALESCE($7, id_number_iv),
               id_number_auth_tag = COALESCE($8, id_number_auth_tag)
             WHERE id = $1`,
            [
              existingGuest.rows[0].id,
              nationality,
              idType,
              vip,
              notes,
              identity?.ciphertext ?? null,
              identity?.iv ?? null,
              identity?.authTag ?? null,
            ],
          );
          updated++;
        } else {
          await c.query(
            `INSERT INTO guests (
               tenant_id,
               party_id,
               nationality,
               id_type,
               id_number,
               id_number_ciphertext,
               id_number_iv,
               id_number_auth_tag,
               vip,
               notes
             )
             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9)`,
            [
              user.tenantId,
              partyId,
              nationality,
              idType,
              identity?.ciphertext ?? null,
              identity?.iv ?? null,
              identity?.authTag ?? null,
              vip,
              notes,
            ],
          );
          created++;
        }
      }

      await this.audit.log(c, {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'guest.bulk_import',
        entity: 'guest',
        meta: { total: body.guests.length, created, updated },
      });

      return {
        message: `Successfully processed ${created + updated} guest profiles (${created} new, ${updated} updated).`,
        created,
        updated,
        total: created + updated,
      };
    });
  }
}
