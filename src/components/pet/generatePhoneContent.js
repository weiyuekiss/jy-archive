// 让模型根据角色设定生成手机：开机密码 + 各应用内容
// 返回 { passcode: '1234', items: [...] }

const PHONE_SYSTEM_PROMPT = [
  '你是小说和角色扮演里的道具设计师，负责为一个虚构角色设计他的手机。',
  '只输出一个 JSON 对象，不要解释，不要代码围栏。格式：{"passcode":"1234","items":[...]}。',
  'passcode 是他这台手机的开机密码：必须是 4 位数字，符合他的性格，比如他在意的日期或数字。',
  '每一项 items 的字段：type、title、sub、text、time、from。',
  'type 取值：photos 相册、notes 备忘录、messages 微信聊天、mails 邮箱、music 音乐、calls 通话记录、browser 浏览器历史、events 日历日程、books 书架、bills 账单、wallet 支付宝资产。',
  '账单要真实：像真人支付宝里的账单，有日常小额消费（咖啡、外卖、打车、超市、地铁）、房租、水电话费、花呗还款、工资入账和转账。每条 type 为 bills，字段 title（商户或对方）、sub（分类）、direction（out 支出、in 收入）、amount（只写正数的字符串，如「35.80」）、time（按从近到远排列）、text（备注，可为空）。金额要符合角色的收入和职业。至少 8 条。',
  '支付宝资产要真实：每条 type 为 wallet，固定 3 条。第一条 title「余额」、kind「balance」、amount（可用余额，字符串）、sub「可用余额」；第二条 title「余额宝」、kind「balance」、amount、sub（收益说明）；第三条 title「花呗」、kind「credit」、amount（本期应还）、limit（总额度）、due（还款日，如「11月10日」）、sub「本期账单」、text（账单说明）。金额要和账单大致对得上。',
  '书架要真实：像真人手机里的读书记录，书要是真实存在的，作者也要是真实作者，书的类型贴合他的职业和处境（比如工科生看技术书，焦虑的人看心理书，爱做饭的人看食谱和散文）。书摘只写短句，不要长段照抄正文，原文拿不准时就写成他自己划下的句子。评语要是他看完这段的真实反应，口语化，常常联系到自己的生活，不要写成读书笔记式的总结。',
  '日程要真实：像真人手机日历里的安排，有上班的会议和截止日期、看病复查、账单还款、家人生日、和朋友约饭、健身或课程、出差车次；日期要以提示里给出的今天日期为准，多数集中在今天前后两周内，有几条已经过去。',
  '浏览器历史要真实：像真人 Safari 的历史和收藏，网站有他日常会逛的（购物、外卖、订票、招聘、论坛、新闻、视频、银行、学校或公司系统），搜索和文章标题要像真人搜出来的，不要像模板。收藏的网页只占少数。',
  '通话记录要真实：像真人手机的最近通话，有家人、朋友、同事、客服、快递员、外卖、银行和骚扰电话，有来电、拨出和未接；未接要有原因感（如他在开会、没听见、不想接陌生号码）；拨出和来电的时长要合理，短的几秒，长的几分钟到一个多小时；时间要按从近到远排列。',
  '微信聊天分两类：私聊（chatType 为 private）和群聊（chatType 为 group）。',
  '私聊必须有 8 个不同的联系人，每人 4 到 10 条，title 为联系人名字，text 为消息内容。from 为 me 表示手机主人发出，them 表示对方发来。',
  '群聊必须有 3 个不同的群，每个群 8 到 15 条，title 为群名（如「周末爬山群」「宿舍群」），sender 为发言人名字（不是手机主人时），from 为 me 表示手机主人发出。',
  '聊天内容要真实感：像真人手机里的聊天，口语化、有省略和错别字式的随意、夹杂语气词和表情文字，不要书面化、不要每句都完整、不要每个人都礼貌；话题要有来有回，有追问、有没回复的、有突然转话题的；时间要有先后顺序，同一天内从早到晚，不要所有消息时间一样。',
  '群聊里不同成员的说话风格要有区别，符合各自身份。不要写出 AI 式的总结语或客套语。',
  '邮件（mails）至少 8 封，每封字段：title 为主题，sub 为发件人名字，time 为相对时间（如「今天 09:12」「昨天」「9月26日」），text 为正文（2 到 5 段，像真实系统或真人邮件），unread 为 true 或 false（约一半未读），important 为 true 或 false（少数是重点）。',
  '邮件要有真实感，像真实用户的收件箱：混合订阅通知、验证码、账单与续费提醒、平台政策更新、购物物流、同事或朋友的来信、公司或学校通知、社交平台提醒。发件人名字要像真实服务（如「GitHub」「Discord」「某某银行」）或真实的人名。正文要具体，有日期、金额、订单号这类细节，不要写成总结式套话，不要出现“亲爱的用户”之类的空泛开头。',
  '音乐要真实：歌单和歌曲要符合角色的性格、职业和生活状态，比如熬夜写稿的人会有深夜歌单，学生会有考前的歌。歌手和歌名尽量用真实存在的歌曲或风格相近的真实歌手，不要编造不存在的歌名。他对每首歌的感受要具体，写他在什么场景下听、想到了什么人或事，不要写成乐评套话。',
  '备忘录要真实：就是这个角色自己会记在手机备忘录里的东西，比如购物清单、待办、临时想法、日程、要还的钱、想看的书或电影、给某人的话没说出口、生活小习惯记录、一些只有他自己懂的简写和暗号。内容要贴合他的身份、职业和性格，具体到人名、地点、数字、时间，不要写成泛泛的励志句子，不要像模板，不要每条都以“今天”开头。',
  '相册要真实：像真人手机里的相册，混合自拍、食物、路边风景、截图、票据、宠物、工作或学习的白板和文件、朋友聚会、随手拍的东西；相簿名要像他自己会起的（如「宿舍」「出差」「猫」「考研」）；照片描述要具体到地点、时间、人物和他当时的状态，不要写成美化的文案。',
  '数量与字段：books 至少 8 本（title 为书名，sub 为作者，text 为他对这本书的简介或整体感受，time 为读完或开始读的时间，finished 为 true 表示读完、false 表示在读，progress 为 0 到 100 的数字，excerpts 为书摘数组，每条含 chapter 章节名、quote 划线的短句、comment 看完这段后的评语，每本 2 到 4 条）；events 至少 8 条（title 为日程名，date 为 YYYY-MM-DD，time 为开始到结束时间如「14:00-15:30」或「全天」，sub 为地点，没有则为空字符串，calendar 为所属日历如「工作」「家人」「个人」「学校」「健身」，text 为备注）；browser 至少 8 条（title 为网页标题，sub 为网站名，text 为网页正文，time 为浏览时间，pinned 为 true 表示收藏）；calls 至少 8 条（title 为联系人名字或备注名，sub 为号码类型如「手机」「工作」「快递」「银行」，direction 为 in 来电、out 拨出、missed 未接，duration 为通话时长如「3分12秒」，未接时为空字符串，time 为时间）；photos 至少 8 条（title 为照片标题，album 为相簿名，text 为照片内容描述，time 为拍摄时间）；notes 至少 8 条（text 为备忘内容，第一行是标题，之后是正文；time 为时间；pinned 为 true 或 false，少数置顶）；messages 3 个联系人，每人 3 到 5 条（title 为联系人名字，from 为 me 或 them，me 表示手机主人发出）；mails 至少 8 封（title 为邮件主题，sub 为发件人，text 为正文）；music 至少 8 首（title 为歌名，sub 为歌手，album 为专辑名，playlist 为所在歌单名如「通勤」「失眠夜」「练歌房」，text 为他对这首歌的一两句感受，time 为添加时间，pinned 为 true 时表示收藏）。',
  '内容要贴合角色的身份、性格和经历，口语化，使用中文。时间用“昨天 22:10”这类相对写法。',
  '不要出现真实的个人信息、电话号码或网址。'
].join('\n')

const VALID_TYPES = ['photos', 'notes', 'messages', 'mails', 'music', 'calls', 'browser', 'events', 'books', 'bills', 'wallet']
// 这些类型没有正文，允许 text 为空（账单的备注、资产的说明都可以没有）
const NO_TEXT_TYPES = ['bills', 'wallet']

// 去掉代码围栏，并截取第一个 { 到最后一个 } 之间的内容
function stripToJsonText(raw) {
  const cleaned = raw.replace(/```(?:json)?/gi, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) return ''
  return cleaned.slice(start, end + 1)
}

// 从字符串 s 中，按括号配对切出 "key": [ ... ] 数组里的每一个完整对象
function extractObjects(s) {
  const objects = []
  let depth = 0
  let inString = false
  let escaped = false
  let startIdx = -1
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') {
      if (depth === 0) startIdx = i
      depth += 1
    } else if (ch === '}' && depth > 0) {
      depth -= 1
      if (depth === 0 && startIdx >= 0) {
        objects.push(s.slice(startIdx, i + 1))
        startIdx = -1
      }
    }
  }
  return objects
}

// 容错解析：先直接解析；失败则去掉多余逗号再试；仍失败则逐个提取完整对象
function tolerantParse(raw) {
  const jsonText = stripToJsonText(raw)
  if (!jsonText) return null
  try {
    return JSON.parse(jsonText)
  } catch {
    // 去掉对象和数组结尾多余的逗号，如 ,} 或 ,]
    try {
      return JSON.parse(jsonText.replace(/,\s*([}\]])/g, '$1'))
    } catch {
      // 逐个提取 items 里能解析的对象，保住能用的部分
      const passcodeMatch = jsonText.match(/"passcode"\s*:\s*"?(\d{4})"?/)
      const items = []
      for (const chunk of extractObjects(jsonText)) {
        try {
          const obj = JSON.parse(chunk.replace(/,\s*([}\]])/g, '$1'))
          if (obj && typeof obj === 'object' && 'type' in obj && 'text' in obj) items.push(obj)
        } catch {
          // 单个对象坏了就跳过，不影响其他对象
        }
      }
      return { passcode: passcodeMatch ? passcodeMatch[1] : '', items }
    }
  }
}

// 给错误挂上模型的原始输出，弹窗里可以复制给开发者排查
function attachRaw(error, raw) {
  error.raw = String(raw || '')
  return error
}

// 书架的书摘：每条保留章节、原文摘录和评语，没有原文的丢弃
function normalizeExcerpts(list) {
  if (!Array.isArray(list)) return []
  return list.slice(0, 6).map((e) => {
    if (!e || typeof e !== 'object') return null
    const quote = String(e.quote ?? e.text ?? '').trim().slice(0, 300)
    if (!quote) return null
    return {
      chapter: String(e.chapter || '').slice(0, 30),
      quote,
      comment: String(e.comment ?? e.thought ?? '').trim().slice(0, 300)
    }
  }).filter(Boolean)
}

export function parsePhoneContent(text) {
  const raw = String(text || '')
  const data = tolerantParse(raw)
  if (!data) throw attachRaw(new Error('模型没有返回可用的内容'), raw)

  // 密码不再在解析时强制校验：刷新微信不需要密码，首次生成的校验放到调用方
  const rawPasscode = String(data?.passcode ?? '').trim()
  const passcode = /^\d{4}$/.test(rawPasscode) ? rawPasscode : ''

  const list = Array.isArray(data?.items) ? data.items : []
  // 兼容常见的字段名和类型变体：content/message 代替 text，wechat/chat 代替 messages
  const TYPE_ALIASES = { wechat: 'messages', chat: 'messages', message: 'messages', email: 'mails', mail: 'mails', photo: 'photos', note: 'notes', song: 'music', call: 'calls', phone: 'calls', recent: 'calls', browse: 'browser', web: 'browser', history: 'browser', safari: 'browser', event: 'events', schedule: 'events', calendar: 'events', appointment: 'events', book: 'books', reading: 'books', shelf: 'books', library: 'books', bill: 'bills', transaction: 'bills', balance: 'wallet', huabei: 'wallet', credit: 'wallet', asset: 'wallet', account: 'wallet' }
  const normalized = list.map((item) => {
    if (!item || typeof item !== 'object') return null
    const rawType = String(item.type || '').toLowerCase()
    const type = TYPE_ALIASES[rawType] || rawType
    // 通话记录没有正文，用联系人名字代替，避免被下面的「text 不能为空」过滤掉
    const fallbackText = ['calls', 'events', 'books'].includes(type) ? String(item.title || '') : ''
    const text = item.text ?? item.content ?? item.message ?? item.body ?? fallbackText
    return { ...item, type, text: typeof text === 'string' ? text : String(text) }
  }).filter(Boolean)
  // 诊断：被丢弃的条目记到控制台，便于排查
  const dropped = normalized.filter((item) => !(VALID_TYPES.includes(item.type) && item.text.trim()))
  const items = normalized
    .filter((item) => VALID_TYPES.includes(item.type) && (item.text.trim() || NO_TEXT_TYPES.includes(item.type)))
    .slice(0, 60)
    .map((item) => ({
      type: item.type,
      title: String(item.title || '').slice(0, 40),
      sub: String(item.sub || '').slice(0, 40),
      text: String(item.text).slice(0, 600),
      time: String(item.time || '').slice(0, 30),
      from: item.from === 'me' ? 'me' : 'them',
      chatType: item.chatType === 'group' ? 'group' : 'private',
      sender: String(item.sender || '').slice(0, 20),
      unread: item.unread === true,
      important: item.important === true,
      pinned: item.pinned === true,
      album: String(item.album || '').slice(0, 40),
      playlist: String(item.playlist || '').slice(0, 20),
      direction: ['in', 'out', 'missed'].includes(item.direction) ? item.direction : (item.type === 'bills' ? 'out' : 'in'),
      duration: String(item.duration || '').slice(0, 20),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || '')) ? String(item.date) : '',
      calendar: String(item.calendar || '').slice(0, 12),
      progress: Math.min(100, Math.max(0, Math.round(Number(item.progress) || 0))),
      finished: item.finished === true,
      excerpts: normalizeExcerpts(item.excerpts),
      amount: String(item.amount ?? '').slice(0, 20),
      kind: item.kind === 'credit' ? 'credit' : 'balance',
      limit: String(item.limit ?? '').slice(0, 20),
      due: String(item.due ?? '').slice(0, 20)
    }))
  if (!items.length) throw attachRaw(new Error('模型没有生成有效内容，请重试'), raw)
  return { passcode, items }
}

// 单类型刷新时使用的提示词：只要求一类内容，输出短，不会被截断，也不会偏向其他类型
const TYPE_ONLY_RULES = {
  bills: '只生成账单：至少 8 条，每条是 type 为 bills 的对象，字段 title（商户或对方，如「瑞幸咖啡」「美团外卖」「滴滴出行」「房东张阿姨」「公司工资」）、sub（分类，如「餐饮」「交通」「购物」「转账」「还款」「工资」「生活缴费」「话费」）、direction（out 支出、in 收入）、amount（金额字符串，只写正数，如「35.80」，方向由 direction 决定）、time（时间，按从近到远排列）、text（备注，如「两人份」「给妈妈的生活费」，可为空）。金额要符合角色的收入和职业。',
  wallet: '只生成支付宝资产：固定 3 条，每条是 type 为 wallet 的对象。第一条 title「余额」、kind「balance」、amount（可用余额，字符串如「1286.40」）、sub「可用余额」；第二条 title「余额宝」、kind「balance」、amount、sub（收益说明）；第三条 title「花呗」、kind「credit」、amount（本期应还）、limit（总额度，如「8000.00」）、due（还款日，如「11月10日」）、sub「本期账单」、text（账单说明，如已用额度和主要消费）。金额要和他的账单大致对得上。',
  books: '只生成书架：至少 8 本，每本是 type 为 books 的对象，字段 title（书名，用真实存在的书）、sub（作者，用真实作者）、text（他对这本书的简介或整体感受，2 到 3 句）、time（读完或开始读的时间，按从近到远排列）、finished（true 表示读完，false 表示在读）、progress（0 到 100 的数字，在读的按实际进度给，读完为 100）、excerpts（书摘数组，每本 2 到 4 条，每条含 chapter 章节名、quote 他划线的一两句原文或短摘录、comment 他看完这段后的评语或想法，口语化，常常联系到自己的生活）。在读的书约占一半。书摘只写短句，不要长段照抄正文，原文拿不准时就写成他自己划下的句子。内容要贴合角色的职业、经历和当下的处境。',
  events: '只生成日历日程：至少 8 条，每条是 type 为 events 的对象，字段 title（日程名，如「组会」「体检复查」「妈妈生日」「交房租」「和阿伟吃饭」）、date（日期，格式必须是 YYYY-MM-DD，以提示里给出的今天日期为准，多数集中在今天前后两周内，有几条已经过去）、time（开始到结束时间，如「14:00-15:30」，全天事件写「全天」）、sub（地点，没有则为空字符串）、calendar（所属日历，如「工作」「家人」「个人」「学校」「健身」）、text（备注，可以是要带的东西、要准备的事或一句提醒）。内容要贴合角色的职业、家庭和生活，有真实的上班会议和截止日期、看病复查、账单还款日、家人生日、和朋友约饭、健身或课程、出差车次。',
  browser: '只生成浏览记录：至少 8 条，每条是 type 为 browser 的对象，字段 title（网页标题）、sub（网站名，如「知乎」「小红书」「12306」「京东」「某某银行」）、text（网页正文，2 到 4 段，像真实文章、商品页、订单页、论坛帖或新闻，具体到数字、地点和人物）、time（浏览时间，按从近到远排列）、pinned（true 表示收藏，约 3 条）。内容要贴合角色的职业、兴趣和生活状态，比如查火车票、搜做饭菜谱、看租房信息、刷论坛里和自己处境相关的帖子。',
  calls: '只生成通话记录：至少 8 条，每条是 type 为 calls 的对象，字段 title（联系人名字或备注名）、sub（号码类型，如「手机」「工作」「快递」「银行」）、direction（in 来电、out 拨出、missed 未接）、duration（时长如「3分12秒」，未接为空字符串）、time（时间，按从近到远排列）。内容要有家人、朋友、同事、客服、快递、银行和骚扰电话，未接要有原因感。',
  photos: '只生成相册：至少 8 张，每条是 type 为 photos 的对象，字段 title（照片标题）、album（相簿名）、text（照片内容描述）、time（拍摄时间）。照片要混合自拍、食物、风景、截图、票据、宠物和随手拍的东西。',
  messages: '只生成微信聊天：至少 8 个私聊（chatType 为 private）和 3 个群聊（chatType 为 group），每条是 type 为 messages 的对象，字段 title（联系人或群名）、text、from、time、chatType、sender。',
  mails: '只生成邮件：至少 8 封，每条是 type 为 mails 的对象，字段 title（主题）、sub（发件人）、text（正文）、time、unread、important。',
  notes: '只生成备忘录：至少 8 条，每条是 type 为 notes 的对象，字段 text（第一行是标题）、time、pinned。',
  music: '只生成音乐：至少 8 首，每首是 type 为 music 的对象，字段 title（歌名）、sub（歌手）、album、playlist、text（感受）、time、pinned。'
}

// 支付宝刷新：账单和资产一起生成，一次请求
TYPE_ONLY_RULES.alipay = `同时生成两部分，都要有。\n${TYPE_ONLY_RULES.bills}\n${TYPE_ONLY_RULES.wallet}`

// 单类型刷新的通用约束：只输出 JSON，内容要真实，不要套话
const TYPE_ONLY_COMMON = [
  '只输出一个 JSON 对象，格式：{"items":[...]}，不要代码围栏，不要解释。',
  '内容要贴合角色的身份、性格和经历，口语化，使用中文。时间用“昨天 22:10”这类相对写法。',
  '内容要真实具体，有人名、地点、数字、时间这类细节；不要写成总结式套话，不要出现真实的个人信息、电话号码或网址。'
].join('\n')

// 今天的日期（本机时间），给模型做日程和日期的参照
function todayText() {
  const d = new Date()
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}（星期${week}）`
}
function pad2(n) {
  return String(n).padStart(2, '0')
}

export async function generatePhoneContent({ preset, character, signal, onlyType = '', chatContext = '', userName = '' }) {
  if (!preset?.baseUrl?.trim() || !preset?.apiKey?.trim() || !preset?.model?.trim()) {
    throw new Error('所选预设缺少接口地址、模型或密钥，请到设置里补全。')
  }
  const base = preset.baseUrl.trim().replace(/\/+$/, '')
  const userPrompt = [
    ...(userName ? [`用户的名字是「${userName}」。手机里提到用户时用这个名字，不要写成「用户」或「你」，也不要编造别的名字。`] : []),
    ...(chatContext ? [`最近和用户的聊天（最近约 ${chatContext.split('\n').length} 句，手机内容要和其中的事情有关联，但不要照抄对话）：\n${chatContext}`] : []),
    '角色信息：',
    `姓名：${character.name || '未填'}`,
    `性别：${character.gender || '未填'}`,
    `年龄：${character.age || '未填'}`,
    `职业：${character.occupation || '未填'}`,
    `设定：${character.details || '未填'}`,
    '请为他设计手机和开机密码。',
    `今天的日期：${todayText()}`
  ].join('\n')

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preset.apiKey.trim()}` },
    body: JSON.stringify({
      model: preset.model.trim(),
      temperature: 0.9,
      max_tokens: 32000,
      messages: [
        { role: 'system', content: onlyType && TYPE_ONLY_RULES[onlyType] ? `${TYPE_ONLY_RULES[onlyType]}\n${TYPE_ONLY_COMMON}` : PHONE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    }),
    signal
  })
  if (!response.ok) throw new Error(`接口返回 ${response.status}`)
  const data = await response.json()
  return parsePhoneContent(data?.choices?.[0]?.message?.content)
}
