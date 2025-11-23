# AutoTranscribe

Automatic transcription pipeline for local macOS using **Python**, **MLX Whisper (Apple Silicon)**, and a **Node-based file watcher**.

This project lets you:

- Drop an audio file in a folder
- Automatically transcribe it
- Save the text output locally
- Run fully offline
- Use either **Fast CPU Whisper** or **Metal-accelerated MLX Whisper**

---

## 📁 Project Structure

```
AutoTranscribe/
│
├── src/
│   ├── python/
│   │   ├── transcribe.py        # Faster-Whisper (CPU) version
│   │   └── transcribe_mlx.py    # MLX Whisper (Metal) version
│   │
│   └── node/
│       ├── watcher.js           # Watches a folder and triggers scripts
│       ├── package.json
│       └── package-lock.json
│
├── .gitignore
└── README.md

```

---

## 🔧 1. Python Environment Setup

### Install Python 3.11 (if missing)

```
brew install python@3.11

```

### Create a dedicated venv

```
cd ~/Code/AutoTranscribe
python3.11 -m venv venv
source venv/bin/activate

```

### Install required packages

**CPU Whisper (faster-whisper):**

```
pip install --upgrade pip
pip install faster-whisper

```

**MLX Whisper (Apple Silicon accelerated):**

```
pip install mlx-whisper

```

---

## 🎤 2. Using Faster-Whisper (Python CPU)

File: `src/python/transcribe.py`

Usage:

```
source venv/bin/activate
python3.11 src/python/transcribe.py /path/to/audio.m4a

```

Output:

- Detects language
- Prints transcription
- Runs fully offline (after models downloaded)

---

## ⚡️ 3. Using MLX Whisper (Metal / Apple Silicon)

File: `src/python/transcribe_mlx.py`

Usage:

```
source venv/bin/activate
python3.11 src/python/transcribe_mlx.py /path/to/audio.m4a

```

Notes:

- First run downloads \~1.5 GB MLX model
- Much faster on M1/M2/M3 Macs
- Perfect for daily automatic transcription

---

## 👁 4. Node Watcher (Auto-transcribe on new files)

Install Node dependencies:

```
cd src/node
npm install

```

Run watcher:

```
node watcher.js

```

What it does:

- Watches a folder (e.g., iCloud/Just Press Record)
- When a new file arrives:
  - copies & renames it
  - triggers Python transcription
  - saves `.txt` output

You can modify paths directly inside `watcher.js`.

---

## 🧱 5. Architecture Overview

```
                +------------------------------+
                |   Watched Folder (iCloud)    |
                |   e.g. Just Press Record     |
                +------------------------------+
                               |
                               | New file event
                               v
                     +------------------+
                     | node watcher.js  |
                     +------------------+
                               |
                               | Calls Python script
                               v
                +-----------------------------------+
                |   Python Transcriber (choose):    |
                |   - transcribe.py  (CPU)          |
                |   - transcribe_mlx.py (Metal)     |
                +-----------------------------------+
                               |
                               | Writes output
                               v
                +------------------------------+
                | /transcriptions/output.txt    |
                +------------------------------+

```

---

## 🧪 6. Quick Test

```
source venv/bin/activate
python3.11 src/python/transcribe_mlx.py test.m4a

```

If you see Dutch handled correctly → everything works.

---

## 📌 7. Recommended Ignore Rules (.gitignore)

```
venv/
models/
temp/
node_modules/
**/__pycache__/
.DS_Store
*.log
```
