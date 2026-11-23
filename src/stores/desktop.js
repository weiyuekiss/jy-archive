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
// 默认桌面布局：白色风格四个组件，与珍珠白壁纸搭配
const DEFAULT_PLACEMENTS = [
  { type: 'ins-photo-clock', x: 0, y: 0, w: 2, h: 2 },
  { type: 'ins-status-card', x: 2, y: 0, w: 2, h: 2 },
  { type: 'ins-quote-photo', x: 0, y: 2, w: 4, h: 2 },
  { type: 'ins-dual-photo', x: 0, y: 4, w: 4, h: 2 }
]

// 按默认位置放入小组件；list 为可用的小组件目录项（可为空）
function buildDefaultWidgets(list = []) {
  const selected = DEFAULT_PLACEMENTS.map((placement) => ({
    ...(list.find((item) => item.type === placement.type) || { uid: `${placement.type}-${Date.now()}` }),
    ...placement,
    data: {}
  }))
  return selected
}

// 重置桌面：恢复默认小组件（内容与位置）、清空应用位置、回到单页第一页
export function resetDesktop() {
  desktopWidgets.splice(0, desktopWidgets.length, ...buildDefaultWidgets())
  for (const key of Object.keys(appPositions)) delete appPositions[key]
  desktopPageCount.value = 1
  currentDesktopPage.value = 0
}

Promise.all([loadWidgets(), loadValue('home-layout-v1'), loadValue('desktop-pages'), loadValue('app-positions')]).then(async ([list, initialized, savedPageCount, savedAppPositions]) => {
  desktopPageCount.value = Math.max(1, Math.min(5, Number(savedPageCount) || 1))
  if (savedAppPositions && typeof savedAppPositions === 'object') Object.assign(appPositions, savedAppPositions)
  if (!initialized) {
    const selected = buildDefaultWidgets(list)
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

// 添加小组件：先找当前页的空位，当前页放不下则依次尝试其他页，必要时新建一页
export function addWidget(def) {
  const pages = [currentDesktopPage.value, ...Array.from({ length: desktopPageCount.value }, (_, i) => i).filter((i) => i !== currentDesktopPage.value)]
  for (const page of pages) {
    const spot = findFreeSpot(def.w, def.h, page)
    if (spot) return placeWidget(def, spot.x, spot.y, page)
  }
  if (desktopPageCount.value < 5) {
    const page = desktopPageCount.value
    setDesktopPageCount(desktopPageCount.value + 1)
    const spot = findFreeSpot(def.w, def.h, page)
    if (spot) return placeWidget(def, spot.x, spot.y, page)
  }
  return false
}

function placeWidget(def, x, y, page) {
  const uid = `${def.id}-${Date.now()}`
  desktopWidgets.push({ uid, type: def.id, x, y, w: def.w, h: def.h, page })
  currentDesktopPage.value = page
  return true
}

function findFreeSpot(w, h, page) {
  for (let y = 0; y <= GRID_ROWS - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      if (canPlace(x, y, w, h, null, page)) return { x, y }
    }
  }
  return null
}

// 让出位置：先在副本上算出方案（占用区域的小组件与应用挪到同页最近空位），方案可行才一次性写回；
// 返回 false 表示该页放不下，不做任何改动
export function pushAside(uid, x, y, w, h, page) {
  const inArea = (cx, cy) => cx >= x && cx < x + w && cy >= y && cy < y + h
  const widgetMoves = []
  const appMoves = []
  const occupied = []
  for (const item of desktopWidgets) {
    if (item.uid === uid || (Number(item.page) || 0) !== page) continue
    const hit = item.x < x + w && item.x + item.w > x && item.y < y + h && item.y + item.h > y
    if (hit) widgetMoves.push(item)
    else occupied.push({ x: item.x, y: item.y, w: item.w, h: item.h })
  }
  for (const [id, pos] of Object.entries(appPositions)) {
    if ((Number(pos.page) || 0) !== page) continue
    if (inArea(pos.x, pos.y)) appMoves.push(id)
    else occupied.push({ x: pos.x, y: pos.y, w: 1, h: 1 })
  }
  const reserved = [{ x, y, w, h }]
  const findSpot = (fw, fh) => {
    for (let ny = 0; ny <= GRID_ROWS - fh; ny++) {
      for (let nx = 0; nx <= GRID_COLS - fw; nx++) {
        const cells = [...occupied, ...reserved]
        const clash = cells.some((c) => c.x < nx + fw && c.x + c.w > nx && c.y < ny + fh && c.y + c.h > ny)
        if (!clash) return { x: nx, y: ny }
      }
    }
    return null
  }
  const widgetPlan = []
  const appPlan = []
  for (const item of widgetMoves) {
    const spot = findSpot(item.w, item.h)
    if (!spot) return false
    reserved.push({ x: spot.x, y: spot.y, w: item.w, h: item.h })
    widgetPlan.push({ item, spot })
  }
  for (const id of appMoves) {
    const spot = findSpot(1, 1)
    if (!spot) return false
    reserved.push({ x: spot.x, y: spot.y, w: 1, h: 1 })
    appPlan.push({ id, spot })
  }
  for (const { item, spot } of widgetPlan) {
    item.x = spot.x
    item.y = spot.y
  }
  for (const { id, spot } of appPlan) appPositions[id] = { x: spot.x, y: spot.y, page }
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
