import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.useBodyParser('json', { limit: '56mb' });
  app.use(helmet());
  app.getHttpAdapter().getInstance().set('trust proxy', 1); // behind Caddy / Cloudflare: real client IPs for rate limiting
  app.enableShutdownHooks();
  await app.listen(env.port);
  new Logger('API').log(`Listening on :${env.port}`);
}
bootstrap();
