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
