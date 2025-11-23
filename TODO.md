# TODO

- Logging: Write success/failure/timing to `~/Documents/AutoTranscribe/logs` for recording→transcript and transcript→summary runs.
- Start/stop reliability: Harden launchd/manual start (PID lock, duplicate detection) and add a small healthcheck script.
- Topic naming: If no explicit `Titel:` is emitted, derive a topic from the first bullet (3–5 words) for more meaningful summary filenames.
- Progress visibility: Emit per-file progress (queued/transcribing/summarizing/done) with timestamps.
- Test automation: Add integration tests for summarizer/title slug, backlog processing, and large-file handling.
- Cleanup/simplification: Refactor watcher/summarizer modules and shared helpers for clarity.
- License: Add a LICENSE file and mention it in README.
