SCRUM-18 — Testes de Acesso sem Autenticação
Objetivo

Validar que a aplicação permite acesso às rotas públicas sem autenticação e que as rotas privadas estão corretamente protegidas através de verificação de token.

Esta validação foi realizada após a implementação da proteção de rotas no frontend (SCRUM-17).

Cenário 1 — Acesso público sem login
Descrição

Verificar que utilizadores não autenticados conseguem aceder às páginas públicas da aplicação.

Resultados esperados

A página inicial (/) é acessível sem token.

A página de login (/login) é acessível sem token.

A página de registo (/register) é acessível sem token.

Evidência

acesso-publico.png

login.png

registo.png

Cenário 2 — Acesso a rota protegida sem token
Descrição

Verificar que a rota privada (/dashboard) não é acessível sem autenticação.

Resultado esperado

Ao tentar aceder diretamente a /dashboard sem token, o utilizador é redirecionado para /login.

Evidência

sem-token.png

Cenário 3 — Acesso a rota protegida com token válido
Descrição

Verificar que um utilizador autenticado consegue aceder à rota privada.

Resultado esperado

Após login, o accessToken é guardado no localStorage.

A rota /dashboard torna-se acessível.

Ao remover manualmente o token e atualizar a página, o utilizador volta a ser redirecionado para /login.

Evidência

token-acesso.png

dashboard.png

Conclusão

Os testes realizados confirmam que:

As rotas públicas não exigem autenticação.

As rotas privadas estão corretamente protegidas.

O acesso depende da presença de um accessToken válido no localStorage.

A validação foi efetuada manualmente em ambiente de desenvolvimento, utilizando janela anónima e inspeção do localStorage no navegador.