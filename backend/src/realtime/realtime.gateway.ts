import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SubmissionInfo } from '../submission/submission.types';
import { SessionInfo } from '../session/session.types';

type PresenceRole = 'teacher' | 'student' | 'projector' | 'dashboard' | 'unknown';

export interface PresenceCounts {
  teachers: number;
  students: number;
  projectors: number;
  dashboards: number;
  total: number;
}

@WebSocketGateway({
  namespace: '/teacher',
  cors: {
    origin: true,
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 25000,
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly rolesBySocketId = new Map<string, PresenceRole>();

  handleConnection(socket: Socket) {
    this.rolesBySocketId.set(socket.id, this.getRole(socket));
    socket.emit('presenceChanged', this.getPresence());
    this.emitPresenceChanged();
  }

  handleDisconnect(socket: Socket) {
    this.rolesBySocketId.delete(socket.id);
    this.emitPresenceChanged();
  }

  emitNewSubmission(submission: SubmissionInfo) {
    this.server.emit('submissionCreated', submission);
  }

  emitSessionChanged(session: SessionInfo | null) {
    this.server.emit('sessionChanged', session);
  }

  emitPresenceChanged() {
    this.server.emit('presenceChanged', this.getPresence());
  }

  getPresence(): PresenceCounts {
    const counts = {
      teachers: 0,
      students: 0,
      projectors: 0,
      dashboards: 0,
      total: 0,
    };

    for (const role of this.rolesBySocketId.values()) {
      if (role === 'teacher') counts.teachers += 1;
      if (role === 'student') counts.students += 1;
      if (role === 'projector') counts.projectors += 1;
      if (role === 'dashboard') counts.dashboards += 1;
      if (role !== 'dashboard') counts.total += 1;
    }

    return counts;
  }

  private getRole(socket: Socket): PresenceRole {
    const raw =
      socket.handshake.auth?.role ??
      socket.handshake.query?.role ??
      'unknown';
    const role = Array.isArray(raw) ? raw[0] : String(raw);

    if (
      role === 'teacher' ||
      role === 'student' ||
      role === 'projector' ||
      role === 'dashboard'
    ) {
      return role;
    }

    return 'unknown';
  }

}
