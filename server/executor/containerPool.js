// Imports
import languageConfig from "./languageConfig.js";
import { execAsync } from "./execHelper.js";

// CONFIG
const usePool = true;
const languagePoolSize = {
  python: 2,
  javascript: 2,
  cpp: 2,
};
const pool = {};

// Helper to fix pool
const removeContainer = async (containerId) => {
  // Remove the failed container
  try {
    await execAsync(`docker rm -f ${containerId}`, { timeout: 5000 });
  } catch (error) {
    console.error(`Error removing failed container ${containerId}:`, error);
  }
};

// Helper to check container
const checkContainer = async (containerId) => {
  try {
    const { stdout } = await execAsync(
      `docker inspect --format="{{.State.Running}}" ${containerId}`,
      { timeout: 5000 },
    );
    return stdout.trim() === "true";
  } catch (error) {
    console.error(`Error checking container ${containerId}:`, error);
    return false;
  }
};

// Helper to replenish container
const replenishContainer = async (language) => {
  if (!usePool) {
    return;
  }

  // Replenish the pool asynchronously
  try {
    const config = languageConfig[language];
    const { stdout: id } = await execAsync(
      `docker run -d --label pool=code-chamber --network none --memory 256m --cpus 0.5 ${config.image} tail -f /dev/null`,
      { timeout: 5000 },
    );
    pool[language].push(id.trim());
  } catch (error) {
    console.error(
      `Error replenishing container for language: ${language}`,
      error,
    );
  }
};

// Get a container
export const getContainer = async (language, forceCreate = false) => {
  // Track start time
  const startTime = Date.now();

  // Create container if pool is disabled or no containers are available
  if (
    forceCreate ||
    !usePool ||
    !pool[language] ||
    pool[language].length <= 0
  ) {
    console.error(
      `No available containers for language: ${language}... Creating a new one`,
    );
    try {
      const config = languageConfig[language];
      let { stdout: id } = await execAsync(
        `docker run -d --label pool=code-chamber --network none --memory 256m --cpus 0.5 ${config.image} tail -f /dev/null`,
        { timeout: 5000 },
      );
      id = id.trim();
      console.log(
        `Container creation took: ${(Date.now() - startTime) / 1000}s`,
      );
      return id;
    } catch (error) {
      console.error(
        `Error creating container for language: ${language}`,
        error,
      );
      return null;
    }
  }

  // Otherwise return a container from the pool
  const containerId = pool[language].pop();
  // Check if this container is valid
  const isValid = await checkContainer(containerId);
  if (!isValid) {
    console.error(
      `Container ${containerId} for language: ${language} is invalid.`,
    );
    // Remove container
    removeContainer(containerId);
    // Force create a new container
    return await getContainer(language, true);
  }

  // Replenish the pool asynchronously
  replenishContainer(language);

  // Otherwise return a container from the pool
  console.log(`Container retrieval took: ${(Date.now() - startTime) / 1000}s`);
  return containerId;
};

// Clean old pool helper
const cleanOldPool = async () => {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "label=pool=code-chamber" -q`,
      { timeout: 10000 },
    );
    const ids = stdout.trim().split("\n").filter(Boolean);
    for (const id of ids) {
      await execAsync(`docker rm -f ${id}`, { timeout: 5000 }).catch(() => {});
    }
    if (ids.length > 0) {
      console.log(`Cleaned up ${ids.length} containers`);
    }
  } catch (error) {
    console.error("Error cleaning up orphaned containers:", error);
  }
};

// Start pool
export const startPool = async () => {
  // Check if pool is enabled
  if (!usePool) {
    return;
  }

  // Check if pool is already started
  if (Object.keys(pool).length > 0) {
    console.log("Container pool already started");
    return;
  }

  // Clean up any old pool containers
  await cleanOldPool();

  // Start containers for each language
  for (const language of Object.keys(languagePoolSize)) {
    const config = languageConfig[language];
    const size = languagePoolSize[language];
    pool[language] = [];
    for (let i = 0; i < size; i++) {
      const { stdout: id } = await execAsync(
        `docker run -d --label pool=code-chamber --network none --memory 256m --cpus 0.5 ${config.image} tail -f /dev/null`,
        { timeout: 5000 },
      );
      pool[language].push(id.trim());
    }
  }

  // Log pool status
  console.log("Container pool started");
};

// Stop pool
export const stopPool = async () => {
  // Get all ids
  const allIds = Object.values(pool).flat();
  if (allIds.length === 0) {
    console.log("Container pool already stopped");
    return;
  }

  await Promise.all(
    allIds.map(async (id) => {
      try {
        await execAsync(`docker rm -f ${id}`, { timeout: 5000 });
      } catch (error) {
        console.error(`Error stopping container ${id}`, error);
      }
    }),
  );

  // Clear the pool
  for (const language of Object.keys(pool)) {
    pool[language] = [];
  }
  console.log("Container pool stopped");
};
