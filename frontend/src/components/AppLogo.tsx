type AppLogoProps = {
  className?: string;
};

export default function AppLogo({ className }: AppLogoProps) {
  return <img className={className} src="/logo.png" alt="Municipio 360" />;
}
