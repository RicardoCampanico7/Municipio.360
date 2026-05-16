/**
 * @description Protege rotas que exigem sessao autenticada.
 * @author Ricardo Campaniço (a83857)
 * @version 17/05/2026
 */
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAccessToken, getAccessSession } from "../services/token";

type ProtectedRouteProps = {
  children?: ReactNode;
};

/**
 * Renderiza uma rota protegida ou redireciona para o login.
 * @param children Conteudo protegido opcional a renderizar.
 * @return Elemento React da rota protegida, outlet ou redirecionamento.
 * Pre-condicao: A sessao deve conter um token valido para permitir acesso.
 * Pos-condicao: Sessoes invalidas sao limpas antes do redirecionamento.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { token, hadStoredSession } = getAccessSession();

  if (!token) {
    clearAccessToken();
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname, ...(hadStoredSession ? { sessionExpired: true } : {}) }}
      />
    );
  }

  return children ?? <Outlet />;
}
