// Imports
import rateLimit from "express-rate-limit";

// Config
const MINUTE = 60 * 1000;

// Global limited
export const globalLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Limiter
export const authLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Profile Limiter
export const profileLimiter = rateLimit({
  windowMs: MINUTE,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Leaderboard Limiter
export const leaderboardLimiter = rateLimit({
  windowMs: MINUTE,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Match history limiter
export const matchHistoryLimiter = rateLimit({
  windowMs: MINUTE,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Live stats limiter
export const liveStatsLimiter = rateLimit({
  windowMs: MINUTE,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check limiter
export const healthLimiter = rateLimit({
  windowMs: MINUTE,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
