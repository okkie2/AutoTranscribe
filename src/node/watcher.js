const path = require('path');
const chokidar = require('chokidar');
const ensureDirectories = require('./ensureDirectories');
const { lstat } = require('fs');

ensureDirectories();
console.log("Folder check complete.");

var RECORDINGS_DIR = '/Users/joostokkinga/Documents/AutoTranscribe/recordings';

console.log('Watching for new audio files in:', RECORDINGS_DIR);

var watcher = chokidar.watch(RECORDINGS_DIR, {
  ignored: /(^|[\/\\])\../,     // ignore dotfiles
  persistent: true,
  ignoreInitial: true           // only react to *new* files
});

watcher.on('add', function (filePath) {
  var ext = path.extname(filePath).toLowerCase();

  if (ext === '.m4a') {
    console.log('New m4a recording detected:', filePath);
    // later: transcribe(filePath)
  } 
});

watcher.on('error', function (error) {
  console.error('Watcher error:', error);
});

