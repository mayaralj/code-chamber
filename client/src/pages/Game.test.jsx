// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Game from "./Game";

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
vi.mock("../socket", async () => {
  const { createSocketMock } = await import("../test/socketMock");
  return { socket: createSocketMock() };
});

// Imports after mocks
import { socket as fakeSocket } from "../socket";

// Hook mocks
const hookMocks = {
  usePlayer: vi.fn(),
  usePlayerList: vi.fn(),
  useCountdownTimer: vi.fn(),
  useRoundTimer: vi.fn(),
  useCodeSubmission: vi.fn(),
  useGameQuestion: vi.fn(),
  useCodeEditor: vi.fn(),
  useRoundEvents: vi.fn(),
  useResults: vi.fn(),
  useStatusEvents: vi.fn(),
  usePlayerLeave: vi.fn(),
  useResizableSplit: vi.fn(),
  useReconnection: vi.fn(),
  useDisconnection: vi.fn(),
};

// Mock the hooks used in Game.jsx to return the corresponding mock functions from hookMocks
vi.mock("../hooks/usePlayer", () => ({ default: () => hookMocks.usePlayer() }));
vi.mock("../hooks/gameHooks/usePlayerList", () => ({
  default: (...args) => hookMocks.usePlayerList(...args),
}));
vi.mock("../hooks/gameHooks/useCountdownTimer", () => ({
  default: (...args) => hookMocks.useCountdownTimer(...args),
}));
vi.mock("../hooks/gameHooks/useRoundTimer", () => ({
  default: (...args) => hookMocks.useRoundTimer(...args),
}));
vi.mock("../hooks/gameHooks/useCodeSubmission", () => ({
  default: (...args) => hookMocks.useCodeSubmission(...args),
}));
vi.mock("../hooks/gameHooks/useGameQuestion", () => ({
  default: (...args) => hookMocks.useGameQuestion(...args),
}));
vi.mock("../hooks/gameHooks/useCodeEditor", () => ({
  default: (...args) => hookMocks.useCodeEditor(...args),
}));
vi.mock("../hooks/gameHooks/useRoundEvents", () => ({
  default: (...args) => hookMocks.useRoundEvents(...args),
}));
vi.mock("../hooks/gameHooks/useResults", () => ({
  default: (...args) => hookMocks.useResults(...args),
}));
vi.mock("../hooks/gameHooks/useStatusEvents", () => ({
  default: (...args) => hookMocks.useStatusEvents(...args),
}));
vi.mock("../hooks/gameHooks/usePlayerLeave", () => ({
  default: (...args) => hookMocks.usePlayerLeave(...args),
}));
vi.mock("../hooks/gameHooks/useResizableSplit", () => ({
  default: (...args) => hookMocks.useResizableSplit(...args),
}));
vi.mock("../hooks/gameHooks/useReconnection", () => ({
  default: (...args) => hookMocks.useReconnection(...args),
}));
vi.mock("../hooks/gameHooks/useDisconnection", () => ({
  default: (...args) => hookMocks.useDisconnection(...args),
}));

// Mock child components to simplify testing and focus on Game's behavior
vi.mock("../components/gameComponents/question/Question", () => ({
  default: ({ question }) => (
    <div data-testid="question">
      {question ? question.title : "no-question"}
    </div>
  ),
}));
vi.mock("../components/gameComponents/codeEditor/CodeEditor", () => ({
  default: ({ onMount, language }) => {
    return (
      <div data-testid="code-editor">
        <span data-testid="editor-language">{language}</span>
        <button data-testid="fire-editor-mount" onClick={onMount}>
          mount
        </button>
      </div>
    );
  },
}));
vi.mock("../components/gameComponents/Timer", () => ({
  default: ({ timeLeft, currentRound }) => (
    <div data-testid="timer">
      timer:{timeLeft}:{currentRound}
    </div>
  ),
}));
vi.mock("../components/gameComponents/Results", () => ({
  default: ({ winner }) => (
    <div data-testid="results">winner:{winner || "none"}</div>
  ),
}));
vi.mock("../components/gameComponents/GameNavbar", () => ({
  default: ({ codeStatus, roundTimeLeft, isReconnecting }) => (
    <div data-testid="game-navbar">
      {codeStatus}:{roundTimeLeft}:{isReconnecting ? "reconnecting" : "stable"}
    </div>
  ),
}));
vi.mock("../components/gameComponents/GameStatusBar", () => ({
  default: ({ currentRound }) => (
    <div data-testid="game-status-bar">round:{currentRound}</div>
  ),
}));
vi.mock("../components/gameComponents/Eliminated", () => ({
  default: () => <div data-testid="eliminated-screen">ELIMINATED</div>,
}));
vi.mock("../components/gameComponents/Missed", () => ({
  default: ({ setMissed }) => (
    <button data-testid="missed-screen" onClick={() => setMissed(false)}>
      MISSED
    </button>
  ),
}));

// Helper to render the Game component with default mock params and location state
const defaultLocationState = {
  players: [{ username: "hostuser" }],
  endsAt: 1000,
  question: { id: "q1", title: "Two Sum" },
  beforeRoundEvents: [],
  roundEndsAt: 2000,
  timeMultiplier: 1,
};

// Helper to render the Game component with default mock params and location state
const setupDefaultHooks = () => {
  hookMocks.usePlayer.mockReturnValue({ connectionStatus: "connected" });
  hookMocks.usePlayerList.mockReturnValue({
    playerList: defaultLocationState.players,
    setPlayerList: vi.fn(),
  });
  hookMocks.useCountdownTimer.mockReturnValue({
    timeLeft: 10,
    timerFinished: false,
    setTimerFinished: vi.fn(),
    setTimerEndsAt: vi.fn(),
  });
  hookMocks.useRoundTimer.mockReturnValue({
    roundTimeLeft: 30,
    currentRound: 1,
    setCurrentRound: vi.fn(),
    setRoundEndsAt: vi.fn(),
    setTimeMultiplier: vi.fn(),
  });
  hookMocks.useCodeSubmission.mockReturnValue({
    handleCodeChange: vi.fn(),
    codeStatus: "idle",
    setCodeStatus: vi.fn(),
    language: "python",
    handleSubmit: vi.fn(),
    handleLanguageChange: vi.fn(),
    testCasesResults: [],
  });
  hookMocks.useGameQuestion.mockReturnValue({
    question: defaultLocationState.question,
    setQuestion: vi.fn(),
    starterCode: "",
    setStarterCode: vi.fn(),
  });
  hookMocks.useCodeEditor.mockReturnValue({
    editorReady: true,
    setEditorReady: vi.fn(),
  });
  hookMocks.useRoundEvents.mockReturnValue({
    beforeRoundEvents: [],
    setBeforeRoundEvents: vi.fn(),
  });
  hookMocks.useResults.mockReturnValue({
    results: [],
    setResults: vi.fn(),
    resultsReady: false,
    setResultsReady: vi.fn(),
    eliminatedPlayers: [],
    setEliminatedPlayers: vi.fn(),
    setMissedPlayer: vi.fn(),
    missedPlayer: null,
    isMissed: false,
    setIsMissed: vi.fn(),
    winner: null,
    setWinner: vi.fn(),
  });
  hookMocks.useStatusEvents.mockReturnValue({ statusEvents: [] });
  hookMocks.usePlayerLeave.mockReturnValue({ isEliminated: false });
  hookMocks.useResizableSplit.mockReturnValue({
    containerRef: { current: null },
    size: 38,
    handleDragStart: vi.fn(),
  });
  hookMocks.useReconnection.mockReturnValue(undefined);
  hookMocks.useDisconnection.mockReturnValue(undefined);
};

// beforeEach and afterEach to reset mocks and set up default hook return values
beforeEach(() => {
  mockParams = { code: "ABCD" };
  mockLocation = { state: { ...defaultLocationState } };
  mockNavigate.mockClear();
  toastMocks.error.mockClear();
  fakeSocket.__reset();
  Object.values(hookMocks).forEach((mockFn) => mockFn.mockReset());
  setupDefaultHooks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Game page tests
describe("Game access guards", () => {
  it("redirects to /browse and renders nothing if location.state is missing", () => {
    mockLocation = { state: null };
    const { container } = render(<Game />);

    expect(toastMocks.error).toHaveBeenCalledWith("Invalid game state");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Game check-player-response handling", () => {
  it("emits check-player on mount with the room code", () => {
    render(<Game />);
    expect(fakeSocket.emit).toHaveBeenCalledWith("check-player", {
      code: "ABCD",
    });
  });

  it("redirects to /browse when the server reports the player is invalid", () => {
    render(<Game />);

    act(() => {
      fakeSocket.__trigger("check-player-response", {
        valid: false,
        message: "Not in this game",
      });
    });

    expect(toastMocks.error).toHaveBeenCalledWith("Not in this game");
    expect(mockNavigate).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("does not navigate when the server reports the player is valid", () => {
    render(<Game />);

    act(() => {
      fakeSocket.__trigger("check-player-response", {
        valid: true,
        message: "",
      });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("removes the check-player-response listener on unmount", () => {
    const { unmount } = render(<Game />);
    expect(fakeSocket.__listenerCount("check-player-response")).toBe(1);

    unmount();

    expect(fakeSocket.__listenerCount("check-player-response")).toBe(0);
  });
});

describe("Game elimination / missed branching", () => {
  it("renders the Eliminated screen when isEliminated is true, instead of the game UI", () => {
    hookMocks.usePlayerLeave.mockReturnValue({ isEliminated: true });
    render(<Game />);

    expect(screen.getByTestId("eliminated-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
  });

  it("renders the Missed screen when isMissed is true, instead of the game UI", () => {
    hookMocks.useResults.mockReturnValue({
      results: [],
      setResults: vi.fn(),
      resultsReady: false,
      setResultsReady: vi.fn(),
      eliminatedPlayers: [],
      setEliminatedPlayers: vi.fn(),
      setMissedPlayer: vi.fn(),
      missedPlayer: { username: "someone" },
      isMissed: true,
      setIsMissed: vi.fn(),
      winner: null,
      setWinner: vi.fn(),
    });
    render(<Game />);

    expect(screen.getByTestId("missed-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
  });

  it("prioritizes Eliminated over Missed if both are somehow true", () => {
    hookMocks.usePlayerLeave.mockReturnValue({ isEliminated: true });
    hookMocks.useResults.mockReturnValue({
      results: [],
      setResults: vi.fn(),
      resultsReady: false,
      setResultsReady: vi.fn(),
      eliminatedPlayers: [],
      setEliminatedPlayers: vi.fn(),
      setMissedPlayer: vi.fn(),
      missedPlayer: null,
      isMissed: true,
      setIsMissed: vi.fn(),
      winner: null,
      setWinner: vi.fn(),
    });
    render(<Game />);

    expect(screen.getByTestId("eliminated-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("missed-screen")).not.toBeInTheDocument();
  });

  it("calls setIsMissed(false) when dismissing the Missed screen", () => {
    const setIsMissed = vi.fn();
    hookMocks.useResults.mockReturnValue({
      results: [],
      setResults: vi.fn(),
      resultsReady: false,
      setResultsReady: vi.fn(),
      eliminatedPlayers: [],
      setEliminatedPlayers: vi.fn(),
      setMissedPlayer: vi.fn(),
      missedPlayer: { username: "someone" },
      isMissed: true,
      setIsMissed,
      winner: null,
      setWinner: vi.fn(),
    });
    render(<Game />);

    screen.getByTestId("missed-screen").click();
    expect(setIsMissed).toHaveBeenCalledWith(false);
  });
});

describe("Game timer / editor visibility", () => {
  it("shows the Timer and hides the editor block while the countdown is still running", () => {
    hookMocks.useCountdownTimer.mockReturnValue({
      timeLeft: 5,
      timerFinished: false,
      setTimerFinished: vi.fn(),
      setTimerEndsAt: vi.fn(),
    });
    render(<Game />);

    expect(screen.getByTestId("timer")).toBeInTheDocument();
    const editorBlock = screen
      .getByTestId("code-editor")
      .closest("div.hidden, div.flex");
    expect(editorBlock.className).toContain("hidden");
  });

  it("keeps showing the Timer if the countdown finished but the editor is not yet mounted", () => {
    hookMocks.useCountdownTimer.mockReturnValue({
      timeLeft: 0,
      timerFinished: true,
      setTimerFinished: vi.fn(),
      setTimerEndsAt: vi.fn(),
    });
    hookMocks.useCodeEditor.mockReturnValue({
      editorReady: false,
      setEditorReady: vi.fn(),
    });
    render(<Game />);

    expect(screen.getByTestId("timer")).toBeInTheDocument();
  });

  it("keeps showing the Timer if the countdown and editor are ready but the question hasn't loaded", () => {
    hookMocks.useCountdownTimer.mockReturnValue({
      timeLeft: 0,
      timerFinished: true,
      setTimerFinished: vi.fn(),
      setTimerEndsAt: vi.fn(),
    });
    hookMocks.useGameQuestion.mockReturnValue({
      question: null,
      setQuestion: vi.fn(),
      starterCode: "",
      setStarterCode: vi.fn(),
    });
    render(<Game />);

    expect(screen.getByTestId("timer")).toBeInTheDocument();
  });

  it("hides the Timer and shows the visible editor once timer finished, editor ready, and question loaded", () => {
    hookMocks.useCountdownTimer.mockReturnValue({
      timeLeft: 0,
      timerFinished: true,
      setTimerFinished: vi.fn(),
      setTimerEndsAt: vi.fn(),
    });
    render(<Game />);

    expect(screen.queryByTestId("timer")).not.toBeInTheDocument();
    const editorBlock = screen
      .getByTestId("code-editor")
      .closest("div.hidden, div.flex");
    expect(editorBlock.className).toContain("flex");
  });
});

describe("Game prop wiring to child components", () => {
  beforeEach(() => {
    hookMocks.useCountdownTimer.mockReturnValue({
      timeLeft: 0,
      timerFinished: true,
      setTimerFinished: vi.fn(),
      setTimerEndsAt: vi.fn(),
    });
  });

  it("passes the question down to the Question component", () => {
    render(<Game />);
    expect(screen.getByTestId("question")).toHaveTextContent("Two Sum");
  });

  it("passes codeStatus and roundTimeLeft down to GameNavbar", () => {
    hookMocks.useCodeSubmission.mockReturnValue({
      handleCodeChange: vi.fn(),
      codeStatus: "submitting",
      setCodeStatus: vi.fn(),
      language: "python",
      handleSubmit: vi.fn(),
      handleLanguageChange: vi.fn(),
      testCasesResults: [],
    });
    hookMocks.useRoundTimer.mockReturnValue({
      roundTimeLeft: 42,
      currentRound: 2,
      setCurrentRound: vi.fn(),
      setRoundEndsAt: vi.fn(),
      setTimeMultiplier: vi.fn(),
    });
    render(<Game />);

    expect(screen.getByTestId("game-navbar")).toHaveTextContent(
      "submitting:42:stable",
    );
  });

  it("marks GameNavbar as reconnecting when connectionStatus is 'reconnecting'", () => {
    hookMocks.usePlayer.mockReturnValue({ connectionStatus: "reconnecting" });
    render(<Game />);

    expect(screen.getByTestId("game-navbar")).toHaveTextContent("reconnecting");
  });

  it("sets editorReady via CodeEditor's onMount callback", () => {
    const setEditorReady = vi.fn();
    hookMocks.useCodeEditor.mockReturnValue({
      editorReady: false,
      setEditorReady,
    });
    render(<Game />);

    screen.getByTestId("fire-editor-mount").click();
    expect(setEditorReady).toHaveBeenCalledWith(true);
  });

  it("shows Results only when resultsReady is true", () => {
    render(<Game />);
    expect(screen.queryByTestId("results")).not.toBeInTheDocument();

    hookMocks.useResults.mockReturnValue({
      results: [{ username: "hostuser", passed: true }],
      setResults: vi.fn(),
      resultsReady: true,
      setResultsReady: vi.fn(),
      eliminatedPlayers: [],
      setEliminatedPlayers: vi.fn(),
      setMissedPlayer: vi.fn(),
      missedPlayer: null,
      isMissed: false,
      setIsMissed: vi.fn(),
      winner: "hostuser",
      setWinner: vi.fn(),
    });
    render(<Game />);
    expect(screen.getByTestId("results")).toHaveTextContent("winner:hostuser");
  });

  it("passes currentRound down to GameStatusBar", () => {
    hookMocks.useRoundTimer.mockReturnValue({
      roundTimeLeft: 15,
      currentRound: 3,
      setCurrentRound: vi.fn(),
      setRoundEndsAt: vi.fn(),
      setTimeMultiplier: vi.fn(),
    });
    render(<Game />);

    expect(screen.getByTestId("game-status-bar")).toHaveTextContent("round:3");
  });
});

describe("Game remount on room code change", () => {
  it("remounts GameInner (fresh hook calls) when the route's code param changes", () => {
    const { rerender } = render(<Game />);
    const initialCallCount = hookMocks.usePlayerList.mock.calls.length;

    mockParams = { code: "WXYZ" };
    mockLocation = { state: { ...defaultLocationState } };
    rerender(<Game />);

    expect(hookMocks.usePlayerList.mock.calls.length).toBeGreaterThan(
      initialCallCount,
    );
    expect(fakeSocket.emit).toHaveBeenCalledWith("check-player", {
      code: "WXYZ",
    });
  });
});
