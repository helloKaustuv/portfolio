"""Inspect the character clip and extract the 64 frame atlas used by the hero.

Requires opencv-python. The video is processed offline; it is never loaded by the site.
Usage: python scripts/extract_frames.py path/to/lv_0_20261007235000.mp4
"""
from pathlib import Path
import sys
import json
import cv2
import numpy as np

SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("lv_0_20261007235000.mp4")
OUT = Path("public/frames")
COUNT = 64

cap = cv2.VideoCapture(str(SOURCE))
if not cap.isOpened():
    raise SystemExit(f"Could not open video: {SOURCE}")
fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = total / fps if fps else 0
print(f"frames={total} fps={fps:.5f} duration={duration:.3f}s size={width}x{height}")

# Robustly estimate the flat background from the four corners of the first frame.
cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
ok, first = cap.read()
if not ok:
    raise SystemExit("Could not decode the first frame")
corners = np.concatenate([first[:24, :24].reshape(-1, 3), first[:24, -24:].reshape(-1, 3),
                          first[-24:, :24].reshape(-1, 3), first[-24:, -24:].reshape(-1, 3)])
bgr = np.median(corners, axis=0).astype(int)
print(f"background_rgb=#{bgr[2]:02x}{bgr[1]:02x}{bgr[0]:02x}")
background = f"#{bgr[2]:02x}{bgr[1]:02x}{bgr[0]:02x}"

# Decode sequentially once. Random seeking is deliberately avoided because some
# generated MP4 files have sparse keyframes and can take a long time to seek.
OUT.mkdir(parents=True, exist_ok=True)
sample_count = min(total, 96)
contact_indices = {round(i * (total - 1) / max(1, sample_count - 1)) for i in range(sample_count)}
# The contact sheet shows the head completing its circular turn at about 8.3s;
# frames after that hold the direct-to-camera neutral pose.
neutral_no = total - 1
cycle_start, cycle_end = 0, min(total - 2, round(8.3 * fps))
atlas_indices = [round(cycle_start + i * (cycle_end - cycle_start) / COUNT) for i in range(COUNT)]
atlas_at = {}
for atlas_i, source_i in enumerate(atlas_indices):
    atlas_at.setdefault(source_i, []).append(atlas_i)
thumb_w = 128
thumb_h = round(thumb_w * height / width)
cols = 8
rows = (sample_count + cols - 1) // cols
sheet = np.zeros((rows * (thumb_h + 22), cols * thumb_w, 3), np.uint8)
contact_order = sorted(contact_indices)
contact_slot = {frame_no: slot for slot, frame_no in enumerate(contact_order)}
frame_no = 0
last_frame = None
while True:
    ok, frame = cap.read()
    if not ok:
        break
    last_frame = frame
    for atlas_i in atlas_at.get(frame_no, []):
        cv2.imwrite(str(OUT / f"frame-{atlas_i:02d}.webp"), frame, [cv2.IMWRITE_WEBP_QUALITY, 95])
    if frame_no in contact_slot:
        slot = contact_slot[frame_no]
        thumb = cv2.resize(frame, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)
        x, y = (slot % cols) * thumb_w, (slot // cols) * (thumb_h + 22)
        sheet[y:y + thumb_h, x:x + thumb_w] = thumb
        cv2.putText(sheet, f"{frame_no}", (x + 5, y + thumb_h + 16), cv2.FONT_HERSHEY_SIMPLEX, .42, (255,255,255), 1)
    frame_no += 1
cap.release()
if last_frame is not None:
    neutral_no = frame_no - 1
    cv2.imwrite(str(OUT / "center.webp"), last_frame, [cv2.IMWRITE_WEBP_QUALITY, 97])
cv2.imwrite(str(OUT.parent / "contact-sheet.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 90])
print(f"Decoded {frame_no} frames; contact sheet: {OUT.parent / 'contact-sheet.jpg'}")
print(f"Wrote {COUNT} frames + center.webp to {OUT.resolve()}")
directions = ["UP", "UP-RIGHT", "RIGHT", "DOWN-RIGHT", "DOWN", "DOWN-LEFT", "LEFT", "UP-LEFT"]
pose_frames = {direction: round(cycle_start + i * (cycle_end - cycle_start) / 8)
               for i, direction in enumerate(directions)}
metadata = {"background": background, "width": width, "height": height, "fps": fps,
            "frameCount": frame_no, "duration": frame_no / fps if fps else 0,
            "cycleStart": cycle_start, "cycleEnd": cycle_end, "neutralFrame": neutral_no,
            "directionFrames": pose_frames, "atlasSourceFrames": atlas_indices}
(OUT / "metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
print("Use contact-sheet.jpg to confirm the cycle boundaries and update cycle_start/cycle_end if needed.")
print("Directional pose frames:", json.dumps(pose_frames))
