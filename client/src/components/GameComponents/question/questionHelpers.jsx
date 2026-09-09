// questionHelpers.js
export const DIFFICULTY_STYLES = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  medium: "border-[#ffd687]/30 bg-[#ffd687]/10 text-[#ffd687]",
  hard: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export const highlightWords = (description, wordsToHighlight) => {
  if (!description) return description;

  const lowerWords = wordsToHighlight.map((w) => w.toLowerCase());

  const parts = description.split(
    new RegExp(`\\b(${wordsToHighlight.join("|")})\\b`, "gi"),
  );

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
