// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useContext } from "react";
import { render, screen, act } from "@testing-library/react";
import StableSessionProvider from "./StableSessionProvider";
import StableSessionContext from "./StableSessionContext";
import { createLocalStorageMock } from "../test/localStorageMock";

// Mocks
vi.mock("../authClient", () => ({
  default: { useSession: vi.fn() },
}));
vi.mock("../hooks/useServerHealth", () => ({
  default: vi.fn(),
}));

// Imports after mocks
import authClient from "../authClient";
import useServerHealth from "../hooks/useServerHealth";

// Config mirrors the values in StableSessionProvider.jsx
const RETRY_BASE_DELAY = 1500;
const RETRY_MAX_DELAY = 10000;
const DEGRADED_AFTER_ATTEMPTS = 6;

// mock refetch
const refetchMock = vi.fn();

// Controls what authClient.useSession() returns on the next render.
const setSessionState = ({ data, isPending, error = null }) => {
  authClient.useSession.mockReturnValue({
    data,
    isPending,
    error,
    refetch: refetchMock,
  });
};

// Controls what useServerHealth() returns on the next render.
const setServerHealth = (serverUnreachable) => {
  useServerHealth.mockReturnValue({ serverUnreachable });
};

// Consumer component to access StableSessionContext values for testing
const Consumer = () => {
  const { session, isPending, error, persistentError } =
    useContext(StableSessionContext);
  return (
    <div>
      <span data-testid="session">
        {session ? JSON.stringify(session) : "none"}
      </span>
      <span data-testid="pending">{String(isPending)}</span>
      <span data-testid="error">{error ? error.message : "none"}</span>
      <span data-testid="persistentError">{String(persistentError)}</span>
    </div>
  );
};

// Helper component to wrap the Consumer with StableSessionProvider for testing
const Tree = () => (
  <StableSessionProvider>
    <Consumer />
  </StableSessionProvider>
);

// Helper function to render the Tree component for testing (used for rerendering in tests)
const renderProvider = () => render(<Tree />);

// Advances fake timers and flushes any pending microtasks/state updates
// spawned by the async retry loop (setTimeout -> refetch -> setState).
const advance = async (ms) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  refetchMock.mockClear();
  setServerHealth(false);
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", createLocalStorageMock());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// --- Pre-existing behavior (kept as-is) ---

describe("StableSessionProvider - initial pending state", () => {
  it("exposes the raw session and isPending true before the session ever resolves", () => {
    setSessionState({ data: undefined, isPending: true });
    renderProvider();

    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("pending")).toHaveTextContent("true");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });
});

describe("StableSessionProvider - first resolution", () => {
  it("commits the session and flips isPending false once loading finishes successfully", () => {
    setSessionState({ data: undefined, isPending: true });
    const { rerender } = renderProvider();

    setSessionState({ data: { id: "u1" }, isPending: false });
    rerender(<Tree />);

    expect(screen.getByTestId("session")).toHaveTextContent('{"id":"u1"}');
    expect(screen.getByTestId("pending")).toHaveTextContent("false");
  });

  it("does not commit a session when the first resolution comes back with an error", () => {
    setSessionState({ data: undefined, isPending: true });
    const { rerender } = renderProvider();

    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "network down" },
    });
    rerender(<Tree />);

    expect(screen.getByTestId("session")).toHaveTextContent("none");
    expect(screen.getByTestId("pending")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("network down");
  });
});

describe("StableSessionProvider - after having loaded once", () => {
  it("never exposes isPending true again, even if the underlying session re-enters a pending state", () => {
    setSessionState({ data: { id: "u1" }, isPending: true });
    const { rerender } = renderProvider();

    setSessionState({ data: { id: "u1" }, isPending: false });
    rerender(<Tree />);
    expect(screen.getByTestId("pending")).toHaveTextContent("false");

    setSessionState({ data: { id: "u1" }, isPending: true });
    rerender(<Tree />);

    expect(screen.getByTestId("pending")).toHaveTextContent("false");
    expect(screen.getByTestId("session")).toHaveTextContent('{"id":"u1"}');
  });

  it("adopts a new session value once a subsequent non-pending, error-free render provides one", () => {
    setSessionState({ data: { id: "u1" }, isPending: true });
    const { rerender } = renderProvider();

    setSessionState({ data: { id: "u1" }, isPending: false });
    rerender(<Tree />);

    setSessionState({ data: { id: "u2" }, isPending: false });
    rerender(<Tree />);

    expect(screen.getByTestId("session")).toHaveTextContent('{"id":"u2"}');
  });

  it("keeps the last stable session if an error appears on a later, already-loaded render", () => {
    setSessionState({ data: { id: "u1" }, isPending: true });
    const { rerender } = renderProvider();

    setSessionState({ data: { id: "u1" }, isPending: false });
    rerender(<Tree />);

    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "expired" },
    });
    rerender(<Tree />);

    expect(screen.getByTestId("session")).toHaveTextContent('{"id":"u1"}');
    expect(screen.getByTestId("error")).toHaveTextContent("expired");
  });

  it("ignores a changed session value while an error is present on an already-loaded render", () => {
    setSessionState({
      data: undefined,
      isPending: true,
    });
    const { rerender } = renderProvider();

    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "expired" },
    });
    rerender(<Tree />);
    expect(screen.getByTestId("session")).toHaveTextContent("none");

    setSessionState({
      data: { id: "u3" },
      isPending: false,
      error: { message: "expired" },
    });
    rerender(<Tree />);

    expect(screen.getByTestId("session")).toHaveTextContent("none");
  });
});

describe("StableSessionProvider - refetch on server reachability", () => {
  it("calls refetch when the server transitions from unreachable to reachable", () => {
    setSessionState({ data: { id: "u1" }, isPending: false });
    setServerHealth(true);
    const { rerender } = renderProvider();
    expect(refetchMock).not.toHaveBeenCalled();

    setServerHealth(false);
    rerender(<Tree />);

    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not call refetch when the server was already reachable", () => {
    setSessionState({ data: { id: "u1" }, isPending: false });
    setServerHealth(false);
    const { rerender } = renderProvider();

    rerender(<Tree />);

    expect(refetchMock).not.toHaveBeenCalled();
  });

  it("does not call refetch when the server transitions from reachable to unreachable", () => {
    setSessionState({ data: { id: "u1" }, isPending: false });
    setServerHealth(false);
    const { rerender } = renderProvider();

    setServerHealth(true);
    rerender(<Tree />);

    expect(refetchMock).not.toHaveBeenCalled();
  });

  it("does not call refetch again on a re-render where reachability stays the same", () => {
    setSessionState({ data: { id: "u1" }, isPending: false });
    setServerHealth(true);
    const { rerender } = renderProvider();

    setServerHealth(false);
    rerender(<Tree />);
    expect(refetchMock).toHaveBeenCalledTimes(1);

    rerender(<Tree />);
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("StableSessionProvider - error-driven retry loop", () => {
  it("does not start a retry loop when there is no error", async () => {
    setSessionState({ data: { id: "u1" }, isPending: false });
    renderProvider();

    await advance(RETRY_MAX_DELAY * 3);

    expect(refetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("persistentError")).toHaveTextContent("false");
  });

  it("calls refetch after the base delay once an error appears", async () => {
    setSessionState({ data: { id: "u1" }, isPending: false });
    const { rerender } = renderProvider();

    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down" },
    });
    rerender(<Tree />);

    await advance(RETRY_BASE_DELAY - 1);
    expect(refetchMock).not.toHaveBeenCalled();

    await advance(1);
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("backs off exponentially between attempts, capped at RETRY_MAX_DELAY", async () => {
    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down" },
    });
    renderProvider();

    // attempt 1 at 1500ms
    await advance(RETRY_BASE_DELAY);
    expect(refetchMock).toHaveBeenCalledTimes(1);

    // attempt 2 at +3000ms
    await advance(RETRY_BASE_DELAY * 2);
    expect(refetchMock).toHaveBeenCalledTimes(2);

    // attempt 3 at +6000ms
    await advance(RETRY_BASE_DELAY * 4);
    expect(refetchMock).toHaveBeenCalledTimes(3);

    // attempt 4 would be 12000ms uncapped, but should be capped at 10000ms
    await advance(RETRY_MAX_DELAY);
    expect(refetchMock).toHaveBeenCalledTimes(4);

    // subsequent attempts stay capped at RETRY_MAX_DELAY (10000ms)
    await advance(RETRY_MAX_DELAY);
    expect(refetchMock).toHaveBeenCalledTimes(5);
  });

  it("keeps retrying indefinitely while the error persists, without a hard stop", async () => {
    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down" },
    });
    renderProvider();

    const delays = [1500, 3000, 6000, 10000, 10000, 10000, 10000, 10000];
    for (let i = 0; i < delays.length; i++) {
      await advance(delays[i]);
      expect(refetchMock).toHaveBeenCalledTimes(i + 1);
    }
  });

  it("flips persistentError to true only once DEGRADED_AFTER_ATTEMPTS is reached", async () => {
    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down" },
    });
    renderProvider();

    const delays = [1500, 3000, 6000, 10000, 10000, 10000];
    for (let i = 0; i < DEGRADED_AFTER_ATTEMPTS; i++) {
      await advance(delays[i]);
      if (i < DEGRADED_AFTER_ATTEMPTS - 1) {
        expect(screen.getByTestId("persistentError")).toHaveTextContent(
          "false",
        );
      }
    }

    expect(refetchMock).toHaveBeenCalledTimes(DEGRADED_AFTER_ATTEMPTS);
    expect(screen.getByTestId("persistentError")).toHaveTextContent("true");
  });

  it("stops retrying and resets persistentError as soon as the error clears", async () => {
    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down" },
    });
    const { rerender } = renderProvider();

    const delays = [1500, 3000, 6000, 10000, 10000, 10000];
    for (const delay of delays) {
      await advance(delay);
    }
    expect(refetchMock).toHaveBeenCalledTimes(DEGRADED_AFTER_ATTEMPTS);
    expect(screen.getByTestId("persistentError")).toHaveTextContent("true");

    setSessionState({ data: { id: "u1" }, isPending: false, error: null });
    rerender(<Tree />);

    expect(screen.getByTestId("persistentError")).toHaveTextContent("false");

    refetchMock.mockClear();
    await advance(RETRY_MAX_DELAY * 3);

    expect(refetchMock).not.toHaveBeenCalled();
  });

  it("stops the retry loop on unmount and issues no further refetch calls", async () => {
    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down" },
    });
    const { unmount } = renderProvider();

    await advance(RETRY_BASE_DELAY);
    expect(refetchMock).toHaveBeenCalledTimes(1);

    unmount();
    refetchMock.mockClear();

    await advance(RETRY_MAX_DELAY * 3);
    expect(refetchMock).not.toHaveBeenCalled();
  });

  it("restarts the attempt counter from zero the next time an error reappears", async () => {
    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down" },
    });
    const { rerender } = renderProvider();

    const delays = [1500, 3000, 6000, 10000, 10000, 10000];
    for (const delay of delays) {
      await advance(delay);
    }
    expect(screen.getByTestId("persistentError")).toHaveTextContent("true");

    setSessionState({ data: { id: "u1" }, isPending: false, error: null });
    rerender(<Tree />);
    expect(screen.getByTestId("persistentError")).toHaveTextContent("false");

    refetchMock.mockClear();
    setSessionState({
      data: undefined,
      isPending: false,
      error: { message: "down again" },
    });
    rerender(<Tree />);

    await advance(RETRY_BASE_DELAY);
    expect(refetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("persistentError")).toHaveTextContent("false");
  });
});
