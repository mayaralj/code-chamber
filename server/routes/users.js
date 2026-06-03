// Imports
import express from "express";

// Router
const router = express.Router();

// Some hardcoded users
const users = [
  {
    id: 1,
    username: "Bob",
  },
  {
    id: 2,
    username: "Charlie",
  },
  {
    id: 3,
    username: "David",
  },
];

// Routes

// Get /api/users
router.get("/", (req, res) => {
  // return the users as JSON
  res.json(users);
});

// Post /api/users
router.post("/", (req, res) => {
  const { username } = req.body;
  // Check if username exists
  if (!username) {
    // Send back an error message if username is missing
    return res.status(400).json({ message: "Username is required" });
  }

  // If username exists, proceed with the new user
  const newUser = { id: users.length + 1, username };
  users.push(newUser);
  res.status(201).json(newUser);
});

// Export the router
export default router;
