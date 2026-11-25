// 群聊数据：群的基本信息、成员、回复方式。群消息和单聊一样存在 jyos_chat_messages 里，按群 id 分开。
import { ref } from 'vue'
import { saveValue } from './db'

export const GROUP_REPLY_MODES = [
  { id: 'smart', label: '智能接话', hint: '每轮由模型判断哪些成员会回应，人数不超过下方设置的上限。' },
  { id: 'round', label: '全员轮流', hint: '每轮所有成员按列表顺序各发言一次。' }
]
export const DEFAULT_MAX_SPEAKERS = 3

export const groupChats = ref([])

export function isGroupId(id) {
  return typeof id === 'string' && id.startsWith('group-')
}

export function groupOf(id) {
  return groupChats.value.find((group) => group.id === id) || null
}

function normalizeGroup(raw) {
  if (!raw || typeof raw.id !== 'string' || !Array.isArray(raw.memberIds)) return null
  const maxSpeakers = Math.round(Number(raw.maxSpeakers))
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : '群聊',
    avatarImage: typeof raw.avatarImage === 'string' ? raw.avatarImage : '',
    color: typeof raw.color === 'string' ? raw.color : '#dededb',
    announcement: typeof raw.announcement === 'string' ? raw.announcement : '',
    // 角色 id 是数字（jyos_characters 里的 id 由 nextId 递增生成），两种类型都要保留
    memberIds: raw.memberIds.filter((id) => typeof id === 'string' || typeof id === 'number'),
    left: raw.left === true,
    replyMode: GROUP_REPLY_MODES.some((mode) => mode.id === raw.replyMode) ? raw.replyMode : 'smart',
    maxSpeakers: Number.isFinite(maxSpeakers) ? Math.max(1, Math.min(6, maxSpeakers)) : DEFAULT_MAX_SPEAKERS,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()
  }
}

export function loadGroupChats(saved) {
  groupChats.value = Array.isArray(saved) ? saved.map(normalizeGroup).filter(Boolean) : []
}

async function persistGroupChats() {
  await saveValue('jyos_group_chats', JSON.parse(JSON.stringify(groupChats.value)))
}

export async function createGroupChat(input) {
  const id = `group-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
  const group = normalizeGroup({ ...input, id, color: '#dededb', createdAt: new Date().toISOString() })
  if (!group) throw new Error('群聊信息不完整，无法创建。')
  groupChats.value = [group, ...groupChats.value]
  await persistGroupChats()
  return group
}

// 好友关系变动后，把已不是好友（或已不存在）的角色从群成员里移除
export async function pruneGroupMembers(isValid) {
  let changed = false
  groupChats.value = groupChats.value.map((group) => {
    const memberIds = group.memberIds.filter(isValid)
    if (memberIds.length === group.memberIds.length) return group
    changed = true
    return { ...group, memberIds }
  })
  if (changed) await persistGroupChats()
}

// 聊天列表里要显示的群（已退出的群不显示，但记录保留）
export function visibleGroups() {
  return groupChats.value.filter((group) => !group.left)
}

export async function updateGroup(id, patch) {
  const current = groupOf(id)
  if (!current) throw new Error('群聊不存在，无法保存。')
  const next = normalizeGroup({ ...current, ...patch, id })
  groupChats.value = groupChats.value.map((group) => (group.id === id ? next : group))
  await persistGroupChats()
  return next
}

// 删除群聊：群本身从存储中移除。群消息由调用方（ChatApp）一并删除。
export async function deleteGroup(id) {
  groupChats.value = groupChats.value.filter((group) => group.id !== id)
  await persistGroupChats()
}

// 退群：群从列表消失且不再显示，记录留在存储里
export async function leaveGroup(id) {
  groupChats.value = groupChats.value.map((group) => (group.id === id ? { ...group, left: true } : group))
  await persistGroupChats()
}

// 聊天列表里的一项。group: true 让列表显示「群」标记。
export function groupChatItem(group) {
  return {
    id: group.id,
    name: group.name,
    subtitle: '群聊',
    time: '',
    unread: 0,
    color: group.color,
    avatar: group.name.slice(0, 1),
    avatarImage: group.avatarImage,
    group: true
  }
}
