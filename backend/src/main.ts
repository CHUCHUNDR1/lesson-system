import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync } from 'fs';

type BootstrapOptions = {
  host?: string;
  port?: number;
};

export async function bootstrap(options: BootstrapOptions = {}) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const publicDir = join(__dirname, '..', 'public');
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir);
  }

  const webDist = process.env.LESSON_SYSTEM_WEB_DIST;
  const webIndex = webDist ? join(webDist, 'index.html') : null;
  if (webDist && webIndex && existsSync(webIndex)) {
    app.useStaticAssets(webDist);
    const expressApp = app.getHttpAdapter().getInstance();
    const spaRoutes = ['/', '/teacher', '/student', '/ord'];

    for (const route of spaRoutes) {
      expressApp.get(route, (_req: unknown, res: { sendFile: (path: string) => void }) => {
        res.sendFile(webIndex);
      });
    }
  }

  const host = options.host ?? process.env.HOST ?? '0.0.0.0';
  const requestedPort = options.port ?? (process.env.PORT ? Number(process.env.PORT) : 3000);
  await app.listen(requestedPort, host);
  const address = app.getHttpServer().address();
  const port =
    typeof address === 'object' && address ? Number(address.port) : requestedPort;
  // eslint-disable-next-line no-console
  console.log(`Lesson-system backend is running on http://localhost:${port}`);

  return { app, port };
}

if (require.main === module) {
  bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start backend', err);
  });
}
