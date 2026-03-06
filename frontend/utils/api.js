import * as SecureStore from "expo-secure-store";

// 🔗 ngrok base URL (NO trailing slash)
const API_URL = "https://interacted-backend.onrender.com";

export const apiRequest = async (endpoint, method = "GET", body = null) => {
  const token = await SecureStore.getItemAsync("userToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Server did not return JSON");
    }

    return await response.json();
  } catch (error) {
    console.error("API ERROR:", error.message);
    throw error;
  }
};
