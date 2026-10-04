// Imports
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GameNavbar from "./GameNavbar";

// Base props helper
const baseProps = (overrides = {}) => ({
  codeStatus: "not-submitted",
  onSubmit: vi.fn(),
  playerList: [],
  roundTimeLeft: 30,
  isReconnecting: false,
  difficulty: "easy",
  ...overrides,
});

// GameNavbar round timer tests
describe("GameNavbar round timer tests", () => {
  it("renders the current round time left", () => {
    render(<GameNavbar {...baseProps({ roundTimeLeft: 42 })} />);

    expect(screen.getByText("00:42")).toBeInTheDocument();
  });

  it("uses normal styling when time is not low", () => {
    render(<GameNavbar {...baseProps({ roundTimeLeft: 45 })} />);

    expect(screen.getByText("00:45")).toHaveClass("text-[#f7e7c8]");
  });

  it("uses low-time (pulsing rose) styling when 10 seconds or fewer remain", () => {
    render(<GameNavbar {...baseProps({ roundTimeLeft: 10 })} />);

    expect(screen.getByText("00:10")).toHaveClass("text-rose-400");
  });

  it("uses a distinct white style (not the pulsing low-time style) when time hits exactly 0", () => {
    render(<GameNavbar {...baseProps({ roundTimeLeft: 0 })} />);

    const timeEl = screen.getByText("00:00");
    expect(timeEl).toHaveClass("text-white/80");
    expect(timeEl).not.toHaveClass("text-rose-400");
  });

  it.each([[60, "01:00"], [65, "01:05"], [450, "07:30"], [600, "10:00"]])(
    "formats %s seconds as %s",
    (seconds, expected) => {
      render(<GameNavbar {...baseProps({ roundTimeLeft: seconds })} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
    },
  );
});

// GameNavbar submit button tests
describe("GameNavbar submit button tests", () => {
  it("shows Submit and is enabled when not-submitted and not reconnecting", () => {
    render(<GameNavbar {...baseProps({ codeStatus: "not-submitted" })} />);

    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toBeEnabled();
  });

  it("calls onSubmit when clicked while enabled", () => {
    const onSubmit = vi.fn();
    render(
      <GameNavbar {...baseProps({ codeStatus: "not-submitted", onSubmit })} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows Submitted and is disabled when codeStatus is submitted", () => {
    const onSubmit = vi.fn();
    render(
      <GameNavbar {...baseProps({ codeStatus: "submitted", onSubmit })} />,
    );

    const button = screen.getByRole("button", { name: "Submitted" });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows Judging... and is disabled when codeStatus is judging", () => {
    render(<GameNavbar {...baseProps({ codeStatus: "judging" })} />);

    expect(screen.getByRole("button", { name: "Judging..." })).toBeDisabled();
  });

  it("shows Reconnecting... and is disabled when isReconnecting is true", () => {
    render(
      <GameNavbar
        {...baseProps({ codeStatus: "not-submitted", isReconnecting: true })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Reconnecting..." }),
    ).toBeDisabled();
  });

  it("shows the spinner while judging", () => {
    const { container } = render(
      <GameNavbar {...baseProps({ codeStatus: "judging" })} />,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows the spinner while processing", () => {
    const { container } = render(
      <GameNavbar {...baseProps({ codeStatus: "processing" })} />,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not show the spinner when not-submitted or submitted", () => {
    const { container: notSubmitted } = render(
      <GameNavbar {...baseProps({ codeStatus: "not-submitted" })} />,
    );
    expect(notSubmitted.querySelector(".animate-spin")).not.toBeInTheDocument();

    const { container: submitted } = render(
      <GameNavbar {...baseProps({ codeStatus: "submitted" })} />,
    );
    expect(submitted.querySelector(".animate-spin")).not.toBeInTheDocument();
  });
});

// GameNavbar players dropdown tests
describe("GameNavbar players dropdown tests", () => {
  const players = [
    { username: "alice", codeStatus: "submitted" },
    { username: "bob", codeStatus: "judging" },
    { username: "carol", codeStatus: "not-submitted" },
  ];

  it("does not show the player list before the Players button is clicked", () => {
    render(<GameNavbar {...baseProps({ playerList: players })} />);

    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });

  it("opens the player list on click and shows the player count", () => {
    render(<GameNavbar {...baseProps({ playerList: players })} />);

    fireEvent.click(screen.getByRole("button", { name: "Players" }));

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("carol")).toBeInTheDocument();
  });

  it("shows the correct status label per player", () => {
    render(<GameNavbar {...baseProps({ playerList: players })} />);

    fireEvent.click(screen.getByRole("button", { name: "Players" }));

    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Judging")).toBeInTheDocument();
    expect(screen.getByText("Not Submitted")).toBeInTheDocument();
  });

  it("treats any non-submitted, non-judging status as Not Submitted (including processing)", () => {
    render(
      <GameNavbar
        {...baseProps({
          playerList: [{ username: "dave", codeStatus: "processing" }],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Players" }));

    expect(screen.getByText("Not Submitted")).toBeInTheDocument();
  });

  it("closes the dropdown when the Players button is clicked again", () => {
    render(<GameNavbar {...baseProps({ playerList: players })} />);

    const playersButton = screen.getByRole("button", { name: "Players" });
    fireEvent.click(playersButton);
    expect(screen.getByText("alice")).toBeInTheDocument();

    fireEvent.click(playersButton);
    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });

  it("closes the dropdown when clicking the overlay", () => {
    const { container } = render(
      <GameNavbar {...baseProps({ playerList: players })} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Players" }));
    expect(screen.getByText("alice")).toBeInTheDocument();

    fireEvent.click(container.querySelector(".fixed.inset-0.z-40"));
    expect(screen.queryByText("alice")).not.toBeInTheDocument();
  });
});
