// Offline renderer: captures index.html frame by frame with Playwright,
// then encodes a 720x1280 30fps MP4 (optionally muxing an audio track).
//
// Usage:
//   node render.mjs [--audio path/to/audio.m4a] [--out dragon.mp4]
//
// Requires: playwright-core, a Chromium binary (CHROME_PATH env or the
// default below), and an ffmpeg binary (FFMPEG_PATH env or `ffmpeg`).

import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const WIDTH = 720;
const HEIGHT = 1280;
const FPS = 60;
const SECONDS = 8;
const TOTAL = FPS * SECONDS;

const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}
const audioPath = argVal('--audio');
const outPath = argVal('--out') ?? 'dragon.mp4';

const here = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = 'file://' + path.join(here, 'index.html') + '?render=1';
const framesDir = path.join(here, '.frames');
const chromePath =
  process.env.CHROME_PATH ??
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'],
});
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
await page.goto(pageUrl);
await page.waitForFunction('typeof window.renderFrame === "function"');

for (let n = 0; n < TOTAL; n++) {
  await page.evaluate((f) => window.renderFrame(f), n);
  await page.screenshot({
    path: path.join(framesDir, `f_${String(n).padStart(4, '0')}.png`),
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  });
  if (n % 30 === 0) console.log(`frame ${n}/${TOTAL}`);
}
await browser.close();
console.log('frames captured, encoding...');

const encodeArgs = [
  '-y',
  '-framerate', String(FPS),
  '-i', path.join(framesDir, 'f_%04d.png'),
];
if (audioPath && existsSync(audioPath)) {
  encodeArgs.push('-i', audioPath, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '96k', '-shortest');
}
encodeArgs.push(
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-crf', '18',
  '-r', String(FPS),
  outPath
);
execFileSync(ffmpegPath, encodeArgs, { stdio: 'inherit' });
console.log(`done: ${outPath}`);
