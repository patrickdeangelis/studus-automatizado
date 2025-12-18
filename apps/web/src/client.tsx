import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';

// Renderizar no cliente
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

// Inicializar estado inicial se existir
const initialData = (window as any).__INITIAL_STATE__ || {};

// Conectar WebSocket
const socket = io();
(window as any).io = () => socket;

// Hydrate com dados iniciais
hydrateRoot(
  container,
  <div>
    <p>Carregando...</p>
  </div>
);

// Carregar o módulo principal dinamicamente
import('./app').then(({ default: App }) => {
  const root = createRoot(container);
  root.render(<App {...initialData} />);
}).catch(error => {
  console.error('Error loading app:', error);
  container.innerHTML = '<div class="error">Erro ao carregar a aplicação</div>';
});