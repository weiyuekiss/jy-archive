<script setup>
// 拍立得图片设置弹窗：支持图片链接 / 从相册选择，低饱和韩风白色系
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // 当前已设置的图片（url 或 dataURL）
  modelValue: { type: String, default: '' },
  title: { type: String, default: '设置照片' },
  eyebrow: { type: String, default: 'CUSTOMIZE' },
  kind: { type: String, default: 'image' },
  placeholder: { type: String, default: '输入主页文案' }
})
const emit = defineEmits(['save', 'close'])

const tab = ref('album') // 'album' | 'url'
const dateInput = ref(/^\\d{4}-\\d{2}-\\d{2}$/.test(props.modelValue) ? props.modelValue : '')
const textInput = ref(props.modelValue)
const urlInput = ref(props.modelValue.startsWith('http') ? props.modelValue : '')
const albumImage = ref(props.modelValue.startsWith('data:') ? props.modelValue : '')
const loading = ref(false)
const error = ref('')
const previewFailed = ref(false)
const fileEl = ref(null)

// 只允许 http(s) 链接，避免 javascript: 等协议
const validUrl = computed(() => {
  try {
    const u = new URL(urlInput.value.trim())
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : ''
  } catch {
    return ''
  }
})

const preview = computed(() => (tab.value === 'url' ? validUrl.value : albumImage.value))
const canSave = computed(() => props.kind === 'date' ? !!dateInput.value : props.kind === 'text' ? !!textInput.value.trim() : !!preview.value && !previewFailed.value && !loading.value)

watch([tab, validUrl], () => {
  previewFailed.value = false
  error.value = ''
})

function pickFile() {
  fileEl.value?.click()
}

// 读取相册图片并压缩，避免 dataURL 过大撑爆 localStorage
async function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  loading.value = true
  error.value = ''
  try {
    albumImage.value = await compressImage(file, 1080, 0.85)
    previewFailed.value = false
  } catch {
    error.value = '图片读取失败，换一张试试'
  } finally {
    loading.value = false
  }
}

function compressImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(src)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(src)
      reject(new Error('load failed'))
    }
    img.src = src
  })
}

function onPreviewError() {
  previewFailed.value = true
  if (tab.value === 'url') error.value = '图片加载失败，请检查链接'
}

function save() {
  if (props.kind === 'date') {
    if (canSave.value) emit('save', dateInput.value)
    return
  }
  if (props.kind === 'text') {
    if (canSave.value) emit('save', textInput.value.trim())
    return
  }
  if (canSave.value) emit('save', preview.value)
}
function clearPhoto() {
  emit('save', '')
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="mask" @click.self="emit('close')">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="pp-title">
        <header class="head">
          <span class="eyebrow">{{ props.eyebrow }}</span>
          <h2 id="pp-title">{{ props.title }}</h2>
          <button class="close" aria-label="关闭" @click="emit('close')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <!-- 预览：拍立得小样 -->
        <div class="preview-card">
        <div v-if="props.kind === 'date'" class="preview-date">已经在一起 {{ dateInput ? Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(`${dateInput}T00:00:00`)) / 86400000) + 1) : 0 }} 天</div>
          <div v-else-if="props.kind === 'text'" class="preview-text">{{ textInput || '输入主页文案' }}</div>
          <div v-else class="preview-photo">
            <img v-if="preview && !previewFailed" :src="preview" alt="照片预览" @error="onPreviewError" />
            <span v-else-if="loading" class="hint">读取中…</span>
            <span v-else class="hint">还没有照片</span>
          </div>
          <span class="preview-caption">my little moment ♡</span>
        </div>

        <div v-if="props.kind === 'date'" class="pane">
          <label class="field">
            <span class="sr-only">在一起的日期</span>
            <input v-model="dateInput" type="date" :max="new Date().toISOString().slice(0, 10)" />
          </label>
        </div>
        <div v-else-if="props.kind === 'text'" class="pane">
          <label class="field">
            <span class="sr-only">主页文案</span>
            <textarea v-model="textInput" rows="3" maxlength="160" :placeholder="props.placeholder" @keydown.ctrl.enter="save" @keydown.meta.enter="save" />
          </label>
        </div>

        <!-- 来源切换 -->
        <div v-else class="tabs" role="tablist">
          <button role="tab" :aria-selected="tab === 'album'" :class="{ on: tab === 'album' }" @click="tab = 'album'">相册</button>
          <button role="tab" :aria-selected="tab === 'url'" :class="{ on: tab === 'url' }" @click="tab = 'url'">图片链接</button>
        </div>

        <div v-if="props.kind !== 'date' && tab === 'album'" class="pane">
          <button class="pick" @click="pickFile">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="M3 17l5-5 4 4 3-3 6 6" />
            </svg>
            {{ albumImage ? '重新选择' : '从相册选择' }}
          </button>
          <input ref="fileEl" type="file" accept="image/*" hidden @change="onFileChange" />
        </div>

        <div v-else-if="props.kind !== 'date'" class="pane">
          <label class="field">
            <span class="sr-only">图片链接</span>
            <input
              v-model="urlInput"
              type="url"
              inputmode="url"
              placeholder="https://example.com/photo.jpg"
              autocomplete="off"
              @keydown.enter="save"
            />
          </label>
        </div>

        <p v-if="error" class="error" role="alert">{{ error }}</p>

        <footer class="actions">
          <button v-if="modelValue" class="ghost" @click="clearPhoto">移除照片</button>
          <span class="spacer" />
          <button class="ghost" @click="emit('close')">取消</button>
          <button class="primary" :disabled="!canSave" @click="save">保存</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(60, 56, 52, 0.18);
  backdrop-filter: blur(6px);
  animation: fade 0.2s ease;
}
.sheet {
  width: 100%;
  max-width: 420px;
  margin: 0 12px 16px;
  padding: 22px 20px 18px;
  border-radius: 28px;
  background: #fbfaf8;
  border: 1px solid #efebe6;
  box-shadow: 0 20px 50px rgba(80, 70, 60, 0.12);
  color: #57524d;
  animation: rise 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@media (min-height: 640px) {
  .mask { align-items: center; }
}

.head {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: #b5aca3;
}
.head h2 {
  font-size: 18px;
  font-weight: 500;
  color: #4a4541;
}
.close {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #f1eee9;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.close svg {
  width: 14px;
  stroke: #8f877f;
  stroke-width: 1.8;
  stroke-linecap: round;
}

/* 预览 */
.preview-card {
  width: 58%;
  margin: 0 auto 18px;
  padding: 8px 8px 0;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(80, 70, 60, 0.08);
  rotate: -2deg;
}
.preview-date{padding:28px 8px;text-align:center;color:#6f6861;font-size:14px}
.preview-text{padding:18px 10px;min-height:86px;display:grid;place-items:center;text-align:center;overflow-wrap:anywhere;color:#6f6861;font-size:14px;line-height:1.5}
.preview-photo {
  aspect-ratio: 1;
  border-radius: 3px;
  overflow: hidden;
  background: linear-gradient(160deg, #eeebe6, #e2ddd6);
  display: grid;
  place-items: center;
}
.preview-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hint {
  font-size: 12px;
  color: #aaa198;
}
.preview-caption {
  display: block;
  padding: 8px 0 10px;
  text-align: center;
  font-size: 12px;
  color: #8f877f;
  font-family: 'Segoe Print', 'Comic Sans MS', cursive;
}

/* 切换 */
.tabs {
  display: flex;
  padding: 4px;
  margin-bottom: 14px;
  border-radius: 999px;
  background: #f1eee9;
}
.tabs button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 0;
  border-radius: 999px;
  font-size: 13px;
  color: #9a918a;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.tabs button.on {
  background: #fff;
  color: #4a4541;
  box-shadow: 0 2px 6px rgba(80, 70, 60, 0.08);
}

.pane {
  min-height: 48px;
}
.pick {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1.5px dashed #dcd5cc;
  border-radius: 16px;
  background: #fff;
  color: #6f6861;
  font-size: 14px;
  cursor: pointer;
}
.pick svg {
  width: 18px;
  fill: none;
  stroke: #a59c92;
  stroke-width: 1.5;
  stroke-linejoin: round;
}
.field input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid #e8e3dc;
  border-radius: 16px;
  background: #fff;
  color: #4a4541;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.field textarea {
  width: 100%;
  min-height: 92px;
  padding: 12px 16px;
  resize: vertical;
  border: 1px solid #e8e3dc;
  border-radius: 16px;
  background: #fff;
  color: #4a4541;
  font: inherit;
  font-size: 16px;
  line-height: 1.45;
  outline: none;
  -webkit-user-select: text;
  user-select: text;
}
.field input::placeholder, .field textarea::placeholder {
  color: #c2bab1;
}
.field input:focus, .field textarea:focus {
  border-color: #c9bfb3;
}

.error {
  margin-top: 10px;
  font-size: 12px;
  color: #b08b80;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
}
.spacer {
  flex: 1;
}
.actions button {
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
}
.ghost {
  border: none;
  background: transparent;
  color: #9a918a;
}
.primary {
  border: none;
  background: #5c5650;
  color: #fbfaf8;
}
.primary:disabled {
  background: #d9d3cc;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid #c9bfb3;
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@keyframes fade {
  from { opacity: 0; }
}
@keyframes rise {
  from { opacity: 0; transform: translateY(24px); }
}
</style>
