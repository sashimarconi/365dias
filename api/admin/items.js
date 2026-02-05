const { query } = require("../lib/db");
const { requireAuth } = require("../lib/auth");
const { parseJson } = require("../lib/parse-json");

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) {
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await query(
        "select * from products order by type asc, sort asc, created_at asc"
      );
      res.json({ items: result.rows || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
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

    try {
      const result = await query(
        "insert into products (type, name, description, price_cents, active, sort, image_url) values ($1, $2, $3, $4, $5, $6, $7) returning *",
        [
          item.type,
          item.name,
          item.description,
          item.price_cents,
          item.active,
          item.sort,
          item.image_url,
        ]
      );
      res.json({ item: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
};
