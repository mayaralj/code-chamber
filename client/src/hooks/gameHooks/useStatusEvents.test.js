// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useStatusEvents from "./useStatusEvents";

// Mocks
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});

// Imports after mocks
import { socket } from "../../socket";

// beforeEach hook to reset the socket mock before each test
beforeEach(() => {
  socket.__reset();
});

// useStatusEvents tests
describe("useStatusEvents", () => {
  it("places first-round events between game start and round start", () => {
    const { result } = renderHook(() => useStatusEvents(null, {
      fasterTimer: 1.5, doubleElimination: true,
    }));
    expect(result.current.statusEvents).toEqual([
      { type: "game", message: "Game started" },
      { type: "round-event", message: "Faster Timer" },
      { type: "round-event", message: "Double Elimination" },
      { type: "round", message: "Round 1 started" },
    ]);
  });

  it("adds later-round events before round start without duplicating on rerender", () => {
    const { result, rerender } = renderHook(({ payload }) => useStatusEvents(payload), {
      initialProps: { payload: null },
    });
    const payload = { currentRound: 2, beforeRoundEvents: { doubleElimination: true } };
    rerender({ payload });
    rerender({ payload });
    expect(result.current.statusEvents.slice(2)).toEqual([
      { type: "round-event", message: "Double Elimination" },
      { type: "round", message: "Round 2 started" },
    ]);
  });
  it("initializes with the game-started and round-1-started events", () => {
    const { result } = renderHook(() => useStatusEvents());

    expect(result.current.statusEvents).toEqual([
      { type: "game", message: "Game started" },
      { type: "round", message: "Round 1 started" },
    ]);
  });

  it("subscribes to all five events exactly once each on mount", () => {
    renderHook(() => useStatusEvents());

    expect(socket.__listenerCount("send-results")).toBe(1);
    expect(socket.__listenerCount("game-over")).toBe(1);
    expect(socket.__listenerCount("player-submitted")).toBe(1);
    expect(socket.__listenerCount("player-left")).toBe(1);
  });

  it("uses the exact same handler reference for send-results and game-over", () => {
    renderHook(() => useStatusEvents());

    const sendResultsHandler = socket.on.mock.calls.find(
      (call) => call[0] === "send-results",
    )[1];
    const gameOverHandler = socket.on.mock.calls.find(
      (call) => call[0] === "game-over",
    )[1];

    expect(sendResultsHandler).toBe(gameOverHandler);
  });

  it("appends an eliminated event for each eliminated player on send-results", () => {
    const { result } = renderHook(() => useStatusEvents());

    act(() => {
      socket.__trigger("send-results", {
        eliminatedPlayers: ["alice", "bob"],
        missedPlayer: null,
      });
    });

    expect(result.current.statusEvents).toEqual([
      { type: "game", message: "Game started" },
      { type: "round", message: "Round 1 started" },
      { type: "eliminated", message: "alice was eliminated" },
      { type: "eliminated", message: "bob was eliminated" },
    ]);
  });

  it("appends a missed event when missedPlayer is present on send-results", () => {
    const { result } = renderHook(() => useStatusEvents());

    act(() => {
      socket.__trigger("send-results", {
        eliminatedPlayers: [],
        missedPlayer: "carol",
      });
    });

    expect(result.current.statusEvents).toEqual([
      { type: "game", message: "Game started" },
      { type: "round", message: "Round 1 started" },
      { type: "missed", message: "carol was spared this round" },
    ]);
  });

  it("appends nothing extra when eliminatedPlayers is empty and missedPlayer is falsy", () => {
    const { result } = renderHook(() => useStatusEvents());

    act(() => {
      socket.__trigger("send-results", {
        eliminatedPlayers: [],
        missedPlayer: null,
      });
    });

    expect(result.current.statusEvents).toHaveLength(2);
  });

  it("reuses the same eliminated/missed logic for a game-over event", () => {
    const { result } = renderHook(() => useStatusEvents());

    act(() => {
      socket.__trigger("game-over", {
        eliminatedPlayers: ["dave"],
        missedPlayer: null,
        winner: "erin",
      });
    });

    expect(result.current.statusEvents).toEqual([
      { type: "game", message: "Game started" },
      { type: "round", message: "Round 1 started" },
      { type: "eliminated", message: "dave was eliminated" },
    ]);
  });

  it("appends a submitted event with the player's username on player-submitted", () => {
    const { result } = renderHook(() => useStatusEvents());

    act(() => {
      socket.__trigger("player-submitted", {
        playerSubmitted: { username: "frank" },
      });
    });

    expect(result.current.statusEvents).toContainEqual({
      type: "submitted",
      message: "frank submitted",
    });
  });

  it("appends a disconnected event with the player's username on player-left", () => {
    const { result } = renderHook(() => useStatusEvents());

    act(() => {
      socket.__trigger("player-left", { playerLeft: { username: "grace" } });
    });

    expect(result.current.statusEvents).toContainEqual({
      type: "disconnected",
      message: "grace disconnected",
    });
  });

  it("unsubscribes all five listeners with matching handler references on unmount", () => {
    const { unmount } = renderHook(() => useStatusEvents());

    const handlers = Object.fromEntries(
      socket.on.mock.calls.map(([event, handler]) => [event, handler]),
    );

    unmount();

    expect(socket.off).toHaveBeenCalledWith(
      "send-results",
      handlers["send-results"],
    );
    expect(socket.off).toHaveBeenCalledWith("game-over", handlers["game-over"]);
    expect(socket.off).toHaveBeenCalledWith(
      "player-submitted",
      handlers["player-submitted"],
    );
    expect(socket.off).toHaveBeenCalledWith(
      "player-left",
      handlers["player-left"],
    );

    expect(socket.__listenerCount("send-results")).toBe(0);
    expect(socket.__listenerCount("game-over")).toBe(0);
    expect(socket.__listenerCount("player-submitted")).toBe(0);
    expect(socket.__listenerCount("player-left")).toBe(0);
  });

  it("does not leave stray listeners behind across re-renders", () => {
    const { rerender } = renderHook(() => useStatusEvents());

    rerender();
    rerender();

    expect(socket.__listenerCount("send-results")).toBe(1);
    expect(socket.__listenerCount("game-over")).toBe(1);
    expect(socket.__listenerCount("player-submitted")).toBe(1);
    expect(socket.__listenerCount("player-left")).toBe(1);
  });
});
