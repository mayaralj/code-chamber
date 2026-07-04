// Import from CPP helpers
import { buildCppArgDeclarations, buildCppArgNames } from "./cpp/cppHelpers.js";
import { execAsync } from "./execHelper.js";

// Config
const languageConfig = {
  javascript: {
    image: "node:alpine",
    ext: "js",
    containerPath: "/solution.js",
    run: () => `node /solution.js`,
    buildCode: (userCode, fnName) =>
      `
    const fs = require("fs");
    ${userCode}
    
    const args = JSON.parse(fs.readFileSync(0, "utf-8"));
    console.log(JSON.stringify(${fnName}(...args)));
    `,
  },

  python: {
    image: "python:alpine",
    ext: "py",
    containerPath: "/solution.py",
    run: () => `python /solution.py`,
    buildCode: (userCode, fnName) =>
      `
import sys, json

${userCode}

args = json.loads(sys.stdin.read())
print(json.dumps(${fnName}(*args)))
    `,
  },

  cpp: {
    image: "cpp-executor:latest",
    ext: "cpp",
    containerPath: "/solution.cpp",
    compile: (containerName) =>
      execAsync(
        `docker exec ${containerName} sh -c "g++ -std=c++17 -fuse-ld=lld -I/usr/include /solution.cpp -o /a.out"`,
        { timeout: 30000 },
      ),
    run: () => `/a.out`,
    buildCode: (userCode, fnName, paramTypes) => {
      const argDecls = buildCppArgDeclarations(paramTypes);
      const argNames = buildCppArgNames(paramTypes);

      return `
    #include "wrapper.hpp"
    ${userCode}

    int main() {
      string inputJson;
      getline(cin, inputJson);

      json args = json::parse(inputJson);
      ${argDecls}
      auto r = ${fnName}(${argNames});
      printResult(r);
      return 0;
    }
    `;
    },
  },
};

export default languageConfig;
