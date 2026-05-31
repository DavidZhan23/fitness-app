import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.resolve(__dirname, '../public/icons')
const sourcePath = path.join(iconsDir, 'icon-source.png')

const outputs = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-512-maskable.png', size: 512 },
  { file: '../favicon-32.png', size: 32 },
]

for (const { file, size } of outputs) {
  const outPath = path.join(iconsDir, file)
  await sharp(sourcePath)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outPath)
}

console.log('✅ 已生成 icon-192.png、icon-512.png、icon-512-maskable.png、favicon-32.png')
