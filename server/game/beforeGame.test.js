// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./questionHandler.js", () => ({
  setUpGameQuestions: vi.fn(),
}));

vi.mock("./round/roundEvents.js", () => ({
  determineAllEvents: vi.fn(),
}));

vi.mock("../utils/timers.js", () => ({
  sleep: vi.fn(),
}));

vi.mock("../broadcast/broadcastRooms.js", () => ({
  broadcastUpdateRoom: vi.fn(),
}));

vi.mock("./gameUtils.js", () => ({
  trackBeforeMatch: vi.fn(),
  isRoomStillValid: vi.fn(),
}));

vi.mock("../room/deleteRoom.js", () => ({
  default: vi.fn(),
}));

// Imports under test
import { setUpGameQuestions } from "./questionHandler.js";
import { determineAllEvents } from "./round/roundEvents.js";
import { sleep } from "../utils/timers.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import { trackBeforeMatch, isRoomStillValid } from "./gameUtils.js";
import deleteRoom from "../room/deleteRoom.js";
import { rooms } from "../globals.js";
import beforeGame from "./beforeGame.js";

// Mock helpers
const CODE = "ROOM01";
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  code: CODE,
  players: [{ userId: "u1" }, { userId: "u2" }],
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  rooms[CODE] = makeRoom();

  // Default: everything succeeds and the room stays valid throughout
  isRoomStillValid.mockReturnValue(true);
  setUpGameQuestions.mockResolvedValue(undefined);
  sleep.mockResolvedValue(undefined);
  trackBeforeMatch.mockResolvedValue(undefined);
});

// beforeGame initialization tests
describe("beforeGame initialization", () => {
  it("resets round state and initializes each player's gameData", async () => {
    rooms[CODE].players[0].gameData = { stale: "leftover data" };

    await beforeGame(makeIo(), {}, CODE);

    expect(rooms[CODE].currentRound).toBe(0);
    expect(rooms[CODE].pendingCodeRequests).toBeInstanceOf(Map);
    expect(rooms[CODE].players[0].gameData).toEqual({}); // overwritten, not merged
    expect(rooms[CODE].players[1].gameData).toEqual({});
  });

  it("calls determineAllEvents with the room before setting up questions", async () => {
    await beforeGame(makeIo(), {}, CODE);

    expect(determineAllEvents).toHaveBeenCalledWith(rooms[CODE]);
    expect(setUpGameQuestions).toHaveBeenCalledWith(rooms, CODE);
  });
});

// beforeGame validity checkpoints
describe("beforeGame validity checkpoints", () => {
  it("stops after question setup if the room is no longer valid", async () => {
    const io = makeIo();
    const socket = {};
    isRoomStillValid.mockReturnValueOnce(false);

    await beforeGame(io, socket, CODE);

    expect(isRoomStillValid).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(trackBeforeMatch).not.toHaveBeenCalled();
    expect(broadcastUpdateRoom).not.toHaveBeenCalled();
  });

  it("stops after the pre-round sleep if the room is no longer valid", async () => {
    const io = makeIo();
    const socket = {};
    isRoomStillValid.mockReturnValueOnce(true).mockReturnValueOnce(false);

    await beforeGame(io, socket, CODE);

    expect(sleep).toHaveBeenCalledWith(3500);
    expect(isRoomStillValid).toHaveBeenCalledTimes(2);
    expect(trackBeforeMatch).not.toHaveBeenCalled();
    expect(broadcastUpdateRoom).not.toHaveBeenCalled();
  });

  it("stops after tracking matches if the room is no longer valid", async () => {
    const io = makeIo();
    const socket = {};
    isRoomStillValid
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    await beforeGame(io, socket, CODE);

    expect(trackBeforeMatch).toHaveBeenCalledTimes(2);
    expect(isRoomStillValid).toHaveBeenCalledTimes(3);
    expect(broadcastUpdateRoom).not.toHaveBeenCalled();
    expect(rooms[CODE].isGameStarted).toBeUndefined();
  });

  it("checks validity using the same io, socket, and code passed in", async () => {
    const io = makeIo();
    const socket = { id: "hostSocket" };
    isRoomStillValid.mockReturnValueOnce(false);

    await beforeGame(io, socket, CODE);

    expect(isRoomStillValid).toHaveBeenCalledWith(io, socket, CODE);
  });
});

// beforeGame success tests
describe("beforeGame success", () => {
  it("marks the game started and broadcasts the update", async () => {
    const io = makeIo();

    await beforeGame(io, {}, CODE);

    expect(trackBeforeMatch).toHaveBeenCalledTimes(2);
    expect(rooms[CODE].isGameStarted).toBe(true);
    expect(rooms[CODE].isGameStarting).toBe(false);
    expect(rooms[CODE].gameStartedAt).toEqual(expect.any(Number));
    expect(broadcastUpdateRoom).toHaveBeenCalledWith(io, rooms[CODE]);
  });

  it("tracks a match for every player in the room", async () => {
    rooms[CODE].players.push({ userId: "u3" });

    await beforeGame(makeIo(), {}, CODE);

    expect(trackBeforeMatch).toHaveBeenCalledTimes(3);
    for (const player of rooms[CODE].players) {
      expect(trackBeforeMatch).toHaveBeenCalledWith(player, rooms[CODE]);
    }
  });
});

// beforeGame error handling tests
describe("beforeGame error handling", () => {
  it("cancels the game and cleans up the room if question setup throws", async () => {
    const io = makeIo();
    setUpGameQuestions.mockRejectedValueOnce(new Error("db down"));

    await beforeGame(io, {}, CODE);

    expect(io._emit).toHaveBeenCalledWith("game-start-cancelled", {
      message: "Starting game failed due to an internal error",
    });
    expect(deleteRoom).toHaveBeenCalledWith(io, CODE);
    expect(rooms[CODE].isGameStarted).toBeUndefined();
  });

  it("cancels the game if a synchronous error is thrown (e.g. determineAllEvents)", async () => {
    const io = makeIo();
    determineAllEvents.mockImplementationOnce(() => {
      throw new Error("bad event config");
    });

    await beforeGame(io, {}, CODE);

    expect(io._emit).toHaveBeenCalledWith("game-start-cancelled", {
      message: "Starting game failed due to an internal error",
    });
    expect(deleteRoom).toHaveBeenCalledWith(io, CODE);
  });

  it("cancels the game if tracking matches throws", async () => {
    const io = makeIo();
    trackBeforeMatch.mockRejectedValueOnce(new Error("insert failed"));

    await beforeGame(io, {}, CODE);

    expect(deleteRoom).toHaveBeenCalledWith(io, CODE);
    expect(broadcastUpdateRoom).not.toHaveBeenCalled();
  });
});
