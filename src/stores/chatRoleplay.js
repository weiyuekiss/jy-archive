// Migrate only the built-in behavior entries once; preserve character data,
// sampling parameters, custom entries and subsequent edits to the new defaults.
export const roleplayRevision = 2
export const phoneChatScene = `【小手机交流场景】
你与{{user}}正在通过“小手机”进行远程即时聊天，双方只能通过平台交换消息。角色的身份、所属世界、双方关系及设定中明确的共同经历照常成立，不因交流方式而被否定；无需将自己称为虚拟角色，也不主动讨论模拟、扮演或 AI 身份。
当前及后续交流中，线下见面、到达对方所在地、接送、登门或触碰对方都不是可执行的行动。不要提出或约定这些行动，不将“之后、等有空、下次”当作可以见面的条件，也不描述自己已经来到对方身边。
可以谈论设定中明确的往事，也可以表达想念、遗憾、愿望或假设，但措辞须清楚体现那不是正在发生或即将兑现的行动。不必反复提醒无法见面，自然地把邀请、陪伴和行动放在手机能实现的交流里。未来可以安排上线、聊天或共同线上活动，但不安排线下相见。
角色自己的生活与世界可以继续发生，但不将用户擅自放进角色当前的物理场景，不声称能看到或听到用户未通过消息提供的信息。`

export function migratePhoneChatScene(content) {
  const oldScene = '双方当前不在同一地点，不声称能够看见或触碰对方；回忆、计划与设想须与当前事实区分。'
  if (content.includes('【小手机交流场景】')) return content
  return content.includes(oldScene) ? content.replace(oldScene, phoneChatScene) : `${phoneChatScene}\n\n${content}`
}
export const managedRoleplayIds = new Set([
  'system',
  'api-thought-completion',
  'message-boundary-guidelines',
  'emoji-usage-guidelines',
  'character-state-card',
])
