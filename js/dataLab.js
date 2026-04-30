// ============================================================
// Data Lab Pro v6.0 — Advanced Excel-Like Spreadsheet Engine
// ============================================================
// CHANGES v6.0:
//  • BUG FIX: Arrow key navigation (was empty stub)
//  • BUG FIX: MID() function args were using wrong index
//  • BUG FIX: dlUpdateChartOptions() was missing
//  • BUG FIX: dlChartInstance not destroyed on close properly
//  • FEATURE: Advanced Chart — auto-detects table header row
//             (thead-highlighted cells), multi-dataset support,
//             scatter, doughnut, radar, bubble chart types,
//             chart options panel (colors, stacked, grid, etc.)
//  • FEATURE: Arrow keys navigate between cells
//  • FEATURE: Data Types: Integer, Float, String, Currency
//             (USD, LKR, EUR, GBP, JPY), DateTime, Date,
//             Time, Percentage, Boolean
//  • FEATURE: Row & Column resize by dragging headers
//  • FEATURE: Table header auto-detection button in toolbar
// ============================================================

// ── State ──────────────────────────────────────────────────
let DL = {
  rows: 20,
  cols: 10,
  isSelecting: false,
  selStart: null,
  selEnd: null,
  activeCell: null,
  activeInput: null,
  formulaMode: false,
  data: {},           // key: "r-c" → { raw, value, formula, type }
  fmt: {},            // key: "r-c" → { bold, italic, align, border, bg, color, thead }
  colWidths: {},      // col index → px
  rowHeights: {},     // row index → px
  frozenCols: 0,
  frozenRows: 0,
  sortCol: null,
  sortDir: 1,
  filterActive: false,
  hiddenRows: new Set(),
  copyBuffer: null,
  undoStack: [],
  redoStack: [],
  ctrlHeld: false,
  shiftHeld: false,
  charts: [],
  // Resize state
  _resizingCol: null,
  _resizingRow: null,
  _resizeStartX: 0,
  _resizeStartY: 0,
  _resizeStartSize: 0,
};

// ── Data Types ──────────────────────────────────────────────
const DL_TYPES = {
  auto:       { label: 'Auto',        icon: '🔤' },
  integer:    { label: 'Integer',     icon: '🔢' },
  float:      { label: 'Float',       icon: '🔣' },
  string:     { label: 'String',      icon: '📝' },
  usd:        { label: 'USD ($)',     icon: '💵' },
  lkr:        { label: 'LKR (Rs.)',   icon: '💰' },
  eur:        { label: 'EUR (€)',     icon: '💶' },
  gbp:        { label: 'GBP (£)',     icon: '💷' },
  jpy:        { label: 'JPY (¥)',     icon: '💴' },
  percent:    { label: 'Percent (%)', icon: '📊' },
  date:       { label: 'Date',        icon: '📅' },
  time:       { label: 'Time',        icon: '🕐' },
  datetime:   { label: 'DateTime',    icon: '⏰' },
  boolean:    { label: 'Boolean',     icon: '☑️' },
};

function dlFormatByType(raw, type) {
  if (raw === '' || raw === null || raw === undefined) return '';
  const n = parseFloat(raw);
  switch (type) {
    case 'integer':  return isNaN(n) ? raw : String(Math.round(n));
    case 'float':    return isNaN(n) ? raw : parseFloat(n.toFixed(4)).toString();
    case 'usd':      return isNaN(n) ? raw : '$' + n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
    case 'lkr':      return isNaN(n) ? raw : 'Rs. ' + n.toLocaleString('en-LK', {minimumFractionDigits:2, maximumFractionDigits:2});
    case 'eur':      return isNaN(n) ? raw : '€' + n.toLocaleString('de-DE', {minimumFractionDigits:2, maximumFractionDigits:2});
    case 'gbp':      return isNaN(n) ? raw : '£' + n.toLocaleString('en-GB', {minimumFractionDigits:2, maximumFractionDigits:2});
    case 'jpy':      return isNaN(n) ? raw : '¥' + Math.round(n).toLocaleString('ja-JP');
    case 'percent':  return isNaN(n) ? raw : (n * 100).toFixed(2) + '%';
    case 'boolean':  {
      const s = String(raw).toLowerCase();
      if (['1','true','yes','on'].includes(s)) return 'TRUE';
      if (['0','false','no','off'].includes(s)) return 'FALSE';
      return raw;
    }
    case 'date': {
      const d = new Date(raw);
      return isNaN(d) ? raw : d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    }
    case 'time': {
      const d = new Date('1970-01-01T' + raw);
      return isNaN(d) ? raw : d.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'});
    }
    case 'datetime': {
      const d = new Date(raw);
      return isNaN(d) ? raw : d.toLocaleString('en-US', {dateStyle:'short', timeStyle:'short'});
    }
    default: return String(raw);
  }
}

// ── All Supported Functions ─────────────────────────────────
const DL_FUNCTIONS = [
  'SUM','AVG','AVERAGE','MAX','MIN','COUNT','COUNTA','COUNTIF',
  'PRODUCT','SQRT','ABS','ROUND','ROUNDUP','ROUNDDOWN',
  'FLOOR','CEILING','MOD','POWER','LOG','LN','EXP',
  'INT','SIGN','RAND','PI',
  'MEDIAN','MODE','STDEV','VAR','LARGE','SMALL','RANK',
  'LEN','UPPER','LOWER','TRIM','LEFT','RIGHT','MID',
  'CONCAT','TEXTJOIN','SUBSTITUTE','FIND','SEARCH',
  'VALUE','TEXT',
  'IF','AND','OR','NOT','IFERROR','ISBLANK','ISNUMBER','ISTEXT',
  'VLOOKUP','HLOOKUP','INDEX','MATCH',
  'TODAY','NOW','YEAR','MONTH','DAY',
];

const DL_FUNC_DOCS = {
  SUM: 'SUM(range) — Adds all numbers',
  AVG: 'AVG(range) — Average of numbers',
  AVERAGE: 'AVERAGE(range) — Average',
  MAX: 'MAX(range) — Largest value',
  MIN: 'MIN(range) — Smallest value',
  COUNT: 'COUNT(range) — Count numeric cells',
  COUNTA: 'COUNTA(range) — Count non-empty cells',
  COUNTIF: 'COUNTIF(range, criteria) — Count matching',
  IF: 'IF(condition, true_val, false_val)',
  VLOOKUP: 'VLOOKUP(value, range, col_index, [exact])',
  CONCAT: 'CONCAT(text1, text2, ...) — Join text',
  IFERROR: 'IFERROR(value, error_val) — Trap errors',
  ROUND: 'ROUND(number, digits)',
  LEFT: 'LEFT(text, num_chars)',
  RIGHT: 'RIGHT(text, num_chars)',
  MID: 'MID(text, start, length)',
  LEN: 'LEN(text) — Text length',
  TODAY: 'TODAY() — Today\'s date',
  TEXTJOIN: 'TEXTJOIN(delimiter, ignore_empty, range)',
};

// ── Init ───────────────────────────────────────────────────
function openDataLab() {
  document.getElementById('data-lab-modal').classList.add('open');
  buildDataLabUI();
}

function closeDataLab() {
  document.getElementById('data-lab-modal').classList.remove('open');
  hideDLSuggestions();
}

function buildDataLabUI() {
  const container = document.querySelector('.data-lab-container');
  if (!container) return;
  container.innerHTML = `
    <div class="dl-header">
      <div class="dl-title">
        <span class="dl-icon">⊞</span>
        <span>Data Lab <span class="dl-badge">Pro v6</span></span>
      </div>
      <div class="dl-header-actions">
        <button class="dl-btn dl-btn-accent" onclick="dlExportCSV()">↓ CSV</button>
        <button class="dl-btn dl-btn-accent" onclick="dlExportExcel()">↓ Excel</button>
        <button class="dl-btn" onclick="dlImportCSV()">↑ Import CSV</button>
        <button class="dl-btn dl-btn-success" onclick="dlCopyToEditor()">→ Editor</button>
        <button class="dl-btn dl-btn-danger" onclick="closeDataLab()">✕</button>
        <input type="file" id="dl-import-file" accept=".csv" style="display:none" onchange="dlHandleImport(event)">
      </div>
    </div>

    <div class="dl-formula-bar">
      <div class="dl-cell-ref" id="dl-cell-ref">A1</div>
      <div class="dl-fx-label">fx</div>
      <input class="dl-formula-input" id="dl-formula-input"
             placeholder="Enter value or =formula..."
             oninput="dlFormulaBarInput(this)"
             onkeydown="dlFormulaBarKey(event)">
      <div class="dl-func-help" id="dl-func-help"></div>
      <div class="dl-type-selector">
        <label style="font-size:10px;color:var(--muted);margin-right:4px">Type:</label>
        <select class="dl-select" id="dl-cell-type" onchange="dlSetCellType(this.value)" title="Cell data type" style="font-size:10px;padding:2px 4px">
          ${Object.entries(DL_TYPES).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="dl-toolbar">
      <div class="dl-tb-group">
        <button class="dl-tbtn" onclick="dlUndo()" title="Undo">↩ Undo</button>
        <button class="dl-tbtn" onclick="dlRedo()" title="Redo">↪ Redo</button>
      </div>
      <div class="dl-tb-sep"></div>
      <div class="dl-tb-group">
        <button class="dl-tbtn" onclick="dlAddRow()">+ Row</button>
        <button class="dl-tbtn" onclick="dlAddCol()">+ Col</button>
        <button class="dl-tbtn dl-danger-btn" onclick="dlDeleteRow()">− Row</button>
        <button class="dl-tbtn dl-danger-btn" onclick="dlDeleteCol()">− Col</button>
      </div>
      <div class="dl-tb-sep"></div>
      <div class="dl-tb-group">
        <button class="dl-tbtn" onclick="dlCopyCells()">⎘ Copy</button>
        <button class="dl-tbtn" onclick="dlPasteCells()">⌅ Paste</button>
        <button class="dl-tbtn" onclick="dlCutCells()">✂ Cut</button>
      </div>
      <div class="dl-tb-sep"></div>
      <div class="dl-tb-group">
        <button class="dl-tbtn dl-fmt-btn" id="dl-fmt-bold" onclick="dlFmtToggle('bold')"><b>B</b></button>
        <button class="dl-tbtn dl-fmt-btn" id="dl-fmt-italic" onclick="dlFmtToggle('italic')"><i>I</i></button>
        <button class="dl-tbtn dl-fmt-btn" id="dl-fmt-left" onclick="dlFmtAlign('left')">⬅</button>
        <button class="dl-tbtn dl-fmt-btn" id="dl-fmt-center" onclick="dlFmtAlign('center')">⬛</button>
        <button class="dl-tbtn dl-fmt-btn" id="dl-fmt-right" onclick="dlFmtAlign('right')">➡</button>
      </div>
      <div class="dl-tb-sep"></div>
      <div class="dl-tb-group">
        <button class="dl-tbtn dl-fmt-btn" id="dl-fmt-thead" onclick="dlFmtToggle('thead')" title="Table Header Style (enables chart detection)">TH Header</button>
        <button class="dl-tbtn dl-fmt-btn" onclick="dlFmtToggleBorder()">▦ Border</button>
        <button class="dl-tbtn dl-fmt-btn" onclick="dlFmtClear()">✕ Fmt</button>
      </div>
      <div class="dl-tb-sep"></div>
      <div class="dl-tb-group">
        <button class="dl-tbtn" onclick="dlAutoDetectHeader()" title="Auto-detect & highlight header row">🔍 Header</button>
        <button class="dl-tbtn" onclick="dlSort('asc')">▲ A→Z</button>
        <button class="dl-tbtn" onclick="dlSort('desc')">▼ Z→A</button>
        <button class="dl-tbtn" onclick="dlOpenFilter()">⏿ Filter</button>
        <button class="dl-tbtn" onclick="dlClearFilter()">✕ Filter</button>
      </div>
      <div class="dl-tb-sep"></div>
      <div class="dl-tb-group">
        <button class="dl-tbtn" onclick="dlFindReplace()">⌕ Find</button>
        <button class="dl-tbtn" onclick="dlClearAll()">⊗ Clear</button>
        <button class="dl-tbtn" onclick="dlFillDown()">↓ Fill</button>
        <button class="dl-tbtn" onclick="dlFillRight()">→ Fill</button>
      </div>
      <div class="dl-tb-sep"></div>
      <div class="dl-tb-group">
        <select class="dl-select" id="dl-chart-type" title="Chart type" onchange="dlUpdateChartOptions()">
          <option value="bar">📊 Bar</option>
          <option value="line">📈 Line</option>
          <option value="pie">🥧 Pie</option>
          <option value="doughnut">🍩 Doughnut</option>
          <option value="area">📉 Area</option>
          <option value="scatter">✦ Scatter</option>
          <option value="radar">🕸 Radar</option>
          <option value="bubble">🔵 Bubble</option>
        </select>
        <input class="dl-chart-title-input" id="dl-chart-title" placeholder="Chart title...">
        <button class="dl-tbtn dl-accent-btn" onclick="dlInsertChart()">📈 Chart</button>
        <button class="dl-tbtn" onclick="dlShowChartOptions()" title="Chart options">⚙</button>
      </div>
    </div>

    <div class="dl-search-bar" id="dl-filter-bar" style="display:none">
      <span class="dl-fx-label">Search</span>
      <input class="dl-formula-input" id="dl-filter-input" placeholder="Filter rows containing..."
             oninput="dlApplyFilter(this.value)" style="max-width:300px">
      <button class="dl-tbtn" onclick="dlClearFilter()">✕ Clear</button>
    </div>

    <div class="dl-search-bar" id="dl-findreplace-bar" style="display:none">
      <span class="dl-fx-label">Find</span>
      <input class="dl-formula-input" id="dl-find-input" placeholder="Find..." style="max-width:180px">
      <span class="dl-fx-label">Replace</span>
      <input class="dl-formula-input" id="dl-replace-input" placeholder="Replace with..." style="max-width:180px">
      <button class="dl-tbtn dl-accent-btn" onclick="dlDoReplace()">Replace All</button>
      <button class="dl-tbtn" onclick="document.getElementById('dl-findreplace-bar').style.display='none'">✕</button>
    </div>

    <!-- Chart Options Panel -->
    <div class="dl-search-bar" id="dl-chart-options-bar" style="display:none;flex-wrap:wrap;gap:8px">
      <label style="font-size:10px;color:var(--muted)">Dataset Cols:
        <input class="dl-formula-input" id="dl-chart-dataset-cols" value="B" placeholder="B,C,D" style="width:80px;font-size:11px" title="Column letters for data (comma separated, e.g. B,C,D)">
      </label>
      <label style="font-size:10px;color:var(--muted)">Label Col:
        <input class="dl-formula-input" id="dl-chart-label-col" value="A" placeholder="A" style="width:40px;font-size:11px">
      </label>
      <button class="dl-tbtn" onclick="dlAutoFillChartCols()" title="Auto-detect columns from data" style="font-size:10px">🔍 Auto</button>
      <div id="dl-col-toggles" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-left:4px"></div>
      <label style="font-size:10px;color:var(--muted)">
        <input type="checkbox" id="dl-chart-stacked" style="margin-right:3px">Stacked
      </label>
      <label style="font-size:10px;color:var(--muted)">
        <input type="checkbox" id="dl-chart-auto-header" checked style="margin-right:3px">Use Header Row
      </label>
      <label style="font-size:10px;color:var(--muted)">
        <input type="checkbox" id="dl-chart-legend" checked style="margin-right:3px">Legend
      </label>
      <label style="font-size:10px;color:var(--muted)">
        <input type="checkbox" id="dl-chart-grid" checked style="margin-right:3px">Grid
      </label>
    </div>

    <div class="dl-body">
      <div class="dl-table-wrap" id="dl-table-wrap">
        <table class="dl-table" id="dl-table" onmouseup="dlMouseUp()"></table>
      </div>
      <div class="dl-chart-panel" id="dl-chart-panel" style="display:none">
        <div class="dl-chart-header">
          <span id="dl-chart-label">📈 Chart</span>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="dl-tbtn" onclick="dlDownloadChart()" title="Download chart as PNG">↓ PNG</button>
            <button class="dl-tbtn" onclick="dlCloseChart()">✕ Close</button>
          </div>
        </div>
        <canvas id="dl-chart-canvas"></canvas>
        <div id="dl-chart-legend" class="dl-chart-legend"></div>
      </div>
    </div>

    <div class="dl-statusbar">
      <div class="dl-status-left">
        <span id="dl-sel-info">No selection</span>
        <span class="dl-sep-v"></span>
        <span id="dl-sum-info">Sum: 0</span>
        <span class="dl-sep-v"></span>
        <span id="dl-avg-info">Avg: 0</span>
        <span class="dl-sep-v"></span>
        <span id="dl-cnt-info">Count: 0</span>
        <span class="dl-sep-v"></span>
        <span id="dl-type-info" style="color:var(--accent)">Type: Auto</span>
      </div>
      <div class="dl-status-right">
        <span style="color:var(--muted);font-size:10px">Arrows=Navigate · F2=Edit · DblClick=Edit · Ctrl+B/I=Format · TH=Header</span>
      </div>
    </div>

    <div class="dl-sug-box" id="dl-sug-box" style="display:none"></div>
  `;

  injectDLStyles();
  dlRenderTable();
  setupDLKeyboard();
  setupDLResize();
}

// ── Style Injection ─────────────────────────────────────────
function injectDLStyles() {
  if (document.getElementById('dl-styles')) return;
  const s = document.createElement('style');
  s.id = 'dl-styles';
  s.textContent = `
    .data-lab-container {
      background: var(--surf);
      border: 1px solid var(--border);
      border-radius: 14px;
      width: 95vw;
      max-width: 1200px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.9);
    }
    .dl-header {
      background: var(--toolbar);
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .dl-title { display:flex;align-items:center;gap:8px;font-weight:800;font-size:15px;color:var(--accent); }
    .dl-icon { font-size: 18px; }
    .dl-badge { font-size:9px;background:var(--accent2);color:#000;border-radius:4px;padding:1px 5px;font-weight:700; }
    .dl-header-actions { display:flex;gap:6px;flex-wrap:wrap; }
    .dl-btn {
      background: var(--btn);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      font-family: 'Syne', sans-serif;
      font-weight: 600;
      transition: all .12s;
      white-space: nowrap;
    }
    .dl-btn:hover { background:var(--btn-h);color:var(--text);border-color:var(--accent); }
    .dl-btn-accent { border-color:var(--accent);color:var(--accent); }
    .dl-btn-success { border-color:var(--accent2);color:var(--accent2); }
    .dl-btn-danger { border-color:var(--danger);color:var(--danger); }
    .dl-btn-danger:hover { background:var(--danger);color:#fff; }
    .dl-formula-bar {
      background: var(--surf2);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 0;
      flex-shrink: 0;
    }
    .dl-cell-ref { background:var(--toolbar);border-right:1px solid var(--border);padding:6px 12px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent2);min-width:60px;text-align:center;font-weight:700; }
    .dl-fx-label { padding:0 10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);font-weight:700;border-right:1px solid var(--border);flex-shrink:0;align-self:stretch;display:flex;align-items:center; }
    .dl-formula-input { flex:1;background:transparent;border:none;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;padding:7px 12px;outline:none; }
    .dl-func-help { padding:0 12px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);flex-shrink:0;max-width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .dl-type-selector { display:flex;align-items:center;padding:0 10px;border-left:1px solid var(--border);flex-shrink:0; }
    .dl-toolbar { background:var(--toolbar);border-bottom:1px solid var(--border);padding:5px 10px;display:flex;align-items:center;gap:3px;flex-wrap:wrap;flex-shrink:0; }
    .dl-tb-group { display:flex;gap:2px;align-items:center; }
    .dl-tb-sep { width:1px;height:20px;background:var(--border);margin:0 4px; }
    .dl-tbtn { background:transparent;border:1px solid transparent;color:var(--muted);border-radius:5px;padding:4px 8px;font-size:11px;cursor:pointer;transition:all .12s;font-family:'Syne',sans-serif;font-weight:600;white-space:nowrap; }
    .dl-tbtn:hover { background:var(--btn-h);color:var(--text);border-color:var(--border); }
    .dl-danger-btn:hover { background:rgba(248,113,113,.15) !important;color:var(--danger) !important;border-color:var(--danger) !important; }
    .dl-accent-btn { color:var(--accent); }
    .dl-accent-btn:hover { background:rgba(167,139,250,.15) !important;border-color:var(--accent) !important; }
    .dl-select { background:var(--btn);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 6px;font-size:11px;outline:none;font-family:'Syne',sans-serif;cursor:pointer; }
    .dl-search-bar { background:var(--surf2);border-bottom:1px solid var(--border);padding:6px 12px;display:flex;align-items:center;gap:8px;flex-shrink:0; }
    .dl-body { display:flex;flex:1;overflow:hidden;min-height:0; }
    .dl-table-wrap { flex:1;overflow:auto;position:relative; }
    .dl-table { border-collapse:collapse;font-family:'JetBrains Mono',monospace;font-size:12px;white-space:nowrap; }
    .dl-col-hdr, .dl-row-hdr {
      background: var(--toolbar);
      color: var(--muted);
      font-size: 10px;
      font-weight: 600;
      text-align: center;
      border: 1px solid var(--border);
      position: sticky;
      z-index: 3;
      user-select: none;
      padding: 0;
    }
    .dl-col-hdr { top:0;min-width:80px;height:28px; }
    .dl-col-hdr.sorted-asc::after { content:' ▲';color:var(--accent2); }
    .dl-col-hdr.sorted-desc::after { content:' ▼';color:var(--accent2); }
    .dl-row-hdr { left:0;width:36px; }
    .dl-corner { background:var(--toolbar);border:1px solid var(--border);position:sticky;top:0;left:0;z-index:5; }
    /* Col/Row resize handle */
    .dl-col-resize-handle {
      position: absolute;
      right: 0;
      top: 0;
      width: 5px;
      height: 100%;
      cursor: col-resize;
      z-index: 10;
      background: transparent;
    }
    .dl-col-resize-handle:hover { background: var(--accent); opacity: 0.5; }
    .dl-row-resize-handle {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 5px;
      cursor: row-resize;
      z-index: 10;
      background: transparent;
    }
    .dl-row-resize-handle:hover { background: var(--accent); opacity: 0.5; }
    .dl-td { border:1px solid var(--border);padding:0;height:26px;min-width:80px;position:relative;background:var(--surf); }
    .dl-td.selected { background:rgba(52,211,153,0.08) !important;outline:1px solid var(--accent2);z-index:1; }
    .dl-td.active-cell { outline:2px solid var(--accent) !important;z-index:2;background:rgba(167,139,250,0.08) !important; }
    .dl-td.range-select { background:rgba(52,211,153,0.12) !important; }
    .dl-td.copy-dashed { outline:2px dashed var(--accent2) !important; }
    .dl-cell-input { width:100%;height:100%;background:transparent;border:none;color:var(--text);font-family:'JetBrains Mono',monospace;font-size:12px;padding:0 6px;outline:none;text-overflow:ellipsis; }
    .dl-cell-input.formula-cell { color:var(--accent2); }
    .dl-cell-input.error-cell { color:var(--danger); }
    .dl-cell-input.text-cell { color:var(--text);text-align:left; }
    .dl-cell-input.num-cell { text-align:right;color:#93c5fd; }
    .dl-cell-input.currency-cell { text-align:right;color:var(--accent2); }
    .dl-cell-input.bool-cell { text-align:center;color:#34d399; }
    .dl-cell-input.date-cell { color:#fbbf24; }
    .dl-row-hidden { display:none; }
    /* ── Mobile Responsive ── */
    @media (max-width: 768px) {
      .dl-overlay { padding: 0; }
      .dl-container { border-radius: 0; height: 100dvh; }
      .dl-header { padding: 8px 10px; flex-wrap: wrap; gap: 6px; }
      .dl-header-actions { gap: 4px; flex-wrap: wrap; }
      .dl-btn { padding: 4px 7px; font-size: 10px; }
      .dl-toolbar { padding: 4px 6px; gap: 2px; overflow-x: auto; flex-wrap: nowrap; }
      .dl-tbtn { padding: 3px 6px; font-size: 10px; }
      .dl-func-help { display: none; }
      .dl-type-selector { display: none; }
      .dl-col-hdr { min-width: 60px; }
      .dl-td { min-width: 60px; height: 28px; }
      .dl-cell-input { font-size: 11px; }
    }
    /* Cell formatting classes */
    .dl-td.dl-fmt-thead { background:var(--toolbar) !important; }
    .dl-td.dl-fmt-thead .dl-cell-input { color:var(--accent) !important;font-weight:700 !important; }
    .dl-td.dl-fmt-border { outline:1px solid var(--muted) !important; }
    .dl-fmt-bold { font-weight:700 !important; }
    .dl-fmt-italic { font-style:italic !important; }
    .dl-fmt-align-left { text-align:left !important; }
    .dl-fmt-align-center { text-align:center !important; }
    .dl-fmt-align-right { text-align:right !important; }
    .dl-fmt-btn { font-size:12px !important;min-width:26px; }
    .dl-fmt-btn.active { background:rgba(167,139,250,.25) !important;color:var(--accent) !important;border-color:var(--accent) !important; }
    /* Chart panel */
    .dl-chart-panel { width:560px;flex-shrink:0;background:var(--surf2);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden; }
    .dl-chart-header { background:var(--toolbar);border-bottom:1px solid var(--border);padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:var(--accent); }
    #dl-chart-canvas { flex:1;padding:10px;max-height:360px; }
    .dl-statusbar { background:var(--toolbar);border-top:1px solid var(--border);padding:5px 16px;display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);flex-shrink:0;flex-wrap:wrap;gap:8px; }
    .dl-status-left { display:flex;gap:12px;align-items:center;flex-wrap:wrap; }
    .dl-sep-v { display:inline-block;width:1px;height:10px;background:var(--border); }
    #dl-sum-info, #dl-avg-info, #dl-cnt-info { color:var(--accent2); }
    .dl-sug-box { position:fixed;background:var(--surf);border:1px solid var(--accent);border-radius:8px;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.8);min-width:220px;overflow:hidden;max-height:220px;overflow-y:auto; }
    .dl-sug-item { padding:7px 14px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text);display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border); }
    .dl-sug-item:last-child { border-bottom:none; }
    .dl-sug-item:hover, .dl-sug-item.active { background:var(--accent);color:#fff; }
    .dl-chart-title-input { background:var(--btn);border:1px solid var(--border);color:var(--text);border-radius:5px;padding:4px 8px;font-size:11px;font-family:'Syne',sans-serif;outline:none;width:100px; }
    .dl-chart-title-input:focus { border-color:var(--accent); }
    .dl-ctx-menu { position:fixed;background:var(--surf);border:1px solid var(--border);border-radius:8px;z-index:10000;box-shadow:0 8px 32px rgba(0,0,0,.8);min-width:160px;overflow:hidden;padding:4px 0; }
    .dl-ctx-item { padding:7px 16px;cursor:pointer;font-family:'Syne',sans-serif;font-size:12px;color:var(--text);display:flex;align-items:center;gap:8px;white-space:nowrap; }
    .dl-ctx-item:hover { background:var(--accent);color:#fff; }
    .dl-ctx-sep { height:1px;background:var(--border);margin:3px 0; }
    .dl-ctx-item.danger:hover { background:var(--danger); }
    .dl-chart-legend { display:flex;flex-wrap:wrap;gap:8px;padding:6px 12px;border-top:1px solid var(--border);font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--muted);min-height:28px; }
    .dl-legend-item { display:flex;align-items:center;gap:4px; }
    .dl-legend-dot { width:10px;height:10px;border-radius:2px;flex-shrink:0; }
    /* ✅ NEW — add inside the styles string in injectDLStyles() */
    .dl-col-toggle {padding: 2px 7px;font-size: 11px;font-family: 'JetBrains Mono', monospace;font-weight: 700;border-radius: 4px;border: 1px solid var(--border);background: var(--btn);color: var(--muted);cursor: pointer;transition: all 0.15s;}
    .dl-col-toggle:hover { border-color: var(--accent); color: var(--accent); }
    .dl-col-toggle.data-col { background: rgba(167,139,250,0.2); border-color: #a78bfa; color: #a78bfa; }
    .dl-col-toggle.label-col { background: rgba(52,211,153,0.15); border-color: #34d399; color: #34d399; }
    /* ✅ NEW — add inside injectDLStyles() styles string */
    .dl-ghost-fill {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      color: #a78bfa;
      background: rgba(30,20,50,0.95);
      border: 1px solid #a78bfa;
      border-radius: 4px;
      padding: 2px 7px;
      cursor: pointer;
      z-index: 20;
      white-space: nowrap;
      pointer-events: all;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      transition: background 0.15s;
    }
    .dl-ghost-fill:hover { background: rgba(167,139,250,0.3); }
    `;
  document.head.appendChild(s);
}

// ── Table Rendering ─────────────────────────────────────────
function dlRenderTable() {
  const table = document.getElementById('dl-table');
  if (!table) return;

  let html = '<thead><tr><th class="dl-corner" style="position:relative"></th>';
  for (let c = 0; c < DL.cols; c++) {
    const colLetter = dlColLetter(c);
    const sorted = DL.sortCol === c ? (DL.sortDir === 1 ? ' sorted-asc' : ' sorted-desc') : '';
    const w = DL.colWidths[c] ? `width:${DL.colWidths[c]}px;min-width:${DL.colWidths[c]}px` : '';
    html += `<th class="dl-col-hdr${sorted}" onclick="dlHeaderColClick(${c})" ondblclick="dlSortByCol(${c})" data-col="${c}" style="${w};position:relative">
      ${colLetter}
      <div class="dl-col-resize-handle" onmousedown="dlStartColResize(event,${c})"></div>
    </th>`;
  }
  html += '</tr></thead><tbody>';

  for (let r = 0; r < DL.rows; r++) {
    const hidden = DL.hiddenRows.has(r) ? ' dl-row-hidden' : '';
    const rh = DL.rowHeights[r] ? `height:${DL.rowHeights[r]}px` : '';
    html += `<tr class="dl-tr${hidden}" data-row="${r}" style="${rh}">
      <th class="dl-row-hdr" onclick="dlHeaderRowClick(${r})" style="position:relative">
        ${r + 1}
        <div class="dl-row-resize-handle" onmousedown="dlStartRowResize(event,${r})"></div>
      </th>`;
    for (let c = 0; c < DL.cols; c++) {
      const key = `${r}-${c}`;
      const cellData = DL.data[key] || {};
      const cellFmt = DL.fmt[key] || {};
      const cellType = cellData.type || 'auto';
      const raw = cellData.raw || '';
      let display;
      if (cellData.formula) {
        display = cellData.value !== undefined ? cellData.value : '';
      } else if (cellType !== 'auto' && raw) {
        display = dlFormatByType(raw, cellType);
      } else {
        display = cellData.value !== undefined ? cellData.value : raw;
      }
      const isFormula = !!cellData.formula;
      const isErr = String(display).startsWith('#');
      // Determine class
      let typeClass = '';
      if (!isErr && !isFormula) {
        if (['usd','lkr','eur','gbp','jpy'].includes(cellType)) typeClass = 'currency-cell';
        else if (cellType === 'boolean') typeClass = 'bool-cell';
        else if (['date','time','datetime'].includes(cellType)) typeClass = 'date-cell';
        else if (!isNaN(parseFloat(display)) && display !== '') typeClass = 'num-cell';
        else if (display) typeClass = 'text-cell';
      }
      let cls = isErr ? 'error-cell' : isFormula ? 'formula-cell' : typeClass;
      let fmtInputClass = '';
      let fmtTdClass = '';
      if (cellFmt.bold) fmtInputClass += ' dl-fmt-bold';
      if (cellFmt.italic) fmtInputClass += ' dl-fmt-italic';
      if (cellFmt.align) fmtInputClass += ` dl-fmt-align-${cellFmt.align}`;
      if (cellFmt.thead) fmtTdClass += ' dl-fmt-thead';
      if (cellFmt.border) fmtTdClass += ' dl-fmt-border';
      const w = DL.colWidths[c] ? `width:${DL.colWidths[c]}px;max-width:${DL.colWidths[c]}px` : '';

      html += `<td class="dl-td${fmtTdClass}" id="dt-${r}-${c}" style="${w}"
          onmousedown="dlMouseDown(event,${r},${c})"
          onmouseenter="dlMouseEnter(event,${r},${c})"
          ondblclick="dlDblClick(${r},${c})"
          oncontextmenu="dlContextMenu(event,${r},${c})">
          <input type="text" class="dl-cell-input ${cls}${fmtInputClass}" id="dc-${r}-${c}"
            value="${escHtml(String(display))}"
            data-raw="${escHtml(String(raw))}"
            data-formula="${escHtml(String(cellData.formula || ''))}"
            data-value="${escHtml(String(display))}"
            data-type="${cellType}"
            onfocus="dlCellFocus(this,${r},${c})"
            onblur="dlCellBlur(this,${r},${c})"
            oninput="dlCellInput(this,${r},${c})"
            onkeydown="dlCellKey(event,this,${r},${c})"
            readonly>
        </td>`;
    }
    html += '</tr>';
  }

  html += '</tbody>';
  table.innerHTML = html;
  dlUpdateStatusBar();
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function dlColLetter(c) {
  let r = '';
  c++;
  while (c > 0) { r = String.fromCharCode(64 + (c % 26 || 26)) + r; c = Math.floor((c - 1) / 26); }
  return r;
}

let dlChartInstance = null;

// ── Cell Interaction ────────────────────────────────────────
function dlCellFocus(el, r, c) {
  DL.activeCell = {r, c};
  DL.activeInput = el;
  const key = `${r}-${c}`;
  const cellData = DL.data[key] || {};
  const formulaVal = cellData.formula || cellData.raw || '';

  const cellRef = document.getElementById('dl-cell-ref');
  const formulaBar = document.getElementById('dl-formula-input');
  if (cellRef) cellRef.textContent = dlColLetter(c) + (r + 1);
  if (formulaBar) formulaBar.value = formulaVal;

  // Update type selector
  const typeSelect = document.getElementById('dl-cell-type');
  if (typeSelect) typeSelect.value = cellData.type || 'auto';

  dlClearHighlights();
  const td = document.getElementById(`dt-${r}-${c}`);
  if (td) td.classList.add('active-cell');

  dlUpdateStatusBar();
}

function dlCellBlur(el, r, c) {
  setTimeout(() => {
    el.setAttribute('readonly', '');
    dlCommitCell(el, r, c);
    DL.formulaMode = false;
    DL.activeInput = null;
    hideDLSuggestions();
    const fh = document.getElementById('dl-func-help');
    if (fh) fh.textContent = '';
    // ✅ dlCommitCell ශේෂ වෙලා — _pendingGhost set වෙලා ඇත්නම් ghost show කරන්න
    if (DL._pendingGhost) {
      const { r: pr, c: pc, formula } = DL._pendingGhost;
      DL._pendingGhost = null;
      dlShowFormulaGhost(pr, pc, formula);
    }
  }, 120);
}

function dlCellInput(el, r, c) {
  const val = el.value;
  const formulaBar = document.getElementById('dl-formula-input');
  if (formulaBar) formulaBar.value = val;

  if (val.startsWith('=')) {
    DL.formulaMode = true;
    const query = val.substring(1).toUpperCase();
    showDLSuggestions(el, query);
    showDLFuncHelp(val);
  } else {
    DL.formulaMode = false;
    hideDLSuggestions();
    const fh = document.getElementById('dl-func-help');
    if (fh) fh.textContent = '';
  }
}

// ── Arrow Key Navigation (BUG FIX) ─────────────────────────
function dlNavigate(fromR, fromC, dr, dc) {
  const nr = fromR + dr;
  const nc = fromC + dc;
  if (nr < 0 || nr >= DL.rows || nc < 0 || nc >= DL.cols) return;
  const next = document.getElementById(`dc-${nr}-${nc}`);
  if (!next) return;
  DL.activeCell = {r: nr, c: nc};
  DL.selStart = {r: nr, c: nc};
  DL.selEnd = {r: nr, c: nc};
  dlClearHighlights();
  const td = document.getElementById(`dt-${nr}-${nc}`);
  if (td) td.classList.add('active-cell');
  const key = `${nr}-${nc}`;
  const cd = DL.data[key] || {};
  const cellRef = document.getElementById('dl-cell-ref');
  const formulaBar = document.getElementById('dl-formula-input');
  if (cellRef) cellRef.textContent = dlColLetter(nc) + (nr + 1);
  if (formulaBar) formulaBar.value = cd.formula || cd.raw || '';
  const typeSelect = document.getElementById('dl-cell-type');
  if (typeSelect) typeSelect.value = cd.type || 'auto';
  dlUpdateStatusBar();
  dlUpdateFmtButtons();
  next.focus();
}

function dlCellKey(e, el, r, c) {
  const isEditing = !el.hasAttribute('readonly');

 if (e.key === 'Enter') {
  e.preventDefault();
  el.blur();
  dlNavigate(r, c, 1, 0);
} else if (e.key === 'Tab') {
    e.preventDefault();
    el.blur();
    dlNavigate(r, c, 0, e.shiftKey ? -1 : 1);
  } else if (e.key === 'Escape') {
    const key = `${r}-${c}`;
    const cellData = DL.data[key] || {};
    const displayed = cellData.value !== undefined ? cellData.value : (cellData.raw || '');
    el.value = displayed;
    el.blur();
  } else if (e.key === 'F2' && !isEditing) {
    e.preventDefault();
    dlDblClick(r, c);
  } else if (!isEditing) {
    // Ctrl shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); dlCopyCells(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'x') { e.preventDefault(); dlCutCells(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); dlPasteCells(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); dlUndo(); return; }
    // Arrow navigation when not editing
    if (e.key === 'ArrowUp')    { e.preventDefault(); dlNavigate(r, c, -1, 0); }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); dlNavigate(r, c, 1, 0); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); dlNavigate(r, c, 0, -1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); dlNavigate(r, c, 0, 1); }
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      el.removeAttribute('readonly');
      el.value = e.key;
      dlCellInput(el, r, c);
    }
  }
}

// ✅ Formula ghost fill — data commit වෙලා පස්සේ call වෙනවා
function dlShowFormulaGhost(r, c, formula) {
  const nextRow = r + 1;
  if (nextRow >= DL.rows) return;
  // next row-ට දැනටමත් data ඇත්නම් skip
  if (DL.data[`${nextRow}-${c}`]?.raw) return;

  const shifted = dlShiftFormulaRows(formula, 1);
  dlGhostFill(nextRow, c, shifted);
}

// Row numbers shift කරන්න: =AVG(B2:D2) → =AVG(B3:D3)
function dlShiftFormulaRows(formula, delta) {
  return formula.replace(/([A-Za-z]+)(\d+)/g, (match, col, row) => {
    return col + (parseInt(row) + delta);
  });
}

// Next cell-ට ghost preview element add කරන්න
function dlGhostFill(r, c, formula) {
  // පරණ ghost remove
  document.querySelectorAll('.dl-ghost-fill').forEach(g => g.remove());

  const td = document.getElementById(`dt-${r}-${c}`);
  if (!td) return;

  const ghost = document.createElement('div');
  ghost.className = 'dl-ghost-fill';
  ghost.textContent = '↓ ' + formula;
  ghost.title = 'Click to fill formula here (or press Enter on this cell)';

  ghost.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dlAcceptGhostFill(r, c, formula);
  });
  td.appendChild(ghost);

  // ✅ BUG FIX: use the ghost element itself (not td) to check containment.
  // Previous fix used td which becomes stale after dlRenderTable rebuilds DOM,
  // causing the old listener to remove the newly created ghost on the next row.
  const onOutsideClick = (e) => {
    // Any click on a ghost-fill button should never dismiss — it's handled by its own mousedown
    if (e.target.classList.contains('dl-ghost-fill')) return;
    // Only dismiss if the ghost element still exists in DOM and click was outside it
    if (!document.contains(ghost) || !ghost.contains(e.target)) {
      ghost.remove();
      document.removeEventListener('mousedown', onOutsideClick);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', onOutsideClick), 50);
}

function dlAcceptGhostFill(r, c, formula) {
  document.querySelectorAll('.dl-ghost-fill').forEach(g => g.remove());

  const key = `${r}-${c}`;
  const existingType = DL.data[key]?.type || 'auto';
  dlPushUndo();
  DL.data[key] = { raw: formula, formula, type: existingType };
  try {
    const result = dlEvaluate(formula.substring(1));
    DL.data[key].value = formatDLResult(result);
  } catch {
    DL.data[key].value = '#ERR!';
  }
  dlRenderTable();
  // Accept කලාම ඒ cell-ටත් ghost show කරන්න (chain fill)
  dlShowFormulaGhost(r, c, formula);
  dlShowToast('Formula filled ↓', 'success');
}

function dlDblClick(r, c) {
  const el = document.getElementById(`dc-${r}-${c}`);
  if (!el) return;
  DL.activeCell = {r, c};
  DL.activeInput = el;
  el.removeAttribute('readonly');
  const key = `${r}-${c}`;
  const cellData = DL.data[key] || {};
  const editVal = cellData.formula || cellData.raw || '';
  el.value = editVal;
  el.focus();
  el.setSelectionRange(editVal.length, editVal.length);
  const cellRef = document.getElementById('dl-cell-ref');
  const formulaBar = document.getElementById('dl-formula-input');
  if (cellRef) cellRef.textContent = dlColLetter(c) + (r + 1);
  if (formulaBar) formulaBar.value = editVal;
  dlClearHighlights();
  const td = document.getElementById(`dt-${r}-${c}`);
  if (td) td.classList.add('active-cell');
  if (editVal.startsWith('=')) {
    DL.formulaMode = true;
    showDLFuncHelp(editVal);
  }
}

function dlCommitCell(el, r, c) {
  const key = `${r}-${c}`;
  const raw = el.value.trim();
  const existingType = DL.data[key]?.type || 'auto';
  dlPushUndo();

  if (!raw) {
    delete DL.data[key];
    el.className = 'dl-cell-input';
    el.setAttribute('data-value', '');
    el.setAttribute('data-raw', '');
    el.setAttribute('data-formula', '');
    el.setAttribute('readonly', '');  // ✅ BUG FIX: cell must return to readonly after clearing
    return;
  }

  if (raw.startsWith('=')) {
    DL.data[key] = { raw, formula: raw, type: existingType };
    try {
      const result = dlEvaluate(raw.substring(1));
      const display = formatDLResult(result);
      DL.data[key].value = display;
      el.value = display;
      el.setAttribute('data-value', display);
      el.className = 'dl-cell-input formula-cell';
    } catch {
      DL.data[key].value = '#ERR!';
      el.value = '#ERR!';
      el.className = 'dl-cell-input error-cell';
    }
    // ✅ data save වෙලා ඉවර — ghost preview show කරන්න
    DL._pendingGhost = { r, c, formula: raw };
  } else {
    const formatted = existingType !== 'auto' ? dlFormatByType(raw, existingType) : raw;
    DL.data[key] = { raw, value: formatted, type: existingType };
    el.value = formatted;
    el.setAttribute('data-value', formatted);
    let cls = 'text-cell';
    if (['usd','lkr','eur','gbp','jpy'].includes(existingType)) cls = 'currency-cell';
    else if (existingType === 'boolean') cls = 'bool-cell';
    else if (['date','time','datetime'].includes(existingType)) cls = 'date-cell';
    else if (!isNaN(parseFloat(raw)) && raw !== '') cls = 'num-cell';
    el.className = 'dl-cell-input ' + cls;
    DL._pendingGhost = null;
  }

  el.setAttribute('data-raw', raw);
  el.setAttribute('data-type', existingType);
  el.setAttribute('data-formula', DL.data[key]?.formula || '');
  dlRecalcAll();
  dlUpdateStatusBar();
}

// ── Set Cell Type ───────────────────────────────────────────
function dlSetCellType(type) {
  const cells = dlGetFmtSelection();
  if (!cells.length && !DL.activeCell) return;
  const targets = cells.length ? cells : [{r: DL.activeCell.r, c: DL.activeCell.c}];
  dlPushUndo();
  targets.forEach(({r, c}) => {
    const key = `${r}-${c}`;
    if (!DL.data[key]) DL.data[key] = {};
    DL.data[key].type = type;
    // Re-format displayed value
    const raw = DL.data[key].raw || '';
    if (raw && !DL.data[key].formula) {
      DL.data[key].value = dlFormatByType(raw, type);
    }
  });
  dlRenderTable();
  const info = document.getElementById('dl-type-info');
  if (info) info.textContent = 'Type: ' + (DL_TYPES[type]?.label || type);
  dlShowToast(`Type set to ${DL_TYPES[type]?.label || type}`);
}

function formatDLResult(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return String(val);
    return parseFloat(val.toFixed(6)).toString();
  }
  return String(val);
}

// ── Formula Bar Sync ────────────────────────────────────────
function dlFormulaBarInput(input) {
  if (!DL.activeCell) return;
  const {r, c} = DL.activeCell;
  const el = document.getElementById(`dc-${r}-${c}`);
  if (el) {
    el.removeAttribute('readonly');
    el.value = input.value;
    dlCellInput(el, r, c);
  }
}

function dlFormulaBarKey(e) {
  if (e.key === 'Enter') {
    if (!DL.activeCell) return;
    const {r, c} = DL.activeCell;
    const el = document.getElementById(`dc-${r}-${c}`);
    if (el) el.blur();
  }
}

// ── Evaluation Engine ───────────────────────────────────────
function dlEvaluate(expr) {
  const exprOriginal = expr.trim();
  expr = exprOriginal.toUpperCase();

  const funcMatch = expr.match(/^([A-Z]+)\((.*)\)$/s);
  if (funcMatch) {
    const fnName = funcMatch[1];
    const argsRaw = funcMatch[2];

    // Custom function (calcVars) නම් math.js එකෙන් evaluate
    if (!DL_FUNCTIONS.includes(fnName) && typeof math !== 'undefined' && typeof calcVars !== 'undefined') {
      const resolved = exprOriginal.replace(/([A-Za-z]+)(\d+)/g, (m, col, row) => {
        const r = parseInt(row) - 1;
        const c = dlColIndex(col.toUpperCase());
        const val = dlGetCellNum(r, c);
        return (val !== undefined && val !== null) ? val : 0;
      });
      return math.evaluate(resolved, calcVars);
    }

    // Built-in function — args nested evaluate කිරීම
    const evaluatedArgs = dlParseArgs(argsRaw).map(arg => {
      const argTrimmed = arg.trim();
      // Nested function call එකක්ද? (e.g. bmi(70,1.75))
      const nestedMatch = argTrimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/s);
      if (nestedMatch && typeof calcVars !== 'undefined' && typeof calcVars[nestedMatch[1]] === 'function') {
        try {
          return math.evaluate(argTrimmed, calcVars);
        } catch { return 0; }
      }
      // Cell reference හෝ number
      try { return dlEvaluate(argTrimmed); } catch { return argTrimmed; }
    });

    return dlCallFunction(fnName, evaluatedArgs, true);
  }

  const cellRef = expr.match(/^([A-Z]+)(\d+)$/);
  if (cellRef) {
    const r = parseInt(cellRef[2]) - 1;
    const c = dlColIndex(cellRef[1]);
    return dlGetCellNum(r, c) ?? dlGetCellStr(r, c) ?? 0;
  }

  let evalExpr = expr.replace(/([A-Z]+)(\d+)/g, (m, col, row) => {
    const r = parseInt(row) - 1, c = dlColIndex(col);
    const n = dlGetCellNum(r, c);
    if (n !== undefined) return n;
    const s = dlGetCellStr(r, c);
    return s !== undefined ? `"${s}"` : 0;
  });
  evalExpr = evalExpr.replace(/\^/g, '**');

  try {
    if (typeof math !== 'undefined' && typeof calcVars !== 'undefined') {
      const scope = { ...calcVars, pi: Math.PI, e: Math.E };
      // ✅ BUG FIX: use evalExpr (cell-replaced) not exprOriginal — math.js doesn't know D5 etc.
      const cleanExpr = evalExpr.replace(/\*\*/g, '^');
      return math.evaluate(cleanExpr, scope);
    }
    return Function('"use strict"; const pi=Math.PI, e=Math.E; return (' + evalExpr + ')')();
  } catch {
    throw new Error('Parse error');
  }
}

function dlCallFunction(func, argsStr, preEvaluated = false) {
  // Pre-evaluated args array නම් directly use කිරීම
  const args = (preEvaluated && Array.isArray(argsStr))
    ? argsStr
    : (preEvaluated && typeof argsStr === 'string')
      ? argsStr.split(',').map(a => { const n = parseFloat(a); return isNaN(n) ? a.trim() : n; })
      : dlParseArgs(argsStr);

  const getRange = (s) => {
    const parts = s.split(':');
    if (parts.length !== 2) return [];
    const id1 = parseDLCellId(parts[0].trim());
    const id2 = parseDLCellId(parts[1].trim());
    if (!id1 || !id2) return [];
    const vals = [];
    for (let r = id1.r; r <= id2.r; r++)
      for (let c = id1.c; c <= id2.c; c++) {
        const n = dlGetCellNum(r, c);
        if (n !== undefined) vals.push(n);
      }
    return vals;
  };

  const getAllVals = () => {
    let all = [];
    for (const a of args) {
      if (typeof a === 'number') { all.push(a); continue; }
      if (typeof a === 'string' && a.includes(':')) { all = all.concat(getRange(a)); continue; }
      const n = parseFloat(a);
      if (!isNaN(n)) { all.push(n); continue; }
      const id = parseDLCellId(String(a).trim());
      if (id) { const v = dlGetCellNum(id.r, id.c); if (v !== undefined) all.push(v); }
    }
    return all;
  };

  const nums = args.map(a => {
    if (typeof a === 'number') return a;
    if (typeof a === 'string' && a.includes(':')) return getRange(a);
    const n = parseFloat(a);
    if (!isNaN(n)) return n;
    const id = parseDLCellId(String(a).trim());
    if (id) return dlGetCellNum(id.r, id.c) ?? 0;
    return 0;
  }).flat();

  const getStr = (a) => {
    if (!a) return '';
    a = a.trim().replace(/^["']|["']$/g, '');
    const id = parseDLCellId(a.toUpperCase());
    if (id) return dlGetCellStr(id.r, id.c) || String(dlGetCellNum(id.r, id.c) || '');
    if (a.includes(':')) {
      const parts = a.split(':');
      const id1 = parseDLCellId(parts[0].trim()), id2 = parseDLCellId(parts[1].trim());
      if (!id1 || !id2) return a;
      const vals = [];
      for (let r = id1.r; r <= id2.r; r++)
        for (let c = id1.c; c <= id2.c; c++)
          vals.push(dlGetCellStr(r, c) || '');
      return vals.join('');
    }
    return a;
  };

  switch (func) {
    case 'SUM': case 'AVG': case 'AVERAGE': case 'MAX': case 'MIN': case 'COUNT': case 'COUNTA': {
  const allNums = [];
  for (const a of args) {
    if (typeof a === 'number') { allNums.push(a); continue; }
    if (typeof a === 'string' && a.includes(':')) { allNums.push(...getRange(a)); continue; }
    const n = parseFloat(a);
    if (!isNaN(n)) allNums.push(n);
    else {
      const id = parseDLCellId(String(a).trim());
      if (id) { const v = dlGetCellNum(id.r, id.c); if (v !== undefined) allNums.push(v); }
    }
  }
  if (func === 'SUM') return allNums.reduce((a,b)=>a+b,0);
  if (func === 'AVG' || func === 'AVERAGE') return allNums.length ? allNums.reduce((a,b)=>a+b,0)/allNums.length : 0;
  if (func === 'MAX') return allNums.length ? Math.max(...allNums) : 0;
  if (func === 'MIN') return allNums.length ? Math.min(...allNums) : 0;
  if (func === 'COUNT') return allNums.length;
  if (func === 'COUNTA') {
    let cnt = 0;
    for (const a of args) {
      if (typeof a === 'number') { cnt++; continue; }
      if (typeof a === 'string' && a.includes(':')) {
        const parts = a.split(':');
        const id1 = parseDLCellId(parts[0].trim()), id2 = parseDLCellId(parts[1].trim());
        if (id1 && id2) for (let r = id1.r; r <= id2.r; r++) for (let c = id1.c; c <= id2.c; c++) { if (dlGetCellStr(r,c)) cnt++; }
      } else if (a) cnt++;
    }
    return cnt;
  }
}
    case 'COUNTIF': {
      const rng = getRange(args[0]);
      const crit = args[1]?.replace(/^["']|["']$/g,'');
      const n = parseFloat(crit);
      return rng.filter(v => isNaN(n) ? String(v) === crit : v === n).length;
    }
    case 'PRODUCT': return nums.reduce((a,b) => a*b, 1);
    case 'SQRT': return Math.sqrt(nums[0]);
    case 'ABS': return Math.abs(nums[0]);
    case 'ROUND': return parseFloat(nums[0].toFixed(Math.round(nums[1]||0)));
    case 'ROUNDUP': { const f = Math.pow(10, Math.round(nums[1]||0)); return Math.ceil(nums[0]*f)/f; }
    case 'ROUNDDOWN': { const f = Math.pow(10, Math.round(nums[1]||0)); return Math.floor(nums[0]*f)/f; }
    case 'FLOOR': return Math.floor(nums[0] / (nums[1]||1)) * (nums[1]||1);
    case 'CEILING': return Math.ceil(nums[0] / (nums[1]||1)) * (nums[1]||1);
    case 'MOD': return nums[0] % nums[1];
    case 'POWER': return Math.pow(nums[0], nums[1]);
    case 'LOG': return Math.log10(nums[0]);
    case 'LN': return Math.log(nums[0]);
    case 'EXP': return Math.exp(nums[0]);
    case 'INT': return Math.floor(nums[0]);
    case 'SIGN': return Math.sign(nums[0]);
    case 'RAND': return Math.random();
    case 'PI': return Math.PI;
    case 'MEDIAN': { const sorted = [...nums].sort((a,b)=>a-b); const m = Math.floor(sorted.length/2); return sorted.length%2 ? sorted[m] : (sorted[m-1]+sorted[m])/2; }
    case 'STDEV': { const mean = nums.reduce((a,b)=>a+b,0)/nums.length; return Math.sqrt(nums.reduce((a,b)=>a+(b-mean)**2,0)/nums.length); }
    case 'VAR': { const mean = nums.reduce((a,b)=>a+b,0)/nums.length; return nums.reduce((a,b)=>a+(b-mean)**2,0)/nums.length; }
    case 'LARGE': {
      // ✅ BUG FIX: get the range values separately from k — nums[] includes k merged in
      const largeRange = (() => { let v = []; for (const a of args.slice(0,-1)) { if (typeof a === 'number') { v.push(a); } else if (typeof a === 'string' && a.includes(':')) { v.push(...getRange(a)); } else { const n = parseFloat(a); if (!isNaN(n)) v.push(n); } } return v; })();
      const largeK = Math.round(parseFloat(args[args.length-1])) - 1;
      return [...largeRange].sort((a,b)=>b-a)[largeK] ?? 0;
    }
    case 'SMALL': {
      // ✅ BUG FIX: same fix as LARGE
      const smallRange = (() => { let v = []; for (const a of args.slice(0,-1)) { if (typeof a === 'number') { v.push(a); } else if (typeof a === 'string' && a.includes(':')) { v.push(...getRange(a)); } else { const n = parseFloat(a); if (!isNaN(n)) v.push(n); } } return v; })();
      const smallK = Math.round(parseFloat(args[args.length-1])) - 1;
      return [...smallRange].sort((a,b)=>a-b)[smallK] ?? 0;
    }
    // String
    case 'LEN': return getStr(args[0]).length;
    case 'UPPER': return getStr(args[0]).toUpperCase();
    case 'LOWER': return getStr(args[0]).toLowerCase();
    case 'TRIM': return getStr(args[0]).trim();
    case 'LEFT': return getStr(args[0]).substring(0, Math.round(nums[1]||1));
    case 'RIGHT': { const s = getStr(args[0]); return s.substring(s.length - Math.round(nums[1]||1)); }
    // BUG FIX: MID was using wrong argument indices for start/length
    case 'MID': { const s = getStr(args[0]); const start = Math.round(parseFloat(args[1])||1)-1; const len = Math.round(parseFloat(args[2])||1); return s.substring(start, start+len); }
    case 'CONCAT': return args.map(a => getStr(a)).join('');
    case 'TEXTJOIN': { const delim = getStr(args[0]); const ignEmpty = args[1]?.toUpperCase() === 'TRUE'; return args.slice(2).map(a => getStr(a)).filter(s => ignEmpty ? s !== '' : true).join(delim); }
    case 'SUBSTITUTE': { const s2 = getStr(args[0]), from = getStr(args[1]), to = getStr(args[2]); return s2.split(from).join(to); }
    case 'FIND': case 'SEARCH': { const idx = getStr(args[1]).indexOf(getStr(args[0])); return idx >= 0 ? idx + 1 : '#N/A'; }
    case 'VALUE': return parseFloat(getStr(args[0])) || 0;
    case 'TEXT': return String(nums[0]);
    // Logical
    case 'IF': {
      // ✅ BUG FIX: args are pre-evaluated by dlEvaluate() before reaching here.
      // args[0] = already-computed condition value (number/string/bool)
      // args[1] = already-computed true-branch value
      // args[2] = already-computed false-branch value
      // Re-calling dlEvaluate() on them caused wrong results / errors.
      const cond = args[0];
      const isTrue = !!cond && cond !== 'FALSE' && cond !== 0 && cond !== '0' && cond !== '';
      const result = isTrue ? args[1] : args[2];
      if (result === undefined || result === null) return '';
      // Strip surrounding quotes if it's a raw string literal that wasn't resolved
      if (typeof result === 'string') return result.replace(/^["']|["']$/g, '');
      return result;
    }
    // ✅ BUG FIX: AND/OR/NOT/IFERROR — args are pre-evaluated, no re-evaluation needed
    case 'AND': return args.every(a => !!a && a !== 'FALSE' && a !== 0 && a !== '');
    case 'OR': return args.some(a => !!a && a !== 'FALSE' && a !== 0 && a !== '');
    case 'NOT': { const v = args[0]; return !(!!v && v !== 'FALSE' && v !== 0 && v !== ''); }
    case 'IFERROR': {
      const v = args[0];
      const isErr = v === undefined || v === null || String(v).startsWith('#') || (typeof v === 'number' && isNaN(v));
      const fallback = args[1];
      return isErr ? (typeof fallback === 'string' ? fallback.replace(/^["']|["']$/g,'') : (fallback ?? '')) : v;
    }
    case 'ISBLANK': { const id = parseDLCellId(args[0]?.trim()); if (!id) return false; const el2 = document.getElementById(`dc-${id.r}-${id.c}`); return !el2?.getAttribute('data-value'); }
    case 'ISNUMBER': return !isNaN(parseFloat(getStr(args[0])));
    case 'ISTEXT': return isNaN(parseFloat(getStr(args[0])));
    case 'RANK': {
      // ✅ BUG FIX: RANK was listed in DL_FUNCTIONS but not implemented
      const rankVal = typeof args[0] === 'number' ? args[0] : parseFloat(getStr(args[0]));
      const rankRange = getRange(typeof args[1] === 'string' ? args[1] : '');
      const rankOrder = parseFloat(args[2]) === 1 ? 1 : -1; // 0=desc(default), 1=asc
      const sorted4 = [...rankRange].sort((a,b) => rankOrder === 1 ? a-b : b-a);
      const idx = sorted4.indexOf(rankVal);
      return idx >= 0 ? idx + 1 : '#N/A';
    }
    case 'MODE': {
      // ✅ BUG FIX: MODE was listed in DL_FUNCTIONS but not implemented
      const freq = {};
      nums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
      let modeVal = nums[0], modeCount = 0;
      for (const [k,v] of Object.entries(freq)) { if (v > modeCount) { modeCount = v; modeVal = parseFloat(k); } }
      return modeVal ?? 0;
    }
    // Lookup
    case 'VLOOKUP': {
      const lookVal = parseFloat(args[0]) || getStr(args[0]);
      const [a2, b2] = args[1].split(':');
      const id1 = parseDLCellId(a2?.trim()), id2 = parseDLCellId(b2?.trim());
      const colOffset = Math.round(parseFloat(args[2])) - 1;
      if (!id1 || !id2) return '#N/A';
      for (let r = id1.r; r <= id2.r; r++) {
        const v = dlGetCellStr(r, id1.c) || String(dlGetCellNum(r, id1.c) || '');
        if (v == String(lookVal)) return dlGetCellStr(r, id1.c + colOffset) || dlGetCellNum(r, id1.c + colOffset) || '#N/A';
      }
      return '#N/A';
    }
    case 'HLOOKUP': {
      // ✅ BUG FIX: HLOOKUP was listed in DL_FUNCTIONS but not implemented
      const hlookVal = parseFloat(args[0]) || getStr(args[0]);
      const [ha2, hb2] = (typeof args[1] === 'string' ? args[1] : '').split(':');
      const hid1 = parseDLCellId(ha2?.trim()), hid2 = parseDLCellId(hb2?.trim());
      const hRowOffset = Math.round(parseFloat(args[2])) - 1;
      if (!hid1 || !hid2) return '#N/A';
      for (let c = hid1.c; c <= hid2.c; c++) {
        const v = dlGetCellStr(hid1.r, c) || String(dlGetCellNum(hid1.r, c) || '');
        if (v == String(hlookVal)) return dlGetCellStr(hid1.r + hRowOffset, c) || dlGetCellNum(hid1.r + hRowOffset, c) || '#N/A';
      }
      return '#N/A';
    }
    case 'INDEX': {
      // ✅ BUG FIX: INDEX was listed in DL_FUNCTIONS but not implemented
      const [ia2, ib2] = (typeof args[0] === 'string' ? args[0] : '').split(':');
      const iid1 = parseDLCellId(ia2?.trim()), iid2 = parseDLCellId(ib2?.trim());
      if (!iid1) return '#N/A';
      const iRow = Math.round(parseFloat(args[1])) - 1;
      const iCol = args[2] !== undefined ? Math.round(parseFloat(args[2])) - 1 : 0;
      const tr = iid1.r + iRow, tc = iid1.c + iCol;
      return dlGetCellStr(tr, tc) ?? dlGetCellNum(tr, tc) ?? '#N/A';
    }
    case 'MATCH': {
      // ✅ BUG FIX: MATCH was listed in DL_FUNCTIONS but not implemented
      const matchVal = parseFloat(args[0]) || getStr(args[0]);
      const [ma2, mb2] = (typeof args[1] === 'string' ? args[1] : '').split(':');
      const mid1 = parseDLCellId(ma2?.trim()), mid2 = parseDLCellId(mb2?.trim());
      if (!mid1 || !mid2) return '#N/A';
      for (let r = mid1.r; r <= mid2.r; r++) {
        for (let c = mid1.c; c <= mid2.c; c++) {
          const v = dlGetCellStr(r, c) || String(dlGetCellNum(r, c) || '');
          if (v == String(matchVal)) return (r - mid1.r) + (c - mid1.c) + 1;
        }
      }
      return '#N/A';
    }
    // Date
    case 'TODAY': return new Date().toLocaleDateString();
    case 'NOW': return new Date().toLocaleString();
    case 'YEAR': return new Date().getFullYear();
    case 'MONTH': return new Date().getMonth() + 1;
    case 'DAY': return new Date().getDate();
    default: throw new Error(`Unknown function: ${func}`);
  }
}

function dlParseArgs(str) {
  const args = [];
  let depth = 0, current = '';
  for (const ch of str) {
    if (ch === '(') { depth++; current += ch; }
    else if (ch === ')') { depth--; current += ch; }
    else if (ch === ',' && depth === 0) { args.push(current.trim()); current = ''; }
    else current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function parseDLCellId(id) {
  if (!id) return null;
  const m = id.trim().match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  return { r: parseInt(m[2]) - 1, c: dlColIndex(m[1].toUpperCase()) };
}

function dlColIndex(letters) {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function dlGetCellNum(r, c) {
  const el = document.getElementById(`dc-${r}-${c}`);
  if (!el) return undefined;
  // Try raw numeric first (strip currency symbols)
  const rawVal = el.getAttribute('data-raw') || '';
  const n = parseFloat(rawVal);
  if (!isNaN(n)) return n;
  const dv = parseFloat(el.getAttribute('data-value') || el.value);
  return isNaN(dv) ? undefined : dv;
}

function dlGetCellStr(r, c) {
  const el = document.getElementById(`dc-${r}-${c}`);
  if (!el) return undefined;
  return el.getAttribute('data-value') || el.value || undefined;
}

function dlRecalcAll() {
  for (const key in DL.data) {
    const [r, c] = key.split('-').map(Number);
    const cellData = DL.data[key];
    if (cellData.formula) {
      const el = document.getElementById(`dc-${r}-${c}`);
      if (el) {
        try {
          const result = dlEvaluate(cellData.formula.substring(1));
          const display = formatDLResult(result);
          cellData.value = display;
          el.value = display;
          el.setAttribute('data-value', display);
          el.setAttribute('readonly', '');  // ✅ BUG FIX: ensure cell returns to readonly after recalc
          el.className = 'dl-cell-input formula-cell';
        } catch {
          el.value = '#ERR!';
          el.setAttribute('readonly', '');  // ✅ BUG FIX: same for error state
          el.className = 'dl-cell-input error-cell';
        }
      }
    }
  }
}

// ── Mouse Selection ─────────────────────────────────────────
function dlMouseDown(e, r, c) {
  if (DL.formulaMode && DL.activeInput) {
    e.preventDefault();
    e.stopPropagation();
    DL.isSelecting = true;
    DL.selStart = {r, c};
    DL.selEnd = {r, c};
    let val = DL.activeInput.value;
    const refRegex = /([A-Z]+\d+(:[A-Z]+\d+)?)$/;
    if (refRegex.test(val)) {
      DL._originalFormulaStr = val.replace(refRegex, '');
    } else {
      DL._originalFormulaStr = val;
    }
    dlUpdateRangeInInput(r, c, r, c);
    dlHighlightRange(r, c, r, c);
  } else {
    if (DL.activeInput && DL.activeCell) {
      const prevEl = document.getElementById(`dc-${DL.activeCell.r}-${DL.activeCell.c}`);
      if (prevEl) {
        prevEl.setAttribute('readonly', '');
        dlCommitCell(prevEl, DL.activeCell.r, DL.activeCell.c);
      }
    }
    DL.isSelecting = true;
    DL.selStart = {r, c};
    DL.selEnd = {r, c};
    DL.activeCell = {r, c};
    DL.activeInput = document.getElementById(`dc-${r}-${c}`);
    if (!e.shiftKey) dlClearHighlights();
    const td = document.getElementById(`dt-${r}-${c}`);
    if (td) td.classList.add('active-cell');
    dlHighlightRange(r, c, r, c);

    const key = `${r}-${c}`;
    const cellData = DL.data[key] || {};
    const displayVal = cellData.formula || cellData.raw || '';
    const cellRef = document.getElementById('dl-cell-ref');
    const formulaBar = document.getElementById('dl-formula-input');
    if (cellRef) cellRef.textContent = dlColLetter(c) + (r + 1);
    if (formulaBar) formulaBar.value = displayVal;
    const typeSelect = document.getElementById('dl-cell-type');
    if (typeSelect) typeSelect.value = cellData.type || 'auto';
    dlUpdateStatusBar();
    dlUpdateFmtButtons();
  }
}

function dlMouseEnter(e, r, c) {
  if (!DL.isSelecting || !DL.selStart) return;
  DL.selEnd = {r, c};
  dlClearHighlights();
  const minR = Math.min(DL.selStart.r, r), maxR = Math.max(DL.selStart.r, r);
  const minC = Math.min(DL.selStart.c, c), maxC = Math.max(DL.selStart.c, c);
  const td = document.getElementById(`dt-${DL.selStart.r}-${DL.selStart.c}`);
  if (td) td.classList.add('active-cell');
  dlHighlightRange(minR, minC, maxR, maxC);
  if (DL.formulaMode && DL.activeInput) {
    dlUpdateRangeInInput(minR, minC, maxR, maxC);
  }
  dlUpdateStatusBar();
}

function dlMouseUp() {
  DL.isSelecting = false;
  DL._originalFormulaStr = null;
}

function dlUpdateRangeInInput(r1, c1, r2, c2) {
  if (!DL.activeInput) return;
  const ref1 = dlColLetter(c1) + (r1 + 1);
  const ref2 = dlColLetter(c2) + (r2 + 1);
  const range = (r1 === r2 && c1 === c2) ? ref1 : `${ref1}:${ref2}`;
  if (typeof DL._originalFormulaStr !== 'string') {
    DL._originalFormulaStr = DL.activeInput.value;
  }
  let base = DL._originalFormulaStr;
  if (base.startsWith('=')) {
    DL.activeInput.value = base + range;
  } else {
    DL.activeInput.value = '=' + range;
  }
  const fb = document.getElementById('dl-formula-input');
  if (fb) fb.value = DL.activeInput.value;
}

function dlHighlightRange(r1, c1, r2, c2) {
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) {
      const td = document.getElementById(`dt-${r}-${c}`);
      if (td) td.classList.add('range-select');
    }
}

function dlClearHighlights() {
  document.querySelectorAll('.dl-td.range-select, .dl-td.active-cell').forEach(el => {
    el.classList.remove('range-select', 'active-cell');
  });
}

// ── Header Clicks ───────────────────────────────────────────
function dlHeaderColClick(c) {
  DL.selStart = {r:0, c};
  DL.selEnd = {r: DL.rows-1, c};
  dlClearHighlights();
  dlHighlightRange(0, c, DL.rows-1, c);
  dlUpdateStatusBar();
}

function dlHeaderRowClick(r) {
  DL.selStart = {r, c:0};
  DL.selEnd = {r, c: DL.cols-1};
  dlClearHighlights();
  dlHighlightRange(r, 0, r, DL.cols-1);
  dlUpdateStatusBar();
}

// ── Row/Col Resize ──────────────────────────────────────────
function setupDLResize() {
  document.addEventListener('mousemove', (e) => {
    if (DL._resizingCol !== null) {
      const delta = e.clientX - DL._resizeStartX;
      const newW = Math.max(40, DL._resizeStartSize + delta);
      DL.colWidths[DL._resizingCol] = newW;
      // Live update all cells in this col
      document.querySelectorAll(`[data-col="${DL._resizingCol}"]`).forEach(th => {
        th.style.width = newW + 'px';
        th.style.minWidth = newW + 'px';
      });
      for (let r = 0; r < DL.rows; r++) {
        const td = document.getElementById(`dt-${r}-${DL._resizingCol}`);
        if (td) { td.style.width = newW + 'px'; td.style.maxWidth = newW + 'px'; }
      }
    }
    if (DL._resizingRow !== null) {
      const delta = e.clientY - DL._resizeStartY;
      const newH = Math.max(18, DL._resizeStartSize + delta);
      DL.rowHeights[DL._resizingRow] = newH;
      const tr = document.querySelector(`tr[data-row="${DL._resizingRow}"]`);
      if (tr) tr.style.height = newH + 'px';
      for (let c = 0; c < DL.cols; c++) {
        const td = document.getElementById(`dt-${DL._resizingRow}-${c}`);
        if (td) td.style.height = newH + 'px';
      }
    }
  });
  document.addEventListener('mouseup', () => {
    DL._resizingCol = null;
    DL._resizingRow = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Mouse table එකෙන් එළියට ගිහිල්ලා release කළාත් selection නවතිනවා
    DL.isSelecting = false;
    DL._originalFormulaStr = null;
  });
}

function dlStartColResize(e, col) {
  e.stopPropagation();
  e.preventDefault();
  DL._resizingCol = col;
  DL._resizeStartX = e.clientX;
  const th = document.querySelector(`th[data-col="${col}"]`);
  DL._resizeStartSize = th ? th.offsetWidth : (DL.colWidths[col] || 80);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function dlStartRowResize(e, row) {
  e.stopPropagation();
  e.preventDefault();
  DL._resizingRow = row;
  DL._resizeStartY = e.clientY;
  const tr = document.querySelector(`tr[data-row="${row}"]`);
  DL._resizeStartSize = tr ? tr.offsetHeight : (DL.rowHeights[row] || 26);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
}

// ── Auto-detect Header Row ──────────────────────────────────
function dlAutoDetectHeader() {
  // Heuristic: find the first row where most cells are non-numeric strings
  let bestRow = 0;
  let bestScore = -1;
  for (let r = 0; r < Math.min(5, DL.rows); r++) {
    let textCount = 0, totalCount = 0;
    for (let c = 0; c < DL.cols; c++) {
      const el = document.getElementById(`dc-${r}-${c}`);
      if (!el) continue;
      const v = el.getAttribute('data-value') || el.value || '';
      if (v) {
        totalCount++;
        if (isNaN(parseFloat(v))) textCount++;
      }
    }
    if (totalCount > 0) {
      const score = textCount / totalCount;
      if (score > bestScore) { bestScore = score; bestRow = r; }
    }
  }
  // Apply thead formatting to best row
  dlPushUndo();
  for (let c = 0; c < DL.cols; c++) {
    const key = `${bestRow}-${c}`;
    const el = document.getElementById(`dc-${bestRow}-${c}`);
    if (!el) continue;
    const v = el.getAttribute('data-value') || el.value || '';
    if (!v) continue;
    if (!DL.fmt[key]) DL.fmt[key] = {};
    DL.fmt[key].thead = true;
    DL.fmt[key].bold = true;
  }
  dlRenderTable();
  dlShowToast(`Header row detected: Row ${bestRow + 1}`, 'success');
}

// ── Suggestions & Help ──────────────────────────────────────
function showDLSuggestions(el, query) {
  const funcName = query.split(/[^A-Z]/)[0];
  if (!funcName || query.includes('(')) { hideDLSuggestions(); return; }
  // Built-in functions + custom functions (calcVars) දෙකම search කිරීම
  const customFnNames = (typeof calcVars !== 'undefined')
    ? Object.keys(calcVars).filter(k => typeof calcVars[k] === 'function').map(k => k.toUpperCase())
    : [];
  const allFunctions = [...DL_FUNCTIONS, ...customFnNames];
  const matches = allFunctions.filter(f => f.startsWith(funcName));
  if (!matches.length) { hideDLSuggestions(); return; }

  const box = document.getElementById('dl-sug-box');
  box.innerHTML = matches.slice(0,8).map((m) =>
    `<div class="dl-sug-item" onmousedown="dlApplySuggestion('${m}')">${m} <span>${DL_FUNC_DOCS[m] ? '...' : ''}</span></div>`
  ).join('');
  box.style.display = 'block';
  const rect = el.getBoundingClientRect();
  // ✅ BUG FIX: clamp box position so all items are visible — flip above if not enough space below
  const boxH = Math.min(220, matches.slice(0,8).length * 34 + 8);
  const spaceBelow = window.innerHeight - rect.bottom - 4;
  const top = spaceBelow >= boxH ? rect.bottom + 2 : rect.top - boxH - 2;
  box.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  box.style.top = Math.max(4, top) + 'px';
}

function dlApplySuggestion(func) {
  if (!DL.activeInput) return;
  // Custom function නම් lowercase වලින් apply කිරීම
  const isCustom = typeof calcVars !== 'undefined' && typeof calcVars[func.toLowerCase()] === 'function';
  DL.activeInput.value = `=${isCustom ? func.toLowerCase() : func}(`;
  const fb = document.getElementById('dl-formula-input');
  if (fb) fb.value = DL.activeInput.value;
  hideDLSuggestions();
  DL.formulaMode = true;
  setTimeout(() => DL.activeInput?.focus(), 10);
}

function hideDLSuggestions() {
  const box = document.getElementById('dl-sug-box');
  if (box) box.style.display = 'none';
}

function showDLFuncHelp(formula) {
  const helpEl = document.getElementById('dl-func-help');
  if (!helpEl) return;
  const match = formula.substring(1).toUpperCase().match(/^([A-Z]+)\(/);
  if (match && DL_FUNC_DOCS[match[1]]) {
    helpEl.textContent = DL_FUNC_DOCS[match[1]];
  } else {
    helpEl.textContent = '';
  }
}

// ── Undo / Redo ─────────────────────────────────────────────
function dlPushUndo() {
  DL.undoStack.push(JSON.stringify({data: DL.data, fmt: DL.fmt, colWidths: DL.colWidths, rowHeights: DL.rowHeights}));
  if (DL.undoStack.length > 50) DL.undoStack.shift();
  DL.redoStack = [];
}

function dlUndo() {
  if (!DL.undoStack.length) return;
  DL.redoStack.push(JSON.stringify({data: DL.data, fmt: DL.fmt, colWidths: DL.colWidths, rowHeights: DL.rowHeights}));
  const state = JSON.parse(DL.undoStack.pop());
  DL.data = state.data;
  DL.fmt = state.fmt || {};
  DL.colWidths = state.colWidths || {};
  DL.rowHeights = state.rowHeights || {};
  dlRenderTable();
  dlShowToast('Undo', 'info');
}

function dlRedo() {
  if (!DL.redoStack.length) return;
  DL.undoStack.push(JSON.stringify({data: DL.data, fmt: DL.fmt, colWidths: DL.colWidths, rowHeights: DL.rowHeights}));
  const state = JSON.parse(DL.redoStack.pop());
  DL.data = state.data;
  DL.fmt = state.fmt || {};
  DL.colWidths = state.colWidths || {};
  DL.rowHeights = state.rowHeights || {};
  dlRenderTable();
  dlShowToast('Redo', 'info');
}

// ── Row / Col Operations ────────────────────────────────────
function dlAddRow() { dlPushUndo(); DL.rows++; dlRenderTable(); }
function dlAddCol() { dlPushUndo(); DL.cols++; dlRenderTable(); }

function dlDeleteRow() {
  if (!DL.activeCell || DL.rows <= 1) return;
  dlPushUndo();
  const delRow = DL.activeCell.r;
  const newData = {}, newFmt = {};
  for (const key in DL.data) {
    const [r, c] = key.split('-').map(Number);
    if (r === delRow) continue;
    const newR = r > delRow ? r - 1 : r;
    newData[`${newR}-${c}`] = DL.data[key];
  }
  for (const key in DL.fmt) {
    const [r, c] = key.split('-').map(Number);
    if (r === delRow) continue;
    const newR = r > delRow ? r - 1 : r;
    newFmt[`${newR}-${c}`] = DL.fmt[key];
  }
  DL.data = newData; DL.fmt = newFmt;
  DL.rows--;
  dlRenderTable();
  dlShowToast('Row deleted');
}

function dlDeleteCol() {
  if (!DL.activeCell || DL.cols <= 1) return;
  dlPushUndo();
  const delCol = DL.activeCell.c;
  const newData = {}, newFmt = {};
  for (const key in DL.data) {
    const [r, c] = key.split('-').map(Number);
    if (c === delCol) continue;
    const newC = c > delCol ? c - 1 : c;
    newData[`${r}-${newC}`] = DL.data[key];
  }
  for (const key in DL.fmt) {
    const [r, c] = key.split('-').map(Number);
    if (c === delCol) continue;
    const newC = c > delCol ? c - 1 : c;
    newFmt[`${r}-${newC}`] = DL.fmt[key];
  }
  DL.data = newData; DL.fmt = newFmt;
  DL.cols--;
  dlRenderTable();
  dlShowToast('Column deleted');
}

// ── Copy / Paste / Cut ──────────────────────────────────────
function dlGetSelectionRange() {
  if (!DL.selStart || !DL.selEnd) return null;
  return {
    r1: Math.min(DL.selStart.r, DL.selEnd.r),
    c1: Math.min(DL.selStart.c, DL.selEnd.c),
    r2: Math.max(DL.selStart.r, DL.selEnd.r),
    c2: Math.max(DL.selStart.c, DL.selEnd.c),
  };
}

function dlCopyCells() {
  const sel = dlGetSelectionRange() || (DL.activeCell ? {r1:DL.activeCell.r,c1:DL.activeCell.c,r2:DL.activeCell.r,c2:DL.activeCell.c} : null);
  if (!sel) return;
  DL.copyBuffer = { sel, data: {}, fmt: {}, cut: false };
  for (let r = sel.r1; r <= sel.r2; r++)
    for (let c = sel.c1; c <= sel.c2; c++) {
      DL.copyBuffer.data[`${r-sel.r1}-${c-sel.c1}`] = DL.data[`${r}-${c}`] || null;
      DL.copyBuffer.fmt[`${r-sel.r1}-${c-sel.c1}`] = DL.fmt[`${r}-${c}`] || null;
    }
  dlClearHighlights();
  dlHighlightRange(sel.r1, sel.c1, sel.r2, sel.c2);
  dlShowToast('Copied!', 'success');
}

function dlCutCells() { dlCopyCells(); if (DL.copyBuffer) DL.copyBuffer.cut = true; }

function dlPasteCells() {
  if (!DL.copyBuffer || !DL.activeCell) return;
  dlPushUndo();
  const {r, c} = DL.activeCell;
  const { sel, data, fmt, cut } = DL.copyBuffer;
  const rows = sel.r2 - sel.r1 + 1;
  const cols = sel.c2 - sel.c1 + 1;
  for (let dr = 0; dr < rows; dr++)
    for (let dc = 0; dc < cols; dc++) {
      const k = `${r+dr}-${c+dc}`;
      if (data[`${dr}-${dc}`]) {
        DL.data[k] = {...data[`${dr}-${dc}`]};
      } else {
        delete DL.data[k];  // ✅ BUG FIX: delete instead of assigning undefined
      }
      if (fmt[`${dr}-${dc}`]) DL.fmt[k] = {...fmt[`${dr}-${dc}`]};
    }
  if (cut) {
    for (let dr = 0; dr < rows; dr++)
      for (let dc = 0; dc < cols; dc++) {
        delete DL.data[`${sel.r1+dr}-${sel.c1+dc}`];
        delete DL.fmt[`${sel.r1+dr}-${sel.c1+dc}`];
      }
    DL.copyBuffer = null;
  }
  dlRenderTable();
  dlShowToast('Pasted!', 'success');
}

// ── Sort ────────────────────────────────────────────────────
function dlSortByCol(c) {
  DL.sortCol = c;
  // ✅ BUG FIX: determine current dir before toggling so first click = ascending
  const newDir = DL.sortDir === 1 ? -1 : 1;
  DL.sortDir = newDir;
  dlSort(newDir === 1 ? 'asc' : 'desc');
}

function dlSort(dir) {
  if (!DL.activeCell) { dlShowToast('Click a cell in the column to sort', 'warn'); return; }
  dlPushUndo();
  const sortC = DL.activeCell.c;
  DL.sortCol = sortC;
  DL.sortDir = dir === 'asc' ? 1 : -1;
  const rowIndices = Array.from({length: DL.rows}, (_, i) => i).filter(r => !DL.hiddenRows.has(r));
  const getVal = (r) => {
    const el = document.getElementById(`dc-${r}-${sortC}`);
    return el ? (el.getAttribute('data-raw') || el.getAttribute('data-value') || el.value || '') : '';
  };
  rowIndices.sort((a, b) => {
    const va = getVal(a), vb = getVal(b);
    const na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) return (na - nb) * DL.sortDir;
    return va.localeCompare(vb) * DL.sortDir;
  });
  const oldData = JSON.parse(JSON.stringify(DL.data));
  const oldFmt = JSON.parse(JSON.stringify(DL.fmt));
  const newData = {}, newFmt = {};
  rowIndices.forEach((oldR, newR) => {
    for (let c = 0; c < DL.cols; c++) {
      if (oldData[`${oldR}-${c}`]) newData[`${newR}-${c}`] = oldData[`${oldR}-${c}`];
      if (oldFmt[`${oldR}-${c}`]) newFmt[`${newR}-${c}`] = oldFmt[`${oldR}-${c}`];
    }
  });
  DL.data = newData; DL.fmt = newFmt;
  dlRenderTable();
  dlShowToast(`Sorted ${dir === 'asc' ? 'A→Z' : 'Z→A'} by ${dlColLetter(sortC)}`);
}

// ── Filter / Search ─────────────────────────────────────────
function dlOpenFilter() {
  const bar = document.getElementById('dl-filter-bar');
  bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

function dlApplyFilter(query) {
  DL.hiddenRows.clear();
  if (!query) {
    document.querySelectorAll('.dl-tr').forEach(tr => tr.classList.remove('dl-row-hidden'));
    return;
  }
  query = query.toLowerCase();
  // ✅ BUG FIX: start from row 0 — detect header row and always keep it visible
  const headerRow = dlGetHeaderRow();
  for (let r = 0; r < DL.rows; r++) {
    if (r === headerRow) continue; // always show header
    let match = false;
    for (let c = 0; c < DL.cols; c++) {
      const el = document.getElementById(`dc-${r}-${c}`);
      if (el && (el.getAttribute('data-value') || el.value || '').toLowerCase().includes(query)) { match = true; break; }
    }
    const tr = document.querySelector(`tr[data-row="${r}"]`);
    if (tr) tr.classList.toggle('dl-row-hidden', !match);
    if (!match) DL.hiddenRows.add(r);
  }
  dlUpdateStatusBar();
}

function dlClearFilter() {
  DL.hiddenRows.clear();
  const input = document.getElementById('dl-filter-input');
  if (input) input.value = '';
  document.querySelectorAll('.dl-tr').forEach(tr => tr.classList.remove('dl-row-hidden'));
  const bar = document.getElementById('dl-filter-bar');
  if (bar) bar.style.display = 'none';  // ✅ BUG FIX: null-check before accessing style
}

// ── Find & Replace ──────────────────────────────────────────
function dlFindReplace() {
  const bar = document.getElementById('dl-findreplace-bar');
  bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

function dlDoReplace() {
  const find = document.getElementById('dl-find-input')?.value;
  const replace = document.getElementById('dl-replace-input')?.value || '';
  if (!find) return;
  dlPushUndo();
  let count = 0;
  for (let r = 0; r < DL.rows; r++)
    for (let c = 0; c < DL.cols; c++) {
      const el = document.getElementById(`dc-${r}-${c}`);
      if (!el) continue;
      const val = el.getAttribute('data-value') || el.value || '';
      if (val.includes(find)) {
        const newVal = val.split(find).join(replace);
        const key = `${r}-${c}`;
        DL.data[key] = { raw: newVal, value: newVal };
        el.value = newVal;
        el.setAttribute('data-value', newVal);
        count++;
      }
    }
  dlShowToast(`Replaced ${count} occurrence(s)`);
}

// ── Fill Down / Right ───────────────────────────────────────
function dlFillDown() {
  if (!DL.activeCell) return;
  const sel = dlGetSelectionRange();
  if (!sel || sel.r1 === sel.r2) return;
  dlPushUndo();
  for (let c = sel.c1; c <= sel.c2; c++) {
    const src = DL.data[`${sel.r1}-${c}`];
    for (let r = sel.r1 + 1; r <= sel.r2; r++) {
      if (src) {
        DL.data[`${r}-${c}`] = {...src};
      } else {
        delete DL.data[`${r}-${c}`];  // ✅ BUG FIX: delete instead of assigning undefined
      }
    }
  }
  dlRenderTable();
  dlShowToast('Filled down');
}

// ✅ NEW FUNCTION — add near dlFillDown()
function dlFillDownSelection() {
  const sel = dlGetSelectionRange();
  if (!sel) return;
  const topKey = `${sel.r1}-${sel.c1}`;
  const topData = DL.data[topKey];
  if (!topData?.formula && !topData?.raw) return;

  dlPushUndo();
  const baseFormula = topData.formula || topData.raw;

  for (let r = sel.r1 + 1; r <= sel.r2; r++) {
    const delta = r - sel.r1;
    const shifted = dlShiftFormulaRows(baseFormula, delta);
    const key = `${r}-${sel.c1}`;
    DL.data[key] = { raw: shifted, formula: shifted.startsWith('=') ? shifted : undefined };
    try {
      if (shifted.startsWith('=')) {
        const result = dlEvaluate(shifted.substring(1));
        DL.data[key].value = formatDLResult(result);
        DL.data[key].formula = shifted;
      } else {
        DL.data[key].value = shifted;
        delete DL.data[key].formula;
      }
    } catch {
      DL.data[key].value = '#ERR!';
    }
  }
  dlRenderTable();
  dlShowToast(`Filled down ${sel.r2 - sel.r1} rows!`, 'success');
}

function dlFillRight() {
  if (!DL.activeCell) return;
  const sel = dlGetSelectionRange();
  if (!sel || sel.c1 === sel.c2) return;
  dlPushUndo();
  for (let r = sel.r1; r <= sel.r2; r++) {
    const src = DL.data[`${r}-${sel.c1}`];
    for (let c = sel.c1 + 1; c <= sel.c2; c++) {
      if (src) {
        DL.data[`${r}-${c}`] = {...src};
      } else {
        delete DL.data[`${r}-${c}`];  // ✅ BUG FIX: delete instead of assigning undefined
      }
    }
  }
  dlRenderTable();
  dlShowToast('Filled right');
}

// ── Status Bar ──────────────────────────────────────────────
function dlUpdateStatusBar() {
  const sel = dlGetSelectionRange();
  const selInfo = document.getElementById('dl-sel-info');
  const sumInfo = document.getElementById('dl-sum-info');
  const avgInfo = document.getElementById('dl-avg-info');
  const cntInfo = document.getElementById('dl-cnt-info');
  const typeInfo = document.getElementById('dl-type-info');

  if (DL.activeCell && typeInfo) {
    const key = `${DL.activeCell.r}-${DL.activeCell.c}`;
    const t = DL.data[key]?.type || 'auto';
    typeInfo.textContent = 'Type: ' + (DL_TYPES[t]?.label || t);
  }

  if (!sel) {
    if (selInfo) selInfo.textContent = DL.activeCell ? `${dlColLetter(DL.activeCell.c)}${DL.activeCell.r+1}` : 'No selection';
    return;
  }

  let nums = [];
  for (let r = sel.r1; r <= sel.r2; r++)
    for (let c = sel.c1; c <= sel.c2; c++) {
      const v = dlGetCellNum(r, c);
      if (v !== undefined) nums.push(v);
    }

  if (selInfo) selInfo.textContent = `${dlColLetter(sel.c1)}${sel.r1+1}:${dlColLetter(sel.c2)}${sel.r2+1}`;
  if (nums.length) {
    const sum = nums.reduce((a,b)=>a+b,0);
    if (sumInfo) sumInfo.textContent = `Sum: ${formatDLResult(sum)}`;
    if (avgInfo) avgInfo.textContent = `Avg: ${formatDLResult(sum/nums.length)}`;
    if (cntInfo) cntInfo.textContent = `Count: ${nums.length}`;
  } else {
    if (sumInfo) sumInfo.textContent = 'Sum: 0';
    if (avgInfo) avgInfo.textContent = 'Avg: 0';
    if (cntInfo) cntInfo.textContent = 'Count: 0';
  }
}

// ── Clear All ───────────────────────────────────────────────
function dlClearAll() {
  if (!confirm('සම්පූර්ණ Data Lab හිස් කරන්නද?')) return;
  dlPushUndo();
  DL.data = {};
  dlRenderTable();
  dlShowToast('Cleared', 'warn');
}

// ── Export CSV ──────────────────────────────────────────────
function dlExportCSV() {
  let csv = '';
  for (let r = 0; r < DL.rows; r++) {
    const row = [];
    for (let c = 0; c < DL.cols; c++) {
      const el = document.getElementById(`dc-${r}-${c}`);
      const val = el ? (el.getAttribute('data-value') || el.value || '') : '';
      row.push(val.includes(',') ? `"${val}"` : val);
    }
    if (row.some(v => v)) csv += row.join(',') + '\n';
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'datalab.csv';
  a.click();
  dlShowToast('CSV exported!', 'success');
}

function dlExportExcel() {
  let html = '<table><tr>';
  for (let c = 0; c < DL.cols; c++) html += `<th>${dlColLetter(c)}</th>`;
  html += '</tr>';
  for (let r = 0; r < DL.rows; r++) {
    const row = [];
    let hasData = false;
    for (let c = 0; c < DL.cols; c++) {
      const el = document.getElementById(`dc-${r}-${c}`);
      const val = el ? (el.getAttribute('data-value') || el.value || '') : '';
      row.push(val);
      if (val) hasData = true;
    }
    if (hasData) html += '<tr>' + row.map(v => `<td>${v}</td>`).join('') + '</tr>';
  }
  html += '</table>';
  const blob = new Blob([`<html><body>${html}</body></html>`], {type:'application/vnd.ms-excel'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'datalab.xls';
  a.click();
  dlShowToast('Excel exported!', 'success');
}

function dlImportCSV() { document.getElementById('dl-import-file').click(); }

function dlHandleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    dlPushUndo();
    DL.data = {};
    const lines = ev.target.result.split('\n').filter(l => l.trim());
    DL.rows = Math.max(20, lines.length + 2);
    lines.forEach((line, r) => {
      const cells = line.match(/("([^"]*)"|[^,]*)(,|$)/g) || [];
      DL.cols = Math.max(DL.cols, cells.length);
      cells.forEach((cell, c) => {
        const val = cell.replace(/,$/, '').replace(/^"|"$/g, '').trim();
        if (val) DL.data[`${r}-${c}`] = { raw: val, value: val };
      });
    });
    DL.cols = Math.max(10, DL.cols);
    dlRenderTable();
    dlShowToast(`Imported ${lines.length} rows!`, 'success');
  };
  reader.readAsText(file);
  e.target.value = '';
}

function dlCopyToEditor() {
  let html = '<table style="border-collapse:collapse;width:100%">';
  for (let r = 0; r < DL.rows; r++) {
    const rowHasData = Array.from({length: DL.cols}, (_, c) => DL.data[`${r}-${c}`]).some(v => v);
    if (!rowHasData) continue;
    const isHeader = Array.from({length: DL.cols}, (_, c) => DL.fmt[`${r}-${c}`]?.thead).some(v => v);
    const tag = isHeader ? 'th' : 'td';
    html += '<tr>';
    for (let c = 0; c < DL.cols; c++) {
      const hasColData = Array.from({length: DL.rows}, (_, rr) => DL.data[`${rr}-${c}`]).some(v => v);
      if (!hasColData) continue;
      const el = document.getElementById(`dc-${r}-${c}`);
      const val = el ? (el.getAttribute('data-value') || el.value || '') : '';
      const style = isHeader ? 'border:1px solid #444;padding:6px 10px;background:#1c1c24;color:#a78bfa;font-size:12px' : 'border:1px solid #333;padding:5px 10px;font-size:12px';
      html += `<${tag} style="${style}">${val}</${tag}>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  const ed = document.getElementById('ed');
  if (ed) {
    ed.focus();
    document.execCommand('insertHTML', false, html);
    dlShowToast('Table inserted into editor!', 'success');
    closeDataLab();
  }
}

// ── Advanced Chart ───────────────────────────────────────────
// Auto-detect chart columns from actual data
// line 1851 — dlAutoFillChartCols() function replace with:
function dlAutoFillChartCols() {
  const colsWithData = [];
  for (let c = 0; c < DL.cols; c++) {
    let hasData = false;
    for (let r = 0; r < DL.rows; r++) {
      const v = dlGetCellStr(r, c);
      if (v && v !== '') { hasData = true; break; }
    }
    if (hasData) colsWithData.push(c);
  }
  if (!colsWithData.length) { dlShowToast('No data found in spreadsheet', 'warn'); return; }

  const labelInput = document.getElementById('dl-chart-label-col');
  const dataInput = document.getElementById('dl-chart-dataset-cols');
  if (labelInput) labelInput.value = dlColLetter(colsWithData[0]);
  if (dataInput) {
    const dataCols = colsWithData.slice(1);
    dataInput.value = dataCols.length ? dataCols.map(c => dlColLetter(c)).join(',') : dlColLetter(colsWithData[0]);
  }

  // ✅ NEW: render interactive column toggle buttons
  dlRenderColToggles(colsWithData);

  dlShowToast('Columns auto-detected!', 'success');
}

// ✅ NEW FUNCTION — add after dlAutoFillChartCols() (after line 1873)
function dlRenderColToggles(colsWithData) {
  const container = document.getElementById('dl-col-toggles');
  if (!container) return;

  const labelVal = document.getElementById('dl-chart-label-col')?.value?.trim() || 'A';
  const dataVal  = document.getElementById('dl-chart-dataset-cols')?.value?.trim() || '';
  const dataCols = dataVal.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  container.innerHTML = colsWithData.map(c => {
    const letter = dlColLetter(c);
    const isLabel  = letter === labelVal.toUpperCase();
    const isData   = dataCols.includes(letter);
    const cls = isLabel ? 'dl-col-toggle label-col' : isData ? 'dl-col-toggle data-col' : 'dl-col-toggle';
    const title = isLabel ? 'Label column' : isData ? 'Data column (click to remove)' : 'Click to add as data column';
    return `<button class="${cls}" title="${title}" onclick="dlToggleChartCol('${letter}')">${letter}</button>`;
  }).join('');
}

function dlToggleChartCol(letter) {
  const labelInput = document.getElementById('dl-chart-label-col');
  const dataInput  = document.getElementById('dl-chart-dataset-cols');
  if (!labelInput || !dataInput) return;

  const currentLabel = labelInput.value.trim().toUpperCase();
  let dataCols = dataInput.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  if (letter === currentLabel) {
    // Label column clicked — swap: make it a data col, pick next as label
    const allCols = [];
    for (let c = 0; c < DL.cols; c++) allCols.push(dlColLetter(c));
    const others = allCols.filter(l => l !== letter && !dataCols.includes(l));
    if (others.length) {
      labelInput.value = others[0];
      dataCols.unshift(letter);
      dataCols = dataCols.filter(l => l !== others[0]);
    }
  } else if (dataCols.includes(letter)) {
    // Already a data col — remove it
    dataCols = dataCols.filter(l => l !== letter);
  } else {
    // Not selected — add as data col
    dataCols.push(letter);
  }

  dataInput.value = dataCols.join(',');

  // Re-render toggles with updated state
  const colsWithData = [];
  for (let c = 0; c < DL.cols; c++) {
    for (let r = 0; r < DL.rows; r++) {
      if (dlGetCellStr(r, c)) { colsWithData.push(c); break; }
    }
  }
  dlRenderColToggles(colsWithData);
}

// BUG FIX: dlUpdateChartOptions was missing
function dlUpdateChartOptions() {
  const type = document.getElementById('dl-chart-type')?.value;
  // Show/hide stacked option for bar/line only
  const stackedLabel = document.querySelector('#dl-chart-options-bar label:has(#dl-chart-stacked)');
  if (stackedLabel) {
    stackedLabel.style.opacity = ['bar','line','area'].includes(type) ? '1' : '0.3';
  }
}

function dlShowChartOptions() {
  const bar = document.getElementById('dl-chart-options-bar');
  if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

function dlGetChartColIndex(letter) {
  return dlColIndex(letter.trim().toUpperCase());
}

// Detect header row (first row with thead formatting)
function dlGetHeaderRow() {
  for (let r = 0; r < DL.rows; r++)
    for (let c = 0; c < DL.cols; c++)
      if (DL.fmt[`${r}-${c}`]?.thead) return r;
  return -1; // no header
}

function dlInsertChart() {
  const optBar = document.getElementById('dl-chart-options-bar');
  if (optBar && optBar.style.display === 'none') {
    optBar.style.display = 'flex';
    dlAutoFillChartCols(); // auto-detect and show toggles
  }
  const panel = document.getElementById('dl-chart-panel');
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';

  const canvas = document.getElementById('dl-chart-canvas');
  if (dlChartInstance) { dlChartInstance.destroy(); dlChartInstance = null; }

  const chartType = document.getElementById('dl-chart-type').value;
  const chartTitle = (document.getElementById('dl-chart-title')?.value || '').trim();
  const useHeader = document.getElementById('dl-chart-auto-header')?.checked !== false;
  const showLegend = document.getElementById('dl-chart-legend')?.checked !== false;
  const showGrid = document.getElementById('dl-chart-grid')?.checked !== false;
  const isStacked = document.getElementById('dl-chart-stacked')?.checked;
  const labelColStr = document.getElementById('dl-chart-label-col')?.value?.trim() || 'A';
  const dataColsStr = document.getElementById('dl-chart-dataset-cols')?.value?.trim() || 'B';

  const labelColIdx = dlGetChartColIndex(labelColStr);
  let dataColIdxs = dataColsStr.split(',').map(s => dlGetChartColIndex(s.trim())).filter(i => !isNaN(i) && i >= 0);

  // Auto-detect data columns if only default "B" is set and col B has no data
  if (dataColIdxs.length === 1 && dataColIdxs[0] === 1) {
    const bHasData = Array.from({length: DL.rows}, (_, r) => dlGetCellNum(r, 1)).some(v => v !== undefined);
    if (!bHasData) {
      // Auto-fill from actual data
      dlAutoFillChartCols();
      const newDataColsStr = document.getElementById('dl-chart-dataset-cols')?.value?.trim() || 'B';
      dataColIdxs = newDataColsStr.split(',').map(s => dlGetChartColIndex(s.trim())).filter(i => !isNaN(i) && i >= 0);
    }
  }

  if (!dataColIdxs.length) { dlShowToast('Valid data columns required (e.g. B,C,D)', 'warn'); return; }

  // Detect header row
  const headerRow = useHeader ? dlGetHeaderRow() : -1;
  const startRow = headerRow >= 0 ? headerRow + 1 : 0;

  // Build dataset labels from header row (if exists)
  const datasetLabels = dataColIdxs.map(ci => {
    if (headerRow >= 0) {
      const v = dlGetCellStr(headerRow, ci);
      return v || dlColLetter(ci);
    }
    return dlColLetter(ci);
  });

  // Build x-axis labels and datasets
  const xLabels = [];
  const datasets = dataColIdxs.map(() => []);

  for (let r = startRow; r < DL.rows; r++) {
    const labelEl = document.getElementById(`dc-${r}-${labelColIdx}`);
    const label = labelEl ? (labelEl.getAttribute('data-value') || labelEl.value || '') : '';
    // Check if row has any data
    const hasData = dataColIdxs.some(ci => dlGetCellNum(r, ci) !== undefined);
    if (!label && !hasData) continue;
    xLabels.push(label || `R${r+1}`);
    dataColIdxs.forEach((ci, di) => {
      const n = dlGetCellNum(r, ci);
      datasets[di].push(n ?? null);
    });
  }

  if (!xLabels.length) { dlShowToast('No data found. Check column settings.', 'warn'); return; }

  const palette = ['#a78bfa','#34d399','#93c5fd','#fbbf24','#f87171','#6ee7b7','#c4b5fd','#86efac','#fb923c','#38bdf8'];

  let type = chartType;
  let fillArr = dataColIdxs.map(() => false);
  if (chartType === 'area') { type = 'line'; fillArr = dataColIdxs.map(() => true); }

  const chartDatasets = datasets.map((data, i) => {
    const color = palette[i % palette.length];
    const isFill = fillArr[i];
    const isPie = ['pie','doughnut'].includes(type);
    return {
      label: datasetLabels[i],
      data: data,
      backgroundColor: isPie
        ? palette.slice(0, data.length)
        : (isFill ? color.replace(')', ',0.3)').replace('rgb','rgba') : color + '33'),
      borderColor: isPie ? '#1c1c24' : color,
      borderWidth: type === 'scatter' ? 0 : 2,
      fill: isFill,
      tension: 0.3,
      pointRadius: type === 'scatter' ? 5 : 3,
      pointBackgroundColor: color,
    };
  });

  const isCartesian = !['pie','doughnut','radar'].includes(type);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        labels: { color: '#e2e8f0', font: { family: 'JetBrains Mono', size: 11 } }
      },
      title: {
        display: !!chartTitle,
        text: chartTitle,
        color: '#a78bfa',
        font: { family: 'JetBrains Mono', size: 13, weight: 'bold' }
      },
      tooltip: {
        backgroundColor: '#1e1e2e',
        borderColor: '#a78bfa',
        borderWidth: 1,
        titleColor: '#a78bfa',
        bodyColor: '#e2e8f0',
        bodyFont: { family: 'JetBrains Mono' },
      }
    },
  };

  if (isCartesian) {
    options.scales = {
      x: {
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: showGrid ? '#334155' : 'transparent' }
      },
      y: {
        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: showGrid ? '#334155' : 'transparent' },
        stacked: isStacked
      }
    };
    if (isStacked && options.scales.x) options.scales.x.stacked = true;
  } else if (type === 'radar') {
    options.scales = {
      r: {
        ticks: { color: '#64748b', backdropColor: 'transparent' },
        grid: { color: '#334155' },
        pointLabels: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } }
      }
    };
  }

  const ctx = canvas.getContext('2d');
  dlChartInstance = new Chart(ctx, {
    type: type,
    data: { labels: xLabels, datasets: chartDatasets },
    options
  });

  const label = document.getElementById('dl-chart-label');
  if (label) label.textContent = (chartTitle ? `📈 ${chartTitle}` : '📈 Chart') + ` — ${chartType}`;

  document.getElementById('dl-chart-legend').innerHTML = '';
  dlShowToast(`${chartType} chart rendered!`, 'success');
}

function dlCloseChart() {
  const panel = document.getElementById('dl-chart-panel');
  if (panel) panel.style.display = 'none';
  if (dlChartInstance) { dlChartInstance.destroy(); dlChartInstance = null; }
}

function dlDownloadChart() {
  const canvas = document.getElementById('dl-chart-canvas');
  if (!canvas || !dlChartInstance) { dlShowToast('No chart to download', 'warn'); return; }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'chart.png';
  a.click();
  dlShowToast('Chart downloaded!', 'success');
}

// ── Text Formatting ─────────────────────────────────────────
function dlGetFmtSelection() {
  const sel = dlGetSelectionRange();
  if (!sel && !DL.activeCell) return [];
  if (!sel) return [{r: DL.activeCell.r, c: DL.activeCell.c}];
  const cells = [];
  for (let r = sel.r1; r <= sel.r2; r++)
    for (let c = sel.c1; c <= sel.c2; c++)
      cells.push({r, c});
  return cells;
}

function dlFmtToggle(prop) {
  const cells = dlGetFmtSelection();
  if (!cells.length) return;
  const allHave = cells.every(({r,c}) => (DL.fmt[`${r}-${c}`] || {})[prop]);
  cells.forEach(({r, c}) => {
    const key = `${r}-${c}`;
    if (!DL.fmt[key]) DL.fmt[key] = {};
    DL.fmt[key][prop] = !allHave;
  });
  dlRenderTable();
  dlUpdateFmtButtons();
}

function dlFmtAlign(dir) {
  const cells = dlGetFmtSelection();
  if (!cells.length) return;
  cells.forEach(({r, c}) => {
    const key = `${r}-${c}`;
    if (!DL.fmt[key]) DL.fmt[key] = {};
    DL.fmt[key].align = DL.fmt[key].align === dir ? null : dir;
  });
  dlRenderTable();
  dlUpdateFmtButtons();
}

function dlFmtToggleBorder() {
  const cells = dlGetFmtSelection();
  if (!cells.length) return;
  const allHave = cells.every(({r,c}) => (DL.fmt[`${r}-${c}`] || {}).border);
  cells.forEach(({r, c}) => {
    const key = `${r}-${c}`;
    if (!DL.fmt[key]) DL.fmt[key] = {};
    DL.fmt[key].border = !allHave;
  });
  dlRenderTable();
}

function dlFmtClear() {
  const cells = dlGetFmtSelection();
  cells.forEach(({r, c}) => { delete DL.fmt[`${r}-${c}`]; });
  dlRenderTable();
  dlUpdateFmtButtons();
  dlShowToast('Formatting cleared');
}

function dlUpdateFmtButtons() {
  if (!DL.activeCell) return;
  const key = `${DL.activeCell.r}-${DL.activeCell.c}`;
  const fmt = DL.fmt[key] || {};
  ['bold','italic','thead'].forEach(p => {
    const btn = document.getElementById(`dl-fmt-${p}`);
    if (btn) btn.classList.toggle('active', !!fmt[p]);
  });
  ['left','center','right'].forEach(d => {
    const btn = document.getElementById(`dl-fmt-${d}`);
    if (btn) btn.classList.toggle('active', fmt.align === d);
  });
}

// ── Context Menu ─────────────────────────────────────────────
function dlContextMenu(e, r, c) {
  e.preventDefault();
  if (!DL.selStart || (DL.selStart.r === DL.selEnd?.r && DL.selStart.c === DL.selEnd?.c)) {
    DL.activeCell = {r, c};
    DL.selStart = {r, c};
    DL.selEnd = {r, c};
    dlClearHighlights();
    const td = document.getElementById(`dt-${r}-${c}`);
    if (td) td.classList.add('active-cell');
    dlUpdateFmtButtons();
  }
  document.querySelectorAll('.dl-ctx-menu').forEach(m => m.remove());
  const typeOptions = Object.entries(DL_TYPES).map(([k,v]) =>
    `<div class="dl-ctx-item" onclick="dlSetCellType('${k}');this.closest('.dl-ctx-menu').remove()">${v.icon} ${v.label}</div>`
  ).join('');
  const menu = document.createElement('div');
  menu.className = 'dl-ctx-menu';
  menu.innerHTML = `
    <div class="dl-ctx-item" onclick="dlDblClick(${r},${c});this.closest('.dl-ctx-menu').remove()">✏️ Edit Cell</div>
    <div class="dl-ctx-sep"></div>
    <div class="dl-ctx-item" onclick="dlCopyCells();this.closest('.dl-ctx-menu').remove()">⎘ Copy</div>
    <div class="dl-ctx-item" onclick="dlCutCells();this.closest('.dl-ctx-menu').remove()">✂ Cut</div>
    <div class="dl-ctx-item" onclick="dlPasteCells();this.closest('.dl-ctx-menu').remove()">⌅ Paste</div>
    <div class="dl-ctx-sep"></div>
    <div class="dl-ctx-item" onclick="dlFmtToggle('bold');this.closest('.dl-ctx-menu').remove()"><b>B</b> Bold</div>
    <div class="dl-ctx-item" onclick="dlFmtToggle('italic');this.closest('.dl-ctx-menu').remove()"><i>I</i> Italic</div>
    <div class="dl-ctx-item" onclick="dlFmtToggle('thead');this.closest('.dl-ctx-menu').remove()">TH Header Style</div>
    <div class="dl-ctx-item" onclick="dlFmtToggleBorder();this.closest('.dl-ctx-menu').remove()">▦ Toggle Border</div>
    <div class="dl-ctx-item" onclick="dlFmtClear();this.closest('.dl-ctx-menu').remove()">✕ Clear Formatting</div>
    <div class="dl-ctx-sep"></div>
    <div class="dl-ctx-item" style="font-size:11px;color:var(--muted);padding:3px 16px">Set Type:</div>
    ${typeOptions}
    <div class="dl-ctx-sep"></div>
    <div class="dl-ctx-item danger" onclick="dlDeleteRow();this.closest('.dl-ctx-menu').remove()">− Delete Row</div>
    <div class="dl-ctx-item danger" onclick="dlDeleteCol();this.closest('.dl-ctx-menu').remove()">− Delete Column</div>
  `;
  menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 400) + 'px';
  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('mousedown', function h(ev) {
    if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', h); }
  }), 10);
}

// ── Keyboard Shortcuts ──────────────────────────────────────
function setupDLKeyboard() {
  const modal = document.getElementById('data-lab-modal');
  if (!modal) return;
  modal.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c') { e.preventDefault(); dlCopyCells(); }
      else if (e.key === 'v') { e.preventDefault(); dlPasteCells(); }
      else if (e.key === 'x') { e.preventDefault(); dlCutCells(); }
      else if (e.key === 'z') { e.preventDefault(); dlUndo(); }
      else if (e.key === 'y') { e.preventDefault(); dlRedo(); }
      else if (e.key === 'b') { e.preventDefault(); dlFmtToggle('bold'); }
      else if (e.key === 'i') { e.preventDefault(); dlFmtToggle('italic'); }
      else if (e.key === 'l') { e.preventDefault(); dlFmtAlign('left'); }
      else if (e.key === 'e') { e.preventDefault(); dlFmtAlign('center'); }
      else if (e.key === 'r') { e.preventDefault(); dlFmtAlign('right'); }
      else if (e.key === 'd') {e.preventDefault();dlFillDownSelection(); }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && DL.activeCell && !DL.formulaMode) {
      const el = document.getElementById(`dc-${DL.activeCell.r}-${DL.activeCell.c}`);
      if (el && el.hasAttribute('readonly')) {
        e.preventDefault();
        dlPushUndo();
        const sel = dlGetSelectionRange() || {r1:DL.activeCell.r,c1:DL.activeCell.c,r2:DL.activeCell.r,c2:DL.activeCell.c};
        for (let r = sel.r1; r <= sel.r2; r++)
          for (let c = sel.c1; c <= sel.c2; c++)
            delete DL.data[`${r}-${c}`];
        dlRenderTable();
      }
    }
  });
}

// ── Toast ───────────────────────────────────────────────────
function dlShowToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(dlShowToast._t);
  dlShowToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ── Legacy compatibility ────────────────────────────────────
function addTableRow() { dlAddRow(); }
function addTableCol() { dlAddCol(); }
function clearTable() { dlClearAll(); }
function calculateSum() {
  let total = 0;
  for (const key in DL.data) {
    const v = parseFloat(DL.data[key]?.raw || DL.data[key]?.value);
    if (!isNaN(v)) total += v;
  }
  const resBox = document.getElementById('data-result');
  if (resBox) resBox.innerHTML = `<strong>Total Sum: ${total}</strong>`;
}
function calculateAverage() {
  let total = 0, count = 0;
  for (const key in DL.data) {
    const v = parseFloat(DL.data[key]?.raw || DL.data[key]?.value);
    if (!isNaN(v)) { total += v; count++; }
  }
  const resBox = document.getElementById('data-result');
  if (resBox) resBox.innerHTML = `<strong>Average: ${count ? (total/count).toFixed(2) : 0}</strong>`;
}
