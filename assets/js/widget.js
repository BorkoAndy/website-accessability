/**
 * a11y-widget.js
 * Master Toggle Version: Baseline enhancements only apply when the drawer is open.
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
    #a11y-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #666; padding: 0 4px; }

    #a11y-tabs { display: flex; border-bottom: 1px solid #eee; background: #fafafa; }
    .a11y-tab { flex: 1; padding: 10px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 500; color: #666; border-bottom: 2px solid transparent; }
    .a11y-tab.active { color: #185FA5; border-bottom-color: #185FA5; background: #fff; }

    .a11y-section { display: none; flex-direction: column; flex: 1; overflow-y: auto; }
    .a11y-section.active { display: flex; }

    .a11y-enhance-group { padding: 16px; border-bottom: 1px solid #eee; }
    .a11y-enhance-group:last-child { border-bottom: none; }
    .a11y-enhance-title { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; margin-bottom: 12px; }
    
    .a11y-tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .a11y-tool-btn { padding: 8px; border: 1px solid #ddd; border-radius: 6px; background: #fff; font-size: 12px; cursor: pointer; text-align: center; }
    .a11y-tool-btn.active { background: #185FA5; color: #fff; border-color: #185FA5; }

    .a11y-range-group { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
    .a11y-range-label { flex: 1; font-size: 13px; }
    .a11y-range-value { width: 42px; text-align: right; font-weight: 600; color: #185FA5; }

    /* Highlights */
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
        <h3 style="display:flex;align-items:center">♿ Accessibility ${CONFIG.showAudit ? 'Suite' : 'Toolbar'}</h3>
        <button id="a11y-close">✕</button>
      </div>

      ${CONFIG.showAudit ? `
      <div id="a11y-tabs"><button class="a11y-tab active" data-tab="enhance">Enhance</button><button class="a11y-tab" data-tab="audit">Audit</button></div>` : ''}

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
        </div>
      </div>

      ${CONFIG.showAudit ? `<div id="a11y-section-audit" class="a11y-section"><div id="a11y-status">Click "Re-scan" to audit.</div></div>` : ''}
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    // listeners
    panel.querySelectorAll('.a11y-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        settings[btn.dataset.tool] = !settings[btn.dataset.tool];
        applySettingsToDOM(true);
        saveSettings();
      });
    });

    document.getElementById('a11y-font-inc').addEventListener('click', () => { settings.fontSize = Math.min(200, settings.fontSize + 10); applySettingsToDOM(true); saveSettings(); });
    document.getElementById('a11y-font-dec').addEventListener('click', () => { settings.fontSize = Math.max(50, settings.fontSize - 10); applySettingsToDOM(true); saveSettings(); });

    fab.addEventListener('click', () => {
      const closing = panel.classList.contains('open');
      if (closing) {
        panel.classList.remove('open');
        applySettingsToDOM(false); // Master Reset on Close
      } else {
        panel.classList.add('open');
        applySettingsToDOM(true); // Master Activate on Open
      }
    });

    document.getElementById('a11y-close').addEventListener('click', () => { panel.classList.remove('open'); applySettingsToDOM(false); });

    restoreSettings();
  }

  // ── Logic ─────────────────────────────────────────────────────────────────
  const SETTINGS_KEY = 'a11y_settings';
  let settings = { grayscale: false, invert: false, 'high-contrast': false, 'links-visible': true, 'focus-visible': true, 'missing-alt': true, fontSize: 100 };

  function applySettingsToDOM(active) {
    const html = document.documentElement;
    const tools = ['grayscale', 'invert', 'high-contrast', 'links-visible', 'focus-visible', 'missing-alt'];

    if (active) {
      tools.forEach(t => {
        html.classList.toggle(`a11y-${t}`, !!settings[t]);
        const btn = document.querySelector(`.a11y-tool-btn[data-tool="${t}"]`);
        if (btn) btn.classList.toggle('active', !!settings[t]);
      });
      html.style.fontSize = settings.fontSize + '%';
      const fv = document.getElementById('a11y-font-val');
      if (fv) fv.innerText = settings.fontSize + '%';
    } else {
      // MASTER RESET to NORMAL
      tools.forEach(t => html.classList.remove(`a11y-${t}`));
      html.style.fontSize = '';
    }
  }

  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function restoreSettings() {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) try { settings = { ...settings, ...JSON.parse(s) }; } catch(e){}
    // We update the UI labels but DO NOT apply to DOM yet
    const fv = document.getElementById('a11y-font-val');
    if (fv) fv.innerText = settings.fontSize + '%';
    document.querySelectorAll('.a11y-tool-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', !!settings[btn.dataset.tool]);
    });
  }

  window.A11yWidget = { init() { injectStyles(); buildUI(); } };
  if (CONFIG.api) window.A11yWidget.init();
})();
