// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Missed from "./Missed";

// advanceSeconds helper
const advanceSeconds = (seconds) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

// Before each test, use fake timers to control the countdown behavior
beforeEach(() => {
  vi.useFakeTimers();
});

// After each test, restore real timers to avoid affecting other tests that may rely on real time
afterEach(() => {
  vi.useRealTimers();
});

// Tests for the Missed component
describe("Missed static content", () => {
  it("renders the spared message", () => {
    render(<Missed setMissed={vi.fn()} />);

    expect(screen.getByText("You've been spared.")).toBeInTheDocument();
    expect(
      screen.getByText("The match continues with you."),
    ).toBeInTheDocument();
  });

  it("starts with the fade-in animation and not the fade-out animation", () => {
    render(<Missed setMissed={vi.fn()} />);

    const card = screen.getByText("You've been spared.").parentElement;
    expect(card.className).toContain("missed-fade-in");
    expect(card.className).not.toContain("missed-fade-out");
  });
});

describe("Missed countdown and exit transition", () => {
  it("still shows the fade-in animation before the countdown reaches zero", () => {
    render(<Missed setMissed={vi.fn()} />);

    advanceSeconds(3);

    const card = screen.getByText("You've been spared.").parentElement;
    expect(card.className).toContain("missed-fade-in");
  });

  it("switches to the fade-out animation once the countdown reaches zero", () => {
    render(<Missed setMissed={vi.fn()} />);

    advanceSeconds(4);

    const card = screen.getByText("You've been spared.").parentElement;
    expect(card.className).toContain("missed-fade-out");
    expect(card.className).not.toContain("missed-fade-in");
  });

  it("does not call setMissed just from the countdown reaching zero", () => {
    const setMissed = vi.fn();
    render(<Missed setMissed={setMissed} />);

    advanceSeconds(4);

    expect(setMissed).not.toHaveBeenCalled();
  });
});
