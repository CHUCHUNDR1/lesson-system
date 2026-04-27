import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import type { Request, Response, NextFunction } from 'express';

function findFrontendDir(): string | null {
  const candidates = [
    process.env.LESSON_FRONTEND_DIR,
    join(__dirname, '..', 'public'),
    join(__dirname, '..', '..', 'frontend', 'dist'),
  ].filter(Boolean) as string[];

  return (
    candidates.find((dir) => existsSync(join(dir, 'index.html'))) ?? null
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const frontendDir = findFrontendDir();

  if (frontendDir) {
    app.useStaticAssets(frontendDir);

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req: Request, res: Response, next: NextFunction) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/socket.io') ||
        req.method !== 'GET' ||
        Boolean(extname(req.path))
      ) {
        next();
        return;
      }

      res.sendFile(join(frontendDir, 'index.html'));
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const host = process.env.HOST;
  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
  // eslint-disable-next-line no-console
  console.log(
    `Lesson-system backend is running on http://${host ?? 'localhost'}:${port}`,
  );
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend', err);
});
