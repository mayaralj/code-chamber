// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useDisconnection from "./useDisconnection";

// Mocks
vi.mock("../../socket", async () => {
  const { createSocketMock } = await import("../../test/socketMock");
  return { socket: createSocketMock() };
});

// Imports after mocks
import { socket } from "../../socket";

// reset the socket mock each test
beforeEach(() => {
  socket.__reset();
});

// useDisconnection tests
describe("useDisconnection", () => {
  it("does not emit leave-game while mounted", () => {
    const roomDeletedRef = { current: false };
    renderHook(() => useDisconnection("ROOM1", roomDeletedRef));

    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("emits leave-game with the room code on unmount when the room was not deleted", () => {
    const roomDeletedRef = { current: false };
    const { unmount } = renderHook(() =>
      useDisconnection("ROOM1", roomDeletedRef),
    );

    unmount();

    expect(socket.emit).toHaveBeenCalledWith("leave-game", { code: "ROOM1" });
  });

  it("does not emit leave-game on unmount when the room was already deleted", () => {
    const roomDeletedRef = { current: true };
    const { unmount } = renderHook(() =>
      useDisconnection("ROOM1", roomDeletedRef),
    );

    unmount();

    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("reads roomDeletedRef.current live at cleanup time, not a stale value from mount", () => {
    const roomDeletedRef = { current: false };
    const { unmount } = renderHook(() =>
      useDisconnection("ROOM1", roomDeletedRef),
    );

    roomDeletedRef.current = true;
    unmount();

    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("uses the correct room code snapshot when code changes before unmount", () => {
    const roomDeletedRef = { current: false };
    const { rerender, unmount } = renderHook(
      ({ code }) => useDisconnection(code, roomDeletedRef),
      { initialProps: { code: "ROOM1" } },
    );

    rerender({ code: "ROOM2" });
    expect(socket.emit).toHaveBeenCalledWith("leave-game", { code: "ROOM1" });

    socket.emit.mockClear();

    unmount();
    expect(socket.emit).toHaveBeenCalledWith("leave-game", { code: "ROOM2" });
  });

  it("fires a separate leave-game emit for each distinct code across multiple changes", () => {
    const roomDeletedRef = { current: false };
    const { rerender } = renderHook(
      ({ code }) => useDisconnection(code, roomDeletedRef),
      { initialProps: { code: "ROOM1" } },
    );

    rerender({ code: "ROOM2" });
    rerender({ code: "ROOM3" });

    const emittedCodes = socket.emit.mock.calls
      .filter((call) => call[0] === "leave-game")
      .map((call) => call[1].code);

    expect(emittedCodes).toEqual(["ROOM1", "ROOM2"]);
  });

  it("does not emit at all if roomDeletedRef was already true when code changes mid-lifecycle", () => {
    const roomDeletedRef = { current: false };
    const { rerender } = renderHook(
      ({ code }) => useDisconnection(code, roomDeletedRef),
      { initialProps: { code: "ROOM1" } },
    );

    roomDeletedRef.current = true;
    rerender({ code: "ROOM2" });

    expect(socket.emit).not.toHaveBeenCalled();
  });
});
