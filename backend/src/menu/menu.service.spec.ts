import { MenuService } from './menu.service';
import { PUBLIC_MENU_ITEMS_SEED } from './menu.seed';

/**
 * Valida o comportamento do servico publico de menu.
 */
describe('MenuService', () => {
  let service: MenuService;

  /**
   * Instancia o servico antes de cada caso de teste.
   * @return void
   */
  beforeEach(() => {
    service = new MenuService();
  });

  /**
   * Verifica o fallback por omissao para portugues.
   * @return void
   */
  it('should return Portuguese menu by default', () => {
    const result = service.getPublicMenu();

    expect(result.locale).toBe('pt');
    expect(result.items).toHaveLength(4);
    expect(result.items[0]).toMatchObject({
      key: 'home',
      label: 'Inicio',
      path: '/',
      public: true,
      requiresAuth: false,
    });
  });

  /**
   * Verifica o fallback para idiomas nao suportados.
   * @return void
   */
  it('should fallback to Portuguese for unsupported languages', () => {
    const result = service.getPublicMenu('de');

    expect(result.locale).toBe('pt');
  });

  /**
   * Verifica a traducao correta para um idioma suportado.
   * @return void
   */
  it('should return translated labels for supported languages', () => {
    const result = service.getPublicMenu('en');

    expect(result.locale).toBe('en');
    expect(result.items[0]).toMatchObject({
      key: 'home',
      label: 'Home',
    });
  });

  /**
   * Verifica se o menu devolve apenas entradas publicas e navegaveis.
   * @return void
   */
  it('should return only public routes that do not require authentication', () => {
    const result = service.getPublicMenu('pt');

    expect(result.items).toHaveLength(PUBLIC_MENU_ITEMS_SEED.length);
    expect(result.items).toEqual(
      expect.arrayContaining(
        PUBLIC_MENU_ITEMS_SEED.map((item) =>
          expect.objectContaining({
            key: item.key,
            path: item.path,
            icon: item.icon,
            public: true,
            requiresAuth: false,
          }),
        ),
      ),
    );
  });
});
