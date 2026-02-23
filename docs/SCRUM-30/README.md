# SCRUM-30 — Testes de Login (Inválido e Válido)

## Objetivo

Validar o comportamento do sistema perante tentativas de autenticação com credenciais inválidas e válidas.

---

## Cenário 1 — Password incorreta

Resultado:
- 401 Unauthorized
- Mensagem de erro apresentada
- Token não criado

Evidência:
- login-password-incorreta.png
- network-401.png

---

## Cenário 2 — Email inexistente

Resultado:
- 401 Unauthorized
- Token não criado

Evidência:
- login-email-inexistente.png

---

## Cenário 3 — Credenciais válidas

Resultado:
- 200 OK
- accessToken devolvido
- Token guardado no localStorage
- Redirecionamento para dashboard

Evidência:
- login-sucesso.png
- token-localstorage.png
- dashboard.png

---

## Conclusão

O sistema valida corretamente credenciais e apenas gera token para utilizadores autenticados.