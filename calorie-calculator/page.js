(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyB5LOzb4JevtkpBXxBK3zTPVI4gT6F71Qg",
    authDomain: "eneno-bff6e.firebaseapp.com",
    projectId: "eneno-bff6e",
    storageBucket: "eneno-bff6e.firebasestorage.app",
    messagingSenderId: "948297406638",
    appId: "1:948297406638:web:be431f41365d171ce1753f",
    measurementId: "G-C25TTBYVCW"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  const auth = firebase.auth();
  const fs = firebase.firestore();

  const $ = (id) => document.getElementById(id);
  const plannerWrap = $("plannerWrap");
  const btnLogout = $("btnLogout");

  const tCals = $("tCals");
  const tP = $("tP");
  const tC = $("tC");
  const tF = $("tF");

  const btnSaveTargets = $("btnSaveTargets");
  const btnResetDay = $("btnResetDay");

  const calsText = $("calsText");
  const pText = $("pText");
  const cText = $("cText");
  const fText = $("fText");

  const calsFill = $("calsFill");
  const pFill = $("pFill");
  const cFill = $("cFill");
  const fFill = $("fFill");

  const foodInput = $("foodInput");
  const suggest = $("suggest");
  const picked = $("picked");
  const grams = $("grams");
  const btnAdd = $("btnAdd");
  const btnClearPick = $("btnClearPick");
  const msg = $("msg");
  const log = $("log");

  // Manual modal
  const btnManual = $("btnManual");
  const manualModal = $("manualModal");
  const manualClose = $("manualClose");
  const manualAdd = $("manualAdd");
  const mName = $("mName");
  const mGrams = $("mGrams");
  const mCals = $("mCals");
  const mP = $("mP");
  const mC = $("mC");
  const mF = $("mF");

  // Meal generator
  const mealType = $("mealType");
  const btnGenerateMeal = $("btnGenerateMeal");
  const savedMeals = $("savedMeals");
  const mealModal = $("mealModal");
  const mealTitle = $("mealTitle");
  const mealBody = $("mealBody");
  const mealClose = $("mealClose");
  const mealAgain = $("mealAgain");
  const mealSave = $("mealSave");

  const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  function setMessage(text, ms = 900) {
    msg.textContent = text || "";
    if (text && ms) setTimeout(() => (msg.textContent = ""), ms);
  }

  function pct(used, target) {
    if (!target || target <= 0) return 0;
    return clamp((used / target) * 100, 0, 100);
  }

  let currentUser = null;

  let targets = { cals: 1500, p: 95, c: 170, f: 45 };
  let activeLog = [];
  let saved = [];
  let selectedFood = null;

  const keyTargets = () => `planner_targets_${currentUser?.uid || "guest"}`;
  const keyLog = () => `planner_log_${currentUser?.uid || "guest"}`;
  const keyMeals = () => `planner_savedMeals_${currentUser?.uid || "guest"}`;

  function loadLocalTargets() {
    try {
      const raw = localStorage.getItem(keyTargets());
      if (!raw) return null;
      const data = JSON.parse(raw);
      return { cals: num(data.cals), p: num(data.p), c: num(data.c), f: num(data.f) };
    } catch { return null; }
  }
  function saveLocalTargets() {
    try { localStorage.setItem(keyTargets(), JSON.stringify(targets)); } catch {}
  }
  function loadLocalLog() {
    try {
      const raw = localStorage.getItem(keyLog());
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveLocalLog() {
    try { localStorage.setItem(keyLog(), JSON.stringify(activeLog)); } catch {}
  }
  function loadLocalMeals() {
    try {
      const raw = localStorage.getItem(keyMeals());
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function saveLocalMeals() {
    try { localStorage.setItem(keyMeals(), JSON.stringify(saved)); } catch {}
  }

  function userRoot() {
    return fs.collection("users").doc(currentUser.uid).collection("planner");
  }
  function targetsRef() { return userRoot().doc("targets"); }
  function activeRef() { return userRoot().doc("active"); }
  function savedMealsCol() { return userRoot().collection("savedMeals"); }

  // ✅ FIX: make API work on localhost live server too (calls your Vercel API)
  const API_BASE =
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "https://eneno.vercel.app"
      : "";

  async function apiSearch(q) {
    const r = await fetch(`${API_BASE}/api/fdc-search?q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error("search failed");
    return r.json();
  }
  async function apiFood(fdcId) {
    const r = await fetch(`${API_BASE}/api/fdc-food?fdcId=${encodeURIComponent(String(fdcId))}`);
    if (!r.ok) throw new Error("food failed");
    return r.json();
  }

  function computeTotals() {
    let cals = 0, p = 0, c = 0, f = 0;
    for (const it of activeLog) {
      cals += num(it?.totals?.cals);
      p += num(it?.totals?.p);
      c += num(it?.totals?.c);
      f += num(it?.totals?.f);
    }
    return { cals, p, c, f };
  }

  // ✅ CHANGED: exceeded behavior (0 left + red)
  function applyOverState(textEl, fillEl, used, target, left) {
    const over = used > target && target > 0;
    textEl.classList.toggle("overText", over);
    fillEl.classList.toggle("overFill", over);
    fillEl.style.width = `${over ? 100 : pct(used, target)}%`;
    return over;
  }

  function renderBars() {
    const used = computeTotals();

    const leftCals = Math.max(0, targets.cals - used.cals);
    const leftP = Math.max(0, targets.p - used.p);
    const leftC = Math.max(0, targets.c - used.c);
    const leftF = Math.max(0, targets.f - used.f);

    calsText.textContent = `${Math.round(used.cals)} used • ${Math.round(leftCals)} left`;
    pText.textContent = `${round1(used.p)} used • ${round1(leftP)} left`;
    cText.textContent = `${round1(used.c)} used • ${round1(leftC)} left`;
    fText.textContent = `${round1(used.f)} used • ${round1(leftF)} left`;

    applyOverState(calsText, calsFill, used.cals, targets.cals, leftCals);
    applyOverState(pText, pFill, used.p, targets.p, leftP);
    applyOverState(cText, cFill, used.c, targets.c, leftC);
    applyOverState(fText, fFill, used.f, targets.f, leftF);
  }

  function renderTargetsInputs() {
    tCals.value = String(targets.cals);
    tP.value = String(targets.p);
    tC.value = String(targets.c);
    tF.value = String(targets.f);
  }

  function renderLog() {
    log.innerHTML = "";
    if (!activeLog.length) {
      log.innerHTML = `<div class="muted">No foods logged yet.</div>`;
      return;
    }

    activeLog.forEach((it, idx) => {
      const div = document.createElement("div");
      div.className = "noteItem";
      const gramsTxt = it.grams ? `${it.grams}g — ` : "";

      div.innerHTML = `
        <div>
          <div style="font-weight:900">${it.label}</div>
          <div class="tag">
            ${gramsTxt}${Math.round(num(it.totals?.cals))} kcal
            · P ${round1(num(it.totals?.p))}g · C ${round1(num(it.totals?.c))}g · F ${round1(num(it.totals?.f))}g
          </div>
        </div>
        <button class="btn" style="padding:8px 10px; border-radius:12px; font-size:12px;">Delete</button>
      `;

      div.querySelector("button").addEventListener("click", async (e) => {
        e.stopPropagation();
        activeLog.splice(idx, 1);

        saveLocalLog();
        renderLog();
        renderBars();

        try {
          await activeRef().set({
            log: activeLog,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch {}
      });

      log.appendChild(div);
    });
  }

  function renderSavedMeals() {
    savedMeals.innerHTML = "";
    if (!saved.length) {
      savedMeals.innerHTML = `<div class="muted">No saved meals yet.</div>`;
      return;
    }

    saved.forEach((m) => {
      const div = document.createElement("div");
      div.className = "noteItem";

      div.innerHTML = `
        <div>
          <div style="font-weight:900">${m.title}</div>
          <div class="tag">
            ${Math.round(num(m.totals?.cals))} kcal ·
            P ${round1(num(m.totals?.p))}g ·
            C ${round1(num(m.totals?.c))}g ·
            F ${round1(num(m.totals?.f))}g
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn" data-open="1" style="padding:8px 10px; border-radius:12px; font-size:12px;">Open</button>
          <button class="btn" data-del="1" style="padding:8px 10px; border-radius:12px; font-size:12px;">Delete</button>
        </div>
      `;

      div.querySelector('[data-open="1"]').addEventListener("click", () => openMeal(m));

      div.querySelector('[data-del="1"]').addEventListener("click", async () => {
        saved = saved.filter(x => x.id !== m.id);
        saveLocalMeals();
        renderSavedMeals();
        setMessage("Deleted ✅");

        try { await savedMealsCol().doc(m.id).delete(); } catch {}
      });

      savedMeals.appendChild(div);
    });
  }

  async function loadTargetsCloud() {
    const snap = await targetsRef().get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    return { cals: num(d.cals), p: num(d.p), c: num(d.c), f: num(d.f) };
  }
  async function saveTargetsCloud() {
    await targetsRef().set({
      cals: targets.cals, p: targets.p, c: targets.c, f: targets.f,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function loadActiveCloud() {
    const snap = await activeRef().get();
    if (!snap.exists) return [];
    const d = snap.data() || {};
    return Array.isArray(d.log) ? d.log : [];
  }
  async function saveActiveCloud() {
    await activeRef().set({
      log: activeLog,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  async function loadMealsCloud() {
    const out = [];
    const snap = await savedMealsCol().orderBy("createdAtMs", "desc").limit(200).get();
    snap.forEach(doc => out.push({ id: doc.id, ...(doc.data() || {}) }));
    return out;
  }
  async function saveMealCloud(meal) {
    await savedMealsCol().doc(meal.id).set({
      title: meal.title,
      lines: meal.lines,
      totals: meal.totals,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtMs: meal.createdAtMs || Date.now()
    }, { merge: true });
  }

  // Targets persist
  let targetsSaveTimer = null;
  function setTargetsFromInputs() {
    targets = { cals: num(tCals.value), p: num(tP.value), c: num(tC.value), f: num(tF.value) };
  }
  function persistTargetsNow() {
    setTargetsFromInputs();
    saveLocalTargets();
    renderBars();
    clearTimeout(targetsSaveTimer);
    targetsSaveTimer = setTimeout(async () => {
      try { await saveTargetsCloud(); } catch {}
    }, 400);
  }

  ["input","change"].forEach(evt => {
    tCals.addEventListener(evt, persistTargetsNow);
    tP.addEventListener(evt, persistTargetsNow);
    tC.addEventListener(evt, persistTargetsNow);
    tF.addEventListener(evt, persistTargetsNow);
  });

  btnSaveTargets.addEventListener("click", async () => {
    persistTargetsNow();
    try { await saveTargetsCloud(); } catch {}
    setMessage("Targets saved ✅");
  });

  // ✅ FIX: cleaner food suggestions (dedupe + remove branded spam + fewer results)
  const norm = (s = "") =>
    s.toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isJunkBrand = (s = "") => {
    const d = s.toLowerCase();
    return (
      d.includes("restaurant") ||
      d.includes("mcdonald") ||
      d.includes("burger king") ||
      d.includes("wendy") ||
      d.includes("kfc") ||
      d.includes("starbucks") ||
      d.includes("trader joe") ||
      d.includes("walmart") ||
      d.includes("costco") ||
      d.includes("kroger") ||
      d.includes("®") ||
      d.includes("™")
    );
  };

  function scoreSuggestion(item, q) {
    const desc = item.description || "";
    const d = desc.toLowerCase();
    const query = (q || "").toLowerCase();

    let score = 0;
    if (item.dataType === "Foundation") score += 40;
    if (item.dataType === "SR Legacy") score += 30;
    if (item.dataType === "Survey (FNDDS)") score += 25;
    if (item.dataType === "Branded") score -= 80;

    if (d === query) score += 40;
    if (d.startsWith(query)) score += 25;
    if (d.includes(query)) score += 10;

    if (isJunkBrand(desc)) score -= 40;
    score += Math.max(0, 20 - desc.length * 0.15);

    return score;
  }

  // Typeahead
  let timer = null;
  let lastQ = "";
  let openSuggest = false;

  function hideSuggest() {
    suggest.style.display = "none";
    suggest.innerHTML = "";
    openSuggest = false;
  }

  function showSuggest(items) {
    suggest.innerHTML = "";
    if (!items.length) {
      suggest.innerHTML = `<div class="muted" style="padding:8px 10px;">No matches.</div>`;
      suggest.style.display = "block";
      openSuggest = true;
      return;
    }

    items.forEach((f) => {
      const row = document.createElement("div");
      row.className = "suggestItem";
      const cat = f.foodCategory ? ` • ${f.foodCategory}` : "";
      row.innerHTML = `
        <div style="min-width:0;">
          <div style="font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${f.description}
          </div>
          <div class="miniTag">${f.dataType}${cat}</div>
        </div>
        <div class="miniTag">Pick</div>
      `;

      row.addEventListener("click", async () => {
        try {
          msg.textContent = "Loading nutrition…";
          const d = await apiFood(f.fdcId);

          selectedFood = {
            label: d.label,
            per100: { cals: num(d.per100?.cals), p: num(d.per100?.p), c: num(d.per100?.c), f: num(d.per100?.f) }
          };

          picked.textContent = `${selectedFood.label} — per 100g: ${Math.round(selectedFood.per100.cals)} kcal`;
          btnAdd.disabled = false;
          hideSuggest();
          msg.textContent = "";
        } catch {
          setMessage("Couldn’t load that item. Pick another.");
        }
      });

      suggest.appendChild(row);
    });

    suggest.style.display = "block";
    openSuggest = true;
  }

  foodInput.addEventListener("input", () => {
    const q = (foodInput.value || "").trim();
    btnAdd.disabled = true;
    selectedFood = null;
    picked.textContent = "None";
    if (q.length < 2) { hideSuggest(); return; }

    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (q === lastQ) return;
      lastQ = q;
      try {
        const data = await apiSearch(q);

        let foods = (data.foods || []);

        // remove branded + obvious junk
        foods = foods.filter(f => f.dataType !== "Branded" && !isJunkBrand(f.description || ""));

        // dedupe by normalized description
        const seen = new Set();
        foods = foods.filter(f => {
          const k = norm(f.description || "");
          if (!k) return false;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        // rank best first
        foods.sort((a, b) => scoreSuggestion(b, q) - scoreSuggestion(a, q));

        // show fewer options (clean)
        showSuggest(foods.slice(0, 10));
      } catch {
        showSuggest([]);
      }
    }, 160);
  });

  document.addEventListener("click", (e) => {
    if (!openSuggest) return;
    if (e.target === foodInput) return;
    if (suggest.contains(e.target)) return;
    hideSuggest();
  });

  btnClearPick.addEventListener("click", () => {
    selectedFood = null;
    foodInput.value = "";
    picked.textContent = "None";
    btnAdd.disabled = true;
    hideSuggest();
  });

  // Add from API
  btnAdd.addEventListener("click", async () => {
    if (!selectedFood) return;

    const g = num(grams.value);
    if (!g || g <= 0) { setMessage("Enter grams (like 100)."); return; }

    const factor = g / 100;
    const totals = {
      cals: selectedFood.per100.cals * factor,
      p: selectedFood.per100.p * factor,
      c: selectedFood.per100.c * factor,
      f: selectedFood.per100.f * factor,
    };

    activeLog.unshift({ label: selectedFood.label, grams: g, totals });

    saveLocalLog();
    renderLog();
    renderBars();

    try { await saveActiveCloud(); } catch {}
    setMessage("Added ✅");
  });

  // Manual modal
  function openManual() {
    manualModal.style.display = "flex";
    mName.value = "";
    mGrams.value = "";
    mCals.value = "";
    mP.value = "";
    mC.value = "";
    mF.value = "";
    setTimeout(() => mName.focus(), 40);
  }
  function closeManual() { manualModal.style.display = "none"; }

  btnManual.addEventListener("click", openManual);
  manualClose.addEventListener("click", closeManual);
  manualModal.addEventListener("click", (e) => { if (e.target === manualModal) closeManual(); });

  manualAdd.addEventListener("click", async () => {
    const name = (mName.value || "").trim();
    const g = num(mGrams.value);

    const cals = num(mCals.value);
    const p = num(mP.value);
    const c = num(mC.value);
    const f = num(mF.value);

    if (!name) { setMessage("Manual: add a name."); return; }
    if (cals <= 0 && p <= 0 && c <= 0 && f <= 0) {
      setMessage("Manual: enter calories or macros.");
      return;
    }

    activeLog.unshift({
      label: `${name} (manual)`,
      grams: g > 0 ? g : null,
      totals: { cals, p, c, f }
    });

    saveLocalLog();
    renderLog();
    renderBars();

    try { await saveActiveCloud(); } catch {}

    closeManual();
    setMessage("Added manually ✅");
  });

  // Reset day
  btnResetDay.addEventListener("click", async () => {
    if (!confirm("Reset and clear the log?")) return;

    activeLog = [];
    saveLocalLog();
    renderLog();
    renderBars();

    try { await activeRef().delete(); } catch {}
    setMessage("Reset ✅");
  });

  // ✅ FIX: BIG meal variety + Try Again really different
  const TEMPLATES = {
    breakfast: [
      { title: "Greek yogurt + berries + granola", items: [
        { q: "greek yogurt", grams: 150 },
        { q: "granola", grams: 30 },
        { q: "blueberries", grams: 80 }
      ]},
      { title: "Greek yogurt + banana + honey", items: [
        { q: "greek yogurt", grams: 150 },
        { q: "banana raw", grams: 120 },
        { q: "honey", grams: 8 }
      ]},
      { title: "Oatmeal bowl (simple)", items: [
        { q: "oats", grams: 50 },
        { q: "banana raw", grams: 90 },
        { q: "strawberries", grams: 80 }
      ]},
      { title: "Eggs + toast + cucumber", items: [
        { q: "egg", grams: 100 },
        { q: "whole wheat bread", grams: 60 },
        { q: "cucumber", grams: 140 }
      ]},
      { title: "Eggs + potatoes (light)", items: [
        { q: "egg", grams: 100 },
        { q: "potato baked", grams: 200 },
        { q: "tomato", grams: 120 }
      ]},
      { title: "Cottage cheese + fruit", items: [
        { q: "cottage cheese", grams: 200 },
        { q: "apple raw", grams: 160 }
      ]},
      { title: "Avocado toast + egg", items: [
        { q: "whole wheat bread", grams: 60 },
        { q: "avocado raw", grams: 70 },
        { q: "egg", grams: 50 }
      ]},
      { title: "Rice cakes + yogurt + berries", items: [
        { q: "rice cake", grams: 20 },
        { q: "greek yogurt", grams: 150 },
        { q: "strawberries", grams: 100 }
      ]},
    ],

    lunch: [
      { title: "Chicken + rice + salad", items: [
        { q: "chicken breast cooked", grams: 150 },
        { q: "white rice cooked", grams: 180 },
        { q: "tomato", grams: 120 }
      ]},
      { title: "Salmon + potatoes + broccoli", items: [
        { q: "salmon cooked", grams: 140 },
        { q: "potato baked", grams: 220 },
        { q: "broccoli cooked", grams: 120 }
      ]},
      { title: "Tuna bowl (simple)", items: [
        { q: "tuna canned in water", grams: 140 },
        { q: "white rice cooked", grams: 160 },
        { q: "cucumber", grams: 150 }
      ]},
      { title: "Chicken + pasta + veg", items: [
        { q: "chicken breast cooked", grams: 140 },
        { q: "pasta cooked", grams: 180 },
        { q: "mixed vegetables cooked", grams: 180 }
      ]},
      { title: "Beef + rice + tomato", items: [
        { q: "beef cooked", grams: 140 },
        { q: "white rice cooked", grams: 160 },
        { q: "tomato", grams: 140 }
      ]},
      { title: "Turkey sandwich + salad", items: [
        { q: "whole wheat bread", grams: 90 },
        { q: "turkey breast deli", grams: 90 },
        { q: "tomato", grams: 100 }
      ]},
      { title: "Shrimp + rice + vegetables", items: [
        { q: "shrimp cooked", grams: 160 },
        { q: "white rice cooked", grams: 170 },
        { q: "mixed vegetables cooked", grams: 180 }
      ]},
      { title: "Eggs + rice + cucumber", items: [
        { q: "egg", grams: 150 },
        { q: "white rice cooked", grams: 170 },
        { q: "cucumber", grams: 150 }
      ]},
    ],

    dinner: [
      { title: "Shrimp + noodles (light)", items: [
        { q: "shrimp cooked", grams: 160 },
        { q: "rice noodles cooked", grams: 200 },
        { q: "mixed vegetables cooked", grams: 200 }
      ]},
      { title: "Chicken bowl (simple)", items: [
        { q: "chicken breast cooked", grams: 160 },
        { q: "potato baked", grams: 200 },
        { q: "cucumber", grams: 150 }
      ]},
      { title: "Salmon + rice + cucumber", items: [
        { q: "salmon cooked", grams: 130 },
        { q: "white rice cooked", grams: 170 },
        { q: "cucumber", grams: 160 }
      ]},
      { title: "Ground beef + potatoes", items: [
        { q: "ground beef cooked", grams: 140 },
        { q: "potato baked", grams: 220 },
        { q: "tomato", grams: 120 }
      ]},
      { title: "Chicken + quinoa + veg", items: [
        { q: "chicken breast cooked", grams: 150 },
        { q: "quinoa cooked", grams: 180 },
        { q: "mixed vegetables cooked", grams: 180 }
      ]},
      { title: "Omelet + salad", items: [
        { q: "egg", grams: 150 },
        { q: "tomato", grams: 120 },
        { q: "cucumber", grams: 160 }
      ]},
      { title: "Tuna + potatoes + broccoli", items: [
        { q: "tuna canned in water", grams: 140 },
        { q: "potato baked", grams: 220 },
        { q: "broccoli cooked", grams: 130 }
      ]},
      { title: "Chicken + rice noodles + veg", items: [
        { q: "chicken breast cooked", grams: 150 },
        { q: "rice noodles cooked", grams: 190 },
        { q: "mixed vegetables cooked", grams: 200 }
      ]},
    ]
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // pool per type so Try again cycles different meals
  const pools = { breakfast: [], lunch: [], dinner: [] };
  let lastTplTitle = { breakfast: "", lunch: "", dinner: "" };

  function nextTemplate(type) {
    if (!pools[type].length) pools[type] = shuffle(TEMPLATES[type] || []);
    let tpl = pools[type].shift();
    // avoid repeating the same title back-to-back
    if (tpl && tpl.title === lastTplTitle[type] && (TEMPLATES[type] || []).length > 1) {
      if (!pools[type].length) pools[type] = shuffle(TEMPLATES[type] || []);
      const alt = pools[type].shift();
      if (alt) {
        pools[type].unshift(tpl);
        tpl = alt;
      }
    }
    lastTplTitle[type] = tpl?.title || "";
    return tpl;
  }

  async function pickTopId(query) {
    const data = await apiSearch(query);
    let foods = (data.foods || []);
    if (!foods.length) return null;

    // prefer best dataset
    const preferred =
      foods.find(f => f.dataType === "Foundation") ||
      foods.find(f => f.dataType === "SR Legacy") ||
      foods.find(f => f.dataType === "Survey (FNDDS)") ||
      foods[0];

    return preferred.fdcId;
  }

  async function buildMeal(type) {
    const tpl = nextTemplate(type);
    if (!tpl) throw new Error("no templates");

    const lines = [];
    const totals = { cals: 0, p: 0, c: 0, f: 0 };

    for (const item of tpl.items) {
      const fdcId = await pickTopId(item.q);
      if (!fdcId) { lines.push(`• ${item.q} — not found`); continue; }
      const d = await apiFood(fdcId);

      const per100 = { cals: num(d.per100?.cals), p: num(d.per100?.p), c: num(d.per100?.c), f: num(d.per100?.f) };
      const factor = num(item.grams) / 100;

      const t = { cals: per100.cals * factor, p: per100.p * factor, c: per100.c * factor, f: per100.f * factor };
      totals.cals += t.cals; totals.p += t.p; totals.c += t.c; totals.f += t.f;

      lines.push(`• ${d.label} — ${item.grams}g | ${Math.round(t.cals)} kcal (P ${round1(t.p)} / C ${round1(t.c)} / F ${round1(t.f)})`);
    }

    return { id: crypto.randomUUID(), title: `${type.toUpperCase()} — ${tpl.title}`, lines, totals, createdAtMs: Date.now() };
  }

  let currentMeal = null;
  function openMeal(meal) {
    currentMeal = meal;
    mealTitle.textContent = meal.title;
    mealBody.textContent =
      meal.lines.join("\n") +
      `\n\nTOTAL: ${Math.round(num(meal.totals.cals))} kcal | P ${round1(num(meal.totals.p))}g  C ${round1(num(meal.totals.c))}g  F ${round1(num(meal.totals.f))}g`;
    mealModal.style.display = "flex";
  }
  function closeMeal() { mealModal.style.display = "none"; }

  mealClose.addEventListener("click", closeMeal);
  mealModal.addEventListener("click", (e) => { if (e.target === mealModal) closeMeal(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMeal(); });

  btnGenerateMeal.addEventListener("click", async () => {
    btnGenerateMeal.disabled = true;
    btnGenerateMeal.textContent = "Generating…";
    try {
      const meal = await buildMeal(mealType.value);
      openMeal(meal);
    } catch {
      alert("Meal generation failed.");
    } finally {
      btnGenerateMeal.disabled = false;
      btnGenerateMeal.textContent = "Generate meal";
    }
  });

  mealAgain.addEventListener("click", async () => {
    mealAgain.disabled = true;
    mealAgain.textContent = "…";
    try {
      const meal = await buildMeal(mealType.value);
      openMeal(meal);
    } finally {
      mealAgain.disabled = false;
      mealAgain.textContent = "Try again";
    }
  });

  mealSave.addEventListener("click", async () => {
    if (!currentMeal) return;

    saved.unshift(currentMeal);
    saved = saved.slice(0, 200);
    saveLocalMeals();
    renderSavedMeals();

    try { await saveMealCloud(currentMeal); } catch {}

    closeMeal();
    setMessage("Saved meal ✅");
  });

  // Logout
  btnLogout?.addEventListener("click", async () => {
    try { await auth.signOut(); } catch {}
    window.location.href = "/";
  });

  // Boot
  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = "/"; return; }
    currentUser = user;
    plannerWrap.style.display = "block";

    const localT = loadLocalTargets();
    if (localT) targets = localT;

    activeLog = loadLocalLog();
    saved = loadLocalMeals();

    renderTargetsInputs();
    renderLog();
    renderSavedMeals();
    renderBars();

    try {
      const cloudT = await loadTargetsCloud();
      if (cloudT && (cloudT.cals || cloudT.p || cloudT.c || cloudT.f)) {
        targets = cloudT;
        saveLocalTargets();
        renderTargetsInputs();
        renderBars();
      }
    } catch {}

    try {
      const cloudLog = await loadActiveCloud();
      if (Array.isArray(cloudLog)) {
        activeLog = cloudLog;
        saveLocalLog();
        renderLog();
        renderBars();
      }
    } catch {}

    try {
      const cloudMeals = await loadMealsCloud();
      if (Array.isArray(cloudMeals) && cloudMeals.length) {
        saved = cloudMeals;
        saveLocalMeals();
        renderSavedMeals();
      }
    } catch {}
  });
})();
