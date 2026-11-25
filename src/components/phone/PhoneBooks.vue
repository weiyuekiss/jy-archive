<script setup>
// 仿 iOS 26 图书（Apple Books）：全屏，顶栏延伸到状态栏；大标题「资料库」；「在读 / 已读完」分段；
// 书架网格，封面是渐变加书名，在读的书显示进度条；点开是详情页：封面、作者、进度、简介，
// 下面是「书摘与想法」，每条书摘是黄色竖线引文，下面是他的评语。底部白色玻璃标签栏，右上角有刷新。
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
  { id: 'reading', label: '在读' },
  { id: 'finished', label: '已读完' }
]
const TABS = [
  { id: 'library', label: '资料库', icon: 'books' },
  { id: 'bookmark', label: '书签', icon: 'bookmark' },
  { id: 'search', label: '搜索', icon: 'search' }
]
// 封面渐变：书名稳定取色，都是接近常见书籍封面的深色调
const COVERS = [
  ['#5b4636', '#8c6d54'],
  ['#2f4858', '#5b7f95'],
  ['#6b2d3a', '#a2535f'],
  ['#3d5a3a', '#6f8f5f'],
  ['#44446b', '#7474a6'],
  ['#7a5c1e', '#b08a3a'],
  ['#2e3b4e', '#56708c'],
  ['#4b3f72', '#8170b0']
]
function coverOf(name) {
  const sum = [...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0)
  const [a, b] = COVERS[sum % COVERS.length]
  return `linear-gradient(160deg, ${a}, ${b})`
}

const seg = ref('reading')
const openIndex = ref(-1)
const current = computed(() => props.items[openIndex.value] || null)
const excerpts = computed(() => (Array.isArray(current.value?.excerpts) ? current.value.excerpts : []))

// 按「在读 / 已读完」过滤，保留原始下标
const filtered = computed(() => props.items
  .map((book, index) => ({ book, index }))
  .filter(({ book }) => (seg.value === 'finished' ? book.finished : !book.finished)))

function statusText(book) {
  return book.finished ? '已读完' : `在读 · ${book.progress}%`
}

function goBack() {
  if (current.value) openIndex.value = -1
  else emit('back')
}
</script>

<template>
  <div class="bk">
    <!-- 书架页 -->
    <template v-if="!current">
      <header class="bk-top">
        <button type="button" class="bk-back" aria-label="返回桌面" @click="emit('back')">
          <PhoneIcon name="back" :size="24" />
          <span>{{ ownerName || '返回' }}</span>
        </button>
        <button type="button" class="bk-round" aria-label="刷新书架" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
          <PhoneIcon name="flip" :size="18" />
        </button>
      </header>

      <h1 class="bk-large">资料库</h1>

      <div class="bk-seg" role="tablist">
        <button v-for="s in SEG" :key="s.id" type="button" role="tab" :class="{ 'is-on': seg === s.id }" :aria-selected="seg === s.id" @click="seg = s.id">{{ s.label }}</button>
      </div>

      <div class="bk-body">
        <p v-if="!items.length" class="bk-empty">书架是空的。点右上角刷新，让模型按角色的生活写出他最近在读的书和书摘。</p>
        <p v-else-if="!filtered.length" class="bk-empty">{{ seg === 'finished' ? '还没有读完的书' : '没有在读的书' }}</p>

        <div v-else class="bk-grid">
          <button v-for="entry in filtered" :key="entry.index" type="button" class="bk-item" @click="openIndex = entry.index">
            <span class="bk-cover" :style="{ background: coverOf(entry.book.title) }">
              <span class="bk-cover-title">{{ entry.book.title }}</span>
            </span>
            <span class="bk-item-title">{{ entry.book.title }}</span>
            <span class="bk-item-sub">{{ entry.book.sub }}</span>
            <span class="bk-item-status" :class="{ 'is-done': entry.book.finished }">{{ statusText(entry.book) }}</span>
            <span v-if="!entry.book.finished" class="bk-progress"><span :style="{ width: entry.book.progress + '%' }"></span></span>
          </button>
        </div>
      </div>

      <!-- 底部：白色玻璃标签栏 -->
      <div class="bk-bottom">
        <nav class="bk-tabbar" aria-label="书架底部导航">
          <span v-for="t in TABS" :key="t.id" class="bk-tab" :class="{ 'is-on': t.id === 'library' }">
            <PhoneIcon :name="t.icon" :size="22" />
            <span>{{ t.label }}</span>
          </span>
        </nav>
      </div>
    </template>

    <!-- 详情页：封面、进度、简介，下面是书摘与想法 -->
    <template v-else>
      <header class="bk-detail-top">
        <button type="button" class="bk-back" aria-label="返回书架" @click="goBack">
          <PhoneIcon name="back" :size="24" />
          <span>资料库</span>
        </button>
      </header>

      <div class="bk-detail">
        <div class="bk-hero">
          <span class="bk-hero-cover" :style="{ background: coverOf(current.title) }">
            <span class="bk-cover-title">{{ current.title }}</span>
          </span>
          <div class="bk-hero-text">
            <h2 class="bk-hero-title">{{ current.title }}</h2>
            <p class="bk-hero-sub">{{ current.sub }}</p>
            <p class="bk-hero-status" :class="{ 'is-done': current.finished }">{{ statusText(current) }}</p>
            <span v-if="!current.finished" class="bk-progress bk-progress-lg"><span :style="{ width: current.progress + '%' }"></span></span>
          </div>
        </div>

        <p v-if="current.text" class="bk-intro">{{ current.text }}</p>

        <h3 class="bk-section">书摘与想法</h3>
        <p v-if="!excerpts.length" class="bk-empty bk-empty-left">还没有划线。</p>
        <div v-for="(ex, i) in excerpts" :key="i" class="bk-note">
          <p v-if="ex.chapter" class="bk-chapter">{{ ex.chapter }}</p>
          <blockquote class="bk-quote">{{ ex.quote }}</blockquote>
          <p v-if="ex.comment" class="bk-comment">{{ ex.comment }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 全屏：浅灰底（iOS 26 图书资料库页底色），顶栏延伸到状态栏 */
.bk {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #f2f2f7;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}
.bk-top {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: max(env(safe-area-inset-top), 48px) 14px 4px 8px;
}
.bk-back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  color: #ff9f0a;
  font: inherit;
  font-size: 17px;
  padding: 6px 4px;
  cursor: pointer;
}
.bk-round {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .85);
  color: #ff9f0a;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}
.bk-round:disabled { opacity: .5; }
.bk-round.is-spinning svg { animation: bk-spin .9s linear infinite; }
@keyframes bk-spin { to { transform: rotate(360deg); } }

.bk-large { margin: 6px 20px 12px; font-size: 34px; font-weight: 700; letter-spacing: -.02em; }

/* 分段：在读 / 已读完 */
.bk-seg {
  display: flex;
  margin: 0 16px 12px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(118, 118, 128, .12);
}
.bk-seg button {
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
.bk-seg button.is-on { background: #fff; font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }

.bk-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 18px 130px; }
.bk-empty { margin: 40px 0; text-align: center; color: #8e8e93; font-size: 14px; line-height: 1.6; }
.bk-empty-left { text-align: left; margin: 12px 0; }

/* 书架网格：两列封面 */
.bk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 16px; }
.bk-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; border: 0; background: none; padding: 0; font: inherit; text-align: left; cursor: pointer; min-width: 0; color: #000; }
.bk-cover {
  display: flex;
  align-items: flex-end;
  width: 100%;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  padding: 12px;
  box-sizing: border-box;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .18), inset 0 0 0 .5px rgba(255, 255, 255, .15);
  overflow: hidden;
}
.bk-cover-title { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.3; text-shadow: 0 1px 4px rgba(0, 0, 0, .4); overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.bk-item-title { margin-top: 8px; font-size: 14px; font-weight: 600; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-item-sub { font-size: 12px; color: #8e8e93; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-item-status { font-size: 12px; color: #ff9f0a; margin-top: 2px; }
.bk-item-status.is-done { color: #34c759; }

/* 阅读进度条 */
.bk-progress { display: block; width: 100%; height: 3px; margin-top: 4px; border-radius: 2px; background: rgba(118, 118, 128, .2); overflow: hidden; }
.bk-progress > span { display: block; height: 100%; background: #ff9f0a; border-radius: 2px; }
.bk-progress-lg { width: 180px; height: 4px; margin-top: 10px; }

/* 底部：白色玻璃标签栏 */
.bk-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 14px calc(env(safe-area-inset-bottom) + 12px);
  pointer-events: none;
}
.bk-tabbar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 6px 4px;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
}
.bk-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 0; color: #8e8e93; font-size: 11px; }
.bk-tab.is-on { color: #ff9f0a; }

/* 详情页 */
.bk-detail-top { flex: none; padding: max(env(safe-area-inset-top), 48px) 14px 4px 8px; background: #f2f2f7; }
.bk-detail { flex: 1; min-height: 0; overflow-y: auto; padding: 8px 20px 40px; }
.bk-hero { display: flex; gap: 16px; align-items: flex-end; }
.bk-hero-cover {
  flex: none;
  width: 110px;
  aspect-ratio: 2 / 3;
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  padding: 10px;
  box-sizing: border-box;
  box-shadow: 0 8px 20px rgba(0, 0, 0, .22);
  overflow: hidden;
}
.bk-hero-cover .bk-cover-title { font-size: 13px; }
.bk-hero-text { flex: 1; min-width: 0; padding-bottom: 4px; }
.bk-hero-title { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.25; }
.bk-hero-sub { margin: 4px 0 0; font-size: 15px; color: #8e8e93; }
.bk-hero-status { margin: 8px 0 0; font-size: 13px; color: #ff9f0a; }
.bk-hero-status.is-done { color: #34c759; }
.bk-intro { margin: 18px 0 0; font-size: 15px; line-height: 1.6; color: #1c1c1e; }
.bk-section { margin: 26px 0 10px; font-size: 17px; font-weight: 700; }

/* 书摘与想法：黄色竖线引文，下面是评语 */
.bk-note { margin-bottom: 14px; padding: 14px 16px; border-radius: 14px; background: #fff; }
.bk-chapter { margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #8e8e93; }
.bk-quote {
  margin: 0;
  padding: 2px 0 2px 12px;
  border-left: 3px solid #ffcc00;
  font-size: 15px;
  line-height: 1.65;
  color: #000;
}
.bk-comment { margin: 10px 0 0; font-size: 14px; line-height: 1.6; color: #3c3c43; white-space: pre-wrap; }
</style>


