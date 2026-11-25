// 世界观与角色关系。
// 世界：{ id, name, setting }，存在 jyos_worlds。角色通过 worldId 归属某个世界（可为空）。
// 关系：{ from, to, mode }，存在 jyos_character_relations。
//   mode 为 'one'：from 知道 to，to 不一定知道 from；'both'：双方互相知道。
// 角色本身的数据仍在 jyos_characters，这里不修改角色结构之外的任何内容。
import { reactive } from 'vue'
import { loadValue, saveValue } from './db'

const WORLDS_KEY = 'jyos_worlds'
const RELATIONS_KEY = 'jyos_character_relations'

export const worldData = reactive({ worlds: [], relations: [], ready: false })

let loadPromise = null

export function loadWorlds() {
  if (!loadPromise) {
    loadPromise = Promise.all([loadValue(WORLDS_KEY), loadValue(RELATIONS_KEY)]).then(([worlds, relations]) => {
      worldData.worlds = Array.isArray(worlds) ? worlds : []
      worldData.relations = Array.isArray(relations) ? relations : []
      worldData.ready = true
    })
  }
  return loadPromise
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function saveWorld(world) {
  const name = String(world.name || '').trim().slice(0, 40)
  if (!name) throw new Error('世界名字不能为空')
  const entry = {
    id: world.id || newId('world'),
    name,
    setting: String(world.setting || '').slice(0, 2000)
  }
  const index = worldData.worlds.findIndex((w) => w.id === entry.id)
  if (index >= 0) worldData.worlds[index] = entry
  else worldData.worlds.push(entry)
  await saveValue(WORLDS_KEY, JSON.parse(JSON.stringify(worldData.worlds)))
  return entry
}

// 删除世界：只清掉世界本身和它的关系，角色不删；角色的 worldId 会在角色页里被清空
export async function deleteWorld(worldId) {
  worldData.worlds = worldData.worlds.filter((w) => w.id !== worldId)
  worldData.relations = worldData.relations.filter((r) => r.worldId !== worldId)
  await saveValue(WORLDS_KEY, JSON.parse(JSON.stringify(worldData.worlds)))
  await saveValue(RELATIONS_KEY, JSON.parse(JSON.stringify(worldData.relations)))
}

export function worldOf(worldId) {
  return worldData.worlds.find((w) => w.id === worldId) || null
}

// 设置两个角色之间的关系。mode 为 'one'（from 知道 to）或 'both'（双向）。传 null 表示清除。
export async function setRelation({ worldId, from, to, mode }) {
  if (!from || !to || from === to) return
  worldData.relations = worldData.relations.filter((r) => !(r.from === from && r.to === to))
  if (mode === 'one' || mode === 'both') {
    worldData.relations.push({ worldId, from, to, mode })
  }
  await saveValue(RELATIONS_KEY, JSON.parse(JSON.stringify(worldData.relations)))
}

// 某角色「知道」的其他角色：自己发出的单向/双向关系，加上别人发给自己的双向关系
export function knownBy(characterId) {
  const out = []
  for (const r of worldData.relations) {
    if (r.from === characterId) out.push(r.to)
    else if (r.to === characterId && r.mode === 'both') out.push(r.from)
  }
  return [...new Set(out)]
}
