// 代码画图：让模型只输出一段 SVG，应用检查安全后渲染成透明底 PNG
// 返回 data URL，失败时抛出带中文说明的错误

const SVG_SIZE = 512

export const CODE_DRAW_SYSTEM_PROMPT = [
  '你是一个 SVG 画师。根据用户的要求画一个桌宠形象，只输出一段完整的 <svg>…</svg> 代码，不要任何解释、标题或 Markdown 代码围栏。',
  `画布固定为 viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}"，背景必须透明，不要画背景矩形。`,
  '只使用 path、circle、ellipse、rect、line、polyline、polygon、g、defs、linearGradient、radialGradient、stop 这些元素。',
  '禁止使用 script、foreignObject、image、use、style、on* 事件属性、外部链接和 @import。',
  '形象居中，全身或半身都可以，线条干净，颜色不超过 8 种。'
].join('\n')

const FORBIDDEN_TAGS = /<\s*\/?\s*(script|foreignObject|image|use|style|iframe|object|embed|link|meta|animate|set)\b/i
const EVENT_ATTR = /\son[a-z]+\s*=/i
const EXTERNAL_REF = /(href|xlink:href)\s*=\s*["']\s*(https?:|javascript:|data:)/i

// 从模型回复里取出第一段 <svg>…</svg>，兼容模型误加代码围栏的情况
export function extractSvg(text) {
  const raw = String(text || '')
  const match = raw.match(/<svg[\s\S]*<\/svg>/i)
  return match ? match[0] : ''
}

// 检查 SVG 是否安全，不安全时返回中文原因，安全时返回空字符串
export function checkSvgSafe(svg) {
  if (!svg) return '模型没有返回 SVG 代码'
  if (FORBIDDEN_TAGS.test(svg)) return '生成的代码包含不允许的元素'
  if (EVENT_ATTR.test(svg)) return '生成的代码包含事件属性'
  if (EXTERNAL_REF.test(svg)) return '生成的代码包含外部或脚本链接'
  if (svg.length > 60000) return '生成的代码太长'
  return ''
}

// 把安全的 SVG 画到透明画布上，导出 PNG data URL
export function renderSvgToPng(svg) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = SVG_SIZE
        canvas.height = SVG_SIZE
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, SVG_SIZE, SVG_SIZE)
        ctx.drawImage(img, 0, 0, SVG_SIZE, SVG_SIZE)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('模型画的代码无法渲染，请换个说法再试'))
    }
    img.src = url
  })
}

export async function generatePetSvg({ preset, model, request, stylePrompt, signal }) {
  if (!preset?.baseUrl?.trim() || !preset?.apiKey?.trim() || !preset?.model?.trim()) {
    throw new Error('所选画图预设缺少接口地址、模型或密钥，请到设置里补全。')
  }
  const base = preset.baseUrl.trim().replace(/\/+$/, '')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: (model || preset.model).trim(),
      temperature: 0.7,
      messages: [
        { role: 'system', content: CODE_DRAW_SYSTEM_PROMPT },
        { role: 'user', content: `${stylePrompt}\n形象要求：${request}` }
      ]
    }),
    signal
  })
  if (!response.ok) throw new Error(`接口返回 ${response.status}`)
  const data = await response.json()
  const text = data?.choices?.[0]?.message?.content
  const svg = extractSvg(text)
  const problem = checkSvgSafe(svg)
  if (problem) throw new Error(problem)
  return renderSvgToPng(svg)
}
