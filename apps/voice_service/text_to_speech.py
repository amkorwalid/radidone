from pathlib import Path
from openai import OpenAI
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
from dotenv import load_dotenv
import os

load_dotenv()

def text_to_speech_openai(text, voice="alloy", instructions="Speak like a mentor."):
    
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    speech_file_path = Path(__file__).parent / "speech.mp3"

    with client.audio.speech.with_streaming_response.create(
        model="gpt-4o-mini-tts",
        voice=voice,
        input=text,
        instructions=instructions,
    ) as response:
        response.stream_to_file(speech_file_path)
    return speech_file_path

def text_to_speech_elevenlabs(text):
    client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    response = client.text_to_speech.convert(
        voice_id="1fz2mW1imKTf5Ryjk5su",
        text=text,
        output_format="mp3_44100_128",
    )
    play(response)

