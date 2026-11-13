// ===== Aujourd'hui, questions pour le médecin, journal libre, résultats d'examens PMA =====
S.tab = "today"; // la page d'accueil est maintenant « Aujourd'hui »
S.jnQ = ""; S.jnEdit = null; S.jnN = 30; S.exEdit = null; S.exType = "";
const keepRender = () => { S.inAct = true; try { render(); } finally { S.inAct = false; } }; // garde ce qui est en cours d'écriture
const nl2br = (t) => esc(t).replace(/\n/g, "<br>");

// ---------- ❓ questions pour le médecin ----------
const QR_POUR = ["Équipe PMA / gynécologue", "Médecin traitant", "Endocrinologue / diabétologue", "Kiné", "Cardiologue", "Autre"];
const qrEnAttente = () => rows("questions_medecin").filter((r) => r["Posée"] !== "Oui");
function questionsRapides(titre = true) {
  const att = qrEnAttente(), faites = rows("questions_medecin").filter((r) => r["Posée"] === "Oui").sort((a, b) => b.id - a.id);
  let h = `${titre ? "<h3>❓ Mes questions pour le médecin</h3>" : ""}<p class="muted">Note une question dès qu'elle te vient : elle apparaît dans ta fiche pour les médecins, prête pour le rendez-vous.</p>
  ${field("qrQ", "Ma question")}${sel("qrP", "Pour qui ?", QR_POUR)}${btn("➕ Ajouter la question", "qradd")}`;
  if (att.length) {
    const g = {}; att.forEach((r) => (g[r.Pour || "Autre"] = g[r.Pour || "Autre"] || []).push(r));
    h += `<p><b>À poser (${att.length})</b></p>` + Object.entries(g).map(([p, l]) => `<div class="muted">${esc(p)}</div>` + l.map((r) => `<div class="todo"><span>❓</span><div>${esc(r.Question)}</div><span style="white-space:nowrap">${btn("✅ Posée", "qrdone", "sec", `data-id="${r.id}"`)}${btn("🗑️", "qrdel", "del", `data-id="${r.id}"`)}</span></div>`).join("")).join("");
  } else h += `<p class="muted">Aucune question en attente.</p>`;
  if (faites.length) h += fold(`Questions déjà posées (${faites.length})`, faites.map((r) => `<div class="todo ok"><span>✅</span><div>${esc(r.Question)}${r["Réponse"] ? `<br><span class="muted">Réponse : ${esc(r["Réponse"])}</span>` : ""}</div>${btn("🗑️", "qrdel", "del", `data-id="${r.id}"`)}</div>`).join(""));
  return h;
}

// ---------- ☀️ Aujourd'hui ----------
function renderToday() {
  const t = today(), jour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const { out: manq, total } = manquants(t), nbM = Object.values(manq).reduce((a, m) => a + m.length, 0);
  const items = []; // [fait, texte (html), onglet]
  if (total) items.push([nbM === 0, nbM === 0 ? "Tous mes médicaments sont pris" : "À prendre : " + Object.entries(manq).map(([n, m]) => `<b>${esc(n)}</b> (${esc(m.join(", "))}${S.meds[n].heure_precise ? " ⏰ " + esc(S.meds[n].heure_precise) : ""})`).join(" · "), "dash"]);
  if (S.set.parcours === PARCOURS[0]) items.push([rows("cycle_temperature").some((r) => r.Date === t), "Température basale", "cycle"]);
  if (S.set.parcours === PARCOURS[1]) items.push([tnTous().some((r) => r.date === t), "Tension du jour", "cycle"]);
  items.push([rows("suivi_douleur_fatigue").some((r) => r.Date === t), "Douleur, fatigue et sommeil", "df"]);
  items.push([!!humeurs()[t], "Mon humeur du jour", "df"]);
  items.push([!!ppcNuits()[t], "Appareil d'apnée du sommeil : l'ai-je utilisé cette nuit ?", "dash"]);
  const qj = QJ()[t] || null;
  items.push([!!(qj && (qj.eau || qj.pas || (qj.repas || []).length || (qj.min))), "Mon quotidien (repas, eau, activité" + (qj && qj.pas ? ", " + qj.pas + " pas" : ", pas") + ")", "health"]);
  if (rows("suivi_neuro").some((r) => r.Date >= addDays(t, -14))) items.push([rows("suivi_neuro").some((r) => r.Date === t), "Check-in TDAH / TSA / SPT du jour", "tdah"]);
  const wd = parseD(t).getUTCDay(); // 1 lundi … 6 samedi
  if (GP_JOURS.includes(wd)) {
    const debut = wd <= 2 ? addDays(t, -(wd - 1)) : addDays(t, -(wd - 5)); // lundi ou vendredi de cette période
    items.push([rows("suivi_glycemie").some((r) => r.Date >= debut && r.Date <= t), wd <= 2 ? "Glycémie à jeun (jour de mesure du début de semaine)" : "Glycémie après repas (jour de mesure de fin de semaine)", "health"]);
  }
  const faits = items.filter((i) => i[0]).length;

  let h = `<h2>☀️ Aujourd'hui</h2><p class="muted" style="text-transform:capitalize">${esc(jour)}</p>${stockAlertes()}`;
  h += `${bar(faits / items.length)}<p class="muted">${faits} chose(s) faite(s) sur ${items.length}</p>`;
  h += items.map(([ok, txt, tab]) => `<div class="todo ${ok ? "ok" : ""}"><span>${ok ? "✅" : "⬜"}</span><div>${txt}</div>${ok || tab === "today" ? "" : btn("Ouvrir", "goto", "sec", `data-t="${tab}"`)}</div>`).join("");
  if (nbM) h += `<p>${btn("✅ J'ai tout pris comme d'habitude (un clic)", "todayall")}</p>`;
  else if (total && faits === items.length) h += box("ok", "🌿 Tout est fait pour aujourd'hui. Tu peux te reposer.");

  const rdv = rows("rdv_medicaux").filter((r) => r.Date >= t && !["✅ Effectué", "❌ Annulé"].includes(r.Statut)).sort((a, b) => (a.Date + (a.Heure || "")).localeCompare(b.Date + (b.Heure || ""))).slice(0, 3);
  const nbq = qrEnAttente().length;
  if (rdv.length) {
    h += `<h3>📅 Prochains rendez-vous</h3>` + rdv.map((r) => {
      const q = r.Date === t ? "Aujourd'hui" : r.Date === addDays(t, 1) ? "Demain" : fr(r.Date);
      return `<div class="todo"><span>📅</span><div><b>${esc(q)}</b> ${esc(r.Heure || "")} · ${esc(r["Médecin / Spécialité"] || "")}${r.Lieu ? `<br><span class="muted">${esc(r.Lieu)}</span>` : ""}</div></div>`;
    }).join("");
    if (nbq) h += box("info", `❓ Tu as <b>${nbq} question(s)</b> à poser. Elles sont dans ta fiche pour les médecins.`);
  }
  const ap = rows("rdv_a_prendre").filter((r) => r.Statut === "À appeler").length;
  if (ap) h += `<div class="todo"><span>📞</span><div>${ap} rendez-vous à prendre</div>${btn("Ouvrir", "goto", "sec", 'data-t="rdv"')}</div>`;

  const sj = syJours()[t];
  h += "<hr>" + (sj && (sj.s || sj.autre) ? box("info", "🤧 Symptômes notés aujourd'hui : " + esc([...(sj.s || []), sj.autre].filter(Boolean).join(", "))) : "") + fold("🤧 J'ai un symptôme aujourd'hui", symptomesBlock(), false) + fold("❓ Mes questions pour le médecin" + (nbq ? ` (${nbq})` : ""), questionsRapides(false), nbq > 0 && rdv.some((r) => diffDays(r.Date, t) <= 3));
  h += `<p class="muted">Besoin d'écrire autre chose ? Va dans <b>📝 Mon journal</b>.</p>`;
  return h;
}

// ---------- 📝 journal libre (config n°22 : { notes: [{ id, date, heure, tag, t }] }) ----------
const JN_TAGS = ["", "💭 Pensée", "😣 Symptôme", "💊 Traitement", "🏥 Médical", "🍼 Projet bébé", "🌿 Bien-être", "Autre"];
const jnNotes = () => (cfg(22).notes || []).slice();
function renderJournal() {
  const n = parisNow(), hh = String(n.h).padStart(2, "0") + ":" + String(n.m).padStart(2, "0");
  const ed = S.jnEdit ? jnNotes().find((x) => String(x.id) === String(S.jnEdit)) : null;
  let h = `<h2>📝 Mon journal</h2><p class="muted">Un espace libre : écris ce que tu veux, quand tu veux, sans cases à remplir. Utile pour te souvenir de ce que tu voulais dire au médecin.</p>
  <h3>${ed ? "✏️ Modifier cette note" : "Nouvelle note"}</h3>
  <div class="row">${dateField("jnDate", "🗓️ Jour", ed ? ed.date : today(), today())}${field("jnHeure", "🕐 Heure", "time", ed ? ed.heure || "" : hh)}${sel("jnTag", "Thème (facultatif)", JN_TAGS, ed ? ed.tag || "" : "")}</div>
  ${area("jnTexte", "Ce que je veux écrire", ed ? ed.t : "", "Comment je me sens, ce qui s'est passé, ce que j'ai remarqué…")}
  ${btn(ed ? "💾 Enregistrer la modification" : "💾 Enregistrer cette note", "jnsave")}${ed ? btn("Annuler", "jncancel", "sec") : ""}`;
  const all = jnNotes().sort((a, b) => (b.date + (b.heure || "")).localeCompare(a.date + (a.heure || "")) || b.id - a.id);
  const q = S.jnQ.trim().toLowerCase(), L = q ? all.filter((x) => (x.t + " " + (x.tag || "")).toLowerCase().includes(q)) : all;
  h += `<hr><h3>📖 Mes notes (${all.length})</h3>${all.length > 3 ? field("jnQ", "🔎 Chercher un mot", "text", S.jnQ) : ""}`;
  if (!L.length) h += `<p class="muted">${all.length ? "Aucune note ne contient ce mot." : "Aucune note pour l'instant."}</p>`;
  h += L.slice(0, S.jnN).map((x) => `<div class="jn"><div class="jnh"><b>${fr(x.date)}</b> ${esc(x.heure || "")} ${x.tag ? `<span class="tag">${esc(x.tag)}</span>` : ""}<span class="jnb">${btn("✏️", "jnedit", "", `data-id="${x.id}" title="Modifier"`)}${btn("🗑️", "jndel", "del", `data-id="${x.id}" title="Supprimer"`)}</span></div><div>${nl2br(x.t)}</div></div>`).join("");
  if (L.length > S.jnN) h += `<p>${btn("Voir les notes plus anciennes", "jnmore", "sec")}</p>`;
  return h;
}

// ---------- 🧬 résultats d'examens PMA (config n°23 : { exams: [{ id, date, type, lieu, v: { libellé: valeur }, concl }] }) ----------
const EX_TYPES = {
  "Échographie pelvienne": ["Follicules antraux, total|nb", "Ovaire droit, follicules|nb", "Ovaire gauche, follicules|nb", "Épaisseur de l'endomètre|mm", "Aspect des ovaires|"],
  "AMH": ["AMH|ng/mL"],
  "Bilan hormonal (début de cycle)": ["FSH|UI/L", "LH|UI/L", "Œstradiol|pg/mL", "Prolactine|ng/mL", "TSH|mUI/L"],
  "Spermogramme (partenaire)": ["Volume|mL", "Concentration|M/mL", "Mobilité progressive|%", "Formes typiques|%", "Vitalité|%"],
  "Hystérosalpingographie (trompes)": ["Trompe droite|", "Trompe gauche|", "Cavité de l'utérus|"],
  "Autre examen": ["Résultat principal|"],
};
const exNotes = () => (cfg(23).exams || []).slice();
const exChamps = (type) => (EX_TYPES[type] || []).map((s) => { const [l, u] = s.split("|"); return { l, u }; });
function resultatsPma() {
  if (!S.exType) S.exType = Object.keys(EX_TYPES)[0];
  const ed = S.exEdit ? exNotes().find((x) => String(x.id) === String(S.exEdit)) : null, type = S.exType;
  let h = `<hr><h3>🧬 Mes résultats d'examens (échographie, AMH, spermogramme…)</h3><p class="muted">Les valeurs de chaque examen sont rangées par date, pour les retrouver et les comparer. Les valeurs « normales » dépendent du laboratoire : regarde les normes écrites sur ton compte rendu. Les prises de sang détaillées restent dans l'onglet « Suivi Glycémie &amp; Nutrition ».</p>
  <h4>${ed ? "✏️ Modifier ce résultat" : "Ajouter un résultat"}</h4>
  <div class="row">${dateField("exDate", "🗓️ Date de l'examen", ed ? ed.date : today(), "")}${sel("exType", "Type d'examen", Object.keys(EX_TYPES), type)}</div>
  <div class="row">${exChamps(type).map((c, i) => field("ex_" + i, c.l + (c.u ? " (" + c.u + ")" : ""), "text", ed && ed.type === type ? (ed.v || {})[c.l] || "" : "", c.u ? 'inputmode="decimal"' : "")).join("")}</div>
  ${field("exLieu", "🏢 Où (laboratoire, cabinet, hôpital)", "text", ed ? ed.lieu || "" : "")}
  ${area("exConcl", "📝 Conclusion / ce que le médecin a dit", ed ? ed.concl || "" : "")}
  ${btn(ed ? "💾 Enregistrer la modification" : "💾 Enregistrer ce résultat", "exsave")}${ed ? btn("Annuler", "excancel", "sec") : ""}`;
  const all = exNotes();
  if (!all.length) return h + `<p class="muted">Aucun résultat enregistré pour l'instant.</p>`;
  const types = Object.keys(EX_TYPES).filter((t) => all.some((x) => x.type === t));
  h += types.map((t) => {
    const L = all.filter((x) => x.type === t).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id), ch = exChamps(t);
    return fold(`${esc(t)} (${L.length})`, L.map((x, i) => {
      const prev = L[i + 1], vals = ch.filter((c) => (x.v || {})[c.l]).map((c) => {
        let s = `${esc(c.l)} : <b>${esc(x.v[c.l])}</b>${c.u ? " " + esc(c.u) : ""}`;
        const a = num(x.v[c.l]), b = prev && prev.v ? num(prev.v[c.l]) : null;
        if (c.u && a !== null && b !== null && a !== b) s += ` <span class="muted">(${a > b ? "↗" : "↘"} avant : ${esc(prev.v[c.l])} le ${fr2(prev.date)})</span>`;
        return s;
      });
      return `<div class="jn"><div class="jnh"><b>${fr(x.date)}</b> ${x.lieu ? `<span class="muted">${esc(x.lieu)}</span>` : ""}<span class="jnb">${btn("✏️", "exedit", "", `data-id="${x.id}" title="Modifier"`)}${btn("🗑️", "exdel", "del", `data-id="${x.id}" title="Supprimer"`)}</span></div>${vals.map((v) => `<div>${v}</div>`).join("")}${x.concl ? `<div class="muted">📝 ${nl2br(x.concl)}</div>` : ""}</div>`;
    }).join(""), t === types[0]);
  }).join("");
  return h;
}
function exFicheLignes() {
  const all = exNotes(); if (!all.length) return [];
  return Object.keys(EX_TYPES).filter((t) => all.some((x) => x.type === t)).map((t) => {
    const x = all.filter((y) => y.type === t).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
    const v = exChamps(t).filter((c) => (x.v || {})[c.l]).map((c) => `${c.l} ${x.v[c.l]}${c.u ? " " + c.u : ""}`).join(", ");
    return `${t} (${fr(x.date)}) : ${v}${x.concl ? (v ? " — " : "") + x.concl.replace(/\s*\n\s*/g, " ") : ""}`;
  });
}

// ---------- actions ----------
const ACT_NEW = {
  goto(el) { DIRTY.clear(); S.tab = el.dataset.t; location.hash = S.tab; render(); window.scrollTo(0, 0); },
  async todayall() { S.dashDate = today(); await ACT_DASH.toutpris(); },
  // questions
  async qradd() {
    const q = val("qrQ").trim(); if (!q) return toast("Écris d'abord ta question.");
    if (await ins("questions_medecin", { Date: today(), Question: q, Pour: val("qrP"), "Posée": "Non", "Réponse": "" })) { toast("❓ Question ajoutée"); render(); }
  },
  async qrdone(el) {
    const rep = prompt("Qu'a répondu le médecin ? (facultatif, tu peux laisser vide)") ;
    if (rep === null) return;
    if (await upd("questions_medecin", +el.dataset.id, { "Posée": "Oui", "Réponse": rep })) { await loadTables(["questions_medecin"]); toast("✅ Question posée"); render(); }
  },
  async qrdel(el) { if (confirm("Supprimer cette question ?") && await del("questions_medecin", [+el.dataset.id])) render(); },
  // journal
  async jnsave() {
    const t = val("jnTexte").trim(); if (!t) return toast("Écris quelque chose d'abord.");
    const note = { date: dval("jnDate") || today(), heure: val("jnHeure"), tag: val("jnTag"), t };
    const L = jnNotes();
    const out = S.jnEdit ? L.map((x) => String(x.id) === String(S.jnEdit) ? { ...x, ...note } : x) : [...L, { id: Date.now(), ...note }];
    if (await saveCfg(22, { notes: out })) { S.jnEdit = null; DIRTY.clear(); toast("📝 Note enregistrée"); render(); }
  },
  jnedit(el) { DIRTY.clear(); S.jnEdit = el.dataset.id; render(); window.scrollTo(0, 0); },
  jncancel() { DIRTY.clear(); S.jnEdit = null; render(); },
  async jndel(el) { if (confirm("Supprimer cette note ?") && await saveCfg(22, { notes: jnNotes().filter((x) => String(x.id) !== el.dataset.id) })) { toast("Note supprimée"); render(); } },
  jnmore() { S.jnN += 30; render(); },
  // résultats d'examens
  async exsave() {
    const type = val("exType"), v = {};
    exChamps(type).forEach((c, i) => { const x = val("ex_" + i).trim(); if (x) v[c.l] = x; });
    const concl = val("exConcl").trim();
    if (!Object.keys(v).length && !concl) return toast("Écris au moins une valeur ou une conclusion.");
    const e = { date: dval("exDate") || today(), type, lieu: val("exLieu").trim(), v, concl };
    const L = exNotes();
    const out = S.exEdit ? L.map((x) => String(x.id) === String(S.exEdit) ? { ...x, ...e } : x) : [...L, { id: Date.now(), ...e }];
    if (await saveCfg(23, { exams: out })) { S.exEdit = null; [...DIRTY].filter((k) => k.startsWith("#ex")).forEach((k) => DIRTY.delete(k)); toast("🧬 Résultat enregistré"); render(); }
  },
  exedit(el) { const x = exNotes().find((y) => String(y.id) === el.dataset.id); if (!x) return; DIRTY.clear(); S.exEdit = x.id; S.exType = x.type; render(); },
  excancel() { DIRTY.clear(); S.exEdit = null; render(); },
  async exdel(el) { if (confirm("Supprimer ce résultat ?") && await saveCfg(23, { exams: exNotes().filter((x) => String(x.id) !== el.dataset.id) })) { toast("Résultat supprimé"); render(); } },
};
const CHG_NEW = {
  jnQ(el) { S.jnQ = el.value; keepRender(); },
  exType(el) { S.exType = el.value; [...DIRTY].filter((k) => k.startsWith("#ex_")).forEach((k) => DIRTY.delete(k)); keepRender(); },
};

// ---------- 🔗 lien entre la glycémie et les pas ----------
// Tu mesures 2 fois par semaine (lundi ou mardi : à jeun ; vendredi ou samedi : après repas) : on compare chaque mesure
// avec les pas de la veille (la glycémie à jeun reflète la veille) et du jour même (après repas).
const GP_JOURS = [1, 2, 5, 6]; // lundi, mardi, vendredi, samedi
const gpPas = (d) => { const x = QJ()[d]; const p = x ? num(x.pas) : null; return p === null || p === undefined || isNaN(p) ? null : p; };
function gpMesures() {
  const out = [];
  rows("suivi_glycemie").forEach((r) => {
    const a = gv(r["Glycémie à jeun"]), b = gv(r["Glycémie Post-Prandiale"]);
    const prev3 = [1, 2, 3].map((k) => gpPas(addDays(r.Date, -k))).filter((v) => v !== null);
    const base = { date: r.Date, veille: gpPas(addDays(r.Date, -1)), jour: gpPas(r.Date), moy3: prev3.length ? avg(prev3) : null };
    if (a !== null) out.push({ ...base, type: "À jeun", g: a, ref: base.veille });
    if (b !== null) out.push({ ...base, type: "Après repas", g: b, ref: base.jour !== null ? base.jour : base.veille });
  });
  return out.sort((x, y) => y.date.localeCompare(x.date));
}
function gpCorr(L) {
  if (L.length < 5) return null;
  const mx = avg(L.map((x) => x.ref)), my = avg(L.map((x) => x.g));
  const sxy = L.reduce((s, x) => s + (x.ref - mx) * (x.g - my), 0), sx = Math.sqrt(L.reduce((s, x) => s + (x.ref - mx) ** 2, 0)), sy = Math.sqrt(L.reduce((s, x) => s + (x.g - my) ** 2, 0));
  return sx && sy ? sxy / (sx * sy) : null;
}
function glyPasBlock() {
  const M = gpMesures(), obj = pasObjectif(), fmt = (n) => Math.round(n).toLocaleString("fr-FR");
  let h = `<h4>🔗 Lien entre ma glycémie et mes pas</h4><p class="muted">Tu mesures ta glycémie 2 fois par semaine (lundi ou mardi à jeun, vendredi ou samedi après un repas). Le site compare chaque mesure avec tes pas : ceux de la <b>veille</b> pour la glycémie à jeun, ceux du <b>jour même</b> pour celle après un repas. <b>Note tes pas aussi la veille des jours de mesure.</b></p>`;
  if (!M.length) return h + `<p class="muted">Dès que tu as noté des glycémies, elles apparaissent ici avec tes pas.</p>`;
  const avec = M.filter((x) => x.ref !== null), sans = M.length - avec.length;
  if (sans) h += `<p class="muted">📝 ${sans} mesure(s) sans nombre de pas noté pour la période concernée : elles ne sont pas comparées.</p>`;
  const bloc = (type, titre, quand) => {
    const L = avec.filter((x) => x.type === type); if (!L.length) return "";
    const haut = L.filter((x) => x.ref >= obj), bas = L.filter((x) => x.ref < obj);
    let s = `<p><b>${titre}</b> (${L.length} mesure(s) avec pas)</p>`;
    if (haut.length >= 2 && bas.length >= 2) {
      const a = avg(haut.map((x) => x.g)), b = avg(bas.map((x) => x.g)), d = b - a;
      s += `<ul><li>${quand} ≥ ${fmt(obj)} pas : <b>${r1(a, 2)} g/L</b> en moyenne (${haut.length} mesures)</li><li>${quand} < ${fmt(obj)} pas : <b>${r1(b, 2)} g/L</b> en moyenne (${bas.length} mesures)</li></ul>`;
      s += Math.abs(d) < 0.03 ? `<p>➡️ Pas de grande différence pour l'instant.</p>` : d > 0 ? `<p>👍 Les jours où tu marches plus, ta glycémie est <b>plus basse de ${r1(d, 2)} g/L</b> en moyenne. Continue comme ça.</p>` : `<p>🤔 Ta glycémie est un peu plus haute quand tu marches plus (${r1(-d, 2)} g/L) : ça peut venir du repas ou du moment de la mesure. Ça reste une tendance sur peu de mesures.</p>`;
    } else s += `<p class="muted">Il faut au moins 2 mesures à ${fmt(obj)} pas ou plus et 2 en dessous pour comparer (là : ${haut.length} et ${bas.length}).</p>`;
    const r = gpCorr(L);
    if (r !== null && Math.abs(r) >= 0.4) s += `<p class="muted">${r < 0 ? "📉 Plus tu marches, plus ta glycémie a tendance à être basse" : "📈 Plus tu marches, plus ta glycémie a tendance à être haute"} (lien ${Math.abs(r) >= 0.7 ? "net" : "modéré"} sur ${L.length} mesures).</p>`;
    return s;
  };
  h += bloc("À jeun", "🌅 Glycémie à jeun et pas de la veille", "Veille à") + bloc("Après repas", "🍽️ Glycémie après repas et pas du jour", "Jour à");
  h += `<div class="tw"><table><thead><tr><th>Date</th><th>Mesure</th><th>Glycémie (g/L)</th><th>Pas la veille</th><th>Pas ce jour</th><th>Moyenne des 3 jours avant</th></tr></thead><tbody>${M.slice(0, 10).map((x) => `<tr><td>${fr(x.date)}</td><td>${x.type}</td><td>${r1(x.g, 2)}</td><td>${x.veille !== null ? fmt(x.veille) : "—"}</td><td>${x.jour !== null ? fmt(x.jour) : "—"}</td><td>${x.moy3 !== null ? fmt(x.moy3) : "—"}</td></tr>`).join("")}</tbody></table></div><p class="muted">Ce sont des tendances sur peu de mesures, pas des preuves : la glycémie dépend aussi de ce que tu manges, du stress et du sommeil.</p>`;
  return h;
}
