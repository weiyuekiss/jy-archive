<script setup>
// 设置应用：iOS 26 风格的分组列表，无顶栏
import { ref } from 'vue'
import { exportAllData, replaceAllData } from '@/stores/db'
import { userProfile } from '@/stores/settings'
import { petSettings, persistPetSettings } from '@/stores/pet'
import ApiSection from './settings/ApiSection.vue'
import ProfileSection from './settings/ProfileSection.vue'
import PetSection from './settings/PetSection.vue'

const emit = defineEmits(['close'])

const currentPage = ref('main') // 'main' | 'api' | 'profile' | 'pet'
const backupInput = ref(null)
const isImporting = ref(false)
const showStorageDialog = ref(false)
const showImportConfirm = ref(false)
const pendingImportFile = ref(null)

async function exportData() {
  try {
    const entries = await exportAllData()
    const backup = { format: 'jyos-backup', version: 1, exportedAt: new Date().toISOString(), entries }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jyos-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    showToast('应用数据已导出')
  } catch (error) {
    console.error('导出应用数据失败：', error)
    showToast('导出失败，请稍后重试')
  }
}

function chooseBackup() {
  backupInput.value?.click()
}

// 选中备份文件后先弹出应用内确认框，不使用浏览器原生 confirm（无法设置样式）
function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  pendingImportFile.value = file
  showStorageDialog.value = false
  showImportConfirm.value = true
}

function cancelImport() {
  pendingImportFile.value = null
  showImportConfirm.value = false
}

async function confirmImport() {
  const file = pendingImportFile.value
  showImportConfirm.value = false
  pendingImportFile.value = null
  if (!file) return
  isImporting.value = true
  try {
    const backup = JSON.parse(await file.text())
    if (backup?.format !== 'jyos-backup' || backup?.version !== 1 || !Array.isArray(backup.entries)) {
      throw new Error('备份文件格式或版本不受支持')
    }
    await replaceAllData(backup.entries)
    showToast('导入成功，正在刷新应用…')
    setTimeout(() => window.location.reload(), 500)
  } catch (error) {
    console.error('导入应用数据失败：', error)
    showToast(error.message || '导入失败，数据未更改')
  } finally {
    isImporting.value = false
  }
}

// ---------- Toast 提示 ----------
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}

function navigateTo(page) {
  currentPage.value = page
}
</script>

<template>
  <div class="settings-app">
    <button
      v-if="currentPage === 'main'"
      class="ios-close"
      type="button"
      aria-label="关闭设置，返回桌面"
      @click="emit('close')"
    >✕</button>

    <main class="ios-screen">
      <div v-if="currentPage === 'main'" class="ios-main">
        <h1 class="ios-title">设置</h1>

        <button class="ios-account" type="button" aria-label="打开账户与人设" @click="navigateTo('profile')">
          <span class="ios-account-avatar" aria-hidden="true">
            <img v-if="userProfile.avatar" :src="userProfile.avatar" alt=""/>
            <span v-else>{{ (userProfile.name || '我').slice(0, 1) }}</span>
          </span>
          <span class="ios-account-text">
            <strong>{{ userProfile.name || '未命名' }}</strong>
            <small>{{ userProfile.bio || '账户、人设与头像' }}</small>
          </span>
          <span class="ios-chevron" aria-hidden="true">›</span>
        </button>

        <section class="ios-group" aria-label="桌宠">
          <label class="ios-row ios-row-switch">
            <span class="ios-icon ios-icon-blue" aria-hidden="true">猫</span>
            <span class="ios-row-text">桌宠白猫</span>
            <input
              v-model="petSettings.enabled"
              type="checkbox"
              class="ios-switch"
              aria-label="开启桌宠"
              @change="persistPetSettings"
            />
          </label>
        </section>

        <section class="ios-group" aria-label="设置项目">
          <button class="ios-row" type="button" aria-label="进入 API 配置" @click="navigateTo('api')">
            <span class="ios-icon ios-icon-blue" aria-hidden="true">API</span>
            <span class="ios-row-text">API 配置</span>
            <span class="ios-chevron" aria-hidden="true">›</span>
          </button>
          <button class="ios-row" type="button" aria-label="进入桌宠设置" @click="navigateTo('pet')">
            <span class="ios-icon ios-icon-blue" aria-hidden="true">宠</span>
            <span class="ios-row-text">桌宠</span>
            <span class="ios-chevron" aria-hidden="true">›</span>
          </button>
          <button class="ios-row" type="button" aria-label="进入人设配置" @click="navigateTo('profile')">
            <span class="ios-icon ios-icon-purple" aria-hidden="true">人</span>
            <span class="ios-row-text">人设配置</span>
            <span class="ios-chevron" aria-hidden="true">›</span>
          </button>
          <button class="ios-row" type="button" aria-label="打开数据存储选项" @click="showStorageDialog = true">
            <span class="ios-icon ios-icon-green" aria-hidden="true">⇅</span>
            <span class="ios-row-text">数据存储</span>
            <span class="ios-chevron" aria-hidden="true">›</span>
          </button>
        </section>

        <input ref="backupInput" class="backup-file-input" type="file" accept="application/json,.json" @change="importData">
      </div>

      <ApiSection v-else-if="currentPage === 'api'" @toast="showToast" @back="currentPage = 'main'" />

      <ProfileSection v-else-if="currentPage === 'profile'" @toast="showToast" @back="currentPage = 'main'" />
      <PetSection v-else-if="currentPage === 'pet'" @toast="showToast" @back="currentPage = 'main'" />
    </main>

    <transition name="ios-fade">
      <div v-if="showStorageDialog" class="ios-sheet-backdrop" @click.self="showStorageDialog = false">
        <section class="ios-sheet" role="dialog" aria-modal="true" aria-labelledby="storage-sheet-title">
          <div class="ios-sheet-grabber" aria-hidden="true"></div>
          <h2 id="storage-sheet-title" class="ios-sheet-title">数据存储</h2>
          <p class="ios-sheet-text">导入数据会覆盖当前应用数据，建议先导出备份。</p>
          <div class="ios-sheet-actions">
            <button type="button" class="ios-sheet-btn" @click="exportData">导出数据</button>
            <button type="button" class="ios-sheet-btn ios-sheet-btn-primary" :disabled="isImporting" @click="chooseBackup">{{ isImporting ? '导入中…' : '导入数据' }}</button>
            <button type="button" class="ios-sheet-btn ios-sheet-btn-cancel" @click="showStorageDialog = false">取消</button>
          </div>
        </section>
      </div>
    </transition>

    <transition name="ios-fade">
      <div v-if="showImportConfirm" class="ios-alert-backdrop" @click.self="cancelImport">
        <section class="ios-alert" role="alertdialog" aria-modal="true" aria-labelledby="import-alert-title">
          <h2 id="import-alert-title">导入数据？</h2>
          <p>导入会覆盖当前应用的全部数据，建议先导出备份。</p>
          <div class="ios-alert-btns">
            <button type="button" @click="cancelImport">取消</button>
            <button type="button" class="danger" @click="confirmImport">导入</button>
          </div>
        </section>
      </div>
    </transition>

    <transition name="ios-fade">
      <div v-if="toast" class="ios-toast" role="status">
        <span class="ios-toast-dot" />
        <span>{{ toast }}</span>
      </div>
    </transition>
  </div>
</template>

<style src="@/styles/ios-settings.css"></style>
