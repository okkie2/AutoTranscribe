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
      const absTranscript = path.resolve(transcriptionPath);
      const transcriptsRoot = path.resolve(config.transcriptions);

      // Only process transcripts that live in the transcriptions directory.
      if (!absTranscript.startsWith(transcriptsRoot)) {
        console.log("Skipping non-transcript path:", transcriptionPath);
        resolve();
        return;
      }

      const base = path.basename(transcriptionPath, ".txt");
      const normalizedBase = base.replace(/_summarised$/, "");
      const transcriptDir = path.dirname(transcriptionPath);
      const finalTranscriptPath = path.join(transcriptDir, `${normalizedBase}_summarised.txt`);

      // Helper: check if a summary for this base already exists.
      function findExistingSummary() {
        try {
          return fs
            .readdirSync(config.summaries, { withFileTypes: true })
            .filter((d) => d.isFile())
            .map((d) => d.name)
            .find(
              (name) =>
                name.startsWith(`${normalizedBase}_summary`) &&
                name.endsWith(".txt")
            );
        } catch (_) {
          return "";
        }
      }

      let existingSummary = findExistingSummary();

      // If summary exists, rename transcript if needed and stop; don't write a new summary.
      if (existingSummary) {
        const existingPath = path.join(config.summaries, existingSummary);
        console.log("Summary already present, skipping new write:", existingPath);
        if (!fs.existsSync(finalTranscriptPath)) {
          try {
            fs.renameSync(transcriptionPath, finalTranscriptPath);
            console.log("Renamed transcript to:", finalTranscriptPath);
          } catch (renameErr) {
            console.log("Could not rename transcript:", renameErr.message);
          }
        }
        resolve();
        return;
      }

      // Otherwise, generate summary, save, then rename transcript.
      const { summary, title, titleSlug } = await summarizeOllama(transcriptionPath);

      const topicPart = titleSlug ? `_summary_${titleSlug}` : `_summary`;
      const summaryPath = path.join(config.summaries, `${normalizedBase}${topicPart}.txt`);

      fs.mkdirSync(config.summaries, { recursive: true });
      fs.writeFileSync(summaryPath, summary, "utf8");
      console.log("Saved summary to:", summaryPath);
      // Log snapshot of summaries for debugging.
      try {
        const entries = fs
          .readdirSync(config.summaries, { withFileTypes: true })
          .filter((d) => d.isFile())
          .map((d) => d.name);
        console.log("Summaries now:", entries.join(", "));
      } catch (_) {}

      // Rename transcript after summarizing, if not already.
      if (!transcriptionPath.endsWith("_summarised.txt")) {
        try {
          fs.renameSync(transcriptionPath, finalTranscriptPath);
          console.log("Renamed transcript to:", finalTranscriptPath);
        } catch (renameErr) {
          console.log("Could not rename transcript:", renameErr.message);
        }
      }

      resolve();
    } catch (err) {
      console.log("Summary job failed:", err.message);
      resolve();
    }
  });
}

module.exports = jobSummarize;
