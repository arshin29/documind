import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express, Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './setup';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');

let cachedServer: Express;

/**
 * Bootstrap and cache the Express + NestJS application instance.
 * Reuses warm instances across Vercel serverless function invocations
 * to prevent repeated Nest module initialization and maintain pooled Prisma connections.
 */
export async function bootstrapServer(): Promise<Express> {
  if (!cachedServer) {
    const expressApp: Express = express();
    const adapter = new ExpressAdapter(expressApp);

    const app = await NestFactory.create(AppModule, adapter, {
      logger:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn', 'log']
          : ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Apply shared pipes, filters, CORS, and prefix configuration
    configureApp(app);

    // Root status handler to confirm service is alive when visiting base domain
    expressApp.get('/', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'DocuMind API (Vercel Serverless)',
        version: '0.1.0',
        health: '/api/health',
      });
    });

    await app.init();
    cachedServer = expressApp;
  }

  return cachedServer;
}

/**
 * Default Vercel Serverless Function handler.
 */
export default async function handler(req: Request, res: Response) {
  const server = await bootstrapServer();
  return server(req, res);
}
