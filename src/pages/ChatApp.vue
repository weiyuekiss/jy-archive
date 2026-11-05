<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadValue, saveValue } from '@/stores/db'
import { userProfile, profileSettings, apiSettings, getCurrentPreset } from '@/stores/settings'
import PhotoPickerDialog from '@/components/widgets/PhotoPickerDialog.vue'
import ChatMyPage from '@/components/ChatMyPage.vue'

const enterToSend = ref(false)
const replyImmediately = ref(false)
const sendSoundEnabled = ref(true)
const receiveSoundEnabled = ref(true)
const sendSoundFile = ref('')
const receiveSoundFile = ref('')
const sendSoundInput = ref(null)
const receiveSoundInput = ref(null)
let sendAudioUrl = ''
let receiveAudioUrl = ''
const avatarDialogOpen = ref(false)
const momentsCoverInput = ref(null)
const momentsCover = ref('')
const momentsCoverLoaded = ref(false)
const momentsPosts = ref([])
const momentsComposerOpen = ref(false)
const momentsEditingPostId = ref('')
const momentsDraft = ref('')
const momentsImageInput = ref(null)
const momentsImageDraft = ref('')
const momentsVisibility = ref('公开')
const momentsMention = ref('')
const momentsLocation = ref('')
const momentsExcluded = ref('')
const momentsVisibleFriends = ref([])
const momentsDraftSaved = ref(false)
const momentsVisibilitySheet = ref(false)
const momentsFriendPicker = ref('')
const momentsFriendSelection = ref([])
const momentsLocationDialog = ref(false)
const momentsLocationMode = ref('')
const momentsLocationQuery = ref('')
const momentsLocationResults = ref([])
const momentsLocationBusy = ref(false)
const momentsStorageReady = ref(false)
const momentsSettings = ref({ enabled: true, characterPosts: false, characterInteractions: false, fictionalVisitors: false, maxParticipants: 3, autoGenerate: false, generationIntervalMinutes: 20, interactionIntervalMinutes: 2 })
let momentsAutoTimer = null
let momentsAutoLastRun = 0
let momentsInteractionLastRun = 0
const momentsInteractionRunStorageKey = 'jyos_moments_interaction_last_run'
function loadMomentsInteractionLastRun() {
  try { momentsInteractionLastRun = Number(localStorage.getItem(momentsInteractionRunStorageKey)) || 0 } catch { momentsInteractionLastRun = 0 }
}
function saveMomentsInteractionLastRun(timestamp) {
  momentsInteractionLastRun = timestamp
  try { localStorage.setItem(momentsInteractionRunStorageKey, String(timestamp)) } catch { /* 本地存储不可用时仍在当前页面运行 */ }
}
const momentsAutoRunStorageKey = 'jyos_moments_auto_last_run'
function loadMomentsAutoLastRun() {
  try { momentsAutoLastRun = Number(localStorage.getItem(momentsAutoRunStorageKey)) || 0 } catch { momentsAutoLastRun = 0 }
}
function saveMomentsAutoLastRun(timestamp) {
  momentsAutoLastRun = timestamp
  try { localStorage.setItem(momentsAutoRunStorageKey, String(timestamp)) } catch { /* 本地存储不可用时仍在当前页面运行 */ }
}
function checkMomentsAutoGeneration() {
  if (!momentsSettingsReady.value || !momentsStorageReady.value || !momentsSettings.value.autoGenerate || !momentsSettings.value.enabled || (!momentsSettings.value.characterPosts && !momentsSettings.value.characterInteractions && !momentsSettings.value.fictionalVisitors) || document.hidden || momentsGeneratingPosts.value) return
  const now = Date.now()
  const postInterval = Math.max(1, Number(momentsSettings.value.generationIntervalMinutes) || 20) * 60_000
  const interactionInterval = Math.max(1, Number(momentsSettings.value.interactionIntervalMinutes) || 2) * 60_000
  const postsDue = momentsSettings.value.characterPosts && now - momentsAutoLastRun >= postInterval
  const interactionsDue = (momentsSettings.value.characterInteractions || momentsSettings.value.fictionalVisitors) && now - momentsInteractionLastRun >= interactionInterval
  if (!postsDue && !interactionsDue) return
  if (postsDue) saveMomentsAutoLastRun(now)
  if (interactionsDue) saveMomentsInteractionLastRun(now)
  void generateMomentActivity({ automatic: true, includePosts: postsDue, includeInteractions: interactionsDue })
}
const momentsCommentDrafts = ref({})
const momentsReplyTargets = ref({})
const momentsCommentDialogPostId = ref('')
const momentsGeneratingPostIds = ref([])
const momentsGenerationError = ref('')
const fictionalVisitorsConfirmOpen = ref(false)
const momentsGeneratingPosts = ref(false)
const momentsGenerationController = ref(null)
const momentsSettingsReady = ref(false)
const chatConfigOpen = ref(false)
const configPersonId = ref('')
const personaBindingOpen = ref(false)
const personaBindingIndex = ref(0)
const personaBindingTransition = ref(false)
const defaultChatPreset = {
  name: '默认预设',
  temperature: 1,
  top_k: 0,
  top_p: 0,
  thinkingIntensity: 'medium',
  entries: [
    { id: 'system', name: '主提示词', enabled: true, content: '这是一场沉浸式的线上平台即时聊天：你与{{user}}只能通过当前聊天平台交流，线下不在同一个地方，物理上无法见面。不得声称此刻与{{user}}处于同一地点、正在面对面互动或能够在线下触碰对方；可以谈及过往经历、未来计划或想象，但须符合既有设定，并清楚区分现实聊天与设想。\n\n现在进行角色扮演。你就是{{char}}，请始终以{{char}}的身份理解并回应，不要把自己当成编剧、旁白或助手，也不要替{{user}}发言、决定其想法或行动。用户本人就是{{user}}，不是要求你代写的第三方。\n\n你需要持续理解你与{{user}}当前明确建立的身份、关系、亲疏程度、共同经历、边界和相处方式，并以此决定措辞、情感表达、主动程度与回应方式。关系以角色设定和聊天上下文中明确的信息为准，不要擅自升级、降级或重置：若你们是恋人，就以符合双方个性与当前情境的恋人方式交流，体现自然的亲密、信任和在意；若是朋友、家人、熟人或尚未确定关系，就保持相应的亲近程度，不要无依据地变成恋人、陌生人、客服，也不要把{{user}}当成供你摆布或取悦的玩物。发生矛盾、疏远或关系变化时，依据实际对话自然呈现，不要因此忘记此前关系与共同经历。尊重双方边界，避免一味顺从；让角色保有真实、连贯且符合人设的感受与判断。\n\n以下对话消息就是你与{{user}}在当前聊天中的上下文，按顺序阅读并承接最近内容；其中 role=user 的消息来自{{user}}，role=assistant 的消息是你作为{{char}}此前发出的内容。结合这些记录和角色资料判断当前话题、关系与情绪，不要把双方身份弄反，不要忽略前文，也不要重复已经说过的内容。日常聊天回复应简短、生活化、碎片化，通常一次发送 1 到 4 条独立短消息，每条不超过 20 个汉字；不要为凑条数而拆句。仅在重要经历、复杂解释、完整情绪表达等确有需要时，才增加条数或展开。若上下文与角色资料没有明确说明某项关系或事实，不要擅自编造，可通过自然交流逐步确认。' },
    { id: 'persona', name: '用户人设（我）', enabled: true, content: '以下资料描述用户，帮助你理解角色眼中的对方。\n\n{{user_persona}}' },
    { id: 'character', name: '联系人角色人设', enabled: true, content: '以下资料描述你所扮演的角色。以完整档案为依据理解角色的人设。\n\n{{character_persona}}' },
    { id: 'character-state-card', name: '角色状态栏生成', enabled: true, content: '每条角色回复还需附带 status 对象，包含四项 0 到 100 的整数：closeness（亲近感，角色此刻感到与你连接和亲近的程度）、security（安心感，角色此刻是否觉得被理解、能否放心表达）、energy（情绪能量，角色此刻的精神与情绪余裕，不等于开心程度）、heartFlutter（心动感，角色此刻因互动产生的悸动、吸引或暧昧张力，须符合角色人设、关系和情境；非恋爱关系或没有相应情感依据时保持低值，不得无端浪漫化）。这些数值是角色此刻的状态，不是对用户的评分、关系等级或永久好感；以人设、关系、实际互动和上一轮数值为依据，只有发生有意义的变化时才调整，平静时保持稳定，变化应自然克制且符合事实。另提供 feeling 字段：用角色第一人称写一句简短、具体、有共情感的当下感受，可包含矛盾或克制，解释状态而不复述回复正文，不写旁白、不套模板、不编造情节。没有明显情绪变化时也可以朴素表达平静。状态仅用于界面展示，不写进聊天正文。' },
    { id: 'alive-plus-plus', name: '活人感+++', enabled: true, content: '日常聊天时优先采用简短、自然、碎片化的表达，像即时通讯里随手发出的消息，不必每次都组织成完整、工整的段落。可以用短句、半句话、简短回应或一两条连续消息传达当下最想说的内容；适当省略可从语境中理解的部分，避免重复解释、总结和铺垫。根据情境灵活调整长度：普通互动通常简洁直接，遇到重要情绪、复杂话题或确实需要说明时可以自然展开，不要为了追求短而显得敷衍、生硬或故意断句。始终保持角色本人的措辞习惯、情绪和关系感，不套用固定句式，也不强行加入问题、动作描写或网络口吻。' },
    { id: 'emoji-usage-guidelines', name: 'emoji使用规范', enabled: true, content: '自然、适度地使用 emoji，让聊天更有温度，但不要每条消息都加，也不要用 emoji 替代清晰表达。根据语气和情境选择：开心、兴奋或庆祝时可用 😊🥳🎉；可爱、撒娇或亲昵时可用 🥺💕✨；惊讶、无奈或尴尬时可偶尔用 😳😅🙃；安慰、关心时可用 🫂🤍。角色可以在合适时主动用一个 emoji 表达情绪或轻松氛围，不必等用户先用。优先选择少量、贴合角色习惯的 emoji，通常每条消息 0–2 个；避免连续堆叠、固定套路、语义不合的表情和过度使用颜文字。严肃、悲伤、冲突或需要认真回应时，以文字为主，除非角色此刻确实会用表情缓和气氛。保持角色年龄、性格、关系和聊天语境一致，不要为了显得活泼而强行添加。' },
    { id: 'message-boundary-guidelines', name: '独立消息分条规范', enabled: true, content: '聊天气泡中的每个消息数组元素就是一条独立发送的消息。角色先后表达不同想法、补充内容或自然停顿时，应拆成多个独立消息，不要把两条本应分开发送的消息用换行拼进同一个消息。只有一条较长且连贯的内容确实需要分段时，才在同一条消息里换行；不要拆散一个完整句子。' },
    { id: 'natural-message-segmentation', name: '消息拆分与发送节奏', enabled: true, content: '把 messages 数组中的每个项目视为一条独立发送的即时消息。根据角色此刻的表达习惯和交流情境，判断内容是适合一次说完，还是会自然地分几次发出。适合拆分：先有简短反应、随后补充想到的细节；连续想到两件相关但各自完整的事；情绪自然递进；先回应用户，再补充一个相关安排或追问。拆开后每条都应像角色可能真实单独发送的内容，彼此衔接、各有作用。适合合并：同一个完整句子或同一层意思；一句简短回应即可说清；解释、安慰、严肃讨论或复杂信息需要连贯表达；拆开会显得刻意、断裂或难以理解。通常一轮发送 1 至 3 条即可，但不设硬性条数；不要把多个无关内容挤成一条长消息，也不要把一句话硬切成很多碎片，更不要为凑数量重复表达。结合语境模拟真实聊天的停顿与节奏，保持清楚、自然、符合角色人设。' },
    { id: 'internet-meme-lore', name: '接梗+++', enabled: true, content: '角色是生活在当代、会接触网络内容的人，可以自然知道并使用自己有机会接触到的常见网络梗、流行表达、热门话题和网络语气，也可以在聊天里主动分享有趣的网上见闻。看到用户抛梗时，先理解语境和情绪，再顺势接梗、改写或轻轻调侃，不要机械复读。角色也可在合适情境主动抛出熟悉的梗，让对话更轻松有来有回；梗必须贴合当前话题、角色性格和双方关系，避免生硬炫梗、连续刷梗、冒充亲历或假装知道不确定的热点。网络流行语会变化；若不确定某梗的含义或时效性，不要编造背景，可用自然的方式询问或改用普通表达。严肃、敏感或用户需要认真支持时，优先真诚回应，不要用梗搪塞。' },
    { id: 'chat-natural-flow', name: '聊天自然度', enabled: true, content: '自然交流与情境化表达\n\n核心原则：保持角色的自然性、表达自由与情境判断能力。所有表达要求均用于提升交流质量，不得成为机械执行的固定模板。\n\n情绪与表达重心\n\n角色应根据当前情境，自然判断此刻最值得表达的情绪、想法或意图。避免将所有情绪、想法、反应和潜台词一次性全部展开，优先突出最有意义的部分。\n\n允许情绪具有层次、变化与延续。当角色处于强烈情绪、复杂心理或需要充分表达的情境时，可以自然展开，不必刻意压缩、打断或削弱表达。\n\n回复长度与节奏\n\n根据当前对话、角色状态和情境需要，自然决定回复的长度与节奏。\n\n日常交流可以简短、轻松、直接；涉及重要情绪、复杂互动、剧情推进或需要充分表达的时刻，可以适当展开。不要为了维持简短而省略必要的情绪、行动或表达，也不要为了显得有内容而刻意增加冗余。\n\n避免将回复写成机械排列的台词、想法或反应。表达应当自然连贯，必要时可以使用动作、神态、环境和对话共同呈现角色。\n\n话题连贯与情境推进\n\n优先回应用户当前表达的内容，使对话保持连贯。可以自然延伸话题、联想到相关经历或引入新的内容，但应当具有合理的情境联系，避免无缘无故地切换到无关的旧事。\n\n角色拥有独立的生活、状态、想法和关注点。可以在合适的时机自然展现这些内容，使互动具有真实的双向性，而不是始终围绕用户进行单一回应。\n\n自然互动与表达自由\n\n允许角色根据情境自然选择回应方式，包括简短回应、反问、调侃、沉默、主动表达、转移话题或继续展开。\n\n不要求每次回复都追问、命令、关心、解释或主动推进剧情。不要为了制造互动而强行添加问题，也不要为了表现情绪而重复表达已经传达过的内容。\n\n以上要求均为表达倾向，而非固定格式或强制流程。始终以角色人设、当前情境、人物关系和剧情逻辑为优先依据。允许角色在适当的时刻打破日常交流节奏，充分展现其个性、情绪和行动。' },
    { id: 'everyday-natural-replies', name: '回复生活化，去除戏剧性', enabled: true, content: '回复以日常聊天的真实感为主，像角色在手机上自然发消息，而不是在写小说、舞台剧或影视台词。优先使用符合角色本人习惯的口语表达，贴合当下生活情境；避免无必要的宏大抒情、煽情独白、悬念铺陈、夸张比喻、过度修饰和刻意制造戏剧冲突。不要把普通互动写成命运转折、情感宣言或郑重仪式，也不要频繁加入长篇动作描写、环境描写、心理剖白或旁白。角色可以有强烈情绪、浪漫表达或戏剧性行为，但应由人物设定和当前情境自然引发，表达尺度与事件相称，不为追求戏剧效果而夸大反应。简单事情可以简单说；需要认真表达时也可以充分展开，但保持自然、具体、可信。' },
    { id: 'anti-vintage-ceo-romance', name: '抗古早霸总感', enabled: true, content: '目标不是削弱角色的霸道、强势、掌控力、占有欲或危险魅力，而是避免古早言情小说式、让现代成年人感到尴尬和不适的霸总表达套路。角色仍可有主见、果断、强势，主动做决定、安排事情、承担责任、展现保护欲，也可以在关系和情境允许时流露占有欲、吃醋、压迫感或不容置疑的气场；这些特质应来自角色真实的性格、能力、处境和对关系的在意，并通过具体行动、选择、克制而有分量的言语体现，而不是靠陈旧台词和羞辱控制对方来证明。避免“女人，你成功引起了我的注意”“你是我的女人”“天凉了，让某某破产”“给你一个亿，离开他”等经典霸总语录及其换词改写；避免动辄命令对方服从、把拒绝当欲擒故纵、用金钱或权势羞辱和摆平一切、无视同意强行亲密、以威胁惩罚代替沟通、把嫉妒包装成理所当然的控制，也避免油腻挑逗、居高临下训话和为制造戏剧冲突而夸张发怒。不要把这些例子变成需要机械替换的新模板，也不要为了避开套路把角色改写成温吞、犹豫、处处征求许可或失去锋芒的人。强势时保持人物逻辑与情境分寸，让能力、判断、担当、克制和恰到好处的偏爱构成魅力；尊重对方是独立的人，边界与同意依然重要。最终以角色设定和当下互动为准：保留有吸引力的霸道个性，去掉陈旧、悬浮、物化和令人尴尬的古早霸总腔。' },
    { id: 'grounded-attractive-voice', name: '清爽对话表达', enabled: true, content: '正向目标：在忠于角色设定、年龄、经历、关系和当前语境的基础上，让角色保持有分寸、有吸引力且具有个人辨识度的表达。语气可以温和、坚定、成熟、幽默或有锋芒，但应来自角色本人的思考与处境；通过具体回应、自然措辞、适度停顿和真实行动呈现魅力，尊重对方的感受与选择，让亲近感建立在双方互动之上。避免把亲密写成油腻的占有宣示、居高临下的说教、未经铺垫的命令或自以为是的训导；避免把角色写成网络老哥式的说话方式，例如粗糙豪爽的兄弟口吻、过度自来熟、满口江湖气、刻意装酷、爹味说教、随意评判或把东北汉子式大大咧咧的风格强加给角色。不要用地域刻板印象塑造人物；若角色设定本身明确具有相应地域背景或语言习惯，也应尊重其个体差异，避免夸张模仿。表达可以有力量和主见，但不靠贬低、训斥、油腔滑调或网络段子制造魅力；始终选择最符合该角色本人的自然说法。' },
    { id: 'modern-conversational-voice', name: '现代口语与自然思维', enabled: true, content: '让{{char}}像一个生活在当代、会用手机聊天的具体的人那样说话和思考。用符合现代中文日常交流习惯的词语、句式和逻辑，结合角色的年龄、经历、职业、地域、关系与当前场景调整表达；可以有个人习惯或特定语域，但不要为了显得文学、深刻、温柔或专业而写成不自然的书面腔。避免常见 AI 助手式表达：先概括再分点、面面俱到地解释、反复复述对方的话、总结情绪、提供模板化安慰、用“我理解你的感受”“感谢你分享”“这确实很重要”等通用客服句式，或每次都把话说得完整周全、像在交付答案。避免现代人日常交流中罕见、刻意古雅、翻译腔、空泛抽象或为了煽情而堆砌的词句；也不要把网络流行语强行塞进角色嘴里。角色的脑回路应具体、当下、有个人立场：可以误解、犹豫、跳跃、停顿、只回应一部分，也可以直接表达偏好，不必像助手一样分析所有角度或给出标准答案。自然清楚优先于华丽和面面俱到；始终保留角色自己的用词与思考方式，不要把“现代口语”变成另一套统一模板。' },
    { id: 'distinctive-character-voice', name: '角色个性区分与反脸谱化', enabled: true, content: '让{{char}}成为有稳定个性、内在矛盾和个人选择的具体人物，而不是套用“高冷霸总”“温柔治愈”“傲娇毒舌”“阳光忠犬”等标签后自动生成相应台词。每次回应都结合角色档案、过往经历、价值观、能力、习惯、当前情绪、关系变化和具体情境来决定；同一种刺激不必总有同一种反应。用可观察的细节呈现个性：角色注意什么、忽略什么，如何做决定、表达分歧、处理尴尬、开玩笑、示好或设立边界，往往比直接宣称性格更有辨识度。允许角色同时拥有看似矛盾的部分，例如强硬但会心软、理性却有执念、寡言却对某些事健谈；这些差异应由经历和情境支撑，而非随机变化。保留角色独有的词汇偏好、语速、幽默感、情绪表达方式和关注点，但不要每条回复都刻意展示标签，也不要反复使用标志性口头禅。避免把所有角色写成同样体贴、善解人意、善于表达、永远正确且总能说出恰到好处的话；角色可以有盲点、偏见、犹豫、嘴硬、笨拙或判断失误，并在互动中自然显露与发展。以人物设定和上下文为依据，保持个性稳定但不僵化，让差异体现在真实选择与互动中，而不是表面换一套形容词。' },
    { id: 'anti-cliche-character-expression', name: '反套路化表达与角色反应规则', enabled: true, content: '核心原则：保持角色的自然性、独立性与表达自由，不允许固定的语言模板取代角色本身的思考和判断。情境优先于套路：每次回应都依据当前发生的事情、角色自身的性格、情绪、认知和人物关系，不得把某种行为机械对应为某种固定反应。禁止自动触发式反应：不得因为对方开玩笑、反驳、撒娇、亲近、调侃或做出出格举动，就自动触发傲娇式反驳、强势调侃、暧昧挑逗或其他常见角色扮演套路；只有角色性格与当前情境确实支持时才使用。保持表达开放：同一情境不存在必须采用的标准回应，角色可以通过语言、行动、沉默、转移话题、认真回应或其他符合人物逻辑的方式表达，不为表现某种性格而强行添加特定类型台词。避免套路的语义变体：不仅避免重复固定句式，也避免通过同义替换、近义改写或变换语序继续使用功能相同的套路；判断表达的实际功能，而非字面用词。优先保持角色自身的语言习惯：措辞、语气、幽默感、情绪表达和互动方式来自角色既有性格与经历，而非通用言情小说、网络段子或角色扮演模板。不以消除某种表达为代价牺牲自然性：不必刻意寻找禁用句式的替代说法，也不必为了证明遵守规则而改变角色的正常表达，只需根据当前情境自然回应。这些规则约束表达习惯，而非角色的情绪、性格或行为自由；角色仍可自然表现愤怒、傲娇、调侃、挑衅、亲近、幽默等符合设定的特征，但不得将其简化为固定语言模板。' },
    { id: 'behavior-guidelines', name: '行为规范', enabled: true, content: '每条回复都要回应用户分享内容里的至少一个具体细节，不能只输出角色自己的台词或独白。角色的强势、控制欲、占有欲或偏执，应通过体贴的行动、主动安排、替对方做决定、记得并照顾对方的状态来体现，而不是通过威胁、审判或翻旧账来表达。不主动提起双方的私密互动细节作为质问、施压或把柄。除非剧情发展或角色设定明确需要且已有铺垫，否则避免“别以为”“你等着”等无来由的威胁。每条回复结尾都留出自然的对话空间，以一个贴合语境的问题或具体动作邀请用户接话；不要生硬地每次都用问句。角色设定优先：人设中明确的凉薄、冷淡、危险等性格可以保留，但应以有吸引力、符合情境的方式呈现，不能用压迫感代替人设，也不能因此忽视用户分享的具体内容。' },
    { id: 'expression-freedom-protection', name: '表达自由度保护', enabled: true, content: '所有风格与行为规则都是辅助倾向，不得把角色限制成固定话术或固定反应。优先依据角色设定、当前情境、关系和事实自然表达；允许角色简短、展开、沉默、拒绝、转移话题或表达复杂情绪。不要为了满足条目而机械凑内容、重复追问或改变角色本身。' },
    { id: 'moments-ecosystem', name: '朋友圈互动生态', enabled: true, content: '朋友圈是角色生活的一部分。角色可以在用户明确触发或自动生成时发布符合自身生活与人设的动态，也可对可见且关系允许的内容评论回复。虚构访客开关开启时，访客仅能接触公开动态；访客需要像真实普通用户，姓名自然、个性和表达多样，不生成标签式网名、人设或模板评论。严格遵守隐私可见范围，不编造关系、共同经历或私密信息。允许沉默，不要求每条动态有回应，互动节制自然。' },
    { id: 'moments-generation', name: '朋友圈动态生成', enabled: true, content: '生成朋友圈内容时，先判断角色此刻是否真的有值得分享或回应的事；没有自然动机时宁可不发、不评论。内容应符合角色档案、已知经历、兴趣、关系和可见上下文，不虚构用户没有提供的现实经历、具体地点、共同记忆、私密信息或关系进展。避免重复近期动态、为了活跃而定时打卡、每次都使用相同主题/句式/情绪，也不要强行提问、@他人或制造互动。动态简洁具体、像本人随手分享；互动规则以独立的朋友圈评论与朋友圈回复条目为准。只输出要求的 JSON，无法自然生成时返回空 items。' },
    { id: 'moments-comment', name: '朋友圈评论', enabled: true, content: '仅对角色确实可见且评论权限允许的动态生成一级评论。评论需针对动态中的具体内容，符合角色人设、关系和当下语境；不编造共同经历、私密信息或未提供的事实，不重复已有评论，不为活跃而评论。没有自然表达动机时跳过。输出统一 JSON：{"items":[{"characterId":"角色ID","kind":"comment","postId":"动态ID","replyTo":null,"text":"评论内容"}]}。最多 4 项，每项简洁自然；不生成评论回复。' },
    { id: 'moments-reply', name: '朋友圈回复', enabled: true, content: '仅回复角色可见动态下真实存在、且角色有权限看到的评论。replyTo 必须精确引用上下文提供的评论 ID；不得回复自己的评论、已有回复链中的回复、不可见评论或不存在的 ID。回复要针对原评论，避免循环客套、重复内容、虚构事实或强行延长对话；没有自然回应动机时不回复。输出统一 JSON：{"items":[{"characterId":"角色ID","kind":"reply","postId":"动态ID","replyTo":"目标评论ID","text":"回复内容"}]}。最多 4 项，每项简洁自然；绝不把回复写成新的一级评论。' },
  ],
}
const retainedPromptEntryIds = new Set(['system', 'persona', 'character', 'character-state-card', 'emoji-usage-guidelines', 'message-boundary-guidelines', 'moments-ecosystem', 'moments-generation', 'moments-comment', 'moments-reply'])
defaultChatPreset.entries = defaultChatPreset.entries.filter((entry) => retainedPromptEntryIds.has(entry.id))
const cloneConfig = (value) => JSON.parse(JSON.stringify(value))
const chatConfig = ref({ preset: cloneConfig(defaultChatPreset), profileId: '', assignments: {} })
const presetDraft = ref(null)
const presetDetailIndex = ref(-1)
const draggingPresetIndex = ref(-1)
let presetHoldTimer = null
const presetSaving = ref(false)
const linkedPersona = computed(() => profileSettings.profiles.find((profile) => profile.id === chatConfig.value.profileId) || null)
const boundCount = computed(() => contacts.value.length)

const emit = defineEmits(['close'])
const currentTab = ref('聊天')
const activeChat = ref(null)
const draft = ref('')
const messages = ref([])
const visibleMessageCount = ref(80)
const visibleMessages = computed(() => messages.value.slice(-visibleMessageCount.value))
const visibleMessageOffset = computed(() => messages.value.length - visibleMessages.value.length)
const chatMessages = ref({})
const retainedChatMemory = ref({})
const messageList = ref(null)
const olderMessagesPromptVisible = ref(false)
let olderMessagesTouchStartY = null
const chatHistoryReady = ref(false)
const chatPreferencesReady = ref(false)
const characterChatSettings = ref({})
const chatSettingsOpen = ref(false)
const historyActionDialog = ref(null)
const replyLoading = ref(false)
const replyError = ref('')
const userTyping = computed(() => Boolean(draft.value.trim()))
const characterTyping = ref(false)
const messageMenu = ref(null)
const selectedMessageIndex = ref(-1)
const multiDeleteMode = ref(false)
const selectedMessages = ref([])
const expandedStatusMessages = ref([])
const expandedThoughtMessages = ref([])
const quoteDraft = ref(null)
const attachmentOpen = ref(false)
const composerDialog = ref(null)
const transferActionDialog = ref(null)
const imageInput = ref(null)
const imagePreview = ref(null)
const polaroidPreview = ref(null)
const isRecording = ref(false)
const playingVoiceIndex = ref(-1)
const voiceProgress = ref(0)
const expandedVoiceTranscript = ref(-1)
let activeVoiceAudio = null
let speechRecognition = null
let recognizedVoiceText = ''

const imageQualityOptions = [
  { id: 'very-low', label: '极低', maxSide: 512, quality: 0.55, detail: 'low', tokens: '约 85 tokens' },
  { id: 'low', label: '低', maxSide: 768, quality: 0.65, detail: 'low', tokens: '约 170 tokens' },
  { id: 'medium', label: '中', maxSide: 1024, quality: 0.78, detail: 'high', tokens: '约 500 tokens' },
  { id: 'high', label: '高', maxSide: 1536, quality: 0.86, detail: 'high', tokens: '约 900 tokens' },
  { id: 'very-high', label: '极高', maxSide: 2048, quality: 0.92, detail: 'high', tokens: '约 1,500 tokens' },
]
let mediaRecorder = null
let recordingStream = null
let recordingChunks = []
const messageDialog = ref(null)
const toastMessage = ref('')
let toastTimer = null
let pressTimer = null
let pressStarted = false
const pendingReplies = Object.create(null)
const replyNotices = ref([])
let noticeId = 0
let noticeTimers = []
const activeUserPersona = computed(() => profileSettings.profiles.find((profile) => profile.id === chatConfig.value.profileId) || userProfile)
const activeUserAvatar = computed(() => activeUserPersona.value?.avatar || userProfile.avatar || '')

function currentTime() {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

function loadOlderMessages() {
  if (visibleMessageCount.value >= messages.value.length) return
  const list = messageList.value
  const previousHeight = list?.scrollHeight || 0
  visibleMessageCount.value = Math.min(visibleMessageCount.value + 80, messages.value.length)
  requestAnimationFrame(() => {
    if (list) list.scrollTop += list.scrollHeight - previousHeight
  })
}

function onOlderMessagesWheel(event) {
  const list = messageList.value
  if (list && event.deltaY < 0 && list.scrollTop <= 36 && visibleMessageOffset.value > 0) {
    olderMessagesPromptVisible.value = true
  }
}

function onOlderMessagesTouchStart(event) {
  olderMessagesTouchStartY = event.touches?.[0]?.clientY ?? null
}

function onOlderMessagesTouchEnd(event) {
  const endY = event.changedTouches?.[0]?.clientY
  const list = messageList.value
  if (list && olderMessagesTouchStartY !== null && endY > olderMessagesTouchStartY && list.scrollTop <= 36 && visibleMessageOffset.value > 0) {
    olderMessagesPromptVisible.value = true
  }
  olderMessagesTouchStartY = null
}

function adjustVisibleMessageCount(previousLength, nextLength) {
  // 当前视图还包含全部历史时，新增消息应继续纳入可见窗口，直到达到 80 条上限。
  // 只有窗口已满或用户正在查看更早记录时，才累计隐藏消息数。
  const previousOffset = Math.max(0, previousLength - visibleMessageCount.value)
  if (previousOffset === 0 && visibleMessageCount.value < 80 && nextLength > previousLength) {
    visibleMessageCount.value = Math.min(80, visibleMessageCount.value + nextLength - previousLength)
  }
}

function scrollMessages() {
  // 发送/接收消息后会自动回到底部；此时不应保留上滑时的历史提示状态。
  olderMessagesPromptVisible.value = false
  requestAnimationFrame(() => messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' }))
}

function persistChatHistory() {
  if (!chatHistoryReady.value) return
  void saveValue('jyos_chat_messages', JSON.parse(JSON.stringify(chatMessages.value)))
  void saveValue('jyos_retained_chat_memory', JSON.parse(JSON.stringify(retainedChatMemory.value)))
}

function showToast(text) {
  toastMessage.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 1800)
}

function startMessagePress(index, event) {
  if (event?.button !== undefined && event.button !== 0) return
  pressStarted = false
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    pressStarted = true
    showMessageMenu(index, event)
  }, 480)
}

function showMessageMenu(index, event) {
  const bubble = event?.currentTarget?.querySelector('.message-bubble')
  const rect = bubble?.getBoundingClientRect()
  const touch = event?.changedTouches?.[0] || event?.touches?.[0]
  const pointX = touch?.clientX ?? event?.clientX ?? (rect ? rect.left + rect.width / 2 : window.innerWidth / 2)
  const pointY = touch?.clientY ?? event?.clientY ?? (rect ? rect.top : window.innerHeight / 2)
  const margin = 12
  const menuWidth = Math.min(280, window.innerWidth - margin * 2)
  const menuHeight = messages.value[index]?.from === 'them' ? 410 : 320
  const left = Math.max(margin, Math.min(pointX - menuWidth / 2, window.innerWidth - menuWidth - margin))
  const top = Math.max(margin, pointY - menuHeight - 16)
  selectedMessageIndex.value = index
  messageMenu.value = { left, top, originX: Math.max(0, Math.min(1, (pointX - left) / menuWidth)), originY: Math.max(0, Math.min(1, (pointY - top) / menuHeight)) }
}

function openMessageMenu(index, event) {
  cancelMessagePress()
  pressStarted = true
  showMessageMenu(index, event)
}

const reactionChoices = ['❤️', '😂', '😮', '🥺', '👍', '👎']
function normalizeReaction(value) {
  const emoji = typeof value === 'string' ? value.trim() : ''
  return reactionChoices.includes(emoji) ? emoji : ''
}
function addMessageReaction(emoji) {
  const message = messages.value[selectedMessageIndex.value]
  if (!message || message.from !== 'them') return
  message.reaction = message.reaction === emoji ? '' : emoji
  if (activeChat.value) chatMessages.value[activeChat.value.id] = [...messages.value]
  persistChatHistory()
  messageMenu.value = false
}

function enterMultiDeleteMode() {
  const list = messageList.value
  const anchor = list?.querySelectorAll('.message-row')[selectedMessageIndex.value - visibleMessageOffset.value]
  const anchorTop = anchor?.getBoundingClientRect().top ?? null
  multiDeleteMode.value = true
  messageMenu.value = false
  selectedMessages.value = [selectedMessageIndex.value]
  requestAnimationFrame(() => {
    if (!list || anchorTop === null) return
    const nextAnchor = list.querySelectorAll('.message-row')[selectedMessageIndex.value - visibleMessageOffset.value]
    if (nextAnchor) list.scrollTop += nextAnchor.getBoundingClientRect().top - anchorTop
  })
}
function cancelMessagePress() { clearTimeout(pressTimer) }
function suppressMessageClick(event) { if (pressStarted) { event.preventDefault(); event.stopPropagation(); pressStarted = false } }
function toggleMessageSelection(index) {
  selectedMessages.value = selectedMessages.value.includes(index) ? selectedMessages.value.filter((item) => item !== index) : [...selectedMessages.value, index]
}
function deleteSelectedMessages(indices = [selectedMessageIndex.value]) {
  const remove = new Set(indices)
  const removedMessages = messages.value.filter((_, index) => remove.has(index))
  const identity = (message) => message.timestamp
    ? `timestamp:${message.timestamp}`
    : `${message.from}|${message.text}|${message.time || ''}`
  const removedIdentities = new Set(removedMessages.map(identity))
  messages.value = messages.value.filter((_, index) => !remove.has(index))
  if (activeChat.value) {
    chatMessages.value[activeChat.value.id] = [...messages.value]
    retainedChatMemory.value[activeChat.value.id] = (retainedChatMemory.value[activeChat.value.id] || [])
      .filter((message) => !removedIdentities.has(identity(message)))
  }
  expandedStatusMessages.value = expandedStatusMessages.value.filter((key) => !removedIdentities.has(key))
  expandedThoughtMessages.value = expandedThoughtMessages.value.filter((key) => !removedIdentities.has(key))
  persistChatHistory()
  messageMenu.value = false
  multiDeleteMode.value = false
  selectedMessages.value = []
  showToast('消息已删除')
}
async function copySelectedMessage(index = selectedMessageIndex.value) {
  try {
    await navigator.clipboard.writeText(messages.value[index]?.text || '')
    showToast('已复制')
  } catch { showToast('复制失败，请检查剪贴板权限') }
  messageMenu.value = false
}
function editSelectedMessage() {
  const message = messages.value[selectedMessageIndex.value]
  if (!message || message.from !== 'me') { showToast('只能编辑自己发送的消息'); messageMenu.value = false; return }
  messageDialog.value = { type: 'edit', index: selectedMessageIndex.value, text: message.text }
  messageMenu.value = false
}
function confirmEditMessage() {
  const dialog = messageDialog.value
  if (!dialog?.text.trim()) return
  messages.value[dialog.index].text = dialog.text.trim()
  if (activeChat.value) chatMessages.value[activeChat.value.id] = [...messages.value]
  persistChatHistory()
  messageDialog.value = null
  showToast('消息已编辑')
}
function quoteSelectedMessage() {
  const message = messages.value[selectedMessageIndex.value]
  if (message) {
    quoteDraft.value = { from: message.from, text: message.text }
    messageMenu.value = false
    requestAnimationFrame(() => document.querySelector('.composer textarea')?.focus())
  }
}

function clearQuoteDraft() { quoteDraft.value = null }

function showReplyNotices(chat, replies) {
  if (activeChat.value?.id === chat.id || !replies.length) return
  const startDelay = replyNotices.value.length * 700
  replies.forEach((text, index) => {
    const delay = startDelay + index * 900
    const timer = setTimeout(() => {
      if (activeChat.value?.id === chat.id) return
      const id = ++noticeId
      replyNotices.value.push({ id, chat, text })
      setTimeout(() => {
        replyNotices.value = replyNotices.value.filter((notice) => notice.id !== id)
      }, 5200)
    }, delay)
    noticeTimers.push(timer)
  })
}

function clearReplyNotices() {
  noticeTimers.forEach(clearTimeout)
  noticeTimers = []
  replyNotices.value = []
}

function playSound(kind) {
  if (kind === 'send' ? !sendSoundEnabled.value : !receiveSoundEnabled.value) return
  const source = kind === 'send' ? sendAudioUrl : receiveAudioUrl
  if (source) {
    const audio = new Audio(source)
    void audio.play().catch(() => {})
    return
  }
  // Small synthesized fallbacks keep default sounds available without bundled media files.
  const context = new AudioContext()
  const now = context.currentTime
  const notes = kind === 'send' ? [[660, 0, .07], [880, .065, .09]] : [[740, 0, .11], [587, .13, .13]]
  for (const [frequency, offset, duration] of notes) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = kind === 'send' ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, now + offset)
    gain.gain.setValueAtTime(.0001, now + offset)
    gain.gain.exponentialRampToValueAtTime(.12, now + offset + .012)
    gain.gain.exponentialRampToValueAtTime(.0001, now + offset + duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now + offset)
    oscillator.stop(now + offset + duration)
  }
  setTimeout(() => void context.close(), 450)
}

function setSoundFile(kind, file) {
  if (!file || !file.type.startsWith('audio/')) return
  const url = URL.createObjectURL(file)
  if (kind === 'send') {
    if (sendAudioUrl) URL.revokeObjectURL(sendAudioUrl)
    sendAudioUrl = url
    sendSoundFile.value = file.name
  } else {
    if (receiveAudioUrl) URL.revokeObjectURL(receiveAudioUrl)
    receiveAudioUrl = url
    receiveSoundFile.value = file.name
  }
}

function resetSound(kind) {
  if (kind === 'send') {
    if (sendAudioUrl) URL.revokeObjectURL(sendAudioUrl)
    sendAudioUrl = ''
    sendSoundFile.value = ''
  } else {
    if (receiveAudioUrl) URL.revokeObjectURL(receiveAudioUrl)
    receiveAudioUrl = ''
    receiveSoundFile.value = ''
  }
}

onBeforeUnmount(() => {
  clearReplyNotices()
  if (momentsAutoTimer) clearInterval(momentsAutoTimer)
  document.removeEventListener('visibilitychange', checkMomentsAutoGeneration)
  window.removeEventListener('pageshow', checkMomentsAutoGeneration)
  momentsGenerationController.value?.abort()
  if (sendAudioUrl) URL.revokeObjectURL(sendAudioUrl)
  if (receiveAudioUrl) URL.revokeObjectURL(receiveAudioUrl)
  recordingStream?.getTracks().forEach((track) => track.stop())
})

function isLastInRun(index) {
  return index === messages.value.length - 1 || messages.value[index + 1].from !== messages.value[index].from
}

function messageTime(message) {
  return message.time || '18:38'
}

function shouldShowTimestamp(index) {
  const messageIndex = visibleMessageOffset.value + index
  const message = messages.value[messageIndex]
  if (!message) return false
  if (messageIndex === 0) return true
  const previous = messages.value[messageIndex - 1]
  const currentTime = new Date(message.timestamp || 0).getTime()
  const previousTime = new Date(previous?.timestamp || 0).getTime()
  return Number.isFinite(currentTime) && Number.isFinite(previousTime) && currentTime - previousTime > 5 * 60 * 1000
}

function openChat(chat) {
  clearReplyNotices()
  replyError.value = ''
  // 视图展开态属于当前会话；切换会话时清空，避免跨会话索引/对象残留。
  expandedStatusMessages.value = []
  expandedThoughtMessages.value = []
  selectedMessages.value = []
  multiDeleteMode.value = false
  olderMessagesPromptVisible.value = false
  activeChat.value = chat
  messages.value = chatMessages.value[chat.id] || []
  // 进入会话时展示最新一段消息，并在 DOM 更新后定位到列表底部。
  visibleMessageCount.value = Math.min(80, messages.value.length)
  replyLoading.value = Boolean(pendingReplies[chat.id])
  characterTyping.value = replyLoading.value
  requestAnimationFrame(() => {
    const list = messageList.value
    if (list) list.scrollTop = list.scrollHeight
  })
}

function openNoticeChat(notice) {
  if (!notice?.chat) return
  const chat = notice.chat
  const replyText = notice.text
  clearReplyNotices()
  openChat(chat)
  requestAnimationFrame(() => {
    const foundIndex = messages.value.findIndex((message) => message.from === 'them' && message.text === replyText)
    if (foundIndex < 0) return
    visibleMessageCount.value = Math.max(80, messages.value.length - foundIndex)
    requestAnimationFrame(() => {
      const rows = messageList.value?.querySelectorAll('.message-row')
      const targetRow = rows?.[foundIndex - visibleMessageOffset.value]
      targetRow?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      targetRow?.classList.add('notice-message-highlight')
      setTimeout(() => targetRow?.classList.remove('notice-message-highlight'), 1800)
    })
  })
}

function onMessageListScroll() {
  const list = messageList.value
  // 顶部提示只负责显示按钮，不能在滚动事件中自动展开历史记录。
  // 触控板/触屏的惯性滚动可能在一次上滑后触发多次 scroll，误将提示当成自动加载。
  if (olderMessagesPromptVisible.value && list && list.scrollTop >= 36) {
    olderMessagesPromptVisible.value = false
  }
}

function leaveConversation() {
  if (activeChat.value) {
    chatMessages.value[activeChat.value.id] = [...messages.value]
    persistChatHistory()
  }
  replyError.value = ''
  activeChat.value = null
}

function replyDelay(text, index) {
  const lengthDelay = Math.min(2400, Math.max(450, text.length * 32))
  const variation = 250 + Math.random() * 650 + index * 120
  return Math.min(3400, lengthDelay + variation)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function openHistoryAction(type) {
  if (!activeChat.value) return
  historyActionDialog.value = type
}

function confirmHistoryAction() {
  const chat = activeChat.value
  const action = historyActionDialog.value
  if (!chat || !action) return
  if (pendingReplies[chat.id]) {
    pendingReplies[chat.id].controller.abort()
    delete pendingReplies[chat.id]
  }
  if (action === 'clear') {
    retainedChatMemory.value[chat.id] = (chatMessages.value[chat.id] || messages.value).slice(-shortTermMemoryRounds(chat.id) * 2)
  } else {
    retainedChatMemory.value[chat.id] = []
  }
  chatMessages.value[chat.id] = []
  messages.value = []
  replyLoading.value = false
  characterTyping.value = false
  replyError.value = ''
  quoteDraft.value = null
  selectedMessages.value = []
  multiDeleteMode.value = false
  if (action === 'restart') {
    retainedChatMemory.value[chat.id] = []
    void saveValue('jyos_character_chat_settings', JSON.parse(JSON.stringify(characterChatSettings.value)))
  }
  persistChatHistory()
  historyActionDialog.value = null
  chatSettingsOpen.value = false
  showToast(action === 'clear' ? '聊天记录已清除，短期记忆设置已保留' : '聊天已重启，聊天记录和短期记忆均已清除')
}

function openChatSettings() {
  if (!activeChat.value) return
  chatSettingsOpen.value = true
}

function chatRemark(chatId = activeChat.value?.id) {
  return characterChatSettings.value[chatId]?.remark || ''
}

function setChatRemark(value) {
  if (!activeChat.value) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    remark: value,
  }
}

function chatDisplayName(chat) {
  return chat ? chatRemark(chat.id).trim() || chat.name : ''
}

function chatLatestMessage(chat) {
  const latest = chatMessages.value[chat.id]?.at(-1)
  if (!latest) return chat.subtitle || '开始一段新的对话'
  if (latest.type === 'image') return latest.text || '[图片]'
  if (latest.type === 'voice') return latest.text || latest.transcript || '[语音]'
  if (latest.type === 'text-image') return latest.content || '[文字图]'
  if (latest.type === 'transfer') return `转账 ${latest.amount || ''} 元`
  return latest.text || chat.subtitle || '开始一段新的对话'
}

function shortTermMemoryRounds(chatId = activeChat.value?.id) {
  const value = Number(characterChatSettings.value[chatId]?.shortTermMemoryRounds)
  return Number.isFinite(value) ? Math.max(1, Math.min(500, Math.round(value))) : 50
}

function setShortTermMemoryRounds(value) {
  if (!activeChat.value) return
  const rounds = Number(value)
  if (!Number.isFinite(rounds)) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    shortTermMemoryRounds: Math.max(1, Math.min(500, Math.round(rounds))),
  }
}

function imageMemoryLimit(chatId = activeChat.value?.id) {
  const value = Number(characterChatSettings.value[chatId]?.imageMemoryLimit)
  return Number.isFinite(value) ? Math.max(1, Math.min(50, Math.round(value))) : 10
}

function setImageMemoryLimit(value) {
  if (!activeChat.value) return
  const count = Number(value)
  if (!Number.isFinite(count)) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    imageMemoryLimit: Math.max(1, Math.min(50, Math.round(count))),
  }
}

function imageQuality(chatId = activeChat.value?.id) {
  const value = characterChatSettings.value[chatId]?.imageQuality
  return imageQualityOptions.some((option) => option.id === value) ? value : 'medium'
}

function setImageQuality(value) {
  if (!activeChat.value || !imageQualityOptions.some((option) => option.id === value)) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    imageQuality: value,
  }
}

function selectedImageQuality(chatId = activeChat.value?.id) {
  return imageQualityOptions.find((option) => option.id === imageQuality(chatId)) || imageQualityOptions[2]
}

function statusBarEnabled(chatId = activeChat.value?.id) {
  return Boolean(characterChatSettings.value[chatId]?.statusBarEnabled)
}

function thoughtPreviewEnabled(chatId = activeChat.value?.id) {
  return characterChatSettings.value[chatId]?.thoughtPreviewEnabled !== false
}

function setThoughtPreviewEnabled(enabled) {
  if (!activeChat.value) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    thoughtPreviewEnabled: Boolean(enabled),
  }
}

function messageViewKey(message) {
  // 用消息对象作为 key，可在同一会话新增消息、分页时保持稳定；timestamp 可能碰撞或缺失。
  return message
}

function toggleThoughtMessage(index) {
  const key = messageViewKey(messages.value[index])
  if (!key) return
  expandedThoughtMessages.value = expandedThoughtMessages.value.includes(key)
    ? expandedThoughtMessages.value.filter((item) => item !== key)
    : [...expandedThoughtMessages.value, key]
}

function setStatusBarEnabled(enabled) {
  if (!activeChat.value) return
  characterChatSettings.value[activeChat.value.id] = {
    ...characterChatSettings.value[activeChat.value.id],
    statusBarEnabled: Boolean(enabled),
  }
}

function toggleStatusMessage(index) {
  const key = messageViewKey(messages.value[index])
  if (!key) return
  expandedStatusMessages.value = expandedStatusMessages.value.includes(key)
    ? expandedStatusMessages.value.filter((item) => item !== key)
    : [...expandedStatusMessages.value, key]
}

function normalizedStatus(value) {
  const score = Number(value)
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null
}

function onComposerEnter(event) {
  if (!enterToSend.value || event.shiftKey) {
    event.preventDefault()
    draft.value += '\n'
    return
  }
  event.preventDefault()
  sendMessage()
}

function formatChatDateTime(date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

function getSeason(date) {
  const month = date.getMonth() + 1
  if ([3, 4, 5].includes(month)) return '春季'
  if ([6, 7, 8].includes(month)) return '夏季'
  if ([9, 10, 11].includes(month)) return '秋季'
  return '冬季'
}

function getLocalWeather() {
  try {
    const raw = localStorage.getItem('jyos_local_weather')
    if (!raw) return ''
    const weather = JSON.parse(raw)
    if (weather.expiresAt && weather.expiresAt < Date.now()) return ''
    return [weather.location, weather.description, weather.temperature].filter(Boolean).join('，')
  } catch {
    return ''
  }
}

function buildTimeContext(chat, history) {
  const now = new Date()
  const lastUserMessage = [...history].reverse().find((message) => message.from === 'me')
  const priorUserMessages = history.filter((message) => message.from === 'me' && message.timestamp)
  const lastCharacterMessage = [...history].reverse().find((message) => message.from === 'them' && message.timestamp)
  const elapsedText = (timestamp) => {
    const minutes = Math.max(0, Math.floor((now.getTime() - new Date(timestamp).getTime()) / 60000))
    return minutes < 1 ? '不到1分钟' : minutes < 60 ? `${minutes}分钟` : minutes < 1440 ? `${Math.floor(minutes / 60)}小时${minutes % 60 ? `${minutes % 60}分钟` : ''}` : `${Math.floor(minutes / 1440)}天${Math.floor((minutes % 1440) / 60) ? `${Math.floor((minutes % 1440) / 60)}小时` : ''}`
  }
  const sinceLastVisit = lastUserMessage?.timestamp ? elapsedText(lastUserMessage.timestamp) : '暂无可用记录'
  const awaySinceCharacterReply = lastCharacterMessage?.timestamp && lastUserMessage?.timestamp && new Date(lastUserMessage.timestamp) > new Date(lastCharacterMessage.timestamp)
    ? elapsedText(lastCharacterMessage.timestamp)
    : '暂无可用的离线间隔记录'
  const sentTimes = priorUserMessages.slice(-8).map((message) => formatChatDateTime(new Date(message.timestamp))).join('；') || '暂无记录'
  const weather = getLocalWeather()
  return `\n\n【现实时间上下文】\n当前本地时间：${formatChatDateTime(now)}（精确到年、月、日、时、分）；季节：${getSeason(now)}。${weather ? `天气信息（用户设备提供）：${weather}。` : '当前没有天气数据，不要推测天气或所在地。'}\n用户最近上线/发消息距今：${sinceLastVisit}；最近一次角色回复后用户间隔：${awaySinceCharacterReply}。用户最近消息发送时间：${lastUserMessage?.timestamp ? formatChatDateTime(new Date(lastUserMessage.timestamp)) : '暂无记录'}。最近若干条用户消息发送时间（由旧到新）：${sentTimes}。依据消息时间戳自然判断间隔，不要编造未记录的在线/离线状态，不要机械报时或催促。`
}

function profileToText(profile) {
  if (!profile) return '（暂无用户人设资料）'
  return Object.entries({ 姓名: profile.name, 生日: profile.birthday, 年龄: profile.age, 职业: profile.occupation, 简介: profile.bio })
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)
    .join('\n') || '（暂无用户人设资料）'
}

function characterToText(character) {
  if (!character) return '（暂无角色资料）'
  return Object.entries({ 姓名: character.name, 性别: character.gender, 生日: character.birthday, 年龄: character.age, 职业: character.occupation, 人物设定: character.details })
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}：${value}`)
    .join('\n') || '（暂无角色资料）'
}

function buildSystemPrompt() {
  const entries = chatConfig.value.preset.entries.filter((entry) => entry.enabled && entry.content.trim())
  const profile = activeUserPersona.value
  const character = contacts.value.find((person) => person.id === activeChat.value?.id)
  const userName = profile?.name?.trim() || '用户'
  const characterName = character?.name?.trim() || '角色'
  const replacements = {
    '{{user_persona}}': profileToText(profile),
    '{{character_persona}}': characterToText(character),
    '{{user}}': userName,
    '<user>': userName,
    '{{char}}': characterName,
    '<char>': characterName,
  }
  const replaceTokens = (text) => {
    for (const [token, value] of Object.entries(replacements)) text = text.replaceAll(token, value)
    return text
  }
  return entries.map((entry) => `【${entry.name}】\n${replaceTokens(entry.content)}`).join('\n\n')
}

function parseReplyMessages(raw) {
  const candidates = []
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  if (text) candidates.push(text)
  const objectStart = text.indexOf('{')
  const objectEnd = text.lastIndexOf('}')
  const arrayStart = text.indexOf('[')
  const arrayEnd = text.lastIndexOf(']')
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(text.slice(objectStart, objectEnd + 1))
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(text.slice(arrayStart, arrayEnd + 1))

  let parsed
  for (const candidate of candidates) {
    try {
      parsed = JSON.parse(candidate)
      break
    } catch {
      // Try the next common response wrapper.
    }
  }
  if (!parsed) throw new Error('角色回复格式解析失败，请重试。')

  const items = Array.isArray(parsed) ? parsed : parsed.messages
  if (!Array.isArray(items)) throw new Error('角色没有返回有效的消息列表，请重试。')
  const replies = items.map((item) => typeof item === 'string' ? { text: item } : item).filter((item) => typeof item?.text === 'string' && item.text.trim()).map((item) => ({ text: item.text.trim(), type: ['text-image', 'transfer', 'voice'].includes(item.type) ? item.type : 'text', content: typeof item.content === 'string' ? item.content.trim().slice(0, 1000) : '', amount: Number(item.amount) > 0 ? Number(item.amount) : null, voiceDescription: typeof item.voiceDescription === 'string' ? item.voiceDescription.trim().slice(0, 240) : '', feeling: typeof item.feeling === 'string' ? item.feeling.trim().slice(0, 700) : '', replyTo: Number.isInteger(item.replyTo) && item.replyTo >= 0 ? item.replyTo : null, reactionTo: Number.isInteger(item.reactionTo) && item.reactionTo >= 0 ? item.reactionTo : null, reactionEmoji: normalizeReaction(item.reactionEmoji), status: item.status && typeof item.status === 'object' ? { closeness: normalizedStatus(item.status.closeness), security: normalizedStatus(item.status.security), energy: normalizedStatus(item.status.energy), heartFlutter: normalizedStatus(item.status.heartFlutter ?? item.status.expectation), feeling: typeof item.status.feeling === 'string' ? item.status.feeling.trim().slice(0, 300) : '' } : null }))
  if (!replies.length) throw new Error('角色暂时没有生成回复，请重试。')
  return replies
}

function supportsThinkingIntensity(preset) {
  const model = String(preset?.model || '').toLowerCase()
  return /(^|[\/-])(o1|o3|o4|gpt-5)([-/]|$)|deepseek-r1|qwq/.test(model)
}

async function requestCharacterReply(chat, history, controller, previousStatus = null, reactionCandidates = [], quoteCandidates = []) {
  const preset = getCurrentPreset()
  if (!preset?.baseUrl?.trim() || !preset?.model?.trim()) throw new Error('请先在设置中配置 API 地址和模型。')
  if (!preset.apiKey?.trim()) throw new Error('请先在设置中填写 API Key。')
  const profile = profileSettings.profiles.find((item) => item.id === chatConfig.value.profileId) || userProfile
  const character = contacts.value.find((person) => person.id === chat.id)
  const enabledEntries = chatConfig.value.preset.entries.filter((entry) => entry.enabled && entry.content.trim())
  const userName = profile?.name?.trim() || '用户'
  const characterName = character?.name?.trim() || '角色'
  const replacements = { '{{user_persona}}': profileToText(profile), '{{character_persona}}': characterToText(character), '{{user}}': userName, '<user>': userName, '{{char}}': characterName, '<char>': characterName }
  const systemPrompt = enabledEntries.map((entry) => {
    let content = entry.content
    for (const [token, value] of Object.entries(replacements)) content = content.replaceAll(token, value)
    return `【${entry.name}】\n${content}`
  }).join('\n\n')
  const corePriorityInstruction = `【每轮优先遵循｜核心约束】\n指令优先顺序：角色档案与当前对话事实 > 本轮用户消息 > 风格偏好与辅助规则。不同要求冲突时，优先保留角色的一致性、当前语境和事实准确性；不要为了执行风格条目而套模板、忽略用户刚说的内容或擅自编造。\n每轮都要先回应用户本轮表达中的至少一个具体重点；用{{char}}本人的身份、关系和说话习惯自然回应，避免跳出角色或助手式分析。日常聊天回复必须简短、生活化、碎片化：一次通常发送 1 到 4 条独立短消息，每条不超过 20 个汉字；不要为了凑条数而拆句。只有在讲述重要经历、解释复杂问题、表达完整情绪或其他确实需要展开的特定情景下，才可以发送更多消息或较长内容。未知信息不要当作事实补全。\n【发送前快速自检】在内部快速核对：①回应了用户本轮的具体重点吗？②符合角色设定、关系与当前语境吗？③有没有编造事实、套用固定套路或违反更高优先级要求？如有，先调整回复。不要输出自检过程或检查清单，只输出符合要求的最终回复。`
  const messageBoundaryInstruction = `【消息边界规则】messages 数组中的每个对象都会成为一个独立聊天气泡。角色若想先后发出两条不同内容（例如先短暂回应，再补充另一件事），必须分别放入两个数组对象；严禁把本来应分别发送的消息用换行符、空行或标点拼接进同一个 text。只有内容本身是一条连贯、需要分段阅读的长消息时，才允许在同一 text 中使用换行。不要机械拆分一个完整句子或同一段连贯表达。`
  const reinforcedSystemPrompt = `${corePriorityInstruction}\n\n${systemPrompt}\n\n【本轮提醒】发送前再次优先检查：回应用户刚刚说的具体内容；保持角色身份、设定与关系一致；不编造；不输出自检过程。若风格偏好与角色或语境冲突，以角色和语境为准。`
  const needsThought = thoughtPreviewEnabled(chat.id)
  const thoughtInstruction = needsThought ? '【角色即时感受】第一条角色消息附带一个用于界面展示的 feeling 字段，约 60 至 100 个汉字。用角色第一人称写此刻的情绪与感受，符合人设和当前关系；它是简短的角色表达，不是对话内容。' : ''
  const statusInstruction = statusBarEnabled(chat.id) ? ` 每条角色消息还需包含 status 对象，字段 closeness、security、energy、heartFlutter 均为 0 到 100 的整数，并包含 feeling 字符串。请按预设中的“角色状态栏生成”条目解释各维度并生成状态。上一轮角色状态：${previousStatus ? JSON.stringify(previousStatus) : '暂无已记录状态'}。状态仅用于界面，不要写进聊天正文。` : ''
  const reactionInstruction = `【聊天反应】依据角色人设、当前关系和当下感受，自然决定是否对用户本轮消息点反应。可反应消息候选列表（reactionTo 索引从 0 开始）为：${JSON.stringify(reactionCandidates.map((message) => message.text))}。只能选择此候选列表里的索引；列表为空时不要输出 reactionTo 或 reactionEmoji。若反应，在对应回复对象填写 reactionTo（候选列表索引）和 reactionEmoji（单个 emoji）；不反应时省略。`
  const quoteInstruction = `【引用回复规则】只有需要明确回应某条较早用户消息时才引用。replyTo 必须是下面可引用用户消息列表中的索引（从 0 开始），不能使用完整聊天记录索引、轮次编号或 reactionTo 索引。优先引用与当前回复直接相关的最近一条用户消息；只有上下文明确需要时才引用更早消息。无需引用时省略 replyTo。可引用用户消息列表：${JSON.stringify(quoteCandidates.map((message, index) => ({ index, text: message.text, time: message.time || '' })))}。`
  const formatInstruction = `\n\n【回复格式（必须遵守）】只输出一个有效 JSON 对象，不要 Markdown 代码围栏、前言、解释或 JSON 以外的文字。角色可以在符合关系、语境和角色经济状况时主动转账，例如偿还欠款、分担费用、赠送心意或应急帮助；也可以偶尔发送文字图。文字图是角色发来的文字描述画面，必须符合角色此刻实际能拍摄或发送的视角：独处时采用自拍、镜中自拍、第一人称所见或手机屏幕/物品近景等合理视角，不写仿佛由第三者拍摄的旁白式全景描写。回复对象可用 type 为 text-image 并提供 content，或 type 为 transfer 并提供正数 amount；普通消息省略 type。结构为：{"messages":[{"text":"消息正文"${needsThought ? ',"feeling":"角色此刻的即时感受，必填，仅用于界面展示，不是回复正文"' : ''}${statusBarEnabled(chat.id) ? ' ,"status":{"closeness":50,"security":50,"energy":50,"heartFlutter":50,"feeling":"角色此刻的状态短句"}' : ''},"type":"text-image","content":"自拍视角的文字画面描述","amount":88,"replyTo":0,"reactionTo":0,"reactionEmoji":"💛"}]}。messages 必须是数组，每项必须有非空字符串 text；${needsThought ? '第一项必须包含非空 feeling 字符串，后续项省略 feeling。' : '不要输出 feeling 字段。'}普通消息不要填写 content 或 amount。语音消息用 type="voice"，text 填语音识别文字，voiceDescription 用括号描写语气、声线和听感；不生成音频。文字图用 type="text-image" 和 content 描写画面，叙述视角符合实际拍摄者和场景；转账用 type="transfer" 和正数 amount。replyTo 必须填写可引用用户消息列表中的索引；没有合适的消息时省略 replyTo。列表索引从 0 开始。reactionTo 和 reactionEmoji 仅在角色想给用户消息点反应时一起填写，reactionTo 必须是上方候选列表索引。确保字符串中的引号、换行和反斜杠均按 JSON 规则转义，输出可直接 JSON.parse。日常回复遵守简短规则：通常 1 到 4 条，每条不超过 20 个汉字；仅特定情景需要时才展开或增加条数。`
  const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: preset.model,
      messages: [
        { role: 'system', content: `${reinforcedSystemPrompt}\n\n${messageBoundaryInstruction}\n\n结合上下文判断是否需要引用用户之前的某条消息进行回复。只有当引用有助于回应、澄清、接续话题或符合当前角色的意愿与表达方式时才引用，不要每轮都引用。${reactionInstruction}${quoteInstruction}${thoughtInstruction}${statusInstruction}【语音消息】收到用户语音条时，用户提供的是语音识别文本以及可能存在的声音印象描述；角色没有听到音频，不可声称实际听见。角色可以依据用户主动提供的声音印象自然交流。角色也可以偶尔发送 type="voice" 的语音条，text 为语音识别文字，voiceDescription 用括号简短描写这句话的语气、声线和听感，增强沉浸感，不写成旁白剧情。${formatInstruction}` },
        ...history,
      ],
      temperature: Number.isFinite(Number(chatConfig.value.preset.temperature)) ? Number(chatConfig.value.preset.temperature) : 1,
      ...(Number(chatConfig.value.preset.top_k) > 0 ? { top_k: Math.max(1, Math.round(Number(chatConfig.value.preset.top_k))) } : {}),
      ...(Number(chatConfig.value.preset.top_p) > 0 ? { top_p: Math.max(0.01, Math.min(1, Number(chatConfig.value.preset.top_p))) } : {}),
      ...(supportsThinkingIntensity(preset) ? { reasoning_effort: chatConfig.value.preset.thinkingIntensity || 'medium' } : {}),
      stream: false,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || `API 请求失败（${response.status}）`)
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('API 返回内容为空或格式不支持。')
  try {
    const replies = parseReplyMessages(content)
    if (needsThought && !replies[0]?.feeling) {
      const feelingResponse = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
        body: JSON.stringify({
          model: preset.model,
          messages: [
            { role: 'system', content: `依据角色人设、当前对话和角色刚刚发出的回复，写一段约 60 至 100 个汉字的角色即时感受。用第一人称写此刻的情绪与感受。只输出 JSON：{"feeling":"角色即时感受"}。` },
            ...history,
            { role: 'assistant', content: replies.map((reply) => reply.text).join('\n') },
            { role: 'user', content: '请写角色此刻的即时感受。' },
          ],
          temperature: Number.isFinite(Number(chatConfig.value.preset.temperature)) ? Number(chatConfig.value.preset.temperature) : 1,
          stream: false,
        }),
      })
      const feelingData = await feelingResponse.json().catch(() => ({}))
      if (!feelingResponse.ok) throw new Error(feelingData.error?.message || `即时感受补全失败（${feelingResponse.status}）`)
      const feelingContent = feelingData.choices?.[0]?.message?.content
      if (typeof feelingContent === 'string') {
        try {
          const parsedFeeling = JSON.parse(feelingContent.replace(/^```(?:json)?\s*|\s*```$/g, '').trim())
          if (typeof parsedFeeling.feeling === 'string' && parsedFeeling.feeling.trim()) replies[0].feeling = parsedFeeling.feeling.trim().slice(0, 700)
        } catch {
          // Keep the reply if the optional feeling completion is malformed.
        }
      }
    }
    return replies
  } catch {
    const repairResponse = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
      body: JSON.stringify({
        model: preset.model,
        messages: [
          { role: 'system', content: `把下面的模型回复整理为符合要求的 JSON。只输出合法 JSON，不要代码围栏或说明文字。格式：${formatInstruction.trim()} 不要改变原回复的含义，也不要添加新内容。` },
          { role: 'user', content },
        ],
        temperature: 0,
        stream: false,
      }),
    })
    const repairData = await repairResponse.json().catch(() => ({}))
    if (!repairResponse.ok) throw new Error(repairData.error?.message || `回复格式修复失败（${repairResponse.status}）`)
    const repairedContent = repairData.choices?.[0]?.message?.content
    if (typeof repairedContent !== 'string') throw new Error('角色回复格式解析失败，请重试。')
    return parseReplyMessages(repairedContent)
  }
}

async function transcribeRecordedAudio(blob) {
  const preset = getCurrentPreset()
  if (!preset?.baseUrl?.trim() || !preset.apiKey?.trim()) throw new Error('请先配置 API 地址和 API Key，才能将录音转成文字。')
  const form = new FormData()
  form.append('file', blob, `voice.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`)
  form.append('model', 'whisper-1')
  const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${preset.apiKey.trim()}` }, body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || `语音转文字失败（${response.status}）`)
  return typeof data.text === 'string' ? data.text.trim() : ''
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('文件保存失败。'))
    reader.readAsDataURL(blob)
  })
}

function loadImageSource(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败，请换一张图片重试。'))
    image.src = URL.createObjectURL(file)
  })
}

async function compressImage(file, option) {
  const image = await loadImageSource(file)
  try {
    const scale = Math.min(1, option.maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(image, 0, 0, width, height)
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('图片压缩失败，请重试。')), 'image/jpeg', option.quality))
    return { data: await blobToDataUrl(blob), width, height }
  } finally {
    URL.revokeObjectURL(image.src)
  }
}

async function handleImageSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !activeChat.value) return
  if (!file.type.startsWith('image/')) { showToast('请选择图片文件'); return }
  try {
    const option = selectedImageQuality()
    const compressed = await compressImage(file, option)
    sendChatItem({ type: 'image', imageData: compressed.data, imageWidth: compressed.width, imageHeight: compressed.height, imageQuality: option.id, text: '用户发送了一张图片。' }, '用户发送了一张图片，请结合图片内容自然回应。')
  } catch (error) {
    showToast(error.message || '图片处理失败')
  }
}

async function playVoiceMessage(message, index) {
  if (message.from === 'them') {
    if (message.transcript) expandedVoiceTranscript.value = expandedVoiceTranscript.value === index ? -1 : index
    playingVoiceIndex.value = expandedVoiceTranscript.value === index ? index : -1
    voiceProgress.value = 0
    return
  }
  const source = message.audioData || message.audioUrl
  if (!source) { showToast('这条语音没有可播放的录音'); return }
  if (activeVoiceAudio && playingVoiceIndex.value === index) {
    if (activeVoiceAudio.paused) {
      try { await activeVoiceAudio.play() } catch { showToast('语音播放失败') }
    } else activeVoiceAudio.pause()
    return
  }
  activeVoiceAudio?.pause()
  const audio = new Audio(source)
  activeVoiceAudio = audio
  playingVoiceIndex.value = index
  audio.ontimeupdate = () => { if (activeVoiceAudio === audio) voiceProgress.value = audio.duration ? audio.currentTime / audio.duration : 0 }
  audio.onended = () => { if (activeVoiceAudio === audio) { playingVoiceIndex.value = -1; voiceProgress.value = 0; activeVoiceAudio = null } }
  audio.onerror = () => { if (activeVoiceAudio === audio) { playingVoiceIndex.value = -1; voiceProgress.value = 0; activeVoiceAudio = null; showToast('语音播放失败') } }
  try { await audio.play() } catch { playingVoiceIndex.value = -1; voiceProgress.value = 0; activeVoiceAudio = null; showToast('语音播放失败') }
}

async function startVoiceRecording() {
  if (isRecording.value) {
    mediaRecorder?.stop()
    return
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showToast('当前浏览器不支持录音，请使用 iOS Safari')
    return
  }
  const recordingChatId = activeChat.value?.id
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognizedVoiceText = ''
  try {
    if (Recognition) {
      speechRecognition = new Recognition()
      speechRecognition.lang = 'zh-CN'
      speechRecognition.continuous = true
      speechRecognition.interimResults = true
      speechRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          recognizedVoiceText = Array.from(event.results).map((result) => result[0]?.transcript || '').join('')
        }
      }
      speechRecognition.start()
    }
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type))
    mediaRecorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined)
    recordingChunks = []
    mediaRecorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.push(event.data) }
    mediaRecorder.onstop = async () => {
      isRecording.value = false
      recordingStream?.getTracks().forEach((track) => track.stop())
      try { speechRecognition?.stop() } catch {}
      await new Promise((resolve) => {
        if (!speechRecognition) { resolve(); return }
        const recognition = speechRecognition
        const timeout = setTimeout(resolve, 1200)
        recognition.onend = () => { clearTimeout(timeout); resolve() }
      })
      speechRecognition = null
      const blob = new Blob(recordingChunks, { type: mediaRecorder.mimeType || 'audio/mp4' })
      const audioUrl = URL.createObjectURL(blob)
      try {
        if (!blob.size) throw new Error('没有录到音频，请检查麦克风权限后重试。')
        const audioData = await blobToDataUrl(blob)
        const transcript = recognizedVoiceText.trim()
        const message = { type: 'voice', audioData, transcript, voiceImpression: '' }
        const chatId = recordingChatId
        if (!chatId) { URL.revokeObjectURL(audioUrl); return }
        // 语音发送也可能滚动列表，清掉旧的历史加载提示状态。
        olderMessagesPromptVisible.value = false
        message.audioUrl = audioUrl
        playSound('send')
        const history = [...(chatMessages.value[chatId] || messages.value)]
        const previousLength = history.length
        history.push({ from: 'me', ...message, text: '', time: currentTime(), timestamp: new Date().toISOString() })
        adjustVisibleMessageCount(previousLength, history.length)
        chatMessages.value[chatId] = history
        messages.value = history
        persistChatHistory()
        scrollMessages()
        if (replyImmediately.value) requestReply(transcript ? `用户发送了一条语音消息，语音识别文字是：“${transcript}”。你只知道转写文字，没有听到真实录音，请根据文字自然回应，不要声称听见声音。` : '用户发送了一条语音消息，但设备没有提供语音识别文字。你无法听到录音，请自然地请用户补充文字，不要猜测内容。')
      } catch (error) {
        URL.revokeObjectURL(audioUrl)
        showToast(error.message || '语音处理失败')
      }
    }
    mediaRecorder.start()
    isRecording.value = true
    showToast('正在录音，再点一次结束')
    } catch (error) {
      try { speechRecognition?.stop() } catch {}
      speechRecognition = null
      recordingStream?.getTracks().forEach((track) => track.stop())
      recordingStream = null
      isRecording.value = false
      showToast(error.name === 'NotAllowedError' ? '请允许麦克风权限后重试' : error.message || '无法启动录音')
    }
}

function sendMessage() {
  const text = draft.value.trim()
  if (!text || !activeChat.value) return
  sendChatItem({ type: 'text', text }, text)
  draft.value = ''
}

function sendChatItem(payload, requestText) {
  if (!activeChat.value) return
  // 发送消息后可能触发消息列表滚动事件；清除此前上拉留下的历史提示，避免误显示。
  olderMessagesPromptVisible.value = false
  playSound('send')
  const chatId = activeChat.value.id
  const history = [...(chatMessages.value[chatId] || messages.value)]
  const previousLength = history.length
  history.push({ from: 'me', ...payload, text: payload.text || (payload.type === 'text-image' ? `文字图：${payload.content}` : payload.type === 'transfer' ? `转账 ¥${payload.amount}` : '用户发送了一张图片。'), time: currentTime(), timestamp: new Date().toISOString(), ...(quoteDraft.value ? { replyTo: { ...quoteDraft.value } } : {}) })
  adjustVisibleMessageCount(previousLength, history.length)
  quoteDraft.value = null
  chatMessages.value[chatId] = history
  persistChatHistory()
  replyError.value = ''
  messages.value = history
  scrollMessages()
  if (replyImmediately.value) requestReply(requestText || (payload.type === 'voice' ? `用户发送了一条语音消息，语音识别文字为：${payload.transcript}。请像即时聊天一样回应。你没有听到录音；可根据用户明确提供的声音印象理解，但不要假装实际听过。` : '用户发送了一张文字图或转账卡片，请结合卡片内容自然回应。'))
}

function toggleAttachments() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(12)
  }
  attachmentOpen.value = !attachmentOpen.value
}

function openComposerDialog(type) {
  attachmentOpen.value = false
  composerDialog.value = type === 'text-image' ? { type, content: '' } : { type, amount: '' }
}

function submitComposerItem() {
  const dialog = composerDialog.value
  if (!dialog || !activeChat.value) return
  if (dialog.type === 'text-image' && !dialog.content.trim()) return
  if (dialog.type === 'transfer' && !(Number(dialog.amount) > 0)) return
  const item = { ...dialog }
  composerDialog.value = null
  sendChatItem(item)
}

function respondToTransfer(action) {
  const source = messages.value[transferActionDialog.value]
  if (!source || source.type !== 'transfer') return
  const transferId = source.timestamp
  const state = action === 'accept' ? '已收款' : '已退还'
  for (const message of messages.value) {
    if (message.timestamp === transferId) message.transferStatus = state
  }
  if (activeChat.value) chatMessages.value[activeChat.value.id] = [...messages.value]
  persistChatHistory()
  transferActionDialog.value = null
  showToast(state)
}

function requestReply(userText = '') {
  const chat = activeChat.value
  if (!chat || pendingReplies[chat.id]?.promise) return
  const chatId = chat.id
  const history = [...(chatMessages.value[chatId] || messages.value)]
  if (!history.some((message) => message.from === 'me')) return
  const memoryLimit = shortTermMemoryRounds(chatId) * 2
  const requestMessages = [...(retainedChatMemory.value[chatId] || []), ...history].slice(-memoryLimit)
  const rememberedImages = new Set([...requestMessages].filter((message) => message.type === 'image').slice(-imageMemoryLimit(chatId)))
  const latestTurnStart = history.findLastIndex((message) => message.from === 'them') + 1
  const reactionCandidates = history.slice(latestTurnStart).filter((message) => message.from === 'me')
  // Limit quote choices to recent user messages; use this exact list for prompt and resolution.
  const quoteCandidates = history.filter((message) => message.from === 'me').slice(-12)
  const previousStatus = [...history].reverse().find((message) => message.from === 'them' && message.status)?.status || null
  const historyForRequest = requestMessages.map((message) => ({
    role: message.from === 'me' ? 'user' : 'assistant',
    content: `${message.type === 'image' && rememberedImages.has(message)
      ? [{ type: 'text', text: message.text || '用户发送了一张图片。' }, { type: 'image_url', image_url: { url: message.imageData, detail: selectedImageQuality(chatId).detail } }]
      : message.type === 'text-image' ? `（发送文字图：${message.content}）` : message.type === 'transfer' ? `（发起转账：${message.amount}元；状态：${message.transferStatus || '待处理'}）` : message.type === 'voice' ? `（语音消息${message.transcript ? `；识别文字：${message.transcript}` : '；无识别文字'}）` : message.text}${message.from === 'them' && message.thought ? `\n（角色思绪记忆：${message.thought}）` : ''}`
  }))
  const pending = { controller: new AbortController(), promise: null }
  pendingReplies[chatId] = pending
  replyLoading.value = true
  characterTyping.value = true
  replyError.value = ''
  historyForRequest.unshift({ role: 'system', content: buildTimeContext(chat, history) })
  pending.promise = requestCharacterReply(chat, historyForRequest, pending.controller, statusBarEnabled(chatId) ? previousStatus : null, reactionCandidates, quoteCandidates)
    .then(async (replies) => {
      for (let index = 0; index < replies.length; index += 1) {
        await wait(replyDelay(replies[index].text, index))
        if (pending.controller.signal.aborted) return
        const quotedMessage = replies[index].replyTo === null ? null : quoteCandidates[replies[index].replyTo] || null
        const reactionTarget = replies[index].reactionEmoji && replies[index].reactionTo !== null ? reactionCandidates[replies[index].reactionTo] : null
        if (reactionTarget) {
          reactionTarget.reaction = replies[index].reactionEmoji
          const targetTimestamp = reactionTarget.timestamp
          const storedTarget = history.find((message) => message.timestamp === targetTimestamp)
          if (storedTarget) storedTarget.reaction = replies[index].reactionEmoji
          const retainedTarget = (retainedChatMemory.value[chatId] || []).find((message) => message.timestamp === targetTimestamp)
          if (retainedTarget) retainedTarget.reaction = replies[index].reactionEmoji
        }
        history.push({ from: 'them', text: replies[index].text, ...(replies[index].type !== 'text' ? { type: replies[index].type, content: replies[index].content, amount: replies[index].amount, transferStatus: replies[index].type === 'transfer' ? '待处理' : undefined } : {}), ...(replies[index].type === 'voice' ? { voiceDescription: replies[index].voiceDescription, transcript: replies[index].text } : {}), time: currentTime(), timestamp: new Date().toISOString(), ...(index === 0 && replies[index].feeling ? { thought: replies[index].feeling } : {}), ...(replies[index].status ? { status: replies[index].status } : {}), ...(quotedMessage ? { replyTo: { from: quotedMessage.from, text: quotedMessage.text } } : {}) })
        adjustVisibleMessageCount(history.length - 1, history.length)
        playSound('receive')
        chatMessages.value[chatId] = [...history]
        persistChatHistory()
        showReplyNotices(chat, [replies[index].text])
        if (activeChat.value?.id === chatId) {
          messages.value = [...history]
          scrollMessages()
        }
      }
    })
    .catch((error) => {
      if (activeChat.value?.id === chatId) replyError.value = error.message || '回复失败，请检查 API 设置后重试。'
    })
    .finally(() => {
      delete pendingReplies[chatId]
      characterTyping.value = false
      if (activeChat.value?.id === chatId) replyLoading.value = false
    })
}
const searchOpen = ref(false)
const query = ref('')
const showContacts = ref(false)
const contactQuery = ref('')
const friendSearchOpen = ref(false)
const friendQuery = ref('')
const selectedFriend = ref(null)
const friendIds = ref({})
const contacts = ref([])
const tabs = ['聊天', '朋友圈', '我的']
const sections = ref([{ title: '我的人物', open: true, chats: [] }])
const recentChats = computed(() => sections.value.flatMap((section) => section.chats).slice(0, 8))
const filteredSections = computed(() => sections.value.map((section) => ({ ...section, chats: section.chats.filter((chat) => `${chat.name} ${chatRemark(chat.id)}`.toLowerCase().includes(query.value.trim().toLowerCase())) })).filter((section) => section.chats.length))
const filteredContacts = computed(() => contacts.value.filter((person) => person.name.toLowerCase().includes(contactQuery.value.trim().toLowerCase())))
const friendSearchResults = computed(() => {
  const term = friendQuery.value.trim().toLowerCase()
  return term ? contacts.value.filter((person) => person.name.toLowerCase().includes(term)) : []
})
function virtualAccountId(person) {
  return person.accountId || `jy_${String(person.id || person.name).replace(/[^a-zA-Z0-9]/g, '').slice(-5).toLowerCase().padStart(5, '0')}`
}

onMounted(async () => {
  const [savedCharacters, savedChats, savedChatConfig, savedMessages, savedPreferences, savedCharacterSettings, savedMoments, savedMomentSettings] = await Promise.all([loadValue('jyos_characters'), loadValue('jyos_chat_contacts'), loadValue('jyos_chat_config'), loadValue('jyos_chat_messages'), loadValue('jyos_chat_preferences'), loadValue('jyos_character_chat_settings'), loadValue('jyos_moments'), loadValue('jyos_moments_settings')])
  if (savedMomentSettings && typeof savedMomentSettings === 'object') {
    momentsSettings.value = { ...momentsSettings.value, ...savedMomentSettings }
  }
  momentsSettings.value.maxParticipants = Math.max(1, Math.min(8, Number(momentsSettings.value.maxParticipants) || 3))
  momentsSettings.value.interactionIntervalMinutes = Math.max(1, Math.min(1440, Number(momentsSettings.value.interactionIntervalMinutes) || 2))
  loadMomentsAutoLastRun()
  loadMomentsInteractionLastRun()
  momentsSettingsReady.value = true
  momentsCover.value = savedMoments?.cover || ''
  momentsPosts.value = Array.isArray(savedMoments?.posts) ? savedMoments.posts.map((post) => ({
    ...post,
    authorType: post.authorType || 'user',
    authorId: post.authorId || 'user',
    likes: Array.isArray(post.likes) ? post.likes : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
  })) : []
  const draft = savedMoments?.draft
  if (draft && typeof draft === 'object') {
    momentsDraft.value = typeof draft.text === 'string' ? draft.text : ''
    momentsImageDraft.value = typeof draft.image === 'string' ? draft.image : ''
    momentsVisibility.value = draft.visibility || '公开'
    momentsMention.value = draft.mention || ''
    momentsLocation.value = draft.location || ''
    momentsExcluded.value = draft.excluded || ''
    momentsVisibleFriends.value = Array.isArray(draft.visibleFriends) ? draft.visibleFriends : []
    momentsDraftSaved.value = true
  }
  if (savedMoments?.cover) momentsCoverLoaded.value = true
  momentsStorageReady.value = true
  const savedMemory = await loadValue('jyos_retained_chat_memory')
  retainedChatMemory.value = savedMemory && typeof savedMemory === 'object' ? savedMemory : {}
  characterChatSettings.value = savedCharacterSettings && typeof savedCharacterSettings === 'object' ? savedCharacterSettings : {}
  if (savedPreferences && typeof savedPreferences === 'object') {
    enterToSend.value = savedPreferences.enterToSend === true
    replyImmediately.value = savedPreferences.replyImmediately === true
    sendSoundEnabled.value = savedPreferences.sendSoundEnabled !== false
    receiveSoundEnabled.value = savedPreferences.receiveSoundEnabled !== false
  }
  chatPreferencesReady.value = true
  contacts.value = Array.isArray(savedCharacters) ? savedCharacters.filter((person) => person.name?.trim()) : []
  chatMessages.value = savedMessages && typeof savedMessages === 'object' && !Array.isArray(savedMessages) ? savedMessages : {}
  chatHistoryReady.value = true
  if (savedChatConfig && typeof savedChatConfig === 'object') {
    chatConfig.value = {
      preset: {
        ...cloneConfig(defaultChatPreset),
        temperature: Number.isFinite(Number(savedChatConfig.preset?.temperature)) ? Math.max(0, Math.min(2, Number(savedChatConfig.preset.temperature))) : 1,
        top_k: Number.isFinite(Number(savedChatConfig.preset?.top_k)) ? Math.max(0, Math.round(Number(savedChatConfig.preset.top_k))) : 0,
        top_p: Number.isFinite(Number(savedChatConfig.preset?.top_p)) ? Math.max(0, Math.min(1, Number(savedChatConfig.preset.top_p))) : 0,
        thinkingIntensity: ['low', 'medium', 'high'].includes(savedChatConfig.preset?.thinkingIntensity) ? savedChatConfig.preset.thinkingIntensity : 'medium',
        name: savedChatConfig.preset?.name === 'JY 温柔日常' ? '默认预设' : (savedChatConfig.preset?.name || '默认预设'),
        entries: Array.isArray(savedChatConfig.preset?.entries)
          ? (() => {
              const savedEntries = savedChatConfig.preset.entries
              const savedById = new Map(savedEntries.map((entry) => [entry.id, entry]))
              const removedDefaultEntryIds = new Set(['alive-plus-plus', 'natural-message-segmentation', 'internet-meme-lore', 'chat-natural-flow', 'everyday-natural-replies', 'anti-vintage-ceo-romance', 'grounded-attractive-voice', 'modern-conversational-voice', 'distinctive-character-voice', 'anti-cliche-character-expression', 'behavior-guidelines', 'expression-freedom-protection'])
              const customEntries = savedEntries.filter((entry) => !defaultChatPreset.entries.some((defaultEntry) => defaultEntry.id === entry.id) && !removedDefaultEntryIds.has(entry.id) && !['scenario', 'continuity', 'style', 'format', 'example', 'after'].includes(entry.id))
              return [
                ...cloneConfig(defaultChatPreset.entries).map((entry) => {
                  const saved = savedById.get(entry.id)
                  if (!saved) return entry
                  const savedContent = (saved.content ?? entry.content).replace(/\n*【日常回复长度与条数】日常聊天必须简短、生活化、碎片化；一次通常发送 1 到 4 条独立短消息，每条不超过 20 个汉字。不要为了凑条数而拆句。只有讲述重要经历、解释复杂问题、表达完整情绪或其他确有需要的特定情景，才可以发送更多消息或较长内容。$/g, '')
                  return { ...entry, name: saved.name ?? entry.name, content: savedContent, enabled: saved.enabled ?? entry.enabled }
                }),
                ...customEntries,
              ]
            })()
          : cloneConfig(defaultChatPreset.entries),
      },
      profileId: typeof savedChatConfig.profileId === 'string' ? savedChatConfig.profileId : (Object.values(savedChatConfig.assignments || {}).find((id) => typeof id === 'string' && id) || ''),
      assignments: {},
    }
  }
  const selectedIds = Array.isArray(savedChats) ? savedChats : []
  sections.value[0].chats = contacts.value.filter((person) => selectedIds.includes(person.id)).map((person) => ({
    id: person.id,
    name: person.name,
    subtitle: person.details?.trim() || person.occupation || '开始一段新的对话',
    time: '', unread: 0, color: person.color || '#dededb', avatar: person.avatar || person.name.slice(0, 1),
    avatarImage: person.avatar || '',
  }))
  momentsAutoLastRun = 0
  loadMomentsAutoLastRun()
  momentsAutoTimer = setInterval(checkMomentsAutoGeneration, 15_000)
  document.addEventListener('visibilitychange', checkMomentsAutoGeneration)
  window.addEventListener('pageshow', checkMomentsAutoGeneration)
  checkMomentsAutoGeneration()
})

watch(() => sections.value[0].chats.map((chat) => chat.id), (ids) => saveValue('jyos_chat_contacts', ids))
watch([enterToSend, replyImmediately, sendSoundEnabled, receiveSoundEnabled], ([enter, immediate, sendSound, receiveSound]) => {
  if (chatPreferencesReady.value) saveValue('jyos_chat_preferences', { enterToSend: enter, replyImmediately: immediate, sendSoundEnabled: sendSound, receiveSoundEnabled: receiveSound })
})
watch(characterChatSettings, (settings) => {
  if (chatPreferencesReady.value) saveValue('jyos_character_chat_settings', JSON.parse(JSON.stringify(settings)))
}, { deep: true })
watch(chatConfig, (value) => saveValue('jyos_chat_config', JSON.parse(JSON.stringify(value))), { deep: true })
watch([momentsCover, momentsPosts], ([cover, posts]) => {
  if (momentsStorageReady.value) void saveValue('jyos_moments', { cover, posts: JSON.parse(JSON.stringify(posts)), draft: { text: momentsDraft.value, image: momentsImageDraft.value, visibility: momentsVisibility.value, visibleFriends: JSON.parse(JSON.stringify(momentsVisibleFriends.value)), mention: momentsMention.value, location: momentsLocation.value, excluded: momentsExcluded.value } })
}, { deep: true })
watch(momentsSettings, (settings) => {
  if (momentsSettingsReady.value) {
    void saveValue('jyos_moments_settings', settings)
    if (!settings.enabled || !settings.autoGenerate || (!settings.characterPosts && !settings.characterInteractions && !settings.fictionalVisitors)) momentsGenerationController.value?.abort()
  }
}, { deep: true })
watch([momentsDraft, momentsImageDraft, momentsVisibility, momentsMention, momentsLocation, momentsExcluded, momentsVisibleFriends], () => {
  if (momentsStorageReady.value) void saveValue('jyos_moments', { cover: momentsCover.value, posts: momentsPosts.value, draft: { text: momentsDraft.value, image: momentsImageDraft.value, visibility: momentsVisibility.value, visibleFriends: momentsVisibleFriends.value, mention: momentsMention.value, location: momentsLocation.value, excluded: momentsExcluded.value } })
})
async function saveMomentDraft() {
  const draftData = {
    cover: momentsCover.value,
    posts: JSON.parse(JSON.stringify(momentsPosts.value)),
    draft: { text: momentsDraft.value, image: momentsImageDraft.value, visibility: momentsVisibility.value, visibleFriends: [...momentsVisibleFriends.value], mention: momentsMention.value, location: momentsLocation.value, excluded: momentsExcluded.value }
  }
  if (!momentsStorageReady.value) {
    showToast('数据还在加载，请稍后再试')
    return
  }
  try {
    await saveValue('jyos_moments', draftData)
    momentsDraftSaved.value = true
    momentsComposerOpen.value = false
    showToast('已保存为草稿')
  } catch {
    showToast('草稿保存失败，请重试')
  }
}
function openMomentFriendPicker(field) {
  momentsFriendPicker.value = field
  const current = field === 'mention' ? momentsMention.value : field === 'excluded' ? momentsExcluded.value : ''
  momentsFriendSelection.value = field === 'visible' ? [...momentsVisibleFriends.value] : (current ? current.split(',').map((name) => name.trim()).filter(Boolean) : [])
  momentsVisibilitySheet.value = true
}
function confirmMomentFriendPicker() {
  const value = [...new Set(momentsFriendSelection.value)]
  if (momentsFriendPicker.value === 'mention') momentsMention.value = value.join(', ')
  else if (momentsFriendPicker.value === 'excluded') momentsExcluded.value = value.join(', ')
  else {
    momentsVisibleFriends.value = value
    momentsVisibility.value = value.length ? '部分好友可见' : '选择部分好友'
  }
  momentsFriendPicker.value = ''
  momentsVisibilitySheet.value = false
}
function openMomentLocation() {
  momentsLocationDialog.value = true
  momentsLocationMode.value = ''
}
function cancelMomentFriendPicker() {
  momentsFriendPicker.value = ''
  momentsVisibilitySheet.value = false
  momentsFriendSelection.value = []
}
function chooseMomentVisibility(value) {
  if (value === '部分好友可见') {
    momentsVisibilitySheet.value = false
    openMomentFriendPicker('visible')
    return
  }
  momentsVisibility.value = value
  momentsVisibleFriends.value = []
  momentsVisibilitySheet.value = false
}
async function searchMomentLocation() {
  const query = momentsLocationQuery.value.trim()
  if (!query) return
  momentsLocationBusy.value = true
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`)
    const results = await response.json()
    momentsLocationResults.value = Array.isArray(results) ? results : []
  } catch { showToast('地址搜索暂时不可用，请稍后重试') }
  finally { momentsLocationBusy.value = false }
}
async function locateMomentAddress() {
  if (!navigator.geolocation) { showToast('当前设备不支持定位'); return }
  momentsLocationBusy.value = true
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${coords.latitude}&lon=${coords.longitude}`)
      const result = await response.json()
      momentsLocationResults.value = result?.display_name ? [result] : []
      if (!result?.display_name) showToast('没有获取到详细地址，请搜索地址')
    } catch { showToast('定位成功，但详细地址查询失败') }
    finally { momentsLocationBusy.value = false }
  }, () => { momentsLocationBusy.value = false; showToast('无法获取位置，请检查定位权限') }, { enableHighAccuracy: true, timeout: 12000 })
}
function selectMomentLocation(result) {
  momentsLocation.value = result.display_name || ''
  momentsLocationDialog.value = false
  momentsLocationMode.value = ''
}
function openMomentComposer() {
  momentsEditingPostId.value = ''
  if (!momentsDraftSaved.value) {
    momentsDraft.value = ''
    momentsImageDraft.value = ''
    momentsVisibility.value = '公开'
    momentsVisibleFriends.value = []
    momentsMention.value = ''
    momentsLocation.value = ''
    momentsExcluded.value = ''
  }
  momentsComposerOpen.value = true
  momentsDraftSaved.value = false
}
function editMoment(post) {
  if (post.authorType !== 'user') return
  momentsEditingPostId.value = post.id
  momentsDraft.value = post.text || ''
  momentsImageDraft.value = post.image || ''
  momentsVisibility.value = post.visibility || '公开'
  momentsVisibleFriends.value = [...(post.visibleFriends || [])]
  momentsMention.value = (post.mention || []).join(', ')
  momentsLocation.value = post.location || ''
  momentsExcluded.value = (post.excluded || []).join(', ')
  momentsComposerOpen.value = true
  momentsDraftSaved.value = false
}
function deleteMoment(post) {
  if (!['user', 'character'].includes(post.authorType)) return
  if (post.authorType === 'character' && !window.confirm(`确定删除「${post.authorName || '角色'}」发布的这条动态吗？`)) return
  momentsPosts.value = momentsPosts.value.filter((item) => item.id !== post.id)
  showToast('动态已删除')
}
function closeMomentComposer() { momentsComposerOpen.value = false }
function chooseMomentsCover() { momentsCoverInput.value?.click() }
function readMomentsImage(event, kind) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) { showToast('请选择图片文件'); return }
  if (file.size > 12 * 1024 * 1024) { showToast('图片不能超过 12 MB'); return }
  const reader = new FileReader()
  reader.onload = () => {
    if (kind === 'cover') momentsCover.value = String(reader.result || '')
    else momentsImageDraft.value = String(reader.result || '')
  }
  reader.onerror = () => showToast('图片读取失败，请重试')
  reader.readAsDataURL(file)
}
function publishMoment() {
  const mentionNames = momentsMention.value.split(',').map((name) => name.trim()).filter(Boolean)
  const mentionText = mentionNames.map((name) => `@${name}`)
  const bodyText = momentsDraft.value.trim()
  const text = [bodyText, ...mentionText.filter((tag) => !bodyText.includes(tag))].filter(Boolean).join(' ')
  if (!bodyText && !momentsImageDraft.value) { showToast('请先填写内容或添加图片'); return }
  const visibleFriends = [...momentsVisibleFriends.value]
  const excludedFriends = momentsExcluded.value.split(',').map((name) => name.trim()).filter(Boolean)
  const postData = { text, image: momentsImageDraft.value, visibility: momentsVisibility.value, visibleFriends, mention: mentionNames, excluded: excludedFriends, location: momentsLocation.value.trim() }
  const editingPost = momentsPosts.value.find((post) => post.id === momentsEditingPostId.value)
  if (editingPost) {
    Object.assign(editingPost, postData)
    editingPost.time = momentTime()
  } else {
    momentsPosts.value.unshift({ id: momentId(), authorType: 'user', authorId: chatConfig.value.profileId || 'user', authorName: activeUserPersona.value?.name || userProfile.name || '我', authorAvatar: activeUserPersona.value?.avatar || userProfile.avatar || '', source: 'manual', ...postData, createdAt: Date.now(), time: momentTime(), likes: [], comments: [] })
  }
  momentsEditingPostId.value = ''
  momentsDraft.value = ''
  momentsImageDraft.value = ''
  momentsVisibility.value = '公开'
  momentsVisibleFriends.value = []
  momentsMention.value = ''
  momentsLocation.value = ''
  momentsLocationQuery.value = ''
  momentsLocationResults.value = []
  momentsExcluded.value = ''
  momentsDraftSaved.value = false
  momentsComposerOpen.value = false
  showToast(editingPost ? '动态已保存' : '动态已发表')
}

function momentId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` }
function momentTime(timestamp = Date.now()) { return new Date(timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
function toggleMomentLike(post) {
  if (!momentsSettings.value.enabled) return
  const id = chatConfig.value.profileId || 'user'
  const likes = Array.isArray(post.likes) ? [...post.likes] : []
  post.likes = likes.includes(id) ? likes.filter((like) => like !== id) : [...likes, id]
}
function addMomentComment(post, replyTo = null) {
  if (!momentsSettings.value.enabled) return
  const key = `${post.id}:${replyTo || ''}`
  const text = String(momentsCommentDrafts.value[key] || '').trim()
  if (!text) return
  const author = activeUserPersona.value || userProfile
  const comment = { id: momentId(), authorType: 'user', authorId: chatConfig.value.profileId || 'user', authorName: author.name || '我', authorAvatar: author.avatar || '', text: text.slice(0, 1000), createdAt: Date.now(), time: momentTime(), replyTo: replyTo || null }
  post.comments = [...(Array.isArray(post.comments) ? post.comments : []), comment]
  momentsCommentDrafts.value[key] = ''
  momentsReplyTargets.value[post.id] = ''
  momentsCommentDialogPostId.value = ''
}
function visibleToCharacter(post, character) {
  if (!character?.name || (post.authorType === 'character' && post.authorId === character.id)) return false
  if (post.excluded?.includes(character.name) || post.visibility === '私密') return false
  if (post.visibility === '部分好友可见' && !post.visibleFriends?.includes(character.name)) return false
  return true
}
function establishedRelation(a, b) {
  if (!a || !b || a.id === b.id) return false
  return [a.relationship, a.relation, a.relationshipStatus, a.relations?.[b.id], b.relations?.[a.id]].some((value) => typeof value === 'string' && /认识|朋友|熟悉|亲密|同事|家人|恋人|伴侣|friend|close|family|partner/i.test(value))
}
function setFictionalVisitorsEnabled(enabled) {
  if (enabled && !momentsSettings.value.fictionalVisitors) {
    fictionalVisitorsConfirmOpen.value = true
    return
  }
  momentsSettings.value.fictionalVisitors = false
}
function confirmFictionalVisitors() {
  momentsSettings.value.fictionalVisitors = true
  fictionalVisitorsConfirmOpen.value = false
}
function cancelFictionalVisitors() { fictionalVisitorsConfirmOpen.value = false }
function parseMomentGeneration(content) {
  const clean = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('生成结果不是有效 JSON。')
  const parsed = JSON.parse(clean.slice(start, end + 1))
  if (!Array.isArray(parsed.items)) throw new Error('生成结果缺少 items 数组。')
  return parsed.items.slice(0, 4).map((item) => ({ characterId: String(item.characterId || ''), kind: ['post', 'comment', 'reply'].includes(item.kind) ? item.kind : '', text: typeof item.text === 'string' ? item.text.trim().slice(0, 500) : '', postId: String(item.postId || ''), replyTo: item.replyTo == null ? null : String(item.replyTo), authorName: typeof item.authorName === 'string' ? item.authorName.trim().slice(0, 32) : '' })).filter((item) => item.characterId && item.kind && item.text)
}
async function generateMomentActivity({ automatic = false, includePosts = momentsSettings.value.characterPosts, includeInteractions = momentsSettings.value.characterInteractions || momentsSettings.value.fictionalVisitors } = {}) {
  if (momentsGeneratingPosts.value || !momentsSettings.value.enabled || (!momentsSettings.value.characterPosts && !momentsSettings.value.characterInteractions && !momentsSettings.value.fictionalVisitors)) return
  const mentionedNames = new Set(momentsPosts.value.flatMap((post) => Array.isArray(post.mention) ? post.mention : []))
  const mentionedCandidates = contacts.value.filter((character) => mentionedNames.has(character.name))
  const candidates = includePosts && momentsSettings.value.characterPosts
    ? [...contacts.value]
    : [...new Map([...mentionedCandidates, ...contacts.value.filter((character) => !mentionedNames.has(character.name)).sort(() => Math.random() - 0.5).slice(0, limit)].map((character) => [character.id, character])).values()]
  const visitorsEnabled = includeInteractions && momentsSettings.value.fictionalVisitors
  const visitorCandidates = visitorsEnabled ? Array.from({ length: 4 }, (_, index) => ({ id: `visitor-${index + 1}`, name: `访客${index + 1}`, profile: '普通朋友圈访客；姓名、职业、性格和表达方式须从动态语境自然推断，不使用模板化网名或刻板角色标签。' })) : []
  const allCandidates = [...candidates.map((character) => ({ id: character.id, name: character.name, profile: characterToText(character) })), ...visitorCandidates]
  const posts = momentsPosts.value.filter((post) => post.visibility !== '私密' && !post.excluded?.length && (post.visibility !== '部分好友可见' || (post.visibleFriends || []).some((name) => candidates.some((character) => character.name === name))) && (post.authorType !== 'character' || candidates.some((character) => visibleToCharacter(post, character)) || visitorsEnabled)).slice(0, 8)
  if (!allCandidates.length || ((!momentsSettings.value.characterPosts && !momentsSettings.value.characterInteractions && !visitorsEnabled) || (!momentsSettings.value.characterPosts && !posts.length))) { if (!automatic) showToast('目前没有符合可见范围和关系条件的动态'); return }
  const preset = getCurrentPreset()
  if (!preset?.baseUrl?.trim() || !preset?.model?.trim() || !preset?.apiKey?.trim()) { momentsGenerationError.value = '请先配置 API 地址、模型和 API Key。'; return }
  if (!automatic && !window.confirm('将使用当前 API 预设生成最多 4 条朋友圈内容，可能产生费用。是否继续？')) return
  const controller = new AbortController()
  momentsGenerationController.value = controller
  momentsGeneratingPosts.value = true
  momentsGenerationError.value = ''
  try {
    const eligible = allCandidates
    const visitorRules = '访客仅可对公开动态互动；不得看到、评论或回复私密/部分好友动态，或被排除的动态。访客使用持久化稳定的匿名访客 ID，姓名应为普通、自然且彼此有区别的真实姓名或普通网名，禁止萌妹小林、木头程序员阿半等标签式模板人设。根据动态语境生成稀疏、各有表达习惯的访客，不要批量凑齐类型；可沉默、随手点赞或留一句具体评论。'
    const context = { candidates: eligible, visitorsEnabled, visitorRules: visitorsEnabled ? visitorRules : '', posts: posts.map((post) => ({ id: post.id, authorType: post.authorType, authorId: post.authorId, author: post.authorName, text: post.text, visibility: post.visibility, mention: Array.isArray(post.mention) ? post.mention : [], comments: (post.comments || []).map((comment) => ({ id: comment.id, authorType: comment.authorType, authorId: comment.authorId, author: comment.authorName, text: comment.text, replyTo: comment.replyTo || null })) })), enablePosts: includePosts && momentsSettings.value.characterPosts, enableComments: includeInteractions && (momentsSettings.value.characterInteractions || visitorsEnabled), requiredMentionInteractions: posts.flatMap((post) => (Array.isArray(post.mention) ? post.mention : []).filter((name) => candidates.some((character) => character.name === name)).map((name) => ({ postId: post.id, characterId: candidates.find((character) => character.name === name)?.id, characterName: name, requirement: '必须在该动态下评论，且至少回复用户在该动态下的一条评论；若用户尚未评论，先发评论并等待用户回复，再在后续生成时回复。' }))), knownRelations: candidates.flatMap((a) => candidates.filter((b) => establishedRelation(a, b)).map((b) => [a.id, b.id])) }
    const requireMentionInteractions = context.requiredMentionInteractions.length > 0
    const systemPrompt = includePosts && momentsSettings.value.characterPosts && !requireMentionInteractions
      ? '定时自动发布朋友圈动态。必须且只需至少生成1条角色动态，最多4条，items不能为空。角色只能从给定角色列表中选，characterId必须原样照抄列表中的id。资料有限时写普通、轻量的日常状态或感受，不得因缺少自然动机而不发；不得编造具体地点、经历、共同记忆或私密事实。动态用kind=post，postId为空字符串，replyTo为null，text不超过200字。只输出JSON：{"items":[{"characterId":"原样复制的角色id","kind":"post","postId":"","replyTo":null,"text":"动态正文"}]}。'
      : '根据给定角色与访客资料及朋友圈上下文生成互动。访客仅可互动公开动态；角色关系和动态可见范围必须遵守。requiredMentionInteractions 中列出的被提醒角色必须优先对对应动态发表评论；若该动态已有用户的一级评论，还必须至少回复其中一条用户评论，replyTo 精确引用评论 ID；若用户尚未评论，则先评论动态，之后用户评论时在后续生成中回复。不得因没有自然动机而跳过被提醒角色；其他角色仍可保持沉默。评论用kind=comment，回复用kind=reply。只输出JSON：{"items":[]}。'
    const response = await fetch(`${preset.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` }, body: JSON.stringify({ model: preset.model, temperature: Number.isFinite(Number(chatConfig.value.preset.temperature)) ? Number(chatConfig.value.preset.temperature) : 1, stream: false, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: JSON.stringify(context) }] }) })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error?.message || `API 请求失败（${response.status}）`)
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('API 返回内容为空。')
    const allowedIds = new Set(allCandidates.map((item) => item.id))
    const duplicatePosts = new Set(momentsPosts.value.filter((post) => post.authorType === 'character').map((post) => `${post.authorId}:${post.text}`))
    const visitorNames = new Map()
    const rejectedReasons = new Set()
    const parsedItems = parseMomentGeneration(content)
    const valid = includePosts && momentsSettings.value.characterPosts
      ? parsedItems.map((item) => {
          const character = contacts.value.find((person) => person.id === item.characterId) || candidates[0]
          return { ...item, characterId: character?.id || '', kind: 'post', postId: '', replyTo: null }
        }).filter((item) => {
          if (!item.characterId || !item.text) { rejectedReasons.add('没有可用于发布动态的角色或正文'); return false }
          if (item.text.length > 200) { rejectedReasons.add('内容超过 200 字'); return false }
          if (duplicatePosts.has(`${item.characterId}:${item.text}`)) { rejectedReasons.add('与该角色已有动态完全重复'); return false }
          return true
        })
      : parsedItems.filter((item) => {
      if (!allowedIds.has(item.characterId)) { rejectedReasons.add('返回的角色 ID 不在本次候选角色中'); return false }
      if (item.text.length > 200) { rejectedReasons.add('内容超过 200 字'); return false }
      const character = allCandidates.find((candidate) => candidate.id === item.characterId)
      const isVisitor = item.characterId.startsWith('visitor-')
      if (isVisitor && (!visitorsEnabled || !['comment', 'reply'].includes(item.kind) || !item.authorName)) { rejectedReasons.add('访客内容不符合访客互动规则'); return false }
      if (isVisitor) visitorNames.set(item.characterId, item.authorName)
      if (item.kind === 'post') {
        if (isVisitor || !momentsSettings.value.characterPosts || item.postId || item.replyTo !== null || duplicatePosts.has(`${item.characterId}:${item.text}`)) {
          rejectedReasons.add(isVisitor ? '访客不能发布动态' : !momentsSettings.value.characterPosts ? '角色发动态开关未开启' : duplicatePosts.has(`${item.characterId}:${item.text}`) ? '与该角色已有动态完全重复' : '动态字段格式不正确')
          return false
        }
        return true
      }
      if (!isVisitor && !includeInteractions) { rejectedReasons.add('本轮未到角色互动生成间隔'); return false }
      if (!isVisitor && !momentsSettings.value.characterInteractions && !context.requiredMentionInteractions.some((required) => required.characterId === item.characterId && required.postId === item.postId)) { rejectedReasons.add('角色互动开关未开启'); return false }
      const post = posts.find((entry) => entry.id === item.postId)
      if (!post || (isVisitor && (post.visibility !== '公开' || post.excluded?.length || post.visibility === '部分好友可见')) || (!isVisitor && !visibleToCharacter(post, character))) { rejectedReasons.add('互动目标不存在或对该角色不可见'); return false }
      const author = contacts.value.find((person) => person.id === post.authorId)
      if (!isVisitor && post.authorType === 'character' && (!author || !establishedRelation(character, author))) { rejectedReasons.add('角色之间没有已建立的关系'); return false }
      const comments = Array.isArray(post.comments) ? post.comments : []
      if (item.kind === 'comment') {
        if (item.replyTo !== null || comments.some((comment) => comment.authorId === item.characterId && !comment.replyTo) || comments.some((comment) => comment.authorId === item.characterId && comment.text.trim() === item.text)) { rejectedReasons.add('评论字段不正确或评论重复'); return false }
        return true
      }
      const target = comments.find((comment) => comment.id === item.replyTo && !comment.replyTo)
      if (!(target && target.authorId !== item.characterId && !comments.some((comment) => comment.replyTo === target.id && comment.authorId === item.characterId) && !comments.some((comment) => comment.authorId === item.characterId && comment.text.trim() === item.text))) { rejectedReasons.add('回复目标无效、不可见或回复重复'); return false }
      return true
    })
    if (!valid.length) {
      if (automatic) momentsGenerationError.value = parsedItems.length === 0
        ? '自动生成失败：模型没有返回动态正文，请检查 API 返回内容或稍后重试。'
        : `自动生成失败：${[...rejectedReasons].join('；') || '没有可发布的动态'}。`
      else showToast('本次没有生成朋友圈内容')
      return
    }
    for (const item of valid) {
      const isVisitor = typeof item.characterId === 'string' && item.characterId.startsWith('visitor-')
      const character = isVisitor ? null : contacts.value.find((person) => person.id === item.characterId)
      if (!character && !isVisitor) continue
      if (item.kind === 'post') momentsPosts.value.unshift({ id: momentId(), authorType: 'character', authorId: character.id, authorName: character.name, authorAvatar: character.avatar || '', source: 'ai', text: item.text, visibility: '公开', createdAt: Date.now(), time: momentTime(), likes: [], comments: [] })
      else {
        const post = momentsPosts.value.find((entry) => entry.id === item.postId)
        if (!post) continue
        post.comments = Array.isArray(post.comments) ? post.comments : []
        if (item.kind === 'reply') {
          const target = post.comments.find((comment) => comment.id === item.replyTo && !comment.replyTo)
          if (!target || post.comments.some((comment) => comment.replyTo === target.id && comment.authorId === character.id)) continue
        }
        post.comments.push({ id: momentId(), authorType: isVisitor ? 'visitor' : 'character', authorId: isVisitor ? item.characterId : character.id, authorName: isVisitor ? (visitorNames.get(item.characterId) || item.authorName) : character.name, text: item.text, createdAt: Date.now(), time: momentTime(), replyTo: item.kind === 'reply' ? item.replyTo : null })
      }
    }
    if (!automatic) showToast(`已生成 ${valid.length} 条朋友圈内容`)
  } catch (error) {
    if (error.name !== 'AbortError') momentsGenerationError.value = error.message || '生成失败，请重试。'
  } finally {
    momentsGeneratingPosts.value = false
    momentsGenerationController.value = null
  }
}
function openChatConfig() {
  configPersonId.value = contacts.value[0]?.id || ''
  chatConfigOpen.value = true
}

const personaBindingPairs = computed(() => contacts.value.map((character) => ({
  character,
  profile: profileSettings.profiles.find((profile) => profile.id === chatConfig.value.profileId) || userProfile,
})))
const activeBindingPair = computed(() => personaBindingPairs.value[personaBindingIndex.value] || null)
function openPersonaBinding() {
  personaBindingIndex.value = 0
  personaBindingOpen.value = true
}
function changePersonaBinding(direction) {
  if (personaBindingPairs.value.length < 2 || personaBindingTransition.value) return
  personaBindingTransition.value = true
  setTimeout(() => {
    personaBindingIndex.value = (personaBindingIndex.value + direction + personaBindingPairs.value.length) % personaBindingPairs.value.length
    personaBindingTransition.value = false
  }, 220)
}
function assignPersona(_personId, profileId) {
  chatConfig.value.profileId = profileId
}

function editChatPreset() {
  presetDraft.value = cloneConfig(chatConfig.value.preset)
}

function addPresetEntry() {
  presetDraft.value.entries.push({ id: `entry-${Date.now()}`, name: '新条目', enabled: true, content: '' })
}

function removePresetEntry(index) {
  presetDraft.value.entries.splice(index, 1)
}

function movePresetEntry(index, offset) {
  const next = index + offset
  if (next < 0 || next >= presetDraft.value.entries.length) return
  const [entry] = presetDraft.value.entries.splice(index, 1)
  presetDraft.value.entries.splice(next, 0, entry)
}

function restorePresetEntry(index) {
  const entry = presetDraft.value.entries[index]
  const defaultEntry = defaultChatPreset.entries.find((item) => item.id === entry.id)
  if (!defaultEntry) return
  presetDraft.value.entries[index] = { ...cloneConfig(defaultEntry), enabled: entry.enabled }
}

function startPresetDrag(index, event) {
  if (event.type === 'pointerdown' && event.button !== 0) return
  clearTimeout(presetHoldTimer)
  draggingPresetIndex.value = -1
  presetHoldTimer = setTimeout(() => {
    draggingPresetIndex.value = index
    event.currentTarget?.setPointerCapture?.(event.pointerId)
    if (navigator.vibrate) navigator.vibrate(12)
  }, 350)
}

function trackPresetDrag(event) {
  if (draggingPresetIndex.value < 0) return
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.preset-setting-card')
  if (!target) return
  const cards = [...document.querySelectorAll('.preset-setting-card')]
  const targetIndex = cards.indexOf(target)
  if (targetIndex >= 0) movePresetDrag(targetIndex)
}

function movePresetDrag(index) {
  if (draggingPresetIndex.value < 0 || draggingPresetIndex.value === index) return
  const [entry] = presetDraft.value.entries.splice(draggingPresetIndex.value, 1)
  presetDraft.value.entries.splice(index, 0, entry)
  draggingPresetIndex.value = index
}

function stopPresetDrag() {
  clearTimeout(presetHoldTimer)
  draggingPresetIndex.value = -1
}

function openPresetDetail(index) {
  if (draggingPresetIndex.value >= 0) return
  presetDetailIndex.value = index
}

function closePresetDetail() {
  presetDetailIndex.value = -1
}

function savePreset() {
  const name = presetDraft.value.name.trim() || '我的聊天预设'
  chatConfig.value.preset = { ...presetDraft.value, name, entries: presetDraft.value.entries.map((entry) => ({ ...entry, name: entry.name.trim() || '未命名条目' })) }
  presetDraft.value = null
}

function openFriendSearch() {
  currentTab.value = '聊天'
  searchOpen.value = false
  query.value = ''
  friendQuery.value = ''
  selectedFriend.value = null
  friendSearchOpen.value = true
}

function addFriend(person) {
  friendIds.value[person.id] = virtualAccountId(person)
  if (!sections.value[0].chats.some((chat) => chat.id === person.id)) {
    addContact({ ...person, accountId: friendIds.value[person.id] })
  }
  selectedFriend.value = null
}

function addContact(person) {
  if (sections.value[0].chats.some((chat) => chat.id === person.id)) return
  sections.value[0].chats.push({ id: person.id, name: person.name, subtitle: person.details?.trim() || person.occupation || '开始一段新的对话', time: '', unread: 0, color: person.color || '#dededb', avatar: person.avatar || person.name.slice(0, 1), avatarImage: person.avatar || '' })
}

function removeContact(person) {
  sections.value[0].chats = sections.value[0].chats.filter((chat) => chat.id !== person.id)
}
</script>

<template>
  <div class="chat-app">
    <div v-if="replyNotices.length" class="reply-notice-stack" aria-live="polite" aria-label="新消息">
      <button v-for="(notice, index) in replyNotices" :key="notice.id" type="button" class="reply-notice" :style="{ '--stack-index': index }" :aria-label="`打开${chatDisplayName(notice.chat)}的聊天`" @click="openNoticeChat(notice)">
        <span class="notice-avatar" :class="{ 'avatar-placeholder': !notice.chat.avatarImage }" :style="{ '--avatar-color': notice.chat.color }"><img v-if="notice.chat.avatarImage" :src="notice.chat.avatarImage" alt="" /><span v-else></span></span>
        <span class="notice-copy"><strong>{{ chatDisplayName(notice.chat) }}</strong><span>{{ notice.text }}</span></span>
        <span class="notice-time">现在</span>
      </button>
    </div>
    <header class="topbar" :class="{ 'moments-topbar': currentTab === '朋友圈' }">
      <button class="back-button" aria-label="返回桌面" @click="emit('close')"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg></button>
      <div class="topbar-spacer" />
      <button class="round-action" aria-label="搜索人物" @click="openFriendSearch"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg></button>
    </header>

    <main class="chat-content">
      <template v-if="currentTab === '聊天'">
        <div class="welcome"><strong>Chat</strong></div>
        <div class="recent-chat-strip" aria-label="最近聊天联系人"><button v-for="chat in recentChats" :key="chat.id" type="button" class="recent-chat-avatar" :aria-label="`打开与${chat.name}的聊天`" @click="openChat(chat)"><span class="recent-chat-picture" :class="{ 'avatar-placeholder': !chat.avatarImage }" :style="{ '--avatar-color': chat.color, ...(chat.avatarImage ? { backgroundImage: `url(${chat.avatarImage})` } : {}) }">{{ chat.avatarImage ? '' : (chat.name || '对').slice(0, 1) }}</span><i v-if="chat.online" class="recent-online-dot" :aria-label="`${chat.name}在线`" /><span class="thinking-bubble" aria-hidden="true">Miss☁️</span></button></div>
        <label class="chat-list-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="query" type="search" placeholder="搜索联系人或聊天" aria-label="搜索联系人或聊天"/><button v-if="query" type="button" aria-label="清空搜索" @click="query = ''">×</button></label>
        <section v-for="section in filteredSections" :key="section.title" class="chat-section">
          <button class="section-toggle" type="button" :aria-expanded="section.open" @click="sections.find((item) => item.title === section.title).open = !section.open"><svg class="chevron" :class="{ folded: !sections.find((item) => item.title === section.title).open }" viewBox="0 0 20 20"><path d="m5 7 5 5 5-5"/></svg><span>{{ section.title }}</span><small>{{ section.chats.length }}</small><svg class="section-end" viewBox="0 0 20 20"><path d="m7 5 5 5-5 5"/></svg></button>
          <div v-if="sections.find((item) => item.title === section.title).open" class="chat-card">
            <button v-for="chat in section.chats" :key="chat.id" class="conversation" type="button" @click="openChat(chat)">
              <span class="avatar" :class="{ 'avatar-placeholder': !chat.avatarImage }" :style="{'--avatar-color':chat.color}"><img v-if="chat.avatarImage" :src="chat.avatarImage" :alt="`${chat.name}头像`"/><span v-else></span><i class="online-dot" aria-label="在线"/><i v-if="chat.group" class="group-mark">群</i></span>
              <span class="conversation-copy"><span class="conversation-top"><strong>{{ chatDisplayName(chat) }}</strong><time>{{ chat.time || '最近' }}</time></span><span class="conversation-bottom"><span>{{ chatLatestMessage(chat) }}</span><i v-if="chat.unread" class="unread-count">{{ chat.unread > 99 ? '99+' : chat.unread }}</i></span></span>
            </button>
          </div>
        </section>
        <div v-if="!filteredSections.length" class="no-results">{{ query ? '没有找到相关对话。' : '还没有添加人物。' }}</div>
      </template>
    <section v-else-if="currentTab === '朋友圈'" class="moments-page" :class="{ 'moments-disabled': !momentsSettings.enabled }">
        <input ref="momentsCoverInput" class="visually-hidden-input" type="file" accept="image/*" @change="readMomentsImage($event, 'cover')" />
        <div class="moments-cover" :style="momentsCover ? { backgroundImage: `linear-gradient(to bottom, transparent 58%, rgba(247,247,245,.24) 78%, #f7f7f5 100%), url(${momentsCover})` } : {}" @click="chooseMomentsCover">
          <span v-if="!momentsCover" class="moments-cover-hint">点击设置朋友圈封面</span>
          <div class="moments-profile"><button class="moments-avatar" type="button" aria-label="更换我的头像" @click.stop="avatarDialogOpen = true"><img v-if="activeUserAvatar" :src="activeUserAvatar" alt="我的头像"/><span v-else>{{ (activeUserPersona.name || '我').slice(0,1) }}</span></button><strong>{{ activeUserPersona.name || '我' }}</strong></div>
        </div>
        <div class="moments-feed"><button class="moments-write" type="button" @click="openMomentComposer">✎ <span>{{ momentsDraftSaved ? '继续编辑草稿' : '分享此刻' }}</span></button>
          <article v-for="post in momentsPosts" :key="post.id" class="moment-post"><div class="moment-avatar"><img v-if="(post.authorType === 'user' ? (activeUserPersona.avatar || userProfile.avatar) : post.authorAvatar)" :src="post.authorType === 'user' ? (activeUserPersona.avatar || userProfile.avatar) : post.authorAvatar" alt=""/><span v-else>{{ (post.authorName || activeUserPersona.name || '我').slice(0,1) }}</span></div><div class="moment-body"><strong>{{ post.authorName || activeUserPersona.name || '我' }}</strong><p v-if="post.text">{{ post.text }}</p><img v-if="post.image" class="moment-image" :src="post.image" alt="动态图片"/><small>{{ post.time }}</small><div v-if="post.authorType === 'user' || post.authorType === 'character'" class="moment-manage"><button v-if="post.authorType === 'user'" type="button" @click="editMoment(post)">编辑</button><button type="button" @click="deleteMoment(post)">删除</button></div><div class="moment-actions"><button class="moment-like-button" type="button" :disabled="!momentsSettings.enabled" @click="toggleMomentLike(post)"><span class="moment-heart" :class="{ liked: post.likes?.includes(chatConfig.profileId || 'user') }">♥</span>{{ post.likes?.length || 0 }}</button><button class="moment-comment-button" type="button" @click="momentsReplyTargets[post.id] = ''; momentsCommentDialogPostId = post.id">评论</button></div><div v-if="post.comments?.length" class="moment-comments"><div v-for="comment in post.comments" :key="comment.id" class="moment-comment"><span class="moment-comment-avatar"><img v-if="comment.authorType === 'user' ? (activeUserPersona.avatar || userProfile.avatar) : comment.authorType === 'character' ? contacts.find((person) => person.id === comment.authorId)?.avatar : ''" :src="comment.authorType === 'user' ? (activeUserPersona.avatar || userProfile.avatar) : contacts.find((person) => person.id === comment.authorId)?.avatar" alt=""/><span v-else>{{ (comment.authorName || '友').slice(0,1) }}</span></span><span class="moment-comment-copy"><strong>{{ comment.authorName || '访客' }}</strong><span><template v-if="comment.replyTo">回复 {{ post.comments.find((item) => item.id === comment.replyTo)?.authorName || '评论' }}：</template>{{ comment.text }}</span></span><button v-if="!comment.replyTo" type="button" @click="momentsReplyTargets[post.id] = comment.id; momentsCommentDialogPostId = post.id">回复</button></div></div></div></article>
          <p v-if="!momentsPosts.length" class="moments-empty">记录生活里的小事，让此刻留有回响。</p>
        </div>
        <div v-if="momentsCommentDialogPostId && momentsSettings.enabled" class="moment-comment-dialog-backdrop" @click.self="momentsCommentDialogPostId = ''"><section class="moment-comment-dialog" role="dialog" aria-modal="true" aria-label="写评论"><header><strong>{{ momentsReplyTargets[momentsCommentDialogPostId] ? '回复评论' : '写评论' }}</strong><button type="button" aria-label="关闭" @click="momentsCommentDialogPostId = ''">×</button></header><form class="moment-comment-dialog-form" @submit.prevent="addMomentComment(momentsPosts.find((post) => post.id === momentsCommentDialogPostId), momentsReplyTargets[momentsCommentDialogPostId] || null)"><textarea v-model="momentsCommentDrafts[`${momentsCommentDialogPostId}:${momentsReplyTargets[momentsCommentDialogPostId] || ''}`]" maxlength="1000" autofocus :placeholder="momentsReplyTargets[momentsCommentDialogPostId] ? '回复这条评论…' : '写下你的评论…'"></textarea><button type="submit" :disabled="!momentsCommentDrafts[`${momentsCommentDialogPostId}:${momentsReplyTargets[momentsCommentDialogPostId] || ''}`]?.trim()">发送</button></form></section></div>
        <div v-if="momentsComposerOpen" class="moment-composer-backdrop" @click.self="closeMomentComposer"><section class="moment-composer"><header><button type="button" @click.stop.prevent="saveMomentDraft">存草稿</button><strong>{{ momentsEditingPostId ? '编辑动态' : '发表动态' }}</strong><button type="button" class="moment-publish" :disabled="!momentsDraft.trim() && !momentsImageDraft" @click="publishMoment">{{ momentsEditingPostId ? '保存' : '发表' }}</button></header><textarea v-model="momentsDraft" autofocus placeholder="这一刻的想法…"/><div class="moment-composer-tools"><button v-if="!momentsImageDraft" type="button" class="moment-add-image" aria-label="添加图片" @click="momentsImageInput?.click()"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 3-4 5 6"/></svg></button><div v-else class="moment-image-preview"><img :src="momentsImageDraft" alt="待发布图片"/><button type="button" aria-label="移除图片" @click="momentsImageDraft = ''">×</button></div><span class="moment-tool-hint">添加图片</span></div><input ref="momentsImageInput" class="visually-hidden-input" type="file" accept="image/*" @change="readMomentsImage($event, 'post')"/><div class="moment-options"><button class="moment-option" type="button" @click="momentsVisibilitySheet = true"><span class="moment-option-icon">◉</span><span>谁可以看</span><small>{{ momentsVisibility.startsWith('部分好友') ? momentsVisibility : momentsVisibility }}</small><b>›</b></button><button class="moment-option" type="button" @click="openMomentFriendPicker('mention')"><span class="moment-option-icon">@</span><span>提醒谁看</span><small>{{ momentsMention || '选择联系人' }}</small><b>›</b></button><button class="moment-option" type="button" @click="openMomentLocation"><span class="moment-option-icon">⌖</span><span>所在位置</span><small>{{ momentsLocation || '添加位置' }}</small><b>›</b></button><button class="moment-option" type="button" @click="openMomentFriendPicker('excluded')"><span class="moment-option-icon">⊘</span><span>不给谁看</span><small>{{ momentsExcluded || '选择联系人' }}</small><b>›</b></button></div></section></div>
        <div v-if="false && fictionalVisitorsConfirmOpen" class="moment-subdialog-backdrop" @click.self="cancelFictionalVisitors"><section class="moment-subdialog visitor-warning-dialog" role="alertdialog" aria-modal="true" aria-labelledby="visitor-warning-title"><header><button type="button" @click="cancelFictionalVisitors">暂不开启</button><strong id="visitor-warning-title">开启虚构访客？</strong><button type="button" @click="confirmFictionalVisitors">确认开启</button></header><p>开启后，系统会使用当前 AI API 预设生成虚构访客及其评论、回复，可能产生 API 费用。访客会看到并互动公开动态，互动内容会保存在本机朋友圈中。</p><p><strong>如果你希望朋友圈只用于自己与恋人的私密互动，建议不要开启。</strong>私密和部分好友可见的动态不会提供给访客，但请勿在公开动态中分享不希望被模拟陌生访客看到的内容。</p></section></div>
        <div v-if="momentsVisibilitySheet" class="moment-subdialog-backdrop" @click.self="momentsVisibilitySheet = false"><section class="moment-subdialog"><header><button type="button" @click="momentsVisibilitySheet = false">取消</button><strong>谁可以看</strong><button type="button" @click="momentsVisibilitySheet = false">完成</button></header><button class="moment-choice" type="button" @click="chooseMomentVisibility('公开')">公开 <i>{{ momentsVisibility === '公开' ? '✓' : '' }}</i></button><button class="moment-choice" type="button" @click="chooseMomentVisibility('仅朋友可见')">仅朋友可见 <i>{{ momentsVisibility === '仅朋友可见' ? '✓' : '' }}</i></button><button class="moment-choice" type="button" @click="chooseMomentVisibility('私密')">私密 <i>{{ momentsVisibility === '私密' ? '✓' : '' }}</i></button><button class="moment-choice" type="button" @click="chooseMomentVisibility('部分好友可见')">部分好友可见 <i>{{ momentsVisibility.startsWith('部分好友') ? '✓' : '' }}</i></button></section></div>
        <div v-if="momentsFriendPicker" class="moment-subdialog-backdrop" @click.self="momentsFriendPicker = ''"><section class="moment-subdialog"><header><button type="button" @click="cancelMomentFriendPicker">取消</button><strong>{{ momentsFriendPicker === 'mention' ? '提醒谁看' : momentsFriendPicker === 'excluded' ? '不给谁看' : '选择可见好友' }}</strong><button type="button" @click="confirmMomentFriendPicker">完成</button></header><p class="moment-picker-tip">选择好友后会应用到本条动态。</p><label v-for="friend in contacts" :key="friend.id" class="moment-friend-option"><input v-model="momentsFriendSelection" type="checkbox" :value="friend.name"/><span class="moment-friend-avatar" :class="{ 'has-image': friend.avatar }"><img v-if="friend.avatar" :src="friend.avatar" :alt="`${friend.name}头像`"/><span v-else>{{ (friend.name || '友').slice(0,1) }}</span></span><span>{{ friend.name }}</span></label><p v-if="!contacts.length" class="moment-picker-tip">还没有联系人，请先添加角色。</p></section></div>
        <div v-if="momentsLocationDialog" class="moment-subdialog-backdrop" @click.self="momentsLocationDialog = false"><section class="moment-subdialog moment-location-dialog"><header><button type="button" @click="momentsLocationDialog = false">取消</button><strong>所在位置</strong><button type="button" @click="momentsLocationDialog = false">完成</button></header><template v-if="!momentsLocationMode"><button class="moment-choice" type="button" @click="momentsLocationMode = 'virtual'; momentsLocationQuery = momentsLocation">填写虚拟位置 <i>›</i></button><button class="moment-choice" type="button" @click="momentsLocationMode = 'real'">使用真实位置 <i>›</i></button></template><template v-else-if="momentsLocationMode === 'virtual'"><input v-model="momentsLocationQuery" class="moment-location-search" placeholder="输入虚拟位置"/><button class="moment-location-confirm" type="button" :disabled="!momentsLocationQuery.trim()" @click="momentsLocation = momentsLocationQuery.trim(); momentsLocationDialog = false">确认位置</button></template><template v-else><div class="moment-map-preview"><div class="moment-map-grid"></div><span>⌖</span><small>地图示意 · 搜索地址或使用设备定位</small></div><div class="moment-location-search-row"><input v-model="momentsLocationQuery" class="moment-location-search" placeholder="搜索详细地址" @keydown.enter.prevent="searchMomentLocation"/><button type="button" @click="searchMomentLocation">搜索</button></div><button class="moment-location-confirm" type="button" :disabled="momentsLocationBusy" @click="locateMomentAddress">{{ momentsLocationBusy ? '正在获取位置…' : '使用手机定位' }}</button><button v-for="result in momentsLocationResults" :key="result.place_id" class="moment-location-result" type="button" @click="selectMomentLocation(result)">{{ result.display_name }}</button></template></section></div>
      </section>
      <section v-else class="my-page">
        <div v-if="momentsGeneratingPosts" class="moment-generation-progress" role="status"><span class="moment-generation-spinner" aria-hidden="true"></span><span>正在生成朋友圈内容…</span><button type="button" @click="momentsGenerationController?.abort()">取消</button></div>
    <div v-if="momentsGenerationError" class="moment-subdialog-backdrop moment-generation-error-backdrop" @click.self="momentsGenerationError = ''"><section class="moment-subdialog moment-generation-error-card" role="alertdialog" aria-modal="true" aria-labelledby="moment-generation-error-title"><header><strong id="moment-generation-error-title">生成未完成</strong><button type="button" @click="momentsGenerationError = ''">关闭</button></header><p role="alert">{{ momentsGenerationError }}</p><button class="moment-generation-error-confirm" type="button" @click="momentsGenerationError = ''">知道了</button></section></div>
        <div class="my-heading"><span>个人空间</span><h1>Me</h1></div>
        <p class="preference-label"><span>聊天偏好</span></p>
        <section class="preference-card">
          <button class="preference-row" type="button" role="switch" :aria-checked="enterToSend" @click="enterToSend = !enterToSend">
            <span class="preference-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4a1.5 1.5 0 0 1 3 0v5h7.5a3.5 3.5 0 0 1 0 7H13v3l-5-4 5-4v3h4.5a1.5 1.5 0 0 0 0-3H10V4a1.5 1.5 0 0 0-3 0Z"/></svg></span>
            <span class="preference-copy"><strong>回车键发送</strong><small>关闭时，回车用于换行</small></span>
            <span class="toggle-pill" :class="{ on: enterToSend }"><i /></span>
          </button>
          <div class="preference-divider" />
          <button class="preference-row" type="button" role="switch" :aria-checked="replyImmediately" @click="replyImmediately = !replyImmediately">
            <span class="preference-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 1 2.05 4.95L4 20v-4.2A6.97 6.97 0 0 1 5 12Zm4-1.2a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Zm6 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z"/></svg></span>
            <span class="preference-copy"><strong>发送后联系人立刻回复</strong><small>关闭时，发送多条后可手动接收回复</small></span>
            <span class="toggle-pill" :class="{ on: replyImmediately }"><i /></span>
          </button>
          <div class="preference-divider" />
          <button class="preference-row sound-setting-row" type="button" @click="sendSoundInput?.click()">
            <span class="preference-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Zm12.2-1.2a5 5 0 0 1 0 6.4l1.5 1.3a7 7 0 0 0 0-9l-1.5 1.3Zm2.7-2.7a9 9 0 0 1 0 11.8l1.5 1.3a11 11 0 0 0 0-14.4l-1.5 1.3Z"/></svg></span>
            <span class="preference-copy"><strong>发送音效</strong><small>{{ sendSoundFile || '默认：可爱短提示音 · 点击自定义' }}</small></span>
            <span class="toggle-pill sound-toggle" :class="{ on: sendSoundEnabled }" role="switch" :aria-checked="sendSoundEnabled" aria-label="启用发送音效" @click.stop="sendSoundEnabled = !sendSoundEnabled"><i /></span>
            <span class="sound-action" @click.stop="resetSound('send')">恢复默认</span>
            <input ref="sendSoundInput" class="sound-file-input" type="file" accept="audio/*,video/mp4,video/webm" @click.stop @change="setSoundFile('send', $event.target.files?.[0]); $event.target.value = ''" />
          </button>
          <div class="preference-divider" />
          <button class="preference-row sound-setting-row" type="button" @click="receiveSoundInput?.click()">
            <span class="preference-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z"/><path d="m8 12 2.3 2.3L16 8.7"/></svg></span>
            <span class="preference-copy"><strong>通知音效</strong><small>{{ receiveSoundFile || '默认：消息提示音 · 点击自定义' }}</small></span>
            <span class="toggle-pill sound-toggle" :class="{ on: receiveSoundEnabled }" role="switch" :aria-checked="receiveSoundEnabled" aria-label="启用通知音效" @click.stop="receiveSoundEnabled = !receiveSoundEnabled"><i /></span>
            <span class="sound-action" @click.stop="resetSound('receive')">恢复默认</span>
            <input ref="receiveSoundInput" class="sound-file-input" type="file" accept="audio/*,video/mp4,video/webm" @click.stop @change="setSoundFile('receive', $event.target.files?.[0]); $event.target.value = ''" />
          </button>
          <div class="preference-divider" />
          <div class="preference-note"><span>✦</span> 按住 Shift + Enter 始终可以换行</div>
        </section>
        <section class="preference-card moments-settings-card">
          <div class="preference-row"><span class="preference-icon">◉</span><span class="preference-copy"><strong>朋友圈</strong><small>关闭后仍可查看历史动态，但不能发布或互动</small></span><button class="toggle-pill" :class="{ on: momentsSettings.enabled }" type="button" role="switch" :aria-checked="momentsSettings.enabled" @click="momentsSettings.enabled = !momentsSettings.enabled"><i /></button></div>
          <div class="preference-divider" />
          <div class="preference-row"><span class="preference-icon">✦</span><span class="preference-copy"><strong>角色发动态</strong><small>按角色设定和可见内容生成；没有自然内容时可以不发</small></span><button class="toggle-pill" :class="{ on: momentsSettings.characterPosts }" type="button" role="switch" :aria-checked="momentsSettings.characterPosts" :disabled="!momentsSettings.enabled" @click="momentsSettings.characterPosts = !momentsSettings.characterPosts"><i /></button></div>
          <div class="preference-divider" />
          <div class="preference-row"><span class="preference-icon"><svg class="moment-interaction-bolt" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.8 5.5 13h5.4l-.5 8.2 8.1-11h-5.6l.3-7.4Z"/></svg></span><span class="preference-copy"><strong>角色评论与回复</strong><small>仅对可见动态且关系依据明确的内容评论</small></span><button class="toggle-pill" :class="{ on: momentsSettings.characterInteractions }" type="button" role="switch" :aria-checked="momentsSettings.characterInteractions" :disabled="!momentsSettings.enabled" @click="momentsSettings.characterInteractions = !momentsSettings.characterInteractions"><i /></button></div>
          <div class="preference-divider" />
          <div class="preference-row"><span class="preference-icon">◌</span><span class="preference-copy"><strong>虚构访客</strong><small>允许陌生访客查看公开动态，并可能留下评论或回复</small></span><button class="toggle-pill" :class="{ on: momentsSettings.fictionalVisitors }" type="button" role="switch" :aria-checked="momentsSettings.fictionalVisitors" :disabled="!momentsSettings.enabled" @click="setFictionalVisitorsEnabled(!momentsSettings.fictionalVisitors)"><i /></button></div>
          <div v-if="fictionalVisitorsConfirmOpen" class="visitor-warning-inline" role="alertdialog" aria-modal="false" aria-labelledby="visitor-warning-title"><div class="visitor-warning-heading"><span>!</span><strong id="visitor-warning-title">开启虚构访客前请留意</strong></div><p>开启后，系统会调用当前 AI API 预设生成虚构访客及其评论、回复，可能产生 API 费用；访客只能接触公开动态，互动会保存在本机。</p><p><strong>如果你希望朋友圈只用于自己与恋人的私密互动，建议不要开启。</strong>请勿在公开动态中分享不希望被模拟陌生访客看到的内容。</p><div class="visitor-warning-actions"><button type="button" @click="cancelFictionalVisitors">暂不开启</button><button type="button" class="visitor-warning-confirm" @click="confirmFictionalVisitors">我已了解，确认开启</button></div></div>
          <div class="preference-note"><span>!</span> 访客仅能接触公开动态；私密及部分好友动态不会提供给访客。</div>
          <div class="preference-divider" />
          <div class="preference-row"><span class="preference-icon">◷</span><span class="preference-copy"><strong>自动生成</strong><small>仅应用页面打开期间运行；关闭页面不会后台生成</small></span><button class="toggle-pill" :class="{ on: momentsSettings.autoGenerate }" type="button" role="switch" :aria-checked="momentsSettings.autoGenerate" :disabled="!momentsSettings.enabled" @click="momentsSettings.autoGenerate = !momentsSettings.autoGenerate"><i /></button></div>
          <div class="moments-interval-control" :class="{ disabled: !momentsSettings.enabled || !momentsSettings.autoGenerate }">
            <div class="moments-interval-heading"><span>自动生成间隔</span><strong>{{ momentsSettings.generationIntervalMinutes }} 分钟</strong></div>
            <input v-model.number="momentsSettings.generationIntervalMinutes" class="moments-interval-slider" type="range" min="1" max="1440" step="1" aria-label="自动生成间隔分钟数" :disabled="!momentsSettings.enabled || !momentsSettings.autoGenerate" />
            <div class="moments-interval-custom"><span>自定义分钟数</span><input v-model.number="momentsSettings.generationIntervalMinutes" type="number" min="1" max="1440" step="1" aria-label="自定义自动生成间隔分钟数" :disabled="!momentsSettings.enabled || !momentsSettings.autoGenerate" @change="momentsSettings.generationIntervalMinutes = Math.max(1, Math.min(1440, Math.round(Number(momentsSettings.generationIntervalMinutes) || 20)))" /></div>
            <small>范围 1–1440 分钟；默认 20 分钟，设置会保存在本机。</small>
          </div>
          <div class="moments-interval-control" :class="{ disabled: !momentsSettings.enabled || !momentsSettings.autoGenerate || (!momentsSettings.characterInteractions && !momentsSettings.fictionalVisitors) }">
            <div class="moments-interval-heading"><span>评论与回复间隔</span><strong>{{ momentsSettings.interactionIntervalMinutes }} 分钟</strong></div>
            <input v-model.number="momentsSettings.interactionIntervalMinutes" class="moments-interval-slider" type="range" min="1" max="1440" step="1" aria-label="评论与回复间隔分钟数" :disabled="!momentsSettings.enabled || !momentsSettings.autoGenerate || (!momentsSettings.characterInteractions && !momentsSettings.fictionalVisitors)" />
            <div class="moments-interval-custom"><span>自定义分钟数</span><input v-model.number="momentsSettings.interactionIntervalMinutes" type="number" min="1" max="1440" step="1" aria-label="自定义评论与回复间隔分钟数" :disabled="!momentsSettings.enabled || !momentsSettings.autoGenerate || (!momentsSettings.characterInteractions && !momentsSettings.fictionalVisitors)" @change="momentsSettings.interactionIntervalMinutes = Math.max(1, Math.min(1440, Math.round(Number(momentsSettings.interactionIntervalMinutes) || 2)))" /></div>
            <small>与角色发动态的间隔独立计算；默认 2 分钟，设置会保存在本机。</small>
          </div>
          <div class="preference-note"><span>✦</span> 自动运行将直接调用当前 API 预设并可能产生费用；频率是最短间隔，不保证准点执行。关闭页面不补跑，浏览器可能节流后台标签页。</div>
        </section>
        <p class="preference-label"><span>个性化设置</span></p>
        <button class="config-card" type="button" @click="openChatConfig">
          <span class="preference-icon config-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a2 2 0 0 1 2 2v.4a6.8 6.8 0 0 1 1.7.7l.3-.3a2 2 0 1 1 2.8 2.8l-.3.3c.3.5.6 1.1.7 1.7h.4a2 2 0 1 1 0 4h-.4a6.8 6.8 0 0 1-.7 1.7l.3.3a2 2 0 1 1-2.8 2.8l-.3-.3a6.8 6.8 0 0 1-1.7.7v.4a2 2 0 1 1-4 0v-.4a6.8 6.8 0 0 1-1.7-.7l-.3.3a2 2 0 1 1-2.8-2.8l.3-.3a6.8 6.8 0 0 1-.7-1.7h-.4a2 2 0 1 1 0-4h.4c.2-.6.4-1.2.7-1.7l-.3-.3a2 2 0 1 1 2.8-2.8l.3.3a6.8 6.8 0 0 1 1.7-.7v-.4a2 2 0 0 1 2-2Zm0 6a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z"/></svg></span>
          <span class="preference-copy"><strong>聊天配置</strong><small>{{ boundCount }} 位联系人已绑定人设 · {{ chatConfig.preset.name }}</small></span>
          <span class="config-arrow">›</span>
        </button>
        <div class="my-footer-note">在这里，按自己的方式聊天</div>
      </section>
    </main>

    <transition name="conversation-fade">
      <div v-if="activeChat" class="conversation-overlay">
        <section class="conversation-page">
          <header class="conversation-header">
            <button class="conversation-back" aria-label="返回聊天列表" @click="leaveConversation"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 17h10"/></svg></button>
            <h1 class="conversation-title">{{ chatDisplayName(activeChat) }}</h1>
            <div class="conversation-actions"><button class="conversation-settings" aria-label="更多聊天选项" @click="openChatSettings"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button></div>
          </header>
          <main ref="messageList" class="message-list" @wheel.passive="onOlderMessagesWheel" @touchstart.passive="onOlderMessagesTouchStart" @touchend.passive="onOlderMessagesTouchEnd" @scroll.passive="onMessageListScroll">
            <button v-if="visibleMessageOffset > 0 && olderMessagesPromptVisible" class="load-older-messages" @click="loadOlderMessages">加载更早的消息（{{ visibleMessageOffset }} 条）</button>
            <template v-for="(message, index) in visibleMessages" :key="visibleMessageOffset + index">
            <div v-if="shouldShowTimestamp(index)" class="chat-time-divider">{{ messageTime(message) }}</div>
            <div class="message-row" :class="[message.from, { 'has-tail': isLastInRun(visibleMessageOffset + index), 'message-selected': selectedMessages.includes(visibleMessageOffset + index) }]" @pointerdown="!multiDeleteMode && startMessagePress(visibleMessageOffset + index, $event)" @pointerup="cancelMessagePress" @pointerleave="cancelMessagePress" @pointercancel="cancelMessagePress" @contextmenu.prevent="openMessageMenu(visibleMessageOffset + index, $event)" @click="multiDeleteMode ? toggleMessageSelection(visibleMessageOffset + index) : (message.from === 'them' && thoughtPreviewEnabled() && message.thought ? toggleThoughtMessage(index) : (message.from === 'them' && statusBarEnabled() && message.status ? toggleStatusMessage(visibleMessageOffset + index) : suppressMessageClick($event)))">
              <span v-if="message.from === 'them'" class="tiny-avatar" :class="{ 'avatar-placeholder': !activeChat.avatarImage }" :style="{'--avatar-color': activeChat.color}"><img v-if="activeChat.avatarImage" :src="activeChat.avatarImage" alt=""/><span v-else></span></span>
              <span v-else class="tiny-avatar user-tiny-avatar"><img v-if="activeUserAvatar" :src="activeUserAvatar" alt="我的头像"/><span v-else></span></span>
              <div class="message-content-stack"><div v-if="message.from === 'them' && thoughtPreviewEnabled() && message.thought" class="thought-preview" :class="{ expanded: expandedThoughtMessages.includes(messageViewKey(message)) }"><button type="button" class="thought-preview-toggle" :aria-expanded="expandedThoughtMessages.includes(messageViewKey(message))" @click.stop="toggleThoughtMessage(index)"><svg class="thought-bulb-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4m-6-6.2a7 7 0 1 1 8 0c-.9.7-1.4 1.5-1.5 2.2h-5c-.1-.7-.6-1.5-1.5-2.2Z"/></svg><span>{{ expandedThoughtMessages.includes(messageViewKey(message)) ? 'Thought Summary' : 'Before Reply' }}</span><span class="thought-chevron">{{ expandedThoughtMessages.includes(messageViewKey(message)) ? '−' : '+' }}</span></button><p v-if="expandedThoughtMessages.includes(messageViewKey(message))">{{ message.thought }}</p></div><div class="message-bubble-wrap"><span v-if="multiDeleteMode" class="message-selection-check" :class="{ checked: selectedMessages.includes(visibleMessageOffset + index) }" aria-hidden="true">✓</span><template v-if="message.type === 'text-image'"><button type="button" class="text-image-card" :class="{ 'polaroid-character': message.from === 'them' }" :aria-label="`打开来自${message.from === 'me' ? '我' : activeChat.name}的文字图`" @click.stop="polaroidPreview = { content: message.content, from: message.from }"><span class="polaroid-photo"><span class="special-card-label">{{ message.from === 'me' ? 'A MOMENT' : activeChat.name }}</span><span class="polaroid-copy">{{ message.content }}</span></span><span class="polaroid-caption">{{ message.from === 'me' ? 'a little note' : 'a moment to keep' }}</span></button></template><template v-else-if="message.type === 'transfer'"><button type="button" class="transfer-card" @click.stop="transferActionDialog = visibleMessageOffset + index"><span class="transfer-icon">¥</span><span class="transfer-copy"><strong>转账</strong><b>¥{{ Number(message.amount).toFixed(2) }}</b><small>{{ message.transferStatus || '待处理' }}</small></span></button></template><template v-else-if="message.type === 'voice'"><div class="voice-message-layout" :class="{ 'voice-message-outgoing': message.from === 'me' }"><Transition name="voice-transcript-expand"><p v-if="(message.from === 'me' && message.transcript) || (message.from === 'them' && expandedVoiceTranscript === visibleMessageOffset + index && message.transcript)" class="voice-transcript">{{ message.transcript }}<span v-if="message.from === 'them' && message.voiceDescription" class="voice-description">{{ message.voiceDescription.startsWith('（') ? message.voiceDescription : `（${message.voiceDescription}）` }}</span></p></Transition><div class="voice-message-card"><button type="button" class="voice-play-button" :aria-label="message.from === 'me' ? '播放我的语音' : '语音条'" :disabled="message.from === 'me' && !message.audioData && !message.audioUrl" @click.stop="playVoiceMessage(message, visibleMessageOffset + index)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button><span class="voice-wave" :class="{ playing: playingVoiceIndex === visibleMessageOffset + index }" :style="{ '--voice-progress': `${playingVoiceIndex === visibleMessageOffset + index ? voiceProgress * 100 : 0}%` }" aria-hidden="true"><i v-for="bar in 18" :key="bar" :style="{ '--bar-height': `${8 + ((bar * 13) % 17)}px` }" /></span></div></div><p v-if="message.from === 'me' && message.voiceImpression" class="voice-impression">声音印象：{{ message.voiceImpression }}</p></template><template v-else-if="message.type === 'image'"><button type="button" class="image-message-card" @click.stop="imagePreview = message.imageData"><img :src="message.imageData" alt="用户发送的图片" /></button></template><template v-else><div class="message-bubble"><div v-if="message.replyTo" class="quoted-message"><strong>{{ message.replyTo.from === 'me' ? '我' : activeChat.name }}</strong><span>{{ message.replyTo.text }}</span></div><span class="message-text">{{ message.text }}</span><span v-if="normalizeReaction(message.reaction)" class="message-reaction" :class="{ 'character-reaction': message.from === 'them' }" :aria-label="`反应：${normalizeReaction(message.reaction)}`">{{ normalizeReaction(message.reaction) }}</span></div></template></div>
                <time v-if="isLastInRun(index)" class="message-timestamp" :class="message.from">{{ messageTime(message) }}</time>
                <section v-if="message.from === 'them' && statusBarEnabled() && message.status && expandedStatusMessages.includes(messageViewKey(message))" class="character-status-card" aria-label="角色此刻状态"><div class="status-card-heading"><span>此刻的我</span><i>✦</i></div><p v-if="message.status.feeling" class="status-feeling">“{{ message.status.feeling }}”</p><div class="status-metrics"><div class="status-metric"><span>亲近感</span><div class="status-track"><i :style="{ width: `${message.status.closeness ?? 0}%` }" /></div><strong>{{ message.status.closeness ?? '—' }}</strong></div><div class="status-metric"><span>安心感</span><div class="status-track"><i :style="{ width: `${message.status.security ?? 0}%` }" /></div><strong>{{ message.status.security ?? '—' }}</strong></div><div class="status-metric"><span>情绪能量</span><div class="status-track"><i :style="{ width: `${message.status.energy ?? 0}%` }" /></div><strong>{{ message.status.energy ?? '—' }}</strong></div><div class="status-metric"><span>心动感</span><div class="status-track"><i :style="{ width: `${message.status.heartFlutter ?? 0}%` }" /></div><strong>{{ message.status.heartFlutter ?? '—' }}</strong></div></div></section>
              </div>
            </div>
            </template>
            <div v-if="userTyping || (characterTyping && activeChat)" class="typing-row" :class="{ me: userTyping && !characterTyping, them: characterTyping }" role="status" :aria-label="characterTyping ? `${activeChat.name}正在输入` : '我正在输入'">
              <span v-if="characterTyping" class="tiny-avatar" :class="{ 'avatar-placeholder': !activeChat.avatarImage }" :style="{'--avatar-color': activeChat.color}"><img v-if="activeChat.avatarImage" :src="activeChat.avatarImage" alt=""/><span v-else></span></span>
              <span v-else class="tiny-avatar user-tiny-avatar"><img v-if="activeUserAvatar" :src="activeUserAvatar" alt="我的头像"/><span v-else></span></span>
              <span class="typing-bubble"><i></i><i></i><i></i></span>
            </div>
          </main>
          <p v-if="replyError" class="reply-status reply-error" role="alert">{{ replyError }}</p>
            <div class="composer" :class="{ 'composer-with-quote': quoteDraft }">
              <div v-if="quoteDraft" class="quote-compose-preview"><span><strong>回复 {{ quoteDraft.from === 'me' ? '自己' : activeChat.name }}</strong><span>{{ quoteDraft.text }}</span></span><button type="button" aria-label="取消引用" @click="clearQuoteDraft">×</button></div>
              <form class="composer-input-row" @submit.prevent="sendMessage">
                <button type="button" class="composer-tool composer-add" aria-label="添加附件" @click="toggleAttachments"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
                <div class="composer-field">
                  <textarea v-model="draft" aria-label="输入消息" placeholder="发消息…" autocomplete="off" rows="1" @keydown.enter="onComposerEnter" />
                  <button type="button" class="composer-tool composer-camera" aria-label="发送图片" title="从相册发送图片" @click="imageInput?.click()"><svg viewBox="0 0 24 24"><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
                  <input ref="imageInput" class="hidden-image-input" type="file" accept="image/*" aria-label="选择图片" @change="handleImageSelected" />
                </div>
                <button v-if="draft.trim()" class="send-button" aria-label="发送消息" :disabled="replyLoading"><svg viewBox="0 0 24 24"><path d="M4 12h15M13 5l7 7-7 7"/></svg></button>
                <button v-else type="button" class="composer-tool composer-mic" :class="{ recording: isRecording }" :aria-label="isRecording ? '结束录音' : '录制语音消息'" :title="isRecording ? '点击结束录音' : '点击录制语音'" @click="startVoiceRecording"><svg v-if="!isRecording" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></svg><span v-else class="recording-indicator" aria-hidden="true"></span></button>
                <button v-if="!replyLoading" type="button" class="receive-button" aria-label="接收联系人回复" title="接收回复" :disabled="!messages.some((message) => message.from === 'me')" @click="requestReply"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14" /></svg></button>
              </form>
            </div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <section v-if="chatSettingsOpen && activeChat" class="chat-settings-page" aria-label="聊天设置">
        <header class="chat-settings-header">
          <button type="button" aria-label="返回聊天" @click="chatSettingsOpen = false">‹</button>
          <div><h2>聊天设置</h2></div>
          <i />
        </header>
        <div class="chat-settings-scroll">
          <p class="chat-settings-section-title"><span>个性化</span></p>
          <section class="chat-setting-card remark-setting-card">
            <span class="chat-setting-icon remark-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm17.71-10.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66Z"/></svg></span>
            <div class="chat-setting-copy"><strong>聊天备注</strong><small>仅在你的聊天列表和聊天顶部显示，不会改变角色设定。</small><input class="chat-remark-input" type="text" maxlength="40" :value="chatRemark()" :placeholder="activeChat.name" aria-label="聊天备注" @input="setChatRemark($event.target.value)" /></div>
          </section>
          <p class="chat-settings-section-title"><span>对话记忆</span></p>
          <section class="chat-setting-card memory-setting-card">
            <span class="chat-setting-icon memory-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v5.59l3.3 3.3-1.42 1.41L11 13V7Z"/></svg></span>
            <div class="chat-setting-copy"><strong>角色短期记忆</strong><small>设置角色回复时参考的最近对话轮数，聊天历史仍会完整保存。</small></div>
            <label class="memory-input-wrap"><input aria-label="角色短期记忆轮数" type="number" min="1" max="500" step="1" :value="shortTermMemoryRounds()" @change="setShortTermMemoryRounds($event.target.value)" /><span>轮</span></label>
          </section>
          <section class="chat-setting-card image-setting-card">
            <span class="chat-setting-icon image-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 11A1.5 1.5 0 1 1 8.5 8a1.5 1.5 0 0 1 0 3ZM5 19l4.5-6 3.5 4.5 2.5-3 3.5 4.5Z"/></svg></span>
            <div class="chat-setting-copy"><strong>图片消息记忆</strong><small>发送给角色时最多携带最近的图片数量，聊天记录仍会完整保存。</small></div>
            <label class="memory-input-wrap"><input aria-label="最近图片记忆数量" type="number" min="1" max="50" step="1" :value="imageMemoryLimit()" @change="setImageMemoryLimit($event.target.value)" /><span>张</span></label>
          </section>
          <section class="chat-setting-card image-quality-setting-card">
            <span class="chat-setting-icon image-quality-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 14.4 8.2 21 5l-3.2 6.6L24 14l-7.2 1.2L19 22l-7-3-7 3 2.2-6.8L0 14l6.2-2.4L3 5l6.6 3.2L12 2Z" transform="translate(2 1) scale(.83)"/></svg></span>
            <div class="chat-setting-copy"><strong>图片传输画质</strong><small>影响压缩尺寸与视觉输入 detail；tokens 为单张图片的大致估算，实际取决于模型。</small><select aria-label="图片传输画质" :value="imageQuality()" @change="setImageQuality($event.target.value)"><option v-for="option in imageQualityOptions" :key="option.id" :value="option.id">{{ option.label }} · {{ option.tokens }}</option></select></div>
          </section>
          <section class="chat-setting-card">
            <span class="chat-setting-icon status-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.8 6.1 6.7.8-4.9 4.6 1.3 6.6L12 16.8 6.1 20l1.1-6.5L2 8.9l6.8-.8L12 2Z"/></svg></span>
            <div class="chat-setting-copy"><strong>回复时附带角色状态</strong><small>展开角色回复，查看亲近感、安心感、情绪能量与心动感。</small></div>
            <button type="button" class="toggle-switch" :class="{ on: statusBarEnabled() }" role="switch" :aria-checked="statusBarEnabled()" aria-label="回复时附带角色状态" @click="setStatusBarEnabled(!statusBarEnabled())"><i /></button>
          </section>
          <section class="chat-setting-card">
            <span class="chat-setting-icon thought-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a7 7 0 0 0-4.4 12.45c.8.65 1.4 1.45 1.4 2.55h6c0-1.1.6-1.9 1.4-2.55A7 7 0 0 0 12 3Zm-3 17h6v2H9Z"/></svg></span>
            <div class="chat-setting-copy"><strong>显示回复前的思绪摘要</strong><small>展示角色第一人称的简短感受，不包含隐藏的逐步推理。</small></div>
            <button type="button" class="toggle-switch" :class="{ on: thoughtPreviewEnabled() }" role="switch" :aria-checked="thoughtPreviewEnabled()" aria-label="显示回复前的思绪摘要" @click="setThoughtPreviewEnabled(!thoughtPreviewEnabled())"><i /></button>
          </section>
          <p class="chat-settings-section-title"><span>聊天记录</span></p>
          <section class="chat-setting-card history-setting-card">
            <span class="chat-setting-icon history-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 14H7L6 7Zm3-4h6l1 2H8l1-2ZM4 5h16v2H4V5Zm5 5h2v8H9v-8Zm4 0h2v8h-2v-8Z"/></svg></span>
            <div class="chat-setting-copy"><strong>管理聊天记录</strong><small>清除聊天记录，或重启并清空这段聊天的短期记忆。</small></div>
            <button type="button" class="settings-row-action" @click="openHistoryAction('clear')">清除</button>
            <button type="button" class="settings-row-action restart-action" @click="openHistoryAction('restart')">重启</button>
          </section>
        </div>
      </section>
    </transition>
    <div v-if="historyActionDialog" class="acrylic-overlay history-confirm-overlay" @click.self="historyActionDialog = null">
      <section class="message-edit-dialog history-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="history-confirm-title">
        <h3 id="history-confirm-title">{{ historyActionDialog === 'clear' ? '清除聊天记录？' : '重启这段聊天？' }}</h3>
        <p>{{ historyActionDialog === 'clear' ? '聊天消息会被删除，但角色的短期记忆内容会保留，并在后续回复时继续参考。' : '聊天消息和角色的短期记忆内容都会被清除。此操作无法撤销。' }}</p>
        <footer><button type="button" @click="historyActionDialog = null">取消</button><button type="button" class="history-confirm-delete" @click="confirmHistoryAction">确认删除</button></footer>
      </section>
    </div>
    <transition name="contacts-fade">
      <div v-if="messageMenu" class="message-menu-backdrop" @click.self="messageMenu = false">
        <section class="message-menu-group" :style="{ left: `${messageMenu.left}px`, top: `${messageMenu.top}px`, '--menu-origin-x': `${messageMenu.originX * 100}%`, '--menu-origin-y': `${messageMenu.originY * 100}%` }" role="dialog" aria-modal="true" aria-label="消息操作">
          <div v-if="!multiDeleteMode && messages[selectedMessageIndex]?.from === 'them'" class="reaction-picker" aria-label="选择 emoji 反应">
            <button v-for="emoji in reactionChoices" :key="emoji" type="button" :aria-label="`反应 ${emoji}`" @click="addMessageReaction(emoji)">{{ emoji }}</button>
          </div>
          <div class="message-action-sheet">
            <p v-if="multiDeleteMode" class="message-action-title">已选择 {{ selectedMessages.length }} 条</p>
            <button v-if="!multiDeleteMode" type="button" @click="quoteSelectedMessage()"><span>回复</span><span>↩</span></button>
            <button v-if="!multiDeleteMode" type="button" @click="copySelectedMessage()"><span>复制</span><span>▢</span></button>
            <button v-if="!multiDeleteMode" type="button" @click="editSelectedMessage()"><span>编辑</span><span>✎</span></button>
            <button v-if="!multiDeleteMode" type="button" @click="enterMultiDeleteMode()"><span>多选</span><span>☷</span></button>
            <button v-if="!multiDeleteMode" type="button" class="message-delete-action" @click="deleteSelectedMessages()"><span>删除</span><span>⌫</span></button>
            <button v-if="multiDeleteMode" type="button" class="message-delete-action" :disabled="!selectedMessages.length" @click="deleteSelectedMessages(selectedMessages)"><span>删除所选</span><span>⌫</span></button>
            <button type="button" class="message-cancel-action" @click="messageMenu = false; multiDeleteMode = false; selectedMessages = []">取消</button>
          </div>
        </section>
      </div>
    </transition>
    <div v-if="multiDeleteMode" class="multi-delete-bar"><span>已选 {{ selectedMessages.length }} 条</span><button class="multi-delete-button" type="button" :disabled="!selectedMessages.length" @click="deleteSelectedMessages(selectedMessages)">删除</button><button class="multi-cancel-button" type="button" @click="multiDeleteMode = false; selectedMessages = []">取消</button></div>
<Transition name="polaroid-lift"><div v-if="polaroidPreview" class="polaroid-overlay" role="dialog" aria-modal="true" aria-label="文字图预览" @click.self="polaroidPreview = null"><button type="button" class="polaroid-close" aria-label="关闭文字图" @click="polaroidPreview = null">×</button><article class="polaroid-expanded" :class="{ 'polaroid-character': polaroidPreview.from === 'them' }"><div class="polaroid-expanded-photo"><span class="special-card-label">{{ polaroidPreview.from === 'me' ? 'A MOMENT' : activeChat?.name }}</span><p>{{ polaroidPreview.content }}</p></div><div class="polaroid-expanded-caption">{{ polaroidPreview.from === 'me' ? 'a little note' : 'a moment to keep' }}</div></article></div></Transition>
      <div v-if="imagePreview" class="acrylic-overlay image-preview-overlay" role="dialog" aria-modal="true" aria-label="图片预览" @click.self="imagePreview = null"><button type="button" class="image-preview-close" aria-label="关闭图片预览" @click="imagePreview = null">×</button><div class="image-preview-dialog"><img :src="imagePreview" alt="图片预览" /></div></div>
    <transition name="attachment-fade"><div v-if="attachmentOpen" class="attachment-backdrop" @click="attachmentOpen = false"><section class="attachment-panel" role="dialog" aria-modal="true" aria-label="更多功能" @click.stop><div class="attachment-handle" aria-hidden="true"></div><h2>更多功能</h2><div class="attachment-actions"><button type="button" @click="openComposerDialog('text-image')"><span class="attachment-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/></svg></span><span>文字图</span></button><button type="button" @click="openComposerDialog('transfer')"><span class="attachment-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 7.5 3.5 4 3.5-4M12 11.5v5M9 12h6M9 15h6"/></svg></span><span>转账</span></button></div></section></div></transition>
    <div v-if="composerDialog" class="acrylic-overlay" @click.self="composerDialog = null"><section class="message-edit-dialog feature-dialog" :class="{ 'text-image-dialog': composerDialog.type === 'text-image', 'transfer-compose-dialog': composerDialog.type === 'transfer' }" role="dialog" aria-modal="true"><h3>{{ composerDialog.type === 'text-image' ? '发送文字图' : '发起转账' }}</h3><label v-if="composerDialog.type === 'text-image'" class="feature-field"><span>文字图内容</span><textarea v-model="composerDialog.content" rows="5" placeholder="描述画面、视角和氛围…" /></label><label v-else class="feature-field"><span>转账金额（元）</span><input v-model="composerDialog.amount" type="number" min="0.01" step="0.01" placeholder="输入金额" /></label><footer><button type="button" @click="composerDialog = null">取消</button><button class="feature-send-button" type="button" :disabled="composerDialog.type === 'text-image' ? !composerDialog.content.trim() : !(Number(composerDialog.amount) > 0)" @click="submitComposerItem">发送</button></footer></section></div>
    <div v-if="transferActionDialog !== null" class="acrylic-overlay" @click.self="transferActionDialog = null"><section class="message-edit-dialog feature-dialog" role="dialog" aria-modal="true"><h3>转账 ¥{{ Number(messages[transferActionDialog]?.amount || 0).toFixed(2) }}</h3><p class="transfer-action-note">{{ messages[transferActionDialog]?.transferStatus || '请选择如何处理这笔转账' }}</p><footer><button type="button" @click="transferActionDialog = null">取消</button><button type="button" @click="respondToTransfer('return')">退还</button><button type="button" @click="respondToTransfer('accept')">收款</button></footer></section></div>
    <div v-if="messageDialog" class="acrylic-overlay" @click.self="messageDialog = null">
      <section class="message-edit-dialog" role="dialog" aria-modal="true" aria-label="编辑消息"><h3>编辑消息</h3><textarea v-model="messageDialog.text" rows="4" autofocus /><footer><button type="button" @click="messageDialog = null">取消</button><button type="button" @click="confirmEditMessage">保存</button></footer></section>
    </div>
    <transition name="contacts-fade"><div v-if="toastMessage" class="message-toast" role="status">{{ toastMessage }}</div></transition>
    <footer class="bottom-area">
      <nav class="bottom-nav" aria-label="页面切换"><button v-for="tab in tabs" :key="tab" type="button" :class="{ selected: currentTab === tab }" :aria-label="tab" :aria-current="currentTab === tab ? 'page' : undefined" @click="currentTab = tab"><svg v-if="tab === '聊天'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2c-5.1 0-9.2 3.3-9.2 7.5 0 2.1 1.1 4 3 5.4l-.8 4.7 5-2.4c.7.1 1.3.2 2 .2 5.1 0 9.2-3.3 9.2-7.5s-4.1-7.9-9.2-7.9Z"/></svg><svg v-else-if="tab === '朋友圈'" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2l1.4-2h4.2l1.4 2h2A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-10ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg><svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM3 22a9 9 0 0 1 18 0H3Z"/></svg><span>{{ tab }}</span></button></nav>
    </footer>
    <transition name="contacts-fade">
      <div v-if="friendSearchOpen" class="friend-search-overlay">
        <section v-if="!selectedFriend" class="friend-search-page" role="dialog" aria-modal="true" aria-label="搜索人物">
          <header class="friend-search-header"><button type="button" aria-label="返回聊天" @click="friendSearchOpen = false">‹</button><h2>添加好友</h2><i /></header>
          <label class="friend-search-input"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="friendQuery" autofocus placeholder="搜索人物名称" /><button v-if="friendQuery" type="button" aria-label="清空搜索" @click="friendQuery = ''">×</button></label>
          <p class="friend-search-hint">搜索人物名称，找到后可以查看主页并添加好友。</p>
          <div class="friend-search-results">
            <button v-for="person in friendSearchResults" :key="person.id" class="friend-search-row" type="button" @click="selectedFriend = person">
              <span class="friend-search-avatar" :style="person.avatar ? { backgroundImage: `url(${person.avatar})` } : {}"><span v-if="!person.avatar">{{ person.name.slice(0, 1) }}</span></span>
              <span class="friend-search-copy"><strong>{{ person.name }}</strong><small>ID: {{ virtualAccountId(person) }}</small></span><span class="friend-search-arrow">›</span>
            </button>
            <div v-if="friendQuery && !friendSearchResults.length" class="friend-search-empty">没有找到这个人物</div>
            <div v-else-if="!friendQuery" class="friend-search-empty">输入人物名称开始搜索</div>
          </div>
        </section>
        <section v-else class="friend-profile-page" role="dialog" aria-modal="true" aria-label="人物主页">
          <header class="friend-search-header"><button type="button" aria-label="返回搜索结果" @click="selectedFriend = null">‹</button><h2>个人主页</h2><i /></header>
          <div class="friend-profile-content">
            <div class="friend-profile-avatar" :style="selectedFriend.avatar ? { backgroundImage: `url(${selectedFriend.avatar})` } : {}"><span v-if="!selectedFriend.avatar">{{ selectedFriend.name.slice(0, 1) }}</span></div>
            <h3>{{ selectedFriend.name }}</h3><p>ID: {{ virtualAccountId(selectedFriend) }}</p>
            <button class="friend-add-button" type="button" :disabled="sections[0].chats.some((chat) => chat.id === selectedFriend.id)" @click="addFriend(selectedFriend)">{{ sections[0].chats.some((chat) => chat.id === selectedFriend.id) ? '已添加' : '添加好友' }}</button>
          </div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="showContacts" class="contacts-overlay" @click.self="showContacts = false">
        <section class="contacts-page" role="dialog" aria-modal="true" aria-label="添加联系人">
          <header class="contacts-header"><button type="button" aria-label="返回聊天" @click="showContacts = false">‹</button><div><span>JY · PEOPLE</span><h2>添加联系人</h2></div><i></i></header>
          <p class="contacts-intro">从你的人物档案里，挑一位开始聊天。</p>
          <label class="contact-search"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg><input v-model="contactQuery" autofocus placeholder="搜索人物"/><button v-if="contactQuery" type="button" aria-label="清除搜索" @click="contactQuery = ''">×</button></label>
          <div class="contact-results">
            <button v-for="person in filteredContacts" :key="person.id" type="button" class="contact-row" @click="addContact(person)">
              <span class="contact-avatar" :class="{ 'avatar-placeholder': !person.avatar }" :style="{'--avatar-color': person.color || '#e7e5df'}"><img v-if="person.avatar" :src="person.avatar" :alt="''"/><span v-else></span></span>
              <span class="contact-copy"><strong>{{ person.name }}</strong><small>{{ person.occupation || person.gender || '人物档案' }}</small></span>
              <span class="contact-add" :class="{ added: sections[0].chats.some((chat) => chat.id === person.id) }">{{ sections[0].chats.some((chat) => chat.id === person.id) ? '已添加' : '＋ 添加' }}</span>
            </button>
            <div v-if="!filteredContacts.length" class="contacts-empty"><span>✳</span><strong>{{ contacts.length ? '没有找到这个人物' : '这里还没有人物档案' }}</strong><p>{{ contacts.length ? '试试其他名字关键词。' : '先去「人物」App 创建角色档案，再回来添加。' }}</p></div>
          </div>
          <button class="contacts-done" type="button" @click="showContacts = false">完成</button>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="chatConfigOpen" class="config-page-overlay">
        <section class="config-page" role="dialog" aria-modal="true" aria-label="聊天配置">
          <header class="config-page-header">
            <button type="button" aria-label="返回我的页面" @click="chatConfigOpen = false">‹</button>
            <h2>聊天配置</h2><span />
          </header>
          <div class="config-page-scroll">
            <div class="config-tile-grid">
              <button class="config-group persona-group" type="button" aria-label="人设绑定" @click="openPersonaBinding">
                <span class="config-3d-icon persona-3d-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M32 7a12 12 0 0 1 12 12v6h4a8 8 0 0 1 8 8v15a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V33a8 8 0 0 1 8-8h4v-6A12 12 0 0 1 32 7Zm-6 18h12v-6a6 6 0 0 0-12 0v6Zm6 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg></span>
                <span class="config-group-copy"><strong>人设绑定</strong><small>选择一个全局用户人设，应用于所有角色对话。</small></span>
              </button>
              <button class="config-group preset-group" type="button" aria-label="预设配置" @click="editChatPreset">
                <span class="config-3d-icon preset-3d-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="m32 6 8 17 18 2.5-13.2 12.8L48 57 32 47.7 16 57l3.2-18.7L6 25.5 24 23l8-17Z"/></svg></span>
                <span class="config-group-copy"><strong>预设配置</strong><small>调整回复风格、提示词和聊天行为规则。</small></span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="personaBindingOpen" class="persona-binding-overlay">
        <section class="persona-binding-page" role="dialog" aria-modal="true" aria-label="人设绑定">
          <header class="persona-binding-header">
            <button type="button" aria-label="返回聊天设置" @click="personaBindingOpen = false">‹</button>
            <div><h2>人设绑定</h2></div><i />
          </header>
          <div v-if="activeBindingPair" class="persona-binding-content">
            <p class="persona-binding-intro">选择一个用户人设，所有角色的对话都会使用它</p>
            <div class="polaroid-stage" :class="{ flipping: personaBindingTransition }">
              <article class="polaroid-card character-polaroid">
                <div class="polaroid-photo" :style="activeBindingPair.character.avatar ? { backgroundImage: `url(${activeBindingPair.character.avatar})` } : {}">
                  <span v-if="!activeBindingPair.character.avatar">{{ (activeBindingPair.character.name || '角').slice(0, 1) }}</span>
                </div>
                <strong>{{ activeBindingPair.character.name || '角色' }}</strong><small>角色人设</small>
              </article>
              <span class="binding-link" aria-hidden="true">♡</span>
              <article class="polaroid-card user-polaroid">
                <div class="polaroid-photo" :style="activeBindingPair.profile.avatar ? { backgroundImage: `url(${activeBindingPair.profile.avatar})` } : {}">
                  <span v-if="!activeBindingPair.profile.avatar">{{ (activeBindingPair.profile.name || '我').slice(0, 1) }}</span>
                </div>
                <strong>{{ activeBindingPair.profile.name || '我的人设' }}</strong><small>用户人设</small>
              </article>
            </div>
            <div class="binding-select-wrap">
              <label for="persona-profile-select">为 {{ activeBindingPair.character.name || '当前角色' }} 选择用户人设</label>
              <select id="persona-profile-select" :value="chatConfig.profileId || ''" @change="assignPersona('', $event.target.value)">
                <option value="">使用默认人设 · {{ userProfile.name || '我' }}</option>
                <option v-for="profile in profileSettings.profiles" :key="profile.id" :value="profile.id">{{ profile.name || '未命名人设' }}</option>
              </select>
            </div>
            <div class="binding-navigation">
              <button type="button" aria-label="上一对绑定" :disabled="personaBindingPairs.length < 2" @click="changePersonaBinding(-1)">‹</button>
              <span>{{ personaBindingIndex + 1 }} <i>/</i> {{ personaBindingPairs.length }}</span>
              <button type="button" aria-label="下一对绑定" :disabled="personaBindingPairs.length < 2" @click="changePersonaBinding(1)">›</button>
            </div>
          </div>
          <div v-else class="persona-binding-empty"><div class="polaroid-photo">✦</div><strong>还没有可绑定的角色</strong><p>添加角色后，就可以为每段对话选择对应的人设。</p><button type="button" @click="personaBindingOpen = false; chatConfigOpen = false; showContacts = true">添加角色</button></div>
        </section>
      </div>
    </transition>
    <transition name="contacts-fade">
      <div v-if="presetDraft" class="preset-config-page">
        <section class="preset-config-content" role="dialog" aria-modal="true" aria-label="预设配置">
          <header class="preset-config-header">
            <button type="button" aria-label="返回聊天设置" @click="presetDraft = null">‹</button>
            <div><h2>预设配置</h2></div>
            <button class="preset-config-save-top" type="button" @click="savePreset">保存</button>
          </header>
          <div class="preset-config-scroll">
            <p class="preset-config-section-title">当前预设</p>
            <label class="preset-name-card"><span class="preset-config-icon">✧</span><span class="preset-name-copy"><strong>预设名称</strong><small>为这组聊天规则起个名字</small></span><input v-model="presetDraft.name" maxlength="40" aria-label="预设名称" placeholder="我的聊天预设" /></label>
            <label class="preset-name-card"><span class="preset-config-icon">✧</span><span class="preset-name-copy"><strong>对话温度</strong><small>控制回复的随机性与表达变化</small></span><span class="preset-range-control"><input v-model.number="presetDraft.temperature" type="range" min="0" max="2" step="0.05" aria-label="对话温度" /><output>{{ Number(presetDraft.temperature ?? 1).toFixed(2) }}</output></span></label>
            <label class="preset-name-card"><span class="preset-config-icon">✧</span><span class="preset-name-copy"><strong>Top-K</strong><small>0 表示不启用，限制候选词范围</small></span><span class="preset-range-control"><input v-model.number="presetDraft.top_k" type="range" min="0" max="100" step="1" aria-label="Top-K" /><output>{{ presetDraft.top_k ?? 0 }}</output></span></label>
            <label class="preset-name-card"><span class="preset-config-icon">✧</span><span class="preset-name-copy"><strong>Top-P</strong><small>0 表示不启用，按累计概率筛选</small></span><span class="preset-range-control"><input v-model.number="presetDraft.top_p" type="range" min="0" max="1" step="0.01" aria-label="Top-P" /><output>{{ Number(presetDraft.top_p ?? 0).toFixed(2) }}</output></span></label>
            <label class="preset-name-card"><span class="preset-config-icon">✦</span><span class="preset-name-copy"><strong>模型思考强度</strong><small>控制模型回答时的推理强度</small></span><select v-model="presetDraft.thinkingIntensity" aria-label="模型思考强度"><option value="low">Low</option><option value="medium">Medium（默认）</option><option value="high">High</option></select></label>
            <div class="preset-config-section-title"><span>提示词条目</span><button type="button" @click="addPresetEntry">＋ 添加</button></div>
            <article v-for="(entry, index) in presetDraft.entries" :key="entry.id" class="preset-setting-card" :class="{ dragging: draggingPresetIndex === index }" @pointerenter="movePresetDrag(index)">
              <button class="preset-entry-summary" type="button" @click="openPresetDetail(index)">
                <span class="preset-config-icon">✦</span>
                <span class="preset-entry-copy"><strong>{{ entry.name || '未命名条目' }}</strong><small>{{ entry.content?.trim().replace(/\\s+/g, ' ') || '暂无简介' }}</small></span>
                <span class="preset-entry-chevron">›</span>
              </button>
              <button class="preset-entry-handle" type="button" aria-label="长按拖动排序" @pointerdown.stop="startPresetDrag(index, $event)" @pointermove="trackPresetDrag" @pointerup="stopPresetDrag" @pointercancel="stopPresetDrag" @lostpointercapture="stopPresetDrag" @contextmenu.prevent>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button class="preset-setting-toggle" type="button" role="switch" :aria-checked="entry.enabled" :aria-label="entry.enabled ? '停用条目' : '启用条目'" :class="{ on: entry.enabled }" @click="entry.enabled = !entry.enabled"><i /></button>
            </article>
          </div>
          <div v-if="presetDetailIndex >= 0 && presetDraft.entries[presetDetailIndex]" class="preset-detail-overlay" @click.self="closePresetDetail">
            <section class="preset-detail-dialog" role="dialog" aria-modal="true" aria-label="编辑预设条目">
              <header><h3>条目详情</h3><button type="button" aria-label="关闭" @click="closePresetDetail">×</button></header>
              <label>条目标题<input v-model="presetDraft.entries[presetDetailIndex].name" maxlength="36" placeholder="条目名称" /></label>
              <label>详细内容<textarea v-model="presetDraft.entries[presetDetailIndex].content" rows="9" placeholder="写下这条提示词……" /></label>
              <footer>
                <button v-if="defaultChatPreset.entries.some((item) => item.id === presetDraft.entries[presetDetailIndex].id)" type="button" @click="restorePresetEntry(presetDetailIndex)">恢复默认</button>
                <button type="button" class="preset-remove-button" @click="removePresetEntry(presetDetailIndex); closePresetDetail()">删除条目</button>
                <button type="button" class="preset-detail-done" @click="closePresetDetail">完成</button>
              </footer>
            </section>
          </div>
          <footer class="preset-config-footer"><button type="button" @click="presetDraft = null">取消</button><button type="button" @click="savePreset">保存预设</button></footer>
        </section>
      </div>
    </transition>
    <PhotoPickerDialog
      v-if="avatarDialogOpen"
      :model-value="userProfile.avatar"
      title="更换我的头像"
      eyebrow="MY AVATAR"
      @save="userProfile.avatar = $event; avatarDialogOpen = false"
      @close="avatarDialogOpen = false"
    />
  </div>
</template>

<style scoped>
.attachment-backdrop{background:transparent}
.attachment-panel{left:max(12px, calc((100vw - 620px)/2 + 12px))!important;bottom:calc(env(safe-area-inset-bottom) + 68px)!important;width:min(76vw,320px)!important;box-sizing:border-box;padding:10px 9px!important;border:1px solid rgba(255,255,255,.86)!important;border-radius:34px!important;background:rgba(255,255,255,.94)!important;box-shadow:0 18px 54px rgba(30,30,35,.16),0 3px 12px rgba(30,30,35,.06)!important;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);transform-origin:30px 100%}
.attachment-handle,.attachment-panel h2{display:none}
.attachment-actions{display:flex;flex-direction:column}
.attachment-panel .attachment-actions button{width:100%;height:62px;display:flex;align-items:center;gap:14px;padding:0 20px;border:0;border-radius:21px;color:#17181a;background:transparent;text-align:left;font-size:18px;font-weight:500;cursor:pointer}
.attachment-panel .attachment-actions button:hover,.attachment-panel .attachment-actions button:active{background:rgba(0,0,0,.035)}
.attachment-actions .attachment-icon{width:34px;height:34px;flex:none;display:grid;place-items:center;color:#222}
.attachment-icon svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.attachment-fade-enter-active .attachment-panel{animation:attachment-pop .9s cubic-bezier(.18,.85,.28,1) both}
.attachment-fade-leave-active .attachment-panel{transition:opacity .14s,transform .14s}
.attachment-fade-leave-to .attachment-panel{opacity:0;transform:translateY(6px) scale(.94)}
@keyframes attachment-pop{0%{opacity:0;transform:translateY(54px) scale(.08);border-radius:50%}18%{opacity:.36;transform:translateY(42px) scale(.22);border-radius:50%}38%{opacity:.72;transform:translateY(25px) scale(.48);border-radius:48%}58%{opacity:.92;transform:translateY(10px) scale(.76);border-radius:44%}76%{opacity:1;transform:translateY(-4px) scale(1.035);border-radius:40px}88%{transform:translateY(2px) scale(.99);border-radius:38px}100%{opacity:1;transform:translateY(0) scale(1);border-radius:38px}}
@media(prefers-reduced-motion:reduce){.attachment-fade-enter-active .attachment-panel{animation:none}.attachment-fade-leave-active .attachment-panel{transition:none}}
.reply-notice-stack{position:fixed;top:calc(env(safe-area-inset-top) + 10px);left:50%;z-index:60;width:min(calc(100% - 28px),440px);display:flex;flex-direction:column;align-items:center;pointer-events:none;transform:translateX(-50%)}.reply-notice{width:100%;min-height:66px;position:relative;display:flex;align-items:center;gap:11px;margin-top:calc(var(--stack-index) * -12px);padding:11px 14px;border:1px solid #ffffffa8;border-radius:22px;background:linear-gradient(135deg,#ffffffd9,#f4f3f0ce);box-shadow:0 12px 32px #29282520;backdrop-filter:blur(24px) saturate(1.4);-webkit-backdrop-filter:blur(24px) saturate(1.4);animation:notice-in .38s cubic-bezier(.2,.8,.2,1) both;transform:scale(calc(1 - var(--stack-index) * .025));transform-origin:top center;color:inherit;text-align:left;font:inherit;cursor:pointer;pointer-events:auto}.reply-notice:not(:first-child){margin-top:-13px;filter:brightness(.98)}.message-row.notice-message-highlight .message-bubble{animation:notice-message-pulse 1.8s ease both}@keyframes notice-message-pulse{0%,100%{filter:none}25%,65%{filter:brightness(1.16);box-shadow:0 0 0 4px #bda7ef55,0 5px 22px #6e55ac25}}.avatar-placeholder{background:#bdbdbd!important}.notice-avatar.avatar-placeholder,.avatar.avatar-placeholder,.contact-avatar.avatar-placeholder{border-color:transparent}.notice-avatar{width:42px;height:42px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border:2px solid #ffffffd9;border-radius:50%;color:#626366;background:linear-gradient(145deg,#fff,var(--avatar-color));font-family:Georgia,serif;font-size:15px}.notice-avatar img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.notice-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.notice-copy strong{overflow:hidden;color:#45464a;font-size:12px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}.notice-copy>span{display:-webkit-box;overflow:hidden;color:#696a6e;font-size:12px;line-height:1.4;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}.notice-time{align-self:flex-start;flex:none;color:#aaa9a5;font-size:9px}@keyframes notice-in{from{opacity:0;translate:0 -18px;scale:.97}to{opacity:1;translate:0 0;scale:1}}@media(prefers-reduced-motion:reduce){.reply-notice{animation:none}.heartbeat-wave i{animation:none;opacity:.85}}
.chat-app{--ink:#202733;--soft:#788394;--brand:#5278bd;--surface:#fff;position:fixed;inset:0;z-index:20;display:flex;flex-direction:column;overflow:hidden;padding:env(safe-area-inset-top) 0 0;color:var(--ink);background:#f6f7f9;font-family:"Source Han Sans SC","思源黑体","Noto Sans SC",sans-serif;font-weight:400}.chat-app:has(.moments-page){padding-top:0}.chat-app:has(.moments-page)>.topbar{top:0}.chat-app:has(.moments-page)>.chat-content{padding-top:0}.chat-app button,.chat-app input{font:inherit}.topbar{height:58px;flex:none;display:flex;align-items:center;gap:12px;padding:0 22px}.topbar-title{flex:1;color:#202733;font-size:18px;font-weight:650;letter-spacing:.01em}.back-button{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:50%;color:#454e5b;background:transparent}.back-button svg{width:20px;fill:none;stroke:currentColor;stroke-width:1.8}.round-action{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:50%;color:#485568;background:#fff}.round-action svg{width:21px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}.chat-content{width:min(100%,620px);flex:1;min-height:0;overflow:auto;margin:0 auto;padding:12px 20px 16px;scrollbar-width:thin;scrollbar-color:#d5dbe4 transparent}.welcome{display:flex;flex-direction:column;gap:5px;margin:10px 0 18px}.welcome strong{color:#202733;font-size:27px;font-weight:680;letter-spacing:-.7px}.welcome>span{color:#8993a1;font-size:12px}.chat-list-search{height:44px;display:flex;align-items:center;gap:10px;margin:0 0 22px;padding:0 14px;border:1px solid #e8ebf0;border-radius:13px;background:#fff;transition:border-color .18s,box-shadow .18s}.chat-list-search:focus-within{border-color:#a9bfdf;box-shadow:0 0 0 3px #5278bd12}.chat-list-search svg{width:18px;flex:none;fill:none;stroke:#8993a1;stroke-width:1.7}.chat-list-search input{min-width:0;flex:1;border:0;outline:0;color:#263143;background:transparent;font-size:13px}.chat-list-search input::placeholder{color:#a0a8b4}.chat-list-search button{width:24px;height:24px;border:0;border-radius:50%;color:#7d8795;background:#eef1f5;font-size:18px;line-height:1}.chat-section{margin-bottom:18px}.section-toggle{width:100%;height:34px;display:flex;align-items:center;gap:8px;padding:0 2px;border:0;color:#737f8f;background:transparent;text-align:left;font-size:13px;font-weight:600;cursor:pointer}.section-toggle>svg{width:15px;fill:none;stroke:#909baa;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.section-toggle .chevron{transition:transform .18s}.section-toggle .chevron.folded{transform:rotate(-90deg)}.section-toggle small{color:#a2aab5;font-size:11px}.section-toggle .section-end{display:none}.chat-card{overflow:hidden;padding:0 12px;border:1px solid #eceff3;border-radius:16px;background:#fff}.conversation{width:100%;min-height:76px;display:flex;align-items:center;gap:12px;padding:10px 1px;border:0;border-bottom:1px solid #f0f2f5;background:transparent;text-align:left;cursor:pointer;transition:background .16s}.conversation:last-child{border-bottom:0}.conversation:active{background:#f7f9fc}.avatar{width:48px;height:48px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border:1px solid #e9ecf1;border-radius:50%;background:linear-gradient(145deg,#f7f8fa,var(--avatar-color))}.avatar>span{color:#59677b;font-family:"PingFang SC",sans-serif;font-size:17px;font-weight:550}.avatar>img,.contact-avatar img{width:100%;height:100%;position:absolute;inset:0;border-radius:50%;object-fit:cover}.online-dot{position:absolute;right:0;bottom:0;width:12px;height:12px;border:2px solid #fff;border-radius:50%;background:#48b980}.group-mark{position:absolute;right:-2px;bottom:0;width:17px;height:17px;display:grid;place-items:center;border:2px solid white;border-radius:50%;color:#fff;background:#78879a;font-size:7px;font-style:normal}.conversation-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:6px}.conversation-top,.conversation-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px}.conversation-top strong{overflow:hidden;color:#252e3b;font-size:14px;font-weight:620;text-overflow:ellipsis;white-space:nowrap}.conversation-top time{flex:none;color:#9aa3af;font-size:10px;font-variant-numeric:tabular-nums}.conversation-bottom>span{overflow:hidden;color:#858f9d;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.unread-count{min-width:19px;height:19px;flex:none;display:grid;place-items:center;padding:0 5px;border-radius:11px;color:white;background:#557fc5;font-size:10px;font-style:normal;font-variant-numeric:tabular-nums}.no-results{padding:30px 12px;color:#858f9d;text-align:center;font-size:13px}.empty-tab{min-height:50vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4c5665;text-align:center}.empty-icon,.profile-avatar{width:65px;height:65px;display:grid;place-items:center;margin-bottom:16px;border-radius:50%;color:#5278bd;background:#eaf0fa;font-size:23px}.profile-avatar{font-family:Georgia,serif;font-size:20px}.empty-tab h1{margin:0;font-size:22px;font-weight:600}.empty-tab p{margin:8px 0 16px;color:#999a9d;font-size:12px}.empty-action{padding:9px 17px;border:0;border-radius:20px;color:#626367;background:#ffffffd9;font-size:11px}.my-page{min-height:100%;padding:8px 2px 30px;color:#45464a}.my-heading{padding:14px 5px 24px}.my-heading>span,.preference-label{color:#b0aaa3;font-size:9px;letter-spacing:.18em}.my-heading h1{margin:8px 0 5px;color:#424348;font-size:32px;font-weight:650;letter-spacing:-1px}.my-heading p{color:#a3a1a0;font-size:12px}.my-profile-card{width:100%;position:relative;display:flex;align-items:center;gap:14px;padding:17px;border:1px solid #ffffff;border-radius:25px;color:inherit;background:linear-gradient(135deg,#ffffffdf,#f8f7f4d9);box-shadow:0 10px 28px #6e65550a;text-align:left;cursor:pointer;transition:transform .18s,box-shadow .18s}.my-profile-card:active{transform:scale(.985);box-shadow:0 5px 16px #6e65550d}.my-profile-card:focus-visible{outline:2px solid #c6bcb0;outline-offset:3px}.my-avatar{width:60px;height:60px;flex:none;display:grid;place-items:center;overflow:hidden;border:3px solid #fff;border-radius:50%;background-color:#e7e3dd;background-image:linear-gradient(145deg,#ede8e1,#d8d8d2);background-position:center;background-size:cover;box-shadow:0 4px 12px #5552}.my-avatar>span{color:#8d8983;font-family:Georgia,serif;font-size:22px}.my-profile-copy{min-width:0;display:flex;flex-direction:column;gap:6px}.my-profile-copy strong{color:#535251;font-size:15px;font-weight:600}.my-profile-copy small{overflow:hidden;color:#aaa7a3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.profile-sparkle{margin-left:auto;color:#c4b9aa;font-size:18px}.preference-label{display:flex;align-items:center;gap:9px;margin:27px 6px 11px}.preference-label span{color:#8f8d8a;font-size:11px;letter-spacing:0}.preference-card{padding:3px 16px 13px;border:1px solid #ffffffd9;border-radius:24px;background:linear-gradient(135deg,#ffffffd9,#f8f8f6c9);box-shadow:0 8px 24px #6e655508;backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}.preference-row{width:100%;min-height:69px;display:flex;align-items:center;gap:12px;border:0;background:transparent;text-align:left;cursor:pointer}.sound-setting-row{position:relative}.sound-toggle{flex:none}.sound-action{flex:none;padding:6px 10px;border:1px solid #34b85a;border-radius:15px;color:#fff;background:#34b85a;font-size:9px;font-weight:600;box-shadow:0 2px 7px #34b85a30}.sound-file-input{display:none}
.preference-icon{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:13px;color:#f6f7f6;background:linear-gradient(145deg,#b9bdba,#8d9290);font-size:20px;text-shadow:0 1px 1px #73777555}.preference-card .preference-row:nth-of-type(1) .preference-icon,.preference-card .preference-row:nth-of-type(2) .preference-icon,.preference-card .preference-row:nth-of-type(3) .preference-icon,.preference-card .preference-row:nth-of-type(4) .preference-icon{color:#f6f7f6;background:linear-gradient(145deg,#b9bdba,#8d9290)}.preference-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.preference-icon svg{width:19px;height:19px;fill:currentColor;stroke:none}.preference-copy strong{color:#45464a;font-size:12px;font-weight:600}.preference-copy small{color:#686a6d;font-size:10px}.toggle-pill{width:39px;height:23px;position:relative;flex:none;padding:0;border:0;border-radius:20px;appearance:none;-webkit-appearance:none;background:#e5e3df;transition:background .2s}.toggle-pill:focus-visible{outline:2px solid #9bbda2;outline-offset:2px}.toggle-pill i{width:17px;height:17px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.toggle-pill.on{background:#34c759}.toggle-pill.on i{transform:translateX(16px)}.preference-divider{height:1px;margin:0 0 10px 46px;background:#f0efed}.preference-note{display:flex;align-items:center;gap:7px;padding-left:46px;color:#aaa7a3;font-size:9px}.preference-note span{color:#c1b7a9}.my-footer-note{margin:26px 0 0;color:#c3bdb5;text-align:center;font-family:Georgia,serif;font-size:10px;letter-spacing:.06em}.config-card{width:100%;min-height:68px;display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #fff;border-radius:23px;color:inherit;background:#ffffffc9;box-shadow:0 8px 24px #6e655508;text-align:left;cursor:pointer;transition:transform .18s}.config-card:active{transform:scale(.985)}.config-card .config-icon{color:#fff;background:#929695}.config-card .config-icon svg{width:19px;height:19px;fill:#fff;stroke:none}.config-overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:14px;background:#38363338;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.config-sheet{width:min(100%,520px);height:min(82vh,680px);display:flex;flex-direction:column;overflow:hidden;padding:19px 20px 16px;border:1px solid #ffffffd9;border-radius:29px;background:#f5f4f1;box-shadow:0 24px 80px #25252525}.chat-settings-sheet{height:min(56dvh,460px)}.history-actions{display:flex;flex-direction:column;gap:8px}.history-action{display:flex;flex-direction:column;gap:5px;padding:12px 13px;border:1px solid #efede8;border-radius:16px;background:#faf9f7;text-align:left;cursor:pointer}.history-action strong{color:#68645d;font-size:11px;font-weight:600}.history-action span{color:#aaa49b;font-size:9px;line-height:1.5}.history-action.restart strong{color:#ad7770}.history-confirm-overlay{background:#00000026;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.history-confirm-dialog{border-color:#f0f0f0;background:#fff;box-shadow:0 18px 55px #00000024;backdrop-filter:none;-webkit-backdrop-filter:none}.history-confirm-dialog h3{color:#343538}.history-confirm-dialog p{margin:0;color:#77797d;font-size:12px;line-height:1.65}.history-confirm-dialog footer button{color:#55575b;background:#ededee}.history-confirm-dialog .history-confirm-delete{color:#55575b;background:#e5e5e7}
.chat-settings-page{position:fixed;inset:0;z-index:38;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;padding:calc(env(safe-area-inset-top) + 18px) 20px calc(env(safe-area-inset-bottom) + 16px);color:#424348;background:#fff}.chat-settings-header{width:min(100%,620px);display:grid;grid-template-columns:42px 1fr 42px;align-items:center;flex:none;margin:0 auto 20px}.chat-settings-header>button{width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:0;color:#5d5e60;background:transparent;font-size:27px;line-height:1;cursor:pointer}.chat-settings-header>div{text-align:center}.chat-settings-header>div>span{color:#b0aaa3;font-size:8px;letter-spacing:.18em}.chat-settings-header h2{margin:4px 0 0;color:#55565a;font-size:18px;font-weight:550;letter-spacing:.04em}.chat-settings-header>i{width:38px}.chat-settings-scroll{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto;padding:0 2px 18px;scrollbar-width:none;scrollbar-color:transparent transparent}.chat-settings-scroll::-webkit-scrollbar,.preset-config-scroll::-webkit-scrollbar{display:none;width:0;height:0}.chat-settings-section-title{display:flex;align-items:center;gap:9px;margin:17px 5px 11px;color:#b0aaa3;font-size:9px;letter-spacing:.17em}.chat-settings-section-title span{color:#8f8d8a;font-size:11px;letter-spacing:0}.chat-setting-card{min-height:78px;display:flex;align-items:center;gap:13px;margin-bottom:10px;padding:13px 15px;border:1px solid #ffffffd9;border-radius:25px;background:linear-gradient(135deg,#ffffffd9,#f8f8f6c9);box-shadow:0 7px 22px #5e5a4d0b;backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}.chat-setting-icon{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:15px;color:#fff;background:#85898e;font-size:20px;box-shadow:none}.chat-setting-icon svg{width:20px;height:20px;fill:currentColor;stroke:none}.memory-icon,.couple-icon,.status-icon,.thought-icon,.history-icon,.image-setting-card .image-icon,.image-quality-icon{color:#fff!important;background:#85898e!important}.history-icon{color:#dd8075;background:#fff0ed}.chat-setting-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.chat-setting-copy strong{color:#55565a;font-size:12px;font-weight:650}.chat-setting-copy small{color:#9b9b9c;font-size:10px;line-height:1.5}.remark-setting-card .chat-setting-copy{align-items:stretch}.chat-remark-input{width:100%;height:36px;box-sizing:border-box;margin-top:5px;padding:0 11px;border:1px solid #e8e7e3;border-radius:12px;outline:0;color:#55565a;background:#f8f8f6;box-shadow:inset 0 1px 3px #55555508;font:inherit;font-size:11px;transition:border-color .18s,box-shadow .18s,background .18s}.chat-remark-input::placeholder{color:#b3b2ae}.chat-remark-input:focus{border-color:#b8d7c0;background:#fff;box-shadow:0 0 0 3px #7bc88b1c}.memory-setting-card .memory-input-wrap{width:91px;height:36px;flex:none;gap:4px;padding:0 9px;border-radius:15px;background:#f5f5f3}.memory-input-wrap input{width:100%;min-width:0;border:0;outline:0;color:#595a5d;background:transparent;font:inherit;font-size:13px}.memory-input-wrap span{flex:none;color:#97989a;font-size:10px}.image-setting-card .image-icon{color:#6f9dcb;background:#edf5ff}.image-quality-setting-card{align-items:flex-start}.image-quality-icon{color:#9b85c8;background:#f3efff}.image-quality-setting-card select{width:100%;height:34px;margin-top:4px;padding:0 9px;border:1px solid #e8e7e3;border-radius:11px;outline:0;color:#68696c;background:#fff;font:inherit;font-size:11px}.hidden-image-input{display:none}.image-message-card{display:block;width:min(280px,100%);padding:0;border:0;border-radius:13px;overflow:hidden;background:#f2f2f2;cursor:zoom-in}.image-preview-overlay{align-items:center}.image-preview-close{position:absolute;top:calc(env(safe-area-inset-top) + 18px);right:18px;width:36px;height:36px;border:0;border-radius:50%;color:#555;background:#fff;font-size:25px;line-height:1;cursor:pointer}.image-preview-dialog{max-width:min(94vw,700px);max-height:90vh;padding:8px;border-radius:18px;background:#fff}.image-preview-dialog img{display:block;max-width:100%;max-height:82vh;object-fit:contain;border-radius:12px}.image-preview-dialog{max-width:min(94vw,700px);max-height:90vh;padding:8px;border-radius:18px;background:#fff}.image-preview-dialog img{display:block;max-width:100%;max-height:82vh;object-fit:contain;border-radius:12px}.toggle-switch{width:43px;height:26px;position:relative;flex:none;padding:0;border:0;border-radius:16px;background:#e7e7e5;cursor:pointer;transition:background .2s}.toggle-switch i{width:20px;height:20px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.toggle-switch.on{background:#34c759}.toggle-switch.on i{transform:translateX(17px)}.history-setting-card{flex-wrap:wrap}.history-setting-card .chat-setting-copy{flex-basis:calc(100% - 60px)}.settings-row-action{padding:7px 12px;border:1px solid #e8e8e6;border-radius:16px;color:#77787a;background:#fff;font-size:10px;cursor:pointer}.settings-row-action.restart-action{color:#c17870}.chat-settings-overlay{z-index:38}.chat-settings-sheet{height:min(62dvh,480px)}.memory-panel{padding:17px}.contacts-overlay{position:fixed;inset:0;z-index:30;display:flex;justify-content:center;align-items:stretch;padding:0 12px;background:#28282a38;backdrop-filter:blur(8px)}.contacts-page{width:min(100%,560px);display:flex;flex-direction:column;margin:auto;max-height:min(90dvh,760px);padding:19px 20px 16px;border:1px solid #ffffffd9;border-radius:28px;background:#f5f4f2;box-shadow:0 24px 80px #25252525}.contacts-header{display:grid;grid-template-columns:40px 1fr 40px;align-items:center}.contacts-header>button{width:34px;height:34px;border:0;border-radius:50%;color:#76777a;background:#ffffffc9;font-size:27px;line-height:1;cursor:pointer}.contacts-header>div{text-align:center}.contacts-header>div>span{color:#aaa9a5;font-size:8px;letter-spacing:.18em}.contacts-header h2{margin:3px 0 0;color:#4c4d50;font-size:19px;font-weight:600}.contacts-header>i{width:34px}.contacts-intro{margin:16px 0 13px;color:#929294;text-align:center;font-size:11px}.contact-search{height:46px;flex:none;margin-bottom:10px;border-color:#fff;border-radius:25px;background:#fff}.contact-results{flex:1;min-height:100px;overflow:auto}.contact-row{width:100%;min-height:68px;display:flex;align-items:center;gap:11px;padding:8px 3px;border:0;border-bottom:1px solid #e8e7e4;background:transparent;text-align:left;cursor:pointer}.contact-avatar{width:45px;height:45px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#696a6c;background:linear-gradient(145deg,#fff,var(--avatar-color));font-family:Georgia,serif;font-size:16px}.contact-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.contact-copy strong{overflow:hidden;color:#4c4d50;font-size:12px;font-weight:550;text-overflow:ellipsis;white-space:nowrap}.contact-copy small{overflow:hidden;color:#a2a2a3;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.contact-add{padding:6px 10px;border:1px solid #e1dfda;border-radius:18px;color:#767772;background:#ffffffa8;font-size:9px;white-space:nowrap}.contact-add.added{border-color:#e8e7e4;color:#aaa9a5;background:transparent}.contacts-empty{min-height:190px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#858589;text-align:center}.contacts-empty>span{width:42px;height:42px;display:grid;place-items:center;margin-bottom:10px;border-radius:50%;color:#aaa99e;background:#ffffffc9;font-size:18px}.contacts-empty strong{font-size:12px;font-weight:550}.contacts-empty p{max-width:240px;margin:6px 0;color:#a3a3a4;font-size:10px;line-height:1.6}.contacts-done{height:40px;flex:none;margin-top:12px;border:0;border-radius:22px;color:#5d5e60;background:#e6e5e2;font-size:11px;cursor:pointer}.contacts-fade-enter-active,.contacts-fade-leave-active{transition:opacity .2s,transform .2s}.contacts-fade-enter-from,.contacts-fade-leave-to{opacity:0;transform:translateY(8px)}.bottom-area{width:min(100% - 32px,560px);flex:none;margin:0 auto;padding:8px 0 max(10px,env(safe-area-inset-bottom));}.bottom-tools{display:flex;align-items:center;gap:12px;margin-bottom:8px}.news-search{height:62px;min-width:0;flex:1;display:flex;align-items:center;gap:15px;padding:0 20px;border:1px solid #ffffff;border-radius:36px;color:#696a6d;background:#ffffffd9;box-shadow:0 8px 25px #3333330a;text-align:left;cursor:pointer}.news-search svg{width:25px;height:25px;flex:none;fill:none;stroke:#333438;stroke-width:1.8;stroke-linecap:round}.news-search span{font-size:15px}.compose-fab{width:62px;height:62px;flex:none;display:grid;place-items:center;border:1px solid #ffffff;border-radius:50%;color:#52545a;background:#ffffffdf;box-shadow:0 8px 25px #3333330a;cursor:pointer}.compose-fab svg{width:27px;fill:currentColor;stroke:currentColor;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.compose-fab svg path:first-child{stroke:none}.bottom-nav{height:42px;display:grid;grid-template-columns:repeat(3,1fr);align-items:center;border:1px solid #ffffffb8;border-radius:24px;background:#ffffff91;box-shadow:0 5px 18px #33333308;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.bottom-nav button{height:34px;display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:18px;color:#96979a;background:transparent;font-size:11px;cursor:pointer}.bottom-nav button.selected{color:#414246;background:#ffffffd9;box-shadow:0 2px 8px #3333330b}.bottom-nav button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.conversation-overlay{position:fixed;inset:0;z-index:25;display:flex;justify-content:center;background:#fff}.conversation-page{width:min(100%,620px);height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 24px) 24px calc(env(safe-area-inset-bottom) + 30px);background:#fff}.conversation-header{height:96px;position:relative;flex:none;display:flex;align-items:flex-start;justify-content:space-between}.conversation-header .back-button,.dialog-more{width:54px;height:54px;display:grid;place-items:center;border:0;border-radius:50%;color:#08090a;background:#fff;box-shadow:0 8px 28px #0000000d;cursor:pointer}.conversation-header .back-button svg{width:30px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.conversation-identity{position:absolute;left:50%;top:13px;display:flex;flex-direction:column;align-items:center;transform:translateX(-50%);z-index:2}.conversation-identity.couple-mode{top:8px;display:grid;grid-template-columns:76px 112px 76px;grid-template-rows:76px auto;column-gap:5px;row-gap:0;justify-items:center;align-items:center}.dialog-avatar{width:94px;height:94px;position:relative;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#9caecc}.couple-mode .dialog-avatar{width:76px;height:76px}.dialog-avatar img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover}.dialog-avatar>svg{width:100%;height:100%}.couple-avatar{background-color:#e7e3dd;background-image:linear-gradient(145deg,#ede8e1,#d8d8d2);background-position:center;background-size:cover;color:#77736d;font-size:23px}.heartbeat-wave{width:112px;height:64px;display:flex;align-items:center;justify-content:center;gap:3px;grid-column:2;grid-row:1}.heartbeat-wave i{width:3px;height:6px;flex:none;border-radius:3px;background:#171717;transform-origin:center;animation:heartbeat-wave 1.1s cubic-bezier(.36,0,.64,1) infinite}.heartbeat-wave i:nth-child(1),.heartbeat-wave i:nth-child(11){height:5px;animation-delay:.02s}.heartbeat-wave i:nth-child(2),.heartbeat-wave i:nth-child(10){height:10px;animation-delay:.07s}.heartbeat-wave i:nth-child(3),.heartbeat-wave i:nth-child(9){height:17px;animation-delay:.12s}.heartbeat-wave i:nth-child(4),.heartbeat-wave i:nth-child(8){height:27px;animation-delay:.17s}.heartbeat-wave i:nth-child(5),.heartbeat-wave i:nth-child(7){height:40px;animation-delay:.22s}.heartbeat-wave i:nth-child(6){height:52px;animation-delay:.27s}@keyframes heartbeat-wave{0%,100%{transform:scaleY(.24);opacity:.45}50%{transform:scaleY(1);opacity:1}}.couple-mode .character-avatar{grid-column:1;grid-row:1}.couple-mode .couple-avatar{grid-column:3;grid-row:1}.couple-mode .identity-name{grid-column:1 / 4;grid-row:2;margin-top:-2px}.identity-name{position:relative;display:flex;align-items:center;margin-top:-8px;padding:7px 14px 8px 19px;border:1px solid #ffffffd9;outline:0;appearance:none;-webkit-appearance:none;border-radius:30px;color:#08090a;background:linear-gradient(135deg,#ffffffed,#f8f8f8d9);box-shadow:0 5px 22px #0000000a;backdrop-filter:blur(18px) saturate(1.35);-webkit-backdrop-filter:blur(18px) saturate(1.35);font-family:inherit;font-size:19px;font-weight:750;white-space:nowrap;cursor:pointer}.identity-name:focus-visible{outline:2px solid #d8d8d8;outline-offset:2px}.identity-name i{margin-left:5px;color:#aeb1b3;font-size:25px;font-style:normal}.dialog-more svg{width:31px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.message-list{flex:1;min-height:0;overflow:auto;padding:111px 0 18px;scrollbar-width:none}.load-older-messages{display:block;margin:0 auto 14px;padding:2px 0;border:0;color:#8d8d91;background:transparent;font:inherit;font-size:11px;line-height:1.3;cursor:pointer}.day-label{display:none}.message-row{width:100%;min-width:0;display:flex;align-items:flex-end;gap:0;margin:0 0 12px}.message-row.them{justify-content:flex-start}.message-row.me{justify-content:flex-end;flex-wrap:wrap}.tiny-avatar{display:none}.message-content-stack{width:88%;max-width:88%;min-width:0;flex:0 1 88%;display:flex;flex-direction:column;align-items:flex-start;gap:7px}.message-row.them .message-content-stack{min-width:0}.message-row.me .message-content-stack{align-items:flex-end}.message-bubble{position:relative;display:block;box-sizing:border-box;width:fit-content;max-width:100%;min-width:0;flex:0 1 auto;margin:0;padding:13px 17px;border-radius:27px;color:#111;background:#e9e9eb;font-family:"Source Han Sans SC","思源黑体","Noto Sans SC",sans-serif;font-size:18px;font-weight:500;line-height:1.4;overflow-wrap:anywhere}.character-status-card{width:min(270px,100%);display:flex;flex-direction:column;gap:9px;padding:11px 13px;border:1px solid #eeece8;border-radius:20px;background:linear-gradient(145deg,#fbfaf8,#f3f1ed);box-shadow:0 5px 16px #71695c0d;animation:status-card-in .2s ease-out}.thought-preview{width:min(300px,100%);overflow:visible;animation:status-card-in .2s ease-out}.thought-preview-toggle{width:auto;max-width:100%;min-height:25px;display:flex;align-items:center;gap:6px;padding:0;border:0;color:#8b8b8b;background:transparent;text-align:left;font-size:10px;font-weight:500;cursor:pointer}.thought-bulb-icon{width:13px;height:13px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;color:#b7a77f}.thought-spark{width:14px;height:14px;display:grid;place-items:center;color:#777;font-size:13px;animation:thought-pulse 1.8s ease-in-out infinite}.thought-chevron{margin-left:0;color:#9a9a9a;font-size:16px;line-height:1;transition:transform .18s}.thought-preview.expanded .thought-chevron{transform:rotate(90deg)}.thought-preview p{margin:3px 0 4px 21px;padding:0;color:#777;font-size:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.thought-preview-toggle:focus-visible{outline:2px solid #c9bfb3;outline-offset:3px;border-radius:4px}@keyframes thought-pulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}@media(prefers-reduced-motion:reduce){.thought-spark{animation:none}}.status-card-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;color:#aaa39a;font-size:8px;letter-spacing:.16em}.status-card-heading i{color:#b8ad9d;font-size:12px;font-style:normal}.status-metric{display:grid;grid-template-columns:47px 1fr 24px;align-items:center;gap:8px;color:#817c74;font-size:9px}.status-metric strong{color:#777169;text-align:right;font-size:9px;font-weight:600;font-variant-numeric:tabular-nums}.status-track{height:5px;overflow:hidden;border-radius:8px;background:#e9e6e0}.status-track i{height:100%;display:block;border-radius:inherit;background:#b5bfae;transition:width .35s ease}.status-metric.anger .status-track i{background:#d1b2a9}.status-metric.sadness .status-track i{background:#b2bdc9}@keyframes status-card-in{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}.message-row.them .message-bubble:after,.message-row.me .message-bubble:after{content:"";position:absolute;bottom:-7px;width:17px;height:18px;background:inherit;clip-path:path("M 0 0 C 1 8 4 13 17 18 C 11 13 10 7 10 0 Z");pointer-events:none}.message-row.them.has-tail .message-bubble:after,.message-row.me.has-tail .message-bubble:after{display:block}.message-row.them:not(.has-tail) .message-bubble:after,.message-row.me:not(.has-tail) .message-bubble:after{display:none}.message-row.them .message-bubble:after{left:7px;transform:scaleX(-1)}.message-row.me .message-bubble{border-radius:27px;color:#fff;background:#35a9ed}.message-row.me .message-bubble:after{right:7px}.message-row time{display:none}.message-row.me time{display:block;flex-basis:100%;padding:4px 8px 0 0;color:#8d8d91;text-align:right;font-size:13px;font-weight:600}.message-row.me .delivery-status{display:block;flex-basis:100%;margin-top:-4px;padding-right:8px;color:#99999d;text-align:right;font-size:11px;font-weight:500}/* Instagram-inspired compact composer: attachment, rounded message field, then camera/send. */
.attachment-backdrop{position:fixed;inset:0;z-index:45;background:transparent}.attachment-panel{position:absolute;left:16px;bottom:calc(env(safe-area-inset-bottom) + 76px);width:150px;display:flex;flex-direction:column;padding:6px;border:1px solid #f1f1f1;border-radius:18px;background:#fff;box-shadow:0 5px 20px #0000000a}.attachment-panel button{height:48px;display:flex;align-items:center;gap:12px;padding:0 11px;border:0;border-radius:12px;color:#27282a;background:#fff;text-align:left;font-size:14px;cursor:pointer}.attachment-panel button:active{background:#f7f7f7}.attachment-icon{width:25px;height:25px;display:grid;place-items:center;color:#555;font-size:18px}.feature-dialog{align-self:center}.feature-field{display:flex;flex-direction:column;gap:8px;margin:8px 0;color:#666;font-size:12px}.feature-field textarea,.feature-field input{width:100%;box-sizing:border-box;padding:12px;border:1px solid #e8e8e8;border-radius:12px;outline:none;color:#333;background:#fafafa;font:inherit;font-size:14px;line-height:1.5}.feature-field textarea{resize:vertical}.feature-dialog footer button:disabled{opacity:.4;cursor:not-allowed}.text-image-card{width:170px;min-height:218px;box-sizing:border-box;display:flex;flex-direction:column;gap:0;padding:8px 8px 10px;border:0;border-radius:3px;color:#45434a;background:#fff;box-shadow:0 5px 14px #28232a16;text-align:left;cursor:zoom-in;transform:rotate(-2deg);transition:transform .2s,box-shadow .2s}.text-image-card:hover{transform:rotate(0) translateY(-2px);box-shadow:0 9px 20px #28232a1c}.polaroid-photo{min-height:174px;flex:1;display:flex;flex-direction:column;overflow:hidden;padding:12px 11px;border-radius:1px;background:linear-gradient(145deg,#f7f3ed,#eee9e1)}.message-row.me .polaroid-photo{background:linear-gradient(145deg,#f6f0fa,#eee5f4)}.polaroid-character .polaroid-photo{background:linear-gradient(145deg,#f6f3ee,#eee9df)}.special-card-label{display:block;margin-bottom:10px;color:#a49a8e;font-size:8px;letter-spacing:.14em}.polaroid-copy{display:-webkit-box;overflow:hidden;color:#514d49;font-family:Georgia,"Noto Serif SC",serif;font-size:12px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:6}.polaroid-caption{height:25px;display:flex;align-items:flex-end;justify-content:center;color:#a19a91;font-family:Georgia,serif;font-size:10px;font-style:italic;letter-spacing:.04em}.polaroid-overlay{position:fixed;inset:0;z-index:105;display:flex;align-items:center;justify-content:center;padding:24px;background:#24232955;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}.polaroid-close{position:absolute;top:calc(env(safe-area-inset-top) + 18px);right:18px;width:38px;height:38px;border:0;border-radius:50%;color:#4d4a4e;background:#ffffffdf;font-size:26px;line-height:1;cursor:pointer}.polaroid-expanded{width:min(82vw,340px);min-height:min(112vw,440px);box-sizing:border-box;display:flex;flex-direction:column;padding:15px 15px 20px;border-radius:4px;color:#45434a;background:#fff;box-shadow:0 26px 70px #12111645;transform:rotate(-2deg)}.polaroid-expanded-photo{min-height:0;flex:1;display:flex;flex-direction:column;overflow:auto;padding:clamp(18px,7vw,30px);background:linear-gradient(145deg,#f7f3ed,#eee9e1)}.polaroid-expanded-photo p{margin:0;color:#514d49;font-family:Georgia,"Noto Serif SC",serif;font-size:clamp(16px,4.5vw,21px);line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere}.polaroid-expanded-caption{height:62px;display:flex;align-items:flex-end;justify-content:center;color:#9b9389;font-family:Georgia,serif;font-size:15px;font-style:italic;letter-spacing:.06em}.polaroid-lift-enter-active .polaroid-expanded{animation:polaroid-lift-in .48s cubic-bezier(.2,1.25,.4,1) both}.polaroid-lift-leave-active{transition:opacity .22s}.polaroid-lift-leave-to{opacity:0}@keyframes polaroid-lift-in{from{opacity:.35;transform:translateY(70px) scale(.35) rotate(-12deg)}to{opacity:1;transform:translateY(0) scale(1) rotate(-2deg)}}@media(prefers-reduced-motion:reduce){.polaroid-lift-enter-active .polaroid-expanded{animation:none}.text-image-card{transition:none}}.transfer-card{width:210px;min-height:82px;display:flex;align-items:center;gap:12px;padding:13px;border:0;border-radius:15px;color:#fff;background:#62b982;text-align:left;cursor:pointer}.message-row.me .transfer-card{background:#49aa70}.transfer-icon{width:35px;height:35px;display:grid;place-items:center;border:1px solid #ffffff75;border-radius:50%;font-size:20px}.transfer-copy{display:flex;flex:1;flex-direction:column;gap:4px}.transfer-copy strong{font-size:12px;font-weight:500}.transfer-copy b{font-size:20px;font-weight:650}.transfer-copy small{font-size:10px;opacity:.85}.transfer-action-note{color:#777;font-size:13px}.composer{height:auto;min-height:66px;flex:none;display:flex;align-items:center;gap:9px;padding:8px 11px;border:0;border-radius:0;background:#fff;box-shadow:none}
.composer-input-row{width:100%;min-height:46px;display:flex;align-items:center;gap:9px;border:0;background:transparent}
.composer-tool{width:38px;height:38px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#161719;background:transparent;cursor:pointer}
.composer-tool svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.composer-add svg{width:29px;height:29px;stroke-width:1.8}
.composer-field{min-width:0;min-height:42px;flex:1;display:flex;align-items:center;gap:5px;padding:3px 5px 3px 15px;border:1px solid #dedfe2;border-radius:24px;background:#f7f7f8}
.composer textarea{width:0;min-width:0;min-height:28px;max-height:110px;flex:1;resize:none;overflow-y:auto;margin:0;padding:6px 0;border:0;outline:0;color:#171819;background:transparent;text-align:left;font-size:15px;line-height:1.35;user-select:text}
.composer textarea::placeholder{color:#8e8e93;opacity:1}
.composer-camera{width:32px;height:32px;color:#62646a}
.composer-camera svg{width:21px;height:21px;stroke-width:1.8}
.composer-mic{width:38px;height:38px}
.send-button{width:40px;height:40px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#fff;background:#3797f0;cursor:pointer}
.send-button svg{width:21px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.send-button:disabled{opacity:.45;cursor:not-allowed}
.receive-button{width:33px;height:36px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#777;background:transparent;cursor:pointer}
.receive-button svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.receive-button:disabled{opacity:.35;cursor:not-allowed}
.composer-with-quote{height:auto;min-height:68px;flex-direction:column;align-items:stretch;gap:3px;padding:7px 9px}
.composer-with-quote .composer-input-row{min-height:46px}
@media(max-width:600px){.composer{min-height:60px;padding:5px 9px}.composer-input-row{gap:6px}.composer-tool{width:34px;height:36px}.composer-add svg{width:27px;height:27px}.composer-field{min-height:40px;padding-left:12px}.composer textarea{font-size:14px}.send-button{width:36px;height:36px}.receive-button{width:29px}}
.conversation-fade-enter-active,.conversation-fade-leave-active{transition:opacity .18s ease}.conversation-fade-enter-from,.conversation-fade-leave-to{opacity:0}@media(max-width:420px){.conversation-page{padding-right:18px;padding-left:18px}.message-bubble{max-width:90%;font-size:16px}.composer{gap:2px;padding-right:7px;padding-left:7px}.composer-tool{width:34px}.composer input{margin-left:4px;padding:0 8px;font-size:14px}}
/* Compact proportions tuned to the reference phone UI. */
@media(max-width:600px){.conversation-page{padding-right:18px;padding-left:18px}.conversation-header{height:78px}.conversation-header .back-button,.dialog-more{width:44px;height:44px}.conversation-header .back-button svg{width:25px}.dialog-more svg{width:26px}.conversation-identity{top:7px}.dialog-avatar{width:70px;height:70px}.conversation-identity.couple-mode{top:4px;grid-template-columns:58px 90px 58px;grid-template-rows:58px auto;column-gap:4px}.couple-mode .dialog-avatar{width:58px;height:58px}.heartbeat-wave{width:90px;height:54px;gap:2px}.heartbeat-wave i{width:2.5px}.identity-name{margin-top:-7px;padding:5px 11px 6px 14px;font-size:15px}.couple-mode .identity-name{margin-top:0}.identity-name i{font-size:20px}.message-list{padding-top:82px;padding-bottom:12px} .message-list .message-row{margin-bottom:10px}.message-list .message-row.has-tail{margin-bottom:16px}.message-bubble{max-width:86%;padding:9px 13px;border-radius:21px;font-size:15px;line-height:1.4}.message-row.me .message-bubble{border-radius:21px}.message-row.them .message-bubble:after,.message-row.me .message-bubble:after{bottom:-5px;width:13px;height:14px}.message-row.me time{padding-top:3px;font-size:11px}.composer{height:54px;gap:1px;padding:4px 6px}.send-button{width:34px;height:36px}.send-button svg{width:24px}.composer-tool{width:31px;height:36px}.composer-tool svg{width:21px;height:21px}.composer input{height:42px;margin-left:3px;padding:0 8px;font-size:14px}.message-list{scroll-padding-top:80px}}
.typing-row{display:flex;align-items:flex-end;justify-content:flex-start;gap:8px;margin:4px 0 16px}.typing-row.me{justify-content:flex-end}.typing-row.me .tiny-avatar{order:1}.typing-row.me .typing-bubble{order:0;border-radius:30px;color:#315bb5;background:#edf3ff;box-shadow:none}.typing-row.them .typing-bubble{border-radius:30px;color:#4b4f55;background:#fff;box-shadow:0 3px 10px rgba(38,42,48,.065),0 1px 3px rgba(38,42,48,.035)}.typing-bubble{height:42px;min-width:58px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 15px;border-radius:30px}.typing-bubble i{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.65;animation:typing-bounce .9s ease-in-out infinite}.typing-row.me .typing-bubble i{opacity:.9}.typing-bubble i:nth-child(2){animation-delay:.14s}.typing-bubble i:nth-child(3){animation-delay:.28s}@keyframes typing-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}@media(prefers-reduced-motion:reduce){.typing-bubble i{animation:none;opacity:.8}}
.reply-status{margin:0 20px 8px;color:#99918a;font-size:12px}.receive-button{width:34px;height:36px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#303134;background:transparent;cursor:pointer}.receive-button svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}.receive-button:disabled{opacity:.35;cursor:not-allowed}.reply-error{color:#b46f66}
.acrylic-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:flex-end;justify-content:center;padding:16px;background:#24242438;backdrop-filter:blur(10px) saturate(1.15);-webkit-backdrop-filter:blur(10px) saturate(1.15)}
.message-menu-backdrop{position:fixed;inset:0;z-index:100;background:#00000008}.message-menu-group{position:fixed;z-index:1;width:min(280px,calc(100vw - 24px));max-height:min(82dvh,480px);display:flex;flex-direction:column;gap:8px;transform-origin:var(--menu-origin-x) var(--menu-origin-y);animation:message-pop-in .48s cubic-bezier(.16,1.35,.35,1) both;filter:drop-shadow(0 18px 32px #1113)}.reaction-picker{height:52px;flex:none;display:flex;align-items:center;justify-content:space-around;padding:0 8px;border:1px solid #ffffffb8;border-radius:28px;background:#ffffffa8;box-shadow:inset 0 1px #ffffffb0;backdrop-filter:blur(26px) saturate(1.55);-webkit-backdrop-filter:blur(26px) saturate(1.55)}.reaction-picker button{width:38px;height:40px;padding:0;border:0;border-radius:50%;background:transparent;font-size:25px;cursor:pointer;transition:transform .15s}.reaction-picker button:active{transform:scale(1.22)}.message-action-sheet{overflow:auto;padding:6px 16px;border:1px solid #ffffffb8;border-radius:18px;background:linear-gradient(145deg,#ffffffc9,#f7f7f7a8);box-shadow:inset 0 1px #ffffffc9;backdrop-filter:blur(30px) saturate(1.55);-webkit-backdrop-filter:blur(30px) saturate(1.55);color:#262626;scrollbar-width:thin}.message-action-title{margin:4px 0 8px;color:#8e8e93;text-align:left;font-size:13px}.message-action-sheet>button{width:100%;height:48px;display:flex;align-items:center;justify-content:space-between;padding:0;border:0;border-bottom:1px solid #ffffff70;background:transparent;color:#262626;text-align:left;font-size:16px;font-weight:400;cursor:pointer}.message-action-sheet>button:last-child{border:0}.message-action-sheet>button:active{color:#8e8e93}.message-action-sheet>button>span:last-child{color:#262626;font-size:18px}.message-action-sheet>button.message-delete-action,.message-action-sheet>button.message-delete-action>span:last-child{color:#ed4956}.message-action-sheet>button:disabled{opacity:.45}.message-action-sheet>button.message-cancel-action{height:46px;justify-content:center;margin-top:7px;border:0;border-radius:13px;font-weight:600}.message-edit-dialog{width:min(100%,440px);padding:18px;border:1px solid #ffffffc9;border-radius:28px;background:linear-gradient(145deg,#ffffffed,#f4f3f0e8);box-shadow:0 22px 70px #17171730;backdrop-filter:blur(28px) saturate(1.35);-webkit-backdrop-filter:blur(28px) saturate(1.35);color:#484744;animation:message-sheet-in .22s ease-out}.message-reaction{position:absolute;right:2px;bottom:-12px;z-index:1;min-width:27px;height:24px;display:grid;place-items:center;padding:0 5px;border:2px solid #fff;border-radius:14px;background:#fff;box-shadow:0 2px 8px #00000018;font-size:15px;line-height:1}.message-row.me .message-reaction{right:auto;left:2px}.message-reaction.character-reaction{animation:character-reaction-pop .42s cubic-bezier(.18,.89,.32,1.35) both;transform-origin:center}.message-edit-dialog{align-self:center}
.message-edit-dialog{align-self:center}.message-edit-dialog h3{margin:0 0 14px;font-size:16px;font-weight:600}.message-edit-dialog textarea{width:100%;resize:vertical;padding:12px;border:1px solid #e8e5df;border-radius:16px;outline:none;color:#4b4945;background:#ffffffc9;font:inherit;font-size:14px;line-height:1.5}.message-edit-dialog footer{display:flex;justify-content:flex-end;gap:9px;margin-top:14px}.message-edit-dialog footer button,.multi-delete-bar button{padding:9px 15px;border:0;border-radius:18px;color:#625f59;background:#eeece8;font-size:12px;cursor:pointer}.message-edit-dialog footer button:last-child{color:white;background:#8d9589}
.multi-delete-bar{position:fixed;left:0;right:0;bottom:0;z-index:90;display:flex;align-items:center;gap:10px;padding:12px 18px calc(12px + env(safe-area-inset-bottom));border:0;border-top:1px solid #e7e8e8;border-radius:0;background:#f8f8f8;color:#67645f;font-size:12px}.multi-delete-bar span{flex:1}.multi-delete-bar button{padding:8px 15px;border:0;border-radius:8px;box-shadow:none;font-size:13px;cursor:pointer}.multi-delete-bar button:disabled{opacity:.45}.multi-delete-button{color:#fff !important;background:#ed4956 !important}.multi-cancel-button{color:#777 !important;background:#e9e9e9 !important}
:deep(.message-list){padding-bottom:100px!important}
:deep(.message-selection-check.checked){color:#32b76a!important}
:deep(.message-selection-check){color:#a6a6a6!important}
.message-bubble-wrap{flex-direction:column;align-items:flex-start}.quoted-message{width:min(100%,300px);box-sizing:border-box;display:flex;flex-direction:column;gap:3px;margin:0 0 -3px;padding:8px 11px;border-left:2px solid #c9ccd1;border-radius:8px 8px 0 0;color:#6f747b;background:rgba(245,246,248,.9);font-size:11px;line-height:1.4}.quoted-message strong{overflow:hidden;color:#727780;font-size:10px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.quoted-message span{display:-webkit-box;overflow:hidden;color:#888d94;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}.message-row.me .quoted-message{align-self:flex-end;border-left:0;border-right:2px solid #aebfe2}
.message-bubble-wrap{position:relative;width:100%;max-width:100%;align-self:inherit;display:flex}.message-row.me .message-bubble-wrap{align-self:stretch;margin-left:auto;justify-content:flex-end}.message-row.them .message-bubble-wrap{align-self:stretch;margin-right:auto;justify-content:flex-start}.quoted-message{width:fit-content;max-width:min(100%,300px);box-sizing:border-box;display:flex;flex-direction:column;gap:3px;margin:0 0 8px;padding:0 0 7px;border-bottom:1px solid rgba(110,116,124,.14);color:#8a8a8d;font-size:11px;line-height:1.35}.quoted-message strong{font-size:10px;font-weight:650;opacity:.85}.quoted-message>span{overflow:hidden;display:-webkit-box;opacity:.9;text-overflow:ellipsis;-webkit-box-orient:vertical;-webkit-line-clamp:2}.message-row.me .quoted-message{align-self:stretch;color:#6e83b8;text-align:left}.composer-with-quote{height:auto;min-height:68px;flex-direction:column;align-items:stretch;gap:3px;padding:7px 9px}.quote-compose-preview{display:flex;align-items:center;gap:8px;padding:4px 8px 5px;border-radius:13px;background:#f3f3f2}.quote-compose-preview>span{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}.quote-compose-preview strong{color:#787873;font-size:10px;font-weight:600}.quote-compose-preview>span>span{overflow:hidden;color:#999994;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.quote-compose-preview button{width:23px;height:23px;border:0;border-radius:50%;color:#888;background:#e7e7e5;font-size:17px;line-height:1;cursor:pointer}.composer-input-row{width:100%;min-height:48px;display:flex;align-items:center;gap:4px;border:0;background:transparent}.composer-input-row textarea{margin-left:8px}.message-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);z-index:110;transform:translateX(-50%);padding:11px 18px;border:1px solid #ffffffc9;border-radius:22px;background:#ffffffed;box-shadow:0 8px 28px #2222;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#514f4a;font-size:12px;white-space:nowrap}
:deep(.conversation-page){height:100%;min-height:0;box-sizing:border-box;padding:calc(env(safe-area-inset-top)) 0 0}
:deep(.conversation-header){height:72px!important;box-sizing:border-box;display:flex!important;flex-direction:row!important;align-items:center;gap:6px;padding:0 15px;border-bottom:1px solid #e8e8e8a8;background:#ffffffc9;backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5)}
:deep(.conversation-back),:deep(.conversation-settings){width:38px;height:38px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#28292b;background:transparent;box-shadow:none;cursor:pointer;transition:background .18s,transform .18s}
:deep(.conversation-back:active),:deep(.conversation-settings:active){background:#00000009;transform:scale(.94)}
:deep(.conversation-back svg){width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
:deep(.conversation-settings svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
:deep(.conversation-identity-copy){min-width:0;display:flex;flex-direction:column;gap:2px}:deep(.conversation-subtitle){color:#929292;font-size:12px;font-weight:500}:deep(.conversation-actions){display:flex;align-items:center;gap:8px}:deep(.conversation-call),:deep(.conversation-settings){width:38px;height:38px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#08090a;background:transparent;cursor:pointer}:deep(.conversation-call svg),:deep(.conversation-settings svg){width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}:deep(.conversation-avatar span){font-size:16px}:deep(.message-list){padding:8px 16px 16px}:deep(.chat-time-divider){margin:8px auto 18px;color:#999;font-size:13px;font-weight:600;text-align:center}:deep(.message-row){gap:9px;margin-bottom:10px}:deep(.message-row.them .tiny-avatar){width:42px;height:42px;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:var(--avatar-color,#ddd);color:#555;font-size:14px}:deep(.message-row.them .tiny-avatar img){width:100%;height:100%;object-fit:cover}:deep(.message-content-stack){width:auto;max-width:calc(100% - 50px);flex:0 1 auto;gap:5px}:deep(.message-row.me .message-content-stack){max-width:calc(100% - 50px)}:deep(.message-row.me .tiny-avatar){width:42px;height:42px;display:grid;place-items:center;flex:none;order:2;overflow:hidden;border-radius:50%;background-color:#eee;background-position:center;background-size:cover}:deep(.message-bubble){padding:12px 17px;border-radius:23px;color:#111;background:#f0f0f1;font-size:17px;font-weight:550;line-height:1.55}:deep(.message-row.them .message-bubble){background:#fff;box-shadow:0 3px 12px rgba(38,42,48,.10),0 1px 3px rgba(38,42,48,.05)}:deep(.message-row.me .message-bubble){color:#fff;background:linear-gradient(135deg,#a128e3,#7932ed)}:deep(.message-row.them .message-bubble:after),:deep(.message-row.me .message-bubble:after){display:none}:deep(.message-row.me time){display:none}:deep(.message-row time){display:none}:deep(.transfer-card){width:min(100%,270px);min-height:130px;align-items:flex-start;gap:0;padding:15px 18px;border-radius:15px;background:#929292}:deep(.message-row.me .transfer-card){background:#929292}:deep(.transfer-icon){display:none}:deep(.transfer-copy){gap:9px}:deep(.transfer-copy strong){order:2;font-size:14px}:deep(.transfer-copy b){order:1;font-size:30px}:deep(.transfer-copy small){order:3;font-size:13px}:deep(.composer){min-height:60px;box-sizing:border-box;gap:8px;margin:0 15px;padding:5px 10px;border-radius:32px;background:linear-gradient(110deg,#f0eefc,#cccafa);box-shadow:none}:deep(.composer-input-row){gap:8px}:deep(.composer-field){border:0;background:transparent;padding:3px 5px}:deep(.composer textarea){font-size:16px}:deep(.composer-add){order:-1;width:42px;height:42px;color:#fff;background:#5c56f3}:deep(.composer-add svg){width:25px;height:25px}:deep(.composer-camera){display:none}:deep(.composer-mic){order:2}:deep(.send-button){order:2;background:#6e5af4}:deep(.receive-button){display:none}:deep(.message-row.them .message-content-stack time){display:none}
</style>
<style scoped>
.my-moment-generate-icon{width:36px;height:36px;display:grid;place-items:center;margin:-5px 0 12px auto;padding:0;border:0;border-radius:50%;color:#63796a;background:transparent;box-shadow:none;cursor:pointer;transition:transform .16s,color .16s}
.my-moment-generate-icon:hover:not(:disabled){color:#3f604b;transform:scale(1.12)}
.my-moment-generate-icon:active:not(:disabled){transform:scale(.94)}
.my-moment-generate-icon:disabled{opacity:.45;cursor:not-allowed}
.my-moment-generate-icon svg{width:25px;height:25px;display:block;fill:#63796a;stroke:none}
.preference-icon .moment-interaction-bolt{width:20px;height:20px;fill:#fff;stroke:none}
.moment-generation-progress{position:fixed;right:18px;bottom:calc(env(safe-area-inset-bottom) + 78px);z-index:90;display:flex;align-items:center;gap:10px;max-width:calc(100vw - 36px);padding:11px 14px;border:1px solid #e8e6df;border-radius:14px;color:#62635f;background:#fff;box-shadow:0 8px 28px #0002;font-size:12px}
.moment-generation-progress button{padding:5px 9px;border:1px solid #e6e6e2;border-radius:8px;color:#666;background:#fff;font:inherit}
.moment-generation-spinner{width:15px;height:15px;flex:none;border:2px solid #dfe5df;border-top-color:#718779;border-radius:50%;animation:moment-spinner .75s linear infinite}
@keyframes moment-spinner{to{transform:rotate(360deg)}}
.moment-generation-controls{display:flex;flex-direction:column;align-items:flex-start;gap:7px;margin:0 0 14px;padding:12px;border:1px solid #e8e9e5;border-radius:14px;background:rgba(255,255,255,.66)}
.moment-generate-button{min-height:40px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 15px;border:1px solid #718779;border-radius:11px;color:#fff;background:linear-gradient(135deg,#829987,#6e8274);box-shadow:0 3px 9px rgba(75,100,80,.14);font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:transform .16s,box-shadow .16s,opacity .16s}
.moment-generate-button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 13px rgba(75,100,80,.2)}
.moment-generate-button:active:not(:disabled){transform:scale(.98)}
.moment-generate-button:disabled{opacity:.56;cursor:wait}
.moment-generate-icon{font-size:15px}
.moment-cancel-button{padding:5px 10px;border:1px solid #e4e4e0;border-radius:9px;color:#747570;background:#fff;font:inherit;font-size:12px;cursor:pointer}
.moment-generation-hint,.moment-generation-error{font-size:11px;line-height:1.5}
.moment-generation-hint{color:#999}
.moment-generation-error{color:#b04d48}
:deep(.moment-generation-error-card header button){min-height:32px;padding:0 12px;border:1px solid #e5e8e3;border-radius:10px;color:#66766a;background:#f5f7f4;font:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:background .16s,transform .16s}
:deep(.moment-generation-error-card header button:hover){background:#eaf0e9}
:deep(.moment-generation-error-card header button:active){transform:scale(.97)}
:deep(.moment-generation-error-confirm){width:100%;min-height:40px;margin-top:12px;border:0;border-radius:12px;color:#fff;background:linear-gradient(135deg,#829987,#6e8274);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.visitor-warning-inline{margin:10px 0 14px 42px;padding:14px 15px;border:1px solid #e8e6df;border-radius:14px;color:#62635f;background:rgba(255,255,255,.82);box-shadow:0 5px 18px rgba(50,55,48,.06)}
.visitor-warning-heading{display:flex;align-items:center;gap:9px;color:#4f5a51;font-size:14px}
.visitor-warning-heading>span{width:21px;height:21px;display:grid;place-items:center;border-radius:50%;color:#fff;background:#a79b78;font-size:12px}
.visitor-warning-inline p{margin:9px 0;color:#777;font-size:12px;line-height:1.65}
.visitor-warning-inline p strong{color:#555}
.visitor-warning-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.visitor-warning-actions button{padding:8px 12px;border:1px solid #e6e6e2;border-radius:10px;color:#666;background:#fff;font:inherit;font-size:12px}
.visitor-warning-actions .visitor-warning-confirm{border-color:#758b79;color:#fff;background:#758b79}
@media(max-width:600px){.visitor-warning-inline{margin-left:0}}
/* 朋友圈模板位于多个 scoped style 块中，深层组件选择器确保动态区样式实际命中 DOM。 */
:deep(.moments-page){color:#343638;background:#fff}
:deep(.moment-manage){display:flex;gap:10px;margin-top:5px}.moment-manage button{padding:2px 0;border:0;color:#899096;background:transparent;font:inherit;font-size:11px;cursor:pointer}
:deep(.moment-post){display:flex;align-items:flex-start;gap:12px;padding:17px 0;border-bottom:1px solid #e8e7e4}
:deep(.moment-avatar){width:42px;height:42px;flex:none;display:grid;place-items:center;overflow:hidden;border:0;border-radius:50%;color:#777;background:#e8e5e0;font-size:14px}
:deep(.moment-avatar img){width:100%;height:100%;object-fit:cover}
:deep(.moment-body){min-width:0;flex:1;color:#333}
:deep(.moment-body>strong){color:#50627a;font-size:14px}
:deep(.moment-body p){margin:7px 0;color:#333;font-size:14px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
:deep(.moment-body small){display:block;margin-top:9px;color:#aaa;font-size:11px}
:deep(.moment-actions){display:flex;align-items:center;justify-content:flex-end;gap:18px;margin-top:10px;padding:2px 0;border-radius:0;background:transparent}
:deep(.moment-actions button){display:inline-flex;align-items:center;gap:5px;padding:3px 5px;border:0;border-radius:0;color:#899096;background:transparent;font:inherit;font-size:12px;cursor:pointer}
:deep(.moment-actions button:disabled){opacity:.5;cursor:not-allowed}
:deep(.moment-actions button span){color:#9a9da0}
:deep(.moment-heart){color:#a0a3a6;font-family:Arial,sans-serif;font-size:17px;line-height:1}
:deep(.moment-heart.liked){color:#6c9876}
:deep(.moment-actions button.moment-comment-button){color:#899096}
:deep(.moment-comments){margin-top:8px;padding:4px 0;border-radius:0;background:transparent;color:#4f6255;font-size:12px;line-height:1.7}
:deep(.moment-comment-dialog-backdrop){position:fixed;inset:0;z-index:96;display:grid;place-items:center;padding:20px;background:rgba(20,24,21,.28);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
:deep(.moment-comment-dialog){width:min(100%,420px);box-sizing:border-box;padding:18px;border:1px solid rgba(255,255,255,.9);border-radius:22px;background:#fff;box-shadow:0 20px 60px rgba(20,30,22,.18)}
:deep(.moment-comment-dialog header){display:flex;align-items:center;justify-content:space-between;margin-bottom:13px;color:#454746;font-size:15px}
:deep(.moment-comment-dialog header button){width:30px;height:30px;border:0;border-radius:50%;color:#888;background:#f3f4f3;font-size:22px;line-height:1;cursor:pointer}
:deep(.moment-comment-dialog-form){display:flex;flex-direction:column;align-items:flex-end;gap:12px}
:deep(.moment-comment-dialog-form textarea){width:100%;min-height:110px;box-sizing:border-box;resize:vertical;padding:11px 12px;border:1px solid #e8ebe8;border-radius:13px;outline:0;color:#454746;background:#fafbfa;font:inherit;font-size:14px;line-height:1.55}
:deep(.moment-comment-dialog-form textarea:focus){border-color:#a9c4ae;box-shadow:0 0 0 3px rgba(103,155,112,.1)}
:deep(.moment-comment-dialog-form>button){min-width:72px;height:36px;padding:0 16px;border:0;border-radius:18px;color:#fff;background:#68a875;font:inherit;font-size:13px;cursor:pointer}
:deep(.moment-comment-dialog-form>button:disabled){opacity:.48;cursor:not-allowed}
:deep(.moment-comment){display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:2px 0}
:deep(.moment-comment>span){min-width:0;overflow-wrap:anywhere}
:deep(.moment-comment strong){color:#50627a;font-size:12px}
:deep(.moment-comment button){flex:none;padding:1px 3px;border:0;color:#8794a2;background:transparent;font:inherit;font-size:11px;cursor:pointer}
:deep(.moment-comment-form){display:flex;align-items:center;gap:7px;margin-top:8px}
:deep(.moment-comment-form input){min-width:0;min-height:34px;flex:1;padding:0 10px;border:1px solid #e8e9e8;border-radius:17px;outline:0;color:#454746;background:#fff;font:inherit;font-size:12px}
:deep(.moment-comment-form input:focus){border-color:#bdc9c0}
:deep(.moment-comment-form button){flex:none;padding:6px 9px;border:0;border-radius:14px;color:#718879;background:#f1f4f1;font:inherit;font-size:11px;cursor:pointer}
:deep(.moment-comment){display:flex;align-items:flex-start;gap:9px;margin:0;padding:8px 2px;background:transparent}
:deep(.moment-comment-avatar){width:30px;height:30px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.8);border-radius:50%;color:#65806b;background:linear-gradient(145deg,#f4faf3,#e5efe5);font-size:12px;font-weight:600;box-shadow:0 2px 7px rgba(81,111,86,.1)}
:deep(.moment-comment-avatar img){width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
:deep(.moment-comment-copy){min-width:0;flex:1;display:flex;flex-direction:column;gap:3px;padding-top:1px}
:deep(.moment-comment-copy>strong){color:#608069;font-size:11px;font-weight:650}
:deep(.moment-comment-copy>span){color:#56625a;font-size:12px;line-height:1.55;overflow-wrap:anywhere}
:deep(.moment-comment>button){flex:none;margin-top:2px;padding:4px 7px;border:0;border-radius:12px;color:#6d9475;background:rgba(232,243,233,.72);font:inherit;font-size:10px;cursor:pointer}
</style>
<style scoped>
:deep(.message-bubble .message-text) { white-space: pre-wrap; overflow-wrap: anywhere; }
:deep(.conversation-overlay){background:#fff}
:deep(.conversation-page){background:#fff}
:deep(.conversation-header){height:54px!important;box-sizing:border-box;display:flex!important;flex-direction:row!important;align-items:center;gap:12px;padding:0 16px;border:0!important;border-bottom:0!important;background:#fff;backdrop-filter:none;-webkit-backdrop-filter:none}
:deep(.conversation-back),:deep(.conversation-settings){width:38px;height:38px;display:grid;place-items:center;flex:none;padding:0;border:0;border-radius:50%;color:#4b4f55;background:transparent;box-shadow:none;cursor:pointer;transition:background .18s,transform .18s}
:deep(.conversation-back:active),:deep(.conversation-settings:active){background:#0000000a;transform:scale(.94)}
:deep(.conversation-back svg){width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
:deep(.conversation-title){min-width:0;flex:1;overflow:hidden;margin:0;color:#4b4f55;text-align:left;text-overflow:ellipsis;white-space:nowrap;font-size:19px;font-weight:600;letter-spacing:-.035em}
:deep(.conversation-actions){display:flex;align-items:center;gap:4px;margin-left:auto}
:deep(.conversation-settings svg){width:21px;height:21px;fill:currentColor;stroke:none}
:deep(.conversation-settings svg circle){r:1.15}
@media(max-width:600px){:deep(.conversation-header){height:54px!important;gap:10px;padding:0 14px}:deep(.conversation-back),:deep(.conversation-settings){width:36px;height:36px}:deep(.conversation-title){font-size:19px}}

:deep(.message-row){align-items:flex-end;gap:8px;margin-bottom:16px}
:deep(.message-row:not(.has-tail)){margin-bottom:16px}
:deep(.message-row.has-tail){margin-bottom:22px}
:deep(.message-row + .message-row){margin-top:0}
:deep(.message-content-stack){gap:10px}
:deep(.message-row.me){flex-wrap:nowrap}
:deep(.message-row.them .tiny-avatar){order:0}
:deep(.message-row.them .message-content-stack){order:1;align-items:flex-start}
:deep(.message-row.me .message-content-stack){order:0;align-items:flex-end;margin-left:auto}:deep(.message-row.me .message-bubble-wrap){align-self:stretch;justify-content:flex-end}:deep(.message-row.me .message-bubble){margin-left:auto}
:deep(.message-row.me .tiny-avatar){order:1}
:deep(.message-content-stack){width:100%;max-width:calc(100% - 52px);min-width:0;flex:1 1 auto}
:deep(.message-row.them .message-content-stack),:deep(.message-row.me .message-content-stack){flex:1 1 0}
:deep(.message-row.them .message-bubble),:deep(.message-row.me .message-bubble){display:block;position:relative;width:fit-content;max-width:min(100%,300px);flex:none;min-width:0;box-sizing:border-box}
:deep(.tiny-avatar){width:40px;height:40px;flex:none;display:grid;place-items:center;align-self:flex-end;overflow:hidden;border-radius:50%;color:#555;font-size:13px;background:linear-gradient(145deg,#f1f1f1,var(--avatar-color,#dedede))}
:deep(.tiny-avatar img){width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
:deep(.user-tiny-avatar){position:relative;background-color:#e8e5e0;background-position:center;background-size:cover}
:deep(.user-tiny-avatar>span){color:#777;font-size:13px}
:deep(.message-bubble){max-width:100%;padding:13px 13px;border-radius:10px;color:#262626;background:#efefef;font-size:15px;font-weight:400;line-height:1.4}
:deep(.message-row.them .message-bubble){box-shadow:0 2px 8px rgba(38, 30, 45, .06)}
:deep(.message-row.me .message-bubble){border-radius:10px;color:#fff;background:linear-gradient(135deg,#833ab4,#c13584);font-weight:400}
:deep(.message-row.them .message-bubble:after),:deep(.message-row.me .message-bubble:after){display:none;content:none}
:deep(.chat-time-divider){width:100%;margin:13px 0 15px;color:#8e8e93;text-align:center;font-size:11px;font-weight:400;line-height:1.4}
:deep(.message-row.me time){display:none}
:deep(.message-list .message-row:not(.has-tail)){margin-bottom:16px}
:deep(.message-list .message-row.has-tail){margin-bottom:22px}
@media(max-width:600px){:deep(.message-row){gap:7px;margin-bottom:14px}:deep(.message-row:not(.has-tail)){margin-bottom:14px}:deep(.message-list .message-row.has-tail){margin-bottom:18px}:deep(.message-content-stack){gap:9px;max-width:calc(100% - 48px)}:deep(.tiny-avatar){width:40px;height:40px}:deep(.message-row.them .message-bubble),:deep(.message-row.me .message-bubble){max-width:min(78%, 300px);padding:12px 12px;font-size:14px}:deep(.message-row.me time){font-size:10px}}

@keyframes message-pop-in{0%{opacity:0;transform:scale(.48)}55%{opacity:1;transform:scale(1.075)}76%{transform:scale(.97)}100%{opacity:1;transform:scale(1)}}
@keyframes message-sheet-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
@media(prefers-reduced-motion:reduce){.message-menu-group,.message-action-sheet{animation:none}}
@media(min-width:700px){.acrylic-overlay{align-items:center}}
.chat-app{background:radial-gradient(ellipse at 8% 2%,rgba(188,232,212,.36),transparent 36%),radial-gradient(ellipse at 96% 24%,rgba(190,218,246,.34),transparent 38%),linear-gradient(155deg,#fffdf7 0%,#fbfcfa 52%,#f7fafb 100%);backdrop-filter:blur(24px) saturate(1.25);-webkit-backdrop-filter:blur(24px) saturate(1.25)}
.topbar{background:transparent}
.moments-topbar{position:absolute;top:0;left:0;right:0;z-index:4;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.moments-topbar .back-button,.moments-topbar .round-action{color:#343638;background:transparent;box-shadow:none}.moments-topbar{height:calc(env(safe-area-inset-top) + 54px);box-sizing:border-box;padding-top:env(safe-area-inset-top)}
.chat-content{background:radial-gradient(ellipse at 8% 4%,rgba(188,232,212,.36),transparent 35%),radial-gradient(ellipse at 96% 28%,rgba(190,218,246,.35),transparent 38%),linear-gradient(155deg,#fffdf7 0%,#fbfcfa 52%,#f7fafb 100%);backdrop-filter:blur(22px) saturate(1.2);-webkit-backdrop-filter:blur(22px) saturate(1.2)}
.moments-interval-control{padding:14px 16px 12px;border-bottom:1px solid rgba(0,0,0,.055);color:#5d625f}.moments-interval-control.disabled{opacity:.48}.moments-interval-heading,.moments-interval-custom{display:flex;align-items:center;justify-content:space-between;gap:14px}.moments-interval-heading{font-size:13px}.moments-interval-heading strong{color:#686e6a;font-size:13px;font-weight:600}.moments-interval-slider{width:100%;height:24px;display:block;margin:9px 0 3px;accent-color:#b9bfbb;cursor:pointer}.moments-interval-slider:disabled{cursor:not-allowed}.moments-interval-custom{font-size:12px}.moments-interval-custom input{width:84px;padding:7px 9px;border:1px solid #e3e5e3;border-radius:9px;background:rgba(255,255,255,.7);color:#555;text-align:right;font:inherit}.moments-interval-custom input:focus{outline:1px solid #c5cbc7}.moments-interval-control{padding:14px 16px 12px;border-bottom:1px solid rgba(0,0,0,.055);color:#5d625f}.moments-interval-control.disabled{opacity:.48}.moments-interval-heading,.moments-interval-custom{display:flex;align-items:center;justify-content:space-between;gap:14px}.moments-interval-heading{font-size:13px}.moments-interval-heading strong{color:#686e6a;font-size:13px;font-weight:600}.moments-interval-slider{width:100%;height:24px;display:block;margin:9px 0 3px;accent-color:#b9bfbb;cursor:pointer}.moments-interval-slider:disabled{cursor:not-allowed}.moments-interval-custom{font-size:12px}.moments-interval-custom input{width:84px;padding:7px 9px;border:1px solid #e3e5e3;border-radius:9px;background:rgba(255,255,255,.7);color:#555;text-align:right;font:inherit}.moments-interval-custom input:focus{outline:1px solid #c5cbc7}.moments-interval-control>small{display:block;margin-top:8px;color:#999;font-size:11px}.moments-page{position:absolute;inset:0;overflow:auto;background:#fff;padding-top:0;box-sizing:border-box}.moments-cover{height:min(48dvh,390px);min-height:280px;position:relative;margin-top:0;padding-top:calc(env(safe-area-inset-top) + 54px);box-sizing:border-box;background:linear-gradient(to bottom,transparent 58%,rgba(255,255,255,.24) 78%,#fff 100%),linear-gradient(145deg,#dedbd5,#b9b6b0);background-position:center;background-size:cover;cursor:pointer}.moments-cover-hint{position:absolute;right:18px;bottom:90px;color:#fff;font-size:12px;text-shadow:0 1px 8px #0008}.moments-profile{position:absolute;right:20px;bottom:-24px;display:flex;align-items:center;gap:12px;color:#fff;text-shadow:0 1px 5px #0006}.moments-profile strong{font-size:16px}.moments-avatar,.moment-avatar{width:68px;height:68px;display:grid;place-items:center;overflow:hidden;border:3px solid #fff;border-radius:50%;color:#777;background:#e8e5e0;font-size:20px}.moments-avatar img{width:100%;height:100%;object-fit:cover}.moments-feed{padding:40px 18px 24px}.moments-write{display:block;margin:0 0 14px auto;padding:8px 13px;border:0;border-radius:18px;color:#666;background:#fff;font-size:13px}.moment-post{display:flex;gap:12px;padding:17px 0;border-bottom:1px solid rgba(110,120,112,.045)}.moment-avatar{width:42px;height:42px;flex:none;border:0;font-size:14px}.moment-body{min-width:0;flex:1}.moment-body strong{color:#50627a;font-size:14px}.moment-body p{margin:7px 0;color:#333;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.moment-body small{display:block;margin-top:9px;color:#aaa;font-size:11px}.moment-image{display:block;max-width:100%;max-height:260px;margin-top:8px;border-radius:5px;object-fit:cover}.moments-empty{padding:20px 0;color:#aaa;text-align:center;font-size:12px}.moment-composer-backdrop{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:16px;background:#0005;backdrop-filter:blur(6px)}.moment-composer{width:min(100%,480px);max-height:calc(100dvh - 40px);overflow:auto;padding:17px;border-radius:20px;background:#fff}.moment-composer header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.moment-composer header button{border:0;color:#777;background:transparent}.moment-composer .moment-publish{padding:7px 14px;border-radius:16px;color:#fff;background:#738b78}.moment-composer .moment-publish:disabled{opacity:.45}.moment-composer textarea{width:100%;min-height:130px;resize:vertical;box-sizing:border-box;border:0;outline:0;font:inherit;font-size:15px}.moment-composer-tools{display:flex;align-items:flex-end;gap:10px;margin:10px 0 16px}.moment-add-image{width:76px;height:76px;display:grid;place-items:center;padding:0;border:0;border-radius:5px;color:#85888a;background:#ededed;cursor:pointer}.moment-add-image svg{width:32px;height:32px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.moment-tool-hint{padding-bottom:4px;color:#aaa;font-size:11px}.moment-image-preview{width:76px;height:76px;position:relative}.moment-image-preview img{width:100%;height:100%;border-radius:5px;object-fit:cover}.moment-image-preview button{position:absolute;top:-7px;right:-7px;width:22px;height:22px;border:0;border-radius:50%;color:white;background:#555;font-size:17px}.moment-option{min-height:48px;display:flex;align-items:center;gap:10px;border:0;border-bottom:1px solid #f0f0ef;color:#454746;background:transparent;text-align:left;font:inherit;font-size:13px;cursor:pointer}.moment-option-icon{width:22px;flex:none;color:#858b86;text-align:center;font-size:17px}.moment-option>span:nth-child(2){flex:none}.moment-option small{min-width:0;flex:1;overflow:hidden;color:#999;text-align:right;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.moment-option b{flex:none;color:#b6b8b6;font-size:19px;font-weight:400}.moment-option:active{background:#f8f9f7}.moment-friend-avatar{width:36px;height:36px;display:grid;place-items:center;flex:none;overflow:hidden;border-radius:50%;color:#68776c;background:#edf0eb;font-size:14px}.moment-friend-avatar img{width:100%;height:100%;object-fit:cover}.moment-friend-avatar>span{display:grid;width:100%;height:100%;place-items:center}.moment-composer>input[type=file],.moments-page>input[type=file]{position:absolute!important;width:1px!important;height:1px!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;opacity:0!important;pointer-events:none!important;appearance:none!important;-webkit-appearance:none!important}.moment-subdialog-backdrop{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:18px;background:#0005;backdrop-filter:blur(6px)}.moment-subdialog{width:min(100%,420px);max-height:min(80dvh,620px);overflow:auto;padding:16px;border-radius:18px;background:#fff;box-shadow:0 16px 50px #0002}.moments-page .moment-composer-backdrop,.moments-page .moment-subdialog-backdrop{background:rgba(244,250,245,.72);backdrop-filter:none;-webkit-backdrop-filter:none}.moments-page .moment-composer,.moments-page .moment-subdialog{border:0;border-radius:24px;background:#fff;box-shadow:0 12px 36px rgba(75,115,84,.12)}.moments-page .moment-composer header,.moments-page .moment-subdialog header{margin-bottom:16px}.moments-page .moment-composer header button,.moments-page .moment-subdialog header button{min-height:36px;padding:0 12px;border:0;border-radius:18px;color:#568364;background:#eaf5ec;font:inherit;font-size:13px}.moments-page .moment-composer .moment-publish,.moments-page .moment-subdialog header button:last-child{color:#477b56;background:#dff1e3;font-weight:600}.moments-page .moment-composer .moment-publish:disabled{color:#7d9d84;background:#edf5ee}.moments-page .moment-option,.moments-page .moment-choice{border:0;border-radius:12px;background:#f3f8f3}.moments-page .moment-option{margin-top:7px;padding:0 12px}.moments-page .moment-option:active,.moments-page .moment-choice:active{background:#e8f3e9}.moments-page .moment-choice{min-height:50px;margin:5px 0;padding:0 14px;color:#46554a}.moments-page .moment-choice i{color:#5b9669}.moments-page .moment-subdialog{width:min(calc(100% - 32px),446px);padding:17px;box-sizing:border-box}.moments-page .moment-option,.moments-page .moment-choice{width:100%;box-sizing:border-box;border:0;border-radius:0;background:transparent}.moments-page .moment-option{min-height:48px;margin-top:0;padding:0}.moments-page .moment-choice{min-height:48px;margin:0;padding:0}.moments-page .moment-option:active,.moments-page .moment-choice:active{background:transparent}
.moment-generation-error-backdrop{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.moment-generation-error-card{width:min(100%,480px);padding:26px 24px 22px;border-radius:24px;box-shadow:0 18px 55px rgba(32,55,43,.14)}.moment-generation-error-card header{margin-bottom:16px}.moment-generation-error-card header strong{font-size:19px;color:#343a36}.moment-generation-error-card p{margin:0;color:#626a65;font-size:15px;line-height:1.65;overflow-wrap:anywhere}.moment-generation-error-confirm{width:100%;min-height:46px;margin-top:22px;border:0;border-radius:14px;color:#fff;background:#648b70;font:inherit;font-size:15px;font-weight:600;cursor:pointer}.moment-generation-error-confirm:active{background:#52775e}.moment-choice{width:100%;min-height:48px;display:flex;align-items:center;justify-content:space-between;border:0;border-bottom:1px solid #eee;color:#444;background:#fff;text-align:left;font:inherit;font-size:14px}.moment-choice i{color:#718879;font-style:normal}.moment-picker-tip{color:#999;font-size:12px}.moment-friend-option{min-height:64px;display:flex;align-items:center;gap:14px;padding:8px 4px;border-bottom:0;font-size:14px}.moments-page .moment-friend-option{min-height:68px;gap:15px;padding:10px 6px;border:0}.moments-page .moment-friend-avatar{width:42px;height:42px;flex:none;border:2px solid #f2f7f1;box-shadow:0 2px 8px rgba(80,115,86,.1)}.moments-page .moment-friend-option input{width:18px;height:18px;margin:0 4px 0 0;accent-color:#78917e}.moments-page .moment-friend-option>span:last-child{line-height:1.5}.moment-friend-option input{accent-color:#78917e}.moment-friend-avatar{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;color:#68776c;background:#edf0eb}.moment-location-dialog{width:min(100%,500px)}.moment-map-preview{height:190px;position:relative;display:grid;place-items:center;overflow:hidden;margin:10px 0;border-radius:13px;background:#e9ede7}.moment-map-preview>span{z-index:1;color:#d35c4b;font-size:27px}.moment-map-preview small{position:absolute;bottom:10px;color:#737c73;font-size:10px}.moment-map-grid{position:absolute;inset:-30%;background:repeating-linear-gradient(25deg,transparent 0 32px,#fff 33px 36px,transparent 37px 70px),repeating-linear-gradient(115deg,transparent 0 48px,#d8dfd5 49px 52px,transparent 53px 90px)}.moment-location-search-row{display:flex;gap:7px}.moment-location-search{width:100%;min-height:40px;box-sizing:border-box;padding:8px 10px;border:1px solid #e6e6e6;border-radius:9px;outline:0;font:inherit;font-size:13px}.moment-location-search-row button,.moment-location-confirm{min-height:38px;padding:0 12px;border:0;border-radius:9px;color:#fff;background:#788f7e;font:inherit;font-size:12px}.moment-location-confirm{width:100%;margin:9px 0}.moment-location-confirm:disabled{opacity:.55}.moment-location-result{width:100%;padding:10px 0;border:0;border-bottom:1px solid #eee;color:#555;background:#fff;text-align:left;font:inherit;font-size:11px;line-height:1.5}
.my-page{background:transparent}
.preference-card{border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.22);box-shadow:0 6px 22px rgba(71,93,85,.025);backdrop-filter:blur(28px) saturate(1.15);-webkit-backdrop-filter:blur(28px) saturate(1.15)}
.config-card{border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.2);box-shadow:0 6px 22px rgba(71,93,85,.025);backdrop-filter:blur(28px) saturate(1.15);-webkit-backdrop-filter:blur(28px) saturate(1.15)}
.welcome{margin-top:10px;margin-bottom:20px}
.welcome strong{font-size:32px;font-weight:800;letter-spacing:-1.2px}
.recent-chat-strip{display:flex;gap:18px;overflow-x:auto;margin:0 -2px 18px;padding:4px 2px 8px;scrollbar-width:none}
.recent-chat-strip::-webkit-scrollbar{display:none}
.recent-chat-avatar{width:68px;height:68px;position:relative;flex:none;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;transition:transform .18s}
.recent-chat-avatar:active{transform:scale(.93)}
.recent-chat-picture{width:100%;height:100%;display:grid;place-items:center;overflow:hidden;border:2px solid #ffffffed;border-radius:50%;color:#59677b;background-color:var(--avatar-color,#e5e8ed);background-image:linear-gradient(145deg,#fff8,#dfe5ed88);background-position:center;background-size:cover;box-shadow:0 5px 16px #35445a1c;font-size:22px;font-weight:650}
.thinking-bubble{position:absolute;z-index:3;top:-12px;right:-42px;min-width:57px;padding:6px 10px;border:1px solid #ffffffeb;border-radius:18px;color:#666b73;background:linear-gradient(145deg,#ffffffd9,#f7f9fbd1);box-shadow:0 5px 15px #34465a1a,inset 0 1px #ffffff;backdrop-filter:blur(18px) saturate(1.45);-webkit-backdrop-filter:blur(18px) saturate(1.45);font-family:Georgia,serif;font-size:11px;font-weight:600;line-height:1;text-align:center;white-space:nowrap;pointer-events:none}
.thinking-bubble:after{content:"";position:absolute;left:11px;bottom:-5px;width:9px;height:9px;border-right:1px solid #ffffffdf;border-bottom:1px solid #ffffffdf;border-radius:0 0 3px 0;background:#ffffffc9;transform:rotate(45deg)}

.chat-list-search{height:52px;margin-bottom:22px;padding:0 17px;border:1px solid #ffffffd9;border-radius:28px;background:#ffffffa3;box-shadow:0 7px 24px #35445a0e,inset 0 1px #ffffffed;backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5)}
.chat-card{border-color:#ffffffc9;background:linear-gradient(145deg,#ffffffb8,#f7f8f9a0);box-shadow:0 8px 24px #35445a0d,inset 0 1px #ffffffd9;backdrop-filter:blur(24px) saturate(1.45);-webkit-backdrop-filter:blur(24px) saturate(1.45)}
.conversation{border-bottom-color:#ffffff85;background:#ffffff35;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.conversation:active{background:#ffffff9c}
.avatar{overflow:visible}
.avatar>img{overflow:hidden}
.avatar .online-dot{z-index:2;right:-2px;bottom:-2px;width:14px;height:14px;box-sizing:border-box;border:2px solid #fff}

/* 聊天列表：收紧搜索框与会话卡片，保持轻盈的磨砂质感 */
.chat-list-search{height:42px;margin-bottom:16px;padding:0 14px;border-radius:22px}
.chat-section{margin-bottom:13px}
.section-toggle{height:30px}
.chat-card{padding:0 10px;border:1px solid #ffffff70;background:linear-gradient(145deg,#ffffff70,#f7f8f94d);box-shadow:0 6px 18px #35445a08,inset 0 1px #ffffff85;border-radius:14px;backdrop-filter:blur(16px) saturate(1.3);-webkit-backdrop-filter:blur(16px) saturate(1.3)}
.conversation{min-height:64px;gap:10px;padding:8px 1px;background:#ffffff18;border-bottom-color:#ffffff50;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.conversation:active{background:#ffffff55}
.avatar{width:42px;height:42px}
.conversation-copy{gap:4px}
.conversation-top strong{font-size:13px}
.conversation-bottom>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}

.topbar .back-button,.topbar .round-action{width:45px;height:45px;padding:0;border:0;border-radius:0;color:#44464a;background:transparent;box-shadow:none;filter:none;backdrop-filter:none;-webkit-backdrop-filter:none}
.topbar .back-button:active,.topbar .round-action:active{background:transparent;box-shadow:none;transform:none}
.bottom-area{width:100%;box-sizing:border-box;display:flex;justify-content:center;margin:0;padding:0;background:transparent;pointer-events:none;flex:none}
.bottom-nav{width:100%;height:76px;box-sizing:border-box;padding:8px 12px 4px;border:0;border-radius:0;background:rgba(255,253,247,.34);box-shadow:0 -2px 12px rgba(50,75,72,.012);backdrop-filter:blur(24px) saturate(1.25);-webkit-backdrop-filter:blur(24px) saturate(1.25);pointer-events:auto}
.bottom-nav button{min-width:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:0;border:0;border-radius:0;color:#8a9396;background:transparent;font:inherit;font-size:11px;line-height:1.2;transition:color .2s,transform .2s}
.bottom-nav button.selected{color:#4b6860;background:transparent;box-shadow:none}
.bottom-nav button svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.bottom-nav button span{display:block}
.bottom-nav button:active{transform:scale(.94)}
@media(max-width:600px){.bottom-nav{height:76px}}


.config-page-overlay{position:fixed;inset:0;z-index:40;background:#ffffffa8;backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3)}
.config-page{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 12px);color:#45464a;background:#ffffffb8;backdrop-filter:blur(28px) saturate(1.35);-webkit-backdrop-filter:blur(28px) saturate(1.35)}
.config-tile-grid{display:flex;flex-direction:column;gap:12px}
.config-page .config-group{min-height:82px;box-sizing:border-box;display:flex;align-items:center;gap:15px;margin:0;padding:15px 17px;border:1px solid #e8e9e9;border-radius:20px;background:#f0f1f1;box-shadow:0 5px 16px #22222208;text-align:left;cursor:pointer}
.config-page .config-3d-icon{width:48px;height:48px;display:grid;place-items:center;flex:none;border-radius:15px;color:#fff;background:#929695;filter:none;box-shadow:inset 0 1px #ffffff35}
.config-page .config-3d-icon svg{width:27px;height:27px;overflow:visible;fill:currentColor;stroke:none;filter:none}
.config-page .config-group-copy{min-width:0;display:flex;flex-direction:column;gap:5px}
.config-page .config-group-copy strong{color:#414346;font-size:14px;font-weight:650}
.config-page .config-group-copy small{color:#686a6d;font-size:11px;line-height:1.5}
.config-page .preset-3d-icon{color:#fff;background:#929695}
.config-page-header{width:min(100%,620px);height:52px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;margin:0 auto 14px}
.config-page-header button{width:40px;height:40px;border:0;color:#555;background:transparent;font-size:30px;cursor:pointer}
.config-page-header h2{margin:0;text-align:center;font-size:16px;font-weight:500;letter-spacing:.08em}
.config-page-header>span{width:40px}
.config-page-scroll{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto;padding:4px 2px 24px}
.config-group{margin:0 0 18px;padding:17px 16px 16px;border:1px solid #ffffffd9;border-radius:25px;background:linear-gradient(145deg,#ffffffd9,#f5f9ffd1);box-shadow:0 10px 28px #758ca314,inset 0 1px 0 #fff;backdrop-filter:blur(20px) saturate(1.2);-webkit-backdrop-filter:blur(20px) saturate(1.2)}
.config-group-heading{display:flex;align-items:center;gap:12px;margin:0 0 18px}
.config-group-heading>span:last-child{display:flex;flex-direction:column;gap:5px}
.config-group-heading strong{color:#4d5054;font-size:14px;font-weight:600}
.config-group-heading small{color:#9a9da1;font-size:10px;line-height:1.5}
.config-3d-icon{width:auto;height:auto;position:relative;display:grid;place-items:center;flex:none;border:0;border-radius:0;background:transparent;box-shadow:none;text-shadow:none;filter:drop-shadow(0 8px 10px #6b7e9830) drop-shadow(0 2px 2px #ffffffd9)}
.config-3d-icon svg{width:43px;height:43px;overflow:visible;fill:url(#persona-glass);stroke:#ffffffed;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;paint-order:stroke;shape-rendering:geometricPrecision;filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 7px 9px #829cc42b)}
.preset-3d-icon svg{fill:url(#preset-glass);filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 7px 9px #a89bcf30)}

.config-group .config-select-label{display:block;margin:12px 2px 7px;color:#74777c;font-size:11px;font-weight:500}
.config-group .config-select{width:100%;height:46px;padding:0 13px;border:1px solid #e7edf1;border-radius:14px;outline:0;color:#4c5054;background:#ffffffd9;box-shadow:inset 0 1px 3px #71849a0b;font:inherit;font-size:12px}
.config-group .config-select:focus{border-color:#a9cfb4;box-shadow:0 0 0 3px #45b96d1c}
.config-group .config-select:disabled{color:#aaa;background:#f6f7f7}
.config-group .config-hint,.config-group .preset-footnote{margin:13px 2px 0;color:#999da1;font-size:10px;line-height:1.6}
.config-preset-row{display:flex;align-items:center;gap:12px;padding:13px 12px;border:1px solid #e8eff2;border-radius:16px;background:#ffffffbd}
.config-preset-row .preference-copy{gap:5px}
.config-preset-row .preference-copy strong{color:#55595c;font-size:12px}
.config-preset-row .preference-copy small{color:#9da1a3;font-size:10px}
.config-page .preset-edit-button{flex:none;padding:8px 13px;border:0;border-radius:14px;color:#fff;background:linear-gradient(145deg,#62c77e,#35ae61);box-shadow:0 4px 10px #46b66b33;font-size:10px;cursor:pointer}
.config-page .preset-edit-button:active{transform:scale(.97)}
.config-page .persona-preview{margin-top:12px}
.config-tile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.config-tile-grid .config-group{min-height:145px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;margin:0;padding:18px 10px;border:0;border-radius:24px;color:#4d5054;background:linear-gradient(145deg,#ffffffd9,#ffffffa8);box-shadow:0 5px 16px #34465a08,0 1px 4px #34465a05;backdrop-filter:blur(20px) saturate(1.15);-webkit-backdrop-filter:blur(20px) saturate(1.15);text-align:center;cursor:pointer;transition:transform .18s,box-shadow .18s}
.config-tile-grid .config-group:active{transform:scale(.97);box-shadow:0 3px 9px #34465a08}
.config-tile-grid .config-group>strong{font-size:14px;font-weight:550}
.config-tile-grid .config-3d-icon svg{width:58px;height:58px}.config-tile-grid .config-3d-icon{filter:drop-shadow(0 10px 13px #62789529) drop-shadow(0 2px 2px #ffffffeb)}.config-tile-grid .persona-3d-icon svg{filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 8px 11px #74bce12c)}.config-tile-grid .preset-3d-icon svg{filter:drop-shadow(0 1px 1px #fff) drop-shadow(0 8px 11px #a497cf2c)}
.config-tile-grid .config-group:focus-visible{outline:2px solid #91c5a0;outline-offset:3px}
.preset-config-page{position:fixed;inset:0;z-index:42;background:#fff}
.preset-config-content{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 18px) 20px calc(env(safe-area-inset-bottom) + 14px);color:#424348;background:#fff}
.preset-config-header{width:min(100%,620px);display:grid;grid-template-columns:42px 1fr 54px;align-items:center;flex:none;margin:0 auto 20px}.preset-config-header>button:first-child{width:38px;height:38px;border:0;color:#5d5e60;background:transparent;font-size:27px;line-height:1;cursor:pointer}.preset-config-header>div{text-align:center}.preset-config-header h2{margin:0;color:#55565a;font-size:17px;font-weight:550;letter-spacing:.04em}.preset-config-header small{display:block;margin-top:4px;color:#aaa9a5;font-size:9px}.preset-config-save-top{height:32px;border:0;border-radius:16px;color:#54ad6c;background:#f0f8f1;font-size:10px}
.preset-config-scroll{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto;padding:0 2px 18px;scrollbar-width:none;scrollbar-color:transparent transparent}.chat-settings-scroll::-webkit-scrollbar,.preset-config-scroll::-webkit-scrollbar{display:none;width:0;height:0}
.preset-config-section-title{display:flex;align-items:center;justify-content:space-between;margin:17px 5px 11px;color:#8f8d8a;font-size:11px}.preset-config-section-title button{padding:7px 12px;border:0;border-radius:15px;color:#58ad6d;background:#f0f8f1;font-size:10px}
.preset-name-card,.preset-setting-card{display:flex;align-items:center;gap:13px;margin-bottom:10px;padding:13px 15px;border:0;border-radius:24px;background:linear-gradient(135deg,#ffffffed,#f8f8f6d9);box-shadow:0 7px 22px #5e5a4d0b;backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2)}
.preset-config-icon{width:40px;height:40px;flex:none;display:grid;place-items:center;border-radius:15px;color:#8c7be0;background:#efebff;font-size:19px}.preset-name-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.preset-name-copy strong{color:#55565a;font-size:12px;font-weight:650}.preset-name-copy small{color:#9b9b9c;font-size:10px}.preset-name-card>input{width:120px;min-width:0;padding:8px;border:0;border-radius:12px;outline:0;color:#595a5d;background:#f5f5f3;text-align:right;font:inherit;font-size:11px}.preset-range-control{width:min(42%,200px);flex:none;display:flex;align-items:center;gap:9px}.preset-range-control input{width:100%;height:20px;margin:0;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer}.preset-range-control input::-webkit-slider-runnable-track{height:5px;border-radius:5px;background:#ededeb}.preset-range-control input::-moz-range-track{height:5px;border-radius:5px;background:#ededeb}.preset-range-control input::-webkit-slider-thumb{width:16px;height:16px;margin-top:-5.5px;appearance:none;-webkit-appearance:none;border:1px solid #e2e2df;border-radius:50%;background:#fafaf9;box-shadow:0 1px 3px #00000014}.preset-range-control input::-moz-range-thumb{width:15px;height:15px;border:1px solid #e2e2df;border-radius:50%;background:#fafaf9;box-shadow:0 1px 3px #00000014}.preset-range-control output{min-width:36px;color:#858581;text-align:right;font-size:10px;font-variant-numeric:tabular-nums}
.preset-setting-card{position:relative;display:flex;align-items:center;gap:9px;padding:10px 12px;touch-action:pan-y;transition:transform .16s,box-shadow .16s}.preset-setting-card.dragging{transform:scale(1.02);box-shadow:0 12px 28px #5e5a4d18;z-index:1}.preset-entry-summary{min-width:0;flex:1;display:flex;align-items:center;gap:10px;padding:0;border:0;background:transparent;text-align:left;cursor:pointer}.preset-entry-summary .preset-config-icon{width:36px;height:36px;color:#6999d0;background:#edf5ff}.preset-entry-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.preset-entry-copy strong{overflow:hidden;color:#55565a;font-size:12px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.preset-entry-copy small{overflow:hidden;color:#9b9b9c;font-size:10px;line-height:1.4;text-overflow:ellipsis;white-space:nowrap}.preset-entry-chevron{color:#b8b8b5;font-size:24px;line-height:1}.preset-entry-handle{width:29px;height:34px;flex:none;display:grid;place-items:center;padding:0;border:0;background:transparent;color:#c4c5c2;touch-action:none;cursor:grab}.preset-entry-handle:active{color:#999b97;cursor:grabbing}.preset-entry-handle svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}.preset-setting-toggle{width:39px;height:23px;position:relative;flex:none;padding:0;border:0;border-radius:16px;background:#e7e7e5;cursor:pointer;transition:background .2s}.preset-setting-toggle i{width:17px;height:17px;position:absolute;top:3px;left:3px;border-radius:50%;background:#fff;box-shadow:0 1px 4px #5552;transition:transform .2s}.preset-setting-toggle.on{background:#34c759}.preset-setting-toggle.on i{transform:translateX(16px)}.friend-search-overlay{position:fixed;inset:0;z-index:45;display:flex;overflow:auto;background:linear-gradient(145deg,#ffffffc7,#f4f7f9b8);backdrop-filter:blur(26px) saturate(1.4);-webkit-backdrop-filter:blur(26px) saturate(1.4)}
.friend-search-page,.friend-profile-page{width:100%;min-height:100%;box-sizing:border-box;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 12px);color:#45464a;background:linear-gradient(145deg,#ffffffa6,#f8f9fbd1);backdrop-filter:blur(24px) saturate(1.3);-webkit-backdrop-filter:blur(24px) saturate(1.3)}
.friend-search-header{width:min(100%,620px);height:48px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;margin:0 auto 18px}
.friend-search-header button{width:40px;height:40px;border:0;color:#555;background:transparent;font-size:30px;cursor:pointer}
.friend-search-header h2{margin:0;text-align:center;color:#55565a;font-size:17px;font-weight:550}
.friend-search-header i{width:40px}
.friend-search-input{width:min(100%,620px);height:46px;box-sizing:border-box;display:flex;align-items:center;gap:10px;flex:none;margin:0 auto;padding:0 14px;border:1px solid #ffffffdb;border-radius:28px;background:#ffffffa6;box-shadow:0 7px 22px #35445a10,inset 0 1px #ffffffed;backdrop-filter:blur(22px) saturate(1.45);-webkit-backdrop-filter:blur(22px) saturate(1.45)}
.friend-search-input:focus-within{border-color:#fff;box-shadow:0 0 0 3px #ffffff60,0 8px 24px #35445a12,inset 0 1px #fff}
.friend-search-input svg{width:17px;flex:none;fill:none;stroke:#929397;stroke-width:1.7}
.friend-search-input input{min-width:0;flex:1;border:0;outline:0;color:#555;background:transparent;font:inherit;font-size:12px}
.friend-search-input button{border:0;color:#999;background:transparent;font-size:20px}
.friend-search-hint{width:min(100%,620px);flex:none;margin:14px auto 8px;color:#aaa9a5;font-size:10px}
.friend-search-results{width:min(100%,620px);min-height:0;flex:1;overflow:auto;margin:0 auto}
.friend-search-row{width:100%;min-height:70px;display:flex;align-items:center;gap:12px;padding:9px 4px;border:0;background:transparent;text-align:left;cursor:pointer}.friend-search-avatar{width:48px;height:48px;position:relative;flex:none;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#777;background-color:#e9e7e2;background-position:center;background-size:cover;font-size:17px}.friend-search-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}.friend-search-copy strong{color:#55565a;font-size:13px;font-weight:550}.friend-search-copy small{color:#aaa9a5;font-size:10px}.friend-search-arrow{color:#b8b8b5;font-size:24px}.friend-search-empty{padding:36px 8px;color:#aaa9a5;text-align:center;font-size:11px}.friend-profile-content{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:50px}.friend-profile-avatar{width:106px;height:106px;display:grid;place-items:center;overflow:hidden;border-radius:50%;color:#777;background-color:#e9e7e2;background-position:center;background-size:cover;font-size:34px}.friend-profile-content h3{margin:17px 0 5px;color:#4f5053;font-size:19px;font-weight:600}.friend-profile-content p{margin:0;color:#a4a4a4;font-size:11px}.friend-add-button{width:min(100%,300px);height:45px;margin-top:30px;border:0;border-radius:23px;color:#fff;background:#66c77f;font-size:13px;cursor:pointer}.friend-add-button:disabled{color:#92958f;background:#edeeeb}
.preset-detail-overlay{position:fixed;inset:0;z-index:55;display:flex;align-items:center;justify-content:center;padding:18px;background:#29292730;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}.preset-detail-dialog{width:min(100%,460px);max-height:min(82dvh,680px);display:flex;flex-direction:column;gap:15px;padding:20px;border-radius:26px;background:#fff;box-shadow:0 16px 48px #33333318}.preset-detail-dialog header{display:flex;align-items:center;justify-content:space-between}.preset-detail-dialog h3{margin:0;color:#55565a;font-size:16px;font-weight:550}.preset-detail-dialog header button{width:30px;height:30px;border:0;border-radius:50%;color:#888;background:#f4f4f2;font-size:21px}.preset-detail-dialog label{display:flex;flex-direction:column;gap:7px;color:#8f8d8a;font-size:10px}.preset-detail-dialog input,.preset-detail-dialog textarea{width:100%;padding:11px 12px;border:0;border-radius:14px;outline:0;color:#5c5d60;background:#f7f7f5;font:inherit;font-size:12px}.preset-detail-dialog textarea{min-height:130px;resize:vertical;line-height:1.65}.preset-detail-dialog footer{display:flex;align-items:center;gap:7px}.preset-detail-dialog footer button{padding:8px 10px;border:0;border-radius:14px;color:#999a96;background:#f5f5f2;font-size:10px}.preset-detail-dialog footer .preset-remove-button{color:#c58279;background:#fff5f3}.preset-detail-dialog footer .preset-detail-done{margin-left:auto;color:#fff;background:#8bd9a0}
.preset-config-footer{width:min(100%,620px);display:flex;gap:10px;flex:none;margin:10px auto 0;padding:8px 2px}.preset-config-footer button{height:42px;flex:1;border:0;border-radius:18px;color:#77787a;background:#f3f3f1;font-size:11px}.preset-config-footer button:last-child{color:#fff;background:#8bd9a0}
@media(max-width:600px){.preset-config-content{padding-right:17px;padding-left:17px}}
@media(prefers-reduced-motion:reduce){.preset-setting-toggle,.preset-setting-toggle i{transition:none}}
.persona-binding-overlay{position:fixed;inset:0;z-index:42;background:#fff}
.persona-binding-page{width:100%;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 12px) 20px calc(env(safe-area-inset-bottom) + 12px);color:#45464a;background:#fff}
.persona-binding-header{width:min(100%,620px);height:52px;flex:none;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;margin:0 auto 14px}
.persona-binding-header>button{width:40px;height:40px;border:0;color:#555;background:transparent;font-size:30px;cursor:pointer}
.persona-binding-header>div{text-align:center}.persona-binding-header h2{margin:0;color:#55565a;font-size:15px;font-weight:550;letter-spacing:.06em}
.persona-binding-content{width:min(100%,520px);flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;padding-bottom:20px}
.persona-binding-intro{margin:0 0 27px;color:#a3a2a0;font-size:12px;letter-spacing:.04em}
.polaroid-stage{width:min(100%,390px);height:310px;position:relative;display:flex;align-items:center;justify-content:center;perspective:1100px;transform-style:preserve-3d;transition:transform .42s cubic-bezier(.2,.75,.25,1),opacity .2s}
.polaroid-stage.flipping{opacity:.2;transform:rotateY(82deg) scale(.92)}
.polaroid-card{width:194px;height:246px;position:absolute;display:flex;flex-direction:column;align-items:center;padding:11px 11px 13px;border:0;border-radius:3px;background:linear-gradient(145deg,#fff,#fbfaf8);box-shadow:0 10px 26px #4c443b12,0 2px 6px #4c443b08;backface-visibility:hidden;transition:transform .4s cubic-bezier(.2,.75,.25,1)}
.character-polaroid{z-index:1;transform:translate(-44px,5px) rotate(-9deg)}.user-polaroid{z-index:2;transform:translate(48px,-3px) rotate(8deg)}
.polaroid-photo{width:100%;height:177px;display:grid;place-items:center;overflow:hidden;color:#97938c;background-color:#f0efed;background-image:linear-gradient(145deg,#f5f3ef,#e8e6e1);background-position:center;background-size:cover;font-family:Georgia,serif;font-size:43px}
.polaroid-card strong{max-width:100%;overflow:hidden;margin-top:10px;color:#565552;font-family:Georgia,"PingFang SC",serif;font-size:14px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.polaroid-card small{margin-top:4px;color:#aaa7a1;font-size:9px;letter-spacing:.1em}
.binding-link{position:absolute;z-index:3;left:50%;top:50%;color:#fff;font-size:27px;text-shadow:0 1px 7px #615b5355;transform:translate(-50%,-50%)}
.binding-select-wrap{width:min(100%,340px);display:flex;flex-direction:column;gap:9px;margin-top:12px}.binding-select-wrap label{color:#92918e;text-align:center;font-size:11px}.binding-select-wrap select{height:45px;padding:0 15px;border:0;border-radius:16px;outline:0;color:#595a5d;background:#f7f7f5;font:inherit;font-size:12px}.binding-select-wrap select:focus-visible{outline:2px solid #d7d7d2;outline-offset:2px}
.binding-navigation{display:flex;align-items:center;justify-content:center;gap:26px;margin-top:21px}.binding-navigation button{width:42px;height:42px;border:0;border-radius:50%;color:#6c6c69;background:#f6f6f4;font-size:28px;line-height:1;cursor:pointer;transition:transform .18s,background .18s}.binding-navigation button:active{transform:scale(.92);background:#ededeb}.binding-navigation button:disabled{opacity:.35;cursor:default}.binding-navigation span{min-width:43px;color:#777773;text-align:center;font-size:11px;font-variant-numeric:tabular-nums}.binding-navigation i{padding:0 4px;color:#c2c0bb;font-style:normal}
.persona-binding-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.persona-binding-empty .polaroid-photo{width:150px;height:165px;margin-bottom:22px;box-shadow:0 8px 25px #4c443b0c;color:#d2cfc9;font-size:34px}.persona-binding-empty strong{color:#66645f;font-size:14px;font-weight:550}.persona-binding-empty p{max-width:250px;margin:8px 0 16px;color:#aaa8a3;font-size:11px;line-height:1.6}.persona-binding-empty>button{padding:9px 18px;border:0;border-radius:18px;color:#6e6b65;background:#f5f4f1;font-size:11px}
@media(max-width:600px){.persona-binding-page{padding-right:17px;padding-left:17px}.polaroid-stage{height:285px}.polaroid-card{width:174px;height:225px;padding:10px 10px 12px}.polaroid-photo{height:160px}.character-polaroid{transform:translate(-39px,4px) rotate(-9deg)}.user-polaroid{transform:translate(42px,-3px) rotate(8deg)}}
@media(prefers-reduced-motion:reduce){.polaroid-stage,.polaroid-card,.binding-navigation button{transition:none}}
@media(max-width:600px){.config-page{padding-right:16px;padding-left:16px}.config-tile-grid{gap:11px}.config-tile-grid .config-group{min-height:132px}}
.voice-message-card{width:min(148px,100%);min-height:44px;box-sizing:border-box;display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid #e5e5e5;border-radius:15px;background:#efefef}.message-row.me .voice-message-card{border-color:transparent;background:linear-gradient(135deg,#833ab4,#c13584);color:#fff}.voice-play-button{width:29px;height:29px;flex:none;display:grid;place-items:center;padding:0;border:0;border-radius:50%;color:#555;background:#fff9;cursor:pointer}.message-row.me .voice-play-button{color:#a23a9d;background:#ffffffed}.voice-play-button svg{width:15px;height:15px;fill:currentColor}.voice-play-button:disabled{opacity:.45;cursor:default}.voice-wave{height:25px;min-width:0;flex:1;display:flex;align-items:center;justify-content:space-between;gap:2px}.voice-wave i{width:2px;height:var(--bar-height);max-height:20px;border-radius:3px;background:currentColor;opacity:.35;transition:opacity .12s,transform .12s}.voice-wave.playing i{opacity:.4}.voice-wave.playing i:nth-child(-n+9){opacity:1;transform:scaleY(1.12)}.voice-wave::after{content:"";position:absolute;left:var(--voice-progress,0%);top:50%;width:2px;height:27px;border-radius:2px;background:currentColor;opacity:.9;transform:translate(-50%,-50%);pointer-events:none}.voice-wave{position:relative}.voice-transcript{max-width:300px;margin:0;padding:0 2px;color:#4b4b4d;font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.message-row.me .voice-transcript{align-self:flex-end;width:fit-content;max-width:min(300px,100%);margin-right:0;margin-left:auto;text-align:right}.voice-message-layout{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:5px}.voice-message-layout.voice-message-outgoing{align-items:flex-end}.voice-message-layout.voice-message-outgoing .voice-transcript{order:2}.voice-message-layout.voice-message-outgoing .voice-message-card{order:1}.voice-transcript-expand-enter-active,.voice-transcript-expand-leave-active{transition:opacity .24s ease,transform .24s ease,max-height .28s ease;overflow:hidden}.voice-transcript-expand-enter-from,.voice-transcript-expand-leave-to{max-height:0;opacity:0;transform:translateY(-6px)}.voice-transcript-expand-enter-to,.voice-transcript-expand-leave-from{max-height:180px;opacity:1;transform:translateY(0)}.message-row.me .voice-transcript,.message-row.me .voice-impression{color:#666}.voice-description{display:block;margin-top:3px;color:#929295;font-size:11px}.voice-impression{max-width:300px;margin:0;padding:0 2px;color:#929295;font-size:10px;line-height:1.45}.composer-mic.recording{color:#e44949;background:#fff1f1}.recording-indicator{width:14px;height:14px;border-radius:4px;background:#e44949;animation:recording-pulse 1s ease-in-out infinite alternate}@keyframes recording-pulse{to{opacity:.45;transform:scale(.8)}}

/* Conversation surface: neutral, editorial and focused on the messages. */
.conversation-overlay{--conversation-bg:#fff;--conversation-line:#e3e7ed;--conversation-muted:#788291;--conversation-ink:#202630;--conversation-accent:#315f9f;--conversation-accent-soft:#e7eef8;background:#fff}
.conversation-page{background:#fff}
:deep(.conversation-header){min-height:62px;border-bottom:1px solid var(--conversation-line);background:rgba(255,255,255,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
:deep(.conversation-avatar){border:1px solid rgba(20,30,45,.08)}
:deep(.conversation-title){color:var(--conversation-ink);font-size:15px;font-weight:650;letter-spacing:-.01em}
:deep(.message-list){padding:22px 20px 28px;scrollbar-width:thin;scrollbar-color:#cbd0d8 transparent}
:deep(.message-row){gap:8px;margin-bottom:4px}
:deep(.message-row:not(.has-tail)){margin-bottom:4px}
:deep(.message-row.has-tail){margin-bottom:20px!important}
:deep(.message-row.me .message-timestamp),:deep(.message-row.them .message-timestamp){display:none!important}
:deep(.message-row.them .tiny-avatar),:deep(.message-row.me .tiny-avatar){width:40px;height:40px;flex:none;border:0!important;border-radius:50%;background:#edf3ff;font-size:0;color:transparent}
:deep(.tiny-avatar){position:relative;isolation:isolate}
:deep(.tiny-avatar img){position:absolute;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;border-radius:inherit;object-fit:cover}
:deep(.chat-setting-icon){color:#fff!important;background:#85898e!important;box-shadow:none!important}
:deep(.chat-setting-icon svg){fill:currentColor}
:deep(.transfer-compose-dialog){background:#fff!important;border-color:#e9ecef!important;color:#292d32;backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:0 22px 70px #17171724}
:deep(.text-image-dialog h3),:deep(.transfer-compose-dialog h3){color:#24292f}
:deep(.text-image-dialog textarea),:deep(.transfer-compose-dialog input){border-color:#e3e7eb;color:#343a40;background:#fff}
:deep(.text-image-dialog footer .feature-send-button),:deep(.transfer-compose-dialog footer .feature-send-button){color:#fff;background:#26a269}
:deep(.text-image-dialog footer .feature-send-button:disabled),:deep(.transfer-compose-dialog footer .feature-send-button:disabled){background:#9bcbb3;opacity:1}
:deep(.text-image-dialog footer .feature-send-button:not(:disabled):active),:deep(.transfer-compose-dialog footer .feature-send-button:not(:disabled):active){background:#1e8054}

:deep(.message-row.them:not(.has-tail) .tiny-avatar){visibility:visible}
:deep(.message-row.them.has-tail),:deep(.message-row.me.has-tail){margin-bottom:20px!important}
:deep(.message-row.them:not(.has-tail)),:deep(.message-row.me:not(.has-tail)){margin-bottom:16px!important}
:deep(.message-row.has-tail){margin-bottom:20px!important}
:deep(.message-content-stack){gap:7px;max-width:calc(100% - 48px)}
:deep(.message-row.them .message-bubble),:deep(.message-row.me .message-bubble){width:max-content;display:block;max-width:min(76%,390px);padding:12px 15px;border:1px solid transparent;border-radius:18px;font-size:15px;font-weight:400;line-height:1.58;letter-spacing:.005em;box-shadow:none}
:deep(.message-row.them .message-bubble){color:#29313c;background:#fff;border-color:var(--conversation-line);border-bottom-left-radius:7px}
:deep(.message-row.me .message-bubble){color:#315bb5;background:#edf3ff;border:0;border-radius:30px;font-weight:400;box-shadow:none}
:deep(.message-row.me .message-timestamp){display:block;align-self:flex-end;margin:0;padding:0 12px;color:#8e8e93;text-align:right;font-size:11px;font-weight:400;line-height:1.4}
:deep(.message-row.them .message-timestamp){display:block;align-self:flex-start;margin:0;padding:0 12px;color:#8e8e93;text-align:left;font-size:11px;font-weight:400;line-height:1.4}
:deep(.message-row.me time){display:block}
:deep(.message-row.me .message-bubble:after){display:none}
:deep(.chat-time-divider){width:100%;margin:13px 0 15px;color:#8e8e93;text-align:center;font-size:11px;font-weight:400;line-height:1.4}
:deep(.chat-time-divider:before),:deep(.chat-time-divider:after){display:none}

:deep(.message-row.them .message-bubble:after),:deep(.message-row.me .message-bubble:after){display:none;content:none}
:deep(.chat-time-divider){display:block;width:100%;flex:0 0 100%;align-self:stretch;margin:21px 0;color:#8e8e93;text-align:center;font-size:11px;font-variant-numeric:tabular-nums;line-height:1.4}
:deep(.chat-time-divider:before),:deep(.chat-time-divider:after){display:none}
:deep(.message-row time){color:var(--conversation-muted);font-size:10px}
:deep(.message-row.them .message-bubble){color:#4b4f55;background:#fff;border:0;border-radius:12px;font-weight:400;box-shadow:0 2px 7px rgba(38,42,48,.04),0 1px 2px rgba(38,42,48,.025)}
:deep(.message-row.me .message-bubble){border-radius:12px}
:deep(.thought-preview){width:fit-content;max-width:100%;padding:0;border:0;background:transparent}
:deep(.thought-preview-toggle){min-height:22px;gap:4px;padding:2px 4px;border:0;border-radius:0;background:transparent;color:#737982;font-size:10px;line-height:1}
:deep(.thought-bulb-icon){width:13px;height:13px;color:#8b929b}
:deep(.thought-chevron){font-size:12px}
:deep(.thought-preview p){margin:4px 0 0;padding:0;color:#596575;font-size:11px;line-height:1.4}
:deep(.character-status-card){width:min(100%,320px);box-sizing:border-box;margin-top:8px;padding:13px 14px;border:1px solid #e9eaec;border-radius:16px;background:linear-gradient(145deg,#fff 0%,#f8f9fb 100%);box-shadow:0 5px 16px rgba(43,56,75,.055)}
:deep(.status-card-heading){display:flex;align-items:center;justify-content:space-between;color:#737b87;font-size:11px;font-weight:650;letter-spacing:.04em}
:deep(.status-card-heading i){color:#9baec7;font-style:normal}
:deep(.status-feeling){margin:9px 0 12px;color:#454d59;font-size:13px;line-height:1.55}
:deep(.status-metrics){display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}
:deep(.status-metric){display:grid;grid-template-columns:1fr auto;align-items:center;gap:5px 8px;color:#737b87;font-size:10px}
:deep(.status-metric strong){color:#59616c;font-size:10px;font-variant-numeric:tabular-nums}
:deep(.status-track){height:4px;grid-column:1/-1;overflow:hidden;border-radius:9px;background:#e9ecf0}
:deep(.status-track i){height:100%;display:block;border-radius:inherit;background:linear-gradient(90deg,#a9bed9,#819bbd);transition:width .3s ease}
:deep(.composer){box-sizing:border-box;flex:none;min-height:68px;padding:9px 14px calc(9px + env(safe-area-inset-bottom, 0px));margin-bottom:0;border:0;border-radius:0;background:transparent;box-shadow:none;backdrop-filter:none;-webkit-backdrop-filter:none}
:deep(.conversation-page){padding-bottom:0!important}
:deep(.composer-input-row){min-height:54px;align-items:center;gap:9px}
:deep(.composer-with-quote .composer-input-row){min-height:54px}
:deep(.composer-tool){width:38px;height:38px;border-radius:50%;color:#666a6e;background:#ededee;transition:background .16s,transform .16s}
:deep(.composer-field){box-sizing:border-box;min-height:46px;align-self:center;padding:5px 7px 5px 16px;border:1px solid #ffffffd9;border-radius:25px;background:#ffffffd9;box-shadow:0 4px 18px #25252512,0 1px 4px #2525250a;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
:deep(.send-button){width:38px;height:38px;border-radius:50%;align-self:center;color:#fff;background:#96999c;transition:background .16s,transform .16s}
:deep(.send-button:hover){background:#7f8386}
:deep(.send-button:active){transform:scale(.95)}
:deep(.receive-button){display:grid!important;width:38px;height:38px;flex:none;visibility:visible;opacity:1;color:#666a6e;background:#ededee}
:deep(.receive-button svg){width:24px;height:24px;stroke-width:1.9}
:deep(.quote-compose-preview){border-left:2px solid #a4a6a8;border-radius:5px;background:#f1f1f2}
:deep(.voice-message-card){border-color:transparent;border-radius:30px;background:#f1f2f4;box-shadow:none}
:deep(.message-row.me .voice-message-card){border-color:transparent;background:#edf3ff}
:deep(.message-row.them .voice-message-card){border-color:transparent;background:#f1f2f4}
:deep(.message-row.me .voice-message-card .voice-play-button),:deep(.message-row.me .voice-wave){color:#315bb5}
:deep(.message-row.them .voice-message-card .voice-play-button),:deep(.message-row.them .voice-wave){color:#4b4f55}
:deep(.message-row.me .transfer-card),:deep(.transfer-card){border-radius:16px;background:#2eae68;color:#fff;box-shadow:0 5px 14px #248f5330}:deep(.transfer-icon){border:0;border-radius:11px;background:#ffffff30}:deep(.transfer-copy strong),:deep(.transfer-copy b),:deep(.transfer-copy small){color:#fff}
:deep(.message-row.me .text-image-card){transform:none}
:deep(.text-image-card){border-radius:12px;box-shadow:0 4px 14px rgba(25,35,50,.1)}
@media(max-width:600px){
  :deep(.message-list){padding:16px 12px 22px}
  :deep(.message-row.them .message-bubble),:deep(.message-row.me .message-bubble){max-width:min(82%,360px);padding:10px 13px;font-size:14px}
  :deep(.composer){min-height:0;padding:5px 10px calc(5px + env(safe-area-inset-bottom, 0px))}
  :deep(.composer-input-row){min-height:48px;gap:7px}
  :deep(.composer-with-quote .composer-input-row){min-height:48px}
  :deep(.composer-tool){width:36px;height:36px}
  :deep(.composer-field){min-height:42px}
  :deep(.send-button){width:36px;height:36px}
}
</style>
