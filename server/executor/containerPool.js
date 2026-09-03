// Imports
import languageConfig from "./languageConfig.js";
import { execAsync } from "./execHelper.js";

// CONFIG
const usePool = true;
const languagePoolSize = {
  python: 3,
  javascript: 3,
  cpp: 3,
};
const MAX_RETRIES = 3;
const pool = {};

// Helper to create a container
const createContainer = async (language, timeout = 30000) => {
  const config = languageConfig[language];
  const { stdout: id } = await execAsync(
    `docker run -d --label pool=code-chamber --network none \
  --memory 256m --memory-swap 256m --cpus 0.5 --pids-limit 64 \
  --cap-drop ALL --security-opt no-new-privileges \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid \
  --tmpfs /sandbox:rw,exec,nosuid \
  ${config.image} tail -f /dev/null`,
    { timeout },
  );
  return id.trim();
};

// Helper to remove a container
const removingContainers = new Set();
export const removeContainer = async (containerId) => {
  // Avoid removing the same container multiple times
  if (removingContainers.has(containerId)) {
    return;
  }
  removingContainers.add(containerId);
  try {
    await execAsync(`docker rm -f ${containerId}`, { timeout: 10000 });
  } catch (error) {
    console.error(`Error removing failed container ${containerId}:`, error);
  } finally {
    removingContainers.delete(containerId);
  }
};

// Helper to check container
const checkContainer = async (containerId) => {
  try {
    const { stdout } = await execAsync(`docker inspect  ${containerId}`, {
      timeout: 5000,
    });
    const info = JSON.parse(stdout);
    return info[0]?.State?.Running === true;
  } catch (error) {
    console.error(`Error checking container ${containerId}:`, error);
    return false;
  }
};

// Helper to replenish container
const replenishContainer = async (language, attempt = 1) => {
  if (!usePool) {
    return;
  }

  // Replenish the pool asynchronously
  try {
    pool[language].push(await createContainer(language));
  } catch (error) {
    console.error(
      `Error replenishing container for language: ${language} attempt ${attempt} of ${MAX_RETRIES}`,
      error,
    );
    if (attempt < MAX_RETRIES) {
      console.log(`Retrying replenishContainer for language: ${language}`);
      // Wait for a short delay before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await replenishContainer(language, attempt + 1);
    } else {
      console.error(
        `Failed to replenish container for language: ${language} after ${MAX_RETRIES} attempts`,
      );
    }
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
      const id = await createContainer(language, 10000);
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
  // Get all old pool containers
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "label=pool=code-chamber" -q`,
      { timeout: 10000 },
    );
    const ids = stdout.trim().split("\n").filter(Boolean);
    // Check if no ids
    if (ids.length === 0) {
      console.log("No old pool containers to clean up");
      return;
    }
    // Cleanup in parallel
    await Promise.all(
      ids.map((id) =>
        execAsync(`docker rm -f ${id}`, {
          timeout: 30000,
        }).catch(() => {}),
      ),
    );
    console.log(`Cleaned up ${ids.length} old pool containers`);
  } catch (error) {
    // Log error
    console.error("Error cleaning up old containers:", error);
  }
};

// Start pool
export const startPool = async () => {
  // Check if pool is enabled
  if (!usePool) {
    return;
  }

  // Check if pool already started
  if (Object.keys(pool).length > 0) {
    console.log("Container pool already started");
    return;
  }

  // Clean up any old pool containers
  await cleanOldPool();

  // Start containers for each language in parallel
  await Promise.all(
    Object.keys(languagePoolSize).map(async (language) => {
      const size = languagePoolSize[language];
      pool[language] = [];
      await Promise.all(
        Array.from({ length: size }, async () => {
          try {
            const id = await createContainer(language);
            pool[language].push(id);
          } catch (error) {
            console.error(
              `Error creating container for language: ${language}`,
              error,
            );

            // Call replenishContainer to try to create a new container
            await replenishContainer(language);
          }
        }),
      );
    }),
  );

  // Log pool status
  console.log("Container pool started");
};

// Stop pool
export const stopPool = async () => {
  console.log("Stopping container pool...");
  // clean all the old containers
  await cleanOldPool();

  // Clear the pool
  for (const language of Object.keys(pool)) {
    pool[language] = [];
  }
  console.log("Container pool stopped");
};
