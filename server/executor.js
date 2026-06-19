import vm from "vm";

const runCode = (userCode, testCases) => {
  const results = testCases.map(({ input, expected }) => {
    try {
      // Create blank sandbox
      const sandbox = {};
      vm.createContext(sandbox);

      // Run user code in sandbox
      vm.runInContext(userCode, sandbox, { timeout: 3000 });

      // Call the function with the test case input
      const received = vm.runInContext(`solution(${input})`, sandbox, {
        timeout: 3000,
      });

      // Compare received output with expected output
      const passed = JSON.stringify(received) === JSON.stringify(expected);
      return { input, expected, received, passed };
    } catch (err) {
      return { input, expected, received: err.message, passed: false };
    }
  });

  return {
    passed: results.every((r) => r.passed),
    results,
  };
};

export default runCode;
