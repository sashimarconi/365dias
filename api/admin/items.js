const { supabase } = require("../lib/supabase");
const { requireAuth } = require("../lib/auth");
const { parseJson } = require("../lib/parse-json");

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) {
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("type", { ascending: true })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ items: data || [] });
    return;
  }

  if (req.method === "POST") {
    const body = await parseJson(req);
    const item = {
      type: body.type,
      name: body.name,
      description: body.description || "",
      price_cents: Number(body.price_cents || 0),
      active: body.active !== false,
      sort: Number(body.sort || 0),
      image_url: body.image_url || "",
    };

    if (!item.type || !item.name) {
      res.status(400).json({ error: "Missing type or name" });
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert(item)
      .select("*")
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ item: data });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
