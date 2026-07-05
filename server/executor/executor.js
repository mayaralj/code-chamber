import vm from "vm";
import fs from "fs";
import path from "path";
import os from "os";
import pLimit from "p-limit";
import { execAsync, execWithStdin } from "./execHelper.js";
import languageConfig from "./languageConfig.js";
import { getParamTypes } from "./cpp/cppHelpers.js";

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
      executionTime: 0,
      testResult: "Language not supported",
    };
  }

  // Get the param types if c++
  let paramTypes = await getParamTypes(functionName, language);

  // Create file to run code in docker container
  const containerName = `solution_${Date.now()}`;
  const containerFile = path.join(
    os.tmpdir(),
    `solution_${Date.now()}.${config.ext}`,
  );

  const code = config.buildCode(userCode, functionName, paramTypes);
  console.log(`code to run:\n${code}`);
  fs.writeFileSync(containerFile, code, "utf-8");

  // Create container but dont run any code yet
  const containerStart = Date.now();
  await execAsync(
    `docker run -d --name ${containerName} --network none --memory 256m --cpus 0.5 -v ${containerFile}:${config.containerPath} ${config.image} tail -f /dev/null`,
    { timeout: 5000 },
  );
  console.log(`Container start took: ${(Date.now() - containerStart) / 1000}s`);

  // Compile code if its a compiled languge
  if (config.compile) {
    try {
      const compileStart = Date.now();
      await config.compile(containerName);
      console.log(`Compile took: ${(Date.now() - compileStart) / 1000}s`);
    } catch (err) {
      console.log(`Error compiling code:`, err.message);
      // Cleanup
      await execAsync(`docker rm -f ${containerName}`, { timeout: 5000 });
      fs.unlinkSync(containerFile);
      return {
        languageUsed: language,
        passed: false,
        testCasesPassed: 0,
        executionTime: 0,
        testResult: `Compilation error: ${err.message}`,
      };
    }
  }

  // Start time (ignore compilation since unfair)
  const startTime = Date.now();

  // Run each input in parallel
  const testPromises = testCases.map(({ input, expected }) =>
    limit(async () => {
      try {
        // Args json
        const argsJson = JSON.stringify(input);
        // Expected json
        const expectedJson = JSON.stringify(expected);

        const output = (
          await execWithStdin(
            `docker`,
            ["exec", "-i", containerName, ...config.run().split(" ")],
            argsJson,
            5000,
          )
        ).trim();

        // Parse output
        const received = JSON.parse(output);
        // Compare
        const passed = JSON.stringify(received) === expectedJson;

        // Push result
        return { input, expected, received, passed };
      } catch (err) {
        console.log(
          `Error running test case with input ${input}:`,
          err.message,
        );
        return {
          input,
          expected,
          received: err.message,
          passed: false,
        };
      }
    }),
  );

  // Wait for all test cases to finish
  const testResult = await Promise.all(testPromises);
  // Count how many test cases passed
  const testCasesPassed = testResult.filter((r) => r.passed).length;

  // Calculate full execution time
  const executionTime = (Date.now() - startTime) / 1000;

  // Cleanup
  await execAsync(`docker rm -f ${containerName}`, { timeout: 5000 });
  fs.unlinkSync(containerFile);

  // Return result
  return {
    languageUsed: language,
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
    languageUsed: "javascript",
    passed: testResult.every((r) => r.passed),
    testCasesPassed,
    executionTime,
    testResult,
  };
};

export default runCode;
