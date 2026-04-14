import { Navigate } from "react-router-dom";
import { isAdminTokenValid } from "../utils/auth";

export default function PrivateRoute({ children }) {
  if (!isAdminTokenValid()) {
    return <Navigate to="/" replace />;
  }

  return children;
}
