import db from "../db.js";
import runCode from "../executor.js";

// Helper to process player submission
export const processSubmission = async (
  room,
  code,
  player,
  codeInput,
  language,
  submitTime,
) => {
  player.submitted = true;
  player.submitTime = submitTime;

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
