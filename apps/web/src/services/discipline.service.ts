/**
 * Discipline Service
 * Centraliza a lógica de gerenciamento de disciplinas
 */
import React from 'react';
import { apiClient } from './api-client';

export interface Discipline {
  id: string;
  code?: string;
  name: string;
  class?: string;
  schedule?: string;
  lastSyncAt?: string;
}

export interface Student {
  id: string;
  name: string;
}

export interface Grade {
  id: number;
  studentId: string;
  disciplineId: string;
  n1?: string;
  n2?: string;
  n3?: string;
  faults?: string;
  average?: string;
  situation?: string;
  updatedAt: string;
  student?: Student;
}

export interface Lesson {
  id: string;
  disciplineId: string;
  date: string;
  content?: string;
  topic?: string;
}

export interface Attendance {
  id: number;
  lessonId: string;
  studentId: string;
  present: boolean;
  updatedAt: string;
  student?: Student;
}

class DisciplineService {
  private disciplines: Discipline[] = [];
  private currentDiscipline: Discipline | null = null;
  private listeners: {
    disciplines: ((disciplines: Discipline[]) => void)[];
    current: ((discipline: Discipline | null) => void)[];
  } = {
    disciplines: [],
    current: [],
  };

  constructor() {}

  /**
   * Notifica listeners de disciplinas
   */
  private notifyDisciplineListeners() {
    this.listeners.disciplines.forEach(listener => listener([...this.disciplines]));
  }

  /**
   * Notifica listeners da disciplina atual
   */
  private notifyCurrentListeners() {
    this.listeners.current.forEach(listener => listener(this.currentDiscipline));
  }

  /**
   * Inscreve listener para mudanças na lista de disciplinas
   */
  subscribeToDisciplines(listener: (disciplines: Discipline[]) => void) {
    this.listeners.disciplines.push(listener);
    listener([...this.disciplines]);

    return () => {
      const index = this.listeners.disciplines.indexOf(listener);
      if (index > -1) {
        this.listeners.disciplines.splice(index, 1);
      }
    };
  }

  /**
   * Inscreve listener para mudanças na disciplina atual
   */
  subscribeToCurrent(listener: (discipline: Discipline | null) => void) {
    this.listeners.current.push(listener);
    listener(this.currentDiscipline);

    return () => {
      const index = this.listeners.current.indexOf(listener);
      if (index > -1) {
        this.listeners.current.splice(index, 1);
      }
    };
  }

  /**
   * Busca todas as disciplinas
   */
  async fetchDisciplines(): Promise<Discipline[]> {
    try {
      const response = await apiClient.getDisciplines();

      if (response.success && response.data?.disciplines) {
        this.disciplines = response.data.disciplines;
        this.notifyDisciplineListeners();
        return this.disciplines;
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
      return [];
    }
  }

  /**
   * Obtém as disciplinas atuais
   */
  getDisciplines(): Discipline[] {
    return [...this.disciplines];
  }

  /**
   * Define a disciplina atual
   */
  setCurrentDiscipline(discipline: Discipline | null) {
    this.currentDiscipline = discipline;
    this.notifyCurrentListeners();
  }

  /**
   * Obtém a disciplina atual
   */
  getCurrentDiscipline(): Discipline | null {
    return this.currentDiscipline;
  }

  /**
   * Busca uma disciplina pelo ID
   */
  async fetchDisciplineDetails(id: string): Promise<Discipline | null> {
    try {
      const response = await apiClient.getDisciplineDetails(id);

      if (response.success && response.data) {
        const discipline = response.data;

        // Atualizar na lista se existir
        const index = this.disciplines.findIndex(d => d.id === id);
        if (index > -1) {
          this.disciplines[index] = discipline;
          this.notifyDisciplineListeners();
        }

        return discipline;
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar detalhes da disciplina:', error);
      return null;
    }
  }

  /**
   * Busca notas de uma disciplina
   */
  async fetchGrades(disciplineId: string): Promise<Grade[]> {
    try {
      const response = await apiClient.getDisciplineGrades(disciplineId);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      return [];
    }
  }

  /**
   * Busca aulas de uma disciplina
   */
  async fetchLessons(disciplineId: string): Promise<Lesson[]> {
    try {
      const response = await apiClient.getDisciplineLessons(disciplineId);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar aulas:', error);
      return [];
    }
  }

  /**
   * Busca frequências de uma disciplina
   */
  async fetchAttendance(disciplineId: string): Promise<Attendance[]> {
    try {
      const response = await apiClient.getDisciplineAttendance(disciplineId);

      if (response.success && response.data) {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error('Erro ao buscar frequências:', error);
      return [];
    }
  }

  /**
   * Formata o código da turma
   */
  formatClassCode(discipline: Discipline): string {
    if (discipline.code) return discipline.code;
    if (discipline.class) return discipline.class;
    return discipline.id;
  }

  /**
   * Calcula estatísticas da disciplina
   */
  getDisciplineStats(discipline: Discipline): {
    totalStudents?: number;
    averageGrade?: number;
    attendanceRate?: number;
    lastSyncStatus: 'synced' | 'pending' | 'never';
  } {
    const now = new Date();
    const lastSync = discipline.lastSyncAt ? new Date(discipline.lastSyncAt) : null;

    // Considera "recente" se sincronizado há menos de 24h
    const isRecent = lastSync && (now.getTime() - lastSync.getTime()) < 24 * 60 * 60 * 1000;

    return {
      lastSyncStatus: lastSync ? (isRecent ? 'synced' : 'pending') : 'never',
    };
  }

  /**
   * Ordena disciplinas por nome
   */
  sortDisciplines(disciplines: Discipline[]): Discipline[] {
    return [...disciplines].sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Filtra disciplinas por termo de busca
   */
  filterDisciplines(disciplines: Discipline[], query: string): Discipline[] {
    if (!query) return disciplines;

    const lowerQuery = query.toLowerCase();
    return disciplines.filter(d =>
      d.name.toLowerCase().includes(lowerQuery) ||
      d.code?.toLowerCase().includes(lowerQuery) ||
      d.class?.toLowerCase().includes(lowerQuery)
    );
  }
}

// Singleton instance
export const disciplineService = new DisciplineService();

/**
 * Hook para usar o serviço de disciplinas
 */
export function useDisciplines() {
  const [disciplines, setDisciplines] = React.useState<Discipline[]>([]);

  React.useEffect(() => {
    const unsubscribe = disciplineService.subscribeToDisciplines(setDisciplines);
    disciplineService.fetchDisciplines();

    return unsubscribe;
  }, []);

  return {
    disciplines,
    fetchDisciplines: disciplineService.fetchDisciplines.bind(disciplineService),
    fetchDisciplineDetails: disciplineService.fetchDisciplineDetails.bind(disciplineService),
    setCurrentDiscipline: disciplineService.setCurrentDiscipline.bind(disciplineService),
    formatClassCode: disciplineService.formatClassCode.bind(disciplineService),
    getDisciplineStats: disciplineService.getDisciplineStats.bind(disciplineService),
    sortDisciplines: disciplineService.sortDisciplines.bind(disciplineService),
    filterDisciplines: disciplineService.filterDisciplines.bind(disciplineService),
  };
}

/**
 * Hook para usar a disciplina atual
 */
export function useCurrentDiscipline() {
  const [discipline, setDiscipline] = React.useState<Discipline | null>(null);

  React.useEffect(() => {
    const unsubscribe = disciplineService.subscribeToCurrent(setDiscipline);
    return unsubscribe;
  }, []);

  return {
    discipline,
    setCurrentDiscipline: disciplineService.setCurrentDiscipline.bind(disciplineService),
    fetchGrades: disciplineService.fetchGrades.bind(disciplineService),
    fetchLessons: disciplineService.fetchLessons.bind(disciplineService),
    fetchAttendance: disciplineService.fetchAttendance.bind(disciplineService),
  };
}