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
        `docker exec ${containerName} sh -c "g++ /solution.cpp -o /a.out"`,
        {
          timeout: 30000,
        },
      ),
    run: () => `/a.out`,
    buildCode: (userCode, fnName, paramTypes) => {
      const argDecls = buildCppArgDeclarations(paramTypes);
      const argNames = buildCppArgNames(paramTypes);

      return `
    #include <iostream>
    #include <vector>
    #include <string>
    #include <utility>
    #include <map>
    #include <unordered_map>
    #include <set>
    #include <unordered_set>
    #include <cmath>
    #include <sstream>
    #include <optional>
    #include <nlohmann/json.hpp>
    using namespace std;
    using json = nlohmann::json;

    ${userCode}

    void printResult(int x) { cout << x; }
    void printResult(unsigned int x) { cout << x; }
    void printResult(long x) { cout << x; }
    void printResult(unsigned long x) { cout << x; }
    void printResult(long long x) { cout << x; }
    void printResult(unsigned long long x) { cout << x; }
    void printResult(float x) { 
      if (isnan(x) || isinf(x)) {
        cout << "null";
        return;
      }
      cout << x; 
    }
    void printResult(double x) { 
      if (isnan(x) || isinf(x)) {
        cout << "null";
        return;
      }
      cout << x; 
    }
    void printResult(long double x) {
      if (isnan(x) || isinf(x)) {
        cout << "null";
        return;
      }
      cout << x; 
     }

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

    template <typename A, typename B>
    void printResult(const pair<A, B>& p) {
      cout << "[";
      printResult(p.first);
      cout << ",";
      printResult(p.second);
      cout << "]";
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

    template <typename K>
    void printKey(const K& k) {
      cout << "\"";
      ostringstream oss;
      oss << k;
      string s = oss.str();
      for (char c : s) {
        if (c == '\\') cout << "\\\\";
        else if (c == '"') cout << "\\\"";
        else cout << c;
      }
      cout << "\"";
    }

    template <typename K, typename V>
    void printResult(const map<K, V>& m) {
      cout << "{";
      bool first = true;
      for (const auto& [k, v] : m) {
        if (!first) cout << ",";
        first = false;
        printKey(k);
        cout << ":";
        printResult(v);
      }
      cout << "}";
    }

    template <typename K, typename V>
    void printResult(const unordered_map<K, V>& m) {
      cout << "{";
      bool first = true;
      for (const auto& [k, v] : m) {
        if (!first) cout << ",";
        first = false;
        printKey(k);
        cout << ":";
        printResult(v);
      }
      cout << "}";
    }

    template <typename T>
    void printResult(const set<T>& s) {
      cout << "[";
      bool first = true;
      for (const auto& x : s) {
        if (!first) cout << ",";
        first = false;
        printResult(x);
      }
      cout << "]";
    }

    template <typename T>
    void printResult(const unordered_set<T>& s) {
      cout << "[";
      bool first = true;
      for (const auto& x : s) {
        if (!first) cout << ",";
        first = false;
        printResult(x);
      }
      cout << "]";
    }

    template <typename T>
    void printResult(const optional<T>& opt) {
      if (opt.has_value()) {
        printResult(opt.value());
        return;
      }
      cout << "null";
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
