// Import from CPP helpers
import { buildCppArgDeclarations, buildCppArgNames } from "./cpp/cppHelpers.js";

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
    run: (argsJson) =>
      `sh -c "g++ /solution.cpp -o /a.out && echo '${argsJson}' | /a.out"`,
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
