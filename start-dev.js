import { spawn } from "child_process";

console.log("🚀 Starting Express Backend...");
const backend = spawn("node", ["server.js"], {
  cwd: "./server",
  stdio: "inherit",
  shell: true,
});

console.log("🚀 Starting Vite Frontend...");
const frontend = spawn("npx", ["vite"], {
  stdio: "inherit",
  shell: true,
});

// Handle termination signals to clean up child processes
const cleanup = () => {
  console.log("\nStopping servers...");
  try {
    if (backend.pid) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", backend.pid.toString(), "/f", "/t"]);
      } else {
        backend.kill("SIGTERM");
      }
    }
  } catch {}
  try {
    if (frontend.pid) {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", frontend.pid.toString(), "/f", "/t"]);
      } else {
        frontend.kill("SIGTERM");
      }
    }
  } catch {}

  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);

