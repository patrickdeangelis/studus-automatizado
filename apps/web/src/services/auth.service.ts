/**
 * Authentication Service
 * Centraliza toda a lógica de autenticação
 */
import React from 'react';
import { apiClient } from './api-client';

export interface User {
  id: number;
  username: string;
  studusUsername?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

class AuthService {
  private listeners: ((state: AuthState) => void)[] = [];
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
  };

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Inicializa o estado a partir do localStorage
   */
  private initializeFromStorage() {
    const token = localStorage.getItem('studus_token');
    const userStr = localStorage.getItem('studus_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.setState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao parsear usuário do storage:', error);
        this.clearStorage();
      }
    }
  }

  /**
   * Atualiza o estado e notifica os listeners
   */
  private setState(newState: Partial<AuthState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  /**
   * Notifica todos os listeners sobre mudanças no estado
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Inscreve um listener para mudanças no estado de autenticação
   */
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    listener({ ...this.state }); // Envia estado atual imediatamente

    // Retorna função de unsubscribe
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Obtém o estado atual
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Login do usuário
   */
  async login(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    this.setState({ loading: true });

    try {
      const response = await apiClient.login(username, password);

      if (response.success && response.data) {
        const { token, user } = response.data;

        // Salvar no localStorage
        localStorage.setItem('studus_token', token);
        localStorage.setItem('studus_user', JSON.stringify(user));

        // Atualizar estado
        this.setState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
        });

        return { success: true };
      } else {
        this.setState({ loading: false });
        return { success: false, message: response.message || 'Credenciais inválidas' };
      }
    } catch (error: any) {
      this.setState({ loading: false });
      return { success: false, message: error.message || 'Erro ao fazer login' };
    }
  }

  /**
   * Logout do usuário
   */
  logout() {
    this.clearStorage();
    this.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });
  }

  /**
   * Limpa os dados do localStorage
   */
  private clearStorage() {
    localStorage.removeItem('studus_token');
    localStorage.removeItem('studus_user');
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated && !!this.state.token;
  }

  /**
   * Obtém o token atual
   */
  getToken(): string | null {
    return this.state.token;
  }

  /**
   * Obtém o usuário atual
   */
  getUser(): User | null {
    return this.state.user;
  }

  /**
   * Verifica se está carregando
   */
  isLoading(): boolean {
    return this.state.loading;
  }
}

// Singleton instance
export const authService = new AuthService();

/**
 * Hook para usar o serviço de autenticação
 */
export function useAuth() {
  const [state, setState] = React.useState<AuthState>(authService.getState());

  React.useEffect(() => {
    // Inscrever para mudanças no estado
    const unsubscribe = authService.subscribe(setState);

    return unsubscribe;
  }, []);

  return {
    ...state,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService),
  };
}