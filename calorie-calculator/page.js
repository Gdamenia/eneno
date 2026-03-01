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
  const msg = $("msg");

  // Targets
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

  // Lists
  const savedFoodsEl = $("savedFoods");
  const logEl = $("log");

  // Food modal
  const btnAddFood = $("btnAddFood");
  const foodModal = $("foodModal");
  const foodClose = $("foodClose");
  const foodSaveLater = $("foodSaveLater");
  const foodAddToday = $("foodAddToday");

  const mName = $("mName");
  const mGrams = $("mGrams");
  const mCals = $("mCals");
  const mP = $("mP");
  const mC = $("mC");
  const mF = $("mF");

  // Helpers
  const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const safeStr = (s) => (s || "").toString().trim();

  function uid() {
    if (crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function setMessage(text, ms = 900) {
    msg.textContent = text || "";
    if (text && ms) setTimeout(() => (msg.textContent = ""), ms);
  }

  function pct(used, target) {
    if (!target || target <= 0) return 0;
    return clamp((used / target) * 100, 0, 100);
  }

  // State
  let currentUser = null;
  let targets = { cals: 1500, p: 95, c: 170, f: 45 };

  // Today log (cleared by Reset)
  let activeLog = [];

  // Saved foods (never cleared by Reset)
  let savedFoods = [];

  // Local keys
  const keyTargets = () => `planner_targets_${currentUser?.uid || "guest"}`;
  const keyLog = () => `planner_log_${currentUser?.uid || "guest"}`;
  const keySavedFoods = () => `planner_savedFoods_${currentUser?.uid || "guest"}`;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const data = JSON.parse(raw);
      return data ?? fallback;
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }

  // Firestore refs
  function userRoot() {
    return fs.collection("users").doc(currentUser.uid).collection("planner");
  }
  function targetsRef() { return userRoot().doc("targets"); }
  function activeRef() { return userRoot().doc("active"); }
  function savedFoodsCol() { return userRoot().collection("savedFoods"); }

  // Totals
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

  function applyOverState(textEl, fillEl, used, target) {
    const over = used > target && target > 0;
    textEl.classList.toggle("overText", over);
    fillEl.classList.toggle("overFill", over);
    fillEl.style.width = `${over ? 100 : pct(used, target)}%`;
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

    applyOverState(calsText, calsFill, used.cals, targets.cals);
    applyOverState(pText, pFill, used.p, targets.p);
    applyOverState(cText, cFill, used.c, targets.c);
    applyOverState(fText, fFill, used.f, targets.f);
  }

  function renderTargetsInputs() {
    tCals.value = String(targets.cals);
    tP.value = String(targets.p);
    tC.value = String(targets.c);
    tF.value = String(targets.f);
  }

  function fmtEntry(it) {
    const gramsTxt = it.grams ? `${it.grams}g — ` : "";
    return `${gramsTxt}${Math.round(num(it.totals?.cals))} kcal · P ${round1(num(it.totals?.p))}g · C ${round1(num(it.totals?.c))}g · F ${round1(num(it.totals?.f))}g`;
  }

  // Render today log
  function renderLog() {
    logEl.innerHTML = "";
    if (!activeLog.length) {
      logEl.innerHTML = `<div class="muted">No foods yet today.</div>`;
      return;
    }

    activeLog.forEach((it, idx) => {
      const div = document.createElement("div");
      div.className = "noteItem";

      div.innerHTML = `
        <div>
          <div style="font-weight:900">${it.label}</div>
          <div class="tag">${fmtEntry(it)}</div>
        </div>
        <button class="btn" style="padding:8px 10px; border-radius:12px; font-size:12px;">Delete</button>
      `;

      div.querySelector("button").addEventListener("click", async (e) => {
        e.stopPropagation();
        activeLog.splice(idx, 1);
        saveJSON(keyLog(), activeLog);
        renderLog();
        renderBars();
        try {
          await activeRef().set({
            log: activeLog,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch {}
      });

      logEl.appendChild(div);
    });
  }

  // Render saved foods
  function renderSavedFoods() {
    savedFoodsEl.innerHTML = "";
    if (!savedFoods.length) {
      savedFoodsEl.innerHTML = `<div class="muted">No saved foods yet. Add one and tap “Save for later”.</div>`;
      return;
    }

    savedFoods.forEach((it) => {
      const div = document.createElement("div");
      div.className = "noteItem";
      div.style.cursor = "pointer";

      div.innerHTML = `
        <div style="min-width:0;">
          <div style="font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
            ${it.label}
          </div>
          <div class="tag">${fmtEntry(it)}</div>
        </div>

        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
          <button class="btn btnGood" data-add="1" style="padding:8px 10px; border-radius:12px; font-size:12px;">Add</button>
          <button class="btn" data-del="1" style="padding:8px 10px; border-radius:12px; font-size:12px;">Delete</button>
        </div>
      `;

      // Click anywhere on the card adds to today (fast)
      div.addEventListener("click", async () => {
        await addSavedToToday(it);
      });

      // Buttons
      div.querySelector('[data-add="1"]').addEventListener("click", async (e) => {
        e.stopPropagation();
        await addSavedToToday(it);
      });

      div.querySelector('[data-del="1"]').addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${it.label}" from Saved foods?`)) return;

        savedFoods = savedFoods.filter(x => x.id !== it.id);
        saveJSON(keySavedFoods(), savedFoods);
        renderSavedFoods();
        setMessage("Deleted ✅");

        try { await savedFoodsCol().doc(it.id).delete(); } catch {}
      });

      savedFoodsEl.appendChild(div);
    });
  }

  async function addSavedToToday(savedItem) {
    // If saved has no grams (rare), ask once
    let grams = num(savedItem.grams);
    if (!grams || grams <= 0) {
      const ans = prompt(`How many grams for "${savedItem.label}"?`, "100");
      grams = num(ans);
      if (!grams || grams <= 0) return;
    }

    // If the saved item totals are for a different grams amount, scale:
    // We store totals for the savedItem.grams. If user picks different grams, scale.
    const baseG = num(savedItem.grams) > 0 ? num(savedItem.grams) : grams;
    const factor = baseG > 0 ? (grams / baseG) : 1;

    const totals = {
      cals: num(savedItem.totals?.cals) * factor,
      p: num(savedItem.totals?.p) * factor,
      c: num(savedItem.totals?.c) * factor,
      f: num(savedItem.totals?.f) * factor
    };

    activeLog.unshift({
      id: uid(),
      label: savedItem.label,
      grams,
      totals
    });

    saveJSON(keyLog(), activeLog);
    renderLog();
    renderBars();

    try {
      await activeRef().set({
        log: activeLog,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch {}

    setMessage("Added ✅");
  }

  // Cloud: targets / log / saved foods
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

  async function loadSavedFoodsCloud() {
    const out = [];
    const snap = await savedFoodsCol().orderBy("createdAtMs", "desc").limit(500).get();
    snap.forEach(doc => out.push({ id: doc.id, ...(doc.data() || {}) }));
    return out;
  }
  async function saveSavedFoodCloud(item) {
    await savedFoodsCol().doc(item.id).set({
      label: item.label,
      grams: item.grams || null,
      totals: item.totals,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAtMs: item.createdAtMs || Date.now()
    }, { merge: true });
  }

  // Targets persistence
  let targetsSaveTimer = null;
  function setTargetsFromInputs() {
    targets = { cals: num(tCals.value), p: num(tP.value), c: num(tC.value), f: num(tF.value) };
  }
  function persistTargetsNow() {
    setTargetsFromInputs();
    saveJSON(keyTargets(), targets);
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

  // Reset today log only
  btnResetDay.addEventListener("click", async () => {
    if (!confirm("Reset and clear ONLY today’s log? (Saved foods will stay)")) return;

    activeLog = [];
    saveJSON(keyLog(), activeLog);
    renderLog();
    renderBars();

    try { await activeRef().delete(); } catch {}
    setMessage("Reset ✅");
  });

  // Modal open/close
  function openFoodModal() {
    foodModal.style.display = "flex";
    mName.value = "";
    mGrams.value = "";
    mCals.value = "";
    mP.value = "";
    mC.value = "";
    mF.value = "";
    setTimeout(() => mName.focus(), 40);
  }
  function closeFoodModal() {
    foodModal.style.display = "none";
  }

  btnAddFood.addEventListener("click", openFoodModal);
  foodClose.addEventListener("click", closeFoodModal);
  foodModal.addEventListener("click", (e) => { if (e.target === foodModal) closeFoodModal(); });

  function readFoodFromModal() {
    const label = safeStr(mName.value);
    const grams = num(mGrams.value);
    const cals = num(mCals.value);
    const p = num(mP.value);
    const c = num(mC.value);
    const f = num(mF.value);

    if (!label) return { ok:false, msg:"Add a name." };
    if (cals <= 0 && p <= 0 && c <= 0 && f <= 0) return { ok:false, msg:"Enter calories or macros." };

    return {
      ok: true,
      item: {
        id: uid(),
        label,
        grams: grams > 0 ? grams : null,
        totals: { cals, p, c, f },
        createdAtMs: Date.now()
      }
    };
  }

  // Add to today
  foodAddToday.addEventListener("click", async () => {
    const res = readFoodFromModal();
    if (!res.ok) { setMessage(res.msg); return; }

    const it = res.item;

    activeLog.unshift({
      id: it.id,
      label: it.label,
      grams: it.grams,
      totals: it.totals
    });

    saveJSON(keyLog(), activeLog);
    renderLog();
    renderBars();

    try { await saveActiveCloud(); } catch {}

    closeFoodModal();
    setMessage("Added ✅");
  });

  // Save for later
  foodSaveLater.addEventListener("click", async () => {
    const res = readFoodFromModal();
    if (!res.ok) { setMessage(res.msg); return; }

    const it = res.item;

    // If same name exists, don’t duplicate — replace it (makes it cleaner for her)
    const nameKey = it.label.toLowerCase();
    const existing = savedFoods.find(x => (x.label || "").toLowerCase() === nameKey);

    if (existing) {
      it.id = existing.id; // keep same id so cloud doc updates
      savedFoods = savedFoods.map(x => x.id === existing.id ? it : x);
    } else {
      savedFoods.unshift(it);
      savedFoods = savedFoods.slice(0, 500);
    }

    saveJSON(keySavedFoods(), savedFoods);
    renderSavedFoods();

    try { await saveSavedFoodCloud(it); } catch {}

    closeFoodModal();
    setMessage("Saved ✅");
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

    // Local first
    const localT = loadJSON(keyTargets(), null);
    if (localT) targets = { cals:num(localT.cals), p:num(localT.p), c:num(localT.c), f:num(localT.f) };

    activeLog = loadJSON(keyLog(), []);
    savedFoods = loadJSON(keySavedFoods(), []);

    renderTargetsInputs();
    renderSavedFoods();
    renderLog();
    renderBars();

    // Cloud overwrite (if exists)
    try {
      const cloudT = await loadTargetsCloud();
      if (cloudT && (cloudT.cals || cloudT.p || cloudT.c || cloudT.f)) {
        targets = cloudT;
        saveJSON(keyTargets(), targets);
        renderTargetsInputs();
        renderBars();
      }
    } catch {}

    try {
      const cloudLog = await loadActiveCloud();
      if (Array.isArray(cloudLog)) {
        activeLog = cloudLog;
        saveJSON(keyLog(), activeLog);
        renderLog();
        renderBars();
      }
    } catch {}

    try {
      const cloudSaved = await loadSavedFoodsCloud();
      if (Array.isArray(cloudSaved) && cloudSaved.length) {
        savedFoods = cloudSaved;
        saveJSON(keySavedFoods(), savedFoods);
        renderSavedFoods();
      }
    } catch {}
  });
})();
