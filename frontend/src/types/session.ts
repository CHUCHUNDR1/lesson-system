export interface Session {
  id: string;
  title: string;
  createdAt: string;
  expiresAt: string | null;
  joinCode: string;
  assignmentFileName: string | null;
  assignmentText: string | null;
}
