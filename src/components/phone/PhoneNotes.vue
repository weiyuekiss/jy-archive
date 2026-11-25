<script setup>
// 仿 iOS 26 备忘录：列表页（大标题、搜索栏、置顶 / 其他分组卡片）+ 详情页（正文 + 底部工具栏）
// 顶栏延伸到状态栏，全屏。右上角有刷新按钮。
import { computed, ref } from 'vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  refreshing: { type: Boolean, default: false },
  ownerName: { type: String, default: '' }
})
const emit = defineEmits(['back', 'refresh'])

const openIndex = ref(-1)
const query = ref('')

const current = computed(() => props.items[openIndex.value] || null)

// 第一行作标题，其余作摘要
function titleOf(note) {
  const first = String(note.text || '').split('\n').map((l) => l.trim()).filter(Boolean)[0] || ''
  return first.slice(0, 40) || '无标题'
}
function bodyLines(note) {
  return String(note.text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(1)
}
function previewOf(note) {
  return bodyLines(note).join(' ').slice(0, 60) || '无更多内容'
}

// 搜索：按标题和正文过滤
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter((n) => String(n.text || '').toLowerCase().includes(q))
})

// 分组：置顶 / 其他（iOS 备忘录的「固定的备忘录」与「备忘录」）
const pinnedNotes = computed(() => filtered.value.filter((n) => n.pinned))
const otherNotes = computed(() => filtered.value.filter((n) => !n.pinned))

function indexOfItem(note) {
  return props.items.indexOf(note)
}

function goBack() {
  if (current.value) openIndex.value = -1
  else emit('back')
}
</script>

<template>
  <div class="nt">
    <!-- 列表页 -->
    <template v-if="!current">
      <header class="nt-top">
        <button type="button" class="nt-back" aria-label="返回桌面" @click="emit('back')">
          <PhoneIcon name="back" :size="24" />
          <span>{{ ownerName || '返回' }}</span>
        </button>
        <button type="button" class="nt-refresh" aria-label="刷新备忘录" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
          <PhoneIcon name="flip" :size="20" />
        </button>
      </header>

      <h1 class="nt-large">备忘录</h1>

      <label class="nt-search">
        <PhoneIcon name="search" :size="16" />
        <input v-model="query" type="search" placeholder="搜索" aria-label="搜索备忘录" />
      </label>

      <div class="nt-body">
        <p v-if="!items.length" class="nt-empty">还没有备忘录。点右上角刷新，让模型写出角色的备忘。</p>
        <p v-else-if="!filtered.length" class="nt-empty">没有匹配的备忘</p>

        <section v-if="pinnedNotes.length" class="nt-card-wrap">
          <p class="nt-card-label">置顶</p>
          <div class="nt-card">
            <button v-for="note in pinnedNotes" :key="indexOfItem(note)" type="button" class="nt-row" @click="openIndex = indexOfItem(note)">
              <span class="nt-row-main">
                <span class="nt-row-title">{{ titleOf(note) }}</span>
                <span class="nt-row-sub"><span class="nt-row-time">{{ note.time }}</span> {{ previewOf(note) }}</span>
              </span>
              <PhoneIcon name="chevron" :size="16" class="nt-chev" />
            </button>
          </div>
        </section>

        <section v-if="otherNotes.length" class="nt-card-wrap">
          <p class="nt-card-label">备忘录</p>
          <div class="nt-card">
            <button v-for="note in otherNotes" :key="indexOfItem(note)" type="button" class="nt-row" @click="openIndex = indexOfItem(note)">
              <span class="nt-row-main">
                <span class="nt-row-title">{{ titleOf(note) }}</span>
                <span class="nt-row-sub"><span class="nt-row-time">{{ note.time }}</span> {{ previewOf(note) }}</span>
              </span>
              <PhoneIcon name="chevron" :size="16" class="nt-chev" />
            </button>
          </div>
        </section>
      </div>

      <!-- 底部工具栏：新建 -->
      <footer class="nt-bottom">
        <span class="nt-count">{{ items.length }} 个备忘录</span>
        <button type="button" class="nt-new" aria-label="新建备忘录" disabled>
          <PhoneIcon name="pen" :size="22" />
        </button>
      </footer>
    </template>

    <!-- 详情页 -->
    <template v-else>
      <header class="nt-top">
        <button type="button" class="nt-back" aria-label="返回备忘录列表" @click="goBack">
          <PhoneIcon name="back" :size="24" />
          <span>备忘录</span>
        </button>
        <span class="nt-detail-time">{{ current.time }}</span>
      </header>

      <article class="nt-doc">
        <h2 class="nt-doc-title">{{ titleOf(current) }}</h2>
        <p class="nt-doc-body">{{ bodyLines(current).join('\n') }}</p>
      </article>

      <footer class="nt-tools" aria-label="备忘录工具栏">
        <span><PhoneIcon name="aa" :size="22" /></span>
        <span><PhoneIcon name="checklist" :size="22" /></span>
        <span><PhoneIcon name="table" :size="22" /></span>
        <span><PhoneIcon name="pen" :size="22" /></span>
        <span><PhoneIcon name="share" :size="22" /></span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
/* 全屏：顶栏延伸到状态栏，背景浅灰（iOS 26 备忘录的底色） */
.nt {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #f2f2f7;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}

/* 顶栏：返回（左）、刷新（右），延伸到状态栏 */
.nt-top {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 48px) 12px 6px 8px;
  background: transparent;
}
.nt-back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  color: #ff9500;
  font: inherit;
  font-size: 17px;
  padding: 6px 4px;
  cursor: pointer;
}
.nt-refresh {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .85);
  color: #ff9500;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}
.nt-refresh:disabled { opacity: .5; }
.nt-refresh.is-spinning svg { animation: nt-spin .9s linear infinite; }
@keyframes nt-spin { to { transform: rotate(360deg); } }
.nt-detail-time { font-size: 13px; color: #8e8e93; padding-right: 6px; }

/* 大标题 */
.nt-large {
  margin: 4px 20px 12px;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -.02em;
}

/* 搜索栏：圆角灰底 */
.nt-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 16px 14px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(118, 118, 128, .12);
  color: #8e8e93;
  box-sizing: border-box;
}
.nt-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: none;
  font: inherit;
  font-size: 16px;
  color: #000;
}
.nt-search input::placeholder { color: #8e8e93; }

/* 列表主体 */
.nt-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 120px; }
.nt-empty { margin: 30px 0; text-align: center; color: #8e8e93; font-size: 14px; line-height: 1.6; }
.nt-card-wrap { margin-bottom: 18px; }
.nt-card-label { margin: 0 4px 6px; font-size: 13px; font-weight: 600; color: #8e8e93; }
.nt-card {
  overflow: hidden;
  border-radius: 14px;
  background: #fff;
}
.nt-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border: 0;
  border-bottom: .5px solid #e5e5ea;
  background: #fff;
  color: #000;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
.nt-card .nt-row:last-child { border-bottom: 0; }
.nt-row:active { background: #e5e5ea; }
.nt-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.nt-row-title { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nt-row-sub { font-size: 13px; color: #8e8e93; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.nt-row-time { color: #8e8e93; margin-right: 4px; }
.nt-chev { color: #c7c7cc; flex: none; }

/* 列表底部工具栏：浮在底部 */
.nt-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px calc(env(safe-area-inset-bottom) + 12px);
  background: rgba(242, 242, 247, .92);
  border-top: .5px solid #d1d1d6;
}
.nt-count { font-size: 13px; color: #8e8e93; }
.nt-new {
  border: 0;
  background: none;
  color: #ff9500;
  padding: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
}
.nt-new:disabled { opacity: .5; }

/* 详情页 */
.nt-doc {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  margin: 4px 16px 0;
  padding: 16px 18px 24px;
  border-radius: 16px;
  background: #fff;
  box-sizing: border-box;
}
.nt-doc-title { margin: 0 0 12px; font-size: 22px; font-weight: 700; line-height: 1.3; }
.nt-doc-body { margin: 0; font-size: 16px; line-height: 1.7; white-space: pre-wrap; color: #1c1c1e; }
.nt-tools {
  flex: none;
  display: flex;
  justify-content: space-around;
  padding: 12px 14px calc(env(safe-area-inset-bottom) + 14px);
  background: #f2f2f7;
  border-top: .5px solid #d1d1d6;
  color: #ff9500;
}
.nt-tools span { display: grid; place-items: center; }
</style>
