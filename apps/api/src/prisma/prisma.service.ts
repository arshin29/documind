import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Connected to PostgreSQL database successfully.");
    } catch (error) {
      this.logger.warn(
        `Could not connect to PostgreSQL database: ${(error as Error).message}. Ensure PostgreSQL is running when performing database operations.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
