# transcribe_mlx.py
import sys
import mlx_whisper

# 1. Read arguments passed from Node
input_audio = sys.argv[1]
output_txt = sys.argv[2]

print("Starting MLX Whisper transcription (multilingual turbo)…")
print("Input:", input_audio)
print("Output:", output_txt)

# 2. Run MLX Whisper
result = mlx_whisper.transcribe(
    input_audio,
    path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
    language="nl",  # optionally force Dutch
    condition_on_previous_text=False
)

# 3. Write transcript to .txt
with open(output_txt, "w", encoding="utf-8") as f:
    f.write(result["text"])

print("Done.")