// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RECONNECT_TIMEOUT } from "./reconnectGame.js";

// Mock dependencies
vi.mock("../game/leaveGame.js", () => ({
  default: vi.fn(),
}));

vi.mock("../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

// Imports under test
import leaveGame from "../game/leaveGame.js";
import { rooms, playersInRooms } from "../globals.js";
import reconnectGame, { startReconnectTimeout } from "./reconnectGame.js";

// Mock helpers
const CODE = "ROOM01";
const makeSocket = (overrides = {}) => ({
  id: "socket1",
  data: { id: "u1", username: "alice", displayName: "Alice" },
  join: vi.fn(),
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
  isGameStarted: true,
  currentRound: 1,
  roundData: { 1: {} },
  reconnectData: { someKey: "value" },
  pendingCodeRequests: new Map(),
  players: [],
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  for (const key of Object.keys(playersInRooms)) delete playersInRooms[key];
});

// startReconnectTimeout tests
describe("startReconnectTimeout", () => {
  it("does nothing when the player isn't mapped to any room", () => {
    const io = makeIo();
    const socket = makeSocket();

    startReconnectTimeout(io, socket);

    expect(io.to).not.toHaveBeenCalled();
  });

  it("does nothing when the mapped room no longer exists", () => {
    const io = makeIo();
    const socket = makeSocket();
    playersInRooms["u1"] = CODE;

    startReconnectTimeout(io, socket);

    expect(io.to).not.toHaveBeenCalled();
  });

  it("does nothing when the game hasn't started (handled by roomSockets)", () => {
    const io = makeIo();
    const socket = makeSocket();
    playersInRooms["u1"] = CODE;
    rooms[CODE] = makeRoom({ isGameStarted: false });

    startReconnectTimeout(io, socket);

    expect(io.to).not.toHaveBeenCalled();
  });

  it("does nothing when no player in the room matches this socket", () => {
    const io = makeIo();
    const socket = makeSocket();
    playersInRooms["u1"] = CODE;
    rooms[CODE] = makeRoom({
      players: [{ userId: "u1", socketId: "otherSocket" }],
    });

    startReconnectTimeout(io, socket);

    expect(io.to).not.toHaveBeenCalled();
  });

  it("marks the player as reconnecting and notifies the room", () => {
    const io = makeIo();
    const socket = makeSocket();
    const player = {
      userId: "u1",
      socketId: "socket1",
      isReconnecting: false,
      disconnectTimeout: null,
    };
    playersInRooms["u1"] = CODE;
    rooms[CODE] = makeRoom({ players: [player] });

    startReconnectTimeout(io, socket);

    expect(player.isReconnecting).toBe(true);
    expect(io.to).toHaveBeenCalledWith(CODE);
  });

  it("clears a previous disconnect timeout before starting a new one", () => {
    vi.useFakeTimers();
    const io = makeIo();
    const socket = makeSocket();
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const oldTimeout = setTimeout(() => {}, 9999);
    const player = {
      userId: "u1",
      socketId: "socket1",
      isReconnecting: false,
      disconnectTimeout: oldTimeout,
    };
    playersInRooms["u1"] = CODE;
    rooms[CODE] = makeRoom({ players: [player] });

    startReconnectTimeout(io, socket);

    expect(clearSpy).toHaveBeenCalledWith(oldTimeout);
    vi.useRealTimers();
  });

  it("eliminates the player via leaveGame if they don't reconnect within the timeout", () => {
    vi.useFakeTimers();
    const io = makeIo();
    const socket = makeSocket();
    const player = {
      userId: "u1",
      socketId: "socket1",
      isReconnecting: false,
      disconnectTimeout: null,
    };
    playersInRooms["u1"] = CODE;
    rooms[CODE] = makeRoom({ players: [player] });

    startReconnectTimeout(io, socket);
    expect(leaveGame).not.toHaveBeenCalled();

    vi.advanceTimersByTime(RECONNECT_TIMEOUT);

    expect(leaveGame).toHaveBeenCalledWith(io, socket, CODE);
    vi.useRealTimers();
  });
});

// reconnectGame tests
describe("reconnectGame", () => {
  it("emits an error when the room doesn't exist", async () => {
    const socket = makeSocket();

    await reconnectGame({}, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("reconnect-game-error", {
      message: "Room not found",
    });
  });

  it("emits an error when the player isn't found (eliminated or never joined)", async () => {
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ players: [{ userId: "someoneElse" }] });

    await reconnectGame({}, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("reconnect-game-error", {
      message: "Player not found",
    });
  });

  it("emits an error and stops before success when no round data exists for the player", async () => {
    const socket = makeSocket();
    const player = { userId: "u1", gameData: { roundData: {} } }; // no entry for round 1
    rooms[CODE] = makeRoom({ players: [player] });

    await reconnectGame({}, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("reconnect-game-error", {
      message: "No round data found for player",
    });
    expect(socket.emit).not.toHaveBeenCalledWith(
      "reconnect-game-success",
      expect.anything(),
    );
  });

  it("restores the player's connection state on success", async () => {
    const socket = makeSocket({ id: "newSocketId" });
    const player = {
      userId: "u1",
      socketId: "oldSocketId",
      isReconnecting: true,
      disconnectTimeout: 123,
      gameData: { roundData: { 1: { codeStatus: "in-progress" } } },
    };
    rooms[CODE] = makeRoom({ players: [player] });

    await reconnectGame({}, socket, CODE);

    expect(player.socketId).toBe("newSocketId");
    expect(player.isReconnecting).toBe(false);
    expect(player.disconnectTimeout).toBeNull();
    expect(socket.join).toHaveBeenCalledWith(CODE);
  });

  it("emits reconnect-game-success with the current room state and codeStatus", async () => {
    const socket = makeSocket();
    const player = {
      userId: "u1",
      gameData: { roundData: { 1: { codeStatus: "judging" } } },
    };
    rooms[CODE] = makeRoom({
      players: [player],
      reconnectData: { question: "Two Sum" },
    });

    await reconnectGame({}, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("reconnect-game-success", {
      question: "Two Sum",
      codeStatus: "judging",
    });
  });

  it("resolves immediately with no pending code request outstanding", async () => {
    const socket = makeSocket();
    const player = {
      userId: "u1",
      gameData: { roundData: { 1: { codeStatus: "submitted" } } },
    };
    rooms[CODE] = makeRoom({ players: [player] }); // empty pendingCodeRequests map

    await expect(reconnectGame({}, socket, CODE)).resolves.toBeUndefined();
    expect(socket.emit).not.toHaveBeenCalledWith(
      "request-code",
      expect.anything(),
      expect.anything(),
    );
  });

  it("requests and resolves pending code before finishing reconnection", async () => {
    const socket = makeSocket();
    const player = {
      userId: "u1",
      gameData: { roundData: { 1: { codeStatus: "in-progress" } } },
    };
    const pendingResolve = vi.fn();
    const pending = {
      resolve: pendingResolve,
      timeoutHandle: setTimeout(() => {}, 9999),
    };
    const room = makeRoom({ players: [player] });
    room.pendingCodeRequests.set("u1", pending);
    rooms[CODE] = room;

    // Simulate the client responding to the request-code callback
    socket.emit.mockImplementation((event, payload, callback) => {
      if (event === "request-code") {
        callback({ code: "function solve(){}", language: "javascript" });
      }
    });

    await reconnectGame({}, socket, CODE);

    expect(pendingResolve).toHaveBeenCalledWith({
      userId: "u1",
      code: "function solve(){}",
      language: "javascript",
    });
    expect(room.pendingCodeRequests.has("u1")).toBe(false);
    clearTimeout(pending.timeoutHandle);
  });

  it("cancels the reconnect sleep when this was the last reconnecting player", async () => {
    const reconnectSleepCancel = vi.fn();
    const socket = makeSocket();
    const player = {
      userId: "u1",
      isReconnecting: true,
      gameData: { roundData: { 1: { codeStatus: "submitted" } } },
    };
    const otherPlayer = { userId: "u2", isReconnecting: false };
    rooms[CODE] = makeRoom({
      players: [player, otherPlayer],
      roundData: { 1: { reconnectSleepCancel } },
    });

    await reconnectGame({}, socket, CODE);

    expect(reconnectSleepCancel).toHaveBeenCalled();
  });

  it("does not cancel the reconnect sleep while another player is still reconnecting", async () => {
    const reconnectSleepCancel = vi.fn();
    const socket = makeSocket();
    const player = {
      userId: "u1",
      isReconnecting: true,
      gameData: { roundData: { 1: { codeStatus: "submitted" } } },
    };
    const otherPlayer = { userId: "u2", isReconnecting: true }; // still out
    rooms[CODE] = makeRoom({
      players: [player, otherPlayer],
      roundData: { 1: { reconnectSleepCancel } },
    });

    await reconnectGame({}, socket, CODE);

    expect(reconnectSleepCancel).not.toHaveBeenCalled();
  });
});
