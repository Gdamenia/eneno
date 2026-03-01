// /api/fdc-search.js

function norm(s = "") {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensFrom(q = "") {
  return norm(q).split(" ").filter(Boolean);
}

function datasetScore(dt = "") {
  if (dt === "Foundation") return 100;
  if (dt === "SR Legacy") return 90;
  if (dt === "Survey (FNDDS)") return 80;
  return 0;
}

function isJunk(desc = "") {
  const d = desc.toLowerCase();

  // Anything that’s not “normal cooking food”
  const BAD = [
    // places / brands / products
    "restaurant","school","cafeteria","fast food","takeout","ready-to-eat",
    "mcdonald","burger king","wendy","kfc","subway","starbucks",
    "trader joe","walmart","costco","kroger","aldi","whole foods",
    "brand","branded","®","™",

    // baby / pet / supplement / alcohol
    "infant","baby","toddler","formula",
    "pet","dog","cat",
    "supplement","protein powder","preworkout","meal replacement",
    "beer","wine","vodka","whiskey","rum",

    // ultra processed meals
    "pizza","burrito","taco","sandwich","burger","nugget","hot dog",
    "frozen dinner","microwave","tv dinner",

    // weird meats (remove confusing stuff)
    "emu","ostrich","venison","elk","bison","boar","rabbit","duck","goose","kangaroo"
  ];

  if (BAD.some(w => d.includes(w))) return true;

  // too long descriptions are usually product-like
  if (d.length > 90) return true;

  return false;
}

// Must include query words (prevents “burger” when user wants “chicken fillet”)
function matchesQuery(desc = "", qTokens = []) {
  const d = norm(desc);
  const t = qTokens.filter(x => x.length >= 2);
  if (!t.length) return true;
  return t.every(w => d.includes(w));
}

// Boost “basic foods”
function basicBoost(desc = "") {
  const d = desc.toLowerCase();
  let s = 0;

  // good words
  const GOOD = [
    "raw","cooked","baked","boiled","grilled",
    "breast","fillet","filet","loin","thigh",
    "plain","without","unsalted","no salt"
  ];

  // bad words
  const BAD = [
    "breaded","fried","with sauce","sweetened",
    "ready-to-eat","seasoned","marinated"
  ];

  if (GOOD.some(w => d.includes(w))) s += 20;
  if (BAD.some(w => d.includes(w))) s -= 15;

  return s;
}

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.status(200).json({ foods: [] });

    const apiKey = process.env.FDC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FDC_API_KEY" });

    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", q);
    url.searchParams.set("pageSize", "60"); // get more, then filter hard

    const r = await fetch(url.toString());
    const data = await r.json();

    const qTokens = tokensFrom(q);

    let foods = (data.foods || []).map(f => ({
      fdcId: f.fdcId,
      description: f.description,
      dataType: f.dataType,
      foodCategory: f.foodCategory
    }));

    // 1) remove branded completely
    foods = foods.filter(f => f.dataType !== "Branded");

    // 2) remove junk by keywords
    foods = foods.filter(f => !isJunk(f.description || ""));

    // 3) enforce query word matching
    foods = foods.filter(f => matchesQuery(f.description || "", qTokens));

    // 4) dedupe
    const seen = new Set();
    foods = foods.filter(f => {
      const k = norm(f.description || "");
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // 5) rank
    foods.sort((a, b) => {
      const sa =
        datasetScore(a.dataType) +
        basicBoost(a.description || "") -
        (a.description?.length || 0) * 0.2;

      const sb =
        datasetScore(b.dataType) +
        basicBoost(b.description || "") -
        (b.description?.length || 0) * 0.2;

      return sb - sa;
    });

    // 6) return clean top 10
    return res.status(200).json({ foods: foods.slice(0, 10) });
  } catch (e) {
    return res.status(500).json({ error: "Search failed" });
  }
}
