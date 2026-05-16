export const usersSwaggerExamples = {
  authorizationHeader:
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsIm5hbWUiOiJBbmEgTWFydGlucyIsImVtYWlsIjoiYW5hLm9wZXJhZG9yQG11bmljaXBpbzM2MC5wdCIsInJvbGUiOiJPUEVSQURPUiIsImF1dGhWZXJzaW9uIjowLCJpYXQiOjE3NDM4NDgxMzAsImV4cCI6MTc0Mzg1MTczMH0.signature',
  listSuccess: {
    orderedUsersList: {
      summary: 'Lista de utilizadores para backoffice',
      description:
        'Exemplo tipico da resposta para OPERADOR ou ADMINISTRADOR, ordenada por createdAt desc.',
      value: [
        {
          id: 12,
          name: 'Ana Martins',
          biNumber: '98765432 1 AA1',
          postalCode: '4700-210',
          email: 'ana.operador@municipio360.pt',
          role: 'OPERADOR',
          createdAt: '2026-04-12T09:45:10.000Z',
          updatedAt: '2026-04-12T09:45:10.000Z',
        },
        {
          id: 7,
          name: 'Maria Fernandes',
          biNumber: '12345678 1 AB2',
          postalCode: '1000-123',
          email: 'cidadao@municipio360.pt',
          role: 'CIVIL',
          createdAt: '2026-04-05T10:15:30.000Z',
          updatedAt: '2026-04-07T08:22:11.000Z',
        },
      ],
    },
    adminAuditingView: {
      summary: 'Lista usada em testes de auditoria interna',
      value: [
        {
          id: 18,
          name: 'Carlos Rocha',
          biNumber: '44556677 1 BB6',
          postalCode: '4000-110',
          email: 'carlos.admin@municipio360.pt',
          role: 'ADMINISTRADOR',
          createdAt: '2026-04-13T14:20:00.000Z',
          updatedAt: '2026-04-13T14:20:00.000Z',
        },
      ],
    },
  },
  listUnauthorized: {
    missingOrInvalidToken: {
      summary: 'Token em falta ou invalido',
      value: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  },
  listForbidden: {
    insufficientRole: {
      summary: 'Utilizador autenticado sem permissao',
      value: {
        statusCode: 403,
        message: 'Sem permissoes',
        error: 'Forbidden',
      },
    },
  },
} as const;
