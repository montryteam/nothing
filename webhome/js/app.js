const LS_KEYS = {
  apiKey: 'LAMBO_API_KEY',
  btnColor: 'LAMBO_BTN_COLOR',
  searchSource: 'LAMBO_SEARCH_SOURCE',
  googleMode: 'LAMBO_GOOGLE_MODE',
  history: 'LAMBO_HISTORY',
  shortcuts: 'LAMBO_SHORTCUTS'
};

const DEFAULTS = {
  btnColor: '#ffffff',
  searchSource: 'both',
  googleMode: 'cse',
  shortcuts: []
};

let API_KEY = localStorage.getItem(LS_KEYS.apiKey) || '';
let BTN_COLOR = localStorage.getItem(LS_KEYS.btnColor) || DEFAULTS.btnColor;
let SEARCH_SOURCE = localStorage.getItem(LS_KEYS.searchSource) || DEFAULTS.searchSource;
let GOOGLE_MODE = localStorage.getItem(LS_KEYS.googleMode) || DEFAULTS.googleMode;
let HISTORY = JSON.parse(localStorage.getItem(LS_KEYS.history) || '[]');
let SHORTCUTS = JSON.parse(localStorage.getItem(LS_KEYS.shortcuts) || '[]');

const qEl = document.getElementById('q');
const goBtn = document.getElementById('goBtn');
const lamboTextEl = document.getElementById('lamboText');
const googleResultsContainer = document.getElementById('googleResultsContainer');
const historyEl = document.getElementById('history');
const settingsBtn = document.getElementById('settingsBtn');
const overlay = document.getElementById('overlay');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnColorInput = document.getElementById('btnColor');
const searchSourceSelect = document.getElementById('searchSource');
const googleModeSelect = document.getElementById('googleMode');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const resetBtn = document.getElementById('resetBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const clearInputBtn = document.getElementById('clearBtn');
const micBtn = document.getElementById('micBtn');
const openGoogleBtn = document.getElementById('openGoogleBtn');
const shortcutsContainer = document.getElementById('shortcutsContainer');
const shortcutInput = document.getElementById('shortcutInput');

apiKeyInput.value = API_KEY;
btnColorInput.value = BTN_COLOR;
searchSourceSelect.value = SEARCH_SOURCE;
googleModeSelect.value = GOOGLE_MODE;
applyButtonColor(BTN_COLOR);
renderHistory();
loadShortcuts();

goBtn.addEventListener('click', mainSearch);
qEl.addEventListener('keydown', e => { if(e.key==='Enter') mainSearch(); });
settingsBtn.addEventListener('click', () => overlay.style.display = 'flex');
closeSettingsBtn.addEventListener('click', () => overlay.style.display = 'none');
saveSettingsBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetDefaults);
clearHistoryBtn.addEventListener('click', clearHistory);
clearInputBtn.addEventListener('click', () => qEl.value = '');
micBtn.addEventListener('click', () => {});
openGoogleBtn.addEventListener('click', () => { if(qEl.value) window.open('https://www.google.com/search?q='+encodeURIComponent(qEl.value),'_blank'); });
shortcutInput?.addEventListener('keydown', e => { if(e.key === 'Enter') addShortcutFromInput(); });

function applyButtonColor(color) {
  document.documentElement.style.setProperty('--button-bg', color);
  const rgb = color.replace('#','');
  const r = parseInt(rgb.substring(0,2),16);
  const g = parseInt(rgb.substring(2,4),16);
  const b = parseInt(rgb.substring(4,6),16);
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  const fg = lum > 150 ? '#000' : '#fff';
  document.documentElement.style.setProperty('--button-fg', fg);
}

function saveSettings() {
  API_KEY = apiKeyInput.value.trim();
  BTN_COLOR = btnColorInput.value;
  SEARCH_SOURCE = searchSourceSelect.value;
  GOOGLE_MODE = googleModeSelect.value;
  localStorage.setItem(LS_KEYS.apiKey, API_KEY);
  localStorage.setItem(LS_KEYS.btnColor, BTN_COLOR);
  localStorage.setItem(LS_KEYS.searchSource, SEARCH_SOURCE);
  localStorage.setItem(LS_KEYS.googleMode, GOOGLE_MODE);
  applyButtonColor(BTN_COLOR);
  overlay.style.display = 'none';
  toast('Settings saved ✨');
}

function resetDefaults() {
  apiKeyInput.value = '';
  btnColorInput.value = DEFAULTS.btnColor;
  searchSourceSelect.value = DEFAULTS.searchSource;
  googleModeSelect.value = DEFAULTS.googleMode;
  localStorage.removeItem(LS_KEYS.apiKey);
  localStorage.removeItem(LS_KEYS.btnColor);
  localStorage.removeItem(LS_KEYS.searchSource);
  localStorage.removeItem(LS_KEYS.googleMode);
  API_KEY = '';
  BTN_COLOR = DEFAULTS.btnColor;
  SEARCH_SOURCE = DEFAULTS.searchSource;
  GOOGLE_MODE = DEFAULTS.googleMode;
  applyButtonColor(BTN_COLOR);
  toast('Settings reset 🔁');
}

function pushHistory(q) {
  if(!q) return;
  HISTORY.unshift({q, ts: Date.now()});
  if(HISTORY.length > 50) HISTORY.pop();
  localStorage.setItem(LS_KEYS.history, JSON.stringify(HISTORY));
  renderHistory();
}

function renderHistory() {
  if(!HISTORY || HISTORY.length === 0){
    historyEl.innerHTML = '<div class="muted">no history yet ✨</div>';
    return;
  }
  historyEl.innerHTML = HISTORY.map(h => 
    `<div class="historyItem" onclick="repaste('${escapeForAttr(h.q)}')">${h.q}</div>`
  ).join('');
}

function escapeForAttr(s){ return s.replace(/'/g,"\\'").replace(/"/g,'\\"'); }
function repaste(q){ qEl.value = q; mainSearch(); }
function clearHistory(){ HISTORY=[]; localStorage.removeItem(LS_KEYS.history); renderHistory(); toast('History cleared 🗑️'); }
function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.position = 'fixed';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.bottom = '90px';
  el.style.background = '#222';
  el.style.color = '#fff';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '12px';
  el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)';
  document.body.appendChild(el);
  setTimeout(()=>el.style.opacity='0',1600);
  setTimeout(()=>el.remove(),2200);
}

async function loadShortcuts() {
  if(SHORTCUTS.length === 0){
    try {
      const res = await fetch('shortcuts.json');
      const data = await res.json();
      SHORTCUTS = data.shortcuts || [];
      localStorage.setItem(LS_KEYS.shortcuts, JSON.stringify(SHORTCUTS));
    } catch(e) {
      console.error('Failed to load shortcuts.json', e);
    }
  }
  renderShortcuts();
}

function renderShortcuts() {
  if(!shortcutsContainer) return;
  if(SHORTCUTS.length === 0) {
    shortcutsContainer.innerHTML = '<div class="muted">No shortcuts yet ✨</div>';
    return;
  }
  shortcutsContainer.innerHTML = SHORTCUTS.map((sc,i) =>
    `<div class="historyItem">
       <span onclick="window.open('${sc.url}','_blank')">${sc.name}</span>
       <button onclick="removeShortcut(${i})" style="margin-left:6px;padding:2px 6px;border-radius:8px;">✖</button>
     </div>`
  ).join('');
}

function addShortcutFromInput() {
  if(!shortcutInput.value) return;
  const val = shortcutInput.value.split('|');
  if(val.length !== 2){ toast('Use format: name | url 🌈'); return; }
  const newSC = { name: val[0].trim(), url: val[1].trim() };
  SHORTCUTS.push(newSC);
  localStorage.setItem(LS_KEYS.shortcuts, JSON.stringify(SHORTCUTS));
  shortcutInput.value = '';
  renderShortcuts();
  toast('Shortcut added ✨');
}

function removeShortcut(index) {
  SHORTCUTS.splice(index,1);
  localStorage.setItem(LS_KEYS.shortcuts, JSON.stringify(SHORTCUTS));
  renderShortcuts();
  toast('Shortcut removed 🗑️');
}

async function mainSearch(){
  const q = qEl.value.trim(); 
  if(!q) return;
  if(/^https?:\/\//i.test(q) || (q.includes('.') && !q.includes(' '))){
    window.location.href = q.startsWith('http')?q:'https://'+q;
    return;
  }
  pushHistory(q);
  setLamboThinking(true);
  const doLambo = (SEARCH_SOURCE==='both'||SEARCH_SOURCE==='lambo');
  const doGoogle = (SEARCH_SOURCE==='both'||SEARCH_SOURCE==='google');
  if(doLambo){
    document.getElementById('lamboResult').style.display='block';
    await renderLambo(q);
  } else {
    document.getElementById('lamboResult').style.display='none';
  }
  if(doGoogle){
    document.getElementById('googleResult').style.display='block';
    renderGoogle(q);
  } else {
    document.getElementById('googleResult').style.display='none';
  }
  setLamboThinking(false);
}

async function renderLambo(q){
  if(!API_KEY){
    lamboTextEl.textContent='No API key — open Settings ⚙';
    return;
  }
  lamboTextEl.textContent='Lambo is thinking... 🌈';
  document.getElementById('logo').style.animation='logoThink 3s infinite';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`;
  try {
    const body = {
      contents:[{parts:[{text:`You are Lambo, a friendly mobile AI cat built on Gemini. Created by Montry for Nothing App. Answer concisely for a mobile user. User: ${q}`}]}]
    };
    const res = await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Lambo had no reply 😿';
    await typeText(lamboTextEl,txt,20);
    document.getElementById('logo').style.animation='logoIdle 6s ease-in-out infinite';
  } catch(err){
    lamboTextEl.textContent='Lambo failed — check API key/network.';
    document.getElementById('logo').style.animation='logoIdle 6s ease-in-out infinite';
  }
}

function typeText(el,text,delay=20){
  return new Promise(resolve=>{
    el.textContent='';
    let i=0;
    function step(){ if(i<text.length){ el.textContent+=text[i++]; setTimeout(step,delay); } else resolve(); }
    step();
  });
}

function setLamboThinking(state){
  const logo = document.getElementById('logo');
  if(state){ logo.style.animation='logoThink 3s infinite'; }
  else { logo.style.animation='logoIdle 6s ease-in-out infinite'; }
}

function renderGoogle(q){
  if(GOOGLE_MODE==='url'){
    openGoogleBtn.style.display='block';
    openGoogleBtn.onclick = () => window.open('https://www.google.com/search?q='+encodeURIComponent(q),'_blank');
    googleResultsContainer.style.display='none';
  } else {
    openGoogleBtn.style.display='none';
    googleResultsContainer.style.display='block';
  }
}

window.repaste = repaste;
window.addShortcutFromInput = addShortcutFromInput;
window.removeShortcut = removeShortcut;
