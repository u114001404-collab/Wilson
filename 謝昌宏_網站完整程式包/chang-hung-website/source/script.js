/*
 * 謝昌宏｜成長進行式
 * 原生 JavaScript：不使用框架、不追蹤使用者、不傳送資料。
 * 每個功能分成小段，方便依照中文註解逐步理解與修改。
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const motionQuery = window.matchMedia('(prefers-reduced-motion: no-preference)');

  /* 01 讀取素材：教學分檔版使用相對路徑；單檔版改從內嵌資料取得。 */
  let assets = {};
  try { assets = JSON.parse($('#assetData').textContent); } catch { /* 相對路徑仍可正常使用。 */ }
  const assetUrl = filename => assets[filename] || filename;
  const pdfCache = new Map();
  function pdfUrl(filename) {
    if (pdfCache.has(filename)) return pdfCache.get(filename);
    const source = assetUrl(filename);
    if (!source.startsWith('data:')) return source;
    // Blob URL 讓 PDF 能在瀏覽器的新分頁開啟，避免超長 data URL 的限制。
    const binary = atob(source.slice(source.indexOf(',') + 1));
    const chunks = [];
    for (let offset = 0; offset < binary.length; offset += 65536) {
      const slice = binary.slice(offset, offset + 65536);
      chunks.push(Uint8Array.from(slice, c => c.charCodeAt(0)));
    }
    const url = URL.createObjectURL(new Blob(chunks, {type:'application/pdf'}));
    pdfCache.set(filename, url);
    return url;
  }

  /* 02 對話框：原生 dialog 自帶焦點限制，關閉後回到原本的觸發按鈕。 */
  const lastDialogTrigger = new WeakMap();
  function openDialog(dialog, trigger = document.activeElement) {
    if (dialog.open) return;
    lastDialogTrigger.set(dialog, trigger);
    dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.querySelector('.close-dialog')?.focus();
  }
  $$('dialog').forEach(dialog => {
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      // 只在點到外部遮罩時關閉；點擊文件空白區不會意外退出。
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
      const trigger = lastDialogTrigger.get(dialog);
      if (trigger && document.contains(trigger)) trigger.focus({preventScroll:true});
    });
  });

  /* 03 手機選單：同步 aria-expanded；選取章節或按 Escape 就收合。 */
  const menu = $('#primaryNav');
  const menuToggle = $('#menuToggle');
  function closeMenu() {
    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded','false');
    menuToggle.setAttribute('aria-label','開啟導覽選單');
  }
  menuToggle.addEventListener('click', () => {
    const opened = menu.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded',String(opened));
    menuToggle.setAttribute('aria-label',opened ? '關閉導覽選單' : '開啟導覽選單');
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {closeMenu();menuToggle.focus();}
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width:761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  /* 04 無障礙分頁：上下左右、Home、End 均可切換，只有目前分頁進入 Tab 順序。 */
  function setupTabs(tablistSelector) {
    const tablist = $(tablistSelector);
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    function activate(index, focus = false) {
      tabs.forEach((tab,i) => {
        const selected = i === index;
        tab.setAttribute('aria-selected',String(selected));
        tab.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        panel.hidden = !selected;
        panel.classList.remove('is-entering');
        if (selected && motionQuery.matches) {
          // 在下一個畫面更新加上動畫類別；不需要強制重新計算版面。
          requestAnimationFrame(() => { if (!panel.hidden) panel.classList.add('is-entering'); });
        }
      });
      if (focus) tabs[index].focus();
    }
    tabs.forEach((tab,index) => {
      tab.addEventListener('click', () => activate(index));
      tab.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index+1)%tabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index-1+tabs.length)%tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length-1;
        else return;
        event.preventDefault();
        activate(next,true);
      });
    });
    return activate;
  }
  setupTabs('.trait-tabs');
  const activateYear = setupTabs('.year-tabs');
  $$('[data-freshman-tab]').forEach(link => link.addEventListener('click', () => activateYear(Number(link.dataset.freshmanTab))));

  /* 05 文件閱讀器：預覽圖可換頁、縮放，原 PDF 的位元內容完全保留。 */
  const docs = {
    poster: {title:'海報論文｜神經–腫瘤溝通',pages:1,file:'documents/poster.pdf',download:'謝昌宏_海報論文.pdf',description:'研究海報原文。初步結構預測與候選設計，仍需後續實驗驗證。'},
    freshman: {title:'大一｜學習與生活紀錄',pages:5,file:'documents/freshman.pdf',download:'謝昌宏_大一紀錄.pdf',description:'本人提供的五頁大一紀錄：學業、運動、研究、成果與泰國交換。'},
    portfolio: {title:'高中｜學習歷程檔案',pages:14,file:'documents/portfolio.pdf',download:'謝昌宏_學習歷程檔案.pdf',description:'本人提供的高中學習歷程。文件中的未來規劃為當時期許，非目前已完成成果。'}
  };
  const reader = $('#readerDialog');
  let activeDocument = 'poster';
  let page = 1;
  let returnHash = '';
  function renderPage() {
    const doc = docs[activeDocument];
    const img = $('#readerImage');
    img.src = assetUrl(`assets/${activeDocument}-${page}.webp`);
    img.alt = `${doc.title}，第 ${page} 頁，共 ${doc.pages} 頁。可開啟原始 PDF 閱讀文字。`;
    $('#pageLabel').textContent = `${page} / ${doc.pages}`;
    $('#prevPage').disabled = page === 1;
    $('#nextPage').disabled = page === doc.pages;
    $('#readerViewport').scrollTop = 0;
    $('#readerViewport').scrollLeft = 0;
  }
  function setZoom(value) {
    $('#zoomRange').value = String(value);
    $('#zoomValue').value = `${value}%`;
    $('#readerSheet').style.width = `${value}%`;
  }
  function openDocument(key, firstPage = 1, trigger, fromHash = false) {
    if (!docs[key]) return;
    activeDocument = key;
    const doc = docs[key];
    page = Math.max(1,Math.min(doc.pages,Number(firstPage)||1));
    $('#readerTitle').textContent = doc.title;
    $('#readerDescription').textContent = doc.description;
    const url = pdfUrl(doc.file);
    $('#openOriginal').href = url;
    $('#downloadOriginal').href = url;
    $('#downloadOriginal').download = doc.download;
    setZoom(100);
    renderPage();
    if (!reader.open) returnHash = location.hash.startsWith('#document-') ? '#posterShowcase' : location.hash;
    if (!fromHash) history.replaceState(null,'',`#document-${key}`);
    openDialog(reader,trigger || document.activeElement);
  }
  $$('[data-read]').forEach(button => button.addEventListener('click', () => openDocument(button.dataset.read,button.dataset.page,button)));
  $('#prevPage').addEventListener('click', () => {if(page>1){page--;renderPage();}});
  $('#nextPage').addEventListener('click', () => {if(page<docs[activeDocument].pages){page++;renderPage();}});
  $('#zoomRange').addEventListener('input', event => setZoom(event.target.value));
  $('#resetZoom').addEventListener('click', () => setZoom(100));
  reader.addEventListener('keydown', event => {
    if (event.target.matches('input,textarea,select')) return;
    if (event.key==='ArrowLeft' && page>1) {event.preventDefault();page--;renderPage();}
    if (event.key==='ArrowRight' && page<docs[activeDocument].pages) {event.preventDefault();page++;renderPage();}
  });
  reader.addEventListener('close', () => {
    if (location.hash.startsWith('#document-')) history.replaceState(null,'',location.pathname+location.search+returnHash);
  });
  $$('[data-download]').forEach(button => button.addEventListener('click', () => {
    const doc = docs[button.dataset.download];
    const link = document.createElement('a');
    link.href = pdfUrl(doc.file);
    link.download = doc.download;
    document.body.append(link);
    link.click();
    link.remove();
    $('#liveNotice').textContent = `已準備下載${doc.title}的 PDF。`;
  }));
  function checkDocumentHash() {
    const key = location.hash.replace('#document-','');
    if (location.hash.startsWith('#document-') && docs[key]) openDocument(key,1,null,true);
  }
  window.addEventListener('hashchange',checkDocumentHash);
  checkDocumentHash();

  /* 06 外觀偏好：檢查儲存值白名單，阻擋未知設定，並容忍隱私模式停用儲存。 */
  const appearance = $('#appearanceDialog');
  let preferences = {theme:'auto',accent:'blue',snap:false};
  try {
    const saved = JSON.parse(localStorage.getItem('chang-hung-appearance') || '{}');
    if (['auto','light','dark'].includes(saved.theme)) preferences.theme=saved.theme;
    if (['blue','violet','mono'].includes(saved.accent)) preferences.accent=saved.accent;
    preferences.snap = saved.snap === true;
  } catch { /* 單檔在部分瀏覽器中無法存取 localStorage，仍維持當頁互動。 */ }
  function applyPreferences(save = true) {
    root.dataset.theme = preferences.theme;
    root.dataset.accent = preferences.accent;
    root.classList.toggle('snap-enabled',preferences.snap);
    $$('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.themeChoice===preferences.theme)));
    $$('[data-accent-choice]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.accentChoice===preferences.accent)));
    $('#snapToggle').checked = preferences.snap;
    if (save) {try {localStorage.setItem('chang-hung-appearance',JSON.stringify(preferences));} catch { /* 不影響操作。 */ }}
  }
  applyPreferences(false);
  $('#appearanceButton').addEventListener('click',event => openDialog(appearance,event.currentTarget));
  $$('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {preferences.theme=button.dataset.themeChoice;applyPreferences();}));
  $$('[data-accent-choice]').forEach(button => button.addEventListener('click', () => {preferences.accent=button.dataset.accentChoice;applyPreferences();}));
  $('#snapToggle').addEventListener('change',event => {preferences.snap=event.target.checked;applyPreferences();});
  $('#notesButton').addEventListener('click',event => openDialog($('#notesDialog'),event.currentTarget));

  /* 07 淡入：IntersectionObserver 只在元素進入視窗時處理，避免反覆計算。 */
  let revealObserver;
  function syncMotion() {
    revealObserver?.disconnect();
    root.classList.toggle('motion-enhanced',motionQuery.matches);
    if (!motionQuery.matches || !('IntersectionObserver' in window)) {
      $$('.reveal').forEach(element => element.classList.add('show'));
      return;
    }
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {entry.target.classList.add('show');revealObserver.unobserve(entry.target);}
      });
    },{threshold:.08});
    $$('.reveal:not(.show)').forEach(element => revealObserver.observe(element));
  }
  syncMotion();
  motionQuery.addEventListener('change',syncMotion);

  /* 08 數字動畫：只使用來源中已確認的數字，減少動態時直接顯示終值。 */
  function countUp(element) {
    const target = Number(element.dataset.count);
    if (!motionQuery.matches) {element.textContent=String(target);return;}
    const start = performance.now();
    function tick(now) {
      if (!motionQuery.matches) {element.textContent=String(target);return;}
      const progress = Math.min(1,(now-start)/1100);
      element.textContent = String(Math.round(target*(1-Math.pow(1-progress,3))));
      if (progress<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {countUp(entry.target);counterObserver.unobserve(entry.target);}
    }),{threshold:.4});
    $$('[data-count]').forEach(element => counterObserver.observe(element));
  }

  /* 09 捲動敘事：合併成一次 requestAnimationFrame，避免每次 scroll 都重排版面。 */
  const sectionIds = ['home','traits','freshman','research','journey','care','next'];
  const sections = sectionIds.map(id=>document.getElementById(id));
  const researchSteps = $$('.research-step');
  const stepLabels = ['01 / 觀察與提問','02 / 核心與介面','03 / 候選胜肽設計','04 / 後續實驗驗證'];
  const stage = $('.research-stage');
  let framePending = false;
  function updateScrollState() {
    framePending = false;
    const maxScroll = Math.max(1,root.scrollHeight-innerHeight);
    $('#readingProgress').style.transform=`scaleX(${Math.max(0,Math.min(1,scrollY/maxScroll))})`;
    $('#siteHeader').classList.toggle('scrolled',scrollY>40);
    let active = 'home';
    for (const section of sections) {if(section.getBoundingClientRect().top<innerHeight*.35) active=section.id;}
    menu.querySelectorAll('a').forEach(link => {
      const selected = link.hash === `#${active}`;
      link.classList.toggle('active',selected);
      if (selected) link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
    });
    const rect = $('#researchStory').getBoundingClientRect();
    const progress = Math.min(1,Math.max(0,-rect.top/Math.max(1,rect.height-innerHeight)));
    if (motionQuery.matches) stage.style.setProperty('--story-progress',String(progress));
    else stage.style.removeProperty('--story-progress');
    let step = 0;
    researchSteps.forEach((element,index) => {if(element.getBoundingClientRect().top<innerHeight*.6) step=index;});
    stage.dataset.activeStep = String(step);
    $('#scienceStep').textContent = stepLabels[step];
  }
  function requestScrollUpdate() {if(!framePending){framePending=true;requestAnimationFrame(updateScrollState);}}
  window.addEventListener('scroll',requestScrollUpdate,{passive:true});
  window.addEventListener('resize',requestScrollUpdate,{passive:true});
  updateScrollState();
  // 圖片與字型載入後高度可能改變，再更新一次進度即可。
  window.addEventListener('load',requestScrollUpdate);
})();
