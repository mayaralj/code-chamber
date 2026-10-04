// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../db.js", () => ({
  default: { query: vi.fn() },
}));

vi.mock("../../executor/executor.js", () => ({
  default: vi.fn(),
}));

vi.mock("../../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

// Imports under test
import db from "../../db.js";
import runCode from "../../executor/executor.js";
import { rooms } from "../../globals.js";
import {
  trackSubmission,
  processSubmission,
  handleSubmitCode,
  forceSubmitAll,
} from "./submission.js";

describe("forceSubmitAll", () => {
  it.each([1, 2])("uses solution code only when one player remains (remaining: %s)", async (remaining) => {
    const player = makePlayer();
    const room = makeRoom(player);
    const ownCode = "function solve() { return 0; }";
    const solutionCode = "function solve(value) { return value; }";
    room.roundData[1].question.solutions = {
      javascript: { optimal: { code: solutionCode } },
    };
    if (remaining === 2) {
      room.players.push(makePlayer({
        userId: "u2", socketId: "s2",
        gameData: { roundData: { 1: { codeStatus: "submitted" } } },
      }));
    }
    rooms.ROOM1 = room;
    runCode.mockResolvedValue({
      passed: remaining === 1,
      testCasesPassed: remaining === 1 ? 1 : 0,
      executionTime: 1,
      languageUsed: "javascript",
    });
    db.query.mockResolvedValue({ rows: [{ id: 1 }] });

    await forceSubmitAll(makeIo(), "ROOM1", [{ player, codeInput: ownCode, language: "javascript" }]);

    expect(runCode).toHaveBeenCalledExactlyOnceWith(
      "javascript", remaining === 1 ? solutionCode : ownCode,
      "solve", room.roundData[1].question.testCases,
    );
  });
});

// Mock helpers
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makePlayer = (overrides = {}) => ({
  userId: "u1",
  username: "alice",
  displayName: "Alice",
  socketId: "s1",
  isGuest: false,
  gameData: {
    roundData: {
      1: { codeStatus: "in-progress" },
    },
  },
  ...overrides,
});
const makeRoom = (player) => ({
  roomId: "room1",
  currentRound: 1,
  players: [player],
  roundData: {
    1: {
      question: {
        difficulty: "easy",
        functionName: { javascript: "solve", python: "solve" },
        testCases: [{ input: [1], expected: 1 }],
      },
      submissionsAllowed: true,
    },
  },
});
const validResult = {
  numOfTestCases: 3,
  testCasesPassed: 3,
  executionTime: 120,
  submitTime: 5,
  passed: true,
  languageUsed: "javascript",
  difficulty: "easy",
};

// beforeEach hook to clear mocks and reset rooms
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
});

// Track submission tests
describe("trackSubmission", () => {
  it("skips insert when player has no userId", async () => {
    await trackSubmission({ isGuest: false }, validResult, "room1", 1);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert for guest players", async () => {
    await trackSubmission(
      { userId: "u1", isGuest: true },
      validResult,
      "room1",
      1,
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert when result is missing", async () => {
    await trackSubmission({ userId: "u1" }, null, "room1", 1);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert when roomId or roundNumber missing", async () => {
    await trackSubmission({ userId: "u1" }, validResult, null, 1);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert when a stat fails validation (NaN executionTime)", async () => {
    await trackSubmission(
      { userId: "u1", username: "alice" },
      { ...validResult, executionTime: NaN },
      "room1",
      1,
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert when passed is not boolean", async () => {
    await trackSubmission(
      { userId: "u1", username: "alice" },
      { ...validResult, passed: "true" },
      "room1",
      1,
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it("inserts submission when everything is valid", async () => {
    db.query.mockResolvedValue({ rows: [{ id: 42 }] });
    const id = await trackSubmission(
      { userId: "u1", username: "alice" },
      validResult,
      "room1",
      1,
    );
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(id).toBe(42);
  });
});

// Process submission tests
describe("processSubmission", () => {
  it("emits room-not-found and returns when room missing", async () => {
    const io = makeIo();
    const player = makePlayer();
    const result = await processSubmission(
      io,
      "MISSING",
      player,
      "code",
      "javascript",
      1,
    );
    expect(result).toBeUndefined();
    expect(io._emit).toHaveBeenCalledWith("submit-code-error", {
      message: "Room not found",
    });
    expect(runCode).not.toHaveBeenCalled();
  });

  it("returns early when player already submitted", async () => {
    const player = makePlayer({
      gameData: { roundData: { 1: { codeStatus: "submitted" } } },
    });
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    const result = await processSubmission(
      io,
      "ROOM1",
      player,
      "code",
      "javascript",
      1,
    );
    expect(result).toBeUndefined();
    expect(runCode).not.toHaveBeenCalled();
  });

  it("returns early when player already judging", async () => {
    const player = makePlayer({
      gameData: { roundData: { 1: { codeStatus: "judging" } } },
    });
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    await processSubmission(io, "ROOM1", player, "code", "javascript", 1);
    expect(runCode).not.toHaveBeenCalled();
  });

  it("emits invalid-language error and skips runCode", async () => {
    const player = makePlayer();
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    await processSubmission(io, "ROOM1", player, "code", "ruby", 1);
    expect(runCode).not.toHaveBeenCalled();
    expect(io._emit).toHaveBeenCalledWith("submit-code-error", {
      message: "Invalid language",
    });
  });

  it("uses createDummyResult and skips runCode when codeInput is falsy", async () => {
    const player = makePlayer();
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    const result = await processSubmission(
      io,
      "ROOM1",
      player,
      null,
      "javascript",
      1,
    );
    expect(runCode).not.toHaveBeenCalled();
    expect(result.error).toBe("Failed to run code");
    expect(result.passed).toBe(false);
  });

  it("skips db tracking when result has internal execution error", async () => {
    const player = makePlayer();
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    await processSubmission(io, "ROOM1", player, null, "javascript", 1);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("calls runCode with correct args and tracks submission on valid code", async () => {
    runCode.mockResolvedValue({
      passed: true,
      testCasesPassed: 1,
      executionTime: 100,
      languageUsed: "javascript",
    });
    db.query.mockResolvedValue({ rows: [{ id: 5 }] });
    const player = makePlayer();
    const room = makeRoom(player);
    rooms["ROOM1"] = room;
    const io = makeIo();

    const result = await processSubmission(
      io,
      "ROOM1",
      player,
      "function solve(){}",
      "javascript",
      1,
    );

    expect(runCode).toHaveBeenCalledWith(
      "javascript",
      "function solve(){}",
      "solve",
      room.roundData[1].question.testCases,
    );
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(result.passed).toBe(true);
    expect(result.submissionId).toBe(5);
  });

  it("computes averageExecutionTime per language, not globally", async () => {
    db.query.mockResolvedValue({ rows: [{ id: 1 }] });

    const player1 = makePlayer({ userId: "u1", socketId: "s1" });
    const player2 = makePlayer({ userId: "u2", socketId: "s2" });
    const player3 = makePlayer({ userId: "u3", socketId: "s3" });
    const room = makeRoom(player1);
    room.players.push(player2, player3);
    rooms["ROOM1"] = room;
    const io = makeIo();

    // Two javascript submissions: 100ms and 200ms -> average should be 150
    runCode.mockResolvedValueOnce({
      passed: true,
      testCasesPassed: 1,
      executionTime: 100,
      languageUsed: "javascript",
    });
    await processSubmission(io, "ROOM1", player1, "code", "javascript", 1);

    // A python submission shouldn't dilute the javascript average
    runCode.mockResolvedValueOnce({
      passed: true,
      testCasesPassed: 1,
      executionTime: 999,
      languageUsed: "python",
    });
    await processSubmission(io, "ROOM1", player2, "code", "python", 1);

    runCode.mockResolvedValueOnce({
      passed: true,
      testCasesPassed: 1,
      executionTime: 200,
      languageUsed: "javascript",
    });
    await processSubmission(io, "ROOM1", player3, "code", "javascript", 1);

    expect(room.roundData[1].averageExecutionTime.javascript).toBe(150);
  });
});

// Handle submit code tests
describe("handleSubmitCode", () => {
  const makeSocket = (overrides = {}) => ({
    data: { id: "u1" },
    emit: vi.fn(),
    ...overrides,
  });

  it("emits error when room not found", async () => {
    const io = makeIo();
    const socket = makeSocket();
    await handleSubmitCode(io, socket, {
      code: "MISSING",
      codeInput: "code",
      language: "javascript",
      timeSubmitted: Date.now(),
    });
    expect(socket.emit).toHaveBeenCalledWith("submit-code-error", {
      message: "Room not found",
    });
  });

  it("returns silently when player not found in room", async () => {
    const otherPlayer = makePlayer({ userId: "someoneElse" });
    rooms["ROOM1"] = makeRoom(otherPlayer);
    const io = makeIo();
    const socket = makeSocket();
    await handleSubmitCode(io, socket, {
      code: "ROOM1",
      codeInput: "code",
      language: "javascript",
      timeSubmitted: Date.now(),
    });
    expect(runCode).not.toHaveBeenCalled();
  });

  it("returns silently when player is reconnecting", async () => {
    const player = makePlayer({ isReconnecting: true });
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    const socket = makeSocket();
    await handleSubmitCode(io, socket, {
      code: "ROOM1",
      codeInput: "code",
      language: "javascript",
      timeSubmitted: Date.now(),
    });
    expect(runCode).not.toHaveBeenCalled();
  });

  it("returns silently when already submitted", async () => {
    const player = makePlayer({
      gameData: { roundData: { 1: { codeStatus: "submitted" } } },
    });
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    const socket = makeSocket();
    await handleSubmitCode(io, socket, {
      code: "ROOM1",
      codeInput: "code",
      language: "javascript",
      timeSubmitted: Date.now(),
    });
    expect(runCode).not.toHaveBeenCalled();
  });

  it("returns silently when submissions not allowed", async () => {
    const player = makePlayer();
    const room = makeRoom(player);
    room.roundData[1].submissionsAllowed = false;
    rooms["ROOM1"] = room;
    const io = makeIo();
    const socket = makeSocket();
    await handleSubmitCode(io, socket, {
      code: "ROOM1",
      codeInput: "code",
      language: "javascript",
      timeSubmitted: Date.now(),
    });
    expect(runCode).not.toHaveBeenCalled();
  });

  it("emits error for invalid timeSubmitted type", async () => {
    const player = makePlayer();
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    const socket = makeSocket();
    await handleSubmitCode(io, socket, {
      code: "ROOM1",
      codeInput: "code",
      language: "javascript",
      timeSubmitted: "not-a-number",
    });
    expect(socket.emit).toHaveBeenCalledWith("submit-code-error", {
      message: "Invalid time submitted",
    });
    expect(runCode).not.toHaveBeenCalled();
  });

  it("emits error when timeSubmitted drifts more than 5s from now", async () => {
    const player = makePlayer();
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    const socket = makeSocket();
    await handleSubmitCode(io, socket, {
      code: "ROOM1",
      codeInput: "code",
      language: "javascript",
      timeSubmitted: Date.now() - 10000, // 10s in the past
    });
    expect(socket.emit).toHaveBeenCalledWith("submit-code-error", {
      message: "Time submitted is out of bounds",
    });
    expect(runCode).not.toHaveBeenCalled();
  });

  it("processes a valid submission end-to-end", async () => {
    runCode.mockResolvedValue({
      passed: true,
      testCasesPassed: 1,
      executionTime: 100,
      languageUsed: "javascript",
    });
    db.query.mockResolvedValue({ rows: [{ id: 9 }] });
    const player = makePlayer();
    rooms["ROOM1"] = makeRoom(player);
    const io = makeIo();
    const socket = makeSocket();

    await handleSubmitCode(io, socket, {
      code: "ROOM1",
      codeInput: "function solve(){}",
      language: "javascript",
      timeSubmitted: Date.now(),
    });

    expect(runCode).toHaveBeenCalledTimes(1);
    expect(player.gameData.roundData[1].codeStatus).toBe("submitted");
  });
});
