import sys
import os
import yt_dlp
import subprocess
import warnings

# Suppress all warnings
warnings.filterwarnings("ignore")

def transcribe_youtube(url):
    audio_file = "audio.mp3"
    try:
        # 1. Download Audio using yt-dlp
        # We use a very light-weight m4a download first then convert to mp3
        ydl_opts = {
            'format': 'm4a/bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'outtmpl': 'audio', # results in audio.mp3
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        if not os.path.exists(audio_file):
            sys.exit(1)

        # 2. Transcribe using Whisper CLI (MORE ROBUST THAN LIBRARY)
        # Using the base model for a good speed/accuracy balance
        # --output_format txt will produce audio.txt
        cmd = [
            "whisper",
            audio_file,
            "--model", "base",
            "--output_format", "txt",
            "--fp16", "False", # Ensure it works on CPUs without FP16 support
            "--language", "en"
        ]
        
        # Run whisper and wait
        subprocess.run(cmd, check=True, capture_output=True, text=True)

        # 3. Read and print the result
        result_file = "audio.txt"
        if os.path.exists(result_file):
            with open(result_file, "r", encoding="utf-8") as f:
                print(f.read().strip())
        else:
            sys.exit(1)

    except Exception as e:
        # Silently fail as per user preference (or log for debugging)
        sys.exit(1)
    finally:
        # 4. Clean up all temporary files
        for f in [audio_file, "audio.txt", "audio.vtt", "audio.srt", "audio.tsv", "audio.json"]:
            if os.path.exists(f):
                try: os.remove(f)
                except: pass

if __name__ == "__main__":
    if len(sys.argv) > 1:
        transcribe_youtube(sys.argv[1])
    else:
        sys.exit(1)
