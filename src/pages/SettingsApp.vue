<script setup>
// 设置应用：IG 风格个人主页
import { ref } from 'vue'
import ApiSection from './settings/ApiSection.vue'
import ProfileSection from './settings/ProfileSection.vue'

const emit = defineEmits(['close'])

const currentPage = ref('main') // 'main' | 'api' | 'profile'
const showApiDetails = ref(false)
const showEditModal = ref(false)
const editMode = ref('name')
const tempName = ref('')
const tempSignature = ref('')

// ---------- Toast 提示 ----------
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}

// 进入子页面
function navigateTo(page) {
  currentPage.value = page
  if (page === 'api') showApiDetails.value = true
}

// 返回主页面
function goBack() {
  if (currentPage.value === 'main') {
    emit('close')
  } else {
    currentPage.value = 'main'
  }
}

function startEditName() {
  tempName.value = ''
  showEditModal.value = true
}

async function saveName() {
  showEditModal.value = false
}

function cancelEditName() {
  showEditModal.value = false
}
</script>

<template>
  <div class="settings-app">
    <button v-if="currentPage === 'main'" class="settings-back-btn" type="button" aria-label="返回" @click="goBack">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <main class="app-content">
      <div v-if="currentPage === 'main'" class="main-page">
        <section class="settings-welcome">
          <span>PERSONAL SPACE</span>
          <h2>设置</h2>
          <p>管理应用配置与个人资料。</p>
        </section>
        <section class="menu-section">
          <div class="settings-section-label">PREFERENCES <span>偏好与配置</span></div>
          <button class="menu-item" :class="{ expanded: showApiDetails }" :aria-expanded="showApiDetails" @click="showApiDetails = !showApiDetails">
            <div class="menu-icon"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>
            <div class="menu-content"><span class="menu-title">API 配置</span><span class="menu-desc">模型服务、预设管理、温度设置</span></div>
            <svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <div v-if="showApiDetails" class="api-expanded"><ApiSection @toast="showToast" /></div>
          <button class="menu-item" @click="navigateTo('profile')">
            <div class="menu-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div>
            <div class="menu-content"><span class="menu-title">人设配置</span><span class="menu-desc">生日、年龄、职业、自我介绍</span></div>
            <svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </section>
      </div>
      <ProfileSection v-else-if="currentPage === 'profile'" @toast="showToast" @back="currentPage = 'main'" />
    </main>

    <transition name="modal-fade">
      <div v-if="showEditModal" class="edit-modal-backdrop" @click.self="cancelEditName" @keyup.esc="cancelEditName">
        <section class="edit-modal" role="dialog" aria-modal="true" aria-label="设置">
          <button class="modal-close" aria-label="关闭" @click="cancelEditName">×</button>
          <span class="modal-kicker">PERSONAL SPACE</span><h2>设置</h2><p>人设配置页面暂时保持原样。</p>
          <div class="modal-actions"><button class="cancel-btn" @click="cancelEditName">关闭</button></div>
        </section>
      </div>
    </transition>


    <!-- Toast 提示 -->
    <transition name="toast-fade">
      <div v-if="toast" class="toast" role="status">
        <span class="toast-dot" />
        <span>{{ toast }}</span>
      </div>
    </transition>
  </div>
</template>

<style src="@/styles/settings.css"></style>

