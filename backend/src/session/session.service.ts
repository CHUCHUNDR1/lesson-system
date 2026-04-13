import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionInfo } from './session.types';
import { SessionEntity } from './session.entity';

@Injectable()
export class SessionService implements OnModuleInit {
  private currentSession: SessionInfo | null = null;

  constructor(
    @InjectRepository(SessionEntity)
    private readonly repo: Repository<SessionEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    const [latestSession] = await this.repo.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });

    this.currentSession = latestSession ? this.toSessionInfo(latestSession) : null;
  }

  async createSession(title: string): Promise<SessionInfo> {
    const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();

    const entity = this.repo.create({
      title,
      joinCode,
    });

    const saved = await this.repo.save(entity);

    this.currentSession = this.toSessionInfo(saved);
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

  private toSessionInfo(session: SessionEntity): SessionInfo {
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt ? session.expiresAt.toISOString() : null,
      joinCode: session.joinCode,
      assignmentFileName: session.assignmentFileName,
      assignmentText: session.assignmentText ?? null,
    };
  }
}
