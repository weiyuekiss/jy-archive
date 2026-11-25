<script setup>
// 新消息提示：全局渲染，桌面和任何应用里都能看到。点击后打开对应的聊天。
import { replyNotices, openNoticeFromAnywhere } from '@/stores/replyNotice'
import { openApp } from '@/stores/desktop'
import { dockApps } from '@/apps'

function chatNameOf(chat) {
  return chat?.name || '聊天'
}

// 打开聊天 app；聊天 app 挂载后会读取 pendingNoticeChat 并切换到对应聊天
function openChatApp() {
  const chatApp = dockApps.find((app) => app.id === 'chat')
  if (chatApp) openApp(chatApp)
}

function onOpen(notice) {
  openNoticeFromAnywhere(notice, openChatApp)
}
</script>

<template>
  <div v-if="replyNotices.length" class="reply-notice-stack" aria-live="polite" aria-label="新消息">
    <button
      v-for="(notice, index) in replyNotices"
      :key="notice.id"
      type="button"
      class="reply-notice"
      :style="{ '--stack-index': index }"
      :aria-label="`打开${chatNameOf(notice.chat)}的聊天`"
      @click="onOpen(notice)"
    >
      <span class="notice-avatar" :class="{ 'avatar-placeholder': !notice.chat?.avatarImage }" :style="{ '--avatar-color': notice.chat?.color }"><img v-if="notice.chat?.avatarImage" :src="notice.chat.avatarImage" alt="" /><span v-else></span></span>
      <span class="notice-copy"><strong>{{ chatNameOf(notice.chat) }}</strong><span>{{ notice.text }}</span></span>
      <span class="notice-time">现在</span>
    </button>
  </div>
</template>

<style scoped>
.reply-notice-stack{position:fixed;top:calc(env(safe-area-inset-top) + 10px);left:50%;z-index:60;width:min(calc(100% - 28px),440px);display:flex;flex-direction:column;align-items:center;pointer-events:none;transform:translateX(-50%)}
.reply-notice{width:100%;min-height:66px;position:relative;display:flex;align-items:center;gap:11px;margin-top:calc(var(--stack-index) * -12px);padding:11px 14px;border:1px solid #ffffffa8;border-radius:22px;background:linear-gradient(135deg,#ffffffd9,#f4f3f0ce);box-shadow:0 12px 32px #29282520;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);animation:notice-in .38s cubic-bezier(.2,.8,.2,1) both;transform:scale(calc(1 - var(--stack-index) * .025));transform-origin:top center;color:inherit;text-align:left;font:inherit;cursor:pointer;pointer-events:auto}
.reply-notice:not(:first-child){margin-top:-13px;filter:brightness(.98)}
.avatar-placeholder{background:#bdbdbd!important}
.notice-avatar{width:42px;height:42px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border:2px solid #ffffffd9;border-radius:50%;color:#626366;background:linear-gradient(145deg,#fff,var(--avatar-color));font-family:Georgia,serif;font-size:15px}
.notice-avatar img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
.notice-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}
.notice-copy strong{overflow:hidden;color:#45464a;font-size:12px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}
.notice-copy>span{display:-webkit-box;overflow:hidden;color:#696a6e;font-size:12px;line-height:1.4;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.notice-time{align-self:flex-start;flex:none;color:#aaa9a5;font-size:9px}
@keyframes notice-in{from{opacity:0;translate:0 -18px;scale:.97}to{opacity:1;translate:0 0;scale:1}}
@media(prefers-reduced-motion:reduce){.reply-notice{animation:none}}
</style>
