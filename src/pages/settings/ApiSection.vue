<script setup>
import { computed, ref } from 'vue'
import {
  apiSettings,
  getCurrentPreset,
  addPreset,
  removePreset,
  duplicatePreset,
  fetchModelsFromApi,
  persistApiSettings
} from '@/stores/settings'

const emit = defineEmits(['toast', 'back'])

const currentPreset = computed(() => getCurrentPreset() || apiSettings.presets[0])
const isFetchingModels = ref(false)
const modelSearchQuery = ref('')
const showApiKey = ref(false)
const showPresetModal = ref(false)
const newPresetName = ref('')
const showModelList = ref(false)
const activeTab = ref('connect')

const commonBaseUrls = [
  { name: 'OpenAI 官方', url: 'https://api.openai.com/v1' },
  { name: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { name: 'Moonshot (Kimi)', url: 'https://api.moonshot.cn/v1' },
  { name: 'Ollama 本地', url: 'http://localhost:11434/v1' }
]

function applyBaseUrl(url) {
  if (currentPreset.value) currentPreset.value.baseUrl = url
}

function selectPreset(id) {
  apiSettings.currentPresetId = id
}

function handleAddPreset() {
  newPresetName.value = ''
  showPresetModal.value = true
}

function confirmAddPreset() {
  const name = newPresetName.value.trim()
  if (!name) return
  const p = addPreset(name)
  showPresetModal.value = false
  emit('toast', `已创建「${p.name}」`)
}

function handleDuplicatePreset() {
  if (!currentPreset.value) return
  const p = duplicatePreset(currentPreset.value.id)
  if (p) emit('toast', `已复制为「${p.name}」`)
}

const pendingDelete = ref(null)

function handleDeletePreset(id) {
  if (apiSettings.presets.length <= 1) {
    emit('toast', '至少保留一个预设')
    return
  }
  const target = apiSettings.presets.find((p) => p.id === id)
  pendingDelete.value = { id, name: target ? target.name : '该预设' }
}

function confirmDeletePreset() {
  const { id, name } = pendingDelete.value || {}
  pendingDelete.value = null
  if (id && removePreset(id)) emit('toast', `已删除「${name}」`)
}

async function handleFetchModels() {
  const preset = currentPreset.value
  if (!preset) return
  if (!preset.baseUrl) {
    emit('toast', '请先输入接口地址')
    return
  }
  isFetchingModels.value = true
  try {
    const list = await fetchModelsFromApi(preset.baseUrl, preset.apiKey)
    preset.models = list
    emit('toast', `成功获取 ${list.length} 个模型`)
  } catch (err) {
    emit('toast', `拉取失败: ${err.message || '网络或鉴权错误'}`)
  } finally {
    isFetchingModels.value = false
  }
}

const filteredModels = computed(() => {
  const list = currentPreset.value?.models || []
  if (!modelSearchQuery.value.trim()) return list
  const q = modelSearchQuery.value.trim().toLowerCase()
  return list.filter((m) => m.toLowerCase().includes(q))
})

function selectModel(modelName) {
  if (currentPreset.value) {
    currentPreset.value.model = modelName
    persistApiSettings()
    emit('toast', `已选用模型: ${modelName}`)
  }
}

function handleSaveCurrentModel() {
  persistApiSettings()
  emit('toast', `已保存配置 (${currentPreset.value?.model || '默认'})`)
}
</script>

<template>
  <div class="ios-page">
    <nav class="ios-nav">
      <button type="button" class="ios-back" aria-label="返回设置" @click="emit('back')">‹</button>
    </nav>
    <h1 class="ios-page-title">API 配置</h1>

    <!-- 预设：选择、新增、复制、删除 -->
    <p class="ios-section-label">预设</p>
    <div class="ios-group-wrap">
      <div class="ios-group">
        <label class="ios-field">
          <span>当前预设</span>
          <select class="ios-input ios-select-input" :value="currentPreset.id" aria-label="选择预设" @change="selectPreset($event.target.value)">
            <option v-for="p in apiSettings.presets" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
      </div>
      <div class="ios-btn-row">
        <button type="button" class="ios-btn-pill" @click="handleAddPreset">新增</button>
        <button type="button" class="ios-btn-pill" @click="handleDuplicatePreset">复制</button>
        <button v-if="apiSettings.presets.length > 1" type="button" class="ios-btn-pill ios-btn-danger" aria-label="删除当前预设" @click="handleDeletePreset(currentPreset.id)">删除</button>
      </div>
    </div>

    <!-- 分段：连接 / 模型 -->
    <div class="ios-segment" role="tablist">
      <button type="button" role="tab" :class="{ on: activeTab === 'connect' }" :aria-selected="activeTab === 'connect'" @click="activeTab = 'connect'">连接</button>
      <button type="button" role="tab" :class="{ on: activeTab === 'model' }" :aria-selected="activeTab === 'model'" @click="activeTab = 'model'">模型</button>
    </div>

    <!-- 连接：接口地址与密钥 -->
    <template v-if="activeTab === 'connect'">
      <p class="ios-section-label">接口</p>
      <div class="ios-group-wrap">
        <div class="ios-group">
          <label class="ios-field">
            <span>接口地址</span>
            <input v-model="currentPreset.baseUrl" class="ios-input ios-mono" type="text" placeholder="https://api.openai.com/v1" autocapitalize="off" autocorrect="off" spellcheck="false" />
          </label>
          <label class="ios-field">
            <span>密钥</span>
            <input v-model="currentPreset.apiKey" class="ios-input ios-mono" :type="showApiKey ? 'text' : 'password'" placeholder="sk-..." autocapitalize="off" autocorrect="off" spellcheck="false" />
            <button type="button" class="ios-field-action" @click="showApiKey = !showApiKey">{{ showApiKey ? '隐藏' : '显示' }}</button>
          </label>
        </div>
      </div>

      <p class="ios-section-label">常用地址</p>
      <div class="ios-chips">
        <button v-for="item in commonBaseUrls" :key="item.name" type="button" class="ios-chip" @click="applyBaseUrl(item.url)">{{ item.name }}</button>
      </div>
    </template>

    <!-- 模型：当前模型、拉取列表、选择 -->
    <template v-else>
      <p class="ios-section-label">当前模型</p>
      <div class="ios-group-wrap">
        <div class="ios-group">
          <label class="ios-field">
            <span>模型</span>
            <input v-model="currentPreset.model" class="ios-input ios-mono" type="text" placeholder="gpt-4o, deepseek-chat" autocapitalize="off" autocorrect="off" spellcheck="false" />
          </label>
        </div>
        <div class="ios-btn-row">
          <button type="button" class="ios-btn-pill" @click="handleSaveCurrentModel">保存</button>
          <button type="button" class="ios-btn-pill" :disabled="isFetchingModels" @click="handleFetchModels">{{ isFetchingModels ? '获取中…' : '获取模型列表' }}</button>
        </div>
      </div>

      <template v-if="currentPreset.models?.length">
        <p class="ios-section-label">服务器模型 · {{ currentPreset.models.length }} 个</p>
        <div class="ios-group-wrap">
          <div class="ios-group">
            <div class="ios-search">
              <input v-model="modelSearchQuery" class="ios-input" type="text" placeholder="搜索模型" />
            </div>
            <button v-for="m in filteredModels" :key="m" type="button" class="ios-model-row" @click="selectModel(m)">
              <span>{{ m }}</span>
              <span v-if="currentPreset.model === m" class="ios-check" aria-label="已选用">✓</span>
            </button>
            <p v-if="filteredModels.length === 0" class="ios-empty">未匹配到模型</p>
          </div>
        </div>
      </template>
      <p v-else class="ios-hint">点击「获取模型列表」后，可在这里选择模型。</p>
    </template>

    <!-- 新建预设 -->
    <transition name="ios-fade">
      <div v-if="showPresetModal" class="ios-alert-backdrop" @click.self="showPresetModal = false">
        <section class="ios-alert" role="dialog" aria-modal="true" aria-labelledby="preset-alert-title" @keyup.esc="showPresetModal = false">
          <h2 id="preset-alert-title">新增 API 预设</h2>
          <p>为这组服务取一个容易辨认的名字。</p>
          <input v-model="newPresetName" class="ios-alert-input" type="text" maxlength="32" placeholder="例如：DeepSeek 日常" @keyup.enter="confirmAddPreset" />
          <div class="ios-alert-btns">
            <button type="button" @click="showPresetModal = false">取消</button>
            <button type="button" class="strong" :disabled="!newPresetName.trim()" @click="confirmAddPreset">创建</button>
          </div>
        </section>
      </div>
    </transition>

    <transition name="ios-fade">
      <div v-if="pendingDelete" class="ios-alert-backdrop" @click.self="pendingDelete = null">
        <section class="ios-alert" role="alertdialog" aria-modal="true" aria-labelledby="delete-preset-title">
          <h2 id="delete-preset-title">删除预设？</h2>
          <p>「{{ pendingDelete.name }}」将被移除，删除后无法恢复。</p>
          <div class="ios-alert-btns">
            <button type="button" @click="pendingDelete = null">取消</button>
            <button type="button" class="danger" @click="confirmDeletePreset">删除</button>
          </div>
        </section>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ios-select-input{appearance:none;-webkit-appearance:none;text-align:right;color:#0a84ff;cursor:pointer}
.ios-hint{margin:8px 18px 0;font-size:13px;line-height:1.5;color:#8e8e93}
</style>
