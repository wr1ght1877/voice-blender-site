// Voice Blender waitlist API (Cloudflare Pages "advanced mode" worker).
// Works with dashboard drag-and-drop uploads. Only /api/* reaches this file (see _routes.json);
// everything else is served as static files.
//
// Bindings / settings (Pages project > Settings):
//   DB               D1 database binding (required)
//   TURNSTILE_SECRET Turnstile secret key (optional; when set, every signup must pass Turnstile)
//   ADMIN_TOKEN      long random secret (optional; enables GET /api/waitlist/export CSV download)
//   REF_BOOST        spots gained per referral (optional, default 10)
//   IP_SALT          random string used to hash IPs (optional)

const ALLOWED_ORIGINS = [
  "https://wr1ght1877.github.io",
  "https://voiceblender.pages.dev",
];
const MAX_PER_IP_PER_HOUR = 5;
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alike characters

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const ok =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.voiceblender\.pages\.dev$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const h = { "Vary": "Origin" };
  if (ok) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

function json(request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request) },
  });
}

function makeCode(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return s;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanEmail(v) {
  const e = String(v || "").trim().toLowerCase();
  if (e.length < 6 || e.length > 254) return null;
  if (!/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/.test(e)) return null;
  return e;
}

function cleanName(v) {
  const n = String(v || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);
  return n || null;
}

function cleanCode(v) {
  const c = String(v || "").trim().toLowerCase();
  return /^[a-z0-9]{6,12}$/.test(c) ? c : null;
}

async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // Turnstile not configured yet
  if (!token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const d = await r.json();
    return d.success === true;
  } catch {
    return false;
  }
}

async function statusFor(env, row) {
  const boost = Number(env.REF_BOOST) || 10;
  // Lower score = closer to the front. Each referral moves you up `boost` spots.
  const myScore = row.id - boost * row.referrals;
  const ahead = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM signups WHERE (id - ?1 * referrals) < ?2 OR ((id - ?1 * referrals) = ?2 AND id < ?3)"
  ).bind(boost, myScore, row.id).first("n");
  const total = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups").first("n");
  return { code: row.code, name: row.name, position: ahead + 1, total, referrals: row.referrals };
}

async function join(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { ok: false, error: "Bad request." });
  }
  // Honeypot: real people never fill the hidden "website" field. Pretend it worked.
  if (body.website) return json(request, 200, { ok: true, position: 0, total: 0, referrals: 0, code: null });

  const email = cleanEmail(body.email);
  if (!email) return json(request, 400, { ok: false, error: "Please enter a valid email address." });
  const name = cleanName(body.name);
  const ref = cleanCode(body.ref);
  const ip = request.headers.get("CF-Connecting-IP") || "";

  if (!(await verifyTurnstile(env, body.turnstileToken, ip))) {
    return json(request, 400, { ok: false, error: "Please complete the human check and try again." });
  }

  // Already on the list? Show their spot instead of adding them twice.
  const existing = await env.DB.prepare("SELECT * FROM signups WHERE email = ?1").bind(email).first();
  if (existing) return json(request, 200, { ok: true, already: true, ...(await statusFor(env, existing)) });

  const ipHash = ip ? (await sha256((env.IP_SALT || "vb-waitlist") + ip)).slice(0, 32) : null;
  if (ipHash) {
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM signups WHERE ip_hash = ?1 AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ','now','-1 hour')"
    ).bind(ipHash).first("n");
    if (recent >= MAX_PER_IP_PER_HOUR) {
      return json(request, 429, { ok: false, error: "Too many signups from this network. Please try again later." });
    }
  }

  // Only credit a referral from a real code that wasn't created on the same network.
  let referrer = null;
  if (ref) {
    referrer = await env.DB.prepare("SELECT id, code, ip_hash FROM signups WHERE code = ?1").bind(ref).first();
    if (referrer && ipHash && referrer.ip_hash === ipHash) referrer = null;
  }

  const origin = request.headers.get("Origin") || "";
  const source = origin.includes("github.io") ? "github" : origin.includes("pages.dev") ? "cloudflare" : "other";

  let row = null;
  for (let i = 0; i < 5 && !row; i++) {
    const code = makeCode();
    try {
      const stmts = [
        env.DB.prepare(
          "INSERT INTO signups (email, name, code, referred_by, ip_hash, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
        ).bind(email, name, code, referrer ? referrer.code : null, ipHash, source),
      ];
      if (referrer) {
        stmts.push(env.DB.prepare("UPDATE signups SET referrals = referrals + 1 WHERE id = ?1").bind(referrer.id));
      }
      await env.DB.batch(stmts); // runs as one transaction
      row = await env.DB.prepare("SELECT * FROM signups WHERE email = ?1").bind(email).first();
    } catch (e) {
      const msg = String(e && e.message);
      if (msg.includes("signups.email")) {
        // Two submissions raced; return the one that won.
        const won = await env.DB.prepare("SELECT * FROM signups WHERE email = ?1").bind(email).first();
        if (won) return json(request, 200, { ok: true, already: true, ...(await statusFor(env, won)) });
      }
      if (!msg.includes("signups.code")) throw e; // anything but a code collision is a real error
    }
  }
  if (!row) return json(request, 500, { ok: false, error: "Something went wrong. Please try again." });
  return json(request, 200, { ok: true, already: false, referred: !!referrer, ...(await statusFor(env, row)) });
}

async function status(request, env, url) {
  const code = cleanCode(url.searchParams.get("code"));
  if (!code) return json(request, 400, { ok: false, error: "Missing code." });
  const row = await env.DB.prepare("SELECT * FROM signups WHERE code = ?1").bind(code).first();
  if (!row) return json(request, 404, { ok: false, error: "Not found." });
  return json(request, 200, { ok: true, ...(await statusFor(env, row)) });
}

function csvCell(v) {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s; // stop spreadsheet formula injection
  return /[",\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}

async function exportCsv(request, env, url) {
  const token = url.searchParams.get("token") || (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24 || token !== env.ADMIN_TOKEN) {
    return new Response("Not found", { status: 404 });
  }
  const boost = Number(env.REF_BOOST) || 10;
  const { results } = await env.DB.prepare(
    "SELECT id, email, name, code, referred_by, referrals, source, created_at, (id - ?1 * referrals) AS score FROM signups ORDER BY score ASC, id ASC"
  ).bind(boost).all();
  const cols = ["position", "email", "name", "referral_code", "referred_by", "referrals", "source", "signed_up_utc"];
  const lines = [cols.join(",")];
  results.forEach((r, i) => {
    lines.push([i + 1, r.email, r.name, r.code, r.referred_by, r.referrals, r.source, r.created_at].map(csvCell).join(","));
  });
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="voice-blender-waitlist.csv"',
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
    try {
      if (!env.DB) return json(request, 503, { ok: false, error: "The waitlist isn't open yet." });
      if (url.pathname === "/api/waitlist" && request.method === "POST") return await join(request, env);
      if (url.pathname === "/api/waitlist/status" && request.method === "GET") return await status(request, env, url);
      if (url.pathname === "/api/waitlist/export" && request.method === "GET") return await exportCsv(request, env, url);
      return json(request, 404, { ok: false, error: "Not found." });
    } catch (e) {
      console.error("waitlist error", e && e.stack);
      return json(request, 500, { ok: false, error: "Something went wrong. Please try again." });
    }
  },
};
