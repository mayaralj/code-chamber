// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import Home from "./Home";

// Macks
const navigateMock = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

// Fake EventSource so SSE-driven ticker updates can be simulated directly.
class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
    this.close = vi.fn();
    FakeEventSource.instances.push(this);
  }
}
const latestEventSource = () =>
  FakeEventSource.instances[FakeEventSource.instances.length - 1];

// Complete live stats payload for testing SSE ticker updates
const completeLiveStats = {
  active_users: 42,
  total_matches: 100,
  total_submissions: 500,
  avg_pass_rate: 0.75,
  avg_execution_time: 123.4,
  avg_submission_time: 8.2,
  most_used_language: "python",
  most_used_difficulty: "medium",
  avg_survival_time: 95,
  avg_match_time: 245,
};

// Helper to mock a single fetch response with the given data and status
const mockFetchOnce = (data, ok = true) => {
  fetchMock.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  });
};

// Vars
let fetchMock;

// Before each test, clear the navigate mock, reset the FakeEventSource instances, stub global EventSource and fetch, and spy on console methods to avoid cluttering test output
beforeEach(() => {
  navigateMock.mockClear();
  FakeEventSource.instances = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// After each test, restore all mocks and unstub global variables to avoid affecting other tests
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Home page tests
describe("Home - hero and action cards", () => {
  it("renders the hero heading and tagline", () => {
    render(<Home />);

    expect(screen.getByText("CODE CHAMBER")).toBeInTheDocument();
    expect(
      screen.getByText(/The Multiplayer Way To Sharpen Your Coding Skills/),
    ).toBeInTheDocument();
  });

  it("renders both action cards with their titles and descriptions", () => {
    render(<Home />);

    expect(screen.getByText("CREATE CHAMBER")).toBeInTheDocument();
    expect(screen.getByText("BROWSE CHAMBERS")).toBeInTheDocument();
    expect(screen.getByText(/Host a match of your own/)).toBeInTheDocument();
    expect(
      screen.getByText(/Find and join a match hosted by someone else/),
    ).toBeInTheDocument();
  });

  it("navigates to /create when the CREATE button is clicked", () => {
    render(<Home />);

    screen.getByRole("button", { name: /CREATE ◫/ }).click();

    expect(navigateMock).toHaveBeenCalledWith("/create");
  });

  it("navigates to /browse when the BROWSE button is clicked", () => {
    render(<Home />);

    screen.getByRole("button", { name: /BROWSE ◫/ }).click();

    expect(navigateMock).toHaveBeenCalledWith("/browse");
  });

  it("navigates to /leaderboard when VIEW FULL LEADERBOARD is clicked", () => {
    render(<Home />);

    screen.getByRole("button", { name: "VIEW FULL LEADERBOARD" }).click();

    expect(navigateMock).toHaveBeenCalledWith("/leaderboard");
  });
});

describe("Home - live stats ticker (SSE)", () => {
  it("shows the connecting message before any live stats arrive", () => {
    render(<Home />);

    expect(
      screen.getAllByText("CONNECTING TO LIVE FEED...").length,
    ).toBeGreaterThan(0);
  });

  it("opens an EventSource connection on mount", () => {
    render(<Home />);

    expect(FakeEventSource.instances).toHaveLength(1);
  });

  it("constructs the EventSource with the relative /api/liveStats path", () => {
    render(<Home />);

    expect(latestEventSource().url).toBe(
      `${import.meta.env.VITE_API_URL}/api/liveStats`,
    );
  });

  it("updates the ticker with formatted values once a complete payload arrives", () => {
    render(<Home />);

    act(() => {
      latestEventSource().onmessage({
        data: JSON.stringify(completeLiveStats),
      });
    });

    expect(screen.getAllByText(/PLAYERS ONLINE: 42/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AVG PASS RATE: 75%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/AVG EXEC TIME: 123ms/).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(/MOST USED LANGUAGE: PYTHON/).length,
    ).toBeGreaterThan(0);
  });

  it("formats survival and match time as MM:SS MIN", () => {
    render(<Home />);

    act(() => {
      latestEventSource().onmessage({
        data: JSON.stringify(completeLiveStats),
      });
    });

    expect(
      screen.getAllByText(/AVG SURVIVAL TIME: 01:35 MIN/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/AVG MATCH TIME: 04:05 MIN/).length,
    ).toBeGreaterThan(0);
  });

  it("reverts to the connecting message if an incomplete payload arrives", () => {
    render(<Home />);

    act(() => {
      latestEventSource().onmessage({
        data: JSON.stringify(completeLiveStats),
      });
    });
    expect(screen.getAllByText(/PLAYERS ONLINE: 42/).length).toBeGreaterThan(0);

    act(() => {
      latestEventSource().onmessage({
        data: JSON.stringify({ active_users: 42 }),
      });
    });

    expect(
      screen.getAllByText("CONNECTING TO LIVE FEED...").length,
    ).toBeGreaterThan(0);
  });

  it("does not crash and logs an error when malformed JSON is received", () => {
    render(<Home />);

    expect(() => {
      act(() => {
        latestEventSource().onmessage({ data: "not valid json{{{" });
      });
    }).not.toThrow();

    expect(console.error).toHaveBeenCalledWith(
      "Invalid JSON data received:",
      "not valid json{{{",
    );
  });

  it("closes the EventSource connection on unmount", () => {
    const { unmount } = render(<Home />);
    const source = latestEventSource();

    unmount();

    expect(source.close).toHaveBeenCalledTimes(1);
  });
});

describe("Home - global ranking leaderboard", () => {
  it("fetches the home leaderboard on mount", () => {
    render(<Home />);

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL}/api/homeLeaderboard`,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("renders players returned by the leaderboard fetch", async () => {
    mockFetchOnce([
      { username: "alice", matches_won: 10 },
      { username: "bob", matches_won: 7 },
    ]);
    render(<Home />);

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("10 WINS")).toBeInTheDocument();
  });

  it("shows win_rate as a formatted percent when present instead of matches_won", async () => {
    mockFetchOnce([{ username: "carol", win_rate: 0.6, matches_won: 3 }]);
    render(<Home />);

    expect(await screen.findByText("60%")).toBeInTheDocument();
    expect(screen.queryByText("3 WINS")).not.toBeInTheDocument();
  });

  it("defaults to 0 WINS when matches_won is missing and win_rate is absent", async () => {
    mockFetchOnce([{ username: "dave" }]);
    render(<Home />);

    expect(await screen.findByText("0 WINS")).toBeInTheDocument();
  });

  it("only displays the top 5 ranked players even if more are returned", async () => {
    const players = Array.from({ length: 8 }, (_, i) => ({
      username: `player${i}`,
      matches_won: 8 - i,
    }));
    mockFetchOnce(players);
    render(<Home />);

    await screen.findByText("player0");
    expect(screen.getByText("player4")).toBeInTheDocument();
    expect(screen.queryByText("player5")).not.toBeInTheDocument();
    expect(screen.queryByText("player7")).not.toBeInTheDocument();
  });

  it("renders no rows (only the header) when the leaderboard fetch fails", async () => {
    mockFetchOnce(null, false);
    render(<Home />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("PLAYER")).toBeInTheDocument();
    expect(screen.queryByText(/WINS/)).not.toBeInTheDocument();
  });

  it("polls the leaderboard again after the 60 second interval elapses", () => {
    vi.useFakeTimers();
    render(<Home />);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
