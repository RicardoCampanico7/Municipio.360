import { MenuService } from './menu.service';

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
    expect(result.items).toHaveLength(5);
    expect(result.items[0]).toMatchObject({
      key: 'home',
      label: 'Inicio',
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
});
