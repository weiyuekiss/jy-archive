// 桌面主题：壁纸（预设/相册自定义）与应用图标风格、液态玻璃质感，持久化到 IndexedDB
import { reactive, watch } from 'vue'
import { loadValue, saveValue } from './db'

// 7 个预设壁纸选项（加上“相册”自定义项刚好 8 列）
export const WALLPAPERS = [
  { id: 'white', name: '纯白', css: '#ffffff' },
  { id: 'cream', name: '暖白', css: '#f6f5f1' },
  { id: 'fog', name: '浅雾', css: 'linear-gradient(180deg, #f2f3f5 0%, #e5e7eb 100%)' },
  { id: 'peach', name: '杏粉', css: 'linear-gradient(180deg, #fef2f2 0%, #fed7aa 100%)' },
  { id: 'sage', name: '淡绿', css: 'linear-gradient(180deg, #f0fdf4 0%, #bbf7d0 100%)' },
  { id: 'sky', name: '空蓝', css: 'linear-gradient(180deg, #f0f9ff 0%, #bae6fd 100%)' },
  { id: 'dark', name: '夜色', css: 'linear-gradient(180deg, #2a2b2e 0%, #17181a 100%)' }
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
  // 壁纸 id，如 'white', 'cream' 或 'custom'
  wallpaper: 'white',
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
  glassTint: 'clear'
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
    if (saved.customIcons && typeof saved.customIcons === 'object') {
      theme.customIcons = { ...saved.customIcons }
    }
  }
})

// 监听变更并保存到 IndexedDB
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
      customIcons: { ...theme.customIcons }
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

