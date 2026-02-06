const loginSection = document.getElementById("login");
const panelSection = document.getElementById("panel");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");
const newItemForm = document.getElementById("new-item");
const itemsContainer = document.getElementById("items");
const panelTabs = document.querySelectorAll(".panel-tab");
const statsUpdated = document.getElementById("stats-updated");
const timelineBody = document.getElementById("timeline-body");
const statElements = {
  online: document.getElementById("stat-online"),
  visitors: document.getElementById("stat-visitors"),
  checkoutVisits: document.getElementById("stat-checkout-visits"),
  checkoutStarts: document.getElementById("stat-checkout-starts"),
  pix: document.getElementById("stat-pix"),
  purchases: document.getElementById("stat-purchases"),
  conversion: document.getElementById("stat-conversion"),
};
const funnelValues = {
  visitors: document.getElementById("funnel-visitors"),
  checkout: document.getElementById("funnel-checkout"),
  starts: document.getElementById("funnel-starts"),
  purchases: document.getElementById("funnel-purchases"),
};
const funnelBars = {
  visitors: document.getElementById("funnel-visitors-bar"),
  checkout: document.getElementById("funnel-checkout-bar"),
  starts: document.getElementById("funnel-starts-bar"),
  purchases: document.getElementById("funnel-purchases-bar"),
};
const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const DASHBOARD_INTERVAL = 15000;

let token = localStorage.getItem("admin_token") || "";
let summaryInterval = null;

function setAuthHeader() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function login() {
  loginError.textContent = "";
  const password = passwordInput.value;
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const data = await res.json();
  if (!res.ok) {
    loginError.textContent = data.error || "Erro no login";
    return;
  }

  token = data.token;
  localStorage.setItem("admin_token", token);
  showPanel();
}

function showPanel() {
  loginSection.classList.add("hidden");
  loginSection.hidden = true;
  panelSection.classList.remove("hidden");
  panelSection.hidden = false;
  startSummaryPolling();
  loadItems();
}

function showLogin() {
  loginSection.classList.remove("hidden");
  loginSection.hidden = false;
  panelSection.classList.add("hidden");
  panelSection.hidden = true;
  stopSummaryPolling();
}

function startSummaryPolling() {
  stopSummaryPolling();
  loadSummary();
  summaryInterval = setInterval(loadSummary, DASHBOARD_INTERVAL);
}

function stopSummaryPolling() {
  if (summaryInterval) {
    clearInterval(summaryInterval);
    summaryInterval = null;
  }
}

async function loadItems() {
  const res = await fetch("/api/admin/items", {
    headers: { ...setAuthHeader() },
  });
  const data = await res.json();
  if (!res.ok) {
    showLogin();
    return;
  }
  renderItems(data.items || []);
}

async function loadSummary() {
  const res = await fetch("/api/analytics/summary", {
    headers: { ...setAuthHeader() },
  });

  if (!res.ok) {
    if (res.status === 401) {
      showLogin();
    }
    return;
  }

  const data = await res.json();
  renderSummary(data);
}

function formatNumber(value) {
  return numberFormatter.format(value || 0);
}

function formatPercent(value) {
  return `${percentFormatter.format(value || 0)}%`;
}

function renderSummary(data = {}) {
  statElements.online.textContent = formatNumber(data.onlineNow);
  statElements.visitors.textContent = formatNumber(data.visitorsToday);
  statElements.checkoutVisits.textContent = formatNumber(data.checkoutVisitsToday);
  statElements.checkoutStarts.textContent = formatNumber(data.checkoutStartsToday);
  statElements.pix.textContent = formatNumber(data.pixGeneratedToday);
  statElements.purchases.textContent = formatNumber(data.purchasesToday);
  statElements.conversion.textContent = formatPercent(data.conversionRate);

  if (statsUpdated) {
    const updatedAt = new Date();
    statsUpdated.textContent = `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  updateFunnel(data);
  renderTimeline(data.timeline || []);
}

function updateFunnel(data) {
  const visitors = Number(data.visitorsToday) || 0;
  const checkout = Number(data.checkoutVisitsToday) || 0;
  const starts = Number(data.checkoutStartsToday) || 0;
  const purchases = Number(data.purchasesToday) || 0;
  const base = Math.max(visitors, 1);

  funnelValues.visitors.textContent = formatNumber(visitors);
  funnelValues.checkout.textContent = formatNumber(checkout);
  funnelValues.starts.textContent = formatNumber(starts);
  funnelValues.purchases.textContent = formatNumber(purchases);

  funnelBars.visitors.style.width = "100%";
  funnelBars.checkout.style.width = `${Math.min(100, (checkout / base) * 100).toFixed(2)}%`;
  funnelBars.starts.style.width = `${Math.min(100, (starts / base) * 100).toFixed(2)}%`;
  funnelBars.purchases.style.width = `${Math.min(100, (purchases / base) * 100).toFixed(2)}%`;
}

function renderTimeline(rows) {
  if (!timelineBody) {
    return;
  }

  if (!rows.length) {
    timelineBody.innerHTML = `<tr><td colspan="5">Sem dados nas últimas horas.</td></tr>`;
    return;
  }

  const html = rows
    .map((row) => {
      const date = row.bucket ? new Date(row.bucket) : null;
      const label = date
        ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "--";
      return `
        <tr>
          <td>${label}</td>
          <td>${formatNumber(row.visits)}</td>
          <td>${formatNumber(row.checkoutViews)}</td>
          <td>${formatNumber(row.checkoutStarts)}</td>
          <td>${formatNumber(row.pix)}</td>
        </tr>
      `;
    })
    .join("");

  timelineBody.innerHTML = html;
}

function renderItems(items) {
  itemsContainer.innerHTML = "";
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div><strong>${item.type.toUpperCase()}</strong> - ${item.name}</div>
      <div class="item__row">
        <input data-field="name" value="${item.name || ""}" />
        <input data-field="description" value="${item.description || ""}" />
        <input data-field="price_cents" type="number" value="${
          item.price_cents || 0
        }" />
        <input data-field="compare_price_cents" type="number" value="${
          item.compare_price_cents || ""
        }" placeholder="Preço antigo" />
        <input data-field="sort" type="number" value="${item.sort || 0}" />
        <input data-field="image_url" value="${item.image_url || ""}" />
      </div>
      <div class="item__row">
        <select data-field="type">
          <option value="base" ${item.type === "base" ? "selected" : ""}>Base</option>
          <option value="bump" ${item.type === "bump" ? "selected" : ""}>Bump</option>
          <option value="upsell" ${item.type === "upsell" ? "selected" : ""}>Upsell</option>
          <option value="shipping" ${item.type === "shipping" ? "selected" : ""}>Frete</option>
        </select>
        <select data-field="active">
          <option value="true" ${item.active ? "selected" : ""}>Ativo</option>
          <option value="false" ${!item.active ? "selected" : ""}>Inativo</option>
        </select>
      </div>
      <div class="item__actions">
        <button data-action="save">Salvar</button>
        <button data-action="delete" class="ghost">Excluir</button>
      </div>
    `;

    el.querySelector("[data-action=save]").addEventListener("click", async () => {
      const payload = collectItem(el);
      await updateItem(item.id, payload);
    });

    el.querySelector("[data-action=delete]").addEventListener("click", async () => {
      if (!confirm("Excluir item?")) {
        return;
      }
      await deleteItem(item.id);
    });

    itemsContainer.appendChild(el);
  });
}

function collectItem(el) {
  const payload = {};
  el.querySelectorAll("[data-field]").forEach((input) => {
    payload[input.dataset.field] = input.value;
  });
  payload.active = payload.active === "true";
  payload.price_cents = Number(payload.price_cents || 0);
  if (payload.compare_price_cents !== undefined) {
    payload.compare_price_cents = payload.compare_price_cents
      ? Number(payload.compare_price_cents)
      : null;
  }
  payload.sort = Number(payload.sort || 0);
  return payload;
}

async function updateItem(id, payload) {
  await fetch(`/api/admin/items/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
  loadItems();
}

async function deleteItem(id) {
  await fetch(`/api/admin/items/${id}`, {
    method: "DELETE",
    headers: { ...setAuthHeader() },
  });
  loadItems();
}

newItemForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(newItemForm);
  const payload = Object.fromEntries(formData.entries());
  payload.active = payload.active === "true";
  payload.price_cents = Number(payload.price_cents || 0);
  payload.compare_price_cents = payload.compare_price_cents
    ? Number(payload.compare_price_cents)
    : null;
  payload.sort = Number(payload.sort || 0);

  await fetch("/api/admin/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...setAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  newItemForm.reset();
  loadItems();
});

loginBtn.addEventListener("click", login);
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  login();
});
logoutBtn.addEventListener("click", () => {
  token = "";
  localStorage.removeItem("admin_token");
  showLogin();
});

panelTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.classList.contains("is-active")) {
      return;
    }
    panelTabs.forEach((btn) => btn.classList.remove("is-active"));
    tab.classList.add("is-active");
    const targetId = tab.dataset.target;
    document.querySelectorAll(".panel-view").forEach((section) => {
      section.classList.toggle("hidden", section.id !== targetId);
    });
  });
});

if (token) {
  loadItems();
} else {
  showLogin();
}
