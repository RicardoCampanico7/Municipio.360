export const appSwaggerExamples = {
  helloSuccess: {
    defaultGreeting: {
      summary: 'Saudacao base da API',
      value: 'Hello World!',
    },
  },
  healthSuccess: {
    apiOperational: {
      summary: 'API operacional',
      value: {
        ok: true,
      },
    },
  },
} as const;
