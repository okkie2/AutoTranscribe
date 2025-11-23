// src/node/ingestJustPressRecord.js
// Watches the Just Press Record iCloud folder, flattens dated subfolders, and
// copies recordings into the AutoTranscribe recordings directory as
// YYYY-MM-DD_HH-MM-SS.m4a. Cleans up the source file (and empty date folder)
// after a successful copy. This ingester is specifically for Just Press Record
// and its iCloud sync layout.
//
// How it works:
// - chokidar watches the Just Press Record iCloud directory (depth 2: date folder + file).
// - On add of an .m4a, wait for the file size to stabilize (avoid partial copies).
// - Copy to /recordings with a flattened name: <dateFolder>_<originalName>.m4a.
// - Remove the source file and, if empty, the date folder.
// - Only processes .m4a files; ignores hidden files.

const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const config = require("./config");
const ensureDirectories = require("./ensureDirectories");

// Source is the Just Press Record iCloud sync folder; destination is the app's
// recordings folder.
const SOURCE_ROOT = config.jprSourceRoot;
const DEST_ROOT = config.recordings;

ensureDirectories();

function isHidden(p) {
  return path.basename(p).startsWith(".");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wait for file size to stabilize before copying to avoid partial writes.
async function waitForStableFile(filePath, attempts = 30, intervalMs = 500) {
  let lastSize = -1;
  for (let i = 0; i < attempts; i++) {
    try {
      const { size } = fs.statSync(filePath);
      if (size > 0 && size === lastSize) {
        return;
      }
      lastSize = size;
    } catch (err) {
      // If the file disappears, bail out.
      throw new Error(`File not accessible: ${filePath}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`File did not stabilize: ${filePath}`);
}

function maybeRemoveEmptyParent(dateDir) {
  if (!dateDir || dateDir === SOURCE_ROOT) return;
  try {
    const entries = fs.readdirSync(dateDir).filter((f) => !isHidden(f));
    if (entries.length === 0) {
      fs.rmdirSync(dateDir);
      console.log("Removed empty folder:", dateDir);
    }
  } catch (err) {
    console.log("Could not remove folder:", dateDir, err.message);
  }
}

async function handleFile(filePath) {
  if (isHidden(filePath)) return;
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".m4a") {
    return;
  }

  const dateFolder = path.basename(path.dirname(filePath));
  const baseName = path.basename(filePath);
  const destName = `${dateFolder}_${baseName}`;
  const destPath = path.join(DEST_ROOT, destName);
  const tempPath = path.join(DEST_ROOT, `.tmp_${destName}`);

  console.log("New JPR recording detected:", filePath);
  try {
    await waitForStableFile(filePath);
    const srcStat = fs.statSync(filePath);

    // Copy to a hidden temp file so the main watcher ignores it; rename only
    // after the copy completes and sizes match.
    fs.copyFileSync(filePath, tempPath);
    const destStat = fs.statSync(tempPath);

    if (destStat.size !== srcStat.size) {
      console.warn("Size mismatch after copy, keeping source. src:", srcStat.size, "dest:", destStat.size);
      // Cleanup temp so it doesn't linger; source remains for a retry later.
      try { fs.unlinkSync(tempPath); } catch (_) {}
      return;
    }

    fs.renameSync(tempPath, destPath);
    console.log("Copied to:", destPath);

    fs.unlinkSync(filePath);
    console.log("Removed source:", filePath);
    maybeRemoveEmptyParent(path.dirname(filePath));
  } catch (err) {
    console.error("Ingest error for", filePath, err.message);
    try { fs.unlinkSync(tempPath); } catch (_) {}
  }
}

console.log("Watching JPR folder for new recordings:", SOURCE_ROOT);
const watcher = chokidar.watch(SOURCE_ROOT, {
  persistent: true,
  ignoreInitial: false, // process backlog too
  ignored: /(^|[\/\\])\../,
  depth: 2
});

watcher.on("add", (filePath) => {
  handleFile(filePath);
});

watcher.on("error", (err) => {
  console.error("JPR watcher error:", err);
});
