// Sleep helper
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cancellable sleep helper
export const cancellableSleep = (ms) => {
  // Create a promise and store resolve
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });

  // Create a timeout to resolve the promise after the specified time
  const timeout = setTimeout(() => {
    resolve();
  }, ms);

  // allow it to be cancellable
  const cancel = () => {
    clearTimeout(timeout);
    resolve();
  };

  // return the promise and the cancel function
  return { promise, cancel };
};
