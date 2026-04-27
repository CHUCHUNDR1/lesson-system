import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionInfo } from './session.types';
import { SessionEntity } from './session.entity';

@Injectable()
export class SessionService {
  private currentSession: SessionInfo | null = null;

  constructor(
    @InjectRepository(SessionEntity)
    private readonly repo: Repository<SessionEntity>,
  ) {}

  async createSession(title: string): Promise<SessionInfo> {
    const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    const entity = this.repo.create({
      title,
      joinCode,
    });

    const saved = await this.repo.save(entity);
    this.currentSession = {
      id: saved.id,
      title: saved.title,
      createdAt: saved.createdAt.toISOString(),
      expiresAt: saved.expiresAt ? saved.expiresAt.toISOString() : null,
      joinCode: saved.joinCode,
      assignmentFileName: saved.assignmentFileName,
      assignmentText: saved.assignmentText ?? null,
    };

    return this.currentSession;
  }

  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  setAssignmentFileName(fileName: string): void {
    if (!this.currentSession) {
      throw new Error('Session not created');
    }
    this.currentSession.assignmentFileName = fileName;
    void this.repo.update(
      { id: this.currentSession.id },
      { assignmentFileName: fileName },
    );
  }

  setAssignmentText(text: string | null): SessionInfo {
    if (!this.currentSession) {
      throw new Error('Session not created');
    }
    const trimmed = text && text.trim().length > 0 ? text.trim() : null;
    this.currentSession.assignmentText = trimmed;
    void this.repo.update(
      { id: this.currentSession.id },
      { assignmentText: trimmed },
    );
    return this.currentSession;
  }
}
