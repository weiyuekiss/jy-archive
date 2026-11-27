<script setup>
// 世界书应用：关键词触发的背景资料，与 SillyTavern 世界书的字段对应（关键词、内容、常驻、顺序）。
import { computed, onMounted, ref } from 'vue'
import { BookOpen, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-vue-next'
import { lorebook, loadLorebook, saveEntry, deleteEntry, saveSettings, saveFolder, deleteFolder, moveEntry } from '@/stores/lorebook'

const emit = defineEmits(['close'])

// view: 'list' 条目列表 | 'edit' 编辑条目
const view = ref('list')
const draft = ref(null)
const error = ref('')
const confirmDelete = ref(false)
const toast = ref('')
let toastTimer = null

// 文件夹状态：openFolderId 为空表示在世界书根目录
const openFolderId = ref('')
const folderDialog = ref(null) // { mode: 'create' | 'rename', id, name }
const folderError = ref('')
const confirmFolderDelete = ref(false)
const dragState = ref(null) // { entry, x, y }，长按后才有值
const dropTarget = ref('') // 文件夹 id，或 '__root' 表示移回根目录
const LONG_PRESS_MS = 350
const LONG_PRESS_SLOP = 8
let pressTimer = null
let pressStart = null // { x, y, pointerId, entry, el }
let suppressOpen = false // 刚拖动结束，忽略紧接着的点击，避免误开条目

const openFolder = computed(() => lorebook.folders.find((f) => f.id === openFolderId.value) || null)
const folderIdSet = computed(() => new Set(lorebook.folders.map((f) => f.id)))
// 当前视图的条目：在文件夹里只显示该文件夹的条目；在根目录显示不属于任何文件夹的条目
const entries = computed(() => [...lorebook.entries]
  .filter((e) => (openFolder.value ? e.folderId === openFolder.value.id : !folderIdSet.value.has(e.folderId)))
  .sort((a, b) => a.order - b.order))
const isNew = computed(() => !draft.value?.id || !lorebook.entries.some((e) => e.id === draft.value.id))

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 1800)
}

function keysPreview(entry) {
  if (entry.constant) return '常驻，始终注入'
  return entry.keys.length ? entry.keys.join('、') : '未设置关键词'
}

function openNew() {
  error.value = ''
  draft.value = { id: '', bookId: lorebook.books[0]?.id || '', folderId: openFolder.value?.id || '', name: '', keysText: '', content: '', enabled: true, constant: false, order: 100 }
  view.value = 'edit'
}

function openEntry(entry) {
  if (suppressOpen) return
  error.value = ''
  draft.value = { ...entry, keysText: entry.keys.join('，') }
  view.value = 'edit'
}

function backToList() {
  view.value = 'list'
  draft.value = null
  error.value = ''
  confirmDelete.value = false
}

async function toggleEnabled(entry) {
  await saveEntry({ ...entry, enabled: !entry.enabled })
}

async function save() {
  error.value = ''
  const keys = draft.value.keysText.split(/[,，\n]/).map((k) => k.trim()).filter(Boolean)
  try {
    await saveEntry({
      id: draft.value.id,
      bookId: draft.value.bookId,
      folderId: draft.value.folderId,
      name: draft.value.name,
      keys,
      content: draft.value.content,
      enabled: draft.value.enabled,
      constant: draft.value.constant,
      order: Number(draft.value.order),
    })
    showToast('已保存')
    backToList()
  } catch (e) {
    error.value = e.message
  }
}

async function removeEntry() {
  await deleteEntry(draft.value.id)
  confirmDelete.value = false
  showToast('已删除')
  backToList()
}

async function updateSetting(key, value) {
  await saveSettings({ ...lorebook.settings, [key]: Number(value) })
  showToast('设置已保存')
}

function countIn(folderId) {
  return lorebook.entries.filter((e) => e.folderId === folderId).length
}
function closeFolder() {
  openFolderId.value = ''
  confirmFolderDelete.value = false
}
function openFolderDialog(mode) {
  folderError.value = ''
  folderDialog.value = mode === 'create'
    ? { mode, id: '', name: '' }
    : { mode, id: openFolder.value.id, name: openFolder.value.name }
}
async function submitFolder() {
  folderError.value = ''
  const { mode, id, name } = folderDialog.value
  try {
    await saveFolder({ id, name })
    folderDialog.value = null
    showToast(mode === 'create' ? '已新建文件夹' : '已重命名')
  } catch (e) {
    folderError.value = e.message
  }
}
async function removeFolder() {
  await deleteFolder(openFolderId.value)
  confirmFolderDelete.value = false
  openFolderId.value = ''
  showToast('已删除文件夹')
}

// 长按拖动条目：按住 LONG_PRESS_MS 后进入拖动；期间移动超过阈值则视为滑动，交给页面滚动
function cancelPress() {
  clearTimeout(pressTimer)
  pressTimer = null
  pressStart = null
}
function onEntryPointerDown(event, entry) {
  if (event.button > 0 || event.target.closest('.lb-switch')) return
  cancelPress()
  pressStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, entry, el: event.currentTarget }
  pressTimer = setTimeout(() => {
    const start = pressStart
    if (!start) return
    try { start.el.setPointerCapture(start.pointerId) } catch { /* 指针已结束则忽略 */ }
    dragState.value = { entry: start.entry, x: start.x, y: start.y }
    suppressOpen = true
    pressStart = null
    pressTimer = null
    if (navigator.vibrate) navigator.vibrate(10)
  }, LONG_PRESS_MS)
}
function onPointerMove(event) {
  if (pressStart && event.pointerId === pressStart.pointerId
    && Math.abs(event.clientX - pressStart.x) + Math.abs(event.clientY - pressStart.y) > LONG_PRESS_SLOP) cancelPress()
  if (!dragState.value) return
  dragState.value = { ...dragState.value, x: event.clientX, y: event.clientY }
  const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]')
  dropTarget.value = hit?.dataset.drop || ''
}
async function onPointerUp() {
  cancelPress()
  if (!dragState.value) return
  const { entry } = dragState.value
  const target = dropTarget.value
  dragState.value = null
  dropTarget.value = ''
  setTimeout(() => { suppressOpen = false }, 300)
  if (!target) return
  const folderId = target === '__root' ? '' : target
  if (folderId === (entry.folderId || '')) return
  try {
    await moveEntry(entry.id, folderId)
    const folder = lorebook.folders.find((f) => f.id === folderId)
    showToast(folder ? `已移入「${folder.name}」` : '已移回世界书')
  } catch (e) {
    showToast(e.message)
  }
}
function onPointerCancel() {
  cancelPress()
  dragState.value = null
  dropTarget.value = ''
}

onMounted(() => { void loadLorebook() })
</script>

<template>
  <div class="lb-app" role="dialog" aria-modal="true" aria-label="世界书" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerCancel">
    <header class="lb-nav">
      <button v-if="view === 'list' && !openFolder" type="button" class="lb-glass-btn" aria-label="返回桌面" @click="emit('close')"><ChevronLeft :size="22" :stroke-width="2" /></button>
      <button v-else-if="view === 'list'" type="button" class="lb-glass-btn" aria-label="返回世界书" @click="closeFolder"><ChevronLeft :size="22" :stroke-width="2" /></button>
      <button v-else type="button" class="lb-glass-btn" aria-label="返回列表" @click="backToList"><ChevronLeft :size="22" :stroke-width="2" /></button>
      <span class="lb-nav-title">{{ view === 'list' ? (openFolder ? openFolder.name : '') : (isNew ? '新建条目' : '编辑条目') }}</span>
      <button v-if="view === 'list'" type="button" class="lb-glass-btn" aria-label="新建条目" @click="openNew"><Plus :size="20" :stroke-width="2" /></button>
      <button v-else type="button" class="lb-text-btn" :disabled="!draft.name.trim()" @click="save">保存</button>
    </header>

    <main v-if="view === 'list'" class="lb-scroll">
      <template v-if="!openFolder">
        <h1 class="lb-large-title">世界书</h1>
        <p class="lb-lead">关键词出现在最近的对话里时，对应的背景资料会被注入给角色。</p>
        <p class="lb-section-label">文件夹</p>
        <section class="lb-folder-grid" aria-label="文件夹">
          <button v-for="folder in lorebook.folders" :key="folder.id" type="button" class="lb-folder-tile" :class="{ 'is-drop': dropTarget === folder.id }" :data-drop="folder.id" @click="openFolderId = folder.id">
            <svg class="lb-folder-svg" viewBox="0 0 48 40" aria-hidden="true"><path d="M2 5a3 3 0 0 1 3-3h11l4 4h23a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#E0A82E"/><path d="M2 13a3 3 0 0 1 3-3h38a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="#FFD76A"/></svg>
            <span class="lb-folder-name">{{ folder.name }}</span>
            <span class="lb-folder-count">{{ countIn(folder.id) }} 个条目</span>
          </button>
          <button type="button" class="lb-folder-tile" @click="openFolderDialog('create')">
            <span class="lb-folder-new" aria-hidden="true"><Plus :size="26" :stroke-width="1.8" /></span>
            <span class="lb-folder-name">新建文件夹</span>
          </button>
        </section>
        <p class="lb-section-label">条目</p>
      </template>
      <template v-else>
        <div class="lb-explorer-bar">
          <button type="button" class="lb-up" :class="{ 'is-drop': dropTarget === '__root' }" data-drop="__root" @click="closeFolder"><ChevronLeft :size="16" :stroke-width="2" /><span>世界书</span></button>
          <span class="lb-path-sep" aria-hidden="true">›</span>
          <strong class="lb-path-name">{{ openFolder.name }}</strong>
          <span class="lb-bar-spacer"></span>
          <button type="button" class="lb-bar-btn" @click="openFolderDialog('rename')">重命名</button>
          <button type="button" class="lb-bar-btn danger" @click="confirmFolderDelete = true">删除</button>
        </div>
        <p class="lb-folder-hint">长按条目可以拖动。拖到上方「世界书」即可移出文件夹。</p>
      </template>

      <section class="lb-group" aria-label="条目">
        <template v-if="entries.length">
          <div v-for="entry in entries" :key="entry.id" class="lb-row lb-row-entry" :class="{ 'is-dragging': dragState?.entry.id === entry.id }" @pointerdown="onEntryPointerDown($event, entry)" @contextmenu.prevent>
            <button type="button" class="lb-row-main" @click="openEntry(entry)">
              <span class="lb-row-icon"><BookOpen :size="16" :stroke-width="2" /></span>
              <span class="lb-row-text">
                <strong>{{ entry.name }}</strong>
                <small>{{ keysPreview(entry) }}</small>
              </span>
              <ChevronRight class="lb-chevron" :size="18" :stroke-width="2.2" aria-hidden="true" />
            </button>
            <label class="lb-switch" :aria-label="`启用 ${entry.name}`">
              <input type="checkbox" :checked="entry.enabled" @change="toggleEnabled(entry)" />
              <span></span>
            </label>
          </div>
        </template>
        <div v-else class="lb-empty">
          <BookOpen :size="28" :stroke-width="1.6" />
          <p>还没有条目。点右上角的 + 添加第一条背景资料。</p>
        </div>
      </section>

      <p class="lb-section-label">扫描设置</p>
      <section class="lb-group">
        <label class="lb-row lb-row-form">
          <span class="lb-row-text"><strong>扫描最近消息数</strong><small>关键词只在最近这些条消息里查找</small></span>
          <input class="lb-num" type="number" min="1" max="50" :value="lorebook.settings.scanDepth" @change="updateSetting('scanDepth', $event.target.value)" />
        </label>
        <label class="lb-row lb-row-form">
          <span class="lb-row-text"><strong>注入字数上限</strong><small>超出的条目会被跳过</small></span>
          <input class="lb-num lb-num-wide" type="number" min="100" max="20000" step="100" :value="lorebook.settings.budget" @change="updateSetting('budget', $event.target.value)" />
        </label>
      </section>
    </main>

    <main v-else class="lb-scroll">
      <p class="lb-section-label">名称</p>
      <section class="lb-group">
        <label class="lb-row lb-row-form">
          <input v-model="draft.name" class="lb-input" maxlength="60" placeholder="例如：雾港的历史" />
        </label>
      </section>

      <p class="lb-section-label">触发关键词</p>
      <section class="lb-group">
        <label class="lb-row lb-row-form lb-row-multi">
          <textarea v-model="draft.keysText" class="lb-textarea-short" rows="2" placeholder="用逗号或换行分隔，例如：雾港，灯塔" :disabled="draft.constant"></textarea>
        </label>
      </section>
      <p class="lb-footnote">任一关键词出现即触发。大小写不敏感。</p>

      <p class="lb-section-label">内容</p>
      <section class="lb-group">
        <label class="lb-row lb-row-form lb-row-multi">
          <textarea v-model="draft.content" class="lb-textarea" rows="10" maxlength="4000" placeholder="写下这条背景资料……角色会把它当作事实来理解。"></textarea>
        </label>
      </section>

      <p class="lb-section-label">选项</p>
      <section class="lb-group">
        <label class="lb-row">
          <span class="lb-row-text"><strong>启用</strong></span>
          <span class="lb-switch"><input type="checkbox" v-model="draft.enabled" /><span></span></span>
        </label>
        <label class="lb-row">
          <span class="lb-row-text"><strong>常驻</strong><small>开启后不看关键词，每次都注入</small></span>
          <span class="lb-switch"><input type="checkbox" v-model="draft.constant" /><span></span></span>
        </label>
        <label class="lb-row lb-row-form">
          <span class="lb-row-text"><strong>顺序</strong><small>数字越小越先注入</small></span>
          <input v-model="draft.order" class="lb-num" type="number" step="1" />
        </label>
      </section>

      <p v-if="error" class="lb-error">{{ error }}</p>

      <section v-if="!isNew" class="lb-group">
        <button type="button" class="lb-row lb-row-danger" @click="confirmDelete = true"><Trash2 :size="17" :stroke-width="2" /><span>删除条目</span></button>
      </section>
    </main>

    <transition name="lb-fade">
      <div v-if="confirmDelete" class="lb-alert-mask" @click.self="confirmDelete = false">
        <section class="lb-alert" role="alertdialog" aria-modal="true" aria-labelledby="lb-del-title">
          <h2 id="lb-del-title">删除这个条目？</h2>
          <p>删除后无法恢复。</p>
          <div class="lb-alert-btns">
            <button type="button" @click="confirmDelete = false">取消</button>
            <button type="button" class="danger" @click="removeEntry">删除</button>
          </div>
        </section>
      </div>
    </transition>

    <div v-if="dragState" class="lb-ghost" :style="{ left: dragState.x + 'px', top: dragState.y + 'px' }">{{ dragState.entry.name }}</div>

    <transition name="lb-fade">
      <div v-if="folderDialog" class="lb-alert-mask" @click.self="folderDialog = null">
        <section class="lb-alert" role="dialog" aria-modal="true" aria-labelledby="lb-folder-dialog-title">
          <h2 id="lb-folder-dialog-title">{{ folderDialog.mode === 'create' ? '新建文件夹' : '重命名文件夹' }}</h2>
          <input v-model="folderDialog.name" class="lb-alert-input" maxlength="40" placeholder="文件夹名字" @keydown.enter="submitFolder" />
          <p v-if="folderError" class="lb-error">{{ folderError }}</p>
          <div class="lb-alert-btns">
            <button type="button" @click="folderDialog = null">取消</button>
            <button type="button" @click="submitFolder">保存</button>
          </div>
        </section>
      </div>
    </transition>

    <transition name="lb-fade">
      <div v-if="confirmFolderDelete" class="lb-alert-mask" @click.self="confirmFolderDelete = false">
        <section class="lb-alert" role="alertdialog" aria-modal="true" aria-labelledby="lb-folder-del-title">
          <h2 id="lb-folder-del-title">删除这个文件夹？</h2>
          <p>文件夹会被删除，里面的条目会回到世界书列表，不会丢失。</p>
          <div class="lb-alert-btns">
            <button type="button" @click="confirmFolderDelete = false">取消</button>
            <button type="button" class="danger" @click="removeFolder">删除</button>
          </div>
        </section>
      </div>
    </transition>

    <transition name="lb-fade">
      <div v-if="toast" class="lb-toast" role="status">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
/* 世界书：iOS 26 风格。毛玻璃导航、大标题、圆角分组列表、系统蓝与系统红。所有类名带 lb- 前缀。 */
.lb-app{position:fixed;inset:0;z-index:42;display:flex;flex-direction:column;overflow:hidden;background:#f2f2f7;color:#000;font-family:-apple-system,"SF Pro Text","PingFang SC","Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.lb-nav{position:relative;z-index:2;flex:none;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top) + 10px) 12px 10px;background:rgba(242,242,247,.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:.5px solid rgba(0,0,0,.12)}
.lb-nav-title{text-align:center;font-size:17px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lb-glass-btn{width:36px;height:36px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:0 1px 3px rgba(0,0,0,.08);color:#0a84ff;cursor:pointer}
.lb-glass-btn:active{transform:scale(.94)}
.lb-text-btn{justify-self:end;padding:6px 4px;border:0;background:none;font:inherit;font-size:17px;font-weight:600;color:#0a84ff;cursor:pointer}
.lb-text-btn:disabled{opacity:.35;cursor:default}
.lb-scroll{flex:1;min-height:0;overflow-y:auto;padding:0 16px calc(env(safe-area-inset-bottom) + 40px);-webkit-overflow-scrolling:touch}
.lb-large-title{margin:18px 4px 4px;font-size:34px;font-weight:700;line-height:1.15;letter-spacing:.2px}
.lb-lead{margin:0 4px 16px;font-size:13px;line-height:1.5;color:#8e8e93}
.lb-section-label{margin:20px 18px 8px;font-size:13px;color:#8e8e93;text-transform:none}
.lb-footnote{margin:8px 18px 0;font-size:12px;line-height:1.5;color:#8e8e93}
.lb-group{overflow:hidden;margin:0 0 4px;border-radius:14px;background:#fff;box-shadow:0 .5px 0 rgba(0,0,0,.04)}
.lb-row{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:10px 14px;box-sizing:border-box;border:0;background:#fff;text-align:left;font:inherit;font-size:17px;color:#000;cursor:default}
.lb-row+.lb-row,.lb-row-entry+.lb-row-entry{border-top:.5px solid #e2e2e7}
.lb-row-main{display:flex;align-items:center;gap:12px;flex:1;min-width:0;min-height:52px;padding:0;border:0;background:transparent;font:inherit;text-align:left;cursor:pointer}
.lb-row-main:active{opacity:.5}
.lb-row-entry{padding-right:14px}
.lb-row-icon{flex:none;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;background:#0a84ff;color:#fff}
.lb-row-text{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.lb-row-text strong{font-size:17px;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lb-row-text small{font-size:13px;color:#8e8e93;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lb-chevron{flex:none;color:#c4c4c9}
.lb-row-form{align-items:center}
.lb-row-multi{align-items:stretch;padding:10px 14px}
.lb-row-danger{justify-content:center;gap:8px;color:#ff3b30;cursor:pointer}
.lb-row-danger:active{background:#f2f2f7}
.lb-input{flex:1;min-width:0;height:36px;padding:0;border:0;outline:0;background:transparent;font:inherit;font-size:17px;color:#000}
.lb-input::placeholder,.lb-textarea::placeholder,.lb-textarea-short::placeholder{color:#c7c7cc}
.lb-textarea,.lb-textarea-short{width:100%;box-sizing:border-box;padding:0;border:0;outline:0;background:transparent;font:inherit;font-size:17px;line-height:1.5;color:#000;resize:vertical}
.lb-textarea{min-height:200px}
.lb-textarea-short{min-height:44px}
.lb-textarea-short:disabled{color:#c7c7cc}
.lb-num{width:88px;height:32px;padding:0 8px;box-sizing:border-box;border:0;border-radius:8px;background:#f2f2f7;font:inherit;font-size:16px;color:#000;text-align:right;outline:0}
.lb-num-wide{width:110px}
.lb-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 20px;color:#8e8e93;text-align:center}
.lb-empty p{margin:0;font-size:14px;line-height:1.5}
.lb-switch{position:relative;flex:none;width:51px;height:31px;display:inline-block}
.lb-switch input{position:absolute;inset:0;margin:0;opacity:0;cursor:pointer;z-index:1}
.lb-switch span{position:absolute;inset:0;border-radius:16px;background:#e9e9eb;transition:background .2s;pointer-events:none}
.lb-switch span::after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.2);transition:transform .2s}
.lb-switch input:checked+span{background:#34c759}
.lb-switch input:checked+span::after{transform:translateX(20px)}
.lb-error{margin:12px 18px 0;font-size:13px;color:#ff3b30}
.lb-alert-mask{position:fixed;inset:0;z-index:70;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.28)}
.lb-alert{width:min(100%,290px);overflow:hidden;padding:20px 16px 0;border-radius:18px;background:rgba(250,250,252,.97);box-shadow:0 14px 40px rgba(0,0,0,.18);text-align:center;box-sizing:border-box}
.lb-alert h2{margin:0 0 6px;font-size:17px;font-weight:600}
.lb-alert p{margin:0 0 14px;font-size:13px;color:#3c3c43}
.lb-alert-btns{display:grid;grid-template-columns:1fr 1fr;margin:0 -16px;border-top:.5px solid #d1d1d6}
.lb-alert-btns button{height:44px;border:0;background:transparent;font:inherit;font-size:17px;color:#0a84ff;cursor:pointer}
.lb-alert-btns button+button{border-left:.5px solid #d1d1d6}
.lb-alert-btns button.danger{color:#ff3b30;font-weight:600}
.lb-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 28px);transform:translateX(-50%);z-index:80;padding:10px 16px;border-radius:999px;background:rgba(28,28,30,.88);color:#fff;font-size:14px;white-space:nowrap;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.lb-fade-enter-active,.lb-fade-leave-active{transition:opacity .2s}
.lb-fade-enter-from,.lb-fade-leave-to{opacity:0}
/* 文件夹：Windows 10 资源管理器风格。白底网格、黄色文件夹图标、悬停和拖入时浅蓝框。 */
.lb-folder-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:2px;margin:0 0 4px;padding:8px;border-radius:14px;background:#fff;font-family:"Segoe UI","Microsoft YaHei",sans-serif}
.lb-folder-tile{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;padding:8px 4px;border:1px solid transparent;border-radius:3px;background:transparent;font:inherit;color:#000;cursor:pointer}
.lb-folder-tile:hover{background:rgba(204,232,255,.35);border-color:rgba(153,209,255,.7)}
.lb-folder-tile.is-drop{background:rgba(204,232,255,.8);border-color:#3399ff}
.lb-folder-svg{width:52px;height:43px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.15))}
.lb-folder-new{display:grid;place-items:center;width:52px;height:43px;border:1px dashed #9a9a9e;border-radius:4px;color:#555}
.lb-folder-name{max-width:100%;font-size:12px;line-height:1.3;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lb-folder-count{font-size:11px;color:#666}
.lb-explorer-bar{display:flex;align-items:center;gap:6px;min-height:40px;margin:8px 0 0;padding:4px 8px;border-radius:10px;background:#fff;font-family:"Segoe UI","Microsoft YaHei",sans-serif;font-size:13px;color:#000}
.lb-up{display:flex;align-items:center;gap:2px;flex:none;padding:4px 6px;border:1px solid transparent;border-radius:3px;background:transparent;font:inherit;color:#000;cursor:pointer}
.lb-up:hover{background:rgba(204,232,255,.35)}
.lb-up.is-drop{background:rgba(204,232,255,.8);border-color:#3399ff}
.lb-path-sep{color:#777}
.lb-path-name{min-width:0;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.lb-bar-spacer{flex:1}
.lb-bar-btn{flex:none;padding:4px 8px;border:1px solid transparent;border-radius:3px;background:transparent;font:inherit;color:#0067c0;cursor:pointer}
.lb-bar-btn:hover{background:rgba(204,232,255,.35);border-color:rgba(153,209,255,.7)}
.lb-bar-btn.danger{color:#c42b1c}
.lb-folder-hint{margin:8px 18px 0;font-size:12px;line-height:1.5;color:#8e8e93}
.lb-row-entry{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
.lb-row-entry.is-dragging{opacity:.4}
.lb-ghost{position:fixed;z-index:90;max-width:60vw;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.94);box-shadow:0 6px 18px rgba(0,0,0,.18);font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;transform:translate(-50%,-60%)}
.lb-alert-input{display:block;width:100%;box-sizing:border-box;height:36px;margin:0 0 12px;padding:0 10px;border:1px solid #c6c6c8;border-radius:8px;background:#fff;font:inherit;font-size:16px;outline:0}
.lb-alert .lb-error{margin:0 0 10px}
</style>
