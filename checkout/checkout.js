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
const selectAllText = document.getElementById("select-all-text");
const summaryLines = document.getElementById("summary-lines");
const summarySubtotal = document.getElementById("summary-subtotal");
const summaryDiscount = document.getElementById("summary-discount");
const summaryTotal = document.getElementById("summary-total");
const summaryCount = document.getElementById("summary-count");
const cepInput = document.getElementById("cep");
const cepError = document.getElementById("cep-error");
const addressInputs = {
  street: document.getElementById("address-street"),
  number: document.getElementById("address-number"),
  complement: document.getElementById("address-complement"),
  neighborhood: document.getElementById("address-neighborhood"),
  city: document.getElementById("address-city"),
  state: document.getElementById("address-state"),
  country: document.getElementById("address-country"),
};

const PIX_DISCOUNT_PERCENT = 0.15;

let offerData = null;
let selectedBumps = new Set();
let bumpMap = new Map();
let lastCepFilled = "";

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
    if (summaryCount) summaryCount.textContent = "0 itens";
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
  const total = Math.max(subtotal - discount, 0);
  summarySubtotal.textContent = `R$ ${formatPrice(subtotal)}`;
  summaryDiscount.textContent = `-R$ ${formatPrice(discount)}`;
  summaryTotal.textContent = `R$ ${formatPrice(total)}`;
  if (summaryCount) {
    const countText = `${lines.length} ${lines.length === 1 ? "item" : "itens"}`;
    summaryCount.textContent = countText;
  }
}

function setSelectAllLabel(allSelected) {
  if (!selectAllText) return;
  selectAllText.textContent = allSelected ? "Desmarcar todos" : "Selecionar todos";
}

function syncSelectAllState() {
  if (!selectAll) return;
  const total = bumpMap.size;
  const allSelected = total > 0 && selectedBumps.size === total;
  selectAll.checked = allSelected;
  setSelectAllLabel(allSelected);
}

function normalizeCep(value = "") {
  return value.replace(/\D/g, "").slice(0, 8);
}

function formatCepDisplay(value = "") {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function clearAddressFields() {
  Object.entries(addressInputs).forEach(([key, input]) => {
    if (!input) return;
    if (key === "country") {
      input.value = "Brasil";
      return;
    }
    if (key === "number" || key === "complement") {
      return;
    }
    input.value = "";
  });
}

function fillAddressFields(data) {
  if (addressInputs.street) addressInputs.street.value = data.logradouro || "";
  if (addressInputs.neighborhood) addressInputs.neighborhood.value = data.bairro || "";
  if (addressInputs.city) addressInputs.city.value = data.localidade || "";
  if (addressInputs.state) addressInputs.state.value = data.uf || "";
  if (addressInputs.country && !addressInputs.country.value) {
    addressInputs.country.value = "Brasil";
  }
}

function showCepError(message) {
  if (!cepError) return;
  if (message) {
    cepError.textContent = message;
    cepError.classList.remove("hidden");
  } else {
    cepError.classList.add("hidden");
    cepError.textContent = "";
  }
}

async function lookupCep(value) {
  const cep = normalizeCep(value);
  if (cep.length !== 8) {
    showCepError("Informe um CEP com 8 dígitos.");
    clearAddressFields();
    return;
  }

  showCepError("");
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) {
      throw new Error("CEP inválido");
    }
    const data = await response.json();
    if (data.erro) {
      throw new Error("CEP não encontrado");
    }
    fillAddressFields(data);
    cepInput.value = formatCepDisplay(data.cep);
    lastCepFilled = data.cep;
  } catch (error) {
    showCepError("Não foi possível localizar o CEP informado.");
    clearAddressFields();
  }
}

function renderBumps(bumps = []) {
  bumpMap = new Map();
  selectedBumps.clear();
  selectAll.checked = false;
  setSelectAllLabel(false);

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
          <div class="addon-card__content">
            <span class="addon-card__tag">Oferta adicionada</span>
            <div class="addon-card__info">
              <div class="addon-card__media">
                <img src="${image}" alt="${bump.name}" />
              </div>
              <div class="addon-card__body">
                <p class="addon-card__title">${bump.name}</p>
                <p class="addon-card__price">R$ ${formatPrice(bump.price_cents)}</p>
              </div>
            </div>
          </div>
        </label>
      `;
    })
    .join("");

  addonsList.querySelectorAll("input[data-bump-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.getAttribute("data-bump-id");
      const card = input.closest(".addon-card");
      if (input.checked) {
        selectedBumps.add(id);
        card?.classList.add("addon-card--selected");
      } else {
        selectedBumps.delete(id);
        card?.classList.remove("addon-card--selected");
      }
      syncSelectAllState();
      updateSummary();
    });
  });

  updateSummary();
}

if (selectAll && addonsList) {
  selectAll.addEventListener("change", () => {
    const shouldSelect = selectAll.checked;
    addonsList.querySelectorAll("input[data-bump-id]").forEach((input) => {
      input.checked = shouldSelect;
      const id = input.getAttribute("data-bump-id");
      const card = input.closest(".addon-card");
      if (shouldSelect) {
        selectedBumps.add(id);
        card?.classList.add("addon-card--selected");
      } else {
        selectedBumps.delete(id);
        card?.classList.remove("addon-card--selected");
      }
    });
    setSelectAllLabel(shouldSelect);
    updateSummary();
  });
}

if (cepInput) {
  cepInput.addEventListener("input", (event) => {
    const formatted = formatCepDisplay(event.target.value);
    event.target.value = formatted;
    if (formatted.length < 9) {
      showCepError("");
    }
  });

  cepInput.addEventListener("blur", (event) => {
    lookupCep(event.target.value);
  });
}

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
  const formData = new FormData(form);
  const email = formData.get("email");
  const street = formData.get("street");
  const city = formData.get("city");
  const state = formData.get("state");

  if (!street || !city || !state) {
    alert("Preencha um CEP válido para continuar.");
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

  const address = {
    cep: formData.get("cep"),
    street,
    number: formData.get("address_number"),
    complement: formData.get("complement"),
    neighborhood: formData.get("neighborhood"),
    city,
    state,
    country: formData.get("country"),
  };

  customer.address = address;

  const payload = {
    amount: calcTotal(),
    description: offerData.base.name,
    customer,
    tracking: {
      utm: getUtmParams(),
      src: window.location.href,
    },
    address,
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
