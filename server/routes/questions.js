// Imports
import express from "express";

// Init the router
const router = express.Router();

// Questions (keeping them hardcoded for now)
const questions = [
  {
    id: 1,
    question: "Two Sum",
    difficulty: "Easy",
  },
  {
    id: 2,
    question: "Three Sum",
    difficulty: "Medium",
  },
  {
    id: 3,
    question: "Four Sum",
    difficulty: "Hard",
  },
];

// GET /api/questions
router.get("/", (req, res) => {
  // Send back the questions as JSON
  res.json(questions);
});

// Export the router
export default router;
