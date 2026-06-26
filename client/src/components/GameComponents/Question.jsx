const Question = ({ question }) => {
  return (
    // Split the screen into 2 half, the first half is here
    <div className="flex-1 bg-gray-800 rounded-lg p-4 text-white overflow-y-auto">
      {/* Display Question Title Centered */}
      <h2 className="text-4xl font-bold mb-4 text-center">{question?.title}</h2>
      {/* Display Question Description */}
      <p className="text-xl whitespace-pre-wrap">{question?.description}</p>
    </div>
  );
};

export default Question;
