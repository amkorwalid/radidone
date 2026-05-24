import requests
import time
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv()

API_KEY = os.getenv('THAKAAMED_API_KEY')
FACILITY = os.getenv('THAKAAMED_API_FACILITY')
BASE = os.getenv('THAKAAMED_API_BASE')

def upload(image_path):
    
    # check if file exists
    if not Path(image_path).is_file():
        raise FileNotFoundError(f"File {image_path} does not exist")

    # Upload the image
    with open(image_path, 'rb') as f:
        r = requests.post(BASE, data={'api_key': API_KEY, 'facility_code': FACILITY, }, files={'image': f}) 
        r.raise_for_status()
    slug = r.json()['id']
    
    return slug

    

