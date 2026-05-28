#!/usr/bin/env node
/**
 * Remove near-white background from a theme source image and export RGBA PNG.
 *
 * Usage:
 *   node scripts/theme-cutout.mjs \
 *     --input public/theme/gundam-head-01.png \
 *     --output public/theme/gundam-head-01-cutout.png \
 *     --white-threshold 242 \
 *     --saturation-threshold 26 \
 *     --feather 20
 */
import path from 'node:path'
import sharp from 'sharp'

function parseArgs(argv) {
  const args = {
    input: '',
    output: '',
    whiteThreshold: 242,
    saturationThreshold: 26,
    feather: 20,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    const value = argv[i + 1]
    if (key === '--input') args.input = value
    if (key === '--output') args.output = value
    if (key === '--white-threshold') args.whiteThreshold = Number(value)
    if (key === '--saturation-threshold') args.saturationThreshold = Number(value)
    if (key === '--feather') args.feather = Number(value)
  }
  return args
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function smoothStep(edge0, edge1, x) {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

function brightness(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return max - min
}

function usage() {
  console.error(
    [
      'Usage:',
      '  node scripts/theme-cutout.mjs --input <file> --output <file> [options]',
      '',
      'Options:',
      '  --white-threshold <0-255>       Brightness threshold for near-white bg (default 242)',
      '  --saturation-threshold <0-255>  Saturation cutoff for near-white bg (default 26)',
      '  --feather <0-255>               Feather range near white threshold (default 20)',
    ].join('\n'),
  )
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.input || !args.output) {
    usage()
    process.exit(1)
  }

  const whiteThreshold = clamp(args.whiteThreshold, 0, 255)
  const saturationThreshold = clamp(args.saturationThreshold, 0, 255)
  const feather = clamp(args.feather, 0, 255)

  const image = sharp(args.input).ensureAlpha()
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)

  let removed = 0
  const total = info.width * info.height

  const edge0 = whiteThreshold - feather
  const edge1 = whiteThreshold

  for (let i = 0; i < out.length; i += info.channels) {
    const r = out[i]
    const g = out[i + 1]
    const b = out[i + 2]
    const a = out[i + 3]

    const luma = brightness(r, g, b)
    const sat = saturation(r, g, b)

    const whiteGate = smoothStep(edge0, edge1, luma)
    const satGate = 1 - smoothStep(saturationThreshold * 0.7, saturationThreshold, sat)
    const bgLikelihood = whiteGate * satGate

    const alphaScale = 1 - bgLikelihood
    const nextAlpha = Math.round(a * alphaScale)
    out[i + 3] = nextAlpha

    if (nextAlpha <= 8) removed += 1
  }

  await sharp(out, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toFile(args.output)

  const removedPct = ((removed / total) * 100).toFixed(2)
  console.log(
    [
      `input:  ${path.resolve(args.input)}`,
      `output: ${path.resolve(args.output)}`,
      `size:   ${info.width}x${info.height}`,
      `params: white=${whiteThreshold}, sat=${saturationThreshold}, feather=${feather}`,
      `alpha<=8 pixels: ${removed}/${total} (${removedPct}%)`,
    ].join('\n'),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
