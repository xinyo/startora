import axios from "axios";
// Create a shared axios instance
const api = axios.create({
  baseURL: "localhost:3000", // ← your API base URL
  withCredentials: true, // ← critical: sends cookies cross-origin
});

// All requests now automatically include the JWT cookie
// const { data } = await api.get("/api/profile");
