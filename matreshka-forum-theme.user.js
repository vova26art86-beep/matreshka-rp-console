// ==UserScript==
// @name         Matreshka RP — Forum Atelier Theme
// @namespace    https://github.com/vova26art86-beep/matreshka-rp-console
// @version      1.0.1
// @description  Единое современное оформление форума Matreshka RP с выбором темы
// @author       Vladimir
// @match        https://forum.matrp.ru/*
// @match        http://forum.matrp.ru/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/matreshka-forum-theme.user.js
// @updateURL    https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/matreshka-forum-theme.user.js
// ==/UserScript==

(() => {
  'use strict';
  const STYLE_ID = 'matrp-atelier-forum-theme';
  const WIDGET_ID = 'matrp-atelier-theme-widget';
  const STORAGE_KEY = 'matrp_forum_atelier_theme_v1';
  const THEMES = {
    violet: { label: 'Violet Night', accent: '#a855f7', accent2: '#ec4899', bg: '#0c0a14', surface: '#151121', surface2: '#1d1730', text: '#f5f0ff', muted: '#b3a9c9', border: '#8b5cf633' },
    cyan: { label: 'Cyber Cyan', accent: '#22d3ee', accent2: '#818cf8', bg: '#071018', surface: '#0d1b27', surface2: '#132738', text: '#ecfaff', muted: '#9ab9c9', border: '#22d3ee33' },
    emerald: { label: 'Emerald', accent: '#34d399', accent2: '#2dd4bf', bg: '#07120f', surface: '#0e1d19', surface2: '#163027', text: '#edfff7', muted: '#9ebfb0', border: '#34d39933' },
    pearl: { label: 'Pearl Light', accent: '#7c3aed', accent2: '#db2777', bg: '#f3f0fa', surface: '#ffffff', surface2: '#eee8f7', text: '#241b35', muted: '#71667f', border: '#7c3aed2b' }
  };
  let current = 'violet';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES[saved]) current = saved;
  } catch {}

  const css = document.createElement('style');
  css.id = STYLE_ID;
  css.textContent = `
    html{scroll-behavior:smooth}
    body{background:var(--ma-bg,#0c0a14)!important;color:var(--ma-text,#f5f0ff)!important}
    body:before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 12% 0%,color-mix(in srgb,var(--ma-accent) 15%,transparent),transparent 38%),radial-gradient(ellipse at 92% 20%,color-mix(in srgb,var(--ma-accent2) 10%,transparent),transparent 34%);background-attachment:fixed}
    .p-pageWrapper,.p-body,.p-body-inner,.p-body-main,.p-body-content{background:transparent!important;color:var(--ma-text)!important}
    .p-header{background:linear-gradient(115deg,color-mix(in srgb,var(--ma-surface) 96%,var(--ma-accent)),var(--ma-bg))!important;border-bottom:1px solid var(--ma-border)!important;box-shadow:0 8px 34px #0003}
    .p-header-inner{min-height:90px}
    .p-nav,.p-nav-inner,.p-nav-smallLogo{background:color-mix(in srgb,var(--ma-surface) 94%,transparent)!important}
    .p-nav{border-top:1px solid var(--ma-border)!important;border-bottom:1px solid var(--ma-border)!important;backdrop-filter:blur(14px)}
    .p-navEl-link,.p-navEl-splitTrigger,.p-navgroup-link{color:var(--ma-text)!important;transition:background .16s ease,color .16s ease}
    .p-navEl-link:hover,.p-navEl-splitTrigger:hover,.p-navgroup-link:hover,.p-navEl.is-selected .p-navEl-link{background:linear-gradient(115deg,color-mix(in srgb,var(--ma-accent) 28%,var(--ma-surface)),color-mix(in srgb,var(--ma-accent2) 15%,var(--ma-surface)))!important;color:var(--ma-text)!important}
    .p-sectionLinks,.p-sectionLinks-inner{background:color-mix(in srgb,var(--ma-surface) 82%,transparent)!important;border-bottom:1px solid var(--ma-border)!important}
    .p-breadcrumbs li a,.p-breadcrumbs li{color:var(--ma-muted)!important}
    .block-container,.blockMessage,.menu,.overlay,.tooltip,.offCanvasMenu,.structItemContainer,.message,.message-cell,.message-cell--main,.message-userExtras,.formRow,.formSubmitRow,.p-body-header,.tabs,.tabs-tab,.pageNav a,.pageNav-page,.pageNav-jump{background:var(--ma-surface)!important;color:var(--ma-text)!important;border-color:var(--ma-border)!important}
    .block-container,.blockMessage,.message,.structItemContainer,.menu,.overlay{border:1px solid var(--ma-border)!important;border-radius:13px!important;box-shadow:0 12px 34px #0002}
    .block-header,.block-minorHeader,.block-tabHeader,.block-filterBar,.structItemContainer-group--sticky,.message-attribution,.message-footer,.message-signature,.formRow>dt,.dataList-cell--alt,.dataList-row.is-deleted{background:var(--ma-surface2)!important;color:var(--ma-text)!important;border-color:var(--ma-border)!important}
    .structItem{border-color:var(--ma-border)!important;transition:background .16s ease}
    .structItem:hover{background:color-mix(in srgb,var(--ma-accent) 7%,var(--ma-surface))!important}
    .structItem-title a,.block-header a,.contentRow-title a,.message-name a,.username,.username a,.p-title-value,.filterBar-filterToggle,.tabs-tab.is-active{color:var(--ma-text)!important}
    a{color:var(--ma-accent)!important}
    a:hover{color:var(--ma-accent2)!important}
    .button,.buttonGroup-button,.menu-linkRow,.pageNav-page,.pageNav-jump,.formSubmitRow-bar{border-color:var(--ma-border)!important}
    .button--primary,.button.button--primary,.button--cta{background:linear-gradient(115deg,var(--ma-accent),var(--ma-accent2))!important;color:#fff!important;border:0!important;box-shadow:0 5px 18px color-mix(in srgb,var(--ma-accent) 24%,transparent)}
    .button:not(.button--primary):not(.button--cta),.buttonGroup-button{background:var(--ma-surface2)!important;color:var(--ma-text)!important}
    input,input[type=text],input[type=search],input[type=email],input[type=password],textarea,select,.input,.inputGroup-text{background:var(--ma-surface2)!important;color:var(--ma-text)!important;border-color:var(--ma-border)!important;border-radius:9px!important}
    input:focus,textarea:focus,select:focus{border-color:var(--ma-accent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--ma-accent) 18%,transparent)!important;outline:none!important}
    .avatar,.avatar img,.avatar--s,.avatar--m,.avatar--l{border-radius:50%;box-shadow:0 0 0 2px color-mix(in srgb,var(--ma-accent) 38%,transparent)}
    .label,.label a{border-radius:5px}
    .badge,.badgeContainer:after{background:var(--ma-accent)!important;color:#fff!important}
    .message-userArrow{border-right-color:var(--ma-surface)!important}
    .p-footer,.p-footer-inner{background:var(--ma-bg)!important;color:var(--ma-muted)!important;border-top:1px solid var(--ma-border)!important}
    .p-footer a{color:var(--ma-muted)!important}
    .menu-arrow,.overlay-title,.overlay-titleCloser{color:var(--ma-text)!important}
    .xfmgThumbnail,.block--category .block-container{border-radius:13px!important;overflow:hidden}
    ::selection{background:color-mix(in srgb,var(--ma-accent) 45%,transparent);color:#fff}
    #${WIDGET_ID}{position:fixed;right:16px;bottom:18px;z-index:2147483000;font:13px/1.4 Arial,sans-serif;color:var(--ma-text);font-family:system-ui,sans-serif}
    #${WIDGET_ID} .ma-toggle{width:46px;height:46px;border:1px solid color-mix(in srgb,var(--ma-accent) 65%,transparent);border-radius:15px;background:linear-gradient(135deg,var(--ma-accent),var(--ma-accent2));color:white;font-size:20px;cursor:pointer;box-shadow:0 10px 28px #0006;transition:transform .16s ease}
    #${WIDGET_ID} .ma-toggle:hover{transform:translateY(-2px) rotate(-4deg)}
    #${WIDGET_ID} .ma-menu{display:none;position:absolute;right:0;bottom:56px;width:220px;padding:13px;border:1px solid var(--ma-border);border-radius:15px;background:var(--ma-surface);box-shadow:0 18px 50px #0008;backdrop-filter:blur(18px)}
    #${WIDGET_ID}.ma-open .ma-menu{display:block}
    #${WIDGET_ID} .ma-title{font-weight:800;letter-spacing:.03em;margin:2px 0 9px}
    #${WIDGET_ID} .ma-option{display:flex;align-items:center;gap:9px;width:100%;padding:9px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--ma-text);text-align:left;cursor:pointer}
    #${WIDGET_ID} .ma-option:hover,#${WIDGET_ID} .ma-option[aria-pressed="true"]{background:var(--ma-surface2);border-color:var(--ma-border)}
    #${WIDGET_ID} .ma-dot{width:12px;height:12px;border-radius:50%;background:var(--dot);box-shadow:0 0 10px var(--dot);flex:0 0 12px}
    #${WIDGET_ID} .ma-foot{font-size:10px;color:var(--ma-muted);margin:9px 2px 0}
    @media(max-width:650px){.p-header-inner{min-height:62px}#${WIDGET_ID}{right:10px;bottom:10px}#${WIDGET_ID} .ma-toggle{width:42px;height:42px}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}#${WIDGET_ID} *{transition:none!important}}
  `;
  function attachStyle() {
    const target = document.head || document.documentElement;
    if (target && !document.getElementById(STYLE_ID)) target.appendChild(css);
  }
  attachStyle();

  function applyTheme(name) {
    const t = THEMES[name];
    if (!t) return;
    current = name;
    const root = document.documentElement;
    root.style.setProperty('--ma-bg', t.bg);
    root.style.setProperty('--ma-surface', t.surface);
    root.style.setProperty('--ma-surface2', t.surface2);
    root.style.setProperty('--ma-text', t.text);
    root.style.setProperty('--ma-muted', t.muted);
    root.style.setProperty('--ma-accent', t.accent);
    root.style.setProperty('--ma-accent2', t.accent2);
    root.style.setProperty('--ma-border', t.border);
    root.dataset.matreshkaTheme = name;
    try { localStorage.setItem(STORAGE_KEY, name); } catch {}
    const widget = document.getElementById(WIDGET_ID);
    if (widget) widget.querySelectorAll('.ma-option').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === name)));
  }

  function mountWidget() {
    if (!document.body || document.getElementById(WIDGET_ID)) return;
    const widget = document.createElement('div');
    widget.id = WIDGET_ID;
    widget.innerHTML = `
      <div class="ma-menu" role="menu" aria-label="Оформление форума">
        <div class="ma-title">Оформление форума</div>
        <button class="ma-option" data-theme="violet" aria-pressed="false"><span class="ma-dot" style="--dot:#a855f7"></span> Violet Night</button>
        <button class="ma-option" data-theme="cyan" aria-pressed="false"><span class="ma-dot" style="--dot:#22d3ee"></span> Cyber Cyan</button>
        <button class="ma-option" data-theme="emerald" aria-pressed="false"><span class="ma-dot" style="--dot:#34d399"></span> Emerald</button>
        <button class="ma-option" data-theme="pearl" aria-pressed="false"><span class="ma-dot" style="--dot:#c4b5fd"></span> Pearl Light</button>
        <div class="ma-foot">Выбор сохраняется на этом устройстве</div>
      </div>
      <button class="ma-toggle" type="button" aria-label="Выбрать оформление форума" title="Оформление форума">✦</button>
    `;
    widget.querySelector('.ma-toggle').addEventListener('click', () => widget.classList.toggle('ma-open'));
    widget.querySelectorAll('.ma-option').forEach(button => button.addEventListener('click', () => {
      applyTheme(button.dataset.theme);
      widget.classList.remove('ma-open');
    }));
    document.addEventListener('click', event => { if (!widget.contains(event.target)) widget.classList.remove('ma-open'); });
    document.body.appendChild(widget);
    applyTheme(current);
  }

  applyTheme(current);
  const bootObserver = new MutationObserver(() => {
    attachStyle();
    if (document.body && !document.getElementById(WIDGET_ID)) mountWidget();
    if (document.head && document.body && document.getElementById(STYLE_ID) && document.getElementById(WIDGET_ID)) bootObserver.disconnect();
  });
  bootObserver.observe(document.documentElement || document, { childList: true, subtree: true });
  if (document.body) mountWidget();
})();
