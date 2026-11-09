import { ref } from 'vue'

export const chatErrorDialog = ref(null)

export function reportChatError(error, chat) {
  const status = Number(error?.status) || 0
  const code = error?.code || (status ? `HTTP_${status}` : error?.name === 'AbortError' ? 'REQUEST_ABORTED' : 'CHAT_REPLY_FAILED')
  const message = error?.message || '回复失败，未收到具体错误信息。'
  chatErrorDialog.value = {
    code: String(code),
    message: String(message),
    chatName: chat?.name || '未知聊天',
    time: new Date().toLocaleString('zh-CN'),
    details: [`错误码：${String(code)}`, `错误信息：${String(message)}`, `聊天对象：${chat?.name || '未知聊天'}`, `发生时间：${new Date().toLocaleString('zh-CN')}`].join('\n'),
  }
}
