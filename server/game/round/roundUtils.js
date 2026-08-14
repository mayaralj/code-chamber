// Imports
import { cancellableSleep } from "../../utils/timers.js";
import { buildPlayerList } from "../../utils/playerList.js";
import { rooms } from "../../globals.js";
import db from "../../db.js";

// Helper to wait for reconnecting players to reconnect or timeout
export const waitForReconnectingPlayers = async (io, code) => {
  // Get room and round data
  const room = rooms[code];
  if (!room) {
    console.log(`Room ${code} not found for waiting for reconnecting players`);
    return;
  }
  const roundData = room.roundData[room.currentRound];
  if (!roundData) {
    console.log(`Round data not found for room ${code}`);
    return;
  }

  // If any players are reconnecting, sleep until they reconnect or timeout
  const reconnectingPlayersCount = rooms[code].players.filter(
    (p) => p.isReconnecting,
  ).length;
  if (reconnectingPlayersCount > 0) {
    console.log(
      `Room ${code} has ${reconnectingPlayersCount} reconnecting players, waiting for them to reconnect...`,
    );
    io.to(code).emit("waiting-for-reconnect");
    // Store a cancellable sleep
    const { promise: reconnectSleepPromise, cancel: cancelReconnectSleep } =
      cancellableSleep(1000 * 60 * 5);
    roundData.reconnectSleepCancel = cancelReconnectSleep;
    await reconnectSleepPromise;
    roundData.reconnectSleepCancel = null;
    console.log(
      `Room ${code} finished waiting for reconnecting players, continuing to process round`,
    );
    io.to(code).emit("players-reconnected", {
      players: buildPlayerList(rooms[code]),
    });
  }
};

// Build reconnecting data for the game so its easy to send to players that reconnet
export const buildReconnectData = (room, phase) => {
  // Gather base data
  const roundData = room.roundData[room.currentRound];
  const base = {
    phase,
    code: room.code,
    curRound: room.currentRound,
    players: buildPlayerList(room),
    question: roundData.question,
    beforeRoundEvents: roundData.roundEvents?.beforeRound,
  };

  if (
    phase === "countdown" ||
    phase === "game-started" ||
    phase === "new-round"
  ) {
    room.reconnectData = {
      ...base,
      endsAt: roundData.endsAt,
    };
  } else if (phase === "round-tick") {
    room.reconnectData = {
      ...base,
      roundEndsAt: roundData.roundEndsAt,
      timeMultiplier: roundData.roundEvents?.beforeRound?.fasterTimer || 1,
    };
  } else if (phase === "results") {
    room.reconnectData = {
      ...base,
      roundResults: roundData.roundResults,
      eliminatedPlayers: roundData.eliminatedPlayers,
      missedPlayer: roundData.missedPlayer,
      winner: roundData.winner,
    };
  }
};

// On first round start, emit game-started to all players
export const firstRoundStart = (io, code, roundData) => {
  // Build reconnect data
  buildReconnectData(rooms[code], "game-started");
  io.to(code).emit("game-started", {
    code,
    serverPlayers: buildPlayerList(rooms[code]),
    endsAt: roundData.endsAt,
    question: roundData.question,
    beforeRoundEvents: roundData.roundEvents?.beforeRound,
  });
};

// On every other round
export const otherRoundStart = (io, code, roundData, curRound) => {
  // Emit to each client that new round is starting and send updated player list
  // Build reconnect data
  buildReconnectData(rooms[code], "new-round");
  io.to(code).emit("new-round", {
    currentRound: curRound,
    newEndsAt: roundData.endsAt,
    question: roundData.question,
    beforeRoundEvents: roundData.roundEvents?.beforeRound,
    players: buildPlayerList(rooms[code]),
  });
};

// Helper to start round timer
export const startRoundTimer = async (io, code, roundData, ROUND_TIMER) => {
  // Grab round events
  const roundEvents = roundData.roundEvents;

  // Save start round time
  roundData.roundStartTime = Date.now();
  const timeMultiplier = roundEvents?.beforeRound?.fasterTimer || 1;
  roundData.roundEndsAt = Date.now() + 1000 * ROUND_TIMER;

  // Start game timer
  buildReconnectData(rooms[code], "round-tick");
  io.to(code).emit("round-tick", {
    roundEndsAt: roundData.roundEndsAt, // No multiplier applied since it will handle it visually
    timeMultiplier,
  });

  // Update server with multiplier tho
  roundData.roundEndsAt = Date.now() + 1000 * (ROUND_TIMER / timeMultiplier);

  // Allow submissions now
  roundData.submissionsAllowed = true;

  // Wait for round timer to finish or be cancelled
  // Only start round timer if enough players are still in the room
  if (rooms[code].players.length > 0) {
    // Create a new promise and cancel function for the round timer
    const { promise: roundTimerPromise, cancel: cancelRoundTimer } =
      cancellableSleep((ROUND_TIMER / timeMultiplier) * 1000);

    // Save the cancel function in the room so it can be cancelled if all players submit early
    roundData.cancelRoundTimer = cancelRoundTimer;
    await roundTimerPromise;
    // Clear the cancel function from the room
    roundData.cancelRoundTimer = null;
  }
};

// Helper to update matches table for player
export const trackMatch = async (player, roomId, isWinner) => {
  // Validate
  if (!player || !player.userId || player.isGuest) return;
  if (!roomId) return;

  await db.query(
    `UPDATE matches SET won = $1 WHERE room_id = $2 AND user_id = $3`,
    [isWinner, roomId, player.userId],
  );
  console.log(
    `Updated match for player ${player.username} in room ${roomId}, won: ${isWinner}`,
  );
};
