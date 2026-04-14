export const menuSwaggerExamples = {
  publicMenuSuccess: {
    defaultPortugueseMenu: {
      summary: 'Menu por omissao em portugues',
      description:
        'Quando o parametro lang nao e enviado, a API devolve o menu em portugues.',
      value: {
        appName: 'Municipio 360',
        locale: 'pt',
        items: [
          {
            key: 'home',
            path: '/',
            icon: 'home',
            public: true,
            requiresAuth: false,
            label: 'Inicio',
          },
          {
            key: 'reports',
            path: '/occurrences/public',
            icon: 'file-text',
            public: true,
            requiresAuth: false,
            label: 'Relatorios',
          },
          {
            key: 'login',
            path: '/login',
            icon: 'log-in',
            public: true,
            requiresAuth: false,
            label: 'Entrar',
          },
          {
            key: 'register',
            path: '/register',
            icon: 'user-plus',
            public: true,
            requiresAuth: false,
            label: 'Registar',
          },
        ],
        languages: [
          { code: 'pt', label: 'Portugues' },
          { code: 'en', label: 'English' },
          { code: 'es', label: 'Espanhol' },
          { code: 'fr', label: 'Frances' },
        ],
      },
    },
    englishMenu: {
      summary: 'Menu em ingles com ?lang=en',
      value: {
        appName: 'Municipio 360',
        locale: 'en',
        items: [
          {
            key: 'home',
            path: '/',
            icon: 'home',
            public: true,
            requiresAuth: false,
            label: 'Home',
          },
          {
            key: 'reports',
            path: '/occurrences/public',
            icon: 'file-text',
            public: true,
            requiresAuth: false,
            label: 'Reports',
          },
          {
            key: 'login',
            path: '/login',
            icon: 'log-in',
            public: true,
            requiresAuth: false,
            label: 'Login',
          },
          {
            key: 'register',
            path: '/register',
            icon: 'user-plus',
            public: true,
            requiresAuth: false,
            label: 'Sign up',
          },
        ],
        languages: [
          { code: 'pt', label: 'Portuguese' },
          { code: 'en', label: 'English' },
          { code: 'es', label: 'Spanish' },
          { code: 'fr', label: 'French' },
        ],
      },
    },
    unsupportedLanguageFallback: {
      summary: 'Fallback para portugues com ?lang=de',
      description:
        'Idiomas nao suportados fazem fallback automatico para portugues.',
      value: {
        appName: 'Municipio 360',
        locale: 'pt',
        items: [
          {
            key: 'home',
            path: '/',
            icon: 'home',
            public: true,
            requiresAuth: false,
            label: 'Inicio',
          },
          {
            key: 'reports',
            path: '/occurrences/public',
            icon: 'file-text',
            public: true,
            requiresAuth: false,
            label: 'Relatorios',
          },
          {
            key: 'login',
            path: '/login',
            icon: 'log-in',
            public: true,
            requiresAuth: false,
            label: 'Entrar',
          },
          {
            key: 'register',
            path: '/register',
            icon: 'user-plus',
            public: true,
            requiresAuth: false,
            label: 'Registar',
          },
        ],
        languages: [
          { code: 'pt', label: 'Portugues' },
          { code: 'en', label: 'English' },
          { code: 'es', label: 'Espanhol' },
          { code: 'fr', label: 'Frances' },
        ],
      },
    },
  },
} as const;
