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
  let questions;
  try {
    questions = await getDifficultyQuestions(rooms[code].difficulty);
    // Check room still exists after await
    if (!rooms[code]) {
      return;
    }

    // Get all starter code
    const { rows: starterCodeRows } = await db.query(
      "SELECT question_id, language, code, function_name, param_types FROM starter_code WHERE question_id = ANY($1)",
      [questions.map((q) => q.id)],
    );

    // Check room still exists after await
    if (!rooms[code]) {
      return;
    }

    // Get all test cases
    const { rows: testCases } = await db.query(
      "SELECT id, question_id, input, expected FROM test_cases WHERE question_id = ANY($1)",
      [questions.map((q) => q.id)],
    );

    // Check room still exists after await
    if (!rooms[code]) {
      return;
    }

    // Attach starter code, per-language function names, and test cases to each question
    questions.forEach((q) => {
      const starterCodeForQuestion = starterCodeRows.filter(
        (sc) => sc.question_id === q.id,
      );

      // Store in question
      q.starterCode = starterCodeForQuestion.reduce((acc, sc) => {
        acc[sc.language] = sc.code;
        return acc;
      }, {});
      q.functionName = starterCodeForQuestion.reduce((acc, sc) => {
        acc[sc.language] = sc.function_name;
        return acc;
      }, {});
      q.testCases = testCases.filter((tc) => tc.question_id === q.id);
    });
  } catch (error) {
    console.error("Error setting up game questions from database:", error);
    throw error;
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

    // Increment the current round
    currentRound++;
  }
};
