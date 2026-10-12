import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import type { MeDto } from '@erp/shared';
import type { UpdateOwnProfileInput } from '@erp/shared';
import type { RequestEmailChangeInput } from '@erp/shared';
import type { ChangePasswordInput, RequestPasswordResetInput, ResetPasswordInput } from '@erp/shared';
import { DbService } from '../db/db.service';
import { AuditService } from '../audit/audit.service';
import { env } from '../config';
import { createEmailChangeToken, emailVerificationUrl, hashEmailChangeToken } from './email-verification';

// Compared against when the account is unknown, so response time does not reveal whether it exists.
const DUMMY_HASH = hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(private readonly db: DbService, private readonly jwt: JwtService, private readonly audit: AuditService) {}

  async login(tenantSlug: string, email: string, password: string) {
    const fail = () => new UnauthorizedException({ code: 'BAD_CREDENTIALS', message: 'Check the hotel code, email and password' });

    const tenant = (await this.db.query(`select id, status from tenants where slug = $1`, [tenantSlug.toLowerCase()])).rows[0];
    if (!tenant || tenant.status !== 'active') {
      await compare(password, DUMMY_HASH);
      throw fail();
    }

    const member = await this.db.withTenant(tenant.id, null, async (c) => (
      await c.query(
        `select u.id, u.password_hash, u.auth_version, pu.role, p.id as property_id
         from users u
         join property_users pu on pu.tenant_id = u.tenant_id and pu.user_id = u.id
         join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where u.email = $1 and u.is_active and p.status = 'active'
         order by p.is_default desc, p.created_at asc limit 1`,
        [email.toLowerCase()],
      )
    ).rows[0]);

    const ok = await compare(password, member?.password_hash ?? DUMMY_HASH);
    if (!member || !ok) throw fail();
    return { token: await this.issueToken(member.id, tenant.id, member.property_id, member.auth_version) };
  }

  async selectProperty(userId: string, tenantId: string, propertyId: string) {
    const member = await this.db.withTenant(tenantId, propertyId, async (c) => (
      await c.query(
        `select pu.role, u.auth_version from property_users pu
         join users u on u.tenant_id = pu.tenant_id and u.id = pu.user_id
         join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where pu.user_id = $1 and pu.property_id = $2 and u.is_active and p.status = 'active'`,
        [userId, propertyId],
      )
    ).rows[0]);
    if (!member) throw new UnauthorizedException({ code: 'PROPERTY_ACCESS_DENIED', message: 'You do not have access to that property' });
    return { token: await this.issueToken(userId, tenantId, propertyId, member.auth_version) };
  }

  async me(userId: string, tenantId: string, propertyId: string): Promise<MeDto> {
    return this.db.withTenant(tenantId, propertyId, async (c) => {
      const row = (await c.query(
        `select u.id, u.email, u.full_name, u.phone, pu.role, t.id as tid, t.slug, t.name, t.vertical, t.currency,
                p.id as property_id, p.name as property_name, p.timezone as property_timezone, p.currency as property_currency
         from users u
         join tenants t on t.id = u.tenant_id
         join property_users pu on pu.tenant_id = u.tenant_id and pu.user_id = u.id and pu.property_id = $2
         join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where u.id = $1 and u.is_active`,
        [userId, propertyId],
      )).rows[0];
      if (!row) throw new UnauthorizedException({ code: 'BAD_TOKEN', message: 'Your session has expired. Sign in again' });

      const properties = (await c.query(
        `select p.id, p.name, pu.role
         from property_users pu join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where pu.user_id = $1 and p.status = 'active' order by p.is_default desc, p.name`,
        [userId],
      )).rows;

      return {
        id: row.id, email: row.email, fullName: row.full_name, phone: row.phone, role: row.role,
        tenant: { id: row.tid, slug: row.slug, name: row.name, vertical: row.vertical, currency: row.currency },
        property: { id: row.property_id, name: row.property_name, timezone: row.property_timezone, currency: row.property_currency },
        properties,
      };
    });
  }

  async updateOwnProfile(userId: string, tenantId: string, propertyId: string, profile: UpdateOwnProfileInput) {
    return this.db.withTenant(tenantId, propertyId, async (c) => {
      const result = await c.query(
        `update users set full_name = $3, phone = $4
         where id = $1 and tenant_id = $2 and is_active
         returning id, email, full_name as "fullName", phone`,
        [userId, tenantId, profile.fullName, profile.phone ?? null],
      );
      const row = result.rows[0];
      if (!row) throw new UnauthorizedException({ code: 'BAD_TOKEN', message: 'Your session has expired. Sign in again' });
      await this.audit.log(c, {
        tenantId,
        userId,
        action: 'user.profile.update',
        entity: 'user',
        entityId: userId,
        meta: { fields: ['fullName', 'phone'] },
      });
      return row;
    });
  }

  async requestEmailChange(userId: string, tenantId: string, propertyId: string, input: RequestEmailChangeInput) {
    if (!env.resendApiKey || !env.emailFrom) {
      throw new ServiceUnavailableException({ code: 'EMAIL_NOT_CONFIGURED', message: 'Email verification is not configured. Set RESEND_API_KEY and EMAIL_FROM on the API, then try again.' });
    }

    const { token, tokenHash } = createEmailChangeToken();
    const account = await this.db.withTenant(tenantId, propertyId, async (c) => {
      const user = (await c.query(
        `select email, password_hash, full_name from users where tenant_id = $1 and id = $2 and is_active`,
        [tenantId, userId],
      )).rows[0];
      if (!user || !(await compare(input.currentPassword, user.password_hash))) {
        throw new UnauthorizedException({ code: 'CURRENT_PASSWORD_INVALID', message: 'Your current password is incorrect.' });
      }
      if (user.email.toLowerCase() === input.newEmail) {
        throw new BadRequestException({ code: 'EMAIL_UNCHANGED', message: 'Enter a different email address.' });
      }

      await c.query('select pg_advisory_xact_lock(hashtext($1))', [`${tenantId}:${input.newEmail}`]);
      const existing = (await c.query(
        `select 1 from users where tenant_id = $1 and lower(email) = $2 and id <> $3 limit 1`,
        [tenantId, input.newEmail, userId],
      )).rowCount;
      if (existing) throw new ConflictException({ code: 'EMAIL_IN_USE', message: 'That email is already used by another account in this hotel.' });

      await c.query('select pg_advisory_xact_lock(hashtext($1))', [`email-change-user:${tenantId}:${userId}`]);
      await c.query(`delete from user_email_change_tokens where tenant_id = $1 and user_id = $2`, [tenantId, userId]);
      await c.query(
        `insert into user_email_change_tokens (token_hash, tenant_id, user_id, new_email, expires_at)
         values ($1, $2, $3, $4, now() + interval '30 minutes')`,
        [tokenHash, tenantId, userId, input.newEmail],
      );
      await this.audit.log(c, {
        tenantId,
        userId,
        action: 'user.email.change_requested',
        entity: 'user',
        entityId: userId,
        meta: { field: 'email' },
      });
      return { fullName: user.full_name };
    });

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${env.resendApiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: env.emailFrom,
          to: [input.newEmail],
          subject: 'Verify your new hotel account email',
          html: `<p>Hello ${escapeHtml(account.fullName)},</p><p>Confirm this address to use it to sign in to your hotel account. This link expires in 30 minutes.</p><p><a href="${escapeHtml(emailVerificationUrl(env.appBaseUrl, token))}">Verify email address</a></p><p>If you did not request this change, you can ignore this email. Your sign-in email will remain unchanged.</p>`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Email provider returned status ${response.status}`);
    } catch {
      await this.db.query(`delete from user_email_change_tokens where token_hash = $1`, [tokenHash]).catch(() => undefined);
      throw new ServiceUnavailableException({ code: 'EMAIL_DELIVERY_FAILED', message: 'We could not send the verification email. Check the email service configuration and try again.' });
    }

    return { message: `Verification link sent to ${input.newEmail}. Your sign-in email changes only after you verify it.` };
  }

  async verifyEmailChange(token: string) {
    const tokenHash = hashEmailChangeToken(token);
    const challenge = (await this.db.query<{
      tenant_id: string; user_id: string; new_email: string;
    }>(`select tenant_id, user_id, new_email from user_email_change_tokens where token_hash = $1`, [tokenHash])).rows[0];
    if (!challenge) throw invalidEmailToken();

    return this.db.withTenant(challenge.tenant_id, null, async (c) => {
      const current = (await c.query(
        `select new_email, expires_at, consumed_at from user_email_change_tokens where token_hash = $1 for update`,
        [tokenHash],
      )).rows[0];
      if (!current || current.consumed_at || new Date(current.expires_at).getTime() <= Date.now()) throw invalidEmailToken();

      await c.query('select pg_advisory_xact_lock(hashtext($1))', [`${challenge.tenant_id}:${current.new_email}`]);
      const conflict = (await c.query(
        `select 1 from users where tenant_id = $1 and lower(email) = lower($2) and id <> $3 limit 1`,
        [challenge.tenant_id, current.new_email, challenge.user_id],
      )).rowCount;
      if (conflict) throw new ConflictException({ code: 'EMAIL_IN_USE', message: 'That email is now used by another account. Request a new verification link.' });

      const propertyId = (await c.query(
        `select pu.property_id from property_users pu join properties p on p.tenant_id = pu.tenant_id and p.id = pu.property_id
         where pu.tenant_id = $1 and pu.user_id = $2 and p.status = 'active'
         order by p.is_default desc, p.created_at asc limit 1`,
        [challenge.tenant_id, challenge.user_id],
      )).rows[0]?.property_id;
      if (!propertyId) throw invalidEmailToken();

      const updated = await c.query(
        `update users set email = lower($3) where tenant_id = $1 and id = $2 and is_active returning id`,
        [challenge.tenant_id, challenge.user_id, current.new_email],
      );
      if (!updated.rowCount) throw invalidEmailToken();
      await c.query(`update user_email_change_tokens set consumed_at = now() where token_hash = $1`, [tokenHash]);
      await c.query(`delete from user_email_change_tokens where tenant_id = $1 and user_id = $2 and token_hash <> $3`, [challenge.tenant_id, challenge.user_id, tokenHash]);
      await this.audit.log(c, {
        tenantId: challenge.tenant_id,
        userId: challenge.user_id,
        action: 'user.email.verify',
        entity: 'user',
        entityId: challenge.user_id,
        meta: { field: 'email', propertyId },
      });
      return { message: 'Email address verified. You can now sign in with your new email address.' };
    });
  }

  async changeOwnPassword(userId: string, tenantId: string, propertyId: string, input: ChangePasswordInput) {
    return this.db.withTenant(tenantId, propertyId, async (c) => {
      const user = (await c.query(
        `select password_hash from users where tenant_id = $1 and id = $2 and is_active for update`,
        [tenantId, userId],
      )).rows[0];
      if (!user || !(await compare(input.currentPassword, user.password_hash))) {
        throw new UnauthorizedException({ code: 'CURRENT_PASSWORD_INVALID', message: 'Your current password is incorrect.' });
      }
      if (await compare(input.newPassword, user.password_hash)) {
        throw new BadRequestException({ code: 'PASSWORD_UNCHANGED', message: 'Choose a password you have not used for this account.' });
      }
      const passwordHash = await hash(input.newPassword, 12);
      await c.query(
        `update users set password_hash = $3, auth_version = auth_version + 1 where tenant_id = $1 and id = $2`,
        [tenantId, userId, passwordHash],
      );
      await c.query(`delete from user_password_reset_tokens where tenant_id = $1 and user_id = $2`, [tenantId, userId]);
      await this.audit.log(c, {
        tenantId,
        userId,
        action: 'user.password.change',
        entity: 'user',
        entityId: userId,
        meta: { sessionsRevoked: true },
      });
      return { message: 'Password changed. Sign in again with your new password.' };
    });
  }

  async requestPasswordReset(input: RequestPasswordResetInput) {
    if (!env.resendApiKey || !env.emailFrom) {
      throw new ServiceUnavailableException({ code: 'EMAIL_NOT_CONFIGURED', message: 'Password recovery email is not configured. Contact your hotel administrator.' });
    }
    const tenant = (await this.db.query(`select id from tenants where slug = $1 and status = 'active'`, [input.tenant.toLowerCase()])).rows[0];
    if (!tenant) return { message: 'If an active account matches those details, a password reset link will be sent.' };

    const { token, tokenHash } = createEmailChangeToken();
    const account = await this.db.withTenant(tenant.id, null, async (c) => {
      const user = (await c.query(
        `select id, email, full_name from users where tenant_id = $1 and lower(email) = $2 and is_active limit 1`,
        [tenant.id, input.email],
      )).rows[0];
      if (!user) return null;
      await c.query('select pg_advisory_xact_lock(hashtext($1))', [`password-reset-user:${tenant.id}:${user.id}`]);
      await c.query(`delete from user_password_reset_tokens where tenant_id = $1 and user_id = $2`, [tenant.id, user.id]);
      await c.query(
        `insert into user_password_reset_tokens (token_hash, tenant_id, user_id, expires_at)
         values ($1, $2, $3, now() + interval '30 minutes')`,
        [tokenHash, tenant.id, user.id],
      );
      await this.audit.log(c, { tenantId: tenant.id, userId: user.id, action: 'user.password.reset_requested', entity: 'user', entityId: user.id, meta: {} });
      return { id: user.id, email: user.email, fullName: user.full_name };
    });

    if (account) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${env.resendApiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            from: env.emailFrom,
            to: [account.email],
            subject: 'Reset your hotel account password',
            html: `<p>Hello ${escapeHtml(account.fullName)},</p><p>Use the secure link below to reset your hotel account password. It expires in 30 minutes. If you did not request this, you can ignore this email.</p><p><a href="${escapeHtml(passwordResetUrl(env.appBaseUrl, token))}">Reset password</a></p>`,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`Email provider returned status ${response.status}`);
      } catch {
        await this.db.query(`delete from user_password_reset_tokens where token_hash = $1`, [tokenHash]).catch(() => undefined);
        throw new ServiceUnavailableException({ code: 'EMAIL_DELIVERY_FAILED', message: 'We could not send a reset email. Try again later or contact your hotel administrator.' });
      }
    }
    return { message: 'If an active account matches those details, a password reset link will be sent.' };
  }

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashEmailChangeToken(input.token);
    const challenge = (await this.db.query<{ tenant_id: string; user_id: string }>(
      `select tenant_id, user_id from user_password_reset_tokens where token_hash = $1`, [tokenHash],
    )).rows[0];
    if (!challenge) throw invalidPasswordToken();

    const newHash = await hash(input.newPassword, 12);
    return this.db.withTenant(challenge.tenant_id, null, async (c) => {
      const current = (await c.query(
        `select expires_at, consumed_at from user_password_reset_tokens where token_hash = $1 for update`, [tokenHash],
      )).rows[0];
      if (!current || current.consumed_at || new Date(current.expires_at).getTime() <= Date.now()) throw invalidPasswordToken();
      const user = (await c.query(`select id from users where tenant_id = $1 and id = $2 and is_active`, [challenge.tenant_id, challenge.user_id])).rows[0];
      if (!user) throw invalidPasswordToken();
      await c.query(
        `update users set password_hash = $3, auth_version = auth_version + 1 where tenant_id = $1 and id = $2`,
        [challenge.tenant_id, challenge.user_id, newHash],
      );
      await c.query(`update user_password_reset_tokens set consumed_at = now() where token_hash = $1`, [tokenHash]);
      await c.query(`delete from user_password_reset_tokens where tenant_id = $1 and user_id = $2 and token_hash <> $3`, [challenge.tenant_id, challenge.user_id, tokenHash]);
      await this.audit.log(c, {
        tenantId: challenge.tenant_id,
        userId: challenge.user_id,
        action: 'user.password.reset',
        entity: 'user',
        entityId: challenge.user_id,
        meta: { sessionsRevoked: true },
      });
      return { message: 'Password reset. Sign in with your new password.' };
    });
  }

  private issueToken(userId: string, tenantId: string, propertyId: string, authVersion: number) {
    return this.jwt.signAsync({ sub: userId, tid: tenantId, pid: propertyId, ver: authVersion });
  }
}

function invalidEmailToken() {
  return new BadRequestException({ code: 'EMAIL_LINK_INVALID', message: 'This verification link is invalid, expired, or already used. Request a new one.' });
}

function invalidPasswordToken() {
  return new BadRequestException({ code: 'PASSWORD_RESET_LINK_INVALID', message: 'This password reset link is invalid, expired, or already used. Request a new one.' });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function passwordResetUrl(baseUrl: string, token: string) {
  const url = new URL('/reset-password', baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}
