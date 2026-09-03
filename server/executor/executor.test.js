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
