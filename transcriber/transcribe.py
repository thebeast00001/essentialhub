import sys
import os
import yt_dlp
import whisper
import warnings

# Suppress all warnings to ensure stdout only contains the transcript
warnings.filterwarnings("ignore")

def transcribe_youtube(url):
    audio_file = "audio.mp3"
    try:
        # 1. Download Audio using yt-dlp
        ydl_opts = {
            'format': 'm4a/bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '128',
            }],
            'outtmpl': 'audio', # results in audio.mp3 due to postprocessor
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # 2. Transcribe using Whisper (Base model for balance)
        # Using fp16=False to ensure compatibility with CPU-only environments
        model = whisper.load_model("base")
        result = model.transcribe(audio_file, fp16=False)
        
        # 3. Print ONLY the transcript text
        print(result["text"].strip())

    except Exception:
        # Handle error quietly as per requirement
        sys.exit(1)
    finally:
        # 4. Clean up temporary files
        if os.path.exists(audio_file):
            try:
                os.remove(audio_file)
            except:
                pass

if __name__ == "__main__":
    if len(sys.argv) > 1:
        transcribe_youtube(sys.argv[1])
    else:
        sys.exit(1)
