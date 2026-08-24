import vm from "vm";
import pLimit from "p-limit";
import { execWithStdin, cleanErrorMessage } from "./execHelper.js";
import languageConfig from "./languageConfig.js";
import { getParamTypes } from "./cpp/cppHelpers.js";
import { getContainer, removeContainer } from "./containerPool.js";

// Config
const MAX_CONCURRENT_EXECUTIONS = 3;
const limit = pLimit(MAX_CONCURRENT_EXECUTIONS);

// Executor (via docker)
const runCode = async (language, userCode, functionName, testCases) => {
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
  const { code, offset } = config.buildCode(userCode, functionName, paramTypes);
  //console.log(`code to run:\n${code}`);
  console.log("Offset for error messages:", offset);

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
  try {
    await execWithStdin(
      "docker",
      ["exec", "-i", containerId, "sh", "-c", `cat > ${config.containerPath}`],
      code,
      5000,
    );
    console.log(
      `Writing code into container took: ${(Date.now() - copyTime) / 1000}s`,
    );
  } catch (error) {
    console.error(
      `Error writing code into container for language: ${language}`,
      error,
    );
    await removeContainer(containerId);
    return {
      languageUsed: language,
      passed: false,
      testCasesPassed: 0,
      error: "Error Writing code to container",
    };
  }

  // Compile code if its a compiled languge
  if (config.compile) {
    try {
      const compileStart = Date.now();
      await config.compile(containerId);
      console.log(`Compile took: ${(Date.now() - compileStart) / 1000}s`);
    } catch (err) {
      // Compilation failure
      const { cleanMessage, errorLine } = cleanErrorMessage(
        err.stderr || err.message,
        language,
        offset,
      );
      console.log(`Cleaned error message:`, cleanMessage, errorLine);
      // Cleanup
      await removeContainer(containerId);
      return {
        languageUsed: language,
        passed: false,
        testCasesPassed: 0,
        error: cleanMessage,
        errorLine: errorLine,
      };
    }
  }

  // Execution time with commands
  const execTimeWithCmds = Date.now();

  // Run each input in parallel
  const testPromises = testCases.map(({ input, expected }, index) =>
    limit(async () => {
      // Log the input and expected output for debugging
      const argsJson = JSON.stringify(input);
      const expectedJson = JSON.stringify(expected);
      console.log(
        `Running test case ${index + 1}: input: ${argsJson}, expected: ${expectedJson}`,
      );

      // Run the code in the container
      let raw;
      try {
        raw = (
          await execWithStdin(
            "docker",
            ["exec", "-i", containerId, ...config.run().split(" ")],
            argsJson,
            5000,
          )
        ).trim();
        console.log(`Raw output for test case ${index + 1}:`, raw);
      } catch (err) {
        const { cleanMessage, errorLine } = cleanErrorMessage(
          err.stderr || err.message,
          language,
          offset,
        );
        console.log(`Cleaned error message:`, cleanMessage, errorLine);
        return {
          index,
          input,
          expected,
          output: null,
          execTime: undefined,
          passed: false,
          error: err.type === "timeout" ? "Time Limit Exceeded" : cleanMessage,
          errorLine,
        };
      }

      // Grab the last line of the output, guranteed to be the answer in JSON format, the rest is debug info
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const lastLine = lines[lines.length - 1] || "";
      const debugLines = lines.slice(0, -1).join("\n") || null;
      console.log(`Debug lines for test case ${index + 1}:`, debugLines);

      let result;
      try {
        result = JSON.parse(lastLine);
      } catch {
        console.log(`Raw output could not be parsed:`, raw);
        return {
          index,
          input,
          expected,
          output: null,
          execTime: undefined,
          passed: false,
          error: undefined,
          debugLines,
        };
      }

      // Extract output, error and execTime from the result
      const { output, error, execTime } = result;
      console.log(`Parsed result for test case ${index + 1}:`, {
        output,
        error,
        execTime,
      });

      // The wrapper caught a runtime error inside the executed code
      if (error) {
        const { cleanMessage, errorLine } = cleanErrorMessage(
          error,
          language,
          offset,
        );
        console.log(`Cleaned error message:`, cleanMessage, errorLine);
        return {
          index,
          input,
          expected,
          output: null,
          execTime,
          passed: false,
          error: cleanMessage,
          errorLine,
          debugLines,
        };
      }

      // Compare the output with the expected output
      const passed = JSON.stringify(output) === expectedJson;
      return { index, input, expected, output, execTime, passed, debugLines };
    }),
  );

  // Wait for all test cases to finish
  const testResult = await Promise.all(testPromises);
  // Count how many test cases passed
  const testCasesPassed = testResult.filter((r) => r.passed).length;

  // End time (mainly used for fallback if execTime is not available for all test cases)
  const totalExecTimeWithCmds = Date.now() - execTimeWithCmds;

  // Cleanup container
  await removeContainer(containerId);

  // Calculate total execution time (if execTime is available for all test cases, use that, otherwise use totalExecTimeWithCmds)
  const totalExecTime = testResult.reduce(
    (acc, r) => acc + (r.execTime || totalExecTimeWithCmds / testResult.length),
    0,
  );
  console.log(`Total execution time: ${totalExecTime}ms`);

  // Return result
  return {
    testCasesResults: testResult,
    languageUsed: language,
    passed: testResult.every((r) => r.passed),
    testCasesPassed,
    executionTime: totalExecTime,
  };
};

// JS only using vm module to run code in a sandboxed environment (unsafe version)
export const testRunCode = (userCode, functionName, testCases) => {
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
