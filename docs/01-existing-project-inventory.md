# Existing-Project Inventory (pre-Phase 1)

Snapshot taken 2026-07-17 at commit `5f56886` ("Fix README to describe the ink dragon and 60fps loop"),
preserved on branch `backup/pre-portal-dragon-demo` and archived in-tree under `legacy/dragon-demo/`.

## Repository state

| Item | Value |
| --- | --- |
| Repository | `plproguidance-hue/Claude-code` |
| Default working branch (this build) | `claude/portal-phase-1-foundation-xuvrdh` |
| Backup branch | `backup/pre-portal-dragon-demo` (local) — the same commit also exists on `origin/claude/dragon-video-recreation-t98nte` and `origin/claude/portal-phase-1-foundation-xuvrdh` |
| Git working tree at snapshot | clean |

## Files present before Phase 1

| File | Size | Purpose |
| --- | --- | --- |
| `index.html` | ~16 KB | Self-contained canvas animation: "monochrome ink Chinese dragon" login-page reel (720×1280, 60 fps, 8 s seamless loop) plus a code-editor visual. No portal functionality. |
| `render.mjs` | ~2.6 KB | Offline renderer: drives `index.html` with Playwright frame-by-frame and encodes an MP4 with ffmpeg. |
| `dragon.mp4` | ~1.6 MB | Rendered output video (video track only). |
| `README.md` | ~1.8 KB | Describes the dragon reel and how to render it. |
| `package.json` / `package-lock.json` | — | Single dependency: `playwright-core`. No framework, no build system. |
| `.gitignore` | 23 B | Minimal. |

## What the MASTER BUILD PROMPT expected vs. what exists

The specification (docs/spec/master-build-prompt.md) instructs: *"Inspect the existing previous portal
in the current workspace, preserve its useful business logic and supplied logo"* and references a
previous **Vite/React Router prototype** and a supplied **`src/assets/logo.png`** wordmark.

**Neither is present in this repository.** Findings:

| Expected asset | Present? | Consequence |
| --- | --- | --- |
| Previous Vite/JSX portal prototype (routes, components, workflows) | **No** | Nothing to port. The portal is built clean from the specification. Workflow/status/catalogue knowledge is taken from the spec itself, which enumerates it fully (§6). |
| `src/assets/logo.png` (orange/charcoal ProGuidance wordmark + "TECH SOLUTION" subline) | **No** | A clearly-labelled placeholder mark is used; `src/assets/README.md` documents the exact file the owner must supply. The UI reads logo paths from the typed brand config so dropping the real file in requires no code change. |
| Prior service catalogue data | Not in code | The spec itself lists the full USD catalogue with seed prices (§6.4), so no data is lost. Catalogue seeding is a later-phase task. |
| Prior client data / sample PII | **No** | Good — the spec forbids seeding prior client PII anyway. |

## Reusable assets carried forward

- The dragon reel is **not** portal-related (no business logic, no company data, no brand assets). It is
  archived unchanged in `legacy/dragon-demo/` for comparison, per the spec's "keep the old project
  available" requirement, and excluded from the application build.
- Company identity, brand palette, tagline, contact details, USD/invoice rules: taken verbatim from
  the MASTER BUILD PROMPT §2 into `src/config/brand.ts`.

## Environment inventory (build container)

| Tool | Version / status |
| --- | --- |
| Node.js | v22.22.2 |
| npm | 10.9.7 |
| PostgreSQL | 16.13 (local cluster, used for RLS integration tests) |
| Docker daemon | **Not available** — `supabase start` (local Supabase stack) cannot run in this container; config is provided for the owner's machine |
| Supabase CLI | Not installed in container (config + migrations are CLI-compatible) |
| Playwright Chromium | Pre-installed at `/opt/pw-browsers` (used for screenshots) |
