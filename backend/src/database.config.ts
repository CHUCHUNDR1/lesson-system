import { DataSourceOptions } from 'typeorm';
import { SessionEntity } from './session/session.entity';
import { SubmissionEntity } from './submission/submission.entity';
import { getDataDir } from './storage';

export function getDatabaseConfig(): DataSourceOptions {
  if ((process.env.DB_TYPE ?? '').toLowerCase() === 'sqljs') {
    return {
      type: 'sqljs',
      autoSave: true,
      location: getDataDir('lesson-system.sqlite'),
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
