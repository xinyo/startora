import axios from "axios";
import { API_URL } from "./config";

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
