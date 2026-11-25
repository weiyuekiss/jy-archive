<script setup>
// 仿 iOS 26 电话「最近通话」：全屏，顶栏延伸到状态栏；大标题、全部/未接分段、
// 通话列表（未接联系人名字为红色，右侧时间和信息键）；底部玻璃标签栏。右上角有刷新按钮。
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
  { id: 'all', label: '全部' },
  { id: 'missed', label: '未接' }
]
const TABS = [
  { id: 'recents', label: '通话记录', icon: 'recents' },
  { id: 'contacts', label: '通讯录', icon: 'contacts' },
  { id: 'keypad', label: '拨号键盘', icon: 'keypad' },
  { id: 'voicemail', label: '语音信箱', icon: 'voicemail' }
]
const DIRECTION_TEXT = { in: '来电', out: '拨出', missed: '未接' }

const seg = ref('all')

// 按模型给的顺序显示（提示词要求从近到远），「未接」分段只保留未接
const shown = computed(() => props.items
  .map((call, index) => ({ call, index }))
  .filter(({ call }) => seg.value === 'all' || call.direction === 'missed'))

function subOf(call) {
  const parts = [call.sub || '手机', DIRECTION_TEXT[call.direction] || '来电']
  if (call.duration) parts.push(call.duration)
  return parts.join(' · ')
}
</script>

<template>
  <div class="pc">
    <header class="pc-top">
      <button type="button" class="pc-back" aria-label="返回桌面" @click="emit('back')">
        <PhoneIcon name="back" :size="24" />
        <span>{{ ownerName || '返回' }}</span>
      </button>
      <button type="button" class="pc-round" aria-label="刷新通话记录" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
        <PhoneIcon name="flip" :size="18" />
      </button>
    </header>

    <h1 class="pc-large">最近通话</h1>

    <div class="pc-seg" role="tablist">
      <button v-for="s in SEG" :key="s.id" type="button" role="tab" :class="{ 'is-on': seg === s.id }" :aria-selected="seg === s.id" @click="seg = s.id">{{ s.label }}</button>
    </div>

    <div class="pc-body">
      <p v-if="!items.length" class="pc-empty">还没有通话记录。点右上角刷新，让模型按角色的生活写出最近的通话。</p>
      <p v-else-if="!shown.length" class="pc-empty">没有未接电话</p>
      <ul v-else class="pc-list">
        <li v-for="entry in shown" :key="entry.index" class="pc-row">
          <span class="pc-main">
            <span class="pc-name" :class="{ 'is-missed': entry.call.direction === 'missed' }">{{ entry.call.title }}</span>
            <span class="pc-sub">{{ subOf(entry.call) }}</span>
          </span>
          <span class="pc-time">{{ entry.call.time }}</span>
          <button type="button" class="pc-info" :aria-label="`${entry.call.title} 的详情`"><PhoneIcon name="info" :size="20" /></button>
        </li>
      </ul>
    </div>

    <!-- 底部：玻璃标签栏，沿用其他应用的样式 -->
    <div class="pc-bottom">
      <nav class="pc-tabbar" aria-label="电话底部导航">
        <span v-for="t in TABS" :key="t.id" class="pc-tab" :class="{ 'is-on': t.id === 'recents' }">
          <PhoneIcon :name="t.icon" :size="22" />
          <span>{{ t.label }}</span>
        </span>
      </nav>
    </div>
  </div>
</template>

<style scoped>
/* 全屏：白底，顶栏延伸到状态栏 */
.pc {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}
.pc-top {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: max(env(safe-area-inset-top), 48px) 14px 4px 8px;
}
.pc-back {
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
.pc-round {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(118, 118, 128, .14);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  color: #0a84ff;
  display: grid;
  place-items: center;
  padding: 0;
  cursor: pointer;
}
.pc-round:disabled { opacity: .5; }
.pc-round.is-spinning svg { animation: pc-spin .9s linear infinite; }
@keyframes pc-spin { to { transform: rotate(360deg); } }
.pc-large { margin: 6px 20px 12px; font-size: 34px; font-weight: 700; letter-spacing: -.02em; }

/* 分段：全部 / 未接 */
.pc-seg {
  display: flex;
  margin: 0 16px 12px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(118, 118, 128, .12);
}
.pc-seg button {
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
.pc-seg button.is-on { background: #fff; font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }

/* 通话列表 */
.pc-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 0 130px; }
.pc-empty { margin: 40px 20px; text-align: center; color: #8e8e93; font-size: 14px; line-height: 1.6; }
.pc-list { margin: 0; padding: 0; list-style: none; }
.pc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 12px 18px;
  border-bottom: .5px solid #e5e5ea;
}
.pc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pc-name { font-size: 17px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-name.is-missed { color: #ff3b30; }
.pc-sub { font-size: 13px; color: #8e8e93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pc-time { flex: none; font-size: 14px; color: #8e8e93; }
.pc-info { flex: none; border: 0; background: none; color: #0a84ff; padding: 4px; cursor: pointer; display: grid; place-items: center; }

/* 底部玻璃标签栏 */
.pc-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 14px calc(env(safe-area-inset-bottom) + 12px);
  pointer-events: none;
}
.pc-tabbar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 6px 4px;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
}
.pc-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  color: #8e8e93;
  font-size: 11px;
}
.pc-tab.is-on { color: #0a84ff; }
</style>

