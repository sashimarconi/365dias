const { query } = require("../lib/db");
const { requireAuth } = require("../lib/auth");
const { parseJson } = require("../lib/parse-json");

function normalizeItemPayload(body = {}) {
  return {
    type: body.type,
    name: body.name,
    description: body.description || "",
    price_cents: Number(body.price_cents || 0),
    compare_price_cents:
      body.compare_price_cents === undefined || body.compare_price_cents === null || body.compare_price_cents === ""
        ? null
        : Number(body.compare_price_cents),
    active: body.active !== false,
    sort: Number(body.sort || 0),
    image_url: body.image_url || "",
  };
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) {
    return;
  }

  const { id } = req.query || {};

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
    const item = normalizeItemPayload(await parseJson(req));
    if (!item.type || !item.name) {
      res.status(400).json({ error: "Missing type or name" });
      return;
    }

    try {
      const result = await query(
        "insert into products (type, name, description, price_cents, compare_price_cents, active, sort, image_url) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *",
        [
          item.type,
          item.name,
          item.description,
          item.price_cents,
          item.compare_price_cents,
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

  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  if (req.method === "PUT") {
    const updates = normalizeItemPayload(await parseJson(req));
    try {
      const result = await query(
        "update products set type = $1, name = $2, description = $3, price_cents = $4, compare_price_cents = $5, active = $6, sort = $7, image_url = $8 where id = $9 returning *",
        [
          updates.type,
          updates.name,
          updates.description,
          updates.price_cents,
          updates.compare_price_cents,
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
