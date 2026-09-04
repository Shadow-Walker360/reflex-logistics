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
import { SignupDto } from './dto/signup.dto';
import { Public } from './decorators/public.decorator';
import { RateLimit } from './guards/rate-limit.guard';

/**
 * Spec reference: Section 6 (Authentication), Section 36 (API Design).
 *
 * ADR-012: self-service organization signup (POST /auth/signup) was added,
 * overriding the original spec's "admin-created accounts only" MVP scope,
 * per explicit product direction. This also closes the "no way to create a
 * User through the API" gap flagged throughout Phase 2 (progress.md).
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  // Tighter than login's limit - signup is more expensive (password hash +
  // a multi-row transaction) and more attractive to abuse (spam
  // organizations, disposable accounts) than a login attempt.
  @RateLimit({ name: 'signup', limit: 5, windowSeconds: 3600 })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: SignupDto, @Req() req: Request) {
    return this.authService.signup(
      dto.organizationName,
      dto.tenantSlug,
      dto.email,
      dto.password,
      { ip: req.ip },
    );
  }

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
