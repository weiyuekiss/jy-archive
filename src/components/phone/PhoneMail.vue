<script setup>
// 仿 Outlook iOS：蓝色顶栏延伸到状态栏，「重点 / 其他」分段，按日期分组的收件箱列表；详情页是正文 + 操作条
import { computed, ref } from 'vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  // 刷新中：禁用刷新按钮
  refreshing: { type: Boolean, default: false },
  // 手机主人（角色）的名字，显示在顶栏右上角
  ownerName: { type: String, default: '' }
})
const emit = defineEmits(['back', 'refresh'])

const tab = ref('focused') // 'focused' 重点；'other' 其他
const openIndex = ref(-1)

// 发件人圆形头像颜色（与 Outlook 配色接近，按名字稳定取色）
const COLORS = ['#a06cd5', '#b5735c', '#d96bab', '#4a90d9', '#5aa86b', '#d9a441']
function colorOf(name) {
  const sum = [...String(name || '')].reduce((s, c) => s + c.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}
function initialOf(name) {
  return String(name || '?').trim().slice(0, 1).toUpperCase()
}

// 列表：重点邮件或其他邮件，按 items 原顺序
const focusedMails = computed(() => props.items.filter((m) => m.important))
const otherMails = computed(() => props.items.filter((m) => !m.important))
const shown = computed(() => (tab.value === 'focused' ? focusedMails.value : otherMails.value))
const unreadOther = computed(() => otherMails.value.filter((m) => m.unread).length)

// 日期分组：用 time 字段的前缀作为组名（如「今天」「昨天」「9月26日」）
const groups = computed(() => {
  const map = new Map()
  for (const mail of shown.value) {
    const key = groupKeyOf(mail.time)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(mail)
  }
  return Array.from(map, ([name, list]) => ({ name, list }))
})
function groupKeyOf(time) {
  const t = String(time || '')
  if (t.startsWith('今天')) return '今天'
  if (t.startsWith('昨天')) return '昨天'
  const m = t.match(/\d+月\d+日/)
  return m ? m[0] : '更早'
}

const current = computed(() => props.items[openIndex.value] || null)

function preview(mail) {
  const first = String(mail.text || '').split('\n').map((l) => l.trim()).filter(Boolean)[0] || ''
  return first.slice(0, 60)
}

function goBack() {
  if (current.value) openIndex.value = -1
  else emit('back')
}

// 详情页里 text 的段落：用空行分段
const paragraphs = computed(() => String(current.value?.text || '').split(/\n+/).map((p) => p.trim()).filter(Boolean))
</script>

<template>
  <div class="ol">
    <!-- 列表页 -->
    <template v-if="!current">
      <header class="ol-top">
        <div class="ol-top-row">
          <button type="button" class="ol-title-btn" aria-label="返回桌面" @click="emit('back')">
            <h1 class="ol-title">收件箱</h1>
          </button>
          <span class="ol-owner">{{ ownerName || '我' }}</span>
          <div class="ol-top-icons">
            <button type="button" class="ol-icon-btn" aria-label="刷新邮件" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
              <PhoneIcon name="flip" :size="20" />
            </button>
            <button type="button" class="ol-icon-btn" aria-label="搜索">
              <PhoneIcon name="search" :size="20" />
            </button>
          </div>
        </div>
        <div class="ol-seg-row">
          <div class="ol-seg" role="tablist">
            <button type="button" role="tab" :class="{ 'is-on': tab === 'focused' }" :aria-selected="tab === 'focused'" @click="tab = 'focused'">重点</button>
            <button type="button" role="tab" :class="{ 'is-on': tab === 'other' }" :aria-selected="tab === 'other'" @click="tab = 'other'">其他</button>
          </div>
          <span class="ol-filter">筛选器</span>
        </div>
      </header>

      <div class="ol-body">
        <div v-if="tab === 'focused' && otherMails.length" class="ol-other-row">
          <span class="ol-other-icon"><PhoneIcon name="mail" :size="18" /></span>
          <span class="ol-other-main">
            <span class="ol-other-title">其他电子邮件</span>
            <span class="ol-other-sub">{{ otherMails.slice(0, 4).map((m) => m.sub).join('、') }}</span>
          </span>
          <span v-if="unreadOther" class="ol-badge">{{ unreadOther }}</span>
        </div>

        <p v-if="!shown.length" class="ol-empty">{{ tab === 'focused' ? '没有重点邮件' : '其他邮件为空' }}</p>

        <template v-for="group in groups" :key="group.name">
          <p class="ol-group">{{ group.name }}</p>
          <button v-for="mail in group.list" :key="items.indexOf(mail)" type="button" class="ol-row" @click="openIndex = items.indexOf(mail)">
            <span class="ol-dot-wrap">
              <span v-if="mail.unread" class="ol-unread"></span>
            </span>
            <span class="ol-ava" :style="{ background: colorOf(mail.sub) }">{{ initialOf(mail.sub) }}</span>
            <span class="ol-main">
              <span class="ol-line">
                <span class="ol-from">{{ mail.sub }}</span>
                <span class="ol-time">{{ mail.time }}</span>
              </span>
              <span class="ol-subject" :class="{ 'is-unread': mail.unread }">{{ mail.title }}</span>
              <span class="ol-prev">{{ preview(mail) }}</span>
            </span>
          </button>
        </template>
      </div>

      <!-- 底部标签栏：沿用白色样式 -->
      <nav class="ol-tabs" aria-label="底部导航">
        <span class="ol-tab is-on">
          <PhoneIcon name="mail" :size="24" />
          <span>邮件</span>
        </span>
        <span class="ol-tab">
          <PhoneIcon name="calendar" :size="24" />
          <span>日历</span>
        </span>
        <span class="ol-tab">
          <PhoneIcon name="folder" :size="24" />
          <span>应用</span>
        </span>
      </nav>
    </template>

    <!-- 详情页 -->
    <template v-else>
      <header class="ol-detail-top">
        <button type="button" class="ol-back" aria-label="返回收件箱" @click="goBack">
          <PhoneIcon name="back" :size="22" />
        </button>
      </header>

      <div class="ol-subject-bar">{{ current.title }}</div>

      <div class="ol-detail-body">
        <div class="ol-meta">
          <span class="ol-ava ol-ava-lg" :style="{ background: colorOf(current.sub) }">{{ initialOf(current.sub) }}</span>
          <span class="ol-meta-text">
            <b>{{ current.sub }}</b>
            <small>收件人 你自己</small>
          </span>
          <span class="ol-meta-right">
            <span class="ol-meta-time">{{ current.time }}</span>
            <span class="ol-meta-more">···</span>
          </span>
        </div>
        <div class="ol-text">
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </div>
      </div>

      <!-- 详情操作条：浮在标签栏上方 -->
      <div class="ol-actions">
        <span class="ol-action-reply">
          <PhoneIcon name="undo" :size="20" />
          <span>答复</span>
        </span>
        <span class="ol-action"><PhoneIcon name="mail" :size="22" /></span>
        <span class="ol-action"><PhoneIcon name="trash" :size="22" /></span>
        <span class="ol-action"><PhoneIcon name="folder" :size="22" /></span>
        <span class="ol-action"><PhoneIcon name="dots" :size="22" /></span>
      </div>

      <nav class="ol-tabs" aria-label="底部导航">
        <span class="ol-tab is-on">
          <PhoneIcon name="mail" :size="24" />
          <span>邮件</span>
        </span>
        <span class="ol-tab">
          <PhoneIcon name="calendar" :size="24" />
          <span>日历</span>
        </span>
        <span class="ol-tab">
          <PhoneIcon name="folder" :size="24" />
          <span>应用</span>
        </span>
      </nav>
    </template>
  </div>
</template>

<style scoped>
.ol {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #1b1b1b;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}

/* 列表顶栏：蓝色，延伸到状态栏 */
.ol-top {
  flex: none;
  background: #2f6fbf;
  padding: max(env(safe-area-inset-top), 48px) 14px 12px;
  color: #fff;
}
.ol-top-row { display: flex; align-items: center; gap: 10px; }
.ol-title-btn {
  flex: 1;
  min-width: 0;
  border: 0;
  padding: 0;
  background: none;
  color: #fff;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.ol-title-btn:active { opacity: .7; }
.ol-title { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -.01em; }
.ol-owner {
  flex: none;
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}
.ol-top-icons { display: flex; align-items: center; gap: 4px; }
.ol-icon-btn {
  width: 36px;
  height: 36px;
  border: 0;
  background: none;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
}
.ol-icon-btn:disabled { opacity: .5; }
.ol-icon-btn.is-spinning svg { animation: ol-spin .9s linear infinite; }
@keyframes ol-spin { to { transform: rotate(360deg); } }

.ol-seg-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.ol-seg {
  display: flex;
  padding: 2px;
  border-radius: 16px;
  background: rgba(0, 0, 0, .28);
}
.ol-seg button {
  min-width: 64px;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 14px;
  background: none;
  color: #fff;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.ol-seg button.is-on { background: #fff; color: #2f6fbf; font-weight: 600; }
.ol-filter { color: #fff; font-size: 14px; }

/* 列表主体 */
.ol-body { flex: 1; min-height: 0; overflow-y: auto; padding-bottom: 8px; }
.ol-other-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: .5px solid #e5e5ea;
}
.ol-other-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f0f0f2;
  display: grid;
  place-items: center;
  color: #6e6e73;
}
.ol-other-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ol-other-title { font-size: 15px; font-weight: 600; }
.ol-other-sub { font-size: 13px; color: #8e8e93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ol-badge {
  flex: none;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: #dce8f8;
  color: #2f6fbf;
  font-size: 12px;
  font-weight: 600;
  display: grid;
  place-items: center;
  box-sizing: border-box;
}
.ol-empty { margin: 30px 0; text-align: center; color: #8e8e93; font-size: 14px; }
.ol-group { margin: 14px 14px 6px; font-size: 13px; color: #8e8e93; }
.ol-row {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px 12px 4px;
  border: 0;
  border-bottom: .5px solid #efeff2;
  background: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
.ol-dot-wrap { flex: none; width: 10px; padding-top: 16px; display: flex; justify-content: center; }
.ol-unread { width: 8px; height: 8px; border-radius: 50%; background: #2f6fbf; }
.ol-ava {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}
.ol-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ol-line { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.ol-from { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ol-time { flex: none; font-size: 12px; color: #8e8e93; }
.ol-subject { font-size: 14px; color: #3c3c43; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ol-subject.is-unread { font-weight: 600; color: #1b1b1b; }
.ol-prev { font-size: 13px; color: #8e8e93; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* 底部标签栏：白色样式，沿用截图 */
.ol-tabs {
  flex: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 8px 0 calc(env(safe-area-inset-bottom) + 10px);
  background: #fff;
  border-top: .5px solid #e5e5ea;
}
.ol-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #6e6e73;
  font-size: 11px;
}
.ol-tab.is-on { color: #2f6fbf; }

/* 详情页：顶栏白底，延伸到状态栏 */
.ol-detail-top {
  flex: none;
  padding: max(env(safe-area-inset-top), 48px) 12px 6px;
  background: #fff;
}
.ol-back { border: 0; background: none; color: #6e6e73; padding: 4px; cursor: pointer; display: grid; place-items: center; }
.ol-subject-bar {
  flex: none;
  padding: 12px 16px;
  background: #f7f7f8;
  border-bottom: .5px solid #e5e5ea;
  font-size: 17px;
  font-weight: 600;
}
.ol-detail-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 16px; }
.ol-meta { display: flex; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: .5px solid #efeff2; }
.ol-ava-lg { width: 44px; height: 44px; font-size: 18px; }
.ol-meta-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
.ol-meta-text b { font-size: 16px; }
.ol-meta-text small { color: #8e8e93; font-size: 12px; }
.ol-meta-right { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.ol-meta-time { font-size: 12px; color: #2f6fbf; }
.ol-meta-more { color: #8e8e93; font-size: 14px; letter-spacing: 1px; }
.ol-text { margin-top: 16px; font-size: 15px; line-height: 1.75; color: #1b1b1b; }
.ol-text p { margin: 0 0 14px; white-space: pre-wrap; }

/* 详情操作条：白色圆角条，浮在标签栏上方 */
.ol-actions {
  flex: none;
  margin: 0 12px 8px;
  padding: 10px 14px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #2f6fbf;
}
.ol-action-reply { display: flex; align-items: center; gap: 6px; font-size: 15px; }
.ol-action { display: grid; place-items: center; color: #6e6e73; }
</style>
