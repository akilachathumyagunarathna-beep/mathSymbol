// ============================================================
// CALCULATOR PANEL - WITH CUSTOM FUNCTIONS & GRAPHING
// ============================================================

const calcVars = {};
let calcRowCount = 0;
let calcChartInstance = null;

// ── CUSTOM FUNCTIONS STORAGE ──
let customFunctions = JSON.parse(localStorage.getItem('sym_custom_functions') || '[]');

function loadCustomFunctions() {
    customFunctions.forEach(fnStr => {
        try {
            math.evaluate(fnStr, calcVars);
        } catch (e) { console.error("Error loading function:", fnStr); }
    });
    renderFunctionList();
}

function saveCustomFunction(expr) {
    if (expr.includes('=') && expr.includes('(')) {
        const fnName = expr.split('(')[0].trim();
        // පරණ එකක් ඇත්නම් අයින් කර අලුත් එක දැමීම
        customFunctions = customFunctions.filter(f => !f.startsWith(fnName + '('));
        customFunctions.push(expr);
        localStorage.setItem('sym_custom_functions', JSON.stringify(customFunctions));
        renderFunctionList();
        if (typeof toast === 'function') toast(`Function '${fnName}' saved!`, 'success');
    }
}

function renderFunctionList() {
    const container = document.getElementById('calc-custom-list');
    if (!container) return;
    
    if (customFunctions.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '<h4 style="font-size:11px; color:var(--accent); margin-bottom:8px; text-transform:uppercase; letter-spacing:1px; opacity:0.8;">Saved Logic</h4>';
    
    customFunctions.forEach((fn, index) => {
        // '=' ලකුණෙන් දෙපැත්ත වෙන් කරගන්නවා
        const parts = fn.split('=');
        const name = parts[0].trim();
        const logic = parts[1] ? parts[1].trim() : ''; // සූත්‍රය තිබෙන කොටස

        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surf2); padding:8px 12px; margin-bottom:6px; border-radius:6px; border-left: 3px solid var(--accent);">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-family:'JetBrains Mono', monospace; font-size:13px; color:var(--fg); font-weight:bold;">${name}</span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:var(--muted); italic; opacity:0.9;">= ${logic}</span>
                </div>
                <button onclick="deleteCustomFn(${index})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:18px; font-weight:bold; padding:0 5px; opacity:0.6;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6" title="Delete">×</button>
            </div>`;
    });
}

function deleteCustomFn(index) {
    const fn = customFunctions[index];
    const name = fn.split('(')[0].trim();
    customFunctions.splice(index, 1);
    localStorage.setItem('sym_custom_functions', JSON.stringify(customFunctions));
    delete calcVars[name]; // Memory එකෙන් අයින් කිරීම
    renderFunctionList();
    if (typeof toast === 'function') toast('Function deleted', 'info');
}

// ── CORE CALCULATOR LOGIC ──

function initCalculator(){
  document.getElementById('calc-rows').innerHTML = '';
  calcRowCount = 0;
  calcAddRow('');
  calcAddRow('');
  calcAddRow('');
  loadCustomFunctions();
}

function calcAddRow(expr){
  const i = calcRowCount++;
  const div = document.createElement('div');
  div.className = 'calc-row';
  div.id = 'calc-row-'+i;
  div.innerHTML = `
    <div class="calc-rn">${i+1}</div>
    <div class="calc-cell">
      <input class="calc-inp" id="calc-inp-${i}"
        placeholder="e.g: x = 10,  2*x,  1m to km"
        value="${expr}" spellcheck="false" autocomplete="off">
    </div>
    <div class="calc-res def" id="calc-res-${i}">—</div>
    <button class="calc-insert" id="calc-ins-${i}" title="Insert result as plain text" onclick="calcInsertResult(${i})">↩</button>
    <button class="calc-vis-btn" id="calc-vis-${i}" title="Insert as visual math notation" onclick="calcInsertVisual(${i})">∫√ Math</button>
    <button class="calc-insert" title="Draw Graph" onclick="calcDrawGraph(${i})" style="color:var(--accent2)">📈</button>
    <button class="calc-del-btn" onclick="calcRemoveRow(${i})" title="Delete row">×</button>`; 
  document.getElementById('calc-rows').appendChild(div);

  const inp = document.getElementById('calc-inp-'+i);
  inp.addEventListener('input', ()=>{ calcEvalRow(i); });
  
  // Enter key support to focus next
  inp.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') calcFocusNext(i);
      if(e.key === 'ArrowUp') calcFocusPrev(i);
      if(e.key === 'ArrowDown') calcFocusNext(i);
  });
}

function calcRemoveRow(i) {
    const row = document.getElementById('calc-row-' + i);
    if (row) row.remove();
}

function calcFocusNext(i){
  if(i+1 < calcRowCount) document.getElementById('calc-inp-'+(i+1))?.focus();
  else { calcAddRow(''); setTimeout(()=>document.getElementById('calc-inp-'+(calcRowCount-1))?.focus(),0); }
}

function calcFocusPrev(i){ 
  if(i>0) document.getElementById('calc-inp-'+(i-1))?.focus(); 
}

function calcClear(){
  if(!confirm('Clear all calculator rows?')) return;
  Object.keys(calcVars).forEach(k=>delete calcVars[k]);
  calcRowCount = 0;
  document.getElementById('calc-rows').innerHTML = '';
  document.getElementById('calc-badges').innerHTML = '';
  document.getElementById('calc-fx').textContent = '—';
  hideGraph();
  initCalculator();
}

// ── EVALUATION LOGIC ──

function calcEvalRow(i) {
  const inp = document.getElementById('calc-inp-' + i);
  const resEl = document.getElementById('calc-res-' + i);
  let val = inp.value.trim();

  if (!val) {
    resEl.textContent = '—';
    resEl.className = 'calc-res def';
    const ins = document.getElementById('calc-ins-' + i);
    if(ins) ins.style.display = 'none';
    const vis = document.getElementById('calc-vis-' + i);
    if(vis) vis.classList.remove('visible');
    return;
  }

  // Symbolic math check (diff, integrate, solve, factor, expand)
  if (typeof calcSymbolic === 'function') {
    const symResult = calcSymbolic(val);
    if (symResult !== null) {
      resEl.textContent = symResult;
      resEl.className = 'calc-res ok sym';
      const ins = document.getElementById('calc-ins-' + i);
      if(ins) { ins.dataset.val = symResult; ins.style.display = 'flex'; }
      const visS = document.getElementById('calc-vis-' + i);
      if(visS) visS.classList.add('visible');
      return;
    }
  }

  try {
    // 2x වැනි දේවල් 2*x ලෙස පරිවර්තනය
    let cleanVal = val.replace(/(\d)(x)/gi, '$1*$2');
    
    // Math.js හරහා ගණනය කිරීම
    let result = math.evaluate(cleanVal, calcVars);

    // Custom function එකක් සෑදුවේ නම් එය සේව් කිරීම (උදා: bmi(w,h) = w/h^2)
    if (val.includes('=') && typeof result === 'function') {
        saveCustomFunction(val);
        resEl.textContent = 'fn saved';
        resEl.className = 'calc-res ok';
        return;
    }

    // විචල්‍යයන් (Variables) සේව් කිරීම (උදා: x = 10)
    if (val.includes('=') && val.split('=')[0].trim()) {
      const varName = val.split('=')[0].trim();
      calcVars[varName] = result;
      calcRenderBadges(); 
    }

    // Matrix result හෝ normal result
    const isMatrix = result && result.isMatrix;
    resEl.textContent = isMatrix ? calcFmtMatrix(result) : calcFmt(result);
    resEl.className = isMatrix ? 'calc-res ok matrix' : 'calc-res ok';
    
    const ins = document.getElementById('calc-ins-' + i);
    if(ins) {
        ins.dataset.val = isMatrix ? calcFmtMatrix(result) : calcFmt(result);
        ins.style.display = 'flex';
        const visN = document.getElementById('calc-vis-' + i);
        if(visN) visN.classList.add('visible');
    }

  } catch (err) {
    resEl.textContent = 'Error';
    resEl.className = 'calc-res err';
    const ins = document.getElementById('calc-ins-' + i);
    if(ins) ins.style.display = 'none';
    const visE = document.getElementById('calc-vis-' + i);
    if(visE) visE.classList.remove('visible');
  }
}

function calcFmt(n){
  if(typeof n === 'function') return 'function';
  if(typeof n === 'undefined' || n === null) return '—';
  if(!Number.isFinite(n)) return String(n);
  if(Number.isInteger(n)) return n.toLocaleString();
  return parseFloat(n.toFixed(8)).toLocaleString(undefined,{maximumFractionDigits:6});
}

function calcRenderBadges(){
  const b = document.getElementById('calc-badges');
  if(!b) return;
  b.innerHTML = '';
  const entries = Object.entries(calcVars);
  if(!entries.length) return;
  entries.forEach(([k,v])=>{
    if(typeof v === 'function') return; // Badge වල functions පෙන්වන්නේ නැත
    const el = document.createElement('span');
    el.className = 'calc-badge';
    el.title = 'Click to insert into focused cell';
    el.innerHTML = `<b>${k}</b>=${calcFmt(v)}`;
    el.onclick = () => {
      const focused = document.activeElement;
      if(focused && focused.classList.contains('calc-inp')){
        const pos = focused.selectionStart;
        focused.value = focused.value.slice(0,pos) + k + focused.value.slice(focused.selectionEnd);
        focused.setSelectionRange(pos+k.length, pos+k.length);
        focused.dispatchEvent(new Event('input'));
      }
    };
    b.appendChild(el);
  });
}

function calcInsertResult(i){
  const ins = document.getElementById('calc-ins-'+i);
  if(!ins || !ins.dataset.val) return;
  const val = ins.dataset.val;
  // Multi-line (matrix) නම් clipboard copy
  if(val.includes('\n')){
    navigator.clipboard?.writeText(val).then(()=>{
      if(typeof toast === 'function') toast('Matrix copied to clipboard!','success');
    });
  } else {
    if(typeof insertSym === 'function') {
      insertSym(val);
      if(typeof toast === 'function') toast('Result inserted into editor','success');
    }
  }
}

// ── GRAPHING FUNCTION (Chart.js) ──

function calcDrawGraph(i) {
    const inp = document.getElementById('calc-inp-'+i).value.trim();
    if(!inp) return;

    let canvasWrap = document.getElementById('graphCanvasWrap');
    if(!canvasWrap) {
        canvasWrap = document.createElement('div');
        canvasWrap.id = 'graphCanvasWrap';
        canvasWrap.style.cssText = [
                                      "width:100%",
                                      "height:320px",
                                      "min-height:280px",
                                      "padding:10px",
                                      "background:var(--surf2)",
                                      "border-radius:8px",
                                      "margin-top:15px",
                                      "border:1px solid var(--border)",
                                      "position:relative",
                                      "box-sizing:border-box",
                                      "overflow:hidden"
                                    ].join(';');
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Clear All';
        closeBtn.className = 'hbtn';
        closeBtn.style = 'position:absolute;right:16px;top:8px;font-size:10px;';
        closeBtn.onclick = hideGraph;
        canvasWrap.style.position = 'relative';
        canvasWrap.appendChild(closeBtn);
        let canvas = document.createElement('canvas');
        canvas.id = 'graphCanvas';
        canvasWrap.appendChild(canvas);
        document.getElementById('calc-rows').after(canvasWrap);
    }
    canvasWrap.style.display = 'block';

    // Colors list
    const COLORS = [
    '#a78bfa', // Purple
    '#34d399', // Green
    '#f87171', // Red
    '#60a5fa', // Blue
    '#fbbf24', // Amber
    '#f472b6', // Pink
    '#38bdf8', // Sky Blue
    '#4ade80', // Light Green
    '#fb923c', // Orange
    '#e879f9', // Fuchsia
    '#a3e635', // Lime
    '#22d3ee', // Cyan
    '#f43f5e', // Rose
    '#818cf8', // Indigo
    '#2dd4bf', // Teal
    '#facc15', // Yellow
    '#c084fc', // Violet
    '#86efac', // Mint
    '#fda4af', // Light Red
    '#93c5fd', // Light Blue
    '#6ee7b7', // Light Teal
    '#fcd34d', // Light Amber
    '#d8b4fe', // Light Purple
    '#f9a8d4', // Light Pink
];

    try {
        let cleanExpr = inp.toLowerCase().replace(/(\d)(x)/gi, '$1*$2');
        const compiledCode = math.compile(cleanExpr);

        let labels = [];
        let dataPoints = [];
        for (let x = -10; x <= 10; x += 0.5) {
            let y = compiledCode.evaluate({ ...calcVars, x: x });
            if (typeof y === 'number' && isFinite(y)) {
                labels.push(x);
                dataPoints.push(y);
            }
        }

        const newDataset = {
            label: 'f(x) = ' + inp,
            data: dataPoints,
            borderColor: COLORS[(calcChartInstance ? calcChartInstance.data.datasets.length : 0) % COLORS.length],
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        };

        if(calcChartInstance) {
            // පරන chart එකට නව dataset add කිරීම
            calcChartInstance.data.datasets.push(newDataset);
            calcChartInstance.update();
            if(typeof toast === 'function') toast('Added: f(x) = ' + inp, 'success');
        } else {
            // අලුත් chart හදීම
            calcChartInstance = new Chart(
                document.getElementById('graphCanvas').getContext('2d'), {
                type: 'line',
                data: { labels: labels, datasets: [newDataset] },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  resizeDelay: 100,
                  onResize: (chart, size) => {
                    chart.canvas.style.width = '100%';
                    chart.canvas.style.height = '100%';
                  },
                  scales: {
                      x: { grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#888'} },
                      y: { grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#888'} }
                  },
                  plugins: {
                      legend: { labels:{ color:'#e2e8f0', font:{family:"'JetBrains Mono',monospace"} } },
                      tooltip: { mode:'index', intersect:false },
                      zoom: {
                          zoom: {
                              wheel: { enabled: true },      // mouse scroll zoom
                              pinch: { enabled: true },       // mobile pinch zoom
                              mode: 'xy'
                          },
                              pan: {
                                  enabled: true,
                                  mode: 'xy'
                              }
                          }
                      }
                  }
            });
            if(typeof toast === 'function') toast('Graph drawn!', 'success');
        }

    } catch(e) {
        if(typeof toast === 'function') toast('Cannot draw graph. Check expression.', 'error');
    }
}

function hideGraph() {
    const canvasWrap = document.getElementById('graphCanvasWrap');
    if(canvasWrap) {
        canvasWrap.style.display = 'none';
        if(calcChartInstance){ calcChartInstance.destroy(); calcChartInstance = null; }
        if(typeof toast === 'function') toast('Graph cleared', 'info');
    }
}

// ── SHARED MATH SCOPE (editor & data-lab access) ──
function getCalcScope() {
  return { ...calcVars };
}

function evalWithCalcScope(expr) {
  try {
    let clean = expr.replace(/(\d)(x)/gi, '$1*$2');
    return math.evaluate(clean, calcVars);
  } catch(e) {
    return null;
  }
}
// ── SYMBOLIC MATH (Nerdamer.js) ──
function calcSymbolic(expr) {
  try {
    // diff(3x^2, x) හෝ d/dx(3x^2) format
    const diffMatch = expr.match(/^(?:diff|d\/d([a-z]))\((.+),\s*([a-z])\)$/i) ||
                      expr.match(/^d\/d([a-z])\((.+)\)$/i);
    if (diffMatch) {
      const fn = diffMatch[2] || diffMatch[1];
      const variable = diffMatch[3] || diffMatch[1];
      const result = nerdamer.diff(fn, variable);
      return '∂: ' + result.toString();
    }

    // integrate(x^2, x) format
    const intMatch = expr.match(/^(?:integrate|∫)\((.+),\s*([a-z])\)$/i);
    if (intMatch) {
      const result = nerdamer.integrate(intMatch[1], intMatch[2]);
      return '∫: ' + result.toString() + ' + C';
    }

    // simplify(expr) format
    const simpMatch = expr.match(/^simplify\((.+)\)$/i);
    if (simpMatch) {
      const result = nerdamer(simpMatch[1]).expand();
      return result.toString();
    }

    // expand(expr) format
    const expMatch = expr.match(/^expand\((.+)\)$/i);
    if (expMatch) {
      const result = nerdamer(expMatch[1]).expand();
      return result.toString();
    }

    // factor(expr) format
    const facMatch = expr.match(/^factor\((.+)\)$/i);
    if (facMatch) {
      const result = nerdamer.factor(facMatch[1]);
      return result.toString();
    }

    // solve(expr, var) format
    const solveMatch = expr.match(/^solve\((.+),\s*([a-z])\)$/i);
    if (solveMatch) {
      const result = nerdamer.solve(solveMatch[1], solveMatch[2]);
      return 'x = ' + result.toString();
    }

    // Binary ↔ Decimal conversion
const binToDecMatch = expr.match(/^bin\(([01]+)\)$/i);
if (binToDecMatch) {
  return '= ' + parseInt(binToDecMatch[1], 2).toString();
}

const decToBinMatch = expr.match(/^dec\((\d+)\)$/i);
if (decToBinMatch) {
  return '= ' + parseInt(decToBinMatch[1]).toString(2);
}

// Hex conversion
const hexToDecMatch = expr.match(/^hex\(([0-9a-fA-F]+)\)$/i);
if (hexToDecMatch) {
  return '= ' + parseInt(hexToDecMatch[1], 16).toString();
}

const decToHexMatch = expr.match(/^tohex\((\d+)\)$/i);
if (decToHexMatch) {
  return '= ' + parseInt(decToHexMatch[1]).toString(16).toUpperCase();
}

// Octal conversion
const octToDecMatch = expr.match(/^oct\(([0-7]+)\)$/i);
if (octToDecMatch) {
  return '= ' + parseInt(octToDecMatch[1], 8).toString();
}

const decToOctMatch = expr.match(/^tooct\((\d+)\)$/i);
if (decToOctMatch) {
  return '= ' + parseInt(decToOctMatch[1]).toString(8);
}

    return null; // Symbolic නෙමෙයි
  } catch(e) {
    return null;
  }
}

// ── MATRIX FORMATTING ──
function calcFmtMatrix(result) {
  try {
    const arr = result.toArray ? result.toArray() : null;
    if (!arr) return calcFmt(result);
    if (!Array.isArray(arr[0])) {
      return '[' + arr.map(v => calcFmt(v)).join(', ') + ']';
    }
    return arr.map(row => '[' + row.map(v => calcFmt(v)).join(', ') + ']').join('\n');
  } catch {
    return String(result);
  }
}

function resetGraphZoom() {
    if(calcChartInstance) {
        calcChartInstance.resetZoom();
        if(typeof toast === 'function') toast('Zoom reset!', 'info');
    }
}
// ── MATH VISUAL INSERT (expression → visual notation → editor) ──────────────

function calcInsertVisual(i) {
  const inp = document.getElementById('calc-inp-' + i);
  const resEl = document.getElementById('calc-res-' + i);
  if (!inp) return;
  const expr = inp.value.trim();
  const result = resEl ? resEl.textContent : '';
  if (!expr) return;
  const html = mathToVisualHTML(expr, result);
  if (!html) {
    if(typeof toast === 'function') toast('Cannot render visual for this expression', 'warn');
    return;
  }
  const ed = document.getElementById('ed');
  if (!ed) return;
  ed.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    const frag = range.createContextualFragment(html + '\u00a0');
    range.insertNode(frag);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    ed.insertAdjacentHTML('beforeend', html + '\u00a0');
  }
  if(typeof toast === 'function') toast('Math inserted as visual notation ✓', 'success');
}

function mathToVisualHTML(expr, result) {
  const e = expr.trim();
  if (!document.getElementById('mv-styles')) injectMVStyles();

  // √ sqrt(x)
  const sqrtM = e.match(/^sqrt\((.+)\)$/i);
  if (sqrtM) return mvWrap(`<span class="mv-sqrt"><span class="mv-sqrt-sign">√</span><span class="mv-sqrt-bar">${mathArgToHTML(sqrtM[1])}</span></span>`, result);

  // ∛ cbrt(x)
  const cbrtM = e.match(/^cbrt\((.+)\)$/i);
  if (cbrtM) return mvWrap(`<span class="mv-sqrt"><span class="mv-sqrt-sign">∛</span><span class="mv-sqrt-bar">${mathArgToHTML(cbrtM[1])}</span></span>`, result);

  // ⁿ√ nthRoot(x,n) / root(x,n)
  const rootM = e.match(/^(?:nthRoot|root)\((.+),\s*(.+)\)$/i);
  if (rootM) return mvWrap(`<span class="mv-sqrt"><sup class="mv-nroot">${mathArgToHTML(rootM[2])}</sup><span class="mv-sqrt-sign">√</span><span class="mv-sqrt-bar">${mathArgToHTML(rootM[1])}</span></span>`, result);

  // frac(a,b)
  const fracM = e.match(/^frac\((.+),\s*(.+)\)$/i);
  if (fracM) return mvWrap(mvFrac(fracM[1], fracM[2]), result);

  // plain a/b  (no function calls, single slash)
  const slashM = e.match(/^([^/()+\-*^]+)\/([^/()+\-*^]+)$/);
  if (slashM) return mvWrap(mvFrac(slashM[1].trim(), slashM[2].trim()), result);

  // diff(f,x) → d/dx(f)
  const diffM = e.match(/^(?:diff|d\/d[a-z])\((.+),\s*([a-z])\)$/i);
  if (diffM) return mvWrap(
    `<span class="mv-deriv">${mvFrac('d','d'+diffM[2])}<span class="mv-paren">(${mathArgToHTML(diffM[1])})</span></span>`, result);

  // pdiff(f,x) → ∂/∂x(f)
  const pdM = e.match(/^pdiff\((.+),\s*([a-z])\)$/i);
  if (pdM) return mvWrap(
    `<span class="mv-deriv">${mvFrac('∂','∂'+pdM[2])}<span class="mv-paren">(${mathArgToHTML(pdM[1])})</span></span>`, result);

  // integrate(f,x) / integrate(f,x,a,b)
  const intM = e.match(/^(?:integrate|int)\((.+),\s*([a-z])(?:,\s*(.+?),\s*(.+?))?\)$/i);
  if (intM) {
    const lo = intM[3] ? mathArgToHTML(intM[3]) : '';
    const hi = intM[4] ? mathArgToHTML(intM[4]) : '';
    const limits = (lo||hi) ? `<span class="mv-int-limits"><sup>${hi}</sup><sub>${lo}</sub></span>` : '';
    return mvWrap(`<span class="mv-integral"><span class="mv-int-sign">∫</span>${limits}<span class="mv-int-body">${mathArgToHTML(intM[1])} d${intM[2]}</span></span>`, result);
  }

  // sum(expr,var,lo,hi)
  const sumM = e.match(/^sum\((.+),\s*([a-z]),\s*(.+?),\s*(.+?)\)$/i);
  if (sumM) return mvWrap(
    `<span class="mv-bigop"><span class="mv-bigop-sym">Σ</span><span class="mv-bigop-limits"><sup>${mathArgToHTML(sumM[4])}</sup><sub>${sumM[2]}=${mathArgToHTML(sumM[3])}</sub></span><span class="mv-bigop-body">${mathArgToHTML(sumM[1])}</span></span>`, result);

  // prod(expr,var,lo,hi)
  const prodM = e.match(/^prod\((.+),\s*([a-z]),\s*(.+?),\s*(.+?)\)$/i);
  if (prodM) return mvWrap(
    `<span class="mv-bigop"><span class="mv-bigop-sym">Π</span><span class="mv-bigop-limits"><sup>${mathArgToHTML(prodM[4])}</sup><sub>${prodM[2]}=${mathArgToHTML(prodM[3])}</sub></span><span class="mv-bigop-body">${mathArgToHTML(prodM[1])}</span></span>`, result);

  // lim(f,x,a)
  const limM = e.match(/^(?:lim|limit)\((.+),\s*([a-z]),\s*(.+)\)$/i);
  if (limM) return mvWrap(
    `<span class="mv-lim"><span class="mv-lim-word">lim</span><sub class="mv-lim-sub">${limM[2]}→${mathArgToHTML(limM[3])}</sub> ${mathArgToHTML(limM[1])}</span>`, result);

  // abs(x) → |x|
  const absM = e.match(/^abs\((.+)\)$/i);
  if (absM) return mvWrap(`<span class="mv-abs"><span class="mv-bar">|</span>${mathArgToHTML(absM[1])}<span class="mv-bar">|</span></span>`, result);

  // floor(x) → ⌊x⌋
  const floorM = e.match(/^floor\((.+)\)$/i);
  if (floorM) return mvWrap(`<span class="mv-abs"><span class="mv-bar">⌊</span>${mathArgToHTML(floorM[1])}<span class="mv-bar">⌋</span></span>`, result);

  // ceil(x) → ⌈x⌉
  const ceilM = e.match(/^ceil\((.+)\)$/i);
  if (ceilM) return mvWrap(`<span class="mv-abs"><span class="mv-bar">⌈</span>${mathArgToHTML(ceilM[1])}<span class="mv-bar">⌉</span></span>`, result);

  // log(x,b) → log_b(x)
  const logbM = e.match(/^log\((.+),\s*(.+)\)$/i);
  if (logbM) return mvWrap(`<span class="mv-func">log<sub>${mathArgToHTML(logbM[2])}</sub>(${mathArgToHTML(logbM[1])})</span>`, result);

  const lnM = e.match(/^ln\((.+)\)$/i);
  if (lnM) return mvWrap(`<span class="mv-func">ln(${mathArgToHTML(lnM[1])})</span>`, result);

  // trig
  const trigM = e.match(/^(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|asin|acos|atan)\((.+)\)$/i);
  if (trigM) return mvWrap(`<span class="mv-func">${trigM[1].toLowerCase()}(${mathArgToHTML(trigM[2])})</span>`, result);

  // matrix [[...]]
  if (e.includes('[[')) {
    const varPre = e.includes('=') ? e.split('=')[0].trim() : '';
    const matPart = e.includes('=') ? e.split('=').slice(1).join('=').trim() : e;
    try {
      const clean = matPart.replace(/^\[|\]$/g,'');
      const rowStrs = clean.split('],[');
      const rows = rowStrs.map(r => r.replace(/[\[\]]/g,'').split(',')
        .map(v => `<td class="mv-mtd">${mathArgToHTML(v.trim())}</td>`).join(''));
      const tbl = `<table class="mv-matrix"><tbody>${rows.map(r=>`<tr>${r}</tr>`).join('')}</tbody></table>`;
      return mvWrap(`<span class="mv-matrix-wrap">${varPre ? `<span class="mv-func">${escMV(varPre)} = </span>` : ''}${tbl}</span>`, result);
    } catch(err) {}
  }

  // x^n power  (simple, no function prefix)
  const powM = e.match(/^(.+?)\^(.+)$/);
  if (powM && !e.match(/^[a-z]+\(/i)) {
    return mvWrap(`${mathArgToHTML(powM[1])}<sup class="mv-sup">${mathArgToHTML(powM[2])}</sup>`, result);
  }

  // variable assignment: x = expr = result
  const assignM = e.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
  if (assignM && result && result !== '—' && result !== 'Error') {
    return mvWrap(`<var class="mv-var">${escMV(assignM[1])}</var> = ${mathArgToHTML(assignM[2])} = <span class="mv-result">${escMV(result)}</span>`, result);
  }

  // plain: expr = result
  if (result && result !== '—' && result !== 'Error' && result !== 'fn saved') {
    return mvWrap(`${mathArgToHTML(e)} = <span class="mv-result">${escMV(result)}</span>`, result);
  }

  return null;
}

function mathArgToHTML(s) {
  if (!s) return '';
  s = s.trim();
  s = s.replace(/sqrt\(([^)]+)\)/gi, (_, inner) =>
    `<span class="mv-sqrt-i"><span class="mv-sqrt-sign">√</span><span class="mv-sqrt-bar">${escMV(inner)}</span></span>`);
  s = s.replace(/([a-zA-Z0-9_.]+)\^([a-zA-Z0-9_.]+)/g, (_, b, ex) =>
    `${escMV(b)}<sup class="mv-sup">${escMV(ex)}</sup>`);
  s = s.replace(/\bpi\b/gi,'π').replace(/\btheta\b/gi,'θ').replace(/\balpha\b/gi,'α')
       .replace(/\bbeta\b/gi,'β').replace(/\bgamma\b/gi,'γ').replace(/\bdelta\b/gi,'δ')
       .replace(/\blambda\b/gi,'λ').replace(/\binfinity\b/gi,'∞').replace(/Infinity/g,'∞');
  return s;
}

function mvFrac(num, den) {
  return `<span class="mv-frac"><span class="mv-num">${mathArgToHTML(String(num))}</span><span class="mv-den">${mathArgToHTML(String(den))}</span></span>`;
}

function mvWrap(inner, result) {
  return `<span class="mv-block" contenteditable="false">${inner}</span>`;
}

function escMV(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function injectMVStyles() {
  const s = document.createElement('style');
  s.id = 'mv-styles';
  s.textContent = `
    .mv-block {
      display: inline-flex; align-items: center;
      font-family: 'JetBrains Mono','STIX Two Math',monospace;
      font-size: 1em; color: var(--accent,#a78bfa);
      background: rgba(167,139,250,0.07);
      border: 1px solid rgba(167,139,250,0.22);
      border-radius: 5px; padding: 1px 7px; margin: 0 2px;
      vertical-align: middle; user-select: all; cursor: default; gap: 1px;
    }
    .mv-block:hover { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.45); }
    .mv-sqrt { display:inline-flex; align-items:center; }
    .mv-sqrt-sign { font-size:1.15em; line-height:1; padding-right:1px; }
    .mv-sqrt-bar { border-top:1.5px solid currentColor; padding:0 3px; display:inline-block; }
    .mv-sqrt-i { display:inline-flex; align-items:center; font-size:0.88em; }
    .mv-nroot { font-size:0.58em; vertical-align:super; color:var(--accent2,#34d399); }
    .mv-frac { display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; margin:0 2px; }
    .mv-num { border-bottom:1.5px solid currentColor; padding:0 5px; font-size:0.86em; line-height:1.35; text-align:center; }
    .mv-den { padding:0 5px; font-size:0.86em; line-height:1.35; text-align:center; }
    .mv-deriv { display:inline-flex; align-items:center; gap:2px; }
    .mv-paren { color:var(--muted,#888); }
    .mv-integral { display:inline-flex; align-items:center; gap:2px; }
    .mv-int-sign { font-size:1.65em; line-height:1; }
    .mv-int-limits { display:inline-flex; flex-direction:column; font-size:0.63em; line-height:1.15; color:var(--accent2,#34d399); }
    .mv-int-body { display:inline-flex; align-items:center; }
    .mv-bigop { display:inline-flex; align-items:center; gap:3px; }
    .mv-bigop-sym { font-size:1.5em; line-height:1; }
    .mv-bigop-limits { display:inline-flex; flex-direction:column; font-size:0.6em; line-height:1.2; color:var(--accent2,#34d399); }
    .mv-bigop-body { font-size:0.95em; }
    .mv-lim { display:inline-flex; align-items:baseline; gap:2px; }
    .mv-lim-word { font-style:italic; }
    .mv-lim-sub { font-size:0.65em; color:var(--muted,#888); }
    .mv-abs { display:inline-flex; align-items:center; }
    .mv-bar { font-size:1.2em; }
    .mv-matrix-wrap { display:inline-flex; align-items:center; gap:5px; }
    .mv-matrix { border-collapse:collapse; border-left:2.5px solid var(--accent,#a78bfa); border-right:2.5px solid var(--accent,#a78bfa); }
    .mv-mtd { padding:1px 7px; font-size:0.84em; text-align:center; color:var(--text,#e2e8f0); }
    .mv-sup { font-size:0.68em; vertical-align:super; color:var(--accent2,#34d399); }
    .mv-result { color:var(--accent2,#34d399); font-weight:700; }
    .mv-var { font-style:italic; color:var(--accent,#a78bfa); }
    .mv-func { color:var(--accent,#a78bfa); font-style:italic; }
    .calc-vis-btn {
      background: rgba(167,139,250,0.1); border:1px solid rgba(167,139,250,0.3);
      color:#a78bfa; border-radius:5px; padding:3px 7px; font-size:10px;
      cursor:pointer; font-family:'JetBrains Mono',monospace; font-weight:700;
      white-space:nowrap; transition:all .15s; display:none; align-items:center; gap:3px;
    }
    .calc-vis-btn:hover { background:rgba(167,139,250,0.25); border-color:#a78bfa; }
    .calc-vis-btn.visible { display:inline-flex; }
  `;
  document.head.appendChild(s);
}
