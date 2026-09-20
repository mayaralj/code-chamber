// Imports
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { highlightWords } from "./questionHelpers";

// Highlight words used in the Question component for testing
const HIGHLIGHT_WORDS = ["example", "input", "output", "explanation"];

// Render the highlightWords function and return the container for querying
const renderHighlighted = (description) => {
  const { container } = render(
    <div>{highlightWords(description, HIGHLIGHT_WORDS)}</div>,
  );
  return container;
};

describe("highlightWords", () => {
  it("returns the description as-is when it is null", () => {
    expect(highlightWords(null, HIGHLIGHT_WORDS)).toBeNull();
  });

  it("returns the description as-is when it is undefined", () => {
    expect(highlightWords(undefined, HIGHLIGHT_WORDS)).toBeUndefined();
  });

  it("returns the description as-is when it is an empty string", () => {
    expect(highlightWords("", HIGHLIGHT_WORDS)).toBe("");
  });

  it("wraps a target word in the highlighted span styling", () => {
    const container = renderHighlighted("Given an input array");

    const highlighted = container.querySelector(
      ".font-medium.text-xl.text-zinc-100",
    );
    expect(highlighted).toBeInTheDocument();
    expect(highlighted).toHaveTextContent("input");
  });

  it("matches target words case-insensitively but preserves the original casing in the output", () => {
    const container = renderHighlighted("For Example, see the Output below");

    const highlighted = [
      ...container.querySelectorAll(".font-medium.text-xl.text-zinc-100"),
    ];
    const highlightedText = highlighted.map((el) => el.textContent);

    expect(highlightedText).toContain("Example");
    expect(highlightedText).toContain("Output");
  });

  it("does not highlight words that are not in the target list", () => {
    const container = renderHighlighted("Return the array unmodified");

    expect(
      container.querySelector(".font-medium.text-xl.text-zinc-100"),
    ).not.toBeInTheDocument();
  });

  it("does not highlight a target word as a substring inside a longer word", () => {
    const container = renderHighlighted("Two outputs are produced");

    const highlighted = container.querySelector(
      ".font-medium.text-xl.text-zinc-100",
    );
    expect(highlighted).not.toBeInTheDocument();
    expect(container).toHaveTextContent("Two outputs are produced");
  });

  it("highlights multiple distinct target words within the same description", () => {
    const container = renderHighlighted(
      "Example: given an input, return the output with an explanation",
    );

    const highlighted = [
      ...container.querySelectorAll(".font-medium.text-xl.text-zinc-100"),
    ].map((el) => el.textContent.toLowerCase());

    expect(highlighted).toEqual(
      expect.arrayContaining(["example", "input", "output", "explanation"]),
    );
  });

  it("preserves the full text content even when nothing matches", () => {
    const container = renderHighlighted(
      "Just a plain sentence with no matches",
    );

    expect(container).toHaveTextContent(
      "Just a plain sentence with no matches",
    );
  });
});
