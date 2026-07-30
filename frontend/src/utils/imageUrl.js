import API from "../api/axios";

/**
 * Get dynamic API origin from environment variable or axios baseURL.
 * In production: reads process.env.REACT_APP_API_URL / REACT_APP_BASE_URL or API.defaults.baseURL
 * Fallback: "http://localhost:8000"
 */
export const getApiOrigin = () => {
  const envUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL || "";
  const baseURL = envUrl || API.defaults.baseURL || "http://localhost:8000/api";
  return String(baseURL).replace(/\/api\/?$/, "").replace(/\/+$/, "");
};

/**
 * Dynamically format image URLs for production & local environments.
 * Handles full URLs (https://..., http://..., data:..., blob:...) as well as relative paths.
 */
export const formatImageUrl = (path) => {
  if (!path) return "";
  const pathStr = String(path).trim();
  if (/^(https?:|data:|blob:)/i.test(pathStr)) {
    return pathStr;
  }
  const origin = getApiOrigin();
  const cleanPath = pathStr.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${origin}/${cleanPath}`;
};

export default formatImageUrl;
