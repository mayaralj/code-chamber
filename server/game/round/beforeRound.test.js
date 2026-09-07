// Imports
import { describe, it, expect, vi, afterEach } from "vitest";
import beforeRound from "./beforeRound.js";
import { COUNTDOWN_TIMER } from "./round.js";

// Mock helpers
const makePlayer = (userId, gameData = {}) => ({
  userId,
  gameData,
});
const makeRoom = (overrides = {}) => ({
  currentRound: 0,
  roundData: { 1: {}, 2: {} },
  players: [],
  ...overrides,
});

// Reset mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// beforeRound round progression tests
describe("beforeRound round progression", () => {
  it("increments currentRound by 1", () => {
    const room = makeRoom({ currentRound: 0 });

    beforeRound(room, 5);

    expect(room.currentRound).toBe(1);
  });

  it("increments from an arbitrary round, not just from 0", () => {
    const room = makeRoom({ currentRound: 3, roundData: { 4: {} } });

    beforeRound(room, 5);

    expect(room.currentRound).toBe(4);
  });

  it("returns the new round number, the round's data, and its roundEvents", () => {
    const room = makeRoom({
      currentRound: 0,
      roundData: { 1: { roundEvents: { beforeRound: { fasterTimer: 1.5 } } } },
    });

    const [curRound, roundData, roundEvents] = beforeRound(room, 5);

    expect(curRound).toBe(1);
    expect(roundData).toBe(room.roundData[1]);
    expect(roundEvents).toEqual({ beforeRound: { fasterTimer: 1.5 } });
  });

  it("returns undefined roundEvents when the round has none", () => {
    const room = makeRoom({ currentRound: 0, roundData: { 1: {} } });

    const [, , roundEvents] = beforeRound(room, 5);

    expect(roundEvents).toBeUndefined();
  });
});

// gameData initialization tests
describe("beforeRound player gameData initialization", () => {
  it("initializes roundData on a player's gameData when it doesn't exist yet", () => {
    const player = makePlayer("u1", {});
    const room = makeRoom({ players: [player] });

    beforeRound(room, 5);

    expect(player.gameData.roundData[1]).toEqual({
      codeStatus: "not-submitted",
      codeInput: "",
    });
  });

  it("preserves previous rounds' data while adding the new round's entry", () => {
    const player = makePlayer("u1", {
      roundData: { 1: { codeStatus: "submitted", codeInput: "old code" } },
    });
    const room = makeRoom({ currentRound: 1, players: [player] });

    beforeRound(room, 5);

    expect(player.gameData.roundData[1]).toEqual({
      codeStatus: "submitted",
      codeInput: "old code",
    });
    expect(player.gameData.roundData[2]).toEqual({
      codeStatus: "not-submitted",
      codeInput: "",
    });
  });

  it("initializes round data for every player in the room", () => {
    const p1 = makePlayer("u1", {});
    const p2 = makePlayer("u2", {});
    const room = makeRoom({ players: [p1, p2] });

    beforeRound(room, 5);

    expect(p1.gameData.roundData[1]).toBeDefined();
    expect(p2.gameData.roundData[1]).toBeDefined();
  });

  it("resets a player's entry for the round to not-submitted with empty code, even if it already existed", () => {
    const player = makePlayer("u1", {
      roundData: { 1: { codeStatus: "judging", codeInput: "leftover" } },
    });
    const room = makeRoom({ currentRound: 0, players: [player] });

    beforeRound(room, 5);

    expect(player.gameData.roundData[1]).toEqual({
      codeStatus: "not-submitted",
      codeInput: "",
    });
  });
});

// beforeRound timing tests
describe("beforeRound timing", () => {
  it("sets endsAt based on the countdown timer", () => {
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const room = makeRoom();

    beforeRound(room, COUNTDOWN_TIMER);

    expect(room.roundData[1].endsAt).toBe(now + COUNTDOWN_TIMER);
  });

  it("updates room.lastActivity", () => {
    const now = 2_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const room = makeRoom();

    beforeRound(room, 5);

    expect(room.lastActivity).toBe(now);
  });
});
