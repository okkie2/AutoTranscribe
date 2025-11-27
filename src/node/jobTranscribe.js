// src/node/jobTranscribe.js
// Encapsulates single-file transcription and renaming.
// The watcher just adds filePaths to the queue, and this module does the rest.
// Flow order:
// 1) validate input (.m4a)
// 2) skip if the matching transcript already exists
// 3) call Python transcriber
// 4) enqueue matching summarize job for the produced transcript

const path = require("path");
const fs = require("fs");
const transcribe = require("./transcriber");
const config = require("./config");
const logger = require("./logger");

function jobTranscribe(filePath, summaryQueue) {
  return new Promise(function(resolve) {
    let ext = path.extname(filePath).toLowerCase();
    let base = path.basename(filePath);

    // Skip if output transcript already exists for this base name.
    const baseNoExt = path.basename(filePath, ext);
    const expectedTranscript = path.join(config.transcriptions, `${baseNoExt}.txt`);
    if (fs.existsSync(expectedTranscript)) {
      logger.info("Transcript already exists for this file; skipping:", expectedTranscript);
      resolve();
      return;
    }

    // Handle unexpected extensions (wav, etc.)
    if (ext !== ".m4a") {
      logger.info("WARNING: unexpected file type:", filePath);
      resolve();
      return;
    }

    logger.info("Processing:", filePath);

    // Run the transcription
    transcribe(filePath, function(success, outputPath) {
      if (!success) {
        logger.info("Transcription FAILED:", filePath);
        resolve();
        return;
      }

      logger.info("Transcription finished:", outputPath);

      // Enqueue summary job (idempotent).
      if (summaryQueue) {
        summaryQueue.add(outputPath);
      }
      resolve();
    });
  });
}

module.exports = jobTranscribe;
