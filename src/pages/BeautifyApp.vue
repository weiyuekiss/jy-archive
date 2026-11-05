<script setup>
import { computed, ref } from 'vue'
import WidgetView from '@/components/widgets/WidgetView.vue'
import PhotoPickerDialog from '@/components/widgets/PhotoPickerDialog.vue'
import { dockApps } from '@/apps'
import BeautifyIcon from '@/components/icons/BeautifyIcon.vue'
import { WIDGET_SIZES, widgetCatalog } from '@/widgets'
import { addWidget, desktopPageCount, setDesktopPageCount } from '@/stores/desktop'
import {
  theme,
  WALLPAPERS,
  ICON_STYLES,
  wallpaperCss,
  iconStyleVars,
  applyTheme,
  compressImageFile
} from '@/stores/theme'

const emit = defineEmits(['close'])

const tabs = [
  { key: 'widgets', label: '桌面小组件' },
  { key: 'themes', label: '壁纸与图标' },
  { key: 'fonts', label: '字体设置' }
]
const activeTab = ref('widgets')
const fontTargets = computed(() => dockApps)
const fontDialogOpen = ref(false)
const fontDraft = ref(theme.chatBeautifyCss || '')
const fontFileInput = ref(null)
const selectorTemplate = `/* Jy OS 聊天界面主题 CSS 参考\n * 仅使用 .chat-app 前缀；建议只调整颜色、间距、圆角、字体和边框。\n */
.chat-app { --chat-theme-bg: #f7f9f8; --chat-theme-accent: #69a77b; --chat-theme-text: #35443a; }
.chat-app .topbar { /* 聊天首页顶栏 */ }
.chat-app .back-button { /* 聊天首页返回 */ }
.chat-app .round-action { /* 聊天首页操作按钮 */ }
.chat-app .conversation-overlay { /* 对话遮罩 */ }
.chat-app .conversation-page { /* 对话页面 */ }
.chat-app .conversation-header { /* 对话顶栏 */ }
.chat-app .conversation-back { /* 对话返回按钮 */ }
.chat-app .conversation-title { /* 对话标题 */ }
.chat-app .conversation-actions { /* 顶栏操作区 */ }
.chat-app .conversation-settings { /* 顶栏更多按钮 */ }
.chat-app .message-list { /* 消息列表 */ }
.chat-app .load-older-messages { /* 加载更早消息按钮 */ }
.chat-app .chat-time-divider { /* 时间分隔 */ }
.chat-app .message-row { /* 消息行 */ }
.chat-app .message-row.me { /* 我发送的消息行 */ }
.chat-app .message-row.them { /* 对方消息行 */ }
.chat-app .tiny-avatar { /* 消息头像 */ }
.chat-app .message-content-stack { /* 消息内容容器 */ }
.chat-app .message-bubble-wrap { /* 消息气泡外层 */ }
.chat-app .message-bubble { /* 普通消息气泡 */ }
.chat-app .quoted-message { /* 引用消息 */ }
.chat-app .message-text { /* 消息正文 */ }
.chat-app .message-reaction { /* 消息反应 */ }
.chat-app .message-selection-check { /* 多选标记 */ }
.chat-app .message-timestamp { /* 消息时间 */ }
.chat-app .transfer-card { /* 转账卡片 */ }
.chat-app .transfer-icon { /* 转账图标 */ }
.chat-app .transfer-copy { /* 转账金额与状态 */ }
.chat-app .text-image-card { /* 文字图卡片 */ }
.chat-app .polaroid-photo { /* 文字图内容底板 */ }
.chat-app .special-card-label { /* 文字图标题 */ }
.chat-app .polaroid-copy { /* 文字图正文 */ }
.chat-app .polaroid-caption { /* 文字图底部说明 */ }
.chat-app .document-file-card { /* 文档卡片 */ }
.chat-app .document-file-icon { /* 文档卡片 W 标识 */ }
.chat-app .document-file-copy { /* 文档名称与说明 */ }
.chat-app .voice-message-card { /* 语音消息卡片 */ }
.chat-app .image-message-card { /* 图片消息卡片 */ }
.chat-app .character-status-card { /* 角色状态卡片 */ }
.chat-app .typing-row { /* 正在输入提示 */ }
.chat-app .reply-status { /* 回复状态提示 */ }
.chat-app .reply-error { /* 回复错误提示 */ }
.chat-app .composer { /* 底部输入区 */ }
.chat-app .quote-compose-preview { /* 回复引用预览 */ }
.chat-app .composer-input-row { /* 输入行 */ }
.chat-app .composer-tool { /* 输入区工具按钮 */ }
.chat-app .composer-add { /* 添加附件按钮 */ }
.chat-app .composer-camera { /* 图片按钮 */ }
.chat-app .composer-field { /* 输入框容器 */ }
.chat-app .composer-field input { /* 消息输入框 */ }
.chat-app .send-button { /* 发送按钮 */ }
.chat-app .composer-mic { /* 语音录制按钮 */ }
.chat-app .receive-button { /* 接听/接收按钮 */ }
.chat-app .attachment-menu { /* 附件菜单 */ }
.chat-app .attachment-menu button { /* 附件菜单按钮 */ }
.chat-app .transfer-compose-dialog { /* 转账编辑弹窗 */ }
.chat-app .text-image-dialog { /* 文字图编辑弹窗 */ }
.chat-app .polaroid-overlay { /* 文字图预览遮罩 */ }
.chat-app .polaroid-expanded { /* 展开的文字图 */ }
.chat-app button { /* 聊天页面按钮通用规则 */ }
`
const htmlTemplate = ref('<div class="bubble">{{ message }}</div>')
const htmlTemplateError = ref('')
const htmlAllowedTags = ['div', 'span', 'p', 'strong', 'em', 'small', 'br']
function validateChatHtml() {
  const source = htmlTemplate.value
  const tags = [...source.matchAll(/<\/?([a-z][a-z0-9-]*)\b[^>]*>/gi)]
  if (/<\s*script|\son[a-z]+\s*=|javascript:|<\s*(iframe|object|embed|style|link)\b/i.test(source)) { htmlTemplateError.value = '模板包含不允许的脚本、事件或外部元素'; return false }
  const invalid = tags.find((match) => !htmlAllowedTags.includes(match[1].toLowerCase()))
  if (invalid) { htmlTemplateError.value = `不支持 <${invalid[1]}> 标签，仅允许：${htmlAllowedTags.join('、')}`; return false }
  htmlTemplateError.value = ''
  return true
}
function copySelectors() { navigator.clipboard?.writeText(selectorTemplate).then(() => showToast('已复制完整 CSS 选择器模板')).catch(() => showToast('复制失败，请检查剪贴板权限')) }
function downloadSelectors() {
  const blob = new Blob([selectorTemplate], { type: 'text/css;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = 'jy-os-chat-theme.css'; link.click(); URL.revokeObjectURL(url)
}
const fontName = (id) => theme.fonts.find((font) => font.id === id)?.name || '系统默认'
const fontFamilyFor = (id) => theme.fonts.find((font) => font.id === id)?.family || 'system-ui, sans-serif'
const chatPreviewStyle = computed(() => ({ fontFamily: fontFamilyFor(theme.fontAssignments.chat) }))
function openCssEditor() { fontDraft.value = theme.chatBeautifyCss || ''; fontDialogOpen.value = true }
function saveBeautifyCss() {
  const css = fontDraft.value.slice(0, 30000)
  const importMatch = css.match(/@import\s+url\(["']?(https:\/\/fontsapi\.zeoseven\.com\/[^"')]+)["']?\)\s*;/i)
  const familyMatch = css.match(/font-family\s*:\s*["']([^"']+)["']/i)
  theme.chatBeautifyCss = css
  if (importMatch && familyMatch) {
    const id = 'zero-planet-custom'
    if (!theme.fonts.some((font) => font.id === id)) theme.fonts.push({ id, name: familyMatch[1], family: familyMatch[1], source: importMatch[1] })
    else Object.assign(theme.fonts.find((font) => font.id === id), { name: familyMatch[1], family: familyMatch[1], source: importMatch[1] })
    theme.fontAssignments.chat = id
  }
  fontDialogOpen.value = false
  showToast('字体与聊天美化 CSS 已保存')
}
function clearBeautifyCss() { theme.chatBeautifyCss = ''; fontDraft.value = ''; showToast('已清除聊天美化 CSS') }
function importFont(e) {
  const file = e.target.files?.[0]; e.target.value = ''
  if (!file) return
  if (!/\.(woff2?|ttf|otf)$/i.test(file.name) || file.size > 5 * 1024 * 1024) { showToast('请选择 5MB 内的 WOFF、TTF 或 OTF 字体'); return }
  const reader = new FileReader()
  reader.onerror = () => showToast('字体读取失败')
  reader.onload = () => {
    const id = `font-${Date.now()}`
    const family = `JyFont${Date.now()}`
    theme.fonts.push({ id, name: file.name, family, data: reader.result })
    theme.fontAssignments.chat = id
    showToast('字体已导入并应用到聊天')
  }
  reader.readAsDataURL(file)
}
function removeFont(font) {
  theme.fonts = theme.fonts.filter((item) => item.id !== font.id)
  for (const appId of Object.keys(theme.fontAssignments)) if (theme.fontAssignments[appId] === font.id) delete theme.fontAssignments[appId]
}
function applyZeroPlanet() {
  fontDraft.value = `@import url("https://fontsapi.zeoseven.com/995/main/result.css");\n\nbody {\n    font-family: "Z Labs RoundPix 12px M CN";\n    font-weight: normal;\n}`
  fontDialogOpen.value = true
}
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
})

const previewStyle = computed(() => ({
  background: wallpaperCss(draft.value.wallpaper, draft.value.customImage),
  ...iconStyleVars(draft.value.iconStyle)
}))

const isApplied = computed(
  () =>
    draft.value.wallpaper === theme.wallpaper &&
    draft.value.iconStyle === theme.iconStyle &&
    draft.value.customImage === theme.customImage &&
    JSON.stringify(customIconDraft.value) === JSON.stringify(theme.customIcons || {})
)

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
      <div class="group page-setting">
        <div>
          <h2>桌面页数</h2>
          <p>可在桌面左右边缘拖动图标或小组件切换页面</p>
        </div>
        <div class="page-count-control" role="group" aria-label="设置桌面页数">
          <button type="button" aria-label="减少桌面页数" :disabled="desktopPageCount <= 1" @click="setDesktopPageCount(desktopPageCount - 1)">−</button>
          <strong>{{ desktopPageCount }} <small>页</small></strong>
          <button type="button" aria-label="增加桌面页数" :disabled="desktopPageCount >= 5" @click="setDesktopPageCount(desktopPageCount + 1)">＋</button>
        </div>
      </div>
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
            <WidgetView type="date-card" />
          </div>

          <div class="mock-grid">
            <div
              v-for="(g, i) in glyphs.slice(0, 4)"
              :key="i"
              class="mock-icon"
            >
              <svg viewBox="0 0 24 24"><path :d="g" /></svg>
            </div>
          </div>
          <div class="mock-dock">
            <div class="mock-icon"><BeautifyIcon /></div>
            <div
              v-for="g in glyphs.slice(0, 3)"
              :key="g"
              class="mock-icon"
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

    <!-- 字体设置分区 -->
    <section v-if="activeTab === 'fonts'" class="section font-section">
      <div class="group">
        <h2>各 App 全局字体</h2>
        <p class="font-help">为每个应用单独选择已导入字体；聊天预览会即时展示当前字体。</p>
        <label v-for="app in fontTargets" :key="app.id" class="font-app-row">
          <span>{{ app.name }}</span>
          <select v-model="theme.fontAssignments[app.id]">
            <option value="">系统默认</option>
            <option v-for="font in theme.fonts" :key="font.id" :value="font.id">{{ font.name }}</option>
          </select>
        </label>
      </div>
      <div class="group">
        <h2>字体预览</h2>
        <div class="font-preview" :style="{ fontFamily: fontFamilyFor(theme.fontAssignments.chat) }"><strong>你好，世界</strong><span>The quick brown fox · 012345</span><small>当前聊天字体：{{ fontName(theme.fontAssignments.chat) }}</small></div>
      </div>
      <div class="group">
        <h2>聊天界面美化</h2>
        <p class="font-help">覆盖聊天顶栏、气泡、输入区、转账与文字图等元素。CSS 参考模板可复制或下载。</p>
        <div class="beautify-actions"><button type="button" @click="applyZeroPlanet">零点行星字体 CSS</button><button type="button" @click="openCssEditor">编辑自定义 CSS</button></div>
        <div class="beautify-actions selector-actions"><button type="button" @click="copySelectors">复制完整选择器</button><button type="button" @click="downloadSelectors">下载 CSS 模板</button></div>
        <div class="chat-style-preview" :style="chatPreviewStyle"><span class="preview-bubble">你好，今天也要保持好心情。</span><span class="preview-bubble mine">当然！</span><small>聊天界面预览 · {{ theme.chatBeautifyCss ? '已配置样式' : '默认样式' }}</small></div>
        <button v-if="theme.chatBeautifyCss" class="manage-css" type="button" @click="clearBeautifyCss">移除当前聊天美化</button>
      </div>
      <div class="group">
        <h2>HTML 组件模板</h2>
        <p class="font-help">可编辑受限的消息片段模板。仅允许 div、span、p、strong、em、small、br 标签；禁止脚本、事件属性和外链。</p>
        <textarea class="html-template-input" v-model="htmlTemplate" aria-label="HTML 组件模板" @input="validateChatHtml"></textarea>
        <p v-if="htmlTemplateError" class="html-error" role="alert">{{ htmlTemplateError }}</p>
        <div class="html-preview" v-if="!htmlTemplateError"><strong>模板预览</strong><code>{{ htmlTemplate.replaceAll('&#123;&#123; message &#125;&#125;', '这是一条预览消息') }}</code></div>
      </div>
        <div class="group">
      <h2>字体管理</h2>
        <button class="font-import" type="button" @click="fontFileInput?.click()">＋ 导入字体文件</button>
        <input ref="fontFileInput" type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" hidden @change="importFont" />
        <div v-if="theme.fonts.length" class="font-list"><div v-for="font in theme.fonts" :key="font.id"><span>{{ font.name }}</span><button type="button" @click="removeFont(font)">删除</button></div></div>
        <p v-else class="font-help">尚未导入字体。支持 WOFF、WOFF2、TTF、OTF，单文件最大 5MB。</p>
      </div>
    </section>

    <div v-if="fontDialogOpen" class="css-editor-mask" @click.self="fontDialogOpen = false">
      <section class="css-editor" role="dialog" aria-modal="true" aria-label="聊天界面 CSS 编辑器">
        <header><div><small>CHAT CUSTOMIZATION</small><h2>聊天界面 CSS</h2></div><button type="button" aria-label="关闭" @click="fontDialogOpen = false">×</button></header>
        <p>请使用 .chat-app 作为选择器前缀，样式仅用于聊天界面。</p>
        <textarea v-model="fontDraft" spellcheck="false" aria-label="自定义聊天 CSS" placeholder=".chat-app {\n  font-family: sans-serif;\n}"></textarea>
        <footer><button type="button" @click="fontDialogOpen = false">取消</button><button type="button" @click="saveBeautifyCss">保存并应用</button></footer>
      </section>
    </div>

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
.font-section {
  padding: 22px 20px calc(40px + env(safe-area-inset-bottom));
  background: #f7f9f8;
}
.font-section .group {
  margin: 0 0 16px;
  padding: 18px;
  border: 1px solid #edf0ee;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(37, 69, 53, .035);
}
.font-section .group h2 {
  margin: 0 0 8px;
  color: #293b32;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: .01em;
}
.font-help { margin: 0 0 12px; color: #929b95; font-size: 12px; line-height: 1.6; }
.font-app-row {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #f0f2f0;
  color: #45534b;
  font-size: 13px;
}
.font-app-row select {
  max-width: 58%;
  min-width: 120px;
  padding: 9px 30px 9px 12px;
  border: 1px solid #e8ece9;
  border-radius: 11px;
  outline: 0;
  background: #f8faf8;
  color: #4b5b51;
  font: inherit;
}
.font-app-row select:focus { border-color: #9bc9ad; box-shadow: 0 0 0 3px #eaf5ed; }
.font-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 17px;
  border: 1px solid #edf1ee;
  border-radius: 15px;
  background: linear-gradient(135deg, #fbfdfb, #f3f8f4);
  color: #3b4c42;
}
.font-preview strong { font-size: 21px; font-weight: 600; }
.font-preview span { font-size: 13px; color: #728078; }
.font-preview small,.chat-style-preview small { color: #9aa49d; font-size: 11px; }
.beautify-actions { display: flex; gap: 9px; margin: 12px 0; }
.beautify-actions button,.font-import {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #dcebe0;
  border-radius: 12px;
  background: #edf7f0;
  color: #39734d;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.beautify-actions button:last-child { background: #f3f5f4; border-color: #e8ece9; color: #58645c; }
.selector-actions { margin-top: -2px; }
.html-template-input { width: 100%; min-height: 150px; resize: vertical; padding: 13px; border: 1px solid #e7ece8; border-radius: 13px; outline: 0; background: #f8faf8; color: #405247; font: 12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace; }
.html-template-input:focus { border-color: #a8ccb3; box-shadow: 0 0 0 3px #edf6ef; }
.html-error { margin: 8px 0 0; color: #bb5d57; font-size: 12px; }
.html-preview { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; color: #647168; font-size: 12px; }
.html-preview code { padding: 12px; border-radius: 11px; background: #f4f7f4; color: #526057; white-space: pre-wrap; overflow-wrap: anywhere; }
.beautify-actions button:active,.font-import:active { transform: scale(.98); }
.chat-style-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 1px solid #edf1ee;
  border-radius: 15px;
  background: #fafcfa;
}
.preview-bubble { max-width: 86%; padding: 10px 13px; border-radius: 15px 15px 15px 5px; background: #f0f2f0; color: #465149; font-size: 13px; }
.preview-bubble.mine { align-self: flex-end; border-radius: 15px 15px 5px 15px; background: #e4f2e8; color: #3d684a; }
.manage-css { margin-top: 11px; padding: 7px 0; border: 0; background: none; color: #89938c; font-size: 12px; cursor: pointer; }
.font-import { width: 100%; margin: 4px 0 12px; background: #f4f6f5; border-color: #e9eeea; color: #59675e; }
.font-list { display: flex; flex-direction: column; }
.font-list > div { min-height: 46px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f0f2f0; color: #526057; font-size: 12px; }
.font-list button { padding: 6px 10px; border: 0; border-radius: 9px; background: #f5f6f5; color: #929a94; font-size: 11px; cursor: pointer; }
.css-editor-mask { position: fixed; inset: 0; z-index: 45; display: flex; align-items: center; justify-content: center; padding: 18px; background: rgba(27, 42, 33, .28); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
.css-editor { width: min(760px, 100%); height: min(88dvh, 820px); display: flex; flex-direction: column; padding: 20px; border: 1px solid rgba(255,255,255,.8); border-radius: 24px; background: #fff; box-shadow: 0 24px 80px rgba(26, 52, 37, .18); }
.css-editor header { display: flex; align-items: center; justify-content: space-between; padding: 0 0 14px; border-bottom: 1px solid #edf0ee; }
.css-editor header small { color: #85a18e; font-size: 9px; letter-spacing: .15em; }
.css-editor header h2 { margin: 4px 0 0; color: #304238; font-size: 18px; }
.css-editor header button { width: 34px; height: 34px; border: 0; border-radius: 50%; background: #f2f5f3; color: #78847c; font-size: 23px; cursor: pointer; }
.css-editor > p { margin: 12px 0; color: #8a958d; font-size: 12px; }
.css-editor textarea { flex: 1; min-height: 0; resize: none; padding: 16px; border: 1px solid #e7ece8; border-radius: 14px; outline: 0; background: #f8faf8; color: #3e5145; font: 13px/1.7 ui-monospace, SFMono-Regular, Consolas, monospace; tab-size: 2; }
.css-editor textarea:focus { border-color: #a8ccb3; box-shadow: 0 0 0 3px #edf6ef; }
.css-editor footer { display: flex; justify-content: flex-end; gap: 9px; padding-top: 14px; }
.css-editor footer button { min-height: 40px; padding: 0 16px; border: 1px solid #e8ece9; border-radius: 12px; background: #f5f7f5; color: #68736b; font-size: 12px; cursor: pointer; }
.css-editor footer button:last-child { border-color: #4f8b61; background: #5a986b; color: #fff; }
@media (max-width: 420px) {
  .font-section { padding-right: 15px; padding-left: 15px; }
  .font-section .group { padding: 15px; border-radius: 17px; }
  .beautify-actions { flex-direction: column; }
  .beautify-actions button { width: 100%; }
  .css-editor { height: calc(100dvh - 32px); padding: 16px; border-radius: 20px; }
}
</style>

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

.page-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 16px;
  margin: 0 0 20px;
  border: 1px solid #eeeeef;
  border-radius: 16px;
  background: #fafafa;
}
.page-setting h2 { margin: 0 0 5px; font-size: 14px; font-weight: 550; color: #333; }
.page-setting p { margin: 0; color: #999; font-size: 11px; line-height: 1.5; }
.page-count-control { display: flex; align-items: center; gap: 12px; white-space: nowrap; }
.page-count-control button { width: 30px; height: 30px; border: 1px solid #e7e7e7; border-radius: 50%; color: #454545; background: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
.page-count-control button:disabled { opacity: .35; cursor: default; }
.page-count-control strong { min-width: 35px; text-align: center; font-size: 15px; font-weight: 550; }
.page-count-control small { color: #888; font-size: 11px; font-weight: 400; }

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
  background: linear-gradient(135deg, rgba(255,255,255,.86), rgba(250,250,250,.72));
  border: 0;
  border-radius: 24px;
  padding: 12px 14px;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
  box-shadow: 0 7px 22px rgba(70,72,78,.055);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
  backdrop-filter: blur(18px) saturate(1.15);
}

.glass-option:active {
  transform: scale(0.98);
}

.glass-option.active {
  background: linear-gradient(135deg, rgba(255,255,255,.94), rgba(247,248,249,.82));
  box-shadow: 0 7px 22px rgba(70,72,78,.07);
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
  border-radius: 12px;
  background: #f0f1f2;
  color: #66676b;
  display: grid;
  place-items: center;
  transition: all 0.22s ease;
}

.option-icon svg {
  width: 20px;
  height: 20px;
}

.glass-option.active .option-icon {
  background: #e8eaec;
  color: #4f5054;
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
