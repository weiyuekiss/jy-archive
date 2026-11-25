<script setup>
// 新建群聊页：群头像、群名、群公告、选择成员、回复方式。提交时只把表单数据抛给父组件，由父组件写入群聊数据。
import { computed, ref } from 'vue'
import { GROUP_REPLY_MODES, DEFAULT_MAX_SPEAKERS } from '@/stores/groupChats'
import { readSquareAvatar } from '@/components/groupAvatar'

const props = defineProps({
  // 可以拉进群的成员：已经是好友的角色
  friends: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'created'])

const name = ref('')
const avatarImage = ref('')
const announcement = ref('')
const memberIds = ref([])
const replyMode = ref('smart')
const maxSpeakers = ref(DEFAULT_MAX_SPEAKERS)
const avatarInput = ref(null)
const avatarError = ref('')

const canCreate = computed(() => name.value.trim().length > 0 && memberIds.value.length > 0)
const modeHint = computed(() => GROUP_REPLY_MODES.find((mode) => mode.id === replyMode.value)?.hint || '')

function toggleMember(id) {
  memberIds.value = memberIds.value.includes(id)
    ? memberIds.value.filter((item) => item !== id)
    : [...memberIds.value, id]
}

async function readAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  avatarError.value = ''
  try {
    avatarImage.value = await readSquareAvatar(file)
  } catch (error) {
    avatarError.value = error.message
  }
}

function submit() {
  if (!canCreate.value) return
  emit('created', {
    name: name.value.trim(),
    avatarImage: avatarImage.value,
    announcement: announcement.value.trim(),
    memberIds: memberIds.value,
    replyMode: replyMode.value,
    maxSpeakers: Number(maxSpeakers.value)
  })
}
</script>

<template>
  <section class="group-create" role="dialog" aria-modal="true" aria-label="新建群聊">
    <header class="group-create-head">
      <button type="button" class="group-create-back" aria-label="返回聊天列表" @click="emit('close')">‹</button>
      <h2>新建群聊</h2>
      <button type="button" class="group-create-done" :disabled="!canCreate" @click="submit">完成</button>
    </header>

    <div class="group-create-body">
      <div class="group-avatar-row">
        <button type="button" class="group-avatar-pick" aria-label="选择群头像" @click="avatarInput?.click()">
          <img v-if="avatarImage" :src="avatarImage" alt="" />
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4"/></svg>
        </button>
        <input ref="avatarInput" class="visually-hidden-input" type="file" accept="image/*" @change="readAvatar" />
        <p class="group-avatar-hint">{{ avatarError || '点击设置群头像（可不设）' }}</p>
      </div>

      <label class="group-field">
        <span>群名称</span>
        <input v-model="name" type="text" maxlength="30" placeholder="给群起个名字" />
      </label>

      <label class="group-field">
        <span>群公告</span>
        <textarea v-model="announcement" maxlength="500" rows="3" placeholder="写一段群公告，成员都能看到（可不填）"></textarea>
      </label>

      <div class="group-section-title">
        <span>成员</span>
        <small>已选 {{ memberIds.length }} 人</small>
      </div>
      <ul v-if="friends.length" class="group-member-list">
        <li v-for="friend in friends" :key="friend.id">
          <label :class="{ on: memberIds.includes(friend.id) }">
            <input type="checkbox" :checked="memberIds.includes(friend.id)" @change="toggleMember(friend.id)" />
            <span class="group-member-avatar" :class="{ 'avatar-placeholder': !friend.avatar }" :style="{ '--avatar-color': friend.color || '#dededb' }">
              <img v-if="friend.avatar" :src="friend.avatar" alt="" />
              <span v-else>{{ (friend.name || '?').slice(0, 1) }}</span>
            </span>
            <span class="group-member-name">{{ friend.name }}</span>
            <i class="group-member-check" aria-hidden="true"></i>
          </label>
        </li>
      </ul>
      <p v-else class="group-empty">还没有好友，先在聊天列表里添加角色。</p>

      <div class="group-section-title"><span>回复方式</span></div>
      <div class="group-mode-list" role="radiogroup" aria-label="群聊回复方式">
        <label v-for="mode in GROUP_REPLY_MODES" :key="mode.id" :class="{ on: replyMode === mode.id }">
          <input v-model="replyMode" type="radio" :value="mode.id" />
          <strong>{{ mode.label }}</strong>
          <small>{{ mode.hint }}</small>
        </label>
      </div>
      <p class="group-mode-hint">{{ modeHint }}</p>

      <label v-if="replyMode === 'smart'" class="group-field group-field-inline">
        <span>每轮最多发言人数</span>
        <select v-model="maxSpeakers">
          <option v-for="n in 6" :key="n" :value="n">{{ n }} 人</option>
        </select>
      </label>
    </div>
  </section>
</template>

<style scoped>
.group-create{position:fixed;inset:0;z-index:39;display:flex;flex-direction:column;box-sizing:border-box;background:#f7f7f7;color:#44464a;font-size:14px}
.group-create-head{flex:none;box-sizing:border-box;display:grid;grid-template-columns:44px 1fr auto;grid-template-rows:52px;align-items:center;padding:env(safe-area-inset-top, 0px) 8px 0;border-bottom:1px solid #e9eaea;background:#fbfbfb}
.group-create-head h2{align-self:center;text-align:center}
.group-create-head .group-create-back{align-self:center;justify-self:start}
.group-create-head h2{margin:0;font-size:16px;font-weight:650}
.group-create-head .group-create-done{justify-self:end;align-self:center}
.group-create-back{width:44px;height:44px;border:0;background:transparent;color:#44464a;font-size:30px;line-height:1;cursor:pointer}
.group-create-done{min-width:56px;height:36px;border:0;border-radius:10px;color:#fff;background:#07c160;font-size:14px;font-weight:600;cursor:pointer}
.group-create-done:disabled{background:#d6d8d8;cursor:default}
.group-create-body{flex:1;min-height:0;overflow-y:auto;padding:18px 16px calc(env(safe-area-inset-bottom) + 28px);-webkit-overflow-scrolling:touch}
.visually-hidden-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.group-avatar-row{display:flex;align-items:center;gap:14px;margin-bottom:6px}
.group-avatar-pick{width:72px;height:72px;flex:none;display:grid;place-items:center;padding:0;overflow:hidden;border:0;border-radius:18px;color:#9a9da1;background:#ececec;cursor:pointer}
.group-avatar-pick img{width:100%;height:100%;object-fit:cover}
.group-avatar-pick svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.group-avatar-hint{margin:0;color:#9a9da1;font-size:12px;line-height:1.5}
.group-field{display:flex;flex-direction:column;gap:7px;margin-top:16px;padding:12px 14px;border-radius:14px;background:#fff}
.group-field>span{color:#8a8d91;font-size:12px}
.group-field input,.group-field textarea,.group-field select{border:0;outline:0;background:transparent;color:#44464a;font:inherit;resize:none}
.group-field-inline{flex-direction:row;align-items:center;justify-content:space-between}
.group-section-title{display:flex;align-items:baseline;justify-content:space-between;margin:24px 2px 9px;color:#8a8d91;font-size:12px}
.group-section-title small{color:#a8abae}
.group-member-list{margin:0;padding:0;list-style:none;border-radius:14px;overflow:hidden;background:#fff}
.group-member-list li+li{border-top:1px solid #f0f0f0}
.group-member-list label{display:flex;align-items:center;gap:12px;padding:10px 14px;cursor:pointer}
.group-member-list input{position:absolute;opacity:0;pointer-events:none}
.group-member-avatar{width:36px;height:36px;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:10px;color:#fff;background:var(--avatar-color);font-size:14px}
.group-member-avatar img{width:100%;height:100%;object-fit:cover}
.group-member-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.group-member-check{width:20px;height:20px;flex:none;border:1.5px solid #c9ccce;border-radius:50%}
.group-member-list label.on .group-member-check{border-color:#07c160;background:#07c160;box-shadow:inset 0 0 0 4px #fff}
.group-empty{margin:0;padding:14px;color:#a8abae;font-size:12px;background:#fff;border-radius:14px}
.group-mode-list{display:flex;flex-direction:column;gap:8px}
.group-mode-list label{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border:1.5px solid transparent;border-radius:14px;background:#fff;cursor:pointer}
.group-mode-list label.on{border-color:#07c160}
.group-mode-list input{position:absolute;opacity:0;pointer-events:none}
.group-mode-list strong{font-size:14px;font-weight:600}
.group-mode-list small{color:#8a8d91;font-size:12px;line-height:1.5}
.group-mode-hint{margin:8px 2px 0;color:#a8abae;font-size:11px;line-height:1.6}
</style>
