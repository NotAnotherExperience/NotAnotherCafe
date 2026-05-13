const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvFile();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "gg-admin";
const SESSION_SECRET = process.env.SESSION_SECRET || "not-a-cafe-local-secret";
const ADMIN_SESSION_MINUTES = Math.max(1, Number(process.env.ADMIN_SESSION_MINUTES || 60));
const ADMIN_SESSION_MS = ADMIN_SESSION_MINUTES * 60 * 1000;
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = process.env.VERCEL ? path.join(os.tmpdir(), "gg-db.json") : path.join(DATA_DIR, "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const DEFAULT_DB = {
  consoles: [
    { id: "ps5-1", name: "PS5 Console 1", station: "Red Bay", walkInStatus: "available" },
    { id: "ps5-2", name: "PS5 Console 2", station: "Yellow Bay", walkInStatus: "available" }
  ],
  bookings: [],
  communityMembers: [],
  posSales: [],
  expenses: [],
  gamingSessions: [],
  specialToday: null,
  menu: [
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
  ]
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

function ensureDb() {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    const seedPath = path.join(DATA_DIR, "db.json");
    const seedDb = fs.existsSync(seedPath) ? fs.readFileSync(seedPath, "utf8") : JSON.stringify(DEFAULT_DB, null, 2);
    fs.writeFileSync(DB_PATH, seedDb);
  }
}

function readDb() {
  ensureDb();
  return normalizeDb(JSON.parse(fs.readFileSync(DB_PATH, "utf8")));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function normalizeDb(db) {
  if (!Array.isArray(db.communityMembers)) db.communityMembers = [];
  if (!Array.isArray(db.posSales)) db.posSales = [];
  if (!Array.isArray(db.expenses)) db.expenses = [];
  if (!Array.isArray(db.gamingSessions)) db.gamingSessions = [];
  if (!Array.isArray(db.menu)) db.menu = [...DEFAULT_DB.menu];
  if (!Object.prototype.hasOwnProperty.call(db, "specialToday")) db.specialToday = null;
  return db;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce((cookies, cookie) => {
      const separator = cookie.indexOf("=");
      if (separator === -1) return cookies;
      cookies[decodeURIComponent(cookie.slice(0, separator))] = decodeURIComponent(cookie.slice(separator + 1));
      return cookies;
    }, {});
}

function signSession(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function createSessionCookie() {
  const payload = `admin:${Date.now()}`;
  return `${payload}.${signSession(payload)}`;
}

function createMemberCookie(phone) {
  const payload = `member:${phone}:${Date.now()}`;
  return `${payload}.${signSession(payload)}`;
}

function isAdmin(req) {
  const session = parseCookies(req).gg_admin;
  if (!session) return false;

  const splitAt = session.lastIndexOf(".");
  if (splitAt === -1) return false;

  const payload = session.slice(0, splitAt);
  const signature = session.slice(splitAt + 1);
  const expected = signSession(payload);
  const payloadAge = Date.now() - Number(payload.split(":")[1]);
  if (signature.length !== expected.length) return false;
  return (
    payload.startsWith("admin:") &&
    Number.isFinite(payloadAge) &&
    payloadAge < ADMIN_SESSION_MS &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

function memberPhoneFromCookie(req) {
  const session = parseCookies(req).gg_member;
  if (!session) return null;

  const splitAt = session.lastIndexOf(".");
  if (splitAt === -1) return null;

  const payload = session.slice(0, splitAt);
  const signature = session.slice(splitAt + 1);
  const expected = signSession(payload);
  const [, phone, timestamp] = payload.split(":");
  const payloadAge = Date.now() - Number(timestamp);

  if (!payload.startsWith("member:") || normalizePhone(phone).length !== 10) return null;
  if (!Number.isFinite(payloadAge) || payloadAge > 180 * 24 * 60 * 60 * 1000) return null;
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return normalizePhone(phone);
}

function sendRedirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  sendJson(res, 401, { error: "Admin login required." });
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large."));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
  });
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function bookingIsActive(booking, now = new Date()) {
  return booking.status === "confirmed" && parseDate(booking.startTime) <= now && now < parseDate(booking.endTime);
}

function bookingConflicts(bookings, consoleId, startTime, endTime) {
  return bookings.some((booking) => {
    if (booking.consoleId !== consoleId || booking.status !== "confirmed") return false;
    return overlaps(startTime, endTime, parseDate(booking.startTime), parseDate(booking.endTime));
  });
}

function getAvailability(db) {
  const now = new Date();
  return db.consoles.map((console) => {
    const activeBooking = db.bookings.find((booking) => booking.consoleId === console.id && bookingIsActive(booking, now));
    return {
      ...console,
      status: activeBooking ? "booked" : console.walkInStatus,
      currentBooking: activeBooking
        ? {
            playerName: activeBooking.playerName,
            endTime: activeBooking.endTime
          }
        : null
    };
  });
}

function publicBooking(booking) {
  return {
    id: booking.id,
    consoleId: booking.consoleId,
    gameType: booking.gameType,
    playerName: booking.playerName,
    startTime: booking.startTime,
    endTime: booking.endTime,
    playPrice: booking.playPrice,
    snackIds: booking.snackIds,
    status: booking.status
  };
}

function getPlaySlot(input) {
  const gameType = input.gameType === "fc26" ? "fc26" : "regular";
  if (gameType === "fc26") {
    return {
      gameType,
      durationMinutes: 17,
      playPrice: 70,
      label: "FC26 premium match"
    };
  }

  const durationMinutes = Number(input.durationMinutes);
  if (durationMinutes === 30) {
    return {
      gameType,
      durationMinutes,
      playPrice: 100,
      label: "Regular game"
    };
  }

  if (durationMinutes === 60) {
    return {
      gameType,
      durationMinutes,
      playPrice: 180,
      label: "Regular game"
    };
  }

  return { error: "Regular PS5 bookings are available for 30 minutes or 1 hour. FC26 is a 17-minute premium match." };
}

function validateBookingInput(db, input) {
  const consoleExists = db.consoles.some((console) => console.id === input.consoleId);
  const startTime = parseDate(input.startTime);
  const playSlot = getPlaySlot(input);
  const playerName = String(input.playerName || "").trim();
  const phone = String(input.phone || "").trim();

  if (!consoleExists) return { error: "Choose one of the available PS5 consoles." };
  if (!playerName) return { error: "Player name is required." };
  if (!phone) return { error: "Phone number is required." };
  if (!startTime) return { error: "Choose a valid booking date and time." };
  if (playSlot.error) return { error: playSlot.error };

  const minStart = new Date(Date.now() - 60_000);
  if (startTime < minStart) return { error: "Booking time cannot be in the past." };

  const endTime = new Date(startTime.getTime() + playSlot.durationMinutes * 60_000);
  if (bookingConflicts(db.bookings, input.consoleId, startTime, endTime)) {
    return { error: "That console is already booked for this time. Try another slot or console." };
  }

  const menuIds = new Set(db.menu.map((item) => item.id));
  const snackIds = Array.isArray(input.snackIds) ? input.snackIds.filter((id) => menuIds.has(id)) : [];
  const vibeNote = String(input.vibeNote || "").trim().slice(0, 80);
  return { playerName, phone, startTime, endTime, snackIds, vibeNote, ...playSlot };
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

async function handleApi(req, res, pathname) {
  const db = readDb();

  if (req.method === "POST" && pathname === "/api/admin/login") {
    try {
      const body = await readBody(req);
      if (String(body.password || "") !== ADMIN_PASSWORD) {
        sendJson(res, 401, { error: "Wrong admin password." });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `gg_admin=${encodeURIComponent(createSessionCookie())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ADMIN_SESSION_MINUTES * 60}`
      });
      res.end(JSON.stringify({ ok: true, expiresInMinutes: ADMIN_SESSION_MINUTES }));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/logout") {
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": "gg_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/me") {
    sendJson(res, isAdmin(req) ? 200 : 401, { admin: isAdmin(req) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/availability") {
    sendJson(res, 200, { consoles: getAvailability(db), serverTime: new Date().toISOString() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/menu") {
    const CATEGORY_ORDER = { "GG Snack": 0, "GG Bev": 1 };
    const SUBCATEGORY_ORDER = { "GG Snack": 0, "Iced": 1, "Hot": 2 };
    const sorted = [...db.menu].sort((a, b) => {
      const catDiff = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      const subDiff = (SUBCATEGORY_ORDER[a.subcategory] ?? 99) - (SUBCATEGORY_ORDER[b.subcategory] ?? 99);
      if (subDiff !== 0) return subDiff;
      return a.name.localeCompare(b.name);
    });
    sendJson(res, 200, { menu: sorted });
    return;
  }

  if (req.method === "GET" && pathname === "/api/special-today") {
    sendJson(res, 200, { specialToday: db.specialToday || null });
    return;
  }

  if (req.method === "GET" && pathname === "/api/community-members/me") {
    const phone = memberPhoneFromCookie(req);
    if (!phone) {
      sendJson(res, 401, { member: null });
      return;
    }

    const member = db.communityMembers.find((item) => item.phone === phone);
    if (!member) {
      sendJson(res, 404, { member: null });
      return;
    }

    sendJson(res, 200, { member });
    return;
  }

  if (req.method === "POST" && pathname === "/api/community-members") {
    try {
      const body = await readBody(req);
      const phone = normalizePhone(body.phone);
      const identity = String(body.identity || "Regular").trim().slice(0, 40) || "Regular";
      const alias = String(body.alias || `Not Another ${identity}`).trim().slice(0, 80);
      const displayName = String(body.displayName || "").trim().slice(0, 40);

      if (phone.length !== 10) {
        sendJson(res, 400, { error: "A valid 10 digit Indian phone number is required." });
        return;
      }

      if (!Array.isArray(db.communityMembers)) db.communityMembers = [];

      const existing = db.communityMembers.find((member) => member.phone === phone);
      const timestamp = new Date().toISOString();
      if (existing) {
        existing.identity = identity;
        existing.alias = alias;
        existing.displayName = displayName;
        existing.updatedAt = timestamp;
        writeDb(db);
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "Set-Cookie": `gg_member=${encodeURIComponent(createMemberCookie(phone))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${180 * 24 * 60 * 60}`
        });
        res.end(JSON.stringify({ member: existing }));
        return;
      }

      const member = {
        id: crypto.randomUUID(),
        phone,
        identity,
        alias,
        displayName,
        joinedAt: timestamp,
        updatedAt: timestamp
      };
      db.communityMembers.push(member);
      writeDb(db);
      res.writeHead(201, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Set-Cookie": `gg_member=${encodeURIComponent(createMemberCookie(phone))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${180 * 24 * 60 * 60}`
      });
      res.end(JSON.stringify({ member }));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/menu") {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const category = String(body.category || "").trim();
      const subcategory = String(body.subcategory || "").trim();
      const price = Number(body.price);
      const description = String(body.description || "").trim().slice(0, 120);

      if (!name || !["GG Snack", "GG Bev"].includes(category) || !Number.isFinite(price) || price < 0) {
        sendJson(res, 400, { error: "Menu item needs a name, GG Snack/GG Bev category, and a valid price." });
        return;
      }

      const baseId = slugify(name) || "menu-item";
      let id = baseId;
      let suffix = 2;
      while (db.menu.some((item) => item.id === id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      const item = { id, category, subcategory: subcategory || category, name, price: Math.round(price), description };
      db.menu.push(item);
      writeDb(db);
      sendJson(res, 201, { item });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "PUT" && pathname.startsWith("/api/menu/")) {
    if (!requireAdmin(req, res)) return;
    try {
      const itemId = pathname.split("/").pop();
      const body = await readBody(req);
      const item = db.menu.find((menuItem) => menuItem.id === itemId);
      const name = String(body.name || "").trim();
      const category = String(body.category || "").trim();
      const subcategory = String(body.subcategory || "").trim();
      const price = Number(body.price);
      const description = String(body.description || "").trim().slice(0, 120);

      if (!item || !name || !["GG Snack", "GG Bev"].includes(category) || !Number.isFinite(price) || price < 0) {
        sendJson(res, 400, { error: "Choose an existing item and enter valid menu details." });
        return;
      }

      item.name = name;
      item.category = category;
      item.subcategory = subcategory || category;
      item.price = Math.round(price);
      item.description = description;
      writeDb(db);
      sendJson(res, 200, { item });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/menu/")) {
    if (!requireAdmin(req, res)) return;
    const itemId = pathname.split("/").pop();
    const menuLength = db.menu.length;
    db.menu = db.menu.filter((item) => item.id !== itemId);

    if (db.menu.length === menuLength) {
      sendJson(res, 404, { error: "Menu item not found." });
      return;
    }

    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "PUT" && pathname === "/api/special-today") {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const price = Number(body.price);
      const note = String(body.note || "").trim().slice(0, 90);

      if (!name || !Number.isFinite(price) || price < 0) {
        sendJson(res, 400, { error: "Special today needs a drink name and a valid price." });
        return;
      }

      db.specialToday = {
        id: slugify(name) || "special-gg-bev",
        category: "GG Bev",
        name,
        price: Math.round(price),
        note,
        updatedAt: new Date().toISOString()
      };
      writeDb(db);
      sendJson(res, 200, { specialToday: db.specialToday });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && pathname === "/api/special-today") {
    if (!requireAdmin(req, res)) return;
    db.specialToday = null;
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/pos-sales") {
    if (!requireAdmin(req, res)) return;
    const sales = [...db.posSales].sort((a, b) => parseDate(b.soldAt) - parseDate(a.soldAt));
    sendJson(res, 200, { sales });
    return;
  }

  if (req.method === "POST" && pathname === "/api/pos-sales") {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req);
      const itemId = String(body.itemId || "").trim();
      const quantity = Math.max(1, Math.min(99, Math.round(Number(body.quantity) || 1)));
      const paymentMode = String(body.paymentMode || "UPI").trim().slice(0, 24) || "UPI";
      const note = String(body.note || "").trim().slice(0, 90);
      const menuItem = db.menu.find((item) => item.id === itemId);
      const isSpecial = itemId === "special-today" && db.specialToday;
      const source = isSpecial ? db.specialToday : menuItem;

      if (!source) {
        sendJson(res, 400, { error: "Choose an item from the POS menu." });
        return;
      }

      const unitPrice = Math.max(0, Math.round(Number(source.price) || 0));
      const sale = {
        id: crypto.randomUUID(),
        itemId,
        itemName: source.name,
        category: source.category || "GG Bev",
        quantity,
        unitPrice,
        total: unitPrice * quantity,
        paymentMode,
        note,
        soldAt: new Date().toISOString()
      };

      db.posSales.push(sale);
      writeDb(db);
      sendJson(res, 201, { sale });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/pos-sales/")) {
    if (!requireAdmin(req, res)) return;
    const saleId = decodeURIComponent(pathname.replace("/api/pos-sales/", ""));
    const saleLength = db.posSales.length;
    db.posSales = db.posSales.filter((sale) => sale.id !== saleId);
    if (db.posSales.length === saleLength) {
      sendJson(res, 404, { error: "POS sale not found." });
      return;
    }
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "DELETE" && pathname === "/api/pos-sales") {
    if (!requireAdmin(req, res)) return;
    db.posSales = [];
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/expenses") {
    if (!requireAdmin(req, res)) return;
    const expenses = [...db.expenses].sort((a, b) => parseDate(b.spentAt) - parseDate(a.spentAt));
    sendJson(res, 200, { expenses });
    return;
  }

  if (req.method === "POST" && pathname === "/api/expenses") {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req);
      const title = String(body.title || "").trim().slice(0, 80);
      const category = String(body.category || "Cafe").trim().slice(0, 40) || "Cafe";
      const amount = Math.max(0, Math.round(Number(body.amount) || 0));
      const note = String(body.note || "").trim().slice(0, 120);

      if (!title || amount <= 0) {
        sendJson(res, 400, { error: "Expense needs a name and an amount above 0." });
        return;
      }

      const expense = {
        id: crypto.randomUUID(),
        title,
        category,
        amount,
        note,
        spentAt: new Date().toISOString()
      };

      db.expenses.push(expense);
      writeDb(db);
      sendJson(res, 201, { expense });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/expenses/")) {
    if (!requireAdmin(req, res)) return;
    const expenseId = decodeURIComponent(pathname.replace("/api/expenses/", ""));
    const expenseLength = db.expenses.length;
    db.expenses = db.expenses.filter((expense) => expense.id !== expenseId);
    if (db.expenses.length === expenseLength) {
      sendJson(res, 404, { error: "Expense not found." });
      return;
    }
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/gaming-sessions") {
    if (!requireAdmin(req, res)) return;
    const sessions = [...db.gamingSessions].sort((a, b) => parseDate(b.startedAt) - parseDate(a.startedAt));
    sendJson(res, 200, { sessions });
    return;
  }

  if (req.method === "POST" && pathname === "/api/gaming-sessions") {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req);
      const station = String(body.station || "").trim();
      const customerName = String(body.customerName || "").trim().slice(0, 48);
      const sessionType = String(body.sessionType || "").trim();
      const paymentMode = String(body.paymentMode || "UPI").trim().slice(0, 24) || "UPI";
      const note = String(body.note || "").trim().slice(0, 90);
      const sessionTypes = {
        "30-min": { label: "30 min PS5 session", durationMinutes: 30, total: 100, timed: true },
        "60-min": { label: "1 hr PS5 session", durationMinutes: 60, total: 180, timed: true },
        fifa: { label: "FC26 / FIFA game", durationMinutes: 0, total: 70, timed: false }
      };
      const plan = sessionTypes[sessionType];

      if (!["Red Bay", "Yellow Bay"].includes(station) || !plan || !customerName) {
        sendJson(res, 400, { error: "Choose a bay, enter customer name, and select a gaming bill." });
        return;
      }

      const activeInStation = db.gamingSessions.some((session) => (
        session.station === station &&
        session.status === "running" &&
        session.endsAt &&
        parseDate(session.endsAt) > new Date()
      ));

      if (plan.timed && activeInStation) {
        sendJson(res, 409, { error: `${station} already has a running timed session.` });
        return;
      }

      const startedAt = new Date();
      const session = {
        id: crypto.randomUUID(),
        station,
        customerName,
        sessionType,
        label: plan.label,
        durationMinutes: plan.durationMinutes,
        total: plan.total,
        paymentMode,
        note,
        status: plan.timed ? "running" : "logged",
        startedAt: startedAt.toISOString(),
        endsAt: plan.timed ? new Date(startedAt.getTime() + plan.durationMinutes * 60 * 1000).toISOString() : null
      };

      db.gamingSessions.push(session);
      writeDb(db);
      sendJson(res, 201, { session });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/gaming-sessions/")) {
    if (!requireAdmin(req, res)) return;
    const sessionId = decodeURIComponent(pathname.replace("/api/gaming-sessions/", ""));
    const session = db.gamingSessions.find((entry) => entry.id === sessionId);
    if (!session) {
      sendJson(res, 404, { error: "Gaming session not found." });
      return;
    }
    try {
      const body = await readBody(req);
      const extendTypes = {
        "30-min": { minutes: 30, amount: 100 },
        "60-min": { minutes: 60, amount: 180 },
        fifa: { minutes: 17, amount: 70 }
      };
      const extend = extendTypes[body.extendType];
      if (extend) {
        if (session.status !== "running" || !session.endsAt) {
          sendJson(res, 400, { error: "Only running timed sessions can be extended." });
          return;
        }
        const currentEnd = parseDate(session.endsAt);
        const base = currentEnd && currentEnd > new Date() ? currentEnd : new Date();
        session.endsAt = new Date(base.getTime() + extend.minutes * 60 * 1000).toISOString();
        session.total = Number(session.total || 0) + extend.amount;
        session.durationMinutes = Number(session.durationMinutes || 0) + extend.minutes;
        writeDb(db);
        sendJson(res, 200, { session });
        return;
      }
      session.status = "complete";
      session.completedAt = new Date().toISOString();
      writeDb(db);
      sendJson(res, 200, { session });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/gaming-sessions/")) {
    if (!requireAdmin(req, res)) return;
    const sessionId = decodeURIComponent(pathname.replace("/api/gaming-sessions/", ""));
    const sessionLength = db.gamingSessions.length;
    db.gamingSessions = db.gamingSessions.filter((session) => session.id !== sessionId);
    if (db.gamingSessions.length === sessionLength) {
      sendJson(res, 404, { error: "Gaming session not found." });
      return;
    }
    writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && pathname === "/api/bookings") {
    const upcoming = db.bookings
      .filter((booking) => booking.status === "confirmed" && parseDate(booking.endTime) >= new Date())
      .sort((a, b) => parseDate(a.startTime) - parseDate(b.startTime))
      .map(publicBooking);
    sendJson(res, 200, { bookings: upcoming });
    return;
  }

  if (req.method === "POST" && pathname === "/api/bookings") {
    try {
      const body = await readBody(req);
      const valid = validateBookingInput(db, body);
      if (valid.error) {
        sendJson(res, 400, { error: valid.error });
        return;
      }

      const booking = {
        id: crypto.randomUUID(),
        consoleId: body.consoleId,
        gameType: valid.gameType,
        gameLabel: valid.label,
        playerName: valid.playerName,
        phone: valid.phone,
        startTime: valid.startTime.toISOString(),
        endTime: valid.endTime.toISOString(),
        durationMinutes: valid.durationMinutes,
        playPrice: valid.playPrice,
        snackIds: valid.snackIds,
        vibeNote: valid.vibeNote,
        status: "confirmed",
        createdAt: new Date().toISOString()
      };

      db.bookings.push(booking);
      writeDb(db);
      sendJson(res, 201, { booking: publicBooking(booking) });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/consoles/")) {
    if (!requireAdmin(req, res)) return;
    try {
      const consoleId = pathname.split("/").pop();
      const body = await readBody(req);
      const allowedStatuses = new Set(["available", "occupied", "maintenance"]);
      const console = db.consoles.find((item) => item.id === consoleId);

      if (!console || !allowedStatuses.has(body.walkInStatus)) {
        sendJson(res, 400, { error: "Choose available, occupied, or maintenance for the console status." });
        return;
      }

      console.walkInStatus = body.walkInStatus;
      writeDb(db);
      sendJson(res, 200, { console });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

function serveStatic(req, res, pathname) {
  if ((pathname === "/admin.html" || pathname === "/admin.js") && !isAdmin(req)) {
    sendRedirect(res, "/admin-login.html");
    return;
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallbackContent) => {
        if (fallbackError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fallbackContent);
      });
      return;
    }

    const extension = path.extname(filePath);
    const headers = { "Content-Type": MIME_TYPES[extension] || "application/octet-stream" };
    if ([".html", ".js", ".css"].includes(extension)) {
      headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate";
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
    }
    res.writeHead(200, headers);
    res.end(content);
  });
}

function handleRequest(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      Promise.resolve(handleApi(req, res, url.pathname)).catch((error) => {
        console.error(error);
        if (!res.headersSent) {
          sendJson(res, 500, { error: "Server error. Please try again shortly." });
        } else {
          res.end();
        }
      });
      return;
    }

    serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server error. Please try again shortly." });
  }
}

if (require.main === module) {
  ensureDb();
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`GG is live at http://localhost:${PORT}`);
  });
}

module.exports = handleRequest;
module.exports.handleRequest = handleRequest;
