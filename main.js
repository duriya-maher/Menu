// main.js - replace your existing JS with this file

// ----------------- State -----------------
let cart = [];

// ----------------- DOM refs -----------------
const grid = document.querySelector(".desserts-grid");
const cartBox = document.querySelector(".cart");
const orderModal = document.querySelector(".order-confirmation");
const orderItemsContainer = document.querySelector(".order-items");
const modalTotal = document.querySelector(".modal-total");
const newOrderBtn = document.querySelector(".new-order-btn");

// ----------------- Fetch & Render -----------------
fetch("data.json")
  .then(res => res.json())
  .then(data => renderDesserts(data))
  .catch(err => console.error("Error loading data.json:", err));

function renderDesserts(desserts) {
  // render cards using data-name so we can identify products reliably
  grid.innerHTML = desserts.map(item => `
    <article class="card">
      <img class="card-img" src="${item.image.desktop}" alt="${escapeHtml(item.name)}">
      <div class="card-info">
        <p class="category">${escapeHtml(item.category)}</p>
        <h3 class="name">${escapeHtml(item.name)}</h3>
        <p class="price">$${Number(item.price).toFixed(2)}</p>
        <button class="add-to-cart" data-name="${escapeHtml(item.name)}" aria-label="Add ${escapeHtml(item.name)} to cart">
          <img src="assets/images/icon-add-to-cart.svg" alt="" aria-hidden="true"> Add to Cart
        </button>
      </div>
    </article>
  `).join("");

  // delegated click handler for add-to-cart inside grid
  grid.addEventListener("click", onGridClick);
  updateCartUI(); // ensure cart UI syncs on initial render
}

// small helper to avoid accidental HTML injection
function escapeHtml(str = "") {
  return String(str).replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// ----------------- Event handlers -----------------
function onGridClick(e) {
  const btn = e.target.closest(".add-to-cart");
  if (!btn) return;
  const name = btn.dataset.name;
  // find the product data by reading the DOM card (safer if JSON not in scope)
  const card = btn.closest(".card");
  const priceText = card.querySelector(".price").textContent.trim().replace('$','');
  const price = parseFloat(priceText) || 0;
  const imgEl = card.querySelector(".card-img");
  const thumbnail = imgEl ? imgEl.src : "";

  // ensure item object shape matches what the rest of the code expects
  const item = { name, price, image: { thumbnail }, quantity: 1 };

  addToCart(item);
  // immediately update button visuals for a snappy UI
  updateAddToCartButtons();
}

// ----------------- Cart management -----------------
function addToCart(item) {
  const existing = cart.find(i => i.name === item.name);
  if (existing) {
    existing.quantity++;
  } else {
    // push a shallow copy to avoid external mutation
    cart.push({ name: item.name, price: Number(item.price), image: { thumbnail: item.image.thumbnail }, quantity: 1 });
  }
  updateCartUI();
}

function removeFromCart(name) {
  cart = cart.filter(i => i.name !== name);
  updateCartUI();
}

// update quantity by delta (positive or negative)
function changeQuantity(name, delta) {
  const it = cart.find(i => i.name === name);
  if (!it) return;
  it.quantity += delta;
  if (it.quantity <= 0) {
    removeFromCart(it.name);
  } else {
    updateCartUI();
  }
}

// ----------------- Update UI -----------------
function updateCartUI() {
  const totalQty = cart.reduce((a,c) => a + c.quantity, 0);
  const totalPrice = cart.reduce((a,c) => a + c.price * c.quantity, 0);

  cartBox.innerHTML = `
    <h2>Your Cart (${totalQty})</h2>
    <div class="cart-items">
      ${cart.length === 0 ? `
        <div class="empty">
          <img src="assets/images/illustration-empty-cart.svg" alt="">
          <p>Your added items will appear here</p>
        </div>` :
        cart.map(item => `
          <div class="cart-item" data-name="${escapeHtml(item.name)}">
            <div class="cart-item-info">
              <span class="cart-item-name">${escapeHtml(item.name)}</span>
              <span class="cart-item-qty-price"><span>${item.quantity}x</span> @ $${item.price} = $${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            <button class="remove-btn" data-name="${escapeHtml(item.name)}" aria-label="Remove ${escapeHtml(item.name)}">✕</button>
          </div>
        `).join('')
      }
    </div>

    ${cart.length > 0 ? `
      <div class="cart-total">
        <span>Order Total</span>
        <span>$${totalPrice.toFixed(2)}</span>
      </div>
      <button class="confirm-btn confirm-order-btn">Confirm Order</button>
    ` : ''}
  `;

  // wire remove buttons (delegation would also work; simple listener binding here)
  cartBox.querySelectorAll(".remove-btn").forEach(btn => {
    btn.onclick = (e) => {
      const name = btn.dataset.name;
      removeFromCart(name);
      updateAddToCartButtons();
    };
  });

  // confirm button
  const confirmBtn = cartBox.querySelector(".confirm-order-btn");
  if (confirmBtn) {
    confirmBtn.onclick = showOrderConfirmation;
  }

  // sync card buttons to reflect cart state
  updateAddToCartButtons();
}

// update add-to-cart button visuals to match cart state
function updateAddToCartButtons() {
  document.querySelectorAll(".card").forEach(card => {
    const btn = card.querySelector(".add-to-cart");
    if (!btn) return;
    const name = btn.dataset.name;
    const item = cart.find(i => i.name === name);

    if (item) {
      // set in-cart state (single outer button stays the same element)
      btn.classList.add("in-cart");
      btn.style.backgroundColor = "var(--red)";
      btn.style.color = "white";
      btn.style.border = "none";
      // inject small controls and keep single outer button element (no nested <button>)
      btn.innerHTML = `
        <span class="icon-btn decrease" role="button" aria-label="Decrease quantity">-</span>
        <span class="quantity">${item.quantity}</span>
        <span class="icon-btn increase" role="button" aria-label="Increase quantity">+</span>
      `;

      // attach handlers (use onclick to avoid duplicate listeners)
      const inc = btn.querySelector(".increase");
      const dec = btn.querySelector(".decrease");

      if (inc) {
        inc.onclick = (e) => {
          e.stopPropagation();
          changeQuantity(name, +1);
        };
      }
      if (dec) {
        dec.onclick = (e) => {
          e.stopPropagation();
          changeQuantity(name, -1);
        };
      }
    } else {
      // reset button to default Add to Cart (preserve width)
      btn.classList.remove("in-cart");
      btn.style.backgroundColor = "white";
      btn.style.color = "var(--rose-900)";
      btn.style.border = "1px solid var(--rose-300)";
      btn.innerHTML = `<img src="assets/images/icon-add-to-cart.svg" alt="" aria-hidden="true"> Add to Cart`;
    }
  });
}

// ----------------- Modal logic -----------------
function showOrderConfirmation() {
  // populate order items list
  orderItemsContainer.innerHTML = "";
  let total = 0;
  cart.forEach(item => {
    const row = document.createElement("div");
    row.className = "order-item";
    row.innerHTML = `
      <div class="order-item-left">
        <img src="${item.image.thumbnail}" alt="${escapeHtml(item.name)}">
        <div class="order-item-info">
          <span class="order-item-name">${escapeHtml(item.name)}</span>
          <div>
            <span class="order-item-qty">x${item.quantity}</span>
            <span class="order-item-price-group"> @$${item.price}</span>
          </div>
        </div>
      </div>
      <span class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
    `;
    orderItemsContainer.appendChild(row);
    total += item.price * item.quantity;
  });

  modalTotal.textContent = `$${total.toFixed(2)}`;
  // show with fade class and lock body scroll
  orderModal.classList.remove("hidden");
  // small timeout ensures CSS transition runs (if you use .show)
  requestAnimationFrame(() => orderModal.classList.add("show"));
  document.body.classList.add("no-scroll");
}

// close modal and reset state (start new order)
newOrderBtn.addEventListener("click", () => {
  cart = [];
  updateCartUI();
  // fade out then hide
  orderModal.classList.remove("show");
  setTimeout(() => orderModal.classList.add("hidden"), 320);
  document.body.classList.remove("no-scroll");
});

// optional: clicking on overlay outside modal closes it
orderModal.addEventListener("click", (e) => {
  if (e.target === orderModal) {
    orderModal.classList.remove("show");
    setTimeout(() => orderModal.classList.add("hidden"), 320);
    document.body.classList.remove("no-scroll");
  }
});

