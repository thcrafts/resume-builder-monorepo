import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  // Reflect request Origin in local/dev so `vite --host` (LAN IP) works.
  // Set FRONTEND_URL to a comma-separated allowlist in production.
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: configuredOrigins.length > 0 ? configuredOrigins : true,
    credentials: true,
  });

  const port = process.env.PORT ?? '3001';
  const server = await app.listen(port);
  console.log(`Server is running on port ${port}`);
  server.timeout = 120000; // 2 minutes
  server.keepAliveTimeout = 120000;
}
bootstrap();
