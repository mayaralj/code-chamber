import { exec, spawn } from "child_process";
import { promisify } from "util";
export const execAsync = promisify(exec);

// Helper function to execute a command with stdin input and a timeout
export const execWithStdin = (command, args, input, timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
      reject(
        Object.assign(new Error("Execution timed out"), { type: "timeout" }),
      );
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.stdin.on("error", () => {});

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(
        Object.assign(new Error(`${err.message}`), { type: "spawn_error" }),
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;
      // Successful execution returns code 0, otherwise it's an error
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          Object.assign(
            new Error(stderr.trim() || `Process exited with code ${code}`),
            {
              type: "runtime_error",
              exitCode: code,
              stderr: stderr.trim(),
            },
          ),
        );
      }
    });

    // Write the input to the child process's stdin and close it
    child.stdin.write(input);
    child.stdin.end();
  });
};

// Helper to extract the line number from an error message
const extractLineNumber = (message, offset) => {
  const match =
    message.match(/line (\d+)/) || message.match(/:(\d+)(?=:|\s|$)/);
  if (!match) return null;
  return Math.max(1, parseInt(match[1], 10) - offset);
};

// Helper function to adjust line numbers in error messages based on an offset
const adjustLineNumber = (message, offset) => {
  return message
    .replace(
      /line (\d+)/,
      (_, n) => `line ${Math.max(1, parseInt(n) - offset)}`,
    )
    .replace(
      /:(\d+)(?=:|\s|$)/,
      (_, n) => `:${Math.max(1, parseInt(n) - offset)}`,
    );
};

// Helper function to clean up error messages based on language
export const cleanErrorMessage = (stderr, language, offset = 0) => {
  // If stderr is empty, return a generic message
  if (!stderr) {
    return { cleanMessage: "Unknown Runtime error", errorLine: null };
  }

  // Handle different languages
  if (language === "javascript") {
    const lines = stderr.split("\n");
    const errorLine = lines.find((l) =>
      /^\w*Error(\s?\[.*\])?:\s/.test(l.trim()),
    );
    const message = errorLine ? errorLine.trim() : stderr.trim().slice(0, 200);

    // Extract the line number from the error message
    const lineMatch =
      stderr.match(/^[^\n]*?:(\d+)$/m) || stderr.match(/:(\d+):\d+\)/);
    const rawLineNumber = lineMatch ? parseInt(lineMatch[1], 10) : null;

    return {
      cleanMessage: adjustLineNumber(message, offset),
      errorLine:
        rawLineNumber !== null ? Math.max(1, rawLineNumber - offset) : null,
    };
  }

  if (language === "python") {
    const rawLines = stderr.trim().split("\n");
    let lastFileIdx = -1;
    for (let i = rawLines.length - 1; i >= 0; i--) {
      if (rawLines[i].trim().startsWith('File "')) {
        lastFileIdx = i;
        break;
      }
    }
    const relevant =
      lastFileIdx !== -1 ? rawLines.slice(lastFileIdx) : rawLines;
    const message = relevant.filter((l) => l.trim().length > 0).join("\n");
    return {
      cleanMessage: adjustLineNumber(message, offset),
      errorLine: extractLineNumber(message, offset),
    };
  }

  if (language === "cpp") {
    const lines = stderr.split("\n");
    const errorLine = lines.find((l) => l.includes("error:"));
    const message = errorLine ? errorLine.trim() : stderr.trim().slice(0, 200);
    return {
      cleanMessage: adjustLineNumber(message, offset),
      errorLine: extractLineNumber(message, offset),
    };
  }
};
