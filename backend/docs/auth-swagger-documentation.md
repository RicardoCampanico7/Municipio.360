# Documentacao Swagger dos endpoints de auth

Data: 2026-04-13

## Objetivo

Documentar no Swagger os endpoints de autenticacao com exemplos reais de request, response e erros.

## Endpoints documentados

### POST /auth/login

- Request examples:
- Credenciais validas para um utilizador civil.
- Email com espacos e maiusculas para demonstrar a normalizacao feita pelo servico.
- Response 200:
- `accessToken`, `tokenType` e `user` com os campos seguros do perfil autenticado.
- Errors:
- `400 Bad Request` para email invalido ou password demasiado curta.
- `401 Unauthorized` para credenciais invalidas.

### POST /auth/register

- Request examples:
- Registo civil minimo sem avatar.
- Registo com avatar em data URL base64 e role explicita.
- Response 201:
- Mensagem de sucesso e objeto `user` com os dados seguros do utilizador criado.
- Errors:
- `400 Bad Request` para falhas de validacao.
- `400 Bad Request` para avatar invalido.
- `400 Bad Request` para avatar acima de 3 MB.
- `409 Conflict` para email ja registado.

### GET /auth/me

- Request example:
- Header `Authorization: Bearer <token>` com um JWT de exemplo.
- Response 200:
- Objeto `user` com o perfil atualizado do utilizador autenticado.
- Errors:
- `401 Unauthorized` para token em falta ou invalido.
- `401 Unauthorized` para token valido sem utilizador correspondente.

## Implementacao

- Os exemplos Swagger foram centralizados em `src/docs/examples/auth-swagger.examples.ts`.
- O controlador `src/auth/auth.controller.ts` passou a expor exemplos por endpoint em `ApiBody`, `ApiOkResponse`, `ApiCreatedResponse`, `ApiBadRequestResponse`, `ApiConflictResponse` e `ApiUnauthorizedResponse`.
- O endpoint `GET /auth/me` passou a incluir exemplo explicito do header `Authorization`.

## Validacao

- Comando executado com sucesso: `npm run build`

## Onde consultar

- Swagger UI: `/api`
- OpenAPI JSON: `/api/openapi.json`
