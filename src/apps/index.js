import { defineAsyncComponent } from 'vue'
import { Palette, MessageCircle, UserRound, Settings as SettingsGlyph, Smartphone, BookOpen } from 'lucide-vue-next'

const PhoneCheckApp = defineAsyncComponent(() => import('@/pages/PhoneCheckApp.vue'))
const ChatApp = defineAsyncComponent(() => import('@/pages/ChatApp.vue'))
const BeautifyApp = defineAsyncComponent(() => import('@/pages/BeautifyApp.vue'))
const SettingsApp = defineAsyncComponent(() => import('@/pages/SettingsApp.vue'))
const CharacterApp = defineAsyncComponent(() => import('@/pages/CharacterApp.vue'))
const LorebookApp = defineAsyncComponent(() => import('@/pages/LorebookApp.vue'))

// 桌面布局（与 global.css 中的 --cols / --rows 保持一致）
export const GRID_COLS = 4
export const GRID_ROWS = 6

// 底部 Dock 栏应用，按顺序占据 4 个位置
export const dockApps = [
  { id: 'beautify', name: '美化', icon: Palette, page: BeautifyApp },
  { id: 'chat', name: '聊天', icon: MessageCircle, page: ChatApp },
  { id: 'character', name: '人物', icon: UserRound, page: CharacterApp },
  { id: 'settings', name: '设置', icon: SettingsGlyph, page: SettingsApp }
]

// 主屏应用（暂无）
export const homeApps = [
  { id: 'phone-check', name: '查手机', icon: Smartphone, page: PhoneCheckApp },
  { id: 'lorebook', name: '世界书', icon: BookOpen, page: LorebookApp },
  { id: 'pending-3', name: '待做应用 3', pending: true },
  { id: 'pending-4', name: '待做应用 4', pending: true }
]

