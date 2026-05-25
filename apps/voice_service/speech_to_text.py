from openai import OpenAI
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv()


def speech_to_text_openai(audio_file_path):
    
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    except Exception as e:
        print(f"Error initializing OpenAI client: {e}")
        return None
    
    if not os.path.isfile(audio_file_path):
        raise FileNotFoundError(f"File {audio_file_path} does not exist.")
    audio_file = open(audio_file_path, "rb")

    transcription = client.audio.transcriptions.create(
        model="whisper-1", 
        file=audio_file
    )

    return transcription.text
