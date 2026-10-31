<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import WidgetView from './widgets/WidgetView.vue'
import PhotoPickerDialog from './widgets/PhotoPickerDialog.vue'
import { GRID_COLS, GRID_ROWS } from '@/apps'
import { canPlace, desktopWidgets, moveWidget, occupiedCells, removeWidget, updateWidgetData } from '@/stores/desktop'

const props = defineProps({
  apps: { type: Array, default: () => [] }
})

// ===== 正方形网格：格子边长取「宽 / 列数」与「高 / 行数」中的较小值 =====
const areaEl = ref(null)
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

// 未被小组件占用的格子，按顺序放应用图标
const freeCells = computed(() => {
  const used = occupiedCells()
  const cells = []
  for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
    if (!used.has(i)) cells.push({ index: i, x: i % GRID_COLS, y: Math.floor(i / GRID_COLS) })
  }
  return cells
})

// ===== 编辑 / 拖动 =====
// 长按 450ms 进入编辑并开始拖动；编辑状态下按住即可直接拖
const editing = ref(false)
const drag = reactive({ uid: null, startX: 0, startY: 0, dx: 0, dy: 0, tx: 0, ty: 0, ok: true })
let pressTimer = null
let pending = null

// 本次按下是否只是轻点（未长按、未拖动、未处于编辑状态）
let tapCandidate = false

function onPointerDown(e, w) {
  e.currentTarget.setPointerCapture(e.pointerId)
  pending = { w, x: e.clientX, y: e.clientY }
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
  Object.assign(drag, { uid: w.uid, startX: x, startY: y, dx: 0, dy: 0, tx: w.x, ty: w.y, ok: true })
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
  drag.ok = canPlace(drag.tx, drag.ty, w.w, w.h, w.uid)
}

function onPointerUp(e, w) {
  const tapped = tapCandidate && pending && w
  tapCandidate = false
  cancelPress()
  if (tapped) onWidgetTap(w)
  if (drag.uid) {
    if (drag.ok) moveWidget(drag.uid, drag.tx, drag.ty)
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
function onWidgetCustomAction(w, { key, title, eyebrow }) {
  if (key === 'startDate') {
    photoDialog.value = { w, field: key, title: title || '设置在一起的日期', eyebrow: eyebrow || 'OUR DAY', kind: 'date' }
    return
  }
  photoDialog.value = { w, field: key, title: title || '设置图片', eyebrow: eyebrow || 'IMAGE' }
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
</script>

<template>
  <!-- 主屏：4 × 6 正方形网格，居中显示 -->
  <section ref="areaEl" class="home-area" @click.self="editing = false">
    <div class="home-grid" :class="{ editing }" :style="gridStyle" @click.self="editing = false">
      <!-- 拖动时的落点提示 -->
      <div
        v-if="dragging"
        class="drop-hint"
        :class="{ bad: !drag.ok }"
        :style="{ gridColumn: `${drag.tx + 1} / span ${dragging.w}`, gridRow: `${drag.ty + 1} / span ${dragging.h}` }"
      />

      <div
        v-for="w in desktopWidgets"
        :key="w.uid"
        class="widget-slot"
        :class="{ lifted: drag.uid === w.uid }"
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
        v-for="(c, i) in freeCells"
        :key="'c' + c.index"
        class="cell"
        :style="{ gridColumn: c.x + 1, gridRow: c.y + 1 }"
        @click.self="editing = false"
      >
        <AppIcon v-if="props.apps[i]" :app="props.apps[i]" />
      </div>
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
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell));
  grid-template-rows: repeat(var(--rows), var(--cell));
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

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
}
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
