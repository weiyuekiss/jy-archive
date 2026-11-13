<script setup>
// 设置应用：Y2K 像素控制面板
import { ref } from 'vue'
import { exportAllData, replaceAllData } from '@/stores/db'
import ApiSection from './settings/ApiSection.vue'
import ProfileSection from './settings/ProfileSection.vue'
import RetroComputer from '@/components/RetroComputer.vue'
import RetroSticker from '@/components/RetroSticker.vue'

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
    <main class="app-content">
      <div class="retro-window" :class="{ 'settings-main-active': currentPage === 'main', 'settings-api-active': currentPage === 'api' }">
        <div class="window-titlebar">
          <div class="window-title"><RetroSticker kind="folder"/><span>JY 控制面板.exe</span></div>
          <div class="window-controls"><i aria-hidden="true">_</i><i aria-hidden="true">□</i><button type="button" aria-label="关闭设置，返回桌面" @click="emit('close')">×</button></div>
        </div>
        <div class="window-menu"><span>文件(F)</span><span>编辑(E)</span><span>查看(V)</span><span>帮助(H)</span></div>
        <div class="explorer-toolbar"><button type="button" @click="goBack"><span aria-hidden="true">◀</span> 返回</button><span class="address-label">地址(D)</span><div class="explorer-address"><RetroSticker kind="folder"/><span>我的电脑 / 控制面板{{ currentPage === 'api' ? ' / API 配置' : currentPage === 'profile' ? ' / 人设配置' : '' }}</span></div></div>
        <div class="window-body">
      <div v-if="currentPage === 'main'" class="main-page">
        <section class="settings-welcome">
          <div class="welcome-copy"><span class="retro-eyebrow">PERSONAL COMPUTER / 2000</span><h2>欢迎来到<br>本喵的控制面板</h2><p>调试电波，整理人设，<br>把小小世界存进软盘里。</p><span class="system-label"><i/> SYSTEM READY !</span></div>
          <RetroComputer class="welcome-computer"/>
          <span class="welcome-serial">JY-OS © Y2K EDITION</span>
        </section>
        <div class="settings-directory-heading"><span>▦ 选择一个设置项目</span><small>CONTROL PANEL</small></div>
        <section class="menu-section">
          <button class="menu-item" type="button" @click="navigateTo('api')">
            <RetroSticker kind="network"/><div class="menu-content"><small class="item-filename">NETWORK.EXE</small><span class="menu-title">API 配置</span><span class="menu-desc">连接电波 · 服务预设与模型</span></div>
            <svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button class="menu-item" type="button" @click="navigateTo('profile')">
            <RetroSticker kind="profile"/><div class="menu-content"><small class="item-filename">MY PROFILE.DAT</small><span class="menu-title">人设配置</span><span class="menu-desc">身份名片 · 记录独一份的你</span></div>
            <svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <section class="data-storage-card" aria-label="数据存储">
            <div class="data-storage-heading"><RetroSticker kind="disk"/><div><small class="item-filename">BACKUP / DISK A:</small><h3>数据存储</h3><p>把回忆装进软盘，下次开机再见。</p></div><span class="disk-capacity" aria-hidden="true">1.44<br>MB</span></div>
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
        <div class="window-status"><span>▣ 就绪 · 你的世界已准备好</span><span>JY-OS / Y2K EDITION</span></div>
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
<style scoped src="@/styles/settings-y2k.css"></style>

