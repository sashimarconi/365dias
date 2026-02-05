const { supabase } = require("../lib/supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const baseRes = await supabase
    .from("products")
    .select("*")
    .eq("type", "base")
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  const bumpRes = await supabase
    .from("products")
    .select("*")
    .eq("type", "bump")
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  const upsellRes = await supabase
    .from("products")
    .select("*")
    .eq("type", "upsell")
    .eq("active", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });

  if (baseRes.error || bumpRes.error || upsellRes.error) {
    res.status(500).json({
      error:
        baseRes.error?.message ||
        bumpRes.error?.message ||
        upsellRes.error?.message,
    });
    return;
  }

  res.json({
    base: baseRes.data?.[0] || null,
    bumps: bumpRes.data || [],
    upsells: upsellRes.data || [],
  });
};
