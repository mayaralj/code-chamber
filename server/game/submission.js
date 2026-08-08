import db from "../db.js";
import runCode from "../executor/executor.js";
import { buildPlayerList } from "../utils/playerList.js";
import { rooms } from "../globals.js";

// Helper to notify players of code judging
export const notifyJudging = (io, socketId, room, code) => {
  // Build a player list with needed data
  const playerList = buildPlayerList(room);

  // Notify player that code is being judged (mainly needed for force submission because client handles on clicks)
  io.to(socketId).emit("code-judging");

  // Emit to all players with list of judging players
  io.to(code).emit("update-players", {
    players: playerList,
  });
};

// Helper to notify players of code submission
export const notifySubmission = (io, socketId, room, code) => {
  // Build a player list with needed data
  const playerList = buildPlayerList(room);

  // Notify player that code has been submitted
  io.to(socketId).emit("code-submitted");

  // Emit to all players with list of submitted players
  io.to(code).emit("update-players", {
    players: playerList,
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
  code,
  player,
  codeInput,
  language,
  submitTime,
) => {
  const room = rooms[code];
  if (!room) {
    console.error(`Room ${code} not found`);
    return;
  }
  // Ensure player hasnt been submitted or being processed
  const playerRoundData = player?.gameData?.roundData?.[room.currentRound];
  if (
    !playerRoundData ||
    playerRoundData.submitted ||
    playerRoundData.judging
  ) {
    return;
  }

  // Get round data
  const roundData = room.roundData[room.currentRound];

  // Init round results
  if (!roundData.roundResults) {
    roundData.roundResults = [];
  }

  // Mark player as judging
  playerRoundData.judging = true;
  notifyJudging(io, player.socketId, room, code);

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
  playerRoundData.judging = false;
  playerRoundData.submitted = true;
  notifySubmission(io, player.socketId, room, code);

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

// Helper to get player code
export const getPlayerCode = (
  player,
  io,
  pendingCodeRequests,
  starterCode,
  timeout,
) => {
  return new Promise((resolve) => {
    // Time out after timeout (ms)
    const timeoutHandle = setTimeout(() => {
      pendingCodeRequests.delete(player.userId);
      resolve({
        player,
        codeInput: starterCode["javascript"],
        language: "javascript",
      });
    }, timeout);

    // Store the resolve function and timeout handle in the pendingCodeRequests map
    pendingCodeRequests.set(player.userId, { resolve, timeoutHandle });

    // Get target socket, io.to(socketid) wasnt working so get the socket directly from io.sockets.sockets
    const targetSocket = io.sockets.sockets.get(player.socketId);

    // Check socket exists
    if (!targetSocket) {
      clearTimeout(timeoutHandle);
      pendingCodeRequests.delete(player.userId);
      resolve({
        player,
        codeInput: starterCode["javascript"],
        language: "javascript",
      });
      return;
    }

    // Request current code
    targetSocket.emit("request-code", {}, (response) => {
      clearTimeout(timeoutHandle);
      pendingCodeRequests.delete(player.userId);
      resolve({
        player,
        codeInput: response.codeInput,
        language: response.language,
      });
    });
  });
};
