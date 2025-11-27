// src/node/config.js
// Global configuration for AutoTranscribe. Centralizes filesystem locations so
// other modules can import a single source of truth instead of hardcoding
// scattered paths.

let os = require("os");
let home = os.homedir();

// --- Directories ---
// We keep all recorded audio, generated transcripts, and summaries under a
// user-local folder to avoid permission issues and to keep data grouped
// together. Using the home directory makes the app portable across machines.
let projectRoot = home + "/Documents/AutoTranscribe";

// Expose every directory explicitly. If you add new pipeline stages that write files,
// define the path here and consume it elsewhere.
let directories = {
  // Content directories
  projectRoot: projectRoot,
  recordings: projectRoot + "/recordings",
  transcriptions: projectRoot + "/transcriptions",
  summaries: projectRoot + "/summaries",
  // Source from Just Press Record (iCloud)
  jprSourceRoot: home + "/Library/Mobile Documents/iCloud~com~openplanetsoftware~just-press-record/Documents",

  // Code environment directories
  pythonBin: home + "/Code/AutoTranscribe/venv/bin/python3",
  pythonScriptMLX: home + "/Code/AutoTranscribe/src/python/transcribe_mlx.py",

  // Summarizer (Ollama) settings
  summarizer: {
    // Model must exist locally in Ollama (`ollama pull ...`).
    model: "llama3.1:8b-instruct-q4_K_M",
    temperature: 0.2,
    // Multi-pass: first clean + extract title, then summarize with a budget.
    cleanerPrompt: [
      "You will receive a transcript. Fix spelling, grammar, and wrong word choices in context (even if the word itself is valid).",
      "Keep meaning and order; very light rephrasing for clarity is allowed, but do not drop or change meaning.",
      "Leave uncertain parts unchanged; pick the most probable correct wording.",
      "Respond only as JSON with keys 'title' (1-5 words) and 'cleaned_transcript'. No extra text.",
      "Use the output language: {{OUTPUT_LANG}}."
    ].join("\n"),
    prompt: [
      "Produce valid Markdown in the output language: {{OUTPUT_LANG}}. Use '*' for bullets (not '-').",
      "",
      "Line 1: '# <title (1-5 words)>' (do not include the word 'topic'). Then one blank line.",
      "Prefer the detected title: {{TOPIC}}.",
      "Title must reflect the core of the conversation; avoid vague or generic words.",
      "",
      "Use headings translated to the output language with the same meaning as 'Summary' and 'Transcript' (e.g., '## Summary' / '## Transcript'); one blank line before and after each heading.",
      "",
      "'## Summary' (translated): use subheadings (###) with bullets. Target length: about {{SUMMARY_WORD_TARGET}} words.",
      "Focus on key points, main ideas, facts, and notable names/numbers (no meeting-specific actions required).",
      "",
      "'## Transcript': include the full, cleaned transcript below without omissions or shortening.",
      "Use exactly the cleaned transcript provided. No paraphrasing or summarizing."
    ].join("\n"),
    endpoint: "http://127.0.0.1:11434/api/generate"
  }
};

// Make code available.
module.exports = 
  directories;
