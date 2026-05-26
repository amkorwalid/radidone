import requests
import time
from dotenv import load_dotenv
import os
from pathlib import Path
from typing import Any, Dict, Tuple

from image_service.normalize_analysis import normalize_analysis

load_dotenv()

API_KEY = os.getenv('THAKAAMED_API_KEY')
FACILITY = os.getenv('THAKAAMED_API_FACILITY')
BASE = os.getenv('THAKAAMED_API_BASE')

def analyze(slug):
# Poll — wait for `is_done: true`
    for _ in range(60): # max 60 attempts ≈ 3 minutes
        time.sleep(3)
        r = requests.get(BASE, params={'id': slug})
        data = r.json()
        if data.get('is_done') is True:
            if data.get('error_status'):
                raise RuntimeError(data.get('error_message') or data.get('message'))
            return data
        
    raise TimeoutError(f"Analysis {slug} not complete after 3 minutes")


def analyze_and_normalize(slug: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    raw = analyze(slug)
    return raw, normalize_analysis(raw)