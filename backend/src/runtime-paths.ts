import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export function ensureDir(dir: string): string {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export function getDataRoot(): string {
  const configuredDir = process.env.LESSON_SYSTEM_DATA_DIR?.trim();

  if (configuredDir) {
    return ensureDir(configuredDir);
  }

  return ensureDir(join(process.cwd(), 'data'));
}

export function resolveDataPath(...parts: string[]): string {
  return join(getDataRoot(), ...parts);
}
