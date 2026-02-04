import axios from "axios";
import { API_URL } from "./config";

// Function to fetch users
export const getUsers = async (): Promise<
  { id: number; name: string; email: string }[]
> => {
  try {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const getUser = async (
  id: number
): Promise<{
  id: number;
  name: string;
  email: string;
  avatar?: string;
  isAdmin?: boolean;
  isActive?: boolean;
}> => {
  try {
    const response = await axios.get(`${API_URL}/user/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

// Function to add a user
export const addUser = async (name: string, email: string) => {
  try {
    const response = await axios.post(`${API_URL}/users`, { name, email });
    return response.data;
  } catch (error) {
    console.error("Error adding user:", error);
    throw error;
  }
};
