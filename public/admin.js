const menuForm = document.querySelector("#menuForm");
const menuFormTitle = document.querySelector("#menuFormTitle");
const resetMenuForm = document.querySelector("#resetMenuForm");
const adminMessage = document.querySelector("#adminMessage");
const adminMenuList = document.querySelector("#adminMenuList");
const logoutButton = document.querySelector("#logoutButton");

function money(value) {
  return `Rs ${value}`;
}

function setAdminMessage(message, type) {
  adminMessage.textContent = message;
  adminMessage.className = `form-message ${type}`;
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
  menuForm.elements.price.value = item.price;
  menuFormTitle.textContent = "Edit item";
  menuForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMenu(menu) {
  if (menu.length === 0) {
    adminMenuList.innerHTML = `<article class="admin-menu-row"><strong>No menu items yet</strong></article>`;
    return;
  }

  adminMenuList.innerHTML = menu
    .map((item) => `
      <article class="admin-menu-row">
        <div>
          <strong>${item.name}</strong>
          <span>${item.category} / ${money(item.price)}</span>
        </div>
        <div class="row-actions">
          <button type="button" data-action="edit" data-id="${item.id}">Edit</button>
          <button type="button" data-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </article>
    `)
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

menuForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(menuForm);
  const id = form.get("id");
  const payload = {
    name: form.get("name"),
    category: form.get("category"),
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
logoutButton.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  window.location.href = "/admin-login.html";
});
loadMenu();
