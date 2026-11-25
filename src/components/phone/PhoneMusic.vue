<script setup>
// 仿 iOS 26 音乐：全屏，顶栏延伸到状态栏；资料库页（大标题、搜索、歌单卡片、最近添加列表）；
// 底部玻璃迷你播放器 + 玻璃底栏；点开全屏播放页（模糊封面背景、进度条、控制键）
import { computed, ref } from 'vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  refreshing: { type: Boolean, default: false },
  ownerName: { type: String, default: '' }
})
const emit = defineEmits(['back', 'refresh'])

const SEG = [
  { id: 'library', label: '资料库' },
  { id: 'browse', label: '浏览' }
]
const tab = ref('library')
const query = ref('')
const playing = ref(null)     // 当前播放的歌曲在 items 中的下标
const paused = ref(false)
const showPlayer = ref(false)

// 封面渐变：按歌名稳定取色，不依赖外部图片
const COVERS = [
  ['#fbc2eb', '#a6c1ee'],
  ['#fddb92', '#d1fdff'],
  ['#84fab0', '#8fd3f4'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#ffecd2', '#fcb69f'],
  ['#a1c4fd', '#c2e9fb'],
  ['#d4fc79', '#96e6a1']
]
function coverOf(index) {
  const [a, b] = COVERS[index % COVERS.length]
  return `linear-gradient(135deg, ${a}, ${b})`
}

// 歌单：按 playlist 字段分组
const playlists = computed(() => {
  const map = new Map()
  props.items.forEach((song, index) => {
    const name = song.playlist || '我的歌单'
    if (!map.has(name)) map.set(name, { name, count: 0, cover: index })
    map.get(name).count += 1
  })
  return Array.from(map.values())
})

// 最近添加：按 items 原顺序；收藏的排前面
const recent = computed(() => {
  const list = props.items.map((song, index) => ({ song, index }))
  const q = query.value.trim().toLowerCase()
  const filtered = q
    ? list.filter(({ song }) => `${song.title} ${song.sub} ${song.album}`.toLowerCase().includes(q))
    : list
  return [...filtered].sort((a, b) => Number(b.song.pinned) - Number(a.song.pinned))
})

const now = computed(() => (playing.value === null ? null : props.items[playing.value] || null))

function playAt(index) {
  playing.value = index
  paused.value = false
  showPlayer.value = true
}

function togglePause() {
  paused.value = !paused.value
}

function goBack() {
  if (showPlayer.value) showPlayer.value = false
  else emit('back')
}
</script>

<template>
  <div class="mu">
    <!-- 资料库页 -->
    <template v-if="!showPlayer">
      <header class="mu-top">
        <button type="button" class="mu-back" aria-label="返回桌面" @click="emit('back')">
          <PhoneIcon name="back" :size="24" />
          <span>{{ ownerName || '返回' }}</span>
        </button>
        <button type="button" class="mu-refresh" aria-label="刷新音乐" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
          <PhoneIcon name="flip" :size="20" />
        </button>
      </header>

      <h1 class="mu-large">音乐</h1>

      <div class="mu-seg" role="tablist">
        <button v-for="s in SEG" :key="s.id" type="button" role="tab" :class="{ 'is-on': tab === s.id }" :aria-selected="tab === s.id" @click="tab = s.id">{{ s.label }}</button>
      </div>

      <label class="mu-search">
        <PhoneIcon name="search" :size="16" />
        <input v-model="query" type="search" placeholder="搜索" aria-label="搜索音乐" />
      </label>

      <div class="mu-body">
        <p v-if="!items.length" class="mu-empty">还没有音乐。点右上角刷新，让模型按角色的生活写出歌单。</p>

        <template v-else>
          <!-- 歌单卡片：两列网格 -->
          <section class="mu-section">
            <h2 class="mu-section-title">歌单</h2>
            <div class="mu-playlists">
              <div v-for="pl in playlists" :key="pl.name" class="mu-pl">
                <span class="mu-pl-cover" :style="{ background: coverOf(pl.cover) }"></span>
                <span class="mu-pl-name">{{ pl.name }}</span>
                <span class="mu-pl-count">{{ pl.count }} 首歌曲</span>
              </div>
            </div>
          </section>

          <!-- 最近添加 -->
          <section class="mu-section">
            <h2 class="mu-section-title">最近添加</h2>
            <div class="mu-list">
              <button
                v-for="(entry, i) in recent"
                :key="entry.index"
                type="button"
                class="mu-row"
                :class="{ 'is-last': i === recent.length - 1 }"
                @click="playAt(entry.index)"
              >
                <span class="mu-cover" :style="{ background: coverOf(entry.index) }"></span>
                <span class="mu-main">
                  <span class="mu-title">{{ entry.song.title }}</span>
                  <span class="mu-sub">{{ entry.song.sub }}<template v-if="entry.song.album"> · {{ entry.song.album }}</template></span>
                </span>
                <PhoneIcon name="dots" :size="18" class="mu-more" />
              </button>
              <p v-if="!recent.length" class="mu-empty">没有匹配的歌曲</p>
            </div>
          </section>
        </template>
      </div>

      <!-- 底部：玻璃迷你播放器 + 玻璃底栏 -->
      <div class="mu-bottom">
        <button v-if="now" type="button" class="mu-mini" @click="showPlayer = true">
          <span class="mu-mini-cover" :style="{ background: coverOf(playing) }"></span>
          <span class="mu-mini-text">{{ now.title }}</span>
          <span class="mu-mini-btn" @click.stop="togglePause">
            <PhoneIcon :name="paused ? 'play' : 'pause'" :size="18" />
          </span>
        </button>
        <nav class="mu-tabbar" aria-label="底部导航">
          <span class="mu-tab is-on"><PhoneIcon name="music" :size="22" /><span>资料库</span></span>
          <span class="mu-tab"><PhoneIcon name="search" :size="22" /><span>搜索</span></span>
        </nav>
      </div>
    </template>

    <!-- 全屏播放页 -->
    <template v-else-if="now">
      <div class="mu-player">
        <div class="mu-player-bg" :style="{ background: coverOf(playing) }"></div>
        <header class="mu-player-top">
          <button type="button" class="mu-down" aria-label="收起播放器" @click="goBack">
            <PhoneIcon name="down" :size="26" />
          </button>
        </header>
        <div class="mu-art" :style="{ background: coverOf(playing) }"></div>
        <div class="mu-info">
          <h2 class="mu-p-title">{{ now.title }}</h2>
          <p class="mu-p-sub">{{ now.sub }}</p>
        </div>
        <div class="mu-progress"><span></span></div>
        <div class="mu-controls">
          <button type="button" class="mu-ctl" aria-label="上一首"><PhoneIcon name="prev" :size="30" /></button>
          <button type="button" class="mu-play" :aria-label="paused ? '播放' : '暂停'" @click="togglePause">
            <PhoneIcon :name="paused ? 'play' : 'pause'" :size="36" />
          </button>
          <button type="button" class="mu-ctl" aria-label="下一首"><PhoneIcon name="next" :size="30" /></button>
        </div>
        <p class="mu-quote">{{ now.text }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 全屏：浅灰底（iOS 26 音乐资料库页），顶栏延伸到状态栏 */
.mu {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #f2f2f7;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}

.mu-top {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 48px) 12px 6px 8px;
}
.mu-back {
  display: flex;
  align-items: center;
  gap: 2px;
  border: 0;
  background: none;
  color: #fa2d55;
  font: inherit;
  font-size: 17px;
  padding: 6px 4px;
  cursor: pointer;
}
.mu-refresh {
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .85);
  color: #fa2d55;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .08);
}
.mu-refresh:disabled { opacity: .5; }
.mu-refresh.is-spinning svg { animation: mu-spin .9s linear infinite; }
@keyframes mu-spin { to { transform: rotate(360deg); } }

.mu-large { margin: 4px 20px 12px; font-size: 34px; font-weight: 700; letter-spacing: -.02em; }

/* 分段：资料库 / 浏览 */
.mu-seg {
  display: flex;
  margin: 0 16px 12px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(118, 118, 128, .12);
}
.mu-seg button {
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
.mu-seg button.is-on { background: #fff; font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }

.mu-search {
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
.mu-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: inherit; font-size: 16px; color: #000; }
.mu-search input::placeholder { color: #8e8e93; }

/* 主体 */
.mu-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 16px 150px; }
.mu-empty { margin: 30px 0; text-align: center; color: #8e8e93; font-size: 14px; line-height: 1.6; }
.mu-section { margin-bottom: 20px; }
.mu-section-title { margin: 0 2px 10px; font-size: 20px; font-weight: 700; }

/* 歌单网格 */
.mu-playlists { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 12px; }
.mu-pl { display: flex; flex-direction: column; gap: 3px; }
.mu-pl-cover { display: block; width: 100%; aspect-ratio: 1; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, .08); }
.mu-pl-name { margin-top: 6px; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mu-pl-count { font-size: 12px; color: #8e8e93; }

/* 最近添加列表 */
.mu-list { overflow: hidden; border-radius: 14px; background: #fff; }
.mu-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 0;
  border-bottom: .5px solid #e5e5ea;
  background: #fff;
  color: #000;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}
.mu-row.is-last { border-bottom: 0; }
.mu-row:active { background: #e5e5ea; }
.mu-cover { flex: none; width: 44px; height: 44px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, .08); }
.mu-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.mu-title { font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mu-sub { font-size: 13px; color: #8e8e93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mu-more { flex: none; color: #fa2d55; }

/* 底部：玻璃迷你播放器 + 玻璃底栏 */
.mu-bottom {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: calc(env(safe-area-inset-bottom) + 10px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.mu-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px 8px 8px;
  border: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, .75);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 6px 20px rgba(0, 0, 0, .12);
  font: inherit;
  color: #000;
  text-align: left;
  cursor: pointer;
}
.mu-mini-cover { flex: none; width: 36px; height: 36px; border-radius: 8px; }
.mu-mini-text { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mu-mini-btn { flex: none; display: grid; place-items: center; padding: 0 6px; color: #000; }
.mu-tabbar {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  padding: 4px 0;
  border-radius: 22px;
  background: rgba(255, 255, 255, .8);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 6px 20px rgba(0, 0, 0, .1);
}
.mu-tab { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; color: #8e8e93; padding: 4px 0; }
.mu-tab.is-on { color: #fa2d55; }

/* 全屏播放页 */
.mu-player {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: max(env(safe-area-inset-top), 48px) 26px calc(env(safe-area-inset-bottom) + 28px);
  box-sizing: border-box;
  color: #111;
  overflow: hidden;
}
.mu-player-bg {
  position: absolute;
  inset: -40px;
  filter: blur(50px) saturate(140%);
  opacity: .55;
}
.mu-player::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, .35);
  pointer-events: none;
}
.mu-player > * { position: relative; z-index: 1; }
.mu-player-top { align-self: stretch; display: flex; justify-content: center; }
.mu-down { border: 0; background: none; color: #111; cursor: pointer; padding: 4px; }
.mu-art { width: 100%; max-width: 290px; aspect-ratio: 1; border-radius: 16px; margin-top: 18px; box-shadow: 0 16px 40px rgba(0, 0, 0, .2); }
.mu-info { width: 100%; max-width: 290px; margin-top: 22px; }
.mu-p-title { margin: 0; font-size: 22px; font-weight: 700; }
.mu-p-sub { margin: 4px 0 0; font-size: 16px; color: #444; }
.mu-progress { width: 100%; max-width: 290px; height: 4px; margin-top: 22px; border-radius: 2px; background: rgba(0, 0, 0, .15); }
.mu-progress span { display: block; width: 38%; height: 100%; border-radius: 2px; background: #111; }
.mu-controls { display: flex; align-items: center; justify-content: space-between; width: 100%; max-width: 240px; margin-top: 22px; }
.mu-ctl, .mu-play { border: 0; background: none; color: #111; cursor: pointer; display: grid; place-items: center; padding: 0; }
.mu-quote { margin: auto 0 0; max-width: 290px; font-size: 13px; line-height: 1.7; color: #333; text-align: center; }
</style>
