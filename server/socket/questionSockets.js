const setUpQuestionSockets = (io, socket, { rooms, questions }) => {
  // Listen for next question
  socket.on("get-question", ({ code }) => {
    const room = rooms[code];
    if (!room) {
      socket.emit("question-error", { message: "Room not found" });
      return;
    }

    // Return a random question based on room difficulty
    const filteredQuestions = questions.filter(
      (q) => q.difficulty.toLowerCase() === room.difficulty.toLowerCase(),
    );
    const randomQuestion =
      filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
    socket.emit("send-question", { question: randomQuestion });
  });
};

export default setUpQuestionSockets;
