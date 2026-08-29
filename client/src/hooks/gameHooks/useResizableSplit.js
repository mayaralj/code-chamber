// Imports
import { useRef, useState, useCallback, useEffect } from "react";

// Custom hook to handle resizable split view
const useResizableSplit = ({
  axis = "horizontal",
  initialSize = 50,
  minSize = 20,
  maxSize = 80,
} = {}) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState(initialSize);
  const draggingRef = useRef(false);

  // Start dragging on divider mousedown
  const handleDragStart = useCallback(
    (e) => {
      e.preventDefault();
      draggingRef.current = true;
      document.body.style.cursor =
        axis === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [axis],
  );

  // Track mouse movement/release globally
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let percent;
      if (axis === "horizontal") {
        percent = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        percent = ((e.clientY - rect.top) / rect.height) * 100;
      }
      percent = Math.min(maxSize, Math.max(minSize, percent));
      setSize(percent);
    };

    const handleMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [axis, minSize, maxSize]);

  return { containerRef, size, setSize, handleDragStart };
};

export default useResizableSplit;
