// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

vi.mock("../game/round/roundUtils.js", () => ({
  trackMatch: vi.fn(),
}));

vi.mock("../room/deleteRoom.js", () => ({
  default: vi.fn(),
}));

// Imports under test
import { trackMatch } from "../game/round/roundUtils.js";
import deleteRoom from "../room/deleteRoom.js";
import { rooms, playersInRooms } from "../globals.js";
import leaveGame from "./leaveGame.js";

// Mock helpers
const CODE = "ROOM01";
const makeSocket = (overrides = {}) => ({
  id: "socket1",
  data: { id: "u1", username: "alice", displayName: "Alice" },
  leave: vi.fn(),
  ...overrides,
});
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  code: CODE,
  isGameStarted: true,
  gameStartedAt: Date.now() - 5000,
  currentRound: 1,
  roundData: { 1: {} },
  players: [{ userId: "u1" }, { userId: "u2" }],
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  for (const key of Object.keys(playersInRooms)) delete playersInRooms[key];
});

// no-op guard tests
describe("leaveGame no-op guards", () => {
  it("does nothing when code is falsy", () => {
    const io = makeIo();
    const socket = makeSocket();

    leaveGame(io, socket, null);

    expect(trackMatch).not.toHaveBeenCalled();
  });

  it("does nothing when the room doesn't exist", () => {
    const io = makeIo();
    const socket = makeSocket();

    leaveGame(io, socket, CODE);

    expect(trackMatch).not.toHaveBeenCalled();
  });

  it("does nothing when the game hasn't started (handled by roomSockets)", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ isGameStarted: false });

    leaveGame(io, socket, CODE);

    expect(trackMatch).not.toHaveBeenCalled();
    expect(rooms[CODE].players).toHaveLength(2);
  });

  it("does nothing when the player isn't found (already eliminated)", () => {
    const io = makeIo();
    const socket = makeSocket({ data: { id: "notInRoom" } });
    rooms[CODE] = makeRoom();

    leaveGame(io, socket, CODE);

    expect(trackMatch).not.toHaveBeenCalled();
    expect(rooms[CODE].players).toHaveLength(2);
  });
});

// leaveGame elimination tests
describe("leaveGame elimination", () => {
  it("tracks the match as a loss and eliminates the player", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();
    playersInRooms["u1"] = CODE;

    leaveGame(io, socket, CODE);

    expect(trackMatch).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1" }),
      rooms[CODE].roomId,
      false,
      expect.any(Number),
    );
    expect(rooms[CODE].roundData[1].eliminatedPlayers).toHaveLength(1);
    expect(rooms[CODE].roundData[1].eliminatedPlayers[0].userId).toBe("u1");
    expect(rooms[CODE].players.find((p) => p.userId === "u1")).toBeUndefined();
    expect(socket.leave).toHaveBeenCalledWith(CODE);
    expect(playersInRooms["u1"]).toBeUndefined();
  });

  it("appends to an existing eliminatedPlayers list rather than overwriting it", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      roundData: { 1: { eliminatedPlayers: [{ userId: "previouslyOut" }] } },
      players: [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }],
    });

    leaveGame(io, socket, CODE);

    const eliminated = rooms[CODE].roundData[1].eliminatedPlayers;
    expect(eliminated).toHaveLength(2);
    expect(eliminated[0].userId).toBe("previouslyOut");
    expect(eliminated[1].userId).toBe("u1");
  });

  it("falls back to round 1 when currentRound is falsy", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ currentRound: 0, roundData: { 1: {} } });

    leaveGame(io, socket, CODE);

    expect(rooms[CODE].roundData[1].eliminatedPlayers).toHaveLength(1);
  });
});

// leaveGame when the last player leaves tests
describe("leaveGame when the last player leaves", () => {
  it("deletes the room and does not emit player-left", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ players: [{ userId: "u1" }] }); // only player

    leaveGame(io, socket, CODE);

    expect(deleteRoom).toHaveBeenCalledWith(
      io,
      CODE,
      "Last player left the game",
    );
    expect(io._emit).not.toHaveBeenCalledWith("player-left", expect.anything());
  });
});

// leaveGame normal departure tests
describe("leaveGame normal departure", () => {
  it("notifies remaining players without deleting the room", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      players: [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }],
    });

    leaveGame(io, socket, CODE);

    expect(deleteRoom).not.toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith(CODE);
    expect(io._emit).toHaveBeenCalledWith(
      "player-left",
      expect.objectContaining({
        playerLeft: { username: "alice", displayName: "Alice" },
      }),
    );
  });
});

// leaveGame force-ending the round tests
describe("leaveGame force-ending the round", () => {
  it("cancels the round timer when all remaining players have submitted", () => {
    const io = makeIo();
    const socket = makeSocket();
    const cancelRoundTimer = vi.fn();
    rooms[CODE] = makeRoom({
      roundData: { 1: { cancelRoundTimer } },
      players: [
        { userId: "u1" },
        {
          userId: "u2",
          gameData: { roundData: { 1: { codeStatus: "submitted" } } },
        },
        {
          userId: "u3",
          gameData: { roundData: { 1: { codeStatus: "submitted" } } },
        },
      ],
    });

    leaveGame(io, socket, CODE);

    expect(cancelRoundTimer).toHaveBeenCalled();
  });

  it("cancels the round timer when only one player remains, regardless of submission status", () => {
    const io = makeIo();
    const socket = makeSocket();
    const cancelRoundTimer = vi.fn();
    rooms[CODE] = makeRoom({
      roundData: { 1: { cancelRoundTimer } },
      players: [{ userId: "u1" }, { userId: "u2" }],
    });

    leaveGame(io, socket, CODE);

    expect(cancelRoundTimer).toHaveBeenCalled();
  });

  it("does not cancel the round timer when players remain and not everyone has submitted", () => {
    const io = makeIo();
    const socket = makeSocket();
    const cancelRoundTimer = vi.fn();
    rooms[CODE] = makeRoom({
      roundData: { 1: { cancelRoundTimer } },
      players: [
        { userId: "u1" },
        {
          userId: "u2",
          gameData: { roundData: { 1: { codeStatus: "submitted" } } },
        },
        {
          userId: "u3",
          gameData: { roundData: { 1: { codeStatus: "judging" } } },
        },
      ],
    });

    leaveGame(io, socket, CODE);

    expect(cancelRoundTimer).not.toHaveBeenCalled();
  });
});

// leaveGame reconnect sleep cancellation tests
describe("leaveGame reconnect sleep cancellation", () => {
  it("cancels the reconnect sleep when no remaining player is reconnecting", () => {
    const io = makeIo();
    const socket = makeSocket();
    const reconnectSleepCancel = vi.fn();
    rooms[CODE] = makeRoom({
      roundData: { 1: { reconnectSleepCancel } },
      players: [
        { userId: "u1" },
        { userId: "u2", isReconnecting: false },
        { userId: "u3", isReconnecting: false },
      ],
    });

    leaveGame(io, socket, CODE);

    expect(reconnectSleepCancel).toHaveBeenCalled();
  });

  it("does not cancel the reconnect sleep while another player is still reconnecting", () => {
    const io = makeIo();
    const socket = makeSocket();
    const reconnectSleepCancel = vi.fn();
    rooms[CODE] = makeRoom({
      roundData: { 1: { reconnectSleepCancel } },
      players: [
        { userId: "u1" },
        { userId: "u2", isReconnecting: true },
        { userId: "u3", isReconnecting: false },
      ],
    });

    leaveGame(io, socket, CODE);

    expect(reconnectSleepCancel).not.toHaveBeenCalled();
  });
});
