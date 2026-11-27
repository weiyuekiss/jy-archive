// 群聊回复的请求：一次调用让模型扮演群里的成员，按群的回复方式决定谁发言。
// 群成员都在同一个群里，所以每位成员的完整设定都放进这一次请求，模型分别扮演各人。
import { assemblePresetMessages } from '@/stores/chatPresets'
import { splitSentenceReplies } from '@/components/pet/splitReplySentences'

export function groupMemberToText(member) {
  return Object.entries({ 姓名: member.name, 性别: member.gender, 生日: member.birthday, 年龄: member.age, 职业: member.occupation, 人物设定: member.details })
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)
    .join('\n') || '（暂无角色资料）'
}

function speakerRule(group) {
  if (group.replyMode === 'round') {
    return '回复方式：全员轮流。本轮每位成员各发言一次，顺序与成员列表一致。'
  }
  return `回复方式：智能接话。先判断此刻哪些成员会自然地接话或回应，只让他们发言，本轮最多 ${group.maxSpeakers} 人。没有必要说话的成员保持沉默，不要每轮都全员发言。`
}

function buildSystemPrompt({ group, members, userText, userName, memoryBlocks = [], systemInstruction = '', pendingTransfer = null }) {
  const announcement = group.announcement ? `\n群公告：${group.announcement}` : ''
  const memberBlocks = members.map((member) => `【成员：${member.name}】\n${groupMemberToText(member)}`).join('\n\n')
  const transferRule = pendingTransfer === null
    ? ''
    : `【待处理转账】用户有一笔转账等待处理，金额 ${pendingTransfer} 元。请由群里最合适的一位成员决定收下还是退还：在 JSON 顶层给出 transferAction（"accept" 表示收下，"return" 表示退还）。`
  return [
    `【群聊】群名：${group.name}。${announcement}`,
    `【群成员】以下是群里的全部成员。你要分别扮演这些成员，每位发言时只使用该成员自己的设定，不要把一位成员的性格或经历套到另一位身上。\n\n${memberBlocks}`,
    userText || `【用户资料】\n名字：${userName}`,
    ...memoryBlocks,
    systemInstruction ? `【当前聊天额外指令】\n${systemInstruction}` : '',
    transferRule,
    `【群聊规则】\n${speakerRule(group)}\n每位发言的成员都用自己的语气，符合设定与当前语境。不要替用户发言，不要替未发言的成员发言。`,
    `【应用输出协议】只返回一个合法 JSON 对象，不输出代码围栏或其他文字。格式：{"messages":[{"speaker":"成员名","type":"text","text":"发言内容"}]}。type 可以是 text（普通文字）、text-image（文字图：用 content 写图上的文字，text 写一句简短描述）、transfer（转账：用 amount 写数字金额，text 写备注）。speaker 必须与上面的成员名完全一致。消息按对话顺序排列。字符串中的换行须转义，不使用尾随逗号。`,
  ].filter(Boolean).join('\n\n')
}

// history：已经转成 { role, content } 的最近消息；群里其他成员的发言前面带上名字
// 返回模型原始输出的文本，由调用方解析
export async function requestGroupCompletion({ preset, chatPreset, group, members, userName, userText, history, enabledEntries, controller, memoryBlocks = [], systemInstruction = '', pendingTransfer = null }) {
  const replacements = { '{{user}}': userName, '<user>': userName, '{{char}}': group.name, '<char>': group.name, '{{user_persona}}': userText }
  const renderEntry = (entry) => {
    let content = entry.content
    for (const [token, value] of Object.entries(replacements)) content = content.replaceAll(token, () => value)
    return `【${entry.name}】\n${content}`
  }
  const systemPrompt = buildSystemPrompt({ group, members, userText, userName, memoryBlocks, systemInstruction, pendingTransfer })
  const base = preset.baseUrl.trim().replace(/\/+$/, '')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: preset.model,
      messages: assemblePresetMessages(history, enabledEntries, systemPrompt, renderEntry),
      temperature: Number.isFinite(Number(chatPreset.temperature)) ? Number(chatPreset.temperature) : 1,
      ...(Number(chatPreset.top_k) > 0 ? { top_k: Math.max(1, Math.round(Number(chatPreset.top_k))) } : {}),
      ...(Number(chatPreset.top_p) > 0 ? { top_p: Math.max(0.01, Math.min(1, Number(chatPreset.top_p))) } : {}),
      stream: false,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error?.message || `API 请求失败（${response.status}）`)
    error.status = response.status
    error.code = data.error?.code || data.error?.type || `HTTP_${response.status}`
    throw error
  }
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('API 返回内容为空或格式不支持。')
  return content
}

// 智能接话时限制本轮发言人数：按出现顺序保留前 max 位成员的全部消息。
export function limitSpeakers(replies, max) {
  const allowed = []
  for (const reply of replies) {
    if (!allowed.includes(reply.speakerId) && allowed.length < max) allowed.push(reply.speakerId)
  }
  return replies.filter((reply) => allowed.includes(reply.speakerId))
}

// 把一条模型输出的消息转成聊天消息字段。speaker 必须对应群里的成员，对不上的丢弃。
function parseItem(item, members) {
  if (!item || typeof item !== 'object') return null
  const speakerName = typeof item.speaker === 'string' ? item.speaker.trim() : ''
  const member = members.find((person) => person.name === speakerName)
    || members.find((person) => speakerName && speakerName.includes(person.name))
  if (!member) return null
  const base = { speakerId: member.id, speaker: member.name }
  if (item.type === 'transfer') {
    const amount = Math.round(Number(item.amount) * 100) / 100
    if (!(amount > 0)) return null
    return { ...base, type: 'transfer', amount, text: `转账 ¥${amount.toFixed(2)}` }
  }
  if (item.type === 'text-image') {
    const content = String(item.content || item.text || '').trim().slice(0, 1000)
    return content ? { ...base, type: 'text-image', content, text: `文字图：${content}` } : null
  }
  const body = typeof item.text === 'string' ? item.text.trim() : ''
  return body ? { ...base, type: 'text', text: body } : null
}

// 解析群聊回复。返回 replies（发言列表）和 transferAction / transferSpeaker（对用户转账的决定）。
export function parseGroupReplies(raw, members) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  let value
  try {
    value = JSON.parse(end > start ? text.slice(start, end + 1) : text)
  } catch {
    throw new Error('群聊回复格式解析失败，请重试。')
  }
  const items = Array.isArray(value?.messages) ? value.messages : []
  const replies = splitSentenceReplies(items.map((item) => parseItem(item, members)).filter(Boolean))
  const transferAction = value?.transferAction === 'accept' || value?.transferAction === 'return' ? value.transferAction : null
  if (!replies.length && !transferAction) throw new Error('群里暂时没有成员回复，请重试。')
  return { replies, transferAction }
}
