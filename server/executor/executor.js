import vm from "vm";
import fs from "fs";
import path from "path";
import os from "os";
import { execAsync, execWithStdin } from "./execHelper.js";
import languageConfig from "./languageConfig.js";
import { getParamTypes } from "./cpp/cppHelpers.js";

// Executor (via docker)
const runCode = async (language, userCode, functionName, testCases) => {
  // Get Config
  const config = languageConfig[language];
  console.log(`Running code in language: ${language}`);
  // Check  language is supported
  if (!config) {
    console.log(`Language ${language} not supported`);
    return {
      passed: false,
      testCasesPassed: 0,
      executionTime: 0,
      testResult: "Language not supported",
    };
  }

  // Get the param types if c++
  let paramTypes = await getParamTypes(functionName, language);

  // Test cases passed
  let testCasesPassed = 0;
  // Test result
  const testResult = [];

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
  await execAsync(
    `docker run -d --name ${containerName} --network none --memory 256m --cpus 0.5 -v ${containerFile}:${config.containerPath} ${config.image} tail -f /dev/null`,
    { timeout: 5000 },
  );

  // Compile code if its a compiled languge
  if (config.compile) {
    try {
      await config.compile(containerName);
    } catch (err) {
      console.log(`Error compiling code:`, err.message);
      // Cleanup
      await execAsync(`docker rm -f ${containerName}`, { timeout: 5000 });
      fs.unlinkSync(containerFile);
      return {
        passed: false,
        testCasesPassed: 0,
        executionTime: 0,
        testResult: `Compilation error: ${err.message}`,
      };
    }
  }

  // Start time (ignore compilation since unfair)
  const startTime = Date.now();

  // Loop through test cases and run code in docker container
  for (const { input, expected } of testCases) {
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
      if (passed) testCasesPassed++;
      testResult.push({ input, expected, received, passed });
    } catch (err) {
      console.log(`Error running test case with input ${input}:`, err.message);
      testResult.push({
        input,
        expected,
        received: err.message,
        passed: false,
      });
    }
  }

  // Calculate full execution time
  const executionTime = (Date.now() - startTime) / 1000;

  // Cleanup
  await execAsync(`docker rm -f ${containerName}`, { timeout: 5000 });
  fs.unlinkSync(containerFile);

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
