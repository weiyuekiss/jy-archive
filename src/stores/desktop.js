// 桌面小组件状态：记录每个小组件在 4 × 6 网格中的位置，并持久化到 IndexedDB
import { reactive, ref, watch } from 'vue'
import { GRID_COLS, GRID_ROWS } from '@/apps'
import { loadWidgets, saveWidgets } from './db'

// [{ uid, type, x, y, w, h, data }]，x / y 从 0 开始
export const desktopWidgets = reactive([])

// 初始化：从 IndexedDB 加载
loadWidgets().then((list) => {
  desktopWidgets.splice(0, desktopWidgets.length, ...list)
})

// 监听变化并自动保存到 IndexedDB
let saveTimer = null
watch(
  desktopWidgets,
  () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveWidgets([...desktopWidgets]), 300)
  },
  { deep: true }
)

// 已被小组件占用的格子索引（y * 列数 + x），ignoreUid 用于拖动时排除自身
export function occupiedCells(ignoreUid = null) {
  const cells = new Set()
  for (const item of desktopWidgets) {
    if (item.uid === ignoreUid) continue
    for (let dy = 0; dy < item.h; dy++) {
      for (let dx = 0; dx < item.w; dx++) {
        cells.add((item.y + dy) * GRID_COLS + item.x + dx)
      }
    }
  }
  return cells
}

// 判断 w×h 的区域放在 (x, y) 是否越界或与其他小组件重叠
export function canPlace(x, y, w, h, ignoreUid = null) {
  if (x < 0 || y < 0 || x + w > GRID_COLS || y + h > GRID_ROWS) return false
  const used = occupiedCells(ignoreUid)
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (used.has((y + dy) * GRID_COLS + x + dx)) return false
    }
  }
  return true
}

// 从左上角开始找第一个放得下的位置；放不下返回 false
export function addWidget(def) {
  for (let y = 0; y <= GRID_ROWS - def.h; y++) {
    for (let x = 0; x <= GRID_COLS - def.w; x++) {
      if (canPlace(x, y, def.w, def.h)) {
        desktopWidgets.push({
          uid: `${def.id}-${Date.now()}`,
          type: def.id,
          x,
          y,
          w: def.w,
          h: def.h
        })
        return true
      }
    }
  }
  return false
}

// 移动到目标格子；目标不可用时不移动并返回 false
export function moveWidget(uid, x, y) {
  const item = desktopWidgets.find((w) => w.uid === uid)
  if (!item || !canPlace(x, y, item.w, item.h, uid)) return false
  item.x = x
  item.y = y
  return true
}

// 更新小组件的自定义数据（如拍立得图片），合并到 item.data
export function updateWidgetData(uid, patch) {
  const item = desktopWidgets.find((w) => w.uid === uid)
  if (!item) return
  item.data = { ...(item.data || {}), ...patch }
}

export function removeWidget(uid) {
  const index = desktopWidgets.findIndex((w) => w.uid === uid)
  if (index !== -1) desktopWidgets.splice(index, 1)
}

// 当前打开的应用（null 表示在桌面）
export const activeApp = ref(null)
export const openApp = (app) => {
  if (app.page) activeApp.value = app
}
export const closeApp = () => {
  activeApp.value = null
}
