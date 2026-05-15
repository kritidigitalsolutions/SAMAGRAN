const DELIVERY_TOKEN_KEY = "deliveryToken";
const DELIVERY_TOKEN_EXPIRY_KEY = "deliveryTokenExpiresAt";
const DELIVERY_PROFILE_KEY = "deliveryProfile";

const decodeJwtPayload = (token) => {
  try {
    const payload = token.split(".")[1];
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );
    const decodedPayload = atob(paddedPayload);
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

export const clearDeliverySession = () => {
  sessionStorage.removeItem(DELIVERY_TOKEN_KEY);
  sessionStorage.removeItem(DELIVERY_TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(DELIVERY_PROFILE_KEY);
};

export const setDeliverySession = (token, deliveryBoy) => {
  const payload = decodeJwtPayload(token);

  sessionStorage.setItem(DELIVERY_TOKEN_KEY, token);

  if (deliveryBoy) {
    sessionStorage.setItem(DELIVERY_PROFILE_KEY, JSON.stringify(deliveryBoy));
  }

  if (payload?.exp) {
    sessionStorage.setItem(DELIVERY_TOKEN_EXPIRY_KEY, String(payload.exp * 1000));
  } else {
    sessionStorage.removeItem(DELIVERY_TOKEN_EXPIRY_KEY);
  }
};

export const getDeliveryToken = () => sessionStorage.getItem(DELIVERY_TOKEN_KEY);

export const getStoredDeliveryBoy = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DELIVERY_PROFILE_KEY) || "null");
  } catch {
    return null;
  }
};

export const setStoredDeliveryBoy = (deliveryBoy) => {
  if (deliveryBoy) {
    sessionStorage.setItem(DELIVERY_PROFILE_KEY, JSON.stringify(deliveryBoy));
  }
};

export const isDeliveryTokenValid = () => {
  const token = getDeliveryToken();

  if (!token) {
    return false;
  }

  const expiresAt = Number(sessionStorage.getItem(DELIVERY_TOKEN_EXPIRY_KEY));
  const payload = decodeJwtPayload(token);
  const expiryTime = expiresAt || (payload?.exp ? payload.exp * 1000 : 0);

  if (payload?.role !== "delivery" || !expiryTime || Date.now() >= expiryTime) {
    clearDeliverySession();
    return false;
  }

  return true;
};
