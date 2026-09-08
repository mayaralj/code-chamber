// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useRoundEvents from "./useRoundEvents";

// Mocks
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});

// Imports after mocks
import { socket } from "../../socket";

// Vars
beforeEach(() => {
  socket.__reset();
});

// useRoundEvents tests
describe("useRoundEvents", () => {
  it("initializes beforeRoundEvents with the value passed in", () => {
    const firstBeforeEvents = [{ type: "info", message: "Get ready" }];

    const { result } = renderHook(() => useRoundEvents(firstBeforeEvents));

    expect(result.current.beforeRoundEvents).toEqual(firstBeforeEvents);
  });

  it("defaults beforeRoundEvents to undefined when nothing is passed", () => {
    const { result } = renderHook(() => useRoundEvents());

    expect(result.current.beforeRoundEvents).toBeUndefined();
  });

  it("subscribes to new-round exactly once on mount", () => {
    renderHook(() => useRoundEvents([]));

    expect(socket.on).toHaveBeenCalledWith("new-round", expect.any(Function));
    expect(socket.__listenerCount("new-round")).toBe(1);
  });

  it("replaces beforeRoundEvents on a new-round event", () => {
    const { result } = renderHook(() =>
      useRoundEvents([{ type: "info", message: "Round 1" }]),
    );

    const nextBeforeEvents = [{ type: "info", message: "Round 2 starting" }];

    act(() => {
      socket.__trigger("new-round", { beforeRoundEvents: nextBeforeEvents });
    });

    expect(result.current.beforeRoundEvents).toEqual(nextBeforeEvents);
  });

  it("unsubscribes the exact same handler reference on unmount", () => {
    const { unmount } = renderHook(() => useRoundEvents([]));
    const registeredHandler = socket.on.mock.calls[0][1];

    unmount();

    expect(socket.off).toHaveBeenCalledWith("new-round", registeredHandler);
    expect(socket.__listenerCount("new-round")).toBe(0);
  });

  it("does not leave stray listeners behind across re-renders", () => {
    const { rerender } = renderHook(() => useRoundEvents([]));

    rerender();
    rerender();

    expect(socket.__listenerCount("new-round")).toBe(1);
  });

  it("exposes a manual setter for beforeRoundEvents", () => {
    const { result } = renderHook(() => useRoundEvents([]));

    act(() => {
      result.current.setBeforeRoundEvents([
        { type: "info", message: "Manual" },
      ]);
    });

    expect(result.current.beforeRoundEvents).toEqual([
      { type: "info", message: "Manual" },
    ]);
  });
});
