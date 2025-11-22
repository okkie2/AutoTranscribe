from faster_whisper import WhisperModel

model = WhisperModel(
    "large-v3",
    device="cpu",
    compute_type="int8"
)

audio = "/Users/joostokkinga/Documents/AutoTranscribe/testrecording/2025-11-21_14-00-02.m4a"

segments, info = model.transcribe(audio)

print("Detected language:", info.language)

for seg in segments:
    print(seg.text)
