// Summarize transcription .txt files using a local Ollama model.
// Call chain: watcher -> jobSummarize -> summarizeOllama.
// Order inside this module:
// 1) read transcript
// 2) clean + detect language + topic via cleanTranscript
// 3) derive fallback topic if missing
// 4) compute word budget and build summary prompt
// 5) call Ollama for summary
// 6) ensure title/slug and inject transcript if missing
// Paths and model/prompt/temperature are read from config.js.

const fs = require("fs");
const fetch = require("node-fetch");
const config = require("./config");
const cleanTranscript = require("./cleanTranscript");
const logger = require("./logger");

const summarizerCfg = config.summarizer;
const DEFAULT_TEMP = summarizerCfg.temperature || 0.2;

// Fallback topic derivation without language-specific stopwords:
// take frequent tokens (length>=3), treat very frequent tokens as noise, and pick the top few.
function deriveTopicFromText(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\u00c0-\u024f0-9\s-]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";

  const counts = {};
  for (const w of words) {
    if (w.length < 3) continue;
    counts[w] = (counts[w] || 0) + 1;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  // Treat tokens that account for >8% of all occurrences as noise (dynamic stopwords).
  const dynamicStop = new Set(sorted.filter(([, c]) => c / total > 0.08).map(([w]) => w));

  const top = sorted
    .filter(([w]) => !dynamicStop.has(w))
    .slice(0, 3)
    .map(([w]) => w);

  if (top.length === 0) return "";
  return top.join(" ");
}

async function callOllama(prompt, temperature = DEFAULT_TEMP) {
  const body = {
    model: summarizerCfg.model,
    prompt,
    stream: false,
    options: { temperature }
  };

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
  return data.response || "";
}

function computeWordBudget(text) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 400) return 120;
  if (wordCount < 1200) return 220;
  if (wordCount < 2500) return 350;
  return 500;
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/**
 * Summarize a single transcription file via Ollama.
 * @param {string} transcriptionPath absolute path to a .txt file
 * @returns {Promise<{summary: string, title: string, titleSlug: string, cleanedTranscript: string, language: string}>}
 */
async function summarizeFile(transcriptionPath) {
  if (!transcriptionPath.endsWith(".txt")) {
    return { summary: "", title: "", titleSlug: "", cleanedTranscript: "" , language: ""};
  }

  const text = fs.readFileSync(transcriptionPath, "utf8");
  console.log("Cleaning transcript + extracting topic via cleaner:", transcriptionPath);
  const { cleanedTranscript, topic, language } = await cleanTranscript(text);

  // Ensure we always have a topic: derive from cleaned text if model omitted it.
  const fallbackTopic = deriveTopicFromText(cleanedTranscript || text);
  const effectiveTopic = topic || fallbackTopic || "Geen onderwerp gevonden";

  const targetSummaryWords = computeWordBudget(cleanedTranscript);
  const prompt = summarizerCfg.prompt
    .replace(/\{\{TOPIC\}\}/g, effectiveTopic)
    .replace(/\{\{SUMMARY_WORD_TARGET\}\}/g, String(targetSummaryWords))
    .replace(/\{\{OUTPUT_LANG\}\}/g, language || "auto");

  const summaryPrompt = [
    prompt,
    "",
    "Beschikbaar transcript (gecorrigeerd):",
    cleanedTranscript
  ].join("\n");

  console.log("Summarizing via Ollama:", transcriptionPath);
  const summary = await callOllama(summaryPrompt, DEFAULT_TEMP);

  let title = effectiveTopic || "";
  const lines = summary
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Prefer the H1 line ("# ...") if present.
  const h1Line = lines.find((line) => /^#\s*/.test(line));
  if (h1Line) {
    title = h1Line.replace(/^#+\s*/, "").trim();
  }
  // Otherwise check for "Titel:" marker.
  if (!title) {
    const titleMarker = lines.find((line) => /titel:/i.test(line));
    if (titleMarker) {
      title = titleMarker.replace(/titel:/i, "").trim();
    }
  }
  // Fallback: first non-empty line (1-5 words).
  if (!title && lines.length > 0) {
    title = lines[0].split(/\s+/).slice(0, 5).join(" ");
  }
  const titleSlug = slugify(title || effectiveTopic);
  logger.info("Slug generation", {
    transcriptionPath,
    effectiveTopic,
    title,
    titleSlug
  });

  const ensuredTranscript = cleanedTranscript || text;
  const hasTranscript = /(^|\n)##\s*Transcript/i.test(summary);
  const finalSummary = hasTranscript
    ? summary
    : [summary.trim(), "", "## Transcript", "", ensuredTranscript.trim()].join("\n");

  return { summary: finalSummary, title, titleSlug, cleanedTranscript: ensuredTranscript, language };
}

module.exports = summarizeFile;
