// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ROUND_TIMER } from "./round.js";
import { ROUND_RECONNECT_TIMEOUT } from "./roundUtils.js";

// Mock dependencies
vi.mock("../../utils/timers.js", () => ({
  cancellableSleep: vi.fn(),
}));

vi.mock("../../utils/playerList.js", () => ({
  buildPlayerList: vi.fn(() => []),
}));

vi.mock("../../db.js", () => ({
  default: { query: vi.fn() },
}));

// Imports under test
import { cancellableSleep } from "../../utils/timers.js";
import db from "../../db.js";
import { rooms } from "../../globals.js";
import {
  waitForReconnectingPlayers,
  buildReconnectData,
  firstRoundStart,
  otherRoundStart,
  startRoundTimer,
  trackMatch,
  trackSubmissionElimination,
} from "./roundUtils.js";

// Moch helpers
const CODE = "ROOM01";
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makeRoom = (overrides = {}) => ({
  code: CODE,
  currentRound: 1,
  roundData: { 1: { question: { title: "Two Sum" } } },
  players: [],
  ...overrides,
});
const makeCancellableSleepMock = () => {
  const cancel = vi.fn();
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  cancellableSleep.mockReturnValue({ promise, cancel });
  return { cancel, resolvePromise };
};

// Reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
});

// waitForReconnectingPlayers tests
describe("waitForReconnectingPlayers", () => {
  it("does nothing when the room doesn't exist", async () => {
    const io = makeIo();
    await waitForReconnectingPlayers(io, CODE);
    expect(io.to).not.toHaveBeenCalled();
  });

  it("does nothing when there is no round data for the current round", async () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ roundData: {} });
    await waitForReconnectingPlayers(io, CODE);
    expect(io.to).not.toHaveBeenCalled();
  });

  it("resolves immediately when no players are reconnecting", async () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ players: [{ isReconnecting: false }] });

    await waitForReconnectingPlayers(io, CODE);

    expect(io.to).not.toHaveBeenCalled();
    expect(cancellableSleep).not.toHaveBeenCalled();
  });

  it("waits for reconnecting players and notifies the room once resolved", async () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ players: [{ isReconnecting: true }] });
    const { cancel, resolvePromise } = makeCancellableSleepMock();

    const resultPromise = waitForReconnectingPlayers(io, CODE);

    expect(io._emit).toHaveBeenCalledWith("waiting-for-reconnect");
    expect(cancellableSleep).toHaveBeenCalledWith(ROUND_RECONNECT_TIMEOUT);
    expect(rooms[CODE].roundData[1].reconnectSleepCancel).toBe(cancel);

    resolvePromise();
    await resultPromise;

    expect(rooms[CODE].roundData[1].reconnectSleepCancel).toBeNull();
    expect(io._emit).toHaveBeenCalledWith("players-reconnected", {
      players: [],
    });
  });
});

// buildReconnectData tests
describe("buildReconnectData", () => {
  it("builds countdown/game-started/new-round data with endsAt", () => {
    const room = makeRoom({
      roundData: { 1: { question: "q", endsAt: 12345 } },
    });

    for (const phase of ["countdown", "game-started", "new-round"]) {
      buildReconnectData(room, phase);
      expect(room.reconnectData).toEqual(
        expect.objectContaining({ phase, endsAt: 12345 }),
      );
    }
  });

  it("builds round-tick data with a default timeMultiplier of 1", () => {
    const room = makeRoom({
      roundData: { 1: { question: "q", roundEndsAt: 999 } },
    });

    buildReconnectData(room, "round-tick");

    expect(room.reconnectData).toEqual(
      expect.objectContaining({
        phase: "round-tick",
        roundEndsAt: 999,
        timeMultiplier: 1,
      }),
    );
  });

  it("uses the actual fasterTimer multiplier when present for round-tick", () => {
    const room = makeRoom({
      roundData: {
        1: {
          question: "q",
          roundEndsAt: 999,
          roundEvents: { beforeRound: { fasterTimer: 1.5 } },
        },
      },
    });

    buildReconnectData(room, "round-tick");

    expect(room.reconnectData.timeMultiplier).toBe(1.5);
  });

  it("builds results data with round results, eliminations, missed player, and winner", () => {
    const room = makeRoom({
      roundData: {
        1: {
          question: "q",
          roundResults: [{ score: 90 }],
          eliminatedPlayers: [{ username: "bob" }],
          missedPlayer: { username: "carol" },
          winner: { username: "alice" },
        },
      },
    });

    buildReconnectData(room, "results");

    expect(room.reconnectData).toEqual(
      expect.objectContaining({
        phase: "results",
        roundResults: [{ score: 90 }],
        eliminatedPlayers: [{ username: "bob" }],
        missedPlayer: { username: "carol" },
        winner: { username: "alice" },
      }),
    );
  });

  it("does not set reconnectData for an unrecognized phase", () => {
    const room = makeRoom();
    buildReconnectData(room, "some-unknown-phase");
    expect(room.reconnectData).toBeUndefined();
  });
});

// firstRoundStart tests
describe("firstRoundStart", () => {
  it("emits game-started with the round's question and countdown", () => {
    const io = makeIo();
    rooms[CODE] = makeRoom();
    const roundData = { endsAt: 123, question: { title: "Two Sum" } };

    firstRoundStart(io, CODE, roundData);

    expect(io._emit).toHaveBeenCalledWith(
      "game-started",
      expect.objectContaining({
        code: CODE,
        endsAt: 123,
        question: { title: "Two Sum" },
      }),
    );
    expect(rooms[CODE].reconnectData.phase).toBe("game-started");
  });
});

describe("otherRoundStart", () => {
  it("emits new-round with the updated round number", () => {
    const io = makeIo();
    rooms[CODE] = makeRoom();
    const roundData = { endsAt: 456, question: { title: "FizzBuzz" } };

    otherRoundStart(io, CODE, roundData, 2);

    expect(io._emit).toHaveBeenCalledWith(
      "new-round",
      expect.objectContaining({
        currentRound: 2,
        newEndsAt: 456,
        question: { title: "FizzBuzz" },
      }),
    );
    expect(rooms[CODE].reconnectData.phase).toBe("new-round");
  });
});

// startRoundTimer tests
describe("startRoundTimer", () => {
  it("skips starting the timer entirely when no players remain", async () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ players: [] });
    const roundData = {};

    await startRoundTimer(io, CODE, roundData, ROUND_TIMER);

    expect(cancellableSleep).not.toHaveBeenCalled();
    expect(roundData.submissionsAllowed).toBe(true);
  });

  it("uses a 1x multiplier by default and emits round-tick", async () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ players: [{ userId: "u1" }] });
    const roundData = {};
    const { resolvePromise } = makeCancellableSleepMock();

    const donePromise = startRoundTimer(io, CODE, roundData, ROUND_TIMER);

    expect(io._emit).toHaveBeenCalledWith(
      "round-tick",
      expect.objectContaining({ timeMultiplier: 1 }),
    );
    expect(cancellableSleep).toHaveBeenCalledWith(ROUND_TIMER);

    resolvePromise();
    await donePromise;

    expect(roundData.cancelRoundTimer).toBeNull();
  });

  it("applies the fasterTimer multiplier to the actual round duration", async () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ players: [{ userId: "u1" }] });
    const roundData = { roundEvents: { beforeRound: { fasterTimer: 1.5 } } };
    const { resolvePromise } = makeCancellableSleepMock();

    const donePromise = startRoundTimer(io, CODE, roundData, ROUND_TIMER);
    expect(cancellableSleep).toHaveBeenCalledWith(ROUND_TIMER / 1.5);

    resolvePromise();
    await donePromise;
  });

  it("stores a cancel function while the timer is running", async () => {
    const io = makeIo();
    rooms[CODE] = makeRoom({ players: [{ userId: "u1" }] });
    const roundData = {};
    const { cancel, resolvePromise } = makeCancellableSleepMock();

    const donePromise = startRoundTimer(io, CODE, roundData, ROUND_TIMER);

    expect(roundData.cancelRoundTimer).toBe(cancel);

    resolvePromise();
    await donePromise;
  });
});

// trackMatch tests
describe("trackMatch", () => {
  it("skips the update when player is missing", async () => {
    await trackMatch(null, "r1", true, 100);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips the update when player has no userId", async () => {
    await trackMatch({ isGuest: false }, "r1", true, 100);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips the update for guest players", async () => {
    await trackMatch({ userId: "u1", isGuest: true }, "r1", true, 100);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips the update when roomId is missing", async () => {
    await trackMatch({ userId: "u1", isGuest: false }, null, true, 100);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("updates the match with the correct params", async () => {
    db.query.mockResolvedValue({});
    const player = { userId: "u1", username: "alice", isGuest: false };

    await trackMatch(player, "r1", true, 250);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE matches"),
      [true, 250, "r1", "u1"],
    );
  });

  it("does not throw when the db update fails", async () => {
    db.query.mockRejectedValue(new Error("db down"));
    const player = { userId: "u1", isGuest: false };

    await expect(trackMatch(player, "r1", false, 10)).resolves.not.toThrow();
  });
});

// trackSubmissionElimination tests
describe("trackSubmissionElimination", () => {
  it("skips the insert when there are no eliminated ids", async () => {
    await trackSubmissionElimination("sub1", []);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("skips the insert when submissionId is missing", async () => {
    await trackSubmissionElimination(null, ["u1"]);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("builds correct placeholders and values for a single eliminated player", async () => {
    db.query.mockResolvedValue({});

    await trackSubmissionElimination("sub1", ["u1"]);

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("($1, $2)"), [
      "sub1",
      "u1",
    ]);
  });

  it("builds correct placeholders and values for multiple eliminated players", async () => {
    db.query.mockResolvedValue({});

    await trackSubmissionElimination("sub1", ["u1", "u2"]);

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("($1, $2), ($3, $4)"),
      ["sub1", "u1", "sub1", "u2"],
    );
  });

  it("does not throw when the db insert fails", async () => {
    db.query.mockRejectedValue(new Error("db down"));

    await expect(
      trackSubmissionElimination("sub1", ["u1"]),
    ).resolves.not.toThrow();
  });
});
