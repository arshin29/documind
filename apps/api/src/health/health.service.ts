import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  check() {
    return {
      status: "ok",
      service: "DocuMind API",
      version: "0.1.0",
      environment: process.env.NODE_ENV || "development",
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
