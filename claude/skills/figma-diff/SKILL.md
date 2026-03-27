---
name: figma-diff
description: Compare Figma designs to iOS Simulator screenshots using ImageMagick.
  Produces layout diffs, color heatmaps, and directional diffs that show which image
  is the source of each difference. Use when the user wants to compare a Figma design
  to a running app, diff mockups against simulator output, do visual QA, or check
  design fidelity.
---

# Figma-to-Simulator Visual Diff

## Requirements

- **Figma desktop app** — open with the target file as the active tab
- **Figma MCP server** — enable Dev Mode in Figma, which starts the MCP server on `127.0.0.1:3845`
- **iOS Simulator** — running with the target app/screen visible
- **ImageMagick 7+** — `brew install imagemagick`
- **Python 3** — for JSONL image extraction

## Pipeline

### 1. Get Figma page metadata

Call `get_metadata` with the page node ID to get the full frame tree as XML. Page IDs are stable — save them for reuse.

```
get_metadata(nodeId: "1427:405")
```

### 2. Search for target frames

Parse the XML to find frames matching name/type/dimensions:

```bash
cat <metadata-file>.txt | python3 -c "
import json, sys, re
data = json.load(sys.stdin)
text = data[0]['text']
frames = re.findall(r'<frame id=\"([^\"]+)\" name=\"([^\"]+)\" x=\"[^\"]+\" y=\"[^\"]+\" width=\"([^\"]+)\" height=\"([^\"]+)\"', text)
for fid, name, w, h in frames:
    if 'search_term' in name.lower():
        print(f'{fid}  {w}x{h}  {name}')
"
```

### 3. Screenshot Figma frames

Call `get_screenshot` for each target node ID. Images are returned inline (base64). Batch up to 5 per turn.

```
get_screenshot(nodeId: "9545:18601")
get_screenshot(nodeId: "9545:18693")
```

### 4. Extract images to disk

Use `scripts/extract-figma-screenshots.py` to parse the session JSONL, decode base64 images, and save as named PNGs.

```bash
python3 scripts/extract-figma-screenshots.py \
  ~/.claude/projects/<project-hash>/<session-id>.jsonl \
  <start_line> \
  ~/Downloads/figma-screens \
  '{"9545:18601": "Intake received", "9545:18693": "More info required"}'
```

Note the current JSONL line count (`wc -l`) before taking screenshots so you can pass it as `<start_line>`.

### 5. Screenshot iOS Simulator

```bash
xcrun simctl io booted screenshot ~/Downloads/simulator.png
```

### 6. Resize to match

Figma exports at 1x (e.g. 393x852). Simulator captures at 3x retina (e.g. 1206x2622). Resize simulator down:

```bash
magick ~/Downloads/simulator.png -resize 393x852! /tmp/simulator-resized.png
```

### 7. Layout diff (structural)

Filters gradient/anti-aliasing noise with `-fuzz 10%`. Highlights content and layout differences in red:

```bash
magick compare -metric AE -fuzz 10% \
  -highlight-color red \
  -lowlight-color "rgba(255,255,255,0.2)" \
  figma.png simulator-resized.png \
  diff-layout.png
```

### 8. Color diff (heatmap)

Shows the magnitude of every color delta as a thermal heatmap (black = identical, blue = subtle, red = major):

```bash
magick composite figma.png simulator-resized.png \
  -compose Difference /tmp/diff-raw.png

magick /tmp/diff-raw.png -colorspace Gray -evaluate multiply 5 \
  \( -size 1x1 xc:black xc:blue xc:cyan xc:green xc:yellow xc:red \
     +append -filter Cubic -resize 256x1! \) \
  -clut diff-color-heatmap.png
```

### 9. Directional diff

Green = pixels only in Figma (expected). Blue = pixels only in simulator (actual). Tells the agent which image is the source of each difference.

```bash
magick \
  \( figma.png -colorspace Gray \) \
  \( simulator-resized.png -colorspace Gray \) \
  \( -clone 0 -clone 1 -compose Mathematics \
     -define compose:args="0,-1,1,0" -composite \
     -level 0%,20% -evaluate multiply 3 \) \
  \( -clone 1 -clone 0 -compose Mathematics \
     -define compose:args="0,-1,1,0" -composite \
     -level 0%,20% -evaluate multiply 3 \) \
  -delete 0,1 \
  \( -size 393x852 xc:black \) \
  -swap 0,2 -swap 1,2 \
  -combine diff-directional.png
```

### 10. Triptych composite

Stitch Figma | Directional Diff | Simulator side by side so the agent sees everything in one image:

```bash
magick \
  \( figma.png -bordercolor "#4444ff" -border 3 \) \
  \( diff-directional.png -bordercolor "#888888" -border 3 \) \
  \( simulator-resized.png -bordercolor "#ff4444" -border 3 \) \
  +append diff-triptych.png
```

- Blue border = Figma (expected)
- Gray border = directional diff (green=Figma-only, blue=simulator-only)
- Red border = Simulator (actual)
