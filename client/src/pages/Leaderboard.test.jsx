// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Leaderboard from "./Leaderboard";

// Helper to create a leaderboard row object with a username and additional metric values
const makeRow = (username, values) => ({ username, ...values });

// Sample leaderboard data for testing, structured by language, difficulty, and metric
const sampleData = {
  ALL: {
    ALL: {
      matches_won: [makeRow("alice", { matches_won: 12 })],
      win_rate: [makeRow("alice", { win_rate: 0.625 })],
    },
    easy: {
      matches_won: [makeRow("bob", { matches_won: 4 })],
    },
  },
  javascript: {
    ALL: {
      total_submissions: [makeRow("carol", { total_submissions: 50 })],
    },
  },
};

// Vars
let pendingFetches;

// Mock fetch function that simulates network requests and allows control over when they resolve or reject
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

// Helper to flush pending microtasks, ensuring that any queued promises are resolved before proceeding in tests
const flushMicrotasks = () =>
  act(async () => {
    await Promise.resolve();
  });

// Helper to resolve the latest pending fetch with specified data and status, simulating a successful or failed network response
const resolveLatestWith = async (data, ok = true) => {
  const entry = pendingFetches[pendingFetches.length - 1];
  act(() => {
    entry.resolve({ ok, status: ok ? 200 : 500, json: async () => data });
  });
  await flushMicrotasks();
};

// beforeEach and afterEach hooks to set up and tear down mocks and spies for each test, ensuring a clean state
beforeEach(() => {
  pendingFetches = [];
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockClear();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// afterEach hook to restore global mocks and spies after each test, preventing side effects on other tests
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Tests for the Leaderboard component
describe("Leaderboard - initial fetch", () => {
  it("shows the LOADING LEADERBOARD state during the initial fetch", () => {
    render(<Leaderboard />);

    expect(screen.getByText("LOADING LEADERBOARD...")).toBeInTheDocument();
    expect(screen.queryByText("No one is here yet.")).not.toBeInTheDocument();
  });

  it("fetches from /api/leaderboard with the expected request options", () => {
    render(<Leaderboard />);

    expect(mockFetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_APP_URL}/api/leaderboard`,
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("renders the default ALL/ALL/matches_won view once data loads", async () => {
    render(<Leaderboard />);

    await resolveLatestWith(sampleData);

    expect(
      screen.getByRole("columnheader", { name: "MATCHES WON" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("alice")).toHaveLength(2);
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows the RETRY error screen when the initial fetch fails", async () => {
    render(<Leaderboard />);

    await resolveLatestWith(null, false);

    expect(screen.getByText("Couldn't load leaderboard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RETRY" })).toBeInTheDocument();
  });

  it("ignores an aborted fetch without showing an error", async () => {
    render(<Leaderboard />);

    const entry = pendingFetches[0];
    await act(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      entry.reject(err);
      await Promise.resolve();
    });

    expect(
      screen.queryByText("Couldn't load leaderboard"),
    ).not.toBeInTheDocument();
  });
});

describe("Leaderboard - retry flow", () => {
  it("refetches and shows the LOADING LEADERBOARD state when RETRY is clicked", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(null, false);

    fireEvent.click(screen.getByRole("button", { name: "RETRY" }));

    expect(screen.getByText("LOADING LEADERBOARD...")).toBeInTheDocument();

    await resolveLatestWith(sampleData);
    expect(screen.getAllByText("alice")).toHaveLength(2);
  });
});

describe("Leaderboard - row rendering", () => {
  it("shows 'No one is here yet.' when the selected combination has no rows", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    fireEvent.change(screen.getByLabelText("Difficulty"), {
      target: { value: "hard" },
    });

    expect(screen.getByText("No one is here yet.")).toBeInTheDocument();
  });

  it("falls back to username when displayUsername is not provided", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    expect(screen.getAllByText("alice")).toHaveLength(2);
  });

  it("prefers displayUsername over username when both are present", async () => {
    render(<Leaderboard />);
    await resolveLatestWith({
      ALL: {
        ALL: {
          matches_won: [
            {
              username: "alice",
              displayUsername: "AliceCodes",
              matches_won: 3,
            },
          ],
        },
      },
    });

    expect(screen.getByText("AliceCodes")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("formats a percentage metric using the win_rate formatter", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    fireEvent.change(screen.getByLabelText("Metric"), {
      target: { value: "win_rate" },
    });

    expect(screen.getByText("62.50%")).toBeInTheDocument();
  });
});

describe("Leaderboard - filters", () => {
  it("updates rows when the difficulty filter changes", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    fireEvent.change(screen.getByLabelText("Difficulty"), {
      target: { value: "easy" },
    });

    expect(screen.getAllByText("bob")).toHaveLength(2);
    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });

  it("updates rows and metric options when the language filter changes", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "javascript" },
    });

    expect(
      screen.getByRole("columnheader", { name: "TOTAL SUBMISSIONS" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("carol")).toHaveLength(2);
  });

  it("does not show match-related metrics in the metric dropdown for a specific language", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "javascript" },
    });

    expect(
      screen.queryByRole("option", { name: "MATCHES WON" }),
    ).not.toBeInTheDocument();
  });

  it("updates the displayed metric when the metric filter changes", async () => {
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    fireEvent.change(screen.getByLabelText("Metric"), {
      target: { value: "win_rate" },
    });

    expect(
      screen.getByRole("columnheader", { name: "WIN RATE" }),
    ).toBeInTheDocument();
  });
});

describe("Leaderboard - background refresh behavior", () => {
  it("keeps showing the existing table when a background refresh fails, instead of the full-page error screen", async () => {
    vi.useFakeTimers();
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);
    expect(screen.getAllByText("alice")).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    await resolveLatestWith(null, false);

    expect(
      screen.queryByText("Couldn't load leaderboard"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("alice")).toHaveLength(2);
  });

  it("still shows the full-page error screen if the very first fetch fails (no prior data to fall back on)", async () => {
    render(<Leaderboard />);

    await resolveLatestWith(null, false);

    expect(screen.getByText("Couldn't load leaderboard")).toBeInTheDocument();
  });

  it("polls again after the 60 second interval elapses", async () => {
    vi.useFakeTimers();
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("aborts the previous in-flight request when a new poll starts", async () => {
    vi.useFakeTimers();
    render(<Leaderboard />);
    await resolveLatestWith(sampleData);

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    const secondCallSignal = mockFetch.mock.calls[1][1].signal;

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(secondCallSignal.aborted).toBe(true);
  });
});

describe("Leaderboard - cleanup", () => {
  it("aborts the in-flight request and stops polling on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(<Leaderboard />);
    const signal = mockFetch.mock.calls[0][1].signal;

    unmount();

    expect(signal.aborted).toBe(true);

    mockFetch.mockClear();
    act(() => {
      vi.advanceTimersByTime(120000);
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
