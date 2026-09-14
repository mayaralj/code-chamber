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
