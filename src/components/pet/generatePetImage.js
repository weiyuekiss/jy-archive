// 调用 OpenAI 兼容的 /images/generations 接口生成桌宠形象
// 返回 data URL（PNG），失败时抛出带中文说明的错误

const IMAGE_TIMEOUT_MS = 120000

export async function generatePetImage({ preset, model, prompt, signal }) {
  if (!preset?.baseUrl?.trim() || !preset?.apiKey?.trim()) {
    throw new Error('所选画图预设缺少接口地址或密钥，请到设置里补全。')
  }
  const base = preset.baseUrl.trim().replace(/\/+$/, '')
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)
  const abortOnOuter = () => controller.abort()
  signal?.addEventListener('abort', abortOnOuter)

  try {
    const response = await fetch(`${base}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
      body: JSON.stringify({
        model: (model || '').trim(),
        prompt,
        n: 1,
        size: '1024x1024',
        background: 'transparent',
        output_format: 'png'
      }),
      signal: controller.signal
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`接口返回 ${response.status}${detail ? `：${detail.slice(0, 160)}` : ''}`)
    }
    const data = await response.json()
    const item = data?.data?.[0]
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`
    if (item?.url) {
      const blob = await (await fetch(item.url, { signal: controller.signal })).blob()
      return await blobToDataUrl(blob)
    }
    throw new Error('接口没有返回图片')
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('生成超时或已取消')
    throw error
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abortOnOuter)
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
