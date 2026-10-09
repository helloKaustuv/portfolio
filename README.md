# Kaustuv portfolio hero

Single-screen React hero with an offline-extracted, cursor-steered character portrait. The browser loads only WebP stills; it never loads or seeks the MP4.

## Run

```sh
pnpm install
pnpm dev
```

## Re-extract the supplied animation

Install OpenCV for Python, then run:

```sh
python scripts/extract_frames.py path/to/lv_0_20261007235000.mp4
```

The script decodes sequentially, reports the clip timeline and sampled corner color, writes a contact sheet, 64 WebP atlas frames, `center.webp`, and metadata. The detected corner color is `#47a5ea`. The input actually has a blue sky with clouds rather than a flat solid background, so the page uses that sampled blue as its backing color while keeping the source image intact.

The sampled turn runs from source frame 0 through 498 (about 8.3 seconds at 60 fps). Approximate compass checkpoints are recorded in `public/frames/metadata.json`; the final decoded source frame (596) is used for direct eye contact.

The Resume button opens Kaustuv's Google Drive PDF in a new tab. The Contact and Let’s Talk buttons use the email listed on that resume.
