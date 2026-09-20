// Imports
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Question from "./Question";

describe("Question", () => {
  it("renders the Question section label", () => {
    render(<Question question={{ title: "Two Sum" }} />);

    expect(screen.getByText("Question")).toBeInTheDocument();
  });

  it("renders the question title", () => {
    render(<Question question={{ title: "Two Sum" }} />);

    expect(
      screen.getByRole("heading", { name: "Two Sum" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["easy", "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"],
    ["medium", "border-[#ffd687]/30 bg-[#ffd687]/10 text-[#ffd687]"],
    ["hard", "border-rose-500/30 bg-rose-500/10 text-rose-400"],
  ])(
    "applies the correct badge style for '%s' difficulty",
    (difficulty, expectedClass) => {
      render(<Question question={{ title: "Two Sum", difficulty }} />);

      const badge = screen.getByText(difficulty);
      expectedClass.split(" ").forEach((cls) => {
        expect(badge).toHaveClass(cls);
      });
    },
  );

  it("matches difficulty case-insensitively", () => {
    render(<Question question={{ title: "Two Sum", difficulty: "EASY" }} />);

    const badge = screen.getByText("EASY");
    expect(badge).toHaveClass("text-emerald-400");
  });

  it("falls back to the neutral style for an unrecognized difficulty", () => {
    render(
      <Question question={{ title: "Two Sum", difficulty: "impossible" }} />,
    );

    const badge = screen.getByText("impossible");
    expect(badge).toHaveClass(
      "border-zinc-700",
      "bg-zinc-800",
      "text-zinc-400",
    );
  });

  it("does not render a difficulty badge when difficulty is missing", () => {
    render(<Question question={{ title: "Two Sum" }} />);

    expect(screen.queryByText(/easy|medium|hard/i)).not.toBeInTheDocument();
  });

  it("renders the question description with target words highlighted", () => {
    render(
      <Question
        question={{
          title: "Two Sum",
          description:
            "Given an array of integers and a target, return the output.",
        }}
      />,
    );

    const highlighted = screen.getByText("output");
    expect(highlighted).toHaveClass("font-medium", "text-xl", "text-zinc-100");
  });

  it("does not crash when question is undefined", () => {
    expect(() => render(<Question question={undefined} />)).not.toThrow();
  });

  it("does not crash and renders no title when question is null", () => {
    render(<Question question={null} />);

    expect(screen.getByText("Question")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toHaveTextContent(/.+/);
  });

  it("renders nothing extra when description is missing", () => {
    render(<Question question={{ title: "Two Sum" }} />);

    // Just confirms no crash and the paragraph renders empty rather than
    // throwing -- highlightWords(undefined, [...]) returns undefined.
    expect(
      screen.getByRole("heading", { name: "Two Sum" }),
    ).toBeInTheDocument();
  });
});
