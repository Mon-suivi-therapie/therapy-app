// ===== Rappels dans l'agenda (.ics), suivi SOPK, préparation essai bébé / PMA, quotidien (repas, eau, activité) =====
// (le suivi SOPK s'affiche dans l'onglet Mon Suivi Féminin, parcours essai bébé et PMA)
// Configs utilisées : 18 = quotidien, 19 = SOPK, 20 = préparation, 21 = réglages agenda

// ---------- rappels dans l'agenda ----------
const ICS_DEF = { Matin: "08:00", Midi: "12:30", Soir: "19:30", Coucher: "22:30" };
const ICS_LIB = { Matin: "du matin", Midi: "de midi", Soir: "du soir", Coucher: "au coucher" };
const ICS_ICON = { Matin: "🌅", Midi: "☀️", Soir: "🌙", Coucher: "🛌" };
const icsEsc = (t) => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function icsFold(line) { // lignes de 75 octets maximum
  const enc = new TextEncoder(); let out = "", cur = "", n = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (n + b > 74) { out += cur + "\r\n "; cur = ""; n = 1; } cur += ch; n += b; }
  return out + cur;
}
function buildIcs(H, avant) {
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", start = today().replace(/-/g, "");
  const slots = {}, precis = [];
  for (const [nom, info] of Object.entries(S.meds)) {
    const txt = `${nom} (${doseActuelle(info)} cp)`, req = requis(info);
    if (info.heure_precise && req.length === 1) precis.push({ nom, h: info.heure_precise, txt });
    else req.forEach((m) => (slots[m] = slots[m] || []).push(txt));
  }
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mon suivi Therapy//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Mes prises de médicaments"];
  const ev = (uid, titre, hhmm, desc) => L.push("BEGIN:VEVENT", `UID:${uid}@mon-suivi-therapy`, `DTSTAMP:${now}`, `DTSTART:${start}T${hhmm.replace(":", "")}00`, "DURATION:PT10M", "RRULE:FREQ=DAILY", `SUMMARY:${icsEsc(titre)}`, `DESCRIPTION:${icsEsc(desc)}`, "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc(titre)}`, `TRIGGER:${avant > 0 ? "-PT" + avant + "M" : "PT0M"}`, "END:VALARM", "END:VEVENT");
  let n = 0;
  Object.entries(slots).forEach(([m, l]) => { ev("slot" + m, `${ICS_ICON[m] || "💊"} Prise ${ICS_LIB[m] || m} : ${l.join(", ")}`, H[m] || ICS_DEF[m] || "08:00", "À prendre : " + l.join(", ")); n++; });
  precis.forEach((p, i) => { ev("pre" + i, `⏰ ${p.txt}`, p.h, "Heure précise : " + p.txt); n++; });
  L.push("END:VCALENDAR");
  return { txt: L.map(icsFold).join("\r\n") + "\r\n", n };
}
function rappelsAgenda() {
  if (!Object.keys(S.meds).length) return "";
  const H = { ...ICS_DEF, ...(cfg(21).heures || {}) }, av = cfg(21).avant ?? 0;
  return `<hr>` + fold("⏰ Mes rappels dans mon agenda (téléphone et ordinateur)", `<p class="muted">Le site crée un fichier que tu importes dans ton agenda : tu reçois ensuite une alarme tous les jours, <b>même quand le site est fermé</b>.</p>
  <div class="row">${Object.keys(ICS_DEF).map((m) => field("icsH_" + m, `${ICS_ICON[m]} ${m}`, "time", H[m])).join("")}${field("icsAvant", "Me prévenir … minutes avant", "number", av, 'min="0" max="120"')}</div>
  ${btn("📥 Télécharger mes rappels (.ics)", "icsdl")}
  <details><summary>Comment l'importer ?</summary><ul>
  <li><b>Google Agenda (ordinateur)</b> : calendar.google.com, ⚙️ Paramètres, « Importer et exporter », puis choisis le fichier. Crée de préférence un <b>nouvel agenda</b> « Mes prises » pour pouvoir le supprimer facilement plus tard.</li>
  <li><b>iPhone</b> : ouvre le fichier téléchargé (app Fichiers ou Mail), touche « Ajouter tout », et choisis un nouveau calendrier.</li>
  <li><b>Windows / Outlook</b> : double-clique sur le fichier.</li></ul>
  <p class="muted">Si tu changes un médicament ou un horaire, supprime l'ancien agenda « Mes prises » puis réimporte un nouveau fichier. Vérifie que les notifications de ton appli Agenda sont activées.</p></details>`);
}
Object.assign(ACT_DASH, {
  async icsdl() {
    const H = {}; Object.keys(ICS_DEF).forEach((m) => (H[m] = val("icsH_" + m) || ICS_DEF[m]));
    const avant = Math.max(0, Math.min(120, parseInt(val("icsAvant")) || 0));
    const { txt, n } = buildIcs(H, avant);
    if (!n) { toast("Aucune prise à exporter."); return; }
    await saveCfg(21, { heures: H, avant });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar;charset=utf-8" })); a.download = "rappels-prises.ics";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast("📥 " + n + " rappel(s) quotidien(s) téléchargé(s)");
  },
});

// ---------- suivi SOPK ----------
const sopk = () => cfg(19).jours || {};
const SO_ECH = [["acne", "Acné", "soA", "o1s"], ["poils", "Pilosité (visage, ventre, menton…)", "soP", "o2s"], ["cheveux", "Chute de cheveux", "soC", "o3s"]];
const SO_SYM = ["Douleurs d'ovulation", "Fortes envies de sucre", "Coup de barre après les repas", "Peau grasse", "Humeur très changeante", "Règles très abondantes ou très douloureuses", "Gonflement / ballonnements"];
function glycJeun(jusque, jours = 7) {
  const v = rows("suivi_glycemie").filter((r) => r.Date <= jusque && r.Date > addDays(jusque, -jours)).map((r) => gv(r["Glycémie à jeun"])).filter((x) => x !== null);
  return v.length ? avg(v) : null;
}
function renderSopk() {
  const J = sopk(), dates = Object.keys(J).sort(), ed = S.soEdit && J[S.soEdit] ? J[S.soEdit] : null, t = today(), rg = regles();
  let h = `<hr><h3>🌿 Mon suivi SOPK</h3><p class="muted">Un petit point par semaine suffit. Le site le relie à tes cycles et à ta glycémie pour que tu voies ce qui évolue.</p><h4>🔁 Mes cycles</h4>`;
  const cyc = []; for (let i = 1; i < rg.length; i++) cyc.push(diffDays(rg[i], rg[i - 1]));
  if (cyc.length) {
    const dern = cyc.slice(-6), longs = dern.filter((x) => x > 35).length, cm = cycleMoyen();
    h += `<div class="metrics">${metric("Cycle moyen", cm.val + " j")}${metric("Le plus long (6 derniers)", Math.max(...dern) + " j")}${metric("Cycles de plus de 35 j", longs + " sur " + dern.length)}</div>`;
    h += box("info", "Des cycles de plus de 35 jours ou irréguliers sont fréquents avec un SOPK. Ça vaut la peine d'en parler à ton médecin ou à ton gynécologue : c'est un bon repère aussi pour un projet bébé.");
  } else h += `<p class="muted">Note le début de tes règles dans l'onglet « Mon Suivi Féminin » : au moins deux, pour voir la durée de tes cycles.</p>`;
  if (rg.length) { const d = diffDays(t, rg[rg.length - 1]); if (d > 60) h += box("warn", `🌸 Tes dernières règles datent de ${d} jours. Sans règles depuis plus de 2 à 3 mois, consulte (et fais un test de grossesse si c'est possible).`); }

  h += `<h4>📝 Mon point de la semaine</h4>${ed ? box("info", "✏️ Tu modifies le point du " + fr(S.soEdit) + ". " + btn("Annuler", "socancel", "sec")) : ""}
  ${field("soDate", "🗓️ Jour", "date", S.soEdit || t, `max="${t}"`)}
  <div class="row"><div>${SO_ECH.map(([k, l, id, o]) => `<label class="f">${l} : <b id="${o}">${ed ? ed[k] ?? 0 : 0}</b>/10</label><input id="${id}" type="range" min="0" max="10" value="${ed ? ed[k] ?? 0 : 0}">`).join("")}</div>
  <div>${field("soT", "Tour de taille (cm, facultatif)", "number", ed ? ed.taille ?? "" : "", 'step="0.5" min="0"')}<p><b>Cette semaine</b></p><div class="chips">${SO_SYM.map((s) => `<label class="ck"><input type="checkbox" name="so" value="${esc(s)}" ${ed && (ed.sym || []).includes(s) ? "checked" : ""}> ${esc(s)}</label>`).join("")}</div></div></div>
  ${field("soN", "Note (facultatif)", "text", ed ? ed.note || "" : "")}${btn("💾 Enregistrer mon point", "savesopk")}`;

  if (dates.length) {
    const sc = (k, l) => { const v = dates.map((d) => J[d][k]).filter((x) => x !== undefined && x !== null && x !== ""); return v; };
    const tend = SO_ECH.map(([k, l]) => { const v = dates.map((d) => num(J[d][k])).filter((x) => x !== null); if (v.length < 4) return ""; const a = avg(v.slice(-4)), b = v.length >= 8 ? avg(v.slice(-8, -4)) : null; return b === null ? "" : `<li>${l} : ${r1(b)} → <b>${r1(a)}</b> ${a < b - 0.4 ? "👍 en baisse" : a > b + 0.4 ? "⚠️ en hausse" : "stable"}</li>`; }).filter(Boolean);
    if (tend.length) h += `<h4>🔎 Ce qui évolue (4 derniers points comparés aux 4 d'avant)</h4><ul>${tend.join("")}</ul>`;
    h += `<div class="chart"><canvas id="chSo"></canvas></div>`;
    if (dates.some((d) => num(J[d].taille) !== null)) h += `<div class="chart" style="height:220px"><canvas id="chSoT"></canvas></div>`;
    h += fold(`📋 Mes points (${dates.length})`, `<div class="tw"><table><thead><tr><th>Date</th><th>Acné</th><th>Pilosité</th><th>Cheveux</th><th>Taille</th><th>Glyc. à jeun (7 j)</th><th>Cette semaine</th><th>Note</th><th></th></tr></thead><tbody>${[...dates].reverse().map((d) => { const x = J[d], g = glycJeun(d); return `<tr><td>${fr(d)}</td><td>${x.acne ?? ""}</td><td>${x.poils ?? ""}</td><td>${x.cheveux ?? ""}</td><td>${x.taille ?? ""}</td><td>${g !== null ? r1(g, 2) : ""}</td><td>${esc((x.sym || []).join(" · "))}</td><td>${esc(x.note || "")}</td><td style="white-space:nowrap"><button class="b" data-act="soedit" data-d="${d}" title="Modifier">✏️</button><button class="b del" data-act="sodel" data-d="${d}" title="Supprimer">🗑️</button></td></tr>`; }).join("")}</tbody></table></div>`);
  }
  return h + `<p class="muted">Ces repères ne remplacent pas un avis médical. Montre cette page à ton médecin : elle l'aide à voir l'évolution.</p>`;
}
function afterSopk() {
  SO_ECH.forEach(([, , id, o]) => $(id) && $(id).addEventListener("input", () => ($(o).textContent = val(id))));
  const J = sopk(), dates = Object.keys(J).sort();
  if ($("chSo")) lineChart("chSo", [["acne", "Acné", "#d2577d"], ["poils", "Pilosité", "#6f5bd0"], ["cheveux", "Chute de cheveux", "#e0a030"]].map(([k, l, c]) => ({ label: l, data: pts(dates, (d) => dayNum(d), (d) => num(J[d][k])), borderColor: c, backgroundColor: c, tension: 0.2, pointRadius: 3 })), { ymin: 0, ymax: 10, ytitle: "0 à 10", vlines: regles().filter((d) => dates.length && dayNum(d) >= dayNum(dates[0]) - 30).map((d) => ({ x: dayNum(d), label: "règles" })) });
  if ($("chSoT")) lineChart("chSoT", [{ label: "Tour de taille (cm)", data: pts(dates, (d) => dayNum(d), (d) => num(J[d].taille)), borderColor: "#2ca02c", backgroundColor: "#2ca02c", tension: 0.2, pointRadius: 3 }], { ytitle: "cm" });
}
Object.assign(ACT_DF, {
  async savesopk() {
    const d = val("soDate") || today(), j = { ...sopk() };
    if (S.soEdit && S.soEdit !== d) delete j[S.soEdit];
    j[d] = { acne: +val("soA"), poils: +val("soP"), cheveux: +val("soC"), taille: num(val("soT")), sym: picked("so"), note: val("soN") };
    if (await saveCfg(19, { jours: j })) { S.soEdit = null; toast("🎉 Point enregistré !"); render(); }
  },
  soedit(el) { DIRTY.clear(); S.soEdit = el.dataset.d; render(); const f = $("soDate"); if (f) f.scrollIntoView({ block: "center" }); },
  socancel() { DIRTY.clear(); S.soEdit = null; render(); },
  async sodel(el) { if (!confirm("Supprimer le point du " + fr(el.dataset.d) + " ?")) return; const j = { ...sopk() }; delete j[el.dataset.d]; if (await saveCfg(19, { jours: j })) { toast("Point supprimé"); render(); } },
});

// ---------- préparation essai bébé / PMA ----------
const PB_DONE = () => cfg(20).done || {};
const PB = [
  ["🌸 Préconception : avant et pendant les essais", "Repères habituels : valide chaque point avec ton médecin ou ta sage-femme.", [
    ["acide", "💊 Acide folique (vitamine B9) : souvent conseillé avant la conception et jusqu'à 12 SA. La dose se décide avec ton médecin (elle peut être plus forte avec un SOPK ou un pré-diabète)."],
    ["bilan", "🩸 Bilan sanguin : groupe sanguin, rubéole, toxoplasmose, TSH, glycémie / HbA1c, vitamine D, ferritine (selon ton médecin)."],
    ["vaccins", "💉 Vaccins à jour (rubéole-rougeole-oreillons, coqueluche, varicelle selon ton statut, grippe)."],
    ["frottis", "🩺 Frottis du col de l'utérus et dentiste à jour."],
    ["medocs", "💊 Faire le point sur tes médicaments avec ton médecin avant une grossesse (certains se poursuivent, d'autres se changent). N'arrête rien toute seule."],
    ["mode", "🚭 Pas de tabac, pas d'alcool, caféine limitée."],
    ["poids", "🥗 Alimentation équilibrée et activité régulière : avec un SOPK, ça aide l'ovulation et la glycémie."],
    ["fenetre", "📅 Repérer ta fenêtre fertile (tests d'ovulation, température) : onglet Mon Suivi Féminin."],
  ]],
  ["📂 À préparer pour mon 2e rendez-vous PMA (examens faits)", "Le 1er rendez-vous a eu lieu : le 2e sert à lire les résultats des examens et à choisir la suite.", [
    ["d_resultats", "🧪 Tous les résultats des examens faits (bilans sanguins, échographie, hystérosalpingographie si faite) : ceux du site sont dans « Mes examens PMA » et « Mes résultats de prises de sang »."],
    ["d_courrier", "📄 Le compte-rendu et les ordonnances du 1er rendez-vous."],
    ["d_cycles", "📊 Mes cycles : dates de règles, tests d'ovulation, températures (la Fiche pour mes médecins du site te les résume)."],
    ["d_trait", "💊 La liste de mes traitements actuels et mes antécédents."],
    ["d_admin", "🪪 Carte vitale, pièce d'identité et les documents demandés par le centre."],
    ["d_comptes", "📝 Mes questions écrites (bouton ci-dessous)."],
  ]],
  ["🧔 Pour mon partenaire", "À voir avec son médecin.", [
    ["p_sperme", "🧪 Résultat du spermogramme (avec spermocytogramme) de ton partenaire, à apporter."],
    ["p_bilan", "🩸 Bilan sanguin et sérologies demandés par le centre."],
    ["p_rdv", "📅 Un rendez-vous ensemble, si possible : les deux sont concernés."],
  ]],
];
const PB_QUESTIONS = [
  "Que montrent mes résultats d'examens, un par un ? Y a-t-il quelque chose d'anormal ?",
  "Faut-il refaire ou ajouter un examen avant de choisir la suite ?",
  "Quelle étape proposez-vous maintenant pour moi (stimulation simple, insémination, FIV) et pourquoi ?",
  "Mon SOPK / mon pré-diabète change-t-il le traitement ou sa surveillance (risque d'hyperstimulation) ?",
  "Dois-je continuer, adapter ou arrêter certains de mes médicaments (metformine, etc.) ?",
  "Combien de tentatives sont prises en charge, et quel est le calendrier habituel ?",
  "Quels délais et quels coûts restent à ma charge ?",
  "Quels signes doivent me faire vous appeler en urgence pendant le traitement ?",
  "Que puis-je faire de mon côté (alimentation, sport, poids, compléments) pour augmenter mes chances ?",
];
function pmaOuJenSuis() {
  const t = today(), ex = rows("examens_pma"), faits = ex.filter((r) => ["Fait", "Résultat reçu"].includes(r.Statut)), reste = ex.filter((r) => !["Fait", "Résultat reçu"].includes(r.Statut));
  const premier = cfg(20).premier || {}, nextRdv = rows("rdv_medicaux").filter((r) => r.Date >= t && r.Statut !== "❌ Annulé" && r.Statut !== "✅ Effectué").sort((a, b) => a.Date.localeCompare(b.Date))[0];
  let h = `<h4>📌 Où j'en suis dans mon parcours PMA</h4><div class="metrics">${metric("1er rendez-vous", "✅ fait" + (premier.date ? " le " + fr2(premier.date) : ""))}${metric("Examens faits", faits.length + (ex.length ? " / " + ex.length : ""))}${metric("2e rendez-vous", nextRdv ? fr(nextRdv.Date) + " <small>(dans " + diffDays(nextRdv.Date, t) + " j)</small>" : "à noter")}</div>`;
  if (!nextRdv) h += `<p class="muted">Ajoute la date du 2e rendez-vous dans l'onglet « Rendez-vous Médicaux » : elle apparaîtra ici.</p>`;
  if (reste.length) h += box("warn", "🧪 Pas encore faits ou sans résultat : <b>" + esc(reste.map((r) => r.Examen).join(" ; ")) + "</b>. Mets le statut à jour dans « Mes examens PMA » quand c'est fait.");
  else if (ex.length) h += box("ok", "✅ Tous tes examens sont notés comme faits. Pense à apporter les résultats.");
  else h += `<p class="muted">Aucun examen noté. Ajoute-les dans « Mes examens PMA » pour suivre ce qui est fait.</p>`;
  h += fold("✏️ Mon 1er rendez-vous : ce qui a été dit ou décidé", `${dateField("pmaR1Date", "🗓️ Date du 1er rendez-vous", premier.date || t, t)}${area("pmaR1Cr", "Compte-rendu (examens prescrits, remarques du médecin, consignes)", premier.cr || "", "Ex : bilan hormonal au 3e jour du cycle, spermogramme pour mon partenaire, hystérosalpingographie à prévoir...")}${btn("💾 Enregistrer", "pmar1")}`, !premier.date && !premier.cr);
  h += `<p>${btn("📋 Copier un résumé pour mon rendez-vous", "pmaresume", "sec")}</p>`;
  return h;
}
function pmaResumeTexte() {
  const t = today(), ex = rows("examens_pma").sort((a, b) => a.Date.localeCompare(b.Date)), bil = rows("resultats_bilans"), premier = cfg(20).premier || {};
  const dern = [...new Set(bil.map((r) => String(r.Examen)))].map((n) => bil.filter((r) => String(r.Examen) === n).sort((a, b) => a.Date.localeCompare(b.Date)).pop()).sort((a, b) => b.Date.localeCompare(a.Date)).slice(0, 12);
  const q = rows("questions_medecin").filter((r) => r["Posée"] !== "Oui").map((r) => r.Question), rg = regles(), cm = cycleMoyen();
  return ["RÉSUMÉ POUR MON RENDEZ-VOUS PMA - " + fr(t), "",
    premier.date ? "1er rendez-vous : " + fr(premier.date) + (premier.cr ? "\n" + premier.cr : "") : "", "",
    "EXAMENS :", ...(ex.length ? ex.map((r) => `• ${fr(r.Date)} ${r.Examen} : ${r.Statut || ""}${r["Résultat"] ? " - " + r["Résultat"] : ""}`) : ["• (aucun noté)"]), "",
    "DERNIERS RÉSULTATS DE PRISE DE SANG :", ...(dern.length ? dern.map((r) => `• ${r.Examen} : ${r.Valeur ?? ""} ${r["Unité"] || ""} (${fr(r.Date)})`) : ["• (aucun noté)"]), "",
    "CYCLES :", rg.length ? `• Dernières règles : ${fr(rg[rg.length - 1])}${cm.n ? ", cycle moyen " + cm.val + " jours" : ""}` : "• (non renseigné)", "",
    "TRAITEMENTS :", ...(Object.keys(S.meds).length ? Object.entries(S.meds).map(([n, i]) => `• ${n} : ${requis(i).join("/")}, ${doseActuelle(i)} cp`) : ["• (aucun)"]), "",
    "MES QUESTIONS :", ...(q.length ? q.map((x) => "• " + x) : ["• (aucune en attente)"])].join("\n").replace(/\n{3,}/g, "\n\n");
}
function prepaBebe() {
  const D = PB_DONE(), tous = PB.flatMap((s) => s[2]), faits = tous.filter(([k]) => D[k]).length;
  let h = `<hr><h3>🍼 Ma préparation : essai bébé et PMA</h3>${S.set.parcours === PARCOURS[2] ? pmaOuJenSuis() : ""}${bar(faits / tous.length)}<p class="muted">${faits} point(s) sur ${tous.length} cochés. Coche au fur et à mesure.</p>`;
  h += fold("🩺 Quand consulter pour un projet bébé ?", `<ul><li>En général : après <b>12 mois</b> d'essais sans grossesse, ou <b>6 mois</b> si tu as plus de 35 ans.</li><li><b>Plus tôt</b> si tes cycles sont très irréguliers ou absents (fréquent avec un SOPK), si tu as des douleurs importantes, une endométriose connue, ou un problème connu chez ton partenaire.</li><li>Tu peux aussi consulter <b>avant même d'essayer</b> pour faire le point : c'est utile avec un SOPK.</li></ul><p class="muted">Ce sont des repères généraux : ton médecin ou ton gynécologue te dira ce qui s'applique à toi.</p>`);
  PB.forEach(([titre, sous, L]) => {
    h += fold(`${titre} (${L.filter(([k]) => D[k]).length}/${L.length})`, (sous ? `<p class="muted">${esc(sous)}</p>` : "") + L.map(([k, tx]) => `<label class="ck"><input type="checkbox" data-act="pbtoggle" data-k="${k}" ${D[k] ? "checked" : ""}> <span>${esc(tx)}</span></label>`).join(""));
  });
  h += fold("❓ Questions à poser à l'équipe PMA", `<ul>${PB_QUESTIONS.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>${btn("➕ Ajouter ces questions à mes questions pour le médecin", "pbquestions", "sec")}<p class="muted">Elles apparaîtront dans « Mes questions pour le médecin » et dans la Fiche pour mes médecins.</p>`);
  return h;
}
Object.assign(ACT_CYCLE, {
  async pbtoggle(el) { const k = el.dataset.k, D = { ...PB_DONE() }; if (D[k]) delete D[k]; else D[k] = true; if (await saveCfg(20, { ...cfg(20), done: D })) render(); },
  async pmar1() { if (await saveCfg(20, { ...cfg(20), premier: { date: dval("pmaR1Date") || today(), cr: val("pmaR1Cr") } })) { toast("🎉 Enregistré !"); render(); } },
  pmaresume() { navigator.clipboard.writeText(pmaResumeTexte()).then(() => toast("📋 Résumé copié : colle-le dans un message ou un document")); },
  async pbquestions() {
    const ex = new Set(rows("questions_medecin").map((r) => r.Question)), add = PB_QUESTIONS.filter((q) => !ex.has(q)).map((q) => ({ Date: today(), Question: q, Pour: "Équipe PMA / gynécologue", "Posée": "Non", "Réponse": "" }));
    if (!add.length) { toast("Ces questions sont déjà dans ta liste."); return; }
    const { error } = await sb.from("questions_medecin").insert(add);
    if (error) { toast("Erreur : " + error.message); return; }
    await loadTables(["questions_medecin"]); toast("➕ " + add.length + " questions ajoutées"); render();
  },
});

// ---------- quotidien : repas, eau, activité ----------
const QJ = () => cfg(18).jours || {};
const Q_REPAS = ["🥦 Légumes en premier", "🍗 Protéines à chaque repas", "🌾 Féculents complets", "🥤 Boisson sucrée", "🍪 Grignotage sucré", "⏭️ Repas sauté"];
const Q_ACT = ["Aucune", "Marche", "Sport", "Ménage / jardin", "Autre"];
function quotidienBlock() {
  const t = today(), d = S.qDate && S.qDate <= t ? S.qDate : t, J = QJ(), x = J[d] || null, dates = Object.keys(J).sort().reverse();
  let h = `<h3>🍽️ Mon quotidien (repas, eau, activité, pas)</h3><p class="muted">Quelques clics par jour, juste ce qui t'est possible. Le site les compare à ta glycémie pour voir ce qui joue.</p>
  ${field("qDate", "🗓️ Jour", "date", d, `max="${t}"`)}
  <div class="chips">${Q_REPAS.map((r) => `<label class="ck"><input type="checkbox" name="qr" value="${esc(r)}" ${x && (x.repas || []).includes(r) ? "checked" : ""}> ${r}</label>`).join("")}</div>
  <div class="row">${field("qEau", "💧 Verres d'eau", "number", x ? x.eau ?? "" : "", 'min="0" max="30"')}${sel("qAct", "🏃 Activité", Q_ACT, x ? x.act || Q_ACT[0] : Q_ACT[0])}${field("qMin", "⏱️ Minutes d'activité", "number", x ? x.min ?? "" : "", 'min="0" max="600"')}${field("qPas", "👣 Nombre de pas", "number", x ? x.pas ?? "" : "", 'min="0" max="100000" inputmode="numeric"')}</div>
  ${btn("💾 Enregistrer ce jour", "saveq")}`;
  // lien avec la glycémie
  const post = (date) => { const v = rows("suivi_glycemie").filter((r) => r.Date === date).map((r) => gv(r["Glycémie Post-Prandiale"])).filter((z) => z !== null); return v.length ? avg(v) : null; };
  const cmp = (titre, f) => { const a = [], b = []; dates.forEach((dt) => { const p = post(dt); if (p === null) return; (f(J[dt]) ? a : b).push(p); }); return a.length >= 3 && b.length >= 3 ? `<li>${titre} : <b>${r1(avg(a), 2)}</b> g/L contre <b>${r1(avg(b), 2)}</b> g/L les autres jours (${a.length} et ${b.length} jours).</li>` : ""; };
  const L = [cmp("Jours avec boisson sucrée ou grignotage sucré, glycémie après repas", (z) => (z.repas || []).some((r) => /sucré/.test(r))), cmp("Jours avec 30 min d'activité ou plus", (z) => (num(z.min) || 0) >= 30), cmp("Jours avec 5 000 pas ou plus", (z) => (num(z.pas) || 0) >= 5000), cmp("Jours où tu as mangé les légumes en premier", (z) => (z.repas || []).some((r) => /Légumes/.test(r)))].filter(Boolean);
  h += dates.length ? (L.length ? `<h4>🔎 Ce que montrent tes jours</h4><ul>${L.join("")}</ul><p class="muted">Ce sont des tendances sur peu de jours, pas des preuves.</p>` : `<p class="muted">Dès que tu auras noté au moins 3 jours de chaque sorte avec une glycémie après repas, le site les comparera ici.</p>`) : "";
  if (dates.length) h += fold(`📋 Mes derniers jours (${dates.length})`, `<div class="tw"><table><thead><tr><th>Date</th><th>Repas</th><th>Eau</th><th>Activité</th><th>Pas</th><th></th></tr></thead><tbody>${dates.slice(0, 14).map((dt) => `<tr><td>${fr(dt)}</td><td>${esc((J[dt].repas || []).join(" · "))}</td><td>${J[dt].eau ?? ""}</td><td>${esc((J[dt].act || "") + (J[dt].min ? " " + J[dt].min + " min" : ""))}</td><td>${J[dt].pas ?? ""}</td><td><button class="b del" data-act="delq" data-d="${dt}" title="Supprimer">🗑️</button></td></tr>`).join("")}</tbody></table></div>`);
  return h + "<hr>";
}
Object.assign(ACT_HEALTH, {
  async saveq() {
    const d = val("qDate") || today(), j = { ...QJ() };
    j[d] = { repas: picked("qr"), eau: num(val("qEau")), act: val("qAct"), min: num(val("qMin")), pas: num(val("qPas")) };
    if (await saveCfg(18, { jours: j })) { S.qDate = d; toast("🎉 Jour enregistré !"); render(); }
  },
  async delq(el) { if (!confirm("Supprimer ce jour ?")) return; const j = { ...QJ() }; delete j[el.dataset.d]; if (await saveCfg(18, { jours: j })) render(); },
});
Object.assign(CHG_HEALTH, { qDate(el) { S.qDate = !el.value || el.value > today() ? today() : el.value; render(); } });
