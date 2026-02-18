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

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }


  try {
    if (firebase.appCheck) {
      const appCheck = firebase.appCheck();

      const RECAPTCHA_V3_SITE_KEY = "PASTE_RECAPTCHA_V3_SITE_KEY_HERE";

      if (RECAPTCHA_V3_SITE_KEY && RECAPTCHA_V3_SITE_KEY !== "PASTE_RECAPTCHA_V3_SITE_KEY_HERE") {
        appCheck.activate(RECAPTCHA_V3_SITE_KEY, true); 
      }
    }
  } catch (e) {
    // ignore if not configured yet
  }

  const auth = firebase.auth();
  const fs = firebase.firestore();

  const $ = (id) => document.getElementById(id);

  function todayISO() {
    const d = new Date();
    const tzOff = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOff).toISOString().slice(0, 10);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }


  const authOverlay = $("authOverlay");
  const appWrap = $("appWrap");

  const tabLogin = $("tabLogin");
  const tabRegister = $("tabRegister");
  const authUsername = $("authUsername");
  const authPassword = $("authPassword");
  const authPassword2 = $("authPassword2");
  const confirmWrap = $("confirmWrap");
  const authSubmit = $("authSubmit");
  const authMsg = $("authMsg");

  const btnLogout = $("btnLogout");

  let authMode = "login"; // "login" | "register"

  function normalizeUsername(u) {
    return (u || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  // Firebase Auth is email-based. We map "username" -> username@ene.local
  function usernameToEmail(username) {
    return `${normalizeUsername(username)}@ene.local`;
  }

  function setAuthMode(mode) {
    authMode = mode;
    authMsg.textContent = "";
    if (mode === "login") {
      tabLogin.classList.add("btnPrimary");
      tabLogin.classList.remove("btn");
      tabRegister.classList.remove("btnPrimary");
      confirmWrap.style.display = "none";
      authSubmit.textContent = "Login";
      authPassword.autocomplete = "current-password";
    } else {
      tabRegister.classList.add("btnPrimary");
      tabRegister.classList.remove("btn");
      tabLogin.classList.remove("btnPrimary");
      confirmWrap.style.display = "block";
      authSubmit.textContent = "Register";
      authPassword.autocomplete = "new-password";
    }
  }

  // Fix classes (we used btn + btnPrimary in HTML; keep simple)
  function paintTabs() {
    // reset
    tabLogin.className = "btn";
    tabRegister.className = "btn";
    if (authMode === "login") tabLogin.className = "btn btnPrimary";
    else tabRegister.className = "btn btnPrimary";
  }

  tabLogin.addEventListener("click", () => {
    setAuthMode("login");
    paintTabs();
  });

  tabRegister.addEventListener("click", () => {
    setAuthMode("register");
    paintTabs();
  });

  async function handleAuth() {
    const u = normalizeUsername(authUsername.value);
    const p = authPassword.value || "";
    const p2 = authPassword2.value || "";

    if (!u) { authMsg.textContent = "Type a username."; return; }
    if (p.length < 6) { authMsg.textContent = "Password must be at least 6 characters."; return; }

    const email = usernameToEmail(u);

    authMsg.textContent = "Working…";

    try {
      if (authMode === "register") {
        if (p !== p2) { authMsg.textContent = "Passwords do not match."; return; }
        const cred = await auth.createUserWithEmailAndPassword(email, p);
        await cred.user.updateProfile({ displayName: u });
        authMsg.textContent = "Registered ✅ Logging in…";
      } else {
        await auth.signInWithEmailAndPassword(email, p);
        authMsg.textContent = "Logged in ✅";
      }
    } catch (e) {
      authMsg.textContent = e?.message || "Auth error.";
    }
  }

  authSubmit.addEventListener("click", handleAuth);

  btnLogout.addEventListener("click", async () => {
    await auth.signOut();
  });


  let modalOverlay, modalTitleEl, modalBodyEl;

  function ensureModal() {
    if (modalOverlay) return;

    modalOverlay = document.createElement("div");
    modalOverlay.className = "modalOverlay";
    modalOverlay.style.display = "none";
    modalOverlay.innerHTML = `
      <div class="modalBox" role="dialog" aria-modal="true">
        <div class="modalTop">
          <div class="modalTitle" id="modalTitle">Diary</div>
          <button class="modalClose" id="modalCloseBtn">Close</button>
        </div>
        <div class="modalBody" id="modalBody"></div>
      </div>
    `;
    document.body.appendChild(modalOverlay);

    modalTitleEl = modalOverlay.querySelector("#modalTitle");
    modalBodyEl  = modalOverlay.querySelector("#modalBody");

    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) hideModal();
    });

    modalOverlay.querySelector("#modalCloseBtn").addEventListener("click", hideModal);

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideModal();
    });
  }

  function hideModal() {
    if (!modalOverlay) return;
    modalOverlay.style.display = "none";
  }

 
  const datePick = $("datePick");
  const note = $("note");
  const list = $("list");

  const btnSave = $("btnSave");
  const btnClear = $("btnClear");

  const lockedOverlay = $("lockedOverlay");
  const unlockPill = $("unlockPill");

  const btnScrollDiary = $("btnScrollDiary");
  const btnBackToGame = $("btnBackToGame");
  const btnUnlockAnyway = $("btnUnlockAnyway");

  // -------------------------
  // DOM (Game)
  // -------------------------
  const canvas = $("c");
  const ctx = canvas.getContext("2d");

  function fitCanvas() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
  }

  window.addEventListener("resize", () => {
    fitCanvas();
  });

  const scoreEl = $("score");
  const timeEl = $("time");
  const hitsEl = $("hits");
  const calmFill = $("calmFill");
  const btnStart = $("btnStart");
  const statusText = $("statusText");

 
  let currentUser = null;
  let diaryCache = {}; // { "YYYY-MM-DD": "text" }

  function userDiaryRef() {
    return fs.collection("users").doc(currentUser.uid).collection("diary");
  }

  async function loadDiaryList() {
    if (!currentUser) return;
    diaryCache = {};
    list.innerHTML = `<div class="muted">Loading…</div>`;

    const snap = await userDiaryRef().orderBy("date", "desc").limit(250).get();
    snap.forEach(doc => {
      const data = doc.data() || {};
      if (data.date) diaryCache[data.date] = data.text || "";
    });

    renderList();
  }

  async function loadDay(dateStr) {
    if (!currentUser) return;
    if (diaryCache[dateStr] !== undefined) {
      note.value = diaryCache[dateStr] || "";
      return;
    }

    const docRef = userDiaryRef().doc(dateStr);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      diaryCache[dateStr] = data.text || "";
      note.value = diaryCache[dateStr];
    } else {
      diaryCache[dateStr] = "";
      note.value = "";
    }
  }

  async function saveDay(dateStr, text) {
    if (!currentUser) return;
    const trimmed = (text || "").trim();

    if (!trimmed) {
      await deleteDay(dateStr);
      return;
    }

    await userDiaryRef().doc(dateStr).set({
      date: dateStr,
      text: trimmed,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    diaryCache[dateStr] = trimmed;
    renderList();
  }

  async function deleteDay(dateStr) {
    if (!currentUser) return;
    await userDiaryRef().doc(dateStr).delete();
    delete diaryCache[dateStr];
    note.value = "";
    renderList();
  }

  function showModalForDate(dateStr) {
    ensureModal();
    const text = (diaryCache[dateStr] !== undefined) ? diaryCache[dateStr] : "";
    modalTitleEl.textContent = `Diary — ${dateStr}`;
    modalBodyEl.textContent = text || "(No text saved for this day.)";
    modalOverlay.style.display = "flex";
  }

  function renderList() {
    const dates = Object.keys(diaryCache).sort((a, b) => b.localeCompare(a));
    list.innerHTML = "";

    if (dates.length === 0) {
      list.innerHTML = `<div class="muted">No saved days yet. A tiny note today is a win 🌸</div>`;
      return;
    }

    for (const d of dates) {
      const div = document.createElement("div");
      div.className = "noteItem";
      const preview = (diaryCache[d] || "").split("\n").join(" ").slice(0, 52);

      div.innerHTML = `
        <div>
          <div style="font-weight:900">${d}</div>
          <div class="tag">${preview}${(diaryCache[d] || "").length > 52 ? "…" : ""}</div>
        </div>
        <button class="btn" style="padding:8px 10px; border-radius:12px; font-size:12px;" data-open="${d}">
          Open
        </button>
      `;

      div.addEventListener("click", (e) => {
        if (e.target?.closest(`button[data-open="${d}"]`)) return;
        datePick.value = d;
        loadDay(d);
      });

      div.querySelector(`button[data-open="${d}"]`).addEventListener("click", (e) => {
        e.stopPropagation();
        showModalForDate(d);
      });

      list.appendChild(div);
    }
  }

  // -------------------------
  // Lock / Unlock (session only)
  // -------------------------
  let sessionUnlocked = false;

  function isDiaryLocked() {
    return sessionUnlocked !== true;
  }

  function updateLockUI() {
    const locked = isDiaryLocked();

    lockedOverlay.style.display = locked ? "flex" : "none";
    unlockPill.textContent = locked ? "Locked 🔒 (win the game to unlock)" : "Unlocked ✅";
    btnScrollDiary.disabled = locked;

    note.disabled = locked;
    datePick.disabled = locked;
    btnSave.disabled = locked;
    btnClear.disabled = locked;
  }

  function unlockDiary() {
    sessionUnlocked = true;
    updateLockUI();
  }

  btnUnlockAnyway.addEventListener("click", () => {
    unlockDiary();
    alert("Kai xo she ujmuro midi dawere ha mikvarxar.");
    $("diarySection").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // -------------------------
  // Diary Wiring
  // -------------------------
  datePick.value = todayISO();

  datePick.addEventListener("change", () => loadDay(datePick.value));

  btnSave.addEventListener("click", () => {
    if (isDiaryLocked()) return;
    saveDay(datePick.value, note.value);
    alert("Saved ✅");
  });

  btnClear.addEventListener("click", () => {
    if (isDiaryLocked()) return;
    if (confirm("Delete note for this day?")) deleteDay(datePick.value);
  });

  let saveTimer = null;
  note.addEventListener("input", () => {
    if (isDiaryLocked()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveDay(datePick.value, note.value), 650);
  });

  $("btnScrollDiary").addEventListener("click", () => {
    $("diarySection").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("btnBackToGame").addEventListener("click", () => {
    $("gameSection").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // -------------------------
  // GAME INPUT (Safe)
  // -------------------------
  const keys = Object.create(null);
  let dragging = false;
  let pointer = { x: canvas.width / 2, y: canvas.height / 2 };

  function keyDown(name) { return keys[name] === true; }

  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  function pointerToCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    canvas.setPointerCapture?.(e.pointerId);
    pointer = pointerToCanvas(e);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    pointer = pointerToCanvas(e);
  });

  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    canvas.releasePointerCapture?.(e.pointerId);
  });

  canvas.addEventListener("pointercancel", () => {
    dragging = false;
  });

  canvas.addEventListener("click", (e) => {
    if (!running) return;
    const p = pointerToCanvas(e);
    collectPeonyAtPoint(p.x, p.y);
  });

  // -------------------------
  // GAME STATE
  // -------------------------
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

  let player, peonies, clouds, score, hits, timeLeft, running, timerId;
  running = false;

  function spawnPeony() {
    peonies.push({
      x: rand(40, canvas.width - 40),
      y: rand(40, canvas.height - 40),
      r: 16,
    });
  }

  function spawnCloud() {
    clouds.push({
      x: rand(40, canvas.width - 40),
      y: rand(40, canvas.height - 40),
      r: rand(18, 28),
      vx: rand(-2.2, 2.2),
      vy: rand(-1.8, 1.8),
      cool: 0,
    });
  }

  function setupIdle() {
    fitCanvas();

    player = { x: canvas.width * 0.5, y: canvas.height * 0.75, r: 18, speed: 5.2 };
    peonies = [];
    clouds = [];

    for (let i = 0; i < 10; i++) spawnPeony();
    for (let i = 0; i < 5; i++) spawnCloud();

    score = 0;
    hits = 0;
    timeLeft = 60;

    scoreEl.textContent = score;
    hitsEl.textContent = hits;
    timeEl.textContent = timeLeft;
    calmFill.style.width = "0%";
    statusText.textContent = "Press Start to play 🌸";

    running = false;
    clearInterval(timerId);

    sessionUnlocked = false;
    updateLockUI();
  }

  function resetGame() {
    fitCanvas();

    player = { x: canvas.width * 0.5, y: canvas.height * 0.75, r: 18, speed: 5.2 };
    peonies = [];
    clouds = [];

    score = 0;
    hits = 0;
    timeLeft = 60;
    running = true;

    for (let i = 0; i < 10; i++) spawnPeony();
    for (let i = 0; i < 5; i++) spawnCloud();

    scoreEl.textContent = score;
    hitsEl.textContent = hits;
    timeEl.textContent = timeLeft;
    calmFill.style.width = "0%";
    statusText.textContent = "Status: collecting calm…";

    dragging = false;
    pointer = { x: canvas.width / 2, y: canvas.height / 2 };
    for (const k in keys) delete keys[k];

    clearInterval(timerId);
    timerId = setInterval(() => {
      if (!running) return;
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) endGame(false);
    }, 1000);

    sessionUnlocked = false;
    updateLockUI();
  }

  function endGame(won) {
    running = false;
    clearInterval(timerId);

    if (won) {
      statusText.textContent = "Status: you did it 🌸 Diary unlocked ✅";
      unlockDiary();
      setTimeout(() => $("diarySection").scrollIntoView({ behavior: "smooth", block: "start" }), 450);
    } else {
      statusText.textContent = "Status: breathe. restart when ready.";
    }
  }

  btnStart.addEventListener("click", resetGame);

  function movePlayer() {
    const left  = keyDown("arrowleft") || keyDown("a");
    const right = keyDown("arrowright") || keyDown("d");
    const up    = keyDown("arrowup") || keyDown("w");
    const down  = keyDown("arrowdown") || keyDown("s");

    const vx = ((right ? 1 : 0) - (left ? 1 : 0)) * player.speed;
    const vy = ((down ? 1 : 0) - (up ? 1 : 0)) * player.speed;

    if (dragging) {
      const dx = pointer.x - player.x;
      const dy = pointer.y - player.y;
      if (Number.isFinite(dx) && Number.isFinite(dy)) {
        player.x += dx * 0.15;
        player.y += dy * 0.15;
      }
    } else {
      player.x += vx;
      player.y += vy;
    }

    player.x = clamp(player.x, player.r, canvas.width - player.r);
    player.y = clamp(player.y, player.r, canvas.height - player.r);

    if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) {
      player.x = canvas.width * 0.5;
      player.y = canvas.height * 0.75;
    }
  }

  function updateClouds() {
    for (const c of clouds) {
      c.x += c.vx;
      c.y += c.vy;

      if (c.x < c.r || c.x > canvas.width - c.r) c.vx *= -1;
      if (c.y < c.r || c.y > canvas.height - c.r) c.vy *= -1;

      c.x = clamp(c.x, c.r, canvas.width - c.r);
      c.y = clamp(c.y, c.r, canvas.height - c.r);

      if (c.cool > 0) c.cool--;
    }
  }

  function collectPeonyAtPoint(x, y) {
    for (let i = peonies.length - 1; i >= 0; i--) {
      const p = peonies[i];
      if (dist(x, y, p.x, p.y) < p.r + 18) {
        peonies.splice(i, 1);
        onPeonyCollected();
        return true;
      }
    }
    return false;
  }

  function collectPeoniesByCollision() {
    for (let i = peonies.length - 1; i >= 0; i--) {
      const p = peonies[i];
      if (dist(player.x, player.y, p.x, p.y) < player.r + p.r) {
        peonies.splice(i, 1);
        onPeonyCollected();
      }
    }
  }

  function onPeonyCollected() {
    score++;
    scoreEl.textContent = score;
    calmFill.style.width = Math.min(100, (score / 12) * 100) + "%";

    if (score < 12) spawnPeony();
    if (score >= 12) endGame(true);
  }

  function hitStress() {
    for (const c of clouds) {
      if (c.cool > 0) continue;

      if (dist(player.x, player.y, c.x, c.y) < player.r + c.r) {
        hits++;
        hitsEl.textContent = hits;
        c.cool = 25;

        player.x = clamp(player.x - c.vx * 10, player.r, canvas.width - player.r);
        player.y = clamp(player.y - c.vy * 10, player.r, canvas.height - player.r);

        if (hits >= 4) endGame(false);
      }
    }
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 45; i++) {
      const x = (i * 97) % W;
      const y = (i * 53) % H;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "28px system-ui";
    for (const p of peonies) ctx.fillText("🌸", p.x, p.y);

    ctx.font = "30px system-ui";
    for (const c of clouds) ctx.fillText("☁️", c.x, c.y);

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.32)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "16px system-ui";
    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.fillText("YOU", player.x, player.y - 30);
  }

  function loop() {
    if (running) {
      movePlayer();
      updateClouds();
      collectPeoniesByCollision();
      hitStress();
    } else {
      updateClouds();
    }

    draw();
    requestAnimationFrame(loop);
  }

  // -------------------------
  // AUTH STATE BOOT
  // -------------------------
  setAuthMode("login");
  paintTabs();

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;

      authOverlay.style.display = "none";
      appWrap.style.display = "block";

      sessionUnlocked = false;
      updateLockUI();

      datePick.value = todayISO();
      await loadDiaryList();
      await loadDay(datePick.value);

      fitCanvas();
      setupIdle();
      draw();
    } else {
      currentUser = null;
      diaryCache = {};
      list.innerHTML = "";
      note.value = "";

      appWrap.style.display = "none";
      authOverlay.style.display = "flex";
    }
  });

  fitCanvas();
  setupIdle();
  draw();
  loop();
})();
