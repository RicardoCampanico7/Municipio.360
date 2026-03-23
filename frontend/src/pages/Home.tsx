import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import "./Home.css";

const SPLASH_DURATION_MS =4000;
const MAIN_PUBLIC_ROUTE = "/dashboard";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate(MAIN_PUBLIC_ROUTE, { replace: true });
    }, SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <main className="home-splash" aria-label="Município 360">
      <div className="home-splash__ambient home-splash__ambient--left" aria-hidden="true" />
      <div className="home-splash__ambient home-splash__ambient--right" aria-hidden="true" />

      <section className="home-splash__card">
        <div className="home-splash__logo-wrap" aria-hidden="true">
          <span className="home-splash__ring home-splash__ring--outer" />
          <span className="home-splash__ring home-splash__ring--inner" />
          <AppLogo className="home-splash__logo" />
        </div>

        <div className="home-splash__copy">
          <p className="home-splash__eyebrow">Município 360</p>
          <h1 className="home-splash__title">A preparar a plataforma municipal</h1>
          <p className="home-splash__subtitle">
            A entrar na área pública para consultar ocorrências e navegar pela aplicação.
          </p>
        </div>

        <div className="home-splash__loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <button
          className="home-splash__skip"
          type="button"
          onClick={() => navigate(MAIN_PUBLIC_ROUTE, { replace: true })}
        >
          Entrar agora
        </button>
      </section>
    </main>
  );
}
