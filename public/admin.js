const menuForm = document.querySelector("#menuForm");
const menuFormTitle = document.querySelector("#menuFormTitle");
const resetMenuForm = document.querySelector("#resetMenuForm");
const adminMessage = document.querySelector("#adminMessage");
const adminMenuList = document.querySelector("#adminMenuList");
const specialForm = document.querySelector("#specialForm");
const clearSpecialButton = document.querySelector("#clearSpecialButton");
const specialMessage = document.querySelector("#specialMessage");
const specialPreview = document.querySelector("#specialPreview");
const posForm = document.querySelector("#posForm");
const posItemSelect = document.querySelector("#posItemSelect");
const posTotalPreview = document.querySelector("#posTotalPreview");
const posMessage = document.querySelector("#posMessage");
const posSalesList = document.querySelector("#posSalesList");
const downloadPosCsv = document.querySelector("#downloadPosCsv");
const clearPosSales = document.querySelector("#clearPosSales");
const gamingForm = document.querySelector("#gamingForm");
const gamingTotalPreview = document.querySelector("#gamingTotalPreview");
const gamingMessage = document.querySelector("#gamingMessage");
const gamingBayTimers = document.querySelector("#gamingBayTimers");
const gamingSessionList = document.querySelector("#gamingSessionList");
const expenseForm = document.querySelector("#expenseForm");
const expenseMessage = document.querySelector("#expenseMessage");
const expenseList = document.querySelector("#expenseList");
const billingSummary = document.querySelector("#billingSummary");
const dailySalesChart = document.querySelector("#dailySalesChart");
const logoutButton = document.querySelector("#logoutButton");

const gamingPlans = {
  "30-min": { label: "30 min PS5 session", total: 100, timed: true },
  "60-min": { label: "1 hr PS5 session", total: 180, timed: true },
  fifa: { label: "FC26 / FIFA game", total: 70, timed: false }
};

let currentMenu = [];
let currentSpecial = null;
let currentSales = [];
let currentExpenses = [];
let currentGamingSessions = [];

function money(value) {
  const amount = Number(value) || 0;
  return `Rs ${amount.toLocaleString("en-IN")}`;
}

function setMessage(element, message, type) {
  element.textContent = message;
  element.className = `form-message ${type || ""}`;
}

function setAdminMessage(message, type) {
  setMessage(adminMessage, message, type);
}

function setSpecialMessage(message, type) {
  setMessage(specialMessage, message, type);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchJson(url, options) {
  const response = await fetch(url, { cache: "no-store", ...(options || {}) });
  const data = await response.json();
  if (response.status === 401) {
    window.location.href = "/admin-login.html";
    throw new Error("Session expired. Login again.");
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function verifyAdminSession() {
  try {
    await fetchJson("/api/admin/me");
  } catch (error) {
    if (!String(error.message).includes("Session expired")) {
      window.location.href = "/admin-login.html";
    }
  }
}

function updateSubcategoryOptions(category) {
  const select = menuForm.elements.subcategory;
  const options = category === "GG Bev"
    ? [["Iced", "Iced"], ["Hot", "Hot"]]
    : [["GG Snack", "GG Snack"]];
  select.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function resetForm() {
  menuForm.reset();
  menuForm.elements.id.value = "";
  menuFormTitle.textContent = "Add new item";
  setAdminMessage("", "");
  updateSubcategoryOptions(menuForm.elements.category.value);
}

function posItems() {
  const items = currentMenu.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    price: Number(item.price) || 0
  }));

  if (currentSpecial) {
    items.unshift({
      id: "special-today",
      name: `Special: ${currentSpecial.name}`,
      category: "GG Bev",
      price: Number(currentSpecial.price) || 0
    });
  }

  return items;
}

function renderPosOptions() {
  const items = posItems();
  posItemSelect.innerHTML = items.length
    ? items.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} / ${money(item.price)}</option>`).join("")
    : `<option value="">No menu items yet</option>`;
  updatePosTotal();
}

function selectedPosItem() {
  return posItems().find((item) => item.id === posForm.elements.itemId.value);
}

function updatePosTotal() {
  const item = selectedPosItem();
  const quantity = Math.max(1, Math.round(Number(posForm.elements.quantity.value) || 1));
  const total = item ? item.price * quantity : 0;
  posTotalPreview.textContent = `Total: ${money(total)}`;
}

function selectedGamingPlan() {
  return gamingPlans[gamingForm.elements.sessionType.value];
}

function updateGamingTotal() {
  const plan = selectedGamingPlan();
  gamingTotalPreview.textContent = plan ? `Gaming bill: ${money(plan.total)}` : "Gaming bill: Rs 0";
}

function editItem(item) {
  menuForm.elements.id.value = item.id;
  menuForm.elements.name.value = item.name;
  menuForm.elements.category.value = item.category;
  updateSubcategoryOptions(item.category);
  const validSubs = item.category === "GG Snack" ? ["GG Snack"] : ["Iced", "Hot"];
  menuForm.elements.subcategory.value = validSubs.includes(item.subcategory) ? item.subcategory : validSubs[0];
  menuForm.elements.price.value = item.price;
  menuForm.elements.description.value = item.description || "";
  menuFormTitle.textContent = "Edit item";
  menuForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMenu(menu) {
  if (menu.length === 0) {
    adminMenuList.innerHTML = `<article class="admin-menu-row"><strong>No menu items yet</strong></article>`;
    return;
  }

  const sections = ["GG Snack", "GG Bev"];
  adminMenuList.innerHTML = sections
    .map((category) => {
      const items = menu.filter((item) => item.category === category);
      return `
        <div class="admin-menu-group">
          <h3>${category}</h3>
          ${
            items.length
              ? items
                  .map((item) => `
                    <article class="admin-menu-row">
                      <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <span>${escapeHtml(item.subcategory || item.category)} / ${money(item.price)}</span>
                        ${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}
                      </div>
                      <div class="row-actions">
                        <button type="button" data-action="edit" data-id="${item.id}">Edit</button>
                        <button type="button" data-action="delete" data-id="${item.id}">Delete</button>
                      </div>
                    </article>
                  `)
                  .join("")
              : `<article class="admin-menu-row"><strong>No ${category} items yet</strong></article>`
          }
        </div>
      `;
    })
    .join("");

  adminMenuList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = menu.find((menuItem) => menuItem.id === button.dataset.id);
      if (button.dataset.action === "edit") {
        editItem(item);
        return;
      }

      await fetchJson(`/api/menu/${item.id}`, { method: "DELETE" });
      setAdminMessage(`${item.name} removed from GG Menu.`, "success");
      loadMenu();
    });
  });
}

async function loadMenu() {
  const data = await fetchJson("/api/menu");
  currentMenu = data.menu;
  renderMenu(data.menu);
  renderPosOptions();
}

function renderSpecial(specialToday) {
  currentSpecial = specialToday;
  if (!specialToday) {
    specialPreview.className = "special-preview-empty";
    specialPreview.textContent = "No Special GG Bev today.";
    specialForm.reset();
    specialForm.elements.name.value = "";
    specialForm.elements.price.value = "";
    specialForm.elements.note.value = "";
    renderPosOptions();
    return;
  }

  specialPreview.className = "special-preview-card";
  specialPreview.innerHTML = `
    <span>Special GG Bev Today</span>
    <strong>${escapeHtml(specialToday.name)}</strong>
    ${specialToday.note ? `<p>${escapeHtml(specialToday.note)}</p>` : ""}
    <b>${money(specialToday.price)}</b>
  `;
  specialForm.elements.name.value = specialToday.name;
  specialForm.elements.price.value = specialToday.price;
  specialForm.elements.note.value = specialToday.note || "";
  renderPosOptions();
}

async function loadSpecial() {
  const data = await fetchJson("/api/special-today");
  renderSpecial(data.specialToday);
}

function renderSales(sales) {
  currentSales = sales;
  if (!sales.length) {
    posSalesList.innerHTML = `<article class="admin-menu-row"><strong>No POS sales yet</strong><span>Sales added here can be exported to CSV.</span></article>`;
    renderReport();
    return;
  }

  const total = sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  posSalesList.innerHTML = `
    <article class="pos-sales-total"><strong>${money(total)}</strong><span>${sales.length} sale${sales.length === 1 ? "" : "s"}</span></article>
    ${sales
      .map((sale) => `
        <article class="admin-menu-row">
          <div>
            <strong>${escapeHtml(sale.itemName)}</strong>
            <span>${sale.quantity} x ${money(sale.unitPrice)} / ${escapeHtml(sale.paymentMode)} / ${new Date(sale.soldAt).toLocaleString("en-IN")}</span>
            ${sale.note ? `<small>${escapeHtml(sale.note)}</small>` : ""}
          </div>
          <div class="row-actions">
            <div class="pos-sale-total">${money(sale.total)}</div>
            <button type="button" data-action="delete-sale" data-id="${sale.id}">Remove</button>
          </div>
        </article>
      `)
      .join("")}
  `;

  posSalesList.querySelectorAll("[data-action='delete-sale']").forEach((button) => {
    button.addEventListener("click", async () => {
      await fetchJson(`/api/pos-sales/${button.dataset.id}`, { method: "DELETE" });
      setMessage(posMessage, "Sale removed from POS log.", "success");
      loadSales();
    });
  });
  renderReport();
}

async function loadSales() {
  const data = await fetchJson("/api/pos-sales");
  renderSales(data.sales);
}

function renderExpenses(expenses) {
  currentExpenses = expenses;
  if (!expenses.length) {
    expenseList.innerHTML = `<article class="admin-menu-row"><strong>No expenses yet</strong><span>Add costs here to see net daily money.</span></article>`;
    renderReport();
    return;
  }

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  expenseList.innerHTML = `
    <article class="expense-total"><strong>${money(total)}</strong><span>${expenses.length} expense${expenses.length === 1 ? "" : "s"}</span></article>
    ${expenses
      .map((expense) => `
        <article class="admin-menu-row">
          <div>
            <strong>${escapeHtml(expense.title)}</strong>
            <span>${escapeHtml(expense.category)} / ${new Date(expense.spentAt).toLocaleString("en-IN")}</span>
            ${expense.note ? `<small>${escapeHtml(expense.note)}</small>` : ""}
          </div>
          <div class="row-actions">
            <div class="expense-amount">${money(expense.amount)}</div>
            <button type="button" data-action="delete-expense" data-id="${expense.id}">Remove</button>
          </div>
        </article>
      `)
      .join("")}
  `;

  expenseList.querySelectorAll("[data-action='delete-expense']").forEach((button) => {
    button.addEventListener("click", async () => {
      await fetchJson(`/api/expenses/${button.dataset.id}`, { method: "DELETE" });
      setMessage(expenseMessage, "Expense removed.", "success");
      loadExpenses();
    });
  });
  renderReport();
}

async function loadExpenses() {
  const data = await fetchJson("/api/expenses");
  renderExpenses(data.expenses);
}

function sessionRemaining(session) {
  if (!session.endsAt) return null;
  return new Date(session.endsAt).getTime() - Date.now();
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function activeSessionFor(station) {
  return currentGamingSessions.find((session) => (
    session.station === station &&
    session.status === "running" &&
    session.endsAt &&
    sessionRemaining(session) > 0
  ));
}

function renderGamingSessions(sessions = currentGamingSessions) {
  currentGamingSessions = sessions;
  const stations = ["Red Bay", "Yellow Bay"];

  gamingBayTimers.innerHTML = stations
    .map((station) => {
      const active = activeSessionFor(station);
      return `
        <article class="bay-timer-card ${station === "Red Bay" ? "bay-timer-card--red" : "bay-timer-card--yellow"}">
          <span>${station}</span>
          <strong>${active ? formatDuration(sessionRemaining(active)) : "Free"}</strong>
          <small>${active ? `${escapeHtml(active.customerName)} / ${escapeHtml(active.label)}` : "No timed session running"}</small>
        </article>
      `;
    })
    .join("");

  if (!sessions.length) {
    gamingSessionList.innerHTML = `<article class="admin-menu-row"><strong>No gaming bills yet</strong><span>Start a timed bay session or log FC26.</span></article>`;
    renderReport();
    return;
  }

  const total = sessions.reduce((sum, session) => sum + Number(session.total || 0), 0);
  gamingSessionList.innerHTML = `
    <article class="gaming-total"><strong>${money(total)}</strong><span>${sessions.length} gaming bill${sessions.length === 1 ? "" : "s"}</span></article>
    ${sessions
      .map((session) => {
        const remaining = sessionRemaining(session);
        const isRunning = session.status === "running";
        const status = isRunning && remaining <= 0 ? "Time up" : session.status;
        return `
          <article class="admin-menu-row">
            <div>
              <strong>${escapeHtml(session.customerName)} / ${escapeHtml(session.station)}</strong>
              <span>${escapeHtml(session.label)} / ${money(session.total)} / ${escapeHtml(session.paymentMode)} / ${new Date(session.startedAt).toLocaleString("en-IN")}</span>
              <small>${isRunning ? `Timer: ${remaining > 0 ? formatDuration(remaining) : "00:00"} / ${status}` : status}</small>
              ${session.note ? `<small>${escapeHtml(session.note)}</small>` : ""}
            </div>
            <div class="row-actions">
              ${isRunning ? `<button type="button" data-action="complete-session" data-id="${session.id}">Done</button>` : ""}
              <button type="button" data-action="delete-session" data-id="${session.id}">Remove</button>
            </div>
          </article>
        `;
      })
      .join("")}
  `;

  gamingSessionList.querySelectorAll("[data-action='complete-session']").forEach((button) => {
    button.addEventListener("click", async () => {
      await fetchJson(`/api/gaming-sessions/${button.dataset.id}`, { method: "PATCH" });
      setMessage(gamingMessage, "Gaming session marked done.", "success");
      loadGamingSessions();
    });
  });

  gamingSessionList.querySelectorAll("[data-action='delete-session']").forEach((button) => {
    button.addEventListener("click", async () => {
      await fetchJson(`/api/gaming-sessions/${button.dataset.id}`, { method: "DELETE" });
      setMessage(gamingMessage, "Gaming bill removed.", "success");
      loadGamingSessions();
    });
  });
  renderReport();
}

async function loadGamingSessions() {
  const data = await fetchJson("/api/gaming-sessions");
  renderGamingSessions(data.sessions);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function salesCsv() {
  const rows = [
    ["Sold At", "Item", "Category", "Quantity", "Unit Price", "Total", "Payment", "Note"],
    ...currentSales.map((sale) => [
      sale.soldAt,
      sale.itemName,
      sale.category,
      sale.quantity,
      sale.unitPrice,
      sale.total,
      sale.paymentMode,
      sale.note
    ])
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function shortDay(key) {
  return new Date(`${key}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function lastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  });
}

function renderReport() {
  const totals = lastSevenDays().map((key) => ({ key, pos: 0, gaming: 0, expense: 0 }));

  currentSales.forEach((sale) => {
    const bucket = totals.find((day) => day.key === dateKey(sale.soldAt));
    if (bucket) bucket.pos += Number(sale.total) || 0;
  });

  currentGamingSessions.forEach((session) => {
    const bucket = totals.find((day) => day.key === dateKey(session.startedAt));
    if (bucket) bucket.gaming += Number(session.total) || 0;
  });

  currentExpenses.forEach((expense) => {
    const bucket = totals.find((day) => day.key === dateKey(expense.spentAt));
    if (bucket) bucket.expense += Number(expense.amount) || 0;
  });

  const revenue = currentSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0) +
    currentGamingSessions.reduce((sum, session) => sum + Number(session.total || 0), 0);
  const expenses = currentExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const net = revenue - expenses;

  billingSummary.innerHTML = `
    <article><span>Revenue</span><strong>${money(revenue)}</strong></article>
    <article><span>Expenses</span><strong>${money(expenses)}</strong></article>
    <article><span>Net</span><strong>${money(net)}</strong></article>
  `;

  const max = Math.max(1, ...totals.map((day) => day.pos + day.gaming + day.expense));
  dailySalesChart.innerHTML = totals
    .map((day) => {
      const revenueTotal = day.pos + day.gaming;
      const netTotal = revenueTotal - day.expense;
      return `
        <article class="daily-bar">
          <div class="daily-bar-track" aria-label="${shortDay(day.key)} revenue ${money(revenueTotal)}, expense ${money(day.expense)}">
            <span class="daily-bar-fill daily-bar-fill--revenue" style="height: ${Math.max(4, (revenueTotal / max) * 100)}%"></span>
            <span class="daily-bar-fill daily-bar-fill--expense" style="height: ${Math.max(4, (day.expense / max) * 100)}%"></span>
          </div>
          <strong>${shortDay(day.key)}</strong>
          <small>${money(netTotal)}</small>
        </article>
      `;
    })
    .join("");
}

menuForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(menuForm);
  const id = form.get("id");
  const payload = {
    name: form.get("name"),
    category: form.get("category"),
    subcategory: form.get("subcategory"),
    price: Number(form.get("price")),
    description: form.get("description")
  };

  try {
    if (id) {
      await fetchJson(`/api/menu/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setAdminMessage("Menu item updated.", "success");
    } else {
      await fetchJson("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setAdminMessage("Menu item added.", "success");
    }

    resetForm();
    loadMenu();
  } catch (error) {
    setAdminMessage(error.message, "error");
  }
});

resetMenuForm.addEventListener("click", resetForm);
menuForm.elements.category.addEventListener("change", () => {
  updateSubcategoryOptions(menuForm.elements.category.value);
});

specialForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(specialForm);
  const payload = {
    name: form.get("name"),
    price: Number(form.get("price")),
    note: form.get("note")
  };

  try {
    const data = await fetchJson("/api/special-today", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    renderSpecial(data.specialToday);
    setSpecialMessage("Special GG Bev is live on the menu.", "success");
  } catch (error) {
    setSpecialMessage(error.message, "error");
  }
});

clearSpecialButton.addEventListener("click", async () => {
  try {
    await fetchJson("/api/special-today", { method: "DELETE" });
    renderSpecial(null);
    setSpecialMessage("Special today cleared.", "success");
    loadSpecial();
  } catch (error) {
    setSpecialMessage(error.message, "error");
  }
});

posForm.addEventListener("input", updatePosTotal);
posForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(posForm);
  const payload = {
    itemId: form.get("itemId"),
    quantity: Number(form.get("quantity")),
    paymentMode: form.get("paymentMode"),
    note: form.get("note")
  };

  try {
    const data = await fetchJson("/api/pos-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    posForm.elements.quantity.value = 1;
    posForm.elements.note.value = "";
    updatePosTotal();
    setMessage(posMessage, `${data.sale.itemName} sale saved.`, "success");
    loadSales();
  } catch (error) {
    setMessage(posMessage, error.message, "error");
  }
});

gamingForm.addEventListener("input", updateGamingTotal);
gamingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(gamingForm);
  const payload = {
    customerName: form.get("customerName"),
    station: form.get("station"),
    sessionType: form.get("sessionType"),
    paymentMode: form.get("paymentMode"),
    note: form.get("note")
  };

  try {
    const data = await fetchJson("/api/gaming-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    gamingForm.reset();
    updateGamingTotal();
    setMessage(gamingMessage, `${data.session.label} saved for ${data.session.station}.`, "success");
    loadGamingSessions();
  } catch (error) {
    setMessage(gamingMessage, error.message, "error");
  }
});

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(expenseForm);
  const payload = {
    title: form.get("title"),
    category: form.get("category"),
    amount: Number(form.get("amount")),
    note: form.get("note")
  };

  try {
    const data = await fetchJson("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    expenseForm.reset();
    setMessage(expenseMessage, `${data.expense.title} expense saved.`, "success");
    loadExpenses();
  } catch (error) {
    setMessage(expenseMessage, error.message, "error");
  }
});

downloadPosCsv.addEventListener("click", () => {
  const blob = new Blob([salesCsv()], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `not-another-cafe-pos-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

clearPosSales.addEventListener("click", async () => {
  try {
    await fetchJson("/api/pos-sales", { method: "DELETE" });
    renderSales([]);
    setMessage(posMessage, "POS log cleared.", "success");
  } catch (error) {
    setMessage(posMessage, error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin-login.html";
});

verifyAdminSession();
setInterval(verifyAdminSession, 60 * 1000);
setInterval(() => renderGamingSessions(), 1000);
updateSubcategoryOptions(menuForm.elements.category.value);
updateGamingTotal();
loadMenu();
loadSpecial();
loadSales();
loadExpenses();
loadGamingSessions();
