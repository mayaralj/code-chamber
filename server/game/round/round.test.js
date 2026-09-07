// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  COUNTDOWN_TIMER,
  ROUND_TIMER,
  WAIT_BEFORE_RESULTS,
  FORCE_SUBMIT_TIMEOUT,
} from "./round.js";

// Mock dependencies
vi.mock("../../utils/timers.js", () => ({
  sleep: vi.fn(() => Promise.resolve()),
}));

vi.mock("./submission.js", () => ({
  getPlayerCodeAll: vi.fn(() => Promise.resolve([])),
  forceSubmitAll: vi.fn(() => Promise.resolve()),
}));

vi.mock("./elimination.js", () => ({
  processRoundElims: vi.fn(),
}));

vi.mock("./results.js", () => ({
  sendResults: vi.fn(() => Promise.resolve()),
  gameOver: vi.fn(() => Promise.resolve()),
  calculateAllScores: vi.fn(),
}));

vi.mock("./roundUtils.js", () => ({
  waitForReconnectingPlayers: vi.fn(() => Promise.resolve()),
  buildReconnectData: vi.fn(),
  firstRoundStart: vi.fn(),
  otherRoundStart: vi.fn(),
  startRoundTimer: vi.fn(() => Promise.resolve()),
}));

vi.mock("./beforeRound.js", () => ({
  default: vi.fn(),
}));

// Imports under test
import { sleep } from "../../utils/timers.js";
import { getPlayerCodeAll, forceSubmitAll } from "./submission.js";
import { processRoundElims } from "./elimination.js";
import { sendResults, gameOver, calculateAllScores } from "./results.js";
import {
  waitForReconnectingPlayers,
  buildReconnectData,
  firstRoundStart,
  otherRoundStart,
  startRoundTimer,
} from "./roundUtils.js";
import beforeRound from "./beforeRound.js";
import { rooms } from "../../globals.js";
import startRound from "./round.js";

// Mock helpers
const CODE = "ROOM01";
const makeIo = () => {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit };
};
const makeRoom = (overrides = {}) => ({
  code: CODE,
  players: [{ userId: "u1" }, { userId: "u2" }, { userId: "u3" }],
  ...overrides,
});
const setBeforeRoundResult = (curRound, roundData = {}, roundEvents) => {
  beforeRound.mockReturnValue([curRound, roundData, roundEvents]);
  return roundData;
};

// reset mocks and globals before each test
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rooms)) delete rooms[key];
  rooms[CODE] = makeRoom();
  getPlayerCodeAll.mockResolvedValue([]);
});

// startRound routing tests
describe("startRound routing", () => {
  it("calls firstRoundStart on round 1", async () => {
    setBeforeRoundResult(1, {});

    await startRound(makeIo(), {}, CODE);

    expect(firstRoundStart).toHaveBeenCalled();
    expect(otherRoundStart).not.toHaveBeenCalled();
  });

  it("calls otherRoundStart on any round after the first", async () => {
    setBeforeRoundResult(2, {});

    await startRound(makeIo(), {}, CODE);

    expect(otherRoundStart).toHaveBeenCalled();
    expect(firstRoundStart).not.toHaveBeenCalled();
  });
});

// startRound phase sequencing tests
describe("startRound phase sequencing", () => {
  it("runs the countdown sleep, round timer, and reconnect waits in order", async () => {
    setBeforeRoundResult(1, {});
    const io = makeIo();

    await startRound(io, {}, CODE);

    expect(sleep).toHaveBeenCalledWith(COUNTDOWN_TIMER);
    expect(io._emit).toHaveBeenCalledWith("timer-finished");
    expect(startRoundTimer).toHaveBeenCalledWith(
      io,
      CODE,
      expect.any(Object),
      ROUND_TIMER,
    );
    expect(io._emit).toHaveBeenCalledWith("round-timer-finished");
    expect(waitForReconnectingPlayers).toHaveBeenCalled();
    expect(getPlayerCodeAll).toHaveBeenCalledWith(
      io,
      CODE,
      expect.any(Object),
      1,
      FORCE_SUBMIT_TIMEOUT,
    );
  });

  it("disables submissions once the round timer finishes", async () => {
    const roundData = setBeforeRoundResult(1, {});

    await startRound(makeIo(), {}, CODE);

    expect(roundData.submissionsAllowed).toBe(false);
  });

  it("skips forceSubmitAll when every player already submitted", async () => {
    setBeforeRoundResult(1, {});
    getPlayerCodeAll.mockResolvedValue([]);

    await startRound(makeIo(), {}, CODE);

    expect(forceSubmitAll).not.toHaveBeenCalled();
  });

  it("force submits any players who never sent their code", async () => {
    setBeforeRoundResult(1, {});
    const unsubmitted = [
      { player: { userId: "u2" }, codeInput: "x", language: "javascript" },
    ];
    getPlayerCodeAll.mockResolvedValue(unsubmitted);
    const io = makeIo();

    await startRound(io, {}, CODE);

    expect(forceSubmitAll).toHaveBeenCalledWith(io, CODE, unsubmitted);
  });

  it("waits for any pending manual submissions still processing", async () => {
    const pendingPromise = Promise.resolve();
    const roundData = setBeforeRoundResult(1, {
      pendingSubmissions: new Map([["u1", pendingPromise]]),
    });

    await startRound(makeIo(), {}, CODE);

    // If this hangs or throws, Promise.all over pendingSubmissions failed silently
    expect(roundData.pendingSubmissions.size).toBe(1);
  });

  it("calculates all scores before sending results", async () => {
    setBeforeRoundResult(1, {});

    await startRound(makeIo(), {}, CODE);

    expect(calculateAllScores).toHaveBeenCalled();
    expect(sleep).toHaveBeenCalledWith(WAIT_BEFORE_RESULTS);
    expect(processRoundElims).toHaveBeenCalled();
  });
});

// startRound bails out if the room disappears
describe("startRound bails out if the room disappears", () => {
  it("stops right after the countdown sleep", async () => {
    setBeforeRoundResult(1, {});
    sleep.mockImplementationOnce(async () => {
      delete rooms[CODE];
    });
    const io = makeIo();

    await startRound(io, {}, CODE);

    expect(startRoundTimer).not.toHaveBeenCalled();
  });

  it("stops right after gathering unsubmitted players' code", async () => {
    setBeforeRoundResult(1, {});
    getPlayerCodeAll.mockImplementationOnce(async () => {
      delete rooms[CODE];
      return [];
    });

    await startRound(makeIo(), {}, CODE);

    expect(calculateAllScores).not.toHaveBeenCalled();
    expect(processRoundElims).not.toHaveBeenCalled();
  });

  it("stops right after the final pre-results sleep, before processing eliminations", async () => {
    setBeforeRoundResult(1, {});
    sleep.mockResolvedValueOnce(undefined).mockImplementationOnce(async () => {
      delete rooms[CODE];
    });

    await startRound(makeIo(), {}, CODE);

    expect(processRoundElims).not.toHaveBeenCalled();
    expect(sendResults).not.toHaveBeenCalled();
    expect(gameOver).not.toHaveBeenCalled();
  });
});

// startRound endgame branching tests
describe("startRound endgame branching", () => {
  it("calls gameOver with no winner when zero players remain", async () => {
    setBeforeRoundResult(1, {});
    rooms[CODE].players = [];
    const io = makeIo();

    await startRound(io, {}, CODE);

    expect(gameOver).toHaveBeenCalledWith(io, CODE, expect.any(Object), null);
    expect(sendResults).not.toHaveBeenCalled();
  });

  it("declares the sole remaining player the winner", async () => {
    setBeforeRoundResult(1, {});
    const winner = { userId: "u1", username: "alice" };
    rooms[CODE].players = [winner];
    const io = makeIo();

    await startRound(io, {}, CODE);

    expect(gameOver).toHaveBeenCalledWith(io, CODE, expect.any(Object), winner);
    expect(sendResults).not.toHaveBeenCalled();
  });

  it("sends results and continues the game when more than one player remains", async () => {
    setBeforeRoundResult(1, {});
    rooms[CODE].players = [{ userId: "u1" }, { userId: "u2" }];
    const io = makeIo();

    await startRound(io, {}, CODE);

    expect(sendResults).toHaveBeenCalledWith(io, CODE, expect.any(Object));
    expect(gameOver).not.toHaveBeenCalled();
  });

  it("builds reconnect data with the results phase before both ending and continuing", async () => {
    setBeforeRoundResult(1, {});
    rooms[CODE].players = [{ userId: "u1" }];

    await startRound(makeIo(), {}, CODE);

    expect(buildReconnectData).toHaveBeenCalledWith(rooms[CODE], "results");
  });
});
