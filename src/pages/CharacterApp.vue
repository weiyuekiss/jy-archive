<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Check, ChevronLeft, ImagePlus, Maximize2 } from 'lucide-vue-next'
import CharacterIcon from '@/components/icons/CharacterIcon.vue'
import PixelArtwork from '@/components/PixelArtwork.vue'
import PixelOrangeCat from '@/components/PixelOrangeCat.vue'
import MapRoomHouse from '@/components/MapRoomHouse.vue'
import AnimalAvatar from '@/components/AnimalAvatar.vue'
import AnimalFramePicker from '@/components/AnimalFramePicker.vue'
import PixelPortrait from '@/components/PixelPortrait.vue'
import HandheldControlIcon from '@/components/HandheldControlIcon.vue'
import { characterFrame } from '@/components/animalFrames'
import { loadValue, saveValue } from '@/stores/db'
import { phoneData } from '@/stores/phone'
import WorldPanel from '@/components/WorldPanel.vue'
import { generateCharacterBrief } from '@/components/pet/generateCharacterBrief'
import { worldData, loadWorlds, worldOf } from '@/stores/worlds'
import { apiSettings, getCurrentPreset } from '@/stores/settings'

// 世界面板与 AI 人设的状态
const worldPanelOpen = ref(false)
const briefBusy = ref(false)
const briefError = ref('')
let briefController = null

function openWorldPanel() {
  worldPanelOpen.value = true
}

// 角色所在的世界（编辑和新建页共用）
function worldNameOf(character) {
  return worldOf(character?.worldId)?.name || '无世界'
}

// 让 AI 根据世界观和基本信息写一段人设，填入当前草稿的设定框
async function writeBrief(draft) {
  if (!draft || briefBusy.value) return
  briefError.value = ''
  briefBusy.value = true
  briefController = new AbortController()
  try {
    const world = worldOf(draft.worldId)
    const preset = getCurrentPreset()
    // AI 基于完整设定写出摘要，填入「世界摘要」，不改动主设定
    draft.summary = await generateCharacterBrief({ preset, world, character: draft, signal: briefController.signal })
  } catch (error) {
    if (error.name !== 'AbortError') briefError.value = error.message
  } finally {
    briefBusy.value = false
    briefController = null
  }
}

function cancelBrief() {
  briefController?.abort()
}

// 世界面板里改了成员或世界，角色的 worldId 变化要保存到角色列表
function onWorldChanged() {
  // 世界被删除后，属于它的角色移出该世界（worldId 清空），不再指向已删除的世界
  const validIds = new Set(worldData.worlds.map((w) => w.id))
  for (const c of characters.value) {
    if (c.worldId && !validIds.has(c.worldId)) c.worldId = ''
  }
  // 地图列表同步：移除已删除世界的地图，并在需要时切换到仍存在的地图
  syncMapsWithWorlds()
  characters.value = [...characters.value]
  void persistMaps()
}

const emit = defineEmits(['close'])
const characters = ref([])
const builderStep = ref(0)
const view = ref('desk')
const posterCharacter = ref(null)
const editDraft = ref(null)
const selectedForTrash = ref(null)
const builderDraft = ref(null)
const expandedDetails = ref(false)
// 放大编辑弹窗绑定的草稿：档案页绑定 editDraft，新建页绑定 builderDraft
const detailsTarget = computed(() => (view.value === 'poster' ? editDraft.value : builderDraft.value))
// 贴纸墙：每张档案的位置（百分比，相对于墙面），拖动后保存到本机
const WALL_KEY = 'jyos_character_wall_positions'
const wallRef = ref(null)
const wallPositions = ref({})
// 多张地图：每张地图对应一个世界（worldId 为空表示无世界）。每张地图各自保存角色位置和便利贴。
const MAPS_KEY = 'jyos_character_maps'
const wallMaps = ref([{ id: 'map-default', name: '无世界', worldId: '' }])
const currentMapId = ref('map-default')
// 地图内容：{ [mapId]: { positions: { [characterId]: {x,y} }, stickers: [ {id,text,color,x,y,rot} ] } }
const wallMapData = ref({ 'map-default': { positions: {}, stickers: [] } })
function ensureMapData(mapId) {
  if (!wallMapData.value[mapId]) wallMapData.value[mapId] = { positions: {}, stickers: [] }
  return wallMapData.value[mapId]
}
const currentMap = computed(() => wallMaps.value.find((m) => m.id === currentMapId.value) || wallMaps.value[0])
const currentMapStickers = computed(() => ensureMapData(currentMapId.value).stickers)
// 桌面只显示属于当前地图（即当前世界）的角色
const mapCharacters = computed(() => characters.value.filter((c) => (c.worldId || '') === (currentMap.value?.worldId || '')))
// 当前地图中角色的位置（只读视图，写入仍走 wallPositions 的兼容路径）
const mapPositions = computed(() => ensureMapData(currentMapId.value).positions)
// 切换到某个世界对应的地图；没有地图时新建一张
function mapForWorld(worldId) {
  const existing = wallMaps.value.find((m) => m.worldId === (worldId || ''))
  if (existing) return existing.id
  const name = worldId ? (worldOf(worldId)?.name || '未命名世界') : '无世界'
  const map = { id: `map-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, worldId: worldId || '' }
  wallMaps.value = [...wallMaps.value, map]
  ensureMapData(map.id)
  return map.id
}
function switchMap(mapId) {
  if (!wallMaps.value.some((m) => m.id === mapId)) return
  currentMapId.value = mapId
  // 角色位置是按地图保存的，切换后要把当前地图的位置同步到拖动代码使用的 wallPositions
  wallPositions.value = { ...ensureMapData(mapId).positions }
  resetWallView()
}
// 每个世界都有一张地图，世界增删后同步地图列表
function syncMapsWithWorlds() {
  mapForWorld('')
  for (const world of worldData.worlds) mapForWorld(world.id)
  // 地图对应的世界已被删除：保留地图数据但不再作为可选地图
  const ids = new Set(['', ...worldData.worlds.map((w) => w.id)])
  wallMaps.value = wallMaps.value.filter((m) => ids.has(m.worldId))
  if (!wallMaps.value.some((m) => m.id === currentMapId.value)) switchMap(wallMaps.value[0].id)
}

// ===== 顶栏：地图菜单、重命名 =====
const mapMenuOpen = ref(false)
const mapRenameOpen = ref(false)
const mapRenameDraft = ref('')
function pickMap(mapId) {
  switchMap(mapId)
  mapMenuOpen.value = false
}
function mapCharacterCount(map) {
  return characters.value.filter((c) => (c.worldId || '') === (map.worldId || '')).length
}
function openMapRename() {
  mapRenameDraft.value = currentMap.value?.name || ''
  mapRenameOpen.value = true
}
async function saveMapRename() {
  const name = mapRenameDraft.value.trim().slice(0, 40)
  if (!name || !currentMap.value) return
  currentMap.value.name = name
  mapRenameOpen.value = false
  await persistMaps()
}

// ===== 贴纸（便利贴）=====
const stickerPanelOpen = ref(false)
const STICKER_COLORS = ['#fff3a3', '#ffd6e0', '#cdeffd', '#d9f5dc', '#ffe0b8', '#e8e0ff']
const stickerDraft = ref({ text: '', color: STICKER_COLORS[0] })
const stickerColors = STICKER_COLORS
function addSticker() {
  const text = stickerDraft.value.text.trim().slice(0, 80)
  if (!text) return
  const sticker = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    color: stickerDraft.value.color,
    x: 38 + Math.round(Math.random() * 16),
    y: 38 + Math.round(Math.random() * 16),
    rot: Math.round(Math.random() * 10) - 5,
  }
  ensureMapData(currentMapId.value).stickers.push(sticker)
  stickerDraft.value = { text: '', color: stickerDraft.value.color }
  void persistMaps()
}
function removeSticker(id) {
  const data = ensureMapData(currentMapId.value)
  data.stickers = data.stickers.filter((s) => s.id !== id)
  void persistMaps()
}
function updateStickerText(id, text) {
  const sticker = ensureMapData(currentMapId.value).stickers.find((s) => s.id === id)
  if (!sticker) return
  sticker.text = String(text || '').slice(0, 80)
  void persistMaps()
}
function updateStickerColor(id, color) {
  const sticker = ensureMapData(currentMapId.value).stickers.find((s) => s.id === id)
  if (!sticker) return
  sticker.color = color
  void persistMaps()
}
// 编辑便利贴：打开贴纸面板并预填内容，保存时更新
const editingNoteId = ref('')
function editNote(sticker) {
  editingNoteId.value = sticker.id
  stickerDraft.value = { text: sticker.text, color: sticker.color }
  stickerPanelOpen.value = true
}
function saveNoteEdit() {
  if (!editingNoteId.value) return
  const text = stickerDraft.value.text.trim()
  if (!text) return
  updateStickerText(editingNoteId.value, text)
  updateStickerColor(editingNoteId.value, stickerDraft.value.color)
  editingNoteId.value = ''
  stickerDraft.value = { text: '', color: STICKER_COLORS[0] }
  stickerPanelOpen.value = false
}
// 便利贴拖动：和角色拖动用同样的换算（相对画布的百分比，并考虑缩放）
const noteDrag = ref(null)
// 便签同样是长按拖动、点按编辑。按在便签自己的按钮上不处理，交给按钮的点击。
let notePressTimer = null
let notePressStart = null
function startNoteDrag(event, sticker) {
  if (event.target.closest('button')) return
  const board = wallRef.value
  if (!board) return
  event.currentTarget.setPointerCapture?.(event.pointerId)
  notePressStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, sticker }
  notePressTimer = setTimeout(() => {
    noteDrag.value = { id: sticker.id, startX: notePressStart.x, startY: notePressStart.y, origX: sticker.x, origY: sticker.y, rect: board.getBoundingClientRect(), zoom: wallZoom.value, moved: false }
    notePressStart = null
    if (navigator.vibrate) navigator.vibrate(10)
  }, LONG_PRESS_MS)
}
function cancelNotePress() {
  clearTimeout(notePressTimer)
  notePressTimer = null
  notePressStart = null
}
function trackNotePress(event) {
  if (!notePressStart || event.pointerId !== notePressStart.pointerId) return
  if (Math.abs(event.clientX - notePressStart.x) + Math.abs(event.clientY - notePressStart.y) > LONG_PRESS_SLOP) cancelNotePress()
}
function onNoteDrag(event) {
  trackNotePress(event)
  const drag = noteDrag.value
  if (!drag) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
  const scale = drag.zoom * WALL_BASE
  const x = Math.min(95, Math.max(0, drag.origX + (dx / drag.rect.width / scale) * 100))
  const y = Math.min(95, Math.max(0, drag.origY + (dy / drag.rect.height / scale) * 100))
  const sticker = ensureMapData(currentMapId.value).stickers.find((s) => s.id === drag.id)
  if (sticker) {
    sticker.x = x
    sticker.y = y
  }
}
function endNoteDrag() {
  // 仍在计时：是点按，打开编辑
  if (notePressTimer && notePressStart) {
    const sticker = notePressStart.sticker
    cancelNotePress()
    if (tiltMode.value) selectTiltTarget({ kind: 'note', id: sticker.id })
    else editNote(sticker)
    return
  }
  const drag = noteDrag.value
  noteDrag.value = null
  if (drag?.moved) void persistMaps()
}
function noteStyle(sticker) {
  return { left: `${sticker.x}%`, top: `${sticker.y}%`, background: sticker.color, transform: `rotate(${sticker.rot}deg)` }
}
// 旧格式（纯 { [characterId]: {x,y} }）迁移到默认地图，之后只写新格式
function migrateWallData(saved) {
  if (saved && Array.isArray(saved.maps)) {
    wallMaps.value = saved.maps
    wallMapData.value = saved.data && typeof saved.data === 'object' ? saved.data : {}
    for (const map of wallMaps.value) ensureMapData(map.id)
    return
  }
  if (saved && typeof saved === 'object') {
    wallMapData.value = { 'map-default': { positions: { ...saved }, stickers: [] } }
  }
}
async function persistMaps() {
  await saveValue(MAPS_KEY, JSON.parse(JSON.stringify({ maps: wallMaps.value, data: wallMapData.value })))
}
const dragging = ref(null)
const builderClues = [
  { key: 'name', title: '角色叫什么？', hint: '', label: '名字', placeholder: '输入角色名字' },
  { key: 'occupation', title: '他是谁？', hint: '', label: '身份', placeholder: '例如：夜班护士、流浪画家' },
  { key: 'gender', title: '如何称呼他？', hint: '', label: '称呼', placeholder: '自由填写' },
  { key: 'age', title: '他多大？', hint: '', label: '年龄', placeholder: '例如：二十多岁' },
  { key: 'birthday', title: '生日', hint: '', label: '生日', placeholder: '' },
  { key: 'details', title: '还有什么故事？', hint: '', label: '设定', placeholder: '性格、外貌、经历……' }
]
const activeBuilderClue = computed(() => builderClues[builderStep.value] || builderClues[0])
const builderCompletedCount = computed(() => builderClues.filter((clue) => String(builderDraft.value?.[clue.key] || '').trim()).length)
const now = ref(new Date())
const timeOfDay = computed(() => {
  const hour = now.value.getHours()
  if (hour >= 5 && hour < 8) return { key: 'dawn', label: '清晨' }
  if (hour >= 8 && hour < 17) return { key: 'day', label: '白天' }
  if (hour >= 17 && hour < 19) return { key: 'dusk', label: '黄昏' }
  return { key: 'night', label: '夜晚' }
})
let clockTimer = null
onMounted(() => {
  clockTimer = setInterval(() => { now.value = new Date() }, 60000)
})
onUnmounted(() => clearInterval(clockTimer))

let nextId = 1
// 已分配过的最大角色 id。角色被删除后也不回退，避免新角色继承旧角色的聊天记录（聊天按 id 保存）。
const ID_COUNTER_KEY = 'jyos_character_id_counter'

// 好友 ID：8 位大小写字母和数字，随机生成且不与已有角色重复，删除角色后也不会被新角色复用
const accountIdAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function randomAccountId(taken) {
  let id
  do {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    id = Array.from(bytes, (byte) => accountIdAlphabet[byte % accountIdAlphabet.length]).join('')
  } while (taken.has(id))
  taken.add(id)
  return id
}

onMounted(async () => {
  void loadWorlds()
  const draft = createDraft()
  builderDraft.value = draft
  try {
    const saved = await loadValue('jyos_characters')
    if (Array.isArray(saved)) {
      const homeData = await loadValue('jyos_archive_homes')
      const takenAccountIds = new Set(saved.map((character) => character.accountId).filter(Boolean))
      characters.value = saved.map(character => ({
        ...character,
        accountId: character.accountId || randomAccountId(takenAccountIds),
        avatarFrame: character.avatarFrame || homeData?.frames?.[character.id] || characterFrame(character)
      }))
      // 取「已保存的计数器」和「现存最大 id + 1」中较大的值：删除角色后 id 不会回退，也兼容没有计数器的旧数据
      const savedCounter = Number(await loadValue(ID_COUNTER_KEY)) || 0
      nextId = Math.max(savedCounter + 1, Math.max(0, ...saved.map((character) => Number(character.id) || 0)) + 1)
      if (draft.id < nextId) draft.id = nextId++
      void saveValue(ID_COUNTER_KEY, nextId - 1)
    }
    const savedMaps = await loadValue(MAPS_KEY)
    if (savedMaps && typeof savedMaps === 'object') {
      migrateWallData(savedMaps)
    } else {
      // 没有新格式数据：迁移旧的全局位置，并保留原来的键不动，作为回退
      const savedWall = await loadValue(WALL_KEY)
      migrateWallData(savedWall && typeof savedWall === 'object' ? savedWall : null)
    }
    // 每个世界对应一张地图；当前地图默认取无世界的地图，之后按世界切换
    syncMapsWithWorlds()
    // 把当前地图的角色位置同步到拖动代码使用的 wallPositions
    wallPositions.value = { ...ensureMapData(currentMapId.value).positions }
    const restored = await loadValue('jyos_character_builder_draft')
    if (restored && Number.isInteger(restored.id) && !characters.value.some((character) => character.id === restored.id)) {
      Object.assign(draft, restored)
      nextId = Math.max(nextId, restored.id + 1)
    }
  } catch (error) {
    console.error('加载角色数据失败', error)
  }
})
watch(characters, (value) => saveValue('jyos_characters', JSON.parse(JSON.stringify(value))), { deep: true })
watch(builderDraft, (value) => {
  if (value) void saveValue('jyos_character_builder_draft', JSON.parse(JSON.stringify(value)))
}, { deep: true })

function createDraft() {
  const id = nextId++
  void saveValue(ID_COUNTER_KEY, id)
  return { id,name: '', details: '', birthday: '', age: '', occupation: '', gender: '', language: '', avatar: '', avatarFrame: 'bunny', favorite: false, color: '#f1f1f1', worldId: '' }
}

function createCharacter() {
  const character = builderDraft.value
  if (!character?.name.trim()) return false
  const savedCharacter = JSON.parse(JSON.stringify(character))
  if (!savedCharacter.accountId) {
    savedCharacter.accountId = randomAccountId(new Set(characters.value.map((item) => item.accountId).filter(Boolean)))
  }
  characters.value.push(savedCharacter)
  posterCharacter.value = savedCharacter
  builderDraft.value = createDraft()
  return true
}

function openBuilder() {
  editDraft.value = null
  view.value = 'builder'
}

function openPoster(character) {
  posterCharacter.value = character
  editDraft.value = JSON.parse(JSON.stringify(character))
  view.value = 'poster'
}

function savePosterEdits() {
  if (!editDraft.value || !posterCharacter.value) return
  Object.assign(posterCharacter.value, JSON.parse(JSON.stringify(editDraft.value)))
  view.value = 'desk'
}

function returnToDesk() {
  selectedForTrash.value = null
  view.value = 'desk'
}

async function discardSelectedCharacter() {
  if (selectedForTrash.value === null) return
  const removedId = selectedForTrash.value
  characters.value = characters.value.filter((character) => character.id !== removedId)
  if (posterCharacter.value?.id === removedId) posterCharacter.value = null
  selectedForTrash.value = null
  view.value = 'desk'
  // 同步清理聊天相关数据：聊天记录与设置保留，但好友列表、删除记录与申请中该角色的条目一并移除
  await purgeCharacterChatRefs(removedId)
}

// 角色被删除后，清掉聊天列表中对它的引用（好友列表、删除记录、待处理申请）。
// 聊天记录与设置按需求保留；只有在该角色已不是好友时，删人物才会真正清干净。
async function purgeCharacterChatRefs(id) {
  const contacts = (await loadValue('jyos_chat_contacts')) || []
  if (Array.isArray(contacts) && contacts.includes(id)) await saveValue('jyos_chat_contacts', contacts.filter((item) => item !== id))
  const removedAt = (await loadValue('jyos_friend_removed_at')) || {}
  if (removedAt && typeof removedAt === 'object' && id in removedAt) {
    const next = { ...removedAt }
    delete next[id]
    await saveValue('jyos_friend_removed_at', next)
  }
  const requests = (await loadValue('jyos_friend_requests')) || []
  if (Array.isArray(requests)) await saveValue('jyos_friend_requests', requests.filter((item) => item?.characterId !== id))
  await purgeCharacterMoments(id)
  await purgeCharacterPhone(id)
}

// 手机数据按角色 id 保存（jyos_phone_data），删除角色时一并移除，避免新角色复用 id 后继承它的手机内容
async function purgeCharacterPhone(id) {
  const phoneData = await loadValue('jyos_phone_data')
  if (!phoneData || typeof phoneData !== 'object') return
  const key = String(id)
  // 同时清掉内存中的副本，避免之后的 persistPhoneData 把旧条目写回去
  delete phoneData[key]
  const saved = await loadValue('jyos_phone_data')
  if (!saved || typeof saved !== 'object' || !(key in saved)) return
  const next = { ...saved }
  delete next[key]
  await saveValue('jyos_phone_data', next)
}

// 朋友圈：删除该角色发布的动态，并移除它在其他动态下留下的点赞和评论（含回复）
async function purgeCharacterMoments(id) {
  const moments = await loadValue('jyos_moments')
  if (!moments || !Array.isArray(moments.posts)) return
  const isRemoved = (author) => author?.authorType === 'character' && author?.authorId === id
  const posts = moments.posts
    .filter((post) => !isRemoved(post))
    .map((post) => ({
      ...post,
      likes: Array.isArray(post.likes) ? post.likes.filter((like) => !(like?.authorType === 'character' && like?.id === id)) : post.likes,
      comments: Array.isArray(post.comments) ? post.comments.filter((comment) => !isRemoved(comment)) : post.comments,
    }))
  await saveValue('jyos_moments', { ...moments, posts })
}

function openClue(index) {
  if (!builderDraft.value) return
  builderStep.value = index
}

function finishBuilder() {
  if (createCharacter()) {
    editDraft.value = JSON.parse(JSON.stringify(posterCharacter.value))
    view.value = 'poster'
  }
  builderStep.value = 0
}

function closeBuilder() {
  emit('close')
}

// 第 n 张档案的默认位置：三列错落排列，略带偏移，避免整齐得像表格
function defaultWallSpot(index) {
  const col = index % 4
  const row = Math.floor(index / 4)
  return { x: 8 + col * 22 + ((index * 7) % 5) - 2, y: 10 + row * 24 + ((index * 3) % 4) }
}
function wallSpot(character, index) {
  return wallPositions.value[character.id] || defaultWallSpot(index)
}
// 每张贴纸有固定的轻微倾斜角度（由 id 决定），刷新后不会乱跳
// 设置某张角色贴纸在当前地图里的角度（-45 到 45 度），并保存
function setCharacterTilt(characterId, deg) {
  const data = ensureMapData(currentMapId.value)
  data.tilts = { ...(data.tilts || {}), [characterId]: Math.max(-45, Math.min(45, Math.round(deg))) }
  void persistMaps()
}
// 角色贴纸的倾斜：优先使用当前地图里用户调整过的角度，没有则按 id 算出固定值
function stickerTilt(character) {
  const saved = ensureMapData(currentMapId.value).tilts?.[character.id]
  if (Number.isFinite(Number(saved))) return Number(saved)
  return ((Number(character.id) || 1) * 37) % 13 - 6
}
function stickerStyle(character, index) {
  const spot = wallSpot(character, index)
  const active = dragging.value?.id === character.id
  return { left: `${spot.x}%`, top: `${spot.y}%`, rotate: `${stickerTilt(character)}deg`, zIndex: active ? 10 : 1 }
}
// 地图尺寸与缩放：WALL_BASE 为缩放 1 时地图相对墙面的倍数（比墙面大，因此可以平移），wallZoom 在此基础上再缩放
const WALL_BASE = 2.2
const WALL_MIN_ZOOM = 1
const WALL_MAX_ZOOM = 2.5
const wallZoom = ref(1)
const wallPan = ref({ x: 0, y: 0 })
function clampPan(pan, zoom) {
  const board = wallRef.value
  if (!board) return pan
  const scale = zoom * WALL_BASE
  const minX = board.clientWidth * (1 - scale)
  const minY = board.clientHeight * (1 - scale)
  return { x: Math.min(0, Math.max(minX, pan.x)), y: Math.min(0, Math.max(minY, pan.y)) }
}
function centeredPan(zoom) {
  const board = wallRef.value
  if (!board) return { x: 0, y: 0 }
  const scale = zoom * WALL_BASE
  return { x: (board.clientWidth * (1 - scale)) / 2, y: (board.clientHeight * (1 - scale)) / 2 }
}
function setWallZoom(next, anchor) {
  const board = wallRef.value
  const zoom = Math.min(WALL_MAX_ZOOM, Math.max(WALL_MIN_ZOOM, next))
  if (!board) { wallZoom.value = zoom; return }
  // 以锚点（屏幕坐标）为中心缩放，保持该点下方的内容位置不变
  const rect = board.getBoundingClientRect()
  const ax = anchor ? anchor.x - rect.left : board.clientWidth / 2
  const ay = anchor ? anchor.y - rect.top : board.clientHeight / 2
  const ratio = zoom / wallZoom.value
  wallPan.value = clampPan({ x: ax - (ax - wallPan.value.x) * ratio, y: ay - (ay - wallPan.value.y) * ratio }, zoom)
  wallZoom.value = zoom
}
function zoomWall(factor) { setWallZoom(wallZoom.value * factor) }
// 定位到内容：有角色照片或便签时，把它们的中心移到屏幕中央；没有内容才居中整张地图
function resetWallView() {
  wallZoom.value = WALL_MIN_ZOOM
  const board = wallRef.value
  const points = [
    ...mapCharacters.value.map((c, i) => wallSpot(c, i)),
    ...currentMapStickers.value.map((s) => ({ x: s.x, y: s.y })),
  ]
  if (!board || !points.length) {
    wallPan.value = centeredPan(WALL_MIN_ZOOM)
    return
  }
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  // 百分比是相对于墙面的 scale 倍（画布宽 = 墙面宽 × WALL_BASE × 缩放）
  const scale = WALL_MIN_ZOOM * WALL_BASE
  const x = board.clientWidth / 2 - (cx / 100) * board.clientWidth * scale
  const y = board.clientHeight / 2 - (cy / 100) * board.clientHeight * scale
  wallPan.value = clampPan({ x, y }, WALL_MIN_ZOOM)
}
// 每次回到贴纸墙时居中显示地图
watch(view, (value) => { if (value === 'desk') nextTick(resetWallView) }, { immediate: true })
function onWheelZoom(event) {
  if (event.ctrlKey || event.metaKey) {
    setWallZoom(wallZoom.value * Math.exp(-event.deltaY * 0.01), { x: event.clientX, y: event.clientY })
  } else {
    wallPan.value = clampPan({ x: wallPan.value.x - event.deltaX, y: wallPan.value.y - event.deltaY }, wallZoom.value)
  }
}

// 多点触控：两指同时按下时进入双指缩放，按两指距离变化缩放，中点移动时平移
const wallPointers = new Map()
let wallPinch = null
function pointDistance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
// 单指在空白处拖动时平移地图；按在贴纸上则由贴纸自己处理拖动
let wallPanStart = null
function onBoardPointerDown(event) {
  wallPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (wallPointers.size === 2) {
    // 两指时取消单指平移和贴纸拖动
    dragging.value = null
    wallPanStart = null
    const [a, b] = [...wallPointers.values()]
    wallPinch = { dist: pointDistance(a, b), zoom: wallZoom.value, pan: { ...wallPan.value }, mid: midpoint(a, b) }
  } else if (wallPointers.size === 1) {
    wallPanStart = { x: event.clientX, y: event.clientY, pan: { ...wallPan.value } }
  }
}
function onBoardPointerMove(event) {
  trackPress(event)
  if (wallPointers.has(event.pointerId)) wallPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (wallPinch && wallPointers.size >= 2) {
    const board = wallRef.value
    if (!board) return
    const [a, b] = [...wallPointers.values()]
    const rect = board.getBoundingClientRect()
    const zoom = Math.min(WALL_MAX_ZOOM, Math.max(WALL_MIN_ZOOM, wallPinch.zoom * pointDistance(a, b) / wallPinch.dist))
    const mid = midpoint(a, b)
    const ratio = zoom / wallPinch.zoom
    const ax = wallPinch.mid.x - rect.left
    const ay = wallPinch.mid.y - rect.top
    const pan = {
      x: ax - (ax - wallPinch.pan.x) * ratio + (mid.x - wallPinch.mid.x),
      y: ay - (ay - wallPinch.pan.y) * ratio + (mid.y - wallPinch.mid.y)
    }
    wallZoom.value = zoom
    wallPan.value = clampPan(pan, zoom)
    return
  }
  if (wallPanStart && wallPointers.size === 1 && !pressStart) {
    wallPan.value = clampPan({ x: wallPanStart.pan.x + (event.clientX - wallPanStart.x), y: wallPanStart.pan.y + (event.clientY - wallPanStart.y) }, wallZoom.value)
    return
  }
  onDrag(event)
}
function onBoardPointerUp(event) {
  wallPointers.delete(event.pointerId)
  if (wallPointers.size < 2) wallPinch = null
  if (wallPointers.size === 1) {
    // 双指松开一根后，剩下的手指继续平移
    const [remaining] = [...wallPointers.values()]
    wallPanStart = { x: remaining.x, y: remaining.y, pan: { ...wallPan.value } }
  } else {
    wallPanStart = null
  }
  if (dragging.value) endDrag(characters.value.find((c) => c.id === dragging.value.id))
  else if (pressStart && pressStart.pointerId === event.pointerId) releaseCharacterPress()
}
function onBoardPointerCancel(event) {
  wallPointers.delete(event.pointerId)
  wallPinch = null
  wallPanStart = null
  dragging.value = null
}

// 长按拖动：按下后要按住 LONG_PRESS_MS 才进入拖动；按住期间手指移动超过阈值则视为滑动，取消长按
const LONG_PRESS_MS = 350
const LONG_PRESS_SLOP = 8
let pressTimer = null
let pressStart = null
function cancelPress() {
  clearTimeout(pressTimer)
  pressTimer = null
  pressStart = null
}
function startDrag(event, character, index) {
  const board = wallRef.value
  if (!board) return
  const spot = wallSpot(character, index)
  event.currentTarget.setPointerCapture?.(event.pointerId)
  pressStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, character }
  pressTimer = setTimeout(() => {
    dragging.value = { id: character.id, startX: pressStart.x, startY: pressStart.y, origX: spot.x, origY: spot.y, rect: board.getBoundingClientRect(), zoom: wallZoom.value, moved: false }
    pressStart = null
    wallPanStart = null
    if (navigator.vibrate) navigator.vibrate(10)
  }, LONG_PRESS_MS)
}
// 按住期间的移动：超过阈值就取消长按，让手指变成平移画布
function trackPress(event) {
  if (!pressStart || event.pointerId !== pressStart.pointerId) return
  if (Math.abs(event.clientX - pressStart.x) + Math.abs(event.clientY - pressStart.y) > LONG_PRESS_SLOP) cancelPress()
}
// 松手时：长按还没触发（仍在计时）就是点按，直接打开档案；长按已进入拖动则交给 endDrag 处理
function releaseCharacterPress() {
  if (pressTimer && pressStart) {
    const character = pressStart.character
    cancelPress()
    if (tiltMode.value) selectTiltTarget({ kind: 'character', id: character.id })
    else openPoster(character)
  }
}

// ===== 角度调整模式 =====
// 进入后，点按贴纸选中它，底部出现滑块调整角度；再点顶栏按钮退出
const tiltMode = ref(false)
const tiltTarget = ref(null)
function toggleTiltMode() {
  tiltMode.value = !tiltMode.value
  tiltTarget.value = null
}
function selectTiltTarget(target) {
  tiltTarget.value = target
}
const tiltTargetValue = computed(() => {
  const t = tiltTarget.value
  if (!t) return 0
  if (t.kind === 'character') return stickerTilt(characters.value.find((c) => c.id === t.id) || { id: t.id })
  const sticker = currentMapStickers.value.find((s) => s.id === t.id)
  return sticker ? sticker.rot : 0
})
function onTiltInput(event) {
  const t = tiltTarget.value
  if (!t) return
  const deg = Number(event.target.value)
  if (t.kind === 'character') setCharacterTilt(t.id, deg)
  else {
    const sticker = currentMapStickers.value.find((s) => s.id === t.id)
    if (sticker) {
      sticker.rot = Math.max(-45, Math.min(45, Math.round(deg)))
      void persistMaps()
    }
  }
}
function onDrag(event) {
  const drag = dragging.value
  if (!drag) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true
  // 位置以墙面（未缩放）百分比保存，所以要除以当前缩放倍数
  // 贴纸位置是相对于地图画布的百分比，画布宽度 = 墙面宽度 × WALL_BASE × 缩放倍数
  const scale = drag.zoom * WALL_BASE
  const x = Math.min(95, Math.max(0, drag.origX + (dx / drag.rect.width / scale) * 100))
  const y = Math.min(95, Math.max(0, drag.origY + (dy / drag.rect.height / scale) * 100))
  wallPositions.value = { ...wallPositions.value, [drag.id]: { x, y } }
}
function endDrag(character) {
  const drag = dragging.value
  dragging.value = null
  if (!drag) return
  // 长按进入过拖动：位置写回当前地图并保存。长按后松手不打开档案，避免误开。
  if (drag.moved) {
    ensureMapData(currentMapId.value).positions = { ...wallPositions.value }
    void persistMaps()
  }
}

function selectDraftAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 800 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(image.width * scale)
      canvas.height = Math.round(image.height * scale)
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      if (editDraft.value) editDraft.value.avatar = canvas.toDataURL('image/jpeg', 0.85)
      else if (builderDraft.value) builderDraft.value.avatar = canvas.toDataURL('image/jpeg', 0.85)
    }
    image.src = reader.result
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="character-app">
    <section v-if="view === 'desk'" class="wall-page" aria-label="角色贴纸墙">
      <header class="wall-topbar" aria-label="地图顶栏">
        <button type="button" class="wall-map-switch" :aria-expanded="mapMenuOpen" aria-label="切换地图" @click="mapMenuOpen = !mapMenuOpen">
          <span class="wall-map-name">{{ currentMap?.name || '无世界' }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="wall-topbar-actions">
          <button type="button" class="wall-top-btn" aria-label="贴纸" title="贴纸" @click="stickerPanelOpen = true">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v5.5H20.5"/></svg>
          </button>
          <button type="button" class="wall-top-btn" :class="{ on: tiltMode }" aria-label="调整角度" title="调整角度" @click="toggleTiltMode"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="m7.8 7.8 2.1 2.1M14.1 14.1l2.1 2.1M7.8 16.2l2.1-2.1M14.1 9.9l2.1-2.1"/></svg></button>
          <button type="button" class="wall-top-btn" aria-label="编辑地图" title="编辑地图" @click="openMapRename">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
          </button>
        </div>
        <ul v-if="mapMenuOpen" class="wall-map-menu" role="listbox" aria-label="地图列表">
          <li v-for="map in wallMaps" :key="map.id" role="option" :aria-selected="map.id === currentMapId">
            <button type="button" :class="{ on: map.id === currentMapId }" @click="pickMap(map.id)">
              <span>{{ map.name }}</span>
              <small>{{ mapCharacterCount(map) }} 人</small>
            </button>
          </li>
        </ul>
      </header>
      <div ref="wallRef" class="wall-board" @wheel.prevent="onWheelZoom" @pointerdown="onBoardPointerDown" @pointermove="onBoardPointerMove" @pointerup="onBoardPointerUp" @pointercancel="onBoardPointerCancel">
        <div class="wall-canvas" :style="{ width: `${wallZoom * WALL_BASE * 100}%`, height: `${wallZoom * WALL_BASE * 100}%`, transform: `translate(${wallPan.x}px, ${wallPan.y}px)` }">
        <div
          v-for="sticker in currentMapStickers"
          :key="sticker.id"
          class="wall-note"
          :style="noteStyle(sticker)" @pointerdown="startNoteDrag($event, sticker)" @pointermove="onNoteDrag" @pointerup="endNoteDrag" @pointercancel="endNoteDrag"
          :aria-label="`便利贴：${sticker.text}`"
        >
          <span class="wall-note-text">{{ sticker.text }}</span>
          <div class="wall-note-actions">
            <button type="button" aria-label="编辑便利贴" @click.stop="editNote(sticker)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
            </button>
            <button type="button" aria-label="删除便利贴" @click.stop="removeSticker(sticker.id)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <p v-if="!characters.length" class="wall-empty">把第一张角色档案放到地图上吧。点击底部的「+ 新建」开始。</p>
        <button
          v-for="(character, index) in mapCharacters"
          :key="character.id"
          type="button"
          class="wall-sticker"
          :class="{ dragging: dragging?.id === character.id }"
          :style="stickerStyle(character, index)"
          :aria-label="`${character.name}，拖动可调整位置，点击打开档案`"
          @pointerdown.prevent="startDrag($event, character, index)" @contextmenu.prevent @dragstart.prevent
        >
          <span class="wall-no" aria-hidden="true">No.{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="wall-tape" :class="{ 'wall-tape-b': index % 2 === 1 }" aria-hidden="true"></span>
          <span class="wall-photo">
            <img v-if="character.avatar" :src="character.avatar" :alt="character.name" draggable="false" @contextmenu.prevent />
            <span v-else class="wall-initial">{{ (character.name || '？').slice(0, 1) }}</span>
          </span>
          <span class="wall-name">{{ character.name }}</span>
        </button>
        </div>
      </div>
      <div v-if="stickerPanelOpen" class="wall-sheet-mask" @click.self="stickerPanelOpen = false; editingNoteId = ''">
        <section class="wall-sheet" role="dialog" aria-modal="true" aria-label="贴纸">
          <header class="wall-sheet-head">
            <strong>{{ editingNoteId ? '编辑便利贴' : '贴纸' }}</strong>
            <button type="button" aria-label="关闭" @click="stickerPanelOpen = false; editingNoteId = ''">×</button>
          </header>
          <textarea v-model="stickerDraft.text" class="wall-sheet-input" rows="3" maxlength="80" placeholder="写点什么，比如：周末去海边"></textarea>
          <div class="wall-sheet-colors" role="radiogroup" aria-label="便利贴颜色">
            <button v-for="c in stickerColors" :key="c" type="button" role="radio" :aria-checked="stickerDraft.color === c" :aria-label="`颜色 ${c}`" class="wall-color" :class="{ on: stickerDraft.color === c }" :style="{ background: c }" @click="stickerDraft.color = c"></button>
          </div>
          <div class="wall-sheet-actions">
            <button v-if="!editingNoteId" type="button" class="wall-sheet-primary" :disabled="!stickerDraft.text.trim()" @click="addSticker">贴到地图上</button>
            <button v-else type="button" class="wall-sheet-primary" :disabled="!stickerDraft.text.trim()" @click="saveNoteEdit">保存</button>
          </div>
          <p class="wall-sheet-hint">便利贴贴在当前地图上，可以直接拖动位置。</p>
        </section>
      </div>
      <div v-if="mapRenameOpen" class="wall-sheet-mask wall-sheet-mask-center"@click.self="mapRenameOpen = false">
        <section class="wall-sheet wall-sheet-small" role="dialog" aria-modal="true" aria-label="重命名地图">
          <header class="wall-sheet-head"><strong>地图名称</strong><button type="button" aria-label="关闭" @click="mapRenameOpen = false">×</button></header>
          <input v-model="mapRenameDraft" class="wall-sheet-input-line" maxlength="40" placeholder="地图名称" />
          <div class="wall-sheet-actions">
            <button type="button" class="wall-sheet-primary" :disabled="!mapRenameDraft.trim()" @click="saveMapRename">保存</button>
          </div>
        </section>
      </div>
      <div v-if="tiltMode" class="wall-tilt-bar" role="group" aria-label="调整角度">
        <span class="wall-tilt-hint">{{ tiltTarget ? '拖动滑块调整角度' : '点一张贴纸或便利贴' }}</span>
        <input
          v-if="tiltTarget"
          type="range"
          min="-45"
          max="45"
          step="1"
          :value="tiltTargetValue"
          aria-label="角度"
          @input="onTiltInput"
        />
        <span v-if="tiltTarget" class="wall-tilt-value">{{ tiltTargetValue }}°</span>
        <button type="button" class="wall-tilt-done" @click="toggleTiltMode">完成</button>
      </div>
      <nav class="wall-float" aria-label="贴纸墙操作">
        <button type="button" class="wall-back" aria-label="返回桌面" @click="emit('close')">←</button>
        <span>{{ characters.length ? `${characters.length} 张档案` : '还没有角色' }}</span>
        <div class="wall-zoom" role="group" aria-label="地图缩放">
          <button type="button" aria-label="缩小" :disabled="wallZoom <= WALL_MIN_ZOOM" @click="zoomWall(1 / 1.25)">−</button>
          <button type="button" class="wall-zoom-reset" aria-label="重置缩放" @click="resetWallView">{{ Math.round(wallZoom * 100) }}%</button>
          <button type="button" aria-label="放大" :disabled="wallZoom >= WALL_MAX_ZOOM" @click="zoomWall(1.25)">+</button>
        </div>
        <button type="button" class="wall-add" aria-label="新建角色" @click="openBuilder">+</button>
        <button type="button" class="wall-world" aria-label="世界" @click="openWorldPanel">世界</button>
      </nav>
    </section>
    <section v-else-if="view === 'poster' && posterCharacter" class="pf-page nb-page" aria-label="角色档案">
      <button type="button" class="nb-close" aria-label="返回贴纸墙" @click="returnToDesk"><ChevronLeft :size="22" :stroke-width="1.8" /></button>
      <div v-if="editDraft" class="nb-file pf-file">
        <header class="nb-head">
          <div class="nb-head-text">
            <h1>ARCHIVE</h1>
            <p>角色档案 · 编辑</p>
          </div>
          <span class="nb-id">ID: {{ String(posterCharacter.id).padStart(4, '0') }}</span>
        </header>

        <div class="nb-top">
          <label class="nb-photo" :class="{ empty: !editDraft.avatar }">
            <img v-if="editDraft.avatar" :src="editDraft.avatar" :alt="editDraft.name || '角色照片'"/>
            <span v-else class="nb-photo-empty"><ImagePlus :size="26" :stroke-width="1.6" /><small>选择照片</small></span>
            <input type="file" accept="image/*" @change="selectDraftAvatar"/>
          </label>
          <div class="nb-top-fields">
            <label class="nb-field nb-field-name"><span>姓名</span><input v-model="editDraft.name" maxlength="80" placeholder="角色名字"/></label>
            <div class="nb-meta">
              <label class="nb-field"><span>身份</span><input v-model="editDraft.occupation" maxlength="80" placeholder="角色身份"/></label>
              <label class="nb-field"><span>所属世界</span>
                <select v-model="editDraft.worldId">
                  <option value="">无世界</option>
                  <option v-for="w in worldData.worlds" :key="w.id" :value="w.id">{{ w.name }}</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div class="nb-grid">
          <label class="nb-field"><span>称呼</span><input v-model="editDraft.gender" maxlength="40"/></label>
          <label class="nb-field"><span>年龄</span><input v-model="editDraft.age" maxlength="40" placeholder="年龄"/></label>
          <label class="nb-field nb-field-wide"><span>生日</span><input v-model="editDraft.birthday" type="date"/></label>
          <label class="nb-field nb-field-wide"><span>回复语言</span><input v-model="editDraft.language" maxlength="40" placeholder="例如：日语、英语、粤语（留空则跟随对话）"/></label>
        </div>

        <section class="nb-block">
          <div class="nb-block-head">
            <h2>设定</h2>
            <button type="button" class="nb-expand" aria-label="放大编辑设定" @click="expandedDetails = true"><Maximize2 :size="15" :stroke-width="1.8" /></button>
          </div>
          <textarea v-model="editDraft.details" rows="9" placeholder="性格、外貌、经历……（详细设定，只给角色自己看）"/>
        </section>

        <section class="nb-block">
          <div class="nb-block-head">
            <h2>世界摘要</h2>
            <button type="button" class="brief-btn nb-brief-btn" :disabled="briefBusy" @click="briefBusy ? cancelBrief() : writeBrief(editDraft)">{{ briefBusy ? '取消' : 'AI 生成' }}</button>
          </div>
          <p class="nb-hint">同一世界里认识 TA 的角色会看到这段简介，借此了解 TA 的基本情况。</p>
          <textarea v-model="editDraft.summary" rows="5" maxlength="400" placeholder="一两句话的简介。可以让 AI 根据设定写。"/>
          <span v-if="briefError" class="brief-error">{{ briefError }}</span>
        </section>

        <footer class="nb-foot">
          <template v-if="selectedForTrash !== posterCharacter.id">
            <button type="button" class="pf-delete" @click="selectedForTrash = posterCharacter.id">删除</button>
          </template>
          <template v-else>
            <span class="nb-foot-hint">删除后无法恢复</span>
            <button type="button" class="pf-delete pf-delete-confirm" @click="discardSelectedCharacter">确认</button>
            <button type="button" class="pf-delete" @click="selectedForTrash = null">取消</button>
          </template>
          <button type="button" class="nb-save" @click="savePosterEdits"><Check :size="15" :stroke-width="2" />保存</button>
        </footer>
      </div>
    </section>
    <transition name="builder-enter">
      <section v-if="view === 'builder' && builderDraft" class="nb-page" aria-label="新建角色">
        <button type="button" class="nb-close" aria-label="返回贴纸墙" @click="view = 'desk'"><ChevronLeft :size="22" :stroke-width="1.8" /></button>
        <div class="nb-file">
          <header class="nb-head">
            <div class="nb-head-text">
              <h1>NEW ARCHIVE</h1>
              <p>角色档案 · 新建</p>
            </div>
            <span class="nb-id">ID: {{ String(builderDraft.id).padStart(4, '0') }}</span>
          </header>

          <div class="nb-top">
            <label class="nb-photo" :class="{ empty: !builderDraft.avatar }">
              <img v-if="builderDraft.avatar" :src="builderDraft.avatar" :alt="builderDraft.name || '角色照片'"/>
              <span v-else class="nb-photo-empty"><ImagePlus :size="26" :stroke-width="1.6" /><small>选择照片</small></span>
              <input type="file" accept="image/*" @change="selectDraftAvatar"/>
            </label>
            <div class="nb-top-fields">
              <label class="nb-field nb-field-name"><span>姓名</span><input v-model="builderDraft.name" maxlength="80" placeholder="必填" autofocus/></label>
              <div class="nb-meta">
                <label class="nb-field"><span>身份</span><input v-model="builderDraft.occupation" maxlength="80" placeholder="例如：夜班护士"/></label>
                <label class="nb-field"><span>所属世界</span>
                  <select v-model="builderDraft.worldId">
                    <option value="">无世界</option>
                    <option v-for="w in worldData.worlds" :key="w.id" :value="w.id">{{ w.name }}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div class="nb-grid">
            <label class="nb-field"><span>称呼</span><input v-model="builderDraft.gender" maxlength="40"/></label>
            <label class="nb-field"><span>年龄</span><input v-model="builderDraft.age" maxlength="40" placeholder="二十多岁"/></label>
            <label class="nb-field nb-field-wide"><span>生日</span><input v-model="builderDraft.birthday" type="date"/></label>
            <label class="nb-field nb-field-wide"><span>回复语言</span><input v-model="builderDraft.language" maxlength="40" placeholder="例如：日语、英语、粤语（留空则跟随对话）"/></label>
          </div>

          <section class="nb-block">
            <div class="nb-block-head">
              <h2>设定</h2>
              <button type="button" class="nb-expand" aria-label="放大编辑设定" @click="expandedDetails = true"><Maximize2 :size="15" :stroke-width="1.8" /></button>
            </div>
            <textarea v-model="builderDraft.details" rows="9"placeholder="性格、外貌、经历……（详细设定，只给角色自己看）"/>
          </section>

          <section class="nb-block">
            <div class="nb-block-head">
              <h2>世界摘要</h2>
              <button type="button" class="brief-btn nb-brief-btn" :disabled="briefBusy" @click="briefBusy ? cancelBrief() : writeBrief(builderDraft)">{{ briefBusy ? '取消' : 'AI 生成' }}</button>
            </div>
            <p class="nb-hint">同一世界里认识 TA 的角色会看到这段简介，借此了解 TA 的基本情况。</p>
            <textarea v-model="builderDraft.summary" rows="5"maxlength="400" placeholder="一两句话的简介。可以让 AI 根据设定写。"/>
            <span v-if="briefError" class="brief-error">{{ briefError }}</span>
          </section>

          <footer class="nb-foot">
            <span class="nb-foot-hint">{{ builderDraft.name.trim() ? '' : '填写姓名后可保存' }}</span>
            <button type="button" class="nb-save" :disabled="!builderDraft.name.trim()" @click="finishBuilder"><Check :size="15" :stroke-width="2" />保存</button>
          </footer>
        </div>
      </section>
    </transition>
    <div v-if="expandedDetails && detailsTarget && (view === 'builder' || view === 'poster')" class="nb-modal" @click.self="expandedDetails = false" @keydown.esc="expandedDetails = false">
      <section class="nb-modal-card" role="dialog" aria-modal="true" aria-labelledby="nb-modal-title">
        <header><span class="nb-kicker">06 · DOSSIER</span><h2 id="nb-modal-title">还有什么故事？</h2></header>
        <textarea v-model="detailsTarget.details" autofocus placeholder="写下角色的性格、外貌、经历和故事……"/>
        <footer><button type="button" class="nb-save" @click="expandedDetails = false">完成</button></footer>
      </section>
    </div>
  </div>
  <WorldPanel v-if="worldPanelOpen" :characters="characters" @close="worldPanelOpen = false" @changed="onWorldChanged" />
</template>

<style>

/* 仅统一人物应用的字体，包含子组件、弹窗及表单控件。 */
.character-app,
.character-app * {
  font-family: "Unifont", "Microsoft YaHei", "PingFang SC", sans-serif !important;
  font-weight: normal !important;
}
</style>

<style scoped>
.map-ledger{position:absolute;top:12px;right:12px;z-index:2;display:grid;gap:4px;min-width:112px;padding:7px 9px;border:1px solid #ae9ac5;background:#fffafd;color:#7d5a8f;font-size:11px;line-height:1.5;pointer-events:none}
.map-ledger b{color:#9b6a8e;font-weight:600}
.map-console.time-dawn{background:#fdf1f6}
.map-console.time-dusk{background:#fbe9e1}
.map-console.time-dusk .pixel-world{background:#f6ddd6}
.map-console.time-night{background:#2a2440}
.map-console.time-night .pixel-world{background:#312a4d}
.map-console.time-night .map-status{background:#3b3360;color:#ece4f7}
.map-console.time-night .map-ledger{background:#2f2848;border-color:#6d5b8f;color:#d7c9ee}
.map-console.time-night .map-ledger b{color:#f2c9e4}
.pocket-back-home{justify-self:start;display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:6px 10px;white-space:nowrap;font-size:11px;cursor:pointer;transition:background .15s,transform .15s,box-shadow .15s}
.pocket-back-home span{font-size:18px;line-height:1}
.pocket-back-home:hover{background:#ffe5f0}
.pocket-back-home:active{transform:translateY(2px);box-shadow:0 1px 0 #e5bfd1}
.pocket-back-home:focus-visible,.map-search .map-mood-message:focus-visible{outline:2px solid #9b79b5;outline-offset:3px}
.map-search.map-mood{height:auto;min-height:42px;padding-top:6px;padding-bottom:6px}
.map-search.map-mood>button:last-child{flex-shrink:0}
.map-search .map-mood-message{flex:1;min-width:0;padding:3px 0;border:0;color:#9b6a8e;background:transparent;box-shadow:none;text-align:left;font-size:11px;line-height:1.7;overflow-wrap:anywhere;cursor:pointer}
@media(max-width:420px){.pocket-back-home{gap:3px;padding:6px;font-size:10px}.pocket-back-home span{font-size:16px}}
.character-app{z-index:20;display:flex;flex-direction:column;overflow:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);background:#fff}
button,input{font:inherit}.masthead{height:57px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;padding:0 20px;border-bottom:1px solid var(--line);background:#fff}.back{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;cursor:pointer}.back svg{width:20px;fill:none;stroke:#55534d;stroke-width:1.8}.issue{text-align:center;color:#8f8b81;font-family:Georgia,serif;font-size:9px;letter-spacing:.2em}.issue span{padding:0 6px;color:#c0bdb3}.header-mark{justify-self:end;color:#979486;font-size:17px}.content{width:min(100%,620px);flex:1;min-height:0;overflow:auto;margin:0 auto;padding:12px 23px 25px;scrollbar-width:thin;scrollbar-color:#dedbd4 transparent}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:17px 0}.filters{display:flex;gap:6px}.filters button{padding:6px 10px;border:1px solid transparent;border-radius:20px;color:#9b978d;background:transparent;font-size:10px;cursor:pointer}.filters button.active{border-color:#e7e4dc;color:#59574f;background:#fff}.add-button{height:31px;padding:0 11px;border:1px solid #e5e2da;border-radius:6px;color:#69665d;background:#fff;font-size:10px;cursor:pointer}.add-button span{padding-right:4px;font-size:13px}.empty-state{min-height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px 8px 28px;text-align:center}.empty-art{width:154px;height:130px;position:relative;display:grid;place-items:center;margin-bottom:14px}.orbit{position:absolute;display:block;border:1px solid #e8e5dd;border-radius:50%;transform:rotate(-24deg)}.orbit-one{width:139px;height:78px}.orbit-two{width:104px;height:120px;transform:rotate(28deg);border-color:#efede7}.empty-glyph{width:71px;height:71px;display:grid;place-items:center;border:1px solid #e8e5dd;border-radius:24px;background:linear-gradient(145deg,#fff,#f2f0e9);box-shadow:0 9px 28px #554d3610;transform:rotate(-5deg)}.empty-glyph :deep(svg){width:56px;height:56px}.spark{position:absolute;color:#b1aa96}.spark-one{top:16px;right:22px;font-size:15px}.spark-two{bottom:14px;left:25px;font-size:24px}.empty-kicker{color:#b0ab9f;font-size:8px;letter-spacing:.2em}.empty-state h2{margin:11px 0 7px;font-family:Georgia,"PingFang SC",serif;font-size:18px;font-weight:500;letter-spacing:.08em}.empty-state p{margin:0;color:#a29e94;font-size:10px;line-height:1.8}.empty-create{margin-top:19px;padding:8px 13px;border:1px solid #e7e4dc;border-radius:6px;color:#68655c;background:#fff;font-size:10px;cursor:pointer}.empty-create span{padding-left:9px;color:#a6a292}.archive-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 15px;padding:3px 0 32px}.character-card{min-width:0}.portrait{height:180px;position:relative;display:grid;place-items:center;overflow:hidden;border:1px solid #e9e6de;border-radius:3px;background:radial-gradient(ellipse at 50% 35%,#fff9 0,transparent 55%),var(--portrait)}.portrait:after{position:absolute;inset:9px;content:'';border:1px solid #ffffff88;pointer-events:none}.portrait :deep(svg){width:79px;height:79px;opacity:.72}.portrait-avatar{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 35%}.portrait-avatar~.folio,.portrait-avatar~.portrait-caption{z-index:2;color:#fff;text-shadow:0 1px 5px #0008}.portrait-avatar~.portrait-caption{padding:20px 9px 8px;right:10px;left:10px;background:linear-gradient(transparent,#0005)}.folio,.portrait-caption{position:absolute;z-index:1;color:#716e65;font-family:Georgia,serif;font-size:8px;letter-spacing:.15em}.folio{top:17px;left:17px}.portrait-caption{bottom:17px;left:17px;font-size:7px}.card-meta{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;padding:10px 1px}.card-meta h2{margin:0;color:#4b4942;font-family:Georgia,"PingFang SC",serif;font-size:14px;font-weight:500}.card-meta p{margin:4px 0 0;color:#a09c91;font-size:9px}.status{padding:4px 6px;border:1px solid #eae7df;border-radius:10px;color:#969185;font-size:8px}.page-footer{display:flex;align-items:center;justify-content:center;gap:9px;padding:17px 0 2px;border-top:1px solid var(--line);color:#aaa69c;font-family:Georgia,serif;font-size:8px;letter-spacing:.1em}.page-footer i{width:3px;height:3px;border-radius:50%;background:#c4bfae}.modal-backdrop{position:fixed;inset:0;z-index:40;display:grid;place-items:center;padding:22px;background:#25272a24;backdrop-filter:blur(5px)}.create-modal{width:min(100%,360px);position:relative;padding:30px 25px 23px;border:1px solid #eee;border-radius:15px;background:#fff;box-shadow:none;text-align:center}.modal-close{position:absolute;top:12px;right:14px;width:28px;height:28px;border:0;border-radius:50%;color:#888;background:#f1f1f1;font-size:20px;cursor:pointer}.modal-kicker{color:#999;font-size:8px;font-weight:600;letter-spacing:.19em}.create-modal h2{margin:10px 0 7px;font-family:Georgia,"PingFang SC",serif;font-size:20px;font-weight:500}.create-modal p{margin:0 0 18px;color:#888;font-size:11px}.create-modal input{width:100%;height:42px;padding:0 12px;border:1px solid #e2e2e2;border-radius:7px;outline:none;color:var(--ink);background:#fff;font-size:12px}.create-modal input:focus{border-color:#bfc1c4}.modal-actions{display:flex;gap:9px;margin-top:16px}.modal-actions button{flex:1;height:37px;border:0;border-radius:7px;font-size:11px;cursor:pointer}.cancel{color:#555;background:#eee}.confirm{color:#444;background:#e5e5e5;box-shadow:none}.confirm:disabled{opacity:.55;cursor:default}.fade-enter-active,.fade-leave-active{transition:opacity .18s}.fade-enter-from,.fade-leave-to{opacity:0}@media(max-width:420px){.content{padding:20px 19px 22px}.portrait{height:160px}}

.profile-backdrop{position:fixed;inset:0;z-index:45;display:grid;place-items:center;padding:clamp(12px,3vw,30px);overflow:auto;background:rgba(45,47,50,.28);backdrop-filter:blur(8px)}.profile-sheet{width:min(100%,760px);max-height:min(92vh,900px);position:relative;overflow:auto;padding:clamp(18px,4vw,34px);border:1px solid #eee;background:#fff;box-shadow:none;transform-origin:center;scrollbar-width:thin;scrollbar-color:#dedede transparent}.profile-sheet:before{position:absolute;inset:8px;content:'';border:1px solid #e9e6df;pointer-events:none}.sheet-close{position:absolute;z-index:2;top:17px;right:17px;width:30px;height:30px;border:1px solid #e8e5de;border-radius:50%;color:#88847b;background:#faf9f6;font-size:20px;cursor:pointer}.sheet-topline,.sheet-footer{position:relative;display:flex;justify-content:space-between;gap:10px;color:#aaa69c;font-family:Georgia,serif;font-size:8px;letter-spacing:.16em}.sheet-topline{padding:1px 0 15px;border-bottom:1px solid #e8e5dd}.sheet-layout{position:relative;display:grid;grid-template-columns:minmax(170px,.78fr) minmax(0,1.22fr);gap:clamp(18px,4vw,36px);padding:22px 0}.sheet-portrait{min-height:350px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #e8e5dc;background:radial-gradient(ellipse at 50% 34%,#fff9,transparent 56%),var(--portrait)}.sheet-portrait:after{position:absolute;inset:10px;content:'';border:1px solid #ffffff99;pointer-events:none}.sheet-portrait>img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.sheet-portrait :deep(svg){width:92px;height:92px;opacity:.66}.avatar-change{position:absolute;z-index:1;bottom:36px;padding:7px 12px;border:1px solid #ffffffc7;border-radius:20px;color:#5d5a51;background:#ffffffb8;font-size:9px;cursor:pointer;backdrop-filter:blur(6px)}.avatar-change input{display:none}.portrait-label{position:absolute;z-index:1;bottom:15px;left:13px;color:#77736b;font-family:Georgia,serif;font-size:7px;letter-spacing:.13em}.sheet-fields{min-width:0}.sheet-kicker{display:block;margin:1px 0 16px;color:#aaa69d;font-size:8px;letter-spacing:.16em}.field{min-width:0;display:flex;flex-direction:column;gap:6px;margin-bottom:13px}.field>span{display:flex;align-items:center;gap:8px;color:#706d64;font-size:10px}.field>span i{color:#b6b1a5;font-family:Georgia,serif;font-size:7px;font-style:normal;letter-spacing:.12em}.field input,.field textarea{width:100%;min-width:0;padding:9px 10px;border:1px solid #e8e5de;border-radius:4px;outline:none;color:#494740;background:#fffdfb;font-size:11px}.field input:focus,.field textarea:focus{border-color:#c2bcad}.field textarea{resize:vertical;line-height:1.7}.field small{align-self:flex-end;color:#aaa69d;font-size:8px}.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sheet-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:5px}.sheet-actions button{min-height:36px;padding:0 14px;border-radius:4px;font-size:10px;letter-spacing:.04em;cursor:pointer;transition:background .18s,border-color .18s,color .18s}.delete-character{border:1px solid #e8e2dc;color:#a17d74;background:transparent}.delete-character:hover{border-color:#c9aaa2;background:#fff8f6}.save-character{border:1px solid #858477;color:#fff;background:#858477}.save-character:hover{border-color:#706f62;background:#706f62}.save-character span{padding-left:9px}.delete-confirm{margin:12px 0;padding:13px;border:1px solid #e2e2e2;border-radius:5px;background:#fff}.delete-kicker{color:#888;font-size:7px;letter-spacing:.14em}.delete-confirm p{margin:8px 0 12px;color:#555;font-size:10px;line-height:1.6}.delete-confirm>div{display:flex;justify-content:flex-end;gap:8px}.delete-confirm button{padding:7px 10px;border:1px solid #ddd;border-radius:4px;font-size:9px;cursor:pointer}.keep-character{color:#555;background:#eee}.delete-confirm .confirm-delete{border-color:#ddd;color:#444;background:#e5e5e5;box-shadow:none}
@media(max-width:560px){.profile-backdrop{padding:9px}.profile-sheet{max-height:96vh;padding:20px 16px}.sheet-layout{grid-template-columns:1fr;gap:16px;padding:17px 0}.sheet-portrait{min-height:170px;max-height:220px}.sheet-portrait>img{object-position:center 35%}.sheet-portrait :deep(svg){width:70px;height:70px}.sheet-kicker{margin-bottom:12px}.field-row{gap:8px}.sheet-topline{font-size:7px}}
.details-editor{position:relative}.details-editor textarea{padding-right:36px}.expand-details{width:27px;height:27px;position:absolute;right:4px;bottom:7px;display:grid;place-items:center;border:0;border-radius:4px;color:#656565;background:transparent;cursor:pointer}.expand-details:hover{background:#f2f2f2}.expand-details svg,.details-modal-card header button svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.details-modal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:20px;box-sizing:border-box}.details-modal-card{width:min(100%,760px);height:min(78vh,680px);display:flex;flex-direction:column;box-sizing:border-box;padding:24px}.details-modal-card header{display:flex;align-items:center;justify-content:space-between;padding-bottom:16px}.details-modal-card header h2{margin:0;font-size:18px}.details-modal-card header button{width:34px;height:34px;display:grid;place-items:center;color:#666;cursor:pointer}.details-modal-card header button:hover{background:#f3f3f3}.details-modal-card>textarea{width:100%;flex:1;min-height:0;box-sizing:border-box;padding:18px;outline:none;font:inherit;font-size:15px;line-height:1.9;resize:none}.details-modal-card footer{display:flex;justify-content:flex-end;padding-top:16px}.details-modal-card footer button{min-width:80px;height:38px;font:inherit;cursor:pointer}@media(max-width:600px){.details-modal{padding:12px}.details-modal-card{height:min(82vh,680px);padding:18px;border-radius:10px}.details-modal-card>textarea{padding:13px;font-size:14px}}
.builder-workspace{inset:0;z-index:42;display:flex;flex-direction:column;overflow:auto;padding:env(safe-area-inset-top) clamp(20px,5vw,72px) env(safe-area-inset-bottom);box-sizing:border-box}.builder-header{flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.builder-header>span,.builder-footer{font-size:9px;letter-spacing:.16em}.builder-header>span{text-align:center}.builder-back,.builder-finish{border:0;background:none;font-size:12px;cursor:pointer}.builder-back{justify-self:start;font-size:18px}.builder-finish{justify-self:end}.builder-finish b{padding-left:7px;font-weight:400}.builder-main{width:min(100%,1120px);flex:1;min-height:600px;display:grid;grid-template-columns:minmax(210px,.72fr) minmax(0,1.5fr);gap:5vw;align-items:center;margin:0 auto}.builder-rail{max-width:260px}.builder-overline{color:#999;font-size:9px;letter-spacing:.2em}.builder-rail h1{margin:18px 0 14px;font-family:Georgia,"PingFang SC",serif;font-size:clamp(27px,4vw,43px);font-weight:400;line-height:1.45;letter-spacing:.04em}.builder-rail>p{max-width:220px;margin:0;color:#888;font-size:12px;line-height:1.9}.builder-progress{margin-top:54px}.builder-progress>span,.builder-progress>strong{display:block;color:#777;font-size:10px}.builder-progress>strong{margin:7px 0 10px;color:#222;font-family:Georgia,serif;font-size:23px;font-weight:400}.builder-progress>strong i{color:#aaa;font-size:13px;font-style:normal}.builder-progress>div{height:2px;background:#eee}.builder-progress>div i{height:100%;display:block;background:#222;transition:width .3s}.builder-legend{display:flex;flex-direction:column;gap:9px;margin-top:18px;color:#999;font-size:9px}.builder-legend span{display:flex;align-items:center;gap:8px}.builder-legend i{width:6px;height:6px;border:1px solid #bbb;border-radius:50%}.builder-legend i.legend-active{border-color:#222;background:#222}.builder-canvas{height:min(72vh,640px);min-height:560px;position:relative;display:grid;place-items:center;overflow:hidden;background:radial-gradient(ellipse at center,#fafafa 0%,#fff 64%)}.builder-orbit{position:absolute;border:1px solid #e9e9e9;border-radius:50%;pointer-events:none}.orbit-a{width:min(74%,480px);aspect-ratio:1}.orbit-b{width:min(58%,370px);aspect-ratio:1;border-style:dashed;border-color:#eee}.builder-poster-preview{width:clamp(155px,22vw,230px);height:clamp(230px,34vw,340px);position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border:1px solid #dedede;background:linear-gradient(150deg,#fff,#f4f4f4);box-shadow:0 15px 50px #0000000a;transition:transform .3s}.builder-poster-preview:before{position:absolute;inset:8px;content:"";border:1px solid #e8e8e8}.builder-poster-preview>svg{width:68px;height:68px;opacity:.52}.builder-poster-preview img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(1)}.builder-poster-preview>span,.builder-poster-preview>strong,.builder-poster-preview>small{z-index:1}.builder-poster-preview>span{margin-top:12px;color:#999;font-family:Georgia,serif;font-size:7px;letter-spacing:.16em}.builder-poster-preview>strong{margin-top:10px;color:#222;font-family:Georgia,"PingFang SC",serif;font-size:20px;font-weight:400}.builder-poster-preview>small{margin-top:5px;color:#888;font-size:9px}.clue-node{position:absolute;z-index:2;display:flex;align-items:center;gap:9px;padding:0;border:0;background:transparent;text-align:left;cursor:pointer}.clue-node>i{width:11px;height:11px;flex:none;border:1px solid #9c9c9c;border-radius:50%;background:#fff;transition:transform .2s,background .2s,border .2s,box-shadow .2s}.clue-node>span{min-width:0;display:flex;flex-direction:column;gap:4px;opacity:.65;transition:opacity .2s}.clue-node small{color:#999;font-size:8px;letter-spacing:.12em}.clue-node strong{max-width:135px;overflow:hidden;color:#333;font-size:10px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.clue-node.active>i{border-color:#111;background:#111;box-shadow:0 0 0 5px #1111;transform:scale(1.08)}.clue-node.complete>i{border-color:#222;background:#222;box-shadow:inset 0 0 0 3px #fff}.clue-node.active>span,.clue-node.complete>span{opacity:1}.node-1{top:13%;left:12%}.node-2{top:21%;right:8%;flex-direction:row-reverse;text-align:right}.node-3{top:48%;right:4%;flex-direction:row-reverse;text-align:right}.node-4{right:14%;bottom:13%;flex-direction:row-reverse;text-align:right}.node-5{bottom:19%;left:5%}.builder-editor{width:min(250px,45%);position:absolute;z-index:3;right:4%;top:40%;padding:16px;background:#fff;border:1px solid #ededed;box-shadow:0 10px 35px #00000008;animation:clue-reveal .22s ease-out}.builder-editor>span{color:#999;font-size:8px;letter-spacing:.12em}.builder-editor>span i{padding:0 4px;color:#ccc;font-style:normal}.builder-editor h2{margin:10px 0 5px;color:#222;font-family:Georgia,"PingFang SC",serif;font-size:16px;font-weight:400}.builder-editor>p{margin:0 0 12px;color:#999;font-size:9px;line-height:1.6}.builder-editor input,.builder-editor textarea{width:100%;min-height:34px;box-sizing:border-box;resize:vertical;padding:8px;border:0;border-bottom:1px solid #ddd;border-radius:0;outline:0;color:#222;background:#fff;font:inherit;font-size:11px}.builder-editor footer{display:flex;justify-content:space-between;gap:8px;margin-top:12px}.builder-editor footer button{padding:5px 0;border:0;color:#888;background:transparent;font-size:9px;cursor:pointer}.builder-editor footer button:last-child{color:#222}.builder-editor footer button:disabled{opacity:.35}.builder-footer{width:min(100%,1120px);display:flex;justify-content:flex-end;gap:12px;margin:0 auto;padding:14px 0;font-size:8px}.builder-footer button{min-height:36px;padding:0 16px;font-size:11px;cursor:pointer;transition:background .18s,border-color .18s}.builder-footer button:focus-visible{outline:2px solid #777;outline-offset:3px}.builder-enter-enter-active,.builder-enter-leave-active{transition:opacity .25s,transform .25s}.builder-enter-enter-from,.builder-enter-leave-to{opacity:0;transform:translateY(8px)}@keyframes clue-reveal{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}@media(max-width:700px){.builder-workspace{padding-right:20px;padding-left:20px}.builder-main{min-height:0;grid-template-columns:1fr;gap:4px;align-content:start;padding:25px 0}.builder-rail{max-width:none}.builder-rail h1{margin:9px 0 7px;font-size:27px}.builder-rail>p{max-width:330px;font-size:10px}.builder-progress{position:absolute;top:74px;right:20px;margin:0;text-align:right}.builder-progress>span{font-size:8px}.builder-progress>strong{margin:4px 0 0;font-size:18px}.builder-progress>div,.builder-legend{display:none}.builder-canvas{width:100%;height:min(61vh,570px);min-height:440px;margin-top:4px}.builder-poster-preview{width:clamp(140px,43vw,205px);height:clamp(210px,62vw,300px)}.orbit-a{width:min(80%,390px)}.orbit-b{width:min(62%,310px)}.node-1{top:8%;left:2%}.node-2{top:18%;right:1%}.node-3{top:45%;right:0}.node-4{right:7%;bottom:8%}.node-5{bottom:13%;left:0}.clue-node strong{max-width:100px;font-size:9px}.builder-editor{width:min(230px,67%);top:37%;right:2%;padding:12px}.builder-footer{font-size:7px}}
.folder-open{width:min(100%,900px);position:relative;margin:clamp(34px,8vh,76px) auto 36px;padding:0 14px 14px;box-sizing:border-box;filter:drop-shadow(0 20px 25px #00000016)}.folder-cover{height:56px;position:absolute;z-index:0;top:-34px;left:10px;width:min(42%,330px);display:flex;align-items:center;gap:18px;padding:0 20px;box-sizing:border-box;font-size:13px}.folder-cover i{width:35px;height:4px;border-radius:4px;background:#d0d0d0}.folder-pocket{min-height:440px;position:relative;z-index:1;padding:24px 20px 20px}.folder-pocket:before{position:absolute;content:"";pointer-events:none}.folder-tab{width:min(230px,58%);height:34px;position:absolute;z-index:2;top:-1px;left:25px;display:flex;align-items:center;padding:0 14px;box-sizing:border-box;font-size:11px}.folder-document{min-height:385px;position:relative;z-index:1;display:grid;grid-template-columns:minmax(170px,.68fr) minmax(0,1.32fr);gap:clamp(20px,4vw,42px);margin:15px 8px 0;padding:clamp(18px,3vw,30px);box-sizing:border-box}.folder-portrait{min-height:270px;position:relative;display:grid;place-items:center;overflow:hidden}.folder-portrait>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.folder-portrait>svg{width:75px;height:75px;opacity:.45}.folder-avatar-change{position:absolute;bottom:12px;padding:7px 12px;font-size:11px;cursor:pointer}.folder-avatar-change input{display:none}.folder-fields{display:flex;flex-direction:column;gap:13px}.folder-field{min-width:0;display:flex;flex-direction:column;gap:6px}.folder-field>span{font-size:12px}.folder-field input,.folder-field textarea{width:100%;min-width:0;box-sizing:border-box;padding:9px 10px;border-bottom:1px solid #ddd;outline:none;font:inherit;font-size:13px}.folder-field input:focus,.folder-field textarea:focus{border-bottom-color:#777}.folder-field textarea{resize:vertical;line-height:1.7}.folder-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:600px){.folder-open{margin:34px auto 24px;padding:0 7px 8px}.folder-cover{left:5px}.folder-pocket{padding:20px 9px 12px}.folder-document{grid-template-columns:1fr;gap:16px;margin:15px 3px 0;padding:14px;transform:rotate(-.15deg)}.folder-portrait{min-height:180px;max-height:230px}.folder-fields{gap:11px}}
.studio-scene,.files-view,.poster-detail{position:fixed;inset:0;z-index:42;overflow:auto;box-sizing:border-box;padding:env(safe-area-inset-top) clamp(18px,5vw,64px) env(safe-area-inset-bottom)}.studio-header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.studio-header h1{margin:0}.studio-header>button{justify-self:start;border:0;background:none;color:#34332f;font:inherit;cursor:pointer}.studio-header>span,.studio-header>.file-add{justify-self:end;color:#777;font-size:11px}.studio-table{position:relative;overflow:hidden;margin:clamp(25px,6vh,60px) auto 0;max-width:1040px;background:linear-gradient(145deg,#e8e5dc,#d9d6cd)}.studio-table:before{position:absolute;content:"";pointer-events:none}.desk-tool{position:absolute;border:0;background:none;cursor:pointer;transition:transform .25s}.file-stack{left:25%;top:24%;width:190px;height:200px;transform:rotate(-8deg);filter:drop-shadow(7px 11px 6px #28241d30)}.file-sheet{position:absolute;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;width:160px;height:185px;padding:16px;box-sizing:border-box;text-align:left}.sheet-back{left:20px;top:4px;transform:rotate(12deg)}.sheet-front{inset:0}.sheet-front i{margin-top:6px;font-size:10px;font-style:normal}.sketchbook{left:54%;top:22%;width:190px;height:235px;transform:rotate(7deg);filter:drop-shadow(8px 12px 7px #28241d30)}.sketch-cover{width:170px;height:215px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:linear-gradient(135deg,#343434,#171717)}.sketch-cover :deep(svg){width:55px;height:55px;opacity:.75}.sketch-cover b{font-size:14px}.desk-lamp{position:absolute;top:7%;left:7%;width:110px;height:150px;filter:drop-shadow(7px 9px 5px #26231d22)}.desk-lamp:before{position:absolute;top:0;left:38px;width:62px;height:39px;border-radius:50% 50% 6px 6px;background:#f7f6f1;content:"";transform:rotate(-22deg)}.desk-lamp i{position:absolute;top:31px;left:55px;width:9px;height:90px;border-radius:10px;background:#f7f6f1;transform:rotate(-18deg)}.desk-lamp b{position:absolute;bottom:5px;left:26px;width:70px;height:9px;border-radius:50%;background:#f7f6f1}.desk-cup{position:absolute;right:10%;top:20%;width:58px;height:65px;display:flex;align-items:flex-end;justify-content:center;gap:5px;padding-bottom:8px}.desk-cup i{width:3px;height:38px;transform:rotate(8deg)}.desk-cup i:nth-child(2){height:48px;transform:rotate(-8deg)}.desk-ruler{position:absolute;bottom:13%;left:12%;width:170px;height:22px;display:flex;justify-content:space-around;transform:rotate(-13deg)}.desk-ruler i{width:1px;height:8px}.desk-ruler i:nth-child(3n){height:13px}.desk-trash{position:absolute;right:9%;bottom:10%;width:92px;height:95px;border:0;background:none;cursor:pointer}.desk-trash>span{position:absolute;left:13px;right:13px;bottom:12px;height:58px}.desk-trash>i{position:absolute;left:9px;right:9px;bottom:68px;height:9px}.desk-trash>b{position:absolute;inset:auto 0 -8px;font-size:10px}.desk-hint{margin:18px auto;text-align:center}.poster-grid{width:min(100%,1000px);display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));margin:35px auto}.poster-file{position:relative;cursor:pointer;transition:transform .2s}.poster-select{position:absolute;z-index:2;top:8px;right:8px;width:28px;height:28px;cursor:pointer}.character-poster{aspect-ratio:3/4;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;overflow:hidden;padding:22px;box-sizing:border-box;background:linear-gradient(155deg,#fff,#e8e6df);text-align:center}.character-poster:before{position:absolute;content:""}.character-poster>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:none}.character-poster>svg{width:66px;height:66px;margin:auto;opacity:.45}.character-poster>span,.character-poster>h2,.character-poster>small,.character-poster>p{position:relative;z-index:1}.character-poster>span{color:#777;font-size:9px;letter-spacing:.15em}.character-poster>h2{margin:9px 0 4px;font-size:23px}.character-poster>small{color:#777;font-size:10px}.poster-large{width:min(330px,82vw);margin:30px auto;box-shadow:0 25px 60px #39362c2a}.poster-large>p{max-height:90px;overflow:auto;margin:15px 0 0;color:#666;font-size:11px;line-height:1.7}.files-empty{height:65vh;display:grid;place-items:center}.files-empty button,.trash-confirm button{padding:10px 16px;cursor:pointer}.trash-confirm{position:fixed;right:20px;bottom:calc(env(safe-area-inset-bottom) + 20px);left:20px;display:flex;justify-content:center;align-items:center;gap:12px;padding:12px}.trash-confirm span{font-size:12px}
@media(max-width:600px){.studio-table{height:65vh;margin-top:24px}.file-stack{left:8%;top:26%;transform:scale(.78) rotate(-8deg)}.sketchbook{left:45%;top:26%;transform:scale(.78) rotate(7deg)}.desk-lamp{left:3%;transform:scale(.78);transform-origin:top left}.desk-cup{right:5%;top:13%;transform:scale(.8)}.desk-ruler{left:5%;bottom:11%;transform:scale(.8) rotate(-13deg)}.desk-trash{right:3%;bottom:8%;transform:scale(.85)}.poster-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 12px}.character-poster{padding:14px}.trash-confirm{flex-wrap:wrap}}
.identity-editor{flex:1;display:grid;margin:0 auto}.identity-card{position:relative;display:flex;flex-direction:column;box-sizing:border-box;justify-self:center}.identity-card:before{position:absolute;content:"";pointer-events:none}.identity-card-top,.identity-card-bottom{position:relative;z-index:1;display:flex;justify-content:space-between}.identity-portrait{min-height:0;position:relative;display:grid;place-items:center}.identity-portrait>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.identity-portrait>svg{width:72px;height:72px;opacity:.4}.identity-avatar-change{position:absolute;bottom:12px;padding:7px 12px;font-size:10px;cursor:pointer}.identity-avatar-change input{display:none}.identity-card-caption{position:relative;z-index:1;display:flex;flex-direction:column}.identity-card-caption>span{color:#9a9da4;font-size:8px;letter-spacing:.12em}.identity-card-caption>strong{letter-spacing:.08em}.identity-card-caption>small{color:#898d95;font-size:11px}.identity-fields{min-width:0}.identity-heading>span{letter-spacing:.17em}.identity-heading h1{margin:9px 0 5px;letter-spacing:.06em}.identity-heading p{margin:0;color:#92959c;font-size:12px}.identity-form{display:flex;flex-direction:column}.identity-field{min-width:0;display:flex;flex-direction:column;gap:8px}.identity-field>span{display:flex;align-items:baseline;gap:10px}.identity-field>span i{font-style:normal;letter-spacing:.1em}.identity-field input,.identity-field textarea{width:100%;min-width:0;box-sizing:border-box;padding:11px 12px;outline:none;font:inherit;transition:border-color .18s,box-shadow .18s}.identity-field textarea{min-height:130px;resize:vertical;line-height:1.75}.identity-field-row{display:grid;grid-template-columns:1fr 1fr;gap:13px}.identity-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px}.identity-actions>span{color:#a0a3a9;font-size:10px}.identity-actions button{height:40px;padding:0 18px;font-size:11px;cursor:pointer}.identity-actions button:disabled{cursor:not-allowed}.identity-actions button b{padding-left:13px;font-weight:400}@media(max-width:700px){.identity-editor{padding:20px 0 36px}.identity-card{aspect-ratio:.78}.identity-portrait{margin:14px 0 11px}.identity-card-caption{padding-bottom:12px}.identity-card-caption>strong{font-size:21px}.identity-fields{margin:0 auto}.identity-heading h1{font-size:23px}.identity-form{gap:14px;margin-top:20px}.identity-field textarea{min-height:110px}.identity-actions{margin-top:18px}}@media(max-width:390px){.identity-field-row{grid-template-columns:1fr}.identity-card{width:min(76%,250px)}}
/* Pixel handheld art direction: powder blue canvas, blush accents, tactile pixel controls. */
.character-app{--ink:#27445d;--muted:#7792a7;--line:#b8d5e8;--sky:#dff2ff;--blue:#83c7ee;--pink:#f3bad2;--coral:#f4a7a1;--mint:#bce8d7;position:fixed;inset:0;isolation:isolate;background-color:#d9efff;background-image:none;background-size:auto;color:var(--ink);font-family:ui-monospace,"SFMono-Regular",Consolas,"Noto Sans Mono",monospace;letter-spacing:0}
.character-app:before{position:fixed;inset:0;z-index:-1;content:"";pointer-events:none;background:radial-gradient(ellipse at 50% 42%,#f4fbff 0%,#e7f5ffb8 49%,#c6e4f5a8 100%)}
.character-app button{transition:transform .12s steps(2,end),filter .12s steps(2,end),box-shadow .12s steps(2,end)}.character-app button:active{transform:translate(2px,2px)!important;filter:saturate(1.25);box-shadow:2px 2px 0 #537b9a!important}.character-app button:focus-visible{outline:3px solid #f09cbe;outline-offset:3px}
.studio-scene,.files-view,.poster-detail{background:transparent;color:var(--ink)}.studio-header{height:70px;border-bottom:3px solid #9bcbe7;background:#eaf7ff;box-shadow:0 4px 0 #c8e5f5}.studio-header h1{font-family:ui-monospace,monospace;font-size:15px;font-weight:800;letter-spacing:.1em;text-shadow:2px 2px #fff}.studio-header>button,.studio-header>span,.studio-header>.file-add{color:#426985}.studio-header>button:first-child{padding:8px 12px;border:2px solid #9bcbe7;background:#fafdff;box-shadow:3px 3px 0 #9bcbe7}.studio-header>.file-add{padding:9px 13px;border:2px solid #76b8df;background:#c9ebff;box-shadow:3px 3px 0 #76b8df;font-weight:800}
.studio-table{width:min(100%,1100px);height:min(74vh,720px);min-height:440px;margin-top:clamp(18px,4vh,42px);border:4px solid #7ebadd;border-radius:4px;background-color:#b9dff4;background-image:linear-gradient(#ffffff32 1px,transparent 1px),linear-gradient(90deg,#ffffff32 1px,transparent 1px),linear-gradient(#8bbddd20 1px,transparent 1px),linear-gradient(90deg,#8bbddd20 1px,transparent 1px);background-size:32px 32px,32px 32px,8px 8px,8px 8px;box-shadow:inset 0 0 0 7px #d9f0ff,inset 0 0 0 10px #8fc5e4,8px 8px 0 #78afd1;perspective:1200px}.studio-table:before{inset:16px;border:2px dashed #effaff;border-radius:0}
.file-stack,.sketchbook,.desk-trash{filter:drop-shadow(5px 7px 0 #49789955)}.desk-tool:hover{transform:translateY(-9px) rotate(-3deg) scale(1.035)}.file-sheet{border:3px solid #78aeca;border-radius:2px;background:#f8fdff;box-shadow:inset 0 0 0 4px #d8effb}.sheet-back{background:#f6dbe8;border-color:#d99bb8}.sheet-front b{color:#294961;font-family:ui-monospace,monospace;font-size:16px;font-weight:800}.sheet-front i{color:#6b8aa0}.sketch-cover{border:4px solid #699fc0;border-radius:3px;color:#385a73;background-color:#f3c9dd;background-image:linear-gradient(45deg,#f8dcec 25%,transparent 25%,transparent 75%,#f8dcec 75%),linear-gradient(45deg,#f8dcec 25%,transparent 25%,transparent 75%,#f8dcec 75%);background-position:0 0,8px 8px;background-size:16px 16px;box-shadow:inset 0 0 0 5px #fff8}.sketch-cover :deep(svg){filter:drop-shadow(3px 3px 0 #fff);image-rendering:pixelated}.sketch-cover b{font-weight:900;letter-spacing:.08em}.desk-lamp:before,.desk-lamp i,.desk-lamp b{background:#fff1bd;border-radius:2px;box-shadow:3px 3px 0 #d9ac73}.desk-cup{border:3px solid #76afd1;border-radius:3px;background:#f8fdff;box-shadow:4px 5px 0 #5d96b7}.desk-cup i{background:#ed91b8}.desk-ruler{border:2px solid #74a9c8;border-radius:0;background:#fff4cf;box-shadow:3px 4px 0 #5b91b1}.desk-ruler i{background:#537e98}.desk-trash>span{border:3px solid #76aaca;border-radius:2px 2px 8px 8px;background:repeating-linear-gradient(90deg,#a9d8ef 0 8px,#c8eafa 8px 16px);box-shadow:4px 5px 0 #5488a7}.desk-trash>i{border:2px solid #76aaca;border-radius:2px;background:#d9effa}.desk-trash>b{color:#345c77;font-weight:800}.desk-trash.trash-ready>span{background:repeating-linear-gradient(90deg,#f19ab0 0 8px,#f7c0cf 8px 16px)}.desk-hint{color:#567b95;font-size:10px;font-weight:700}
.poster-grid{gap:24px 18px}.poster-file{padding:7px;border:3px solid #95c9e6;background:#eaf7ff;box-shadow:4px 4px 0 #75aeca}.poster-file:hover,.poster-file.selected{transform:translateY(-5px)}.poster-file.selected{border-color:#ef9cbd;background:#fff0f6}.poster-select{border:2px solid #8bbbd5;border-radius:2px;color:#365d75;background:#f8fdff;box-shadow:2px 2px 0 #79a8c1;font-weight:900}.character-poster{border:3px solid #85b9d4;border-radius:2px;background-color:#d6efff;background-image:linear-gradient(#ffffff26 1px,transparent 1px),linear-gradient(90deg,#ffffff26 1px,transparent 1px);background-size:8px 8px;box-shadow:inset 0 0 0 5px #f7fcff}.character-poster:before{inset:9px;border:2px dashed #ffffffbd}.character-poster>img{image-rendering:auto}.character-poster>h2{font-family:ui-monospace,monospace;font-weight:900;color:#274861;text-shadow:2px 2px #fff}.character-poster>span,.character-poster>small{color:#496f89;font-weight:700}.files-empty button,.trash-confirm button{border:2px solid #78afd1;border-radius:3px;color:#315b76;background:#f4fbff;box-shadow:3px 3px 0 #78afd1;font-weight:800}.trash-confirm{border:3px solid #8abdd9;border-radius:3px;background:#eff9ff;box-shadow:5px 5px 0 #6b9ebb}.trash-confirm span{color:#385f78;font-weight:700}.trash-confirm button:nth-of-type(1){border-color:#db819f;color:#fff;background:#df7696;box-shadow:3px 3px 0 #ae5d78}
.folder-cover{border:3px solid #83b7d2;border-bottom:0;border-radius:3px 3px 0 0;color:#355d77;background:#f3cde0;font-weight:800}.folder-pocket{border:4px solid #78afd1;border-radius:3px;background:#c4e7f8;box-shadow:inset 0 0 0 5px #e8f7ff}.folder-pocket:before{inset:8px;border:2px dashed #f7fcff;border-radius:0}.folder-tab{border:2px solid #7eafc9;border-top:0;border-radius:0 0 3px 3px;color:#315b76;background:#f7dce9;font-weight:800}.folder-document{border:3px solid #86b9d5;border-radius:2px;background:#fbfdff;box-shadow:4px 4px 0 #89b5cd;transform:none}.folder-portrait{border:3px solid #8bbbd4;border-radius:2px;background:#e3f4ff}.folder-avatar-change{border:2px solid #87b7d0;border-radius:2px;color:#315b76;background:#f5fbff;font-weight:800}.folder-field>span{color:#416985;font-weight:800}.folder-field input,.folder-field textarea{border:2px solid #c7e0ee;border-radius:2px;color:#294a60;background:#f7fcff}.folder-field input:focus,.folder-field textarea:focus{border-color:#79b9df;background:#fff;box-shadow:3px 3px 0 #d5eafa}
.builder-workspace{position:fixed;background:transparent}.builder-header>span,.builder-footer{color:#587c94;font-family:ui-monospace,monospace;font-weight:800}.builder-finish{padding:8px 13px}.identity-card{background-color:#cceaff;background-image:linear-gradient(#ffffff35 1px,transparent 1px),linear-gradient(90deg,#ffffff35 1px,transparent 1px);background-size:16px 16px;color:#315b75}.identity-card:before{border-radius:0}.identity-card-top,.identity-card-bottom{font-family:ui-monospace,monospace}.identity-portrait{border-radius:2px;background:repeating-linear-gradient(0deg,#d9effb 0 8px,#cfe8f6 8px 16px)}.identity-avatar-change{border:2px solid #79afd0;border-radius:2px;color:#315d78;background:#f2faff;font-weight:800}.identity-card-caption>strong{font-family:ui-monospace,monospace}.identity-heading>span,.identity-field>span i{color:#638ba5;font-family:ui-monospace,monospace;font-weight:800}.identity-heading h1{font-family:ui-monospace,monospace}.identity-actions button:disabled{box-shadow:none}.builder-footer{border-top:3px solid #9bcbe7;background:#eaf7ff}.builder-footer button{border:2px solid #78afd1;border-radius:2px;color:#315b76;background:#f4fbff;box-shadow:3px 3px 0 #78afd1;font-weight:800}.builder-footer button:hover{border-color:#ef9cbd;background:#fff1f6}
.details-modal{background:#31577155;backdrop-filter:blur(3px)}.details-modal-card{border:4px solid #7eb5d5;border-radius:3px;background:#eff9ff;box-shadow:7px 7px 0 #4f829f}.details-modal-card header h2{color:#315b76;font-family:ui-monospace,monospace;font-weight:900}.details-modal-card header button{border:2px solid #8bbbd5;border-radius:2px;background:#fff}.details-modal-card>textarea{border:3px solid #b4d9ec;border-radius:2px;color:#294b62;background:#fbfdff}.details-modal-card>textarea:focus{border-color:#75b6dd;box-shadow:4px 4px 0 #cbe7f5}.details-modal-card footer button{border:2px solid #d884a2;border-radius:2px;color:#fff;background:#e584a5;box-shadow:3px 3px 0 #b66582;font-weight:900}
@keyframes pixel-pop{0%{transform:translate(0,0) scale(1)}45%{transform:translate(-3px,-5px) scale(1.04)}100%{transform:translate(0,0) scale(1)}}.desk-tool:active,.desk-trash:active,.poster-file:active{animation:pixel-pop .22s steps(3,end)}
@media(max-width:600px){.studio-table{min-height:380px;border-width:3px;box-shadow:inset 0 0 0 5px #d9f0ff,inset 0 0 0 8px #8fc5e4,5px 5px 0 #78afd1}.identity-editor{gap:20px}.identity-form{padding:14px}.studio-header{height:60px}}
/* Reference-matched handheld map screen */
.pixel-pocket{--lav:#9180bd;--lav-dark:#7664a3;--pink:#dc80a7;--blue:#91cbe7;position:fixed;inset:0;z-index:42;display:flex;flex-direction:column;overflow:hidden;padding:env(safe-area-inset-top) clamp(10px,2vw,22px) env(safe-area-inset-bottom);box-sizing:border-box;border-radius:clamp(30px,8vw,76px);color:#655b80;font-family:ui-monospace,"SFMono-Regular",Consolas,monospace}.pixel-pocket:before{position:absolute;inset:7px;z-index:-1;content:"";border-radius:clamp(24px,7vw,66px);pointer-events:none}.pocket-topbar{height:clamp(76px,13vh,116px);flex:none;display:grid;grid-template-columns:1fr 2fr 1fr;align-items:center;padding:0 clamp(12px,4vw,40px)}.pocket-power{justify-self:start;display:flex;align-items:center;gap:8px;border:0;color:#8b79ae;background:transparent;font-size:10px;font-weight:900;letter-spacing:.14em}.pocket-power i{border:3px solid #da83a9;border-radius:50%;background:#f4b2c9;box-shadow:0 0 0 3px #fff8}.pocket-brand{text-align:center}.pocket-brand strong{display:block;color:#7765a5;font-size:clamp(22px,4.5vw,39px);font-weight:1000}.pocket-brand strong span{color:#db7ba4;font-size:.47em;letter-spacing:.03em}.pocket-brand small{display:block;margin-top:3px;color:#8d7eab;font-size:9px;letter-spacing:.12em}.pocket-battery{justify-self:end;gap:2px;align-items:center}.pocket-battery:after{position:absolute;width:3px;height:7px;margin-left:43px;background:#9482bb}.pocket-battery i{height:7px;flex:1;background:#8ec9e4}
.pocket-screen{width:min(100%,880px);flex:1;min-height:0;margin:0 auto 8px}.map-console{height:100%;display:flex;flex-direction:column;overflow:hidden;background:#fff9fd}.map-status{height:38px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:12px;font-weight:900}.map-status small{color:#8d7da4;font-size:10px;font-weight:500;letter-spacing:.04em}.map-status b{font-size:10px}.map-search{height:42px;flex:none;display:flex;align-items:center;gap:8px;padding:0 10px;background:#fffafd}.map-search>span{font-size:22px;color:#9b87c0}.map-search input{min-width:0;flex:1;border:0;outline:0;color:#655b80;background:transparent;font:inherit;font-size:11px}.map-search input::placeholder{color:#a39ab0}.map-search button{padding:5px 8px;border:2px solid #ae9bce;color:#8975ae;background:#f6effa;font:inherit;font-size:10px}
.pixel-world{position:relative;flex:1;overflow:hidden}.pixel-world:before{position:absolute;right:0;bottom:27%;left:0;content:""}.world-path{position:absolute;inset:8% 5% 22%;width:90%;height:70%;overflow:visible}.world-path path{fill:none}.pixel-cloud{position:absolute;color:#fff;font-size:40px;text-shadow:8px 5px #f3d8e9}.cloud-two{font-size:31px}.pixel-star{position:absolute;font-style:normal}.star-one{top:8%;left:35%}.star-two{top:29%;right:8%;color:#9e8ac7}.star-three{top:53%;left:50%;color:#94c9e2}.map-place{position:absolute;z-index:2;display:flex;flex-direction:column;align-items:center;border:0;background:transparent;color:#514767;font:inherit;cursor:pointer;transition:transform .15s steps(2,end)}.map-place:active{transform:translateY(-4px) scale(1.08)}.map-place small{font-size:8px}.pixel-house{width:78px;height:55px;position:relative;display:block;border:4px solid #7c69a5;background:#fff0fa;box-shadow:inset 0 -9px #e9c6df}.pixel-house:before{position:absolute;top:-23px;left:-8px;width:78px;height:25px;content:"";border:4px solid #7c69a5;background:#f5bed6;clip-path:polygon(50% 0,100% 100%,0 100%);filter:drop-shadow(0 3px #fff)}.pixel-house:after{position:absolute;right:8px;bottom:0;width:15px;height:25px;content:"";border:3px solid #7c69a5;border-bottom:0;background:#d8c8ef}.pixel-house i,.pixel-house b{position:absolute;top:7px;width:13px;height:13px;border:3px solid #7c69a5;background:#d5eff8}.pixel-house i{left:7px}.pixel-house b{right:7px}.pixel-house em{position:absolute;bottom:7px;left:8px;width:23px;height:12px;border:3px solid #7c69a5;background:#e894b8}.house-cafe{width:74px;height:42px;background:#f6ebff}.house-cafe:before{top:-18px;left:-8px;width:74px;height:20px;background:#b9a5d8}.house-cafe em{display:none}.house-studio{width:82px;height:50px;background:#fff}.house-studio:before{top:-11px;left:-8px;width:82px;height:10px;background:#eca1c1;clip-path:none}.house-library{width:76px;height:50px}.house-library:before{background:#b3ddec}.pixel-tower{width:40px;height:79px;position:relative;display:block;border:4px solid #7966a1;background:#fff9fe;clip-path:polygon(50% 0,100% 20%,100% 100%,0 100%,0 20%)}.pixel-tower:before{position:absolute;inset:17px 9px 18px;content:"";border:4px solid #7966a1;background:#c1e5f3}.pixel-tower i{position:absolute;bottom:0;left:13px;width:10px;height:17px;border:3px solid #7966a1;background:#efb7d0}.map-character{position:absolute;z-index:3;width:34px;height:34px;display:grid;place-items:center;overflow:hidden;padding:0;border:3px solid #fff;border-radius:4px;background:#b49fd6;image-rendering:pixelated}.map-character img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}.map-character span{color:#fff;font-size:17px;font-weight:900}.pixel-water{position:absolute;right:0;bottom:21%;left:0;display:flex;justify-content:space-around;color:#fff;font-size:16px;text-shadow:0 2px #92cbe4}.pixel-water span:first-child{color:#df8caf}.map-rooms{position:absolute;right:3%;left:3%;display:grid;grid-template-columns:repeat(6,1fr)}.map-rooms button{display:flex;flex-direction:column;align-items:center;border:0;color:#756b88;background:transparent;font:inherit;cursor:pointer}.room-icon{display:grid;place-items:center;border:3px solid #7967a0;font-style:normal}.map-rooms button span{font-size:9px;text-shadow:1px 1px #fff}.pocket-message{position:absolute;display:grid;grid-template-columns:42px 1fr;align-items:center;gap:9px;padding:8px 10px}.message-avatar{width:38px;height:42px;display:grid;place-items:center;overflow:hidden}.message-avatar img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}.message-avatar :deep(svg){width:31px;height:31px}.pocket-message p{max-height:44px;overflow:hidden;margin:0;font-family:ui-monospace,monospace;font-size:clamp(8px,1.7vw,11px);line-height:1.7}.pocket-message small{display:block;margin-top:4px;color:#a097ac;font-size:8px}.message-pin{position:absolute;left:48%;color:#ce6995}.screen-caption{height:20px;flex:none;display:grid;place-items:center;font-size:8px}.pocket-controls{width:min(100%,880px);height:clamp(75px,13vh,115px);flex:none;display:flex;align-items:center;justify-content:space-between;margin:0 auto;padding:0 clamp(12px,4vw,40px)}.dpad{width:65px;height:65px;position:relative;border:0;background:transparent;color:#816daa;font-size:18px;filter:drop-shadow(3px 4px #806ba7)}.dpad:before{position:absolute;inset:0;content:"";clip-path:polygon(35% 0,65% 0,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0 65%,0 35%,35% 35%)}.dpad i{position:relative;font-style:normal}.control-center{display:flex;align-items:center;gap:clamp(8px,3vw,25px)}.control-center button{width:38px;height:38px;border:3px solid #806ba7;border-radius:8px;background:#fff5fb;font-size:23px}.pixel-pocket button:active{transform:translate(2px,3px) scale(.95)!important;filter:brightness(1.08)}
@media(max-height:700px){.pocket-topbar{height:68px}.pocket-controls{height:68px}.map-message{bottom:2%}.map-rooms{bottom:14%}.pocket-message{min-height:48px;padding:5px}.message-avatar{height:34px}.pocket-message p{max-height:34px}}@media(max-width:430px){.pixel-pocket{border-radius:36px;padding-right:7px;padding-left:7px}.pocket-screen{border-radius:18px}.pocket-topbar{grid-template-columns:.8fr 2fr .8fr;padding:0 8px}.pocket-brand strong{font-size:22px}.pocket-brand small{font-size:7px}.map-status{padding:0 7px;font-size:10px}.map-status small{font-size:8px}.map-search{height:36px}.pixel-house{transform:scale(.82);transform-origin:bottom}.pixel-tower{transform:scale(.82);transform-origin:bottom}.map-place small{font-size:7px}.map-rooms button span{font-size:8px}.pocket-message{gap:6px}.control-center{gap:7px}.control-center button{width:32px;height:32px;font-size:19px}.dpad{width:52px;height:52px}.pocket-add{width:46px;height:46px}}
@media(prefers-reduced-motion:reduce){.pixel-pocket *{transition:none!important;animation:none!important}}
/* 细网格像素画：轻描边、纸质贴纸与低对比度掌机外壳。 */
.pixel-pocket{border-width:3px;border-color:#aa99c6;background-size:5px 5px,100% 100%;image-rendering:auto}
.pixel-pocket:before{border-width:1px;border-color:#b8a5cf}.pocket-power i{width:9px;height:9px;border-width:2px}.pocket-brand strong{text-shadow:1px 1px #fff;letter-spacing:-.055em}.pocket-screen{box-sizing:border-box;border-width:2px;border-color:#a292ba;padding:7px;background:#faf6fc}.map-console{border-width:1px;border-color:#ae9ac5}.map-status{border-bottom-width:1px;background:#eee6f5;color:#716080}.map-status b{color:#a96485}.map-search{border-bottom-width:1px}.map-search button{border-width:1px;box-shadow:1px 2px 0 #ddcfe8;font-weight:600}.pixel-world{min-height:440px}.map-place{gap:0;filter:none;padding:0 4px}.map-building{display:block;width:106px;height:106px;filter:drop-shadow(0 2px 0 #fff9)}.map-place strong{margin-top:-5px;font-size:11px;font-weight:600;color:#786583;text-shadow:0 1px #fff}.map-place small{margin-top:3px;color:#a18ba4}.place-home{top:8%;left:7%}.place-tower{top:2%;left:46%}.place-cafe{top:22%;right:7%}.place-studio{top:35%;left:36%}.place-library{top:49%;left:6%}.pixel-cloud{width:78px;height:65px;filter:none;opacity:.9}.cloud-one{top:1%;left:9%}.cloud-two{top:3%;right:5%;width:65px}.pixel-star{font-size:12px;text-shadow:none;color:#d5a0ba}.map-stickers{position:absolute;inset:0;pointer-events:none}.pixel-sticker{position:absolute;width:57px;height:57px;filter:drop-shadow(0 2px 1px #9f83ad22)}.sticker-tea{top:6%;left:29%;transform:rotate(-9deg)}.sticker-bandage{top:5%;right:6%;width:62px;transform:rotate(-24deg)}.sticker-apple{top:35%;left:9%;width:48px;transform:rotate(-8deg)}.sticker-banana{top:48%;right:8%;width:59px;transform:rotate(12deg)}.map-rooms{bottom:16%;gap:7px}.room-icon{height:48px;width:36px;border-width:1px;border-color:#ac98bf;background:#f0e5f2;box-shadow:inset 0 -4px #ddcde9,2px 2px 0 #fff9;font-size:20px;color:#9985ae;text-shadow:1px 1px #fff}.room-1,.room-4{background:#e4f2f8;box-shadow:inset 0 -4px #c7e1ec,2px 2px 0 #fff9}.room-2,.room-5{background:#fff0f6;box-shadow:inset 0 -4px #f0d4e2,2px 2px 0 #fff9}.map-rooms button span{font-weight:500;color:#8a779a}.pocket-message{box-sizing:border-box;bottom:2.5%;left:7%;right:7%;min-height:62px;border-width:1px;border-color:#bda8cc}.message-avatar{box-sizing:border-box;border-width:1px;border-color:#b6a0c8}.message-avatar img,.map-character img{image-rendering:auto}.pocket-message p{font-weight:400;color:#89758f}.message-pin{font-size:11px;top:-7px;text-shadow:0 1px #fff}.map-character{border-width:2px;box-shadow:1px 2px 0 #b09bc5}.pocket-controls{box-sizing:border-box}.control-center button{border-width:1px;border-color:#a794bf;box-shadow:1px 3px 0 #bdacd0,inset 0 1px #fff;font-weight:500;color:#a08ab8}.pocket-add{width:54px;height:54px;display:grid;place-items:center;flex:none;padding:0;border:0;border-radius:50%;color:#fff;background:transparent;box-shadow:none;font-size:29px;font-weight:900;line-height:0}.pocket-add .handheld-icon{display:block;width:100%;height:100%}.dpad:before{border:0;background:#c4b1dd}.screen-caption{font-weight:500;color:#a38db5;letter-spacing:.2em}.pocket-screen{overflow:auto;scrollbar-width:thin;scrollbar-color:#cfbddc transparent}.map-console{min-height:560px}
@media(min-height:850px){.map-console{min-height:100%}.pixel-world{min-height:440px}}
@media(max-width:430px){.pixel-pocket{border-width:3px}.pocket-screen{border-width:2px;padding:5px}.map-building{width:84px;height:84px}.map-place strong{font-size:10px}.place-home{left:4%;top:9%}.place-tower{left:45%;top:3%}.place-cafe{right:3%;top:25%}.place-studio{left:35%;top:37%}.place-library{left:4%;top:51%}.pixel-sticker{width:45px;height:45px}.sticker-tea{left:28%;top:8%}.sticker-bandage{right:3%;width:48px;top:9%}.sticker-apple{left:7%;top:37%;width:39px}.sticker-banana{right:5%;top:50%;width:46px}.pixel-cloud{width:55px;height:47px}.cloud-two{width:48px}.room-icon{width:30px;height:41px;font-size:18px}.map-rooms{left:2%;right:2%;gap:1px}.pocket-message{left:4%;right:4%;grid-template-columns:32px 1fr}.message-avatar{width:30px;height:34px}.pocket-message p{font-size:10px;max-height:34px}.pocket-topbar{height:76px}.pocket-controls{height:76px}}
/* 地图掌机：细点阵外壳与多层像素屏幕边框。 */
.pixel-pocket{border:3px solid #9987b8;background-color:#f2eaf6;box-shadow:inset 0 0 0 2px #fff8,inset 0 0 0 4px #d6c6e4,inset 0 -7px 0 #acbed94d}
.pixel-pocket:before{border:2px dashed #b5a0ca;box-shadow:inset 0 0 0 2px #ffffff70}


.map-status{border-bottom:2px solid #b9a6cd;background-color:#eae1f2;background-image:repeating-linear-gradient(90deg,#fff5 0 1px,transparent 1px 4px);box-shadow:inset 0 1px #fff}
.map-search{border-bottom:2px solid #d1bfdf;background-color:#fff9fd;background-image:repeating-linear-gradient(90deg,#eaddeb50 0 1px,transparent 1px 5px)}
.pixel-world{background-color:#fbf4fa}
.pixel-world:before{height:2px;background:#fff;box-shadow:0 2px 0 #bedeea,0 4px 0 #eaf7fa,0 6px 0 #c5e2ef}
.world-path path{stroke:#b8a0cc;stroke-width:2;stroke-dasharray:2 5;stroke-linecap:square;opacity:.8}
.pocket-message{background-color:#fffbfd;background-image:linear-gradient(90deg,#ebddec50 1px,transparent 1px),linear-gradient(#ebddec50 1px,transparent 1px);background-size:4px 4px}

.message-avatar :deep(svg.message-cat){display:block;width:100%;height:100%;image-rendering:pixelated}
.map-rooms .room-icon{border:2px solid #ac98bf;background-image:repeating-linear-gradient(90deg,#fff6 0 1px,transparent 1px 4px);box-shadow:inset 1px 1px #fff,inset -2px -3px #d6c5e0,2px 2px 0 #fff9}
.map-place:focus-visible,.map-rooms button:focus-visible{outline:2px dashed #ad7da9;outline-offset:2px}
/* 移除地图点阵，保留柔和底色与精细建筑插画。 */
.pixel-pocket{background-image:linear-gradient(165deg,#fff4f9,#eee7f8 53%,#d4ebf7)}

.map-status,.map-search,.pocket-message{background-image:none}
.pixel-world{background-image:linear-gradient(180deg,#fffafd 0%,#faf3f8 68%,#e1f1f8 68%,#cce7f2 100%);background-size:100% 100%}
.map-rooms{align-items:end}
.map-rooms button{min-width:0;gap:1px;padding:0}
.room-house{display:block;width:min(100%,64px);height:auto;aspect-ratio:1;filter:drop-shadow(0 2px 0 #fff9)}
@media(max-width:430px){.room-house{width:min(100%,46px)}}
/* 头部像素箭头与电池。 */
.pocket-back-home{gap:4px;border:2px solid #bb99bd;border-radius:4px;background:#fff4f8;box-shadow:inset 1px 1px #fff,2px 2px 0 #d9bfd5;color:#8e6487}
.pocket-back-icon{display:block;width:20px;height:20px;flex:none;image-rendering:pixelated}
.pocket-battery{position:relative;width:48px;height:20px;display:block;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
.pocket-battery:after{content:none}
.pocket-battery svg{display:block;width:100%;height:100%;image-rendering:pixelated}
@media(max-width:420px){.pocket-back-icon{width:17px;height:17px}.pocket-battery{width:40px;height:17px}}
/* 屏幕、对话框和头像采用细像素叠边与阶梯角。 */
.pocket-screen{border:3px solid #8f7cae;border-radius:8px;background-color:#e4d9ef;background-image:repeating-linear-gradient(90deg,#fff9 0 2px,#c8b6db 2px 4px,#efe6f6 4px 6px,#b8a4cd 6px 7px);box-shadow:inset 0 0 0 1px #fff,inset 0 0 0 3px #d5c5e4,0 2px 0 #e8dbf1,0 4px 0 #a995c5,0 6px 0 #dfcfe9}
.map-console{border:2px solid #9983b2;box-shadow:0 0 0 1px #fff,0 0 0 2px #bdabd0,inset 0 0 0 1px #f8f0fb}
.pocket-message{border:2px solid #9e88b5;background:#fffbfd;box-shadow:inset 0 0 0 1px #fff,inset 0 0 0 3px #eadced,inset 0 0 0 4px #d2bedf,2px 2px 0 #f7edf8,4px 4px 0 #bda9d0}
.message-avatar{padding:2px;border:2px solid #9680af;background:#eee1f1;box-shadow:inset 0 0 0 1px #fff,2px 2px 0 #c5afd3;clip-path:polygon(3px 0,calc(100% - 3px) 0,calc(100% - 3px) 1px,calc(100% - 1px) 1px,calc(100% - 1px) 3px,100% 3px,100% calc(100% - 3px),calc(100% - 1px) calc(100% - 3px),calc(100% - 1px) calc(100% - 1px),calc(100% - 3px) calc(100% - 1px),calc(100% - 3px) 100%,3px 100%,3px calc(100% - 1px),1px calc(100% - 1px),1px calc(100% - 3px),0 calc(100% - 3px),0 3px,1px 3px,1px 1px,3px 1px)}
/* 档案详情延续粉蓝手账风格，立绘保留原图清晰度。 */
.archive-trash{z-index:60;border-width:1px;background:#fff9fd;box-shadow:2px 3px #cdbbdd66;border-color:#d2bedc}.poster-detail{background-color:#f7f4fb;background-image:linear-gradient(#d4c9e21c 1px,transparent 1px),linear-gradient(90deg,#d4c9e21c 1px,transparent 1px);background-size:12px 12px}.poster-detail .studio-header{border-bottom:1px solid #ddd0e6;background:transparent;box-shadow:none}.poster-detail .studio-header h1{color:#927b9f;text-shadow:none;font-weight:500}.poster-detail .studio-header>button{border-width:1px;box-shadow:2px 2px #ddcfe7;color:#8c729e;background:#fff9fd;border-color:#d2bfdc}.poster-detail .folder-open{filter:drop-shadow(3px 5px 0 #cbbbd533)}.poster-detail .folder-cover{border-width:1px;background:#efddec;border-color:#c6afd2;color:#967ba2}.poster-detail .folder-pocket{border-width:1px;border-color:#bbbed6;background:#e5eef8;box-shadow:inset 0 0 0 5px #f3f8fd}.poster-detail .folder-pocket:before{border-width:1px}.poster-detail .folder-tab{border-width:1px;border-color:#cdb8d9;background:#faedf4;color:#a07faa}.poster-detail .folder-document{border-width:1px;border-color:#d1c8df;box-shadow:2px 3px #d5cae280}.poster-detail .folder-portrait{border-width:1px;border-color:#d5c8de}.poster-detail .folder-field>span{font-weight:500;color:#9b82a7}.poster-detail .folder-field input,.poster-detail .folder-field textarea{border-width:1px;border-color:#e5ddec;background:#fdfaff;color:#8a7396}.poster-detail .folder-avatar-change{border-width:1px;border-color:#d5bfdc;background:#fff9fd;color:#9b7da7;font-weight:400}.folder-portrait-decoration{position:absolute;top:7px;right:5px;width:65px;height:65px;transform:rotate(20deg);pointer-events:none}.folder-portrait>.animal-avatar{width:150px}
/* 新建与详情共用细像素手账材质。 */
.builder-workspace{background-size:12px 12px;color:#826f93;padding-inline:clamp(14px,4vw,56px)}.builder-header{height:72px;background:transparent;border-bottom:1px solid #ded3e8;box-shadow:none}.builder-header>span{font-size:9px;letter-spacing:.12em;font-weight:400;color:#a38db4}.builder-back,.builder-finish{font-weight:400;color:#8f789f}.builder-finish{border:1px solid #ccb9d9;border-radius:4px;background:#f5e6f1;box-shadow:2px 2px #e1d2e9;font-size:11px}.identity-editor{width:min(100%,1060px);grid-template-columns:minmax(260px,.85fr) minmax(0,1.15fr);align-items:start;gap:clamp(28px,5vw,68px);padding:30px 0 46px;box-sizing:border-box}.builder-art-column{min-width:0}.creation-title{text-align:center;margin-bottom:22px}.creation-title>span{font-size:8px;letter-spacing:.13em;color:#b29abc}.creation-title h2{font-size:23px;font-weight:500;letter-spacing:.12em;margin:10px 0;color:#8b729e}.creation-title p{font-size:10px;color:#ad98b8;line-height:1.8}.identity-card{width:min(100%,350px);margin:0 auto;aspect-ratio:auto;min-height:450px;padding:20px;border:1px solid #bbbed6;border-radius:7px;background:linear-gradient(145deg,#fff9fd,#e9f3fb);box-shadow:4px 5px #dcd2e966;transform:rotate(-1deg)}.identity-card:before{border:1px dashed #d9cce4;inset:7px}.identity-card-top,.identity-card-bottom{color:#a797b4;font-size:7px;font-weight:400;letter-spacing:.1em}.identity-portrait{flex:none;height:225px;margin:16px 0 10px;border:1px solid #d5c8e1;background-color:#f9f5fd;background-image:linear-gradient(#c6b8d51a 1px,transparent 1px),linear-gradient(90deg,#c6b8d51a 1px,transparent 1px);background-size:9px 9px;overflow:visible}.identity-portrait>.builder-pixel-portrait{width:140px;height:210px;opacity:1;margin-bottom:7px}.identity-portrait>.portrait-candy{position:absolute;width:66px;height:66px;left:0;top:20px;opacity:1;transform:rotate(-18deg)}.identity-portrait>.portrait-star{position:absolute;width:48px;height:48px;right:4px;top:7px;opacity:1;transform:rotate(12deg)}.identity-portrait>.portrait-kitten{position:absolute;width:57px;height:57px;right:0;bottom:14px;opacity:1;transform:rotate(9deg)}.portrait-note{position:absolute;bottom:5px;font-size:6px;letter-spacing:.1em;color:#b6a4c0;background:#fff9fdcc;padding:3px 5px}.builder-avatar-row{display:flex;align-items:center;justify-content:center;gap:13px;position:relative;z-index:1;margin-top:-7px}.builder-avatar-row>.animal-avatar{width:80px}.builder-avatar-row .identity-avatar-change{position:static;display:flex;flex-direction:column;gap:7px;padding:8px 0;border:0;background:transparent;color:#9b7ea8;font-weight:400;border-radius:0;font-size:11px}.identity-avatar-change small{font-size:8px;color:#b1a2bd}.identity-card-caption{padding:5px 3px 17px;gap:6px}.identity-card-caption>strong{font-size:23px;color:#8a719d;text-shadow:none;font-weight:500;overflow-wrap:anywhere}.identity-card-caption>span,.identity-card-caption>small{color:#ab96b6;font-weight:400;font-size:9px;overflow-wrap:anywhere}.card-mango{position:absolute;width:62px;height:62px;right:-18px;bottom:22px;transform:rotate(15deg);pointer-events:none}.atelier-footer{display:flex;align-items:center;justify-content:center;gap:6px;margin:18px auto 0;max-width:350px;color:#a18bad}.atelier-footer>svg{width:75px;height:112px;flex:none}.atelier-footer>div>span{font-size:10px}.atelier-footer p{font-size:9px;line-height:1.8}.profile-sticker-strip{display:flex;justify-content:center;gap:12px}.profile-sticker-strip svg{width:43px;height:43px}.identity-fields{padding:25px;background:#fffcff;border:1px solid #ddd0e7;border-radius:7px;box-shadow:3px 4px #e5dcec55;box-sizing:border-box}.identity-heading>span{font-size:8px;color:#b09abd;font-weight:400}.identity-heading h1{font-size:25px;font-weight:500;text-shadow:none;color:#8a709d}.identity-heading p,.identity-actions>span{font-size:10px;line-height:1.8;color:#ad99b7}.identity-form{padding:0;border:0;background:transparent;box-shadow:none;margin-top:23px;gap:15px}.identity-field>span{font-size:11px;font-weight:400;color:#927ba1}.identity-field>span i{font-size:7px;color:#b4a2c0;font-weight:400}.identity-field input,.identity-field textarea{border:1px solid #dfd4e9;border-radius:4px;background:#fcfaff;color:#806c90;font-size:12px}.identity-field input::placeholder,.identity-field textarea::placeholder{color:#b5a6c0}.identity-field input:focus,.identity-field textarea:focus{border-color:#b3bdd8;box-shadow:0 0 0 3px #edf1fb}.identity-actions{padding-top:17px;border-top:1px dashed #e1d5e9;flex-wrap:wrap}.identity-actions button{border:1px solid #b2bdd7;background:#deedf9;color:#8291b1;border-radius:4px;box-shadow:2px 3px #d5deed;font-weight:400}.identity-actions button:disabled{opacity:.45}.profile-art-column{min-width:0}.poster-detail .folder-document{grid-template-columns:minmax(210px,.8fr) minmax(0,1.2fr);align-items:start;gap:27px;padding:25px}.poster-detail .folder-open{width:min(100%,1010px);margin-top:55px}.poster-detail .folder-portrait{height:260px;min-height:0;max-height:none;background:linear-gradient(#f9f3fc,#e9f2fb);overflow:hidden}.folder-portrait>.detail-pixel-portrait{width:155px;height:235px;opacity:1}.folder-portrait>.folder-portrait-decoration{width:53px;height:53px;opacity:1;right:5px;top:8px}.detail-avatar-preview{display:flex;align-items:center;justify-content:center;gap:12px;margin:12px 0}.detail-avatar-preview>.animal-avatar{width:85px}.detail-avatar-preview .folder-avatar-change{position:static;font-size:10px;cursor:pointer}.poster-detail .folder-fields{gap:19px}.poster-detail .folder-field textarea{min-height:220px}.poster-detail .folder-field input,.poster-detail .folder-field textarea{font-size:12px;border-radius:4px}.poster-detail .folder-tab{max-width:75%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.poster-detail .studio-header h1{max-width:42vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.builder-header button:focus-visible{outline:2px solid #b097c4;outline-offset:3px}
/* 新建角色：清爽背景与紧凑布局。 */
.builder-workspace{background-image:none;background-color:#f8f5fc}
.builder-workspace .builder-header{height:56px}
.builder-workspace .identity-editor{gap:clamp(18px,3vw,36px);padding:16px 0 24px}
.builder-workspace .creation-title{margin-bottom:8px}
.builder-workspace .creation-title h2{margin:0;font-size:16px;letter-spacing:0}
.builder-workspace .identity-card{min-height:0;padding:14px;transform:none}
.builder-workspace .identity-portrait{height:190px;margin:0 0 8px;background-image:none}
.builder-workspace .identity-portrait>.builder-pixel-portrait{height:180px;width:120px}
.builder-workspace .identity-card-caption{padding:4px 3px 3px}
.builder-workspace .identity-fields{padding:18px}
.builder-workspace .identity-heading h1{margin:0 0 3px;font-size:20px}
.builder-workspace .identity-heading p{margin:0}
.builder-workspace .identity-form{margin-top:14px;gap:10px}
.builder-workspace .identity-field{gap:5px}
.builder-workspace .identity-actions{margin-top:14px;padding-top:12px}
@media(max-width:700px){.identity-editor{grid-template-columns:1fr;gap:24px;padding-top:20px}.identity-card{width:min(100% - 20px,330px);padding:18px;min-height:0}.creation-title{margin-bottom:17px}.identity-fields{width:100%;padding:20px}.identity-portrait{height:205px}.identity-portrait>.builder-pixel-portrait{height:190px;width:130px}.atelier-footer{margin-top:14px}.builder-header{height:63px}.builder-header>span{font-size:7px;letter-spacing:.03em}.identity-field-row{grid-template-columns:1fr 1fr}.identity-actions{gap:9px}.identity-actions button{margin-left:auto}.card-mango{right:-10px;width:53px;height:53px}.poster-detail{padding-inline:12px}.poster-detail .folder-document{grid-template-columns:1fr;padding:17px;gap:23px}.poster-detail .folder-portrait{height:230px}.profile-art-column{max-width:370px;width:100%;margin:auto}.poster-detail .folder-field textarea{min-height:170px}.folder-portrait>.detail-pixel-portrait{height:215px;width:143px}}
/* 掌机：去掉点阵网格背景；加号按钮去掉浅紫色覆盖层，保留原有图形。 */
.pixel-pocket{background-image:none!important;background-size:auto}
.pocket-screen{background-image:none!important}
.pocket-controls .pocket-add{filter:none!important;background:transparent!important;opacity:1!important;box-shadow:none!important}
.pocket-controls .pocket-add::before,.pocket-controls .pocket-add::after{content:none!important;display:none!important}
/* 方向键：关闭覆盖在按钮上的 #c4b1dd 伪元素层。 */
.dpad:before{content:none!important;background:none!important;border:0!important}
/* 新建角色：名片缩小为侧边小卡，资料表单占主要区域，突出主次。 */
.builder-workspace .identity-editor{grid-template-columns:minmax(170px,.42fr) minmax(0,1.58fr);align-items:start;gap:clamp(22px,3.5vw,44px)}
.builder-workspace .identity-card{width:100%;max-width:200px;justify-self:start;padding:10px}
.builder-workspace .identity-portrait{height:128px;margin:0 0 6px}
.builder-workspace .identity-portrait>.builder-pixel-portrait{height:116px;width:78px}
.builder-workspace .identity-card-caption>strong{font-size:13px}
.builder-workspace .identity-fields{padding:0;border:0;background:transparent;box-shadow:none}
.builder-workspace .identity-form{margin-top:6px}
@media(max-width:700px){.builder-workspace .identity-editor{grid-template-columns:1fr;gap:14px}.builder-workspace .identity-card{max-width:180px;margin:0 auto}}
/* 新建角色：生日框限宽，人设支持大视图编辑。 */
.builder-workspace .identity-field input[type="date"]{width:100%;max-width:220px}
.builder-workspace .identity-field-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.details-expand-btn{padding:3px 8px;border:1px solid #cfc2dc;border-radius:4px;background:#f6effb;color:#7e6a92;font:inherit;font-size:10px;cursor:pointer}
.details-expand-btn:hover{background:#ece3f5}
/* 大视图编辑弹窗：粉蓝像素风——阶梯边角、像素标题栏、点阵底纹、粉蓝按钮。 */
.details-modal{background:#2f4f66aa;backdrop-filter:blur(2px)}
.details-modal-card{position:relative;border:0;border-radius:0;background:#eef8fe;padding:0 0 14px;box-shadow:none;clip-path:polygon(0 6px,6px 6px,6px 0,calc(100% - 6px) 0,calc(100% - 6px) 6px,100% 6px,100% calc(100% - 6px),calc(100% - 6px) calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,6px calc(100% - 6px),0 calc(100% - 6px));background-image:radial-gradient(#b7d9ec 1px,transparent 1.2px);background-size:8px 8px;outline:4px solid #7eb5d5;outline-offset:0}
.details-modal-card header{margin:0;padding:10px 12px;background:linear-gradient(90deg,#7eb5d5,#9bcbe7);border-bottom:3px solid #4f829f}
.details-modal-card header h2{color:#fff;font-size:15px;font-weight:900;letter-spacing:.06em;text-shadow:2px 2px 0 #4f829f}
.details-modal-card header button{width:26px;height:24px;border:2px solid #fff;border-radius:0;background:#e584a5;box-shadow:inset -2px -2px #b66582;color:#fff}
.details-modal-card header button:hover{background:#f09bb8}
.details-modal-card header button svg{stroke:#fff;stroke-width:2.4}
.details-modal-card>textarea{margin:14px 16px 0;width:calc(100% - 32px);border:3px solid #b4d9ec;border-radius:0;background:#fff;color:#294b62;box-shadow:inset 3px 3px 0 #e6f4fb;font-family:ui-monospace,monospace;font-size:14px;line-height:1.8;padding:14px}
.details-modal-card>textarea:focus{border-color:#75b6dd;box-shadow:inset 3px 3px 0 #e6f4fb,4px 4px 0 #cbe7f5}
.details-modal-card footer{padding:14px 16px 0}
.details-modal-card footer button{min-width:96px;height:38px;border:3px solid #fff;border-radius:0;background:#e584a5;color:#fff;box-shadow:inset -3px -3px #b66582,3px 3px 0 #4f829f;font-weight:900;letter-spacing:.06em}
.details-modal-card footer button:hover{background:#f09bb8}
.details-modal-card footer button:active{transform:translate(2px,2px);box-shadow:inset -1px -1px #b66582,1px 1px 0 #4f829f}
/* 角色档案页：去掉网格底纹与文件夹造型，改为清晰的两栏信息层级。 */
.poster-detail{background:#f7f4fb;background-image:none}
.profile-sheet-plain{width:min(100%,980px);margin:24px auto 36px;box-sizing:border-box}
.profile-body{background:#fff;border:1px solid #d9cfe6;border-radius:6px;box-shadow:0 2px 0 #e6dcef;padding:22px}
.profile-columns{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr);gap:26px;align-items:start}
.profile-columns .profile-art-column{min-width:0}
.profile-columns .folder-portrait{height:auto;aspect-ratio:1/1;border:1px solid #e3dbec;border-radius:6px;background:#faf7fd}
.profile-columns .folder-fields{display:flex;flex-direction:column;gap:14px}
.profile-columns .folder-field{display:flex;flex-direction:column;gap:6px}
.profile-columns .folder-field span{font-size:12px;font-weight:700;color:#7d6a92}
.profile-columns .folder-field input,.profile-columns .folder-field textarea{width:100%;box-sizing:border-box;border:1px solid #d9cfe6;border-radius:4px;background:#fdfbff;padding:9px 10px;font:inherit;font-size:13px;color:#4a3d5a}
.profile-columns .folder-field textarea{min-height:200px;line-height:1.7;resize:vertical}
.profile-columns .folder-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.profile-columns .folder-portrait img{width:100%;height:100%;object-fit:cover}
.profile-columns .portrait-note,.profile-columns .folder-portrait-decoration{display:none}
@media(max-width:700px){.profile-columns{grid-template-columns:1fr;gap:18px}.profile-columns .folder-portrait{max-width:240px;margin:0 auto}}
/* 贴纸墙：白色主调，细线条与柔和阴影，贴纸像印好的卡片一样平整地放在桌面上。 */
.wall-page{position:fixed;inset:0;z-index:42;overflow:hidden;background:#ffffff;color:#2b2822}
.wall-float{position:absolute;z-index:5;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:5px;border-radius:999px;background:rgba(255,255,255,.94);box-shadow:0 10px 30px -8px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06);backdrop-filter:blur(12px)}
.wall-float>span{padding:0 10px;font-size:12px;font-weight:700;letter-spacing:.04em;color:#1d1d1f;white-space:nowrap}
.wall-back,.wall-add{width:36px;height:36px;padding:0;border:0;border-radius:50%;font:inherit;font-size:18px;font-weight:700;line-height:1;cursor:pointer;transition:background .15s}
.wall-back{background:transparent;color:#1d1d1f}
.wall-back:hover{background:#f2f2f4}
.wall-add{background:#1d1d1f;color:#fff}
.wall-world{height:36px;min-width:52px;padding:0 12px;border:1px solid #d6d6da;border-radius:18px;background:#fff;color:#1d1d1f;font:inherit;font-size:13px;cursor:pointer}
.wall-world:hover{background:#f2f2f4}
.brief-btn{margin-left:auto;padding:3px 9px;border:0;border-radius:12px;background:#1d1d1f;color:#fff;font:inherit;font-size:11px;cursor:pointer}
.brief-btn:disabled{opacity:.5}
.brief-error{margin:6px 0 0;color:#b44;font-size:12px}
.wall-add:hover{background:#333336}
.wall-board{position:absolute;inset:0;overflow:hidden;touch-action:none;background:#ffffff}
.wall-map{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.wall-map path,.wall-map rect{vector-effect:non-scaling-stroke}
.wall-road{fill:none;stroke:#ececec;stroke-width:1.2;stroke-linecap:round}
.wall-road-main{stroke:#e2e2e2;stroke-width:2.4}
.wall-water{fill:#f0f6fb}
.wall-park{fill:#f1f7ef;stroke:#e3ece0;stroke-width:1}
.wall-place{position:absolute;z-index:1;font-size:10px;letter-spacing:.12em;color:#a3a3a8;pointer-events:none;white-space:nowrap}
.wall-place-park{top:8%;left:76%}
.wall-place-road{top:31.5%;left:6%}
.wall-place-water{top:70%;left:14%;color:#a9bfcf}
.wall-compass{position:absolute;z-index:1;top:14px;left:14px;display:grid;place-items:center;width:34px;height:34px;border:1px solid #e5e5e5;border-radius:50%;background:#fff;font-size:10px;font-weight:600;color:#6e6e73;pointer-events:none}
.wall-compass b{position:absolute;top:-1px;font-size:8px;font-weight:400;color:#c7c7cc;transform:translateY(-100%)}
.wall-scale{position:absolute;z-index:1;bottom:calc(env(safe-area-inset-bottom) + 24px);left:16px;font-size:9px;letter-spacing:.08em;color:#a3a3a8;pointer-events:none}
.wall-scale::before{content:"";display:block;width:56px;height:4px;margin-bottom:4px;border:1px solid #bdbdc2;border-top:0}
.wall-star{position:absolute;z-index:1;font-style:normal;color:#d9d9de;pointer-events:none;font-size:13px}
.star-a{top:22%;left:58%}.star-b{top:50%;left:88%}.star-c{top:86%;left:44%}
.wall-deco{position:absolute;z-index:0;pointer-events:none;user-select:none}
.deco-ring{top:20%;left:58%;width:26%;aspect-ratio:1/1;border:1.5px dashed #d6d6db;border-radius:50%}
.deco-tape{top:47%;left:14%;width:72px;height:20px;transform:rotate(-28deg);background:rgba(246,220,226,.7)}
.deco-note{width:118px;padding:10px 11px 12px;font-size:11px;line-height:1.6;color:#4f4a44;box-shadow:0 1px 3px rgba(60,50,30,.07);text-align:left}
.deco-note-hint{top:6%;left:6%;width:auto;padding:8px 10px;background:#fff8d6;transform:rotate(-2deg);color:#6b6253;font-size:10px}
.deco-note-warm{top:61%;left:36%;background:#fff3e4;transform:rotate(2.5deg)}
.deco-note-cool{top:34%;left:76%;background:#eaf3fb;transform:rotate(-3deg);color:#3f5a70}
.wall-empty{position:absolute;inset:0;display:grid;place-items:center;margin:0;padding:24px;text-align:center;color:#8c8273;font-size:13px;line-height:1.8}
.wall-canvas{position:absolute;top:0;left:0;transform-origin:0 0}
.wall-zoom{display:flex;align-items:center;gap:2px}
.wall-zoom button{min-width:30px;height:30px;padding:0 6px;border:0;border-radius:999px;background:transparent;color:#3a3a3c;font:inherit;font-size:14px;cursor:pointer}
.wall-zoom button:hover:not(:disabled){background:#f2f2f4}
.wall-zoom button:disabled{opacity:.35;cursor:default}
.wall-zoom-reset{min-width:52px !important;font-size:12px !important;font-weight:700 !important;color:#1d1d1f !important;font-variant-numeric:tabular-nums}
/* 顶栏：磨砂玻璃半透明白色，地图切换、贴纸按钮、编辑按钮 */
.wall-topbar{position:absolute;z-index:6;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(env(safe-area-inset-top) + 10px) 14px 10px;background:rgba(255,255,255,.62);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border-bottom:.5px solid rgba(0,0,0,.08)}
.wall-map-switch{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 10px 0 12px;border:0;border-radius:999px;background:rgba(255,255,255,.85);box-shadow:0 1px 2px rgba(0,0,0,.06);color:#1c1c1e;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.wall-map-switch svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.wall-map-name{max-width:160px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.wall-topbar-actions{display:flex;align-items:center;gap:8px}
.wall-top-btn{width:36px;height:36px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:0 1px 2px rgba(0,0,0,.06);color:#1c1c1e;cursor:pointer}
.wall-top-btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.wall-top-btn:active{transform:scale(.94)}
.wall-map-menu{position:absolute;top:calc(100% + 6px);left:14px;min-width:200px;margin:0;padding:6px;list-style:none;border-radius:16px;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 10px 30px rgba(0,0,0,.14)}
.wall-map-menu button{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px;padding:0 12px;border:0;border-radius:10px;background:transparent;color:#1c1c1e;font:inherit;font-size:14px;text-align:left;cursor:pointer}
.wall-map-menu button:hover{background:#f2f2f7}
.wall-map-menu button.on{font-weight:700}
.wall-map-menu small{font-size:12px;color:#8e8e93}

/* 便利贴 */
.wall-note{position:absolute;z-index:3;width:clamp(120px,30vw,150px);min-height:96px;padding:12px 12px 10px;box-sizing:border-box;border-radius:4px;color:#2b2822;box-shadow:0 2px 6px rgba(0,0,0,.10),0 6px 14px rgba(0,0,0,.06);cursor:grab;touch-action:none;user-select:none}
.wall-note:active{cursor:grabbing}
.wall-note-text{display:block;font-size:14px;line-height:1.5;overflow-wrap:anywhere;white-space:pre-wrap}
.wall-note-actions{position:absolute;right:4px;bottom:4px;display:flex;gap:2px}
.wall-note-actions button{width:24px;height:24px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.55);color:#3a3a3c;cursor:pointer}
.wall-note-actions svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

/* 贴纸面板与弹窗 */
.wall-sheet-mask{position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.22)}
.wall-sheet-mask-center{align-items:center;padding:24px}
.wall-sheet{width:min(100%,460px);box-sizing:border-box;padding:16px 18px calc(env(safe-area-inset-bottom) + 18px);border-radius:22px 22px 0 0;background:#fff;color:#1c1c1e;box-shadow:0 -10px 30px rgba(0,0,0,.12)}
.wall-sheet-small{border-radius:20px;padding:16px 18px 18px}
.wall-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.wall-sheet-head strong{font-size:17px;font-weight:600}
.wall-sheet-head button{width:30px;height:30px;border:0;border-radius:50%;background:#f2f2f7;color:#8e8e93;font-size:20px;line-height:1;cursor:pointer}
.wall-sheet-input{width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px dashed #c7c7cc;border-radius:14px;background:#f7f7f9;font:inherit;font-size:15px;line-height:1.5;resize:none;outline:0;color:#1c1c1e}
.wall-sheet-input:focus{border-style:solid;border-color:#1c1c1e;background:#fff}
.wall-sheet-input-line{width:100%;box-sizing:border-box;height:44px;padding:0 12px;border:1.5px dashed #c7c7cc;border-radius:12px;background:#f7f7f9;font:inherit;font-size:16px;outline:0}
.wall-sheet-colors{display:flex;gap:10px;margin:12px 0 4px}
.wall-color{width:30px;height:30px;padding:0;border:2px solid transparent;border-radius:50%;cursor:pointer}
.wall-color.on{border-color:#1c1c1e}
.wall-sheet-actions{display:flex;justify-content:flex-end;margin-top:12px}
.wall-sheet-primary{height:40px;padding:0 20px;border:0;border-radius:999px;background:#1c1c1e;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.wall-sheet-primary:disabled{opacity:.35;cursor:not-allowed}
.wall-sheet-hint{margin:10px 0 0;font-size:12px;color:#8e8e93;line-height:1.5}

.wall-sticker{position:absolute;width:clamp(354px,69vw,450px);padding:9px 9px 14px;border:0;border-radius:2px;background:#fdfcfa;color:#2b2822;box-shadow:0 1px 2px rgba(60,45,30,.07),0 3px 8px rgba(60,45,30,.08);font:inherit;text-align:center;cursor:grab;user-select:none;touch-action:none;transition:box-shadow .2s}
.wall-sticker:hover{box-shadow:0 1px 3px rgba(60,45,30,.09),0 5px 12px rgba(60,45,30,.10)}
.wall-sticker.dragging{cursor:grabbing;box-shadow:0 2px 4px rgba(60,45,30,.10),0 8px 16px rgba(60,45,30,.12)}
.wall-sticker:focus-visible{outline:2px solid #2b2822;outline-offset:3px}
.wall-tape{position:absolute;top:-10px;left:50%;width:58px;height:19px;transform:translateX(-50%) rotate(-4deg);background:rgba(240,232,205,.78);box-shadow:0 1px 1px rgba(0,0,0,.06);clip-path:polygon(0 8%,6% 0,12% 8%,18% 0,100% 0,100% 100%,0 100%)}
.wall-tape-b{left:auto;right:-14px;top:12px;width:46px;height:16px;transform:rotate(38deg);background:rgba(214,232,238,.8)}
.wall-no{position:absolute;z-index:1;top:5px;left:7px;font-family:ui-monospace,Menlo,monospace;font-size:8px;letter-spacing:.08em;color:#8e8e93}
.wall-photo{position:relative;display:grid;place-items:center;width:100%;aspect-ratio:2/1;overflow:hidden;background:#e9e4dc}
.wall-photo img{width:100%;height:100%;object-fit:cover;pointer-events:none;filter:saturate(.92) contrast(1.02)}
.wall-initial{font-family:Georgia,"Songti SC",serif;font-size:36px;color:#9b9180}
.wall-name{display:block;margin-top:9px;font-family:Georgia,"Songti SC",serif;font-size:13px;letter-spacing:.04em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
@media(max-width:430px){.wall-sticker{width:min(120vw,384px)}}
/* 角度调整条：贴在底栏上方，白色半透明磨砂 */
.wall-tilt-bar{position:absolute;z-index:6;left:50%;bottom:calc(env(safe-area-inset-bottom) + 78px);transform:translateX(-50%);display:flex;align-items:center;gap:10px;width:min(calc(100% - 28px),420px);box-sizing:border-box;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.78);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);box-shadow:0 6px 20px rgba(0,0,0,.10)}
.wall-tilt-hint{flex:none;font-size:12px;color:#8e8e93;white-space:nowrap}
.wall-tilt-bar input[type=range]{flex:1;min-width:80px;accent-color:#1c1c1e}
.wall-tilt-value{flex:none;min-width:38px;text-align:right;font-size:12px;font-weight:600;color:#1c1c1e;font-variant-numeric:tabular-nums}
.wall-tilt-done{flex:none;height:30px;padding:0 12px;border:0;border-radius:999px;background:#1c1c1e;color:#fff;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
/* 点按贴纸时不要浏览器默认的蓝色高亮 */
.character-app .wall-sticker:active{transform:none!important;filter:none!important;box-shadow:0 2px 6px rgba(0,0,0,.05),0 8px 16px rgba(0,0,0,.06)!important}
.wall-sticker,.wall-note,.wall-photo{-webkit-tap-highlight-color:transparent;outline:none}
.wall-top-btn.on{background:#1c1c1e;color:#fff}
/* 贴纸上的触摸手势交给地图画布：划动即平移地图，长按才拖动贴纸，点按打开档案 */
.wall-sticker{touch-action:none}
/* 档案桌面：浅灰底、白色纸质档案卡、底部黑色胶囊操作栏。 */
.wall-page{background:#f2f2f7}
.wall-board{background:transparent}
.wall-tape{display:none}
.wall-sticker{padding:10px 10px 12px;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06),0 4px 12px rgba(0,0,0,.05)}
.wall-sticker:hover{box-shadow:0 2px 4px rgba(0,0,0,.08),0 8px 18px rgba(0,0,0,.08)}
.wall-sticker.dragging{box-shadow:0 4px 8px rgba(0,0,0,.10),0 12px 24px rgba(0,0,0,.12)}
.wall-no{color:#8e8e93;font-size:9px}
/* 贴纸相片：宽高 2:1，白色纸边，轻微纸张质感，与档案卡一致的小圆角 */
.wall-photo{width:100%;aspect-ratio:2/1;border-radius:3px;background:#f3f1ec;box-shadow:inset 0 0 0 1px rgba(0,0,0,.05),inset 0 0 0 6px #fff,0 1px 2px rgba(0,0,0,.08)}
.wall-photo::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:3px;background:linear-gradient(135deg,rgba(255,255,255,.35),rgba(0,0,0,.03));mix-blend-mode:multiply}
.wall-initial{font-size:32px;color:#8e8e93}
.wall-name{margin-top:8px;font-size:13px;font-weight:600;color:#1c1c1e;letter-spacing:0}
.wall-empty{color:#8e8e93}
/* 底栏：白色半透明磨砂玻璃，贴着屏幕底部。按钮为浅阴影圆形卡片。 */
.wall-float{left:0;right:0;transform:none;bottom:0;width:100%;box-sizing:border-box;justify-content:center;padding:10px 16px calc(env(safe-area-inset-bottom) + 10px);border:0;border-radius:0;background:rgba(255,255,255,.66);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border-top:.5px solid rgba(0,0,0,.08);box-shadow:none}
.wall-float>span{color:#1c1c1e}
.wall-back,.wall-add,.wall-world,.wall-zoom button{width:40px;height:40px;min-width:40px;padding:0;border:0;border-radius:50%;background:#fff;color:#1c1c1e;box-shadow:0 1px 3px rgba(0,0,0,.08),0 2px 8px rgba(0,0,0,.05);cursor:pointer}
.wall-zoom{gap:8px}
.wall-zoom-reset{width:auto;min-width:52px;padding:0 10px;border-radius:999px !important;font-size:12px !important;font-weight:700 !important;color:#1c1c1e !important}
.wall-back:hover,.wall-add:hover,.wall-world:hover,.wall-zoom button:hover:not(:disabled){background:#f7f7f9}
.wall-back:active,.wall-add:active,.wall-world:active,.wall-zoom button:active:not(:disabled){transform:scale(.94)}
.wall-add{background:#1c1c1e;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.18)}
.wall-add:hover{background:#2c2c2e}
.wall-world{width:auto;min-width:52px;padding:0 14px;border-radius:999px;font-size:13px;font-weight:600}
/* 角色档案：与新建页同款的小巧加密文件卡片。 */
.pf-page{position:fixed;inset:0;z-index:42;display:flex;align-items:center;justify-content:center;overflow:auto;box-sizing:border-box;padding:24px;background:#ffffff;color:#1d1d1f}
.pf-file{width:min(100%,300px);display:flex;flex-direction:column;align-items:stretch;gap:14px;font-family:ui-monospace,Menlo,Consolas,monospace}
.pf-delete{padding:0;border:0;background:none;font:inherit;font-size:10px;letter-spacing:.06em;color:#8e8e93;cursor:pointer}
.pf-delete:hover{color:#1d1d1f}
.pf-delete-confirm{color:#b33a3a}
/* 新建角色：小巧的加密档案卡片，白色底，无边框线框。 */
.nb-page{position:fixed;inset:0;z-index:42;display:flex;align-items:center;justify-content:center;overflow:auto;box-sizing:border-box;padding:24px;background:#ffffff;color:#1d1d1f}
.nb-close{position:absolute;top:calc(env(safe-area-inset-top) + 44px);left:20px;height:28px;padding:0 4px;border:0;background:transparent;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:18px;font-weight:700;line-height:1;color:#1d1d1f;cursor:pointer}
.nb-close:hover{opacity:.55}
.nb-file{width:min(100%,300px);display:flex;flex-direction:column;align-items:stretch;gap:14px;font-family:ui-monospace,Menlo,Consolas,monospace}
.nb-photo-wrap{display:flex;justify-content:center}
.nb-photo{position:relative;width:132px;height:165px;display:grid;place-items:center;overflow:hidden;border-radius:4px;background:#f5f5f7;cursor:pointer}
.nb-photo img{width:100%;height:100%;object-fit:cover}
.nb-photo span{font-size:11px;letter-spacing:.06em;color:#8e8e93}
.nb-photo input{position:absolute;inset:0;opacity:0;cursor:pointer}
.nb-code{margin:0;text-align:center;font-size:9px;letter-spacing:.16em;color:#aeaeb2}
.nb-fields{display:flex;flex-direction:column;gap:10px}
.nb-field{display:flex;flex-direction:column;gap:3px;min-width:0}
.nb-field>span{font-size:9px;letter-spacing:.12em;color:#8e8e93}
.nb-field-head{display:flex;justify-content:space-between;align-items:center}
.nb-field input,.nb-field textarea{width:100%;box-sizing:border-box;padding:4px 0 5px;border:0;border-bottom:1px solid #e5e5ea;background:transparent;font:inherit;font-size:13px;color:#1d1d1f;outline:none;border-radius:0}
.nb-field input:focus,.nb-field textarea:focus{border-bottom-color:#1d1d1f}
.nb-field input::placeholder,.nb-field textarea::placeholder{color:#c7c7cc}
.nb-field textarea{resize:none;line-height:1.6}
/* 所属世界下拉框：与输入框同样的下划线样式，去掉系统箭头外观 */
.nb-field select{width:100%;box-sizing:border-box;padding:4px 18px 5px 0;border:0;border-bottom:1px solid #e5e5ea;border-radius:0;background:transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%238e8e93' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 2px center;font:inherit;font-size:13px;color:#1d1d1f;outline:none;cursor:pointer;-webkit-appearance:none;appearance:none}
.nb-field select:focus{border-bottom-color:#1d1d1f}
.nb-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.nb-expand{padding:0;border:0;background:none;font:inherit;font-size:9px;letter-spacing:.08em;color:#1d1d1f;text-decoration:underline;cursor:pointer}
.nb-foot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;font-size:10px;color:#8e8e93}
.nb-save{height:32px;padding:0 16px;border:0;border-radius:999px;background:#1d1d1f;color:#fff;font:inherit;font-size:11px;letter-spacing:.06em;cursor:pointer}
.nb-save:disabled{opacity:.3;cursor:not-allowed}
.nb-modal{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:20px;background:rgba(255,255,255,.75);backdrop-filter:blur(6px)}
.nb-modal-card{width:min(100%,360px);height:min(70vh,420px);display:flex;flex-direction:column;box-sizing:border-box;padding:18px;border-radius:12px;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.10),0 0 0 1px rgba(0,0,0,.04);font-family:ui-monospace,Menlo,Consolas,monospace}
.nb-modal-card header{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:10px}
.nb-modal-card h2{margin:0;font-size:12px;font-weight:700;letter-spacing:.04em}
.nb-modal-card header span{font-size:9px;letter-spacing:.12em;color:#8e8e93}
.nb-modal-card textarea{flex:1;min-height:0;padding:10px;box-sizing:border-box;border:0;border-radius:6px;background:#f7f7f9;font:inherit;font-size:13px;line-height:1.7;resize:none;outline:none}
.nb-modal-card footer{display:flex;justify-content:flex-end;padding-top:12px}
.poster-danger{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:24px auto 0;max-width:980px;padding:14px 0 0;border-top:1px solid #ebebeb;font-size:12px}
.poster-danger>button{padding:8px 14px;border:1px solid #e5e5e5;border-radius:999px;background:#fff;font:inherit;font-size:12px;cursor:pointer;color:#3a3a3c}
.poster-danger>span{color:#8e8e93}
.poster-danger-confirm{background:#b33a3a !important;border-color:#b33a3a !important;color:#fff !important}

/* 新建角色页：浅灰底、白色档案表，虚线输入框，黑色胶囊按钮。仅作用于 .nb-page。 */
.nb-page{background:#f2f2f7;color:#1c1c1e;padding:calc(env(safe-area-inset-top) + 52px) 16px calc(env(safe-area-inset-bottom) + 24px);align-items:flex-start}
.nb-page .nb-close{top:calc(env(safe-area-inset-top) + 12px);left:12px;width:36px;height:36px;display:grid;place-items:center;padding:0;border-radius:50%;background:#fff;color:#1c1c1e;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.nb-page .nb-file{width:min(100%,640px);display:flex;flex-direction:column;gap:14px;padding:16px;box-sizing:border-box;border-radius:20px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.04)}
.nb-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid #e5e5ea}
.nb-head h1{margin:0;font-size:20px;font-weight:700;letter-spacing:.02em;line-height:1.2}
.nb-head p{margin:4px 0 0;font-size:12px;color:#8e8e93}
.nb-id{flex:none;padding:4px 9px;border-radius:999px;background:#1c1c1e;color:#fff;font-size:11px;font-weight:600;letter-spacing:.04em}
.nb-top{display:flex;gap:14px;align-items:stretch}
.nb-page .nb-photo{position:relative;flex:none;width:112px;height:140px;display:grid;place-items:center;overflow:hidden;border-radius:14px;border:1.5px dashed #c7c7cc;background:#f7f7f9;cursor:pointer}
.nb-page .nb-photo img{width:100%;height:100%;object-fit:cover}
.nb-page .nb-photo-empty{display:flex;flex-direction:column;align-items:center;gap:6px;color:#8e8e93}
.nb-page .nb-photo-empty small{font-size:12px}
.nb-page .nb-photo input{position:absolute;inset:0;opacity:0;cursor:pointer}
.nb-top-fields{flex:1;min-width:0;display:flex;flex-direction:column;gap:10px}
.nb-meta{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.nb-page .nb-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.nb-page .nb-field>span{font-size:12px;color:#8e8e93}
.nb-page .nb-field input,.nb-page .nb-field select{width:100%;box-sizing:border-box;height:38px;padding:0 10px;border:1.5px dashed #c7c7cc;border-radius:10px;background:#f7f7f9;color:#1c1c1e;font:inherit;font-size:15px;outline:0}
.nb-page .nb-field input:focus,.nb-page .nb-field select:focus{border-style:solid;border-color:#1c1c1e;background:#fff}
.nb-page .nb-field input::placeholder,.nb-page .nb-field textarea::placeholder{color:#aeaeb2}
.nb-page .nb-field-name input{height:44px;font-size:17px;font-weight:600}
.nb-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.nb-field-wide{grid-column:1 / -1}
.nb-block{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid #e5e5ea}
.nb-block-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.nb-block-head h2{margin:0;font-size:14px;font-weight:700}
.nb-page .nb-expand{width:30px;height:30px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:#f2f2f7;color:#1c1c1e;cursor:pointer}
.nb-page .nb-block textarea{width:100%;box-sizing:border-box;min-height:150px;padding:10px 12px;border:1.5px dashed #c7c7cc;border-radius:12px;background:#f7f7f9;color:#1c1c1e;font:inherit;font-size:15px;line-height:1.6;resize:vertical;outline:0}
.nb-page .nb-block textarea:focus{border-style:solid;border-color:#1c1c1e;background:#fff}
.nb-hint{margin:0;font-size:12px;line-height:1.5;color:#8e8e93}
.nb-page .nb-brief-btn{margin-left:0;padding:6px 12px;font-size:13px;font-weight:600;border-radius:999px;background:#1c1c1e;color:#fff}
.nb-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:12px;border-top:1px solid #e5e5ea;font-size:13px;color:#8e8e93}
.nb-foot-hint{min-width:0}
.nb-page .nb-save{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 20px;border-radius:999px;background:#1c1c1e;color:#fff;font-size:15px;font-weight:600}
.nb-page .nb-save:disabled{opacity:.35}
@media(max-width:520px){.nb-top{flex-direction:column;align-items:center}.nb-top-fields{width:100%}.nb-meta{grid-template-columns:1fr}.nb-page .nb-photo{width:128px;height:156px}}
</style>
