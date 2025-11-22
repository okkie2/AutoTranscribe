import mlx_whisper

AUDIO = "/Users/joostokkinga/Documents/AutoTranscribe/testrecording/2025-11-21_14-00-02.m4a"

print("Starting MLX Whisper transcription (multilingual turbo)…")

result = mlx_whisper.transcribe(
    AUDIO,
    path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
    language="nl",  # force correct decoding
    condition_on_previous_text=False
)

print("\n--- TRANSCRIPTION ---\n")
print(result["text"])
