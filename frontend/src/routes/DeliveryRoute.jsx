import { Navigate } from "react-router-dom";
import { isDeliveryTokenValid } from "../utils/deliveryAuth";

export default function DeliveryRoute({ children }) {
  if (!isDeliveryTokenValid()) {
    return <Navigate to="/delivery/login" replace />;
  }

  return children;
}
