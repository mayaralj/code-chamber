const Results = ({ results }) => {
  console.log("Rendering Results with results:", results);
  // Results modal that happens after every round centered in the middle
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-gray-800 rounded-lg p-8 w-[500px] flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Results</h1>
        {/* List each player and their results */}
        {results.map((result, index) => (
          <div key={index} className="flex justify-center gap-6 items-center">
            <span className="text-white font-semibold">{result.username}:</span>
            <span className="text-white">{result.submitTime}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;
