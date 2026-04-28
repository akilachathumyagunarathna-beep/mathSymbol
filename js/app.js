// ── APP INIT ──
let dark = true;

function toggleTheme(){
  dark=!dark;
  document.body.classList.toggle('light',!dark);
  document.getElementById('themeBtn').textContent=dark?'☀ Light':'🌙 Dark';
}

// ── PANEL MANAGEMENT ──
const panelIds = ['shortcuts','custom','wc','calc'];

function togglePanel(name){
  const target = document.getElementById('panel-'+name);
  const wasOpen = target.classList.contains('open');
  // Close all panels
  panelIds.forEach(id=>{
    document.getElementById('panel-'+id)?.classList.remove('open');
  });
  // Open target if it was closed
  if(!wasOpen) target.classList.add('open');
}

// ── FONT SELECTOR SETUP ──
// Normal fonts මුලට — then special/mono fonts
// HTML toolbar font-family dropdown populate කිරීම
function setupFontSelector(){
  const sel = document.getElementById('fontSel');
  if(!sel) return;

  // ── Font groups — normal/body fonts FIRST ──
  const fontGroups = [
    {
      label: '— Normal Fonts —',
      fonts: [
        { label: 'Default (Sans)', value: '' },
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
        { label: 'Calibri', value: 'Calibri, sans-serif' },
        { label: 'Verdana', value: 'Verdana, sans-serif' },
        { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
        { label: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
        { label: 'Tahoma', value: 'Tahoma, sans-serif' },
      ]
    },
    {
      label: '— Monospace —',
      fonts: [
        { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
        { label: 'Courier New', value: '"Courier New", Courier, monospace' },
        { label: 'Consolas', value: 'Consolas, monospace' },
        { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
      ]
    },
    {
      label: '— Display / Stylized —',
      fonts: [
        { label: 'Impact', value: 'Impact, "Arial Narrow", sans-serif' },
        { label: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
        { label: 'Garamond', value: 'Garamond, serif' },
        { label: 'Franklin Gothic', value: '"Franklin Gothic Medium", sans-serif' },
        { label: 'Gill Sans', value: '"Gill Sans", sans-serif' },
      ]
    }
  ];

  sel.innerHTML = '';

  fontGroups.forEach(group => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    group.fonts.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.value;
      opt.textContent = f.label;
      if(f.value) opt.style.fontFamily = f.value;
      optgroup.appendChild(opt);
    });
    sel.appendChild(optgroup);
  });

  // Change handler — apply font
  sel.addEventListener('change', () => {
    if(sel.value) applyFF(sel.value);
    else {
      // Default — remove font override
      ed.focus();
      document.execCommand('removeFormat', false, null);
    }
    ed.focus();
  });
}

// ── TOOLBAR LINE DELETE BUTTON ──
// Toolbar හි "Delete Line" button add or wire
function setupLineDeleteBtn(){
  const btn = document.getElementById('btn-deleteLine');
  if(btn){
    btn.onclick = () => {
      if(typeof deleteCurrentLine === 'function') deleteCurrentLine();
    };
    btn.title = 'Delete current line (Ctrl+Shift+K)';
  }
}

// ── TOOLBAR TOOLTIPS ENHANCE ──
// Existing toolbar buttons වලට keyboard shortcut tooltip add
function enhanceToolbarTooltips(){
  const tipMap = {
    'btn-bold':          'Bold (Ctrl+B)',
    'btn-italic':        'Italic (Ctrl+I)',
    'btn-underline':     'Underline (Ctrl+U)',
    'btn-strikethrough': 'Strikethrough',
    'btn-undo':          'Undo (Ctrl+Z)',
    'btn-redo':          'Redo (Ctrl+Y)',
    'btn-justifyLeft':   'Align Left',
    'btn-justifyCenter': 'Center',
    'btn-justifyRight':  'Align Right',
    'btn-justifyFull':   'Justify',
    'spellBtn':          'Toggle Spellcheck',
    'themeBtn':          'Toggle Dark/Light',
  };
  Object.entries(tipMap).forEach(([id, tip]) => {
    const el = document.getElementById(id);
    if(el && !el.title) el.title = tip;
  });
}

// ── SHORTCUTS PANEL ──
function buildPanel(){
  const g=document.getElementById('pgrid');
  g.innerHTML='';
  for(const[cat,keys]of Object.entries(CATS_BUILTIN)){
    const h=document.createElement('div');h.className='pi-hdr';h.textContent=cat;g.appendChild(h);
    keys.forEach(k=>{
      if(!SM[k])return;
      const d=document.createElement('div');d.className='pi';
      d.innerHTML=`<span class="pi-code">${k}</span><span class="pi-sym">${SM[k]}</span><span class="pi-name">${NAMES[k]||''}</span>`;
      d.onclick=()=>insertSym(SM[k]);
      g.appendChild(d);
    });
  }
}

function rebuildPanel(){
  buildPanel();
}

function filterPanel(q){
  const items=document.querySelectorAll('#pgrid .pi');
  const hdrs=document.querySelectorAll('#pgrid .pi-hdr');
  const v=q.toLowerCase();
  items.forEach(d=>{
    const code=d.querySelector('.pi-code')?.textContent||'';
    const name=d.querySelector('.pi-name')?.textContent||'';
    const sym=d.querySelector('.pi-sym')?.textContent||'';
    d.style.display=(!v||code.includes(v)||name.includes(v)||sym.includes(v))?'':'none';
  });
  hdrs.forEach(h=>{
    let sib=h.nextElementSibling;
    let anyVisible=false;
    while(sib&&!sib.classList.contains('pi-hdr')){
      if(sib.style.display!=='none')anyVisible=true;
      sib=sib.nextElementSibling;
    }
    h.style.display=anyVisible?'':'none';
  });
}

// ── BRACKET PAIR TOGGLE (optional UI button) ──
let bracketPairsEnabled = true;
function toggleBracketPairs(){
  bracketPairsEnabled = !bracketPairsEnabled;
  const btn = document.getElementById('btn-brackets');
  if(btn) btn.classList.toggle('on', bracketPairsEnabled);
  toast('Auto-brackets ' + (bracketPairsEnabled ? 'on' : 'off'));
}

// ── INIT ──
buildPanel();
rebuildCustomGrid();
initCalculator();
updateStats();
setupFontSelector();
setupLineDeleteBtn();
enhanceToolbarTooltips();
ed.focus();

// Keyboard shortcut hint tooltip
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key==='/')openFindReplace();
});
