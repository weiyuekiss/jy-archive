<script setup>
// 桌宠自定义：形象图片、名字、人格、音色、音调、语速，并可以试听
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PixelWhiteCat from '@/components/PixelWhiteCat.vue'
import {
  petSettings,
  persistPetSettings,
  addPetImage,
  removePetImage,
  DEFAULT_PET_NAME,
  DEFAULT_PET_PERSONA,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_IMAGE_STYLE
} from '@/stores/pet'
import { apiSettings } from '@/stores/settings'
import { generatePetImage } from '@/components/pet/generatePetImage'
import { generatePetSvg } from '@/components/pet/generatePetSvg'

const emit = defineEmits(['back', 'toast'])

const IMAGE_MAX_EDGE = 360
const voices = ref([])
const imageInput = ref(null)
const previewing = ref(false)
const drawPrompt = ref('')
const drawing = ref(false)
const drawError = ref('')
let drawController = null

const drawPresetChoices = computed(() => apiSettings.presets)
const drawPreset = computed(() =>
  apiSettings.presets.find((p) => p.id === petSettings.imageApiPresetId) || apiSettings.presets.find((p) => p.id === apiSettings.currentPresetId) || apiSettings.presets[0]
)
const activeImage = computed(() => petSettings.images.find((item) => item.id === petSettings.activeImageId) || null)

// 画图模型只能从所选预设拉取到的模型里选，不再手填
const drawModelChoices = computed(() => drawPreset.value?.models || [])
const drawModelName = computed(() => petSettings.imageModel || drawPreset.value?.model || '')

function setDrawModel(model) {
  petSettings.imageModel = model
  persistPetSettings()
}

function setDrawMode(mode) {
  petSettings.drawMode = mode
  persistPetSettings()
}

function setDrawPreset(id) {
  petSettings.imageApiPresetId = id
  persistPetSettings()
}

function saveDrawConfig() {
  petSettings.imageModel = (petSettings.imageModel || '').trim().slice(0, 60) || DEFAULT_IMAGE_MODEL
  petSettings.imageStylePrompt = (petSettings.imageStylePrompt || '').trim().slice(0, 300) || DEFAULT_IMAGE_STYLE
  persistPetSettings()
  emit('toast', '画图设置已保存')
}

function resetStylePrompt() {
  petSettings.imageStylePrompt = DEFAULT_IMAGE_STYLE
  persistPetSettings()
}

// 用户的要求 + 默认风格提示词，组成最终提示词
function buildDrawPrompt(request) {
  return `${petSettings.imageStylePrompt}\n形象要求：${request}`
}

async function drawImage() {
  const request = drawPrompt.value.trim()
  if (!request || drawing.value) return
  drawError.value = ''
  drawing.value = true
  drawController = new AbortController()
  try {
    const dataUrl = petSettings.drawMode === 'code'
      ? await generatePetSvg({
        preset: drawPreset.value,
        model: drawModelName.value,
        request,
        stylePrompt: petSettings.imageStylePrompt,
        signal: drawController.signal
      })
      : await generatePetImage({
        preset: drawPreset.value,
        model: petSettings.imageModel,
        prompt: buildDrawPrompt(request),
        signal: drawController.signal
      })
    addPetImage(dataUrl, request.slice(0, 8))
    await persistPetSettings()
    drawPrompt.value = ''
    emit('toast', '新形象已生成并设为当前')
  } catch (error) {
    drawError.value = `生成失败：${error.message}`
  } finally {
    drawing.value = false
    drawController = null
  }
}

function cancelDraw() {
  drawController?.abort()
}

function useImage(id) {
  petSettings.activeImageId = id
  persistPetSettings()
}

function deleteImage(id) {
  removePetImage(id)
  persistPetSettings()
  emit('toast', '形象已删除')
}

function useDefaultCat() {
  petSettings.activeImageId = ''
  persistPetSettings()
}

const zhVoices = computed(() => voices.value.filter((v) => v.lang?.toLowerCase().startsWith('zh')))
const selectedVoice = computed(() => zhVoices.value.find((v) => v.name === petSettings.voiceName) || zhVoices.value[0] || null)

function refreshVoices() {
  if (!('speechSynthesis' in window)) return
  voices.value = window.speechSynthesis.getVoices()
}

function chooseImage() {
  imageInput.value?.click()
}

// 保留透明通道：输出 PNG，不转 JPEG
function onImageSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      addPetImage(canvas.toDataURL('image/png'), file.name.replace(/\.[^.]+$/, '').slice(0, 8))
      persistPetSettings()
      emit('toast', '形象已导入并设为当前')
    }
    img.onerror = () => emit('toast', '图片无法读取，请换一张')
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}


function saveNameAndPersona() {
  petSettings.name = (petSettings.name || '').trim().slice(0, 12) || DEFAULT_PET_NAME
  petSettings.persona = (petSettings.persona || '').trim().slice(0, 300) || DEFAULT_PET_PERSONA
  persistPetSettings()
  emit('toast', '人格已保存')
}

function setVoice(name) {
  petSettings.voiceName = name
  persistPetSettings()
}

function saveVoiceParams() {
  persistPetSettings()
}

// 试听：用当前音色、音调和语速读一句示例
function preview() {
  if (!('speechSynthesis' in window)) {
    emit('toast', '当前浏览器不支持语音播报')
    return
  }
  const utterance = new SpeechSynthesisUtterance(`你好呀，我是${petSettings.name || DEFAULT_PET_NAME}，今天也要好好的。`)
  if (selectedVoice.value) utterance.voice = selectedVoice.value
  utterance.lang = 'zh-CN'
  utterance.pitch = petSettings.pitch
  utterance.rate = petSettings.rate
  utterance.onstart = () => { previewing.value = true }
  utterance.onend = () => { previewing.value = false }
  utterance.onerror = () => { previewing.value = false }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

onMounted(() => {
  refreshVoices()
  window.speechSynthesis?.addEventListener?.('voiceschanged', refreshVoices)
})

onUnmounted(() => {
  window.speechSynthesis?.removeEventListener?.('voiceschanged', refreshVoices)
  window.speechSynthesis?.cancel()
})
</script>

<template>
  <div class="ios-subpage">
    <nav class="ios-nav">
      <button type="button" class="ios-back" aria-label="返回设置" @click="emit('back')">‹</button>
      <span class="ios-page-title">桌宠</span>
    </nav>

    <div class="ios-main ios-group-wrap">
      <p class="ios-section-label">形象</p>
      <section class="ios-group">
        <div class="ios-field pet-current">
          <span class="pet-image-preview">
            <img v-if="activeImage" :src="activeImage.dataUrl" :alt="`当前形象：${activeImage.name}`" />
            <PixelWhiteCat v-else class="pet-default" aria-hidden="true" />
          </span>
          <span class="pet-image-actions">
            <span class="pet-current-name">{{ activeImage ? activeImage.name : '默认白猫' }}</span>
            <button v-if="activeImage" type="button" class="ios-field-action" @click="useDefaultCat">换回默认白猫</button>
          </span>
        </div>
        <div v-if="petSettings.images.length" class="pet-gallery">
          <div v-for="item in petSettings.images" :key="item.id" class="pet-thumb" :class="{ 'is-on': item.id === petSettings.activeImageId }">
            <button type="button" class="pet-thumb-pick" :aria-label="`使用形象 ${item.name}`" @click="useImage(item.id)">
              <img :src="item.dataUrl" :alt="item.name" />
            </button>
            <span class="pet-thumb-name">{{ item.name }}</span>
            <button type="button" class="pet-thumb-del" :aria-label="`删除形象 ${item.name}`" @click="deleteImage(item.id)">删除</button>
          </div>
        </div>
        <div class="ios-field">
          <span>导入图片</span>
          <button type="button" class="ios-field-action" @click="chooseImage">选择透明 PNG/WebP</button>
          <input ref="imageInput" type="file" accept="image/png,image/webp,image/gif" class="backup-file-input" @change="onImageSelected" />
        </div>
      </section>
      <p class="ios-hint">导入的图片会缩到 360px 以内，保留透明底。</p>

      <p class="ios-section-label">让模型画形象</p>
      <section class="ios-group">
        <div class="ios-field ios-field-long">
          <span>画图方式</span>
          <div class="pet-chips">
            <button type="button" class="ios-chip" :class="{ 'is-on': petSettings.drawMode === 'code' }" @click="setDrawMode('code')">代码画图（SVG）</button>
            <button type="button" class="ios-chip" :class="{ 'is-on': petSettings.drawMode === 'image' }" @click="setDrawMode('image')">图片生成</button>
          </div>
        </div>
        <div class="ios-field ios-field-long">
          <span>画图预设</span>
          <div class="pet-chips">
            <button
              v-for="preset in drawPresetChoices"
              :key="preset.id"
              type="button"
              class="ios-chip"
              :class="{ 'is-on': drawPreset?.id === preset.id }"
              @click="setDrawPreset(preset.id)"
            >{{ preset.name }}</button>
          </div>
        </div>
        <div class="ios-field ios-field-long">
          <span>画图模型</span>
          <div class="pet-chips">
            <button
              v-for="model in drawModelChoices"
              :key="model"
              type="button"
              class="ios-chip"
              :class="{ 'is-on': drawModelName === model }"
              @click="setDrawModel(model)"
            >{{ model }}</button>
          </div>
          <p v-if="!drawModelChoices.length" class="ios-hint pet-model-empty">该预设还没有拉取模型列表，请先到 API 配置里点「获取模型列表」。</p>
        </div>
        <label class="ios-field ios-field-long">
          <span>默认风格</span>
          <textarea v-model="petSettings.imageStylePrompt" class="ios-textarea pet-style" maxlength="300" />
        </label>
      </section>
      <div class="pet-form-actions pet-style-actions">
        <button type="button" class="ios-btn" @click="resetStylePrompt">恢复默认风格</button>
        <button type="button" class="ios-btn ios-btn-primary" @click="saveDrawConfig">保存画图设置</button>
      </div>

      <section class="ios-group pet-draw-group">
        <label class="ios-field ios-field-long">
          <span>你想要的形象</span>
          <textarea v-model="drawPrompt" class="ios-textarea pet-request" maxlength="200" placeholder="比如：戴蓝色围巾的小狐狸，眼睛大大的" />
        </label>
      </section>
      <div class="pet-form-actions">
        <button v-if="!drawing" type="button" class="ios-btn ios-btn-primary" :disabled="!drawPrompt.trim()" @click="drawImage">生成形象</button>
        <button v-else type="button" class="ios-btn" @click="cancelDraw">生成中…（点此取消）</button>
      </div>
      <p v-if="drawError" class="pet-draw-error">{{ drawError }}</p>
      <p class="ios-hint">生成的形象会加入上面的列表，并自动设为当前。不满意可以删除。画图会消耗所选预设的额度，生成通常需要几十秒。</p>

      <p class="ios-section-label">人格</p>
      <section class="ios-group">
        <label class="ios-field">
          <span>名字</span>
          <input v-model="petSettings.name" class="ios-input" type="text" maxlength="12" placeholder="小白" />
        </label>
        <label class="ios-field ios-field-long">
          <span>人格设定</span>
          <textarea v-model="petSettings.persona" class="ios-textarea pet-persona" maxlength="300" placeholder="比如：毒舌但很护短，喜欢用颜文字" />
        </label>
      </section>
      <div class="pet-form-actions">
        <button type="button" class="ios-btn ios-btn-primary" @click="saveNameAndPersona">保存名字与人格</button>
      </div>

      <p class="ios-section-label">声音</p>
      <section class="ios-group">
        <div class="ios-field">
          <span>音色</span>
          <span class="pet-voice-count">{{ zhVoices.length ? `${zhVoices.length} 个中文音色` : '没有找到中文音色' }}</span>
        </div>
        <div v-if="zhVoices.length" class="pet-voice-list">
          <button
            v-for="voice in zhVoices"
            :key="voice.name"
            type="button"
            class="ios-chip"
            :class="{ 'is-on': selectedVoice?.name === voice.name }"
            @click="setVoice(voice.name)"
          >{{ voice.name }}</button>
        </div>
        <label class="ios-field pet-slider-field">
          <span>音调 {{ petSettings.pitch.toFixed(2) }}</span>
          <input v-model.number="petSettings.pitch" type="range" min="0.5" max="2" step="0.05" @change="saveVoiceParams" />
        </label>
        <label class="ios-field pet-slider-field">
          <span>语速 {{ petSettings.rate.toFixed(2) }}</span>
          <input v-model.number="petSettings.rate" type="range" min="0.5" max="2" step="0.05" @change="saveVoiceParams" />
        </label>
      </section>
      <div class="pet-form-actions">
        <button type="button" class="ios-btn" :disabled="previewing" @click="preview">{{ previewing ? '播放中…' : '试听' }}</button>
      </div>
      <p class="ios-hint">音色取决于系统里装了哪些语音包。iPhone 可在「设置 > 辅助功能 > 朗读内容 > 声音」里下载更多中文音色，下载后返回这里刷新。</p>
    </div>
  </div>
</template>

<style scoped>
.pet-image-field { align-items: center; }
.pet-image-preview {
  flex: none;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: repeating-conic-gradient(#f2f2f7 0% 25%, #fff 0% 50%) 50% / 12px 12px;
  overflow: hidden;
}
.pet-image-preview img,
.pet-default { width: 100%; height: 100%; object-fit: contain; }
.pet-image-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.pet-reset { color: #ff3b30; }
.pet-form-actions { margin: 10px 16px 0; }
.pet-voice-count { color: #8e8e93; font-size: 14px; }
.pet-voice-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px 12px; background: #fff; }
.ios-chip.is-on { background: #0a84ff; color: #fff; }
.pet-slider-field { flex-direction: column; align-items: stretch; gap: 8px; }
.pet-slider-field input[type="range"] { width: 100%; accent-color: #0a84ff; }
.pet-persona { min-height: 96px; }
.pet-current { align-items: center; }
.pet-current-name { font-size: 15px; color: #000; }
.pet-gallery { display: flex; gap: 10px; padding: 10px 14px; overflow-x: auto; background: #fff; border-top: .5px solid #e2e2e7; }
.pet-thumb { flex: none; width: 76px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.pet-thumb-pick {
  width: 68px;
  height: 68px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 14px;
  background: repeating-conic-gradient(#f2f2f7 0% 25%, #fff 0% 50%) 50% / 12px 12px;
  overflow: hidden;
  cursor: pointer;
}
.pet-thumb.is-on .pet-thumb-pick { border-color: #0a84ff; }
.pet-thumb-pick img { width: 100%; height: 100%; object-fit: contain; display: block; }
.pet-thumb-name { max-width: 76px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: #8e8e93; }
.pet-thumb-del { border: 0; background: none; color: #ff3b30; font-size: 12px; cursor: pointer; }
.pet-style { min-height: 80px; font-size: 14px; }
.pet-request { min-height: 84px; }
.pet-style-actions { display: flex; flex-direction: column; gap: 10px; }
.pet-draw-group { margin-top: 10px; }
.pet-draw-error { margin: 10px 18px 0; color: #ff3b30; font-size: 13px; line-height: 1.5; }
.pet-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.ios-btn:disabled { opacity: .45; cursor: default; }
</style>
