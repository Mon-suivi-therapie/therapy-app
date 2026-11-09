// ===== Résumé du mois + vue d'ensemble des stocks de médicaments =====

// ---------- stocks ----------
function stockInfos() {
  return Object.entries(S.meds).map(([nom, info]) => {
    const stock = parseInt(info.stock ?? 0) || 0, dose = doseActuelle(info), conso = Math.max(1, requis(info).length * dose);
    const jours = Math.floor(stock / conso), ordo = info.ordo_fin || "", jOrdo = ordo ? diffDays(ordo, today()) : null;
    return { nom, stock, jours, fin: addDays(today(), jours), conso, ordo, jOrdo };
  }).sort((a, b) => a.jours - b.jours);
}
// alertes en haut du tableau de bord (rien d'affiché si tout va bien)
function stockAlertes() {
  const l = stockInfos().flatMap((s) => {
    const o = [];
    if (s.stock === 0) o.push(["err", `🚨 <b>${esc(s.nom)}</b> : stock épuisé. Il faut racheter ce médicament tout de suite.`]);
    else if (s.jours <= 14) o.push([s.jours <= 7 ? "warn" : "info", `📦 <b>${esc(s.nom)}</b> : il reste environ <b>${s.jours} jour(s)</b> (jusqu'au ${fr(s.fin)}). Pense à renouveler.`]);
    if (s.jOrdo !== null && s.jOrdo <= 30) o.push([s.jOrdo < 0 ? "err" : "warn", s.jOrdo < 0 ? `📝 L'ordonnance de <b>${esc(s.nom)}</b> est terminée depuis le ${fr(s.ordo)} : demande-en une nouvelle.` : `📝 L'ordonnance de <b>${esc(s.nom)}</b> se termine le ${fr(s.ordo)} (dans ${s.jOrdo} jour(s)) : pense à la faire renouveler.`]);
    return o;
  });
  return l.map(([k, t]) => box(k, t)).join("");
}
function stockTable() {
  const l = stockInfos();
  if (!l.length) return `<p class="muted">Aucun médicament enregistré. Ajoute-les dans le volet 💊 Médicaments.</p>`;
  return `<div class="tw"><table><thead><tr><th>Médicament</th><th>Stock</th><th>Jours restants</th><th>Jusqu'au</th><th>Fin d'ordonnance</th></tr></thead><tbody>${l.map((s) => `<tr><td>${esc(s.nom)}</td><td>${s.stock} cp</td><td>${s.stock === 0 ? "🚨 0" : s.jours <= 7 ? "⚠️ " + s.jours : s.jours <= 14 ? "🟡 " + s.jours : "✅ " + s.jours}</td><td>${s.stock ? fr(s.fin) : "—"}</td><td>${s.ordo ? fr(s.ordo) : "—"}</td></tr>`).join("")}</tbody></table></div>`;
}

// ---------- résumé du mois ----------
S.mois = today().slice(0, 7);
const MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const moisLib = (ym) => MOIS_FR[+ym.slice(5) - 1] + " " + ym.slice(0, 4);
function moisPlus(ym, n) { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1)); return d.toISOString().slice(0, 7); }

function moisStats(ym) {
  const t = today(), debut = ym + "-01", finMois = addDays(moisPlus(ym, 1) + "-01", -1), fin = finMois < t ? finMois : t;
  const inM = (r) => r.Date >= debut && r.Date <= finMois;
  const o = { ym, jours: fin >= debut ? diffDays(fin, debut) + 1 : 0 };
  const g = rows("suivi_glycemie").filter(inM);
  const j = g.map((r) => gv(r["Glycémie à jeun"])).filter((x) => x !== null), p = g.map((r) => gv(r["Glycémie Post-Prandiale"])).filter((x) => x !== null);
  o.gJ = j.length ? avg(j) : null; o.gP = p.length ? avg(p) : null; o.nG = j.length + p.length; o.gHaut = j.filter((x) => x >= 1).length;
  const pw = rows("suivi_poids").filter(inM).map((r) => ({ d: r.Date, k: num(r["Poids (kg)"]) })).filter((r) => r.k !== null).sort((a, b) => a.d.localeCompare(b.d));
  o.pw = pw.length ? { moy: avg(pw.map((x) => x.k)), prem: pw[0].k, der: pw[pw.length - 1].k, n: pw.length } : null;
  const df = rows("suivi_douleur_fatigue").filter(inM), m = (c) => { const v = df.map((r) => num(r[c])).filter((x) => x !== null); return v.length ? avg(v) : null; };
  o.dou = m("Douleur (0-10)"); o.fat = m("Fatigue (0-10)"); o.som = m("Sommeil (h)"); o.nDf = df.length;
  // régularité des prises : jours du mois depuis le début du suivi
  const toutes = rows("historique_prises"), premier = toutes.map((r) => r.Date).sort()[0] || t, dep = premier > debut ? premier : debut;
  let attendu = 0, pris = 0;
  if (Object.keys(S.meds).length && fin >= dep) {
    const parJour = {}; toutes.forEach((r) => { if (inM(r)) (parJour[r.Date] = parJour[r.Date] || []).push(r); });
    for (let d = dep; d <= fin; d = addDays(d, 1)) {
      for (const [nom, info] of Object.entries(S.meds)) {
        const req = requis(info); if (info.start_date && info.start_date > d) continue;
        attendu += req.length;
        const txt = (parJour[d] || []).filter((r) => r["Médicament"] === nom).map((r) => r.Prise).join(" ");
        pris += req.filter((l) => txt.includes(l)).length;
      }
    }
  }
  o.prises = attendu ? { pris, attendu, taux: pris / attendu } : null;
  o.regles = regles().filter((d) => d >= debut && d <= finMois);
  const tests = rows("tests_ovulation").filter(inM);
  o.tests = tests.length; o.testsPos = tests.filter((r) => /posit|pic|haut/i.test(String(r["Résultat"] || ""))).length;
  const rdv = rows("rdv_medicaux").filter(inM); o.rdv = rdv.length; o.rdvFaits = rdv.filter((r) => r.Statut === "✅ Effectué").length;
  o.bil = rows("resultats_bilans").filter(inM).length;
  return o;
}

function renderResume() {
  const ym = S.mois, cur = moisStats(ym), prev = moisStats(moisPlus(ym, -1)), estCourant = ym >= today().slice(0, 7);
  // variation par rapport au mois d'avant ; bon = true si une baisse est une bonne nouvelle
  const vs = (a, b, n = 1, baisseBien = true, unite = "") => {
    if (a === null || b === null) return "";
    const d = r1(a - b, n); if (!d) return ` <small>(stable)</small>`;
    return ` <small>(${d > 0 ? "+" : ""}${String(d).replace(".", ",")}${unite} vs mois d'avant ${(d < 0) === baisseBien ? "👍" : "⚠️"})</small>`;
  };
  const fmt = (x, n = 1) => (x === null ? "—" : String(r1(x, n)).replace(".", ","));
  let h = `<h2>📊 Résumé du mois</h2><p class="muted">Un coup d'œil sur l'évolution de ta santé, comparée au mois d'avant.</p>
  <p style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${btn("◀ Mois précédent", "moisprec", "sec")}<b style="font-size:1.15rem;text-transform:capitalize">${moisLib(ym)}</b>${estCourant ? "" : btn("Mois suivant ▶", "moissuiv", "sec")}</p>`;

  const bul = [];
  if (cur.prises) bul.push(cur.prises.taux >= 0.9 ? ["ok", `💊 Très bien : tu as pris <b>${Math.round(cur.prises.taux * 100)} %</b> de tes prises ce mois-ci.`] : cur.prises.taux >= 0.7 ? ["info", `💊 Tu as pris <b>${Math.round(cur.prises.taux * 100)} %</b> de tes prises. Un petit rappel pourrait t'aider à ne rien oublier.`] : ["warn", `💊 Seulement <b>${Math.round(cur.prises.taux * 100)} %</b> de tes prises sont enregistrées. Oublis, ou prises non cochées ? Pense à enregistrer chaque jour.`]);
  if (cur.gJ !== null && prev.gJ !== null) { const d = cur.gJ - prev.gJ; if (Math.abs(d) >= 0.03) bul.push([d < 0 ? "ok" : "warn", `🩸 Ta glycémie à jeun moyenne ${d < 0 ? "a baissé" : "a monté"} de ${String(r1(Math.abs(d), 2)).replace(".", ",")} g/L par rapport au mois d'avant.`]); }
  if (cur.dou !== null && prev.dou !== null) { const d = cur.dou - prev.dou; if (Math.abs(d) >= 0.5) bul.push([d < 0 ? "ok" : "warn", `🧘 Ta douleur moyenne ${d < 0 ? "a diminué" : "a augmenté"} (${fmt(prev.dou)} → ${fmt(cur.dou)} sur 10).`]); }
  if (cur.fat !== null && prev.fat !== null) { const d = cur.fat - prev.fat; if (Math.abs(d) >= 0.5) bul.push([d < 0 ? "ok" : "warn", `⚡ Ta fatigue moyenne ${d < 0 ? "a diminué" : "a augmenté"} (${fmt(prev.fat)} → ${fmt(cur.fat)} sur 10).`]); }
  if (cur.pw && prev.pw) { const d = cur.pw.moy - prev.pw.moy; if (Math.abs(d) >= 0.3) bul.push(["info", `⚖️ Ton poids moyen est ${d < 0 ? "en baisse" : "en hausse"} de ${String(r1(Math.abs(d))).replace(".", ",")} kg.`]); }
  h += bul.length ? `<h3>✨ Ce qui ressort</h3>${bul.map(([k, t]) => box(k, t)).join("")}` : (cur.prises || cur.nG || cur.nDf ? "" : box("info", "Pas encore assez de données ce mois-ci. Plus tu enregistres, plus ce résumé devient utile."));

  h += `<h3>📋 Les chiffres du mois</h3><div class="metrics">
  ${cur.prises ? metric("💊 Prises respectées", Math.round(cur.prises.taux * 100) + " %" + vs(cur.prises.taux * 100, prev.prises ? prev.prises.taux * 100 : null, 0, false, " pts")) : ""}
  ${cur.gJ !== null ? metric("🩸 Glycémie à jeun (g/L)", fmt(cur.gJ, 2) + vs(cur.gJ, prev.gJ, 2)) : ""}
  ${cur.gP !== null ? metric("🍽️ Glycémie après repas (g/L)", fmt(cur.gP, 2) + vs(cur.gP, prev.gP, 2)) : ""}
  ${cur.pw ? metric("⚖️ Poids moyen (kg)", fmt(cur.pw.moy) + vs(cur.pw.moy, prev.pw ? prev.pw.moy : null)) : ""}
  ${cur.dou !== null ? metric("🧘 Douleur (0-10)", fmt(cur.dou) + vs(cur.dou, prev.dou)) : ""}
  ${cur.fat !== null ? metric("⚡ Fatigue (0-10)", fmt(cur.fat) + vs(cur.fat, prev.fat)) : ""}
  ${cur.som !== null ? metric("😴 Sommeil (h)", fmt(cur.som) + vs(cur.som, prev.som, 1, false)) : ""}
  ${cur.regles.length ? metric("🌸 Début des règles", cur.regles.map(fr2).join(", ")) : ""}
  ${cur.tests ? metric("🧪 Tests d'ovulation", cur.tests + (cur.testsPos ? ` (${cur.testsPos} positif${cur.testsPos > 1 ? "s" : ""})` : "")) : ""}
  ${cur.rdv ? metric("📅 Rendez-vous", cur.rdv + (cur.rdvFaits ? ` (${cur.rdvFaits} effectué${cur.rdvFaits > 1 ? "s" : ""})` : "")) : ""}
  ${cur.bil ? metric("🧬 Résultats de prises de sang", cur.bil) : ""}
  </div>`;
  if (cur.gHaut) h += `<p class="muted">🩸 ${cur.gHaut} mesure(s) à jeun à 1,00 g/L ou plus ce mois-ci.</p>`;
  if (cur.pw && cur.pw.n >= 2) h += `<p class="muted">⚖️ Du premier au dernier relevé du mois : ${fmt(cur.pw.prem)} → ${fmt(cur.pw.der)} kg.</p>`;

  h += `<h3>📈 Jour après jour</h3><div class="chart"><canvas id="chResG"></canvas></div><div class="chart"><canvas id="chResD"></canvas></div>`;
  h += `<h3>📦 Mes stocks de médicaments</h3>${stockTable()}<p class="muted">Tu peux indiquer la date de fin d'ordonnance dans le volet 💊 Médicaments pour être prévenue avant qu'elle se termine.</p>`;
  return h;
}

function afterResume() {
  const ym = S.mois, deb = dayNum(ym + "-01"), fin = dayNum(addDays(moisPlus(ym, 1) + "-01", -1));
  const inM = (r) => r.Date >= ym + "-01" && r.Date <= ym + "-31";
  const g = rows("suivi_glycemie").filter(inM), df = rows("suivi_douleur_fatigue").filter(inM);
  const set = (id, ds, o) => { if (!$(id)) return; if (!ds.some((d) => d.data.length)) { $(id).parentElement.innerHTML = `<p class="muted">${id === "chResG" ? "Aucune glycémie enregistrée ce mois-ci." : "Aucune douleur / fatigue enregistrée ce mois-ci."}</p>`; return; } lineChart(id, ds, o); };
  const base = (label, color, data) => ({ label, data, borderColor: color, backgroundColor: color, tension: 0.25, pointRadius: 3 });
  set("chResG", [
    base("À jeun (g/L)", "#e8789a", pts(g, (r) => dayNum(r.Date), (r) => gv(r["Glycémie à jeun"]))),
    base("Après repas (g/L)", "#a78bc9", pts(g, (r) => dayNum(r.Date), (r) => gv(r["Glycémie Post-Prandiale"]))),
  ], { ytitle: "g/L", bands: [{ from: 0, to: 1, color: "rgba(46,160,90,.10)", label: "à jeun < 1,00", text: "#25693f" }] });
  const byDay = {}; df.forEach((r) => { (byDay[r.Date] = byDay[r.Date] || []).push(r); });
  const mo = (c) => Object.entries(byDay).map(([d, a]) => { const v = a.map((r) => num(r[c])).filter((x) => x !== null); return { x: dayNum(d), y: v.length ? avg(v) : null }; }).filter((p) => p.y !== null);
  set("chResD", [base("Douleur", "#d2577d", mo("Douleur (0-10)")), base("Fatigue", "#6f5bd0", mo("Fatigue (0-10)"))], { ymin: 0, ymax: 10, ytitle: "0 à 10", vlines: regles().filter((d) => dayNum(d) >= deb && dayNum(d) <= fin).map((d) => ({ x: dayNum(d), label: "règles" })) });
}

const ACT_RESUME = {
  moisprec() { S.mois = moisPlus(S.mois, -1); render(); },
  moissuiv() { if (S.mois < today().slice(0, 7)) S.mois = moisPlus(S.mois, 1); render(); },
};
const CHG_RESUME = {};
