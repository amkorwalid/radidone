#!/usr/bin/env python3
"""
build_report.py
-----------------
Transforms a Thakaa v2.3 dental AI analysis JSON file into a
structured plain-text analysis report.

Usage:
    python3 build_report.py <input.json> [output.txt]

If output path is omitted the report is written next to the input
file with a .txt extension.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict


# ── helpers ──────────────────────────────────────────────────────────────────

def divider(char="─", width=72):
    return char * width

def section(title: str) -> str:
    lines = [
        "",
        divider("═"),
        f"  {title.upper()}",
        divider("═"),
    ]
    return "\n".join(lines)

def subsection(title: str) -> str:
    return f"\n  {title}\n  {divider('─', len(title) + 2)}"

def fmt_prob(p: float) -> str:
    return f"{p:.1f}%"

def tooth_label(tooth_id: str) -> str:
    """Return a human-friendly label using the FDI numbering system."""
    quadrant_map = {"1": "UR", "2": "UL", "3": "LL", "4": "LR"}
    if len(tooth_id) == 2:
        q, pos = tooth_id[0], tooth_id[1]
        quad = quadrant_map.get(q, f"Q{q}")
        return f"Tooth {tooth_id} ({quad}-{pos})"
    return f"Tooth {tooth_id}"


# ── report builder ────────────────────────────────────────────────────────────

def build_report(data: dict) -> str:
    lines = []

    # ── Header ────────────────────────────────────────────────────────────────
    lines += [
        divider("═"),
        "  DENTAL AI ANALYSIS REPORT",
        divider("═"),
        f"  Generated : {datetime.now().strftime('%Y-%m-%d  %H:%M:%S')}",
        f"  Analysis ID : {data.get('id', 'N/A')}",
        f"  Version     : {data.get('version', 'N/A')}",
        f"  Status      : {'Completed' if data.get('is_done') else 'Incomplete'}",
        f"  Errors      : {'None' if not data.get('error_status') else data.get('error_message', 'Unknown error')}",
        f"  Response time : {data.get('response_time', 'N/A')} s",
    ]

    results = data.get("results", {})

    # ── Image info ────────────────────────────────────────────────────────────
    lines.append(section("1. Image Information"))
    lines += [
        f"  Image type   : {results.get('image_type', 'N/A')}",
        f"  Original URL : {data.get('original_image', 'N/A')}",
        f"  Annotated URL: {data.get('draw_image', 'N/A')}",
        f"  Embedded link: {data.get('embeded_link', 'N/A')}",
    ]

    # ── Summary statistics ────────────────────────────────────────────────────
    lines.append(section("2. Summary Statistics"))

    teeth = results.get("tooth_results", {})
    total         = len(teeth)
    missing       = sum(1 for t in teeth.values() if t.get("is_missing"))
    present       = total - missing
    with_illness  = sum(1 for t in teeth.values() if not t.get("is_missing") and t.get("illnesses"))
    with_treatment= sum(1 for t in teeth.values() if t.get("treatment_methods"))

    palate_findings = results.get("palate_results", [])
    illness_pool    = results.get("illness_pool", [])
    implants        = results.get("implant_brands", [])
    measurements    = results.get("measurement_results", [])

    lines += [
        f"  Total teeth charted     : {total}",
        f"  Present teeth           : {present}",
        f"  Missing teeth           : {missing}",
        f"  Teeth with findings     : {with_illness}",
        f"  Teeth with treatment Rx : {with_treatment}",
        f"  Palate-level findings   : {len(palate_findings)}",
        f"  Unassigned illness pool : {len(illness_pool)}",
        f"  Implants detected       : {len(implants)}",
        f"  Measurements recorded   : {len(measurements)}",
    ]

    # Aggregate illness frequency across all teeth
    illness_count: dict[str, int] = defaultdict(int)
    for tooth in teeth.values():
        for ill in tooth.get("illnesses", []):
            illness_count[ill["name"]] += 1

    if illness_count:
        lines.append(subsection("Most frequent tooth-level findings"))
        for name, count in sorted(illness_count.items(), key=lambda x: -x[1]):
            lines.append(f"    {name:<40} {count} tooth/teeth")

    # Aggregate treatment frequency
    treatment_count: dict[str, int] = defaultdict(int)
    for tooth in teeth.values():
        for tx in tooth.get("treatment_methods", []):
            treatment_count[tx["treatment_method"]] += 1

    if treatment_count:
        lines.append(subsection("Treatment recommendations (aggregate)"))
        for name, count in sorted(treatment_count.items(), key=lambda x: -x[1]):
            lines.append(f"    {name:<40} {count} tooth/teeth")

    # ── Per-tooth detail ──────────────────────────────────────────────────────
    lines.append(section("3. Per-Tooth Findings"))

    for tooth_id in sorted(teeth.keys()):
        tooth = teeth[tooth_id]
        label = tooth_label(tooth_id)

        if tooth.get("is_missing"):
            lines.append(f"\n  {label}")
            lines.append("    Status : MISSING")
            continue

        illnesses        = tooth.get("illnesses", [])
        treatment_methods= tooth.get("treatment_methods", [])
        coords           = tooth.get("coordinates", {})
        confidence       = coords.get("proba", None)

        if not illnesses and not treatment_methods:
            lines.append(f"\n  {label}")
            lines.append(f"    Status     : Present — no findings")
            if confidence is not None:
                lines.append(f"    Confidence : {fmt_prob(confidence)}")
            continue

        lines.append(f"\n  {label}")
        lines.append(f"    Status     : Present")
        if confidence is not None:
            lines.append(f"    Confidence : {fmt_prob(confidence)}")

        if illnesses:
            lines.append(f"    Findings ({len(illnesses)}):")
            for ill in illnesses:
                icd = ill.get("icd_dict", {})
                icd_str = (
                    f"  [ICD {icd['icd_code']}: {icd['icd_desc']}]"
                    if icd else ""
                )
                lines.append(
                    f"      • {ill['name']:<38} prob {fmt_prob(ill['probability'])}{icd_str}"
                )

        if treatment_methods:
            lines.append(f"    Recommended treatments ({len(treatment_methods)}):")
            for tx in treatment_methods:
                lines.append(f"      → {tx['treatment_method']}")

    # ── Palate-level findings ─────────────────────────────────────────────────
    if palate_findings:
        lines.append(section("4. Palate-Level Findings"))
        for i, finding in enumerate(palate_findings, 1):
            lines += [
                f"\n  Finding {i}: {finding['name']}",
                f"    Probability : {fmt_prob(finding['probability'])}",
            ]

    # ── Unassigned illness pool ───────────────────────────────────────────────
    if illness_pool:
        lines.append(section("5. Unassigned Illness Pool"))
        lines.append(
            "  (Findings detected in the radiograph but not attributed to a specific tooth)"
        )
        for i, ill in enumerate(illness_pool, 1):
            lines += [
                f"\n  {i}. {ill['name']}",
                f"     Probability : {fmt_prob(ill['probability'])}",
            ]

    # ── Implants ──────────────────────────────────────────────────────────────
    if implants:
        lines.append(section("6. Detected Implant Brands"))
        for imp in implants:
            lines.append(f"  • {imp}")
    else:
        lines.append(section("6. Detected Implant Brands"))
        lines.append("  No implants detected.")

    # ── Measurements ─────────────────────────────────────────────────────────
    if measurements:
        lines.append(section("7. Measurement Results"))
        for m in measurements:
            lines.append(f"  • {json.dumps(m)}")
    else:
        lines.append(section("7. Measurement Results"))
        lines.append("  No measurements recorded.")

    # ── Footer ────────────────────────────────────────────────────────────────
    lines += [
        "",
        divider("═"),
        "  END OF REPORT",
        divider("═"),
        "",
    ]

    return "\n".join(lines)


