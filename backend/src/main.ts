import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const corsOrigins = new Set<string>();
  const configured = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  for (const o of configured) corsOrigins.add(o);
  if (process.env.NODE_ENV !== 'production') {
    corsOrigins.add('http://localhost:3000');
    corsOrigins.add('http://localhost:3001');
  }
  app.enableCors({
    origin: [...corsOrigins],
    credentials: true,
  });
  // Lets nest start --watch release port 4000 on reload (avoids EADDRINUSE).
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

bootstrap();
