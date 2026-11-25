// 把聊天记录和长期记忆转成提示词文本。只做格式化和长度控制，不读写存储。
// 字数上限集中在这里，方便按模型的上下文长度调整。
export const MEMORY_BUDGET = {
  member: 1500,        // 群成员的长期记忆（与用户的过往），每位成员各一份
  memberPrivate: 1500, // 群成员与用户单聊的最近记录，每位成员各一份
  group: 2000,         // 群自己的长期记忆
  groupEarlier: 8000,  // 群里较早的对话（在最近消息窗口之外）
  groupRecent: 3000    // 单聊时看到的所在群的最近对话
}

export function fillPlaceholders(text, { userName = '用户', characterName = '角色' } = {}) {
  return String(text || '')
    .replaceAll('{{user}}', userName)
    .replaceAll('<user>', userName)
    .replaceAll('{{char}}', characterName)
    .replaceAll('<char>', characterName)
}

// list 按时间从新到旧排列（appendPhoneMemories 与 generateLongTermMemory 都是 unshift 写入）
export function memoryLinesOf(list, { userName, characterName, maxItems = 60, maxChars = 3000 } = {}) {
  const lines = []
  let total = 0
  for (const item of (Array.isArray(list) ? list : []).slice(0, maxItems)) {
    if (!item?.content) continue
    const line = `- [${item.category || '重要记忆'}] ${fillPlaceholders(String(item.content).trim(), { userName, characterName })}`
    if (total + line.length > maxChars) break
    lines.push(line)
    total += line.length
  }
  return lines.join('\n')
}

// 从最新的消息往前取，直到达到条数或字数上限，最后按时间顺序返回。
export function transcriptLines(messages, { nameOf, maxLines = 60, maxChars = 3000, perLine = 160 } = {}) {
  const lines = []
  let total = 0
  for (let index = (Array.isArray(messages) ? messages : []).length - 1; index >= 0 && lines.length < maxLines; index -= 1) {
    const message = messages[index]
    if (!message || message.type === 'system-instruction') continue
    const text = String(message.text || message.content || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const line = `${nameOf(message)}：${text.slice(0, perLine)}`
    if (total + line.length > maxChars) break
    lines.push(line)
    total += line.length
  }
  return lines.reverse().join('\n')
}
