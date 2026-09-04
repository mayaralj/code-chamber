// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./leaveRoom.js", () => ({
  default: vi.fn(),
}));

vi.mock("../game/leaveGame.js", () => ({
  default: vi.fn(),
}));

vi.mock("./reconnectRoom.js", () => ({
  default: vi.fn(),
}));

vi.mock("../broadcast/broadcastRooms.js", () => ({
  broadcastUpdateRoom: vi.fn(),
  broadcastAddRoom: vi.fn(),
}));

vi.mock("../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

// db.js is a transitive dependency of createRoom.js (for CODE_LENGTH) — mock it too
vi.mock("../db.js", () => ({
  default: { query: vi.fn() },
}));

// Imports under test
import leaveRoom from "./leaveRoom.js";
import leaveGame from "../game/leaveGame.js";
import reconnectRoom from "./reconnectRoom.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import { rooms, playersInRooms } from "../globals.js";
import joinRoom from "./joinRoom.js";
import { CODE_LENGTH } from "./createRoom.js";

// Mock helpers
const makeSocket = (overrides = {}) => ({
  id: "socket1",
  data: {
    id: "u1",
    username: "alice",
    displayName: "Alice",
    isGuest: false,
  },
  emit: vi.fn(),
  to: vi.fn(() => ({ emit: vi.fn() })),
  join: vi.fn(),
  ...overrides,
});
const makeIo = () => ({
  to: vi.fn(() => ({ emit: vi.fn() })),
});
const CODE = "ROOM01";
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  host: { userId: "host1", username: "host" },
  code: CODE,
  players: [],
  roomName: "Test Room",
  maxPlayers: 4,
  isPublic: true,
  difficulty: "easy",
  isGameStarted: false,
  isGameStarting: false,
  lastActivity: Date.now(),
  ...overrides,
});

// Reset shared state before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  for (const key of Object.keys(playersInRooms)) delete playersInRooms[key];
});

// JoinRoom validation tests
describe("joinRoom validation", () => {
  it("rejects when username is missing", () => {
    const io = makeIo();
    const socket = makeSocket({ data: { id: "u1" } });

    joinRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-join-error", {
      message: "Username is Required to Join a Room",
    });
  });

  it("rejects when code is shorter than CODE_LENGTH", () => {
    const io = makeIo();
    const socket = makeSocket();

    joinRoom(io, socket, "abc");

    expect(socket.emit).toHaveBeenCalledWith("room-join-error", {
      message: `Room code must be ${CODE_LENGTH} characters long`,
    });
  });

  it("rejects when room does not exist", () => {
    const io = makeIo();
    const socket = makeSocket();

    joinRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-join-error", {
      message: "Room not found",
    });
  });

  it("rejects when player is already in another room (not reconnecting)", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();

    playersInRooms["u1"] = "OTHERROOM";
    rooms["OTHERROOM"] = makeRoom({
      code: "OTHERROOM",
      players: [{ userId: "u1", isReconnecting: false }],
    });

    joinRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-join-error", {
      message: "You are already in a room, cannot join another",
    });
    expect(rooms[CODE].players).toHaveLength(0);
  });

  it("rejects when the room is full", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({
      maxPlayers: 1,
      players: [{ userId: "someoneElse" }],
    });

    joinRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-join-error", {
      message: "Room is full",
    });
  });

  it("rejects when the game is starting", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ isGameStarting: true });

    joinRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-join-error", {
      message: "Game is starting",
    });
  });

  it("rejects when the game has already started", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ isGameStarted: true });

    joinRoom(io, socket, CODE);

    expect(socket.emit).toHaveBeenCalledWith("room-join-error", {
      message: "Game has already started",
    });
  });

  it("clears a stale playersInRooms mapping if the old room no longer exists", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();
    playersInRooms["u1"] = "GHOSTROOM"; // no rooms[GHOSTROOM] exists

    joinRoom(io, socket, CODE);

    // Should join normally, not treat it as a "already in a room" error
    expect(rooms[CODE].players).toHaveLength(1);
    expect(socket.emit).toHaveBeenCalledWith(
      "room-joined",
      expect.objectContaining({ roomInfo: expect.anything() }),
    );
  });
});

// JoinRoom success tests
describe("joinRoom success", () => {
  it("adds the player to the room and notifies everyone", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();

    joinRoom(io, socket, CODE);

    expect(rooms[CODE].players).toHaveLength(1);
    expect(rooms[CODE].players[0].userId).toBe("u1");
    expect(playersInRooms["u1"]).toBe(CODE);
    expect(socket.join).toHaveBeenCalledWith(CODE);
    expect(socket.emit).toHaveBeenCalledWith(
      "room-joined",
      expect.objectContaining({ roomInfo: expect.anything() }),
    );
    expect(broadcastUpdateRoom).toHaveBeenCalledWith(io, rooms[CODE]);
  });
});

// JoinRoom while reconnecting tests
describe("joinRoom while reconnecting", () => {
  it("kicks the player from a different old room, then joins the new room normally", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();

    playersInRooms["u1"] = "OLDROOM";
    const oldPlayer = {
      userId: "u1",
      isReconnecting: true,
      disconnectTimeout: 1,
    };
    rooms["OLDROOM"] = makeRoom({
      code: "OLDROOM",
      isGameStarted: false,
      players: [oldPlayer],
    });

    leaveRoom.mockImplementation(() => {
      delete playersInRooms["u1"];
    });

    joinRoom(io, socket, CODE);

    expect(leaveRoom).toHaveBeenCalledWith(io, socket, "OLDROOM");
    expect(leaveGame).not.toHaveBeenCalled();
    expect(oldPlayer.isReconnecting).toBe(false);
    expect(rooms[CODE].players).toHaveLength(1);
    expect(playersInRooms["u1"]).toBe(CODE);
  });

  it("uses leaveGame instead when the old room's game had started", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom();

    playersInRooms["u1"] = "OLDROOM";
    const oldPlayer = {
      userId: "u1",
      isReconnecting: true,
      disconnectTimeout: 1,
    };
    rooms["OLDROOM"] = makeRoom({
      code: "OLDROOM",
      isGameStarted: true,
      players: [oldPlayer],
    });

    leaveGame.mockImplementation(() => {
      delete playersInRooms["u1"];
    });

    joinRoom(io, socket, CODE);

    expect(leaveGame).toHaveBeenCalledWith(io, socket, "OLDROOM");
    expect(leaveRoom).not.toHaveBeenCalled();
    expect(rooms[CODE].players).toHaveLength(1);
  });

  it("reconnects in place when rejoining the same room they were disconnected from", () => {
    const io = makeIo();
    const socket = makeSocket();
    const existingPlayer = {
      userId: "u1",
      isReconnecting: true,
      disconnectTimeout: 1,
    };
    rooms[CODE] = makeRoom({ players: [existingPlayer] });
    playersInRooms["u1"] = CODE;

    joinRoom(io, socket, CODE);

    expect(reconnectRoom).toHaveBeenCalledWith(socket, CODE, existingPlayer);
    expect(socket.emit).toHaveBeenCalledWith(
      "room-joined",
      expect.objectContaining({ roomInfo: expect.anything() }),
    );
    // Should NOT have pushed a duplicate player entry
    expect(rooms[CODE].players).toHaveLength(1);
  });
});
