// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useContext } from "react";
import { render, screen, act } from "@testing-library/react";
import { createLocalStorageMock } from "../test/localStorageMock";
import PlayerContext from "./PlayerContext";

// Mock the socket module
vi.mock("../socket", async () => {
  const { createSocketMock } = await import("../test/socketMock");
  const socket = createSocketMock();
  socket.io = createSocketMock();
  return { socket };
});

// Import after mocks
import { socket } from "../socket";
import PlayerProvider from "./PlayerProvider";

// Mock the react-hot-toast module
const toastError = vi.fn(() => "toast-id");
const toastDismiss = vi.fn();
vi.mock("react-hot-toast", () => ({
  default: {
    error: (...args) => toastError(...args),
    dismiss: (...args) => toastDismiss(...args),
  },
}));

// Stub global localStorage with a mock that tracks calls and allows inspection of stored values
const localStorageMock = createLocalStorageMock();
vi.stubGlobal("localStorage", localStorageMock);

// Consumer component to access PlayerContext values for testing
const Consumer = () => {
  const { player, connectionStatus } = useContext(PlayerContext);
  return (
    <div>
      <span data-testid="status">{connectionStatus}</span>
      <span data-testid="player">{player ? player.username : "none"}</span>
    </div>
  );
};

// Helper function to render the PlayerProvider with the Consumer component for testing
const renderProvider = () =>
  render(
    <PlayerProvider>
      <Consumer />
    </PlayerProvider>,
  );

// Helper to Advance the fake clock one second at a time so React has a chance to commit the state update and re-run the effect
const advanceSeconds = (seconds) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

// Before each test, use fake timers, reset the socket mock, and clear the toast and localStorage mocks to ensure a clean slate for each test
beforeEach(() => {
  vi.useFakeTimers();
  socket.__reset();
  socket.io.__reset();
  socket.active = true;
  toastError.mockClear();
  toastDismiss.mockClear();
  localStorageMock.clear();
});

// After each test, restore real timers to avoid affecting other tests that may rely on real time
afterEach(() => {
  vi.useRealTimers();
});

// Tests for PlayerProvider context
describe("PlayerProvider - mount behavior", () => {
  it("connects the socket on mount and starts in 'connecting' status", () => {
    renderProvider();

    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("status")).toHaveTextContent("connecting");
    expect(screen.getByTestId("player")).toHaveTextContent("none");
  });
});

describe("PlayerProvider - identity", () => {
  it("sets player and status to connected on user-data", () => {
    renderProvider();

    act(() => {
      socket.__trigger("user-data", {
        id: "u1",
        username: "alice",
        isGuest: false,
      });
    });

    expect(screen.getByTestId("status")).toHaveTextContent("connected");
    expect(screen.getByTestId("player")).toHaveTextContent("alice");
  });

  it("stores the guest id in localStorage for a new guest identity", () => {
    renderProvider();

    act(() => {
      socket.__trigger("user-data", {
        id: "guest-1",
        username: "bob",
        isGuest: true,
      });
    });

    expect(localStorageMock.getItem("guestId")).toBe("guest-1");
  });

  it("does not call localStorage.setItem again if the guest id already matches", () => {
    localStorageMock.setItem("guestId", "guest-1");
    const setItemSpy = vi.spyOn(localStorageMock, "setItem");
    renderProvider();

    act(() => {
      socket.__trigger("user-data", {
        id: "guest-1",
        username: "bob",
        isGuest: true,
      });
    });

    expect(setItemSpy).not.toHaveBeenCalledWith("guestId", "guest-1");
    setItemSpy.mockRestore();
  });

  it("does not write to localStorage for a non-guest identity", () => {
    renderProvider();

    act(() => {
      socket.__trigger("user-data", {
        id: "u1",
        username: "alice",
        isGuest: false,
      });
    });

    expect(localStorageMock.getItem("guestId")).toBeNull();
  });
});

describe("PlayerProvider - disconnect handling", () => {
  it("sets status to 'disconnected' on first disconnect before ever connecting", () => {
    renderProvider();

    act(() => {
      socket.__trigger("disconnect");
    });

    expect(screen.getByTestId("status")).toHaveTextContent("disconnected");
  });

  it("sets status to 'reconnecting' on disconnect after having connected before", () => {
    renderProvider();

    act(() => {
      socket.__trigger("connect");
    });
    act(() => {
      socket.__trigger("disconnect");
    });

    expect(screen.getByTestId("status")).toHaveTextContent("reconnecting");
  });
});

describe("PlayerProvider - connect_error handling", () => {
  it("does nothing when connect_error fires while the socket is still active", () => {
    renderProvider();

    act(() => {
      socket.__trigger("connect_error");
    });

    expect(screen.getByTestId("status")).toHaveTextContent("connecting");
  });

  it("sets status to 'error' on connect_error when inactive and never connected before", () => {
    renderProvider();
    socket.active = false;

    act(() => {
      socket.__trigger("connect_error");
    });

    expect(screen.getByTestId("status")).toHaveTextContent("error");
    expect(screen.getByTestId("player")).toHaveTextContent("none");
  });

  it("sets status to 'reconnecting' on connect_error when inactive after having connected before", () => {
    renderProvider();

    act(() => {
      socket.__trigger("connect");
    });
    socket.active = false;

    act(() => {
      socket.__trigger("connect_error");
    });

    expect(screen.getByTestId("status")).toHaveTextContent("reconnecting");
  });
});

describe("PlayerProvider - lost-connection timeout", () => {
  it("transitions to 'lost-connection' 10 seconds after a disconnect and shows a toast", () => {
    renderProvider();

    act(() => {
      socket.__trigger("disconnect");
    });
    advanceSeconds(10);

    expect(screen.getByTestId("status")).toHaveTextContent("lost-connection");
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it("does not fire the lost-connection toast twice from disconnect followed by a reconnect_attempt", () => {
    renderProvider();

    act(() => {
      socket.__trigger("disconnect");
    });
    act(() => {
      socket.io.__trigger("reconnect_attempt");
    });
    advanceSeconds(10);

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("status")).toHaveTextContent("lost-connection");
  });

  it("notifies the server to clean up the player once identity arrives after lost-connection", () => {
    renderProvider();

    act(() => {
      socket.__trigger("disconnect");
    });
    advanceSeconds(10);

    act(() => {
      socket.__trigger("user-data", {
        id: "u1",
        username: "alice",
        isGuest: false,
      });
    });

    expect(socket.emit).toHaveBeenCalledWith("cleanup-player");
    expect(screen.getByTestId("status")).toHaveTextContent("connected");
  });

  it("dismisses the lost-connection toast once reconnected via the connect event", () => {
    renderProvider();

    act(() => {
      socket.__trigger("disconnect");
    });
    advanceSeconds(10);
    toastDismiss.mockClear();

    act(() => {
      socket.__trigger("connect");
    });

    expect(toastDismiss).toHaveBeenCalled();
  });
});

describe("PlayerProvider - cleanup", () => {
  it("disconnects the socket and removes all listeners on unmount", () => {
    const { unmount } = renderProvider();

    unmount();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.__listenerCount("user-data")).toBe(0);
    expect(socket.__listenerCount("connect")).toBe(0);
    expect(socket.__listenerCount("connect_error")).toBe(0);
    expect(socket.__listenerCount("disconnect")).toBe(0);
    expect(socket.io.__listenerCount("reconnect_attempt")).toBe(0);
  });
});
