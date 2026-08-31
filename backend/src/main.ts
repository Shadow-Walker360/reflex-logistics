import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * Application bootstrap.
 *
 * Spec reference: Section 47 (Deployment) and Section 27 (Error Handling).
 * Everything wired here is Phase 1 (Foundation): validation, error envelope,
 * versioning, Swagger, CORS. Nothing domain-specific lives in this file.
 */
async function bootstrap(): Promise<void> {
  // Typed as NestExpressApplication (not the generic INestApplication)
  // specifically so `.set('trust proxy', ...)` below - an Express-specific
  // method - is available and type-checks correctly.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const apiPrefix = config.get<string>('apiPrefix') || 'api/v1';
  const port = config.get<number>('port') || 3000;

  // Security fix (post-Phase-2 audit): honors X-Forwarded-For / real client
  // IP correctly ONLY when explicitly running behind a trusted reverse
  // proxy/load balancer (spec Section 47 topology), via TRUST_PROXY. When
  // false (the safe default - e.g. local dev, or any deployment exposing
  // the Node process directly), Express computes req.ip from the raw
  // socket only, so a client cannot spoof X-Forwarded-For to obtain a
  // fresh rate-limit bucket per request (see RateLimitGuard, which reads
  // req.ip rather than parsing X-Forwarded-For itself specifically so this
  // one setting governs both).
  app.set('trust proxy', config.get<boolean>('trustProxy') ? 1 : false);

  // Section 37: API versioning - all routes live under /api/v1 from day one.
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Section 35: input validation - every DTO is validated server-side
  // regardless of what the client already checked; unknown fields are
  // rejected outright rather than silently stripped-and-ignored, which
  // helps catch client/server contract drift early.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Section 27: every error response, regardless of origin, goes through
  // the same envelope.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Security fix (post-Phase-2 audit): the previous config paired a
  // wildcard-by-default `origin` with `credentials: true`. That combination
  // is invalid per the CORS spec - browsers refuse credentialed
  // cross-origin requests against `Access-Control-Allow-Origin: *` - so it
  // was a broken no-op at best. It's also unnecessary: this API is
  // entirely bearer-token authenticated (Authorization header, never
  // cookies), so there is no cross-origin credential (cookie) to protect in
  // the first place. `credentials: true` is dropped rather than "fixed" to
  // require a non-wildcard origin, since nothing in this API depends on it.
  app.enableCors({
    origin: config.get<string>('cors.origin'),
  });

  // Section 38: OpenAPI is the source of truth for the frontend contract.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Reflex Logistics API')
    .setDescription(
      'Backend API for Reflex Logistics. See /docs in the repository for ' +
        'the full engineering specification this API implements.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  Logger.log(
    `Reflex backend listening on port ${port} (prefix: ${apiPrefix})`,
    'Bootstrap',
  );
  Logger.log(`Swagger UI available at /api/docs`, 'Bootstrap');
}

bootstrap();
