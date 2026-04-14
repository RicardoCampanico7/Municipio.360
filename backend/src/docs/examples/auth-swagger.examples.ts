export const authSwaggerExamples = {
  authorizationHeader:
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsIm5hbWUiOiJNYXJpYSBGZXJuYW5kZXMiLCJlbWFpbCI6ImNpZGFkYW9AbXVuaWNpcGlvMzYwLnB0Iiwicm9sZSI6IkNJVklMIiwiY2VydFN0YXR1cyI6IkNFUlRJRklFRCIsImlhdCI6MTc0Mzg0ODEzMCwiZXhwIjoxNzQzODUxNzMwfQ.signature',
  loginRequest: {
    civilCredentials: {
      summary: 'Credenciais validas',
      description: 'Exemplo minimo para autenticar um utilizador civil.',
      value: {
        email: 'cidadao@municipio360.pt',
        password: 'SenhaSegura123',
      },
    },
    normalizedEmail: {
      summary: 'Email com normalizacao',
      description:
        'O servico normaliza email com trim e lowercase antes de autenticar.',
      value: {
        email: '  CIDADAO@municipio360.pt  ',
        password: 'SenhaSegura123',
      },
    },
  },
  loginSuccess: {
    authenticatedCivilUser: {
      summary: 'JWT emitido com sucesso',
      value: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsIm5hbWUiOiJNYXJpYSBGZXJuYW5kZXMiLCJlbWFpbCI6ImNpZGFkYW9AbXVuaWNpcGlvMzYwLnB0Iiwicm9sZSI6IkNJVklMIiwiY2VydFN0YXR1cyI6IkNFUlRJRklFRCIsImlhdCI6MTc0Mzg0ODEzMCwiZXhwIjoxNzQzODUxNzMwfQ.signature',
        tokenType: 'Bearer',
        user: {
          id: 7,
          name: 'Maria Fernandes',
          biNumber: '12345678',
          postalCode: '1000-123',
          email: 'cidadao@municipio360.pt',
          avatarUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          role: 'CIVIL',
          certStatus: 'CERTIFIED',
        },
      },
    },
  },
  loginBadRequest: {
    invalidEmail: {
      summary: 'Email invalido',
      value: {
        statusCode: 400,
        message: ['email must be an email'],
        error: 'Bad Request',
      },
    },
    shortPassword: {
      summary: 'Password demasiado curta',
      value: {
        statusCode: 400,
        message: ['password must be longer than or equal to 6 characters'],
        error: 'Bad Request',
      },
    },
  },
  loginUnauthorized: {
    invalidCredentials: {
      summary: 'Credenciais incorretas',
      value: {
        statusCode: 401,
        message: 'Credenciais invalidas',
        error: 'Unauthorized',
      },
    },
  },
  registerRequest: {
    civilUserMinimal: {
      summary: 'Registo civil minimo',
      description:
        'Exemplo recomendado para criar um utilizador civil sem avatar.',
      value: {
        name: 'Maria Fernandes',
        biNumber: '12345678',
        postalCode: '1000-123',
        email: 'cidadao@municipio360.pt',
        password: 'SenhaSegura123',
      },
    },
    civilUserWithAvatar: {
      summary: 'Registo com avatar',
      description:
        'O avatar pode ser enviado como data URL base64 e a role pode ser omitida.',
      value: {
        name: 'Joao Martins',
        biNumber: 'AA112233',
        postalCode: '4700-210',
        email: 'joao.martins@municipio360.pt',
        avatarUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        password: 'SenhaSegura123',
        role: 'CIVIL',
      },
    },
  },
  registerSuccess: {
    registeredCivilUser: {
      summary: 'Utilizador criado',
      value: {
        message: 'Utilizador registado com sucesso',
        user: {
          id: 7,
          name: 'Maria Fernandes',
          biNumber: '12345678',
          postalCode: '1000-123',
          email: 'cidadao@municipio360.pt',
          role: 'CIVIL',
          certStatus: 'CERTIFIED',
          createdAt: '2026-04-05T10:15:30.000Z',
          updatedAt: '2026-04-05T10:15:30.000Z',
        },
      },
    },
  },
  registerBadRequest: {
    invalidPayload: {
      summary: 'Falha de validacao',
      value: {
        statusCode: 400,
        message: [
          'name must be longer than or equal to 3 characters',
          'email must be an email',
          'password must be longer than or equal to 8 characters',
        ],
        error: 'Bad Request',
      },
    },
    invalidAvatar: {
      summary: 'Avatar com payload invalido',
      value: {
        statusCode: 400,
        message: 'Fotografia de perfil invalida',
        error: 'Bad Request',
      },
    },
    oversizedAvatar: {
      summary: 'Avatar acima do limite',
      value: {
        statusCode: 400,
        message: 'A fotografia de perfil nao pode exceder 3 MB',
        error: 'Bad Request',
      },
    },
  },
  registerConflict: {
    duplicatedEmail: {
      summary: 'Email ja existente',
      value: {
        statusCode: 409,
        message: 'Email ja registado',
        error: 'Conflict',
      },
    },
  },
  meSuccess: {
    authenticatedProfile: {
      summary: 'Perfil do utilizador autenticado',
      value: {
        user: {
          id: 7,
          name: 'Maria Fernandes',
          biNumber: '12345678',
          postalCode: '1000-123',
          email: 'cidadao@municipio360.pt',
          avatarUrl:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          role: 'CIVIL',
          certStatus: 'CERTIFIED',
          createdAt: '2026-04-05T10:15:30.000Z',
          updatedAt: '2026-04-05T10:15:30.000Z',
        },
      },
    },
  },
  meUnauthorized: {
    missingOrInvalidToken: {
      summary: 'Token em falta ou invalido',
      value: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
    invalidAuthenticatedUser: {
      summary: 'Token valido sem utilizador correspondente',
      value: {
        statusCode: 401,
        message: 'Utilizador autenticado invalido',
        error: 'Unauthorized',
      },
    },
  },
} as const;
