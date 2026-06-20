const Results = ({ results }) => {
  console.log("Rendering Results with results:", results);
  // Results modal that happens after every round centered in the middle
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-gray-800 rounded-lg p-8 w-[500px] flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Results</h1>
        {/* Categories listing  */}
        <div className="grid grid-cols-5 gap-4 text-center">
          <span className="text-gray-400">Player</span>
          <span className="text-gray-400">Passed</span>
          <span className="text-gray-400">Test Cases Passed</span>
          <span className="text-gray-400">Execution Time (s)</span>
          <span className="text-gray-400">Submit Time (s)</span>
        </div>
        {/* Create a list of each player's results */}
        {results.map((result, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 text-center">
            <span className="text-white font-semibold">{result.username}</span>
            <span className="text-white">
              {result.results.passed ? "Yes" : "No"}
            </span>
            <span className="text-white">{result.results.testCasesPassed}</span>
            <span className="text-white">{result.results.executionTime}</span>
            <span className="text-white">{result.results.submitTime}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;
