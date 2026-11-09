// 桌面主题：壁纸（预设/相册自定义）与应用图标风格、液态玻璃质感，持久化到 IndexedDB
import { reactive, watch } from 'vue'
import { loadValue, saveValue } from './db'

// 7 个低饱和浅色渐变壁纸（加上“相册”自定义项）
export const WALLPAPERS = [
  { id: 'mint', name: '雾感薄荷', css: 'linear-gradient(135deg, #b8dfcc 0%, #cce4c7 52%, #e8e5c8 100%)' },
  { id: 'cream', name: '晨光奶油', css: 'linear-gradient(145deg, #f0d9a8 0%, #e8c99e 48%, #f3e3c1 100%)' },
  { id: 'sky', name: '浅天空', css: 'linear-gradient(160deg, #b6d5e8 0%, #b9dfdc 55%, #e5dfc7 100%)' },
  { id: 'lavender', name: '淡薰衣草', css: 'linear-gradient(145deg, #c9b9e2 0%, #ddc4dc 52%, #ead7b0 100%)' },
  { id: 'blush', name: '柔粉晨光', css: 'linear-gradient(135deg, #e8b7c9 0%, #cbb8df 38%, #edcf9f 72%, #eee4cf 100%)' },
  { id: 'sage', name: '清浅鼠尾草', css: 'linear-gradient(150deg, #b9d0b9 0%, #d3d6ad 50%, #e9d9b4 100%)' },
  { id: 'blue-fog', name: '云雾浅蓝', css: 'linear-gradient(145deg, #b3c9e0 0%, #bad7d5 52%, #e6d8bd 100%)' }
]

// 5 个低饱和韩系液态玻璃色调预设（Korean Muted Glass Tints）
export const GLASS_TINTS = [
  {
    id: 'clear',
    name: '水漾冰透',
    sub: 'Pure Dew',
    accent: '#dce4ec',
    widgetBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.62) 0%, rgba(255, 255, 255, 0.28) 100%)',
    iconBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0.24) 100%)',
    border: 'rgba(255, 255, 255, 0.8)',
    sheen: 'rgba(255, 255, 255, 0.65)'
  },
  {
    id: 'cream',
    name: '燕麦温润',
    sub: 'Oat Milk',
    accent: '#f2eae1',
    widgetBg: 'linear-gradient(135deg, rgba(248, 245, 239, 0.65) 0%, rgba(244, 238, 230, 0.32) 100%)',
    iconBg: 'linear-gradient(135deg, rgba(248, 245, 239, 0.72) 0%, rgba(244, 238, 230, 0.28) 100%)',
    border: 'rgba(255, 252, 246, 0.85)',
    sheen: 'rgba(255, 253, 248, 0.7)'
  },
  {
    id: 'blush',
    name: '烟粉晨曦',
    sub: 'Peach Glow',
    accent: '#f6e7e4',
    widgetBg: 'linear-gradient(135deg, rgba(254, 244, 242, 0.64) 0%, rgba(250, 235, 233, 0.3) 100%)',
    iconBg: 'linear-gradient(135deg, rgba(254, 244, 242, 0.72) 0%, rgba(250, 235, 233, 0.26) 100%)',
    border: 'rgba(255, 246, 245, 0.85)',
    sheen: 'rgba(255, 248, 247, 0.7)'
  },
  {
    id: 'sage',
    name: '冷雾鼠尾',
    sub: 'Misty Sage',
    accent: '#e6ede7',
    widgetBg: 'linear-gradient(135deg, rgba(241, 247, 242, 0.64) 0%, rgba(232, 242, 234, 0.3) 100%)',
    iconBg: 'linear-gradient(135deg, rgba(241, 247, 242, 0.72) 0%, rgba(232, 242, 234, 0.26) 100%)',
    border: 'rgba(247, 254, 249, 0.85)',
    sheen: 'rgba(250, 255, 251, 0.7)'
  },
  {
    id: 'fog',
    name: '浅雾灰调',
    sub: 'Cloud Fog',
    accent: '#e7ecf2',
    widgetBg: 'linear-gradient(135deg, rgba(243, 246, 250, 0.64) 0%, rgba(234, 239, 245, 0.3) 100%)',
    iconBg: 'linear-gradient(135deg, rgba(243, 246, 250, 0.72) 0%, rgba(234, 239, 245, 0.26) 100%)',
    border: 'rgba(250, 252, 255, 0.85)',
    sheen: 'rgba(252, 254, 255, 0.7)'
  }
]

// 5 个图标风格预设
export const ICON_STYLES = [
  {
    id: 'default',
    name: '经典白',
    vars: {
      '--icon-bg': '#ffffff',
      '--icon-fg': '#2e2e33',
      '--icon-shadow': '0 4px 14px rgba(40, 40, 50, 0.08)'
    }
  },
  {
    id: 'dark',
    name: '深色',
    vars: {
      '--icon-bg': '#2b2b2e',
      '--icon-fg': '#ffffff',
      '--icon-shadow': '0 4px 14px rgba(0, 0, 0, 0.22)'
    }
  },
  {
    id: 'cream',
    name: '燕麦',
    vars: {
      '--icon-bg': '#f4ede4',
      '--icon-fg': '#5c4e43',
      '--icon-shadow': '0 4px 12px rgba(92, 78, 67, 0.08)'
    }
  },
  {
    id: 'peach',
    name: '烟粉',
    vars: {
      '--icon-bg': '#f5e8e6',
      '--icon-fg': '#6b4f4f',
      '--icon-shadow': '0 4px 12px rgba(107, 79, 79, 0.08)'
    }
  },
  {
    id: 'sage',
    name: '鼠尾草',
    vars: {
      '--icon-bg': '#e7efe8',
      '--icon-fg': '#3c5843',
      '--icon-shadow': '0 4px 12px rgba(60, 88, 67, 0.08)'
    }
  }
]

export const theme = reactive({
  // 壁纸 id，如 'mint', 'cream' 或 'custom'
  wallpaper: 'blush',
  // 自定义壁纸 Base64 或 URL
  customImage: '',
  // 图标风格 id
  iconStyle: 'default',
  // 自定义单个应用图标映射：{ [appId]: '图片 URL 或相册图片 Base64' }
  customIcons: {},
  // 组件白色部分液态玻璃质感化
  widgetGlass: false,
  // 图标液态玻璃质感化
  iconGlass: false,
  // 低饱和韩风玻璃色系
  glassTint: 'clear',
  fontAssignments: {},
  fonts: [],
  chatBeautifyCss: ''
})

// 根据 wallpaper ID 与自定义图片生成背景 CSS
export function wallpaperCss(wallpaperId, customImage) {
  if (wallpaperId === 'custom') {
    return customImage ? `url("${customImage}") center / cover no-repeat` : '#ffffff'
  }
  const found = WALLPAPERS.find((w) => w.id === wallpaperId)
  return found ? found.css : '#ffffff'
}

// 获取玻璃风格的 CSS 变量
export function glassVars(tintId = 'clear') {
  const found = GLASS_TINTS.find((t) => t.id === tintId) || GLASS_TINTS[0]
  return {
    '--glass-widget-bg': found.widgetBg,
    '--glass-icon-bg': found.iconBg,
    '--glass-border': found.border,
    '--glass-sheen': found.sheen
  }
}

export function wallpaperSurfaceVars(wallpaperId) {
  const surfaces = {
    mint: ['rgba(226, 241, 231, 0.88)', '#476454'],
    cream: ['rgba(250, 240, 220, 0.9)', '#6b5b43'],
    sky: ['rgba(225, 239, 246, 0.9)', '#466171'],
    lavender: ['rgba(237, 230, 246, 0.9)', '#5d506f'],
    blush: ['rgba(245, 228, 238, 0.9)', '#6b5263'],
    sage: ['rgba(229, 239, 226, 0.9)', '#4d624d'],
    'blue-fog': ['rgba(226, 236, 246, 0.9)', '#4d6072'],
    custom: ['rgba(242, 239, 232, 0.88)', '#4c4b47']
  }
  const [surface, foreground] = surfaces[wallpaperId] || surfaces.mint
  return {
    '--icon-bg': surface,
    '--icon-fg': foreground,
    '--dock-bg': surface,
    '--dock-border': 'rgba(255, 255, 255, 0.42)',
    '--dock-highlight': 'rgba(255, 255, 255, 0.42)'
  }
}

// 获取图标风格的 CSS 变量
export function iconStyleVars(styleId) {
  const found = ICON_STYLES.find((s) => s.id === styleId)
  return found?.vars || ICON_STYLES[0].vars
}

// 从 IndexedDB 读取主题配置
loadValue('theme').then((saved) => {
  if (saved) {
    if (typeof saved.wallpaper === 'string') theme.wallpaper = saved.wallpaper
    if (typeof saved.customImage === 'string') theme.customImage = saved.customImage
    if (typeof saved.iconStyle === 'string') theme.iconStyle = saved.iconStyle
    if (typeof saved.widgetGlass === 'boolean') theme.widgetGlass = saved.widgetGlass
    if (typeof saved.iconGlass === 'boolean') theme.iconGlass = saved.iconGlass
    if (typeof saved.glassTint === 'string') theme.glassTint = saved.glassTint
    if (saved.fontAssignments && typeof saved.fontAssignments === 'object') theme.fontAssignments = { ...saved.fontAssignments }
    if (Array.isArray(saved.fonts)) theme.fonts = saved.fonts
    if (typeof saved.chatBeautifyCss === 'string') theme.chatBeautifyCss = saved.chatBeautifyCss
    if (saved.customIcons && typeof saved.customIcons === 'object') {
      theme.customIcons = { ...saved.customIcons }
    }
  }
})

  const fonts = [...theme.fonts]
  for (const font of fonts) {
    if (!font.data || !font.family) continue
    const id = `jy-font-${font.id}`
    let style = document.getElementById(id)
    if (!style) { style = document.createElement('style'); style.id = id; document.head.appendChild(style) }
    style.textContent = `@font-face { font-family: "${String(font.family).replace(/["\\\\]/g, '')}"; src: url("${font.data}"); font-display: swap; }`
  }
  watch(
  theme,
  () => {
    saveValue('theme', {
      wallpaper: theme.wallpaper,
      customImage: theme.customImage,
      iconStyle: theme.iconStyle,
      widgetGlass: theme.widgetGlass,
      iconGlass: theme.iconGlass,
      glassTint: theme.glassTint,
      customIcons: { ...theme.customIcons },
      fonts: theme.fonts.map((font) => ({ ...font })),
      fontAssignments: { ...theme.fontAssignments },
      chatBeautifyCss: theme.chatBeautifyCss
    })
  },
  { deep: true }
)

// 应用主题设置
export function applyTheme({ wallpaper, iconStyle, customImage, customIcons, widgetGlass, iconGlass, glassTint }) {
  if (wallpaper !== undefined) theme.wallpaper = wallpaper
  if (iconStyle !== undefined) theme.iconStyle = iconStyle
  if (customImage !== undefined) theme.customImage = customImage
  if (customIcons !== undefined) theme.customIcons = { ...customIcons }
  if (widgetGlass !== undefined) theme.widgetGlass = widgetGlass
  if (iconGlass !== undefined) theme.iconGlass = iconGlass
  if (glassTint !== undefined) theme.glassTint = glassTint
}

// 兼容旧接口
export function applyThemeConfig(config) {
  applyTheme(config)
}

/**
 * 压缩相册上传的图片文件，生成适宜存储在 IndexedDB 的 base64
 * @param {File} file 
 * @param {number} maxDimension 最长边尺寸（壁纸1600，图标512）
 * @param {number} quality 质量 0~1
 */
export function compressImageFile(file, maxDimension = 1440, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('不是有效的图片文件'))
    }
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('图片加载失败'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        // 转为 jpeg 格式节省体积
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

