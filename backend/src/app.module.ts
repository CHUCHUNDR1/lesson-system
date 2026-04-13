import { Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { SessionModule } from './session/session.module';
import { SubmissionModule } from './submission/submission.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SessionEntity } from './session/session.entity';
import { SubmissionEntity } from './submission/submission.entity';
import { ensureDir, getDataRoot } from './runtime-paths';

function createDatabaseConfig(): TypeOrmModuleOptions {
  if (process.env.LESSON_SYSTEM_DB_DRIVER === 'sqljs') {
    const dataDir = ensureDir(getDataRoot());

    return {
      type: 'sqljs',
      location: join(dataDir, 'lesson-system.sqlite'),
      autoSave: true,
      entities: [SessionEntity, SubmissionEntity],
      synchronize: true,
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'lesson',
    password: process.env.DB_PASSWORD ?? 'lesson',
    database: process.env.DB_NAME ?? 'lesson',
    entities: [SessionEntity, SubmissionEntity],
    synchronize: true,
  };
}

@Module({
  imports: [
    TypeOrmModule.forRoot(createDatabaseConfig()),
    SessionModule,
    SubmissionModule,
    RealtimeModule,
  ],
})
export class AppModule {}
