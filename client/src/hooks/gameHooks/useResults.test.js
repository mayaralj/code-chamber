// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useResults from "./useResults";

// Mocks
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});
vi.mock("../../utils/timers.js", () => ({
  playAnyTimer: vi.fn(),
}));

// Imports after mocks
import { socket } from "../../socket";
import { playAnyTimer } from "../../utils/timers.js";

// Vars
const NOW = 1_700_000_000_000;
let cleanupFns;

// Reset the socket mock, playAnyTimer mock, and cleanupFns before each test
beforeEach(() => {
  socket.__reset();
  playAnyTimer.mockReset();
  cleanupFns = [];
  playAnyTimer.mockImplementation(() => {
    const cleanup = vi.fn();
    cleanupFns.push(cleanup);
    return cleanup;
  });
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

// useResults tests
describe("useResults", () => {
  it("initializes with the expected default state", () => {
    const { result } = renderHook(() => useResults());

    expect(result.current.results).toEqual([]);
    expect(result.current.resultsReady).toBe(false);
    expect(result.current.eliminatedPlayers).toEqual([]);
    expect(result.current.missedPlayer).toBeNull();
    expect(result.current.isMissed).toBe(false);
    expect(result.current.winner).toBeNull();
  });

  it("subscribes to all five events exactly once each on mount", () => {
    renderHook(() => useResults());

    expect(socket.__listenerCount("new-round")).toBe(1);
    expect(socket.__listenerCount("player-missed")).toBe(1);
    expect(socket.__listenerCount("send-results")).toBe(1);
    expect(socket.__listenerCount("results-timer-finished")).toBe(1);
    expect(socket.__listenerCount("game-over")).toBe(1);
  });

  it("sets isMissed to true on a player-missed event", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("player-missed");
    });

    expect(result.current.isMissed).toBe(true);
  });

  it("populates results, missedPlayer, and eliminatedPlayers on send-results, and starts a timer", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("send-results", {
        results: [{ username: "alice", score: 10 }],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: ["bob"],
        missedPlayer: "carol",
      });
    });

    expect(result.current.results).toEqual([{ username: "alice", score: 10 }]);
    expect(result.current.resultsReady).toBe(true);
    expect(result.current.eliminatedPlayers).toEqual(["bob"]);
    expect(result.current.missedPlayer).toBe("carol");
    expect(playAnyTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        endsAt: NOW + 5000,
        functionSetter: expect.any(Function),
      }),
    );
  });

  it("clears missedPlayer on send-results when the payload has none", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("send-results", {
        results: [],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: [],
        missedPlayer: "carol",
      });
    });
    expect(result.current.missedPlayer).toBe("carol");

    act(() => {
      socket.__trigger("send-results", {
        results: [],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: [],
        missedPlayer: null,
      });
    });
    expect(result.current.missedPlayer).toBeNull();
  });

  it("resets resultsReady and clears the active timer on results-timer-finished", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("send-results", {
        results: [],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: [],
        missedPlayer: null,
      });
    });
    const activeCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("results-timer-finished");
    });

    expect(result.current.resultsReady).toBe(false);
    expect(activeCleanup).toHaveBeenCalled();
  });

  it("does not error if results-timer-finished fires with no active timer", () => {
    const { result } = renderHook(() => useResults());

    expect(() => {
      act(() => {
        socket.__trigger("results-timer-finished");
      });
    }).not.toThrow();

    expect(result.current.resultsReady).toBe(false);
  });

  it("populates results, eliminatedPlayers, and winner on game-over, and starts a timer", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("game-over", {
        results: [{ username: "dave", score: 50 }],
        gameOverEndsAt: NOW + 8000,
        eliminatedPlayers: ["erin"],
        winner: "dave",
      });
    });

    expect(result.current.results).toEqual([{ username: "dave", score: 50 }]);
    expect(result.current.resultsReady).toBe(true);
    expect(result.current.eliminatedPlayers).toEqual(["erin"]);
    expect(result.current.winner).toBe("dave");
    expect(playAnyTimer).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt: NOW + 8000 }),
    );
  });

  it("game-over resets missedPlayer, so a stale value can carry over", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("send-results", {
        results: [],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: [],
        missedPlayer: "carol",
      });
    });
    expect(result.current.missedPlayer).toBe("carol");

    act(() => {
      socket.__trigger("game-over", {
        results: [],
        gameOverEndsAt: NOW + 8000,
        eliminatedPlayers: [],
        winner: "dave",
      });
    });
    expect(result.current.missedPlayer).toBeNull();
  });

  it("cleans up the previous timer before starting a new one across send-results/game-over", () => {
    renderHook(() => useResults());

    act(() => {
      socket.__trigger("send-results", {
        results: [],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: [],
        missedPlayer: null,
      });
    });
    const firstCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("game-over", {
        results: [],
        gameOverEndsAt: NOW + 8000,
        eliminatedPlayers: [],
        winner: "dave",
      });
    });

    expect(firstCleanup).toHaveBeenCalled();
    expect(cleanupFns).toHaveLength(2);
  });

  it("resets all round-scoped state and clears the active timer on new-round", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("player-missed");
      socket.__trigger("send-results", {
        results: [{ username: "alice" }],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: ["bob"],
        missedPlayer: "carol",
      });
    });
    const activeCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("new-round");
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.resultsReady).toBe(false);
    expect(result.current.missedPlayer).toBeNull();
    expect(result.current.eliminatedPlayers).toEqual([]);
    expect(result.current.winner).toBeNull();
    expect(result.current.isMissed).toBe(false);
    expect(activeCleanup).toHaveBeenCalled();
  });

  it("does not error if new-round fires with no active timer", () => {
    const { result } = renderHook(() => useResults());

    expect(() => {
      act(() => {
        socket.__trigger("new-round");
      });
    }).not.toThrow();

    expect(result.current.results).toEqual([]);
  });

  it("unsubscribes all five listeners and clears any active timer on unmount", () => {
    const { unmount } = renderHook(() => useResults());

    act(() => {
      socket.__trigger("send-results", {
        results: [],
        resultsEndsAt: NOW + 5000,
        eliminatedPlayers: [],
        missedPlayer: null,
      });
    });
    const activeCleanup = cleanupFns[0];

    unmount();

    expect(socket.__listenerCount("new-round")).toBe(0);
    expect(socket.__listenerCount("player-missed")).toBe(0);
    expect(socket.__listenerCount("send-results")).toBe(0);
    expect(socket.__listenerCount("results-timer-finished")).toBe(0);
    expect(socket.__listenerCount("game-over")).toBe(0);
    expect(activeCleanup).toHaveBeenCalled();
  });

  it("does not leave stray listeners behind across re-renders", () => {
    const { rerender } = renderHook(() => useResults());

    rerender();
    rerender();

    expect(socket.__listenerCount("new-round")).toBe(1);
    expect(socket.__listenerCount("player-missed")).toBe(1);
    expect(socket.__listenerCount("send-results")).toBe(1);
    expect(socket.__listenerCount("results-timer-finished")).toBe(1);
    expect(socket.__listenerCount("game-over")).toBe(1);
  });

  it("exposes manual setters for all state values", () => {
    const { result } = renderHook(() => useResults());

    act(() => {
      result.current.setResults([{ username: "manual" }]);
      result.current.setResultsReady(true);
      result.current.setEliminatedPlayers(["manual-player"]);
      result.current.setMissedPlayer("manual-missed");
      result.current.setIsMissed(true);
      result.current.setWinner("manual-winner");
    });

    expect(result.current.results).toEqual([{ username: "manual" }]);
    expect(result.current.resultsReady).toBe(true);
    expect(result.current.eliminatedPlayers).toEqual(["manual-player"]);
    expect(result.current.missedPlayer).toBe("manual-missed");
    expect(result.current.isMissed).toBe(true);
    expect(result.current.winner).toBe("manual-winner");
  });
});
