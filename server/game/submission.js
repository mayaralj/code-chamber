import db from "../db.js";
import runCode from "../executor/executor.js";

// Helper to notify players of code judging
export const notifyJudging = (io, socketId, room, code) => {
  // Build a list of all judging players
  const judgingPlayers = room.players.filter((p) => p.judging).map((p) => p.id);

  // Notify player that code is being judged
  io.to(socketId).emit("code-judging");

  // Emit to all players with list of judging players
  io.to(code).emit("judging-players", {
    judgingPlayers,
  });
};

// Helper to notify players of code submission
export const notifySubmission = (io, socketId, room, code) => {
  // Build a list of all submitted players
  const submittedPlayers = room.players
    .filter((p) => p.submitted)
    .map((p) => p.id);

  // Notify player that code has been submitted
  io.to(socketId).emit("code-submitted");

  // Emit to all players with list of submitted players
  io.to(code).emit("submitted-players", {
    submittedPlayers,
  });
};

// Helper to calculate score based on results
export const calculateScore = (result, averageExecutionTime) => {
  let { passed, testCasesPassed, executionTime, submitTime } = result;

  // Ratio of test cases passed
  const testCaseRatio = testCasesPassed / result.numOfTestCases;

  // Track score
  let score = 0;

  // Score is based on test cases passed, execution time, and submission time
  score += passed ? 60 : 0;
  score += testCaseRatio * 50;
  // If execution time is less than average, give bonus points
  score += (averageExecutionTime - executionTime) * 5;
  score -= submitTime;

  // Clamp score to a minimum of 0
  score = Math.max(0, Math.round(score));

  // Clamp score to a maximum of 100
  score = Math.min(100, score);

  // Ceil the score to the nearest integer
  score = Math.ceil(score);

  console.log(
    `Calculated score for player  ${score} (passed: ${passed}, testCasesPassed: ${testCasesPassed}, executionTime: ${executionTime}, averageExecutionTime: ${averageExecutionTime}, submitTime: ${submitTime})`,
  );
  return score;
};

// Helper to process player submission
export const processSubmission = async (
  io,
  room,
  code,
  player,
  codeInput,
  language,
  submitTime,
) => {
  // Ensure player hasnt been submitted or being processed
  if (player?.submitted || player?.judging) {
    return;
  }

  // Get round data
  const roundData = room.roundData[room.currentRound];
  if (!roundData) {
    console.error(
      `No round data found for room ${code} and round ${room.currentRound}`,
    );
    return;
  }

  // Mark player as judging
  player.judging = true;
  notifyJudging(io, player.id, room, code);

  // Fetch test cases for the current question
  const { rows: testCases } = await db.query(
    "SELECT input, expected FROM test_cases WHERE question_id = $1",
    [roundData.question.id],
  );

  // Fetch the function name from starter_code table
  const { rows } = await db.query(
    "SELECT function_name FROM starter_code WHERE question_id = $1 AND language = $2",
    [roundData.question.id, language],
  );
  const functionName = rows[0]?.function_name;

  // Run the code against the test cases (handle missing code gracefully)
  const result = codeInput
    ? await runCode(language, codeInput, functionName, testCases)
    : { testResult: [], passed: false };

  // Fill in the result object with additional information
  result.submitTime = submitTime;
  result.player = player;
  result.numOfTestCases = testCases.length;

  // Update player status
  player.judging = false;
  player.submitted = true;
  notifySubmission(io, player.id, room, code);

  // Store results in current round results
  roundData.roundResults.push(result);

  // Update round results average execution time for this round for this specific language
  if (!roundData.averageExecutionTime) {
    roundData.averageExecutionTime = {};
  }
  if (!roundData.averageExecutionTime[language]) {
    roundData.averageExecutionTime[language] = result.executionTime;
  } else {
    roundData.averageExecutionTime[language] =
      (roundData.averageExecutionTime[language] + result.executionTime) /
      roundData.roundResults.length;
  }

  return result;
};

export const forceSubmitPlayer = (
  player,
  io,
  pendingCodeRequests,
  timeoutMs,
) => {
  return new Promise((resolve) => {
    let resolved = false;

    const finish = (data = {}) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      resolve({ player, codeInput: data.codeInput, language: data.language });
    };

    const timeout = setTimeout(() => {
      console.log("Timed Out");
      finish();
    }, timeoutMs);

    pendingCodeRequests.set(player.id, finish);
    io.to(player.id).emit("request-current-code");
  });
};
