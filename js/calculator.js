// ============================================================
// CALCULATOR PANEL - WITH CUSTOM FUNCTIONS & GRAPHING
// ============================================================

const calcVars = {};
let calcRowCount = 0;
let calcChartInstance = null;
let graphRange = { xMin: -20, xMax: 20, yMin: null, yMax: null };
let graphExpressions = [];
let _graphRafId = null;

function _graphGeneratePoints(compiledCode) {
    const { xMin, xMax } = graphRange;
    const N = 400;
    const step = (xMax - xMin) / N;
    const pts = [];
    const scope = Object.assign({}, calcVars);
    for (let i = 0; i <= N; i++) {
        scope.x = xMin + i * step;
        try {
            const y = compiledCode.evaluate(scope);
            if (typeof y === 'number' && isFinite(y)) pts.push({ x: scope.x, y });
        } catch(e) {}
    }
    return pts;
}

function _graphBuildOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        parsing: false,
        normalized: true,
        scales: {
            x: {
                type: 'linear', position: 'bottom',
                min: graphRange.xMin, max: graphRange.xMax,
                grid: { color: 'rgba(255,255,255,0.07)' },
                ticks: { color: '#888', maxTicksLimit: 10, callback: v => +v.toFixed(2) },
                border: { color: 'rgba(255,255,255,0.2)' }
            },
            y: {
                type: 'linear', position: 'left',
                ...(graphRange.yMin !== null ? { min: graphRange.yMin } : {}),
                ...(graphRange.yMax !== null ? { max: graphRange.yMax } : {}),
                grid: { color: 'rgba(255,255,255,0.07)' },
                ticks: { color: '#888', maxTicksLimit: 8, callback: v => +v.toFixed(2) },
                border: { color: 'rgba(255,255,255,0.2)' }
            }
        },
        plugins: {
            legend: { labels: { color: '#e2e8f0', font: { family: "'JetBrains Mono',monospace", size: 11 } } },
            tooltip: {
                mode: 'index', intersect: false,
                callbacks: {
                    title: items => 'x = ' + (+items[0].parsed.x.toFixed(4)),
                    label: item  => item.dataset.label.split('=')[0].trim() + ' = ' + (+item.parsed.y.toFixed(6))
                }
            },
            zoom: {
                zoom: { wheel: { enabled: true, speed: 0.1 }, pinch: { enabled: true }, mode: 'xy', onZoomComplete: _graphOnViewChange },
                pan:  { enabled: true, mode: 'xy', threshold: 5, onPanComplete: _graphOnViewChange }
            }
        }
    };
}

function _graphRefreshAllData() {
    if (!calcChartInstance) return;
    calcChartInstance.data.datasets.forEach((ds, idx) => {
        if (graphExpressions[idx]) ds.data = _graphGeneratePoints(graphExpressions[idx].compiledCode);
    });
    const opts = calcChartInstance.options;
    opts.scales.x.min = graphRange.xMin;
    opts.scales.x.max = graphRange.xMax;
    if (graphRange.yMin !== null) opts.scales.y.min = graphRange.yMin;
    else delete opts.scales.y.min;
    if (graphRange.yMax !== null) opts.scales.y.max = graphRange.yMax;
    else delete opts.scales.y.max;
    calcChartInstance.update('none');
    _graphSyncInputs();
}

function _graphSyncInputs() {
    const s = (id, v) => { const el=document.getElementById(id); if(el && document.activeElement!==el) el.value=(v??''); };
    s('graph-xmin', graphRange.xMin); s('graph-xmax', graphRange.xMax);
    s('graph-ymin', graphRange.yMin??''); s('graph-ymax', graphRange.yMax??'');
}

function graphApplyRange() {
    const g = id => document.getElementById(id)?.value.trim();
    const xn=parseFloat(g('graph-xmin')), xx=parseFloat(g('graph-xmax'));
    if (!isNaN(xn)&&!isNaN(xx)&&xn<xx) { graphRange.xMin=xn; graphRange.xMax=xx; }
    const yn=g('graph-ymin'), yx=g('graph-ymax');
    graphRange.yMin=(yn!==''&&!isNaN(+yn))?+yn:null;
    graphRange.yMax=(yx!==''&&!isNaN(+yx))?+yx:null;
    _graphRefreshAllData();
}

function _graphOnViewChange({ chart }) {
    if (_graphRafId) cancelAnimationFrame(_graphRafId);
    _graphRafId = requestAnimationFrame(() => {
        graphRange.xMin = chart.scales.x.min;
        graphRange.xMax = chart.scales.x.max;
        if (graphRange.yMin !== null || graphRange.yMax !== null) {
            graphRange.yMin = chart.scales.y.min;
            graphRange.yMax = chart.scales.y.max;
        }
        chart.data.datasets.forEach((ds, idx) => {
            if (graphExpressions[idx]) ds.data = _graphGeneratePoints(graphExpressions[idx].compiledCode);
        });
        chart.update('none');
        _graphSyncInputs();
        _graphRafId = null;
    });
}

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

  // ── LaTeX input detection + evaluation ──
  if (val.includes('\\')) {
    // 1) Try special forms: \sum, \prod, \int, \frac{d}{dx}
    let evaluated = null;
    let rawResult = null;
    const special = evalLatexSpecial(val, calcVars);
    if (special !== null) {
      rawResult = special;
      evaluated = calcFmt(special);
    }
    // 2) Fallback: general latexToMathJS conversion
    if (evaluated === null) {
      const mathExpr = latexToMathJS(val);
      if (mathExpr) {
        try {
          rawResult = math.evaluate(mathExpr, calcVars);
          evaluated = calcFmt(rawResult);
          // Variable assignment
          if (val.includes('=') && val.split('=')[0].trim()) {
            const varName = val.split('=')[0].trim().replace(/\\/g,'');
            if (/^[a-zA-Z_]\w*$/.test(varName)) {
              calcVars[varName] = rawResult;
              calcRenderBadges();
            }
          }
        } catch(e) { evaluated = null; }
      }
    }

    // Result display: numeric answer + visual preview side by side
    resEl.innerHTML = '';
    resEl.className = 'calc-res ok sym';

    if (evaluated !== null) {
      // Numeric answer (green, bold)
      const numSpan = document.createElement('span');
      numSpan.textContent = evaluated;
      numSpan.style.cssText = 'color:var(--accent2,#34d399); font-weight:700; margin-right:8px; font-size:1em;';
      resEl.appendChild(numSpan);
    }

    // Visual LaTeX preview
    const ltxHTML = latexToVisualHTML(val);
    if (ltxHTML) {
      const previewSpan = document.createElement('span');
      previewSpan.innerHTML = ltxHTML;
      previewSpan.style.cssText = 'font-size:0.88em; opacity:0.7;';
      resEl.appendChild(previewSpan);
    }

    if (!evaluated && !ltxHTML) {
      resEl.textContent = 'Error';
      resEl.className = 'calc-res err';
    }

    const ins = document.getElementById('calc-ins-' + i);
    if (ins) {
      if (evaluated !== null) {
        ins.dataset.val = evaluated;
        ins.style.display = 'flex';
      } else {
        ins.style.display = 'none';
      }
    }
    const visS = document.getElementById('calc-vis-' + i);
    if (visS) visS.classList.add('visible');
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

    const COLORS = ['#a78bfa','#34d399','#f87171','#60a5fa','#fbbf24','#f472b6',
        '#38bdf8','#4ade80','#fb923c','#e879f9','#a3e635','#22d3ee',
        '#f43f5e','#818cf8','#2dd4bf','#facc15','#c084fc','#86efac'];

    let canvasWrap = document.getElementById('graphCanvasWrap');
    if(!canvasWrap) {
        canvasWrap = document.createElement('div');
        canvasWrap.id = 'graphCanvasWrap';
        canvasWrap.style.cssText = 'width:100%;padding:8px 10px;background:var(--surf2);border-radius:8px;margin-top:15px;border:1px solid var(--border);box-sizing:border-box;';

        // ── Range bar ──
        const rangeBar = document.createElement('div');
        rangeBar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-bottom:7px;';

        const mkInp = (id, ph, title) => {
            const el = document.createElement('input');
            el.id=id; el.type='number'; el.placeholder=ph; el.title=title; el.step='any';
            el.style.cssText='width:68px;background:var(--surf,#1e1e2e);color:var(--fg,#e2e8f0);border:1px solid var(--border,#333);border-radius:5px;padding:3px 5px;font-size:11px;font-family:JetBrains Mono,monospace;box-sizing:border-box;';
            el.addEventListener('keydown', e => { if(e.key==='Enter') graphApplyRange(); });
            return el;
        };
        const mkLbl = t => { const s=document.createElement('span'); s.textContent=t; s.style.cssText='font-size:10px;color:var(--muted,#888);font-family:JetBrains Mono,monospace;'; return s; };

        rangeBar.append(
            mkLbl('x:'), mkInp('graph-xmin','xMin','X min'), mkLbl('→'), mkInp('graph-xmax','xMax','X max'),
            mkLbl(' y:'), mkInp('graph-ymin','yMin (auto)','Y min (blank=auto)'), mkLbl('→'), mkInp('graph-ymax','yMax (auto)','Y max (blank=auto)')
        );

        const applyBtn = document.createElement('button');
        applyBtn.textContent='↵ Apply'; applyBtn.className='hbtn'; applyBtn.style.cssText='font-size:10px;padding:3px 8px;';
        applyBtn.onclick = graphApplyRange;

        const resetBtn = document.createElement('button');
        resetBtn.textContent='⟳'; resetBtn.className='hbtn'; resetBtn.title='Reset range'; resetBtn.style.cssText='font-size:12px;padding:2px 7px;';
        resetBtn.onclick = () => { graphRange={xMin:-20,xMax:20,yMin:null,yMax:null}; _graphRefreshAllData(); if(calcChartInstance) calcChartInstance.resetZoom(); };

        const fsBtn = document.createElement('button');
        fsBtn.innerHTML='⛶'; fsBtn.className='hbtn'; fsBtn.title='Fullscreen'; fsBtn.style.cssText='font-size:14px;padding:2px 7px;margin-left:auto;';
        fsBtn.onclick = toggleGraphFullscreen;

        const closeBtn = document.createElement('button');
        closeBtn.textContent='✕'; closeBtn.className='hbtn'; closeBtn.title='Clear graph'; closeBtn.style.cssText='font-size:11px;';
        closeBtn.onclick = hideGraph;

        rangeBar.append(applyBtn, resetBtn, fsBtn, closeBtn);
        canvasWrap.appendChild(rangeBar);

        const canvasBox = document.createElement('div');
        canvasBox.style.cssText='position:relative;height:300px;';
        const canvas = document.createElement('canvas');
        canvas.id = 'graphCanvas';
        canvasBox.appendChild(canvas);
        canvasWrap.appendChild(canvasBox);
        document.getElementById('calc-rows').after(canvasWrap);
    }
    canvasWrap.style.display = 'block';

    try {
        let cleanExpr = inp.toLowerCase().replace(/(\d)(x)/gi, '$1*$2');
        const compiledCode = math.compile(cleanExpr);
        const dataPoints = _graphGeneratePoints(compiledCode);

        const newDataset = {
            label: 'f(x) = ' + inp,
            data: dataPoints,
            borderColor: COLORS[(calcChartInstance ? calcChartInstance.data.datasets.length : 0) % COLORS.length],
            backgroundColor: 'transparent',
            borderWidth: 2, fill: false, tension: 0,
            pointRadius: 0, pointHoverRadius: 4, spanGaps: false,
        };

        graphExpressions.push({ expr: inp, compiledCode });

        if(calcChartInstance) {
            calcChartInstance.data.datasets.push(newDataset);
            calcChartInstance.update('none');
            if(typeof toast === 'function') toast('Added: f(x) = ' + inp, 'success');
        } else {
            calcChartInstance = new Chart(
                document.getElementById('graphCanvas').getContext('2d'),
                { type: 'line', data: { datasets: [newDataset] }, options: _graphBuildOptions() }
            );
            if(typeof toast === 'function') toast('Graph drawn!', 'success');
        }
        _graphSyncInputs();

    } catch(e) {
        if(typeof toast === 'function') toast('Cannot draw graph. Check expression.', 'error');
    }
}

function hideGraph() {
    const canvasWrap = document.getElementById('graphCanvasWrap');
    if(canvasWrap) {
        canvasWrap.style.display = 'none';
        if(calcChartInstance){ calcChartInstance.destroy(); calcChartInstance = null; }
        graphExpressions = [];
        graphRange = { xMin: -20, xMax: 20, yMin: null, yMax: null };
        if(_graphRafId){ cancelAnimationFrame(_graphRafId); _graphRafId = null; }
        if(typeof toast === 'function') toast('Graph cleared', 'info');
    }
}

// ── GRAPH FULLSCREEN ──────────────────────────────────────────────────────

// Rebuild chart on a given canvas element, reusing current datasets + options
function _graphRebuildOn(canvasEl) {
    const datasets = calcChartInstance ? calcChartInstance.data.datasets.slice() : [];
    if(calcChartInstance){ calcChartInstance.destroy(); calcChartInstance = null; }
    calcChartInstance = new Chart(canvasEl.getContext('2d'), {
        type: 'line',
        data: { datasets },
        options: _graphBuildOptions()
    });
}

function toggleGraphFullscreen() {
    const wrap = document.getElementById('graphCanvasWrap');
    if (!wrap) return;

    let overlay = document.getElementById('graphFullscreenOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'graphFullscreenOverlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0d0d14;display:flex;flex-direction:column;padding:12px 16px;box-sizing:border-box;gap:8px;';

        // ── Header ──
        const hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:6px;flex-shrink:0;';

        const title = document.createElement('span');
        title.textContent = '📈 Graph';
        title.style.cssText = 'color:var(--accent,#a78bfa);font-family:JetBrains Mono,monospace;font-size:13px;font-weight:700;letter-spacing:1px;margin-right:6px;';

        // Range inputs (mirrored — same ids, same graphApplyRange fn)
        const mkInp = (id, ph, tip) => {
            const el = document.createElement('input');
            el.id=id+'_fs'; el.type='number'; el.placeholder=ph; el.title=tip; el.step='any';
            el.style.cssText='width:68px;background:var(--surf,#1e1e2e);color:var(--fg,#e2e8f0);border:1px solid var(--border,#333);border-radius:5px;padding:3px 5px;font-size:11px;font-family:JetBrains Mono,monospace;box-sizing:border-box;';
            el.addEventListener('keydown', e => { if(e.key==='Enter') _graphApplyRangeFs(); });
            return el;
        };
        const mkLbl = t => { const s=document.createElement('span'); s.textContent=t; s.style.cssText='font-size:10px;color:var(--muted,#888);font-family:JetBrains Mono,monospace;'; return s; };

        const applyBtn = document.createElement('button');
        applyBtn.textContent='↵ Apply'; applyBtn.className='hbtn'; applyBtn.style.cssText='font-size:10px;padding:3px 8px;';
        applyBtn.onclick = _graphApplyRangeFs;

        const resetBtn = document.createElement('button');
        resetBtn.textContent='⟳ Reset'; resetBtn.className='hbtn'; resetBtn.style.cssText='font-size:10px;';
        resetBtn.onclick = () => { graphRange={xMin:-20,xMax:20,yMin:null,yMax:null}; _graphRefreshAllData(); _graphSyncFsInputs(); if(calcChartInstance) calcChartInstance.resetZoom(); };

        const exitBtn = document.createElement('button');
        exitBtn.textContent='✕ Exit'; exitBtn.className='hbtn'; exitBtn.style.cssText='font-size:11px;margin-left:auto;';
        exitBtn.onclick = exitGraphFullscreen;

        hdr.append(title,
            mkLbl('x:'), mkInp('graph-xmin','xMin','X min'), mkLbl('→'), mkInp('graph-xmax','xMax','X max'),
            mkLbl(' y:'), mkInp('graph-ymin','yMin(auto)','Y min'), mkLbl('→'), mkInp('graph-ymax','yMax(auto)','Y max'),
            applyBtn, resetBtn, exitBtn
        );
        overlay.appendChild(hdr);

        // ── Canvas area ──
        const fsWrap = document.createElement('div');
        fsWrap.id = 'graphFsCanvasWrap';
        fsWrap.style.cssText = 'flex:1;position:relative;min-height:0;';
        overlay.appendChild(fsWrap);

        document.body.appendChild(overlay);
    }

    overlay.style.display = 'flex';

    // Rebuild chart on fullscreen canvas
    const fsWrap = document.getElementById('graphFsCanvasWrap');
    fsWrap.innerHTML = '';
    const fsCanvas = document.createElement('canvas');
    fsCanvas.id = 'graphCanvasFs';
    fsWrap.appendChild(fsCanvas);
    _graphRebuildOn(fsCanvas);

    _graphSyncFsInputs();

    // Esc to exit
    overlay._escHandler = e => { if(e.key==='Escape') exitGraphFullscreen(); };
    document.addEventListener('keydown', overlay._escHandler);
    if(typeof toast === 'function') toast('Fullscreen — Esc to exit', 'info');
}

// Sync the _fs input fields from current graphRange
function _graphSyncFsInputs() {
    const s = (id, v) => { const el=document.getElementById(id+'_fs'); if(el && document.activeElement!==el) el.value=(v??''); };
    s('graph-xmin', graphRange.xMin); s('graph-xmax', graphRange.xMax);
    s('graph-ymin', graphRange.yMin??''); s('graph-ymax', graphRange.yMax??'');
}

// Apply range from fullscreen inputs
function _graphApplyRangeFs() {
    const g = id => document.getElementById(id+'_fs')?.value.trim();
    const xn=parseFloat(g('graph-xmin')), xx=parseFloat(g('graph-xmax'));
    if(!isNaN(xn)&&!isNaN(xx)&&xn<xx){ graphRange.xMin=xn; graphRange.xMax=xx; }
    const yn=g('graph-ymin'), yx=g('graph-ymax');
    graphRange.yMin=(yn!==''&&!isNaN(+yn))?+yn:null;
    graphRange.yMax=(yx!==''&&!isNaN(+yx))?+yx:null;
    _graphRefreshAllData();
    _graphSyncInputs(); // also sync the normal bar
}

function exitGraphFullscreen() {
    const overlay = document.getElementById('graphFullscreenOverlay');
    if(overlay){
        overlay.style.display = 'none';
        if(overlay._escHandler){ document.removeEventListener('keydown', overlay._escHandler); overlay._escHandler=null; }
    }

    // Restore chart back onto the normal canvas
    const normalCanvas = document.getElementById('graphCanvas');
    if(normalCanvas) {
        _graphRebuildOn(normalCanvas);
        _graphSyncInputs();
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
  const result = resEl ? (resEl.textContent || '') : '';
  if (!expr) return;
  // LaTeX input නම් directly render කිරීම
  const html = expr.includes('\\')
    ? (() => { const h = latexToVisualHTML(expr); return h ? mvWrap(h, result) : null; })()
    : mathToVisualHTML(expr, result);
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


// ── LATEX SPECIAL EVALUATOR (sum, prod, int, diff) ──────────────────────────

function evalLatexSpecial(latex, scope) {
  const s = latex.trim();

  // ── \sum / \prod ──
  const sumM = s.match(/^\\(sum|prod)\s*_\{([a-zA-Z]+)\s*=\s*([^}]+)\}\s*\^\{([^}]+)\}\s*([\s\S]+)$/i)
             || s.match(/^\\(sum|prod)\s*\^\{([^}]+)\}\s*_\{([a-zA-Z]+)\s*=\s*([^}]+)\}\s*([\s\S]+)$/i);
  if (sumM) {
    const op = sumM[1].toLowerCase();
    let ivar, loTex, hiTex, bodyTex;
    if (s.match(/^\\(sum|prod)\s*_/i)) {
      ivar=sumM[2]; loTex=sumM[3]; hiTex=sumM[4]; bodyTex=sumM[5];
    } else {
      hiTex=sumM[2]; ivar=sumM[3]; loTex=sumM[4]; bodyTex=sumM[5];
    }
    ivar = ivar.trim();
    let lo, hi;
    try {
      lo = Math.round(math.evaluate(latexToMathJS(loTex)||loTex, scope));
      hi = Math.round(math.evaluate(latexToMathJS(hiTex)||hiTex, scope));
    } catch(e) { return null; }
    if (!Number.isFinite(lo)||!Number.isFinite(hi)||Math.abs(hi-lo)>1e5) return null;
    const bodyMJ = latexToMathJS(bodyTex) || bodyTex;
    let acc = op==='prod' ? 1 : 0;
    try {
      for (let k=lo; k<=hi; k++) {
        const v = math.evaluate(bodyMJ, {...scope, [ivar]:k});
        if (!Number.isFinite(v)) return null;
        op==='prod' ? (acc*=v) : (acc+=v);
      }
    } catch(e) { return null; }
    return acc;
  }

  // ── \int_{a}^{b} f(x) dx  (5-point Gauss-Legendre) ──
  const intM = s.match(/^\\int\s*_\{([^}]+)\}\s*\^\{([^}]+)\}\s*([\s\S]+?)\s*(?:\\[,;]?\s*)?d([a-zA-Z])\s*$/i)
             || s.match(/^\\int\s*\^\{([^}]+)\}\s*_\{([^}]+)\}\s*([\s\S]+?)\s*(?:\\[,;]?\s*)?d([a-zA-Z])\s*$/i);
  if (intM) {
    let loTex, hiTex, bodyTex, ivar;
    if (s.match(/^\\int\s*_/i)) {
      loTex=intM[1]; hiTex=intM[2]; bodyTex=intM[3]; ivar=intM[4];
    } else {
      hiTex=intM[1]; loTex=intM[2]; bodyTex=intM[3]; ivar=intM[4];
    }
    let a, b;
    try {
      a = math.evaluate(latexToMathJS(loTex)||loTex, scope);
      b = math.evaluate(latexToMathJS(hiTex)||hiTex, scope);
    } catch(e) { return null; }
    if (!Number.isFinite(a)||!Number.isFinite(b)) return null;
    const bodyMJ = latexToMathJS(bodyTex) || bodyTex;
    // 5-point Gauss-Legendre nodes & weights
    const GL = [
      {t:-0.9061798459,w:0.2369268851},{t:-0.5384693101,w:0.4786286705},
      {t:0.0,w:0.5688888889},{t:0.5384693101,w:0.4786286705},{t:0.9061798459,w:0.2369268851}
    ];
    try {
      let result=0;
      const mid=(a+b)/2, half=(b-a)/2;
      for (const {t,w} of GL) {
        const x = mid+half*t;
        const fx = math.evaluate(bodyMJ, {...scope, [ivar]:x});
        if (!Number.isFinite(fx)) return null;
        result += w*fx;
      }
      return result*half;
    } catch(e) { return null; }
  }

  // ── \frac{d}{dx} f(x)  or  \frac{d^n}{dx^n} f(x) ──
  // Central difference — needs variable value in scope
  const diffM = s.match(/^\\frac\{d\}\{d([a-zA-Z])\}\s*([\s\S]+)$/i)
             || s.match(/^\\frac\{d\^(\d+)\}\{d([a-zA-Z])\^\d+\}\s*([\s\S]+)$/i);
  if (diffM) {
    let ivar, bodyTex, order=1;
    if (s.match(/^\\frac\{d\}\{d[a-zA-Z]\}/i)) {
      ivar=diffM[1]; bodyTex=diffM[2];
    } else {
      order=parseInt(diffM[1])||1; ivar=diffM[2]; bodyTex=diffM[3];
    }
    const xVal = scope[ivar];
    if (xVal===undefined||!Number.isFinite(Number(xVal))) return null;
    const x0=Number(xVal), h=1e-5;
    const bodyMJ = latexToMathJS(bodyTex)||bodyTex;
    try {
      const f = x => math.evaluate(bodyMJ, {...scope,[ivar]:x});
      let result;
      if (order===1)      result = (f(x0+h)-f(x0-h))/(2*h);
      else if (order===2) result = (f(x0+h)-2*f(x0)+f(x0-h))/(h*h);
      else return null;
      return Number.isFinite(result) ? result : null;
    } catch(e) { return null; }
  }

  return null;
}

// ── LATEX → MATHJS CONVERTER ────────────────────────────────────────────────
function latexToMathJS(latex) {
  if (!latex || !latex.includes("\\")) return null;
  let s = latex.trim();
  s = s.replace(/\\left\s*\(/g,"(").replace(/\\right\s*\)/g,")")
       .replace(/\\left\s*\[/g,"[").replace(/\\right\s*\]/g,"]");
  for (let pass = 0; pass < 8; pass++)
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]*)\}/g, "nthRoot($2,$1)");
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)");
  s = s.replace(/\\sqrt\s*([a-zA-Z0-9])/g, "sqrt($1)");
  s = s.replace(/\\cdot/g,"*").replace(/\\times/g,"*").replace(/\\div/g,"/");
  s = s.replace(/\\pm/g,"+");
  s = s.replace(/\^\{([^{}]+)\}/g, "^($1)");
  s = s.replace(/_\{[^{}]*\}/g,"").replace(/_[a-zA-Z0-9]/g,"");
  const greekMap={alpha:"alpha",beta:"beta",gamma:"gamma",delta:"delta",epsilon:"e",theta:"theta",lambda:"lambda",mu:"mu",pi:"pi",sigma:"sigma",omega:"omega",infty:"Infinity",infinity:"Infinity",partial:"",nabla:""};
  const fns=["sin","cos","tan","sec","csc","cot","sinh","cosh","tanh","arcsin","arccos","arctan","ln","log","exp","abs","floor","ceil"];
  s = s.replace(/\\([a-zA-Z]+)/g, (_,name) => { if(greekMap[name]!==undefined) return greekMap[name]; if(fns.includes(name.toLowerCase())) return name.toLowerCase(); return ""; });
  s = s.replace(/\{([^{}]*)\}/g, "($1)");
  s = s.replace(/\s+/g," ").trim().replace(/^[+*/]|[+*/]$/g,"").trim();
  if (!s || s.length < 1) return null;
  return s;
}

// ── LATEX PARSER → VISUAL HTML ──────────────────────────────────────────────
// Converts LaTeX strings like \frac{a}{b}, \sum_{i=0}^n into visual HTML.
// Returns null if input doesn't look like LaTeX.

function latexToVisualHTML(latex) {
  let s = latex.trim();
  if (!s.includes('\\')) return null; // LaTeX නෙමෙයි නම් skip

  // Outer \left( ... \right) / \left[ ... \right] brackets strip
  s = s.replace(/\\left\s*\(/g, '(').replace(/\\right\s*\)/g, ')')
       .replace(/\\left\s*\[/g, '[').replace(/\\right\s*\]/g, ']')
       .replace(/\\left\s*\|/g, '|').replace(/\\right\s*\|/g, '|');

  return ltxNode(s);
}

// Recursively parse a LaTeX string into HTML
function ltxNode(s) {
  s = s.trim();
  if (!s) return '';

  // ── \frac{num}{den} ──
  s = s.replace(/\\frac\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\})\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\})/g, (_, n, d) => {
    const num = ltxNode(ltxUnbrace(n));
    const den = ltxNode(ltxUnbrace(d));
    return `<span class="mv-frac"><span class="mv-num">${num}</span><span class="mv-den">${den}</span></span>`;
  });

  // ── \sqrt{x} ──
  s = s.replace(/\\sqrt\s*(\{[^{}]*\})/g, (_, inner) =>
    `<span class="mv-sqrt"><span class="mv-sqrt-sign">√</span><span class="mv-sqrt-bar">${ltxNode(ltxUnbrace(inner))}</span></span>`);

  // ── \sqrt[n]{x} ──
  s = s.replace(/\\sqrt\s*\[([^\]]+)\]\s*(\{[^{}]*\})/g, (_, n, inner) =>
    `<span class="mv-sqrt"><sup class="mv-nroot">${ltxNode(n)}</sup><span class="mv-sqrt-sign">√</span><span class="mv-sqrt-bar">${ltxNode(ltxUnbrace(inner))}</span></span>`);

  // ── \sum / \prod with _{lo}^{hi} or ^{hi}_{lo} (stacked limits) ──
  s = s.replace(/\\(sum|prod)\s*(?:_(\{[^{}]*\}|[^_\^{}\s]))?(?:\^(\{[^{}]*\}|[^_\^{}\s]))?/g, (_, op, sub, sup) => {
    const sym = op === 'sum' ? 'Σ' : 'Π';
    const lo  = sub ? ltxNode(ltxUnbrace(sub)) : '';
    const hi  = sup ? ltxNode(ltxUnbrace(sup)) : '';
    const limits = (lo || hi)
      ? `<span class="mv-bigop-limits"><sup>${hi}</sup><sub>${lo}</sub></span>` : '';
    return `<span class="mv-bigop"><span class="mv-bigop-sym">${sym}</span>${limits}</span>`;
  });
  // Also handle reversed ^{hi}_{lo}
  s = s.replace(/\\(sum|prod)\s*(?:\^(\{[^{}]*\}|[^_\^{}\s]))?(?:_(\{[^{}]*\}|[^_\^{}\s]))?/g, (_, op, sup, sub) => {
    // already replaced above if both present; only fires if not yet replaced
    if (!_.includes('mv-bigop')) {
      const sym = op === 'sum' ? 'Σ' : 'Π';
      const lo  = sub ? ltxNode(ltxUnbrace(sub)) : '';
      const hi  = sup ? ltxNode(ltxUnbrace(sup)) : '';
      const limits = (lo || hi)
        ? `<span class="mv-bigop-limits"><sup>${hi}</sup><sub>${lo}</sub></span>` : '';
      return `<span class="mv-bigop"><span class="mv-bigop-sym">${sym}</span>${limits}</span>`;
    }
    return _;
  });

  // ── \int / \iint / \iiint with limits ──
  s = s.replace(/\\(iiint|iint|int)\s*(?:_(\{[^{}]*\}|[^_\^{}\s]))?(?:\^(\{[^{}]*\}|[^_\^{}\s]))?/g, (_, op, sub, sup) => {
    const sym = op === 'iiint' ? '∭' : op === 'iint' ? '∬' : '∫';
    const lo = sub ? ltxNode(ltxUnbrace(sub)) : '';
    const hi = sup ? ltxNode(ltxUnbrace(sup)) : '';
    const limits = (lo || hi)
      ? `<span class="mv-int-limits"><sup>${hi}</sup><sub>${lo}</sub></span>` : '';
    return `<span class="mv-integral"><span class="mv-int-sign">${sym}</span>${limits}</span>`;
  });

  // ── \lim_{x \to a} ──
  s = s.replace(/\\lim\s*_(\{[^{}]*\})/g, (_, sub) => {
    const inner = ltxUnbrace(sub).replace(/\\to/g, '→').replace(/\\infty/g, '∞');
    return `<span class="mv-lim"><span class="mv-lim-word">lim</span><sub class="mv-lim-sub">${ltxNode(inner)}</sub></span>`;
  });

  // ── \log_{b} ──
  s = s.replace(/\\log\s*_(\{[^{}]*\}|[^_\^{}\s])/g, (_, b) =>
    `<span class="mv-func">log<sub>${ltxNode(ltxUnbrace(b))}</sub></span>`);

  // ── Trig & named functions: \sin \cos \tan etc. ──
  s = s.replace(/\\(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|arcsin|arccos|arctan|ln|exp|det|max|min|gcd|lcm)\b/g,
    (_, fn) => `<span class="mv-func">${fn}</span>`);

  // ── \left| ... \right| → absolute value ──
  s = s.replace(/\|([^|]+)\|/g, (_, inner) =>
    `<span class="mv-abs"><span class="mv-bar">|</span>${ltxNode(inner)}<span class="mv-bar">|</span></span>`);

  // ── x^{exp} or x^e (superscript) ──
  s = s.replace(/(\S+)\^\{([^{}]+)\}/g, (_, base, exp) =>
    `${ltxNode(base)}<sup class="mv-sup">${ltxNode(exp)}</sup>`);
  s = s.replace(/([a-zA-Z0-9])\^([a-zA-Z0-9])/g, (_, base, exp) =>
    `${base}<sup class="mv-sup">${exp}</sup>`);

  // ── x_{sub} (subscript) ──
  s = s.replace(/([a-zA-Z0-9])\{([^{}]+)\}/g, (_, base, sub) =>
    `${base}<sub>${ltxNode(sub)}</sub>`);
  s = s.replace(/([a-zA-Z0-9])_([a-zA-Z0-9])/g, (_, base, sub) =>
    `${base}<sub>${sub}</sub>`);

  // ── Greek letters ──
  const greek = {
    alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',
    iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',
    tau:'τ',upsilon:'υ',phi:'φ',chi:'χ',psi:'ψ',omega:'ω',
    Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',
    Upsilon:'Υ',Phi:'Φ',Psi:'Ψ',Omega:'Ω',
    infty:'∞',infinity:'∞',nabla:'∇',partial:'∂',
    cdot:'·',times:'×',div:'÷',pm:'±',mp:'∓',
    leq:'≤',geq:'≥',neq:'≠',approx:'≈',equiv:'≡',
    to:'→',rightarrow:'→',leftarrow:'←',Rightarrow:'⇒',Leftarrow:'⟸',
    forall:'∀',exists:'∃',in:'∈',notin:'∉',subset:'⊂',subseteq:'⊆',
    cup:'∪',cap:'∩',emptyset:'∅',
  };
  s = s.replace(/\\([a-zA-Z]+)/g, (match, name) => greek[name] || match);

  // ── Remove stray braces ──
  s = s.replace(/\{([^{}]*)\}/g, (_, inner) => ltxNode(inner));

  return s;
}

// Strip outer { } braces
function ltxUnbrace(s) {
  s = s.trim();
  if (s.startsWith('{') && s.endsWith('}')) return s.slice(1, -1).trim();
  return s;
}

// ── END LATEX PARSER ─────────────────────────────────────────────────────────

function mathToVisualHTML(expr, result) {
  const e = expr.trim();
  if (!document.getElementById('mv-styles')) injectMVStyles();

  // ── LaTeX input check (starts with \ or contains \frac, \sum etc.) ──
  if (e.includes('\\')) {
    const ltxHTML = latexToVisualHTML(e);
    if (ltxHTML) return mvWrap(ltxHTML, result);
  }

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
