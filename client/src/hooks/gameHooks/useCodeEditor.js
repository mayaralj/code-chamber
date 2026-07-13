// Imports
import { useState, useEffect } from "react";
import socket from "../../socket";

export const useCodeEditor = () => {
  const [editorReady, setEditorReady] = useState(false);

  return { editorReady, setEditorReady };
};
