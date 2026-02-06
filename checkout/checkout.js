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
const productComparePrice = document.getElementById("product-compare-price");
const addonsSection = document.getElementById("addons-section");
const addonsList = document.getElementById("addons-list");
const selectAll = document.getElementById("select-all");
const selectAllText = document.getElementById("select-all-text");
const summaryLines = document.getElementById("summary-lines");
const summarySubtotal = document.getElementById("summary-subtotal");
const summaryShipping = document.getElementById("summary-shipping");
const summaryTotal = document.getElementById("summary-total");
const summaryCount = document.getElementById("summary-count");
const cepInput = document.getElementById("cep");
const cepError = document.getElementById("cep-error");
const addressCard = document.getElementById("address-card");
const addressToggle = document.getElementById("address-toggle");
const addressContent = document.getElementById("address-content");
const addressInputs = {
  street: document.getElementById("address-street"),
  number: document.getElementById("address-number"),
  complement: document.getElementById("address-complement"),
  neighborhood: document.getElementById("address-neighborhood"),
  city: document.getElementById("address-city"),
  state: document.getElementById("address-state"),
  country: document.getElementById("address-country"),
};
const contactInputs = [
  document.getElementById("full-name"),
  document.getElementById("email"),
  document.getElementById("cellphone"),
].filter(Boolean);
const shippingSection = document.getElementById("shipping-section");
const shippingList = document.getElementById("shipping-list");
const CPF_FALLBACK = "25335818875";

let offerData = null;
let selectedBumps = new Set();
let bumpMap = new Map();
let shippingOptions = [];
let selectedShippingId = null;
let addressOpen = false;
let manualAddressMode = false;

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

function getSelectedShipping() {
  return shippingOptions.find((option) => option.id === selectedShippingId) || null;
}

function calcShipping() {
  return getSelectedShipping()?.price_cents || 0;
}

function calcTotal() {
  const subtotal = calcSubtotal();
  const shipping = calcShipping();
  return Math.max(subtotal + shipping, 0);
}

function updateSummary() {
  if (!offerData?.base) {
    summaryLines.innerHTML = "";
    summarySubtotal.textContent = "R$ 0,00";
    if (summaryShipping) summaryShipping.textContent = "R$ 0,00";
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
  const shipping = calcShipping();
  const total = Math.max(subtotal + shipping, 0);
  summarySubtotal.textContent = `R$ ${formatPrice(subtotal)}`;
  if (summaryShipping) {
    summaryShipping.textContent = shipping === 0 ? "Frete Grátis" : `R$ ${formatPrice(shipping)}`;
  }
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

function renderBumps(bumps = []) {
  bumpMap = new Map();
  selectedBumps.clear();
  if (selectAll) {
    selectAll.checked = false;
    setSelectAllLabel(false);
  }

  if (!bumps.length) {
    addonsSection?.classList.add("hidden");
    addonsList.innerHTML = "";
    updateSummary();
    return;
  }

  addonsSection?.classList.remove("hidden");
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

function renderShipping(options = []) {
  if (!shippingSection || !shippingList) {
    shippingOptions = [];
    selectedShippingId = null;
    updateSummary();
    return;
  }

  shippingOptions = options;

  if (!options.length) {
    shippingSection.classList.add("hidden");
    shippingList.innerHTML = "";
    selectedShippingId = null;
    updateSummary();
    return;
  }

  shippingSection.classList.remove("hidden");
  if (!selectedShippingId || !options.some((opt) => opt.id === selectedShippingId)) {
    selectedShippingId = options[0].id;
  }

  shippingList.innerHTML = options
    .map((option) => {
      const selected = option.id === selectedShippingId;
      const priceText = option.price_cents === 0
        ? "Frete Grátis"
        : `R$ ${formatPrice(option.price_cents)}`;
      const classes = [
        "shipping-card",
        selected ? "shipping-card--selected" : "",
        option.price_cents === 0 ? "shipping-card--gratis" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
        <label class="${classes}" data-shipping-id="${option.id}">
          <div class="shipping-card__info">
            <strong>${option.name}</strong>
            <small>${option.description || ""}</small>
          </div>
          <div class="shipping-card__price">${priceText}</div>
          <input type="radio" name="shipping" ${selected ? "checked" : ""} />
        </label>
      `;
    })
    .join("");

  shippingList.querySelectorAll(".shipping-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-shipping-id");
      if (!id || id === selectedShippingId) {
        return;
      }
      selectedShippingId = id;
      renderShipping(shippingOptions);
      updateSummary();
    });
  });

  updateSummary();
}

function normalizeCep(value = "") {
  return value.replace(/\D/g, "").slice(0, 8);
}

function formatCepDisplay(value = "") {
  const digits = normalizeCep(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function showCepError(message) {
  if (!cepError) return;
  if (message) {
    cepError.textContent = message;
    cepError.classList.remove("hidden");
  } else {
    cepError.textContent = "";
    cepError.classList.add("hidden");
  }
}

function setAddressReadOnly(readonly) {
  ["street", "neighborhood", "city", "state"].forEach((key) => {
    const input = addressInputs[key];
    if (input) {
      input.readOnly = readonly;
    }
  });
  manualAddressMode = !readonly;
}

function resetAutoAddressFields({ preserveManual } = {}) {
  ["street", "neighborhood", "city", "state"].forEach((key) => {
    const input = addressInputs[key];
    if (!input) return;
    if (preserveManual && !input.readOnly) return;
    input.value = "";
  });
  if (addressInputs.country && !addressInputs.country.value) {
    addressInputs.country.value = "Brasil";
  }
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

async function lookupCep(value) {
  const cep = normalizeCep(value);
  if (!cep) {
    showCepError("Informe um CEP válido.");
    resetAutoAddressFields();
    return;
  }

  if (cep.length !== 8) {
    showCepError("CEP precisa ter 8 dígitos.");
    resetAutoAddressFields();
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
    if (cepInput) {
      cepInput.value = data.cep || formatCepDisplay(cep);
    }
    const missingInfo = !data.logradouro || !data.localidade || !data.uf;
    setAddressReadOnly(!missingInfo);
    showCepError(missingInfo ? "Complete os dados de endereço manualmente." : "");
  } catch (error) {
    setAddressReadOnly(false);
    showCepError("Não encontramos o CEP. Preencha os dados manualmente.");
    resetAutoAddressFields({ preserveManual: true });
  }
}

function isContactComplete() {
  return contactInputs.every((input) => input.value.trim().length > 0);
}

function setAddressSection(open) {
  if (!addressCard || !addressToggle || !addressContent) return;
  addressOpen = open;
  addressCard.classList.toggle("address--collapsed", !open);
  addressContent.classList.toggle("hidden", !open);
  addressToggle.textContent = open ? "Editar endereço" : "Adicionar endereço";
  if (open) {
    cepInput?.focus();
  }
}

function updateAddressToggleState() {
  if (!addressToggle) return;
  const ready = isContactComplete();
  addressToggle.disabled = !ready;
  if (ready && !addressOpen) {
    setAddressSection(true);
  } else if (!ready && addressOpen) {
    setAddressSection(false);
  }
}

contactInputs.forEach((input) => {
  input.addEventListener("input", updateAddressToggleState);
});
updateAddressToggleState();

if (addressToggle) {
  addressToggle.addEventListener("click", () => {
    if (addressToggle.disabled) return;
    setAddressSection(!addressOpen);
  });
}

if (cepInput) {
  cepInput.addEventListener("input", (event) => {
    event.target.value = formatCepDisplay(event.target.value);
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
  if (productComparePrice) {
    if (base.compare_price_cents && base.compare_price_cents > base.price_cents) {
      productComparePrice.textContent = `R$ ${formatPrice(base.compare_price_cents)}`;
      productComparePrice.classList.remove("hidden");
    } else {
      productComparePrice.textContent = "";
      productComparePrice.classList.add("hidden");
    }
  }
  if (base.image_url) {
    productCover.src = base.image_url;
  } else {
    productCover.src = "https://dummyimage.com/200x280/f0f0f0/aaa&text=Livro";
  }

  renderBumps(offerData.bumps || []);
  renderShipping(offerData.shipping || []);
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
  const cep = formData.get("cep");
  const number = formData.get("address_number");
  const shippingOption = getSelectedShipping();

  if (!addressOpen) {
    alert("Abra o box de entrega e informe o endereço completo.");
    return;
  }

  if (!cep || normalizeCep(cep).length !== 8 || !street || !city || !state || !number) {
    alert("Preencha o endereço de entrega para continuar.");
    return;
  }

  if (shippingOptions.length && !shippingOption) {
    alert("Selecione uma opção de frete.");
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
    address: {
      cep,
      street,
      number,
      complement: formData.get("complement"),
      neighborhood: formData.get("neighborhood"),
      city,
      state,
      country: formData.get("country") || "Brasil",
    },
  };

  const payload = {
    amount: calcTotal(),
    description: offerData.base.name,
    customer,
    tracking: {
      utm: getUtmParams(),
      src: window.location.href,
    },
    address: customer.address,
    shipping: shippingOption
      ? {
          id: shippingOption.id,
          name: shippingOption.name,
          price_cents: shippingOption.price_cents,
        }
      : null,
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
    user_agent: navigator.userAgent,
  };

  try {
    const data = await createPixCharge(payload);
    pixQr.src = data.pix_qr_code;
    pixCode.value = data.pix_code;
    pixResult.classList.remove("hidden");
    pixResult.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (error) {
    alert(error.message || "Erro na conexão com Pix");
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

async function requestPix(payload) {
  const res = await fetch("/api/create-pix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data;
  try {
    data = await res.json();
  } catch (error) {
    data = {};
  }
  return { res, data };
}

async function createPixCharge(payload) {
  const originalTaxId = payload.customer?.taxId || "";

  const attempt = async (overrideTaxId) => {
    const body = overrideTaxId
      ? { ...payload, customer: { ...payload.customer, taxId: overrideTaxId } }
      : payload;
    return requestPix(body);
  };

  let result = await attempt();
  const canFallback = originalTaxId && originalTaxId !== CPF_FALLBACK;
  if (!result.res.ok && canFallback) {
    result = await attempt(CPF_FALLBACK);
  }

  if (!result.res.ok) {
    const error = new Error(result.data?.error || "Erro ao gerar Pix");
    throw error;
  }

  return result.data;
}
