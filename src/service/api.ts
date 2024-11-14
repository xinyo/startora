// services/api.js
import axios from "axios";

const API_URL = "http://localhost:3000"; // URL of your Node.js API

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
