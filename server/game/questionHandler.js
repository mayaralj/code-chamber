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
const getQuestion = (questions, excludeList) => {
  // Filter out questions that have already been used in the room
  questions = questions.filter((q) => !excludeList.includes(q.id));
  const randomQuestion =
    questions[Math.floor(Math.random() * questions.length)];

  return randomQuestion;
};

// Helper to set up game questions fully
export const setUpGameQuestions = async (rooms, code) => {
  // Build a list of all available questions for the game based on the room's difficulty
  const questions = await getDifficultyQuestions(rooms[code].difficulty);

  // Check room still exists after await
  if (!rooms[code]) {
    return;
  }

  // get all starter codes
  const { rows: allStarterCodes } = await db.query(
    "SELECT language, code, question_id FROM starter_code WHERE question_id = ANY($1)",
    [questions.map((q) => q.id)],
  );

  // Check room still exists after await
  if (!rooms[code]) {
    return;
  }

  // Determine questions amount based on number of players
  let totalRounds = rooms[code].totalRounds;
  let currentRound = 1;
  let excludeList = [];
  let first = true;

  // Create a list of questions for the game based on the number of players
  while (currentRound <= totalRounds) {
    // if first force get celsiusToFahrenheit question for first round
    let randomQuestion;
    if (first && rooms[code].difficulty === "easy") {
      randomQuestion = questions.find(
        (q) => q.title === "Celsius to Fahrenheit",
      );
      first = false;
    } else {
      randomQuestion = getQuestion(questions, excludeList);
    }
    // Add the question ID to the exclude list to avoid duplicates
    excludeList.push(randomQuestion.id);

    // Add the question to the room's questions list if it doesn't already exist
    rooms[code].roundData[currentRound].question = randomQuestion;

    // Find Starter code for this question
    rooms[code].roundData[currentRound].question.starterCode =
      allStarterCodes.filter((sc) => sc.question_id === randomQuestion.id);

    // Increment the current round
    currentRound++;
  }
};
