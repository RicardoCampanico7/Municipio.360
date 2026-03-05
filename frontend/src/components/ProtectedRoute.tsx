import { Navigate, Outlet } from "react-router-dom";
import { clearAccessToken, isAuthenticated } from "../services/token";

export default function ProtectedRoute() {
  if (!isAuthenticated()) {
    clearAccessToken();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
