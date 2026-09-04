import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { RateLimit } from './guards/rate-limit.guard';

/**
 * Spec reference: Section 6 (Authentication), Section 36 (API Design).
 *
 * Registration is intentionally absent for MVP - spec Section 6:
 * "Registration: retailer/admin-created accounts for MVP (self-service
 * signup is [FUTURE] pending KYC/compliance review)." Users are created
 * via an administration endpoint (Phase 2+, not yet built) rather than a
 * public self-registration flow.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit({ name: 'login', limit: 10, windowSeconds: 60 })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.tenantSlug, dto.email, dto.password, {
      ip: req.ip,
    });
  }

  @Public()
  @RateLimit({ name: 'refresh', limit: 30, windowSeconds: 60 })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
