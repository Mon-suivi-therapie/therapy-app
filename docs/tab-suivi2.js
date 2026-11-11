// ===== Carnet d'humeur, symptômes selon le cycle, courbes poids / tension de grossesse =====

// ---------- carnet d'humeur (stocké dans la config n°14 : { jours: { "AAAA-MM-JJ": { h: 1..5, note } } }) ----------
const HUMEURS = [[5, "😄", "Super"], [4, "😊", "Bien"], [3, "😐", "Moyenne"], [2, "😔", "Pas bien"], [1, "😢", "Très mal"]];
const humeurs = () => cfg(14).jours || {};
const humEmoji = (v) => (HUMEURS.find((x) => x[0] === Math.round(v)) || [0, "", ""])[1];

function humeurBlock() {
  const j = humeurs(), jour = today(), cur = j[jour] ? j[jour].h : 0;
  const rec = Object.keys(j).sort().reverse().slice(0, 14);
  return `<h3>💭 Mon humeur du jour</h3><p class="muted">Un seul clic, séparé du suivi de la douleur. Elle sera visible dans ton résumé du mois et croisée avec ton cycle.</p>
  ${field("huDate", "🗓️ Jour", "date", jour, `max="${jour}"`)}
  <div class="chips">${HUMEURS.map(([v, e, l]) => `<label class="ck"><input type="radio" name="hu" value="${v}" ${v === cur ? "checked" : ""}> ${e} ${l}</label>`).join("")}</div>
  ${btn("💾 Enregistrer mon humeur", "savehumeur", "sec")}
  <p class="muted" id="huRec">${humRecent()}</p>`;
}
function humRecent() {
  const j = humeurs(), rec = Object.keys(j).sort().reverse().slice(0, 14);
  return rec.length ? "Derniers jours : " + rec.slice().reverse().map((d) => `${fr2(d)} ${humEmoji(j[d].h)}`).join(" · ") : "";
}

// ---------- symptômes selon le jour du cycle ----------
function jourDuCycle(date, rg) {
  let dernier = null; for (const r of rg) { if (r <= date) dernier = r; else break; }
  if (!dernier) return null; const j = diffDays(date, dernier) + 1; return j >= 1 && j <= 60 ? j : null;
}
function donneesCycle() {
  const rg = regles(), B = {};
  const ajoute = (date, k, v) => { if (v === null || v === undefined || isNaN(v)) return; const j = jourDuCycle(date, rg); if (!j) return; ((B[j] = B[j] || {})[k] = B[j][k] || []).push(v); };
  rows("suivi_douleur_fatigue").forEach((r) => { ajoute(r.Date, "dou", num(r["Douleur (0-10)"])); ajoute(r.Date, "fat", num(r["Fatigue (0-10)"])); });
  Object.entries(humeurs()).forEach(([d, x]) => ajoute(d, "hum", x.h * 2));
  return { B, nCycles: Math.max(0, rg.length - 1) + (rg.length ? 1 : 0), nRegles: rg.length };
}
function cycleSympHtml() {
  const { B, nRegles } = donneesCycle();
  let h = `<h3>🔁 Mes symptômes selon mon cycle</h3>`;
  if (!nRegles) return h + `<p class="muted">Pour voir ce graphique, note le premier jour de tes règles dans l'onglet « Mon Suivi Féminin » (« Début des règles »).</p>`;
  const jours = Object.keys(B);
  if (!jours.length) return h + `<p class="muted">Pas encore de douleur, fatigue ou humeur enregistrées depuis tes dernières règles. Dès que tu en notes, le graphique apparaît.</p>`;
  h += `<p class="muted">Chaque point est la moyenne de ce que tu as noté ce jour-là du cycle (jour 1 = premier jour des règles). Plus tu enregistres de cycles, plus les « jours qui reviennent » sont fiables.</p><div class="chart"><canvas id="chCyc"></canvas></div>`;
  const moy = (k) => Object.entries(B).filter(([, o]) => o[k]).map(([j, o]) => [+j, avg(o[k]), o[k].length]);
  const dou = moy("dou").filter((x) => x[1] >= 5).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (dou.length) h += box("info", `🔎 Ta douleur est la plus forte autour des <b>jours ${dou.map((x) => x[0]).sort((a, b) => a - b).join(", ")}</b> du cycle. Note-le pour en parler à ton médecin.`);
  const fat = moy("fat").filter((x) => x[1] >= 6).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (fat.length) h += box("info", `🔎 Ta fatigue est la plus forte autour des <b>jours ${fat.map((x) => x[0]).sort((a, b) => a - b).join(", ")}</b>.`);
  const hum = moy("hum").filter((x) => x[1] <= 5).sort((a, b) => a[1] - b[1]).slice(0, 3);
  if (hum.length) h += box("info", `🔎 Ton humeur est la plus basse autour des <b>jours ${hum.map((x) => x[0]).sort((a, b) => a - b).join(", ")}</b>.`);
  return h;
}
function afterCycleSymp() {
  if (!$("chCyc")) return;
  const { B } = donneesCycle();
  const serie = (k, label, color) => ({ label, data: Object.entries(B).filter(([, o]) => o[k]).map(([j, o]) => ({ x: +j, y: r1(avg(o[k])) })).sort((a, b) => a.x - b.x), borderColor: color, backgroundColor: color, tension: 0.25, pointRadius: 3 });
  lineChart("chCyc", [serie("dou", "Douleur", "#d2577d"), serie("fat", "Fatigue", "#6f5bd0"), serie("hum", "Humeur (10 = super)", "#2ca02c")], { ymin: 0, ymax: 10, ytitle: "0 à 10", xnum: true });
}

// ---------- grossesse : poids et tension ----------
// Les relevés de tension sont dans la config n°15 : { releves: [{ id, date, heure, moment, pos, bras, s, d, pouls, sym, note }] }
const TN_MOMENTS = ["Au réveil", "Matin", "Midi", "Après-midi", "Soir", "Avant le coucher", "Après un repas", "Après un effort", "Après un stress / une émotion"];
const TN_POS = ["Assise", "Allongée sur le côté gauche", "Allongée sur le dos", "Debout"];
const TN_SYM = ["Maux de tête", "Vertiges / malaise", "Troubles de la vue (mouches, flashs)", "Bourdonnements d'oreilles", "Douleur sous les côtes / estomac", "Gonflement mains ou visage", "Nausées soudaines"];
const tnNorm = (v) => { const n = num(v); return n === null ? null : n < 30 ? Math.round(n * 10) : Math.round(n); };
const tnReleves = () => (cfg(15).releves || []).slice();
const tnHeureNum = (h) => { const m = String(h || "").match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1] + +m[2] / 60) / 24 : 0.5; };

function tnStatut(s, d, sym = []) {
  const alerte = sym.some((x) => x && x !== "Aucun");
  if (s >= 160 || d >= 110) return { k: "err", t: `🚨 <b>${s / 10}/${d / 10} : tension très élevée.</b> Appelle ta maternité ou le 15 sans attendre.` };
  if (s >= 140 || d >= 90) return alerte
    ? { k: "err", t: `🚨 <b>${s / 10}/${d / 10} avec des symptômes (${esc(sym.join(", "))}).</b> Va aux urgences maternité ou appelle le 15 sans attendre.` }
    : { k: "err", t: `🛑 <b>${s / 10}/${d / 10} : 14/9 ou plus.</b> Repose-toi 15 min allongée sur le côté gauche, mesure à nouveau, et préviens ta sage-femme ou ta maternité <b>le jour même</b> si ça reste élevé.` };
  if (s < 90 || d < 60) return { k: "warn", t: `🔽 <b>${s / 10}/${d / 10} : tension basse.</b> Si tu as un malaise, allonge-toi sur le côté gauche et bois. Parles-en à ton médecin si ça se répète.` };
  return { k: "ok", t: `✅ <b>${s / 10}/${d / 10}</b> : dans les repères habituels.` };
}

function tnTous() { // tous les relevés (carnet de tension + tension notée dans le journal), triés
  const L = tnReleves().map((r) => ({ ...r, src: "carnet" }));
  Object.entries(cfg(11).jours || {}).forEach(([d, x]) => {
    const m = String(x.tension || "").match(/(\d+(?:[.,]\d+)?)\s*[\/\-]\s*(\d+(?:[.,]\d+)?)/);
    if (m) L.push({ id: "j" + d, date: d, heure: "", moment: "", s: tnNorm(m[1]), d: tnNorm(m[2]), sym: [], src: "journal" });
  });
  return L.filter((r) => r.s && r.d).sort((a, b) => (a.date + (a.heure || "")).localeCompare(b.date + (b.heure || "")));
}

function tensionBlock() {
  const R = tnReleves().sort((a, b) => (b.date + (b.heure || "")).localeCompare(a.date + (a.heure || ""))), tous = tnTous(), n = parisNow();
  const hh = String(n.h).padStart(2, "0") + ":" + String(n.m).padStart(2, "0");
  let h = `<p class="muted">Note chaque mesure avec l'heure et le contexte : c'est ce qui permet à ta sage-femme de comprendre quand ta tension monte. Mesure assise, au repos depuis 5 minutes, le bras à hauteur du cœur.</p>
  <div class="row">${dateField("tnDate", "🗓️ Jour", today(), today())}${field("tnHeure", "🕐 Heure de la mesure", "time", hh)}${sel("tnMoment", "📍 Moment", TN_MOMENTS, TN_MOMENTS[1])}</div>
  <div class="row">${field("tnS", "Tension du haut (ex : 120 ou 12)", "number", "", 'step="1" min="0" inputmode="decimal"')}${field("tnD", "Tension du bas (ex : 70 ou 7)", "number", "", 'step="1" min="0" inputmode="decimal"')}${field("tnP", "Pouls (facultatif)", "number", "", 'min="0" inputmode="numeric"')}</div>
  <div class="row">${sel("tnPos", "🪑 Position", TN_POS, TN_POS[0])}${sel("tnBras", "💪 Bras", ["Gauche", "Droit"], "Gauche")}</div>
  ${chk("tnRepos", "✔️ Je me suis reposée 5 minutes avant la mesure", true)}
  <p><b>Ressens-tu l'un de ces signes ?</b></p>${checks("tsy", TN_SYM)}
  ${field("tnNote", "Note (facultatif)")}<div id="tnLive"></div>${btn("💾 Enregistrer ma tension", "tnadd")}`;

  if (tous.length) {
    const last = tous[tous.length - 1], st = tnStatut(last.s, last.d, last.sym || []);
    h += `<h4>📌 Dernière mesure (${fr(last.date)}${last.heure ? " à " + last.heure : ""})</h4>${box(st.k, st.t)}`;
    const sem = tous.filter((r) => diffDays(today(), r.date) < 7), hautes = tous.filter((r) => diffDays(today(), r.date) < 30 && (r.s >= 140 || r.d >= 90)).length;
    h += `<div class="metrics">${sem.length ? metric("Moyenne 7 jours", `${r1(avg(sem.map((r) => r.s)) / 10)}/${r1(avg(sem.map((r) => r.d)) / 10)}`) : ""}${metric("Mesures (30 j)", tous.filter((r) => diffDays(today(), r.date) < 30).length)}${metric("≥ 14/9 (30 j)", hautes)}${metric("Maximum noté", `${Math.max(...tous.map((r) => r.s)) / 10}/${Math.max(...tous.map((r) => r.d)) / 10}`)}</div>`;
    // quand la tension monte : moyenne par moment de la journée
    const par = {}; tous.filter((r) => r.moment).forEach((r) => (par[r.moment] = par[r.moment] || []).push(r));
    const ls = TN_MOMENTS.filter((m) => par[m]).map((m) => ({ Moment: m, Mesures: par[m].length, Moyenne: `${r1(avg(par[m].map((r) => r.s)) / 10)}/${r1(avg(par[m].map((r) => r.d)) / 10)}`, Maximum: `${Math.max(...par[m].map((r) => r.s)) / 10}/${Math.max(...par[m].map((r) => r.d)) / 10}` }));
    if (ls.length) h += `<h4>⏰ Quand ma tension est-elle la plus haute ?</h4>${table(["Moment", "Mesures", "Moyenne", "Maximum"], ls)}`;
    if (tous.length >= 2) h += `<div class="chart"><canvas id="chGTens"></canvas></div><p class="muted">Valeurs en mmHg (12/7 = 120/70). Zone rouge : 140 ou plus. Indicatif : ça ne remplace pas l'avis de ton équipe médicale.</p>`;
  }
  if (R.length) {
    const opt = (L, v) => L.map((o) => `<option${o === v ? " selected" : ""}>${esc(o)}</option>`).join("");
    h += fold(`📋 Mon historique de tension (${R.length}) : modifier ou supprimer`, `<p class="muted">✏️ Change une case puis clique sur 💾 de la ligne, ou 🗑️ pour supprimer.</p>
    <div class="tw"><table data-tn="1"><thead><tr><th>Date</th><th>Heure</th><th>Moment</th><th>Haut</th><th>Bas</th><th>Pouls</th><th>Position</th><th>Bras</th><th>Signes</th><th>Note</th><th></th></tr></thead><tbody>
    ${R.map((r) => `<tr data-id="${esc(r.id)}"><td><input type="date" data-tk="date" value="${esc(r.date)}" max="${today()}"></td><td><input type="time" data-tk="heure" value="${esc(r.heure || "")}"></td>
    <td><select data-tk="moment"><option></option>${opt(TN_MOMENTS, r.moment)}</select></td><td><input data-tk="s" value="${r.s / 10}" inputmode="decimal" style="min-width:60px"></td><td><input data-tk="d" value="${r.d / 10}" inputmode="decimal" style="min-width:60px"></td>
    <td><input data-tk="pouls" value="${esc(r.pouls ?? "")}" inputmode="numeric" style="min-width:60px"></td><td><select data-tk="pos"><option></option>${opt(TN_POS, r.pos)}</select></td><td><select data-tk="bras"><option></option>${opt(["Gauche", "Droit"], r.bras)}</select></td>
    <td><input data-tk="sym" value="${esc((r.sym || []).join(", "))}"></td><td><input data-tk="note" value="${esc(r.note || "")}"></td>
    <td style="white-space:nowrap"><button class="b" data-act="tnsave" title="Enregistrer">💾</button><button class="b del" data-act="tndel" title="Supprimer">🗑️</button></td></tr>`).join("")}
    </tbody></table></div><p class="muted">Haut et bas en cm de mercure ou en mmHg : « 12 » et « 120 » sont acceptés. Les tensions notées dans le journal de symptômes se modifient dans le journal.</p>`);
  }
  return h;
}

function donneesGrossesse() {
  const poids = {};
  rows("suivi_poids").forEach((r) => { const k = num(r["Poids (kg)"]); if (k !== null) poids[r.Date] = k; });
  Object.entries(cfg(11).jours || {}).forEach(([d, x]) => { const k = num(x.poids); if (k !== null && poids[d] === undefined) poids[d] = k; });
  return { poids };
}
function courbesGrossesse() {
  const { poids } = donneesGrossesse(), dp = Object.keys(poids).sort();
  return dp.length >= 2 ? `<h4>⚖️ Mon poids</h4><div class="chart"><canvas id="chGPoids"></canvas></div><p class="muted">Poids de l'onglet « Suivi Glycémie & Nutrition » et du journal. ${dp.length} relevés, de ${poids[dp[0]]} à ${poids[dp[dp.length - 1]]} kg. La prise de poids normale dépend de ta corpulence de départ : demande à ta sage-femme quelle courbe suivre.</p>` : `<p class="muted">⚖️ La courbe de poids apparaît dès 2 pesées (journal de symptômes ou onglet Suivi Glycémie & Nutrition).</p>`;
}
function afterCourbesGrossesse() {
  const { poids } = donneesGrossesse();
  if ($("chGPoids")) lineChart("chGPoids", [{ label: "Poids (kg)", data: Object.keys(poids).sort().map((d) => ({ x: dayNum(d), y: poids[d] })), borderColor: "#e8789a", backgroundColor: "#e8789a", tension: 0.2, pointRadius: 3 }], { ytitle: "kg" });
  if ($("chGTens")) {
    const T = tnTous(), s = (k, label, c) => ({ label, data: T.map((r) => ({ x: dayNum(r.date) + tnHeureNum(r.heure), y: r[k] })), borderColor: c, backgroundColor: c, tension: 0.2, pointRadius: 3 });
    lineChart("chGTens", [s("s", "Haut (systolique)", "#d2577d"), s("d", "Bas (diastolique)", "#6f5bd0")], { ytitle: "mmHg", bands: [{ from: 140, to: 300, color: "rgba(220,60,60,.12)", label: "≥ 140 : à signaler", text: "#a52b3a" }] });
  }
  // message en direct pendant la saisie
  const live = () => { const s = tnNorm(val("tnS")), d = tnNorm(val("tnD")); if ($("tnLive")) $("tnLive").innerHTML = s && d ? (() => { const st = tnStatut(s, d, picked("tsy")); return box(st.k, st.t); })() : ""; };
  ["tnS", "tnD"].forEach((i) => $(i) && $(i).addEventListener("input", live));
  document.querySelectorAll('input[name="tsy"]').forEach((e) => e.addEventListener("change", live));
}

Object.assign(ACT_DF, {
  async savehumeur() {
    const v = +(document.querySelector('input[name="hu"]:checked') || {}).value;
    if (!v) { toast("Choisis d'abord une humeur."); return; }
    const jour = val("huDate") || today(), j = { ...humeurs() };
    j[jour] = { h: v };
    // pas de render() : ce que tu as déjà rempli plus haut (douleur, fatigue…) reste en place
    if (await saveCfg(14, { jours: j })) { toast("💭 Humeur enregistrée"); if ($("huRec")) $("huRec").textContent = humRecent(); }
  },
});

Object.assign(ACT_DF, {
  async tnadd() {
    const s = tnNorm(val("tnS")), d = tnNorm(val("tnD"));
    if (!s || !d) { toast("Écris la tension du haut et du bas."); return; }
    if (s < 50 || s > 300 || d < 30 || d > 200 || d >= s) { toast("Ces valeurs semblent incorrectes : vérifie le haut et le bas."); return; }
    const r = { id: Date.now(), date: dval("tnDate") || today(), heure: val("tnHeure"), moment: val("tnMoment"), pos: val("tnPos"), bras: val("tnBras"), s, d, pouls: num(val("tnP")), sym: picked("tsy"), note: val("tnNote"), repos: ck("tnRepos") };
    if (await saveCfg(15, { releves: [...tnReleves(), r] })) { toast("🩺 Tension enregistrée"); render(); }
  },
  async tnsave(el) {
    const tr = el.closest("tr"), id = tr.dataset.id, g = (k) => tr.querySelector(`[data-tk="${k}"]`).value;
    const s = tnNorm(g("s")), d = tnNorm(g("d"));
    if (!s || !d || d >= s) { toast("Haut et bas : valeurs incorrectes."); return; }
    const L = tnReleves().map((r) => String(r.id) === id ? { ...r, date: g("date") || r.date, heure: g("heure"), moment: g("moment"), pos: g("pos"), bras: g("bras"), s, d, pouls: num(g("pouls")), sym: g("sym").split(",").map((x) => x.trim()).filter(Boolean), note: g("note") } : r);
    if (await saveCfg(15, { releves: L })) { toast("🎉 Mesure modifiée !"); render(); }
  },
  async tndel(el) {
    const id = el.closest("tr").dataset.id;
    if (confirm("Supprimer cette mesure de tension ?") && await saveCfg(15, { releves: tnReleves().filter((r) => String(r.id) !== id) })) { toast("Mesure supprimée"); render(); }
  },
});

