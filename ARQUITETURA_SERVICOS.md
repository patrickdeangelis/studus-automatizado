# Arquitetura de Serviços - Studus Automatizado

## Overview

O código foi reorganizado seguindo princípios de **Vertical Slice Architecture** e **Service Layer Pattern** para melhorar a manutenibilidade, testabilidade e separação de responsabilidades.

## Estrutura de Pastas

```
apps/web/src/
├── services/              # Camada de Serviços (Business Logic)
│   ├── api-client.ts     # Cliente HTTP centralizado
│   ├── auth.service.ts   # Serviço de autenticação
│   ├── task.service.ts   # Serviço de tarefas
│   ├── discipline.service.ts # Serviço de disciplinas
│   └── index.ts          # Export centralizado
├── components/
│   ├── ProtectedRoute.tsx # Componente de rota protegida
│   ├── ui/               # Componentes UI do shadcn
│   └── Layout/           # Layout components
├── pages/                # Páginas (Views)
├── hooks/                # Hooks React
└── utils/                # Utilitários
```

## Camada de Serviços

### 1. API Client (`services/api-client.ts`)

Centraliza todas as chamadas HTTP à API:
- **Singleton pattern** para única instância
- Tratamento automático de autenticação (headers)
- Tratamento de erro 401 (redirecionamento para login)
- Métodos tipados para cada endpoint

```typescript
// Exemplo de uso
const { api, handleError } = useApi();

// Chamada com tratamento automático de erro
try {
  const response = await api.getTasks();
  // Processar resposta...
} catch (error) {
  // Erro já tratado com toast
}
```

### 2. Auth Service (`services/auth.service.ts`)

Gerencia estado de autenticação:
- **Observer pattern** para notificar mudanças
- Persistência automática no localStorage
- Estado reativo com `useAuth` hook
- Centralização da lógica de login/logout

```typescript
// Exemplo de uso
const { isAuthenticated, user, login, logout } = useAuth();

// Login com feedback automático
const result = await login(username, password);
if (result.success) {
  // Navegação automática tratada no serviço
}
```

### 3. Task Service (`services/task.service.ts`)

Gerencia operações com tarefas:
- **Polling automático** para atualizar status
- Cache local da lista de tarefas
- Cálculo automático de estatísticas
- Métodos utilitários de formatação

```typescript
// Exemplo de uso
const { tasks, stats, startSync } = useTasks();

// Sincronização com verificação automática
await startSync(); // Verifica se já não existe tarefa em execução
```

### 4. Discipline Service (`services/discipline.service.ts`)

Gerencia dados de disciplinas:
- Cache local com notificações
- Serviço separado para disciplina atual
- Métodos de busca e formatação
- Filtros e ordenação

```typescript
// Exemplo de uso
const { disciplines, fetchDisciplines } = useDisciplines();
const { discipline, fetchGrades } = useCurrentDiscipline();
```

## Padrões Arquiteturais

### 1. Service Layer Pattern

Cada serviço encapsula:
- **Lógica de negócio** relacionada ao domínio
- **Estado reativo** com observers
- **Cache local** para performance
- **Tratamento de erros** específico

### 2. Observer Pattern

Serviços notificam mudanças de estado:
```typescript
// Inscrição automática no hook
const unsubscribe = service.subscribe(setState);
return () => unsubscribe(); // Cleanup
```

### 3. Singleton Pattern

Serviços usam singleton para:
- Manter estado global consistente
- Evitar múltiplas instâncias
- Compartilhar cache entre componentes

### 4. Dependency Injection

Hooks injetam dependências dos serviços:
```typescript
// Injeção automática no hook
export function useTasks() {
  const [tasks, setTasks] = useState(taskService.getTasks());
  // ...
}
```

## Benefícios da Arquitetura

### 1. **Separação de Responsabilidades**
- UI: Apenas apresentação e interação
- Services: Lógica de negócio e estado
- API Client: Comunicação HTTP

### 2. **Reutilização**
- Serviços podem ser usados em qualquer componente
- Lógica compartilhada centralizada
- Sem duplicação de código

### 3. **Testabilidade**
- Serviços podem ser testados isoladamente
- Mock fácil para testes de UI
- Estado previsível

### 4. **Manutenibilidade**
- Lógica concentrada em um lugar
- Fácil de encontrar e modificar
- Impacto localizado das mudanças

### 5. **Performance**
- Cache local evita requisições repetidas
- Polling inteligente
- Atualizações reativas eficientes

## Boas Práticas

### 1. **Services são Single Source of Truth**
- Estado vive nos serviços
- Componentes apenas refletem o estado
- Sem duplicação de estado

### 2. **Async/Await consistente**
- Sempre usar `try/catch` em chamadas de serviço
- Tratamento de erro centralizado
- Feedback ao usuário automático

### 3. **Reatividade Automática**
- Hooks se inscrevem automaticamente
- Cleanup automático no unmount
- Sem memory leaks

### 4. **Type Safety**
- Interfaces TypeScript para todos os dados
- Tipos exportados dos serviços
- Sem `any` em chamadas públicas

## Exemplo de Fluxo Completo

```typescript
// 1. Componente usa hook
function DashboardPage() {
  const { stats, startSync } = useTasks();

  // 2. Hook gerencia estado e notificações
  // React efetua render quando estado muda

  const handleSync = async () => {
    // 3. Chama método do serviço
    await startSync();
    // 4. Serviço atualiza estado e notifica observers
    // 5. Hook atualiza estado do React
    // 6. Componente re-renderiza com novos dados
  };
}
```

## Próximos Passos

1. **Adicionar teste unitário para serviços**
2. **Implementar retry automático no API Client**
3. **Adicionar service para configurações globais**
4. **Criar middleware para logging de requisições**
5. **Implementar cache com TTL para serviços**

## Conclusão

Esta arquitetura transforma o código de espalhado e acoplado para uma estrutura limpa, modular e fácil de manter. Os serviços atuam como uma camada intermediária que abstrai a complexidade e fornece uma API consistente para toda a aplicação.