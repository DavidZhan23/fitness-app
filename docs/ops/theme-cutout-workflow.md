# Theme Cutout Workflow

This SOP standardizes how to process a source image with white background into a transparent PNG for hero card usage.

## 1) Naming Convention

- Source image: `<theme>-head-xx.png`
- Cutout image: `<theme>-head-xx-cutout.png`
- Store both under `public/theme/`

Example:

- `public/theme/gundam-head-01.png`
- `public/theme/gundam-head-01-cutout.png`

## 2) CLI Command

Use the shared script:

```bash
node scripts/theme-cutout.mjs \
  --input public/theme/gundam-head-01.png \
  --output public/theme/gundam-head-01-cutout.png \
  --white-threshold 242 \
  --saturation-threshold 26 \
  --feather 20
```

## 3) Parameter Guide

- `--white-threshold` (0-255): higher means fewer bright pixels are removed.
- `--saturation-threshold` (0-255): lower means neutral gray/white is removed more aggressively.
- `--feather` (0-255): smooth alpha transition near threshold; larger gives softer edge.

Recommended starting values:

- `white-threshold=242`
- `saturation-threshold=26`
- `feather=20`

## 4) Theme Integration Checklist

After generating cutout:

1. Confirm theme uses `url('/theme/<theme>-head-xx-cutout.png')`.
2. Tune `--hero-card-image-*` in the theme CSS:
   - `--hero-card-image-size`
   - `--hero-card-image-top`
   - `--hero-card-image-right`
   - `--hero-card-image-position`
   - `--hero-card-image-mask`
   - `--hero-card-image-opacity`
3. Avoid adding large dark overlays to hide white artifacts. If overlays are needed, regenerate cutout first.

## 5) Visual Acceptance

- No visible white block around image edges on dark cards.
- Shoulder/important marks remain readable (no hard clipping).
- Edge looks natural (no severe halos or jagged boundary).
- Card text remains readable after image tuning.

## 6) Regression Check

Run:

```bash
node scripts/check-theme-contrast.mjs
```

Expected:

- `All checked pairs ≥ 4.5:1`

