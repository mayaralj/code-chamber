import db from "../../db.js";
import runCode from "../../executor/executor.js";
import { buildPlayerList } from "../../utils/playerList.js";
import { rooms } from "../../globals.js";

// Config
const availableLanguages = ["javascript", "python", "cpp"];

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
export const notifySubmission = (io, socketId, room, code, result) => {
  // Build a player list with needed data
  const playerList = buildPlayerList(room);

  // Extract test cases result
  const { testCasesResults } = result;

  // Notify player that code has been submitted + send test cases results
  console.log(
    `Notifying player ${socketId} of code submission with test cases results:`,
    testCasesResults,
  );
  io.to(socketId).emit("code-submitted", testCasesResults);

  // Emit to all players with list of submitted players
  io.to(code).emit("update-players", {
    players: playerList,
  });
};

// Helper to update players db with submission results
export const trackSubmission = async (player, result, roomId, roundNumber) => {
  // Validate
  if (!player || !player.userId || player.isGuest) {
    console.log("No player to update submission for");
    return;
  }
  if (!result) {
    console.log("No result to update submission for");
    return;
  }
  if (!roomId || !roundNumber) {
    console.log("No roomId or roundNumber to update submission for");
    return;
  }

  const {
    numOfTestCases,
    testCasesPassed,
    executionTime,
    submitTime,
    passed,
    languageUsed,
    difficulty,
  } = result;

  if (
    !Number.isFinite(testCasesPassed) ||
    !Number.isFinite(executionTime) ||
    !Number.isFinite(submitTime) ||
    typeof passed !== "boolean" ||
    typeof languageUsed !== "string" ||
    typeof difficulty !== "string"
  ) {
    console.error(`Invalid submission stats for ${player.username}, skipping`);
    return;
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO submissions (
       user_id, room_id, round_number, language, difficulty, passed,
       execution_time, submit_time,  total_test_cases, test_cases_passed
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
      [
        player.userId,
        roomId,
        roundNumber,
        languageUsed,
        difficulty,
        passed,
        executionTime,
        submitTime,
        numOfTestCases,
        testCasesPassed,
      ],
    );
    return rows[0]?.id;
  } catch (error) {
    console.error(
      `Error inserting submission for player ${player.username} in room ${roomId}:`,
      error,
    );
  }
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
  // Get room
  const room = rooms[code];
  if (!room) {
    io.to(player.socketId).emit("submit-code-error", {
      message: "Room not found",
    });
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

  // Check if language is valid for this question
  if (!availableLanguages.includes(language)) {
    io.to(player.socketId).emit("submit-code-error", {
      message: "Invalid language",
    });
    return;
  }

  // Get round data
  const roundData = room.roundData[room.currentRound];

  // Init round results
  if (!roundData.roundResults) {
    roundData.roundResults = [];
  }
  console.log(`Round difficulty: ${roundData.question.difficulty}`);
  // Mark player as judging
  playerRoundData.judging = true;
  notifyJudging(io, player.socketId, room, code);

  let testCases;
  let functionName;
  try {
    // Fetch test cases for the current question
    const { rows: fetchedTestCases } = await db.query(
      "SELECT input, expected FROM test_cases WHERE question_id = $1",
      [roundData.question.id],
    );
    testCases = fetchedTestCases;

    // Fetch the function name from starter_code table
    const { rows } = await db.query(
      "SELECT function_name FROM starter_code WHERE question_id = $1 AND language = $2",
      [roundData.question.id, language],
    );
    functionName = rows[0]?.function_name;
  } catch (error) {
    console.error("Error fetching submission metadata:", error);
    playerRoundData.judging = false;
    io.to(player.socketId).emit("submit-code-error", {
      message: "Failed to process submission",
    });
    return;
  }

  // Run the code against the test cases (handle missing code gracefully)
  const result = codeInput
    ? await runCode(language, codeInput, functionName, testCases)
    : {
        languageUsed: language,
        passed: false,
        testCasesPassed: 0,
        error: "Failed to run code",
      };

  // Fill in the result object with additional information
  result.submitTime = submitTime;
  result.player = player;
  result.difficulty = roundData.question.difficulty;
  result.numOfTestCases = testCases.length;

  // Update player stats in the database
  // Dont update if execution error'd
  if (result?.error) {
    console.log(
      `Player ${player.username} had an execution error, skipping db update`,
    );
  } else {
    // Update the submission in the database and get the submission ID
    result.submissionId = await trackSubmission(
      player,
      result,
      room.roomId,
      room.currentRound,
    );
  }

  // Update player status
  playerRoundData.judging = false;
  playerRoundData.submitted = true;
  notifySubmission(io, player.socketId, room, code, result);

  // Store results in current round results
  roundData.roundResults.push(result);

  // Update round results average execution time for this round for this specific language
  if (!roundData.averageExecutionTime) {
    roundData.averageExecutionTime = {};
  }
  if (!roundData.averageExecutionTime[language]) {
    roundData.averageExecutionTime[language] = result.executionTime || 0;
  } else if (result.executionTime) {
    roundData.averageExecutionTime[language] =
      (roundData.averageExecutionTime[language] + result.executionTime) /
      roundData.roundResults.length;
  }

  return result;
};

// Helper to get player code
const getPlayerCode = (
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

const getUnsubmittedPlayers = (room, code, curRound) => {
  // List all unsubmitted players (not submitted and not judging)
  const unsubmittedPlayers = rooms[code].players.filter((p) => {
    const playerRoundData = p?.gameData?.roundData?.[curRound];
    return !playerRoundData?.submitted && !playerRoundData?.judging;
  });
  return unsubmittedPlayers;
};

// Helper to get player code all
export const getPlayerCodeAll = async (
  io,
  code,
  roundData,
  curRound,
  FORCE_SUBMIT_TIMEOUT,
) => {
  // Get all unsubmitted players
  const unsubmittedPlayers = getUnsubmittedPlayers(rooms[code], code, curRound);

  // Force submit all players
  const allPlayerCode = await Promise.all(
    unsubmittedPlayers.map((player) => {
      console.log(
        `Requesting force submit for player ${player.username} in room ${code}`,
      );
      return getPlayerCode(
        player,
        io,
        rooms[code].pendingCodeRequests,
        roundData.question.starterCode,
        FORCE_SUBMIT_TIMEOUT,
      );
    }),
  );

  // Return all player code
  return allPlayerCode;
};

// Helper to handle code submission (only from manual submission)
export const handleSubmitCode = async (io, socket, submitData) => {
  // Destructure submit data
  const { code, codeInput, language, timeSubmitted } = submitData;

  // Check if room is valid
  const room = rooms[code];
  if (!room) {
    socket.emit("submit-code-error", { message: "Room not found" });
    return;
  }

  // Check if player is valid and not already submitted or judging
  const player = room.players.find((p) => p.userId === socket.data.id);
  if (!player) {
    return;
  }
  // Check for reconnecting player
  if (player.isReconnecting) {
    return;
  }
  const playerRoundData = player?.gameData?.roundData?.[room.currentRound];
  if (
    !playerRoundData ||
    playerRoundData?.submitted ||
    playerRoundData?.judging
  ) {
    return;
  }

  // Get round data
  const roundData = room.roundData[room.currentRound];
  if (!roundData) {
    socket.emit("submit-code-error", { message: "No round data found" });
    return;
  }

  // Check if submissions are allowed
  if (!roundData.submissionsAllowed) {
    return;
  }

  // Validate time submitted
  if (typeof timeSubmitted !== "number" || isNaN(timeSubmitted)) {
    socket.emit("submit-code-error", { message: "Invalid time submitted" });
    return;
  }

  // Check if time submitted is way to off current time
  const currentTime = Date.now();
  if (Math.abs(timeSubmitted - currentTime) > 5000) {
    // 5 second window
    socket.emit("submit-code-error", {
      message: "Time submitted is out of bounds",
    });
    return;
  }

  // Get the submit time
  const roundStartTime = roundData.roundStartTime || Date.now();
  const submitTime = (timeSubmitted - roundStartTime) / 1000;

  // Init pending submissions map if not already
  if (!roundData.pendingSubmissions) {
    roundData.pendingSubmissions = new Map();
  }

  // Store submission promise
  const submissionPromise = processSubmission(
    io,
    code,
    player,
    codeInput,
    language,
    submitTime,
  );

  // Set in the map
  roundData.pendingSubmissions.set(player.socketId, submissionPromise);

  // Wait for submission to finish
  await submissionPromise;

  // Delete from the map
  roundData.pendingSubmissions.delete(player.socketId);

  // If all players have submitted, stop game timer to send all results
  if (
    room.players.every(
      (p) => p?.gameData?.roundData?.[room.currentRound]?.submitted,
    )
  ) {
    if (roundData.cancelRoundTimer) {
      console.log(
        `All players have submitted in room ${code}, cancelling round timer`,
      );
      roundData.cancelRoundTimer();
    }
  }
};

// Helper to force submit all players (used when round timer finishes)
export const forceSubmitAll = async (
  io,
  code,
  unsubmittedPlayersCode,
  ROUND_TIMER,
) => {
  // Process all of the unsubmitted players code and force submit them
  await Promise.all(
    unsubmittedPlayersCode.map(({ player, codeInput, language }) => {
      console.log(`Force submitting player ${player.username} in room ${code}`);
      return processSubmission(
        io,
        code,
        player,
        codeInput,
        language,
        ROUND_TIMER,
      );
    }),
  );
};
