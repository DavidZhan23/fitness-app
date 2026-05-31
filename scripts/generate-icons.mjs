import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const iconsDir = path.join(publicDir, 'icons')
const sourcePath = path.join(iconsDir, 'icon-source.png')

const pngOutputs = [
  { file: path.join(iconsDir, 'icon-192.png'), size: 192 },
  { file: path.join(iconsDir, 'icon-512.png'), size: 512 },
  { file: path.join(iconsDir, 'icon-512-maskable.png'), size: 512 },
  { file: path.join(publicDir, 'favicon-32.png'), size: 32 },
]

for (const { file, size } of pngOutputs) {
  await sharp(sourcePath)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(file)
}

const favicon32 = await sharp(sourcePath).resize(32, 32, { fit: 'cover' }).png().toBuffer()

await sharp(sourcePath)
  .resize(32, 32, { fit: 'cover' })
  .toFile(path.join(publicDir, 'favicon.ico'))

const faviconSvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32">',
  `<image width="32" height="32" xlink:href="data:image/png;base64,${favicon32.toString('base64')}" />`,
  '</svg>',
].join('')
writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg)

console.log('✅ 已生成 icon-192/512/maskable、favicon-32/ico/svg')
