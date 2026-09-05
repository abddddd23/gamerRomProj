import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ adminOnly = false, allowPasswordChange = false }: { adminOnly?: boolean; allowPasswordChange?: boolean }) {
  const { token, isAdmin, user } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace />;
  if (user?.must_change_password && !allowPasswordChange) {
    return <Navigate to="/change-password" replace state={{ from: location.pathname }} />;
  }
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}
