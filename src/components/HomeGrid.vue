<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import WidgetView from './widgets/WidgetView.vue'
import PhotoPickerDialog from './widgets/PhotoPickerDialog.vue'
import { GRID_COLS, GRID_ROWS } from '@/apps'
import { canPlace, desktopWidgets, moveWidget, moveApp, appPositions, desktopPageCount, currentDesktopPage, occupiedCells, pushAside, removeWidget, updateWidgetData } from '@/stores/desktop'

const props = defineProps({
  apps: { type: Array, default: () => [] }
})

// ===== 正方形网格：格子边长取「宽 / 列数」与「高 / 行数」中的较小值 =====
const areaEl = ref(null)
const gridEl = ref(null)
const cell = ref(0)
let observer = null
function measure() {
  const el = areaEl.value
  if (!el) return
  const s = getComputedStyle(el)
  const w = el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
  cell.value = Math.floor(Math.min(w / GRID_COLS, el.clientHeight / GRID_ROWS))
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(areaEl.value)
})
onBeforeUnmount(() => observer?.disconnect())

const gridStyle = computed(() => ({
  '--cell': `${cell.value}px`,
  width: `${cell.value * GRID_COLS}px`,
  height: `${cell.value * GRID_ROWS}px`
}))
// 翻页方向：1 表示向右翻（内容从右侧进入），-1 表示向左翻
const pageDirection = ref(1)
// 拖动靠边翻页时关闭过渡动画，并设置冷却时间，避免每帧重复切页导致卡顿
const dragFlipping = ref(false)
let lastEdgeFlip = 0
function goToPage(page, { fromDrag = false } = {}) {
  const next = Math.max(0, Math.min(desktopPageCount.value - 1, page))
  if (next === currentDesktopPage.value) return
  if (fromDrag) {
    const now = Date.now()
    if (now - lastEdgeFlip < 450) return
    lastEdgeFlip = now
  }
  pageDirection.value = next > currentDesktopPage.value ? 1 : -1
  dragFlipping.value = fromDrag
  currentDesktopPage.value = next
}
// 拖动到屏幕边缘时自动翻页：手指停在边缘也会按固定间隔连续翻页，离开边缘即停止
let edgeTimer = null
let edgeDir = 0
function setEdgeDirection(dir) {
  if (dir === edgeDir) return
  clearEdgeTimer()
  edgeDir = dir
  if (!dir) return
  const flip = () => {
    const target = currentDesktopPage.value + dir
    if (target < 0 || target > desktopPageCount.value - 1) return clearEdgeTimer()
    goToPage(target, { fromDrag: true })
  }
  flip()
  edgeTimer = setInterval(flip, 700)
}
function clearEdgeTimer() {
  if (edgeTimer) clearInterval(edgeTimer)
  edgeTimer = null
  edgeDir = 0
}
function edgeDirectionAt(clientX) {
  const rect = areaEl.value.getBoundingClientRect()
  if (clientX < rect.left + 24 && currentDesktopPage.value > 0) return -1
  if (clientX > rect.right - 24 && currentDesktopPage.value < desktopPageCount.value - 1) return 1
  return 0
}
onBeforeUnmount(clearEdgeTimer)

let swipeStart = null
// 允许从组件、应用和普通按钮上开始滑动翻页；只排除表单控件与编辑态按钮。
// 编辑模式下从组件或应用上开始的滑动交给拖动逻辑处理，不翻页。
let suppressClickUntil = 0
function onAreaPointerDown(e) {
  if (e.target.closest('input, textarea, select, .remove, .done, .page-dots')) return
  if (editing.value && e.target.closest('.widget-slot, .app-cell')) return
  swipeStart = { x: e.clientX, y: e.clientY }
}
function onAreaPointerUp(e) {
  if (!swipeStart) return
  const dx = e.clientX - swipeStart.x
  const dy = e.clientY - swipeStart.y
  swipeStart = null
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    // 滑动结束时浏览器可能补发 click，误触组件内按钮（如照片选择），这里吞掉这次点击
    suppressClickUntil = Date.now() + 350
    goToPage(currentDesktopPage.value + (dx < 0 ? 1 : -1))
  }
}
function onAreaClickCapture(e) {
  if (Date.now() < suppressClickUntil) {
    e.stopPropagation()
    e.preventDefault()
  }
}
watch(desktopPageCount, (count) => goToPage(Math.min(currentDesktopPage.value, count - 1)))

const visibleWidgets = computed(() => desktopWidgets.filter((w) => (Number(w.page) || 0) === currentDesktopPage.value))
const freeCells = computed(() => {
  const used = occupiedCells(null, currentDesktopPage.value)
  const cells = []
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) if (!used.has(i)) cells.push({ index: i, x: i % GRID_COLS, y: Math.floor(i / GRID_COLS) })
  return cells
})
const appDrag = reactive({ id: null, startX: 0, startY: 0, dx: 0, dy: 0, tx: 0, ty: 0, page: 0, ok: true })
const appDragging = computed(() => props.apps.find((app) => app.id === appDrag.id))
let appPressTimer = null
let appPending = null
function appPos(app, i) {
  if (appPositions[app.id]) return appPositions[app.id]
  const defaults = [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }]
  const candidate = defaults[i] || { x: i % GRID_COLS, y: Math.floor(i / GRID_COLS) }
  if (canPlace(candidate.x, candidate.y, 1, 1, null, 0, app.id)) return { ...candidate, page: 0 }
  for (let y = 0; y < GRID_ROWS; y++) for (let x = 0; x < GRID_COLS; x++) if (canPlace(x, y, 1, 1, null, 0, app.id)) return { x, y, page: 0 }
  return { x: 0, y: 0, page: 0 }
}
const visibleApps = computed(() => props.apps.filter((app) => {
  const position = appPositions[app.id]
  if (!position) return currentDesktopPage.value === 0
  return (Number(position.page) || 0) === currentDesktopPage.value
}))
function appStyle(app, i) {
  const p = appPos(app, i)
  return { gridColumn: p.x + 1, gridRow: p.y + 1, transform: appDrag.id === app.id ? `translate(${appDrag.dx}px, ${appDrag.dy}px) scale(1.08)` : null, zIndex: appDrag.id === app.id ? 3 : 1 }
}
function appDown(e, app, i) {
  e.currentTarget.setPointerCapture(e.pointerId)
  const p = appPos(app, i)
  appPending = { app, x: e.clientX, y: e.clientY, p }
  if (editing.value) return beginAppDrag()
  appPressTimer = setTimeout(() => { editing.value = true; beginAppDrag() }, 450)
}
function beginAppDrag() {
  if (!appPending) return
  const { app, p, x, y } = appPending
  Object.assign(appDrag, { id: app.id, startX: x, startY: y, dx: 0, dy: 0, tx: p.x, ty: p.y, page: currentDesktopPage.value, ok: true })
}
function appMove(e, app) {
  if (appDrag.id !== app.id) {
    if (appPending && Math.hypot(e.clientX - appPending.x, e.clientY - appPending.y) > 8) clearTimeout(appPressTimer)
    return
  }
  appDrag.dx = e.clientX - appDrag.startX; appDrag.dy = e.clientY - appDrag.startY
  appDrag.tx = Math.max(0, Math.min(GRID_COLS - 1, appPending.p.x + Math.round(appDrag.dx / cell.value)))
  appDrag.ty = Math.max(0, Math.min(GRID_ROWS - 1, appPending.p.y + Math.round(appDrag.dy / cell.value)))
  const rect = areaEl.value.getBoundingClientRect()
  const nearLeft = e.clientX < rect.left + 24 && currentDesktopPage.value > 0
  const nearRight = e.clientX > rect.right - 24 && currentDesktopPage.value < desktopPageCount.value - 1
  if (nearLeft || nearRight) { appDrag.page = nearLeft ? currentDesktopPage.value - 1 : currentDesktopPage.value + 1; goToPage(appDrag.page, { fromDrag: true }) }
  appDrag.ok = canPlace(appDrag.tx, appDrag.ty, 1, 1, null, appDrag.page, app.id)
}
function appUp(app) {
  clearTimeout(appPressTimer)
  if (appDrag.id === app.id) {
    if (appDrag.ok) { moveApp(app.id, appDrag.tx, appDrag.ty, appDrag.page); currentDesktopPage.value = appDrag.page }
    appDrag.id = null
  }
  appPending = null
}


const editing = ref(false)
const drag = reactive({ uid: null, startX: 0, startY: 0, dx: 0, dy: 0, tx: 0, ty: 0, page: 0, ok: true })
let pressTimer = null
let pending = null
let tapCandidate = false


function onPointerDown(e, w) {
  // Interactive widget controls need their own pointer/click sequence; capturing
  // the pointer on the slot retargets touch events away from those controls.
  if (e.target.closest('button, a, input, textarea, select, [data-widget-action]')) return
  e.currentTarget.setPointerCapture(e.pointerId)
  pending = { w, x: e.clientX, y: e.clientY, el: e.currentTarget }
  tapCandidate = !editing.value
  if (editing.value) return beginDrag()
  pressTimer = setTimeout(() => {
    tapCandidate = false
    editing.value = true
    beginDrag()
  }, 450)
}

function beginDrag() {
  if (!pending) return
  const { w, x, y } = pending
  // 记录被拖元素的屏幕原点，浮层从这里出发
  const rect = pending.el?.getBoundingClientRect?.()
  if (rect) Object.assign(dragOrigin, { x: rect.left, y: rect.top })
  Object.assign(drag, { uid: w.uid, startX: x, startY: y, dx: 0, dy: 0, tx: w.x, ty: w.y, page: Number(w.page) || 0, ok: true })
  // 拖动期间由文档级监听接管 pointermove / pointerup，不依赖被拖元素的 DOM 是否仍存在
  document.addEventListener('pointermove', onDocMove)
  document.addEventListener('pointerup', onDocUp)
  document.addEventListener('pointercancel', onDocUp)
}

function onDocMove(e) {
  const w = desktopWidgets.find((item) => item.uid === drag.uid)
  if (w) onPointerMove(e, w)
}

function onDocUp() {
  document.removeEventListener('pointermove', onDocMove)
  document.removeEventListener('pointerup', onDocUp)
  document.removeEventListener('pointercancel', onDocUp)
  cancelPress()
  clearEdgeTimer()
  if (drag.uid) {
    const moving = desktopWidgets.find((item) => item.uid === drag.uid)
    if (moving && drag.ok && pushAside(drag.uid, drag.tx, drag.ty, moving.w, moving.h, drag.page)) {
      moveWidget(drag.uid, drag.tx, drag.ty, drag.page)
      currentDesktopPage.value = drag.page
    }
    drag.uid = null
  }
}

function onPointerMove(e, w) {
  if (drag.uid !== w.uid) {
    // 长按等待中手指移动过多，视为普通滑动，取消长按
    if (pending && Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 8) {
      tapCandidate = false
      cancelPress()
    }
    return
  }
  drag.dx = e.clientX - drag.startX
  drag.dy = e.clientY - drag.startY
  // 拖动距离换算成格子偏移，四舍五入吸附
  drag.tx = Math.min(Math.max(w.x + Math.round(drag.dx / cell.value), 0), GRID_COLS - w.w)
  drag.ty = Math.min(Math.max(w.y + Math.round(drag.dy / cell.value), 0), GRID_ROWS - w.h)
  setEdgeDirection(edgeDirectionAt(e.clientX))
  drag.page = currentDesktopPage.value
  drag.ok = canPlace(drag.tx, drag.ty, w.w, w.h, w.uid, drag.page)
}

function onPointerUp(e, w) {
  const tapped = tapCandidate && pending && w
  tapCandidate = false
  cancelPress()
  clearEdgeTimer()
  if (tapped) onWidgetTap(w)
  if (drag.uid) {
    const moving = desktopWidgets.find((item) => item.uid === drag.uid)
    if (moving && pushAside(drag.uid, drag.tx, drag.ty, moving.w, moving.h, drag.page)) {
      moveWidget(drag.uid, drag.tx, drag.ty, drag.page)
      currentDesktopPage.value = drag.page
    }
    drag.uid = null
  }
}

function cancelPress() {
  clearTimeout(pressTimer)
  pending = null
}

// ===== 图片 / 头像设置弹窗 =====
const photoDialog = ref(null)
function onWidgetTap(w) {
  if (w.type === 'couple-day') {
    photoDialog.value = { w, field: 'startDate', title: '设置在一起的日期', eyebrow: 'OUR DAY', kind: 'date' }
  } else if (['polaroid', 'stamp', 'ig-card', 'film-strip'].includes(w.type)) {
    photoDialog.value = { w, field: 'photo', title: '设置照片', eyebrow: 'PHOTO' }
  } else if (w.type === 'music-disc') {
    photoDialog.value = { w, field: 'cover', title: '设置歌曲封面', eyebrow: 'ALBUM ART' }
  } else if (w.type === 'x-profile') {
    photoDialog.value = { w, field: 'avatar', title: '设置头像', eyebrow: 'AVATAR' }
  } else if (['profile-card', 'profile-card-clean'].includes(w.type)) {
    photoDialog.value = { w, field: 'cover', title: '更换封面图', eyebrow: 'COVER' }
  }
}
function onWidgetCustomAction(w, { key, title, eyebrow, kind }) {
  if (key === 'startDate') {
    photoDialog.value = { w, field: key, title: title || '设置在一起的日期', eyebrow: eyebrow || 'OUR DAY', kind: 'date' }
    return
  }
  photoDialog.value = { w, field: key, title: title || '设置图片', eyebrow: eyebrow || 'IMAGE', kind: kind || 'image' }
}
function savePhoto(val) {
  if (photoDialog.value) {
    const { w, field } = photoDialog.value
    updateWidgetData(w.uid, { [field]: val })
  }
  photoDialog.value = null
}

const slotStyle = (w) => ({
  gridColumn: `${w.x + 1} / span ${w.w}`,
  gridRow: `${w.y + 1} / span ${w.h}`,
  transform: drag.uid === w.uid ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.04)` : null
})

const dragging = computed(() => desktopWidgets.find((w) => w.uid === drag.uid))
// 浮层位置 = 拖动开始时记录的屏幕原点 + 手指位移，与切页无关，因此切页时不会消失
const dragOrigin = reactive({ x: 0, y: 0 })
const dragFloatX = computed(() => dragOrigin.x + drag.dx)
const dragFloatY = computed(() => dragOrigin.y + drag.dy)
</script>

<template>
  <!-- 主屏：4 × 6 正方形网格，居中显示 -->
  <section ref="areaEl" class="home-area" @pointerdown="onAreaPointerDown" @pointerup="onAreaPointerUp" @click.capture="onAreaClickCapture" @click.self="editing = false">
    <Transition :css="!dragFlipping" enter-active-class="page-slide-active" leave-active-class="page-slide-active" :enter-from-class="pageDirection > 0 ? 'page-enter-from-right' : 'page-enter-from-left'" :leave-to-class="pageDirection > 0 ? 'page-leave-to-left' : 'page-leave-to-right'">
    <div :key="currentDesktopPage" class="home-grid" :class="{ editing }" :style="gridStyle" @click.self="editing = false">
      <!-- 拖动时的落点提示 -->
<div v-if="dragging" class="drag-float" :style="{ left: `${dragFloatX}px`, top: `${dragFloatY}px`, width: `${dragging.w * cell}px`, height: `${dragging.h * cell}px` }">
  <WidgetView :type="dragging.type" :data="dragging.data" />
</div>
<div v-if="dragging" class="drop-hint" :class="{ bad: !drag.ok }" :style="{ gridColumn: `${drag.tx + 1} / span ${dragging.w}`, gridRow: `${drag.ty + 1} / span ${dragging.h}` }" />
        <div v-if="appDragging" class="drop-hint app-drop-hint" :class="{ bad: !appDrag.ok }" :style="{ gridColumn: appDrag.tx + 1, gridRow: appDrag.ty + 1 }" />

      <div
        v-for="w in visibleWidgets"
        :key="w.uid"
        class="widget-slot"
        :class="{ lifted: drag.uid === w.uid, 'drag-origin-hidden': drag.uid === w.uid }"
        :style="slotStyle(w)"
        @pointerdown="onPointerDown($event, w)"
        @pointermove="onPointerMove($event, w)"
        @pointerup="onPointerUp($event, w)"
        @pointercancel="onPointerUp"
        @contextmenu.prevent
      >
        <WidgetView :type="w.type" :data="w.data" @custom-action="onWidgetCustomAction(w, $event)" />
        <button
          v-if="editing && drag.uid !== w.uid"
          class="remove"
          aria-label="移除"
          @pointerdown.stop
          @click="removeWidget(w.uid)"
        >−</button>
      </div>

      <div
        v-for="app in visibleApps"
        :key="app.id"
        class="cell app-cell"
        :class="{ lifted: appDrag.id === app.id }"
        :style="appStyle(app, props.apps.indexOf(app))"
        @pointerdown="appDown($event, app, props.apps.indexOf(app))"
        @pointermove="appMove($event, app)"
        @pointerup="appUp(app)"
        @pointercancel="appUp(app)"
        @contextmenu.prevent
      >
        <AppIcon :app="app" frosted />
      </div>

      <div v-for="c in freeCells" :key="'c' + c.index" class="cell" :style="{ gridColumn: c.x + 1, gridRow: c.y + 1 }" @click.self="editing = false" />
    </div>
    </Transition>

      <div v-if="desktopPageCount > 1" class="page-dots" aria-label="桌面页数">
        <button v-for="page in desktopPageCount" :key="page" :class="{ on: currentDesktopPage === page - 1 }" :aria-label="`第${page}页`" @click="goToPage(page - 1)" />
      </div>
      <button v-if="editing" class="done" @click="editing = false">完成</button>

    <PhotoPickerDialog
      v-if="photoDialog"
      :model-value="photoDialog.w.data?.[photoDialog.field] || ''"
      :title="photoDialog.title"
      :eyebrow="photoDialog.eyebrow"
      :kind="photoDialog.kind"
      @save="savePhoto"
      @close="photoDialog = null"
    />
  </section>
</template>

<style scoped>
.home-area {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 var(--side-pad);
  touch-action: pan-y;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-template-rows: repeat(var(--rows), var(--cell));
}

.cell { display: flex; align-items: center; justify-content: center; }

/* 翻页过渡：下一页（左滑）时新页从右侧进入、旧页向左离开；上一页则反过来 */
.page-slide-active {
  transition: transform 0.36s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.36s ease;
}
.page-slide-active { position: absolute; inset: 0; }
.page-enter-from-right { transform: translateX(100%); opacity: 0.6; }
.page-enter-from-left { transform: translateX(-100%); opacity: 0.6; }
.page-leave-to-left { transform: translateX(-100%); opacity: 0.6; pointer-events: none; }
.page-leave-to-right { transform: translateX(100%); opacity: 0.6; pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .page-slide-active { transition: none; }
}

.app-cell { touch-action: none; }

/* 拖动时原位保留 DOM 但不可见，避免与浮层重影，同时保留指针事件绑定 */
.widget-slot.drag-origin-hidden { visibility: hidden; }

/* 拖动浮层：跟随手指，位于最上层，与网格分页无关 */
.drag-float {
  position: fixed;
  z-index: 1000;
  pointer-events: none;
  transform: scale(1.04);
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.15));
}
.drag-float :deep(.widget) { width: 100%; height: 100%; }
.app-cell.lifted { filter: drop-shadow(0 12px 20px rgba(0,0,0,.15)); }
.page-dots { position: absolute; bottom: 10px; left: 50%; display: flex; gap: 8px; transform: translateX(-50%); }
.page-dots button { width: 7px; height: 7px; padding: 0; border: 0; border-radius: 50%; background: rgba(60,65,70,.28); }
.page-dots button.on { background: rgba(45,50,55,.78); }

/* 小组件：铺满所占格子，四周留白与图标间距一致 */
.widget-slot {
  position: relative;
  z-index: 1;
  padding: calc(var(--cell) * 0.1);
  min-width: 0;
  min-height: 0;
  touch-action: none;
}
.editing .widget-slot {
  animation: wiggle 0.3s ease-in-out infinite alternate;
}
.widget-slot.lifted {
  z-index: 3;
  animation: none;
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.12));
}
@keyframes wiggle {
  from { rotate: -0.6deg; }
  to { rotate: 0.6deg; }
}

.drop-hint {
  margin: calc(var(--cell) * 0.1);
  border-radius: 22px;
  border: 1.5px dashed #cfcfcf;
  background: rgba(0, 0, 0, 0.03);
  pointer-events: none;
}
.app-drop-hint { z-index: 2; }
.drop-hint.bad {
  border-color: #8a8a8a;
  background: rgba(0, 0, 0, 0.08);
}

.remove {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: #2b2b2b;
  color: #fff;
  font-size: 16px;
  line-height: 22px;
  cursor: pointer;
}

.done {
  position: absolute;
  top: -4vh;
  right: var(--side-pad);
  z-index: 4;
  border: none;
  background: #f2f2f2;
  color: #2b2b2b;
  font-size: 13px;
  padding: 6px 16px;
  border-radius: 999px;
  cursor: pointer;
}
</style>
