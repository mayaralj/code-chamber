import Editor from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";

// Languages supported (No language support besides javascript for now)
const LANGUAGES = {
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
};

// Update starter code helper
const updateStarterCode = (
  editorRef,
  language,
  starterCode,
  savedCode,
  onChange,
) => {
  if (!editorRef.current || !starterCode) {
    return;
  }
  if (savedCode && savedCode[language]) {
    return;
  }

  const starterCodeForLanguage = starterCode[language];
  if (!starterCodeForLanguage) {
    console.log(`No starter code found for language: ${language}`);
    return;
  }
  editorRef.current.setValue(starterCodeForLanguage);
  onChange?.(starterCodeForLanguage);
};

// Strip the single outermost [ ] wrapper from an input string, if present
const stripOuterBrackets = (input) => {
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

// Render a value as text, explicitly labeling null/undefined instead of hiding them
const formatValueForDisplay = (value) => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  return String(value);
};

const CodeEditor = ({
  onChange,
  isJudging,
  isSubmitted,
  language,
  onLanguageChange,
  onMount,
  starterCode,
  testCasesResults,
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const [activeTestCase, setActiveTestCase] = useState(0);

  // Track the previous testCasesResults reference so we can reset the
  // active tab during render instead of inside a useEffect (avoids the
  // "setState synchronously within an effect" cascading-render warning).
  const [prevTestCasesResults, setPrevTestCasesResults] =
    useState(testCasesResults);
  if (testCasesResults !== prevTestCasesResults) {
    setPrevTestCasesResults(testCasesResults);
    setActiveTestCase(0);
  }

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    updateStarterCode(
      editorRef,
      language,
      starterCode,
      savedCode.current,
      onChange,
    );
    onMount?.();
  };

  const previousLanguage = useRef(language);

  const savedCode = useRef({
    javascript: "",
    python: "",
    cpp: "",
  });

  const handleEditorChange = (value) => {
    savedCode.current[language] = value;
    onChange?.(value);
  };

  const handleRoundChange = () => {
    savedCode.current = { javascript: "", python: "", cpp: "" };
  };

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    const currentCode = editorRef.current.getValue();
    savedCode.current[previousLanguage.current] = currentCode;
    editorRef.current.setValue(savedCode.current[language] || "");
    previousLanguage.current = language;
  }, [language]);

  useEffect(() => {
    handleRoundChange();
  }, [starterCode]);

  useEffect(() => {
    updateStarterCode(
      editorRef,
      language,
      starterCode,
      savedCode.current,
      onChange,
    );
  }, [language, starterCode, onChange]);

  const currentCase = testCasesResults?.[activeTestCase];

  // Highlight the error line (red) in the editor for the selected test case
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    // Highlight the error line if it exists
    const newDecorations = currentCase?.errorLine
      ? [
          {
            range: new monacoRef.current.Range(
              currentCase.errorLine,
              1,
              currentCase.errorLine,
              1,
            ),
            options: {
              isWholeLine: true,
              className: "error-line-highlight",
              glyphMarginClassName: "error-line-glyph",
            },
          },
        ]
      : [];

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    );
  }, [currentCase]);

  return (
    <div className="flex-1 flex flex-col bg-gray-800 rounded-lg p-4 text-white overflow-y-auto">
      {/* Inline styles for the error-line highlight decoration */}
      <style>{`
        .error-line-highlight {
          background-color: rgba(239, 68, 68, 0.22);
        }
      `}</style>

      <h2 className="text-4xl font-bold mb-4 text-center">Code Editor</h2>
      <div className="mb-4 ">
        <select
          className="bg-gray-700 text-white border border-gray-500 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isJudging || isSubmitted}
          value={language}
          onChange={onLanguageChange}
        >
          {Object.entries(LANGUAGES).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          onMount={handleMount}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            fontSize: 16,
            minimap: { enabled: false },
            wordWrap: "on",
            automaticLayout: true,
            quickSuggestions: false,
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: false,
            overviewRulerLanes: 0,
            contextmenu: false,
            readOnly: isJudging || isSubmitted,
            readOnlyMessage: { value: null },
            glyphMargin: true,
          }}
        />
      </div>

      {/* Output Section with LeetCode-style test case tabs */}
      <div className="mt-4 h-64 flex flex-col bg-gray-900 border border-gray-600 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
          <span className="text-sm font-bold text-gray-300">OUTPUT</span>
          <span className="text-xs text-gray-500">
            {isJudging ? "RUNNING..." : "IDLE"}
          </span>
        </div>

        {!testCasesResults || testCasesResults.length === 0 ? (
          <pre className="flex-1 overflow-y-auto p-3 text-sm font-mono text-gray-400 whitespace-pre-wrap">
            {"// Submit your code to see output here"}
          </pre>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-800 shrink-0">
              {testCasesResults.map((tc, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestCase(i)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-r border-gray-700 ${
                    activeTestCase === i
                      ? "bg-gray-700 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tc.passed ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  Case {tc.index + 1}
                </button>
              ))}
            </div>

            {/* Active test case details */}
            <div className="flex-1 overflow-y-auto p-3 text-sm font-mono space-y-3">
              {currentCase && (
                <>
                  {console.log(
                    "Current Case error line:",
                    currentCase.errorLine,
                  )}
                  <div>
                    <span
                      className={`font-bold ${
                        currentCase.passed ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {currentCase.passed ? "Passed" : "Failed"}
                    </span>
                  </div>

                  <div>
                    <div className="text-gray-500 mb-1">Input</div>
                    <pre className="text-gray-200 whitespace-pre-wrap">
                      {stripOuterBrackets(currentCase.input)}
                    </pre>
                  </div>

                  {currentCase.debugLines &&
                    currentCase.debugLines.length > 0 && (
                      <div>
                        <div className="text-gray-500 mb-1">Stdout</div>
                        <pre className="text-gray-300 whitespace-pre-wrap">
                          {Array.isArray(currentCase.debugLines)
                            ? currentCase.debugLines.join("\n")
                            : currentCase.debugLines}
                        </pre>
                      </div>
                    )}

                  {currentCase.error && (
                    <div>
                      <div className="text-gray-500 mb-1">Error</div>
                      <pre className="text-red-400 whitespace-pre-wrap">
                        {currentCase.error}
                      </pre>
                    </div>
                  )}

                  <div>
                    <div className="text-gray-500 mb-1">Output</div>
                    <pre className="text-gray-200 whitespace-pre-wrap">
                      {formatValueForDisplay(currentCase.output)}
                    </pre>
                  </div>

                  <div>
                    <div className="text-gray-500 mb-1">Expected</div>
                    <pre className="text-gray-200 whitespace-pre-wrap">
                      {stripOuterBrackets(
                        formatValueForDisplay(currentCase.expected),
                      )}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
