<script setup>
// 仿 iOS 26 日历：全屏，顶栏延伸到状态栏；大标题显示年月，可左右翻月；「月 / 列表」分段；
// 月视图是 7 列日期网格，有日程的日期下方是按日历名取色的小点，点一天列出当天日程；
// 列表视图按日期从近到远分组；点开日程是详情页。底部白色玻璃标签栏，右上角有刷新按钮。
import { computed, ref } from 'vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  // 刷新中：禁用刷新按钮
  refreshing: { type: Boolean, default: false },
  // 手机主人（角色）的名字，左上角显示
  ownerName: { type: String, default: '' }
})
const emit = defineEmits(['back', 'refresh'])

const VIEWS = [
  { id: 'month', label: '月' },
  { id: 'list', label: '列表' }
]
const TABS = [
  { id: 'calendar', label: '日历', icon: 'calendar' },
  { id: 'inbox', label: '收件箱', icon: 'mail' },
  { id: 'search', label: '搜索', icon: 'search' }
]
const WEEK_HEADS = ['日', '一', '二', '三', '四', '五', '六']
// 日历颜色：按所属日历名稳定取色，接近 iOS 日历的系统色
const COLORS = ['#ff3b30', '#ff9500', '#34c759', '#007aff', '#af52de', '#ff2d55']

function pad(n) {
  return String(n).padStart(2, '0')
}
function keyOf(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const todayKey = keyOf(new Date())
function colorOf(name) {
  const sum = [...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}
// 时间排序键：全天排最前，其余取开始时间
function sortKeyOf(time) {
  const t = String(time || '')
  if (t.includes('全天')) return '00:00'
  const m = t.match(/\d{1,2}:\d{2}/)
  return m ? m[0].padStart(5, '0') : '99:99'
}
function labelOf(key) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const base = `${m}月${d}日 星期${WEEK_HEADS[date.getDay()]}`
  return key === todayKey ? `今天 · ${base}` : base
}
// 当前查看的月份（第一天）和选中的日期
const viewMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selectedKey = ref(todayKey)
const view = ref('month')
const openIndex = ref(-1)

// 事件按日期索引：key 为 YYYY-MM-DD，值为事件的原始下标列表
const byDate = computed(() => {
  const map = new Map()
  props.items.forEach((ev, index) => {
    if (!ev.date) return
    if (!map.has(ev.date)) map.set(ev.date, [])
    map.get(ev.date).push(index)
  })
  return map
})

const monthTitle = computed(() => `${viewMonth.value.getFullYear()}年${viewMonth.value.getMonth() + 1}月`)

// 月视图格子：前面用 null 补齐到星期日开头
const cells = computed(() => {
  const first = viewMonth.value.getDay()
  const year = viewMonth.value.getFullYear()
  const month = viewMonth.value.getMonth()
  const days = new Date(year, month + 1, 0).getDate()
  const list = Array.from({ length: first }, () => null)
  for (let d = 1; d <= days; d += 1) {
    const key = keyOf(new Date(year, month, d))
    list.push({ day: d, key, dots: dotsOf(key), isToday: key === todayKey, isSelected: key === selectedKey.value })
  }
  // 补齐到整行（6 行以内）
  while (list.length % 7) list.push(null)
  return list
})

// 每天最多显示 3 个点，颜色取所属日历
function dotsOf(key) {
  const indexes = byDate.value.get(key) || []
  return indexes.slice(0, 3).map((i) => colorOf(props.items[i].calendar))
}

// 选中日期当天的日程
const dayEvents = computed(() => {
  const indexes = byDate.value.get(selectedKey.value) || []
  return indexes
    .map((index) => ({ ev: props.items[index], index }))
    .sort((a, b) => sortKeyOf(a.ev.time).localeCompare(sortKeyOf(b.ev.time)))
})

// 列表视图：按日期分组，从近到远
const listGroups = computed(() => {
  const keys = Array.from(byDate.value.keys()).sort()
  return keys.map((key) => ({
    key,
    label: labelOf(key),
    list: (byDate.value.get(key) || []).map((index) => ({ ev: props.items[index], index }))
  }))
})

const undated = computed(() => props.items
  .map((ev, index) => ({ ev, index }))
  .filter(({ ev }) => !ev.date))

const current = computed(() => props.items[openIndex.value] || null)
const selectedLabel = computed(() => labelOf(selectedKey.value))

function shiftMonth(step) {
  const d = viewMonth.value
  viewMonth.value = new Date(d.getFullYear(), d.getMonth() + step, 1)
}

function goToday() {
  const now = new Date()
  viewMonth.value = new Date(now.getFullYear(), now.getMonth(), 1)
  selectedKey.value = todayKey
}

function pickDay(cell) {
  if (!cell) return
  selectedKey.value = cell.key
}

function goBack() {
  if (current.value) openIndex.value = -1
  else emit('back')
}
</script>

<template>
  <div class="cal">
    <!-- 列表页 -->
    <template v-if="!current">
      <header class="cal-top">
        <button type="button" class="cal-back" aria-label="返回桌面" @click="emit('back')">
          <PhoneIcon name="back" :size="24" />
          <span>{{ ownerName || '返回' }}</span>
        </button>
        <div class="cal-top-right">
          <button type="button" class="cal-round" aria-label="刷新日程" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
            <PhoneIcon name="flip" :size="18" />
          </button>
          <button type="button" class="cal-round" aria-label="回到今天" @click="goToday">
            <span class="cal-today-num">{{ new Date().getDate() }}</span>
          </button>
        </div>
      </header>

      <div class="cal-title-row">
        <h1 class="cal-large">{{ monthTitle }}</h1>
        <div class="cal-month-nav">
          <button type="button" class="cal-nav-btn" aria-label="上个月" @click="shiftMonth(-1)"><PhoneIcon name="back" :size="16" /></button>
          <button type="button" class="cal-nav-btn" aria-label="下个月" @click="shiftMonth(1)"><PhoneIcon name="chevron" :size="16" /></button>
        </div>
      </div>

      <div class="cal-seg" role="tablist">
        <button v-for="v in VIEWS" :key="v.id" type="button" role="tab" :class="{ 'is-on': view === v.id }" :aria-selected="view === v.id" @click="view = v.id">{{ v.label }}</button>
      </div>

      <div class="cal-body">
        <p v-if="!items.length" class="cal-empty">还没有日程。点右上角刷新，让模型按角色的生活写出他这段时间的安排。</p>

        <!-- 月视图 -->
        <template v-else-if="view === 'month'">
          <div class="cal-weekhead">
            <span v-for="h in WEEK_HEADS" :key="h">{{ h }}</span>
          </div>
          <div class="cal-grid">
            <button
              v-for="(cell, i) in cells"
              :key="i"
              type="button"
              class="cal-cell"
              :class="{ 'is-today': cell?.isToday, 'is-selected': cell?.isSelected, 'is-empty': !cell }"
              :disabled="!cell"
              @click="pickDay(cell)"
            >
              <template v-if="cell">
                <span class="cal-day-num">{{ cell.day }}</span>
                <span class="cal-dots">
                  <span v-for="(c, di) in cell.dots" :key="di" class="cal-dot" :style="{ background: c }"></span>
                </span>
              </template>
            </button>
          </div>

          <div class="cal-day-head">{{ selectedLabel }}</div>
          <div v-if="!dayEvents.length" class="cal-free">这一天没有日程</div>
          <div v-else class="cal-card">
            <button v-for="entry in dayEvents" :key="entry.index" type="button" class="cal-row" @click="openIndex = entry.index">
              <span class="cal-bar" :style="{ background: colorOf(entry.ev.calendar) }"></span>
              <span class="cal-main">
                <span class="cal-row-title">{{ entry.ev.title }}</span>
                <span class="cal-row-sub">{{ entry.ev.time }}<template v-if="entry.ev.sub"> · {{ entry.ev.sub }}</template></span>
              </span>
              <PhoneIcon name="chevron" :size="16" class="cal-chev" />
            </button>
          </div>
        </template>

        <!-- 列表视图：按日期从近到远 -->
        <template v-else>
          <section v-for="group in listGroups" :key="group.key" class="cal-group">
            <p class="cal-group-label">{{ group.label }}</p>
            <div class="cal-card">
              <button v-for="entry in group.list" :key="entry.index" type="button" class="cal-row" @click="openIndex = entry.index">
                <span class="cal-bar" :style="{ background: colorOf(entry.ev.calendar) }"></span>
                <span class="cal-main">
                  <span class="cal-row-title">{{ entry.ev.title }}</span>
                  <span class="cal-row-sub">{{ entry.ev.time }}<template v-if="entry.ev.sub"> · {{ entry.ev.sub }}</template></span>
                </span>
                <PhoneIcon name="chevron" :size="16" class="cal-chev" />
              </button>
            </div>
          </section>
          <section v-if="undated.length" class="cal-group">
            <p class="cal-group-label">没有日期</p>
            <div class="cal-card">
              <button v-for="entry in undated" :key="entry.index" type="button" class="cal-row" @click="openIndex = entry.index">
                <span class="cal-bar" :style="{ background: colorOf(entry.ev.calendar) }"></span>
                <span class="cal-main">
                  <span class="cal-row-title">{{ entry.ev.title }}</span>
                  <span class="cal-row-sub">{{ entry.ev.time }}</span>
                </span>
                <PhoneIcon name="chevron" :size="16" class="cal-chev" />
              </button>
            </div>
          </section>
        </template>
      </div>

      <!-- 底部：白色玻璃标签栏 -->
      <div class="cal-bottom">
        <nav class="cal-tabbar" aria-label="日历底部导航">
          <span v-for="t in TABS" :key="t.id" class="cal-tab" :class="{ 'is-on': t.id === 'calendar' }">
            <PhoneIcon :name="t.icon" :size="22" />
            <span>{{ t.label }}</span>
          </span>
        </nav>
      </div>
    </template>

    <!-- 详情页 -->
    <template v-else>
      <header class="cal-detail-top">
        <button type="button" class="cal-back" aria-label="返回日历" @click="goBack">
          <PhoneIcon name="back" :size="24" />
          <span>日历</span>
        </button>
      </header>
      <article class="cal-detail">
        <span class="cal-detail-bar" :style="{ background: colorOf(current.calendar) }"></span>
        <h2 class="cal-detail-title">{{ current.title }}</h2>
        <p class="cal-detail-row"><b>日期</b><span>{{ current.date ? labelOf(current.date) : '未设日期' }}</span></p>
        <p class="cal-detail-row"><b>时间</b><span>{{ current.time }}</span></p>
        <p v-if="current.sub" class="cal-detail-row"><b>地点</b><span>{{ current.sub }}</span></p>
        <p v-if="current.calendar" class="cal-detail-row"><b>日历</b><span>{{ current.calendar }}</span></p>
        <p v-if="current.text" class="cal-detail-note">{{ current.text }}</p>
      </article>
    </template>
  </div>
</template>

<style scoped>
/* 全屏：浅灰底（iOS 26 日历底色），顶栏延伸到状态栏 */
.cal {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #f2f2f7;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}
.cal-top {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: max(env(safe-area-inset-top), 48px) 14px 4px 8px;
}
.cal-back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  color: #ff3b30;
  font: inherit;
  font-size: 17px;
  padding: 6px 4px;
  cursor: pointer;
}
.cal-top-right { display: flex; gap: 10px; }
.cal-round {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .85);
  color: #ff3b30;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}
.cal-round:disabled { opacity: .5; }
.cal-round.is-spinning svg { animation: cal-spin .9s linear infinite; }
@keyframes cal-spin { to { transform: rotate(360deg); } }
.cal-today-num { font-size: 15px; font-weight: 700; color: #ff3b30; }

/* 大标题与月份切换 */
.cal-title-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 20px 0 20px; }
.cal-large { margin: 6px 0 10px; font-size: 30px; font-weight: 700; letter-spacing: -.02em; }
.cal-month-nav { display: flex; gap: 8px; }
.cal-nav-btn {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: #ff3b30;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}

/* 分段：月 / 列表 */
.cal-seg {
  display: flex;
  margin: 0 16px 10px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(118, 118, 128, .12);
}
.cal-seg button {
  flex: 1;
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: #000;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.cal-seg button.is-on { background: #fff; font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }

.cal-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 130px; }
.cal-empty { margin: 40px 0; text-align: center; color: #8e8e93; font-size: 14px; line-height: 1.6; }

/* 月视图 */
.cal-weekhead { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 12px; color: #8e8e93; margin-bottom: 4px; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); row-gap: 4px; }
.cal-cell {
  height: 46px;
  border: 0;
  background: none;
  color: #000;
  font: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 3px;
  padding: 4px 0 0;
  cursor: pointer;
  border-radius: 10px;
}
.cal-cell.is-empty { cursor: default; }
.cal-day-num {
  width: 30px;
  height: 30px;
  line-height: 30px;
  border-radius: 50%;
  text-align: center;
  font-size: 16px;
}
.cal-cell.is-today .cal-day-num { background: #ff3b30; color: #fff; font-weight: 600; }
.cal-cell.is-selected:not(.is-today) .cal-day-num { background: rgba(255, 59, 48, .14); color: #ff3b30; font-weight: 600; }
.cal-dots { display: flex; gap: 3px; height: 5px; }
.cal-dot { width: 5px; height: 5px; border-radius: 50%; }

/* 选中日的标题与日程卡片 */
.cal-day-head { margin: 14px 4px 8px; font-size: 13px; font-weight: 600; color: #8e8e93; }
.cal-free { margin: 6px 4px; font-size: 14px; color: #8e8e93; }
.cal-card { overflow: hidden; border-radius: 14px; background: #fff; }
.cal-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px 11px 0;
  border: 0;
  border-bottom: .5px solid #e5e5ea;
  background: #fff;
  color: #000;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
.cal-card .cal-row:last-child { border-bottom: 0; }
.cal-row:active { background: #e5e5ea; }
.cal-bar { flex: none; width: 4px; align-self: stretch; margin-left: 12px; border-radius: 2px; }
.cal-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cal-row-title { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-row-sub { font-size: 12px; color: #8e8e93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cal-chev { color: #c7c7cc; flex: none; }

/* 列表视图分组 */
.cal-group { margin-bottom: 16px; }
.cal-group-label { margin: 0 4px 6px; font-size: 13px; font-weight: 600; color: #8e8e93; }

/* 底部：白色玻璃标签栏 */
.cal-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 14px calc(env(safe-area-inset-bottom) + 12px);
  pointer-events: none;
}
.cal-tabbar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 6px 4px;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
}
.cal-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; color: #8e8e93; font-size: 11px; }
.cal-tab.is-on { color: #ff3b30; }

/* 详情页 */
.cal-detail-top { flex: none; padding: max(env(safe-area-inset-top), 48px) 14px 4px 8px; background: #f2f2f7; }
.cal-detail { flex: 1; min-height: 0; overflow-y: auto; margin: 6px 16px 0; padding: 18px 18px 24px; border-radius: 14px; background: #fff; position: relative; }
.cal-detail-bar { display: block; width: 36px; height: 5px; border-radius: 3px; margin-bottom: 14px; }
.cal-detail-title { margin: 0 0 14px; font-size: 24px; font-weight: 700; line-height: 1.25; }
.cal-detail-row { margin: 0 0 12px; display: flex; gap: 12px; font-size: 15px; }
.cal-detail-row b { flex: none; width: 36px; font-weight: 500; color: #8e8e93; }
.cal-detail-row span { flex: 1; min-width: 0; color: #000; }
.cal-detail-note { margin: 14px 0 0; padding-top: 14px; border-top: .5px solid #e5e5ea; font-size: 15px; line-height: 1.6; color: #1c1c1e; white-space: pre-wrap; }
</style>

