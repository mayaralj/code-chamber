// helper to send a question to all clients for a specific room
const getQuestion = (io, code, room, questions) => {
  // Return a random question based on room difficulty
  const filteredQuestions = questions.filter(
    (q) => q.difficulty.toLowerCase() === room.difficulty.toLowerCase(),
  );
  const randomQuestion =
    filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
  return randomQuestion;
};

export default getQuestion;
