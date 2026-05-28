import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearAccessToken,
  getAccessToken,
  refreshAccessToken,
} from "@/client/lib/auth-session";
import { API_URL } from "./base-url";

export { API_URL } from "./base-url";

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? "";
    const isAuthRoute = requestUrl.includes("/login")
      || requestUrl.includes("/auth/refresh")
      || requestUrl.includes("/auth/logout");

    if (
      error.response?.status !== 401
      || !originalRequest
      || originalRequest._retry
      || isAuthRoute
    ) {
      throw error;
    }

    originalRequest._retry = true;

    const token = await refreshAccessToken();
    if (!token) {
      clearAccessToken();
      throw error;
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${token}`;

    return apiClient(originalRequest);
  },
);

export const saveTheme = async (theme: {
  primary: string;
  accent: string;
  background: string;
}) => {
  try {
    const response = await apiClient.post("/theme", theme);
    return response.data;
  } catch (error) {
    console.error("Error saving theme:", error);
    throw error;
  }
};
