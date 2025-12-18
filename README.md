# 🎓 Studus Automatizado

Sistema multi-usuário para automatizar tarefas no portal Studus, permitindo gerenciar frequências e outras atividades de forma eficiente em background.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [API Endpoints](#api-endpoints)
- [Desenvolvimento](#desenvolvimento)
- [Deploy](#deploy)
- [Troubleshooting](#troubleshooting)

## 🎯 Visão Geral

O Studus Automatizado é uma solução multi-tenant que combina:
- **API Backend** REST com Elysia/Bun
- **Worker** dedicado para automação com Playwright
- **Frontend** React independente
- **Fila** de processamento com BullMQ
- **Cache** Redis para performance
- **Multi-tenancy** para suporte a múltiplos usuários

### Funcionalidades

- ✅ **Login Unificado**: Use apenas suas credenciais do Studus
- ✅ **Auto-cadastro**: Conta criada automaticamente no primeiro acesso
- ✅ **Multi-usuário**: Suporte a múltiplos usuários simultâneos
- ✅ **Sessões Isoladas**: Cada usuário com seu contexto de navegador
- ✅ **Cache Inteligente**: Redis para validações e sessões
- ✅ **Extração de disciplinas, notas e frequências**
- ✅ **Sistema de tarefas com processamento assíncrono**
- ✅ **Health checks e monitoramento**
- ✅ **Logs detalhados com screenshots**
- ✅ **Dados criptografados** (AES-256-GCM)

## 🏗️ Arquitetura

```
┌─────────────────────────────────────┐     ┌─────────────┐
│          Frontend React             │     │    Redis    │
│         (Porta 3001)                │────▶│   Cache     │
└─────────────────┬───────────────────┘     │   Queue     │
                  │                       └─────────────┘
                  ▼                               │
┌─────────────────▼───────────────────┐           ▼
│            API REST                  │     ┌─────────────┐
│         (Elysia/Bun)                │────▶│   Worker    │
│  ┌─────────────────────────────┐    │     │(Playwright) │
│  │   StudusAuthService         │    │     │  Multi-User │
│  │   SessionManager            │    │     │   Sessions  │
│  │   SessionCache              │    │     └─────────────┘
│  └─────────────────────────────┘    │              │
└─────────────────┬───────────────────┘              ▼
                  │                            ┌─────────────┐
                  ▼                            │   Studus    │
           ┌──────────────┐                   │  Website    │
           │   SQLite    │                   └─────────────┘
           │  Multi-Tenant│
           └──────────────┘
```

### Componentes Principais

1. **API (`apps/api`)**
   - Autenticação unificada com Studus
   - Endpoints REST para gestão de dados
   - Middleware de autenticação JWT
   - Multi-tenancy com isolamento de dados

2. **Worker (`apps/worker`)**
   - UserSessionManager para múltiplos contextos
   - Processadores de automação com Playwright
   - Fila BullMQ para processamento assíncrono
   - Cache inteligente de sessões

3. **Frontend (`apps/web`)**
   - React com TypeScript
   - Consumo da API REST
   - Interface responsiva
   - WebSocket para atualizações em tempo real

## 🔧 Pré-requisitos

- Node.js 18+ (ou Bun runtime)
- Docker e Docker Compose
- Redis (se não usar Docker)
- Credenciais de acesso ao Studus

## 🚀 Instalação

### 1. Clonar o repositório
```bash
git clone <repository-url>
cd studus_automatizado
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Editar o arquivo .env com suas credenciais
```

### 3. Opção A: Usar Docker (Recomendado)
```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

### 4. Opção B: Desenvolvimento Local
```bash
# Instalar dependências
cd app && bun install
cd ../worker && bun install
cd ../app

# Iniciar Redis (se não tiver)
docker run -p 6379:6379 redis:7-alpine

# Rodar migrações do banco
bun run migrate

# Terminal 1: Iniciar aplicação
bun run dev

# Terminal 2: Iniciar worker
cd ../worker && bun run dev
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Studus Credentials
STUDUS_USERNAME=seu_email@faculdade.edu.br
STUDUS_PASSWORD=sua_senha_aqui

# API Configuration
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=development
JWT_SECRET=chave_jwt_super_secreta

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Worker Configuration
WORKER_CONCURRENCY=1  # MANTENHA 1!
WORKER_DELAY_BETWEEN_TASKS=30000  # 30 segundos
WORKER_MAX_RETRIES=3

# Playwright
PLAYWRIGHT_HEADLESS=false  # true em produção
PLAYWRIGHT_TIMEOUT=60000
PLAYWRIGHT_SLOWMO=500  #ms entre ações

# Rate Limiting
DELAY_MIN_ACTION=2000  # 2s entre ações
DELAY_PAGE_LOAD=5000   # 5s após carregar
DELAY_BETWEEN_LOGIN_ATTEMPTS=300000  # 5 minutos
```

### Credenciais do Studus

- **Username**: Email ou matrícula usada no portal
- **Password**: Senha do portal Studus

## 🎮 Uso

### Acessando a Aplicação

1. **API**: http://localhost:3000
   - Documentação Swagger: http://localhost:3000/swagger
   - Health check: http://localhost:3000/health

2. **Frontend**: http://localhost:3001 (quando disponível)

3. **Login**:
   - Use **apenas suas credenciais do Studus**
   - A conta é criada automaticamente no primeiro acesso
   - Não há senhas padrão do sistema

4. **Fluxo de Uso**:
   - Faça login com credenciais do Studus
   - O sistema valida no portal Studus
   - Sua sessão é mantida para tarefas futuras
   - Execute sincronizações e outras tarefas

### Criando Tarefas

Via API:
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "sync_disciplines",
    "payload": {}
  }'
```

Via Interface Web:
1. Acesse a página de Tarefas
2. Clique em "Nova Tarefa"
3. Selecione o tipo desejado
4. Configure os parâmetros
5. Clique em "Criar"

### Monitorando Tarefas

- Dashboard mostra status em tempo real
- WebSocket atualiza automaticamente
- Logs detalhados disponíveis para cada tarefa
- Screenshots salvos em caso de erro

## 📁 Estrutura do Projeto

```
studus_automatizado/
├── apps/
│   ├── api/               # API REST (Elysia/Bun)
│   │   ├── src/
│   │   │   ├── routes/    # Endpoints da API
│   │   │   ├── services/  # Serviços (StudusAuth, SessionCache)
│   │   │   ├── middleware/ # Middleware de autenticação
│   │   │   └── db/        # Schema e migrações
│   │   └── package.json
│   ├── worker/            # Worker de automação
│   │   ├── src/
│   │   │   ├── session/   # UserSessionManager
│   │   │   ├── processors/ # Processadores de tarefas
│   │   │   └── services/  # Serviços de automação
│   │   └── package.json
│   └── web/               # Frontend React
│       ├── src/
│       │   ├── pages/     # Páginas da aplicação
│       │   ├── components/ # Componentes React
│       │   └── services/  # Cliente da API
│       └── package.json
├── database/              # Banco SQLite
│   └── studus.db
├── docker-compose.yml     # Configuração Docker
├── .env                   # Variáveis de ambiente
└── README.md
```

### Arquivos Chave

- `apps/api/src/services/studusAuth.ts` - Validação de credenciais Studus
- `apps/worker/src/session/UserSessionManager.ts` - Gerenciador de sessões multi-usuário
- `apps/api/src/middleware/auth.ts` - Middleware JWT e autenticação
- `apps/api/src/db/schema.ts` - Schema multi-tenant do banco
- `apps/api/src/routes/health.ts` - Health checks e monitoramento

## 🔌 API Endpoints

### Autenticação
- `POST /auth/login` - **Login unificado com Studus**
- `POST /auth/refresh` - Renovar token JWT
- `POST /auth/logout` - Logout
- `GET /auth/me` - Dados do usuário logado

### Tarefas (Autenticado)
- `GET /tasks` - Listar tarefas do usuário
- `POST /tasks` - Criar nova tarefa (SYNC_DISCIPLINES, LOGIN)
- `GET /tasks/stats/performance` - Estatísticas de performance

### Disciplinas (Autenticado)
- `GET /disciplines` - Listar disciplinas do usuário
- `GET /disciplines/:id/grades` - Notas da disciplina
- `GET /disciplines/:id/lessons` - Aulas da disciplina

### Health Check
- `GET /health` - Status completo do sistema
- `GET /health/sessions` - Sessões ativas
- `DELETE /health/sessions/:userId` - Limpar sessão específica
- `POST /health/maintenance/clear-all-sessions` - Limpar todas (manutenção)

### Configurações
- `GET /settings` - Obter configurações globais
- `POST /settings` - Atualizar configurações

### Autenticação
As requisições devem incluir o token JWT no header:
```bash
Authorization: Bearer <token>
```

## 🛠️ Desenvolvimento

### Scripts Úteis

```bash
# App
bun run dev          # Modo desenvolvimento
bun run build        # Build para produção
bun run migrate      # Rodar migrações

# Worker
bun run dev          # Modo desenvolvimento
bun run build        # Build para produção
bun run playwright:install  # Instalar browsers
```

### Testes

```bash
# Rodar todos os testes
bun test

# Testes específicos
bun test app/
bun test worker/
```

### Debug

- Logs detalhados no console
- Screenshots em `./screenshots/`
- HTML dumps em caso de erro
- WebSocket messages para debugging

## 🐳 Deploy

### Produção com Docker

```bash
# Build e start
docker-compose -f docker-compose.yml up -d

# Escalar (não escalar worker!)
docker-compose up -d --scale app=2

# Logs
docker-compose logs -f app
docker-compose logs -f worker

# Stop
docker-compose down
```

### Backup do Banco

```bash
# Backup
cp database/studus.db backups/studus_$(date +%Y%m%d_%H%M%S).db

# Restore
cp backups/studus_20231201_120000.db database/studus.db
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **Worker não processa tarefas**
   - Verifique conexão com Redis
   - Confirme credenciais do Studus
   - Verifique logs do worker

2. **Login falha**
   - Confirme usuário e senha
   - Verifique se o Studus está online
   - Verifique se há CAPTCHA

3. **Timeout em tarefas**
   - Aumente `PLAYWRIGHT_TIMEOUT`
   - Verifique conexão com internet
   - Reduza `WORKER_CONCURRENCY` (deve ser 1)

4. **Erro de banco de dados**
   - Rode `bun run migrate`
   - Verifique permissões do arquivo
   - Confirme caminho em `DATABASE_URL`

### Logs Úteis

```bash
# App logs
docker-compose logs app

# Worker logs
docker-compose logs worker

# Redis logs
docker-compose logs redis
```

### Performance

- Mantenha `WORKER_CONCURRENCY = 1` para não ser bloqueado
- Ajuste delays conforme necessário
- Monitore uso de CPU e memória
- Use modo headless em produção

## 📝 Notas Importantes

- **Worker Singleton**: Nunca rode múltiplas instâncias do worker
- **Rate Limiting**: Delays são essenciais para evitar bloqueio
- **Screenshots**: Automáticos em caso de erro
- **Sessão**: Mantida persistentemente para reduzir logins
- **Segurança**: Mantenha .env seguro e nunca no version control

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto é privativo e confidencial.

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique o arquivo [studus_discoveries.md](./studus_discoveries.md)
- Consulte os logs da aplicação
- Verifique o troubleshooting acima