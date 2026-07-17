// Imports
import { createAuthClient } from "better-auth/react";

// Create auth client
const authClient = createAuthClient({
  // server URL
  baseURL: "http://localhost:5000",
  fetchOptions: {
    credentials: "include",
  },
});

export default authClient;
