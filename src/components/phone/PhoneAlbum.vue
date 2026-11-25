<script setup>
// 仿 iOS 26 照片：全屏，顶栏延伸到状态栏；底部玻璃标签栏（图库 / 精选 / 相簿）+ 圆形搜索键；
// 图库按日期分段的方格；相簿按 album 分组；点开全屏查看，黑底，底部玻璃工具条
import { computed, ref } from 'vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  // 刷新中：禁用刷新按钮
  refreshing: { type: Boolean, default: false },
  // 手机主人（角色）的名字，图库页顶栏左侧显示
  ownerName: { type: String, default: '' }
})
const emit = defineEmits(['back', 'refresh'])

import { tileOf } from '@/components/phone/photoTile'
const TABS = [
  { id: 'library', label: '图库', icon: 'photos' },
  { id: 'featured', label: '精选', icon: 'heart' },
  { id: 'albums', label: '相簿', icon: 'folder' }
]

const tab = ref('library')
const query = ref('')
const searchOpen = ref(false)
const openAlbum = ref('')
const viewIndex = ref(-1)

const viewing = computed(() => props.items[viewIndex.value] || null)

// 搜索过滤：保留原始下标，点开照片时仍按原始下标取数据
const matched = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !q || `${item.title} ${item.album} ${item.text}`.toLowerCase().includes(q))
})

// 精选：最新的在前
const featured = computed(() => [...matched.value].reverse())

function dateKeyOf(time) {
  const t = String(time || '')
  if (t.startsWith('今天')) return '今天'
  if (t.startsWith('昨天')) return '昨天'
  const m = t.match(/\d+月\d+日/)
  return m ? m[0] : '更早'
}

// 图库：按拍摄日期分段
const libraryGroups = computed(() => {
  const map = new Map()
  for (const entry of matched.value) {
    const key = dateKeyOf(entry.item.time)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(entry)
  }
  return Array.from(map, ([name, list]) => ({ name, list }))
})

// 相簿：按 album 字段分组，没有相簿名的归入「最近添加」
const albums = computed(() => {
  const map = new Map()
  for (const entry of matched.value) {
    const name = entry.item.album || '最近添加'
    if (!map.has(name)) map.set(name, [])
    map.get(name).push(entry)
  }
  return Array.from(map, ([name, list]) => ({ name, list, cover: list[0].index }))
})

const albumEntries = computed(() => albums.value.find((a) => a.name === openAlbum.value)?.list || [])
const headerTitle = computed(() => openAlbum.value || TABS.find((t) => t.id === tab.value)?.label || '图库')
const backLabel = computed(() => (openAlbum.value ? '相簿' : props.ownerName || '返回'))

function goBack() {
  if (openAlbum.value) openAlbum.value = ''
  else emit('back')
}

function switchTab(id) {
  tab.value = id
  openAlbum.value = ''
}

function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) query.value = ''
}

function openPhoto(index) {
  viewIndex.value = index
}
function closeViewer() {
  viewIndex.value = -1
}
</script>

<template>
  <div class="ph" :class="{ 'is-viewer': viewing }">
    <!-- 列表页 -->
    <template v-if="!viewing">
      <header class="ph-top">
        <button type="button" class="ph-round ph-back" :aria-label="backLabel" @click="goBack">
          <PhoneIcon name="chevron" :size="18" class="ph-chev-left" />
        </button>
        <div class="ph-top-right">
          <button type="button" class="ph-round" aria-label="刷新照片" :disabled="refreshing" :class="{ 'is-spinning': refreshing }" @click="emit('refresh')">
            <PhoneIcon name="flip" :size="18" />
          </button>
          <button type="button" class="ph-round" aria-label="搜索" :class="{ 'is-on': searchOpen }" @click="toggleSearch">
            <PhoneIcon name="search" :size="18" />
          </button>
        </div>
      </header>

      <h1 class="ph-large">{{ headerTitle }}</h1>

      <label v-if="searchOpen" class="ph-search">
        <PhoneIcon name="search" :size="16" />
        <input v-model="query" type="search" placeholder="搜索" aria-label="搜索照片" />
      </label>

      <div class="ph-body">
        <p v-if="!items.length" class="ph-empty">还没有照片。点右上角刷新，让模型按角色的生活拍一批照片。</p>
        <p v-else-if="!matched.length" class="ph-empty">没有匹配的照片</p>

        <!-- 相簿总览：两列卡片 -->
        <div v-else-if="tab === 'albums' && !openAlbum" class="ph-albums">
          <button v-for="album in albums" :key="album.name" type="button" class="ph-album" @click="openAlbum = album.name">
            <span class="ph-album-cover" :style="{ background: tileOf(album.cover) }"></span>
            <span class="ph-album-name">{{ album.name }}</span>
            <span class="ph-album-count">{{ album.list.length }}</span>
          </button>
        </div>

        <!-- 某个相簿内的方格 -->
        <div v-else-if="openAlbum" class="ph-grid-wrap">
          <div class="ph-grid">
            <button v-for="entry in albumEntries" :key="entry.index" type="button" class="ph-tile" :style="{ background: tileOf(entry.index) }" @click="openPhoto(entry.index)">
              <span class="ph-tile-title">{{ entry.item.title }}</span>
            </button>
          </div>
        </div>

        <!-- 图库：按日期分段 -->
        <template v-else-if="tab === 'library'">
          <section v-for="group in libraryGroups" :key="group.name" class="ph-group">
            <p class="ph-group-label">{{ group.name }}</p>
            <div class="ph-grid">
              <button v-for="entry in group.list" :key="entry.index" type="button" class="ph-tile" :style="{ background: tileOf(entry.index) }" @click="openPhoto(entry.index)">
                <span class="ph-tile-title">{{ entry.item.title }}</span>
              </button>
            </div>
          </section>
        </template>

        <!-- 精选：所有照片倒序的平铺方格 -->
        <div v-else class="ph-grid-wrap">
          <div class="ph-grid">
            <button v-for="entry in featured" :key="entry.index" type="button" class="ph-tile" :style="{ background: tileOf(entry.index) }" @click="openPhoto(entry.index)">
              <span class="ph-tile-title">{{ entry.item.title }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部：玻璃标签栏 + 圆形搜索键 -->
      <div class="ph-bottom">
        <nav class="ph-tabbar" aria-label="相册分类">
          <button v-for="t in TABS" :key="t.id" type="button" class="ph-tab" :class="{ 'is-on': tab === t.id && !openAlbum }" @click="switchTab(t.id)">
            <PhoneIcon :name="t.icon" :size="22" />
            <span>{{ t.label }}</span>
          </button>
        </nav>
      </div>
    </template>

    <!-- 全屏查看：黑底，图片区，底部玻璃工具条 -->
    <template v-else>
      <header class="ph-viewer-top">
        <button type="button" class="ph-round" aria-label="关闭" @click="closeViewer"><PhoneIcon name="close" :size="18" /></button>
        <span class="ph-viewer-time">{{ viewing.time }}</span>
      </header>
      <div class="ph-viewer-img" :style="{ background: tileOf(viewIndex) }">
        <span class="ph-viewer-title">{{ viewing.title }}</span>
      </div>
      <p v-if="viewing.album" class="ph-viewer-album">{{ viewing.album }}</p>
      <p class="ph-caption">{{ viewing.text }}</p>
      <footer class="ph-viewer-bar">
        <span class="ph-viewer-btn"><PhoneIcon name="share" :size="20" /></span>
        <span class="ph-viewer-btn"><PhoneIcon name="heart" :size="20" /></span>
        <span class="ph-viewer-btn"><PhoneIcon name="trash" :size="20" /></span>
      </footer>
    </template>
  </div>
</template>

<style scoped>
/* 全屏：顶栏延伸到状态栏，背景白色（iOS 26 照片图库页） */
.ph {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #000;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}

/* 全屏查看时整页切为黑底，白色文字才看得清 */
.ph.is-viewer { background: #000; }

/* 顶栏：圆形玻璃按钮，延伸到状态栏 */
.ph-top {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 48px) 14px 4px;
}
.ph-top-right { display: flex; gap: 10px; }
.ph-round {
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
.ph-round.is-on { background: #0a84ff; color: #fff; }
.ph-round:disabled { opacity: .5; }
.ph-round.is-spinning svg { animation: ph-spin .9s linear infinite; }
@keyframes ph-spin { to { transform: rotate(360deg); } }
.ph-chev-left { transform: rotate(180deg); }

/* 大标题 */
.ph-large { margin: 6px 18px 10px; font-size: 34px; font-weight: 700; letter-spacing: -.02em; }

/* 搜索栏 */
.ph-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 16px 10px;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(118, 118, 128, .12);
  color: #8e8e93;
  box-sizing: border-box;
}
.ph-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: none; font: inherit; font-size: 16px; color: #000; }
.ph-search input::placeholder { color: #8e8e93; }

/* 主体：可滚动，底部留出玻璃标签栏的空间 */
.ph-body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 0 130px; }
.ph-empty { margin: 40px 0; text-align: center; color: #8e8e93; font-size: 14px; line-height: 1.6; }

/* 图库分段 */
.ph-group { margin-bottom: 8px; }
.ph-group-label { margin: 10px 16px 6px; font-size: 13px; font-weight: 600; color: #8e8e93; }
.ph-grid-wrap { padding-top: 4px; }
.ph-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; }
.ph-tile { position: relative; aspect-ratio: 1; border: 0; padding: 0; cursor: pointer; display: flex; align-items: flex-end; overflow: hidden; }
.ph-tile:active { opacity: .8; }
.ph-tile-title {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 6px 4px;
  font-size: 10px;
  color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, .35));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

/* 相簿卡片：两列 */
.ph-albums { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 12px; padding: 4px 16px 0; }
.ph-album { display: flex; flex-direction: column; gap: 3px; border: 0; background: none; padding: 0; font: inherit; text-align: left; cursor: pointer; min-width: 0; }
.ph-album-cover { display: block; width: 100%; aspect-ratio: 1; border-radius: 12px; }
.ph-album-name { margin-top: 4px; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ph-album-count { font-size: 12px; color: #8e8e93; }

/* 底部玻璃标签栏：液态玻璃，无白色实线边框 */
.ph-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 14px calc(env(safe-area-inset-bottom) + 12px);
  pointer-events: none;
}
.ph-tabbar {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 6px 4px;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
}
.ph-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0;
  border: 0;
  background: none;
  color: #8e8e93;
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.ph-tab.is-on { color: #0a84ff; }

/* 全屏查看：黑底 */
.ph-viewer-top {
  flex: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: max(env(safe-area-inset-top), 48px) 14px 6px;
  background: #000;
  color: #fff;
}
.ph-viewer-time { font-size: 13px; color: #aeaeb2; padding-right: 6px; }
.ph-viewer-img {
  margin: 6px 0 0;
  aspect-ratio: 3 / 4;
  display: grid;
  place-items: center;
  padding: 16px;
  box-sizing: border-box;
}
.ph-viewer-title { font-size: 18px; font-weight: 600; color: #fff; text-align: center; text-shadow: 0 1px 6px rgba(0, 0, 0, .35); }
.ph-viewer-album { margin: 12px 18px 0; font-size: 12px; color: #8e8e93; }
.ph-caption { margin: 6px 18px 0; font-size: 14px; line-height: 1.6; color: #e5e5ea; white-space: pre-wrap; }
.ph-viewer-bar {
  margin-top: auto;
  margin-bottom: calc(env(safe-area-inset-bottom) + 14px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px 0;
  border-radius: 24px;
  margin-left: 14px;
  margin-right: 14px;
  background: rgba(120, 120, 128, .28);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  color: #fff;
}
.ph-viewer-btn { display: grid; place-items: center; }
</style>


