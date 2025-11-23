// src/node/watcher.js
// Watches the recordings directory for new audio files and triggers follow-up
// processing (currently just logging; hook in transcription later).

const path = require('path');
const chokidar = require('chokidar');
const ensureDirectories = require('./ensureDirectories');
const transcribe = require('./transcriber');

ensureDirectories();
console.log("Folder check complete.");

var RECORDINGS_DIR = '/Users/joostokkinga/Documents/AutoTranscribe/recordings';

console.log('Watching for new audio files in:', RECORDINGS_DIR);

// Initialize a chokidar watcher to react only to new files (ignore existing).
var watcher = chokidar.watch(RECORDINGS_DIR, {
  ignored: /(^|[\/\\])\../,     // ignore dotfiles
  persistent: true,
  ignoreInitial: true           // only react to *new* files
});

watcher.on('add', function (filePath) {
  var ext = path.extname(filePath).toLowerCase();
  var base = path.basename(filePath);

  // 1. Skip already-processed files
  var alreadyDone = base.indexOf("_transcribed") !== -1;
  if (alreadyDone) {
    console.log("Skipping already-transcribed file:", filePath);
    return;
  }

 // 2. Only process .m4a
  if (ext === '.m4a') {
    console.log("New m4a recording detected:", filePath);

    // 3. Run the transcription
    transcribe(filePath, function (success, outputPath) {
      if (success) {
        console.log("Transcription finished:", outputPath);
      } else {
        console.log("Transcription FAILED for:", filePath);
      }
    });
  }
});

watcher.on('error', function (error) {
  console.error('Watcher error:', error);
});
