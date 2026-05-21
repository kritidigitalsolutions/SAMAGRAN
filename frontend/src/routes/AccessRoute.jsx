import { Navigate } from "react-router-dom";
import { getAdminPageAccess, getAdminRole, isAdminTokenValid } from "../utils/auth";

export default function AccessRoute({ children, pageKey }) {
  if (!isAdminTokenValid()) {
    return <Navigate to="/" replace />;
  }

  const role = getAdminRole();

  if (role !== "vendor-admin") {
    return children;
  }

  const access = getAdminPageAccess();

  if (!pageKey || access.includes(pageKey)) {
    return children;
  }

  return <Navigate to="/dashboard" replace />;
}
