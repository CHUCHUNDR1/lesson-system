import { Injectable } from '@nestjs/common';
import { SubmissionInfo } from './submission.types';
import { SessionService } from '../session/session.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmissionEntity } from './submission.entity';

@Injectable()
export class SubmissionService {
  constructor(
    private readonly sessionService: SessionService,
    @InjectRepository(SubmissionEntity)
    private readonly repo: Repository<SubmissionEntity>,
  ) {}

  async createSubmission(params: {
    studentName: string;
    group: string;
    file: Express.Multer.File;
  }): Promise<SubmissionInfo> {
    const session = this.sessionService.getCurrentSession();
    if (!session) {
      throw new Error('Session not created');
    }

    const entity = this.repo.create({
      sessionId: session.id,
      studentName: params.studentName,
      group: params.group,
      originalFilename: params.file.originalname,
      storedPath: params.file.path,
    });
    const created = await this.repo.save(entity);

    const submission: SubmissionInfo = {
      id: created.id,
      sessionId: created.sessionId,
      studentName: created.studentName,
      group: created.group,
      originalFilename: created.originalFilename,
      storedPath: created.storedPath,
      uploadedAt: created.createdAt.toISOString(),
    };

    return submission;
  }

  async listSubmissionsForCurrentSession(): Promise<SubmissionInfo[]> {
    const session = this.sessionService.getCurrentSession();
    if (!session) {
      return [];
    }
    const rows = await this.repo.find({
      where: { sessionId: session.id },
      order: { createdAt: 'ASC' },
    });
    return rows.map<SubmissionInfo>((s) => ({
      id: s.id,
      sessionId: s.sessionId,
      studentName: s.studentName,
      group: s.group,
      originalFilename: s.originalFilename,
      storedPath: s.storedPath,
      uploadedAt: s.createdAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<SubmissionInfo | undefined> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) return undefined;
    return {
      id: s.id,
      sessionId: s.sessionId,
      studentName: s.studentName,
      group: s.group,
      originalFilename: s.originalFilename,
      storedPath: s.storedPath,
      uploadedAt: s.createdAt.toISOString(),
    };
  }
}

