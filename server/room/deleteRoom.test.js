// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../broadcast/broadcastRooms.js", () => ({
  broadcastRemoveRoom: vi.fn(),
}));

// Imports under test
import { broadcastRemoveRoom } from "../broadcast/broadcastRooms.js";
import {
  rooms,
  roomIdToCode,
  playersInRooms,
  currentRoomNames,
} from "../globals.js";
import deleteRoom from "./deleteRoom.js";

// Mock helpers
const CODE = "ROOM01";
const makeIo = () => {
  const emit = vi.fn();
  const socketsLeave = vi.fn();
  return {
    to: vi.fn(() => ({ emit })),
    in: vi.fn(() => ({ socketsLeave })),
    _emit: emit,
    _socketsLeave: socketsLeave,
  };
};
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  code: CODE,
  roomName: "Test Room",
  players: [{ userId: "u1" }, { userId: "u2" }],
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  for (const key of Object.keys(roomIdToCode)) delete roomIdToCode[key];
  for (const key of Object.keys(playersInRooms)) delete playersInRooms[key];
  currentRoomNames.clear();
});

// no-op guard tests
describe("deleteRoom no-op guard", () => {
  it("does nothing when the room does not exist", () => {
    const io = makeIo();

    deleteRoom(io, CODE, "some message");

    expect(broadcastRemoveRoom).not.toHaveBeenCalled();
    expect(io.to).not.toHaveBeenCalled();
  });
});

// Full cleanup tests
describe("deleteRoom full cleanup", () => {
  it("removes every trace of the room from shared state", () => {
    const io = makeIo();
    const room = makeRoom();
    rooms[CODE] = room;
    roomIdToCode[room.roomId] = CODE;
    playersInRooms["u1"] = CODE;
    playersInRooms["u2"] = CODE;
    currentRoomNames.add(room.roomName);

    deleteRoom(io, CODE, "Host left the room");

    expect(roomIdToCode[room.roomId]).toBeUndefined();
    expect(Object.keys(roomIdToCode)).toHaveLength(0);

    // Every player's mapping should be gone
    expect(playersInRooms["u1"]).toBeUndefined();
    expect(playersInRooms["u2"]).toBeUndefined();

    // Room name freed up for reuse
    expect(currentRoomNames.has(room.roomName)).toBe(false);

    // Room itself removed
    expect(rooms[CODE]).toBeUndefined();

    // Notifications fired correctly
    expect(io.to).toHaveBeenCalledWith(CODE);
    expect(io._emit).toHaveBeenCalledWith("room-deleted", {
      message: "Host left the room",
    });
    expect(io.in).toHaveBeenCalledWith(CODE);
    expect(io._socketsLeave).toHaveBeenCalledWith(CODE);
    expect(broadcastRemoveRoom).toHaveBeenCalledWith(io, CODE);
  });

  it("falls back to a default message when none is provided", () => {
    const io = makeIo();
    rooms[CODE] = makeRoom();

    deleteRoom(io, CODE);

    expect(io._emit).toHaveBeenCalledWith("room-deleted", {
      message: "Room deleted",
    });
  });

  it("clears playersInRooms for every player, even with many players", () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({
      players: [
        { userId: "u1" },
        { userId: "u2" },
        { userId: "u3" },
        { userId: "u4" },
      ],
    });
    playersInRooms["u1"] = CODE;
    playersInRooms["u2"] = CODE;
    playersInRooms["u3"] = CODE;
    playersInRooms["u4"] = CODE;

    deleteRoom(io, CODE);

    for (const id of ["u1", "u2", "u3", "u4"]) {
      expect(playersInRooms[id]).toBeUndefined();
    }
  });
});
