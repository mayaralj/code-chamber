// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import RoomWait from "./RoomWait";

// Mocks
const mockNavigate = vi.fn();
let mockParams = { code: "ABCD" };
let mockLocation = { state: null };
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => mockParams,
}));
const toastMocks = { error: vi.fn(), success: vi.fn() };
vi.mock("react-hot-toast", () => ({
  default: {
    error: (...args) => toastMocks.error(...args),
    success: (...args) => toastMocks.success(...args),
  },
}));

// Helper to make a fake socket with event listener tracking and triggering
const makeFakeSocket = () => {
  const listeners = {};
  const onceListeners = {};

  const socket = {
    on: vi.fn((event, handler) => {
      (listeners[event] ??= []).push(handler);
    }),
    once: vi.fn((event, handler) => {
      (onceListeners[event] ??= []).push(handler);
    }),
    off: vi.fn((event, handler) => {
      if (!event) return;
      if (handler) {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((h) => h !== handler);
        }
        if (onceListeners[event]) {
          onceListeners[event] = onceListeners[event].filter(
            (h) => h !== handler,
          );
        }
      } else {
        delete listeners[event];
        delete onceListeners[event];
      }
    }),
    emit: vi.fn(),
    volatile: { emit: vi.fn() },
    __trigger: (event, payload) => {
      (listeners[event] || []).forEach((h) => h(payload));
      (onceListeners[event] || []).forEach((h) => h(payload));
      onceListeners[event] = [];
    },
  };

  return socket;
};

// Stub the socket module to return a fake socket that we can control in tests
let fakeSocket;
vi.mock("../socket", () => ({
  get socket() {
    return fakeSocket;
  },
}));

// Mock the usePlayer hook to control the player context in tests
let mockPlayerContext;
vi.mock("../hooks/usePlayer.js", () => ({
  default: () => mockPlayerContext,
}));

// Helper to render the RoomWait component with default or overridden roomInfo
const roomInfo = {
  host: { username: "hostuser", displayName: "Host User" },
  roomName: "Test Room",
  code: "ABCD",
  difficulty: "easy",
  maxPlayers: 4,
  players: [
    { username: "hostuser", displayName: "Host User", isReconnecting: false },
    { username: "player2", displayName: "Player Two", isReconnecting: false },
  ],
};

// Helper to render the RoomWait component with default or overridden roomInfo
const renderRoomWait = (overrides = {}) => {
  mockLocation = { state: { roomInfo: { ...roomInfo, ...overrides } } };
  return render(<RoomWait />);
};

// Before each test, reset the fake socket, clear mocks, and set up default mock context values
beforeEach(() => {
  fakeSocket = makeFakeSocket();
  mockNavigate.mockClear();
  toastMocks.error.mockClear();
  toastMocks.success.mockClear();
  mockParams = { code: "ABCD" };
  mockLocation = { state: { roomInfo } };
  mockPlayerContext = {
    player: { username: "hostuser" },
    connectionStatus: "connected",
  };
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// After each test, restore all mocks to their original implementations to avoid affecting other tests
afterEach(() => {
  vi.restoreAllMocks();
});

// Tests for the RoomWait page
describe("RoomWait access guards", () => {
  it("redirects to /browse if there is no room code", () => {
    mockParams = { code: undefined };
    render(<RoomWait />);

    expect(toastMocks.error).toHaveBeenCalledWith("Invalid room code");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("redirects to /browse and renders nothing if location.state is missing", () => {
    mockLocation = { state: null };
    const { container } = render(<RoomWait />);

    expect(toastMocks.error).toHaveBeenCalledWith("Invalid room access");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
    expect(container).toBeEmptyDOMElement();
  });
});

describe("RoomWait initial render", () => {
  it("renders room info from location.state", () => {
    renderRoomWait();

    expect(screen.getByText("Test Room")).toBeInTheDocument();
    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText("EASY")).toBeInTheDocument();
    expect(screen.getByText("2 / 4")).toBeInTheDocument();
  });

  it("emits check-player on mount", () => {
    renderRoomWait();
    expect(fakeSocket.emit).toHaveBeenCalledWith("check-player", {
      code: "ABCD",
    });
  });

  it("renders empty placeholder slots for remaining max player capacity", () => {
    renderRoomWait();
    expect(screen.getAllByText("Waiting for Player...")).toHaveLength(2);
  });

  it("shows the crown icon for the host player", () => {
    renderRoomWait();
    const hostCard = screen.getByText("Host User").closest("article");
    expect(hostCard.querySelector("svg")).toBeInTheDocument();
  });
});

describe("RoomWait check-player-response handling", () => {
  it("redirects a non-host to /browse when the server says the room is invalid", () => {
    mockPlayerContext = {
      player: { username: "player2" },
      connectionStatus: "connected",
    };
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("check-player-response", {
        valid: false,
        message: "Room not found",
      });
    });

    expect(toastMocks.error).toHaveBeenCalledWith("Room not found");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("redirects the host to /create when the server says the room is invalid", () => {
    mockPlayerContext = {
      player: { username: "hostuser" },
      connectionStatus: "connected",
    };
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("check-player-response", {
        valid: false,
        message: "Room not found",
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/create", { replace: true });
  });

  it("does not navigate away when the room is valid", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("check-player-response", {
        valid: true,
        message: "",
      });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("RoomWait checkInProgressRef resets on cleanup, not just on success", () => {
  it("still re-emits check-player and processes the response after isHost flips before the original response arrives", () => {
    mockPlayerContext = { player: null, connectionStatus: "connected" };
    const { rerender } = renderRoomWait();

    expect(fakeSocket.emit).toHaveBeenCalledWith("check-player", {
      code: "ABCD",
    });
    const emitCallsBeforeRerun = fakeSocket.emit.mock.calls.filter(
      (call) => call[0] === "check-player",
    ).length;

    mockPlayerContext = {
      player: { username: "hostuser" },
      connectionStatus: "connected",
    };
    act(() => {
      rerender(<RoomWait />);
    });

    const emitCallsAfterRerun = fakeSocket.emit.mock.calls.filter(
      (call) => call[0] === "check-player",
    ).length;

    expect(emitCallsAfterRerun).toBe(emitCallsBeforeRerun + 1);

    act(() => {
      fakeSocket.__trigger("check-player-response", {
        valid: false,
        message: "Room not found",
      });
    });

    // The fresh listener registered after the isHost change picks up the
    // response and correctly redirects the (now-known) host to /create.
    expect(toastMocks.error).toHaveBeenCalledWith("Room not found");
    expect(mockNavigate).toHaveBeenCalledWith("/create", { replace: true });
  });

  it("does not double-emit check-player on a re-render where isHost/code/navigate are unchanged", () => {
    renderRoomWait();

    const emitCallsAfterMount = fakeSocket.emit.mock.calls.filter(
      (call) => call[0] === "check-player",
    ).length;
    expect(emitCallsAfterMount).toBe(1);

    act(() => {
      fakeSocket.__trigger("player-joined", { players: roomInfo.players });
    });

    const emitCallsAfterUnrelatedUpdate = fakeSocket.emit.mock.calls.filter(
      (call) => call[0] === "check-player",
    ).length;
    expect(emitCallsAfterUnrelatedUpdate).toBe(1);
  });
});

describe("RoomWait player roster updates", () => {
  it("updates the player list on player-joined", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("player-joined", {
        players: [
          ...roomInfo.players,
          {
            username: "p3",
            displayName: "Player Three",
            isReconnecting: false,
          },
        ],
      });
    });

    expect(screen.getByText("Player Three")).toBeInTheDocument();
    expect(screen.getByText("3 / 4")).toBeInTheDocument();
  });

  it("updates the player list on player-left", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("player-left", {
        players: [roomInfo.players[0]],
      });
    });

    expect(screen.queryByText("Player Two")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
  });

  it("shows RECONNECTING... on the reconnecting player's own card", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("player-joined", {
        players: [
          roomInfo.players[0],
          { ...roomInfo.players[1], isReconnecting: true },
        ],
      });
    });

    const playerCard = screen.getByText("Player Two").closest("article");
    expect(within(playerCard).getByText("RECONNECTING...")).toBeInTheDocument();
  });
});

describe("RoomWait game starting / started", () => {
  it("shows the GAME STARTING overlay on game-starting", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("game-starting", {});
    });

    expect(screen.getByText("GAME STARTING")).toBeInTheDocument();
  });

  it("navigates to the game page on game-started", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("game-started", {
        code: "ABCD",
        serverPlayers: roomInfo.players,
        endsAt: 12345,
        question: { id: 1 },
        beforeRoundEvents: [],
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith("/game/ABCD", {
      replace: true,
      state: {
        players: roomInfo.players,
        endsAt: 12345,
        question: { id: 1 },
        beforeRoundEvents: [],
      },
    });
  });

  it("does not emit leave-room on unmount if the game already started", () => {
    const { unmount } = renderRoomWait();

    act(() => {
      fakeSocket.__trigger("game-started", {
        code: "ABCD",
        serverPlayers: roomInfo.players,
        endsAt: 1,
        question: {},
        beforeRoundEvents: [],
      });
    });

    fakeSocket.volatile.emit.mockClear();
    unmount();

    expect(fakeSocket.volatile.emit).not.toHaveBeenCalledWith("leave-room", {
      code: "ABCD",
    });
  });

  it("shows a start-game error and stops the hostStarting state on start-game-error", () => {
    renderRoomWait();

    fireEvent.click(screen.getByText("START GAME"));
    act(() => {
      fakeSocket.__trigger("start-game-error", {
        message: "Something went wrong",
      });
    });

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText("START GAME")).toBeInTheDocument();
  });

  it("redirects to /browse on game-start-cancelled", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("game-start-cancelled", {
        message: "Host cancelled",
      });
    });

    expect(toastMocks.error).toHaveBeenCalledWith("Host cancelled");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
  });
});

describe("RoomWait reconnection handling", () => {
  it("shows the RECONNECTING TO SERVER overlay when connectionStatus is reconnecting", () => {
    mockPlayerContext = {
      player: { username: "hostuser" },
      connectionStatus: "reconnecting",
    };
    renderRoomWait();

    expect(screen.getByText("RECONNECTING TO SERVER...")).toBeInTheDocument();
  });

  it("updates roomInfo and players on player-reconnected", () => {
    renderRoomWait();

    const newRoomInfo = { ...roomInfo, roomName: "Renamed Room" };
    act(() => {
      fakeSocket.__trigger("player-reconnected", { roomInfo: newRoomInfo });
    });

    expect(screen.getByText("Renamed Room")).toBeInTheDocument();
  });

  it("navigates into the game on reconnect-game-success", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("reconnect-game-success", {
        players: roomInfo.players,
        endsAt: 999,
        question: { id: 2 },
        beforeRoundEvents: [],
        roundEndsAt: 1000,
        timeMultiplier: 1,
      });
    });

    expect(toastMocks.success).toHaveBeenCalledWith(
      "Reconnected to game successfully",
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      "/game/ABCD",
      expect.objectContaining({ replace: true }),
    );
  });

  it("re-emits reconnect-room on socket connect", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("connect", undefined);
    });

    expect(fakeSocket.emit).toHaveBeenCalledWith("reconnect-room", {
      code: "ABCD",
    });
  });

  it("redirects a non-host to /browse on room-reconnect-error", () => {
    mockPlayerContext = {
      player: { username: "player2" },
      connectionStatus: "connected",
    };
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("room-reconnect-error", undefined);
    });

    expect(toastMocks.error).toHaveBeenCalledWith("Reconnection failed");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("redirects the host to /create on room-reconnect-error", () => {
    mockPlayerContext = {
      player: { username: "hostuser" },
      connectionStatus: "connected",
    };
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("room-reconnect-error", undefined);
    });

    expect(toastMocks.error).toHaveBeenCalledWith("Reconnection failed");
    expect(mockNavigate).toHaveBeenCalledWith("/create", { replace: true });
  });
});

describe("RoomWait room deletion", () => {
  it("redirects to /browse on room-deleted", () => {
    renderRoomWait();

    act(() => {
      fakeSocket.__trigger("room-deleted", { message: "Room was deleted" });
    });

    expect(toastMocks.error).toHaveBeenCalledWith("Room was deleted");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
  });
});

describe("RoomWait start game button", () => {
  it("shows START GAME for the host when there are other players", () => {
    renderRoomWait();
    expect(screen.getByText("START GAME")).toBeInTheDocument();
  });

  it("does not show START GAME for a non-host", () => {
    mockPlayerContext = {
      player: { username: "player2" },
      connectionStatus: "connected",
    };
    renderRoomWait();

    expect(screen.queryByText("START GAME")).not.toBeInTheDocument();
  });

  it("emits start-game and shows STARTING GAME... when the host clicks start", () => {
    renderRoomWait();

    fireEvent.click(screen.getByText("START GAME"));

    expect(fakeSocket.emit).toHaveBeenCalledWith("start-game", {
      code: "ABCD",
    });
    expect(screen.getByText("STARTING GAME...")).toBeInTheDocument();
  });

  it("shows an error instead of starting when there are not enough players", () => {
    renderRoomWait({ players: [roomInfo.players[0]] });

    fireEvent.click(screen.getByText("START GAME"));

    expect(
      screen.getByText(/Not enough players to start game/),
    ).toBeInTheDocument();
    expect(fakeSocket.emit).not.toHaveBeenCalledWith("start-game", {
      code: "ABCD",
    });
  });

  it("shows RECONNECTING... and disables the button when a player is reconnecting", () => {
    renderRoomWait({
      players: [
        roomInfo.players[0],
        { ...roomInfo.players[1], isReconnecting: true },
      ],
    });

    const startButtons = screen.getAllByText(/RECONNECTING\.\.\./);
    const button = startButtons[startButtons.length - 1].closest("button");
    expect(button).toBeDisabled();
  });
});

describe("RoomWait leave room", () => {
  it("emits leave-room and navigates to /browse when LEAVE ROOM is clicked", () => {
    renderRoomWait();

    fireEvent.click(screen.getByText("LEAVE ROOM"));

    expect(fakeSocket.emit).toHaveBeenCalledWith("leave-room", {
      code: "ABCD",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("emits a volatile leave-room on unmount if the game never started", () => {
    const { unmount } = renderRoomWait();
    fakeSocket.volatile.emit.mockClear();

    unmount();

    expect(fakeSocket.volatile.emit).toHaveBeenCalledWith("leave-room", {
      code: "ABCD",
    });
  });
});
