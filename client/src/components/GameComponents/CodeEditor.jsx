import Editor from "@monaco-editor/react";
import { useRef, useEffect } from "react";

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
  // Checks
  if (!editorRef.current || !starterCode) {
    return;
  }

  // Check if the code has not been altered before
  if (savedCode && savedCode[language]) {
    return;
  }

  // Find the starter code for the current language
  const starterCodeForLanguage = starterCode[language];
  if (!starterCodeForLanguage) {
    console.log(`No starter code found for language: ${language}`);
    return;
  }
  // Set the editor value to the starter code for the current language
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

const CodeEditor = ({
  onChange,
  isJudging,
  isSubmitted,
  language,
  onLanguageChange,
  onMount,
  starterCode,
}) => {
  // Ref for editor
  const editorRef = useRef(null);
  const handleMount = (editor) => {
    editorRef.current = editor;
    // Set initial starter code
    updateStarterCode(
      editorRef,
      language,
      starterCode,
      savedCode.current,
      onChange,
    );
    onMount?.();
  };

  // Previous language ref
  const previousLanguage = useRef(language);

  // Saved code ref
  const savedCode = useRef({
    javascript: "",
    python: "",
    cpp: "",
  });

  // Handle editor change (each key updates savedCode + the ref from onChange)
  const handleEditorChange = (value) => {
    savedCode.current[language] = value;
    onChange?.(value);
  };

  // On new round, reset saved code
  const handleRoundChange = () => {
    savedCode.current = { javascript: "", python: "", cpp: "" };
  };

  // Update editor text when language changes
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    // Save current code before switching
    const currentCode = editorRef.current.getValue();
    savedCode.current[previousLanguage.current] = currentCode;

    // Update editor with saved code for new language
    editorRef.current.setValue(savedCode.current[language] || "");

    // Update previous language
    previousLanguage.current = language;
  }, [language]);

  // Reset saved code when starterCode changes
  useEffect(() => {
    handleRoundChange();
  }, [starterCode]);

  // Build starter_code for respective languages when either language or starterCode changes
  useEffect(() => {
    updateStarterCode(
      editorRef,
      language,
      starterCode,
      savedCode.current,
      onChange,
    );
  }, [language, starterCode, onChange]);

  return (
    // Split the screen into 2 half, the second half is here
    <div className="flex-1 flex flex-col bg-gray-800 rounded-lg p-4 text-white overflow-y-auto">
      {/* Display Code Editor Title Centered */}
      <h2 className="text-4xl font-bold mb-4 text-center">Code Editor</h2>
      {/* Selector to Change Language */}
      <div className="mb-4 ">
        <select
          className="bg-gray-700 text-white border border-gray-500 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isJudging || isSubmitted}
          value={language}
          onChange={onLanguageChange}
        >
          {/* List out all the language options */}
          {Object.entries(LANGUAGES).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {/* Code Editor */}
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
          }}
        />
      </div>

      {/* Output Section (placeholder) */}
      <div className="mt-4 h-48 flex flex-col bg-gray-900 border border-gray-600 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
          <span className="text-sm font-bold text-gray-300">OUTPUT</span>
          <span className="text-xs text-gray-500">
            {isJudging ? "RUNNING..." : "IDLE"}
          </span>
        </div>
        <pre className="flex-1 overflow-y-auto p-3 text-sm font-mono text-gray-400 whitespace-pre-wrap">
          {"// Submt your code to see output here"}
        </pre>
      </div>
    </div>
  );
};

export default CodeEditor;
