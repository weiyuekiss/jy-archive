<script setup>
// 查手机：选角色，仿 iOS 锁屏输入开机密码，进入角色的灰白点阵风手机桌面
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { loadValue } from '@/stores/db'
import { loadPhoneData, getPhone, checkPhonePassword } from '@/stores/phone'
import { apiSettings, profileSettings } from '@/stores/settings'
import { isPhoneBusy, startFullGenerate, startRefreshGroup, cancelPhoneJob } from '@/stores/phoneGen'
import PhoneWechat from '@/components/phone/PhoneWechat.vue'
import PhoneMail from '@/components/phone/PhoneMail.vue'
import PhoneNotes from '@/components/phone/PhoneNotes.vue'
import PhoneMusic from '@/components/phone/PhoneMusic.vue'
import PhoneAlbum from '@/components/phone/PhoneAlbum.vue'
import PhoneCamera from '@/components/phone/PhoneCamera.vue'
import PhoneCalls from '@/components/phone/PhoneCalls.vue'
import PhoneBrowser from '@/components/phone/PhoneBrowser.vue'
import PhoneCalendar from '@/components/phone/PhoneCalendar.vue'
import PhoneBooks from '@/components/phone/PhoneBooks.vue'
import PhoneAlipay from '@/components/phone/PhoneAlipay.vue'
import PhoneIcon from '@/components/phone/PhoneIcon.vue'
import { extractPhoneMemories } from '@/components/pet/extractPhoneMemories'
import { appendPhoneMemories } from '@/stores/memoryStore'
import { loadValue as loadMemoryValue } from '@/stores/db'

const emit = defineEmits(['close'])

// 记忆提取：候选列表与勾选状态；候选只在预览里显示，确认后才写入
const memoryDialog = ref(null) // { status: 'loading' | 'ready' | 'error', candidates: [], picked: [], message, raw }
const memoryController = ref(null)

async function openMemoryExtract() {
  if (!selected.value || !hasPhone.value) return
  memoryDialog.value = { status: 'loading', candidates: [], picked: [], message: '', raw: '' }
  const controller = new AbortController()
  memoryController.value = controller
  try {
    const all = (await loadMemoryValue('jyos_long_term_memories')) || {}
    const existing = Array.isArray(all[String(selected.value.id)]) ? all[String(selected.value.id)] : []
    const candidates = await extractPhoneMemories({ preset: genPreset.value, character: selected.value, items: items.value, existingMemories: existing, signal: controller.signal })
    if (!candidates.length) {
      memoryDialog.value = { status: 'error', candidates: [], picked: [], message: '模型没有找到值得记住的内容', raw: '' }
      return
    }
    memoryDialog.value = { status: 'ready', candidates, picked: candidates.map((_, i) => i), message: '', raw: '' }
  } catch (error) {
    if (error.name === 'AbortError') memoryDialog.value = null
    else memoryDialog.value = { status: 'error', candidates: [], picked: [], message: error.message, raw: error.raw || '' }
  } finally {
    memoryController.value = null
  }
}

function togglePick(index) {
  const d = memoryDialog.value
  if (!d) return
  const next = d.picked.includes(index) ? d.picked.filter((i) => i !== index) : [...d.picked, index]
  memoryDialog.value = { ...d, picked: next }
}

async function saveMemoryPicks() {
  const d = memoryDialog.value
  if (!d || d.status !== 'ready' || !selected.value) return
  const chosen = d.candidates.filter((_, i) => d.picked.includes(i))
  await appendPhoneMemories(selected.value.id, chosen)
  memoryDialog.value = null
}

function closeMemoryDialog() {
  memoryController.value?.abort()
  memoryDialog.value = null
}

const PASSCODE_LENGTH = 4
const KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '', letters: '' },
  { digit: '0', letters: '' },
  { digit: 'del', letters: '' }
]

const characters = ref([])
const selectedId = ref(null)
const lockStage = ref('lock') // 'lock' 锁屏；'passcode' 输入密码
const passcodeInput = ref('')
const passcodeError = ref('')
const shaking = ref(false)
const unlocked = ref(false)
const screen = ref('home')
const openThreadName = ref('')
const openMailIndex = ref(-1)
const genPresetId = ref('')
// 当前角色是否有后台任务（生成或刷新）；离开页面再回来，状态仍然正确
// 首次生成整台手机的进行中状态，只控制生成按钮
const generating = computed(() => isPhoneBusy(selectedId.value, 'full'))
// 每个应用的刷新各自独立：只让正在刷新的那个应用转圈，其他应用仍可点刷新
function isAppRefreshing(groupKey) {
  return isPhoneBusy(selectedId.value, groupKey)
}
const clock = ref(new Date())
let clockTimer = 0
let shakeTimer = 0

// 桌面应用：灰色圆角方块 + 白色点阵内框 + 星星装饰，和参考图一致
const APPS = [
  { id: 'wechat', label: '微信', icon: 'chat' },
  { id: 'mail', label: '邮箱', icon: 'mail' },
  { id: 'notes', label: '备忘录', icon: 'note' },
  { id: 'music', label: '音乐', icon: 'music' },
  { id: 'photos', label: '相册', icon: 'photos' },
  { id: 'camera', label: '相机', icon: 'camera' },
  { id: 'books', label: '书架', icon: 'books' },
  { id: 'alipay', label: '支付宝', icon: 'wallet' }
]
// Dock 是四个与桌面不同的应用：电话、浏览器、日历、设置
const DOCK = [
  { id: 'phone', icon: 'phone', label: '电话' },
  { id: 'browser', icon: 'globe', label: '浏览器' },
  { id: 'calendar', icon: 'calendar', label: '日历' },
  { id: 'settings', icon: 'settings', label: '设置' }
]

const selected = computed(() => characters.value.find((c) => c.id === selectedId.value) || null)
const phone = computed(() => (selectedId.value != null ? getPhone(selectedId.value) : null))
const hasPhone = computed(() => Boolean(phone.value?.passcode))
const items = computed(() => phone.value?.items || [])
const photos = computed(() => items.value.filter((i) => i.type === 'photos'))
const notes = computed(() => items.value.filter((i) => i.type === 'notes'))
const mails = computed(() => items.value.filter((i) => i.type === 'mails'))
const messageItems = computed(() => items.value.filter((i) => i.type === 'messages'))
const musics = computed(() => items.value.filter((i) => i.type === 'music'))
const calls = computed(() => items.value.filter((i) => i.type === 'calls'))
const browsing = computed(() => items.value.filter((i) => i.type === 'browser'))
const schedule = computed(() => items.value.filter((i) => i.type === 'events'))
const shelfBooks = computed(() => items.value.filter((i) => i.type === 'books'))
// 支付宝页面需要账单和资产两类数据
const alipayItems = computed(() => items.value.filter((i) => i.type === 'bills' || i.type === 'wallet'))
const threads = computed(() => {
  const map = new Map()
  for (const item of items.value.filter((i) => i.type === 'messages')) {
    const name = item.title || '联系人'
    if (!map.has(name)) map.set(name, [])
    map.get(name).push(item)
  }
  return Array.from(map, ([name, list]) => ({ name, list }))
})
const openThread = computed(() => threads.value.find((t) => t.name === openThreadName.value) || null)
const openMail = computed(() => mails.value[openMailIndex.value] || null)
const latestMessage = computed(() => {
  const thread = threads.value[0]
  return thread ? { from: thread.name, text: thread.list.at(-1).text } : null
})
const timeText = computed(() => clock.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }))
const dateText = computed(() => clock.value.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }))
const genPreset = computed(() => apiSettings.presets.find((p) => p.id === genPresetId.value) || apiSettings.presets.find((p) => p.id === apiSettings.currentPresetId) || apiSettings.presets[0])

// 当前月份的日历格子，前面用 null 补齐星期
const calendarCells = computed(() => {
  const now = clock.value
  const first = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: first }, () => null)
  for (let d = 1; d <= days; d += 1) cells.push(d)
  return cells
})
const today = computed(() => clock.value.getDate())
const WEEK_HEADS = ['日', '一', '二', '三', '四', '五', '六']

onMounted(async () => {
  await loadPhoneData()
  const saved = await loadValue('jyos_characters')
  characters.value = Array.isArray(saved) ? saved : []
  clockTimer = window.setInterval(() => { clock.value = new Date() }, 30000)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.clearTimeout(shakeTimer)
  window.removeEventListener('keydown', onKeydown)
})

function pickCharacter(id) {
  selectedId.value = id
  resetLock()
  unlocked.value = false
  screen.value = 'home'
}

function resetLock() {
  lockStage.value = 'lock'
  passcodeInput.value = ''
  passcodeError.value = ''
}

function backToList() {
  selectedId.value = null
  unlocked.value = false
  resetLock()
}

// 仿 iOS：锁屏上轻触进入密码界面
function showPasscode() {
  if (!hasPhone.value) return
  lockStage.value = 'passcode'
}

function cancelPasscode() {
  resetLock()
}

function pressKey(key) {
  if (!hasPhone.value || lockStage.value !== 'passcode' || shaking.value) return
  if (key === 'del') {
    passcodeInput.value = passcodeInput.value.slice(0, -1)
    passcodeError.value = ''
    return
  }
  if (passcodeInput.value.length >= PASSCODE_LENGTH) return
  passcodeInput.value += key
  passcodeError.value = ''
  if (passcodeInput.value.length === PASSCODE_LENGTH) tryUnlock()
}

function tryUnlock() {
  if (checkPhonePassword(selectedId.value, passcodeInput.value)) {
    unlocked.value = true
    resetLock()
    return
  }
  // 密码错误：抖动并清空，和 iOS 一样
  passcodeError.value = '密码错误，再试一次'
  shaking.value = true
  shakeTimer = window.setTimeout(() => {
    shaking.value = false
    passcodeInput.value = ''
  }, 450)
}

function onKeydown(event) {
  if (!selected.value || unlocked.value || lockStage.value !== 'passcode') return
  if (/^\d$/.test(event.key)) pressKey(event.key)
  else if (event.key === 'Backspace') pressKey('del')
  else if (event.key === 'Escape') cancelPasscode()
}

function lock() {
  unlocked.value = false
  screen.value = 'home'
  resetLock()
}

function openApp(id) {
  screen.value = id
  openThreadName.value = ''
  openMailIndex.value = -1
}

// Dock 的「设置」没有应用页，点它直接回到锁屏
function openDock(id) {
  if (id === 'settings') lock()
  else openApp(id)
}

// 任何应用的刷新都会并发刷新全部应用内容（后台进行，离开页面也继续）
// 最近的聊天记录：和该角色的对话最近 RECENT_CHAT_TURNS 条，作为生成手机的上下文
const RECENT_CHAT_TURNS = 60
async function recentChatContext(characterId) {
  const all = (await loadValue('jyos_chat_messages')) || {}
  const list = Array.isArray(all[String(characterId)]) ? all[String(characterId)] : []
  return list
    .filter((m) => m.text && m.type !== 'system-instruction')
    .slice(-RECENT_CHAT_TURNS)
    .map((m) => `${m.from === 'me' ? '用户' : selected.value?.name || '角色'}：${String(m.text).slice(0, 200)}`)
    .join('\n')
}

// 任何应用的刷新都会并发刷新全部应用内容（后台进行，离开页面也继续）
// 当前用户资料的名字：手机内容里提到用户时使用
function currentUserName() {
  const active = profileSettings.profiles.find((p) => p.id === profileSettings.currentProfileId) || profileSettings.profiles[0]
  return active?.name?.trim() || ''
}

// 刷新单个应用：每次点击发一次请求，只更新该应用的内容
async function refreshApp(groupKey) {
  if (!selected.value || isAppRefreshing(groupKey)) return
  const chatContext = await recentChatContext(selectedId.value)
  return startRefreshGroup({ preset: genPreset.value, character: selected.value, groupKey, chatContext, userName: currentUserName() })
}

// 生成手机（首次）：后台进行，完成后弹窗提示
async function generate() {
  const chatContext = await recentChatContext(selectedId.value)
  return startFullGenerate({ preset: genPreset.value, character: selected.value, chatContext, userName: currentUserName() })
}

function cancelGenerate() {
  cancelPhoneJob(selectedId.value)
}
</script>

<template>
  <div class="phone-page">
    <!-- 选角色 -->
    <main v-if="!selected" class="pick-main">
      <button type="button" class="pick-close" aria-label="返回桌面" @click="emit('close')">‹</button>
      <h1 class="pick-title">查手机</h1>
      <p v-if="!characters.length" class="pick-empty">还没有角色，先到人物里创建一个。</p>
      <div class="pick-grid">
        <button v-for="character in characters" :key="character.id" type="button" class="pick-card" @click="pickCharacter(character.id)">
          <span class="pick-avatar">
            <img v-if="character.avatar" :src="character.avatar" :alt="character.name" />
            <span v-else class="pick-initial">{{ character.name.slice(0, 1) }}</span>
          </span>
          <span class="pick-name">{{ character.name }}</span>
        </button>
      </div>
    </main>

    <main v-else class="device">
      <!-- 锁屏：仿 iOS，大号时间，通知，轻触进入密码 -->
      <section v-if="!unlocked" class="lock" :class="{ 'is-passcode': lockStage === 'passcode' }" @click="lockStage === 'lock' && showPasscode()">
        <button v-if="lockStage === 'lock'" type="button" class="device-back" aria-label="返回角色选择" @click.stop="backToList">‹</button>

        <template v-if="lockStage === 'lock'">
          <p class="lock-date">{{ dateText }}</p>
          <p class="lock-clock">{{ timeText }}</p>

          <div v-if="latestMessage" class="notice">
            <span class="notice-app">微信 · 现在</span>
            <span class="notice-title">{{ latestMessage.from }}</span>
            <span class="notice-text">{{ latestMessage.text }}</span>
          </div>

          <p v-if="!hasPhone" class="lock-empty">这台手机还没有内容。生成后，模型会替他设定开机密码。</p>
          <button v-if="!hasPhone" type="button" class="gen-btn" :disabled="generating" @click.stop="generate">
            {{ generating ? '生成中…' : '生成手机' }}
          </button>
          <button v-if="generating" type="button" class="gen-ghost" @click.stop="cancelGenerate">取消</button>

          <p v-if="hasPhone" class="lock-hint">轻触屏幕输入密码</p>
        </template>

        <!-- 密码界面 -->
        <template v-else>
          <p class="pc-title">输入密码</p>
          <div class="pc-dots" :class="{ 'is-shake': shaking }" aria-label="已输入位数">
            <span v-for="n in PASSCODE_LENGTH" :key="n" class="pc-dot" :class="{ 'is-filled': passcodeInput.length >= n }"></span>
          </div>
          <p class="pc-error" aria-live="polite">{{ passcodeError }}</p>

          <div class="pc-keypad" @click.stop>
            <template v-for="(key, index) in KEYS" :key="index">
              <span v-if="key.digit === ''" class="pc-gap"></span>
              <button
                v-else-if="key.digit === 'del'"
                type="button"
                class="pc-key pc-key-del"
                aria-label="删除"
                @click="pressKey('del')"
              ><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 6H9l-6 6 6 6h12z"/><path d="M12 10l5 5M17 10l-5 5"/></svg></button>
              <button v-else type="button" class="pc-key" :aria-label="`数字 ${key.digit}`" @click="pressKey(key.digit)">
                <span class="pc-digit">{{ key.digit }}</span>
                <span class="pc-letters">{{ key.letters }}</span>
              </button>
            </template>
          </div>
          <button type="button" class="pc-cancel" @click.stop="cancelPasscode">取消</button>
        </template>
      </section>

      <!-- 桌面：灰白点阵风，参考图样式 -->
      <section v-else class="desk" :class="{ 'is-app': screen !== 'home', 'is-fullbleed': screen === 'wechat' }">
        <div v-if="screen === 'home'" class="desk-status">
          <span>{{ timeText }}</span>
          <span class="desk-status-right">5G</span>
        </div>

        <template v-if="screen === 'home'">
          <!-- 顶部小组件：头像 + 日历 -->
          <div class="widgets-top">
            <div class="w-avatar">
              <span class="w-avatar-circle">
                <img v-if="selected.avatar" :src="selected.avatar" :alt="selected.name" />
                <span v-else>{{ selected.name.slice(0, 1) }}</span>
              </span>
            </div>
            <div class="w-calendar">
              <div class="w-cal-head"><span v-for="h in WEEK_HEADS" :key="h">{{ h }}</span></div>
              <div class="w-cal-grid">
                <span v-for="(d, i) in calendarCells" :key="i" class="w-cal-day" :class="{ 'is-today': d === today }">{{ d ?? '' }}</span>
              </div>
            </div>
          </div>

          <!-- 时钟与日期胶囊 -->
          <div class="w-clock-pill">
            <span class="w-clock-date">{{ dateText }}</span>
            <span class="w-clock">{{ timeText }}</span>
          </div>

          <!-- 应用图标 -->
          <div class="desk-grid">
            <button v-for="app in APPS" :key="app.id" type="button" class="desk-app" @click="openApp(app.id)">
              <span class="desk-icon"><PhoneIcon :name="app.icon" :size="34" class="desk-svg" /></span>
              <span class="desk-label">{{ app.label }}</span>
            </button>
          </div>


          <div class="mem-entry">
            <button type="button" class="mem-btn" :disabled="!hasPhone" @click="openMemoryExtract">提取记忆到角色</button>
          </div>

          <!-- 底部 Dock -->
          <div class="dock">
            <button v-for="app in DOCK" :key="app.id" type="button" class="dock-app" :aria-label="app.label" @click="openDock(app.id)">
              <span class="dock-icon"><PhoneIcon :name="app.icon" :size="30" class="desk-svg" /></span>
            </button>
          </div>
        </template>

        <!-- 应用页：每个应用各自的界面 -->
        <PhoneWechat
          v-else-if="screen === 'wechat'"
          :items="messageItems"
          :avatar="selected?.avatar || ''"
          :refreshing="isAppRefreshing('messages')"
          @back="screen = 'home'"
          @refresh="refreshApp('messages')"
        />
        <PhoneMail
          v-else-if="screen === 'mail'"
          :items="mails"
          :refreshing="isAppRefreshing('mails')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('mails')"
        />
        <PhoneNotes
          v-else-if="screen === 'notes'"
          :items="notes"
          :refreshing="isAppRefreshing('notes')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('notes')"
        />
        <PhoneMusic
          v-else-if="screen === 'music'"
          :items="musics"
          :refreshing="isAppRefreshing('music')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('music')"
        />
        <PhoneAlipay
          v-else-if="screen === 'alipay'"
          :items="alipayItems"
          :refreshing="isAppRefreshing('alipay')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('alipay')"
        />
        <PhoneBooks
          v-else-if="screen === 'books'"
          :items="shelfBooks"
          :refreshing="isAppRefreshing('books')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('books')"
        />
        <PhoneCalendar
          v-else-if="screen === 'calendar'"
          :items="schedule"
          :refreshing="isAppRefreshing('events')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('events')"
        />
        <PhoneBrowser
          v-else-if="screen === 'browser'"
          :items="browsing"
          :refreshing="isAppRefreshing('browser')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('browser')"
        />
        <PhoneCalls
          v-else-if="screen === 'phone'"
          :items="calls"
          :refreshing="isAppRefreshing('calls')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('calls')"
        />
        <PhoneAlbum
          v-else-if="screen === 'photos'"
          :items="photos"
          :refreshing="isAppRefreshing('photos')"
          :owner-name="selected?.name || ''"
          @back="screen = 'home'"
          @refresh="refreshApp('photos')"
        />
        <PhoneCamera
          v-else-if="screen === 'camera'"
          :photos="photos"
          @back="screen = 'home'"
          @open-photos="screen = 'photos'"
        />
      </section>
    </main>

    <!-- 记忆提取预览：候选可勾选，确认后写入角色的长期记忆（手机记录分类） -->
    <div v-if="memoryDialog" class="mem-backdrop" @click.self="closeMemoryDialog">
      <section class="mem-card" role="dialog" aria-modal="true" aria-label="提取的记忆">
        <h2>提取的记忆</h2>
        <p v-if="memoryDialog.status === 'loading'" class="mem-hint">正在从手机内容里整理…</p>
        <template v-else-if="memoryDialog.status === 'error'">
          <p class="mem-error">{{ memoryDialog.message }}</p>
          <pre v-if="memoryDialog.raw" class="mem-raw">{{ memoryDialog.raw }}</pre>
        </template>
        <template v-else>
          <p class="mem-hint">勾选要保存到角色记忆里的内容，分类为「手机记录」。</p>
          <ul class="mem-list">
            <li v-for="(c, i) in memoryDialog.candidates" :key="i">
              <label>
                <input type="checkbox" :checked="memoryDialog.picked.includes(i)" @change="togglePick(i)" />
                <span class="mem-text">{{ c.content }}</span>
                <small v-if="c.source">来自{{ c.source }}</small>
              </label>
            </li>
          </ul>
        </template>
        <footer class="mem-actions">
          <button type="button" class="mem-btn-ghost" @click="closeMemoryDialog">{{ memoryDialog.status === 'loading' ? '取消' : '关闭' }}</button>
          <button v-if="memoryDialog.status === 'ready'" type="button" class="mem-btn" :disabled="!memoryDialog.picked.length" @click="saveMemoryPicks">保存 {{ memoryDialog.picked.length }} 条</button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mem-entry { margin: 14px 0 0; display: flex; justify-content: center; }
.mem-backdrop { position: fixed; inset: 0; z-index: 320; display: grid; place-items: center; padding: 20px; box-sizing: border-box; background: rgba(0, 0, 0, .45); }
.mem-card { width: min(100%, 380px); max-height: calc(100dvh - 40px); overflow: auto; box-sizing: border-box; padding: 22px; border-radius: 20px; background: #f7f8fa; color: #3c3c43; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; }
.mem-card h2 { margin: 0 0 8px; font-size: 17px; font-weight: 600; }
.mem-hint { margin: 0 0 12px; font-size: 13px; color: #8e8e93; line-height: 1.6; }
.mem-error { margin: 0 0 10px; font-size: 13px; color: #d70015; line-height: 1.6; }
.mem-raw { max-height: 200px; overflow: auto; margin: 0; padding: 10px; border-radius: 10px; background: #fff; font: 12px/1.6 ui-monospace, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.mem-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.mem-list label { display: grid; grid-template-columns: 20px 1fr; gap: 6px 10px; padding: 10px 12px; border-radius: 12px; background: #fff; font-size: 14px; line-height: 1.6; cursor: pointer; }
.mem-list input { margin-top: 4px; }
.mem-list small { grid-column: 2; font-size: 11px; color: #8e8e93; }
.mem-actions { display: flex; gap: 10px; margin-top: 16px; }
.mem-btn, .mem-btn-ghost { flex: 1; min-height: 42px; border: 0; border-radius: 12px; font: inherit; font-size: 14px; cursor: pointer; }
.mem-btn { background: #34c759; color: #fff; font-weight: 600; }
.mem-btn:disabled { opacity: .45; }
.mem-btn-ghost { background: #e5e8ec; color: #3c3c43; }
</style>

<style scoped>
.phone-page {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: #f4f4f6;
  color: #3c3c43;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}

/* 灰白点阵底纹 */
.dot-bg {
  background-color: #f4f4f6;
  background-image: radial-gradient(rgba(255, 255, 255, .9) 1.3px, transparent 1.5px);
  background-size: 16px 16px;
}

/* 选角色 */
.pick-main { height: 100%; overflow-y: auto; padding: max(env(safe-area-inset-top), 52px) 20px 24px; box-sizing: border-box; }
.pick-close { border: 0; background: none; color: #8e8e93; font-size: 30px; line-height: 1; padding: 0; cursor: pointer; }
.pick-title { margin: 14px 0 16px; font-size: 26px; font-weight: 700; letter-spacing: -.02em; color: #3c3c43; }
.pick-empty { color: #8e8e93; font-size: 14px; }
.pick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px 12px; }
.pick-card { display: flex; flex-direction: column; align-items: center; gap: 8px; border: 0; background: none; font: inherit; cursor: pointer; }
.pick-avatar { width: 76px; height: 76px; border-radius: 50%; overflow: hidden; background: #fff; display: grid; place-items: center; box-shadow: 0 2px 10px rgba(0, 0, 0, .08); }
.pick-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pick-initial { font-size: 24px; color: #6e6e73; }
.pick-name { font-size: 13px; color: #3c3c43; max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.device { position: relative; height: 100%; display: flex; flex-direction: column; }

/* ---------- 锁屏（仿 iOS） ---------- */
.lock {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: max(env(safe-area-inset-top), 56px) 22px calc(env(safe-area-inset-bottom) + 28px);
  box-sizing: border-box;
  text-align: center;
  color: #fff;
  background: #000;
  cursor: pointer;
  overflow-y: auto;
}
.lock.is-passcode { cursor: default; }
.device-back { position: absolute; top: max(env(safe-area-inset-top), 44px); left: 14px; border: 0; background: none; color: #8e8e93; font-size: 30px; line-height: 1; cursor: pointer; }
.lock-date { margin: 0; font-size: 16px; font-weight: 500; color: #aeaeb2; }
.lock-clock { margin: 4px 0 26px; font-size: 84px; font-weight: 300; letter-spacing: -.02em; line-height: 1; color: #fff; font-variant-numeric: tabular-nums; }

/* 通知 */
.notice {
  width: 100%;
  max-width: 300px;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, .78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, .05);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.notice-app { font-size: 11px; color: #8e8e93; }
.notice-title { font-size: 14px; font-weight: 600; color: #3c3c43; }
.notice-text { font-size: 13px; color: #3c3c43; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lock-hint { margin: auto 0 0; font-size: 13px; color: #8e8e93; }
.lock-empty { margin: 24px 0 12px; font-size: 13px; color: #8e8e93; line-height: 1.6; max-width: 260px; }
.gen-btn { min-height: 44px; padding: 0 26px; border: 0; border-radius: 22px; background: #636366; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
.gen-btn:disabled { opacity: .45; }
.gen-ghost { margin-top: 8px; border: 0; background: none; color: #8e8e93; font: inherit; font-size: 13px; cursor: pointer; }
.gen-error { margin: 10px 0 0; font-size: 12px; color: #d70015; line-height: 1.5; }

/* ---------- 密码界面（仿 iOS） ---------- */
.pc-title { margin: 56px 0 22px; font-size: 17px; font-weight: 500; color: #fff; }
.pc-dots { display: flex; gap: 22px; margin-bottom: 12px; }
.pc-dots.is-shake { animation: pc-shake .45s ease; }
.pc-dot { width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #8e8e93; box-sizing: border-box; transition: background .12s; }
.pc-dot.is-filled { background: #fff; border-color: #fff; }
.pc-error { min-height: 18px; margin: 0 0 16px; font-size: 13px; color: #d70015; }
.pc-keypad { display: grid; grid-template-columns: repeat(3, 76px); gap: 14px 22px; justify-content: center; }
.pc-gap { width: 76px; height: 76px; }
.pc-key {
  width: 76px;
  height: 76px;
  border: 0;
  border-radius: 50%;
  background: #333;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.pc-key:active { background: #cfcfd4; }
.pc-digit { font-size: 32px; line-height: 1; font-weight: 400; }
.pc-letters { margin-top: 2px; font-size: 10px; letter-spacing: .15em; color: #6e6e73; min-height: 12px; }
.pc-key-del { background: transparent; font-size: 24px; }
.pc-key-del:active { background: transparent; color: #8e8e93; }
.pc-cancel { margin-top: 22px; border: 0; background: none; color: #fff; font: inherit; font-size: 16px; cursor: pointer; }

@keyframes pc-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-7px); }
  80% { transform: translateX(7px); }
}

/* ---------- 手机桌面（参考图：灰白点阵 + 灰色圆角图标） ---------- */
.desk {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: max(env(safe-area-inset-top), 44px) 16px calc(env(safe-area-inset-bottom) + 12px);
  box-sizing: border-box;
  overflow-y: auto;
  background: #000;
  color: #fff;
}
.desk-status { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; margin-bottom: 10px; }
.desk-status-right { font-weight: 500; color: #8e8e93; }
/* 应用页铺满整块手机屏幕，由应用组件自己处理顶部安全区 */
.desk.is-app { position: absolute; inset: 0; padding: max(env(safe-area-inset-top), 52px) 0 0; overflow: hidden; }
/* 微信全屏：去掉容器顶部留白，壁纸延伸到状态栏，顶栏自己避开安全区 */
.desk.is-fullbleed { padding: 0; }
.ico { width: 20px; height: 20px; display: block; flex: none; }

/* 顶部小组件 */
.widgets-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.w-avatar { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 46%; }
.w-avatar-circle { width: 118px; height: 118px; border-radius: 50%; overflow: hidden; background: #fff; display: grid; place-items: center; font-size: 34px; color: #8e8e93; box-shadow: 0 0 0 4px #fff, 0 4px 12px rgba(0, 0, 0, .06); }
.w-avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
/* 液态玻璃：深灰半透明底 + 背景模糊 + 饱和度提升 + 细高光，无白色实线边框 */
.w-calendar {
  width: 50%;
  box-sizing: border-box;
  padding: 10px 8px;
  border-radius: 22px;
  background: rgba(120, 120, 128, .28);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .18), inset 0 -1px 0 rgba(0, 0, 0, .25);
  color: #fff;
}
.w-cal-head, .w-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; }
.w-cal-head { font-size: 10px; color: rgba(255, 255, 255, .6); margin-bottom: 4px; }
.w-cal-grid { row-gap: 4px; }
.w-cal-day { font-size: 10px; color: #fff; line-height: 1.8; }
.w-cal-day.is-today { color: #fff; background: #3a3a3c; border-radius: 50%; width: 18px; height: 18px; line-height: 18px; margin: 0 auto; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25); }

/* 时钟胶囊 */
.w-clock-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(120, 120, 128, .28);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .18), inset 0 -1px 0 rgba(0, 0, 0, .25);
  color: #fff;
}
.w-clock-date { font-size: 13px; color: rgba(255, 255, 255, .72); }
.w-clock { font-size: 26px; font-weight: 300; color: #fff; font-variant-numeric: tabular-nums; }

/* 应用图标：灰色圆角方块，白色点阵内框，参考图的样子 */
.desk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px 8px; margin-top: 22px; }
.desk-app { display: flex; flex-direction: column; align-items: center; gap: 5px; border: 0; background: none; font: inherit; cursor: pointer; }
/* 桌面图标：深灰底，白色 SVG 图案，无边框 */
.desk-icon {
  position: relative;
  width: 62px;
  height: 62px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #3a3a3c;
  box-shadow: none;
}
.desk-svg { color: #fff; }
.desk-label { font-size: 11px; color: #fff; font-weight: 500; }

/* 照片夹子小组件 */

.desk-error { margin: 8px 0 0; font-size: 12px; color: #d70015; text-align: center; }

/* 底部 Dock：液态玻璃质感，半透明底 + 背景模糊 + 饱和度提升，无白色实线边框 */
.dock {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 12px 16px;
  border-radius: 30px;
  background: rgba(120, 120, 128, .28);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .18), inset 0 -1px 0 rgba(0, 0, 0, .25);
}
/* Dock 按钮：只包裹图标，不加边框 */
.dock-app {
  height: 62px;
  border: 0;
  padding: 0;
  background: none;
  display: grid;
  place-items: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.dock-app:active .dock-icon { transform: scale(.94); }
/* Dock 图标：和桌面图标同款的圆角方形，深灰底白色图案 */
.dock-icon {
  width: 62px;
  height: 62px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #3a3a3c;
  transition: transform .15s;
}

/* ---------- 应用页（统一白底） ---------- */
.app-bar { display: flex; align-items: center; gap: 8px; min-height: 40px; margin-bottom: 10px; border-bottom: .5px solid #e5e5ea; }
.app-back { border: 0; background: none; color: #636366; font-size: 28px; line-height: 1; padding: 0 4px 0 0; cursor: pointer; }
.app-title { font-size: 16px; font-weight: 700; }
.app-empty { margin: 24px 0 0; text-align: center; color: #8e8e93; font-size: 13px; }

.row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 2px; border: 0; border-bottom: .5px solid #e5e5ea; background: none; font: inherit; text-align: left; cursor: pointer; color: #3c3c43; }
.row-avatar { flex: none; width: 44px; height: 44px; border-radius: 50%; background: #e5e5ea; display: grid; place-items: center; font-size: 16px; color: #3c3c43; }
.row-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.row-title { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-sub { font-size: 12px; color: #8e8e93; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.chat { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
.bubble-row { display: flex; flex-direction: column; max-width: 82%; }
.bubble-row.is-me { align-self: flex-end; align-items: flex-end; }
.bubble-row.is-them { align-self: flex-start; align-items: flex-start; }
.bubble { padding: 8px 12px; border-radius: 18px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
.is-me .bubble { background: #636366; color: #fff; border-bottom-right-radius: 4px; }
.is-them .bubble { background: #fff; color: #3c3c43; border-bottom-left-radius: 4px; box-shadow: inset 0 0 0 1px #e5e5ea; }
.bubble-time { margin-top: 2px; font-size: 10px; color: #aeaeb2; }

.mail-body { padding: 4px 2px; }
.mail-from { margin: 0 0 12px; font-size: 13px; color: #8e8e93; }
.mail-text { margin: 0; font-size: 15px; line-height: 1.7; white-space: pre-wrap; }

.note { padding: 14px; margin-bottom: 10px; border-radius: 14px; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, .05); }
.note p { margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
.note-time { display: block; margin-top: 8px; font-size: 11px; color: #aeaeb2; }

.song { align-items: flex-start; }
.song-cover { flex: none; width: 44px; height: 44px; border-radius: 10px; background-color: #9b9ba1; background-image: radial-gradient(rgba(255, 255, 255, .45) 1px, transparent 1.2px); background-size: 7px 7px; display: grid; place-items: center; color: #fff; font-size: 18px; }
.song-note { margin-top: 4px; font-size: 12px; line-height: 1.5; color: #636366; white-space: normal; }

.photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.photo { display: flex; flex-direction: column; gap: 4px; aspect-ratio: 1; padding: 10px; border-radius: 4px; background: #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .08); box-sizing: border-box; overflow: hidden; }
.photo-title { font-size: 13px; font-weight: 600; }
.photo-text { font-size: 11px; line-height: 1.5; color: #6e6e73; overflow: hidden; }

/* 错误弹窗：深色卡片，原始输出可滚动、可选中 */
.err-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: grid;
  place-items: center;
  padding: 20px;
  box-sizing: border-box;
  background: rgba(0, 0, 0, .55);
}
.err-card {
  width: min(100%, 360px);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 18px;
  box-sizing: border-box;
  border-radius: 18px;
  background: #2c2c2e;
  color: #fff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, .5);
}
.err-card h2 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.err-reason { margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #ff9f9a; }
.err-label { margin: 0 0 6px; font-size: 12px; color: rgba(255, 255, 255, .6); }
.err-raw {
  flex: 1;
  min-height: 80px;
  max-height: 40vh;
  overflow: auto;
  margin: 0 0 14px;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 10px;
  background: #1c1c1e;
  color: rgba(255, 255, 255, .85);
  font: 11px/1.5 ui-monospace, Menlo, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
  -webkit-user-select: text;
  user-select: text;
}
.err-actions { display: flex; gap: 10px; }
.err-btn {
  flex: 1;
  min-height: 40px;
  border: 0;
  border-radius: 12px;
  background: #3a3a3c;
  color: #fff;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.err-primary { background: #34c759; color: #fff; font-weight: 600; }
</style>
