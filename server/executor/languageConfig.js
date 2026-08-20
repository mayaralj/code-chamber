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
    console.log(JSON.stringify(${fnName}(...args)));
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


`;
      const suffix = `


args = json.loads(sys.stdin.read())
print(json.dumps(${fnName}(*args)))
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
      auto r = ${fnName}(${argNames});
      printResult(r);
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
