// ==UserScript==
// @name         Vladimir | Leader & Deputy Center
// @namespace    Vladimir_Sudarikov.MatreshkaTools
// @version      2.9.10
// @description  Leader/deputy SLA tracking with admin-console owner badge styling.
// @match        *://forum.matrp.ru/*
// @noframes
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/vladimir-ld.user.js
// @updateURL    https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/vladimir-ld.user.js
// ==/UserScript==

(() => {
  try {
  'use strict';

  // Quiet Mode: intentionally no fetch/XHR, polling, auto-refresh, cache purge, or scripted forum clicks.
  const APP_ID = 'vladimir-leader-deputy-center-v2';
  const OWNER_LOG_TITLE = 'Ст. специалист по обработке логов';
  const PROFILE_DISPLAY_NAMES = Object.freeze({
    'lorenzo_refllonez': 'Lorenzo Крутой'
  });
  const getLocalProfileDisplayName = name => PROFILE_DISPLAY_NAMES[name.trim().replace(/^@/, '').toLocaleLowerCase()] || '';
  const SESSION_KEY = 'vldc_v2_authenticated_role'; // legacy session key
  const PERSISTENT_ROLE_KEY = 'vldc_v2_remembered_role'; // legacy key; no longer used to restore a role across different forum accounts
  const ACCOUNT_ROLE_KEY_PREFIX = 'vldc_v2_role_forum_user_';
  const ACCOUNT_ROLE_BY_ID = Object.freeze({
    // Leaders (LD) — XenForo member IDs from the supplied roster.
    '337247': 'leader', // Slaughter_Luxorize
    '61846': 'leader',  // diablo_morris
    '665168': 'leader', // leonid_moonless
    '395998': 'leader', // hamilton_hill
    '710153': 'leader', // damir_ulyanov
    '209918': 'leader', // hassbula_macalister
    '233306': 'leader', // johnny_heinz
    // Deputies — XenForo member IDs from the supplied roster.
    '760431': 'deputy', // _egor_klimov_
    '604565': 'deputy', // timofi_mounless
    '743229': 'deputy', // artem_chmelev
    '507995': 'deputy', // ilya_requzsex
    '649359': 'deputy', // eva_kuzmina
    '631650': 'deputy', // artem_huligans
    '513640': 'deputy', // denzel_pistoletov
    '217195': 'deputy', // alexander_respix
    '479415': 'deputy', // marik_marlborov
    '722676': 'deputy', // vova_voronov
    '281259': 'deputy', // angel_rogalev
    '594678': 'deputy', // gleb_volckov
    '587600': 'deputy', // mihail-zel
    '532291': 'leader', // konon_petrov — лидер МЧС
    '742975': 'deputy', // romka_kapterov
    '740394': 'deputy', // romka_kaiashnikov
    '65921': 'deputy', // timka_legendary (Timka_Escobar, Army deputy)
    // OPG leaders
    '390109': 'leader', // anatoly_white (Anatoly_White, Offniki)
    '124513': 'leader', // ramil_pupkin (Amoasador_Dipseyz, Tambovskoe)
    '664364': 'leader', // reyd_washington (Reyd_Washington, Kavkazskoe)
    // OPG deputies
    '691279': 'deputy', // miki-ivanov (Miki_Ivanov, Offniki)
    '438781': 'deputy', // evelon_manti (Denis_Finka, Offniki)
    '673256': 'deputy', // makitosha (Makitosha_Hamashima, Offniki)
    '32310': 'deputy',  // kashiro_nakamoto (Valentin_Budeyko, Tambovskoe)
    '162606': 'deputy', // blake-wengallbi (Lawden_Suarez, Tambovskoe)
    '682314': 'deputy', // kiyoshu_murakami (Kiyoshi_Murakami, Kavkazskoe)
    '233691': 'deputy', // harison_izumchanskiy (Harison_Izumchanskiy, Kavkazskoe)
    '829310': 'deputy', // uragan_kaizer (Aleksander_Kaizeer, Kavkazskoe)
    '341059': 'observer' // vladimir_sudarikov (Vladimir Sudarikov, observer)
  });
  const LAST_TAB_KEY = 'vldc_v2_last_tab';
  const PANEL_LAYOUT_KEY = 'vldc_v2_panel_layout';
  const PANEL_OPEN_KEY = 'vldc_v2_panel_open';
  const REVIEWED_THREADS_KEY = 'vldc_v2_reviewed_threads';
  const DEFAULT_PANEL_TOP = 12;
  const DEFAULT_PANEL_WIDTH = 410;
  const DEFAULT_PANEL_HEIGHT = 760;
  const getSavedPanelLayout = () => {
    const defaultLeft = Math.max(8, window.innerWidth - DEFAULT_PANEL_WIDTH - 16);
    const defaults = {
      top: DEFAULT_PANEL_TOP,
      left: defaultLeft,
      width: DEFAULT_PANEL_WIDTH,
      height: DEFAULT_PANEL_HEIGHT
    };

    try {
      const savedLayout = JSON.parse(localStorage.getItem(PANEL_LAYOUT_KEY) || '{}');
      return {
        top: Number.isFinite(savedLayout.top) ? savedLayout.top : defaults.top,
        left: Number.isFinite(savedLayout.left) ? savedLayout.left : defaults.left,
        width: Number.isFinite(savedLayout.width) ? savedLayout.width : defaults.width,
        height: Number.isFinite(savedLayout.height) ? savedLayout.height : defaults.height
      };
    } catch {
      return defaults;
    }
  };
  const getSavedPanelOpen = () => { try { return localStorage.getItem(PANEL_OPEN_KEY) === '1'; } catch { return false; } };
  if (window.top !== window.self) return;
  // Rebuild a stale panel left behind by an older or partially failed script run.
  const staleRoot = document.getElementById(APP_ID);
  if (staleRoot && staleRoot.parentNode) {
    staleRoot.parentNode.removeChild(staleRoot);
  }

  // Only salted PBKDF2 hashes are stored here; plaintext passwords are not embedded.
  // These are local UI gates, not forum permissions. XenForo remains authoritative.
  const ACCESS = {
    leader: {
      label: 'Лидер (ЛД)',
      salt: 'KGgHuNbuQaA9/slQArX9Ng==',
      hash: 'Rvlpwo63wUev0/KhF92+pUHPZ1tedFK8eqbhaZE9KCw='
    },
    deputy: {
      label: 'Заместитель',
      salt: 'C4FhMoTKQZaC09tisVDIcA==',
      hash: 'rPU8/sdmCJrvt9ME74210giYTthE7sLyvjBjkhCmoNU='
    },
    observer: {
      label: 'Следящий',
      salt: 'hWG9Ch9soJZ9J3TJzGVV6g==',
      hash: 'eqZb9qhi9/L9iDdiE/cYFUALZzkOXiq1aYG+/+xWKzc='
    }
  };
  const PBKDF2_ITERATIONS = 310000;

  const LINKS = [
    {
      group: 'ОБЩИЕ ТЕМЫ',
      note: 'Общие для лидерского состава',
      items: [
        ['Действующие лидеры', 'Актуальный состав руководителей', 'https://forum.matrp.ru/index.php?threads/matreska-30-dejstvuusie-lidery-servera.1961070/'],
        ['Заявления на неактив', 'Общие заявления лидеров на неактив', 'https://forum.matrp.ru/index.php?threads/matreska-30-zaavlenie-na-neaktiv-dla-liderov.1970623/']
      ]
    },
    {
      group: 'ГОСУДАРСТВЕННЫЕ СТРУКТУРЫ',
      note: 'Отчётность и организационные процедуры гос. организаций',
      items: [
        ['Ежедневные отчёты лидеров', 'Ежедневная отчётность государственных структур', 'https://forum.matrp.ru/index.php?threads/matreska-30-ezednevnye-otcety-liderov-gosudarstvennyh-struktur.1971211/unread'],
        ['Еженедельная отчётность госс', 'Отчёты лидеров государственных организаций', 'https://forum.matrp.ru/index.php?threads/matreska-30-ezenedelnaa-otcetnost-liderov-gosudarstvennyh-organizacij.1971086/'],
        ['Отчётность проведения рейда', 'Отчёты о проведённых рейдах', 'https://forum.matrp.ru/index.php?threads/matreska-30-otcetnost-o-provedenii-rejdov.2681507/'],
        ['Изменение префикса организаций', 'Префиксы в разделах организаций', 'https://forum.matrp.ru/index.php?threads/matreska-30-izmenenie-prefiksa-v-razdelah-organizacij.2591965/']
      ]
    },
    {
      group: 'ГЕТТО',
      note: 'Отчёты, префиксы и заморозки ОПГ',
      items: [
        ['Изменение префикса: открыто / закрыто', 'Изменение состояния тем в разделах', 'https://forum.matrp.ru/index.php?threads/matreska-30-izmenenie-prefiksa-v-razdelah-organizacij-otkryto-zakryto.2598281/unread'],
        ['Еженедельные отчёты гетто', 'Еженедельная отчётность лидеров гетто', 'https://forum.matrp.ru/index.php?threads/matreska-30-ezenedelnye-otcety-liderov.2369132/unread'],
        ['Заморозки ОПГ / снятие мороза', 'Заявления и учёт заморозок', 'https://forum.matrp.ru/index.php?threads/matreska-30-zamorozki-u-opg-snatie-moroza.2682004/']
      ]
    }
  ];

  const ROLE_TEMPLATES = {
    leader: [
      { title: '✔ Одобрить заявление', kind: 'good', text: '[COLOR=#D6B36A][B]✦ РЕШЕНИЕ ПО ЗАЯВЛЕНИЮ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВнимательно рассмотрел Ваше заявление и сообщаю итог:\n\n[COLOR=#35C98A][B]✔ ЗАЯВЛЕНИЕ ОДОБРЕНО[/B][/COLOR]\n\nЗаявление соответствует требованиям.\n\nБлагодарю за обращение и желаю успехов!\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '✖ Отказать в заявлении', kind: 'bad', text: '[COLOR=#D6B36A][B]✦ РЕШЕНИЕ ПО ЗАЯВЛЕНИЮ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВнимательно рассмотрел Ваше заявление. К сожалению, по итогам проверки принято следующее решение:\n\n[COLOR=#F2788D][B]✖ В ОДОБРЕНИИ ОТКАЗАНО[/B][/COLOR]\n\n[COLOR=#F4C3CB][B]Основание:[/B][/COLOR] {ПРИЧИНА}\n\nСпасибо за обращение.\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '✧ Вопрос решён', kind: 'info', text: '[COLOR=#D6B36A][B]✦ ИТОГ РАССМОТРЕНИЯ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВаше обращение внимательно рассмотрено.\n\n[COLOR=#70B7FF][B]✧ ВОПРОС РЕШЁН[/B][/COLOR]\n\nПо ситуации принято решение, необходимые действия выполнены.\n\nБлагодарю за терпение и обратную связь!\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '⌛ Принять в работу', kind: 'work', text: '[COLOR=#D6B36A][B]✦ ОБРАЩЕНИЕ ПРИНЯТО ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\n[COLOR=#B99BFF][B]⌛ ПРИНЯТО В РАБОТУ[/B][/COLOR]\n\nНачинаю проверку предоставленной информации. После рассмотрения материалов сообщу результат в этой теме.\n\nСпасибо за ожидание и понимание!\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '❔ Запросить уточнение', kind: 'warning', text: '[COLOR=#D6B36A][B]✦ НУЖНЫ ДОПОЛНИТЕЛЬНЫЕ СВЕДЕНИЯ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\n[COLOR=#F6C66A][B]❔ ПРОСЬБА УТОЧНИТЬ ИНФОРМАЦИЮ[/B][/COLOR]\n\nДля продолжения рассмотрения необходимо дополнить обращение:\n[COLOR=#FFE0A3]{ПРИЧИНА}[/COLOR]\n\nПожалуйста, оставьте уточнение в этой теме.\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' }
    ],
    deputy: [
      { title: '✔ Одобрить заявление', kind: 'good', text: '[COLOR=#D6B36A][B]✦ РЕШЕНИЕ ПО ЗАЯВЛЕНИЮ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВнимательно рассмотрел Ваше заявление и сообщаю итог:\n\n[COLOR=#35C98A][B]✔ ЗАЯВЛЕНИЕ ОДОБРЕНО[/B][/COLOR]\n\nЗаявление соответствует требованиям.\n\nБлагодарю за обращение и желаю успехов!\n\n[COLOR=#A99AC5]С уважением, состав руководства.[/COLOR]' },
      { title: '✖ Отказать в заявлении', kind: 'bad', text: '[COLOR=#D6B36A][B]✦ РЕШЕНИЕ ПО ЗАЯВЛЕНИЮ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВнимательно рассмотрел Ваше заявление. К сожалению, по итогам проверки принято следующее решение:\n\n[COLOR=#F2788D][B]✖ В ОДОБРЕНИИ ОТКАЗАНО[/B][/COLOR]\n\n[COLOR=#F4C3CB][B]Основание:[/B][/COLOR] {ПРИЧИНА}\n\nСпасибо за обращение.\n\n[COLOR=#A99AC5]С уважением, состав руководства.[/COLOR]' },
      { title: '✧ Вопрос решён', kind: 'info', text: '[COLOR=#D6B36A][B]✦ ИТОГ РАССМОТРЕНИЯ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВаше обращение внимательно рассмотрено.\n\n[COLOR=#70B7FF][B]✧ ВОПРОС РЕШЁН[/B][/COLOR]\n\nПо ситуации принято решение, необходимые действия выполнены.\n\nБлагодарю за терпение и обратную связь!\n\n[COLOR=#A99AC5]С уважением, состав руководства.[/COLOR]' },
      { title: '⌛ Принять в работу', kind: 'work', text: '[COLOR=#D6B36A][B]✦ ОБРАЩЕНИЕ ПРИНЯТО ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\n[COLOR=#B99BFF][B]⌛ ПРИНЯТО В РАБОТУ[/B][/COLOR]\n\nНачинаю проверку предоставленной информации. После рассмотрения материалов сообщу результат в этой теме.\n\nСпасибо за ожидание и понимание!\n\n[COLOR=#A99AC5]С уважением, состав руководства.[/COLOR]' },
      { title: '❔ Запросить уточнение', kind: 'warning', text: '[COLOR=#D6B36A][B]✦ НУЖНЫ ДОПОЛНИТЕЛЬНЫЕ СВЕДЕНИЯ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\n[COLOR=#F6C66A][B]❔ ПРОСЬБА УТОЧНИТЬ ИНФОРМАЦИЮ[/B][/COLOR]\n\nДля продолжения рассмотрения необходимо дополнить обращение:\n[COLOR=#FFE0A3]{ПРИЧИНА}[/COLOR]\n\nПожалуйста, оставьте уточнение в этой теме.\n\n[COLOR=#A99AC5]С уважением, состав руководства.[/COLOR]' }
    ]
  };

  const css = document.createElement('style');
  css.dataset.vldc2 = 'true';
  css.textContent = `
    #${APP_ID}, #${APP_ID} * { box-sizing:border-box; }
    .vldc-profile-display-name { color:#f472b6 !important; font-weight:800 !important; letter-spacing:.1px !important; text-shadow:0 0 10px #ec489944 !important; }
    .vldc-role-badge { display:inline-block; vertical-align:middle; width:max-content; max-width:min(180px,100%); margin:0 0 0 5px; padding:1px 6px; border:1px solid; border-radius:999px; font:800 8px/1.2 Inter,Segoe UI,Arial,sans-serif; letter-spacing:.35px; text-transform:uppercase; white-space:nowrap; text-align:center; box-shadow:0 1px 4px #0002; pointer-events:none; }
    .vldc-role-badge--leader { color:#ffe8b8; border-color:#d6ad5d99; background:linear-gradient(110deg,#9a6a25e8,#68431fe8); }
    .vldc-role-badge--developer { color:inherit; border-color:currentColor; background:transparent; box-shadow:none; }
    .vldc-role-badge--deputy { color:#dbeafe; border-color:#77a8e899; background:linear-gradient(110deg,#315a91ed,#483d82ed); }
    .vldc-role-badge--observer { color:#ffe0f2; border-color:#df83b899; background:linear-gradient(110deg,#8e356ced,#632f82ed); }
    #${APP_ID} { --vldc-top:12px; --vldc-left:calc(100vw - 426px); --vldc-width:410px; --vldc-height:760px; position:fixed; top:var(--vldc-top); left:var(--vldc-left); right:auto; bottom:auto; z-index:2147483000; color:#f8f3ff; font:13px/1.45 Inter,Segoe UI,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
    #${APP_ID} button, #${APP_ID} input, #${APP_ID} select { font:inherit; }
    #${APP_ID} .launch { position:fixed; right:16px; bottom:16px; left:auto; top:auto; z-index:2147483001; display:block; border:1px solid #80699a; border-radius:999px; padding:11px 16px; color:#fff; background:linear-gradient(115deg,#49306e 0%,#7650a4 38%,#a34f82 72%,#b87955 100%); box-shadow:0 6px 18px #160b2460; font-weight:800; cursor:pointer; }
    #${APP_ID} .panel { display:none; width:min(var(--vldc-width),calc(100vw - 16px)); height:min(var(--vldc-height),calc(100vh - var(--vldc-top) - 8px)); max-height:calc(100vh - var(--vldc-top) - 8px); overflow:hidden; flex-direction:column; min-height:0; border:1px solid #9778b8; border-radius:18px; background:radial-gradient(ellipse at 5% 0%,#65458a45,transparent 42%),radial-gradient(ellipse at 100% 100%,#a45b6a24,transparent 38%),linear-gradient(155deg,#1b1728fa,#30213df7); box-shadow:0 12px 34px #10081780; }
    #${APP_ID}.open .panel { display:flex; }
    #${APP_ID}.open .launch { display:none !important; }
    #${APP_ID} .head { display:flex; justify-content:space-between; align-items:center; padding:13px 14px; border-bottom:1px solid #ffffff18; background:linear-gradient(110deg,#76519a66,#3b91a433 52%,#d4a0612b); cursor:ns-resize; user-select:none; touch-action:none; }
    #${APP_ID} .brand { display:flex; align-items:center; gap:10px; min-width:0; }
    #${APP_ID} .mark { display:grid; place-items:center; width:36px; height:36px; border-radius:11px; color:#ffe4ac; background:linear-gradient(145deg,#6e54b5,#c45f91 58%,#d6a35e); font-size:19px; }
    #${APP_ID} .title { font-weight:850; letter-spacing:.5px; font-size:13px; color:#fff; }
    #${APP_ID} .sub { font-size:10px; color:#c8b9d7; }
    #${APP_ID} .head-actions { display:flex; gap:5px; flex:0 0 auto; }
    #${APP_ID} .head-actions .icon { flex:0 0 28px; }
    #${APP_ID} #workspace:not([hidden]) { display:flex; flex:1 1 auto; flex-direction:column; min-height:0; max-height:100%; }
    #${APP_ID} #login { flex:1 1 auto; min-height:0; max-height:100%; overflow:auto; }
    #${APP_ID} .icon { width:28px; height:28px; border:1px solid #ffffff24; border-radius:8px; color:#fff; background:#ffffff0e; cursor:pointer; }
    #${APP_ID} .tabs { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px; padding:9px 10px; border-bottom:1px solid #ffffff14; }
    #${APP_ID} .tab { padding:8px 3px; border:1px solid transparent; border-radius:8px; color:#c9bdd7; background:transparent; cursor:pointer; font-size:10px; font-weight:750; }
    #${APP_ID} .tab.active { color:#fff0ce; border-color:#e4be7e55; background:#be8f5728; }
    #${APP_ID} .topic-toolbar { margin:10px 10px 0; padding:10px; border:1px solid #e4be7e45; border-radius:12px; background:linear-gradient(135deg,#be8f5718,#ffffff08); }
    #${APP_ID} .topic-toolbar .section { margin:0 0 8px; }
    #${APP_ID} .topic-toolbar .action-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
    #${APP_ID} .topic-toolbar .action { min-height:38px; text-align:center; padding:8px 6px; }
    #${APP_ID} .topic-toolbar .action.open { border-color:#4fbd8c88; }
    #${APP_ID} .topic-toolbar .action.close { border-color:#e36b7a88; }
    #${APP_ID} .topic-toolbar .action.pin, #${APP_ID} .topic-toolbar .action.unpin { border-color:#a78be888; }
    #${APP_ID} .topic-toolbar .muted { margin-top:7px; line-height:1.4; }
    #${APP_ID} .content { padding:12px; overflow:auto; min-height:120px; flex:1 1 auto; overscroll-behavior:contain; }
    #${APP_ID} #workspace .content { min-height:120px; max-height:none; }
    #${APP_ID} .section { margin:3px 0 8px; color:#ffd58a; font-size:10px; font-weight:850; letter-spacing:.7px; text-transform:uppercase; }
    #${APP_ID} .note { margin:-3px 0 9px; color:#b9a9c8; font-size:10px; }
    #${APP_ID} .group { margin:0 0 12px; padding:10px; border:1px solid #9b78b52b; border-radius:12px; background:linear-gradient(135deg,#8b5cf610,#22c1c910 55%,#f0ab4b0a); }
    #${APP_ID} .link { display:flex; justify-content:space-between; align-items:center; gap:8px; margin:5px 0; padding:9px 10px; border:1px solid #ffffff20; border-left:3px solid #a78bfa; border-radius:9px; color:#fff; text-decoration:none; background:linear-gradient(100deg,#8b5cf616,#ffffff07 65%); }
    #${APP_ID} .link:hover { background:linear-gradient(100deg,#8b5cf633,#2dd4bf18); border-color:#d6b36a88; transform:translateX(2px); }
    #${APP_ID} .link small { display:block; margin-top:2px; color:#b9a9c8; font-size:10px; }
    #${APP_ID} .field { display:block; margin:8px 0; }
    #${APP_ID} .field span { display:block; margin-bottom:5px; color:#cfbfdc; font-size:10px; font-weight:700; }
    #${APP_ID} input, #${APP_ID} select { width:100%; padding:9px 10px; border:1px solid #ffffff25; border-radius:9px; outline:none; color:#fff; background:#120d1bee; }
    #${APP_ID} input:focus, #${APP_ID} select:focus { border-color:#d7b477; }
    #${APP_ID} select option { color:#fff; background:#211a2b; }
    #${APP_ID} .muted { color:#b9a9c8; font-size:10px; }
    #${APP_ID} .action-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    #${APP_ID} .action { padding:10px; text-align:left; border:1px solid #ffffff20; border-radius:10px; color:#fff; background:#ffffff09; cursor:pointer; font-weight:750; font-size:11px; }
    #${APP_ID} .action:hover { background:#ffffff16; }
    #${APP_ID} .action.good { border-color:#4fbd8c99; background:linear-gradient(135deg,#1d9a6d25,#ffffff08); } #${APP_ID} .action.bad { border-color:#e36b7a99; background:linear-gradient(135deg,#c2415b25,#ffffff08); } #${APP_ID} .action.info { border-color:#7a9ee899; background:linear-gradient(135deg,#3979c525,#ffffff08); }
    #${APP_ID} .action.work { border-color:#a78bfa99; background:linear-gradient(135deg,#8b5cf625,#ffffff08); } #${APP_ID} .action.warning { border-color:#f6c66a99; background:linear-gradient(135deg,#d69a2525,#ffffff08); }
    #${APP_ID} .action { transition:transform .14s ease,border-color .14s ease,background .14s ease; } #${APP_ID} .action:hover { transform:translateY(-1px); border-color:#ffffff70; }
    #${APP_ID} .primary { width:100%; padding:10px; border:1px solid #e4be7e66; border-radius:9px; color:#fff2d8; background:#be8f5730; cursor:pointer; font-weight:800; }
    #${APP_ID} .hint { padding:9px 10px; margin:8px 0; border:1px solid #ffffff18; border-radius:9px; color:#c4b4d1; background:#ffffff08; font-size:10px; }
    #${APP_ID} .footer { display:flex; flex:0 0 auto; justify-content:space-between; padding:9px 13px; border-top:1px solid #ffffff15; color:#9888a7; font-size:9px; }
    #${APP_ID} .resize-bottom { flex:0 0 12px; height:12px; cursor:ns-resize; touch-action:none; background:linear-gradient(transparent 4px,#bca1d866 4px,#bca1d866 6px,transparent 6px) center/42px 10px no-repeat; border-top:1px solid #ffffff12; }
    #${APP_ID} .error { min-height:15px; margin:6px 0; color:#ff9eaa; font-size:10px; }
    #${APP_ID} .toast { position:fixed; right:16px; top:70px; z-index:2147483001; max-width:min(360px,calc(100vw - 36px)); padding:10px 13px; border:1px solid #e8c88f55; border-radius:10px; color:#fff; background:#332546; box-shadow:0 5px 16px #0005; font:12px/1.4 Segoe UI,Arial,sans-serif; }
    @media(max-width:600px){
      #${APP_ID}{max-width:calc(100vw - 12px)}
      #${APP_ID} .launch{max-width:calc(100vw - 12px);min-height:46px;padding:12px 14px;font-size:12px;white-space:normal;touch-action:manipulation}
      #${APP_ID} .panel{width:min(var(--vldc-width),calc(100vw - 12px));height:min(var(--vldc-height),calc(100dvh - var(--vldc-top) - 8px));max-height:calc(100dvh - var(--vldc-top) - 8px);border-radius:14px}
      #${APP_ID} .head{min-height:56px;padding:8px 9px;gap:6px}
      #${APP_ID} .brand{gap:7px}
      #${APP_ID} .mark{width:32px;height:32px;border-radius:9px;font-size:17px}
      #${APP_ID} .title{font-size:12px;letter-spacing:.2px}
      #${APP_ID} .sub{font-size:9px;line-height:1.25}
      #${APP_ID} .head-actions{gap:3px}
      #${APP_ID} .head-actions .icon,#${APP_ID} .icon{width:40px;height:40px;min-width:40px;min-height:40px;flex-basis:40px;border-radius:10px;font-size:15px;touch-action:manipulation}
      #${APP_ID} .tabs{grid-template-columns:repeat(4,minmax(0,1fr));gap:3px;padding:6px 7px}
      #${APP_ID} .tab{min-height:42px;padding:9px 2px;font-size:10px;line-height:1.2;overflow-wrap:anywhere;touch-action:manipulation}
      #${APP_ID} .topic-toolbar{margin:7px 7px 0;padding:8px;border-radius:10px}
      #${APP_ID} .topic-toolbar .action-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      #${APP_ID} .topic-toolbar .action{min-height:44px;padding:8px 5px;font-size:11px;line-height:1.25;overflow-wrap:anywhere;touch-action:manipulation}
      #${APP_ID} .topic-toolbar .muted{max-height:3em;overflow:auto;font-size:9px}
      #${APP_ID} .content{min-height:0;padding:9px;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y}
      #${APP_ID} #login{min-height:0;padding-bottom:10px}
      #${APP_ID} .group{margin-bottom:9px;padding:8px}
      #${APP_ID} .link{min-height:44px;padding:10px 9px;gap:6px;overflow-wrap:anywhere;touch-action:manipulation}
      #${APP_ID} .link small{font-size:9px}
      #${APP_ID} .action-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      #${APP_ID} .action{min-height:44px;padding:9px 8px;font-size:12px;line-height:1.3;overflow-wrap:anywhere;touch-action:manipulation}
      #${APP_ID} .field{margin:7px 0}
      #${APP_ID} input,#${APP_ID} select{min-height:44px;padding:10px;font-size:16px}
      #${APP_ID} .primary{min-height:46px;padding:11px;font-size:13px;touch-action:manipulation}
      #${APP_ID} .hint{padding:8px;font-size:10px;line-height:1.4}
      #${APP_ID} .footer{flex-wrap:wrap;gap:5px 10px;padding:8px 10px;font-size:9px}
      #${APP_ID} .toast{top:max(58px,env(safe-area-inset-top));right:8px;max-width:calc(100vw - 16px);font-size:11px}
    }
    /* Selectable panel appearances */
    #${APP_ID}[data-theme="aurora"] .panel{border-color:#b99ad8;background:radial-gradient(ellipse at 5% 0%,#7955a955,transparent 43%),radial-gradient(ellipse at 100% 100%,#d06b8d30,transparent 40%),linear-gradient(155deg,#1b1728fa,#30213df7)}
    #${APP_ID}[data-theme="aurora"] .head{background:linear-gradient(110deg,#37244f,#48294d,#28334b)}
    #${APP_ID}[data-theme="obsidian"] .panel{border-color:#6b7280;background:radial-gradient(ellipse at 5% 0%,#4b556355,transparent 42%),linear-gradient(155deg,#101217fa,#242833f7)}
    #${APP_ID}[data-theme="obsidian"] .head{background:linear-gradient(110deg,#1b202a,#292d38)}
    #${APP_ID}[data-theme="pearl"] .panel{color:#29243a;background:radial-gradient(ellipse at 5% 0%,#d9c7ff88,transparent 44%),linear-gradient(155deg,#fbf9ff,#eeeaf7);border-color:#c4b5fd;box-shadow:0 18px 55px #1f123033}
    #${APP_ID}[data-theme="pearl"] .head{background:linear-gradient(110deg,#f1eaff,#fff5fb);border-bottom-color:#d8c8f0}
    #${APP_ID}[data-theme="pearl"] .title,#${APP_ID}[data-theme="pearl"] .section,#${APP_ID}[data-theme="pearl"] .field span{color:#33294a}
    #${APP_ID}[data-theme="pearl"] .sub,#${APP_ID}[data-theme="pearl"] .muted,#${APP_ID}[data-theme="pearl"] .hint{color:#625873}
    #${APP_ID}[data-theme="pearl"] .group,#${APP_ID}[data-theme="pearl"] .link,#${APP_ID}[data-theme="pearl"] .topic-toolbar{background:#ffffffb8;border-color:#d8d0e8;color:#322a42}
    #${APP_ID}[data-theme="pearl"] input,#${APP_ID}[data-theme="pearl"] select{background:#fff;color:#29243a;border-color:#d2c9e2}
    #${APP_ID}[data-theme="pearl"] .head-actions .icon{color:#3a2d50;border-color:#d6cce5;background:#fff8}
    #${APP_ID}[data-theme="forest"] .panel{border-color:#4e8e78;background:radial-gradient(ellipse at 5% 0%,#26765b55,transparent 42%),linear-gradient(155deg,#0c1a17fa,#19352cf7)}
    #${APP_ID}[data-theme="forest"] .head{background:linear-gradient(110deg,#12352b,#214c3d)}
    #${APP_ID}[data-theme="ocean"] .panel{border-color:#5ba9dc;background:radial-gradient(ellipse at 5% 0%,#1c79ad66,transparent 42%),radial-gradient(ellipse at 100% 100%,#4657b833,transparent 40%),linear-gradient(155deg,#0b1728fa,#142f49f7)}
    #${APP_ID}[data-theme="ocean"] .head{background:linear-gradient(110deg,#123a5b,#253d78)}
    #${APP_ID} .appearance-card{padding:10px;border:1px solid #a78bfa55;border-radius:12px;background:linear-gradient(120deg,#8b5cf618,#22c1bf0c);margin-bottom:10px}
    #${APP_ID} .appearance-card .field{margin:7px 0 0}
    #${APP_ID} .appearance-card select{width:100%;min-height:40px;padding:8px 10px;border:1px solid #9b83bb88;border-radius:9px;background:#211b2c;color:inherit}
    #${APP_ID}[data-theme="pearl"] .appearance-card select{background:#fff;color:#29243a}
    #${APP_ID} .appearance-note{font-size:10px;line-height:1.4;opacity:.78;margin-top:5px}
    @media(max-width:360px){
      #${APP_ID} .topic-toolbar .action{font-size:10px}
      #${APP_ID} .head-actions{gap:2px}
      #${APP_ID} .head-actions .icon{width:36px;height:38px;min-width:36px;min-height:38px;flex-basis:36px}
      #${APP_ID} .title{font-size:11px}
      #${APP_ID} .tabs{gap:2px;padding-left:4px;padding-right:4px}
      #${APP_ID} .tab{font-size:9px}
    }
    @media(orientation:landscape) and (max-height:520px) and (max-width:900px){
      #${APP_ID} .topic-toolbar .muted{display:none}
      #${APP_ID} .topic-toolbar{margin-top:5px;padding:6px}
      #${APP_ID} .head{min-height:46px;padding:5px 8px}
      #${APP_ID} .tabs{padding-top:4px;padding-bottom:4px}
      #${APP_ID} .footer{padding:5px 8px}
    }
  `;
  (document.head || document.documentElement).appendChild(css);
  const slaCss = document.createElement('style');
  slaCss.textContent = `
    .vldc-sla-chip{display:inline-flex!important;align-items:center;max-width:100%;margin:5px 0 2px 7px!important;padding:3px 8px!important;border:1px solid #f59e0b!important;border-radius:999px!important;background:#78350f!important;color:#fff!important;font:800 10px/1.35 Segoe UI,Arial,sans-serif!important;vertical-align:middle!important;white-space:normal!important;line-height:1.45!important}
    .vldc-sla-chip.is-overdue{border-color:#fb7185!important;background:#7f1d1d!important}
    .vldc-sla-chip.is-done{border-color:#34d399!important;background:#064e3b!important}
    .vldc-sla-chip.is-near{border-color:#fbbf24!important;background:#78350f!important}
    .vldc-sla-row-overdue{background-color:#7f1d1d12!important;outline:1px solid #fb718566!important;outline-offset:-1px!important}
    .vldc-review-wrap{display:inline-flex;flex-wrap:wrap;align-items:center;gap:5px;margin:4px 0 2px 7px;vertical-align:middle}
    .vldc-review-state{font:700 10px/1.35 Segoe UI,Arial,sans-serif;color:#a7f3d0}
    .vldc-review-state.is-stale{color:#fcd34d}
    .vldc-review-state.is-overdue{color:#fda4af}
    .vldc-review-btn{border:1px solid #34d39988;border-radius:7px;background:#064e3b;color:#d1fae5;padding:3px 7px;font:700 10px/1.3 Segoe UI,Arial,sans-serif;cursor:pointer}
    .vldc-review-thread-control{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:7px 0 10px}
    .vldc-review-thread-control .vldc-review-wrap{margin:0}
  `;
  (document.head || document.documentElement).appendChild(slaCss);

  const root = document.createElement('div');
  root.id = APP_ID;
  root.setAttribute('data-console-version', '2.9.9');
  const LD_THEME_KEY = 'vldc_v2_appearance';
  let ldTheme = 'aurora';
  try { const savedTheme = localStorage.getItem(LD_THEME_KEY); if (['aurora','obsidian','pearl','forest','ocean'].includes(savedTheme)) ldTheme = savedTheme; } catch {}
  root.dataset.theme = ldTheme;
  root.innerHTML = `
    <section class="panel" aria-label="Leader and Deputy Center">
      <header class="head">
        <div class="brand"><div class="mark">♜</div><div><div class="title">VLADIMIR CONSOLE</div><div class="sub" id="role-label">LEADER & DEPUTY · тихий режим</div></div></div>
        <div class="head-actions"><button class="icon" data-act="move-up" title="Переместить панель вверх" aria-label="Переместить панель вверх">↑</button><button class="icon" data-act="move-down" title="Переместить панель вниз" aria-label="Переместить панель вниз">↓</button><button class="icon" data-act="logout" title="Выйти / сменить роль">⇥</button><button class="icon" data-act="close" title="Закрыть">×</button></div>
      </header>
      <div id="login" class="content">
        <div class="section">Выбор доступа</div>
        <label class="field"><span>Рабочая роль</span><select id="role"><option value="leader">Лидер (ЛД)</option><option value="deputy">Заместитель</option><option value="observer">Следящий</option></select></label>
        <label class="field"><span>Пароль для выбранной роли</span><input id="password" type="password" autocomplete="current-password" placeholder="Введите пароль"></label>
        <button class="primary" data-act="login">Войти</button>
        <div class="error" id="login-error"></div>
        <div class="hint">Роль ЛД/заместителя определяется по ID профиля форума. Для следящего предусмотрен отдельный пароль и режим просмотра без кнопок изменения тем и шаблонов ответов. Вход в консоль не выдаёт права на форуме.</div>
      </div>
      <div id="workspace" hidden>
        <nav class="tabs">
          <button class="tab active" data-tab="common">Общие</button>
          <button class="tab" data-tab="state">Госс</button>
          <button class="tab" data-tab="ghetto">Гетто</button>
          <button class="tab" data-tab="orgs">Орг.</button>
          <button class="tab" data-tab="tools">Инструменты</button>
        </nav>
        <section class="topic-toolbar" id="topic-toolbar" aria-label="Управление текущей темой">
          <div class="section">УПРАВЛЕНИЕ ТЕКУЩЕЙ ТЕМОЙ</div>
          <div class="action-grid">
            <button class="action open" data-topic="open">↗ Открыть тему</button>
            <button class="action close" data-topic="close">▣ Закрыть тему</button>
            <button class="action pin" data-topic="pin">◆ Закрепить тему</button>
            <button class="action unpin" data-topic="unpin">◇ Открепить тему</button>
          </div>
          <div class="muted" id="topic-toolbar-hint">Одно нажатие: консоль сама откроет меню инструментов, выберет команду и подтвердит только соответствующее действие.</div>
        </section>
        <main class="content" id="content"></main>
        <footer class="footer"><span>VLADIMIR · LEADER & DEPUTY</span><span>v2.6.7 · STARTUP CHECK</span></footer>
      </div>
      <div class="resize-bottom" title="Потяни вверх или вниз, чтобы изменить высоту панели" aria-label="Изменить высоту панели"></div>
    </section>
    <button class="launch" data-act="open">♜ VLADIMIR · ЛД / ЗАМЫ</button>
  `;
  document.body.appendChild(root);

  // Panel geometry and open state persist across full page/topic navigation.
  const savedLayout = getSavedPanelLayout();
  let panelTop = savedLayout.top;
  let panelLeft = savedLayout.left;
  let panelWidth = savedLayout.width;
  let panelHeight = savedLayout.height;
  const clamp = (value, min, max) => Math.max(min, Math.min(Number(value) || min, max));
  function savePanelLayout() {
    try { localStorage.setItem(PANEL_LAYOUT_KEY, JSON.stringify({ top: panelTop, left: panelLeft, width: panelWidth, height: panelHeight })); } catch {}
  }
  window.addEventListener('pagehide', () => { savePanelLayout(); }, { capture: true });
  window.addEventListener('beforeunload', () => { savePanelLayout(); }, { capture: true });
  function applyPanelLayout(persist = true) {
    const viewportWidth = Math.max(240, document.documentElement.clientWidth || window.innerWidth);
    const viewportHeight = Math.max(240, window.visualViewport?.height || window.innerHeight);
    const isNarrow = viewportWidth <= 600;
    const widthLimit = Math.max(240, viewportWidth - (isNarrow ? 12 : 16));
    panelWidth = clamp(isNarrow ? widthLimit : panelWidth, Math.min(280, widthLimit), widthLimit);
    panelHeight = clamp(panelHeight, Math.min(220, viewportHeight - 8), Math.max(220, viewportHeight - 8));
    panelLeft = isNarrow ? 6 : clamp(panelLeft, 8, Math.max(8, viewportWidth - panelWidth - 8));
    panelTop = clamp(panelTop, 8, Math.max(8, viewportHeight - 80));
    root.style.setProperty('--vldc-top', `${panelTop}px`);
    root.style.setProperty('--vldc-left', `${panelLeft}px`);
    root.style.setProperty('--vldc-width', `${panelWidth}px`);
    root.style.setProperty('--vldc-height', `${panelHeight}px`);
    if (persist) savePanelLayout();
  }
  applyPanelLayout(false);
  if (getSavedPanelOpen()) root.classList.add('open');
  const panelHeader = root.querySelector('.head');
  let panelDrag = null;
  panelHeader.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    panelDrag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, startLeft: panelLeft, startTop: panelTop };
    try { panelHeader.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });
  panelHeader.addEventListener('pointermove', event => {
    if (!panelDrag || panelDrag.id !== event.pointerId) return;
    panelLeft = panelDrag.startLeft + event.clientX - panelDrag.startX;
    panelTop = panelDrag.startTop + event.clientY - panelDrag.startY;
    applyPanelLayout();
  });
  const finishPanelDrag = event => {
    if (!panelDrag || (event && panelDrag.id !== event.pointerId)) return;
    panelDrag = null;
    savePanelLayout();
    try { if (event && panelHeader.hasPointerCapture(event.pointerId)) panelHeader.releasePointerCapture(event.pointerId); } catch {}
  };
  panelHeader.addEventListener('pointerup', finishPanelDrag);
  panelHeader.addEventListener('pointercancel', finishPanelDrag);
  const resizeHandle = root.querySelector('.resize-bottom');
  let panelResize = null;
  resizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    panelResize = { id: event.pointerId, startY: event.clientY, startHeight: panelHeight };
    try { resizeHandle.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });
  resizeHandle.addEventListener('pointermove', event => {
    if (!panelResize || panelResize.id !== event.pointerId) return;
    panelHeight = panelResize.startHeight + event.clientY - panelResize.startY;
    applyPanelLayout();
  });
  const finishPanelResize = event => {
    if (!panelResize || (event && panelResize.id !== event.pointerId)) return;
    panelResize = null;
    savePanelLayout();
    try { if (event && resizeHandle.hasPointerCapture(event.pointerId)) resizeHandle.releasePointerCapture(event.pointerId); } catch {}
  };
  resizeHandle.addEventListener('pointerup', finishPanelResize);
  resizeHandle.addEventListener('pointercancel', finishPanelResize);
  window.addEventListener('resize', () => applyPanelLayout(), { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', () => applyPanelLayout(false), { passive: true });

  // Local-only cosmetic rename: the forum account and server-side username are unchanged.
  function applyLocalProfileDisplayName(scope = document) {
    const candidates = scope.querySelectorAll
      ? scope.querySelectorAll('.username, [class*="username--style"], .memberHeader-name')
      : [];
    candidates.forEach(el => {
      if (el.closest(`#${APP_ID}`)) return;
      const displayName = getLocalProfileDisplayName(el.textContent);
      if (!displayName) return;
      el.textContent = displayName;
      el.classList.add('vldc-profile-display-name');
      el.setAttribute('data-vldc-display-name', 'true');
      el.setAttribute('title', `${displayName} · локальное отображение`);
    });
  }
  applyLocalProfileDisplayName();

  // Compact role badges above forum usernames; metadata is local presentation only.
  const ACCOUNT_BADGE_INFO = Object.freeze({
    '337247': { role: 'developer', label: 'Разработчик' },
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
    '532291': { role: 'leader', label: 'ЛИДЕР · МЧС' },
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
    '341059': { role: 'developer', label: OWNER_LOG_TITLE }
  });

  function decorateForumMemberBadges(scope = document) {
    if (!scope?.querySelectorAll) return;
    // Only actual username links, not every repeated profile link/avatar/signature.
    const anchors = new Set();
    if (scope.matches?.('a.username[href*="members/"], .memberHeader-name a[href*="members/"]')) anchors.add(scope);
    for (const anchor of scope.querySelectorAll('a.username[href*="members/"], .memberHeader-name a[href*="members/"]')) {
      anchors.add(anchor);
    }
    for (const anchor of anchors) {
      if (!anchor.isConnected || anchor.closest('#' + APP_ID) || anchor.querySelector('img,svg')) continue;
      const href = anchor.getAttribute('href') || '';
      const match = href.match(/members\/[^/?#]*\.([0-9]+)(?:\/|[?#]|$)/i);
      const slug = (href.match(/members\/([^./?#]+)/i)?.[1] || '').toLowerCase();
      const userId = match?.[1] || (slug === 'lorenzo_refllonez' ? 'lorenzo_refllonez' : '');
      const info = userId === 'lorenzo_refllonez' ? { role: 'developer', label: 'ГЛАВНЫЙ АДМИНИСТРАТОР' } : ACCOUNT_BADGE_INFO[userId];
      if (!userId || !info) continue;
      const username = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
      if (!username || username.length > 70) continue;

      // Replace this account's adjacent badges as a group, keeping one of each configured label.
      let badge = anchor.nextElementSibling;
      while (badge?.classList.contains('vldc-role-badge') && badge.dataset.userId === userId) {
        const next = badge.nextElementSibling;
        badge.remove();
        badge = next;
      }
      const isMainAdmin = userId === '341059' || userId === 'lorenzo_refllonez';
      const badgeItems = [info, ...(Array.isArray(info.extra) ? info.extra : [])];
      let insertAfter = anchor;
      for (const item of badgeItems) {
        const itemBadge = document.createElement(isMainAdmin ? 'span' : 'span');
        itemBadge.className = isMainAdmin ? 'vldc-role-badge vldc-role-badge--developer va-owner-reference-banner' : 'vldc-role-badge vldc-role-badge--' + item.role;
        itemBadge.dataset.userId = userId;
        itemBadge.textContent = item.label;
        itemBadge.title = item.label + ' · локальное оформление из админ-панели';
        if (isMainAdmin) {
          let snapshot = null;
          try { snapshot = JSON.parse(localStorage.getItem('vladimir_atelier_egor_reference_style_v3') || 'null'); } catch {}
          const banner = snapshot?.version === 3 ? snapshot.banner : null;
          const label = snapshot?.version === 3 ? snapshot.bannerLabel : null;
          const safeStyles = (element, styles) => {
            if (!element || !styles || typeof styles !== 'object') return;
            for (const [property, value] of Object.entries(styles)) {
              if (/^[a-z-]+$/i.test(property) && typeof value === 'string' && value && !/[{};]/.test(value)) {
                try { element.style.setProperty(property, value, 'important'); } catch {}
              }
            }
          };
          const safeClasses = (element, pack) => {
            for (const name of (Array.isArray(pack?.classes) ? pack.classes : [])) {
              if (/^[a-zA-Z_][\\w-]{0,100}$/.test(name) && name !== 'userBanner') element.classList.add(name);
            }
          };
          itemBadge.classList.add('userBanner', 'va-owner-reference-banner');
          safeClasses(itemBadge, banner);
          safeStyles(itemBadge, banner?.css);
          // Remove the generic LD badge look; the reference snapshot is the source of truth.
          for (const property of ['padding','border','border-radius','font','font-family','font-size','font-weight','letter-spacing','text-transform','text-align','box-shadow','color','background','background-color','background-image','line-height']) {
            itemBadge.style.removeProperty(property);
          }
          safeStyles(itemBadge, banner?.css);
          itemBadge.style.setProperty('display', 'inline-block', 'important');
          itemBadge.style.setProperty('vertical-align', 'middle', 'important');
          itemBadge.style.setProperty('margin', '1px 0 1px 5px', 'important');
          itemBadge.style.setProperty('max-width', 'min(240px,100%)', 'important');
          itemBadge.style.setProperty('white-space', 'normal', 'important');
          const labelNode = document.createElement(label?.tag || 'strong');
          labelNode.className = 'va-owner-reference-label';
          safeClasses(labelNode, label);
          labelNode.textContent = OWNER_LOG_TITLE;
          safeStyles(labelNode, label?.css);
          if (snapshot?.bannerTextPaint) {
            const paint = snapshot.bannerTextPaint;
            for (const [prop, value] of Object.entries({
              color: paint.color, '-webkit-text-fill-color': paint.textFill,
              'background-image': paint.backgroundImage, 'background-clip': paint.backgroundClip,
              '-webkit-background-clip': paint.backgroundClip, 'text-shadow': paint.textShadow,
              '-webkit-text-stroke': paint.webkitTextStroke
            })) if (typeof value === 'string' && value && !/[{};]/.test(value)) labelNode.style.setProperty(prop, value, 'important');
          }
          itemBadge.replaceChildren(labelNode);
          // Replicate the admin panel's saved ::before/::after styles on the forum badge.
          const pseudoId = 'vldc-owner-reference-pseudo-style';
          let pseudoStyle = document.getElementById(pseudoId);
          if (!pseudoStyle) {
            pseudoStyle = document.createElement('style');
            pseudoStyle.id = pseudoId;
            (document.head || document.documentElement).appendChild(pseudoStyle);
          }
          const declarations = pack => Object.entries(pack || {})
            .filter(([property, value]) => /^[a-z-]+$/i.test(property) && typeof value === 'string' && value && !/[{};]/.test(value))
            .map(([property, value]) => property + ':' + value + '!important;').join('');
          pseudoStyle.textContent = [
            '.va-owner-reference-banner::before{' + declarations(banner?.before) + '}',
            '.va-owner-reference-banner::after{' + declarations(banner?.after) + '}',
            '.va-owner-reference-label::before{' + declarations(label?.before) + '}',
            '.va-owner-reference-label::after{' + declarations(label?.after) + '}'
          ].join('\\n');
          itemBadge.dataset.vldcMainAdmin = snapshot?.version === 3 && banner?.css ? 'true' : 'snapshot-missing';
        }
        insertAfter.insertAdjacentElement('afterend', itemBadge);
        insertAfter = itemBadge;
      }
      anchor.dataset.vldcRoleBadge = userId;
    }
  }

  decorateForumMemberBadges();
  // XenForo may add content after initial load; inspect only newly added subtrees.
  const profileNameObserver = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.('.username, [class*="username--style"], .memberHeader-name')) {
          const displayName = getLocalProfileDisplayName(node.textContent);
          if (!node.closest(`#${APP_ID}`) && displayName) {
            node.textContent = displayName;
            node.classList.add('vldc-profile-display-name');
            node.setAttribute('data-vldc-display-name', 'true');
            node.setAttribute('title', `${displayName} · локальное отображение`);
          }
        }
        applyLocalProfileDisplayName(node);
        decorateForumMemberBadges(node);
      }
    }
  });
  profileNameObserver.observe(document.body, { childList: true, subtree: true });

  const $ = (sel) => root.querySelector(sel);
  const content = $('#content');
  const toolbarHint = $('#topic-toolbar-hint');
  if (toolbarHint) toolbarHint.textContent = isThreadPageForInitialHint();
  function isThreadPageForInitialHint() {
    const p = location.pathname || '';
    const s = location.search || '';
    const onThread = /\/threads\//i.test(p) || /(?:^|[?&])threads\//i.test(s) || /(?:^|[?&])threads(?:=|$)/i.test(s);
    return onThread
      ? 'Одно нажатие в консоли открывает меню XenForo, выбирает действие и подтверждает его, если форум показывает подтверждение.'
      : 'Кнопки всегда на виду. Для их применения открой конкретную тему форума.';
  }
  // Identify the currently signed-in XenForo member; role is derived from member ID, not game nickname.
  function detectForumUserId() {
    // Prefer XenForo's own runtime visitor ID when available; it is more reliable
    // than depending on a particular theme's navigation markup.
    const runtimeIds = [
      window.XF?.config?.userId,
      window.XF?.config?.visitor?.userId,
      document.documentElement?.getAttribute('data-user-id'),
      document.body?.getAttribute('data-user-id')
    ];
    for (const value of runtimeIds) {
      const id = String(value ?? '').trim();
      if (/^[1-9][0-9]*$/.test(id)) return id;
    }

    // XenForo skins differ: profile links may be in the user nav, account menu,
    // or rendered as a query-string route (index.php?members/name.123/).
    const navRoots = [
      ...document.querySelectorAll('.p-navgroup, .p-nav, .p-header, .js-accountMenu, .menu-content, .offCanvasMenu')
    ];
    const candidates = new Set([
      ...document.querySelectorAll('.p-navgroup-link--user[href], .p-navgroup-link--user a[href], .p-navgroup a[href*="members/"], .js-accountMenu a[href*="members/"], .menu-content a[href*="members/"], .offCanvasMenu a[href*="members/"]')
    ]);
    for (const rootNode of navRoots) {
      for (const node of rootNode.querySelectorAll('a[href], [data-user-id], [data-member-id]')) {
        candidates.add(node);
      }
    }
    for (const node of candidates) {
      const href = node.getAttribute?.('href') || '';
      const dataId = node.getAttribute?.('data-user-id') || node.getAttribute?.('data-member-id');
      if (dataId && Number.isInteger(Number(dataId)) && Number(dataId) > 0) return String(dataId);
      const match = href.match(/members\/[^/?#]*?\.([0-9]+)(?:[/?#]|$)/i)
        || href.match(/[.]([0-9]+)(?:$|[/?#])/);
      if (match && /members\//i.test(href)) return match[1];
    }

    // Account-name fallback is only checked inside the signed-in navigation.
    const signedInNav = document.querySelector('.p-navgroup-link--user, .p-navgroup .username, .p-navgroup .p-navgroup-link');
    const navText = (signedInNav?.textContent || '').replace(/^\s+|\s+$/g, '').toLowerCase();
    const navHref = signedInNav?.getAttribute?.('href') || '';
    if (navText.includes('vladimir_sudarikov') || /members\/vladimir_sudarikov\.341059/i.test(navHref)) return '341059';
    return '';
  }
  const CURRENT_FORUM_USER_ID = detectForumUserId();
  const AUTO_ROLE = ACCOUNT_ROLE_BY_ID[CURRENT_FORUM_USER_ID] || '';
  // Never reuse a global remembered role: it could give a deputy the LD view on a shared browser.
  let savedAccountRole = '';
  try {
    savedAccountRole = CURRENT_FORUM_USER_ID ? (localStorage.getItem(`${ACCOUNT_ROLE_KEY_PREFIX}${CURRENT_FORUM_USER_ID}`) || '') : '';
  } catch (error) {
    console.warn('[Leader & Deputy Center] localStorage недоступен; сохранение роли отключено.', error);
  }
  let activeRole = AUTO_ROLE || savedAccountRole;
  if (!ACCESS[activeRole]) activeRole = '';
  let toastTimer = 0;

  function esc(s) {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (character) {
      return entities[character];
    });
  }
  function toast(msg) {
    document.querySelectorAll(`#${APP_ID} .toast`).forEach((node) => node.remove());

    const toastElement = document.createElement('div');
    toastElement.className = 'toast';
    toastElement.textContent = String(msg ?? '');
    root.appendChild(toastElement);

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastElement.remove(), 3000);
  }

  async function verifyPassword(input, role) {
    if (!crypto?.subtle) throw new Error('WebCrypto недоступен. Открой форум по HTTPS.');
    const cfg = ACCESS[role];
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(input), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:Uint8Array.from(atob(cfg.salt), c=>c.charCodeAt(0)), iterations:PBKDF2_ITERATIONS}, key, 256);
    const got = btoa(String.fromCharCode(...new Uint8Array(bits)));
    return got === cfg.hash;
  }

  function setRole(role) {
    activeRole = role;
    try {
      localStorage.removeItem(PERSISTENT_ROLE_KEY);
      if (CURRENT_FORUM_USER_ID) localStorage.setItem(`${ACCOUNT_ROLE_KEY_PREFIX}${CURRENT_FORUM_USER_ID}`, role);
    } catch {}
    sessionStorage.removeItem(SESSION_KEY);
    const loginMode = AUTO_ROLE ? 'автовход по аккаунту форума' : (CURRENT_FORUM_USER_ID ? 'персональный доступ' : 'вход до конца вкладки');
    $('#role-label').textContent = `${ACCESS[role].label} · ${loginMode}`;
    const topicToolbar = $('#topic-toolbar');
    if (topicToolbar) topicToolbar.hidden = false;
    $('#login').hidden = true;
    $('#workspace').hidden = false;
    renderTab(sessionStorage.getItem(LAST_TAB_KEY) || 'common');
  }
  function logout() {
    if (AUTO_ROLE) {
      setRole(AUTO_ROLE);
      toast('Роль определяется аккаунтом форума и не переключается вручную.');
      return;
    }
    activeRole = '';
    try {
      localStorage.removeItem(PERSISTENT_ROLE_KEY);
      if (CURRENT_FORUM_USER_ID) localStorage.removeItem(`${ACCOUNT_ROLE_KEY_PREFIX}${CURRENT_FORUM_USER_ID}`);
    } catch {}
    sessionStorage.removeItem(SESSION_KEY);
    $('#workspace').hidden = true;
    $('#login').hidden = false;
    $('#password').value = '';
    $('#role-label').textContent = 'LEADER & DEPUTY · тихий режим';
  }

  // Lazy SLA badges: local DOM only. The 24-hour clock resets on the latest player post; a leader/staff reply closes that pending interval.
  const LD_SLA_MS = 24 * 60 * 60 * 1000;
  const LD_SLA_MAX_AGE_MS = LD_SLA_MS + 30 * 24 * 60 * 60 * 1000; // Keep pending requests visible for 30 days after the deadline.
  const ldSlaBadges = new Set();
  const ldSlaHandled = new Set();
  const ldSlaContextRe = /жалоб|обращени|претензи|гос(?:ударств)?|гетто|опг|заяв|кандидат|лидер|замест|неактив|отч[её]т|leader|deputy|application|report/i;
  function ldSlaRelevantPage() {
    const bits = [
      ...[...document.querySelectorAll('.p-breadcrumbs,.breadcrumb,nav[aria-label*="breadcrumb" i]')].map(n => n.textContent || ''),
      ...[...document.querySelectorAll('.p-title-value,.p-body-header h1,h1')].slice(0, 4).map(n => n.textContent || ''),
      document.title || '', location.pathname, location.search
    ];
    return ldSlaContextRe.test(bits.join(' '));
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
    if (numeric) {
      let year = Number(numeric[3]); if (year < 100) year += year < 70 ? 2000 : 1900;
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
  function ldSlaTimestamp(node) {
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
  function ldSlaDate(container) {
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
        const stamp = ldSlaTimestamp(node);
        if (Number.isFinite(stamp)) return stamp;
      }
    }
    return NaN;
  }
  const ldLeaderTitleRe = /лидер(?:а|у|ом|ы|ов)?|заместител(?:ь|я|ю|ем|и)|руководител(?:ь|я|ю|ем|и)|leader|deputy/i;
  const ldAdminTitleRe = /администратор|модератор|куратор|следящ|moderator|administrator|\bstaff\b/i;
  function ldSlaMessageRole(msg) {
    if (!msg) return 'player';
    const titles = [...msg.querySelectorAll('.message-userTitle,.userTitle,.message-userBanner,.userBanner,.message-userDetails .userTitle')].map(n => n.textContent || '').join(' ');
    if (ldLeaderTitleRe.test(titles)) return 'leader';
    if (msg.matches('.message--staff,.message--staffPost') || msg.querySelector('.username--staff,.username--admin,.username--moderator,.userBanner--staff,[data-user-role="staff"],[data-user-role="admin"]') || ldAdminTitleRe.test(titles)) return 'admin';
    return 'player';
  }
  function ldSlaAuthor(msg) {
    return (msg?.querySelector('.message-name a.username,.message-name .username,.message-userDetails a.username,a.username')?.textContent || '').trim();
  }
  function ldSlaFormatDate(value) {
    const stamp = Number(value);
    if (!Number.isFinite(stamp) || stamp <= 0) return 'не определено';
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(stamp));
  }
  function ldSlaAnalyze(messages) {
    const records = (messages || []).slice(1).map(msg => ({ at: ldSlaDate(msg), role: ldSlaMessageRole(msg), author: ldSlaAuthor(msg) })).filter(x => Number.isFinite(x.at));
    const latestOf = list => list.reduce((best, item) => !best || item.at > best.at ? item : best, null);
    const latest = latestOf(records), player = latestOf(records.filter(x => x.role === 'player')), manager = latestOf(records.filter(x => x.role !== 'player'));
    return {
      answered: latest ? latest.role !== 'player' : false,
      clockAt: latest?.role === 'player' ? latest.at : 0,
      lastReplyAt: latest?.at || 0,
      lastReplyRole: latest?.role || '',
      lastReplyAuthor: latest?.author || '',
      lastPlayerReplyAt: player?.at || 0,
      lastPlayerReplyAuthor: player?.author || '',
      lastManagerReplyAt: manager?.at || 0,
      lastManagerReplyRole: manager?.role || '',
      lastManagerReplyAuthor: manager?.author || ''
    };
  }
  function ldSlaListRole(node, scope) {
    if (!node) return 'unknown';
    const titles = [...(scope?.querySelectorAll?.('.userTitle,.userBanner,.message-userTitle,.message-userBanner') || [])].map(n => n.textContent || '').join(' ');
    if (ldLeaderTitleRe.test(titles)) return 'leader';
    if (node.matches('.username--staff,.username--admin,.username--moderator') || ldAdminTitleRe.test(titles)) return 'admin';
    return 'player';
  }
  function ldSlaLabel(clockAt, staffReply = false) {
    const left = clockAt + LD_SLA_MS - Date.now();
    const abs = Math.abs(left);
    const hours = Math.floor(abs / 3600000);
    const minutes = Math.floor((abs % 3600000) / 60000);
    const time = `${hours} ч ${String(minutes).padStart(2, '0')} мин`;
    return staffReply
      ? { text: '✓ Ответ лидера / заместителя / администрации найден', cls: 'is-done' }
      : left <= 0
        ? { text: `⚠ СРОК ИСТЁК · ${time} · ответ не найден среди загруженных сообщений`, cls: 'is-overdue' }
        : { text: `${left <= 3 * 3600000 ? '⏳ Скоро срок' : 'До срока'}: ${time}`, cls: left <= 3 * 3600000 ? 'is-near' : '' };
  }
  function ldSlaActivityText(badge) {
    const lines = [];
    const lastAt = Number(badge.dataset.lastReplyAt) || 0;
    if (lastAt) {
      const role = badge.dataset.lastReplyRole === 'leader' ? 'лидер/заместитель' : badge.dataset.lastReplyRole === 'admin' ? 'администрация' : badge.dataset.lastReplyRole === 'player' ? 'игрок' : 'роль не определена';
      lines.push(`Последний ответ: ${ldSlaFormatDate(lastAt)} · ${role}${badge.dataset.lastReplyAuthor ? ` (${badge.dataset.lastReplyAuthor})` : ''}`);
    }
    const playerAt = Number(badge.dataset.lastPlayerReplyAt) || 0;
    if (playerAt) lines.push(`Последний ответ игрока: ${ldSlaFormatDate(playerAt)}${badge.dataset.lastPlayerReplyAuthor ? ` (${badge.dataset.lastPlayerReplyAuthor})` : ''}`);
    else if (Number(badge.dataset.lastManagerReplyAt)) lines.push('В списке тем дата предыдущего ответа игрока не отображается');
    return lines.join(' · ');
  }

  // Manual review marks are available to both the leader and deputy roles.
  // They are stored only in this browser profile; no forum or spreadsheet data is modified.
  function ldSlaThreadIdFromHref(href) {
    let value = String(href || '');
    try { value = decodeURIComponent(value); } catch {}
    const match = value.match(/(?:[?&/])threads\/(?:[^/?#]*?\.)?(\d{3,})(?:[/?#&]|$)/i)
      || value.match(/threads\/[^/?#]*?\.(\d{3,})(?:[/?#&]|$)/i);
    return match?.[1] || '';
  }
  function ldSlaReadReviewMarks() {
    try {
      const value = JSON.parse(localStorage.getItem(REVIEWED_THREADS_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  }
  function ldSlaReviewActivityAt(badge) {
    return Number(badge?.dataset.lastReplyAt) || Number(badge?.dataset.createdAt) || 0;
  }
  function ldSlaRenderReviewControl(wrap, badge) {
    if (!wrap || !badge) return;
    const id = wrap.dataset.threadId || '';
    const activityAt = ldSlaReviewActivityAt(badge);
    const record = id ? ldSlaReadReviewMarks()[id] : null;
    const fresh = !!record && Number(record.activityAt) === activityAt;
    const overdue = badge.classList.contains('is-overdue');
    const state = wrap.querySelector('.vldc-review-state');
    const button = wrap.querySelector('.vldc-review-btn');
    if (!state || !button) return;
    state.className = 'vldc-review-state' + (fresh && overdue ? ' is-overdue' : !fresh && record ? ' is-stale' : '');
    state.textContent = fresh
      ? (overdue ? '✓ Тема проверена · есть просрочка' : '✓ Тема проверена · просрочек нет')
      : record ? '↻ Появились новые сообщения · нужна проверка' : '○ Тема ещё не проверена';
    button.textContent = fresh ? 'Снять отметку' : '✓ Отметить проверенной';
    button.dataset.activityAt = String(activityAt);
    button.dataset.overdue = overdue ? '1' : '0';
    button.title = fresh && record?.by ? `Отметил: ${record.by} · ${record.role || 'роль не указана'}` : 'Отметка сохраняется в этом браузере';
  }
  function ldSlaEnsureReviewControl(container, badge, threadId, isThreadPage = false) {
    if (!container || !badge || !threadId) return;
    let wrap = container.querySelector(':scope > .vldc-review-wrap');
    if (!wrap) {
      wrap = document.createElement('span');
      wrap.className = 'vldc-review-wrap';
      const state = document.createElement('span'); state.className = 'vldc-review-state';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'vldc-review-btn'; button.dataset.vldcReview = '1';
      wrap.append(state, button);
      container.appendChild(wrap);
    }
    wrap.dataset.threadId = threadId;
    wrap.dataset.activityAt = String(ldSlaReviewActivityAt(badge));
    ldSlaRenderReviewControl(wrap, badge);
  }
  function ldSlaSaveReviewMark(threadId, activityAt, overdue) {
    const marks = ldSlaReadReviewMarks();
    const by = document.querySelector('.p-navgroup-link--user .username,.p-navgroup-link--user')?.textContent?.trim() || 'Пользователь форума';
    marks[threadId] = { at: Date.now(), activityAt: Number(activityAt) || 0, by, role: ACCESS[activeRole]?.label || 'Лидерский состав', overdue: !!overdue };
    const entries = Object.entries(marks).sort((a,b) => Number(b[1]?.at || 0) - Number(a[1]?.at || 0)).slice(0, 1200);
    try { localStorage.setItem(REVIEWED_THREADS_KEY, JSON.stringify(Object.fromEntries(entries))); } catch {}
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.vldc-review-btn[data-vldc-review="1"]');
    if (!button) return;
    event.preventDefault(); event.stopPropagation();
    if (!activeRole || !ACCESS[activeRole]) { toast('Войди как лидер или заместитель, чтобы отмечать проверку темы.'); return; }
    const wrap = button.closest('.vldc-review-wrap');
    const threadId = wrap?.dataset.threadId || '';
    const activityAt = Number(button.dataset.activityAt) || Number(wrap?.dataset.activityAt) || 0;
    if (!threadId) { toast('Не удалось определить номер темы. Открой саму тему и попробуй снова.'); return; }
    const marks = ldSlaReadReviewMarks();
    const existing = marks[threadId];
    if (existing && Number(existing.activityAt) === activityAt) {
      delete marks[threadId];
      try { localStorage.setItem(REVIEWED_THREADS_KEY, JSON.stringify(marks)); } catch {}
      toast('Отметка проверки снята.');
    } else {
      const badge = wrap.closest('.structItem,.structItem--thread')?.querySelector('.vldc-sla-chip') || document.querySelector('.vldc-sla-thread-chip');
      ldSlaSaveReviewMark(threadId, activityAt, badge?.classList.contains('is-overdue'));
      toast(badge?.classList.contains('is-overdue') ? 'Тема отмечена проверенной. Просрочка есть.' : 'Тема проверена: просрочек нет.');
    }
    const badge = wrap.closest('.structItem,.structItem--thread')?.querySelector('.vldc-sla-chip') || document.querySelector('.vldc-sla-thread-chip');
    if (badge) ldSlaRenderReviewControl(wrap, badge);
  }, true);
  function ldSlaUpdateBadge(badge) {
    const createdAt = Number(badge?.dataset.createdAt);
    if (!Number.isFinite(createdAt)) return;
    const clockAt = Number(badge.dataset.clockAt) || createdAt;
    const item = ldSlaLabel(clockAt, badge.dataset.staffReply === '1');
    badge.textContent = item.text + (ldSlaActivityText(badge) ? ' · ' + ldSlaActivityText(badge) : '');
    badge.className = `vldc-sla-chip ${item.cls}`.trim();
    const row = badge.closest('.structItem--thread,.structItem');
    if (row) row.classList.toggle('vldc-sla-row-overdue', item.cls === 'is-overdue');
    const reviewWrap = row?.querySelector('.vldc-review-wrap') || (badge.classList.contains('vldc-sla-thread-chip') ? document.querySelector('.vldc-review-thread-control .vldc-review-wrap') : null);
    if (reviewWrap) ldSlaRenderReviewControl(reviewWrap, badge);
  }
  function ldSlaDecorateRow(row) {
    const title = row?.querySelector('.structItem-title,.contentRow-title,.block-row-main .contentRow-title');
    const link = title?.querySelector('a[href*="threads"]') || row?.querySelector('.block-row-main a[href*="threads"]');
    if (!title || !link) return false;
    const createdAt = ldSlaDate(row);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > LD_SLA_MAX_AGE_MS) return false;
    let badge = title.querySelector(':scope > .vldc-sla-chip');
    if (!badge) { badge = document.createElement('span'); badge.className = 'vldc-sla-chip'; title.appendChild(badge); }
    badge.dataset.createdAt = String(createdAt);
    const latestScope = row.querySelector('.structItem-latestPost,.structItem-cell--latest,.structItem-cell--meta,.contentRow-minor');
    const latest = latestScope?.querySelector('a.username') || row.querySelector('.structItem-latestPost a.username,.structItem-cell--latest a.username,.structItem-cell--meta a.username,.contentRow-minor a.username');
    const latestAt = latestScope ? ldSlaDate(latestScope) : NaN;
    const role = ldSlaListRole(latest, latestScope);
    badge.dataset.staffReply = role === 'leader' || role === 'admin' ? '1' : '0';
    badge.dataset.clockAt = role === 'player' && Number.isFinite(latestAt) ? String(latestAt) : String(createdAt);
    badge.dataset.lastReplyAt = Number.isFinite(latestAt) ? String(latestAt) : '';
    badge.dataset.lastReplyRole = role;
    badge.dataset.lastReplyAuthor = latest?.textContent?.trim() || '';
    badge.dataset.lastPlayerReplyAt = role === 'player' && Number.isFinite(latestAt) ? String(latestAt) : '';
    badge.dataset.lastPlayerReplyAuthor = role === 'player' ? (latest?.textContent?.trim() || '') : '';
    badge.dataset.lastManagerReplyAt = (role === 'leader' || role === 'admin') && Number.isFinite(latestAt) ? String(latestAt) : '';
    badge.dataset.lastManagerReplyRole = role;
    const threadId = ldSlaThreadIdFromHref(link.href);
    if (threadId) ldSlaEnsureReviewControl(title, badge, threadId);
    ldSlaBadges.add(badge); ldSlaUpdateBadge(badge); return true;
  }
  function ldSlaDecorateCurrentThread() {
    if (!/(?:\/|\?)threads\//i.test(location.href) && !/threads%2f/i.test(location.href) || !document.querySelector('.message')) return;
    const title = document.querySelector('.p-title-value,.p-body-header h1');
    const messages = [...document.querySelectorAll('.message')];
    const createdAt = ldSlaDate(messages[0]);
    if (!title || !Number.isFinite(createdAt) || Date.now() - createdAt > LD_SLA_MAX_AGE_MS) return;
    let badge = document.querySelector('.vldc-sla-thread-chip');
    if (!badge) { badge = document.createElement('span'); badge.className = 'vldc-sla-chip vldc-sla-thread-chip'; title.insertAdjacentElement('afterend', badge); }
    const activity = ldSlaAnalyze(messages);
    badge.dataset.createdAt = String(createdAt);
    badge.dataset.staffReply = activity.answered ? '1' : '0';
    badge.dataset.clockAt = String(activity.clockAt || createdAt);
    for (const key of ['lastReplyAt','lastReplyRole','lastReplyAuthor','lastPlayerReplyAt','lastPlayerReplyAuthor','lastManagerReplyAt','lastManagerReplyRole']) badge.dataset[key] = String(activity[key] || '');
    const threadId = ldSlaThreadIdFromHref(location.href);
    let reviewControl = document.querySelector('.vldc-review-thread-control');
    if (!reviewControl) {
      reviewControl = document.createElement('div');
      reviewControl.className = 'vldc-review-thread-control';
      badge.insertAdjacentElement('afterend', reviewControl);
    }
    if (threadId) ldSlaEnsureReviewControl(reviewControl, badge, threadId, true);
    ldSlaBadges.add(badge); ldSlaUpdateBadge(badge);
  }
  function startLdSlaLazyObserver() {
    // Listen on every XenForo thread-list view: some target subforums have generic titles/breadcrumbs.
    // Only thread rows with a recognizable creation timestamp receive a badge; this is DOM-only.
    const observeRow = row => {
      if (ldSlaHandled.has(row) || row.closest(`#${APP_ID}`)) return;
      ldSlaHandled.add(row);
      if (ldSlaIntersection) ldSlaIntersection.observe(row);
      else ldSlaDecorateRow(row);
    };
    const ldSlaIntersection = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        ldSlaIntersection.unobserve(entry.target);
        if (!ldSlaDecorateRow(entry.target)) ldSlaHandled.delete(entry.target);
      }
    }, { root: null, rootMargin: '160px 0px', threshold: 0 }) : null;
    const register = node => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
      const ancestorRow = node.closest?.('.structItem--thread,.structItem,.block-row');
      if (ancestorRow) observeRow(ancestorRow);
      if (node.matches?.('.structItem--thread,.structItem,.block-row')) observeRow(node);
      node.querySelectorAll?.('.structItem--thread,.structItem,.block-row').forEach(observeRow);
    };
    register(document.documentElement);
    const scanVisibleFallback = () => {
      if (ldSlaIntersection) return;
      document.querySelectorAll('.structItem--thread,.structItem,.block-row').forEach(row => {
        if (ldSlaHandled.has(row)) return;
        const rect = row.getBoundingClientRect();
        if (rect.bottom >= -160 && rect.top <= innerHeight + 160) {
          ldSlaHandled.add(row);
          if (!ldSlaDecorateRow(row)) ldSlaHandled.delete(row);
        }
      });
    };
    let currentThreadRefreshQueued = false;
    const observer = new MutationObserver(records => {
      let messageChanged = false;
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        if (record.type === 'attributes' && record.target instanceof Element) register(record.target);
        if (record.type === 'characterData' && record.target.parentElement) register(record.target.parentElement);
        if (record.type === 'childList' && record.target instanceof Element) register(record.target);
        if (target?.closest?.('.message') && !target.closest('.vldc-sla-thread-chip')) messageChanged = true;
        for (const node of record.addedNodes) {
          register(node);
          if (node.nodeType === Node.ELEMENT_NODE && (node.matches?.('.message') || node.querySelector?.('.message'))) messageChanged = true;
        }
        if (!ldSlaIntersection) scanVisibleFallback();
      }
      if (messageChanged && /(?:\/|\?)threads\//i.test(location.href) && !currentThreadRefreshQueued) {
        currentThreadRefreshQueued = true;
        setTimeout(() => { currentThreadRefreshQueued = false; ldSlaDecorateCurrentThread(); }, 180);
      }
    });
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['datetime','data-time','data-timestamp','data-date-string','data-time-string','title','aria-label'], characterData: true });
    if (!ldSlaIntersection) {
      scanVisibleFallback();
      window.addEventListener('scroll', scanVisibleFallback, { passive: true });
      window.addEventListener('resize', scanVisibleFallback, { passive: true });
    }
    ldSlaDecorateCurrentThread();
    // Countdown text changes locally every 30 seconds. No requests are sent.
    setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      for (const badge of [...ldSlaBadges]) {
        if (!badge.isConnected) { ldSlaBadges.delete(badge); continue; }
        ldSlaUpdateBadge(badge);
      }
    }, 30000);
  }
  startLdSlaLazyObserver();

  function renderLinks(groupName) {
    const group = LINKS.find(g => g.group === groupName);
    if (!group) return;
    content.innerHTML = `<div class="section">${esc(group.group)}</div><div class="note">${esc(group.note)}</div><div class="group">${group.items.map(([title,desc,url]) => `<a class="link" href="${url}" target="_blank" rel="noopener noreferrer"><span>${esc(title)}<small>${esc(desc)}</small></span><b>↗</b></a>`).join('')}</div>`;
  }
  function renderTab(tab) {
    sessionStorage.setItem(LAST_TAB_KEY, tab);
    root.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'common') renderLinks('ОБЩИЕ ТЕМЫ');
    else if (tab === 'state') renderLinks('ГОСУДАРСТВЕННЫЕ СТРУКТУРЫ');
    else if (tab === 'ghetto') renderLinks('ГЕТТО');
    else if (tab === 'orgs') renderOrganizations();
    else renderTools();
  }

  const ORGANIZATION_URLS = {
    'Правительство': 'https://forum.matrp.ru/index.php?forums/pravitelstvo-oblasti.3196/',
    'Армия': 'https://forum.matrp.ru/index.php?forums/armia.3197/',
    'Городская больница': 'https://forum.matrp.ru/index.php?forums/gorodskaa-bolnica.3198/',
    'ГТРК «Темп»': 'https://forum.matrp.ru/index.php?forums/gtrk-temp.3199/',
    'Полиция': 'https://forum.matrp.ru/index.php?forums/policia.3200/',
    'СГБ': 'https://forum.matrp.ru/index.php?forums/sgb.3201/',
    'МЧС': 'https://forum.matrp.ru/index.php?forums/mcs.3202/',
    'ОПГ «Оффники»': 'https://forum.matrp.ru/index.php?forums/opg-offniki.3204/',
    'ОПГ «Тамбовское»': 'https://forum.matrp.ru/index.php?forums/opg-tambovskoe.3205/',
    'ОПГ «Кавказское»': 'https://forum.matrp.ru/index.php?forums/opg-kavkazskoe.3206/'
  };

  function renderOrganizations() {
    const stateOrgs = ['Правительство', 'Армия', 'Полиция', 'СГБ', 'МЧС', 'Городская больница', 'ГТРК «Темп»'];
    const opgOrgs = ['ОПГ «Оффники»', 'ОПГ «Тамбовское»', 'ОПГ «Кавказское»'];
    const linkFor = name => ORGANIZATION_URLS[name] || 'https://forum.matrp.ru/index.php?forums/';
    const card = (name, desc) => `<a class="link" href="${linkFor(name)}" target="_blank" rel="noopener noreferrer"><span>${esc(name)}<small>${esc(desc)}</small></span><b>↗</b></a>`;
    content.innerHTML = `
      <div class="section">ОРГАНИЗАЦИИ · СЕРВЕР №30</div>
      <div class="note">Выбери организацию — откроется её прямой раздел форума.</div>
      <div class="org-jump">
        <label class="field"><span>Перейти к организации</span><select id="organization-select">${[...stateOrgs, ...opgOrgs].map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label>
        <button class="action info" data-org-go>Перейти ↗</button>
      </div>
      <div class="group"><div class="section">ГОСУДАРСТВЕННЫЕ ОРГАНИЗАЦИИ</div>
        ${stateOrgs.map(name => card(name, 'Открыть прямой раздел организации')).join('')}
      </div>
      <div class="group"><div class="section">ОРГАНИЗОВАННЫЕ ПРЕСТУПНЫЕ ГРУППИРОВКИ</div>
        ${opgOrgs.map(name => card(name, 'Найти раздел и темы организации на сервере №30')).join('')}
      </div>
    `;
  }

  function renderTools() {
    const roleLabel = ACCESS[activeRole]?.label || '';
    content.innerHTML = `
      <div class="section">✦ ЦЕНТР ОТВЕТОВ · ${esc(roleLabel)}</div>
      <div class="appearance-card">
        <div class="section">🎨 ОФОРМЛЕНИЕ ПАНЕЛИ</div>
        <label class="field"><span>Выбери тему</span><select id="ld-appearance">
          <option value="aurora" ${ldTheme === 'aurora' ? 'selected' : ''}>Aurora · фиолетовый градиент</option>
          <option value="obsidian" ${ldTheme === 'obsidian' ? 'selected' : ''}>Obsidian · графит</option>
          <option value="pearl" ${ldTheme === 'pearl' ? 'selected' : ''}>Pearl · светлая</option>
          <option value="forest" ${ldTheme === 'forest' ? 'selected' : ''}>Forest · изумруд</option>
          <option value="ocean" ${ldTheme === 'ocean' ? 'selected' : ''}>Ocean · сине-голубая</option>
        </select></label>
        <div class="appearance-note">Тема сохраняется на этом устройстве и применяется сразу.</div>
      </div>
      <div class="hint" style="border-color:#9b78b566;background:linear-gradient(110deg,#8b5cf622,#22c1bf12,#f0ab4b12);color:#eee2ff">Выбери ситуацию — подготовлю аккуратный ответ с цветным заголовком и выделенным решением. Перед отправкой проверь формулировки.</div>
      <label class="field"><span>Имя адресата (необязательно)</span><input id="recipient" placeholder="Например, Leader_Name"></label>
      <label class="field"><span>Причина / пояснение (необязательно)</span><input id="reason" placeholder="Причина отказа или нужное уточнение"></label>
      <div class="action-grid">
        ${(ROLE_TEMPLATES[activeRole] || ROLE_TEMPLATES.leader).map((t,i)=>`<button class="action ${t.kind}" data-template="${i}">${esc(t.title)}<div class="muted">Вставить в ответ</div></button>`).join('')}
      </div>
      <div class="hint">Шаблоны используют цветное BBCode-оформление XenForo. Кнопки только вставляют текст в редактор или копируют его: ничего не отправляется автоматически.</div>
      <div class="hint">Управление темой вынесено в отдельную панель над содержимым и доступно на всех вкладках.</div>
    `;
  }

  function buildTemplate(template) {
    const name = ($('#recipient')?.value || '').trim();
    const greeting = name ? `Здравствуйте, уважаемый(ая) ${name}!` : 'Здравствуйте!';
    const reasonInput = ($('#reason')?.value || '').trim();
    const reason = reasonInput || (template.kind === 'warning' ? 'поясните, пожалуйста, какие сведения необходимо дополнить' : 'не указана');
    return template.text
      .replaceAll('{ПРИВЕТСТВИЕ}', greeting)
      .replaceAll('{ИМЯ}', name)
      .replaceAll('{ПРИЧИНА}', reason);
  }

  async function insertReply(text) {
    const selectors = [
      'textarea[name="message"]', 'textarea#ctrl_message',
      '.bbCodeEditor textarea', '.fr-element.fr-view[contenteditable="true"]',
      '[contenteditable="true"][data-xf-init*="editor"]', '[contenteditable="true"].input'
    ];
    let editor = null;
    for (const selector of selectors) {
      editor = [...document.querySelectorAll(selector)].find(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !el.closest(`#${APP_ID}`);
      });
      if (editor) break;
    }
    if (!editor) {
      try { await navigator.clipboard.writeText(text); toast('Редактор не найден — ответ скопирован.'); }
      catch { toast('Редактор не найден. Открой ответ и попробуй снова.'); }
      return;
    }
    editor.focus();
    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      const start = typeof editor.selectionStart === 'number' ? editor.selectionStart : editor.value.length;
      const end = typeof editor.selectionEnd === 'number' ? editor.selectionEnd : editor.value.length;
      editor.setRangeText(text, start, end, 'end');
      editor.dispatchEvent(new Event('input', {bubbles:true}));
      editor.dispatchEvent(new Event('change', {bubbles:true}));
    } else {
      const ok = document.execCommand('insertText', false, text);
      if (!ok) {
        try { await navigator.clipboard.writeText(text); toast('Не удалось вставить автоматически — ответ скопирован.'); return; }
        catch { toast('Не удалось вставить текст в редактор.'); return; }
      }
      editor.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText', data:text}));
    }
    toast('Шаблон вставлен. Проверь текст перед отправкой.');
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0;
  }

  const actionPatterns = {
    open: /(?:открыть|разблокировать)\s*(?:тему|обсуждение)?|unlock(?:\s+thread)?|reopen(?:\s+thread)?|open(?:\s+thread)?/i,
    close: /(?:закрыть|заблокировать)\s*(?:тему|обсуждение)?|lock(?:\s+thread)?|close(?:\s+thread)?/i,
    pin: /(?:закрепить|прикрепить)\s*(?:тему|обсуждение)?|stick(?:\s+thread)?|pin(?:\s+thread)?/i,
    unpin: /(?:открепить|снять)\s*(?:закрепление|закреп|прикрепление|тему)?|unstick(?:\s+thread)?|unpin(?:\s+thread)?/i
  };
  const oppositeAction = { open: 'close', close: 'open', pin: 'unpin', unpin: 'pin' };
  const actionRoutes = {
    open: /(?:^|\/)(?:quick[-_]?open|quick[-_]?unlock|unlock|reopen|open)(?:\/|\?|$)/i,
    close: /(?:^|\/)(?:quick[-_]?close|lock|close)(?:\/|\?|$)/i,
    pin: /(?:^|\/)(?:quick[-_]?stick|quick[-_]?pin|stick|pin)(?:\/|\?|$)/i,
    unpin: /(?:^|\/)(?:quick[-_]?unstick|quick[-_]?unpin|unstick|unpin)(?:\/|\?|$)/i
  };
  const nativeActionContainers = '.menu-content, .menu, .menu--structural, .js-threadTools, .threadTools, .thread-tools, .block-outer-opposite, .threadTools-menu, [role="menu"], .overlay, .overlay-container, .modal';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function threadActionInfo(node) {
    const label = [node?.innerText, node?.textContent, node?.getAttribute?.('aria-label'), node?.getAttribute?.('title'), node?.value]
      .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    let href = node?.getAttribute?.('href') || node?.getAttribute?.('data-href') || node?.getAttribute?.('data-url') || node?.getAttribute?.('action') || '';
    try { const parsed = new URL(href, location.href); href = decodeURIComponent(parsed.pathname + parsed.search); } catch {}
    return { label, href };
  }

  function isNativeActionNode(node, kind) {
    if (!isVisible(node) || node.disabled || node.closest(`#${APP_ID}`)) return false;
    const { label, href } = threadActionInfo(node);
    const wantedText = actionPatterns[kind].test(label);
    const oppositeText = actionPatterns[oppositeAction[kind]].test(label);
    const routeMatch = actionRoutes[kind].test(href);
    // Reject visibly opposite menu commands even if the route string is generic.
    if (oppositeText && !wantedText) return false;
    if (routeMatch) return true;
    if (!wantedText) return false;
    return !!node.closest(nativeActionContainers);
  }

  function getNativeActionNodes(kind) {
    const selector = 'a[href], a[data-href], a[data-url], button, [role="menuitem"], input[type="submit"]';
    return [...document.querySelectorAll(selector)].filter(node => isNativeActionNode(node, kind));
  }

  async function revealThreadTools() {
    const kinds = ['open', 'close', 'pin', 'unpin'];
    if (kinds.some(kind => getNativeActionNodes(kind).length)) return true;
    const selectors = [
      '.js-threadTools .menuTrigger', '.js-threadTools [data-xf-click~="menu"]',
      '.threadTools .menuTrigger', '.threadTools [data-xf-click~="menu"]',
      '.thread-tools .menuTrigger', '.thread-tools [data-xf-click~="menu"]',
      '.block-outer-opposite .menuTrigger', '.block-outer-opposite [data-xf-click~="menu"]',
      '.buttonGroup-buttonWrapper .menuTrigger', '.buttonGroup-buttonWrapper [data-xf-click~="menu"]',
      '.js-threadTools [aria-haspopup="true"]', '.threadTools [aria-haspopup="true"]'
    ];
    const toggles = [...new Set(selectors.flatMap(selector => [...document.querySelectorAll(selector)]))]
      .filter(toggle => isVisible(toggle) && !toggle.closest(`#${APP_ID}`));
    for (const toggle of toggles.slice(0, 5)) {
      try { toggle.click(); } catch {}
      await sleep(180);
      if (kinds.some(kind => getNativeActionNodes(kind).length)) return true;
    }
    return false;
  }

  function formMatchesAction(form, kind) {
    const { label, href } = threadActionInfo(form);
    const routeMatch = actionRoutes[kind].test(href);
    const wantedText = actionPatterns[kind].test(label);
    const oppositeText = actionPatterns[oppositeAction[kind]].test(label);
    if (oppositeText && !wantedText) return false;
    return routeMatch || wantedText;
  }

  function affirmativeButtonFor(form, kind) {
    const buttons = [...form.querySelectorAll('button[type="submit"], input[type="submit"], button.button--primary, .formSubmitRow button, button')]
      .filter(button => isVisible(button) && !button.disabled && !/(?:отмена|cancel|назад|no\b|нет$)/i.test((button.textContent || button.value || '').replace(/\s+/g, ' ').trim()));
    const positive = /^(?:да|yes|подтвердить|подтверждаю|применить|сохранить|ок|ok)$/i;
    const targetLabel = actionPatterns[kind];
    const exactTarget = buttons.find(button => {
      const text = (button.textContent || button.value || button.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      return targetLabel.test(text) && !actionPatterns[oppositeAction[kind]].test(text);
    });
    return exactTarget || buttons.find(button => positive.test((button.textContent || button.value || '').replace(/\s+/g, ' ').trim())) ||
      (buttons.length === 1 ? buttons[0] : buttons.find(button => button.matches('.button--primary')) || null);
  }

  async function confirmNativeAction(kind, timeoutMs = 2600) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const forms = [...document.querySelectorAll('.overlay form, .overlay-container form, .js-overlay form, .modal form, form')]
        .filter(form => isVisible(form) && !form.closest(`#${APP_ID}`) && formMatchesAction(form, kind));
      for (const form of forms) {
        const button = affirmativeButtonFor(form, kind);
        if (!button) continue;
        button.click();
        return true;
      }
      // XenForo's native menu action may execute immediately without an overlay.
      await sleep(120);
      if (getNativeActionNodes(oppositeAction[kind]).length && !getNativeActionNodes(kind).length) return false;
    }
    return false;
  }

  async function waitForNativeState(kind, timeoutMs = 3200) {
    const deadline = Date.now() + timeoutMs;
    const opposite = oppositeAction[kind];
    while (Date.now() < deadline) {
      await revealThreadTools();
      const desiredActionNowAvailable = getNativeActionNodes(opposite).length > 0;
      const requestedActionStillAvailable = getNativeActionNodes(kind).length > 0;
      if (desiredActionNowAvailable && !requestedActionStillAvailable) return true;
      if (requestedActionStillAvailable && !desiredActionNowAvailable) return false;
      await sleep(180);
    }
    return null;
  }

  function isThreadPage() {
    const pathname = location.pathname || '';
    const search = location.search || '';
    return /\/threads\//i.test(pathname) || /(?:^|[?&])threads\//i.test(search) || /(?:^|[?&])threads(?:=|$)/i.test(search);
  }

  async function runTopicAction(kind) {
    const labels = { open: 'открыть тему', close: 'закрыть тему', pin: 'закрепить тему', unpin: 'открепить тему' };
    if (!isThreadPage()) {
      toast('Открой конкретную тему форума. Команда выполняется только для текущей темы.');
      return;
    }
    const actionButtons = root.querySelectorAll('[data-topic]');
    actionButtons.forEach(button => { button.disabled = true; });
    try {
      const revealed = await revealThreadTools();
      const wanted = getNativeActionNodes(kind);
      const opposite = getNativeActionNodes(oppositeAction[kind]);
      if (!wanted.length) {
        if (opposite.length) {
          toast(`Тема уже находится в нужном состоянии: «${labels[kind]}» не требуется.`);
        } else {
          toast(`Не удалось найти штатную команду «${labels[kind]}». Проверь права аккаунта и меню инструментов XenForo.`);
        }
        return;
      }
      wanted[0].scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      wanted[0].click();

      const confirmed = await confirmNativeAction(kind, 2600);
      const state = await waitForNativeState(kind, confirmed ? 3800 : 2400);
      if (state === true) {
        toast(`Готово: тема — ${labels[kind]}.`);
      } else if (state === false) {
        toast(`Форум не изменил состояние темы. Возможно, требуется подтверждение или у аккаунта нет прав.`);
      } else if (!confirmed) {
        toast(`Команда «${labels[kind]}» нажата. Если форум открыл окно подтверждения, проверь его вручную.`);
      } else {
        toast(`Подтверждение отправлено; не удалось проверить результат. Обнови тему и проверь её состояние.`);
      }
    } catch (error) {
      console.warn('[Leader & Deputy Center] Ошибка действия с темой:', error);
      toast(`Не удалось выполнить «${labels[kind]}»: ${error?.message || 'ошибка интерфейса форума'}`);
    } finally {
      actionButtons.forEach(button => { button.disabled = false; });
    }
  }

  root.addEventListener('change', event => {
    if (event.target?.id !== 'ld-appearance') return;
    const value = event.target.value;
    if (!['aurora','obsidian','pearl','forest','ocean'].includes(value)) return;
    ldTheme = value;
    root.dataset.theme = value;
    try { localStorage.setItem(LD_THEME_KEY, value); } catch {}
    toast('Оформление панели сохранено.');
  });

  root.addEventListener('click', async event => {
    const btn = event.target.closest('button');
    if (!btn || !root.contains(btn)) return;
    if (btn.dataset.act === 'open') { root.classList.add('open'); try { localStorage.setItem(PANEL_OPEN_KEY, '1'); } catch {} return; }
    if (btn.dataset.act === 'close') { root.classList.remove('open'); try { localStorage.setItem(PANEL_OPEN_KEY, '0'); } catch {} return; }
    if (btn.dataset.act === 'move-up') { panelTop -= 42; applyPanelLayout(); return; }
    if (btn.dataset.act === 'move-down') { panelTop += 42; applyPanelLayout(); return; }
    if (btn.dataset.act === 'logout') { logout(); toast('Выход выполнен.'); return; }
    if (btn.dataset.act === 'login') {
      const role = $('#role').value;
      const password = $('#password').value;
      if (AUTO_ROLE && role !== AUTO_ROLE) {
        $('#login-error').textContent = `Для этого аккаунта форума автоматически назначена роль «${ACCESS[AUTO_ROLE].label}».`;
        return;
      }
      btn.disabled = true;
      try {
        if (await verifyPassword(password, role)) { $('#login-error').textContent = ''; $('#password').value = ''; setRole(role); toast(`Вход: ${ACCESS[role].label}`); }
        else { $('#login-error').textContent = 'Неверный пароль для выбранной роли.'; }
      } catch (err) { $('#login-error').textContent = err.message || 'Ошибка проверки пароля.'; }
      finally { btn.disabled = false; }
      return;
    }
    if (btn.dataset.tab) { renderTab(btn.dataset.tab); return; }
    if (btn.dataset.template !== undefined) {
      const tpl = (ROLE_TEMPLATES[activeRole] || ROLE_TEMPLATES.leader)?.[Number(btn.dataset.template)];
      if (tpl) await insertReply(buildTemplate(tpl));
      return;
    }
    if (btn.dataset.orgGo !== undefined) {
      const select = $('#organization-select');
      const name = select?.value;
      if (name && ORGANIZATION_URLS[name]) window.open(ORGANIZATION_URLS[name], '_blank', 'noopener');
      return;
    }
    if (btn.dataset.topic) {
      await runTopicAction(btn.dataset.topic);
    }
  });

  $('#password').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-act="login"]').dispatchEvent(new MouseEvent('click', {bubbles:true})); } });

  if (activeRole && ACCESS[activeRole]) setRole(activeRole);
  } catch (error) {
    console.error('[Leader & Deputy Center] Ошибка запуска панели:', error);
    const showError = () => {
      if (document.getElementById('vldc-startup-error')) return;
      const box = document.createElement('div');
      box.id = 'vldc-startup-error';
      box.textContent = 'Vladimir LD: ошибка запуска панели. Откройте консоль (F12) и отправьте разработчику ошибку.';
      box.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:360px;padding:12px 14px;border:2px solid #f87171;border-radius:10px;background:#450a0a;color:#fff;font:13px/1.4 Arial,sans-serif;box-shadow:0 4px 18px #0008';
      (document.body || document.documentElement).appendChild(box);
    };
    if (document.body || document.documentElement) showError();
    else document.addEventListener('DOMContentLoaded', showError, { once: true });
  }
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
