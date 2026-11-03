// ==UserScript==
// @name         Vladimir Console — Matreshka RP (4.9.5)
// @namespace    Vladimir_Sudarikov.AtelierConsole
// @version      4.9.5
// @description  Персональная консоль: цвет ника точно берётся из текста плашки Egor_Andyfy; кнопка копирования образца убрана
// @match        https://forum.matrp.ru/*
// @match        http://forum.matrp.ru/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/vladimir-admin.user.js
// @updateURL    https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/vladimir-admin.user.js
// ==/UserScript==

(() => {
  'use strict';

  const OWNER = 'Vladimir_Sudarikov';
  const AUTHORIZED_FORUM_USERS = Object.freeze({
    '109764': 'vlad_copov',
    '341059': 'vladimir_sudarikov'
  });
  const LINKS = {
    myFollowing: 'https://forum.matrp.ru/index.php?members/vladimir_sudarikov.341059/following/',
    heartbeat: 'https://forum.matrp.ru/index.php?forums/obsie-pravila-serverov.1956/'
  };
  const OWNER_LOG_TITLE = 'Ст. специалист по обработке логов';
  const STYLE_REFERENCE = { username: 'Egor_Andyfy', profileId: '155084', storageKey: 'vladimir_atelier_egor_reference_style_v3' };
  const IDS = {
    style: 'vladimir-atelier-320-style',
    launcher: 'vladimir-atelier-320-launcher',
    panel: 'vladimir-atelier-320-panel',
    auth: 'vladimir-atelier-320-auth'
  };
  const KEYS = {
    settings: 'vladimir_atelier_320_settings',
    password: 'vladimir_atelier_320_password',
    session: 'vladimir_atelier_320_session',
    activity: 'vladimir_atelier_330_activity',
    slaCache: 'vladimir_atelier_340_sla_cache',
    slaScanHistory: 'vladimir_atelier_420_sla_scan_history',
    slaTracked: 'vladimir_atelier_442_sla_tracked',
    ownerReferenceStyle: 'vladimir_atelier_egor_reference_style_v3'
  };
  const ITERATIONS = 310000;
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const DEFAULTS = { theme: 'obsidian', accent: '#a78bfa', notes: '', minimized: false, panelHeight: 0, top: 82, right: 18, replyName: '', replyReason: '', cacheEnabled: true, cacheTtlMinutes: 30 };

  if (location.hostname !== 'forum.matrp.ru') {
    console.warn('[Vladimir Console 4.7.3] Скрипт рассчитан на https://forum.matrp.ru/');
    return;
  }
  if (document.getElementById(IDS.launcher)) return;

  const safeGet = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const safeSet = (key, value) => { try { localStorage.setItem(key, value); return true; } catch (e) { console.error('[Vladimir Atelier] Не удалось сохранить данные:', e); return false; } };
  const safeRemove = key => { try { localStorage.removeItem(key); } catch {} };
  let settings = { ...DEFAULTS };
  try {
    const stored = JSON.parse(safeGet(KEYS.settings) || '{}');
    settings = { ...DEFAULTS, ...stored };
    if (!['obsidian', 'pearl', 'forest'].includes(settings.theme)) settings.theme = DEFAULTS.theme;
    if (!/^#[0-9a-f]{6}$/i.test(settings.accent)) settings.accent = DEFAULTS.accent;
    if (typeof settings.notes !== 'string') settings.notes = '';
    if (!Number.isFinite(settings.panelHeight) || settings.panelHeight < 0) settings.panelHeight = DEFAULTS.panelHeight;
    if (!Number.isFinite(settings.top)) settings.top = DEFAULTS.top;
    if (!Number.isFinite(settings.right)) settings.right = DEFAULTS.right;
    if (typeof settings.cacheEnabled !== 'boolean') settings.cacheEnabled = DEFAULTS.cacheEnabled;
    if (![1, 5, 15, 30, 60, 180].includes(Number(settings.cacheTtlMinutes))) settings.cacheTtlMinutes = DEFAULTS.cacheTtlMinutes;
    else settings.cacheTtlMinutes = Number(settings.cacheTtlMinutes);
    // Keep the internal result cache enabled: this avoids re-fetching the same topics.
    settings.cacheEnabled = true;
    settings.cacheTtlMinutes = 30;
  } catch { settings = { ...DEFAULTS }; }
  const saveSettings = () => safeSet(KEYS.settings, JSON.stringify(settings));

  const style = document.createElement('style');
  style.id = IDS.style;
  style.textContent = `
    #${IDS.launcher}{all:initial!important;position:fixed!important;top:auto!important;left:auto!important;right:16px!important;top:16px!important;bottom:auto!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:9px!important;padding:10px 15px!important;border:1px solid #ffffff50!important;border-radius:14px!important;background:linear-gradient(115deg,#c4b5fd,#75e5cf)!important;color:#171322!important;font:900 12px/1.2 Arial,sans-serif!important;letter-spacing:.08em!important;box-shadow:0 10px 30px #0009!important;cursor:pointer!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
    #${IDS.launcher}:hover{filter:brightness(1.08)!important;transform:translateY(-1px)}
    #${IDS.launcher} .vmark{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:#ffffff8a;font-size:12px}
    #${IDS.panel},#${IDS.auth}{font-family:Arial,sans-serif!important;box-sizing:border-box!important;color:#f4f1ff}
    #${IDS.panel} *,#${IDS.auth} *{box-sizing:border-box!important}
    #${IDS.panel}{position:fixed!important;z-index:2147483646!important;top:${Math.max(8, Math.min(settings.top, window.innerHeight-100))}px!important;left:auto!important;right:${Math.max(8, Math.min(settings.right, window.innerWidth-80))}px!important;width:365px!important;max-width:calc(100vw - 20px)!important;max-height:calc(100vh - 100px)!important;overflow:hidden!important;border:1px solid #ffffff26!important;border-radius:18px!important;background:var(--va-bg,#11121b)!important;color:var(--va-text,#f4f1ff)!important;box-shadow:0 22px 70px #000a!important;display:none!important;font-size:13px!important;line-height:1.45!important}
    #${IDS.panel}.va-show{display:block!important}
    #${IDS.panel}.va-pearl{--va-bg:#f5f3fa;--va-card:#fff;--va-card2:#ebe8f3;--va-text:#242033;--va-muted:#777187;--va-line:#24203324}
    #${IDS.panel}.va-obsidian{--va-bg:#11121b;--va-card:#191b28;--va-card2:#202334;--va-text:#f4f1ff;--va-muted:#9696ad;--va-line:#ffffff18}
    #${IDS.panel}.va-forest{--va-bg:#101c1a;--va-card:#172824;--va-card2:#1e3730;--va-text:#eaf8f0;--va-muted:#91b5a4;--va-line:#c8f4df24}
    #${IDS.panel} button,#${IDS.auth} button,#${IDS.auth} input{font:inherit}
    #${IDS.panel} button{cursor:pointer}
    #${IDS.panel} .va-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 14px;background:var(--va-card2);border-bottom:2px solid var(--va-accent,#a78bfa);cursor:move;user-select:none}
    #${IDS.panel} .va-brand{font-weight:900;letter-spacing:.08em;font-size:13px}
    #${IDS.panel} .va-sub{margin-top:3px;color:var(--va-muted);font-size:10px}
    #${IDS.panel} .va-head button{width:30px;height:30px;border:1px solid var(--va-line);border-radius:9px;background:transparent;color:var(--va-text);flex:0 0 30px} #${IDS.panel} .va-head button:hover{background:var(--va-card);filter:brightness(1.12)}
    #${IDS.panel} .va-body{display:grid;gap:12px;padding:13px;max-height:calc(100vh - 155px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin; -webkit-overflow-scrolling:touch}
    #${IDS.panel} .va-body[hidden]{display:none!important}
    #${IDS.panel} .va-bottom-resize{height:12px;position:absolute;left:0;right:0;bottom:0;z-index:5;cursor:ns-resize;display:flex;align-items:center;justify-content:center;background:linear-gradient(transparent,var(--va-bg))}
    #${IDS.panel} .va-bottom-resize:after{content:"";width:38px;height:3px;border-radius:3px;background:var(--va-muted);opacity:.65}
    #${IDS.panel}.va-user-resized{display:flex!important;flex-direction:column!important}
    #${IDS.panel}.va-user-resized .va-body{flex:1 1 auto;min-height:0;max-height:none!important}

    #${IDS.panel} .va-label{margin:0 0 7px;color:var(--va-muted);font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
    #${IDS.panel} .va-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    #${IDS.panel} .va-btn{min-height:40px;padding:9px 10px;border:1px solid var(--va-line);border-radius:10px;background:var(--va-card);color:var(--va-text);text-align:left}
    #${IDS.panel} .va-btn.primary{background:linear-gradient(110deg,var(--va-accent,#a78bfa),#83e4d4);color:#171322;border:0;font-weight:700}
    #${IDS.panel} .va-caption{display:block;margin-top:3px;font-size:10px;opacity:.65}
    #${IDS.panel} input,#${IDS.panel} textarea,#${IDS.panel} select{width:100%;min-width:0;padding:10px;border:1px solid var(--va-line);border-radius:10px;background:var(--va-card);color:var(--va-text);font:inherit}
    #${IDS.panel} textarea{min-height:75px;resize:vertical}
    #${IDS.panel} .va-row{display:flex;gap:7px} #${IDS.panel} .va-row>*{flex:1;min-width:0}
    #${IDS.panel} .va-small{padding:9px 11px;border:1px solid var(--va-line);border-radius:9px;background:var(--va-card2);color:var(--va-text);cursor:pointer}
    #${IDS.panel} .va-status{min-height:16px;color:var(--va-muted);font-size:10px;overflow-wrap:anywhere;margin-top:5px}
    #${IDS.panel} .va-footer{display:grid;gap:7px;margin-top:2px;padding:10px 11px;border:1px solid var(--va-line);border-radius:12px;background:linear-gradient(115deg,var(--va-card2),var(--va-card));color:var(--va-muted);font-size:9px}
    #${IDS.panel} .va-footer-top,#${IDS.panel} .va-footer-bottom{display:flex;justify-content:space-between;align-items:center;gap:8px}
    #${IDS.panel} .va-footer-brand{font-weight:900;letter-spacing:.1em;color:var(--va-text)}
    #${IDS.panel} .va-footer-state{display:inline-flex;align-items:center;gap:5px;color:var(--va-muted)}
    #${IDS.panel} .va-footer-state i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d39988}
    #${IDS.panel} .va-footer-note{padding-top:6px;border-top:1px solid var(--va-line);font-size:9px;line-height:1.4;color:var(--va-muted)}
    #${IDS.auth}{position:fixed!important;inset:0!important;z-index:2147483647!important;display:none!important;place-items:center!important;padding:18px!important;background:radial-gradient(ellipse at 15% 10%,#5c438b 0,transparent 36%),radial-gradient(ellipse at 90% 85%,#17564c 0,transparent 34%),#090a11!important;color:#f6f3ff!important;font-size:14px!important;line-height:1.5!important}
    #${IDS.auth}.va-show{display:grid!important}
    #${IDS.auth} .va-card{width:min(440px,100%);padding:25px;border:1px solid #ffffff26;border-radius:20px;background:linear-gradient(145deg,#202133f5,#11131df7);box-shadow:0 25px 85px #000b}
    #${IDS.auth} h2{margin:8px 0;font-size:23px} #${IDS.auth} p{color:#b6b3c8;margin:8px 0 17px}
    #${IDS.auth} label{display:block;margin:12px 0 6px;color:#d5d0e5;font-size:12px}
    #${IDS.auth} input{width:100%;padding:12px;border:1px solid #ffffff30;border-radius:10px;background:#090b13;color:#fff}
    #${IDS.auth} button{padding:11px;border-radius:10px;font-weight:bold;cursor:pointer}
    #${IDS.auth} .va-primary{width:100%;margin-top:12px;border:0;background:linear-gradient(100deg,#c4b5fd,#76e4d1);color:#15111e}
    #${IDS.auth} .va-secondary{margin-top:8px;border:1px solid #ffffff25;background:#343347;color:#eee}
    #${IDS.auth} .va-link{display:block;margin:12px auto 0;padding:5px;border:0;background:transparent;color:#aaaabe;text-decoration:underline;font-size:11px}
    #${IDS.auth} .va-message{min-height:18px;margin-top:10px;color:#fda4af;font-size:12px;overflow-wrap:anywhere}
    #${IDS.auth} .va-foot{margin-top:10px;color:#838399;font-size:11px}
    #${IDS.panel} .va-link{display:flex;align-items:center;gap:8px;text-decoration:none;}
    #${IDS.panel} .va-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:999px;background:#a78bfa22;color:var(--va-muted);font-size:9px;font-weight:800;letter-spacing:.08em}
    #${IDS.panel} .va-reply-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    #${IDS.panel} .va-reply{min-height:44px;padding:9px 10px;border:1px solid var(--va-line);border-radius:11px;color:var(--va-text);font-weight:800;text-align:left;background:var(--va-card);transition:transform .15s ease,filter .15s ease}
    #${IDS.panel} .va-reply:hover{transform:translateY(-1px);filter:brightness(1.12)}
    #${IDS.panel} .va-reply .va-caption{font-weight:500}
    #${IDS.panel} .va-reply.approve{border-color:#36c99166;background:linear-gradient(125deg,#1d5d4a66,var(--va-card))}
    #${IDS.panel} .va-reply.reject{border-color:#fb718566;background:linear-gradient(125deg,#672f4566,var(--va-card))}
    #${IDS.panel} .va-reply.resolve{border-color:#60a5fa66;background:linear-gradient(125deg,#244d7866,var(--va-card))}
    #${IDS.panel} .va-reply.transfer{border-color:#c084fc66;background:linear-gradient(125deg,#55327b66,var(--va-card))}
    #${IDS.panel} .va-log-feed{display:grid;gap:5px;max-height:120px;overflow:auto;padding:8px;border:1px solid var(--va-line);border-radius:10px;background:var(--va-card)}
    #${IDS.panel} .va-log-row{display:flex;justify-content:space-between;gap:8px;color:var(--va-muted);font-size:10px}
    #${IDS.panel} .va-log-row strong{color:var(--va-text);font-weight:600}
    #${IDS.panel} .va-local-note{color:var(--va-muted);font-size:10px;line-height:1.35}
    /* Имя и плашка получают визуальные свойства из реально загруженного профиля-образца. */
    .va-owner-reference-name{transition:color .15s ease,background .15s ease,text-shadow .15s ease!important}
    .userBanner.va-owner-reference-banner,.va-owner-reference-banner{box-sizing:border-box!important;max-width:100%!important;vertical-align:middle!important}
    .va-owner-reference-banner strong{font:inherit!important;line-height:inherit!important}
    #${IDS.panel} .va340-prefix-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #${IDS.panel} .va340-prefix-button{min-height:48px;padding:11px;border:1px solid var(--va-line);border-radius:12px;color:#fff;font:900 12px/1.2 Arial,sans-serif;letter-spacing:.035em;text-align:left;cursor:pointer;box-shadow:inset 0 1px #ffffff22;transition:transform .12s ease,filter .12s ease}
    #${IDS.panel} .va340-prefix-button:hover{transform:translateY(-1px);filter:brightness(1.12)}
    #${IDS.panel} .va340-prefix-button.approve{background:linear-gradient(120deg,#16835e,#065f46);border-color:#34d399}
    #${IDS.panel} .va340-prefix-button.reject{background:linear-gradient(120deg,#c2415d,#7f1d3b);border-color:#fb7185}
    #${IDS.panel} .va340-prefix-button.resolved{background:linear-gradient(120deg,#2563eb,#1e3a8a);border-color:#60a5fa}
    #${IDS.panel} .va340-prefix-button.pending{background:linear-gradient(120deg,#a16207,#78350f);border-color:#fbbf24}
    #${IDS.panel} .va340-prefix-button.open{background:linear-gradient(120deg,#13876f,#075e57);border-color:#5eead4}
    #${IDS.panel} .va340-prefix-button.closed{background:linear-gradient(120deg,#be3e5b,#781f3e);border-color:#fb7185}
    #${IDS.panel} .va340-prefix-button.information{background:linear-gradient(120deg,#2563a8,#233b78);border-color:#60a5fa}
    #${IDS.panel} .va340-prefix-button.important{background:linear-gradient(120deg,#a6630c,#713b12);border-color:#fbbf24}
    #${IDS.panel} .va340-prefix-button .va-caption{font-size:10px;font-weight:500;letter-spacing:0;opacity:.83}
    #${IDS.panel} .va340-sla-card{padding:9px;border:1px solid var(--va-line);border-radius:11px;background:var(--va-card);margin-top:6px}
    #${IDS.panel} .va340-sla-card strong{display:block;color:var(--va-text);font-size:11px;overflow-wrap:anywhere}
    #${IDS.panel} .va340-sla-card span{display:block;color:var(--va-muted);font-size:10px;margin-top:3px}
    #${IDS.panel} .va340-sla-card.overdue{border-color:#fb7185;background:linear-gradient(115deg,#7f1d1d55,var(--va-card));box-shadow:inset 3px 0 #fb7185}
    #${IDS.panel} .va340-sla-card.overdue-unverified{border-color:#f59e0b;background:linear-gradient(115deg,#78350f55,var(--va-card));box-shadow:inset 3px 0 #f59e0b}
    #${IDS.panel} .va340-sla-card.answered{border-color:#34d39966;background:linear-gradient(115deg,#064e3b55,var(--va-card))}
    #${IDS.panel} .va340-sla-card.near{border-color:#fbbf2466;background:linear-gradient(115deg,#78350f55,var(--va-card))}
    #${IDS.panel} .va340-sla-count{font-weight:900;color:var(--va-text)!important}
    #${IDS.panel} .va340-sla-summary{display:grid;gap:4px;margin-top:7px;padding:9px 10px;border:1px solid var(--va-line);border-radius:10px;background:var(--va-card2);color:var(--va-text)}
    #${IDS.panel} .va340-sla-summary strong{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
    #${IDS.panel} .va340-sla-summary span{font-size:10px;color:var(--va-muted);line-height:1.4}
    /* Vladimir Atelier · refined glass finish */
    #${IDS.panel}{backdrop-filter:blur(18px)!important;border-color:#b8a2ff66!important;box-shadow:0 24px 80px #05040dbb,0 0 0 1px #ffffff08,inset 0 1px #ffffff16!important}
    #${IDS.panel} .va-head{background:linear-gradient(115deg,var(--va-card2),color-mix(in srgb,var(--va-accent,#a78bfa) 12%,var(--va-card2)))!important;border-bottom:1px solid var(--va-line)!important}
    #${IDS.panel} .va-brand{letter-spacing:.11em!important;text-shadow:0 0 22px color-mix(in srgb,var(--va-accent,#a78bfa) 25%,transparent)}
    #${IDS.panel} .va-label{display:flex;align-items:center;gap:8px}
    #${IDS.panel} .va-label:before{content:"";width:4px;height:13px;border-radius:5px;background:var(--va-accent,#a78bfa);box-shadow:0 0 12px color-mix(in srgb,var(--va-accent,#a78bfa) 45%,transparent)}
    #${IDS.panel} .va-btn,#${IDS.panel} .va-reply,#${IDS.panel} .va340-prefix-button{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,filter .16s ease!important}
    #${IDS.panel} .va-btn:hover,#${IDS.panel} .va-reply:hover{transform:translateY(-2px)!important;box-shadow:0 8px 20px #0003!important;border-color:var(--va-accent,#a78bfa)!important}
    #${IDS.panel} input,#${IDS.panel} select,#${IDS.panel} textarea{border-radius:10px!important;transition:border-color .15s ease,box-shadow .15s ease!important}
    #${IDS.panel} input:focus,#${IDS.panel} select:focus,#${IDS.panel} textarea:focus{outline:none!important;border-color:var(--va-accent,#a78bfa)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--va-accent,#a78bfa) 20%,transparent)!important}
    #${IDS.panel} .va-status{border-radius:10px!important}
    #${IDS.panel} .va-bottom-resize:after{box-shadow:0 0 10px color-mix(in srgb,var(--va-accent,#a78bfa) 35%,transparent)!important}
    @media(prefers-reduced-motion:reduce){#${IDS.panel} *,#${IDS.launcher}{transition:none!important;animation:none!important}}
    #${IDS.panel} .va340-sla-chip{display:inline-block!important;width:max-content;max-width:100%;white-space:normal!important;line-height:1.45!important;overflow-wrap:anywhere!important;margin-top:6px!important;padding:3px 7px;border-radius:8px;background:#fb718522;color:#fb7185!important;font-size:9px!important;font-weight:900;letter-spacing:.02em}
    #${IDS.panel} .va340-sla-row-overdue{outline:2px solid #fb7185!important;outline-offset:-2px!important;background-color:#7f1d1d22!important}
    #${IDS.panel} .va340-sla-row-near{outline:1px solid #fbbf24aa!important;outline-offset:-1px!important}
    .va340-thread-overdue{display:inline-flex!important;margin:5px 0!important;padding:5px 9px!important;border:1px solid #fb7185!important;border-radius:8px!important;background:#7f1d1d!important;color:#fff!important;font:900 11px/1.3 Arial,sans-serif!important}
    .va340-thread-due{display:inline-flex!important;margin:5px 0!important;padding:5px 9px!important;border:1px solid #fbbf24!important;border-radius:8px!important;background:#78350f!important;color:#fff!important;font:800 11px/1.3 Arial,sans-serif!important}
    @media(max-width:480px){#${IDS.panel} .va-reply-grid{grid-template-columns:1fr 1fr}} 
    @media(max-width:480px){#${IDS.launcher}{left:auto!important;right:10px!important;top:10px!important;bottom:auto!important}#${IDS.panel}{left:auto!important;width:calc(100vw - 20px)!important;max-height:calc(100vh - 70px)!important}#${IDS.panel} .va-body{max-height:calc(100vh - 125px)!important}}
  `;

  const launcher = document.createElement('button');
  launcher.id = IDS.launcher;
  launcher.type = 'button';
  launcher.innerHTML = '<span class="vmark">V.</span><span>ATELIER CONSOLE</span>';
  launcher.title = 'Открыть Vladimir Atelier Console';

  const panel = document.createElement('section');
  panel.id = IDS.panel;
  panel.innerHTML = `
    <header class="va-head" id="va320-drag"><div><div class="va-brand">✦ VLADIMIR CONSOLE</div><div class="va-sub">${OWNER} · Matreshka RP</div></div><div class="va-row" style="flex:0 0 auto"><button id="va320-min" type="button" title="Свернуть">−</button><button id="va320-close" type="button" title="Закрыть">×</button></div></header>
    <main class="va-body" id="va320-body">
      <section><div class="va-label">Быстрые действия</div><div class="va-grid"><button class="va-btn primary" id="va320-url">↗ Копировать URL<span class="va-caption">Адрес страницы</span></button><button class="va-btn" id="va320-title">▤ Заголовок<span class="va-caption">Название страницы</span></button><button class="va-btn" id="va320-selection">⌁ Выделенный текст<span class="va-caption">В буфер обмена</span></button><button class="va-btn" id="va320-profile">◎ Мой профиль<span class="va-caption">Найти профиль владельца</span></button></div></section>
      <section><div class="va-label">Поиск по открытой странице</div><div class="va-row"><input id="va320-search" placeholder="Что найти на странице…"><button class="va-small" id="va320-find">Найти</button></div><div class="va-status" id="va320-status">Панель готова.</div></section>
      <section>
        <div class="va-label">Персональные ссылки <span class="va-chip">PRIVATE</span></div>
        <div class="va-grid">
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?members/vladimir_sudarikov.341059/" target="_blank" rel="noopener">◎ Мой профиль</a>
          <a class="va-btn va-link" href="${LINKS.myFollowing}" target="_blank" rel="noopener">◎ Мои подписки</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/matreska-30-ezednevnye-otcety-liderov-gosudarstvennyh-struktur.1971211/unread" target="_blank" rel="noopener">▤ Ежедневные отчёты</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/matreska-30-ezenedelnye-otcety-liderov.2369132/" target="_blank" rel="noopener noreferrer">▤ Еженедельные отчёты Гетто</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/matreska-30-zamorozki-u-opg-snatie-moroza.2682004/unread" target="_blank" rel="noopener noreferrer">❄ Мороз / снятие мороза</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/pravila-podaci-zaloby.66297/" target="_blank" rel="noopener">⚖ Жалобы на игроков</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/pravila-podaci-zaloby-na-liderov.3333380/" target="_blank" rel="noopener">♜ Жалобы на лидеров</a>
        </div>
      </section>
      <section>
        <div class="va-label">Справочник администрации <span class="va-chip">8 ССЫЛОК</span></div>
        <div class="va-grid">
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/orientirovocnye-normativy-nakazanij-igrokov.21/" target="_blank" rel="noopener noreferrer">⚖ Ориентировочные наказания</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/admin-komandy-1-2-urovnej.171/" target="_blank" rel="noopener noreferrer">⌘ Админ-команды</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/30-pomos-dla-administratorov-id-vseh-avto-skinov-idei-dla-mp.2629422/" target="_blank" rel="noopener noreferrer">✦ Помощь администрации</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/30-stabilnost-raboty-administracii.4274432/" target="_blank" rel="noopener noreferrer">◈ Стабильность администрации</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/ezenedelnaa-otcetnost-sledasej-administracii.4284198/unread" target="_blank" rel="noopener noreferrer">▤ Отчётность следящих</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/30-vydaca-offlajn-nakazanij.2591833/unread" target="_blank" rel="noopener noreferrer">◷ Оффлайн-выдача</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/matreska-30-dejstvuusie-lidery-servera.1961070/" target="_blank" rel="noopener noreferrer">♜ Действующие лидеры</a>
          <a class="va-btn va-link" href="https://forum.matrp.ru/index.php?threads/matreska-30-zaavlenie-na-neaktiv-dla-liderov.1970623/" target="_blank" rel="noopener noreferrer">◌ Неактивы лидеров</a>
        </div>
      </section>
      <section>
        <div class="va-label">Управление текущей темой <span class="va-chip">1 CLICK</span></div>
        <div class="va-grid">
          <button class="va-btn" type="button" data-va-thread-action="open">● Открыть тему<span class="va-caption">Штатная команда форума</span></button>
          <button class="va-btn" type="button" data-va-thread-action="close">■ Закрыть тему<span class="va-caption">Штатная команда форума</span></button>
          <button class="va-btn" type="button" data-va-thread-action="pin">◆ Закрепить тему<span class="va-caption">Штатная команда форума</span></button>
          <button class="va-btn" type="button" data-va-thread-action="unpin">◇ Открепить тему<span class="va-caption">Штатная команда форума</span></button>
        </div>
        <div class="va-status" id="va340-thread-action-status">Открой конкретную тему. Действия используют штатное меню XenForo и требуют соответствующих прав.</div>
      </section>
      <section>
        <div class="va-label">Смена префикса · все варианты <span class="va-chip">1 CLICK</span></div>
        <div class="va340-prefix-grid">
          <button class="va340-prefix-button approve" type="button" data-va-prefix-action="approve">✓ ДОБРО / ОДОБРЕНО<span class="va-caption">Префикс + закрыть тему</span></button>
          <button class="va340-prefix-button reject" type="button" data-va-prefix-action="reject">✕ ОТКАЗ<span class="va-caption">Префикс + закрыть тему</span></button>
          <button class="va340-prefix-button resolved" type="button" data-va-prefix-action="resolved">◆ РЕШЕНО<span class="va-caption">Префикс + закрыть тему</span></button>
          <button class="va340-prefix-button pending" type="button" data-va-prefix-action="pending">◷ НА РАССМОТРЕНИИ<span class="va-caption">Текущее состояние темы без изменений</span></button>
          <button class="va340-prefix-button open" type="button" data-va-prefix-action="open">● ОТКРЫТО<span class="va-caption">Префикс + открыть тему</span></button>
          <button class="va340-prefix-button closed" type="button" data-va-prefix-action="closed">■ ЗАКРЫТО<span class="va-caption">Префикс + закрыть тему</span></button>
          <button class="va340-prefix-button information" type="button" data-va-prefix-action="information">ℹ ИНФОРМАЦИЯ<span class="va-caption">Текущее состояние темы без изменений</span></button>
          <button class="va340-prefix-button important" type="button" data-va-prefix-action="important">★ ВАЖНО<span class="va-caption">Текущее состояние темы без изменений</span></button>
        </div>
        <div class="va-row" style="margin-top:8px"><button class="va-small" id="va340-open-editor" type="button">Открыть редактор темы</button><button class="va-small" id="va340-prefix-diagnose" type="button">Диагностика</button></div>
        <div class="va-status" id="va340-prefix-status">Одобрено / Отказ / Решено / Закрыто — тема закрывается; Открыто — тема открывается. «На рассмотрении», «Информация» и «Важно» не меняют состояние темы.</div>
        <div class="va-local-note">Применение возможно только при наличии на форуме прав на изменение префикса. На странице списка сначала открой нужную тему.</div>
      </section>
      <section>
        <div class="va-label">Контроль сроков · все разделы <span class="va-chip">24 ЧАСА / ЛИМИТ 80 Ч</span></div>
        <div class="va-local-note" id="va340-context-status">Мониторинг готов: проверяет выбранное число тем; темы отслеживаются до 30 дней после срока.</div>
        <div class="va-row" style="margin-top:7px"><button class="va-small" id="va340-scan">⟳ Проверить список</button><button class="va-small" id="va340-current">◷ Проверить тему</button></div>
        <div id="va340-sla-summary" class="va340-sla-summary"><strong>Итоги проверки</strong><span>Пока нет данных.</span></div>
        <div id="va340-sla-feed" style="display:grid;gap:6px;margin-top:7px"><div class="va-local-note">Таймеры появляются при прокрутке в распознанных разделах жалоб, Госс, Гетто и заявок.</div></div>
        <div class="va-local-note">Отсчёт 24 часов идёт от последнего сообщения игрока; если игрок ещё не отвечал, от создания темы. Ответ лидера, заместителя или администрации закрывает текущий срок до следующего сообщения игрока. Темы отслеживаются до 30 дней после срока. Сетевой скан запускается только вручную: до 5 тем за раз и не чаще одного запуска в 15 минут. Повторные результаты берутся из локального кэша до 30 минут. Таймер обновляется каждые 15 секунд без запросов к форуму.</div>
      </section>
      <section><div class="va-label">Режим низкой нагрузки</div><div class="va-local-note">Фоновые проверки и автоперезагрузки отключены. Проверка списка запускается только вручную, максимум 5 тем за запуск и не чаще одного раза в 15 минут. Результаты сохраняются локально на 30 минут, чтобы не запрашивать одну тему повторно.</div></section>
      <section>
        <div class="va-label">Быстрые ответы администрации <span class="va-chip">BBCode / RTE</span></div>
        <div class="va-row"><input id="va330-name" autocomplete="off" placeholder="Ник пользователя, например Egor_Andyfy"></div>
        <div class="va-row"><input id="va330-reason" autocomplete="off" placeholder="Причина / пояснение (необязательно)"></div>
        <div class="va-reply-grid">
          <button class="va-reply approve" data-va-template="approve">✓ Одобрена<span class="va-caption">Игрок будет наказан</span></button>
          <button class="va-reply reject" data-va-template="reject-player">✕ Отказ · игрок<span class="va-caption">Нарушение правил подачи</span></button>
          <button class="va-reply reject" data-va-template="reject-leader">✕ Отказ · лидер<span class="va-caption">Правила жалоб на лидеров</span></button>
          <button class="va-reply resolve" data-va-template="resolved">◆ Решено<span class="va-caption">Вердикт и закрытие темы</span></button>
          <button class="va-reply transfer" data-va-template="transfer">↗ Передать ГА<span class="va-caption">Ожидание вердикта</span></button>
          <button class="va-reply" data-va-template="evidence">＋ Запрос доказательств<span class="va-caption">Нужно дополнить жалобу</span></button>
          <button class="va-reply reject" data-va-template="reject-format">▣ Не по форме · игрок<span class="va-caption">Отдельный шаблон для игрока</span></button>
          <button class="va-reply reject" data-va-template="reject-leader-format">▣ Не по форме · ЛД<span class="va-caption">Отдельный шаблон для лидера</span></button>
          <button class="va-reply reject" data-va-template="reject-evidence">⌕ Нет доказательств<span class="va-caption">Недостаточно подтверждений</span></button>
        </div>
        <div class="va-status" id="va330-reply-status">Нажми шаблон — ответ вставится в открытый редактор. Если редактора нет, BBCode скопируется.</div>
        <div class="va-local-note">Перед отправкой проверь ник, причину и соответствие фактическому решению. Шаблон не отправляет сообщение автоматически.</div>
      </section>
      <section>
        <div class="va-label">Личная история действий</div>
        <div class="va-log-feed" id="va330-log-feed"><div class="va-local-note">Пока действий нет.</div></div>
        <div class="va-row" style="margin-top:7px"><button class="va-small" id="va330-export-log">Экспорт журнала</button><button class="va-small" id="va330-clear-log">Очистить журнал</button></div>
        <div class="va-local-note">Журнал хранится только в localStorage этого браузера. Содержимое ответов, IP и данные других пользователей не записываются.</div>
      </section>
      <section><div class="va-label">Навигация</div><button class="va-btn" id="va320-home" style="width:100%">⌂ Главная форума</button></section>
      <section><div class="va-label">Доступ на другом устройстве</div><div class="va-local-note">Для передачи доступа экспортируй проверочный ключ и передай его вместе с мастер-паролем. Сам пароль в файле не хранится.</div><div class="va-row" style="margin-top:7px"><button class="va-small" id="va340-export-access">Экспорт ключа</button><button class="va-small" id="va340-import-access">Импорт ключа</button></div><input id="va340-access-file" type="file" accept="application/json,.json" hidden><div class="va-status" id="va340-access-status"></div></section>
      <section><div class="va-label">Личные заметки</div><textarea id="va320-notes" placeholder="Идеи, ссылки, напоминания…"></textarea><div class="va-row" style="margin-top:7px"><button class="va-small" id="va320-save-notes">Сохранить</button><button class="va-small" id="va320-clear-notes">Очистить</button></div></section>
      <section><div class="va-label">Персонализация</div><div class="va-row"><select id="va320-theme"><option value="obsidian">Obsidian · тёмная</option><option value="pearl">Pearl · светлая</option><option value="forest">Forest · зелёная</option></select><input id="va320-accent" type="color" aria-label="Акцентный цвет" style="max-width:50px;padding:3px"></div><button class="va-small" id="va320-reset-style" style="width:100%;margin-top:7px">Сбросить оформление</button></section>
      <div class="va-footer">
        <div class="va-footer-top"><span class="va-footer-brand">✦ ATELIER CONSOLE · 4.5.0</span><span class="va-footer-state"><i></i> ЛОКАЛЬНО</span></div>
        <div class="va-footer-bottom"><span>Matreshka RP · личная панель</span><span>ALT + M</span></div>
        <div class="va-footer-note">Шаблоны добавляют только текст ответа. Префиксы выбираются отдельно — так черновик не пропадает при вставке.</div>
      </div>
    </main>
    <div class="va-bottom-resize" id="va320-resize" title="Потяните нижний край, чтобы изменить высоту панели"></div>`;

  const auth = document.createElement('div');
  auth.id = IDS.auth;
  auth.setAttribute('role', 'dialog');
  auth.setAttribute('aria-modal', 'true');
  const $ = id => document.getElementById(id);
  const inPanel = id => panel.querySelector('#' + id);
  const inAuth = id => auth.querySelector('#' + id);
  const setStatus = text => { const node = inPanel('va320-status'); if (node) node.textContent = text; };

  function randomPassword(length = 28) {
    if (!crypto?.getRandomValues) throw new Error('Браузер не поддерживает безопасную генерацию пароля. Обнови браузер.');
    const bytes = new Uint8Array(length); crypto.getRandomValues(bytes);
    return Array.from(bytes, b => ALPHABET[b & 63]).join('');
  }
  const toB64 = bytes => { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function hashPassword(password, salt, iterations = ITERATIONS) {
    if (!crypto?.subtle) throw new Error('Криптография браузера недоступна. Убедись, что адрес открыт по HTTPS.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
    return new Uint8Array(bits);
  }
  async function storePassword(password) {
    const salt = new Uint8Array(16); crypto.getRandomValues(salt);
    const hash = await hashPassword(password, salt);
    if (!safeSet(KEYS.password, JSON.stringify({ method: 'PBKDF2-SHA-256', iterations: ITERATIONS, salt: toB64(salt), hash: toB64(hash) }))) throw new Error('Браузер запретил сохранение. Разреши локальное хранилище для forum.matrp.ru.');
  }
  async function verifyPassword(password) {
    let record; try { record = JSON.parse(safeGet(KEYS.password) || 'null'); } catch { record = null; }
    if (!record || record.method !== 'PBKDF2-SHA-256') throw new Error('Запись пароля не найдена. Сбрось пароль и создай новый.');
    const actual = await hashPassword(password, fromB64(record.salt), Number(record.iterations) || ITERATIONS);
    const expected = fromB64(record.hash);
    if (actual.length !== expected.length || actual.some((b, i) => b !== expected[i])) throw new Error('Неверный пароль. Проверь раскладку и Caps Lock.');
  }
  const hasSession = () => safeGet(KEYS.session) === 'yes';
  const setSession = () => { safeSet(KEYS.session, 'yes'); };
  const clearSession = () => { safeRemove(KEYS.session); try { sessionStorage.removeItem(KEYS.session); } catch {} };
  function closeAuth() { auth.classList.remove('va-show'); auth.innerHTML = ''; }
  function clampPanelPosition(top, right) {
    const panelWidth = panel?.getBoundingClientRect?.().width || 365;
    const panelHeight = panel?.getBoundingClientRect?.().height || 300;
    return {
      top: Math.max(8, Math.min(Number(top) || 8, Math.max(8, window.innerHeight - Math.min(panelHeight, 100) - 8))),
      right: Math.max(8, Math.min(Number(right) || 8, Math.max(8, window.innerWidth - Math.min(panelWidth, 80) - 8)))
    };
  }
  function applyPanelPosition(save = false) {
    const pos = clampPanelPosition(settings.top, settings.right);
    settings.top = pos.top;
    settings.right = pos.right;
    panel.style.setProperty('top', `${pos.top}px`, 'important');
    panel.style.setProperty('right', `${pos.right}px`, 'important');
    panel.style.setProperty('left', 'auto', 'important');
    if (save) saveSettings();
  }
  function enablePanelDragging() {
    const dragHandle = inPanel('va320-drag');
    if (!dragHandle || dragHandle.dataset.dragReady === '1') return;
    dragHandle.dataset.dragReady = '1';
    let drag = null;
    dragHandle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      const rect = panel.getBoundingClientRect();
      drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, top: rect.top, right: window.innerWidth - rect.right };
      try { dragHandle.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    });
    dragHandle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      settings.top = drag.top + (event.clientY - drag.startY);
      settings.right = drag.right - (event.clientX - drag.startX);
      applyPanelPosition(true);
    });
    const finishDrag = event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      drag = null;
      applyPanelPosition(true);
    };
    dragHandle.addEventListener('pointerup', finishDrag);
    dragHandle.addEventListener('pointercancel', finishDrag);
  }

  function showPanel() {
    // Сначала восстановить сохранённые координаты, затем показать панель.
    // Не вычисляем top от нижней кнопки при каждом открытии: это затирало пользовательское положение.
    applyPanelPosition(false);
    if (Number(settings.panelHeight) >= 180 && !settings.minimized) {
      panel.classList.add('va-user-resized');
      panel.style.height = Math.min(settings.panelHeight, Math.max(180, window.innerHeight - settings.top - 8)) + 'px';
      const body = inPanel('va320-body');
      if (body) body.style.maxHeight = 'none';
    }
    panel.classList.add('va-show');
    const body = inPanel('va320-body');
    body.hidden = !!settings.minimized;
    inPanel('va320-min').textContent = settings.minimized ? '+' : '−';
    applyTheme();
    refreshSlaFeedCountdowns(Date.now());
    refreshSlaSummaryOnly([...slaRows.values()], Date.now());
  }
  function applyTheme() {
    panel.classList.remove('va-obsidian', 'va-pearl', 'va-forest');
    panel.classList.add('va-' + settings.theme);
    panel.style.setProperty('--va-accent', settings.accent);
    inPanel('va320-theme').value = settings.theme;
    inPanel('va320-accent').value = settings.accent;
  }
  function showSetup() {
    let password;
    try { password = randomPassword(); } catch (e) { alert(e.message); return; }
    auth.innerHTML = `<div class="va-card"><div style="font-size:10px;letter-spacing:.18em;color:#c4b5fd;font-weight:bold">MATRESHKA RP · PRIVATE WORKSPACE</div><h2>Создание мастер-пароля</h2><p>Пароль генерируется на твоём устройстве. Скопируй и сохрани его: повторно показать его будет нельзя.</p><label for="va320-generated">Твой новый пароль</label><input id="va320-generated" type="text" readonly autocomplete="off"><button class="va-secondary" id="va320-copy-generated" type="button">Копировать пароль</button><button class="va-primary" id="va320-confirm-save" type="button">Я сохранил пароль — продолжить</button><button class="va-link" id="va320-cancel" type="button">Закрыть</button><div class="va-message" id="va320-message"></div><div class="va-foot">В исходном коде нет пароля. В браузере хранится только соль и проверочный хеш.</div></div>`;
    auth.classList.add('va-show');
    inAuth('va320-generated').value = password;
    inAuth('va320-copy-generated').addEventListener('click', async () => {
      const input = inAuth('va320-generated'); input.focus(); input.select();
      try { await navigator.clipboard.writeText(password); inAuth('va320-message').textContent = 'Пароль скопирован. Сохрани его в надёжном месте.'; }
      catch { inAuth('va320-message').textContent = 'Автокопирование заблокировано. Пароль выделен — нажми Ctrl+C.'; }
    });
    inAuth('va320-confirm-save').addEventListener('click', async e => {
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Сохраняю…';
      try { await storePassword(password); setSession(); closeAuth(); showPanel(); }
      catch (err) { inAuth('va320-message').textContent = err.message || 'Не удалось сохранить пароль.'; btn.disabled = false; btn.textContent = 'Я сохранил пароль — продолжить'; }
    });
    inAuth('va320-cancel').addEventListener('click', closeAuth);
  }
  function showLogin() {
    auth.innerHTML = `<div class="va-card"><div style="font-size:10px;letter-spacing:.18em;color:#c4b5fd;font-weight:bold">MATRESHKA RP · PRIVATE WORKSPACE</div><h2>Разблокировка панели</h2><p>Введи мастер-пароль, который сохранил при первой настройке.</p><form id="va320-login-form"><label for="va320-password">Мастер-пароль</label><input id="va320-password" type="password" autocomplete="current-password" required><button class="va-primary" id="va320-login-btn" type="submit">Открыть панель</button></form><button class="va-link" id="va320-reset" type="button">Сбросить пароль и создать новый</button><button class="va-link" id="va320-login-close" type="button">Закрыть</button><div class="va-message" id="va320-message"></div><div class="va-foot">Локальная защита панели, не авторизация на форуме.</div></div>`;
    auth.classList.add('va-show');
    inAuth('va320-login-form').addEventListener('submit', async e => {
      e.preventDefault(); const btn = inAuth('va320-login-btn'); const input = inAuth('va320-password');
      btn.disabled = true; btn.textContent = 'Проверяю…';
      try { await verifyPassword(input.value); setSession(); closeAuth(); showPanel(); }
      catch (err) { inAuth('va320-message').textContent = err.message || 'Ошибка проверки пароля.'; btn.disabled = false; btn.textContent = 'Открыть панель'; input.focus(); }
    });
    inAuth('va320-reset').addEventListener('click', () => {
      if (!confirm('Сбросить сохранённый пароль? Старый пароль перестанет работать.')) return;
      safeRemove(KEYS.password); clearSession(); showSetup();
    });
    inAuth('va320-login-close').addEventListener('click', closeAuth);
    inAuth('va320-password').focus();
  }
  function currentForumUserId() {
    const selectors = [
      '.p-navgroup-link--user[href*="members/"]',
      '.p-navgroup-link--user a[href*="members/"]',
      '.p-navgroup a[href*="members/"]',
      '.js-accountMenu a[href*="members/"]',
      '.menu-content a[href*="members/"]',
      '.offCanvasMenu a[href*="members/"]',
      'a[href*="members/"][data-user-id]',
      'a[href*="members/"][data-member-id]'
    ];
    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        const href = node.getAttribute('href') || '';
        const match = href.match(/members\/[^/?#]*?\.(\d+)(?:[/?#]|$)/i);
        const dataId = node.getAttribute('data-user-id') || node.getAttribute('data-member-id');
        const id = match?.[1] || dataId;
        if (id && AUTHORIZED_FORUM_USERS[id]) return id;
      }
    }
    return null;
  }
  function showForumAccountDenied() {
    const id = currentForumUserId();
    const recognized = id ? AUTHORIZED_FORUM_USERS[id] : null;
    auth.innerHTML = `<div class="va-card"><div style="font-size:10px;letter-spacing:.18em;color:#c4b5fd;font-weight:bold">MATRESHKA RP · PRIVATE WORKSPACE</div><h2>Вход по форумнику</h2><p>${recognized ? 'Аккаунт распознан: ' + recognized : 'Не удалось подтвердить один из разрешённых аккаунтов на этой странице.'}</p><div class="va-message">${recognized ? 'Доступ разрешён.' : 'Войдите на форум под одним из разрешённых аккаунтов: vlad_copov (ID 109764) или vladimir_sudarikov (ID 341059), затем обновите страницу.'}</div><button class="va-primary" id="va320-account-retry" type="button">Проверить аккаунт</button><button class="va-link" id="va320-account-close" type="button">Закрыть</button><div class="va-foot">Доступ проверяется по текущему аккаунту XenForo; пароль панели не требуется.</div></div>`;
    auth.classList.add('va-show');
    inAuth('va320-account-retry').addEventListener('click', () => {
      if (currentForumUserId()) { closeAuth(); showPanel(); }
      else { closeAuth(); showForumAccountDenied(); }
    });
    inAuth('va320-account-close').addEventListener('click', closeAuth);
  }
  function launch() {
    if (panel.classList.contains('va-show')) { panel.classList.remove('va-show'); return; }
    const forumUserId = currentForumUserId();
    if (!forumUserId) { showForumAccountDenied(); return; }
    // Access is tied to the currently signed-in forum account, not a shared browser password.
    clearSession();
    showPanel();
  }
  function copyText(value) {
    if (!value) return setStatus('Нет данных для копирования.');
    const fallback = () => {
      const box = document.createElement('textarea'); box.value = value; box.style.cssText = 'position:fixed;opacity:0;left:-9999px;top:0';
      document.body.appendChild(box); box.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} box.remove();
      setStatus(ok ? 'Скопировано в буфер обмена.' : 'Не удалось скопировать — выдели текст вручную.');
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(() => setStatus('Скопировано в буфер обмена.')).catch(fallback); else fallback();
  }

  inPanel('va320-url').addEventListener('click', () => copyText(location.href));
  inPanel('va320-title').addEventListener('click', () => copyText(document.title));
  inPanel('va320-selection').addEventListener('click', () => copyText(window.getSelection()?.toString().trim() || ''));
  inPanel('va320-find').addEventListener('click', () => {
    const q = inPanel('va320-search').value.trim(); if (!q) return setStatus('Введи фразу для поиска.');
    const found = (document.body?.innerText || '').toLocaleLowerCase().includes(q.toLocaleLowerCase());
    setStatus(found ? 'Совпадение найдено на текущей странице.' : 'Совпадений не найдено.');
  });
  inPanel('va320-search').addEventListener('keydown', e => { if (e.key === 'Enter') inPanel('va320-find').click(); });
  inPanel('va320-profile').addEventListener('click', () => {
    const anchors = document.querySelectorAll('a.username[href], a[href*="members/"]');
    const link = [...anchors].find(a => a.textContent.trim() === OWNER) || [...anchors].find(a => a.textContent.includes(OWNER));
    if (link) location.href = link.href; else setStatus('Ссылка на профиль ' + OWNER + ' не найдена на этой странице.');
  });
  inPanel('va320-home').addEventListener('click', () => { location.href = 'https://forum.matrp.ru/'; });


  // Локально копируем именно оформление ника и плашки из профиля Egor_Andyfy.
  // Профиль-образец считывается только из DOM, когда пользователь сам его открыл.
  // Серверные данные, группа и права аккаунта не изменяются.
  const OWNER_NAME_SELECTOR = '.username, [class*="username--style"]';
  const NAME_STYLE_PROPS = [
    'color','background-color','background-image','background-clip','-webkit-background-clip',
    '-webkit-text-fill-color','font-family','font-size','font-weight','font-style','line-height',
    'letter-spacing','text-transform','text-decoration-line','text-decoration-color','text-shadow',
    '-webkit-text-stroke','filter','opacity','border-radius','padding','margin'
  ];
  const BANNER_STYLE_PROPS = [
    'display','color','background-color','background-image','background-size','background-position',
    'background-repeat','border-top','border-right','border-bottom','border-left','border-radius',
    'font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-transform',
    'text-align','text-shadow','box-shadow','-webkit-text-fill-color','background-clip','-webkit-background-clip',
    'padding-top','padding-right','padding-bottom','padding-left',
    'min-height','vertical-align','margin-top','margin-right','margin-bottom','margin-left'
  ];
  const PSEUDO_STYLE_PROPS = [
    'content','display','position','width','height','margin','padding','color','background-color',
    'background-image','background-size','background-position','background-repeat','border','border-radius',
    'font-family','font-size','font-weight','line-height','text-shadow','transform','opacity'
  ];
  const OWNER_PSEUDO_STYLE_ID = 'va-owner-reference-pseudo-style';

  function readReferenceSnapshot() {
    try {
      const value = JSON.parse(safeGet(KEYS.ownerReferenceStyle) || 'null');
      if (!value || value.version !== 3 || !value.name?.css || !value.banner?.css) return null;
      return value;
    } catch { return null; }
  }

  function safeClassList(element) {
    return [...(element?.classList || [])].filter(value => /^[a-zA-Z_][\w-]{0,100}$/.test(value));
  }

  function readComputedProperties(element, properties, pseudo = null) {
    if (!element) return {};
    let computed;
    try { computed = getComputedStyle(element, pseudo); } catch { return {}; }
    const result = {};
    for (const property of properties) {
      const value = computed.getPropertyValue(property);
      if (value && value !== 'normal' && value !== 'none' && value !== 'auto' && value !== 'rgba(0, 0, 0, 0)') {
        result[property] = value;
      }
    }
    return result;
  }

  function readStylePack(element, properties) {
    if (!element) return null;
    return {
      tag: element.tagName.toLowerCase(),
      classes: safeClassList(element),
      inline: element.getAttribute('style') || '',
      css: readComputedProperties(element, properties),
      before: readComputedProperties(element, PSEUDO_STYLE_PROPS, '::before'),
      after: readComputedProperties(element, PSEUDO_STYLE_PROPS, '::after')
    };
  }

  function findReferenceProfileElements() {
    const profile = document.querySelector('.memberHeader, .memberProfile, .memberHeader-main') || document;
    const usernames = [...(profile.querySelectorAll?.('.memberHeader-name .username, .memberHeader-name [class*="username--style"], .username, [class*="username--style"]') || [])];
    const name = usernames.find(node => (node.textContent || '').trim() === STYLE_REFERENCE.username);
    if (!name) return null;

    const bannerSelectors = [
      '.memberHeader-banners .userBanner', '.memberHeader-banners [class*="userBanner"]',
      '.memberHeader-banners .userTitle', '.memberHeader-banner .userBanner',
      '.memberProfileBanner .userBanner', '.memberHeader .userBanner',
      '.memberHeader .userTitle', '.memberHeader-banner'
    ];
    let banner = null;
    for (const selector of bannerSelectors) {
      const candidates = [...(profile.querySelectorAll?.(selector) || [])];
      banner = candidates.find(node => !node.contains(name) && !name.contains(node)) || null;
      if (banner) break;
    }
    if (!banner) return null;
    const label = banner.querySelector('strong, .userBanner-content, .userBanner-text, .userTitle-content')
      || banner.firstElementChild || banner;
    return { profile, name, banner, label };
  }

  function captureReferenceStyle() {
    if (!location.href.toLowerCase().includes('egor_andyfy.155084')) return false;
    const found = findReferenceProfileElements();
    if (!found) return false;
    const labelComputed = getComputedStyle(found.label);
    const snapshot = {
      version: 3,
      capturedAt: Date.now(),
      source: STYLE_REFERENCE.username,
      name: readStylePack(found.name, NAME_STYLE_PROPS),
      banner: readStylePack(found.banner, BANNER_STYLE_PROPS),
      bannerLabel: readStylePack(found.label, BANNER_STYLE_PROPS),
      // Store the foreground/text paint independently from the banner's background.
      bannerTextPaint: {
        color: labelComputed.getPropertyValue('color').trim(),
        textFill: labelComputed.getPropertyValue('-webkit-text-fill-color').trim(),
        backgroundImage: labelComputed.getPropertyValue('background-image').trim(),
        backgroundClip: labelComputed.getPropertyValue('background-clip').trim(),
        webkitBackgroundClip: labelComputed.getPropertyValue('-webkit-background-clip').trim(),
        textShadow: labelComputed.getPropertyValue('text-shadow').trim(),
        webkitTextStroke: labelComputed.getPropertyValue('-webkit-text-stroke').trim()
      }
    };
    if (!Object.keys(snapshot.name?.css || {}).length || !Object.keys(snapshot.banner?.css || {}).length) return false;
    if (!safeSet(KEYS.ownerReferenceStyle, JSON.stringify(snapshot))) return false;
    console.info('[Vladimir Atelier 4.5.8] Стиль плашки Egor_Andyfy сохранён локально.');
    if (typeof setStatus === 'function') setStatus('Образец сохранён. Цвет ника берётся из цвета текста плашки, не из её фона.');
    return true;
  }

  function applyInlineSnapshot(element, styles) {
    if (!element || !styles) return;
    for (const [property, value] of Object.entries(styles)) {
      if (typeof value === 'string' && value && !/[{};]/.test(value)) {
        try { element.style.setProperty(property, value, 'important'); } catch {}
      }
    }
  }

  function updatePseudoStyleRules(snapshot) {
    let styleNode = document.getElementById(OWNER_PSEUDO_STYLE_ID);
    if (!styleNode) {
      styleNode = document.createElement('style');
      styleNode.id = OWNER_PSEUDO_STYLE_ID;
      (document.head || document.documentElement).appendChild(styleNode);
    }
    const toDeclarations = styles => Object.entries(styles || {})
      .filter(([property, value]) => /^[a-z-]+$/i.test(property) && typeof value === 'string' && value && !/[{};]/.test(value))
      .map(([property, value]) => `${property}:${value}!important;`).join('');
    styleNode.textContent = [
      `.va-owner-reference-name::before{${toDeclarations(snapshot.name.before)}}`,
      `.va-owner-reference-name::after{${toDeclarations(snapshot.name.after)}}`,
      `.va-owner-reference-banner::before{${toDeclarations(snapshot.banner.before)}}`,
      `.va-owner-reference-banner::after{${toDeclarations(snapshot.banner.after)}}`,
      `.va-owner-reference-label::before{${toDeclarations(snapshot.bannerLabel?.before)}}`,
      `.va-owner-reference-label::after{${toDeclarations(snapshot.bannerLabel?.after)}}`
    ].join('\n');
  }

  let ownerReferenceSnapshot = readReferenceSnapshot();
  if (location.href.toLowerCase().includes('egor_andyfy.155084')) {
    // Переснимаем образец при каждом явном посещении профиля, чтобы обновить именно его актуальный цвет.
    const capturedNow = captureReferenceStyle();
    ownerReferenceSnapshot = readReferenceSnapshot();
    if (!capturedNow) {
      const referenceRoot = document.querySelector('.memberHeader, .memberProfile, .memberHeader-main') || document.body;
      if (referenceRoot) {
        const captureObserver = new MutationObserver(() => {
          if (captureReferenceStyle()) {
            ownerReferenceSnapshot = readReferenceSnapshot();
            captureObserver.disconnect();
          }
        });
        captureObserver.observe(referenceRoot, { childList: true, subtree: true, attributes: true });
        setTimeout(() => captureObserver.disconnect(), 10000);
      }
    }
  }

  function copyReferenceClasses(target, pack, kind) {
    if (!target || !pack) return;
    const remove = kind === 'name'
      ? [...target.classList].filter(name => name.startsWith('username--') || name.startsWith('va-owner-reference-'))
      : [...target.classList].filter(name => name.startsWith('userBanner--') || name.startsWith('img') || name.startsWith('va-owner-reference-'));
    remove.forEach(name => target.classList.remove(name));
    for (const name of pack.classes || []) {
      if (name === 'username' || name === 'userBanner') continue;
      if (/^[a-zA-Z_][\w-]{0,100}$/.test(name)) target.classList.add(name);
    }
  }

  // Exact markup supplied by the user for Egor_Andyfy: 
  // <span class="username--style8 username--moderator">Egor_Andyfy</span>
  // Apply those same XenForo style classes to the owner's nick and let the forum CSS
  // determine the exact color. Do not sample a banner color or force an inline color.
  function styleOwnerName(node) {
    if (!node || (node.textContent || '').trim() !== OWNER) return;

    for (const cls of [...node.classList]) {
      if (cls.startsWith('username--') || cls.startsWith('va-owner-reference-')) {
        node.classList.remove(cls);
      }
    }
    node.classList.add('username--style8', 'username--moderator');
    node.removeAttribute('data-va-owner-reference-name');

    // Remove previous versions' inline paints so class style8 controls the real color.
    for (const property of [
      'color', 'background-color', 'background-image', 'background-size', 'background-position',
      'background-repeat', 'background-clip', '-webkit-background-clip', '-webkit-text-fill-color',
      'text-shadow', '-webkit-text-stroke', 'filter', 'opacity', 'font-family', 'font-size',
      'font-weight', 'font-style', 'letter-spacing', 'text-transform', 'text-decoration',
      'text-decoration-color'
    ]) node.style.removeProperty(property);
  }

  function collectOwnerBanners(container) {
    if (!container) return [];
    const result = [];
    if (container instanceof Element && container.matches('.userBanner, .userTitle, .message-userTitle, .va-owner-reference-banner')) result.push(container);
    if (container.querySelectorAll) result.push(...container.querySelectorAll('.userBanner, .userTitle, .message-userTitle, .va-owner-reference-banner'));
    return [...new Set(result)];
  }

  function ensureOwnerBannerLabel(banner) {
    const selectors = 'strong, .userBanner-content, .userBanner-text, .userTitle-content, .va-owner-reference-label';
    let label = banner.querySelector(selectors);
    if (!label) {
      label = document.createElement(ownerReferenceSnapshot?.bannerLabel?.tag || 'strong');
      banner.replaceChildren(label);
    }
    label.classList.add('va-owner-reference-label');
    label.textContent = OWNER_LOG_TITLE;
    if (ownerReferenceSnapshot?.bannerLabel) {
      copyReferenceClasses(label, ownerReferenceSnapshot.bannerLabel, 'banner-label');
      applyInlineSnapshot(label, ownerReferenceSnapshot.bannerLabel.css);
    }
    return label;
  }

  function styleOwnerBanner(banner) {
    if (!banner || !ownerReferenceSnapshot) return null;
    copyReferenceClasses(banner, ownerReferenceSnapshot.banner, 'banner');
    banner.classList.add('userBanner', 'va-owner-reference-banner');
    banner.setAttribute('data-va-owner-reference-banner', 'true');
    banner.setAttribute('aria-label', OWNER_LOG_TITLE);
    banner.setAttribute('title', 'Локальное оформление ника и плашки в твоём браузере');
    ensureOwnerBannerLabel(banner);
    applyInlineSnapshot(banner, ownerReferenceSnapshot.banner.css);
    return banner;
  }

  function createOwnerReferenceBanner() {
    const badge = document.createElement(ownerReferenceSnapshot?.banner?.tag || 'span');
    badge.className = 'userBanner va-owner-reference-banner';
    const label = document.createElement(ownerReferenceSnapshot?.bannerLabel?.tag || 'strong');
    label.className = 'va-owner-reference-label';
    label.textContent = OWNER_LOG_TITLE;
    badge.appendChild(label);
    badge.setAttribute('data-va-owner-reference-banner', 'true');
    return badge;
  }

  function replaceOwnerBanner(container, fallbackAnchor = null) {
    if (!container || !ownerReferenceSnapshot) return;
    const candidates = collectOwnerBanners(container);
    const target = candidates.find(node => node.classList.contains('userBanner')) || candidates[0];
    if (target) {
      styleOwnerBanner(target);
      for (const extra of candidates) if (extra !== target && extra.classList.contains('va-owner-reference-banner')) extra.remove();
      return target;
    }
    const badge = createOwnerReferenceBanner();
    styleOwnerBanner(badge);
    const slot = container.querySelector?.('.message-userBanners, .message-userBanner, .memberHeader-banners') || null;
    if (slot) slot.appendChild(badge);
    else if (fallbackAnchor?.insertAdjacentElement) fallbackAnchor.insertAdjacentElement('afterend', badge);
    else container.appendChild(badge);
    return badge;
  }

  function decorateOwnerName(root = document) {
    if (!root) return;
    if (ownerReferenceSnapshot) updatePseudoStyleRules(ownerReferenceSnapshot);
    const nameNodes = [];
    if (root instanceof Element && root.matches(OWNER_NAME_SELECTOR)) nameNodes.push(root);
    if (root.querySelectorAll) nameNodes.push(...root.querySelectorAll(OWNER_NAME_SELECTOR));
    for (const node of nameNodes) styleOwnerName(node);

    // Banner replication still uses the locally captured banner snapshot; the nickname
    // itself no longer depends on that snapshot because its classes are known exactly.
    if (!ownerReferenceSnapshot) return;
    const messageBlocks = new Set();
    if (root instanceof Element) {
      const ownBlock = root.matches('.message-userDetails') ? root : root.closest('.message-userDetails');
      if (ownBlock) messageBlocks.add(ownBlock);
    }
    if (root.querySelectorAll) root.querySelectorAll('.message-userDetails').forEach(el => messageBlocks.add(el));
    for (const block of messageBlocks) {
      const author = block.querySelector(OWNER_NAME_SELECTOR);
      if ((author?.textContent || '').trim() !== OWNER) continue;
      const anchor = block.querySelector('.message-userTitle, .message-name, h4') || author;
      replaceOwnerBanner(block, anchor);
    }

    const profiles = new Set();
    if (root instanceof Element) {
      const profile = root.matches('.memberHeader, .memberProfile, .memberHeader-main')
        ? root : root.closest('.memberHeader, .memberProfile, .memberHeader-main');
      if (profile) profiles.add(profile);
    }
    if (root === document) {
      document.querySelectorAll('.memberHeader, .memberProfile, .memberHeader-main').forEach(el => profiles.add(el));
    } else if (root.querySelectorAll) {
      root.querySelectorAll('.memberHeader, .memberProfile, .memberHeader-main').forEach(el => profiles.add(el));
    }
    for (const profile of profiles) {
      const profileName = profile.querySelector('.memberHeader-name .username, .memberHeader-name [class*="username--style"], h1 .username, h1 [class*="username--style"]');
      if ((profileName?.textContent || '').trim() !== OWNER) continue;
      const bannerHost = profile.querySelector('.memberHeader-banners, .memberProfileBanner, .memberHeader-banner') || profile;
      const anchor = profile.querySelector('.memberHeader-name, h1') || profileName;
      replaceOwnerBanner(bannerHost, anchor);
    }
  }


  // Leader/deputy role labels ported from the LD console. Observer/follower accounts are intentionally excluded.
  const VA_LEADER_DEPUTY_BADGES = Object.freeze({
    '337247': { role: 'leader', label: 'ЛИДЕР · ПРАВИТЕЛЬСТВО' },
    '61846': { role: 'leader', label: 'ЛИДЕР · АРМИЯ' },
    '665168': { role: 'leader', label: 'ЛИДЕР · БОЛЬНИЦА' },
    '395998': { role: 'leader', label: 'ЛИДЕР · ГТРК «ТЕМП»' },
    '710153': { role: 'leader', label: 'ЛИДЕР · ПОЛИЦИЯ' },
    '209918': { role: 'leader', label: 'ЛИДЕР · СГБ' },
    '233306': { role: 'leader', label: 'ЛИДЕР · МЧС' },
    '390109': { role: 'leader', label: 'ЛИДЕР · ОПГ «ОФФНИКИ»' },
    '124513': { role: 'leader', label: 'ЛИДЕР · ОПГ «ТАМБОВСКОЕ»' },
    '664364': { role: 'leader', label: 'ЛИДЕР · ОПГ «КАВКАЗСКОЕ»' },
    '760431': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ПРАВИТЕЛЬСТВО' },
    '604565': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ПРАВИТЕЛЬСТВО' },
    '743229': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ПРАВИТЕЛЬСТВО' },
    '507995': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · АРМИЯ' },
    '65921': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · АРМИЯ' },
    '649359': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · БОЛЬНИЦА' },
    '631650': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · БОЛЬНИЦА' },
    '513640': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ГТРК «ТЕМП»' },
    '217195': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ГТРК «ТЕМП»' },
    '479415': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ГТРК «ТЕМП»' },
    '722676': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ПОЛИЦИЯ' },
    '281259': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · СГБ' },
    '594678': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · СГБ' },
    '587600': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · СГБ' },
    '532291': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · МЧС' },
    '742975': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · МЧС' },
    '740394': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · МЧС' },
    '691279': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «ОФФНИКИ»' },
    '438781': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «ОФФНИКИ»' },
    '673256': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «ОФФНИКИ»' },
    '32310': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «ТАМБОВСКОЕ»' },
    '162606': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «ТАМБОВСКОЕ»' },
    '682314': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «КАВКАЗСКОЕ»' },
    '233691': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «КАВКАЗСКОЕ»' },
    '829310': { role: 'deputy', label: 'ЗАМЕСТИТЕЛЬ · ОПГ «КАВКАЗСКОЕ»' },
  });

  const vaBadgeStyle = document.createElement('style');
  vaBadgeStyle.textContent = `
    .va-ld-role-badge{display:inline-block!important;vertical-align:middle!important;width:max-content!important;max-width:min(190px,100%)!important;margin:1px 0 1px 5px!important;padding:2px 7px!important;border:1px solid!important;border-radius:999px!important;font:800 8px/1.25 Inter,Segoe UI,Arial,sans-serif!important;letter-spacing:.25px!important;text-transform:uppercase!important;white-space:normal!important;text-align:center!important;box-shadow:0 1px 4px #0002!important;pointer-events:none!important}
    .va-ld-role-badge--leader{color:#ffe8b8!important;border-color:#d6ad5d99!important;background:linear-gradient(110deg,#9a6a25e8,#68431fe8)!important}
    .va-ld-role-badge--deputy{color:#dbeafe!important;border-color:#77a8e899!important;background:linear-gradient(110deg,#315a91ed,#483d82ed)!important}
  `;
  (document.head || document.documentElement).appendChild(vaBadgeStyle);

  function vaDecorateLeaderDeputyBadges(scope = document) {
    if (!scope?.querySelectorAll) return;
    const anchors = new Set();
    if (scope.matches?.('a.username[href*="members/"], .memberHeader-name a[href*="members/"]')) anchors.add(scope);
    for (const anchor of scope.querySelectorAll('a.username[href*="members/"], .memberHeader-name a[href*="members/"]')) anchors.add(anchor);
    for (const anchor of anchors) {
      if (!anchor.isConnected || anchor.closest('#' + IDS.panel) || anchor.closest('#' + IDS.auth) || anchor.querySelector('img,svg')) continue;
      const match = (anchor.getAttribute('href') || '').match(/members\/[^/?#]*\.([0-9]+)(?:\/|[?#]|$)/i);
      if (!match) continue;
      const info = VA_LEADER_DEPUTY_BADGES[match[1]];
      if (!info || !['leader','deputy'].includes(info.role)) continue;
      const username = (anchor.textContent || '').replace(/\s+/g,' ').trim();
      if (!username || username.length > 70) continue;
      let badge = anchor.nextElementSibling;
      while (badge?.classList.contains('va-ld-role-badge') && badge.dataset.userId === match[1]) {
        const next = badge.nextElementSibling; badge.remove(); badge = next;
      }
      if (!badge?.classList.contains('va-ld-role-badge') || badge.dataset.userId !== match[1]) {
        badge = document.createElement('span');
        badge.className = 'va-ld-role-badge';
        badge.dataset.userId = match[1];
        anchor.insertAdjacentElement('afterend', badge);
      }
      badge.className = 'va-ld-role-badge va-ld-role-badge--' + info.role;
      badge.dataset.userId = match[1];
      badge.textContent = info.label;
      badge.title = info.label + ' · ' + username;
    }
  }
  vaDecorateLeaderDeputyBadges();
  const vaLeaderDeputyObserver = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) vaDecorateLeaderDeputyBadges(node);
    }
  });
  vaLeaderDeputyObserver.observe(document.documentElement, {childList:true,subtree:true});

  // === Cross-server complaint SLA monitor and one-click prefix helper ===
  const slaStyles = {
    due: 'va340-thread-due', overdue: 'va340-thread-overdue'
  };
  const slaRows = new Map();
  function readSlaTracked() {
    try {
      const parsed = JSON.parse(safeGet(KEYS.slaTracked) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }
  let slaTracked = readSlaTracked();
  let slaTrackedSaveTimer = 0;
  function readSlaCache() {
    try {
      const parsed = JSON.parse(safeGet(KEYS.slaCache) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }
  let slaCache = readSlaCache();
  function readSlaScanHistory() {
    try {
      const parsed = JSON.parse(safeGet(KEYS.slaScanHistory) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }
  let slaScanHistory = readSlaScanHistory();
  function saveSlaScanHistory() {
    const entries = Object.entries(slaScanHistory)
      .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
      .slice(0, 400);
    slaScanHistory = Object.fromEntries(entries);
    safeSet(KEYS.slaScanHistory, JSON.stringify(slaScanHistory));
  }
  function saveSlaCache() {
    // Keep cache bounded so it cannot grow indefinitely.
    const entries = Object.entries(slaCache).sort((a, b) => (Number(b[1]?.checkedAt) || 0) - (Number(a[1]?.checkedAt) || 0)).slice(0, 300);
    slaCache = Object.fromEntries(entries);
    safeSet(KEYS.slaCache, JSON.stringify(slaCache));
  }
  function cachedStaffReply(url) {
    if (!settings.cacheEnabled) return null;
    const record = slaCache[url];
    if (!record || typeof record.answered !== 'boolean' || !Number.isFinite(Number(record.checkedAt))) return null;
    const ttl = Number(settings.cacheTtlMinutes) * 60 * 1000;
    if (Date.now() - Number(record.checkedAt) > ttl) { delete slaCache[url]; return null; }
    return record.answered;
  }
  let slaCacheSaveTimer = 0;
  function queueSlaCacheSave() {
    if (slaCacheSaveTimer) return;
    slaCacheSaveTimer = setTimeout(() => {
      slaCacheSaveTimer = 0;
      saveSlaCache();
    }, 900);
  }
  function rememberStaffReply(url, answered, activity = {}) {
    if (!settings.cacheEnabled || (typeof answered !== 'boolean' && answered !== null)) return;
    slaCache[url] = { answered, ...activity, checkedAt: Date.now() };
    queueSlaCacheSave();
  }
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const MAX_OVERDUE_MS = 80 * ONE_HOUR_MS; // Hide items more than 80 hours overdue, as requested.
  const MAX_TRACKED_AGE_MS = ONE_DAY_MS + MAX_OVERDUE_MS;
  const MANUAL_SCAN_LIMIT = 5;
  const SLA_FEED_DISPLAY_LIMIT = 30;
  const SLA_TRACKED_STORAGE_LIMIT = 350;
  const SLA_REFRESH_MS = 15 * 1000;
  const isWithinSlaWindow = createdAt => Number.isFinite(createdAt)
    && createdAt >= Date.now() - MAX_TRACKED_AGE_MS;

  function saveTrackedSlaItems() {
    if (slaTrackedSaveTimer) return;
    slaTrackedSaveTimer = setTimeout(() => {
      slaTrackedSaveTimer = 0;
      const now = Date.now();
      const entries = [...slaRows.values()]
        .filter(item => item?.href && isWithinSlaWindow(item.createdAt))
        .sort((a, b) => (Number(b.lastSeenAt) || 0) - (Number(a.lastSeenAt) || 0))
        .slice(0, SLA_TRACKED_STORAGE_LIMIT)
        .map(item => [item.href, {
          href: item.href,
          title: String(item.title || '').slice(0, 500),
          createdAt: Number(item.createdAt),
          answered: typeof item.answered === 'boolean' ? item.answered : null,
          lastReplyAt: Number(item.lastReplyAt) || 0, lastReplyRole: String(item.lastReplyRole || ''), lastReplyAuthor: String(item.lastReplyAuthor || '').slice(0, 80),
          lastPlayerReplyAt: Number(item.lastPlayerReplyAt) || 0, lastPlayerReplyAuthor: String(item.lastPlayerReplyAuthor || '').slice(0, 80),
          lastManagerReplyAt: Number(item.lastManagerReplyAt) || 0, lastManagerReplyRole: String(item.lastManagerReplyRole || ''), lastManagerReplyAuthor: String(item.lastManagerReplyAuthor || '').slice(0, 80),
          checkedAt: Number(item.checkedAt) || 0,
          attemptedAt: Number(item.attemptedAt) || 0,
          lastSeenAt: Number(item.lastSeenAt) || now
        }]);
      slaTracked = Object.fromEntries(entries);
      safeSet(KEYS.slaTracked, JSON.stringify(slaTracked));
    }, 600);
  }

  function hydrateTrackedSlaItems() {
    const now = Date.now();
    const ttl = Number(settings.cacheTtlMinutes) * 60 * 1000;
    for (const [href, stored] of Object.entries(slaTracked)) {
      if (!stored || stored.href !== href || !isWithinSlaWindow(Number(stored.createdAt))) continue;
      let answered = null;
      let checkedAt = Number(stored.checkedAt) || 0;
      if (settings.cacheEnabled && typeof stored.answered === 'boolean' && checkedAt && now - checkedAt <= ttl) {
        answered = stored.answered;
      }
      const cached = cachedStaffReply(href);
      if (cached !== null) {
        answered = cached;
        checkedAt = Number(slaCache[href]?.checkedAt) || checkedAt;
      }
      slaRows.set(href, {
        href,
        title: String(stored.title || 'Без названия'),
        createdAt: Number(stored.createdAt),
        answered,
        lastReplyAt: Number(stored.lastReplyAt) || 0, lastReplyRole: String(stored.lastReplyRole || ''), lastReplyAuthor: String(stored.lastReplyAuthor || ''),
        lastPlayerReplyAt: Number(stored.lastPlayerReplyAt) || 0, lastPlayerReplyAuthor: String(stored.lastPlayerReplyAuthor || ''),
        lastManagerReplyAt: Number(stored.lastManagerReplyAt) || 0, lastManagerReplyRole: String(stored.lastManagerReplyRole || ''), lastManagerReplyAuthor: String(stored.lastManagerReplyAuthor || ''),
        checked: answered !== null,
        checkedAt: answered === null ? 0 : checkedAt,
        attemptedAt: Number(stored.attemptedAt) || 0,
        lastSeenAt: Number(stored.lastSeenAt) || now,
        row: null
      });
    }
    saveTrackedSlaItems();
  }

  function mergeVisibleThreadRows(rows) {
    const now = Date.now();
    const ttl = Number(settings.cacheTtlMinutes) * 60 * 1000;
    for (const item of rows) {
      if (!isWithinSlaWindow(item.createdAt)) {
        const existing = slaRows.get(item.href);
        if (existing?.row?.isConnected) {
          existing.row.classList.remove('va340-sla-row-overdue', 'va340-sla-row-near');
          existing.row.querySelector('.va340-sla-chip')?.remove();
        }
        slaRows.delete(item.href);
        continue;
      }
      const previous = slaRows.get(item.href);
      const cached = cachedStaffReply(item.href);
      const listRole = item.latestAuthorRole || item.lastReplyRole || 'unknown';
      const hasFreshLatestPost = Number(item.lastReplyAt) > 0 && ['player', 'leader', 'admin'].includes(listRole);
      let answered = hasFreshLatestPost ? listRole !== 'player' : cached;
      let checkedAt = hasFreshLatestPost ? now : (cached !== null ? (Number(slaCache[item.href]?.checkedAt) || now) : 0);
      if (answered === null && settings.cacheEnabled && previous && typeof previous.answered === 'boolean' && previous.checkedAt && now - previous.checkedAt <= ttl) {
        answered = previous.answered;
        checkedAt = previous.checkedAt;
      }
      const merged = {
        ...previous,
        ...item,
        answered,
        lastReplyAt: Number(item.lastReplyAt) || Number(previous?.lastReplyAt) || 0,
        lastReplyRole: String(item.lastReplyRole || previous?.lastReplyRole || ''),
        lastReplyAuthor: String(item.lastReplyAuthor || previous?.lastReplyAuthor || ''),
        lastPlayerReplyAt: Number(item.lastPlayerReplyAt) || (listRole === 'player' ? Number(item.lastReplyAt) || 0 : Number(previous?.lastPlayerReplyAt) || 0),
        lastPlayerReplyAuthor: String(item.lastPlayerReplyAuthor || (listRole === 'player' ? item.lastReplyAuthor : '') || previous?.lastPlayerReplyAuthor || ''),
        lastManagerReplyAt: Number(item.lastManagerReplyAt) || (['leader', 'admin'].includes(listRole) ? Number(item.lastReplyAt) || 0 : Number(previous?.lastManagerReplyAt) || 0),
        lastManagerReplyRole: String(item.lastManagerReplyRole || (['leader', 'admin'].includes(listRole) ? listRole : '') || previous?.lastManagerReplyRole || ''),
        lastManagerReplyAuthor: String(item.lastManagerReplyAuthor || (['leader', 'admin'].includes(listRole) ? item.lastReplyAuthor : '') || previous?.lastManagerReplyAuthor || ''),
        checked: answered !== null,
        checkedAt,
        attemptedAt: Number(previous?.attemptedAt) || 0,
        lastSeenAt: now
      };
      slaRows.set(item.href, merged);
      updateRowSlaVisual(merged);
    }
    saveTrackedSlaItems();
  }

  function getSlaClockStart(item) {
    const lastAt = Number(item?.lastReplyAt) || 0;
    const lastRole = String(item?.lastReplyRole || item?.latestAuthorRole || '');
    if (lastRole === 'player' && lastAt > 0) return lastAt;
    const playerAt = Number(item?.lastPlayerReplyAt) || 0;
    if (playerAt > lastAt && playerAt > 0) return playerAt;
    return Number(item?.createdAt) || 0;
  }
  function getSlaDeadline(item) { return getSlaClockStart(item) + ONE_DAY_MS; }
  function getSlaPriority(item, now = Date.now()) {
    const deadline = getSlaDeadline(item);
    const overdue = deadline <= now;
    if (overdue && item.answered === false) return 0;
    if (overdue && item.answered === null) return 1;
    const left = deadline - now;
    if (left > 0 && left <= 3 * ONE_HOUR_MS) return 2;
    if (item.answered === null) return 3;
    if (item.answered === false) return 4;
    return 5;
  }
  const STATUS_PREFIX_RULES = {
    approve: { label: 'Добро / Одобрено', regex: /добро|одобр|одобрена|одобрено|одобрена жалоба|принят|принята|approved|accepted/i },
    reject: { label: 'Отказ', regex: /отказ|отклон|не\s*одобрен|отклонена|отклонено|declined|rejected/i },
    resolved: { label: 'Решено', regex: /решено|решена|решён|решен|рассмотрен|рассмотрена|resolved|solved/i },
    pending: { label: 'На рассмотрении', regex: /рассмотрени|ожидани|передан|на проверке|pending|in progress/i },
    open: { label: 'Открыто', regex: /открыт|\bopen\b/i },
    closed: { label: 'Закрыто', regex: /закрыт|\bclosed?\b/i },
    information: { label: 'Информация', regex: /информац|\binfo(?:rmation)?\b/i },
    important: { label: 'Важно', regex: /важн|приоритет|\bimportant\b|\bpriority\b/i }
  };
  function getContextText() {
    const crumbSelectors = '.p-breadcrumbs, .breadcrumb, nav[aria-label*="breadcrumb" i]';
    const crumbs = [...document.querySelectorAll(crumbSelectors)].map(n => n.innerText || n.textContent || '').join(' ');
    const heading = [...document.querySelectorAll('.p-title-value, .p-body-header h1, h1')].slice(0, 3).map(n => n.textContent || '').join(' ');
    return [crumbs, heading, document.title || '', location.pathname, location.search].join(' ').replace(/\s+/g, ' ');
  }
  function isComplaintArea() {
    // SLA is relevant not only to complaints, but also to state/ghetto reports and applications.
    // This is a local text check; it performs no forum request.
    const crumb = [...document.querySelectorAll('.p-breadcrumbs, .breadcrumb, nav[aria-label*="breadcrumb" i]')]
      .map(n => n.innerText || n.textContent || '').join(' ');
    const title = [...document.querySelectorAll('.p-title-value, .p-body-header h1, h1')]
      .slice(0, 4).map(n => n.textContent || '').join(' ');
    const rowHints = [...document.querySelectorAll('.structItem-title')].slice(0, 8)
      .map(n => n.textContent || '').join(' ');
    const pathHint = [location.pathname, location.search, document.title || ''].join(' ');
    const namedArea = /жалоб|обращени|претензи|complaint|appeal|player report|staff report|гос(?:ударств)?|гетто|опг|заяв|кандидат|лидер|замест|неактив|отч[её]т|application|leader|deputy/i.test([crumb, title, rowHints, pathHint].join(' '));
    // Some XenForo subforums use a generic heading or omit breadcrumbs on filtered/unread views.
    // In that case, a real thread list/current thread is enough to enable local-only SLA display.
    const hasThreadRows = !!document.querySelector('.structItem-title a[href*="threads"], .contentRow-title a[href*="threads"]');
    const hasCurrentThread = isThreadUrl() && !!document.querySelector('.message');
    return namedArea || hasThreadRows || hasCurrentThread;
  }
  function isThreadUrl(value = location.href) {
    return /(?:\/|\?)threads\//i.test(value) || /threads%2f/i.test(value);
  }
  function timeLabel(ms) {
    if (!Number.isFinite(ms)) return 'время неизвестно';
    const abs = Math.abs(ms);
    const hours = Math.floor(abs / 3600000);
    const minutes = Math.floor((abs % 3600000) / 60000);
    const seconds = Math.floor((abs % 60000) / 1000);
    return `${hours} ч ${String(minutes).padStart(2, '0')} мин ${String(seconds).padStart(2, '0')} сек`;
  }
  function parseXfDateText(value) {
    const text = String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text) return NaN;
    const now = new Date();
    const hm = text.match(/(?:сегодня|today|вчера|yesterday)\s*(?:в|at)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i);
    if (hm) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (/вчера|yesterday/i.test(text) ? 1 : 0), Number(hm[1]), Number(hm[2]), Number(hm[3] || 0));
      return d.getTime();
    }
    const numeric = text.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})(?:[, ]+.*?\b(\d{1,2}):(\d{2})(?::(\d{2}))?)?\b/);
    if (numeric) {      let year = Number(numeric[3]); if (year < 100) year += year < 70 ? 2000 : 1900;
      return new Date(year, Number(numeric[2]) - 1, Number(numeric[1]), Number(numeric[4] || 0), Number(numeric[5] || 0), Number(numeric[6] || 0)).getTime();
    }
    const months = {янв:0,январ:0,фев:1,март:2,мар:2,апр:3,май:4,мая:4,июн:5,июль:6,июл:6,авг:7,сент:8,сен:8,окт:9,нояб:10,ноя:10,дек:11,jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const monthMatch = text.match(/\b(\d{1,2})\s+([а-яёa-z]{3,8})\.?\s+(\d{4})(?:.*?\b(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i);
    if (monthMatch) {
      const key = monthMatch[2].slice(0, monthMatch[2].startsWith('сент') ? 4 : monthMatch[2].startsWith('нояб') ? 4 : 3);
      const month = months[key] ?? months[monthMatch[2].slice(0,3)];
      if (month !== undefined) return new Date(Number(monthMatch[3]), month, Number(monthMatch[1]), Number(monthMatch[4] || 0), Number(monthMatch[5] || 0), Number(monthMatch[6] || 0)).getTime();
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  function timestampFromSlaNode(node) {
    if (!node) return NaN;
    const values = [node.getAttribute?.('data-time'), node.dataset?.time, node.getAttribute?.('data-timestamp'), node.getAttribute?.('datetime'), node.dateTime,
      node.getAttribute?.('data-date-string'), node.getAttribute?.('data-time-string'), node.getAttribute?.('title'), node.getAttribute?.('aria-label'), node.textContent];
    for (const value of values) {
      if (!value) continue;
      const raw = String(value).trim();
      if (/^\d{9,13}$/.test(raw)) {
        const numeric = Number(raw);
        return numeric < 100000000000 ? numeric * 1000 : numeric;
      }
      const parsed = parseXfDateText(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return NaN;
  }
  function getCreatedAt(container) {
    if (!container) return NaN;
    const scopes = [];
    if (container.matches?.('.message')) {
      const attribution = container.querySelector('.message-attribution-main, .message-attribution, .message-attribution-opposite');
      if (attribution) scopes.push(attribution);
    } else {
      const startDate = container.querySelector?.('.structItem-startDate');
      const parts = container.querySelector?.('.structItem-parts');
      if (startDate) scopes.push(startDate);
      if (parts) scopes.push(parts);
    }
    scopes.push(container);
    const selectors = 'time[datetime],time[data-time],time,[data-time],[data-timestamp],[datetime],[data-date-string],[data-time-string],.structItem-startDate[title],a[title],abbr[title]';
    for (const scope of scopes) {
      const candidates = [];
      if (scope.matches?.(selectors)) candidates.push(scope);
      candidates.push(...(scope.querySelectorAll?.(selectors) || []));
      for (const node of candidates) {
        const stamp = timestampFromSlaNode(node);
        if (Number.isFinite(stamp)) return stamp;
      }
    }
    return NaN;
  }
  function readThreadRow(row) {
    if (!row || row.closest('#' + IDS.panel) || row.closest('#' + IDS.auth)) return null;
    const titleSelector = '.structItem-title a[href*="threads"], .contentRow-title a[href*="threads"], .block-row-main a[href*="threads"], a[data-tp-primary="on"][href*="threads"]';
    const titleLink = row.querySelector(titleSelector);
    if (!titleLink) return null;
    let url;
    try { url = new URL(titleLink.href, location.href); } catch { return null; }
    if (url.origin !== location.origin) return null;
    const startAuthor = row.querySelector('.structItem-parts a.username, .structItem-minor a.username, .structItem-cell--main a.username');
    const latestAuthorNode = row.querySelector('.structItem-latestPost a.username, .structItem-cell--latest a.username, .structItem-cell--meta a.username, .contentRow-minor a.username');
    const prefix = row.querySelector('.structItem-title .label, .structItem-title .labelLink, .structItem-title .label--primary');
    const latestScope = row.querySelector('.structItem-latestPost,.structItem-cell--latest,.structItem-cell--meta,.contentRow-minor');
    const latestAuthorRole = classifyListAuthor(latestAuthorNode, latestScope);
    const latestReplyAt = latestScope ? getCreatedAt(latestScope) : NaN;
    return {
      row, title: (titleLink.textContent || '').trim(), href: url.href,
      createdAt: getCreatedAt(row), startAuthor: (startAuthor?.textContent || '').trim(),
      latestAuthor: (latestAuthorNode?.textContent || '').trim(), latestAuthorStaff: latestAuthorRole === 'admin' || latestAuthorRole === 'leader', latestAuthorRole,
      lastReplyAt: Number.isFinite(latestReplyAt) ? latestReplyAt : 0, lastReplyRole: latestAuthorRole, lastReplyAuthor: (latestAuthorNode?.textContent || '').trim(),
      lastPlayerReplyAt: latestAuthorRole === 'player' && Number.isFinite(latestReplyAt) ? latestReplyAt : 0,
      lastPlayerReplyAuthor: latestAuthorRole === 'player' ? (latestAuthorNode?.textContent || '').trim() : '',
      lastManagerReplyAt: latestAuthorRole !== 'player' && Number.isFinite(latestReplyAt) ? latestReplyAt : 0,
      lastManagerReplyRole: latestAuthorRole, lastManagerReplyAuthor: latestAuthorRole !== 'player' ? (latestAuthorNode?.textContent || '').trim() : '',
      prefixText: (prefix?.textContent || '').trim(), answered: latestAuthorRole === 'player' ? false : (latestAuthorRole === 'admin' || latestAuthorRole === 'leader' ? true : null), checked: false
    };
  }
  function getThreadRows() {
    return [...document.querySelectorAll('.structItem--thread, .structItem, .block-row')]
      .map(readThreadRow).filter(Boolean);
  }
  const STAFF_TITLE_RE = /администратор|модератор|куратор|следящ(?:ий|ая|его)|главн(?:ый|ого) администратор|(?:ст(?:арший)?\.?\s*)?специалист(?:а)? по обработке логов|moderator|administrator|\bstaff\b/i;
  const LEADER_TITLE_RE = /лидер(?:а|у|ом|ы|ов)?|заместител(?:ь|я|ю|ем|и)|руководител(?:ь|я|ю|ем|и)|leader|deputy/i;
  function messageRole(message) {
    if (!message) return 'player';
    const titles = [...message.querySelectorAll('.message-userTitle,.userTitle,.message-userBanner,.userBanner,.message-userDetails .userTitle')]
      .map(node => node.textContent || '').join(' ');
    if (LEADER_TITLE_RE.test(titles)) return 'leader';
    if (message.matches('.message--staff,.message--staffPost') || message.querySelector('.username--staff,.username--admin,.username--moderator,.message-userBanner--staff,.userBanner--staff,[data-user-role="staff"],[data-user-role="admin"],[data-user-group*="admin" i],[data-user-group*="moderator" i]') || STAFF_TITLE_RE.test(titles)) return 'admin';
    return 'player';
  }
  function isStaffMessage(message) { return messageRole(message) !== 'player'; }
  function messageAuthor(message) {
    return (message?.querySelector('.message-name a.username,.message-name .username,.message-userDetails a.username,a.username')?.textContent || '').trim();
  }
  function formatSlaDate(value) {
    const stamp = Number(value);
    if (!Number.isFinite(stamp) || stamp <= 0) return 'не определено';
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(stamp));
  }
  function analyzeThreadActivity(messages) {
    const replies = (messages || []).slice(1);
    const records = replies.map(message => ({ at: getCreatedAt(message), role: messageRole(message), author: messageAuthor(message) }))
      .filter(record => Number.isFinite(record.at));
    const latest = records.reduce((best, item) => !best || item.at > best.at ? item : best, null);
    const latestPlayer = records.filter(item => item.role === 'player').reduce((best, item) => !best || item.at > best.at ? item : best, null);
    const latestManager = records.filter(item => item.role !== 'player').reduce((best, item) => !best || item.at > best.at ? item : best, null);
    return {
      answered: latest ? latest.role !== 'player' : null,
      lastReplyAt: latest?.at || 0, lastReplyRole: latest?.role || '', lastReplyAuthor: latest?.author || '',
      lastPlayerReplyAt: latestPlayer?.at || 0, lastPlayerReplyAuthor: latestPlayer?.author || '',
      lastManagerReplyAt: latestManager?.at || 0, lastManagerReplyRole: latestManager?.role || '', lastManagerReplyAuthor: latestManager?.author || ''
    };
  }
  function classifyListAuthor(node, scope) {
    if (!node) return 'unknown';
    const classes = node.classList;
    const bannerText = [...(scope?.querySelectorAll?.('.userTitle,.userBanner,.message-userTitle,.message-userBanner') || [])].map(n => n.textContent || '').join(' ');
    if (LEADER_TITLE_RE.test(bannerText)) return 'leader';
    if (classes.contains('username--staff') || classes.contains('username--admin') || classes.contains('username--moderator') || STAFF_TITLE_RE.test(bannerText)) return 'admin';
    return 'player';
  }
  async function inspectThreadForStaffReply(url, forceRefresh = false) {
    if (forumRequestsPaused()) return null;
    if (!forceRefresh) {
      const cached = cachedStaffReply(url);
      if (cached !== null) return cached;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { credentials: 'same-origin', redirect: 'follow', signal: controller.signal });
      if ([403, 429, 503].includes(response.status)) {
        const pause = pauseForumRequests(response.status, response);
        console.warn('[Atelier Monitor] Проверки приостановлены: HTTP', response.status, 'на', Math.ceil(pause / 60000), 'мин.');
        return null;
      }
      if (!response.ok) return null;
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const messages = [...doc.querySelectorAll('.message')];
      if (!messages.length) return null;
      const activity = analyzeThreadActivity(messages);
      const answered = activity.answered;
      rememberStaffReply(url, answered, activity);
      return answered;
    } catch (e) {
      console.debug('[Atelier Monitor] Не удалось проверить тему:', url, e);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  function slaActivityLabel(item) {
    const parts = [];
    if (item?.lastReplyAt) parts.push(`Последний ответ: ${formatSlaDate(item.lastReplyAt)} · ${item.lastReplyRole === 'leader' ? 'лидер/заместитель' : item.lastReplyRole === 'admin' ? 'администрация' : item.lastReplyRole === 'player' ? 'игрок' : 'роль не определена'}${item.lastReplyAuthor ? ` (${item.lastReplyAuthor})` : ''}`);
    if (item?.lastPlayerReplyAt) parts.push(`Последний ответ игрока: ${formatSlaDate(item.lastPlayerReplyAt)}${item.lastPlayerReplyAuthor ? ` (${item.lastPlayerReplyAuthor})` : ''}`);
    else if (item?.lastManagerReplyAt) parts.push('Дата предыдущего ответа игрока в списке тем не отображается');
    return parts.join(' · ');
  }
  function updateRowSlaVisual(item) {
    const { row, createdAt, answered } = item;
    if (!row || !row.isConnected) return;
    if (!isWithinSlaWindow(createdAt)) {
      row.classList.remove('va340-sla-row-overdue', 'va340-sla-row-near');
      row.querySelector('.va340-sla-chip')?.remove();
      return;
    }
    const title = row.querySelector('.structItem-title, .contentRow-title, .block-row-main .contentRow-title');
    if (!title) return;
    let badge = title.querySelector('.va340-sla-chip');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'va340-sla-chip';
      title.appendChild(badge);
    }
    const left = getSlaDeadline(item) - Date.now();
    const overdue = left <= 0 && answered === false;
    const near = left > 0 && left < 3 * 3600000;
    row.classList.toggle('va340-sla-row-overdue', overdue);
    row.classList.toggle('va340-sla-row-near', near);
    if (answered === true) {
      badge.textContent = '✓ ОТВЕТ ЛИДЕРА / ЗАМЕСТИТЕЛЯ / АДМИНИСТРАЦИИ НАЙДЕН';
      badge.style.background = '#10b98125'; badge.style.color = '#34d399';
    } else if (overdue) {
      badge.textContent = '⚠ ПРОСРОЧЕНО · ' + timeLabel(-left);
      badge.style.background = ''; badge.style.color = '';
    } else if (left <= 0) {
      badge.textContent = '⚠ ПРОСРОЧКА · ответ ещё не подтверждён';
      badge.style.background = '#f59e0b25'; badge.style.color = '#fbbf24';
    } else {
      badge.textContent = 'До просрочки: ' + timeLabel(left) + (answered === null ? ' · ответ не проверен' : '');
      badge.style.background = near ? '#f59e0b25' : '#8b5cf622';
      badge.style.color = near ? '#fbbf24' : 'var(--va-muted)';
    }
    const activityText = slaActivityLabel(item);
    if (activityText) badge.textContent += ' · ' + activityText;
  }

  function renderSlaSummary(items, note = '') {
    const box = inPanel('va340-sla-summary');
    if (!box) return;
    const now = Date.now();
    const tracked = items.filter(item => isWithinSlaWindow(item.createdAt));
    const overdue = tracked.filter(item => item.answered === false && getSlaDeadline(item) <= now).length;
    const overdueUnverified = tracked.filter(item => item.answered === null && getSlaDeadline(item) <= now).length;
    const near = tracked.filter(item => item.answered !== true && getSlaDeadline(item) > now && getSlaDeadline(item) - now <= 3 * ONE_HOUR_MS).length;
    const answered = tracked.filter(item => item.answered === true).length;
    const pending = tracked.filter(item => item.answered === false && getSlaDeadline(item) > now).length;
    const unknown = tracked.filter(item => item.answered === null && getSlaDeadline(item) > now).length;
    box.replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = 'Итоги контроля сроков';
    const detail = document.createElement('span');
    detail.className = 'va340-sla-summary-detail';
    detail.textContent = `В базе: ${tracked.length} · Просрочено: ${overdue} · Просрочка без проверки: ${overdueUnverified} · Скоро срок: ${near} · Ответ найден: ${answered} · Ожидают: ${pending} · Не проверены: ${unknown}${note ? ' · ' + note : ''}`;
    box.replaceChildren(heading, detail);
  }

  function refreshSlaSummaryOnly(items, now = Date.now()) {
    const box = inPanel('va340-sla-summary');
    const detail = box?.querySelector('.va340-sla-summary-detail');
    if (!detail) return;
    const tracked = items.filter(item => isWithinSlaWindow(item.createdAt));
    const overdue = tracked.filter(item => item.answered === false && getSlaDeadline(item) <= now).length;
    const overdueUnverified = tracked.filter(item => item.answered === null && getSlaDeadline(item) <= now).length;
    const near = tracked.filter(item => item.answered !== true && getSlaDeadline(item) > now && getSlaDeadline(item) - now <= 3 * ONE_HOUR_MS).length;
    const answered = tracked.filter(item => item.answered === true).length;
    const pending = tracked.filter(item => item.answered === false && getSlaDeadline(item) > now).length;
    const unknown = tracked.filter(item => item.answered === null && getSlaDeadline(item) > now).length;
    detail.textContent = `В базе: ${tracked.length} · Просрочено: ${overdue} · Просрочка без проверки: ${overdueUnverified} · Скоро срок: ${near} · Ответ найден: ${answered} · Ожидают: ${pending} · Не проверены: ${unknown}`;
  }

  function updateSlaCardStatus(card, now = Date.now()) {
    const item = card?._vaSlaItem;
    const status = card?.querySelector('.va340-sla-card-status');
    if (!item || !status) return;
    const left = getSlaDeadline(item) - now;
    card.classList.remove('answered', 'overdue', 'near', 'overdue-unverified');
    if (item.answered === true) {
      status.textContent = 'Ответ лидера / заместителя / администрации найден.';
      card.classList.add('answered');
    } else if (left <= 0 && item.answered === false) {
      status.textContent = 'ПРОСРОЧЕНО на ' + timeLabel(-left) + ' — ответ лидера / заместителя / администрации не найден.';
      card.classList.add('overdue');
    } else if (left <= 0) {
      status.textContent = 'СРОК ИСТЁК на ' + timeLabel(-left) + ' — ответ не проверен; требуется повторная проверка.';
      card.classList.add('overdue-unverified');
    } else {
      status.textContent = 'До просрочки: ' + timeLabel(left) + (item.answered === null ? ' · ответ ещё не проверен' : ' · ожидает рассмотрения');
      if (left < 3 * 3600000) card.classList.add('near');
    }
    const activityText = slaActivityLabel(item);
    if (activityText) status.textContent += ' · ' + activityText;
  }

  function refreshSlaFeedCountdowns(now = Date.now()) {
    const feed = inPanel('va340-sla-feed');
    if (!feed) return;
    const allCards = [...feed.querySelectorAll('.va340-sla-card')];
    for (const card of allCards) {
      if (!card._vaSlaItem || !isWithinSlaWindow(card._vaSlaItem.createdAt)) card.remove();
      else updateSlaCardStatus(card, now);
    }
    const cards = [...feed.querySelectorAll('.va340-sla-card')];
    cards.sort((a, b) => getSlaPriority(a._vaSlaItem, now) - getSlaPriority(b._vaSlaItem, now)
      || a._vaSlaItem.createdAt - b._vaSlaItem.createdAt);
    // Reorder existing nodes only; do not recreate the cards or trigger network work.
    const nonCards = [...feed.children].filter(node => !node.classList.contains('va340-sla-card'));
    feed.replaceChildren(...cards, ...nonCards);
  }

  function renderSlaFeed(items, message) {
    const feed = inPanel('va340-sla-feed');
    if (!feed) return;
    feed.replaceChildren();
    const now = Date.now();
    const trackedItems = items
      .filter(item => isWithinSlaWindow(item.createdAt))
      .sort((a, b) => getSlaPriority(a, now) - getSlaPriority(b, now)
        || a.createdAt - b.createdAt
        || (Number(a.lastSeenAt) || 0) - (Number(b.lastSeenAt) || 0));
    const visibleItems = trackedItems.slice(0, SLA_FEED_DISPLAY_LIMIT);
    renderSlaSummary(trackedItems);
    if (!visibleItems.length) {
      const empty = document.createElement('div'); empty.className = 'va-local-note';
      empty.textContent = message || 'Пока нет сохранённых тем. Открой нужный раздел — сроки появятся по мере прокрутки.';
      feed.appendChild(empty); return;
    }
    visibleItems.forEach(item => {
      const card = document.createElement('div'); card.className = 'va340-sla-card';
      const title = document.createElement('strong'); title.textContent = item.title || 'Без названия';
      const status = document.createElement('span');
      status.className = 'va340-sla-card-status';
      card._vaSlaItem = item;
      card.append(title, status);
      updateSlaCardStatus(card, now);
      const link = document.createElement('a'); link.href = item.href; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Открыть тему ↗'; link.style.cssText = 'display:inline-block;margin-top:6px;color:var(--va-accent,#a78bfa);font-size:10px';
      card.appendChild(link); feed.appendChild(card);
    });
    if (trackedItems.length > visibleItems.length) {
      const more = document.createElement('div'); more.className = 'va-local-note';
      more.textContent = `Показано ${visibleItems.length} из ${trackedItems.length} сохранённых тем. Вверху — просроченные и ближайшие сроки.`;
      feed.appendChild(more);
    }
    if (message) { const status = document.createElement('div'); status.className = 'va-local-note'; status.textContent = message; feed.appendChild(status); }
  }

  let slaScanBusy = false;
  let slaLastScanAt = 0;
  const REQUEST_PAUSE_KEY = 'vladimir_atelier_forum_request_pause_until';
  let forumRequestPauseUntil = 0;
  try { forumRequestPauseUntil = Number(sessionStorage.getItem(REQUEST_PAUSE_KEY)) || 0; } catch {}
  function getRetryAfterDelay(response) {
    const value = response?.headers?.get('Retry-After');
    if (!value) return 0;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(6 * 60 * 60 * 1000, seconds * 1000);
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.min(6 * 60 * 60 * 1000, Math.max(0, date - Date.now())) : 0;
  }
  function pauseForumRequests(status, response) {
    const fallback = status === 429 ? 30 * 60 * 1000 : status === 403 ? 60 * 60 * 1000 : 15 * 60 * 1000;
    const delay = Math.max(fallback, getRetryAfterDelay(response));
    forumRequestPauseUntil = Math.max(forumRequestPauseUntil, Date.now() + delay);
    try { sessionStorage.setItem(REQUEST_PAUSE_KEY, String(forumRequestPauseUntil)); } catch {}
    return delay;
  }
  function forumRequestsPaused() {
    if (forumRequestPauseUntil <= Date.now()) {
      forumRequestPauseUntil = 0;
      try { sessionStorage.removeItem(REQUEST_PAUSE_KEY); } catch {}
      return false;
    }
    return true;
  }
  async function scanSlaTopics() {
    const ctx = inPanel('va340-context-status');
    if (forumRequestsPaused()) {
      ctx.textContent = 'Форум временно ограничил запросы. Проверка остановлена ещё примерно на ' + Math.ceil((forumRequestPauseUntil - Date.now()) / 60000) + ' мин. Не запускай повторные проверки до окончания паузы.';
      return;
    }
    if (slaScanBusy) { ctx.textContent = 'Проверка уже выполняется. Дождись её завершения.'; return; }
    const scanCooldownMs = 15 * 60 * 1000;
    const scanWaitMs = scanCooldownMs - (Date.now() - slaLastScanAt);
    if (slaLastScanAt && scanWaitMs > 0) {
      ctx.textContent = 'Чтобы не перегружать форум, повторная проверка будет доступна через ' + Math.ceil(scanWaitMs / 60000) + ' мин.';
      return;
    }
    const btn = inPanel('va340-scan');
    if (!isComplaintArea()) {
      ctx.textContent = 'Не распознал раздел жалоб, Госс, Гетто или заявок на этой странице. Сохранённые сроки остаются в панели.';
      renderSlaFeed([...slaRows.values()], 'Прокручивай список жалоб, Госс, Гетто или заявок — видимые сроки попадут в панель.');
      return;
    }
    slaScanBusy = true;
    slaLastScanAt = Date.now();
    let scanHistoryDirty = false;
    ctx.textContent = 'Запущена ручная проверка: до 5 тем. Повторные результаты берутся из локального кэша; темы до 30 дней после срока остаются в отслеживании…';
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = '⟳ Проверяю…';
    try {
      const allRows = getThreadRows().filter(item => item.href);
      const now = Date.now();
      const cutoff = now - MAX_TRACKED_AGE_MS;
      const tooOldCount = allRows.filter(item => Number.isFinite(item.createdAt) && item.createdAt < cutoff).length;
      const noDateCount = allRows.filter(item => !Number.isFinite(item.createdAt)).length;

      // Merge every eligible topic visible on this page into the persistent local backlog.
      // Only a small rotating batch receives network checks in each cycle.
      mergeVisibleThreadRows(allRows);
      for (const [href, item] of slaRows.entries()) {
        if (!isWithinSlaWindow(item.createdAt)) slaRows.delete(href);
      }

      const eligible = allRows
        .filter(item => isWithinSlaWindow(item.createdAt))
        .map(item => slaRows.get(item.href) || item)
        .sort((a, b) => {
          const aChecked = Number(slaScanHistory[a.href]) || 0;
          const bChecked = Number(slaScanHistory[b.href]) || 0;
          // Unchecked / stale topics rotate first; overdue deadlines break ties.
          return aChecked - bChecked
            || getSlaPriority(a, now) - getSlaPriority(b, now)
            || a.createdAt - b.createdAt;
        });
      const limit = MANUAL_SCAN_LIMIT;
      const items = eligible.slice(0, limit);
      const skippedCount = Math.max(0, eligible.length - items.length);
      const scopeText = `На этой странице: ${eligible.length} тем; проверяется ${items.length}; старше лимита 30 дней после срока: ${tooOldCount}; без даты: ${noDateCount}; в очереди: ${skippedCount}.`;

      if (!items.length) {
        saveTrackedSlaItems();
        renderSlaFeed([...slaRows.values()], `На текущей странице подходящих тем нет. Найдено ${allRows.length}; старше 30 дней после срока: ${tooOldCount}; без даты: ${noDateCount}.`);
        ctx.textContent = 'Новых тем для проверки нет. Сохранённые темы и просрочки оставлены в панели.';
        return;
      }

      renderSlaFeed([...slaRows.values()], scopeText);
      let stoppedByForumLimit = false;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        item.attemptedAt = Date.now();
        item.lastSeenAt = Date.now();
        slaScanHistory[item.href] = Date.now();
        scanHistoryDirty = true;
        const found = await inspectThreadForStaffReply(item.href, false);
        if (forumRequestsPaused()) {
          item.answered = null; item.checked = false; item.checkedAt = 0;
          slaRows.set(item.href, item); saveTrackedSlaItems();
          ctx.textContent = 'Форум ограничил запросы. Остаток проверки остановлен; пауза примерно ' + Math.ceil((forumRequestPauseUntil - Date.now()) / 60000) + ' мин.';
          stoppedByForumLimit = true;
          break;
        }
        item.answered = found;
        item.checked = found !== null;
        const activity = slaCache[item.href] || {};
        for (const key of ['lastReplyAt','lastReplyRole','lastReplyAuthor','lastPlayerReplyAt','lastPlayerReplyAuthor','lastManagerReplyAt','lastManagerReplyRole','lastManagerReplyAuthor']) {
          if (activity[key] !== undefined) item[key] = activity[key];
        }
        item.checkedAt = found === null ? 0 : (Number(slaCache[item.href]?.checkedAt) || Date.now());
        slaRows.set(item.href, item);
        updateRowSlaVisual(item);
        saveTrackedSlaItems();
        refreshSlaFeedCountdowns(Date.now());
        refreshSlaSummaryOnly([...slaRows.values()], Date.now());
        ctx.textContent = `Проверено ${i + 1} из ${items.length}. ${scopeText}`;
        if (i < items.length - 1) await new Promise(resolve => setTimeout(resolve, 1200));
      }
      saveTrackedSlaItems();
      if (stoppedByForumLimit) {
        ctx.textContent = 'Проверка остановлена по ответу форума об ограничении доступа. Не повторяй запросы до окончания паузы.';
        renderSlaFeed([...slaRows.values()], 'Остаток очереди не запрашивался. Сохранённые результаты оставлены без изменений.');
      } else {
        ctx.textContent = `Проверка завершена: ${items.length} тем. Известные темы сохранены. Повторная ручная проверка будет доступна через 15 минут. ${scopeText}`;
        renderSlaFeed([...slaRows.values()], 'Список сортируется так, чтобы просроченные темы были сверху. Ответ, который не удалось проверить, помечается отдельно и не считается подтверждённой просрочкой.');
      }
    } catch (e) {
      console.warn('[Atelier Monitor] Ошибка контроля сроков', e);
      ctx.textContent = 'Не удалось завершить сканирование. Проверь вход на форум и список тем.';
      renderSlaFeed([...slaRows.values()], 'Последние сохранённые результаты оставлены на экране.');
    } finally {
      if (scanHistoryDirty) saveSlaScanHistory();
      slaScanBusy = false;
      btn.disabled = false; btn.textContent = oldText;
    }
  }

  function normalizeThreadUrl(value) {
    try {
      const url = new URL(value, location.href);
      url.hash = '';
      url.pathname = url.pathname.replace(/\/unread\/?$/i, '').replace(/\/+$/, '');
      url.search = url.search.replace(/\/unread(?:\/|$)/i, '/').replace(/\/$/, '');
      return url.href;
    } catch { return String(value || '').replace(/\/unread\/?$/i, '').replace(/\/+$/, ''); }
  }
  function updateCurrentThreadBadge() {
    if (!isThreadUrl()) return;
    const currentKey = normalizeThreadUrl(location.href);
    const item = slaRows.get(location.href) || [...slaRows.values()].find(entry => normalizeThreadUrl(entry.href) === currentKey);
    let badge = document.querySelector('.va340-thread-overdue,.va340-thread-due');
    if (!item || !isWithinSlaWindow(item.createdAt)) {
      badge?.remove();
      return;
    }
    const titleNode = document.querySelector('.p-title-value, .p-body-header h1');
    if (!titleNode) return;
    if (!badge) {
      badge = document.createElement('span');
      titleNode.insertAdjacentElement('afterend', badge);
    }
    const left = getSlaDeadline(item) - Date.now();
    badge.className = item.answered === true || left > 0 || item.answered === null ? slaStyles.due : slaStyles.overdue;
    const mainStatus = item.answered === true
      ? ' ✓ Ответ администрации / руководства найден'
      : left <= 0 && item.answered === false
        ? ' ⚠ ПРОСРОЧЕНО: ответ руководства не найден · ' + timeLabel(-left)
        : left <= 0
          ? ' ⚠ СРОК ИСТЁК: ответ ещё не проверен · ' + timeLabel(-left)
          : ' ⏳ До просрочки: ' + timeLabel(left);
    badge.textContent = mainStatus + (slaActivityLabel(item) ? ' · ' + slaActivityLabel(item) : '');
  }
  function inspectCurrentThread() {
    const ctx = inPanel('va340-context-status');
    const feed = inPanel('va340-sla-feed');
    if (!isComplaintArea()) {
      ctx.textContent = 'Чтобы считать срок, открой тему из раздела жалоб, Госс, Гетто или заявок.';
      renderSlaFeed([...slaRows.values()], 'Сохранённые сроки остаются в списке. Для проверки открой нужную тему или заявку.');
      return;
    }
    const messages = [...document.querySelectorAll('.message')];
    if (!messages.length) {
      ctx.textContent = 'Не нашёл сообщения темы.';
      renderSlaFeed([...slaRows.values()], 'Открой нужную тему или заявку. Сохранённые результаты не удалены.');
      return;
    }
    const createdAt = getCreatedAt(messages[0]);
    if (!isWithinSlaWindow(createdAt)) {
      slaRows.delete(location.href);
      document.querySelectorAll('.va340-thread-overdue,.va340-thread-due').forEach(n => n.remove());
      ctx.textContent = Number.isFinite(createdAt)
        ? 'Тема старше 30 дней после срока — локальный индикатор больше не отслеживает её.'
        : 'Не удалось определить дату создания темы — таймер не запущен.';
      renderSlaFeed([...slaRows.values()], ctx.textContent);
      return;
    }
    const activity = analyzeThreadActivity(messages);
    const answered = activity.answered;
    const title = document.querySelector('.p-title-value')?.textContent.trim() || document.title;
    const previous = slaRows.get(location.href);
    const item = { ...previous, ...activity, title, href: location.href, createdAt, answered, checked: answered !== null, checkedAt: answered === null ? 0 : Date.now(), attemptedAt: Date.now(), lastSeenAt: Date.now(), row: null };
    slaRows.set(location.href, item);
    rememberStaffReply(location.href, answered, activity);
    saveTrackedSlaItems();
    ctx.textContent = 'Проверена текущая тема по сообщениям, загруженным в браузере.';
    renderSlaFeed([...slaRows.values()], 'Срок считается от последнего сообщения игрока; если игрок ещё не отвечал — от создания темы. Ответ руководства закрывает текущий срок до следующего сообщения игрока.');
    updateCurrentThreadBadge();
  }
  function startSlaLazyObserver() {
    if (!isComplaintArea()) return;
    const handled = new Set();
    const liveRows = new Set();
    const processRow = row => {
      const item = readThreadRow(row);
      if (!item || !Number.isFinite(item.createdAt)) { handled.delete(row); return; }
      mergeVisibleThreadRows([item]);
      if (item.row) liveRows.add(item.row);
      refreshSlaSummaryOnly([...slaRows.values()], Date.now());
    };
    const register = root => {
      if (!root) return;
      const candidates = [];
      if (root instanceof Element) {
        const ancestorRow = root.closest('.structItem--thread, .structItem, .block-row');
        if (ancestorRow) candidates.push(ancestorRow);
        if (root.matches('.structItem--thread, .structItem, .block-row')) candidates.push(root);
      }
      if (root.querySelectorAll) candidates.push(...root.querySelectorAll('.structItem--thread, .structItem, .block-row'));
      for (const row of candidates) {
        if (handled.has(row) || row.closest('#' + IDS.panel) || row.closest('#' + IDS.auth)) continue;
        handled.add(row);
        if (rowObserver) rowObserver.observe(row);
      }
    };
    const rowObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        rowObserver.unobserve(entry.target);
        processRow(entry.target);
      }
    }, { root: null, rootMargin: '160px 0px', threshold: 0 }) : null;
    if (rowObserver) {
      register(document);
      let currentThreadRefreshQueued = false;
      const mutationObserver = new MutationObserver(records => {
        let messageChanged = false;
        for (const record of records) {
          const target = record.target instanceof Element ? record.target : record.target.parentElement;
          if (record.type === 'attributes' && record.target instanceof Element) register(record.target);
          if (record.type === 'characterData' && record.target.parentElement) register(record.target.parentElement);
          if (record.type === 'childList' && record.target instanceof Element) register(record.target);
          if (target?.closest?.('.message')) messageChanged = true;
          for (const node of record.addedNodes) if (node.nodeType === Node.ELEMENT_NODE) {
            register(node);
            if (node.matches?.('.message') || node.querySelector?.('.message')) messageChanged = true;
          }
        }
        if (messageChanged && isThreadUrl() && !currentThreadRefreshQueued) {
          currentThreadRefreshQueued = true;
          setTimeout(() => { currentThreadRefreshQueued = false; if (document.querySelector('.message')) inspectCurrentThread(); }, 180);
        }
      });
      if (document.body) mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['datetime', 'data-time', 'data-timestamp', 'data-date-string', 'data-time-string', 'title', 'aria-label'], characterData: true });
    } else {
      // Fallback: one pass on load and on actual scroll, still without network requests.
      const fallback = () => getThreadRows().forEach(item => {
        const rect = item.row.getBoundingClientRect();
        if (rect.bottom >= -160 && rect.top <= window.innerHeight + 160) processRow(item.row);
      });
      fallback();
      window.addEventListener('scroll', fallback, { passive: true });
    }
    // Recompute already decorated countdown labels locally; no page reloads or requests.
    setInterval(() => {
      for (const row of [...liveRows]) {
        if (!row.isConnected) { liveRows.delete(row); continue; }
        const badge = row.querySelector('.va340-sla-chip');
        const item = [...slaRows.values()].find(value => value.row === row);
        if (item && badge) updateRowSlaVisual(item);
      }
    }, 30000);
  }

  hydrateTrackedSlaItems();

  function isThreadEditForm(form) {
    if (!(form instanceof HTMLFormElement) || form.closest('.block-filterBar, .js-filterMenu')) return false;
    const action = form.getAttribute('action') || '';
    const hasTitle = !!form.querySelector('input[name="title"], input[name="thread_title"], input[name="threadTitle"]');
    return !!form.querySelector('select[name="prefix_id"], select[name="prefix_id[]"], input[name="prefix_id"], input[name="prefix_id[]"], .js-prefixMenu, [data-xf-init*="prefix"]')
      && (!!form.closest('.overlay, .overlay-container, .modal, .js-overlay') || hasTitle || /threads.*edit|\/edit(?:\/|\?|$)/i.test(action));
  }
  function findPrefixEditor() {
    const forms = [...document.querySelectorAll('form')].filter(isThreadEditForm);
    forms.sort((a, b) => Number(isVisible(b)) - Number(isVisible(a)));
    const form = forms[0];
    if (!form) return null;
    return {
      form,
      select: form.querySelector('select[name="prefix_id"], select[name="prefix_id[]"], select.js-prefixSelect'),
      widget: form.querySelector('.js-prefixMenu, [data-xf-init*="prefix"]')
    };
  }
  function visiblePrefixSelect() { return findPrefixEditor()?.select || null; }
  function findThreadEditOverlayLink() {
    const currentUrl = new URL(location.href);
    const currentMatch = (currentUrl.pathname + currentUrl.search).match(/threads\/([^/?#]+?)(?:\/|$|\?)/i);
    const currentId = currentMatch?.[1]?.match(/\.(\d+)/)?.[1] || '';
    return [...document.querySelectorAll('a[href], button[data-href], [data-url]')].find(node => {
      let href = node.getAttribute('href') || node.getAttribute('data-href') || node.getAttribute('data-url') || '';
      try { href = decodeURIComponent(href); } catch {}
      const text = (node.textContent || node.getAttribute('aria-label') || node.title || '').trim();
      const editLink = /(?:\/edit(?:\/|\?|&|$)|edit-thread|thread-edit)/i.test(href) || /редактировать тему|изменить тему|edit thread/i.test(text);
      if (!editLink || !/threads\//i.test(href)) return false;
      if (currentId && !href.includes('.' + currentId)) return false;
      // Do not discard valid Edit URLs just because their menu is currently closed.
      return true;
    }) || null;
  }
  async function waitForPrefixEditor(timeoutMs = 6500) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const editor = findPrefixEditor();
      if (editor) return editor;
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
    return null;
  }
  function detectPrefixOption(select, statusKey) {
    const rule = STATUS_PREFIX_RULES[statusKey];
    if (!rule || !select?.options) return null;
    const options = [...select.options].filter(option => option.value !== '' && !option.disabled);
    const normalized = value => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru-RU');
    const exact = options.find(option => normalized(option.textContent) === normalized(rule.label));
    return exact || options.find(option => rule.regex.test(normalized(option.textContent))) || null;
  }
  async function choosePrefixFromMenu(widget, statusKey) {
    if (!widget) return '';
    const rule = STATUS_PREFIX_RULES[statusKey];
    const listChoices = () => [...widget.querySelectorAll('.js-prefixMenuChoice, .menu-linkRow, [data-prefix-id], [data-prefix], [role="option"], li a, button')]
      .filter(node => rule.regex.test((node.innerText || node.textContent || node.getAttribute('data-prefix-name') || '').replace(/\s+/g, ' ').trim()));
    let choice = listChoices().find(isVisible);
    if (!choice) {
      const trigger = widget.querySelector('.js-prefixMenuTrigger, .menuTrigger, [data-xf-click~="menu"], button[aria-haspopup="true"], button, a');
      if (trigger && isVisible(trigger)) {
        try { trigger.click(); } catch {}
        await new Promise(resolve => setTimeout(resolve, 180));
        choice = listChoices().find(isVisible);
      }
    }
    if (!choice) return '';
    const label = (choice.innerText || choice.textContent || '').replace(/\s+/g, ' ').trim();
    try { choice.click(); } catch { return ''; }
    await new Promise(resolve => setTimeout(resolve, 1200));
    return label;
  }
  function getEditorTextForPrefixGuard(editor) {
    if (!editor) return '';
    return (editor instanceof HTMLTextAreaElement ? editor.value : (editor.innerText || editor.textContent || ''))
      .replace(/\u00a0/g, ' ').trim();
  }

  // Prefixes with a final verdict also update the thread's native open/closed state.
  // This uses XenForo's own thread-tools menu and confirmation form; it does not call private APIs.
  const THREAD_STATE_BY_PREFIX = {
    approve: true,
    reject: true,
    resolved: true,
    closed: true,
    open: false
  };
  const THREAD_ACTION_TEXT = {
    close: /(?:закрыть|закрыть\s+тему|закрыть\s+обсуждение|заблокировать\s+тему|lock\s+thread|close\s+thread|\block\b)/i,
    open: /(?:открыть\s+тему|открыть\s+обсуждение|разблокировать\s+тему|unlock\s+thread|open\s+thread|\bunlock\b)/i,
    pin: /(?:закрепить|прикрепить)\s*(?:тему|обсуждение)?|stick(?:\s+thread)?|pin(?:\s+thread)?/i,
    unpin: /(?:открепить|снять)\s*(?:закрепление|закреп|прикрепление|тему)?|unstick(?:\s+thread)?|unpin(?:\s+thread)?/i
  };
  const THREAD_ACTION_ROUTE = {
    close: /\/(?:lock|close)(?:\/|\?|$)/i,
    open: /\/(?:unlock|reopen|open)(?:\/|\?|$)/i,
    pin: /\/(?:quick[-_]?stick|quick[-_]?pin|stick|pin)(?:\/|\?|$)/i,
    unpin: /\/(?:quick[-_]?unstick|quick[-_]?unpin|unstick|unpin)(?:\/|\?|$)/i
  };
  const THREAD_ACTION_OPPOSITE = { close: 'open', open: 'close', pin: 'unpin', unpin: 'pin' };

  function threadActionInfo(node) {
    const label = [node.innerText, node.textContent, node.getAttribute('aria-label'), node.title, node.value]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    let href = node.getAttribute('href') || node.getAttribute('data-href') || node.getAttribute('data-url') || node.getAttribute('action') || '';
    try { const parsed = new URL(href, location.href); href = decodeURIComponent(parsed.pathname + parsed.search); } catch {}
    return { label, href };
  }

  function matchesThreadAction(node, action) {
    if (!isVisible(node)) return false;
    const info = threadActionInfo(node);
    const routeMatch = THREAD_ACTION_ROUTE[action].test(info.href);
    const textMatch = THREAD_ACTION_TEXT[action].test(info.label);
    const oppositeText = THREAD_ACTION_OPPOSITE[action] && THREAD_ACTION_TEXT[THREAD_ACTION_OPPOSITE[action]].test(info.label);
    if (routeMatch) return true;
    if (!textMatch || oppositeText) return false;
    return !!node.closest('.menu-content, .menu, .menu--structural, .js-threadTools, .threadTools, .thread-tools, .block-outer-opposite, .threadTools-menu, [role="menu"]');
  }

  function getThreadActionNodes(action) {
    return [...document.querySelectorAll('a[href], a[data-href], button, [role="menuitem"], input[type="submit"]')]
      .filter(node => matchesThreadAction(node, action));
  }

  async function revealThreadTools() {
    if (['close','open','pin','unpin'].some(action => getThreadActionNodes(action).length)) return true;
    const selectors = [
      '.js-threadTools .menuTrigger', '.js-threadTools [data-xf-click~="menu"]',
      '.threadTools .menuTrigger', '.threadTools [data-xf-click~="menu"]',
      '.thread-tools .menuTrigger', '.block-outer-opposite .menuTrigger',
      '.block-outer-opposite [data-xf-click~="menu"]'
    ];
    const toggles = [...new Set(selectors.flatMap(selector => [...document.querySelectorAll(selector)]))].filter(isVisible);
    for (const toggle of toggles.slice(0, 4)) {
      try { toggle.click(); } catch {}
      await new Promise(resolve => setTimeout(resolve, 180));
      if (['close','open','pin','unpin'].some(action => getThreadActionNodes(action).length)) return true;
    }
    return false;
  }

  function confirmationFormMatches(form, shouldClose) {
    const { label, href } = threadActionInfo(form);
    const closeSignal = THREAD_ACTION_ROUTE.close.test(href) || THREAD_ACTION_TEXT.close.test(label);
    const openSignal = THREAD_ACTION_ROUTE.open.test(href) || THREAD_ACTION_TEXT.open.test(label);
    return shouldClose ? closeSignal && !openSignal : openSignal && !closeSignal;
  }

  async function confirmNativeThreadAction(shouldClose, timeoutMs = 3500) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const forms = [...document.querySelectorAll('.overlay form, .overlay-container form, .js-overlay form, .modal form, form')]
        .filter(form => isVisible(form) && confirmationFormMatches(form, shouldClose));
      for (const form of forms) {
        const buttons = [...form.querySelectorAll('button[type="submit"], input[type="submit"], button.button--primary, .formSubmitRow button')]
          .filter(button => isVisible(button) && !/отмена|cancel|назад/i.test((button.textContent || button.value || '').trim()));
        if (!buttons.length) continue;
        const affirmative = buttons.find(button => /^(?:да|yes|подтвердить|закрыть(?:\s+тему)?|открыть(?:\s+тему)?|заблокировать(?:\s+тему)?|разблокировать(?:\s+тему)?|lock(?:\s+thread)?|unlock(?:\s+thread)?)$/i.test((button.textContent || button.value || '').replace(/\s+/g, ' ').trim()));
        const primary = buttons.find(button => button.matches('.button--primary'));
        const button = affirmative || primary || (buttons.length === 1 ? buttons[0] : null);
        if (!button) continue;
        button.click();
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 140));
    }
    return false;
  }

  async function waitForThreadState(shouldClose, timeoutMs = 3800) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      // On XenForo, an available Unlock action means the thread is currently locked;
      // an available Lock action means it is currently open.
      const revealed = await revealThreadTools();
      const closeActions = getThreadActionNodes('close');
      const openActions = getThreadActionNodes('open');
      if (shouldClose && openActions.length && !closeActions.length) return true;
      if (!shouldClose && closeActions.length && !openActions.length) return true;
      if (revealed && (closeActions.length || openActions.length)) {
        if (shouldClose && closeActions.length) return false;
        if (!shouldClose && openActions.length) return false;
      }
      await new Promise(resolve => setTimeout(resolve, 220));
    }
    return null;
  }

  async function applyThreadStateForPrefix(statusKey, statusNode) {
    if (!Object.prototype.hasOwnProperty.call(THREAD_STATE_BY_PREFIX, statusKey)) return { changed: false, message: 'Состояние темы не менялось.' };
    const shouldClose = THREAD_STATE_BY_PREFIX[statusKey];
    statusNode.textContent = shouldClose ? 'Префикс сохранён. Закрываю тему штатной командой форума…' : 'Префикс сохранён. Открываю тему штатной командой форума…';

    await revealThreadTools();
    const wanted = getThreadActionNodes(shouldClose ? 'close' : 'open');
    const opposite = getThreadActionNodes(shouldClose ? 'open' : 'close');
    if (!wanted.length) {
      if (opposite.length) return { changed: false, message: shouldClose ? 'Тема уже закрыта.' : 'Тема уже открыта.' };
      return { changed: false, message: 'Префикс сохранён, но команда управления статусом темы не найдена. Проверь права модератора и меню «Инструменты темы».' };
    }

    const action = wanted[0];
    try { action.click(); } catch (error) {
      return { changed: false, message: 'Префикс сохранён, но команда темы не нажалась: ' + (error?.message || String(error)) };
    }

    const confirmed = await confirmNativeThreadAction(shouldClose, 3500);
    if (!confirmed) {
      // Некоторые XenForo темы выполняют действие сразу без отдельного окна.
      const state = await waitForThreadState(shouldClose, 1800);
      if (state === true) return { changed: true, message: shouldClose ? 'Тема закрыта.' : 'Тема открыта.' };
      if (state === false) return { changed: false, message: 'Форум не изменил состояние темы. Проверь её меню и права на закрытие/открытие.' };
      return { changed: false, message: 'Форум открыл действие, но не показал распознаваемое подтверждение. Проверь появившееся окно и подтверди вручную.' };
    }

    const state = await waitForThreadState(shouldClose, 3800);
    if (state === true) return { changed: true, message: shouldClose ? 'Тема успешно закрыта.' : 'Тема успешно открыта.' };
    if (state === false) return { changed: false, message: 'Префикс сохранён, но форум не подтвердил изменение состояния темы.' };
    return { changed: false, message: 'Команда отправлена. Не удалось проверить новое состояние темы; обнови страницу и проверь значок замка.' };
  }


  async function runAdminThreadAction(action) {
    const labels = { open: 'открыть тему', close: 'закрыть тему', pin: 'закрепить тему', unpin: 'открепить тему' };
    const status = inPanel('va340-thread-action-status');
    if (!isThreadUrl()) { if (status) status.textContent = 'Открой конкретную тему форума. Действие выполняется только на странице темы.'; return; }
    const buttons = [...panel.querySelectorAll('[data-va-thread-action]')];
    buttons.forEach(button => { button.disabled = true; });
    try {
      await revealThreadTools();
      const wanted = getThreadActionNodes(action);
      const opposite = getThreadActionNodes(THREAD_ACTION_OPPOSITE[action]);
      if (!wanted.length) {
        if (opposite.length) { if (status) status.textContent = 'Тема уже в нужном состоянии: ' + labels[action] + ' не требуется.'; }
        else if (status) status.textContent = 'Не найдена штатная команда «' + labels[action] + '». Проверь меню инструментов и права аккаунта.';
        return;
      }
      wanted[0].click();
      if (action === 'open' || action === 'close') {
        const shouldClose = action === 'close';
        const confirmed = await confirmNativeThreadAction(shouldClose, 3500);
        const state = await waitForThreadState(shouldClose, confirmed ? 3800 : 1800);
        if (status) status.textContent = state === true ? 'Готово: тема ' + (shouldClose ? 'закрыта.' : 'открыта.') : state === false ? 'Форум не подтвердил изменение. Проверь права и состояние темы.' : 'Команда нажата, но результат не удалось проверить. Проверь окно подтверждения.';
      } else {
        const oppositeAction = THREAD_ACTION_OPPOSITE[action], deadline = Date.now() + 3500;
        let changed = false;
        while (Date.now() < deadline) {
          await revealThreadTools();
          if (getThreadActionNodes(oppositeAction).length && !getThreadActionNodes(action).length) { changed = true; break; }
          await new Promise(resolve => setTimeout(resolve, 180));
        }
        if (status) status.textContent = changed ? 'Готово: тема ' + (action === 'pin' ? 'закреплена.' : 'откреплена.') : 'Команда отправлена, но состояние закрепления не удалось проверить. Обнови тему и проверь.';
      }
    } catch (error) {
      if (status) status.textContent = 'Ошибка: ' + (error?.message || String(error));
      console.warn('[Vladimir Admin Console] Ошибка управления темой:', error);
    } finally { buttons.forEach(button => { button.disabled = false; }); }
  }

  async function updateThreadPrefix(statusKey) {
    const statusNode = inPanel('va340-prefix-status');
    const status = STATUS_PREFIX_RULES[statusKey];
    if (!status || !statusNode) return;
    const replyEditor = findReplyEditor();
    if (replyEditor && getEditorTextForPrefixGuard(replyEditor)) {
      statusNode.textContent = 'В редакторе уже есть текст ответа. Чтобы его не потерять, сначала выбери префикс, затем вставь шаблон. Префикс не изменён.';
      return;
    }
    if (!isThreadUrl()) {
      statusNode.textContent = 'Сначала открой конкретную тему, которой нужно изменить префикс, затем нажми кнопку ещё раз.';
      return;
    }
    statusNode.textContent = 'Открываю редактор темы и ищу префикс «' + status.label + '»…';
    try {
      let editor = findPrefixEditor();
      if (!editor) {
        let link = findThreadEditOverlayLink();
        if (!link) {
          const toggles = [...document.querySelectorAll('.js-threadTools .menuTrigger, .js-threadTools [data-xf-click~="menu"], .threadTools .menuTrigger, .block-outer-opposite .menuTrigger, .block-outer-opposite [data-xf-click~="menu"]')].filter(isVisible);
          for (const toggle of toggles.slice(0, 3)) {
            try { toggle.click(); } catch {}
            await new Promise(resolve => setTimeout(resolve, 160));
            link = findThreadEditOverlayLink();
            if (link) break;
          }
        }
        if (link) { try { link.click(); } catch {} }
        editor = await waitForPrefixEditor(6500);
      }
      if (!editor) {
        statusNode.textContent = 'Редактор не обнаружен. Открой меню темы → «Редактировать тему» вручную. Если пункта нет, аккаунту может не хватать прав.';
        return;
      }
      let chosenLabel = await choosePrefixFromMenu(editor.widget, statusKey);
      const option = detectPrefixOption(editor.select, statusKey);
      if (!chosenLabel && editor.select && option) {
        editor.select.value = option.value;
        editor.select.dispatchEvent(new Event('input', { bubbles: true }));
        editor.select.dispatchEvent(new Event('change', { bubbles: true }));
        editor.select.dispatchEvent(new Event('blur', { bubbles: true }));
        try { if (window.XF?.PrefixMenu?.selectPrefix) window.XF.PrefixMenu.selectPrefix(Number(option.value)); } catch {}
        chosenLabel = (option.textContent || '').trim();
      }
      if (!chosenLabel) {
        const names = editor.select?.options ? [...editor.select.options].map(o => (o.textContent || '').trim()).filter(Boolean) : [];
        statusNode.textContent = 'Не нашёл префикс «' + status.label + '». Доступные варианты: ' + (names.join(' · ') || 'редактор не показывает список');
        return;
      }
      const form = editor.form;
      const buttons = [...form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type]), .button--primary, .formSubmitRow button')].filter(button => !button.disabled && isVisible(button));
      const saveButton = buttons.find(button => /сохранить|save|изменить|редактировать|update|обновить/i.test((button.textContent || button.value || button.getAttribute('aria-label') || '').trim())) || buttons.find(button => button.matches('.button--primary, .formSubmitRow button'));
      if (!saveButton) {
        statusNode.textContent = 'Префикс «' + chosenLabel + '» выбран. Не нашёл кнопку сохранения — нажми «Сохранить» в редакторе вручную.';
        logActivity('Префикс выбран: ' + chosenLabel + ' · ждёт сохранения');
        return;
      }
      statusNode.textContent = 'Префикс «' + chosenLabel + '» выбран; нажимаю штатное сохранение…';
      saveButton.click();
      logActivity('Префикс выбран: ' + chosenLabel);
      const saveDeadline = Date.now() + 7000;
      while (Date.now() < saveDeadline) {
        const pendingEditor = findPrefixEditor();
        if (!pendingEditor || !isVisible(pendingEditor.form)) break;
        await new Promise(resolve => setTimeout(resolve, 180));
      }
      const stillVisibleEditor = findPrefixEditor();
      if (stillVisibleEditor && isVisible(stillVisibleEditor.form)) {
        statusNode.textContent = 'Префикс «' + chosenLabel + '» выбран, но редактор темы остался открыт. Сначала заверши сохранение вручную; изменение статуса темы не запускалось.';
        return;
      }
      const threadStateResult = await applyThreadStateForPrefix(statusKey, statusNode);
      const stateSuffix = threadStateResult?.message ? ' ' + threadStateResult.message : '';
      statusNode.textContent = 'Префикс «' + chosenLabel + '» сохранён.' + stateSuffix + ' Шаблоны ответа не изменяются.';
      logActivity('Префикс сохранён: ' + chosenLabel + (threadStateResult?.message ? ' · ' + threadStateResult.message : ''));
    } catch (error) {
      console.error('[Vladimir Console 4.7.3] Prefix error:', error);
      statusNode.textContent = 'Ошибка префикса: ' + (error?.message || String(error)) + '. Для подробностей открой F12 → Console.';
    }
  }

  let activityLog = [];
  try {
    const parsed = JSON.parse(safeGet(KEYS.activity) || '[]');
    if (Array.isArray(parsed)) activityLog = parsed.slice(0, 40);
  } catch { activityLog = []; }

  function renderActivityLog() {
    const feed = inPanel('va330-log-feed');
    if (!feed) return;
    feed.replaceChildren();
    if (!activityLog.length) {
      const empty = document.createElement('div');
      empty.className = 'va-local-note';
      empty.textContent = 'Пока действий нет.';
      feed.appendChild(empty);
      return;
    }
    activityLog.slice(0, 12).forEach(item => {
      const row = document.createElement('div');
      row.className = 'va-log-row';
      const label = document.createElement('strong');
      label.textContent = item.label || 'Действие';
      const time = document.createElement('span');
      time.textContent = new Date(item.time).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      row.append(label, time);
      feed.appendChild(row);
    });
  }

  function logActivity(label) {
    activityLog.unshift({ label, time: Date.now() });
    activityLog = activityLog.slice(0, 40);
    safeSet(KEYS.activity, JSON.stringify(activityLog));
    renderActivityLog();
  }

  function currentReplyValues() {
    let name = inPanel('va330-name').value.trim();
    if (!name) {
      name = (window.prompt('Введи ник пользователя для ответа:') || '').trim();
      if (!name) return null;
      inPanel('va330-name').value = name;
      settings.replyName = name;
      saveSettings();
    }
    const reason = inPanel('va330-reason').value.trim();
    settings.replyName = inPanel('va330-name').value.trim();
    settings.replyReason = reason;
    saveSettings();
    return { name, reason };
  }

  function buildReply(templateId, name, reason) {
    const reasonFallbacks = {
      approve: 'нарушение правил сервера',
      'reject-player': 'не соблюдены требования к подаче жалобы',
      'reject-leader': '',
      'reject-leader-format': 'нарушены требования к оформлению жалобы на лидера',
      'reject-format': 'нарушены требования к оформлению жалобы',
      'reject-evidence': 'в материалах жалобы недостаточно доказательств',
      resolved: 'вопрос рассмотрен и решён',
      transfer: 'указанное нарушение',
      evidence: 'необходимо дополнить материалы жалобы'
    };
    reason = reason || reasonFallbacks[templateId] || 'нарушение правил сервера';
    const thanks = 'Спасибо за обращение, приятной игры на нашем сервере.';
    const templates = {
      approve: {
        label: 'Жалоба одобрена',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вердикт: ДОБРО. Ваша жалоба одобрена, игрок будет наказан за ' + reason + '.', '#45d6a1', true],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },
      'reject-player': {
        label: 'Отказ по жалобе на игрока',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вердикт: ОТКАЗ. Ваша жалоба отклонена. Причина: ' + reason + '.', '#ff8296', true],
          ['LINK:Правила подачи жалоб|https://forum.matrp.ru/index.php?threads/pravila-podaci-zaloby.66297/', '#f0c674', false],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },
      'reject-leader': {
        label: 'Отказ по жалобе на лидера',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вердикт: ОТКАЗ. Ваша жалоба на лидера отклонена. Причина отказа: ' + (reason || '____________________') + '.', '#ff8296', true],
          ['LINK:Правила подачи жалоб на лидеров|https://forum.matrp.ru/index.php?threads/pravila-podaci-zaloby-na-liderov.3333380/', '#f0c674', false],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },      resolved: {
        label: 'Жалоба решена',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вердикт: РЕШЕНО. Ваша жалоба рассмотрена. Итоговое решение: ' + reason + '.', '#60b5ff', true],
          ['Тема отмечена как решённая.', '#45d6a1', false],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },
      transfer: {
        label: 'Передача главному администратору',
        blocks: [
          ['Приветствую, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вы были наказаны за ' + reason + '.', '#45d6a1', true],
          ['', '#b99aff', false],
          ['Передам жалобу главному администратору, ожидайте вердикта по жалобе.', '#f0c674', true],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },
      'reject-format': {
        label: 'Отказ · не по форме',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вердикт: ОТКАЗ. Ваша жалоба отклонена, поскольку она оформлена не по правилам подачи жалоб.', '#ff8296', true],
          ['LINK:Правила подачи жалоб|https://forum.matrp.ru/index.php?threads/pravila-podaci-zaloby.66297/', '#f0c674', false],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },
      'reject-leader-format': {
        label: 'Отказ по жалобе на лидера · не по форме',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вердикт: ОТКАЗ. Ваша жалоба на лидера отклонена, поскольку она оформлена не по правилам подачи жалоб на лидеров.', '#ff8296', true],
          ['LINK:Правила подачи жалоб на лидеров|https://forum.matrp.ru/index.php?threads/pravila-podaci-zaloby-na-liderov.3333380/', '#f0c674', false],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },
      'reject-evidence': {
        label: 'Отказ · недостаточно доказательств',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Вердикт: ОТКАЗ. Ваша жалоба отклонена из-за недостаточности доказательств.', '#ff8296', true],
          ['Причина: ' + reason + '.', '#f0c674', false],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      },
      evidence: {
        label: 'Запрос дополнительных доказательств',
        blocks: [
          ['Здравствуйте, уважаемый(ая) ' + name, '#b99aff', true],
          ['', '#b99aff', false],
          ['Для продолжения рассмотрения жалобы необходимо предоставить дополнительные доказательства: ' + reason + '.', '#f0c674', true],
          ['После дополнения темы администрация сможет вернуться к рассмотрению обращения.', '#60b5ff', false],
          ['', '#b99aff', false],
          ['━━━━━━━━━━━━━━━━━━━━', '#d6b36a', true],
          ['', '#b99aff', false],
          [thanks, '#8db6ff', false]
        ]
      }
    };
    return templates[templateId] || null;
  }

  function blocksToBBCode(blocks) {
    return '[CENTER]' + blocks.map(([text, color, bold]) => {
      if (!text) return '';
      if (text.startsWith('LINK:')) {
        const parts = text.slice(5).split('|');
        return '[COLOR=' + color + '][URL=' + (parts[1] || '') + ']' + (parts[0] || 'Правила') + '[/URL][/COLOR]';
      }
      const safe = text.replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
      return '[COLOR=' + color + ']' + (bold ? '[B]' + safe + '[/B]' : safe) + '[/COLOR]';
    }).join('\n\n') + '[/CENTER]';
  }

  function makeRichFragment(blocks) {
    const frag = document.createDocumentFragment();
    blocks.forEach(([text, color, bold]) => {
      const p = document.createElement('p');
      if (!text) {
        p.appendChild(document.createElement('br'));
      } else {
        const span = document.createElement('span');
        span.style.color = color;
        if (text.startsWith('LINK:')) {
          const parts = text.slice(5).split('|');
          const a = document.createElement('a');
          a.href = parts[1] || '#';
          a.textContent = parts[0] || 'Правила';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.style.color = color;
          span.appendChild(a);
        } else span.textContent = text;
        if (bold) {
          const strong = document.createElement('strong');
          strong.appendChild(span);
          p.appendChild(strong);
        } else p.appendChild(span);
      }
      frag.appendChild(p);
    });
    return frag;
  }

  let lastReplyEditor = null;
  let lastReplyRange = null;
  function isReplyEditor(node) {
    if (!(node instanceof HTMLElement) || panel.contains(node) || auth.contains(node)) return false;
    if (node.matches('textarea')) return /message|reply|post|message_html/i.test((node.name || '') + ' ' + (node.id || '') + ' ' + (node.className || ''));
    return node.isContentEditable || node.getAttribute('contenteditable') === 'true';
  }
  function isVisible(node) {
    if (!node?.isConnected) return false;
    const style = getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0;
  }
  function rememberReplyEditor(node) {
    if (isReplyEditor(node) && isVisible(node)) lastReplyEditor = node;
  }
  function rememberReplySelection() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
    const editor = element?.closest?.('[contenteditable="true"]');
    if (editor && isReplyEditor(editor) && !panel.contains(editor) && isVisible(editor)) {
      lastReplyEditor = editor;
      lastReplyRange = range.cloneRange();
    }
  }
  document.addEventListener('focusin', event => rememberReplyEditor(event.target), true);
  document.addEventListener('pointerup', rememberReplySelection, true);
  document.addEventListener('keyup', rememberReplySelection, true);
  document.addEventListener('selectionchange', rememberReplySelection, true);

  function findReplyEditor() {
    if (isReplyEditor(lastReplyEditor) && isVisible(lastReplyEditor)) return lastReplyEditor;
    const rich = [...document.querySelectorAll('.fr-element.fr-view[contenteditable="true"], [contenteditable="true"]')]
      .filter(node => isReplyEditor(node) && isVisible(node));
    if (rich.length) { lastReplyEditor = rich[rich.length - 1]; return lastReplyEditor; }
    const textareas = [...document.querySelectorAll('textarea')].filter(node => isReplyEditor(node) && isVisible(node));
    if (textareas.length) { lastReplyEditor = textareas[textareas.length - 1]; return lastReplyEditor; }
    return null;
  }

  function insertReplyIntoEditor(blocks, label) {
    const editor = findReplyEditor();
    const bbcode = blocksToBBCode(blocks);
    if (!editor) {
      copyText(bbcode);
      inPanel('va330-reply-status').textContent = 'Редактор не найден — BBCode скопирован. Открой ответ в теме и вставь Ctrl+V.';
      logActivity(label + ' · скопировано');
      return;
    }
    try {
      if (editor instanceof HTMLTextAreaElement) {
        const start = Number.isInteger(editor.selectionStart) ? editor.selectionStart : editor.value.length;
        const end = Number.isInteger(editor.selectionEnd) ? editor.selectionEnd : start;
        const prefix = start > 0 && editor.value[start - 1] !== '\n' ? '\n\n' : '';
        editor.setRangeText(prefix + bbcode + '\n\n', start, end, 'end');
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        editor.focus();
      } else {
        editor.focus();
        let range = null;
        if (lastReplyRange && editor.contains(lastReplyRange.commonAncestorContainer)) range = lastReplyRange.cloneRange();
        if (!range) {
          range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
        }
        range.deleteContents();
        const frag = makeRichFragment(blocks);
        const last = frag.lastChild;
        range.insertNode(frag);
        if (last) {
          range.setStartAfter(last);
          range.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: null }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      }
      inPanel('va330-reply-status').textContent = 'Ответ «' + label + '» добавлен в редактор. Проверь текст перед отправкой.';
      logActivity(label + ' · вставлено');
    } catch (error) {
      console.warn('[Vladimir Console 4.7.3] Не удалось вставить форматированный ответ:', error);
      copyText(bbcode);
      inPanel('va330-reply-status').textContent = 'Автовставка не сработала — BBCode скопирован, вставь Ctrl+V.';
      logActivity(label + ' · скопировано');
    }
  }

  inPanel('va330-name').value = settings.replyName || '';
  inPanel('va330-reason').value = settings.replyReason || '';
  inPanel('va330-name').addEventListener('change', () => { settings.replyName = inPanel('va330-name').value.trim(); saveSettings(); });
  inPanel('va330-reason').addEventListener('change', () => { settings.replyReason = inPanel('va330-reason').value.trim(); saveSettings(); });
  panel.querySelectorAll('[data-va-template]').forEach(button => {
    button.addEventListener('click', () => {
      const values = currentReplyValues();
      if (!values) { inPanel('va330-reply-status').textContent = 'Вставка отменена: ник не указан.'; return; }
      const templateId = button.dataset.vaTemplate;
      const reply = buildReply(templateId, values.name, values.reason);
      if (!reply) return;
      insertReplyIntoEditor(reply.blocks, reply.label);
      inPanel('va330-reply-status').textContent = 'Ответ «' + reply.label + '» добавлен. Префикс не менялся — выбери его отдельно, когда текст ответа уже готов.';
    });
  });
  panel.querySelectorAll('[data-va-thread-action]').forEach(button => button.addEventListener('click', () => runAdminThreadAction(button.dataset.vaThreadAction)));
  panel.querySelectorAll('[data-va-prefix-action]').forEach(button => {
    button.addEventListener('click', () => updateThreadPrefix(button.dataset.vaPrefixAction));
  });
  inPanel('va340-open-editor').addEventListener('click', async () => {
    const statusNode = inPanel('va340-prefix-status');
    if (!isThreadUrl()) { statusNode.textContent = 'Сначала открой конкретную тему форума.'; return; }
    statusNode.textContent = 'Ищу редактор темы…';
    try {
      let link = findThreadEditOverlayLink();
      if (!link) {
        const toggles = [...document.querySelectorAll('.js-threadTools .menuTrigger, .js-threadTools [data-xf-click~="menu"], .threadTools .menuTrigger, .block-outer-opposite .menuTrigger, .block-outer-opposite [data-xf-click~="menu"]')].filter(isVisible);
        for (const toggle of toggles.slice(0, 3)) {
          try { toggle.click(); } catch {}
          await new Promise(resolve => setTimeout(resolve, 180));
          link = findThreadEditOverlayLink();
          if (link) break;
        }
      }
      if (link) { link.click(); statusNode.textContent = 'Открываю штатный редактор. Когда он появится, выбери нужный префикс выше.'; }
      else statusNode.textContent = 'Не нашёл кнопку редактирования в текущей теме. Открой меню темы вручную → «Редактировать тему». Возможно, нужны права.';
    } catch (error) { statusNode.textContent = 'Не получилось открыть редактор: ' + (error?.message || String(error)); }
  });
  inPanel('va340-prefix-diagnose').addEventListener('click', () => {
    const candidates = [...document.querySelectorAll('select[name="prefix_id"], select[name="prefix_id[]"], select.js-prefixSelect')];
    const editForms = candidates.filter(select => {
      const form = select.closest('form');
      return !!form && (form.closest('.overlay, .overlay-container, .modal') || form.querySelector('input[name="title"], input[name="thread_title"]') || /edit/i.test(form.getAttribute('action') || ''));
    });
    const names = editForms[0] ? [...editForms[0].options].map(o => (o.textContent || '').trim()).filter(Boolean) : [];
    inPanel('va340-prefix-status').textContent = 'Тема: ' + (isThreadUrl() ? 'распознана' : 'не распознана') + ' · селектов prefix_id: ' + candidates.length + ' · редакторных селектов: ' + editForms.length + ' · варианты: ' + (names.join(' / ') || 'не найдены');
    console.info('[Vladimir Console 4.7.3] Prefix diagnostic', { href: location.href, candidates, editForms, options: names });
  });
  inPanel('va340-scan').addEventListener('click', scanSlaTopics);
  inPanel('va340-current').addEventListener('click', inspectCurrentThread);
  renderActivityLog();
  inPanel('va330-clear-log').addEventListener('click', () => {
    if (!confirm('Очистить личный журнал действий?')) return;
    activityLog = [];
    safeRemove(KEYS.activity);
    renderActivityLog();
    setStatus('Личный журнал очищен.');
  });
  inPanel('va330-export-log').addEventListener('click', () => {
    const text = activityLog.map(item => new Date(item.time).toLocaleString('ru-RU') + ' — ' + item.label).join('\n') || 'Журнал пуст.';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'Vladimir_Atelier_Activity_Log.txt';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    setStatus('Журнал экспортирован в TXT.');
  });
  inPanel('va320-notes').value = settings.notes;

  inPanel('va340-export-access').addEventListener('click', () => {
    const raw = safeGet(KEYS.password);
    if (!raw) { inPanel('va340-access-status').textContent = 'Мастер-пароль ещё не создан. Нажми кнопку панели и пройди первичную настройку.'; return; }
    let record;
    try { record = JSON.parse(raw); } catch { record = null; }
    if (!record || record.method !== 'PBKDF2-SHA-256' || !record.salt || !record.hash) { inPanel('va340-access-status').textContent = 'Ключ доступа повреждён; сбрось и создай новый пароль.'; return; }
    const payload = { app: 'Vladimir Atelier Console', version: 1, method: record.method, iterations: record.iterations, salt: record.salt, hash: record.hash };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Vladimir_Atelier_Access_Key.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    inPanel('va340-access-status').textContent = 'Ключ экспортирован. Передай JSON и мастер-пароль доверенному человеку отдельно.';
  });
  inPanel('va340-import-access').addEventListener('click', () => inPanel('va340-access-file').click());
  inPanel('va340-access-file').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data?.app !== 'Vladimir Atelier Console' || data?.method !== 'PBKDF2-SHA-256' || typeof data.salt !== 'string' || typeof data.hash !== 'string' || !Number.isInteger(Number(data.iterations)) || Number(data.iterations) < 100000 || Number(data.iterations) > 1000000) throw new Error('Файл не похож на ключ доступа Atelier.');
      if (!confirm('Импортировать ключ доступа? Текущий пароль панели в этом браузере будет заменён.')) return;
      const record = { method: data.method, iterations: Number(data.iterations), salt: data.salt, hash: data.hash };
      // Validate base64 before storing.
      fromB64(record.salt); fromB64(record.hash);
      if (!safeSet(KEYS.password, JSON.stringify(record))) throw new Error('Не удалось сохранить ключ в localStorage.');
      clearSession();
      inPanel('va340-access-status').textContent = 'Ключ импортирован. Обнови страницу и войди мастер-паролем владельца ключа.';
    } catch (error) {
      inPanel('va340-access-status').textContent = error?.message || 'Не удалось импортировать ключ.';
    } finally { event.target.value = ''; }
  });
  inPanel('va320-save-notes').addEventListener('click', () => { settings.notes = inPanel('va320-notes').value; saveSettings(); setStatus('Заметки сохранены в этом браузере.'); });
  inPanel('va320-clear-notes').addEventListener('click', () => { inPanel('va320-notes').value = ''; settings.notes = ''; saveSettings(); setStatus('Заметки очищены.'); });
  inPanel('va320-theme').addEventListener('change', () => { settings.theme = inPanel('va320-theme').value; applyTheme(); saveSettings(); setStatus('Тема изменена.'); });
  inPanel('va320-accent').addEventListener('input', () => { settings.accent = inPanel('va320-accent').value; panel.style.setProperty('--va-accent', settings.accent); saveSettings(); });
  inPanel('va320-reset-style').addEventListener('click', () => { settings.theme = DEFAULTS.theme; settings.accent = DEFAULTS.accent; applyTheme(); saveSettings(); setStatus('Стандартное оформление восстановлено.'); });
  (function enableBottomResize() {
    const handle = inPanel('va320-resize');
    const body = inPanel('va320-body');
    if (!handle || !body || handle.dataset.ready === '1') return;
    handle.dataset.ready = '1';
    let startY = 0, startHeight = 0, didMove = false;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      startY = event.clientY;
      startHeight = panel.getBoundingClientRect().height;
      didMove = false;
      panel.classList.add('va-user-resized');
      panel.style.height = startHeight + 'px';
      const move = e => {
        if (Math.abs(e.clientY - startY) > 5) didMove = true;
        if (!didMove) return;
        const maxHeight = Math.max(180, window.innerHeight - Math.max(8, Number(settings.top) || 8) - 8);
        const nextHeight = Math.max(180, Math.min(maxHeight, startHeight + (e.clientY - startY)));
        panel.style.height = nextHeight + 'px';
        body.style.maxHeight = 'none';
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        if (!didMove) {
          settings.minimized = !settings.minimized;
          body.hidden = settings.minimized;
          inPanel('va320-min').textContent = settings.minimized ? '+' : '−';
          if (settings.minimized) {
            panel.classList.remove('va-user-resized');
            panel.style.height = '';
          }
        }
        if (didMove) settings.panelHeight = Math.round(panel.getBoundingClientRect().height);
        else if (settings.minimized) settings.panelHeight = 0;
        saveSettings();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up, { once: true });
    });
  })();
  inPanel('va320-min').addEventListener('click', () => { settings.minimized = !settings.minimized; inPanel('va320-body').hidden = settings.minimized; inPanel('va320-min').textContent = settings.minimized ? '+' : '−'; if (settings.minimized) { settings.panelHeight = Number(settings.panelHeight) || Math.round(panel.getBoundingClientRect().height); panel.classList.remove('va-user-resized'); panel.style.height = ''; } else if (settings.panelHeight >= 180) { panel.classList.add('va-user-resized'); panel.style.height = Math.min(settings.panelHeight, Math.max(180, window.innerHeight - settings.top - 8)) + 'px'; inPanel('va320-body').style.maxHeight = 'none'; } saveSettings(); });
  inPanel('va320-close').addEventListener('click', () => panel.classList.remove('va-show'));
  enablePanelDragging();
  window.addEventListener('resize', () => applyPanelPosition(true), { passive: true });
  window.addEventListener('pagehide', () => { saveSettings(); }, { capture: true });
  window.addEventListener('beforeunload', () => { saveSettings(); }, { capture: true });
  applyPanelPosition(false);
  launcher.addEventListener('click', launch);
  document.addEventListener('keydown', e => {
    if (e.altKey && e.key.toLowerCase() === 'm' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) { e.preventDefault(); launch(); }
  }, true);

  // Mount once at the document root. A lightweight observer watches only direct
  // children of <html>; it does not react to every forum message/DOM mutation.
  function mount() {
    const root = document.documentElement;
    if (!root) return false;
    if (!document.getElementById(IDS.style)) (document.head || root).appendChild(style);
    if (!document.getElementById(IDS.launcher)) root.appendChild(launcher);
    if (!document.getElementById(IDS.panel)) root.appendChild(panel);
    if (!document.getElementById(IDS.auth)) root.appendChild(auth);
    return true;
  }
  if (!mount()) {
    const readyObserver = new MutationObserver(() => {
      if (mount()) readyObserver.disconnect();
    });
    readyObserver.observe(document, { childList: true, subtree: true });
  }
  const rootMountObserver = new MutationObserver(records => {
    const removedKnownNode = records.some(record => [...record.removedNodes].some(node =>
      node.nodeType === 1 && (node.id === IDS.launcher || node.id === IDS.panel || node.id === IDS.auth)
    ));
    if (removedKnownNode) mount();
  });
  if (document.documentElement) rootMountObserver.observe(document.documentElement, { childList: true, subtree: false });

  // Initial full pass happens once. Later DOM changes are handled incrementally:
  // only newly inserted subtrees containing .username are inspected.
  decorateOwnerName(document);
  if (!ownerReferenceSnapshot && !location.href.toLowerCase().includes('egor_andyfy.155084')) {
    setStatus('Для настройки цвета открой профиль Egor_Andyfy вручную один раз, затем вернись в свой профиль. Образец сохранится локально.');
  }
  let decorateTimer = 0;
  const pendingDecorateRoots = new Set();
  const ownerObserver = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const relevant = '.username, [class*="username--style"], .message-userDetails, .memberHeader, .memberProfile, .memberHeader-banners, .userBanner';
        if (node.matches?.(relevant) || node.querySelector?.(relevant)) {
          const ownerContainer = node.closest?.('.message-userDetails, .memberHeader, .memberProfile, .memberHeader-main');
          pendingDecorateRoots.add(ownerContainer || node);
        }
      }
    }
    if (!pendingDecorateRoots.size || decorateTimer) return;
    decorateTimer = setTimeout(() => {
      decorateTimer = 0;
      const roots = [...pendingDecorateRoots];
      pendingDecorateRoots.clear();
      for (const root of roots) decorateOwnerName(root);
    }, 250);
  });
  if (document.body) ownerObserver.observe(document.body, { childList: true, subtree: true });
  if (currentForumUserId()) showPanel();
  try { sessionStorage.removeItem('vladimir_atelier_444_reply_draft'); } catch {}
  renderSlaFeed([...slaRows.values()], slaRows.size ? 'Восстановлены сохранённые результаты прошлых проверок. Просрочки показываются сверху.' : 'Открой раздел жалоб, Госс, Гетто или заявок — сроки появятся при прокрутке.');
  // Quiet mode: no automatic network scans on page load or in the background.
  // The user starts a scan explicitly from the panel; cached results prevent repeat fetches.
  if (isComplaintArea()) {
    startSlaLazyObserver();
    inPanel('va340-context-status').textContent = 'Раздел распознан. Сроки отображаются по мере прокрутки без дополнительных запросов; ручная проверка ответа доступна отдельно.';
    if (isThreadUrl() && document.querySelector('.message')) {
      inPanel('va340-current').disabled = false;
      inspectCurrentThread(); // Current loaded messages only; no network request.
    }
  } else {
    inPanel('va340-context-status').textContent = slaRows.size
      ? `Панель готова. Сохранено ${slaRows.size} ранее найденных тем; обновление данных запускается только вручную.`
      : 'Панель готова. Автоматические сетевые проверки отключены для снижения нагрузки.';
  }
  // Refresh countdown text in-place. No network request and no full card rebuild:
  // this cuts repeated layout/DOM work while preserving the 15-second SLA timer.
  let lastSummaryMinute = -1;
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    let trackedChanged = false;
    const answerTtl = Number(settings.cacheTtlMinutes) * 60 * 1000;
    for (const [href, item] of slaRows.entries()) {
      if (!isWithinSlaWindow(item.createdAt)) {
        slaRows.delete(href);
        trackedChanged = true;
        if (item.row) {
          item.row.classList.remove('va340-sla-row-overdue', 'va340-sla-row-near');
          item.row.querySelector('.va340-sla-chip')?.remove();
        }
      } else {
        // A staff-reply result expires with the configured cache TTL. After that,
        // show an unverified overdue state until the next scheduled check confirms it.
        if (typeof item.answered === 'boolean' && item.checkedAt && now - item.checkedAt > answerTtl) {
          item.answered = null;
          item.checked = false;
          item.checkedAt = 0;
          trackedChanged = true;
        }
        updateRowSlaVisual(item);
      }
    }
    if (trackedChanged) saveTrackedSlaItems();
    if (isThreadUrl()) updateCurrentThreadBadge();
    if (panel.classList.contains('va-show')) {
      refreshSlaFeedCountdowns(now);
      const minute = Math.floor(now / 60000);
      if (minute !== lastSummaryMinute) {
        lastSummaryMinute = minute;
        refreshSlaSummaryOnly([...slaRows.values()], now);
      }
    }
  }, SLA_REFRESH_MS);
})();

// === Matreshka RP Forum Atelier Theme (integrated) ===
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountWidget, { once: true });
  else mountWidget();
  const themeRepairObserver = new MutationObserver(() => {
    attachStyle();
    if (document.body && !document.getElementById(WIDGET_ID)) mountWidget();
    if (document.getElementById(STYLE_ID) && document.getElementById(WIDGET_ID)) themeRepairObserver.disconnect();
  });
  themeRepairObserver.observe(document.documentElement || document, { childList: true, subtree: true });
})();
