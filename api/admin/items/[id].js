const { query } = require("../../lib/db");
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

    try {
      const result = await query(
        "update products set type = $1, name = $2, description = $3, price_cents = $4, active = $5, sort = $6, image_url = $7 where id = $8 returning *",
        [
          updates.type,
          updates.name,
          updates.description,
          updates.price_cents,
          updates.active,
          updates.sort,
          updates.image_url,
          id,
        ]
      );
      res.json({ item: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      await query("delete from products where id = $1", [id]);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
