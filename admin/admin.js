const loginSection = document.getElementById("login");
const panelSection = document.getElementById("panel");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");
const newItemForm = document.getElementById("new-item");
const itemsContainer = document.getElementById("items");

let token = localStorage.getItem("admin_token") || "";

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
  loadItems();
}

function showLogin() {
  loginSection.classList.remove("hidden");
  loginSection.hidden = false;
  panelSection.classList.add("hidden");
  panelSection.hidden = true;
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

if (token) {
  loadItems();
} else {
  showLogin();
}
