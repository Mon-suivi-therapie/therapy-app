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
    const req = requis(info, date); total += req.length;
    const pris = hist.filter((r) => r["Médicament"] === nom).map((r) => r.Prise).join(" ");
    const m = req.filter((l) => !pris.includes(l));
    if (m.length) out[nom] = m;
  }
  return { out, total };
}

// ---------- paliers + rapprochement avec les symptômes ----------
// Symptômes d'un jour, toutes sources : « J'ai un symptôme » + effets notés avec les prises
function symptomesJour(d) {
  const out = new Set(), x = (cfg(27).jours || {})[d];
  if (x) [...(x.s || []), x.autre].filter(Boolean).forEach((s) => out.add(s));
  rows("historique_prises").filter((r) => r.Date === d).forEach((r) => ["Symptômes Traitement", "Symptômes SOPK/Pré-Diabète"].forEach((c) => String(r[c] || "").split(",").map((s) => s.trim()).filter((s) => s && s !== "Aucun").forEach((s) => out.add(s))));
  return [...out];
}
const palierNom = (p) => (p.retour ? "↩️ Retour au palier " : "Palier ") + (p.idx + 1);
const palierDesc = (p) => `${parJourTxt(p)} cp/jour (${p.dose} cp ${momentsTxt(p.moments)})`;
// petite étiquette pour un jour donné, ex : « Metformine : palier 3, 4 cp/jour, J2 »
function paliersTag(d) {
  return Object.entries(S.meds).map(([nom, info]) => {
    const c = chronoPaliers(info); if (!c.length || d < c[0].debut) return "";
    const p = palierAuJour(info, d);
    return `${nom} : ${palierNom(p).toLowerCase().replace("↩️ ", "")}, ${parJourTxt(p)} cp/jour, J${diffDays(d, p.debut) + 1}`;
  }).filter(Boolean);
}
function statsPalier(p) {
  const t = today(), fin = p.fin && p.fin < t ? p.fin : t, jours = [];
  for (let d = p.debut; d <= fin; d = addDays(d, 1)) jours.push(d);
  const avec = jours.filter((d) => symptomesJour(d).length), c = {};
  avec.forEach((d) => symptomesJour(d).forEach((s) => (c[s] = (c[s] || 0) + 1)));
  const debut3 = jours.slice(0, 3).filter((d) => symptomesJour(d).length).length;
  return { n: jours.length, avec: avec.length, debut3, top: Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4) };
}
function paliers(info, nom = "") {
  const c = chronoPaliers(info); if (!c.length) return "";
  const t = today(), cur = palierAuJour(info, t), suiv = c[c.indexOf(cur) + 1];
  let h = "";
  if (t < c[0].debut) h += box("info", `⏳ Le traitement commence le ${fr(c[0].debut)} : ${palierDesc(c[0])}.`);
  else if (cur.retour) h += box("ok", `↩️ Tu es revenue au palier ${cur.idx + 1} depuis le ${fr(cur.debut)} et tu y restes : ${palierDesc(cur)}.`);
  else if (cur.fin) h += box("info", `⏳ Palier ${cur.idx + 1} en cours depuis le ${fr(cur.debut)} (jour ${diffDays(t, cur.debut) + 1}) : ${palierDesc(cur)}. Passage au palier ${cur.idx + 2} (${suiv ? palierDesc(suiv) : ""}) le <b>${fr(addDays(cur.fin, 1))}</b> (dans ${diffDays(cur.fin, t) + 1} jour(s)).`);
  else h += box("ok", `🚀 Palier ${cur.idx + 1} (définitif) depuis le ${fr(cur.debut)} (jour ${diffDays(t, cur.debut) + 1}) : ${palierDesc(cur)}.`);

  // tableau : chaque palier et les symptômes notés pendant ce palier
  const passes = c.filter((p) => p.debut <= t);
  if (passes.length) {
    h += `<p><b>📈 Symptômes selon les paliers</b></p><div class="tw"><table><thead><tr><th>Palier</th><th>Période</th><th>Jours avec symptômes</th><th>3 premiers jours</th><th>Les plus fréquents</th></tr></thead><tbody>${passes.map((p) => {
      const s = statsPalier(p), pc = s.n ? Math.round((s.avec / s.n) * 100) : 0;
      return `<tr${p === cur ? ' style="font-weight:700"' : ""}><td>${palierNom(p)}<br><span class="muted">${palierDesc(p)}</span></td><td>${fr2(p.debut)} → ${p.fin && p.fin < t ? fr2(p.fin) : "aujourd'hui"} (${s.n} j)</td><td>${s.avec} / ${s.n} (${pc} %)</td><td>${Math.min(3, s.n) ? s.debut3 + " / " + Math.min(3, s.n) : "—"}</td><td>${s.top.length ? esc(s.top.map(([k, v]) => `${k} (${v})`).join(", ")) : "—"}</td></tr>`;
    }).join("")}</tbody></table></div><p class="muted">Les symptômes viennent de « J'ai un symptôme aujourd'hui » et des effets cochés en enregistrant tes prises.</p>`;
  }
  // consigne du médecin : revenir au palier d'avant et y rester
  if (t >= c[0].debut && !cur.retour && cur.idx > 0 && nom) {
    const s = statsPalier(cur), prev = phasesDe(info)[cur.idx - 1];
    const beaucoup = s.n >= 2 && s.avec / s.n >= 0.5;
    h += box(beaucoup ? "warn" : "info", `${beaucoup ? `⚠️ Depuis le passage au palier ${cur.idx + 1}, tu as eu des symptômes ${s.avec} jour(s) sur ${s.n}.<br>` : ""}🩺 <b>Consigne de ton médecin :</b> ${esc(info.consigne || "si trop de symptômes, repasser à l'étape d'avant et y rester.")}<br>
      ${btn(`↩️ Trop de symptômes : revenir au palier ${cur.idx} (${(parseInt(prev.dose) || 1) * (prev.moments || momentsGlobaux(info)).length} cp/jour) et y rester`, "palierretour", "sec", `data-n="${esc(nom)}"`)}`);
  }
  if (cur.retour && nom) h += `<p class="muted">Erreur ou avis contraire du médecin ? ${btn("Annuler le retour au palier précédent", "palierannule", "sec", `data-n="${esc(nom)}"`)}</p>`;
  return h;
}

function stockHtml(nom, info) {
  const stock = parseInt(info.stock ?? 0), dose = doseActuelle(info);
  const nb = requis(info).length;
  const conso = Math.max(1, nb * dose), jours = Math.floor(stock / conso), fin = fr(addDays(today(), jours));
  if (stock === 0) return box("err", `🚨 Stock épuisé ! Il faut racheter ${esc(nom)} tout de suite.`);
  if (jours <= 7) return box("warn", `⚠️ Presque vide : il reste ${stock} comprimé(s), soit environ ${jours} jour(s) (jusqu'au ${fin}). Pense à racheter ${esc(nom)} et à demander le renouvellement de l'ordonnance.`);
  return `<p class="muted">📦 Stock : ${stock} comprimé(s), soit environ ${jours} jour(s) (jusqu'au ${fin}).</p>`;
}

function renderDash() {
  const date = S.dashDate || today(); S.dashDate = date;
  if (S.set.difficile && date === today()) return renderDifficile(date);
  const meds = S.meds, { out: manq, total } = manquants(date);
  const deja = [...new Set(rows("historique_prises").filter((r) => r.Date === date).map((r) => r["Médicament"]))].sort();
  let h = `<h2>📅 Prises du jour &amp; Vos Symptômes</h2><p class="muted">Mode actif : <b>${esc(S.set.parcours)}</b></p>
  ${dateField("dDate", "🗓️ Jour à enregistrer (tu peux revenir en arrière si tu as oublié)", date, today())}
  ${deja.length ? box("info", `ℹ️ Il y a déjà des prises enregistrées le ${fr(date)} pour : ${esc(deja.join(", "))}. Coche seulement ce qui n'est pas encore enregistré (ou corrige dans l'onglet Historique).`) : ""}
  <h3>✅ À faire pour le ${fr(date)}</h3>`;
  h = h.replace(`<h3>✅ À faire`, stockAlertes() + `<h3>✅ À faire`);

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
      + `<details><summary>📋 Voir toute la liste</summary>${liste}</details>`;
  } else h += liste;

  if (Object.keys(manq).length) h += `<p>${btn("✅ J'ai tout pris comme d'habitude (enregistrer en un clic)", "toutpris")}</p>`;
  h += "<hr>" + ppcBlock(date) + "<hr>";

  if (S.set.difficile) {
    h += box("info", "🌧️ Mode jour difficile : seulement l'essentiel. Fais juste ce qui est listé ci-dessus. Tu pourras compléter le reste plus tard (tu peux revenir sur un jour passé avec le choix de date).");
    if (Object.keys(manq).length) {
      h += `<h4>💊 Coche ce que tu as pris</h4>` + Object.entries(manq).map(([n, m]) => `<p><b>${esc(n)}</b></p><div class="chips">${m.map((l) => chk(`sp_${n}_${l}`, l)).join("")}</div>`).join("") + btn("✅ Enregistrer ce que j'ai pris", "savesimple");
    }
    return h;
  }

  // détail par médicament
  for (const [nom, info] of Object.entries(meds)) {
    const dose = doseActuelle(info, date), req = requis(info, date);
    h += `<h4>💊 ${esc(nom)}</h4>${paliers(info, nom)}
    <p class="muted">${date !== today() ? `Le ${fr(date)} : ` : ""}Moments requis : ${MOMENTS.filter((m) => req.includes(m[0])).map((m) => m[3] + " " + m[0]).join(" ")}${info.heure_precise ? " ⏰ " + esc(info.heure_precise) : ""} — Prendre <b>${dose} cachet(s)</b> (${esc(info.timing || "")})</p>
    ${stockHtml(nom, info)}
    <details><summary>📦 Modifier le stock de ${esc(nom)}</summary>
      <div class="row"><div>${field("stk_" + nom, "Stock exact (comprimés)", "number", info.stock ?? 0, 'min="0"')}${btn("✏️ Corriger le stock", "stockset", "sec", `data-n="${esc(nom)}"`)}</div>
      <div>${field("stka_" + nom, "Ajouter (boîte rachetée)", "number", 0, 'min="0"')}${btn("➕ Ajouter au stock", "stockadd", "sec", `data-n="${esc(nom)}"`)}</div></div></details>
    <div class="chips">${MOMENTS.filter((m) => req.includes(m[0])).map(([l, , , e]) => chk(`pr_${nom}_${l}`, `${e} Pris le ${l}`)).join("")}</div><hr>`;
  }
  if (Object.keys(meds).length) {
    h += `<h3>🧪 1. Effets secondaires fréquents</h3>${checks("sm", ["Nausées / Vomissements", "Diarrhées", "Maux d'estomac / Brûlures", "Perte d'appétit", "Vertiges", "Bouffées de chaleur"])}
    <h3>🌸 2. Symptômes liés au Cycle, SOPK &amp; Glycémie</h3>${checks("sc", ["Coup de barre (Après repas)", "Envie de sucre subite", "Maux de tête / Migraine", "Crampes pelviennes / Ovaires", "Poussée d'acné", "Sauts d'humeur / Irritabilité", "Seins douloureux", "Rétention d'eau"])}
    ${field("dNote", "Notes libres sur ta journée", "text", "", 'placeholder="RAS"')}
    ${btn("✅ Enregistrer ma journée", "saveday")}`;
  }
  h += `<hr><p class="muted">Pour ajouter, modifier ou supprimer un médicament, ouvre le volet <b>💊 Médicaments</b> sur le côté gauche.</p>`;
  h += rappelsAgenda();
  return h;
}

function medForm() {
  const names = Object.keys(S.meds), edit = S.medEdit && S.meds[S.medEdit] ? S.medEdit : "";
  const i = edit ? S.meds[edit] : {};
  const ph = Array.isArray(parseJ(i.phases)) ? parseJ(i.phases) : [];
  const evo = !!i.is_evolution;
  const d1 = ph[0]?.dose ?? i.nb_cachet_par_repas ?? 1;
  if (S.medPhFor !== edit) { S.medPhFor = edit; S.medPhN = Math.max(evo ? ph.length : 0, 3); }
  const glob = momentsGlobaux(i);
  const ligne = (n) => {
    const p = evo ? ph[n] || {} : {}, mk = p.moments || (p.dose ? glob : []);
    const dur = p.duration && parseInt(p.duration) < 9999 ? p.duration : "";
    return `<div class="box info"><b>Palier ${n + 1}</b><div class="row">${field("mPd_" + n, "Comprimés par prise", "number", p.dose ?? "", 'min="1"')}${field("mPj_" + n, "Pendant combien de jours ? (vide = définitif)", "number", dur, 'min="1"')}</div>
    <div class="chips">${MOMENTS.map(([l, k, , e]) => chk(`mPm_${n}_${k}`, e + " " + l, mk.includes(k))).join("")}</div></div>`;
  };
  return `${sel("mSel", "Action", ["Nouveau médicament", ...names.map((n) => "✏️ " + n)], edit ? "✏️ " + edit : "Nouveau médicament")}
  ${field("mName", "Nom du médicament (ex: Metformine)", "text", edit)}
  ${field("mStock", "Stock de comprimés", "number", i.stock ?? 30, 'min="0"')}
  ${sel("mTiming", "Moment lié au repas", ["Début de repas", "Milieu de repas", "Fin de repas"], i.timing || "Début de repas")}
  ${chk("mHp", "⏰ À prendre à une heure précise", !!i.heure_precise)}
  ${field("mHeure", "Heure de prise", "time", i.heure_precise || "08:00")}
  <p><b>Moments de prise :</b></p><div class="chips">
  ${chk("mMa", "🌅 Matin", i.prend_matin ?? true)}${chk("mMi", "☀️ Midi", i.prend_midi ?? false)}${chk("mSo", "🌙 Soir", i.prend_soir ?? true)}${chk("mCo", "🛌 Coucher (ex : mélatonine)", i.prend_coucher ?? false)}</div>
  ${field("mStart", "📅 Date de début du traitement", "date", i.start_date || today())}
  ${field("mOrdo", "📝 Fin de l'ordonnance (facultatif, pour être prévenue)", "date", i.ordo_fin || "")}
  ${field("mD1", "Comprimés par prise (si la dose ne change pas)", "number", d1, 'min="1"')}
  ${chk("mEvo", "🔄 La dose augmente par paliers (ex : Metformine)", evo)}
  <details ${evo ? "open" : ""}><summary>🪜 Mes paliers (dans l'ordre, à partir de la date de début)</summary>
  <p class="muted">Pour chaque palier : combien de comprimés à chaque prise, à quels moments, et pendant combien de jours. Laisse « jours » vide pour le dernier palier (dose définitive). Les lignes vides sont ignorées.</p>
  ${Array.from({ length: S.medPhN }, (_, n) => ligne(n)).join("")}
  ${btn("➕ Ajouter un palier", "addpalier", "sec")}
  ${field("mConsigne", "🩺 Consigne du médecin si ça ne passe pas", "text", i.consigne || "", 'placeholder="Si trop de symptômes, repasser à l\'étape d\'avant et y rester"')}
  </details>
  ${btn("💾 Enregistrer le médicament", "savemed")}
  ${edit ? btn("🚨 Supprimer " + esc(edit), "delmed", "del", `data-n="${esc(edit)}"`) : ""}`;
}

async function saveDayRows(manqOnly, note, sm, sc, mode) {
  const date = S.dashDate;
  for (const [nom, info] of Object.entries(S.meds)) {
    const dose = doseActuelle(info, date);
    let moments;
    if (manqOnly) moments = manqOnly[nom] || [];
    else moments = requis(info, date).filter((l) => ck(`pr_${nom}_${l}`));
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
    let evo = ck("mEvo"), d1 = parseInt(val("mD1")) || 1;
    const glob = MOMENTS.map((m) => m[1]).filter((k, n) => [ma, mi, so, co][n]);
    let phases = [{ dose: d1, duration: 9999 }];
    if (evo) {
      const L = [];
      for (let n = 0; n < S.medPhN; n++) {
        const dose = parseInt(val("mPd_" + n)); if (!dose) continue;
        const dur = parseInt(val("mPj_" + n)) || 9999;
        const mk = MOMENTS.map((m) => m[1]).filter((k) => ck(`mPm_${n}_${k}`));
        L.push({ dose, duration: dur, moments: mk.length ? mk : glob });
        if (dur >= 9999) break;
      }
      if (!L.length) return toast("Remplis au moins un palier (comprimés par prise), ou décoche « paliers ».");
      L[L.length - 1].duration = 9999; phases = L; d1 = L[0].dose;
    }
    const old = S.meds[S.medEdit] || {};
    const retour = evo && old.retour && old.retour.idx < phases.length ? old.retour : null;
    const conf = { stock: parseInt(val("mStock")) || 0, timing: val("mTiming"), heure_precise: hp, start_date: val("mStart") || today(), ordo_fin: val("mOrdo"), is_evolution: evo, phases, retour, consigne: val("mConsigne").trim(), prend_matin: ma, prend_midi: mi, prend_soir: so, prend_coucher: co, nb_cachet_par_repas: d1 };
    if (await saveMed(name, conf)) { S.medEdit = name; S.medPhFor = null; toast("🎉 Médicament enregistré !"); render(); }
  },
  addpalier() { S.medPhN = (S.medPhN || 3) + 1; render(); },
  async palierretour(el) {
    const n = el.dataset.n, info = S.meds[n], cur = palierAuJour(info); if (!cur || cur.idx < 1) return;
    if (!confirm(`Revenir au palier ${cur.idx} de ${n} à partir d'aujourd'hui, et y rester ?`)) return;
    if (await saveMed(n, { ...info, retour: { date: today(), idx: cur.idx - 1, depuis: cur.idx } })) { toast(`↩️ ${n} : retour au palier ${cur.idx}`); render(); }
  },
  async palierannule(el) {
    const n = el.dataset.n; if (!confirm("Annuler le retour au palier précédent ?")) return;
    if (await saveMed(n, { ...S.meds[n], retour: null })) { toast("Retour annulé"); render(); }
  },
  async delmed(el) { if (confirm("Supprimer " + el.dataset.n + " ?") && await delMed(el.dataset.n)) { S.medEdit = ""; render(); } },
};
const CHG_DASH = {
  dDate(el) { S.dashDate = !el.value || el.value > today() ? today() : el.value; render(); },
  mSel(el) { S.medEdit = el.value.startsWith("✏️ ") ? el.value.slice(3) : ""; render(); },
};
