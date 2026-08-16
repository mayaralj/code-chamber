import { stopPool } from "./executor/containerPool.js";
import { rooms } from "./globals.js";
import db from "./db.js";

// Helper to clean up in-progress matches from the db on shutdown ( will cascade through to submissions and matches )
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

  await db.query(`DELETE FROM matches WHERE room_id = ANY($1::text[])`, [
    activeRoomIds,
  ]);
};

// Shutdown handler
const serverShutdown = async (signal) => {
  console.log(`---SHUTTING DOWN SERVER (${signal})---`);
  try {
    await purgeActiveRooms();
  } catch (error) {
    console.error("Error purging active rooms:", error);
  }

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
