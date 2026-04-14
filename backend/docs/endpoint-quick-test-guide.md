# Guia rapido de teste por endpoint

Data: 2026-04-14

## Objetivo

Disponibilizar um guia curto e pratico para testar os endpoints `login`, `register`, `me`, `users`, `menu` e `health` no backend, com passos diretos e resultados esperados.

## Onde testar

- Swagger UI: `/api`
- OpenAPI JSON: `/api/openapi.json`

## Pre-requisitos

- Backend a correr localmente.
- Base de dados migrada e acessivel.
- Seed executada para garantir utilizadores de teste base.
- Swagger aberto em `http://localhost:3000/api`.

## Dados de teste recomendados

Os seguintes utilizadores existem na seed do backend:

- Civil: `civil@teste.pt`
- Operador: `operador@teste.pt`
- Administrador: `admin@teste.pt`
- Password para todas as contas: `Password123!`

## Ordem recomendada de teste

1. `GET /health`
2. `GET /menu`
3. `POST /auth/register`
4. `POST /auth/login`
5. `GET /auth/me`
6. `GET /users`

## Endpoint: POST /auth/login

### Passos

1. Abrir a secção `auth` no Swagger.
2. Selecionar `POST /auth/login`.
3. Clicar em `Try it out`.
4. Inserir o body:

```json
{
  "email": "civil@teste.pt",
  "password": "Password123!"
}
```

5. Clicar em `Execute`.

### Resultado esperado

- HTTP `200 OK`.
- A resposta deve incluir:
- `accessToken`
- `tokenType` com valor `Bearer`
- `user` com dados seguros do utilizador autenticado
- O campo `user.email` deve ser `civil@teste.pt`.
- O campo `user.role` deve ser `CIVIL`.

### Observacao

- Guardar o `accessToken` para testar `GET /auth/me`.

## Endpoint: POST /auth/register

### Passos

1. Abrir a secao `auth` no Swagger.
2. Selecionar `POST /auth/register`.
3. Clicar em `Try it out`.
4. Inserir um body com email novo:

```json
{
  "name": "Teste Swagger",
  "biNumber": "12345678",
  "postalCode": "1000-123",
  "email": "teste.swagger+01@municipio360.pt",
  "password": "Password123!"
}
```

5. Clicar em `Execute`.

### Resultado esperado

- HTTP `201 Created`.
- A resposta deve incluir:
- `message` com valor `Utilizador registado com sucesso`
- `user`
- O campo `user.email` deve corresponder ao email enviado.
- O campo `user.role` deve ser `CIVIL` quando a role nao e enviada.
- O campo `user` nao deve expor `passwordHash`.

### Observacao

- Se o email ja existir, o resultado esperado passa a ser `409 Conflict`.
- Se quiseres repetir o teste, muda o email antes de executar novamente.

## Endpoint: GET /auth/me

### Passos

1. Fazer primeiro `POST /auth/login`.
2. Copiar o `accessToken` devolvido.
3. Clicar no botao `Authorize` do Swagger.
4. Inserir `Bearer <accessToken>`.
5. Confirmar a autorizacao.
6. Abrir `GET /auth/me`.
7. Clicar em `Try it out`.
8. Clicar em `Execute`.

### Resultado esperado

- HTTP `200 OK`.
- A resposta deve incluir o objeto `user`.
- O campo `user.email` deve corresponder ao utilizador do token usado no login.
- O endpoint deve devolver apenas dados seguros do perfil.

### Observacao

- Sem token, ou com token invalido, o resultado esperado e `401 Unauthorized`.

## Endpoint: GET /users

### Passos

1. Fazer `POST /auth/login` com um utilizador interno:

```json
{
  "email": "operador@teste.pt",
  "password": "Password123!"
}
```

2. Copiar o `accessToken`.
3. Clicar em `Authorize` no Swagger.
4. Inserir `Bearer <accessToken>`.
5. Abrir `GET /users`.
6. Clicar em `Try it out`.
7. Clicar em `Execute`.

### Resultado esperado

- HTTP `200 OK`.
- A resposta deve ser um array de utilizadores.
- Cada item deve conter apenas campos seguros como:
- `id`
- `name`
- `biNumber`
- `postalCode`
- `email`
- `role`
- `certStatus`
- `createdAt`
- `updatedAt`
- Nenhum item deve expor `passwordHash`.

### Observacao

- Se o token for de um utilizador `CIVIL`, o resultado esperado e `403 Forbidden`.
- Sem token, o resultado esperado e `401 Unauthorized`.

## Endpoint: GET /menu

### Passos

1. Abrir a secao `menu` no Swagger.
2. Selecionar `GET /menu`.
3. Clicar em `Try it out`.
4. Testar primeiro sem query `lang`.
5. Clicar em `Execute`.
6. Repetir o teste com `lang=en`.
7. Repetir o teste com um idioma nao suportado, por exemplo `lang=de`.

### Resultado esperado

- HTTP `200 OK` em todos os testes.
- Sem `lang`, o campo `locale` deve ser `pt`.
- Com `lang=en`, o campo `locale` deve ser `en`.
- Com `lang=de`, o campo `locale` deve voltar para `pt`.
- A resposta deve incluir:
- `appName`
- `locale`
- `items`
- `languages`

## Endpoint: GET /health

### Passos

1. Abrir a secao `app` no Swagger.
2. Selecionar `GET /health`.
3. Clicar em `Try it out`.
4. Clicar em `Execute`.

### Resultado esperado

- HTTP `200 OK`.
- A resposta deve ser:

```json
{
  "ok": true
}
```

## Validacao final da task

Para considerar esta task concluida, o esperado e:

- Todos os endpoints acima testam no Swagger sem erros inesperados.
- Os estados HTTP batem com os resultados esperados.
- Os endpoints protegidos respeitam autenticacao e autorizacao.
- As respostas devolvem apenas os campos documentados no Swagger.
