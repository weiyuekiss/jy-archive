<script setup>
// 仿 iOS 26 Safari：全屏，顶栏延伸到状态栏；大标题、搜索栏、历史 / 收藏分段；
// 按日期分组的历史列表；点开是网页式详情页（地址栏胶囊 + 正文）；底部白色玻璃标签栏。右上角有刷新按钮。
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

const SEG = [
  { id: 'history', label: '历史' },
  { id: 'favorites', label: '收藏' }
]
const TABS = [
  { id: 'browse', label: '浏览', icon: 'globe' },
  { id: 'bookmarks', label: '书签', icon: 'bookmark' },
  { id: 'search', label: '搜索', icon: 'search' }
]

const seg = ref('history')
const query = ref('')
const openIndex = ref(-1)

// 网站名的图标底色，按名字稳定取色
const COLORS = ['#0a84ff', '#34c759', '#ff9500', '#ff375f', '#5e5ce6', '#30b0c7', '#8e8e93']
function colorOf(name) {
  const sum = [...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}
function initialOf(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

// 收藏用 pinned 字段表示；历史是全部记录。搜索按标题、网站名和内容过滤，保留原始下标
const matched = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => seg.value === 'history' || item.pinned)
    .filter(({ item }) => !q || `${item.title} ${item.sub} ${item.text}`.toLowerCase().includes(q))
})

function dateKeyOf(time) {
  const t = String(time || '')
  if (t.startsWith('今天')) return '今天'
  if (t.startsWith('昨天')) return '昨天'
  const m = t.match(/\d+月\d+日/)
  return m ? m[0] : '更早'
}

// 历史按浏览时间分段：今天、昨天、某月某日、更早
const groups = computed(() => {
  const map = new Map()
  for (const entry of matched.value) {
    const key = dateKeyOf(entry.item.time)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  return Array.from(map, ([name, list]) => ({ name, list }))
})

const current = computed(() => props.items[openIndex.value] || null)
const paragraphs = computed(() => String(current.value?.text || '').split(/\n+/).map((p) => p.trim()).filter(Boolean))

function goBack() {
  if (current.value) openIndex.value = -1
  else emit('back')
}
</script>
<template>
  <div class="br">
    <!-- 列表页 -->
    <template v-if="!current">
      <header class="br-top">
        <button type="button" class="br-back" aria-label="返回桌面" @click="emit('back')">
          <PhoneIcon name="back" :size="24" />
          <span>{{ ownerName || '返回' }}</span>
        </button>
        <button type="button" class="br-round" aria-label="刷新浏览记录" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
          <PhoneIcon name="flip" :size="18" />
        </button>
      </header>

      <h1 class="br-large">浏览器</h1>

      <div class="br-seg" role="tablist">
        <button v-for="s in SEG" :key="s.id" type="button" role="tab" :class="{ 'is-on': seg === s.id }" :aria-selected="seg === s.id" @click="seg = s.id">{{ s.label }}</button>
      </div>

      <label class="br-search">
        <PhoneIcon name="search" :size="16" />
        <input v-model="query" type="search" placeholder="搜索" aria-label="搜索浏览记录" />
      </label>

      <div class="br-body">
        <p v-if="!items.length" class="br-empty">还没有浏览记录。点右上角刷新，让模型按角色的生活写出他最近看过的网页。</p>
        <p v-else-if="!matched.length" class="br-empty">没有匹配的记录</p>

        <section v-for="group in groups" :key="group.name" class="br-group">
          <p class="br-group-label">{{ group.name }}</p>
          <div class="br-card">
            <button v-for="entry in group.list" :key="entry.index" type="button" class="br-row" @click="openIndex = entry.index">
              <span class="br-icon" :style="{ background: colorOf(entry.item.sub) }">{{ initialOf(entry.item.sub) }}</span>
              <span class="br-main">
                <span class="br-row-title">{{ entry.item.title }}</span>
                <span class="br-row-sub">{{ entry.item.sub }} · {{ entry.item.time }}</span>
              </span>
              <PhoneIcon name="chevron" :size="16" class="br-chev" />
            </button>
          </div>
        </section>
      </div>

      <!-- 底部：白色玻璃标签栏 -->
      <div class="br-bottom">
        <nav class="br-tabbar" aria-label="浏览器底部导航">
          <span v-for="t in TABS" :key="t.id" class="br-tab" :class="{ 'is-on': t.id === 'browse' }">
            <PhoneIcon :name="t.icon" :size="22" />
            <span>{{ t.label }}</span>
          </span>
        </nav>
      </div>
    </template>

    <!-- 详情页：网页式正文，顶部地址栏胶囊 -->
    <template v-else>
      <header class="br-detail-top">
        <button type="button" class="br-round" aria-label="返回浏览记录" @click="goBack">
          <PhoneIcon name="back" :size="18" />
        </button>
        <span class="br-url">
          <PhoneIcon name="globe" :size="14" />
          <span>{{ current.sub }}</span>
        </span>
        <span class="br-round" aria-hidden="true"><PhoneIcon name="share" :size="18" /></span>
      </header>

      <article class="br-page">
        <p class="br-meta">{{ current.time }}</p>
        <h2 class="br-page-title">{{ current.title }}</h2>
        <p v-for="(p, i) in paragraphs" :key="i" class="br-page-body">{{ p }}</p>
      </article>

      <footer class="br-toolbar">
        <span><PhoneIcon name="back" :size="22" /></span>
        <span><PhoneIcon name="chevron" :size="22" /></span>
        <span><PhoneIcon name="share" :size="22" /></span>
        <span><PhoneIcon name="bookmark" :size="22" /></span>
        <span><PhoneIcon name="folder" :size="22" /></span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
/* 全屏：浅灰底（iOS 26 Safari 列表底色），顶栏延伸到状态栏 */
.br {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #f2f2f7;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}
.br-top {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: max(env(safe-area-inset-top), 48px) 14px 4px 8px;
}
.br-back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  color: #0a84ff;
  font: inherit;
  font-size: 17px;
  padding: 6px 4px;
  cursor: pointer;
}
.br-round {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .85);
  color: #0a84ff;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}
.br-round:disabled { opacity: .5; }
.br-round.is-spinning svg { animation: br-spin .9s linear infinite; }
@keyframes br-spin { to { transform: rotate(360deg); } }

.br-large { margin: 6px 20px 12px; font-size: 34px; font-weight: 700; letter-spacing: -.02em; }

/* 分段：历史 / 收藏 */
.br-seg {
  display: flex;
  margin: 0 16px 12px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(118, 118, 128, .12);
}
.br-seg button {
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
.br-seg button.is-on { background: #fff; font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }

/* 搜索栏 */
.br-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 16px 12px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(118, 118, 128, .12);
  color: #8e8e93;
  box-sizing: border-box;
}
.br-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: inherit; font-size: 16px; color: #000; }
.br-search input::placeholder { color: #8e8e93; }

/* 列表主体 */
.br-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 130px; }
.br-empty { margin: 40px 0; text-align: center; color: #8e8e93; font-size: 14px; line-height: 1.6; }
.br-group { margin-bottom: 16px; }
.br-group-label { margin: 0 4px 6px; font-size: 13px; font-weight: 600; color: #8e8e93; }
.br-card { overflow: hidden; border-radius: 14px; background: #fff; }
.br-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border: 0;
  border-bottom: .5px solid #e5e5ea;
  background: #fff;
  color: #000;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
.br-card .br-row:last-child { border-bottom: 0; }
.br-row:active { background: #e5e5ea; }
.br-icon {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.br-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.br-row-title { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.br-row-sub { font-size: 12px; color: #8e8e93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.br-chev { color: #c7c7cc; flex: none; }

/* 底部：白色玻璃标签栏 */
.br-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 14px calc(env(safe-area-inset-bottom) + 12px);
  pointer-events: none;
}
.br-tabbar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 6px 4px;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
}
.br-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; color: #8e8e93; font-size: 11px; }
.br-tab.is-on { color: #0a84ff; }

/* 详情页：白底，地址栏胶囊 */
.br-detail-top {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: max(env(safe-area-inset-top), 48px) 14px 8px;
  background: #fff;
  border-bottom: .5px solid #e5e5ea;
}
.br-url {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 34px;
  padding: 0 12px;
  border-radius: 17px;
  background: rgba(118, 118, 128, .12);
  font-size: 14px;
  color: #000;
  overflow: hidden;
}
.br-url span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.br-page { flex: 1; min-height: 0; overflow-y: auto; padding: 18px 20px 24px; background: #fff; }
.br-meta { margin: 0 0 8px; font-size: 12px; color: #8e8e93; }
.br-page-title { margin: 0 0 14px; font-size: 22px; font-weight: 700; line-height: 1.3; }
.br-page-body { margin: 0 0 12px; font-size: 16px; line-height: 1.7; color: #1c1c1e; white-space: pre-wrap; }
.br-toolbar {
  flex: none;
  display: flex;
  justify-content: space-around;
  padding: 12px 14px calc(env(safe-area-inset-bottom) + 14px);
  background: #fff;
  border-top: .5px solid #e5e5ea;
  color: #0a84ff;
}
.br-toolbar span { display: grid; place-items: center; }
</style>

