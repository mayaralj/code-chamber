import vm from "vm";
import pLimit from "p-limit";
import { execAsync, execWithStdin, cleanErrorMessage } from "./execHelper.js";
import languageConfig from "./languageConfig.js";
import { getParamTypes } from "./cpp/cppHelpers.js";
import { getContainer } from "./containerPool.js";

// Config
const MAX_CONCURRENT_EXECUTIONS = 3;
const limit = pLimit(MAX_CONCURRENT_EXECUTIONS);

// Executor (via docker)
const runCode = async (language, userCode, functionName, testCases) => {
  console.log(`test cases:`, testCases);
  const executorTime = Date.now();
  // Get Config
  const config = languageConfig[language];
  console.log(`Running code in language: ${language}`);
  // Check  language is supported
  if (!config) {
    console.log(`Language ${language} not supported`);
    return {
      languageUsed: language,
      passed: false,
      testCasesPassed: 0,
      error: "Language not supported",
    };
  }

  // Get the param types if c++
  let paramTypes = await getParamTypes(functionName, language);

  // Build the code to run in the container
  const code = config.buildCode(userCode, functionName, paramTypes);
  //console.log(`code to run:\n${code}`);

  // Get Container
  const containerId = await getContainer(language);
  if (!containerId) {
    console.error(`No container available for language: ${language}`);
    return {
      languageUsed: language,
      passed: false,
      testCasesPassed: 0,
      error: "No container available for execution",
    };
  }

  // Write the code to the container
  const copyTime = Date.now();
  await execWithStdin(
    "docker",
    ["exec", "-i", containerId, "sh", "-c", `cat > ${config.containerPath}`],
    code,
    5000,
  );
  console.log(
    `Copying file into container took: ${(Date.now() - copyTime) / 1000}s`,
  );

  // Compile code if its a compiled languge
  if (config.compile) {
    try {
      const compileStart = Date.now();
      await config.compile(containerId);
      console.log(`Compile took: ${(Date.now() - compileStart) / 1000}s`);
    } catch (err) {
      console.log(
        `Error compiling code:`,
        cleanErrorMessage(err.stderr || err.message, language),
      );
      // Cleanup
      await execAsync(`docker rm -f ${containerId}`, { timeout: 5000 });
      return {
        languageUsed: language,
        passed: false,
        testCasesPassed: 0,
        error:
          cleanErrorMessage(err.stderr || err.message, language) ||
          "Compilation Error",
      };
    }
  }

  // Start time
  const startTime = Date.now();

  // Run each input in parallel
  const testPromises = testCases.map(({ input, expected }, index) =>
    limit(async () => {
      // Convert input and expected to JSON strings
      const argsJson = JSON.stringify(input);
      const expectedJson = JSON.stringify(expected);
      console.log(
        `Running test case ${index + 1}: input: ${argsJson}, expected: ${expectedJson}`,
      );

      let output;
      try {
        // Run the code in the container with the input and get the output
        output = (
          await execWithStdin(
            "docker",
            ["exec", "-i", containerId, ...config.run().split(" ")],
            argsJson,
            5000,
          )
        ).trim();
      } catch (err) {
        // Execution failure
        return {
          index,
          input,
          expected,
          output: null,
          passed: false,
          error:
            err.type === "timeout"
              ? "Time Limit Exceeded"
              : cleanErrorMessage(err.stderr || err.message, language) ||
                "Runtime Error",
        };
      }

      // Try to parse the output as JSON and compare with expected
      try {
        output = JSON.parse(output);
        const passed = JSON.stringify(output) === expectedJson;
        return { index, input, expected, output, passed };
      } catch {
        // Code ran, but printed something that isn't valid JSON output
        return {
          index,
          input,
          expected,
          output: null,
          passed: false,
          error: null, // Just treat as wrong answer
        };
      }
    }),
  );

  // Wait for all test cases to finish
  const testResult = await Promise.all(testPromises);
  // Count how many test cases passed
  const testCasesPassed = testResult.filter((r) => r.passed).length;

  // Calculate full execution time
  const executionTime = Date.now() - startTime;

  // Cleanup
  await execAsync(`docker rm -f ${containerId}`, { timeout: 5000 });

  // Log execution time
  console.log(
    `Executor took: ${(Date.now() - executorTime) / 1000}s for language: ${language}`,
  );

  console.log(testResult);

  // Return result
  return {
    languageUsed: language,
    passed: testResult.every((r) => r.passed),
    testCasesPassed,
    executionTime,
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
    languageUsed: "javascript",
    passed: testResult.every((r) => r.passed),
    testCasesPassed,
    executionTime,
    testResult,
  };
};

export default runCode;
