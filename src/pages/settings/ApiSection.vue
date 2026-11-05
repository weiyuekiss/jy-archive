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

const emit = defineEmits(['toast'])

const currentPreset = computed(() => getCurrentPreset() || apiSettings.presets[0])
const isFetchingModels = ref(false)
const modelSearchQuery = ref('')
const showApiKey = ref(false)
const showPresetModal = ref(false)
const newPresetName = ref('')
const showModelList = ref(false)

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

function handleDeletePreset(id) {
  if (apiSettings.presets.length <= 1) {
    emit('toast', '至少保留一个预设')
    return
  }
  const target = apiSettings.presets.find((p) => p.id === id)
  const name = target ? target.name : '该预设'
  if (confirm(`确定删除「${name}」吗？`)) {
    if (removePreset(id)) emit('toast', `已删除「${name}」`)
  }
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
    <div class="tab-page api-settings-page">
    <!-- 预设方案管理 -->
    <div class="k-card">
      <div class="card-head">
        <div class="title-with-badge">
          <span class="section-title">服务预设</span>
          <span class="count-pill">{{ apiSettings.presets.length }} 个预设</span>
        </div>
        <button class="k-action-btn" type="button" @click="handleAddPreset">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          <span>新增预设</span>
        </button>
      </div>

        <div class="preset-picker-row">
          <label class="preset-picker-label">当前预设</label>
          <select class="preset-picker" :value="currentPreset.id" @change="selectPreset($event.target.value)">
            <option v-for="p in apiSettings.presets" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <button v-if="apiSettings.presets.length > 1" class="preset-remove" type="button" aria-label="删除当前预设" @click="handleDeletePreset(currentPreset.id)">移除</button>
        </div>
        <div class="preset-actions">
          <button class="k-text-btn" type="button" @click="handleDuplicatePreset"><span>＋</span>复制当前预设</button>
        </div>
    </div>

    <!-- 接口连接配置 -->
    <div class="k-card">
      <div class="card-head">
        <span class="section-title">接口连接配置</span>
        <span class="hint-tag">兼容常见服务与本地接口</span>
      </div>

      <div class="field-item">
        <label class="field-label">接口地址</label>
        <div class="input-wrap">
          <input
            v-model="currentPreset.baseUrl"
            type="text"
            placeholder="https://api.openai.com/v1"
            class="k-input"
          />
        </div>
        <div class="quick-tags">
          <span class="quick-hint">常用地址</span>
          <button
            v-for="item in commonBaseUrls"
            :key="item.name"
            type="button"
            class="tag-pill"
            @click="applyBaseUrl(item.url)"
          >
            {{ item.name }}
          </button>
        </div>
      </div>

      <div class="field-item">
        <label class="field-label">密钥</label>
        <div class="input-wrap has-suffix">
          <input
            v-model="currentPreset.apiKey"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="sk-..."
            class="k-input"
          />
          <button
            type="button"
            class="suffix-toggle"
            @click="showApiKey = !showApiKey"
          >
            {{ showApiKey ? '隐藏' : '显示' }}
          </button>
        </div>
      </div>
    </div>
    <!-- 模型选择与拉取 -->
    <div class="k-card">
      <div class="card-head">
        <div class="title-with-badge">
          <span class="section-title">模型选择</span>
          <span v-if="currentPreset.models?.length" class="count-pill">{{ currentPreset.models.length }} 个可用</span>
        </div>
        <button class="k-action-btn primary" type="button" :disabled="isFetchingModels" @click="handleFetchModels">
          <span v-if="isFetchingModels" class="spinner" />
          <span>{{ isFetchingModels ? '获取中…' : '获取模型列表' }}</span>
        </button>
      </div>

      <div class="field-item">
        <label class="field-label">
          <span>当前使用模型</span>
          <button v-if="currentPreset.models?.length" class="model-list-toggle" type="button" @click="showModelList = !showModelList">
            {{ showModelList ? '收起模型列表' : `查看模型列表 · ${currentPreset.models.length}` }}
          </button>
        </label>
        <div class="model-select-row">
          <div class="input-wrap" style="flex: 1;">
            <input
              v-model="currentPreset.model"
              type="text"
              placeholder="例如: gpt-4o, deepseek-chat"
              class="k-input bold"
            />
          </div>
          <button class="k-primary-btn compact" type="button" @click="handleSaveCurrentModel">
            保存该模型
          </button>
        </div>
      </div>

      <div v-if="showModelList && currentPreset.models?.length" class="models-box">
        <div class="box-head">
          <div class="box-title">
            <span>服务器模型列表</span>
            <small>选择后会自动保存</small>
          </div>
          <input
            v-model="modelSearchQuery"
            type="text"
            placeholder="搜索模型..."
            class="search-mini-input"
          />
        </div>
        <div class="model-chips-list">
          <button
            v-for="m in filteredModels"
            :key="m"
            type="button"
            class="model-chip"
            :class="{ active: currentPreset.model === m }"
            @click="selectModel(m)"
          >
            <span class="model-chip-name">{{ m }}</span>
            <span v-if="currentPreset.model === m" class="check-mark">✓</span>
          </button>
          <div v-if="filteredModels.length === 0" class="empty-model-tip">
            未匹配到模型
          </div>
        </div>
      </div>
    </div>

  </div>
  <transition name="modal-fade">
    <div v-if="showPresetModal" class="edit-modal-backdrop" @click.self="showPresetModal = false">
      <section class="edit-modal api-preset-modal" role="dialog" aria-modal="true" aria-labelledby="preset-modal-title">
        <button class="modal-close" type="button" aria-label="关闭" @click="showPresetModal = false">×</button>
        <span class="modal-kicker">新建预设</span>
        <h2 id="preset-modal-title">新增 API 预设</h2>
        <p>为这组服务配置取一个容易辨认的名字。</p>
        <input v-model="newPresetName" class="name-input" type="text" maxlength="32" placeholder="例如：DeepSeek 日常" @keyup.enter="confirmAddPreset" @keyup.esc="showPresetModal = false" />
        <div class="modal-actions"><button class="cancel-btn" type="button" @click="showPresetModal = false">取消</button><button class="save-btn" type="button" :disabled="!newPresetName.trim()" @click="confirmAddPreset">创建预设</button></div>
      </section>
    </div>
  </transition>
</template>
