/**
 * a11y-widget.js
 * Dropdown Version: Opens on hover/focus, features persist on close.
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
    #a11y-container {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483645;
      display: flex; flex-direction: column; align-items: flex-end;
    }

    #a11y-fab {
      width: 50px; height: 50px; border-radius: 50%;
      background: #185FA5; color: #fff; border: none;
      font-size: 22px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.25);
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, transform .15s;
    }
    #a11y-fab:hover, #a11y-fab:focus { background: #0C447C; transform: scale(1.07); }

    #a11y-panel {
      position: absolute; bottom: 65px; right: 0;
      width: 340px; max-height: 80vh;
      background: #fff; border: 1px solid #ddd; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px; color: #1a1a1a;
      display: none; flex-direction: column; overflow: hidden;
    }
    #a11y-container:hover #a11y-panel, #a11y-container:focus-within #a11y-panel { display: flex; }

    #a11y-panel-header {
      padding: 12px 16px; border-bottom: 1px solid #eee; background: #fafafa;
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0;
    }
    #a11y-panel-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: #185FA5; }

    .a11y-section { display: flex; flex-direction: column; flex: 1; overflow-y: auto; max-height: 400px; }
    .a11y-enhance-group { padding: 14px 16px; border-bottom: 1px solid #eee; }
    .a11y-enhance-group:last-child { border-bottom: none; }
    .a11y-enhance-title { font-size: 10px; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px; }
    
    .a11y-tool-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .a11y-tool-btn { padding: 7px; border: 1px solid #ddd; border-radius: 6px; background: #fff; font-size: 11px; cursor: pointer; text-align: center; }
    .a11y-tool-btn.active { background: #185FA5; color: #fff; border-color: #185FA5; font-weight: 600; }

    .a11y-range-group { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
    .a11y-range-label { flex: 1; font-size: 12px; }
    .a11y-range-value { width: 40px; text-align: right; font-weight: 700; color: #185FA5; font-size: 12px; }

    /* Performance & Persistence highlights */
    html.a11y-grayscale { filter: grayscale(100%) !important; }
    html.a11y-invert { filter: invert(100%) !important; }
    html.a11y-high-contrast { background: #000 !important; color: #ffff00 !important; }
    html.a11y-high-contrast * { background-color: #000 !important; color: #ffff00 !important; border-color: #ffff00 !important; }
    html.a11y-links-visible a { text-decoration: underline !important; outline: 2px solid #ffff00 !important; outline-offset: 1px !important; background: #000 !important; color: #fff !important; }
    html.a11y-focus-visible *:focus { outline: 3px solid #185FA5 !important; outline-offset: 2px !important; }
    html.a11y-missing-alt img:not([alt]), html.a11y-missing-alt img[alt=""] { outline: 4px solid #ff0000 !important; }
  `;

  // ── Logic ─────────────────────────────────────────────────────────────────
  const SETTINGS_KEY = 'a11y_settings';
  let settings = { grayscale: false, invert: false, 'high-contrast': false, 'links-visible': true, 'focus-visible': true, 'missing-alt': true, fontSize: 100 };

  function injectStyles() {
    if (document.getElementById('a11y-styles')) return;
    const style = document.createElement('style');
    style.id = 'a11y-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function applySettingsToDOM() {
    const html = document.documentElement;
    ['grayscale', 'invert', 'high-contrast', 'links-visible', 'focus-visible', 'missing-alt'].forEach(t => {
      html.classList.toggle(`a11y-${t}`, !!settings[t]);
      const btn = document.querySelector(`.a11y-tool-btn[data-tool="${t}"]`);
      if (btn) btn.classList.toggle('active', !!settings[t]);
    });
    html.style.fontSize = settings.fontSize + '%';
    const fv = document.getElementById('a11y-font-val');
    if (fv) fv.innerText = settings.fontSize + '%';
  }

  function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function restoreSettings() {
    const s = localStorage.getItem(SETTINGS_KEY);
    if (s) {
      try { settings = { ...settings, ...JSON.parse(s) }; } catch(e){}
      applySettingsToDOM(); // Apply ONLY if we have saved settings
    }
  }

  function buildUI() {
    if (document.getElementById('a11y-container')) return;

    const container = document.createElement('div');
    container.id = 'a11y-container';
    container.innerHTML = `
      <div id="a11y-panel">
        <div id="a11y-panel-header">
          <h3>♿ Accessibility Toolbar</h3>
        </div>
        <div class="a11y-section">
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
              <button class="a11y-tool-btn" style="width:30px; padding:4px" id="a11y-font-dec">−</button>
              <span class="a11y-range-value" id="a11y-font-val">100%</span>
              <button class="a11y-tool-btn" style="width:30px; padding:4px" id="a11y-font-inc">+</button>
            </div>
          </div>

          <div style="padding: 12px 16px; font-size: 10px; color:#aaa; line-height:1.2">
            Links, Focus & Alt diagnostics are auto-enhanced globally.
          </div>
        </div>
      </div>
      <button id="a11y-fab" aria-label="Open Accessibility Menu" title="Accessibility Settings">♿</button>
    `;

    document.body.appendChild(container);

    // listeners
    container.querySelectorAll('.a11y-tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        settings[btn.dataset.tool] = !settings[btn.dataset.tool];
        applySettingsToDOM();
        saveSettings();
      });
    });

    document.getElementById('a11y-font-inc').addEventListener('click', () => { settings.fontSize = Math.min(200, settings.fontSize + 10); applySettingsToDOM(); saveSettings(); });
    document.getElementById('a11y-font-dec').addEventListener('click', () => { settings.fontSize = Math.max(50, settings.fontSize - 10); applySettingsToDOM(); saveSettings(); });

    restoreSettings();
  }

  window.A11yWidget = { init() { injectStyles(); buildUI(); } };
  window.A11yWidget.init();
})();
