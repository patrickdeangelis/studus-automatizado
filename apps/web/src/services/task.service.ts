/**
 * Task Service
 * Centraliza a lógica de gerenciamento de tarefas
 */
import React from 'react';
import { apiClient } from './api-client';

export interface Task {
  id: number;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  payload?: any;
  result?: any;
  progress: number;
  performance?: {
    login?: number;
    scrape?: number;
    total?: number;
  };
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  running: number;
  successRate: number;
}

export interface CreateTaskOptions {
  type: 'SYNC_DISCIPLINES' | 'LOGIN' | 'UPDATE_FREQUENCY';
  payload?: any;
}

class TaskService {
  private listeners: ((tasks: Task[]) => void)[] = [];
  private tasks: Task[] = [];
  private pollingInterval?: NodeJS.Timeout;

  constructor() {
    this.startPolling();
  }

  /**
   * Inicia o polling para atualizar as tarefas
   */
  private startPolling() {
    this.pollingInterval = setInterval(() => {
      this.fetchTasks();
    }, 5000); // Poll a cada 5 segundos
  }

  /**
   * Para o polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  /**
   * Notifica todos os listeners sobre mudanças
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.tasks]));
  }

  /**
   * Inscreve um listener para mudanças na lista de tarefas
   */
  subscribe(listener: (tasks: Task[]) => void) {
    this.listeners.push(listener);
    listener([...this.tasks]);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Busca todas as tarefas
   */
  async fetchTasks(): Promise<Task[]> {
    try {
      const response = await apiClient.getTasks();

      if (response.success && response.data?.tasks) {
        this.tasks = response.data.tasks;
        this.notifyListeners();
        return this.tasks;
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      return [];
    }
  }

  /**
   * Obtém as tarefas atuais
   */
  getTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Cria uma nova tarefa
   */
  async createTask(options: CreateTaskOptions): Promise<Task> {
    try {
      const response = await apiClient.createTask(options.type, options.payload);

      if (response.success && response.data) {
        // Adicionar a nova tarefa à lista
        const newTask = response.data;
        this.tasks.unshift(newTask);
        this.notifyListeners();
        return newTask;
      }

      throw new Error(response.message || 'Erro ao criar tarefa');
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      throw error;
    }
  }

  /**
   * Inicia uma sincronização
   */
  async startSync(): Promise<void> {
    // Verificar se já existe uma tarefa em execução
    const runningTask = this.tasks.find(t => t.status === 'RUNNING');
    if (runningTask) {
      throw new Error('Já existe uma tarefa em execução. Aguarde a conclusão.');
    }

    await this.createTask({ type: 'SYNC_DISCIPLINES' });
  }

  /**
   * Calcula estatísticas das tarefas
   */
  getStats(): TaskStats {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.status === 'COMPLETED').length;
    const failed = this.tasks.filter(t => t.status === 'FAILED').length;
    const running = this.tasks.filter(t => t.status === 'RUNNING').length;
    const pending = this.tasks.filter(t => t.status === 'PENDING').length;

    return {
      total,
      completed,
      failed,
      pending,
      running,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * Obtém uma tarefa pelo ID
   */
  getTaskById(id: number): Task | undefined {
    return this.tasks.find(t => t.id === id);
  }

  /**
   * Verifica se existe uma tarefa em execução
   */
  hasRunningTask(): boolean {
    return this.tasks.some(t => t.status === 'RUNNING' || t.status === 'PENDING');
  }

  /**
   * Formata o status da tarefa para exibição
   */
  formatStatus(status: Task['status']): { label: string; color: 'default' | 'success' | 'warning' | 'destructive' } {
    switch (status) {
      case 'COMPLETED':
        return { label: 'Concluída', color: 'success' };
      case 'FAILED':
        return { label: 'Falhou', color: 'destructive' };
      case 'RUNNING':
        return { label: 'Executando', color: 'warning' };
      case 'PENDING':
        return { label: 'Aguardando', color: 'default' };
      default:
        return { label: status, color: 'default' };
    }
  }

  /**
   * Formata o tipo da tarefa para exibição
   */
  formatType(type: string): string {
    switch (type) {
      case 'SYNC_DISCIPLINES':
        return 'Sincronizar Disciplinas';
      case 'LOGIN':
        return 'Login';
      case 'UPDATE_FREQUENCY':
        return 'Atualizar Frequência';
      default:
        return type.replace(/_/g, ' ');
    }
  }

  /**
   * Formata a duração da tarefa
   */
  formatDuration(task: Task): string {
    if (!task.startedAt) return '-';

    const start = new Date(task.startedAt);
    const end = task.completedAt ? new Date(task.completedAt) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.round(duration / 60)}m`;
    return `${Math.round(duration / 3600)}h`;
  }
}

// Singleton instance
export const taskService = new TaskService();

/**
 * Hook para usar o serviço de tarefas
 */
export function useTasks() {
  const [tasks, setTasks] = React.useState<Task[]>(taskService.getTasks());

  React.useEffect(() => {
    // Inscrever para mudanças
    const unsubscribe = taskService.subscribe(setTasks);

    // Buscar tarefas iniciais
    taskService.fetchTasks();

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    tasks,
    stats: taskService.getStats(),
    fetchTasks: taskService.fetchTasks.bind(taskService),
    createTask: taskService.createTask.bind(taskService),
    startSync: taskService.startSync.bind(taskService),
    hasRunningTask: taskService.hasRunningTask(),
    formatStatus: taskService.formatStatus.bind(taskService),
    formatType: taskService.formatType.bind(taskService),
    formatDuration: taskService.formatDuration.bind(taskService),
  };
}