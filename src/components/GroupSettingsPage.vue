<script setup>
// 群设置页：改群头像、群名、群公告，增删成员，改回复方式，退群或删除群。
// 每次修改都直接通过 patch 事件交给父组件保存，不需要额外的保存按钮。
import { computed, ref } from 'vue'
import { GROUP_REPLY_MODES } from '@/stores/groupChats'
import { readSquareAvatar } from '@/components/groupAvatar'

const props = defineProps({
  group: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  candidates: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'patch', 'leave', 'delete'])

const confirmAction = ref('')
const avatarError = ref('')
const avatarInput = ref(null)
const confirmText = computed(() => confirmAction.value === 'delete'
  ? '删除后这个群和群里的聊天记录都会被删掉，无法恢复。'
  : '退出后群会从聊天列表消失，聊天记录保留在本机。')

function rename(event) {
  const name = event.target.value.trim()
  if (!name) {
    event.target.value = props.group.name
    return
  }
  if (name !== props.group.name) emit('patch', { name })
}

function addMember(id) {
  emit('patch', { memberIds: [...props.group.memberIds, id] })
}

function removeMember(id) {
  emit('patch', { memberIds: props.group.memberIds.filter((item) => item !== id) })
}

async function pickAvatar(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  avatarError.value = ''
  try {
    emit('patch', { avatarImage: await readSquareAvatar(file) })
  } catch (error) {
    avatarError.value = error.message
  }
}

function runConfirm() {
  const action = confirmAction.value
  confirmAction.value = ''
  emit(action === 'delete' ? 'delete' : 'leave')
}
</script>

<template>
  <section class="gs" role="dialog" aria-modal="true" aria-label="群设置">
    <header class="gs-head">
      <button type="button" class="gs-back" aria-label="返回群聊" @click="emit('close')">‹</button>
      <h2>群设置</h2>
      <i />
    </header>

    <div class="gs-body">
      <div class="gs-card">
        <div class="gs-avatar-row">
          <button type="button" class="gs-avatar" aria-label="更换群头像" @click="avatarInput?.click()">
            <img v-if="group.avatarImage" :src="group.avatarImage" alt="" />
            <span v-else>{{ (group.name || '群').slice(0, 1) }}</span>
          </button>
          <input ref="avatarInput" class="gs-hidden-input" type="file" accept="image/*" @change="pickAvatar" />
          <p class="gs-avatar-hint">{{ avatarError || '点击更换群头像' }}</p>
        </div>
        <label class="gs-row">
          <span>群名称</span>
          <input :value="group.name" maxlength="30" @change="rename" />
        </label>
      </div>

      <div class="gs-card">
        <label class="gs-field">
          <span>群公告</span>
          <textarea :value="group.announcement" maxlength="500" rows="3" placeholder="暂无群公告" @change="emit('patch', { announcement: $event.target.value.trim() })"></textarea>
        </label>
      </div>

      <div class="gs-title"><span>群成员</span><small>{{ members.length }} 人</small></div>
      <ul v-if="members.length" class="gs-card gs-list">
        <li v-for="member in members" :key="member.id">
          <span class="gs-mini" :style="{ '--c': member.color || '#dededb' }"><img v-if="member.avatar" :src="member.avatar" alt="" /><span v-else>{{ (member.name || '?').slice(0, 1) }}</span></span>
          <span class="gs-name">{{ member.name }}</span>
          <button type="button" class="gs-action" @click="removeMember(member.id)">移出</button>
        </li>
      </ul>
      <p v-else class="gs-hint">群里没有成员，群聊无法回复。</p>

      <template v-if="candidates.length">
        <div class="gs-title"><span>添加好友入群</span></div>
        <ul class="gs-card gs-list">
          <li v-for="person in candidates" :key="person.id">
            <span class="gs-mini" :style="{ '--c': person.color || '#dededb' }"><img v-if="person.avatar" :src="person.avatar" alt="" /><span v-else>{{ (person.name || '?').slice(0, 1) }}</span></span>
            <span class="gs-name">{{ person.name }}</span>
            <button type="button" class="gs-action gs-add" @click="addMember(person.id)">加入</button>
          </li>
        </ul>
      </template>

      <div class="gs-title"><span>回复方式</span></div>
      <div class="gs-card">
        <label v-for="mode in GROUP_REPLY_MODES" :key="mode.id" class="gs-radio">
          <input type="radio" name="group-reply-mode" :checked="group.replyMode === mode.id" @change="emit('patch', { replyMode: mode.id })" />
          <span><strong>{{ mode.label }}</strong><small>{{ mode.hint }}</small></span>
        </label>
        <label v-if="group.replyMode === 'smart'" class="gs-row">
          <span>每轮最多发言</span>
          <select :value="group.maxSpeakers" @change="emit('patch', { maxSpeakers: Number($event.target.value) })">
            <option v-for="n in 6" :key="n" :value="n">{{ n }} 人</option>
          </select>
        </label>
      </div>

      <div class="gs-danger-row">
        <button type="button" class="gs-leave" @click="confirmAction = 'leave'">退出群聊</button>
        <button type="button" class="gs-delete" @click="confirmAction = 'delete'">删除群聊</button>
      </div>
    </div>

    <div v-if="confirmAction" class="gs-mask" @click.self="confirmAction = ''">
      <section class="gs-sheet" role="alertdialog" aria-modal="true" aria-label="确认">
        <h3>{{ confirmAction === 'delete' ? '删除群聊' : '退出群聊' }}</h3>
        <p>{{ confirmText }}</p>
        <div class="gs-sheet-actions">
          <button type="button" @click="confirmAction = ''">取消</button>
          <button type="button" class="gs-sheet-ok" @click="runConfirm">确定</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.gs{position:fixed;inset:0;z-index:39;display:flex;flex-direction:column;box-sizing:border-box;background:#f2f2f2;color:#44464a;font-size:14px}
.gs-head{flex:none;box-sizing:border-box;display:grid;grid-template-columns:44px 1fr 44px;grid-template-rows:52px;align-items:center;padding:env(safe-area-inset-top,0px) 8px 0;border-bottom:1px solid #e4e5e5;background:#fbfbfb}
.gs-head h2{margin:0;text-align:center;font-size:16px;font-weight:650}
.gs-back{width:44px;height:44px;border:0;background:transparent;color:#44464a;font-size:30px;line-height:1;cursor:pointer}
.gs-body{flex:1;min-height:0;overflow-y:auto;padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 28px)}
.gs-card{margin-bottom:10px;border-radius:14px;background:#fff;overflow:hidden}
.gs-card+.gs-card{margin-top:0}
.gs-avatar-row{display:flex;align-items:center;gap:14px;padding:14px}
.gs-avatar{width:60px;height:60px;flex:none;display:grid;place-items:center;padding:0;overflow:hidden;border:0;border-radius:16px;background:#ececec;color:#7b7e82;font-size:22px;cursor:pointer}
.gs-avatar img{width:100%;height:100%;object-fit:cover}
.gs-hidden-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.gs-avatar-hint{margin:0;color:#9a9da1;font-size:12px}
.gs-row,.gs-field{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-top:1px solid #f0f0f0}
.gs-avatar-row+.gs-row{border-top:1px solid #f0f0f0}
.gs-row input,.gs-row select{min-width:0;flex:1;border:0;outline:0;background:transparent;text-align:right;color:#44464a;font:inherit}
.gs-field{flex-direction:column;align-items:stretch;gap:6px;border-top:0}
.gs-field span{color:#8a8d91;font-size:12px}
.gs-field textarea{border:0;outline:0;background:transparent;color:#44464a;font:inherit;resize:none}
.gs-title{display:flex;align-items:baseline;justify-content:space-between;margin:18px 4px 8px;color:#8a8d91;font-size:12px}
.gs-title small{color:#a8abae}
.gs-list{margin-bottom:10px}
.gs-list li{display:flex;align-items:center;gap:12px;padding:10px 14px}
.gs-list li+li{border-top:1px solid #f0f0f0}
.gs-mini{width:36px;height:36px;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:10px;background:var(--c);color:#fff;font-size:14px}
.gs-mini img{width:100%;height:100%;object-fit:cover}
.gs-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gs-action{flex:none;padding:6px 12px;border:0;border-radius:10px;background:#f1f1f1;color:#e35a4f;font:inherit;font-size:12px;cursor:pointer}
.gs-action.gs-add{color:#07a35a;background:#e7f7ee}
.gs-hint{margin:0 4px 10px;color:#a8abae;font-size:12px}
.gs-radio{display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer}
.gs-radio+.gs-radio{border-top:1px solid #f0f0f0}
.gs-radio input{accent-color:#07c160}
.gs-radio span{display:flex;flex-direction:column;gap:3px}
.gs-radio strong{font-size:14px;font-weight:600}
.gs-radio small{color:#8a8d91;font-size:12px;line-height:1.5}
.gs-danger-row{display:flex;flex-direction:column;gap:10px;margin-top:22px}
.gs-danger-row button{height:46px;border:0;border-radius:14px;background:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.gs-leave{color:#44464a}
.gs-delete{color:#e35a4f}
.gs-mask{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:24px;background:#0000004d}
.gs-sheet{width:min(100%,320px);padding:22px 20px 16px;border-radius:18px;background:#fff;color:#44464a;box-sizing:border-box}
.gs-sheet h3{margin:0 0 8px;font-size:16px}
.gs-sheet p{margin:0 0 18px;color:#8a8d91;font-size:13px;line-height:1.6}
.gs-sheet-actions{display:flex;gap:10px}
.gs-sheet-actions button{flex:1;height:40px;border:0;border-radius:12px;background:#f1f1f1;color:#44464a;font:inherit;cursor:pointer}
.gs-sheet-actions .gs-sheet-ok{background:#e35a4f;color:#fff}
</style>
