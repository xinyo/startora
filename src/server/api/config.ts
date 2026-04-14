import axios from "axios";

export const API_URL = "http://localhost:3000";

// Add axios interceptor to include JWT token in all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401/403 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired or invalid - clear storage and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("session");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// function to save theme to db
export const saveTheme = async (theme: {
  primary: string;
  accent: string;
  background: string;
}) => {
  try {
    const response = await axios.post(`${API_URL}/theme`, theme);
    return response.data;
  } catch (error) {
    console.error("Error saving theme:", error);
    throw error;
  }
};
