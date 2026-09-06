// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RESULTS_TIMER, GAME_OVER_TIMER } from "./results.js";

// Mock dependencies
vi.mock("../../utils/timers.js", () => ({
  sleep: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

vi.mock("../../room/deleteRoom.js", () => ({
  default: vi.fn(),
}));

vi.mock("./roundUtils.js", () => ({
  trackMatch: vi.fn(),
}));

// Imports under test
import { sleep } from "../../utils/timers.js";
import deleteRoom from "../../room/deleteRoom.js";
import { trackMatch } from "./roundUtils.js";
import { rooms } from "../../globals.js";
import {
  calculateScore,
  calculateAllScores,
  sendResults,
  gameOver,
} from "./results.js";

// Mock helpers
const CODE = "ROOM01";
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makeResult = (overrides = {}) => ({
  passed: true,
  testCasesPassed: 3,
  numOfTestCases: 3,
  executionTime: 100,
  submitTime: 5,
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  sleep.mockResolvedValue(undefined);
});

// calculateScore tests
describe("calculateScore", () => {
  it("scores a full pass with all test cases and no submit delay near the max", () => {
    const result = makeResult({
      passed: true,
      testCasesPassed: 3,
      numOfTestCases: 3,
      submitTime: 0,
    });
    expect(calculateScore(result, undefined)).toBe(100);
  });

  it("scores a failed submission with zero test cases passed as low", () => {
    const result = makeResult({
      passed: false,
      testCasesPassed: 0,
      numOfTestCases: 3,
      submitTime: 0,
    });
    expect(calculateScore(result, undefined)).toBe(0);
  });

  it("gives partial credit proportional to test cases passed", () => {
    const result = makeResult({
      passed: false,
      testCasesPassed: 1,
      numOfTestCases: 2,
      submitTime: 0,
    });
    expect(calculateScore(result, undefined)).toBe(25);
  });

  it("adds a bonus when execution time is faster than average", () => {
    const fast = makeResult({ executionTime: 50, submitTime: 0 });
    const slow = makeResult({ executionTime: 200, submitTime: 0 });
    const averageExecutionTime = 100;

    expect(calculateScore(fast, averageExecutionTime)).toBeGreaterThan(
      calculateScore(slow, averageExecutionTime),
    );
  });

  it("subtracts submitTime directly from the score", () => {
    const early = makeResult({ submitTime: 0 });
    const late = makeResult({ submitTime: 30 });

    expect(calculateScore(early, undefined)).toBeGreaterThan(
      calculateScore(late, undefined),
    );
  });

  it("skips the execution time bonus/penalty entirely when executionTime is missing", () => {
    const noExecTime = makeResult({ executionTime: undefined, submitTime: 0 });
    expect(calculateScore(noExecTime, 100)).toBe(100);
  });

  it("skips the execution time bonus/penalty when averageExecutionTime is missing", () => {
    const result = makeResult({ executionTime: 100, submitTime: 0 });
    expect(calculateScore(result, undefined)).toBe(100);
  });

  it("never returns a score below 0", () => {
    const result = makeResult({
      passed: false,
      testCasesPassed: 0,
      numOfTestCases: 3,
      submitTime: 500,
    });
    expect(calculateScore(result, undefined)).toBe(0);
  });

  it("never returns a score above 100", () => {
    const result = makeResult({
      passed: true,
      testCasesPassed: 3,
      numOfTestCases: 3,
      executionTime: 1,
      submitTime: 0,
    });
    expect(calculateScore(result, 10000)).toBe(100);
  });

  it("always returns an integer", () => {
    const result = makeResult({
      testCasesPassed: 1,
      numOfTestCases: 3,
      submitTime: 2,
    });
    expect(Number.isInteger(calculateScore(result, 90))).toBe(true);
  });
});

// calculateAllScores tests
describe("calculateAllScores", () => {
  it("does nothing when there are no round results", () => {
    const roundData = {};
    expect(() => calculateAllScores({}, CODE, roundData)).not.toThrow();
  });

  it("scores each result using the average execution time for its own language", () => {
    const jsResult = makeResult({
      languageUsed: "javascript",
      executionTime: 100,
    });
    const pyResult = makeResult({ languageUsed: "python", executionTime: 300 });
    const roundData = {
      roundResults: [jsResult, pyResult],
      averageExecutionTime: { javascript: 100, python: 100 },
    };

    calculateAllScores({}, CODE, roundData);

    expect(jsResult.score).toBeGreaterThan(pyResult.score);
    expect(typeof jsResult.score).toBe("number");
    expect(typeof pyResult.score).toBe("number");
  });
});

// sendResults tests
describe("sendResults", () => {
  it("does nothing if the room no longer exists", async () => {
    const io = makeIo();
    const roundData = { roundResults: [] };

    await sendResults(io, CODE, roundData);

    expect(io.to).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("emits results with defaults when there are no eliminations or missed players", async () => {
    const io = makeIo();
    rooms[CODE] = { code: CODE };
    const roundData = { roundResults: [{ score: 90 }] };

    await sendResults(io, CODE, roundData);

    expect(io._emit).toHaveBeenCalledWith(
      "send-results",
      expect.objectContaining({
        results: roundData.roundResults,
        eliminatedPlayers: [],
        missedPlayer: null,
      }),
    );
  });

  it("includes eliminated player usernames and the missed player when present", async () => {
    const io = makeIo();
    rooms[CODE] = { code: CODE };
    const roundData = {
      roundResults: [],
      eliminatedPlayers: [{ username: "alice" }, { username: "bob" }],
      missedPlayer: { username: "carol" },
    };

    await sendResults(io, CODE, roundData);

    expect(io._emit).toHaveBeenCalledWith(
      "send-results",
      expect.objectContaining({
        eliminatedPlayers: ["alice", "bob"],
        missedPlayer: "carol",
      }),
    );
  });

  it("sleeps for the results timer, then emits results-timer-finished", async () => {
    const io = makeIo();
    rooms[CODE] = { code: CODE };
    const roundData = { roundResults: [] };

    await sendResults(io, CODE, roundData);

    expect(sleep).toHaveBeenCalledWith(RESULTS_TIMER);
    expect(io._emit).toHaveBeenCalledWith("results-timer-finished");
  });
});

// gameOver tests
describe("gameOver", () => {
  it("with no winner, skips tracking/emitting/sleeping and deletes the room immediately", async () => {
    const io = makeIo();
    rooms[CODE] = { roomId: "r1", gameStartedAt: Date.now() };
    const roundData = { roundResults: [] };

    await gameOver(io, CODE, roundData, null);

    expect(trackMatch).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalledWith("game-over", expect.anything());
    expect(sleep).not.toHaveBeenCalled();
    expect(deleteRoom).toHaveBeenCalledWith(io, CODE, "Game over");
  });

  it("with a winner, tracks the match and emits game-over before deleting the room", async () => {
    const io = makeIo();
    rooms[CODE] = { roomId: "r1", gameStartedAt: Date.now() - 5000 };
    const winner = { username: "alice" };
    const roundData = { roundResults: [{ score: 100 }] };

    await gameOver(io, CODE, roundData, winner);

    expect(trackMatch).toHaveBeenCalledWith(
      winner,
      "r1",
      true,
      expect.any(Number),
    );
    expect(io._emit).toHaveBeenCalledWith(
      "game-over",
      expect.objectContaining({
        winner: "alice",
      }),
    );
    expect(sleep).toHaveBeenCalledWith(GAME_OVER_TIMER);
    expect(deleteRoom).toHaveBeenCalledWith(io, CODE, "Game over");
  });

  it("does not call deleteRoom again if the room was already removed during the game-over sleep", async () => {
    const io = makeIo();
    rooms[CODE] = { roomId: "r1", gameStartedAt: Date.now() };
    const winner = { username: "alice" };
    const roundData = { roundResults: [] };

    sleep.mockImplementationOnce(async () => {
      delete rooms[CODE];
    });

    await gameOver(io, CODE, roundData, winner);

    expect(deleteRoom).not.toHaveBeenCalled();
  });
});
