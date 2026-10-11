import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { loginSchema } from '@erp/shared';
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
}
