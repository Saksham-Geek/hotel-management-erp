import {
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
  createGuestSchema,
} from '@erp/shared';

import { AuditService } from '../audit/audit.service';
import { AuthUser, CurrentUser } from '../common/current-user';
import { ZodPipe } from '../common/zod.pipe';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { encryptSensitiveField } from '../common/field-encryption';
import { Roles } from '../common/roles';
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
  @Roles('owner', 'manager', 'frontdesk')
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
           g.nationality,
           g.notes,
           p.custom_fields AS "customFields",
           (
             SELECT json_agg(
               json_build_object(
                 'id', d.id,
                 'fileName', d.original_name,
                 'mimeType', d.mime_type,
                 'createdAt', d.created_at
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

      return result.rows;
    });
  }

  @Patch(':id')
  @Roles('owner', 'manager', 'frontdesk')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const schema = createGuestSchema.partial();
    const parsed = schema.safeParse(body);

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
  @Roles('owner', 'manager', 'frontdesk')
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
}