const Question = ({ question }) => {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-5 py-4">
        <span className="text-sm  font-semibold uppercase tracking-wider text-zinc-400">
          Problem
        </span>
      </div>
      <div className="modal-scroll flex-1 overflow-y-auto px-5 py-4">
        <h2 className="mb-3 text-2xl font-bold text-zinc-100">
          {question?.title}
        </h2>
        <p className="whitespace-pre-wrap text-base leading-7 text-zinc-300">
          {question?.description}
        </p>
      </div>
    </div>
  );
};

export default Question;
