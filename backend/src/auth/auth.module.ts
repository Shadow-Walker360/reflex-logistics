import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Spec reference: Section 6/7 - authentication and authorization are
 * enforced server-side, globally, by default. JwtAuthGuard, RolesGuard, and
 * RateLimitGuard are registered as APP_GUARD providers here so every route
 * in the application goes through them unless explicitly opted out
 * (@Public()) or the route declares no @Roles()/@RateLimit() metadata.
 *
 * Guard execution order matches array order: JwtAuthGuard runs first
 * (populates request.user), then RolesGuard (reads request.user.role),
 * then RateLimitGuard (independent of auth state, but ordered last here
 * since it's the least specific check).
 */
@Module({
  imports: [
    PassportModule,
    UsersModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.accessSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
