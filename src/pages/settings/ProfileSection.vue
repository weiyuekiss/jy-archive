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

const emit = defineEmits(['toast'])

const avatarInput = ref(null)
const isFlipping = ref(false)
const showDeleteModal = ref(false)
let flipTimer = null

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

const careerPills = ['自由职业', '独立开发者', '产品设计师', '全栈工程师', '学生', '文字创作者', '摄影师']
function selectCareer(career) {
  userProfile.occupation = career
}

async function handleSaveProfile() {
  await persistProfile()
  emit('toast', '用户人设已保存')
}

function handleClearProfile() {
  if (confirm('确定要清空所有已填写的用户人设信息吗？')) {
    resetUserProfile()
    persistProfile()
    emit('toast', '已清空人设，恢复为空白状态')
  }
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
  <div class="tab-page profile-settings-page">
    <button class="profile-back-btn" type="button" aria-label="返回设置" @click="emit('back')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <div class="polaroid-switcher">
      <button class="profile-step" type="button" aria-label="上一个人设" :disabled="profileSettings.profiles.length < 2" @click="switchProfile(profileSettings.profiles[(profileSettings.profiles.findIndex(p => p.id === profileSettings.currentProfileId) - 1 + profileSettings.profiles.length) % profileSettings.profiles.length].id)">‹</button>
      <div class="polaroid-stage" :class="{ flipping: isFlipping }">
        <div class="profile-card-preview" :class="{ empty: !hasProfileData }">
          <div class="preview-avatar">
        <img v-if="userProfile.avatar" :src="userProfile.avatar" alt="用户头像" class="avatar-img" />
        <div v-else class="avatar-placeholder">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" /></svg>
        </div>
      </div>

      <div class="preview-info">
        <div class="preview-top-row">
          <h3 class="preview-name">
            {{ userProfile.name || '（未配置姓名）' }}
          </h3>
          <span v-if="userProfile.occupation" class="preview-badge">
            {{ userProfile.occupation }}
          </span>
        </div>
        <div class="preview-meta-line">
          <span v-if="userProfile.age">{{ userProfile.age }} 岁</span>
          <span v-if="userProfile.age && userProfile.birthday" class="sep">·</span>
          <span v-if="userProfile.birthday">{{ userProfile.birthday }}</span>
          <span v-if="!userProfile.age && !userProfile.birthday" class="empty-hint-text">
            未设置生日与年龄
          </span>
        </div>
        <p class="preview-bio">
          {{ userProfile.bio || '尚未撰写自我介绍。在下方配置专属用户人设，让 AI 更好地感知并契合你的对话风格。' }}
        </p>
      </div>
        </div>
      </div>
      <button class="profile-step" type="button" aria-label="下一个人设" :disabled="profileSettings.profiles.length < 2" @click="switchProfile(profileSettings.profiles[(profileSettings.profiles.findIndex(p => p.id === profileSettings.currentProfileId) + 1) % profileSettings.profiles.length].id)">›</button>
      <div class="profile-switch-meta">
        <span>{{ profileSettings.profiles.findIndex(p => p.id === profileSettings.currentProfileId) + 1 }} / {{ profileSettings.profiles.length }}</span>
        <button type="button" @click="addProfile">＋ 新建人设</button>
        <button v-if="profileSettings.profiles.length > 1" type="button" class="delete-profile" @click="removeCurrentProfile">删除当前</button>
      </div>
      <div class="profile-dots"><button v-for="(profile, index) in profileSettings.profiles" :key="profile.id" type="button" :aria-label="`切换到第 ${index + 1} 个人设`" :class="{ active: profile.id === profileSettings.currentProfileId }" @click="switchProfile(profile.id)" /></div>
    </div>

    <!-- 基础身份信息表单 -->
    <div class="k-card">
      <div class="card-head">
        <span class="section-title">基础身份信息</span>
        <span class="hint-tag">纯本地保存 · 无默认预设</span>
      </div>

      <!-- 头像配置 -->
      <div class="field-item">
        <label class="field-label">用户头像</label>
        <div class="avatar-edit-box">
          <div class="avatar-thumb" @click="avatarInput.click()">
            <img v-if="userProfile.avatar" :src="userProfile.avatar" alt="头像预览" />
            <div v-else class="thumb-empty">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              <span>上传头像</span>
            </div>
          </div>
          <div class="avatar-controls">
            <button class="k-action-btn" type="button" @click="avatarInput.click()">
              <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" /></svg>
              <span>选择本地照片</span>
            </button>
            <button
              v-if="userProfile.avatar"
              class="k-text-btn danger"
              type="button"
              @click="removeAvatar"
            >
              移除当前头像
            </button>
            <p class="field-note">建议使用 1:1 柔和纯色或生活照，将自动压缩优化</p>
          </div>
          <input ref="avatarInput" type="file" accept="image/*" hidden @change="onAvatarSelected" />
        </div>
      </div>

      <!-- 姓名 -->
      <div class="field-item">
        <label class="field-label">名字 / 称谓</label>
        <div class="input-wrap">
          <input
            v-model="userProfile.name"
            type="text"
            placeholder="填写你希望 AI 如何称呼你"
            class="k-input"
          />
        </div>
      </div>

      <!-- 生日日期与年龄联动 -->
      <div class="fields-grid-2">
        <div class="field-item">
          <label class="field-label">生日日期</label>
          <div class="input-wrap">
            <input
              :value="userProfile.birthday"
              type="date"
              class="k-input date-input"
              @change="onBirthdayChange"
            />
          </div>
        </div>

        <div class="field-item">
          <label class="field-label">年龄</label>
          <div class="input-wrap has-suffix">
            <input
              v-model="userProfile.age"
              type="text"
              placeholder="如 23"
              class="k-input"
            />
            <span class="input-suffix-text">岁</span>
          </div>
        </div>
      </div>

      <!-- 职业（可填自由职业） -->
      <div class="field-item">
        <label class="field-label">
          <span>职业</span>
          <span class="sub-tip">（也可以填自由职业）</span>
        </label>
        <div class="input-wrap">
          <input
            v-model="userProfile.occupation"
            type="text"
            placeholder="例如: 自由职业 / 独立设计师 / 开发者..."
            class="k-input"
          />
        </div>

        <div class="quick-tags">
          <span class="quick-hint">灵感参考:</span>
          <button
            v-for="c in careerPills"
            :key="c"
            type="button"
            class="tag-pill"
            @click="selectCareer(c)"
          >
            {{ c }}
          </button>
        </div>
      </div>
    </div>
    <!-- 详细自我介绍（用户是个什么样的人） -->
    <div class="k-card">
      <div class="card-head">
        <div class="title-with-badge">
          <span class="section-title">用户是个什么样的人</span>
        </div>
        <span class="char-count">{{ userProfile.bio?.length || 0 }} 字</span>
      </div>

      <div class="field-item">
        <label class="field-label">
          <span>自我介绍与交流习惯</span>
          <span class="sub-tip">让 AI 深入理解你的性格、沟通偏好与日常节奏</span>
        </label>
        <div class="textarea-wrap">
          <textarea
            v-model="userProfile.bio"
            rows="6"
            placeholder="介绍一下你自己：平时喜欢怎样的说话方式？性格偏向随和还是严谨？有什么特别的兴趣爱好或日常状态？希望 AI 扮演怎样的角色陪伴你..."
            class="k-textarea"
          />
        </div>
      </div>
    </div>

    <transition name="modal-fade">
      <div v-if="showDeleteModal" class="edit-modal-backdrop profile-delete-backdrop" @click.self="showDeleteModal = false" @keyup.esc="showDeleteModal = false">
        <section class="edit-modal profile-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-profile-title">
          <button class="modal-close" type="button" aria-label="关闭" @click="showDeleteModal = false">×</button>
          <div class="delete-profile-mark" aria-hidden="true">✳</div>
          <span class="modal-kicker">A LITTLE GOODBYE</span>
          <h2 id="delete-profile-title">删除这份人设？</h2>
          <p>「{{ userProfile.name || '未命名人设' }}」将从你的个人资料中移除。删除后无法恢复。</p>
          <div class="modal-actions">
            <button class="cancel-btn" type="button" @click="showDeleteModal = false">再想一想</button>
            <button class="save-btn delete-confirm-btn" type="button" @click="confirmDeleteProfile">确认删除</button>
          </div>
        </section>
      </div>
    </transition>

    <!-- 底部保存与清空操作栏 -->
    <div class="profile-action-bar">
      <button class="k-primary-btn full" type="button" @click="handleSaveProfile">
        保存用户人设
      </button>
      <button
        v-if="hasProfileData"
        class="k-ghost-btn danger full"
        type="button"
        @click="handleClearProfile"
      >
        清空已填人设
      </button>
    </div>

  </div>
</template>
