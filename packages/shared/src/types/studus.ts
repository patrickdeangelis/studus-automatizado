export interface StudusSession {
  cookies: any[];
  userId: number;
  lastActive: Date;
}

export interface Discipline {
  id: string; // Studus ID seems to be string based on XPaths potentially, or internal ID
  code: string;
  name: string;
  class: string; // Turma
}
