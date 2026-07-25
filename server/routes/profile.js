// Imports
import express from "express";
import auth from "../auth.js";
import { fromNodeHeaders } from "better-auth/node";
import db from "../db.js";

const profileRouter = () => {
  // Init the router
  const router = express.Router();

  // GET /api/profile
  router.get("/", async (req, res) => {
    // Send back the profile info as JSON
    try {
      const headers = fromNodeHeaders(req.headers);
      // Get the session from the auth client
      const session = await auth.api.getSession({ headers });
      // If no session, return 401 Unauthorized
      if (!session?.user) {
        return res.status(401).json({ message: "You must be logged in" });
      }

      // Get more info from profile stats via db query
      let profileStats = await db.query(
        "SELECT matches_played, matches_won FROM profile_stats WHERE user_id = $1",
        [session.user.id],
      );
      profileStats = profileStats.rows[0] || {
        matches_played: 0,
        matches_won: 0,
      };

      // Build profile info and return it
      const profileInfo = {
        displayName: session.user.name,
        username: session.user.username,
        matches_played: profileStats.matches_played,
        matches_won: profileStats.matches_won,
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
