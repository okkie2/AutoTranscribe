// src/node/watcher.js
// Watches the recordings directory for new audio files, passes them to the
// transcriber, and marks processed files so they are not re-run.

const chokidar = require('chokidar');
const ensureDirectories = require('./ensureDirectories')
const createQueue = require("./queue");
const jobTranscribe = require("./jobTranscribe");
const jobSummarize = require("./jobSummarize");
const config = require("./config");


// Prepare folders.
ensureDirectories();
console.log("Folder check complete.");

const RECORDINGS_DIR = config.recordings;
const SUMMARIES_DIR = config.summaries;

console.log('Watching for new audio files in:', RECORDINGS_DIR);
console.log('Watching for new text files in:', SUMMARIES_DIR);

// Queues: transcription and summarization are separate so a slow summary does
// not block ingestion. Both jobs are idempotent.
let summaryQueue = createQueue(function(filePath) {
  return jobSummarize(filePath);
});

let transcribeQueue = createQueue(function(filePath) {
  return jobTranscribe(filePath, summaryQueue);
});

console.log("Watching:", RECORDINGS_DIR);

let watcher = chokidar.watch(RECORDINGS_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true
});

watcher.on('add', function(filePath) {
  console.log("New file detected:", filePath);
  transcribeQueue.add(filePath);
});

watcher.on('error', function(err) {
  console.error("Watcher error:", err);
});
