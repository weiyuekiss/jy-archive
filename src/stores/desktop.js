// 桌面小组件状态：记录每个小组件在 4 × 6 网格中的位置，并持久化到 IndexedDB
import { reactive, ref, watch } from 'vue'
import { GRID_COLS, dockApps, homeApps } from '@/apps'
import { loadValue, loadWidgets, saveValue, saveWidgets } from './db'

// [{ uid, type, x, y, w, h, data }]，x / y 从 0 开始
export const desktopWidgets = reactive([])
// 纵向行数由屏幕高度决定，HomeGrid 测量后写入
export const gridRows = ref(6)
export const desktopPageCount = ref(1)
export const currentDesktopPage = ref(0)
export const appPositions = reactive({})

let saveTimer = null
let loadedWidgets = false
// 默认桌面：顶部一个日期时钟（4×2），应用放在第 4、5 行的中间两列
const DEFAULT_PLACEMENTS = [
  { type: 'clock-date', x: 0, y: 0, w: 4, h: 2 }
]
// 默认应用位置（按 app.id）：第 4 行（y = 3）与第 5 行（y = 4）各放 4 个，从左到右
export const DEFAULT_APP_POSITIONS = {
  beautify: { x: 0, y: 3, page: 0 },
  chat: { x: 1, y: 3, page: 0 },
  character: { x: 2, y: 3, page: 0 },
  settings: { x: 3, y: 3, page: 0 },
  'phone-check': { x: 0, y: 4, page: 0 },
  lorebook: { x: 1, y: 4, page: 0 },
  'pending-3': { x: 2, y: 4, page: 0 },
  'pending-4': { x: 3, y: 4, page: 0 }
}
// 旧版默认放在桌面上的四个小组件，升级时从已保存的布局中移除一次
const RETIRED_WIDGET_TYPES = ['ins-photo-clock', 'ins-status-card', 'ins-quote-photo', 'ins-dual-photo']

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
  // 资源库已删除，清除它残留的桌面位置，避免占用格子
  delete appPositions.library
  if (!initialized) {
    // 首次使用：顶部日期时钟加应用默认位置，原布局单独存档以便找回。
    desktopWidgets.push(...buildDefaultWidgets(list))
    for (const [id, pos] of Object.entries(DEFAULT_APP_POSITIONS)) appPositions[id] = { ...pos }
    await saveValue('home-layout-backup', list)
    await saveWidgets(desktopWidgets)
    await saveValue('app-positions', appPositions)
    await saveValue('home-layout-v1', true)
    await saveValue('home-layout-v2', true)
  } else {
    let items = list
    if (!(await loadValue('home-widgets-retired-v1'))) {
      items = list.filter((item) => !RETIRED_WIDGET_TYPES.includes(item.type))
      await saveValue('home-widgets-retired-v1', true)
    }
    desktopWidgets.splice(0, desktopWidgets.length, ...items.map((item) => ({ ...item, page: Number.isInteger(item.page) ? item.page : 0 })))
    // 一次性迁移：已有布局的用户，把应用移到新的默认位置，并加上顶部日期时钟（若尚未存在）。
    if (!(await loadValue('home-layout-v2'))) {
      for (const [id, pos] of Object.entries(DEFAULT_APP_POSITIONS)) appPositions[id] = { ...pos }
      // 顶部空间被占用时不硬塞时钟，避免与已有小组件重叠
      if (!desktopWidgets.some((w) => w.type === 'clock-date') && canPlace(0, 0, 4, 2, null, 0)) {
        desktopWidgets.push({ uid: `clock-date-${Date.now()}`, type: 'clock-date', x: 0, y: 0, w: 4, h: 2, page: 0, data: {} })
      }
      await saveValue('app-positions', appPositions)
      await saveWidgets(desktopWidgets)
      await saveValue('home-layout-v2', true)
    }
  }
  if (resolveLayout()) {
    await saveValue('app-positions', appPositions)
    await saveWidgets(desktopWidgets)
  }
  loadedWidgets = true
})

// 布局唯一性：同一页的每个格子只能被一个小组件或应用占用。
// 1. 还没有位置的应用，先放到第 1 页的空格。
// 2. 每页按顺序处理：小组件先占位，应用后占位。越界或冲突的项目移到同页最近的空格；
//    同页放不下则移到下一页（最多 5 页）。
// 返回是否有项目被移动。加载、保存和改页数时都会调用，叠放不会留在存储里。
export function resolveLayout() {
  let changed = false

  for (const app of [...dockApps, ...homeApps]) {
    if (appPositions[app.id]) continue
    const taken = occupancyOf(0)
    const spot = findIn(taken, 1, 1)
    if (spot) {
      appPositions[app.id] = { x: spot.x, y: spot.y, page: 0 }
      changed = true
    }
  }

  for (let page = 0; page < 5; page++) {
    const taken = new Set()
    for (const item of desktopWidgets.filter((w) => (Number(w.page) || 0) === page)) {
      if (!fits(taken, item.x, item.y, item.w, item.h)) {
        const spot = findIn(taken, item.w, item.h)
        if (spot) {
          item.x = spot.x
          item.y = spot.y
          changed = true
        } else if (page < 4) {
          item.page = page + 1
          desktopPageCount.value = Math.max(desktopPageCount.value, page + 2)
          changed = true
          continue
        }
      }
      mark(taken, item.x, item.y, item.w, item.h)
    }
    for (const [id, pos] of Object.entries(appPositions)) {
      if ((Number(pos.page) || 0) !== page) continue
      if (!fits(taken, pos.x, pos.y, 1, 1)) {
        const spot = findIn(taken, 1, 1)
        if (spot) {
          appPositions[id] = { x: spot.x, y: spot.y, page }
        } else if (page < 4) {
          appPositions[id] = { ...pos, page: page + 1 }
          desktopPageCount.value = Math.max(desktopPageCount.value, page + 2)
          changed = true
          continue
        } else {
          continue
        }
        changed = true
      }
      mark(taken, pos.x, pos.y, 1, 1)
    }
  }
  return changed
}

// 某一页上已被小组件或应用占用的格子
function occupancyOf(page) {
  const taken = new Set()
  for (const item of desktopWidgets) {
    if ((Number(item.page) || 0) === page) mark(taken, item.x, item.y, item.w, item.h)
  }
  for (const pos of Object.values(appPositions)) {
    if ((Number(pos.page) || 0) === page) mark(taken, pos.x, pos.y, 1, 1)
  }
  return taken
}

function cellKey(x, y) {
  return `${x}:${y}`
}

// 矩形是否在网格内且不与已占用格子重叠
function fits(taken, x, y, w, h) {
  if (x < 0 || y < 0 || x + w > GRID_COLS || y + h > gridRows.value) return false
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) if (taken.has(cellKey(x + dx, y + dy))) return false
  }
  return true
}

function mark(taken, x, y, w, h) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) taken.add(cellKey(x + dx, y + dy))
  }
}

function findIn(taken, w, h) {
  for (let y = 0; y <= gridRows.value - h; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      if (fits(taken, x, y, w, h)) return { x, y }
    }
  }
  return null
}
watch(
  [desktopWidgets, desktopPageCount, appPositions],
  () => {
    if (!loadedWidgets) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      resolveLayout()
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
  if (x < 0 || y < 0 || x + w > GRID_COLS || y + h > gridRows.value) return false
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
  for (let y = 0; y <= gridRows.value - h; y++) {
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
    for (let ny = 0; ny <= gridRows.value - fh; ny++) {
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
