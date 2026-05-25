
import json
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from voice_service.speech_to_text import speech_to_text_openai
from voice_service.text_to_speech import text_to_speech_openai
from mentor_engine.report_builder import build_report
from mentor_engine.prompt_builder import build_system_prompt
from mentor_engine.mentors import deepseek_mentor
from image_service.upload_image import upload
from image_service.fetch_analysis import analyze

def custom_exception_handler(func, error_message):
    def wrapper(*args, **kwargs):
        print(f"Executing {func.__name__}")
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if error_message:
                print(error_message)
            else:
                print(f"An error occurred while executing {func.__name__}")
            raise e
    return wrapper

def start_session(image_path):
    
    slug = custom_exception_handler(upload, "Error uploading image")(image_path)
    
    data = custom_exception_handler(analyze, "Error fetching image analysis")(slug)
    
    report = custom_exception_handler(build_report, "Error building report")(data)
    
    system_prompt = custom_exception_handler(build_system_prompt, "Error building system prompt")(report)
    
    return system_prompt

def generate_mentor_response(system_prompt, conversation_history=[]):
    
    if len(conversation_history) == 0:
        conversation_history.append({"role": "system", "content": system_prompt})
    
    user_prompt = custom_exception_handler(speech_to_text_openai, "Error converting speech to text")('apps\\input\\user.ogg')
    
    conversation_history.append({"role": "user", "content": user_prompt})
    
    mentor_response = custom_exception_handler(deepseek_mentor, "Error generating mentor response")(system_prompt, user_prompt)
    
    return mentor_response

def save_audio_response(mentor_response):
    list_of_texts = [item["value"] for item in mentor_response["sequence"] if item.get("type") == "text"]
    if list_of_texts:
        for i, voice in enumerate(list_of_texts):
            custom_exception_handler(text_to_speech_openai, "Error converting text to speech")(voice, f"res_{i}")