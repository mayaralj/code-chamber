// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { playAnyTimer } from "./timers";

// Setup
const START_TIME = 1_700_000_000_000;

// Reset the system time and mock console.log before each test, and restore real timers after each test
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START_TIME);
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// Restore real timers after each test
afterEach(() => {
  vi.useRealTimers();
});

// Tests for playAnyTimer
describe("playAnyTimer", () => {
  it("calls functionSetter immediately on invocation with the initial time left", () => {
    const functionSetter = vi.fn();

    playAnyTimer({ endsAt: START_TIME + 5000, functionSetter });

    expect(functionSetter).toHaveBeenCalledTimes(1);
    expect(functionSetter).toHaveBeenCalledWith(5);
  });

  it("ticks down by whole seconds as real time passes", () => {
    const functionSetter = vi.fn();
    playAnyTimer({ endsAt: START_TIME + 3000, functionSetter });

    functionSetter.mockClear();

    vi.advanceTimersByTime(1000);
    expect(functionSetter).toHaveBeenCalledWith(2);

    vi.advanceTimersByTime(1000);
    expect(functionSetter).toHaveBeenCalledWith(1);

    vi.advanceTimersByTime(1000);
    expect(functionSetter).toHaveBeenCalledWith(0);
  });

  it("only calls functionSetter when the integer second value actually changes", () => {
    const functionSetter = vi.fn();
    playAnyTimer({ endsAt: START_TIME + 3000, functionSetter });

    functionSetter.mockClear();

    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);
    expect(functionSetter).not.toHaveBeenCalled();

    vi.advanceTimersByTime(700);
    expect(functionSetter).toHaveBeenCalledTimes(1);
    expect(functionSetter).toHaveBeenCalledWith(2);
  });

  it("stops ticking once time left reaches zero", () => {
    const functionSetter = vi.fn();
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    playAnyTimer({ endsAt: START_TIME + 2000, functionSetter });
    functionSetter.mockClear();

    vi.advanceTimersByTime(2000);
    expect(functionSetter).toHaveBeenLastCalledWith(0);

    const callsAtZero = functionSetter.mock.calls.length;

    vi.advanceTimersByTime(5000);
    expect(functionSetter).toHaveBeenCalledTimes(callsAtZero);
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("immediately reports zero and stops if endsAt is already in the past", () => {
    const functionSetter = vi.fn();
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    playAnyTimer({ endsAt: START_TIME - 5000, functionSetter });

    expect(functionSetter).toHaveBeenCalledTimes(1);
    expect(functionSetter).toHaveBeenCalledWith(0);
    expect(clearIntervalSpy).toHaveBeenCalled();

    functionSetter.mockClear();
    vi.advanceTimersByTime(5000);
    expect(functionSetter).not.toHaveBeenCalled();
  });

  it("counts down twice as fast with a timeMultiplier of 2", () => {
    const functionSetter = vi.fn();
    playAnyTimer({
      endsAt: START_TIME + 4000,
      functionSetter,
      timeMultiplier: 2,
    });

    functionSetter.mockClear();

    vi.advanceTimersByTime(1000);
    expect(functionSetter).toHaveBeenCalledWith(2);

    vi.advanceTimersByTime(1000);
    expect(functionSetter).toHaveBeenCalledWith(0);
  });

  it("defaults to a 1x multiplier when none is provided", () => {
    const functionSetter = vi.fn();
    playAnyTimer({ endsAt: START_TIME + 2000, functionSetter });

    functionSetter.mockClear();

    vi.advanceTimersByTime(1000);
    expect(functionSetter).toHaveBeenCalledWith(1);
  });

  it("stops calling functionSetter once the returned cleanup function is invoked", () => {
    const functionSetter = vi.fn();
    const cleanup = playAnyTimer({ endsAt: START_TIME + 5000, functionSetter });

    functionSetter.mockClear();
    vi.advanceTimersByTime(1000);
    expect(functionSetter).toHaveBeenCalledTimes(1);

    cleanup();
    functionSetter.mockClear();

    vi.advanceTimersByTime(3000);
    expect(functionSetter).not.toHaveBeenCalled();
  });

  it("clears the correct interval when cleanup runs before the timer naturally finishes", () => {
    const functionSetter = vi.fn();
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const cleanup = playAnyTimer({
      endsAt: START_TIME + 10000,
      functionSetter,
    });
    cleanup();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});
