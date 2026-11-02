// ==UserScript==
// @name         Vladimir | Leader & Deputy Center
// @namespace    Vladimir_Sudarikov.MatreshkaTools
// @version      2.5.0
// @description  Leader/deputy SLA tracking with manual per-topic review marks.
// @match        https://forum.matrp.ru/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/vladimir-ld.user.js
// @updateURL    https://raw.githubusercontent.com/vova26art86-beep/matreshka-rp-console/main/vladimir-ld.user.js
// ==/UserScript==

(() => {
  'use strict';

  // Quiet Mode: intentionally no fetch/XHR, polling, auto-refresh, cache purge, or scripted forum clicks.
  const APP_ID = 'vladimir-leader-deputy-center-v2';
  const PROFILE_SOURCE_NAME = 'Vladimir_Sudarikov';
  const PROFILE_DISPLAY_NAME = 'Бог всея Руси';
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
    '532291': 'deputy', // konon_petrov
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
  const PANEL_TOP_KEY = 'vldc_v2_panel_top';
  const REVIEWED_THREADS_KEY = 'vldc_v2_reviewed_threads';
  const DEFAULT_PANEL_TOP = 12;
  const getSavedPanelTop = () => {
    try {
      const value = Number(localStorage.getItem(PANEL_TOP_KEY));
      return Number.isFinite(value) && value >= 0 ? Math.min(value, Math.max(12, window.innerHeight - 160)) : DEFAULT_PANEL_TOP;
    } catch { return DEFAULT_PANEL_TOP; }
  };
  if (window.top !== window.self || document.getElementById(APP_ID)) return;

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
      { title: '✔ Одобрить заявление', kind: 'good', text: '[COLOR=#D6B36A][B]✦ РЕШЕНИЕ ПО ЗАЯВЛЕНИЮ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВнимательно рассмотрел Ваше заявление и сообщаю итог:\n\n[COLOR=#35C98A][B]✔ ЗАЯВЛЕНИЕ ОДОБРЕНО[/B][/COLOR]\n\nЗаявление соответствует требованиям. Решение принято в Вашу пользу.\n\nБлагодарю за обращение и желаю успехов!\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '✖ Отказать в заявлении', kind: 'bad', text: '[COLOR=#D6B36A][B]✦ РЕШЕНИЕ ПО ЗАЯВЛЕНИЮ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВнимательно рассмотрел Ваше заявление. К сожалению, по итогам проверки принято следующее решение:\n\n[COLOR=#F2788D][B]✖ В ОДОБРЕНИИ ОТКАЗАНО[/B][/COLOR]\n\n[COLOR=#F4C3CB][B]Основание:[/B][/COLOR] {ПРИЧИНА}\n\nСпасибо за обращение.\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '✧ Вопрос решён', kind: 'info', text: '[COLOR=#D6B36A][B]✦ ИТОГ РАССМОТРЕНИЯ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВаше обращение внимательно рассмотрено.\n\n[COLOR=#70B7FF][B]✧ ВОПРОС РЕШЁН[/B][/COLOR]\n\nПо ситуации принято решение, необходимые действия выполнены.\n\nБлагодарю за терпение и обратную связь!\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '⌛ Принять в работу', kind: 'work', text: '[COLOR=#D6B36A][B]✦ ОБРАЩЕНИЕ ПРИНЯТО ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\n[COLOR=#B99BFF][B]⌛ ПРИНЯТО В РАБОТУ[/B][/COLOR]\n\nНачинаю проверку предоставленной информации. После рассмотрения материалов сообщу результат в этой теме.\n\nСпасибо за ожидание и понимание!\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' },
      { title: '❔ Запросить уточнение', kind: 'warning', text: '[COLOR=#D6B36A][B]✦ НУЖНЫ ДОПОЛНИТЕЛЬНЫЕ СВЕДЕНИЯ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\n[COLOR=#F6C66A][B]❔ ПРОСЬБА УТОЧНИТЬ ИНФОРМАЦИЮ[/B][/COLOR]\n\nДля продолжения рассмотрения необходимо дополнить обращение:\n[COLOR=#FFE0A3]{ПРИЧИНА}[/COLOR]\n\nПожалуйста, оставьте уточнение в этой теме.\n\n[COLOR=#A99AC5]С уважением, лидерский состав.[/COLOR]' }
    ],
    deputy: [
      { title: '✔ Одобрить заявление', kind: 'good', text: '[COLOR=#D6B36A][B]✦ РЕШЕНИЕ ПО ЗАЯВЛЕНИЮ ✦[/B][/COLOR]\n\n{ПРИВЕТСТВИЕ}\n\nВнимательно рассмотрел Ваше заявление и сообщаю итог:\n\n[COLOR=#35C98A][B]✔ ЗАЯВЛЕНИЕ ОДОБРЕНО[/B][/COLOR]\n\nЗаявление соответствует требованиям. Решение принято в Вашу пользу.\n\nБлагодарю за обращение и желаю успехов!\n\n[COLOR=#A99AC5]С уважением, состав руководства.[/COLOR]' },
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
    .vldc-role-badge { display:table; width:max-content; max-width:min(240px,100%); margin:0 0 3px; padding:2px 7px; border:1px solid; border-radius:999px; font:800 8px/1.25 Inter,Segoe UI,Arial,sans-serif; letter-spacing:.45px; text-transform:uppercase; white-space:normal; text-align:center; box-shadow:0 2px 7px #0002; pointer-events:none; }
    .vldc-role-badge--leader { color:#ffe8b8; border-color:#d6ad5d99; background:linear-gradient(110deg,#9a6a25e8,#68431fe8); }
    .vldc-role-badge--deputy { color:#dbeafe; border-color:#77a8e899; background:linear-gradient(110deg,#315a91ed,#483d82ed); }
    .vldc-role-badge--observer { color:#ffe0f2; border-color:#df83b899; background:linear-gradient(110deg,#8e356ced,#632f82ed); }
    #${APP_ID} { --vldc-top:${getSavedPanelTop()}px; position:fixed; top:var(--vldc-top); right:16px; left:auto; bottom:auto; z-index:2147483000; color:#f8f3ff; font:13px/1.45 Inter,Segoe UI,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
    #${APP_ID} button, #${APP_ID} input, #${APP_ID} select { font:inherit; }
    #${APP_ID} .launch { border:1px solid #80699a; border-radius:999px; padding:11px 16px; color:#fff; background:linear-gradient(115deg,#49306e 0%,#7650a4 38%,#a34f82 72%,#b87955 100%); box-shadow:0 6px 18px #160b2460; font-weight:800; cursor:pointer; }
    #${APP_ID} .panel { display:none; width:min(410px,calc(100vw - 20px)); height:min(760px,calc(100vh - var(--vldc-top) - 12px)); max-height:calc(100vh - var(--vldc-top) - 12px); overflow:hidden; flex-direction:column; min-height:0; border:1px solid #9778b8; border-radius:18px; background:radial-gradient(ellipse at 5% 0%,#65458a45,transparent 42%),radial-gradient(ellipse at 100% 100%,#a45b6a24,transparent 38%),linear-gradient(155deg,#1b1728fa,#30213df7); box-shadow:0 12px 34px #10081780; }
    #${APP_ID}.open .panel { display:flex; }
    #${APP_ID}.open .launch { display:none; }
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
    #${APP_ID} .error { min-height:15px; margin:6px 0; color:#ff9eaa; font-size:10px; }
    #${APP_ID} .toast { position:fixed; right:16px; top:70px; z-index:2147483001; max-width:min(360px,calc(100vw - 36px)); padding:10px 13px; border:1px solid #e8c88f55; border-radius:10px; color:#fff; background:#332546; box-shadow:0 5px 16px #0005; font:12px/1.4 Segoe UI,Arial,sans-serif; }
    @media(max-width:600px){
      #${APP_ID}{right:max(6px,env(safe-area-inset-right));left:auto;max-width:calc(100vw - 12px)}
      #${APP_ID} .launch{max-width:calc(100vw - 12px);min-height:46px;padding:12px 14px;font-size:12px;white-space:normal;touch-action:manipulation}
      #${APP_ID} .panel{width:calc(100vw - 12px);height:calc(100dvh - var(--vldc-top) - 8px);max-height:calc(100dvh - var(--vldc-top) - 8px);border-radius:14px}
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
  root.setAttribute('data-console-version', '2.5.0');
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
        <footer class="footer"><span>VLADIMIR · LEADER & DEPUTY</span><span>v2.5.0 · ROLE BADGES</span></footer>
      </div>
    </section>
    <button class="launch" data-act="open">♜ VLADIMIR · ЛД / ЗАМЫ</button>
  `;
  document.body.appendChild(root);

  // Panel layout: fixed to the upper-right by default, with vertical nudging and header dragging.
  let panelTop = getSavedPanelTop();
  const clampPanelTop = value => Math.max(8, Math.min(Number(value) || DEFAULT_PANEL_TOP, Math.max(8, window.innerHeight - 160)));
  function setPanelTop(value, persist = true) {
    panelTop = clampPanelTop(value);
    root.style.setProperty('--vldc-top', `${panelTop}px`);
    if (persist) {
      try { localStorage.setItem(PANEL_TOP_KEY, String(panelTop)); } catch {}
    }
  }
  setPanelTop(panelTop, false);
  const panelHeader = root.querySelector('.head');
  let panelDrag = null;
  panelHeader.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    panelDrag = { id: event.pointerId, startY: event.clientY, startTop: panelTop };
    try { panelHeader.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  });
  panelHeader.addEventListener('pointermove', event => {
    if (!panelDrag || panelDrag.id !== event.pointerId) return;
    setPanelTop(panelDrag.startTop + event.clientY - panelDrag.startY);
  });
  const finishPanelDrag = event => {
    if (!panelDrag || (event && panelDrag.id !== event.pointerId)) return;
    panelDrag = null;
    try { if (event && panelHeader.hasPointerCapture(event.pointerId)) panelHeader.releasePointerCapture(event.pointerId); } catch {}
  };
  panelHeader.addEventListener('pointerup', finishPanelDrag);
  panelHeader.addEventListener('pointercancel', finishPanelDrag);
  window.addEventListener('resize', () => setPanelTop(panelTop, false));

  // Local-only cosmetic rename: the forum account and server-side username are unchanged.
  function applyLocalProfileDisplayName(scope = document) {
    const candidates = scope.querySelectorAll
      ? scope.querySelectorAll('.username, [class*="username--style"], .memberHeader-name')
      : [];
    candidates.forEach(el => {
      if (el.closest(`#${APP_ID}`)) return;
      if (el.textContent.trim() !== PROFILE_SOURCE_NAME) return;
      el.textContent = PROFILE_DISPLAY_NAME;
      el.classList.add('vldc-profile-display-name');
      el.setAttribute('data-vldc-display-name', 'true');
      el.setAttribute('title', `${PROFILE_DISPLAY_NAME} · локальное отображение`);
    });
  }
  applyLocalProfileDisplayName();

  // Compact role badges above forum usernames; metadata is local presentation only.
  const ACCOUNT_BADGE_INFO = Object.freeze({
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
    '341059': { role: 'observer', label: 'СЛЕДЯЩИЙ' }
  });

  function decorateForumMemberBadges(scope = document) {
    if (!scope?.querySelectorAll) return;
    const anchors = [];
    if (scope.matches?.('a[href*="members/"]')) anchors.push(scope);
    anchors.push(...scope.querySelectorAll('a[href*="members/"]'));
    for (const anchor of anchors) {
      if (!anchor.isConnected || anchor.closest(`#${APP_ID}`) || anchor.querySelector('img,svg')) continue;
      const href = anchor.getAttribute('href') || '';
      const match = href.match(/members\/[^/?#]*\.([0-9]+)(?:\/|[?#]|$)/i);
      if (!match) continue;
      const info = ACCOUNT_BADGE_INFO[match[1]];
      if (!info) continue;
      const username = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
      if (!username || username.length > 70) continue;
      let badge = anchor.previousElementSibling;
      if (!badge?.classList.contains('vldc-role-badge') || badge.dataset.userId !== match[1]) {
        badge = document.createElement('span');
        badge.className = 'vldc-role-badge';
        badge.dataset.userId = match[1];
        anchor.insertAdjacentElement('beforebegin', badge);
      }
      badge.className = `vldc-role-badge vldc-role-badge--${info.role}`;
      badge.textContent = info.label;
      badge.title = `${info.label} · форумный аккаунт: ${username}`;
      anchor.dataset.vldcRoleBadge = match[1];
    }
  }

  decorateForumMemberBadges();
  // XenForo may add content after initial load; inspect only newly added subtrees.
  const profileNameObserver = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches?.('.username, [class*="username--style"], .memberHeader-name')) {
          if (!node.closest(`#${APP_ID}`) && node.textContent.trim() === PROFILE_SOURCE_NAME) {
            node.textContent = PROFILE_DISPLAY_NAME;
            node.classList.add('vldc-profile-display-name');
            node.setAttribute('data-vldc-display-name', 'true');
            node.setAttribute('title', `${PROFILE_DISPLAY_NAME} · локальное отображение`);
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
    // XenForo skins differ: profile links may be in the user nav, account menu,
    // or rendered as a query-string route (index.php?members/name.123/).
    const navRoots = [
      ...document.querySelectorAll('.p-navgroup, .p-nav, .p-header, .js-accountMenu, .menu-content')
    ];
    const candidates = new Set([
      ...document.querySelectorAll('.p-navgroup-link--user[href], .p-navgroup-link--user a[href], .p-navgroup a[href*="members/"], .js-accountMenu a[href*="members/"], .menu-content a[href*="members/"]')
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

    // Fallback for this account when a forum theme hides the profile URL
    // but shows the signed-in username in XenForo's user navigation.
    const signedInNav = document.querySelector('.p-navgroup-link--user, .p-navgroup .username, .p-navgroup .p-navgroup-link');
    const navText = (signedInNav?.textContent || '').replace(/^\s+|\s+$/g, '').toLowerCase();
    const navHref = signedInNav?.getAttribute?.('href') || '';
    if ((navText.includes('vladimir_sudarikov') || /members\/vladimir_sudarikov\.341059/i.test(navHref))
      && (document.querySelector('.p-navgroup .p-navgroup-link--user, .p-navgroup-link--user') || /members\/vladimir_sudarikov\.341059/i.test(navHref))) {
      return '341059';
    }
    return '';
  }
  const CURRENT_FORUM_USER_ID = detectForumUserId();
  const AUTO_ROLE = ACCOUNT_ROLE_BY_ID[CURRENT_FORUM_USER_ID] || '';
  // Never reuse a global remembered role: it could give a deputy the LD view on a shared browser.
  let activeRole = AUTO_ROLE || (CURRENT_FORUM_USER_ID ? localStorage.getItem(`${ACCOUNT_ROLE_KEY_PREFIX}${CURRENT_FORUM_USER_ID}`) : '') || '';
  if (!ACCESS[activeRole]) activeRole = '';
  let toastTimer = 0;

  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(msg) {
    document.querySelectorAll(`#${APP_ID} .toast`).forEach(n => n.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; root.appendChild(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3000);
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
    if (topicToolbar) topicToolbar.hidden = role === 'observer';
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
    return { answered: latest ? latest.role !== 'player' : false, clockAt: latest?.role === 'player' ? latest.at : 0, lastReplyAt: latest?.at || 0, lastReplyRole: latest?.role || '', lastReplyAuthor: latest?.author || '', lastPlayerReplyAt: player?.at || 0, lastPlayerReplyAuthor: player?.author || '', lastManagerReplyAt: manager?.at || 0, lastManagerReplyRole: manager?.role || '', lastManagerReplyAuthor: manager?.author || '' };
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

  function renderOrganizations() {
    const stateOrgs = ['Правительство', 'Армия', 'Полиция', 'СГБ', 'МЧС', 'Городская больница', 'ГТРК «Темп»'];
    const opgOrgs = ['ОПГ «Оффники»', 'ОПГ «Тамбовское»', 'ОПГ «Кавказское»'];
    const linkFor = name => 'https://forum.matrp.ru/index.php?search/&q=' + encodeURIComponent('Матрешка 30 ' + name) + '&t=post';
    const card = (name, desc) => `<a class="link" href="${linkFor(name)}" target="_blank" rel="noopener noreferrer"><span>${esc(name)}<small>${esc(desc)}</small></span><b>↗</b></a>`;
    content.innerHTML = `
      <div class="section">ОРГАНИЗАЦИИ · СЕРВЕР №30</div>
      <div class="note">Выбери организацию — откроется поиск по форуму по её темам сервера №30.</div>
      <div class="group"><div class="section">ГОСУДАРСТВЕННЫЕ ОРГАНИЗАЦИИ</div>
        ${stateOrgs.map(name => card(name, 'Найти раздел и темы организации на сервере №30')).join('')}
      </div>
      <div class="group"><div class="section">ОРГАНИЗОВАННЫЕ ПРЕСТУПНЫЕ ГРУППИРОВКИ</div>
        ${opgOrgs.map(name => card(name, 'Найти раздел и темы организации на сервере №30')).join('')}
      </div>
      <div class="hint">Ссылки ведут в поиск форума, а не на неподтверждённые адреса подразделов. Если структура разделов изменится, поиск продолжит помогать находить актуальные темы.</div>
    `;
  }

  function renderTools() {
    const roleLabel = ACCESS[activeRole]?.label || '';
    if (activeRole === 'observer') {
      content.innerHTML = `
        <div class="section">✦ РЕЖИМ СЛЕДЯЩЕГО</div>
        <div class="hint">Доступен просмотр общих тем, отчётности и раздела Гетто, а также локальные отметки проверки тем.</div>
        <div class="hint">Кнопки открытия, закрытия и закрепления тем отключены. Шаблоны ответов и вставка сообщений недоступны.</div>
        <div class="hint">Отметки проверки сохраняются только в этом браузере и не являются общей отметкой для других пользователей.</div>
      `;
      return;
    }
    content.innerHTML = `
      <div class="section">✦ ЦЕНТР ОТВЕТОВ · ${esc(roleLabel)}</div>
      <div class="hint" style="border-color:#9b78b566;background:linear-gradient(110deg,#8b5cf622,#22c1bf12,#f0ab4b12);color:#eee2ff">Выбери ситуацию — подготовлю аккуратный ответ с цветным заголовком и выделенным решением. Перед отправкой проверь формулировки.</div>
      <label class="field"><span>Имя адресата (необязательно)</span><input id="recipient" placeholder="Например, Leader_Name"></label>
      <label class="field"><span>Причина / пояснение (необязательно)</span><input id="reason" placeholder="Причина отказа или нужное уточнение"></label>
      <div class="action-grid">
        ${ROLE_TEMPLATES[activeRole].map((t,i)=>`<button class="action ${t.kind}" data-template="${i}">${esc(t.title)}<div class="muted">Вставить в ответ</div></button>`).join('')}
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

  root.addEventListener('click', async event => {
    const btn = event.target.closest('button');
    if (!btn || !root.contains(btn)) return;
    if (btn.dataset.act === 'open') { root.classList.add('open'); return; }
    if (btn.dataset.act === 'close') { root.classList.remove('open'); return; }
    if (btn.dataset.act === 'move-up') { setPanelTop(panelTop - 42); return; }
    if (btn.dataset.act === 'move-down') { setPanelTop(panelTop + 42); return; }
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
      const tpl = ROLE_TEMPLATES[activeRole]?.[Number(btn.dataset.template)];
      if (tpl) await insertReply(buildTemplate(tpl));
      return;
    }
    if (btn.dataset.topic) {
      if (activeRole === 'observer') { toast('В режиме следящего изменение тем недоступно.'); return; }
      await runTopicAction(btn.dataset.topic);
    }
  });

  $('#password').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('[data-act="login"]').dispatchEvent(new MouseEvent('click', {bubbles:true})); } });

  if (activeRole && ACCESS[activeRole]) setRole(activeRole);
})();
