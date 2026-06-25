// Imports
import { useState, useEffect } from "react";
import socket from "../../socket";

export const useCodeEditor = () => {
  const [editorReady, setEditorReady] = useState(false);

  // // Handle new round start by resetting states
  // useEffect(() => {
  //   const handleNewRound = () => {
  //     setEditorReady(false);
  //   };

  //   // Listen for new round event
  //   socket.on("new-round", handleNewRound);

  //   // Cleanup
  //   return () => {
  //     socket.off("new-round", handleNewRound);
  //   };
  // }, []);
  return { editorReady, setEditorReady };
};
