// 从角色的手机内容里提取候选记忆。只返回候选，不写入存储；由界面预览并让用户勾选后再保存。
// 返回 [{ content, source }]，source 是来源应用名（如「微信」「支付宝」）。

const SOURCE_LABEL = {
  messages: '微信',
  mails: '邮箱',
  notes: '备忘录',
  music: '音乐',
  photos: '相册',
  calls: '电话',
  browser: '浏览器',
  events: '日历',
  books: '书架',
  bills: '支付宝',
  wallet: '支付宝'
}

const MAX_PER_TYPE = 40
const MAX_CANDIDATES = 10
const MAX_CONTENT = 200

// 把手机内容压成一段简短文字，每类限制条数，避免请求过长
function summarizePhone(items) {
  const byType = new Map()
  for (const item of items) {
    if (!byType.has(item.type)) byType.set(item.type, [])
    byType.get(item.type).push(item)
  }
  const lines = []
  for (const [type, list] of byType) {
    const label = SOURCE_LABEL[type] || type
    const body = list.slice(0, MAX_PER_TYPE).map((item) => {
      const parts = [item.title, item.sub, item.time, item.text].map((v) => String(v || '').trim()).filter(Boolean)
      return `- ${parts.join(' | ').slice(0, 240)}`
    })
    lines.push(`【${label}】\n${body.join('\n')}`)
  }
  return lines.join('\n\n')
}

// 解析模型返回的 JSON；容忍代码围栏
function parseCandidates(raw) {
  const cleaned = String(raw || '').replace(/```(?:json)?/gi, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw Object.assign(new Error('模型没有返回可解析的记忆'), { raw: String(raw || '') })
  let data
  try {
    data = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw Object.assign(new Error('模型返回的格式无法解析'), { raw: String(raw || '') })
  }
  const list = Array.isArray(data?.memories) ? data.memories : []
  return list
    .map((m) => ({
      content: String(m?.content || '').trim().slice(0, MAX_CONTENT),
      source: String(m?.source || '').trim().slice(0, 12)
    }))
    .filter((m) => m.content)
    .slice(0, MAX_CANDIDATES)
}

export async function extractPhoneMemories({ preset, character, items, existingMemories = [], signal }) {
  if (!preset?.baseUrl?.trim() || !preset?.apiKey?.trim() || !preset?.model?.trim()) {
    throw new Error('所选预设缺少接口地址、模型或密钥，请到设置里补全。')
  }
  if (!items.length) throw new Error('这台手机还没有内容，先生成或刷新。')

  const base = preset.baseUrl.trim().replace(/\/+$/, '')
  const system = [
    '你是角色记忆整理器。根据角色手机里的内容，挑出对这个角色未来对话有帮助的、具体的记忆。',
    '只返回一个 JSON 对象，格式：{"memories":[{"content":"…","source":"微信"}]}，不要代码围栏，不要解释。',
    `最多 ${MAX_CANDIDATES} 条。每条 content 是一句话的事实，不超过 ${MAX_CONTENT} 字，要具体（人名、地点、时间、数字），例如「每周三晚上固定去健身房」「正在还一笔花呗，本期应还 1286 元」「和母亲因为春节回家的事有争执」。`,
    'source 填写来源应用名：微信、邮箱、备忘录、音乐、相册、电话、浏览器、日历、书架、支付宝。',
    '只保留能从手机内容里直接看出的事实，不要猜测，不要编造，不要把手机里的单次琐事当成长期记忆（如一笔普通外卖）。',
    '设定与手机内容冲突时，以角色设定为准，跳过冲突的内容。已有记忆里已经有的，不要重复。',
    '不要记录电话号码、网址、真实的个人信息。'
  ].join('\n')

  const user = [
    `角色：${character.name || '未填'}`,
    `角色设定：\n${[character.occupation && `职业：${character.occupation}`, character.details && `设定：${character.details}`].filter(Boolean).join('\n') || '未填'}`,
    `已有记忆（避免重复）：${JSON.stringify(existingMemories.slice(0, 60).map((m) => m.content))}`,
    `手机内容：\n${summarizePhone(items)}`
  ].join('\n\n')

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: preset.model.trim(),
      temperature: 0.3,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    }),
    signal
  })
  if (!response.ok) throw new Error(`接口返回 ${response.status}`)
  const data = await response.json()
  return parseCandidates(data?.choices?.[0]?.message?.content)
}
