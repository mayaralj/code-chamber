// Imports
import { useEffect, useRef } from "react";
import { vi } from "vitest";
import { monacoMockState } from "./monacoMockState";

// Mock editor component to simulate the behavior of the Monaco editor in tests. It allows tests to control when the editor is mounted and to inspect the latest editor, monaco instance, and options used in the tests.
const MockEditor = ({ onMount, onChange, options }) => {
  // Ref to hold the textarea element, which simulates the Monaco editor's value and change events.
  const textareaRef = useRef(null);

  // Update the latest options in the monacoMockState whenever the options prop changes. This allows tests to inspect the latest options used in the mock editor.
  useEffect(() => {
    monacoMockState.latestOptions = options;
  }, [options]);

  useEffect(() => {
    // fake editor and monaco instances to simulate the behavior of the Monaco editor in tests. The fake editor has getValue, setValue, and deltaDecorations methods.
    const fakeEditor = {
      getValue: vi.fn(() => textareaRef.current?.value ?? ""),
      setValue: vi.fn((nextValue) => {
        if (textareaRef.current) {
          textareaRef.current.value = nextValue ?? "";
        }
      }),
      deltaDecorations: vi.fn((_oldIds, newDecorations) => newDecorations),
    };

    // fake monaco instance with a Range constructor to simulate the behavior of the Monaco editor in tests. The Range constructor creates a range object with start and end positions.
    const fakeMonaco = {
      Range: vi.fn(function (startLine, startCol, endLine, endCol) {
        this.startLine = startLine;
        this.startCol = startCol;
        this.endLine = endLine;
        this.endCol = endCol;
      }),
    };

    const fireMount = () => {
      monacoMockState.latestEditor = fakeEditor;
      monacoMockState.latestMonaco = fakeMonaco;
      onMount?.(fakeEditor, fakeMonaco);
    };

    if (monacoMockState.deferMount) {
      monacoMockState._pendingMount = fireMount;
    } else {
      fireMount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <textarea
      ref={textareaRef}
      data-testid="monaco-editor"
      readOnly={options?.readOnly}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
};

export default MockEditor;
