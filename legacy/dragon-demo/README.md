# Dragon Reel — Animated Login Page

A recreation of the original "skeleton lizard + code editor" vertical reel
(720x1280, 60fps, 8s seamless loop), with the lizard replaced by a
**monochrome ink dragon**: a minimalist Chinese-inspired dragon — elongated
segmented body, whiskers, antler horns, clawed limbs and flowing fins —
drawn in black ink on a warm ivory panel, swimming through the air in
endless S-curves with fading ghost echoes trailing behind it.

## Files

- `index.html` — the whole scene: ivory panel with the canvas dragon
  animation on top, the `index.html` code-editor window below. Open it in a
  browser for a live 60fps preview.
- `render.mjs` — offline renderer: captures 480 deterministic frames with
  Playwright and encodes an MP4 with ffmpeg.
- `dragon.mp4` — the rendered video (video track only).

## How the dragon works

The head rides a closed parametric flight path built only from harmonics of
the loop frequency, so `path(n) == path(n + 480)` and the clip loops
seamlessly; a full warm-up cycle runs before frame 0 so the trailing body
matches too. A chain of 60 spine segments follows the head, carrying a
travelling undulation wave, vertebra chevrons, flowing fin strokes (a crest
behind the head, a long tail plume), two pairs of clawed limbs, whiskers and
antler horns. A slow body roll modulates stroke widths to fake 3D rotation,
and ghosted snapshots of recent poses fade behind the dragon as motion
trails. Everything is a pure function of the frame counter, so offline
rendering is exactly reproducible.

## Rendering

```sh
npm install
node render.mjs --out dragon.mp4
# optionally lay an audio track under it:
node render.mjs --audio path/to/audio.m4a --out dragon.mp4
```

Environment overrides: `CHROME_PATH` (Chromium binary) and `FFMPEG_PATH`
(ffmpeg binary).
