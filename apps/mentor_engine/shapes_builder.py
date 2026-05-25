#!/usr/bin/env python3
"""
shapes_builder.py
---------------------
Transforms a Thakaa v2.3 dental AI analysis JSON into a clean,
structured JSON optimised for powering a text analysis report.

Usage:
    python3 shapes_builder.py sample_v23_analysis output.json

If output path is omitted the result is written next to the input
file with a _structured.json suffix.
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict


# ── FDI helpers ───────────────────────────────────────────────────────────────

QUADRANT_NAMES = {"1": "Upper Right", "2": "Upper Left", "3": "Lower Left",  "4": "Lower Right"}
QUADRANT_CODES = {"1": "UR", "2": "UL", "3": "LL", "4": "LR"}

def fdi_meta(tooth_id: str) -> dict:
    """Return human-readable quadrant / position data for an FDI tooth ID."""
    if len(tooth_id) == 2:
        q, pos = tooth_id[0], tooth_id[1]
        return {
            "quadrant_number": int(q),
            "quadrant_name":   QUADRANT_NAMES.get(q, f"Quadrant {q}"),
            "quadrant_code":   QUADRANT_CODES.get(q, f"Q{q}"),
            "position":        int(pos),
            "label":           f"{QUADRANT_CODES.get(q, 'Q' + q)}-{pos}",
        }
    return {"quadrant_number": None, "quadrant_name": None,
            "quadrant_code": None, "position": None, "label": tooth_id}


# ── bbox helper ───────────────────────────────────────────────────────────────

def bbox_from_coords(coords: dict | None) -> dict | None:
    """Normalise the bounding-box dict; drop 'proba' (lifted to confidence)."""
    if not coords:
        return None
    return {
        "xmin": coords.get("xmin"),
        "ymin": coords.get("ymin"),
        "xmax": coords.get("xmax"),
        "ymax": coords.get("ymax"),
        "width":  (coords.get("xmax") or 0) - (coords.get("xmin") or 0),
        "height": (coords.get("ymax") or 0) - (coords.get("ymin") or 0),
    }


# ── illness / treatment normalisers ──────────────────────────────────────────

def normalise_illness(ill: dict) -> dict:
    icd = ill.get("icd_dict") or {}
    return {
        "name":        ill.get("name"),
        "slug":        ill.get("slug"),
        "probability": round(ill.get("probability", 0), 2),
        "icd_code":    icd.get("icd_code"),
        "icd_desc":    icd.get("icd_desc"),
    }

def normalise_treatment(tx: dict) -> dict:
    return {
        "name": tx.get("treatment_method"),
        "slug": tx.get("treatment_method_slug"),
    }


# ── aggregate builders ────────────────────────────────────────────────────────

def build_illness_frequency(teeth: dict) -> list[dict]:
    counter: dict[str, dict] = {}
    for tooth in teeth.values():
        if tooth.get("is_missing"):
            continue
        for ill in tooth.get("illnesses", []):
            name = ill["name"]
            if name not in counter:
                icd = ill.get("icd_dict") or {}
                counter[name] = {
                    "name":      name,
                    "icd_code":  icd.get("icd_code"),
                    "icd_desc":  icd.get("icd_desc"),
                    "count":     0,
                    "tooth_ids": [],
                }
            counter[name]["count"] += 1
            counter[name]["tooth_ids"].append(ill.get("label_slug", ""))
    return sorted(counter.values(), key=lambda x: -x["count"])

def build_treatment_frequency(teeth: dict) -> list[dict]:
    counter: dict[str, dict] = {}
    for tooth in teeth.values():
        for tx in tooth.get("treatment_methods", []):
            name = tx["treatment_method"]
            if name not in counter:
                counter[name] = {"name": name, "count": 0}
            counter[name]["count"] += 1
    return sorted(counter.values(), key=lambda x: -x["count"])


# ── per-tooth transformer ─────────────────────────────────────────────────────

def transform_tooth(tooth_id: str, tooth: dict) -> dict:
    is_missing = tooth.get("is_missing", False)
    illnesses  = tooth.get("illnesses", [])
    treatments = tooth.get("treatment_methods", [])

    # Severity bucket based on highest illness probability
    severity = "none"
    if not is_missing and illnesses:
        max_prob = max(i.get("probability", 0) for i in illnesses)
        if max_prob >= 70:
            severity = "high"
        elif max_prob >= 40:
            severity = "moderate"
        else:
            severity = "low"

    return {
        "tooth_id":    tooth_id,
        "fdi":         fdi_meta(tooth_id),
        "slug":        tooth.get("slug"),
        "status":      "missing" if is_missing else "present",
        "severity":    severity,
        "confidence":  round(tooth.get("confidence", 0), 2),
        "cropped_image": tooth.get("cropped_image"),
        "bounding_box":  bbox_from_coords(tooth.get("coordinates")),
        "polygon":       tooth.get("list_coordinates", []),
        "illnesses": [normalise_illness(i) for i in illnesses],
        "treatments": [normalise_treatment(t) for t in treatments],
    }


# ── palate / pool normalisers ─────────────────────────────────────────────────

def transform_palate_finding(finding: dict, idx: int) -> dict:
    return {
        "index":       idx,
        "name":        finding.get("name"),
        "slug":        finding.get("slug"),
        "probability": round(finding.get("probability", 0), 2),
        "polygon":     finding.get("coordinates", []),
    }

def transform_pool_illness(ill: dict, idx: int) -> dict:
    icd = ill.get("icd_dict") or {}
    return {
        "index":       idx,
        "name":        ill.get("name"),
        "slug":        ill.get("slug"),
        "probability": round(ill.get("probability", 0), 2),
        "icd_code":    icd.get("icd_code"),
        "icd_desc":    icd.get("icd_desc"),
        "polygon":     ill.get("coordinates", []),
    }


# ── main transformer ──────────────────────────────────────────────────────────

def transform(data: dict) -> dict:
    results = data.get("results", {})
    raw_teeth = results.get("tooth_results", {})

    # ── tooth list (sorted by FDI id) ────────────────────────────────────────
    teeth = [
        transform_tooth(tid, raw_teeth[tid])
        for tid in sorted(raw_teeth.keys())
    ]

    # ── counts ────────────────────────────────────────────────────────────────
    total         = len(teeth)
    missing       = sum(1 for t in teeth if t["status"] == "missing")
    present       = total - missing
    with_findings = sum(1 for t in teeth if t["illnesses"])
    with_treatment= sum(1 for t in teeth if t["treatments"])

    severity_dist = {"high": 0, "moderate": 0, "low": 0, "none": 0}
    for t in teeth:
        severity_dist[t["severity"]] += 1

    # ── palate & pool ─────────────────────────────────────────────────────────
    palate_findings = [
        transform_palate_finding(f, i + 1)
        for i, f in enumerate(results.get("palate_results", []))
    ]
    illness_pool = [
        transform_pool_illness(ill, i + 1)
        for i, ill in enumerate(results.get("illness_pool", []))
    ]

    # ── implants ──────────────────────────────────────────────────────────────
    implants = results.get("implant_brands", [])

    # ── measurements ─────────────────────────────────────────────────────────
    measurements = results.get("measurement_results", [])

    # ── aggregate frequency tables ────────────────────────────────────────────
    illness_frequency  = build_illness_frequency(raw_teeth)
    treatment_frequency= build_treatment_frequency(raw_teeth)

    return {
        "meta": {
            "report_generated_at": datetime.now(timezone.utc).isoformat(),
            "analysis_id":   data.get("id"),
            "version":       data.get("version"),
            "status":        "completed" if data.get("is_done") else "incomplete",
            "error":         data.get("error_status", False),
            "error_message": data.get("error_message"),
            "response_time_seconds": data.get("response_time"),
            "image_type":    results.get("image_type"),
            "images": {
                "original":  data.get("original_image"),
                "annotated": data.get("draw_image"),
                "embedded_viewer": data.get("embeded_link"),
            },
        },
        "summary": {
            "teeth": {
                "total":          total,
                "present":        present,
                "missing":        missing,
                "with_findings":  with_findings,
                "with_treatment": with_treatment,
            },
            "severity_distribution": severity_dist,
            "palate_findings_count": len(palate_findings),
            "unassigned_pool_count": len(illness_pool),
            "implants_detected":     len(implants),
            "measurements_count":    len(measurements),
        },
        "frequency_tables": {
            "illnesses":  illness_frequency,
            "treatments": treatment_frequency,
        },
        "teeth": teeth,
        "palate_findings": palate_findings,
        "illness_pool":    illness_pool,
        "implant_brands":  implants,
        "measurements":    measurements,
    }

