/**
 * a11y-widget.js
 * Drop this script into any page to add AI-powered accessibility analysis.
 *
 * Usage:
 *   <script
 *     src="https://your-vercel-app.vercel.app/a11y-widget.js"
 *     data-api="https://your-vercel-app.vercel.app/api/analyze"
 *     data-key="your-api-password"
 *   ></script>
 *
 * Or initialise manually:
 *   A11yWidget.init({ api: '...', key: '...' });
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const scriptEl = document.currentScript;
  const CONFIG = {
    api: scriptEl?.dataset.api || '',
    key: scriptEl?.dataset.key || '',
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const STYLES = `
    #a11y-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483646;
      width: 50px; height: 50px; border-radius: 50%;
      background: #185FA5; color: #fff; border: none;
      font-size: 22px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.25);
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, transform .15s;
    }
    #a11y-fab:hover { background: #0C447C; transform: scale(1.07); }
    #a11y-fab.loading { background: #888; cursor: wait; }

    #a11y-panel {
      position: fixed; bottom: 84px; right: 24px; z-index: 2147483645;
      width: 360px; max-height: 75vh;
      background: #fff; border: 1px solid #ddd; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px; color: #1a1a1a;
      display: none; flex-direction: column; overflow: hidden;
    }
    #a11y-panel.open { display: flex; }

    #a11y-panel-header {
      padding: 14px 16px 10px; border-bottom: 1px solid #eee;
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0;
    }
    #a11y-panel-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
    #a11y-close {
      background: none; border: none; font-size: 18px; cursor: pointer;
      color: #666; padding: 0 4px; line-height: 1;
    }

    #a11y-tabs {
      display: flex; border-bottom: 1px solid #eee; background: #fafafa;
    }
    .a11y-tab {
      flex: 1; padding: 10px; border: none; background: none; cursor: pointer;
      font-size: 13px; font-weight: 500; color: #666; border-bottom: 2px solid transparent;
      transition: all .2s;
    }
    .a11y-tab.active { color: #185FA5; border-bottom-color: #185FA5; background: #fff; }

    .a11y-section { display: none; flex-direction: column; flex: 1; overflow-y: auto; }
    .a11y-section.active { display: flex; }

    /* Enhance Tab Styles */
    .a11y-enhance-group { padding: 16px; border-bottom: 1px solid #eee; }
    .a11y-enhance-group:last-child { border-bottom: none; }
    .a11y-enhance-title { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; margin-bottom: 12px; }
    
    .a11y-tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .a11y-tool-btn {
      padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: #fff;
      font-size: 12px; cursor: pointer; text-align: center; transition: all .15s;
    }
    .a11y-tool-btn:hover { border-color: #185FA5; color: #185FA5; }
    .a11y-tool-btn.active { background: #185FA5; color: #fff; border-color: #185FA5; }

    .a11y-range-group { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .a11y-range-label { flex: 1; font-size: 13px; }
    .a11y-range-value { width: 40px; text-align: right; font-weight: 600; color: #185FA5; }

    /* Audit Tab Styles */
    #a11y-summary {
      padding: 10px 16px; font-size: 12px; color: #555;
      border-bottom: 1px solid #eee; flex-shrink: 0;
    }
    #a11y-actions {
      padding: 10px 16px; display: flex; gap: 8px; flex-shrink: 0;
      border-bottom: 1px solid #eee;
    }
    #a11y-apply-all, #a11y-undo-all, #a11y-rescan {
      flex: 1; padding: 7px 10px; border-radius: 6px; border: 1px solid #ccc;
      background: #f8f8f8; font-size: 12px; cursor: pointer; font-weight: 500;
      transition: background .1s;
    }
    #a11y-apply-all { background: #185FA5; color: #fff; border-color: #185FA5; }
    #a11y-apply-all:hover { background: #0C447C; }
    #a11y-undo-all:hover, #a11y-rescan:hover { background: #eee; }

    #a11y-list {
      overflow-y: auto; flex: 1; padding: 8px 0;
    }
    .a11y-issue {
      padding: 10px 16px; border-bottom: 1px solid #f0f0f0;
      display: flex; gap: 10px; align-items: flex-start;
    }
    .a11y-issue:last-child { border-bottom: none; }
    .a11y-badge {
      flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 6px;
      border-radius: 4px; text-transform: uppercase; margin-top: 2px;
    }
    .a11y-badge.critical  { background: #fde8e8; color: #c0392b; }
    .a11y-badge.warning   { background: #fef3e2; color: #d68910; }
    .a11y-badge.suggestion{ background: #eaf4fb; color: #2471a3; }
    .a11y-issue-body { flex: 1; min-width: 0; }
    .a11y-issue-type { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .04em; }
    .a11y-issue-desc { font-size: 13px; margin: 2px 0 6px; line-height: 1.45; }
    .a11y-fix-btn {
      font-size: 11px; padding: 3px 8px; border-radius: 4px;
      border: 1px solid #185FA5; color: #185FA5; background: none; cursor: pointer;
      transition: background .1s;
    }
    .a11y-fix-btn:hover  { background: #e8f0fb; }
    .a11y-fix-btn.applied { background: #e8f5e9; border-color: #27ae60; color: #27ae60; cursor: default; }
    .a11y-fix-btn.applied::before { content: '✓ '; }
    .a11y-highlight { outline: 3px solid #E24B4A !important; outline-offset: 2px !important; }

    #a11y-score-badge {
      font-size: 11px; font-weight: 700; background: #eee; color: #666;
      padding: 2px 8px; border-radius: 10px; margin-left: 8px;
    }
    #a11y-score-badge.good { background: #e8f5e9; color: #2e7d32; }
    #a11y-score-badge.fair { background: #fff3e0; color: #ef6c00; }
    #a11y-score-badge.poor { background: #ffebee; color: #c62828; }

    .a11y-wcag { font-size: 10px; color: #888; font-family: monospace; margin-left: 6px; }
    .a11y-impact { font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 1px 4px; border-radius: 3px; margin-left: 6px; }
    .a11y-impact.high { background: #ff5252; color: #fff; }
    .a11y-impact.medium { background: #fb8c00; color: #fff; }
    .a11y-impact.low { background: #9e9e9e; color: #fff; }

    .a11y-filters { padding: 8px 16px; display: flex; gap: 6px; border-bottom: 1px solid #eee; overflow-x: auto; }
    .a11y-filter-chip {
      font-size: 10px; padding: 3px 8px; border-radius: 12px; border: 1px solid #ddd;
      background: #fff; cursor: pointer; white-space: nowrap;
    }
    .a11y-filter-chip.active { background: #185FA5; color: #fff; border-color: #185FA5; }

    /* Global Enhancement Classes */
    html.a11y-grayscale { filter: grayscale(100%) !important; }
    html.a11y-invert { filter: invert(100%) !important; }
    html.a11y-high-contrast { background: #000 !important; color: #ffff00 !important; }
    html.a11y-high-contrast * { background-color: #000 !important; color: #ffff00 !important; border-color: #ffff00 !important; }
    html.a11y-links-visible a { text-decoration: underline !important; outline: 3px solid #ffff00 !important; outline-offset: 2px !important; background: #000 !important; color: #fff !important; }
    html.a11y-focus-visible *:focus { outline: 4px solid #185FA5 !important; outline-offset: 2px !important; }
    html.a11y-missing-alt img:not([alt]), html.a11y-missing-alt img[alt=""] { outline: 5px solid #ff0000 !important; }
  `;

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('a11y-styles')) return;
    const style = document.createElement('style');
    style.id = 'a11y-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function buildUI() {
    if (document.getElementById('a11y-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'a11y-fab';
    fab.setAttribute('aria-label', 'Open accessibility analyser');
    fab.setAttribute('title', 'Accessibility analyser');
    fab.innerHTML = '&#9854;'; // ♿

    const panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility analysis results');
    panel.innerHTML = `
      <div id="a11y-panel-header">
        <h3 style="display:flex;align-items:center">
          ♿ Accessibility Suite
          <span id="a11y-score-badge" style="display:none"></span>
        </h3>
        <button id="a11y-close" aria-label="Close panel">✕</button>
      </div>

      <div id="a11y-tabs">
        <button class="a11y-tab active" data-tab="enhance">Enhance</button>
        <button class="a11y-tab" data-tab="audit">Audit</button>
      </div>

      <!-- ENHANCE TAB -->
      <div id="a11y-section-enhance" class="a11y-section active">
        <!-- ... (previous enhancement tools content) ... -->
        <div class="a11y-enhance-group">
          <div class="a11y-enhance-title">Contrast & Color</div>
          <div class="a11y-tool-grid">
            <button class="a11y-tool-btn" data-tool="grayscale">Monochrome</button>
            <button class="a11y-tool-btn" data-tool="invert">Invert</button>
            <button class="a11y-tool-btn" data-tool="high-contrast">Hi-Contrast</button>
          </div>
        </div>

        <div class="a11y-enhance-group">
          <div class="a11y-enhance-title">Typography</div>
          <div class="a11y-range-group">
            <span class="a11y-range-label">Text Size</span>
            <button class="a11y-tool-btn" style="padding:4px 10px" id="a11y-font-dec">−</button>
            <span class="a11y-range-value" id="a11y-font-val">100%</span>
            <button class="a11y-tool-btn" style="padding:4px 10px" id="a11y-font-inc">+</button>
          </div>
          <div class="a11y-range-group">
            <span class="a11y-range-label">Line Spacing</span>
            <button class="a11y-tool-btn" style="padding:4px 10px" id="a11y-line-dec">−</button>
            <span class="a11y-range-value" id="a11y-line-val">1.0</span>
            <button class="a11y-tool-btn" style="padding:4px 10px" id="a11y-line-inc">+</button>
          </div>
        </div>

        <div class="a11y-enhance-group">
          <div class="a11y-enhance-title">Navigation Tools</div>
          <div class="a11y-tool-grid">
            <button class="a11y-tool-btn" data-tool="links-visible">Highlight Links</button>
            <button class="a11y-tool-btn" data-tool="focus-visible">Force Focus</button>
            <button class="a11y-tool-btn" data-tool="missing-alt">Missing Alt</button>
          </div>
        </div>
      </div>

      <!-- AUDIT TAB -->
      <div id="a11y-section-audit" class="a11y-section">
        <div id="a11y-summary"></div>
        <div id="a11y-filters" style="display:none">
          <button class="a11y-filter-chip active" data-filter="all">All</button>
          <button class="a11y-filter-chip" data-filter="critical">Critical</button>
          <button class="a11y-filter-chip" data-filter="warning">Warning</button>
          <button class="a11y-filter-chip" data-filter="suggestion">Suggestion</button>
        </div>
        <div id="a11y-actions" style="display:none">
          <button id="a11y-apply-all">Apply all fixes</button>
          <button id="a11y-undo-all">Undo all</button>
          <button id="a11y-rescan">Re-scan</button>
        </div>
        <div id="a11y-list">
          <div id="a11y-status">Click "Re-scan" to run AI audit.</div>
        </div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    // Tab switcher listeners
    panel.querySelectorAll('.a11y-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.a11y-tab, .a11y-section').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`a11y-section-${tab.dataset.tab}`).classList.add('active');
      });
    });

    // Tool listeners
    panel.querySelectorAll('.a11y-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => toggleEnhancement(btn.dataset.tool, btn));
    });

    document.getElementById('a11y-font-inc').addEventListener('click', () => adjustFont(10));
    document.getElementById('a11y-font-dec').addEventListener('click', () => adjustFont(-10));
    document.getElementById('a11y-line-inc').addEventListener('click', () => adjustLine(0.1));
    document.getElementById('a11y-line-dec').addEventListener('click', () => adjustLine(-0.1));

    panel.querySelectorAll('.a11y-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        panel.querySelectorAll('.a11y-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderIssues(); // Re-render with current filter
      });
    });

    fab.addEventListener('click', onFabClick);
    document.getElementById('a11y-close').addEventListener('click', closePanel);
    document.getElementById('a11y-apply-all').addEventListener('click', applyAllFixes);
    document.getElementById('a11y-undo-all').addEventListener('click', undoAllFixes);
    document.getElementById('a11y-rescan').addEventListener('click', runAnalysis);
    
    // Load persisted settings
    restoreSettings();
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let issues = [];
  let appliedFixes = {}; // id → { el, undoFn }
  let panelOpen = false;
  let analysed = false;

  function openPanel()  { document.getElementById('a11y-panel').classList.add('open'); panelOpen = true; }
  function closePanel() { document.getElementById('a11y-panel').classList.remove('open'); panelOpen = false; }

  function onFabClick() {
    if (!panelOpen) {
      openPanel();
      if (!analysed) runAnalysis();
    } else {
      closePanel();
    }
  }

  // ── Capture DOM snapshot ──────────────────────────────────────────────────
  function captureSnapshot() {
    // Clone <body> minus our own widget nodes
    const bodyClone = document.body.cloneNode(true);
    bodyClone.querySelector('#a11y-fab')?.remove();
    bodyClone.querySelector('#a11y-panel')?.remove();
    bodyClone.querySelector('#a11y-styles')?.remove();

    // Strip scripts
    bodyClone.querySelectorAll('script').forEach(s => s.remove());

    // Collect computed styles for visible text-bearing elements
    // (sample up to 80 elements to stay within token limits)
    const styleTargets = [
      ...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,label,span,li,td,th,input,textarea,select,img')
    ].filter(el => el.offsetParent !== null).slice(0, 80);

    const styles = styleTargets.map(el => {
      const cs = window.getComputedStyle(el);
      return {
        selector: getSelector(el),
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
      };
    });

    return {
      url: window.location.href,
      html: `<html lang="${document.documentElement.lang || ''}">\n<head><title>${document.title}</title></head>\n<body>${bodyClone.innerHTML}</body></html>`,
      styles,
    };
  }

  // Best-effort unique CSS selector for an element
  function getSelector(el) {
    if (el.id) return '#' + CSS.escape(el.id);
    const tag = el.tagName.toLowerCase();
    // Filter out Tailwind JIT classes with brackets e.g. text-[10px] — invalid in querySelector
    const safeClasses = el.className && typeof el.className === 'string'
      ? el.className.trim().split(/\s+/).filter(c => !/[\[\]()#]/.test(c)).slice(0, 2)
      : [];
    const cls = safeClasses.length ? '.' + safeClasses.join('.') : '';
    const nth = Array.from(el.parentElement?.children ?? []).indexOf(el) + 1;
    return `${tag}${cls}:nth-child(${nth})`;
  }

  // Safe querySelector that won't throw on invalid selectors from the AI
  function safeQuerySelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (e) {
      // Fallback: try tag+nth-child only (strip classes)
      try {
        const tagNth = selector.replace(/\.[^\s:]+/g, '');
        return document.querySelector(tagNth);
      } catch (_) {
        return null;
      }
    }
  }

  let globalAuditData = null;

  // ── API call ──────────────────────────────────────────────────────────────
  async function runAnalysis() {
    setStatus('Scanning page…');
    document.getElementById('a11y-summary').textContent = '';
    document.getElementById('a11y-score-badge').style.display = 'none';
    document.getElementById('a11y-filters').style.display = 'none';
    document.getElementById('a11y-actions').style.display = 'none';
    document.getElementById('a11y-fab').classList.add('loading');
    issues = [];
    appliedFixes = {};
    analysed = false;

    const snapshot = captureSnapshot();

    try {
      const res = await fetch(CONFIG.api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.key,
        },
        body: JSON.stringify(snapshot),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      globalAuditData = data;
      issues = data.issues || [];
      analysed = true;

      renderIssues();
      renderScore(data.score);
      
      document.getElementById('a11y-summary').textContent =
        `${data.summary}  •  ${data.ms}ms`;
      document.getElementById('a11y-actions').style.display = issues.length ? 'flex' : 'none';
      document.getElementById('a11y-filters').style.display = issues.length ? 'flex' : 'none';

    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      document.getElementById('a11y-fab').classList.remove('loading');
    }
  }

  function renderScore(score) {
    const badge = document.getElementById('a11y-score-badge');
    badge.textContent = `Score: ${score}`;
    badge.style.display = 'inline-block';
    badge.className = ''; // reset
    if (score >= 90) badge.classList.add('a11y-score-badge', 'good');
    else if (score >= 50) badge.classList.add('a11y-score-badge', 'fair');
    else badge.classList.add('a11y-score-badge', 'poor');
  }

  // ── Render issue list ─────────────────────────────────────────────────────
  function renderIssues() {
    const list = document.getElementById('a11y-list');
    if (!globalAuditData) return;

    const filter = document.querySelector('.a11y-filter-chip.active').dataset.filter;
    const filteredIssues = filter === 'all' 
      ? globalAuditData.issues 
      : globalAuditData.issues.filter(i => i.severity === filter);

    if (!filteredIssues.length) {
      list.innerHTML = `<div id="a11y-status" style="color:#27ae60">No ${filter === 'all' ? '' : filter} issues found!</div>`;
      return;
    }

    list.innerHTML = filteredIssues.map(issue => `
      <div class="a11y-issue" data-id="${issue.id}">
        <span class="a11y-badge ${issue.severity}">${issue.severity}</span>
        <div class="a11y-issue-body">
          <div class="a11y-issue-type">
            ${issue.type.replace(/_/g, ' ')}
            ${issue.wcag ? `<span class="a11y-wcag">${issue.wcag}</span>` : ''}
            ${issue.impact ? `<span class="a11y-impact ${issue.impact}">${issue.impact}</span>` : ''}
          </div>
          <div class="a11y-issue-desc">${escHtml(issue.description)}</div>
          <button class="a11y-fix-btn" data-id="${issue.id}">Apply fix</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.a11y-fix-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const issue = issues.find(i => i.id === btn.dataset.id);
        if (issue) applyFix(issue, btn);
      });
    });

    // Hover → highlight & peek fix
    list.querySelectorAll('.a11y-issue').forEach(row => {
      row.addEventListener('mouseenter', () => {
        highlightElement(row.dataset.id, true);
        peekFix(row.dataset.id, true);
      });
      row.addEventListener('mouseleave', () => {
        highlightElement(row.dataset.id, false);
        peekFix(row.dataset.id, false);
      });
    });
  }

  // Peek fix (temporary application on hover)
  function peekFix(id, on) {
    if (appliedFixes[id]) return; // already applied
    const issue = issues.find(i => i.id === id);
    if (!issue || !issue.fix.style) return; // only style fixes are safe to peek easily

    const el = safeQuerySelector(issue.selector);
    if (!el) return;

    if (on) {
      el.dataset.a11yPrePeek = el.style[issue.fix.style];
      el.style[issue.fix.style] = issue.fix.value;
      el.style.transition = 'all 0.3s ease';
    } else {
      el.style[issue.fix.style] = el.dataset.a11yPrePeek || '';
      delete el.dataset.a11yPrePeek;
    }
  }

  function setStatus(msg) {
    document.getElementById('a11y-list').innerHTML = `<div id="a11y-status">${msg}</div>`;
  }

  // ── Apply / undo fixes ────────────────────────────────────────────────────
  function applyFix(issue, btn) {
    if (appliedFixes[issue.id]) return;

    const el = safeQuerySelector(issue.selector);
    if (!el) {
      if (btn) { btn.textContent = 'Element not found'; btn.disabled = true; }
      return;
    }

    const fix = issue.fix;
    let undoFn;

    if (fix.style) {
      const prev = el.style[fix.style];
      el.style[fix.style] = fix.value;
      undoFn = () => { el.style[fix.style] = prev; };

    } else if (fix.attribute) {
      const prev = el.getAttribute(fix.attribute);
      el.setAttribute(fix.attribute, fix.value);
      undoFn = () => {
        if (prev === null) el.removeAttribute(fix.attribute);
        else el.setAttribute(fix.attribute, prev);
      };

    } else if (fix.removeAttribute) {
      const prev = el.getAttribute(fix.removeAttribute);
      el.removeAttribute(fix.removeAttribute);
      undoFn = () => { if (prev !== null) el.setAttribute(fix.removeAttribute, prev); };

    } else if (fix.insertBefore) {
      const ghost = document.createElement('div');
      ghost.innerHTML = fix.insertBefore;
      const inserted = ghost.firstElementChild;
      el.parentNode.insertBefore(inserted, el);
      undoFn = () => inserted.remove();

    } else if (fix.textContent) {
      const prev = el.textContent;
      el.textContent = fix.value;
      undoFn = () => { el.textContent = prev; };

    } else {
      if (btn) { btn.textContent = 'Unknown fix type'; btn.disabled = true; }
      return;
    }

    appliedFixes[issue.id] = { el, undoFn };
    if (btn) { btn.classList.add('applied'); btn.textContent = 'Applied'; btn.disabled = true; }
  }

  function undoFix(id) {
    if (!appliedFixes[id]) return;
    appliedFixes[id].undoFn();
    delete appliedFixes[id];
    const btn = document.querySelector(`.a11y-fix-btn[data-id="${id}"]`);
    if (btn) { btn.classList.remove('applied'); btn.textContent = 'Apply fix'; btn.disabled = false; }
  }

  function applyAllFixes() {
    issues.forEach(issue => {
      const btn = document.querySelector(`.a11y-fix-btn[data-id="${issue.id}"]`);
      applyFix(issue, btn);
    });
  }

  function undoAllFixes() {
    Object.keys(appliedFixes).forEach(undoFix);
  }

  // ── Highlight element on hover ────────────────────────────────────────────
  function highlightElement(id, on) {
    const issue = issues.find(i => i.id === id);
    if (!issue) return;
    const el = safeQuerySelector(issue.selector);
    if (!el) return;
    el.classList.toggle('a11y-highlight', on);
  }

  // ── Enhancements Logic ───────────────────────────────────────────────────
  const SETTINGS_KEY = 'a11y_settings';
  let settings = {
    grayscale: false,
    invert: false,
    'high-contrast': false,
    'links-visible': false,
    'focus-visible': false,
    'missing-alt': false,
    fontSize: 100,
    lineSpacing: 1.0,
  };

  function toggleEnhancement(tool, btn) {
    settings[tool] = !settings[tool];
    document.documentElement.classList.toggle(`a11y-${tool}`, settings[tool]);
    if (btn) btn.classList.toggle('active', settings[tool]);
    saveSettings();
  }

  function adjustFont(delta) {
    settings.fontSize = Math.min(200, Math.max(50, settings.fontSize + delta));
    document.documentElement.style.fontSize = `${settings.fontSize}%`;
    document.getElementById('a11y-font-val').textContent = `${settings.fontSize}%`;
    saveSettings();
  }

  function adjustLine(delta) {
    settings.lineSpacing = Math.min(3, Math.max(1, parseFloat((settings.lineSpacing + delta).toFixed(1))));
    document.body.style.lineHeight = settings.lineSpacing;
    document.getElementById('a11y-line-val').textContent = settings.lineSpacing.toFixed(1);
    saveSettings();
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function restoreSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return;
    try {
      settings = JSON.parse(saved);
      // Re-apply classes
      ['grayscale', 'invert', 'high-contrast', 'links-visible', 'focus-visible', 'missing-alt'].forEach(tool => {
        document.documentElement.classList.toggle(`a11y-${tool}`, !!settings[tool]);
        const btn = document.querySelector(`.a11y-tool-btn[data-tool="${tool}"]`);
        if (btn) btn.classList.toggle('active', !!settings[tool]);
      });
      // Re-apply styles
      document.documentElement.style.fontSize = `${settings.fontSize}%`;
      document.getElementById('a11y-font-val').textContent = `${settings.fontSize}%`;
      document.body.style.lineHeight = settings.lineSpacing;
      document.getElementById('a11y-line-val').textContent = settings.lineSpacing.toFixed(1);
    } catch (e) { console.error('Failed to restore a11y settings', e); }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.A11yWidget = {
    init(opts = {}) {
      if (opts.api) CONFIG.api = opts.api;
      if (opts.key) CONFIG.key = opts.key;
      injectStyles();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildUI);
      } else {
        buildUI();
      }
    },
  };

  // Auto-init if data-api attribute is present on the script tag
  if (CONFIG.api) {
    window.A11yWidget.init();
  }
})();
