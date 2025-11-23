# TODO

- Logging: Write success/failure/timing to `~/Documents/AutoTranscribe/logs` for recording→transcript and transcript→summary runs.
- Start/stop reliability: Harden launchd/manual start (PID lock, duplicate detection) and add a small healthcheck script.
- Topic naming: Derive a topic from the first bullet (3-5 words) for more meaningful summary filenames.
- Progress visibility: Emit per-file progress (queued/transcribing/summarizing/done) with timestamps.
- Test automation: Add integration tests for summarizer/title slug, backlog processing, and large-file handling.
- Cleanup/simplification: Refactor watcher/summarizer modules and shared helpers for clarity.
- License: Add a LICENSE file and mention it in README.
- Log rotation/size cap for `~/Documents/AutoTranscribe/logs`.
- Backlog scan on startup to enqueue unprocessed recordings/transcripts.
- Config validation at startup (paths/model present), clearer ffmpeg/Whisper error handling + retries for large/corrupt files.
- Install wizard (future): scripted setup to check/install Python/venv, Node deps, ffmpeg, Ollama model, create folders, install launchd plist, and offer a smoke test.
