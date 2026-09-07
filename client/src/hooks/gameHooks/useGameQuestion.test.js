// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useGameQuestion from "./useGameQuestion";

// Mock the socket module to use a fake socket for testing
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});

// Imports after mocking
import { socket } from "../../socket";

// Reset the socket mock before each test to ensure a clean state
beforeEach(() => {
  socket.__reset();
});

// Test suite for the useGameQuestion hook
describe("useGameQuestion", () => {
  it("initializes with the provided question and its starter code", () => {
    const initQuestion = {
      id: 1,
      title: "Two Sum",
      starterCode: "function twoSum() {}",
    };

    const { result } = renderHook(() => useGameQuestion(initQuestion));

    expect(result.current.question).toEqual(initQuestion);
    expect(result.current.starterCode).toBe("function twoSum() {}");
  });

  it("defaults to a null question and empty starter code when nothing is passed", () => {
    const { result } = renderHook(() => useGameQuestion());

    expect(result.current.question).toBeNull();
    expect(result.current.starterCode).toBe("");
  });

  it("subscribes to new-round exactly once on mount", () => {
    renderHook(() => useGameQuestion());

    expect(socket.on).toHaveBeenCalledWith("new-round", expect.any(Function));
    expect(socket.__listenerCount("new-round")).toBe(1);
  });

  it("updates question and starter code when a new-round event arrives", () => {
    const { result } = renderHook(() => useGameQuestion());

    const nextQuestion = {
      id: 2,
      title: "Reverse String",
      starterCode: "function reverse() {}",
    };

    act(() => {
      socket.__trigger("new-round", { question: nextQuestion });
    });

    expect(result.current.question).toEqual(nextQuestion);
    expect(result.current.starterCode).toBe("function reverse() {}");
  });

  it("unsubscribes the exact same handler reference on unmount", () => {
    const { unmount } = renderHook(() => useGameQuestion());
    const registeredHandler = socket.on.mock.calls[0][1];

    unmount();

    expect(socket.off).toHaveBeenCalledWith("new-round", registeredHandler);
    expect(socket.__listenerCount("new-round")).toBe(0);
  });

  it("does not leave a stray listener behind if the hook re-renders", () => {
    const { rerender } = renderHook(() => useGameQuestion());

    rerender();
    rerender();

    expect(socket.__listenerCount("new-round")).toBe(1);
  });

  it("documents current behavior: starterCode becomes empty string if the new question has none", () => {
    const { result } = renderHook(() => useGameQuestion());

    act(() => {
      socket.__trigger("new-round", {
        question: { id: 3, title: "No starter code" },
      });
    });

    expect(result.current.starterCode).toEqual("");
  });

  it("exposes manual setters for question and starter code", () => {
    const { result } = renderHook(() => useGameQuestion());

    act(() => {
      result.current.setQuestion({ id: 9, title: "Manual" });
      result.current.setStarterCode("manual code");
    });

    expect(result.current.question).toEqual({ id: 9, title: "Manual" });
    expect(result.current.starterCode).toBe("manual code");
  });
});
