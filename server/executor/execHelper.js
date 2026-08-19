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
