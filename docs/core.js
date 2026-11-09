// ===== Socle : connexion Supabase, données, utilitaires =====
const SUPABASE_URL = "https://fazxmveukiqpcefzghsr.supabase.co";
const SUPABASE_KEY = "sb_publishable_VPYYOesD0T97zyl3V9b0Ng_VUXQ-lph";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = ["historique_prises","cycle_temperature","rdv_medicaux","suivi_glycemie","suivi_poids","tests_ovulation","suivi_pma","examens_pma","questions_medecin","rdv_a_prendre","suivi_douleur_fatigue","suivi_neuro","resultats_bilans"];
const S = { d: {}, meds: {}, cfg: {}, tab: "dash", warn: [] };
const MOMENTS = [["Matin","prend_matin",true,"🌅"],["Midi","prend_midi",false,"☀️"],["Soir","prend_soir",true,"🌙"],["Coucher","prend_coucher",false,"🛌"]];

// ---------- utilitaires ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, "")); return isNaN(n) ? null : n; };
const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r1 = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;
function today() { return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date()); }
function parseD(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function isoD(dt) { return dt.toISOString().slice(0, 10); }
function addDays(s, n) { const d = parseD(s); d.setUTCDate(d.getUTCDate() + n); return isoD(d); }
function diffDays(a, b) { return Math.round((parseD(a) - parseD(b)) / 864e5); }
function fr(s) { s = String(s || ""); return s.length >= 10 ? s.slice(8, 10) + "/" + s.slice(5, 7) + "/" + s.slice(0, 4) : s; }
function fr2(s) { s = String(s || ""); return s.slice(8, 10) + "/" + s.slice(5, 7); }
function mondayOf(s) { const d = parseD(s); const wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd); return isoD(d); }
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2500); }
function parseJ(c) { if (typeof c === "string") { try { return JSON.parse(c); } catch { return {}; } } return c || {}; }
const rows = (t) => S.d[t] || [];

// ---------- lecture ----------
async function fetchTable(t) {
  let out = [], from = 0;
  for (;;) {
    let { data, error } = await sb.from(t).select("*").order("id").range(from, from + 999);
    if (error) ({ data, error } = await sb.from(t).select("*").range(from, from + 999));
    if (error) {
      if (/PGRST205|does not exist|Could not find/.test((error.message || "") + (error.code || ""))) return [];
      throw error;
    }
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}
async function loadTables(list) {
  const res = await Promise.allSettled(list.map(fetchTable));
  res.forEach((r, i) => {
    if (r.status === "fulfilled") S.d[list[i]] = r.value;
    else { S.d[list[i]] = S.d[list[i]] || []; S.warn.push("Impossible de lire « " + list[i] + " » : " + String(r.reason?.message || r.reason).slice(0, 150)); }
  });
}
async function loadMeds() {
  const { data } = await sb.from("medicaments").select("*");
  S.meds = {};
  (data || []).forEach((r) => { if (r.name && r.config) S.meds[r.name] = parseJ(r.config); });
}
async function loadCfg() {
  const { data } = await sb.from("config_grossesse").select("*");
  S.cfg = {};
  (data || []).forEach((r) => { S.cfg[r.id] = parseJ(r.config); });
}
async function loadAll() {
  S.warn = [];
  await Promise.all([loadTables(TABLES), loadMeds().catch(() => {}), loadCfg().catch(() => {})]);
}

// ---------- écriture (recharge seulement ce qui a changé) ----------
async function ins(t, row) {
  const { error } = await sb.from(t).insert(row);
  if (error) { toast("Erreur : " + error.message); return false; }
  await loadTables([t]); return true;
}
async function upd(t, id, obj) {
  const { error } = await sb.from(t).update(obj).eq("id", id);
  if (error) { toast("Erreur : " + error.message); return false; }
  return true;
}
async function del(t, ids) {
  const { error } = await sb.from(t).delete().in("id", ids);
  if (error) { toast("Erreur : " + error.message); return false; }
  await loadTables([t]); return true;
}
async function saveMed(name, config) {
  const { error } = await sb.from("medicaments").upsert({ name, config });
  if (error) { toast("Erreur : " + error.message); return false; }
  S.meds[name] = config; return true;
}
async function delMed(name) {
  const { error } = await sb.from("medicaments").delete().eq("name", name);
  if (error) { toast("Erreur : " + error.message); return false; }
  delete S.meds[name]; return true;
}
async function saveCfg(id, cfg) {
  const { error } = await sb.from("config_grossesse").upsert({ id, config: cfg });
  if (error) { toast("Erreur : " + error.message); return false; }
  S.cfg[id] = parseJ(cfg); return true;
}
const cfg = (id) => S.cfg[id] || {};

// ---------- composants de formulaire ----------
const field = (id, label, type = "text", val = "", extra = "") => `<div class="fg"><label class="f" for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(val)}" ${extra}></div>`;
const area = (id, label, val = "", ph = "") => `<div class="fg"><label class="f" for="${id}">${label}</label><textarea id="${id}" placeholder="${esc(ph)}">${esc(val)}</textarea></div>`;
const sel = (id, label, opts, val = "") => `<div class="fg"><label class="f" for="${id}">${label}</label><select id="${id}">${opts.map((o) => `<option${o === val ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
const chk = (id, label, on = false, extra = "") => `<label class="ck"><input type="checkbox" id="${id}" ${on ? "checked" : ""} ${extra}> ${label}</label>`;
const checks = (name, opts) => `<div class="chips">${opts.map((o) => `<label class="ck"><input type="checkbox" name="${name}" value="${esc(o)}"> ${esc(o)}</label>`).join("")}</div>`;
const picked = (name) => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((e) => e.value);
const fold = (title, html, open = false) => `<details ${open ? "open" : ""}><summary>${title}</summary>${html}</details>`;
const box = (kind, html) => `<div class="box ${kind}">${html}</div>`;
const metric = (label, value) => `<div class="metric"><span>${label}</span><b>${value}</b></div>`;
const bar = (p) => `<div class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></div>`;
const btn = (label, act, cls = "", data = "") => `<button class="b ${cls}" data-act="${act}" ${data}>${label}</button>`;
const val = (id) => ($(id) ? $(id).value : "");
const ck = (id) => ($(id) ? $(id).checked : false);

function table(cols, data, empty = "Aucune donnée.") {
  if (!data.length) return `<p class="muted">${empty}</p>`;
  return `<div class="tw"><table><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${data.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

// Tableau modifiable : une ligne = enregistrer / supprimer
function editable(t, data, { cols, choix = {}, hide = [] } = {}) {
  if (!data.length) return `<p class="muted">Aucune ligne.</p>`;
  const keys = cols || [...new Set(data.flatMap((r) => Object.keys(r)))].filter((k) => !["id", "created_at", ...hide].includes(k));
  const sorted = [...data].sort((a, b) => String(b.Date || "").localeCompare(String(a.Date || "")) || b.id - a.id);
  return `<p class="muted">✏️ Modifie une case puis clique sur 💾 de la ligne (dates au format AAAA-MM-JJ).</p>
  <div class="tw"><table data-t="${t}"><thead><tr>${keys.map((k) => `<th>${esc(k)}</th>`).join("")}<th></th></tr></thead><tbody>
  ${sorted.map((r) => `<tr data-id="${r.id}">${keys.map((k) => {
    const v = r[k] ?? "";
    if (choix[k]) return `<td><select data-k="${esc(k)}">${choix[k].map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("")}</select></td>`;
    return `<td><input data-k="${esc(k)}" value="${esc(v)}"></td>`;
  }).join("")}<td style="white-space:nowrap"><button class="b" data-act="rowsave" title="Enregistrer">💾</button><button class="b del" data-act="rowdel" title="Supprimer">🗑️</button></td></tr>`).join("")}
  </tbody></table></div>`;
}

// Questions pour le médecin (utilisé à plusieurs endroits)
function questionsBlock(p) {
  const q = rows("questions_medecin");
  return `<h4>❓ Mes questions pour le médecin</h4>
  ${field(p + "q", "Une question à poser au prochain rendez-vous")}
  ${sel(p + "qp", "Pour qui ?", ["Équipe PMA / gynécologue", "Médecin traitant", "Endocrinologue / diabétologue", "Kiné", "Cardiologue", "Autre"])}
  ${btn("➕ Ajouter la question", "addq", "", `data-p="${p}"`)}
  ${q.length ? `<p class="muted">Mets « Posée » sur Oui une fois la question posée, et note la réponse.</p>${editable("questions_medecin", q, { choix: { "Posée": ["Non", "Oui"] } })}` : ""}`;
}

// ---------- graphiques ----------
const charts = {};
function drawChart(id, cfgChart) {
  const c = $(id); if (!c) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(c, cfgChart);
}
const dayNum = (s) => Math.round(parseD(s) / 864e5);
const dayLabel = (n) => { const d = new Date(n * 864e5); return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); };
const PALETTE = ["#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd", "#8c564b", "#e377c2", "#17becf", "#bcbd22"];
function lineChart(id, datasets, { ymin, ymax, ytitle, xnum = false, vlines = [], bands = [], tipLabel = null } = {}) {
  drawChart(id, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false, spanGaps: true,
      parsing: false,
      scales: {
        x: { type: "linear", ticks: { callback: (v) => (xnum ? v : dayLabel(v)), maxTicksLimit: 8 }, title: { display: xnum, text: "Jour du cycle" } },
        y: { min: ymin, max: ymax, title: { display: !!ytitle, text: ytitle || "" } },
      },
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: (it) => (xnum ? "Jour " + it[0].parsed.x : dayLabel(it[0].parsed.x)), ...(tipLabel ? { label: tipLabel } : {}) } } },
    },
    plugins: [{
      id: "bd", beforeDatasetsDraw(ch) {
        const { ctx, chartArea: a, scales: { y } } = ch;
        bands.forEach((b) => {
          const y1 = y.getPixelForValue(Math.min(b.to, y.max)), y2 = y.getPixelForValue(Math.max(b.from, y.min));
          if (y2 < a.top || y1 > a.bottom) return;
          ctx.save(); ctx.fillStyle = b.color; ctx.fillRect(a.left, Math.max(a.top, y1), a.right - a.left, Math.min(a.bottom, y2) - Math.max(a.top, y1));
          if (b.label) { ctx.fillStyle = b.text || "#555"; ctx.font = "12px Nunito, sans-serif"; ctx.fillText(b.label, a.left + 8, Math.max(a.top, y1) + 14); }
          ctx.restore();
        });
      },
    }, {
      id: "vl", afterDatasetsDraw(ch) {
        const { ctx, chartArea: a, scales: { x } } = ch;
        ctx.save(); ctx.strokeStyle = "red"; ctx.setLineDash([4, 4]); ctx.fillStyle = "red";
        vlines.forEach((v) => { const px = x.getPixelForValue(v.x); if (px >= a.left && px <= a.right) { ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke(); if (v.label) ctx.fillText(v.label, px + 3, a.top + 10); } });
        ctx.restore();
      },
    }],
  });
}
const pts = (arr, fx, fy) => arr.map((r) => ({ x: fx(r), y: fy(r) })).filter((p) => p.y !== null && p.y !== undefined && !isNaN(p.y));

// ---------- médicaments ----------
function doseActuelle(info) {
  let dose = parseInt(info.nb_cachet_par_repas ?? 1);
  if (info.is_evolution && info.phases) {
    try {
      const ph = parseJ(info.phases); const p1 = Array.isArray(ph) ? ph : [];
      const debut = info.start_date || today();
      const duree = parseInt(p1[0]?.duration ?? 7);
      if (diffDays(today(), debut) < duree) dose = parseInt(p1[0]?.dose ?? 1);
      else if (p1.length > 1) dose = parseInt(p1[1]?.dose ?? 2);
    } catch {}
  }
  return dose;
}
function momentPourHeure(hhmm) {
  const h = parseInt(String(hhmm).slice(0, 2)); if (isNaN(h)) return "prend_soir";
  return h < 11 ? "prend_matin" : h < 15 ? "prend_midi" : h < 21 ? "prend_soir" : "prend_coucher";
}
const requis = (info) => MOMENTS.filter(([, k, d]) => info[k] ?? d).map((m) => m[0]);
function regles() { return [...new Set(rows("cycle_temperature").filter((r) => r["Cycle Status"] === "🩸 Début des Règles").map((r) => r.Date))].sort(); }
function cycleMoyen() {
  const rg = regles(), l = [];
  for (let i = 1; i < rg.length; i++) { const d = diffDays(rg[i], rg[i - 1]); if (d >= 15 && d <= 90) l.push(d); }
  return { n: l.length, val: l.length ? Math.round(avg(l)) : 35 };
}

// ---------- date saisissable à la main (JJ/MM/AAAA) + calendrier ----------
const dateField = (id, label, iso, max = "") => `<div class="fg"><label class="f" for="${id}">${label}</label><div class="dwrap"><input id="${id}" type="text" inputmode="numeric" placeholder="JJ/MM/AAAA" autocomplete="off" value="${esc(fr(iso))}" data-fdate="1" data-iso="${esc(iso)}"><input type="date" class="dpick" data-for="${id}" value="${esc(iso)}" ${max ? `max="${max}"` : ""} aria-label="Ouvrir le calendrier" title="Calendrier"></div></div>`;
function parseFr(t) {
  const m = String(t).trim().match(/^(\d{1,2})[\/\-.\s]?(\d{1,2})[\/\-.\s]?(\d{4})$/); if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3], dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1900 || y > 2100 || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return isoD(dt);
}
const dval = (id) => ($(id) ? $(id).dataset.iso || "" : "");
