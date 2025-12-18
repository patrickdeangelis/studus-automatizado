/**
 * Services Index
 * Centraliza a exportação de todos os serviços
 */

// API Client
export { apiClient, useApi } from './api-client';
export type { ApiResponse } from './api-client';

// Auth Service
export { authService, useAuth } from './auth.service';
export type { User, AuthState } from './auth.service';

// Task Service
export { taskService, useTasks } from './task.service';
export type { Task, TaskStats, CreateTaskOptions } from './task.service';

// Discipline Service
export { disciplineService, useDisciplines, useCurrentDiscipline } from './discipline.service';
export type {
  Discipline,
  Student,
  Grade,
  Lesson,
  Attendance
} from './discipline.service';