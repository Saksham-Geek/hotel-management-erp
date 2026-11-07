import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '56mb' });
  app.use(compression({ threshold: 1024 })); // compress payloads > 1KB with gzip/deflate
  app.use(helmet());
  app.getHttpAdapter().getInstance().set('trust proxy', 1); // behind Caddy / Cloudflare: real client IPs for rate limiting
  app.enableShutdownHooks();

  const server = await app.listen(env.port, '0.0.0.0');
  // Configure high-performance HTTP socket reuse for reverse proxy / Next.js
  const httpServer = app.getHttpServer();
  if (httpServer) {
    httpServer.keepAliveTimeout = 65_000;
    httpServer.headersTimeout = 66_000;
  }

  new Logger('API').log(`Listening on :${env.port}`);
}
bootstrap();
