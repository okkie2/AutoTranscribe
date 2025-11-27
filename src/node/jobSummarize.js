// src/node/jobSummarize.js
// Idempotent summarization job. Flow order:
// 1) validate path (must be under transcriptions/)
// 2) skip if a summary already exists
// 3) call summarizeOllama to clean + summarize + derive title/slug
// 4) write summary Markdown
// 5) write cleaned transcript to <name>_summarised.txt

const fs = require("fs");
const path = require("path");
const summarizeOllama = require("./summarizeOllama");
const config = require("./config");
const logger = require("./logger");

function findSummaryForBase(normalizedBase) {
  try {
    const entries = fs
      .readdirSync(config.summaries, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
    return entries.find((name) => name.startsWith(normalizedBase) && name.endsWith(".md"));
  } catch (_) {
    return null;
  }
}

function appendTopic(baseName, topicSlug) {
  if (!topicSlug) return baseName;
  if (baseName.endsWith(`_${topicSlug}`)) return baseName;
  return `${baseName}_${topicSlug}`;
}

function findAndRenameAudio(baseBase, topicSlug) {
  try {
    const files = fs
      .readdirSync(config.recordings, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);

    logger.info("Audio rename: scanning recordings for base", baseBase, "topic", topicSlug);

    const candidate = files.find((name) => {
      const stem = path.basename(name, path.extname(name));
      return stem === baseBase;
    });
    if (!candidate) return;

    const ext = path.extname(candidate);
    const currentPath = path.join(config.recordings, candidate);
    const desiredStem = appendTopic(baseBase, topicSlug);
    const desiredName = `${desiredStem}${ext}`;
    logger.info("Audio rename: candidate", candidate, "desired", desiredName);
    if (candidate === desiredName) return;

    const desiredPath = path.join(config.recordings, desiredName);
    fs.renameSync(currentPath, desiredPath);
    logger.info("Renamed audio to:", desiredPath);
  } catch (err) {
    logger.error("Could not rename audio with topic:", err.message);
  }
}

function jobSummarize(transcriptionPath) {
  return new Promise(async (resolve) => {
    try {
      if (!transcriptionPath || !transcriptionPath.endsWith(".txt")) {
        logger.info("Skipping non-transcript path:", transcriptionPath);
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

      // If any summary for this base already exists, skip entirely to avoid loops on renamed files.
      const preExisting = findSummaryForBase(normalizedBase);
      if (preExisting) {
        logger.info("Skipping: summary already exists for base", normalizedBase, "->", preExisting);
        resolve();
        return;
      }

      // Otherwise, generate summary, save, then rename transcript.
      const { summary, title, titleSlug, cleanedTranscript, language } = await summarizeOllama(transcriptionPath);
      logger.info("Topic resolved for transcript", {
        transcript: transcriptionPath,
        topic: titleSlug || "",
        rawTitle: title,
        titleSlug
      });

      const topicPart = titleSlug || "";
      const baseWithTopic = appendTopic(normalizedBase, topicPart);
      logger.info("Summarize naming:", {
        base,
        normalizedBase,
        topicPart,
        baseWithTopic
      });

      const desiredSummaryName = `${baseWithTopic}.md`;
      const summaryPath = path.join(config.summaries, desiredSummaryName);
      const desiredTranscriptPath = path.join(transcriptDir, `${baseWithTopic}.txt`);

      if (fs.existsSync(summaryPath)) {
        logger.info("Skipping: summary file already exists:", summaryPath);
        resolve();
        return;
      }

      fs.mkdirSync(config.summaries, { recursive: true });
      fs.writeFileSync(summaryPath, summary, "utf8");
      logger.info("Saved summary to:", summaryPath);
      // Log snapshot of summaries for debugging.
      try {
        const entries = fs
          .readdirSync(config.summaries, { withFileTypes: true })
          .filter((d) => d.isFile())
          .map((d) => d.name);
        logger.info("Summaries now:", entries.join(", "));
      } catch (_) {}

      // Rename the original transcript to include the topic, then write the cleaned copy.
      try {
        if (transcriptionPath !== desiredTranscriptPath) {
          fs.renameSync(transcriptionPath, desiredTranscriptPath);
        }
      } catch (renameErr) {
        logger.error("Could not rename transcript before writing cleaned copy:", renameErr.message);
      }

      try {
        const transcriptContent = cleanedTranscript || fs.readFileSync(desiredTranscriptPath, "utf8");
        fs.writeFileSync(desiredTranscriptPath, transcriptContent, "utf8");
        logger.info("Wrote cleaned transcript to:", desiredTranscriptPath);
      } catch (writeErr) {
        logger.error("Could not write cleaned transcript:", writeErr.message);
      }

      // Best-effort: rename the source audio to include the topic.
      if (topicPart) {
        findAndRenameAudio(normalizedBase, topicPart);
      }

      resolve();
    } catch (err) {
      logger.error("Summary job failed:", err.message);
      resolve();
    }
  });
}

module.exports = jobSummarize;
