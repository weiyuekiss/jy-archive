<script setup>
import { computed, ref } from 'vue'
import {
  userProfile,
  profileSettings,
  createUserProfile,
  selectUserProfile,
  deleteUserProfile,
  persistProfile,
  resetUserProfile
} from '@/stores/settings'

const emit = defineEmits(['toast', 'back'])

const avatarInput = ref(null)
const isFlipping = ref(false)
const showDeleteModal = ref(false)
const showClearModal = ref(false)
const activeTab = ref('basic')
let flipTimer = null

const careerPills = ['自由职业', '独立开发者', '产品设计师', '全栈工程师', '学生', '文字创作者', '摄影师']

const currentIndex = computed(() => profileSettings.profiles.findIndex((p) => p.id === profileSettings.currentProfileId))

function switchByOffset(offset) {
  const list = profileSettings.profiles
  if (list.length < 2) return
  const next = (currentIndex.value + offset + list.length) % list.length
  switchProfile(list[next].id)
}

async function switchProfile(id) {
  if (id === profileSettings.currentProfileId || isFlipping.value) return
  isFlipping.value = true
  clearTimeout(flipTimer)
  flipTimer = setTimeout(async () => {
    await selectUserProfile(id)
    isFlipping.value = false
  }, 230)
}

async function addProfile() {
  await createUserProfile('')
  emit('toast', '已创建新的人设')
}

function removeCurrentProfile() {
  if (profileSettings.profiles.length <= 1) {
    emit('toast', '至少保留一个人设')
    return
  }
  showDeleteModal.value = true
}

async function confirmDeleteProfile() {
  const profileName = userProfile.name || '未命名人设'
  await deleteUserProfile(profileSettings.currentProfileId)
  showDeleteModal.value = false
  emit('toast', `「${profileName}」已删除`)
}

function onAvatarSelected(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file || !file.type.startsWith('image/')) return

  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const maxEdge = 480
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      userProfile.avatar = canvas.toDataURL('image/jpeg', 0.88)
      emit('toast', '头像已更新')
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

function removeAvatar() {
  userProfile.avatar = ''
  emit('toast', '头像已移除')
}

function onBirthdayChange(e) {
  const bVal = e.target.value
  userProfile.birthday = bVal
  if (bVal) {
    const birthDate = new Date(bVal)
    const now = new Date()
    let calculatedAge = now.getFullYear() - birthDate.getFullYear()
    const m = now.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      calculatedAge--
    }
    if (calculatedAge >= 0 && calculatedAge < 120) {
      userProfile.age = String(calculatedAge)
    }
  }
}

function selectCareer(career) {
  userProfile.occupation = career
}

async function handleSaveProfile() {
  await persistProfile()
  emit('toast', '用户人设已保存')
}

function confirmClearProfile() {
  resetUserProfile()
  persistProfile()
  showClearModal.value = false
  emit('toast', '已清空人设，恢复为空白状态')
}

const hasProfileData = computed(() => {
  return !!(
    userProfile.name?.trim() ||
    userProfile.birthday ||
    userProfile.age ||
    userProfile.occupation?.trim() ||
    userProfile.bio?.trim() ||
    userProfile.avatar
  )
})
</script>

<template>
  <div class="ios-page">
    <nav class="ios-nav">
      <button type="button" class="ios-back" aria-label="返回设置" @click="emit('back')">‹</button>
    </nav>
    <h1 class="ios-page-title">人设配置</h1>

    <!-- 人设切换 -->
    <div class="ios-switcher">
      <button type="button" class="ios-step" aria-label="上一个人设" :disabled="profileSettings.profiles.length < 2" @click="switchByOffset(-1)">‹</button>
      <span class="ios-counter">{{ currentIndex + 1 }} / {{ profileSettings.profiles.length }}</span>
      <button type="button" class="ios-step" aria-label="下一个人设" :disabled="profileSettings.profiles.length < 2" @click="switchByOffset(1)">›</button>
    </div>
    <div class="ios-dots">
      <button v-for="(profile, index) in profileSettings.profiles" :key="profile.id" type="button" :aria-label="`切换到第 ${index + 1} 个人设`" :class="{ on: profile.id === profileSettings.currentProfileId }" @click="switchProfile(profile.id)" />
    </div>

    <!-- 预览卡 -->
    <div class="ios-hero" :class="{ flipping: isFlipping }">
      <button type="button" class="ios-avatar-lg" aria-label="更换头像" @click="avatarInput.click()">
        <img v-if="userProfile.avatar" :src="userProfile.avatar" alt="用户头像" />
        <span v-else>{{ (userProfile.name || '我').slice(0, 1) }}</span>
      </button>
      <h2 class="ios-hero-name">{{ userProfile.name || '未配置姓名' }}</h2>
      <div class="ios-hero-meta">
        <span v-if="userProfile.occupation" class="ios-pill">{{ userProfile.occupation }}</span>
      </div>
      <div class="ios-hero-meta">
        <span v-if="userProfile.age">{{ userProfile.age }} 岁</span>
        <span v-if="userProfile.age && userProfile.birthday"> · </span>
        <span v-if="userProfile.birthday">{{ userProfile.birthday }}</span>
        <span v-if="!userProfile.age && !userProfile.birthday">未设置生日与年龄</span>
      </div>
      <p v-if="userProfile.bio" class="ios-hero-bio">{{ userProfile.bio }}</p>
    </div>
    <input ref="avatarInput" class="backup-file-input" type="file" accept="image/*" @change="onAvatarSelected" />

    <!-- 分段：基础资料 / 自我介绍 -->
    <div class="ios-segment ios-segment-spaced" role="tablist">
      <button type="button" role="tab" :class="{ on: activeTab === 'basic' }" :aria-selected="activeTab === 'basic'" @click="activeTab = 'basic'">基础资料</button>
      <button type="button" role="tab" :class="{ on: activeTab === 'bio' }" :aria-selected="activeTab === 'bio'" @click="activeTab = 'bio'">自我介绍</button>
    </div>

    <template v-if="activeTab === 'basic'">
      <p class="ios-section-label">基础信息</p>
      <div class="ios-group-wrap">
        <div class="ios-group">
          <label class="ios-field">
            <span>名字</span>
            <input v-model="userProfile.name" class="ios-input" type="text" placeholder="AI 如何称呼你" />
          </label>
          <label class="ios-field">
            <span>生日</span>
            <input :value="userProfile.birthday" class="ios-input" type="date" @change="onBirthdayChange" />
          </label>
          <label class="ios-field">
            <span>年龄</span>
            <input v-model="userProfile.age" class="ios-input" type="text" placeholder="如 23" />
          </label>
          <label class="ios-field">
            <span>职业</span>
            <input v-model="userProfile.occupation" class="ios-input" type="text" placeholder="例如：自由职业" />
          </label>
        </div>
      </div>

      <p class="ios-section-label">常用职业</p>
      <div class="ios-chips">
        <button v-for="c in careerPills" :key="c" type="button" class="ios-chip" @click="selectCareer(c)">{{ c }}</button>
      </div>

      <div class="ios-btn-stack">
        <button type="button" class="ios-btn" @click="avatarInput.click()">更换头像</button>
        <button v-if="userProfile.avatar" type="button" class="ios-btn ios-btn-danger" @click="removeAvatar">移除头像</button>
      </div>
    </template>

    <template v-else>
      <p class="ios-section-label">自我介绍</p>
      <div class="ios-group-wrap">
        <div class="ios-group">
          <label class="ios-field ios-field-long">
            <span>{{ userProfile.bio?.length || 0 }} 字</span>
            <textarea v-model="userProfile.bio" class="ios-textarea" rows="10" placeholder="说说你的兴趣、性格，以及偏好的交流方式……" />
          </label>
        </div>
      </div>
      <p class="ios-note">让 AI 了解你的性格、沟通偏好与日常节奏。</p>

      <p class="ios-section-label">聊天偏好</p>
      <div class="ios-group-wrap">
        <div class="ios-group">
          <label class="ios-field ios-field-long">
            <span>{{ userProfile.chatPreference?.length || 0 }} 字</span>
            <textarea v-model="userProfile.chatPreference" class="ios-textarea" rows="6" placeholder="例如：语气轻松一点，少用敬语，回复简短，别总是提问……" />
          </label>
        </div>
      </div>
      <p class="ios-note">描述你希望 AI 在聊天中如何回应你。</p>
    </template>

    <!-- 保存 / 新建 / 删除 / 清空 -->
    <div class="ios-btn-stack">
      <button type="button" class="ios-btn ios-btn-primary" @click="handleSaveProfile">保存用户人设</button>
      <button type="button" class="ios-btn" @click="addProfile">新建人设</button>
      <button v-if="profileSettings.profiles.length > 1" type="button" class="ios-btn ios-btn-danger" @click="removeCurrentProfile">删除当前人设</button>
      <button v-if="hasProfileData" type="button" class="ios-btn ios-btn-danger" @click="showClearModal = true">清空已填人设</button>
    </div>

    <!-- 清空确认 -->
    <transition name="ios-fade">
      <div v-if="showClearModal" class="ios-alert-backdrop" @click.self="showClearModal = false">
        <section class="ios-alert" role="dialog" aria-modal="true" aria-labelledby="clear-alert-title">
          <h2 id="clear-alert-title">清空已填写的人设？</h2>
          <p>将移除姓名、头像、生日、职业和自我介绍，无法撤销。</p>
          <div class="ios-alert-btns">
            <button type="button" @click="showClearModal = false">取消</button>
            <button type="button" class="danger" @click="confirmClearProfile">清空</button>
          </div>
        </section>
      </div>
    </transition>

    <!-- 删除确认 -->
    <transition name="ios-fade">
      <div v-if="showDeleteModal" class="ios-alert-backdrop" @click.self="showDeleteModal = false">
        <section class="ios-alert" role="dialog" aria-modal="true" aria-labelledby="delete-alert-title">
          <h2 id="delete-alert-title">删除这份人设？</h2>
          <p>「{{ userProfile.name || '未命名人设' }}」将被移除，删除后无法恢复。</p>
          <div class="ios-alert-btns">
            <button type="button" @click="showDeleteModal = false">取消</button>
            <button type="button" class="danger" @click="confirmDeleteProfile">删除</button>
          </div>
        </section>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ios-segment-spaced{margin:16px 0 0}
.ios-btn-stack{display:flex;flex-direction:column;gap:10px;margin:16px 16px 0}
.ios-btn-stack .ios-btn{flex:none;width:100%}
</style>
