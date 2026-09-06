// Imports
import { describe, it, expect, vi, afterEach } from "vitest";
import { determineAllEvents } from "./roundEvents.js";

// Mock helpers
const makeRoom = (playerCount) => ({
  players: Array.from({ length: playerCount }, (_, i) => ({ userId: `u${i}` })),
  roundData: {},
});

// Queues up exact Math.random() return values in call order; once exhausted,
// falls back to `fallback` (default 1, which never triggers any event since
// all odds are 0.35 and the check is `Math.random() <= odds`).
const mockRandomSequence = (values, fallback = 1) => {
  let i = 0;
  vi.spyOn(Math, "random").mockImplementation(() => {
    const value = i < values.length ? values[i] : fallback;
    i++;
    return value;
  });
};

// Reset mocks after each test
afterEach(() => {
  vi.restoreAllMocks();
});

// no events triggered, baseline behavior
describe("determineAllEvents baseline (no events)", () => {
  it("uses exactly one round per player when nothing ever triggers", () => {
    mockRandomSequence([]); // always falls back to 1, never triggers

    const room = makeRoom(4);
    determineAllEvents(room);

    expect(room.totalRounds).toBe(4);
    for (let r = 1; r <= 4; r++) {
      expect(room.roundData[r].roundEvents).toBeUndefined();
    }
  });
});

// doubleElimination forced on (reduces total rounds)
describe("determineAllEvents with doubleElimination forced", () => {
  it("uses fewer total rounds and stops once remaining players are too low", () => {
    // Round order per iteration is doubleElimination, fasterTimer, missedBullet
    // Force doubleElimination to trigger (0) both allowed times, suppress the rest (1).
    mockRandomSequence([0, 1, 1, 0, 1, 1]);

    const room = makeRoom(6);
    determineAllEvents(room);

    expect(room.roundData[1].roundEvents.beforeRound.doubleElimination).toBe(
      true,
    );
    expect(room.roundData[2].roundEvents.beforeRound.doubleElimination).toBe(
      true,
    );
    // Remaining hits 2 after round 2, so doubleElimination can never fire again
    expect(
      room.roundData[3]?.roundEvents?.beforeRound?.doubleElimination,
    ).toBeUndefined();
    expect(
      room.roundData[4]?.roundEvents?.beforeRound?.doubleElimination,
    ).toBeUndefined();
    // 6 players, -2/-2/-1/-1 = 4 rounds total
    expect(room.totalRounds).toBe(4);
  });

  it("never triggers doubleElimination once 2 or fewer players remain", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const room = makeRoom(2);
    determineAllEvents(room);

    for (const round of Object.values(room.roundData)) {
      expect(round.roundEvents?.beforeRound?.doubleElimination).toBeUndefined();
    }
  });
});

// missedBullet forced on (increases total rounds)
describe("determineAllEvents with missedBullet forced", () => {
  it("increases total rounds beyond the player count due to stalled rounds", () => {
    mockRandomSequence([1, 1, 0, 1, 1, 0]);

    const room = makeRoom(3);
    determineAllEvents(room);

    expect(room.roundData[1].roundEvents.afterRound.missedBullet).toBe(true);
    expect(room.roundData[2].roundEvents.afterRound.missedBullet).toBe(true);
    // Baseline would be 3 rounds, 2 stalled rounds add 2 extra
    expect(room.totalRounds).toBe(5);
    expect(room.totalRounds).toBeGreaterThan(room.players.length);
  });
});

// event usage cap tests
describe("determineAllEvents respects the per-event usage cap", () => {
  it("never lets any single event trigger more than twice across the whole game", () => {
    vi.spyOn(Math, "random").mockReturnValue(0); // force every eligible check to trigger

    const room = makeRoom(10);
    determineAllEvents(room);

    const countTriggers = (type, eventName) =>
      Object.values(room.roundData).filter(
        (round) => round.roundEvents?.[type]?.[eventName],
      ).length;

    expect(
      countTriggers("beforeRound", "doubleElimination"),
    ).toBeLessThanOrEqual(2);
    expect(countTriggers("beforeRound", "fasterTimer")).toBeLessThanOrEqual(2);
    expect(countTriggers("afterRound", "missedBullet")).toBeLessThanOrEqual(2);
  });
});

// fasterTimer value test
describe("determineAllEvents fasterTimer value", () => {
  it("stores the 1.5 multiplier rather than true", () => {
    mockRandomSequence([1, 0]);

    const room = makeRoom(5);
    determineAllEvents(room);

    expect(room.roundData[1].roundEvents.beforeRound.fasterTimer).toBe(1.5);
  });
});

// structure tests
describe("determineAllEvents structure", () => {
  it("creates a roundData entry for every round up to totalRounds", () => {
    mockRandomSequence([]);

    const room = makeRoom(3);
    determineAllEvents(room);

    for (let r = 1; r <= room.totalRounds; r++) {
      expect(room.roundData[r]).toBeDefined();
    }
    expect(room.roundData[room.totalRounds + 1]).toBeUndefined();
  });
});
