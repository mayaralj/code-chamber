// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./deleteRoom.js", () => ({
  default: vi.fn(),
}));

vi.mock("../broadcast/broadcastRooms.js", () => ({
  broadcastUpdateRoom: vi.fn(),
}));

vi.mock("../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

// Imports under test
import deleteRoom from "./deleteRoom.js";
import { broadcastUpdateRoom } from "../broadcast/broadcastRooms.js";
import { rooms, playersInRooms } from "../globals.js";
import leaveRoom from "./leaveRoom.js";

// Mock helpers
const CODE = "ROOM01";
const makeSocket = (overrides = {}) => ({
  id: "socket1",
  data: { id: "u1", username: "alice" },
  leave: vi.fn(),
  ...overrides,
});
const makeIo = () => ({
  to: vi.fn(() => ({ emit: vi.fn() })),
});
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  host: { userId: "u1" },
  code: CODE,
  players: [{ userId: "u1" }],
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

// no-op guards tests
describe("leaveRoom no-op guards", () => {
  it("does nothing when code is falsy", () => {
    const io = makeIo();
    const socket = makeSocket();

    leaveRoom(io, socket, null);

    expect(deleteRoom).not.toHaveBeenCalled();
  });

  it("does nothing when the room does not exist", () => {
    const io = makeIo();
    const socket = makeSocket();

    leaveRoom(io, socket, CODE);

    expect(deleteRoom).not.toHaveBeenCalled();
    expect(socket.leave).not.toHaveBeenCalled();
  });

  it("does nothing when the game has already started (handled elsewhere)", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ isGameStarted: true });

    leaveRoom(io, socket, CODE);

    expect(deleteRoom).not.toHaveBeenCalled();
    expect(socket.leave).not.toHaveBeenCalled();
    expect(rooms[CODE].players).toHaveLength(1); // untouched
  });

  it("does nothing when the player is not found in the room", () => {
    const io = makeIo();
    const socket = makeSocket({ data: { id: "notInRoom" } });
    rooms[CODE] = makeRoom(); // only contains u1

    leaveRoom(io, socket, CODE);

    expect(deleteRoom).not.toHaveBeenCalled();
    expect(socket.leave).not.toHaveBeenCalled();
    expect(rooms[CODE].players).toHaveLength(1);
  });
});

// LeaveRoom when the host leaves also results in the room being deleted
describe("leaveRoom when the host leaves", () => {
  it("deletes the room even if other players remain", () => {
    const io = makeIo();
    const socket = makeSocket(); // u1, the host
    rooms[CODE] = makeRoom({
      host: { userId: "u1" },
      players: [{ userId: "u1" }, { userId: "u2" }],
    });
    playersInRooms["u1"] = CODE;

    leaveRoom(io, socket, CODE);

    expect(deleteRoom).toHaveBeenCalledWith(
      io,
      rooms,
      CODE,
      "Host left the room",
    );
    expect(playersInRooms["u1"]).toBeUndefined();
    expect(socket.leave).toHaveBeenCalledWith(CODE);
    // Normal leave notifications should NOT fire in this branch
    expect(broadcastUpdateRoom).not.toHaveBeenCalled();
  });

  it("deletes the room when room.host is missing entirely (defensive branch)", () => {
    const io = makeIo();
    const socket = makeSocket();
    rooms[CODE] = makeRoom({ host: null });

    leaveRoom(io, socket, CODE);

    expect(deleteRoom).toHaveBeenCalledWith(
      io,
      rooms,
      CODE,
      "Host left the room",
    );
  });
});

// LeaveRoom when the last player leaves, also results in the room being deleted
describe("leaveRoom when the last player leaves", () => {
  it("deletes the room as empty when a non-host last player leaves", () => {
    const io = makeIo();
    const socket = makeSocket({ data: { id: "u2" } });
    rooms[CODE] = makeRoom({
      host: { userId: "u1" }, // host is someone else, already gone
      players: [{ userId: "u2" }],
    });
    playersInRooms["u2"] = CODE;

    leaveRoom(io, socket, CODE);

    expect(deleteRoom).toHaveBeenCalledWith(
      io,
      rooms,
      CODE,
      "Room became empty",
    );
    expect(playersInRooms["u2"]).toBeUndefined();
  });
});

// Normal leaveRoom path when the room remains after a player leaves
describe("leaveRoom normal departure", () => {
  it("removes the player and notifies remaining players without deleting the room", () => {
    const io = makeIo();
    const socket = makeSocket({ data: { id: "u2" } });
    rooms[CODE] = makeRoom({
      host: { userId: "u1" },
      players: [{ userId: "u1" }, { userId: "u2" }],
    });
    playersInRooms["u2"] = CODE;

    leaveRoom(io, socket, CODE);

    expect(deleteRoom).not.toHaveBeenCalled();
    expect(rooms[CODE].players).toHaveLength(1);
    expect(rooms[CODE].players[0].userId).toBe("u1");
    expect(playersInRooms["u2"]).toBeUndefined();
    expect(socket.leave).toHaveBeenCalledWith(CODE);
    expect(io.to).toHaveBeenCalledWith(CODE);
    expect(broadcastUpdateRoom).toHaveBeenCalledWith(io, rooms[CODE]);
  });
});
