export const occurrencesSwaggerExamples = {
  authorizationHeader:
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjcsIm5hbWUiOiJNYXJpYSBGZXJuYW5kZXMiLCJlbWFpbCI6ImNpZGFkYW9AbXVuaWNpcGlvMzYwLnB0Iiwicm9sZSI6IkNJVklMIiwiY2VydFN0YXR1cyI6IkNFUlRJRklFRCIsImF1dGhWZXJzaW9uIjowLCJpYXQiOjE3NDM4NDgxMzAsImV4cCI6MTc0Mzg1MTczMH0.signature',
  publicListSuccess: {
    visibleOccurrences: {
      summary: 'Ocorrencias publicas',
      value: [
        {
          id: 21,
          category: 'Iluminacao publica',
          categoryKey: 'ILUMINACAO_PUBLICA',
          title: 'Iluminacao publica',
          otherCategoryDetail: null,
          description: 'O candeeiro esta apagado ha 3 dias.',
          location: 'Rua da Escola, junto ao numero 12',
          imageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
          status: 'open',
          statusKey: 'SUBMETIDA',
          createdAt: '2026-04-05T10:15:30.000Z',
          updatedAt: '2026-04-05T10:15:30.000Z',
        },
      ],
    },
  },
  publicDetailSuccess: {
    visibleOccurrence: {
      summary: 'Detalhe publico',
      value: {
        id: 21,
        category: 'Iluminacao publica',
        categoryKey: 'ILUMINACAO_PUBLICA',
        title: 'Iluminacao publica',
        otherCategoryDetail: null,
        description: 'O candeeiro esta apagado ha 3 dias.',
        location: 'Rua da Escola, junto ao numero 12',
        imageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
        status: 'progress',
        statusKey: 'EM_TRATAMENTO',
        createdAt: '2026-04-05T10:15:30.000Z',
        updatedAt: '2026-04-06T09:30:00.000Z',
      },
    },
  },
  ownerListSuccess: {
    ownOccurrences: {
      summary: 'Ocorrencias do cidadao autenticado',
      value: [
        {
          id: 21,
          category: 'Iluminacao publica',
          categoryKey: 'ILUMINACAO_PUBLICA',
          title: 'Iluminacao publica',
          otherCategoryDetail: null,
          description: 'O candeeiro esta apagado ha 3 dias.',
          location: 'Rua da Escola, junto ao numero 12',
          imageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
          status: 'open',
          statusKey: 'SUBMETIDA',
          userId: 7,
          createdAt: '2026-04-05T10:15:30.000Z',
          updatedAt: '2026-04-05T10:15:30.000Z',
        },
      ],
    },
  },
  ownerDetailSuccess: {
    ownOccurrenceWithHistory: {
      summary: 'Detalhe com historico de estados',
      value: {
        id: 21,
        category: 'Iluminacao publica',
        categoryKey: 'ILUMINACAO_PUBLICA',
        title: 'Iluminacao publica',
        otherCategoryDetail: null,
        description: 'O candeeiro esta apagado ha 3 dias.',
        location: 'Rua da Escola, junto ao numero 12',
        imageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
        status: 'progress',
        statusKey: 'EM_TRATAMENTO',
        userId: 7,
        createdAt: '2026-04-05T10:15:30.000Z',
        updatedAt: '2026-04-06T09:30:00.000Z',
        statusHistory: [
          {
            id: 1,
            status: 'open',
            statusKey: 'SUBMETIDA',
            createdAt: '2026-04-05T10:15:30.000Z',
          },
          {
            id: 2,
            status: 'progress',
            statusKey: 'EM_TRATAMENTO',
            createdAt: '2026-04-06T09:30:00.000Z',
          },
        ],
      },
    },
  },
  operatorListSuccess: {
    managementOccurrences: {
      summary: 'Ocorrencias para gestao interna',
      value: [
        {
          id: 21,
          category: 'ILUMINACAO_PUBLICA',
          otherCategoryDetail: null,
          description: 'O candeeiro esta apagado ha 3 dias.',
          location: 'Rua da Escola, junto ao numero 12',
          imageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
          status: 'EM_TRATAMENTO',
          userId: 7,
          createdAt: '2026-04-05T10:15:30.000Z',
          updatedAt: '2026-04-06T09:30:00.000Z',
          user: {
            id: 7,
            name: 'Maria Fernandes',
            email: 'cidadao@municipio360.pt',
            postalCode: '1000-123',
            role: 'CIVIL',
            certStatus: 'CERTIFIED',
          },
          internalComments: [],
        },
      ],
    },
  },
  operatorDetailSuccess: {
    managementOccurrence: {
      summary: 'Detalhe interno com comentarios',
      value: {
        id: 21,
        category: 'ILUMINACAO_PUBLICA',
        otherCategoryDetail: null,
        description: 'O candeeiro esta apagado ha 3 dias.',
        location: 'Rua da Escola, junto ao numero 12',
        imageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
        status: 'EM_TRATAMENTO',
        userId: 7,
        createdAt: '2026-04-05T10:15:30.000Z',
        updatedAt: '2026-04-06T09:30:00.000Z',
        user: {
          id: 7,
          name: 'Maria Fernandes',
          email: 'cidadao@municipio360.pt',
          postalCode: '1000-123',
          role: 'CIVIL',
          certStatus: 'CERTIFIED',
        },
        internalComments: [
          {
            id: 10,
            content:
              'Equipa de manutencao notificada para verificacao no local.',
            occurrenceId: 21,
            userId: 3,
            createdAt: '2026-04-06T09:35:00.000Z',
            updatedAt: '2026-04-06T09:35:00.000Z',
            user: {
              id: 3,
              name: 'Operador Municipal',
              email: 'operador@municipio360.pt',
              role: 'OPERADOR',
            },
          },
        ],
      },
    },
  },
  uploadImagesRequest: {
    imageFiles: {
      summary: 'Upload multipart',
      value: {
        imageUrls: ['foto-1.jpg', 'foto-2.png'],
      },
    },
  },
  uploadImagesSuccess: {
    uploadedImages: {
      summary: 'URLs publicas geradas',
      value: {
        imageUrls: [
          '/uploads/occurrences/1712310000000-foto-1.jpg',
          '/uploads/occurrences/1712310000001-foto-2.png',
        ],
      },
    },
  },
  createRequest: {
    jsonWithPreviouslyUploadedImages: {
      summary: 'JSON com URLs previamente carregadas',
      description:
        'Usa URLs devolvidas por POST /occurrences/images. O alias legado imageUrls tambem e aceite em JSON.',
      value: {
        category: 'ILUMINACAO_PUBLICA',
        description: 'O candeeiro esta apagado ha 3 dias.',
        location: 'Rua da Escola, junto ao numero 12',
        uploadedImageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
      },
    },
    jsonOtherCategory: {
      summary: 'Categoria OUTROS',
      value: {
        category: 'OUTROS',
        otherCategoryDetail: 'Mobiliario urbano danificado',
        description: 'Banco de jardim partido.',
        location: 'Jardim Municipal',
        uploadedImageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
      },
    },
    multipartWithFiles: {
      summary: 'Multipart com ficheiros',
      description:
        'Em multipart/form-data, imageUrls e o nome do campo dos ficheiros.',
      value: {
        category: 'LIMPEZA_URBANA',
        description: 'Contentor cheio ha varios dias.',
        location: 'Praca Central',
        imageUrls: ['foto-1.jpg'],
      },
    },
  },
  createSuccess: {
    submittedOccurrence: {
      summary: 'Ocorrencia criada',
      value: {
        id: 21,
        category: 'Iluminacao publica',
        categoryKey: 'ILUMINACAO_PUBLICA',
        title: 'Iluminacao publica',
        otherCategoryDetail: null,
        description: 'O candeeiro esta apagado ha 3 dias.',
        location: 'Rua da Escola, junto ao numero 12',
        imageUrls: ['/uploads/occurrences/1712310000000-foto-1.jpg'],
        status: 'open',
        statusKey: 'SUBMETIDA',
        userId: 7,
        createdAt: '2026-04-05T10:15:30.000Z',
        updatedAt: '2026-04-05T10:15:30.000Z',
      },
    },
  },
  internalCommentRequest: {
    operationalNote: {
      summary: 'Comentario interno',
      value: {
        content: 'Equipa de manutencao notificada para verificacao no local.',
      },
    },
  },
  internalCommentSuccess: {
    createdComment: {
      summary: 'Comentario criado',
      value: {
        id: 10,
        content: 'Equipa de manutencao notificada para verificacao no local.',
        occurrenceId: 21,
        userId: 3,
        createdAt: '2026-04-06T09:35:00.000Z',
        updatedAt: '2026-04-06T09:35:00.000Z',
        user: {
          id: 3,
          name: 'Operador Municipal',
          email: 'operador@municipio360.pt',
          role: 'OPERADOR',
        },
      },
    },
  },
  updateRequest: {
    updateEditableFields: {
      summary: 'Atualizacao interna',
      value: {
        category: 'OUTROS',
        otherCategoryDetail: 'Passadeira apagada',
        location: 'Avenida Central, Faro',
        description: 'Sinal partido junto a escola',
      },
    },
  },
  updateStatusRequest: {
    moveToProgress: {
      summary: 'Transicao permitida',
      value: {
        status: 'EM_TRATAMENTO',
      },
    },
  },
  badRequest: {
    validationError: {
      summary: 'Falha de validacao',
      value: {
        statusCode: 400,
        message: ['A localizacao da ocorrencia e obrigatoria'],
        error: 'Bad Request',
      },
    },
    invalidTransition: {
      summary: 'Transicao de estado invalida',
      value: {
        statusCode: 400,
        message: 'Transicao de estado invalida: SUBMETIDA -> CONCLUIDA',
        error: 'Bad Request',
      },
    },
    missingImage: {
      summary: 'Fotografia obrigatoria',
      value: {
        statusCode: 400,
        message: 'A fotografia da ocorrencia e obrigatoria',
        error: 'Bad Request',
      },
    },
  },
  unauthorized: {
    missingOrInvalidToken: {
      summary: 'Token em falta ou invalido',
      value: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
    invalidAuthenticatedUser: {
      summary: 'Utilizador autenticado invalido',
      value: {
        statusCode: 401,
        message: 'Utilizador autenticado invalido',
        error: 'Unauthorized',
      },
    },
  },
  forbidden: {
    wrongRole: {
      summary: 'Role sem permissao',
      value: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },
    },
    accountNotCertified: {
      summary: 'Conta civil nao certificada',
      value: {
        statusCode: 403,
        message: 'A conta precisa de estar certificada para criar ocorrencias',
        error: 'Forbidden',
      },
    },
  },
  notFound: {
    missingOccurrence: {
      summary: 'Ocorrencia inexistente',
      value: {
        statusCode: 404,
        message: 'Ocorrencia nao encontrada',
        error: 'Not Found',
      },
    },
  },
} as const;
