// src/node/ensureDirectories.js
// Ensures required folders exist. Designed to run early so later steps
// (recording, transcription, summarization) never crash due to missing paths.

// Basic filesystem utilities for existence checks and folder creation. The
// config file centralizes the projectRoot and all subfolder paths to keep
// path definitions in one place.
let fs = require("fs");
let config = require("./config");

function ensureDirectories() {
  // Ordered list of folders we rely on: project root first, then each
  // subdirectory used by the pipeline. Keeping it in an array lets us iterate
  // uniformly and expand easily if new folders are added later.
  let dirs = [
    config.projectRoot,
    config.recordings,
    config.transcriptions,
    config.summaries
  ];

  for (let i = 0; i < dirs.length; i++) {
    let exists = fs.existsSync(dirs[i]);
    console.log("Checking folder:", dirs[i], "exists?", exists);
    if (!exists) {
      // Create missing directory so downstream code can read/write safely.
      fs.mkdirSync(dirs[i]);
      console.log("Created folder: " + dirs[i]);
    }
  }

console.log("Folder check complete.");
}
// ensureDirectories(); // Use to test standalone file.
// Make function available elsewhere.
module.exports = ensureDirectories;
