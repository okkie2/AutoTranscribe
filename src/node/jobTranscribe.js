// src/node/jobTranscribe.js
// Encapsulates single-file transcription and renaming.
// The watcher just adds filePaths to the queue, and this module does the rest.
// Flow: validate file → transcribe via Python → on success rename with
// "_transcribed" suffix to prevent reprocessing.

const path = require("path");
const fs = require("fs");
const transcribe = require("./transcriber");

function jobTranscribe(filePath) {
  return new Promise(function(resolve) {
    let ext = path.extname(filePath).toLowerCase();
    let base = path.basename(filePath);

    // Skip already-transcribed
    if (base.indexOf("_transcribed") !== -1) {
      console.log("Skipping already-transcribed file:", filePath);
      resolve();
      return;
    }

    // Handle unexpected extensions (wav, etc.)
    if (ext !== ".m4a") {
      console.log("WARNING: unexpected file type:", filePath);
      resolve();
      return;
    }

    console.log("Processing:", filePath);

    // Run the transcription
    transcribe(filePath, function(success, outputPath) {
      if (!success) {
        console.log("Transcription FAILED:", filePath);
        resolve();
        return;
      }

      console.log("Transcription finished:", outputPath);

      // Rename after success
      const dir = path.dirname(filePath);
      const baseNoExt = path.basename(filePath, ext);
      const newPath = dir + "/" + baseNoExt + "_transcribed" + ext;

      fs.rename(filePath, newPath, function(err) {
        if (err) {
          console.log("ERROR renaming file:", err);
        } else {
          console.log("File renamed:", newPath);
        }
        resolve();
      });
    });
  });
}

module.exports = jobTranscribe;
