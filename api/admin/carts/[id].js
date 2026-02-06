const { query } = require("../../lib/db");
const { requireAuth } = require("../../lib/auth");
const { ensureSalesTables } = require("../../lib/ensure-sales");

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) {
    return;
  }

  const { id } = req.query || {};
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureSalesTables();
    const result = await query("select * from checkout_carts where id = $1", [id]);
    if (!result.rows?.length) {
      res.status(404).json({ error: "Cart not found" });
      return;
    }
    res.json({ cart: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
