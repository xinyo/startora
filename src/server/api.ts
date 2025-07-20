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

//fetch user's apps
export const getUserApps = async (userId: number): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_URL}/user/${userId}/apps`);
    return response.data.map((app: any) => ({
      id: app.id,
      appName: app.app_name,
      appData: app.app_data,
    }));
  } catch (error) {
    console.error("Error fetching user's apps:", error);
    throw error;
  }
};

//add a new app for the user
export const addUserApp = async (
  userId: number,
  appName: string,
  appData: any
): Promise<any> => {
  try {
    const response = await axios.post(`${API_URL}/user/${userId}/apps`, {
      appName,
      appData,
    });
    return {
      appName: response.data.app_name,
      appData: response.data.app_data,
      id: response.data.id,
    };
  } catch (error) {
    console.error("Error adding user app:", error);
    throw error;
  }
};

export const putUserApp = async (
  userId: number,
  appName: string,
  appData: any,
  appId: number
): Promise<any> => {
  try {
    const response = await axios.put(
      `${API_URL}/user/${userId}/apps/${appId}`,
      {
        appName,
        appData,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating user app:", error);
    throw error;
  }
};

export const deleteUserApp = async (
  userId: number,
  appId: number
): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/user/${userId}/apps/${appId}`);
  } catch (error) {
    console.error("Error deleting user app:", error);
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
