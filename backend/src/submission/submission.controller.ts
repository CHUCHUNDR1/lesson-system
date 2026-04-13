import {
  Controller,
  Get,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Res,
  Param,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { SubmissionInfo } from './submission.types';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { basename } from 'path';
import { existsSync } from 'fs';
import type { Request, Response } from 'express';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import archiver from 'archiver';
import { ensureDir, resolveDataPath } from '../runtime-paths';

@Controller()
export class SubmissionController {
  constructor(
    private readonly submissionService: SubmissionService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Post('submit')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
          const baseDir = ensureDir(resolveDataPath('submissions', 'current'));
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
  async submit(
    @Body('studentName') studentName: string,
    @Body('group') group: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SubmissionInfo> {
    if (!file) {
      throw new HttpException('File is required', HttpStatus.BAD_REQUEST);
    }
    if (!studentName || !group) {
      throw new HttpException(
        'studentName and group are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const submission = await this.submissionService.createSubmission({
      studentName: studentName.trim(),
      group: group.trim(),
      file,
    });

    this.realtimeGateway.emitNewSubmission(submission);
    return submission;
  }

  @Get('teacher/submissions')
  listSubmissions(): Promise<SubmissionInfo[]> {
    return this.submissionService.listSubmissionsForCurrentSession();
  }

  @Get('teacher/submissions/:id/download')
  async downloadOne(@Param('id') id: string, @Res() res: Response) {
    const submission = await this.submissionService.findById(id);
    if (!submission) {
      throw new HttpException('Submission not found', HttpStatus.NOT_FOUND);
    }
    if (!existsSync(submission.storedPath)) {
      throw new HttpException(
        'Submission file missing on disk',
        HttpStatus.NOT_FOUND,
      );
    }
    const name = submission.originalFilename || basename(submission.storedPath);
    return res.download(submission.storedPath, name);
  }

  @Get('teacher/download-all')
  async downloadAllZip(@Res() res: Response) {
    const submissions =
      await this.submissionService.listSubmissionsForCurrentSession();
    if (!submissions.length) {
      throw new HttpException('No submissions yet', HttpStatus.BAD_REQUEST);
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="submissions.zip"',
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err: Error) => {
      throw err;
    });
    archive.pipe(res);

    for (const s of submissions) {
      if (existsSync(s.storedPath)) {
        const entryName = `${s.group}_${s.studentName}_${s.originalFilename}`;
        archive.file(s.storedPath, { name: entryName });
      }
    }

    await archive.finalize();
  }
}
