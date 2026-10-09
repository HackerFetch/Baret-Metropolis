# Submission files

Files the submission forms ask for, ready to upload.

| File | What it is | Where it goes |
|---|---|---|
| `baret-logo-1024.png` | The Baret lockup (mark and wordmark, orange and ink on concrete), 1024 x 1024 PNG | The track's "Project Logo/Graphic" field (JPG, JPEG, PNG or WEBP, at most 3 MB) |
| `baret-mark-1024.png` | The mark alone, ink on orange, 1024 x 1024 PNG | The same field if it crops to a small square, or an avatar |

Both are rendered from the mark's own paths in `packages/ui/src/brand/Mark.tsx` and the wordmark font `packages/web-ui/fonts/big-shoulders-stencil-display-900.woff2`, following `docs/BRAND.md` section 02 (mark height equals cap height, tracking +4%, two flat colours). The product itself never uses a raster of the mark; these exist only because the forms ask for one.
