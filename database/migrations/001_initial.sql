-- Migration inicial do banco de dados
-- Criado em: 2024-01-17

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  studus_username VARCHAR(255),
  studus_password_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de disciplinas
CREATE TABLE IF NOT EXISTS disciplines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  studus_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  semester VARCHAR(50),
  students_count INTEGER DEFAULT 0,
  last_sync DATETIME,
  active BOOLEAN DEFAULT true,
  data JSON, -- Dados adicionais da disciplina
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, studus_id)
);

-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'sync_disciplines', 'update_frequency', etc.
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  priority INTEGER DEFAULT 0,
  payload JSON, -- Dados da tarefa
  result JSON, -- Resultado da tarefa
  error_message TEXT,
  error_details JSON,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  scheduled_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de logs de tarefas
CREATE TABLE IF NOT EXISTS task_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  level VARCHAR(20) NOT NULL, -- 'debug', 'info', 'warn', 'error'
  message TEXT NOT NULL,
  details JSON,
  screenshot_path VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Tabela para controle de sessões do Studus
CREATE TABLE IF NOT EXISTS studus_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_data JSON, -- Cookies, tokens, etc.
  expires_at DATETIME,
  is_valid BOOLEAN DEFAULT true,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_disciplines_user_id ON disciplines(user_id);
CREATE INDEX IF NOT EXISTS idx_disciplines_studus_id ON disciplines(studus_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_created_at ON task_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_studus_sessions_user_id ON studus_sessions(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_disciplines_timestamp
  BEFORE UPDATE ON disciplines
  FOR EACH ROW
  BEGIN
    UPDATE disciplines SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- Usuário padrão (id: 1) - será criado via código
-- INSERT INTO users (username, password_hash, email)
-- VALUES ('admin', '$2a$10$placeholder_hash', 'admin@studus-automatizado.com');