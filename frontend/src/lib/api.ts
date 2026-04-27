import axios from 'axios';

export interface DiscoveredLessonServer {
  id: string;
  name: string;
  url: string;
  urls: string[];
  hasSession: boolean;
  sessionTitle: string | null;
  lastSeen: number;
}

declare global {
  interface Window {
    lessonSystem?: {
      apiUrl?: string;
      getDiscoveredServers?: () => Promise<DiscoveredLessonServer[]>;
      isDesktop?: boolean;
      lanUrls?: string[];
      onDiscoveredServersChanged?: (
        callback: (servers: DiscoveredLessonServer[]) => void,
      ) => () => void;
      platform?: string;
      serverUrl?: string;
    };
  }
}

const serverStorageKey = 'lesson-system.server-base';
const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

export function normalizeServerBase(value: string): string {
  let raw = value.trim();
  if (!raw) return '';
  if (!/^https?:\/\//i.test(raw)) {
    raw = `http://${raw}`;
  }
  raw = raw.replace(/\/api\/?$/i, '');

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' && !parsed.port) {
      parsed.port = '3000';
    }
    parsed.pathname = parsed.pathname.replace(/\/$/, '');
    parsed.search = '';
    parsed.hash = '';
    return trimTrailingSlash(parsed.toString());
  } catch {
    return trimTrailingSlash(raw);
  }
}

function readStoredServerBase(): string {
  try {
    return localStorage.getItem(serverStorageKey) || '';
  } catch {
    return '';
  }
}

export function hasStoredServerBase(): boolean {
  try {
    return Boolean(localStorage.getItem(serverStorageKey));
  } catch {
    return false;
  }
}

function getSameOriginApiBase(): string {
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3000/api';
}

export const defaultServerBase =
  (window.lessonSystem?.serverUrl &&
    normalizeServerBase(window.lessonSystem.serverUrl)) ||
  (import.meta.env.VITE_API_URL &&
    normalizeServerBase(import.meta.env.VITE_API_URL)) ||
  normalizeServerBase(getSameOriginApiBase());

export const serverBase =
  normalizeServerBase(readStoredServerBase()) || defaultServerBase;

const apiBase =
  (window.lessonSystem?.apiUrl &&
    trimTrailingSlash(window.lessonSystem.apiUrl)) ||
  `${serverBase}/api`;

export const backendUrl = (path: string) => `${serverBase}${path}`;

export const lanUrls = window.lessonSystem?.lanUrls ?? [];

export async function fetchServerSession<TSession>(
  base: string,
): Promise<TSession | null> {
  const normalized = normalizeServerBase(base);
  if (!normalized) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1200);

  try {
    const res = await fetch(`${normalized}/api/session`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const raw = await res.text();
    return raw ? (JSON.parse(raw) as TSession | null) : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function setServerBase(value: string): void {
  const normalized = normalizeServerBase(value);
  if (!normalized) return;
  localStorage.setItem(serverStorageKey, normalized);
}

export function resetServerBase(): void {
  localStorage.removeItem(serverStorageKey);
}

export const api = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});
