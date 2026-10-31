<script setup>
// 设置应用：IG 风格个人主页
import { ref } from 'vue'
import { userProfile, persistProfile } from '@/stores/settings'
import ApiSection from './settings/ApiSection.vue'
import ProfileSection from './settings/ProfileSection.vue'

const emit = defineEmits(['close'])

const currentPage = ref('main') // 'main' | 'api' | 'profile'
const avatarInput = ref(null)
const coverInput = ref(null)
const showEditModal = ref(false)
const editMode = ref('name')
const isEditingName = ref(false)
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
}

// 返回主页面
function goBack() {
  if (currentPage.value === 'main') {
    emit('close')
  } else {
    currentPage.value = 'main'
  }
}

function selectAvatar() {
  editMode.value = 'avatar'
  showEditModal.value = true
}

function selectCover() {
  coverInput.value?.click()
}

function saveImage(file, target) {
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = async () => {
      const maxEdge = target === 'avatar' ? 480 : 1600
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      userProfile[target === 'avatar' ? 'avatar' : 'settingsCover'] = canvas.toDataURL('image/jpeg', 0.86)
      await persistProfile()
      showEditModal.value = false
      showToast(target === 'avatar' ? '头像已更新' : '主页背景已更新')
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

function onAvatarSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  saveImage(file, 'avatar')
}

function onCoverSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  saveImage(file, 'cover')
}

function startEditSignature() {
  editMode.value = 'signature'
  tempSignature.value = userProfile.signature ?? '在自己的小小角落里，收藏喜欢的日常。'
  showEditModal.value = true
}

async function saveSignature() {
  userProfile.signature = tempSignature.value.trim()
  await persistProfile()
  showEditModal.value = false
  showToast('签名已更新')
}

function startEditName() {
  editMode.value = 'name'
  tempName.value = userProfile.name || ''
  showEditModal.value = true
}

async function saveName() {
  userProfile.name = tempName.value.trim()
  await persistProfile()
  showEditModal.value = false
  if (userProfile.name) showToast('昵称已更新')
}

function cancelEditName() {
  showEditModal.value = false
}
</script>

<template>
  <div class="settings-app">
    <!-- 顶部栏 -->
    <header class="app-header">
      <button class="back-btn" aria-label="返回" @click="goBack">
        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <h1 class="page-title">{{ currentPage === 'main' ? 'jy.archive' : currentPage === 'api' ? 'API 配置' : '人设配置' }}</h1>
      <button v-if="currentPage === 'main'" class="header-cover-btn" aria-label="更换主页背景" @click="selectCover">
        <svg viewBox="0 0 24 24"><path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3"/></svg>
      </button>
      <div v-else class="header-spacer" />
    </header>

    <main class="app-content">
      <div v-if="currentPage === 'main'" class="main-page">
        <section class="profile-cover" :class="{ 'has-cover': userProfile.settingsCover }" :style="userProfile.settingsCover ? { backgroundImage: `url(${userProfile.settingsCover})` } : {}">
          <div class="cover-shade" />
          <div class="cover-topline"><span>PERSONAL SPACE</span><span>✳</span></div>
          <button class="cover-edit" type="button" @click="selectCover">更换背景</button>
          <input ref="coverInput" type="file" accept="image/*" hidden @change="onCoverSelected" />
        </section>

        <section class="profile-card">
          <div class="profile-identity">
            <button class="avatar-btn" aria-label="更换头像" @click="selectAvatar">
              <img v-if="userProfile.avatar" :src="userProfile.avatar" alt="头像" class="avatar-img" />
              <div v-else class="avatar-placeholder"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div>
            </button>
            <div class="profile-name-block">
              <span class="profile-kicker">YOUR LITTLE CORNER</span>
              <button class="profile-name" type="button" @click="startEditName">{{ userProfile.name || '给自己取个名字' }}<span class="name-pencil">✎</span></button>
              <span class="profile-handle">@{{ (userProfile.name || 'my_journal').replace(/\\s/g, '_') }}</span>
            </div>
          </div>
          <div class="profile-stats"><div><strong>01</strong><span>MY SPACE</span></div><div><strong>✿</strong><span>GOOD DAYS</span></div><div><strong>∞</strong><span>MEMORIES</span></div></div>
          <p class="profile-bio"><button class="signature-edit" type="button" @click="startEditSignature">{{ userProfile.signature ?? '在自己的小小角落里，收藏喜欢的日常。' }}<span aria-hidden="true">✎</span></button><br><span>soft days, slow living ♡</span></p>
          <button class="edit-profile-btn" type="button" @click="startEditName">编辑个人资料</button>
          <div class="profile-highlights"><button type="button" @click="selectCover"><span class="highlight-circle">✳</span><span>我的封面</span></button><div><span class="highlight-circle muted">♡</span><span>小日常</span></div><div><span class="highlight-circle muted">☁</span><span>慢生活</span></div></div>
        </section>

        <section class="menu-section">
          <div class="settings-section-label">YOUR SETTINGS <span>偏好与配置</span></div>
          <button class="menu-item" @click="navigateTo('api')"><div class="menu-icon"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><div class="menu-content"><span class="menu-title">API 配置</span><span class="menu-desc">模型服务、预设管理、温度设置</span></div><svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
          <button class="menu-item" @click="navigateTo('profile')"><div class="menu-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg></div><div class="menu-content"><span class="menu-title">人设配置</span><span class="menu-desc">生日、年龄、职业、自我介绍</span></div><svg class="menu-arrow" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
        </section>
        <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarSelected" />
      </div>
      <ApiSection v-else-if="currentPage === 'api'" @toast="showToast" />
      <ProfileSection v-else-if="currentPage === 'profile'" @toast="showToast" />
    </main>

    <transition name="modal-fade">
      <div v-if="showEditModal" class="edit-modal-backdrop" @click.self="cancelEditName" @keyup.esc="cancelEditName">
        <section class="edit-modal" role="dialog" aria-modal="true" :aria-label="editMode === 'name' ? '编辑昵称' : editMode === 'signature' ? '编辑签名' : '更换头像'">
          <button class="modal-close" aria-label="关闭" @click="cancelEditName">×</button>
          <template v-if="editMode === 'signature'">
            <span class="modal-kicker">A LITTLE INTRODUCTION</span><h2>编辑个性签名</h2><p>写下你想展示在个人主页上的一句话。</p>
            <textarea v-model="tempSignature" class="signature-input" maxlength="80" rows="3" placeholder="写一句喜欢的话" @keyup.esc="cancelEditName" />
            <div class="signature-count">{{ tempSignature.length }}/80</div>
            <div class="modal-actions"><button class="cancel-btn" @click="cancelEditName">取消</button><button class="save-btn" @click="saveSignature">保存更改</button></div>
          </template>
          <template v-else-if="editMode === 'name'">
            <span class="modal-kicker">A LITTLE INTRODUCTION</span><h2>编辑昵称</h2><p>给你的个人主页一个喜欢的名字。</p>
            <input v-model="tempName" class="name-input" type="text" maxlength="32" placeholder="输入昵称" @keyup.enter="saveName" @keyup.esc="cancelEditName" />
            <div class="modal-actions"><button class="cancel-btn" @click="cancelEditName">取消</button><button class="save-btn" @click="saveName">保存更改</button></div>
          </template>
          <template v-else>
            <span class="modal-kicker">YOUR PROFILE PHOTO</span><h2>更换头像</h2><p>选择一张照片，作为你的主页头像。</p>
            <button class="avatar-upload-btn" @click="avatarInput?.click()">选择照片</button>
            <button class="modal-cancel-link" @click="cancelEditName">暂时不更换</button>
          </template>
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

