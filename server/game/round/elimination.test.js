// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("./roundUtils.js", () => ({
  trackMatch: vi.fn(),
  trackSubmissionElimination: vi.fn(),
}));

// Imports under test
import { trackMatch, trackSubmissionElimination } from "./roundUtils.js";
import { rooms, playersInRooms } from "../../globals.js";
import {
  determinePlayerEliminated,
  eliminatePlayer,
  processRoundElims,
} from "./elimination.js";

// Mock helpers
const CODE = "ROOM01";
const makeIo = () => {
  const emit = vi.fn();
  const socketLeave = vi.fn();
  return {
    to: vi.fn(() => ({ emit })),
    sockets: { sockets: { get: vi.fn(() => ({ leave: socketLeave })) } },
    _emit: emit,
    _socketLeave: socketLeave,
  };
};
const makePlayer = (userId, overrides = {}) => ({
  userId,
  username: userId,
  socketId: `socket-${userId}`,
  ...overrides,
});
const makeRoom = (overrides = {}) => ({
  roomId: "r1",
  gameStartedAt: Date.now() - 10000,
  players: [],
  ...overrides,
});

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  for (const key of Object.keys(playersInRooms)) delete playersInRooms[key];
  trackSubmissionElimination.mockResolvedValue(undefined);
});

// restore mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// determinePlayerEliminated tests
describe("determinePlayerEliminated", () => {
  it("selects the player whose weighted random chance is highest", () => {
    const roundData = {
      roundResults: [
        { player: makePlayer("u1"), score: 0 },
        { player: makePlayer("u2"), score: 90 },
      ],
    };
    let calls = 0;
    vi.spyOn(Math, "random").mockImplementation(() =>
      calls++ === 0 ? 0.5 : 0.9,
    );

    const eliminated = determinePlayerEliminated(roundData);

    expect(eliminated.userId).toBe("u1");
  });

  it("completely excludes ignorePlayer from consideration", () => {
    const roundData = {
      roundResults: [
        { player: makePlayer("u1"), score: 50 },
        { player: makePlayer("u2"), score: 50 }, // this one is ignored
        { player: makePlayer("u3"), score: 50 },
      ],
    };

    let calls = 0;
    vi.spyOn(Math, "random").mockImplementation(() =>
      calls++ === 0 ? 0.1 : 0.9,
    );

    const eliminated = determinePlayerEliminated(roundData, { userId: "u2" });

    expect(eliminated.userId).not.toBe("u2");
  });

  it("still gives a perfect scorer a small (5%) chance of elimination", () => {
    const roundData = {
      roundResults: [
        { player: makePlayer("perfect"), score: 100 },
        { player: makePlayer("worst"), score: 0 },
      ],
    };

    let calls = 0;
    vi.spyOn(Math, "random").mockImplementation(() =>
      calls++ === 0 ? 1 : 0.04,
    );

    const eliminated = determinePlayerEliminated(roundData);

    expect(eliminated.userId).toBe("perfect");
  });

  it("returns null when the only player is the one being ignored", () => {
    const roundData = {
      roundResults: [{ player: makePlayer("u1"), score: 50 }],
    };

    const eliminated = determinePlayerEliminated(roundData, { userId: "u1" });

    expect(eliminated).toBeNull();
  });
});

// eliminatePlayer tests
describe("eliminatePlayer", () => {
  it("does nothing when there is no player to eliminate", () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ players: [makePlayer("u1")] });

    eliminatePlayer(io, CODE, {}, null);

    expect(trackMatch).not.toHaveBeenCalled();
    expect(rooms[CODE].players).toHaveLength(1);
  });

  it("does nothing when the room doesn't exist", () => {
    const io = makeIo();
    const player = makePlayer("u1");

    eliminatePlayer(io, CODE, {}, player);

    expect(trackMatch).not.toHaveBeenCalled();
  });

  it("removes the player, tracks the match, and cleans up their state", () => {
    const io = makeIo();
    const eliminated = makePlayer("u1", { gameData: { roundData: {} } });
    const other = makePlayer("u2");
    rooms[CODE] = makeRoom({ players: [eliminated, other] });
    playersInRooms["u1"] = CODE;
    const roundData = {};

    eliminatePlayer(io, CODE, roundData, eliminated);

    expect(trackMatch).toHaveBeenCalledWith(
      eliminated,
      "r1",
      false,
      expect.any(Number),
    );
    expect(rooms[CODE].players).toEqual([other]);
    expect(roundData.eliminatedPlayers).toEqual([eliminated]);
    expect(io.to).toHaveBeenCalledWith("socket-u1");
    expect(io._emit).toHaveBeenCalledWith("player-eliminated");
    expect(io._socketLeave).toHaveBeenCalledWith(CODE);
    expect(eliminated.gameData).toBeUndefined();
    expect(playersInRooms["u1"]).toBeUndefined();
  });

  it("appends to an existing eliminatedPlayers list rather than overwriting it", () => {
    const io = makeIo();
    const eliminated = makePlayer("u2");
    rooms[CODE] = makeRoom({ players: [eliminated] });
    const roundData = { eliminatedPlayers: [makePlayer("previouslyOut")] };

    eliminatePlayer(io, CODE, roundData, eliminated);

    expect(roundData.eliminatedPlayers).toHaveLength(2);
    expect(roundData.eliminatedPlayers[0].userId).toBe("previouslyOut");
  });

  it("does not throw when the player has no live socket connected", () => {
    const io = makeIo();
    io.sockets.sockets.get.mockReturnValue(undefined);
    const eliminated = makePlayer("u1");
    rooms[CODE] = makeRoom({ players: [eliminated] });

    expect(() => eliminatePlayer(io, CODE, {}, eliminated)).not.toThrow();
  });
});

// processRoundElims tests
describe("processRoundElims", () => {
  beforeEach(() => {
    // Mock Math.random to a fixed value for deterministic testing
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("skips elimination with 1 or fewer players but still tracks submission eliminations", () => {
    const io = makeIo();
    const player = makePlayer("u1");
    rooms[CODE] = makeRoom({ players: [player] });
    const roundData = {
      roundResults: [{ player, score: 50, submissionId: "s1" }],
    };

    processRoundElims(io, CODE, roundData, {});

    expect(rooms[CODE].players).toHaveLength(1);
    expect(trackSubmissionElimination).toHaveBeenCalledWith("s1", []);
  });

  it("eliminates exactly one player when no special events are active", () => {
    const io = makeIo();
    const low = makePlayer("low");
    const high = makePlayer("high");
    rooms[CODE] = makeRoom({ players: [low, high] });
    const roundData = {
      roundResults: [
        { player: low, score: 0, submissionId: "s1" },
        { player: high, score: 100, submissionId: "s2" },
      ],
    };

    processRoundElims(io, CODE, roundData, {});

    expect(rooms[CODE].players).toEqual([high]);
    expect(roundData.eliminatedPlayers).toHaveLength(1);
    expect(roundData.eliminatedPlayers[0].userId).toBe("low");
  });

  it("eliminates two players when doubleElimination is active", () => {
    const io = makeIo();
    const players = [
      makePlayer("lowest"),
      makePlayer("second-lowest"),
      makePlayer("high1"),
      makePlayer("high2"),
    ];
    rooms[CODE] = makeRoom({ players: [...players] });
    const roundData = {
      roundResults: [
        { player: players[0], score: 0, submissionId: "s1" },
        { player: players[1], score: 20, submissionId: "s2" },
        { player: players[2], score: 80, submissionId: "s3" },
        { player: players[3], score: 90, submissionId: "s4" },
      ],
    };

    processRoundElims(io, CODE, roundData, {
      beforeRound: { doubleElimination: true },
    });

    expect(rooms[CODE].players).toHaveLength(2);
    expect(roundData.eliminatedPlayers).toHaveLength(2);
  });

  it("does not attempt a second elimination if only 2 players remain, even with doubleElimination active", () => {
    const io = makeIo();
    const low = makePlayer("low");
    const high = makePlayer("high");
    rooms[CODE] = makeRoom({ players: [low, high] });
    const roundData = {
      roundResults: [
        { player: low, score: 0, submissionId: "s1" },
        { player: high, score: 100, submissionId: "s2" },
      ],
    };

    processRoundElims(io, CODE, roundData, {
      beforeRound: { doubleElimination: true },
    });

    expect(rooms[CODE].players).toHaveLength(1);
    expect(roundData.eliminatedPlayers).toHaveLength(1);
  });

  it("spares the picked player when missedBullet is active", () => {
    const io = makeIo();
    const low = makePlayer("low");
    const high = makePlayer("high");
    rooms[CODE] = makeRoom({ players: [low, high] });
    const roundData = {
      roundResults: [
        { player: low, score: 0, submissionId: "s1" },
        { player: high, score: 100, submissionId: "s2" },
      ],
    };

    processRoundElims(io, CODE, roundData, {
      afterRound: { missedBullet: true },
    });

    expect(rooms[CODE].players).toHaveLength(2);
    expect(roundData.missedPlayer.userId).toBe("low");
    expect(io._emit).toHaveBeenCalledWith("player-missed");
    expect(roundData.eliminatedPlayers).toBeUndefined();
  });

  it("combines missedBullet and doubleElimination: only the second pick is eliminated", () => {
    const io = makeIo();
    const players = [
      makePlayer("lowest"),
      makePlayer("second-lowest"),
      makePlayer("high1"),
      makePlayer("high2"),
    ];
    rooms[CODE] = makeRoom({ players: [...players] });
    const roundData = {
      roundResults: [
        { player: players[0], score: 0, submissionId: "s1" },
        { player: players[1], score: 20, submissionId: "s2" },
        { player: players[2], score: 80, submissionId: "s3" },
        { player: players[3], score: 90, submissionId: "s4" },
      ],
    };

    processRoundElims(io, CODE, roundData, {
      beforeRound: { doubleElimination: true },
      afterRound: { missedBullet: true },
    });

    expect(rooms[CODE].players).toHaveLength(3);
    expect(roundData.eliminatedPlayers).toHaveLength(1);
    expect(roundData.missedPlayer.userId).toBe("lowest");
  });

  it("tracks a submission elimination entry for every round result with the eliminated ids", () => {
    const io = makeIo();
    const low = makePlayer("low");
    const high = makePlayer("high");
    rooms[CODE] = makeRoom({ players: [low, high] });
    const roundData = {
      roundResults: [
        { player: low, score: 0, submissionId: "s1" },
        { player: high, score: 100, submissionId: "s2" },
      ],
    };

    processRoundElims(io, CODE, roundData, {});

    expect(trackSubmissionElimination).toHaveBeenCalledWith("s1", ["low"]);
    expect(trackSubmissionElimination).toHaveBeenCalledWith("s2", ["low"]);
  });

  it("does not throw synchronously even if submission elimination tracking rejects", () => {
    trackSubmissionElimination.mockRejectedValue(new Error("db down"));
    const io = makeIo();
    const player = makePlayer("u1");
    rooms[CODE] = makeRoom({ players: [player] });
    const roundData = {
      roundResults: [{ player, score: 50, submissionId: "s1" }],
    };

    expect(() => processRoundElims(io, CODE, roundData, {})).not.toThrow();
  });
});
