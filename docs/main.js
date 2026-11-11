// ===== Navigation, rendu et événements =====
const NAV = [
  ["dash", "📱 Tableau de Bord", renderDash, null],
  ["cycle", "🌸 Mon Suivi Féminin", renderCycle, () => { afterCycle(); if (S.set.parcours === PARCOURS[3]) afterPostPartum(); if (S.set.parcours === PARCOURS[0] || S.set.parcours === PARCOURS[2]) afterSopk(); }],
  ["rdv", "📅 Rendez-vous Médicaux", renderRdv, null],
  ["health", "🥗 Suivi Glycémie & Nutrition", renderHealth, afterHealth],
  ["df", "🧘 Douleur & Énergie", renderDouleur, afterDouleur],
  ["tsa", "🧩 TSA", () => renderTrouble("TSA"), () => afterTrouble("TSA")],
  ["tdah", "⚡ TDAH", () => renderTrouble("TDAH"), () => afterTrouble("TDAH")],
  ["spt", "🌿 SPT", () => renderTrouble("SPT"), () => afterTrouble("SPT")],
  ["resume", "📊 Résumé du mois", renderResume, afterResume],
  ["fiche", "📄 Fiche pour mes médecins", renderFiche, null],
  ["histo", "📜 Historique & Corrections", renderHisto, null],
];
const ACT = { ...ACT_DASH, ...ACT_CYCLE, ...ACT_HEALTH, ...ACT_DF, ...ACT_MISC, ...ACT_MODES, ...ACT_BILAN, ...ACT_RESUME };
const CHG = { ...CHG_DASH, ...CHG_HEALTH, ...CHG_CYCLE, ...CHG_SET, ...CHG_MODES, ...CHG_BILAN, ...CHG_RESUME };

// ----- tous les graphiques sont rétractables (l'état est mémorisé) -----
const CHART_TITLES = { chGJ: "Voir le graphique", chGP: "Voir le graphique", chGM: "🕒 Moyenne par moment de la journée", chPoids: "⚖️ Courbe de poids", chBilan: "🧪 Évolution de ce résultat", chDf: "📈 Douleur, fatigue, sommeil", chCyc: "🔁 Symptômes selon mon cycle", chSo: "🌿 Acné, pilosité, chute de cheveux", chSoT: "📏 Tour de taille", chResG: "🩸 Glycémie du mois", chResD: "🧘 Douleur, fatigue, humeur", chGPoids: "⚖️ Courbe de poids", chGTens: "🩺 Courbe de tension", chNeuro: "📈 Mon évolution", chTests: "🧪 Évolution de mes tests d'ovulation", chCycle: "🌡️ Courbe de température" };
S.chartClosed = (() => { try { return JSON.parse(localStorage.getItem("chartClosed") || "{}"); } catch { return {}; } })();
function wrapCharts() {
  document.querySelectorAll("#main .chart").forEach((c) => {
    if (c.closest("details")) return;
    const cv = c.querySelector("canvas"); if (!cv) return;
    const d = document.createElement("details"); d.className = "chartfold"; d.dataset.cid = cv.id;
    d.open = !S.chartClosed[cv.id];
    d.innerHTML = `<summary>${CHART_TITLES[cv.id] || "📈 Graphique"}</summary>`;
    c.replaceWith(d); d.appendChild(c);
  });
}
document.addEventListener("toggle", (e) => {
  const d = e.target; if (!d.dataset || !d.dataset.cid) return;
  if (d.open) delete S.chartClosed[d.dataset.cid]; else S.chartClosed[d.dataset.cid] = 1;
  try { localStorage.setItem("chartClosed", JSON.stringify(S.chartClosed)); } catch {}
  if (d.open && charts[d.dataset.cid]) charts[d.dataset.cid].resize();
}, true);

// ----- ce que tu as commencé à écrire dans un formulaire n'est plus perdu quand tu en enregistres un AUTRE -----
const DIRTY = new Set(); // champs modifiés par toi et pas encore enregistrés
const FORM_SEL = "#main input, #main select, #main textarea, #side input, #side select, #side textarea";
const fkey = (el) => {
  if (!el || el.nodeType !== 1 || ["file", "button", "submit"].includes(el.type)) return null;
  if (el.id) return "#" + el.id;
  return el.name ? "n:" + el.name + "=" + (el.type === "checkbox" || el.type === "radio" ? el.value : "") : null;
};
const fread = (el, k) => (k[0] === "#" ? READ.has(k.slice(1)) : READ.has("n:" + el.name));
function markDirty(e) { const k = fkey(e.target); if (k && e.target.closest("#main, #side")) DIRTY.add(k); }
document.addEventListener("input", markDirty, true);
document.addEventListener("change", markDirty, true);
function snapForm() {
  const m = new Map(); S.actRead = new Set(READ);
  document.querySelectorAll(FORM_SEL).forEach((el) => {
    const k = fkey(el); if (!k || !DIRTY.has(k) || fread(el, k)) return;
    m.set(k, { v: el.value, c: el.checked, iso: el.dataset ? el.dataset.iso : undefined });
  });
  return m;
}
function restoreForm(m) {
  document.querySelectorAll(FORM_SEL).forEach((el) => {
    const k = fkey(el), s = k && m.get(k); if (!s) return;
    if (el.type === "checkbox" || el.type === "radio") el.checked = s.c;
    else { el.value = s.v; if (s.iso !== undefined && el.dataset) el.dataset.iso = s.iso; }
    el.dispatchEvent(new Event(el.id || el.type !== "checkbox" ? "input" : "change", { bubbles: true })); // remet à jour les petits affichages (curseurs, alertes)
  });
}
function forgetRead(used) {
  used.forEach((r) => { if (r.startsWith("n:")) [...DIRTY].forEach((k) => k.startsWith(r + "=") && DIRTY.delete(k)); else DIRTY.delete("#" + r); });
}

function render() {
  const keep = S.inAct ? snapForm() : null;
  $("nav").innerHTML = NAV.map(([k, l]) => `<button data-nav="${k}" class="${k === S.tab ? "on" : ""}">${l}</button>`).join("");
  const cur = NAV.find((n) => n[0] === S.tab) || NAV[0];
  const y = window.scrollY;
  let html = S.warn.map((w) => box("warn", "⚠️ " + esc(w))).join("");
  try { html += cur[2](); } catch (e) { console.error(e); html += box("err", "Erreur d'affichage : " + esc(e.message)); }
  $("main").innerHTML = html;
  wrapCharts();
  try { cur[3] && cur[3](); } catch (e) { console.error(e); }
  window.scrollTo(0, y);
  renderSide();
  if (keep && keep.size) restoreForm(keep);
}

function sideOpen() { try { return localStorage.getItem("sideOpen") === "1"; } catch { return false; } }
function setSide(on) {
  document.body.classList.toggle("sideopen", on);
  $("sideBtn").setAttribute("aria-expanded", on);
  try { localStorage.setItem("sideOpen", on ? "1" : "0"); } catch {}
}
function renderSide() {
  $("side").innerHTML = `${settingsHtml()}<h3>💊 Ajouter ou modifier un médicament</h3>${medForm()}`;
  setSide(sideOpen());
}
$("sideBtn").addEventListener("click", () => setSide(!document.body.classList.contains("sideopen")));

document.addEventListener("click", async (e) => {
  const n = e.target.closest("[data-nav]");
  if (n) { DIRTY.clear(); S.tab = n.dataset.nav; location.hash = S.tab; render(); window.scrollTo(0, 0); return; }
  const a = e.target.closest("[data-act]");
  if (a && ACT[a.dataset.act]) {
    a.disabled = true; READ.clear(); S.actRead = null; S.inAct = true;
    try { await ACT[a.dataset.act](a); } catch (err) { console.error(err); toast("Erreur : " + err.message); }
    S.inAct = false; forgetRead(S.actRead || READ);
    a.disabled = false;
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.classList.contains("dpick")) {
    const tx = $(el.dataset.for); if (!el.value || !tx) return;
    tx.value = fr(el.value); tx.dataset.iso = el.value;
    const f = CHG[tx.id]; if (f) f({ value: el.value, id: tx.id }); return;
  }
  if (el.dataset.fdate) {
    const iso = parseFr(el.value);
    if (!iso) { toast("Date invalide : écris-la ainsi JJ/MM/AAAA (ex : 15/03/2027)"); el.value = fr(el.dataset.iso); return; }
    el.dataset.iso = iso; el.value = fr(iso);
    const f = CHG[el.id]; if (f) f({ value: iso, id: el.id }); return;
  }
  const f = CHG[el.id]; if (f) f(el);
});

function showLogin(msg) { $("login").hidden = false; document.body.style.overflow = "hidden"; if (msg) $("lgErr").textContent = msg; setTimeout(() => $("lgMail").focus(), 50); }
function hideLogin() { $("login").hidden = true; document.body.style.overflow = ""; }
async function boot() {
  const h = location.hash.slice(1); if (NAV.some((n) => n[0] === h)) S.tab = h;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { showLogin(); return; }
  hideLogin();
  try { await loadAll(); } catch (e) { S.warn.push(String(e.message || e)); }
  render();
}
async function doLogin() {
  $("lgErr").textContent = ""; $("lgBtn").disabled = true;
  const { error } = await sb.auth.signInWithPassword({ email: $("lgMail").value.trim(), password: $("lgPass").value });
  $("lgBtn").disabled = false;
  if (error) { $("lgErr").textContent = /Invalid login/i.test(error.message) ? "Email ou mot de passe incorrect." : "Connexion impossible : " + error.message; return; }
  $("lgPass").value = ""; boot();
}
$("lgBtn").addEventListener("click", doLogin);
$("lgPass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") { S.d = {}; S.meds = {}; S.cfg = {}; $("main").innerHTML = ""; showLogin(); } });
boot();
