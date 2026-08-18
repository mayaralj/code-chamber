import { stopPool } from "./executor/containerPool.js";
import { rooms } from "./globals.js";
import { stopLeaderboardCompute } from "./leaderboard/precomputeLeaderboard.js";
import { stopLiveStatsCompute } from "./liveStats/precomputeLiveStats.js";
import db from "./db.js";

// Helper to clean up in-progress matches from the db via rooms table on shutdown ( will cascade through to submissions and matches )
const purgeActiveRooms = async () => {
  const activeRoomIds = Object.values(rooms)
    .filter((room) => room.gameStarted)
    .map((room) => room.roomId);

  if (!activeRoomIds.length) {
    console.log("No active rooms to purge");
    return;
  }

  console.log(
    `Purging ${activeRoomIds.length} active room(s): ${activeRoomIds.join(", ")}`,
  );

  await db.query(`DELETE FROM rooms WHERE room_id = ANY($1::text[])`, [
    activeRoomIds,
  ]);
};

// Shutdown handler
const serverShutdown = async (signal) => {
  console.log(`---SHUTTING DOWN SERVER (${signal})---`);
  // Purge active rooms from the database
  try {
    await purgeActiveRooms();
  } catch (error) {
    console.error("Error purging active rooms:", error);
  }

  // Stop leaderboard precomputation
  try {
    await stopLeaderboardCompute();
  } catch (error) {
    console.error("Error during leaderboard shutdown:", error);
  }

  // Stop live stats precomputation
  try {
    await stopLiveStatsCompute();
  } catch (error) {
    console.error("Error during live stats shutdown:", error);
  }

  // Stop the container pool
  try {
    await stopPool();
  } catch (error) {
    console.error("Error during pool shutdown:", error);
  } finally {
    console.log("SERVER HAS BEEN SHUTDOWN");
    process.exit(0);
  }
};

// Register shutdown signals
export const registerShutdownSignals = () => {
  process.on("SIGINT", async () => {
    process.exitCode = 0;
    await serverShutdown("SIGINT");
  });
  process.on("SIGTERM", async () => {
    process.exitCode = 0;
    await serverShutdown("SIGTERM");
  });
};
