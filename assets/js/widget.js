/**
 * a11y-widget.js
 * Drop this script into any page to add AI-powered accessibility analysis.
 */

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const scriptEl = document.currentScript;
  const urlParams = new URLSearchParams(window.location.search);
  const CONFIG = {
    api: scriptEl?.dataset.api || '',
    key: scriptEl?.dataset.key || '',
    showAudit: urlParams.has('a11y_audit'),
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
      width: 360px; max-height: 80vh;
      background: #fff; border: 1px solid #ddd; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px; color: #1a1a1a;
      display: none; flex-direction: column; overflow: hidden;
    }
    #a11y-panel.open { display: flex; }

    #a11y-panel-header {
      padding: 14px 16px; border-bottom: 1px solid #eee;
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

    .a11y-enhance-group { padding: 16px; border-bottom: 1px solid #eee; }
    .a11y-enhance-group:last-child { border-bottom: none; }
    .a11y-enhance-title { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; margin-bottom: 12px; }
    
    .a11y-tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .a11y-tool-btn {
      padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: #fff;
      font-size: 12px; cursor: pointer; text-align: center; transition: all .15s;
    }
    .a11y-tool-btn.active { background: #185FA5; color: #fff; border-color: #185FA5; }

    #a11y-reset-wrap { padding: 12px 16px; text-align: center; border-top: 1px solid #eee; background: #fafafa; }
    #a11y-reset-btn { background: none; border: none; color: #888; font-size: 11px; cursor: pointer; text-decoration: underline; }
    #a11y-reset-btn:hover { color: #c62828; }

    .a11y-range-group { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .a11y-range-label { flex: 1; font-size: 13px; }
    .a11y-range-value { width: 42px; text-align: right; font-weight: 600; color: #185FA5; }

    /* Audit-specific styles */
    #a11y-summary { padding: 10px 16px; font-size: 12px; color: #555; background: #fdfdfd; border-bottom: 1px solid #eee; }
    #a11y-actions { padding: 10px 16px; display: flex; gap: 8px; border-bottom: 1px solid #eee; }
    #a11y-rescan, #a11y-apply-all, #a11y-undo-all { 
      flex: 1; padding: 7px; font-size: 11px; cursor: pointer; border-radius: 6px; border: 1px solid #ccc; background: #fff;
    }
    #a11y-apply-all { background: #185FA5; color: #fff; border-color: #185FA5; }
    
    .a11y-issue { padding: 12px 16px; border-bottom: 1px solid #f5f5f5; display: flex; gap: 12px; }
    .a11y-badge { flex-shrink: 0; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; height: fit-content; }
    .a11y-badge.critical { background: #fee2e2; color: #991b1b; }
    .a11y-badge.warning { background: #fef3c7; color: #92400e; }
    .a11y-issue-type { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
    .a11y-issue-desc { font-size: 13px; line-height: 1.4; margin-bottom: 8px; }

    #a11y-status { padding: 20px; text-align: center; color: #888; font-size: 13px; }
    #a11y-score-badge { font-size: 11px; font-weight: 700; background: #eee; padding: 2px 8px; border-radius: 10px; margin-left: 10px; }
    #a11y-score-badge.good { background: #e8f5e9; color: #2e7d32; }
    #a11y-score-badge.fair { background: #fff3e0; color: #ef6c00; }
    #a11y-score-badge.poor { background: #ffebee; color: #c62828; }

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
    fab.innerHTML = '&#9854;'; // ♿

    const panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.innerHTML = `
      <div id="a11y-panel-header">
        <h3 style="display:flex;align-items:center">
          ♿ Accessibility ${CONFIG.showAudit ? 'Suite' : 'Toolbar'}
          <span id="a11y-score-badge" style="display:none"></span>
        </h3>
        <button id="a11y-close">✕</button>
      </div>

      ${CONFIG.showAudit ? `
      <div id="a11y-tabs">
        <button class="a11y-tab active" data-tab="enhance">Enhance</button>
        <button class="a11y-tab" data-tab="audit">Audit</button>
      </div>` : ''}

      <div id="a11y-section-enhance" class="a11y-section active">
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

        <div style="padding: 16px; font-size: 11px; color:#888; border-top:1px solid #eee;">
          Visual accessibility baseline (Link Highlighting, Alt-Text Diagnostics, Focus Enhancement) is active.
        </div>
      </div>

      ${CONFIG.showAudit ? `
      <div id="a11y-section-audit" class="a11y-section">
        <div id="a11y-summary"></div>
        <div id="a11y-actions" style="display:none">
          <button id="a11y-apply-all">Apply fixes</button>
          <button id="a11y-undo-all">Undo</button>
          <button id="a11y-rescan">Re-scan</button>
        </div>
        <div id="a11y-list">
          <div id="a11y-status">Click "Re-scan" to audit.</div>
        </div>
      </div>` : ''}

      <div id="a11y-reset-wrap">
        <button id="a11y-reset-btn">Reset to Default Settings</button>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    // Event Listeners
    if (CONFIG.showAudit) {
      panel.querySelectorAll('.a11y-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          panel.querySelectorAll('.a11y-tab, .a11y-section').forEach(el => el.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(`a11y-section-${tab.dataset.tab}`).classList.add('active');
        });
      });
      const rescanBtn = document.getElementById('a11y-rescan');
      if (rescanBtn) rescanBtn.addEventListener('click', runAnalysis);
    }

    panel.querySelectorAll('.a11y-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => toggleEnhancement(btn.dataset.tool, btn));
    });

    document.getElementById('a11y-font-inc').addEventListener('click', () => adjustFont(10));
    document.getElementById('a11y-font-dec').addEventListener('click', () => adjustFont(-10));
    document.getElementById('a11y-line-inc').addEventListener('click', () => adjustLine(0.1));
    document.getElementById('a11y-line-dec').addEventListener('click', () => adjustLine(-0.1));
    document.getElementById('a11y-reset-btn').addEventListener('click', resetSettings);

    fab.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      if (open && CONFIG.showAudit && issues.length === 0) runAnalysis();
    });
    document.getElementById('a11y-close').addEventListener('click', () => panel.classList.remove('open'));

    restoreSettings();
  }

  // ── Logic ─────────────────────────────────────────────────────────────────
  let issues = [];
  let appliedFixes = {};

  const SETTINGS_KEY = 'a11y_settings';
  const DEFAULTS = {
    grayscale: false,
    invert: false,
    'high-contrast': false,
    'links-visible': true,
    'focus-visible': true,
    'missing-alt': true,
    fontSize: 100,
    lineSpacing: 1.0,
  };
  let settings = { ...DEFAULTS };

  function resetSettings() {
    if (!confirm('Revert all accessibility settings to default?')) return;
    localStorage.removeItem(SETTINGS_KEY);
    settings = { ...DEFAULTS };
    applySettingsToDOM();
  }

  async function runAnalysis() {
    if (!CONFIG.showAudit) return;
    setStatus('Scanning...');
    try {
      const res = await fetch(CONFIG.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CONFIG.key },
        body: JSON.stringify(captureSnapshot()),
      });
      const data = await res.json();
      issues = data.issues || [];
      renderIssues(data);
    } catch (e) { setStatus('Error: ' + e.message); }
  }

  function setStatus(txt) {
    const list = document.getElementById('a11y-list');
    if (list) list.innerHTML = `<div id="a11y-status">${txt}</div>`;
  }

  function renderIssues(data) {
    const list = document.getElementById('a11y-list');
    const summary = document.getElementById('a11y-summary');
    const actions = document.getElementById('a11y-actions');
    const scoreBadge = document.getElementById('a11y-score-badge');

    if (summary) summary.innerText = data.summary || 'Audit complete.';
    if (actions) actions.style.display = issues.length ? 'flex' : 'none';
    
    if (scoreBadge) {
      scoreBadge.innerText = 'Score: ' + (data.score || 0);
      scoreBadge.style.display = 'block';
      scoreBadge.className = 'good'; // simple default
    }

    list.innerHTML = issues.map(i => `
      <div class="a11y-issue">
        <span class="a11y-badge ${i.severity}">${i.severity}</span>
        <div>
          <div class="a11y-issue-type">${i.type.replace(/_/g,' ')}</div>
          <div class="a11y-issue-desc">${i.description}</div>
          <button class="a11y-fix-btn" onclick="A11yWidget._apply('${i.id}')">Apply Fix</button>
        </div>
      </div>
    `).join('');
  }

  function captureSnapshot() {
    const clone = document.body.cloneNode(true);
    clone.querySelector('#a11y-fab')?.remove();
    clone.querySelector('#a11y-panel')?.remove();
    return { html: clone.innerHTML, url: window.location.href };
  }

  function toggleEnhancement(tool, btn) {
    settings[tool] = !settings[tool];
    applySettingsToDOM();
    saveSettings();
  }

  function adjustFont(d) {
    settings.fontSize = Math.min(200, Math.max(50, settings.fontSize + d));
    applySettingsToDOM();
    saveSettings();
  }

  function adjustLine(d) {
    settings.lineSpacing = Math.min(3, Math.max(1, parseFloat((settings.lineSpacing + d).toFixed(1))));
    applySettingsToDOM();
    saveSettings();
  }

  function applySettingsToDOM() {
    ['grayscale', 'invert', 'high-contrast', 'links-visible', 'focus-visible', 'missing-alt'].forEach(t => {
      document.documentElement.classList.toggle(`a11y-${t}`, !!settings[t]);
      const btn = document.querySelector(`.a11y-tool-btn[data-tool="${t}"]`);
      if (btn) btn.classList.toggle('active', !!settings[t]);
    });
    document.documentElement.style.fontSize = settings.fontSize + '%';
    const fv = document.getElementById('a11y-font-val');
    if (fv) fv.innerText = settings.fontSize + '%';
    document.body.style.lineHeight = settings.lineSpacing;
    const lv = document.getElementById('a11y-line-val');
    if (lv) lv.innerText = settings.lineSpacing.toFixed(1);
  }

  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function restoreSettings() {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) try { settings = { ...settings, ...JSON.parse(s) }; } catch(e){}
    applySettingsToDOM();
  }

  function applyAllFixes() { /* Logic simplified for this step */ }
  function undoAllFixes() { /* Logic simplified for this step */ }

  window.A11yWidget = {
    init() {
      injectStyles();
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
      else buildUI();
    },
    // Backdoor proxy for simple inline events if needed
    _apply(id) { console.log('Applying fix:', id); } 
  };

  if (CONFIG.api) window.A11yWidget.init();
})();
