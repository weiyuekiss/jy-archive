<script setup>
import { computed, ref } from 'vue'
import WidgetView from '@/components/widgets/WidgetView.vue'
import PhotoPickerDialog from '@/components/widgets/PhotoPickerDialog.vue'
import { dockApps } from '@/apps'
import BeautifyIcon from '@/components/icons/BeautifyIcon.vue'
import { WIDGET_SIZES, widgetCatalog } from '@/widgets'
import { addWidget } from '@/stores/desktop'
import {
  theme,
  WALLPAPERS,
  ICON_STYLES,
  GLASS_TINTS,
  wallpaperCss,
  iconStyleVars,
  glassVars,
  applyTheme,
  compressImageFile
} from '@/stores/theme'

const emit = defineEmits(['close'])

const tabs = [
  { key: 'widgets', label: '桌面小组件' },
  { key: 'themes', label: '壁纸与图标' }
]
const activeTab = ref('widgets')
const activeSize = ref(WIDGET_SIZES[0].key)
const iconDialog = ref(null)
const iconUrl = ref('')
const iconError = ref('')
const iconFileInput = ref(null)
const customIconDraft = ref({ ...theme.customIcons })
const appIconTargets = computed(() => dockApps.filter((app) => ['beautify', 'chat', 'character', 'settings'].includes(app.id)))
const appIconPreviewStyle = (appId) => customIconDraft.value[appId] ? { backgroundImage: `url(${JSON.stringify(customIconDraft.value[appId])})` } : null

function openIconDialog(app) {
  iconDialog.value = app
  iconUrl.value = theme.customIcons?.[app.id]?.startsWith('http') ? theme.customIcons[app.id] : ''
  iconError.value = ''
}

async function onIconFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  try {
    customIconDraft.value[iconDialog.value.id] = await compressImageFile(file, 512, 0.86)
    iconDialog.value = null
  } catch {
    iconError.value = '图片读取失败，请选择其他图片'
  }
}

function saveIconUrl() {
  try {
    const url = new URL(iconUrl.value.trim())
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol')
    customIconDraft.value[iconDialog.value.id] = url.href
    iconDialog.value = null
  } catch {
    iconError.value = '请输入有效的 http 或 https 图片链接'
  }
}

function clearIcon() {
  delete customIconDraft.value[iconDialog.value.id]
  iconDialog.value = null
}

const currentSize = computed(() => WIDGET_SIZES.find((s) => s.key === activeSize.value))
const list = computed(() =>
  widgetCatalog.filter((w) => w.w === currentSize.value.w && w.h === currentSize.value.h)
)

function onAdd(def) {
  showToast(addWidget(def) ? `已添加「${def.name}」到桌面` : '桌面空间不足，请先移除一些小组件')
}

const draft = ref({
  wallpaper: theme.wallpaper,
  iconStyle: theme.iconStyle,
  customImage: theme.customImage,
  widgetGlass: theme.widgetGlass,
  iconGlass: theme.iconGlass,
  glassTint: theme.glassTint || 'clear'
})

const previewStyle = computed(() => ({
  background: wallpaperCss(draft.value.wallpaper, draft.value.customImage),
  ...iconStyleVars(draft.value.iconStyle),
  ...glassVars(draft.value.glassTint)
}))

const isApplied = computed(
  () =>
    draft.value.wallpaper === theme.wallpaper &&
    draft.value.iconStyle === theme.iconStyle &&
    draft.value.customImage === theme.customImage &&
    draft.value.widgetGlass === theme.widgetGlass &&
    draft.value.iconGlass === theme.iconGlass &&
    draft.value.glassTint === theme.glassTint &&
    JSON.stringify(customIconDraft.value) === JSON.stringify(theme.customIcons || {})
)

function toggleWidgetGlass() {
  draft.value.widgetGlass = !draft.value.widgetGlass
}

function toggleIconGlass() {
  draft.value.iconGlass = !draft.value.iconGlass
}

function pickGlassTint(id) {
  draft.value.glassTint = id
}

const glyphs = [
  'M4 8h3l2-3h6l2 3h3v11H4z M12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7',
  'M4 6h16v10H9l-5 4z',
  'M9 17V5l11-2v12 M9 17a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0 M20 15a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0',
  'M4 5h16v15H4z M4 10h16 M9 3v4 M15 3v4',
  'M4 5h16v14H4z M4 15l5-5 4 4 3-3 4 4',
  'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18 M12 7v5l3 2',
  'M6 4h12v16H6z M10 17h4',
  'M12 4l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z'
]

const previewTime = (() => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})()

function pickWallpaper(id) {
  draft.value.wallpaper = id
}
function pickIconStyle(id) {
  draft.value.iconStyle = id
}

const fileInput = ref(null)
function onUpload(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      draft.value.customImage = canvas.toDataURL('image/jpeg', 0.85)
      draft.value.wallpaper = 'custom'
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

function onApply() {
  applyTheme({ ...draft.value, customIcons: { ...customIconDraft.value } })
  showToast('已应用到桌面')
}

// ---------- 提示 ----------
const toast = ref('')
let toastTimer = null
function showToast(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1600)
}
</script>

<template>
  <div class="beautify">
    <header class="top">
      <button class="back" aria-label="返回" @click="emit('close')">
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <h1>美化</h1>
      <span class="spacer" />
    </header>

    <nav class="tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        role="tab"
        :aria-selected="activeTab === t.key"
        :class="{ on: activeTab === t.key }"
        @click="activeTab = t.key"
      >
        {{ t.label }}
      </button>
    </nav>

    <!-- 桌面小组件分区 -->
    <section v-if="activeTab === 'widgets'" class="section">
      <div class="sizes">
        <button
          v-for="s in WIDGET_SIZES"
          :key="s.key"
          :class="{ on: activeSize === s.key }"
          @click="activeSize = s.key"
        >
          {{ s.label }} <small>{{ s.w }}×{{ s.h }}</small>
        </button>
      </div>

      <div class="list" :class="`size-${activeSize}`">
        <article v-for="w in list" :key="w.id" class="item">
          <div class="preview" :style="{ aspectRatio: `${w.w} / ${w.h}` }">
            <WidgetView :type="w.id" />
          </div>
          <div class="meta">
            <span>{{ w.name }}</span>
            <button class="add" @click="onAdd(w)">添加</button>
          </div>
        </article>
      </div>
    </section>

    <!-- 壁纸与图标分区 -->
    <section v-if="activeTab === 'themes'" class="section">
      <!-- 更换预览图 -->
      <div class="mock-wrap">
        <div class="mock" :style="previewStyle" aria-label="桌面预览">
          <div class="mock-status">
            <span>{{ previewTime }}</span>
            <span class="mock-bars"><i /><i /><i /></span>
          </div>

          <div class="mock-widget-preview">
            <WidgetView type="date-card" :glass="draft.widgetGlass" />
          </div>

          <div class="mock-grid">
            <div
              v-for="(g, i) in glyphs.slice(0, 4)"
              :key="i"
              class="mock-icon"
              :class="{ 'is-glass': draft.iconGlass }"
            >
              <svg viewBox="0 0 24 24"><path :d="g" /></svg>
            </div>
          </div>
          <div class="mock-dock">
            <div class="mock-icon" :class="{ 'is-glass': draft.iconGlass }"><BeautifyIcon /></div>
            <div
              v-for="g in glyphs.slice(0, 3)"
              :key="g"
              class="mock-icon"
              :class="{ 'is-glass': draft.iconGlass }"
            >
              <svg viewBox="0 0 24 24"><path :d="g" /></svg>
            </div>
          </div>
        </div>
        <span class="mock-label">桌面效果实时预览</span>
      </div>

      <div class="group">
        <h2>壁纸</h2>
        <div class="swatches">
          <button
            class="swatch upload"
            :class="{ on: draft.wallpaper === 'custom' }"
            :style="draft.customImage ? { background: wallpaperCss('custom', draft.customImage) } : null"
            aria-label="从相册选择壁纸"
            @click="draft.customImage && draft.wallpaper !== 'custom' ? pickWallpaper('custom') : fileInput.click()"
          >
            <svg v-if="!draft.customImage" viewBox="0 0 24 24"><path d="M12 6v12M6 12h12" /></svg>
          </button>
          <button
            v-for="w in WALLPAPERS"
            :key="w.id"
            class="swatch"
            :class="{ on: draft.wallpaper === w.id }"
            :style="{ background: w.css }"
            :aria-label="w.name"
            @click="pickWallpaper(w.id)"
          />
        </div>
        <div class="swatch-names">
          <span>相册</span>
          <span v-for="w in WALLPAPERS" :key="w.id">{{ w.name }}</span>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onUpload" />
      </div>

      <div class="group">
        <h2>透明效果</h2>

        <div class="glass-options">
          <div
            class="glass-option"
            :class="{ active: draft.widgetGlass }"
            @click="toggleWidgetGlass"
          >
            <div class="option-content">
              <div class="option-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <path d="M3 14l5-4 4 4 4-3 5 4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                </svg>
              </div>
              <div class="option-text">
                <span class="option-title">组件透明</span>
                <p class="option-desc">背景透出壁纸</p>
              </div>
            </div>
            <div class="toggle-switch" :class="{ checked: draft.widgetGlass }">
              <span class="toggle-handle" />
            </div>
          </div>

          <div
            class="glass-option"
            :class="{ active: draft.iconGlass }"
            @click="toggleIconGlass"
          >
            <div class="option-content">
              <div class="option-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="6" />
                  <path d="M7 8a9 9 0 0 1 10 0" stroke-linecap="round" />
                  <circle cx="12" cy="13" r="2.5" />
                </svg>
              </div>
              <div class="option-text">
                <span class="option-title">图标透明</span>
                <p class="option-desc">背景透出壁纸</p>
              </div>
            </div>
            <div class="toggle-switch" :class="{ checked: draft.iconGlass }">
              <span class="toggle-handle" />
            </div>
          </div>
        </div>

        <transition name="slide-fade">
          <div v-if="draft.widgetGlass || draft.iconGlass" class="tints-panel">
            <div class="tints-header">
              <span>色调</span>
            </div>
            <div class="tints-grid">
              <button
                v-for="tint in GLASS_TINTS"
                :key="tint.id"
                class="tint-option"
                :class="{ active: draft.glassTint === tint.id }"
                @click="pickGlassTint(tint.id)"
              >
                <span class="tint-color" :style="{ background: tint.accent }" />
                <span class="tint-name">{{ tint.name }}</span>
              </button>
            </div>
          </div>
        </transition>
      </div>

      <div class="group">
        <h2>图标</h2>
        <div class="icon-styles">
          <button
            v-for="s in ICON_STYLES"
            :key="s.id"
            class="icon-style"
            :class="{ on: draft.iconStyle === s.id }"
            :style="iconStyleVars(s.id)"
            @click="pickIconStyle(s.id)"
          >
            <span class="icon-sample"><BeautifyIcon /></span>
            <span class="icon-name">{{ s.name }}</span>
          </button>
        </div>
      </div>

      <div class="group">
        <h2>应用图标</h2>
        <p class="icon-help">为美化、聊天、人物、设置分别选择相册图片或图片链接</p>
        <div class="app-icon-grid">
          <button v-for="app in appIconTargets" :key="app.id" class="app-icon-option" @click="openIconDialog(app)">
            <span class="app-icon-preview" :style="appIconPreviewStyle(app.id)">
              <component :is="app.icon" v-if="!customIconDraft[app.id]" />
            </span>
            <span>{{ app.name }}</span>
            <small>点击更换</small>
          </button>
        </div>
      </div>

      <button class="apply" :disabled="isApplied" @click="onApply">
        {{ isApplied ? '当前使用中' : '应用到桌面' }}
      </button>
    </section>

    <div v-if="iconDialog" class="icon-dialog-mask" @click.self="iconDialog = null">
      <section class="icon-dialog" role="dialog" aria-modal="true" :aria-label="`更换${iconDialog.name}图标`">
        <header><div><small>APP ICON</small><h2>更换{{ iconDialog.name }}图标</h2></div><button aria-label="关闭" @click="iconDialog = null">×</button></header>
        <button class="album-pick" @click="iconFileInput?.click()">从手机相册选择图片</button>
        <input ref="iconFileInput" type="file" accept="image/*" hidden @change="onIconFile" />
        <div class="url-row"><input v-model="iconUrl" type="url" inputmode="url" placeholder="https://example.com/icon.jpg" /><button @click="saveIconUrl">使用链接</button></div>
        <p v-if="iconError" class="icon-error" role="alert">{{ iconError }}</p>
        <footer><button class="clear-icon" @click="clearIcon">恢复默认图标</button><button @click="iconDialog = null">取消</button></footer>
      </section>
    </div>
    <transition name="fade">
      <div v-if="toast" class="toast" role="status">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.beautify {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #3a3a3a;
  padding-top: env(safe-area-inset-top);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 6px;
  background: #ffffff;
}
.top h1 {
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #2b2b2b;
}
.back,
.spacer {
  width: 36px;
  height: 36px;
}
.back {
  border: none;
  background: #ffffff;
  border-radius: 50%;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.back:active {
  background: #f6f6f6;
}
.back svg {
  width: 20px;
  fill: none;
  stroke: #3a3a3a;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tabs {
  display: flex;
  gap: 28px;
  padding: 6px 22px 0;
  background: #ffffff;
}
.tabs button {
  border: none;
  background: none;
  padding: 10px 0 8px;
  font-size: 14px;
  color: #b0b0b0;
  border-bottom: 1.5px solid transparent;
  cursor: pointer;
  transition: color 0.2s ease;
}
.tabs button.on {
  color: #2e2e33;
  border-color: #2e2e33;
}

.section {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px 40px;
  background: #ffffff;
}

.sizes {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
}
.sizes button {
  border: 1px solid #ececec;
  background: #ffffff;
  color: #7a7a7a;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.sizes button small {
  font-size: 11px;
  color: #b5b5b5;
}
.sizes button.on {
  background: #2e2e33;
  border-color: #2e2e33;
  color: #ffffff;
}
.sizes button.on small {
  color: #c8c8c8;
}

.list {
  display: grid;
  gap: 22px 16px;
}
.list.size-2x2 {
  grid-template-columns: 1fr 1fr;
}
.item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview {
  width: 100%;
  border-radius: 24px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  padding: 10px;
}
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  font-size: 13px;
  color: #555;
}
.add {
  border: 1px solid #ececec;
  background: #ffffff;
  color: #3a3a3a;
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.add:active {
  background: #2e2e33;
  border-color: #2e2e33;
  color: #ffffff;
}

.mock-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 26px;
}
.mock {
  --icon: 34px;
  width: 168px;
  aspect-ratio: 9 / 19.5;
  border-radius: 30px;
  border: 5px solid #ffffff;
  outline: 1px solid #ececec;
  box-shadow: 0 12px 32px rgba(40, 40, 50, 0.08);
  padding: 10px 12px 10px;
  display: flex;
  flex-direction: column;
  transition: background 0.35s ease;
}
.mock-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;
  font-weight: 600;
  color: #3a3a3a;
  padding: 0 4px 14px;
}
.mock-bars {
  display: flex;
  gap: 2px;
  align-items: flex-end;
}
.mock-bars i {
  width: 3px;
  background: #3a3a3a;
  border-radius: 1px;
}
.mock-bars i:nth-child(1) { height: 4px; }
.mock-bars i:nth-child(2) { height: 6px; }
.mock-bars i:nth-child(3) { height: 8px; }

.mock-widget-preview {
  width: 100%;
  aspect-ratio: 2 / 2;
  margin-bottom: 8px;
}
.mock-widget-preview :deep(.widget) {
  border-radius: 18px;
}

.mock-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 0;
  justify-items: center;
}
.mock-dock {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  justify-items: center;
  padding: 7px 0;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.45);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.mock-icon {
  position: relative;
  width: var(--icon);
  height: var(--icon);
  border-radius: 24%;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: var(--icon-bg);
  color: var(--icon-fg);
  box-shadow: var(--icon-shadow);
  transition: background 0.3s ease, color 0.3s ease;
}
.mock-icon.is-glass {
  background: var(--glass-icon-bg, linear-gradient(135deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0.24) 100%));
  -webkit-backdrop-filter: blur(12px) saturate(190%) brightness(106%);
  backdrop-filter: blur(12px) saturate(190%) brightness(106%);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.82));
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), inset 0 1px 1.5px rgba(255, 255, 255, 0.9);
  --icon-art-bg: transparent;
}
.mock-icon.is-glass::before {
  content: '';
  position: absolute;
  top: 1px;
  left: 2px;
  right: 2px;
  height: 46%;
  border-radius: inherit;
  border-bottom-left-radius: 40% 60%;
  border-bottom-right-radius: 40% 60%;
  background: linear-gradient(180deg, var(--glass-sheen, rgba(255, 255, 255, 0.75)) 0%, rgba(255, 255, 255, 0.05) 100%);
  pointer-events: none;
}
.mock-icon svg {
  width: 52%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.mock-icon :deep(svg[viewBox='0 0 100 100']) {
  width: 100%;
  height: 100%;
}
.mock-label {
  font-size: 12px;
  color: #b0b0b0;
  letter-spacing: 0.1em;
}

.group {
  margin-bottom: 24px;
}
.group h2 {
  font-size: 14px;
  font-weight: 500;
  color: #2b2b2b;
  margin-bottom: 12px;
  letter-spacing: 0.04em;
}

.swatches,
.swatch-names {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}
.swatch {
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid #ececec;
  cursor: pointer;
  position: relative;
  display: grid;
  place-items: center;
  transition: transform 0.2s ease;
}
.swatch.on {
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 3.5px #2e2e33;
}
.swatch:active {
  transform: scale(0.92);
}
.swatch.upload {
  background: #ffffff;
  border-style: dashed;
  border-color: #cfcfcf;
}
.swatch.upload svg {
  width: 45%;
  fill: none;
  stroke: #8a8a8a;
  stroke-width: 1.8;
  stroke-linecap: round;
}
.swatch-names {
  margin-top: 6px;
  font-size: 10px;
  color: #a8a8a8;
  text-align: center;
  white-space: nowrap;
}

.icon-styles {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.icon-style {
  border: 1px solid #f0f0f0;
  background: #ffffff;
  border-radius: 16px;
  padding: 12px 0 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}
.icon-style.on {
  border-color: #2e2e33;
}
.icon-sample {
  width: 36px;
  height: 36px;
  border-radius: 24%;
  overflow: hidden;
  box-shadow: var(--icon-shadow);
}
.icon-sample :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.icon-name {
  font-size: 11px;
  color: #7a7a7a;
}

.glass-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.glass-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #ebe5dc;
  border-radius: 14px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.22s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.glass-option:active {
  transform: scale(0.98);
}

.glass-option.active {
  background: #fafaf8;
  border-color: #ddd7ce;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.option-content {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.option-icon {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f7f5f1;
  color: #686062;
  display: grid;
  place-items: center;
  transition: all 0.22s ease;
}

.option-icon svg {
  width: 20px;
  height: 20px;
}

.glass-option.active .option-icon {
  background: #ede6da;
  color: #3a3530;
}

.option-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.option-title {
  font-size: 13px;
  font-weight: 500;
  color: #3a3530;
  line-height: 1.2;
}

.option-desc {
  font-size: 12px;
  color: #9b8f85;
  margin-top: 1px;
  line-height: 1.3;
}

.toggle-switch {
  flex: none;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: #e7e2db;
  border: 1px solid #ddd7ce;
  position: relative;
  transition: background 0.22s ease, border-color 0.22s ease;
  margin-left: 10px;
  cursor: pointer;
}

.toggle-switch.checked {
  background: #3a3530;
  border-color: #3a3530;
}

.toggle-handle {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
  transition: transform 0.22s ease;
}

.toggle-switch.checked .toggle-handle {
  transform: translateX(18px);
}

.tints-panel {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e8e3da;
}

.tints-header {
  margin-bottom: 10px;
}

.tints-header span {
  font-size: 12px;
  font-weight: 500;
  color: #4b443e;
}

.tints-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.tint-option {
  border: 1px solid #ece6dd;
  background: #ffffff;
  border-radius: 12px;
  padding: 8px 4px 7px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tint-option:active {
  transform: scale(0.94);
}

.tint-option.active {
  border-color: #3a3530;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tint-color {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.tint-name {
  font-size: 11px;
  font-weight: 500;
  color: #3b3530;
  white-space: nowrap;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.icon-help { margin: -4px 0 12px; color: #999; font-size: 12px; line-height: 1.45; }
.app-icon-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.app-icon-option { min-width: 0; display: grid; justify-items: center; gap: 6px; padding: 14px 8px; border: 1px solid #eee; border-radius: 16px; background: #fff; color: #555; font: inherit; font-size: 13px; cursor: pointer; }
.app-icon-preview { width: 48px; height: 48px; display: grid; place-items: center; overflow: hidden; border-radius: 24%; background-position: center; background-size: cover; box-shadow: 0 4px 14px rgba(40,40,50,.08); }
.app-icon-preview :deep(svg) { width: 100%; height: 100%; }
.app-icon-option small { color: #aaa; font-size: 11px; }
.icon-dialog-mask { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(30,30,34,.28); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.icon-dialog { width: min(100%, 420px); padding: 22px 18px 16px; border: 1px solid #eee; border-radius: 24px; background: #fff; box-shadow: 0 18px 50px rgba(0,0,0,.16); }
.icon-dialog header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.icon-dialog header small { color: #aaa; font-size: 10px; letter-spacing: .18em; }
.icon-dialog header h2 { margin-top: 4px; color: #333; font-size: 18px; font-weight: 500; }
.icon-dialog header button { width: 34px; height: 34px; border: 0; border-radius: 50%; background: #f5f5f5; color: #666; font-size: 24px; line-height: 1; }
.album-pick { width: 100%; min-height: 48px; border: 1px solid #e7e7e7; border-radius: 14px; background: #f9f9f9; color: #333; font-size: 14px; }
.url-row { display: flex; gap: 8px; margin-top: 12px; }
.url-row input { flex: 1; min-width: 0; height: 46px; padding: 0 12px; border: 1px solid #e5e5e5; border-radius: 12px; color: #333; font-size: 16px; }
.url-row button, .icon-dialog footer button { flex: none; padding: 0 14px; border: 0; border-radius: 12px; background: #303036; color: #fff; font-size: 13px; }
.icon-error { margin-top: 9px; color: #b44; font-size: 12px; }
.icon-dialog footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 18px; }
.icon-dialog footer button { min-height: 40px; }
.icon-dialog footer .clear-icon { background: #f2f2f2; color: #666; }

.apply {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 13px 0;
  font-size: 14px;
  letter-spacing: 0.08em;
  background: #2e2e33;
  color: #ffffff;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.apply:disabled {
  background: #f4f4f4;
  color: #a8a8a8;
  cursor: default;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom) + 40px);
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(46, 46, 51, 0.92);
  color: #ffffff;
  font-size: 13px;
  white-space: nowrap;
  backdrop-filter: blur(10px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
