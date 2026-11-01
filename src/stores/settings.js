// 设置应用数据管理：API 预设、模型配置与用户人设，持久化到 IndexedDB
import { reactive, ref, watch } from 'vue'
import { loadValue, saveValue } from './db'

const STORAGE_KEY_API = 'jyos_api_settings'
const STORAGE_KEY_PROFILE = 'jyos_user_profile'

// 初始默认预设模版（不含用户人设）
const defaultPreset = () => ({
  id: `preset-${Date.now()}`,
  name: '默认预设',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o',
  temperature: 0.8,
  models: []
})

// API 与模型设置状态
export const apiSettings = reactive({
  currentPresetId: '',
  presets: [
    {
      id: 'default',
      name: '默认预设',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
      temperature: 0.8,
      models: []
    }
  ]
})

// User profiles support multiple independent personas while keeping legacy profile data intact.
function createEmptyProfile(id = `profile-${Date.now()}`) {
  return { id, avatar: '', name: '', birthday: '', age: '', occupation: '', bio: '' }
}

export const profileSettings = reactive({ currentProfileId: 'profile-default', profiles: [createEmptyProfile('profile-default')] })
export const userProfile = reactive({ avatar: '', name: '', birthday: '', age: '', occupation: '', bio: '', settingsCover: '' })

function applyActiveProfile() {
  const active = profileSettings.profiles.find((profile) => profile.id === profileSettings.currentProfileId) || profileSettings.profiles[0]
  if (!active) return
  profileSettings.currentProfileId = active.id
  for (const key of ['avatar', 'name', 'birthday', 'age', 'occupation', 'bio']) userProfile[key] = active[key] || ''
}

function syncActiveProfile() {
  const active = profileSettings.profiles.find((profile) => profile.id === profileSettings.currentProfileId)
  if (active) Object.assign(active, Object.fromEntries(['avatar', 'name', 'birthday', 'age', 'occupation', 'bio'].map((key) => [key, userProfile[key]])))
}

export const isSettingsLoaded = ref(false)

// 初始化：从 IndexedDB 加载
async function initSettings() {
  try {
    const savedApi = await loadValue(STORAGE_KEY_API)
    if (savedApi && typeof savedApi === 'object') {
      if (Array.isArray(savedApi.presets) && savedApi.presets.length > 0) {
        apiSettings.presets = savedApi.presets
      }
      if (savedApi.currentPresetId) {
        apiSettings.currentPresetId = savedApi.currentPresetId
      } else if (apiSettings.presets.length > 0) {
        apiSettings.currentPresetId = apiSettings.presets[0].id
      }
    } else {
      apiSettings.currentPresetId = apiSettings.presets[0].id
    }

    const savedProfile = await loadValue(STORAGE_KEY_PROFILE)
    if (savedProfile && typeof savedProfile === 'object') {
      userProfile.settingsCover = savedProfile.settingsCover || ''
      if (Array.isArray(savedProfile.profiles) && savedProfile.profiles.length) {
        profileSettings.profiles = savedProfile.profiles.map((profile) => ({ ...createEmptyProfile(profile.id), ...profile }))
        profileSettings.currentProfileId = savedProfile.currentProfileId || profileSettings.profiles[0].id
      } else {
        const legacyProfile = createEmptyProfile('profile-default')
        for (const key of ['avatar', 'name', 'birthday', 'age', 'occupation', 'bio']) legacyProfile[key] = savedProfile[key] || ''
        profileSettings.profiles = [legacyProfile]
        profileSettings.currentProfileId = legacyProfile.id
      }
      applyActiveProfile()
    }
  } catch (err) {
    console.warn('[settings] 加载失败，使用初始配置', err)
  } finally {
    isSettingsLoaded.value = true
  }
}

initSettings()

// 自动防抖保存 API 设置
let apiTimer = null
watch(
  apiSettings,
  () => {
    if (!isSettingsLoaded.value) return
    clearTimeout(apiTimer)
    apiTimer = setTimeout(() => {
      saveValue(STORAGE_KEY_API, JSON.parse(JSON.stringify(apiSettings)))
    }, 400)
  },
  { deep: true }
)

// 自动防抖保存用户人设
let profileTimer = null
watch(
  userProfile,
  () => {
    if (!isSettingsLoaded.value) return
    syncActiveProfile()
    clearTimeout(profileTimer)
    profileTimer = setTimeout(() => {
      saveValue(STORAGE_KEY_PROFILE, JSON.parse(JSON.stringify({ ...profileSettings, settingsCover: userProfile.settingsCover })))
    }, 400)
  },
  { deep: true }
)

watch(
  profileSettings,
  () => {
    if (!isSettingsLoaded.value) return
    clearTimeout(profileTimer)
    profileTimer = setTimeout(() => {
      saveValue(STORAGE_KEY_PROFILE, JSON.parse(JSON.stringify({ ...profileSettings, settingsCover: userProfile.settingsCover })))
    }, 400)
  },
  { deep: true }
)

// 手动保存人设
export async function persistProfile() {
  syncActiveProfile()
  return await saveValue(STORAGE_KEY_PROFILE, JSON.parse(JSON.stringify({ ...profileSettings, settingsCover: userProfile.settingsCover })))
}

export async function createUserProfile(name = '') {
  const profile = createEmptyProfile(`profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
  profile.name = name
  profileSettings.profiles.push(profile)
  profileSettings.currentProfileId = profile.id
  applyActiveProfile()
  await persistProfile()
  return profile
}

export async function selectUserProfile(id) {
  syncActiveProfile()
  if (!profileSettings.profiles.some((profile) => profile.id === id)) return
  profileSettings.currentProfileId = id
  applyActiveProfile()
  await persistProfile()
}

export async function deleteUserProfile(id) {
  if (profileSettings.profiles.length <= 1) return false
  const index = profileSettings.profiles.findIndex((profile) => profile.id === id)
  if (index < 0) return false
  profileSettings.profiles.splice(index, 1)
  if (profileSettings.currentProfileId === id) {
    profileSettings.currentProfileId = profileSettings.profiles[Math.max(0, index - 1)].id
    applyActiveProfile()
  }
  await persistProfile()
  return true
}

// 手动保存 API 配置
export async function persistApiSettings() {
  return await saveValue(STORAGE_KEY_API, JSON.parse(JSON.stringify(apiSettings)))
}

// 清空用户人设（恢复为未配置状态）
export function resetUserProfile() {
  userProfile.avatar = ''
  userProfile.name = ''
  userProfile.birthday = ''
  userProfile.age = ''
  userProfile.occupation = ''
  userProfile.bio = ''
  userProfile.settingsCover = ''
}

// 获取当前预设对象
export function getCurrentPreset() {
  let preset = apiSettings.presets.find((p) => p.id === apiSettings.currentPresetId)
  if (!preset && apiSettings.presets.length > 0) {
    preset = apiSettings.presets[0]
    apiSettings.currentPresetId = preset.id
  }
  return preset
}

// 添加新预设
export function addPreset(name = '新预设') {
  const newP = defaultPreset()
  newP.name = name
  apiSettings.presets.push(newP)
  apiSettings.currentPresetId = newP.id
  return newP
}

// 删除预设
export function removePreset(id) {
  if (apiSettings.presets.length <= 1) {
    return false // 至少保留一个预设
  }
  const idx = apiSettings.presets.findIndex((p) => p.id === id)
  if (idx !== -1) {
    apiSettings.presets.splice(idx, 1)
    if (apiSettings.currentPresetId === id) {
      apiSettings.currentPresetId = apiSettings.presets[0].id
    }
    return true
  }
  return false
}

// 复制预设
export function duplicatePreset(id) {
  const target = apiSettings.presets.find((p) => p.id === id)
  if (!target) return null
  const newP = JSON.parse(JSON.stringify(target))
  newP.id = `preset-${Date.now()}`
  newP.name = `${target.name} (副本)`
  apiSettings.presets.push(newP)
  apiSettings.currentPresetId = newP.id
  return newP
}

// 拉取模型列表逻辑（OpenAI 兼容 /v1/models）
export async function fetchModelsFromApi(baseUrl, apiKey) {
  let cleanUrl = (baseUrl || '').trim()
  if (!cleanUrl) {
    throw new Error('请先填写 API 地址')
  }
  // 规范化 URL：去除末尾斜杠
  cleanUrl = cleanUrl.replace(/\/+$/, '')
  // 如果末尾没有 /models，添加 /models
  const targetUrl = cleanUrl.endsWith('/models') ? cleanUrl : `${cleanUrl}/models`

  const headers = {
    'Content-Type': 'application/json'
  }
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
  }

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    let errMsg = `请求失败 (${response.status} ${response.statusText})`
    try {
      const errData = await response.json()
      if (errData?.error?.message) {
        errMsg = errData.error.message
      }
    } catch {
      // 无法转 JSON 则忽略
    }
    throw new Error(errMsg)
  }

  const data = await response.json()
  let list = []
  if (Array.isArray(data)) {
    list = data.map((item) => (typeof item === 'string' ? item : item.id)).filter(Boolean)
  } else if (Array.isArray(data?.data)) {
    list = data.data.map((item) => item.id).filter(Boolean)
  } else if (Array.isArray(data?.models)) {
    list = data.models.map((item) => (typeof item === 'string' ? item : item.name || item.id)).filter(Boolean)
  } else {
    throw new Error('未识别的模型列表响应格式')
  }

  // 排序去重
  return Array.from(new Set(list)).sort()
}
