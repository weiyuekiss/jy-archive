export const DEFAULT_PRESET_ID = 'default'
export const MAX_INJECTION_DEPTH = 100

export function normalizePromptEntry(entry) {
  return {
    ...entry,
    name: typeof entry.name === 'string' ? entry.name : '',
    content: typeof entry.content === 'string' ? entry.content : '',
    role: ['system', 'user', 'assistant'].includes(entry.role) ? entry.role : 'system',
    injectionMode: ['prefix', 'suffix', 'depth'].includes(entry.injectionMode)
      ? entry.injectionMode
      : entry.appendToPromptEnd ? 'suffix' : 'prefix',
    injectionDepth: Math.max(0, Math.min(MAX_INJECTION_DEPTH, Math.floor(Number(entry.injectionDepth) || 0))),
  }
}

export function normalizeChatPreset(preset) {
  return {
    ...preset,
    name: (typeof preset.name === 'string' ? preset.name.trim() : '') || '我的聊天预设',
    entries: preset.entries.filter((entry) => entry && typeof entry.id === 'string').map(normalizePromptEntry),
  }
}

export function assemblePresetMessages(history, entries, systemTail = '', render = (entry) => entry.content) {
  const prefix = []
  const suffix = []
  const inserts = new Map()
  for (const entry of entries) {
    if (!entry?.enabled || !entry.content?.trim()) continue
    const { role, injectionMode, injectionDepth } = normalizePromptEntry(entry)
    const message = { role, content: render(entry) }
    if (injectionMode === 'prefix') prefix.push(message)
    else if (injectionMode === 'suffix') suffix.push(message)
    else {
      const index = Math.max(0, history.length - injectionDepth)
      if (!inserts.has(index)) inserts.set(index, [])
      inserts.get(index).push(message)
    }
  }
  if (systemTail) suffix.push({ role: 'system', content: systemTail })
  const messages = []
  // 合并相邻的预设系统条目，历史消息保持原样。
  for (const message of [...prefix, ...suffix]) {
    const previous = messages.at(-1)
    if (message.role === 'system' && previous?.role === 'system') previous.content += `\n\n${message.content}`
    else messages.push({ ...message })
  }
  for (let index = 0; index <= history.length; index++) {
    if (inserts.has(index)) messages.push(...inserts.get(index))
    if (index < history.length) messages.push(history[index])
  }
  return messages
}
