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
// TEST BLOCK
// module → the current file
// require.main → the file that started the program
if (require.main === module) {
  let testInput = directories.testrecording + "/2025-11-21_14-00-02.m4a";

  transcribe(testInput, function(success, outputFilePath) {
    console.log("Success?", success);
    console.log("Transcript saved to:", outputFilePath);
  });
}

module.exports = transcribe;