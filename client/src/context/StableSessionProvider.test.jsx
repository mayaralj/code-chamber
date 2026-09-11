// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useContext } from "react";
import { render, screen } from "@testing-library/react";
import StableSessionProvider from "./StableSessionProvider";
import StableSessionContext from "./StableSessionContext";

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
  const { session, isPending, error } = useContext(StableSessionContext);
  return (
    <div>
      <span data-testid="session">
        {session ? JSON.stringify(session) : "none"}
      </span>
      <span data-testid="pending">{String(isPending)}</span>
      <span data-testid="error">{error ? error.message : "none"}</span>
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

// Before each test, clear the refetch mock and set server health to unreachable to ensure a clean slate for each test
beforeEach(() => {
  refetchMock.mockClear();
  setServerHealth(false);
});

// StableSessionProvider tests
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
