import sys
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from mentor_engine.shapes_builder import transform


def normalize_analysis(data: Dict[str, Any]) -> Dict[str, Any]:
    if not data:
        return {}
    try:
        return transform(data)
    except Exception:
        return {}
