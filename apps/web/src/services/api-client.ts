/**
 * API Client Service
 * Centraliza todas as chamadas à API
 */
import { toast } from '@/hooks/use-toast';

const API_BASE_URL = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('studus_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Se não autorizado, limpar token e redirecionar
      if (response.status === 401) {
        localStorage.removeItem('studus_token');
        localStorage.removeItem('studus_user');
        window.location.href = '/login';
        throw new Error('Sessão expirada');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST',
    });
  }

  // Tasks endpoints
  async getTasks() {
    return this.request<{ tasks: any[] }>('/tasks');
  }

  async createTask(type: string, payload?: any) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ type, payload }),
    });
  }

  async getTaskStats() {
    return this.request('/tasks/stats/performance');
  }

  // Disciplines endpoints
  async getDisciplines() {
    return this.request<{ disciplines: any[] }>('/disciplines');
  }

  async getDisciplineDetails(id: string) {
    return this.request(`/disciplines/${id}`);
  }

  async getDisciplineGrades(id: string) {
    return this.request(`/disciplines/${id}/grades`);
  }

  async getDisciplineLessons(id: string) {
    return this.request(`/disciplines/${id}/lessons`);
  }

  async getDisciplineAttendance(id: string) {
    return this.request(`/disciplines/${id}/attendance`);
  }

  // Settings endpoints
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
  }
}

// Singleton instance
export const apiClient = new ApiClient();

/**
 * Hook para usar o API client com tratamento de erro automático
 */
export function useApi() {
  const handleError = (error: any, fallbackMessage = 'Ocorreu um erro') => {
    console.error('API Error:', error);
    toast({
      title: 'Erro',
      description: error.message || fallbackMessage,
      variant: 'destructive',
    });
  };

  return {
    api: apiClient,
    handleError,
  };
}