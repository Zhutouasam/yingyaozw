export default async function readImage(file, maxBytes = 1024 * 1024) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('请选择 PNG、JPG 或 WebP 图片。')
  if (file.size > 10 * 1024 * 1024) throw new Error('单张原图不能超过 10 MB，请先压缩后再上传。')
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择。'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
  const image = await new Promise((resolve, reject) => {
    const item = new Image()
    item.onerror = () => reject(new Error('图片无法打开，请选择有效图片。'))
    item.onload = () => resolve(item)
    item.src = source
  })
  if (file.size <= maxBytes) return source
  const scale = Math.min(1, 2400 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  for (const quality of [0.9, 0.8, 0.7, 0.6]) {
    const compressed = canvas.toDataURL('image/jpeg', quality)
    if ((compressed.length - compressed.indexOf(',') - 1) * 0.75 <= maxBytes) return compressed
  }
  throw new Error('压缩后图片仍过大，请裁剪无关区域后再上传。')
}
