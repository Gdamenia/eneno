const STORAGE_KEY = "ene_progress_calendar_v4";

/* ===== Rewards: categories + items ===== */
const CATEGORIES = [
  { id:"love", title:"Love Letters 💌", subtitle:"Tkbili sitkvebi", items:[
    { id:"love_sweet", name:"Love letter (sweet)", cost:2 },
    { id:"love_deep", name:"Love letter (deep)", cost:3 },
    { id:"love_funny", name:"Love letter (funny)", cost:2 },
  ]},
  { id:"food", title:"Food Order 🍱", subtitle:"Orshabatis stili", items:[
    { id:"food_fav", name:"Fav meal for cheat day", cost:5 },
    { id:"food_healthy", name:"Healthy samsaxuris sachmeli", cost:5 },
  ]},
  { id:"beauty", title:"Beauty💄", subtitle:"Sephoras gaqurdva", items:[
    { id:"beauty_small", name:"anything under 100$", cost:20 },
    { id:"beauty_perfume", name:"anything under 150$", cost:30 },
    { id:"beauty_any", name:"Over 200$", cost:45 },
  ]},
  { id:"shoes", title:"New Shoes 👟", subtitle:"You pick the pair", items:[
    { id:"shoes_30", name:"Savarjisho", cost:30 },
    { id:"shoes_45", name:"Klasikuri", cost:45 },
  ]},
  { id:"bagfit", title:"Bag / Outfit 👜", subtitle:"Aq mament rac ginda", items:[
    { id:"fit_30", name:"Zmanebi", cost:30 },
    { id:"bag_45", name:"chanta;) coachebi raa", cost:45 },
  ]},
  { id:"cozy", title:"Cozy Stuff 🌸", subtitle:"Patara sakvarlobebi", items:[
    { id:"cozy_10", name:"Coloring book + markers", cost:10 },
    { id:"cozy_15", name:" candles + night set", cost:15 },
    { id:"cozy_30", name:" tojina / cozy hoodie", cost:15 },
  ]},
  { id:"stationery", title:"Stationery 🖊️", subtitle:"aba pastebi iafaad", items:[  
    { id:"note_12", name:"axali bloknoti", cost:12 },
    { id:"haul_20", name:"bevri random itemi", cost:20 },
  ]},
  { id:"hotel", title:"Hotel 2 Nights 🏨", subtitle:"MOIXODE", items:[
    { id:"hotel_45", name:"2 dge sastumroshi!", cost:45 },
  ]},
];

/* ===== State ===== */
const state = loadState();

function defaultState(){
  return {
    points: 0,
    dayMarks: {},     // iso => "good" | "cheat"
    inventory: {},    // itemId => count
    history: []       // {name,cost,ts}
  };
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  }catch{
    return defaultState();
  }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ===== DOM ===== */
const pointsValue = document.getElementById("pointsValue");
const cheatValue = document.getElementById("cheatValue");
const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const rewardsGrid = document.getElementById("rewardsGrid");
const ownedList = document.getElementById("ownedList");
const historyList = document.getElementById("historyList"); // may be null (you commented it out)

const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const goTodayBtn = document.getElementById("goTodayBtn");
const resetBtn = document.getElementById("resetBtn");

/* Day modal */
const dayModal = document.getElementById("dayModal");
const dayModalBackdrop = document.getElementById("dayModalBackdrop");
const closeDayModalBtn = document.getElementById("closeDayModalBtn");
const dayModalTitle = document.getElementById("dayModalTitle");
const dayStatusText = document.getElementById("dayStatusText");
const markGoodBtn = document.getElementById("markGoodBtn");
const markCheatBtn = document.getElementById("markCheatBtn");
const undoBtn = document.getElementById("undoBtn");
const flowerBurst = document.getElementById("flowerBurst");

/* Confirm modal */
const confirmModal = document.getElementById("confirmModal");
const confirmBackdrop = document.getElementById("confirmBackdrop");
const confirmTitle = document.getElementById("confirmTitle");
const confirmText = document.getElementById("confirmText");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");
const confirmOkBtn = document.getElementById("confirmOkBtn");

/* Toast + shop */
const toast = createToast();
const shop = createShopModal();

/* ===== Calendar view ===== */
let viewDate = new Date();
let selectedISO = null;

/* ===== Utils ===== */
function pad2(n){ return String(n).padStart(2,"0"); }
function toISO(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function isoToDate(iso){ const [y,m,dd]=iso.split("-").map(Number); return new Date(y,m-1,dd); }
function monthName(m){ return ["January","February","March","April","May","June","July","August","September","October","November","December"][m]; }
function getMondayIndex(jsDay){ return (jsDay + 6) % 7; }
function escapeHTML(str){
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function monthKeyFromISO(iso){ return iso.slice(0,7); }
function viewMonthKey(){ return `${viewDate.getFullYear()}-${pad2(viewDate.getMonth()+1)}`; }

function countCheatsForMonth(monthKey){
  let c = 0;
  for(const [iso, mark] of Object.entries(state.dayMarks)){
    if(monthKeyFromISO(iso) === monthKey && mark === "cheat") c++;
  }
  return c;
}

/* ===== Render ===== */
function renderAll(){
  pointsValue.textContent = state.points;
  cheatValue.textContent = countCheatsForMonth(viewMonthKey());
  renderCalendar();
  renderCategories();
  renderRecentOrders();
  renderHistory(); // safe now
}

function renderCalendar(){
  calendarGrid.innerHTML = "";

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  monthLabel.textContent = `${monthName(m)} ${y}`;

  const first = new Date(y, m, 1);
  const offset = getMondayIndex(first.getDay());
  const total = 42;
  const todayISO = toISO(new Date());

  for(let i=0;i<total;i++){
    const cellDay = i - offset + 1;
    const d = new Date(y, m, cellDay);
    const inMonth = d.getMonth() === m;
    const iso = toISO(d);
    const mark = state.dayMarks[iso];

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cal-day" + (inMonth ? "" : " is-out") + (iso===todayISO ? " is-today" : "");
    if(mark === "good") btn.classList.add("is-good");
    if(mark === "cheat") btn.classList.add("is-cheat");

    btn.innerHTML = `
      <div class="cal-day__num">${d.getDate()}</div>
      <div class="cal-day__badge">${mark==="good" ? "💜" : (mark==="cheat" ? "🍩" : "")}</div>
    `;
    btn.addEventListener("click", () => openDayModal(iso));
    calendarGrid.appendChild(btn);
  }
}

function renderCategories(){
  rewardsGrid.innerHTML = "";
  for(const cat of CATEGORIES){
    const card = document.createElement("button");
    card.type = "button";
    card.className = "rewardBubble rewardBubble--fun";
    card.innerHTML = `
      <div class="rewardBubble__title">${escapeHTML(cat.title)}</div>
      <div class="rewardBubble__sub">${escapeHTML(cat.subtitle)}</div>
      <div class="rewardBubble__meta">Tap to open ✨</div>
    `;
    card.addEventListener("pointerup", () => card.blur());
    card.addEventListener("click", () => shop.open(cat));
    rewardsGrid.appendChild(card);
  }
}

function renderRecentOrders(){
  if(!state.history.length){
    ownedList.textContent = "Nothing yet 🌿";
    return;
  }
  ownedList.innerHTML = "";
  state.history.slice(0,5).forEach(h => {
    const row = document.createElement("div");
    row.textContent = `• ${h.name} (${h.cost} pts)`;
    ownedList.appendChild(row);
  });
}

/* ✅ FIX: if history panel is removed from HTML, do nothing (no crash) */
function renderHistory(){
  if(!historyList) return;

  if(!state.history.length){
    historyList.textContent = "Nothing yet";
    return;
  }
  historyList.innerHTML = "";
  state.history.slice(0,3).forEach(h => {
    const row = document.createElement("div");
    row.textContent = `• ${h.name} — ${new Date(h.ts).toLocaleDateString()}`;
    historyList.appendChild(row);
  });
}

/* ===== Day modal ===== */
function openDayModal(iso){
  selectedISO = iso;
  const d = isoToDate(iso);
  const mk = monthKeyFromISO(iso);

  dayModalTitle.textContent = `${monthName(d.getMonth())} ${d.getDate()}, ${d.getFullYear()}`;

  const mark = state.dayMarks[iso];
  const cheats = countCheatsForMonth(mk);

  if(mark === "good"){
    dayStatusText.textContent = `✅ Good day. Cheat days this month: ${cheats}/2`;
  }else if(mark === "cheat"){
    dayStatusText.textContent = `🍩 Cheat day. Cheat days this month: ${cheats}/2`;
  }else{
    dayStatusText.textContent = `Pick one: Good (+1) or Cheat (uses 1). Cheat days: ${cheats}/2`;
  }

  undoBtn.disabled = !mark;

  dayModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeDayModal(){
  dayModal.hidden = true;
  document.body.style.overflow = "";
}

closeDayModalBtn.addEventListener("click", closeDayModal);
dayModalBackdrop.addEventListener("click", closeDayModal);

undoBtn.addEventListener("click", () => {
  if(!selectedISO) return;
  const prev = state.dayMarks[selectedISO];
  if(!prev) return;

  if(prev === "good"){
    state.points = Math.max(0, state.points - 1);
  }
  delete state.dayMarks[selectedISO];

  saveState();
  renderAll();

  const mk = monthKeyFromISO(selectedISO);
  dayStatusText.textContent = `Undone. Cheat days this month: ${countCheatsForMonth(mk)}/2`;
  undoBtn.disabled = true;
  toast.show("Undone");

  /* ✅ AUTO CLOSE after choice */
  closeDayModal();
});

markGoodBtn.addEventListener("pointerup", () => markGoodBtn.blur());
markCheatBtn.addEventListener("pointerup", () => markCheatBtn.blur());

markGoodBtn.addEventListener("click", () => {
  if(!selectedISO) return;
  const prev = state.dayMarks[selectedISO];
  if(prev === "good"){ toast.show("Already good 💜"); closeDayModal(); return; }

  if(prev === "cheat"){
    state.points += 1;
  } else if(!prev){
    state.points += 1;
  }

  state.dayMarks[selectedISO] = "good";
  saveState();
  renderAll();

  undoBtn.disabled = false;
  doFlowerBurst();
  toast.show("+1 💜");

  /* ✅ AUTO CLOSE after choice */
  closeDayModal();
});

markCheatBtn.addEventListener("click", () => {
  if(!selectedISO) return;

  const mk = monthKeyFromISO(selectedISO);
  const prev = state.dayMarks[selectedISO];

  if(prev === "cheat"){ toast.show("Already cheat 🍩"); closeDayModal(); return; }

  // if previously good, remove the point
  if(prev === "good"){
    state.points = Math.max(0, state.points - 1);
  }

  const cheatsNow = countCheatsForMonth(mk);
  const willBe = cheatsNow + 1; // because we're setting cheat now

  if(willBe > 2){
    // third cheat = reset EVERYTHING
    const ok = confirm("3rd cheat day this month 😭\nThat resets all points and rewards.\nContinue?");
    if(!ok){
      // revert point change if they cancelled
      if(prev === "good") state.points += 1;
      closeDayModal();
      return;
    }
    resetEverythingHard();
    return;
  }

  state.dayMarks[selectedISO] = "cheat";
  saveState();
  renderAll();

  undoBtn.disabled = false;
  toast.show(`Cheat ${willBe}/2 🍩`);

  /* ✅ AUTO CLOSE after choice */
  closeDayModal();
});

function resetEverythingHard(){
  state.points = 0;
  state.dayMarks = {};
  state.inventory = {};
  state.history = [];
  saveState();
  renderAll();
  closeDayModal();
  alert("Reset done. Fresh start 💜");
}

/* ===== flowers ===== */
function doFlowerBurst(){
  flowerBurst.innerHTML = "";
  const petals = 18;
  for(let i=0;i<petals;i++){
    const p = document.createElement("div");
    p.className = "petal";
    const angle = (Math.PI * 2) * (i / petals);
    const radius = 70 + Math.random()*45;
    p.style.setProperty("--dx", `${Math.cos(angle) * radius}px`);
    p.style.setProperty("--dy", `${Math.sin(angle) * radius - 6}px`);
    p.style.left = `${45 + Math.random()*10}%`;
    p.style.top = `${20 + Math.random()*10}px`;
    flowerBurst.appendChild(p);
  }
  setTimeout(() => { flowerBurst.innerHTML = ""; }, 850);
}

/* ===== Shop modal + confirm ===== */
function createShopModal(){
  const el = document.createElement("div");
  el.className = "shopModal";
  el.hidden = true;
  el.innerHTML = `
    <div class="shopModal__backdrop"></div>
    <div class="shopModal__card">
      <div class="shopModal__top">
        <div>
          <div class="shopModal__title"></div>
          <div class="shopModal__sub"></div>
        </div>
        <button class="btn secondary shopModal__close" type="button">Close</button>
      </div>

      <div class="shopModal__balance">Balance: <b><span class="shopPts">0</span> pts</b></div>
      <div class="shopModal__items"></div>
      <div class="tiny-note shopModal__hint">Tap an item to redeem ✨</div>
    </div>
  `;
  document.body.appendChild(el);

  const backdrop = el.querySelector(".shopModal__backdrop");
  const title = el.querySelector(".shopModal__title");
  const sub = el.querySelector(".shopModal__sub");
  const items = el.querySelector(".shopModal__items");
  const close = el.querySelector(".shopModal__close");
  const ptsEl = el.querySelector(".shopPts");

  let currentCat = null;
  let pending = null;

  function open(cat){
    currentCat = cat;
    title.textContent = cat.title;
    sub.textContent = cat.subtitle;
    ptsEl.textContent = state.points;

    items.innerHTML = "";
    cat.items.forEach(item => {
      const count = state.inventory[item.id] || 0;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shopItem shopItem--cute";
      btn.innerHTML = `
        <div class="shopItem__name">${escapeHTML(item.name)}</div>
        <div class="shopItem__right">
          <div class="shopItem__cost">${item.cost} pts</div>
          <div class="shopItem__owned">${count ? `Ordered x${count}` : ""}</div>
        </div>
      `;
      btn.addEventListener("pointerup", () => btn.blur());
      btn.addEventListener("click", () => {
        btn.blur();
        if(state.points < item.cost){
          toast.show(`Need ${item.cost} pts 💔`);
          return;
        }
        pending = item;
        openConfirm(`Redeem "${item.name}"?`, `This will cost ${item.cost} points.`);
      });
      items.appendChild(btn);
    });

    el.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal(){
    el.hidden = true;
    document.body.style.overflow = "";
    currentCat = null;
  }

  close.addEventListener("click", () => { close.blur(); closeModal(); });
  backdrop.addEventListener("click", closeModal);

  function openConfirm(t, body){
    confirmTitle.textContent = t;
    confirmText.textContent = body;
    confirmModal.hidden = false;
  }
  function closeConfirm(){
    confirmModal.hidden = true;
    pending = null;
  }

  confirmCancelBtn.addEventListener("click", () => {
    closeConfirm();
    /* ✅ AUTO CLOSE after choice */
    closeModal();
  });
  confirmBackdrop.addEventListener("click", () => {
    closeConfirm();
    /* ✅ AUTO CLOSE after choice */
    closeModal();
  });

  confirmOkBtn.addEventListener("click", () => {
    if(!pending) return;
    const item = pending;

    state.points -= item.cost;
    state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;

    state.history.unshift({ name: item.name, cost: item.cost, ts: Date.now() });
    state.history = state.history.slice(0, 30);

    saveState();
    renderAll();

    ptsEl.textContent = state.points;

    /* ✅ CLOSE confirm + shop after redeem */
    closeConfirm();
    closeModal();

    toast.show("Redeemed ✨");
  });

  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape"){
      if(!confirmModal.hidden) confirmModal.hidden = true;
      else if(!el.hidden) closeModal();
      else if(!dayModal.hidden) closeDayModal();
    }
  });

  return { open, close: closeModal };
}

/* ===== Toast ===== */
function createToast(){
  const t = document.createElement("div");
  t.className = "toast";
  t.hidden = true;
  document.body.appendChild(t);

  let timer = null;
  function show(msg){
    t.textContent = msg;
    t.hidden = false;
    t.classList.remove("show");
    void t.offsetWidth;
    t.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => { t.hidden = true; }, 1200);
  }
  return { show };
}

/* ===== Nav ===== */
prevMonthBtn.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1);
  renderAll();
});
nextMonthBtn.addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1);
  renderAll();
});
goTodayBtn.addEventListener("click", () => {
  viewDate = new Date();
  renderAll();
});
resetBtn.addEventListener("click", () => {
  const ok = confirm("Reset points + calendar + rewards?");
  if(!ok) return;
  const fresh = defaultState();
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, fresh);
  saveState();
  renderAll();
});

/* init */
renderAll();