// Imports
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../db.js", () => ({
  default: { query: vi.fn() },
}));

// Imports under test
import db from "../db.js";
import { setUpGameQuestions } from "./questionHandler.js";

// Mock helpers
const CODE = "ROOM01";
const makeRoom = (overrides = {}) => ({
  difficulty: "easy",
  totalRounds: 2,
  roundData: { 1: {}, 2: {} },
  ...overrides,
});
const QUESTIONS = [
  { id: 1, difficulty: "easy", title: "Two Sum" },
  { id: 2, difficulty: "easy", title: "FizzBuzz" },
  { id: 3, difficulty: "easy", title: "Reverse a String" },
];
const STARTER_CODE_ROWS = [
  {
    question_id: 1,
    language: "javascript",
    code: "function twoSum(){}",
    function_name: "twoSum",
  },
  {
    question_id: 1,
    language: "python",
    code: "def two_sum():",
    function_name: "two_sum",
  },
  {
    question_id: 2,
    language: "javascript",
    code: "function fizzBuzz(){}",
    function_name: "fizzBuzz",
  },
  {
    question_id: 3,
    language: "javascript",
    code: "function reverse(){}",
    function_name: "reverse",
  },
];
const TEST_CASE_ROWS = [
  { id: 1, question_id: 1, input: [1, 2], expected: 3 },
  { id: 2, question_id: 1, input: [2, 3], expected: 5 },
  { id: 3, question_id: 2, input: [3], expected: "Fizz" },
  { id: 4, question_id: 3, input: ["abc"], expected: "cba" },
];
const mockHappyPathQueries = () => {
  db.query
    .mockResolvedValueOnce({ rows: QUESTIONS })
    .mockResolvedValueOnce({ rows: STARTER_CODE_ROWS })
    .mockResolvedValueOnce({ rows: TEST_CASE_ROWS })
    .mockResolvedValueOnce({ rows: [] }); // solutions query
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// setUpGameQuestions success tests
describe("setUpGameQuestions success", () => {
  it("queries questions by the room's difficulty", async () => {
    mockHappyPathQueries();
    const rooms = { [CODE]: makeRoom({ difficulty: "hard" }) };

    await setUpGameQuestions(rooms, CODE);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("FROM questions WHERE difficulty"),
      ["hard"],
    );
  });

  it("attaches starter code per language to each question", async () => {
    mockHappyPathQueries();
    const rooms = { [CODE]: makeRoom() };

    await setUpGameQuestions(rooms, CODE);

    const assignedQuestions = [1, 2].map(
      (round) => rooms[CODE].roundData[round].question,
    );
    const q1 = assignedQuestions.find((q) => q.id === 1);
    if (q1) {
      expect(q1.starterCode).toEqual({
        javascript: "function twoSum(){}",
        python: "def two_sum():",
      });
      expect(q1.functionName).toEqual({
        javascript: "twoSum",
        python: "two_sum",
      });
    }
  });

  it("attaches only the matching test cases to each question", async () => {
    mockHappyPathQueries();
    const rooms = { [CODE]: makeRoom() };

    await setUpGameQuestions(rooms, CODE);

    for (const round of [1, 2]) {
      const question = rooms[CODE].roundData[round].question;
      expect(
        question.testCases.every((tc) => tc.question_id === question.id),
      ).toBe(true);
    }
  });

  it("assigns one question per round for totalRounds rounds", async () => {
    mockHappyPathQueries();
    const rooms = { [CODE]: makeRoom({ totalRounds: 2 }) };

    await setUpGameQuestions(rooms, CODE);

    expect(rooms[CODE].roundData[1].question).toBeDefined();
    expect(rooms[CODE].roundData[2].question).toBeDefined();
  });

  it("never assigns the same question to two different rounds", async () => {
    mockHappyPathQueries();
    const rooms = {
      [CODE]: makeRoom({ totalRounds: 3, roundData: { 1: {}, 2: {}, 3: {} } }),
    };

    await setUpGameQuestions(rooms, CODE);

    const assignedIds = [1, 2, 3].map(
      (r) => rooms[CODE].roundData[r].question.id,
    );
    const uniqueIds = new Set(assignedIds);
    expect(uniqueIds.size).toBe(assignedIds.length);
  });
});

// setUpGameQuestions room disappearance tests
describe("setUpGameQuestions bails out if the room disappears mid-setup", () => {
  it("stops after the questions query if the room is gone", async () => {
    const rooms = { [CODE]: makeRoom() };
    db.query.mockImplementationOnce(async () => {
      delete rooms[CODE];
      return { rows: QUESTIONS };
    });

    await expect(setUpGameQuestions(rooms, CODE)).resolves.toBeUndefined();
    // Means never reached the starter code query, since the room was gone after the questions query
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("stops after the starter code query if the room is gone", async () => {
    const rooms = { [CODE]: makeRoom() };
    db.query
      .mockResolvedValueOnce({ rows: QUESTIONS })
      .mockImplementationOnce(async () => {
        delete rooms[CODE];
        return { rows: STARTER_CODE_ROWS };
      });

    await expect(setUpGameQuestions(rooms, CODE)).resolves.toBeUndefined();
    // Means never reached the test cases query, since the room was gone after the starter code query
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it("stops after the test cases query if the room is gone", async () => {
    const rooms = { [CODE]: makeRoom() };
    db.query
      .mockResolvedValueOnce({ rows: QUESTIONS })
      .mockResolvedValueOnce({ rows: STARTER_CODE_ROWS })
      .mockImplementationOnce(async () => {
        delete rooms[CODE];
        return { rows: TEST_CASE_ROWS };
      });

    await expect(setUpGameQuestions(rooms, CODE)).resolves.toBeUndefined();
  });
});

// setUpGameQuestions error handling tests
describe("setUpGameQuestions error handling", () => {
  it("propagates an error if the questions query fails", async () => {
    const rooms = { [CODE]: makeRoom() };
    db.query.mockRejectedValueOnce(new Error("db down"));

    await expect(setUpGameQuestions(rooms, CODE)).rejects.toThrow("db down");
  });

  it("propagates an error if the starter code query fails", async () => {
    const rooms = { [CODE]: makeRoom() };
    db.query
      .mockResolvedValueOnce({ rows: QUESTIONS })
      .mockRejectedValueOnce(new Error("db down"));

    await expect(setUpGameQuestions(rooms, CODE)).rejects.toThrow("db down");
  });
});
