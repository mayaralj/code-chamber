import Editor from "@monaco-editor/react";

const CodeEditor = ({ onChange }) => {
  return (
    // Split the screen into 2 half, the second half is here
    <div className="flex-1 flex flex-col bg-gray-800 rounded-lg p-4 text-white">
      {/* Display Code Editor Title Centered */}
      <h2 className="text-4xl font-bold mb-4 text-center">Code Editor</h2>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          theme="vs-dark"
          defaultValue="// Write your code here"
          onChange={onChange}
          options={{
            fontSize: 16,
            minimap: { enabled: false },
            wordWrap: "on",
            automaticLayout: true,
            quickSuggestions: false,
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: false,
            contextmenu: false,
            readOnly: false,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
