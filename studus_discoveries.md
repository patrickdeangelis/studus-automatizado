# Descobertas Técnicas - Sistema Studus

## 1. Arquitetura da Interface (UI)
- **Framework**: JavaServer Faces (JSF) com PrimeFaces.
- **Layout de Turmas**: Diferente de outros portais, as turmas não são listadas em tabelas, mas em um **Grid de Cards** (`div.card`).
- **Navegação Baseada em Ícones**: O menu lateral e as ações principais utilizam Material Icons (ligatures) como identificadores de link (`school`, `assignment_turned_in`, `check_circle`).

## 2. Seletores Precisos (Playwright)
- **Login**:
  - Usuário: `#j_username`
  - Senha: `#j_password`
  - Botão: `button:has-text("Acessar")`
- **Área do Professor**: `page.getByRole('link', { name: 'school' })`
- **Lista de Disciplinas**: `page.getByRole('link', { name: 'assignment_turned_in' })`
- **Botões de Ação no Card**:
  - Registro de Aula: `button[id$=":registro"]`
  - Notas: `button[id$=":notas"]`
- **Botão de Frequência**: Link ou botão com texto `check_circle`.

## 3. Comportamento de Sessão
- **ViewState**: O Studus exige que o parâmetro `javax.faces.ViewState` seja mantido e atualizado. Navegações diretas via URL podem invalidar o estado se o ViewState não for carregado.
- **Persistência**: Apenas cookies (`JSESSIONID`) não são suficientes para sessões muito longas; o sistema redireciona para o login agressivamente. Implementamos uma re-autenticação "in-place" que detecta o redirecionamento e faz o login sem quebrar a tarefa atual.

## 4. Estrutura de Dados
- **Turmas**: Cada card contém Nome, Código (ex: 2025.2.333...) e Turma (ex: TURMA A).
- **Notas**: Tabela com 11 colunas. Inputs seguem o padrão `...:colunas:N:j_idt201_input`.
- **Aulas**: Tabela de registros históricos. A frequência abre em um modal (dialog) ou página separada dependendo do contexto.
