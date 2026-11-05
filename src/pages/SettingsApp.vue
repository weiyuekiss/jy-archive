<script setup>
// 设置应用：IG 风格个人主页
import { ref } from 'vue'
import { exportAllData, replaceAllData } from '@/stores/db'
import ApiSection from './settings/ApiSection.vue'
import ProfileSection from './settings/ProfileSection.vue'

const emit = defineEmits(['close'])

const currentPage = ref('main') // 'main' | 'api' | 'profile'
const backupInput = ref(null)
const isImporting = ref(false)

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

async function importData(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!window.confirm('导入会覆盖当前应用数据，建议先导出备份。确定继续吗？')) return
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

// 返回主页面
function goBack() {
  if (currentPage.value === 'main') emit('close')
  else currentPage.value = 'main'
}
</script>

<template>
  <div class="settings-app">
    <button class="settings-back-btn" type="button" aria-label="返回" @click="goBack">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <main class="app-content">
      <div class="retro-window">
        <div class="window-titlebar">
          <div class="window-title"><span class="window-gem">◆</span><span>JY 个人空间</span></div>
          <div class="window-controls" aria-hidden="true"><i>_</i><i>□</i><i>×</i></div>
        </div>
        <div class="window-menu"><span>文件</span><span>编辑</span><span>查看</span><span>帮助</span></div>
        <div class="window-body">
      <div v-if="currentPage === 'main'" class="main-page">
        <section class="settings-welcome">
          <span class="desktop-mark" aria-hidden="true">✳</span>
          <h2>设置</h2>
          <p>配置服务与个人资料</p>
        </section>
        <section class="menu-section">
          <button class="menu-item" type="button" @click="navigateTo('api')">
            <div class="menu-icon menu-icon-api"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
            <div class="menu-content"><span class="menu-title">API 配置</span><span class="menu-desc">服务地址、密钥与模型</span></div>
            <svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button class="menu-item" type="button" @click="navigateTo('profile')">
            <div class="menu-icon menu-icon-profile"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div>
            <div class="menu-content"><span class="menu-title">人设配置</span><span class="menu-desc">称呼、身份与自我介绍</span></div>
            <svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <section class="data-storage-card" aria-label="数据存储">
            <div class="data-storage-heading"><div><h3>数据存储</h3><p>将应用数据备份为文件，或从备份恢复。</p></div></div>
            <div class="storage-actions">
              <button type="button" class="storage-action" @click="exportData">导出数据</button>
              <button type="button" class="storage-action primary" :disabled="isImporting" @click="chooseBackup">{{ isImporting ? '导入中…' : '导入数据' }}</button>
              <input ref="backupInput" class="backup-file-input" type="file" accept="application/json,.json" @change="importData">
            </div>
            <small>导入会覆盖当前应用数据，请先备份。</small>
          </section>
        </section>
      </div>
      <div v-else-if="currentPage === 'api'" class="settings-subpage">
        <header class="settings-page-header"><button type="button" aria-label="返回设置" @click="currentPage = 'main'"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button><h1>API 配置</h1><span></span></header>
        <ApiSection @toast="showToast" />
      </div>
      <ProfileSection v-else-if="currentPage === 'profile'" @toast="showToast" @back="currentPage = 'main'" />
        </div>
        <div class="window-status"><span>就绪</span><span>个人主页 · 在线</span></div>
      </div>
    </main>

    <transition name="toast-fade">
      <div v-if="toast" class="toast" role="status">
        <span class="toast-dot" />
        <span>{{ toast }}</span>
      </div>
    </transition>
  </div>
</template>

<style src="@/styles/settings.css"></style>

