// ===== Jour difficile (écran minimal), calendrier PMA, post-partum, message hors connexion =====
const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const jourLib = (d) => JOURS_COURTS[parseD(d).getUTCDay()] + " " + fr2(d);

// ---------- jour difficile : un seul gros bouton ----------
function renderDifficile(date) {
  const { out: manq, total } = manquants(date);
  const faits = total - Object.values(manq).reduce((n, m) => n + m.length, 0);
  let h = `<div class="diff"><h2>🌧️ Jour difficile</h2><p class="muted">Rien d'autre à faire que l'essentiel. Tu en fais déjà beaucoup.</p>`;
  if (Object.keys(manq).length) {
    h += (total ? bar(faits / total) : "") + `<ul class="diffl">${Object.entries(manq).map(([n, m]) => `<li><b>${esc(n)}</b> : ${esc(m.join(", "))}</li>`).join("")}</ul>` + btn("✅ J'ai tout pris", "toutpris", "big");
  } else h += box("ok", "🌿 Tout est fait pour aujourd'hui. Repose-toi.");
  return h + `<p>${btn("Sortir du mode jour difficile", "sortdiff", "sec")}</p></div>`;
}
Object.assign(ACT_DASH, { sortdiff() { S.set.difficile = false; saveSet(); render(); } });

// ---------- calendrier PMA ----------
const pmaDone = () => cfg(16).done || {};
function pmaEvents() {
  const ev = [];
  rows("suivi_pma").forEach((r) => ev.push({ key: "p" + r.id, date: r.Date, icon: "💉", titre: (r["Étape Protocole"] || "Étape") + (r["Médicament / Injection"] ? " : " + r["Médicament / Injection"] : ""), note: r["Notes & Symptômes"] || "", cochable: true }));
  rows("examens_pma").forEach((r) => ev.push({ key: "e" + r.id, date: r.Date, icon: "🧪", titre: r.Examen, note: r.Statut || "", fait: ["Fait", "Résultat reçu"].includes(r.Statut) }));
  rows("rdv_medicaux").filter((r) => r.Statut !== "❌ Annulé").forEach((r) => ev.push({ key: "r" + r.id, date: r.Date, icon: "📅", titre: "Rendez-vous : " + (r["Médecin / Spécialité"] || ""), note: "", fait: r.Statut === "✅ Effectué" }));
  return ev.filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date) || a.titre.localeCompare(b.titre));
}
function pmaCalendrier() {
  const t = today(), D = pmaDone(), ev = pmaEvents().map((e) => ({ ...e, fait: e.fait || !!D[e.key] }));
  const retard = ev.filter((e) => e.date < t && e.date >= addDays(t, -14) && !e.fait), avenir = ev.filter((e) => e.date >= t && e.date <= addDays(t, 60));
  const ligne = (e) => `<tr><td style="white-space:nowrap"><b>${jourLib(e.date)}</b>${e.date === t ? " <small>(aujourd'hui)</small>" : ""}</td><td>${e.icon} ${esc(e.titre)}${e.note ? `<br><small class="muted">${esc(e.note)}</small>` : ""}</td><td>${e.fait ? "✅" : e.cochable ? btn("Fait", "pmatoggle", "sec", `data-k="${esc(e.key)}"`) : ""}</td></tr>`;
  const tr = rows("suivi_pma").filter((r) => /transfert/i.test(r["Étape Protocole"] || "")).map((r) => r.Date).sort().pop();
  let h = `<h3>📅 Mon calendrier de protocole</h3>`;
  if (retard.length) h += box("warn", `⏰ À vérifier (derniers jours, non cochés) :`) + `<div class="tw"><table><tbody>${retard.map(ligne).join("")}</tbody></table></div>`;
  h += avenir.length ? `<div class="tw"><table><tbody>${avenir.map(ligne).join("")}</tbody></table></div>` : `<p class="muted">Rien de prévu dans les 60 prochains jours. Ajoute des injections ci-dessous, des examens plus bas, ou des rendez-vous dans l'onglet Rendez-vous.</p>`;
  if (tr) h += box("info", `🧬 Dernier transfert noté le ${fr(tr)}. La prise de sang de grossesse est souvent demandée 9 à 14 jours après, soit du <b>${fr(addDays(tr, 9))}</b> au <b>${fr(addDays(tr, 14))}</b>. Suis la date donnée par ton équipe PMA.`);
  h += fold("➕ Planifier une série d'injections ou de contrôles", `<p class="muted">Crée d'un coup une ligne par jour (ex : 10 jours d'injection). Tu les coches « Fait » au fur et à mesure.</p>
  <div class="row">${dateField("pcDate", "🗓️ Premier jour", t)}${field("pcNb", "Nombre de jours", "number", "10", 'min="1" max="30"')}${field("pcHeure", "Heure habituelle (facultatif)", "time", "")}</div>
  <div class="row">${sel("pcEtape", "Étape", ["Blocage ovarien", "Stimulation folliculaire", "Déclenchement", "Ponction", "Transfert d'embryon", "Attente Prise de Sang"], "Stimulation folliculaire")}${field("pcMed", "Médicament / dose (ex : Gonal 150 UI)")}</div>
  ${btn("📅 Ajouter au calendrier", "pmaplan")}`);
  return h + `<p class="muted">Ce calendrier rassemble tes étapes de protocole, tes examens PMA et tes rendez-vous médicaux.</p>`;
}
Object.assign(ACT_MODES, {
  async pmatoggle(el) { const D = { ...pmaDone() }; D[el.dataset.k] = true; if (await saveCfg(16, { done: D })) { toast("✅ Noté comme fait"); render(); } },
  async pmaplan() {
    const d0 = dval("pcDate") || today(), n = Math.min(30, Math.max(1, parseInt(val("pcNb")) || 1)), med = val("pcMed").trim(), hr = val("pcHeure");
    if (!med) { toast("Écris le médicament ou la dose."); return; }
    const L = []; for (let i = 0; i < n; i++) L.push({ Date: addDays(d0, i), "Étape Protocole": val("pcEtape"), "Médicament / Injection": med + (hr ? " à " + hr : ""), "Résultats Échographie": "", "Notes & Symptômes": "Planifié" });
    const { error } = await sb.from("suivi_pma").insert(L);
    if (error) { toast("Erreur : " + error.message); return; }
    await loadTables(["suivi_pma"]); toast("📅 " + n + " jour(s) ajouté(s)"); render();
  },
});

// ---------- post-partum & allaitement (config n°17) ----------
const PP = () => cfg(17);
const ppSave = (patch) => saveCfg(17, { ...PP(), ...patch });
const PP_ETAPES = [
  ["conso", "🩺 Consultation post-natale", 42, 56, "Entre 6 et 8 semaines après l'accouchement : on contrôle ta cicatrisation, ton moral, ta contraception."],
  ["perinee", "🧘 Rééducation du périnée", 42, 70, "Souvent prescrite après la consultation post-natale (en général une dizaine de séances)."],
  ["contra", "💊 Parler de la contraception", 42, 56, "À voir lors de la consultation post-natale, surtout si tu allaites."],
  ["glyc", "🩸 Contrôle de la glycémie", 42, 84, "Surtout si tu as eu un diabète gestationnel, un SOPK ou un pré-diabète : demande à ton médecin quand la faire."],
  ["bebe8", "👶 Premier examen médical du bébé", 0, 8, "Autour du 8e jour de vie. Les suivants sont notés dans le carnet de santé."],
  ["bebe1m", "👶 Visite de bébé à 1 mois", 28, 35, "Poids, alimentation, sommeil : pose tes questions."],
];
const PP_SYM = ["Saignements normaux (lochies)", "Douleur de cicatrice / périnée", "Douleurs au ventre (tranchées)", "Engorgement des seins", "Crevasses", "Fatigue importante", "Baby blues (larmes, humeur changeante)", "Sueurs nocturnes", "Constipation", "Fuites urinaires"];
const PP_ALERTE = ["Fièvre (38 °C ou plus)", "Saignements très abondants (une protection par heure)", "Gros caillots ou saignements qui reprennent", "Douleur ou gonflement d'un mollet", "Essoufflement ou douleur dans la poitrine", "Maux de tête forts ou troubles de la vue", "Pertes qui sentent mauvais", "Sein rouge, dur et douloureux avec fièvre", "Idées noires"];
const hm = (ts) => { const d = new Date(ts); return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d); };
const jourDe = (ts) => new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(ts));

function renderPostPartum() {
  const p = PP(), nai = p.naissance || "", t = today();
  let h = `<h2>🍼 Mon post-partum &amp; allaitement</h2><p class="muted">Un espace pour toi après l'accouchement : tes rendez-vous, ton rétablissement et les tétées de bébé.</p>
  <div class="row">${dateField("ppNaiss", "🗓️ Date d'accouchement", nai || t, t)}<div class="fg"><label class="f">&nbsp;</label>${btn("💾 Enregistrer la date", "ppnaiss")}</div></div>`;
  if (nai) {
    const j = diffDays(t, nai);
    h += `<div class="metrics">${metric("👶 Bébé a", j < 14 ? j + " jour(s)" : Math.floor(j / 7) + " semaines")}${metric("🌸 Post-partum", "J + " + j)}</div>`;
    const done = p.done || {};
    h += `<h3>✅ Mes étapes après l'accouchement</h3><p class="muted">Repères habituels : ton équipe peut te donner d'autres dates.</p><div class="tw"><table><tbody>${PP_ETAPES.map(([k, titre, a, b, tx]) => `<tr><td><b>${titre}</b><br><small class="muted">${esc(tx)}</small></td><td style="white-space:nowrap">${fr(addDays(nai, a))}${b > a ? " → " + fr(addDays(nai, b)) : ""}</td><td>${done[k] ? "✅" : btn("Fait", "ppdone", "sec", `data-k="${k}"`)}</td></tr>`).join("")}</tbody></table></div>`;
  }
  // tétées
  const T = (p.tetees || []).slice().sort((a, b) => b.t - a.t), auj = T.filter((x) => jourDe(x.t) === t), dern = T[0];
  h += `<h3>🤱 Tétées et biberons</h3><p class="muted">Un clic à chaque tétée. Ça aide à voir le rythme de bébé, et à le montrer à ta sage-femme ou au pédiatre.</p>
  <p>${btn("🤱 Sein gauche", "tetee", "", 'data-c="Sein gauche"')}${btn("🤱 Sein droit", "tetee", "", 'data-c="Sein droit"')}${btn("🍼 Biberon", "tetee", "sec", 'data-c="Biberon"')}</p>`;
  if (dern) {
    const mn = Math.floor((Date.now() - dern.t) / 60000);
    h += `<p>Dernière : <b>${esc(dern.c)}</b> à ${hm(dern.t)} (il y a ${mn >= 60 ? Math.floor(mn / 60) + " h " + String(mn % 60).padStart(2, "0") : mn + " min"}).${dern.c === "Sein gauche" ? " Prochain : sein droit." : dern.c === "Sein droit" ? " Prochain : sein gauche." : ""}</p>`;
    h += `<div class="metrics">${metric("Aujourd'hui", auj.length + " fois")}${metric("Sein gauche", auj.filter((x) => x.c === "Sein gauche").length)}${metric("Sein droit", auj.filter((x) => x.c === "Sein droit").length)}${metric("Biberons", auj.filter((x) => x.c === "Biberon").length)}</div>`;
    h += fold(`📋 Dernières tétées (${Math.min(T.length, 15)})`, `<div class="tw"><table><tbody>${T.slice(0, 15).map((x) => `<tr><td>${fr(jourDe(x.t))} ${hm(x.t)}</td><td>${esc(x.c)}</td><td><button class="b del" data-act="teteedel" data-t="${x.t}" title="Supprimer">🗑️</button></td></tr>`).join("")}</tbody></table></div>`);
  }
  // journal de moi
  const J = p.jours || {}, dates = Object.keys(J).sort().reverse();
  h += `<h3>🌸 Comment je vais</h3>
  ${box("info", "💛 Le « baby blues » (larmes, irritabilité, fatigue) est très fréquent les premiers jours. Si la tristesse, l'angoisse ou l'épuisement durent plus de 2 semaines, ou t'empêchent de profiter de bébé, parles-en à ta sage-femme ou à ton médecin : ça se soigne.")}
  ${dateField("ppJour", "🗓️ Jour", t, t)}
  <p><b>Ce que je ressens</b></p><div class="chips">${PP_SYM.map((s) => `<label class="ck"><input type="checkbox" name="pps" value="${esc(s)}"> ${esc(s)}</label>`).join("")}</div>
  <p><b>⚠️ Signes d'alerte</b></p><div class="chips">${PP_ALERTE.map((s) => `<label class="ck"><input type="checkbox" name="pps" data-u="1" value="${esc(s)}"> ${esc(s)}</label>`).join("")}</div>
  <div id="ppAlert"></div>${field("ppNote", "Note (facultatif)")}${btn("💾 Enregistrer mon journal", "ppjour")}`;
  const rec = dates.filter((d) => diffDays(t, d) < 3).flatMap((d) => (J[d].sym || []).filter((s) => PP_ALERTE.includes(s)));
  if (rec.length) h += box("err", "⚠️ Ces derniers jours tu as noté : <b>" + esc([...new Set(rec)].join(" ; ")) + "</b>. Contacte sans attendre ta sage-femme, ta maternité ou ton médecin, ou le 15 en cas d'urgence.");
  if (dates.length) h += fold(`📋 Mon journal (${dates.length})`, `<div class="tw"><table><thead><tr><th>Date</th><th>Ressenti</th><th>Note</th><th></th></tr></thead><tbody>${dates.slice(0, 30).map((d) => `<tr><td>${fr(d)}</td><td>${esc((J[d].sym || []).join(" · "))}</td><td>${esc(J[d].note || "")}</td><td><button class="b del" data-act="ppjourdel" data-d="${d}" title="Supprimer">🗑️</button></td></tr>`).join("")}</tbody></table></div>`);
  return h + `<p class="muted">Urgence : le 15. Idées noires : le 3114 (24 h/24, gratuit) ou le 15.</p>`;
}
function afterPostPartum() {
  const f = () => { const u = [...document.querySelectorAll('input[name="pps"][data-u]:checked')].map((e) => e.value); if ($("ppAlert")) $("ppAlert").innerHTML = u.length ? box("err", "🛑 <b>À ne pas laisser passer :</b> " + esc(u.join(" ; ")) + ". Appelle ta sage-femme, ta maternité ou le 15 sans attendre." + (u.includes("Idées noires") ? " Si tu as des idées noires : 3114 (24 h/24) ou le 15." : "")) : ""; };
  document.querySelectorAll('input[name="pps"]').forEach((e) => e.addEventListener("change", f));
}
Object.assign(ACT_MODES, {
  async ppnaiss() { if (await ppSave({ naissance: dval("ppNaiss") || today() })) { toast("🎉 Date enregistrée"); render(); } },
  async ppdone(el) { if (await ppSave({ done: { ...(PP().done || {}), [el.dataset.k]: true } })) render(); },
  async tetee(el) { const L = [...(PP().tetees || []), { t: Date.now(), c: el.dataset.c }].slice(-300); if (await ppSave({ tetees: L })) { toast("✔️ " + el.dataset.c + " noté"); render(); } },
  async teteedel(el) { if (confirm("Supprimer cette ligne ?") && await ppSave({ tetees: (PP().tetees || []).filter((x) => String(x.t) !== el.dataset.t) })) render(); },
  async ppjour() { const j = { ...(PP().jours || {}) }; j[dval("ppJour") || today()] = { sym: picked("pps"), note: val("ppNote") }; if (await ppSave({ jours: j })) { toast("🎉 Journal enregistré"); render(); } },
  async ppjourdel(el) { const j = { ...(PP().jours || {}) }; if (confirm("Supprimer le journal du " + fr(el.dataset.d) + " ?")) { delete j[el.dataset.d]; if (await ppSave({ jours: j })) render(); } },
});

// ---------- message quand il n'y a pas de connexion ----------
(function () {
  const el = document.createElement("div"); el.id = "offline"; el.setAttribute("role", "status");
  el.textContent = "📡 Pas de connexion internet : tes données ne peuvent pas se charger ni s'enregistrer pour l'instant. Elles reviendront dès que le réseau reviendra.";
  el.hidden = navigator.onLine !== false;
  document.body.appendChild(el);
  addEventListener("offline", () => (el.hidden = false));
  addEventListener("online", async () => { el.hidden = true; if ($("login").hidden) { try { await loadAll(); render(); toast("Connexion revenue"); } catch {} } });
})();
