// 桌面小组件状态：记录每个小组件在 4 × 6 网格中的位置，并持久化到 IndexedDB
import { reactive, ref, watch } from 'vue'
import { GRID_COLS, GRID_ROWS } from '@/apps'
import { loadValue, loadWidgets, saveValue, saveWidgets } from './db'

// [{ uid, type, x, y, w, h, data }]，x / y 从 0 开始
export const desktopWidgets = reactive([])
export const desktopPageCount = ref(1)
export const currentDesktopPage = ref(0)
export const appPositions = reactive({})

let saveTimer = null
let loadedWidgets = false
Promise.all([loadWidgets(), loadValue('home-layout-v1'), loadValue('desktop-pages'), loadValue('app-positions')]).then(async ([list, initialized, savedPageCount, savedAppPositions]) => {
  desktopPageCount.value = Math.max(1, Math.min(5, Number(savedPageCount) || 1))
  if (savedAppPositions && typeof savedAppPositions === 'object') Object.assign(appPositions, savedAppPositions)
  if (!initialized) {
    const placements = [
      { type: 'clock-bold', x: 0, y: 0, w: 4, h: 2 },
      { type: 'clock-analog', x: 0, y: 2, w: 2, h: 2 }
    ]
    const selected = placements.map((placement) => ({
      ...(list.find((item) => item.type === placement.type) || { uid: `${placement.type}-${Date.now()}` }),
      ...placement
    }))
    const remaining = list.filter((item) => !selected.some((widget) => widget.uid === item.uid))
    desktopWidgets.push(...selected)
    for (const item of remaining) {
      let placed = false
      for (let y = 0; y <= GRID_ROWS - item.h && !placed; y++) {
        for (let x = 0; x <= GRID_COLS - item.w; x++) {
          if (canPlace(x, y, item.w, item.h)) {
            desktopWidgets.push({ ...item, x, y })
            placed = true
            break
          }
        }
      }
    }
    // 原布局单独存档，便于找回因空间不足而未放入首页的小组件。
    await saveValue('home-layout-backup', list)
    await saveWidgets(desktopWidgets)
    await saveValue('home-layout-v1', true)
  } else {
    desktopWidgets.splice(0, desktopWidgets.length, ...list.map((item) => ({ ...item, page: Number.isInteger(item.page) ? item.page : 0 })))
  }
  loadedWidgets = true
})
watch(
  [desktopWidgets, desktopPageCount, appPositions],
  () => {
    if (!loadedWidgets) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveWidgets(desktopWidgets)
      saveValue('desktop-pages', desktopPageCount.value)
      saveValue('app-positions', appPositions)
    }, 300)
  },
  { deep: true }
)

export function setDesktopPageCount(count) {
  const nextCount = Math.max(1, Math.min(5, Math.floor(Number(count) || 1)))
  desktopPageCount.value = nextCount
  for (const widget of desktopWidgets) widget.page = Math.min(Number(widget.page) || 0, nextCount - 1)
  for (const position of Object.values(appPositions)) position.page = Math.min(Number(position.page) || 0, nextCount - 1)
  currentDesktopPage.value = Math.min(currentDesktopPage.value, nextCount - 1)
}

// 已被小组件占用的格子索引（y * 列数 + x），ignoreUid 用于拖动时排除自身
export function occupiedCells(ignoreUid = null, page = currentDesktopPage.value, ignoreAppId = null) {
  const cells = new Set()
  for (const item of desktopWidgets) {
    if (item.uid === ignoreUid || (Number(item.page) || 0) !== page) continue
    for (let dy = 0; dy < item.h; dy++) for (let dx = 0; dx < item.w; dx++) cells.add((item.y + dy) * GRID_COLS + item.x + dx)
  }
  for (const [id, pos] of Object.entries(appPositions)) {
    if (id === ignoreAppId || (Number(pos.page) || 0) !== page) continue
    cells.add(pos.y * GRID_COLS + pos.x)
  }
  return cells
}

export function canPlace(x, y, w, h, ignoreUid = null, page = currentDesktopPage.value, ignoreAppId = null) {
  if (x < 0 || y < 0 || x + w > GRID_COLS || y + h > GRID_ROWS) return false
  const used = occupiedCells(ignoreUid, page, ignoreAppId)
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (used.has((y + dy) * GRID_COLS + x + dx)) return false
  return true
}

export function moveWidget(uid, x, y, page = currentDesktopPage.value) {
  const item = desktopWidgets.find((w) => w.uid === uid)
  if (!item || !canPlace(x, y, item.w, item.h, uid, page)) return false
  item.x = x
  item.y = y
  item.page = page
  return true
}

export function moveApp(id, x, y, page = currentDesktopPage.value) {
  if (!canPlace(x, y, 1, 1, null, page, id)) return false
  appPositions[id] = { x, y, page }
  return true
}

export function addWidget(def) {
  for (let y = 0; y <= GRID_ROWS - def.h; y++) {
    for (let x = 0; x <= GRID_COLS - def.w; x++) {
      if (canPlace(x, y, def.w, def.h, null, 0)) {
        desktopWidgets.push({ uid: `${def.id}-${Date.now()}`, type: def.id, x, y, w: def.w, h: def.h, page: 0 })
        return true
      }
    }
  }
  return false
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
