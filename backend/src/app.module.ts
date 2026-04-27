import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionModule } from './session/session.module';
import { SubmissionModule } from './submission/submission.module';
import { RealtimeModule } from './realtime/realtime.module';
import { getDatabaseConfig } from './database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    SessionModule,
    SubmissionModule,
    RealtimeModule,
  ],
})
export class AppModule {}
