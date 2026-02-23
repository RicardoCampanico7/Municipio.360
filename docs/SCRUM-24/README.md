# SCRUM-24 — Teste de Registo com Email Duplicado

## Objetivo

Validar que o sistema impede a criação de contas com email já existente.

## Cenário de Teste

1. Registo inicial com email válido.
2. Nova tentativa de registo com o mesmo email.

## Resultado Esperado

- O backend devolve erro.
- A conta não é criada.
- O frontend apresenta mensagem de erro.
- Não é gerado accessToken.

## Conclusão

O sistema valida corretamente a unicidade do email.