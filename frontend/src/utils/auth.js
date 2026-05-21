const TOKEN_KEY = "adminToken";
const TOKEN_EXPIRY_KEY = "adminTokenExpiresAt";
const ADMIN_KEY = "adminProfile";

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

const getTokenPayload = () => {
  const token = getAdminToken();
  return token ? decodeJwtPayload(token) : null;
};

export const clearAdminSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
};

export const setAdminSession = (token, admin) => {
  const payload = decodeJwtPayload(token);

  sessionStorage.setItem(TOKEN_KEY, token);

  if (admin) {
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  }

  if (payload?.exp) {
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(payload.exp * 1000));
  } else {
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
};

export const getAdminToken = () => sessionStorage.getItem(TOKEN_KEY);

export const getStoredAdmin = () => {
  try {
    return JSON.parse(sessionStorage.getItem(ADMIN_KEY) || "null");
  } catch {
    return null;
  }
};

export const getAdminRole = () => {
  const payload = getTokenPayload();
  if (payload?.role) {
    if (payload.role === "super") {
      return "super-admin";
    }
    if (payload.role === "vendor") {
      return "vendor-admin";
    }
    return payload.role;
  }
  if (payload?.isVendor) {
    return "vendor-admin";
  }
  const admin = getStoredAdmin();
  if (admin?.role) {
    if (admin.role === "super") {
      return "super-admin";
    }
    if (admin.role === "vendor") {
      return "vendor-admin";
    }
    return admin.role;
  }
  return "super-admin";
};

export const getAdminPageAccess = () => {
  const payload = getTokenPayload();
  if (Array.isArray(payload?.pageAccess)) {
    return payload.pageAccess;
  }
  const admin = getStoredAdmin();
  const access = admin?.pageAccess || admin?.vendor?.pageAccess || [];
  return Array.isArray(access) ? access : [];
};

export const setStoredAdmin = (admin) => {
  if (admin) {
    sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  }
};

export const isAdminTokenValid = () => {
  const token = getAdminToken();

  if (!token) {
    return false;
  }

  const expiresAt = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY));
  const payload = decodeJwtPayload(token);
  const expiryTime = expiresAt || (payload?.exp ? payload.exp * 1000 : 0);

  if (!payload?.isAdmin || !expiryTime || Date.now() >= expiryTime) {
    clearAdminSession();
    return false;
  }

  return true;
};
