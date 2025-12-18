// Versão simplificada para SSR inicial
// Este arquivo será substituído pelo build do Vite quando disponível

console.log('Client-side code loaded');

// Função simples para hidratação
function hydrateApp() {
  const root = document.getElementById('root');
  if (!root) return;

  // Verificar qual página estamos
  const path = window.location.pathname;

  if (path === '/') {
    root.innerHTML = `
      <div class="min-h-screen bg-gray-100">
        <div class="container mx-auto px-4 py-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-8">🎓 Studus Automatizado</h1>
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">Bem-vindo!</h2>
            <p class="text-gray-600 mb-6">Sistema de automação para o portal Studus.</p>
            <div class="space-y-4">
              <a href="/tasks" class="block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-center">
                📋 Ver Tarefas
              </a>
              <a href="/disciplines" class="block bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-center">
                📚 Ver Disciplinas
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

// Executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateApp);
} else {
  hydrateApp();
}