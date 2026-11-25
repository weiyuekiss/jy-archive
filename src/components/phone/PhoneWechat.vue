<script setup>
// 仿 Telegram iOS（11+，iOS 26 液态玻璃改版）：会话列表 + 聊天页
// 悬浮玻璃顶栏、紫色我方气泡、深灰对方气泡、悬浮玻璃输入条
import { computed, ref } from 'vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  // 手机主人（角色）的头像 data URL，聊天页右上角显示
  avatar: { type: String, default: '' },
  // 刷新中：禁用刷新按钮，避免重复生成
  refreshing: { type: Boolean, default: false }
})
const emit = defineEmits(['back', 'refresh'])

const openName = ref('')
const AVATAR_COLORS = ['#e17076', '#7bc862', '#e5ca77', '#65aadd', '#a695e7', '#ee7aae']

const threads = computed(() => {
  const map = new Map()
  for (const item of props.items) {
    const name = item.title || '联系人'
    if (!map.has(name)) map.set(name, [])
    map.get(name).push(item)
  }
  return Array.from(map, ([name, list]) => ({ name, list }))
})
const open = computed(() => threads.value.find((t) => t.name === openName.value) || null)

function avatarColor(name) {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function goBack() {
  if (open.value) openName.value = ''
  else emit('back')
}
</script>

<template>
  <div class="tg">
    <!-- 壁纸：深色底 + 柔和色块，模拟聊天背景 -->
    <div class="tg-wallpaper" aria-hidden="true"></div>

    <!-- 悬浮玻璃顶栏 -->
    <header class="tg-top">
      <button type="button" class="tg-round" aria-label="返回" @click="goBack">
        <PhoneIcon name="back" :size="22" />
      </button>

      <div class="tg-title-pill">
        <span v-if="!open" class="tg-title">聊天</span>
        <template v-else>
          <span class="tg-title">{{ open.name }}</span>
          <span class="tg-sub">bot</span>
        </template>
      </div>

      <!-- 右侧：刷新按钮 + 头像，合并成一个列，不挤进标题列 -->
      <div class="tg-right">
        <button type="button" class="tg-round tg-refresh" :class="{ 'is-spinning': refreshing }" :disabled="refreshing" aria-label="刷新聊天内容" @click="emit('refresh')">
          <PhoneIcon name="flip" :size="20" />
        </button>
        <span class="tg-avatar-mini" :style="{ background: avatar ? 'transparent' : '#8e8e93' }">
          <img v-if="avatar" :src="avatar" alt="" />
          <span v-else>我</span>
        </span>
      </div>
    </header>

    <!-- 会话列表 -->
    <main v-if="!open" class="tg-list">
      <h1 class="tg-large">聊天</h1>
      <div class="tg-search">搜索</div>

      <p v-if="!threads.length" class="tg-empty">还没有聊天</p>

      <button v-for="thread in threads" :key="thread.name" type="button" class="tg-row" @click="openName = thread.name">
        <span class="tg-ava" :style="{ background: avatarColor(thread.name) }">{{ thread.name.slice(0, 1) }}</span>
        <span class="tg-row-main">
          <span class="tg-row-top">
            <span class="tg-row-name">{{ thread.name }}</span>
            <span class="tg-row-time">{{ thread.list.at(-1).time }}</span>
          </span>
          <span class="tg-row-last">{{ thread.list.at(-1).text }}</span>
        </span>
      </button>
    </main>

    <!-- 底部标签栏：悬浮液态玻璃胶囊，仅会话列表页显示 -->
    <div v-if="!open" class="tg-bottombar">
      <nav class="tg-tabbar" aria-label="底部导航">
        <button type="button" class="tg-tab is-on">
          <PhoneIcon name="chat" :size="24" />
          <span>聊天</span>
        </button>
        <button type="button" class="tg-tab">
          <PhoneIcon name="user" :size="24" />
          <span>通讯录</span>
        </button>
        <button type="button" class="tg-tab">
          <PhoneIcon name="settings" :size="24" />
          <span>设置</span>
        </button>
      </nav>
      <!-- 圆形玻璃搜索按钮，与标签栏同高同材质 -->
      <button type="button" class="tg-search-btn" aria-label="搜索">
        <PhoneIcon name="search" :size="22" />
      </button>
    </div>

    <!-- 聊天页 -->
    <main v-else class="tg-chat">
      <div class="tg-msgs">
        <div
          v-for="(m, i) in open.list"
          :key="i"
          class="tg-msg"
          :class="m.from === 'me' ? 'is-me' : 'is-them'"
        >
          <div class="tg-bubble">
            <span class="tg-text">{{ m.text }}</span>
            <span class="tg-meta">
              <span class="tg-time">{{ m.time }}</span>
              <span v-if="m.from === 'me'" class="tg-check" aria-label="已读">✓✓</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 悬浮玻璃输入条 -->
      <footer class="tg-glass tg-input">
        <span class="tg-round tg-round-sm" aria-hidden="true">
          <PhoneIcon name="plus" :size="20" />
        </span>
        <span class="tg-field">Message</span>
        <span class="tg-round tg-round-sm" aria-hidden="true">
          <PhoneIcon name="aperture" :size="20" />
        </span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.tg {
  position: relative;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  background: #0e1621;
}

/* 壁纸：深色底加两团柔和色块 */
.tg-wallpaper {
  position: absolute;
  inset: 0;
  background: #1c1c1e;
  z-index: 0;
}

/* 液态玻璃通用：半透明深色、模糊、饱和度、细高光，无白色实线边框 */
.tg-glass {
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  background: rgba(58, 58, 60, .62);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .14), inset 0 -1px 0 rgba(0, 0, 0, .25);
}

/* 圆形按钮（顶栏与输入条共用） */
.tg-round {
  width: 42px;
  height: 42px;
  flex: none;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  cursor: pointer;
  background: rgba(40, 44, 56, .55);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 6px 16px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .14);
}
.tg-round-sm { width: 34px; height: 34px; }

/* 悬浮顶栏 */
/* 顶栏：返回键、标题胶囊、头像三者同高、同材质、同一行 */
.tg-top {
  position: relative;
  z-index: 3;
  margin: max(env(safe-area-inset-top), 52px) 12px 0;
  height: 42px;
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 10px;
}
.tg-title-pill {
  justify-self: center;
  width: auto;
  min-width: 120px;
  max-width: 200px;
  height: 42px;
  box-sizing: border-box;
  padding: 0 20px;
  border-radius: 21px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-width: 0;
  background: rgba(40, 44, 56, .55);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  box-shadow: 0 6px 16px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .14);
}
.tg-title { font-size: 16px; font-weight: 600; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.tg-sub { font-size: 11px; color: rgba(255, 255, 255, .6); }
.tg-avatar-mini img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}
.tg-right { display: flex; align-items: center; gap: 8px; justify-self: end; }
.tg-refresh { margin: 0; }
.tg-refresh:disabled { opacity: .5; cursor: default; }
.tg-refresh.is-spinning svg { animation: tg-spin .9s linear infinite; }
@keyframes tg-spin { to { transform: rotate(360deg); } }
.tg-avatar-mini {
  justify-self: end;
  overflow: hidden;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255, 255, 255, .14);
}

/* 会话列表 */
.tg-list {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  /* 底部留出标签栏（60px）和它的底边距，避免最后一行被遮住 */
  padding: 8px 14px calc(env(safe-area-inset-bottom) + 110px);
  box-sizing: border-box;
}
.tg-large { margin: 12px 4px 12px; font-size: 32px; font-weight: 700; letter-spacing: -.02em; color: #fff; }
.tg-search {
  margin: 0 0 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(120, 120, 128, .24);
  color: rgba(255, 255, 255, .55);
  font-size: 15px;
  text-align: center;
}
.tg-empty { margin-top: 40px; text-align: center; color: rgba(255, 255, 255, .55); font-size: 15px; }
.tg-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 6px;
  border: 0;
  background: none;
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.tg-ava {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}
.tg-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; border-bottom: .5px solid rgba(255, 255, 255, .1); padding-bottom: 10px; }
.tg-row-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.tg-row-name { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tg-row-time { flex: none; font-size: 12px; color: rgba(255, 255, 255, .5); }
.tg-row-last { font-size: 14px; color: rgba(255, 255, 255, .6); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 底部标签栏：悬浮液态玻璃胶囊，三个标签等分 */
/* 底部行：标签栏在左，圆形搜索按钮在右，两者同高、底部对齐 */
.tg-bottombar {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: calc(env(safe-area-inset-bottom) + 14px);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 12px;
}
.tg-search-btn {
  flex: none;
  width: 60px;
  height: 60px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  cursor: pointer;
  background: rgba(58, 58, 60, .62);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .14), inset 0 -1px 0 rgba(0, 0, 0, .25);
}
.tg-search-btn:active { opacity: .7; }
.tg-tabbar {
  flex: 1;
  height: 60px;
  border-radius: 30px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  padding: 0 6px;
  box-sizing: border-box;
  background: rgba(58, 58, 60, .62);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .14), inset 0 -1px 0 rgba(0, 0, 0, .25);
}
.tg-tab {
  height: 52px;
  border: 0;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: rgba(255, 255, 255, .55);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.tg-tab.is-on { color: #34c759; }
.tg-tab:active { opacity: .7; }

/* 聊天页 */
.tg-chat {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tg-msgs {
  flex: 1;
  overflow-y: auto;
  padding: 12px 12px 96px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
}
.tg-msg { display: flex; }
.tg-msg.is-me { justify-content: flex-end; }
.tg-msg.is-them { justify-content: flex-start; }
.tg-bubble {
  position: relative;
  max-width: 78%;
  padding: 8px 12px 6px;
  border-radius: 18px;
  font-size: 16px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .15);
}
/* 我方：紫色实心气泡，右下角尾巴 */
.is-me .tg-bubble { background: #34c759; color: #fff; border-bottom-right-radius: 6px; }
/* 对方：深灰半透明气泡，左下角尾巴 */
.is-them .tg-bubble { background: rgba(60, 64, 78, .78); color: #fff; border-bottom-left-radius: 6px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.tg-text { display: inline; }
.tg-meta { float: right; display: inline-flex; align-items: center; gap: 3px; margin: 6px 0 0 10px; font-size: 11px; color: rgba(255, 255, 255, .7); line-height: 1; }
.tg-check { font-size: 11px; letter-spacing: -2px; color: rgba(255, 255, 255, .85); }

/* 悬浮输入条：底部圆角胶囊，玻璃质感 */
.tg-input {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(env(safe-area-inset-bottom) + 14px);
  z-index: 3;
  height: 52px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  box-sizing: border-box;
}
.tg-field {
  flex: 1;
  min-width: 0;
  padding: 0 6px;
  font-size: 16px;
  color: rgba(255, 255, 255, .45);
}
.tg-input .tg-round-sm {
  background: transparent;
  box-shadow: none;
  color: rgba(255, 255, 255, .75);
}
</style>
