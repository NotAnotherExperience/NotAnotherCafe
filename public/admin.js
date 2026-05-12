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
const logoutButton = document.querySelector("#logoutButton");

let currentMenu = [];
let currentSpecial = null;
let currentSales = [];

function money(value) {
  if (Number(value) === 0) return "Price TBD";
  return `Rs ${value}`;
}

function setAdminMessage(message, type) {
  adminMessage.textContent = message;
  adminMessage.className = `form-message ${type}`;
}

function setSpecialMessage(message, type) {
  specialMessage.textContent = message;
  specialMessage.className = `form-message ${type}`;
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

function resetForm() {
  menuForm.reset();
  menuForm.elements.id.value = "";
  menuFormTitle.textContent = "Add new item";
  setAdminMessage("", "");
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
  posItemSelect.innerHTML = items
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} / ${money(item.price)}</option>`)
    .join("");
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

function editItem(item) {
  menuForm.elements.id.value = item.id;
  menuForm.elements.name.value = item.name;
  menuForm.elements.category.value = item.category;
  menuForm.elements.subcategory.value = item.subcategory || item.category;
  menuForm.elements.price.value = item.price;
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
          </div>
          <div class="pos-sale-total">${money(sale.total)}</div>
        </article>
      `)
      .join("")}
  `;
}

async function loadSales() {
  const data = await fetchJson("/api/pos-sales");
  renderSales(data.sales);
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

menuForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(menuForm);
  const id = form.get("id");
  const payload = {
    name: form.get("name"),
    category: form.get("category"),
    subcategory: form.get("subcategory"),
    price: Number(form.get("price"))
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
    posMessage.textContent = `${data.sale.itemName} sale saved.`;
    posMessage.className = "form-message success";
    loadSales();
  } catch (error) {
    posMessage.textContent = error.message;
    posMessage.className = "form-message error";
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
    posMessage.textContent = "POS log cleared.";
    posMessage.className = "form-message success";
  } catch (error) {
    posMessage.textContent = error.message;
    posMessage.className = "form-message error";
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin-login.html";
});
verifyAdminSession();
setInterval(verifyAdminSession, 60 * 1000);
loadMenu();
loadSpecial();
loadSales();
