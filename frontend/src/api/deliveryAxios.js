import axios from "axios";
import {
  getDeliveryToken,
  clearDeliverySession,
  isDeliveryTokenValid,
} from "../utils/deliveryAuth";

const baseURL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

const DeliveryAPI = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

DeliveryAPI.interceptors.request.use(
  (config) => {
    const token = getDeliveryToken();

    if (token && isDeliveryTokenValid()) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

DeliveryAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearDeliverySession();
      window.location.href = "/delivery/login";
    }

    return Promise.reject(error);
  }
);

export default DeliveryAPI;
