// Imports
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// Create auth client
const authClient = createAuthClient({
  // server URL
  baseURL: import.meta.env.VITE_APP_URL,
  fetchOptions: {
    credentials: "include",
    timeout: 5000,
  },
  plugins: [usernameClient()],
});

export default authClient;
