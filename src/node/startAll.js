// src/node/startAll.js
// Convenience launcher: runs the ingest (Just Press Record) watcher and the
// main transcription watcher side by side. Use `npm run start:local` to start
// both when you want the full pipeline running.

const { spawn } = require("child_process");

function launch(name, script) {
  const child = spawn("node", [script], { stdio: "inherit" });
  child.on("exit", (code) => {
    console.log(`${name} exited with code ${code}`);
  });
  child.on("error", (err) => {
    console.error(`${name} failed:`, err);
  });
  return child;
}

launch("ingestJustPressRecord", "ingestJustPressRecord.js");
launch("watcher", "watcher.js");
