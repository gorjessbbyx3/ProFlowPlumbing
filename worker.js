// 808 All Purpose Cleaners — Full API Worker on Cloudflare D1
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const json = (data, status = 200) => Response.json(data, { status, headers: CORS });
const noContent = () => new Response(null, { status: 204, headers: CORS });
const err = (msg, status = 400) => json({ error: msg }, status);
const now = () => new Date().toISOString();

// Simple path router
function matchRoute(method, path, routes) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const regex = new RegExp("^" + r.path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$");
    const m = path.match(regex);
    if (m) return { handler: r.handler, params: m.groups || {} };
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const path = url.pathname.replace("/api", "");
    const method = request.method;
    const db = env.DB;

    // Seed checklist on first request if empty
    if (path === "/checklist" && method === "GET") {
      const { results } = await db.prepare("SELECT COUNT(*) as c FROM checklist_items").first() ? 
        { results: [await db.prepare("SELECT COUNT(*) as c FROM checklist_items").first()] } :
        { results: [{ c: 0 }] };
    }

    let body = null;
    const contentType = request.headers.get("content-type") || "";
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      if (contentType.includes("multipart/form-data")) {
        body = null; // FormData handled in route via request
      } else {
        try { body = await request.json(); } catch { body = {}; }
      }
    }
    const query = Object.fromEntries(url.searchParams);

    try {
      const match = matchRoute(method, path, routes);
      if (!match) return err("Not found", 404);
      return await match.handler({ db, params: match.params, body, query, request });
    } catch (e) {
      console.error(e);
      return err("Internal server error: " + e.message, 500);
    }
  },
};

// ── CRUD helper ──
async function crudList(db, table, orderBy = "id") {
  const { results } = await db.prepare(`SELECT * FROM ${table} ORDER BY ${orderBy}`).all();
  return json(results);
}
async function crudGet(db, table, id) {
  const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  if (!row) return err("Not found", 404);
  return json(row);
}
async function crudDelete(db, table, id) {
  const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  if (!row) return err("Not found", 404);
  await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return noContent();
}
function buildInsert(table, data) {
  const keys = Object.keys(data);
  const cols = keys.join(", ");
  const placeholders = keys.map(() => "?").join(", ");
  const vals = keys.map(k => data[k]);
  return { sql: `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, vals };
}
function buildUpdate(table, data, id) {
  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  if (keys.length === 0) return null;
  const sets = keys.map(k => `${k} = ?`).join(", ");
  const vals = [...keys.map(k => data[k]), id];
  return { sql: `UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`, vals };
}
// snake_case helper
const sc = (obj) => {
  if (!obj) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k.replace(/[A-Z]/g, l => "_" + l.toLowerCase())] = v;
  }
  return out;
};

// ── Routes ──
const routes = [
  // Health
  { method: "GET", path: "/healthz", handler: async () => json({ status: "ok" }) },

  // Dashboard stats
  { method: "GET", path: "/dashboard/stats", handler: async ({ db }) => {
    const today = new Date().toISOString().split("T")[0];
    const todayBookings = await db.prepare("SELECT COUNT(*) as c FROM bookings WHERE date = ?").bind(today).first();
    const pendingInvoices = await db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status = 'unpaid'").first();
    const totalRevenue = await db.prepare("SELECT COALESCE(SUM(CAST(total AS REAL)), 0) as t FROM invoices WHERE status = 'paid'").first();
    const activeEmployees = await db.prepare("SELECT COUNT(*) as c FROM employees WHERE status = 'active'").first();
    const pendingTodos = await db.prepare("SELECT COUNT(*) as c FROM todos WHERE completed = 0").first();
    const pendingFollowups = await db.prepare("SELECT COUNT(*) as c FROM followups WHERE status = 'pending'").first();
    const { results: recentBookings } = await db.prepare("SELECT * FROM bookings ORDER BY date DESC, time DESC LIMIT 5").all();
    return json({
      todayBookings: todayBookings?.c || 0,
      pendingInvoices: pendingInvoices?.c || 0,
      totalRevenue: parseFloat(totalRevenue?.t || 0).toFixed(2),
      activeEmployees: activeEmployees?.c || 0,
      pendingTodos: pendingTodos?.c || 0,
      pendingFollowups: pendingFollowups?.c || 0,
      recentBookings: recentBookings.map(camelRow),
    });
  }},

  // ── Employees ──
  { method: "GET", path: "/employees", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM employees ORDER BY name").all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/employees", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("employees", { name: d.name, email: d.email || null, phone: d.phone || null, role: d.role || "cleaner", hourly_rate: d.hourly_rate || "15.00", status: d.status || "active", created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM employees WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/employees/:id", handler: async ({ db, params }) => {
    const row = await db.prepare("SELECT * FROM employees WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "PATCH", path: "/employees/:id", handler: async ({ db, params, body }) => {
    const d = sc(body);
    const u = buildUpdate("employees", d, params.id);
    if (!u) return err("No fields to update");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM employees WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "DELETE", path: "/employees/:id", handler: async ({ db, params }) => crudDelete(db, "employees", params.id) },

  // ── Clients ──
  { method: "GET", path: "/clients", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM clients ORDER BY name").all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/clients", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("clients", { name: d.name, email: d.email || null, phone: d.phone || null, address: d.address || null, notes: d.notes || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/clients/:id", handler: async ({ db, params }) => {
    const row = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "PATCH", path: "/clients/:id", handler: async ({ db, params, body }) => {
    const u = buildUpdate("clients", sc(body), params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM clients WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "DELETE", path: "/clients/:id", handler: async ({ db, params }) => crudDelete(db, "clients", params.id) },

  // ── Bookings ──
  { method: "GET", path: "/bookings", handler: async ({ db, query }) => {
    let sql = "SELECT * FROM bookings";
    const conds = [], vals = [];
    if (query.status) { conds.push("status = ?"); vals.push(query.status); }
    if (query.date) { conds.push("date = ?"); vals.push(query.date); }
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " ORDER BY date DESC";
    const { results } = await db.prepare(sql).bind(...vals).all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/bookings", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("bookings", {
      client_id: d.client_id || null, employee_id: d.employee_id || null, service_type: d.service_type,
      status: d.status || "scheduled", date: d.date, time: d.time, location: d.location || null,
      notes: d.notes || null, estimated_price: d.estimated_price || null, client_name: d.client_name || null,
      client_phone: d.client_phone || null, client_email: d.client_email || null,
      recurrence_frequency: d.recurrence_frequency || null, recurrence_end_date: d.recurrence_end_date || null,
      parent_booking_id: d.parent_booking_id || null, latitude: d.latitude || null, longitude: d.longitude || null,
      created_at: now(), updated_at: now(),
    });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/bookings/:id", handler: async ({ db, params }) => {
    const row = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "PATCH", path: "/bookings/:id", handler: async ({ db, params, body }) => {
    const u = buildUpdate("bookings", sc(body), params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "DELETE", path: "/bookings/:id", handler: async ({ db, params }) => crudDelete(db, "bookings", params.id) },

  // ── Booking Photos ──
  { method: "GET", path: "/bookings/:id/photos", handler: async ({ db, params }) => {
    const bookingId = Number(params.id);
    if (isNaN(bookingId)) return err("Invalid ID");
    const { results } = await db.prepare("SELECT * FROM booking_photos WHERE booking_id = ?").bind(bookingId).all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/bookings/:id/photos", handler: async ({ db, params, request }) => {
    const bookingId = Number(params.id);
    if (isNaN(bookingId)) return err("Invalid ID");
    const booking = await db.prepare("SELECT id FROM bookings WHERE id = ?").bind(bookingId).first();
    if (!booking) return err("Booking not found", 404);

    const formData = await request.formData();
    const file = formData.get("photo");
    const photoType = formData.get("type");
    const caption = formData.get("caption") || null;

    if (!file || !(file instanceof File)) return err("No photo uploaded");
    if (!photoType || !["before", "after"].includes(photoType)) return err("type must be before or after");

    // Convert file to base64 data URI for storage (no filesystem on Workers)
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = file.type || "image/jpeg";
    const dataUri = `data:${mimeType};base64,${base64}`;

    const info = await db.prepare(
      "INSERT INTO booking_photos (booking_id, type, file_path, caption, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(bookingId, photoType, dataUri, caption, now()).run();
    const row = await db.prepare("SELECT * FROM booking_photos WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "DELETE", path: "/bookings/:id/photos/:photoId", handler: async ({ db, params }) => {
    const bookingId = Number(params.id);
    const photoId = Number(params.photoId);
    if (isNaN(bookingId) || isNaN(photoId)) return err("Invalid ID");
    const row = await db.prepare("SELECT id FROM booking_photos WHERE id = ? AND booking_id = ?").bind(photoId, bookingId).first();
    if (!row) return err("Photo not found", 404);
    await db.prepare("DELETE FROM booking_photos WHERE id = ?").bind(photoId).run();
    return noContent();
  }},

  // ── Generate Recurring Bookings ──
  { method: "POST", path: "/bookings/:id/generate-recurring", handler: async ({ db, params }) => {
    const bookingId = Number(params.id);
    if (isNaN(bookingId)) return err("Invalid ID");
    const source = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(bookingId).first();
    if (!source) return err("Booking not found", 404);
    if (!source.recurrence_frequency) return err("Booking has no recurrence set");

    const freq = source.recurrence_frequency;
    const endDate = source.recurrence_end_date ? new Date(source.recurrence_end_date) : null;
    const horizon = endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months default
    const daysToAdd = freq === "weekly" ? 7 : freq === "biweekly" ? 14 : 30;
    let currentDate = new Date(source.date);

    // Find existing child bookings to avoid duplicates
    const { results: existing } = await db.prepare("SELECT date FROM bookings WHERE parent_booking_id = ?").bind(bookingId).all();
    const existingDates = new Set(existing.map(b => b.date));

    const created = [];
    for (let i = 0; i < 52; i++) {
      currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      if (currentDate > horizon) break;
      const dateStr = currentDate.toISOString().split("T")[0];
      if (existingDates.has(dateStr)) continue;

      const info = await db.prepare(
        `INSERT INTO bookings (client_id, employee_id, service_type, status, date, time, location, notes,
         estimated_price, client_name, client_phone, client_email, parent_booking_id, latitude, longitude, created_at, updated_at)
         VALUES (?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        source.client_id, source.employee_id, source.service_type, dateStr, source.time,
        source.location, source.notes, source.estimated_price, source.client_name,
        source.client_phone, source.client_email, bookingId, source.latitude, source.longitude, now(), now()
      ).run();
      const row = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(info.meta.last_row_id).first();
      created.push(camelRow(row));
    }
    return json(created);
  }},

  // ── Invoices ──
  { method: "GET", path: "/invoices", handler: async ({ db, query }) => {
    let sql = "SELECT * FROM invoices";
    const vals = [];
    if (query.status) { sql += " WHERE status = ?"; vals.push(query.status); }
    sql += " ORDER BY created_at";
    const { results } = await db.prepare(sql).bind(...vals).all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/invoices", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("invoices", {
      booking_id: d.booking_id || null, client_id: d.client_id || null, invoice_number: d.invoice_number,
      amount: d.amount, tax: d.tax || "0", total: d.total, status: d.status || "unpaid",
      due_date: d.due_date || null, paid_date: d.paid_date || null, description: d.description || null,
      client_name: d.client_name || null, created_at: now(), updated_at: now(),
    });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/invoices/:id", handler: async ({ db, params }) => {
    const row = await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "PATCH", path: "/invoices/:id", handler: async ({ db, params, body }) => {
    const u = buildUpdate("invoices", sc(body), params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    return json(camelRow(row));
  }},
  { method: "DELETE", path: "/invoices/:id", handler: async ({ db, params }) => crudDelete(db, "invoices", params.id) },

  // ── Receipts ──
  { method: "GET", path: "/receipts", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM receipts ORDER BY created_at").all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/receipts", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("receipts", { invoice_id: d.invoice_id || null, amount: d.amount, payment_method: d.payment_method || "cash", payment_date: d.payment_date, notes: d.notes || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM receipts WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/receipts/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM receipts WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "PATCH", path: "/receipts/:id", handler: async ({ db, params, body }) => { const u = buildUpdate("receipts", sc(body), params.id); if (!u) return err("No fields"); await db.prepare(u.sql).bind(...u.vals).run(); const row = await db.prepare("SELECT * FROM receipts WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "DELETE", path: "/receipts/:id", handler: async ({ db, params }) => crudDelete(db, "receipts", params.id) },

  // ── Expenses ──
  { method: "GET", path: "/expenses", handler: async ({ db, query }) => {
    let sql = "SELECT * FROM expenses"; const conds = [], vals = [];
    if (query.startDate) { conds.push("date >= ?"); vals.push(query.startDate); }
    if (query.endDate) { conds.push("date <= ?"); vals.push(query.endDate); }
    if (query.category) { conds.push("category = ?"); vals.push(query.category); }
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " ORDER BY date DESC";
    const { results } = await db.prepare(sql).bind(...vals).all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/expenses", handler: async ({ db, body, request }) => {
    // Handle both JSON and FormData
    const contentType = request.headers.get("content-type") || "";
    let d, receiptImage = null;
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      d = { category: fd.get("category"), description: fd.get("description"), amount: fd.get("amount"), date: fd.get("date"), vendor: fd.get("vendor") || null, notes: fd.get("notes") || null };
      const file = fd.get("receiptImage");
      if (file && file instanceof File && file.size > 0) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        receiptImage = `data:${file.type || "image/jpeg"};base64,${base64}`;
      }
    } else {
      d = sc(body);
      receiptImage = d.receipt_image || null;
    }
    const { sql, vals } = buildInsert("expenses", { category: d.category, description: d.description, amount: d.amount, date: d.date, vendor: d.vendor || null, notes: d.notes || null, receipt_image: receiptImage, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM expenses WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/expenses/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM expenses WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "PATCH", path: "/expenses/:id", handler: async ({ db, params, body, request }) => {
    const contentType = request.headers.get("content-type") || "";
    let d;
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      d = {};
      for (const [k, v] of fd.entries()) {
        if (k === "receiptImage" && v instanceof File && v.size > 0) {
          const buffer = await v.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          d.receipt_image = `data:${v.type || "image/jpeg"};base64,${base64}`;
        } else if (k !== "receiptImage") {
          d[k.replace(/[A-Z]/g, l => "_" + l.toLowerCase())] = v;
        }
      }
    } else {
      d = sc(body);
    }
    const u = buildUpdate("expenses", d, params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM expenses WHERE id = ?").bind(params.id).first();
    return row ? json(camelRow(row)) : err("Not found", 404);
  }},
  { method: "POST", path: "/expenses/:id/receipt", handler: async ({ db, params, request }) => {
    const id = Number(params.id);
    if (isNaN(id)) return err("Invalid ID");
    const existing = await db.prepare("SELECT id FROM expenses WHERE id = ?").bind(id).first();
    if (!existing) return err("Expense not found", 404);
    const fd = await request.formData();
    const file = fd.get("receiptImage");
    if (!file || !(file instanceof File) || file.size === 0) return err("No image uploaded");
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const dataUri = `data:${file.type || "image/jpeg"};base64,${base64}`;
    await db.prepare("UPDATE expenses SET receipt_image = ?, updated_at = datetime('now') WHERE id = ?").bind(dataUri, id).run();
    const row = await db.prepare("SELECT * FROM expenses WHERE id = ?").bind(id).first();
    return json(camelRow(row));
  }},
  { method: "DELETE", path: "/expenses/:id", handler: async ({ db, params }) => crudDelete(db, "expenses", params.id) },

  // ── Shifts ──
  { method: "GET", path: "/shifts", handler: async ({ db, query }) => {
    let sql = "SELECT * FROM shifts"; const conds = [], vals = [];
    if (query.employeeId) { conds.push("employee_id = ?"); vals.push(query.employeeId); }
    if (query.startDate) { conds.push("date >= ?"); vals.push(query.startDate); }
    if (query.endDate) { conds.push("date <= ?"); vals.push(query.endDate); }
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " ORDER BY date";
    const { results } = await db.prepare(sql).bind(...vals).all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/shifts", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("shifts", { employee_id: d.employee_id, date: d.date, start_time: d.start_time, end_time: d.end_time, notes: d.notes || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM shifts WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/shifts/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM shifts WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "PATCH", path: "/shifts/:id", handler: async ({ db, params, body }) => { const u = buildUpdate("shifts", sc(body), params.id); if (!u) return err("No fields"); await db.prepare(u.sql).bind(...u.vals).run(); const row = await db.prepare("SELECT * FROM shifts WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "DELETE", path: "/shifts/:id", handler: async ({ db, params }) => crudDelete(db, "shifts", params.id) },

  // ── Labor Entries ──
  { method: "GET", path: "/labor-entries", handler: async ({ db, query }) => {
    let sql = "SELECT * FROM labor_entries"; const conds = [], vals = [];
    if (query.employeeId) { conds.push("employee_id = ?"); vals.push(query.employeeId); }
    if (query.startDate) { conds.push("date >= ?"); vals.push(query.startDate); }
    if (query.endDate) { conds.push("date <= ?"); vals.push(query.endDate); }
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " ORDER BY date";
    const { results } = await db.prepare(sql).bind(...vals).all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/labor-entries", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("labor_entries", { employee_id: d.employee_id, booking_id: d.booking_id || null, date: d.date, hours_worked: d.hours_worked, hourly_rate: d.hourly_rate, total_pay: d.total_pay, description: d.description || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM labor_entries WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/labor-entries/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM labor_entries WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "PATCH", path: "/labor-entries/:id", handler: async ({ db, params, body }) => { const u = buildUpdate("labor_entries", sc(body), params.id); if (!u) return err("No fields"); await db.prepare(u.sql).bind(...u.vals).run(); const row = await db.prepare("SELECT * FROM labor_entries WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "DELETE", path: "/labor-entries/:id", handler: async ({ db, params }) => crudDelete(db, "labor_entries", params.id) },

  // ── Todos ──
  { method: "GET", path: "/todos", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM todos ORDER BY created_at").all();
    return json(results.map(r => ({ ...camelRow(r), completed: !!r.completed })));
  }},
  { method: "POST", path: "/todos", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("todos", { title: d.title, description: d.description || null, priority: d.priority || "medium", due_date: d.due_date || null, completed: d.completed ? 1 : 0, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM todos WHERE id = ?").bind(info.meta.last_row_id).first();
    return json({ ...camelRow(row), completed: !!row.completed }, 201);
  }},
  { method: "GET", path: "/todos/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM todos WHERE id = ?").bind(params.id).first(); return row ? json({ ...camelRow(row), completed: !!row.completed }) : err("Not found", 404); }},
  { method: "PATCH", path: "/todos/:id", handler: async ({ db, params, body }) => {
    const d = sc(body);
    if (d.completed !== undefined) d.completed = d.completed ? 1 : 0;
    const u = buildUpdate("todos", d, params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM todos WHERE id = ?").bind(params.id).first();
    return row ? json({ ...camelRow(row), completed: !!row.completed }) : err("Not found", 404);
  }},
  { method: "DELETE", path: "/todos/:id", handler: async ({ db, params }) => crudDelete(db, "todos", params.id) },

  // ── Followups ──
  { method: "GET", path: "/followups", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM followups ORDER BY due_date").all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/followups", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("followups", { client_name: d.client_name, client_phone: d.client_phone || null, client_email: d.client_email || null, reason: d.reason, due_date: d.due_date, status: d.status || "pending", notes: d.notes || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM followups WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/followups/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM followups WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "PATCH", path: "/followups/:id", handler: async ({ db, params, body }) => { const u = buildUpdate("followups", sc(body), params.id); if (!u) return err("No fields"); await db.prepare(u.sql).bind(...u.vals).run(); const row = await db.prepare("SELECT * FROM followups WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "DELETE", path: "/followups/:id", handler: async ({ db, params }) => crudDelete(db, "followups", params.id) },

  // ── Campaigns ──
  { method: "GET", path: "/campaigns", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM campaigns ORDER BY created_at").all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/campaigns", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("campaigns", { name: d.name, type: d.type, status: d.status || "planned", start_date: d.start_date || null, end_date: d.end_date || null, budget: d.budget || null, target_audience: d.target_audience || null, description: d.description || null, notes: d.notes || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM campaigns WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/campaigns/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM campaigns WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "PATCH", path: "/campaigns/:id", handler: async ({ db, params, body }) => { const u = buildUpdate("campaigns", sc(body), params.id); if (!u) return err("No fields"); await db.prepare(u.sql).bind(...u.vals).run(); const row = await db.prepare("SELECT * FROM campaigns WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "DELETE", path: "/campaigns/:id", handler: async ({ db, params }) => crudDelete(db, "campaigns", params.id) },

  // ── Checklist ──
  { method: "GET", path: "/checklist", handler: async ({ db }) => {
    // Auto-seed if empty
    const cnt = await db.prepare("SELECT COUNT(*) as c FROM checklist_items").first();
    if (cnt.c === 0) {
      const seed = [
        ["Business Registration & Licensing","Register business entity (LLC or Sole Proprietorship)",1],["Business Registration & Licensing","Obtain state business license",2],["Business Registration & Licensing","Get Hawaii General Excise Tax (GET) license",3],["Business Registration & Licensing","Obtain Federal EIN",4],["Business Registration & Licensing","Register DBA if needed",5],
        ["Insurance","Get general liability insurance",6],["Insurance","Obtain surety bond",7],["Insurance","Set up workers compensation insurance",8],["Insurance","Get commercial auto insurance",9],["Insurance","Consider professional liability insurance",10],
        ["Equipment & Supplies","Purchase commercial-grade cleaning products",11],["Equipment & Supplies","Buy commercial vacuum cleaner",12],["Equipment & Supplies","Purchase pressure washer",13],["Equipment & Supplies","Stock microfiber cloths and towels",14],["Equipment & Supplies","Buy mop, buckets, and squeegees",15],["Equipment & Supplies","Get extension poles",16],["Equipment & Supplies","Purchase safety gear",17],["Equipment & Supplies","Buy caddy/organizer",18],["Equipment & Supplies","Stock trash bags and disposable supplies",19],["Equipment & Supplies","Purchase specialty boat/marine cleaning products",20],["Equipment & Supplies","Get auto detailing supplies",21],
        ["Vehicle & Transportation","Acquire work vehicle",22],["Vehicle & Transportation","Get vehicle signage/wrap",23],["Vehicle & Transportation","Set up fuel budget and tracking",24],["Vehicle & Transportation","Install vehicle storage system",25],
        ["Financial Setup","Open dedicated business bank account",26],["Financial Setup","Set up bookkeeping/accounting system",27],["Financial Setup","Create pricing structure",28],["Financial Setup","Set up payment methods",29],["Financial Setup","Create invoice templates",30],["Financial Setup","Set up expense tracking",31],["Financial Setup","Plan for quarterly GET tax payments",32],
        ["Marketing & Branding","Design and print business cards",33],["Marketing & Branding","Create professional logo",34],["Marketing & Branding","Build company website",35],["Marketing & Branding","Set up Facebook business page",36],["Marketing & Branding","Create Instagram business profile",37],["Marketing & Branding","Set up Google Business Profile",38],["Marketing & Branding","Create Yelp business listing",39],["Marketing & Branding","Order branded uniforms/shirts",40],["Marketing & Branding","Create flyers and door hangers",41],["Marketing & Branding","Set up a referral program",42],["Marketing & Branding","Join local business directories",43],
        ["Legal & Contracts","Create service agreement/contract template",44],["Legal & Contracts","Draft liability waiver",45],["Legal & Contracts","Write cancellation and refund policy",46],["Legal & Contracts","Create employee/contractor agreements",47],["Legal & Contracts","Establish terms and conditions",48],["Legal & Contracts","Review local regulations",49],
        ["Staffing","Create hiring plan and job descriptions",50],["Staffing","Set up background check process",51],["Staffing","Develop employee training program",52],["Staffing","Set up payroll system",53],["Staffing","Create employee handbook/policies",54],["Staffing","Establish uniform/dress code policy",55],
        ["Operations","Set up scheduling and booking system",56],["Operations","Create supply inventory tracking",57],["Operations","Develop quality inspection checklist",58],["Operations","Set up customer feedback process",59],["Operations","Create standard operating procedures",60],["Operations","Establish emergency response procedures",61],["Operations","Set up client communication templates",62],
      ];
      const stmt = db.prepare("INSERT INTO checklist_items (category, title, sort_order) VALUES (?, ?, ?)");
      await db.batch(seed.map(s => stmt.bind(s[0], s[1], s[2])));
    }
    const { results } = await db.prepare("SELECT * FROM checklist_items ORDER BY sort_order").all();
    return json(results.map(r => ({ ...camelRow(r), completed: !!r.completed })));
  }},
  { method: "POST", path: "/checklist", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("checklist_items", { category: d.category, title: d.title, description: d.description || null, completed: d.completed ? 1 : 0, sort_order: d.sort_order || 0, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM checklist_items WHERE id = ?").bind(info.meta.last_row_id).first();
    return json({ ...camelRow(row), completed: !!row.completed }, 201);
  }},
  { method: "GET", path: "/checklist/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM checklist_items WHERE id = ?").bind(params.id).first(); return row ? json({ ...camelRow(row), completed: !!row.completed }) : err("Not found", 404); }},
  { method: "PATCH", path: "/checklist/:id", handler: async ({ db, params, body }) => {
    const d = sc(body);
    if (d.completed !== undefined) d.completed = d.completed ? 1 : 0;
    const u = buildUpdate("checklist_items", d, params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM checklist_items WHERE id = ?").bind(params.id).first();
    return row ? json({ ...camelRow(row), completed: !!row.completed }) : err("Not found", 404);
  }},
  { method: "DELETE", path: "/checklist/:id", handler: async ({ db, params }) => crudDelete(db, "checklist_items", params.id) },

  // ── Inventory ──
  { method: "GET", path: "/inventory", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM inventory ORDER BY updated_at DESC").all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/inventory", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("inventory", { name: d.name, category: d.category, quantity: d.quantity || 0, unit: d.unit || "units", min_stock: d.min_stock || 0, cost: d.cost || null, supplier: d.supplier || null, notes: d.notes || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM inventory WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "PATCH", path: "/inventory/:id", handler: async ({ db, params, body }) => { const u = buildUpdate("inventory", sc(body), params.id); if (!u) return err("No fields"); await db.prepare(u.sql).bind(...u.vals).run(); const row = await db.prepare("SELECT * FROM inventory WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "DELETE", path: "/inventory/:id", handler: async ({ db, params }) => crudDelete(db, "inventory", params.id) },

  // ── Purchase Orders ──
  { method: "GET", path: "/purchase-orders", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM purchase_orders ORDER BY created_at DESC").all();
    return json(results.map(r => { const c = camelRow(r); try { c.items = JSON.parse(r.items); } catch { c.items = []; } return c; }));
  }},
  { method: "POST", path: "/purchase-orders", handler: async ({ db, body }) => {
    const d = sc(body);
    const items = Array.isArray(body.items) ? JSON.stringify(body.items) : d.items;
    const { sql, vals } = buildInsert("purchase_orders", { po_number: d.po_number, vendor: d.vendor, status: d.status || "draft", items, subtotal: d.subtotal, tax: d.tax || "0", total: d.total, notes: d.notes || null, date: d.date, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM purchase_orders WHERE id = ?").bind(info.meta.last_row_id).first();
    const c = camelRow(row); try { c.items = JSON.parse(row.items); } catch { c.items = []; }
    return json(c, 201);
  }},
  { method: "PATCH", path: "/purchase-orders/:id", handler: async ({ db, params, body }) => {
    const d = sc(body);
    if (Array.isArray(body.items)) d.items = JSON.stringify(body.items);
    const u = buildUpdate("purchase_orders", d, params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM purchase_orders WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    const c = camelRow(row); try { c.items = JSON.parse(row.items); } catch { c.items = []; }
    return json(c);
  }},
  { method: "DELETE", path: "/purchase-orders/:id", handler: async ({ db, params }) => crudDelete(db, "purchase_orders", params.id) },

  // ── Tax Reports ──
  { method: "GET", path: "/reports/tax-summary", handler: async ({ db, query }) => {
    const { startDate, endDate } = query;
    if (!startDate || !endDate) return err("startDate and endDate required");
    const income = await db.prepare("SELECT COALESCE(SUM(CAST(total AS REAL)),0) as t FROM invoices WHERE status='paid' AND created_at >= ? AND created_at <= ?").bind(startDate, endDate + "T23:59:59.999Z").first();
    const expenseT = await db.prepare("SELECT COALESCE(SUM(CAST(amount AS REAL)),0) as t FROM expenses WHERE date >= ? AND date <= ?").bind(startDate, endDate).first();
    const laborT = await db.prepare("SELECT COALESCE(SUM(CAST(total_pay AS REAL)),0) as t FROM labor_entries WHERE date >= ? AND date <= ?").bind(startDate, endDate).first();
    const ic = await db.prepare("SELECT COUNT(*) as c FROM invoices WHERE status='paid' AND created_at >= ? AND created_at <= ?").bind(startDate, endDate + "T23:59:59.999Z").first();
    const ec = await db.prepare("SELECT COUNT(*) as c FROM expenses WHERE date >= ? AND date <= ?").bind(startDate, endDate).first();
    const lc = await db.prepare("SELECT COUNT(*) as c FROM labor_entries WHERE date >= ? AND date <= ?").bind(startDate, endDate).first();
    const { results: ebc } = await db.prepare("SELECT category, COALESCE(SUM(CAST(amount AS REAL)),0) as total FROM expenses WHERE date >= ? AND date <= ? GROUP BY category").bind(startDate, endDate).all();
    const inc = parseFloat(income?.t||0), exp = parseFloat(expenseT?.t||0), lab = parseFloat(laborT?.t||0);
    return json({ totalIncome: inc.toFixed(2), totalExpenses: exp.toFixed(2), totalLaborCosts: lab.toFixed(2), netProfit: (inc-exp-lab).toFixed(2), invoiceCount: ic?.c||0, expenseCount: ec?.c||0, laborEntryCount: lc?.c||0, expensesByCategory: ebc.map(e=>({category:e.category,total:parseFloat(e.total).toFixed(2)})) });
  }},
];

// Convert snake_case DB rows to camelCase for the frontend
function camelRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = v;
  }
  return out;
}
