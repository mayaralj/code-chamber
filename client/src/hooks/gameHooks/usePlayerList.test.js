// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import usePlayerList from "./usePlayerList";

// Mocks
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});

// Imports after mocks
import { socket } from "../../socket";

// Reset the socket mock before each test
beforeEach(() => {
  socket.__reset();
});

// usePlayerList tests
describe("usePlayerList", () => {
  it("initializes with the players array passed in", () => {
    const initialPlayers = [{ username: "alice" }, { username: "bob" }];

    const { result } = renderHook(() => usePlayerList(initialPlayers));

    expect(result.current.playerList).toEqual(initialPlayers);
  });

  it("defaults to an empty array when no players are passed", () => {
    const { result } = renderHook(() => usePlayerList());

    expect(result.current.playerList).toEqual([]);
  });

  it("subscribes to send-results, new-round, and update-players exactly once each on mount", () => {
    renderHook(() => usePlayerList([]));

    expect(socket.__listenerCount("send-results")).toBe(1);
    expect(socket.__listenerCount("new-round")).toBe(1);
    expect(socket.__listenerCount("update-players")).toBe(1);
  });

  it("updates playerList on a send-results event", () => {
    const { result } = renderHook(() => usePlayerList([]));
    const nextPlayers = [{ username: "carol" }];

    act(() => {
      socket.__trigger("send-results", { players: nextPlayers });
    });

    expect(result.current.playerList).toEqual(nextPlayers);
  });

  it("updates playerList on a new-round event", () => {
    const { result } = renderHook(() => usePlayerList([]));
    const nextPlayers = [{ username: "dave" }];

    act(() => {
      socket.__trigger("new-round", { players: nextPlayers });
    });

    expect(result.current.playerList).toEqual(nextPlayers);
  });

  it("updates playerList on an update-players event", () => {
    const { result } = renderHook(() => usePlayerList([]));
    const nextPlayers = [{ username: "erin" }];

    act(() => {
      socket.__trigger("update-players", { players: nextPlayers });
    });

    expect(result.current.playerList).toEqual(nextPlayers);
  });

  it("unsubscribes send-results and new-round with the exact handler reference on unmount", () => {
    const { unmount } = renderHook(() => usePlayerList([]));

    const sendResultsHandler = socket.on.mock.calls.find(
      (call) => call[0] === "send-results",
    )[1];
    const newRoundHandler = socket.on.mock.calls.find(
      (call) => call[0] === "new-round",
    )[1];

    unmount();

    expect(socket.off).toHaveBeenCalledWith("send-results", sendResultsHandler);
    expect(socket.off).toHaveBeenCalledWith("new-round", newRoundHandler);
    expect(socket.__listenerCount("send-results")).toBe(0);
    expect(socket.__listenerCount("new-round")).toBe(0);
  });

  it("does not leave stray listeners behind across re-renders", () => {
    const { rerender } = renderHook(() => usePlayerList([]));

    rerender();
    rerender();

    expect(socket.__listenerCount("send-results")).toBe(1);
    expect(socket.__listenerCount("new-round")).toBe(1);
    expect(socket.__listenerCount("update-players")).toBe(1);
  });

  it("exposes a manual setter for playerList", () => {
    const { result } = renderHook(() => usePlayerList([]));

    act(() => {
      result.current.setPlayerList([{ username: "frank" }]);
    });

    expect(result.current.playerList).toEqual([{ username: "frank" }]);
  });
});
