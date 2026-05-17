# Município 360

> Plataforma de reporte e gestão de ocorrências urbanas — Liga cidadãos, operadores e administradores municipais numa única aplicação.

![Backend](https://img.shields.io/badge/Backend-NestJS%2011-E0234E?logo=nestjs&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)
![Database](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)
![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma&logoColor=white)
![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-Jest%20%2B%20Supertest-C21325?logo=jest&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-PT%20%7C%20EN%20%7C%20ES%20%7C%20FR-brightgreen)

---

## Índice

- [Descrição](#descrição)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Stack tecnológico](#stack-tecnológico)
- [Pré-requisitos](#pré-requisitos)
- [Arranque rápido](#arranque-rápido)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Documentação da API](#documentação-da-api)
- [Testes](#testes)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Equipa](#equipa)
- [Contexto académico](#contexto-académico)

---

## Descrição

O **Município 360** é uma aplicação web full-stack que permite aos cidadãos reportar ocorrências urbanas (buracos no pavimento, iluminação pública avariada, ruído, entre outras), acompanhar o estado de resolução em tempo real e consultar um portal público de transparência.

Do lado backoffice, operadores e administradores municipais gerem as ocorrências, transitam estados, adicionam comentários internos e consultam os dados de utilizadores — tudo protegido por autenticação JWT com rotação de refresh tokens e controlo de acesso baseado em roles.

---

## Funcionalidades

### Cidadão (CIVIL)
- Registo com fotografia de perfil (base64, até 3 MB) e certificação de conta
- Login com JWT — access token de curta duração + refresh token com rotação automática
- Reporte de ocorrências com até 3 fotografias e geolocalização por morada
- Acompanhamento do estado das próprias ocorrências e histórico de transições
- Edição do perfil e eliminação de conta (anonimização, sem remoção da base de dados)
- Interface multilingue: Português, English, Español, Français

### Operador / Administrador (OPERADOR · ADMINISTRADOR)
- Backoffice de gestão de todas as ocorrências
- Transição de estados (`SUBMETIDA → EM_TRATAMENTO → CONCLUIDA`) com regras de negócio validadas
- Comentários internos por ocorrência (não visíveis ao cidadão)
- Consulta da lista de utilizadores

### Portal público
- Listagem pública de ocorrências sem autenticação
- Detalhe individual de cada ocorrência
- Mapa de ocorrências

---

## Arquitetura

```mermaid
graph TD
    subgraph Cliente
        FE["Frontend\nReact 19 + Vite\n:5173"]
    end

    subgraph Servidor
        BE["Backend\nNestJS 11\n:3000"]
        SW["Swagger UI\n/api"]
        ST["Ficheiros estáticos\n/uploads"]
    end

    subgraph Dados
        DB[(PostgreSQL 16\n:5432)]
    end

    FE -->|"REST /api/*\nJWT Bearer"| BE
    BE -->|"Prisma ORM"| DB
    BE --> SW
    BE --> ST
```

### Fluxo de autenticação

```mermaid
sequenceDiagram
    participant C as Cliente
    participant BE as Backend
    participant DB as PostgreSQL

    C->>BE: POST /auth/login {email, password}
    BE->>DB: Verificar credenciais + bcrypt
    DB-->>BE: Utilizador válido
    BE-->>C: { accessToken (15m), refreshToken (7d) }

    Note over C,BE: Quando o accessToken expira...

    C->>BE: POST /auth/refresh {refreshToken}
    BE->>DB: Validar hash do refreshToken
    DB-->>BE: Hash válido
    BE->>DB: Guardar novo hash (rotação)
    BE-->>C: Novo par { accessToken, refreshToken }
```

---

## Stack tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend framework | NestJS | 11 |
| Linguagem | TypeScript | 5 |
| ORM | Prisma | 6 |
| Base de dados | PostgreSQL | 16 |
| Autenticação | JWT (@nestjs/jwt) + bcrypt | — |
| Validação | class-validator + class-transformer | — |
| Upload de ficheiros | Multer | — |
| Documentação API | @nestjs/swagger (OpenAPI 3) | — |
| Frontend framework | React | 19 |
| Build tool | Vite | 6 |
| Roteamento | React Router | 7 |
| Internacionalização | i18next + react-i18next | — |
| Ícones | Lucide React | — |
| Testes unitários | Jest | — |
| Testes E2E | Jest + Supertest | — |
| Containerização BD | Docker + Docker Compose | — |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) ≥ 20
- [Docker](https://www.docker.com/) (para a base de dados PostgreSQL)
- npm ≥ 10

---

## Arranque rápido

### 1. Clonar o repositório

```bash
git clone https://github.com/RicardoCampanico7/Municipio.360.git
cd Municipio.360
```

### 2. Instalar dependências

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` com os valores corretos (ver secção [Variáveis de ambiente](#variáveis-de-ambiente)).

### 4. Iniciar a base de dados

```bash
docker compose up -d
```

### 5. Arrancar a aplicação

**macOS / Linux:**
```bash
chmod +x start.sh && ./start.sh
```

**Windows:**
```cmd
start.cmd
```

O script aguarda que o backend esteja pronto antes de lançar o frontend. Ao arrancar verás:

```
[Municipio360] Backend pronto.
[Municipio360] Swagger UI:       http://localhost:3000/api
[Municipio360] OpenAPI JSON:     http://localhost:3000/api/openapi.json
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/api |
| Health check | http://localhost:3000/occurrences/health |

### 6. Popular a base de dados (opcional)

```bash
cd backend && npx prisma db seed
```

---

## Variáveis de ambiente

Cria o ficheiro `backend/.env` com base no seguinte exemplo:

```env
# Base de dados
DATABASE_URL="postgresql://postgres:municipio360@localhost:5432/municipio360"

# JWT — access token (curta duração)
JWT_SECRET="substitui-por-uma-chave-segura-e-aleatoria"
JWT_EXPIRES_IN="15m"

# JWT — refresh token (longa duração)
JWT_REFRESH_SECRET="substitui-por-outra-chave-segura-e-diferente"
JWT_REFRESH_EXPIRES_IN="7d"
```

> ⚠️ **Nunca commites o ficheiro `.env` com chaves reais.** O ficheiro está incluído no `.gitignore`.

---

## Documentação da API

A documentação completa da API está disponível em **http://localhost:3000/api** após arrancar o backend.

### Módulos documentados

| Módulo | Tag | Endpoints |
|--------|-----|-----------|
| Autenticação | `auth` | POST /auth/login, /auth/refresh, /auth/register · GET /auth/me · PATCH /auth/me, /auth/me/avatar · DELETE /auth/me |
| Ocorrências | `occurrences` | GET / · GET /mine · GET /mine/:id · GET /management · GET /management/:id · POST / · POST /images · PATCH /:id · PATCH /:id/status · DELETE /:id |
| Utilizadores | `users` | GET /users |
| Menu | `menu` | GET /menu |

Todos os endpoints incluem:
- Descrição detalhada da operação
- Exemplos de pedido e resposta com payloads realistas
- Documentação de todos os códigos HTTP de erro (400, 401, 403, 404, 409)
- Esquemas de resposta via DTOs tipados

Para testar endpoints protegidos no Swagger UI, clica em **Authorize** e introduz o `accessToken` obtido em `POST /auth/login`.

---

## Testes

### Executar testes unitários

```bash
cd backend
npm test
```

### Executar testes E2E

```bash
cd backend
npm run test:e2e
```

### Cobertura de testes

```bash
cd backend
npm run test:cov
```

### O que está coberto

| Ficheiro | Tipo | Casos |
|----------|------|-------|
| `occurrences.service.spec.ts` | Unitário | 35+ casos — criação, listagens, estados, imagens, comentários |
| `auth.service.spec.ts` | Unitário | Registo, login, refresh, logout, eliminação de conta |
| `test/app.e2e-spec.ts` | E2E | 40+ casos — fluxos completos com mock de Prisma, validação de ficheiros, permissões |

Os testes E2E usam uma instância real do NestJS com `PrismaService` substituído por um mock, garantindo isolamento total da base de dados.

---

## Estrutura do projeto

```
Municipio.360/
├── backend/
│   ├── src/
│   │   ├── auth/               # Autenticação JWT, guards, strategies, DTOs
│   │   ├── docs/examples/      # Exemplos Swagger por módulo
│   │   ├── menu/               # Endpoint de menu multilingue
│   │   ├── occurrences/        # Ocorrências — controller, service, upload, DTOs
│   │   ├── prisma/             # Módulo e serviço Prisma
│   │   ├── shared/             # Guards, decorators e DTOs partilhados
│   │   ├── users/              # Listagem de utilizadores
│   │   ├── app.module.ts
│   │   └── main.ts             # Bootstrap — CORS, Swagger, ValidationPipe
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos: User, Occurrence, StatusHistory, InternalComment
│   │   ├── migrations/         # 9 migrações versionadas
│   │   └── seed.ts
│   └── test/
│       └── app.e2e-spec.ts     # Suite E2E com 40+ testes
├── frontend/
│   └── src/
│       ├── components/         # AppLogo, OccurrenceCard, ProtectedRoute, GlobalBottomNav, …
│       ├── pages/              # Dashboard, Login, Register, NewOccurrence, Profile, …
│       ├── services/           # auth.ts, occurrences.ts, profile.ts, token.ts
│       ├── i18n.ts             # Traduções PT · EN · ES · FR
│       └── App.tsx             # Roteamento principal
├── docs/                       # Evidências SCRUM (sprints 18, 24, 30, 35, 55, 193, 194)
├── docker-compose.yml          # PostgreSQL 16
├── start.sh                    # Arranque macOS/Linux
└── start.cmd                   # Arranque Windows
```

### Modelo de dados

```
User ──────────────── Occurrence
 │                       │
 │              OccurrenceStatusHistory
 │                       │
 └──────── OccurrenceInternalComment
```

**Roles:** `CIVIL` · `OPERADOR` · `ADMINISTRADOR`  
**Estados:** `SUBMETIDA → EM_TRATAMENTO → CONCLUIDA`  
**Categorias:** Buracos no pavimento · Iluminação pública · Limpeza urbana · Ruído · Espaços públicos · Sinalização · Outros

---

## Equipa

| Membro | Número | Responsabilidade |
|--------|--------|-----------------|
| Guilherme Gaspar | a85786 | Backend |
| Alan Martynyuk | a85476 | Backend |
| Ricardo Campaniço | a83857 | Frontend |
| David Domingos | a83879 | Frontend |

---

## Contexto académico

Projeto desenvolvido no âmbito da unidade curricular de **Laboratório de Engenharia de Software (LES)** — ano letivo 2025/2026 — [Universidade do Algarve](https://www.ualg.pt).

A metodologia de desenvolvimento seguiu **SCRUM**, com sprints documentados na pasta `docs/`.
