// 查手机的后台生成与刷新。任务状态放在模块里，离开查手机页面也不会中断；
// 完成或失败后写入 phoneNotice，由 App.vue 里的 PhoneNoticeDialog 弹窗提示。
import { reactive, ref } from 'vue'
import { generatePhoneContent } from '@/components/pet/generatePhoneContent'
import { setPhoneContent, replaceManyItemsOfTypes } from './phone'

// 正在进行的任务。键为 `${角色id}:${任务}`，任务是 'full'（生成整台手机）或某个应用的刷新分组 key。
// 每个应用的刷新互不影响：同一角色可以同时刷新多个应用，每次点击各发一次请求。
export const phoneJobs = reactive({})
// 完成或失败后的弹窗内容：{ kind: 'success' | 'error', title, message, raw }
export const phoneNotice = ref(null)

// 取消控制器不放进响应式对象
const controllers = new Map()

// 单个应用的刷新分组。key 与查手机里各应用的 key 对应，types 为该应用写入的内容类型。
export const REFRESH_GROUPS = [
  { key: 'messages', label: '微信聊天', types: ['messages'] },
  { key: 'mails', label: '邮箱', types: ['mails'] },
  { key: 'notes', label: '备忘录', types: ['notes'] },
  { key: 'music', label: '音乐', types: ['music'] },
  { key: 'photos', label: '相册', types: ['photos'] },
  { key: 'calls', label: '电话', types: ['calls'] },
  { key: 'browser', label: '浏览器', types: ['browser'] },
  { key: 'events', label: '日历', types: ['events'] },
  { key: 'books', label: '书架', types: ['books'] },
  { key: 'alipay', label: '支付宝', types: ['bills', 'wallet'] }
]

const jobKey = (characterId, job) => `${String(characterId)}:${job}`

export function isPhoneBusy(characterId, job = 'full') {
  return characterId != null && Boolean(phoneJobs[jobKey(characterId, job)])
}

export function cancelPhoneJob(characterId, job = 'full') {
  controllers.get(jobKey(characterId, job))?.abort()
}

export function closePhoneNotice() {
  phoneNotice.value = null
}

function withRaw(error, raw) {
  error.raw = String(raw || '')
  return error
}

function rawOf(error) {
  return error.raw || '（没有拿到模型的原始输出，可能是请求本身失败）'
}

function beginJob(characterId, job, kind) {
  const key = jobKey(characterId, job)
  const controller = new AbortController()
  controllers.set(key, controller)
  phoneJobs[key] = kind
  return controller
}

function endJob(characterId, job) {
  const key = jobKey(characterId, job)
  controllers.delete(key)
  delete phoneJobs[key]
}

// 弹窗一次只显示一条。若另一个任务的结果还没关闭，合并到同一个弹窗，避免后完成的覆盖先完成的。
function showPhoneNotice(next) {
  const prev = phoneNotice.value
  if (!prev) {
    phoneNotice.value = next
    return
  }
  phoneNotice.value = {
    kind: prev.kind === 'error' || next.kind === 'error' ? 'error' : 'success',
    title: prev.title === next.title ? prev.title : '查手机任务已完成',
    message: [prev.message, next.message].filter(Boolean).join('\n'),
    raw: [prev.raw, next.raw].filter(Boolean).join('\n\n')
  }
}

// 生成整台手机（首次）：必须拿到 4 位开机密码
export async function startFullGenerate({ preset, character, chatContext = '', userName = '' }) {
  if (isPhoneBusy(character.id, 'full')) return
  const controller = beginJob(character.id, 'full', 'full')
  try {
    const result = await generatePhoneContent({ preset, character, signal: controller.signal, chatContext, userName })
    if (!result.passcode) {
      throw withRaw(new Error('模型没有给出 4 位数字的开机密码，请重试'), JSON.stringify(result.items.slice(0, 20), null, 2))
    }
    await setPhoneContent(character.id, result.passcode, result.items)
    showPhoneNotice({ kind: 'success', title: '手机已生成', message: `${character.name} 的手机已生成，共 ${result.items.length} 条内容。` })
  } catch (error) {
    if (error.name !== 'AbortError') {
      showPhoneNotice({ kind: 'error', title: '生成失败', message: error.message, raw: rawOf(error) })
    }
  } finally {
    endJob(character.id, 'full')
  }
}

// 刷新单个应用：只发这一个分组的请求，只更新这个应用的内容。
// 同一应用正在刷新时不重复发送；其他应用不受影响，可以同时刷新。
export async function startRefreshGroup({ preset, character, groupKey, chatContext = '', userName = '' }) {
  const group = REFRESH_GROUPS.find((item) => item.key === groupKey)
  if (!group) throw new Error(`未知的应用刷新分组：${groupKey}`)
  if (isPhoneBusy(character.id, groupKey)) return
  const controller = beginJob(character.id, groupKey, 'refresh')
  try {
    const result = await generatePhoneContent({ preset, character, signal: controller.signal, onlyType: group.key, chatContext, userName })
    const fresh = result.items.filter((item) => group.types.includes(item.type))
    if (!fresh.length) {
      throw withRaw(new Error(`没有返回${group.label}内容`), JSON.stringify(result.items.slice(0, 20), null, 2))
    }
    if (controller.signal.aborted) return
    const updates = {}
    for (const type of group.types) {
      const part = fresh.filter((item) => item.type === type)
      if (part.length) updates[type] = part
    }
    await replaceManyItemsOfTypes(character.id, updates)
    showPhoneNotice({ kind: 'success', title: '刷新完成', message: `已更新：${group.label}` })
  } catch (error) {
    if (error.name !== 'AbortError') {
      showPhoneNotice({ kind: 'error', title: `${group.label}刷新失败`, message: error.message, raw: rawOf(error) })
    }
  } finally {
    endJob(character.id, groupKey)
  }
}
