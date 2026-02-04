import axios from "axios";

export const API_URL = "http://localhost:3000";

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
