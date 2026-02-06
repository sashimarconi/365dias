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

    const [ordersResult, statsResult] = await Promise.all([
      query(
        `select id, cart_key, customer, summary, status, pix, created_at
         from checkout_orders
         order by created_at desc
         limit 150`
      ),
      query(
        `select
           count(*) as total,
           count(*) filter (where status = 'pending') as pending,
           count(*) filter (where status = 'paid') as paid,
           coalesce(sum(total_cents),0) as total_amount
         from checkout_orders`
      ),
    ]);

    res.json({
      orders: ordersResult.rows || [],
      stats: statsResult.rows?.[0] || { total: 0, pending: 0, paid: 0, total_amount: 0 },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
