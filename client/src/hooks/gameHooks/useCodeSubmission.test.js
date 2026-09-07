// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useCodeSubmission from "./useCodeSubmission";

// Mock the socket module to provide a controlled testing environment
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});

// Import after mocks
import { socket } from "../../socket";

// Helper function to get the latest handler for a specific socket event
const getHandler = (event) => {
  const calls = socket.on.mock.calls.filter((call) => call[0] === event);
  return calls[calls.length - 1]?.[1];
};

// Reset the socket mock and console.log before each test
beforeEach(() => {
  socket.__reset();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// useCodeSubmission tests
describe("useCodeSubmission", () => {
  it("initializes with not-submitted status, javascript language, and no test results", () => {
    const setPlayerList = vi.fn();
    const { result } = renderHook(() =>
      useCodeSubmission("ROOM1", setPlayerList),
    );

    expect(result.current.codeStatus).toBe("not-submitted");
    expect(result.current.language).toBe("javascript");
    expect(result.current.testCasesResults).toEqual([]);
  });

  it("subscribes to all expected events on mount", () => {
    renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    expect(socket.__listenerCount("new-round")).toBe(1);
    expect(socket.__listenerCount("code-submitted")).toBe(1);
    expect(socket.__listenerCount("code-judging")).toBe(1);
    expect(socket.__listenerCount("request-code")).toBe(1);
    expect(socket.__listenerCount("submit-code-error")).toBe(1);
    expect(socket.__listenerCount("player-submitted")).toBe(1);
  });

  it("emits submit-code with the current code input, language, and room code on submit", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleCodeChange("console.log('hi')");
      result.current.handleSubmit();
    });

    expect(socket.emit).toHaveBeenCalledWith("submit-code", {
      code: "ROOM1",
      codeInput: "console.log('hi')",
      language: "javascript",
      timeSubmitted: expect.any(Number),
    });
  });

  it("defaults codeInput to an empty string if handleCodeChange receives null/undefined", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleCodeChange(null);
      result.current.handleSubmit();
    });

    expect(socket.emit).toHaveBeenCalledWith(
      "submit-code",
      expect.objectContaining({ codeInput: "" }),
    );
  });

  it("sets codeStatus to processing immediately on submit", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.codeStatus).toBe("processing");
  });

  it("blocks a second submission fired synchronously right after the first (ref-based guard)", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleSubmit();
      result.current.handleSubmit();
      result.current.handleSubmit();
    });

    const submitCalls = socket.emit.mock.calls.filter(
      (call) => call[0] === "submit-code",
    );
    expect(submitCalls).toHaveLength(1);
  });

  it("blocks submission while codeStatus is judging or submitted", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      socket.__trigger("code-judging");
    });
    act(() => {
      result.current.handleSubmit();
    });
    expect(socket.emit).not.toHaveBeenCalledWith(
      "submit-code",
      expect.anything(),
    );

    act(() => {
      socket.__trigger("code-submitted", []);
    });
    act(() => {
      result.current.handleSubmit();
    });
    expect(socket.emit).not.toHaveBeenCalledWith(
      "submit-code",
      expect.anything(),
    );
  });

  it("blocks handleLanguageChange while processing, judging, or submitted", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleSubmit();
      result.current.handleLanguageChange("python");
    });

    expect(result.current.language).toBe("javascript");
  });

  it("allows handleLanguageChange when not-submitted", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleLanguageChange("python");
    });

    expect(result.current.language).toBe("python");
  });

  it("sets codeStatus to submitted and stores test case results on code-submitted", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));
    const fakeResults = [{ passed: true }, { passed: false }];

    act(() => {
      socket.__trigger("code-submitted", fakeResults);
    });

    expect(result.current.codeStatus).toBe("submitted");
    expect(result.current.testCasesResults).toEqual(fakeResults);
  });

  it("sets codeStatus to judging on code-judging", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      socket.__trigger("code-judging");
    });

    expect(result.current.codeStatus).toBe("judging");
  });

  it("resets codeStatus to not-submitted on submit-code-error", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleSubmit();
    });
    expect(result.current.codeStatus).toBe("processing");

    act(() => {
      socket.__trigger("submit-code-error", {
        message: "Server rejected code",
      });
    });

    expect(result.current.codeStatus).toBe("not-submitted");
  });

  it("allows submitting again after a submit-code-error resets the status", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleSubmit();
      socket.__trigger("submit-code-error", {
        message: "Server rejected code",
      });
    });

    act(() => {
      result.current.handleSubmit();
    });
    const submitCalls = socket.emit.mock.calls.filter(
      (call) => call[0] === "submit-code",
    );
    expect(submitCalls).toHaveLength(2);
    expect(result.current.codeStatus).toBe("processing");
  });

  it("responds to request-code with the current code input and language via callback", () => {
    renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    const requestCodeHandler = getHandler("request-code");
    const callback = vi.fn();

    requestCodeHandler({}, callback);

    expect(callback).toHaveBeenCalledWith({
      codeInput: "",
      language: "javascript",
    });
  });

  it("reflects the latest code and language when request-code is invoked", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleCodeChange("def solve(): pass");
      result.current.handleLanguageChange("python");
    });

    const requestCodeHandler = getHandler("request-code");
    const callback = vi.fn();

    requestCodeHandler({}, callback);

    expect(callback).toHaveBeenCalledWith({
      codeInput: "def solve(): pass",
      language: "python",
    });
  });

  it("resets status and code input on a new-round event", () => {
    const { result } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    act(() => {
      result.current.handleCodeChange("leftover code");
      result.current.handleSubmit();
    });
    expect(result.current.codeStatus).toBe("processing");

    act(() => {
      socket.__trigger("new-round", {});
    });

    expect(result.current.codeStatus).toBe("not-submitted");

    act(() => {
      result.current.handleSubmit();
    });
    expect(socket.emit).toHaveBeenLastCalledWith(
      "submit-code",
      expect.objectContaining({ codeInput: "" }),
    );
  });

  it("calls setPlayerList with the updated roster on player-submitted", () => {
    const setPlayerList = vi.fn();
    renderHook(() => useCodeSubmission("ROOM1", setPlayerList));

    const players = [{ username: "alice", submitted: true }];
    act(() => {
      socket.__trigger("player-submitted", { players });
    });

    expect(setPlayerList).toHaveBeenCalledWith(players);
  });

  it("re-subscribes player-submitted when code or setPlayerList changes", () => {
    const setPlayerListA = vi.fn();
    const { rerender } = renderHook(
      ({ code, setPlayerList }) => useCodeSubmission(code, setPlayerList),
      { initialProps: { code: "ROOM1", setPlayerList: setPlayerListA } },
    );

    const firstHandler = getHandler("player-submitted");

    const setPlayerListB = vi.fn();
    rerender({ code: "ROOM2", setPlayerList: setPlayerListB });

    const secondHandler = getHandler("player-submitted");

    expect(firstHandler).not.toBe(secondHandler);
    expect(socket.__listenerCount("player-submitted")).toBe(1);
  });

  it("unsubscribes every listener on unmount", () => {
    const { unmount } = renderHook(() => useCodeSubmission("ROOM1", vi.fn()));

    unmount();

    expect(socket.__listenerCount("new-round")).toBe(0);
    expect(socket.__listenerCount("code-submitted")).toBe(0);
    expect(socket.__listenerCount("code-judging")).toBe(0);
    expect(socket.__listenerCount("request-code")).toBe(0);
    expect(socket.__listenerCount("submit-code-error")).toBe(0);
    expect(socket.__listenerCount("player-submitted")).toBe(0);
  });

  it("does not leave stray listeners behind across re-renders with stable props", () => {
    const setPlayerList = vi.fn();
    const { rerender } = renderHook(() =>
      useCodeSubmission("ROOM1", setPlayerList),
    );

    rerender();
    rerender();

    expect(socket.__listenerCount("new-round")).toBe(1);
    expect(socket.__listenerCount("code-submitted")).toBe(1);
    expect(socket.__listenerCount("code-judging")).toBe(1);
    expect(socket.__listenerCount("request-code")).toBe(1);
    expect(socket.__listenerCount("submit-code-error")).toBe(1);
  });
});
