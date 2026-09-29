# ECONUR official brand assets (supplied 29 Sep 2026)

Files are byte-identical to the attachments as received in chat (the chat delivered them as WebP;
the owner named them "real logo(4).png" and "real Icon(1).png"). Do not edit, crop or recolour.

| File | Use | Size | sha256 |
|---|---|---|---|
| econur-logo-official.webp | Header logo (full wordmark) | 2000 x 667, transparent | d5b8f54749a5c7ceeab967acdf59deacec88f5a52bdafa437da832cb9fdcf42d |
| econur-icon-official.webp | Favicon / site icon | 1254 x 1254, transparent | 544cad049604dae7da02d121151748ee3825cc6900594b1dcb70b2c2a7236e22 |

Notes measured from the files:
- Logo: transparent padding 110 / 95 / 83 / 115 px (L / T / R / B); the wordmark is 1807 x 457 inside the 2000 x 667 canvas.
- Icon: square canvas; the leaf sits slightly above centre (224 px transparent above, 145 px below).

Planned implementation (WordPress, Astra child theme "econur"):
1. Sideload both files to the Media Library (verify sha256 first).
2. Header logo: set theme_mod `custom_logo` to the new logo attachment (Astra renders it in the desktop and mobile header).
   Keep the existing `econur-logo-sizes` filter in functions.php; check Astra logo-width settings so the header height does not grow.
3. Favicon: set option `site_icon` to the new icon attachment (WordPress outputs 32/192 icons, apple-touch 180, msapplication 270).
4. Leave logos inside product/packaging/banner photos unchanged. Footer logo is out of scope unless the owner asks.
5. Back up the previous `custom_logo` / `site_icon` values before switching; verify desktop + mobile header and head icon tags.
