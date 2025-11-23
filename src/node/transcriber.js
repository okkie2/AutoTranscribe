// src/node/transcriber.js
// Runs the MLX Whisper transcription and writes output to /transcriptions.

let directories = require("./config");
let path = require("path");
let spawn = require("child_process").spawn;

// ------------------------------------------------------
// transcribe(inputFilePath, callback)
// callback(successBoolean, outputTxtPath)
// ------------------------------------------------------
function transcribe(inputFilePath, callback) {
  // Derive output .txt filename from the input .m4a
  let baseName = path.basename(inputFilePath, ".m4a");
  let outputFilePath = directories.transcriptions + "/" + baseName + ".txt";

  console.log("Transcribing:", inputFilePath);
  console.log("→ Saving output to:", outputFilePath);

  // Spawn Python with MLX script
  let child = spawn(directories.pythonBin, [
    directories.pythonScriptMLX,
    inputFilePath,
    outputFilePath
  ]);

  child.stdout.on("data", function(data) {
    console.log("PYTHON:", data.toString());
  });

  child.stderr.on("data", function(data) {
    console.log("PYTHON ERR:", data.toString());
  });

  child.on("close", function(code) {
    let ok = code === 0;
    callback(ok, outputFilePath);
  });
}
module.exports = transcribe;
