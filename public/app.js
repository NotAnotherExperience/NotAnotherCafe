const consoleStatus = document.querySelector("#consoleStatus");
const upcomingBookings = document.querySelector("#upcomingBookings");
const lastUpdated = document.querySelector("#lastUpdated");
const bookingForm = document.querySelector("#bookingForm");
const orderForm = document.querySelector("#orderForm");
const bookingMenu = document.querySelector("#bookingMenu");
const orderMenu = document.querySelector("#orderMenu");
const bookingMessage = document.querySelector("#bookingMessage");
const orderMessage = document.querySelector("#orderMessage");
const pricePreview = document.querySelector("#pricePreview");

const formatTime = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  day: "2-digit",
  month: "short"
});

function setDefaultDateTime(input) {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  input.value = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function money(value) {
  return `Rs ${value}`;
}

function statusLabel(status) {
  if (status === "booked") return "Booked now";
  if (status === "occupied") return "Walk-in occupied";
  if (status === "maintenance") return "Maintenance";
  return "Available now";
}

function updatePricePreview() {
  const gameType = bookingForm.elements.gameType.value;
  const durationSelect = bookingForm.elements.durationMinutes;

  if (gameType === "fc26") {
    durationSelect.disabled = true;
    pricePreview.textContent = "FC26 premium: Rs 70 for one 17-minute max match";
    return;
  }

  durationSelect.disabled = false;
  const price = durationSelect.value === "30" ? 100 : 180;
  const label = durationSelect.value === "30" ? "30 minutes" : "1 hour";
  pricePreview.textContent = `Regular game: Rs ${price} for ${label}`;
}

function renderAvailability(consoles, serverTime) {
  consoleStatus.innerHTML = consoles
    .map((item) => {
      const details = item.currentBooking
        ? `Booked by ${item.currentBooking.playerName} until ${formatTime.format(new Date(item.currentBooking.endTime))}`
        : `${item.station} is ready for the next player.`;
      return `
        <article class="console-card">
          <span class="status-pill status-${item.status}">${statusLabel(item.status)}</span>
          <h3>${item.name}</h3>
          <div class="console-meta">${details}</div>
        </article>
      `;
    })
    .join("");

  lastUpdated.textContent = `Updated ${formatTime.format(new Date(serverTime))}`;
}

function renderBookings(bookings) {
  if (bookings.length === 0) {
    upcomingBookings.innerHTML = `
      <article class="timeline-item">
        <strong>No upcoming bookings yet</strong>
        <span>Both PS5 consoles are open for fresh reservations.</span>
      </article>
    `;
    return;
  }

  upcomingBookings.innerHTML = bookings
    .slice(0, 6)
    .map((booking) => `
      <article class="timeline-item">
        <strong>${booking.consoleId === "ps5-1" ? "PS5 Console 1" : "PS5 Console 2"}</strong>
        <span>${formatTime.format(new Date(booking.startTime))} - ${formatTime.format(new Date(booking.endTime))}</span>
        <span>${booking.playerName} / ${booking.gameType === "fc26" ? "FC26" : "Regular"} / Rs ${booking.playPrice}</span>
      </article>
    `)
    .join("");
}

function renderMenu(menu) {
  const menuMarkup = menu
    .map((item) => `
      <label class="check-item">
        <input type="checkbox" value="${item.id}" />
        <strong>${item.name}</strong>
        <span>${item.category} / ${money(item.price)}</span>
      </label>
    `)
    .join("");

  bookingMenu.innerHTML = menuMarkup;
  orderMenu.innerHTML = menu
    .map((item) => `
      <label class="menu-card">
        <input name="items" type="checkbox" value="${item.id}" />
        <strong>${item.name}</strong>
        <span>${item.category} / ${money(item.price)}</span>
      </label>
    `)
    .join("");
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function refreshLiveData() {
  try {
    const [availability, bookings] = await Promise.all([
      fetchJson("/api/availability"),
      fetchJson("/api/bookings")
    ]);
    renderAvailability(availability.consoles, availability.serverTime);
    renderBookings(bookings.bookings);
  } catch (error) {
    consoleStatus.innerHTML = `<article class="console-card"><h3>Could not sync</h3><div class="console-meta">${error.message}</div></article>`;
  }
}

function selectedValues(container) {
  return [...container.querySelectorAll("input:checked")].map((input) => input.value);
}

function setMessage(target, message, type) {
  target.textContent = message;
  target.className = `form-message ${type}`;
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(bookingForm);
  const payload = {
    playerName: form.get("playerName"),
    phone: form.get("phone"),
    consoleId: form.get("consoleId"),
    gameType: form.get("gameType"),
    startTime: form.get("startTime"),
    durationMinutes: form.get("durationMinutes"),
    snackIds: selectedValues(bookingMenu)
  };

  try {
    const data = await fetchJson("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setMessage(
      bookingMessage,
      `Confirmed. Play charge: Rs ${data.booking.playPrice}. Your slot ends at ${formatTime.format(new Date(data.booking.endTime))}.`,
      "success"
    );
    bookingForm.reset();
    setDefaultDateTime(bookingForm.elements.startTime);
    updatePricePreview();
    refreshLiveData();
  } catch (error) {
    setMessage(bookingMessage, error.message, "error");
  }
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(orderForm);
  const payload = {
    customerName: form.get("customerName"),
    phone: form.get("phone"),
    pickupTime: form.get("pickupTime"),
    items: selectedValues(orderMenu)
  };

  try {
    await fetchJson("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setMessage(orderMessage, "Pre-order received. The counter can prep it for your arrival.", "success");
    orderForm.reset();
    setDefaultDateTime(orderForm.elements.pickupTime);
  } catch (error) {
    setMessage(orderMessage, error.message, "error");
  }
});

async function boot() {
  setDefaultDateTime(bookingForm.elements.startTime);
  setDefaultDateTime(orderForm.elements.pickupTime);
  bookingForm.elements.gameType.addEventListener("change", updatePricePreview);
  bookingForm.elements.durationMinutes.addEventListener("change", updatePricePreview);
  updatePricePreview();
  const menu = await fetchJson("/api/menu");
  renderMenu(menu.menu);
  await refreshLiveData();
  setInterval(refreshLiveData, 7000);
}

boot();
