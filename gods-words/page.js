// Uses bible-api.com (no key). Fetches verse text from references.
const API_BASE = "https://bible-api.com/";
const TRANSLATION = "kjv";

const FEELINGS = [
  { id: "happy", name: "Happy", emoji: "😊", hint: "joy & gratitude" },
  { id: "grateful", name: "Grateful", emoji: "🙏", hint: "thankfulness" },
  { id: "peaceful", name: "Peaceful", emoji: "🕊️", hint: "rest & calm" },
  { id: "excited", name: "Excited", emoji: "✨", hint: "new beginnings" },

  { id: "scared", name: "Scared", emoji: "😟", hint: "fear & safety" },
  { id: "anxious", name: "Anxious", emoji: "😵‍💫", hint: "overthinking" },
  { id: "nervous", name: "Nervous", emoji: "😬", hint: "uncertainty" },

  { id: "doubtful", name: "Doubtful", emoji: "🤍", hint: "faith feels hard" },
  { id: "confused", name: "Confused", emoji: "🌫️", hint: "need clarity" },
  { id: "decision", name: "Need a decision", emoji: "🧭", hint: "direction & wisdom" },

  { id: "lonely", name: "Lonely", emoji: "🫂", hint: "comfort & presence" },
  { id: "tired", name: "Tired", emoji: "💤", hint: "strength & renewal" }
];

/*
  BIG RELEVANT POOLS (50+ per category)
  These are references, not quoted Bible text. Verse text is fetched live.
*/
const POOLS = {
  happy: [
    "Psalm 16:11","Psalm 19:8","Psalm 30:5","Psalm 32:11","Psalm 33:1","Psalm 34:8",
    "Psalm 35:9","Psalm 37:4","Psalm 40:16","Psalm 47:1","Psalm 63:3-5","Psalm 66:1-2",
    "Psalm 67:1-2","Psalm 68:3","Psalm 92:1-4","Psalm 95:1-2","Psalm 96:1-4","Psalm 97:11-12",
    "Psalm 98:4-6","Psalm 100","Psalm 103:1-5","Psalm 104:33-34","Psalm 105:1-3",
    "Psalm 107:8-9","Psalm 107:21-22","Psalm 118:24","Psalm 126:2-3","Psalm 126:5-6",
    "Psalm 136:1","Psalm 139:14","Nehemiah 8:10","Isaiah 12:2-3","Isaiah 61:10",
    "Habakkuk 3:18-19","Luke 1:46-47","John 15:11","Romans 15:13","Philippians 4:4",
    "1 Peter 1:8","James 1:17","Psalm 145:1-7","Psalm 146:1-2","Psalm 147:1",
    "Psalm 150","Psalm 27:6","Psalm 9:1-2","Psalm 28:7","Psalm 84:10-12"
  ],

  grateful: [
    "Psalm 9:1-2","Psalm 28:7","Psalm 30:12","Psalm 50:14","Psalm 69:30","Psalm 86:12",
    "Psalm 92:1","Psalm 95:2","Psalm 100:4","Psalm 103:2","Psalm 105:1","Psalm 106:1",
    "Psalm 107:1","Psalm 107:8","Psalm 107:15","Psalm 107:21","Psalm 107:31",
    "Psalm 111:1","Psalm 116:12-14","Psalm 118:1","Psalm 118:28-29","Psalm 119:62",
    "Psalm 136:1-3","Psalm 138:1","Psalm 145:10","Psalm 147:7","Daniel 2:20-23",
    "Jonah 2:9","Luke 17:15-19","John 6:11","Romans 8:32","1 Corinthians 15:57",
    "2 Corinthians 9:15","Ephesians 5:20","Colossians 3:15-17","Hebrews 12:28",
    "1 Thessalonians 5:16-18","Philippians 4:6-7","James 1:17","Psalm 34:1",
    "Psalm 40:5","Psalm 103:8-12","Psalm 65:1-2","Psalm 75:1","Psalm 92:4",
    "Psalm 66:8","Psalm 116:17","Psalm 124:1-3","Psalm 136:26","Psalm 30:4"
  ],

  peaceful: [
    "Psalm 4:8","Psalm 23","Psalm 29:11","Psalm 34:14","Psalm 37:7","Psalm 46:10",
    "Psalm 55:22","Psalm 61:1-4","Psalm 62:1-2","Psalm 62:5-8","Psalm 91","Psalm 94:19",
    "Psalm 112:7","Psalm 116:7","Psalm 119:165","Psalm 121","Psalm 125:1","Psalm 131",
    "Psalm 139:23-24","Proverbs 3:5-6","Proverbs 12:20","Proverbs 16:7","Isaiah 26:3",
    "Isaiah 30:15","Isaiah 32:17","Isaiah 41:10","Isaiah 43:1-2","Isaiah 54:10",
    "Matthew 11:28-30","John 14:1","John 14:27","John 16:33","Romans 5:1",
    "Romans 15:13","Philippians 4:6-7","Colossians 3:15","2 Thessalonians 3:16",
    "Hebrews 4:16","Hebrews 13:5-6","1 Peter 5:7","Psalm 16:8","Psalm 18:2",
    "Psalm 27:1","Psalm 31:24","Psalm 46:1","Psalm 57:1","Psalm 73:26",
    "Numbers 6:24-26","Psalm 85:8","Psalm 37:23-24"
  ],

  excited: [
    "Psalm 20:4","Psalm 32:8","Psalm 37:5","Psalm 40:1-3","Psalm 65:11","Psalm 84:11",
    "Psalm 90:17","Psalm 121:8","Psalm 126:3","Psalm 145:18-19","Proverbs 3:5-6",
    "Proverbs 16:3","Proverbs 16:9","Proverbs 19:21","Isaiah 40:31","Isaiah 41:10",
    "Isaiah 43:19","Isaiah 55:12","Jeremiah 29:11","Jeremiah 33:3","Lamentations 3:22-24",
    "Matthew 6:33","John 10:10","Romans 8:28","Romans 15:13","2 Corinthians 5:17",
    "2 Corinthians 9:8","Ephesians 2:10","Ephesians 3:20","Philippians 1:6",
    "Philippians 3:13-14","Colossians 3:23-24","2 Timothy 1:7","Hebrews 10:23",
    "Hebrews 12:1-2","James 1:2-4","1 Peter 1:3-4","1 Peter 5:10",
    "Psalm 18:30","Psalm 27:14","Psalm 31:3","Psalm 23:3","Psalm 37:23-24",
    "Psalm 63:7","Psalm 118:14","Isaiah 12:2","Micah 7:7","Psalm 119:105",
    "Psalm 16:11","Psalm 34:5"
  ],

  scared: [
    "Psalm 3:3-6","Psalm 18:1-3","Psalm 23:4","Psalm 27:1","Psalm 27:13-14","Psalm 31:24",
    "Psalm 34:4","Psalm 34:7","Psalm 34:17-18","Psalm 37:39-40","Psalm 46:1-3","Psalm 46:10",
    "Psalm 56:3-4","Psalm 56:11","Psalm 91","Psalm 112:7","Psalm 118:6","Psalm 121",
    "Psalm 138:3","Proverbs 3:24-26","Isaiah 41:10","Isaiah 43:1-2","Isaiah 54:17",
    "Isaiah 12:2","Isaiah 26:3-4","Deuteronomy 31:6","Joshua 1:9","2 Kings 6:16",
    "Matthew 10:29-31","John 14:27","Romans 8:15","Romans 8:31","Romans 8:38-39",
    "2 Timothy 1:7","Hebrews 13:6","1 John 4:18","1 Peter 5:7",
    "Psalm 9:9-10","Psalm 16:8","Psalm 57:1","Psalm 62:5-8","Psalm 91:14-16",
    "Psalm 119:114","Psalm 145:18-19","Exodus 14:13-14","Exodus 33:14",
    "Isaiah 35:4","Zephaniah 3:17","Psalm 27:3","Psalm 118:14"
  ],

  anxious: [
    "Psalm 13","Psalm 23","Psalm 27:14","Psalm 34:17-18","Psalm 37:7","Psalm 40:1-3",
    "Psalm 42:11","Psalm 46:10","Psalm 55:22","Psalm 61:2","Psalm 62:1-2","Psalm 62:5-8",
    "Psalm 73:26","Psalm 86:5","Psalm 91:1-2","Psalm 94:19","Psalm 119:105","Psalm 121",
    "Psalm 131","Psalm 139:23-24","Psalm 143:8","Proverbs 3:5-6","Proverbs 12:25",
    "Isaiah 26:3","Isaiah 40:31","Isaiah 41:10","Isaiah 43:2","Isaiah 54:10",
    "Matthew 6:25-34","Matthew 11:28-30","John 14:1","John 14:27",
    "Philippians 4:6-7","Colossians 3:15","2 Thessalonians 3:16","Hebrews 4:16",
    "Hebrews 13:5-6","1 Peter 5:7","2 Corinthians 12:9","Romans 15:13",
    "Psalm 56:3-4","Psalm 16:8","Psalm 118:6","Psalm 145:18","Psalm 147:3",
    "Lamentations 3:22-24","Isaiah 30:15"
  ],

  nervous: [
    "Psalm 16:8","Psalm 18:2","Psalm 23:4","Psalm 25:4-5","Psalm 27:1","Psalm 27:13-14",
    "Psalm 31:24","Psalm 32:8","Psalm 34:4","Psalm 37:7","Psalm 46:1","Psalm 55:22",
    "Psalm 56:3-4","Psalm 62:5-8","Psalm 73:26","Psalm 91","Psalm 94:19","Psalm 112:7",
    "Psalm 118:6","Psalm 118:14","Psalm 119:105","Psalm 121","Proverbs 3:5-6",
    "Proverbs 16:9","Proverbs 18:10","Isaiah 26:3","Isaiah 30:15","Isaiah 41:10",
    "Deuteronomy 31:6","Joshua 1:9","John 14:27","John 16:33",
    "Philippians 4:6-7","2 Timothy 1:7","Hebrews 13:6","James 1:5",
    "Psalm 145:18-19","Exodus 33:14","Isaiah 12:2","Romans 8:31",
    "1 Peter 5:7","Matthew 6:34","Psalm 37:23-24","Psalm 138:3",
    "Psalm 46:10","Psalm 61:1-4","Psalm 57:1"
  ],

  doubtful: [
    "Psalm 13","Psalm 16:8","Psalm 23","Psalm 27:13-14","Psalm 34:8","Psalm 37:23-24",
    "Psalm 42:11","Psalm 46:1","Psalm 56:11","Psalm 62:1-2","Psalm 73:26","Psalm 77:11-14",
    "Psalm 86:5","Psalm 91:1-2","Psalm 119:49-50","Psalm 119:114","Psalm 121",
    "Psalm 143:8","Proverbs 3:5-6","Proverbs 30:5","Isaiah 41:10","Isaiah 55:8-9",
    "Lamentations 3:22-24","Mark 9:24","John 20:27-29","Romans 8:28",
    "Romans 8:38-39","2 Corinthians 5:7","Philippians 1:6","Hebrews 10:23",
    "Hebrews 11:1","James 1:5-6","1 Peter 5:7","2 Timothy 1:7",
    "Psalm 145:13-18","Psalm 34:17-18","Psalm 118:14","Psalm 32:8",
    "Isaiah 26:3-4","Romans 15:13","John 14:27","Psalm 27:1",
    "Psalm 37:5","Psalm 56:3-4","Psalm 16:11"
  ],

  confused: [
    "Psalm 5:8","Psalm 16:11","Psalm 25:4-5","Psalm 27:11","Psalm 32:8","Psalm 37:5",
    "Psalm 43:3","Psalm 73:24","Psalm 86:11","Psalm 119:105","Psalm 119:130","Psalm 143:8",
    "Psalm 143:10","Proverbs 2:1-6","Proverbs 3:5-6","Proverbs 4:18","Proverbs 16:9",
    "Proverbs 19:21","Isaiah 30:21","Isaiah 42:16","Jeremiah 33:3","Matthew 6:33",
    "John 8:12","John 16:13","Romans 12:2","1 Corinthians 14:33",
    "Ephesians 1:17-18","Philippians 4:6-7","Colossians 1:9-10","James 1:5",
    "2 Timothy 3:16-17","Psalm 18:28","Psalm 23:3","Psalm 31:3",
    "Psalm 37:23-24","Psalm 46:10","Psalm 121:3-4","Psalm 145:18-19",
    "Isaiah 26:3","Romans 15:13","John 14:27","Psalm 34:5",
    "Psalm 27:14","Psalm 16:8","Psalm 62:5-8","Psalm 32:9"
  ],

  decision: [
    "Psalm 25:4-5","Psalm 27:11","Psalm 32:8","Psalm 37:5","Psalm 37:23-24","Psalm 40:8",
    "Psalm 43:3","Psalm 73:24","Psalm 86:11","Psalm 119:105","Psalm 143:8","Psalm 143:10",
    "Proverbs 3:5-6","Proverbs 4:11","Proverbs 11:14","Proverbs 15:22","Proverbs 16:3",
    "Proverbs 16:9","Proverbs 19:21","Proverbs 20:24","Isaiah 30:21","Isaiah 41:10",
    "Jeremiah 29:11","Jeremiah 33:3","Matthew 6:33","John 10:27",
    "Romans 8:28","Romans 12:2","1 Corinthians 10:31","Philippians 4:6-7",
    "Colossians 3:15","James 1:5","Hebrews 12:1-2","Psalm 121:8",
    "Psalm 20:4","Psalm 34:8","Psalm 18:30","Psalm 16:11",
    "Isaiah 26:3","Micah 6:8","Ephesians 2:10","2 Timothy 1:7",
    "Psalm 46:1","Psalm 62:5-8","Psalm 31:3","Psalm 27:14",
    "Psalm 73:26","Psalm 23:3","Proverbs 2:6","Proverbs 14:12"
  ],

  lonely: [
    "Psalm 16:8","Psalm 23","Psalm 25:16","Psalm 27:10","Psalm 34:18","Psalm 37:28",
    "Psalm 46:1","Psalm 55:16-17","Psalm 62:5-8","Psalm 68:5-6","Psalm 73:23",
    "Psalm 91:1-2","Psalm 121","Psalm 139:7-10","Psalm 142:4-5","Psalm 145:18",
    "Isaiah 41:10","Isaiah 43:2","Isaiah 49:15-16","Deuteronomy 31:6","Joshua 1:9",
    "Matthew 28:20","John 14:18","John 14:27","Romans 8:38-39",
    "2 Corinthians 1:3-4","Hebrews 13:5","1 Peter 5:7",
    "Psalm 31:7","Psalm 40:17","Psalm 63:1-3","Psalm 57:1",
    "Psalm 86:5","Psalm 94:19","Psalm 116:7","Psalm 147:3",
    "Lamentations 3:22-24","Zephaniah 3:17","Romans 15:13",
    "Psalm 27:1","Psalm 118:6","Psalm 34:4","Psalm 46:10",
    "Isaiah 54:10","John 16:33","Psalm 139:1-3","Psalm 23:6",
    "Psalm 16:11","Psalm 121:3-4","Psalm 73:26"
  ],

  tired: [
    "Psalm 18:32-34","Psalm 23","Psalm 27:14","Psalm 28:7","Psalm 34:17-18","Psalm 46:1",
    "Psalm 55:22","Psalm 62:1-2","Psalm 73:26","Psalm 84:5","Psalm 91","Psalm 103:1-5",
    "Psalm 119:28","Psalm 121","Psalm 138:3","Psalm 143:11","Exodus 33:14",
    "Deuteronomy 33:27","Isaiah 40:29-31","Isaiah 41:10","Isaiah 43:2",
    "Matthew 11:28-30","John 15:5","Romans 15:13","2 Corinthians 12:9",
    "Philippians 4:13","Galatians 6:9","Ephesians 3:20","Hebrews 12:3",
    "1 Peter 5:10","2 Thessalonians 3:16","Psalm 16:11","Psalm 37:23-24",
    "Psalm 31:24","Psalm 46:10","Psalm 57:1","Psalm 61:1-4",
    "Lamentations 3:22-24","Isaiah 26:3","Psalm 34:8","Psalm 118:14",
    "Psalm 94:19","Psalm 147:3","Psalm 119:114","Hebrews 4:16",
    "1 Peter 5:7","Romans 8:28","Romans 8:31","Psalm 121:8",
    "Psalm 23:3","Psalm 90:17"
  ]
};

// ---------- DOM ----------
const feelingGrid = document.getElementById("feelingGrid");

const verseModal = document.getElementById("verseModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");

const resultBadge = document.getElementById("resultBadge");
const verseTextEl = document.getElementById("verseText");
const verseRefEl = document.getElementById("verseRef");
const fallbackNote = document.getElementById("fallbackNote");

const copyBtn = document.getElementById("copyBtn");
const newVerseBtn = document.getElementById("newVerseBtn");

let lastFeelingId = null;
let lastReference = null;

// ---------- UI ----------
function buildFeelingList() {
  feelingGrid.innerHTML = "";

  FEELINGS.forEach(f => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feeling-btn";

    btn.innerHTML = `
      <span class="feeling-left">
        <span class="feeling-emoji">${escapeHTML(f.emoji)}</span>
        <span class="feeling-name">${escapeHTML(f.name)}</span>
        <span class="feeling-hint">${escapeHTML(f.hint)}</span>
      </span>
      <span class="feeling-arrow">›</span>
    `;

    btn.addEventListener("click", () => handleFeeling(f.id));
    feelingGrid.appendChild(btn);
  });
}

function openModal() {
  verseModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  verseModal.hidden = true;
  document.body.style.overflow = "";
}

closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !verseModal.hidden) closeModal();
});

function pickReference(feelingId) {
  const pool = POOLS[feelingId] || [];
  if (!pool.length) return null;

  // Avoid repeating the same reference twice in a row
  let ref = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && ref === lastReference) {
    ref = pool[Math.floor(Math.random() * pool.length)];
  }
  return ref;
}

async function handleFeeling(feelingId) {
  lastFeelingId = feelingId;
  fallbackNote.hidden = true;

  const f = FEELINGS.find(x => x.id === feelingId);
  resultBadge.textContent = f ? `${f.emoji} ${f.name}` : feelingId;

  openModal();

  const ref = pickReference(feelingId);
  if (!ref) {
    verseTextEl.textContent = "No verses in this category yet.";
    verseRefEl.textContent = "";
    return;
  }

  lastReference = ref;
  verseTextEl.textContent = "Loading…";
  verseRefEl.textContent = `— ${ref}`;

  const verseText = await fetchVerseText(ref);
  if (!verseText) {
    verseTextEl.textContent = "Couldn’t load verse text right now.";
    fallbackNote.hidden = false;
    return;
  }

  verseTextEl.textContent = verseText.trim();
}

newVerseBtn.addEventListener("click", () => {
  if (!lastFeelingId) return;
  handleFeeling(lastFeelingId);
});

copyBtn.addEventListener("click", async () => {
  const ref = lastReference ? `— ${lastReference}` : "";
  const text = verseTextEl.textContent || "";
  const toCopy = `${text}\n${ref}`.trim();

  try {
    await navigator.clipboard.writeText(toCopy);
    copyBtn.textContent = "Copied ✅";
    setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
  } catch {
    alert("Copy didn’t work here — try selecting the text manually.");
  }
});

// ---------- Fetch ----------
function makeBibleLink(reference) {
  return `${API_BASE}${encodeURIComponent(reference)}?translation=${TRANSLATION}`;
}

async function fetchVerseText(reference) {
  try {
    const res = await fetch(makeBibleLink(reference), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();

    if (typeof data.text === "string" && data.text.trim()) return cleanText(data.text);
    if (Array.isArray(data.verses) && data.verses.length) {
      return cleanText(data.verses.map(v => v.text).join(" "));
    }
    return null;
  } catch {
    return null;
  }
}

function cleanText(t) {
  return t.replace(/\s+\n/g, " ").replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// init
buildFeelingList();
