import json
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()  

def deepseek_mentor(system_prompt: str, user_prompt: str) -> dict:

    client = OpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com",
    )
    
    messages = [{"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}]

    response = client.chat.completions.create(
        model="deepseek-v4-pro",
        messages=messages,
        response_format={
            'type': 'json_object'
        }
    )

    return json.loads(response.choices[0].message.content)

