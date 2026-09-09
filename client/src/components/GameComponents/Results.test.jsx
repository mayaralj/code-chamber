// Imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Results from "./Results";

// Helper to create a mock result object with default values, allowing overrides for specific fields
const makeResult = (overrides = {}) => ({
  player: { username: "alice" },
  passed: true,
  testCasesPassed: 5,
  executionTime: 123.456,
  submitTime: 12,
  score: 100,
  ...overrides,
});

// Results layout and content tests
describe("Results layout", () => {
  it("renders the Round Results heading and column labels", () => {
    render(<Results results={[]} eliminatedPlayers={[]} />);

    expect(screen.getByText("Round Results")).toBeInTheDocument();
    ["Player", "Passed", "Tests", "Exec (ms)", "Submit (s)", "Score"].forEach(
      (label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      },
    );
  });
});

// Results player rows tests
describe("Results - player rows", () => {
  it("renders a row per result with username and score", () => {
    render(
      <Results
        results={[
          makeResult({ player: { username: "alice" }, score: 100 }),
          makeResult({ player: { username: "bob" }, score: 80 }),
        ]}
        eliminatedPlayers={[]}
      />,
    );

    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("shows 'Yes' in emerald for a passed result", () => {
    render(
      <Results
        results={[makeResult({ passed: true })]}
        eliminatedPlayers={[]}
      />,
    );

    const passed = screen.getByText("Yes");
    expect(passed).toHaveClass("text-emerald-400");
  });

  it("shows 'No' in rose for a failed result", () => {
    render(
      <Results
        results={[makeResult({ passed: false })]}
        eliminatedPlayers={[]}
      />,
    );

    const failed = screen.getByText("No");
    expect(failed).toHaveClass("text-rose-400");
  });

  it("rounds executionTime to the nearest whole number", () => {
    render(
      <Results
        results={[makeResult({ executionTime: 123.7 })]}
        eliminatedPlayers={[]}
      />,
    );

    expect(screen.getByText("124")).toBeInTheDocument();
  });

  it("renders 0 (not N/A) when executionTime is genuinely 0", () => {
    render(
      <Results
        results={[makeResult({ executionTime: 0 })]}
        eliminatedPlayers={[]}
      />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("N/A")).not.toBeInTheDocument();
  });

  it("shows N/A when executionTime is null", () => {
    render(
      <Results
        results={[makeResult({ executionTime: null })]}
        eliminatedPlayers={[]}
      />,
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("shows N/A when executionTime is undefined", () => {
    render(
      <Results
        results={[makeResult({ executionTime: undefined })]}
        eliminatedPlayers={[]}
      />,
    );

    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders testCasesPassed and submitTime even when undefined without crashing", () => {
    render(
      <Results
        results={[
          makeResult({ testCasesPassed: undefined, submitTime: undefined }),
        ]}
        eliminatedPlayers={[]}
      />,
    );

    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("renders no player rows when results is an empty array", () => {
    render(<Results results={[]} eliminatedPlayers={[]} />);

    expect(screen.queryByText(/Yes|No/)).not.toBeInTheDocument();
  });
});

// Results missed player, eliminated players, and winner tests
describe("Results missed player", () => {
  it("does not render the Missed Player section when missedPlayer is not provided", () => {
    render(<Results results={[]} eliminatedPlayers={[]} />);

    expect(screen.queryByText("Missed Player")).not.toBeInTheDocument();
  });

  it("renders the Missed Player section with the player's name", () => {
    render(
      <Results results={[]} eliminatedPlayers={[]} missedPlayer="carol" />,
    );

    expect(screen.getByText("Missed Player")).toBeInTheDocument();
    expect(screen.getByText("carol")).toBeInTheDocument();
  });
});
describe("Results eliminated players", () => {
  it("does not render the Eliminated section when eliminatedPlayers is empty", () => {
    render(<Results results={[]} eliminatedPlayers={[]} />);

    expect(screen.queryByText(/Eliminated/)).not.toBeInTheDocument();
  });

  it("uses singular 'Player Eliminated' for exactly one eliminated player", () => {
    render(<Results results={[]} eliminatedPlayers={["dave"]} />);

    expect(screen.getByText("Player Eliminated")).toBeInTheDocument();
    expect(screen.getByText("dave")).toBeInTheDocument();
  });

  it("uses plural 'Players Eliminated' for multiple eliminated players", () => {
    render(<Results results={[]} eliminatedPlayers={["dave", "erin"]} />);

    expect(screen.getByText("Players Eliminated")).toBeInTheDocument();
    expect(screen.getByText("dave")).toBeInTheDocument();
    expect(screen.getByText("erin")).toBeInTheDocument();
  });
});
describe("Results winner", () => {
  it("does not render the Winner section when winner is not provided", () => {
    render(<Results results={[]} eliminatedPlayers={[]} />);

    expect(screen.queryByText("Winner")).not.toBeInTheDocument();
  });

  it("renders the Winner section with the winner's name", () => {
    render(<Results results={[]} eliminatedPlayers={[]} winner="frank" />);

    expect(screen.getByText("Winner")).toBeInTheDocument();
    expect(screen.getByText("frank")).toBeInTheDocument();
  });

  it("can render Missed Player, Eliminated, and Winner sections simultaneously", () => {
    render(
      <Results
        results={[]}
        eliminatedPlayers={["dave"]}
        missedPlayer="carol"
        winner="frank"
      />,
    );

    expect(screen.getByText("Missed Player")).toBeInTheDocument();
    expect(screen.getByText("Player Eliminated")).toBeInTheDocument();
    expect(screen.getByText("Winner")).toBeInTheDocument();
  });
});
