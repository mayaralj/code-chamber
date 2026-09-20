// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useContext } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import ServerHealthProvider from "./ServerHealthProvider";
import ServerHealthContext from "./ServerHealthContext";

// Vars
let pendingFetches;

// Mocks
const mockFetch = vi.fn((url, options) => {
  return new Promise((resolve, reject) => {
    pendingFetches.push({ resolve, reject });
    options.signal.addEventListener("abort", () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      reject(err);
    });
  });
});

// Flushes pending microtasks without relying on waitFor's polling, which never advances while fake timers are active.
const flushMicrotasks = () =>
  act(async () => {
    await Promise.resolve();
  });

// Consumer component to access ServerHealthContext values for testing
const Consumer = () => {
  const { serverUnreachable } = useContext(ServerHealthContext);
  return <span data-testid="unreachable">{String(serverUnreachable)}</span>;
};

// Helper function to render the ServerHealthProvider with the Consumer component for testing
const renderProvider = () =>
  render(
    <ServerHealthProvider>
      <Consumer />
    </ServerHealthProvider>,
  );

// Before each test, stub global fetch with the mockFetch function and reset the pendingFetches array to ensure a clean slate for each test
beforeEach(() => {
  pendingFetches = [];
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockClear();
});

// After each test, unstub global fetch and restore real timers to avoid affecting other tests that may rely on real time
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Tests for ServerHealthProvider context
describe("ServerHealthProvider - initial state", () => {
  it("starts with serverUnreachable false before any check resolves", () => {
    renderProvider();

    expect(screen.getByTestId("unreachable")).toHaveTextContent("false");
  });

  it("calls fetch immediately on mount", () => {
    renderProvider();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_APP_URL}/api/health`,
      expect.objectContaining({ method: "GET" }),
    );
  });
});

describe("ServerHealthProvider - fetch outcomes (real timers)", () => {
  it("keeps serverUnreachable false when the health check responds ok", async () => {
    renderProvider();

    act(() => {
      pendingFetches[0].resolve({ ok: true });
    });

    await waitFor(() =>
      expect(screen.getByTestId("unreachable")).toHaveTextContent("false"),
    );
  });

  it("sets serverUnreachable true when the health check responds with a non-ok status", async () => {
    renderProvider();

    act(() => {
      pendingFetches[0].resolve({ ok: false, status: 500 });
    });

    await waitFor(() =>
      expect(screen.getByTestId("unreachable")).toHaveTextContent("true"),
    );
  });

  it("sets serverUnreachable true when fetch rejects with a network error", async () => {
    renderProvider();

    act(() => {
      pendingFetches[0].reject(new TypeError("Failed to fetch"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("unreachable")).toHaveTextContent("true"),
    );
  });

  it("does not change serverUnreachable when the request is aborted", async () => {
    renderProvider();

    act(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      pendingFetches[0].reject(err);
    });

    await flushMicrotasks();
    expect(screen.getByTestId("unreachable")).toHaveTextContent("false");
  });
});

describe("ServerHealthProvider - polling (fake timers)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("polls again after the interval elapses", () => {
    renderProvider();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("aborts the previous in-flight request when a new poll starts", () => {
    renderProvider();
    const firstSignal = mockFetch.mock.calls[0][1].signal;
    expect(firstSignal.aborted).toBe(false);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(firstSignal.aborted).toBe(true);
  });

  it("a slow stale check cannot overwrite a newer check's result once aborted", async () => {
    renderProvider();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(pendingFetches).toHaveLength(2);

    act(() => {
      pendingFetches[1].resolve({ ok: true });
    });
    await flushMicrotasks();
    expect(screen.getByTestId("unreachable")).toHaveTextContent("false");

    act(() => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      pendingFetches[0].reject(err);
    });
    await flushMicrotasks();
    expect(screen.getByTestId("unreachable")).toHaveTextContent("false");
  });
});

describe("ServerHealthProvider - cleanup", () => {
  it("aborts the in-flight request on unmount", () => {
    const { unmount } = renderProvider();
    const signal = mockFetch.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("stops polling after unmount", () => {
    vi.useFakeTimers();
    const { unmount } = renderProvider();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    unmount();
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
