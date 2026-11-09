// ===== Onglet 1 : Tableau de bord (prises du jour) + gestion des médicaments =====
S.dashDate = null;
S.medEdit = "";

function parisNow() {
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  return { h: +p.find((x) => x.type === "hour").value % 24, m: +p.find((x) => x.type === "minute").value };
}

function manquants(date) {
  const out = {}; let total = 0;
  const hist = rows("historique_prises").filter((r) => r.Date === date);
  for (const [nom, info] of Object.entries(S.meds)) {
    const req = requis(info); total += req.length;
    const pris = hist.filter((r) => r["Médicament"] === nom).map((r) => r.Prise).join(" ");
    const m = req.filter((l) => !pris.includes(l));
    if (m.length) out[nom] = m;
  }
  return { out, total };
}

function paliers(info) {
  if (!info.is_evolution || !info.phases) return "";
  const ph = parseJ(info.phases); if (!Array.isArray(ph) || !ph.length) return "";
  const debut = info.start_date || today(), duree = parseInt(ph[0].duration ?? 7), ecoule = diffDays(today(), debut);
  if (ecoule < duree) {
    const dose = parseInt(ph[0].dose ?? 1), suiv = ph.length > 1 ? parseInt(ph[1].dose ?? 2) : dose;
    return box("info", `⏳ Palier 1 en cours : prendre ${dose} cachet(s) par repas. Passage à ${suiv} cachet(s) le ${fr(addDays(debut, duree))} (dans ${duree - ecoule} jour(s)).`);
  }
  return box("ok", `🚀 Palier maximal atteint : dose stable de ${doseActuelle(info)} cachet(s).`);
}

function stockHtml(nom, info) {
  const stock = parseInt(info.stock ?? 0), dose = doseActuelle(info);
  const nb = MOMENTS.filter(([, k]) => info[k]).length;
  const conso = Math.max(1, nb * dose), jours = Math.floor(stock / conso), fin = fr(addDays(today(), jours));
  if (stock === 0) return box("err", `🚨 Stock épuisé ! Il faut racheter ${esc(nom)} tout de suite.`);
  if (jours <= 7) return box("warn", `⚠️ Presque vide : il reste ${stock} comprimé(s), soit environ ${jours} jour(s) (jusqu'au ${fin}). Pense à racheter ${esc(nom)} et à demander le renouvellement de l'ordonnance.`);
  return `<p class="muted">📦 Stock : ${stock} comprimé(s), soit environ ${jours} jour(s) (jusqu'au ${fin}).</p>`;
}

function renderDash() {
  const date = S.dashDate || today(); S.dashDate = date;
  const meds = S.meds, { out: manq, total } = manquants(date);
  const deja = [...new Set(rows("historique_prises").filter((r) => r.Date === date).map((r) => r["Médicament"]))].sort();
  let h = `<h2>📅 Prises du jour &amp; Vos Symptômes</h2><p class="muted">Mode actif : <b>${esc(S.set.parcours)}</b></p>
  ${dateField("dDate", "🗓️ Jour à enregistrer (tu peux revenir en arrière si tu as oublié)", date, today())}
  ${deja.length ? box("info", `ℹ️ Il y a déjà des prises enregistrées le ${fr(date)} pour : ${esc(deja.join(", "))}. Coche seulement ce qui n'est pas encore enregistré (ou corrige dans l'onglet Historique).`) : ""}
  <h3>✅ À faire pour le ${fr(date)}</h3>`;

  // rappels d'heure précise (aujourd'hui seulement)
  if (date === today()) {
    const n = parisNow();
    for (const [nom] of Object.entries(manq)) {
      const hp = String(meds[nom].heure_precise || ""); if (!hp) continue;
      const [hh, mm] = hp.split(":").map(Number); if (isNaN(hh)) continue;
      const ecart = (hh * 60 + mm) - (n.h * 60 + n.m);
      if (ecart > 60) h += box("info", `⏰ <b>${esc(nom)}</b> : à prendre à <b>${hp}</b> (dans ${Math.floor(ecart / 60)} h ${String(ecart % 60).padStart(2, "0")})`);
      else if (ecart >= 0) h += box("warn", `⏰ <b>${esc(nom)}</b> : à prendre à <b>${hp}</b> (dans ${ecart} min)`);
      else { const e = -ecart; h += box("err", `⏰ <b>${esc(nom)}</b> : l'heure de <b>${hp}</b> est passée depuis ${e >= 60 ? Math.floor(e / 60) + " h " + String(e % 60).padStart(2, "0") : e + " min"}. Si tu l'as pris, enregistre-le ci-dessous.`); }
    }
  }
  let liste = "";
  if (!Object.keys(meds).length) liste += `<p class="muted">Ajoute un médicament avec le volet « 💊 Médicaments » à gauche pour commencer.</p>`;
  else if (Object.keys(manq).length) liste += Object.entries(manq).map(([n, m]) => `<div>💊 <b>${esc(n)}</b> : ${m.join(", ")}${meds[n].heure_precise ? " (⏰ " + esc(meds[n].heure_precise) + ")" : ""} à enregistrer</div>`).join("");
  else liste += box("ok", "💊 Tous tes traitements sont enregistrés pour ce jour.");

  // autres tâches
  const cyc = rows("cycle_temperature"), tasks = [];
  if (S.set.parcours === PARCOURS[0] && !cyc.some((r) => r.Date === date)) tasks.push("🌡️ Température basale pas encore notée (onglet Mon Suivi Féminin)");
  if (!rows("suivi_glycemie").some((r) => r.Date === date)) tasks.push("🩸 Pas de glycémie notée (seulement si ton médecin te l'a demandé)");
  if (!rows("suivi_douleur_fatigue").some((r) => r.Date === date)) tasks.push("🧘 Douleur, fatigue et sommeil pas encore notés (onglet Douleur & Énergie)");
  const t0 = today(), t1 = addDays(t0, 1);
  rows("rdv_medicaux").forEach((r) => { if (r.Statut !== "✅ Effectué" && (r.Date === t0 || r.Date === t1)) tasks.push(`📅 Rendez-vous ${r.Date === t0 ? "aujourd'hui" : "demain"} : ${r["Médecin / Spécialité"] || ""} ${r.Heure || ""}`); });
  const nbApp = rows("rdv_a_prendre").filter((r) => r.Statut === "À appeler").length;
  if (nbApp) tasks.push(`📞 ${nbApp} rendez-vous à prendre (onglet Rendez-vous Médicaux)`);
  liste += tasks.map((t) => `<div>${esc(t)}</div>`).join("");
  if (S.set.neuro) {
    const faits = total - Object.values(manq).reduce((n, m) => n + m.length, 0), first = Object.keys(manq)[0];
    h += (total ? bar(faits / total) + `<p class="muted">Prises faites aujourd'hui : ${faits} sur ${total}</p>` : "")
      + (first ? box("info", `👉 <b>Maintenant, une seule chose :</b> prendre ${esc(first)} (${manq[first][0]}), puis cocher ci-dessous.`) : tasks.length ? box("info", "👉 <b>Prochaine petite chose :</b> " + esc(tasks[0])) : box("ok", "🌿 Rien d'urgent. Tu peux te reposer."))
      + timerBlock() + `<details><summary>📋 Voir toute la liste</summary>${liste}</details>`;
  } else h += liste;

  if (Object.keys(manq).length) h += `<p>${btn("✅ J'ai tout pris comme d'habitude (enregistrer en un clic)", "toutpris")}</p>`;
  h += "<hr>";

  if (S.set.difficile) {
    h += box("info", "🌧️ Mode jour difficile : seulement l'essentiel. Fais juste ce qui est listé ci-dessus. Tu pourras compléter le reste plus tard (tu peux revenir sur un jour passé avec le choix de date).");
    if (Object.keys(manq).length) {
      h += `<h4>💊 Coche ce que tu as pris</h4>` + Object.entries(manq).map(([n, m]) => `<p><b>${esc(n)}</b></p><div class="chips">${m.map((l) => chk(`sp_${n}_${l}`, l)).join("")}</div>`).join("") + btn("✅ Enregistrer ce que j'ai pris", "savesimple");
    }
    return h;
  }

  // détail par médicament
  for (const [nom, info] of Object.entries(meds)) {
    const dose = doseActuelle(info);
    h += `<h4>💊 ${esc(nom)}</h4>${paliers(info)}
    <p class="muted">Moments requis : ${MOMENTS.filter(([, k]) => info[k]).map((m) => m[3] + " " + m[0]).join(" ")}${info.heure_precise ? " ⏰ " + esc(info.heure_precise) : ""} — Prendre <b>${dose} cachet(s)</b> (${esc(info.timing || "")})</p>
    ${stockHtml(nom, info)}
    <details><summary>📦 Modifier le stock de ${esc(nom)}</summary>
      <div class="row"><div>${field("stk_" + nom, "Stock exact (comprimés)", "number", info.stock ?? 0, 'min="0"')}${btn("✏️ Corriger le stock", "stockset", "sec", `data-n="${esc(nom)}"`)}</div>
      <div>${field("stka_" + nom, "Ajouter (boîte rachetée)", "number", 0, 'min="0"')}${btn("➕ Ajouter au stock", "stockadd", "sec", `data-n="${esc(nom)}"`)}</div></div></details>
    <div class="chips">${MOMENTS.filter(([, k, d]) => info[k] ?? d).map(([l, , , e]) => chk(`pr_${nom}_${l}`, `${e} Pris le ${l}`)).join("")}</div><hr>`;
  }
  if (Object.keys(meds).length) {
    h += `<h3>🧪 1. Effets secondaires fréquents</h3>${checks("sm", ["Nausées / Vomissements", "Diarrhées", "Maux d'estomac / Brûlures", "Perte d'appétit", "Vertiges", "Bouffées de chaleur"])}
    <h3>🌸 2. Symptômes liés au Cycle, SOPK &amp; Glycémie</h3>${checks("sc", ["Coup de barre (Après repas)", "Envie de sucre subite", "Maux de tête / Migraine", "Crampes pelviennes / Ovaires", "Poussée d'acné", "Sauts d'humeur / Irritabilité", "Seins douloureux", "Rétention d'eau"])}
    ${field("dNote", "Notes libres sur ta journée", "text", "", 'placeholder="RAS"')}
    ${btn("✅ Enregistrer ma journée", "saveday")}`;
  }
  h += `<hr><p class="muted">Pour ajouter, modifier ou supprimer un médicament, ouvre le volet <b>💊 Médicaments</b> sur le côté gauche.</p>`;
  return h;
}

function medForm() {
  const names = Object.keys(S.meds), edit = S.medEdit && S.meds[S.medEdit] ? S.medEdit : "";
  const i = edit ? S.meds[edit] : {};
  const ph = Array.isArray(parseJ(i.phases)) ? parseJ(i.phases) : [];
  const evo = !!i.is_evolution;
  const d1 = evo && ph.length >= 2 ? ph[0].dose : (ph[0]?.dose ?? i.nb_cachet_par_repas ?? 1);
  const dur1 = evo && ph.length >= 2 ? ph[0].duration : 7, d2 = evo && ph.length >= 2 ? ph[1].dose : 2;
  return `${sel("mSel", "Action", ["Nouveau médicament", ...names.map((n) => "✏️ " + n)], edit ? "✏️ " + edit : "Nouveau médicament")}
  ${field("mName", "Nom du médicament (ex: Metformine)", "text", edit)}
  ${field("mStock", "Stock de comprimés", "number", i.stock ?? 30, 'min="0"')}
  ${sel("mTiming", "Moment lié au repas", ["Début de repas", "Milieu de repas", "Fin de repas"], i.timing || "Début de repas")}
  ${chk("mHp", "⏰ À prendre à une heure précise", !!i.heure_precise)}
  ${field("mHeure", "Heure de prise", "time", i.heure_precise || "08:00")}
  <p><b>Moments de prise :</b></p><div class="chips">
  ${chk("mMa", "🌅 Matin", i.prend_matin ?? true)}${chk("mMi", "☀️ Midi", i.prend_midi ?? false)}${chk("mSo", "🌙 Soir", i.prend_soir ?? true)}${chk("mCo", "🛌 Coucher (ex : mélatonine)", i.prend_coucher ?? false)}</div>
  ${field("mStart", "📅 Date de début du traitement", "date", i.start_date || today())}
  ${chk("mEvo", "🔄 Ce traitement est évolutif (paliers)", evo)}
  <div class="row">${field("mD1", "Dose palier 1 (cachets/repas) — ou dose fixe", "number", d1, 'min="1"')}${field("mDur1", "Durée palier 1 (jours)", "number", dur1, 'min="1"')}${field("mD2", "Dose palier 2 (cachets final)", "number", d2, 'min="1"')}</div>
  ${btn("💾 Enregistrer le médicament", "savemed")}
  ${edit ? btn("🚨 Supprimer " + esc(edit), "delmed", "del", `data-n="${esc(edit)}"`) : ""}`;
}

async function saveDayRows(manqOnly, note, sm, sc, mode) {
  const date = S.dashDate;
  for (const [nom, info] of Object.entries(S.meds)) {
    const dose = doseActuelle(info);
    let moments;
    if (manqOnly) moments = manqOnly[nom] || [];
    else moments = requis(info).filter((l) => ck(`pr_${nom}_${l}`));
    if (manqOnly && !moments.length) continue;
    const total = moments.length * dose;
    const prise = moments.length ? moments.join(", ") + ` (${total} cachet(s))` : "Aucune";
    const row = { Date: date, "Médicament": nom, Prise: prise, "Moment Repas": info.timing || "", "Symptômes Traitement": sm.length ? sm.join(", ") : "Aucun", "Symptômes SOPK/Pré-Diabète": sc.length ? sc.join(", ") : "Aucun", Note: note };
    const { error } = await sb.from("historique_prises").insert(row);
    if (error) { toast("Erreur : " + error.message); return false; }
    const ni = { ...info, stock: Math.max(0, parseInt(info.stock ?? 0) - total) };
    await saveMed(nom, ni);
  }
  await loadTables(["historique_prises"]);
  return true;
}

const ACT_DASH = {
  async toutpris() {
    const { out } = manquants(S.dashDate);
    if (await saveDayRows(out, "Enregistré en un clic", [], [])) { toast("🎉 Enregistré !"); render(); }
  },
  async saveday() {
    if (await saveDayRows(null, val("dNote"), picked("sm"), picked("sc"))) { toast("🎉 Enregistré !"); render(); }
  },
  async stockset(el) { const n = el.dataset.n; if (await saveMed(n, { ...S.meds[n], stock: Math.max(0, parseInt(val("stk_" + n)) || 0) })) { toast("Stock corrigé"); render(); } },
  async stockadd(el) { const n = el.dataset.n; if (await saveMed(n, { ...S.meds[n], stock: (parseInt(S.meds[n].stock) || 0) + (parseInt(val("stka_" + n)) || 0) })) { toast("Stock mis à jour"); render(); } },
  async savemed() {
    const name = val("mName").trim(); if (!name) return toast("Écris d'abord le nom du médicament.");
    let ma = ck("mMa"), mi = ck("mMi"), so = ck("mSo"), co = ck("mCo");
    const hp = ck("mHp") ? val("mHeure") : "";
    if (hp && !(ma || mi || so || co)) { const c = momentPourHeure(hp); ma = c === "prend_matin"; mi = c === "prend_midi"; so = c === "prend_soir"; co = c === "prend_coucher"; }
    const evo = ck("mEvo"), d1 = parseInt(val("mD1")) || 1;
    const phases = evo ? [{ dose: d1, duration: parseInt(val("mDur1")) || 7 }, { dose: parseInt(val("mD2")) || 2, duration: 9999 }] : [{ dose: d1, duration: 9999 }];
    const conf = { stock: parseInt(val("mStock")) || 0, timing: val("mTiming"), heure_precise: hp, start_date: val("mStart") || today(), is_evolution: evo, phases, prend_matin: ma, prend_midi: mi, prend_soir: so, prend_coucher: co, nb_cachet_par_repas: d1 };
    if (await saveMed(name, conf)) { S.medEdit = name; toast("🎉 Médicament enregistré !"); render(); }
  },
  async delmed(el) { if (confirm("Supprimer " + el.dataset.n + " ?") && await delMed(el.dataset.n)) { S.medEdit = ""; render(); } },
};
const CHG_DASH = {
  dDate(el) { S.dashDate = !el.value || el.value > today() ? today() : el.value; render(); },
  mSel(el) { S.medEdit = el.value.startsWith("✏️ ") ? el.value.slice(3) : ""; render(); },
};
