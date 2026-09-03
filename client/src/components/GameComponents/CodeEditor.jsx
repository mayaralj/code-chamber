import Editor from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";
import { Settings, RotateCcw, ChevronDown } from "lucide-react";
import useResizableSplit from "../../hooks/gameHooks/useResizableSplit";

// Config
// Languages supported (No language support besides javascript for now)
const LANGUAGES = {
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
};

// Default editor settings
const DEFAULT_EDITOR_SETTINGS = {
  language: "javascript",
  relativeLineNumbers: false,
  fontSize: 17,
  tabSize: 4,
};

// Helper to add a space after commas in a string, but not inside string literals
const addSpaceAfterCommas = (str) => {
  let result = "";
  let inString = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    result += char;
    if (char === '"' && str[i - 1] !== "\\") {
      inString = !inString;
    }
    if (char === "," && !inString) {
      result += " ";
    }
  }
  return result;
};

// Convert a value to a JSON string, handling cases where the value is already a string or not
const toJsonString = (value) => {
  let str;
  if (typeof value === "string") {
    try {
      str = JSON.stringify(JSON.parse(value));
    } catch {
      str = JSON.stringify(value);
    }
  } else {
    str = JSON.stringify(value);
  }
  return addSpaceAfterCommas(str);
};

// Helper to strip outer brackets from a string if they exist
const stripOuterBrackets = (input) => {
  const str = toJsonString(input);
  const trimmed = str.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

// Helper to format a value for display in the output console, handling undefined, null, strings, and other types
const formatValueForDisplay = (value) => {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  return addSpaceAfterCommas(JSON.stringify(value));
};

const CodeEditor = ({
  onChange,
  codeStatus,
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
  const [prevTestCasesResults, setPrevTestCasesResults] =
    useState(testCasesResults);

  // Resizable split between the editor and the output console
  const {
    containerRef: splitRef,
    size: editorHeight,
    setSize: setEditorHeight,
    handleDragStart,
  } = useResizableSplit({
    axis: "vertical",
    initialSize: 65,
    minSize: 25,
    maxSize: 95,
  });

  if (testCasesResults !== prevTestCasesResults) {
    setPrevTestCasesResults(testCasesResults);
    setActiveTestCase(0);
    // Set the size to indicate that there are now results incase it player closed it
    setEditorHeight(65);
  }

  // Detect as collapsed if its at the bottom of drag down
  const outputCollapsed = editorHeight >= 95;

  // Load editor settings from local storage or use defaults
  const getStoredEditorSettings = () => {
    try {
      const saved = localStorage.getItem("editorSettings");
      // If saved settings exist, merge them with defaults so all keys are present
      return saved
        ? { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(saved) }
        : DEFAULT_EDITOR_SETTINGS;
    } catch {
      return DEFAULT_EDITOR_SETTINGS;
    }
  };

  // Get the initial editor settings from local storage or defaults
  const [storedSettings] = useState(getStoredEditorSettings);

  // Editor settings, adjustable from the settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [relativeLineNumbers, setRelativeLineNumbers] = useState(
    storedSettings.relativeLineNumbers,
  );
  const [fontSize, setFontSize] = useState(storedSettings.fontSize);
  const [tabSize, setTabSize] = useState(storedSettings.tabSize);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // On mount, if the stored language is different from the current language, update it
  useEffect(() => {
    if (storedSettings.language && storedSettings.language !== language) {
      onLanguageChange(storedSettings.language);
    }
  }, []);

  // Update local storage whenever editor settings change
  useEffect(() => {
    localStorage.setItem(
      "editorSettings",
      JSON.stringify({ language, relativeLineNumbers, fontSize, tabSize }),
    );
  }, [language, relativeLineNumbers, fontSize, tabSize]);

  // Current test case for output display
  const currentCase = testCasesResults?.[activeTestCase];

  // Lock the editor if the code is submitted, judging, or processing
  const isLocked =
    codeStatus === "submitted" ||
    codeStatus === "judging" ||
    codeStatus === "processing";

  // On mount
  const [editorReady, setEditorReady] = useState(false);
  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorReady(true);
    onMount?.();
  };

  // Refs to track the current language and saved code for each language, so switching languages doesn't lose code
  const previousLanguage = useRef(language);
  const savedCode = useRef({
    javascript: "",
    python: "",
    cpp: "",
  });

  // Handle editor changes, updating the saved code for the current language and calling onChange
  const handleEditorChange = (value) => {
    savedCode.current[language] = value;
    onChange?.(value);
  };

  // Reset the saved code for all languages when the round changes (new question)
  const handleRoundChange = () => {
    savedCode.current = { javascript: "", python: "", cpp: "" };
  };

  // Reset the current language's code back to its starter code
  const handleResetCode = () => {
    if (!editorRef.current || !starterCode || isLocked) return;
    const starterCodeForLanguage = starterCode[language] || "";
    savedCode.current[language] = starterCodeForLanguage;
    editorRef.current.setValue(starterCodeForLanguage);
    onChange?.(starterCodeForLanguage);
  };

  // Handle selecting a new language from the dropdown, updating both the state and calling onLanguageChange
  const handleSelectLanguage = (key) => {
    if (key !== language) {
      onLanguageChange(key);
    }
    setShowLanguageMenu(false);
  };

  useEffect(() => {
    handleRoundChange();
  }, [starterCode]);

  useEffect(() => {
    // Ensure the editor is ready and the starter code is available before updating the editor content
    if (!editorRef.current || !editorReady) return;

    // Save the current code for the previous language before switching to the new language
    const currentCode = editorRef.current.getValue();
    savedCode.current[previousLanguage.current] = currentCode;

    // Determine the next code to display: either the saved code for the new language, or its starter code, or an empty string if neither exists
    const next = savedCode.current[language] || starterCode?.[language] || "";

    // Update the editor content and call onChange with the new code
    editorRef.current.setValue(next);
    onChange?.(next);
    previousLanguage.current = language;
  }, [language, editorReady, starterCode, onChange]);

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
    <div
      ref={splitRef}
      className="flex h-full flex-col overflow-hidden bg-[#1e1e1e] text-zinc-300"
    >
      {/* Inline styles for the error-line highlight decoration */}
      <style>{`.error-line-highlight { background-color: rgba(248, 113, 113, 0.15); }`}</style>

      {/* Editor pane, height always driven by the resizable split percentage so dragging
          works continuously even while the output is collapsed */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ height: `${editorHeight}%` }}
      >
        {/* Top bar: just the section label. Chrome is one shade off the content
            behind it (zinc-900 vs #1e1e1e) instead of a jarring near-black jump */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-900 px-5 py-2.5">
          <span className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Code
          </span>
        </div>

        {/* Second, smaller bar: language on the left, reset + settings on the right */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-1">
          <div className="relative">
            <button
              onClick={() => !isLocked && setShowLanguageMenu((prev) => !prev)}
              disabled={isLocked}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-1 text-sm font-medium text-zinc-300 outline-none transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {LANGUAGES[language]}
              <ChevronDown
                size={14}
                className={`text-zinc-500 transition-transform ${
                  showLanguageMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showLanguageMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLanguageMenu(false)}
                />
                <div className="absolute top-full left-0 z-50 mt-1 w-36 overflow-hidden rounded-sm border border-zinc-800 bg-zinc-900 shadow-xl">
                  {Object.entries(LANGUAGES).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectLanguage(key)}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                        key === language
                          ? "bg-[#ffd687]/10 font-semibold text-[#ffd687]"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {value}
                      {key === language && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#ffd687]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCode}
              disabled={isLocked}
              title="Reset to starter code"
              className="flex cursor-pointer items-center gap-1.5 border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={12} />
              Reset
            </button>

            <div className="relative">
              <button
                onClick={() => setShowSettings((prev) => !prev)}
                title="Editor settings"
                className="flex cursor-pointer items-center border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                <Settings size={14} />
              </button>

              {showSettings && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSettings(false)}
                  />
                  <div className="absolute top-full right-0 z-50 mt-2 w-60 rounded-xs border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Editor Settings
                    </h3>

                    {/* Relative line numbers toggle */}
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-zinc-300">
                        Relative Lines
                      </span>
                      <button
                        onClick={() => setRelativeLineNumbers((prev) => !prev)}
                        className={`h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                          relativeLineNumbers ? "bg-[#ffd687]" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-zinc-100 transition-transform ${
                            relativeLineNumbers
                              ? "translate-x-4"
                              : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Font size */}
                    <div className="mb-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm text-zinc-300">Font Size</span>
                        <span className="text-xs text-zinc-500">
                          {fontSize}px
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setFontSize((prev) => Math.max(10, prev - 1))
                          }
                          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-600"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="10"
                          max="24"
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="flex-1 accent-[#ffd687]"
                        />
                        <button
                          onClick={() =>
                            setFontSize((prev) => Math.min(24, prev + 1))
                          }
                          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:border-zinc-600"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Tab size */}
                    <div>
                      <span className="mb-1.5 block text-sm text-zinc-300">
                        Tab Size
                      </span>
                      <div className="flex gap-1.5">
                        {[2, 4, 8].map((size) => (
                          <button
                            key={size}
                            onClick={() => setTabSize(size)}
                            className={`flex-1 cursor-pointer rounded-md border py-1 text-xs font-medium ${
                              tabSize === size
                                ? "border-[#ffd687]/60 bg-[#ffd687]/10 text-[#ffd687]"
                                : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1 flex-1">
          <Editor
            height="100%"
            language={language}
            onMount={handleMount}
            theme="vs-dark"
            onChange={handleEditorChange}
            options={{
              fontSize,
              tabSize,
              detectIndentation: false,
              lineNumbers: relativeLineNumbers ? "relative" : "on",
              minimap: { enabled: false },
              wordWrap: "on",
              automaticLayout: true,
              quickSuggestions: false,
              parameterHints: { enabled: false },
              suggestOnTriggerCharacters: false,
              overviewRulerLanes: 0,
              contextmenu: false,
              readOnly: isLocked,
              readOnlyMessage: { value: null },
              glyphMargin: true,
              renderLineHighlight: "none",
            }}
          />
        </div>
      </div>

      {/* Drag handle between editor and output */}
      <div
        onMouseDown={handleDragStart}
        className="group flex h-1.5 shrink-0 cursor-row-resize items-center justify-center bg-zinc-900 hover:bg-zinc-800"
      >
        <div className="h-0.5 w-10 rounded-full bg-zinc-700 group-hover:bg-[#ffd687]/75" />
      </div>

      <div
        className="flex flex-col overflow-hidden border-t border-zinc-800 bg-[#1e1e1e]"
        style={{ height: `${100 - editorHeight}%` }}
      >
        <div className="flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900 px-4 py-2 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Output
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-zinc-500">
              {codeStatus === "judging" ? "Running..." : "Idle"}
            </span>
            {/* Toggle to collapse/expand the console by snapping the split size */}
            <button
              onClick={() => setEditorHeight(outputCollapsed ? 65 : 95)}
              className="cursor-pointer text-[11px] font-medium text-zinc-500 hover:text-zinc-200"
            >
              {outputCollapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        {!outputCollapsed &&
          (!testCasesResults || testCasesResults.length === 0 ? (
            <pre className="modal-scroll flex-1 overflow-y-auto whitespace-pre-wrap px-4 pb-4 text-sm text-zinc-500">
              {"// Submit your code to see output here"}
            </pre>
          ) : (
            <>
              <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-800 px-3 pb-2 pt-2">
                {testCasesResults.map((tc, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestCase(i)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
                      activeTestCase === i
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        tc.passed ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                    Case {tc.index + 1}
                  </button>
                ))}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
                {currentCase && (
                  <>
                    <div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          currentCase.passed
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {currentCase.passed ? "Passed" : "Failed"}
                      </span>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-zinc-500">
                        Input
                      </div>
                      <pre className="whitespace-pre-wrap text-zinc-300">
                        {stripOuterBrackets(currentCase.input)}
                      </pre>
                    </div>
                    {currentCase.debugLines &&
                      currentCase.debugLines.length > 0 && (
                        <div>
                          <div className="mb-1 text-xs font-medium text-zinc-500">
                            Stdout
                          </div>
                          <pre className="whitespace-pre-wrap text-zinc-400">
                            {Array.isArray(currentCase.debugLines)
                              ? currentCase.debugLines.join("\n")
                              : currentCase.debugLines}
                          </pre>
                        </div>
                      )}
                    {currentCase.error && (
                      <div>
                        <div className="mb-1 text-xs font-medium text-zinc-500">
                          Error
                        </div>
                        <pre className="whitespace-pre-wrap text-rose-400">
                          {currentCase.error}
                        </pre>
                      </div>
                    )}
                    <div>
                      <div className="mb-1 text-xs font-medium text-zinc-500">
                        Output
                      </div>
                      <pre className="whitespace-pre-wrap text-zinc-300">
                        {formatValueForDisplay(currentCase.output)}
                      </pre>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium text-zinc-500">
                        Expected
                      </div>
                      <pre className="whitespace-pre-wrap text-zinc-300">
                        {stripOuterBrackets(
                          formatValueForDisplay(currentCase.expected),
                        )}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </>
          ))}
      </div>
    </div>
  );
};

export default CodeEditor;
