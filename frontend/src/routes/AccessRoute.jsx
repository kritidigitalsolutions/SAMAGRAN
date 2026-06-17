import { Navigate } from "react-router-dom";
import { getAdminPageAccess, getAdminRole, isAdminTokenValid } from "../utils/auth";

export default function AccessRoute({ children, pageKey, vendorOnly }) {
  if (!isAdminTokenValid()) {
    return <Navigate to="/" replace />;
  }

  const role = getAdminRole();

  if (vendorOnly && role !== "vendor-admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (role !== "vendor-admin") {
    return children;
  }

  const access = getAdminPageAccess();

  if (!pageKey || access.includes(pageKey)) {
    return children;
  }

  return <Navigate to="/dashboard" replace />;
}
