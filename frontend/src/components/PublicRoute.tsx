/**
 * @description Controla rotas publicas que nao devem ser vistas por utilizadores autenticados.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../services/token";

type PublicRouteProps = {
  children?: ReactNode;
};

/**
 * Renderiza uma rota publica ou redireciona utilizadores autenticados.
 * @param children Conteudo publico opcional a renderizar.
 * @return Elemento React da rota publica, outlet ou redirecionamento.
 * Pre-condicao: O estado de navegacao pode conter uma origem em from.
 * Pos-condicao: Utilizadores autenticados regressam a origem pretendida ou ao dashboard.
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const location = useLocation();
  const from =
    location.state &&
    typeof location.state === "object" &&
    "from" in location.state &&
    typeof (location.state as { from?: unknown }).from === "string"
      ? (location.state as { from: string }).from
      : "/dashboard";

  if (isAuthenticated()) {
    return <Navigate to={from} replace />;
  }

  return children ?? <Outlet />;
}
