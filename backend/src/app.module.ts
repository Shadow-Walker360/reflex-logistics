import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { LegalModule } from './legal/legal.module';
import { CustomersModule } from './customers/customers.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { RidersModule } from './riders/riders.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AdministrationModule } from './administration/administration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        genReqId: (req: any) => req.id,
        // Section 40 / 41: never log secrets or credentials. Redact known
        // sensitive header/body paths at the transport-log level as a
        // backstop in addition to application-level scrubbing.
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.passwordHash',
            'req.body.token',
            'req.body.refreshToken',
          ],
          censor: '[REDACTED]',
        },
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuditModule,
    UsersModule,
    AuthModule,
    LegalModule,
    CustomersModule,
    DeliveriesModule,
    RidersModule,
    VehiclesModule,
    DispatchModule,
    IncidentsModule,
    AdministrationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
