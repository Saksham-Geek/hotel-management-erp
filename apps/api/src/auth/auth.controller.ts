import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { changePasswordSchema, loginSchema, requestEmailChangeSchema, requestPasswordResetSchema, resetPasswordSchema, updateOwnProfileSchema, verifyEmailChangeSchema, type ChangePasswordInput, type RequestEmailChangeInput, type RequestPasswordResetInput, type ResetPasswordInput, type UpdateOwnProfileInput } from '@erp/shared';
import { z } from 'zod';
import { AuthUser, CurrentUser } from '../common/current-user';
import { ZodPipe } from '../common/zod.pipe';
import { AuthService } from './auth.service';
import { Public } from './public';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body(new ZodPipe(loginSchema)) body: { tenant: string; email: string; password: string }) {
    return this.auth.login(body.tenant, body.email, body.password);
  }

  @Post('select-property')
  selectProperty(@CurrentUser() user: AuthUser, @Body(new ZodPipe(z.object({ propertyId: z.string().uuid() }))) body: { propertyId: string }) {
    return this.auth.selectProperty(user.id, user.tenantId, body.propertyId);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id, user.tenantId, user.propertyId);
  }

  @Patch('me')
  updateMyProfile(@CurrentUser() user: AuthUser, @Body(new ZodPipe(updateOwnProfileSchema)) body: UpdateOwnProfileInput) {
    return this.auth.updateOwnProfile(user.id, user.tenantId, user.propertyId, body);
  }

  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  @Post('me/email-change')
  requestMyEmailChange(@CurrentUser() user: AuthUser, @Body(new ZodPipe(requestEmailChangeSchema)) body: RequestEmailChangeInput) {
    return this.auth.requestEmailChange(user.id, user.tenantId, user.propertyId, body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @HttpCode(200)
  @Post('verify-email-change')
  verifyEmailChange(@Body(new ZodPipe(verifyEmailChangeSchema)) body: { token: string }) {
    return this.auth.verifyEmailChange(body.token);
  }

  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  @Patch('me/password')
  changeMyPassword(@CurrentUser() user: AuthUser, @Body(new ZodPipe(changePasswordSchema)) body: ChangePasswordInput) {
    return this.auth.changeOwnPassword(user.id, user.tenantId, user.propertyId, body);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  @HttpCode(200)
  @Post('password-reset-request')
  requestPasswordReset(@Body(new ZodPipe(requestPasswordResetSchema)) body: RequestPasswordResetInput) {
    return this.auth.requestPasswordReset(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @HttpCode(200)
  @Post('password-reset')
  resetPassword(@Body(new ZodPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    return this.auth.resetPassword(body);
  }
}
