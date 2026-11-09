// ===== Carnet d'humeur, symptômes selon le cycle, courbes poids / tension de grossesse =====

// ---------- carnet d'humeur (stocké dans la config n°14 : { jours: { "AAAA-MM-JJ": { h: 1..5, note } } }) ----------
const HUMEURS = [[5, "😄", "Super"], [4, "😊", "Bien"], [3, "😐", "Moyenne"], [2, "😔", "Pas bien"], [1, "😢", "Très mal"]];
const humeurs = () => cfg(14).jours || {};
const humEmoji = (v) => (HUMEURS.find((x) => x[0] === Math.round(v)) || [0, "", ""])[1];

function humeurBlock() {
  const j = humeurs(), jour = today(), cur = j[jour] ? j[jour].h : 0;
  const rec = Object.keys(j).sort().reverse().slice(0, 14);
  return `<h4>💭 Mon humeur du jour</h4><p class="muted">Un seul clic. Elle sera visible dans ton résumé du mois et croisée avec ton cycle. S'enregistre pour le jour choisi ci-dessus.</p>
  <div class="chips">${HUMEURS.map(([v, e, l]) => `<label class="ck"><input type="radio" name="hu" value="${v}" ${v === cur ? "checked" : ""}> ${e} ${l}</label>`).join("")}</div>
  ${btn("💾 Enregistrer mon humeur", "savehumeur", "sec")}
  ${rec.length ? `<p class="muted">Derniers jours : ${rec.slice().reverse().map((d) => `${fr2(d)} ${humEmoji(j[d].h)}`).join(" · ")}</p>` : ""}`;
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
function donneesGrossesse() {
  const poids = {}, tens = {};
  rows("suivi_poids").forEach((r) => { const k = num(r["Poids (kg)"]); if (k !== null) poids[r.Date] = k; });
  Object.entries(cfg(11).jours || {}).forEach(([d, x]) => {
    const k = num(x.poids); if (k !== null && poids[d] === undefined) poids[d] = k;
    const m = String(x.tension || "").match(/(\d+(?:[.,]\d+)?)\s*[\/\-]\s*(\d+(?:[.,]\d+)?)/);
    if (m) { let s = bilN(m[1]), di = bilN(m[2]); if (s < 30) { s *= 10; di *= 10; } tens[d] = { s: Math.round(s), d: Math.round(di) }; }
  });
  return { poids, tens };
}
function courbesGrossesse() {
  const { poids, tens } = donneesGrossesse(), dp = Object.keys(poids).sort(), dt = Object.keys(tens).sort();
  let h = "";
  h += dp.length >= 2 ? `<h4>⚖️ Mon poids</h4><div class="chart"><canvas id="chGPoids"></canvas></div><p class="muted">Poids de l'onglet « Suivi Glycémie & Nutrition » et du journal ci-dessus. ${dp.length} relevés, de ${poids[dp[0]]} à ${poids[dp[dp.length - 1]]} kg. La prise de poids normale dépend de ta corpulence de départ : demande à ta sage-femme quelle courbe suivre.</p>` : `<p class="muted">⚖️ La courbe de poids apparaît dès 2 pesées (journal ci-dessus ou onglet Suivi Glycémie & Nutrition).</p>`;
  if (dt.length) {
    const last = tens[dt[dt.length - 1]];
    h += `<h4>🩺 Ma tension</h4>` + (last.s >= 140 || last.d >= 90 ? box("err", `🛑 Ta dernière tension (${fr2(dt[dt.length - 1])}) est de <b>${last.s / 10}/${last.d / 10}</b> : 14/9 ou plus pendant la grossesse doit être signalé <b>le jour même</b> à ta sage-femme ou à ta maternité, et appelle le 15 en cas de maux de tête forts, troubles de la vue ou douleur sous les côtes.`) : "") + (dt.length >= 2 ? `<div class="chart"><canvas id="chGTens"></canvas></div>` : `<p class="muted">Une seule tension notée pour l'instant : ${last.s / 10}/${last.d / 10}.</p>`) + `<p class="muted">Les valeurs sont en mmHg (12/7 est lu comme 120/70). Zone rouge : 140 ou plus.</p>`;
  } else h += `<p class="muted">🩺 Note ta tension (ex : 12/7) dans le journal ci-dessus pour voir sa courbe ici.</p>`;
  return h;
}
function afterCourbesGrossesse() {
  const { poids, tens } = donneesGrossesse();
  if ($("chGPoids")) lineChart("chGPoids", [{ label: "Poids (kg)", data: Object.keys(poids).sort().map((d) => ({ x: dayNum(d), y: poids[d] })), borderColor: "#e8789a", backgroundColor: "#e8789a", tension: 0.2, pointRadius: 3 }], { ytitle: "kg" });
  if ($("chGTens")) {
    const d = Object.keys(tens).sort(), s = (k, label, c) => ({ label, data: d.map((x) => ({ x: dayNum(x), y: tens[x][k] })), borderColor: c, backgroundColor: c, tension: 0.2, pointRadius: 3 });
    lineChart("chGTens", [s("s", "Systolique (le haut)", "#d2577d"), s("d", "Diastolique (le bas)", "#6f5bd0")], { ytitle: "mmHg", bands: [{ from: 140, to: 300, color: "rgba(220,60,60,.12)", label: "≥ 140 : à signaler", text: "#a52b3a" }] });
  }
}

Object.assign(ACT_DF, {
  async savehumeur() {
    const v = +(document.querySelector('input[name="hu"]:checked') || {}).value;
    if (!v) { toast("Choisis d'abord une humeur."); return; }
    const jour = dval("dfDate") || val("dfDate") || today(), j = { ...humeurs() };
    j[jour] = { h: v };
    if (await saveCfg(14, { jours: j })) { toast("💭 Humeur enregistrée"); render(); }
  },
});
