// 长期记忆的存储读写。数据和聊天页用的是同一个 IndexedDB 键 jyos_long_term_memories，
// 结构为 { [角色 id]: [{ id, category, content, createdAt, source }] }。
// 聊天页仍是这份数据的主要读写方，这里只给查手机提供「追加一批记忆」的入口。
import { loadValue, saveValue } from './db'

const KEY = 'jyos_long_term_memories'
const MAX_PER_CHARACTER = 200

// 追加一批手机记忆：先读取最新数据，去掉重复，再写回
export async function appendPhoneMemories(characterId, candidates) {
  const all = (await loadValue(KEY)) || {}
  const key = String(characterId)
  const existing = Array.isArray(all[key]) ? all[key] : []
  const seen = new Set(existing.map((m) => m.content))
  const now = Date.now()
  const added = []
  for (const c of candidates) {
    const content = String(c.content || '').trim().slice(0, 500)
    if (!content || seen.has(content)) continue
    seen.add(content)
    added.push({
      id: `memory-${now}-${Math.random().toString(36).slice(2, 8)}`,
      category: '手机记录',
      content,
      source: String(c.source || '').slice(0, 12),
      createdAt: now
    })
  }
  if (!added.length) return 0
  all[key] = [...added, ...existing].slice(0, MAX_PER_CHARACTER)
  await saveValue(KEY, all)
  // 聊天页常驻内存，持有自己的一份记忆副本；通知它重新读取，否则它下次保存会覆盖这里的写入
  window.dispatchEvent(new CustomEvent('jyos-memories-updated', { detail: all }))
  return added.length
}
