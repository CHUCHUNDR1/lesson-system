import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionInfo } from './session.types';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response, Request } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { getDataDir } from '../storage';
import { PresenceCounts, RealtimeGateway } from '../realtime/realtime.gateway';

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

@Controller()
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Post('teacher/session')
  createSession(
    @Body('title') title: string,
  ): Promise<SessionInfo> {
    const safeTitle = title && title.trim().length > 0 ? title.trim() : 'Lesson';
    return this.sessionService.createSession(safeTitle).then((session) => {
      this.realtimeGateway.emitSessionChanged(session);
      return session;
    });
  }

  @Get('session')
  getSession(): SessionInfo | null {
    return this.sessionService.getCurrentSession();
  }

  @Get('presence')
  getPresence(): PresenceCounts {
    return this.realtimeGateway.getPresence();
  }

  @Post('teacher/assignment-text')
  setAssignmentText(
    @Body('text') text: string | undefined,
  ): SessionInfo {
    const raw = typeof text === 'string' ? text : '';
    const safe = raw.length > 100_000 ? raw.slice(0, 100_000) : raw;
    const session = this.sessionService.setAssignmentText(safe);
    this.realtimeGateway.emitSessionChanged(session);
    return session;
  }

  @Post('teacher/assignment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
          const baseDir = getDataDir('assignment');
          ensureDir(baseDir);
          cb(null, baseDir);
        },
        filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          cb(null, file.originalname);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024,
      },
    }),
  )
  uploadAssignment(
    @UploadedFile() file: Express.Multer.File,
  ): { ok: boolean; fileName: string } {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }
    this.sessionService.setAssignmentFileName(file.originalname);
    this.realtimeGateway.emitSessionChanged(
      this.sessionService.getCurrentSession(),
    );
    return { ok: true, fileName: file.originalname };
  }

  @Get('assignment')
  downloadAssignment(@Res() res: Response) {
    const session = this.sessionService.getCurrentSession();
    if (!session || !session.assignmentFileName) {
      throw new HttpException('Assignment not uploaded', HttpStatus.NOT_FOUND);
    }
    const filePath = join(
      getDataDir('assignment'),
      session.assignmentFileName,
    );
    if (!existsSync(filePath)) {
      throw new HttpException('Assignment file not found', HttpStatus.NOT_FOUND);
    }

    return res.download(filePath, session.assignmentFileName);
  }
}
