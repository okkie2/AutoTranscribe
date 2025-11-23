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
    prompt: [
      "Eerste regel exact: 'Titel: <1-5 woorden>'. Geen andere tekst op die regel.",
      "Daarna de samenvatting in het Nederlands, max 120 woorden, met bullets.",
      "Sluit af met 'Acties:' gevolgd door bullets of 'Geen'.",
      "Transcript:",
    ].join("\n"),
    endpoint: "http://127.0.0.1:11434/api/generate"
  }
};

// Make code available.
module.exports = 
  directories;
