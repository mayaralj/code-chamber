// Imports
import { createAuthClient } from "better-auth/react";

// Create auth client
const authClient = createAuthClient({
  // server URL
  baseUrl: "http://localhost:5000",
});

export default authClient;
