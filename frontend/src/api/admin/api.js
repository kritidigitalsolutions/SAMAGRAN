import axios from "axios";
import { getAdminToken } from "../../utils/auth";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const adminApi = axios.create({
  baseURL: `${API_URL}/admin`,
});

adminApi.interceptors.request.use(
  (config) => {
    const token = getAdminToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);