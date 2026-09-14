import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useRoundTimer from "./useRoundTimer";

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

// useRoundTimer tests
describe("useRoundTimer", () => {
  it("initializes roundTimeLeft to 0 and currentRound to 1", () => {
    const { result } = renderHook(() => useRoundTimer());

    expect(result.current.roundTimeLeft).toBe(0);
    expect(result.current.currentRound).toBe(1);
  });

  it("does not start a timer if initRoundEndsAt or initTimeMultiplier is missing", () => {
    renderHook(() => useRoundTimer(NOW + 5000, undefined));
    expect(playAnyTimer).not.toHaveBeenCalled();

    renderHook(() => useRoundTimer(undefined, 1));
    expect(playAnyTimer).not.toHaveBeenCalled();
  });

  it("starts a timer with the given endsAt and multiplier when both are provided", () => {
    renderHook(() => useRoundTimer(NOW + 5000, 1));

    expect(playAnyTimer).toHaveBeenCalledWith({
      endsAt: NOW + 5000,
      functionSetter: expect.any(Function),
      timeMultiplier: 1,
    });
  });

  it("restarts the timer with new endsAt/multiplier on a round-tick event", () => {
    renderHook(() => useRoundTimer());

    act(() => {
      socket.__trigger("round-tick", {
        roundEndsAt: NOW + 6000,
        timeMultiplier: 1.5,
      });
    });

    expect(playAnyTimer).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt: NOW + 6000, timeMultiplier: 1.5 }),
    );
  });

  it("cleans up the previous timer before starting a new one on round-tick", () => {
    renderHook(() => useRoundTimer(NOW + 3000, 1));
    const firstCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("round-tick", {
        roundEndsAt: NOW + 6000,
        timeMultiplier: 2,
      });
    });

    expect(firstCleanup).toHaveBeenCalled();
    expect(cleanupFns).toHaveLength(2);
  });

  it("on round-timer-finished: sets roundTimeLeft to 0 and clears the active timer", () => {
    const { result } = renderHook(() => useRoundTimer(NOW + 5000, 1));
    const activeCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("round-timer-finished");
    });

    expect(result.current.roundTimeLeft).toBe(0);
    expect(activeCleanup).toHaveBeenCalled();
  });

  it("does not error if round-timer-finished fires with no timer currently active", () => {
    const { result } = renderHook(() => useRoundTimer());

    expect(() => {
      act(() => {
        socket.__trigger("round-timer-finished");
      });
    }).not.toThrow();

    expect(result.current.roundTimeLeft).toBe(0);
  });

  it("allows a fresh timer to start normally after round-timer-finished cleared the ref", () => {
    renderHook(() => useRoundTimer(NOW + 5000, 1));

    act(() => {
      socket.__trigger("round-timer-finished");
    });

    act(() => {
      socket.__trigger("round-tick", {
        roundEndsAt: NOW + 9000,
        timeMultiplier: 1,
      });
    });

    expect(playAnyTimer).toHaveBeenCalledTimes(2);
    expect(cleanupFns).toHaveLength(2);
  });

  it("subscribes to round-tick, and round-timer-finished exactly once each on mount", () => {
    renderHook(() => useRoundTimer(NOW + 5000, 1));

    expect(socket.__listenerCount("round-tick")).toBe(1);
    expect(socket.__listenerCount("round-timer-finished")).toBe(1);
  });

  it("unsubscribes all three listeners on unmount", () => {
    const { unmount } = renderHook(() => useRoundTimer(NOW + 5000, 1));

    unmount();

    expect(socket.__listenerCount("round-tick")).toBe(0);
    expect(socket.__listenerCount("round-timer-finished")).toBe(0);
  });

  it("stops the active round timer on unmount", () => {
    const { unmount } = renderHook(() => useRoundTimer(NOW + 5000, 1));
    const activeCleanup = cleanupFns[0];

    unmount();
    expect(activeCleanup).toHaveBeenCalled();
  });

  it("does not leave stray listeners behind across re-renders", () => {
    const { rerender } = renderHook(() => useRoundTimer(NOW + 5000, 1));

    rerender();
    rerender();

    expect(socket.__listenerCount("round-tick")).toBe(1);
    expect(socket.__listenerCount("round-timer-finished")).toBe(1);
  });

  it("exposes manual setters for currentRound, roundEndsAt, and timeMultiplier", () => {
    const { result } = renderHook(() => useRoundTimer());

    act(() => {
      result.current.setCurrentRound(4);
    });
    expect(result.current.currentRound).toBe(4);

    act(() => {
      result.current.setRoundEndsAt(NOW + 2000);
      result.current.setTimeMultiplier(1);
    });

    expect(playAnyTimer).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt: NOW + 2000, timeMultiplier: 1 }),
    );
  });
});
