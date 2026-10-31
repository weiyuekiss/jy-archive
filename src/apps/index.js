import { defineAsyncComponent } from 'vue'
import BeautifyIcon from '@/components/icons/BeautifyIcon.vue'
import SettingsIcon from '@/components/icons/SettingsIcon.vue'
import ChatIcon from '@/components/icons/ChatIcon.vue'
import CharacterIcon from '@/components/icons/CharacterIcon.vue'

const ChatApp = defineAsyncComponent(() => import('@/pages/ChatApp.vue'))
const BeautifyApp = defineAsyncComponent(() => import('@/pages/BeautifyApp.vue'))
const SettingsApp = defineAsyncComponent(() => import('@/pages/SettingsApp.vue'))
const CharacterApp = defineAsyncComponent(() => import('@/pages/CharacterApp.vue'))

// 桌面布局（与 global.css 中的 --cols / --rows 保持一致）
export const GRID_COLS = 4
export const GRID_ROWS = 6

// 底部 Dock 栏应用，按顺序占据 4 个位置
export const dockApps = [
  { id: 'beautify', name: '美化', icon: BeautifyIcon, page: BeautifyApp },
  { id: 'chat', name: '聊天', icon: ChatIcon, page: ChatApp },
  { id: 'character', name: '人物', icon: CharacterIcon, page: CharacterApp },
  { id: 'settings', name: '设置', icon: SettingsIcon, page: SettingsApp }
]

// 主屏应用（暂无）
export const homeApps = []

