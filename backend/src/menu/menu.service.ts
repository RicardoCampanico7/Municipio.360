import { Injectable } from '@nestjs/common';

type SupportedLanguage = 'pt' | 'en' | 'es' | 'fr';

type MenuLabelSet = {
  appName: string;
  items: {
    home: string;
    map: string;
    create: string;
    reports: string;
    profile: string;
  };
  languages: Record<SupportedLanguage, string>;
};

const MENU_LABELS: Record<SupportedLanguage, MenuLabelSet> = {
  pt: {
    appName: 'Municipio 360',
    items: {
      home: 'Inicio',
      map: 'Mapa',
      create: 'Criar',
      reports: 'Relatorios',
      profile: 'Perfil',
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
      map: 'Map',
      create: 'Create',
      reports: 'Reports',
      profile: 'Profile',
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
      map: 'Mapa',
      create: 'Crear',
      reports: 'Reportes',
      profile: 'Perfil',
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
      map: 'Carte',
      create: 'Creer',
      reports: 'Rapports',
      profile: 'Profil',
    },
    languages: {
      pt: 'Portugais',
      en: 'Anglais',
      es: 'Espagnol',
      fr: 'Francais',
    },
  },
};

/**
 * Gera a representacao publica do menu usada pelo frontend.
 * @author Alan Martynyuk e Guilherme Gaspar
 * @version 16/03/2026
 * @inv O servico deve devolver apenas dados publicos e deterministas para os idiomas suportados.
 */
@Injectable()
export class MenuService {
  /**
   * Normaliza o idioma pedido para um dos idiomas suportados.
   * @param language Codigo de idioma recebido da query string.
   * @return SupportedLanguage Idioma suportado pela API.
   */
  private normalizeLanguage(language?: string): SupportedLanguage {
    const normalized = typeof language === 'string' ? language.trim().toLowerCase() : '';

    if (normalized === 'en' || normalized === 'es' || normalized === 'fr') {
      return normalized;
    }

    return 'pt';
  }

  /**
   * Constroi os dados publicos do menu num determinado idioma.
   * @param language Codigo de idioma opcional.
   * @return Estrutura publica do menu com itens e idiomas disponiveis.
   * Pre-condicao: O idioma pode ser omitido ou ser um dos codigos suportados.
   * Pos-condicao: E sempre devolvida uma estrutura valida, com fallback para portugues.
   */
  getPublicMenu(language?: string) {
    const locale = this.normalizeLanguage(language);
    const labels = MENU_LABELS[locale];

    return {
      appName: labels.appName,
      locale,
      items: [
        {
          key: 'home',
          label: labels.items.home,
          path: '/dashboard',
          icon: 'home',
          public: false,
          requiresAuth: true,
        },
        {
          key: 'map',
          label: labels.items.map,
          path: '/dashboard#map',
          icon: 'map',
          public: false,
          requiresAuth: true,
        },
        {
          key: 'create',
          label: labels.items.create,
          path: '/occurrences/new',
          icon: 'plus',
          public: false,
          requiresAuth: true,
        },
        {
          key: 'reports',
          label: labels.items.reports,
          path: '/dashboard#reports',
          icon: 'file-text',
          public: false,
          requiresAuth: true,
        },
        {
          key: 'profile',
          label: labels.items.profile,
          path: '/dashboard#profile',
          icon: 'user',
          public: false,
          requiresAuth: true,
        },
      ],
      languages: Object.entries(labels.languages).map(([code, label]) => ({
        code,
        label,
      })),
    };
  }
}
