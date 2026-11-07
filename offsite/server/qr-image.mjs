export const maxQrBytes = 512 * 1024
export function validateQrImage(value, fail, label = '二维码', maxBytes = maxQrBytes) {
  if (value === '') return ''
  const invalid = () => fail(`请上传有效的 PNG、JPG 或 WebP ${label}图片（不超过 ${maxBytes / 1024} KB）`)
  if (typeof value !== 'string' || value.length > Math.ceil(maxBytes / 3) * 4 + 40) invalid()
  const match = value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match) invalid()
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.length > maxBytes || bytes.toString('base64') !== match[2]) invalid()
  const valid =
    match[1] === 'png'
      ? bytes.length >= 24 &&
        bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
        bytes.toString('ascii', 12, 16) === 'IHDR'
      : match[1] === 'jpeg'
        ? bytes.length >= 4 &&
          bytes[0] === 0xff &&
          bytes[1] === 0xd8 &&
          bytes.at(-2) === 0xff &&
          bytes.at(-1) === 0xd9
        : bytes.length >= 20 &&
          bytes.toString('ascii', 0, 4) === 'RIFF' &&
          bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!valid) invalid()
  return value
}
