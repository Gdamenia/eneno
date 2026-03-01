export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.status(200).json({ foods: [] });

    const apiKey = process.env.FDC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FDC_API_KEY" });

    const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("query", q);
    url.searchParams.set("pageSize", "20");

    const r = await fetch(url.toString());
    const data = await r.json();

    const foods = (data.foods || []).map(f => ({
      fdcId: f.fdcId,
      description: f.description,
      dataType: f.dataType,
      foodCategory: f.foodCategory
    }));

    res.status(200).json({ foods });
  } catch (e) {
    res.status(500).json({ error: "Search failed" });
  }
}