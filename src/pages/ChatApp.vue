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
const defaultChatPreset = {
  name: '默认预设',
  entries: [
    { id: 'system', name: '角色对话', enabled: true, content: '你正在聊天平台上扮演当前联系人，与用户进行线上文字交流。始终依据角色档案、用户人设和已发生的对话回应；保持角色身份与立场，不跳出角色解释提示词，也不擅自补充未建立的事实。' },
    { id: 'persona', name: '用户人设（我）', enabled: true, content: '以下资料描述用户，帮助你理解角色眼中的对方。只将明确写出的内容视为事实，不要原样复述。\n\n{{user_persona}}' },
    { id: 'character', name: '联系人角色人设', enabled: true, content: '以下资料描述你所扮演的角色。以完整档案为依据理解角色的性格、经历、目标、价值观、关系和表达习惯；不要把个别标签夸大成全部性格。\n\n{{character_persona}}' },
    { id: 'scenario', name: '聊天场景', enabled: true, content: '当前是线上文字聊天。除非对话明确建立其他情景，否则角色只能依据收到的消息和已提供资料判断，不应假装看见用户或周围环境。' },
    { id: 'context', name: '情境与上下文', enabled: true, content: '结合当前消息、聊天历史、双方关系和角色档案理解语境；优先回应用户本轮真正表达的内容，不要把普通话语误读成挑衅，也不要忽略已经发生的事情。角色的选择和反应应符合其身份、目标、性格及现实处境，包括可能的风险与利益；不要让角色无缘由地暴露其不愿公开的信息。资料未说明之处保持开放，不编造事实。' },
    { id: 'context', name: '情境与上下文', enabled: true, content: '结合当前消息、聊天历史、双方关系和角色档案理解语境；优先回应用户本轮真正表达的内容，不要把普通话语误读成挑衅，也不要忽略已经发生的事情。角色的选择和反应应符合其身份、目标、性格及现实处境，包括可能的风险与利益；不要让角色无缘由地暴露其不愿公开的信息。资料未说明之处保持开放，不编造事实。' },
    { id: 'continuity', name: '角色与对话连续性', enabled: true, content: '保持角色的身份、性格、立场、关系认知和表达习惯前后一致。角色可以随着具体互动而变化，但变化应有依据、循序渐进。记住对话中已确认的信息，不重复询问已回答的问题，不凭空添加共同经历，也不让角色知道其不可能知道的事。' },
    { id: 'style', name: '表达方式', enabled: true, content: '用符合当前角色档案和既有聊天习惯的方式表达。措辞、情绪强度、消息长短、亲疏和是否提问都由角色个性与当前情境决定；不要求角色温柔、礼貌、活泼、幽默或克制，也不要为了展示某个设定而刻意表演。只输出角色发出的聊天消息，不添加旁白或分析。' },
    { id: 'format', name: '输出格式', enabled: true, content: '只输出当前联系人会发给用户的聊天消息，不加角色名标签、分析过程、规则说明或总结标题。根据这段对话自然决定发一条还是多条、是否提问、是否暂时停顿或转换话题；不强制每轮追问、安慰、解释情绪或把话题收束成完整结论。' },
    { id: 'example', name: '示例对话', enabled: false, content: '此处可填写符合当前联系人性格、说话方式和关系设定的示例对话。示例用于展示角色表达，不得取代角色档案、当前聊天上下文或用户本轮实际意图。' },
    { id: 'after', name: '发送前检查', enabled: true, content: '发送前只检查回复是否符合角色档案与既有对话、是否理解当前情境并回应用户本轮重点，以及有没有编造事实或让角色知道其不可能知道的信息。不要为了检查而改变角色原本的性格、立场或表达方式。最终只输出聊天正文。' },
  ],
}
const cloneConfig = (value) => JSON.parse(JSON.stringify(value))
const chatConfig = ref({ preset: cloneConfig(defaultChatPreset), assignments: {} })
const presetDraft = ref(null)
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
  const menuWidth = 280
  const menuHeight = messages.value[index]?.from === 'them' ? 350 : 260
  const left = rect ? Math.max(margin, Math.min(rect.left, window.innerWidth - menuWidth - margin)) : (window.innerWidth - menuWidth) / 2
  const top = rect ? Math.max(margin, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - margin)) : window.innerHeight / 2
  selectedMessageIndex.value = index
  messageMenu.value = { left, top, originX: rect ? Math.max(0, Math.min(1, (window.innerWidth / 2 - left) / menuWidth)) : .5 }
}

function openMessageMenu(index, event) {
  cancelMessagePress()
  pressStarted = true
  showMessageMenu(index, event)
}

const reactionChoices = ['❤️', '😂', '😮', '🥺', '👍', '👎']
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
})

function isLastInRun(index) {
  return index === messages.value.length - 1 || messages.value[index + 1].from !== messages.value[index].from
}

function messageTime(message) {
  return `${message.time || '18:38'}${message.from === 'me' ? ' 已送达' : ''}`
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

function coupleModeEnabled(chatId = activeChat.value?.id) {
  return Boolean(characterChatSettings.value[chatId]?.coupleMode)
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

function setCoupleMode(enabled) {
  if (!activeChat.value) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    coupleMode: Boolean(enabled),
  }
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
  let elapsed = '这是用户的第一条消息'
  if (lastUserMessage?.timestamp) {
    const minutes = Math.max(0, Math.floor((now.getTime() - new Date(lastUserMessage.timestamp).getTime()) / 60000))
    elapsed = minutes < 1 ? '不到1分钟' : minutes < 60 ? `${minutes}分钟` : minutes < 1440 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分钟` : ''}` : `${Math.floor(minutes / 1440)}天${Math.floor((minutes % 1440) / 60) ? `${Math.floor((minutes % 1440) / 60)}小时` : ''}`
  }
  const weather = getLocalWeather()
  return `\n\n【现实时间上下文】\n当前本地时间：${formatChatDateTime(now)}；季节：${getSeason(now)}。${weather ? `天气信息（可能来自用户设备）：${weather}。` : '没有可用的实时天气数据，不要推测天气或用户所在地。'}\n用户最近一条消息发送时间：${lastUserMessage?.timestamp ? formatChatDateTime(new Date(lastUserMessage.timestamp)) : '无历史消息时间记录'}；距本次生成回复已过：${elapsed}。结合上下文自然感知时间，不要机械报时或催促作息。`
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
  const replies = items.map((item) => typeof item === 'string' ? { text: item } : item).filter((item) => typeof item?.text === 'string' && item.text.trim()).map((item) => ({ text: item.text.trim(), thought: typeof item.thought === 'string' ? item.thought.trim().slice(0, 700) : '', replyTo: Number.isInteger(item.replyTo) && item.replyTo >= 0 ? item.replyTo : null, reactionTo: Number.isInteger(item.reactionTo) && item.reactionTo >= 0 ? item.reactionTo : null, reactionEmoji: typeof item.reactionEmoji === 'string' ? [...item.reactionEmoji.trim()].slice(0, 8).join('') : '', status: item.status && typeof item.status === 'object' ? { affection: normalizedStatus(item.status.affection), anger: normalizedStatus(item.status.anger), sadness: normalizedStatus(item.status.sadness) } : null }))
  if (!replies.length) throw new Error('角色暂时没有生成回复，请重试。')
  return replies.slice(0, 8)
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
  const thoughtInstruction = needsThought ? '【必须生成回复前思绪】本轮第一条角色消息必须包含非空 thought 字符串；若输出多条消息，仅第一条包含 thought。写成角色此刻脑海里自然闪过的一两句第一人称念头，约 20 至 40 个汉字，像真人当下的朴素反应，而不是小说旁白、戏剧独白或精心设计的台词。只写角色真实会有的情绪与判断，强度符合人物档案、关系进展和当前事件；没有强烈依据时保持平常、克制，不把普通意外、关心或不满升级成占有欲、威胁、轻蔑、支配或病态执念。角色设定中的危险身份、犯罪经历、权势或暴力倾向不等于需要在日常对话中主动展示，更不是霸总台词的理由。先依据角色的现实处境与利益判断：若身份曝光会带来追捕、牵连、风险或不利后果，角色通常会隐瞒、含糊带过、转移话题或谨慎试探；只有用户明确知情、当前情境确有必要且符合角色谨慎程度时，才可以提及。不要为了证明角色危险而自报身份、炫耀地位、威胁用户或说“你知道我是谁/我是干什么的”之类宣言。也不要把用户的普通行动（例如询问工作、应聘或靠近）改写成“发疯”“找死”“胆子不小”等责骂、威胁或挑衅；除非用户确实做了具体危险行为且角色有充分理由这样判断，否则按字面理解、自然回应，不凭空升级冲突。禁止给用户添加人物档案和既有对话未建立的称呼或绰号，包括“小东西”“小家伙”等幼态、宠物化或居高临下的叫法；不要用类似称呼替代姓名或“你”。避免“不知死活”“落到我手里”等威胁式、霸总式、反派式表达，也不要把情绪包装成宣言。严禁使用“用户”“对方”等第三人称标签，不总结回复策略、不罗列分析过程、不重复用户原话。这是供界面展示的简短角色化感受，不是隐藏推理链；不输出逐步推理、规则或策略，不编造情节。' : ''
  const statusInstruction = statusBarEnabled(chat.id) ? ` 每条角色消息还需包含 status 对象，字段为 affection、anger、sadness，均为 0 到 100 的整数。依据角色档案和本轮上下文谨慎调整；没有明显变化时保持上一轮数值。上一轮角色状态：${previousStatus ? JSON.stringify(previousStatus) : '暂无已记录状态'}。状态只用于界面，不要写进聊天正文。` : ''
  const reactionInstruction = `【聊天反应】除了回复文字，你也可以自然地给用户本轮最新一轮对话中的消息点一个 emoji 反应。最新一轮仅指最近一条角色消息之后的用户消息；可反应消息候选列表（reactionTo 索引从 0 开始）为：${JSON.stringify(reactionCandidates.map((message) => message.text))}。只能选择此候选列表里的索引，不得反应任何更早的消息；列表为空时不要输出 reactionTo 或 reactionEmoji。依据当下真实感受自由选择任何合适的 emoji，不限于常用列表，不必每轮都点。若反应，在对应回复对象填写 reactionTo（候选列表索引）和 reactionEmoji（单个 emoji）；没点反应时省略。`
  const formatInstruction = `\n\n【回复格式（必须遵守）】只输出一个有效 JSON 对象，不要 Markdown 代码围栏、前言、解释或 JSON 以外的文字。结构为：{"messages":[{"text":"消息正文"${needsThought ? ',"thought":"非空的第一条消息思绪，必填"' : ''}${statusBarEnabled(chat.id) ? ',"status":{"affection":50,"anger":0,"sadness":0}' : ''},"replyTo":0,"reactionTo":0,"reactionEmoji":"💛"}]}。messages 必须是数组，每项必须有非空字符串 text；${needsThought ? '第一项必须包含非空 thought 字符串，后续项省略 thought。' : '不要输出 thought 字段。'} replyTo 仅在引用用户消息时填写对应索引，不引用就省略。reactionTo 和 reactionEmoji 仅在角色想给用户消息点反应时一起填写，reactionTo 必须是上方候选列表索引。确保字符串中的引号、换行和反斜杠均按 JSON 规则转义，输出可直接 JSON.parse。`
  const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: preset.model,
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n结合上下文判断是否需要引用用户之前的某条消息进行回复。只有当引用有助于回应、澄清、接续话题或符合当前角色的意愿与表达方式时才引用，不要每轮都引用。每轮可发 1 至 5 条消息，每条长度和条数由语境决定，不要为了凑数拆分。${reactionInstruction}${thoughtInstruction}${statusInstruction}${buildTimeContext(chat, history)}${formatInstruction}` },
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
    if (needsThought && !replies[0]?.thought) {
      const thoughtResponse = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
        body: JSON.stringify({
          model: preset.model,
          messages: [
            { role: 'system', content: `当前上下文：${history.map((message) => `${message.role === 'assistant' ? characterName : userName}：${message.content}`).join('\n')}\n\n角色刚刚发出的回复：${replies.map((reply) => reply.text).join('\n')}\n\n请基于以上具体情境生成 thought。遵守角色档案，但不要为了表现人设而复述身份、炫耀危险、威胁对方或补演霸总式台词。若角色有需要隐瞒的身份或利益风险，应像谨慎的真人一样考虑隐瞒、含糊、转移或试探；没有必要就不主动提及。思绪应短、自然、贴近角色当下真实念头，不要新增聊天正文里没有的事实。只输出 JSON：{"thought":"非空思绪"}。` },
            ...history,
            { role: 'assistant', content: replies.map((reply) => reply.text).join('\n') },
            { role: 'user', content: '请根据以上对话和刚才角色的回复生成 thought 字段。' },
          ],
          temperature: Number.isFinite(Number(preset.temperature)) ? Number(preset.temperature) : 0.7,
          stream: false,
        }),
      })
      const thoughtData = await thoughtResponse.json().catch(() => ({}))
      if (!thoughtResponse.ok) throw new Error(thoughtData.error?.message || `思绪补全失败（${thoughtResponse.status}）`)
      const thoughtContent = thoughtData.choices?.[0]?.message?.content
      if (typeof thoughtContent === 'string') {
        try {
          const parsedThought = JSON.parse(thoughtContent.replace(/^```(?:json)?\s*|\s*```$/g, '').trim())
          if (typeof parsedThought.thought === 'string' && parsedThought.thought.trim()) replies[0].thought = parsedThought.thought.trim().slice(0, 700)
        } catch {
          // Keep the reply if the optional thought completion is malformed.
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

async function sendMessage() {
  const text = draft.value.trim()
  if (!text || !activeChat.value) return
  playSound('send')
  const chatId = activeChat.value.id
  const history = [...(chatMessages.value[chatId] || messages.value)]
  history.push({ from: 'me', text, time: currentTime(), timestamp: new Date().toISOString(), ...(quoteDraft.value ? { replyTo: { ...quoteDraft.value } } : {}) })
  quoteDraft.value = null
  chatMessages.value[chatId] = history
  persistChatHistory()
  draft.value = ''
  replyError.value = ''
  messages.value = history
  scrollMessages()
  if (replyImmediately.value) requestReply()
}

function requestReply() {
  const chat = activeChat.value
  if (!chat || pendingReplies[chat.id]?.promise) return
  const chatId = chat.id
  const history = [...(chatMessages.value[chatId] || messages.value)]
  if (!history.some((message) => message.from === 'me')) return
  const memoryLimit = shortTermMemoryRounds(chatId) * 2
  const requestMessages = [...(retainedChatMemory.value[chatId] || []), ...history].slice(-memoryLimit)
  const latestTurnStart = history.findLastIndex((message) => message.from === 'them') + 1
  const reactionCandidates = history.slice(latestTurnStart).filter((message) => message.from === 'me')
  const previousStatus = [...history].reverse().find((message) => message.from === 'them' && message.status)?.status || null
  const historyForRequest = requestMessages.map((message) => ({ role: message.from === 'me' ? 'user' : 'assistant', content: message.text }))
  const pending = { controller: new AbortController(), promise: null }
  pendingReplies[chatId] = pending
  replyLoading.value = true
  characterTyping.value = true
  replyError.value = ''
  pending.promise = requestCharacterReply(chat, historyForRequest, pending.controller, statusBarEnabled(chatId) ? previousStatus : null, reactionCandidates)
    .then(async (replies) => {
      for (let index = 0; index < replies.length; index += 1) {
        await wait(replyDelay(replies[index].text, index))
        if (pending.controller.signal.aborted) return
        const quotedMessage = replies[index].replyTo === null ? null : history.filter((message) => message.from === 'me')[replies[index].replyTo]
        const reactionTarget = replies[index].reactionTo === null ? null : reactionCandidates[replies[index].reactionTo]
        if (reactionTarget && replies[index].reactionEmoji) {
          reactionTarget.reaction = replies[index].reactionEmoji
          const targetTimestamp = reactionTarget.timestamp
          const storedTarget = history.find((message) => message.timestamp === targetTimestamp)
          if (storedTarget) storedTarget.reaction = replies[index].reactionEmoji
          const retainedTarget = (retainedChatMemory.value[chatId] || []).find((message) => message.timestamp === targetTimestamp)
          if (retainedTarget) retainedTarget.reaction = replies[index].reactionEmoji
        }
        history.push({ from: 'them', text: replies[index].text, time: currentTime(), timestamp: new Date().toISOString(), ...(index === 0 && replies[index].thought ? { thought: replies[index].thought } : {}), ...(replies[index].status ? { status: replies[index].status } : {}), ...(quotedMessage ? { replyTo: { from: quotedMessage.from, text: quotedMessage.text } } : {}) })
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
const contacts = ref([])
const tabs = ['聊天', '朋友圈', '我的']
const sections = ref([{ title: '我的人物', open: true, chats: [] }])
const filteredSections = computed(() => sections.value.map((section) => ({ ...section, chats: section.chats.filter((chat) => chat.name.toLowerCase().includes(query.value.trim().toLowerCase())) })).filter((section) => section.chats.length))
const filteredContacts = computed(() => contacts.value.filter((person) => person.name.toLowerCase().includes(contactQuery.value.trim().toLowerCase())))

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
              const defaultIds = new Set(defaultChatPreset.entries.map((entry) => entry.id))
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

function savePreset() {
  const name = presetDraft.value.name.trim() || '我的聊天预设'
  chatConfig.value.preset = { ...presetDraft.value, name, entries: presetDraft.value.entries.map((entry) => ({ ...entry, name: entry.name.trim() || '未命名条目' })) }
  presetDraft.value = null
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
      <article v-for="(notice, index) in replyNotices" :key="notice.id" class="reply-notice" :style="{ '--stack-index': index }">
        <span class="notice-avatar" :style="{ '--avatar-color': notice.chat.color }"><img v-if="notice.chat.avatarImage" :src="notice.chat.avatarImage" alt="" /><span v-else>{{ notice.chat.avatar }}</span></span>
        <span class="notice-copy"><strong>{{ notice.chat.name }}</strong><span>{{ notice.text }}</span></span>
        <span class="notice-time">现在</span>
      </article>
    </div>
    <header class="topbar">
      <button class="back-button" aria-label="返回桌面" @click="emit('close')"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
      <div class="topbar-spacer" />
      <button class="round-action" :aria-label="searchOpen ? '关闭搜索' : '搜索对话'" @click="searchOpen = !searchOpen; currentTab = '聊天'; if (!searchOpen) query = ''"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg></button>
    </header>

    <main class="chat-content">
      <template v-if="currentTab === '聊天'">
        <div class="welcome"><strong>{{ userProfile.name || '我的空间' }}</strong></div>
        <label v-if="searchOpen" class="search-field"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="query" autofocus placeholder="搜索对话"/><button v-if="query" aria-label="清除搜索" @click="query = ''">×</button></label>
        <section v-for="section in filteredSections" :key="section.title" class="chat-section">
          <button class="section-toggle" type="button" :aria-expanded="section.open" @click="sections.find((item) => item.title === section.title).open = !section.open"><svg class="chevron" :class="{ folded: !sections.find((item) => item.title === section.title).open }" viewBox="0 0 20 20"><path d="m5 7 5 5 5-5"/></svg><span>{{ section.title }}</span><small>{{ section.chats.length }}</small><svg class="section-end" viewBox="0 0 20 20"><path d="m7 5 5 5-5 5"/></svg></button>
          <div v-if="sections.find((item) => item.title === section.title).open" class="chat-card">
            <button v-for="chat in section.chats" :key="chat.id" class="conversation" type="button" @click="openChat(chat)">
              <span class="avatar" :style="{'--avatar-color':chat.color}"><img v-if="chat.avatarImage" :src="chat.avatarImage" :alt="`${chat.name}头像`"/><span v-else>{{ chat.avatar }}</span><i v-if="chat.online" class="online-dot"/><i v-if="chat.group" class="group-mark">群</i></span>
              <span class="conversation-copy"><span class="conversation-top"><strong>{{ chat.name }}</strong><time>{{ chat.time }}</time></span><span class="conversation-bottom"><span>{{ chat.subtitle }}</span><i v-if="chat.unread" class="unread-count">{{ chat.unread }}</i></span></span>
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
          <span class="profile-sparkle">✳</span>
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
            <button class="back-button" aria-label="返回聊天列表" @click="leaveConversation"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
              <div class="conversation-identity" :class="{ 'couple-mode': coupleModeEnabled() }">
                <span class="dialog-avatar character-avatar" :style="{'--avatar-color': activeChat.color}"><img v-if="activeChat.avatarImage" :src="activeChat.avatarImage" :alt="`${activeChat.name}头像`"/><svg v-else viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="url(#default-avatar)"/><defs><linearGradient id="default-avatar" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b9cce0"/><stop offset="1" stop-color="#8098b5"/></linearGradient></defs><circle cx="32" cy="23" r="10" fill="#fff"/><path d="M12 54c2-11 9-17 20-17s18 6 20 17" fill="#fff"/></svg></span>
                <div v-if="coupleModeEnabled()" class="heartbeat-wave" aria-label="情侣心跳电波"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                <span v-if="coupleModeEnabled()" class="dialog-avatar couple-avatar" :style="userProfile.avatar ? { backgroundImage: `url(${userProfile.avatar})` } : {}" aria-label="我的头像"><span v-if="!userProfile.avatar">{{ (userProfile.name || '我').slice(0, 1) }}</span></span>
                <button type="button" class="identity-name" @click="openChatSettings">{{ activeChat.name }} <i>›</i></button>
              </div>
            <button class="dialog-more" aria-label="视频通话"><svg viewBox="0 0 24 24"><rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 6-4v12l-6-4"/></svg></button>
          </header>
          <main ref="messageList" class="message-list" @scroll.passive="onMessageListScroll">
            <button v-if="visibleMessageOffset > 0" class="load-older-messages" @click="loadOlderMessages">加载更早的消息（{{ visibleMessageOffset }} 条）</button>
            <div v-for="(message, index) in visibleMessages" :key="visibleMessageOffset + index" class="message-row" :class="[message.from, { 'has-tail': isLastInRun(visibleMessageOffset + index), 'message-selected': selectedMessages.includes(visibleMessageOffset + index) }]" @pointerdown="!multiDeleteMode && startMessagePress(visibleMessageOffset + index, $event)" @pointerup="cancelMessagePress" @pointerleave="cancelMessagePress" @pointercancel="cancelMessagePress" @contextmenu.prevent="openMessageMenu(visibleMessageOffset + index, $event)" @click="multiDeleteMode ? toggleMessageSelection(visibleMessageOffset + index) : (message.from === 'them' && thoughtPreviewEnabled() && message.thought ? toggleThoughtMessage(visibleMessageOffset + index) : (message.from === 'them' && statusBarEnabled() && message.status ? toggleStatusMessage(visibleMessageOffset + index) : suppressMessageClick($event)))">
              <span v-if="message.from === 'them' && isLastInRun(index)" class="tiny-avatar" :style="{'--avatar-color': activeChat.color}"><img v-if="activeChat.avatarImage" :src="activeChat.avatarImage" alt=""/><span v-else>{{ activeChat.avatar }}</span></span>
              <div class="message-content-stack"><div v-if="message.from === 'them' && thoughtPreviewEnabled() && message.thought" class="thought-preview" :class="{ expanded: expandedThoughtMessages.includes(index) }"><button type="button" class="thought-preview-toggle" :aria-expanded="expandedThoughtMessages.includes(index)" @click.stop="toggleThoughtMessage(index)"><span>{{ expandedThoughtMessages.includes(index) ? '角色思绪摘要' : '回复前的思绪' }}</span><span class="thought-chevron">{{ expandedThoughtMessages.includes(index) ? '−' : '+' }}</span></button><p v-if="expandedThoughtMessages.includes(index)">{{ message.thought }}</p></div><p class="message-bubble"><span v-if="message.replyTo" class="quoted-message"><strong>{{ message.replyTo.from === 'me' ? '我' : activeChat.name }}</strong><span>{{ message.replyTo.text }}</span></span><span class="message-text">{{ message.text }}</span><span v-if="message.reaction" class="message-reaction" :class="{ 'character-reaction': message.from === 'me' }" :aria-label="`反应：${message.reaction}`">{{ message.reaction }}</span></p>
                <section v-if="message.from === 'them' && statusBarEnabled() && message.status && expandedStatusMessages.includes(index)" class="character-status-card" aria-label="角色状态"><div class="status-card-heading"><span>MOOD · STATUS</span><i>✦</i></div><div class="status-metric"><span>好感度</span><div class="status-track"><i :style="{ width: `${message.status.affection ?? 0}%` }" /></div><strong>{{ message.status.affection ?? '—' }}</strong></div><div class="status-metric anger"><span>生气值</span><div class="status-track"><i :style="{ width: `${message.status.anger ?? 0}%` }" /></div><strong>{{ message.status.anger ?? '—' }}</strong></div><div class="status-metric sadness"><span>伤心值</span><div class="status-track"><i :style="{ width: `${message.status.sadness ?? 0}%` }" /></div><strong>{{ message.status.sadness ?? '—' }}</strong></div></section>
              </div>
              <time v-if="isLastInRun(index)">{{ messageTime(message) }}</time>
            </div>
            <div v-if="userTyping || (characterTyping && activeChat)" class="typing-row" :class="{ me: userTyping && !characterTyping, them: characterTyping }" role="status" :aria-label="characterTyping ? `${activeChat.name}正在输入` : '我正在输入'">
              <span class="typing-bubble"><i></i><i></i><i></i></span>
            </div>
          </main>
          <p v-if="replyLoading" class="reply-status" role="status">{{ activeChat.name }}正在组织语言…</p>
          <p v-else-if="replyError" class="reply-status reply-error" role="alert">{{ replyError }}</p>
            <div class="composer" :class="{ 'composer-with-quote': quoteDraft }">
              <div v-if="quoteDraft" class="quote-compose-preview"><span><strong>回复 {{ quoteDraft.from === 'me' ? '自己' : activeChat.name }}</strong><span>{{ quoteDraft.text }}</span></span><button type="button" aria-label="取消引用" @click="clearQuoteDraft">×</button></div>
              <form class="composer-input-row" @submit.prevent="sendMessage">
                <button v-if="!replyImmediately && !replyLoading" type="button" class="receive-button" aria-label="接收联系人回复" title="接收回复" :disabled="!messages.some((message) => message.from === 'me')" @click="requestReply"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14" /></svg></button>
                <button class="send-button" aria-label="发送消息" :disabled="!draft.trim() || replyLoading"><svg viewBox="0 0 24 24"><path d="M4 12h15M13 5l7 7-7 7"/></svg></button>
                <button type="button" class="composer-tool" aria-label="添加附件"><svg viewBox="0 0 24 24"><path d="m8 12 7.8-7.8a4 4 0 0 1 5.7 5.7L11 22.2a6 6 0 0 1-8.5-8.5L13.1 3"/></svg></button>
                <button type="button" class="composer-tool moon-tool" aria-label="语音模式"><svg viewBox="0 0 24 24"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.6 8.6 0 1 0 20.5 15.2Z"/></svg></button>
                <button type="button" class="composer-tool" aria-label="语音输入"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></svg></button>
                <textarea v-model="draft" aria-label="输入消息" placeholder="iMessage 信息" autocomplete="off" rows="1" @keydown.enter="onComposerEnter" />
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
          <p class="chat-settings-section-title">MEMORY <span>对话记忆</span></p>
          <section class="chat-setting-card memory-setting-card">
            <span class="chat-setting-icon memory-icon">◷</span>
            <div class="chat-setting-copy"><strong>角色短期记忆</strong><small>设置角色回复时参考的最近对话轮数，聊天历史仍会完整保存。</small></div>
            <label class="memory-input-wrap"><input aria-label="角色短期记忆轮数" type="number" min="1" max="500" step="1" :value="shortTermMemoryRounds()" @change="setShortTermMemoryRounds($event.target.value)" /><span>轮</span></label>
          </section>
          <p class="chat-settings-section-title">PERSONALIZE <span>个性化</span></p>
          <section class="chat-setting-card">
            <span class="chat-setting-icon couple-icon">♡</span>
            <div class="chat-setting-copy"><strong>情侣头像式双人展示</strong><small>在聊天顶部并排展示角色与当前“我的”头像。</small></div>
            <button type="button" class="toggle-switch" :class="{ on: coupleModeEnabled() }" role="switch" :aria-checked="coupleModeEnabled()" aria-label="情侣头像式双人展示" @click="setCoupleMode(!coupleModeEnabled())"><i /></button>
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
        <section class="message-menu-group" :style="{ left: `${messageMenu.left}px`, top: `${messageMenu.top}px`, '--menu-origin-x': `${messageMenu.originX * 100}%` }" role="dialog" aria-modal="true" aria-label="消息操作">
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
    <div v-if="multiDeleteMode" class="multi-delete-bar"><span>已选 {{ selectedMessages.length }} 条</span><button type="button" :disabled="!selectedMessages.length" @click="deleteSelectedMessages(selectedMessages)">删除</button><button type="button" @click="multiDeleteMode = false; selectedMessages = []">完成</button></div>
    <div v-if="messageDialog" class="acrylic-overlay" @click.self="messageDialog = null">
      <section class="message-edit-dialog" role="dialog" aria-modal="true" aria-label="编辑消息"><h3>编辑消息</h3><textarea v-model="messageDialog.text" rows="4" autofocus /><footer><button type="button" @click="messageDialog = null">取消</button><button type="button" @click="confirmEditMessage">保存</button></footer></section>
    </div>
    <transition name="contacts-fade"><div v-if="toastMessage" class="message-toast" role="status">{{ toastMessage }}</div></transition>
    <footer class="bottom-area">
      <nav class="bottom-nav" aria-label="页面切换"><button v-for="tab in tabs" :key="tab" type="button" :class="{ selected: currentTab === tab }" :aria-current="currentTab === tab ? 'page' : undefined" @click="currentTab = tab"><svg v-if="tab === '聊天'" viewBox="0 0 24 24"><path d="M7.1 18.2 4 20l.9-3.7A8 8 0 1 1 7.1 18.2Z"/><path d="M8 10.5h8M8 14h5"/></svg><svg v-else-if="tab === '朋友圈'" viewBox="0 0 24 24"><path d="M12 21s-8-4.8-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z"/><path d="M12 7.2c-1.7 2-2.3 4.2-1.6 6.4.5 1.5 1.5 2.7 3.2 3.6"/></svg><svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.4-3.5 2.9-5.6 6.5-5.6s6.1 2.1 6.5 5.6"/><path d="M19.5 5.5v4M17.5 7.5h4"/></svg><span>{{ tab }}</span></button></nav>
    </footer>
    <transition name="contacts-fade">
      <div v-if="showContacts" class="contacts-overlay" @click.self="showContacts = false">
        <section class="contacts-page" role="dialog" aria-modal="true" aria-label="添加联系人">
          <header class="contacts-header"><button type="button" aria-label="返回聊天" @click="showContacts = false">‹</button><div><span>JY · PEOPLE</span><h2>添加联系人</h2></div><i></i></header>
          <p class="contacts-intro">从你的人物档案里，挑一位开始聊天。</p>
          <label class="contact-search"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="contactQuery" autofocus placeholder="搜索人物"/><button v-if="contactQuery" type="button" aria-label="清除搜索" @click="contactQuery = ''">×</button></label>
          <div class="contact-results">
            <button v-for="person in filteredContacts" :key="person.id" type="button" class="contact-row" @click="addContact(person)">
              <span class="contact-avatar" :style="{'--avatar-color': person.color || '#e7e5df'}"><img v-if="person.avatar" :src="person.avatar" :alt="''"/><span v-else>{{ person.name.slice(0, 1) }}</span></span>
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
              <button class="config-group persona-group" type="button" aria-label="人设绑定">
                <span class="config-3d-icon persona-3d-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><defs><linearGradient id="persona-glass" x1="8" y1="5" x2="39" y2="43" gradientUnits="userSpaceOnUse"><stop stop-color="#9dbdff"/><stop offset=".52" stop-color="#648ee9"/><stop offset="1" stop-color="#a98cf2"/></linearGradient></defs><circle cx="24" cy="15" r="8"/><path d="M9 41c1.5-9 6.5-13 15-13s13.5 4 15 13"/></svg></span>
                <strong>人设绑定</strong>
              </button>
              <button class="config-group preset-group" type="button" aria-label="预设配置">
                <span class="config-3d-icon preset-3d-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><defs><linearGradient id="preset-glass" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse"><stop stop-color="#ffda83"/><stop offset=".5" stop-color="#f3a85f"/><stop offset="1" stop-color="#ec82a0"/></linearGradient></defs><path d="m24 5 4.6 13.4L42 23l-13.4 4.6L24 41l-4.6-13.4L6 23l13.4-4.6L24 5Z"/><path d="m38 5 1.8 5.2L45 12l-5.2 1.8L38 19l-1.8-5.2L31 12l5.2-1.8L38 5Z"/></svg></span>
                <strong>预设配置</strong>
              </button>
            </div>
          </div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="presetDraft" class="config-overlay preset-overlay" @click.self="presetDraft = null">
        <section class="config-sheet preset-sheet" role="dialog" aria-modal="true" aria-label="编辑聊天预设">
          <header class="config-header">
            <button type="button" aria-label="返回" @click="presetDraft = null">‹</button>
            <div><span>PRESET EDITOR</span><h2>编辑预设</h2></div>
            <button type="button" class="preset-save-top" @click="savePreset">保存</button>
          </header>
          <div class="config-scroll preset-editor-scroll">
            <p class="config-hint preset-intro">按顺序组合提示词条目；关闭某项即可暂时不将它加入聊天上下文。</p>
            <label class="config-select-label" for="preset-name">预设名称</label>
            <input id="preset-name" v-model="presetDraft.name" class="config-input" maxlength="40" placeholder="给预设取个名字" />
            <div class="preset-entry-heading"><span>提示词条目 <small>{{ presetDraft.entries.length }}</small></span><button type="button" @click="addPresetEntry">＋ 添加条目</button></div>
            <article v-for="(entry, index) in presetDraft.entries" :key="entry.id" class="preset-entry-card">
              <div class="preset-entry-top">
                <button type="button" class="entry-order" :disabled="index === 0" aria-label="上移条目" @click="movePresetEntry(index, -1)">↑</button>
                <button type="button" class="entry-order" :disabled="index === presetDraft.entries.length - 1" aria-label="下移条目" @click="movePresetEntry(index, 1)">↓</button>
                <input v-model="entry.name" class="entry-name-input" aria-label="条目名称" placeholder="条目名称" maxlength="36" />
                <button type="button" class="entry-remove" aria-label="删除条目" @click="removePresetEntry(index)">×</button>
                <button type="button" class="entry-enabled" role="switch" :aria-checked="entry.enabled" :aria-label="entry.enabled ? '停用条目' : '启用条目'" :class="{ on: entry.enabled }" @click="entry.enabled = !entry.enabled"><i /></button>
              </div>
              <button v-if="defaultChatPreset.entries.some((item) => item.id === entry.id)" type="button" class="entry-restore" @click="restorePresetEntry(index)">恢复默认</button>
              <textarea v-model="entry.content" :aria-label="`${entry.name || '提示词'}内容`" rows="3" class="entry-content-input" placeholder="写下这条提示词……" />
            </article>
            <button type="button" class="entry-add-wide" @click="addPresetEntry">＋ 添加新的提示词条目</button>
          </div>
          <footer class="preset-footer"><button type="button" class="preset-cancel" @click="presetDraft = null">取消</button><button type="button" class="preset-save" @click="savePreset">保存预设</button></footer>
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
.reply-notice-stack{position:fixed;top:calc(env(safe-area-inset-top) + 10px);left:50%;z-index:60;width:min(calc(100% - 28px),440px);display:flex;flex-direction:column;align-items:center;pointer-events:none;transform:translateX(-50%)}.reply-notice{width:100%;min-height:66px;position:relative;display:flex;align-items:center;gap:11px;margin-top:calc(var(--stack-index) * -12px);padding:11px 14px;border:1px solid #ffffffa8;border-radius:22px;background:linear-gradient(135deg,#ffffffd9,#f4f3f0ce);box-shadow:0 12px 32px #29282520;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);animation:notice-in .38s cubic-bezier(.2,.8,.2,1) both;transform:scale(calc(1 - var(--stack-index) * .025));transform-origin:top center}.reply-notice:not(:first-child){margin-top:-13px;filter:brightness(.98)}.notice-avatar{width:42px;height:42px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border:2px solid #ffffffd9;border-radius:50%;color:#626366;background:linear-gradient(145deg,#fff,var(--avatar-color));font-family:Georgia,serif;font-size:15px}.notice-avatar img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.notice-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.notice-copy strong{overflow:hidden;color:#45464a;font-size:12px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.notice-copy>span{display:-webkit-box;overflow:hidden;color:#696a6e;font-size:12px;line-height:1.4;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}.notice-time{align-self:flex-start;flex:none;color:#aaa9a5;font-size:9px}@keyframes notice-in{from{opacity:0;translate:0 -18px;scale:.97}to{opacity:1;translate:0 0;scale:1}}@media(prefers-reduced-motion:reduce){.reply-notice{animation:none}.heartbeat-wave i{animation:none;opacity:.85}}
.chat-app{--ink:#27282a;--soft:#8b8c90;position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;overflow:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);color:var(--ink);background:#f0f0f0;font-family:"Source Han Sans SC","思源黑体","Noto Sans SC",sans-serif;font-weight:400}.chat-app button,.chat-app input{font:inherit}.topbar{height:72px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 22px}.back-button{width:45px;height:45px;display:grid;place-items:center;border:0;border-radius:50%;color:#28292b;background:#ffffffd9;box-shadow:0 5px 19px #33333308}.back-button svg{width:20px;fill:none;stroke:currentColor;stroke-width:1.8}.round-action{width:76px;height:46px;display:grid;place-items:center;border:0;border-radius:28px;color:#28292b;background:#ffffffeb;box-shadow:0 5px 19px #33333308}.round-action svg{width:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}.chat-content{width:min(100%,620px);flex:1;min-height:0;overflow:auto;margin:0 auto;padding:10px 22px 10px;scrollbar-width:thin;scrollbar-color:#d2d2d2 transparent}.welcome{display:flex;align-items:center;margin:10px 0 27px}.welcome h1{margin:0;color:#4b4c4f;font-size:clamp(30px,8vw,42px);font-weight:700;letter-spacing:-1.6px}.search-field,.contact-search{height:44px;display:flex;align-items:center;gap:10px;margin:0 0 15px;padding:0 15px;border:1px solid #ffffff;border-radius:24px;background:#ffffffc9;box-shadow:0 5px 18px #33333308}.search-field svg,.contact-search svg{width:17px;flex:none;fill:none;stroke:#85868a;stroke-width:1.7}.search-field input,.contact-search input{min-width:0;flex:1;border:0;outline:0;color:var(--ink);background:transparent;font-size:12px}.search-field button,.contact-search button{border:0;color:#85868a;background:transparent;font-size:18px}.chat-section{margin-bottom:14px}.section-toggle{width:100%;height:35px;display:flex;align-items:center;gap:9px;padding:0 4px;border:0;color:#737478;background:transparent;text-align:left;font-size:17px;font-weight:500;cursor:pointer}.section-toggle>svg{width:17px;fill:none;stroke:#a9aaac;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.section-toggle .chevron{transition:transform .18s}.section-toggle .chevron.folded{transform:rotate(-90deg)}.section-toggle small{color:#a0a1a4;font-size:10px}.section-toggle .section-end{margin-left:auto;transform:rotate(90deg)}.chat-card{overflow:hidden;padding:2px 14px;border-radius:24px;background:#ffffffd9}.conversation{width:100%;min-height:72px;display:flex;align-items:center;gap:13px;padding:9px 2px;border:0;border-bottom:1px solid #efeff0;background:transparent;text-align:left;cursor:pointer}.conversation:last-child{border-bottom:0}.avatar{width:48px;height:48px;position:relative;flex:none;display:grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#f7f7f7,var(--avatar-color))}.avatar>span{color:#67686b;font-family:Georgia,"PingFang SC",serif;font-size:17px}.avatar>img,.contact-avatar img{width:100%;height:100%;position:absolute;inset:0;border-radius:50%;object-fit:cover}.online-dot{position:absolute;right:0;bottom:0;width:11px;height:11px;border:2px solid white;border-radius:50%;background:#9ca99c}.group-mark{position:absolute;right:-2px;bottom:0;width:17px;height:17px;display:grid;place-items:center;border:2px solid white;border-radius:50%;color:#fff;background:#a3a4a7;font-size:7px;font-style:normal}.conversation-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.conversation-top,.conversation-bottom{display:flex;align-items:center;justify-content:space-between;gap:9px}.conversation-top strong{overflow:hidden;color:#303134;font-size:14px;font-weight:550;text-overflow:ellipsis;white-space:nowrap}.conversation-top time{flex:none;color:#b0b1b3;font-size:10px}.conversation-bottom>span{overflow:hidden;color:#a3a4a6;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.unread-count{min-width:18px;height:18px;flex:none;display:grid;place-items:center;padding:0 5px;border-radius:12px;color:white;background:#9c9da0;font-size:9px;font-style:normal}.no-results{padding:25px 8px;color:#999a9c;text-align:center;font-size:12px}.empty-tab{min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#5b5c5f;text-align:center}.empty-icon,.profile-avatar{width:65px;height:65px;display:grid;place-items:center;margin-bottom:16px;border-radius:50%;color:#6e6f72;background:#fff;font-size:23px}.profile-avatar{font-family:Georgia,serif;font-size:20px}.empty-tab h1{margin:0;font-size:22px;font-weight:600}.empty-tab p{margin:8px 0 16px;color:#999a9d;font-size:12px}.empty-action{padding:9px 17px;border:0;border-radius:20px;color:#626367;background:#ffffffd9;font-size:11px}.my-page{min-height:100%;padding:8px 2px 30px;color:#45464a}.my-heading{padding:14px 5px 24px}.my-heading>span,.preference-label{color:#b0aaa3;font-size:9px;letter-spacing:.18em}.my-heading h1{margin:8px 0 5px;color:#424348;font-size:32px;font-weight:650;letter-spacing:-1px}.my-heading p{color:#a3a1a0;font-size:12px}.my-profile-card{width:100%;position:relative;display:flex;align-items:center;gap:14px;padding:17px;border:1px solid #ffffff;border-radius:25px;color:inherit;background:linear-gradient(135deg,#ffffffdf,#f8f7f4d9);box-shadow:0 10px 28px #6e65550a;text-align:left;cursor:pointer;transition:transform .18s,box-shadow .18s}.my-profile-card:active{transform:scale(.985);box-shadow:0 5px 16px #6e65550d}.my-profile-card:focus-visible{outline:2px solid #c6bcb0;outline-offset:3px}.my-avatar{width:60px;height:60px;flex:none;display:grid;place-items:center;overflow:hidden;border:3px solid #fff;border-radius:50%;background-color:#e7e3dd;background-image:linear-gradient(145deg,#ede8e1,#d8d8d2);background-position:center;background-size:cover;box-shadow:0 4px 12px #5552}.my-avatar>span{color:#8d8983;font-family:Georgia,serif;font-size:22px}.my-profile-copy{min-width:0;display:flex;flex-direction:column;gap:6px}.my-profile-copy strong{color:#535251;font-size:15px;font-weight:600}.my-profile-copy small{overflow:hidden;color:#aaa7a3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.profile-sparkle{margin-left:auto;color:#c4b9aa;font-size:18px}.preference-label{display:flex;align-items:center;gap:9px;margin:27px 6px 11px}.preference-label span{color:#8f8d8a;font-size:11px;letter-spacing:0}.preference-card{padding:3px 16px 13px;border:1px solid #ffffff;border-radius:24px;background:#ffffffc9;box-shadow:0 8px 24px #6e655508}.preference-row{width:100%;min-height:69px;display:flex;align-items:center;gap:12px;border:0;background:transparent;text-align:left;cursor:pointer}.sound-setting-row{position:relative}.sound-toggle{flex:none}.sound-action{flex:none;padding:6px 9px;border:1px solid #ece9e4;border-radius:15px;color:#99938a;background:#faf9f7;font-size:9px}.sound-file-input{display:none}
.preference-icon{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:13px;color:#999185;background:#f2f0ec;font-size:20px}.preference-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.preference-copy strong{color:#5d5b58;font-size:12px;font-weight:600}.preference-copy small{color:#aaa7a2;font-size:10px}.toggle-pill{width:39px;height:23px;position:relative;flex:none;border-radius:20px;background:#e5e3df;transition:background .2s}.toggle-pill i{width:17px;height:17px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.toggle-pill.on{background:#aeb9aa}.toggle-pill.on i{transform:translateX(16px)}.preference-divider{height:1px;margin:0 0 10px 46px;background:#f0efed}.preference-note{display:flex;align-items:center;gap:7px;padding-left:46px;color:#aaa7a3;font-size:9px}.preference-note span{color:#c1b7a9}.my-footer-note{margin:26px 0 0;color:#c3bdb5;text-align:center;font-family:Georgia,serif;font-size:10px;letter-spacing:.06em}.config-card{width:100%;min-height:68px;display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #fff;border-radius:23px;color:inherit;background:#ffffffc9;box-shadow:0 8px 24px #6e655508;text-align:left;cursor:pointer;transition:transform .18s}.config-card:active{transform:scale(.985)}.config-icon{color:#a89a88}.config-arrow{color:#bab5ae;font-family:Georgia,serif;font-size:25px}.config-overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:14px;background:#38363338;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.config-sheet{width:min(100%,520px);height:min(82vh,680px);display:flex;flex-direction:column;overflow:hidden;padding:19px 20px 16px;border:1px solid #ffffffd9;border-radius:29px;background:#f5f4f1;box-shadow:0 24px 80px #25252525}.chat-settings-sheet{height:min(56dvh,460px)}.history-actions{display:flex;flex-direction:column;gap:8px}.history-action{display:flex;flex-direction:column;gap:5px;padding:12px 13px;border:1px solid #efede8;border-radius:16px;background:#faf9f7;text-align:left;cursor:pointer}.history-action strong{color:#68645d;font-size:11px;font-weight:600}.history-action span{color:#aaa49b;font-size:9px;line-height:1.5}.history-action.restart strong{color:#ad7770}.history-confirm-overlay{background:#00000026;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.history-confirm-dialog{border-color:#f0f0f0;background:#fff;box-shadow:0 18px 55px #00000024;backdrop-filter:none;-webkit-backdrop-filter:none}.history-confirm-dialog h3{color:#343538}.history-confirm-dialog p{margin:0;color:#77797d;font-size:12px;line-height:1.65}.history-confirm-dialog footer button{color:#55575b;background:#ededee}.history-confirm-dialog .history-confirm-delete{color:#55575b;background:#e5e5e7}
.chat-settings-page{position:fixed;inset:0;z-index:38;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;padding:calc(env(safe-area-inset-top) + 18px) 20px calc(env(safe-area-inset-bottom) + 16px);color:#424348;background:#fff}.chat-settings-header{width:min(100%,620px);display:grid;grid-template-columns:42px 1fr 42px;align-items:center;flex:none;margin:0 auto 20px}.chat-settings-header>button{width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:0;color:#5d5e60;background:transparent;font-size:27px;line-height:1;cursor:pointer}.chat-settings-header>div{text-align:center}.chat-settings-header>div>span{color:#b0aaa3;font-size:8px;letter-spacing:.18em}.chat-settings-header h2{margin:4px 0 0;color:#55565a;font-size:18px;font-weight:550;letter-spacing:.04em}.chat-settings-header>i{width:38px}.chat-settings-scroll{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto;padding:0 2px 18px;scrollbar-width:thin;scrollbar-color:#e2e1de transparent}.chat-settings-section-title{display:flex;align-items:center;gap:9px;margin:17px 5px 11px;color:#b0aaa3;font-size:9px;letter-spacing:.17em}.chat-settings-section-title span{color:#8f8d8a;font-size:11px;letter-spacing:0}.chat-setting-card{min-height:78px;display:flex;align-items:center;gap:13px;margin-bottom:10px;padding:13px 15px;border:1px solid #ffffffd9;border-radius:25px;background:linear-gradient(135deg,#ffffffd9,#f8f8f6c9);box-shadow:0 7px 22px #5e5a4d0b;backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}.chat-setting-icon{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:15px;font-size:20px}.memory-icon{color:#8c7be0;background:#efebff}.couple-icon{color:#e481a4;background:#fff0f4}.status-icon{color:#e2a448;background:#fff5e3}.thought-icon{color:#6999d0;background:#edf5ff}.history-icon{color:#dd8075;background:#fff0ed}.chat-setting-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.chat-setting-copy strong{color:#55565a;font-size:12px;font-weight:650}.chat-setting-copy small{color:#9b9b9c;font-size:10px;line-height:1.5}.memory-setting-card .memory-input-wrap{width:91px;height:36px;flex:none;gap:4px;padding:0 9px;border-radius:15px;background:#f5f5f3}.memory-input-wrap input{width:100%;min-width:0;border:0;outline:0;color:#595a5d;background:transparent;font:inherit;font-size:13px}.memory-input-wrap span{flex:none;color:#97989a;font-size:10px}.toggle-switch{width:43px;height:26px;position:relative;flex:none;padding:0;border:0;border-radius:16px;background:#e7e7e5;cursor:pointer;transition:background .2s}.toggle-switch i{width:20px;height:20px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.toggle-switch.on{background:#34c759}.toggle-switch.on i{transform:translateX(17px)}.history-setting-card{flex-wrap:wrap}.history-setting-card .chat-setting-copy{flex-basis:calc(100% - 60px)}.settings-row-action{padding:7px 12px;border:1px solid #e8e8e6;border-radius:16px;color:#77787a;background:#fff;font-size:10px;cursor:pointer}.settings-row-action.restart-action{color:#c17870}.chat-settings-overlay{z-index:38}.chat-settings-sheet{height:min(62dvh,480px)}.memory-panel{padding:17px}.contacts-overlay{position:fixed;inset:0;z-index:30;display:flex;justify-content:center;align-items:stretch;padding:0 12px;background:#28282a38;backdrop-filter:blur(8px)}.contacts-page{width:min(100%,560px);display:flex;flex-direction:column;margin:auto;max-height:min(90dvh,760px);padding:19px 20px 16px;border:1px solid #ffffffd9;border-radius:28px;background:#f5f4f2;box-shadow:0 24px 80px #25252525}.contacts-header{display:grid;grid-template-columns:40px 1fr 40px;align-items:center}.contacts-header>button{width:34px;height:34px;border:0;border-radius:50%;color:#76777a;background:#ffffffc9;font-size:27px;line-height:1;cursor:pointer}.contacts-header>div{text-align:center}.contacts-header>div>span{color:#aaa9a5;font-size:8px;letter-spacing:.18em}.contacts-header h2{margin:3px 0 0;color:#4c4d50;font-size:19px;font-weight:600}.contacts-header>i{width:34px}.contacts-intro{margin:16px 0 13px;color:#929294;text-align:center;font-size:11px}.contact-search{height:46px;flex:none;margin-bottom:10px;border-color:#fff;border-radius:25px;background:#fff}.contact-results{flex:1;min-height:100px;overflow:auto}.contact-row{width:100%;min-height:68px;display:flex;align-items:center;gap:11px;padding:8px 3px;border:0;border-bottom:1px solid #e8e7e4;background:transparent;text-align:left;cursor:pointer}.contact-avatar{width:45px;height:45px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#696a6c;background:linear-gradient(145deg,#fff,var(--avatar-color));font-family:Georgia,serif;font-size:16px}.contact-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.contact-copy strong{overflow:hidden;color:#4c4d50;font-size:12px;font-weight:550;text-overflow:ellipsis;white-space:nowrap}.contact-copy small{overflow:hidden;color:#a2a2a3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.contact-add{padding:6px 10px;border:1px solid #e1dfda;border-radius:18px;color:#767772;background:#ffffffa8;font-size:9px;white-space:nowrap}.contact-add.added{border-color:#e8e7e4;color:#aaa9a5;background:transparent}.contacts-empty{min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#858589;text-align:center}.contacts-empty>span{width:42px;height:42px;display:grid;place-items:center;margin-bottom:10px;border-radius:50%;color:#aaa99e;background:#ffffffc9;font-size:18px}.contacts-empty strong{font-size:12px;font-weight:550}.contacts-empty p{max-width:240px;margin:6px 0;color:#a3a3a4;font-size:10px;line-height:1.6}.contacts-done{height:40px;flex:none;margin-top:12px;border:0;border-radius:22px;color:#5d5e60;background:#e6e5e2;font-size:11px;cursor:pointer}.contacts-fade-enter-active,.contacts-fade-leave-active{transition:opacity .2s,transform .2s}.contacts-fade-enter-from,.contacts-fade-leave-to{opacity:0;transform:translateY(8px)}.bottom-area{width:min(100% - 32px,560px);flex:none;margin:0 auto;padding:8px 0 max(10px,env(safe-area-inset-bottom));}.bottom-tools{display:flex;align-items:center;gap:12px;margin-bottom:8px}.news-search{height:62px;min-width:0;flex:1;display:flex;align-items:center;gap:15px;padding:0 20px;border:1px solid #ffffff;border-radius:36px;color:#696a6d;background:#ffffffd9;box-shadow:0 8px 25px #3333330a;text-align:left;cursor:pointer}.news-search svg{width:25px;height:25px;flex:none;fill:none;stroke:#333438;stroke-width:1.8;stroke-linecap:round}.news-search span{font-size:15px}.compose-fab{width:62px;height:62px;flex:none;display:grid;place-items:center;border:1px solid #ffffff;border-radius:50%;color:#52545a;background:#ffffffdf;box-shadow:0 8px 25px #3333330a;cursor:pointer}.compose-fab svg{width:27px;fill:currentColor;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.compose-fab svg path:first-child{stroke:none}.bottom-nav{height:42px;display:grid;grid-template-columns:repeat(3,1fr);align-items:center;border:1px solid #ffffffb8;border-radius:24px;background:#ffffff91;box-shadow:0 5px 18px #33333308;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.bottom-nav button{height:34px;display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:18px;color:#96979a;background:transparent;font-size:11px;cursor:pointer}.bottom-nav button.selected{color:#414246;background:#ffffffd9;box-shadow:0 2px 8px #3333330b}.bottom-nav button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.conversation-overlay{position:fixed;inset:0;z-index:25;display:flex;justify-content:center;background:#fff}.conversation-page{width:min(100%,620px);height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 30px);background:#fff}.conversation-header{height:96px;position:relative;flex:none;display:flex;align-items:flex-start;justify-content:space-between}.conversation-header .back-button,.dialog-more{width:54px;height:54px;display:grid;place-items:center;border:0;border-radius:50%;color:#08090a;background:#fff;box-shadow:0 8px 28px #0000000d;cursor:pointer}.conversation-header .back-button svg{width:30px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.conversation-identity{position:absolute;left:50%;top:13px;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);z-index:2}.conversation-identity.couple-mode{top:8px;display:grid;grid-template-columns:76px 112px 76px;grid-template-rows:76px auto;column-gap:5px;row-gap:0;justify-items:center;align-items:center}.dialog-avatar{width:94px;height:94px;position:relative;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#9caecc}.couple-mode .dialog-avatar{width:76px;height:76px}.dialog-avatar img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.dialog-avatar>svg{width:100%;height:100%}.couple-avatar{background-color:#e7e3dd;background-image:linear-gradient(145deg,#ede8e1,#d8d8d2);background-position:center;background-size:cover;color:#77736d;font-size:23px}.heartbeat-wave{width:112px;height:64px;display:flex;align-items:center;justify-content:center;gap:3px;grid-column:2;grid-row:1}.heartbeat-wave i{width:3px;height:6px;flex:none;border-radius:3px;background:#171717;transform-origin:center;animation:heartbeat-wave 1.1s cubic-bezier(.36,0,.64,1) infinite}.heartbeat-wave i:nth-child(1),.heartbeat-wave i:nth-child(11){height:5px;animation-delay:.02s}.heartbeat-wave i:nth-child(2),.heartbeat-wave i:nth-child(10){height:10px;animation-delay:.07s}.heartbeat-wave i:nth-child(3),.heartbeat-wave i:nth-child(9){height:17px;animation-delay:.12s}.heartbeat-wave i:nth-child(4),.heartbeat-wave i:nth-child(8){height:27px;animation-delay:.17s}.heartbeat-wave i:nth-child(5),.heartbeat-wave i:nth-child(7){height:40px;animation-delay:.22s}.heartbeat-wave i:nth-child(6){height:52px;animation-delay:.27s}@keyframes heartbeat-wave{0%,100%{transform:scaleY(.24);opacity:.45}50%{transform:scaleY(1);opacity:1}}.couple-mode .character-avatar{grid-column:1;grid-row:1}.couple-mode .couple-avatar{grid-column:3;grid-row:1}.couple-mode .identity-name{grid-column:1 / 4;grid-row:2;margin-top:-2px}.identity-name{position:relative;display:flex;align-items:center;margin-top:-8px;padding:7px 14px 8px 19px;border:1px solid #ffffffd9;outline:0;appearance:none;-webkit-appearance:none;border-radius:30px;color:#08090a;background:linear-gradient(135deg,#ffffffed,#f8f8f8d9);box-shadow:0 5px 22px #0000000a;backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);font-family:inherit;font-size:19px;font-weight:750;white-space:nowrap;cursor:pointer}.identity-name:focus-visible{outline:2px solid #d8d8d8;outline-offset:2px}.identity-name i{margin-left:5px;color:#aeb1b3;font-size:25px;font-style:normal}.dialog-more svg{width:31px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.message-list{flex:1;min-height:0;overflow:auto;padding:111px 0 18px;scrollbar-width:none}.load-older-messages{display:block;margin:0 auto 14px;padding:8px 14px;border:1px solid #ececec;border-radius:18px;color:#777;background:#f8f8f8;font:inherit;font-size:12px;cursor:pointer}.day-label{display:none}.message-row{width:100%;min-width:0;display:flex;align-items:flex-end;gap:0;margin:0 0 4px}.message-row.them{justify-content:flex-start}.message-row.me{justify-content:flex-end;flex-wrap:wrap}.tiny-avatar{display:none}.message-content-stack{width:88%;max-width:88%;min-width:0;flex:0 1 88%;display:flex;flex-direction:column;align-items:flex-start;gap:7px}.message-row.them .message-content-stack{min-width:0}.message-row.me .message-content-stack{align-items:flex-end}.message-bubble{position:relative;display:block;box-sizing:border-box;width:fit-content;max-width:100%;min-width:0;flex:0 1 auto;margin:0;padding:13px 17px;border-radius:27px;color:#111;background:#e9e9eb;font-size:18px;font-weight:500;line-height:1.4;overflow-wrap:anywhere}.character-status-card{width:min(270px,100%);display:flex;flex-direction:column;gap:9px;padding:11px 13px;border:1px solid #eeece8;border-radius:20px;background:linear-gradient(145deg,#fbfaf8,#f3f1ed);box-shadow:0 5px 16px #71695c0d;animation:status-card-in .2s ease-out}.thought-preview{width:min(300px,100%);overflow:visible;animation:status-card-in .2s ease-out}.thought-preview-toggle{width:auto;max-width:100%;min-height:25px;display:flex;align-items:center;gap:7px;padding:0;border:0;color:#8b8b8b;background:transparent;text-align:left;font-size:12px;font-weight:500;cursor:pointer}.thought-spark{width:14px;height:14px;display:grid;place-items:center;color:#777;font-size:13px;animation:thought-pulse 1.8s ease-in-out infinite}.thought-chevron{margin-left:0;color:#9a9a9a;font-size:16px;line-height:1;transition:transform .18s}.thought-preview.expanded .thought-chevron{transform:rotate(90deg)}.thought-preview p{margin:3px 0 4px 21px;padding:0;color:#777;font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.thought-preview-toggle:focus-visible{outline:2px solid #c9bfb3;outline-offset:3px;border-radius:4px}@keyframes thought-pulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}@media(prefers-reduced-motion:reduce){.thought-spark{animation:none}}.status-card-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;color:#aaa39a;font-size:8px;letter-spacing:.16em}.status-card-heading i{color:#b8ad9d;font-size:12px;font-style:normal}.status-metric{display:grid;grid-template-columns:47px 1fr 24px;align-items:center;gap:8px;color:#817c74;font-size:9px}.status-metric strong{color:#777169;text-align:right;font-size:9px;font-weight:600;font-variant-numeric:tabular-nums}.status-track{height:5px;overflow:hidden;border-radius:8px;background:#e9e6e0}.status-track i{height:100%;display:block;border-radius:inherit;background:#b5bfae;transition:width .35s ease}.status-metric.anger .status-track i{background:#d1b2a9}.status-metric.sadness .status-track i{background:#b2bdc9}@keyframes status-card-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}.message-row.them .message-bubble:after,.message-row.me .message-bubble:after{content:"";position:absolute;bottom:-7px;width:17px;height:18px;background:inherit;clip-path:path("M 0 0 C 1 8 4 13 17 18 C 11 13 10 7 10 0 Z");pointer-events:none}.message-row.them.has-tail .message-bubble:after,.message-row.me.has-tail .message-bubble:after{display:block}.message-row.them:not(.has-tail) .message-bubble:after,.message-row.me:not(.has-tail) .message-bubble:after{display:none}.message-row.them .message-bubble:after{left:7px;transform:scaleX(-1)}.message-row.me .message-bubble{border-radius:27px;color:#fff;background:#35a9ed}.message-row.me .message-bubble:after{right:7px}.message-row time{display:none}.message-row.me time{display:block;flex-basis:100%;padding:4px 8px 0 0;color:#8d8d91;text-align:right;font-size:13px;font-weight:600}.message-row.me .delivery-status{display:block;flex-basis:100%;margin-top:-4px;padding-right:8px;color:#99999d;text-align:right;font-size:11px;font-weight:500}.composer{height:68px;flex:none;display:flex;align-items:center;gap:4px;padding:6px 8px;border:1px solid #f8f8f8;border-radius:40px;background:#fff;box-shadow:0 9px 34px #00000012}.send-button{width:42px;height:42px;flex:none;display:grid;place-items:center;border:0;border-radius:50%;color:#050607;background:#fff;cursor:pointer}.send-button svg{width:29px;fill:none;stroke:currentColor;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}.send-button:disabled{opacity:1}.composer-tool{width:39px;height:42px;flex:none;display:grid;place-items:center;border:0;border-radius:50%;color:#101112;background:#f5f5f5}.composer-tool svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.moon-tool{color:#92958e}.moon-tool svg{fill:#d7dbd2;stroke-width:1.5}.composer input{width:0;min-width:0;flex:1;height:51px;margin-left:8px;padding:0 17px;border:0;border-radius:30px;outline:0;color:#171819;background:#f8f8f8;text-align:center;font-size:16px;font-weight:400;user-select:text}.composer input::placeholder{color:#1d1e20;opacity:1}.conversation-fade-enter-active,.conversation-fade-leave-active{transition:opacity .18s ease}.conversation-fade-enter-from,.conversation-fade-leave-to{opacity:0}@media(max-width:420px){.conversation-page{padding-right:18px;padding-left:18px}.message-bubble{max-width:90%;font-size:16px}.composer{gap:2px;padding-right:7px;padding-left:7px}.composer-tool{width:34px}.composer input{margin-left:4px;padding:0 8px;font-size:14px}}
/* Compact proportions tuned to the reference phone UI. */
@media(max-width:600px){.conversation-page{padding-right:18px;padding-left:18px}.conversation-header{height:78px}.conversation-header .back-button,.dialog-more{width:44px;height:44px}.conversation-header .back-button svg{width:25px}.dialog-more svg{width:26px}.conversation-identity{top:7px}.dialog-avatar{width:70px;height:70px}.conversation-identity.couple-mode{top:4px;grid-template-columns:58px 90px 58px;grid-template-rows:58px auto;column-gap:4px}.couple-mode .dialog-avatar{width:58px;height:58px}.heartbeat-wave{width:90px;height:54px;gap:2px}.heartbeat-wave i{width:2.5px}.identity-name{margin-top:-7px;padding:5px 11px 6px 14px;font-size:15px}.couple-mode .identity-name{margin-top:0}.identity-name i{font-size:20px}.message-list{padding-top:82px;padding-bottom:12px}.message-list .message-row{margin-bottom:2px}.message-list .message-row.has-tail{margin-bottom:8px}.message-bubble{max-width:86%;padding:9px 13px;border-radius:21px;font-size:15px;line-height:1.4}.message-row.me .message-bubble{border-radius:21px}.message-row.them .message-bubble:after,.message-row.me .message-bubble:after{bottom:-5px;width:13px;height:14px}.message-row.me time{padding-top:3px;font-size:11px}.composer{height:54px;gap:1px;padding:4px 6px}.send-button{width:34px;height:36px}.send-button svg{width:24px}.composer-tool{width:31px;height:36px}.composer-tool svg{width:21px;height:21px}.composer input{height:42px;margin-left:3px;padding:0 8px;font-size:14px}.message-list{scroll-padding-top:80px}}
.composer textarea{width:0;min-width:0;flex:1;height:51px;min-height:32px;max-height:110px;resize:none;overflow-y:auto;margin-left:8px;padding:14px 17px;border:0;border-radius:22px;outline:0;color:#171819;background:#f8f8f8;text-align:center;font-size:16px;font-weight:400;line-height:1.4;user-select:text}.composer textarea::placeholder{color:#1d1e20;opacity:1}@media(max-width:600px){.composer textarea{height:42px;min-height:32px;margin-left:3px;padding:10px 8px;font-size:14px}}
.typing-row{display:flex;justify-content:flex-start;margin:4px 0 10px}.typing-row.me{justify-content:flex-end}.typing-bubble{height:34px;min-width:54px;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 13px;border-radius:20px;background:#e9e9eb}.typing-row.me .typing-bubble{background:#35a9ed}.typing-bubble i{width:6px;height:6px;border-radius:50%;background:#929397;animation:typing-bounce .9s ease-in-out infinite}.typing-row.me .typing-bubble i{background:#fff}.typing-bubble i:nth-child(2){animation-delay:.14s}.typing-bubble i:nth-child(3){animation-delay:.28s}@keyframes typing-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}@media(prefers-reduced-motion:reduce){.typing-bubble i{animation:none;opacity:.8}}
.reply-status{margin:0 20px 8px;color:#99918a;font-size:12px}.receive-button{width:34px;height:36px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#303134;background:transparent;cursor:pointer}.receive-button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}.receive-button:disabled{opacity:.35;cursor:not-allowed}.reply-error{color:#b46f66}
.acrylic-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:#24242438;backdrop-filter:blur(10px) saturate(1.15);-webkit-backdrop-filter:blur(10px) saturate(1.15)}
.message-menu-backdrop{position:fixed;inset:0;z-index:100;background:#00000008}.message-menu-group{position:fixed;z-index:1;width:280px;max-height:min(82dvh,480px);display:flex;flex-direction:column;gap:8px;transform-origin:var(--menu-origin-x) 0;animation:message-pop-in .2s cubic-bezier(.2,.8,.2,1) both}.reaction-picker{height:52px;flex:none;display:flex;align-items:center;justify-content:space-around;padding:0 8px;border-radius:28px;background:#fff;box-shadow:0 4px 18px #00000020}.reaction-picker button{width:38px;height:40px;padding:0;border:0;border-radius:50%;background:#fff;font-size:25px;cursor:pointer;transition:transform .15s}.reaction-picker button:active{transform:scale(1.22)}.message-action-sheet{overflow:auto;padding:6px 16px;border-radius:16px;background:#fff;box-shadow:0 4px 18px #00000020;color:#262626;scrollbar-width:thin}.message-action-title{margin:4px 0 8px;color:#8e8e93;text-align:left;font-size:13px}.message-action-sheet>button{width:100%;height:48px;display:flex;align-items:center;justify-content:space-between;padding:0;border:0;border-bottom:1px solid #ededed;background:#fff;color:#262626;text-align:left;font-size:16px;font-weight:400;cursor:pointer}.message-action-sheet>button:last-child{border:0}.message-action-sheet>button:active{color:#8e8e93}.message-action-sheet>button>span:last-child{color:#262626;font-size:18px}.message-action-sheet>button.message-delete-action,.message-action-sheet>button.message-delete-action>span:last-child{color:#ed4956}.message-action-sheet>button:disabled{opacity:.45}.message-action-sheet>button.message-cancel-action{height:46px;justify-content:center;margin-top:7px;border:0;border-radius:13px;font-weight:600}.message-edit-dialog{width:min(100%,440px);padding:18px;border:1px solid #ffffffc9;border-radius:28px;background:linear-gradient(145deg,#ffffffed,#f4f3f0e8);box-shadow:0 22px 70px #17171730;backdrop-filter:blur(28px) saturate(1.35);-webkit-backdrop-filter:blur(28px) saturate(1.35);color:#484744;animation:message-sheet-in .22s ease-out}.message-reaction{position:absolute;right:2px;bottom:-12px;z-index:1;min-width:27px;height:24px;display:grid;place-items:center;padding:0 5px;border:2px solid #fff;border-radius:14px;background:#fff;box-shadow:0 2px 8px #00000018;font-size:15px;line-height:1}.message-row.me .message-reaction{right:auto;left:2px}.message-reaction.character-reaction{animation:character-reaction-pop .42s cubic-bezier(.18,.89,.32,1.35) both;transform-origin:center}.message-edit-dialog{align-self:center}
.message-edit-dialog{align-self:center}.message-edit-dialog h3{margin:0 0 14px;font-size:16px;font-weight:600}.message-edit-dialog textarea{width:100%;resize:vertical;padding:12px;border:1px solid #e8e5df;border-radius:16px;outline:none;color:#4b4945;background:#ffffffc9;font:inherit;font-size:14px;line-height:1.5}.message-edit-dialog footer{display:flex;justify-content:flex-end;gap:9px;margin-top:14px}.message-edit-dialog footer button,.multi-delete-bar button{padding:9px 15px;border:0;border-radius:18px;color:#625f59;background:#eeece8;font-size:12px;cursor:pointer}.message-edit-dialog footer button:last-child{color:white;background:#8d9589}
.multi-delete-bar{position:fixed;inset:auto 16px calc(env(safe-area-inset-bottom) + 18px);z-index:90;display:flex;align-items:center;gap:10px;padding:11px 14px;border:1px solid #ffffffc9;border-radius:22px;background:#fffffff0;box-shadow:0 10px 35px #2222;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#67645f;font-size:12px}.multi-delete-bar span{flex:1}.multi-delete-bar button:disabled{opacity:.45}.multi-delete-bar button:first-of-type{color:#b66f66}
.message-row.message-selected .message-bubble{outline:2px solid #d0a59e;outline-offset:2px}.quoted-message{display:flex;flex-direction:column;gap:3px;margin:-2px 0 7px;padding:6px 9px;border-left:3px solid #99958e;border-radius:7px;background:#00000008;font-size:11px;line-height:1.35}.quoted-message strong{font-size:10px;font-weight:650;opacity:.78}.quoted-message>span{overflow:hidden;display:-webkit-box;opacity:.82;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}.message-row.me .quoted-message{border-left-color:#ffffffc9;background:#ffffff26}.composer-with-quote{height:auto;min-height:68px;flex-direction:column;align-items:stretch;gap:3px;padding:7px 9px}.quote-compose-preview{display:flex;align-items:center;gap:8px;padding:4px 8px 5px;border-radius:13px;background:#f3f3f2}.quote-compose-preview>span{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}.quote-compose-preview strong{color:#787873;font-size:10px;font-weight:600}.quote-compose-preview>span>span{overflow:hidden;color:#999994;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.quote-compose-preview button{width:23px;height:23px;border:0;border-radius:50%;color:#888;background:#e7e7e5;font-size:17px;line-height:1;cursor:pointer}.composer-input-row{width:100%;min-height:48px;display:flex;align-items:center;gap:4px;border:0;background:transparent}.composer-input-row textarea{margin-left:8px}.message-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);z-index:110;transform:translateX(-50%);padding:11px 18px;border:1px solid #ffffffc9;border-radius:22px;background:#ffffffed;box-shadow:0 8px 28px #2222;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#514f4a;font-size:12px;white-space:nowrap}
@keyframes character-reaction-pop{0%{opacity:0;transform:scale(.2) rotate(-18deg)}55%{opacity:1;transform:scale(1.35) rotate(6deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes message-pop-in{from{opacity:0;transform:scale(.72)}to{opacity:1;transform:scale(1)}}
@keyframes message-sheet-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.message-action-sheet{animation:none}}
@media(min-width:700px){.acrylic-overlay{align-items:center}}
.chat-app{background:#fff}
.chat-content{position:relative}
.topbar .back-button,.topbar .round-action{width:45px;height:45px;padding:0;border:0;border-radius:0;color:#44464a;background:transparent;box-shadow:none;filter:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.topbar .back-button:active,.topbar .round-action:active{background:transparent;box-shadow:none;transform:none}
.bottom-area{width:100%;margin:0;padding:0;background:transparent}
.bottom-nav{height:68px;overflow:visible;grid-template-columns:repeat(3,1fr);border:0;border-top:1px solid #e8eef3;border-radius:0;background:#f8fbff9c;box-shadow:none;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.bottom-nav button{height:100%;flex-direction:column;justify-content:center;gap:2px;padding:5px 0;color:#9a9fa8;font-size:10px;line-height:1.2;transition:color .2s}
.bottom-nav button svg{width:27px;height:27px;flex:none;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
.bottom-nav button.selected{color:#4d799e;background:transparent;box-shadow:none}

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
.config-3d-icon{width:auto;height:auto;position:relative;display:grid;place-items:center;flex:none;border:0;border-radius:0;background:transparent;box-shadow:none;text-shadow:none;filter:drop-shadow(0 5px 6px #758ca333)}
.config-3d-icon svg{width:43px;height:43px;overflow:visible;fill:url(#persona-glass);stroke:#ffffffb5;stroke-width:1.1;stroke-linecap:round;stroke-linejoin:round;paint-order:stroke;filter:drop-shadow(0 2px 1px #fff8) drop-shadow(0 5px 5px #829cc43d)}
.preset-3d-icon svg{fill:url(#preset-glass);filter:drop-shadow(0 2px 1px #fff8) drop-shadow(0 5px 5px #d9a56a3b)}

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
.config-tile-grid .config-group{min-height:145px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;margin:0;padding:18px 10px;border-radius:24px;color:#4d5054;text-align:center;cursor:pointer;transition:transform .18s,box-shadow .18s}
.config-tile-grid .config-group:active{transform:scale(.97);box-shadow:0 5px 16px #758ca312}
.config-tile-grid .config-group>strong{font-size:14px;font-weight:550}
.config-tile-grid .config-3d-icon svg{width:54px;height:54px}
.config-tile-grid .config-group:focus-visible{outline:2px solid #91c5a0;outline-offset:3px}
@media(max-width:600px){.config-page{padding-right:16px;padding-left:16px}.config-tile-grid{gap:11px}.config-tile-grid .config-group{min-height:132px}}
</style>
