export type SupportedLanguage = 'pt' | 'en' | 'es' | 'fr';

export type PublicMenuItemSeed = {
  key: 'home' | 'reports' | 'login' | 'register';
  path: string;
  icon: string;
  public: true;
  requiresAuth: false;
};

type MenuLabelSet = {
  appName: string;
  items: Record<PublicMenuItemSeed['key'], string>;
  languages: Record<SupportedLanguage, string>;
};

/**
 * Dados de teste/base usados para montar o menu publico.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 17/03/2026
 * @inv A seed deve conter apenas entradas publicas navegaveis sem autenticacao.
 */
export const PUBLIC_MENU_ITEMS_SEED: PublicMenuItemSeed[] = [
  {
    key: 'home',
    path: '/',
    icon: 'home',
    public: true,
    requiresAuth: false,
  },
  {
    key: 'reports',
    path: '/occurrences/public',
    icon: 'file-text',
    public: true,
    requiresAuth: false,
  },
  {
    key: 'login',
    path: '/login',
    icon: 'log-in',
    public: true,
    requiresAuth: false,
  },
  {
    key: 'register',
    path: '/register',
    icon: 'user-plus',
    public: true,
    requiresAuth: false,
  },
];

export const MENU_LABELS_SEED: Record<SupportedLanguage, MenuLabelSet> = {
  pt: {
    appName: 'Municipio 360',
    items: {
      home: 'Inicio',
      reports: 'Relatorios',
      login: 'Entrar',
      register: 'Registar',
    },
    languages: {
      pt: 'Portugues',
      en: 'English',
      es: 'Espanhol',
      fr: 'Frances',
    },
  },
  en: {
    appName: 'Municipio 360',
    items: {
      home: 'Home',
      reports: 'Reports',
      login: 'Login',
      register: 'Sign up',
    },
    languages: {
      pt: 'Portuguese',
      en: 'English',
      es: 'Spanish',
      fr: 'French',
    },
  },
  es: {
    appName: 'Municipio 360',
    items: {
      home: 'Inicio',
      reports: 'Reportes',
      login: 'Entrar',
      register: 'Registrarse',
    },
    languages: {
      pt: 'Portugues',
      en: 'Ingles',
      es: 'Espanol',
      fr: 'Frances',
    },
  },
  fr: {
    appName: 'Municipio 360',
    items: {
      home: 'Accueil',
      reports: 'Rapports',
      login: 'Connexion',
      register: 'Inscription',
    },
    languages: {
      pt: 'Portugais',
      en: 'Anglais',
      es: 'Espagnol',
      fr: 'Francais',
    },
  },
};
