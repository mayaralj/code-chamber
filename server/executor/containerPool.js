// Imports
import languageConfig from "./languageConfig.js";
import { execAsync } from "./execHelper.js";

// CONFIG
const usePool = true;
const languagePoolSize = {
  python: 1,
  javascript: 1,
  cpp: 1,
};
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Cleanup any old pool containers that failed to be removed every interval
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const pool = {};

// Store known containers so we can sweep orphaned ones that docker still knows about but we don't.
const knownContainers = new Set();
let sweepTimer = null;

// Helper to create a single container (one attempt)
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
  const containerId = id.trim();
  knownContainers.add(containerId);
  return containerId;
};

// Helper to create a container with retries
const createContainerWithRetry = async (
  language,
  timeout = 30000,
  maxRetries = MAX_RETRIES,
) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createContainer(language, timeout);
    } catch (error) {
      lastError = error;
      console.error(
        `Error creating container for language: ${language}, attempt ${attempt} of ${maxRetries}`,
        error,
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
};

// Remove container with retries
const removingContainers = new Set();
export const removeContainer = async (
  containerId,
  maxRetries = MAX_RETRIES,
) => {
  if (removingContainers.has(containerId)) {
    return;
  }
  removingContainers.add(containerId);
  knownContainers.delete(containerId);

  // Try removing the container with retries
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await execAsync(`docker rm -f ${containerId}`, { timeout: 10000 });
        return;
      } catch (error) {
        console.error(
          `Error removing container ${containerId}, attempt ${attempt} of ${maxRetries}:`,
          error,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          console.error(
            `Giving up removing container ${containerId} after ${maxRetries} attempts. It will be caught by the next orphan sweep.`,
          );
        }
      }
    }
  } finally {
    // Regardless of success or failure, ensure we remove it from the set of containers being removed
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

// Helper to replenish the pool for a specific language
const replenishingLanguages = new Set();
const replenishContainer = async (language) => {
  if (!usePool) return;

  // If replenishment is already in progress for this language, skip this attempt
  if (replenishingLanguages.has(language)) {
    console.log(
      `Replenishment already in progress for language: ${language}, skipping this attempt.`,
    );
    return;
  }

  // Mark this language as being replenished
  replenishingLanguages.add(language);
  try {
    // Try replenishing the container with retries
    const id = await createContainerWithRetry(language);
    pool[language].push(id);
  } catch (error) {
    console.error(
      `Failed to replenish container for language: ${language} after ${MAX_RETRIES} attempts`,
      error,
    );
  } finally {
    replenishingLanguages.delete(language);
  }
};

// Get a container
export const getContainer = async (language) => {
  const startTime = Date.now();

  if (!pool[language] || pool[language].length <= 0) {
    console.error(
      `No available container for language: ${language}... Creating a new one`,
    );
    try {
      const id = await createContainerWithRetry(language, 10000);
      console.log(
        `Container creation took: ${(Date.now() - startTime) / 1000}s`,
      );
      replenishContainer(language); // refill container pool asynchronously while this one is used
      return id;
    } catch (error) {
      console.error(
        `Error creating container for language: ${language}`,
        error,
      );
      return null;
    }
  }

  const containerId = pool[language].pop();
  const isValid = await checkContainer(containerId);

  if (!isValid) {
    console.error(
      `Container ${containerId} for language: ${language} is invalid. Replacing it and using the replacement for this request.`,
    );
    removeContainer(containerId); // Remove the invalid container
    try {
      const freshId = await createContainerWithRetry(language, 10000);
      console.log(
        `Created replacement container for language: ${language}, took: ${(Date.now() - startTime) / 1000}s`,
      );
      replenishContainer(language); // refill container pool asynchronously while this one is used
      return freshId;
    } catch (error) {
      console.error(
        `Failed to create replacement container for language: ${language}`,
        error,
      );
      return null;
    }
  }

  // Replenish the pool asynchronously while this one is used
  replenishContainer(language);

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
    if (ids.length === 0) {
      console.log("No old pool containers to clean up");
      return;
    }
    await Promise.all(
      ids.map((id) =>
        execAsync(`docker rm -f ${id}`, {
          timeout: 30000,
        }).catch(() => {}),
      ),
    );
    console.log(`Cleaned up ${ids.length} old pool containers`);
  } catch (error) {
    console.error("Error cleaning up old containers:", error);
  }
};

// Cleanup containers that are no longer in the pool (orphaned containers)
const sweepOrphanedContainers = async () => {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --filter "label=pool=code-chamber" -q --no-trunc`,
      { timeout: 10000 },
    );
    const ids = stdout.trim().split("\n").filter(Boolean);
    const orphans = ids.filter((id) => !knownContainers.has(id));

    if (orphans.length === 0) {
      return;
    }

    console.warn(
      `Sweep found ${orphans.length} orphaned pool container(s), removing:`,
      orphans,
    );
    await Promise.all(
      orphans.map((id) =>
        execAsync(`docker rm -f ${id}`, { timeout: 30000 }).catch((error) =>
          console.error(`Sweep failed to remove orphan ${id}:`, error),
        ),
      ),
    );
  } catch (error) {
    console.error("Error sweeping orphaned containers:", error);
  }
};

// Start pool
export const startPool = async () => {
  if (!usePool) {
    return;
  }

  if (Object.keys(pool).length > 0) {
    console.log("Container pool already started");
    return;
  }

  await cleanOldPool();

  await Promise.all(
    Object.keys(languagePoolSize).map(async (language) => {
      const size = languagePoolSize[language];
      pool[language] = [];
      await Promise.all(
        Array.from({ length: size }, async () => {
          try {
            const id = await createContainerWithRetry(language);
            pool[language].push(id);
          } catch (error) {
            console.error(
              `Error creating initial container for language: ${language} after ${MAX_RETRIES} attempts`,
              error,
            );
            // will self-heal via players executing and replenishing the pool asynchronously
          }
        }),
      );
    }),
  );

  sweepTimer = setInterval(sweepOrphanedContainers, SWEEP_INTERVAL_MS);
  console.log("Container pool started");
};

// Stop pool
export const stopPool = async () => {
  console.log("Stopping container pool...");

  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }

  await cleanOldPool();

  knownContainers.clear();
  for (const language of Object.keys(pool)) {
    pool[language] = [];
  }
  console.log("Container pool stopped");
};
