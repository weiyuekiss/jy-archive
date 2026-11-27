// 把角色回复里的句号当作分句符：一条文字消息含多个句子时，拆成多条消息依次发出。
// 只拆分 type 为 text 且拆出两段以上的消息；只有一句的消息保持原样。
// 拆开后，译文会清空（由界面按每条单独翻译），回复引用和表情回应放在第一条，状态栏放在最后一条。

export function splitSentenceReplies(replies) {
  return replies.flatMap((reply) => {
    if (reply.type !== 'text' || typeof reply.text !== 'string') return [reply]
    const parts = reply.text.split('。').map((part) => part.trim()).filter(Boolean)
    if (parts.length <= 1) return [reply]
    return parts.map((text, index) => {
      const first = index === 0
      const last = index === parts.length - 1
      return {
        ...reply,
        text,
        translation: '',
        replyTo: first ? reply.replyTo ?? null : null,
        reactionEmoji: first ? reply.reactionEmoji ?? null : null,
        reactionTo: first ? reply.reactionTo ?? null : null,
        status: last ? reply.status ?? null : null,
      }
    })
  })
}
