function pickAmount(foodNutrients, matchFn) {
  const n = (foodNutrients || []).find(fn =>
    matchFn((fn.nutrient?.name || "").toLowerCase())
  );
  const amt = n?.amount;
  return Number.isFinite(amt) ? amt : 0;
}

export default async function handler(req, res) {
  try {
    const fdcId = String(req.query.fdcId || "").trim();
    if (!fdcId) return res.status(400).json({ error: "Missing fdcId" });

    const apiKey = process.env.FDC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing FDC_API_KEY" });

    const url = new URL(`https://api.nal.usda.gov/fdc/v1/food/${encodeURIComponent(fdcId)}`);
    url.searchParams.set("api_key", apiKey);

    const r = await fetch(url.toString());
    const food = await r.json();

    const label = food.description || "Food";
    const dataType = food.dataType || "Unknown";

    const kcal =
      pickAmount(food.foodNutrients, (n) => n === "energy") ||
      pickAmount(food.foodNutrients, (n) => n.includes("metabolizable energy"));

    const protein = pickAmount(food.foodNutrients, (n) => n === "protein");
    const fat = pickAmount(food.foodNutrients, (n) => n.includes("total lipid"));
    const carbs = pickAmount(food.foodNutrients, (n) => n.includes("carbohydrate"));

    res.status(200).json({
      label,
      dataType,
      per100: { cals: kcal, p: protein, c: carbs, f: fat }
    });
  } catch (e) {
    res.status(500).json({ error: "Food lookup failed" });
  }
}