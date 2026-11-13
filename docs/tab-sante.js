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
