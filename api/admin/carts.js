const { query } = require("../lib/db");
const { requireAuth } = require("../lib/auth");
const { ensureSalesTables } = require("../lib/ensure-sales");

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) {
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await ensureSalesTables();

    const [cartsResult, statsResult] = await Promise.all([
      query(
        `select id, cart_key, customer, summary, stage, status, total_cents, last_seen, created_at
         from checkout_carts
         order by last_seen desc
         limit 200`
      ),
      query(
        `select
           count(*) as total,
           count(*) filter (where status = 'open') as open,
           count(*) filter (where status = 'converted') as converted,
           coalesce(sum(total_cents),0) as total_value
         from checkout_carts`
      ),
    ]);

    res.json({
      carts: cartsResult.rows || [],
      stats: statsResult.rows?.[0] || { total: 0, open: 0, converted: 0, total_value: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
