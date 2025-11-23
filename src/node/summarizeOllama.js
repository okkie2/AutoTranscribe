// Summarize transcription .txt files using a local Ollama model.
// This module exports a function so watcher/jobTranscribe can trigger summaries.
// Paths and model/prompt/temperature are read from config.js.

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const config = require("./config");

const summarizerCfg = config.summarizer;

/**
 * Summarize a single transcription file via Ollama.
 * @param {string} transcriptionPath absolute path to a .txt file
 * @returns {Promise<{summary: string, title: string, titleSlug: string}>}
 */
async function summarizeFile(transcriptionPath) {
  if (!transcriptionPath.endsWith(".txt")) {
    return { summary: "", title: "", titleSlug: "" };
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

  // Extract title from the first line starting with "Titel:" (case-insensitive).
  let title = "";
  const firstLine = summary.split("\n").find((line) => /titel:/i.test(line));
  if (firstLine) {
    title = firstLine.replace(/titel:/i, "").trim();
  }
  // Fallback: if no title, derive from first non-empty summary line (first 1-5 words).
  if (!title) {
    const lines = summary
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) {
      title = lines[0].split(/\s+/).slice(0, 5).join(" ");
    }
  }
  let titleSlug = "";
  if (title) {
    titleSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
  }

  return { summary, title, titleSlug };
}

module.exports = summarizeFile;
