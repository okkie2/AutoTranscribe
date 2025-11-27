// src/node/startAll.js
// Convenience launcher: runs the ingest (Just Press Record) watcher and the
// main transcription watcher side by side. Use `npm run start:local` to start
// both when you want the full pipeline running.

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const logger = require("./logger");

// Prevent multiple concurrent instances: use a simple lock file in /tmp.
const LOCK_PATH = path.join(os.tmpdir(), "autotranscribe_startAll.lock");

function ensureSingleInstance() {
  try {
    fs.writeFileSync(LOCK_PATH, String(process.pid), { flag: "wx" });
    process.on("exit", () => {
      try { fs.unlinkSync(LOCK_PATH); } catch (_) {}
    });
    process.on("SIGINT", () => {
      try { fs.unlinkSync(LOCK_PATH); } catch (_) {}
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      try { fs.unlinkSync(LOCK_PATH); } catch (_) {}
      process.exit(0);
    });
    return;
  } catch (err) {
    // Lock exists; check if the owning PID is alive. If stale, remove and retry once.
    try {
      const existingPid = parseInt(fs.readFileSync(LOCK_PATH, "utf8").trim(), 10);
      if (existingPid && !Number.isNaN(existingPid)) {
        try {
            process.kill(existingPid, 0); // check alive
            logger.info(`startAll already running (pid ${existingPid}); sending SIGTERM so a fresh instance can start.`);
            try { process.kill(existingPid, "SIGTERM"); } catch (_) {}
            try { fs.unlinkSync(LOCK_PATH); } catch (_) {}
            // Exit; launchd or the caller should restart us, now that the lock is cleared.
            process.exit(0);
        } catch (_) {
          // Stale lock; remove and retry acquiring.
          fs.unlinkSync(LOCK_PATH);
          return ensureSingleInstance();
        }
      }
    } catch (_) {}
    console.log("startAll lock present, exiting to avoid duplicates.");
    process.exit(0);
  }
}

function launch(name, script) {
  const child = spawn("node", [script], { stdio: "inherit" });
  child.on("exit", (code) => {
    logger.info(`${name} exited with code ${code}`);
  });
  child.on("error", (err) => {
    logger.error(`${name} failed:`, err);
  });
  return child;
}

const ingestScript = path.join(__dirname, "ingestJustPressRecord.js");
const watcherScript = path.join(__dirname, "watcher.js");

ensureSingleInstance();
logger.info("startAll launching ingest and watcher...");
launch("ingestJustPressRecord", ingestScript);
launch("watcher", watcherScript);
