// helper to send a question to all clients for a specific room
const getQuestion = (io, code, room, questions, excludeList) => {
  // Filter out questions that have already been used in the room
  questions = questions.filter((q) => !excludeList.includes(q.id));
  const randomQuestion =
    questions[Math.floor(Math.random() * questions.length)];

  // Store the current question in the room state
  console.log(
    `Setting current question for room ${code} to question ID ${randomQuestion.id}`,
  );
  room.currentQuestion = randomQuestion;

  return randomQuestion;
};

export default getQuestion;
