import vm from "vm";
import fs from "fs";
import path from "path";
import os from "os";
import db from "../db.js";
import { execSync } from "child_process";

// Helper to build C++ argument declarations
const buildCppArgDeclarations = (paramTypes) => {
  return paramTypes
    .map(
      (type, index) => `${type} arg${index} = args[${index}].get<${type}>();`,
    )
    .join("\n");
};

// Helper to build C++ argument names
const buildCppArgNames = (paramTypes) => {
  return paramTypes.map((_, index) => `arg${index}`).join(", ");
};

// Config
const languageConfig = {
  javascript: {
    image: "node:alpine",
    ext: "js",
    containerPath: "/solution.js",
    run: () => `node /solution.js`,
    buildCode: (userCode, fnName, argsJson) =>
      `
    ${userCode}
    
    const args = ${argsJson};
    console.log(JSON.stringify(${fnName}(...args)));
    `,
  },

  python: {
    image: "python:alpine",
    ext: "py",
    containerPath: "/solution.py",
    run: () => `python /solution.py`,
    buildCode: (userCode, fnName, argsJson) =>
      `
import json

${userCode}

args = json.loads('''${argsJson}''')
print(json.dumps(${fnName}(*args)))
    `,
  },

  cpp: {
    image: "cpp-executor:latest",
    ext: "cpp",
    containerPath: "/solution.cpp",
    run: () => `sh -c "g++ /solution.cpp -o /a.out && /a.out"`,
    buildCode: (userCode, fnName, argsJson, paramTypes) => {
      const argDecls = buildCppArgDeclarations(paramTypes);
      const argNames = buildCppArgNames(paramTypes);

      return `
    #include <iostream>
    #include <vector>
    #include <string>
    #include <nlohmann/json.hpp>
    using namespace std;
    using json = nlohmann::json;

    ${userCode}

    void printResult(int x) { cout << x; }
    void printResult(long x) { cout << x; }
    void printResult(long long x) { cout << x; }
    void printResult(float x) { cout << x; }
    void printResult(double x) { cout << x; }

    void printResult(bool x) {
      cout << boolalpha << x;
    }

    void printResult(const string& x) {
      cout << '"';
      for (char c : x) {
        if (c == '\\\\') cout << "\\\\\\\\";
        else if (c == '"') cout << "\\\\\\"";
        else if (c == '\\n') cout << "\\\\n";
        else if (c == '\\t') cout << "\\\\t";
        else cout << c;
      }
      cout << '"';
    }

    void printResult(char x) {
      printResult(string(1, x));
    }

    template <typename T>
    void printResult(const vector<T>& v) {
      cout << "[";
      for (size_t i = 0; i < v.size(); i++) {
        printResult(v[i]);
        if (i + 1 < v.size()) cout << ",";
      }
      cout << "]";
    }

    int main() {
      string inputJson
      getline(cin, inputJson);

      json args = json::parse(R"(inputJson)");
      ${argDecls}
      auto r = ${fnName}(${argNames});
      printResult(r);
      return 0;
    }
    `;
    },
  },
};

// Executor
const runCode = async (language, userCode, functionName, testCases) => {
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
  const paramTypes = await db.query(
    "SELECT param_types FROM starter_code WHERE function_name = $1 AND language = $2",
    [functionName, language],
  );
  const paramTypesArray = paramTypes.rows[0]?.param_types || [];

  // Test cases passed
  let testCasesPassed = 0;
  // Start time
  const startTime = Date.now();
  // Test result
  const testResult = [];

  // Loop through test cases and run code in docker container
  for (const { input, expected } of testCases) {
    try {
      const argsJson = JSON.stringify(input);
      const expectedJson = JSON.stringify(expected);
      const code = config.buildCode(
        userCode,
        functionName,
        argsJson,
        paramTypesArray,
      );
      console.log(`code to run:\n${code}`);

      // Write code to a temp file, mount it, run it
      const tmpFile = path.join(
        os.tmpdir(),
        `solution_${Date.now()}.${config.ext}`,
      );
      fs.writeFileSync(tmpFile, code, "utf-8");

      const output = execSync(
        `docker run --rm --network none --memory 64m --cpus 0.5 \
        -v ${tmpFile}:${config.containerPath} \
        ${config.image} ${config.run()}`,
        { timeout: 5000 },
      )
        .toString()
        .trim();

      fs.unlinkSync(tmpFile); // cleanup

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
