// Imports
import express from "express";

// Questions (keeping them hardcoded for now)
const questions = [
  {
    id: 1,
    title: "Two Sum",
    difficulty: "Easy",
    description:
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
  },
  {
    id: 2,
    title: "Three Sum",
    difficulty: "Medium",
    description:
      "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets.",
  },
  {
    id: 3,
    title: "Four Sum",
    difficulty: "Hard",
    description:
      "Given an array of n integers nums and an integer target, are there elements a, b, c, and d in nums such that a + b + c + d == target? Find all unique quadruplets in the array which gives the sum of target. The solution set must not contain duplicate quadruplets.",
  },
];

const questionsRouter = (rooms) => {
  // Init the router
  const router = express.Router();

  // GET /api/questions
  router.get("/", (req, res) => {
    // Send back the questions as JSON
    res.json(questions);
  });

  // GET /api/questions/:code
  router.get("/:code", (req, res) => {
    // Get the room code from the URL params
    const { code } = req.params;

    // Find the room
    const room = rooms[code];
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Return a random question
    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];
    res.json(randomQuestion);
  });

  // Return the router
  return router;
};

// Export the router
export default questionsRouter;
