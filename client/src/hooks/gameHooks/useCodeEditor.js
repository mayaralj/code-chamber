// Imports
import { useState } from "react";

// hook
const useCodeEditor = () => {
  const [editorReady, setEditorReady] = useState(false);

  return { editorReady, setEditorReady };
};

export default useCodeEditor;
