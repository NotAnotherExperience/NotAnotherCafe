const menuForm = document.querySelector("#menuForm");
const menuFormTitle = document.querySelector("#menuFormTitle");
const resetMenuForm = document.querySelector("#resetMenuForm");
const adminMessage = document.querySelector("#adminMessage");
const adminMenuList = document.querySelector("#adminMenuList");
const specialForm = document.querySelector("#specialForm");
const clearSpecialButton = document.querySelector("#clearSpecialButton");
const specialMessage = document.querySelector("#specialMessage");
const specialPreview = document.querySelector("#specialPreview");
const logoutButton = document.querySelector("#logoutButton");

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
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function resetForm() {
  menuForm.reset();
  menuForm.elements.id.value = "";
  menuFormTitle.textContent = "Add new item";
  setAdminMessage("", "");
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
  renderMenu(data.menu);
}

function renderSpecial(specialToday) {
  if (!specialToday) {
    specialPreview.className = "special-preview-empty";
    specialPreview.textContent = "No Special GG Bev today.";
    specialForm.reset();
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
}

async function loadSpecial() {
  const data = await fetchJson("/api/special-today");
  renderSpecial(data.specialToday);
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
  } catch (error) {
    setSpecialMessage(error.message, "error");
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin-login.html";
});
loadMenu();
loadSpecial();
