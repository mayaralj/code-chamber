import db from "../db.js";
import runCode from "../executor.js";

// Helper to notify players of code judging
export const notifyJudging = (io, socketId, room, code) => {
  // Build a list of all judging players
  const judgingPlayers = room.players
    .filter((p) => p.judging)
    .map((p) => p.username);

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
    .map((p) => p.username);

  // Notify player that code has been submitted
  io.to(socketId).emit("code-submitted");

  // Emit to all players with list of submitted players
  io.to(code).emit("submitted-players", {
    submittedPlayers,
  });
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

  // Mark player as judging
  player.judging = true;
  player.submitTime = submitTime;
  notifyJudging(io, player.id, room, code);

  // Fetch test cases for the current question
  const { rows: testCases } = await db.query(
    "SELECT input, expected FROM test_cases WHERE question_id = $1",
    [room.currentQuestion.id],
  );

  // Fetch the function name from starter_code table
  const { rows } = await db.query(
    "SELECT function_name FROM starter_code WHERE question_id = $1 AND language = $2",
    [room.currentQuestion.id, language],
  );
  const functionName = rows[0]?.function_name;

  // Run the code against the test cases (handle missing code gracefully)
  const results = codeInput
    ? runCode(codeInput, functionName, testCases)
    : { testResults: [], passed: false };

  results.submitTime = submitTime;

  // Update player status
  player.judging = false;
  player.submitted = true;
  notifySubmission(io, player.id, room, code);

  // Store results in current round results
  room.roundResults.push({
    username: player.username,
    results,
  });

  return results;
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
