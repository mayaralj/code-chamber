import { buildCppArgDeclarations, buildCppArgNames } from "./cpp/cppHelpers.js";
import { execAsync } from "./execHelper.js";

const languageConfig = {
  javascript: {
    image: "node:alpine",
    ext: "js",
    containerPath: "/tmp/solution.js",
    run: () => `node /tmp/solution.js`,
    buildCode: (userCode, fnName) => {
      const prefix = `
    const fs = require("fs");
    `;
      const suffix = `
    
    const args = JSON.parse(fs.readFileSync(0, "utf-8"));
    const startTime = process.hrtime.bigint();
    let output = null, error = null;
    try {
      output = ${fnName}(...args);
    } catch (err) {
      error = err.message;
    }
    const endTime = process.hrtime.bigint();
    const execTime = Number(endTime - startTime) / 1e6;
    console.log(JSON.stringify({ output, error, execTime }));
    `;
      return {
        code: prefix + userCode + suffix,
        offset: prefix.split("\n").length - 1,
      };
    },
  },

  python: {
    image: "python:alpine",
    ext: "py",
    containerPath: "/tmp/solution.py",
    run: () => `python /tmp/solution.py`,
    buildCode: (userCode, fnName) => {
      const prefix = `
import sys, json
import time


`;
      const suffix = `



args = json.loads(sys.stdin.read())
start_time = time.time()
output = None
error = None
try:
    output = ${fnName}(*args)
except Exception as e:
    error = str(e)
end_time = time.time()
exec_time = (end_time - start_time) * 1000  # Convert to milliseconds
print(json.dumps({ "output": output, "error": error, "execTime": exec_time }))
    `;
      return {
        code: prefix + userCode + suffix,
        offset: prefix.split("\n").length - 1,
      };
    },
  },

  cpp: {
    image: "cpp-executor:latest",
    ext: "cpp",
    containerPath: "/tmp/solution.cpp",
    compile: (containerName) =>
      execAsync(
        `docker exec ${containerName} sh -c "g++ -std=c++17 -fuse-ld=lld -I/usr/include /tmp/solution.cpp -o /sandbox/a.out"`,
        { timeout: 30000 },
      ),
    run: () => `/sandbox/a.out`,
    buildCode: (userCode, fnName, paramTypes) => {
      const argDecls = buildCppArgDeclarations(paramTypes);
      const argNames = buildCppArgNames(paramTypes);

      const prefix = `
    #include "wrapper.hpp"
    `;
      const suffix = `



    int main() {
      string inputJson;
      getline(cin, inputJson);

      json args = json::parse(inputJson);
      ${argDecls}

      json resultJson;
      auto start = chrono::high_resolution_clock::now();
      try {
        auto output = ${fnName}(${argNames});
        resultJson["output"] = output;
        resultJson["error"] = nullptr;
      } catch (const std::exception& e) {
        resultJson["output"] = nullptr;
        resultJson["error"] = std::string(e.what());
      }
      auto end = chrono::high_resolution_clock::now();
      resultJson["execTime"] = chrono::duration<double, std::milli>(end - start).count();

      cout << resultJson.dump() << endl;
      return 0;
    }
    `;
      return {
        code: prefix + userCode + suffix,
        offset: prefix.split("\n").length - 1,
      };
    },
  },
};

export default languageConfig;
