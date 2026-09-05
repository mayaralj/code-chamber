// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./beforeGame.js", () => ({
  default: vi.fn(),
}));

vi.mock("./round/round.js", () => ({
  default: vi.fn(),
}));

vi.mock("../broadcast/broadcastRooms.js", () => ({
  broadcastUpdateRoom: vi.fn(),
}));

vi.mock("../db.js", () => ({
  default: { query: vi.fn() },
}));

// Imports under test
import beforeGame from "./beforeGame.js";
import startRound from "./round/round.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import db from "../db.js";
import { rooms } from "../globals.js";
import handleStartGame from "./startGame.js";

// Mock helpers
const CODE = "ROOM01";
const makeSocket = (overrides = {}) => ({
  id: "hostSocket",
  connected: true,
  emit: vi.fn(),
  ...overrides,
});
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  code: CODE,
  host: { userId: "u1", socketId: "hostSocket" },
  players: [
    { userId: "u1", isReconnecting: false },
    { userId: "u2", isReconnecting: false },
  ],
  isGameStarting: false,
  isGameStarted: false,
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  db.query.mockResolvedValue({ rows: [] });
});

// Guard tests for handleStartGame
describe("handleStartGame guards", () => {
  it("does nothing when the room doesn't exist", async () => {
    const io = makeIo();
    const socket = makeSocket();

    await handleStartGame(io, socket, CODE);

    expect(beforeGame).not.toHaveBeenCalled();
  });

  it("does nothing when the caller isn't the host", async () => {
    const io = makeIo();
    const socket = makeSocket({ id: "someOtherSocket" });
    rooms[CODE] = makeRoom();

    await handleStartGame(io, socket, CODE);

    expect(beforeGame).not.toHaveBeenCalled();
  });

  it("does nothing when the host's socket is disconnected", async () => {
    const io = makeIo();
    const socket = makeSocket({ connected: false });
    rooms[CODE] = makeRoom();

    await handleStartGame(io, socket, CODE);

    expect(beforeGame).not.toHaveBeenCalled();
  });

  it("does nothing when the game is already starting", async () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ isGameStarting: true });

    await handleStartGame(io, socket, CODE);

    expect(beforeGame).not.toHaveBeenCalled();
  });

  it("does nothing when the game has already started", async () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ isGameStarted: true });

    await handleStartGame(io, socket, CODE);

    expect(beforeGame).not.toHaveBeenCalled();
  });

  it("rejects when a player is still reconnecting", async () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      players: [
        { userId: "u1", isReconnecting: false },
        { userId: "u2", isReconnecting: true },
      ],
    });

    await handleStartGame(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("start-game-error", {
      message: "Waiting for a player to reconnect",
    });
    expect(beforeGame).not.toHaveBeenCalled();
  });

  it("rejects when there aren't enough players (fewer than 2)", async () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      players: [{ userId: "u1", isReconnecting: false }],
    });

    await handleStartGame(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("start-game-error", {
      message: "Not enough players to start game",
    });
    expect(beforeGame).not.toHaveBeenCalled();
  });

  it("rejects when tracking the room in the database fails", async () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();
    db.query.mockRejectedValue(new Error("db down"));

    await handleStartGame(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("start-game-error", {
      message: "Failed to track room in database",
    });
    expect(beforeGame).not.toHaveBeenCalled();
    // Should not have marked the room as starting on a failed DB write
    expect(rooms[CODE].isGameStarting).toBe(false);
  });
});

// Successful startGame flow tests
describe("handleStartGame success", () => {
  it("marks the room as starting, notifies everyone, and kicks off the game", async () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();

    // Simulate room ending
    startRound.mockImplementation(async () => {
      delete rooms[CODE];
    });

    await handleStartGame(io, socket, CODE);

    // Immediate, synchronous effects of handleStartGame itself
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO rooms"),
      ["r1"],
    );
    expect(broadcastUpdateRoom).toHaveBeenCalled();
    expect(io._emit).toHaveBeenCalledWith("game-starting");

    // Check that beforeGame and startRound were called asynchronously
    await vi.waitFor(() => {
      expect(beforeGame).toHaveBeenCalledWith(io, socket, CODE);
    });
    await vi.waitFor(() => {
      expect(startRound).toHaveBeenCalledWith(io, socket, CODE);
    });
  });

  it("does not call startRound if beforeGame never marks the room started", async () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();

    beforeGame.mockImplementation(async () => {
      delete rooms[CODE];
    });

    await handleStartGame(io, socket, CODE);

    // Wait for the next tick to allow the async beforeGame to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(beforeGame).toHaveBeenCalled();
    expect(startRound).not.toHaveBeenCalled();
  });
});
