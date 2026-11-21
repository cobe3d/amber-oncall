// What happens on the night, as data: the small calls and the patients.
//
// A bed is a short script of choices. Each option is something you could do at the bedside; the
// best one moves the case on, the others make the patient worse and explain why. Every option
// names how many minutes it takes, so a slow night shows on the clock.
//
// Written for the public: no drug doses, no jargon on the monitor. Anything clinical here should
// be checked by a physician before it ships -- see README.md (醫療內容).
//
// This template ships two sample beds (HYPO, STROKE). Add a bed by copying one of them, giving it its own id, and listing it in PUBLIC_CASES at the end;
// `npm test` checks the shape. AGENTS.md has the full list of fields.
//
// Where everyone lies is drawn again every night (game/night-draw.js): a patient gets a bed of its
// own, and the nurse who looks after that bed's room. So no text here names a bed or a nurse:
// write {bed} and {nurse}, and the game fills them in. A small call's `pt` says which person it is
// about; calls with the same pt are the same person, in the same bed, all night.

// The calls that need nobody at the bed: two ring in the evening, two after lights out. The
// point is what it is like to be called, and woken, for each of them anyway. `visit` is the
// scripted scene if the doctor goes to look (see CASES in game.js); `night` keeps one after dark;
// `pt` is the person it is about (calls with the same pt share a bed, drawn each night).
export const PUBLIC_CALLS = [
  { id: 'new', short: '新病人報到', need: 'none', pt: 'newpt', visit: 'v-new',
    text: '醫師，{bed} 剛從急診上來一位新病人，肺炎，生命徵象都很穩，跟你報告一下。',
    phone: '好，有變化再叫我', phoneReply: '{nurse}：「好，醫師晚安～」',
    sleepNote: '其實不回也沒事，護理師只是照規定跟你報告。' },
  { id: 'ins', short: '病人睡不著', need: 'phone', pt: 'sleepless', visit: 'v-ins', night: true,
    text: '醫師，{bed} 的阿伯說睡不著，可以給他一顆平常吃的安眠藥嗎？',
    phone: '可以，給他平常那一顆', phoneReply: '{nurse}：「好，我去給他。」',
    sleepNote: '沒回電話，阿伯醒著看電視到天亮，{nurse}有點不爽。' },
  { id: 'iv', short: '點滴打完了', need: 'phone', pt: 'drip', visit: 'v-iv',
    text: '醫師，{bed} 的點滴打完了，要再接一瓶一樣的嗎？',
    phone: '再接一瓶一樣的', phoneReply: '{nurse}：「好，我接上。」',
    sleepNote: '等不到你回電，{nurse}先把點滴調到最慢，沒事。' },
  { id: 'fam', short: '家屬問出院時間', need: 'phone', pt: 'homegoing', visit: 'v-fam',
    text: '醫師，{bed} 的家屬想問，明天早上幾點可以辦出院？',
    phone: '明天主治醫師查房時會說明', phoneReply: '{nurse}：「好，我跟家屬說。」',
    sleepNote: '家屬在護理站等了半小時，{nurse}只好自己先安撫。' },
];
// Two more just before the day shift, every night, around the morning's patient: the phone
// still rings for small things. The insomniac from midnight wants a laxative; the new patient's 06:00
// pressure is reported because the rules say so.
export const DAWN_CALLS = [
  { id: 'stool', short: '三天沒大便', need: 'phone', pt: 'sleepless', visit: 'v-stool',
    text: '醫師，{bed} 的阿伯又按鈴了，說他三天沒大便，想要一顆軟便藥。',
    phone: '可以，給他一顆軟便藥', phoneReply: '{nurse}：「好，我拿給他。」',
    sleepNote: '沒回電話，阿伯又按了兩次叫人鈴，{nurse}只好跟他說等白班醫師。' },
  { id: 'bp', short: '早上血壓有點高', need: 'none', pt: 'newpt', visit: 'v-bp',
    text: '醫師，跟你報告一下，{bed} 昨天新來的病人，早上六點量血壓 148/86，他說沒有不舒服。',
    phone: '好，沒有不舒服就先觀察，交班時我會說', phoneReply: '{nurse}：「好～醫師你再睡一下，快交班了。」',
    sleepNote: '其實不回也沒事：血壓有一點高、人沒有不舒服，本來就可以等白班。' },
];
// The dead of night, every night: the patient going home tomorrow runs a low temperature and the
// rules say the doctor is told. It wakes the doctor not long before the patient of the dead of night.
export const DEEP_CALLS = [
  { id: 'temp', short: '體溫 37.8 度', need: 'phone', pt: 'homegoing', visit: 'v-temp',
    text: '醫師，跟你報告一下，{bed} 明天要出院的病人體溫 37.8 度，沒有發抖、沒有不舒服，睡得還不錯。',
    phone: '先多喝水，一小時後再量，超過 38 度或有發抖、喘再叫我', phoneReply: '{nurse}：「好，我一小時後再量。」',
    sleepNote: '沒回電話，{nurse}一小時後再量一次：37.4，沒事。' },
];
// what goes through the doctor's head after hanging up, one at random
export const AFTER_PHONE = [
  '眼睛閉上了，腦袋還在想剛剛那床。',
];

// Each bed below has the same shape:
//   id, name, who                    who the patient is (the bed and the nurse are drawn each
//                                    night; `bed: '03C'` pins one bed, for testing it)
//   call, again                      the phone call, and the second one if the doctor slept on it
//   phone, callWhy                   what a doctor might say on the phone instead of coming (the
//                                    call offers it like any other call), and why this one needed
//                                    someone at the bed; the nurse's second call says it
//   intro, introLate, late           what the nurse says at the bed; `late` is the state a
//                                    patient is found in after the doctor slept on the call
//   extra, extraOk, extraWarn        the monitor's fourth reading: 'sugar', 'ekg', 'breath', 'urine',
//                                    'skin', 'head', 'fit', 'temp', 'rr', 'stool' or 'rhythm', and which of its
//                                    words read as fine or as a worry
//   states                           the monitor in plain words; undefined keeps the last reading
//   steps                            the questions (see below); the first is `first`
//   warn                             what happens at danger 3: the first sign it is going badly
//   arrest step + cprNext/cprLine    when danger reaches 5 the heart stops; compressions are the
//                                    last chance. A bed with no arrest step fails instead (fail).
//   results                          a line per outcome, for the end of the bed and the summary
//   option draw: true                the choice draws blood as part of the care; it counts as the
//                                    bed's one blood test, and its report is the labs below
//   labs                             what a blood draw at this bed shows, LAB_WAIT game minutes
//                                    later: rows of [項目, 結果, 單位, 參考值, H/L] and a plain note
//                                    (a result written as a string, '1.0', is shown exactly so)
//   card                             what the public should take home

// One bed: an older person with diabetes, found sweaty and hard to wake at night.
export const HYPO = {
  id: 'phypo', name: '{name}', who: '{name} · {age} 歲 · 糖尿病',
  short: '叫不太醒，一直冒冷汗', late: 'seize', extra: 'sugar',
  // who it can be tonight, and tonight's numbers: the low sugar, after the glucose, and if it comes back
  persona: { sex: ['m', 'f'], age: [64, 86] },
  vars: { bg: [28, 45], bgUp: [118, 165], bgAgain: [46, 58] },
  results: { stable: '{name}穩住了', icu: '{name}救回來了，轉進加護病房' },
  labs: {
    rows: [['血糖 Glucose', '{bg}', 'mg/dL', '70–100', 'L'], ['肌酸酐 Creatinine（腎功能）', 1.6, 'mg/dL', '0.7–1.3', 'H'],
      ['鉀 K', 3.9, 'mmol/L', '3.5–5.1'], ['血紅素 Hb', 12.8, 'g/dL', '12–16']],
    note: '抽血的血糖也是 {bg}，跟床邊血糖機一樣低。血糖機一分鐘就有答案，抽血要等半小時，所以叫不醒的人先用血糖機。腎功能偏差，降血糖藥在身體裡排得慢，低血糖更容易發生，也更容易再來。',
  },
  call: '醫師！{bed} 的{name}叫不太醒，一直冒冷汗！',
  // if the doctor sleeps on the first call
  again: '醫師！{bed} 的{title}開始抽搐了，叫都叫不醒，你快來！',
  phone: '先幫{he}擦擦汗、量個血壓，有變化再叫我',
  callWhy: '有糖尿病的人叫不太醒、冒冷汗，要先想到低血糖。要有人到床邊測血糖、補糖，量血壓等不到答案。',
  intro: '醫師，這是{name}，{age} 歲，有糖尿病。剛剛巡房發現{he}叫不太醒，一直冒冷汗。',
  introLate: '醫師你終於來了！{title}剛剛開始抽，現在叫都叫不醒！',
  // The bedside monitor, in plain words. `sugar: undefined` keeps the last reading shown.
  states: {
    start: { hr: 108, bp: [104, 64], spo2: 96, sugar: null, mind: '叫不太醒，只會哼一聲' },
    worse: { hr: 122, bp: [100, 60], spo2: 95, sugar: undefined, mind: '叫不醒，冷汗直流' },
    seize: { hr: 138, bp: [150, 90], spo2: 88, sugar: undefined, mind: '全身抽搐，叫不醒' },
    low: { hr: 112, bp: [102, 62], spo2: 96, sugar: '{bg}', mind: '叫不太醒' },
    choke: { hr: 132, bp: [112, 70], spo2: 82, sugar: '{bg}', mind: '嗆咳不止，嘴唇發紫' },
    cleared: { hr: 118, bp: [106, 64], spo2: 92, sugar: '{bg}', mind: '叫不醒' },
    awake: { hr: 92, bp: [122, 74], spo2: 97, sugar: '{bgUp}', mind: '清醒，會回答' },
    relapse: { hr: 110, bp: [108, 66], spo2: 96, sugar: '{bgAgain}', mind: '又冒冷汗、叫不太醒' },
    arrest: { hr: 0, bp: null, spo2: null, sugar: undefined, mind: '沒有反應、沒有呼吸' },
    rosc: { hr: 118, bp: [96, 58], spo2: 94, sugar: 136, mind: '還沒醒，但心跳回來了' },
  },
  // grade: best moves on; ok and bad make the patient worse (danger +1 / +2) and are crossed
  // out with `why`. Too much danger and the patient seizes, then arrests.
  steps: {
    first: {
      ask: '{title}叫不太醒、全身冒冷汗。你先做什麼？',
      askWarn: '{title}在抽搐、叫不醒。你先做什麼？',
      options: [
        { id: 'sugar', text: '扎一下手指，測血糖', grade: 'best', min: 2, state: 'low', next: 'treat',
          say: '血糖機「嗶」一聲：{bg}。{nurse}：「{bg}！好低。」（一般人空腹大約 70 到 100）' },
        { id: 'letsleep', text: '讓{he}睡，可能只是太累了', grade: 'bad', min: 10, state: 'worse',
          say: '十分鐘後，{nurse}又跑來：「醫師，{he}冷汗越來越多，叫都叫不醒耶……」',
          why: '叫不醒不是睡著。有糖尿病的人冒冷汗、叫不醒，要先想到低血糖。' },
        { id: 'ct', text: '推去照腦部電腦斷層，怕是中風', grade: 'ok', min: 15, state: 'worse',
          say: '排檢查、推床過去要好一陣子，{title}的冷汗一直沒停。',
          why: '中風也可能叫不醒，但測血糖只要一分鐘。叫不醒的人，先排除低血糖。' },
      ],
    },
    treat: {
      ask: '血糖只有 {sugar}，{title}叫不太醒。接下來？',
      options: [
        { id: 'd50', text: '從點滴打一支高濃度葡萄糖', grade: 'best', min: 3, state: 'awake', next: 'after',
          say: '葡萄糖推進去沒幾分鐘，{title}眼睛慢慢睜開：「我……怎麼了？」' },
        { id: 'feed', text: '扶{he}坐起來，餵{he}喝糖水', grade: 'bad', min: 2, state: 'choke', next: 'choke', quiet: true,
          say: '{title}吞不下去，糖水嗆進氣管，一直咳，嘴唇開始發紫！',
          why: '叫不醒的人不能從嘴巴餵東西，會嗆到，甚至堵住呼吸道。' },
        { id: 'wait', text: '再觀察 15 分鐘看看', grade: 'bad', min: 15, state: 'seize',
          say: '十五分鐘後，{title}突然全身抽搐！',
          why: '血糖這麼低，腦部沒有能量，拖越久越危險，要馬上補糖。' },
      ],
    },
    choke: {
      ask: '糖水嗆到了，{title}一直咳、嘴唇發紫！你要？',
      options: [
        { id: 'side', text: '讓{he}側躺、抽痰，不要再餵了', grade: 'best', min: 3, state: 'cleared', next: 'treat',
          say: '抽出好多糖水，嘴唇慢慢不紫了。可是血糖還是很低，人還是叫不醒。' },
        { id: 'more', text: '繼續餵，糖分一定要補進去', grade: 'bad', min: 2, next: 'arrest',
          say: '糖水整個堵住了呼吸道……{title}不動了。',
          why: '嗆到的時候繼續餵，只會把呼吸道堵死。' },
      ],
    },
    after: {
      ask: '{title}醒了，血糖 {bgUp}。接下來？',
      options: [
        { id: 'keep', text: '接上葡萄糖點滴、請{he}吃點東西、先停降血糖藥，一小時後再測血糖', grade: 'best', min: 5, next: 'done', outcome: 'stable',
          say: '{title}吃了半個麵包：「醫師，不好意思，晚餐我只吃兩口……」{he}吃的那種降血糖藥，腎不好的人藥效會拖很久。{nurse}：「那我今晚多測幾次。」' },
        { id: 'gosleep', text: '好了，回去睡覺', grade: 'bad', min: 60, state: 'relapse', next: 'treat',
          say: '你才躺下一個小時，電話又響了：「醫師，{title}又冒冷汗了，血糖 {bgAgain}！」你只好又爬起來。',
          why: '低血糖常常會再來，尤其是吃降血糖藥或打胰島素的人。醒了要吃東西、接點滴，過一陣子再測。' },
        { id: 'stopmed', text: '把降血糖藥停掉就好，不用再測血糖', grade: 'ok', min: 3,
          say: '藥停了，可是今晚吃下去的藥還在作用。',
          why: '停藥是對的，但已經吃下去的藥還會作用好幾個小時，腎不好的人更久。還是要接葡萄糖點滴、吃東西、再測血糖。' },
      ],
    },
    arrest: {
      ask: '{title}沒有反應、沒有呼吸！你要？',
      options: [
        { id: 'cpr', text: '拍拍病人、大聲叫，確認沒反應、沒呼吸，馬上廣播急救、請護理師推 AED 來，開始壓胸', grade: 'best', min: 0, cpr: true },
        { id: 'recheck', text: '先再測一次血糖，確定是不是低血糖', grade: 'bad', min: 2,
          death: '沒有呼吸心跳的時候，每拖一分鐘，救回來的機會就少很多。這時候要先壓胸、叫人拿 AED。' },
      ],
    },
    rosc: {
      ask: '{title}的心跳回來了，但人還沒醒。接下來？',
      options: [
        { id: 'icu', text: '聯絡加護病房，轉過去密切照顧', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '加護病房的護理師推床來接{title}。你在病歷上補完紀錄，窗外天快亮了。' },
        { id: 'stay', text: '留在一般病房觀察就好', grade: 'ok', min: 3,
          say: '{nurse}：「醫師……{he}剛剛心跳停過耶，我一個人顧整排病人，顧不來。」',
          why: '心跳停過的病人，要在加護病房密切監測。' },
      ],
    },
  },
  warn: { state: 'seize', line: '{nurse}：「醫師！{title}開始抽搐了！」', log: '{name}開始抽搐' },
  arrestLine: '{nurse}：「醫師！{title}沒有呼吸了！摸不到脈搏！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: '壓了兩分鐘，{nurse}同時從點滴推進葡萄糖。「醫師！摸得到脈搏了！」',
  // what the public should take home, shown when the bed ends either way
  card: {
    title: '低血糖：你可以記住的四件事',
    points: [
      '有糖尿病的人突然冒冷汗、發抖、心跳快、講話怪怪的或叫不醒，要先想到低血糖。',
      '還清醒、能自己吞：先吃大約 15 公克的糖（約 120–150 毫升果汁或含糖汽水，或 3–4 顆方糖），15 分鐘後再測一次血糖。',
      '叫不醒、吞不下：不要硬餵，會嗆到。讓他側躺，馬上打 119。家裡如果有醫師開的升糖素（鼻噴或注射），可以先用。',
      '醒了之後要吃點東西。低血糖常常會再來，尤其是吃降血糖藥或打胰島素的人。',
    ],
  },
  // Two ways the night can tell it. The second is the same low sugar dressed as something else:
  // a patient who is agitated and talking nonsense, and a nurse asking for a sedative on the
  // phone. The trap is treating the behaviour instead of testing the sugar.
  variants: [
    { id: 'sweaty', label: '冒冷汗、叫不太醒' },
    { id: 'confused', label: '躁動、講話顛三倒四',
      short: '一直亂動、講話顛三倒四',
      call: '醫師，{bed} 的{name}一直在床上亂動、講話顛三倒四，還想拔點滴，可以給{he}一支鎮靜劑嗎？',
      phone: '好，給{he}一支鎮靜劑，讓{he}先睡',
      callWhy: '有糖尿病的人突然躁動、講話顛三倒四、一直流汗，要先想到低血糖。打鎮靜劑會讓人更叫不醒，把警訊蓋掉；要有人到床邊測血糖。',
      intro: '醫師，這是{name}，{age} 歲，有糖尿病。剛剛開始一直在床上亂動、想拔點滴，講話顛三倒四，全身都是汗。',
      states: { start: { mind: '躁動不安、講話顛三倒四，一直冒汗' }, low: { mind: '躁動、講話聽不懂' } },
      steps: {
        treat: {
          ask: '血糖只有 {sugar}，{title}還在亂動、講話聽不懂。接下來？',
          options: [
            { id: 'd50', say: '葡萄糖推進去沒幾分鐘，{title}慢慢安靜下來，看著你：「我……怎麼了？」' },
            { id: 'feed', why: '意識不清楚的人，不管是叫不醒還是躁動，都不能從嘴巴餵東西，容易嗆到，甚至堵住呼吸道。' },
          ],
        },
        first: {
          ask: '{title}躁動不安、講話顛三倒四、一直冒汗。你先做什麼？',
          options: [
            { id: 'letsleep', drop: true },
            { id: 'sedate', text: '打一支鎮靜劑，讓{he}安靜下來', grade: 'bad', min: 5, state: 'worse',
              say: '鎮靜劑打下去，{title}安靜了……可是越來越叫不醒，汗還是一直流。',
              why: '有糖尿病的人突然躁動、講話怪怪的，要先想到低血糖。鎮靜劑會讓人更叫不醒，把低血糖的警訊蓋掉。' },
            { id: 'tie', text: '先用約束帶綁住，免得{he}跌下床', grade: 'ok', min: 5, state: 'worse',
              say: '綁好了，{title}還是一直掙扎、冒汗，講的話越來越聽不懂。',
              why: '綁住只是不讓人跌倒，沒有找出原因。突然躁動的人，先測血糖，只要一分鐘。' },
          ],
        },
      },
    },
  ],
};

// Someone whose right arm and speech go in the night. The point: 微笑、舉手、說你好, the time they
// were last well, and no food, water or aspirin before the scan. A stroke left too long is not
// a cardiac arrest; it fails as a missed window and a life with one side that does not move.
export const STROKE = {
  id: 'pstroke', name: '{name}', who: '{name} · {age} 歲 · 高血壓',
  short: '右手突然沒力、講話怪怪的', late: 'worse', extra: 'sugar',
  // tonight's sugar is normal, and she was last well a while ago but well inside the window. Her
  // pressure only moves up: the text has it above 185 when the drug is decided on.
  persona: { sex: ['m', 'f'], age: [58, 84] },
  vars: { bg: [104, 138], lkw: ['四十分鐘', '一個小時', '一個半小時', '兩個小時'] },
  jitter: { sbp: [0, 10] },
  // the wall monitor once the patient is stable (without it, the calm screen)
  calm: 'treated',
  results: { stable: '{name}打上了血栓溶解劑，右手慢慢有力了' },
  labs: {
    rows: [['血糖 Glucose', '{bg}', 'mg/dL', '70–140'], ['血小板 Platelet', 210, '×10³/µL', '150–400'],
      ['凝血 INR', '1.0', '', '0.8–1.2'], ['鈉 Na', 138, 'mmol/L', '135–145']],
    note: '血糖正常，表示不是低血糖造成的；血小板和凝血功能正常，打血栓溶解劑比較安全。不過不用等這張報告才去照斷層：中風每一分鐘都重要，報告可以邊做邊等。',
  },
  call: '醫師，{bed} 的{name}剛剛起來上廁所，右手拿不住杯子，講話也怪怪的。',
  again: '醫師！{bed} 的{name}右邊整個不能動了，叫{he}也比較不醒！',
  phone: '可能剛睡醒還迷糊，讓{he}先躺著休息，有變化再叫我',
  callWhy: '手突然沒力、講話怪怪的，要先想到中風。中風的治療有時間限制，不能「睡一覺看看」。',
  intro: '醫師，這是{name}，{age} 歲，有高血壓。剛剛起來上廁所，右手拿不住杯子，講話也怪怪的。',
  introLate: '醫師你來了……{title}右邊整個不能動了，叫{he}也比較不醒。',
  states: {
    start: { hr: 88, bp: [188, 102], spo2: 97, sugar: null, mind: '清醒，但講話含糊、右手沒力' },
    fast: { hr: 88, bp: [188, 102], spo2: 97, sugar: undefined, mind: '右邊嘴角下垂、右手舉不起來、講話不清' },
    worse: { hr: 94, bp: [198, 108], spo2: 95, sugar: undefined, mind: '叫比較不醒，右邊都不能動' },
    choke: { hr: 104, bp: [192, 104], spo2: 89, sugar: undefined, mind: '嗆咳，右手不能動' },
    slow: { hr: 90, bp: [186, 100], spo2: 97, sugar: undefined, mind: '講話含糊、右手沒力' },
    treated: { hr: 82, bp: [164, 92], spo2: 97, sugar: '{bg}', mind: '清醒，講話慢慢清楚，右手可以抬一點' },
    warned: { hr: 96, bp: [204, 112], spo2: 94, sugar: undefined, mind: '叫不太醒，右半邊完全不能動' },
  },
  steps: {
    first: {
      ask: '{name}講話含糊、右手沒力。你先做什麼？',
      askWarn: '{title}右邊越來越不能動、叫不太醒。你先做什麼？',
      options: [
        { id: 'fast', text: '請{he}微笑、舉起雙手、說一聲「你好」', grade: 'best', min: 2, state: 'fast', next: 'time',
          say: '{title}一笑，右邊嘴角垂下來；兩手舉高，右手慢慢掉下去；「你好」說得含含糊糊。{nurse}：「三個都有……」' },
        { id: 'sleep', text: '讓{he}先睡，明天早上再看', grade: 'bad', min: 30, state: 'worse',
          say: '半小時後，{nurse}又打來：「醫師，{title}叫比較不醒了，右邊都不能動！」',
          why: '突然講話不清楚、一隻手沒力，是中風的警訊。睡一覺，就可能錯過治療時間。' },
        { id: 'aspirin', text: '先給{he}吃一顆阿斯匹靈', grade: 'bad', min: 5, state: 'choke',
          say: '{nurse}：「醫師，{he}吞不太下去，一直嗆……」',
          why: '中風也可能是腦出血，還沒照電腦斷層前，不能先給阿斯匹靈。中風的人也常常吞不好，吃藥喝水容易嗆到。' },
      ],
    },
    time: {
      ask: '看起來很像中風。接下來最重要的是？',
      options: [
        { id: 'lkw', text: '問清楚{he}「最後一次還正常」是幾點', grade: 'best', min: 2, next: 'act',
          say: '{nurse}翻了一下紀錄：「{lkw}前我巡房，{he}還跟我聊天，好好的。」——還在治療的黃金時間內。' },
        { id: 'wait', text: '等明天早上神經科醫師上班再說', grade: 'bad', min: 30, state: 'worse',
          say: '時間一分一秒過去，{title}的右手越來越不能動。',
          why: '中風治療要搶時間。血管塞住的時候，每拖一分鐘，大約就有兩百萬個腦細胞死掉。' },
        { id: 'bp', text: '先用藥把血壓降到正常再說', grade: 'ok', min: 10, state: 'slow',
          say: '血壓降了一點，{title}的右手還是一樣沒力。',
          why: '中風時血壓高，常常是身體在努力把血送到腦部，降到「正常」反而傷腦。只有要打血栓溶解劑時，才要先降到 185/110 以下，而且要慢慢降。現在最要緊的是搞清楚發作時間。' },
      ],
    },
    act: {
      ask: '最後正常是{lkw}前，還來得及。接下來？',
      options: [
        { id: 'team', text: '測血糖，同時通知中風小組、馬上照腦部電腦斷層', grade: 'best', min: 25, state: 'treated', next: 'after',
          say: '血糖 {bg}，不是低血糖。斷層沒有出血，血管攝影也同時照了，看要不要再用導管把血栓拉出來。血壓還在打藥的上限 185 以上，先用點滴藥慢慢降到 180 以下，神經科醫師才說：「可以打血栓溶解劑。」打上藥半小時後，{title}的右手可以抬起來一點了。' },
        { id: 'ctonly', text: '先照電腦斷層，血糖等一下再測', grade: 'ok', min: 10,
          say: '推床去照斷層的路上，{nurse}問：「醫師，血糖要不要先測一下？」',
          why: '低血糖也會讓人手沒力、講話不清楚，看起來很像中風。測血糖只要一分鐘，要一起做。' },
        { id: 'later', text: '先觀察一個小時，看會不會自己好', grade: 'bad', min: 60, state: 'worse',
          say: '一個小時後，{title}的右手完全抬不起來了。',
          why: '中風的症狀有時候會暫時變好，但還是要馬上檢查。等它自己好，往往就錯過治療時間。' },
      ],
    },
    after: {
      ask: '{title}打完藥，右手可以抬起來一點了。接下來？',
      options: [
        { id: 'icu', text: '轉加護病房，密切注意血壓和手腳力氣', grade: 'best', min: 15, next: 'done', outcome: 'stable',
          say: '加護病房的護理師來接{title}。臨走前，{title}含糊地說：「醫師……謝謝。」' },
        { id: 'ward', text: '回一般病房，明天早上再看', grade: 'ok', min: 3,
          say: '{nurse}：「醫師，打完這個藥不是要一直看血壓跟神經狀況嗎？我們這排就我一個人……」',
          why: '打完血栓溶解劑，可能會腦出血。最初一天要在加護病房密切監測。' },
        { id: 'eat', text: '{he}說肚子餓，先讓{he}吃點東西', grade: 'bad', min: 5, state: 'choke',
          say: '{title}吃了一口稀飯，就嗆得滿臉通紅。',
          why: '中風的人要先檢查吞嚥，確定吞得好才能吃東西，不然容易嗆到、得吸入性肺炎。' },
      ],
    },
  },
  warn: { state: 'warned', line: '{nurse}：「醫師！{title}右邊整個不能動了，叫{he}也比較不醒！」', log: '{name}右半邊完全不能動' },
  fail: {
    title: '{name}錯過了治療時間',
    text: '{he}活下來了，但右半邊可能從此不能動，也很難再說出完整的話。中風拖得越久，留下的後遺症越多。',
  },
  card: {
    title: '中風：你可以記住的四件事',
    points: [
      '記住「微笑、舉手、說你好」：嘴角歪一邊、一隻手舉不起來、講話不清楚，任何一個突然出現，都可能是中風。',
      '看一下時間，記住他「最後一次還正常」是幾點。醫師要靠這個時間，決定能不能打血栓溶解劑或取出血栓。',
      '馬上打 119，不要「睡一覺看看」。中風治療要搶時間，越早越好。',
      '先不要讓他吃東西、喝水或吃藥（包括阿斯匹靈）。中風的人容易嗆到，也可能是腦出血。',
    ],
  },
  // Two ways the night can tell it, and the answer to 「最後一次還正常是幾點」 decides which: still
  // inside the window for the clot-dissolving drug, or a patient who felt it at lunch and said
  // nothing. Late, the drug is off the table, but the stroke team is still the call: a large
  // blocked vessel can still be cleared with a catheter. Giving the drug anyway is the trap.
  variants: [
    { id: 'window', label: '還在打藥的黃金時間內' },
    { id: 'late', label: '中午就開始了，超過打藥時間',
      results: { stable: '{name}用導管取出了血栓，右手慢慢有力了' },
      steps: {
        time: {
          options: [
            { id: 'lkw', say: '{nurse}問了一下，{title}含糊地說：「中午吃飯的時候……右手就怪怪的……想說休息一下就好……」從中午到現在，已經好幾個小時了。' },
          ],
        },
        act: {
          ask: '從中午到現在，已經超過打血栓溶解劑的時間了。接下來？',
          options: [
            { id: 'team', say: '血糖 {bg}，不是低血糖。斷層沒有出血；已經超過打藥的時間，但血管攝影看到一條大血管塞住。神經科醫師說：「還可以用導管把血栓拉出來。」做完導管，{title}的右手可以抬起來一點了。' },
            { id: 'tpa', text: '趕快打血栓溶解劑，搶時間', grade: 'bad', min: 10,
              say: '{nurse}拿著藥遲疑了一下：「醫師，{he}中午就開始了耶，現在打不會出血嗎？」你停下來，十分鐘就這樣過去了。',
              why: '血栓溶解劑要在發作後幾個小時內打，超過時間，腦出血的風險比好處大。所以「最後一次還正常」是幾點這麼重要。' },
            { id: 'giveup', text: '超過時間了，反正不能打藥，明天再說', grade: 'bad', min: 30, state: 'worse',
              say: '你回值班室躺下。天亮前，{nurse}打來：「醫師，{title}右邊整個不能動了……」',
              why: '超過打藥的時間，還是可能用導管把血栓取出來（有些人到發作後一天內都還可以）。一樣要馬上通知中風小組、做檢查。' },
            { id: 'later', drop: true },
          ],
        },
        after: {
          ask: '{title}做完導管，右手可以抬起來一點了。接下來？',
          options: [
            { id: 'ward', why: '剛取完血栓的頭一天，血管可能再塞住，也可能出血。要在加護病房密切看血壓和手腳力氣。' },
          ],
        },
      },
    },
  ],
};

// Chest pain that is the heart. The point: an ECG within minutes, not an antacid; the cardiology
// team at once; and a patient waiting for the cath lab stays in bed on the monitor. The second
// story is the one the public misses most: an older diabetic who only says the stomach is upset.
export const CHEST = {
  id: 'pchest', name: '{name}', who: '{name} · {age} 歲 · 高血壓、抽菸',
  short: '胸口悶痛、一直冒冷汗', late: 'shock', extra: 'ekg', extraOk: ['正常'], extraWarn: ['還在變化'],
  persona: { sex: ['m', 'f'], age: [52, 80] },
  // the nurse says 「80 幾」 when the pressure drops: the monitor stays within that
  jitter: { sbp: [-3, 3] },
  vars: { mins: ['十分鐘', '二十分鐘', '半小時'] },
  calm: 'cath',
  results: { stable: '{name}塞住的血管打通了，放了一支支架', icu: '{name}救回來了，血管打通後轉進加護病房' },
  labs: {
    rows: [['心肌旋轉蛋白 Troponin I', '0.86', 'ng/mL', '< 0.04', 'H'], ['鉀 K', 4.1, 'mmol/L', '3.5–5.1'],
      ['血紅素 Hb', 13.6, 'g/dL', '12–16'], ['肌酸酐 Creatinine（腎功能）', 1.0, 'mg/dL', '0.7–1.3']],
    note: '心肌旋轉蛋白升高，表示心肌正在受損。不過這個數字常常要幾個小時才升上來，一開始正常也不能放心。所以胸痛不能等抽血報告：心電圖幾分鐘就有答案，異常就要馬上找心臟科。',
  },
  call: '醫師，{bed} 的{name}說胸口很悶、很痛，一直冒冷汗。',
  again: '醫師！{bed} 的{name}臉色好白，血壓掉到 80 幾，叫{he}只會哼一聲！',
  phone: '可能是胃食道逆流，先給{he}一包胃藥',
  callWhy: '胸口悶痛又冒冷汗，要先想到心肌梗塞。要有人馬上到床邊做心電圖，胃藥等不到答案。',
  intro: '醫師，這是{name}，{age} 歲，有高血壓，菸抽了很多年。{he}說胸口像被大石頭壓住，痛了{mins}，一直冒冷汗。',
  introLate: '醫師你終於來了！{title}血壓一直掉，臉色好白，叫{he}只會哼一聲！',
  states: {
    start: { hr: 98, bp: [152, 92], spo2: 95, ekg: null, mind: '清醒，抓著胸口，冷汗直流' },
    worse: { hr: 112, bp: [118, 74], spo2: 93, ekg: undefined, mind: '胸口越來越痛，喘不過氣' },
    shock: { hr: 124, bp: [85, 52], spo2: 90, ekg: undefined, mind: '臉色蒼白，叫了只會哼一聲' },
    stemi: { hr: 100, bp: [148, 90], spo2: 95, ekg: 'ST 段上升', mind: '清醒，胸口還是很痛' },
    cath: { hr: 84, bp: [132, 80], spo2: 97, ekg: '還在變化', mind: '胸口不痛了，人放鬆下來' },
    arrest: { hr: 0, bp: null, spo2: null, ekg: '心室顫動', mind: '沒有反應、沒有呼吸' },
    rosc: { hr: 108, bp: [98, 60], spo2: 93, ekg: 'ST 段上升', mind: '還沒醒，但心跳回來了' },
  },
  steps: {
    first: {
      ask: '{title}胸口很悶、一直冒冷汗。你先做什麼？',
      askWarn: '{title}血壓在掉、臉色蒼白。你先做什麼？',
      options: [
        { id: 'ekg', text: '馬上做一張心電圖', grade: 'best', min: 5, state: 'stemi', next: 'team',
          say: '心電圖一印出來，{nurse}倒吸一口氣：「醫師，這個 ST 段……」是心肌梗塞的樣子。' },
        { id: 'antacid', text: '給一包胃藥，應該是胃食道逆流', grade: 'bad', min: 10, state: 'worse',
          say: '胃藥吃下去十分鐘，{title}還是抓著胸口：「醫師，這不是胃……好像有東西壓著。」',
          why: '胸口悶痛又冒冷汗，要先想到心臟。胃藥不會讓心肌梗塞變好，心電圖幾分鐘就做得出來。' },
        { id: 'enzyme', text: '先抽血驗心肌酵素，報告出來再說', grade: 'ok', min: 30, state: 'worse', draw: true,
          say: '等報告的半小時，{title}的胸口一直沒有好。',
          why: '心肌酵素常常要幾個小時才升高，一開始正常也不能放心。胸痛先做心電圖，幾分鐘就有答案。' },
      ],
    },
    team: {
      ask: '心電圖看起來是心肌梗塞。接下來？',
      options: [
        { id: 'cardio', text: '馬上打給心臟科，啟動心導管團隊', grade: 'best', min: 5, next: 'wait',
          say: '你打給心臟科：「急性心肌梗塞，ST 段上升。」心臟科醫師說：「啟動心導管團隊，二十分鐘內到。」{nurse}同時照醫囑給了抗血小板藥。' },
        { id: 'morning', text: '寫好紀錄，明天早上照會心臟科', grade: 'bad', min: 30, state: 'worse',
          say: '你回到值班室。半小時後，{nurse}打來：「醫師，{title}越來越喘，血壓在掉……」',
          why: '心肌梗塞是心臟的血管塞住，每拖一分鐘就有更多心肌壞死。要馬上找心臟科把血管打通。' },
        { id: 'nitro', text: '給一顆舌下含片，痛好了就沒事', grade: 'ok', min: 5,
          say: '含片含下去，{title}說好像比較不痛一點……可是心電圖還是一樣。',
          why: '舌下含片可以讓胸痛緩一點，但沒有打通塞住的血管。痛比較好，不代表沒事。' },
      ],
    },
    wait: {
      ask: '心導管團隊在路上了。{title}說想起來上廁所。你要？',
      options: [
        { id: 'pan', text: '請{he}躺著用便盆，監視器一直接著', grade: 'best', min: 20, state: 'cath', next: 'done', outcome: 'stable',
          say: '{nurse}拿來便盆，監視器一直貼著。二十分鐘後，心導管團隊推床來接{title}。半小時後，心臟科醫師打來：「塞住的血管打通了，放了一支支架。」' },
        { id: 'walk', text: '讓{he}自己走去廁所，順便活動一下', grade: 'bad', min: 3, next: 'arrest',
          say: '{title}才走到廁所門口，突然整個人倒下去！' },
        { id: 'eat', text: '{he}說肚子餓，先讓{he}吃點東西', grade: 'ok', min: 5,
          say: '{nurse}：「醫師，等一下要做心導管耶，可以吃嗎？」',
          why: '等一下要做心導管，先不要吃東西；心肌梗塞的人也常常會吐，容易嗆到。' },
      ],
    },
    arrest: {
      ask: '{title}倒下了，沒有反應、沒有呼吸！你要？',
      options: [
        { id: 'cpr', text: '確認沒反應、沒呼吸，馬上廣播急救、請護理師推 AED 來，開始壓胸', grade: 'best', min: 0, cpr: true },
        { id: 'ecg', text: '先做一張心電圖，看是什麼問題', grade: 'bad', min: 5,
          death: '心跳停止的時候，要先壓胸、拿 AED，不是先做檢查。每拖一分鐘，救回來的機會就少很多。' },
      ],
    },
    rosc: {
      ask: '{title}的心跳回來了，但人還沒醒。接下來？',
      options: [
        { id: 'cathnow', text: '馬上送心導管室，之後轉加護病房', grade: 'best', min: 20, next: 'done', outcome: 'icu',
          say: '心導管團隊直接把{title}推進導管室。天亮前，心臟科醫師打來：「血管打通了，人轉進加護病房。」' },
        { id: 'stay', text: '留在病房，等早上再說', grade: 'ok', min: 3,
          say: '{nurse}：「醫師……{he}剛剛心跳停過耶，我一個人顧整排病人，顧不來。」',
          why: '心肌梗塞造成心跳停止，要馬上打通血管，之後在加護病房照顧。' },
      ],
    },
  },
  warn: { state: 'shock', line: '{nurse}：「醫師！{title}血壓掉到 80 幾，臉色好白！」', log: '{name}血壓掉下來' },
  arrestLine: '{nurse}：「醫師！{title}沒有反應了！摸不到脈搏！」',
  cprNext: 'rosc', cprState: 'rosc',
  cprLine: 'AED 貼上去：「建議電擊。」電完繼續壓。兩分鐘後，{nurse}喊：「醫師！摸得到脈搏了！」',
  card: {
    title: '胸痛：你可以記住的四件事',
    points: [
      '胸口悶、壓、緊，痛到肩膀、下巴或手臂，又冒冷汗、喘，要先想到心肌梗塞，馬上打 119。',
      '不要「吃個胃藥、睡一覺看看」。心肌梗塞要搶時間，越早打通血管，心臟受傷越少。',
      '等救護車的時候，不要走動，也不要自己開車去醫院。',
      '有人倒下、沒反應、沒呼吸：馬上叫人、打 119、開始壓胸，請人拿 AED 來。',
    ],
  },
  variants: [
    { id: 'typical', label: '胸口像被大石頭壓住' },
    { id: 'atypical', label: '沒有胸痛，只說胃不舒服',
      who: '{name} · {age} 歲 · 糖尿病、高血壓',
      short: '胃悶、想吐，一直冒冷汗',
      persona: { age: [68, 88] },
      call: '醫師，{bed} 的{name}說胃悶悶的、想吐，人很累，可以給{he}一包胃藥嗎？',
      phone: '好，給{he}一包胃藥',
      callWhy: '有糖尿病的長輩，心肌梗塞常常不會胸痛，只說胃不舒服、想吐、很累。又冒冷汗、臉色不好，要先做心電圖。',
      intro: '醫師，這是{name}，{age} 歲，有糖尿病和高血壓。{he}說胃悶悶的、想吐，全身沒力，還一直冒冷汗。',
      states: {
        start: { mind: '說胃悶、想吐，冒冷汗，很累' },
        worse: { mind: '越來越喘，冷汗直流' },
        stemi: { mind: '清醒，還是胃悶、冒冷汗' },
        cath: { mind: '不悶了，人放鬆下來' },
      },
      steps: {
        team: {
          options: [
            { id: 'nitro', text: '給一顆舌下含片，舒服一點就沒事',
              say: '含片含下去，{title}說好像比較舒服一點……可是心電圖還是一樣。',
              why: '舌下含片可以讓不舒服緩一點，但沒有打通塞住的血管。比較舒服，不代表沒事。' },
          ],
        },
        first: {
          ask: '{title}說胃悶、想吐，一直冒冷汗。你先做什麼？',
          options: [
            { id: 'antacid', text: '給一包胃藥，應該是胃的問題',
              say: '胃藥吃下去十分鐘，{title}還是冒冷汗：「醫師，怎麼越來越喘……」',
              why: '有糖尿病的長輩，心肌梗塞常常不會胸痛，只覺得胃不舒服、想吐、很累。冒冷汗、臉色不好，要先做心電圖。' },
          ],
        },
      },
      card: {
        title: '心肌梗塞：你可以記住的四件事',
        points: [
          '有糖尿病的人、長輩和女性，心肌梗塞常常不會胸痛，只說胃不舒服、想吐、很累、喘。',
          '突然這樣又冒冷汗、臉色不好，不要當成胃病，馬上打 119。',
          '等救護車的時候，不要走動，也不要自己開車去醫院。',
          '有人倒下、沒反應、沒呼吸：馬上叫人、打 119、開始壓胸，請人拿 AED 來。',
        ],
      },
    },
  ],
};

// An infection that has reached the blood: fever, shaking, a pressure lower than the patient's
// own. The point: blood cultures, fluids and antibiotics within the hour, not a fever pill. The
// second story grows out of the 02:30 small call (37.8 度, going home tomorrow): the doctor told
// the nurse to call back if it passed 38 or the patient shook, and an hour later she does.
export const SEPSIS = {
  id: 'psepsis', name: '{name}', who: '{name} · {age} 歲 · 泌尿道感染',
  short: '發燒 39 度、一直發抖', late: 'shock', extra: 'temp', extraOk: ['37.2°C'], extraWarn: ['38.1°C'],
  persona: { sex: ['m', 'f'], age: [66, 88] },
  // the nurse says 「90 左右」 and 「70 幾」 on the phone: the monitor stays within that
  jitter: { sbp: [-4, 4], dbp: [-3, 3] },
  results: { stable: '{name}的血壓穩住了，抗生素也用上了' },
  labs: {
    rows: [['白血球 WBC', 18.6, '×10³/µL', '4–10', 'H'], ['乳酸 Lactate', '4.2', 'mmol/L', '0.5–2.0', 'H'],
      ['肌酸酐 Creatinine（腎功能）', 1.9, 'mg/dL', '0.7–1.3', 'H'], ['C 反應蛋白 CRP', 15.2, 'mg/dL', '< 0.5', 'H']],
    note: '白血球和發炎指數都很高，表示身體有嚴重感染；乳酸升高、腎功能變差，表示器官已經開始缺氧。這就是敗血症：感染讓血壓掉、影響到器官，要盡快給點滴和抗生素，不能等。',
  },
  call: '醫師，{bed} 的{name}發燒到 39 度，一直發抖，血壓掉到 90 左右，比{he}平常低很多。',
  again: '醫師！{bed} 的{name}血壓掉到 70 幾，叫{he}都不太回應了！',
  phone: '先給{he}一顆退燒藥，一小時後再量',
  callWhy: '發燒又發抖、血壓比平常低，可能是敗血症：細菌跑進血液，血壓會一直掉。要有人到床邊，盡快抽血培養、打點滴、給抗生素，退燒藥救不了血壓。',
  intro: '醫師，這是{name}，{age} 歲，這次是泌尿道感染住院。剛剛開始發抖，燒到 39 度，血壓比{he}平常低很多。',
  introLate: '醫師你來了！{title}血壓一直掉，叫{he}都不太回應了！',
  states: {
    start: { hr: 112, bp: [92, 54], spo2: 95, temp: '39.2°C', mind: '清醒，一直發抖，說好冷' },
    worse: { hr: 124, bp: [84, 48], spo2: 93, temp: undefined, mind: '發抖，有點迷糊，問話答不太出來' },
    shock: { hr: 132, bp: [74, 42], spo2: 91, temp: undefined, mind: '叫了才睜眼，手腳冰冷' },
    fluids: { hr: 104, bp: [100, 60], spo2: 95, temp: undefined, mind: '還在發抖，但比較清楚了' },
    better: { hr: 96, bp: [108, 64], spo2: 96, temp: '38.1°C', mind: '清醒，不太抖了' },
  },
  steps: {
    first: {
      ask: '{title}發燒、一直發抖，血壓偏低。你先做什麼？',
      askWarn: '{title}血壓一直掉、意識變差。你先做什麼？',
      options: [
        { id: 'culture', text: '抽血（含血液培養）、驗乳酸，馬上打上點滴', grade: 'best', min: 8, state: 'fluids', next: 'abx', draw: true,
          say: '{nurse}抽好兩套血液培養，點滴開到最快。十分鐘後，血壓回到 100 左右。' },
        { id: 'antipyretic', text: '先給一顆退燒藥，退燒就好了', grade: 'bad', min: 15, state: 'worse',
          say: '退燒藥吃了，{title}還是一直抖，血壓又掉了一點。',
          why: '退燒藥只會讓體溫降一點，不會讓血壓回來。發燒又血壓低，要先想到敗血症：抽血培養、打點滴、給抗生素。' },
        { id: 'blanket', text: '多蓋幾條被子，讓{he}不要那麼冷', grade: 'ok', min: 5, state: 'worse',
          say: '{title}裹著兩條被子，還是抖個不停。',
          why: '發抖是感染很嚴重的警訊，不只是冷。蓋被子沒有處理到原因。' },
      ],
    },
    abx: {
      ask: '點滴打上了，血液培養也抽了。接下來？',
      options: [
        { id: 'abx', text: '馬上給抗生素，不用等報告', grade: 'best', min: 5, state: 'better', next: 'after',
          say: '抗生素一小時內就掛上去了。{nurse}：「血壓上來了，{he}說比較不冷了。」' },
        { id: 'waitculture', text: '等血液培養報告出來，再決定用哪一種抗生素', grade: 'bad', min: 60, state: 'shock',
          say: '一個小時過去，培養報告還沒出來，{title}的血壓又往下掉。',
          why: '血液培養要好幾天才有結果。敗血症要在一小時內給抗生素，先用涵蓋範圍廣的，之後再看報告調整。' },
        { id: 'fluidonly', text: '點滴繼續打就好，血壓已經回來了', grade: 'ok', min: 30, state: 'worse',
          say: '點滴打了半小時，血壓又慢慢往下掉。',
          why: '點滴只是先把血壓撐住，細菌還在。抗生素越早給越好，每晚一小時，危險就多一分。' },
      ],
    },
    after: {
      ask: '{title}的血壓穩住了，體溫開始降。接下來？',
      options: [
        { id: 'watch', text: '交代護理師每小時量血壓、看尿量和意識，變差馬上叫你', grade: 'best', min: 5, next: 'done', outcome: 'stable',
          say: '{nurse}：「好，我每小時看一次。」天亮前，{title}的血壓都穩穩的。' },
        { id: 'sleep', text: '好了，回去睡覺，有事再說', grade: 'ok', min: 3,
          say: '{nurse}：「醫師，那要多久量一次？量到多少要叫你？」',
          why: '敗血症剛開始治療的頭幾個小時，血壓可能又掉下來。要交代清楚多久量一次、什麼情況要叫你。' },
      ],
    },
  },
  warn: { state: 'shock', line: '{nurse}：「醫師！血壓掉到 70 幾了，{title}叫不太醒！」', log: '{name}血壓掉到 70 幾' },
  fail: {
    title: '{name}陷入敗血性休克',
    text: '感染一路惡化，{name}被緊急送進加護病房，用上了升壓藥和呼吸器，能不能撐過去還不知道。敗血症每晚一小時給抗生素，危險就多一分。',
  },
  card: {
    title: '敗血症：你可以記住的四件事',
    points: [
      '發燒加上發抖、喘、心跳很快、意識變差或血壓低，可能是敗血症：感染已經影響到全身。',
      '長輩感染時，有時候不會高燒，只是變得迷糊、不想吃、很累。',
      '敗血症要搶時間：盡快到醫院抽血、打點滴、用抗生素。',
      '退燒不代表好了。退燒藥只讓體溫下降，感染還在。',
    ],
  },
  variants: [
    { id: 'uti', label: '泌尿道感染，突然燒起來' },
    // the 02:30 call's person: same bed, rings again `after` minutes after that call
    { id: 'fromtemp', label: '「37.8 度」那位，後來燒起來了',
      pt: 'homegoing',
      escalates: { call: 'temp', after: [50, 80], sleepNote: '沒回電話，{nurse}照規定一小時後再量一次。' },
      who: '{name} · {age} 歲 · 肺炎，明天要出院',
      call: '醫師，{bed} 剛剛 37.8 度那位{name}，現在燒到 39 度了，一直發抖，血壓掉到 90 左右！',
      intro: '醫師，這是{name}，{age} 歲，肺炎快好了，本來明天要出院。剛剛量是 37.8 度，現在燒到 39 度，一直發抖，血壓比{he}平常低很多。',
      card: {
        title: '敗血症：你可以記住的四件事',
        points: [
          '發燒加上發抖、喘、心跳很快、意識變差或血壓低，可能是敗血症：感染已經影響到全身。',
          '「有一點燒」本身不一定危險，但要說好多久再量、什麼情況要再找醫師。燒起來、發抖、喘，就要再看一次。',
          '敗血症要搶時間：盡快到醫院抽血、打點滴、用抗生素。',
          '退燒不代表好了。退燒藥只讓體溫下降，感染還在。',
        ],
      },
    },
  ],
};

// A fall on the way to the toilet, onto the forehead, in someone on blood thinners. The point:
// awake now is not safe; check, scan, and turn the thinning back if it bleeds. The second story
// is the same fall two hours on, when the bleed has grown and the patient is drowsy and sick.
export const HEAD = {
  id: 'phead', name: '{name}', who: '{name} · {age} 歲 · 心房顫動，吃抗凝血劑',
  short: '跌倒撞到頭', late: 'drowsy', extra: 'head', extraOk: ['腫一個包'],
  persona: { sex: ['m', 'f'], age: [70, 90] },
  results: { stable: '{name}的腦出血沒有變大，轉進加護病房觀察' },
  labs: {
    rows: [['凝血 INR', '3.1', '', '0.8–1.2', 'H'], ['血紅素 Hb', 11.2, 'g/dL', '12–16', 'L'],
      ['血小板 Platelet', 182, '×10³/µL', '150–400'], ['鈉 Na', 136, 'mmol/L', '135–145']],
    note: '凝血時間拉得很長，表示血比較不容易凝固，這是抗凝血劑的作用。這時候撞到頭，腦裡就算只出一點點血，也容易越流越多。所以吃抗凝血劑的人撞到頭，要照斷層、密切觀察。',
  },
  call: '醫師，{bed} 的{name}剛剛自己下床上廁所，跌倒撞到頭，額頭腫一個包，人還清醒。',
  again: '醫師！{bed} 的{name}剛剛吐了，現在一直想睡，叫{he}也比較不醒！',
  phone: '沒流血、人清醒就好，冰敷一下，明天再看',
  callWhy: '吃抗凝血劑的人撞到頭，就算一開始清醒，腦裡也可能慢慢出血。要有人到床邊檢查，通常還要照斷層。',
  intro: '醫師，這是{name}，{age} 歲，有心房顫動，平常吃抗凝血劑。剛剛自己下床上廁所，滑倒撞到額頭。',
  introLate: '醫師你來了！{title}剛剛吐了，現在一直想睡，叫{he}也比較不醒！',
  states: {
    start: { hr: 88, bp: [148, 84], spo2: 97, head: null, mind: '清醒，說頭有點痛' },
    checked: { hr: 88, bp: [150, 86], spo2: 97, head: '腫一個包', mind: '清醒，會回答，說頭有點痛' },
    drowsy: { hr: 64, bp: [176, 96], spo2: 95, head: undefined, mind: '吐了一次，一直想睡，叫了才睜眼' },
    bleed: { hr: 86, bp: [152, 88], spo2: 97, head: '斷層：少量腦出血', mind: '清醒，頭痛' },
    treated: { hr: 82, bp: [138, 80], spo2: 97, head: undefined, mind: '清醒，頭痛好一點' },
    coma: { hr: 56, bp: [196, 104], spo2: 92, head: undefined, mind: '叫不醒，一邊瞳孔變大' },
  },
  steps: {
    first: {
      ask: '{title}跌倒撞到頭，額頭腫一個包，現在清醒。你先做什麼？',
      askWarn: '{title}吐了、一直想睡。你先做什麼？',
      options: [
        { id: 'exam', text: '檢查意識、瞳孔、手腳力氣，問清楚吃什麼藥', grade: 'best', min: 5, state: 'checked', next: 'scan',
          say: '{title}答得出今天幾號，兩邊瞳孔一樣大，手腳都有力。{nurse}翻了藥單：「醫師，{he}每天吃抗凝血劑。」' },
        { id: 'ice', text: '沒流血、人清醒，冰敷就好', grade: 'bad', min: 30, state: 'drowsy',
          say: '冰敷了半小時，{nurse}跑來：「醫師，{title}吐了，一直說好想睡……」',
          why: '吃抗凝血劑的人撞到頭，腦裡可能慢慢出血，一開始清醒也不能放心。' },
        { id: 'painkiller', text: '頭痛給一顆止痛藥，讓{he}休息', grade: 'ok', min: 10,
          say: '{title}吃了止痛藥，說頭比較不痛了，翻身想睡。',
          why: '止痛藥會把頭痛這個警訊蓋掉。撞到頭又吃抗凝血劑，要先檢查、照斷層。' },
      ],
    },
    scan: {
      ask: '{title}有吃抗凝血劑。接下來？',
      options: [
        { id: 'ct', text: '抽血看凝血功能，同時安排腦部電腦斷層', grade: 'best', min: 30, state: 'bleed', next: 'bleed', draw: true,
          say: '斷層照出來，放射科醫師打來：「有一小塊腦出血。」' },
        { id: 'observe', text: '先觀察，每小時看一次意識就好', grade: 'ok', min: 60, state: 'drowsy',
          say: '一個小時後，{nurse}說：「醫師，{title}好像比剛剛想睡……」',
          why: '吃抗凝血劑的人撞到頭，除了觀察，通常還要照斷層。等到意識變差才照，出血可能已經很大了。' },
        { id: 'stopdrug', text: '把抗凝血劑停掉就好，不用照', grade: 'ok', min: 3,
          say: '{nurse}：「藥停了……那今晚吃下去的呢？」',
          why: '停藥是要考慮的，但已經在身體裡的藥還會作用。有沒有出血，要照了才知道。' },
      ],
    },
    bleed: {
      ask: '斷層看到一小塊腦出血。接下來？',
      options: [
        { id: 'reverse', text: '通知神經外科，給藥讓凝血功能回來，轉加護病房', grade: 'best', min: 20, state: 'treated', next: 'done', outcome: 'stable',
          say: '神經外科醫師來看過：「出血不大，先不用開刀。」{nurse}照醫囑給了讓凝血功能回來的藥，{title}轉進加護病房，每小時看一次意識。' },
        { id: 'keepdrug', text: '抗凝血劑照常吃，心房顫動比較重要', grade: 'bad', min: 5, state: 'drowsy',
          say: '兩個小時後，{nurse}打來：「醫師，{title}叫不太醒了！」',
          why: '腦出血的時候還在吃抗凝血劑，出血會越來越大。要先停藥、讓凝血功能回來，之後再和心臟科討論什麼時候恢復。' },
        { id: 'ward', text: '回一般病房，明天早上再照一次', grade: 'ok', min: 3,
          say: '{nurse}：「醫師，那我要多久看一次{he}的意識？我們這排就我一個人……」',
          why: '腦出血剛開始的幾個小時最容易變大，要在加護病房密切觀察，也要讓凝血功能回來。' },
      ],
    },
  },
  warn: { state: 'drowsy', line: '{nurse}：「醫師！{title}吐了，一直想睡！」', log: '{name}開始想吐、嗜睡' },
  fail: {
    title: '{name}的腦出血越來越大',
    text: '{name}被緊急送去開刀清掉血塊，但能不能醒過來還不知道。吃抗凝血劑的人撞到頭，出血可能慢慢變大，越早發現越好。',
  },
  card: {
    title: '跌倒撞到頭：你可以記住的四件事',
    points: [
      '吃抗凝血劑的人撞到頭，就算當下清醒，也要去急診檢查。',
      '撞到頭後如果越來越想睡、一直吐、頭越來越痛、講話怪怪的或一邊手腳沒力，馬上打 119。',
      '頭痛不要自己吃止痛藥了事，那會把警訊蓋掉。',
      '長輩晚上起床上廁所容易跌倒：床邊留小夜燈、穿防滑鞋，起床先坐一下再站。',
    ],
  },
  variants: [
    { id: 'fresh', label: '剛跌倒，人還清醒' },
    { id: 'later', label: '跌倒時還好好的，兩小時後才變差',
      short: '兩小時前跌倒，現在吐、一直想睡',
      results: { stable: '{name}開刀清掉了血塊，在加護病房醒過來' },
      call: '醫師，{bed} 的{name}兩個小時前跌倒撞到頭，那時候還好好的，現在吐了一次，一直想睡。',
      phone: '可能是累了，讓{he}睡，早上再看',
      intro: '醫師，這是{name}，{age} 歲，有心房顫動，平常吃抗凝血劑。兩個小時前跌倒撞到頭，那時候人好好的，剛剛吐了一次，一直想睡。',
      states: {
        start: { hr: 66, bp: [172, 94], mind: '吐了一次，一直想睡，叫了會睜眼' },
        checked: { hr: 64, bp: [176, 96], mind: '叫了才睜眼，答非所問，左邊瞳孔比較大' },
        bleed: { head: '斷層：腦出血，壓迫腦部', mind: '叫了才睜眼，頭很痛' },
        treated: { mind: '開完刀，慢慢醒過來' },
      },
      steps: {
        first: {
          ask: '{title}兩小時前撞到頭，現在吐、一直想睡。你先做什麼？',
          options: [
            { id: 'exam', say: '{title}叫了才睜眼，答非所問，左邊瞳孔好像比較大。{nurse}：「醫師，{he}有吃抗凝血劑。」' },
            { id: 'ice', text: '可能只是累了，讓{he}睡', say: '半小時後，{nurse}跑來：「醫師，{title}叫不太醒了！」',
              why: '撞到頭之後才開始吐、越來越想睡，是腦出血變大的警訊。剛撞到時好好的，不代表沒事。' },
          ],
        },
        scan: {
          ask: '{title}意識變差，又有吃抗凝血劑。接下來？',
          options: [
            { id: 'ct', text: '馬上照腦部電腦斷層，同時抽血看凝血功能', say: '斷層照出來，放射科醫師打來：「腦出血，而且已經壓到腦了。」' },
            { id: 'observe', grade: 'bad', why: '意識已經在變差了，不能再觀察，要馬上照斷層。' },
          ],
        },
        bleed: {
          ask: '斷層看到腦出血，已經壓迫到腦。接下來？',
          options: [
            { id: 'reverse', text: '馬上通知神經外科準備開刀，給藥讓凝血功能回來',
              say: '神經外科醫師看了片子：「馬上開刀。」{title}被推進開刀房，血塊清掉了。天亮前，{he}在加護病房醒了過來。' },
            { id: 'ward', text: '先給藥讓凝血功能回來，觀察看看會不會變小',
              say: '藥打上去半小時，{nurse}跑來：「醫師，{title}的瞳孔好像越來越大……」',
              why: '出血已經壓迫到腦，光等藥效不夠，要馬上找神經外科，可能要開刀把血塊清掉。' },
          ],
        },
      },
    },
  ],
};

// the beds a night draws from (普通班 four to six a night, 大爛班 six to eight, never more than are
// listed here); `night: true` marks a bed whose call says 半夜, which game.js only rings after 23:30
export const PUBLIC_CASES = [HYPO, STROKE, CHEST, SEPSIS, HEAD];

// CPR: chest compressions to a beat. 30 compressions at 100–120 a minute, judged on exactly the
// range the screen gives; the rate is the median of the presses after the first two, so a
// hesitant start or one stray press is forgiven.
export const CPR = { presses: 30, slowest: 100, fastest: 120, maxGap: 2.5 };
