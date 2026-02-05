const offerEl = document.getElementById("offer");
const form = document.getElementById("checkout-form");
const payBtn = document.getElementById("pay-btn");
const pixResult = document.getElementById("pix-result");
const pixQr = document.getElementById("pix-qr");
const pixCode = document.getElementById("pix-code");
const copyBtn = document.getElementById("copy-btn");

let offerData = null;
let selectedBumps = new Set();

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

function calcTotal() {
  const base = offerData?.base?.price_cents || 0;
  let total = base;
  offerData?.bumps?.forEach((bump) => {
    if (selectedBumps.has(bump.id)) {
      total += bump.price_cents;
    }
  });
  return total;
}

function renderOffer() {
  if (!offerData || !offerData.base) {
    offerEl.innerHTML = "<p>Oferta nao configurada.</p>";
    return;
  }

  const base = offerData.base;
  const bumps = offerData.bumps || [];

  offerEl.innerHTML = `
    <div class="offer__section">
      <div class="offer__title">${base.name}</div>
      <div>${base.description || ""}</div>
      <div class="price">R$ ${formatPrice(base.price_cents)}</div>
    </div>
    <div class="offer__section">
      <div class="offer__title">Order bumps</div>
      <div class="bumps">
        ${bumps
          .map(
            (bump) => `
            <div class="bump">
              <label>
                <input type="checkbox" data-bump-id="${bump.id}" />
                <span>${bump.name}</span>
              </label>
              <strong>R$ ${formatPrice(bump.price_cents)}</strong>
            </div>
          `
          )
          .join("")}
      </div>
    </div>
    <div class="offer__section">
      <div class="offer__title">Total</div>
      <div class="price" id="total-price">R$ ${formatPrice(calcTotal())}</div>
    </div>
  `;

  offerEl.querySelectorAll("input[data-bump-id]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.getAttribute("data-bump-id");
      if (input.checked) {
        selectedBumps.add(id);
      } else {
        selectedBumps.delete(id);
      }
      document.getElementById("total-price").textContent = `R$ ${formatPrice(
        calcTotal()
      )}`;
    });
  });
}

async function loadOffer() {
  const res = await fetch("/api/public/offer");
  const data = await res.json();
  offerData = data;
  renderOffer();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!offerData?.base) {
    return;
  }

  payBtn.disabled = true;
  payBtn.textContent = "Gerando Pix...";

  const formData = new FormData(form);
  const customer = {
    name: formData.get("name"),
    email: formData.get("email"),
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
  } catch (error) {
    alert("Erro na conexao com Pix");
  } finally {
    payBtn.disabled = false;
    payBtn.textContent = "Gerar Pix";
  }
});

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(pixCode.value);
  copyBtn.textContent = "Copiado";
  setTimeout(() => {
    copyBtn.textContent = "Copiar codigo";
  }, 1500);
});

loadOffer();
