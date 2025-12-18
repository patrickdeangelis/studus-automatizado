export type TaskType = 'LOGIN' | 'SYNC_DISCIPLINES' | 'UPDATE_FREQUENCY';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface TaskPayload {
  username?: string;
  password?: string;
  disciplineId?: string;
  // Add other payload properties as needed
}

export interface TaskResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: any;
}

export interface Task {
  id: number;
  type: TaskType;
  status: TaskStatus;
  payload: TaskPayload;
  result?: TaskResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskLog {
  id: number;
  taskId: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  screenshotPath?: string;
  timestamp: Date;
}
