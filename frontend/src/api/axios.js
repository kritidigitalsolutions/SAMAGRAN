import axios from "axios";
import {
  getAdminToken,
  clearAdminSession,
  isAdminTokenValid,
} from "../utils/auth";

const baseURL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const API = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ================= REQUEST INTERCEPTOR =================
API.interceptors.request.use(
  (config) => {
    const token = getAdminToken();

    if (token && isAdminTokenValid()) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ================= RESPONSE INTERCEPTOR =================
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔥 If token expired or invalid
    if (error.response?.status === 401) {
      clearAdminSession();

      // redirect to login
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default API;

