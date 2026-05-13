const screens = {
  menu: document.querySelector("#screen-menu"),
  booking: document.querySelector("#screen-booking"),
  profile: document.querySelector("#screen-profile"),
  thought: document.querySelector("#screen-thought"),
  thanks: document.querySelector("#screen-thanks")
};

const communityMenu = document.querySelector("#communityMenu");
const specialToday = document.querySelector("#specialToday");
const wallQuote = document.querySelector("#wallQuote");
const thoughtItems = document.querySelector("#thoughtItems");
const thoughtForm = document.querySelector("#thoughtForm");
const profileForm = document.querySelector("#profileForm");
const profileChip = document.querySelector("#profileChip");
const profilePrompt = document.querySelector("#profilePrompt");
const profileMessage = document.querySelector("#profileMessage");
const aliasPreview = document.querySelector("#aliasPreview");
const thanksCount = document.querySelector("#thanksCount");
const postedThought = document.querySelector("#postedThought");
const thoughtButton = document.querySelector("#thoughtButton");
const thoughtActions = document.querySelector("#thoughtActions");
const VOUCH_STORAGE_VERSION = "2026-05-10-zero-vouches";

if (localStorage.getItem("gg-vouch-storage-version") !== VOUCH_STORAGE_VERSION) {
  localStorage.removeItem("gg-vouched-items");
  localStorage.removeItem("gg-menu-stats");
  localStorage.setItem("gg-vouch-storage-version", VOUCH_STORAGE_VERSION);
}

const fallbackMenu = [
  { id: "gg-salad-blue", category: "GG Snack", subcategory: "GG Snack", name: "Blue Lays", price: 60 },
  { id: "gg-salad-orange", category: "GG Snack", subcategory: "GG Snack", name: "Orange Lays", price: 60 },
  { id: "gg-salad-green", category: "GG Snack", subcategory: "GG Snack", name: "Green Lays", price: 60 },
  { id: "gg-salad-red", category: "GG Snack", subcategory: "GG Snack", name: "Red Lays", price: 60 },
  { id: "gg-salad-dark-green", category: "GG Snack", subcategory: "GG Snack", name: "Dark Green Lays", price: 60 },
  { id: "watermelon-crush", category: "GG Bev", subcategory: "Iced", name: "Watermelon Crush", price: 0 },
  { id: "strawberry-crush", category: "GG Bev", subcategory: "Iced", name: "Strawberry Crush", price: 0 },
  { id: "green-apple-crush", category: "GG Bev", subcategory: "Iced", name: "Green Apple Crush", price: 0 },
  { id: "peach-crush", category: "GG Bev", subcategory: "Iced", name: "Peach Crush", price: 0 },
  { id: "peach-ice-tea", category: "GG Bev", subcategory: "Iced", name: "Peach Ice Tea", price: 0 },
  { id: "watermelon-ice-tea", category: "GG Bev", subcategory: "Iced", name: "Watermelon Ice Tea", price: 0 },
  { id: "strawberry-ice-tea", category: "GG Bev", subcategory: "Iced", name: "Strawberry Ice Tea", price: 0 },
  { id: "green-apple-ice-tea", category: "GG Bev", subcategory: "Iced", name: "Green Apple Ice Tea", price: 0 },
  { id: "green-tea", category: "GG Bev", subcategory: "Hot", name: "Green Tea", price: 0 },
  { id: "hot-peach-tea", category: "GG Bev", subcategory: "Hot", name: "Hot Peach Tea", price: 0 }
];

const itemDetails = {
  "gg-salad-blue": {
    description: "Blue Lays tossed with cucumber, onion, green chilli, coriander, lemon mustard, ketchup, and mayo.",
    vouches: 0
  },
  "gg-salad-orange": {
    description: "Orange Lays with cucumber, onion, chilli, coriander, lemon mustard, ketchup, and mayo.",
    vouches: 0
  },
  "gg-salad-green": {
    description: "Green Lays made messy in the best way with the house chopped mix and sauces.",
    vouches: 0
  },
  "gg-salad-red": {
    description: "Red Lays with cucumber, onion, green chilli, coriander, lemon mustard, ketchup, and mayo.",
    vouches: 0
  },
  "gg-salad-dark-green": {
    description: "Dark Green Lays with cucumber, onion, chilli, coriander, lemon mustard, ketchup, and mayo.",
    vouches: 0
  },
  "watermelon-crush": {
    description: "Iced watermelon crush, bright and cold for the middle of a session.",
    vouches: 0
  },
  "strawberry-crush": {
    description: "Iced strawberry crush with a sweet cafe-counter finish.",
    vouches: 0
  },
  "green-apple-crush": {
    description: "Iced green apple crush, sharp, fizzy, and easy to sip between games.",
    vouches: 0
  },
  "peach-crush": {
    description: "Iced peach crush for a softer, fruitier break from the screen.",
    vouches: 0
  },
  "peach-ice-tea": {
    description: "Cold peach ice tea, light enough to keep next to the controller.",
    vouches: 0
  },
  "watermelon-ice-tea": {
    description: "Cold watermelon ice tea with a clean fruit finish.",
    vouches: 0
  },
  "strawberry-ice-tea": {
    description: "Cold strawberry ice tea for a softer iced drink.",
    vouches: 0
  },
  "green-apple-ice-tea": {
    description: "Cold green apple ice tea with a crisp, tart edge.",
    vouches: 0
  },
  "green-tea": {
    description: "Hot green tea for the quieter table reset.",
    vouches: 0
  },
  "hot-peach-tea": {
    description: "Hot peach tea, warm and mellow for late sessions.",
    vouches: 0
  }
};

const communityThoughts = [
  { itemId: "gg-salad-blue", alias: "Not Another Crunch", text: "Blue Lays is my first pick next time." },
  { itemId: "peach-ice-tea", alias: "Not Another Regular", text: "Peach ice tea after the spicy salad makes sense." },
  { itemId: "gg-salad-orange", alias: "Not Another Player", text: "Orange Lays disappeared before the match loaded." }
];

let menuItems = [];
let specialTodayItem = null;
let vouched = new Set(JSON.parse(localStorage.getItem("gg-vouched-items") || "[]"));
let memberCount = Number(localStorage.getItem("gg-founder-count") || 47);
let profile = JSON.parse(localStorage.getItem("gg-community-profile") || "null");
let savedStats = JSON.parse(localStorage.getItem("gg-menu-stats") || "{}");

function readCookie(name) {
  const match = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function writeCookie(name, value, days) {
  document.cookie = `${name}=${encodeURIComponent(value)}; SameSite=Lax; Path=/; Max-Age=${days * 24 * 60 * 60}`;
}

let savedPhone = readCookie("gg_phone") || localStorage.getItem("gg-member-phone") || profile?.phone || "";
let savedDisplayName = readCookie("gg_dname") || localStorage.getItem("gg-member-display-name") || profile?.displayName || "";

function money(value) {
  if (Number(value) === 0) return "Price TBD";
  return `Rs ${value}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makeAlias(identity = "Regular") {
  return `Not Another ${identity}`;
}

function currentAlias() {
  return profile?.alias || "Not Another Guest";
}

function enrichMenu(menu) {
  return menu.map((item) => {
    const details = itemDetails[item.id] || {};
    return {
      ...details,
      ...item,
      description: item.description || details.description || "A GG counter pick the room keeps noticing.",
      vouches: savedStats[item.id]?.vouches ?? details.vouches ?? 0
    };
  });
}

function saveMenuStats() {
  savedStats = Object.fromEntries(
    menuItems.map((item) => [
      item.id,
      {
        vouches: item.vouches
      }
    ])
  );
  localStorage.setItem("gg-menu-stats", JSON.stringify(savedStats));
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function restoreProfileFromServer() {
  if (profile) return;
  try {
    const response = await fetch("/api/community-members/me", { cache: "no-store" });
    const data = await response.json();
    if (response.ok && data.member) {
      persistProfile(data.member);
      return;
    }
    // Cookie was valid but member missing from DB (e.g. server cold-start) — silently re-register
    if (response.status === 404 && savedPhone && savedDisplayName) {
      const reData = await postJson("/api/community-members", {
        phone: savedPhone,
        identity: savedDisplayName,
        displayName: savedDisplayName
      });
      persistProfile(reData.member || { phone: savedPhone, displayName: savedDisplayName, alias: makeAlias(savedDisplayName) });
    }
  } catch {
    // silent fail — user will see pre-filled form
  }
}

function totalOrdersToday() {
  return menuItems.reduce((sum, item) => sum + item.vouches, 0);
}

function showScreen(name) {
  Object.entries(screens).forEach(([screenName, screen]) => {
    screen.classList.toggle("is-active", screenName === name);
  });
  document.querySelectorAll(".app-tabs button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screen === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function routeFromHash() {
  const route = window.location.hash.replace("#", "").toLowerCase();
  const screenName = route === "join" ? "profile" : route === "book" ? "booking" : route;
  if (screens[screenName]) {
    showScreen(screenName);
  }
}

function persistProfile(nextProfile) {
  profile = nextProfile;
  localStorage.setItem("gg-community-profile", JSON.stringify(profile));
  if (nextProfile?.phone) {
    writeCookie("gg_phone", nextProfile.phone, 180);
    writeCookie("gg_dname", nextProfile.displayName || "", 180);
    localStorage.setItem("gg-member-phone", nextProfile.phone);
    localStorage.setItem("gg-member-display-name", nextProfile.displayName || "");
    savedPhone = nextProfile.phone;
    savedDisplayName = nextProfile.displayName || "";
  }
  renderProfileState();
}

function renderProfileState() {
  const alias = currentAlias();
  profileChip.textContent = profile ? alias.replace("Not Another ", "") : "Join";
  aliasPreview.textContent = alias;
  profilePrompt.hidden = Boolean(profile);
  renderMenuActions();

  if (profile) {
    profileForm.elements.phone.value = profile.phone;
    profileForm.elements.displayName.value = profile.displayName || "";
  } else if (savedPhone) {
    profileForm.elements.phone.value = savedPhone;
    if (savedDisplayName) {
      profileForm.elements.displayName.value = savedDisplayName;
      aliasPreview.textContent = makeAlias(savedDisplayName);
    }
  }
}

function renderMenuActions() {
  thoughtActions.hidden = !profile;
}

function renderSpecialToday() {
  if (!specialToday) return;
  if (!specialTodayItem) {
    specialToday.hidden = true;
    specialToday.innerHTML = "";
    renderMenuActions();
    return;
  }

  specialToday.hidden = false;
  specialToday.innerHTML = `
    <button class="special-artifact-button" type="button" aria-label="Special GG Bev today">
      Special Today
    </button>
    <div>
      <span>Special GG Bev Today</span>
      <strong>${escapeHtml(specialTodayItem.name)}</strong>
      ${specialTodayItem.note ? `<p>${escapeHtml(specialTodayItem.note)}</p>` : ""}
    </div>
    <b>${money(specialTodayItem.price)}</b>
  `;
  renderMenuActions();
}

function renderMenu() {
  const total = totalOrdersToday();
  let previousSection = "";

  communityMenu.innerHTML = menuItems
    .map((item, index) => {
      const section = item.category === "GG Bev" ? `GG Bev / ${item.subcategory || "Drinks"}` : "GG Snack";
      const sectionMarkup =
        section !== previousSection
          ? `<div class="menu-section-break"><span>${section}</span><small>${section === "GG Snack" ? "Rs 60 each" : "Prices placeholder"}</small></div>`
          : "";
      const percent = total > 0 ? Math.max(6, Math.round((item.vouches / total) * 100)) : 0;
      const isVouched = vouched.has(item.id);
      previousSection = section;
      return `
        ${sectionMarkup}
        <article class="vote-card ${isVouched ? "is-vouched" : ""}" data-item-id="${item.id}">
          <span class="vote-card-top">
            <span>
              <small>#${index + 1} community pick / ${item.subcategory || item.category}</small>
              <strong>${item.name}</strong>
            </span>
            <button class="vouch-mark" type="button" data-vouch="${item.id}" aria-pressed="${isVouched}">
              ${isVouched ? "Unvouch" : "Vouch"}
            </button>
          </span>
          <span class="vote-description">${item.description}</span>
          <span class="vote-meter" aria-label="${item.vouches} vouches">
            <span style="width: ${percent}%"></span>
          </span>
          <span class="vote-summary">
            <span>${item.vouches} vouches</span>
            <span>${money(item.price)}</span>
          </span>
        </article>
      `;
    })
    .join("");

  communityMenu.querySelectorAll("[data-vouch]").forEach((button) => {
    button.addEventListener("click", () => vouchFor(button.dataset.vouch));
  });
}

function renderThoughtItems() {
  thoughtItems.innerHTML = menuItems
    .map((item, index) => `
      <label class="radio-item">
        <input name="itemId" type="radio" value="${item.id}" ${index === 0 ? "checked" : ""} />
        <span>
          <strong>${item.name}</strong>
          <small>${item.subcategory || item.category} / ${item.vouches} vouches</small>
        </span>
      </label>
    `)
    .join("");
}

function renderWallQuote() {
  const thought = communityThoughts[communityThoughts.length - 1];
  const item = menuItems.find((menuItem) => menuItem.id === thought.itemId);
  wallQuote.textContent = `"${thought.text}" - ${thought.alias}${item ? ` on ${item.name}` : ""}`;
}

function vouchFor(itemId) {
  if (!profile) {
    showScreen("profile");
    profileMessage.textContent = "Join Not Another Experience once, then your vouches belong to the room.";
    profileMessage.className = "form-message";
    return;
  }

  const item = menuItems.find((menuItem) => menuItem.id === itemId);
  if (!item) return;

  if (vouched.has(itemId)) {
    item.vouches = Math.max(0, item.vouches - 1);
    vouched.delete(itemId);
  } else {
    item.vouches += 1;
    vouched.add(itemId);
  }

  localStorage.setItem("gg-vouched-items", JSON.stringify([...vouched]));
  saveMenuStats();
  renderMenu();
  renderThoughtItems();
}

function submitThought(event) {
  event.preventDefault();
  if (!profile) {
    showScreen("profile");
    profileMessage.textContent = "Join Not Another Experience so the wall knows whose trace this is.";
    return;
  }

  const form = new FormData(thoughtForm);
  const itemId = form.get("itemId");
  const item = menuItems.find((menuItem) => menuItem.id === itemId);
  const thought = String(form.get("thought") || "").trim();
  const text = thought || `${item.name} got a quiet nod from ${currentAlias()}.`;

  communityThoughts.push({ itemId, alias: currentAlias(), text });
  memberCount += 1;
  if (item) {
    item.vouches += 1;
  }

  localStorage.setItem("gg-founder-count", String(memberCount));
  saveMenuStats();
  thanksCount.textContent = `${memberCount} community members today.`;
  postedThought.textContent = `"${text}" - ${currentAlias()}`;
  thoughtForm.reset();
  renderMenu();
  renderThoughtItems();
  renderWallQuote();
  showScreen("thanks");
}

async function submitProfile(event) {
  event.preventDefault();
  const form = new FormData(profileForm);
  const phone = String(form.get("phone") || "").replace(/\D/g, "");
  const displayName = String(form.get("displayName") || "").trim();

  if (phone.length !== 10) {
    profileMessage.textContent = "Use a valid 10 digit Indian phone number.";
    profileMessage.className = "form-message error";
    return;
  }

  if (!displayName) {
    profileMessage.textContent = "Your Not Another name is required.";
    profileMessage.className = "form-message error";
    return;
  }

  const nextProfile = {
    phone,
    identity: displayName,
    alias: makeAlias(displayName),
    displayName
  };

  try {
    const data = await postJson("/api/community-members", nextProfile);
    persistProfile(data.member || nextProfile);
    profileMessage.textContent = `${currentAlias()} has entered the room.`;
    profileMessage.className = "form-message success";
    window.location.href = "/philosophy.html";
  } catch (error) {
    profileMessage.textContent = error.message;
    profileMessage.className = "form-message error";
  }
}

async function loadMenu() {
  try {
    const [menuResponse, specialResponse] = await Promise.all([
      fetch("/api/menu", { cache: "no-store" }),
      fetch("/api/special-today", { cache: "no-store" })
    ]);
    const data = await menuResponse.json();
    const specialData = await specialResponse.json();
    if (!menuResponse.ok) throw new Error(data.error || "Could not load menu.");
    menuItems = enrichMenu(data.menu.length ? data.menu : fallbackMenu);
    specialTodayItem = specialResponse.ok ? specialData.specialToday : null;
  } catch (error) {
    menuItems = enrichMenu(fallbackMenu);
    specialTodayItem = null;
  }
}

async function boot() {
  await restoreProfileFromServer();
  await loadMenu();
  renderProfileState();
  renderSpecialToday();
  renderMenu();
  renderThoughtItems();
  renderWallQuote();

  thoughtButton.addEventListener("click", () => showScreen("thought"));
  thoughtForm.addEventListener("submit", submitThought);
  profileForm.addEventListener("submit", submitProfile);
  profileForm.elements.displayName.addEventListener("input", () => {
    const displayName = profileForm.elements.displayName.value.trim() || "Regular";
    aliasPreview.textContent = makeAlias(displayName);
  });
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showScreen(button.dataset.screen);
    });
  });
  window.addEventListener("hashchange", routeFromHash);
  routeFromHash();
}

boot();
