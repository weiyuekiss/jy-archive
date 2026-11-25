<script setup>
// 全局桌宠：白猫半身收在屏幕边，点击弹出快捷面板，可以用所选 API 预设对话
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import PixelWhiteCat from '@/components/PixelWhiteCat.vue'
import { petSettings, currentChatId, loadPetSettings, persistPetSettings } from '@/stores/pet'
import { apiSettings, profileSettings, persistApiSettings, selectUserProfile, getCurrentPreset } from '@/stores/settings'
import { openApp } from '@/stores/desktop'
import { loadValue } from '@/stores/db'
import { homeApps } from '@/apps'

const PET_SIZE = 72
const PEEK = 30 // 半身收进屏幕边时露出的宽度
const SNAP_DISTANCE = 14 // 松手时离边缘小于这个距离才吸附
const DRAG_THRESHOLD = 6
const TOP_LIMIT = 56
const BOTTOM_LIMIT = 96

const IDLE_LINES = [
  '今天也要好好吃饭哦',
  '喵～要不要摸摸我',
  '这里的档案好多呀',
  '我在这里守着你',
  '记得喝水呀',
  '今天过得怎么样？'
]

const POKE_LINES = [
  '哎呀，别戳我啦',
  '喵！被发现了',
  '呼噜呼噜～',
  '嘿嘿，好舒服',
  '我在认真发呆呢'
]

// 系统提示词随用户设置的名字和人格变化，不再写死
function buildSystemPrompt() {
  return [
    `你是 JY Archive 应用里的桌宠，名字叫${petSettings.name}。`,
    `你的人格：${petSettings.persona}`,
    '每次回复不超过三句。',
    '你可以帮用户解答怎么使用这个应用的问题。应用的页面有：聊天、人物、设置、美化。',
    '如果提供了用户正在看的聊天内容，可以像旁观者一样轻松吐槽或调侃，但不要编造聊天里没有的内容。'
  ].join('\n')
}

const bubble = ref('')
const bubbleKey = ref(0)
const poking = ref(false)
const dragging = ref(false)
const menuOpen = ref(false)
const chatOpen = ref(false)
const question = ref('')
const asking = ref(false)
const askError = ref('')
const chatLog = ref([])
const messageList = ref(null)
const listening = ref(false)
const zhVoices = ref([])
let recognition = null
let proactiveTimer = 0
let lastSeenKey = ''
let lastProactiveAt = 0
const PROACTIVE_INTERVAL = 60 * 1000
const PROACTIVE_COOLDOWN = 10 * 60 * 1000

let lastLine = ''
let bubbleTimer = 0
let pokeTimer = 0
let idleTimer = 0
let drag = null
let askController = null

// ---- 位置与半身收边 ----

function clampY(y) {
  const maxY = window.innerHeight - PET_SIZE - BOTTOM_LIMIT
  return Math.min(Math.max(TOP_LIMIT, y), Math.max(TOP_LIMIT, maxY))
}

// 自由拖动时 x 限制在屏幕内
function clampFreeX(x) {
  return Math.min(Math.max(0, x), Math.max(0, window.innerWidth - PET_SIZE))
}

function edgeX(edge) {
  return edge === 'left' ? -(PET_SIZE - PEEK) : window.innerWidth - PEEK
}

// 只有松手时离屏幕边很近才吸附并半露，离边远的话停在原地
function snapToEdge() {
  const x = petSettings.x ?? 0
  if (x <= SNAP_DISTANCE) {
    petSettings.edge = 'left'
  } else if (x + PET_SIZE >= window.innerWidth - SNAP_DISTANCE) {
    petSettings.edge = 'right'
  } else {
    petSettings.edge = null
    petSettings.x = clampFreeX(x)
    return
  }
  petSettings.x = edgeX(petSettings.edge)
}

function ensurePosition() {
  if (petSettings.y === null) petSettings.y = window.innerHeight - 260
  petSettings.y = clampY(petSettings.y)
  if (petSettings.edge === 'left' || petSettings.edge === 'right') {
    petSettings.x = edgeX(petSettings.edge)
  } else {
    petSettings.x = clampFreeX(petSettings.x ?? window.innerWidth - PET_SIZE - 16)
  }
}

// 当前选中的自定义形象，没有选中时为 null，显示默认白猫
const activeImage = computed(() => petSettings.images.find((item) => item.id === petSettings.activeImageId) || null)

const petStyle = computed(() => ({
  transform: `translate3d(${petSettings.x ?? 0}px, ${petSettings.y ?? 0}px, 0)`
}))

// 猫在左边时面板往右展开，在右边时往左展开
// 不在边缘时，根据猫在屏幕左半还是右半决定面板朝向
const panelSide = computed(() => {
  if (petSettings.edge === 'left') return 'is-right'
  if (petSettings.edge === 'right') return 'is-left'
  return (petSettings.x ?? 0) < window.innerWidth / 2 ? 'is-right' : 'is-left'
})

// ---- 气泡与台词 ----

function pickLine(lines) {
  let line = lines[Math.floor(Math.random() * lines.length)]
  if (lines.length > 1 && line === lastLine) {
    line = lines[(lines.indexOf(line) + 1) % lines.length]
  }
  lastLine = line
  return line
}

function showBubble(text, duration) {
  window.clearTimeout(bubbleTimer)
  bubble.value = text
  bubbleKey.value += 1
  bubbleTimer = window.setTimeout(() => { bubble.value = '' }, duration)
}

function scheduleIdle() {
  window.clearTimeout(idleTimer)
  if (!petSettings.enabled) return
  const delay = 60000 + Math.random() * 90000
  idleTimer = window.setTimeout(() => {
    if (!dragging.value && !bubble.value && !menuOpen.value && !chatOpen.value) {
      showBubble(pickLine(IDLE_LINES), 4200)
    }
    scheduleIdle()
  }, delay)
}

// ---- 点击与拖动 ----

function onDown(event) {
  if (event.button !== undefined && event.button !== 0) return
  drag = {
    id: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: petSettings.x ?? 0,
    originY: petSettings.y ?? 0,
    moved: false
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function onMove(event) {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
    drag.moved = true
    dragging.value = true
    menuOpen.value = false
    bubble.value = ''
  }
  petSettings.x = drag.originX + dx
  petSettings.y = clampY(drag.originY + dy)
}

function endDrag(event, cancelled) {
  if (!drag || event.pointerId !== drag.id) return
  const moved = drag.moved
  drag = null
  dragging.value = false
  if (moved) {
    snapToEdge()
    persistPetSettings()
    scheduleIdle()
  } else if (!cancelled) {
    togglePanel()
  }
}

function onUp(event) { endDrag(event, false) }
function onCancel(event) { endDrag(event, true) }

function togglePanel() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) {
    chatOpen.value = false
    window.clearTimeout(bubbleTimer)
    bubble.value = ''
    window.clearTimeout(pokeTimer)
    poking.value = false
    window.requestAnimationFrame(() => {
      poking.value = true
      pokeTimer = window.setTimeout(() => { poking.value = false }, 600)
    })
  }
}

// ---- 快捷面板 ----

const presets = computed(() => apiSettings.presets)
const profiles = computed(() => profileSettings.profiles)
const currentPresetId = computed(() => getCurrentPreset()?.id || '')
const chatTargetPreset = computed(() => apiSettings.presets.find((p) => p.id === petSettings.apiPresetId) || getCurrentPreset())

const quickApps = homeApps.filter((app) => app.page && ['chat', 'character', 'settings'].includes(app.id))

async function switchApiPreset(id) {
  apiSettings.currentPresetId = id
  await persistApiSettings()
}

async function switchProfile(id) {
  await selectUserProfile(id)
}

function setPetPreset(id) {
  petSettings.apiPresetId = id
  persistPetSettings()
}

function togglePetReadChat() {
  petSettings.readChat = !petSettings.readChat
  persistPetSettings()
}

function toggleProactive() {
  petSettings.proactive = !petSettings.proactive
  persistPetSettings()
}

function toggleVoiceOutput() {
  petSettings.voiceOutput = !petSettings.voiceOutput
  persistPetSettings()
  if (!petSettings.voiceOutput) window.speechSynthesis?.cancel()
}

function setVoice(name) {
  petSettings.voiceName = name
  persistPetSettings()
}

function togglePetEnabled() {
  petSettings.enabled = !petSettings.enabled
  persistPetSettings()
  if (petSettings.enabled) scheduleIdle()
  else window.clearTimeout(idleTimer)
  menuOpen.value = false
}

function goTo(app) {
  menuOpen.value = false
  openApp(app)
}

// ---- 对话 ----

function openChat() {
  menuOpen.value = false
  chatOpen.value = true
  nextTick(() => {
    const el = messageList.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function closeChat() {
  chatOpen.value = false
  askController?.abort()
}

// 读取用户正在看的聊天最近几条消息，只有开启 readChat 才读取
async function readCurrentChatContext() {
  if (!petSettings.readChat || !currentChatId.value) return ''
  const all = await loadValue('jyos_chat_messages')
  const list = (all?.[currentChatId.value] || []).slice(-12)
  return list
    .filter((m) => m.text)
    .map((m) => `${m.from === 'me' ? '用户' : '角色'}：${String(m.text).slice(0, 200)}`)
    .join('\n')
}

async function sendQuestion() {
  const text = question.value.trim()
  if (!text || asking.value) return
  const preset = chatTargetPreset.value
  askError.value = ''
  if (!preset?.baseUrl?.trim() || !preset?.model?.trim() || !preset?.apiKey?.trim()) {
    askError.value = '所选预设缺少接口地址、模型或密钥，请到设置里补全。'
    return
  }
  chatLog.value.push({ role: 'user', content: text })
  question.value = ''
  asking.value = true
  askController = new AbortController()
  try {
    const context = await readCurrentChatContext()
    const messages = [{ role: 'system', content: buildSystemPrompt() }]
    if (context) messages.push({ role: 'system', content: `用户正在看的聊天（仅供参考）：\n${context}` })
    messages.push(...chatLog.value.slice(-8).map((m) => ({ role: m.role, content: m.content })))
    const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
      body: JSON.stringify({ model: preset.model.trim(), messages, temperature: 0.8 }),
      signal: askController.signal
    })
    if (!response.ok) throw new Error(`接口返回 ${response.status}`)
    const data = await response.json()
    const reply = data?.choices?.[0]?.message?.content?.trim()
    if (!reply) throw new Error('接口没有返回内容')
    chatLog.value.push({ role: 'assistant', content: reply })
    speak(reply)
  } catch (error) {
    if (error.name !== 'AbortError') askError.value = `${petSettings.name}没能回答：${error.message}`
  } finally {
    asking.value = false
    askController = null
    nextTick(() => {
      const el = messageList.value
      if (el) el.scrollTop = el.scrollHeight
    })
  }
}

function onAskKey(event) {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    sendQuestion()
  }
}

// ---- 语音播报 ----

// 只挑中文音色，iPhone 和安卓上自带的中文女声会出现在列表里
function refreshVoices() {
  if (!('speechSynthesis' in window)) return
  zhVoices.value = window.speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith('zh'))
}

function pickVoice() {
  return zhVoices.value.find((v) => v.name === petSettings.voiceName) || zhVoices.value[0] || null
}

function speak(text) {
  if (!petSettings.voiceOutput || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) utterance.voice = voice
  utterance.lang = 'zh-CN'
  utterance.rate = petSettings.rate
  utterance.pitch = petSettings.pitch
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

// ---- 语音输入 ----

function toggleListening() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Recognition) {
    askError.value = '当前浏览器不支持语音输入。'
    return
  }
  if (listening.value) {
    recognition?.stop()
    return
  }
  recognition = new Recognition()
  recognition.lang = 'zh-CN'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.onresult = (event) => {
    question.value = Array.from(event.results).map((r) => r[0].transcript).join('')
  }
  recognition.onerror = (event) => {
    askError.value = event.error === 'not-allowed' ? '没有麦克风权限，请在系统设置里允许。' : `语音识别出错：${event.error}`
  }
  recognition.onend = () => {
    listening.value = false
  }
  askError.value = ''
  listening.value = true
  recognition.start()
}

// ---- 主动吐槽 ----

// 只看最后一条消息的签名，聊天有新消息才吐槽，并受冷却时间限制
async function checkProactive() {
  if (!petSettings.enabled || !petSettings.proactive || !petSettings.readChat) return
  if (!currentChatId.value || dragging.value || menuOpen.value || chatOpen.value) return
  if (Date.now() - lastProactiveAt < PROACTIVE_COOLDOWN) return
  const all = await loadValue('jyos_chat_messages')
  const list = all?.[currentChatId.value] || []
  const last = list.at(-1)
  if (!last) return
  const key = `${currentChatId.value}|${list.length}|${last.timestamp || ''}`
  if (key === lastSeenKey) return
  lastSeenKey = key
  if (last.from === 'me') return
  const comment = await requestComment(last)
  if (!comment) return
  lastProactiveAt = Date.now()
  showBubble(comment, 6000)
  speak(comment)
}

async function requestComment(lastMessage) {
  const preset = chatTargetPreset.value
  if (!preset?.baseUrl?.trim() || !preset?.model?.trim() || !preset?.apiKey?.trim()) return ''
  const context = await readCurrentChatContext()
  try {
    const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
      body: JSON.stringify({
        model: preset.model.trim(),
        temperature: 0.9,
        max_tokens: 60,
        messages: [
          { role: 'system', content: `${buildSystemPrompt()}\n你现在是主动吐槽模式：只用一句话，轻松地评论用户正在看的聊天里刚出现的内容，不要编造，不要超过 40 字。` },
          { role: 'user', content: `聊天最近内容：\n${context}\n\n最新一条：${String(lastMessage.text || '').slice(0, 200)}` }
        ]
      })
    })
    if (!response.ok) return ''
    const data = await response.json()
    return data?.choices?.[0]?.message?.content?.trim() || ''
  } catch {
    return ''
  }
}

// ---- 生命周期 ----

function onResize() {
  ensurePosition()
}

onMounted(async () => {
  await loadPetSettings()
  ensurePosition()
  window.addEventListener('resize', onResize)
  if ('speechSynthesis' in window) {
    refreshVoices()
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
  }
  scheduleIdle()
  proactiveTimer = window.setInterval(checkProactive, PROACTIVE_INTERVAL)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.speechSynthesis?.removeEventListener?.('voiceschanged', refreshVoices)
  window.speechSynthesis?.cancel()
  window.clearTimeout(bubbleTimer)
  window.clearTimeout(pokeTimer)
  window.clearTimeout(idleTimer)
  window.clearInterval(proactiveTimer)
  recognition?.abort()
  askController?.abort()
})
</script>

<template>
  <div
    v-if="petSettings.enabled"
    class="desktop-pet"
    :class="{ 'is-dragging': dragging, 'is-poked': poking }"
    :style="petStyle"
  >
    <div v-if="bubble && !menuOpen && !chatOpen" :key="bubbleKey" class="pet-bubble" :class="panelSide" role="status">{{ bubble }}</div>

    <section v-if="menuOpen" class="pet-panel" :class="panelSide" :aria-label="`${petSettings.name}快捷面板`">
      <div class="pet-panel-title">{{ petSettings.name }}</div>

      <div class="pet-group">
        <div class="pet-group-label">API 预设</div>
        <div class="pet-chips">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="pet-chip"
            :class="{ 'is-on': preset.id === currentPresetId }"
            @click="switchApiPreset(preset.id)"
          >{{ preset.name }}</button>
        </div>
      </div>

      <div v-if="profiles.length > 1" class="pet-group">
        <div class="pet-group-label">人设</div>
        <div class="pet-chips">
          <button
            v-for="profile in profiles"
            :key="profile.id"
            type="button"
            class="pet-chip"
            :class="{ 'is-on': profile.id === profileSettings.currentProfileId }"
            @click="switchProfile(profile.id)"
          >{{ profile.name || '未命名' }}</button>
        </div>
      </div>

      <div class="pet-group">
        <div class="pet-group-label">打开</div>
        <div class="pet-chips">
          <button v-for="app in quickApps" :key="app.id" type="button" class="pet-chip" @click="goTo(app)">{{ app.name }}</button>
        </div>
      </div>

      <div class="pet-group">
        <button type="button" class="pet-row" @click="openChat">和{{ petSettings.name }}聊天</button>
        <button type="button" class="pet-row" :class="{ 'is-on': petSettings.readChat }" @click="togglePetReadChat">
          让{{ petSettings.name }}看当前聊天 {{ petSettings.readChat ? '已开' : '已关' }}
        </button>
        <button type="button" class="pet-row" :class="{ 'is-on': petSettings.proactive }" :disabled="!petSettings.readChat" @click="toggleProactive">
          聊天有新消息时主动吐槽 {{ petSettings.proactive ? '已开' : '已关' }}
        </button>
        <button type="button" class="pet-row" :class="{ 'is-on': petSettings.voiceOutput }" @click="toggleVoiceOutput">
          语音播报回复 {{ petSettings.voiceOutput ? '已开' : '已关' }}
        </button>
        <div v-if="petSettings.voiceOutput" class="pet-group">
          <div class="pet-group-label">音色（{{ zhVoices.length ? `${zhVoices.length} 个中文音色` : '没有找到中文音色' }}）</div>
          <div class="pet-chips">
            <button
              v-for="voice in zhVoices"
              :key="voice.name"
              type="button"
              class="pet-chip"
              :class="{ 'is-on': pickVoice()?.name === voice.name }"
              @click="setVoice(voice.name)"
            >{{ voice.name }}</button>
          </div>
        </div>
        <button type="button" class="pet-row pet-row-danger" @click="togglePetEnabled">隐藏{{ petSettings.name }}</button>
      </div>
    </section>

    <section v-if="chatOpen" class="pet-panel pet-chat" :class="panelSide" :aria-label="`和${petSettings.name}聊天`">
      <header class="pet-chat-head">
        <span>和{{ petSettings.name }}聊天</span>
        <button type="button" class="pet-chip" @click="closeChat">收起</button>
      </header>

      <div class="pet-group">
        <div class="pet-group-label">使用预设</div>
        <div class="pet-chips">
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            class="pet-chip"
            :class="{ 'is-on': chatTargetPreset?.id === preset.id }"
            @click="setPetPreset(preset.id)"
          >{{ preset.name }}</button>
        </div>
      </div>

      <div ref="messageList" class="pet-messages" aria-live="polite">
        <p v-if="!chatLog.length" class="pet-empty">问我怎么用这个应用，或者让我帮你看看当前聊天。</p>
        <div v-for="(item, index) in chatLog" :key="index" class="pet-msg" :class="item.role">{{ item.content }}</div>
        <div v-if="asking" class="pet-msg assistant">……</div>
      </div>

      <p v-if="askError" class="pet-error">{{ askError }}</p>

      <div class="pet-input-row">
        <input
          v-model="question"
          class="pet-input"
          type="text"
          :placeholder="`问${petSettings.name}一个问题`"
          :aria-label="`输入给${petSettings.name}的问题`"
          :disabled="asking"
          @keydown="onAskKey"
        />
        <button type="button" class="pet-mic" :class="{ 'is-on': listening }" :aria-label="listening ? '停止语音输入' : '语音输入'" @click="toggleListening">{{ listening ? '停' : '语音' }}</button>
        <button type="button" class="pet-send" :disabled="asking || !question.trim()" @click="sendQuestion">发送</button>
      </div>
    </section>

    <button
      type="button"
      class="pet-body"
      aria-label="桌宠白猫，点击打开快捷面板，拖动可以移动"
      :aria-expanded="menuOpen"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onCancel"
    >
      <img v-if="activeImage" class="pet-cat pet-custom" :src="activeImage.dataUrl" alt="" />
      <PixelWhiteCat v-else class="pet-cat" />
    </button>
  </div>
</template>

<style scoped>
.desktop-pet {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: 72px;
  height: 72px;
  pointer-events: none;
  will-change: transform;
}

.pet-body {
  pointer-events: auto;
  width: 72px;
  height: 72px;
  padding: 0;
  border: 0;
  border-radius: 18px;
  background: transparent;
  cursor: pointer;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  animation: pet-float 3.2s ease-in-out infinite;
}

.pet-body:focus-visible { outline: 2px solid #9aa6b2; outline-offset: 3px; }

.pet-cat {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 18px;
  box-shadow: 0 6px 18px rgba(52, 59, 72, .18);
  pointer-events: none;
}

/* 自定义透明图片：不加圆角和阴影，避免出现矩形卡片 */
.pet-custom {
  border-radius: 0;
  box-shadow: none;
  object-fit: contain;
  -webkit-user-drag: none;
  user-select: none;
}

.desktop-pet.is-dragging .pet-body { animation: none; cursor: grabbing; }
.desktop-pet.is-poked .pet-body { animation: pet-poke .6s cubic-bezier(.2, .8, .2, 1); }

.pet-bubble {
  position: absolute;
  top: 12px;
  width: max-content;
  max-width: 180px;
  padding: 8px 12px;
  border: 1px solid #e8ebef;
  border-radius: 14px;
  background: #fff;
  color: #565c65;
  font-size: 12px;
  line-height: 1.5;
  box-shadow: 0 8px 24px rgba(52, 59, 72, .12);
  pointer-events: none;
  animation: bubble-in .2s ease-out;
}

/* 气泡贴在猫的屏幕内侧，不会超出屏幕边 */
.pet-bubble.is-left { right: calc(100% + 8px); }
.pet-bubble.is-right { left: calc(100% + 8px); }

/* 面板：贴着猫的一侧展开，离猫 8px */
.pet-panel {
  position: absolute;
  bottom: 0;
  width: 260px;
  max-height: min(440px, calc(100dvh - 120px));
  overflow-y: auto;
  box-sizing: border-box;
  padding: 14px;
  border: 1px solid #e8ebef;
  border-radius: 18px;
  background: rgba(255, 255, 255, .96);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: #565c65;
  font-size: 13px;
  box-shadow: 0 14px 40px rgba(52, 59, 72, .18);
  pointer-events: auto;
  animation: bubble-in .18s ease-out;
}
.pet-panel.is-left { right: calc(100% + 8px); }
.pet-panel.is-right { left: calc(100% + 8px); }
.pet-chat { width: 290px; }

.pet-panel-title { margin-bottom: 8px; font-weight: 600; font-size: 14px; }
.pet-group { margin-top: 10px; }
.pet-group-label { margin-bottom: 6px; color: #8b919a; font-size: 11px; }
.pet-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pet-chip {
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid #e0e4e9;
  border-radius: 999px;
  background: #f5f6f8;
  color: #4a5059;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.pet-chip.is-on { background: #565f6c; border-color: #565f6c; color: #fff; }
.pet-row {
  display: block;
  width: 100%;
  min-height: 38px;
  margin-top: 4px;
  padding: 0 4px;
  border: 0;
  border-bottom: 1px solid #f0f2f4;
  background: none;
  color: #4a5059;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.pet-row.is-on { color: #2f7d4f; }
.pet-row-danger { color: #b5483d; }

.pet-chat-head { display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; }
.pet-messages {
  height: 220px;
  margin-top: 10px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pet-empty { margin: auto; color: #9aa1aa; font-size: 12px; text-align: center; line-height: 1.6; }
.pet-msg {
  max-width: 85%;
  padding: 7px 10px;
  border-radius: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.pet-msg.user { align-self: flex-end; background: #565f6c; color: #fff; }
.pet-msg.assistant { align-self: flex-start; background: #f2f4f6; color: #3c3c43; }
.pet-error { margin: 8px 0 0; color: #b5483d; font-size: 12px; line-height: 1.5; }
.pet-input-row { display: flex; gap: 6px; margin-top: 10px; }
.pet-input {
  flex: 1;
  min-width: 0;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid #e0e4e9;
  border-radius: 10px;
  background: #fff;
  color: #3c3c43;
  font: inherit;
  font-size: 13px;
}
.pet-send {
  min-height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background: #565f6c;
  color: #fff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.pet-send:disabled { opacity: .45; cursor: default; }
.pet-mic {
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid #e0e4e9;
  border-radius: 10px;
  background: #f5f6f8;
  color: #4a5059;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.pet-mic.is-on { background: #b5483d; border-color: #b5483d; color: #fff; }
.pet-row:disabled { opacity: .45; cursor: default; }

@keyframes pet-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes pet-poke {
  0% { transform: scale(1); }
  30% { transform: scale(1.12, .9); }
  60% { transform: scale(.96, 1.06); }
  100% { transform: scale(1); }
}

@keyframes bubble-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .pet-body, .desktop-pet.is-poked .pet-body, .pet-bubble, .pet-panel { animation: none; }
}
</style>
