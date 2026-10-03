// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import Profile from "./Profile";
import { createLocalStorageMock } from "../test/localStorageMock";

import useStableSession from "../hooks/useStableSession";

// Mocks
vi.mock("../hooks/useStableSession", () => ({ default: vi.fn() }));
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams],
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
const authClientMocks = {
  listAccounts: vi.fn(),
  linkSocial: vi.fn(),
  unlinkAccount: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
};
vi.mock("../authClient", () => ({
  default: {
    listAccounts: (...args) => authClientMocks.listAccounts(...args),
    linkSocial: (...args) => authClientMocks.linkSocial(...args),
    unlinkAccount: (...args) => authClientMocks.unlinkAccount(...args),
    signOut: (...args) => authClientMocks.signOut(...args),
    updateUser: (...args) => authClientMocks.updateUser(...args),
  },
}));
const refreshSocketConnection = vi.fn();
vi.mock("../socket", () => ({
  refreshSocketConnection: (...args) => refreshSocketConnection(...args),
}));

// Helper to create a mock submission object with default values, allowing overrides
const makeSubmission = (overrides = {}) => ({
  id: "sub-1",
  language: "python",
  executionTime: 44.4444,
  submissionTime: 5.5555,
  testCasesPassed: 4,
  totalTestCases: 5,
  eliminated: [],
  ...overrides,
});

// Helper to create a mock match object with default values, allowing overrides
const makeMatch = (overrides = {}) => ({
  id: "match-1",
  won: true,
  host: { username: "hostuser" },
  difficulty: "easy",
  date: "2026-09-01T00:00:00.000Z",
  totalRounds: 1,
  testCasesPassed: 4,
  totalTestCases: 5,
  avgExecutionTime: 12.35,
  avgSubmissionTime: 1.23,
  submissions: [makeSubmission()],
  ...overrides,
});

// Helper to create a mock localStorage object that tracks calls and allows inspection of stored values
const sampleProfile = {
  displayName: "Alice",
  username: "alice",
  gameStats: {
    matches_played: 10,
    matches_won: 6,
    win_rate: 0.6,
    total_submissions: 40,
    passed_submissions: 30,
    pass_rate: 0.75,
    avg_execution_time: 15.5,
    avg_submission_time: 2.1,
    languageStats: [
      {
        language: "python",
        total_submissions: 40,
        passed_submissions: 30,
        pass_rate: 0.75,
        avg_execution_time: 15.5,
        avg_submission_time: 2.1,
      },
    ],
  },
  matches: [makeMatch()],
};

// Vars
let pendingProfileFetches;
let pendingMatchFetches;

// Mock fetch that returns a promise which can be resolved or rejected later, allowing tests to control when the fetch resolves and with what data
const mockFetch = vi.fn((url, options) => {
  return new Promise((resolve, reject) => {
    const entry = { resolve, reject };
    if (url === `${import.meta.env.VITE_APP_URL}/api/profile`) {
      pendingProfileFetches.push(entry);
    } else {
      pendingMatchFetches.push(entry);
    }
    options.signal.addEventListener("abort", () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      reject(err);
    });
  });
});

// Helper to flush pending promises and allow React to commit state updates
const flush = () => act(async () => await Promise.resolve());

// Helper to resolve the most recent pending fetch with the given data and status, simulating a server response
const resolveProfile = async (data, status = 200) => {
  const entry = pendingProfileFetches[pendingProfileFetches.length - 1];
  act(() => {
    entry.resolve({ ok: status < 400, status, json: async () => data });
  });
  await flush();
};

// Helper to resolve the most recent pending match fetch with the given data and status, simulating a server response
const resolveMatchHistory = async (data, status = 200) => {
  const entry = pendingMatchFetches[pendingMatchFetches.length - 1];
  act(() => {
    entry.resolve({ ok: status < 400, status, json: async () => data });
  });
  await flush();
};

// Helper to find the "MATCH HISTORY" section in the profile page, which contains the list of matches and the "SHOW MORE" button
const getMatchHistorySection = () =>
  screen.getByText("MATCH HISTORY").closest("section");

const clickShowMoreOnMatchHistory = () => {
  fireEvent.click(within(getMatchHistorySection()).getByText("SHOW MORE"));
};

// Helper to find the close button for the "ALL MATCHES" modal, which is identified by the presence of an SVG icon inside a button within the modal
const getModalCloseButton = () => {
  const heading = screen.getByText("ALL MATCHES");
  const modal = heading.closest("div");
  return within(modal)
    .getAllByRole("button")
    .find((btn) => btn.querySelector("svg"));
};

// Before each test, reset the pending fetches, mock search params, and stub global fetch with the mockFetch function. Also clear any previous calls to mocks and spy on console.log and console.error to suppress output during tests.
beforeEach(() => {
  useStableSession.mockReturnValue({ suppressGuards: false, setSuppressGuards: vi.fn() });
  vi.stubGlobal("localStorage", createLocalStorageMock());
  pendingProfileFetches = [];
  pendingMatchFetches = [];
  mockSearchParams = new URLSearchParams();
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockClear();
  mockNavigate.mockClear();
  refreshSocketConnection.mockClear();
  authClientMocks.listAccounts
    .mockReset()
    .mockResolvedValue({ data: [], error: null });
  authClientMocks.linkSocial.mockReset().mockResolvedValue({ error: null });
  authClientMocks.unlinkAccount.mockReset().mockResolvedValue({ error: null });
  authClientMocks.signOut.mockReset().mockResolvedValue({ error: null });
  authClientMocks.updateUser.mockReset().mockResolvedValue({ error: null });
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// After each test, unstub all globals and restore all mocks to ensure a clean slate for the next test
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Tests for the Profile page
describe("Profile initial load", () => {
  it("shows LOADING PROFILE... before the fetch resolves", () => {
    render(<Profile />);
    expect(screen.getByText("LOADING PROFILE...")).toBeInTheDocument();
  });

  it("redirects to /login on a 401 response", async () => {
    render(<Profile />);
    await resolveProfile(null, 401);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("shows the RETRY error screen on a failed fetch", async () => {
    render(<Profile />);
    await resolveProfile(null, 500);
    expect(screen.getByText("Couldn't load profile")).toBeInTheDocument();
  });

  it("renders profile info and game stats once loaded", async () => {
    render(<Profile />);
    await resolveProfile(sampleProfile);

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("shows the NEED USERNAME banner when no username is assigned", async () => {
    render(<Profile />);
    await resolveProfile({ ...sampleProfile, username: "" });

    expect(screen.getByText("NEED USERNAME TO PLAY")).toBeInTheDocument();
    expect(screen.getByText("NOT ASSIGNED")).toBeInTheDocument();
  });

  it("shows the OAuth error banner when an error query param is present", async () => {
    mockSearchParams = new URLSearchParams({
      error: "account_already_linked_to_different_user",
    });
    render(<Profile />);
    await resolveProfile(sampleProfile);

    expect(
      screen.getByText(/Already Connected to Another User/),
    ).toBeInTheDocument();
  });
});

describe("Profile FIXED: submission time fields no longer crash on expand", () => {
  it("renders 'N/A' instead of crashing when a submission has a null executionTime", async () => {
    const badSubmission = makeSubmission({ executionTime: null });
    const badMatch = makeMatch({ submissions: [badSubmission] });
    render(<Profile />);
    await resolveProfile({ ...sampleProfile, matches: [badMatch] });

    const matchToggle = screen.getByText(/host: hostuser/).closest("button");

    expect(() => {
      fireEvent.click(matchToggle);
    }).not.toThrow();

    const execTimeLabel = screen.getByText("Exec Time");
    expect(execTimeLabel.nextElementSibling).toHaveTextContent("N/A");
  });

  it("renders 'N/A' instead of crashing when a submission has an undefined submissionTime", async () => {
    const badSubmission = makeSubmission({ submissionTime: undefined });
    const badMatch = makeMatch({ submissions: [badSubmission] });
    render(<Profile />);
    await resolveProfile({ ...sampleProfile, matches: [badMatch] });

    const matchToggle = screen.getByText(/host: hostuser/).closest("button");

    expect(() => {
      fireEvent.click(matchToggle);
    }).not.toThrow();

    const submitTimeLabel = screen.getByText("Submit Time");
    expect(submitTimeLabel.nextElementSibling).toHaveTextContent("N/A");
  });

  it("still shows real values normally when submission times are present", async () => {
    render(<Profile />);
    await resolveProfile(sampleProfile);

    const matchToggle = screen.getByText(/host: hostuser/).closest("button");
    fireEvent.click(matchToggle);

    expect(screen.getByText("12.35ms")).toBeInTheDocument();
    expect(screen.getByText("1.23s")).toBeInTheDocument();
    expect(screen.getByText("44.44ms")).toBeInTheDocument();
    expect(screen.getByText("5.56s")).toBeInTheDocument();
  });
});

describe("Profile match history", () => {
  it("shows 'No matches played yet.' when there are no matches", async () => {
    render(<Profile />);
    await resolveProfile({ ...sampleProfile, matches: [] });

    expect(screen.getByText("No matches played yet.")).toBeInTheDocument();
  });

  it("shows a SHOW MORE button only when there are more than 3 matches", async () => {
    render(<Profile />);
    await resolveProfile({
      ...sampleProfile,
      matches: [makeMatch({ id: "m1" }), makeMatch({ id: "m2" })],
    });

    expect(
      within(getMatchHistorySection()).queryByText("SHOW MORE"),
    ).not.toBeInTheDocument();
  });

  it("opens the ALL MATCHES modal and paginates via LOAD MORE", async () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ id: `m${i}`, host: { username: `host${i}` } }),
    );
    render(<Profile />);
    await resolveProfile({ ...sampleProfile, matches });

    clickShowMoreOnMatchHistory();
    expect(screen.getByText("ALL MATCHES")).toBeInTheDocument();
    expect(screen.getByText("LOAD MORE")).toBeInTheDocument();

    fireEvent.click(screen.getByText("LOAD MORE"));
    const extraMatches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ id: `m2-${i}`, host: { username: `host2-${i}` } }),
    );
    await resolveMatchHistory(extraMatches);

    expect(screen.getByText(/host: host2-0/)).toBeInTheDocument();
  });

  it("hides LOAD MORE once a short page indicates no more matches", async () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ id: `m${i}`, host: { username: `host${i}` } }),
    );
    render(<Profile />);
    await resolveProfile({ ...sampleProfile, matches });

    clickShowMoreOnMatchHistory();
    fireEvent.click(screen.getByText("LOAD MORE"));
    await resolveMatchHistory([
      makeMatch({ id: "last", host: { username: "lasthost" } }),
    ]);

    expect(screen.queryByText("LOAD MORE")).not.toBeInTheDocument();
  });

  it("reopening the modal after loading more still shows the full match list", async () => {
    const matches = Array.from({ length: 5 }, (_, i) =>
      makeMatch({ id: `m${i}`, host: { username: `host${i}` } }),
    );
    render(<Profile />);
    await resolveProfile({ ...sampleProfile, matches });

    clickShowMoreOnMatchHistory();
    fireEvent.click(screen.getByText("LOAD MORE"));
    await resolveMatchHistory([
      makeMatch({ id: "m5", host: { username: "host5" } }),
    ]);

    fireEvent.click(getModalCloseButton());
    clickShowMoreOnMatchHistory();

    expect(screen.getByText(/host: host5/)).toBeInTheDocument();
  });
});

describe("Profile language stats modal", () => {
  it("shows 'No submissions yet.' when languageStats is empty", async () => {
    render(<Profile />);
    await resolveProfile({
      ...sampleProfile,
      gameStats: { ...sampleProfile.gameStats, languageStats: [] },
    });

    fireEvent.click(screen.getByText("SHOW MORE"));
    expect(screen.getByText("No submissions yet.")).toBeInTheDocument();
  });

  it("shows an ALL summary card plus one card per language", async () => {
    render(<Profile />);
    await resolveProfile(sampleProfile);

    fireEvent.click(screen.getByText("SHOW MORE"));
    expect(screen.getByText("ALL")).toBeInTheDocument();
    expect(screen.getByText("PYTHON")).toBeInTheDocument();
  });
});

describe("Profile display name editing", () => {
  it("saves a new display name", async () => {
    render(<Profile />);
    await resolveProfile(sampleProfile);

    fireEvent.click(screen.getByText("EDIT"));
    const input = screen.getByDisplayValue("Alice");
    fireEvent.change(input, { target: { value: "NewName" } });
    fireEvent.click(screen.getByText("SAVE"));
    await flush();

    expect(authClientMocks.updateUser).toHaveBeenCalledWith({
      displayUsername: "NewName",
      name: "NewName",
    });
    expect(screen.getByText("NewName")).toBeInTheDocument();
  });

  it("shows an error and does not save when the display name is blank", async () => {
    render(<Profile />);
    await resolveProfile(sampleProfile);

    fireEvent.click(screen.getByText("EDIT"));
    fireEvent.change(screen.getByDisplayValue("Alice"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("SAVE"));
    await flush();

    expect(authClientMocks.updateUser).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Display name cannot be empty\./),
    ).toBeInTheDocument();
  });
});

describe("Profile linked accounts", () => {
  it("shows LINK for unlinked providers and UNLINK for linked ones", async () => {
    authClientMocks.listAccounts.mockResolvedValue({
      data: [{ providerId: "google" }],
      error: null,
    });
    render(<Profile />);
    await resolveProfile(sampleProfile);
    await flush();

    const googleRow = screen.getByText("Google Account").closest("div");
    expect(within(googleRow).getByText("UNLINK")).toBeInTheDocument();

    const githubRow = screen.getByText("GitHub Account").closest("div");
    expect(within(githubRow).getByText("LINK")).toBeInTheDocument();
  });

  it("disables UNLINK when it is the only linked account", async () => {
    authClientMocks.listAccounts.mockResolvedValue({
      data: [{ providerId: "google" }],
      error: null,
    });
    render(<Profile />);
    await resolveProfile(sampleProfile);
    await flush();

    const googleRow = screen.getByText("Google Account").closest("div");
    expect(within(googleRow).getByText("UNLINK")).toBeDisabled();
  });

  it("calls unlinkAccount and refreshes accounts when UNLINK is clicked with multiple linked", async () => {
    authClientMocks.listAccounts.mockResolvedValue({
      data: [{ providerId: "google" }, { providerId: "github" }],
      error: null,
    });
    render(<Profile />);
    await resolveProfile(sampleProfile);
    await flush();

    const googleRow = screen.getByText("Google Account").closest("div");
    fireEvent.click(within(googleRow).getByText("UNLINK"));
    await flush();

    expect(authClientMocks.unlinkAccount).toHaveBeenCalledWith({
      providerId: "google",
    });
    expect(authClientMocks.listAccounts).toHaveBeenCalledTimes(2);
  });
});

describe("Profile logout", () => {
  it("signs out, refreshes the socket connection, and navigates home", async () => {
    render(<Profile />);
    await resolveProfile(sampleProfile);

    fireEvent.click(screen.getByText("LOGOUT"));
    await flush();

    expect(authClientMocks.signOut).toHaveBeenCalled();
    expect(refreshSocketConnection).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows an error and stays on the page if sign out fails", async () => {
    authClientMocks.signOut.mockResolvedValue({
      error: { message: "Logout failed." },
    });
    render(<Profile />);
    await resolveProfile(sampleProfile);

    fireEvent.click(screen.getByText("LOGOUT"));
    await flush();

    expect(screen.getByText(/Logout failed\./)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith("/", { replace: true });
  });
});
