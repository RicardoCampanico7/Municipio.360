/**
 * @description Apresenta o logotipo oficial do Municipio 360.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
type AppLogoProps = {
  className?: string;
};

/**
 * Renderiza a imagem do logotipo da aplicacao.
 * @param className Classe CSS opcional aplicada a imagem.
 * @return Elemento React de imagem com texto alternativo da marca.
 */
export default function AppLogo({ className }: AppLogoProps) {
  return <img className={className} src="/logo.png" alt="Municipio 360" />;
}
