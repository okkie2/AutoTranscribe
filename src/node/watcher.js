// src/node/watcher.js
// Watches the pipeline entry points and routes work:
// 1) recordings/: new .m4a -> transcribe -> enqueue summarize
// 2) transcriptions/: new .txt -> enqueue summarize directly
// This file only wires chokidar events into the queues; the heavy lifting
// lives in jobTranscribe/jobSummarize.

const chokidar = require('chokidar');
const ensureDirectories = require('./ensureDirectories')
const createQueue = require("./queue");
const jobTranscribe = require("./jobTranscribe");
const jobSummarize = require("./jobSummarize");
const config = require("./config");
const logger = require("./logger");


// Prepare folders.
ensureDirectories();
logger.info("Folder check complete.");

const RECORDINGS_DIR = config.recordings;
const SUMMARIES_DIR = config.summaries;
const TRANSCRIPTIONS_DIR = config.transcriptions;

logger.info('Watching for new audio files in:', RECORDINGS_DIR);
// Summaries directory is observed so we can log/monitor, but processing is driven
// from transcription events (summary queue), not from file events here.
logger.info('Watching for new text files in:', SUMMARIES_DIR);
logger.info('Watching for new transcript files in:', TRANSCRIPTIONS_DIR);

// Queues: transcription and summarization are separate so a slow summary does
// not block ingestion. Both jobs are idempotent.
let summaryQueue = createQueue(function(filePath) {
  return jobSummarize(filePath);
});

let transcribeQueue = createQueue(function(filePath) {
  return jobTranscribe(filePath, summaryQueue);
});

logger.info("Watching:", RECORDINGS_DIR);

let watcher = chokidar.watch(RECORDINGS_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true
});

watcher.on('add', function(filePath) {
  logger.info("New file detected:", filePath);
  // Always enqueue into the transcribe queue; jobTranscribe will skip already
  // processed files and, on success, enqueue the matching summarize job.
  transcribeQueue.add(filePath);
});

watcher.on('error', function(err) {
  logger.error("Watcher error:", err);
});

// Watch for manually dropped transcripts; enqueue directly for summarization.
let transcriptWatcher = chokidar.watch(TRANSCRIPTIONS_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true
});

transcriptWatcher.on("add", function(filePath) {
  if (!filePath.endsWith(".txt") || filePath.endsWith("_summarised.txt")) {
    return;
  }
  logger.info("New transcript detected:", filePath);
  summaryQueue.add(filePath);
});

transcriptWatcher.on("error", function(err) {
  logger.error("Transcript watcher error:", err);
});
