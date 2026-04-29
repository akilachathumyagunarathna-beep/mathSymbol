// ============================================================
// Symbol Writer — First-Time User Onboarding Tour
// ============================================================
// localStorage key 'sw_onboarded_v1' check කරලා
// first visit-ල auto-show, ඊළඟ visits-ල skip.
// Manual trigger: openOnboardingTour()
// ============================================================

const ONBOARD_KEY = 'sw_onboarded_v1';

const TOUR_STEPS = [
  {
    num: '1 of 7',
    title: 'Symbol Writer-ට ආයුබෝවන් !',
    sub: 'Mathematical symbols, formulas, special characters — ඔක්කොම type කරන්නට ලේසි editor එකක්. ටික වෙලාවකින් ඔක්කොම features ඉගෙන ගනිමු.',
    body: `
      <div class="ob-feat-grid">
        <div class="ob-feat-card">
          <div class="ob-feat-icon">✏️</div>
          <div class="ob-feat-title">Rich Editor</div>
          <div class="ob-feat-desc">Bold, italic, headings, tables — Word වගේ editor</div>
        </div>
        <div class="ob-feat-card">
          <div class="ob-feat-icon">∑</div>
          <div class="ob-feat-title">Symbol Shortcuts</div>
          <div class="ob-feat-desc">/alpha type කළාම α — 200+ symbols keyboard-ම</div>
        </div>
        <div class="ob-feat-card">
          <div class="ob-feat-icon">⊞</div>
          <div class="ob-feat-title">Data Lab</div>
          <div class="ob-feat-desc">Excel-like spreadsheet, formulas, charts</div>
        </div>
        <div class="ob-feat-card">
          <div class="ob-feat-icon">∫</div>
          <div class="ob-feat-title">Calculator</div>
          <div class="ob-feat-desc">Custom functions define, graphs draw කරන්න</div>
        </div>
      </div>`
  },
  {
    num: '2 of 7',
    title: '/ type කළාම symbols insert',
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
    num: '3 of 7',
    title: 'Keyboard shortcuts',
    sub: 'ඔක්කොම shortcuts Ctrl (Mac-ල Cmd) key-ත් එක්ක.',
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
    num: '4 of 7',
    title: 'Data Lab — Spreadsheet & charts',
    sub: 'Toolbar-ල Data Lab button click කළාම Excel-like spreadsheet open. Formulas, sorting, filtering, charts ඔක්කොම.',
    body: `
      <div class="ob-dl-grid">
        <div class="ob-dl-cell ob-dl-hdr">Name</div><div class="ob-dl-cell ob-dl-hdr">Phy</div><div class="ob-dl-cell ob-dl-hdr">Math</div><div class="ob-dl-cell ob-dl-hdr">Avg</div>
        <div class="ob-dl-cell">Kasun</div><div class="ob-dl-cell">85</div><div class="ob-dl-cell">92</div><div class="ob-dl-cell ob-dl-formula">=AVG(B2:C2)</div>
        <div class="ob-dl-cell">Nimali</div><div class="ob-dl-cell">78</div><div class="ob-dl-cell">88</div><div class="ob-dl-cell ob-dl-formula">=AVG(B3:C3)</div>
        <div class="ob-dl-cell">Tharaka</div><div class="ob-dl-cell">91</div><div class="ob-dl-cell">76</div><div class="ob-dl-cell ob-dl-formula">=AVG(B4:C4)</div>
      </div>
      <div class="ob-tip">Formula type කරලා Enter 누rud්දී next row-ට ghost preview — click කළාම auto-fill. Ctrl+D = fill down ඔක්කොම.</div>`
  },
  {
    num: '5 of 7',
    title: 'Calculator & graphs',
    sub: 'Side panel-ල Calculator open. Basic math, custom functions define කරලා save, graph draw — Math.js engine.',
    body: `
      <div class="ob-calc-demo">
        ${[
          ['in','2^10'],['out','= 1024'],
          ['in','f(x) = x^2 + 2x + 1'],['out','Function \'f\' saved!'],
          ['in','f(5)'],['out','= 36'],
          ['in','bmi(w, h) = w / h^2'],['out','Function \'bmi\' saved!'],
        ].map(([t,v])=>`<div class="ob-calc-line ob-calc-${t}">${v}</div>`).join('')}
      </div>
      <div class="ob-tip">Editor ඇතුළේ =f(5) type කළාම status bar-ල result show — Calculator window open කරන්නේ නෑ.</div>`
  },
  {
    num: '6 of 7',
    title: 'ඔබේම shortcuts හදාගන්න',
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
    num: '7 of 7',
    title: 'Copy & Export options',
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
  }
];

// ── Build & inject tour HTML + styles ───────────────────────
function buildOnboardingTour() {
  if (document.getElementById('ob-overlay')) return;

  const style = document.createElement('style');
  style.id = 'ob-styles';
  style.textContent = `
    #ob-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      animation: obFadeIn 0.2s ease;
    }
    @keyframes obFadeIn { from { opacity:0 } to { opacity:1 } }
    #ob-modal {
      background: var(--surf, #1a1a2e);
      border: 1px solid var(--border, #333);
      border-radius: 16px;
      width: 100%; max-width: 520px;
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
    .ob-feat-card { background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); border-radius: 8px; padding: 14px; }
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
    .ob-dl-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
    .ob-dl-cell { background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); border-radius: 4px; padding: 6px 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; text-align: center; color: var(--text, #f0f0f0); }
    .ob-dl-hdr { background: var(--surf, #111); color: var(--muted, #888); font-size: 10px; }
    .ob-dl-formula { color: var(--accent2, #34d399); }
    .ob-calc-demo { display: flex; flex-direction: column; gap: 6px; }
    .ob-calc-line { font-family: 'JetBrains Mono', monospace; font-size: 13px; padding: 8px 12px; border-radius: 6px; }
    .ob-calc-in { background: var(--btn, #1e1e30); border: 1px solid var(--border, #333); color: var(--muted, #aaa); }
    .ob-calc-out { background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.2); color: var(--accent2, #34d399); font-weight: 600; }
    .ob-type-demo { display: flex; flex-direction: column; gap: 8px; }
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
  localStorage.setItem(ONBOARD_KEY, '1');
  // Editor-ට focus
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
  buildOnboardingTour();
}

// ── Auto-show for first-time users ───────────────────────────
function checkAndShowOnboarding() {
  if (!localStorage.getItem(ONBOARD_KEY)) {
    // DOM ready වෙලා ඉවර වෙලා — small delay
    setTimeout(() => {
      buildOnboardingTour();
    }, 600);
  }
}

// ── Init ─────────────────────────────────────────────────────
checkAndShowOnboarding();