import axios from "axios";
import { apiClient, API_URL } from "./config";

export const login = async (username: string, password: string) => {
  try {
    const response = await axios.post(
      `${API_URL}/login`,
      { username, password },
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

export const refreshSession = async () => {
  try {
    const response = await axios.post(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    return response.data;
  } catch (error) {
    console.error("Error refreshing session:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await axios.post(
      `${API_URL}/auth/logout`,
      {},
      { withCredentials: true },
    );
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

export const getUsers = async (): Promise<
  { id: number; name: string; email: string }[]
> => {
  try {
    const response = await apiClient.get("/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const getUser = async (
  id: number,
): Promise<{
  id: number;
  name: string;
  email: string;
  avatar?: string;
  isAdmin?: boolean;
  isActive?: boolean;
}> => {
  try {
    const response = await apiClient.get(`/user/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const addUser = async (username: string, password: string) => {
  console.log("Adding user in api:", username, password);
  try {
    const response = await apiClient.post("/users", { username, password });
    return response.data;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
};
