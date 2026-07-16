// Imports
import { useState } from "react";

export const useCodeEditor = () => {
  const [editorReady, setEditorReady] = useState(false);

  return { editorReady, setEditorReady };
};
