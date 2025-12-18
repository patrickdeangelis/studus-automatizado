import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTasks } from '@/services';
import { useToast } from '@/hooks/use-toast';

export default function GlobalHeader() {
    const location = useLocation();
    const { tasks, startSync, hasRunningTask } = useTasks();
    const { toast } = useToast();
    const [avgTime, setAvgTime] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    // Verificar se existe tarefa de sincronização em execução
    const syncTask = tasks.find(t => t.type === 'SYNC_DISCIPLINES' && (t.status === 'RUNNING' || t.status === 'PENDING'));
    const isSyncing = !!syncTask;

    // Calcular tempo médio das últimas sincronizações
    useEffect(() => {
        const completedSyncs = tasks
            .filter(t => t.type === 'SYNC_DISCIPLINES' && t.status === 'COMPLETED' && t.performance?.total)
            .slice(-5); // Últimas 5 sincronizações

        if (completedSyncs.length > 0) {
            const avg = completedSyncs.reduce((sum, t) => sum + (t.performance?.total || 0), 0) / completedSyncs.length;
            setAvgTime(avg / 1000); // Converter para segundos
        }
    }, [tasks]);

    // Timer para tempo decorrido da sincronização atual
    useEffect(() => {
        let timer: any;
        if (isSyncing && syncTask?.startedAt) {
            const startTime = new Date(syncTask.startedAt).getTime();
            timer = setInterval(() => {
                setElapsed(Math.round((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(timer);
    }, [isSyncing, syncTask]);

    const handleSync = async () => {
        try {
            await startSync();
            toast({
                title: 'Sincronização iniciada',
                description: 'Aguarde a conclusão da sincronização...',
            });
        } catch (error: any) {
            toast({
                title: 'Erro ao iniciar sincronização',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const progress = avgTime > 0 ? Math.min((elapsed / avgTime) * 100, 95) : 0;

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    {/* Logo & Nav */}
                    <div className="flex items-center gap-10">
                        <Link to="/" className="text-xl font-bold text-blue-600 flex items-center gap-2 shrink-0">
                            🎓 Studus
                        </Link>
                        <nav className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-100">
                            <Link 
                                to="/" 
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                                    location.pathname === '/' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Dashboard
                            </Link>
                            <Link 
                                to="/disciplines" 
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                                    location.pathname.startsWith('/disciplines') 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Turmas
                            </Link>
                            <Link 
                                to="/tasks" 
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                                    location.pathname === '/tasks' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Tarefas
                            </Link>
                            <Link 
                                to="/settings" 
                                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                                    location.pathname === '/settings' 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Config
                            </Link>
                        </nav>
                    </div>

                    {/* Sync Widget */}
                    <div className="flex items-center gap-4">
                        {!isSyncing && lastSync && (
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Último Sincronismo</p>
                                <p className="text-xs text-gray-600 font-medium">{new Date(lastSync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        )}

                        <div className="relative">
                            <button 
                                onClick={handleSync}
                                disabled={isSyncing}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                    isSyncing 
                                    ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-100 cursor-not-allowed pr-12' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                                }`}
                            >
                                {isSyncing ? (
                                    <>
                                        <span className="animate-spin text-lg">⏳</span>
                                        <span>Sincronizando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-lg">🔄</span>
                                        <span>Sincronizar</span>
                                    </>
                                )}
                            </button>
                            
                            {isSyncing && avgTime > 0 && (
                                <div className="absolute bottom-0 left-0 h-1 bg-blue-200 w-full rounded-b-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
