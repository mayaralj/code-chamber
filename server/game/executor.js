import vm from "vm";
import { execSync } from "child_process";

// Config
const languageConfig = {
  // JS
  javascript: {
    image: "node:alpine",
    run: (userCode) => `node -e ${JSON.stringify(userCode)}`,
  },

  // Python
  python: {
    image: "python:alpine",
    run: (userCode) => `python -c ${JSON.stringify(userCode)}`,
  },

  // C++
  cpp: {
    image: "gcc:alpine",
    run: (userCode) =>
      `echo ${JSON.stringify(userCode)} | g++ -x c++ -o /tmp/a.out - && /tmp/a.out`,
  },
};

// Executor
const runCode = (language, userCode, functionName, testCases) => {
  const config = languageConfig[language];
  // Check  language is supported
  if (!config) {
    return {
      passed: false,
      testCasesPassed: 0,
      executionTime: 0,
      testResult: "Language not supported",
    };
  }

  // Test cases passed
  let testCasesPassed = 0;
  // Start time
  const startTime = Date.now();
  // Test result
  const testResult = [];

  // Loop through test cases and run code in docker container
  for (const { input, expected } of testCases) {
    try {
      // Create code to run in docker container
      const code = `${userCode}
      const result = ${functionName}(${input});
      console.log(JSON.stringify(result));`;

      // Convert code to single line only with no comments (clean up all the format)
      const cleanedCode = code
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\s+/g, " ");

      // Run code in docker container
      const output = execSync(
        `docker run --rm --network none --memory 64m --cpus 0.5 ${config.image} ${config.run(cleanedCode)}`,
        { timeout: 5000 },
      )
        .toString()
        .trim();

      // Parse output
      const received = JSON.parse(output);
      // Compare
      const passed = JSON.stringify(received) === JSON.stringify(expected);

      // Push result
      if (passed) testCasesPassed++;
      testResult.push({ input, expected, received, passed });
    } catch (err) {
      testResult.push({
        input,
        expected,
        received: err.message,
        passed: false,
      });
    }
  }

  // End time
  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;

  // Return result
  return {
    passed: testResult.every((r) => r.passed),
    testCasesPassed,
    executionTime,
    testResult,
  };
};

// JS only using vm module to run code in a sandboxed environment (unsafe version)
const testRunCode = (userCode, functionName, testCases) => {
  let testCasesPassed = 0;
  const startTime = Date.now();
  const testResult = testCases.map(({ input, expected }) => {
    try {
      // Create blank sandbox
      const sandbox = {};
      vm.createContext(sandbox);

      // Run user code in sandbox
      vm.runInContext(userCode, sandbox, { timeout: 3000 });

      // Call the function with the test case input
      const received = vm.runInContext(`${functionName}(${input})`, sandbox, {
        timeout: 3000,
      });

      // Compare received output with expected output
      const passed = JSON.stringify(received) === JSON.stringify(expected);
      if (passed) testCasesPassed++;

      return { input, expected, received, passed };
    } catch (err) {
      return {
        input,
        expected,
        received: err.message,
        passed: false,
      };
    }
  });

  // End time
  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;

  return {
    passed: testResult.every((r) => r.passed),
    testCasesPassed,
    executionTime,
    testResult,
  };
};

export default runCode;
