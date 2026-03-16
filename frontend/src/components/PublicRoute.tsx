import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAuthenticated } from "../services/token";

type PublicRouteProps = {
  children?: ReactNode;
};

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
