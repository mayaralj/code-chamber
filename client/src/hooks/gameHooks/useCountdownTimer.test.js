// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useCountdownTimer from "./useCountdownTimer";

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

// Setup
const NOW = 1_700_000_000_000;
let cleanupFns;

// Reset the socket mock and playAnyTimer mock before each test
beforeEach(() => {
  socket.__reset();
  playAnyTimer.mockReset();
  cleanupFns = [];
  playAnyTimer.mockImplementation(() => {
    const cleanup = vi.fn();
    cleanupFns.push(cleanup);
    return cleanup;
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

// useCountdownTimer tests
describe("useCountdownTimer", () => {
  it("starts with timerFinished false when initEndsAt is in the future", () => {
    const { result } = renderHook(() => useCountdownTimer(NOW + 5000));

    expect(result.current.timerFinished).toBe(false);
  });

  it("starts with timerFinished true when initEndsAt is absent", () => {
    const { result } = renderHook(() => useCountdownTimer());

    expect(result.current.timerFinished).toBe(true);
  });

  it("starts with timerFinished true when initEndsAt is already in the past", () => {
    const { result } = renderHook(() => useCountdownTimer(NOW - 5000));

    expect(result.current.timerFinished).toBe(true);
  });

  it("calls playAnyTimer with the initial endsAt when it is in the future", () => {
    renderHook(() => useCountdownTimer(NOW + 5000));

    expect(playAnyTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        endsAt: NOW + 5000,
        functionSetter: expect.any(Function),
      }),
    );
  });

  it("does not call playAnyTimer when initEndsAt is absent or already past", () => {
    renderHook(() => useCountdownTimer());
    expect(playAnyTimer).not.toHaveBeenCalled();

    renderHook(() => useCountdownTimer(NOW - 5000));
    expect(playAnyTimer).not.toHaveBeenCalled();
  });

  it("sets timerFinished to true once the captured functionSetter reports 0", () => {
    const { result } = renderHook(() => useCountdownTimer(NOW + 5000));

    const functionSetter = playAnyTimer.mock.calls[0][0].functionSetter;

    act(() => {
      functionSetter(0);
    });

    expect(result.current.timeLeft).toBe(0);
    expect(result.current.timerFinished).toBe(true);
  });

  it("does not flip timerFinished for nonzero values reported by functionSetter", () => {
    const { result } = renderHook(() => useCountdownTimer(NOW + 5000));

    const functionSetter = playAnyTimer.mock.calls[0][0].functionSetter;

    act(() => {
      functionSetter(3);
    });

    expect(result.current.timeLeft).toBe(3);
    expect(result.current.timerFinished).toBe(false);
  });

  it("on new-round: resets timerFinished to false, sets timeLeft to 0.01, and starts a new timer", () => {
    const { result } = renderHook(() => useCountdownTimer(NOW - 5000));
    expect(result.current.timerFinished).toBe(true);

    act(() => {
      socket.__trigger("new-round", { newEndsAt: NOW + 4000 });
    });

    expect(result.current.timerFinished).toBe(false);
    expect(result.current.timeLeft).toBe(0.01);
    expect(playAnyTimer).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt: NOW + 4000 }),
    );
  });

  it("does not immediately re-trigger timerFinished after new-round sets timeLeft to 0.01", () => {
    const { result } = renderHook(() => useCountdownTimer(NOW - 5000));

    act(() => {
      socket.__trigger("new-round", { newEndsAt: NOW + 4000 });
    });

    expect(result.current.timerFinished).toBe(false);
  });

  it("calls the previous cleanup before starting a new timer when timerEndsAt changes", () => {
    renderHook(() => useCountdownTimer(NOW + 5000));
    const firstCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("new-round", { newEndsAt: NOW + 8000 });
    });

    expect(firstCleanup).toHaveBeenCalled();
    expect(cleanupFns).toHaveLength(2);
  });

  it("on timer-finished event: sets timerFinished true, timeLeft to 0, and clears the active timer", () => {
    const { result } = renderHook(() => useCountdownTimer(NOW + 5000));
    const activeCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("timer-finished");
    });

    expect(result.current.timerFinished).toBe(true);
    expect(result.current.timeLeft).toBe(0);
    expect(activeCleanup).toHaveBeenCalled();
  });

  it("subscribes to new-round and timer-finished exactly once each on mount", () => {
    renderHook(() => useCountdownTimer(NOW + 5000));

    expect(socket.__listenerCount("new-round")).toBe(1);
    expect(socket.__listenerCount("timer-finished")).toBe(1);
  });

  it("unsubscribes both listeners and clears any active timer on unmount", () => {
    const { unmount } = renderHook(() => useCountdownTimer(NOW + 5000));
    const activeCleanup = cleanupFns[0];

    unmount();

    expect(socket.__listenerCount("new-round")).toBe(0);
    expect(socket.__listenerCount("timer-finished")).toBe(0);
    expect(activeCleanup).toHaveBeenCalled();
  });

  it("does not double-invoke cleanup if timer-finished already fired before unmount", () => {
    const { unmount } = renderHook(() => useCountdownTimer(NOW + 5000));
    const activeCleanup = cleanupFns[0];

    act(() => {
      socket.__trigger("timer-finished");
    });
    expect(activeCleanup).toHaveBeenCalledTimes(1);

    unmount();

    expect(activeCleanup).toHaveBeenCalledTimes(1);
  });

  it("exposes manual setters for timerFinished and timerEndsAt", () => {
    const { result } = renderHook(() => useCountdownTimer());

    act(() => {
      result.current.setTimerFinished(false);
      result.current.setTimerEndsAt(NOW + 1000);
    });

    expect(result.current.timerFinished).toBe(false);
    expect(playAnyTimer).toHaveBeenCalledWith(
      expect.objectContaining({ endsAt: NOW + 1000 }),
    );
  });
});
