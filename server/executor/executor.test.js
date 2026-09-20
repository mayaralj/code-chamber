// Imports
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import db from "../db.js";
import { startPool, stopPool } from "./containerPool.js";

// Mock containerPool's removeContainer to check if it's called after each runCode execution, and to actually remove the container to avoid test leaks
vi.mock("./containerPool.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    removeContainer: vi.fn(actual.removeContainer),
  };
});

// Import after the mock so runCode picks up the mocked removeContainer
import runCode from "./executor.js";
import { removeContainer } from "./containerPool.js";

// Load all solutions and test cases from the database
const { rows: solutions } = await db.query(`
  SELECT s.*, q.title AS question_title
  FROM solutions s
  JOIN questions q ON q.id = s.question_id
`);
const { rows: allTestCases } = await db.query(`SELECT * FROM test_cases`);
const testCasesByQuestion = {};
for (const tc of allTestCases) {
  if (!testCasesByQuestion[tc.question_id]) {
    testCasesByQuestion[tc.question_id] = [];
  }
  testCasesByQuestion[tc.question_id].push({
    input: tc.input,
    expected: tc.expected,
  });
}

// Vars
const REQUIRED_LANGUAGES = ["javascript", "python", "cpp"];

// Before all tests, start the container pool. After all tests, stop the pool.
beforeAll(async () => {
  await startPool();
}, 60000);
afterAll(async () => {
  await stopPool();
});

// Test that each solution passes its test cases for corresponding question
describe("executor correctness per question and its solution(s)", () => {
  it("has at least one solution loaded", () => {
    expect(solutions.length).toBeGreaterThan(0);
  });

  for (const solution of solutions) {
    it(`solves "${solution.question_title}" in ${solution.language} (${solution.approach})`, async () => {
      const testCases = testCasesByQuestion[solution.question_id] || [];
      const result = await runCode(
        solution.language,
        solution.code,
        solution.function_name,
        testCases,
      );
      expect(result.passed).toBe(true);
    }, 15000);
  }
});

// Tests for error handling (unsupported language, infinite loop, compile failure, runtime crash)
describe("executor error handling", () => {
  it("returns an error for an unsupported language", async () => {
    const result = await runCode("ruby", "code", "fn", []);
    expect(result.passed).toBe(false);
    expect(result.testCasesPassed).toBe(0);
    expect(result.error).toBe("Language not supported");
  });

  it("returns Time Limit Exceeded for an infinite loop (javascript)", async () => {
    const code = `function slow() { while (true) {} }`;
    const result = await runCode("javascript", code, "slow", [
      { input: [], expected: null },
    ]);
    expect(result.passed).toBe(false);
    expect(result.testCasesResults[0].error).toBe("Time Limit Exceeded");
  }, 15000); // internal exec timeout is 5s, give this test real headroom

  it("returns Time Limit Exceeded for an infinite loop (python)", async () => {
    const code = `def slow():\n    while True:\n        pass`;
    const result = await runCode("python", code, "slow", [
      { input: [], expected: null },
    ]);
    expect(result.passed).toBe(false);
    expect(result.testCasesResults[0].error).toBe("Time Limit Exceeded");
  }, 15000);

  it("returns a clean error for a C++ compile failure", async () => {
    const badCode = `int add(int a, int b) { return a + b `; // missing brace
    const result = await runCode("cpp", badCode, "add", []);
    expect(result.passed).toBe(false);
    expect(result.error).toBeTruthy();
    expect(typeof result.error).toBe("string");
  }, 15000);

  it("returns a clean error for a runtime crash (javascript)", async () => {
    const code = `function crash(x) { return x.foo.bar; }`;
    const result = await runCode("javascript", code, "crash", [
      { input: [null], expected: null },
    ]);
    expect(result.passed).toBe(false);
    expect(result.testCasesResults[0].error).toBeTruthy();
    expect(result.testCasesResults[0].error).not.toBe("Time Limit Exceeded");
  });
});

// Test container cleanup after various outcomes (compile failure, runtime error, success, timeout)
describe("executor container cleanup", () => {
  it("removes the container after a compile failure", async () => {
    removeContainer.mockClear();
    const badCode = `int add(int a, int b) { return a + b `;
    await runCode("cpp", badCode, "add", []);
    expect(removeContainer).toHaveBeenCalled();
  });

  it("removes the container after a successful run", async () => {
    removeContainer.mockClear();
    const code = `function add(a, b) { return a + b; }`;
    await runCode("javascript", code, "add", [{ input: [1, 2], expected: 3 }]);
    expect(removeContainer).toHaveBeenCalled();
  });

  it("removes the container after a Time Limit Exceeded", async () => {
    removeContainer.mockClear();
    const code = `function slow() { while (true) {} }`;
    await runCode("javascript", code, "slow", [{ input: [], expected: null }]);
    expect(removeContainer).toHaveBeenCalled();
  }, 15000);
});

// Smoke tests for sandbox isolation
describe("executor sandbox isolation", () => {
  it("blocks outbound network access (javascript)", async () => {
    const code = `
        async function tryFetch() {
          try {
            await fetch("http://example.com");
            return "network-worked";
          } catch (e) {
            return "network-blocked";
          }
        }
      `;
    const result = await runCode("javascript", code, "tryFetch", [
      { input: [], expected: "network-blocked" },
    ]);
    const output = result.testCasesResults?.[0]?.output;
    expect(output).not.toBe("network-worked");
  }, 15000);

  it("kills excessive memory allocation instead of hanging (javascript)", async () => {
    const code = `
        function bomb() {
          const chunks = [];
          while (true) {
            chunks.push(new Array(1e7).fill(0));
          }
        }
      `;
    const result = await runCode("javascript", code, "bomb", [
      { input: [], expected: null },
    ]);
    expect(result.passed).toBe(false);
  }, 15000);
});

// Test if the executor respects the concurrency cap by running multiple test cases that each sleep for a while, and measuring the total time taken.
describe("executor concurrency cap", () => {
  it("runs test cases with bounded concurrency, not fully sequential or unbounded", async () => {
    const code = `
        function sleepThenEcho(x) {
          const start = Date.now();
          while (Date.now() - start < 500) {}
          return x;
        }
      `;
    const testCases = Array.from({ length: 9 }, (_, i) => ({
      input: [i],
      expected: i,
    }));

    const start = Date.now();
    const result = await runCode(
      "javascript",
      code,
      "sleepThenEcho",
      testCases,
    );
    const elapsed = Date.now() - start;

    expect(result.passed).toBe(true);
    // Check if its within the bounds where we know the executor is respecting the concurrency cap (not fully sequential or unbounded)
    expect(elapsed).toBeGreaterThan(1200); // rules out full parallelism
    expect(elapsed).toBeLessThan(4000); // rules out full sequential (~4500ms)
  }, 15000);
});

// Tests for the per-language submission queue: same language must serialize, different languages must not block each other.
describe("executor per-language queue", () => {
  it("serializes concurrent submissions for the same language", async () => {
    const code = `
        function sleepThenEcho(x) {
          const start = Date.now();
          while (Date.now() - start < 400) {}
          return x;
        }
      `;

    const start = Date.now();
    const results = await Promise.all([
      runCode("javascript", code, "sleepThenEcho", [
        { input: [1], expected: 1 },
      ]),
      runCode("javascript", code, "sleepThenEcho", [
        { input: [2], expected: 2 },
      ]),
      runCode("javascript", code, "sleepThenEcho", [
        { input: [3], expected: 3 },
      ]),
    ]);
    const elapsed = Date.now() - start;

    expect(results.every((r) => r.passed)).toBe(true);
    // Three ~400ms submissions queued one at a time should take noticeably
    // longer than a single run, proving they did not execute concurrently.
    expect(elapsed).toBeGreaterThan(1000);
  }, 20000);

  it("does not serialize submissions across different languages", async () => {
    const jsCode = `
        function sleepThenEcho(x) {
          const start = Date.now();
          while (Date.now() - start < 1000) {}
          return x;
        }
      `;
    const pyCode = `
def sleep_then_echo(x):
    import time
    time.sleep(0.6)
    return x
`;

    const start = Date.now();
    const [jsResult, pyResult] = await Promise.all([
      runCode("javascript", jsCode, "sleepThenEcho", [
        { input: [1], expected: 1 },
      ]),
      runCode("python", pyCode, "sleep_then_echo", [
        { input: [1], expected: 1 },
      ]),
    ]);
    const elapsed = Date.now() - start;

    expect(jsResult.passed).toBe(true);
    expect(pyResult.passed).toBe(true);
    // If javascript and python shared one queue, this would take ~1200ms+. Independent per-language queues should keep it close to ~600ms.
    expect(elapsed).toBeLessThan(1700);
  }, 20000);
});

// LEFT JOIN so a question with zero starter_code rows still appears in the result set (with sc.language = null), not just ones missing one language.
const { rows: starterCodeRows } = await db.query(`
  SELECT
    q.id AS question_id,
    q.title,
    sc.language,
    sc.code,
    sc.function_name
  FROM questions q
  LEFT JOIN starter_code sc ON sc.question_id = q.id
`);

// Group rows by question so we can check per-question language coverage.
const byQuestion = {};
for (const row of starterCodeRows) {
  if (!byQuestion[row.question_id]) {
    byQuestion[row.question_id] = {
      id: row.question_id,
      title: row.title,
      entries: [],
    };
  }
  if (row.language) {
    byQuestion[row.question_id].entries.push({
      language: row.language,
      code: row.code,
      function_name: row.function_name,
    });
  }
}
const questions = Object.values(byQuestion);

describe("starter code coverage per question and language", () => {
  it("has at least one question loaded", () => {
    expect(questions.length).toBeGreaterThan(0);
  });

  it("every question has exactly one starter_code row per required language (no missing, no duplicates)", () => {
    const problems = [];
    for (const question of questions) {
      for (const language of REQUIRED_LANGUAGES) {
        const matches = question.entries.filter((e) => e.language === language);
        if (matches.length === 0) {
          problems.push(`${question.title}: missing ${language}`);
        } else if (matches.length > 1) {
          problems.push(
            `${question.title}: ${matches.length} duplicate rows for ${language}`,
          );
        }
      }
    }
    expect(problems, problems.join(" | ")).toEqual([]);
  });

  for (const question of questions) {
    for (const language of REQUIRED_LANGUAGES) {
      const entry = question.entries.find((e) => e.language === language);

      it(`has non-empty code and function_name for "${question.title}" in ${language}`, () => {
        expect(
          entry,
          `No starter_code row at all for "${question.title}" / ${language}`,
        ).toBeTruthy();
        expect(typeof entry.code).toBe("string");
        expect(entry.code.trim().length).toBeGreaterThan(0);
        expect(typeof entry.function_name).toBe("string");
        expect(entry.function_name.trim().length).toBeGreaterThan(0);
      });
    }
  }

  it("does not have any unexpected/misspelled language values", () => {
    const unexpected = [];
    for (const question of questions) {
      for (const entry of question.entries) {
        if (!REQUIRED_LANGUAGES.includes(entry.language)) {
          unexpected.push(`${question.title}: "${entry.language}"`);
        }
      }
    }
    expect(unexpected, unexpected.join(" | ")).toEqual([]);
  });

  it("uses the same function_name across all languages for a given question", () => {
    const mismatches = [];
    for (const question of questions) {
      const names = new Set(question.entries.map((e) => e.function_name));
      if (names.size > 1) {
        mismatches.push(`${question.title}: ${[...names].join(" vs ")}`);
      }
    }
    expect(mismatches, mismatches.join(" | ")).toEqual([]);
  });
});

describe("solution coverage per question, language, and approach", () => {
  it("every question has an 'optimal' solution for each required language", () => {
    const problems = [];
    for (const question of questions) {
      for (const language of REQUIRED_LANGUAGES) {
        const hasOptimal = solutions.some(
          (s) =>
            s.question_id === question.id &&
            s.language === language &&
            s.approach === "optimal",
        );
        if (!hasOptimal) {
          problems.push(`${question.title}: missing optimal/${language}`);
        }
      }
    }
    expect(problems, problems.join(" | ")).toEqual([]);
  });
});
