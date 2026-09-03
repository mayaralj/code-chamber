// Imports
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import db from "../db.js";
import runCode from "./executor.js";
import { startPool, stopPool } from "./containerPool.js";

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

// Start the container pool before running tests and stop it afterward
beforeAll(async () => {
  await startPool();
}, 60000);

// Stop the container pool after all tests have completed
afterAll(async () => {
  await stopPool();
});

// Test suite for executor correctness per question and its solution(s)
describe("executor correctness per question and its solution(s)", () => {
  it("has at least one solution loaded", () => {
    expect(solutions.length).toBeGreaterThan(0);
  });

  // Run each solution in its respective language and check if it passes all test cases
  for (const solution of solutions) {
    it.concurrent(
      `solves "${solution.question_title}" in ${solution.language} (${solution.approach})`,
      async ({ expect }) => {
        const testCases = testCasesByQuestion[solution.question_id] || [];
        const result = await runCode(
          solution.language,
          solution.code,
          solution.function_name,
          testCases,
        );
        expect(result.passed).toBe(true);
      },
    );
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
