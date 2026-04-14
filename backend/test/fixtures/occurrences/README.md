# Occurrence Fixtures

Fixtures fixas para futuros testes de ocorrencias, especialmente os cenarios de:

- upload de imagem valida
- ownership da imagem
- imagem ainda nao associada a uma ocorrencia
- imagem ja associada a uma ocorrencia
- tentativa de reutilizacao por outro utilizador

Ficheiro principal:

- `upload-fixtures.ts`
- `upload-fixture-helpers.ts`

Convencoes:

- os uploads reais de runtime continuam a viver em `backend/uploads/...`
- exemplos versionados para testes vivem em `backend/test/fixtures/...`
- testes devem preferir diretórios temporários para escrita e importar valores fixos deste diretório

Exemplo de uso:

```ts
const sandbox = await createSeededOccurrenceUploadFixtureSandbox({
  keys: ['ownedPending', 'foreignPending'],
  applyToRuntimeConfig: true,
});

try {
  // correr o teste com sandbox.seededEntries
} finally {
  await sandbox.cleanup();
}
```
