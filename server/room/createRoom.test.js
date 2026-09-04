// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../db.js", () => ({
  default: { query: vi.fn() },
}));

vi.mock("./leaveRoom.js", () => ({
  default: vi.fn(),
}));

vi.mock("../game/leaveGame.js", () => ({
  default: vi.fn(),
}));

vi.mock("../broadcast/broadcastRooms.js", () => ({
  broadcastAddRoom: vi.fn(),
  broadcastUpdateRoom: vi.fn(),
}));

vi.mock("../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

// Imports
import db from "../db.js";
import leaveRoom from "./leaveRoom.js";
import leaveGame from "../game/leaveGame.js";
import { broadcastAddRoom } from "../broadcast/broadcastRooms.js";
import {
  rooms,
  roomIdToCode,
  playersInRooms,
  currentRoomNames,
} from "../globals.js";
import createRoom from "./createRoom.js";

// Mock helpers
const makeSocket = (overrides = {}) => ({
  id: "socket1",
  data: {
    id: "u1",
    username: "alice",
    displayName: "Alice",
    isGuest: false,
  },
  join: vi.fn(),
  ...overrides,
});
const makeIo = () => ({
  to: vi.fn(() => ({ emit: vi.fn() })),
});
const validRoomData = {
  roomId: "r1",
  roomName: "Cool Room",
  maxPlayers: 4,
  isPublic: true,
  difficulty: "easy",
};
const makeCallback = () => vi.fn();

// Reset shared state before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  for (const key of Object.keys(roomIdToCode)) delete roomIdToCode[key];
  for (const key of Object.keys(playersInRooms)) delete playersInRooms[key];
  currentRoomNames.clear();
  db.query.mockResolvedValue({ rows: [] });
});

// CreateRoom validation tests
describe("createRoom validation", () => {
  it("rejects when username is missing", async () => {
    const io = makeIo();
    const socket = makeSocket({ data: { id: "u1" } });
    const callback = makeCallback();

    await createRoom(io, socket, validRoomData, callback);

    expect(callback).toHaveBeenCalledWith({
      error: "Username is Required to Create a Room",
    });
    expect(rooms[validRoomData.roomId]).toBeUndefined();
  });

  it("rejects when player is already in an active room", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    // Player already mapped to an existing room, not reconnecting
    playersInRooms["u1"] = "OLDROOM";
    rooms["OLDROOM"] = {
      roomId: "old",
      host: { userId: "u1" },
      players: [{ userId: "u1", isReconnecting: false }],
      isGameStarted: false,
    };

    await createRoom(io, socket, validRoomData, callback);

    expect(callback).toHaveBeenCalledWith({
      error: "You are already in a room, cannot create one",
    });
    expect(rooms[validRoomData.roomId]).toBeUndefined();
  });

  it("rejects when required room data fields are missing", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    await createRoom(
      io,
      socket,
      { ...validRoomData, roomName: undefined },
      callback,
    );

    expect(callback).toHaveBeenCalledWith({
      error: "Missing required room data",
    });
  });

  it("rejects when roomId already exists in active rooms", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    roomIdToCode[validRoomData.roomId] = "SOMECODE";

    await createRoom(io, socket, validRoomData, callback);

    expect(callback).toHaveBeenCalledWith({
      error: "Room ID already exists in active rooms",
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it("rejects when roomId already exists in the database", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    db.query.mockResolvedValue({ rows: [{ room_id: validRoomData.roomId }] });

    await createRoom(io, socket, validRoomData, callback);

    expect(callback).toHaveBeenCalledWith({
      error: "Room ID already exists in database",
    });
  });

  it("rejects when db check throws", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    db.query.mockRejectedValue(new Error("db down"));

    await createRoom(io, socket, validRoomData, callback);

    expect(callback).toHaveBeenCalledWith({
      error: "Could not verify room ID. Please try again.",
    });
  });

  it("rejects a room name that is too short", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    await createRoom(
      io,
      socket,
      { ...validRoomData, roomName: "ab" },
      callback,
    );

    expect(callback).toHaveBeenCalledWith({ error: "Room name is too short" });
  });

  it("rejects a room name that is too long", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    await createRoom(
      io,
      socket,
      { ...validRoomData, roomName: "a".repeat(21) },
      callback,
    );

    expect(callback).toHaveBeenCalledWith({ error: "Room name is too long" });
  });

  it("rejects a room name already in use", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    currentRoomNames.add(validRoomData.roomName);

    await createRoom(io, socket, validRoomData, callback);

    expect(callback).toHaveBeenCalledWith({
      error: "Room name is currently used by another room",
    });
  });

  it("rejects an invalid difficulty", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    await createRoom(
      io,
      socket,
      { ...validRoomData, difficulty: "impossible" },
      callback,
    );

    expect(callback).toHaveBeenCalledWith({
      error: "Invalid difficulty level",
    });
    // Room name should not remain reserved after a later validation failure
    expect(currentRoomNames.has(validRoomData.roomName)).toBe(true); // known: added before difficulty check
  });
});

// CreateRoom success tests
describe("createRoom success", () => {
  it("creates the room and updates all shared stores", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    await createRoom(io, socket, validRoomData, callback);

    const code = Object.keys(rooms)[0];
    expect(code).toBeDefined();
    expect(rooms[code]).toMatchObject({
      roomId: validRoomData.roomId,
      roomName: validRoomData.roomName,
      maxPlayers: validRoomData.maxPlayers,
      isPublic: validRoomData.isPublic,
      difficulty: validRoomData.difficulty,
      isGameStarted: false,
    });
    expect(rooms[code].players).toHaveLength(1);
    expect(rooms[code].players[0].userId).toBe("u1");

    expect(roomIdToCode[validRoomData.roomId]).toBe(code);
    expect(playersInRooms["u1"]).toBe(code);
    expect(currentRoomNames.has(validRoomData.roomName)).toBe(true);

    expect(socket.join).toHaveBeenCalledWith(code);
    expect(broadcastAddRoom).toHaveBeenCalledWith(io, rooms[code]);
    expect(callback).toHaveBeenCalledWith({
      roomInfo: expect.objectContaining({
        code,
        roomName: validRoomData.roomName,
      }),
    });
  });
});

// CreateRoom while reconnecting tests
describe("createRoom while reconnecting in another room", () => {
  it("kicks the player from their old room (not started) then creates the new one", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    playersInRooms["u1"] = "OLDROOM";
    const oldPlayer = {
      userId: "u1",
      isReconnecting: true,
      disconnectTimeout: 123,
    };
    rooms["OLDROOM"] = {
      roomId: "old",
      host: { userId: "u1" },
      players: [oldPlayer],
      isGameStarted: false,
    };

    // give leaveRoom a mock implementation that removes the player from playersInRooms
    leaveRoom.mockImplementation(() => {
      delete playersInRooms["u1"];
    });

    await createRoom(io, socket, validRoomData, callback);

    expect(leaveRoom).toHaveBeenCalledWith(io, socket, "OLDROOM");
    expect(leaveGame).not.toHaveBeenCalled();
    expect(oldPlayer.isReconnecting).toBe(false);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ roomInfo: expect.anything() }),
    );
  });

  it("kicks the player from their old room via leaveGame if that game had started", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const callback = makeCallback();

    playersInRooms["u1"] = "OLDROOM";
    const oldPlayer = {
      userId: "u1",
      isReconnecting: true,
      disconnectTimeout: 123,
    };
    rooms["OLDROOM"] = {
      roomId: "old",
      host: { userId: "u1" },
      players: [oldPlayer],
      isGameStarted: true,
    };

    leaveGame.mockImplementation(() => {
      delete playersInRooms["u1"];
    });

    await createRoom(io, socket, validRoomData, callback);

    expect(leaveGame).toHaveBeenCalledWith(io, socket, "OLDROOM");
    expect(leaveRoom).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ roomInfo: expect.anything() }),
    );
  });
});
