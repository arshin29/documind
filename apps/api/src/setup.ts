import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Configure shared NestJS application options, middleware, filters, and CORS.
 * Shared between standalone HTTP server (main.ts) and Vercel serverless function (serverless.ts).
 */
export function configureApp(app: INestApplication): void {
  // Handle BigInt serialization safely across JSON responses
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  const frontendUrl = configService.get<string>('FRONTEND_URL', '');

  // Set global API route prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);

      const isDev = configService.get<string>('NODE_ENV') !== 'production';

      // Allow localhost and local LAN IPs in development
      if (
        isDev &&
        (origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://192.168.'))
      ) {
        return callback(null, true);
      }

      // Allow configured FRONTEND_URL (exact or trimmed trailing slash)
      if (
        frontendUrl &&
        (origin === frontendUrl || origin === frontendUrl.replace(/\/$/, ''))
      ) {
        return callback(null, true);
      }

      // Allow additional custom origins defined in ALLOWED_ORIGINS (comma-separated)
      const allowedOrigins = (configService.get<string>('ALLOWED_ORIGINS') || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview and production deployments for frontend (*.vercel.app)
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Enable global validation pipe for request DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter for standardized error responses
  app.useGlobalFilters(new HttpExceptionFilter());
}
