// src/node/jobSummarize.js
// Idempotent summarization job: given a transcript path, generate a summary
// via local Ollama and write <name>_summarised.txt to the summaries folder.

const fs = require("fs");
const path = require("path");
const summarizeOllama = require("./summarizeOllama");
const config = require("./config");

function jobSummarize(transcriptionPath) {
  return new Promise(async (resolve) => {
    try {
      if (!transcriptionPath || !transcriptionPath.endsWith(".txt")) {
        resolve();
        return;
      }

      const base = path.basename(transcriptionPath, ".txt");
      const outPath = path.join(config.summaries, `${base}_summarised.txt`);

      // Idempotent guard: skip if already summarized.
      if (fs.existsSync(outPath)) {
        console.log("Summary exists, skipping:", outPath);
        resolve();
        return;
      }

      await summarizeOllama(transcriptionPath);
      resolve();
    } catch (err) {
      console.log("Summary job failed:", err.message);
      resolve();
    }
  });
}

module.exports = jobSummarize;
