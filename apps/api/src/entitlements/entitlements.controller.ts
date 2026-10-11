import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../common/current-user';
import { EntitlementsService } from './entitlements.service';

@Controller('entitlements')
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.entitlements.resolve(user.tenantId, user.propertyId);
  }
}
