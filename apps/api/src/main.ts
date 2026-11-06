import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { configureApp } from "./setup";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const apiPrefix = configService.get<string>("API_PREFIX", "api");

  await app.listen(port);
  logger.log(
    `🚀 DocuMind API server running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(
    `🩺 Health check available at: http://localhost:${port}/${apiPrefix}/health`,
  );
}

bootstrap();
