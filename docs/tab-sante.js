// ===== Mes maladies : liste des diagnostics + suivi des crises (migraine, endométriose, fibromyalgie, asthme/allergie, anxiété, nuits difficiles) =====
// config n°24 : { dx: [...], autre: "texte" }   config n°25 : { ep: [{ id, date, heure, type, i, duree, d, s, a, note }] }
S.epType = "Migraine"; S.epEdit = null;
const DX = ["SOPK", "Pré-diabète", "Endométriose", "Fibromyalgie / fatigue chronique", "Migraines", "Asthme", "Allergies", "Dépression / anxiété", "Troubles du sommeil", "Apnée du sommeil (appareillée)", "Syndrome rotulien (genou)", "TSA", "TDAH", "SPT"];
const DX_DEFAUT = ["SOPK", "Pré-diabète", "Endométriose", "Fibromyalgie / fatigue chronique", "Migraines", "Asthme", "Allergies", "Dépression / anxiété", "Troubles du sommeil", "Apnée du sommeil (appareillée)", "Syndrome rotulien (genou)"];
const EP = {
  "Migraine": { ic: "🤕", d: ["Stress", "Manque de sommeil", "Règles / hormones", "Lumière / écrans", "Bruit", "Odeurs", "Repas sauté", "Alcool", "Chaleur", "Météo", "Je ne sais pas"], s: ["Aura", "Nausées", "Vomissements", "Sensible à la lumière", "Sensible au bruit"], a: ["Repos dans le noir", "Médicament", "Froid sur le front", "Dormir", "Boire de l'eau", "TENS", "Tapis de lotus"] },
  "Douleur d'endométriose": { ic: "🌸", d: ["Règles", "Rapports", "Selles", "Urines", "Effort", "Fatigue", "Stress", "Je ne sais pas"], s: ["Douleur pelvienne", "Bas du dos", "Ballonnements", "Nausées", "Douleur à l'épaule"], a: ["Bouillotte", "Médicament", "Repos", "Bain chaud", "Mouvement doux", "TENS", "Tapis de lotus"] },
  "Flambée de fibromyalgie / fatigue": { ic: "🔋", d: ["Effort trop long", "Stress", "Mauvaise nuit", "Froid / humidité", "Règles", "Émotion forte", "Je ne sais pas"], s: ["Douleurs diffuses", "Raideur", "Brouillard mental", "Épuisement", "Hypersensibilité"], a: ["Repos", "Chaleur", "Mouvement doux", "Faire une pause", "Médicament", "TENS", "Tapis de lotus"] },
  "Douleur au genou (syndrome rotulien)": { ic: "🦵", d: ["Escaliers", "Accroupie / à genoux", "Position assise longtemps", "Marche longue", "Sport / effort", "Journée debout", "Froid / humidité", "Je ne sais pas"], s: ["Douleur devant le genou", "Craquements", "Gonflement", "Genou qui lâche", "Raideur", "Douleur en se levant"], a: ["Repos", "Glace", "Genouillère", "Exercices du kiné", "Étirements", "Médicament", "TENS", "Tapis de lotus"] },
  "Asthme / allergie": { ic: "🌬️", d: ["Pollen", "Acariens", "Animaux", "Effort", "Froid", "Fumée", "Infection", "Stress", "Je ne sais pas"], s: ["Toux", "Sifflements", "Essoufflement", "Nez qui coule", "Yeux qui piquent", "Éruption sur la peau"], a: ["Bronchodilatateur (Ventoline…)", "Antihistaminique", "Sortir / aérer", "Repos"] },
  "Crise d'anxiété / moral bas": { ic: "💭", d: ["Stress", "Manque de sommeil", "Hormones / règles", "Isolement", "Pensées négatives", "Surcharge", "Santé / résultats", "Je ne sais pas"], s: ["Cœur qui bat vite", "Oppression", "Boule au ventre", "Pleurs", "Pensées noires", "Envie de tout arrêter"], a: ["Respirer lentement", "Parler à quelqu'un", "Marcher", "Musique", "Médicament", "Repos", "TENS", "Tapis de lotus"] },
  "Nuit difficile": { ic: "🌙", d: ["Stress", "Écrans", "Douleur", "Caféine", "Règles", "Chaleur", "Bruit", "Masque inconfortable", "Sieste dans la journée", "Je ne sais pas"], s: ["Insomnie", "Nuit blanche", "Endormissement long", "Réveils la nuit", "Réveil trop tôt", "Masque enlevé dans la nuit", "Fuites / gêne du masque", "Cauchemars", "Jambes agitées", "Fatigué(e) malgré la nuit"], a: ["Routine du soir", "Lecture", "Médicament", "Tisane", "Respiration", "Réglage de l'appareil", "TENS", "Tapis de lotus"] },
};
const EP_DUREES = ["Moins d'1 heure", "1 à 4 heures", "4 à 24 heures", "Plus d'une journée", "Plusieurs jours"];
const dxSaved = () => { const c = cfg(24); return [...(c.dx || []), ...(c.autre ? String(c.autre).split(",").map((x) => x.trim()).filter(Boolean) : [])]; };
const epListe = () => (cfg(25).ep || []).slice();
const epTri = (L) => L.sort((a, b) => (b.date + (b.heure || "")).localeCompare(a.date + (a.heure || "")) || b.id - a.id);
const chipsP = (name, opts, on = []) => `<div class="chips">${opts.map((o) => `<label class="ck"><input type="checkbox" name="${name}" value="${esc(o)}" ${on.includes(o) ? "checked" : ""}> ${esc(o)}</label>`).join("")}</div>`;

function epInsights() {
  const t = today(), L = epListe().filter((x) => x.date >= addDays(t, -90)), rg = regles();
  const types = Object.keys(EP).filter((k) => L.some((x) => x.type === k));
  if (!types.length) return `<p class="muted">Dès que tu notes une crise, tu vois ici ce qui la déclenche et ce qui t'aide.</p>`;
  return types.map((k) => {
    const E = L.filter((x) => x.type === k), r30 = E.filter((x) => x.date >= addDays(t, -30)), I = E.map((x) => num(x.i)).filter((x) => x !== null);
    const cnt = (key) => { const c = {}; E.forEach((x) => (x[key] || []).forEach((v) => (c[v] = (c[v] || 0) + 1))); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3); };
    let s = `<div class="jn"><b>${EP[k].ic} ${esc(k)}</b> : ${r30.length} sur les 30 derniers jours, ${E.length} sur 3 mois${I.length ? `, intensité moyenne ${r1(avg(I))}/10` : ""}`;
    const dc = cnt("d"), ac = cnt("a");
    if (k === "Nuit difficile") { const P = E.filter((x) => x.ppc && x.ppc !== "Pas concerné"), nb = E.filter((x) => (x.s || []).includes("Nuit blanche")).length; if (nb) s += `<div>🌙 ${nb} nuit(s) blanche(s)</div>`; if (P.length) s += `<div>😴 Appareil porté toute la nuit : ${P.filter((x) => x.ppc.startsWith("Oui")).length} nuit(s) sur ${P.length}</div>`; }
    if (dc.length) s += `<div>🔎 Déclencheurs les plus fréquents : ${dc.map(([v, n]) => `${esc(v)} (${n})`).join(", ")}</div>`;
    if (ac.length) s += `<div>💡 Ce qui t'a aidée : ${ac.map(([v, n]) => `${esc(v)} (${n})`).join(", ")}</div>`;
    if (rg.length && E.length >= 4) {
      const jc = E.map((x) => jourDuCycle(x.date, rg)).filter(Boolean), reg = jc.filter((j) => j <= 3).length, ov = jc.filter((j) => j >= 12 && j <= 16).length, avant = jc.filter((j) => j >= 24).length;
      const m = [[reg, "pendant les règles (jours 1 à 3)"], [ov, "vers l'ovulation (jours 12 à 16)"], [avant, "dans la semaine avant les règles"]].sort((a, b) => b[0] - a[0])[0];
      if (jc.length >= 4 && m[0] / jc.length >= 0.4) s += `<div>🔁 ${m[0]} crise(s) sur ${jc.length} ${m[1]} : un lien avec ton cycle est possible, à en parler à ton médecin.</div>`;
    }
    return s + `</div>`;
  }).join("");
}
function epFicheLignes() {
  const t = today(), L = epListe().filter((x) => x.date >= addDays(t, -30));
  return Object.keys(EP).filter((k) => L.some((x) => x.type === k)).map((k) => {
    const E = L.filter((x) => x.type === k), I = E.map((x) => num(x.i)).filter((x) => x !== null), c = {};
    E.forEach((x) => (x.d || []).forEach((v) => (c[v] = (c[v] || 0) + 1)));
    const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => x[0]);
    const nb = k === "Nuit difficile" ? E.filter((x) => (x.s || []).includes("Nuit blanche")).length : 0;
    return `${k} : ${E.length} épisode(s) en 30 jours${nb ? ` dont ${nb} nuit(s) blanche(s)` : ""}${I.length ? `, intensité moyenne ${r1(avg(I))}/10` : ""}${top.length ? `, déclencheurs : ${top.join(", ")}` : ""}`;
  });
}

function renderSante() {
  const c = cfg(24), dx = c.dx || DX_DEFAUT, n = parisNow(), hh = String(n.h).padStart(2, "0") + ":" + String(n.m).padStart(2, "0");
  const ed = S.epEdit ? epListe().find((x) => String(x.id) === String(S.epEdit)) : null, type = S.epType, T = EP[type];
  let h = `<h2>🩹 Mes maladies et mes crises</h2>
  ${fold("📋 Mes diagnostics", `<p class="muted">${c.dx ? "Ta liste est enregistrée. Elle apparaît dans ta fiche pour les médecins." : "J'ai coché ce que tu m'as dit : vérifie, décoche ce qui ne te concerne pas, puis enregistre."}</p>
    ${chipsP("dx", DX, dx)}${field("dxAutre", "Autre (sépare par des virgules)", "text", c.autre || "")}${btn("💾 Enregistrer mes diagnostics", "dxsave")}`, !c.dx)}
  <h3>${ed ? "✏️ Modifier cette crise" : "➕ Noter une crise ou un épisode"}</h3>
  <p class="muted">Note-le même si c'est court : au bout de quelques semaines, tu vois ce qui revient.</p>
  <div class="row">${dateField("epDate", "🗓️ Jour", ed ? ed.date : today(), today())}${field("epHeure", "🕐 Heure", "time", ed ? ed.heure || "" : hh)}</div>
  ${sel("epType", "Quoi ?", Object.keys(EP), type)}
  <div class="row">${sel("epInt", "Intensité (0 = rien, 10 = pire possible)", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], ed ? String(ed.i) : "5")}${sel("epDuree", "Durée", EP_DUREES, ed ? ed.duree : EP_DUREES[1])}</div>
  <p><b>Symptômes</b></p>${chipsP("eps", T.s, ed && ed.type === type ? ed.s || [] : [])}
  <p><b>Ce qui l'a déclenché ou aggravé</b></p>${chipsP("epd", T.d, ed && ed.type === type ? ed.d || [] : [])}
  <p><b>Ce qui m'a aidée</b></p>${chipsP("epa", T.a, ed && ed.type === type ? ed.a || [] : [])}
  ${type.startsWith("Douleur au genou") ? sel("epCote", "Quel genou ?", ["Droit", "Gauche", "Les deux"], ed ? ed.cote || "Droit" : "Droit") : ""}
  ${type === "Nuit difficile" ? sel("epPpc", "😴 Appareil pour l'apnée porté cette nuit ?", ["Oui, toute la nuit", "Une partie de la nuit", "Non", "Pas concerné"], ed ? ed.ppc || "Oui, toute la nuit" : "Oui, toute la nuit") : ""}
  ${field("epAct", "🕐 Ce que je faisais à ce moment-là", "text", ed ? ed.act || "" : "")}
  ${field("epNote", "Note (médicament pris, dose, remarque…)", "text", ed ? ed.note || "" : "")}
  ${btn(ed ? "💾 Enregistrer la modification" : "💾 Enregistrer", "epsave")}${ed ? btn("Annuler", "epcancel", "sec") : ""}`;
  if (type === "Crise d'anxiété / moral bas") h += box("info", "💛 Si tu as des pensées de te faire du mal : appelle le <b>3114</b> (gratuit, 24 h/24, 7 j/7) ou le <b>15</b>. Tu n'as pas à rester seule avec ça.");
  h += `<hr><h3>🔎 Ce que je remarque (3 derniers mois)</h3>${epInsights()}`;
  const L = epTri(epListe());
  if (L.length) h += fold(`📖 Mes crises notées (${L.length})`, L.slice(0, 40).map((x) => `<div class="jn"><div class="jnh"><b>${fr(x.date)}</b> ${esc(x.heure || "")} <span class="tag">${EP[x.type] ? EP[x.type].ic : ""} ${esc(x.type)}</span><span class="jnb">${btn("✏️", "epedit", "", `data-id="${x.id}" title="Modifier"`)}${btn("🗑️", "epdel", "del", `data-id="${x.id}" title="Supprimer"`)}</span></div>
    <div>Intensité <b>${esc(x.i)}/10</b> · ${esc(x.duree || "")}</div>${(x.s || []).length ? `<div>${esc(x.s.join(", "))}</div>` : ""}${(x.d || []).length ? `<div class="muted">Déclencheurs : ${esc(x.d.join(", "))}</div>` : ""}${(x.a || []).length ? `<div class="muted">Ce qui a aidé : ${esc(x.a.join(", "))}</div>` : ""}${x.cote ? `<div class="muted">🦵 Genou : ${esc(x.cote)}</div>` : ""}${x.ppc ? `<div class="muted">😴 Appareil : ${esc(x.ppc)}</div>` : ""}${x.act ? `<div class="muted">🕐 Je faisais : ${esc(x.act)}</div>` : ""}${x.note ? `<div class="muted">📝 ${esc(x.note)}</div>` : ""}</div>`).join("") + (L.length > 40 ? `<p class="muted">Les 40 plus récentes sont affichées.</p>` : ""));
  return h;
}

Object.assign(ACT_NEW, {
  async dxsave() {
    if (await saveCfg(24, { dx: picked("dx"), autre: val("dxAutre").trim() })) { toast("📋 Diagnostics enregistrés"); render(); }
  },
  async epsave() {
    const type = val("epType"), e = { date: dval("epDate") || today(), heure: val("epHeure"), type, i: val("epInt"), duree: val("epDuree"), s: picked("eps"), d: picked("epd"), a: picked("epa"), act: val("epAct").trim(), cote: type.startsWith("Douleur au genou") ? val("epCote") : "", ppc: type === "Nuit difficile" ? val("epPpc") : "", note: val("epNote").trim() };
    const L = epListe(), out = S.epEdit ? L.map((x) => String(x.id) === String(S.epEdit) ? { ...x, ...e } : x) : [...L, { id: Date.now(), ...e }];
    if (await saveCfg(25, { ep: out })) {
      S.epEdit = null; DIRTY.clear();
      toast(e.s.includes("Envie de tout arrêter") ? "💛 Merci de l'avoir noté. Si c'est dur : 3114 (24 h/24, gratuit)." : "Enregistré");
      render();
    }
  },
  epedit(el) { const x = epListe().find((y) => String(y.id) === el.dataset.id); if (!x) return; DIRTY.clear(); S.epEdit = x.id; S.epType = x.type; render(); window.scrollTo(0, 0); },
  epcancel() { DIRTY.clear(); S.epEdit = null; render(); },
  async epdel(el) { if (confirm("Supprimer cette crise ?") && await saveCfg(25, { ep: epListe().filter((x) => String(x.id) !== el.dataset.id) })) { toast("Supprimée"); render(); } },
});
Object.assign(CHG_NEW, {
  epType(el) { S.epType = el.value; [...DIRTY].filter((k) => k.startsWith("n:eps=") || k.startsWith("n:epd=") || k.startsWith("n:epa=")).forEach((k) => DIRTY.delete(k)); keepRender(); },
});

// ===== 😴 Appareil pour l'apnée du sommeil : un traitement de la nuit (config n°26 : { nuits: { "AAAA-MM-JJ": { use, h, fuites, iah } } }) =====
// La date est celle du matin (la nuit qui vient de se terminer).
// heures au format 8:31 (ou 8h31, ou 8,5) -> nombre d'heures ; et l'inverse
function ppcParseH(t) {
  t = String(t ?? "").trim(); if (!t) return null;
  const m = t.match(/^(\d{1,2})\s*[:hH]\s*(\d{0,2})$/);
  if (m) { const mn = +(m[2] || 0); return mn > 59 ? null : +m[1] + mn / 60; }
  const n = num(t); return n === null || isNaN(n) ? null : n;
}
const fmtH = (h) => { const t = Math.round(h * 60); return Math.floor(t / 60) + " h " + String(t % 60).padStart(2, "0"); };
const fmtHin = (h) => { if (h === null || h === undefined || h === "") return ""; const t = Math.round(h * 60); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
const PPC_USE = ["Oui, toute la nuit", "Une partie de la nuit", "Non"];
const ppcNuits = () => cfg(26).nuits || {};
function ppcMsg(use, h, iah) {
  const m = [];
  if (use === "Non") m.push(["warn", "🌙 Pas d'appareil cette nuit. Essaie de le remettre dès ce soir : il ne protège que quand tu le portes. S'il te gêne, dis-le à ton prestataire, il existe des réglages et des masques différents."]);
  else {
    if (h !== null && !isNaN(h)) {
      if (h >= 7) m.push(["ok", `🎉 <b>${fmtH(h)}</b> d'utilisation : très bien, l'appareil a couvert presque toute ta nuit.`]);
      else if (h >= 4) m.push(["ok", `👍 <b>${fmtH(h)}</b> d'utilisation : c'est au-dessus de 4 h, le minimum habituellement demandé. Plus tu en portes, mieux c'est.`]);
      else m.push(["warn", `🌙 <b>${fmtH(h)}</b> d'utilisation : en dessous de 4 h, le traitement agit peu. Si tu l'enlèves la nuit, note pourquoi (gêne, fuites, réveil) pour en parler au prestataire.`]);
    }
    if (iah !== null && !isNaN(iah)) {
      if (iah < 5) m.push(["ok", `✅ <b>${r1(iah)} événement(s) par heure</b> : dans la normale, le traitement est efficace.`]);
      else if (iah < 15) m.push(["info", `🙂 <b>${r1(iah)} événements par heure</b> : léger. À surveiller si ça dure.`]);
      else if (iah < 30) m.push(["warn", `⚠️ <b>${r1(iah)} événements par heure</b> : élevé. Si ça se répète plusieurs nuits, parle-en à ton médecin du sommeil ou à ton prestataire (réglage, masque).`]);
      else m.push(["err", `🚨 <b>${r1(iah)} événements par heure</b> : très élevé. Parle-en à ton médecin du sommeil ou à ton prestataire rapidement.`]);
    }
  }
  return m.map(([k, t]) => box(k, t)).join("");
}
function ppcBlock(date) {
  const x = ppcNuits()[date] || {}, N = Object.entries(ppcNuits()).sort((a, b) => b[0].localeCompare(a[0]));
  let h = `<h3>😴 Mon appareil pour l'apnée du sommeil</h3><p class="muted">C'est un traitement : note-le chaque matin pour la nuit qui vient de se passer (nuit du ${fr(addDays(date, -1))} au ${fr(date)}). Les chiffres sont ceux de l'écran de ton appareil ou de son application : fuites en L/min, événements en nombre par heure.</p>
  ${sel("ppcUse", "Appareil utilisé cette nuit ?", PPC_USE, x.use || PPC_USE[0])}
  <div class="row">${field("ppcH", "⏱️ Heures d'utilisation (ex : 8:31)", "text", fmtHin(x.h), 'placeholder="8:31" inputmode="numeric" autocomplete="off"')}${field("ppcFu", "💨 Fuites (L/min)", "number", x.fuites ?? "", 'min="0" step="0.1" inputmode="decimal"')}${field("ppcIah", "📉 Événements (apnées) / heure", "number", x.iah ?? "", 'min="0" step="0.1" inputmode="decimal"')}</div>
  ${btn("💾 Enregistrer l'appareil de cette nuit", "ppcsave", "", `data-d="${date}"`)}<div id="ppcLive">${x.use ? ppcMsg(x.use, x.h ?? null, x.iah ?? null) : ""}</div>`;
  const R = N.filter(([d]) => d >= addDays(date, -6) && d <= date);
  if (R.length >= 2) {
    const hs = R.map(([, v]) => num(v.h)).filter((v) => v !== null), is = R.map(([, v]) => num(v.iah)).filter((v) => v !== null);
    h += `<p class="muted">📊 7 derniers jours : appareil porté ${R.filter(([, v]) => v.use !== "Non").length} nuit(s) sur ${R.length} notée(s)${hs.length ? `, ${hs.filter((v) => v >= 4).length} nuit(s) à 4 h ou plus (moyenne ${fmtH(avg(hs))})` : ""}${is.length ? `, ${r1(avg(is))} événement(s) par heure en moyenne` : ""}.</p>`;
  }
  if (N.length) h += fold(`📋 Mes dernières nuits (${N.length})`, `<div class="tw"><table><thead><tr><th>Nuit du matin</th><th>Appareil</th><th>Heures</th><th>Fuites (L/min)</th><th>Événements / heure</th><th></th></tr></thead><tbody>${N.slice(0, 14).map(([d, v]) => `<tr><td>${fr(d)}</td><td>${esc(v.use || "")}</td><td>${v.h === null || v.h === undefined ? "" : fmtH(v.h)}</td><td>${v.fuites ?? ""}</td><td>${v.iah ?? ""}</td><td><button class="b del" data-act="ppcdel" data-d="${d}" title="Supprimer">🗑️</button></td></tr>`).join("")}</tbody></table></div>`);
  return h;
}
function ppcFicheLignes() {
  const t = today(), R = Object.entries(ppcNuits()).filter(([d]) => d >= addDays(t, -30));
  if (!R.length) return [];
  const hs = R.map(([, v]) => num(v.h)).filter((v) => v !== null), is = R.map(([, v]) => num(v.iah)).filter((v) => v !== null);
  return [`Appareil porté ${R.filter(([, v]) => v.use !== "Non").length} nuit(s) sur ${R.length} notée(s) (30 jours)${hs.length ? `, ${hs.filter((v) => v >= 4).length} nuit(s) à 4 h ou plus, moyenne ${fmtH(avg(hs))}` : ""}${is.length ? `, ${r1(avg(is))} événement(s)/heure en moyenne` : ""}`];
}
Object.assign(ACT_NEW, {
  async ppcsave(el) {
    const d = el.dataset.d, use = val("ppcUse");
    const n = { ...ppcNuits() }; n[d] = { use, h: ppcParseH(val("ppcH")), fuites: num(val("ppcFu")), iah: num(val("ppcIah")) };
    if (await saveCfg(26, { nuits: n })) { toast("😴 Appareil noté"); render(); }
  },
  async ppcdel(el) { if (!confirm("Supprimer cette nuit ?")) return; const n = { ...ppcNuits() }; delete n[el.dataset.d]; if (await saveCfg(26, { nuits: n })) render(); },
});
// phrase en direct pendant la saisie
document.addEventListener("input", (e) => {
  if (!e.target || !["ppcUse", "ppcH", "ppcIah"].includes(e.target.id) || !$("ppcLive")) return;
  $("ppcLive").innerHTML = ppcMsg($("ppcUse").value, ppcParseH($("ppcH").value), num($("ppcIah").value));
});
document.addEventListener("change", (e) => { if (e.target && e.target.id === "ppcUse") e.target.dispatchEvent(new Event("input", { bubbles: true })); });

// ===== 🤧 Symptômes du jour (config n°27 : { jours: { "AAAA-MM-JJ": { s: [...], autre, force } } }) =====
const SY_GROUPES = [
  ["🤢 Ventre et digestion", ["Diarrhée", "Constipation", "Nausées", "Vomissements", "Ballonnements", "Reflux / brûlures d'estomac", "Mal au ventre"]],
  ["🤧 Nez, gorge, respiration", ["Nez bouché", "Nez qui coule", "Éternuements", "Mal de gorge", "Toux", "Essoufflement", "Yeux qui piquent"]],
  ["🌡️ Général", ["Fièvre", "Frissons", "Courbatures", "Fatigue inhabituelle", "Vertiges", "Maux de tête", "Palpitations", "Sueurs / bouffées de chaleur"]],
  ["🧴 Peau", ["Éruption / boutons", "Démangeaisons", "Poussée d'acné"]],
  ["🌸 Urinaire et gynéco", ["Brûlures en urinant", "Pertes inhabituelles", "Saignements hors règles", "Douleur pelvienne", "Seins douloureux"]],
  ["💭 Moral", ["Anxiété", "Pleurs", "Irritabilité"]],
];
const SY_FORCE = ["Léger", "Moyen", "Fort"];
S.syDate = null;
const syJours = () => cfg(27).jours || {};
function symptomesBlock() {
  const t = today(), d = S.syDate && S.syDate <= t ? S.syDate : t, x = syJours()[d] || {}, on = x.s || [];
  let h = `<h3>🤧 J'ai un symptôme aujourd'hui</h3><p class="muted">Coche ce que tu ressens, même un petit symptôme. Ça sert à voir ce qui revient et à le dire à ton médecin.</p>
  ${dateField("syDate", "🗓️ Jour", d, t)}
  ${SY_GROUPES.map(([g, L]) => `<p><b>${g}</b></p>${chipsP("sy", L, on)}`).join("")}
  ${field("syAutre", "Autre symptôme (écris-le)", "text", x.autre || "")}
  ${sel("syForce", "Intensité globale", SY_FORCE, x.force || "Léger")}
  ${btn("💾 Enregistrer mes symptômes", "sysave")}${x.s || x.autre ? btn("🗑️ Effacer ce jour", "sydel", "del") : ""}<div id="syAdvice">${syConseils(on, x.force)}</div>`;
  const J = syJours(), recent = Object.keys(J).filter((k) => k >= addDays(t, -30)).sort().reverse();
  if (recent.length) {
    const c = {}; recent.forEach((k) => (J[k].s || []).forEach((v) => (c[v] = (c[v] || 0) + 1)));
    const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length) h += `<p class="muted">🔎 Les plus fréquents sur 30 jours : ${top.map(([v, n]) => `${esc(v)} (${n} jour${n > 1 ? "s" : ""})`).join(", ")}</p>`;
    h += fold(`📋 Mes symptômes récents (${recent.length} jour${recent.length > 1 ? "s" : ""})`, recent.slice(0, 20).map((k) => `<div class="jn"><b>${fr(k)}</b> <span class="tag">${esc(J[k].force || "")}</span><div>${esc([...(J[k].s || []), J[k].autre].filter(Boolean).join(", "))}</div></div>`).join(""));
  }
  return h;
}
function syFicheLignes() {
  const t = today(), J = syJours(), R = Object.keys(J).filter((k) => k >= addDays(t, -30));
  if (!R.length) return [];
  const c = {}; R.forEach((k) => (J[k].s || []).forEach((v) => (c[v] = (c[v] || 0) + 1)));
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([v, n]) => `${v} (${n} j)`);
  const autres = [...new Set(R.map((k) => J[k].autre).filter(Boolean))].slice(0, 5);
  return [`${R.length} jour(s) avec symptômes sur 30 jours` + (top.length ? " : " + top.join(", ") : ""), ...(autres.length ? ["Autres : " + autres.join(", ")] : [])];
}
Object.assign(ACT_NEW, {
  async sysave() {
    const d = dval("syDate") || today(), s = picked("sy"), autre = val("syAutre").trim();
    if (!s.length && !autre) return toast("Coche au moins un symptôme ou écris-le.");
    const j = { ...syJours() }; j[d] = { s, autre, force: val("syForce") };
    if (await saveCfg(27, { jours: j })) { S.syDate = d; toast("🤧 Symptômes enregistrés"); render(); }
  },
  async sydel() {
    const d = dval("syDate") || today(); const j = { ...syJours() }; delete j[d];
    if (confirm("Effacer les symptômes de ce jour ?") && await saveCfg(27, { jours: j })) { toast("Effacé"); render(); }
  },
});
Object.assign(CHG_NEW, {
  syDate(el) { S.syDate = !el.value || el.value > today() ? today() : el.value; [...DIRTY].filter((k) => k.startsWith("n:sy=") || k === "#syAutre" || k === "#syForce").forEach((k) => DIRTY.delete(k)); render(); },
});


// ===== conseils après les symptômes (généraux, pas un diagnostic) =====
// c = conseil, r = quand consulter / appeler
const SY_AVIS = {
  "Diarrhée": { c: "Bois souvent par petites gorgées (eau, bouillon, solution de réhydratation) et mange simple : riz, carottes, banane, pâtes. Évite alcool, café, lait et plats gras. Lave-toi les mains souvent.", r: "Consulte si elle dure plus de 2 jours, s'il y a du sang, de la fièvre, ou si tu n'arrives pas à boire." },
  "Constipation": { c: "Bois plus d'eau, mange des fibres (légumes, fruits, céréales complètes) et marche un peu : le mouvement aide l'intestin." },
  "Nausées": { c: "Mange peu et souvent, évite les odeurs fortes et le gras. Le gingembre ou une boisson fraîche peuvent aider.", r: "Si tes règles ont du retard et que tu peux être enceinte, fais un test de grossesse." },
  "Vomissements": { c: "Attends un peu, puis bois par très petites gorgées. Reprends l'alimentation doucement.", r: "Consulte si tu vomis plus de 24 h, s'il y a du sang, de la fièvre, ou si tu ne gardes même pas l'eau." },
  "Ballonnements": { c: "Mange lentement, évite les boissons gazeuses et le chewing-gum. Une bouillotte sur le ventre et une courte marche soulagent souvent." },
  "Reflux / brûlures d'estomac": { c: "Évite les repas tardifs, gras ou épicés. Lève un peu la tête du lit et ne t'allonge pas juste après manger." },
  "Mal au ventre": { c: "Repos et chaleur (bouillotte). Note où est la douleur.", r: "Consulte vite si elle est forte, d'un seul côté, ou avec fièvre, vomissements ou retard de règles." },
  "Nez bouché": { c: "Lave-toi le nez au sérum physiologique, bois chaud, humidifie la pièce. Un nez bouché gêne le masque d'apnée : active l'humidificateur de l'appareil et dis-le à ton prestataire si ça dure. Si tu essaies d'être enceinte, demande à ton pharmacien avant tout décongestionnant." },
  "Nez qui coule": { c: "Sérum physiologique, mouchoirs jetables, boissons chaudes. Si tu essaies d'être enceinte, demande l'avis d'un pharmacien avant un médicament." },
  "Éternuements": { c: "Si c'est une allergie : aère, évite la poussière et les pollens, lave-toi le visage et les cheveux le soir. Prends ton antihistaminique s'il t'a été prescrit." },
  "Mal de gorge": { c: "Bois chaud (tisane, miel), repose ta voix, humidifie l'air.", r: "Consulte si ça dure plus de 3 jours, avec fièvre, ou si tu as du mal à avaler." },
  "Toux": { c: "Bois régulièrement, miel, humidifie l'air. Si tu as de l'asthme, prends ton traitement selon ton plan.", r: "Consulte si elle dure plus de 3 semaines, ou avec fièvre ou essoufflement." },
  "Essoufflement": { c: "Assieds-toi, respire lentement. Si tu as de l'asthme, prends ton bronchodilatateur.", r: "Appelle le 15 si ça ne passe pas au repos, si tu as une douleur dans la poitrine, ou si tu n'arrives plus à parler." },
  "Yeux qui piquent": { c: "Rince-toi les yeux à l'eau claire ou au sérum, ne frotte pas. Si c'est une allergie, aère et lave-toi le visage." },
  "Fièvre": { c: "Repose-toi et bois beaucoup. Le paracétamol (à la dose indiquée sur la boîte) peut soulager.", r: "Consulte si elle dépasse 39 °C, dure plus de 3 jours ou s'accompagne de raideur de la nuque ou de difficultés à respirer. Si tu peux être enceinte, demande un avis médical." },
  "Frissons": { c: "Couvre-toi légèrement, bois chaud et repose-toi. Prends ta température." },
  "Courbatures": { c: "Repos, eau, chaleur sur les zones douloureuses. Évite l'effort intense pendant quelques jours." },
  "Fatigue inhabituelle": { c: "Dors et mange régulièrement. Vérifie que tu as bien porté ton appareil d'apnée. Pense à boire. Surveille ta glycémie si ton médecin te l'a demandé.", r: "Si elle dure plus de 2 semaines, parles-en à ton médecin (fer, thyroïde, vitamine D, sommeil)." },
  "Vertiges": { c: "Assieds-toi ou allonge-toi, bois et mange quelque chose. Lève-toi lentement. Si tu suis ta glycémie, mesure-la.", r: "Appelle le 15 en cas de malaise, de perte de connaissance, de difficulté à parler ou de faiblesse d'un côté." },
  "Maux de tête": { c: "Bois, repose-toi au calme, dans le noir si c'est une migraine. Un linge frais sur le front peut aider. Note-le dans « Mes maladies » pour repérer les déclencheurs.", r: "Appelle le 15 si le mal de tête est brutal et très violent, ou avec raideur de la nuque, fièvre ou troubles de la vue." },
  "Palpitations": { c: "Assieds-toi, respire lentement (inspire 4 secondes, expire 6). Évite caféine et excitants.", r: "Appelle le 15 si tu as une douleur dans la poitrine, un malaise ou un essoufflement." },
  "Sueurs / bouffées de chaleur": { c: "Porte des vêtements légers, bois frais. Note l'heure et le contexte.", r: "Si c'est nouveau ou fréquent, parles-en à ton médecin (thyroïde, glycémie, hormones)." },
  "Éruption / boutons": { c: "Ne gratte pas, lave doucement et applique une crème apaisante. Note ce que tu as mangé, pris ou touché.", r: "Va aux urgences si le visage ou les lèvres gonflent, ou si tu as du mal à respirer." },
  "Démangeaisons": { c: "Évite de gratter, prends une douche tiède, applique une crème hydratante." },
  "Poussée d'acné": { c: "Nettoie doucement matin et soir, ne presse pas les boutons. L'acné est fréquente avec le SOPK : note-la dans ton suivi SOPK." },
  "Brûlures en urinant": { c: "Bois beaucoup d'eau et ne retiens pas tes envies d'uriner.", r: "Possible infection urinaire : consulte dans la journée ou le lendemain (surtout si tu essaies d'être enceinte), et en urgence en cas de fièvre ou de douleur dans le dos." },
  "Pertes inhabituelles": { c: "Évite les toilettes intimes agressives et les produits parfumés. Porte du coton.", r: "Consulte si elles ont une odeur, des démangeaisons, une couleur inhabituelle, ou si tu essaies d'être enceinte." },
  "Saignements hors règles": { c: "Note la date, la quantité et la couleur. Un petit saignement peut arriver autour de l'ovulation.", r: "Consulte vite s'ils sont abondants ou répétés. Si tu peux être enceinte, fais un test et contacte ton médecin ou ton équipe PMA." },
  "Douleur pelvienne": { c: "Chaleur sur le ventre, repos, position confortable. Note-la dans « Mes maladies » (douleur d'endométriose).", r: "Va aux urgences si elle est forte, d'un seul côté, ou avec retard de règles, saignements ou malaise." },
  "Seins douloureux": { c: "Un soutien-gorge confortable et de la chaleur ou du froid aident. C'est fréquent avant les règles." },
  "Anxiété": { c: "Respire lentement (inspire 4 secondes, expire 6) pendant 2 minutes, marche un peu, parle à quelqu'un. Note la crise dans « Mes maladies ».", r: "Si tu as des pensées de te faire du mal : 3114 (gratuit, 24 h/24)." },
  "Pleurs": { c: "Tu as le droit de pleurer. Bois de l'eau, repose-toi, parle à quelqu'un de confiance.", r: "Si ce moral bas dure ou si tu as des pensées noires : 3114 (gratuit, 24 h/24) ou ton médecin." },
  "Irritabilité": { c: "Fais une pause, un peu d'air et de l'eau. Note les jours où ça revient : un lien avec ton cycle est possible." },
};
function syConseils(list, force) {
  list = (list || []).filter((v) => SY_AVIS[v]);
  if (!list.length) return "";
  const r = list.filter((v) => SY_AVIS[v].r).map((v) => `<li><b>${esc(v)}</b> : ${esc(SY_AVIS[v].r)}</li>`);
  const metf = list.includes("Diarrhée") && Object.keys(S.meds).some((n) => /metformine|glucophage|stagid/i.test(n));
  let h = `<h4>💡 Mes conseils</h4>` + list.slice(0, 8).map((v) => `<div class="todo"><span>💡</span><div><b>${esc(v)}</b> : ${esc(SY_AVIS[v].c)}</div></div>`).join("");
  if (list.length > 8) h += `<p class="muted">Et pour les autres symptômes cochés : repos, hydratation, et surveille l'évolution.</p>`;
  if (metf) h += box("info", "💊 La metformine peut donner de la diarrhée. Ne l'arrête pas seule : parles-en à ton médecin, il peut adapter la dose ou la forme.");
  if (force === "Fort") h += box("warn", "⚠️ Tu as indiqué une intensité forte : si ça ne se calme pas dans la journée, contacte ton médecin.");
  if (r.length) h += box("warn", `🩺 <b>Quand consulter ou appeler</b><ul>${r.join("")}</ul>`);
  return h + `<p class="muted">Ces conseils sont généraux : ils ne remplacent pas l'avis d'un médecin. En cas de doute, appelle ton médecin ou le 15.</p>`;
}
document.addEventListener("change", (e) => {
  const el = e.target; if (!el || !$("syAdvice")) return;
  if (el.name === "sy" || el.id === "syForce") $("syAdvice").innerHTML = syConseils(picked("sy"), $("syForce").value);
});
