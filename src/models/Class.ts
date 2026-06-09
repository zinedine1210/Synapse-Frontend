export interface Session {
  id: string;
  classId: string;
  title: string;
  sequence: number;
  createdAt: string;
  _count?: {
    materials: number;
    quizzes: number;
  };
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  lecturer?: string;
  day?: string;
  time?: string;
  room?: string;
  password?: string;
  code?: string;
  joinMode?: string;
  autoRoleAssign?: boolean;
  createdAt: string;
  memberRole?: 'OWNER' | 'ADMIN' | 'MEMBER';
  memberStatus?: string;
  classRoleId?: string;
  classRole?: { id: string; name: string; permissions: string[]; isDefault: boolean };
  permissions?: string[];
  sessions?: Session[];
  _count?: {
    sessions: number;
    members: number;
  };
}
