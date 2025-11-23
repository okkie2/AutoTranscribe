// src/node/config.js
// Global configuration for AutoTranscribe. Centralizes filesystem locations so
// other modules can import a single source of truth instead of hardcoding
// scattered paths.

let os = require("os");
let home = os.homedir();

// --- Directory paths ---
// We keep all recorded audio, generated transcripts, and summaries under a
// user-local folder to avoid permission issues and to keep data grouped
// together. Using the home directory makes the app portable across machines.
let projectRoot = home + "/Documents/AutoTranscribe";

// Expose every path explicitly. If you add new pipeline stages that write files,
// define the path here and consume it elsewhere.
let paths = {
  projectRoot: projectRoot,
  recordings: projectRoot + "/recordings",
  transcriptions: projectRoot + "/transcriptions",
  summaries: projectRoot + "/summaries",
  testrecording: projectRoot + "/testrecording"
};

// Make code available.
module.exports = 
  paths;
