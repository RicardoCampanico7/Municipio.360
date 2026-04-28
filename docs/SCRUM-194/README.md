# SCRUM-194 — Diagrama de Componentes do Frontend

## Objetivo

Representar visualmente a estrutura atual do frontend, incluindo:

- páginas
- guards de rota
- componentes partilhados
- serviços
- pontos de integração com a API

## Diagrama Geral

```mermaid
flowchart LR
    Main["main.tsx"] --> App["App.tsx"]

    subgraph Routes["Rotas"]
        HomeRoute["/"]
        RegisterRoute["/register"]
        LoginRoute["/login"]
        DashboardRoute["/dashboard"]
        NewOccurrenceRoute["/occurrences/new"]
        ProfileRoute["/profile"]
        PublicReportsRoute["/occurrences/public"]
        MapRoute["/occurrences/map"]
        PublicDetailRoute["/occurrences/public/:occurrenceId"]
    end

    App --> HomeRoute
    App --> RegisterRoute
    App --> LoginRoute
    App --> DashboardRoute
    App --> NewOccurrenceRoute
    App --> ProfileRoute
    App --> PublicReportsRoute
    App --> MapRoute
    App --> PublicDetailRoute

    subgraph Guards["Guards de rota"]
        PublicRoute["PublicRoute"]
        ProtectedRoute["ProtectedRoute"]
    end

    RegisterRoute --> PublicRoute
    LoginRoute --> PublicRoute
    NewOccurrenceRoute --> ProtectedRoute
    ProfileRoute --> ProtectedRoute

    subgraph Pages["Páginas"]
        Home["Home"]
        Register["Register"]
        Login["Login"]
        Dashboard["Dashboard"]
        NewOccurrence["NewOccurrence"]
        Profile["Profile"]
        PublicReports["PublicReports"]
        OccurrenceMap["OccurrenceMap"]
        PublicOccurrenceDetail["PublicOccurrenceDetail"]
    end

    HomeRoute --> Home
    PublicRoute --> Register
    PublicRoute --> Login
    DashboardRoute --> Dashboard
    ProtectedRoute --> NewOccurrence
    ProtectedRoute --> Profile
    PublicReportsRoute --> PublicReports
    MapRoute --> OccurrenceMap
    PublicDetailRoute --> PublicOccurrenceDetail

    subgraph Components["Componentes partilhados"]
        AppLogo["AppLogo"]
        FeedbackAlert["FeedbackAlert"]
        OccurrenceCard["OccurrenceCard"]
    end

    Home --> AppLogo
    Register --> AppLogo
    Login --> AppLogo
    NewOccurrence --> AppLogo
    Profile --> AppLogo
    PublicReports --> AppLogo
    OccurrenceMap --> AppLogo
    PublicOccurrenceDetail --> AppLogo

    Dashboard --> OccurrenceCard
    NewOccurrence --> FeedbackAlert

    subgraph Services["Serviços"]
        TokenService["token.ts"]
        OccurrencesService["occurrences.ts"]
        ProfileService["profile.ts"]
    end

    PublicRoute --> TokenService
    ProtectedRoute --> TokenService
    Login --> TokenService
    Dashboard --> TokenService
    NewOccurrence --> TokenService
    Profile --> TokenService
    PublicOccurrenceDetail --> TokenService

    Dashboard --> OccurrencesService
    PublicReports --> OccurrencesService
    OccurrenceMap --> OccurrencesService
    PublicOccurrenceDetail --> OccurrencesService
    Profile --> ProfileService

    subgraph DirectApi["Chamadas diretas da página para API"]
        AuthRegister["POST /api/auth/register"]
        AuthLogin["POST /api/auth/login"]
        CreateOccurrence["POST /api/occurrences"]
    end

    Register --> AuthRegister
    Login --> AuthLogin
    NewOccurrence --> CreateOccurrence

    subgraph ServiceApi["Chamadas via services/*"]
        PublicList["GET /api/occurrences"]
        MyList["GET /api/occurrences/mine/list"]
        OccurrenceById["GET /api/occurrences/:id"]
        UpdateOccurrenceStatus["PATCH /api/occurrences/:id/status"]
        UpdateOccurrence["PATCH /api/occurrences/:id"]
        AuthMe["GET /api/auth/me"]
    end

    OccurrencesService --> PublicList
    OccurrencesService --> MyList
    OccurrencesService --> OccurrenceById
    OccurrencesService --> UpdateOccurrenceStatus
    OccurrencesService --> UpdateOccurrence
    ProfileService --> AuthMe

    subgraph Storage["Persistência local"]
        LocalStorage["localStorage"]
        JwtValidation["validação JWT / expiração"]
    end

    TokenService --> LocalStorage
    TokenService --> JwtValidation
```

## Leitura do Diagrama

- `App.tsx` centraliza as rotas do frontend.
- `PublicRoute` controla acesso a `login` e `register` quando já existe sessão.
- `ProtectedRoute` protege `new occurrence` e `profile`.
- O `dashboard` está fora de `ProtectedRoute`, apesar de usar estado de autenticação.
- `AppLogo` é o componente mais reutilizado entre páginas.
- `OccurrenceCard` é usado no dashboard.
- `FeedbackAlert` aparece no fluxo de criação de ocorrência.

## Relações Principais

### Páginas com acesso direto à API

- `Register` faz `POST /api/auth/register`
- `Login` faz `POST /api/auth/login`
- `NewOccurrence` faz `POST /api/occurrences`

### Páginas que usam `services/*`

- `Dashboard` usa `token.ts` e `occurrences.ts`
- `PublicReports` usa `occurrences.ts`
- `OccurrenceMap` usa `occurrences.ts`
- `PublicOccurrenceDetail` usa `token.ts` e `occurrences.ts`
- `Profile` usa `token.ts` e `profile.ts`
- `PublicRoute` e `ProtectedRoute` dependem de `token.ts`

## Observações Técnicas

- A arquitetura atual mistura duas abordagens:
  - páginas que chamam a API diretamente
  - páginas que delegam chamadas em `services/*`

- `token.ts` funciona como serviço transversal de sessão e autenticação.

- `occurrences.ts` concentra a maior parte das integrações do domínio de ocorrências, mas a criação de nova ocorrência ainda está implementada diretamente na página `NewOccurrence`.

- `dashboard` comporta-se como página híbrida:
  - com token, mostra dados do utilizador e ocorrências próprias
  - sem token, mostra conteúdo público

## Conclusão

O frontend está organizado em torno de `App.tsx`, páginas por rota, alguns componentes partilhados e três serviços principais. O diagrama mostra que a maior oportunidade de uniformização está na camada de integração, porque parte das páginas ainda comunica com a API diretamente em vez de passar por `services/*`.
