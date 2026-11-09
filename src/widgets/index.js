// 小组件注册表：新增小组件时在这里添加一项，并在 WidgetView.vue 中实现对应 type
// w / h 为占用的桌面格数（列 × 行）

export const WIDGET_SIZES = [
  { key: '2x2', label: '小号', w: 2, h: 2 },
  { key: '4x2', label: '中号', w: 4, h: 2 },
  { key: '4x4', label: '大号', w: 4, h: 4 }
]

export const widgetCatalog = [
  // 2 × 2
  { id: 'clock-analog', name: '极简时钟', w: 2, h: 2 },
  { id: 'date-card', name: '今日', w: 2, h: 2 },
  { id: 'quote', name: '一句话', w: 2, h: 2 },
  { id: 'weather', name: '天气', w: 2, h: 2 },
  { id: 'x-profile', name: 'X 主页', w: 2, h: 2 },
  { id: 'ig-card', name: 'IG 快照', w: 2, h: 2 },
  { id: 'stamp', name: '韩系邮票', w: 2, h: 2 },
  { id: 'couple-day', name: '双人纪念日', w: 2, h: 2 },
  // 4 × 2
  { id: 'time-wide', name: '时间横幅', w: 4, h: 2 },
  { id: 'clock-bold', name: '粗体数字时钟', w: 4, h: 2 },
  { id: 'music', name: '音乐播放', w: 4, h: 2 },
  { id: 'music-disc', name: '音乐唱片', w: 2, h: 2 },
  { id: 'dday', name: '纪念日', w: 4, h: 2 },
  { id: 'week-strip', name: '本周', w: 4, h: 2 },
  { id: 'route-line', name: '路程航线', w: 4, h: 2 },
  { id: 'film-strip', name: '胶片记忆', w: 4, h: 2 },
  // 4 × 4
  { id: 'calendar', name: '月历', w: 4, h: 4 },
  { id: 'polaroid', name: '拍立得', w: 4, h: 4 },
  { id: 'memo', name: '备忘', w: 4, h: 4 },
  { id: 'profile-card', name: '主页大卡片', w: 4, h: 4 },
  { id: 'profile-card-clean', name: '无字主页大卡片', w: 4, h: 4 }
]

export const sizeKey = (w, h) => `${w}x${h}`

export const getWidget = (id) => widgetCatalog.find((w) => w.id === id)
