const { supabase } = require("../../lib/supabase");
const { requireAuth } = require("../../lib/auth");
const { parseJson } = require("../../lib/parse-json");

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) {
    return;
  }

  const { id } = req.query || {};
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  if (req.method === "PUT") {
    const body = await parseJson(req);
    const updates = {
      type: body.type,
      name: body.name,
      description: body.description || "",
      price_cents: Number(body.price_cents || 0),
      active: body.active !== false,
      sort: Number(body.sort || 0),
      image_url: body.image_url || "",
    };

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ item: data });
    return;
  }

  if (req.method === "DELETE") {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ ok: true });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
