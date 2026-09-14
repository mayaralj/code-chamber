// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useReconnection from "./useReconnection";

// Mocks
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});
vi.mock("react-hot-toast", async () => {
  const { createToastMock } = await import("../../test/toastMock");
  return { default: createToastMock() };
});
vi.mock("react-router", () => ({
  useNavigate: vi.fn(),
}));

// Imports after mocks
import { socket } from "../../socket";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

// Vars
let navigateMock;
let setPlayerList;
let setters;

// Mock helpers
const makeSetters = () => ({
  setCurrentRound: vi.fn(),
  setBeforeRoundEvents: vi.fn(),
  setQuestion: vi.fn(),
  setStarterCode: vi.fn(),
  setCodeStatus: vi.fn(),
  setTimerEndsAt: vi.fn(),
  setTimerFinished: vi.fn(),
  setRoundEndsAt: vi.fn(),
  setTimeMultiplier: vi.fn(),
  setResults: vi.fn(),
  setResultsReady: vi.fn(),
  setEliminatedPlayers: vi.fn(),
  setMissedPlayer: vi.fn(),
  setWinner: vi.fn(),
});
const baseReconnectData = (overrides = {}) => ({
  players: [{ username: "alice" }],
  curRound: 2,
  beforeRoundEvents: [{ type: "info", message: "Get ready" }],
  question: { id: 1, title: "Two Sum", starterCode: "function twoSum() {}" },
  codeStatus: "not-submitted",
  ...overrides,
});

// Reset the socket mock, toast mock, and navigate mock before each test
beforeEach(() => {
  socket.__reset();
  vi.clearAllMocks();
  navigateMock = vi.fn();
  useNavigate.mockReturnValue(navigateMock);
  setPlayerList = vi.fn();
  setters = makeSetters();
});

// useReconnection tests
describe("useReconnection", () => {
  it("subscribes to all five expected events on mount", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    expect(socket.__listenerCount("reconnect-game-success")).toBe(1);
    expect(socket.__listenerCount("reconnect-failure")).toBe(1);
    expect(socket.__listenerCount("connect")).toBe(1);
    expect(socket.__listenerCount("waiting-for-reconnect")).toBe(1);
    expect(socket.__listenerCount("players-reconnected")).toBe(1);
  });

  it("emits reconnect-game with the room code on connect", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger("connect");
    });

    expect(socket.emit).toHaveBeenCalledWith("reconnect-game", {
      code: "ROOM1",
    });
  });

  it.each(["countdown", "game-started"])(
    "sets base state and timerEndsAt for phase '%s'",
    (phase) => {
      renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

      act(() => {
        socket.__trigger(
          "reconnect-game-success",
          baseReconnectData({ phase, endsAt: 12345 }),
        );
      });

      expect(setPlayerList).toHaveBeenCalledWith([{ username: "alice" }]);
      expect(setters.setCurrentRound).toHaveBeenCalledWith(2);
      expect(setters.setBeforeRoundEvents).toHaveBeenCalledWith([
        { type: "info", message: "Get ready" },
      ]);
      expect(setters.setQuestion).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
      );
      expect(setters.setStarterCode).toHaveBeenCalledWith(
        "function twoSum() {}",
      );
      expect(setters.setCodeStatus).toHaveBeenCalledWith("not-submitted");
      expect(setters.setTimerEndsAt).toHaveBeenCalledWith(12345);
    },
  );

  it("sets round-tick specific state for phase 'round-tick'", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger(
        "reconnect-game-success",
        baseReconnectData({
          phase: "round-tick",
          roundEndsAt: 9999,
          timeMultiplier: 1.5,
        }),
      );
    });

    expect(setters.setTimerFinished).toHaveBeenCalledWith(true);
    expect(setters.setTimerEndsAt).toHaveBeenCalledWith(null);
    expect(setters.setRoundEndsAt).toHaveBeenCalledWith(9999);
    expect(setters.setTimeMultiplier).toHaveBeenCalledWith(1.5);
  });

  it("sets results-specific state for phase 'results'", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger(
        "reconnect-game-success",
        baseReconnectData({
          phase: "results",
          results: [{ username: "alice", score: 5 }],
          eliminatedPlayers: ["bob"],
          missedPlayer: "carol",
          winner: null,
        }),
      );
    });

    expect(setters.setResults).toHaveBeenCalledWith([
      { username: "alice", score: 5 },
    ]);
    expect(setters.setResultsReady).toHaveBeenCalledWith(true);
    expect(setters.setEliminatedPlayers).toHaveBeenCalledWith(["bob"]);
    expect(setters.setMissedPlayer).toHaveBeenCalledWith("carol");
    expect(setters.setWinner).toHaveBeenCalledWith(null);
  });

  it("does not call any phase-specific setters for an unrecognized phase", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger(
        "reconnect-game-success",
        baseReconnectData({ phase: "some-unknown-phase" }),
      );
    });

    expect(setters.setTimerEndsAt).not.toHaveBeenCalled();
    expect(setters.setTimerFinished).not.toHaveBeenCalled();
    expect(setters.setResults).not.toHaveBeenCalled();
    // Base fields still get set regardless of phase.
    expect(setPlayerList).toHaveBeenCalled();
  });

  it("only handles reconnect-game-success once, even if triggered twice", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger(
        "reconnect-game-success",
        baseReconnectData({ phase: "countdown", endsAt: 1 }),
      );
      socket.__trigger(
        "reconnect-game-success",
        baseReconnectData({ phase: "countdown", endsAt: 2 }),
      );
    });

    expect(setPlayerList).toHaveBeenCalledTimes(1);
  });

  it("navigates to /browse on reconnect-failure", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger("reconnect-failure");
    });

    expect(navigateMock).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("shows a persistent error toast on waiting-for-reconnect", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger("waiting-for-reconnect");
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Waiting for players to reconnect...",
      expect.objectContaining({ duration: 1000000 }),
    );
  });

  it("updates the player list and dismisses the waiting toast on players-reconnected", () => {
    renderHook(() => useReconnection("ROOM1", setPlayerList, setters));

    act(() => {
      socket.__trigger("waiting-for-reconnect");
    });
    const toastId = toast.error.mock.results[0].value;

    act(() => {
      socket.__trigger("players-reconnected", {
        players: [{ username: "dave" }],
      });
    });

    expect(setPlayerList).toHaveBeenCalledWith([{ username: "dave" }]);
    expect(toast.dismiss).toHaveBeenCalledWith(toastId);
  });

  it("unsubscribes reconnect-game-success, reconnect-failure, connect, waiting-for-reconnect, and players-reconnected on unmount", () => {
    const { unmount } = renderHook(() =>
      useReconnection("ROOM1", setPlayerList, setters),
    );

    unmount();

    expect(socket.__listenerCount("reconnect-game-success")).toBe(0);
    expect(socket.__listenerCount("reconnect-failure")).toBe(0);
    expect(socket.__listenerCount("connect")).toBe(0);
    expect(socket.__listenerCount("waiting-for-reconnect")).toBe(0);
    expect(socket.__listenerCount("players-reconnected")).toBe(0);
  });

  it("does not remove an unrelated connect listener registered elsewhere on unmount", () => {
    // Simulates e.g. ServerHealthProvider also listening for "connect"
    // independently of this hook. Since this hook's connect handler is a
    // named function removed via socket.off("connect", handleConnect),
    // only its own listener should be removed on unmount.
    const unrelatedHandler = vi.fn();
    socket.on("connect", unrelatedHandler);

    const { unmount } = renderHook(() =>
      useReconnection("ROOM1", setPlayerList, setters),
    );
    expect(socket.__listenerCount("connect")).toBe(2);

    unmount();

    expect(socket.__listenerCount("connect")).toBe(1);
  });

  it("does not leave stray listeners behind across re-renders", () => {
    const { rerender } = renderHook(() =>
      useReconnection("ROOM1", setPlayerList, setters),
    );

    rerender();
    rerender();

    expect(socket.__listenerCount("reconnect-game-success")).toBe(1);
    expect(socket.__listenerCount("connect")).toBe(1);
    expect(socket.__listenerCount("waiting-for-reconnect")).toBe(1);
    expect(socket.__listenerCount("players-reconnected")).toBe(1);
  });
});
