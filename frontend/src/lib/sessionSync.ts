import { io, Socket } from "socket.io-client";
import { api, serverBase } from "./api";
import type { Session } from "../types/session";

export type RealtimeRole = "teacher" | "student" | "projector" | "dashboard";

export interface PresenceCounts {
  teachers: number;
  students: number;
  projectors: number;
  dashboards: number;
  total: number;
}

export async function loadCurrentSession(): Promise<Session | null> {
  const res = await api.get<Session | null>("/session");
  return res.data || null;
}

export function createRealtimeSocket(role: RealtimeRole): Socket {
  return io(`${serverBase}/teacher`, {
    auth: { role },
    query: { role },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 10000,
    transports: ["websocket", "polling"],
  });
}

export function subscribeToSessionChanges(
  role: RealtimeRole,
  onSessionChanged: (session: Session | null) => void,
  onConnectionError?: () => void,
): () => void {
  const socket = createRealtimeSocket(role);

  socket.on("connect", () => {
    loadCurrentSession()
      .then(onSessionChanged)
      .catch(() => onConnectionError?.());
  });

  socket.on("sessionChanged", (session: Session | null) => {
    onSessionChanged(session || null);
  });

  if (onConnectionError) {
    socket.on("connect_error", onConnectionError);
  }

  return () => socket.disconnect();
}

export function subscribeToPresence(
  role: RealtimeRole,
  onPresenceChanged: (presence: PresenceCounts) => void,
  onConnectionStateChanged?: (isConnected: boolean) => void,
): () => void {
  const socket = createRealtimeSocket(role);

  socket.on("connect", () => onConnectionStateChanged?.(true));
  socket.on("disconnect", () => onConnectionStateChanged?.(false));
  socket.on("connect_error", () => onConnectionStateChanged?.(false));
  socket.on("presenceChanged", (presence: PresenceCounts) => {
    onPresenceChanged(presence);
  });

  return () => socket.disconnect();
}
