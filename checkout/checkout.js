const form = document.getElementById("checkout-form");
const payBtn = document.getElementById("pay-btn");
const pixResult = document.getElementById("pix-result");
const pixQr = document.getElementById("pix-qr");
const pixCode = document.getElementById("pix-code");
const copyBtn = document.getElementById("copy-btn");
const productCover = document.getElementById("product-cover");
const productTitle = document.getElementById("product-title");
const productDescription = document.getElementById("product-description");
const productPrice = document.getElementById("product-price");
const addonsSection = document.getElementById("addons-section");
const addonsList = document.getElementById("addons-list");
const selectAll = document.getElementById("select-all");
const summaryLines = document.getElementById("summary-lines");
const summarySubtotal = document.getElementById("summary-subtotal");
const summaryDiscount = document.getElementById("summary-discount");
const summaryTotal = document.getElementById("summary-total");
const paymentButtons = document.querySelectorAll(".payment-option");
const pixDiscountPill = document.getElementById("pix-discount-pill");

const PIX_DISCOUNT_PERCENT = 0.15;

if (pixDiscountPill) {
  pixDiscountPill.textContent = `${Math.round(PIX_DISCOUNT_PERCENT * 100)}% OFF`;
}

let offerData = null;
let selectedBumps = new Set();
let bumpMap = new Map();
let paymentMethod = "pix";

function formatPrice(cents) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const utm = {};
  params.forEach((value, key) => {
    if (key.startsWith("utm_")) {
      utm[key] = value;
    }
  });
  return utm;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : "";
}

function calcSubtotal() {
  const base = offerData?.base?.price_cents || 0;
  let total = base;
  selectedBumps.forEach((id) => {
    const bump = bumpMap.get(id);
    if (bump) {
      total += bump.price_cents;
    }
  });
  return total;
}

function calcDiscount(subtotal) {
  if (paymentMethod !== "pix") {
    return 0;
  }
  return Math.floor(subtotal * PIX_DISCOUNT_PERCENT);
}

function calcTotal() {
  const subtotal = calcSubtotal();
  const discount = calcDiscount(subtotal);
  return Math.max(subtotal - discount, 0);
}

function updateSummary() {
  if (!offerData?.base) {
    summaryLines.innerHTML = "";
    summarySubtotal.textContent = "R$ 0,00";
    summaryDiscount.textContent = "R$ 0,00";
    summaryTotal.textContent = "R$ 0,00";
    return;
  }

  const lines = [
    {
      label: offerData.base.name,
      value: offerData.base.price_cents,
    },
  ];

  selectedBumps.forEach((id) => {
    const bump = bumpMap.get(id);
    if (bump) {
      lines.push({ label: bump.name, value: bump.price_cents });
    }
  });

  summaryLines.innerHTML = lines
    .map(
      (line) => `
        <div class="summary__line">
          <span>${line.label}</span>
          <strong>R$ ${formatPrice(line.value)}</strong>
        </div>
      `
    )
    .join("");

  const subtotal = calcSubtotal();
  const discount = calcDiscount(subtotal);
  summarySubtotal.textContent = `R$ ${formatPrice(subtotal)}`;
  summaryDiscount.textContent = discount
    ? `-R$ ${formatPrice(discount)}`
    : "R$ 0,00";
  summaryTotal.textContent = `R$ ${formatPrice(subtotal - discount)}`;
}

function renderBumps(bumps = []) {
  bumpMap = new Map();
  selectedBumps.clear();
  selectAll.checked = false;

  if (!bumps.length) {
    addonsSection.classList.add("hidden");
    addonsList.innerHTML = "";
    updateSummary();
    return;
  }

  addonsSection.classList.remove("hidden");
  addonsList.innerHTML = bumps
    .map((bump) => {
      bumpMap.set(bump.id, bump);
      const image = bump.image_url || productCover.src;
      return `
        <label class="addon-card">
          <input type="checkbox" data-bump-id="${bump.id}" />
          <div class="addon-card__media">
            <img src="${image}" alt="${bump.name}" />
          </div>
          <div class="addon-card__body">
            <p class="addon-card__title">${bump.name}</p>
            <p class="addon-card__price">R$ ${formatPrice(bump.price_cents)}</p>
          </div>
        </label>
      `;
    })
    .join("");

  addonsList.querySelectorAll("input[data-bump-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.getAttribute("data-bump-id");
      if (input.checked) {
        selectedBumps.add(id);
      } else {
        selectedBumps.delete(id);
      }
      const allChecked =
        selectedBumps.size === Array.from(bumpMap.keys()).length &&
        selectedBumps.size > 0;
      selectAll.checked = allChecked;
      updateSummary();
    });
  });

  updateSummary();
}

if (selectAll) {
  selectAll.addEventListener("change", () => {
    const shouldSelect = selectAll.checked;
    addonsList.querySelectorAll("input[data-bump-id]").forEach((input) => {
      input.checked = shouldSelect;
      const id = input.getAttribute("data-bump-id");
      if (shouldSelect) {
        selectedBumps.add(id);
      } else {
        selectedBumps.delete(id);
      }
    });
    updateSummary();
  });
}

paymentButtons.forEach((button) => {
  const method = button.getAttribute("data-method");
  if (button.dataset.disabled === "true") {
    button.addEventListener("click", () => {
      alert("Cartão de crédito disponível em breve. Use Pix e ganhe 15% OFF.");
    });
    return;
  }

  button.addEventListener("click", () => {
    paymentMethod = method;
    paymentButtons.forEach((btn) => btn.classList.remove("is-active"));
    button.classList.add("is-active");
    updateSummary();
  });
});

async function loadOffer() {
  const res = await fetch("/api/public/offer");
  const data = await res.json();
  offerData = data;

  if (!offerData?.base) {
    productTitle.textContent = "Oferta não configurada";
    return;
  }

  const base = offerData.base;
  productTitle.textContent = base.name;
  productDescription.textContent = base.description ||
    "Receba seu material imediatamente após a confirmação.";
  productPrice.textContent = `R$ ${formatPrice(base.price_cents)}`;
  if (base.image_url) {
    productCover.src = base.image_url;
  } else {
    productCover.src = "https://dummyimage.com/200x280/f0f0f0/aaa&text=Livro";
  }

  renderBumps(offerData.bumps || []);
  updateSummary();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!offerData?.base) {
    return;
  }

  if (paymentMethod !== "pix") {
    alert("Por enquanto estamos processando apenas via Pix.");
    return;
  }

  const formData = new FormData(form);
  const email = formData.get("email");
  const emailConfirm = formData.get("email_confirm");
  if (email && emailConfirm && email !== emailConfirm) {
    alert("Os e-mails digitados não conferem.");
    return;
  }

  payBtn.disabled = true;
  const originalText = payBtn.textContent;
  payBtn.textContent = "Gerando Pix...";

  const customer = {
    name: formData.get("name"),
    email,
    cellphone: formData.get("cellphone"),
    taxId: formData.get("taxId"),
  };

  const payload = {
    amount: calcTotal(),
    description: offerData.base.name,
    customer,
    tracking: {
      utm: getUtmParams(),
      src: window.location.href,
    },
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    user_agent: navigator.userAgent,
  };

  try {
    const res = await fetch("/api/create-pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Erro ao gerar Pix");
      return;
    }

    pixQr.src = data.pix_qr_code;
    pixCode.value = data.pix_code;
    pixResult.classList.remove("hidden");
    pixResult.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    alert("Erro na conexão com Pix");
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = originalText;
  }
});

copyBtn.addEventListener("click", async () => {
  if (!pixCode.value) return;
  await navigator.clipboard.writeText(pixCode.value);
  copyBtn.textContent = "Copiado";
  setTimeout(() => {
    copyBtn.textContent = "Copiar código";
  }, 1500);
});

loadOffer();
