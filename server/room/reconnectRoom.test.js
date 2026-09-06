// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RECONNECT_TIMEOUT } from "./reconnectRoom.js";

// Mock dependencies
vi.mock("./leaveRoom.js", () => ({
  default: vi.fn(),
}));

vi.mock("../game/reconnectGame.js", () => ({
  default: vi.fn(),
}));

vi.mock("../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

// Imports under test
import leaveRoom from "./leaveRoom.js";
import reconnectGame from "../game/reconnectGame.js";
import { rooms, playersInRooms } from "../globals.js";
import reconnectRoom, {
  startReconnectTimeout,
  handleReconnectRoom,
} from "./reconnectRoom.js";

// Mock helpers
const CODE = "ROOM01";
const makeSocket = (overrides = {}) => ({
  id: "socket1",
  data: { id: "u1", username: "alice", displayName: "Alice" },
  emit: vi.fn(),
  to: vi.fn(() => ({ emit: vi.fn() })),
  join: vi.fn(),
  ...overrides,
});
const makeIo = () => ({
  to: vi.fn(() => ({ emit: vi.fn() })),
});
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  host: { userId: "u1" },
  code: CODE,
  players: [],
  isGameStarted: false,
  lastActivity: 0,
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

  it("does nothing when the game has already started (handled by gameSockets)", () => {
    const io = makeIo();
    const socket = makeSocket();
    playersInRooms["u1"] = CODE;
    rooms[CODE] = makeRoom({ isGameStarted: true });

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
    const clearSpy = vi.spyOn(global, "clearTimeout");
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

  it("removes the player via leaveRoom if they don't reconnect within the timeout", () => {
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
    expect(leaveRoom).not.toHaveBeenCalled();

    vi.advanceTimersByTime(RECONNECT_TIMEOUT);

    expect(leaveRoom).toHaveBeenCalledWith(io, socket, CODE);
    vi.useRealTimers();
  });
});

// reconnectRoom tests
describe("reconnectRoom (rejoin room logic)", () => {
  it("clears the timeout, marks the player reconnected, and updates socketId", () => {
    const socket = makeSocket({ id: "newSocketId" });
    const existingPlayer = {
      userId: "u1",
      socketId: "oldSocketId",
      isReconnecting: true,
      disconnectTimeout: 123,
    };
    rooms[CODE] = makeRoom({ players: [existingPlayer] });

    reconnectRoom(socket, CODE, existingPlayer);

    expect(existingPlayer.isReconnecting).toBe(false);
    expect(existingPlayer.disconnectTimeout).toBeNull();
    expect(existingPlayer.socketId).toBe("newSocketId");
    expect(socket.join).toHaveBeenCalledWith(CODE);
    expect(playersInRooms["u1"]).toBe(CODE);
  });

  it("updates room.host when the reconnecting player is the host", () => {
    const socket = makeSocket({ id: "newSocketId" });
    const existingPlayer = {
      userId: "u1",
      isReconnecting: true,
      disconnectTimeout: null,
    };
    rooms[CODE] = makeRoom({
      host: { userId: "u1" },
      players: [existingPlayer],
    });

    reconnectRoom(socket, CODE, existingPlayer);

    expect(rooms[CODE].host.userId).toBe("u1");
    expect(rooms[CODE].host.socketId).toBe("newSocketId"); // rebuilt via buildPlayerInfo
  });

  it("does not touch room.host when the reconnecting player is not the host", () => {
    const socket = makeSocket({ data: { id: "u2", username: "bob" } });
    const originalHost = { userId: "u1", socketId: "hostSocket" };
    const existingPlayer = {
      userId: "u2",
      isReconnecting: true,
      disconnectTimeout: null,
    };
    rooms[CODE] = makeRoom({ host: originalHost, players: [existingPlayer] });

    reconnectRoom(socket, CODE, existingPlayer);

    expect(rooms[CODE].host).toBe(originalHost);
  });
});

// handleReconnectRoom tests (this is the main entry point for the reconnectRoom flow)
describe("handleReconnectRoom", () => {
  it("emits an error when username is missing", () => {
    const io = makeIo();
    const socket = makeSocket({ data: { id: "u1" } });

    handleReconnectRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-reconnect-error");
  });

  it("emits an error when the room doesn't exist", () => {
    const io = makeIo();
    const socket = makeSocket();

    handleReconnectRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-reconnect-error");
  });

  it("emits an error when the player isn't found in the room", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      players: [{ userId: "someoneElse", isReconnecting: true }],
    });

    handleReconnectRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-reconnect-error");
  });

  it("emits an error when the player is found but wasn't marked as reconnecting", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      players: [{ userId: "u1", isReconnecting: false }],
    });

    handleReconnectRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-reconnect-error");
  });

  it("delegates to reconnectGame when the room's game has started", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      isGameStarted: true,
      players: [{ userId: "u1", isReconnecting: true }],
    });

    handleReconnectRoom(io, socket, CODE);

    expect(reconnectGame).toHaveBeenCalledWith(io, socket, CODE);
    expect(socket.emit).not.toHaveBeenCalledWith(
      "room-reconnected",
      expect.anything(),
    );
  });

  it("reconnects the player and notifies everyone when the game hasn't started", () => {
    const io = makeIo();
    const socket = makeSocket();
    const existingPlayer = {
      userId: "u1",
      isReconnecting: true,
      disconnectTimeout: null,
    };
    rooms[CODE] = makeRoom({ players: [existingPlayer] });

    handleReconnectRoom(io, socket, CODE);

    expect(existingPlayer.isReconnecting).toBe(false);
    expect(playersInRooms["u1"]).toBe(CODE);
    expect(socket.emit).toHaveBeenCalledWith(
      "room-reconnected",
      expect.objectContaining({ roomInfo: expect.anything() }),
    );
  });
});
