# Brand assets — ACTION REQUIRED (owner)

The MASTER BUILD PROMPT references a supplied `src/assets/logo.png`
(orange/charcoal ProGuidance wordmark with “TECH SOLUTION” subline).
**That file was not present in this repository or the build workspace**, so the
portal currently ships a clearly-labelled temporary placeholder mark
(`public/brand/logo-placeholder.svg`, `…-dark.svg`, `mark-placeholder.svg`).

## To install the official logo

1. Add the authoritative file here as `src/assets/logo.png` (original,
   uncompressed).
2. Export optimized variants into `public/brand/` (keep proportions and
   colors exactly — never stretch, recolor, redraw, or crop):
   - `logo-light.png` / `logo-light.webp` — for light backgrounds
   - `logo-dark.png` / `logo-dark.webp` — for charcoal/graphite backgrounds
   - `mark.png` — compact square mark (sidebar collapsed, favicon source)
3. Update `src/config/brand.ts` → `logo` paths and set `status: "official"`.
4. A vector/compact variant may be added **only** if fidelity is maintained.

Until then `brand.logo.status === "placeholder"` and the UI renders the
temporary mark with honest alt text.
