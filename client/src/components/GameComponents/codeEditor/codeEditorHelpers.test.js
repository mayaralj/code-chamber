// Imports
import { describe, it, expect } from "vitest";
import {
  toJsonString,
  stripOuterBrackets,
  formatValueForDisplay,
} from "./codeEditorHelpers";

describe("formatValueForDisplay", () => {
  it("returns the literal string 'undefined' for an undefined value", () => {
    expect(formatValueForDisplay(undefined)).toBe("undefined");
  });

  it("returns the literal string 'null' for a null value", () => {
    expect(formatValueForDisplay(null)).toBe("null");
  });

  it("returns a plain string unchanged", () => {
    expect(formatValueForDisplay("hello world")).toBe("hello world");
  });

  it("stringifies numbers directly", () => {
    expect(formatValueForDisplay(42)).toBe("42");
  });

  it("stringifies arrays with a space after each comma", () => {
    expect(formatValueForDisplay([1, 2, 3])).toBe("[1, 2, 3]");
  });

  it("stringifies objects with a space after each comma", () => {
    expect(formatValueForDisplay({ a: 1, b: 2 })).toBe('{"a":1, "b":2}');
  });

  it("does not add a space after a comma inside a string value within an array", () => {
    expect(formatValueForDisplay(["a,b", "c"])).toBe('["a,b", "c"]');
  });
});

describe("toJsonString", () => {
  it("normalizes an already-valid JSON string and adds spacing after commas", () => {
    expect(toJsonString("[1,2,3]")).toBe("[1, 2, 3]");
  });

  it("wraps a plain non-JSON string in quotes", () => {
    expect(toJsonString("hello")).toBe('"hello"');
  });

  it("stringifies a non-string value directly", () => {
    expect(toJsonString([1, 2])).toBe("[1, 2]");
  });

  it("does not add a space after a comma inside a string literal", () => {
    expect(toJsonString('["a,b","c"]')).toBe('["a,b", "c"]');
  });

  it("correctly resumes comma-spacing after a value ending in one literal backslash", () => {
    // Regression test for the backslash-counting fix: a string ending in a
    // single literal backslash must not leave the parser stuck thinking
    // it's still inside a string literal.
    const input = JSON.stringify(["hello\\", 42]);
    expect(toJsonString(input)).toBe('["hello\\\\", 42]');
  });

  it("still treats a genuinely escaped quote as staying inside the string", () => {
    const input = JSON.stringify(['say "hi"', 42]);
    expect(toJsonString(input)).toBe('["say \\"hi\\"", 42]');
  });
});

describe("stripOuterBrackets", () => {
  it("strips outer array brackets and adds spacing", () => {
    expect(stripOuterBrackets("[1,2,3]")).toBe("1, 2, 3");
  });

  it("leaves a non-array value untouched (aside from spacing normalization)", () => {
    expect(stripOuterBrackets("hello")).toBe('"hello"');
  });

  it("does not strip inner brackets of nested arrays, only the outermost pair", () => {
    expect(stripOuterBrackets("[[1,2],[3,4]]")).toBe("[1, 2], [3, 4]");
  });

  it("returns an empty string for an empty array", () => {
    expect(stripOuterBrackets("[]")).toBe("");
  });

  it("returns undefined as-is (no crash) when input is undefined", () => {
    expect(stripOuterBrackets(undefined)).toBeUndefined();
  });

  it("returns null as-is (no crash) when input is null", () => {
    expect(stripOuterBrackets(null)).toBeNull();
  });
});
