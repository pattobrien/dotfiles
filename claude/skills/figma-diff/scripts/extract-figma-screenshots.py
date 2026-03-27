#!/usr/bin/env python3
"""Extract Figma MCP screenshot images from a Claude Code session JSONL file.

Usage: extract-figma-screenshots.py <session.jsonl> <start_line> <output_dir> [frame_names_json]

Args:
    session.jsonl  - Path to the Claude Code session JSONL file
    start_line     - Line number to start scanning from (skip earlier content)
    output_dir     - Directory to save extracted PNGs
    frame_names_json - Optional JSON string mapping node IDs to names
                       e.g. '{"9545:18601": "Intake received"}'
"""
import json, base64, sys, os, re

SESSION_FILE = sys.argv[1]
START_LINE = int(sys.argv[2])
OUTPUT_DIR = sys.argv[3]
FRAME_NAMES = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}

os.makedirs(OUTPUT_DIR, exist_ok=True)

pending_node_ids = []
count = 0

with open(SESSION_FILE) as f:
    for line_num, line in enumerate(f, 1):
        if line_num < START_LINE:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        msg = obj.get("message", {})
        content = msg.get("content", [])
        if not isinstance(content, list):
            continue

        for block in content:
            if not isinstance(block, dict):
                continue

            # Track tool_use calls to get_screenshot with nodeId
            if block.get("type") == "tool_use" and "get_screenshot" in block.get("name", ""):
                node_id = block.get("input", {}).get("nodeId", "")
                if node_id:
                    pending_node_ids.append(node_id)

            # Extract images from tool results
            if block.get("type") == "tool_result":
                result_content = block.get("content", [])
                if isinstance(result_content, list):
                    for item in result_content:
                        if isinstance(item, dict) and item.get("type") == "image":
                            src = item.get("source", {})
                            if src.get("type") == "base64" and src.get("data"):
                                node_id = pending_node_ids.pop(0) if pending_node_ids else f"unknown-{count}"
                                name = FRAME_NAMES.get(node_id, node_id.replace(":", "-"))
                                safe_name = re.sub(r'[^\w\-\. ]', '_', name)
                                data = base64.b64decode(src["data"])
                                out_path = os.path.join(OUTPUT_DIR, f"{safe_name}.png")
                                with open(out_path, "wb") as img:
                                    img.write(data)
                                count += 1
                                print(f"  [{count}] {out_path} ({len(data):,} bytes)")

print(f"\nExtracted {count} images to {OUTPUT_DIR}")
