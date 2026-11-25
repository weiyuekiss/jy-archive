import { reactive } from 'vue'
import { loadValue, saveValue } from './db'

// 角色手机数据，按角色 id 分开保存在 IndexedDB 的 jyos_phone_data 里。
// 开机密码由模型在生成手机时为角色设定。这里保存明文，方便之后角色在聊天里告诉用户。
const STORAGE_KEY = 'jyos_phone_data'

export const phoneData = reactive({})

let loadPromise = null

export function loadPhoneData() {
  if (!loadPromise) {
    loadPromise = loadValue(STORAGE_KEY).then((saved) => {
      if (!saved || typeof saved !== 'object') return
      for (const [key, value] of Object.entries(saved)) {
        if (value && typeof value === 'object') phoneData[key] = value
      }
    })
  }
  return loadPromise
}

export function persistPhoneData() {
  return saveValue(STORAGE_KEY, JSON.parse(JSON.stringify(phoneData)))
}

// 取出某个角色的手机数据；没有则返回 null
export function getPhone(characterId) {
  return phoneData[String(characterId)] || null
}

// 只替换指定类型的内容（如 messages 微信、mails 邮箱），其他类型和密码保持不变
export async function replaceItemsOfType(characterId, type, newItems) {
  const key = String(characterId)
  const current = phoneData[key]
  if (!current) return
  const others = (current.items || []).filter((item) => item.type !== type)
  phoneData[key] = {
    ...current,
    items: [...others, ...newItems],
    [`${type}GeneratedAt`]: new Date().toISOString()
  }
  await persistPhoneData()
}

// 一次写入多类内容（如支付宝的账单和资产），只保存一次
export async function replaceManyItemsOfTypes(characterId, updates) {
  const key = String(characterId)
  const current = phoneData[key]
  if (!current) return
  const types = Object.keys(updates)
  const others = (current.items || []).filter((item) => !types.includes(item.type))
  const stamp = new Date().toISOString()
  const stamps = Object.fromEntries(types.map((t) => [`${t}GeneratedAt`, stamp]))
  phoneData[key] = {
    ...current,
    items: [...others, ...types.flatMap((t) => updates[t])],
    ...stamps
  }
  await persistPhoneData()
}

// 保存角色的手机：开机密码与内容一起覆盖旧数据
export async function setPhoneContent(characterId, passcode, items) {
  phoneData[String(characterId)] = {
    passcode: String(passcode),
    items,
    generatedAt: new Date().toISOString()
  }
  await persistPhoneData()
}

// 校验开机密码
export function checkPhonePassword(characterId, input) {
  const phone = getPhone(characterId)
  return Boolean(phone?.passcode) && phone.passcode === String(input)
}
