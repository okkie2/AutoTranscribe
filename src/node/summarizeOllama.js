// Summarize transcription .txt files using a local Ollama model.
// This module exports a function so watcher/jobTranscribe can trigger summaries.
// Paths and model/prompt/temperature are read from config.js.

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const config = require("./config");

const transcriptionsDir = config.transcriptions;
const summariesDir = config.summaries;
const summarizerCfg = config.summarizer;

/**
 * Summarize a single transcription file via Ollama.
 * @param {string} transcriptionPath absolute path to a .txt file
 * @returns {Promise<string>} resolves to summary output path
 */
async function summarizeFile(transcriptionPath) {
  if (!transcriptionPath.endsWith(".txt")) {
    return "";
  }

  const base = path.basename(transcriptionPath, ".txt");
  const outPath = path.join(summariesDir, `${base}_summarised.txt`);

  // Skip if already summarized.
  if (fs.existsSync(outPath)) {
    console.log("Summary exists, skipping:", outPath);
    return outPath;
  }

  const text = fs.readFileSync(transcriptionPath, "utf8");
  const body = {
    model: summarizerCfg.model,
    prompt: `${summarizerCfg.prompt}\n${text}`,
    stream: false,
    options: { temperature: summarizerCfg.temperature }
  };

  console.log("Summarizing via Ollama:", transcriptionPath);
  const res = await fetch(summarizerCfg.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const msg = `Ollama request failed: ${res.status} ${res.statusText}`;
    console.error(msg);
    throw new Error(msg);
  }
  const data = await res.json();
  const summary = data.response || "";

  fs.mkdirSync(summariesDir, { recursive: true });
  fs.writeFileSync(outPath, summary, "utf8");
  console.log("Saved summary to:", outPath);
  return outPath;
}

module.exports = summarizeFile;
