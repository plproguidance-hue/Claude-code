# Dragon Reel — Animated Login Page

A recreation of the original "skeleton lizard + code editor" vertical reel
(720x1280, 30fps, 8s), with the lizard replaced by a **monochrome ink dragon**:
same dynamic darting/coiling movement, rendered in a blue/sky gradient with
twinkling sparkles along its body.

## Files

- `index.html` — the whole scene: cream panel with the canvas dragon animation
  on top, the `index.html` code-editor window below. Open it in a browser for
  a live 30fps preview.
- `render.mjs` — offline renderer: captures 240 deterministic frames with
  Playwright and encodes an MP4 with ffmpeg.
- `dragon.mp4` — the rendered video (video track only).

## How the dragon works

A chain of 52 spine segments follows a head that chases scripted waypoints
with inertia (acceleration + damping), producing the darting, overshooting
swim of the original. Each segment draws vertebra chevrons and feather-like
rib strokes whose length profile forms a large fan behind the head and a long
plume at the tail. All strokes share a head-to-tail linear gradient
(deep navy → ocean blue → sky → pale sky); 34 sparkles ride fixed points on
the body and twinkle. Everything is a pure function of the frame counter, so
offline rendering is exactly reproducible.

## Rendering

```sh
npm install
node render.mjs --out dragon.mp4
# optionally lay an audio track under it:
node render.mjs --audio path/to/audio.m4a --out dragon.mp4
```

Environment overrides: `CHROME_PATH` (Chromium binary) and `FFMPEG_PATH`
(ffmpeg binary).
