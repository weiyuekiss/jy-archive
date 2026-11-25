<script setup>
// 世界面板：新建、编辑、删除世界；设置角色之间的认识关系（单向 / 双向）。
// 由人物页打开，关闭时回到贴纸墙。
import { computed, ref } from 'vue'
import { worldData, saveWorld, deleteWorld, setRelation } from '@/stores/worlds'

const props = defineProps({
  // 所有角色（来自 jyos_characters）
  characters: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'changed'])

const selectedWorldId = ref('')
const draft = ref({ id: '', name: '', setting: '' })
const error = ref('')
const confirmDeleteId = ref('')

const selectedWorld = computed(() => worldData.worlds.find((w) => w.id === selectedWorldId.value) || null)
const membersOfSelected = computed(() => props.characters.filter((c) => c.worldId === selectedWorldId.value))
const unassigned = computed(() => props.characters.filter((c) => !c.worldId || !worldData.worlds.some((w) => w.id === c.worldId)))

// 关系编辑：从 fromId 到 toId 的认识方式
function relationBetween(fromId, toId) {
  const forward = worldData.relations.find((r) => r.from === fromId && r.to === toId)
  if (!forward) return 'none'
  const back = worldData.relations.find((r) => r.from === toId && r.to === fromId)
  return forward.mode === 'both' || (back && back.mode === 'both') ? 'both' : 'one'
}

function selectWorld(id) {
  selectedWorldId.value = id
  const w = worldData.worlds.find((x) => x.id === id)
  draft.value = w ? { ...w } : { id: '', name: '', setting: '' }
  error.value = ''
}

function startNew() {
  selectedWorldId.value = ''
  draft.value = { id: '', name: '', setting: '' }
  error.value = ''
}

async function save() {
  error.value = ''
  try {
    const saved = await saveWorld(draft.value)
    selectWorld(saved.id)
    emit('changed')
  } catch (e) {
    error.value = e.message
  }
}

async function removeWorld(id) {
  await deleteWorld(id)
  confirmDeleteId.value = ''
  startNew()
  emit('changed')
}

// 把角色加入或移出当前世界（写入角色的 worldId，由父组件保存角色）
function toggleMember(character) {
  const inWorld = character.worldId === selectedWorldId.value
  character.worldId = inWorld ? '' : selectedWorldId.value
  emit('changed')
}

async function changeRelation(fromId, toId, mode) {
  await setRelation({ worldId: selectedWorldId.value, from: fromId, to: toId, mode })
  emit('changed')
}

function nameOf(id) {
  return props.characters.find((c) => c.id === id)?.name || '未命名'
}
</script>

<template>
  <div class="wp-backdrop" role="dialog" aria-modal="true" aria-label="世界">
    <section class="wp-card">
      <header class="wp-head">
        <h2>世界</h2>
        <button type="button" class="wp-close" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <div class="wp-world-row">
        <button v-for="w in worldData.worlds" :key="w.id" type="button" class="wp-chip" :class="{ on: w.id === selectedWorldId }" @click="selectWorld(w.id)">{{ w.name }}</button>
        <button type="button" class="wp-chip wp-add" @click="startNew">＋ 新建世界</button>
      </div>

      <div class="wp-form">
        <label class="wp-field"><span>世界名字</span><input v-model="draft.name" maxlength="40" placeholder="例如：雾港、2077 新东京" /></label>
        <label class="wp-field"><span>世界观</span><textarea v-model="draft.setting" rows="5" maxlength="2000" placeholder="这个世界的背景、规则、地点、时代……角色都会在这个设定里生活。" /></label>
        <p v-if="error" class="wp-error">{{ error }}</p>
        <div class="wp-actions">
          <button v-if="selectedWorldId" type="button" class="wp-danger" @click="confirmDeleteId = selectedWorldId">删除世界</button>
          <button type="button" class="wp-primary" :disabled="!draft.name.trim()" @click="save">保存世界</button>
        </div>
      </div>

      <template v-if="selectedWorld">
        <h3>成员</h3>
        <p class="wp-hint">勾选属于这个世界的角色。不属于任何世界的角色不受影响。</p>
        <ul class="wp-members">
          <li v-for="c in characters" :key="c.id">
            <label>
              <input type="checkbox" :checked="c.worldId === selectedWorldId" @change="toggleMember(c)" />
              <span>{{ c.name || '未命名' }}</span>
            </label>
          </li>
        </ul>

        <h3>认识关系</h3>
        <p class="wp-hint">选择一个角色认识另一个角色的方式。「单向」只有前者知道后者；「双向」两人都知道对方。</p>
        <div v-if="membersOfSelected.length < 2" class="wp-hint">这个世界里至少要有两个角色，才能设定认识关系。</div>
        <div v-for="a in membersOfSelected" :key="a.id" class="wp-rel-block">
          <p class="wp-rel-name">{{ a.name }} 认识：</p>
          <div v-for="b in membersOfSelected.filter((x) => x.id !== a.id)" :key="b.id" class="wp-rel-row">
            <span>{{ b.name }}</span>
            <select :value="relationBetween(a.id, b.id)" @change="changeRelation(a.id, b.id, $event.target.value === 'none' ? null : $event.target.value)">
              <option value="none">不认识</option>
              <option value="one">单向（他知道{{ b.name }}）</option>
              <option value="both">双向（两人互相知道）</option>
            </select>
          </div>
        </div>
      </template>

      <template v-if="unassigned.length && !selectedWorld">
        <h3>未归属的角色</h3>
        <p class="wp-hint">{{ unassigned.map((c) => c.name).join('、') }}，选中一个世界后在成员里勾选即可加入。</p>
      </template>

      <div v-if="confirmDeleteId" class="wp-backdrop wp-inner" @click.self="confirmDeleteId = ''">
        <section class="wp-card wp-confirm">
          <h2>删除这个世界？</h2>
          <p>角色不会被删除，只会移出这个世界，它们之间的认识关系也会清除。</p>
          <div class="wp-actions">
            <button type="button" class="wp-primary wp-plain" @click="confirmDeleteId = ''">取消</button>
            <button type="button" class="wp-danger" @click="removeWorld(confirmDeleteId)">确认删除</button>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<style scoped>
.wp-backdrop { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 18px; box-sizing: border-box; background: rgba(40, 52, 64, .32); }
.wp-backdrop.wp-inner { z-index: 70; }
.wp-card { width: min(100%, 460px); max-height: calc(100dvh - 36px); overflow: auto; box-sizing: border-box; padding: 18px; border-radius: 18px; background: #f4f8fb; color: #2d4657; font-size: 13px; }
.wp-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.wp-head h2 { margin: 0; font-size: 17px; }
.wp-close { border: 0; background: none; font-size: 22px; color: #5c7787; cursor: pointer; }
.wp-world-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
.wp-chip { min-height: 30px; padding: 0 12px; border: 1px solid #cfe0ea; border-radius: 999px; background: #fff; color: #4a6676; font: inherit; cursor: pointer; }
.wp-chip.on { background: #5a8aa6; border-color: #5a8aa6; color: #fff; }
.wp-add { border-style: dashed; }
.wp-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.wp-field span { color: #6e8795; font-size: 12px; }
.wp-field input, .wp-field textarea { box-sizing: border-box; width: 100%; padding: 9px 10px; border: 1px solid #d6e4ec; border-radius: 10px; background: #fff; font: inherit; color: #2d4657; }
.wp-field textarea { resize: vertical; line-height: 1.6; }
.wp-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.wp-primary, .wp-danger { min-height: 36px; padding: 0 14px; border: 0; border-radius: 10px; font: inherit; cursor: pointer; }
.wp-primary { background: #5a8aa6; color: #fff; }
.wp-primary:disabled { opacity: .45; }
.wp-plain { background: #e4edf2; color: #4a6676; }
.wp-danger { background: #f3dada; color: #a04444; }
.wp-error { margin: 0 0 8px; color: #b44; font-size: 12px; }
h3 { margin: 16px 0 6px; font-size: 14px; }
.wp-hint { margin: 0 0 8px; color: #7f97a4; font-size: 12px; line-height: 1.6; }
.wp-members { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.wp-members label { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 10px; background: #fff; }
.wp-rel-block { margin-bottom: 10px; }
.wp-rel-name { margin: 6px 0 4px; font-weight: 600; }
.wp-rel-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; border-radius: 10px; background: #fff; margin-bottom: 4px; }
.wp-rel-row select { font: inherit; padding: 4px 6px; border: 1px solid #d6e4ec; border-radius: 8px; background: #fff; color: #2d4657; }
.wp-confirm { width: min(100%, 320px); }
.wp-confirm h2 { margin: 0 0 8px; font-size: 16px; }
.wp-confirm p { margin: 0 0 12px; color: #6e8795; line-height: 1.6; }
</style>
