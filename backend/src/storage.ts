import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export function getDataDir(...segments: string[]): string {
  const baseDir = process.env.LESSON_DATA_DIR ?? join(process.cwd(), 'data');
  if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
  }
  return segments.length ? join(baseDir, ...segments) : baseDir;
}
