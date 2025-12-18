import React from 'react';

interface AppProps {
  tasks?: any[];
}

export default function App({ tasks = [] }: AppProps) {
  // Determinar qual página renderizar baseado na URL atual
  const path = window.location.pathname;

  if (path === '/') {
    return (
      <div>
        <h1>Dashboard Carregado</h1>
        <p>Esta é a versão SSR do dashboard.</p>
      </div>
    );
  }

  if (path === '/login') {
    return (
      <div>
        <h1>Login</h1>
        <p>Página de login carregada via SSR.</p>
      </div>
    );
  }

  if (path === '/tasks') {
    return (
      <div>
        <h1>Tarefas</h1>
        <p>{tasks.length} tarefas encontradas.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Studus Automatizado</h1>
      <p>Sistema carregado com sucesso!</p>
    </div>
  );
}