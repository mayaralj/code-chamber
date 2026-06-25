// helper to send a question to all clients for a specific room
const getQuestion = (io, code, room, questions) => {
  const randomQuestion =
    questions[Math.floor(Math.random() * questions.length)];

  // Store the current question in the room state
  room.currentQuestion = randomQuestion;

  return randomQuestion;
};

export default getQuestion;
