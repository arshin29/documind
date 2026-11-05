import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

// Handle BigInt serialization safely across JSON responses
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const apiPrefix = configService.get<string>("API_PREFIX", "api");
  const frontendUrl = configService.get<string>(
    "FRONTEND_URL",
    "http://localhost:3000",
  );

  // Set global API route prefix
  app.setGlobalPrefix(apiPrefix);

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: [frontendUrl, "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

  await app.listen(port);
  logger.log(
    `🚀 DocuMind API server running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(
    `🩺 Health check available at: http://localhost:${port}/${apiPrefix}/health`,
  );
}

bootstrap();
