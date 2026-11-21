// npm test: checks game/public-cases.js against what game/game.js can play, without a browser.
//
// A bed with a typo in it (a `next` that names no question, a state the monitor does not know, a
// room with no bed lamp) loads fine and breaks only when a player reaches that choice, so every
// one of those is caught here instead. At the end it draws a thousand nights of each shift, the
// way startPublicNight does, and says how many patients a night gets from the beds listed. The
// beds themselves are drawn with game/night-draw.js, the same code the game runs.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const read = rel => readFileSync(fileURLToPath(new URL(rel, root)), 'utf8');
const data = await import(pathToFileURL(fileURLToPath(new URL('game/public-cases.js', root))).href);
const { NURSES, PERSONA_KEYS, JITTER, drawBeds, seeded, shuffle, makeSeed, pickStory, tellStory, castCase, fill } = await import(pathToFileURL(fileURLToPath(new URL('game/night-draw.js', root))).href);
const game = read('game/game.js'), page = read('index.html');
const { PUBLIC_CALLS, DEEP_CALLS, DAWN_CALLS, AFTER_PHONE, PUBLIC_CASES, CPR } = data;

const problems = [];
const fail = (where, what) => problems.push(`${where}：${what}`);
const isText = v => typeof v === 'string' && v.trim().length > 0;
// every string in a case or a call, to look for names and placeholders
const strings = v => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
const NURSE_NAMES = NURSES.map(n => n.name);
// {sugar} in a question is the monitor's last blood sugar (renderPublicCase fills it); a patient
// also has {name} {title} {he} {age} and its own vars
const PLACEHOLDERS = ['bed', 'nurse', 'sugar'];
function checkWords(at, v, known = PLACEHOLDERS) {
  for (const str of strings(v)) {
    const name = NURSE_NAMES.find(n => str.includes(n));
    if (name) fail(at, `「${str.slice(0, 24)}…」寫了護理師的名字 ${name}，請改成 {nurse}：今晚是哪位護理師，要看抽到哪一床`);
    for (const m of str.matchAll(/\{(\w+)\}/g)) if (!known.includes(m[1])) fail(at, `{${m[1]}} 遊戲不認得，可以用：${known.map(k => `{${k}}`).join('、')}`);
  }
}

// ---------- what game.js knows: the beds that can ring, the scenes for a small call walked to,
// the monitor's fourth reading ----------
const caseRooms = game.match(/const CASE_ROOMS = \[([^\]]*)\]/);
if (!caseRooms) throw new Error('game.js 裡找不到 CASE_ROOMS');
const BEDS = new Set([...caseRooms[1].matchAll(/'(\d{2})'/g)].flatMap(m => ['A', 'B', 'C'].map(L => m[1] + L)));
const casesBlock = game.match(/const CASES = \{([\s\S]*?)\n {2}\};/);
if (!casesBlock) throw new Error('game.js 裡找不到 CASES');
const VISITS = new Set([...casesBlock[1].matchAll(/'(v-[\w-]+)': \{/g)].map(m => m[1]));
const extraBlock = game.match(/const EXTRA = \{([\s\S]*?)\};/);
if (!extraBlock) throw new Error('game.js 裡找不到 EXTRA');
const EXTRA = new Set([...extraBlock[1].matchAll(/(\w+): \[/g)].map(m => m[1]));

// ---------- the small calls ----------
const smallIds = new Set();
for (const [list, name] of [[PUBLIC_CALLS, 'PUBLIC_CALLS'], [DEEP_CALLS, 'DEEP_CALLS'], [DAWN_CALLS, 'DAWN_CALLS']]) {
  if (!Array.isArray(list)) { fail(name, '要是一個陣列'); continue; }
  for (const c of list) {
    const at = `${name} ${c.id || '(沒有 id)'}`;
    if (!isText(c.id)) fail(at, '沒有 id');
    else if (smallIds.has(c.id)) fail(at, 'id 重複了'); else smallIds.add(c.id);
    if (!['none', 'phone'].includes(c.need)) fail(at, `need 要是 'none'（不用理也沒事）或 'phone'（電話交代就好），現在是 ${JSON.stringify(c.need)}`);
    if (!isText(c.pt)) fail(at, '缺少 pt（這通電話是哪一位病人；pt 一樣的電話是同一個人，每晚抽同一床）');
    if (c.bed !== undefined) fail(at, '小事電話不寫 bed：床位每晚用 pt 抽');
    checkWords(at, c);
    if (!VISITS.has(c.visit)) fail(at, `visit '${c.visit}' 在 game.js 的 CASES 裡找不到（醫師跑去看時要演的那一幕）`);
    for (const k of ['short', 'text', 'phone', 'phoneReply', 'sleepNote']) if (!isText(c[k])) fail(at, `缺少 ${k}`);
    if (isText(c.text) && !c.text.includes('{bed}')) fail(at, 'text 裡要有 {bed}，遊戲會換成床號');
  }
}
if (PUBLIC_CALLS.filter(c => !c.night).length < 2) fail('PUBLIC_CALLS', '至少要有兩通沒有標 night 的小事（傍晚會響兩通）');
if (PUBLIC_CALLS.length < 4) fail('PUBLIC_CALLS', '至少要有四通（傍晚兩通、熄燈後兩通）');
if (!DEEP_CALLS.length) fail('DEEP_CALLS', '至少要有一通');
if (DAWN_CALLS.length < 2) fail('DAWN_CALLS', '至少要有兩通');
if (!Array.isArray(AFTER_PHONE) || !AFTER_PHONE.length || !AFTER_PHONE.every(isText)) fail('AFTER_PHONE', '至少要有一句');

// the small calls a story can grow out of (see escalates)
const ALL_SMALL = [...PUBLIC_CALLS, ...DEEP_CALLS, ...DAWN_CALLS];
const CLOCK_SMALL = [DEEP_CALLS[0], DAWN_CALLS[0], DAWN_CALLS[1]].filter(Boolean).map(c => c.id);

// ---------- who a patient can be ----------
// persona, vars and jitter are drawn each night (night-draw.js castCase). A thousand casts of each
// bed must fill every {name}, {bg}… and keep the monitor's numbers possible.
function checkPersona(at, c) {
  const p = c.persona;
  const range = v => Array.isArray(v) && v.length === 2 && v.every(Number.isInteger) && v[0] <= v[1];
  if (p !== undefined) {
    if (p.sex !== undefined && !(Array.isArray(p.sex) && p.sex.length && p.sex.every(x => x === 'm' || x === 'f'))) fail(at, "persona.sex 要是 ['m']、['f'] 或 ['m', 'f']");
    if (p.age !== undefined && !range(p.age)) fail(at, 'persona.age 要是 [最小, 最大] 兩個整數');
  }
  for (const [k, v] of Object.entries(c.vars || {})) {
    if (PERSONA_KEYS.includes(k) || PLACEHOLDERS.includes(k)) fail(`${at} vars.${k}`, '這個名字遊戲已經在用了，換一個');
    if (!range(v) && !(Array.isArray(v) && v.length > 0 && v.every(isText))) fail(`${at} vars.${k}`, "要是 [最小, 最大] 兩個整數，或一串字（例如 ['四十分鐘', '一個小時']）");
  }
  for (const [k, v] of Object.entries(c.jitter || {})) {
    if (!(k in JITTER)) fail(`${at} jitter.${k}`, `監視器不認得，可以用：${Object.keys(JITTER).join('、')}`);
    else if (!range(v)) fail(`${at} jitter.${k}`, '要是 [最小, 最大] 兩個整數');
  }
  if (c.calm !== undefined && !c.states?.[c.calm]) fail(at, `calm '${c.calm}' 不在 states 裡（穩住之後牆上監視器顯示的狀態）`);
}
function checkCasts(c, at = c.id) {
  for (let i = 0; i < 1000; i++) {
    const seed = makeSeed(), t = castCase(c, seeded(seed, `people/${c.id}`), new Set(), { nurse: '護理師' });
    const left = strings({ ...t, persona: null }).flatMap(str => [...str.matchAll(/\{(\w+)\}/g)].map(m => m[1])).filter(k => k !== 'bed' && k !== 'sugar');
    if (left.length) { fail(at, `編號 ${seed}：{${left[0]}} 沒有被換掉`); return; }
    for (const [k, st] of Object.entries(t.states || {})) {
      const bad = st.hr < 0 || (typeof st.spo2 === 'number' && (st.spo2 < 0 || st.spo2 > 100)) || (Array.isArray(st.bp) && !(st.bp[1] > 0 && st.bp[1] < st.bp[0]))
        || (st.sugar != null && typeof st.sugar !== 'number');
      if (bad) { fail(`${at} states.${k}`, `編號 ${seed}：監視器的數字不合理 ${JSON.stringify(st)}`); return; }
    }
  }
}

// ---------- the beds ----------
const GRADES = new Set(['best', 'ok', 'bad']);
function checkBed(c, at = c?.id || '(沒有 id 的床)') {
  const need = ['id', 'name', 'who', 'short', 'call', 'again', 'phone', 'callWhy', 'intro', 'introLate', 'late', 'extra',
    ...(c.steps?.arrest ? ['arrestLine'] : [])];
  for (const k of need) if (!isText(c[k])) fail(at, `缺少 ${k}`);
  if (c.bed !== undefined && !BEDS.has(c.bed)) fail(at, `固定的床號 ${c.bed} 不在 game.js 的 CASE_ROOMS 裡（那一床沒有床頭燈和監視器）`);
  if (c.nurse !== undefined) fail(at, '不用寫 nurse：護理師跟著每晚抽到的床走，對話裡寫 {nurse}');
  checkWords(at, c, [...PLACEHOLDERS, ...PERSONA_KEYS, ...Object.keys(c.vars || {})]);
  checkPersona(at, c);
  if (isText(c.call) && !c.call.includes('{bed}')) fail(at, 'call 裡要有 {bed}');
  if (isText(c.again) && !c.again.includes('{bed}')) fail(at, 'again 裡要有 {bed}');
  if (!EXTRA.has(c.extra)) fail(at, `extra '${c.extra}' 監視器不認得，可以用：${[...EXTRA].join('、')}`);
  const states = c.states || {}, steps = c.steps || {}, results = c.results || {};
  if (!states.start) fail(at, 'states 裡要有 start（醫師剛到床邊時的樣子）');
  for (const [k, st] of Object.entries(states)) {
    if (typeof st.hr !== 'number') fail(`${at} states.${k}`, 'hr（心跳）要是數字，0 代表摸不到');
    if (!isText(st.mind)) fail(`${at} states.${k}`, '缺少 mind（意識，用白話寫）');
    if (st.bp !== null && !(Array.isArray(st.bp) && st.bp.length === 2)) fail(`${at} states.${k}`, 'bp 要是 [收縮壓, 舒張壓]，量不到寫 null');
  }
  if (!states[c.late]) fail(at, `late '${c.late}' 不在 states 裡`);
  if (!c.warn || !states[c.warn.state] || !isText(c.warn.line) || !isText(c.warn.log)) fail(at, 'warn 要有 state（在 states 裡）、line、log');
  if (!steps.first) fail(at, 'steps 裡要有 first（第一個問題）');
  if (!Object.keys(results).length) fail(at, 'results 至少要有一個結果');
  if (!c.labs || !Array.isArray(c.labs.rows) || !c.labs.rows.length || !isText(c.labs.note)) fail(at, 'labs 要有 rows 和 note');
  else c.labs.rows.forEach((r, i) => {
    if (!Array.isArray(r) || r.length < 4 || !isText(r[0]) || !isText(r[3])) fail(`${at} labs.rows[${i}]`, '要寫成 [項目, 結果, 單位, 參考值, 高低]');
    if (r[4] !== undefined && !['H', 'L'].includes(r[4])) fail(`${at} labs.rows[${i}]`, "第五格只能是 'H'、'L' 或不寫");
  });
  if (!c.card || !isText(c.card.title) || !Array.isArray(c.card.points) || !c.card.points.length) fail(at, 'card 要有 title 和 points');
  // a choice with cpr: true starts the compressions; when they are done, the bed goes on at cprNext
  const hasCpr = Object.values(steps).some(s => s.options?.some(o => o.cpr));
  if (hasCpr) {
    if (!steps[c.cprNext]) fail(at, `cprNext '${c.cprNext}' 不在 steps 裡（壓胸成功之後的問題）`);
    if (c.cprState && !states[c.cprState]) fail(at, `cprState '${c.cprState}' 不在 states 裡`);
    if (!isText(c.cprLine)) fail(at, '有壓胸的床要有 cprLine（壓胸成功時護理師說的話）');
  }
  if (steps.arrest && !steps.arrest.options?.some(o => o.cpr)) fail(at, 'arrest 這一題要有一個 cpr: true 的選項');
  if (!steps.arrest && (!c.fail || !isText(c.fail.title) || !isText(c.fail.text))) {
    fail(at, '沒有 arrest 這一題的床，要有 fail { title, text }（錯太多時怎麼結束）');
  }

  const usedOutcomes = new Set();
  for (const [sk, step] of Object.entries(steps)) {
    const where = `${at} steps.${sk}`;
    if (!isText(step.ask)) fail(where, '缺少 ask（問題）');
    if (!Array.isArray(step.options) || !step.options.length) { fail(where, '沒有選項'); continue; }
    if (step.options.length > 4) fail(where, '選項最多四個（鍵盤 1–4）');
    if (!step.options.some(o => o.grade === 'best')) fail(where, '至少要有一個 grade: best');
    for (const k of Object.keys(step.askBy || {})) if (!states[k]) fail(where, `askBy 的 '${k}' 不在 states 裡`);
    const ids = new Set();
    for (const o of step.options) {
      const w = `${where} ${o.id || '(沒有 id 的選項)'}`;
      if (!isText(o.id)) fail(w, '選項沒有 id'); else if (ids.has(o.id)) fail(w, '同一題裡 id 重複'); else ids.add(o.id);
      if (!isText(o.text)) fail(w, '缺少 text');
      if (!GRADES.has(o.grade)) fail(w, "grade 要是 'best'、'ok' 或 'bad'");
      if (typeof o.min !== 'number' || o.min < 0) fail(w, 'min（花幾分鐘）要是 0 以上的數字');
      if (o.state && !states[o.state]) fail(w, `state '${o.state}' 不在 states 裡`);
      if (o.next && o.next !== 'done' && o.next !== 'arrest' && !steps[o.next]) fail(w, `next '${o.next}' 不在 steps 裡`);
      if (o.next === 'arrest' && !steps.arrest && !c.fail) fail(w, 'next 是 arrest，可是這床沒有 arrest 題也沒有 fail');
      if (o.next === 'done') { if (!results[o.outcome]) fail(w, `outcome '${o.outcome}' 不在 results 裡`); else usedOutcomes.add(o.outcome); }
      if (o.grade !== 'best' && !o.death && o.next !== 'arrest' && !isText(o.why)) fail(w, '不是 best 的選項要寫 why（為什麼不好），會劃掉顯示給玩家');
      if (o.death !== undefined && !isText(o.death)) fail(w, 'death 要是一段話');
      if (o.draw && !c.labs) fail(w, 'draw: true 的床要有 labs');
    }
  }
  for (const k of Object.keys(results)) if (!usedOutcomes.has(k)) fail(at, `results.${k} 沒有任何選項會走到（outcome: '${k}'）`);
  // following only the best choices, the bed can be finished
  const seen = new Set(), queue = ['first'];
  let finishes = false;
  while (queue.length) {
    const sk = queue.shift(); if (seen.has(sk) || !steps[sk]) continue; seen.add(sk);
    for (const o of steps[sk].options.filter(o => o.grade === 'best')) {
      if (o.next === 'done') finishes = true;
      else if (o.cpr) queue.push(c.cprNext);
      else if (o.next) queue.push(o.next);
      else fail(`${at} steps.${sk} ${o.id}`, 'best 的選項要有 next（下一題，或 done 結束）');
    }
  }
  if (!finishes) fail(at, '從 first 一路選 best，走不到 done');
  for (const sk of Object.keys(steps)) {
    const reached = seen.has(sk) || Object.values(steps).some(s => s.options?.some(o => o.next === sk)) || (sk === 'arrest') || sk === c.cprNext;
    if (!reached) fail(`${at} steps.${sk}`, '沒有任何選項會走到這一題');
  }
}

const bedIds = new Set();
if (!Array.isArray(PUBLIC_CASES) || !PUBLIC_CASES.length) fail('PUBLIC_CASES', '至少要有一床');
for (const c of PUBLIC_CASES) {
  if (bedIds.has(c?.id)) fail(c.id, 'id 和別床重複了'); else bedIds.add(c?.id);
  if (smallIds.has(c?.id)) fail(c.id, 'id 和某一通小事的 id 重複了');
  // every story the case can be told is a whole bed of its own, checked the same way
  const stories = c.variants === undefined ? [null] : c.variants;
  if (c.variants !== undefined && !(Array.isArray(c.variants) && c.variants.length)) { fail(c.id, 'variants 要是一串故事，至少一個'); continue; }
  const storyIds = new Set();
  for (const v of stories) {
    const at = v ? `${c.id}（故事 ${v.id || '沒有 id'}）` : c.id;
    if (v) {
      if (!isText(v.id)) fail(at, '每個故事要有 id'); else if (storyIds.has(v.id)) fail(at, '故事的 id 重複了'); else storyIds.add(v.id);
      if (!isText(v.label)) fail(at, '每個故事要有 label（結算畫面會寫「今晚：…」）');
      if (v.weight !== undefined && !(v.weight > 0)) fail(at, 'weight 要是大於 0 的數字');
      if (v.variants) fail(at, '故事裡不能再有 variants');
      for (const [sk, step] of Object.entries(v.steps || {})) for (const o of step.options || []) {
        if (o.drop && !c.steps?.[sk]?.options?.some(b => b.id === o.id)) fail(`${at} steps.${sk}`, `drop 的選項 '${o.id}' 原本就沒有`);
      }
    }
    const told = tellStory(c, v);
    if (told.escalates !== undefined || told.pt !== undefined) {
      const e = told.escalates || {}, call = ALL_SMALL.find(x => x.id === e.call);
      if (!call) fail(at, `escalates.call '${e.call}' 找不到這通小事電話`);
      else {
        if (!CLOCK_SMALL.includes(call.id)) fail(at, `escalates.call '${e.call}' 不是每晚照時間響的電話（DEEP_CALLS 第一通、DAWN_CALLS 前兩通），可能不會響`);
        if (told.pt !== call.pt) fail(at, `pt 要和那通電話一樣是 '${call.pt}'（同一個人、同一床）`);
      }
      if (!(Array.isArray(e.after) && e.after.length === 2 && e.after.every(n => n > 0) && e.after[0] <= e.after[1])) fail(at, 'escalates.after 要是 [最少, 最多] 分鐘');
      if (e.sleepNote !== undefined && !isText(e.sleepNote)) fail(at, 'escalates.sleepNote 要是一段話');
    }
    checkBed(told, at);
    checkCasts(told, at);
  }
}
const rooms = new Map();
for (const c of PUBLIC_CASES.filter(c => c.bed)) { if (rooms.has(c.bed)) fail(c.id, `固定的床號 ${c.bed} 和 ${rooms.get(c.bed)} 重複了`); else rooms.set(c.bed, c.id); }
if (!(CPR.presses > 0 && CPR.slowest < CPR.fastest && CPR.maxGap > 0)) fail('CPR', 'presses、slowest、fastest、maxGap 的數字不合理');

// ---------- the credit line the license asks for ----------
if (!/const CREDIT = \{ text: '[^']+', url: 'https?:\/\/[^']+' \}/.test(game)) fail('game.js', 'CREDIT 要有 text 和 url（授權要求保留出處）');
if ((page.match(/class="credit"/g) || []).length < 2) fail('index.html', '開始畫面和結算畫面都要有 <p class="credit"></p>（授權要求保留出處）');

// ---------- every portrait the game asks for has a file ----------
const ext = (game.match(/const IMG = n => `assets\/game\/char\/\$\{n\}(\.\w+)`/) || [])[1];
if (!ext) fail('game.js', '找不到 IMG（立繪的路徑）');
else {
  const chatter = read('game/chatter.js'), cases = read('game/public-cases.js');
  const wanted = new Set([
    ...[game, chatter, page].flatMap(src => [...src.matchAll(/['"/]((?:nurse|chief|akai|azhu)_[a-z_]+)(?:'|"|\.\w+)/g)].map(m => m[1])),
    ...[...game.matchAll(/\bME\('([a-z_]+)'\)/g)].flatMap(m => [`pgy_m_${m[1]}`, `pgy_f_${m[1]}`]),
    ...[...page.matchAll(/char\/(pgy_[mf]_[a-z_]+)\./g)].map(m => m[1]),
    ...[...cases.matchAll(/\bface: '([a-z_]+)'/g), ...casesBlock[1].matchAll(/\bface: '([a-z_]+)'/g)].map(m => `nurse_${m[1]}`),
  ]);
  for (const name of wanted) {
    if (!existsSync(fileURLToPath(new URL(`assets/game/char/${name}${ext}`, root)))) fail('立繪', `缺少 assets/game/char/${name}${ext}`);
  }
}

// ---------- a thousand nights: how many patients the bank gives ----------
// NIGHT_SLOTS is read from game.js; the fill below mirrors startPublicNight's
const slotsSrc = game.match(/const NIGHT_SLOTS = (\[[\s\S]*?\n {2}\]);/);
if (!slotsSrc) throw new Error('game.js 裡找不到 NIGHT_SLOTS');
const NIGHT_SLOTS = Function(`return ${slotsSrc[1]};`)();
// tonight's stories, drawn as game.js draws them
const toldFor = seed => PUBLIC_CASES.map(c => tellStory(c, pickStory(c, seeded(seed, `story/${c.id}`))));
function draw(shift, seed) {
  const R = seeded(seed, `night/${shift}`), told = toldFor(seed);
  const want = (shift === 'hard' ? 6 : 4) + Math.floor(R() * 3);
  const left = shuffle(told.filter(c => !c.escalates), R), filled = [];
  for (const slot of NIGHT_SLOTS) {
    if (filled.length >= want) break;
    const fits = left.filter(c => slot.dark || !c.night);
    const c = (slot.dark && fits.find(x => x.night)) || fits[0];
    if (!c) continue;
    left.splice(left.indexOf(c), 1); filled.push({ ...slot, c });
  }
  // a small call that turns serious rings on top of the slots
  return [...filled, ...told.filter(c => c.escalates).map(c => ({ name: 'escalates', c }))];
}
// ---------- a thousand nights: where everyone lies ----------
// drawn as game.js draws them; no two patients in one bed, no small call in a patient's bed,
// except a patient who is that small call's person (a story with `pt`)
const ALL_CALLS = [...PUBLIC_CALLS, ...DEEP_CALLS, ...DAWN_CALLS];
const bedList = [...BEDS];
const nightBeds = seed => drawBeds({ beds: bedList, cases: toldFor(seed), calls: ALL_CALLS, rand: seeded(seed, 'beds') });
const bedsUsed = new Set();
for (let i = 0; i < 1000; i++) {
  const seed = makeSeed(), { caseBed, ptBed } = nightBeds(seed), told = toldFor(seed);
  if (Object.values(caseBed).some(b => !b)) { fail('抽床位', `病人比可以響的床（${bedList.length} 床）還多，加開 CASE_ROOMS`); break; }
  const patients = told.filter(c => !c.pt).map(c => caseBed[c.id]);
  if (new Set(patients).size !== patients.length) fail('抽床位', `編號 ${seed}：兩位病人抽到同一床`);
  for (const b of Object.values(ptBed)) if (patients.includes(b)) fail('抽床位', `編號 ${seed}：小事電話的人和病人抽到同一床 ${b}`);
  for (const c of told.filter(c => c.pt)) if (caseBed[c.id] !== ptBed[c.pt]) fail('抽床位', `編號 ${seed}：${c.id}（${c.story}）應該在 pt '${c.pt}' 那一床`);
  patients.forEach(b => bedsUsed.add(b));
  if (JSON.stringify(nightBeds(seed)) !== JSON.stringify({ caseBed, ptBed })) fail('抽床位', `編號 ${seed} 抽了兩次，床位不一樣（同一個編號要抽出同一晚）`);
}
if (fill('{nurse}{bed}', { nurse: 'N' }) !== 'N{bed}') fail('night-draw.js', 'fill 要換 {nurse}、留著 {bed}');

const summary = [];
for (const shift of ['normal', 'hard']) {
  const counts = new Map(); let noDinner = 0;
  for (let i = 0; i < 1000; i++) {
    const night = draw(shift, makeSeed());
    counts.set(night.length, (counts.get(night.length) || 0) + 1);
    if (!night.some(f => f.name === 'dinner')) noDinner++;
    for (const f of night) if (f.c.night && !f.dark) fail('抽床', `${f.c.id} 標了 night，卻被排到熄燈前的 ${f.name}`);
  }
  summary.push(`${shift === 'hard' ? '大爛班' : '普通班'}：每晚 ${[...counts.keys()].sort().join('、')} 床${noDinner ? `（${noDinner / 10}% 的晚上沒有晚餐那一床）` : ''}`);
}

if (problems.length) {
  console.error(`檢查到 ${problems.length} 個問題：\n` + [...new Set(problems)].map(p => `  ✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`✓ public-cases.js 沒問題：${PUBLIC_CASES.length} 床病人、小事 ${smallIds.size} 通`);
console.log(`  ${summary.join('；')}`);
console.log(`  床位：每晚重抽，一千晚裡病人睡過 ${bedsUsed.size} / ${bedList.length} 床`);
for (const c of PUBLIC_CASES.filter(c => c.variants)) console.log(`  ${c.id} 的故事：${c.variants.map(v => v.label).join(' / ')}`);
if (PUBLIC_CASES.length < 8) console.log(`  床數比班別想要的少：再加床，晚上就會更忙（大爛班最多排到 8 床）`);
