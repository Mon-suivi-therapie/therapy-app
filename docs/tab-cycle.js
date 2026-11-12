// ===== Onglet 2 : Suivi féminin (cycle) + Onglet 3 : Rendez-vous =====
const RESULTATS_TEST = [
  "Négatif (pas de ligne test ou ligne très faible)",
  "Ligne test visible mais plus claire que le contrôle",
  "Presque positif (presque aussi foncée que le contrôle)",
  "🥚 Pic LH (positif) : ligne test aussi foncée ou plus foncée que le contrôle",
];

function ovulationEstimee() {
  const c = rows("cycle_temperature").map((r) => ({ d: r.Date, t: num(r["Température"]) })).filter((r) => r.t !== null).sort((a, b) => a.d.localeCompare(b.d));
  let hausse = null;
  if (c.length >= 9) {
    for (let i = 6; i < c.length - 2; i++) {
      const base = Math.max(...c.slice(i - 6, i).map((x) => x.t));
      if (c[i].t > base && c[i + 1].t > base && c[i + 2].t >= base + 0.2) hausse = c[i].d;
    }
  }
  return { n: c.length, hausse, ovul: hausse ? addDays(hausse, -1) : null };
}

function renderCycleEssai() {
  const cyc = rows("cycle_temperature");
  let h = `<h2>🌸 Suivi de Cycle, Courbe &amp; Probabilité SOPK</h2>
  ${field("cDate", "🗓️ Date de l'événement", "date", today())}
  <div class="row">${sel("cStatus", "Statut du jour", ["Aucun Status", "🩸 Début des Règles", "❌ Fin des Règles", "💧 Spotting (Pertes)", "🥚 Test d'Ovulation Positif"])}
  ${field("cTemp", "Température basale (°C)", "number", "36.5", 'step="0.05" min="35" max="41"')}</div>
  ${chk("cRap", "💞 Rapport sexuel ce jour-là")}
  ${field("cNote", "Notes particulières")}
  ${btn("📊 Enregistrer cette journée", "savecycle")}<hr>
  <h3>🥚 Mes tests d'ovulation</h3>`;

  const rg = regles();
  if (rg.length) {
    const cm = cycleMoyen(), der = rg[rg.length - 1];
    const deb = addDays(der, 9), fin = addDays(der, Math.max(cm.val - 10, 14)), jc = diffDays(today(), der) + 1;
    h += `<p><b>📅 Quand faire les tests ?</b><br>• Tu es au <b>jour ${jc}</b> de ton cycle (cycle moyen estimé : <b>${cm.val} jours</b>${cm.n ? "" : ", valeur par défaut faute d'historique"}).<br>• <b>Période conseillée :</b> du <b>${fr(deb)}</b> (jour 10) au <b>${fr(fin)}</b>, ou jusqu'au premier pic.</p>`;
    if (today() < deb) h += box("info", `⏳ Pas encore : commence dans ${diffDays(deb, today())} jour(s).`);
    else if (today() <= fin) h += box("ok", "✅ C'est la période des tests : fais-en un aujourd'hui (une fois par jour, toujours à la même heure).");
    else h += box("info", "La période conseillée est passée. Si tu n'as pas eu de pic, continue ta courbe de température et parles-en à ton médecin si tes cycles sont très longs.");
  } else h += box("info", "💡 Enregistre un jour avec le statut « 🩸 Début des Règles » pour que l'appli calcule tes dates de tests. En attendant : commence vers le jour 10 de ton cycle.");

  h += `<details><summary>ℹ️ Comment bien faire le test et reconnaître un pic</summary><ul>
  <li><b>Une fois par jour</b>, toujours à la même heure, plutôt <b>entre 10 h et 20 h</b>. Évite la première urine du matin.</li>
  <li><b>Bois peu pendant les 2 heures avant</b> le test.</li>
  <li>Lis le résultat <b>dans le délai du mode d'emploi</b> (souvent 5 minutes).</li>
  <li>Quand la ligne test se rapproche du contrôle, fais <b>2 tests par jour</b>.</li>
  <li><b>Pic (positif)</b> : ligne test aussi foncée ou plus foncée que le contrôle. Ovulation en général <b>12 à 36 h</b> après. Rapports le jour du pic et le lendemain.</li>
  <li><b>Avec un SOPK</b>, la LH est souvent élevée en permanence : lignes foncées possibles <b>sans ovulation</b>. La <b>courbe de température</b> confirme l'ovulation après coup.</li></ul></details>
  <div class="row">${field("tDate", "🗓️ Date du test", "date", today(), `max="${today()}"`)}${field("tHeure", "Heure du test", "text", "", 'placeholder="15:00"')}</div>
  <h4>📸 Photo du test (facultatif) : l'appli estime si c'est un pic</h4>
  <p class="muted">Recadre la photo sur la fenêtre de lecture, avec les deux lignes bien visibles, en pleine lumière, sans reflet ni ombre. Le résultat est une estimation : vérifie toujours à l'œil.</p>
  ${sel("tPos", "Sur ta photo, où est la ligne de contrôle (C) ?", ["En haut", "En bas", "À droite", "À gauche"], S.tPos || "En haut")}
  <div class="row"><div><label class="f" for="tFile">📁 Importer une photo</label><input id="tFile" type="file" accept="image/*"></div>
  <div><label class="f" for="tCam">📷 Prendre la photo avec l'appareil</label><input id="tCam" type="file" accept="image/*" capture="environment"></div></div>
  <div id="tPhotoOut"></div>
  ${sel("tRes", "Résultat du test (tu peux corriger l'estimation)", RESULTATS_TEST)}
  <div id="tAdvice"></div>
  ${field("tNote", "Note (facultatif)")}
  ${btn("🥚 Enregistrer ce test", "savetest")}`;

  const tests = rows("tests_ovulation");
  if (tests.length) {
    const sorted = [...tests].sort((a, b) => b.Date.localeCompare(a.Date)), avecPhoto = sorted.filter((r) => String(r.Photo || "").length > 10);
    h += `<h4>📋 Mes tests</h4>`;
    if (tests.filter((r) => num(r.Ratio) !== null).length >= 2) h += `<div class="chart" style="height:220px"><canvas id="chTests"></canvas></div><p class="muted">Zone rouge = ligne test aussi foncée que le contrôle (pic). Au-dessus ou dans la zone = pic.</p>`;
    h += fold(`Tous mes tests (${tests.length})`, table(["Date", "Heure", "Résultat", "Ratio", "Interprétation", "Note"], sorted) + `<div class="row"><div>${sel("tDel", "Supprimer un test", sorted.map((r) => `${r.Date} ${r.Heure || ""} (n°${r.id})`))}${btn("🚨 Supprimer ce test", "deltest", "del")}</div></div>`);
    if (avecPhoto.length) h += fold("📸 Revoir une photo", sel("tPh", "Choisir un test", avecPhoto.map((r) => `${r.Date} ${r.Heure || ""} (n°${r.id})`)) + `<img id="tPhImg" alt="Photo du test" style="max-width:300px;border-radius:12px;margin-top:8px" src="data:image/jpeg;base64,${avecPhoto[0].Photo}">`);
  }
  h += `<hr>`;

  if (cyc.length) {
    h += `<h3>🌡️ Ma courbe de température</h3><div class="chart"><canvas id="chCycle"></canvas></div><div id="chCmpWrap"></div>
    <h3>🔮 Analyse de ton Cycle &amp; Fertilité SOPK</h3>`;
    const o = ovulationEstimee();
    h += `<h4>🌡️ Ovulation estimée selon ta courbe</h4>`;
    if (o.ovul) h += box("ok", `🥚 Hausse de température détectée à partir du ${fr(o.hausse)}. Ovulation probable vers le <b>${fr(o.ovul)}</b> (à 1 jour près).`);
    else if (o.n < 9) h += box("info", `Il faut au moins 9 températures enregistrées pour détecter une hausse. Tu en as ${o.n}.`);
    else h += box("info", "Pas de hausse nette détectée pour le moment. Continue à prendre ta température chaque matin.");

    const tri = cyc.filter((r) => num(r["Température"]) !== null).sort((a, b) => a.Date.localeCompare(b.Date));
    const lim = addDays(today(), -5);
    const pic = tests.some((r) => r.Date >= lim && String(r["Résultat"]).startsWith("🥚 Pic"));
    const testRecent = tri.slice(-5).some((r) => r["Cycle Status"] === "🥚 Test d'Ovulation Positif") || pic;
    const rapRecent = tri.slice(-3).some((r) => r["Rapport Sexuel"] === "Oui");
    const rap5 = tri.slice(-5).some((r) => r["Rapport Sexuel"] === "Oui");
    let chance = ["10% - 15%", "Phase standard / d'attente"];
    if (testRecent && rapRecent) chance = ["85% - 95%", "Optimale (Rapport + Test OK)"];
    else if (o.ovul && rap5) chance = ["60% - 75%", "Très bonne (Hausse thermique validée)"];
    h += `<div class="metrics">${metric("Chances de conception estimées", chance[0] + `<br><small>${chance[1]}</small>`)}</div>`;

    h += `<h4>📅 Mon Calendrier Prédictif du Cycle</h4>`;
    if (rg.length) {
      const der = rg[rg.length - 1]; let pr, df, ff, jt;
      if (o.ovul) { pr = addDays(o.ovul, 14); df = addDays(o.ovul, -4); ff = addDays(o.ovul, 1); jt = addDays(o.ovul, 14); }
      else { pr = addDays(der, 35); df = addDays(pr, -18); ff = addDays(pr, -14); jt = pr; }
      h += `<ul><li>🩸 <b>Prochaines règles estimées :</b> autour du <b>${fr(pr)}</b>.</li><li>🥚 <b>Prochaine fenêtre de fertilité :</b> du <b>${fr(df)}</b> au <b>${fr(ff)}</b>.</li><li>🧪 <b>Date idéale test de grossesse :</b> à partir du <b>${fr(jt)}</b>.</li></ul>`;
    } else h += `<p class="muted">💡 Ajoute un événement « 🩸 Début des Règles » pour activer les prédictions.</p>`;
  }
  return h;
}

function afterCycle() {
  const adv = () => {
    const v = val("tRes"); let t = "";
    if (v.startsWith("🥚 Pic")) t = box("ok", "🎉 Pic détecté ! Ovulation attendue dans les 12 à 36 heures : rapports aujourd'hui et demain. Note aussi ta température chaque matin.");
    else if (v.startsWith("Presque")) t = box("warn", "⏳ Presque : refais un test dans 4 à 6 heures (ou ce soir).");
    else if (v.startsWith("Ligne test visible")) t = box("info", "📈 La LH monte. Continue les tests, 2 fois par jour maintenant.");
    else t = `<p class="muted">Pas de pic pour le moment. Continue les tests à la même heure chaque jour.</p>`;
    if ($("tAdvice")) $("tAdvice").innerHTML = t;
  };
  if ($("tRes")) { adv(); $("tRes").addEventListener("change", adv); }
  if (S.photo) showPhoto();
  if (typeof afterGrossesse === "function") afterGrossesse();
  const tn = rows("tests_ovulation").filter((r) => num(r.Ratio) !== null).sort((a, b) => (a.Date + (a.Heure || "")).localeCompare(b.Date + (b.Heure || "")));
  if ($("chTests") && tn.length >= 2) {
    lineChart("chTests", [{ label: "Ligne test / contrôle", data: tn.map((r, i) => ({ x: dayNum(r.Date) + i * 0.001, y: num(r.Ratio) })), borderColor: "#9467bd", backgroundColor: "#9467bd", tension: 0.3, pointRadius: 5 }], { ymin: 0, ytitle: "Ratio", bands: [{ from: 1, to: 5, color: "rgba(220,60,80,.13)", label: "pic", text: "#b71c1c" }] });
    charts.chTests.options.plugins.legend.display = false; charts.chTests.update();
  }

  const cyc = rows("cycle_temperature").map((r) => ({ d: r.Date, t: num(r["Température"]) })).filter((r) => r.t !== null).sort((a, b) => a.d.localeCompare(b.d));
  if (!$("chCycle") || !cyc.length) return;
  const rg = regles(), nOf = (d) => rg.filter((x) => x <= d).length;
  const label = (n) => (n === 0 ? "Avant le 1er cycle noté" : `Cycle ${n} (début ${fr2(rg[n - 1])})`);
  const groups = {};
  cyc.forEach((r) => { const n = nOf(r.d); (groups[n] = groups[n] || []).push(r); });
  const ds = Object.entries(groups).map(([n, a], i) => ({ label: label(+n), data: a.map((r) => ({ x: dayNum(r.d), y: r.t })), borderColor: PALETTE[i % 8], backgroundColor: PALETTE[i % 8], tension: 0, pointRadius: 3 }));
  lineChart("chCycle", ds, { ymin: 35, ymax: 37.5, ytitle: "°C Basale", vlines: rg.map((d) => ({ x: dayNum(d), label: "🩸" })) });
  const cmp = Object.entries(groups).filter(([n]) => +n >= 1);
  if (cmp.length >= 2) {
    $("chCmpWrap").innerHTML = `<details><summary>🔍 Comparer mes cycles (superposés : jour 1 = début des règles)</summary><div class="chart"><canvas id="chCmp"></canvas></div></details>`;
    const ds2 = cmp.map(([n, a], i) => ({ label: label(+n), data: a.map((r) => ({ x: diffDays(r.d, rg[n - 1]) + 1, y: r.t })), borderColor: PALETTE[i % 8], backgroundColor: PALETTE[i % 8], tension: 0, pointRadius: 3 }));
    lineChart("chCmp", ds2, { ymin: 35, ymax: 37.5, ytitle: "°C Basale", xnum: true });
  }
}

// ---------- Rendez-vous ----------
function renderRdv() {
  const rp = rows("rdv_a_prendre"), rdv = rows("rdv_medicaux").map((r) => ({ ...r, Statut: r.Statut || "À venir" })).sort((a, b) => a.Date.localeCompare(b.Date));
  const lbl = (r) => `${r.Date} - ${r["Médecin / Spécialité"] || ""} (n°${r.id})`;
  let h = `<h2>📅 Gestion de tes Rendez-vous</h2>${questionsRapides()}<hr><h3>📞 RDV à reprendre</h3>
  <p class="muted">Les rendez-vous que tu dois encore prendre (kiné, échographie cardiaque...). Une étape à la fois.</p>
  <div class="row">${sel("rpSpec", "Spécialité", ["Kiné", "Échographie cardiaque / cardiologue", "Gynécologue / équipe PMA", "Endocrinologue / diabétologue", "Médecin traitant", "Autre"])}${field("rpTel", "Téléphone (facultatif)")}</div>
  ${field("rpAutre", "Si « Autre », précise la spécialité")}${field("rpPourquoi", "Pour quoi ? (ordonnance, contrôle...)")}
  ${btn("➕ Ajouter à ma liste", "addrp")}
  ${rp.length ? `<p class="muted">Change « Statut » : À appeler, Appelé, RDV pris, Fait.</p>${editable("rdv_a_prendre", rp, { choix: { Statut: ["À appeler", "Appelé", "RDV pris", "Fait"] } })}` : ""}<hr>
  <div class="row">${field("rDate", "Date du RDV", "date", today())}${field("rTime", "Heure", "text", "", 'placeholder="14:30"')}</div>
  ${field("rDoc", "Médecin / Spécialité", "text", "", 'placeholder="Gynécologue"')}${field("rPlace", "🏢 Lieu / Adresse du RDV")}
  ${btn("📌 Ajouter ce rendez-vous", "addrdv")}`;
  if (rdv.length) {
    h += fold(`📋 Mes rendez-vous (${rdv.length})`, table(["Date", "Heure", "Médecin / Spécialité", "Lieu", "Notes", "Statut", "Compte-rendu"], rdv), true);
    const av = rdv.filter((r) => r.Statut !== "✅ Effectué");
    h += `<h4>✅ Mon rendez-vous a eu lieu ?</h4>`;
    if (!av.length) h += `<p class="muted">Tous tes rendez-vous sont marqués comme effectués.</p>`;
    else h += `${sel("vSel", "Quel rendez-vous ?", av.map(lbl))}${chk("vOk", "✅ Le rendez-vous a eu lieu")}${area("vCr", "📝 Comment ça s'est passé ? (ce que le médecin a dit, examens, ordonnance, prochain RDV...)")}${btn("💾 Enregistrer le compte-rendu", "rdvdone")}`;
    h += `<p class="muted">Pour corriger ou supprimer un rendez-vous, utilise l'onglet « Historique &amp; Corrections ».</p>`;
  }
  h += `<details><summary>🧳 Préparer mon rendez-vous (questions, documents, besoins)</summary><p><b>🎒 À emporter :</b></p>
  ${["Carte vitale et carte de mutuelle", "Ordonnances et liste de mes traitements", "Derniers résultats (prises de sang, échographies, comptes rendus)", "Ma fiche pour les médecins", "Mon carnet de glycémie et de température", "De l'eau, une collation et mon téléphone chargé"].map((t, i) => chk("prep" + i, t)).join("")}
  ${cfg(4).besoins ? `<p><b>🗣️ Ce que je veux dire au médecin :</b></p>${box("info", esc(cfg(4).besoins))}` : `<p class="muted">Écris tes besoins dans l'onglet « Fiche pour mes médecins » : ils s'afficheront ici.</p>`}
  <hr>${questionsBlock("t3")}</details>`;
  return h;
}

const ACT_CYCLE = {
  async savecycle() {
    const ok = await ins("cycle_temperature", { Date: val("cDate"), "Cycle Status": val("cStatus"), "Température": parseFloat(val("cTemp")), "Rapport Sexuel": ck("cRap") ? "Oui" : "Non", Note: val("cNote"), "Mode Parcours": "Essai Bébé" });
    if (ok) { toast("🎉 Sauvegardé !"); render(); }
  },
  async savetest() {
    const an = S.photo?.an;
    const ok = await ins("tests_ovulation", { Date: val("tDate"), Heure: val("tHeure"), "Résultat": val("tRes"), Ratio: an && an.ratio !== null ? String(an.ratio) : "", "Interprétation": an ? an.message : "", Photo: S.photo?.b64 || "", Note: val("tNote") });
    if (ok) { S.photo = null; S.photoFile = null; toast("🎉 Test enregistré !"); render(); }
  },
  async deltest() { const m = val("tDel").match(/n°(\d+)/); if (m && confirm("Supprimer ce test ?") && await del("tests_ovulation", [+m[1]])) render(); },
  async addrp() {
    const spec = val("rpSpec") === "Autre" && val("rpAutre").trim() ? val("rpAutre").trim() : val("rpSpec");
    if (await ins("rdv_a_prendre", { "Spécialité": spec, "Pour quoi": val("rpPourquoi"), "Téléphone": val("rpTel"), Statut: "À appeler", "Date appel": "", Note: "" })) render();
  },
  async addrdv() {
    if (await ins("rdv_medicaux", { Date: val("rDate"), Heure: val("rTime"), "Médecin / Spécialité": val("rDoc"), Lieu: val("rPlace"), Notes: "" })) { toast("🎉 Rendez-vous ajouté !"); render(); }
  },
  async rdvdone() {
    if (!ck("vOk")) return toast("Coche d'abord « Le rendez-vous a eu lieu ».");
    const m = val("vSel").match(/n°(\d+)/); if (!m) return;
    if (await upd("rdv_medicaux", +m[1], { Statut: "✅ Effectué", "Compte-rendu": val("vCr") })) { await loadTables(["rdv_medicaux"]); toast("Rendez-vous marqué comme effectué !"); render(); }
  },
  async addq(el) {
    const p = el.dataset.p; if (!val(p + "q").trim()) return toast("Écris d'abord ta question.");
    if (await ins("questions_medecin", { Date: today(), Question: val(p + "q").trim(), Pour: val(p + "qp"), "Posée": "Non", "Réponse": "" })) render();
  },
};

// ---------- lecture de la photo du test ----------
const INDEX_RATIO = (r) => (r < 0.15 ? 0 : r < 0.6 ? 1 : r < 1 ? 2 : 3);
function rolling(a, win, fn) { const h = Math.floor(win / 2); return a.map((_, i) => fn(a.slice(Math.max(0, i - h), Math.min(a.length, i + h + 1)))); }
const median = (v) => { const s = [...v].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function analyserBandelette(bmp, pos) {
  const ang = { "À droite": 0, "À gauche": 180, "En haut": 90, "En bas": -90 }[pos] ?? 0;
  const sc = Math.min(1, 900 / Math.max(bmp.width, bmp.height)), bw = Math.round(bmp.width * sc), bh = Math.round(bmp.height * sc);
  const swap = Math.abs(ang) === 90, w = swap ? bh : bw, h = swap ? bw : bh;
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d");
  ctx.translate(w / 2, h / 2); ctx.rotate((ang * Math.PI) / 180); ctx.drawImage(bmp, -bw / 2, -bh / 2, bw, bh);
  if (w < 60 || h < 10) return { ok: false, message: "Photo trop petite ou mal cadrée.", ratio: null, profil: null };
  const px = ctx.getImageData(0, 0, w, h).data, y0 = Math.floor(h * 0.3), y1 = Math.floor(h * 0.7), prof0 = [];
  for (let x = 0; x < w; x++) { let s = 0; for (let y = y0; y < y1; y++) s += px[(y * w + x) * 4 + 1]; prof0.push(s / (y1 - y0)); }
  const lisse = rolling(prof0, 5, avg), fond = rolling(lisse, Math.max(31, Math.floor(w / 5)), median);
  const prof = fond.map((f, i) => Math.max(0, f - lisse[i])), marge = Math.max(3, Math.floor(w * 0.04));
  for (let i = 0; i < marge; i++) { prof[i] = 0; prof[w - 1 - i] = 0; }
  const seuil = Math.max(4, 0.03 * avg(fond)), maxl = rolling(prof, 15, (v) => Math.max(...v));
  const cand = []; for (let i = 0; i < w; i++) if (prof[i] >= seuil && prof[i] === maxl[i]) cand.push(i);
  let pics = []; cand.forEach((i) => { if (pics.length && i - pics[pics.length - 1] < 15) { if (prof[i] > prof[pics[pics.length - 1]]) pics[pics.length - 1] = i; } else pics.push(i); });
  if (pics.length > 2) pics = [...pics].sort((a, b) => prof[b] - prof[a]).slice(0, 2).sort((a, b) => a - b);
  const aire = (i) => prof.slice(Math.max(0, i - 8), i + 9).reduce((x, y) => x + y, 0);
  if (!pics.length) return { ok: false, message: "Aucune ligne détectée : photo trop floue, trop sombre, mal cadrée, ou test invalide.", ratio: null, profil: prof };
  if (pics.length === 1) return pics[0] > w * 0.5 ? { ok: true, message: "Une seule ligne détectée (côté contrôle) : pas de ligne test visible, donc test négatif.", ratio: 0, profil: prof } : { ok: false, message: "Une seule ligne détectée, côté test, sans ligne de contrôle : test invalide ou photo mal cadrée (vérifie le côté de la ligne de contrôle).", ratio: null, profil: prof };
  const at = aire(pics[0]), ac = aire(pics[1]); if (ac <= 0) return { ok: false, message: "Ligne de contrôle illisible.", ratio: null, profil: prof };
  const ratio = Math.round((at / ac) * 100) / 100;
  return { ok: true, message: `Ligne test = ${Math.round(ratio * 100)} % de la ligne de contrôle.`, ratio, profil: prof };
}
function miniature(bmp) {
  const sc = Math.min(1, 600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
  cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height); return cv.toDataURL("image/jpeg", 0.7).split(",")[1];
}
async function processPhoto(file) {
  if (file) S.photoFile = file; if (!S.photoFile) return;
  try { const bmp = await createImageBitmap(S.photoFile, { imageOrientation: "from-image" }); S.photo = { b64: miniature(bmp), an: analyserBandelette(bmp, val("tPos")) }; showPhoto(true); }
  catch (e) { toast("Analyse impossible : " + e.message); }
}
function showPhoto(setSel) {
  const o = $("tPhotoOut"); if (!o || !S.photo) return; const { b64, an } = S.photo;
  o.innerHTML = `<img src="data:image/jpeg;base64,${b64}" alt="Photo du test" style="max-width:300px;border-radius:12px">` +
    (an.ok ? box("info", `🔎 Estimation de l'appli : ${esc(an.message)} → <b>${esc(RESULTATS_TEST[INDEX_RATIO(an.ratio)])}</b>`) : box("warn", "🔎 " + esc(an.message))) +
    (an.profil ? fold("📈 Voir comment la photo a été lue", `<p class="muted">Les pics = les deux lignes. Plus le pic est haut, plus la ligne est foncée.</p><div class="chart" style="height:200px"><canvas id="chProf"></canvas></div>`) : "");
  if (setSel && an.ok && $("tRes")) { $("tRes").selectedIndex = INDEX_RATIO(an.ratio); $("tRes").dispatchEvent(new Event("change")); }
  if (an.profil && $("chProf")) { const d = an.profil.map((y, x) => ({ x, y })); drawChart("chProf", { type: "line", data: { datasets: [{ data: d, borderColor: "#9467bd", pointRadius: 0, fill: true, backgroundColor: "rgba(148,103,189,.2)" }] }, options: { parsing: false, responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { type: "linear" } } } }); }
}
const CHG_CYCLE = {
  tFile(el) { processPhoto(el.files[0]); }, tCam(el) { processPhoto(el.files[0]); },
  tPos(el) { S.tPos = el.value; processPhoto(); },
  tPh(el) { const m = el.value.match(/n°(\d+)/), r = rows("tests_ovulation").find((x) => m && x.id === +m[1]); if (r) $("tPhImg").src = "data:image/jpeg;base64," + r.Photo; },
};
