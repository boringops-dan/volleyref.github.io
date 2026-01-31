# Assets / Media

This site prefers **short looping product demos** (WebM/MP4) instead of animated GIFs.

Why:
- Much smaller for the same quality (better Core Web Vitals).
- Video can be hardware-decoded on most devices.
- Better control over loading behavior (poster, preload metadata).

## Hero demo

Expected files:
- `images/hero-demo.webm` (preferred)
- `images/hero-demo.mp4` (fallback)
- `images/hero-demo-poster.jpg`

### How to create (from a screen recording)

1) Record a 5–10s clip of the app doing something impressive (e.g., rotation enforcement, substitution attempt blocked, libero tracking).
2) Convert to web-friendly looping video:

```bash
# MP4 (H.264) – widely compatible
ffmpeg -i input.mov -vf "fps=30,scale=1160:-2:flags=lanczos" -an -movflags +faststart -pix_fmt yuv420p -t 10 images/hero-demo.mp4

# WebM (VP9) – smaller (Chrome/Firefox)
ffmpeg -i input.mov -vf "fps=30,scale=1160:-2:flags=lanczos" -an -c:v libvpx-vp9 -b:v 0 -crf 34 -t 10 images/hero-demo.webm

# Poster image
ffmpeg -i input.mov -vf "scale=1160:-2:flags=lanczos" -frames:v 1 images/hero-demo-poster.jpg
```

Notes:
- Keep it short. Loops should feel seamless.
- Avoid tiny UI text; zoom slightly if needed.
- Prefer showing a single “aha” moment.
