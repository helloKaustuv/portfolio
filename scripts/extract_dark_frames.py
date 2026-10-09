"""Pre-extract the dark-mode portrait clip as WebP frames for the cursor canvas."""
from pathlib import Path
import json
import sys

import cv2
import numpy as np

SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"C:\Users\Kaustuv Gupta\Downloads\lv_0_20261008044528.mp4")
OUT = Path("public/frames-dark")
COUNT = 64
CYCLE_END_SECONDS = 8.3
OUTPUT_WIDTH = 1920
CAPTURE_PARAMS = [cv2.CAP_PROP_HW_ACCELERATION, cv2.VIDEO_ACCELERATION_NONE, cv2.CAP_PROP_N_THREADS, 1]
cv2.setNumThreads(1)

cap = cv2.VideoCapture(str(SOURCE), cv2.CAP_FFMPEG, CAPTURE_PARAMS)
if not cap.isOpened():
    raise SystemExit(f"Could not open video: {SOURCE}")
fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
cycle_end = min(total - 2, round(CYCLE_END_SECONDS * fps))
print(f"frames={total} fps={fps:.3f} duration={total / fps:.3f}s size={width}x{height} cycle=0..{cycle_end}")

ok, first = cap.read()
if not ok:
    raise SystemExit("Could not decode the first frame")
corners = np.concatenate([
    first[:30, :30].reshape(-1, 3), first[:30, -30:].reshape(-1, 3),
    first[-30:, :30].reshape(-1, 3), first[-30:, -30:].reshape(-1, 3),
])
bgr = np.median(corners, axis=0).astype(int)
background = f"#{bgr[2]:02x}{bgr[1]:02x}{bgr[0]:02x}"
print(f"background_rgb={background}")

atlas_indices = [round(i * cycle_end / COUNT) for i in range(COUNT)]
atlas_at = {}
for atlas_i, source_i in enumerate(atlas_indices):
    atlas_at.setdefault(source_i, []).append(atlas_i)
OUT.mkdir(parents=True, exist_ok=True)
for atlas_i in atlas_at.get(0, []):
    scaled = cv2.resize(first, (OUTPUT_WIDTH, round(height * OUTPUT_WIDTH / width)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(OUT / f"frame-{atlas_i:02d}.webp"), scaled, [cv2.IMWRITE_WEBP_QUALITY, 94])
last_frame = None
del first
frame_no = 1
while True:
    ok, frame = cap.read()
    if not ok:
        break
    last_frame = frame
    for atlas_i in atlas_at.get(frame_no, []):
        scaled = cv2.resize(frame, (OUTPUT_WIDTH, round(height * OUTPUT_WIDTH / width)), interpolation=cv2.INTER_AREA)
        cv2.imwrite(str(OUT / f"frame-{atlas_i:02d}.webp"), scaled, [cv2.IMWRITE_WEBP_QUALITY, 94])
    frame_no += 1
cap.release()
if frame_no != total:
    raise SystemExit(f"Decoded {frame_no} frames; expected {total}")

center_frame = total - 1
scaled_center = cv2.resize(last_frame, (OUTPUT_WIDTH, round(height * OUTPUT_WIDTH / width)), interpolation=cv2.INTER_AREA)
cv2.imwrite(str(OUT / "center.webp"), scaled_center, [cv2.IMWRITE_WEBP_QUALITY, 96])

directions = ["UP", "UP-RIGHT", "RIGHT", "DOWN-RIGHT", "DOWN", "DOWN-LEFT", "LEFT", "UP-LEFT"]
pose_frames = {direction: round(i * cycle_end / 8) for i, direction in enumerate(directions)}
metadata = {
    "theme": "dark", "background": background, "width": width, "height": height,
    "fps": fps, "frameCount": total, "duration": total / fps,
    "cycleStart": 0, "cycleEnd": cycle_end, "neutralFrame": center_frame,
    "directionFrames": pose_frames, "atlasSourceFrames": atlas_indices,
}
(OUT / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
print(f"Wrote {COUNT} directional frames and a neutral frame to {OUT.resolve()}")
print("directionFrames=" + json.dumps(pose_frames))
