// Clean and lightly normalize transcripts using a constrained LLM pass.
// Goal: fix spelling/grammar in-context across multiple languages,
// optionally extract a short topic hint. Keep changes minimal to avoid
// paraphrasing or content loss.
// Order:
// 1) detect language (LLM)
// 2) build a cleaning prompt with output language + guardrails
// 3) call Ollama (no streaming)
// 4) parse JSON for cleaned_transcript/topic; fall back to raw text on failure

const fetch = require("node-fetch");
const config = require("./config");

const summarizerCfg = config.summarizer;
const DEFAULT_TEMP = summarizerCfg.temperature || 0.2; // default temperature reused across calls

async function callOllama(prompt, temperature = DEFAULT_TEMP) {
  // Single place to call Ollama so we can reuse options and error handling.
  const body = {
    model: summarizerCfg.model,
    prompt,
    stream: false,
    options: { temperature }
  };

  // Send a simple JSON POST to the local Ollama endpoint.
  // We disable streaming so we get the entire reply as one JSON blob, which
  // keeps this helper straightforward: build body -> POST -> read JSON.
  // That way every caller can just await a string response without juggling
  // streaming chunks or event listeners.
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

function extractJsonObject(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  try {
    return JSON.parse(candidate);
  } catch (_) {
    return {};
  }
}

async function detectLanguageLLM(text) {
  // Ask the LLM to identify the language in ISO 639-1 (e.g., en, nl, fr).
  // Using a short sample keeps latency down while still giving enough signal.
  const sample = text.slice(0, 1000);
  const prompt = [
    "Detect the primary language of this text.",
    "Respond with only the ISO 639-1 code (e.g., en, nl, fr, de, es).",
    "",
    "Text:",
    '"""',
    sample,
    '"""'
  ].join("\n");

  const response = await callOllama(prompt, 0);
  const code = (response || "").trim().slice(0, 5).toLowerCase();
  if (/^[a-z]{2}$/.test(code)) return code;
  return "";
}

async function cleanTranscript(text) {
  // 1) Detect language (LLM) to guide spelling/grammar.
  // 2) Run the cleaner prompt to fix errors and optionally extract a topic.
  const lang = (await detectLanguageLLM(text)) || "auto";
  // Emphasize to the model that it must also correct wrong word choices
  // (valid word, wrong context) while keeping meaning and order intact.
  const correctionGuidance = [
    "Fix spelling, grammar, AND wrong word choices in context (even if the word itself is valid).",
    "Keep meaning and order; light rephrasing for clarity is allowed, but do not drop content or change meaning.",
    "Choose the most probable correct wording; leave uncertain parts unchanged."
  ].join("\n");
  const prompt = [
    correctionGuidance,
    summarizerCfg.cleanerPrompt,
    "",
    `Output language: ${lang}`,
    "",
    "Transcript:",
    '"""',
    text,
    '"""'
  ].join("\n");

  const response = await callOllama(prompt, DEFAULT_TEMP);
  const parsed = extractJsonObject(response);

  const cleanedTranscript =
    (parsed.cleaned_transcript || parsed.cleanedTranscript || "").trim() ||
    response.trim() ||
    text;
  // Topic is optional; if present, downstream summary uses it for the title.
  const topic = (parsed.topic || "").toString().trim();

  return { cleanedTranscript, topic, language: lang };
}

module.exports = cleanTranscript;
