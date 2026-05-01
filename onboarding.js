// ============================================================
// MathWriter — First-Time User Onboarding Tour
// ============================================================
// localStorage key 'sw_onboarded_v1' check කරලා
// first visit-ල auto-show, ඊළඟ visits-ල skip.
// Manual trigger: openOnboardingTour()
// ============================================================

const ONBOARD_KEY = 'sw_onboarded_v1';

// ── Modals for extra details (Functions & Math) ──────────────

const CALC_FUNCTIONS_CONTENT = `
  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🔢 මූලික ගණිතය</div>
    <div class="ob-calc-table">
      ${[
        ['2 + 3 * 4', '14'],
        ['10 / 3', '3.333333'],
        ['2^10', '1024'],
        ['sqrt(144)', '12 — වර්ගමූලය'],
        ['cbrt(27)', '3 — ඝනමූලය'],
        ['abs(-5)', '5 — නිරපේක්ෂ අගය'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">📐 ත්‍රිකෝණමිතිය</div>
    <div class="ob-calc-table">
      ${[
        ['sin(pi/2)', '1'],
        ['cos(0)', '1'],
        ['tan(pi/4)', '1'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">📊 සංඛ්‍යාන</div>
    <div class="ob-calc-table">
      ${[
        ['mean([1,2,3,4,5])', '3 — මධ්‍යනය'],
        ['std([1,2,3,4,5])', '1.41 — සම්මත අපගමනය'],
        ['median([1,2,3])', '2 — මධ්‍යකය'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🧮 නයාස (Matrix)</div>
    <div class="ob-calc-table">
      ${[
        ['A = [[1,2],[3,4]]', 'Matrix A saved'],
        ['det(A)', '-2 — නිර්ණකය'],
        ['inv(A)', '[...] — ප්‍රතිලෝම'],
        ['transpose(A)', '[...] — අනුවර්තිත'],
        ['A * A', '[[7,10]..] — ගුණිතය'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🔣 ඒකක පරිවර්තනය</div>
    <div class="ob-calc-table">
      ${[
        ['1 km to m', '1000 m — දුර'],
        ['1 kg to g', '1000 g — ස්කන්ධය'],
        ['1 hour to min', '60 min — කාලය'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">💡 අභිරුචි ශ්‍රිත (Custom Functions)</div>
    <div class="ob-calc-table">
      ${[
        ['f(x) = x^2 + 2x + 1', "Function 'f' saved!"],
        ['f(5)', '36'],
        ['bmi(w,h) = w/h^2', "Function 'bmi' saved!"],
        ['bmi(70, 1.75)', '22.86'],
        ['compound(p,r,n) = p*(1+r)^n', "Function saved!"],
        ['compound(1000, 0.05, 10)', '1628.89'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🔢 සංඛ්‍යා ක්‍රම (Number Systems)</div>
    <div class="ob-calc-table">
      ${[
        ['bin(1010)', '10 — binary → decimal'],
        ['dec(10)', '1010 — decimal → binary'],
        ['hex(FF)', '255 — hex → decimal'],
        ['tohex(255)', 'FF — decimal → hex'],
        ['oct(17)', '15 — octal → decimal'],
        ['tooct(15)', '17 — decimal → octal'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>
`;

const SYMBOLIC_MATH_CONTENT = `
  <div class="ob-modal-section">
    <div class="ob-modal-section-title">∂ සංකේතීය ගණිතය (Symbolic Math)</div>
    <div class="ob-calc-table">
      ${[
        ['diff(3*x^2, x)', '6x — අවකලනය'],
        ['integrate(x^2, x)', 'x^3/3+C — අනුකලනය'],
        ['solve(x^2-4, x)', '[2,-2] — සමීකරණ විසඳීම'],
        ['factor(x^2-4)', '(x-2)(x+2) — සාධකීකරණය'],
        ['expand((x+1)^3)', 'x^3+... — විස්තරණය'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">✍️ Symbolic Notation (LaTeX-style)</div>
    <div class="ob-calc-table">
      ${[
        ['\\\\frac{a}{b}', 'Stacked fraction'],
        ['\\\\sum_{i=0}^{n}', 'Σ with stacked limits'],
        ['\\\\int_{a}^{b}', '∫ with limits'],
        ['\\\\sqrt{x}', '√ with overbar'],
        ['\\\\sqrt[n]{x}', 'ⁿ√ with overbar'],
        ['\\\\lim_{x \\\\to 0}', 'lim with subscript'],
        ['\\\\alpha, \\\\beta, \\\\pi', 'α β π (Greek)'],
        ['x^{2}', 'x² superscript'],
        ['x_{n}', 'xₙ subscript'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">📝 Symbolic Computation Examples</div>
    <div class="ob-calc-table">
      ${[
        ['\\\\sum_{i=0}^{3} i^2', '14'],
        ['\\\\sum_{i=1}^{10} i', '55'],
        ['\\\\prod_{i=1}^{5} i', '120 — (5!)'],
        ['\\\\int_{0}^{1} x^2 \\\\,dx', '0.333333'],
        ['\\\\int_{0}^{\\\\pi} \\\\sin x \\\\,dx', '2'],
        ['\\\\int_{1}^{3} x^3 \\\\,dx', '20'],
        ['\\\\frac{d}{dx} x^3 (x=2)', '12 — (3x²)'],
        ['\\\\frac{d^2}{dx^2} x^4 (x=2)', '48 — (12x²)'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
  </div>
`;

const DATALAB_FUNCTIONS_CONTENT = `
  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🔢 Math Functions</div>
    <div class="ob-dl-func-table">
      <div class="ob-dl-func-header"><span>Function</span><span>උදාහරණය</span><span>Result</span></div>
      ${[
        ['SUM','=SUM(A1:A5)','එකතුව'],
        ['AVG / AVERAGE','=AVG(A1:A5)','සාමාන්‍යය'],
        ['MAX','=MAX(A1:A5)','ලොකුම'],
        ['MIN','=MIN(A1:A5)','පොඩිම'],
        ['COUNT','=COUNT(A1:A5)','සංඛ්‍යා cells'],
        ['COUNTA','=COUNTA(A1:A5)','හිස් නොවන cells'],
        ['COUNTIF','=COUNTIF(A1:A5,">10")','condition cells'],
        ['PRODUCT','=PRODUCT(A1:A3)','ගුණිතය'],
        ['SQRT','=SQRT(144)','12'],
        ['ABS','=ABS(-5)','5'],
        ['ROUND','=ROUND(3.14159,2)','3.14'],
        ['ROUNDUP','=ROUNDUP(3.12,1)','3.2'],
        ['ROUNDDOWN','=ROUNDDOWN(3.99,1)','3.9'],
        ['FLOOR','=FLOOR(7,2)','6'],
        ['CEILING','=CEILING(7,2)','8'],
        ['MOD','=MOD(10,3)','1'],
        ['POWER','=POWER(2,10)','1024'],
        ['LOG','=LOG(100)','2'],
        ['LN','=LN(10)','2.302585'],
        ['EXP','=EXP(1)','2.718281'],
        ['INT','=INT(3.9)','3'],
        ['SIGN','=SIGN(-5)','-1'],
        ['RAND','=RAND()','Random 0-1'],
        ['PI','=PI()','3.141592'],
      ].map(([f,e,r])=>`
        <div class="ob-dl-func-row">
          <span class="ob-dl-fname">${f}</span>
          <span class="ob-dl-fexample">${e}</span>
          <span class="ob-dl-fresult">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">📊 Statistics Functions</div>
    <div class="ob-dl-func-table">
      <div class="ob-dl-func-header"><span>Function</span><span>උදාහරණය</span><span>Result</span></div>
      ${[
        ['MEDIAN','=MEDIAN(A1:A5)','මධ්‍යකය'],
        ['STDEV','=STDEV(A1:A5)','සම්මත අපගමනය'],
        ['VAR','=VAR(A1:A5)','විචල්‍යතාව'],
        ['LARGE','=LARGE(A1:A5,2)','2වෙනි ලොකුම'],
        ['SMALL','=SMALL(A1:A5,2)','2වෙනි පොඩිම'],
      ].map(([f,e,r])=>`
        <div class="ob-dl-func-row">
          <span class="ob-dl-fname">${f}</span>
          <span class="ob-dl-fexample">${e}</span>
          <span class="ob-dl-fresult">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">📝 Text Functions</div>
    <div class="ob-dl-func-table">
      <div class="ob-dl-func-header"><span>Function</span><span>උදාහරණය</span><span>Result</span></div>
      ${[
        ['LEN','=LEN("Hello")','5'],
        ['UPPER','=UPPER("hello")',"HELLO"],
        ['LOWER','=LOWER("HELLO")',"hello"],
        ['TRIM','=TRIM(" hi ")','hi'],
        ['LEFT','=LEFT("Hello",3)','Hel'],
        ['RIGHT','=RIGHT("Hello",3)','llo'],
        ['MID','=MID("Hello",2,3)','ell'],
        ['CONCAT','=CONCAT("Hi"," ","!")',"Hi !"],
        ['TEXTJOIN','=TEXTJOIN(", ",TRUE,A1:A3)','a, b, c'],
        ['SUBSTITUTE','=SUBSTITUTE("Hello","l","r")',"Herro"],
        ['FIND','=FIND("lo","Hello")','4'],
        ['VALUE','=VALUE("123")','123'],
        ['TEXT','=TEXT(123)','"123"'],
      ].map(([f,e,r])=>`
        <div class="ob-dl-func-row">
          <span class="ob-dl-fname">${f}</span>
          <span class="ob-dl-fexample">${e}</span>
          <span class="ob-dl-fresult">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🔀 Logic Functions</div>
    <div class="ob-dl-func-table">
      <div class="ob-dl-func-header"><span>Function</span><span>උදාහරණය</span><span>Result</span></div>
      ${[
        ['IF','=IF(A1>10,"Big","Small")','condition'],
        ['AND','=AND(A1>5,A1<10)','TRUE/FALSE'],
        ['OR','=OR(A1>5,A1<3)','TRUE/FALSE'],
        ['NOT','=NOT(A1>5)','ප්‍රතිලෝම'],
        ['IFERROR','=IFERROR(A1/B1,"Err")','fallback'],
        ['ISBLANK','=ISBLANK(A1)','හිස්ද?'],
        ['ISNUMBER','=ISNUMBER(A1)','Number ද?'],
        ['ISTEXT','=ISTEXT(A1)','Text ද?'],
      ].map(([f,e,r])=>`
        <div class="ob-dl-func-row">
          <span class="ob-dl-fname">${f}</span>
          <span class="ob-dl-fexample">${e}</span>
          <span class="ob-dl-fresult">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🔍 Lookup Functions</div>
    <div class="ob-calc-table">
      <div class="ob-calc-table-row">
        <span class="ob-calc-expr">=VLOOKUP("Alice",A1:C5,2,FALSE)</span>
        <span class="ob-calc-result">Row value ගන්නවා</span>
      </div>
    </div>
    <div class="ob-tip" style="margin-top:8px">
      <strong>VLOOKUP syntax:</strong> =VLOOKUP(lookup_value, range, col_index, exact_match)<br>
      <code>exact_match</code>: FALSE = exact, TRUE = approximate
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">📅 Date &amp; Time Functions</div>
    <div class="ob-dl-func-table">
      <div class="ob-dl-func-header"><span>Function</span><span>උදාහරණය</span><span>Result</span></div>
      ${[
        ['TODAY','=TODAY()','27/04/2026'],
        ['NOW','=NOW()','27/04/2026, 10:30'],
        ['YEAR','=YEAR()','2026'],
        ['MONTH','=MONTH()','4'],
        ['DAY','=DAY()','27'],
      ].map(([f,e,r])=>`
        <div class="ob-dl-func-row">
          <span class="ob-dl-fname">${f}</span>
          <span class="ob-dl-fexample">${e}</span>
          <span class="ob-dl-fresult">${r}</span>
        </div>`).join('')}
    </div>
  </div>

  <div class="ob-modal-section">
    <div class="ob-modal-section-title">🧮 Custom Calculator Functions in Data Lab</div>
    <div class="ob-calc-table">
      ${[
        ['Calculator: bmi(w,h) = w/h^2', 'Function define'],
        ['=bmi(70, 1.75)', '22.86'],
        ['=SUM(bmi(70,1.75), 10)', '32.86'],
      ].map(([e,r])=>`
        <div class="ob-calc-table-row">
          <span class="ob-calc-expr">${e}</span>
          <span class="ob-calc-arrow">→</span>
          <span class="ob-calc-result">${r}</span>
        </div>`).join('')}
    </div>
    <div class="ob-tip" style="margin-top:8px">
      Calculator panel-ල define කළ functions Data Lab-ලත් use කරන්න පුළුවන්!
    </div>
  </div>
`;

// ── Tour Steps ───────────────────────────────────────────────
const TOUR_STEPS = [
  {
    num: '1 of 8',
    title: 'MathWriter-ට ආයුබෝවන්! 🎉',
    sub: 'Mathematical symbols, formulas, special characters — ඔක්කොම type කරන්නට ලේසි editor එකක්. ටික වෙලාවකින් ඔක්කොම features ඉගෙන ගනිමු.',
    body: `
      <div class="ob-feat-grid">
        <div class="ob-feat-card">
          <div class="ob-feat-icon">✏️</div>
          <div class="ob-feat-title">Symbol Writer</div>
          <div class="ob-feat-desc">Rich text editor — Bold, italic, headings, tables</div>
        </div>
        <div class="ob-feat-card">
          <div class="ob-feat-icon">∑</div>
          <div class="ob-feat-title">Symbol Shortcuts</div>
          <div class="ob-feat-desc">/alpha type කළාම α — 50+ symbols keyboard-ම</div>
        </div>
        <div class="ob-feat-card">
          <div class="ob-feat-icon">🧮</div>
          <div class="ob-feat-title">Calculator</div>
          <div class="ob-feat-desc">Custom functions, graphs — Math.js engine</div>
        </div>
        <div class="ob-feat-card">
          <div class="ob-feat-icon">⊞</div>
          <div class="ob-feat-title">Data Lab</div>
          <div class="ob-feat-desc">Excel-like spreadsheet, 30+ formulas, charts</div>
        </div>
      </div>`
  },
  {
    num: '2 of 8',
    title: 'Symbol Writer — Text Editor',
    sub: 'මෙය මූලිකවම text edit වැඩ සදහා භාවිත කළ හැකිවේ. Font, font size, bold, italic, underline… and more options.',
    body: `
      <div class="ob-key-list">
        ${[
          [['Ctrl','B'],'Bold'],
          [['Ctrl','I'],'Italic'],
          [['Ctrl','U'],'Underline'],
          [['Ctrl','Z'],'Undo'],
          [['Ctrl','Shift','C'],'Word/Docs-ට copy (formatting preserve)'],
          [['Ctrl','H'],'Find &amp; Replace'],
          [['Ctrl','Enter'],'Horizontal line insert'],
          [['Ctrl','Shift','K'],'Current line delete'],
          [['('],'Auto-bracket → ( | ) cursor middle-ට'],
        ].map(([keys,label])=>`
          <div class="ob-key-row">
            <div class="ob-kbd">${keys.map(k=>`<span class="ob-k">${k}</span>`).join('')}</div>
            <span class="ob-key-label">${label}</span>
          </div>`).join('')}
      </div>`
  },
  {
    num: '3 of 8',
    title: '/ type කළාම Symbols Insert',
    sub: 'Editor ඇතුළේ / (forward slash) type කළාම symbol suggestions pop up වෙනවා. Arrow keys + Enter, හෝ Space key-ම select කරන්න.',
    body: `
      <div class="ob-sym-demo">
        ${[
          ['/alpha','α'],['/beta','β'],['/sqrt','√'],['/sum','∑'],
          ['/int','∫'],['/inf','∞'],['/pi','π'],['/delta','Δ'],
          ['/implies','⇒'],['/^2','²'],['/_1','₁'],['/1/2','½']
        ].map(([c,s])=>`<div class="ob-sym-pill"><span class="ob-sym-code">${c}</span><span class="ob-sym-char">${s}</span></div>`).join('')}
      </div>
      <div class="ob-tip">Sidebar-ල ✦ Symbols panel open කළාම categories-ලෙස ඔක්කොම symbols search, click-ම insert.</div>`
  },
  {
    num: '4 of 8',
    title: 'ඔබේම Shortcuts හදාගන්න',
    sub: 'Custom Symbols panel open කළාම ඔබේ shortcuts add කරන්නට. JSON export/import ද supporting.',
    body: `
      <div class="ob-type-demo">
        ${[
          ['/ohm','Ω'],
          ['/hbar','ℏ'],
          ['/my-uni','🏫 University of Colombo'],
        ].map(([k,v])=>`
          <div class="ob-type-row">
            <span class="ob-badge">shortcut</span>
            <span class="ob-type-in">${k}</span>
            <span class="ob-type-out">${v}</span>
          </div>`).join('')}
      </div>
      <div class="ob-tip">Custom shortcuts built-in suggestions-ල ද දිස්වෙනවා. JSON export කරලා backup, import කරලා restore.</div>`
  },
  {
    num: '5 of 8',
    title: 'Calculator & Graphs',
    sub: 'Side panel-ල Calculator open. Basic math, custom functions define කරලා save, graph draw — Math.js engine. Editor ඇතුළේ =f(5) type කළාම status bar-ල result show.',
    body: `
      <div class="ob-calc-demo">
        ${[
          ['in','2^10'],['out','= 1024'],
          ['in','f(x) = x^2 + 2x + 1'],['out',"Function 'f' saved!"],
          ['in','f(5)'],['out','= 36'],
          ['in','bmi(w, h) = w / h^2'],['out',"Function 'bmi' saved!"],
          ['in','F(x) = 2x^2+4x+6'],['out','Graph drawn ✓'],
        ].map(([t,v])=>`<div class="ob-calc-line ob-calc-${t}">${v}</div>`).join('')}
      </div>
      <div class="ob-btn-row">
        <button class="ob-extra-btn" onclick="obShowSubModal('calc_functions', 'Calculator — සියලු Functions &amp; Examples')">
          🧮 All Calculator Functions
        </button>
        <button class="ob-extra-btn ob-extra-btn-sym" onclick="obShowSubModal('symbolic_math', 'Symbolic Math — LaTeX &amp; Computation')">
          ∂ Symbolic Maths
        </button>
      </div>`
  },
  {
    num: '6 of 8',
    title: 'Data Lab — Spreadsheet & Charts',
    sub: 'Toolbar-ල Data Lab button click කළාම Excel-like spreadsheet open. Formulas, sorting, filtering, charts ඔක්කොම. Excel functions 30+ පමණ ඇතුළත් වේ.',
    body: `
      <div class="ob-dl-grid">
        <div class="ob-dl-cell ob-dl-hdr">Name</div><div class="ob-dl-cell ob-dl-hdr">Phy</div><div class="ob-dl-cell ob-dl-hdr">Math</div><div class="ob-dl-cell ob-dl-hdr">Avg</div>
        <div class="ob-dl-cell">Kasun</div><div class="ob-dl-cell">85</div><div class="ob-dl-cell">92</div><div class="ob-dl-cell ob-dl-formula">=AVG(B2:C2)</div>
        <div class="ob-dl-cell">Nimali</div><div class="ob-dl-cell">78</div><div class="ob-dl-cell">88</div><div class="ob-dl-cell ob-dl-formula">=AVG(B3:C3)</div>
        <div class="ob-dl-cell">Tharaka</div><div class="ob-dl-cell">91</div><div class="ob-dl-cell">76</div><div class="ob-dl-cell ob-dl-formula">=AVG(B4:C4)</div>
      </div>
      <div class="ob-tip">Formula type කරලා Enter — next row-ට ghost preview. Ctrl+D = fill down ඔක්කොම.</div>
      <div class="ob-btn-row">
        <button class="ob-extra-btn" onclick="obShowSubModal('datalab_functions', 'Data Lab — සියලු Functions (30+)')">
          📊 All Data Lab Functions
        </button>
      </div>`
  },
  {
    num: '7 of 8',
    title: 'Copy & Export Options',
    sub: 'ලිව්ව දේ Word, Google Docs, plain text ලෙස export. Formatting preserve.',
    body: `
      <div class="ob-panel-list">
        ${[
          ['📋','Ctrl+Shift+C — Copy for Word','Bold, italic, tables, headings ඔක්කොම formatting සහිතව Word/Google Docs-ට paste.'],
          ['📄','Export .doc','Word-ල directly open කළ හැකි .doc file download.'],
          ['📊','Data Lab → CSV / Excel','Spreadsheet data CSV හෝ .xlsx export. Charts PNG save.'],
          ['📝','Export .txt / .html','Plain text හෝ full HTML file export.'],
        ].map(([icon,name,desc])=>`
          <div class="ob-panel-item">
            <span class="ob-panel-icon">${icon}</span>
            <div>
              <div class="ob-panel-name">${name}</div>
              <div class="ob-panel-desc">${desc}</div>
            </div>
          </div>`).join('')}
      </div>`
  },
  {
    num: '8 of 8',
    title: 'ඔක්කොම Ready! 🚀',
    sub: 'MathWriter-ල ඔක්කොම features දැන් ඔබට explore කරන්නට හැකියි. ඕනෑ වෙලාවක Help menu-ල Tour නැවත open කරන්න.',
    body: `
      <div class="ob-feat-grid">
        <div class="ob-feat-card ob-feat-card-done">
          <div class="ob-feat-icon">✅</div>
          <div class="ob-feat-title">Symbol Writer</div>
          <div class="ob-feat-desc">Text editing + / shortcuts + custom symbols</div>
        </div>
        <div class="ob-feat-card ob-feat-card-done">
          <div class="ob-feat-icon">✅</div>
          <div class="ob-feat-title">Calculator</div>
          <div class="ob-feat-desc">Functions, graphs, symbolic math, unit conversion</div>
        </div>
        <div class="ob-feat-card ob-feat-card-done">
          <div class="ob-feat-icon">✅</div>
          <div class="ob-feat-title">Data Lab</div>
          <div class="ob-feat-desc">30+ Excel functions, charts, CSV/Excel export</div>
        </div>
        <div class="ob-feat-card ob-feat-card-done">
          <div class="ob-feat-icon">✅</div>
          <div class="ob-feat-title">Export</div>
          <div class="ob-feat-desc">Word, .doc, .txt, .html, CSV, Excel</div>
        </div>
      </div>
      <div class="ob-tip">💡 Help menu → "Show Tour" ලෙස ඕනෑ වෙලාවක නැවත open කරන්නට පුළුවන්.</div>`
  }
];

// ── Sub-modal content map ────────────────────────────────────
const SUB_MODAL_CONTENT = {
  calc_functions: CALC_FUNCTIONS_CONTENT,
  symbolic_math:  SYMBOLIC_MATH_CONTENT,
  datalab_functions: DATALAB_FUNCTIONS_CONTENT,
};

// ── Build & inject tour HTML + styles ───────────────────────
function buildOnboardingTour() {
  if (document.getElementById('ob-overlay')) return;

  const style = document.createElement('style');
  style.id = 'ob-styles';
  style.textContent = `
    #ob-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.60);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: obFadeIn 0.2s ease;
    }
    @keyframes obFadeIn { from { opacity:0 } to { opacity:1 } }
    #ob-modal {
      background: var(--surf, #1a1a2e);
      border: 1px solid var(--border, #333);
      border-radius: 16px;
      width: 100%; max-width: 540px;
      max-height: 92vh; overflow-y: auto;
      display: flex; flex-direction: column;
      box-shadow: 0 32px 80px rgba(0,0,0,0.8);
      animation: obSlideUp 0.25s ease;
    }
    @keyframes obSlideUp { from { transform: translateY(20px); opacity:0 } to { transform: translateY(0); opacity:1 } }
    .ob-progress { height: 3px; background: var(--border, #333); border-radius: 3px 3px 0 0; flex-shrink: 0; }
    .ob-progress-bar { height: 3px; background: var(--accent, #a78bfa); border-radius: 3px 3px 0 0; transition: width 0.35s ease; }
    .ob-header { padding: 28px 28px 0; }
    .ob-step-num { font-size: 11px; font-weight: 600; color: var(--muted, #888); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
    .ob-title { font-size: 22px; font-weight: 700; color: var(--text, #f0f0f0); margin: 0 0 8px; line-height: 1.3; font-family: 'Syne', sans-serif; }
    .ob-sub { font-size: 14px; color: var(--muted, #aaa); margin: 0; line-height: 1.65; font-family: 'Syne', sans-serif; }
    .ob-body { padding: 20px 28px 4px; flex: 1; }
    .ob-box { background: var(--surf2, #111122); border: 1px solid var(--border, #333); border-radius: 10px; padding: 18px; }
    .ob-tip { background: rgba(167,139,250,0.1); border-left: 2px solid var(--accent, #a78bfa); border-radius: 0 8px 8px 0; padding: 10px 14px; font-size: 12px; color: var(--muted, #aaa); line-height: 1.6; margin-top: 12px; font-family: 'Syne', sans-serif; }
    .ob-feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .ob-feat-card { background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); border-radius: 8px; padding: 14px; transition: border-color 0.2s; }
    .ob-feat-card-done { border-color: rgba(52,211,153,0.35) !important; }
    .ob-feat-icon { font-size: 20px; margin-bottom: 6px; }
    .ob-feat-title { font-size: 13px; font-weight: 700; color: var(--text, #f0f0f0); margin-bottom: 4px; font-family: 'Syne', sans-serif; }
    .ob-feat-desc { font-size: 12px; color: var(--muted, #888); line-height: 1.5; font-family: 'Syne', sans-serif; }
    .ob-sym-demo { display: flex; flex-wrap: wrap; gap: 6px; }
    .ob-sym-pill { background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); border-radius: 20px; padding: 5px 12px; font-size: 13px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: border-color 0.15s; }
    .ob-sym-pill:hover { border-color: var(--accent, #a78bfa); }
    .ob-sym-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted, #888); }
    .ob-sym-char { font-size: 16px; color: var(--text, #f0f0f0); }
    .ob-key-list { display: flex; flex-direction: column; }
    .ob-key-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border, #2a2a3a); }
    .ob-key-row:last-child { border-bottom: none; }
    .ob-kbd { display: flex; gap: 3px; flex-shrink: 0; }
    .ob-k { background: var(--btn, #1e1e30); border: 1px solid var(--border, #444); border-bottom: 2px solid var(--border, #444); border-radius: 5px; padding: 2px 7px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text, #f0f0f0); font-weight: 600; white-space: nowrap; }
    .ob-key-label { font-size: 12px; color: var(--muted, #aaa); font-family: 'Syne', sans-serif; }
    .ob-dl-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 10px; }
    .ob-dl-cell { background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); border-radius: 4px; padding: 6px 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-align: center; color: var(--text, #f0f0f0); }
    .ob-dl-hdr { background: var(--surf, #111); color: var(--muted, #888); font-size: 10px; }
    .ob-dl-formula { color: var(--accent2, #34d399); }
    .ob-calc-demo { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .ob-calc-line { font-family: 'JetBrains Mono', monospace; font-size: 13px; padding: 8px 12px; border-radius: 6px; }
    .ob-calc-in { background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); color: var(--muted, #aaa); }
    .ob-calc-out { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: var(--accent2, #34d399); font-weight: 600; }
    .ob-type-demo { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .ob-type-row { display: flex; align-items: center; gap: 10px; background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); border-radius: 8px; padding: 10px 14px; }
    .ob-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: rgba(52,211,153,0.15); color: var(--accent2, #34d399); border: 1px solid rgba(52,211,153,0.3); white-space: nowrap; font-family: 'JetBrains Mono', monospace; }
    .ob-type-in { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted, #aaa); flex: 1; }
    .ob-type-out { font-size: 15px; color: var(--text, #f0f0f0); margin-left: auto; }
    .ob-panel-list { display: flex; flex-direction: column; gap: 8px; }
    .ob-panel-item { display: flex; align-items: flex-start; gap: 12px; background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); border-radius: 8px; padding: 12px 14px; }
    .ob-panel-icon { font-size: 18px; flex-shrink: 0; }
    .ob-panel-name { font-size: 13px; font-weight: 600; color: var(--text, #f0f0f0); margin-bottom: 3px; font-family: 'Syne', sans-serif; }
    .ob-panel-desc { font-size: 12px; color: var(--muted, #888); line-height: 1.5; font-family: 'Syne', sans-serif; }
    .ob-nav { display: flex; align-items: center; justify-content: space-between; padding: 20px 28px 24px; }
    .ob-dots { display: flex; gap: 6px; align-items: center; }
    .ob-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border, #444); cursor: pointer; transition: background 0.2s, width 0.2s; }
    .ob-dot.on { background: var(--accent, #a78bfa); width: 16px; border-radius: 3px; }
    .ob-btn { background: var(--btn, #1e1e30); border: 1px solid var(--border, #444); border-radius: 8px; padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text, #f0f0f0); transition: all 0.15s; font-family: 'Syne', sans-serif; }
    .ob-btn:hover { border-color: var(--accent, #a78bfa); color: var(--accent, #a78bfa); }
    .ob-btn-primary { background: var(--accent, #a78bfa); border-color: var(--accent, #a78bfa); color: #000 !important; }
    .ob-btn-primary:hover { opacity: 0.85; color: #000 !important; border-color: var(--accent, #a78bfa); }
    .ob-skip { background: none; border: none; color: var(--muted, #666); font-size: 11px; cursor: pointer; padding: 4px 0; font-family: 'Syne', sans-serif; text-decoration: underline; display: block; text-align: right; margin: 0 28px 12px; }
    .ob-skip:hover { color: var(--danger, #f87171); }
    /* Extra detail buttons */
    .ob-btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .ob-extra-btn { background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.4); border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--accent, #a78bfa); transition: all 0.15s; font-family: 'JetBrains Mono', monospace; }
    .ob-extra-btn:hover { background: rgba(167,139,250,0.25); border-color: var(--accent, #a78bfa); }
    .ob-extra-btn-sym { background: rgba(52,211,153,0.1); border-color: rgba(52,211,153,0.4); color: var(--accent2, #34d399); }
    .ob-extra-btn-sym:hover { background: rgba(52,211,153,0.22); border-color: var(--accent2, #34d399); }
    /* Sub-modal */
    #ob-sub-overlay {
      position: fixed; inset: 0; z-index: 100000;
      background: rgba(0,0,0,0.70);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: obFadeIn 0.15s ease;
    }
    #ob-sub-modal {
      background: var(--surf, #1a1a2e);
      border: 1px solid var(--border, #444);
      border-radius: 14px;
      width: 100%; max-width: 600px;
      max-height: 88vh; overflow-y: auto;
      box-shadow: 0 32px 80px rgba(0,0,0,0.9);
      animation: obSlideUp 0.2s ease;
    }
    .ob-sub-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 14px; border-bottom: 1px solid var(--border, #333); position: sticky; top: 0; background: var(--surf, #1a1a2e); z-index: 1; }
    .ob-sub-title { font-size: 16px; font-weight: 700; color: var(--text, #f0f0f0); font-family: 'Syne', sans-serif; }
    .ob-sub-close { background: none; border: none; color: var(--muted, #888); font-size: 20px; cursor: pointer; padding: 0 4px; line-height: 1; }
    .ob-sub-close:hover { color: var(--text, #f0f0f0); }
    .ob-sub-body { padding: 16px 24px 24px; }
    /* Sub-modal content */
    .ob-modal-section { margin-bottom: 20px; }
    .ob-modal-section-title { font-size: 13px; font-weight: 700; color: var(--accent, #a78bfa); margin-bottom: 10px; font-family: 'Syne', sans-serif; letter-spacing: 0.05em; }
    .ob-calc-table { display: flex; flex-direction: column; gap: 5px; }
    .ob-calc-table-row { display: flex; align-items: center; gap: 8px; background: var(--btn, #1e1e30); border: 1px solid var(--border, #2a2a3a); border-radius: 6px; padding: 7px 12px; }
    .ob-calc-expr { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted, #aaa); flex: 1; }
    .ob-calc-arrow { color: var(--border, #555); font-size: 12px; }
    .ob-calc-result { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--accent2, #34d399); font-weight: 600; text-align: right; min-width: 80px; }
    .ob-dl-func-table { display: flex; flex-direction: column; gap: 3px; }
    .ob-dl-func-header { display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 8px; padding: 5px 10px; font-size: 10px; font-weight: 700; color: var(--muted, #666); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
    .ob-dl-func-row { display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 8px; background: var(--btn, #1e1e30); border: 1px solid var(--border, #2a2a3a); border-radius: 6px; padding: 6px 10px; align-items: center; }
    .ob-dl-fname { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: var(--accent, #a78bfa); }
    .ob-dl-fexample { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted, #888); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ob-dl-fresult { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--accent2, #34d399); }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'ob-overlay';
  overlay.innerHTML = `
    <div id="ob-modal">
      <div class="ob-progress"><div class="ob-progress-bar" id="ob-prog" style="width:${Math.round(1/TOUR_STEPS.length*100)}%"></div></div>
      <div class="ob-header">
        <div class="ob-step-num" id="ob-step-num">${TOUR_STEPS[0].num}</div>
        <div class="ob-title" id="ob-title">${TOUR_STEPS[0].title}</div>
        <p class="ob-sub" id="ob-sub">${TOUR_STEPS[0].sub}</p>
      </div>
      <div class="ob-body">
        <div class="ob-box" id="ob-body">${TOUR_STEPS[0].body}</div>
      </div>
      <button class="ob-skip" id="ob-skip-btn" onclick="skipOnboarding()">Skip tour</button>
      <div class="ob-nav">
        <button class="ob-btn" id="ob-prev" onclick="obNav(-1)" style="visibility:hidden">← Back</button>
        <div class="ob-dots" id="ob-dots"></div>
        <button class="ob-btn ob-btn-primary" id="ob-next" onclick="obNav(1)">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Dots build
  const dotsEl = document.getElementById('ob-dots');
  TOUR_STEPS.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'ob-dot' + (i === 0 ? ' on' : '');
    d.id = 'ob-dot-' + i;
    d.onclick = () => obGoTo(i);
    dotsEl.appendChild(d);
  });

  // Overlay click-to-close (modal outside click)
  overlay.addEventListener('click', e => {
    if (e.target === overlay) skipOnboarding();
  });
}

// ── Sub-modal (Functions detail view) ───────────────────────
function obShowSubModal(key, title) {
  if (document.getElementById('ob-sub-overlay')) return;
  const content = SUB_MODAL_CONTENT[key];
  if (!content) return;

  const subOverlay = document.createElement('div');
  subOverlay.id = 'ob-sub-overlay';
  subOverlay.innerHTML = `
    <div id="ob-sub-modal">
      <div class="ob-sub-header">
        <div class="ob-sub-title">${title}</div>
        <button class="ob-sub-close" onclick="obCloseSubModal()">✕</button>
      </div>
      <div class="ob-sub-body">${content}</div>
    </div>
  `;
  document.body.appendChild(subOverlay);

  subOverlay.addEventListener('click', e => {
    if (e.target === subOverlay) obCloseSubModal();
  });
}

function obCloseSubModal() {
  const el = document.getElementById('ob-sub-overlay');
  if (el) el.remove();
}

// ── Navigation ───────────────────────────────────────────────
let obCur = 0;

function obGoTo(n) {
  document.getElementById('ob-dot-' + obCur)?.classList.remove('on');
  obCur = n;
  const step = TOUR_STEPS[obCur];

  document.getElementById('ob-step-num').textContent = step.num;
  document.getElementById('ob-title').textContent = step.title;
  document.getElementById('ob-sub').textContent = step.sub;
  document.getElementById('ob-body').innerHTML = step.body;
  document.getElementById('ob-prog').style.width = Math.round((obCur + 1) / TOUR_STEPS.length * 100) + '%';
  document.getElementById('ob-dot-' + obCur)?.classList.add('on');
  document.getElementById('ob-prev').style.visibility = obCur === 0 ? 'hidden' : 'visible';

  const nextBtn = document.getElementById('ob-next');
  const skipBtn = document.getElementById('ob-skip-btn');
  if (obCur === TOUR_STEPS.length - 1) {
    nextBtn.textContent = 'ඉවරයි — Start ✓';
    nextBtn.classList.add('ob-btn-primary');
    skipBtn.style.display = 'none';
    nextBtn.onclick = () => closeOnboarding();
  } else {
    nextBtn.textContent = 'Next →';
    nextBtn.onclick = () => obNav(1);
    skipBtn.style.display = 'block';
  }
}

function obNav(dir) {
  const next = Math.max(0, Math.min(TOUR_STEPS.length - 1, obCur + dir));
  obGoTo(next);
}

// ── Close & skip ─────────────────────────────────────────────
function closeOnboarding() {
  const overlay = document.getElementById('ob-overlay');
  if (overlay) {
    overlay.style.animation = 'obFadeIn 0.2s ease reverse';
    setTimeout(() => overlay.remove(), 200);
  }
  const subOverlay = document.getElementById('ob-sub-overlay');
  if (subOverlay) subOverlay.remove();
  localStorage.setItem(ONBOARD_KEY, '1');
  if (typeof ed !== 'undefined') ed.focus();
}

function skipOnboarding() {
  closeOnboarding();
}

// ── Public: manual open (e.g. Help button) ───────────────────
function openOnboardingTour() {
  obCur = 0;
  const existing = document.getElementById('ob-overlay');
  if (existing) existing.remove();
  const subExisting = document.getElementById('ob-sub-overlay');
  if (subExisting) subExisting.remove();
  buildOnboardingTour();
}

// ── Auto-show for first-time users ───────────────────────────
function checkAndShowOnboarding() {
  if (!localStorage.getItem(ONBOARD_KEY)) {
    setTimeout(() => {
      buildOnboardingTour();
    }, 600);
  }
}

// ── Init ─────────────────────────────────────────────────────
checkAndShowOnboarding();
