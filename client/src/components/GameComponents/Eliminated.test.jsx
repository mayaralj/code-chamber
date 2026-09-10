// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Eliminated from "./Eliminated";

// Mocks
const navigateMock = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => navigateMock,
}));

// Helper to Advance the fake clock one second at a time so React has a chance to commit the state update and re-run the effect
const advanceSeconds = (seconds) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

// Before each test, use fake timers and clear the navigate mock to ensure a clean slate for each test
beforeEach(() => {
  vi.useFakeTimers();
  navigateMock.mockClear();
});

// After each test, restore real timers to avoid affecting other tests that may rely on real time
afterEach(() => {
  vi.useRealTimers();
});

// Tests for the Eliminated component
describe("Eliminated static content", () => {
  it("renders the elimination heading and message", () => {
    render(<Eliminated />);

    expect(screen.getByText("You've been eliminated")).toBeInTheDocument();
    expect(
      screen.getByText(/The match continues without you/i),
    ).toBeInTheDocument();
  });

  it("renders a Back to Browse button", () => {
    render(<Eliminated />);

    expect(
      screen.getByRole("button", { name: "Back to Browse" }),
    ).toBeInTheDocument();
  });
});

describe("Eliminated countdown", () => {
  it("starts the countdown at 20 seconds with a full-width progress bar", () => {
    const { container } = render(<Eliminated />);

    expect(screen.getByText("Redirecting in 20s")).toBeInTheDocument();
    const bar = container.querySelector('div[style*="width"]');
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("decrements the countdown by 1 every second", () => {
    render(<Eliminated />);

    advanceSeconds(1);
    expect(screen.getByText("Redirecting in 19s")).toBeInTheDocument();

    advanceSeconds(1);
    expect(screen.getByText("Redirecting in 18s")).toBeInTheDocument();
  });

  it("shrinks the progress bar width proportionally to time remaining", () => {
    const { container } = render(<Eliminated />);

    advanceSeconds(10);

    // 10 seconds left out of 20 -> 50%
    const bar = container.querySelector('div[style*="width"]');
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("does not navigate before the countdown reaches zero", () => {
    render(<Eliminated />);

    advanceSeconds(19);

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("automatically navigates to /browse once the countdown reaches zero", () => {
    render(<Eliminated />);

    advanceSeconds(20);

    expect(navigateMock).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("only triggers the auto-redirect navigation once", () => {
    render(<Eliminated />);

    advanceSeconds(20);
    expect(navigateMock).toHaveBeenCalledTimes(1);

    advanceSeconds(5);
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });
});

describe("Eliminated - manual navigation", () => {
  it("navigates to /browse immediately when Back to Browse is clicked", () => {
    render(<Eliminated />);

    fireEvent.click(screen.getByRole("button", { name: "Back to Browse" }));

    expect(navigateMock).toHaveBeenCalledWith("/browse", { replace: true });
  });

  it("does not wait for the countdown when the button is clicked early", () => {
    render(<Eliminated />);

    advanceSeconds(3);
    navigateMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Back to Browse" }));

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/browse", { replace: true });
  });
});
