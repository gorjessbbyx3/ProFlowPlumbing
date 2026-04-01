// Plumbing CRM — Full API Worker on Cloudflare D1
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const json = (data, status = 200) => Response.json(data, { status, headers: CORS });
const noContent = () => new Response(null, { status: 204, headers: CORS });
const err = (msg, status = 400) => json({ error: msg }, status);
const now = () => new Date().toISOString();

// Simple path router — prefers specific paths over parameterized ones
function matchRoute(method, path, routes) {
  let best = null;
  let bestSpecificity = -1;
  for (const r of routes) {
    if (r.method !== method) continue;
    const regex = new RegExp("^" + r.path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$");
    const m = path.match(regex);
    if (m) {
      // Count non-parameterized segments as specificity score
      const specificity = r.path.split("/").filter(s => s && !s.startsWith(":")).length;
      if (specificity > bestSpecificity) {
        best = { handler: r.handler, params: m.groups || {} };
        bestSpecificity = specificity;
      }
    }
  }
  return best;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Public Invoice Page — shareable, no auth
    if (url.pathname.startsWith("/invoice/")) {
      const token = url.pathname.split("/invoice/")[1];
      if (token) {
        const row = await env.DB.prepare("SELECT * FROM invoices WHERE public_token = ?").bind(token).first();
        if (row) {
          const inv = row;
          const statusColor = inv.status === "paid" ? "#22c55e" : inv.status === "overdue" ? "#ef4444" : "#f59e0b";
          const statusLabel = inv.status.charAt(0).toUpperCase() + inv.status.slice(1);
          const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invoice ${inv.invoice_number} — ProFlow Plumbing</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,system-ui,sans-serif;background:#f1f5f9;padding:20px;color:#1e293b}
.card{max-width:600px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.header{background:#4338ca;color:#fff;padding:28px 24px;text-align:center}
.header h1{font-size:22px;font-weight:800;letter-spacing:-.5px}.header p{opacity:.8;margin-top:4px;font-size:13px}
.badge{display:inline-block;padding:6px 16px;border-radius:99px;font-weight:700;font-size:12px;margin-top:12px;color:#fff;background:${statusColor}}
.body{padding:24px}.row{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
.row:last-child{border:none}.label{color:#64748b;font-weight:500}.value{font-weight:700;text-align:right}
.total-row{background:#f8fafc;margin:16px -24px -24px;padding:20px 24px;border-top:2px solid #4338ca;display:flex;justify-content:space-between;align-items:center}
.total-row .label{font-size:18px;font-weight:800;color:#4338ca}.total-row .value{font-size:24px;font-weight:900;color:#4338ca}
.footer{text-align:center;padding:16px;font-size:12px;color:#94a3b8}
.pay-btn{display:block;width:100%;padding:16px;background:#4338ca;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;margin-top:16px;text-align:center}
.pay-btn:hover{opacity:.9}</style></head><body>
<div class="card">
<div class="header"><h1>ProFlow Plumbing</h1><p>Professional Plumbing Services</p><span class="badge">${statusLabel}</span></div>
<div class="body">
<div class="row"><span class="label">Invoice</span><span class="value">${inv.invoice_number}</span></div>
${inv.client_name ? `<div class="row"><span class="label">Client</span><span class="value">${inv.client_name}</span></div>` : ""}
${inv.description ? `<div class="row"><span class="label">Service</span><span class="value">${inv.description}</span></div>` : ""}
<div class="row"><span class="label">Subtotal</span><span class="value">$${parseFloat(inv.amount).toFixed(2)}</span></div>
<div class="row"><span class="label">Tax (GET 4.712%)</span><span class="value">$${parseFloat(inv.tax).toFixed(2)}</span></div>
${inv.due_date ? `<div class="row"><span class="label">Due Date</span><span class="value">${inv.due_date}</span></div>` : ""}
<div class="total-row"><span class="label">Total Due</span><span class="value">$${parseFloat(inv.total).toFixed(2)}</span></div>
</div>
<div style="padding:0 24px 24px"><p style="text-align:center;font-size:13px;color:#64748b;margin-top:16px">Payment accepted via Cash, Zelle, Venmo, or Card</p></div>
<div class="footer">ProFlow Plumbing · info@techsavvyhawaii.com</div>
</div></body></html>`;
          return new Response(html, { status: 200, headers: { "Content-Type": "text/html;charset=UTF-8", ...CORS } });
        }
      }
    }

    // Serve R2 uploads
    if (url.pathname.startsWith("/files/")) {
      const key = url.pathname.slice("/files/".length);
      if (!key) return err("Not found", 404);
      const obj = await env.R2.get(key);
      if (!obj) return err("Not found", 404);
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(obj.body, { headers });
    }

    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const path = url.pathname.replace("/api", "");
    const method = request.method;
    const db = env.DB;

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
      return await match.handler({ db, params: match.params, body, query, request, env });
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
      campaign_id: d.campaign_id || null,
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

    const buffer = await file.arrayBuffer();
    const key = await uploadToR2(env.R2, buffer, file.type || "image/jpeg", "photos");

    const info = await db.prepare(
      "INSERT INTO booking_photos (booking_id, type, file_path, caption, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(bookingId, photoType, key, caption, now()).run();
    const row = await db.prepare("SELECT * FROM booking_photos WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "DELETE", path: "/bookings/:id/photos/:photoId", handler: async ({ db, params, env }) => {
    const bookingId = Number(params.id);
    const photoId = Number(params.photoId);
    if (isNaN(bookingId) || isNaN(photoId)) return err("Invalid ID");
    const row = await db.prepare("SELECT id, file_path FROM booking_photos WHERE id = ? AND booking_id = ?").bind(photoId, bookingId).first();
    if (!row) return err("Photo not found", 404);
    if (row.file_path && !row.file_path.startsWith("data:")) {
      await env.R2.delete(row.file_path).catch(() => {});
    }
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
  { method: "POST", path: "/expenses", handler: async ({ db, body, request, env }) => {
    // Handle both JSON and FormData
    const contentType = request.headers.get("content-type") || "";
    let d, receiptImage = null;
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      d = { category: fd.get("category"), description: fd.get("description"), amount: fd.get("amount"), date: fd.get("date"), vendor: fd.get("vendor") || null, notes: fd.get("notes") || null };
      const file = fd.get("receiptImage");
      if (file && file instanceof File && file.size > 0) {
        const buffer = await file.arrayBuffer();
        receiptImage = await uploadToR2(env.R2, buffer, file.type || "image/jpeg", "receipts");
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
  { method: "PATCH", path: "/expenses/:id", handler: async ({ db, params, body, request, env }) => {
    const contentType = request.headers.get("content-type") || "";
    let d;
    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      d = {};
      for (const [k, v] of fd.entries()) {
        if (k === "receiptImage" && v instanceof File && v.size > 0) {
          const buffer = await v.arrayBuffer();
          d.receipt_image = await uploadToR2(env.R2, buffer, v.type || "image/jpeg", "receipts");
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
  { method: "POST", path: "/expenses/:id/receipt", handler: async ({ db, params, request, env }) => {
    const id = Number(params.id);
    if (isNaN(id)) return err("Invalid ID");
    const existing = await db.prepare("SELECT id FROM expenses WHERE id = ?").bind(id).first();
    if (!existing) return err("Expense not found", 404);
    const fd = await request.formData();
    const file = fd.get("receiptImage");
    if (!file || !(file instanceof File) || file.size === 0) return err("No image uploaded");
    const buffer = await file.arrayBuffer();
    const key = await uploadToR2(env.R2, buffer, file.type || "image/jpeg", "receipts");
    await db.prepare("UPDATE expenses SET receipt_image = ?, updated_at = datetime('now') WHERE id = ?").bind(key, id).run();
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

  // ── Campaign ROI ──
  { method: "GET", path: "/campaigns/:id/roi", handler: async ({ db, params }) => {
    const campaign = await db.prepare("SELECT * FROM campaigns WHERE id = ?").bind(params.id).first();
    if (!campaign) return err("Not found", 404);
    const { results: bookings } = await db.prepare("SELECT id, estimated_price, status, service_type, client_name, date FROM bookings WHERE campaign_id = ? ORDER BY date DESC").bind(params.id).all();
    const totalRevenue = bookings.reduce((sum, b) => sum + parseFloat(b.estimated_price || "0"), 0);
    const completedRevenue = bookings.filter(b => b.status === "completed").reduce((sum, b) => sum + parseFloat(b.estimated_price || "0"), 0);
    const budget = parseFloat(campaign.budget || "0");
    const spent = parseFloat(campaign.amount_spent || "0");
    const roi = spent > 0 ? ((completedRevenue - spent) / spent * 100) : 0;
    return json({ campaignId: params.id, budget, spent, totalRevenue, completedRevenue, roi: roi.toFixed(1), workOrderCount: bookings.length, completedCount: bookings.filter(b => b.status === "completed").length, workOrders: bookings.map(camelRow) });
  }},

  // ── Campaign Stats (all campaigns) ──
  { method: "GET", path: "/campaigns/stats/roi", handler: async ({ db }) => {
    const { results } = await db.prepare(`SELECT c.id, c.name, c.budget, c.amount_spent, COUNT(b.id) as work_order_count, COALESCE(SUM(CAST(b.estimated_price AS REAL)), 0) as total_revenue, COALESCE(SUM(CASE WHEN b.status = 'completed' THEN CAST(b.estimated_price AS REAL) ELSE 0 END), 0) as completed_revenue FROM campaigns c LEFT JOIN bookings b ON b.campaign_id = c.id GROUP BY c.id ORDER BY c.created_at DESC`).all();
    return json(results.map(r => ({ ...camelRow(r), roi: parseFloat(r.amount_spent || "0") > 0 ? (((r.completed_revenue - parseFloat(r.amount_spent || "0")) / parseFloat(r.amount_spent || "0")) * 100).toFixed(1) : "0.0" })));
  }},

  // ── Checklist ──
  { method: "GET", path: "/checklist", handler: async ({ db }) => {
    // Auto-seed if empty
    const cnt = await db.prepare("SELECT COUNT(*) as c FROM checklist_items").first();
    if (cnt.c === 0) {
      const seed = [
        ["Business Registration & Licensing","Register business entity (LLC or Sole Proprietorship)",1],["Business Registration & Licensing","Obtain state business license",2],["Business Registration & Licensing","Get Hawaii General Excise Tax (GET) license",3],["Business Registration & Licensing","Obtain Federal EIN",4],["Business Registration & Licensing","Register DBA if needed",5],
        ["Insurance","Get general liability insurance",6],["Insurance","Obtain surety bond",7],["Insurance","Set up workers compensation insurance",8],["Insurance","Get commercial auto insurance",9],["Insurance","Consider professional liability insurance",10],
        ["Equipment & Tools","Purchase pipe wrenches (14\", 18\", 24\")",11],["Equipment & Tools","Buy pipe cutter and threading kit",12],["Equipment & Tools","Purchase drain cleaning machine / snake",13],["Equipment & Tools","Stock PEX, copper, and PVC fittings inventory",14],["Equipment & Tools","Buy soldering and brazing equipment",15],["Equipment & Tools","Get press tool for PEX connections",16],["Equipment & Tools","Purchase safety gear (goggles, gloves, knee pads)",17],["Equipment & Tools","Buy inspection camera / borescope",18],["Equipment & Tools","Stock Teflon tape, pipe dope, and sealants",19],["Equipment & Tools","Purchase hydro jetting equipment",20],["Equipment & Tools","Get water pressure test gauge kit",21],
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

  // ── Subscriptions (Recurring Revenue) ──
  { method: "GET", path: "/subscriptions", handler: async ({ db }) => {
    const { results } = await db.prepare("SELECT * FROM subscriptions ORDER BY next_service_date").all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/subscriptions", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("subscriptions", { client_id: d.client_id || null, client_name: d.client_name, service_type: d.service_type, frequency: d.frequency || "weekly", price: d.price, next_service_date: d.next_service_date, status: d.status || "active", location: d.location || null, notes: d.notes || null, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM subscriptions WHERE id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "GET", path: "/subscriptions/:id", handler: async ({ db, params }) => { const row = await db.prepare("SELECT * FROM subscriptions WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "PATCH", path: "/subscriptions/:id", handler: async ({ db, params, body }) => { const u = buildUpdate("subscriptions", sc(body), params.id); if (!u) return err("No fields"); await db.prepare(u.sql).bind(...u.vals).run(); const row = await db.prepare("SELECT * FROM subscriptions WHERE id = ?").bind(params.id).first(); return row ? json(camelRow(row)) : err("Not found", 404); }},
  { method: "DELETE", path: "/subscriptions/:id", handler: async ({ db, params }) => crudDelete(db, "subscriptions", params.id) },
  { method: "GET", path: "/subscriptions/stats/mrr", handler: async ({ db }) => {
    const active = await db.prepare("SELECT * FROM subscriptions WHERE status = 'active'").all();
    const subs = active.results || [];
    let weeklyTotal = 0, biweeklyTotal = 0, monthlyTotal = 0;
    subs.forEach(s => {
      const p = parseFloat(s.price || "0");
      if (s.frequency === "weekly") weeklyTotal += p;
      else if (s.frequency === "biweekly") biweeklyTotal += p;
      else if (s.frequency === "monthly") monthlyTotal += p;
    });
    const mrr = (weeklyTotal * 4.33) + (biweeklyTotal * 2.17) + monthlyTotal;
    const arr = mrr * 12;
    return json({ mrr: mrr.toFixed(2), arr: arr.toFixed(2), activeCount: subs.length, weeklyRevenue: weeklyTotal.toFixed(2), biweeklyRevenue: biweeklyTotal.toFixed(2), monthlyRevenue: monthlyTotal.toFixed(2), subscriptions: subs.map(camelRow) });
  }},

  // ── Job Supply Usage (Inventory tied to jobs) ──
  { method: "GET", path: "/bookings/:id/supplies", handler: async ({ db, params }) => {
    const { results } = await db.prepare(`SELECT jsu.*, i.name as item_name, i.unit, i.category as item_category FROM job_supply_usage jsu JOIN inventory i ON jsu.inventory_id = i.id WHERE jsu.booking_id = ? ORDER BY jsu.created_at`).bind(params.id).all();
    return json(results.map(camelRow));
  }},
  { method: "POST", path: "/bookings/:id/supplies", handler: async ({ db, params, body }) => {
    const bookingId = Number(params.id);
    const d = sc(body);
    const qty = parseInt(d.quantity_used || "1");
    // Get current inventory to calculate unit cost
    const inv = await db.prepare("SELECT * FROM inventory WHERE id = ?").bind(d.inventory_id).first();
    if (!inv) return err("Inventory item not found", 404);
    const unitCost = inv.cost || "0";
    // Insert usage
    const info = await db.prepare("INSERT INTO job_supply_usage (booking_id, inventory_id, quantity_used, unit_cost, created_at) VALUES (?, ?, ?, ?, ?)").bind(bookingId, d.inventory_id, qty, unitCost, now()).run();
    // Decrement inventory
    await db.prepare("UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?").bind(qty, d.inventory_id).run();
    // Update booking supplies_cost
    const totalCost = await db.prepare("SELECT COALESCE(SUM(CAST(unit_cost AS REAL) * quantity_used), 0) as t FROM job_supply_usage WHERE booking_id = ?").bind(bookingId).first();
    await db.prepare("UPDATE bookings SET supplies_cost = ?, updated_at = datetime('now') WHERE id = ?").bind((totalCost?.t || 0).toFixed(2), bookingId).run();
    // Check for low stock notification
    const updated = await db.prepare("SELECT * FROM inventory WHERE id = ?").bind(d.inventory_id).first();
    if (updated && updated.min_stock && updated.quantity <= updated.min_stock) {
      await db.prepare("INSERT INTO notifications (type, title, message, action_url, created_at) VALUES (?, ?, ?, ?, ?)").bind("low_stock", "Low Stock Alert", `${updated.name} is at ${updated.quantity} ${updated.unit} (minimum: ${updated.min_stock})`, "/inventory", now()).run();
    }
    const row = await db.prepare("SELECT jsu.*, i.name as item_name, i.unit FROM job_supply_usage jsu JOIN inventory i ON jsu.inventory_id = i.id WHERE jsu.id = ?").bind(info.meta.last_row_id).first();
    return json(camelRow(row), 201);
  }},
  { method: "DELETE", path: "/bookings/:id/supplies/:usageId", handler: async ({ db, params }) => {
    const usage = await db.prepare("SELECT * FROM job_supply_usage WHERE id = ? AND booking_id = ?").bind(params.usageId, params.id).first();
    if (!usage) return err("Not found", 404);
    // Restore inventory
    await db.prepare("UPDATE inventory SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?").bind(usage.quantity_used, usage.inventory_id).run();
    await db.prepare("DELETE FROM job_supply_usage WHERE id = ?").bind(params.usageId).run();
    // Recalculate booking cost
    const totalCost = await db.prepare("SELECT COALESCE(SUM(CAST(unit_cost AS REAL) * quantity_used), 0) as t FROM job_supply_usage WHERE booking_id = ?").bind(params.id).first();
    await db.prepare("UPDATE bookings SET supplies_cost = ?, updated_at = datetime('now') WHERE id = ?").bind((totalCost?.t || 0).toFixed(2), params.id).run();
    return noContent();
  }},

  // ── Notifications ──
  { method: "GET", path: "/notifications", handler: async ({ db, query }) => {
    const unreadOnly = query.unread === "true";
    const sql = unreadOnly ? "SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 50" : "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50";
    const { results } = await db.prepare(sql).all();
    return json(results.map(r => ({ ...camelRow(r), isRead: !!r.is_read })));
  }},
  { method: "GET", path: "/notifications/count", handler: async ({ db }) => {
    const r = await db.prepare("SELECT COUNT(*) as c FROM notifications WHERE is_read = 0").first();
    return json({ unread: r?.c || 0 });
  }},
  { method: "PATCH", path: "/notifications/:id/read", handler: async ({ db, params }) => {
    await db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").bind(params.id).run();
    return json({ ok: true });
  }},
  { method: "POST", path: "/notifications/read-all", handler: async ({ db }) => {
    await db.prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0").run();
    return json({ ok: true });
  }},
  { method: "DELETE", path: "/notifications/:id", handler: async ({ db, params }) => crudDelete(db, "notifications", params.id) },

  // ── Smart Notification Generator (call periodically or on demand) ──
  { method: "POST", path: "/notifications/generate", handler: async ({ db }) => {
    const generated = [];
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    // 1. Tomorrow's jobs reminder
    const tomorrowJobs = await db.prepare("SELECT COUNT(*) as c FROM bookings WHERE date = ? AND status = 'scheduled'").bind(tomorrow).first();
    if (tomorrowJobs?.c > 0) {
      const first = await db.prepare("SELECT time, location FROM bookings WHERE date = ? AND status = 'scheduled' ORDER BY time LIMIT 1").bind(tomorrow).first();
      await db.prepare("INSERT INTO notifications (type, title, message, action_url, created_at) VALUES (?, ?, ?, ?, ?)").bind("tomorrow_jobs", "Tomorrow's Schedule", `You have ${tomorrowJobs.c} job${tomorrowJobs.c > 1 ? "s" : ""} tomorrow. First at ${first?.time || "TBD"}${first?.location ? " in " + first.location : ""}.`, "/scheduling", now()).run();
      generated.push("tomorrow_jobs");
    }

    // 2. Overdue invoices
    const overdue = await db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(CAST(total AS REAL)),0) as t FROM invoices WHERE status = 'unpaid' AND due_date < ?").bind(today).first();
    if (overdue?.c > 0) {
      await db.prepare("INSERT INTO notifications (type, title, message, action_url, created_at) VALUES (?, ?, ?, ?, ?)").bind("overdue_invoice", "Overdue Invoices", `${overdue.c} invoice${overdue.c > 1 ? "s" : ""} overdue totaling $${parseFloat(overdue.t).toFixed(2)}. Send reminders?`, "/invoices", now()).run();
      generated.push("overdue_invoices");
    }

    // 3. Low stock items
    const { results: lowStock } = await db.prepare("SELECT name, quantity, unit, min_stock FROM inventory WHERE min_stock > 0 AND quantity <= min_stock").all();
    for (const item of lowStock) {
      await db.prepare("INSERT INTO notifications (type, title, message, action_url, created_at) VALUES (?, ?, ?, ?, ?)").bind("low_stock", "Low Stock: " + item.name, `Only ${item.quantity} ${item.unit} left (minimum: ${item.min_stock}). Time to reorder.`, "/inventory", now()).run();
      generated.push("low_stock:" + item.name);
    }

    // 4. Dormant clients (no booking in 45+ days)
    const { results: dormant } = await db.prepare(`SELECT c.name, c.id, MAX(b.date) as last_date FROM clients c LEFT JOIN bookings b ON (b.client_id = c.id OR b.client_name = c.name) GROUP BY c.id HAVING last_date IS NOT NULL AND last_date < date('now', '-45 days')`).all();
    for (const cl of dormant.slice(0, 5)) {
      await db.prepare("INSERT INTO notifications (type, title, message, action_url, created_at) VALUES (?, ?, ?, ?, ?)").bind("dormant_client", "Win Back: " + cl.name, `${cl.name} hasn't booked since ${cl.last_date}. Send a follow-up?`, "/followups", now()).run();
      generated.push("dormant:" + cl.name);
    }

    // 5. Upcoming subscription services
    const { results: upcomingSubs } = await db.prepare("SELECT * FROM subscriptions WHERE status = 'active' AND next_service_date = ?").bind(tomorrow).all();
    for (const sub of upcomingSubs) {
      await db.prepare("INSERT INTO notifications (type, title, message, action_url, created_at) VALUES (?, ?, ?, ?, ?)").bind("subscription_due", "Subscription Due: " + sub.client_name, `${sub.service_type} for ${sub.client_name} is scheduled tomorrow ($${sub.price}).`, "/bookings", now()).run();
      generated.push("sub:" + sub.client_name);
    }

    // 6. Pending todos due today or overdue
    const overdueTodos = await db.prepare("SELECT COUNT(*) as c FROM todos WHERE completed = 0 AND due_date <= ?").bind(today).first();
    if (overdueTodos?.c > 0) {
      await db.prepare("INSERT INTO notifications (type, title, message, action_url, created_at) VALUES (?, ?, ?, ?, ?)").bind("overdue_todo", "Tasks Due", `${overdueTodos.c} task${overdueTodos.c > 1 ? "s" : ""} due or overdue. Check your to-do list.`, "/todos", now()).run();
      generated.push("overdue_todos");
    }

    return json({ generated, count: generated.length });
  }},

  // ── Public Invoice (shareable link, no auth) ──
  { method: "GET", path: "/public/invoice/:token", handler: async ({ db, params }) => {
    const row = await db.prepare("SELECT * FROM invoices WHERE public_token = ?").bind(params.token).first();
    if (!row) return err("Invoice not found", 404);
    return json(camelRow(row));
  }},
  // Generate public token for invoice
  { method: "POST", path: "/invoices/:id/share", handler: async ({ db, params }) => {
    const id = Number(params.id);
    const existing = await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first();
    if (!existing) return err("Invoice not found", 404);
    let token = existing.public_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      await db.prepare("UPDATE invoices SET public_token = ? WHERE id = ?").bind(token, id).run();
    }
    return json({ token, url: `/invoice/${token}` });
  }},
  // Auto-create invoice from completed booking
  { method: "POST", path: "/bookings/:id/invoice", handler: async ({ db, params }) => {
    const booking = await db.prepare("SELECT * FROM bookings WHERE id = ?").bind(params.id).first();
    if (!booking) return err("Booking not found", 404);
    // Check if invoice already exists
    const existing = await db.prepare("SELECT id FROM invoices WHERE booking_id = ?").bind(params.id).first();
    if (existing) return err("Invoice already exists for this booking", 400);
    const amount = booking.estimated_price || "0";
    const tax = (parseFloat(amount) * 0.04712).toFixed(2); // Hawaii GET
    const total = (parseFloat(amount) + parseFloat(tax)).toFixed(2);
    const invNum = "INV-" + Date.now().toString(36).toUpperCase();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const info = await db.prepare("INSERT INTO invoices (booking_id, client_id, invoice_number, amount, tax, total, status, due_date, description, client_name, public_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, ?)").bind(
      booking.id, booking.client_id, invNum, amount, tax, total, dueDate,
      booking.service_type + (booking.location ? " at " + booking.location : ""),
      booking.client_name, token, now(), now()
    ).run();
    const row = await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(info.meta.last_row_id).first();
    return json({ ...camelRow(row), shareUrl: `/invoice/${token}` }, 201);
  }},

  // ── Enhanced Financial Dashboard ──
  { method: "GET", path: "/dashboard/financial", handler: async ({ db }) => {
    const today = new Date();
    const thisMonth = today.toISOString().slice(0, 7); // YYYY-MM
    const thisMonthStart = thisMonth + "-01";
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().slice(0, 7);
    const lastMonthStart = lastMonth + "-01";
    const lastMonthEnd = thisMonthStart;

    // This month revenue
    const thisMonthRev = await db.prepare("SELECT COALESCE(SUM(CAST(total AS REAL)),0) as t FROM invoices WHERE status='paid' AND created_at >= ?").bind(thisMonthStart).first();
    // Last month revenue
    const lastMonthRev = await db.prepare("SELECT COALESCE(SUM(CAST(total AS REAL)),0) as t FROM invoices WHERE status='paid' AND created_at >= ? AND created_at < ?").bind(lastMonthStart, lastMonthEnd).first();
    // This month expenses
    const thisMonthExp = await db.prepare("SELECT COALESCE(SUM(CAST(amount AS REAL)),0) as t FROM expenses WHERE date >= ?").bind(thisMonthStart).first();
    // This month labor
    const thisMonthLab = await db.prepare("SELECT COALESCE(SUM(CAST(total_pay AS REAL)),0) as t FROM labor_entries WHERE date >= ?").bind(thisMonthStart).first();
    // Outstanding AR
    const ar = await db.prepare("SELECT COALESCE(SUM(CAST(total AS REAL)),0) as t, COUNT(*) as c FROM invoices WHERE status = 'unpaid'").first();
    // GET tax owed (4.712%)
    const allPaidThisMonth = await db.prepare("SELECT COALESCE(SUM(CAST(total AS REAL)),0) as t FROM invoices WHERE status='paid' AND created_at >= ?").bind(thisMonthStart).first();
    const getOwed = parseFloat(allPaidThisMonth?.t || 0) * 0.04712;
    // Revenue by month (last 6 months)
    const { results: monthlyRev } = await db.prepare(`SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(CAST(total AS REAL)),0) as revenue FROM invoices WHERE status='paid' AND created_at >= date('now', '-6 months') GROUP BY month ORDER BY month`).all();
    // Expenses by month
    const { results: monthlyExp } = await db.prepare(`SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(CAST(amount AS REAL)),0) as expenses FROM expenses WHERE date >= date('now', '-6 months') GROUP BY month ORDER BY month`).all();
    // Top clients by revenue
    const { results: topClients } = await db.prepare(`SELECT client_name, COALESCE(SUM(CAST(total AS REAL)),0) as total, COUNT(*) as jobs FROM invoices WHERE status='paid' AND client_name IS NOT NULL GROUP BY client_name ORDER BY total DESC LIMIT 5`).all();
    // Profit per job (last 20 completed)
    const { results: jobProfits } = await db.prepare(`SELECT b.id, b.service_type, b.client_name, b.estimated_price, b.supplies_cost, b.date, COALESCE(b.estimated_price, '0') as revenue FROM bookings b WHERE b.status = 'completed' ORDER BY b.date DESC LIMIT 20`).all();
    // MRR from subscriptions
    const { results: activeSubs } = await db.prepare("SELECT * FROM subscriptions WHERE status = 'active'").all();
    let mrr = 0;
    activeSubs.forEach(s => {
      const p = parseFloat(s.price || "0");
      if (s.frequency === "weekly") mrr += p * 4.33;
      else if (s.frequency === "biweekly") mrr += p * 2.17;
      else mrr += p;
    });

    const rev = parseFloat(thisMonthRev?.t || 0);
    const exp = parseFloat(thisMonthExp?.t || 0);
    const lab = parseFloat(thisMonthLab?.t || 0);
    const lastRev = parseFloat(lastMonthRev?.t || 0);

    return json({
      thisMonth: { revenue: rev.toFixed(2), expenses: exp.toFixed(2), labor: lab.toFixed(2), profit: (rev - exp - lab).toFixed(2) },
      lastMonth: { revenue: lastRev.toFixed(2) },
      revenueGrowth: lastRev > 0 ? (((rev - lastRev) / lastRev) * 100).toFixed(1) : "0",
      accountsReceivable: { total: parseFloat(ar?.t || 0).toFixed(2), count: ar?.c || 0 },
      getOwed: getOwed.toFixed(2),
      mrr: mrr.toFixed(2),
      arr: (mrr * 12).toFixed(2),
      activeSubscriptions: activeSubs.length,
      monthlyRevenue: monthlyRev,
      monthlyExpenses: monthlyExp,
      topClients,
      jobProfits: jobProfits.map(camelRow),
    });
  }},

  // ── Route Optimization ──
  { method: "GET", path: "/bookings/route/today", handler: async ({ db }) => {
    const today = new Date().toISOString().split("T")[0];
    const { results } = await db.prepare("SELECT * FROM bookings WHERE date = ? AND status IN ('scheduled', 'in progress') ORDER BY time").bind(today).all();
    // Simple optimization: sort by time, provide Waze/Google Maps links
    const stops = results.map((b, i) => {
      const c = camelRow(b);
      c.stopNumber = i + 1;
      if (c.latitude && c.longitude) {
        c.wazeUrl = `https://waze.com/ul?ll=${c.latitude},${c.longitude}&navigate=yes`;
        c.googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`;
      } else if (c.location) {
        const loc = encodeURIComponent(c.location);
        c.wazeUrl = `https://waze.com/ul?q=${loc}&navigate=yes`;
        c.googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc}`;
      }
      return c;
    });
    // Calculate total estimated revenue for the day
    const dayRevenue = stops.reduce((s, b) => s + parseFloat(b.estimatedPrice || "0"), 0);
    return json({ date: today, stops, totalStops: stops.length, estimatedRevenue: dayRevenue.toFixed(2) });
  }},
  { method: "GET", path: "/bookings/route/:date", handler: async ({ db, params }) => {
    const { results } = await db.prepare("SELECT * FROM bookings WHERE date = ? AND status IN ('scheduled', 'in progress') ORDER BY time").bind(params.date).all();
    const stops = results.map((b, i) => {
      const c = camelRow(b);
      c.stopNumber = i + 1;
      if (c.latitude && c.longitude) {
        c.wazeUrl = `https://waze.com/ul?ll=${c.latitude},${c.longitude}&navigate=yes`;
        c.googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.latitude},${c.longitude}`;
      } else if (c.location) {
        const loc = encodeURIComponent(c.location);
        c.wazeUrl = `https://waze.com/ul?q=${loc}&navigate=yes`;
        c.googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc}`;
      }
      return c;
    });
    const dayRevenue = stops.reduce((s, b) => s + parseFloat(b.estimatedPrice || "0"), 0);
    return json({ date: params.date, stops, totalStops: stops.length, estimatedRevenue: dayRevenue.toFixed(2) });
  }},

  // ── Service Pricing ──
  { method: "GET", path: "/services", handler: async ({ db }) => {
    // Auto-seed if empty
    const cnt = await db.prepare("SELECT COUNT(*) as c FROM service_pricing").first();
    if (cnt.c === 0) {
      const seed = [
        ["Drain Services","Drain Cleaning (Snake)","Clear clogged drains using mechanical snake","150.00","per drain","30-60 min",1],
        ["Drain Services","Hydro Jetting","High-pressure water jetting for severe clogs","450.00","per job","1-2 hrs",2],
        ["Drain Services","Camera Inspection","Video camera drain/sewer line inspection","250.00","per inspection","30-45 min",3],
        ["Drain Services","Floor Drain Service","Clean and service floor drains","125.00","per drain","30 min",4],
        ["Pipe Repair","Pipe Leak Repair","Locate and repair leaking pipe section","200.00","per repair","1-2 hrs",5],
        ["Pipe Repair","Pipe Replacement (per ft)","Replace damaged pipe section","35.00","per foot","varies",6],
        ["Pipe Repair","Repiping (Whole Home)","Full home copper or PEX repipe","4500.00","per home","2-4 days",7],
        ["Pipe Repair","Frozen Pipe Thaw & Repair","Thaw frozen pipe and repair if burst","300.00","per job","1-2 hrs",8],
        ["Water Heater","Water Heater Flush","Drain and flush sediment from tank","150.00","per unit","45 min",9],
        ["Water Heater","Water Heater Install (Tank)","Remove old and install new tank water heater","1200.00","per unit","3-4 hrs",10],
        ["Water Heater","Water Heater Install (Tankless)","Install tankless on-demand water heater","2500.00","per unit","4-6 hrs",11],
        ["Water Heater","Anode Rod Replacement","Replace sacrificial anode rod","175.00","per unit","30 min",12],
        ["Fixtures","Faucet Install/Replace","Install or replace kitchen or bath faucet","185.00","per fixture","1 hr",13],
        ["Fixtures","Toilet Install/Replace","Remove old and install new toilet","275.00","per fixture","1-2 hrs",14],
        ["Fixtures","Garbage Disposal Install","Install or replace garbage disposal","250.00","per unit","1 hr",15],
        ["Fixtures","Shower Valve Replacement","Replace shower mixing valve","350.00","per fixture","2 hrs",16],
        ["Emergency","Emergency Call-Out","After-hours emergency plumbing response","350.00","per visit","varies",17],
        ["Emergency","Burst Pipe Emergency","Emergency shutoff, repair, and cleanup","500.00","per job","2-4 hrs",18],
        ["Emergency","Sewer Backup Emergency","Emergency sewer line clearing","450.00","per job","1-3 hrs",19],
        ["Commercial","Commercial Plumbing Service","General commercial plumbing maintenance","250.00","per hour","varies",20],
        ["Commercial","Grease Trap Service","Clean and service commercial grease trap","400.00","per unit","1-2 hrs",21],
        ["Commercial","Backflow Prevention Test","Annual backflow preventer testing & cert","175.00","per device","30 min",22],
      ];
      const stmt = db.prepare("INSERT INTO service_pricing (category, name, description, base_price, unit, duration_estimate, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
      await db.batch(seed.map(s => stmt.bind(s[0], s[1], s[2], s[3], s[4], s[5], s[6])));
    }
    const { results } = await db.prepare("SELECT * FROM service_pricing WHERE is_active = 1 ORDER BY sort_order").all();
    return json(results.map(r => ({ ...camelRow(r), isActive: !!r.is_active })));
  }},
  { method: "POST", path: "/services", handler: async ({ db, body }) => {
    const d = sc(body);
    const { sql, vals } = buildInsert("service_pricing", { category: d.category, name: d.name, description: d.description || null, base_price: d.base_price, unit: d.unit || "per job", duration_estimate: d.duration_estimate || null, is_active: 1, sort_order: d.sort_order || 0, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM service_pricing WHERE id = ?").bind(info.meta.last_row_id).first();
    return json({ ...camelRow(row), isActive: !!row.is_active }, 201);
  }},
  { method: "PATCH", path: "/services/:id", handler: async ({ db, params, body }) => {
    const d = sc(body);
    if (d.is_active !== undefined) d.is_active = d.is_active ? 1 : 0;
    const u = buildUpdate("service_pricing", d, params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM service_pricing WHERE id = ?").bind(params.id).first();
    return row ? json({ ...camelRow(row), isActive: !!row.is_active }) : err("Not found", 404);
  }},
  { method: "DELETE", path: "/services/:id", handler: async ({ db, params }) => crudDelete(db, "service_pricing", params.id) },

  // ── Membership Plans ──
  { method: "GET", path: "/membership-plans", handler: async ({ db }) => {
    // Auto-seed if empty
    const cnt = await db.prepare("SELECT COUNT(*) as c FROM membership_plans").first();
    if (cnt.c === 0) {
      const plans = [
        ["Homeowner Basic","basic","yearly","149.00","Annual plumbing inspection & peace of mind",JSON.stringify(["1 annual plumbing inspection","Water heater flush included","Check all fixtures for leaks","Water pressure test","10% off any repairs found","Priority scheduling"]),"10",1],
        ["Homeowner Plus","standard","yearly","299.00","Complete home plumbing care plan",JSON.stringify(["2 plumbing inspections per year","Water heater flush & anode check","Drain cleaning (up to 2 drains)","All fixture leak checks","15% off all repairs","Priority emergency response","Camera inspection included"]),"15",2],
        ["Homeowner Premium","premium","monthly","49.00","Full coverage monthly maintenance",JSON.stringify(["Monthly plumbing check-up","Unlimited drain clearing","Water heater maintenance included","All fixture repairs covered (parts extra)","24/7 emergency priority","20% off all parts","Dedicated plumber assigned"]),"20",3],
        ["Property Manager","standard","monthly","99.00","Multi-unit property maintenance",JSON.stringify(["Monthly common area plumbing check","Emergency response within 2 hours","Up to 4 drain clearings per month","Quarterly water heater service","Tenant work order portal","15% off all repairs","Detailed maintenance reports"]),"15",4],
        ["Commercial Basic","standard","monthly","199.00","Business plumbing maintenance",JSON.stringify(["Monthly plumbing inspection","Grease trap service (quarterly)","Backflow testing (annual)","Emergency response within 1 hour","All fixture maintenance","Compliance documentation","20% off emergency calls"]),"20",5],
      ];
      const stmt = db.prepare("INSERT INTO membership_plans (name, tier, frequency, price, description, features, discount_pct, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      await db.batch(plans.map(p => stmt.bind(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7])));
    }
    const { results } = await db.prepare("SELECT * FROM membership_plans WHERE is_active = 1 ORDER BY sort_order").all();
    return json(results.map(r => {
      const c = camelRow(r);
      c.isActive = !!r.is_active;
      try { c.features = JSON.parse(r.features); } catch { c.features = []; }
      return c;
    }));
  }},
  { method: "POST", path: "/membership-plans", handler: async ({ db, body }) => {
    const d = sc(body);
    const features = Array.isArray(body.features) ? JSON.stringify(body.features) : d.features || "[]";
    const { sql, vals } = buildInsert("membership_plans", { name: d.name, tier: d.tier || "standard", frequency: d.frequency || "monthly", price: d.price, description: d.description || null, features, discount_pct: d.discount_pct || "0", is_active: 1, sort_order: d.sort_order || 0, created_at: now(), updated_at: now() });
    const info = await db.prepare(sql).bind(...vals).run();
    const row = await db.prepare("SELECT * FROM membership_plans WHERE id = ?").bind(info.meta.last_row_id).first();
    const c = camelRow(row); c.isActive = !!row.is_active; try { c.features = JSON.parse(row.features); } catch { c.features = []; }
    return json(c, 201);
  }},
  { method: "PATCH", path: "/membership-plans/:id", handler: async ({ db, params, body }) => {
    const d = sc(body);
    if (Array.isArray(body.features)) d.features = JSON.stringify(body.features);
    if (d.is_active !== undefined) d.is_active = d.is_active ? 1 : 0;
    const u = buildUpdate("membership_plans", d, params.id);
    if (!u) return err("No fields");
    await db.prepare(u.sql).bind(...u.vals).run();
    const row = await db.prepare("SELECT * FROM membership_plans WHERE id = ?").bind(params.id).first();
    if (!row) return err("Not found", 404);
    const c = camelRow(row); c.isActive = !!row.is_active; try { c.features = JSON.parse(row.features); } catch { c.features = []; }
    return json(c);
  }},
  { method: "DELETE", path: "/membership-plans/:id", handler: async ({ db, params }) => crudDelete(db, "membership_plans", params.id) },

  // ── Email Sending (via Resend) ──────────────────────────────────
  // Generic send — used by compose, replies, any custom email
  { method: "POST", path: "/email/send", handler: async ({ body, env }) => {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) return err("Email not configured — RESEND_API_KEY missing", 500);
    const { to, subject, html, text, replyTo } = body || {};
    if (!to || !subject || !html) return err("to, subject, and html are required");
    const fromEmail = "plumbingpro@techsavvyhawaii.com";
    const fromName = "ProFlow Plumbing";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: Array.isArray(to) ? to : [to], subject, html, text: text || undefined, reply_to: replyTo || fromEmail }),
    });
    if (!res.ok) { const t = await res.text(); console.error("Resend error:", t); return err("Failed to send email", 500); }
    const data = await res.json();
    return json({ success: true, messageId: data.id });
  }},

  // Invoice email — sends a styled invoice to the client
  { method: "POST", path: "/email/send-invoice", handler: async ({ db, body, env }) => {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) return err("Email not configured", 500);
    const { invoiceId, to, message } = body || {};
    if (!invoiceId) return err("invoiceId required");
    const inv = await db.prepare("SELECT * FROM invoices WHERE id = ?").bind(invoiceId).first();
    if (!inv) return err("Invoice not found", 404);
    const clientEmail = to || (inv.client_id ? (await db.prepare("SELECT email FROM clients WHERE id = ?").bind(inv.client_id).first())?.email : null);
    if (!clientEmail) return err("No recipient email — provide 'to' or ensure client has email");
    const clientName = inv.client_name || "Valued Customer";
    const publicUrl = inv.public_token ? `https://proflowplumbing.gorjess.co/invoice/${inv.public_token}` : null;
    const personalMsg = message ? `<p style="font-size:15px;color:#475569;line-height:1.6;margin-bottom:16px">${message}</p>` : "";
    const viewBtn = publicUrl ? `<div style="text-align:center;margin:24px 0"><a href="${publicUrl}" style="display:inline-block;background:#4338ca;color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:8px">View Invoice</a></div>` : "";
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,system-ui,sans-serif"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px"><div style="background:#4338ca;color:#fff;padding:28px 24px;text-align:center"><h1 style="margin:0;font-size:22px">ProFlow Plumbing</h1><p style="opacity:.8;margin-top:4px;font-size:13px">Invoice ${inv.invoice_number}</p></div><div style="padding:28px 24px"><p style="font-size:16px;color:#1e293b;line-height:1.6">Hi ${clientName},</p>${personalMsg}<table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px 0;color:#64748b;font-size:14px">Invoice #</td><td style="padding:8px 0;text-align:right;font-weight:600">${inv.invoice_number}</td></tr><tr><td style="padding:8px 0;color:#64748b;font-size:14px">Amount</td><td style="padding:8px 0;text-align:right;font-weight:600;font-size:18px;color:#4338ca">$${parseFloat(inv.total || 0).toFixed(2)}</td></tr><tr><td style="padding:8px 0;color:#64748b;font-size:14px">Due Date</td><td style="padding:8px 0;text-align:right;font-weight:600">${inv.due_date || "Upon receipt"}</td></tr><tr><td style="padding:8px 0;color:#64748b;font-size:14px">Status</td><td style="padding:8px 0;text-align:right;font-weight:600">${(inv.status || "unpaid").charAt(0).toUpperCase() + (inv.status || "unpaid").slice(1)}</td></tr></table>${viewBtn}<p style="font-size:14px;color:#64748b;line-height:1.6">If you have any questions about this invoice, just reply to this email.</p></div><div style="padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center"><p style="font-size:12px;color:#94a3b8;margin:0">ProFlow Plumbing · Honolulu, HI · (808) TBD</p></div></div></body></html>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: "ProFlow Plumbing <plumbingpro@techsavvyhawaii.com>", to: [clientEmail], subject: `Invoice ${inv.invoice_number} from ProFlow Plumbing`, html, reply_to: "plumbingpro@techsavvyhawaii.com" }),
    });
    if (!res.ok) { const t = await res.text(); console.error("Resend error:", t); return err("Failed to send invoice email", 500); }
    const data = await res.json();
    return json({ success: true, messageId: data.id, sentTo: clientEmail });
  }},

  // Proposal email — sends a job proposal/estimate to prospect
  { method: "POST", path: "/email/send-proposal", handler: async ({ db, body, env }) => {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) return err("Email not configured", 500);
    const { to, clientName, subject, description, estimatedCost, jobDate, message } = body || {};
    if (!to || !clientName) return err("to and clientName required");
    const personalMsg = message ? `<p style="font-size:15px;color:#475569;line-height:1.6">${message}</p>` : "";
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,system-ui,sans-serif"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px"><div style="background:#4338ca;color:#fff;padding:28px 24px;text-align:center"><h1 style="margin:0;font-size:22px">ProFlow Plumbing</h1><p style="opacity:.8;margin-top:4px;font-size:13px">Service Proposal</p></div><div style="padding:28px 24px"><p style="font-size:16px;color:#1e293b;line-height:1.6">Hi ${clientName},</p><p style="font-size:15px;color:#475569;line-height:1.6">Thank you for reaching out! Here's our proposal for the work discussed:</p>${personalMsg}<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0">${description ? `<p style="margin:0 0 8px;font-size:14px;color:#64748b">Service</p><p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1e293b">${description}</p>` : ""}${estimatedCost ? `<p style="margin:0 0 8px;font-size:14px;color:#64748b">Estimated Cost</p><p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#4338ca">$${estimatedCost}</p>` : ""}${jobDate ? `<p style="margin:0 0 8px;font-size:14px;color:#64748b">Proposed Date</p><p style="margin:0;font-size:15px;font-weight:600;color:#1e293b">${jobDate}</p>` : ""}</div><p style="font-size:15px;color:#475569;line-height:1.6">To accept this proposal, simply reply to this email or give us a call. We look forward to working with you!</p></div><div style="padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center"><p style="font-size:12px;color:#94a3b8;margin:0">ProFlow Plumbing · Honolulu, HI</p></div></div></body></html>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: "ProFlow Plumbing <plumbingpro@techsavvyhawaii.com>", to: [to], subject: subject || `Service Proposal from ProFlow Plumbing`, html, reply_to: "plumbingpro@techsavvyhawaii.com" }),
    });
    if (!res.ok) { const t = await res.text(); console.error("Resend error:", t); return err("Failed to send proposal", 500); }
    const data = await res.json();
    return json({ success: true, messageId: data.id, sentTo: to });
  }},

  // Booking confirmation / "On the way" notification
  { method: "POST", path: "/email/send-notification", handler: async ({ db, body, env }) => {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) return err("Email not configured", 500);
    const { to, clientName, type, bookingDate, bookingTime, technicianName, estimatedArrival, jobDescription, message } = body || {};
    if (!to || !clientName || !type) return err("to, clientName, and type required");
    const templates = {
      "booking-confirmation": {
        subject: "Booking Confirmed — ProFlow Plumbing",
        heading: "Booking Confirmed! ✅",
        body: `<p style="font-size:15px;color:#475569;line-height:1.6">Your service appointment has been scheduled:</p><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0">${bookingDate ? `<p style="margin:0 0 8px"><strong>Date:</strong> ${bookingDate}</p>` : ""}${bookingTime ? `<p style="margin:0 0 8px"><strong>Time:</strong> ${bookingTime}</p>` : ""}${technicianName ? `<p style="margin:0 0 8px"><strong>Technician:</strong> ${technicianName}</p>` : ""}${jobDescription ? `<p style="margin:0"><strong>Service:</strong> ${jobDescription}</p>` : ""}</div><p style="font-size:15px;color:#475569;line-height:1.6">We'll send you a reminder before your appointment. If you need to reschedule, just reply to this email.</p>`,
      },
      "on-the-way": {
        subject: "Your Plumber is On the Way! 🚐",
        heading: "We're On Our Way! 🚐",
        body: `<p style="font-size:15px;color:#475569;line-height:1.6">Good news — your plumber is heading to you now!</p><div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:16px 0">${technicianName ? `<p style="margin:0 0 8px"><strong>Technician:</strong> ${technicianName}</p>` : ""}${estimatedArrival ? `<p style="margin:0 0 8px"><strong>Estimated Arrival:</strong> ${estimatedArrival}</p>` : ""}${jobDescription ? `<p style="margin:0"><strong>Service:</strong> ${jobDescription}</p>` : ""}</div><p style="font-size:15px;color:#475569;line-height:1.6">Please make sure the work area is accessible. See you soon!</p>`,
      },
      "job-complete": {
        subject: "Service Complete — ProFlow Plumbing",
        heading: "Job Complete! 🎉",
        body: `<p style="font-size:15px;color:#475569;line-height:1.6">We've completed the work at your property.</p>${jobDescription ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0"><p style="margin:0"><strong>Service performed:</strong> ${jobDescription}</p></div>` : ""}<p style="font-size:15px;color:#475569;line-height:1.6">If you have any questions or concerns about the work, please don't hesitate to reach out. We'd also really appreciate a review if you're happy with our service!</p>`,
      },
      "reminder": {
        subject: "Appointment Reminder — ProFlow Plumbing",
        heading: "Appointment Reminder 📋",
        body: `<p style="font-size:15px;color:#475569;line-height:1.6">Just a friendly reminder about your upcoming appointment:</p><div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px;margin:16px 0">${bookingDate ? `<p style="margin:0 0 8px"><strong>Date:</strong> ${bookingDate}</p>` : ""}${bookingTime ? `<p style="margin:0 0 8px"><strong>Time:</strong> ${bookingTime}</p>` : ""}${jobDescription ? `<p style="margin:0"><strong>Service:</strong> ${jobDescription}</p>` : ""}</div><p style="font-size:15px;color:#475569;line-height:1.6">Need to reschedule? Just reply to this email or call us.</p>`,
      },
    };
    const tmpl = templates[type];
    if (!tmpl) return err(`Unknown notification type: ${type}. Valid: ${Object.keys(templates).join(", ")}`);
    const personalMsg = message ? `<p style="font-size:15px;color:#475569;line-height:1.6">${message}</p>` : "";
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,system-ui,sans-serif"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;margin-top:20px"><div style="background:#4338ca;color:#fff;padding:28px 24px;text-align:center"><h1 style="margin:0;font-size:22px">ProFlow Plumbing</h1><p style="opacity:.8;margin-top:4px;font-size:13px">${tmpl.heading}</p></div><div style="padding:28px 24px"><p style="font-size:16px;color:#1e293b;line-height:1.6">Hi ${clientName},</p>${personalMsg}${tmpl.body}</div><div style="padding:16px 24px;border-top:1px solid #e2e8f0;text-align:center"><p style="font-size:12px;color:#94a3b8;margin:0">ProFlow Plumbing · Honolulu, HI</p></div></div></body></html>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: "ProFlow Plumbing <plumbingpro@techsavvyhawaii.com>", to: [to], subject: tmpl.subject, html, reply_to: "plumbingpro@techsavvyhawaii.com" }),
    });
    if (!res.ok) { const t = await res.text(); console.error("Resend error:", t); return err("Failed to send notification", 500); }
    const data = await res.json();
    return json({ success: true, messageId: data.id, sentTo: to, type });
  }},
];

// Upload a file buffer to R2, returns the stored key
async function uploadToR2(r2, buffer, mimeType, prefix) {
  const ext = (mimeType.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const key = `${prefix}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await r2.put(key, buffer, { httpMetadata: { contentType: mimeType } });
  return key;
}

// Convert snake_case DB rows to camelCase for the frontend
function camelRow(row) {
  if (!row) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] = v;
  }
  return out;
}
