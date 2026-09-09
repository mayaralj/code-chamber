// Imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Timer from "./Timer";

// Timer basic display tests
describe("Timer basic display tests", () => {
  it("renders the current round number", () => {
    render(<Timer timeLeft={30} currentRound={2} />);

    expect(screen.getByText("Round 2")).toBeInTheDocument();
  });

  it("renders the time left", () => {
    render(<Timer timeLeft={17} currentRound={1} />);

    expect(screen.getByText("17")).toBeInTheDocument();
  });

  it("does not render the Bonus Events section when beforeRoundEvents is not provided", () => {
    render(<Timer timeLeft={30} currentRound={1} />);

    expect(screen.queryByText("Bonus Events")).not.toBeInTheDocument();
  });

  it("does not render the Bonus Events section when beforeRoundEvents is null", () => {
    render(<Timer timeLeft={30} currentRound={1} beforeRoundEvents={null} />);

    expect(screen.queryByText("Bonus Events")).not.toBeInTheDocument();
  });
});

// Timer bonus events tests
describe("Timer bonus events tests", () => {
  it("renders the readable label for fasterTimer", () => {
    render(
      <Timer
        timeLeft={30}
        currentRound={1}
        beforeRoundEvents={{ fasterTimer: true }}
      />,
    );

    expect(screen.getByText("Bonus Events")).toBeInTheDocument();
    expect(screen.getByText("Faster Timer")).toBeInTheDocument();
  });

  it("renders the readable label for doubleElimination", () => {
    render(
      <Timer
        timeLeft={30}
        currentRound={1}
        beforeRoundEvents={{ doubleElimination: true }}
      />,
    );

    expect(screen.getByText("Double Elimination")).toBeInTheDocument();
  });

  it("renders a label for each active event when multiple are present", () => {
    render(
      <Timer
        timeLeft={30}
        currentRound={1}
        beforeRoundEvents={{ fasterTimer: true, doubleElimination: true }}
      />,
    );

    expect(screen.getByText("Faster Timer")).toBeInTheDocument();
    expect(screen.getByText("Double Elimination")).toBeInTheDocument();
  });
});
