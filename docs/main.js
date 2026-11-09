// ===== Navigation, rendu et événements =====
const NAV = [
  ["dash", "📱 Tableau de Bord", renderDash, null],
  ["cycle", "🌸 Mon Suivi Féminin", renderCycle, () => { afterCycle(); if (S.set.parcours === PARCOURS[3]) afterPostPartum(); }],
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

function render() {
  $("nav").innerHTML = NAV.map(([k, l]) => `<button data-nav="${k}" class="${k === S.tab ? "on" : ""}">${l}</button>`).join("");
  const cur = NAV.find((n) => n[0] === S.tab) || NAV[0];
  const y = window.scrollY;
  let html = S.warn.map((w) => box("warn", "⚠️ " + esc(w))).join("");
  try { html += cur[2](); } catch (e) { console.error(e); html += box("err", "Erreur d'affichage : " + esc(e.message)); }
  $("main").innerHTML = html;
  try { cur[3] && cur[3](); } catch (e) { console.error(e); }
  window.scrollTo(0, y);
  renderSide();
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
  if (n) { S.tab = n.dataset.nav; location.hash = S.tab; render(); window.scrollTo(0, 0); return; }
  const a = e.target.closest("[data-act]");
  if (a && ACT[a.dataset.act]) {
    a.disabled = true;
    try { await ACT[a.dataset.act](a); } catch (err) { console.error(err); toast("Erreur : " + err.message); }
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
