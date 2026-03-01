// api/fdc-search.js

const BAD_WORDS = [
  "burger","sandwich","school","restaurant","fast food","combo","kids",
  "mcdonald","wendy","kfc","taco","pizza","sub","wrap",
  "sauce packet","meal","tv dinner","frozen dinner","microwave",
  "brand","®","™"
];

function norm(s = "") {
  return s
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasBadWords(desc = "") {
  const d = desc.toLowerCase();
  return BAD_WORDS.some(w => d.includes(w));
}

function tokenScore(desc, q) {
  const d = norm(desc);
  const qq = norm(q);
  const dt = new Set(d.split(" ").filter(Boolean));
  const qt = qq.split(" ").filter(Boolean);
  if (!qt.length) return 0;

  let hit = 0;
  for (const t of qt) if (dt.has(t)) hit++;

  // reward exact / startsWith / contains
  let bonus = 0;
  if (d === qq) bonus += 6;
  if (d.startsWith(qq)) bonus += 4;
  if (d.includes(qq)) bonus += 2;

  // shorter names feel more “normal”
  const shortBonus = Math.max(0, 8 - Math.floor(d.length / 12));

  return hit * 10 + bonus + shortBonus;
}

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.status(200).json({ foods: [] });

    const apiKey = process.env.FDC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FDC_API_KEY" });

    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", apiKey);

    const r = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: q,
        pageSize: 50,
        // ✅ Clean foods only
        dataType: ["Foundation", "SR Legacy"]
      })
    });

    if (!r.ok) {
      return res.status(500).json({ error: "Search failed" });
    }

    const data = await r.json();
    let foods = (data.foods || []).map(f => ({
      fdcId: f.fdcId,
      description: f.description,
      dataType: f.dataType,
      foodCategory: f.foodCategory
    }));

    // remove junk words
    foods = foods.filter(f => !hasBadWords(f.description || ""));

    // dedupe by normalized description
    const seen = new Set();
    foods = foods.filter(f => {
      const k = norm(f.description || "");
      if (!k) return false;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // rank by “how human” it looks + token match
    foods.sort((a, b) =>
      tokenScore(b.description, q) - tokenScore(a.description, q)
    );

    // limit options
    foods = foods.slice(0, 12);

    res.status(200).json({ foods });
  } catch (e) {
    res.status(500).json({ error: "Search failed" });
  }
}
