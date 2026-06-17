import Editor, { useMonaco } from "@monaco-editor/react";
import { useRef, useEffect, useState } from "react";

// Languages supported (No language support besides javascript for now)
const LANGUAGES = {
  JavaScript: "javascript",
};

const CodeEditor = ({
  onChange,
  codeSubmitted,
  language,
  onLanguageChange,
  onMount,
}) => {
  // Ref for editor
  const editorRef = useRef(null);
  const handleMount = (editor) => {
    editorRef.current = editor;
    onMount?.();
  };

  // Monaco
  const monaco = useMonaco();

  // Saved code ref
  const savedCode = useRef({
    javascript: "",
    python: "",
  });

  // Previous language ref
  const previousLanguage = useRef(language);

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

  return (
    // Split the screen into 2 half, the second half is here
    <div className="flex-1 flex flex-col bg-gray-800 rounded-lg p-4 text-white overflow-y-auto">
      {/* Display Code Editor Title Centered */}
      <h2 className="text-4xl font-bold mb-4 text-center">Code Editor</h2>
      {/* Selector to Change Language */}
      <div className="mb-4 ">
        <select
          className="bg-gray-700 text-white border border-gray-500 rounded py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={language}
          onChange={onLanguageChange}
        >
          {/* List out all the language options */}
          {Object.entries(LANGUAGES).map(([key, value]) => (
            <option key={value} value={value}>
              {key}
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
          defaultValue={language}
          onChange={onChange}
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
            readOnly: codeSubmitted,
            readOnlyMessage: { value: null },
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
