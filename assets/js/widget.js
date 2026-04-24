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
      width: 340px; max-height: 70vh;
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

    #a11y-status {
      padding: 12px 16px; text-align: center; color: #555; font-size: 13px;
    }
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
        <h3>♿ Accessibility AI</h3>
        <button id="a11y-close" aria-label="Close panel">✕</button>
      </div>
      <div id="a11y-summary"></div>
      <div id="a11y-actions" style="display:none">
        <button id="a11y-apply-all">Apply all fixes</button>
        <button id="a11y-undo-all">Undo all</button>
        <button id="a11y-rescan">Re-scan</button>
      </div>
      <div id="a11y-list">
        <div id="a11y-status">Click "Analyse" to scan this page.</div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    fab.addEventListener('click', onFabClick);
    document.getElementById('a11y-close').addEventListener('click', closePanel);
    document.getElementById('a11y-apply-all').addEventListener('click', applyAllFixes);
    document.getElementById('a11y-undo-all').addEventListener('click', undoAllFixes);
    document.getElementById('a11y-rescan').addEventListener('click', runAnalysis);
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

  // ── API call ──────────────────────────────────────────────────────────────
  async function runAnalysis() {
    setStatus('Scanning page…');
    document.getElementById('a11y-summary').textContent = '';
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
      issues = data.issues || [];
      analysed = true;

      renderIssues(data);
      document.getElementById('a11y-summary').textContent =
        `${data.summary}  •  ${data.ms}ms`;
      document.getElementById('a11y-actions').style.display = issues.length ? 'flex' : 'none';

    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      document.getElementById('a11y-fab').classList.remove('loading');
    }
  }

  // ── Render issue list ─────────────────────────────────────────────────────
  function renderIssues(data) {
    const list = document.getElementById('a11y-list');

    if (!data.issues.length) {
      list.innerHTML = '<div id="a11y-status" style="color:#27ae60">✓ No issues found!</div>';
      return;
    }

    list.innerHTML = data.issues.map(issue => `
      <div class="a11y-issue" data-id="${issue.id}">
        <span class="a11y-badge ${issue.severity}">${issue.severity}</span>
        <div class="a11y-issue-body">
          <div class="a11y-issue-type">${issue.type.replace(/_/g, ' ')}</div>
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

    // Hover → highlight element
    list.querySelectorAll('.a11y-issue').forEach(row => {
      row.addEventListener('mouseenter', () => highlightElement(row.dataset.id, true));
      row.addEventListener('mouseleave', () => highlightElement(row.dataset.id, false));
    });
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
