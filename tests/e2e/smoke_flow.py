import os
from pathlib import Path
import sys
import requests


API_BASE = os.getenv("RADIDONE_API_BASE_URL", "http://localhost:8000")
IMAGE_PATH = os.getenv("RADIDONE_SMOKE_IMAGE")


def main() -> int:
    if not IMAGE_PATH:
        print("Set RADIDONE_SMOKE_IMAGE to a local panoramic X-ray path before running.")
        return 1

    image_file = Path(IMAGE_PATH)
    if not image_file.exists():
        print(f"Image not found: {image_file}")
        return 1

    session_resp = requests.post(f"{API_BASE}/api/sessions", json={"mode": "guided"})
    session_resp.raise_for_status()
    session = session_resp.json()

    with image_file.open("rb") as fh:
        upload_resp = requests.post(
            f"{API_BASE}/api/images",
            files={"file": fh},
            data={"sessionId": session["id"]},
        )
    upload_resp.raise_for_status()
    image = upload_resp.json()

    analysis_resp = requests.get(f"{API_BASE}/api/images/{image['id']}/results")
    analysis_resp.raise_for_status()
    analysis = analysis_resp.json()

    mentor_resp = requests.post(
        f"{API_BASE}/api/sessions/{session['id']}/mentor",
        json={"messageText": "Show me the key findings."},
    )
    mentor_resp.raise_for_status()
    mentor = mentor_resp.json()

    print("Session created:", session["id"])
    print("Image uploaded:", image["id"])
    print("Analysis keys:", list(analysis.get("analysisJson", {}).keys()))
    print("Mentor phase:", mentor.get("phase"))
    print("Sequence items:", len(mentor.get("mentorSequence", {}).get("sequence", [])))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
