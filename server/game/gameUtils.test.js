// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../db.js", () => ({
  default: { query: vi.fn() },
}));

vi.mock("../broadcast/broadcastRooms.js", () => ({
  broadcastRemoveRoom: vi.fn(),
}));

// Imports under test
import db from "../db.js";
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";
import {
  rooms,
  playersInRooms,
  roomIdToCode,
  currentRoomNames,
} from "../globals.js";
import { trackBeforeMatch, isRoomStillValid } from "./gameUtils.js";

// Mock helpers
const CODE = "ROOM01";
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  code: CODE,
  roomName: "Test Room",
  host: { userId: "u1" },
  players: [{ userId: "u1" }, { userId: "u2" }],
  difficulty: "easy",
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  for (const key of Object.keys(playersInRooms)) delete playersInRooms[key];
  for (const key of Object.keys(roomIdToCode)) delete roomIdToCode[key];
  currentRoomNames.clear();
});

// trackBeforeMatch tests
describe("trackBeforeMatch", () => {
  const room = makeRoom();

  it("skips insert when player is missing", async () => {
    await trackBeforeMatch(null, room);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert when player has no userId", async () => {
    await trackBeforeMatch({ isGuest: false }, room);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert for guest players", async () => {
    await trackBeforeMatch({ userId: "u1", isGuest: true }, room);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert when room is missing", async () => {
    await trackBeforeMatch({ userId: "u1", isGuest: false }, null);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips insert when room has no roomId", async () => {
    await trackBeforeMatch(
      { userId: "u1", isGuest: false },
      { ...room, roomId: undefined },
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it("inserts a match record when everything is valid", async () => {
    db.query.mockResolvedValue({ rows: [] });
    const player = { userId: "u2", isGuest: false };

    await trackBeforeMatch(player, room);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO matches"),
      [room.roomId, player.userId, room.host.userId, room.difficulty],
    );
  });

  it("does not throw when the db insert fails", async () => {
    db.query.mockRejectedValue(new Error("db down"));
    const player = { userId: "u2", isGuest: false };

    await expect(trackBeforeMatch(player, room)).resolves.not.toThrow();
  });
});

// isRoomStillValid tests
describe("isRoomStillValid", () => {
  it("returns false when the room doesn't exist", () => {
    const io = makeIo();
    const socket = {};

    const result = isRoomStillValid(io, socket, CODE);

    expect(result).toBe(false);
    expect(io._emit).not.toHaveBeenCalled();
  });

  it("returns true and makes no changes when enough players remain", () => {
    const io = makeIo();
    const socket = {};
    rooms[CODE] = makeRoom({ players: [{ userId: "u1" }, { userId: "u2" }] });
    roomIdToCode[rooms[CODE].roomId] = CODE;
    playersInRooms["u1"] = CODE;
    playersInRooms["u2"] = CODE;
    currentRoomNames.add(rooms[CODE].roomName);

    const result = isRoomStillValid(io, socket, CODE);

    expect(result).toBe(true);
    expect(io._emit).not.toHaveBeenCalled();
    expect(rooms[CODE]).toBeDefined();
    expect(roomIdToCode[rooms[CODE]?.roomId]).toBe(CODE);
  });

  it("cancels and fully cleans up the room when only one player remains", () => {
    const io = makeIo();
    const socket = {};
    rooms[CODE] = makeRoom({ players: [{ userId: "u1" }] });
    roomIdToCode[rooms[CODE].roomId] = CODE;
    playersInRooms["u1"] = CODE;
    currentRoomNames.add(rooms[CODE].roomName);

    const result = isRoomStillValid(io, socket, CODE);

    expect(result).toBe(false);
    expect(io._emit).toHaveBeenCalledWith("game-start-cancelled", {
      message: "Not enough players to start the game",
    });
    expect(broadcastRemoveRoom).toHaveBeenCalledWith(io, CODE);
    expect(playersInRooms["u1"]).toBeUndefined();
    expect(roomIdToCode["r1"]).toBeUndefined();
    expect(currentRoomNames.has("Test Room")).toBe(false);
    expect(rooms[CODE]).toBeUndefined();
  });

  it("cancels and cleans up when zero players remain", () => {
    const io = makeIo();
    const socket = {};
    rooms[CODE] = makeRoom({ players: [] });
    roomIdToCode[rooms[CODE].roomId] = CODE;
    currentRoomNames.add(rooms[CODE].roomName);

    const result = isRoomStillValid(io, socket, CODE);

    expect(result).toBe(false);
    expect(rooms[CODE]).toBeUndefined();
  });

  it("clears playersInRooms for every remaining player, not just one", () => {
    const io = makeIo();
    const socket = {};
    rooms[CODE] = makeRoom({ players: [{ userId: "u1" }] });
    playersInRooms["u1"] = CODE;
    playersInRooms["ghost"] = "SOMEOTHERROOM";

    isRoomStillValid(io, socket, CODE);

    expect(playersInRooms["u1"]).toBeUndefined();
    expect(playersInRooms["ghost"]).toBe("SOMEOTHERROOM"); // untouched
  });
});
