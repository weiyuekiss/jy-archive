// 临时拖动诊断：把预设条目拖动的关键步骤记到 localStorage。
// 下次打开应用时，如果上一次是在拖动中途页面被重新加载，就弹出过程记录。定位完成后可以删除本文件和相关调用。
const KEY = 'jyos_debug_trace'
const MAX_ENTRIES = 40

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function write(entries) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    // 存储不可用时忽略，诊断不能影响正常使用
  }
}

export function trace(event, data = {}) {
  const entries = read()
  entries.push({ t: Date.now(), e: event, ...data })
  write(entries)
}

export function navigationType() {
  return performance.getEntriesByType?.('navigation')?.[0]?.type || 'unknown'
}

function describe(entry) {
  const extra = [
    entry.i !== undefined && `i=${entry.i}`,
    entry.to !== undefined && `to=${entry.to}`,
    entry.persisted !== undefined && `persisted=${entry.persisted}`,
  ].filter(Boolean)
  return extra.length ? `${entry.e}(${extra.join(',')})` : entry.e
}

// 读取上一次会话的记录并清空。若最后一次拖动开始后没有对应的结束记录，说明拖动中途页面被重新加载，返回报告文本；否则返回 null。
export function diagnoseLastSession() {
  const entries = read()
  localStorage.removeItem(KEY)
  const names = entries.map((entry) => entry.e)
  const start = names.lastIndexOf('drag-start')
  const end = names.lastIndexOf('drag-end')
  if (start < 0 || end > start) return null
  const tail = entries.slice(start)
  const elapsed = tail[tail.length - 1].t - tail[0].t
  return [
    `上次拖动预设条目时页面被重新加载（拖动开始后约 ${elapsed} ms）。`,
    `拖动过程：${tail.map(describe).join(' → ')}`,
    `本次加载方式：${navigationType()}`,
  ].join('\n')
}

// 记录页面隐藏或被卸载的时刻（重载和切后台都会触发）
export function startTracing() {
  window.addEventListener('pagehide', (event) => trace('pagehide', { persisted: event.persisted }))
}
