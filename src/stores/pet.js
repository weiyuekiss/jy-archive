import { reactive, ref } from 'vue'
import { loadValue, saveValue } from './db'

// 桌宠设置保存在 IndexedDB 中
const STORAGE_KEY = 'jyos_pet_settings'

export const DEFAULT_PET_NAME = '小白'
export const DEFAULT_PET_PERSONA = '说话简短可爱，爱吐槽，偶尔撒娇。'
export const DEFAULT_IMAGE_MODEL = 'gpt-image-1'
export const DEFAULT_IMAGE_STYLE = '可爱的 Q 版桌宠形象，全身，正面居中，纯白色背景，平涂风格，线条干净，没有文字、边框和投影。'

export const petSettings = reactive({
  enabled: false,
  x: null,
  y: null,
  // 'left' | 'right' | null：半身收进的屏幕边，null 表示停在屏幕中间
  edge: null,
  // 对话使用的 API 预设 id，空字符串时跟随设置里的当前预设
  apiPresetId: '',
  // 允许桌宠读取聊天记录（默认关闭，涉及隐私）
  readChat: false,
  // 小白的回复用语音朗读
  voiceOutput: false,
  // 朗读使用的系统音色名称，空字符串时用第一个中文音色
  voiceName: '',
  // 聊天有新消息时主动吐槽（需要同时开启 readChat）
  proactive: false,
  // 名字与人格
  name: DEFAULT_PET_NAME,
  persona: DEFAULT_PET_PERSONA,
  // 朗读音调与语速（0.5–2）
  pitch: 1.3,
  rate: 1.05,
  // 已保存的形象列表，每项 { id, name, dataUrl, createdAt }
  images: [],
  // 当前使用的形象 id，空字符串时显示默认白猫
  activeImageId: '',
  // 画图：使用哪个 API 预设、哪个模型、默认风格提示词
  imageApiPresetId: '',
  imageModel: DEFAULT_IMAGE_MODEL,
  imageStylePrompt: DEFAULT_IMAGE_STYLE,
  // 画图方式：'image' 调用图片接口生图；'code' 让模型写 SVG 代码，应用渲染成图片
  drawMode: 'code'
})

// ChatApp 打开的聊天 id，供桌宠读取当前聊天内容
export const currentChatId = ref('')

let loadPromise = null

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function cleanImages(list) {
  if (!Array.isArray(list)) return []
  return list
    .filter((item) => item && typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:image/'))
    .map((item) => ({
      id: String(item.id),
      name: String(item.name || '形象').slice(0, 12),
      dataUrl: item.dataUrl,
      createdAt: Number(item.createdAt) || 0
    }))
}

export function loadPetSettings() {
  if (!loadPromise) {
    loadPromise = loadValue(STORAGE_KEY).then((saved) => {
      if (!saved || typeof saved !== 'object') return
      petSettings.enabled = Boolean(saved.enabled)
      petSettings.x = Number.isFinite(saved.x) ? saved.x : null
      petSettings.y = Number.isFinite(saved.y) ? saved.y : null
      petSettings.edge = saved.edge === 'left' || saved.edge === 'right' ? saved.edge : null
      petSettings.apiPresetId = typeof saved.apiPresetId === 'string' ? saved.apiPresetId : ''
      petSettings.readChat = Boolean(saved.readChat)
      petSettings.voiceOutput = Boolean(saved.voiceOutput)
      petSettings.voiceName = typeof saved.voiceName === 'string' ? saved.voiceName : ''
      petSettings.proactive = Boolean(saved.proactive)
      petSettings.name = typeof saved.name === 'string' && saved.name.trim() ? saved.name.trim().slice(0, 12) : DEFAULT_PET_NAME
      petSettings.persona = typeof saved.persona === 'string' && saved.persona.trim() ? saved.persona.trim().slice(0, 300) : DEFAULT_PET_PERSONA
      petSettings.pitch = clampNumber(saved.pitch, 0.5, 2, 1.3)
      petSettings.rate = clampNumber(saved.rate, 0.5, 2, 1.05)

      const images = cleanImages(saved.images)
      // 旧版本只保存一张形象，迁移进列表
      if (!images.length && typeof saved.image === 'string' && saved.image.startsWith('data:image/')) {
        images.push({ id: `img-${Date.now()}`, name: '形象 1', dataUrl: saved.image, createdAt: Date.now() })
      }
      petSettings.images = images
      petSettings.activeImageId = images.some((item) => item.id === saved.activeImageId)
        ? saved.activeImageId
        : (images[0]?.id || '')

      petSettings.imageApiPresetId = typeof saved.imageApiPresetId === 'string' ? saved.imageApiPresetId : ''
      petSettings.imageModel = typeof saved.imageModel === 'string' && saved.imageModel.trim()
        ? saved.imageModel.trim().slice(0, 60)
        : DEFAULT_IMAGE_MODEL
      petSettings.imageStylePrompt = typeof saved.imageStylePrompt === 'string' && saved.imageStylePrompt.trim()
        ? saved.imageStylePrompt.trim().slice(0, 300)
        : DEFAULT_IMAGE_STYLE
      petSettings.drawMode = saved.drawMode === 'image' ? 'image' : 'code'
    })
  }
  return loadPromise
}

// 新增一张形象并设为当前使用的形象，返回新形象的 id
export function addPetImage(dataUrl, name) {
  const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  petSettings.images.push({
    id,
    name: name || `形象 ${petSettings.images.length + 1}`,
    dataUrl,
    createdAt: Date.now()
  })
  petSettings.activeImageId = id
  return id
}

// 删除形象；如果删的是当前形象，就切到列表里的第一张，列表空了则回到默认白猫
export function removePetImage(id) {
  const index = petSettings.images.findIndex((item) => item.id === id)
  if (index === -1) return
  petSettings.images.splice(index, 1)
  if (petSettings.activeImageId === id) {
    petSettings.activeImageId = petSettings.images[0]?.id || ''
  }
}

export function persistPetSettings() {
  return saveValue(STORAGE_KEY, JSON.parse(JSON.stringify(petSettings)))
}
