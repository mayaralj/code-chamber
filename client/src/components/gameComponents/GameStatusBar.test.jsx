// Imports
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import GameStatusBar from "./GameStatusBar";

// Helper to create a mock event object
const makeEvent = (type, message) => ({ type, message });

// Helper to scope queries to just the open history panel, since the newest history item's message is always duplicated in the latest-event banner.
const getHistoryPanel = () => screen.getByText("Recent Updates").closest("div");

// GameStatusBar round display tests
describe("GameStatusBar round display tests", () => {
  it("renders the current round number", () => {
    render(<GameStatusBar currentRound={3} events={[]} />);

    expect(screen.getByText("Round 3")).toBeInTheDocument();
  });
});

// GameStatusBar latest event banner tests
describe("GameStatusBar latest event banner tests", () => {
  it("shows 'No updates yet' when events is empty", () => {
    render(<GameStatusBar currentRound={1} events={[]} />);

    expect(screen.getByText("No updates yet")).toBeInTheDocument();
  });

  it("shows 'No updates yet' when events prop is omitted (default)", () => {
    render(<GameStatusBar currentRound={1} />);

    expect(screen.getByText("No updates yet")).toBeInTheDocument();
  });

  it("displays the message of the most recently pushed event, not the first", () => {
    render(
      <GameStatusBar
        currentRound={1}
        events={[
          makeEvent("round", "Round 1 started"),
          makeEvent("submitted", "alice submitted"),
        ]}
      />,
    );

    expect(screen.getByText("alice submitted")).toBeInTheDocument();
    expect(screen.queryByText("Round 1 started")).not.toBeInTheDocument();
  });

  it.each([
    ["eliminated", "text-rose-400"],
    ["disconnected", "text-rose-400"],
    ["missed", "text-[#ffd687]"],
    ["submitted", "text-emerald-400"],
    ["round", "text-zinc-400"],
    ["game", "text-[#ffd687]"],
    ["round-event", "text-[#ffd687]"],
  ])(
    "applies the correct icon color for a latest event of type '%s'",
    (type, expectedClass) => {
      render(
        <GameStatusBar
          currentRound={1}
          events={[makeEvent(type, "some message")]}
        />,
      );

      const message = screen.getByText("some message");
      const icon = message.previousElementSibling;
      expect(icon).toHaveClass(expectedClass);
    },
  );

  it("falls back to the Flag icon and neutral color for an unrecognized event type", () => {
    render(
      <GameStatusBar
        currentRound={1}
        events={[makeEvent("mysteryEvent", "something happened")]}
      />,
    );

    const message = screen.getByText("something happened");
    expect(message.previousElementSibling).toHaveClass("text-zinc-400");
  });
});

// GameStatusBar history dropdown tests
describe("GameStatusBar history dropdown tests", () => {
  it("does not show the history panel before the History button is clicked", () => {
    render(
      <GameStatusBar
        currentRound={1}
        events={[makeEvent("round", "Round 1 started")]}
      />,
    );

    expect(screen.queryByText("Recent Updates")).not.toBeInTheDocument();
  });

  it("opens the history panel on click", () => {
    render(
      <GameStatusBar
        currentRound={1}
        events={[makeEvent("round", "Round 1 started")]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /History/i }));

    expect(screen.getByText("Recent Updates")).toBeInTheDocument();
  });

  it("shows the empty-state message when there are no events", () => {
    render(<GameStatusBar currentRound={1} events={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /History/i }));

    expect(screen.getByText("Nothing has happened yet.")).toBeInTheDocument();
  });

  it("lists events in most-recent-first order", () => {
    render(
      <GameStatusBar
        currentRound={1}
        events={[
          makeEvent("round", "first event"),
          makeEvent("submitted", "second event"),
          makeEvent("eliminated", "third event"),
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /History/i }));

    const panel = getHistoryPanel();
    const rows = within(panel)
      .getAllByText(/event$/)
      .map((el) => el.textContent);
    expect(rows).toEqual(["third event", "second event", "first event"]);
  });

  it("caps the history list at MAX_HISTORY_EVENTS (8) most recent events", () => {
    const events = Array.from({ length: 12 }, (_, i) =>
      makeEvent("round", `event ${i}`),
    );

    render(<GameStatusBar currentRound={1} events={events} />);

    fireEvent.click(screen.getByRole("button", { name: /History/i }));

    const panel = getHistoryPanel();
    const rows = within(panel).getAllByText(/^event \d+$/);
    expect(rows).toHaveLength(8);
    // Most recent 8 (event 4 through event 11), newest first
    expect(rows.map((r) => r.textContent)).toEqual([
      "event 11",
      "event 10",
      "event 9",
      "event 8",
      "event 7",
      "event 6",
      "event 5",
      "event 4",
    ]);
  });

  it("closes the history panel when the History button is clicked again", () => {
    render(
      <GameStatusBar
        currentRound={1}
        events={[makeEvent("round", "Round 1 started")]}
      />,
    );

    const historyButton = screen.getByRole("button", { name: /History/i });
    fireEvent.click(historyButton);
    expect(screen.getByText("Recent Updates")).toBeInTheDocument();

    fireEvent.click(historyButton);
    expect(screen.queryByText("Recent Updates")).not.toBeInTheDocument();
  });

  it("closes the history panel when clicking the overlay", () => {
    const { container } = render(
      <GameStatusBar
        currentRound={1}
        events={[makeEvent("round", "Round 1 started")]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /History/i }));
    expect(screen.getByText("Recent Updates")).toBeInTheDocument();

    fireEvent.click(container.querySelector(".fixed.inset-0.z-40"));
    expect(screen.queryByText("Recent Updates")).not.toBeInTheDocument();
  });

  it("falls back to the Flag icon for an unrecognized event type in the history list", () => {
    render(
      <GameStatusBar
        currentRound={1}
        events={[makeEvent("mysteryEvent", "weird history item")]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /History/i }));

    const panel = getHistoryPanel();
    const message = within(panel).getByText("weird history item");
    expect(message.previousElementSibling).toHaveClass("text-zinc-400");
  });
});
