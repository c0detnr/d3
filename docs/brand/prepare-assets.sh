#!/usr/bin/env bash
# Run from repository root. Requires ImageMagick 7 with WebP support.
set -euo pipefail
mkdir -p public/brand
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

# Black matte removal: derive coverage, then divide RGB by coverage.
# Suppress near-black background grain; preserve stencil cuts and amber hue.
magick docs/brand/logo-concepts/01c-stencil-clean.png -alpha on \
  -channel A -fx 'max(max(r,g),b)<0.12 ? 0 : min(1,(max(max(r,g),b)-0.04)/0.94)' \
  -channel RGB -fx 'a>0 ? min(1,u/a) : 0' +channel \
  -trim +repage -filter Lanczos -resize 1200x -depth 8 \
  PNG32:public/brand/ashfield-wordmark.png
magick public/brand/ashfield-wordmark.png -define webp:lossless=true public/brand/ashfield-wordmark.webp

# White matte exists only outside the badge in its four 280 px corner zones.
# Estimate coverage from the darkest channel, then remove the white matte.
magick docs/brand/logo-concepts/01d-stencil-icon.png -alpha on \
  -channel A -fx '((i<280 || i>w-281) && (j<280 || j>h-281)) ? ((1-min(min(r,g),b))<0.04 ? 0 : min(1,(1-min(min(r,g),b))/0.86)) : 1' \
  -channel RGB -fx 'a>0 ? max(0,min(1,(u-(1-a))/a)) : 0' +channel \
  -depth 8 "$work/icon.png"
magick "$work/icon.png" -filter Lanczos -resize 512x512 -depth 8 PNG32:public/brand/ashfield-icon.png
# Median only for small marks: quiet speckles without closing the stencil slit.
magick "$work/icon.png" -statistic Median 3x3 -filter Lanczos -resize 180x180 -depth 8 PNG32:public/apple-touch-icon.png
magick "$work/icon.png" -statistic Median 5x5 -filter Lanczos -resize 32x32 -depth 8 PNG32:public/favicon.png
