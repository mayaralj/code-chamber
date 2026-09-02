// Map each difficulty level to its corresponding badge styling
const DIFFICULTY_STYLES = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  medium: "border-[#ffd687]/30 bg-[#ffd687]/10 text-[#ffd687]",
  hard: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

// Helper to highlight specific words within description
const highlightWords = (description, wordsToHighlight) => {
  if (!description) return description;

  // lower case words for case-insensitive matching
  const lowerWords = wordsToHighlight.map((w) => w.toLowerCase());

  const parts = description.split(
    new RegExp(`\\b(${wordsToHighlight.join("|")})\\b`, "gi"),
  );

  // Check if the part matches any of the words to highlight (case-insensitive) and wrap it in a span with styling
  return parts.map((part, index) =>
    lowerWords.includes(part.toLowerCase()) ? (
      <span key={index} className="font-medium text-xl text-zinc-100">
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
};

// Question component
const Question = ({ question }) => {
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
      <div className="modal-scroll flex-1 overflow-y-auto px-5 py-4">
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
