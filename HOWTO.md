# Guia de Uso e Desenvolvimento (How To)

## 🚀 Como Iniciar o Sistema

1.  **Pré-requisitos**: Docker, Docker Compose e Bun instalados.
2.  **Configuração**: Preencha o arquivo `.env` com suas credenciais do Studus.
3.  **Subir Serviços**:
    ```bash
    docker-compose up -d
    ```
4.  **Acessar Interface**: Abra [http://localhost:5173](http://localhost:5173) no seu navegador.

---

## 🛠️ Tarefas de Manutenção

### Limpar Banco de Dados (Reset Total)
Para começar os testes do zero:
```bash
docker-compose down
rm -f database/studus.db
docker-compose up -d
docker-compose exec api bun run src/db/init_db.ts
```

### Rodar Testes Automatizados
O sistema possui uma suíte de testes que verifica concorrência e lógica de Mutex:
```bash
bun run test
```

### Monitorar o Robô (Worker)
Para ver o que o robô está fazendo no Studus em tempo real:
```bash
docker-compose logs -f worker
```

---

## 🤖 Operações do Robô

### Sincronização Manual
No Dashboard ou no Header, clique em **"Sincronizar"**. O robô irá:
1. Validar a sessão (ou logar automaticamente).
2. Mapear todas as suas turmas.
3. Entrar em cada turma para buscar alunos, notas e histórico de aulas.

### Controle de Concorrência
O sistema utiliza um **Mutex via Redis**. Se você clicar no botão de sincronizar enquanto uma tarefa já está rodando, a nova solicitação será rejeitada com erro `409` (Conflito) ou `429` (Muitas requisições), garantindo que apenas um robô interaja com sua conta por vez.

---

## 📂 Onde encontrar os arquivos de depuração
- **Screenshots de Erro**: `/screenshots` (na raiz do projeto).
- **Dump de HTML**: Arquivos `.html` gerados durante inspeções ficam na pasta de screenshots do worker dentro do container.
- **Banco de Dados**: `/database/studus.db` (SQLite).
