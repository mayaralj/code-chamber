// Helper function to add a timeout to a promise
export const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error("Request timed out. Server may be unavailable.")),
        ms,
      ),
    ),
  ]);
};
