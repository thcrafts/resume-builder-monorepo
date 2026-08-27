import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getCorsOptions } from './config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  app.enableCors(getCorsOptions());

  const port = process.env.PORT ?? '3001';
  const server = await app.listen(port);
  console.log(`Server is running on port ${port}`);
  server.timeout = 120000; // 2 minutes
  server.keepAliveTimeout = 120000;
}
bootstrap();
