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
  backend.kill("SIGTERM");
  frontend.kill("SIGTERM");
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", cleanup);
