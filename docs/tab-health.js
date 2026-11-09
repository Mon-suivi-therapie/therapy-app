// ===== Onglet 4 : Glycémie & Nutrition + Onglet 5 : Douleur & Énergie =====
S.enceinte = false; S.bilanVoir = "";

const CHECKS = {
  "🥗 Nutrition": [["n1", "J'ai commencé mes repas par les légumes"], ["n2", "J'ai fait 3 repas réguliers"], ["n3", "Pas de boisson sucrée aujourd'hui"], ["n4", "Féculents complets en portion modérée"], ["n5", "J'ai pris une collation équilibrée (fruit + protéines)"]],
  "🚶 Sport et marche": [["s1", "Marche de 10 à 15 min après le repas"], ["s2", "Activité modérée adaptée à mes douleurs"], ["s3", "Renforcement musculaire léger (2 fois par semaine)"], ["s4", "Je me suis levée régulièrement (pas assise 1 h d'affilée)"]],
  "🧘 Kiné et fibromyalgie": [["k1", "Séance de kiné ou exercices du kiné"], ["k2", "Étirements doux 5 à 10 minutes"], ["k3", "Chaleur (bouillotte, douche ou bain chaud)"], ["k4", "J'ai fait des pauses et géré mon énergie"], ["k5", "Respiration ou relaxation 5 minutes"], ["k6", "Bonne nuit de sommeil (7 à 9 h)"]],
  "💧 Autres": [["a1", "J'ai bu environ 1,5 L d'eau"], ["a2", "J'ai mesuré ma glycémie (si demandé par mon médecin)"], ["a3", "J'ai pris mon traitement et mes vitamines prescrites"]],
};
const NB_CHECKS = Object.values(CHECKS).flat().length;
const gv = (s) => num(String(s).replace(" g/L", ""));

function glycAdvice() {
  const v = num(val("gVal")); if (v === null) return "";
  const mode = val("gMoment"), enc = ck("gEnc"), jeun = mode === "Matin à jeun", re1h = mode === "1h après un mauvais résultat";
  const seuilPost = re1h ? 1.4 : enc ? 1.2 : 1.4, grossesse = enc ? " En grossesse, parles-en rapidement à ta sage-femme ou ton médecin." : "";
  let t;
  if (v < 0.7) t = box("err", "🔻 Glycémie basse (hypoglycémie). Prends tout de suite 15 g de sucre (3 morceaux de sucre ou un demi-verre de jus), assieds-toi, puis recontrôle dans 15 minutes. Si elle reste basse ou si tu as des malaises (sueurs, tremblements, confusion), appelle ton médecin ou le 15.");
  else if (jeun) {
    const ok = enc ? 0.95 : 1.0;
    if (v < ok) t = box("ok", "✅ Bonne valeur à jeun. Continue : repas réguliers, légumes en premier, marche après les repas, eau.");
    else if (v < 1.26) t = box("warn", "⚠️ Valeur un peu élevée à jeun. Bois un verre d'eau, évite les sucres rapides aujourd'hui, fais un petit-déjeuner avec protéines et fibres, et marche 10 à 15 min après les repas. Si cela se répète 2 à 3 jours, préviens ton médecin." + grossesse);
    else t = box("err", "🛑 Valeur élevée à jeun. Refais le contrôle (mains propres et sèches). Si elle est confirmée, appelle ton médecin dans la journée. Si tu as une soif intense, des vomissements, une grande fatigue ou une respiration inhabituelle, appelle le 15 ou va aux urgences.");
  } else {
    if (v < seuilPost) t = box("ok", "✅ Bonne valeur après repas. Continue : légumes en premier et petite marche après le repas.");
    else if (v < 2) t = box("warn", "⚠️ Valeur un peu élevée après repas. Marche tranquillement 10 à 15 min, bois de l'eau, et note ce que tu as mangé. Au prochain repas : légumes d'abord, moins de féculents et pas de boisson sucrée. Si cela se répète, préviens ton médecin." + grossesse);
    else t = box("err", "🛑 Valeur très élevée après repas. Hydrate-toi, évite tout sucre, refais un contrôle dans 1 heure. Contacte ton médecin dans la journée. En cas de malaise, soif intense ou vomissements, appelle le 15.");
  }
  const seuilHaut = jeun ? (enc ? 0.95 : 1.0) : seuilPost, eleve = v >= seuilHaut, bas = v < 0.7, mal = ck("gMal");
  t += `<p class="muted">Repères indicatifs, je ne remplace pas un médecin. Ton équipe médicale fixe tes objectifs personnels.</p>`;
  if (mal) t += box("warn", "Préviens ton médecin ou ta sage-femme aujourd'hui. En cas de confusion, vomissements, soif intense, respiration inhabituelle ou malaise important : appelle le 15.");
  if (eleve || bas || mal) {
    t += `<h4>🔁 Contrôle de vérification</h4><p class="muted">Lave-toi et sèche-toi bien les mains, puis refais une mesure sur un autre doigt.</p>${chk("gRefait", "J'ai refait un contrôle")}
    <div class="row">${field("gCtrl", "Valeur du contrôle (g/L)", "number", v, 'step="0.01"')}${sel("gDelai", "Délai après la 1re mesure", ["Tout de suite", "15 minutes", "1 heure", "2 heures"])}</div>`;
  }
  if (!jeun && v >= seuilPost) t += field("gRepas", "🍽️ Qu'as-tu mangé à ce repas ? (pour comprendre ce qui fait monter)");
  return t;
}

function renderHealth() {
  const mat = { bandelettes: 0, aiguilles: 0, seuil: 10, ...cfg(3) };
  const nb = (n, lib, w) => n === 0 ? box("err", `🚨 Plus de ${lib} ! Il faut en racheter tout de suite.`) : n <= mat.seuil ? box("warn", `⚠️ ${w} presque épuisé(e)s : il en reste ${n}. Pense à en racheter.`) : box("ok", `📦 ${w} : ${n} restantes.`);
  let h = `<h2>🥗 Mon Suivi Métabolique</h2><h3>🧰 Mon matériel de glycémie</h3>${nb(+mat.bandelettes, "bandelettes", "Bandelettes")}${nb(+mat.aiguilles, "aiguilles", "Aiguilles")}
  <details><summary>✏️ Modifier mon stock de matériel</summary><div class="row">${field("mBand", "Bandelettes", "number", mat.bandelettes, 'min="0"')}${field("mAig", "Aiguilles", "number", mat.aiguilles, 'min="0"')}${field("mSeuil", "Alerte quand il reste", "number", mat.seuil, 'min="1"')}</div>${btn("💾 Enregistrer mon matériel", "savemat")}</details><hr>
  <h3>🩸 Ma glycémie</h3>
  ${chk("gEnc", "🤰 Je suis enceinte (objectifs de grossesse)", S.enceinte || S.set.parcours === PARCOURS[1])}
  ${field("gDate", "🗓️ Date de la mesure", "date", today(), `max="${today()}"`)}
  <div class="row">${field("gVal", "Sucre (g/L)", "number", "0.95", 'step="0.01" min="0" max="6"')}${sel("gMoment", "Moment", ["Matin à jeun", "2h après le petit-déjeuner", "2h après le déjeuner", "2h après le dîner", "1h après un mauvais résultat"])}</div>
  ${chk("gMal", "🤒 Je ne me sens pas bien")}<div id="gMalSym" style="display:none">${checks("gms", ["Soif intense", "Sueurs / tremblements", "Vertiges", "Nausées / vomissements", "Fatigue inhabituelle", "Vision floue", "Maux de tête", "Confusion", "Respiration inhabituelle"])}</div>
  <div id="gAdvice"></div>
  ${btn("💾 Sauvegarder la glycémie", "saveglyc")}`;

  const g = rows("suivi_glycemie").slice().sort((a, b) => a.Date.localeCompare(b.Date));
  if (g.length) {
    const gStart = h.length;
    const enc0 = S.enceinte || S.set.parcours === PARCOURS[1], sj0 = enc0 ? 0.95 : 1.0, sp0 = enc0 ? 1.2 : 1.4;
    const J = g.map((r) => gv(r["Glycémie à jeun"])).filter((x) => x !== null), P = g.map((r) => gv(r["Glycémie Post-Prandiale"])).filter((x) => x !== null);
    const pc = (a, s) => (a.length ? Math.round((a.filter((x) => x >= 0.7 && x < s).length / a.length) * 100) + " %" : "–");
    h += `<div class="metrics">
      ${metric("Moyenne à jeun", J.length ? r1(avg(J), 2) + " g/L" : "–")}${metric("Dans la cible (à jeun)", pc(J, sj0))}
      ${metric("Moyenne après repas", P.length ? r1(avg(P), 2) + " g/L" : "–")}${metric("Dans la cible (après repas)", pc(P, sp0))}</div>
    <p class="muted">Zone verte = ta cible (à jeun : 0,70 à ${String(sj0).replace(".", ",")} g/L · après repas : moins de ${String(sp0).replace(".", ",")} g/L). Les points sont <b style="color:#2e9d5b">verts</b> dans la cible, <b style="color:#e8914f">orange</b> au-dessus, <b style="color:#4a7fd6">bleus</b> trop bas.</p>
    ${sel("gRange", "Période affichée", ["14 derniers jours", "30 derniers jours", "3 derniers mois", "Tout"], S.gRange || "30 derniers jours")}<div class="row"><div><b>🌅 À jeun</b><div class="chart" style="height:240px"><canvas id="chGJ"></canvas></div></div><div><b>🍽️ Après repas</b><div class="chart" style="height:240px"><canvas id="chGP"></canvas></div></div></div><b>🕒 Moyenne selon le moment de la journée</b><div class="chart" style="height:240px"><canvas id="chGM"></canvas></div>`;
    const enc = S.enceinte, sj = enc ? 0.95 : 1.0, sp = enc ? 1.2 : 1.4, sem = {};
    g.forEach((r) => { const w = mondayOf(r.Date); const o = (sem[w] = sem[w] || { j: [], p: [] }); const a = gv(r["Glycémie à jeun"]), b = gv(r["Glycémie Post-Prandiale"]); if (a !== null) o.j.push(a); if (b !== null) o.p.push(b); });
    const lignes = Object.entries(sem).sort().reverse().map(([w, o]) => ({ "Semaine": "Sem. du " + fr2(w), "Moyenne à jeun (g/L)": o.j.length ? r1(avg(o.j), 2) : "", "Moyenne après repas (g/L)": o.p.length ? r1(avg(o.p), 2) : "", "Valeurs hautes à jeun": o.j.filter((x) => x >= sj).length, "Valeurs hautes après repas": o.p.filter((x) => x >= sp).length }));
    h += fold("🗓️ Ma glycémie semaine par semaine", table(Object.keys(lignes[0]), lignes) + `<p class="muted">Repères indicatifs. Montre ce tableau à ton médecin : la tendance compte plus qu'une valeur isolée.</p>`);
    h += fold(`📋 Toutes mes mesures (${g.length})`, table(["Date", "Glycémie à jeun", "Glycémie Post-Prandiale", "Moment", "Repas mangé", "Malaise"], [...g].reverse()) + `<div class="row"><div>${sel("gDel", "Supprimer une mesure", [...g].reverse().map((r) => `${r.Date} (n°${r.id})`))}${btn("🚨 Supprimer cette mesure", "delglyc", "del")}</div></div>`);
    h = h.slice(0, gStart) + fold("📈 Mon historique de glycémie", h.slice(gStart), true);
  }
  h += `<hr>` + renderPoids() + `<hr>` + renderBilans() + `<hr>` + renderConseils();
  return h;
}

function renderPoids() {
  const p = rows("suivi_poids").map((r) => ({ ...r, kg: num(r["Poids (kg)"]) })).filter((r) => r.kg !== null).sort((a, b) => a.Date.localeCompare(b.Date));
  const pd = p.length ? p[p.length - 1].kg : 70, taille = p.length ? parseInt(num(p.filter((r) => num(r["Taille (cm)"])).slice(-1)[0]?.["Taille (cm)"])) || 165 : 165;
  let h = `<h3>⚖️ Mon poids</h3><details ${S.set.masquer ? "" : "open"}><summary>Voir / masquer le détail de mon poids</summary>
  ${field("pDate", "🗓️ Date de la pesée", "date", today(), `max="${today()}"`)}
  <div class="row">${field("pKg", "Poids (kg)", "number", pd, 'step="0.1" min="30" max="200"')}${field("pTaille", "Taille (cm)", "number", taille, 'min="120" max="220"')}${field("pTour", "Tour de taille (cm, 0 = non mesuré)", "number", 0, 'step="0.5" min="0"')}</div>
  <p class="muted" id="pImc"></p>
  <p class="muted">Contexte de la pesée :</p>${checks("pctx", ["Avant / pendant les règles", "Rétention d'eau (jambes, mains, ventre gonflés)", "Repas salé ou restaurant la veille", "Mal dormi", "Traitement oublié", "Constipation", "Après un écart alimentaire"])}
  ${field("pNote", "Note (facultatif)")}${btn("💾 Sauvegarder ma pesée", "savepoids")}`;
  if (p.length) {
    const dep = p[0].kg, act = p[p.length - 1].kg, perdu = dep - act;
    h += `<div class="metrics">${metric("Poids de départ", r1(dep) + " kg")}${metric("Poids actuel", r1(act) + " kg")}${metric(perdu >= 0 ? "Kilos perdus" : "Kilos pris", r1(Math.abs(perdu)) + " kg")}</div>
    <p class="muted">Départ : pesée du ${fr(p[0].Date)}. Dernière pesée : ${fr(p[p.length - 1].Date)}.</p>`;
    const obj = parseFloat(cfg(5).objectif_poids) || 0;
    h += `<p><b>🎯 Mon objectif de poids</b> (à fixer avec ton médecin ou ton équipe PMA)</p><div class="row">${field("pObj", "Objectif (kg), 0 = pas d'objectif", "number", obj, 'step="0.5" min="0"')}<div>${btn("💾 Enregistrer mon objectif", "saveobj")}</div></div>`;
    if (obj > 0 && dep > obj) { const pr = Math.min(1, Math.max(0, (dep - act) / (dep - obj))); h += bar(pr) + `<p class="muted">Progression vers ton objectif : ${Math.floor(pr * 100)} %. Une perte douce et régulière suffit : le bon rythme est celui que ton équipe médicale te conseille.</p>`; }
    const last = p[p.length - 1].Date; let al = null;
    for (const [j, s] of [[14, 2], [28, 3]]) { const anc = p.filter((r) => diffDays(r.Date, last) <= -j); if (anc.length) { const d = act - anc[anc.length - 1].kg; if (d >= s) al = [j, d]; } }
    if (al) { h += box("warn", `📈 Tu as pris environ ${r1(al[1])} kg en ${al[0]} jours. Ce n'est pas un échec : le poids varie beaucoup avec l'eau, le sel, le cycle, le sommeil, un traitement oublié ou la résistance à l'insuline. Regarde la ligne pointillée (moyenne 4 semaines) et remplis le contexte de tes pesées. Si ça continue, parles-en à ton médecin.`); if (S.enceinte) h += box("err", "🤰 En grossesse, une prise de poids rapide avec gonflement du visage ou des mains, maux de tête, troubles de la vue ou douleur sous les côtes peut être un signe de pré-éclampsie : appelle ta sage-femme ou le 15 le jour même."); }
    h += `<div class="chart"><canvas id="chPoids"></canvas></div><p class="muted">Ligne rose = poids de chaque pesée. Ligne pointillée = moyenne des 4 dernières semaines : c'est elle qui compte.</p>`;
    const hist = p.map((r, i) => ({ Date: r.Date, "Poids (kg)": r.kg, "Variation (kg)": i ? r1(r.kg - p[i - 1].kg) : "", "Perdu depuis le début (kg)": r1(dep - r.kg), "Tour de taille (cm)": r["Tour de taille (cm)"] ?? "", Note: r.Note ?? "" })).reverse();
    h += fold(`📅 Historique de mes pesées (${hist.length})`, table(Object.keys(hist[0]), hist) + `<div class="row"><div>${sel("pDel", "Supprimer une pesée", [...p].reverse().map((r) => `${r.Date} - ${r.kg} kg (n°${r.id})`))}${btn("🚨 Supprimer cette pesée", "delpoids", "del")}</div></div>`);
  }
  return h + `</details>`;
}

function renderBilans() {
  const b = rows("resultats_bilans");
  let h = `<h3>🧪 Mes résultats de prises de sang</h3><p class="muted">HbA1c, hormones, vitamines : note ici tes résultats pour voir l'évolution. (L'import automatique de PDF arrive dans une prochaine version.)</p>
  <div class="row">${field("bDate", "🗓️ Date de la prise de sang", "date", today(), `max="${today()}"`)}${sel("bExam", "Examen", ["HbA1c", "Glycémie à jeun (labo)", "AMH", "FSH", "LH", "Œstradiol", "TSH", "Vitamine D", "Vitamine B12", "Ferritine", "Autre"])}</div>
  ${field("bAutre", "Si « Autre », nom de l'examen")}
  <div class="row">${field("bVal", "Valeur", "number", "0", 'step="0.01"')}${field("bUnite", "Unité (ex : %, g/L, ng/mL)")}</div>
  ${field("bNote", "Note (facultatif)")}${btn("💾 Enregistrer ce résultat", "savebilan")}`;
  if (b.length) {
    const ex = [...new Set(b.map((r) => String(r.Examen)))].sort(), cur = ex.includes(S.bilanVoir) ? S.bilanVoir : ex[0];
    const s = b.filter((r) => String(r.Examen) === cur && num(r.Valeur) !== null).sort((a, c) => a.Date.localeCompare(c.Date));
    h += `${sel("bVoir", "Voir l'évolution de :", ex, cur)}${s.length >= 2 ? `<div class="chart" style="height:220px"><canvas id="chBilan"></canvas></div>` : ""}${fold("📋 Tous les résultats (" + s.length + ")", table(["Date", "Examen", "Valeur", "Unité", "Note"], [...s].reverse()))}`;
  }
  return h;
}

function renderConseils() {
  const jour = S.chkDate || today(), saved = (cfg(2).jours || {})[jour] || {};
  let h = `<h3>🩸 Quand faire ma glycémie ?</h3><details open><summary>📅 Repères pré-diabète et grossesse</summary>
  <p><b>En pré-diabète (hors grossesse)</b></p><ul><li>En général, pas besoin de se piquer tous les jours, sauf si ton médecin te le demande.</li><li>Prise de sang à jeun et HbA1c : le plus souvent <b>1 fois par an</b>, ou tous les 3 à 6 mois si ton médecin le décide.</li><li>Contrôles à la maison : <b>le matin à jeun</b>, ou <b>2 h après le début du repas</b>.</li><li>À jeun : moins de 1,00 g/L = normal. De 1,00 à 1,25 g/L = pré-diabète. À partir de 1,26 g/L (confirmé) = diabète.</li></ul>
  <p><b>Si tu es enceinte (SOPK et pré-diabète = facteurs de risque)</b></p><ul><li>Glycémie à jeun souvent demandée <b>dès le début de grossesse</b>.</li><li>Test <b>HGPO</b> entre <b>24 et 28 SA</b>, parfois plus tôt.</li><li>Objectifs fréquents : à jeun moins de 0,95 g/L, 2 h après repas moins de 1,20 g/L.</li></ul>
  <p><b>Consulte sans attendre :</b> soif intense, urines très fréquentes, fatigue inhabituelle, vision floue, ou glycémie très élevée.</p></details>
  <details><summary>🥦 Conseils nutrition (SOPK et résistance à l'insuline)</summary><ul><li>Commence le repas par les <b>légumes</b> et les fibres, puis les protéines, puis les féculents.</li><li><b>3 repas réguliers</b>, sans en sauter.</li><li>Féculents <b>complets</b> en portion modérée.</li><li>Évite les boissons sucrées et les jus : bois de l'<b>eau</b> (environ 1,5 L par jour).</li><li>Associe un aliment sucré à des protéines ou des fibres.</li><li>Limite les produits ultra-transformés.</li><li>En grossesse : pas de viande, poisson ou œuf <b>cru ou peu cuit</b>, pas de fromage au lait cru, pas d'alcool.</li></ul></details>
  <details><summary>🚶 Sport et marche</summary><ul><li><b>Marche 10 à 15 minutes après chaque repas</b> : très efficace contre les pics de glycémie.</li><li>Environ <b>150 minutes par semaine</b> d'activité modérée, à adapter à tes douleurs et ta fatigue.</li><li><b>2 séances par semaine</b> de renforcement léger.</li><li>Avec la fibromyalgie : <b>commence doucement, augmente progressivement</b>.</li><li>En grossesse : sport doux. <b>Arrête et consulte</b> en cas de saignements, douleurs, contractions, vertiges ou essoufflement anormal.</li></ul></details>
  <details><summary>🧘 Kiné et fibromyalgie</summary><ul><li><b>Kiné</b> : mobilisation douce, étirements, massage adapté.</li><li><b>Gestion de l'énergie</b> : fractionne tes activités, fais des pauses avant d'être épuisée.</li><li><b>Chaleur</b> : bouillotte, douche ou bain chaud.</li><li><b>Sommeil</b> : horaires réguliers, 7 à 9 h.</li><li><b>Jours de crise</b> : réduis l'effort mais reste active en douceur.</li></ul></details>
  <hr><h3>✅ Mes conseils : fait ou pas fait ?</h3>${dateField("kDate", "🗓️ Jour à remplir", jour, today())}`;
  for (const [t, items] of Object.entries(CHECKS)) h += `<p><b>${t}</b></p>` + items.map(([k, tx]) => chk("k_" + k, tx, !!saved[k], 'data-k="1"')).join("");
  const nbf = Object.values(CHECKS).flat().filter(([k]) => saved[k]).length;
  h += `<div id="kBar">${bar(nbf / NB_CHECKS)}<p class="muted">${nbf} conseil(s) fait(s) sur ${NB_CHECKS} le ${jour}</p></div>${btn("💾 Enregistrer mes cases", "savechk")}`;
  const tj = cfg(2).jours || {};
  if (Object.keys(tj).length) h += `<h4>📊 Mes derniers jours</h4>${table(["Date", "Conseils faits", "Sur"], Object.keys(tj).sort().reverse().slice(0, 14).map((d) => ({ Date: d, "Conseils faits": Object.values(tj[d]).filter(Boolean).length, Sur: NB_CHECKS })))}`;
  return h + `<p class="muted">Ces conseils sont généraux. Ton médecin, ta sage-femme, ton kiné ou ta diététicienne les adaptent à ton cas.</p>`;
}

function afterHealth() {
  const upd2 = () => { if ($("gAdvice")) $("gAdvice").innerHTML = glycAdvice(); };
  ["gVal", "gMoment", "gEnc", "gMal"].forEach((id) => $(id) && $(id).addEventListener("input", () => { S.enceinte = ck("gEnc"); if (id === "gMal") $("gMalSym").style.display = ck("gMal") ? "block" : "none"; upd2(); }));
  upd2();
  const imc = () => { const k = num(val("pKg")), t = num(val("pTaille")); if ($("pImc") && k && t) $("pImc").textContent = "IMC pour ce poids : " + r1(k / ((t / 100) ** 2)); };
  ["pKg", "pTaille"].forEach((id) => $(id) && $(id).addEventListener("input", imc)); imc();
  document.querySelectorAll("[data-k]").forEach((e) => e.addEventListener("change", () => {
    const n = Object.values(CHECKS).flat().filter(([k]) => ck("k_" + k)).length;
    $("kBar").innerHTML = bar(n / NB_CHECKS) + `<p class="muted">${n} conseil(s) fait(s) sur ${NB_CHECKS} le ${dval("kDate")}</p>`;
  }));

  const g = rows("suivi_glycemie").slice().sort((a, b) => a.Date.localeCompare(b.Date));
  if ($("chGJ")) {
    const enc = S.enceinte || S.set.parcours === PARCOURS[1], sj = enc ? 0.95 : 1.0, sp = enc ? 1.2 : 1.4;
    const days = { "14 derniers jours": 14, "30 derniers jours": 30, "3 derniers mois": 92, Tout: 99999 }[S.gRange || "30 derniers jours"] || 30;
    const gf = g.filter((r) => diffDays(today(), r.Date) < days);
    const FR = { "Matin à jeun": 0.3, "2h après le petit-déjeuner": 0.42, "2h après le déjeuner": 0.58, "2h après le dîner": 0.84, "1h après un mauvais résultat": 0.92 };
    const frac = (r, jeun) => FR[r.Moment] ?? (jeun ? 0.3 : 0.58);
    const mk = (id, key, hi, color, jeun) => {
      const d = gf.map((r) => ({ x: dayNum(r.Date) + frac(r, jeun), y: gv(r[key]), m: r.Moment || (jeun ? "Matin à jeun" : "Après repas"), d: r.Date, repas: r["Repas mangé"] })).filter((p) => p.y !== null);
      const all = d.map((p) => p.y), ymin = Math.min(0.6, ...(all.length ? all : [0.6])) - 0.05, ymax = Math.max(hi + 0.25, ...(all.length ? all : [0])) + 0.1;
      lineChart(id, [{ label: "g/L", data: d, borderColor: color, backgroundColor: color, borderWidth: 2.5, tension: 0.3, pointRadius: 5, pointHoverRadius: 8, pointBorderColor: "#fff", pointBorderWidth: 1.5, pointBackgroundColor: d.map((p) => (p.y < 0.7 ? "#4a7fd6" : p.y >= hi ? "#e8914f" : "#2e9d5b")) }],
        { ymin: Math.max(0, ymin), ymax, ytitle: "g/L", tipLabel: (it) => `${it.raw.y} g/L · ${it.raw.m}${it.raw.repas ? " · " + it.raw.repas : ""}`, bands: [{ from: 0.7, to: hi, color: "rgba(46,157,91,.14)", label: "zone cible", text: "#2e7d4f" }, { from: hi, to: hi + 0.012, color: "rgba(232,145,79,.55)" }] });
      charts[id].options.plugins.legend.display = false; charts[id].update();
    };
    mk("chGJ", "Glycémie à jeun", sj, "#d2577d", true); mk("chGP", "Glycémie Post-Prandiale", sp, "#8d6bc2", false);
    const MOM = Object.keys(FR), moy = MOM.map((m) => { const v = gf.filter((r) => r.Moment === m).map((r) => gv(r["Glycémie à jeun"]) ?? gv(r["Glycémie Post-Prandiale"])).filter((x) => x !== null); return v.length ? r1(avg(v), 2) : null; });
    drawChart("chGM", { type: "bar", data: { labels: MOM.map((m) => m.replace("2h après le ", "2 h après ").replace("1h après un mauvais résultat", "1 h après un mauvais résultat")), datasets: [{ label: "Moyenne g/L", data: moy, backgroundColor: moy.map((v, i) => (v === null ? "#ccc" : v < 0.7 ? "#4a7fd6" : v >= (i === 0 ? sj : sp) ? "#e8914f" : "#2e9d5b")), borderRadius: 10 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, title: { display: true, text: "g/L" } } } } });
  }

  const p = rows("suivi_poids").map((r) => ({ d: r.Date, kg: num(r["Poids (kg)"]) })).filter((r) => r.kg !== null).sort((a, b) => a.d.localeCompare(b.d));
  if ($("chPoids") && p.length) {
    const moy = p.map((r) => { const w = p.filter((x) => diffDays(r.d, x.d) >= 0 && diffDays(r.d, x.d) < 28); return { x: dayNum(r.d), y: r1(avg(w.map((x) => x.kg)), 2) }; });
    lineChart("chPoids", [
      { label: "Poids (kg)", data: p.map((r) => ({ x: dayNum(r.d), y: r.kg })), borderColor: "#e377c2", backgroundColor: "#e377c2", tension: 0 },
      { label: "Moyenne 4 semaines", data: moy, borderColor: "#444", borderDash: [5, 3], pointRadius: 0, tension: 0 },
    ], { ytitle: "kg" });
  }
  if ($("chBilan")) {
    const cur = val("bVoir"), s = rows("resultats_bilans").filter((r) => String(r.Examen) === cur && num(r.Valeur) !== null).sort((a, c) => a.Date.localeCompare(c.Date));
    lineChart("chBilan", [{ label: cur, data: s.map((r) => ({ x: dayNum(r.Date), y: num(r.Valeur) })), borderColor: "#9467bd", backgroundColor: "#9467bd", tension: 0 }]);
  }
}

const ACT_HEALTH = {
  async savemat() { if (await saveCfg(3, { bandelettes: parseInt(val("mBand")) || 0, aiguilles: parseInt(val("mAig")) || 0, seuil: parseInt(val("mSeuil")) || 10 })) { toast("🎉 Matériel enregistré !"); render(); } },
  async saveglyc() {
    const v = num(val("gVal")); if (v === null) return toast("Entre une valeur.");
    const mode = val("gMoment"), jeun = mode === "Matin à jeun", txt = v + " g/L", refait = ck("gRefait"), mal = ck("gMal");
    const row = { Date: val("gDate"), "Glycémie à jeun": jeun ? txt : "-", "Glycémie Post-Prandiale": jeun ? "-" : txt, Moment: mode, "Repas mangé": val("gRepas"), "Contrôle de vérification": refait ? `${val("gCtrl")} g/L (${val("gDelai")})` : "", Malaise: mal ? "Oui" : "Non", "Symptômes Malaise": picked("gms").join(", ") };
    if (await ins("suivi_glycemie", row)) {
      const m = { bandelettes: 0, aiguilles: 0, seuil: 10, ...cfg(3) }, c = refait ? 2 : 1;
      m.bandelettes = Math.max(0, +m.bandelettes - c); m.aiguilles = Math.max(0, +m.aiguilles - c);
      await saveCfg(3, m); toast("🎉 Taux enregistré !"); render();
    }
  },
  async delglyc() { const m = val("gDel").match(/n°(\d+)/); if (m && confirm("Supprimer cette mesure ?") && await del("suivi_glycemie", [+m[1]])) render(); },
  async savepoids() {
    const ctx = picked("pctx"), note = [ctx.join(", "), val("pNote")].filter(Boolean).join(" | "), tour = num(val("pTour"));
    if (await ins("suivi_poids", { Date: val("pDate"), "Poids (kg)": num(val("pKg")), Note: note, "Taille (cm)": parseInt(val("pTaille")), "Tour de taille (cm)": tour > 0 ? tour : null })) { toast("🎉 Pesée enregistrée !"); render(); }
  },
  async saveobj() { if (await saveCfg(5, { objectif_poids: num(val("pObj")) || 0 })) { toast("Objectif enregistré"); render(); } },
  async delpoids() { const m = val("pDel").match(/n°(\d+)/); if (m && confirm("Supprimer cette pesée ?") && await del("suivi_poids", [+m[1]])) render(); },
  async savebilan() {
    const nom = val("bExam") === "Autre" && val("bAutre").trim() ? val("bAutre").trim() : val("bExam");
    if (await ins("resultats_bilans", { Date: val("bDate"), Examen: nom, Valeur: num(val("bVal")), "Unité": val("bUnite"), Note: val("bNote") })) { toast("🎉 Résultat enregistré !"); render(); }
  },
  async savechk() {
    const jour = dval("kDate"), etat = {}; Object.values(CHECKS).flat().forEach(([k]) => (etat[k] = ck("k_" + k)));
    const j = { ...(cfg(2).jours || {}) }; j[jour] = etat;
    if (await saveCfg(2, { jours: j })) { toast("🎉 Cases enregistrées !"); render(); }
  },
};
const CHG_HEALTH = {
  bVoir(el) { S.bilanVoir = el.value; render(); },
  gRange(el) { S.gRange = el.value; render(); },
  kDate(el) { S.chkDate = !el.value || el.value > today() ? today() : el.value; render(); },
};

// ---------- Onglet 5 : Douleur, fatigue, sommeil ----------
function renderDouleur() {
  const d = rows("suivi_douleur_fatigue");
  let h = `<h2>🧘 Douleur, fatigue et sommeil</h2><p class="muted">Quelques secondes par jour. Ça aide tes médecins et ton kiné à voir ce qui change selon ton cycle, ton sommeil et tes efforts.</p>
  ${field("dfDate", "🗓️ Jour", "date", today(), `max="${today()}"`)}
  <div class="row"><div><label class="f">Douleur : <b id="o1">3</b>/10</label><input id="dfD" type="range" min="0" max="10" value="3"><label class="f">Fatigue : <b id="o2">4</b>/10</label><input id="dfF" type="range" min="0" max="10" value="4"></div>
  <div>${field("dfH", "Heures de sommeil", "number", "7", 'step="0.5" min="0" max="16"')}<label class="f">Qualité du sommeil : <b id="o3">5</b>/10</label><input id="dfQ" type="range" min="0" max="10" value="5"></div></div>
  <p><b>Où as-tu mal ? (fibromyalgie)</b></p>${checks("dz", ["Nuque", "Épaules", "Dos", "Hanches", "Bras", "Mains", "Jambes", "Pieds", "Tête"])}
  <p><b>Symptômes d'endométriose aujourd'hui</b></p>${checks("de", ["Douleurs pelviennes", "Règles douloureuses", "Douleurs pendant les rapports", "Douleurs en allant à la selle", "Douleurs urinaires", "Ballonnements importants", "Douleurs dans le dos / les jambes"])}
  ${field("dfNote", "Note (facultatif)")}<div id="dfWarn"></div>
  <p class="muted">Douleur dans la poitrine, essoufflement inhabituel ou malaise : appelle le 15.</p>${btn("💾 Enregistrer ce jour", "savedf")}`;
  if (d.length) {
    const byDay = {};
    d.forEach((r) => { (byDay[r.Date] = byDay[r.Date] || []).push(r); });
    const jm = Object.entries(byDay).sort().map(([dt, a]) => { const m = (c) => { const v = a.map((r) => num(r[c])).filter((x) => x !== null); return v.length ? avg(v) : null; }; return { dt, dou: m("Douleur (0-10)"), fat: m("Fatigue (0-10)"), q: m("Qualité sommeil (0-10)"), h: m("Sommeil (h)") }; });
    const t = today(), s1 = jm.filter((x) => diffDays(t, x.dt) < 7), s0 = jm.filter((x) => diffDays(t, x.dt) >= 7 && diffDays(t, x.dt) < 14);
    const met = (lib, k, inv) => { const a = s1.map((x) => x[k]).filter((v) => v !== null); if (!a.length) return ""; const m1 = avg(a), b = s0.map((x) => x[k]).filter((v) => v !== null); const dl = b.length ? r1(m1 - avg(b)) : null; return metric(lib, r1(m1) + (dl !== null ? ` <small>(${dl > 0 ? "+" : ""}${dl})</small>` : "")); };
    h += `<h4>📊 Cette semaine comparée à la précédente</h4><div class="metrics">${met("Douleur", "dou")}${met("Fatigue", "fat")}${met("Sommeil (h)", "h")}</div>
    <div class="chart"><canvas id="chDf"></canvas></div><p class="muted">Traits rouges = début de tes règles : regarde si la douleur ou la fatigue montent à certains moments du cycle.</p>
    ${fold("📋 Mes 14 derniers enregistrements", table(["Date", "Douleur (0-10)", "Fatigue (0-10)", "Sommeil (h)", "Qualité sommeil (0-10)", "Zones douloureuses", "Symptômes endométriose", "Note"], [...d].sort((a, b) => b.Date.localeCompare(a.Date)).slice(0, 14)))}`;
    S.jm = jm;
  } else h += `<p class="muted">Aucun enregistrement pour le moment.</p>`;
  return h;
}
function afterDouleur() {
  [["dfD", "o1"], ["dfF", "o2"], ["dfQ", "o3"]].forEach(([i, o]) => $(i) && $(i).addEventListener("input", () => { $(o).textContent = val(i); $("dfWarn").innerHTML = +val("dfD") >= 8 ? box("warn", "Douleur très forte : repose-toi, utilise la chaleur, et préviens ton médecin si ça dure ou si c'est nouveau.") : ""; }));
  if ($("chDf") && S.jm) {
    const mk = (lbl, k, c) => ({ label: lbl, data: pts(S.jm, (r) => dayNum(r.dt), (r) => r[k]), borderColor: c, backgroundColor: c, tension: 0 });
    lineChart("chDf", [mk("Douleur", "dou", "#d62728"), mk("Fatigue", "fat", "#ff7f0e"), mk("Qualité sommeil", "q", "#1f77b4")], { ymin: 0, ymax: 10, ytitle: "0 à 10", vlines: regles().map((d) => ({ x: dayNum(d) })) });
  }
}
const ACT_DF = {
  async savedf() {
    if (await ins("suivi_douleur_fatigue", { Date: val("dfDate"), "Douleur (0-10)": +val("dfD"), "Fatigue (0-10)": +val("dfF"), "Sommeil (h)": num(val("dfH")), "Qualité sommeil (0-10)": +val("dfQ"), "Zones douloureuses": picked("dz").join(", "), "Symptômes endométriose": picked("de").join(", "), Note: val("dfNote") })) { toast("🎉 Enregistré !"); render(); }
  },
};
