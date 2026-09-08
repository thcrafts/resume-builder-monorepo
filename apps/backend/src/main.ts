import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOptions } from './config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  app.enableCors(getCorsOptions());

  const port = process.env.PORT ?? '3001';
  // Bind all interfaces so Vite can reach Nest via LAN IP when Cursor steals 127.0.0.1:3001.
  const host = process.env.HOST ?? '0.0.0.0';
  const server = await app.listen(port, host);
  console.log(`Server is running on http://${host}:${port}`);
  server.timeout = 120000; // 2 minutes
  server.keepAliveTimeout = 120000;
}
bootstrap();
