import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { SessionModule } from '../session/session.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { SubmissionEntity } from './submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubmissionEntity]), SessionModule, RealtimeModule],
  providers: [SubmissionService],
  controllers: [SubmissionController],
})
export class SubmissionModule {}

