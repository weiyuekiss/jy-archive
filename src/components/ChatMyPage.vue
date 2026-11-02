<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { userProfile, profileSettings, isSettingsLoaded, persistProfile } from '@/stores/settings'
import { loadValue } from '@/stores/db'
import PhotoPickerDialog from '@/components/widgets/PhotoPickerDialog.vue'

const props = defineProps({ sendSoundFile: String, receiveSoundFile: String, boundCount: Number, presetName: String, preferencesReady: Boolean })
const emit = defineEmits(['open-config', 'subpage', 'sound-file', 'reset-sound', 'preview-sound', 'notify'])
const enterToSend = defineModel('enterToSend', { type: Boolean })
const replyImmediately = defineModel('replyImmediately', { type: Boolean })
const sendSoundEnabled = defineModel('sendSoundEnabled', { type: Boolean })
const receiveSoundEnabled = defineModel('receiveSoundEnabled', { type: Boolean })
const page = ref('')
const pageTitle = computed(() => ({ edit: '编辑资料', chat: '聊天与互动', sound: '声音与提醒' }[page.value] || ''))
const heading = ref(null)
const entryButtons = ref({})
const photoOpen = ref(false)
const saving = ref(false)
const saveError = ref('')
const profileDraft = ref({ avatar: '', name: '', bio: '' })
let editingProfileId = ''
const soundKinds = [{ id: 'send', title: '发送音效', description: '消息发送时播放', fallback: '轻快短音' }, { id: 'receive', title: '通知音效', description: '收到回复时播放', fallback: '柔和提示音' }]

watch(page, async (value, previous) => {
  emit('subpage', Boolean(value))
  await nextTick()
  if (value) heading.value?.focus()
  else entryButtons.value[previous]?.focus()
})
function openPage(value) {
  if (value === 'edit') {
    editingProfileId = profileSettings.currentProfileId
    profileDraft.value = { avatar: userProfile.avatar, name: userProfile.name, bio: userProfile.bio }
    saveError.value = ''
  }
  page.value = value
}
async function saveProfile() {
  if (!profileDraft.value.name.trim() || saving.value) return
  if (editingProfileId !== profileSettings.currentProfileId) {
    saveError.value = '当前人设已切换，请返回后重新编辑。'
    return
  }
  saving.value = true
  saveError.value = ''
  const values = { ...profileDraft.value, name: profileDraft.value.name.trim(), bio: profileDraft.value.bio.trim() }
  try {
    Object.assign(userProfile, values)
    await persistProfile()
    const stored = await loadValue('jyos_user_profile')
    const saved = stored?.profiles?.find((item) => item.id === editingProfileId)
    if (!saved || Object.keys(values).some((key) => saved[key] !== values[key])) throw new Error('save-failed')
    page.value = ''
    emit('notify', '个人资料已保存')
  } catch {
    saveError.value = '资料暂未保存到设备，请重试。'
  } finally {
    saving.value = false
  }
}
function soundEnabled(kind) { return kind === 'send' ? sendSoundEnabled.value : receiveSoundEnabled.value }
function toggleSound(kind) {
  if (kind === 'send') sendSoundEnabled.value = !sendSoundEnabled.value
  else receiveSoundEnabled.value = !receiveSoundEnabled.value
}
function soundFile(kind) { return kind === 'send' ? props.sendSoundFile : props.receiveSoundFile }
function selectSound(kind, event) {
  const file = event.target.files?.[0]
  if (file) emit('sound-file', kind, file)
  event.target.value = ''
}
</script>

<template>
  <section class="account" :class="{ 'account-detail': page }">
    <template v-if="!page">
      <section class="identity" aria-label="个人资料">
        <button class="identity-avatar" type="button" aria-label="编辑头像与个人资料" :disabled="!isSettingsLoaded" @click="openPage('edit')">
          <img v-if="userProfile.avatar" :src="userProfile.avatar" alt="我的头像" />
          <svg v-else viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="30" r="12" /><path d="M17 70c0-17 9-25 23-25s23 8 23 25" /></svg>
        </button>
        <div class="identity-copy">
          <h1>{{ userProfile.name || '还没有昵称' }}</h1>
          <p :class="{ 'empty-bio': !userProfile.bio }">{{ userProfile.bio || '用一句话，介绍此刻的自己。' }}</p>
          <button :ref="el => entryButtons.edit = el" class="edit-link" type="button" :disabled="!isSettingsLoaded" @click="openPage('edit')">编辑资料<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg></button>
        </div>
      </section>

      <div class="account-section">
        <h2>让聊天更合心意</h2>
        <div class="entry-group">
          <button :ref="el => entryButtons.chat = el" class="account-entry" type="button" @click="openPage('chat')">
            <span class="entry-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H4l1.4-3.5A8 8 0 1 1 20 11.5Z" /><path d="M8 9h8M8 13h5" /></svg></span>
            <span class="entry-copy"><strong>聊天与互动</strong><small>回复方式、发送习惯</small></span>
            <svg class="entry-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
          <button :ref="el => entryButtons.sound = el" class="account-entry" type="button" @click="openPage('sound')">
            <span class="entry-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9M10 21h4" /></svg></span>
            <span class="entry-copy"><strong>声音与提醒</strong><small>为消息选择喜欢的声音</small></span>
            <svg class="entry-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>
      <div class="account-section persona-section">
        <h2>你的聊天方式</h2>
        <div class="entry-group">
          <button class="account-entry" type="button" @click="emit('open-config')">
            <span class="entry-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M6 16c0-3 6-3 6 0M15 9h3M15 13h3" /></svg></span>
            <span class="entry-copy"><strong>人设与预设</strong><small>{{ boundCount ? `${boundCount} 位联系人已绑定人设` : '让每段对话，都有自己的设定' }}</small></span>
            <svg class="entry-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>
        <p class="preset-caption">当前预设<span>{{ presetName || '默认预设' }}</span></p>
      </div>
    </template>

    <template v-else>
      <header class="detail-header">
        <button type="button" class="detail-back" :disabled="saving" aria-label="返回我的" @click="page = ''"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg></button>
        <h1 ref="heading" tabindex="-1">{{ pageTitle }}</h1>
        <span class="header-balance" />
      </header>
      <form v-if="page === 'edit'" class="profile-form" @submit.prevent="saveProfile">
        <button class="draft-avatar" type="button" :disabled="saving" @click="photoOpen = true">
          <span class="identity-avatar"><img v-if="profileDraft.avatar" :src="profileDraft.avatar" alt="头像预览" /><svg v-else viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="30" r="12" /><path d="M17 70c0-17 9-25 23-25s23 8 23 25" /></svg></span>
          <span>更换头像</span>
        </button>
        <label class="profile-field"><span>昵称</span><input v-model="profileDraft.name" :disabled="saving" maxlength="40" autocomplete="nickname" placeholder="希望大家怎么称呼你" required /><small>{{ profileDraft.name.length }} / 40</small></label>
        <label class="profile-field"><span>个人简介<span class="optional">选填</span></span><textarea v-model="profileDraft.bio" :disabled="saving" rows="4" placeholder="分享一点关于你的事…" /><small>简介会显示在你的个人区域</small></label>
        <p class="profile-note"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></svg><span>这里编辑的是当前使用的人设资料，也会同步到使用该人设的聊天；其他独立人设不受影响。</span></p>
        <p v-if="saveError" class="save-error" role="alert">{{ saveError }}</p>
        <button class="save-profile" type="submit" :disabled="saving || !profileDraft.name.trim() || !isSettingsLoaded">{{ saving ? '正在保存…' : '保存资料' }}</button>
        <button class="cancel-edit" type="button" :disabled="saving" @click="page = ''">取消编辑</button>
      </form>
      <div v-else-if="page === 'chat'" class="detail-body">
        <p class="detail-intro">按自己的节奏，开始和继续对话。</p>
        <div class="setting-group">
          <div class="setting-row"><div><strong id="enter-label">回车键发送</strong><p id="enter-help">关闭后，按回车键换行</p></div><button class="account-switch" :class="{ on: enterToSend }" type="button" role="switch" :aria-checked="enterToSend" aria-labelledby="enter-label" aria-describedby="enter-help" :disabled="!preferencesReady" @click="enterToSend = !enterToSend"><span /></button></div>
          <div class="setting-row"><div><strong id="reply-label">发送后立即回复</strong><p id="reply-help">关闭后，可以连发多条消息，再手动接收回复</p></div><button class="account-switch" :class="{ on: replyImmediately }" type="button" role="switch" :aria-checked="replyImmediately" aria-labelledby="reply-label" aria-describedby="reply-help" :disabled="!preferencesReady" @click="replyImmediately = !replyImmediately"><span /></button></div>
        </div>
        <p class="setting-footnote">使用键盘时，Shift + Enter 始终可以换行。<br />设置会自动保存。</p>
      </div>
      <div v-else class="detail-body">
        <p class="detail-intro">一点声音，让消息有自己的温度。</p>
        <section v-for="sound in soundKinds" :key="sound.id" class="sound-section" :aria-label="sound.title">
          <div class="setting-row"><div><strong :id="`${sound.id}-label`">{{ sound.title }}</strong><p>{{ sound.description }}</p></div><button class="account-switch" :class="{ on: soundEnabled(sound.id) }" type="button" role="switch" :aria-checked="soundEnabled(sound.id)" :aria-labelledby="`${sound.id}-label`" :disabled="!preferencesReady" @click="toggleSound(sound.id)"><span /></button></div>
          <div class="sound-selection"><span class="sound-filename">{{ soundFile(sound.id) || sound.fallback }}</span><button type="button" class="preview-sound" :aria-label="`试听${sound.title}`" @click="emit('preview-sound', sound.id)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z" /></svg>试听</button></div>
          <div class="sound-actions"><label class="upload-sound"><input type="file" accept="audio/*" :aria-label="`更换${sound.title}`" @change="selectSound(sound.id, $event)" /><span>更换声音</span></label><button type="button" :disabled="!soundFile(sound.id)" @click="emit('reset-sound', sound.id)">恢复默认</button></div>
        </section>
        <p class="setting-footnote">支持音频文件。自定义声音仅在本次打开应用期间生效；开关设置会自动保存。</p>
      </div>
    </template>
    <PhotoPickerDialog v-if="photoOpen" :model-value="profileDraft.avatar" title="更换头像" eyebrow="个人资料" @save="profileDraft.avatar = $event; photoOpen = false" @close="photoOpen = false" />
  </section>
</template>

<style scoped>
.account{--account-ink:#202428;--account-muted:#687078;--account-accent:#34786b;color:var(--account-ink);padding:0 4px 32px;font-family:inherit}
.account *{box-sizing:border-box}
.account button,.account input,.account textarea{font:inherit}
.account button{cursor:pointer;-webkit-tap-highlight-color:transparent}
.account button:disabled{cursor:default;opacity:.45}
.account svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round;flex:none}
.account button:focus-visible,.account input:focus-visible,.account textarea:focus-visible,.upload-sound:focus-within{outline:2px solid var(--account-accent);outline-offset:4px}
.identity{display:flex;align-items:flex-start;gap:20px;padding:32px 0 43px}
.identity-avatar{display:grid;place-items:center;width:78px;height:78px;flex:none;padding:0;border:0;border-radius:50%;overflow:hidden;background:#e8eeeb;color:#91aaa0}
.identity-avatar img{width:100%;height:100%;object-fit:cover}
.identity-avatar svg{width:100%;height:100%;fill:currentColor;stroke:none}
.identity-copy{min-width:0;flex:1;padding-top:2px}
.identity-copy h1{margin:0;color:var(--account-ink);font-size:25px;font-weight:650;line-height:1.3;letter-spacing:-.5px;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.identity-copy p{margin:9px 0 7px;color:#606b69;font-size:14px;line-height:1.7;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.identity-copy p.empty-bio{color:#727a7e}
.edit-link{display:inline-flex;align-items:center;gap:4px;min-height:44px;margin-left:-2px;padding:0 2px;border:0;color:var(--account-accent);background:transparent;font-size:13px!important;font-weight:550!important}
.edit-link svg{width:16px;height:16px}
.account-section h2{margin:0 0 12px 2px;color:var(--account-muted);font-size:12px;font-weight:500;letter-spacing:.04em}
.entry-group{overflow:hidden;border:1px solid #e9edeb;border-radius:17px;background:#fff}
.account-entry{position:relative;display:flex;align-items:center;width:100%;gap:14px;min-height:86px;padding:17px 18px;border:0;background:transparent;text-align:left;color:inherit;transition:background .16s}
.account-entry+.account-entry:before{content:'';position:absolute;top:0;left:58px;right:18px;height:1px;background:#eef0ee}
.account-entry:active{background:#f0f4f2}
.entry-icon{display:grid;place-items:center;width:24px;flex:none;color:#536c63}
.entry-copy{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1}
.entry-copy strong{font-size:16px;font-weight:550;line-height:1.4}
.entry-copy small{color:var(--account-muted);font-size:12px;line-height:1.55;overflow-wrap:anywhere}
.account .entry-chevron{width:16px;height:16px;color:#939c98;stroke-width:1.5}
.persona-section{margin-top:29px}
.preset-caption{display:flex;gap:10px;margin:12px 4px 0;color:#747d78;font-size:11px;line-height:1.6}
.preset-caption>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#5a685f}
.detail-header{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;min-height:64px;margin:0 -6px 18px}
.detail-header h1{margin:0;text-align:center;font-size:17px;font-weight:600;outline:none}
.detail-back{display:grid;place-items:center;width:44px;height:44px;border:0;background:transparent;color:var(--account-ink)}
.header-balance{width:44px}
.detail-intro{margin:12px 0 24px;color:var(--account-muted);font-size:14px;line-height:1.8}
.setting-group,.sound-section{padding:0 18px;border:1px solid #e9edeb;border-radius:17px;background:#fff}
.setting-row{display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:92px;padding:20px 0}
.setting-row+.setting-row{border-top:1px solid #edf0ed}
.setting-row>div{min-width:0}
.setting-row strong{font-size:15px;font-weight:550}
.setting-row p{margin:6px 0 0;color:var(--account-muted);font-size:13px;line-height:1.65}
.account-switch{position:relative;width:48px;height:44px;flex:none;padding:0;border:0;background:transparent}
.account-switch:before{content:'';position:absolute;inset:8px 0;border-radius:20px;background:#dce1de;transition:background .18s}
.account-switch>span{position:absolute;left:3px;top:11px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #182b2120;transition:transform .18s}
.account-switch.on:before{background:var(--account-accent)}
.account-switch.on>span{transform:translateX(20px)}
.setting-footnote{margin:16px 4px;color:var(--account-muted);font-size:12px;line-height:1.9}
.sound-section+.sound-section{margin-top:20px}
.sound-selection{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #edf0ed}
.sound-filename{min-width:0;flex:1;overflow-wrap:anywhere;color:#424e48;font-size:13px;line-height:1.6}
.preview-sound{display:flex;align-items:center;gap:4px;min-height:44px;padding:0 10px;border:0;border-radius:10px;color:var(--account-accent);background:#eef4f0;font-size:12px!important;flex:none}
.preview-sound svg{width:17px;height:17px}
.sound-actions{display:flex;gap:20px;padding-bottom:12px}
.sound-actions button,.upload-sound{display:inline-flex;align-items:center;min-height:44px;padding:0;border:0;background:transparent;color:var(--account-accent);font-size:13px!important}
.sound-actions button{color:var(--account-muted)}
.upload-sound{position:relative;cursor:pointer;border-radius:4px}
.upload-sound input{position:absolute;inset:0;width:100%;opacity:0;cursor:pointer}
.draft-avatar{display:flex;flex-direction:column;align-items:center;gap:14px;margin:8px auto 32px;padding:8px 16px;border:0;color:var(--account-accent);background:transparent;font-size:13px!important}
.draft-avatar .identity-avatar{width:88px;height:88px}
.profile-field{display:flex;flex-direction:column;gap:10px;margin-bottom:23px}
.profile-field>span{display:flex;align-items:center;justify-content:space-between;font-size:14px;font-weight:550}
.optional{color:var(--account-muted);font-size:12px;font-weight:400}
.profile-field input,.profile-field textarea{width:100%;min-width:0;padding:14px 15px;border:1px solid #e1e7e3;border-radius:12px;background:#fff;color:var(--account-ink);font-size:16px;line-height:1.65}
.profile-field textarea{resize:vertical;min-height:126px}
.profile-field input::placeholder,.profile-field textarea::placeholder{color:#7e8782}
.profile-field small{text-align:right;color:var(--account-muted);font-size:11px}
.profile-note{display:flex;align-items:flex-start;gap:9px;color:var(--account-muted);font-size:12px;line-height:1.8;margin:0 0 24px}
.profile-note svg{width:17px;height:17px;margin-top:2px}
.save-profile{width:100%;min-height:49px;border:0;border-radius:13px;background:var(--account-accent);color:#fff;font-size:15px!important;font-weight:550!important}
.cancel-edit{display:block;min-height:44px;margin:8px auto 0;padding:0 18px;border:0;background:transparent;color:var(--account-muted);font-size:13px!important}
.save-error{color:#a13737;font-size:13px;line-height:1.6}
@media(hover:hover){.account-entry:hover{background:#f6f8f6}.edit-link:hover,.sound-actions button:hover{color:#245c50}}
@media(max-width:360px){.identity{gap:14px}.identity-avatar{width:68px;height:68px}.identity-copy h1{font-size:23px}.account-entry{padding:16px 14px;gap:12px}}
@media(prefers-reduced-motion:reduce){.account *,.account *:before{transition:none!important}}
</style>
