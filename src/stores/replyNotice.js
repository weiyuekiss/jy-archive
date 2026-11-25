// 新消息提示的共享队列。聊天页推送，App.vue 里的 ReplyNoticeStack 渲染。
// 放在全局而不是聊天页里，这样离开聊天 app 回到桌面，提示仍然可见。
import { ref } from 'vue'

export const replyNotices = ref([])
let noticeId = 0

// 角色回复到达时调用：chat 为聊天对象（含 id、name、avatarImage、color），text 为回复内容
export function pushReplyNotice(chat, text) {
  const id = ++noticeId
  replyNotices.value.push({ id, chat, text })
  window.setTimeout(() => dismissReplyNotice(id), 5200)
  return id
}

export function dismissReplyNotice(id) {
  replyNotices.value = replyNotices.value.filter((notice) => notice.id !== id)
}

export function clearReplyNotices() {
  replyNotices.value = []
}

// 点击提示后要打开的聊天：由 ChatApp 在挂载或激活时读取并清空
export const pendingNoticeChat = ref(null)

export function openNoticeFromAnywhere(notice, openChatApp) {
  pendingNoticeChat.value = { chatId: notice.chat.id, text: notice.text }
  dismissReplyNotice(notice.id)
  openChatApp()
}
