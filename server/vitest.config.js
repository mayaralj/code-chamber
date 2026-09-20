export default {
  test: {
    maxConcurrency: 8,
    testTimeout: 30000,
    env: {
      POOL_LABEL: "code-chamber-test",
    },
  },
};
