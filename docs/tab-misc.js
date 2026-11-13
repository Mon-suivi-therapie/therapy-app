// ===== Fiche médecins, Historique & corrections, TSA/TDAH/SPT (à venir) =====
function lignesFiche(vals) {
  const une = (t) => String(t || "").split("\n").map((x) => x.trim()).filter(Boolean).join(" / ");
  const t = today(), fiche = [], infos = [];
  const dxs = dxSaved(); if (dxs.length) infos.push("Pathologies suivies : " + dxs.join(", "));
  if (vals.diag.trim()) infos.push("Diagnostics et antécédents : " + une(vals.diag));
  if (vals.allerg.trim()) infos.push("Allergies / intolérances : " + une(vals.allerg));
  if (vals.besoins.trim()) infos.push("Mes besoins pour la consultation : " + une(vals.besoins));
  if (vals.contact.trim()) infos.push("Personne de confiance : " + une(vals.contact));
  if (infos.length) fiche.push(["👤 À savoir en premier", infos]);

  fiche.push(["💊 Traitements", Object.entries(S.meds).map(([n, i]) => `${n} : ${requis(i).join("/")}${i.heure_precise ? " (à " + i.heure_precise + ")" : ""}, ${doseActuelle(i)} cp`).concat([]).filter(Boolean)]);
  if (!fiche[fiche.length - 1][1].length) fiche[fiche.length - 1][1] = ["Aucun traitement enregistré"];

  const lg = [], g = rows("suivi_glycemie").filter((r) => r.Date >= addDays(t, -14));
  const j = g.map((r) => gv(r["Glycémie à jeun"])).filter((x) => x !== null), p = g.map((r) => gv(r["Glycémie Post-Prandiale"])).filter((x) => x !== null), mg = [];
  if (j.length) mg.push(`à jeun ${r1(avg(j), 2)} (${j.length} mesures)`);
  if (p.length) mg.push(`après repas ${r1(avg(p), 2)} (${p.length} mesures)`);
  if (mg.length) lg.push("Glycémie moyenne sur 14 jours : " + mg.join(", ") + " g/L");
  const b = rows("resultats_bilans");
  if (b.length) {
    const der = [...new Set(b.map((r) => String(r.Examen)))].map((ex) => { const l = b.filter((r) => String(r.Examen) === ex).sort((x, y) => x.Date.localeCompare(y.Date)).pop(); return [l.Date, `${ex} ${l.Valeur ?? ""}${l["Unité"] ? " " + l["Unité"] : ""}`]; }).sort().reverse().slice(0, 8);
    lg.push("Dernières prises de sang : " + der.map((x) => `${x[1]} (${fr2(x[0])})`).join(" ; "));
  }
  fiche.push(["🩸 Glycémie et bilans", lg.length ? lg : ["Pas de donnée récente"]]);

  const lp = [], pp = rows("suivi_poids").map((r) => ({ d: r.Date, k: num(r["Poids (kg)"]) })).filter((r) => r.k !== null).sort((a, c) => a.d.localeCompare(c.d));
  if (pp.length) {
    const act = pp[pp.length - 1], rec = pp.filter((r) => r.d >= addDays(t, -28)).map((r) => r.k);
    let s = `Poids : ${r1(act.k)} kg (pesée du ${fr2(act.d)})`;
    if (rec.length >= 2) s += `, moyenne 4 semaines ${r1(avg(rec))} kg`;
    const anc = pp.filter((r) => r.d <= addDays(t, -28));
    if (anc.length) { const v = act.k - anc[anc.length - 1].k; s += `, variation 4 semaines ${v >= 0 ? "+" : ""}${r1(v)} kg`; }
    lp.push(s);
  }
  fiche.push(["⚖️ Poids", lp.length ? lp : ["Pas de pesée enregistrée"]]);

  const lc = [], rg = regles();
  if (rg.length) { let s = "Dernières règles : " + fr(rg[rg.length - 1]); const cm = cycleMoyen(); if (cm.n) s += `, cycle moyen ${cm.val} jours`; lc.push(s); }
  fiche.push(["🌸 Cycle", lc.length ? lc : ["Pas de donnée de cycle"]]);

  const ld = [], d = rows("suivi_douleur_fatigue").filter((r) => r.Date >= addDays(t, -14)), md = [];
  [["douleur", "Douleur (0-10)"], ["fatigue", "Fatigue (0-10)"], ["sommeil h", "Sommeil (h)"]].forEach(([l, c]) => { const v = d.map((r) => num(r[c])).filter((x) => x !== null); if (v.length) md.push(`${l} ${r1(avg(v))}`); });
  if (md.length) ld.push("Moyenne 14 jours : " + md.join(", "));
  fiche.push(["🧘 Douleur, fatigue, sommeil", ld.length ? ld : ["Pas de donnée récente"]]);

  [["TSA", "🧩 TSA", 6], ["TDAH", "⚡ TDAH", 9], ["SPT", "🌿 SPT", 10]].forEach(([, titre, id]) => {
    const pl = cfg(id), ln = [];
    [["Déclencheurs", "declencheurs"], ["Ce qui m'aide", "aide"], ["Pour les soignants", "soignants"]].forEach(([l, k]) => { if (String(pl[k] || "").trim()) ln.push(l + " : " + une(pl[k])); });
    if (ln.length) fiche.push([titre, ln]);
  });

  const tt = tnTous();
  if (tt.length) {
    const last = tt[tt.length - 1], r14 = tt.filter((r) => r.date >= addDays(t, -14)), ln = [`Dernière tension : ${last.s / 10}/${last.d / 10} (${fr(last.date)}${last.heure ? " à " + last.heure : ""}${last.moment ? ", " + last.moment.toLowerCase() : ""})`];
    if (r14.length) ln.push(`Sur 14 jours : ${r14.length} mesure(s), moyenne ${r1(avg(r14.map((r) => r.s)) / 10)}/${r1(avg(r14.map((r) => r.d)) / 10)}, maximum ${Math.max(...r14.map((r) => r.s)) / 10}/${Math.max(...r14.map((r) => r.d)) / 10}${r14.filter((r) => r.s >= 140 || r.d >= 90).length ? `, dont ${r14.filter((r) => r.s >= 140 || r.d >= 90).length} à 14/9 ou plus` : ""}`);
    fiche.push(["🩺 Tension", ln]);
  }

  const sy = syFicheLignes(); if (sy.length) fiche.push(["🤧 Symptômes (30 derniers jours)", sy]);
  const apn = ppcFicheLignes(); if (apn.length) fiche.push(["😴 Appareil pour l'apnée du sommeil", apn]);
  const ep = epFicheLignes(); if (ep.length) fiche.push(["🩹 Crises et épisodes (30 derniers jours)", ep]);

  const lr = rows("rdv_medicaux").filter((r) => r.Date >= t && r.Statut !== "✅ Effectué").sort((a, c) => a.Date.localeCompare(c.Date)).slice(0, 5).map((r) => `${fr2(r.Date)} : ${r["Médecin / Spécialité"] || ""}`);
  const ap = rows("rdv_a_prendre").filter((r) => r.Statut !== "Fait").map((r) => r["Spécialité"]);
  if (ap.length) lr.push("À prendre : " + ap.slice(0, 6).join(", "));
  fiche.push(["📅 Rendez-vous", lr.length ? lr : ["Aucun rendez-vous à venir"]]);

  const ex = rows("examens_pma").sort((a, c) => c.Date.localeCompare(a.Date)).slice(0, 4).map((r) => `${r.Date} : ${r.Examen} (${r.Statut || ""})`);
  if (ex.length) fiche.push(["🧬 Examens PMA (4 derniers)", ex]);

  const rx = exFicheLignes(); if (rx.length) fiche.push(["🧬 Résultats d'examens PMA (derniers)", rx]);
  const q = qrEnAttente().map((r) => (r.Pour ? "[" + r.Pour + "] " : "") + r.Question);
  fiche.push(["❓ Questions à poser", q.length ? q : ["Aucune question en attente"]]);
  return fiche;
}

function renderFiche() {
  const c = cfg(4);
  const v = { diag: c.diagnostics || "", allerg: c.allergies || "", besoins: c.besoins || "", contact: c.contact || "" };
  const fiche = lignesFiche(v);
  S.ficheTxt = "FICHE POUR MES MÉDECINS - éditée le " + fr(today()) + "\n" + fiche.map(([t, l]) => "\n" + t + "\n" + l.map((x) => "• " + x).join("\n")).join("\n");
  return `<div id="ficheWrap"><div class="onlyprint"><h2>Fiche pour mes médecins</h2><p>Éditée le ${fr(today())}</p></div><h2 class="noprint">📄 Fiche pour mes médecins</h2><p class="muted noprint">Un résumé à montrer ou à imprimer avant un rendez-vous. Remplis une fois les 4 champs, le reste se met à jour tout seul.</p>
  <div class="noprint">${fold("✏️ Mes informations (à remplir une fois)", `${area("fDiag", "🩺 Mes diagnostics et antécédents", v.diag, "Écris ici ce que tu veux que tes médecins voient en premier.")}
  ${field("fAllerg", "⚠️ Allergies / intolérances", "text", v.allerg)}
  ${area("fBesoins", "🗣️ Mes besoins pour les consultations", v.besoins, "Ex : m'expliquer chaque geste avant l'examen, me laisser des pauses, me donner les consignes par écrit.")}
  ${field("fContact", "👤 Personne de confiance / accompagnant", "text", v.contact)}
  ${btn("💾 Enregistrer ces informations", "savefiche")}`, !(v.diag || v.allerg || v.besoins || v.contact))}</div>
  ${fold("📋 Mon résumé", `<div id="ficheOut">${fiche.map(([t, l]) => fold(esc(t), l.map((x) => "<div>• " + esc(x) + "</div>").join(""), true)).join("")}</div>
  <p>${btn("🖨️ Imprimer / enregistrer en PDF", "print")}${btn("📋 Copier le texte", "copyfiche", "sec")}${btn("📂 Tout déplier", "fold", "sec", 'data-o="1"')}${btn("📁 Tout replier", "fold", "sec", 'data-o="0"')}</p><p class="muted">Édition du ${fr(today())}.</p>`, true)}</div>`;
}

const HIST_SECTIONS = [
  ["historique_prises", "Mon journal de bord des prises du jour", {}],
  ["cycle_temperature", "Mon historique des températures", {}],
  ["suivi_glycemie", "Mon historique de glycémie", {}],
  ["suivi_poids", "Mon historique de poids", {}],
  ["rdv_medicaux", "Mes rendez-vous (compte-rendu inclus)", { choix: { Statut: ["À venir", "✅ Effectué", "❌ Annulé"] } }],
  ["tests_ovulation", "Mes tests d'ovulation", { hide: ["Photo"] }],
  ["suivi_douleur_fatigue", "Mes douleur / fatigue / sommeil", {}],
  ["suivi_neuro", "Mes check-ins TDAH · TSA · SPT", {}],
  ["resultats_bilans", "Mes résultats de prises de sang", {}],
  ["suivi_pma", "Mon protocole PMA", {}],
  ["questions_medecin", "Mes questions pour le médecin (réponses incluses)", { choix: { "Posée": ["Non", "Oui"] } }],
  ["examens_pma", "Mes examens PMA", { choix: { Statut: ["À prendre", "Rendez-vous pris", "Fait", "Résultat reçu"] } }],
];
function renderHisto() {
  return `<h2>📜 Historique Général Cloud</h2><p class="muted">Clique sur un titre pour déplier ou replier chaque historique.</p>` + HIST_SECTIONS.map(([t, titre, opt]) => {
    const d = rows(t);
    if (!d.length && !["historique_prises", "cycle_temperature"].includes(t)) return "";
    return fold(`${esc(titre)} (${d.length})`, d.length ? editable(t, d, opt) : `<p class="muted">Aucune donnée enregistrée pour le moment.</p>`);
  }).join("");
}

function renderBientot(titre) {
  return `<h2>${titre}</h2>${box("info", "Cette section (check-in du jour, plan personnel, outils « là, maintenant ») arrive dans une prochaine version du site. Tes check-ins déjà enregistrés restent visibles et modifiables dans l'onglet « Historique &amp; Corrections ».")}`;
}

const ACT_MISC = {
  async savefiche() {
    const v = { diagnostics: val("fDiag"), allergies: val("fAllerg"), besoins: val("fBesoins"), contact: val("fContact") };
    if (await saveCfg(4, v)) { toast("🎉 Informations enregistrées !"); render(); }
  },
  print() {
    document.querySelectorAll("#ficheOut details").forEach((d) => (d.open = true));
    document.body.classList.add("pfiche");
    const fin = () => { document.body.classList.remove("pfiche"); removeEventListener("afterprint", fin); };
    addEventListener("afterprint", fin);
    window.print();
  },
  copyfiche() { navigator.clipboard.writeText(S.ficheTxt || "").then(() => toast("Texte copié")); },
  fold(el) { document.querySelectorAll("#ficheOut details").forEach((d) => (d.open = el.dataset.o === "1")); },
  async rowsave(el) {
    const tr = el.closest("tr"), t = tr.closest("table").dataset.t, id = +tr.dataset.id, orig = rows(t).find((r) => r.id === id) || {}, ch = {};
    tr.querySelectorAll("[data-k]").forEach((i) => {
      const k = i.dataset.k, o = orig[k] ?? "";
      if (String(o) === i.value) return;
      ch[k] = i.value === "" ? null : (typeof o === "number" ? num(i.value) : i.value);
    });
    if (!Object.keys(ch).length) return toast("Aucune modification détectée.");
    if (await upd(t, id, ch)) { await loadTables([t]); toast("🎉 Ligne modifiée !"); render(); }
  },
  async rowdel(el) {
    const tr = el.closest("tr"), t = tr.closest("table").dataset.t;
    if (confirm("Supprimer cette ligne ? C'est définitif.") && await del(t, [+tr.dataset.id])) { toast("Ligne supprimée"); render(); }
  },
};
