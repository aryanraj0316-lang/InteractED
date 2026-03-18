import * as SecureStore from "expo-secure-store";

// ─────────────────────────────────────────────────────────────────
// 🔧 SWITCH THIS to false when testing locally, true for production
const USE_PROD = false;
// ─────────────────────────────────────────────────────────────────

const LOCAL_URL = "http://10.58.200.177:5000"; // ← replace x.x with your PC's IP (run `ipconfig` in PowerShell)
const PROD_URL  = "https://interacted-backend.onrender.com";

export const API_URL = USE_PROD ? PROD_URL : LOCAL_URL;

// ─────────────────────────────────────────────────────────────────
// apiRequest supports TWO calling styles:
//
// OLD style (used in existing screens):
//   apiRequest("/api/notes", "GET")
//   apiRequest("/api/notes", "POST", { title: "..." })
//
// NEW style (used in new screens):
//   apiRequest("/api/notes")
//   apiRequest("/api/notes", { method: "POST", body: JSON.stringify({...}) })
// ─────────────────────────────────────────────────────────────────
export const apiRequest = async (endpoint, methodOrOptions = "GET", body = null) => {
  let method, headers_extra, bodyString;

  // Detect which calling style is being used
  if (typeof methodOrOptions === "string") {
    // OLD style: apiRequest(endpoint, "POST", bodyObject)
    method = methodOrOptions;
    bodyString = body ? JSON.stringify(body) : undefined;
  } else {
    // NEW style: apiRequest(endpoint, { method, body, headers })
    const opts = methodOrOptions;
    method = opts.method || "GET";
    bodyString = opts.body || undefined;   // already stringified by caller
    headers_extra = opts.headers || {};
  }

  console.log("API CALL:", method, endpoint);

  const token = await SecureStore.getItemAsync("userToken");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers_extra || {}),
  };

  try {
    const controller = new AbortController();
    // Longer timeout locally (no cold start), shorter enough to fail fast
    const timeoutId = setTimeout(() => controller.abort(), USE_PROD ? 15000 : 8000);

    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: bodyString,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      const errorBody = await response.text();
      console.error("RAW SERVER ERROR:", errorBody.substring(0, 200));
      throw new Error("Server returned HTML instead of JSON. Check server logs.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        USE_PROD
          ? "Server took too long to wake up. Please try again."
          : "Local server not responding. Is `node server.js` running?"
      );
    }
    console.error("API ERROR:", error.message);
    throw error;
  }
};