<script setup>
// 手机应用内统一使用的图标，来自 lucide-vue-next（线性 SVG）。
// 保留原有的 name 语义，映射到 lucide 组件，调用方不用改。
import { computed } from 'vue'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  MoreHorizontal,
  Heart,
  Trash2,
  Share,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Zap,
  Circle,
  RefreshCw,
  MessageCircle,
  Mail,
  NotebookPen,
  Music,
  Image,
  Camera,
  Plus,
  Reply,
  Aperture,
  SquarePen,
  ListChecks,
  Table,
  Type,
  Undo2,
  Search,
  Calendar,
  Folder,
  Check,
  Phone,
  Globe,
  Settings,
  User,
  Info,
  Voicemail,
  Grid3x3,
  Users,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Bookmark,
  BookOpen,
  Quote,
  House,
  Receipt,
  QrCode,
  ScanLine,
  Coins,
  CreditCard,
  Utensils,
  Bus,
  ShoppingBag,
  Wallet
} from 'lucide-vue-next'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 22 },
  strokeWidth: { type: Number, default: 2 }
})

const ICONS = {
  back: ChevronLeft,
  chevron: ChevronRight,
  down: ChevronDown,
  close: X,
  dots: MoreHorizontal,
  more: MoreHorizontal,
  heart: Heart,
  trash: Trash2,
  share: Share,
  play: Play,
  pause: Pause,
  prev: SkipBack,
  next: SkipForward,
  flash: Zap,
  live: Circle,
  flip: RefreshCw,
  chat: MessageCircle,
  mail: Mail,
  note: NotebookPen,
  music: Music,
  photos: Image,
  camera: Camera,
  plus: Plus,
  reply: Reply,
  aperture: Aperture,
  pen: SquarePen,
  checklist: ListChecks,
  table: Table,
  aa: Type,
  undo: Undo2,
  search: Search,
  calendar: Calendar,
  folder: Folder,
  check: Check,
  phone: Phone,
  globe: Globe,
  settings: Settings,
  user: User,
  info: Info,
  voicemail: Voicemail,
  keypad: Grid3x3,
  contacts: Users,
  recents: Clock,
  incoming: PhoneIncoming,
  outgoing: PhoneOutgoing,
  missed: PhoneMissed,
  bookmark: Bookmark,
  home: House,
  house: House,
  receipt: Receipt,
  qr: QrCode,
  scan: ScanLine,
  coins: Coins,
  card: CreditCard,
  food: Utensils,
  bus: Bus,
  bag: ShoppingBag,
  wallet: Wallet,
  books: BookOpen,
  quote: Quote
}

const component = computed(() => ICONS[props.name] || Circle)
const sizePx = computed(() => `${props.size}px`)
</script>

<template>
  <component
    :is="component"
    class="phone-icon"
    :size="size"
    :stroke-width="strokeWidth"
    aria-hidden="true"
    focusable="false"
  />
</template>

<style scoped>
.phone-icon { display: block; flex: none; width: v-bind(sizePx); height: v-bind(sizePx); color: currentColor; stroke: currentColor; }
</style>
