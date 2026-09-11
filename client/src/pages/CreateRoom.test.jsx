// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CreateRoom from "./CreateRoom";

// Mocks
const navigateMock = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));
vi.mock("../socket", async () => {
  const { createSocketMock } = await import("../test/socketMock");
  const socket = createSocketMock();
  return { socket };
});

// Imports after mocks
import { socket } from "../socket";

// Vars
let timeoutEmitMock;

// Helper to get the ack callback from the first call to socket.timeout().emit()
const getAckCallback = () => timeoutEmitMock.mock.calls[0][2];
const getAckPayload = () => timeoutEmitMock.mock.calls[0][1];

// Before each test, reset the socket mock, clear the navigate mock, and set up a new timeoutEmitMock for the socket.timeout().emit() calls. Also, spy on console.error to avoid cluttering test output.
beforeEach(() => {
  socket.__reset();
  navigateMock.mockClear();
  timeoutEmitMock = vi.fn();
  socket.timeout = vi.fn(() => ({ emit: timeoutEmitMock }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// After each test, restore all mocks to their original implementations to avoid side effects on other tests.
afterEach(() => {
  vi.restoreAllMocks();
});

// Helper functions to fill in the room name and click the create button for tests
const fillValidRoomName = () => {
  fireEvent.change(screen.getByPlaceholderText("ENTER IDENTIFIER..."), {
    target: { value: "My Room" },
  });
};
const clickCreate = () => {
  fireEvent.click(screen.getByRole("button", { name: /CREATE CHAMBER/ }));
};

// Test cases for the CreateRoom page
describe("CreateRoom - defaults", () => {
  it("renders with easy/4 players/public selected and an enabled create button", () => {
    render(<CreateRoom />);

    expect(screen.getByDisplayValue("EASY")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4 PLAYERS")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PUBLIC" })).toHaveClass(
      "border-[#d8b77f]",
    );
    expect(
      screen.getByRole("button", { name: "CREATE CHAMBER ›" }),
    ).toBeEnabled();
  });
});

describe("CreateRoom - room name validation", () => {
  it("shows an error and does not emit when the room name is empty", () => {
    render(<CreateRoom />);

    clickCreate();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Room name is required",
    );
    expect(socket.timeout).not.toHaveBeenCalled();
  });

  it("shows 'required' error for a whitespace-only room name", () => {
    render(<CreateRoom />);

    fireEvent.change(screen.getByPlaceholderText("ENTER IDENTIFIER..."), {
      target: { value: "    " },
    });
    clickCreate();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Room name is required",
    );
  });

  it("shows an error for a room name shorter than MIN_ROOM_NAME_LENGTH after trimming", () => {
    render(<CreateRoom />);

    fireEvent.change(screen.getByPlaceholderText("ENTER IDENTIFIER..."), {
      target: { value: "ab" },
    });
    clickCreate();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Room name is too short",
    );
    expect(socket.timeout).not.toHaveBeenCalled();
  });

  it("accepts a room name exactly at MIN_ROOM_NAME_LENGTH", () => {
    render(<CreateRoom />);

    fireEvent.change(screen.getByPlaceholderText("ENTER IDENTIFIER..."), {
      target: { value: "abc" },
    });
    clickCreate();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(socket.timeout).toHaveBeenCalled();
  });

  it("shows an error for a room name longer than MAX_ROOM_NAME_LENGTH", () => {
    render(<CreateRoom />);

    fireEvent.change(screen.getByPlaceholderText("ENTER IDENTIFIER..."), {
      target: { value: "a".repeat(21) },
    });
    clickCreate();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Room name is too long",
    );
    expect(socket.timeout).not.toHaveBeenCalled();
  });

  it("accepts a room name exactly at MAX_ROOM_NAME_LENGTH", () => {
    render(<CreateRoom />);

    fireEvent.change(screen.getByPlaceholderText("ENTER IDENTIFIER..."), {
      target: { value: "a".repeat(20) },
    });
    clickCreate();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(socket.timeout).toHaveBeenCalled();
  });

  it("trims surrounding whitespace before validating and submitting", () => {
    render(<CreateRoom />);

    fireEvent.change(screen.getByPlaceholderText("ENTER IDENTIFIER..."), {
      target: { value: "  My Room  " },
    });
    clickCreate();

    expect(getAckPayload().roomName).toBe("My Room");
  });
});

describe("CreateRoom - submission", () => {
  it("calls socket.timeout with the configured timeout and emits create-room with the form data", () => {
    render(<CreateRoom />);
    fillValidRoomName();

    fireEvent.change(screen.getByDisplayValue("EASY"), {
      target: { value: "hard" },
    });
    fireEvent.change(screen.getByDisplayValue("4 PLAYERS"), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByRole("button", { name: "PRIVATE" }));

    clickCreate();

    expect(socket.timeout).toHaveBeenCalledWith(3000);
    expect(timeoutEmitMock.mock.calls[0][0]).toBe("create-room");
    expect(getAckPayload()).toEqual(
      expect.objectContaining({
        roomName: "My Room",
        difficulty: "hard",
        maxPlayers: 6,
        isPublic: false,
        roomId: expect.any(String),
      }),
    );
  });

  it("shows the initializing state and disables the button while awaiting the ack", () => {
    render(<CreateRoom />);
    fillValidRoomName();

    clickCreate();

    const button = screen.getByRole("button", {
      name: "INITIALIZING CHAMBER...",
    });
    expect(button).toBeDisabled();
  });

  it("re-enables the button and shows a generic error when the ack times out", () => {
    render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();

    act(() => {
      getAckCallback()(new Error("timeout"), null);
    });

    expect(
      screen.getByRole("button", { name: "CREATE CHAMBER ›" }),
    ).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Server not responding. Please try again.",
    );
  });

  it("emits cancel-room-creation when the ack times out", () => {
    render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();
    const roomId = getAckPayload().roomId;

    act(() => {
      getAckCallback()(new Error("timeout"), null);
    });

    expect(socket.emit).toHaveBeenCalledWith("cancel-room-creation", {
      roomId,
    });
  });

  it("shows the server-provided error message when response.error is set", () => {
    render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();

    act(() => {
      getAckCallback()(null, { error: "Room name already taken" });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Room name already taken",
    );
  });

  it("navigates to the new room on success and clears any error", () => {
    render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();

    const roomInfo = { code: "ABC123", roomName: "My Room" };
    act(() => {
      getAckCallback()(null, { roomInfo });
    });

    expect(navigateMock).toHaveBeenCalledWith("/room-wait/ABC123", {
      state: { roomInfo },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("CreateRoom - visibility toggle", () => {
  it("switches the active styling between PUBLIC and PRIVATE", () => {
    render(<CreateRoom />);

    const publicBtn = screen.getByRole("button", { name: "PUBLIC" });
    const privateBtn = screen.getByRole("button", { name: "PRIVATE" });
    expect(publicBtn).toHaveClass("border-[#d8b77f]");

    fireEvent.click(privateBtn);

    expect(privateBtn).toHaveClass("border-[#d8b77f]");
    expect(publicBtn).not.toHaveClass("border-[#d8b77f]");
  });
});

describe("CreateRoom - cancellation on leave", () => {
  it("emits cancel-room-creation on pagehide while a creation is in flight", () => {
    render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();
    const roomId = getAckPayload().roomId;

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(socket.emit).toHaveBeenCalledWith("cancel-room-creation", {
      roomId,
    });
  });

  it("emits cancel-room-creation on unmount while a creation is in flight", () => {
    const { unmount } = render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();
    const roomId = getAckPayload().roomId;

    unmount();

    expect(socket.emit).toHaveBeenCalledWith("cancel-room-creation", {
      roomId,
    });
  });

  it("does not emit cancel-room-creation on unmount when no creation was ever started", () => {
    const { unmount } = render(<CreateRoom />);

    unmount();

    expect(socket.emit).not.toHaveBeenCalledWith(
      "cancel-room-creation",
      expect.anything(),
    );
  });

  it("does not emit cancel-room-creation on unmount after a creation already succeeded", () => {
    const { unmount } = render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();

    act(() => {
      getAckCallback()(null, { roomInfo: { code: "XYZ" } });
    });
    socket.emit.mockClear();

    unmount();

    expect(socket.emit).not.toHaveBeenCalledWith(
      "cancel-room-creation",
      expect.anything(),
    );
  });
});

describe("CreateRoom - isMountedRef guard on the ack callback", () => {
  it("still applies a normal ack while the component is mounted", () => {
    render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();

    act(() => {
      getAckCallback()(null, { error: "Room name already taken" });
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Room name already taken",
    );
  });

  it("ignores a late ack that fires after the component has already unmounted", () => {
    const { unmount } = render(<CreateRoom />);
    fillValidRoomName();
    clickCreate();
    const ackCallback = getAckCallback();
    const roomId = getAckPayload().roomId;

    unmount();
    expect(socket.emit).toHaveBeenCalledWith("cancel-room-creation", {
      roomId,
    });
    socket.emit.mockClear();

    expect(() => {
      act(() => {
        ackCallback(null, { roomInfo: { code: "LATE1" } });
      });
    }).not.toThrow();

    expect(navigateMock).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
