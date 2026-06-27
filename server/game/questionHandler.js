// Imports
import db from "../db.js";

const getDifficultyQuestions = async (difficulty) => {
  // Query the database for questions of the specified difficulty
  const questions = await db.query(
    "SELECT * FROM questions WHERE difficulty = $1",
    [difficulty],
  );
  return questions.rows;
};

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

// Helper to set up game questions fully
export const setUpGameQuestions = async (io, code, rooms) => {
  // Build a list of all available questions for the game based on the room's difficulty
  const questions = await getDifficultyQuestions(rooms[code].difficulty);

  // Check room still exists after await
  if (!rooms[code]) {
    console.log(`Room ${code} no longer exists after fetching questions`);
    return;
  }

  // Determine questions amount based on number of players
  let numPlayers = rooms[code].players.length;
  let excludeList = [];
  // Create a list of questions for the game based on the number of players
  while (numPlayers > 0) {
    const randomQuestion = getQuestion(
      io,
      code,
      rooms[code],
      questions,
      excludeList,
    );
    // Add the question ID to the exclude list to avoid duplicates
    excludeList.push(randomQuestion.id);

    // Add the question to the room's questions list if it doesn't already exist
    if (!rooms[code].questions) {
      rooms[code].questions = [];
    }
    rooms[code].questions.push(randomQuestion);

    // Find Starter code
    const { rows } = await db.query(
      "SELECT language, code FROM starter_code WHERE question_id = $1",
      [randomQuestion.id],
    );
    // Add the starter code to the question object
    rooms[code].questions[rooms[code].questions.length - 1].starterCode = rows;

    // Decrement numPlayers to ensure we only add as many questions as there are players
    numPlayers--;
  }
};
