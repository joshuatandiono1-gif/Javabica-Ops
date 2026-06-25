import { Navigate, Outlet } from "react-router-dom";
import { getStoredUser, getToken, isAdminUser, isSalesUser } from "./api";

export function ProtectedRoute() {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function PublicRoute() {
  if (getToken()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

export function AdminRoute() {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdminUser()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

export function SalesRoute() {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (!isSalesUser()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
