// Voice Blender waitlist with referrals. Talks to the API on Cloudflare Pages (_worker.js).
(function () {
  "use strict";
  // Turnstile site key (public). Leave empty until a Turnstile widget exists; the server
  // only demands a token when TURNSTILE_SECRET is set.
  var TURNSTILE_SITEKEY = "";
  var host = location.hostname;
  var sameOrigin = /(^|\.)voiceblender\.pages\.dev$/.test(host) || host === "localhost" || host === "127.0.0.1";
  var API = sameOrigin ? "" : "https://voiceblender.pages.dev";
  var LS_CODE = "vb_wl_code", LS_REF = "vb_wl_ref";

  var form = document.getElementById("wl-form");
  if (!form) return;
  var done = document.getElementById("wl-done");
  var msg = document.getElementById("wl-msg");
  var btn = form.querySelector(".wl-submit");
  var tsBox = document.getElementById("wl-turnstile");
  var tsWidget = null;

  function store(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // Remember who referred this visitor, even if they sign up later.
  var params = new URLSearchParams(location.search);
  var refParam = (params.get("ref") || "").toLowerCase();
  if (/^[a-z0-9]{6,12}$/.test(refParam)) store(LS_REF, refParam);

  function linkFor(code) { return location.origin + location.pathname + "?ref=" + encodeURIComponent(code); }

  function show(d) {
    form.hidden = true;
    done.hidden = false;
    document.getElementById("wl-hello").textContent = d.already ? "You're already on the list!" : "You're on the list!";
    document.getElementById("wl-position").textContent = Number(d.position).toLocaleString();
    document.getElementById("wl-total").textContent = Number(d.total).toLocaleString();
    document.getElementById("wl-refcount").textContent = Number(d.referrals).toLocaleString();
    document.getElementById("wl-link").value = linkFor(d.code);
  }

  function loadTurnstile() {
    if (!TURNSTILE_SITEKEY || tsWidget !== null) return;
    tsWidget = false;
    window.vbTurnstileReady = function () {
      tsWidget = window.turnstile.render(tsBox, { sitekey: TURNSTILE_SITEKEY, theme: "dark", size: "flexible" });
    };
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=vbTurnstileReady&render=explicit";
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }
  // Load the human check only when someone starts filling the form.
  form.addEventListener("focusin", loadTurnstile, { once: true });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = "Please enter a valid email address."; form.email.focus(); return; }
    var token = "";
    if (TURNSTILE_SITEKEY) {
      token = (window.turnstile && tsWidget) ? window.turnstile.getResponse(tsWidget) : "";
      if (!token) { loadTurnstile(); msg.textContent = "Please complete the quick human check."; return; }
    }
    btn.disabled = true; msg.textContent = "Joining…";
    fetch(API + "/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, name: form.name.value.trim(), website: form.website.value, ref: load(LS_REF) || "", turnstileToken: token })
    }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (d) {
        if (d && d.ok && d.code) { store(LS_CODE, d.code); msg.textContent = ""; show(d); }
        else if (d && d.ok) { msg.textContent = "Thanks!"; }
        else { msg.textContent = (d && d.error) || "Something went wrong. Please try again."; }
      })
      .catch(function () { msg.textContent = "Couldn't reach the waitlist. Please try again."; })
      .then(function () {
        btn.disabled = false;
        if (window.turnstile && tsWidget) window.turnstile.reset(tsWidget);
      });
  });

  document.getElementById("wl-copy").addEventListener("click", function () {
    var input = document.getElementById("wl-link");
    var b = this;
    function ok() { b.textContent = "Copied!"; setTimeout(function () { b.textContent = "Copy"; }, 1500); }
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(ok, function () { input.select(); });
    else { input.select(); try { document.execCommand("copy"); ok(); } catch (err) {} }
  });

  document.getElementById("wl-reset").addEventListener("click", function (e) {
    e.preventDefault(); store(LS_CODE, null); done.hidden = true; form.hidden = false; form.email.focus();
  });

  // Returning visitor: show their current spot and referral count.
  var saved = load(LS_CODE);
  if (saved) {
    fetch(API + "/api/waitlist/status?code=" + encodeURIComponent(saved))
      .then(function (r) { if (r.status === 404) store(LS_CODE, null); return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok) show(d); })
      .catch(function () {});
  }
})();
