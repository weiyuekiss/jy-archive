// 小组件注册表：新增小组件时在这里添加一项，并在 WidgetView.vue 中实现对应 type
// w / h 为占用的桌面格数（列 × 行）

export const WIDGET_SIZES = [
  { key: '2x2', label: '小号', w: 2, h: 2 },
  { key: '4x2', label: '中号', w: 4, h: 2 },
  { key: '4x4', label: '大号', w: 4, h: 4 }
]

export const widgetCatalog = [
  // 2 × 2
  { id: 'ins-photo-clock', name: 'INS 照片时钟', w: 2, h: 2 },
  { id: 'ins-status-card', name: 'INS 状态卡', w: 2, h: 2 },
  // 4 × 2
  { id: 'ins-quote-photo', name: 'INS 照片文字', w: 4, h: 2 },
  { id: 'ins-dual-photo', name: 'INS 双照片', w: 4, h: 2 },
  { id: 'ins-weather-clear', name: 'INS 透明天气', w: 2, h: 2 },
  { id: 'ins-qr-pay', name: 'INS 扫码付款', w: 2, h: 2 },
  { id: 'ins-avatar-circle', name: 'INS 圆形头像', w: 2, h: 2 },
  { id: 'ins-inbox-tip', name: 'INS 信息接收', w: 2, h: 2 },
  { id: 'clock-date', name: '日期时钟', w: 4, h: 2 },
  { id: 'ins-daily-copy', name: 'INS 每日文案', w: 4, h: 2 },
  { id: 'ins-film-clock', name: 'INS 氛围时间', w: 4, h: 2 },
  { id: 'ins-bw-date', name: 'INS 黑白日期', w: 4, h: 2 },
  // 4 × 4
  { id: 'ins-story-note', name: 'INS 照片文案', w: 4, h: 4 },
  { id: 'ins-memory-album', name: 'INS 回忆相册', w: 4, h: 4 },
  { id: 'ins-dashboard', name: 'INS 功能面板', w: 4, h: 4 }
]
