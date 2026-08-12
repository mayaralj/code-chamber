// Imports
import express from "express";

const serverHealthRouter = () => {
  const router = express.Router();

  // GET /api/health
  router.get("/", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return router;
};

export default serverHealthRouter;
