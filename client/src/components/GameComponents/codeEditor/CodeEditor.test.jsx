// Imports
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CodeEditor from "./CodeEditor.jsx";
import { createLocalStorageMock } from "../../../test/localStorageMock";
import { monacoMockState } from "./monacoMockState";

// mock monaco editor with a custom mock that simulates behaviors needed for testing
vi.mock("@monaco-editor/react", async () => {
  const { default: MockEditor } = await import("./monacoEditorMock.jsx");
  return { default: MockEditor };
});

// base starter_code for each language
const STARTER_CODE = {
  javascript: "// js starter",
  python: "# py starter",
  cpp: "// cpp starter",
};

// baseProps method with default props for CodeEditor, allowing overrides for specific tests. This helps keep tests simple and focused on the specific behavior being tested.
const baseProps = (overrides = {}) => ({
  onChange: vi.fn(),
  codeStatus: "not-submitted",
  language: "javascript",
  onLanguageChange: vi.fn(),
  onMount: vi.fn(),
  starterCode: STARTER_CODE,
  testCasesResults: null,
  ...overrides,
});

// beforeEach create localStorage mock, clear all mocks, and reset monacoMockState to ensure a clean slate for each test.
beforeEach(() => {
  vi.stubGlobal("localStorage", createLocalStorageMock());
  vi.clearAllMocks();
  monacoMockState.reset();
});

// afterEach unstub all globals and reset monacoMockState to clean up after each test, ensuring no state leaks between tests.
afterEach(() => {
  vi.unstubAllGlobals();
  monacoMockState.reset();
});

// CodeEditor basic rendering tests
describe("CodeEditor basic rendering", () => {
  it("renders the Code and Output section labels", () => {
    render(<CodeEditor {...baseProps()} />);

    expect(screen.getByText("Code")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("shows the current language on the language toggle button", () => {
    render(<CodeEditor {...baseProps({ language: "python" })} />);

    expect(screen.getByRole("button", { name: "Python" })).toBeInTheDocument();
  });

  it("shows Idle by default and Running... while judging", () => {
    const { rerender } = render(<CodeEditor {...baseProps()} />);
    expect(screen.getByText("Idle")).toBeInTheDocument();

    rerender(<CodeEditor {...baseProps({ codeStatus: "judging" })} />);
    expect(screen.getByText("Running...")).toBeInTheDocument();
  });

  it("shows the empty-output placeholder when there are no test case results", () => {
    render(<CodeEditor {...baseProps({ testCasesResults: null })} />);

    expect(
      screen.getByText("// Submit your code to see output here"),
    ).toBeInTheDocument();
  });

  it.each(["submitted", "judging", "processing"])(
    "locks the editor (read-only) when codeStatus is '%s'",
    (status) => {
      render(<CodeEditor {...baseProps({ codeStatus: status })} />);
      expect(screen.getByTestId("monaco-editor")).toHaveAttribute("readonly");
    },
  );

  it("does not lock the editor when codeStatus is not-submitted", () => {
    render(<CodeEditor {...baseProps()} />);
    expect(screen.getByTestId("monaco-editor")).not.toHaveAttribute("readonly");
  });
});

// CodeEditor language menu tests
describe("CodeEditor language menu", () => {
  it("opens the language dropdown when the toggle is clicked", () => {
    render(<CodeEditor {...baseProps()} />);

    expect(
      screen.queryByRole("button", { name: "Python" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "JavaScript" }));

    expect(screen.getByRole("button", { name: "Python" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "C++" })).toBeInTheDocument();
  });

  it("calls onLanguageChange when selecting a different language", () => {
    const onLanguageChange = vi.fn();
    render(<CodeEditor {...baseProps({ onLanguageChange })} />);

    fireEvent.click(screen.getByRole("button", { name: "JavaScript" }));
    fireEvent.click(screen.getByRole("button", { name: "Python" }));

    expect(onLanguageChange).toHaveBeenCalledWith("python");
    expect(
      screen.queryByRole("button", { name: "C++" }),
    ).not.toBeInTheDocument();
  });

  it("does not call onLanguageChange when selecting the already-active language", () => {
    const onLanguageChange = vi.fn();
    render(<CodeEditor {...baseProps({ onLanguageChange })} />);

    fireEvent.click(screen.getByRole("button", { name: "JavaScript" }));
    const jsButtons = screen.getAllByRole("button", { name: "JavaScript" });
    fireEvent.click(jsButtons[jsButtons.length - 1]);

    expect(onLanguageChange).not.toHaveBeenCalled();
  });

  it("closes the dropdown when clicking the overlay", () => {
    const { container } = render(<CodeEditor {...baseProps()} />);

    fireEvent.click(screen.getByRole("button", { name: "JavaScript" }));
    expect(screen.getByRole("button", { name: "Python" })).toBeInTheDocument();

    fireEvent.click(container.querySelector(".fixed.inset-0.z-40"));

    expect(
      screen.queryByRole("button", { name: "Python" }),
    ).not.toBeInTheDocument();
  });

  it("disables the language toggle when locked, and does not open the dropdown", () => {
    render(<CodeEditor {...baseProps({ codeStatus: "submitted" })} />);

    expect(screen.getByRole("button", { name: "JavaScript" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "JavaScript" }));
    expect(
      screen.queryByRole("button", { name: "Python" }),
    ).not.toBeInTheDocument();
  });
});

// CodeEditor reset button tests
describe("CodeEditor reset button", () => {
  it("resets to the starter code for the current language when clicked", () => {
    const onChange = vi.fn();
    render(<CodeEditor {...baseProps({ onChange, language: "python" })} />);
    onChange.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(onChange).toHaveBeenCalledWith("# py starter");
    expect(screen.getByTestId("monaco-editor")).toHaveValue("# py starter");
  });

  it("disables Reset when locked", () => {
    render(<CodeEditor {...baseProps({ codeStatus: "processing" })} />);

    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("does nothing when starterCode is missing entirely", () => {
    const onChange = vi.fn();
    render(<CodeEditor {...baseProps({ onChange, starterCode: null })} />);
    onChange.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("CodeEditor - editor settings", () => {
  it("opens and closes the settings panel", () => {
    render(<CodeEditor {...baseProps()} />);

    expect(screen.queryByText("Editor Settings")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));
    expect(screen.getByText("Editor Settings")).toBeInTheDocument();
  });

  it("increments and decrements font size within 10-24 bounds", () => {
    render(<CodeEditor {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));

    expect(screen.getByText("17px")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("18px")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "-" }));
    fireEvent.click(screen.getByRole("button", { name: "-" }));
    expect(screen.getByText("16px")).toBeInTheDocument();
  });

  it("persists settings to localStorage on change", () => {
    render(<CodeEditor {...baseProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));
    fireEvent.click(screen.getByRole("button", { name: "+" }));

    const saved = JSON.parse(localStorage.getItem("editorSettings"));
    expect(saved.fontSize).toBe(18);
  });

  it("syncs a stored language preference to the parent on mount", () => {
    localStorage.setItem(
      "editorSettings",
      JSON.stringify({
        language: "python",
        relativeLineNumbers: false,
        fontSize: 17,
        tabSize: 4,
      }),
    );
    const onLanguageChange = vi.fn();
    render(
      <CodeEditor
        {...baseProps({ onLanguageChange, language: "javascript" })}
      />,
    );

    expect(onLanguageChange).toHaveBeenCalledWith("python");
  });
});

// CodeEditor test case results tests
describe("CodeEditor test case results", () => {
  const results = [
    { index: 0, passed: true, input: "[1,2]", output: 3, expected: "[3]" },
    {
      index: 1,
      passed: false,
      input: "[1,1]",
      output: 1,
      expected: "[2]",
      error: "AssertionError",
    },
  ];

  it("shows Passed/Failed badges and switches details when a different tab is clicked", () => {
    render(<CodeEditor {...baseProps({ testCasesResults: results })} />);

    expect(screen.getByText("Passed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Case 2/ }));

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("AssertionError")).toBeInTheDocument();
  });

  it("shows Stdout only when debugLines are present", () => {
    const withDebug = [
      {
        index: 0,
        passed: true,
        input: "1",
        output: 1,
        expected: "1",
        debugLines: ["log line 1", "log line 2"],
      },
    ];
    render(<CodeEditor {...baseProps({ testCasesResults: withDebug })} />);

    expect(screen.getByText("Stdout")).toBeInTheDocument();
  });

  it("does not show Stdout when debugLines are absent", () => {
    render(<CodeEditor {...baseProps({ testCasesResults: results })} />);

    expect(screen.queryByText("Stdout")).not.toBeInTheDocument();
  });

  it("toggles Collapse/Expand and hides tabs when collapsed", () => {
    render(<CodeEditor {...baseProps({ testCasesResults: results })} />);

    expect(screen.getByRole("button", { name: /Case 1/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));

    expect(
      screen.queryByRole("button", { name: /Case 1/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
  });

  it("renders a blank Input section (no crash) when a test case's input field is undefined", () => {
    const badResults = [
      { index: 0, passed: true, input: undefined, output: 1, expected: "1" },
    ];

    render(<CodeEditor {...baseProps({ testCasesResults: badResults })} />);

    const inputLabel = screen.getByText("Input");
    const inputPre = inputLabel.nextElementSibling;
    expect(inputPre).toBeInTheDocument();
    expect(inputPre).toHaveTextContent("");
  });

  it("renders a blank Input section (no crash) when a test case's input field is null", () => {
    const badResults = [
      { index: 0, passed: true, input: null, output: 1, expected: "1" },
    ];

    render(<CodeEditor {...baseProps({ testCasesResults: badResults })} />);

    const inputLabel = screen.getByText("Input");
    const inputPre = inputLabel.nextElementSibling;
    expect(inputPre).toBeInTheDocument();
    expect(inputPre).toHaveTextContent("");
  });
});

// CodeEditor per-language saved code tests
describe("CodeEditor per-language saved code", () => {
  it("shows the starter code for a language when nothing has been typed yet", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeEditor {...baseProps({ language: "javascript", onChange })} />,
    );
    expect(screen.getByTestId("monaco-editor")).toHaveValue("// js starter");

    rerender(<CodeEditor {...baseProps({ language: "python", onChange })} />);
    expect(screen.getByTestId("monaco-editor")).toHaveValue("# py starter");
  });

  it("preserves typed code per language when switching away and back", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CodeEditor {...baseProps({ language: "javascript", onChange })} />,
    );

    fireEvent.change(screen.getByTestId("monaco-editor"), {
      target: { value: "console.log('custom js code')" },
    });

    rerender(<CodeEditor {...baseProps({ language: "python", onChange })} />);
    expect(screen.getByTestId("monaco-editor")).toHaveValue("# py starter");

    rerender(
      <CodeEditor {...baseProps({ language: "javascript", onChange })} />,
    );
    expect(screen.getByTestId("monaco-editor")).toHaveValue(
      "console.log('custom js code')",
    );
  });

  // Was having problems with this so added this test incase it ever breaks again
  it("REGRESSION: does not poison the original language's saved code if language changes before the editor finishes mounting", () => {
    monacoMockState.deferMount = true;

    const onChange = vi.fn();
    const { rerender } = render(
      <CodeEditor {...baseProps({ language: "javascript", onChange })} />,
    );

    // The editor has NOT mounted yet (deferMount is true), simulate thelanguage changing out from under it before mount ever completes.
    rerender(<CodeEditor {...baseProps({ language: "python", onChange })} />);

    // Now let the editor's mount actually complete.
    act(() => {
      monacoMockState.completeMount();
    });

    // Python should show its real starter code.
    expect(screen.getByTestId("monaco-editor")).toHaveValue("# py starter");

    // Switch back to javascript, needs to show js starter code (was showing empty before bug fix)
    rerender(
      <CodeEditor {...baseProps({ language: "javascript", onChange })} />,
    );
    expect(screen.getByTestId("monaco-editor")).toHaveValue("// js starter");
  });
});
