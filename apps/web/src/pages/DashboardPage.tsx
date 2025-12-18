import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, XCircle, BookOpen, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTasks, useDisciplines } from '@/services';

export default function DashboardPage() {
  const { toast } = useToast();
  const { stats, startSync, hasRunningTask } = useTasks();
  const { disciplines, fetchDisciplines } = useDisciplines();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await startSync();
      toast({
        title: 'Sincronização iniciada!',
        description: 'As disciplinas estão sendo sincronizadas com o Studus.',
      });
      fetchDisciplines(); // Atualizar disciplinas
    } catch (error: any) {
      toast({
        title: 'Erro ao sincronizar',
        description: error.message || 'Não foi possível iniciar a sincronização.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Buscar disciplinas ao carregar
  useEffect(() => {
    fetchDisciplines();
  }, []);

  const loading = false; // Serviços já gerenciam o estado de loading

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
          <p className="mt-2 text-gray-600">Acompanhe o status das suas sincronizações</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Todas as tarefas executadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? `${stats.successRate}% de sucesso`
                  : 'Nenhuma tarefa'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending + stats.running}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pending + stats.running > 0 ? 'Em execução ou aguardando' : 'Nenhuma pendente'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disciplinas</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{disciplines.length}</div>
              <p className="text-xs text-muted-foreground">
                Turmas sincronizadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Execute operações comuns no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={handleSync}
                disabled={isSyncing || hasRunningTask}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </Button>

              <Button variant="outline" asChild>
                <Link to="/disciplines" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Ver Turmas
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link to="/tasks" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Histórico
                </Link>
              </Button>

              {stats.failed > 0 && (
                <Badge variant="destructive" className="flex items-center gap-2">
                  <XCircle className="h-3 w-3" />
                  {stats.failed} falha(s)
                </Badge>
              )}

              {(stats.pending + stats.running) > 0 && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  {stats.pending + stats.running} em execução
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {stats.total > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Resumo das últimas operações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                  <p className="text-sm text-gray-600">Sucesso</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending + stats.running}</p>
                  <p className="text-sm text-gray-600">Em andamento</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  <p className="text-sm text-gray-600">Falhas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
