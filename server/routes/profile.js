// Imports
import express from "express";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";

const profileRouter = () => {
  // Init the router
  const router = express.Router();

  // GET /api/profile
  router.get("/", async (req, res) => {
    // Send back the profile info as JSON
    try {
      const headers = fromNodeHeaders(req.headers);
      const session = await auth.api.getSession({ headers });
      if (!session?.user) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      const profileInfo = {
        username: session.user.name,
      };
      console.log("Profile info fetched for user:", profileInfo);
      return res.json(profileInfo);
    } catch (error) {
      console.error("Error fetching profile info:", error);
      return res.status(500).json({ message: "Failed to get profile info" });
    }
  });

  // Return the router
  return router;
};

// Export the router
export default profileRouter;
