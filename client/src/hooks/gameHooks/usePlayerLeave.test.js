// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import usePlayerLeave from "./usePlayerLeave";

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
let roomDeletedRef;

// Reset the socket mock, toast mock, and navigate mock before each test
beforeEach(() => {
  socket.__reset();
  vi.clearAllMocks();
  navigateMock = vi.fn();
  useNavigate.mockReturnValue(navigateMock);
  setPlayerList = vi.fn();
  roomDeletedRef = { current: false };
});

// usePlayerLeave tests
describe("usePlayerLeave", () => {
  it("initializes with isEliminated false", () => {
    const { result } = renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    expect(result.current.isEliminated).toBe(false);
  });

  it("subscribes to player-left, player-eliminated, room-deleted, and game-error on mount", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    expect(socket.__listenerCount("player-left")).toBe(1);
    expect(socket.__listenerCount("player-eliminated")).toBe(1);
    expect(socket.__listenerCount("room-deleted")).toBe(1);
    expect(socket.__listenerCount("game-error")).toBe(1);
  });

  it("shows a toast and updates the player list on player-left", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("player-left", {
        playerLeft: { username: "alice" },
        players: [{ username: "bob" }],
      });
    });

    expect(toast).toHaveBeenCalledWith(
      "alice has left the game",
      expect.objectContaining({ style: { marginTop: "-40px" } }),
    );
    expect(setPlayerList).toHaveBeenCalledWith([{ username: "bob" }]);
  });

  it("uses an empty style object when timerFinished is true", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, true),
    );

    act(() => {
      socket.__trigger("player-left", {
        playerLeft: { username: "alice" },
        players: [],
      });
    });

    expect(toast).toHaveBeenCalledWith("alice has left the game", {
      style: {},
    });
  });

  it("picks up the latest timerFinished value after re-rendering with a new value", () => {
    const { rerender } = renderHook(
      ({ timerFinished }) =>
        usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, timerFinished),
      { initialProps: { timerFinished: false } },
    );

    rerender({ timerFinished: true });

    act(() => {
      socket.__trigger("player-left", {
        playerLeft: { username: "carol" },
        players: [],
      });
    });

    expect(toast).toHaveBeenCalledWith("carol has left the game", {
      style: {},
    });
  });

  it("dismisses the previous toast before showing a new one on a second player-left", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("player-left", {
        playerLeft: { username: "alice" },
        players: [],
      });
    });
    const firstToastId = toast.mock.results[0].value;

    act(() => {
      socket.__trigger("player-left", {
        playerLeft: { username: "bob" },
        players: [],
      });
    });

    expect(toast.dismiss).toHaveBeenCalledWith(firstToastId);
  });

  it("emits leave-game with the room code on a pagehide event", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(socket.emit).toHaveBeenCalledWith("leave-game", { code: "ROOM1" });
  });

  it("uses the updated room code for pagehide after code changes", () => {
    const { rerender } = renderHook(
      ({ code }) => usePlayerLeave(code, setPlayerList, roomDeletedRef, false),
      { initialProps: { code: "ROOM1" } },
    );

    rerender({ code: "ROOM2" });

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(socket.emit).toHaveBeenCalledWith("leave-game", { code: "ROOM2" });
    expect(socket.emit).not.toHaveBeenCalledWith("leave-game", {
      code: "ROOM1",
    });
  });

  it("removes the pagehide listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("pagehide", expect.any(Function));
  });

  it("sets isEliminated to true on player-eliminated", () => {
    const { result } = renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("player-eliminated");
    });

    expect(result.current.isEliminated).toBe(true);
  });

  it("only reacts to player-eliminated once even if triggered twice", () => {
    const { result } = renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("player-eliminated");
      socket.__trigger("player-eliminated");
    });

    expect(result.current.isEliminated).toBe(true);
  });

  it("on room-deleted with 'Game over': marks the room deleted, shows a trophy toast, and navigates", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("room-deleted", { message: "Game over" });
    });

    expect(roomDeletedRef.current).toBe(true);
    expect(toast).toHaveBeenCalledWith("Game Over", { icon: "🏆" });
    expect(navigateMock).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("on room-deleted with any other message: marks the room deleted, shows an error toast, and navigates", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("room-deleted", { message: "Host left the room" });
    });

    expect(roomDeletedRef.current).toBe(true);
    expect(toast.error).toHaveBeenCalledWith("Host left the room");
    expect(navigateMock).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("dismisses any active toast before showing the room-deleted toast", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("player-left", {
        playerLeft: { username: "alice" },
        players: [],
      });
    });
    const activeToastId = toast.mock.results[0].value;

    act(() => {
      socket.__trigger("room-deleted", { message: "Host left the room" });
    });

    expect(toast.dismiss).toHaveBeenCalledWith(activeToastId);
  });

  it("on game-error: dismisses any active toast, shows an error toast, and navigates", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("player-left", {
        playerLeft: { username: "alice" },
        players: [],
      });
    });
    const activeToastId = toast.mock.results[0].value;

    act(() => {
      socket.__trigger("game-error", { message: "Server crashed" });
    });

    expect(toast.dismiss).toHaveBeenCalledWith(activeToastId);
    expect(toast.error).toHaveBeenCalledWith("Server crashed");
    expect(navigateMock).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("only reacts to room-deleted once even if triggered twice", () => {
    renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    act(() => {
      socket.__trigger("room-deleted", { message: "Game over" });
      socket.__trigger("room-deleted", { message: "Game over" });
    });

    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes player-left, player-eliminated, room-deleted, and game-error on unmount", () => {
    const { unmount } = renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    unmount();

    expect(socket.__listenerCount("player-left")).toBe(0);
    expect(socket.__listenerCount("player-eliminated")).toBe(0);
    expect(socket.__listenerCount("room-deleted")).toBe(0);
    expect(socket.__listenerCount("game-error")).toBe(0);
  });

  it("does not leave stray listeners behind across re-renders with stable props", () => {
    const { rerender } = renderHook(() =>
      usePlayerLeave("ROOM1", setPlayerList, roomDeletedRef, false),
    );

    rerender();
    rerender();

    expect(socket.__listenerCount("player-left")).toBe(1);
    expect(socket.__listenerCount("player-eliminated")).toBe(1);
    expect(socket.__listenerCount("room-deleted")).toBe(1);
    expect(socket.__listenerCount("game-error")).toBe(1);
  });
});
