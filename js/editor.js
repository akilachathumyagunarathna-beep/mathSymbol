// ── EDITOR CORE ──
const ed = document.getElementById('ed');
const sugBox = document.getElementById('sug');
let selIdx = -1, matches = [], spellOn = true;

// ── SYMBOL INSERTION ──
function getQuery(){
  const sel=window.getSelection();
  if(!sel.rangeCount)return null;
  const r=sel.getRangeAt(0), node=r.startContainer;
  if(node.nodeType!==3)return null;
  const txt=node.textContent.substring(0,r.startOffset);
  const si=txt.lastIndexOf('/');
  if(si===-1)return null;
  const q=txt.substring(si);
  if(q.includes(' '))return null;
  return{q,node,off:r.startOffset,si};
}

function applyMatch(key, node, off, si){
  const sel=window.getSelection(), r=document.createRange();
  r.setStart(node,si); r.setEnd(node,off);
  r.deleteContents(); r.insertNode(document.createTextNode(SM[key]));
  r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
  hideSug(); updateStats(); setAct('Inserted '+key+' → '+SM[key]);
}

function insertSym(sym){
  ed.focus();
  const sel=window.getSelection();
  if(sel.rangeCount){
    const r=sel.getRangeAt(0);
    r.deleteContents(); r.insertNode(document.createTextNode(sym));
    r.collapse(false); sel.removeAllRanges(); sel.addRange(r);
  }
  hideSug(); updateStats();
}

// ── AUTO BRACKET PAIRS ──
// ( → ( | )   { → { | }   [ → [ | ]   " → " | "   ' → ' | '
const BRACKET_PAIRS = {
  '(': ')',
  '{': '}',
  '[': ']',
  '"': '"',
  "'": "'",
};

function handleBracketPair(e) {
  const opener = e.key;
  const closer = BRACKET_PAIRS[opener];
  if (!closer) return false;

  e.preventDefault();
  const sel = window.getSelection();
  if (!sel.rangeCount) return true;

  const range = sel.getRangeAt(0);
  const selectedText = range.toString();

  // Selected text ඇත්නම් — wrap කරන්න
  if (selectedText) {
    range.deleteContents();
    const wrapped = document.createTextNode(opener + selectedText + closer);
    range.insertNode(wrapped);
    // cursor end of inserted text
    const newRange = document.createRange();
    newRange.setStartAfter(wrapped);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    updateStats();
    return true;
  }

  // Selected text නැත — pair insert, cursor middle
  // opener + closer insert කරලා cursor middle
  const pair = document.createTextNode(opener + closer);
  range.insertNode(pair);

  // cursor opener ට පස්සෙ / closer ට කලින් — offset = 1
  const cursorRange = document.createRange();
  cursorRange.setStart(pair, 1);
  cursorRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(cursorRange);

  updateStats();
  return true;
}

// Closing bracket ටයිප් කළ විට skip (already there)
function handleClosingBracket(e) {
  const closers = new Set([')', '}', ']']);
  if (!closers.has(e.key)) return false;

  const sel = window.getSelection();
  if (!sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== 3) return false;

  // cursor ට right side character check
  const afterCursor = node.textContent[range.startOffset];
  if (afterCursor === e.key) {
    e.preventDefault();
    // cursor move right by 1
    const newRange = document.createRange();
    newRange.setStart(node, range.startOffset + 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return true;
  }
  return false;
}

// ── PER-LINE DELETE ──
// Ctrl+Shift+K හෝ Ctrl+D — current line delete
function deleteCurrentLine() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  // contenteditable div — block element find
  let node = sel.getRangeAt(0).startContainer;
  
  // Text node නම් parent find
  if (node.nodeType === 3) node = node.parentNode;
  
  // ed ට direct child div/p/br block find
  let block = node;
  while (block && block.parentNode !== ed) {
    block = block.parentNode;
  }
  
  if (block && block !== ed) {
    block.remove();
    updateStats();
    setAct('Line deleted');
    return;
  }
  
  // Flat text nodes (no block wrapper) — selection range delete
  const range = sel.getRangeAt(0);
  const fullText = ed.innerText;
  const preText = getTextBeforeCursor();
  const lineStart = preText.lastIndexOf('\n') + 1;
  const lineEndRaw = fullText.indexOf('\n', preText.length);
  const lineEnd = lineEndRaw === -1 ? fullText.length : lineEndRaw;
  
  // execCommand select-delete
  document.execCommand('selectAll', false, null);
  const beforeLine = fullText.substring(0, lineStart);
  const afterLine = fullText.substring(lineEnd + 1);
  ed.innerText = beforeLine + afterLine;
  updateStats();
  setAct('Line deleted');
}

function getTextBeforeCursor() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return '';
  const range = document.createRange();
  range.selectNodeContents(ed);
  range.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
  return range.toString();
}

// ── SUGGESTIONS ──
function showSug(query, node, off, si){
  matches=Object.keys(SM).filter(k=>k.startsWith(query)&&query.length>1);
  selIdx=-1;
  if(!matches.length){hideSug();return;}
  sugBox.innerHTML='';
  let curCat='';
  const catOf=k=>{
    for(const[c,ks]of Object.entries(CATS))if(ks.includes(k))return c;
    return'Custom';
  };
  const isCustom=k=>!SM_BUILTIN.hasOwnProperty(k);
  matches.slice(0,16).forEach((m,i)=>{
    const cat=catOf(m);
    if(cat!==curCat){
      curCat=cat;
      const h=document.createElement('div');h.className='sug-cat';h.textContent=cat;
      sugBox.appendChild(h);
    }
    const d=document.createElement('div'); d.className='sug-item'; d.dataset.i=i;
    const tag=isCustom(m)?'<span class="sug-tag">custom</span>':'';
    d.innerHTML=`<span class="sug-key">${m}</span>${tag}<span class="sug-sym">${SM[m]}</span>`;
    d.onclick=()=>applyMatch(m,node,off,si);
    d.onmouseenter=()=>{selIdx=i;hilite()};
    sugBox.appendChild(d);
  });
  sugBox.style.display='block';
  const rect=ed.getBoundingClientRect();
  sugBox.style.top=(ed.offsetTop+32)+'px';
  sugBox.style.left='26px';
}

function hilite(){sugBox.querySelectorAll('.sug-item').forEach((d,i)=>d.classList.toggle('sel',i===selIdx));}
function hideSug(){sugBox.style.display='none';matches=[];selIdx=-1;}

// ── EVENTS ──
ed.addEventListener('input',()=>{
  updateStats(); updateBtns();
  const q=getQuery();
  if(q)showSug(q.q,q.node,q.off,q.si); else hideSug();

  // = sign formula hint
  const selNode = window.getSelection();
  if (selNode.rangeCount) {
    const node2 = selNode.getRangeAt(0).startContainer;
    if (node2.nodeType === 3) {
      const txt2 = node2.textContent;
      const eqMatch = txt2.match(/=([a-zA-Z_][a-zA-Z0-9_]*\([^)]*\))\s*$/);
      if (eqMatch && typeof evalWithCalcScope === 'function') {
        const result = evalWithCalcScope(eqMatch[1]);
        if (result !== null) {
          setAct('= ' + eqMatch[1] + ' → ' + result);
        }
      }
    }
  }
});

ed.addEventListener('keydown',e=>{
  updateBtns();

  // ── Auto bracket pairs (opener keys) ──
  if (BRACKET_PAIRS[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (handleBracketPair(e)) return;
  }

  // ── Closing bracket skip ──
  if (!e.ctrlKey && !e.metaKey) {
    if (handleClosingBracket(e)) return;
  }

  // ── Suggestion navigation ──
  if(sugBox.style.display==='block'){
    const items=sugBox.querySelectorAll('.sug-item');
    if(e.key==='ArrowDown'){e.preventDefault();selIdx=Math.min(selIdx+1,items.length-1);hilite();return}
    if(e.key==='ArrowUp'){e.preventDefault();selIdx=Math.max(selIdx-1,0);hilite();return}
    if(e.key==='Enter'||e.key===' '){
      if(selIdx>=0){e.preventDefault();const q=getQuery();if(q)applyMatch(matches[selIdx],q.node,q.off,q.si);return}
      if(e.key===' '){const q=getQuery();if(q&&SM[q.q]){e.preventDefault();applyMatch(q.q,q.node,q.off,q.si);return}}
    }
    if(e.key==='Escape'){hideSug();return}
  }

  if(e.key==='Tab'){e.preventDefault();document.execCommand('insertText',false,'  ');}
});

ed.addEventListener('keyup',updateBtns);
ed.addEventListener('mouseup',()=>{updateBtns();updateSelection();});
document.addEventListener('click',e=>{if(!sugBox.contains(e.target)&&e.target!==ed)hideSug();});

// Global keyboard shortcuts
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey){
    if(e.key==='b'){e.preventDefault();fmt('bold')}
    if(e.key==='i'){e.preventDefault();fmt('italic')}
    if(e.key==='u'){e.preventDefault();fmt('underline')}
    if(e.key==='z'&&!e.shiftKey){e.preventDefault();fmt('undo')}
    if((e.key==='z'&&e.shiftKey)||e.key==='y'){e.preventDefault();fmt('redo')}
    if(e.key==='a'){/* allow default select all */}
    if(e.key==='Enter'){e.preventDefault();insertHR();}
    if(e.shiftKey&&e.key==='C'){e.preventDefault();copyForWord();}
    if(e.key==='h'&&!e.shiftKey){e.preventDefault();openFindReplace();}
    if(e.key==='f'){/* allow browser find */}
    // Ctrl+Shift+K — delete current line
    if(e.shiftKey&&e.key==='K'){e.preventDefault();deleteCurrentLine();}
    // Ctrl+D — delete current line (alternate)
    if(!e.shiftKey&&e.key==='d'){e.preventDefault();deleteCurrentLine();}
  }
});

ed.addEventListener('paste',e=>{
  e.preventDefault();
  const html=e.clipboardData.getData('text/html');
  const plain=e.clipboardData.getData('text/plain');
  if(html){
    document.execCommand('insertHTML',false,html);
  } else {
    document.execCommand('insertText',false,plain);
  }
  updateStats();
});

// ── FORMATTING ──
function fmt(cmd,val=null){ed.focus();document.execCommand(cmd,false,val);updateBtns();setAct(cmd);}

function applyFS(v){
  ed.focus();
  document.execCommand('fontSize',false,'7');
  ed.querySelectorAll('font[size="7"]').forEach(el=>{
    el.removeAttribute('size');el.style.fontSize=v+'px';
  });
}

function applyFF(v){ed.focus();document.execCommand('fontName',false,v);}

function applyLineHeight(v){
  ed.style.lineHeight=v;
  setAct('Line height: '+v);
}

function applyHeading(val){
  ed.focus();
  if(!val){document.execCommand('formatBlock',false,'p');}
  else{document.execCommand('formatBlock',false,val);}
  document.getElementById('headSel').value='';
  updateBtns();
}

function insertQuote(){
  ed.focus();
  const t=window.getSelection().toString()||'Quote here';
  document.execCommand('insertHTML',false,`<blockquote>${t}</blockquote>`);
}

function insertHR(){
  ed.focus();
  document.execCommand('insertHTML',false,'<hr>');
}

function insertCode(){
  ed.focus();
  const t=window.getSelection().toString()||'code here';
  document.execCommand('insertHTML',false,`<code>${t}</code>`);
}

function insertTable(){
  const rows=parseInt(prompt('Number of rows?','3')||'3');
  const cols=parseInt(prompt('Number of columns?','3')||'3');
  if(!rows||!cols)return;
  let html='<table><tr>';
  for(let c=0;c<cols;c++)html+=`<th>Header ${c+1}</th>`;
  html+='</tr>';
  for(let r=0;r<rows;r++){
    html+='<tr>';
    for(let c=0;c<cols;c++)html+=`<td>Cell</td>`;
    html+='</tr>';
  }
  html+='</table>';
  ed.focus();
  document.execCommand('insertHTML',false,html);
  setAct('Table inserted');
}

function insertTaskList(){
  ed.focus();
  document.execCommand('insertHTML',false,
    '<ul><li><input type="checkbox"> Task item</li><li><input type="checkbox"> Another task</li></ul>'
  );
}

function removeFormat(){
  ed.focus();
  document.execCommand('removeFormat',false,null);
  setAct('Formatting cleared');
}

// ── UI HELPERS ──
function updateBtns(){
  ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','justifyFull'].forEach(cmd=>{
    const id='btn-'+cmd.replace('Through','through');
    const b=document.getElementById(id);
    if(b)b.classList.toggle('on',document.queryCommandState(cmd));
  });
}

function updateStats(){
  const t=ed.innerText||'';
  const words=t.trim()?t.trim().split(/\s+/).length:0;
  const chars=t.length;
  const lines=t.split('\n').length;
  document.getElementById('wc').textContent=words;
  document.getElementById('cc').textContent=chars;
  document.getElementById('lc').textContent=lines;
  updateWCPanel(t,words,chars,lines);
}

function updateSelection(){
  const sel=window.getSelection();
  const sc=sel.toString().length;
  document.getElementById('sc').textContent=sc;
}

function setAct(msg){document.getElementById('act').textContent=msg;}

function toast(msg, type=''){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className='toast show'+(type?' '+type:'');
  setTimeout(()=>t.className='toast',2000);
}

function toggleSpell(){
  spellOn=!spellOn;
  ed.spellcheck=spellOn;
  document.getElementById('spellBtn').classList.toggle('on',spellOn);
  setAct('Spellcheck '+(spellOn?'on':'off'));
}

// ── WORD COUNT PANEL ──
function updateWCPanel(t,words,chars,lines){
  const g=document.getElementById('wcGrid');
  if(!document.getElementById('panel-wc').classList.contains('open'))return;
  const sentences=(t.match(/[.!?]+/g)||[]).length;
  const paragraphs=(t.split(/\n\s*\n/)||[]).filter(p=>p.trim()).length||1;
  const readTime=Math.max(1,Math.round(words/200));
  const unique=new Set(t.toLowerCase().match(/\b\w+\b/g)||[]).size;
  g.innerHTML=`
    <div class="wc-card"><div class="wc-val">${words}</div><div class="wc-label">Words</div></div>
    <div class="wc-card"><div class="wc-val">${chars}</div><div class="wc-label">Characters</div></div>
    <div class="wc-card"><div class="wc-val">${chars-(t.match(/ /g)||[]).length}</div><div class="wc-label">Chars (no spaces)</div></div>
    <div class="wc-card"><div class="wc-val">${lines}</div><div class="wc-label">Lines</div></div>
    <div class="wc-card"><div class="wc-val">${sentences}</div><div class="wc-label">Sentences</div></div>
    <div class="wc-card"><div class="wc-val">${paragraphs}</div><div class="wc-label">Paragraphs</div></div>
    <div class="wc-card"><div class="wc-val">${unique}</div><div class="wc-label">Unique Words</div></div>
    <div class="wc-card"><div class="wc-val">${readTime} min</div><div class="wc-label">Read Time</div></div>
  `;
}

function toggleWordCount(){
  const p=document.getElementById('panel-wc');
  p.classList.toggle('open');
  if(p.classList.contains('open')) updateStats();
}

// ── FIND & REPLACE ──
function openFindReplace(){
  let modal=document.getElementById('findModal');
  if(!modal){
    modal=document.createElement('div');
    modal.id='findModal';
    modal.className='modal-overlay';
    modal.innerHTML=`
      <div class="modal">
        <h3>🔍 Find & Replace</h3>
        <div class="modal-row"><label>Find</label><input id="findInput" placeholder="Search text..."></div>
        <div class="modal-row"><label>Replace with</label><input id="replaceInput" placeholder="Replacement..."></div>
        <div class="modal-btns">
          <button class="hbtn lit" onclick="doReplace(false)">Replace Next</button>
          <button class="hbtn lit" onclick="doReplace(true)">Replace All</button>
          <button class="hbtn" onclick="document.getElementById('findModal').classList.remove('open')">Close</button>
        </div>
        <div id="findResult" style="margin-top:10px;font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace"></div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.classList.add('open');
  document.getElementById('findInput').focus();
}

function doReplace(all){
  const find=document.getElementById('findInput').value;
  const rep=document.getElementById('replaceInput').value;
  const res=document.getElementById('findResult');
  if(!find){res.textContent='Enter search text';return;}
  const html=ed.innerHTML;
  const escaped=find.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const rx=new RegExp(escaped,all?'g':'');
  const count=(html.match(new RegExp(escaped,'g'))||[]).length;
  if(!count){res.textContent='Not found';return;}
  ed.innerHTML=html.replace(rx,rep);
  res.textContent=all?`Replaced ${count} occurrence(s)`:'Replaced 1 occurrence';
  updateStats();
}

// ── CLEAR ──
function clearAll(){
  if(!ed.innerText.trim())return;
  if(confirm('Clear everything?')){ed.innerHTML='';updateStats();setAct('Cleared');}
}