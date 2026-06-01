export const getHostRole = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname.toLowerCase();

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "admin";
  }

  if (hostname.endsWith(".localhost")) {
    const [subdomain] = hostname.split(".");

    if (subdomain === "admin" || subdomain === "vendor" || subdomain === "delivery") {
      return subdomain;
    }
  }

  return null;
};
