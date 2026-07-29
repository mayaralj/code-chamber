// Imports
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// Create auth client
const authClient = createAuthClient({
  // server URL
  baseURL: "http://localhost:5000",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [usernameClient()],
});

export default authClient;
