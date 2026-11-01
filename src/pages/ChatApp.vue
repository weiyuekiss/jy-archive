<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadValue, saveValue } from '@/stores/db'
import { userProfile, profileSettings, apiSettings, getCurrentPreset } from '@/stores/settings'
import PhotoPickerDialog from '@/components/widgets/PhotoPickerDialog.vue'

const enterToSend = ref(false)
const replyImmediately = ref(false)
const sendSoundEnabled = ref(true)
const receiveSoundEnabled = ref(true)
const sendSoundFile = ref('')
const receiveSoundFile = ref('')
const sendSoundInput = ref(null)
const receiveSoundInput = ref(null)
let sendAudioUrl = ''
let receiveAudioUrl = ''
const avatarDialogOpen = ref(false)
const chatConfigOpen = ref(false)
const configPersonId = ref('')
const personaBindingOpen = ref(false)
const personaBindingIndex = ref(0)
const personaBindingTransition = ref(false)
const defaultChatPreset = {
  name: '默认预设',
  entries: [
    { id: 'system', name: '主提示词', enabled: true, content: '现在进行一场沉浸式线上聊天。你是一名擅长手机即时通讯对话的专业编剧，请为{{char}}编写回复，回应{{user}}。严格依据{{char}}的人设，保持角色不 OOC；让对话自然、生活化，像两个人正在手机上聊天。' },
    { id: 'persona', name: '用户人设（我）', enabled: true, content: '以下资料描述用户，帮助你理解角色眼中的对方。\n\n{{user_persona}}' },
    { id: 'character', name: '联系人角色人设', enabled: true, content: '以下资料描述你所扮演的角色。以完整档案为依据理解角色的人设。\n\n{{character_persona}}' },
  ],
}
const cloneConfig = (value) => JSON.parse(JSON.stringify(value))
const chatConfig = ref({ preset: cloneConfig(defaultChatPreset), assignments: {} })
const presetDraft = ref(null)
const presetDetailIndex = ref(-1)
const draggingPresetIndex = ref(-1)
let presetHoldTimer = null
const presetSaving = ref(false)
const linkedPersona = computed(() => profileSettings.profiles.find((profile) => profile.id === chatConfig.value.assignments[configPersonId.value]) || null)
const boundCount = computed(() => Object.keys(chatConfig.value.assignments).length)

const emit = defineEmits(['close'])
const currentTab = ref('聊天')
const activeChat = ref(null)
const draft = ref('')
const messages = ref([])
const visibleMessageCount = ref(80)
const visibleMessages = computed(() => messages.value.slice(-visibleMessageCount.value))
const visibleMessageOffset = computed(() => messages.value.length - visibleMessages.value.length)
const chatMessages = ref({})
const retainedChatMemory = ref({})
const messageList = ref(null)
const chatHistoryReady = ref(false)
const chatPreferencesReady = ref(false)
const characterChatSettings = ref({})
const chatSettingsOpen = ref(false)
const historyActionDialog = ref(null)
const replyLoading = ref(false)
const replyError = ref('')
const userTyping = computed(() => Boolean(draft.value.trim()))
const characterTyping = ref(false)
const messageMenu = ref(null)
const selectedMessageIndex = ref(-1)
const multiDeleteMode = ref(false)
const selectedMessages = ref([])
const expandedStatusMessages = ref([])
const expandedThoughtMessages = ref([])
const quoteDraft = ref(null)
const attachmentOpen = ref(false)
const composerDialog = ref(null)
const transferActionDialog = ref(null)
const imageInput = ref(null)
const imagePreview = ref(null)
const polaroidPreview = ref(null)
const isRecording = ref(false)
const playingVoiceIndex = ref(-1)
const voiceProgress = ref(0)
const expandedVoiceTranscript = ref(-1)
let activeVoiceAudio = null
let speechRecognition = null
let recognizedVoiceText = ''

const imageQualityOptions = [
  { id: 'very-low', label: '极低', maxSide: 512, quality: 0.55, detail: 'low', tokens: '约 85 tokens' },
  { id: 'low', label: '低', maxSide: 768, quality: 0.65, detail: 'low', tokens: '约 170 tokens' },
  { id: 'medium', label: '中', maxSide: 1024, quality: 0.78, detail: 'high', tokens: '约 500 tokens' },
  { id: 'high', label: '高', maxSide: 1536, quality: 0.86, detail: 'high', tokens: '约 900 tokens' },
  { id: 'very-high', label: '极高', maxSide: 2048, quality: 0.92, detail: 'high', tokens: '约 1,500 tokens' },
]
let mediaRecorder = null
let recordingStream = null
let recordingChunks = []
const messageDialog = ref(null)
const toastMessage = ref('')
let toastTimer = null
let pressTimer = null
let pressStarted = false
const pendingReplies = Object.create(null)
const replyNotices = ref([])
let noticeId = 0
let noticeTimers = []
const activeUserPersona = computed(() => profileSettings.profiles.find((profile) => profile.id === chatConfig.value.assignments[activeChat.value?.id]) || userProfile)

function currentTime() {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

function loadOlderMessages() {
  if (visibleMessageCount.value >= messages.value.length) return
  const list = messageList.value
  const previousHeight = list?.scrollHeight || 0
  visibleMessageCount.value = Math.min(visibleMessageCount.value + 80, messages.value.length)
  requestAnimationFrame(() => {
    if (list) list.scrollTop += list.scrollHeight - previousHeight
  })
}

function scrollMessages() {
  requestAnimationFrame(() => messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' }))
}

function persistChatHistory() {
  if (!chatHistoryReady.value) return
  void saveValue('jyos_chat_messages', JSON.parse(JSON.stringify(chatMessages.value)))
  void saveValue('jyos_retained_chat_memory', JSON.parse(JSON.stringify(retainedChatMemory.value)))
}

function showToast(text) {
  toastMessage.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 1800)
}

function startMessagePress(index, event) {
  if (event?.button !== undefined && event.button !== 0) return
  pressStarted = false
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    pressStarted = true
    showMessageMenu(index, event)
  }, 480)
}

function showMessageMenu(index, event) {
  const bubble = event?.currentTarget?.querySelector('.message-bubble')
  const rect = bubble?.getBoundingClientRect()
  const touch = event?.changedTouches?.[0] || event?.touches?.[0]
  const pointX = touch?.clientX ?? event?.clientX ?? (rect ? rect.left + rect.width / 2 : window.innerWidth / 2)
  const pointY = touch?.clientY ?? event?.clientY ?? (rect ? rect.top : window.innerHeight / 2)
  const margin = 12
  const menuWidth = Math.min(280, window.innerWidth - margin * 2)
  const menuHeight = messages.value[index]?.from === 'them' ? 410 : 320
  const left = Math.max(margin, Math.min(pointX - menuWidth / 2, window.innerWidth - menuWidth - margin))
  const top = Math.max(margin, pointY - menuHeight - 16)
  selectedMessageIndex.value = index
  messageMenu.value = { left, top, originX: Math.max(0, Math.min(1, (pointX - left) / menuWidth)), originY: Math.max(0, Math.min(1, (pointY - top) / menuHeight)) }
}

function openMessageMenu(index, event) {
  cancelMessagePress()
  pressStarted = true
  showMessageMenu(index, event)
}

const reactionChoices = ['❤️', '😂', '😮', '🥺', '👍', '👎']
function normalizeReaction(value) {
  const emoji = typeof value === 'string' ? value.trim() : ''
  return reactionChoices.includes(emoji) ? emoji : ''
}
function addMessageReaction(emoji) {
  const message = messages.value[selectedMessageIndex.value]
  if (!message || message.from !== 'them') return
  message.reaction = message.reaction === emoji ? '' : emoji
  if (activeChat.value) chatMessages.value[activeChat.value.id] = [...messages.value]
  persistChatHistory()
  messageMenu.value = false
}

function cancelMessagePress() { clearTimeout(pressTimer) }
function suppressMessageClick(event) { if (pressStarted) { event.preventDefault(); event.stopPropagation(); pressStarted = false } }
function toggleMessageSelection(index) {
  selectedMessages.value = selectedMessages.value.includes(index) ? selectedMessages.value.filter((item) => item !== index) : [...selectedMessages.value, index]
}
function deleteSelectedMessages(indices = [selectedMessageIndex.value]) {
  const remove = new Set(indices)
  const removedMessages = messages.value.filter((_, index) => remove.has(index))
  const identity = (message) => message.timestamp
    ? `timestamp:${message.timestamp}`
    : `${message.from}|${message.text}|${message.time || ''}`
  const removedIdentities = new Set(removedMessages.map(identity))
  messages.value = messages.value.filter((_, index) => !remove.has(index))
  if (activeChat.value) {
    chatMessages.value[activeChat.value.id] = [...messages.value]
    retainedChatMemory.value[activeChat.value.id] = (retainedChatMemory.value[activeChat.value.id] || [])
      .filter((message) => !removedIdentities.has(identity(message)))
  }
  expandedStatusMessages.value = expandedStatusMessages.value.filter((index) => !remove.has(index)).map((index) => index - [...remove].filter((deletedIndex) => deletedIndex < index).length)
  persistChatHistory()
  messageMenu.value = false
  multiDeleteMode.value = false
  selectedMessages.value = []
  showToast('消息已删除')
}
async function copySelectedMessage(index = selectedMessageIndex.value) {
  try {
    await navigator.clipboard.writeText(messages.value[index]?.text || '')
    showToast('已复制')
  } catch { showToast('复制失败，请检查剪贴板权限') }
  messageMenu.value = false
}
function editSelectedMessage() {
  const message = messages.value[selectedMessageIndex.value]
  if (!message || message.from !== 'me') { showToast('只能编辑自己发送的消息'); messageMenu.value = false; return }
  messageDialog.value = { type: 'edit', index: selectedMessageIndex.value, text: message.text }
  messageMenu.value = false
}
function confirmEditMessage() {
  const dialog = messageDialog.value
  if (!dialog?.text.trim()) return
  messages.value[dialog.index].text = dialog.text.trim()
  if (activeChat.value) chatMessages.value[activeChat.value.id] = [...messages.value]
  persistChatHistory()
  messageDialog.value = null
  showToast('消息已编辑')
}
function quoteSelectedMessage() {
  const message = messages.value[selectedMessageIndex.value]
  if (message) {
    quoteDraft.value = { from: message.from, text: message.text }
    messageMenu.value = false
    requestAnimationFrame(() => document.querySelector('.composer textarea')?.focus())
  }
}

function clearQuoteDraft() { quoteDraft.value = null }

function showReplyNotices(chat, replies) {
  if (activeChat.value?.id === chat.id || !replies.length) return
  const startDelay = replyNotices.value.length * 700
  replies.forEach((text, index) => {
    const delay = startDelay + index * 900
    const timer = setTimeout(() => {
      if (activeChat.value?.id === chat.id) return
      const id = ++noticeId
      replyNotices.value.push({ id, chat, text })
      setTimeout(() => {
        replyNotices.value = replyNotices.value.filter((notice) => notice.id !== id)
      }, 5200)
    }, delay)
    noticeTimers.push(timer)
  })
}

function clearReplyNotices() {
  noticeTimers.forEach(clearTimeout)
  noticeTimers = []
  replyNotices.value = []
}

function playSound(kind) {
  if (kind === 'send' ? !sendSoundEnabled.value : !receiveSoundEnabled.value) return
  const source = kind === 'send' ? sendAudioUrl : receiveAudioUrl
  if (source) {
    const audio = new Audio(source)
    void audio.play().catch(() => {})
    return
  }
  // Small synthesized fallbacks keep default sounds available without bundled media files.
  const context = new AudioContext()
  const now = context.currentTime
  const notes = kind === 'send' ? [[660, 0, .07], [880, .065, .09]] : [[740, 0, .11], [587, .13, .13]]
  for (const [frequency, offset, duration] of notes) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = kind === 'send' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, now + offset)
    gain.gain.setValueAtTime(.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(.12, now + offset + .012)
    gain.gain.exponentialRampToValueAtTime(.0001, now + offset + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + duration)
  }
  setTimeout(() => void context.close(), 450)
}

function setSoundFile(kind, file) {
  if (!file || !file.type.startsWith('audio/')) return
  const url = URL.createObjectURL(file)
  if (kind === 'send') {
    if (sendAudioUrl) URL.revokeObjectURL(sendAudioUrl)
    sendAudioUrl = url
    sendSoundFile.value = file.name
  } else {
    if (receiveAudioUrl) URL.revokeObjectURL(receiveAudioUrl)
    receiveAudioUrl = url
    receiveSoundFile.value = file.name
  }
}

function resetSound(kind) {
  if (kind === 'send') {
    if (sendAudioUrl) URL.revokeObjectURL(sendAudioUrl)
    sendAudioUrl = ''
    sendSoundFile.value = ''
  } else {
    if (receiveAudioUrl) URL.revokeObjectURL(receiveAudioUrl)
    receiveAudioUrl = ''
    receiveSoundFile.value = ''
  }
}

onBeforeUnmount(() => {
  clearReplyNotices()
  if (sendAudioUrl) URL.revokeObjectURL(sendAudioUrl)
  if (receiveAudioUrl) URL.revokeObjectURL(receiveAudioUrl)
  recordingStream?.getTracks().forEach((track) => track.stop())
})

function isLastInRun(index) {
  return index === messages.value.length - 1 || messages.value[index + 1].from !== messages.value[index].from
}

function messageTime(message) {
  return message.time || '18:38'
}

function shouldShowTimestamp(index) {
  const messageIndex = visibleMessageOffset.value + index
  const message = messages.value[messageIndex]
  if (!message) return false
  if (messageIndex === 0) return true
  const previous = messages.value[messageIndex - 1]
  const currentTime = new Date(message.timestamp || 0).getTime()
  const previousTime = new Date(previous?.timestamp || 0).getTime()
  return Number.isFinite(currentTime) && Number.isFinite(previousTime) && currentTime - previousTime > 5 * 60 * 1000
}

function openChat(chat) {
  clearReplyNotices()
  replyError.value = ''
  activeChat.value = chat
  messages.value = chatMessages.value[chat.id] || []
  visibleMessageCount.value = 80
  const list = messageList.value
  const previousHeight = list?.scrollHeight || 0
  requestAnimationFrame(() => {
    if (list) list.scrollTop += list.scrollHeight - previousHeight
  })
  replyLoading.value = Boolean(pendingReplies[chat.id])
  characterTyping.value = replyLoading.value
  visibleMessageCount.value = 80
  scrollMessages()
}

function openNoticeChat(notice) {
  if (!notice?.chat) return
  const chat = notice.chat
  const replyText = notice.text
  clearReplyNotices()
  openChat(chat)
  requestAnimationFrame(() => {
    const foundIndex = messages.value.findIndex((message) => message.from === 'them' && message.text === replyText)
    if (foundIndex < 0) return
    visibleMessageCount.value = Math.max(80, messages.value.length - foundIndex)
    requestAnimationFrame(() => {
      const rows = messageList.value?.querySelectorAll('.message-row')
      const targetRow = rows?.[foundIndex - visibleMessageOffset.value]
      targetRow?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      targetRow?.classList.add('notice-message-highlight')
      setTimeout(() => targetRow?.classList.remove('notice-message-highlight'), 1800)
    })
  })
}

function onMessageListScroll() {
  const list = messageList.value
  if (list && list.scrollTop < 36 && visibleMessageOffset.value > 0) loadOlderMessages()
}

function leaveConversation() {
  if (activeChat.value) {
    chatMessages.value[activeChat.value.id] = [...messages.value]
    persistChatHistory()
  }
  replyError.value = ''
  activeChat.value = null
}

function replyDelay(text, index) {
  const lengthDelay = Math.min(2400, Math.max(450, text.length * 32))
  const variation = 250 + Math.random() * 650 + index * 120
  return Math.min(3400, lengthDelay + variation)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function openHistoryAction(type) {
  if (!activeChat.value) return
  historyActionDialog.value = type
}

function confirmHistoryAction() {
  const chat = activeChat.value
  const action = historyActionDialog.value
  if (!chat || !action) return
  if (pendingReplies[chat.id]) {
    pendingReplies[chat.id].controller.abort()
    delete pendingReplies[chat.id]
  }
  if (action === 'clear') {
    retainedChatMemory.value[chat.id] = (chatMessages.value[chat.id] || messages.value).slice(-shortTermMemoryRounds(chat.id) * 2)
  } else {
    retainedChatMemory.value[chat.id] = []
  }
  chatMessages.value[chat.id] = []
  messages.value = []
  replyLoading.value = false
  characterTyping.value = false
  replyError.value = ''
  quoteDraft.value = null
  selectedMessages.value = []
  multiDeleteMode.value = false
  if (action === 'restart') {
    retainedChatMemory.value[chat.id] = []
    void saveValue('jyos_character_chat_settings', JSON.parse(JSON.stringify(characterChatSettings.value)))
  }
  persistChatHistory()
  historyActionDialog.value = null
  chatSettingsOpen.value = false
  showToast(action === 'clear' ? '聊天记录已清除，短期记忆设置已保留' : '聊天已重启，聊天记录和短期记忆均已清除')
}

function openChatSettings() {
  if (!activeChat.value) return
  chatSettingsOpen.value = true
}

function chatRemark(chatId = activeChat.value?.id) {
  return characterChatSettings.value[chatId]?.remark || ''
}

function setChatRemark(value) {
  if (!activeChat.value) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    remark: value,
  }
}

function chatDisplayName(chat) {
  return chat ? chatRemark(chat.id).trim() || chat.name : ''
}

function shortTermMemoryRounds(chatId = activeChat.value?.id) {
  const value = Number(characterChatSettings.value[chatId]?.shortTermMemoryRounds)
  return Number.isFinite(value) ? Math.max(1, Math.min(500, Math.round(value))) : 50
}

function setShortTermMemoryRounds(value) {
  if (!activeChat.value) return
  const rounds = Number(value)
  if (!Number.isFinite(rounds)) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    shortTermMemoryRounds: Math.max(1, Math.min(500, Math.round(rounds))),
  }
}

function imageMemoryLimit(chatId = activeChat.value?.id) {
  const value = Number(characterChatSettings.value[chatId]?.imageMemoryLimit)
  return Number.isFinite(value) ? Math.max(1, Math.min(50, Math.round(value))) : 10
}

function setImageMemoryLimit(value) {
  if (!activeChat.value) return
  const count = Number(value)
  if (!Number.isFinite(count)) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    imageMemoryLimit: Math.max(1, Math.min(50, Math.round(count))),
  }
}

function imageQuality(chatId = activeChat.value?.id) {
  const value = characterChatSettings.value[chatId]?.imageQuality
  return imageQualityOptions.some((option) => option.id === value) ? value : 'medium'
}

function setImageQuality(value) {
  if (!activeChat.value || !imageQualityOptions.some((option) => option.id === value)) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    imageQuality: value,
  }
}

function selectedImageQuality(chatId = activeChat.value?.id) {
  return imageQualityOptions.find((option) => option.id === imageQuality(chatId)) || imageQualityOptions[2]
}

function statusBarEnabled(chatId = activeChat.value?.id) {
  return Boolean(characterChatSettings.value[chatId]?.statusBarEnabled)
}

function thoughtPreviewEnabled(chatId = activeChat.value?.id) {
  return characterChatSettings.value[chatId]?.thoughtPreviewEnabled !== false
}

function setThoughtPreviewEnabled(enabled) {
  if (!activeChat.value) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    thoughtPreviewEnabled: Boolean(enabled),
  }
}

function toggleThoughtMessage(index) {
  expandedThoughtMessages.value = expandedThoughtMessages.value.includes(index)
    ? expandedThoughtMessages.value.filter((item) => item !== index)
    : [...expandedThoughtMessages.value, index]
}

function setStatusBarEnabled(enabled) {
  if (!activeChat.value) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    statusBarEnabled: Boolean(enabled),
  }
}

function toggleStatusMessage(index) {
  expandedStatusMessages.value = expandedStatusMessages.value.includes(index)
    ? expandedStatusMessages.value.filter((item) => item !== index)
    : [...expandedStatusMessages.value, index]
}

function normalizedStatus(value) {
  const score = Number(value)
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null
}

function onComposerEnter(event) {
  if (!enterToSend.value || event.shiftKey) {
    event.preventDefault()
    draft.value += '\n'
    return
  }
  event.preventDefault()
  sendMessage()
}

function formatChatDateTime(date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

function getSeason(date) {
  const month = date.getMonth() + 1
  if ([3, 4, 5].includes(month)) return '春季'
  if ([6, 7, 8].includes(month)) return '夏季'
  if ([9, 10, 11].includes(month)) return '秋季'
  return '冬季'
}

function getLocalWeather() {
  try {
    const raw = localStorage.getItem('jyos_local_weather')
    if (!raw) return ''
    const weather = JSON.parse(raw)
    if (weather.expiresAt && weather.expiresAt < Date.now()) return ''
    return [weather.location, weather.description, weather.temperature].filter(Boolean).join('，')
  } catch {
    return ''
  }
}

function buildTimeContext(chat, history) {
  const now = new Date()
  const lastUserMessage = [...history].reverse().find((message) => message.from === 'me')
  const priorUserMessages = history.filter((message) => message.from === 'me' && message.timestamp)
  const lastCharacterMessage = [...history].reverse().find((message) => message.from === 'them' && message.timestamp)
  const elapsedText = (timestamp) => {
    const minutes = Math.max(0, Math.floor((now.getTime() - new Date(timestamp).getTime()) / 60000))
    return minutes < 1 ? '不到1分钟' : minutes < 60 ? `${minutes}分钟` : minutes < 1440 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分钟` : ''}` : `${Math.floor(minutes / 1440)}天${Math.floor((minutes % 1440) / 60) ? `${Math.floor((minutes % 1440) / 60)}小时` : ''}`
  }
  const sinceLastVisit = lastUserMessage?.timestamp ? elapsedText(lastUserMessage.timestamp) : '暂无可用记录'
  const awaySinceCharacterReply = lastCharacterMessage?.timestamp && lastUserMessage?.timestamp && new Date(lastUserMessage.timestamp) > new Date(lastCharacterMessage.timestamp)
    ? elapsedText(lastCharacterMessage.timestamp)
    : '暂无可用的离线间隔记录'
  const sentTimes = priorUserMessages.slice(-8).map((message) => formatChatDateTime(new Date(message.timestamp))).join('；') || '暂无记录'
  const weather = getLocalWeather()
  return `\n\n【现实时间上下文】\n当前本地时间：${formatChatDateTime(now)}（精确到年、月、日、时、分）；季节：${getSeason(now)}。${weather ? `天气信息（用户设备提供）：${weather}。` : '当前没有天气数据，不要推测天气或所在地。'}\n用户最近上线/发消息距今：${sinceLastVisit}；最近一次角色回复后用户间隔：${awaySinceCharacterReply}。用户最近消息发送时间：${lastUserMessage?.timestamp ? formatChatDateTime(new Date(lastUserMessage.timestamp)) : '暂无记录'}。最近若干条用户消息发送时间（由旧到新）：${sentTimes}。依据消息时间戳自然判断间隔，不要编造未记录的在线/离线状态，不要机械报时或催促。`
}

function profileToText(profile) {
  if (!profile) return '（暂无用户人设资料）'
  return Object.entries({ 姓名: profile.name, 生日: profile.birthday, 年龄: profile.age, 职业: profile.occupation, 简介: profile.bio })
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)
    .join('\n') || '（暂无用户人设资料）'
}

function characterToText(character) {
  if (!character) return '（暂无角色资料）'
  return Object.entries({ 姓名: character.name, 性别: character.gender, 生日: character.birthday, 年龄: character.age, 职业: character.occupation, 人物设定: character.details })
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)
    .join('\n') || '（暂无角色资料）'
}

function buildSystemPrompt() {
  const entries = chatConfig.value.preset.entries.filter((entry) => entry.enabled && entry.content.trim())
  const profile = activeUserPersona.value
  const character = contacts.value.find((person) => person.id === activeChat.value?.id)
  const userName = profile?.name?.trim() || '用户'
  const characterName = character?.name?.trim() || '角色'
  const replacements = {
    '{{user_persona}}': profileToText(profile),
    '{{character_persona}}': characterToText(character),
    '{{user}}': userName,
    '<user>': userName,
    '{{char}}': characterName,
    '<char>': characterName,
  }
  const replaceTokens = (text) => {
    for (const [token, value] of Object.entries(replacements)) text = text.replaceAll(token, value)
    return text
  }
  return entries.map((entry) => `【${entry.name}】\n${replaceTokens(entry.content)}`).join('\n\n')
}

function parseReplyMessages(raw) {
  const candidates = []
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (text) candidates.push(text)
  const objectStart = text.indexOf('{')
  const objectEnd = text.lastIndexOf('}')
  const arrayStart = text.indexOf('[')
  const arrayEnd = text.lastIndexOf(']')
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(text.slice(objectStart, objectEnd + 1))
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(text.slice(arrayStart, arrayEnd + 1))

  let parsed
  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate)
      break
    } catch {
      // Try the next common response wrapper.
    }
  }
  if (!parsed) throw new Error('角色回复格式解析失败，请重试。')

  const items = Array.isArray(parsed) ? parsed : parsed.messages
  if (!Array.isArray(items)) throw new Error('角色没有返回有效的消息列表，请重试。')
  const replies = items.map((item) => typeof item === 'string' ? { text: item } : item).filter((item) => typeof item?.text === 'string' && item.text.trim()).map((item) => ({ text: item.text.trim(), type: ['text-image', 'transfer', 'voice'].includes(item.type) ? item.type : 'text', content: typeof item.content === 'string' ? item.content.trim().slice(0, 1000) : '', amount: Number(item.amount) > 0 ? Number(item.amount) : null, voiceDescription: typeof item.voiceDescription === 'string' ? item.voiceDescription.trim().slice(0, 240) : '', feeling: typeof item.feeling === 'string' ? item.feeling.trim().slice(0, 700) : '', replyTo: Number.isInteger(item.replyTo) && item.replyTo >= 0 ? item.replyTo : null, reactionTo: Number.isInteger(item.reactionTo) && item.reactionTo >= 0 ? item.reactionTo : null, reactionEmoji: normalizeReaction(item.reactionEmoji), status: item.status && typeof item.status === 'object' ? { affection: normalizedStatus(item.status.affection), anger: normalizedStatus(item.status.anger), sadness: normalizedStatus(item.status.sadness) } : null }))
  if (!replies.length) throw new Error('角色暂时没有生成回复，请重试。')
  return replies
}

async function requestCharacterReply(chat, history, controller, previousStatus = null, reactionCandidates = []) {
  const preset = getCurrentPreset()
  if (!preset?.baseUrl?.trim() || !preset?.model?.trim()) throw new Error('请先在设置中配置 API 地址和模型。')
  if (!preset.apiKey?.trim()) throw new Error('请先在设置中填写 API Key。')
  const profile = profileSettings.profiles.find((item) => item.id === chatConfig.value.assignments[chat.id]) || userProfile
  const character = contacts.value.find((person) => person.id === chat.id)
  const enabledEntries = chatConfig.value.preset.entries.filter((entry) => entry.enabled && entry.content.trim())
  const userName = profile?.name?.trim() || '用户'
  const characterName = character?.name?.trim() || '角色'
  const replacements = { '{{user_persona}}': profileToText(profile), '{{character_persona}}': characterToText(character), '{{user}}': userName, '<user>': userName, '{{char}}': characterName, '<char>': characterName }
  const systemPrompt = enabledEntries.map((entry) => {
    let content = entry.content
    for (const [token, value] of Object.entries(replacements)) content = content.replaceAll(token, value)
    return `【${entry.name}】\n${content}`
  }).join('\n\n')
  const needsThought = thoughtPreviewEnabled(chat.id)
  const thoughtInstruction = needsThought ? '【角色即时感受】第一条角色消息附带一个用于界面展示的 feeling 字段，约 60 至 100 个汉字。用角色第一人称写此刻的情绪与感受，符合人设和当前关系；它是简短的角色表达，不是对话内容。' : ''
  const statusInstruction = statusBarEnabled(chat.id) ? ` 每条角色消息还需包含 status 对象，字段为 affection、anger、sadness，均为 0 到 100 的整数。依据角色档案和本轮上下文谨慎调整；没有明显变化时保持上一轮数值。上一轮角色状态：${previousStatus ? JSON.stringify(previousStatus) : '暂无已记录状态'}。状态只用于界面，不要写进聊天正文。` : ''
  const reactionInstruction = `【聊天反应】依据角色人设、当前关系和当下感受，自然决定是否对用户本轮消息点反应。可反应消息候选列表（reactionTo 索引从 0 开始）为：${JSON.stringify(reactionCandidates.map((message) => message.text))}。只能选择此候选列表里的索引；列表为空时不要输出 reactionTo 或 reactionEmoji。若反应，在对应回复对象填写 reactionTo（候选列表索引）和 reactionEmoji（单个 emoji）；不反应时省略。`
  const formatInstruction = `\n\n【回复格式（必须遵守）】只输出一个有效 JSON 对象，不要 Markdown 代码围栏、前言、解释或 JSON 以外的文字。角色可以在符合关系、语境和角色经济状况时主动转账，例如偿还欠款、分担费用、赠送心意或应急帮助；也可以偶尔发送文字图。文字图是角色发来的文字描述画面，必须符合角色此刻实际能拍摄或发送的视角：独处时采用自拍、镜中自拍、第一人称所见或手机屏幕/物品近景等合理视角，不写仿佛由第三者拍摄的旁白式全景描写。回复对象可用 type 为 text-image 并提供 content，或 type 为 transfer 并提供正数 amount；普通消息省略 type。结构为：{"messages":[{"text":"消息正文"${needsThought ? ',"feeling":"角色此刻的即时感受，必填，仅用于界面展示，不是回复正文"' : ''}${statusBarEnabled(chat.id) ? ',"status":{"affection":50,"anger":0,"sadness":0}' : ''},"type":"text-image","content":"自拍视角的文字画面描述","amount":88,"replyTo":0,"reactionTo":0,"reactionEmoji":"💛"}]}。messages 必须是数组，每项必须有非空字符串 text；${needsThought ? '第一项必须包含非空 feeling 字符串，后续项省略 feeling。' : '不要输出 feeling 字段。'}普通消息不要填写 content 或 amount。语音消息用 type="voice"，text 填语音识别文字，voiceDescription 用括号描写语气、声线和听感；不生成音频。文字图用 type="text-image" 和 content 描写画面，叙述视角符合实际拍摄者和场景；转账用 type="transfer" 和正数 amount。replyTo 仅在引用用户消息时填写对应索引，不引用就省略。reactionTo 和 reactionEmoji 仅在角色想给用户消息点反应时一起填写，reactionTo 必须是上方候选列表索引。确保字符串中的引号、换行和反斜杠均按 JSON 规则转义，输出可直接 JSON.parse。`
  const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: preset.model,
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n结合上下文判断是否需要引用用户之前的某条消息进行回复。只有当引用有助于回应、澄清、接续话题或符合当前角色的意愿与表达方式时才引用，不要每轮都引用。回复内容与表达长度由角色人设和当前语境自然决定；不必凑条数，也不受预设回复长度或条数限制。${reactionInstruction}${thoughtInstruction}${statusInstruction}【语音消息】收到用户语音条时，用户提供的是语音识别文本以及可能存在的声音印象描述；角色没有听到音频，不可声称实际听见。角色可以依据用户主动提供的声音印象自然交流。角色也可以偶尔发送 type="voice" 的语音条，text 为语音识别文字，voiceDescription 用括号简短描写这句话的语气、声线和听感，增强沉浸感，不写成旁白剧情。${formatInstruction}` },
        ...history,
      ],
      temperature: Number.isFinite(Number(preset.temperature)) ? Number(preset.temperature) : 0.7,
      stream: false,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || `API 请求失败（${response.status}）`)
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('API 返回内容为空或格式不支持。')
  try {
    const replies = parseReplyMessages(content)
    if (needsThought && !replies[0]?.feeling) {
      const feelingResponse = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
        body: JSON.stringify({
          model: preset.model,
          messages: [
            { role: 'system', content: `依据角色人设、当前对话和角色刚刚发出的回复，写一段约 60 至 100 个汉字的角色即时感受。用第一人称写此刻的情绪与感受。只输出 JSON：{"feeling":"角色即时感受"}。` },
            ...history,
            { role: 'assistant', content: replies.map((reply) => reply.text).join('\n') },
            { role: 'user', content: '请写角色此刻的即时感受。' },
          ],
          temperature: Number.isFinite(Number(preset.temperature)) ? Number(preset.temperature) : 0.7,
          stream: false,
        }),
      })
      const feelingData = await feelingResponse.json().catch(() => ({}))
      if (!feelingResponse.ok) throw new Error(feelingData.error?.message || `即时感受补全失败（${feelingResponse.status}）`)
      const feelingContent = feelingData.choices?.[0]?.message?.content
      if (typeof feelingContent === 'string') {
        try {
          const parsedFeeling = JSON.parse(feelingContent.replace(/^```(?:json)?\s*|\s*```$/g, '').trim())
          if (typeof parsedFeeling.feeling === 'string' && parsedFeeling.feeling.trim()) replies[0].feeling = parsedFeeling.feeling.trim().slice(0, 700)
        } catch {
          // Keep the reply if the optional feeling completion is malformed.
        }
      }
    }
    return replies
  } catch {
    const repairResponse = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
      body: JSON.stringify({
        model: preset.model,
        messages: [
          { role: 'system', content: `把下面的模型回复整理为符合要求的 JSON。只输出合法 JSON，不要代码围栏或说明文字。格式：${formatInstruction.trim()} 不要改变原回复的含义，也不要添加新内容。` },
          { role: 'user', content },
        ],
        temperature: 0,
        stream: false,
      }),
    })
    const repairData = await repairResponse.json().catch(() => ({}))
    if (!repairResponse.ok) throw new Error(repairData.error?.message || `回复格式修复失败（${repairResponse.status}）`)
    const repairedContent = repairData.choices?.[0]?.message?.content
    if (typeof repairedContent !== 'string') throw new Error('角色回复格式解析失败，请重试。')
    return parseReplyMessages(repairedContent)
  }
}

async function transcribeRecordedAudio(blob) {
  const preset = getCurrentPreset()
  if (!preset?.baseUrl?.trim() || !preset.apiKey?.trim()) throw new Error('请先配置 API 地址和 API Key，才能将录音转成文字。')
  const form = new FormData()
  form.append('file', blob, `voice.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`)
  form.append('model', 'whisper-1')
  const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${preset.apiKey.trim()}` }, body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || `语音转文字失败（${response.status}）`)
  return typeof data.text === 'string' ? data.text.trim() : ''
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('文件保存失败。'))
    reader.readAsDataURL(blob)
  })
}

function loadImageSource(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败，请换一张图片重试。'))
    image.src = URL.createObjectURL(file)
  })
}

async function compressImage(file, option) {
  const image = await loadImageSource(file)
  try {
    const scale = Math.min(1, option.maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(image, 0, 0, width, height)
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('图片压缩失败，请重试。')), 'image/jpeg', option.quality))
    return { data: await blobToDataUrl(blob), width, height }
  } finally {
    URL.revokeObjectURL(image.src)
  }
}

async function handleImageSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !activeChat.value) return
  if (!file.type.startsWith('image/')) { showToast('请选择图片文件'); return }
  try {
    const option = selectedImageQuality()
    const compressed = await compressImage(file, option)
    sendChatItem({ type: 'image', imageData: compressed.data, imageWidth: compressed.width, imageHeight: compressed.height, imageQuality: option.id, text: '用户发送了一张图片。' }, '用户发送了一张图片，请结合图片内容自然回应。')
  } catch (error) {
    showToast(error.message || '图片处理失败')
  }
}

async function playVoiceMessage(message, index) {
  if (message.from === 'them') {
    if (message.transcript) expandedVoiceTranscript.value = expandedVoiceTranscript.value === index ? -1 : index
    playingVoiceIndex.value = expandedVoiceTranscript.value === index ? index : -1
    voiceProgress.value = 0
    return
  }
  const source = message.audioData || message.audioUrl
  if (!source) { showToast('这条语音没有可播放的录音'); return }
  if (activeVoiceAudio && playingVoiceIndex.value === index) {
    if (activeVoiceAudio.paused) {
      try { await activeVoiceAudio.play() } catch { showToast('语音播放失败') }
    } else activeVoiceAudio.pause()
    return
  }
  activeVoiceAudio?.pause()
  const audio = new Audio(source)
  activeVoiceAudio = audio
  playingVoiceIndex.value = index
  audio.ontimeupdate = () => { if (activeVoiceAudio === audio) voiceProgress.value = audio.duration ? audio.currentTime / audio.duration : 0 }
  audio.onended = () => { if (activeVoiceAudio === audio) { playingVoiceIndex.value = -1; voiceProgress.value = 0; activeVoiceAudio = null } }
  audio.onerror = () => { if (activeVoiceAudio === audio) { playingVoiceIndex.value = -1; voiceProgress.value = 0; activeVoiceAudio = null; showToast('语音播放失败') } }
  try { await audio.play() } catch { playingVoiceIndex.value = -1; voiceProgress.value = 0; activeVoiceAudio = null; showToast('语音播放失败') }
}

async function startVoiceRecording() {
  if (isRecording.value) {
    mediaRecorder?.stop()
    return
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showToast('当前浏览器不支持录音，请使用 iOS Safari')
    return
  }
  const recordingChatId = activeChat.value?.id
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognizedVoiceText = ''
  try {
    if (Recognition) {
      speechRecognition = new Recognition()
      speechRecognition.lang = 'zh-CN'
      speechRecognition.continuous = true
      speechRecognition.interimResults = true
      speechRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          recognizedVoiceText = Array.from(event.results).map((result) => result[0]?.transcript || '').join('')
        }
      }
      speechRecognition.start()
    }
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type))
    mediaRecorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined)
    recordingChunks = []
    mediaRecorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.push(event.data) }
    mediaRecorder.onstop = async () => {
      isRecording.value = false
      recordingStream?.getTracks().forEach((track) => track.stop())
      try { speechRecognition?.stop() } catch {}
      await new Promise((resolve) => {
        if (!speechRecognition) { resolve(); return }
        const recognition = speechRecognition
        const timeout = setTimeout(resolve, 1200)
        recognition.onend = () => { clearTimeout(timeout); resolve() }
      })
      speechRecognition = null
      const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || 'audio/mp4' })
      const audioUrl = URL.createObjectURL(blob)
      try {
        if (!blob.size) throw new Error('没有录到音频，请检查麦克风权限后重试。')
        const audioData = await blobToDataUrl(blob)
        const transcript = recognizedVoiceText.trim()
        const message = { type: 'voice', audioData, transcript, voiceImpression: '' }
        const chatId = recordingChatId
        if (!chatId) { URL.revokeObjectURL(audioUrl); return }
        message.audioUrl = audioUrl
        playSound('send')
        const history = [...(chatMessages.value[chatId] || messages.value), { from: 'me', ...message, text: '', time: currentTime(), timestamp: new Date().toISOString() }]
        chatMessages.value[chatId] = history
        messages.value = history
        persistChatHistory()
        scrollMessages()
        if (replyImmediately.value) requestReply(transcript ? `用户发送了一条语音消息，语音识别文字是：“${transcript}”。你只知道转写文字，没有听到真实录音，请根据文字自然回应，不要声称听见声音。` : '用户发送了一条语音消息，但设备没有提供语音识别文字。你无法听到录音，请自然地请用户补充文字，不要猜测内容。')
      } catch (error) {
        URL.revokeObjectURL(audioUrl)
        showToast(error.message || '语音处理失败')
      }
    }
    mediaRecorder.start()
    isRecording.value = true
    showToast('正在录音，再点一次结束')
    } catch (error) {
      try { speechRecognition?.stop() } catch {}
      speechRecognition = null
      recordingStream?.getTracks().forEach((track) => track.stop())
      recordingStream = null
      isRecording.value = false
      showToast(error.name === 'NotAllowedError' ? '请允许麦克风权限后重试' : error.message || '无法启动录音')
    }
}

function sendMessage() {
  const text = draft.value.trim()
  if (!text || !activeChat.value) return
  sendChatItem({ type: 'text', text }, text)
  draft.value = ''
}

function sendChatItem(payload, requestText) {
  if (!activeChat.value) return
  playSound('send')
  const chatId = activeChat.value.id
  const history = [...(chatMessages.value[chatId] || messages.value)]
  history.push({ from: 'me', ...payload, text: payload.text || (payload.type === 'text-image' ? `文字图：${payload.content}` : payload.type === 'transfer' ? `转账 ¥${payload.amount}` : '用户发送了一张图片。'), time: currentTime(), timestamp: new Date().toISOString(), ...(quoteDraft.value ? { replyTo: { ...quoteDraft.value } } : {}) })
  quoteDraft.value = null
  chatMessages.value[chatId] = history
  persistChatHistory()
  replyError.value = ''
  messages.value = history
  scrollMessages()
  if (replyImmediately.value) requestReply(requestText || (payload.type === 'voice' ? `用户发送了一条语音消息，语音识别文字为：${payload.transcript}。请像即时聊天一样回应。你没有听到录音；可根据用户明确提供的声音印象理解，但不要假装实际听过。` : '用户发送了一张文字图或转账卡片，请结合卡片内容自然回应。'))
}

function openComposerDialog(type) {
  attachmentOpen.value = false
  composerDialog.value = type === 'text-image' ? { type, content: '' } : { type, amount: '' }
}

function submitComposerItem() {
  const dialog = composerDialog.value
  if (!dialog || !activeChat.value) return
  if (dialog.type === 'text-image' && !dialog.content.trim()) return
  if (dialog.type === 'transfer' && !(Number(dialog.amount) > 0)) return
  const item = { ...dialog }
  composerDialog.value = null
  sendChatItem(item)
}

function respondToTransfer(action) {
  const source = messages.value[transferActionDialog.value]
  if (!source || source.type !== 'transfer') return
  const transferId = source.timestamp
  const state = action === 'accept' ? '已收款' : '已退还'
  for (const message of messages.value) {
    if (message.timestamp === transferId) message.transferStatus = state
  }
  if (activeChat.value) chatMessages.value[activeChat.value.id] = [...messages.value]
  persistChatHistory()
  transferActionDialog.value = null
  showToast(state)
}

function requestReply(userText = '') {
  const chat = activeChat.value
  if (!chat || pendingReplies[chat.id]?.promise) return
  const chatId = chat.id
  const history = [...(chatMessages.value[chatId] || messages.value)]
  if (!history.some((message) => message.from === 'me')) return
  const memoryLimit = shortTermMemoryRounds(chatId) * 2
  const requestMessages = [...(retainedChatMemory.value[chatId] || []), ...history].slice(-memoryLimit)
  const rememberedImages = new Set([...requestMessages].filter((message) => message.type === 'image').slice(-imageMemoryLimit(chatId)))
  const latestTurnStart = history.findLastIndex((message) => message.from === 'them') + 1
  const reactionCandidates = history.slice(latestTurnStart).filter((message) => message.from === 'me')
  const previousStatus = [...history].reverse().find((message) => message.from === 'them' && message.status)?.status || null
  const historyForRequest = requestMessages.map((message) => ({
    role: message.from === 'me' ? 'user' : 'assistant',
    content: message.type === 'image' && rememberedImages.has(message)
      ? [{ type: 'text', text: message.text || '用户发送了一张图片。' }, { type: 'image_url', image_url: { url: message.imageData, detail: selectedImageQuality(chatId).detail } }]
      : message.type === 'text-image' ? `（发送文字图：${message.content}）` : message.type === 'transfer' ? `（发起转账：${message.amount}元；状态：${message.transferStatus || '待处理'}）` : message.type === 'voice' ? `（语音消息${message.transcript ? `；识别文字：${message.transcript}` : '；无识别文字'}）` : message.text
  }))
  const pending = { controller: new AbortController(), promise: null }
  pendingReplies[chatId] = pending
  replyLoading.value = true
  characterTyping.value = true
  replyError.value = ''
  historyForRequest.unshift({ role: 'system', content: buildTimeContext(chat, history) })
  pending.promise = requestCharacterReply(chat, historyForRequest, pending.controller, statusBarEnabled(chatId) ? previousStatus : null, reactionCandidates)
    .then(async (replies) => {
      for (let index = 0; index < replies.length; index += 1) {
        await wait(replyDelay(replies[index].text, index))
        if (pending.controller.signal.aborted) return
        const quotedMessage = replies[index].replyTo === null ? null : history.filter((message) => message.from === 'me')[replies[index].replyTo]
        const reactionTarget = replies[index].reactionEmoji && replies[index].reactionTo !== null ? reactionCandidates[replies[index].reactionTo] : null
        if (reactionTarget) {
          reactionTarget.reaction = replies[index].reactionEmoji
          const targetTimestamp = reactionTarget.timestamp
          const storedTarget = history.find((message) => message.timestamp === targetTimestamp)
          if (storedTarget) storedTarget.reaction = replies[index].reactionEmoji
          const retainedTarget = (retainedChatMemory.value[chatId] || []).find((message) => message.timestamp === targetTimestamp)
          if (retainedTarget) retainedTarget.reaction = replies[index].reactionEmoji
        }
        history.push({ from: 'them', text: replies[index].text, ...(replies[index].type !== 'text' ? { type: replies[index].type, content: replies[index].content, amount: replies[index].amount, transferStatus: replies[index].type === 'transfer' ? '待处理' : undefined } : {}), ...(replies[index].type === 'voice' ? { voiceDescription: replies[index].voiceDescription, transcript: replies[index].text } : {}), time: currentTime(), timestamp: new Date().toISOString(), ...(index === 0 && replies[index].feeling ? { thought: replies[index].feeling } : {}), ...(replies[index].status ? { status: replies[index].status } : {}), ...(quotedMessage ? { replyTo: { from: quotedMessage.from, text: quotedMessage.text } } : {}) })
        playSound('receive')
        chatMessages.value[chatId] = [...history]
        persistChatHistory()
        showReplyNotices(chat, [replies[index].text])
        if (activeChat.value?.id === chatId) {
          messages.value = [...history]
          scrollMessages()
        }
      }
    })
    .catch((error) => {
      if (activeChat.value?.id === chatId) replyError.value = error.message || '回复失败，请检查 API 设置后重试。'
    })
    .finally(() => {
      delete pendingReplies[chatId]
      characterTyping.value = false
      if (activeChat.value?.id === chatId) replyLoading.value = false
    })
}
const searchOpen = ref(false)
const query = ref('')
const showContacts = ref(false)
const contactQuery = ref('')
const friendSearchOpen = ref(false)
const friendQuery = ref('')
const selectedFriend = ref(null)
const friendIds = ref({})
const contacts = ref([])
const tabs = ['聊天', '朋友圈', '我的']
const sections = ref([{ title: '我的人物', open: true, chats: [] }])
const filteredSections = computed(() => sections.value.map((section) => ({ ...section, chats: section.chats.filter((chat) => `${chat.name} ${chatRemark(chat.id)}`.toLowerCase().includes(query.value.trim().toLowerCase())) })).filter((section) => section.chats.length))
const filteredContacts = computed(() => contacts.value.filter((person) => person.name.toLowerCase().includes(contactQuery.value.trim().toLowerCase())))
const friendSearchResults = computed(() => {
  const term = friendQuery.value.trim().toLowerCase()
  return term ? contacts.value.filter((person) => person.name.toLowerCase().includes(term)) : []
})
function virtualAccountId(person) {
  return person.accountId || `jy_${String(person.id || person.name).replace(/[^a-zA-Z0-9]/g, '').slice(-5).toLowerCase().padStart(5, '0')}`
}

onMounted(async () => {
  const [savedCharacters, savedChats, savedChatConfig, savedMessages, savedPreferences, savedCharacterSettings] = await Promise.all([loadValue('jyos_characters'), loadValue('jyos_chat_contacts'), loadValue('jyos_chat_config'), loadValue('jyos_chat_messages'), loadValue('jyos_chat_preferences'), loadValue('jyos_character_chat_settings')])
  const savedMemory = await loadValue('jyos_retained_chat_memory')
  retainedChatMemory.value = savedMemory && typeof savedMemory === 'object' ? savedMemory : {}
  characterChatSettings.value = savedCharacterSettings && typeof savedCharacterSettings === 'object' ? savedCharacterSettings : {}
  if (savedPreferences && typeof savedPreferences === 'object') {
    enterToSend.value = savedPreferences.enterToSend === true
    replyImmediately.value = savedPreferences.replyImmediately === true
    sendSoundEnabled.value = savedPreferences.sendSoundEnabled !== false
    receiveSoundEnabled.value = savedPreferences.receiveSoundEnabled !== false
  }
  chatPreferencesReady.value = true
  contacts.value = Array.isArray(savedCharacters) ? savedCharacters.filter((person) => person.name?.trim()) : []
  chatMessages.value = savedMessages && typeof savedMessages === 'object' && !Array.isArray(savedMessages) ? savedMessages : {}
  chatHistoryReady.value = true
  if (savedChatConfig && typeof savedChatConfig === 'object') {
    chatConfig.value = {
      preset: {
        ...cloneConfig(defaultChatPreset),
        ...savedChatConfig.preset,
        name: savedChatConfig.preset?.name === 'JY 温柔日常' ? '默认预设' : (savedChatConfig.preset?.name || '默认预设'),
        entries: Array.isArray(savedChatConfig.preset?.entries)
          ? (() => {
              const savedEntries = savedChatConfig.preset.entries
              const savedById = new Map(savedEntries.map((entry) => [entry.id, entry]))
              const defaultIds = new Set([...defaultChatPreset.entries.map((entry) => entry.id), 'scenario', 'continuity', 'style', 'format', 'example', 'after'])
              const customEntries = savedEntries.filter((entry) => !defaultIds.has(entry.id))
              return [
                ...cloneConfig(defaultChatPreset.entries).map((entry) => {
                  const saved = savedById.get(entry.id)
                  if (!saved) return entry
                  return { ...entry, enabled: saved.enabled ?? entry.enabled }
                }),
                ...customEntries,
              ]
            })()
          : cloneConfig(defaultChatPreset.entries),
      },
      assignments: savedChatConfig.assignments && typeof savedChatConfig.assignments === 'object' ? savedChatConfig.assignments : {},
    }
  }
  const selectedIds = Array.isArray(savedChats) ? savedChats : []
  sections.value[0].chats = contacts.value.filter((person) => selectedIds.includes(person.id)).map((person) => ({
    id: person.id,
    name: person.name,
    subtitle: person.details?.trim() || person.occupation || '开始一段新的对话',
    time: '', unread: 0, color: person.color || '#dededb', avatar: person.avatar || person.name.slice(0, 1),
    avatarImage: person.avatar || '',
  }))
})

watch(() => sections.value[0].chats.map((chat) => chat.id), (ids) => saveValue('jyos_chat_contacts', ids))
watch([enterToSend, replyImmediately, sendSoundEnabled, receiveSoundEnabled], ([enter, immediate, sendSound, receiveSound]) => {
  if (chatPreferencesReady.value) saveValue('jyos_chat_preferences', { enterToSend: enter, replyImmediately: immediate, sendSoundEnabled: sendSound, receiveSoundEnabled: receiveSound })
})
watch(characterChatSettings, (settings) => {
  if (chatPreferencesReady.value) saveValue('jyos_character_chat_settings', JSON.parse(JSON.stringify(settings)))
}, { deep: true })
watch(chatConfig, (value) => saveValue('jyos_chat_config', JSON.parse(JSON.stringify(value))), { deep: true })

function openChatConfig() {
  configPersonId.value = contacts.value[0]?.id || ''
  chatConfigOpen.value = true
}

const personaBindingPairs = computed(() => contacts.value.map((character) => ({
  character,
  profile: profileSettings.profiles.find((profile) => profile.id === chatConfig.value.assignments[character.id]) || userProfile,
})))
const activeBindingPair = computed(() => personaBindingPairs.value[personaBindingIndex.value] || null)
function openPersonaBinding() {
  personaBindingIndex.value = Math.max(0, contacts.value.findIndex((person) => person.id === configPersonId.value))
  personaBindingOpen.value = true
}
function changePersonaBinding(direction) {
  if (personaBindingPairs.value.length < 2 || personaBindingTransition.value) return
  personaBindingTransition.value = true
  setTimeout(() => {
    personaBindingIndex.value = (personaBindingIndex.value + direction + personaBindingPairs.value.length) % personaBindingPairs.value.length
    personaBindingTransition.value = false
  }, 220)
}
function assignPersona(personId, profileId) {
  if (!personId) return
  if (profileId) chatConfig.value.assignments[personId] = profileId
  else delete chatConfig.value.assignments[personId]
}

function editChatPreset() {
  presetDraft.value = cloneConfig(chatConfig.value.preset)
}

function addPresetEntry() {
  presetDraft.value.entries.push({ id: `entry-${Date.now()}`, name: '新条目', enabled: true, content: '' })
}

function removePresetEntry(index) {
  presetDraft.value.entries.splice(index, 1)
}

function movePresetEntry(index, offset) {
  const next = index + offset
  if (next < 0 || next >= presetDraft.value.entries.length) return
  const [entry] = presetDraft.value.entries.splice(index, 1)
  presetDraft.value.entries.splice(next, 0, entry)
}

function restorePresetEntry(index) {
  const entry = presetDraft.value.entries[index]
  const defaultEntry = defaultChatPreset.entries.find((item) => item.id === entry.id)
  if (!defaultEntry) return
  presetDraft.value.entries[index] = { ...cloneConfig(defaultEntry), enabled: entry.enabled }
}

function startPresetDrag(index, event) {
  if (event.type === 'pointerdown' && event.button !== 0) return
  clearTimeout(presetHoldTimer)
  draggingPresetIndex.value = -1
  presetHoldTimer = setTimeout(() => {
    draggingPresetIndex.value = index
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    if (navigator.vibrate) navigator.vibrate(12)
  }, 350)
}

function trackPresetDrag(event) {
  if (draggingPresetIndex.value < 0) return
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.preset-setting-card')
  if (!target) return
  const cards = [...document.querySelectorAll('.preset-setting-card')]
  const targetIndex = cards.indexOf(target)
  if (targetIndex >= 0) movePresetDrag(targetIndex)
}

function movePresetDrag(index) {
  if (draggingPresetIndex.value < 0 || draggingPresetIndex.value === index) return
  const [entry] = presetDraft.value.entries.splice(draggingPresetIndex.value, 1)
  presetDraft.value.entries.splice(index, 0, entry)
  draggingPresetIndex.value = index
}

function stopPresetDrag() {
  clearTimeout(presetHoldTimer)
  draggingPresetIndex.value = -1
}

function openPresetDetail(index) {
  if (draggingPresetIndex.value >= 0) return
  presetDetailIndex.value = index
}

function closePresetDetail() {
  presetDetailIndex.value = -1
}

function savePreset() {
  const name = presetDraft.value.name.trim() || '我的聊天预设'
  chatConfig.value.preset = { ...presetDraft.value, name, entries: presetDraft.value.entries.map((entry) => ({ ...entry, name: entry.name.trim() || '未命名条目' })) }
  presetDraft.value = null
}

function openFriendSearch() {
  currentTab.value = '聊天'
  searchOpen.value = false
  query.value = ''
  friendQuery.value = ''
  selectedFriend.value = null
  friendSearchOpen.value = true
}

function addFriend(person) {
  friendIds.value[person.id] = virtualAccountId(person)
  if (!sections.value[0].chats.some((chat) => chat.id === person.id)) {
    addContact({ ...person, accountId: friendIds.value[person.id] })
  }
  selectedFriend.value = null
}

function addContact(person) {
  if (sections.value[0].chats.some((chat) => chat.id === person.id)) return
  sections.value[0].chats.push({ id: person.id, name: person.name, subtitle: person.details?.trim() || person.occupation || '开始一段新的对话', time: '', unread: 0, color: person.color || '#dededb', avatar: person.avatar || person.name.slice(0, 1), avatarImage: person.avatar || '' })
}

function removeContact(person) {
  sections.value[0].chats = sections.value[0].chats.filter((chat) => chat.id !== person.id)
}
</script>

<template>
  <div class="chat-app">
    <div v-if="replyNotices.length && !activeChat" class="reply-notice-stack" aria-live="polite" aria-label="新消息">
      <button v-for="(notice, index) in replyNotices" :key="notice.id" type="button" class="reply-notice" :style="{ '--stack-index': index }" :aria-label="`打开${notice.chat.name}的聊天`" @click="openNoticeChat(notice)">
        <span class="notice-avatar" :class="{ 'avatar-placeholder': !notice.chat.avatarImage }" :style="{ '--avatar-color': notice.chat.color }"><img v-if="notice.chat.avatarImage" :src="notice.chat.avatarImage" alt="" /><span v-else></span></span>
        <span class="notice-copy"><strong>{{ notice.chat.name }}</strong><span>{{ notice.text }}</span></span>
        <span class="notice-time">现在</span>
      </button>
    </div>
    <header class="topbar">
      <button class="back-button" aria-label="返回桌面" @click="emit('close')"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
      <div class="topbar-spacer" />
      <button class="round-action" aria-label="搜索人物" @click="openFriendSearch"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg></button>
    </header>

    <main class="chat-content">
      <template v-if="currentTab === '聊天'">
        <div class="welcome"><strong>{{ userProfile.name || '我的空间' }}</strong></div>
        <section v-for="section in filteredSections" :key="section.title" class="chat-section">
          <button class="section-toggle" type="button" :aria-expanded="section.open" @click="sections.find((item) => item.title === section.title).open = !section.open"><svg class="chevron" :class="{ folded: !sections.find((item) => item.title === section.title).open }" viewBox="0 0 20 20"><path d="m5 7 5 5 5-5"/></svg><span>{{ section.title }}</span><small>{{ section.chats.length }}</small><svg class="section-end" viewBox="0 0 20 20"><path d="m7 5 5 5-5 5"/></svg></button>
          <div v-if="sections.find((item) => item.title === section.title).open" class="chat-card">
            <button v-for="chat in section.chats" :key="chat.id" class="conversation" type="button" @click="openChat(chat)">
              <span class="avatar" :class="{ 'avatar-placeholder': !chat.avatarImage }" :style="{'--avatar-color':chat.color}"><img v-if="chat.avatarImage" :src="chat.avatarImage" :alt="`${chat.name}头像`"/><span v-else></span><i v-if="chat.online" class="online-dot"/><i v-if="chat.group" class="group-mark">群</i></span>
              <span class="conversation-copy"><span class="conversation-top"><strong>{{ chatDisplayName(chat) }}</strong><time>{{ chat.time }}</time></span><span class="conversation-bottom"><span>{{ chat.subtitle }}</span><i v-if="chat.unread" class="unread-count">{{ chat.unread }}</i></span></span>
            </button>
          </div>
        </section>
        <div v-if="!filteredSections.length" class="no-results">{{ query ? '没有找到相关对话。' : '还没有添加人物。' }}</div>
      </template>
      <section v-else-if="currentTab === '朋友圈'" class="empty-tab"><span class="empty-icon">✳</span><h1>朋友圈</h1><p>分享日常里值得记住的小事。</p><button class="empty-action">写下今天</button></section>
      <section v-else class="my-page">
        <div class="my-heading"><span>JY · MY SPACE</span><h1>我的</h1><p>把喜欢的聊天方式，留在这里。</p></div>
        <button class="my-profile-card" type="button" @click="avatarDialogOpen = true" aria-label="更改头像或个人资料">
          <span class="my-avatar" :style="userProfile.avatar ? { backgroundImage: `url(${userProfile.avatar})` } : {}">
            <span v-if="!userProfile.avatar">{{ (userProfile.name || 'J').slice(0, 1) }}</span>
          </span>
          <span class="my-profile-copy"><strong>{{ userProfile.name || '我的小角落' }}</strong><small>{{ userProfile.bio || '慢慢聊，也好好生活。' }}</small></span>
        </button>
        <p class="preference-label">CHAT PREFERENCES <span>聊天偏好</span></p>
        <section class="preference-card">
          <button class="preference-row" type="button" role="switch" :aria-checked="enterToSend" @click="enterToSend = !enterToSend">
            <span class="preference-icon enter-icon">↵</span>
            <span class="preference-copy"><strong>回车键发送</strong><small>关闭时，回车用于换行</small></span>
            <span class="toggle-pill" :class="{ on: enterToSend }"><i /></span>
          </button>
          <div class="preference-divider" />
          <button class="preference-row" type="button" role="switch" :aria-checked="replyImmediately" @click="replyImmediately = !replyImmediately">
            <span class="preference-icon">↗</span>
            <span class="preference-copy"><strong>发送后联系人立刻回复</strong><small>关闭时，发送多条后可手动接收回复</small></span>
            <span class="toggle-pill" :class="{ on: replyImmediately }"><i /></span>
          </button>
          <div class="preference-divider" />
          <button class="preference-row sound-setting-row" type="button" @click="sendSoundInput?.click()">
            <span class="preference-icon">♫</span>
            <span class="preference-copy"><strong>发送音效</strong><small>{{ sendSoundFile || '默认：可爱短提示音 · 点击自定义' }}</small></span>
            <span class="toggle-pill sound-toggle" :class="{ on: sendSoundEnabled }" role="switch" :aria-checked="sendSoundEnabled" aria-label="启用发送音效" @click.stop="sendSoundEnabled = !sendSoundEnabled"><i /></span>
            <span class="sound-action" @click.stop="resetSound('send')">恢复默认</span>
            <input ref="sendSoundInput" class="sound-file-input" type="file" accept="audio/*,video/mp4,video/webm" @click.stop @change="setSoundFile('send', $event.target.files?.[0]); $event.target.value = ''" />
          </button>
          <div class="preference-divider" />
          <button class="preference-row sound-setting-row" type="button" @click="receiveSoundInput?.click()">
            <span class="preference-icon">♪</span>
            <span class="preference-copy"><strong>通知音效</strong><small>{{ receiveSoundFile || '默认：消息提示音 · 点击自定义' }}</small></span>
            <span class="toggle-pill sound-toggle" :class="{ on: receiveSoundEnabled }" role="switch" :aria-checked="receiveSoundEnabled" aria-label="启用通知音效" @click.stop="receiveSoundEnabled = !receiveSoundEnabled"><i /></span>
            <span class="sound-action" @click.stop="resetSound('receive')">恢复默认</span>
            <input ref="receiveSoundInput" class="sound-file-input" type="file" accept="audio/*,video/mp4,video/webm" @click.stop @change="setSoundFile('receive', $event.target.files?.[0]); $event.target.value = ''" />
          </button>
          <div class="preference-divider" />
          <div class="preference-note"><span>✦</span> 按住 Shift + Enter 始终可以换行</div>
        </section>
        <p class="preference-label">PERSONALIZE <span>个性化设置</span></p>
        <button class="config-card" type="button" @click="openChatConfig">
          <span class="preference-icon config-icon">✧</span>
          <span class="preference-copy"><strong>聊天配置</strong><small>{{ boundCount }} 位联系人已绑定人设 · {{ chatConfig.preset.name }}</small></span>
          <span class="config-arrow">›</span>
        </button>
        <div class="my-footer-note">a little space, just for you ♡</div>
      </section>
    </main>

    <transition name="conversation-fade">
      <div v-if="activeChat" class="conversation-overlay">
        <section class="conversation-page">
          <header class="conversation-header">
            <button class="conversation-back" aria-label="返回聊天列表" @click="leaveConversation"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
            <div class="conversation-identity">
              <span class="conversation-avatar" :class="{ 'avatar-placeholder': !activeChat.avatarImage }" :style="{ '--avatar-color': activeChat.color }"><img v-if="activeChat.avatarImage" :src="activeChat.avatarImage" alt=""/><span v-else></span></span>
              <div class="conversation-identity-copy"><h1 class="conversation-title">{{ chatDisplayName(activeChat) }}</h1><span class="conversation-online">Online</span></div>
            </div>
            <button class="conversation-settings" aria-label="聊天设置" @click="openChatSettings"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
          </header>
          <main ref="messageList" class="message-list" @scroll.passive="onMessageListScroll">
            <button v-if="visibleMessageOffset > 0" class="load-older-messages" @click="loadOlderMessages">加载更早的消息（{{ visibleMessageOffset }} 条）</button>
            <template v-for="(message, index) in visibleMessages" :key="visibleMessageOffset + index">
            <div v-if="shouldShowTimestamp(index)" class="chat-time-divider">{{ messageTime(message) }}</div>
            <div class="message-row" :class="[message.from, { 'has-tail': isLastInRun(visibleMessageOffset + index), 'message-selected': selectedMessages.includes(visibleMessageOffset + index) }]" @pointerdown="!multiDeleteMode && startMessagePress(visibleMessageOffset + index, $event)" @pointerup="cancelMessagePress" @pointerleave="cancelMessagePress" @pointercancel="cancelMessagePress" @contextmenu.prevent="openMessageMenu(visibleMessageOffset + index, $event)" @click="multiDeleteMode ? toggleMessageSelection(visibleMessageOffset + index) : (message.from === 'them' && thoughtPreviewEnabled() && message.thought ? toggleThoughtMessage(index) : (message.from === 'them' && statusBarEnabled() && message.status ? toggleStatusMessage(visibleMessageOffset + index) : suppressMessageClick($event)))">
              <span v-if="message.from === 'them'" class="tiny-avatar" :class="{ 'avatar-placeholder': !activeChat.avatarImage }" :style="{'--avatar-color': activeChat.color}"><img v-if="activeChat.avatarImage" :src="activeChat.avatarImage" alt=""/><span v-else>{{ (activeChat.name || '对').slice(0, 1) }}</span></span>
              <span v-else class="tiny-avatar user-tiny-avatar" :style="userProfile.avatar ? { backgroundImage: `url(${userProfile.avatar})` } : {}"><span v-if="!userProfile.avatar">{{ (userProfile.name || '我').slice(0, 1) }}</span></span>
              <div class="message-content-stack"><div v-if="message.from === 'them' && thoughtPreviewEnabled() && message.thought" class="thought-preview" :class="{ expanded: expandedThoughtMessages.includes(index) }"><button type="button" class="thought-preview-toggle" :aria-expanded="expandedThoughtMessages.includes(index)" @click.stop="toggleThoughtMessage(index)"><svg class="thought-bulb-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4m-6-6.2a7 7 0 1 1 8 0c-.9.7-1.4 1.5-1.5 2.2h-5c-.1-.7-.6-1.5-1.5-2.2Z"/></svg><span>{{ expandedThoughtMessages.includes(index) ? 'Thought Summary' : 'Before Reply' }}</span><span class="thought-chevron">{{ expandedThoughtMessages.includes(index) ? '−' : '+' }}</span></button><p v-if="expandedThoughtMessages.includes(index)">{{ message.thought }}</p></div><div class="message-bubble-wrap"><span v-if="multiDeleteMode" class="message-selection-check" :class="{ checked: selectedMessages.includes(visibleMessageOffset + index) }" aria-hidden="true">✓</span><template v-if="message.type === 'text-image'"><button type="button" class="text-image-card" :class="{ 'polaroid-character': message.from === 'them' }" :aria-label="`打开来自${message.from === 'me' ? '我' : activeChat.name}的文字图`" @click.stop="polaroidPreview = { content: message.content, from: message.from }"><span class="polaroid-photo"><span class="special-card-label">{{ message.from === 'me' ? 'A MOMENT' : activeChat.name }}</span><span class="polaroid-copy">{{ message.content }}</span></span><span class="polaroid-caption">{{ message.from === 'me' ? 'a little note' : 'a moment to keep' }}</span></button></template><template v-else-if="message.type === 'transfer'"><button type="button" class="transfer-card" @click.stop="transferActionDialog = visibleMessageOffset + index"><span class="transfer-icon">¥</span><span class="transfer-copy"><strong>转账</strong><b>¥{{ Number(message.amount).toFixed(2) }}</b><small>{{ message.transferStatus || '待处理' }}</small></span></button></template><template v-else-if="message.type === 'voice'"><div class="voice-message-layout" :class="{ 'voice-message-outgoing': message.from === 'me' }"><Transition name="voice-transcript-expand"><p v-if="(message.from === 'me' && message.transcript) || (message.from === 'them' && expandedVoiceTranscript === visibleMessageOffset + index && message.transcript)" class="voice-transcript">{{ message.transcript }}<span v-if="message.from === 'them' && message.voiceDescription" class="voice-description">{{ message.voiceDescription.startsWith('（') ? message.voiceDescription : `（${message.voiceDescription}）` }}</span></p></Transition><div class="voice-message-card"><button type="button" class="voice-play-button" :aria-label="message.from === 'me' ? '播放我的语音' : '语音条'" :disabled="message.from === 'me' && !message.audioData && !message.audioUrl" @click.stop="playVoiceMessage(message, visibleMessageOffset + index)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button><span class="voice-wave" :class="{ playing: playingVoiceIndex === visibleMessageOffset + index }" :style="{ '--voice-progress': `${playingVoiceIndex === visibleMessageOffset + index ? voiceProgress * 100 : 0}%` }" aria-hidden="true"><i v-for="bar in 18" :key="bar" :style="{ '--bar-height': `${8 + ((bar * 13) % 17)}px` }" /></span></div></div><p v-if="message.from === 'me' && message.voiceImpression" class="voice-impression">声音印象：{{ message.voiceImpression }}</p></template><template v-else-if="message.type === 'image'"><button type="button" class="image-message-card" @click.stop="imagePreview = message.imageData"><img :src="message.imageData" alt="用户发送的图片" /></button></template><template v-else><div v-if="message.replyTo" class="quoted-message"><strong>{{ message.replyTo.from === 'me' ? '我' : activeChat.name }}</strong><span>{{ message.replyTo.text }}</span></div><p class="message-bubble"><span class="message-text">{{ message.text }}</span><span v-if="normalizeReaction(message.reaction)" class="message-reaction" :class="{ 'character-reaction': message.from === 'them' }" :aria-label="`反应：${normalizeReaction(message.reaction)}`">{{ normalizeReaction(message.reaction) }}</span></p></template></div>
                <section v-if="message.from === 'them' && statusBarEnabled() && message.status && expandedStatusMessages.includes(index)" class="character-status-card" aria-label="角色状态"><div class="status-card-heading"><span>MOOD · STATUS</span><i>✦</i></div><div class="status-metric"><span>好感度</span><div class="status-track"><i :style="{ width: `${message.status.affection ?? 0}%` }" /></div><strong>{{ message.status.affection ?? '—' }}</strong></div><div class="status-metric anger"><span>生气值</span><div class="status-track"><i :style="{ width: `${message.status.anger ?? 0}%` }" /></div><strong>{{ message.status.anger ?? '—' }}</strong></div><div class="status-metric sadness"><span>伤心值</span><div class="status-track"><i :style="{ width: `${message.status.sadness ?? 0}%` }" /></div><strong>{{ message.status.sadness ?? '—' }}</strong></div></section>
              </div>
              <time v-if="isLastInRun(index) && message.from !== 'me'">{{ messageTime(message) }}</time>
            </div>
            </template>
            <div v-if="userTyping || (characterTyping && activeChat)" class="typing-row" :class="{ me: userTyping && !characterTyping, them: characterTyping }" role="status" :aria-label="characterTyping ? `${activeChat.name}正在输入` : '我正在输入'">
              <span v-if="characterTyping" class="tiny-avatar" :class="{ 'avatar-placeholder': !activeChat.avatarImage }" :style="{'--avatar-color': activeChat.color}"><img v-if="activeChat.avatarImage" :src="activeChat.avatarImage" alt=""/><span v-else></span></span>
              <span v-else class="tiny-avatar user-tiny-avatar" :style="userProfile.avatar ? { backgroundImage: `url(${userProfile.avatar})` } : {}"><span v-if="!userProfile.avatar">{{ (userProfile.name || '我').slice(0, 1) }}</span></span>
              <span class="typing-bubble"><i></i><i></i><i></i></span>
            </div>
          </main>
          <p v-if="replyLoading" class="reply-status" role="status">{{ activeChat.name }}正在组织语言…</p>
          <p v-else-if="replyError" class="reply-status reply-error" role="alert">{{ replyError }}</p>
            <div class="composer" :class="{ 'composer-with-quote': quoteDraft }">
              <div v-if="quoteDraft" class="quote-compose-preview"><span><strong>回复 {{ quoteDraft.from === 'me' ? '自己' : activeChat.name }}</strong><span>{{ quoteDraft.text }}</span></span><button type="button" aria-label="取消引用" @click="clearQuoteDraft">×</button></div>
              <form class="composer-input-row" @submit.prevent="sendMessage">
                <button type="button" class="composer-tool composer-add" aria-label="添加附件" @click="attachmentOpen = !attachmentOpen"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
                <div class="composer-field">
                  <textarea v-model="draft" aria-label="输入消息" placeholder="发消息…" autocomplete="off" rows="1" @keydown.enter="onComposerEnter" />
                  <button type="button" class="composer-tool composer-camera" aria-label="发送图片" title="从相册发送图片" @click="imageInput?.click()"><svg viewBox="0 0 24 24"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
                  <input ref="imageInput" class="hidden-image-input" type="file" accept="image/*" aria-label="选择图片" @change="handleImageSelected" />
                </div>
                <button v-if="draft.trim()" class="send-button" aria-label="发送消息" :disabled="replyLoading"><svg viewBox="0 0 24 24"><path d="M4 12h15M13 5l7 7-7 7"/></svg></button>
                <button v-else type="button" class="composer-tool composer-mic" :class="{ recording: isRecording }" :aria-label="isRecording ? '结束录音' : '录制语音消息'" :title="isRecording ? '点击结束录音' : '点击录制语音'" @click="startVoiceRecording"><svg v-if="!isRecording" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></svg><span v-else class="recording-indicator" aria-hidden="true"></span></button>
                <button v-if="!replyImmediately && !replyLoading" type="button" class="receive-button" aria-label="接收联系人回复" title="接收回复" :disabled="!messages.some((message) => message.from === 'me')" @click="requestReply"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14" /></svg></button>
              </form>
            </div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <section v-if="chatSettingsOpen && activeChat" class="chat-settings-page" aria-label="聊天设置">
        <header class="chat-settings-header">
          <button type="button" aria-label="返回聊天" @click="chatSettingsOpen = false">‹</button>
          <div><h2>聊天设置</h2></div>
          <i />
        </header>
        <div class="chat-settings-scroll">
          <p class="chat-settings-section-title">PERSONALIZE <span>个性化</span></p>
          <section class="chat-setting-card remark-setting-card">
            <span class="chat-setting-icon remark-icon">✎</span>
            <div class="chat-setting-copy"><strong>聊天备注</strong><small>仅在你的聊天列表和聊天顶部显示，不会改变角色设定。</small><input class="chat-remark-input" type="text" maxlength="40" :value="chatRemark()" :placeholder="activeChat.name" aria-label="聊天备注" @input="setChatRemark($event.target.value)" /></div>
          </section>
          <p class="chat-settings-section-title">MEMORY <span>对话记忆</span></p>
          <section class="chat-setting-card memory-setting-card">
            <span class="chat-setting-icon memory-icon">◷</span>
            <div class="chat-setting-copy"><strong>角色短期记忆</strong><small>设置角色回复时参考的最近对话轮数，聊天历史仍会完整保存。</small></div>
            <label class="memory-input-wrap"><input aria-label="角色短期记忆轮数" type="number" min="1" max="500" step="1" :value="shortTermMemoryRounds()" @change="setShortTermMemoryRounds($event.target.value)" /><span>轮</span></label>
          </section>
          <section class="chat-setting-card image-setting-card">
            <span class="chat-setting-icon image-icon">▧</span>
            <div class="chat-setting-copy"><strong>图片消息记忆</strong><small>发送给角色时最多携带最近的图片数量，聊天记录仍会完整保存。</small></div>
            <label class="memory-input-wrap"><input aria-label="最近图片记忆数量" type="number" min="1" max="50" step="1" :value="imageMemoryLimit()" @change="setImageMemoryLimit($event.target.value)" /><span>张</span></label>
          </section>
          <section class="chat-setting-card image-quality-setting-card">
            <span class="chat-setting-icon image-quality-icon">◌</span>
            <div class="chat-setting-copy"><strong>图片传输画质</strong><small>影响压缩尺寸与视觉输入 detail；tokens 为单张图片的大致估算，实际取决于模型。</small><select aria-label="图片传输画质" :value="imageQuality()" @change="setImageQuality($event.target.value)"><option v-for="option in imageQualityOptions" :key="option.id" :value="option.id">{{ option.label }} · {{ option.tokens }}</option></select></div>
          </section>
          <section class="chat-setting-card">
            <span class="chat-setting-icon status-icon">✦</span>
            <div class="chat-setting-copy"><strong>回复时附带角色状态</strong><small>展开角色回复，查看好感度、生气值与伤心值。</small></div>
            <button type="button" class="toggle-switch" :class="{ on: statusBarEnabled() }" role="switch" :aria-checked="statusBarEnabled()" aria-label="回复时附带角色状态" @click="setStatusBarEnabled(!statusBarEnabled())"><i /></button>
          </section>
          <section class="chat-setting-card">
            <span class="chat-setting-icon thought-icon">☁</span>
            <div class="chat-setting-copy"><strong>显示回复前的思绪摘要</strong><small>展示角色第一人称的简短感受，不包含隐藏的逐步推理。</small></div>
            <button type="button" class="toggle-switch" :class="{ on: thoughtPreviewEnabled() }" role="switch" :aria-checked="thoughtPreviewEnabled()" aria-label="显示回复前的思绪摘要" @click="setThoughtPreviewEnabled(!thoughtPreviewEnabled())"><i /></button>
          </section>
          <p class="chat-settings-section-title">CHAT HISTORY <span>聊天记录</span></p>
          <section class="chat-setting-card history-setting-card">
            <span class="chat-setting-icon history-icon">⌫</span>
            <div class="chat-setting-copy"><strong>管理聊天记录</strong><small>清除聊天记录，或重启并清空这段聊天的短期记忆。</small></div>
            <button type="button" class="settings-row-action" @click="openHistoryAction('clear')">清除</button>
            <button type="button" class="settings-row-action restart-action" @click="openHistoryAction('restart')">重启</button>
          </section>
        </div>
      </section>
    </transition>
    <div v-if="historyActionDialog" class="acrylic-overlay history-confirm-overlay" @click.self="historyActionDialog = null">
      <section class="message-edit-dialog history-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="history-confirm-title">
        <h3 id="history-confirm-title">{{ historyActionDialog === 'clear' ? '清除聊天记录？' : '重启这段聊天？' }}</h3>
        <p>{{ historyActionDialog === 'clear' ? '聊天消息会被删除，但角色的短期记忆内容会保留，并在后续回复时继续参考。' : '聊天消息和角色的短期记忆内容都会被清除。此操作无法撤销。' }}</p>
        <footer><button type="button" @click="historyActionDialog = null">取消</button><button type="button" class="history-confirm-delete" @click="confirmHistoryAction">确认删除</button></footer>
      </section>
    </div>
    <transition name="contacts-fade">
      <div v-if="messageMenu" class="message-menu-backdrop" @click.self="messageMenu = false">
        <section class="message-menu-group" :style="{ left: `${messageMenu.left}px`, top: `${messageMenu.top}px`, '--menu-origin-x': `${messageMenu.originX * 100}%`, '--menu-origin-y': `${messageMenu.originY * 100}%` }" role="dialog" aria-modal="true" aria-label="消息操作">
          <div v-if="!multiDeleteMode && messages[selectedMessageIndex]?.from === 'them'" class="reaction-picker" aria-label="选择 emoji 反应">
            <button v-for="emoji in reactionChoices" :key="emoji" type="button" :aria-label="`反应 ${emoji}`" @click="addMessageReaction(emoji)">{{ emoji }}</button>
          </div>
          <div class="message-action-sheet">
            <p v-if="multiDeleteMode" class="message-action-title">已选择 {{ selectedMessages.length }} 条</p>
            <button v-if="!multiDeleteMode" type="button" @click="quoteSelectedMessage()"><span>回复</span><span>↩</span></button>
            <button v-if="!multiDeleteMode" type="button" @click="copySelectedMessage()"><span>复制</span><span>▢</span></button>
            <button v-if="!multiDeleteMode" type="button" @click="editSelectedMessage()"><span>编辑</span><span>✎</span></button>
            <button v-if="!multiDeleteMode" type="button" @click="multiDeleteMode = true; messageMenu = false; selectedMessages = [selectedMessageIndex]"><span>多选</span><span>☷</span></button>
            <button v-if="!multiDeleteMode" type="button" class="message-delete-action" @click="deleteSelectedMessages()"><span>删除</span><span>⌫</span></button>
            <button v-if="multiDeleteMode" type="button" class="message-delete-action" :disabled="!selectedMessages.length" @click="deleteSelectedMessages(selectedMessages)"><span>删除所选</span><span>⌫</span></button>
            <button type="button" class="message-cancel-action" @click="messageMenu = false; multiDeleteMode = false; selectedMessages = []">取消</button>
          </div>
        </section>
      </div>
    </transition>
    <div v-if="multiDeleteMode" class="multi-delete-bar"><span>已选 {{ selectedMessages.length }} 条</span><button class="multi-delete-button" type="button" :disabled="!selectedMessages.length" @click="deleteSelectedMessages(selectedMessages)">删除</button><button class="multi-cancel-button" type="button" @click="multiDeleteMode = false; selectedMessages = []">取消</button></div>
<Transition name="polaroid-lift"><div v-if="polaroidPreview" class="polaroid-overlay" role="dialog" aria-modal="true" aria-label="文字图预览" @click.self="polaroidPreview = null"><button type="button" class="polaroid-close" aria-label="关闭文字图" @click="polaroidPreview = null">×</button><article class="polaroid-expanded" :class="{ 'polaroid-character': polaroidPreview.from === 'them' }"><div class="polaroid-expanded-photo"><span class="special-card-label">{{ polaroidPreview.from === 'me' ? 'A MOMENT' : activeChat?.name }}</span><p>{{ polaroidPreview.content }}</p></div><div class="polaroid-expanded-caption">{{ polaroidPreview.from === 'me' ? 'a little note' : 'a moment to keep' }}</div></article></div></Transition>
      <div v-if="imagePreview" class="acrylic-overlay image-preview-overlay" role="dialog" aria-modal="true" aria-label="图片预览" @click.self="imagePreview = null"><button type="button" class="image-preview-close" aria-label="关闭图片预览" @click="imagePreview = null">×</button><div class="image-preview-dialog"><img :src="imagePreview" alt="图片预览" /></div></div>
    <transition name="attachment-fade"><div v-if="attachmentOpen" class="attachment-backdrop" @click="attachmentOpen = false"><section class="attachment-panel" role="dialog" aria-modal="true" aria-label="更多功能" @click.stop><div class="attachment-handle" aria-hidden="true"></div><h2>更多功能</h2><div class="attachment-actions"><button type="button" @click="openComposerDialog('text-image')"><span class="attachment-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/></svg></span><span>文字图</span></button><button type="button" @click="openComposerDialog('transfer')"><span class="attachment-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 7.5 3.5 4 3.5-4M12 11.5v5M9 12h6M9 15h6"/></svg></span><span>转账</span></button></div></section></div></transition>
    <div v-if="composerDialog" class="acrylic-overlay" @click.self="composerDialog = null"><section class="message-edit-dialog feature-dialog" role="dialog" aria-modal="true"><h3>{{ composerDialog.type === 'text-image' ? '发送文字图' : '发起转账' }}</h3><label v-if="composerDialog.type === 'text-image'" class="feature-field"><span>文字图内容</span><textarea v-model="composerDialog.content" rows="5" placeholder="描述画面、视角和氛围…" /></label><label v-else class="feature-field"><span>转账金额（元）</span><input v-model="composerDialog.amount" type="number" min="0.01" step="0.01" placeholder="输入金额" /></label><footer><button type="button" @click="composerDialog = null">取消</button><button type="button" :disabled="composerDialog.type === 'text-image' ? !composerDialog.content.trim() : !(Number(composerDialog.amount) > 0)" @click="submitComposerItem">发送</button></footer></section></div>
    <div v-if="transferActionDialog !== null" class="acrylic-overlay" @click.self="transferActionDialog = null"><section class="message-edit-dialog feature-dialog" role="dialog" aria-modal="true"><h3>转账 ¥{{ Number(messages[transferActionDialog]?.amount || 0).toFixed(2) }}</h3><p class="transfer-action-note">{{ messages[transferActionDialog]?.transferStatus || '请选择如何处理这笔转账' }}</p><footer><button type="button" @click="transferActionDialog = null">取消</button><button type="button" @click="respondToTransfer('return')">退还</button><button type="button" @click="respondToTransfer('accept')">收款</button></footer></section></div>
    <div v-if="messageDialog" class="acrylic-overlay" @click.self="messageDialog = null">
      <section class="message-edit-dialog" role="dialog" aria-modal="true" aria-label="编辑消息"><h3>编辑消息</h3><textarea v-model="messageDialog.text" rows="4" autofocus /><footer><button type="button" @click="messageDialog = null">取消</button><button type="button" @click="confirmEditMessage">保存</button></footer></section>
    </div>
    <transition name="contacts-fade"><div v-if="toastMessage" class="message-toast" role="status">{{ toastMessage }}</div></transition>
    <footer class="bottom-area">
      <nav class="bottom-nav" aria-label="页面切换"><button v-for="tab in tabs" :key="tab" type="button" :class="{ selected: currentTab === tab }" :aria-current="currentTab === tab ? 'page' : undefined" @click="currentTab = tab"><svg v-if="tab === '聊天'" viewBox="0 0 24 24"><path d="M7.2 18.3 4 20l1-3.7A8.4 8.4 0 1 1 7.2 18.3Z"/></svg><svg v-else-if="tab === '朋友圈'" viewBox="0 0 24 24" class="moments-icon"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="12" r="5.8"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2.8v2.5M21.2 12h-2.5M12 21.2v-2.5M2.8 12h2.5"/></svg><svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c.5-3.6 3-5.8 7-5.8s6.5 2.2 7 5.8"/></svg><span>{{ tab }}</span></button></nav>
    </footer>
    <transition name="contacts-fade">
      <div v-if="friendSearchOpen" class="friend-search-overlay">
        <section v-if="!selectedFriend" class="friend-search-page" role="dialog" aria-modal="true" aria-label="搜索人物">
          <header class="friend-search-header"><button type="button" aria-label="返回聊天" @click="friendSearchOpen = false">‹</button><h2>添加好友</h2><i /></header>
          <label class="friend-search-input"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="friendQuery" autofocus placeholder="搜索人物名称" /><button v-if="friendQuery" type="button" aria-label="清空搜索" @click="friendQuery = ''">×</button></label>
          <p class="friend-search-hint">搜索人物名称，找到后可以查看主页并添加好友。</p>
          <div class="friend-search-results">
            <button v-for="person in friendSearchResults" :key="person.id" class="friend-search-row" type="button" @click="selectedFriend = person">
              <span class="friend-search-avatar" :style="person.avatar ? { backgroundImage: `url(${person.avatar})` } : {}"><span v-if="!person.avatar">{{ person.name.slice(0, 1) }}</span></span>
              <span class="friend-search-copy"><strong>{{ person.name }}</strong><small>ID: {{ virtualAccountId(person) }}</small></span><span class="friend-search-arrow">›</span>
            </button>
            <div v-if="friendQuery && !friendSearchResults.length" class="friend-search-empty">没有找到这个人物</div>
            <div v-else-if="!friendQuery" class="friend-search-empty">输入人物名称开始搜索</div>
          </div>
        </section>
        <section v-else class="friend-profile-page" role="dialog" aria-modal="true" aria-label="人物主页">
          <header class="friend-search-header"><button type="button" aria-label="返回搜索结果" @click="selectedFriend = null">‹</button><h2>个人主页</h2><i /></header>
          <div class="friend-profile-content">
            <div class="friend-profile-avatar" :style="selectedFriend.avatar ? { backgroundImage: `url(${selectedFriend.avatar})` } : {}"><span v-if="!selectedFriend.avatar">{{ selectedFriend.name.slice(0, 1) }}</span></div>
            <h3>{{ selectedFriend.name }}</h3><p>ID: {{ virtualAccountId(selectedFriend) }}</p>
            <button class="friend-add-button" type="button" :disabled="sections[0].chats.some((chat) => chat.id === selectedFriend.id)" @click="addFriend(selectedFriend)">{{ sections[0].chats.some((chat) => chat.id === selectedFriend.id) ? '已添加' : '添加好友' }}</button>
          </div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="showContacts" class="contacts-overlay" @click.self="showContacts = false">
        <section class="contacts-page" role="dialog" aria-modal="true" aria-label="添加联系人">
          <header class="contacts-header"><button type="button" aria-label="返回聊天" @click="showContacts = false">‹</button><div><span>JY · PEOPLE</span><h2>添加联系人</h2></div><i></i></header>
          <p class="contacts-intro">从你的人物档案里，挑一位开始聊天。</p>
          <label class="contact-search"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="contactQuery" autofocus placeholder="搜索人物"/><button v-if="contactQuery" type="button" aria-label="清除搜索" @click="contactQuery = ''">×</button></label>
          <div class="contact-results">
            <button v-for="person in filteredContacts" :key="person.id" type="button" class="contact-row" @click="addContact(person)">
              <span class="contact-avatar" :class="{ 'avatar-placeholder': !person.avatar }" :style="{'--avatar-color': person.color || '#e7e5df'}"><img v-if="person.avatar" :src="person.avatar" :alt="''"/><span v-else></span></span>
              <span class="contact-copy"><strong>{{ person.name }}</strong><small>{{ person.occupation || person.gender || '人物档案' }}</small></span>
              <span class="contact-add" :class="{ added: sections[0].chats.some((chat) => chat.id === person.id) }">{{ sections[0].chats.some((chat) => chat.id === person.id) ? '已添加' : '＋ 添加' }}</span>
            </button>
            <div v-if="!filteredContacts.length" class="contacts-empty"><span>✳</span><strong>{{ contacts.length ? '没有找到这个人物' : '这里还没有人物档案' }}</strong><p>{{ contacts.length ? '试试其他名字关键词。' : '先去「人物」App 创建角色档案，再回来添加。' }}</p></div>
          </div>
          <button class="contacts-done" type="button" @click="showContacts = false">完成</button>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="chatConfigOpen" class="config-page-overlay">
        <section class="config-page" role="dialog" aria-modal="true" aria-label="聊天配置">
          <header class="config-page-header">
            <button type="button" aria-label="返回我的页面" @click="chatConfigOpen = false">‹</button>
            <h2>聊天配置</h2><span />
          </header>
          <div class="config-page-scroll">
            <div class="config-tile-grid">
              <button class="config-group persona-group" type="button" aria-label="人设绑定" @click="openPersonaBinding">
                <span class="config-3d-icon persona-3d-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><defs><linearGradient id="persona-glass" x1="10" y1="7" x2="54" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff" stop-opacity=".94"/><stop offset=".42" stop-color="#eef7ff" stop-opacity=".58"/><stop offset="1" stop-color="#dcecff" stop-opacity=".72"/></linearGradient><linearGradient id="persona-gloss" x1="17" y1="8" x2="42" y2="47" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".98"/><stop offset=".48" stop-color="#fff" stop-opacity=".42"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M32 5c7.8 0 14 6.2 14 14v5h3.5c5.2 0 9.5 4.3 9.5 9.5v14c0 5.2-4.3 9.5-9.5 9.5h-35c-5.2 0-9.5-4.3-9.5-9.5v-14c0-5.2 4.3-9.5 9.5-9.5H18v-5C18 11.2 24.2 5 32 5Z" fill="url(#persona-glass)" stroke="#fff" stroke-opacity=".96" stroke-width="2.5"/><path d="M24 24v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#ffffffd9" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="39" r="4" fill="#fff" fill-opacity=".98"/><path d="M10 34c0-3.3 2.7-6 6-6h31c3.9 0 7 3.1 7 7v10c0 3.9-3.1 7-7 7H16c-3.3 0-6-2.7-6-6V34Z" fill="url(#persona-gloss)" opacity=".56"/><path d="M11 32c2-4 5-5 9-5" fill="none" stroke="#fff" stroke-opacity=".96" stroke-width="2.5" stroke-linecap="round"/><path d="M8 47c9 4 37 5 48-1" fill="none" stroke="#fff" stroke-opacity=".48" stroke-width="1.2"/></svg></span>
                <strong>人设绑定</strong>
              </button>
              <button class="config-group preset-group" type="button" aria-label="预设配置" @click="editChatPreset">
                <span class="config-3d-icon preset-3d-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><defs><linearGradient id="preset-glass" x1="10" y1="7" x2="53" y2="59" gradientUnits="userSpaceOnUse"><stop stop-color="#ffffff" stop-opacity=".96"/><stop offset=".48" stop-color="#f5f2ff" stop-opacity=".62"/><stop offset="1" stop-color="#e6e1f7" stop-opacity=".78"/></linearGradient><linearGradient id="preset-shine" x1="20" y1="8" x2="43" y2="48" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".98"/><stop offset=".5" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M32 5 39.4 22.7 58 25.2 44.3 38.1 47.8 57 32 47.7 16.2 57l3.5-18.9L6 25.2l18.6-2.5L32 5Z" fill="url(#preset-glass)" stroke="#fff" stroke-opacity=".98" stroke-width="2.5" stroke-linejoin="round"/><path d="m32 10 5.9 14.1 14.8 2-10.9 10.3 2.8 15.1L32 44.1l-12.6 7.4 2.8-15.1-10.9-10.3 14.8-2L32 10Z" fill="url(#preset-shine)" opacity=".58"/><path d="M22 27c2.4-6 6-10 10-14" fill="none" stroke="#fff" stroke-opacity=".98" stroke-width="2.5" stroke-linecap="round"/><path d="m16 37 3.6 1.1M45 18l1.4-3.4M49 43l3.5.5" fill="none" stroke="#fff" stroke-opacity=".72" stroke-width="1.2" stroke-linecap="round"/><circle cx="44" cy="43" r="3" fill="#fff" fill-opacity=".95"/></svg></span>
                <strong>预设配置</strong>
              </button>
            </div>
          </div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="personaBindingOpen" class="persona-binding-overlay">
        <section class="persona-binding-page" role="dialog" aria-modal="true" aria-label="人设绑定">
          <header class="persona-binding-header">
            <button type="button" aria-label="返回聊天设置" @click="personaBindingOpen = false">‹</button>
            <div><h2>人设绑定</h2></div><i />
          </header>
          <div v-if="activeBindingPair" class="persona-binding-content">
            <p class="persona-binding-intro">为每段对话，选择彼此相遇的身份</p>
            <div class="polaroid-stage" :class="{ flipping: personaBindingTransition }">
              <article class="polaroid-card character-polaroid">
                <div class="polaroid-photo" :style="activeBindingPair.character.avatar ? { backgroundImage: `url(${activeBindingPair.character.avatar})` } : {}">
                  <span v-if="!activeBindingPair.character.avatar">{{ (activeBindingPair.character.name || '角').slice(0, 1) }}</span>
                </div>
                <strong>{{ activeBindingPair.character.name || '角色' }}</strong><small>角色人设</small>
              </article>
              <span class="binding-link" aria-hidden="true">♡</span>
              <article class="polaroid-card user-polaroid">
                <div class="polaroid-photo" :style="activeBindingPair.profile.avatar ? { backgroundImage: `url(${activeBindingPair.profile.avatar})` } : {}">
                  <span v-if="!activeBindingPair.profile.avatar">{{ (activeBindingPair.profile.name || '我').slice(0, 1) }}</span>
                </div>
                <strong>{{ activeBindingPair.profile.name || '我的人设' }}</strong><small>用户人设</small>
              </article>
            </div>
            <div class="binding-select-wrap">
              <label for="persona-profile-select">为 {{ activeBindingPair.character.name || '当前角色' }} 选择用户人设</label>
              <select id="persona-profile-select" :value="chatConfig.assignments[activeBindingPair.character.id] || ''" @change="assignPersona(activeBindingPair.character.id, $event.target.value)">
                <option value="">使用默认人设 · {{ userProfile.name || '我' }}</option>
                <option v-for="profile in profileSettings.profiles" :key="profile.id" :value="profile.id">{{ profile.name || '未命名人设' }}</option>
              </select>
            </div>
            <div class="binding-navigation">
              <button type="button" aria-label="上一对绑定" :disabled="personaBindingPairs.length < 2" @click="changePersonaBinding(-1)">‹</button>
              <span>{{ personaBindingIndex + 1 }} <i>/</i> {{ personaBindingPairs.length }}</span>
              <button type="button" aria-label="下一对绑定" :disabled="personaBindingPairs.length < 2" @click="changePersonaBinding(1)">›</button>
            </div>
          </div>
          <div v-else class="persona-binding-empty"><div class="polaroid-photo">✦</div><strong>还没有可绑定的角色</strong><p>添加角色后，就可以为每段对话选择对应的人设。</p><button type="button" @click="personaBindingOpen = false; chatConfigOpen = false; showContacts = true">添加角色</button></div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="presetDraft" class="preset-config-page">
        <section class="preset-config-content" role="dialog" aria-modal="true" aria-label="预设配置">
          <header class="preset-config-header">
            <button type="button" aria-label="返回聊天设置" @click="presetDraft = null">‹</button>
            <div><h2>预设配置</h2><small>管理聊天提示词</small></div>
            <button class="preset-config-save-top" type="button" @click="savePreset">保存</button>
          </header>
          <div class="preset-config-scroll">
            <p class="preset-config-section-title">当前预设</p>
            <label class="preset-name-card"><span class="preset-config-icon">✧</span><span class="preset-name-copy"><strong>预设名称</strong><small>为这组聊天规则起个名字</small></span><input v-model="presetDraft.name" maxlength="40" aria-label="预设名称" placeholder="我的聊天预设" /></label>
            <div class="preset-config-section-title"><span>提示词条目</span><button type="button" @click="addPresetEntry">＋ 添加</button></div>
            <article v-for="(entry, index) in presetDraft.entries" :key="entry.id" class="preset-setting-card" :class="{ dragging: draggingPresetIndex === index }" @pointerenter="movePresetDrag(index)">
              <button class="preset-entry-summary" type="button" @click="openPresetDetail(index)">
                <span class="preset-config-icon">✦</span>
                <span class="preset-entry-copy"><strong>{{ entry.name || '未命名条目' }}</strong><small>{{ entry.content?.trim().replace(/\\s+/g, ' ') || '暂无简介' }}</small></span>
                <span class="preset-entry-chevron">›</span>
              </button>
              <button class="preset-entry-handle" type="button" aria-label="长按拖动排序" @pointerdown.stop="startPresetDrag(index, $event)" @pointermove="trackPresetDrag" @pointerup="stopPresetDrag" @pointercancel="stopPresetDrag" @lostpointercapture="stopPresetDrag" @contextmenu.prevent>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button class="preset-setting-toggle" type="button" role="switch" :aria-checked="entry.enabled" :aria-label="entry.enabled ? '停用条目' : '启用条目'" :class="{ on: entry.enabled }" @click="entry.enabled = !entry.enabled"><i /></button>
            </article>
          </div>
          <div v-if="presetDetailIndex >= 0 && presetDraft.entries[presetDetailIndex]" class="preset-detail-overlay" @click.self="closePresetDetail">
            <section class="preset-detail-dialog" role="dialog" aria-modal="true" aria-label="编辑预设条目">
              <header><h3>条目详情</h3><button type="button" aria-label="关闭" @click="closePresetDetail">×</button></header>
              <label>条目标题<input v-model="presetDraft.entries[presetDetailIndex].name" maxlength="36" placeholder="条目名称" /></label>
              <label>详细内容<textarea v-model="presetDraft.entries[presetDetailIndex].content" rows="9" placeholder="写下这条提示词……" /></label>
              <footer>
                <button v-if="defaultChatPreset.entries.some((item) => item.id === presetDraft.entries[presetDetailIndex].id)" type="button" @click="restorePresetEntry(presetDetailIndex)">恢复默认</button>
                <button type="button" class="preset-remove-button" @click="removePresetEntry(presetDetailIndex); closePresetDetail()">删除条目</button>
                <button type="button" class="preset-detail-done" @click="closePresetDetail">完成</button>
              </footer>
            </section>
          </div>
          <footer class="preset-config-footer"><button type="button" @click="presetDraft = null">取消</button><button type="button" @click="savePreset">保存预设</button></footer>
        </section>
      </div>
    </transition>
    <PhotoPickerDialog
      v-if="avatarDialogOpen"
      :model-value="userProfile.avatar"
      title="更换我的头像"
      eyebrow="MY AVATAR"
      @save="userProfile.avatar = $event; avatarDialogOpen = false"
      @close="avatarDialogOpen = false"
    />
  </div>
</template>

<style scoped>
.attachment-backdrop{background:transparent}
.attachment-panel{left:max(12px, calc((100vw - 620px)/2 + 12px))!important;bottom:calc(env(safe-area-inset-bottom) + 72px)!important;width:148px!important;box-sizing:border-box;padding:5px!important;border:1px solid rgba(235,235,235,.8)!important;border-radius:12px!important;background:rgba(255,255,255,.94)!important;box-shadow:0 4px 18px rgba(30,30,35,.07)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transform-origin:20px 100%}
.attachment-handle,.attachment-panel h2{display:none}
.attachment-actions{display:flex;flex-direction:column}
.attachment-panel .attachment-actions button{width:100%;height:44px;display:flex;align-items:center;gap:10px;padding:0 10px;border:0;border-radius:8px;color:#262626;background:transparent;text-align:left;font-size:14px;cursor:pointer}
.attachment-panel .attachment-actions button:hover,.attachment-panel .attachment-actions button:active{background:rgba(0,0,0,.035)}
.attachment-actions .attachment-icon{width:24px;height:24px;flex:none;color:#333}
.attachment-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.attachment-fade-enter-active .attachment-panel{animation:attachment-pop .25s cubic-bezier(.2,1.4,.5,1) both}
.attachment-fade-leave-active .attachment-panel{transition:opacity .14s,transform .14s}
.attachment-fade-leave-to .attachment-panel{opacity:0;transform:translateY(6px) scale(.94)}
@keyframes attachment-pop{from{opacity:0;transform:translateY(10px) scale(.88)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.attachment-fade-enter-active .attachment-panel{animation:none}.attachment-fade-leave-active .attachment-panel{transition:none}}
.reply-notice-stack{position:fixed;top:calc(env(safe-area-inset-top) + 10px);left:50%;z-index:60;width:min(calc(100% - 28px),440px);display:flex;flex-direction:column;align-items:center;pointer-events:none;transform:translateX(-50%)}.reply-notice{width:100%;min-height:66px;position:relative;display:flex;align-items:center;gap:11px;margin-top:calc(var(--stack-index) * -12px);padding:11px 14px;border:1px solid #ffffffa8;border-radius:22px;background:linear-gradient(135deg,#ffffffd9,#f4f3f0ce);box-shadow:0 12px 32px #29282520;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);animation:notice-in .38s cubic-bezier(.2,.8,.2,1) both;transform:scale(calc(1 - var(--stack-index) * .025));transform-origin:top center;color:inherit;text-align:left;font:inherit;cursor:pointer;pointer-events:auto}.reply-notice:not(:first-child){margin-top:-13px;filter:brightness(.98)}.message-row.notice-message-highlight .message-bubble{animation:notice-message-pulse 1.8s ease both}@keyframes notice-message-pulse{0%,100%{filter:none}25%,65%{filter:brightness(1.16);box-shadow:0 0 0 4px #bda7ef55,0 5px 22px #6e55ac25}}.avatar-placeholder{background:#bdbdbd!important}.notice-avatar.avatar-placeholder,.avatar.avatar-placeholder,.contact-avatar.avatar-placeholder{border-color:transparent}.notice-avatar{width:42px;height:42px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border:2px solid #ffffffd9;border-radius:50%;color:#626366;background:linear-gradient(145deg,#fff,var(--avatar-color));font-family:Georgia,serif;font-size:15px}.notice-avatar img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.notice-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.notice-copy strong{overflow:hidden;color:#45464a;font-size:12px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.notice-copy>span{display:-webkit-box;overflow:hidden;color:#696a6e;font-size:12px;line-height:1.4;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}.notice-time{align-self:flex-start;flex:none;color:#aaa9a5;font-size:9px}@keyframes notice-in{from{opacity:0;translate:0 -18px;scale:.97}to{opacity:1;translate:0 0;scale:1}}@media(prefers-reduced-motion:reduce){.reply-notice{animation:none}.heartbeat-wave i{animation:none;opacity:.85}}
.chat-app{--ink:#27282a;--soft:#8b8c90;position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;overflow:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);color:var(--ink);background:#f0f0f0;font-family:"Source Han Sans SC","思源黑体","Noto Sans SC",sans-serif;font-weight:400}.chat-app button,.chat-app input{font:inherit}.topbar{height:72px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 22px}.back-button{width:45px;height:45px;display:grid;place-items:center;border:0;border-radius:50%;color:#28292b;background:#ffffffd9;box-shadow:0 5px 19px #33333308}.back-button svg{width:20px;fill:none;stroke:currentColor;stroke-width:1.8}.round-action{width:76px;height:46px;display:grid;place-items:center;border:0;border-radius:28px;color:#28292b;background:#ffffffeb;box-shadow:0 5px 19px #33333308}.round-action svg{width:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}.chat-content{width:min(100%,620px);flex:1;min-height:0;overflow:auto;margin:0 auto;padding:10px 22px 10px;scrollbar-width:thin;scrollbar-color:#d2d2d2 transparent}.welcome{display:flex;align-items:center;margin:10px 0 27px}.welcome h1{margin:0;color:#4b4c4f;font-size:clamp(30px,8vw,42px);font-weight:700;letter-spacing:-1.6px}.search-field,.contact-search{height:44px;display:flex;align-items:center;gap:10px;margin:0 0 15px;padding:0 15px;border:1px solid #ffffff;border-radius:24px;background:#ffffffc9;box-shadow:0 5px 18px #33333308}.search-field svg,.contact-search svg{width:17px;flex:none;fill:none;stroke:#85868a;stroke-width:1.7}.search-field input,.contact-search input{min-width:0;flex:1;border:0;outline:0;color:var(--ink);background:transparent;font-size:12px}.search-field button,.contact-search button{border:0;color:#85868a;background:transparent;font-size:18px}.chat-section{margin-bottom:14px}.section-toggle{width:100%;height:35px;display:flex;align-items:center;gap:9px;padding:0 4px;border:0;color:#737478;background:transparent;text-align:left;font-size:17px;font-weight:500;cursor:pointer}.section-toggle>svg{width:17px;fill:none;stroke:#a9aaac;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.section-toggle .chevron{transition:transform .18s}.section-toggle .chevron.folded{transform:rotate(-90deg)}.section-toggle small{color:#a0a1a4;font-size:10px}.section-toggle .section-end{margin-left:auto;transform:rotate(90deg)}.chat-card{overflow:hidden;padding:2px 14px;border-radius:24px;background:#ffffffd9}.conversation{width:100%;min-height:72px;display:flex;align-items:center;gap:13px;padding:9px 2px;border:0;border-bottom:1px solid #efeff0;background:transparent;text-align:left;cursor:pointer}.conversation:last-child{border-bottom:0}.avatar{width:48px;height:48px;position:relative;flex:none;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#f7f7f7,var(--avatar-color))}.avatar>span{color:#67686b;font-family:Georgia,"PingFang SC",serif;font-size:17px}.avatar>img,.contact-avatar img{width:100%;height:100%;position:absolute;inset:0;border-radius:50%;object-fit:cover}.online-dot{position:absolute;right:0;bottom:0;width:11px;height:11px;border:2px solid white;border-radius:50%;background:#9ca99c}.group-mark{position:absolute;right:-2px;bottom:0;width:17px;height:17px;display:grid;place-items:center;border:2px solid white;border-radius:50%;color:#fff;background:#a3a4a7;font-size:7px;font-style:normal}.conversation-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.conversation-top,.conversation-bottom{display:flex;align-items:center;justify-content:space-between;gap:9px}.conversation-top strong{overflow:hidden;color:#303134;font-size:14px;font-weight:550;text-overflow:ellipsis;white-space:nowrap}.conversation-top time{flex:none;color:#b0b1b3;font-size:10px}.conversation-bottom>span{overflow:hidden;color:#a3a4a6;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.unread-count{min-width:18px;height:18px;flex:none;display:grid;place-items:center;padding:0 5px;border-radius:12px;color:white;background:#9c9da0;font-size:9px;font-style:normal}.no-results{padding:25px 8px;color:#999a9c;text-align:center;font-size:12px}.empty-tab{min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#5b5c5f;text-align:center}.empty-icon,.profile-avatar{width:65px;height:65px;display:grid;place-items:center;margin-bottom:16px;border-radius:50%;color:#6e6f72;background:#fff;font-size:23px}.profile-avatar{font-family:Georgia,serif;font-size:20px}.empty-tab h1{margin:0;font-size:22px;font-weight:600}.empty-tab p{margin:8px 0 16px;color:#999a9d;font-size:12px}.empty-action{padding:9px 17px;border:0;border-radius:20px;color:#626367;background:#ffffffd9;font-size:11px}.my-page{min-height:100%;padding:8px 2px 30px;color:#45464a}.my-heading{padding:14px 5px 24px}.my-heading>span,.preference-label{color:#b0aaa3;font-size:9px;letter-spacing:.18em}.my-heading h1{margin:8px 0 5px;color:#424348;font-size:32px;font-weight:650;letter-spacing:-1px}.my-heading p{color:#a3a1a0;font-size:12px}.my-profile-card{width:100%;position:relative;display:flex;align-items:center;gap:14px;padding:17px;border:1px solid #ffffff;border-radius:25px;color:inherit;background:linear-gradient(135deg,#ffffffdf,#f8f7f4d9);box-shadow:0 10px 28px #6e65550a;text-align:left;cursor:pointer;transition:transform .18s,box-shadow .18s}.my-profile-card:active{transform:scale(.985);box-shadow:0 5px 16px #6e65550d}.my-profile-card:focus-visible{outline:2px solid #c6bcb0;outline-offset:3px}.my-avatar{width:60px;height:60px;flex:none;display:grid;place-items:center;overflow:hidden;border:3px solid #fff;border-radius:50%;background-color:#e7e3dd;background-image:linear-gradient(145deg,#ede8e1,#d8d8d2);background-position:center;background-size:cover;box-shadow:0 4px 12px #5552}.my-avatar>span{color:#8d8983;font-family:Georgia,serif;font-size:22px}.my-profile-copy{min-width:0;display:flex;flex-direction:column;gap:6px}.my-profile-copy strong{color:#535251;font-size:15px;font-weight:600}.my-profile-copy small{overflow:hidden;color:#aaa7a3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.profile-sparkle{margin-left:auto;color:#c4b9aa;font-size:18px}.preference-label{display:flex;align-items:center;gap:9px;margin:27px 6px 11px}.preference-label span{color:#8f8d8a;font-size:11px;letter-spacing:0}.preference-card{padding:3px 16px 13px;border:1px solid #ffffff;border-radius:24px;background:#ffffffc9;box-shadow:0 8px 24px #6e655508}.preference-row{width:100%;min-height:69px;display:flex;align-items:center;gap:12px;border:0;background:transparent;text-align:left;cursor:pointer}.sound-setting-row{position:relative}.sound-toggle{flex:none}.sound-action{flex:none;padding:6px 9px;border:1px solid #ece9e4;border-radius:15px;color:#99938a;background:#faf9f7;font-size:9px}.sound-file-input{display:none}
.preference-icon{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:13px;color:#999185;background:#f2f0ec;font-size:20px}.preference-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.preference-copy strong{color:#5d5b58;font-size:12px;font-weight:600}.preference-copy small{color:#aaa7a2;font-size:10px}.toggle-pill{width:39px;height:23px;position:relative;flex:none;border-radius:20px;background:#e5e3df;transition:background .2s}.toggle-pill i{width:17px;height:17px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.toggle-pill.on{background:#34c759}.toggle-pill.on i{transform:translateX(16px)}.preference-divider{height:1px;margin:0 0 10px 46px;background:#f0efed}.preference-note{display:flex;align-items:center;gap:7px;padding-left:46px;color:#aaa7a3;font-size:9px}.preference-note span{color:#c1b7a9}.my-footer-note{margin:26px 0 0;color:#c3bdb5;text-align:center;font-family:Georgia,serif;font-size:10px;letter-spacing:.06em}.config-card{width:100%;min-height:68px;display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #fff;border-radius:23px;color:inherit;background:#ffffffc9;box-shadow:0 8px 24px #6e655508;text-align:left;cursor:pointer;transition:transform .18s}.config-card:active{transform:scale(.985)}.config-icon{color:#a89a88}.config-arrow{color:#bab5ae;font-family:Georgia,serif;font-size:25px}.config-overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:14px;background:#38363338;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.config-sheet{width:min(100%,520px);height:min(82vh,680px);display:flex;flex-direction:column;overflow:hidden;padding:19px 20px 16px;border:1px solid #ffffffd9;border-radius:29px;background:#f5f4f1;box-shadow:0 24px 80px #25252525}.chat-settings-sheet{height:min(56dvh,460px)}.history-actions{display:flex;flex-direction:column;gap:8px}.history-action{display:flex;flex-direction:column;gap:5px;padding:12px 13px;border:1px solid #efede8;border-radius:16px;background:#faf9f7;text-align:left;cursor:pointer}.history-action strong{color:#68645d;font-size:11px;font-weight:600}.history-action span{color:#aaa49b;font-size:9px;line-height:1.5}.history-action.restart strong{color:#ad7770}.history-confirm-overlay{background:#00000026;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.history-confirm-dialog{border-color:#f0f0f0;background:#fff;box-shadow:0 18px 55px #00000024;backdrop-filter:none;-webkit-backdrop-filter:none}.history-confirm-dialog h3{color:#343538}.history-confirm-dialog p{margin:0;color:#77797d;font-size:12px;line-height:1.65}.history-confirm-dialog footer button{color:#55575b;background:#ededee}.history-confirm-dialog .history-confirm-delete{color:#55575b;background:#e5e5e7}
.chat-settings-page{position:fixed;inset:0;z-index:38;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;padding:calc(env(safe-area-inset-top) + 18px) 20px calc(env(safe-area-inset-bottom) + 16px);color:#424348;background:#fff}.chat-settings-header{width:min(100%,620px);display:grid;grid-template-columns:42px 1fr 42px;align-items:center;flex:none;margin:0 auto 20px}.chat-settings-header>button{width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:0;color:#5d5e60;background:transparent;font-size:27px;line-height:1;cursor:pointer}.chat-settings-header>div{text-align:center}.chat-settings-header>div>span{color:#b0aaa3;font-size:8px;letter-spacing:.18em}.chat-settings-header h2{margin:4px 0 0;color:#55565a;font-size:18px;font-weight:550;letter-spacing:.04em}.chat-settings-header>i{width:38px}.chat-settings-scroll{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto;padding:0 2px 18px;scrollbar-width:thin;scrollbar-color:#e2e1de transparent}.chat-settings-section-title{display:flex;align-items:center;gap:9px;margin:17px 5px 11px;color:#b0aaa3;font-size:9px;letter-spacing:.17em}.chat-settings-section-title span{color:#8f8d8a;font-size:11px;letter-spacing:0}.chat-setting-card{min-height:78px;display:flex;align-items:center;gap:13px;margin-bottom:10px;padding:13px 15px;border:1px solid #ffffffd9;border-radius:25px;background:linear-gradient(135deg,#ffffffd9,#f8f8f6c9);box-shadow:0 7px 22px #5e5a4d0b;backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}.chat-setting-icon{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:15px;font-size:20px}.memory-icon{color:#8c7be0;background:#efebff}.couple-icon{color:#e481a4;background:#fff0f4}.status-icon{color:#e2a448;background:#fff5e3}.thought-icon{color:#6999d0;background:#edf5ff}.history-icon{color:#dd8075;background:#fff0ed}.chat-setting-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.chat-setting-copy strong{color:#55565a;font-size:12px;font-weight:650}.chat-setting-copy small{color:#9b9b9c;font-size:10px;line-height:1.5}.remark-setting-card .chat-setting-copy{align-items:stretch}.chat-remark-input{width:100%;height:36px;box-sizing:border-box;margin-top:5px;padding:0 11px;border:1px solid #e8e7e3;border-radius:12px;outline:0;color:#55565a;background:#f8f8f6;box-shadow:inset 0 1px 3px #55555508;font:inherit;font-size:11px;transition:border-color .18s,box-shadow .18s,background .18s}.chat-remark-input::placeholder{color:#b3b2ae}.chat-remark-input:focus{border-color:#b8d7c0;background:#fff;box-shadow:0 0 0 3px #7bc88b1c}.memory-setting-card .memory-input-wrap{width:91px;height:36px;flex:none;gap:4px;padding:0 9px;border-radius:15px;background:#f5f5f3}.memory-input-wrap input{width:100%;min-width:0;border:0;outline:0;color:#595a5d;background:transparent;font:inherit;font-size:13px}.memory-input-wrap span{flex:none;color:#97989a;font-size:10px}.image-setting-card .image-icon{color:#6f9dcb;background:#edf5ff}.image-quality-setting-card{align-items:flex-start}.image-quality-icon{color:#9b85c8;background:#f3efff}.image-quality-setting-card select{width:100%;height:34px;margin-top:4px;padding:0 9px;border:1px solid #e8e7e3;border-radius:11px;outline:0;color:#68696c;background:#fff;font:inherit;font-size:11px}.hidden-image-input{display:none}.image-message-card{display:block;width:min(280px,100%);padding:0;border:0;border-radius:13px;overflow:hidden;background:#f2f2f2;cursor:zoom-in}.image-preview-overlay{align-items:center}.image-preview-close{position:absolute;top:calc(env(safe-area-inset-top) + 18px);right:18px;width:36px;height:36px;border:0;border-radius:50%;color:#555;background:#fff;font-size:25px;line-height:1;cursor:pointer}.image-preview-dialog{max-width:min(94vw,700px);max-height:90vh;padding:8px;border-radius:18px;background:#fff}.image-preview-dialog img{display:block;max-width:100%;max-height:82vh;object-fit:contain;border-radius:12px}.image-preview-dialog{max-width:min(94vw,700px);max-height:90vh;padding:8px;border-radius:18px;background:#fff}.image-preview-dialog img{display:block;max-width:100%;max-height:82vh;object-fit:contain;border-radius:12px}.toggle-switch{width:43px;height:26px;position:relative;flex:none;padding:0;border:0;border-radius:16px;background:#e7e7e5;cursor:pointer;transition:background .2s}.toggle-switch i{width:20px;height:20px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.toggle-switch.on{background:#34c759}.toggle-switch.on i{transform:translateX(17px)}.history-setting-card{flex-wrap:wrap}.history-setting-card .chat-setting-copy{flex-basis:calc(100% - 60px)}.settings-row-action{padding:7px 12px;border:1px solid #e8e8e6;border-radius:16px;color:#77787a;background:#fff;font-size:10px;cursor:pointer}.settings-row-action.restart-action{color:#c17870}.chat-settings-overlay{z-index:38}.chat-settings-sheet{height:min(62dvh,480px)}.memory-panel{padding:17px}.contacts-overlay{position:fixed;inset:0;z-index:30;display:flex;justify-content:center;align-items:stretch;padding:0 12px;background:#28282a38;backdrop-filter:blur(8px)}.contacts-page{width:min(100%,560px);display:flex;flex-direction:column;margin:auto;max-height:min(90dvh,760px);padding:19px 20px 16px;border:1px solid #ffffffd9;border-radius:28px;background:#f5f4f2;box-shadow:0 24px 80px #25252525}.contacts-header{display:grid;grid-template-columns:40px 1fr 40px;align-items:center}.contacts-header>button{width:34px;height:34px;border:0;border-radius:50%;color:#76777a;background:#ffffffc9;font-size:27px;line-height:1;cursor:pointer}.contacts-header>div{text-align:center}.contacts-header>div>span{color:#aaa9a5;font-size:8px;letter-spacing:.18em}.contacts-header h2{margin:3px 0 0;color:#4c4d50;font-size:19px;font-weight:600}.contacts-header>i{width:34px}.contacts-intro{margin:16px 0 13px;color:#929294;text-align:center;font-size:11px}.contact-search{height:46px;flex:none;margin-bottom:10px;border-color:#fff;border-radius:25px;background:#fff}.contact-results{flex:1;min-height:100px;overflow:auto}.contact-row{width:100%;min-height:68px;display:flex;align-items:center;gap:11px;padding:8px 3px;border:0;border-bottom:1px solid #e8e7e4;background:transparent;text-align:left;cursor:pointer}.contact-avatar{width:45px;height:45px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#696a6c;background:linear-gradient(145deg,#fff,var(--avatar-color));font-family:Georgia,serif;font-size:16px}.contact-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.contact-copy strong{overflow:hidden;color:#4c4d50;font-size:12px;font-weight:550;text-overflow:ellipsis;white-space:nowrap}.contact-copy small{overflow:hidden;color:#a2a2a3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.contact-add{padding:6px 10px;border:1px solid #e1dfda;border-radius:18px;color:#767772;background:#ffffffa8;font-size:9px;white-space:nowrap}.contact-add.added{border-color:#e8e7e4;color:#aaa9a5;background:transparent}.contacts-empty{min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#858589;text-align:center}.contacts-empty>span{width:42px;height:42px;display:grid;place-items:center;margin-bottom:10px;border-radius:50%;color:#aaa99e;background:#ffffffc9;font-size:18px}.contacts-empty strong{font-size:12px;font-weight:550}.contacts-empty p{max-width:240px;margin:6px 0;color:#a3a3a4;font-size:10px;line-height:1.6}.contacts-done{height:40px;flex:none;margin-top:12px;border:0;border-radius:22px;color:#5d5e60;background:#e6e5e2;font-size:11px;cursor:pointer}.contacts-fade-enter-active,.contacts-fade-leave-active{transition:opacity .2s,transform .2s}.contacts-fade-enter-from,.contacts-fade-leave-to{opacity:0;transform:translateY(8px)}.bottom-area{width:min(100% - 32px,560px);flex:none;margin:0 auto;padding:8px 0 max(10px,env(safe-area-inset-bottom));}.bottom-tools{display:flex;align-items:center;gap:12px;margin-bottom:8px}.news-search{height:62px;min-width:0;flex:1;display:flex;align-items:center;gap:15px;padding:0 20px;border:1px solid #ffffff;border-radius:36px;color:#696a6d;background:#ffffffd9;box-shadow:0 8px 25px #3333330a;text-align:left;cursor:pointer}.news-search svg{width:25px;height:25px;flex:none;fill:none;stroke:#333438;stroke-width:1.8;stroke-linecap:round}.news-search span{font-size:15px}.compose-fab{width:62px;height:62px;flex:none;display:grid;place-items:center;border:1px solid #ffffff;border-radius:50%;color:#52545a;background:#ffffffdf;box-shadow:0 8px 25px #3333330a;cursor:pointer}.compose-fab svg{width:27px;fill:currentColor;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.compose-fab svg path:first-child{stroke:none}.bottom-nav{height:42px;display:grid;grid-template-columns:repeat(3,1fr);align-items:center;border:1px solid #ffffffb8;border-radius:24px;background:#ffffff91;box-shadow:0 5px 18px #33333308;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.bottom-nav button{height:34px;display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:18px;color:#96979a;background:transparent;font-size:11px;cursor:pointer}.bottom-nav button.selected{color:#414246;background:#ffffffd9;box-shadow:0 2px 8px #3333330b}.bottom-nav button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.conversation-overlay{position:fixed;inset:0;z-index:25;display:flex;justify-content:center;background:#fff}.conversation-page{width:min(100%,620px);height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 30px);background:#fff}.conversation-header{height:96px;position:relative;flex:none;display:flex;align-items:flex-start;justify-content:space-between}.conversation-header .back-button,.dialog-more{width:54px;height:54px;display:grid;place-items:center;border:0;border-radius:50%;color:#08090a;background:#fff;box-shadow:0 8px 28px #0000000d;cursor:pointer}.conversation-header .back-button svg{width:30px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.conversation-identity{position:absolute;left:50%;top:13px;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);z-index:2}.conversation-identity.couple-mode{top:8px;display:grid;grid-template-columns:76px 112px 76px;grid-template-rows:76px auto;column-gap:5px;row-gap:0;justify-items:center;align-items:center}.dialog-avatar{width:94px;height:94px;position:relative;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#9caecc}.couple-mode .dialog-avatar{width:76px;height:76px}.dialog-avatar img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.dialog-avatar>svg{width:100%;height:100%}.couple-avatar{background-color:#e7e3dd;background-image:linear-gradient(145deg,#ede8e1,#d8d8d2);background-position:center;background-size:cover;color:#77736d;font-size:23px}.heartbeat-wave{width:112px;height:64px;display:flex;align-items:center;justify-content:center;gap:3px;grid-column:2;grid-row:1}.heartbeat-wave i{width:3px;height:6px;flex:none;border-radius:3px;background:#171717;transform-origin:center;animation:heartbeat-wave 1.1s cubic-bezier(.36,0,.64,1) infinite}.heartbeat-wave i:nth-child(1),.heartbeat-wave i:nth-child(11){height:5px;animation-delay:.02s}.heartbeat-wave i:nth-child(2),.heartbeat-wave i:nth-child(10){height:10px;animation-delay:.07s}.heartbeat-wave i:nth-child(3),.heartbeat-wave i:nth-child(9){height:17px;animation-delay:.12s}.heartbeat-wave i:nth-child(4),.heartbeat-wave i:nth-child(8){height:27px;animation-delay:.17s}.heartbeat-wave i:nth-child(5),.heartbeat-wave i:nth-child(7){height:40px;animation-delay:.22s}.heartbeat-wave i:nth-child(6){height:52px;animation-delay:.27s}@keyframes heartbeat-wave{0%,100%{transform:scaleY(.24);opacity:.45}50%{transform:scaleY(1);opacity:1}}.couple-mode .character-avatar{grid-column:1;grid-row:1}.couple-mode .couple-avatar{grid-column:3;grid-row:1}.couple-mode .identity-name{grid-column:1 / 4;grid-row:2;margin-top:-2px}.identity-name{position:relative;display:flex;align-items:center;margin-top:-8px;padding:7px 14px 8px 19px;border:1px solid #ffffffd9;outline:0;appearance:none;-webkit-appearance:none;border-radius:30px;color:#08090a;background:linear-gradient(135deg,#ffffffed,#f8f8f8d9);box-shadow:0 5px 22px #0000000a;backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);font-family:inherit;font-size:19px;font-weight:750;white-space:nowrap;cursor:pointer}.identity-name:focus-visible{outline:2px solid #d8d8d8;outline-offset:2px}.identity-name i{margin-left:5px;color:#aeb1b3;font-size:25px;font-style:normal}.dialog-more svg{width:31px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.message-list{flex:1;min-height:0;overflow:auto;padding:111px 0 18px;scrollbar-width:none}.load-older-messages{display:block;margin:0 auto 14px;padding:8px 14px;border:1px solid #ececec;border-radius:18px;color:#777;background:#f8f8f8;font:inherit;font-size:12px;cursor:pointer}.day-label{display:none}.message-row{width:100%;min-width:0;display:flex;align-items:flex-end;gap:0;margin:0 0 4px}.message-row.them{justify-content:flex-start}.message-row.me{justify-content:flex-end;flex-wrap:wrap}.tiny-avatar{display:none}.message-content-stack{width:88%;max-width:88%;min-width:0;flex:0 1 88%;display:flex;flex-direction:column;align-items:flex-start;gap:7px}.message-row.them .message-content-stack{min-width:0}.message-row.me .message-content-stack{align-items:flex-end}.message-bubble{position:relative;display:block;box-sizing:border-box;width:fit-content;max-width:100%;min-width:0;flex:0 1 auto;margin:0;padding:13px 17px;border-radius:27px;color:#111;background:#e9e9eb;font-family:"Source Han Sans SC","思源黑体","Noto Sans SC",sans-serif;font-size:18px;font-weight:500;line-height:1.4;overflow-wrap:anywhere}.character-status-card{width:min(270px,100%);display:flex;flex-direction:column;gap:9px;padding:11px 13px;border:1px solid #eeece8;border-radius:20px;background:linear-gradient(145deg,#fbfaf8,#f3f1ed);box-shadow:0 5px 16px #71695c0d;animation:status-card-in .2s ease-out}.thought-preview{width:min(300px,100%);overflow:visible;animation:status-card-in .2s ease-out}.thought-preview-toggle{width:auto;max-width:100%;min-height:25px;display:flex;align-items:center;gap:6px;padding:0;border:0;color:#8b8b8b;background:transparent;text-align:left;font-size:10px;font-weight:500;cursor:pointer}.thought-bulb-icon{width:13px;height:13px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;color:#b7a77f}.thought-spark{width:14px;height:14px;display:grid;place-items:center;color:#777;font-size:13px;animation:thought-pulse 1.8s ease-in-out infinite}.thought-chevron{margin-left:0;color:#9a9a9a;font-size:16px;line-height:1;transition:transform .18s}.thought-preview.expanded .thought-chevron{transform:rotate(90deg)}.thought-preview p{margin:3px 0 4px 21px;padding:0;color:#777;font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.thought-preview-toggle:focus-visible{outline:2px solid #c9bfb3;outline-offset:3px;border-radius:4px}@keyframes thought-pulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}@media(prefers-reduced-motion:reduce){.thought-spark{animation:none}}.status-card-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;color:#aaa39a;font-size:8px;letter-spacing:.16em}.status-card-heading i{color:#b8ad9d;font-size:12px;font-style:normal}.status-metric{display:grid;grid-template-columns:47px 1fr 24px;align-items:center;gap:8px;color:#817c74;font-size:9px}.status-metric strong{color:#777169;text-align:right;font-size:9px;font-weight:600;font-variant-numeric:tabular-nums}.status-track{height:5px;overflow:hidden;border-radius:8px;background:#e9e6e0}.status-track i{height:100%;display:block;border-radius:inherit;background:#b5bfae;transition:width .35s ease}.status-metric.anger .status-track i{background:#d1b2a9}.status-metric.sadness .status-track i{background:#b2bdc9}@keyframes status-card-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}.message-row.them .message-bubble:after,.message-row.me .message-bubble:after{content:"";position:absolute;bottom:-7px;width:17px;height:18px;background:inherit;clip-path:path("M 0 0 C 1 8 4 13 17 18 C 11 13 10 7 10 0 Z");pointer-events:none}.message-row.them.has-tail .message-bubble:after,.message-row.me.has-tail .message-bubble:after{display:block}.message-row.them:not(.has-tail) .message-bubble:after,.message-row.me:not(.has-tail) .message-bubble:after{display:none}.message-row.them .message-bubble:after{left:7px;transform:scaleX(-1)}.message-row.me .message-bubble{border-radius:27px;color:#fff;background:#35a9ed}.message-row.me .message-bubble:after{right:7px}.message-row time{display:none}.message-row.me time{display:block;flex-basis:100%;padding:4px 8px 0 0;color:#8d8d91;text-align:right;font-size:13px;font-weight:600}.message-row.me .delivery-status{display:block;flex-basis:100%;margin-top:-4px;padding-right:8px;color:#99999d;text-align:right;font-size:11px;font-weight:500}/* Instagram-inspired compact composer: attachment, rounded message field, then camera/send. */
.attachment-backdrop{position:fixed;inset:0;z-index:45;background:transparent}.attachment-panel{position:absolute;left:16px;bottom:calc(env(safe-area-inset-bottom) + 76px);width:150px;display:flex;flex-direction:column;padding:6px;border:1px solid #f1f1f1;border-radius:18px;background:#fff;box-shadow:0 5px 20px #0000000a}.attachment-panel button{height:48px;display:flex;align-items:center;gap:12px;padding:0 11px;border:0;border-radius:12px;color:#27282a;background:#fff;text-align:left;font-size:14px;cursor:pointer}.attachment-panel button:active{background:#f7f7f7}.attachment-icon{width:25px;height:25px;display:grid;place-items:center;color:#555;font-size:18px}.feature-dialog{align-self:center}.feature-field{display:flex;flex-direction:column;gap:8px;margin:8px 0;color:#666;font-size:12px}.feature-field textarea,.feature-field input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #e8e8e8;border-radius:12px;outline:none;color:#333;background:#fafafa;font:inherit;font-size:14px;line-height:1.5}.feature-field textarea{resize:vertical}.feature-dialog footer button:disabled{opacity:.4;cursor:not-allowed}.text-image-card{width:170px;min-height:218px;box-sizing:border-box;display:flex;flex-direction:column;gap:0;padding:8px 8px 10px;border:0;border-radius:3px;color:#45434a;background:#fff;box-shadow:0 5px 14px #28232a16;text-align:left;cursor:zoom-in;transform:rotate(-2deg);transition:transform .2s,box-shadow .2s}.text-image-card:hover{transform:rotate(0) translateY(-2px);box-shadow:0 9px 20px #28232a1c}.polaroid-photo{min-height:174px;flex:1;display:flex;flex-direction:column;overflow:hidden;padding:12px 11px;border-radius:1px;background:linear-gradient(145deg,#f7f3ed,#eee9e1)}.message-row.me .polaroid-photo{background:linear-gradient(145deg,#f6f0fa,#eee5f4)}.polaroid-character .polaroid-photo{background:linear-gradient(145deg,#f6f3ee,#eee9df)}.special-card-label{display:block;margin-bottom:10px;color:#a49a8e;font-size:8px;letter-spacing:.14em}.polaroid-copy{display:-webkit-box;overflow:hidden;color:#514d49;font-family:Georgia,"Noto Serif SC",serif;font-size:12px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:6}.polaroid-caption{height:25px;display:flex;align-items:flex-end;justify-content:center;color:#a19a91;font-family:Georgia,serif;font-size:10px;font-style:italic;letter-spacing:.04em}.polaroid-overlay{position:fixed;inset:0;z-index:105;display:flex;align-items:center;justify-content:center;padding:24px;background:#24232955;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.polaroid-close{position:absolute;top:calc(env(safe-area-inset-top) + 18px);right:18px;width:38px;height:38px;border:0;border-radius:50%;color:#4d4a4e;background:#ffffffdf;font-size:26px;line-height:1;cursor:pointer}.polaroid-expanded{width:min(82vw,340px);min-height:min(112vw,440px);box-sizing:border-box;display:flex;flex-direction:column;padding:15px 15px 20px;border-radius:4px;color:#45434a;background:#fff;box-shadow:0 26px 70px #12111645;transform:rotate(-2deg)}.polaroid-expanded-photo{min-height:0;flex:1;display:flex;flex-direction:column;overflow:auto;padding:clamp(18px,7vw,30px);background:linear-gradient(145deg,#f7f3ed,#eee9e1)}.polaroid-expanded-photo p{margin:0;color:#514d49;font-family:Georgia,"Noto Serif SC",serif;font-size:clamp(16px,4.5vw,21px);line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere}.polaroid-expanded-caption{height:62px;display:flex;align-items:flex-end;justify-content:center;color:#9b9389;font-family:Georgia,serif;font-size:15px;font-style:italic;letter-spacing:.06em}.polaroid-lift-enter-active .polaroid-expanded{animation:polaroid-lift-in .48s cubic-bezier(.2,1.25,.4,1) both}.polaroid-lift-leave-active{transition:opacity .22s}.polaroid-lift-leave-to{opacity:0}@keyframes polaroid-lift-in{from{opacity:.35;transform:translateY(70px) scale(.35) rotate(-12deg)}to{opacity:1;transform:translateY(0) scale(1) rotate(-2deg)}}@media(prefers-reduced-motion:reduce){.polaroid-lift-enter-active .polaroid-expanded{animation:none}.text-image-card{transition:none}}.transfer-card{width:210px;min-height:82px;display:flex;align-items:center;gap:12px;padding:13px;border:0;border-radius:15px;color:#fff;background:#62b982;text-align:left;cursor:pointer}.message-row.me .transfer-card{background:#49aa70}.transfer-icon{width:35px;height:35px;display:grid;place-items:center;border:1px solid #ffffff75;border-radius:50%;font-size:20px}.transfer-copy{display:flex;flex:1;flex-direction:column;gap:4px}.transfer-copy strong{font-size:12px;font-weight:500}.transfer-copy b{font-size:20px;font-weight:650}.transfer-copy small{font-size:10px;opacity:.85}.transfer-action-note{color:#777;font-size:13px}.composer{height:auto;min-height:66px;flex:none;display:flex;align-items:center;gap:9px;padding:8px 11px;border:0;border-radius:0;background:#fff;box-shadow:none}
.composer-input-row{width:100%;min-height:46px;display:flex;align-items:center;gap:9px;border:0;background:transparent}
.composer-tool{width:38px;height:38px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#161719;background:transparent;cursor:pointer}
.composer-tool svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.composer-add svg{width:29px;height:29px;stroke-width:1.8}
.composer-field{min-width:0;min-height:42px;flex:1;display:flex;align-items:center;gap:5px;padding:3px 5px 3px 15px;border:1px solid #dedfe2;border-radius:24px;background:#f7f7f8}
.composer textarea{width:0;min-width:0;min-height:28px;max-height:110px;flex:1;resize:none;overflow-y:auto;margin:0;padding:6px 0;border:0;outline:0;color:#171819;background:transparent;text-align:left;font-size:15px;line-height:1.35;user-select:text}
.composer textarea::placeholder{color:#8e8e93;opacity:1}
.composer-camera{width:32px;height:32px;color:#62646a}
.composer-camera svg{width:21px;height:21px;stroke-width:1.8}
.composer-mic{width:38px;height:38px}
.send-button{width:40px;height:40px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#fff;background:#3797f0;cursor:pointer}
.send-button svg{width:21px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.send-button:disabled{opacity:.45;cursor:not-allowed}
.receive-button{width:33px;height:36px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#777;background:transparent;cursor:pointer}
.receive-button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.receive-button:disabled{opacity:.35;cursor:not-allowed}
.composer-with-quote{height:auto;min-height:68px;flex-direction:column;align-items:stretch;gap:3px;padding:7px 9px}
.composer-with-quote .composer-input-row{min-height:46px}
@media(max-width:600px){.composer{min-height:60px;padding:5px 9px}.composer-input-row{gap:6px}.composer-tool{width:34px;height:36px}.composer-add svg{width:27px;height:27px}.composer-field{min-height:40px;padding-left:12px}.composer textarea{font-size:14px}.send-button{width:36px;height:36px}.receive-button{width:29px}}
.conversation-fade-enter-active,.conversation-fade-leave-active{transition:opacity .18s ease}.conversation-fade-enter-from,.conversation-fade-leave-to{opacity:0}@media(max-width:420px){.conversation-page{padding-right:18px;padding-left:18px}.message-bubble{max-width:90%;font-size:16px}.composer{gap:2px;padding-right:7px;padding-left:7px}.composer-tool{width:34px}.composer input{margin-left:4px;padding:0 8px;font-size:14px}}
/* Compact proportions tuned to the reference phone UI. */
@media(max-width:600px){.conversation-page{padding-right:18px;padding-left:18px}.conversation-header{height:78px}.conversation-header .back-button,.dialog-more{width:44px;height:44px}.conversation-header .back-button svg{width:25px}.dialog-more svg{width:26px}.conversation-identity{top:7px}.dialog-avatar{width:70px;height:70px}.conversation-identity.couple-mode{top:4px;grid-template-columns:58px 90px 58px;grid-template-rows:58px auto;column-gap:4px}.couple-mode .dialog-avatar{width:58px;height:58px}.heartbeat-wave{width:90px;height:54px;gap:2px}.heartbeat-wave i{width:2.5px}.identity-name{margin-top:-7px;padding:5px 11px 6px 14px;font-size:15px}.couple-mode .identity-name{margin-top:0}.identity-name i{font-size:20px}.message-list{padding-top:82px;padding-bottom:12px}.message-list .message-row{margin-bottom:2px}.message-list .message-row.has-tail{margin-bottom:8px}.message-bubble{max-width:86%;padding:9px 13px;border-radius:21px;font-size:15px;line-height:1.4}.message-row.me .message-bubble{border-radius:21px}.message-row.them .message-bubble:after,.message-row.me .message-bubble:after{bottom:-5px;width:13px;height:14px}.message-row.me time{padding-top:3px;font-size:11px}.composer{height:54px;gap:1px;padding:4px 6px}.send-button{width:34px;height:36px}.send-button svg{width:24px}.composer-tool{width:31px;height:36px}.composer-tool svg{width:21px;height:21px}.composer input{height:42px;margin-left:3px;padding:0 8px;font-size:14px}.message-list{scroll-padding-top:80px}}
.typing-row{display:flex;align-items:flex-end;justify-content:flex-start;gap:8px;margin:4px 0 16px}.typing-row.me{justify-content:flex-end}.typing-row.me .tiny-avatar{order:1}.typing-row.me .typing-bubble{order:0;border-radius:10px;color:#fff;background:linear-gradient(135deg,#833ab4,#c13584)}.typing-row.them .typing-bubble{border-radius:10px;color:#777;background:#efefef;box-shadow:0 2px 8px rgba(38,30,45,.06)}.typing-bubble{height:42px;min-width:58px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 15px;border-radius:10px}.typing-bubble i{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.65;animation:typing-bounce .9s ease-in-out infinite}.typing-row.me .typing-bubble i{opacity:.9}.typing-bubble i:nth-child(2){animation-delay:.14s}.typing-bubble i:nth-child(3){animation-delay:.28s}@keyframes typing-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}@media(prefers-reduced-motion:reduce){.typing-bubble i{animation:none;opacity:.8}}
.reply-status{margin:0 20px 8px;color:#99918a;font-size:12px}.receive-button{width:34px;height:36px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#303134;background:transparent;cursor:pointer}.receive-button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}.receive-button:disabled{opacity:.35;cursor:not-allowed}.reply-error{color:#b46f66}
.acrylic-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:#24242438;backdrop-filter:blur(10px) saturate(1.15);-webkit-backdrop-filter:blur(10px) saturate(1.15)}
.message-menu-backdrop{position:fixed;inset:0;z-index:100;background:#00000008}.message-menu-group{position:fixed;z-index:1;width:min(280px,calc(100vw - 24px));max-height:min(82dvh,480px);display:flex;flex-direction:column;gap:8px;transform-origin:var(--menu-origin-x) var(--menu-origin-y);animation:message-pop-in .48s cubic-bezier(.16,1.35,.35,1) both;filter:drop-shadow(0 18px 32px #1113)}.reaction-picker{height:52px;flex:none;display:flex;align-items:center;justify-content:space-around;padding:0 8px;border:1px solid #ffffffb8;border-radius:28px;background:#ffffffa8;box-shadow:inset 0 1px #ffffffb0;backdrop-filter:blur(26px) saturate(1.55);-webkit-backdrop-filter:blur(26px) saturate(1.55)}.reaction-picker button{width:38px;height:40px;padding:0;border:0;border-radius:50%;background:transparent;font-size:25px;cursor:pointer;transition:transform .15s}.reaction-picker button:active{transform:scale(1.22)}.message-action-sheet{overflow:auto;padding:6px 16px;border:1px solid #ffffffb8;border-radius:18px;background:linear-gradient(145deg,#ffffffc9,#f7f7f7a8);box-shadow:inset 0 1px #ffffffc9;backdrop-filter:blur(30px) saturate(1.55);-webkit-backdrop-filter:blur(30px) saturate(1.55);color:#262626;scrollbar-width:thin}.message-action-title{margin:4px 0 8px;color:#8e8e93;text-align:left;font-size:13px}.message-action-sheet>button{width:100%;height:48px;display:flex;align-items:center;justify-content:space-between;padding:0;border:0;border-bottom:1px solid #ffffff70;background:transparent;color:#262626;text-align:left;font-size:16px;font-weight:400;cursor:pointer}.message-action-sheet>button:last-child{border:0}.message-action-sheet>button:active{color:#8e8e93}.message-action-sheet>button>span:last-child{color:#262626;font-size:18px}.message-action-sheet>button.message-delete-action,.message-action-sheet>button.message-delete-action>span:last-child{color:#ed4956}.message-action-sheet>button:disabled{opacity:.45}.message-action-sheet>button.message-cancel-action{height:46px;justify-content:center;margin-top:7px;border:0;border-radius:13px;font-weight:600}.message-edit-dialog{width:min(100%,440px);padding:18px;border:1px solid #ffffffc9;border-radius:28px;background:linear-gradient(145deg,#ffffffed,#f4f3f0e8);box-shadow:0 22px 70px #17171730;backdrop-filter:blur(28px) saturate(1.35);-webkit-backdrop-filter:blur(28px) saturate(1.35);color:#484744;animation:message-sheet-in .22s ease-out}.message-reaction{position:absolute;right:2px;bottom:-12px;z-index:1;min-width:27px;height:24px;display:grid;place-items:center;padding:0 5px;border:2px solid #fff;border-radius:14px;background:#fff;box-shadow:0 2px 8px #00000018;font-size:15px;line-height:1}.message-row.me .message-reaction{right:auto;left:2px}.message-reaction.character-reaction{animation:character-reaction-pop .42s cubic-bezier(.18,.89,.32,1.35) both;transform-origin:center}.message-edit-dialog{align-self:center}
.message-edit-dialog{align-self:center}.message-edit-dialog h3{margin:0 0 14px;font-size:16px;font-weight:600}.message-edit-dialog textarea{width:100%;resize:vertical;padding:12px;border:1px solid #e8e5df;border-radius:16px;outline:none;color:#4b4945;background:#ffffffc9;font:inherit;font-size:14px;line-height:1.5}.message-edit-dialog footer{display:flex;justify-content:flex-end;gap:9px;margin-top:14px}.message-edit-dialog footer button,.multi-delete-bar button{padding:9px 15px;border:0;border-radius:18px;color:#625f59;background:#eeece8;font-size:12px;cursor:pointer}.message-edit-dialog footer button:last-child{color:white;background:#8d9589}
.multi-delete-bar{position:fixed;inset:auto 16px calc(env(safe-area-inset-bottom) + 18px);z-index:90;display:flex;align-items:center;gap:10px;padding:11px 14px;border:1px solid #fff;border-radius:15px;background:#fff;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none;color:#67645f;font-size:12px}.multi-delete-bar span{flex:1}.multi-delete-bar button{padding:8px 15px;border:0;border-radius:8px;box-shadow:none;font-size:13px;cursor:pointer}.multi-delete-bar button:disabled{opacity:.45}.multi-delete-button{color:#fff !important;background:#ed4956 !important}.multi-cancel-button{color:#777 !important;background:#e9e9e9 !important}
.message-selection-check{position:absolute;z-index:3;top:50%;left:-30px;width:22px;height:22px;display:grid;place-items:center;transform:translateY(-50%);border:1px solid #aaa;border-radius:50%;background:#fff;color:transparent;font-size:14px;font-weight:700;line-height:1;transition:background .16s,border-color .16s,color .16s;pointer-events:none}.message-selection-check.checked{border-color:#3988f7;background:#3988f7;color:#fff}.message-row.me .message-selection-check{left:auto;right:-30px}.message-bubble-wrap{position:relative;width:100%;max-width:100%;align-self:inherit;display:flex}.message-row.me .message-bubble-wrap{align-self:stretch;margin-left:auto;justify-content:flex-end}.message-row.them .message-bubble-wrap{align-self:stretch;margin-right:auto;justify-content:flex-start}.quoted-message{width:fit-content;max-width:min(100%,300px);box-sizing:border-box;display:flex;flex-direction:column;gap:3px;margin:0 0 5px;padding:0 3px;color:#8a8a8d;font-size:11px;line-height:1.35}.quoted-message strong{font-size:10px;font-weight:650;opacity:.85}.quoted-message>span{overflow:hidden;display:-webkit-box;opacity:.9;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}.message-row.me .quoted-message{align-self:flex-end;color:#888;text-align:right}.composer-with-quote{height:auto;min-height:68px;flex-direction:column;align-items:stretch;gap:3px;padding:7px 9px}.quote-compose-preview{display:flex;align-items:center;gap:8px;padding:4px 8px 5px;border-radius:13px;background:#f3f3f2}.quote-compose-preview>span{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}.quote-compose-preview strong{color:#787873;font-size:10px;font-weight:600}.quote-compose-preview>span>span{overflow:hidden;color:#999994;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.quote-compose-preview button{width:23px;height:23px;border:0;border-radius:50%;color:#888;background:#e7e7e5;font-size:17px;line-height:1;cursor:pointer}.composer-input-row{width:100%;min-height:48px;display:flex;align-items:center;gap:4px;border:0;background:transparent}.composer-input-row textarea{margin-left:8px}.message-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);z-index:110;transform:translateX(-50%);padding:11px 18px;border:1px solid #ffffffc9;border-radius:22px;background:#ffffffed;box-shadow:0 8px 28px #2222;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#514f4a;font-size:12px;white-space:nowrap}
:deep(.conversation-page){padding:calc(env(safe-area-inset-top)) 0 calc(env(safe-area-inset-bottom) + 12px)}
:deep(.conversation-header){height:72px!important;box-sizing:border-box;display:flex!important;flex-direction:row!important;align-items:center;gap:6px;padding:0 15px;border-bottom:1px solid #e8e8e8a8;background:#ffffffc9;backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5)}
:deep(.conversation-back),:deep(.conversation-settings){width:38px;height:38px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#28292b;background:transparent;box-shadow:none;cursor:pointer;transition:background .18s,transform .18s}
:deep(.conversation-back:active),:deep(.conversation-settings:active){background:#00000009;transform:scale(.94)}
:deep(.conversation-back svg){width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
:deep(.conversation-settings svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
:deep(.conversation-identity){position:static!important;top:auto!important;left:auto!important;z-index:auto!important;min-width:0;flex:1;display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px;transform:none!important}
:deep(.conversation-back){flex:none}
:deep(.conversation-settings){flex:none;margin-left:auto}
:deep(.conversation-avatar){width:42px;height:42px;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:var(--avatar-color,#e7e5df)}
:deep(.conversation-avatar img){width:100%;height:100%;object-fit:cover}
:deep(.conversation-identity-copy){min-width:0;display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:3px}
:deep(.conversation-title){display:block!important;overflow:hidden;margin:0;color:#202124;text-align:left!important;text-overflow:ellipsis;white-space:nowrap;font-size:16px;font-weight:600}
:deep(.conversation-online){color:#929292;font-size:12px;line-height:1}
:deep(.message-list){padding:18px 12px 18px}
@media(max-width:600px){:deep(.conversation-header){height:68px!important;gap:4px;padding:0 12px}:deep(.conversation-back){width:34px;height:38px}:deep(.message-list){padding:14px 12px 16px}}

:deep(.message-row){align-items:flex-end;gap:8px;margin-bottom:16px}
:deep(.message-row:not(.has-tail)){margin-bottom:16px}
:deep(.message-row.has-tail){margin-bottom:22px}
:deep(.message-row + .message-row){margin-top:0}
:deep(.message-content-stack){gap:10px}
:deep(.message-row.me){flex-wrap:nowrap}
:deep(.message-row.them .tiny-avatar){order:0}
:deep(.message-row.them .message-content-stack){order:1;align-items:flex-start}
:deep(.message-row.me .message-content-stack){order:0;align-items:flex-end;margin-left:auto}
:deep(.message-row.me .tiny-avatar){order:1}
:deep(.message-content-stack){width:100%;max-width:calc(100% - 52px);min-width:0;flex:1 1 auto}
:deep(.message-row.them .message-content-stack),:deep(.message-row.me .message-content-stack){flex:1 1 0}
:deep(.message-row.them .message-bubble),:deep(.message-row.me .message-bubble){display:table;width:auto;max-width:min(100%, 300px);flex:none;min-width:0}
:deep(.tiny-avatar){width:40px;height:40px;flex:none;display:grid;place-items:center;align-self:flex-end;overflow:hidden;border-radius:50%;color:#555;font-size:13px;background:linear-gradient(145deg,#f1f1f1,var(--avatar-color,#dedede))}
:deep(.tiny-avatar img){width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
:deep(.user-tiny-avatar){position:relative;background-color:#e8e5e0;background-position:center;background-size:cover}
:deep(.user-tiny-avatar>span){color:#777;font-size:13px}
:deep(.message-bubble){max-width:100%;padding:13px 13px;border-radius:10px;color:#262626;background:#efefef;font-size:15px;font-weight:400;line-height:1.4}
:deep(.message-row.them .message-bubble){box-shadow:0 2px 8px rgba(38, 30, 45, .06)}
:deep(.message-row.me .message-bubble){border-radius:10px;color:#fff;background:linear-gradient(135deg,#833ab4,#c13584);font-weight:400}
:deep(.message-row.them .message-bubble:after),:deep(.message-row.me .message-bubble:after){display:none;content:none}
:deep(.chat-time-divider){width:100%;margin:13px 0 15px;color:#8e8e93;text-align:center;font-size:11px;font-weight:400;line-height:1.4}
:deep(.message-row.me time){display:none}
:deep(.message-list .message-row:not(.has-tail)){margin-bottom:16px}
:deep(.message-list .message-row.has-tail){margin-bottom:22px}
@media(max-width:600px){:deep(.message-row){gap:7px;margin-bottom:14px}:deep(.message-row:not(.has-tail)){margin-bottom:14px}:deep(.message-list .message-row.has-tail){margin-bottom:18px}:deep(.message-content-stack){gap:9px;max-width:calc(100% - 48px)}:deep(.tiny-avatar){width:40px;height:40px}:deep(.message-row.them .message-bubble),:deep(.message-row.me .message-bubble){max-width:min(78%, 300px);padding:12px 12px;font-size:14px}:deep(.message-row.me time){font-size:10px}}

@keyframes message-pop-in{0%{opacity:0;transform:scale(.48)}55%{opacity:1;transform:scale(1.075)}76%{transform:scale(.97)}100%{opacity:1;transform:scale(1)}}
@keyframes message-sheet-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.message-menu-group,.message-action-sheet{animation:none}}
@media(min-width:700px){.acrylic-overlay{align-items:center}}
.chat-app{background:#fff}
.chat-content{position:relative}
.topbar .back-button,.topbar .round-action{width:45px;height:45px;padding:0;border:0;border-radius:0;color:#44464a;background:transparent;box-shadow:none;filter:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.topbar .back-button:active,.topbar .round-action:active{background:transparent;box-shadow:none;transform:none}
.bottom-area{width:100%;margin:0;padding:0;background:transparent}
.bottom-nav{height:68px;overflow:visible;grid-template-columns:repeat(3,1fr);border:0;border-top:1px solid #ededed;border-radius:0;background:#ffffffed;box-shadow:none;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.bottom-nav button{height:100%;flex-direction:column;justify-content:center;gap:2px;padding:5px 0;color:#9a9fa8;font-size:10px;line-height:1.2;transition:color .2s}
.bottom-nav button svg{width:27px;height:27px;flex:none;fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}
.bottom-nav button svg.moments-icon{fill:none;stroke:currentColor;stroke-width:1.45}
.bottom-nav button.selected{color:#4d4e51;background:transparent;box-shadow:none}

.preference-card .preference-row:nth-of-type(1) .preference-icon{color:#6b8fd6;background:#edf2ff}
.preference-card .preference-row:nth-of-type(2) .preference-icon{color:#e58b70;background:#fff0e9}
.preference-card .preference-row:nth-of-type(3) .preference-icon{color:#d29a45;background:#fff5df}
.preference-card .preference-row:nth-of-type(4) .preference-icon{color:#7c9bcf;background:#edf4ff}
.config-page-overlay{position:fixed;inset:0;z-index:40;background:#fff}
.config-page{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 12px);color:#45464a;background:#fff}
.config-page-header{width:min(100%,620px);height:52px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;margin:0 auto 14px}
.config-page-header button{width:40px;height:40px;border:0;color:#555;background:transparent;font-size:30px;cursor:pointer}
.config-page-header h2{margin:0;text-align:center;font-size:16px;font-weight:500;letter-spacing:.08em}
.config-page-header>span{width:40px}
.config-page-scroll{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto;padding:4px 2px 24px}
.config-group{margin:0 0 18px;padding:17px 16px 16px;border:1px solid #ffffffd9;border-radius:25px;background:linear-gradient(145deg,#ffffffd9,#f5f9ffd1);box-shadow:0 10px 28px #758ca314,inset 0 1px 0 #fff;backdrop-filter:blur(20px) saturate(1.2);-webkit-backdrop-filter:blur(20px) saturate(1.2)}
.config-group-heading{display:flex;align-items:center;gap:12px;margin:0 0 18px}
.config-group-heading>span:last-child{display:flex;flex-direction:column;gap:5px}
.config-group-heading strong{color:#4d5054;font-size:14px;font-weight:600}
.config-group-heading small{color:#9a9da1;font-size:10px;line-height:1.5}
.config-3d-icon{width:auto;height:auto;position:relative;display:grid;place-items:center;flex:none;border:0;border-radius:0;background:transparent;box-shadow:none;text-shadow:none;filter:drop-shadow(0 8px 10px #6b7e9830) drop-shadow(0 2px 2px #ffffffd9)}
.config-3d-icon svg{width:43px;height:43px;overflow:visible;fill:url(#persona-glass);stroke:#ffffffed;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;paint-order:stroke;shape-rendering:geometricPrecision;filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 7px 9px #829cc42b)}
.preset-3d-icon svg{fill:url(#preset-glass);filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 7px 9px #a89bcf30)}

.config-group .config-select-label{display:block;margin:12px 2px 7px;color:#74777c;font-size:11px;font-weight:500}
.config-group .config-select{width:100%;height:46px;padding:0 13px;border:1px solid #e7edf1;border-radius:14px;outline:0;color:#4c5054;background:#ffffffd9;box-shadow:inset 0 1px 3px #71849a0b;font:inherit;font-size:12px}
.config-group .config-select:focus{border-color:#a9cfb4;box-shadow:0 0 0 3px #45b96d1c}
.config-group .config-select:disabled{color:#aaa;background:#f6f7f7}
.config-group .config-hint,.config-group .preset-footnote{margin:13px 2px 0;color:#999da1;font-size:10px;line-height:1.6}
.config-preset-row{display:flex;align-items:center;gap:12px;padding:13px 12px;border:1px solid #e8eff2;border-radius:16px;background:#ffffffbd}
.config-preset-row .preference-copy{gap:5px}
.config-preset-row .preference-copy strong{color:#55595c;font-size:12px}
.config-preset-row .preference-copy small{color:#9da1a3;font-size:10px}
.config-page .preset-edit-button{flex:none;padding:8px 13px;border:0;border-radius:14px;color:#fff;background:linear-gradient(145deg,#62c77e,#35ae61);box-shadow:0 4px 10px #46b66b33;font-size:10px;cursor:pointer}
.config-page .preset-edit-button:active{transform:scale(.97)}
.config-page .persona-preview{margin-top:12px}
.config-tile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.config-tile-grid .config-group{min-height:145px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;margin:0;padding:18px 10px;border:0;border-radius:24px;color:#4d5054;background:linear-gradient(145deg,#ffffffd9,#ffffffa8);box-shadow:0 5px 16px #34465a08,0 1px 4px #34465a05;backdrop-filter:blur(20px) saturate(1.15);-webkit-backdrop-filter:blur(20px) saturate(1.15);text-align:center;cursor:pointer;transition:transform .18s,box-shadow .18s}
.config-tile-grid .config-group:active{transform:scale(.97);box-shadow:0 3px 9px #34465a08}
.config-tile-grid .config-group>strong{font-size:14px;font-weight:550}
.config-tile-grid .config-3d-icon svg{width:58px;height:58px}.config-tile-grid .config-3d-icon{filter:drop-shadow(0 10px 13px #62789529) drop-shadow(0 2px 2px #ffffffeb)}.config-tile-grid .persona-3d-icon svg{filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 8px 11px #74bce12c)}.config-tile-grid .preset-3d-icon svg{filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 8px 11px #a497cf2c)}
.config-tile-grid .config-group:focus-visible{outline:2px solid #91c5a0;outline-offset:3px}
.preset-config-page{position:fixed;inset:0;z-index:42;background:#fff}
.preset-config-content{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 18px) 20px calc(env(safe-area-inset-bottom) + 14px);color:#424348;background:#fff}
.preset-config-header{width:min(100%,620px);display:grid;grid-template-columns:42px 1fr 54px;align-items:center;flex:none;margin:0 auto 20px}.preset-config-header>button:first-child{width:38px;height:38px;border:0;color:#5d5e60;background:transparent;font-size:27px;line-height:1;cursor:pointer}.preset-config-header>div{text-align:center}.preset-config-header h2{margin:0;color:#55565a;font-size:17px;font-weight:550;letter-spacing:.04em}.preset-config-header small{display:block;margin-top:4px;color:#aaa9a5;font-size:9px}.preset-config-save-top{height:32px;border:0;border-radius:16px;color:#54ad6c;background:#f0f8f1;font-size:10px}
.preset-config-scroll{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto;padding:0 2px 18px;scrollbar-width:thin;scrollbar-color:#e2e1de transparent}
.preset-config-section-title{display:flex;align-items:center;justify-content:space-between;margin:17px 5px 11px;color:#8f8d8a;font-size:11px}.preset-config-section-title button{padding:7px 12px;border:0;border-radius:15px;color:#58ad6d;background:#f0f8f1;font-size:10px}
.preset-name-card,.preset-setting-card{display:flex;align-items:center;gap:13px;margin-bottom:10px;padding:13px 15px;border:0;border-radius:24px;background:linear-gradient(135deg,#ffffffed,#f8f8f6d9);box-shadow:0 7px 22px #5e5a4d0b;backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}
.preset-config-icon{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:15px;color:#8c7be0;background:#efebff;font-size:19px}.preset-name-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.preset-name-copy strong{color:#55565a;font-size:12px;font-weight:650}.preset-name-copy small{color:#9b9b9c;font-size:10px}.preset-name-card>input{width:120px;min-width:0;padding:8px;border:0;border-radius:12px;outline:0;color:#595a5d;background:#f5f5f3;text-align:right;font:inherit;font-size:11px}
.preset-setting-card{position:relative;display:flex;align-items:center;gap:9px;padding:10px 12px;touch-action:pan-y;transition:transform .16s,box-shadow .16s}.preset-setting-card.dragging{transform:scale(1.02);box-shadow:0 12px 28px #5e5a4d18;z-index:1}.preset-entry-summary{min-width:0;flex:1;display:flex;align-items:center;gap:10px;padding:0;border:0;background:transparent;text-align:left;cursor:pointer}.preset-entry-summary .preset-config-icon{width:36px;height:36px;color:#6999d0;background:#edf5ff}.preset-entry-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.preset-entry-copy strong{overflow:hidden;color:#55565a;font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.preset-entry-copy small{overflow:hidden;color:#9b9b9c;font-size:10px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.preset-entry-chevron{color:#b8b8b5;font-size:24px;line-height:1}.preset-entry-handle{width:29px;height:34px;flex:none;display:grid;place-items:center;padding:0;border:0;background:transparent;color:#c4c5c2;touch-action:none;cursor:grab}.preset-entry-handle:active{color:#999b97;cursor:grabbing}.preset-entry-handle svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}.preset-setting-toggle{width:39px;height:23px;position:relative;flex:none;padding:0;border:0;border-radius:16px;background:#e7e7e5;cursor:pointer;transition:background .2s}.preset-setting-toggle i{width:17px;height:17px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.preset-setting-toggle.on{background:#34c759}.preset-setting-toggle.on i{transform:translateX(16px)}.friend-search-overlay{position:fixed;inset:0;z-index:45;background:#fff}.friend-search-page,.friend-profile-page{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 12px);color:#45464a;background:#fff}.friend-search-header{width:min(100%,620px);height:48px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;margin:0 auto 18px}.friend-search-header button{width:40px;height:40px;border:0;color:#555;background:transparent;font-size:30px;cursor:pointer}.friend-search-header h2{margin:0;text-align:center;color:#55565a;font-size:17px;font-weight:550}.friend-search-header i{width:40px}.friend-search-input{width:min(100%,620px);height:46px;display:flex;align-items:center;gap:10px;flex:none;margin:0 auto;padding:0 14px;border-radius:24px;background:#f5f5f3}.friend-search-input svg{width:17px;flex:none;fill:none;stroke:#929397;stroke-width:1.7}.friend-search-input input{min-width:0;flex:1;border:0;outline:0;color:#555;background:transparent;font:inherit;font-size:12px}.friend-search-input button{border:0;color:#999;background:transparent;font-size:20px}.friend-search-hint{width:min(100%,620px);margin:14px auto 8px;color:#aaa9a5;font-size:10px}.friend-search-results{width:min(100%,620px);flex:1;overflow:auto;margin:0 auto}.friend-search-row{width:100%;min-height:70px;display:flex;align-items:center;gap:12px;padding:9px 4px;border:0;background:transparent;text-align:left;cursor:pointer}.friend-search-avatar{width:48px;height:48px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#777;background-color:#e9e7e2;background-position:center;background-size:cover;font-size:17px}.friend-search-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.friend-search-copy strong{color:#55565a;font-size:13px;font-weight:550}.friend-search-copy small{color:#aaa9a5;font-size:10px}.friend-search-arrow{color:#b8b8b5;font-size:24px}.friend-search-empty{padding:36px 8px;color:#aaa9a5;text-align:center;font-size:11px}.friend-profile-content{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:50px}.friend-profile-avatar{width:106px;height:106px;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#777;background-color:#e9e7e2;background-position:center;background-size:cover;font-size:34px}.friend-profile-content h3{margin:17px 0 5px;color:#4f5053;font-size:19px;font-weight:600}.friend-profile-content p{margin:0;color:#a4a4a4;font-size:11px}.friend-add-button{width:min(100%,300px);height:45px;margin-top:30px;border:0;border-radius:23px;color:#fff;background:#66c77f;font-size:13px;cursor:pointer}.friend-add-button:disabled{color:#92958f;background:#edeeeb}
.preset-detail-overlay{position:fixed;inset:0;z-index:55;display:flex;align-items:center;justify-content:center;padding:18px;background:#29292730;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.preset-detail-dialog{width:min(100%,460px);max-height:min(82dvh,680px);display:flex;flex-direction:column;gap:15px;padding:20px;border-radius:26px;background:#fff;box-shadow:0 16px 48px #33333318}.preset-detail-dialog header{display:flex;align-items:center;justify-content:space-between}.preset-detail-dialog h3{margin:0;color:#55565a;font-size:16px;font-weight:550}.preset-detail-dialog header button{width:30px;height:30px;border:0;border-radius:50%;color:#888;background:#f4f4f2;font-size:21px}.preset-detail-dialog label{display:flex;flex-direction:column;gap:7px;color:#8f8d8a;font-size:10px}.preset-detail-dialog input,.preset-detail-dialog textarea{width:100%;padding:11px 12px;border:0;border-radius:14px;outline:0;color:#5c5d60;background:#f7f7f5;font:inherit;font-size:12px}.preset-detail-dialog textarea{min-height:130px;resize:vertical;line-height:1.65}.preset-detail-dialog footer{display:flex;align-items:center;gap:7px}.preset-detail-dialog footer button{padding:8px 10px;border:0;border-radius:14px;color:#999a96;background:#f5f5f2;font-size:10px}.preset-detail-dialog footer .preset-remove-button{color:#c58279;background:#fff5f3}.preset-detail-dialog footer .preset-detail-done{margin-left:auto;color:#fff;background:#8bd9a0}
.preset-config-footer{width:min(100%,620px);display:flex;gap:10px;flex:none;margin:10px auto 0;padding:8px 2px}.preset-config-footer button{height:42px;flex:1;border:0;border-radius:18px;color:#77787a;background:#f3f3f1;font-size:11px}.preset-config-footer button:last-child{color:#fff;background:#8bd9a0}
@media(max-width:600px){.preset-config-content{padding-right:17px;padding-left:17px}}
@media(prefers-reduced-motion:reduce){.preset-setting-toggle,.preset-setting-toggle i{transition:none}}
.persona-binding-overlay{position:fixed;inset:0;z-index:42;background:#fff}
.persona-binding-page{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 12px);color:#45464a;background:#fff}
.persona-binding-header{width:min(100%,620px);height:52px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;margin:0 auto 14px}
.persona-binding-header>button{width:40px;height:40px;border:0;color:#555;background:transparent;font-size:30px;cursor:pointer}
.persona-binding-header>div{text-align:center}.persona-binding-header h2{margin:0;color:#55565a;font-size:15px;font-weight:550;letter-spacing:.06em}
.persona-binding-content{width:min(100%,520px);flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;padding-bottom:20px}
.persona-binding-intro{margin:0 0 27px;color:#a3a2a0;font-size:12px;letter-spacing:.04em}
.polaroid-stage{width:min(100%,390px);height:310px;position:relative;display:flex;align-items:center;justify-content:center;perspective:1100px;transform-style:preserve-3d;transition:transform .42s cubic-bezier(.2,.75,.25,1),opacity .2s}
.polaroid-stage.flipping{opacity:.2;transform:rotateY(82deg) scale(.92)}
.polaroid-card{width:194px;height:246px;position:absolute;display:flex;flex-direction:column;align-items:center;padding:11px 11px 13px;border:0;border-radius:3px;background:linear-gradient(145deg,#fff,#fbfaf8);box-shadow:0 10px 26px #4c443b12,0 2px 6px #4c443b08;backface-visibility:hidden;transition:transform .4s cubic-bezier(.2,.75,.25,1)}
.character-polaroid{z-index:1;transform:translate(-44px,5px) rotate(-9deg)}.user-polaroid{z-index:2;transform:translate(48px,-3px) rotate(8deg)}
.polaroid-photo{width:100%;height:177px;display:grid;place-items:center;overflow:hidden;color:#97938c;background-color:#f0efed;background-image:linear-gradient(145deg,#f5f3ef,#e8e6e1);background-position:center;background-size:cover;font-family:Georgia,serif;font-size:43px}
.polaroid-card strong{max-width:100%;overflow:hidden;margin-top:10px;color:#565552;font-family:Georgia,"PingFang SC",serif;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.polaroid-card small{margin-top:4px;color:#aaa7a1;font-size:9px;letter-spacing:.1em}
.binding-link{position:absolute;z-index:3;left:50%;top:50%;color:#fff;font-size:27px;text-shadow:0 1px 7px #615b5355;transform:translate(-50%,-50%)}
.binding-select-wrap{width:min(100%,340px);display:flex;flex-direction:column;gap:9px;margin-top:12px}.binding-select-wrap label{color:#92918e;text-align:center;font-size:11px}.binding-select-wrap select{height:45px;padding:0 15px;border:0;border-radius:16px;outline:0;color:#595a5d;background:#f7f7f5;font:inherit;font-size:12px}.binding-select-wrap select:focus-visible{outline:2px solid #d7d7d2;outline-offset:2px}
.binding-navigation{display:flex;align-items:center;justify-content:center;gap:26px;margin-top:21px}.binding-navigation button{width:42px;height:42px;border:0;border-radius:50%;color:#6c6c69;background:#f6f6f4;font-size:28px;line-height:1;cursor:pointer;transition:transform .18s,background .18s}.binding-navigation button:active{transform:scale(.92);background:#ededeb}.binding-navigation button:disabled{opacity:.35;cursor:default}.binding-navigation span{min-width:43px;color:#777773;text-align:center;font-size:11px;font-variant-numeric:tabular-nums}.binding-navigation i{padding:0 4px;color:#c2c0bb;font-style:normal}
.persona-binding-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.persona-binding-empty .polaroid-photo{width:150px;height:165px;margin-bottom:22px;box-shadow:0 8px 25px #4c443b0c;color:#d2cfc9;font-size:34px}.persona-binding-empty strong{color:#66645f;font-size:14px;font-weight:550}.persona-binding-empty p{max-width:250px;margin:8px 0 16px;color:#aaa8a3;font-size:11px;line-height:1.6}.persona-binding-empty>button{padding:9px 18px;border:0;border-radius:18px;color:#6e6b65;background:#f5f4f1;font-size:11px}
@media(max-width:600px){.persona-binding-page{padding-right:17px;padding-left:17px}.polaroid-stage{height:285px}.polaroid-card{width:174px;height:225px;padding:10px 10px 12px}.polaroid-photo{height:160px}.character-polaroid{transform:translate(-39px,4px) rotate(-9deg)}.user-polaroid{transform:translate(42px,-3px) rotate(8deg)}}
@media(prefers-reduced-motion:reduce){.polaroid-stage,.polaroid-card,.binding-navigation button{transition:none}}
@media(max-width:600px){.config-page{padding-right:16px;padding-left:16px}.config-tile-grid{gap:11px}.config-tile-grid .config-group{min-height:132px}}
.voice-message-card{width:min(148px,100%);min-height:44px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid #e5e5e5;border-radius:15px;background:#efefef}.message-row.me .voice-message-card{border-color:transparent;background:linear-gradient(135deg,#833ab4,#c13584);color:#fff}.voice-play-button{width:29px;height:29px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#555;background:#fff9;cursor:pointer}.message-row.me .voice-play-button{color:#a23a9d;background:#ffffffed}.voice-play-button svg{width:15px;height:15px;fill:currentColor}.voice-play-button:disabled{opacity:.45;cursor:default}.voice-wave{height:25px;min-width:0;flex:1;display:flex;align-items:center;justify-content:space-between;gap:2px}.voice-wave i{width:2px;height:var(--bar-height);max-height:20px;border-radius:3px;background:currentColor;opacity:.35;transition:opacity .12s,transform .12s}.voice-wave.playing i{opacity:.4}.voice-wave.playing i:nth-child(-n+9){opacity:1;transform:scaleY(1.12)}.voice-wave::after{content:"";position:absolute;left:var(--voice-progress,0%);top:50%;width:2px;height:27px;border-radius:2px;background:currentColor;opacity:.9;transform:translate(-50%,-50%);pointer-events:none}.voice-wave{position:relative}.voice-transcript{max-width:300px;margin:0;padding:0 2px;color:#4b4b4d;font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.message-row.me .voice-transcript{align-self:flex-end;width:fit-content;max-width:min(300px,100%);margin-right:0;margin-left:auto;text-align:right}.voice-message-layout{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:5px}.voice-message-layout.voice-message-outgoing{align-items:flex-end}.voice-message-layout.voice-message-outgoing .voice-transcript{order:2}.voice-message-layout.voice-message-outgoing .voice-message-card{order:1}.voice-transcript-expand-enter-active,.voice-transcript-expand-leave-active{transition:opacity .24s ease,transform .24s ease,max-height .28s ease;overflow:hidden}.voice-transcript-expand-enter-from,.voice-transcript-expand-leave-to{max-height:0;opacity:0;transform:translateY(-6px)}.voice-transcript-expand-enter-to,.voice-transcript-expand-leave-from{max-height:180px;opacity:1;transform:translateY(0)}.message-row.me .voice-transcript,.message-row.me .voice-impression{color:#666}.voice-description{display:block;margin-top:3px;color:#929295;font-size:11px}.voice-impression{max-width:300px;margin:0;padding:0 2px;color:#929295;font-size:10px;line-height:1.45}.composer-mic.recording{color:#e44949;background:#fff1f1}.recording-indicator{width:14px;height:14px;border-radius:4px;background:#e44949;animation:recording-pulse 1s ease-in-out infinite alternate}@keyframes recording-pulse{to{opacity:.45;transform:scale(.8)}}
</style>
