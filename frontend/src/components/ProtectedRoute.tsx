import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearAccessToken, getRawAccessToken, isAuthenticated } from "../services/token";

type ProtectedRouteProps = {
  children?: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated()) {
    const hadStoredSession = !!getRawAccessToken();
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
