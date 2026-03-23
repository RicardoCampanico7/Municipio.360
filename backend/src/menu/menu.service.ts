import { Injectable } from '@nestjs/common';
import {
  MENU_LABELS_SEED,
  PUBLIC_MENU_ITEMS_SEED,
  type SupportedLanguage,
} from './menu.seed';

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
    const normalized =
      typeof language === 'string' ? language.trim().toLowerCase() : '';

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
    const labels = MENU_LABELS_SEED[locale];

    return {
      appName: labels.appName,
      locale,
      items: PUBLIC_MENU_ITEMS_SEED.map((item) => ({
        ...item,
        label: labels.items[item.key],
      })),
      languages: Object.entries(labels.languages).map(([code, label]) => ({
        code,
        label,
      })),
    };
  }
}
