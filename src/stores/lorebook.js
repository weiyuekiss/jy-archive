// 世界书：关键词触发的背景资料。每个聊天在 jyos_character_chat_settings 里绑定若干世界书（lorebookIds），
// 只有绑定的世界书里的条目会参与触发并注入提示词。
//   世界书：{ id, name }
//   条目：{ id, bookId, name, keys, content, enabled, constant, order }
// 全部存在 jyos_lorebook：{ books, entries, settings }。
import { reactive } from 'vue'
import { loadValue, saveValue } from './db'

const KEY = 'jyos_lorebook'
const DEFAULT_BOOK_ID = 'book-default'
export const DEFAULT_SETTINGS = { scanDepth: 4, budget: 1500 }

export const lorebook = reactive({ books: [], entries: [], settings: { ...DEFAULT_SETTINGS }, ready: false })

let loadPromise = null
export function loadLorebook() {
  if (!loadPromise) {
    loadPromise = loadValue(KEY).then(async (saved) => {
      if (saved && typeof saved === 'object') {
        lorebook.books = Array.isArray(saved.books) ? saved.books.map(normalizeBook) : []
        lorebook.entries = Array.isArray(saved.entries) ? saved.entries.map(normalizeEntry) : []
        lorebook.settings = normalizeSettings(saved.settings)
      }
      // 旧版本只有一份条目、没有世界书分组：已有条目归入默认世界书
      if (!lorebook.books.length) {
        lorebook.books = [{ id: DEFAULT_BOOK_ID, name: '默认世界书' }]
        lorebook.entries.forEach((e) => { e.bookId = DEFAULT_BOOK_ID })
        await persistLorebook()
      }
      lorebook.ready = true
    })
  }
  return loadPromise
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeBook(raw = {}) {
  return {
    id: String(raw.id || newId('book')),
    name: String(raw.name || '').trim().slice(0, 40) || '未命名世界书',
  }
}

function normalizeEntry(raw = {}) {
  const order = Number(raw.order)
  return {
    id: String(raw.id || newId('lore')),
    bookId: String(raw.bookId || ''),
    name: String(raw.name || '').slice(0, 60),
    keys: Array.isArray(raw.keys) ? raw.keys.map((k) => String(k).trim()).filter(Boolean) : [],
    content: String(raw.content || '').slice(0, 4000),
    enabled: raw.enabled !== false,
    constant: Boolean(raw.constant),
    order: Number.isFinite(order) ? order : 100,
  }
}

function normalizeSettings(raw = {}) {
  const depth = Math.round(Number(raw.scanDepth))
  const budget = Math.round(Number(raw.budget))
  return {
    scanDepth: Number.isFinite(depth) ? Math.min(50, Math.max(1, depth)) : DEFAULT_SETTINGS.scanDepth,
    budget: Number.isFinite(budget) ? Math.min(20000, Math.max(100, budget)) : DEFAULT_SETTINGS.budget,
  }
}

export async function persistLorebook() {
  return saveValue(KEY, JSON.parse(JSON.stringify({ books: lorebook.books, entries: lorebook.entries, settings: lorebook.settings })))
}

export async function saveBook(draft) {
  const book = normalizeBook(draft)
  if (!String(draft.name || '').trim()) throw new Error('世界书名字不能为空')
  const index = lorebook.books.findIndex((b) => b.id === book.id)
  if (index >= 0) lorebook.books[index] = book
  else lorebook.books.push(book)
  await persistLorebook()
  return book
}

// 删除世界书会一并删除其中的条目。至少保留一个世界书。
export async function deleteBook(id) {
  if (lorebook.books.length <= 1) throw new Error('至少保留一个世界书')
  lorebook.books = lorebook.books.filter((b) => b.id !== id)
  lorebook.entries = lorebook.entries.filter((e) => e.bookId !== id)
  await persistLorebook()
}

export async function saveEntry(draft) {
  const entry = normalizeEntry(draft)
  if (!entry.name.trim()) throw new Error('条目名字不能为空')
  if (!lorebook.books.some((b) => b.id === entry.bookId)) throw new Error('请先选择或新建一个世界书')
  const index = lorebook.entries.findIndex((e) => e.id === entry.id)
  if (index >= 0) lorebook.entries[index] = entry
  else lorebook.entries.push(entry)
  await persistLorebook()
  return entry
}

export async function deleteEntry(id) {
  lorebook.entries = lorebook.entries.filter((e) => e.id !== id)
  await persistLorebook()
}

export async function saveSettings(next) {
  lorebook.settings = normalizeSettings(next)
  await persistLorebook()
}

// 扫描最近的消息文本，返回 bookIds 中的世界书里应注入的条目（按 order 排序，总字数不超过 budget）。
// messages：字符串数组，按时间从早到晚排列。
export function activeLoreEntries(messages = [], bookIds = []) {
  if (!bookIds.length) return []
  const { scanDepth, budget } = lorebook.settings
  const recent = messages.slice(-scanDepth).join('\n').toLowerCase()
  const hits = lorebook.entries
    .filter((e) => bookIds.includes(e.bookId) && e.enabled && e.content.trim())
    .filter((e) => e.constant || e.keys.some((k) => recent.includes(k.toLowerCase())))
    .sort((a, b) => a.order - b.order)
  const picked = []
  let used = 0
  for (const entry of hits) {
    if (used + entry.content.length > budget) continue
    picked.push(entry)
    used += entry.content.length
  }
  return picked
}

// 生成注入提示词的文本块；没有命中条目时返回空字符串。
export function loreBlock(messages = [], bookIds = []) {
  const entries = activeLoreEntries(messages, bookIds)
  if (!entries.length) return ''
  return `【世界书】以下是与当前对话相关的背景资料，请把它当作角色所处世界的事实来理解，不要逐条复述。\n${entries.map((e) => `【${e.name}】\n${e.content}`).join('\n\n')}`
}
