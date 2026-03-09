import * as SecureStore from "expo-secure-store";

// 🔗 Your Live Render URL
const API_URL = "http://10.64.244.177:5000";

export const apiRequest = async (endpoint, method = "GET", body = null) => {
  // 🔹 Log every API call
  console.log("API CALL:", method, endpoint, body);

  const token = await SecureStore.getItemAsync("userToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    // Added a 15-second timeout to allow for Render "wake up" time
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");

    // Safety check: If Render sends HTML (like a 404), this catches it
    if (!contentType || !contentType.includes("application/json")) {
      const errorBody = await response.text();
      console.error("RAW SERVER ERROR:", errorBody.substring(0, 200));
      throw new Error("Server returned HTML instead of JSON. Check Render logs.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Server took too long to wake up. Please try again.");
    }
    console.error("API ERROR:", error.message);
    throw error;
  }
};