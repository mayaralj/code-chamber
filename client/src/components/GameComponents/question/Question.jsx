import { useEffect, useRef } from "react";
import { DIFFICULTY_STYLES, highlightWords } from "./questionHelpers";

// Question component
const Question = ({ question }) => {
  const contentRef = useRef(null);

  // Block copying the question content — no legitimate feature depends on it,
  // so this is free friction against copy-pasting into external AI tools
  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const blockEvent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    node.addEventListener("copy", blockEvent, true);
    node.addEventListener("contextmenu", blockEvent, true);

    return () => {
      node.removeEventListener("copy", blockEvent, true);
      node.removeEventListener("contextmenu", blockEvent, true);
    };
  }, []);

  // Determine the badge styling based on the question's difficulty, defaulting to neutral if not found
  const difficultyStyle =
    DIFFICULTY_STYLES[question?.difficulty?.toLowerCase()] ||
    "border-zinc-700 bg-zinc-800 text-zinc-400";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-5 py-2.5">
        <span className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Question
        </span>
      </div>
      <div
        ref={contentRef}
        className="modal-scroll flex-1 select-none overflow-y-auto px-5 py-4"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-3xl font-bold text-zinc-100">
            {question?.title}
          </h2>
          {question?.difficulty && (
            <span
              className={`shrink-0 rounded-sm border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${difficultyStyle}`}
            >
              {question.difficulty}
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-lg leading-7 text-zinc-300">
          {highlightWords(question?.description, [
            "example",
            "input",
            "output",
            "explanation",
          ])}
        </p>
      </div>
    </div>
  );
};

export default Question;
