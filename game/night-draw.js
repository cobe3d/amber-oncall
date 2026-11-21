// Drawing a night: which bed each patient and each small call lies in, and who their nurse is.
//
// Every draw comes from one seed, a short code like 'K7Q2MX'. The same code always gives the
// same ward, the same beds and the same patients at the same times, so a player can send a night
// to a friend (index.html?seed=K7Q2MX) or play it again; with no code in the address a new one is
// made for each night. Pure functions, no DOM: game.js plays the result and tests/check-data.mjs
// draws thousands of nights with the same code to check that no two people ever share a bed.

// The nurses and the rooms they look after, 01 at the east end of the corridor. A bed's nurse
// follows from its room, so a patient who moves rooms between nights also changes nurse.
export const NURSES = [
  { name: '怡君', face: 'nurse_neutral', from: 1, to: 4 },
  { name: '小雯', face: 'nurse_caring', from: 5, to: 8 },
  { name: '佳穎', face: 'nurse_thankful', from: 9, to: 12 },
];
// '07B' -> '小雯'
export const nurseFor = bed => {
  const room = parseInt(bed, 10);
  return (NURSES.find(n => room >= n.from && room <= n.to) || NURSES[0]).name;
};

// Codes skip the letters and digits that are easy to misread aloud or on a phone (0/O, 1/I/L).
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const SEED_LENGTH = 6;
export const makeSeed = (rand = Math.random) => Array.from({ length: SEED_LENGTH }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join('');
// what a player typed or pasted: upper case, only the characters a code can hold; '' if unusable
export const cleanSeed = raw => {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  return s.length >= 4 ? s : '';
};

// FNV-1a: a short string to a 32-bit number
const hash = str => {
  let h = 0x811c9dc5;
  for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};
// mulberry32: small, fast, and good enough to shuffle a ward
const mulberry32 = a => () => {
  a = (a + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// One stream of random numbers per purpose (the ward, the beds, the night's calls, the handover
// sheet), so drawing one more handover bed never moves a patient to another bed.
export const seeded = (seed, label) => mulberry32(hash(`${seed}/${label}`));

export const shuffle = (list, rand = Math.random) => list.map(v => [rand(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

// Gives every patient (`cases`) and every small-call person (`calls`, grouped by `pt`: two calls
// with the same pt are the same person and share a bed) a bed of their own from `beds`. A
// patient with a `bed` in the data keeps it, which is handy while writing or testing one bed.
// Patients are placed first; if the beds run out, the small calls share beds with each other
// (never with a patient), the way a busy night would. A patient with a `pt` (a story where a
// small call turns serious, see `escalates`) is that small call's person and lies in their bed.
export function drawBeds({ beds, cases, calls, rand }) {
  const free = shuffle(beds, rand);
  const take = bed => { const i = free.indexOf(bed); if (i >= 0) free.splice(i, 1); return bed; };
  const caseBed = {}, ptBed = {};
  for (const c of cases) if (c.bed) caseBed[c.id] = take(c.bed);
  for (const c of cases) if (!c.bed && !c.pt) caseBed[c.id] = free.length ? take(free[0]) : null;
  const patientBeds = new Set(Object.values(caseBed));
  const pts = [...new Set(calls.map(c => c.pt))];
  const spare = beds.filter(b => !patientBeds.has(b));
  for (const pt of pts) ptBed[pt] = free.length ? take(free[0]) : spare[Math.floor(rand() * spare.length)];
  for (const c of cases) if (!c.bed && c.pt) caseBed[c.id] = ptBed[c.pt] ?? null;
  return { caseBed, ptBed };
}

// ---------- who the patient is tonight ----------
// A case's `persona` says who it can be: `sex` ('m', 'f' or both) and an `age` range. Each night
// draws a surname (no two patients share one), a sex and an age, and the words for them:
//   {name} 王阿伯   {title} 阿伯   {he} 他   {age} 72
// 60 and over are 阿伯 / 阿嬤; younger patients are 先生 / 小姐.
export const SURNAMES = ['王', '林', '陳', '黃', '張', '李', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭', '洪', '曾', '邱', '廖', '賴', '周'];
export const PERSONA_KEYS = ['name', 'title', 'he', 'age'];
const TITLE = { m: ['阿伯', '先生'], f: ['阿嬤', '小姐'] }, HE = { m: '他', f: '她' };
// A case's `vars` are its own numbers and words, drawn each night: [low, high] is a whole number
// in that range, a list of words is one of them. {bg} in the text becomes tonight's value, and a
// field that is only '{bg}' (a monitor reading, a lab result) becomes the number itself.
const drawVar = (v, rand) => (v.length === 2 && v.every(n => typeof n === 'number')
  ? v[0] + Math.floor(rand() * (v[1] - v[0] + 1))
  : v[Math.floor(rand() * v.length)]);
export function drawPersona(c, rand, taken = new Set()) {
  const p = c.persona || {};
  const sexes = p.sex?.length ? p.sex : ['m', 'f'], sex = sexes[Math.floor(rand() * sexes.length)];
  const [lo, hi] = p.age || [65, 85], age = lo + Math.floor(rand() * (hi - lo + 1));
  const free = SURNAMES.filter(s => !taken.has(s)), surname = (free.length ? free : SURNAMES)[Math.floor(rand() * (free.length || SURNAMES.length))];
  taken.add(surname);
  const title = TITLE[sex][age >= 60 ? 0 : 1];
  const vars = Object.fromEntries(Object.entries(c.vars || {}).map(([k, v]) => [k, drawVar(v, rand)]));
  return { ...vars, sex, age, title, name: surname + title, he: HE[sex] };
}

// ---------- which story tonight ----------
// A case can be told more than one way: `variants` lists the stories, and each night draws one
// (`weight`, default 1). A variant holds only what differs from the case around it, merged in:
// objects merge key by key, a list of options merges by `id` (a new id adds an option,
// `{ id, drop: true }` takes one away), and any other list or value replaces the case's own.
//   variants: [
//     { id: 'window', label: '還在黃金時間內' },                      // the case as written
//     { id: 'late', label: '中午就開始了', steps: { act: { ask: '…', options: [{ id: 'tpa', … }] } } },
//   ]
const hasIds = list => Array.isArray(list) && list.every(o => o && typeof o === 'object' && typeof o.id === 'string');
export function mergeStory(base, over) {
  if (Array.isArray(over)) {
    if (!hasIds(base) || !hasIds(over)) return over;
    const out = base.map(b => { const o = over.find(x => x.id === b.id); return !o ? b : o.drop ? null : mergeStory(b, o); }).filter(Boolean);
    for (const o of over) if (!o.drop && !base.some(b => b.id === o.id)) out.push(o);
    return out;
  }
  if (over && typeof over === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(over)) out[k] = mergeStory(base[k], v);
    return out;
  }
  return over;
}
// tonight's variant of a case: a forced id (index.html?story=late) wins, otherwise by weight
export function pickStory(c, rand, force) {
  const vs = c.variants || [];
  if (!vs.length) return null;
  const forced = vs.find(v => v.id === force);
  if (forced) return forced;
  const total = vs.reduce((n, v) => n + (v.weight ?? 1), 0);
  let r = rand() * total;
  return vs.find(v => (r -= v.weight ?? 1) < 0) || vs[vs.length - 1];
}
// the case as tonight's story tells it; `story` and `storyLabel` say which one it was
export function tellStory(c, v) {
  const { variants, ...base } = c;
  if (!v) return base;
  const { id, label, weight, ...over } = v;
  return { ...mergeStory(base, over), story: id, storyLabel: label || '' };
}

// ---------- the monitor ----------
// Every reading of a case moves by the same few points each night, so the numbers differ but the
// story they tell (faster, lower, back to normal) stays the same. A case's `jitter` overrides
// these ranges, e.g. { sbp: [0, 10] } for a pressure that must stay above a line the text names.
export const JITTER = { hr: [-6, 6], sbp: [-8, 8], dbp: [-5, 5], spo2: [-1, 1] };
export function jitterStates(states, rand, jitter = {}) {
  const j = { ...JITTER, ...jitter }, d = Object.fromEntries(Object.entries(j).map(([k, [lo, hi]]) => [k, lo + Math.floor(rand() * (hi - lo + 1))]));
  return Object.fromEntries(Object.entries(states).map(([k, st]) => [k, {
    ...st,
    hr: st.hr ? st.hr + d.hr : st.hr,   // 0 stays 0: no pulse is no pulse
    bp: Array.isArray(st.bp) ? [st.bp[0] + d.sbp, st.bp[1] + d.dbp] : st.bp,
    spo2: typeof st.spo2 === 'number' ? Math.min(100, st.spo2 + d.spo2) : st.spo2,
  }]));
}

// Tonight's copy of a case: who they are, its numbers and its monitor, filled in. {bed}, and
// {sugar} in a question, are filled later by game.js.
export function castCase(c, rand, taken, extra = {}) {
  const vars = { ...drawPersona(c, rand, taken), ...extra };
  const filled = fill(c, vars);
  return { ...filled, states: jitterStates(filled.states || {}, rand, c.jitter), persona: vars };
}

// Fills {nurse}, {name} and the like in every string of a case or a call. Keys not in `vars`
// (such as {bed}, which game.js fills when the phone rings) are left as they are.
export function fill(value, vars) {
  if (typeof value === 'string') {
    const whole = value.match(/^\{(\w+)\}$/);
    if (whole && typeof vars[whole[1]] === 'number') return vars[whole[1]];
    return value.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  }
  if (Array.isArray(value)) return value.map(v => fill(v, vars));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, vars)]));
  return value;
}
