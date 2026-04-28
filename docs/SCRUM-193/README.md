# SCRUM-193 — Levantamento de Componentes e Fluxos Reais do Frontend

## Objetivo

Documentar o comportamento real atualmente implementado no frontend para os fluxos de registo, login, dashboard e public reports, com base no código existente.

## Escopo Analisado

- Registo de utilizador
- Login
- Dashboard
- Public reports
- Detalhe de ocorrência pública

## Rotas e Entradas dos Fluxos

- `/register`
  - Página: `frontend/src/pages/Register.tsx`
  - Guard: `frontend/src/components/PublicRoute.tsx`

- `/login`
  - Página: `frontend/src/pages/Login.tsx`
  - Guard: `frontend/src/components/PublicRoute.tsx`

- `/dashboard`
  - Página: `frontend/src/pages/Dashboard.tsx`
  - Guard: sem `ProtectedRoute`

- `/occurrences/public`
  - Página: `frontend/src/pages/PublicReports.tsx`
  - Guard: rota pública

- `/occurrences/public/:occurrenceId`
  - Página: `frontend/src/pages/PublicOccurrenceDetail.tsx`
  - Guard: rota pública, com ações adicionais para perfis de backoffice autenticados

## Componentes Envolvidos

- `frontend/src/components/PublicRoute.tsx`
  - Impede acesso a `login` e `register` quando já existe sessão válida.

- `frontend/src/components/ProtectedRoute.tsx`
  - Protege rotas privadas com base no token, mas não está a ser usado no `dashboard`.

- `frontend/src/components/AppLogo.tsx`
  - Componente visual reutilizado nas páginas de autenticação e relatórios públicos.

- `frontend/src/components/OccurrenceCard.tsx`
  - Usado no dashboard para apresentar o resumo das ocorrências.

- `frontend/src/components/FeedbackAlert.tsx`
  - Existe como componente reutilizável de feedback, mas não participa diretamente nos fluxos principais aqui analisados.

## Serviços e Estado de Sessão

- `frontend/src/services/token.ts`
  - Guarda e limpa o `accessToken`
  - Verifica expiração do JWT
  - Mantém o utilizador autenticado em `localStorage`
  - Expõe validações de autenticação e perfil de backoffice

- `frontend/src/services/occurrences.ts`
  - Centraliza os pedidos de ocorrências públicas, privadas e atualização de estado/detalhe

## Fluxo 1 — Registo

### Origem

- Rota `/register`
- Página `frontend/src/pages/Register.tsx`

### Comportamento

- A página fica acessível apenas a utilizadores sem sessão válida.
- O formulário valida:
  - nome
  - número de identificação civil
  - código postal
  - email
  - password
  - avatar opcional
  - role selecionada no formulário

### Integração

- `POST /api/auth/register`

### Resultado

- Em caso de sucesso, o utilizador é redirecionado para `/login`.
- Em caso de erro, o frontend mostra mensagem adequada conforme o código ou resposta da API.

## Fluxo 2 — Login

### Origem

- Rota `/login`
- Página `frontend/src/pages/Login.tsx`

### Comportamento

- A página fica acessível apenas a utilizadores sem sessão válida.
- O formulário envia email e password.
- Em caso de resposta válida:
  - guarda o `accessToken`
  - tenta reconstruir o utilizador autenticado
  - redireciona para a rota de origem (`state.from`) ou para `/dashboard`

### Integração

- `POST /api/auth/login`

### Resultado

- Sessão persistida em `localStorage`
- Redirecionamento após autenticação

## Fluxo 3 — Dashboard

### Origem

- Rota `/dashboard`
- Página `frontend/src/pages/Dashboard.tsx`

### Comportamento

- O dashboard adapta o conteúdo conforme exista ou não autenticação.
- Quando existe token válido:
  - mostra greeting com dados do utilizador
  - carrega ocorrências do utilizador autenticado
- Quando não existe token:
  - mantém acesso à página
  - carrega ocorrências públicas
  - trata o utilizador como visitante

### Integração

- Autenticado: `GET /api/occurrences/mine/list`
- Não autenticado: `GET /api/occurrences`

### Componentes e navegação

- Usa `OccurrenceCard` para mostrar o resumo de ocorrências
- O CTA de criar ocorrência força login quando necessário
- A navegação inferior redireciona para mapa, reports, perfil e criação

### Resultado

- O dashboard funciona hoje como uma página híbrida, não como rota estritamente privada

## Fluxo 4 — Public Reports

### Origem

- Rota `/occurrences/public`
- Página `frontend/src/pages/PublicReports.tsx`

### Comportamento

- A página é pública
- Carrega a lista de ocorrências públicas
- Calcula estatísticas de total, em progresso e resolvidas
- Cada card abre o detalhe da ocorrência

### Integração

- `GET /api/occurrences`

### Resultado

- Lista pública navegável de ocorrências do município

## Fluxo 5 — Detalhe de Ocorrência Pública

### Origem

- Rota `/occurrences/public/:occurrenceId`
- Página `frontend/src/pages/PublicOccurrenceDetail.tsx`

### Comportamento

- Carrega o detalhe de uma ocorrência pública por identificador
- Mostra:
  - estado
  - descrição
  - localização
  - data
  - referência
  - imagens
  - mapa incorporado a partir da localização

### Integração

- `GET /api/occurrences/:id`

### Ações adicionais para backoffice

- Se o utilizador autenticado tiver role `OPERADOR` ou `ADMINISTRADOR`, pode:
  - atualizar estado
  - editar categoria, detalhe, localização e descrição

- Endpoints usados nessas ações:
  - `PATCH /api/occurrences/:id/status`
  - `PATCH /api/occurrences/:id`

## Endpoints Reais Levantados

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/occurrences`
- `GET /api/occurrences/mine/list`
- `GET /api/occurrences/:id`
- `PATCH /api/occurrences/:id/status`
- `PATCH /api/occurrences/:id`

## Observações e Gaps Identificados

- O `dashboard` não está protegido com `ProtectedRoute`, apesar de existir lógica de sessão e redirecionamento.
- O login apresenta link para `/forgot-password`, mas essa rota não está definida em `frontend/src/App.tsx`.
- O formulário de registo permite escolher `CIVIL`, `OPERADOR` e `ADMINISTRADOR`, o que deve ser confirmado do ponto de vista funcional e de segurança.
- `FeedbackAlert` existe como componente reutilizável, mas os fluxos aqui analisados ainda usam maioritariamente mensagens locais em vez desse componente.

## Conclusão

O frontend já implementa os fluxos principais pedidos na task, mas o comportamento real mistura rotas públicas, rotas condicionadas por sessão e ações administrativas embutidas no detalhe das ocorrências. Este levantamento pode servir como base para refactor, documentação funcional ou alinhamento entre frontend e backend.
