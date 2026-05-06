const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "gg-admin";
const SESSION_SECRET = process.env.SESSION_SECRET || "not-a-cafe-local-secret";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = process.env.VERCEL ? path.join(os.tmpdir(), "gg-db.json") : path.join(DATA_DIR, "db.json");
const PUBLIC_DIR = path.join(__dirname, "public");

const DEFAULT_DB = {
  consoles: [
    { id: "ps5-1", name: "PS5 Console 1", station: "Red Bay", walkInStatus: "available" },
    { id: "ps5-2", name: "PS5 Console 2", station: "White Bay", walkInStatus: "available" }
  ],
  bookings: [],
  orders: [],
  menu: [
    { id: "gg-fries", category: "GG Snacks", name: "GG Loaded Fries", price: 189 },
    { id: "cheese-bites", category: "GG Snacks", name: "Crispy Cheese Bites", price: 169 },
    { id: "peri-popcorn", category: "GG Snacks", name: "Peri Peri Popcorn", price: 139 },
    { id: "red-fizz", category: "GG Bev", name: "Red Strip Fizz", price: 129 },
    { id: "cold-coffee", category: "GG Bev", name: "GG Cold Coffee", price: 149 },
    { id: "white-soda", category: "GG Bev", name: "White Neon Soda", price: 119 }
  ]
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
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
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
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
    payloadAge < 12 * 60 * 60 * 1000 &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
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
  return { playerName, phone, startTime, endTime, snackIds, ...playSlot };
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
        "Set-Cookie": `gg_admin=${encodeURIComponent(createSessionCookie())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`
      });
      res.end(JSON.stringify({ ok: true }));
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
    sendJson(res, 200, { menu: db.menu });
    return;
  }

  if (req.method === "POST" && pathname === "/api/menu") {
    if (!requireAdmin(req, res)) return;
    try {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      const category = String(body.category || "").trim();
      const price = Number(body.price);

      if (!name || !["GG Snacks", "GG Bev"].includes(category) || !Number.isFinite(price) || price < 0) {
        sendJson(res, 400, { error: "Menu item needs a name, GG Snacks/GG Bev category, and a valid price." });
        return;
      }

      const baseId = slugify(name) || "menu-item";
      let id = baseId;
      let suffix = 2;
      while (db.menu.some((item) => item.id === id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }

      const item = { id, category, name, price: Math.round(price) };
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
      const price = Number(body.price);

      if (!item || !name || !["GG Snacks", "GG Bev"].includes(category) || !Number.isFinite(price) || price < 0) {
        sendJson(res, 400, { error: "Choose an existing item and enter valid menu details." });
        return;
      }

      item.name = name;
      item.category = category;
      item.price = Math.round(price);
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

  if (req.method === "POST" && pathname === "/api/orders") {
    try {
      const body = await readBody(req);
      const customerName = String(body.customerName || "").trim();
      const phone = String(body.phone || "").trim();
      const pickupTime = parseDate(body.pickupTime);
      const menuIds = new Set(db.menu.map((item) => item.id));
      const items = Array.isArray(body.items) ? body.items.filter((id) => menuIds.has(id)) : [];

      if (!customerName || !phone || !pickupTime || items.length === 0) {
        sendJson(res, 400, { error: "Name, phone, pickup time, and at least one item are required." });
        return;
      }

      const order = {
        id: crypto.randomUUID(),
        customerName,
        phone,
        pickupTime: pickupTime.toISOString(),
        items,
        status: "received",
        createdAt: new Date().toISOString()
      };
      db.orders.push(order);
      writeDb(db);
      sendJson(res, 201, { order });
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
    res.writeHead(200, { "Content-Type": MIME_TYPES[extension] || "application/octet-stream" });
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

module.exports = { handleRequest };
