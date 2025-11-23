// src/node/test/integration-watcher.js
// Integration-lite check: uses the real AutoTranscribe folders, drops a
// uniquely named copy of the known fixture, and waits for the watcher to
// transcribe and rename it. Leaves artifacts so you can inspect them.

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const config = require("../config");
const ensureDirectories = require("../ensureDirectories");

const FIXTURE_NAME = "2001-01-01_01-01-01.m4a";
// Fixture lives in the repo under test/fixtures and is copied into the live recordings folder.
const FIXTURE_PATH = path.join(__dirname, "..", "..", "..", "test", "fixtures", FIXTURE_NAME);
const WATCHER_PATH = path.join(__dirname, "..", "watcher.js");
const NAME_PREFIX = "2001-01-01_01-01-";
const TEST_INDEX_PAD = 2; // zero-pad to two digits
const TEST_FILE = () => {
  const idx = nextIndex();
  return {
    base: `${NAME_PREFIX}${idx}.m4a`,
    path: path.join(config.recordings, `${NAME_PREFIX}${idx}.m4a`)
  };
};
const EXPECTED_TRANSCRIBED = (base) =>
  path.join(config.recordings, base.replace(".m4a", "_transcribed.m4a"));
const EXPECTED_TRANSCRIPT = (base) =>
  path.join(config.transcriptions, base.replace(".m4a", ".txt"));
const TIMEOUT_MS = 90_000;

function abort(message) {
  console.error("❌", message);
  process.exit(1);
}

// Remove any leftover 2001*.m4a files in recordings before running so the
// watcher sees only fresh test data. We do NOT remove artifacts at the end,
// so you can inspect outputs.
function cleanOldInputs() {
  const entries = fs.readdirSync(config.recordings);
  entries.forEach((file) => {
    if (file.startsWith("2001") && file.endsWith(".m4a")) {
      try {
        fs.unlinkSync(path.join(config.recordings, file));
      } catch (_) {
        // ignore
      }
    }
  });
}

function nextIndex() {
  // Find the highest existing index matching the prefix, then add 1.
  let max = 0;
  const entries = fs.readdirSync(config.recordings);
  entries.forEach((file) => {
    const match = file.match(/^2001-01-01_01-01-(\d{2})\.m4a$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  });
  const next = max + 1;
  return String(next).padStart(TEST_INDEX_PAD, "0");
}

async function main() {
  ensureDirectories();

  if (!fs.existsSync(FIXTURE_PATH)) {
    abort(`Fixture missing: ${FIXTURE_PATH}`);
  }

  // Remove leftover 2001*.m4a inputs from prior runs.
  cleanOldInputs();

  const { base: testBase, path: testPath } = TEST_FILE();

  // Copy the fixture to a fresh name so the watcher sees it as new.
  fs.copyFileSync(FIXTURE_PATH, testPath);
  console.log("📥 Copied fixture to:", testPath);

  const watcher = spawn("node", [WATCHER_PATH], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  let finished = false;

  const finish = (ok, message) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    watcher.kill();
    if (ok) {
      console.log("✅", message);
      process.exit(0);
    } else {
      console.error("❌", message);
      process.exit(1);
    }
  };

  const timer = setTimeout(() => {
    finish(false, "Timed out waiting for transcription/rename");
  }, TIMEOUT_MS);

  function checkFiles() {
    const renamed = fs.existsSync(EXPECTED_TRANSCRIBED(testBase));
    const transcript = fs.existsSync(EXPECTED_TRANSCRIPT(testBase));
    if (renamed && transcript) {
      finish(true, "Watcher transcribed and renamed test file");
    }
  }

  watcher.stdout.on("data", (data) => {
    const text = data.toString();
    process.stdout.write(text);
    if (text.includes("Transcription finished")) {
      checkFiles();
    }
  });

  watcher.stderr.on("data", (data) => {
    process.stderr.write(data.toString());
  });

  watcher.on("exit", (code) => {
    if (!finished) {
      finish(false, `Watcher exited unexpectedly with code ${code}`);
    }
  });

  // Poll for outputs/rename in case logs are missed.
  const poll = setInterval(() => {
    if (finished) {
      clearInterval(poll);
      return;
    }
    checkFiles();
  }, 1000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
