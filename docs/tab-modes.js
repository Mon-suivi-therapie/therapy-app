// ===== Réglages globaux, parcours (cycle / grossesse / PMA), TSA / TDAH / SPT =====
const PARCOURS = ["Suivi de Cycle & Essai Bébé", "Suivi de Grossesse Évolutif", "Parcours PMA (Procréation Médicalement Assistée)"];
S.set = (() => { try { return { parcours: PARCOURS[0], difficile: false, neuro: false, masquer: false, ...JSON.parse(localStorage.getItem("set") || "{}") }; } catch { return { parcours: PARCOURS[0], difficile: false, neuro: false, masquer: false }; } })();
function saveSet() { try { localStorage.setItem("set", JSON.stringify(S.set)); } catch {} document.body.classList.toggle("calme", !!S.set.neuro); }
document.body.classList.toggle("calme", !!S.set.neuro);

function settingsHtml() {
  return `<h3>⚙️ Configuration globale</h3>
  ${sel("sParcours", "🌸 Ton parcours actuel :", PARCOURS, S.set.parcours)}
  ${chk("sDiff", "🌧️ Mode jour difficile (affichage simplifié)", S.set.difficile)}
  ${chk("sNeuro", "🧠 Mode TDAH / TSA (une chose à la fois, plus calme)", S.set.neuro)}
  ${chk("sMasq", "🙈 Masquer le détail de mon poids", S.set.masquer)}<p>${btn("💾 Télécharger une sauvegarde de mes données", "backup", "sec")}${btn("🔒 Me déconnecter de cet appareil", "logout", "sec")}</p><p class="muted">📱 Pour l'avoir comme une appli : sur Android, menu ⋮ puis « Installer l'application » ; sur iPhone (Safari), Partager puis « Sur l'écran d'accueil ».</p><hr>`;
}
const CHG_SET = {
  sParcours(el) { S.set.parcours = el.value; saveSet(); render(); },
  sDiff(el) { S.set.difficile = el.checked; saveSet(); render(); },
  sNeuro(el) { S.set.neuro = el.checked; saveSet(); render(); },
  sMasq(el) { S.set.masquer = el.checked; saveSet(); render(); },
};

// ---------- Onglet Suivi féminin : choix du parcours ----------
const carnetBlock = () => `<details><summary>🧬 Mon carnet PMA (examens, questions, protocole)</summary>${carnetPma()}</details>`;
function renderCycle() {
  if (S.set.parcours === PARCOURS[1]) return renderGrossesse();
  if (S.set.parcours === PARCOURS[2]) return renderPMA();
  return renderCycleEssai() + carnetBlock();
}

// ---------- PMA ----------
function carnetPma() {
  const ex = rows("examens_pma"), pma = rows("suivi_pma"), ST = ["À prendre", "Rendez-vous pris", "Fait", "Résultat reçu"];
  return `<h4>🗂️ Mes examens PMA</h4><p class="muted">Cette liste est un exemple : suis seulement ce que ton médecin ou ton équipe PMA te prescrit.</p>
  <div class="row">${field("peDate", "🗓️ Date (prévue ou réalisée)", "date", today())}${sel("peNom", "Examen", ["Bilan hormonal (FSH, LH, œstradiol, AMH)", "Échographie pelvienne / comptage des follicules", "Hystérosalpingographie (trompes)", "Spermogramme (partenaire)", "Bilan thyroïdien (TSH)", "Bilan glycémique (HbA1c, glycémie à jeun)", "IRM pelvienne (endométriose)", "Autre"])}</div>
  ${field("peAutre", "Si « Autre », nom de l'examen")}${sel("peStatut", "Où j'en suis", ST)}${field("peRes", "Résultat / remarque")}
  ${btn("💾 Enregistrer cet examen", "saveexamen")}${ex.length ? editable("examens_pma", ex, { choix: { Statut: ST } }) : ""}<hr>
  ${questionsBlock("pma")}
  ${pma.length ? `<hr><h4>💉 Mon protocole (historique)</h4>${editable("suivi_pma", pma)}` : ""}`;
}
function renderPMA() {
  return `<h2>Mon Carnet de Bord de Protocole PMA</h2>
  ${field("ppDate", "🗓️ Date du contrôle / injection", "date", today())}
  <div class="row">${sel("ppEtape", "Étape :", ["Blocage ovarien", "Stimulation folliculaire", "Déclenchement", "Ponction", "Transfert d'embryon", "Attente Prise de Sang"])}${field("ppMed", "Médicament / Dose (ex: Gonal 150 UI)")}</div>
  ${field("ppEcho", "Résultats Échographie / Prise de sang")}${field("ppNotes", "Symptômes et consignes")}
  ${btn("💾 Enregistrer cette étape PMA", "savepma")}<hr>${carnetPma()}`;
}

// ---------- Grossesse ----------
const G_DOCS = [["doc_lcc", "Écho T1 - Longueur Cranio-Caudale (LCC en mm)"], ["doc_cn", "Écho T1 - Clarté Nucale (CN en mm)"], ["doc_bip", "Écho T2 - Diamètre Bi-Pariétal (BIP en mm)"], ["doc_poids_est", "Écho T3 - Estimation du poids fœtal (grammes)"], ["doc_col", "Col utérin (ex: Long, Tonique, Fermé)"], ["doc_hu", "Hauteur Utérine (HU en cm)"], ["doc_tension", "Tension artérielle maximale en cabinet (ex: 12/7)"], ["doc_monitoring", "Monitoring RCF & contractions (ex: Réactif, RAS)"], ["doc_glycosurie", "Urine mensuelle - Glycosurie (g/L)"], ["doc_albuminurie", "Urine mensuelle - Albuminurie / Protéinurie (g/L)"]];
const G_VALISE = {
  "👶 Pour bébé": [["v_body", "6 bodys en coton (ouverture croisée)"], ["v_pyj", "6 pyjamas en velours chauds"], ["v_brass", "3 brassières ou gilets en laine"], ["v_chauss", "4 paires de chaussettes + 1 paire de chaussons"], ["v_bonnet", "2 bonnets de naissance"], ["v_turb", "2 gigoteuses (0-6 mois)"], ["v_lange", "5 langes en tissu"], ["v_sortie", "1 nid d'ange ou couverture chaude pour la sortie"]],
  "🤰 Pour maman": [["v_adm", "Dossier médical complet (carte vitale, groupe sanguin, échos, bilans)"], ["v_confort", "3 ou 4 tenues très amples, pyjamas confortables"], ["v_chaussons", "Claquettes ou chaussons faciles à enfiler"], ["v_hyg", "Trousse de toilette + serviettes de maternité"], ["v_slip", "5 slips jetables ou culottes en coton jetables"], ["v_allait", "Si allaitement : 2 soutiens-gorge, coussinets, crème lanoline"], ["v_brume", "Brumisateur d'eau thermale"]],
  "🧔 Pour le papa / l'accompagnant": [["v_monnaie", "Monnaie ou carte bancaire (machine à café)"], ["v_snack", "Snacks, barres de céréales, boissons"], ["v_chargeur", "Chargeurs de téléphone (câble long)"], ["v_rechange", "1 ou 2 t-shirts de rechange + trousse de secours"], ["v_occu", "Lecture, écouteurs, de quoi s'occuper"]],
};
const GENRES = ["Non renseigné / Winter Surprise 🤫", "Fille 🌸", "Garçon 💎", "Jumeaux / Grossesse Multiple 🤰🤰"];
function renderGrossesse() {
  const pc = cfg(1), meth = S.gMeth || "ovul";
  let ovul, terme;
  if (meth === "ovul") { ovul = S.gOvul || pc.date_ovulation || addDays(today(), -35); terme = addDays(ovul, 273); }
  else { terme = S.gDpa || pc.dpa || addDays(today(), 240); ovul = addDays(terme, -273); }
  S.gCalc = { ovul, terme };
  S.sa = Math.max(0, Math.floor(diffDays(today(), addDays(ovul, -14)) / 7));
  const debut = addDays(ovul, -14), j = diffDays(today(), debut), sa = Math.max(0, Math.floor(j / 7)), sj = Math.max(0, j % 7), fmt = (a, b) => `du ${fr(addDays(debut, a))} au ${fr(addDays(debut, b))}`;
  const evo = sa <= 6 ? "🌱 <b>Phase embryonnaire précoce :</b> l'embryon se structure. Prends ton acide folique." : sa <= 10 ? "🍋 <b>Évolution morphologique :</b> bébé fait la taille d'une framboise. Fractionne tes assiettes contre les nausées." : sa <= 14 ? "🍓 <b>Fin du 1er trimestre :</b> les traits se précisent, l'échographie T1 approche." : sa <= 19 ? "🍏 <b>Deuxième trimestre confortable :</b> bébé grandit, poursuis ta marche active pour l'insuline." : sa <= 24 ? "🍌 <b>Échographie morphologique (T2) :</b> bébé bouge beaucoup et commence à entendre tes sons." : sa <= 28 ? "🥕 <b>Vigilance métabolique :</b> c'est la période du test HGPO. Reste rigoureuse sur l'eau pure." : sa <= 32 ? "🥥 <b>Échographie T3 en approche :</b> bébé s'arrondit. Mange en plus petites quantités pour éviter les reflux." : sa <= 36 ? "🍍 <b>Préparation :</b> bébé commence à se retourner tête en bas. Prépare ta valise de maternité." : "🍉 <b>Mois du terme :</b> bébé est prêt à naître à tout moment. Repose-toi au maximum.";
  return `<h2>Mon Suivi de Grossesse</h2>
  ${sel("gMeth", "Méthode :", ["Entrer ma date d'ovulation / conception", "Entrer ma date de terme officielle (DPA)"], meth === "ovul" ? "Entrer ma date d'ovulation / conception" : "Entrer ma date de terme officielle (DPA)")}
  ${meth === "ovul" ? dateField("gOvul", "🗓️ Date exacte de ton ovulation :", ovul) : dateField("gDpa", "🗓️ Date Prévue d'Accouchement (terme) :", terme)}
  ${btn("💾 Sauvegarder mon calendrier", "savecal")}
  <div class="metrics">${metric("🤰 Où j'en suis", `${sa} SA + ${sj} J`)}</div><p class="muted">Date prévue d'accouchement : ${fr(terme)}</p>
  <h3>📢 L'évolution de bébé cette semaine</h3>${box("ok", evo)}
  <h3>🗓️ Mon calendrier de grossesse : mois, SG et SA</h3>${calendrierSA(sa)}
  <h3>⏱️ Compteurs : contractions et mouvements de bébé</h3>${compteursGrossesse()}
  <h3>🩺 Mon journal de symptômes</h3>${journalGrossesse()}
  <h3>📈 Mon poids et ma tension</h3>${courbesGrossesse()}
  <h3>🩺 Ma tension</h3>${tensionBlock()}
  <h3>👶 Informations secrètes sur bébé(s)</h3>
  ${sel("gGenre", "👶 Genre du bébé :", GENRES, pc.genre_bebe || GENRES[0])}${field("gNotesB", "📝 Notes sur les échographies", "text", pc.notes_bebe || "")}
  <details><summary>📁 Range-documents : mesures, suivi sage-femme &amp; monitorings</summary>
    ${G_DOCS.map(([k, l]) => field("gd_" + k, l, "text", pc[k] || "")).join("")}
    ${sel("gToxo", "Statut sérologie toxoplasmose :", ["Non immunisée (prise de sang mensuelle obligatoire) 🩸", "Immunisée ✅"], pc.doc_toxo || "Non immunisée (prise de sang mensuelle obligatoire) 🩸")}</details>
  <details><summary>🍼 Checklist : la valise de maternité complète</summary>
    ${Object.entries(G_VALISE).map(([t, l]) => `<p><b>${t}</b></p>${l.map(([k, tx]) => chk("gv_" + k, tx, !!pc[k])).join("")}`).join("")}</details>
  <h3>🩺 Mon accompagnement première grossesse &amp; vigilance</h3>
  ${chk("gRisque", "⚠️ Activer le suivi : grossesse à risque", !!pc.grossesse_risque)}
  ${pc.grossesse_risque ? box("warn", "🛑 <b>Protocole vigilance activé : spécial SOPK &amp; résistance à l'insuline.</b>") + `<details><summary>🚨 ALERTE ROUGE : quand consulter immédiatement les urgences maternité ?</summary><ul><li>🩸 Saignements vaginaux</li><li>⚡ Contractions utérines douloureuses et régulières</li><li>🫨 Signes de tension élevée (pré-éclampsie)</li></ul></details>` : ""}
  ${btn("💾 Sauvegarder mon dossier complet", "savedossier")}
  ${infosGrossesse(sa)}
  <h3>📅 Mon calendrier de suivi médical &amp; démarches</h3><ul>
  <li>🩺 <b>7 à 10 SA (${fmt(49, 69)}) :</b> échographie de datation.</li>
  <li>📋 <b>Avant 14 SA (${fmt(77, 97)}) :</b> <b>échographie T1 (obligatoire)</b> + déclaration CAF/CPAM.</li>
  <li>🩸 <b>Chaque mois :</b> prise de sang toxoplasmose + analyse d'urine (albuminurie / glycosurie).</li>
  <li>🩺 <b>20 à 24 SA (${fmt(140, 174)}) :</b> <b>échographie T2 morphologique</b>.</li>
  <li>🧪 <b>24 à 28 SA (${fmt(168, 196)}) :</b> <b>test du diabète gestationnel (HGPO)</b>.</li>
  <li>🩺 <b>30 à 34 SA (${fmt(210, 244)}) :</b> <b>échographie T3 de croissance</b>.</li>
  <li>🏥 <b>Au 8ème mois :</b> consultation d'anesthésie pour la péridurale.</li></ul>`;
}

// ---------- TSA / TDAH / SPT ----------
const TROUBLES = {
  TSA: { titre: "🧩 TSA : trouble du spectre de l'autisme", cfg: 6, scores: [["🔊 Surcharge sensorielle", "Surcharge sensorielle (0-10)", 3]],
    evenements: ["Meltdown (crise)", "Shutdown (je me suis éteinte)", "Difficulté à parler / mutisme", "Épuisement social (masking)", "Besoin d'isolement", "Changement de programme mal vécu", "Stimming important", "Aucun événement"],
    declencheurs: ["Bruit", "Lumière", "Foule", "Changement de programme", "Imprévu", "Contact physique", "Odeur / texture", "Contexte médical", "Échange social", "Manque de sommeil", "Faim", "Douleur", "Je ne sais pas"],
    champs: [["signes", "⚠️ Mes signes de surcharge (comment je sais que ça monte)", "Ex : je me crispe, je n'entends plus bien, j'ai chaud, je fuis les regards..."], ["declencheurs", "🎯 Mes déclencheurs sensoriels et sociaux", "Ex : bruits soudains, néons, changements de plan, foule, certaines textures..."], ["aide", "💛 Ce qui m'apaise", "Ex : casque anti-bruit, pièce sombre, couverture lestée, objet à tenir, musique..."], ["eviter", "🚫 Ce qui m'aggrave", "Ex : qu'on me touche sans prévenir, qu'on me presse, les questions pendant une crise..."], ["soignants", "🩺 Ce que mes soignants peuvent faire", "Ex : expliquer chaque geste, me donner les consignes par écrit, me laisser du temps pour répondre."]] },
  TDAH: { titre: "⚡ TDAH : trouble de l'attention avec ou sans hyperactivité", cfg: 9, scores: [["🎯 Concentration (10 = facile)", "Concentration (0-10)", 5], ["🌀 Agitation / impulsivité", "Agitation / impulsivité (0-10)", 3]],
    evenements: ["Hyperfocus (j'ai oublié de manger ou boire)", "Oublis ou retards", "Blocage / procrastination", "Impulsivité (achat, parole, décision)", "Difficulté à finir ce que je commence", "Médicament oublié", "Fatigue mentale forte", "Aucun événement"],
    declencheurs: ["Trop de tâches à la fois", "Distractions / bruit", "Manque de sommeil", "Faim", "Ennui", "Stress", "Écrans", "Changement de routine", "Je ne sais pas"],
    champs: [["signes", "⚠️ Mes signes de dispersion ou de débordement", "Ex : j'ouvre dix onglets, je tourne en rond, je perds mes affaires, je m'énerve vite..."], ["declencheurs", "🎯 Ce qui me fait décrocher", "Ex : notifications, bruit, tâche trop floue, trop de choses à décider..."], ["aide", "💛 Ce qui m'aide à démarrer et à tenir", "Ex : minuteur, musique, faire à deux, listes courtes, rituel de départ..."], ["eviter", "🚫 Ce qui m'aggrave", "Ex : les longues listes, les consignes orales rapides, les interruptions..."], ["soignants", "🩺 Ce que mes soignants peuvent faire", "Ex : consignes courtes et écrites, rappels de rendez-vous, un seul sujet à la fois."]] },
  SPT: { titre: "🌿 SPT : stress post-traumatique", cfg: 10, scores: [["⚡ Anxiété / hypervigilance", "Anxiété / hypervigilance (0-10)", 3]],
    evenements: ["Flashback", "Cauchemar", "Crise de panique", "Dissociation (déconnectée)", "Sursauts / hypervigilance", "Évitement", "Engourdissement émotionnel", "Aucun événement"],
    declencheurs: ["Bruit soudain", "Odeur", "Contexte médical / examen", "Contact physique", "Lieu précis", "Date ou anniversaire", "Conflit", "Être seule", "Manque de sommeil", "Je ne sais pas"],
    champs: [["signes", "⚠️ Mes signes d'alerte (comment je sais que ça monte)", "Ex : cœur qui s'accélère, souffle court, je me fige, je me sens loin de mon corps..."], ["declencheurs", "🎯 Mes déclencheurs connus", "Ex : certains bruits, odeurs, lieux, situations médicales..."], ["aide", "💛 Ce qui m'aide à revenir au présent", "Ex : respirer lentement, nommer ce que je vois, appeler quelqu'un, sentir mes pieds au sol..."], ["eviter", "🚫 Ce qui m'aggrave", "Ex : être surprise, se sentir bloquée, qu'on me touche sans prévenir..."], ["lieu_sur", "🏡 Mon lieu sûr (réel ou imaginé)", "Ex : mon salon, mon lit, un endroit au bord de l'eau..."], ["soignants", "🩺 Ce que mes soignants peuvent faire", "Ex : tout m'expliquer avant, me laisser dire stop, un examen au rythme que je choisis."]] },
};
const PHRASES = {
  TSA: ["Je suis en surcharge. J'ai besoin de silence et de calme pendant un moment.", "Je ne peux pas parler maintenant. Je te réponds par message plus tard.", "Peux-tu me l'écrire ou me le répéter plus lentement, une chose à la fois ?", "Prévenez-moi avant de me toucher et expliquez-moi ce que vous allez faire.", "J'ai besoin d'une pause. On peut reprendre dans 10 minutes ?"],
  TDAH: ["Je n'arrive pas à démarrer. Peux-tu rester avec moi pendant les 10 premières minutes ?", "Peux-tu me donner une seule consigne à la fois ?", "J'ai besoin que tu me l'écrives pour que je ne l'oublie pas.", "Je me suis dispersée, je reprends tranquillement là où j'en étais."],
  SPT: ["Je suis en sécurité maintenant. Ce que je ressens est un souvenir.", "J'ai besoin que tu m'expliques ce que tu vas faire avant de le faire.", "Stop. J'ai besoin d'une pause.", "Ce n'est pas contre toi. Mon corps est en alerte, j'ai besoin d'un peu de temps."],
};
const ol = (a) => `<ol>${a.map((x) => `<li>${x}</li>`).join("")}</ol>`;

const timerBlock = () => `<details><summary>⏱️ Minuteur de focus / pause</summary><div style="text-align:center"><div id="tmr" style="font-family:'Playfair Display',serif;font-size:2.6rem;color:var(--rose-d)">10:00</div>
  ${btn("5 min", "tmgo", "sec", 'data-m="5"')}${btn("10 min", "tmgo", "sec", 'data-m="10"')}${btn("25 min", "tmgo", "sec", 'data-m="25"')}${btn("Arrêter", "tmstop", "sec")}<div id="tmrMsg" class="muted"></div></div></details>`;
const breathBlock = () => `<details><summary>🌬️ Respiration guidée (4 s inspire, 6 s expire)</summary><div style="text-align:center"><div id="brC" style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,var(--mauve),var(--rose));margin:25px auto;transition:all 4s ease-in-out"></div><div id="brL">Appuie pour commencer</div>${btn("Démarrer", "brstart", "sec")}${btn("Arrêter", "brstop", "sec")}</div></details>`;
const phrasesBlock = (c) => `<details><summary>🗣️ Phrases toutes prêtes (à montrer quand parler est dur)</summary>${PHRASES[c].map((p) => `<blockquote style="border-left:4px solid var(--rose);margin:.6rem 0;padding:.3rem 1rem;background:var(--rose-l);border-radius:0 12px 12px 0"><b>${esc(p)}</b></blockquote>`).join("")}</details>`;

function routineBlock() {
  const r = cfg(7);
  const steps = [["🌅 Matin", "matin"], ["☀️ Journée", "jour"], ["🌙 Soir", "soir"]].map(([t, k]) => [t, k, String(r[k] || "").split("\n").map((x) => x.trim()).filter(Boolean)]);
  const total = steps.reduce((n, s) => n + s[2].length, 0);
  return `<h3>🗓️ Ma routine prévisible</h3><p class="muted">Des repères fixes apaisent. Une étape par ligne.</p>
  <details><summary>✏️ Écrire / modifier ma routine</summary>${area("rMatin", "🌅 Matin", r.matin || "", "Boire un verre d'eau\nPrendre mes médicaments\nPetit-déjeuner")}${area("rJour", "☀️ Journée", r.jour || "")}${area("rSoir", "🌙 Soir", r.soir || "", "Préparer les affaires de demain\nLumière douce")}${btn("💾 Enregistrer ma routine", "saveroutine")}</details>
  ${steps.filter((s) => s[2].length).map(([t, k, l]) => `<p><b>${t}</b></p>${l.map((e) => chk("rt_" + k + "_" + l.indexOf(e), esc(e), false, 'data-rt="1"')).join("")}`).join("")}
  ${total ? `<div id="rtBar">${bar(0)}<p class="muted">0 étape(s) sur ${total}</p></div>` : `<p class="muted">Ta routine est vide pour l'instant.</p>`}`;
}
function videTeteBlock() {
  const vt = cfg(8).items || [];
  return `<h3>🧺 Vide-tête</h3><p class="muted">Note vite ce qui tourne dans ta tête. Tu le traiteras plus tard, tu n'as pas à le garder en mémoire.</p>
  ${field("vtTxt", "Ce qui me passe par la tête", "text", "", 'placeholder="Ex : rappeler la pharmacie"')}${btn("➕ Poser dans le vide-tête", "vtadd")}
  ${vt.length ? vt.map((x, i) => chk("vt_" + i, esc(x))).join("") + btn("✅ Retirer ce qui est coché (fait ou plus utile)", "vtdel", "sec") : `<p class="muted">Rien dans le vide-tête. 🌿</p>`}`;
}

function renderTrouble(code) {
  const c = TROUBLES[code], plan = cfg(c.cfg);
  const tt = rows("suivi_neuro").filter((r) => num(r[c.scores[0][1]]) !== null).sort((a, b) => b.Date.localeCompare(a.Date));
  let h = `<h2>${c.titre}</h2><p class="muted">Des repères pratiques, pas un diagnostic ni un traitement : ils ne remplacent pas ton équipe de soin.${code === "SPT" ? " En détresse ou en danger : <b>3114</b> (prévention du suicide, 24h/24) ou <b>15 / 112</b>." : ""}</p><h3>🆘 Là, maintenant</h3>`;
  if ((plan.aide || "").trim()) h += box("ok", "💛 <b>Ce qui m'aide (mon plan) :</b> " + esc(plan.aide.split("\n").map((x) => x.trim()).filter(Boolean).join(" / ")));
  if ((plan.phrase || "").trim()) h += box("info", "🗨️ <b>Ma phrase :</b> " + esc(plan.phrase.trim()));
  if (code === "TSA") {
    const sit = S.tsaSit || "m";
    h += sel("tsaSit", "Ce que je vis :", ["🔊 Surcharge / meltdown", "🌫️ Shutdown (je m'éteins)"], sit === "m" ? "🔊 Surcharge / meltdown" : "🌫️ Shutdown (je m'éteins)");
    h += sit === "m" ? ol(["<b>Réduire l'entrée :</b> m'éloigner du bruit, de la lumière, des gens. Baisser la luminosité, mettre casque ou bouchons.", "<b>Ne rien demander de plus :</b> pas de décision, pas de conversation. Utiliser une phrase toute prête ou un message.", "<b>Mon corps d'abord :</b> stimming autorisé, couverture lestée ou pression douce, position confortable.", "<b>Attendre sans me juger :</b> ça passe. Un peu d'eau, grignoter si possible.", "<b>Après :</b> noter ce qui l'a déclenchée dans le check-in, sans me blâmer, et me reposer plus que d'habitude."])
      : ol(["<b>Accepter l'arrêt :</b> mon cerveau se protège, ce n'est pas de la mauvaise volonté.", "<b>Zéro exigence :</b> annuler ou reporter ce qui peut l'être, prévenir une personne de confiance par message.", "<b>Un environnement calme :</b> pénombre, silence, couverture, objet réconfortant.", "<b>Petits besoins de base :</b> eau, nourriture facile, toilettes. Rien d'autre.", "<b>Reprendre très doucement :</b> un seul geste simple à la fois, sans me juger."]);
  } else if (code === "TDAH") {
    h += ol(["<b>Une seule petite action :</b> la plus petite possible (ouvrir le document, poser le linge sur le lit, remplir un verre d'eau).", "<b>Règle des 2 minutes :</b> je commence juste 2 minutes. Si je veux m'arrêter après, c'est permis.", "<b>Minuteur :</b> 5 à 10 minutes, puis pause (minuteur ci-dessous).", "<b>Sortir de ma tête :</b> tout ce qui tourne va dans le vide-tête plus bas. Je n'ai pas à tout retenir.", "<b>Récompense simple :</b> après la tâche, quelque chose de petit et agréable."]) + timerBlock();
  } else {
    h += ol([`<b>Me dire la vérité du moment :</b> « Je suis en sécurité maintenant. Nous sommes le <b>${fr(today())}</b>. Ce que je ressens est un souvenir, ça va passer. »`, "<b>Respirer plus lentement :</b> inspirer 4 secondes, expirer 6 secondes (outil ci-dessous), 5 à 10 fois.", "<b>Ancrage 5-4-3-2-1 :</b> nommer <b>5</b> choses que je vois, <b>4</b> que je peux toucher, <b>3</b> que j'entends, <b>2</b> que je sens, <b>1</b> que je goûte.", "<b>Remettre du présent :</b> sentir mes pieds sur le sol, le dos contre le dossier, regarder les murs et les coins de la pièce.", "<b>Appeler quelqu'un de confiance</b> si ça ne descend pas. Si je pense à me faire du mal : 3114 ou 15 / 112."]);
    if ((plan.lieu_sur || "").trim()) h += box("info", "🏡 <b>Mon lieu sûr :</b> " + esc(plan.lieu_sur.trim()));
    h += breathBlock();
  }
  h += phrasesBlock(code) + `<hr><h3>📝 Mon plan personnel</h3><p class="muted">À remplir une fois, quand ça va mieux. Il s'affiche au moment où tu en as besoin et résume l'essentiel sur la fiche pour tes médecins.</p>
  <details ${Object.keys(plan).length ? "" : "open"}><summary>Voir / modifier mon plan</summary>${c.champs.map(([k, l, ex]) => area("pl_" + k, l, plan[k] || "", ex)).join("")}${field("pl_phrase", "🗨️ Ma phrase pour me recentrer", "text", plan.phrase || "")}${field("pl_contact", "📞 Qui appeler", "text", plan.contact || "", 'placeholder="Nom et numéro"')}${btn("💾 Enregistrer mon plan", "saveplan", "", `data-c="${code}"`)}</details><hr>`;
  if (code === "TDAH") h += videTeteBlock() + "<hr>";
  if (code !== "SPT") h += routineBlock() + "<hr>";
  h += `<h3>📊 Check-in du jour</h3><p class="muted">30 secondes. Sert à repérer ce qui déclenche et ce qui aide, pour en parler à tes médecins avec des faits.</p>
  ${field("nDate", "🗓️ Jour", "date", today(), `max="${today()}"`)}
  ${c.scores.map(([l, col, d], i) => `<label class="f">${l} : <b id="nso${i}">${d}</b>/10</label><input type="range" id="ns${i}" min="0" max="10" value="${d}" data-sl="nso${i}">`).join("")}
  <p><b>Ce qui s'est passé</b></p>${checks("nev", c.evenements)}<p><b>Déclencheurs</b></p>${checks("nde", c.declencheurs)}
  ${field("nAide", "Ce qui m'a aidée")}${field("nNote", "Note libre")}${btn("💾 Enregistrer mon check-in", "savecheckin", "", `data-c="${code}"`)}`;
  if (tt.length) {
    h += `<h4>Mes derniers check-ins :</h4>${table(["Date", ...c.scores.map((s) => s[1]), "Événements", "Déclencheurs", "Ce qui a aidé", "Note"], tt.slice(0, 14))}<div class="chart" style="height:220px"><canvas id="chNeuro"></canvas></div>`;
    const cnt = {}; tt.slice(0, 30).forEach((r) => String(r["Déclencheurs"] || "").split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => (cnt[x] = (cnt[x] || 0) + 1)));
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) h += box("info", "🔎 Déclencheurs les plus fréquents : " + esc(top.map(([k, v]) => `${k} (${v})`).join(", ")));
  } else h += `<p class="muted">Aucun check-in enregistré pour le moment.</p>`;
  return h;
}
function afterTrouble(code) {
  document.querySelectorAll("[data-sl]").forEach((e) => e.addEventListener("input", () => ($(e.dataset.sl).textContent = e.value)));
  const rts = [...document.querySelectorAll("[data-rt]")];
  rts.forEach((e) => e.addEventListener("change", () => { const n = rts.filter((x) => x.checked).length; $("rtBar").innerHTML = bar(n / rts.length) + `<p class="muted">${n} étape(s) sur ${rts.length}</p>`; }));
  const c = TROUBLES[code], tt = rows("suivi_neuro").filter((r) => num(r[c.scores[0][1]]) !== null).sort((a, b) => a.Date.localeCompare(b.Date)).slice(-30);
  if ($("chNeuro") && tt.length >= 2) lineChart("chNeuro", c.scores.map(([, col], i) => ({ label: col.replace(" (0-10)", ""), data: pts(tt, (r) => dayNum(r.Date), (r) => num(r[col])), borderColor: PALETTE[i], backgroundColor: PALETTE[i], tension: 0 })), { ymin: 0, ymax: 10 });
}

// minuteur et respiration
let _tm = null, _tl = 0, _br = false, _bt = null;
const tmShow = () => { if ($("tmr")) $("tmr").textContent = String(Math.floor(_tl / 60)).padStart(2, "0") + ":" + String(_tl % 60).padStart(2, "0"); };
function brCycle() {
  if (!_br || !$("brC")) return; const c = $("brC"), l = $("brL");
  l.textContent = "Inspire..."; c.style.transition = "all 4s ease-in-out"; c.style.width = c.style.height = "150px"; c.style.margin = "-5px auto";
  _bt = setTimeout(() => { if (!_br || !$("brC")) return; l.textContent = "Expire doucement..."; c.style.transition = "all 6s ease-in-out"; c.style.width = c.style.height = "70px"; c.style.margin = "25px auto"; _bt = setTimeout(brCycle, 6000); }, 4000);
}

const ACT_MODES = {
  async saveexamen() {
    const nom = val("peNom") === "Autre" && val("peAutre").trim() ? val("peAutre").trim() : val("peNom");
    if (await ins("examens_pma", { Date: val("peDate"), Examen: nom, Statut: val("peStatut"), "Résultat": val("peRes"), Note: "" })) render();
  },
  async savepma() {
    if (await ins("suivi_pma", { Date: val("ppDate"), "Étape Protocole": val("ppEtape"), "Médicament / Injection": val("ppMed"), "Résultats Échographie": val("ppEcho"), "Notes & Symptômes": val("ppNotes") })) { toast("🧬 Étape PMA enregistrée !"); render(); }
  },
  async savecal() {
    const pc = { ...cfg(1), dpa: S.gCalc.terme, date_ovulation: S.gCalc.ovul };
    if (await saveCfg(1, JSON.stringify(pc))) { S.gOvul = S.gDpa = null; toast("🎉 Calendrier mis à jour !"); render(); }
  },
  async savedossier() {
    const pc = { ...cfg(1), genre_bebe: val("gGenre"), notes_bebe: val("gNotesB"), doc_toxo: val("gToxo"), grossesse_risque: ck("gRisque"), dpa: S.gCalc.terme, date_ovulation: S.gCalc.ovul };
    G_DOCS.forEach(([k]) => (pc[k] = val("gd_" + k)));
    Object.values(G_VALISE).flat().forEach(([k]) => (pc[k] = ck("gv_" + k)));
    if (await saveCfg(1, JSON.stringify(pc))) { toast("🎉 Données mémorisées !"); render(); }
  },
  async saveplan(el) {
    const c = TROUBLES[el.dataset.c], v = {}; c.champs.forEach(([k]) => (v[k] = val("pl_" + k))); v.phrase = val("pl_phrase"); v.contact = val("pl_contact");
    if (await saveCfg(c.cfg, v)) { toast("🎉 Plan enregistré !"); render(); }
  },
  async savecheckin(el) {
    const code = el.dataset.c, c = TROUBLES[code], ev = picked("nev"), de = picked("nde");
    const row = { Date: val("nDate"), "Surcharge sensorielle (0-10)": null, "Anxiété / hypervigilance (0-10)": null, "Concentration (0-10)": null, "Agitation / impulsivité (0-10)": null, "Événements": ev.length ? ev.join(", ") : "Aucun", "Déclencheurs": de.join(", "), "Ce qui a aidé": val("nAide"), Note: `[${code}] ${val("nNote")}`.trim() };
    c.scores.forEach(([, col], i) => (row[col] = +val("ns" + i)));
    if (await ins("suivi_neuro", row)) { toast("🎉 Check-in enregistré !"); render(); }
  },
  async saveroutine() { if (await saveCfg(7, { matin: val("rMatin"), jour: val("rJour"), soir: val("rSoir") })) { toast("Routine enregistrée"); render(); } },
  async vtadd() { const t = val("vtTxt").trim(); if (!t) return; if (await saveCfg(8, { items: [...(cfg(8).items || []), t] })) render(); },
  async vtdel() { const it = cfg(8).items || []; if (await saveCfg(8, { items: it.filter((_, i) => !ck("vt_" + i)) })) render(); },
  tmgo(el) { clearInterval(_tm); _tl = +el.dataset.m * 60; tmShow(); $("tmrMsg").textContent = "C'est parti, une seule chose."; _tm = setInterval(() => { _tl--; tmShow(); if (_tl <= 0) { clearInterval(_tm); if ($("tmrMsg")) $("tmrMsg").textContent = "Terminé. Respire, bois un verre d'eau."; } }, 1000); },
  tmstop() { clearInterval(_tm); },
  brstart() { if (_br) return; _br = true; brCycle(); },
  brstop() { _br = false; clearTimeout(_bt); if ($("brL")) $("brL").textContent = "Pause. Tu peux reprendre quand tu veux."; },
  async savesimple() {
    const ch = {}; for (const [nom, info] of Object.entries(S.meds)) { const m = requis(info).filter((l) => ck(`sp_${nom}_${l}`)); if (m.length) ch[nom] = m; }
    if (!Object.keys(ch).length) return toast("Coche d'abord au moins une prise.");
    if (await saveDayRows(ch, "Mode jour difficile", [], [])) { toast("🎉 Enregistré !"); render(); }
  },
};
const CHG_MODES = {
  gMeth(el) { S.gMeth = el.value.startsWith("Entrer ma date d'ovulation") ? "ovul" : "dpa"; render(); },
  gOvul(el) { S.gOvul = el.value; render(); },
  gDpa(el) { S.gDpa = el.value; render(); },
  tsaSit(el) { S.tsaSit = el.value.startsWith("🔊") ? "m" : "s"; render(); },
};

// ---------- Grossesse : calendrier mois / SG / SA ----------
const MOIS_G = [["Premier mois", 1, 4, "Vous êtes enceinte d'un mois"], ["Deuxième mois", 5, 8, "Vous êtes enceinte de 2 mois"], ["Troisième mois", 9, 13, "Vous êtes enceinte de 3 mois"], ["Quatrième mois", 14, 17, "Vous êtes enceinte de 4 mois"], ["Cinquième mois", 18, 22, "Vous êtes enceinte de 5 mois"], ["Sixième mois", 23, 26, "Vous êtes enceinte de 6 mois"], ["Septième mois", 27, 30, "Vous êtes enceinte de 7 mois"], ["Huitième mois", 31, 34, "Vous êtes enceinte de 8 mois"], ["Neuvième mois", 35, 39, "Vous êtes à terme !"]];
function calendrierSA(sa) {
  const tri = [["1<sup>er</sup> trimestre", 0], ["2<sup>ème</sup> trimestre", 3], ["3<sup>ème</sup> trimestre", 6]];
  return `<p class="muted">SG = semaine de grossesse (débute à la date supposée de la fécondation). SA = semaine d'aménorrhée (débute au premier jour des dernières règles). La semaine où tu es est surlignée.</p>` +
    tri.map(([t, i0]) => `<div class="tri"><div class="tri-h">${t}</div><div class="tri-b">${MOIS_G.slice(i0, i0 + 3).map(([nom, a, b, txt]) => `<div class="tri-c"><h5>${nom}</h5>${Array.from({ length: b - a + 1 }, (_, k) => a + k).map((sg) => `<div class="tri-l${sg + 2 === sa ? " now" : ""}">${sg} SG = ${sg + 2} SA</div>`).join("")}<p class="tri-t">${txt}</p></div>`).join("")}</div></div>`).join("");
}

// ---------- Grossesse : journal de symptômes ----------
const G_SYMP = [
  ["🤢 Nausées", 0], ["🤮 Vomissements", 0], ["🔥 Brûlures d'estomac / reflux", 0], ["🚽 Constipation", 0], ["🎈 Ballonnements", 0], ["😴 Fatigue intense", 0],
  ["🤕 Maux de tête", 0], ["😵 Vertiges / malaise", 0], ["〰️ Contractions (irrégulières)", 0], ["⚡ Douleurs pelviennes / ligamentaires", 0], ["🦵 Crampes dans les jambes", 0], ["🦶 Jambes lourdes / gonflées", 0],
  ["🔙 Mal de dos", 0], ["🚻 Brûlures en urinant", 0], ["💧 Pertes inhabituelles / démangeaisons", 0], ["😮‍💨 Essoufflement", 0], ["💓 Palpitations", 0], ["🌙 Insomnie", 0], ["😟 Anxiété / humeur instable", 0], ["🍭 Envies de sucre", 0], ["🩹 Seins sensibles", 0],
  ["🩸 Saignements", 1], ["💦 Perte de liquide", 1], ["👶 Mouvements de bébé diminués", 1], ["⏱️ Contractions régulières et douloureuses", 1], ["👁️ Maux de tête violents / troubles de la vue", 1], ["🫨 Gonflement soudain du visage / des mains", 1], ["🌡️ Fièvre", 1], ["🥵 Soif intense / urines très fréquentes", 1], ["🧴 Démangeaisons intenses (mains, pieds)", 1], ["🤰 Douleur forte sous les côtes / en haut du ventre", 1],
];
function journalGrossesse() {
  const j = cfg(11).jours || {}, dates = Object.keys(j).sort().reverse(), urgent = new Set(G_SYMP.filter((s) => s[1]).map((s) => s[0]));
  let h = `<p class="muted">Note ce que tu ressens chaque jour : tu pourras le montrer à ta sage-femme ou à ton médecin. Les symptômes marqués ⚠️ demandent un avis médical rapide.</p>
  ${field("jgDate", "🗓️ Jour", "date", today(), `max="${today()}"`)}
  <p><b>Symptômes courants</b></p><div class="chips">${G_SYMP.filter((s) => !s[1]).map(([l]) => `<label class="ck"><input type="checkbox" name="gs" value="${esc(l)}"> ${l}</label>`).join("")}</div>
  <p><b>⚠️ Signes d'alerte</b></p><div class="chips">${G_SYMP.filter((s) => s[1]).map(([l]) => `<label class="ck"><input type="checkbox" name="gs" data-u="1" value="${esc(l)}"> ${l}</label>`).join("")}</div>
  <div id="jgAlert"></div><div id="jgTips"></div>
  <div class="row"><div><label class="f">Gêne globale : <b id="jgIo">0</b>/10</label><input id="jgI" type="range" min="0" max="10" value="0"></div>${field("jgTension", "Tension (ex : 12/7)")}${field("jgMvts", "Mouvements de bébé (ex : nombreux, comme d'habitude)")}${field("jgPoids", "Poids du jour (kg, facultatif)", "number", "", 'step="0.1"')}</div>
  ${field("jgNote", "Note (facultatif)")}${btn("💾 Enregistrer mon journal du jour", "savejournal")}`;
  if (dates.length) {
    const cnt = {}; dates.filter((d) => diffDays(today(), d) < 30).forEach((d) => (j[d].sym || []).forEach((s) => (cnt[s] = (cnt[s] || 0) + 1)));
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const rec = dates.filter((d) => diffDays(today(), d) < 3).flatMap((d) => (j[d].sym || []).filter((s) => urgent.has(s)));
    if (rec.length) h += box("err", "⚠️ Ces derniers jours tu as noté : <b>" + esc([...new Set(rec)].join(" ; ")) + "</b>. Parles-en sans attendre à ta sage-femme, à ta maternité ou à ton médecin (15 en cas d'urgence).");
    if (top.length) h += `<p class="muted">Symptômes les plus fréquents sur 30 jours : ${esc(top.map(([k, v]) => `${k} (${v})`).join(" · "))}</p>`;
    h += fold(`📋 Mon journal (${dates.length} jour${dates.length > 1 ? "s" : ""})`, table(["Date", "Symptômes", "Gêne", "Tension", "Mouvements", "Poids", "Note"], dates.slice(0, 60).map((d) => ({ Date: d, Symptômes: (j[d].sym || []).join(" · "), "Gêne": j[d].gene ?? "", Tension: j[d].tension || "", Mouvements: j[d].mvts || "", Poids: j[d].poids || "", Note: j[d].note || "" }))));
  }
  return h;
}
const G_TIPS = [
  [/Nausées|Vomissements/, "🤢 <b>Nausées :</b> fractionne les repas, grignote un biscuit sec avant de te lever, bois par petites gorgées, essaie le gingembre. Si tu ne peux plus rien garder, consulte."],
  [/Brûlures d'estomac/, "🔥 <b>Reflux :</b> petits repas, évite de t'allonger juste après manger, surélève la tête du lit, limite le gras, l'épicé et le café."],
  [/Constipation/, "🚽 <b>Constipation :</b> fibres (légumes, fruits, céréales complètes), 1,5 L d'eau, marche quotidienne. Demande conseil avant tout laxatif."],
  [/Ballonnements/, "🎈 <b>Ballonnements :</b> mange lentement, évite les boissons gazeuses, fractionne les repas, marche un peu après manger."],
  [/Fatigue intense/, "😴 <b>Fatigue :</b> repose-toi sans culpabiliser, fais des siestes courtes, mange régulièrement. Parle d'un bilan (ferritine, thyroïde, glycémie) à ton médecin si elle est écrasante."],
  [/Maux de tête/, "🤕 <b>Maux de tête :</b> bois de l'eau, repose-toi au calme. Pas de médicament sans avis. S'ils sont violents ou avec troubles de la vue : urgence (pré-éclampsie)."],
  [/Vertiges/, "😵 <b>Vertiges :</b> lève-toi lentement, ne saute pas de repas, assieds-toi dès les premiers signes, contrôle ta glycémie."],
  [/Contractions \(irrégulières\)/, "〰️ <b>Contractions irrégulières :</b> repose-toi allongée sur le côté gauche, bois un grand verre d'eau. Utilise le compteur ci-dessus : si elles deviennent régulières, appelle la maternité."],
  [/pelviennes/, "⚡ <b>Douleurs ligamentaires :</b> chaleur douce, ceinture de grossesse, évite les mouvements brusques, change de position lentement."],
  [/Crampes/, "🦵 <b>Crampes :</b> étire doucement le mollet, hydrate-toi, masse la jambe. Magnésium seulement sur avis médical."],
  [/Jambes lourdes/, "🦶 <b>Jambes lourdes :</b> surélève les jambes, bas de contention, marche, évite la chaleur. Un seul mollet rouge, chaud et douloureux : consulte en urgence."],
  [/Mal de dos/, "🔙 <b>Mal de dos :</b> ceinture lombaire, bon maintien, natation, séances de kiné ou ostéo prénatal."],
  [/Brûlures en urinant/, "🚻 <b>Brûlures urinaires :</b> possible infection urinaire : prévois un examen d'urine (ECBU) <b>dans la journée</b>, c'est important en grossesse."],
  [/Pertes inhabituelles/, "💧 <b>Pertes / démangeaisons :</b> parle-en à ta sage-femme (mycose, infection). Pas de traitement local sans avis."],
  [/Essoufflement/, "😮‍💨 <b>Essoufflement :</b> fais des pauses, dors un peu surélevée. S'il est brutal ou avec douleur thoracique : 15."],
  [/Palpitations/, "💓 <b>Palpitations :</b> assieds-toi, respire lentement. Si elles durent ou avec malaise, consulte."],
  [/Insomnie/, "🌙 <b>Insomnie :</b> coussin d'allaitement entre les jambes, horaires réguliers, pas d'écran ni de caféine le soir."],
  [/Anxiété/, "😟 <b>Anxiété :</b> respiration lente (4 s / 6 s), parles-en à ta sage-femme ; l'entretien prénatal est fait pour ça."],
  [/Envies de sucre/, "🍭 <b>Envies de sucre :</b> associe fruit + amandes ou yaourt, mange assez de protéines, surveille ta glycémie (SOPK)."],
  [/Seins sensibles/, "🩹 <b>Seins sensibles :</b> soutien-gorge souple et adapté, sans armatures."],
  [/Fatigue|Gêne/, ""],
];
function afterGrossesse() {
  renderCtr(); renderMvt(); afterCourbesGrossesse();
  const tips = () => { const c = picked("gs").filter((l) => !document.querySelector(`input[name="gs"][data-u][value="${CSS.escape(l)}"]`)); const t = c.map((l) => (G_TIPS.find(([re]) => re.test(l)) || [])[1]).filter(Boolean); if ($("jgTips")) $("jgTips").innerHTML = t.length ? "<p><b>💡 Conseils selon ce que tu ressens</b></p>" + t.map((x) => `<div class="tip">${x}</div>`).join("") : ""; };
  document.querySelectorAll('input[name="gs"]').forEach((e) => e.addEventListener("change", tips));
  const upd = () => { const u = [...document.querySelectorAll('input[name="gs"][data-u]:checked')].map((e) => e.value); if ($("jgAlert")) $("jgAlert").innerHTML = u.length ? box("err", "🛑 <b>À ne pas ignorer :</b> " + esc(u.join(" ; ")) + ".<br>Appelle ta maternité ou ta sage-femme <b>sans attendre</b> ; en cas de saignements abondants, perte de liquide, douleur intense ou malaise : <b>15</b> ou urgences maternité.") : ""; };
  document.querySelectorAll('input[name="gs"]').forEach((e) => e.addEventListener("change", upd));
  if ($("jgI")) $("jgI").addEventListener("input", () => ($("jgIo").textContent = val("jgI")));
}
Object.assign(ACT_MODES, {
  async savejournal() {
    const d = val("jgDate"), j = { ...(cfg(11).jours || {}) };
    j[d] = { sym: picked("gs"), gene: +val("jgI"), tension: val("jgTension"), mvts: val("jgMvts"), poids: val("jgPoids"), note: val("jgNote") };
    if (await saveCfg(11, { jours: j })) { toast("🎉 Journal enregistré !"); render(); }
  },
});

// ---------- Grossesse : informations ----------
function infosGrossesse(sa) {
  const L = (a) => `<ul>${a.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  const tri = sa <= 14 ? 1 : sa <= 27 ? 2 : 3;
  return `<h3>📚 Informations utiles</h3><p class="muted">Repères généraux : ils ne remplacent jamais l'avis de ta sage-femme ou de ton médecin. Tu es au <b>${tri === 1 ? "1er" : tri + "ème"} trimestre</b>.</p>
  ${fold("🌱 Ce qui est fréquent à chaque trimestre", `<p><b>1er trimestre (jusqu'à 14 SA)</b></p>${L(["Nausées, fatigue, seins tendus, envies d'uriner fréquentes, sautes d'humeur.", "Acide folique (vitamine B9) recommandé dès le projet de grossesse et jusqu'à 12 SA, sur conseil médical.", "Les nausées passent souvent vers 12-16 SA : fractionne les repas, mange avant de te lever, bois par petites gorgées."])}
  <p><b>2ème trimestre (15 à 27 SA)</b></p>${L(["Souvent le plus confortable : énergie qui revient, ventre qui s'arrondit.", "Premiers mouvements de bébé ressentis vers 18-22 SA (plus tôt si ce n'est pas une première grossesse).", "Possibles : maux de dos, jambes lourdes, brûlures d'estomac, saignements de nez ou de gencives légers."])}
  <p><b>3ème trimestre (à partir de 28 SA)</b></p>${L(["Fatigue, essoufflement, difficultés à dormir, contractions de Braxton Hicks (irrégulières, indolores).", "Œdèmes légers aux chevilles : surélève les jambes, bois de l'eau, évite le sel en excès.", "Prépare la valise, le projet de naissance, le mode de garde et les papiers."])}`)}
  ${fold("🚨 Quand consulter ou appeler sans attendre", `${L(["<b>Saignements</b> vaginaux, même légers.", "<b>Perte de liquide</b> (poche des eaux) : appelle la maternité.", "<b>Contractions régulières et douloureuses</b> avant 37 SA ; à terme, quand elles sont toutes les 5 minutes pendant environ 1 heure (ou selon la consigne de ta maternité).", "<b>Mouvements de bébé nettement diminués</b> ou absents après les avoir sentis régulièrement.", "<b>Maux de tête violents, troubles de la vue, bourdonnements, gonflement brutal du visage ou des mains, douleur sous les côtes</b> : risque de pré-éclampsie.", "<b>Fièvre</b> (38 °C ou plus), brûlures urinaires, frissons.", "<b>Démangeaisons intenses</b> des paumes et plantes des pieds (cholestase).", "Vomissements incessants, impossibilité de boire, perte de poids importante.", "<b>Soif intense, urines très fréquentes, vue floue</b> : glycémie à contrôler (SOPK / pré-diabète).", "Douleur dans la poitrine, essoufflement brutal, mollet douloureux, rouge ou gonflé d'un seul côté : <b>15</b>."])}<p class="muted">En cas de doute : appelle ta maternité, elle répond 24 h/24. Urgence vitale : 15 ou 112.</p>`)}
  ${fold("🥗 Alimentation et hygiène de vie", L(["<b>À éviter :</b> alcool, tabac, viande/poisson/œufs crus ou peu cuits, fromages au lait cru, charcuterie crue, poissons crus (sushis), graines germées crues.", "<b>Toxoplasmose :</b> lave bien fruits et légumes, cuis bien la viande, gants pour jardiner, évite les litières de chat.", "<b>Listériose :</b> respecte les dates limites, conserve bien les aliments, évite les fromages à croûte fleurie ou lait cru.", "<b>Café :</b> limite à environ 2 tasses par jour. Pas de produits de phytothérapie sans avis médical.", "<b>Poissons :</b> varie, évite les gros prédateurs (espadon, requin, thon en excès).", "<b>Avec un SOPK / pré-diabète :</b> légumes en premier, féculents complets en petite portion, pas de boissons sucrées, marche 10-15 min après les repas.", "<b>Hydratation :</b> environ 1,5 L d'eau par jour.", "<b>Sport doux :</b> marche, natation, yoga prénatal. Arrête et consulte en cas de saignements, douleurs, contractions ou vertiges.", "<b>Médicaments :</b> aucun sans avis (même sans ordonnance). Parle de ton traitement (metformine, etc.) à ton médecin."]))}
  ${fold("💊 Compléments et vaccins (sur avis médical)", L(["<b>Acide folique</b> (B9) : avant et début de grossesse.", "<b>Vitamine D</b> : souvent prescrite au 6ème ou 7ème mois, parfois plus tôt.", "<b>Fer, iode, magnésium, oméga-3</b> : seulement si ton médecin ou ta sage-femme les recommande après bilan.", "<b>Vaccins :</b> grippe saisonnière, coqueluche (à partir du 2ème trimestre), Covid-19 et bronchiolite (VRS) en fin de grossesse selon la saison : demande conseil à ton médecin ou ta sage-femme."]))}
  ${fold("📋 Démarches et suivi médical en France", L(["<b>Déclaration de grossesse</b> avant 14 SA (CPAM et CAF) : le médecin ou la sage-femme remplit le formulaire.", "<b>7 consultations prénatales</b> obligatoires, prises en charge à 100 % à partir du 6ème mois (selon les règles en vigueur).", "<b>3 échographies</b> : 12 SA (T1), 22 SA (T2), 32 SA (T3). Entretien prénatal précoce (dit « 4ème mois ») conseillé.", "<b>Prises de sang :</b> groupe sanguin, rubéole, toxoplasmose (chaque mois si non immunisée), syphilis, glycémie ; <b>HGPO</b> entre 24 et 28 SA en cas de facteurs de risque (SOPK, pré-diabète).", "<b>Urines :</b> recherche mensuelle d'albumine et de sucre (bandelette).", "<b>Consultation d'anesthésie</b> au 8ème mois, <b>préparation à la naissance</b> (8 séances prises en charge), choix de la maternité dès les premiers mois.", "<b>Congé maternité</b> et démarches employeur : renseigne-toi auprès de ta caisse et de ton employeur."]))}
  ${fold("🍬 SOPK, pré-diabète et grossesse", L(["Le SOPK et la résistance à l'insuline augmentent un peu le risque de <b>diabète gestationnel</b>, d'hypertension et de pré-éclampsie : ton suivi est donc plus attentif.", "Garde tes glycémies dans l'onglet « Suivi Glycémie » (objectifs fréquents : à jeun &lt; 0,95 g/L, 2 h après repas &lt; 1,20 g/L).", "Surveille ta <b>tension</b> et ton <b>poids</b> (prise rapide + gonflement = à signaler).", "Ne modifie ni n'arrête jamais un traitement (metformine, etc.) sans l'avis de ton médecin."]))}
  ${fold("🏥 Se préparer à l'accouchement", L(["<b>Valise de maternité</b> prête vers 32-34 SA (liste ci-dessus).", "<b>Projet de naissance</b> : péridurale, position, peau à peau, allaitement : discute-en avec la sage-femme.", "Repère le <b>trajet</b> vers la maternité et note le numéro du <b>service des urgences obstétricales</b>.", "<b>Signes de début de travail :</b> contractions régulières qui se rapprochent, perte du bouchon muqueux, perte des eaux.", "Prévois le <b>mode de garde</b> et les <b>papiers</b> (reconnaissance anticipée, déclaration de naissance sous 5 jours)."]))}`;
}

// ---------- Compteurs : contractions et mouvements de bébé ----------
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const hhmm = (t) => new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
const mmss = (s) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.round(Math.abs(s)) % 60).padStart(2, "0")}`;
S.ctr = ls("ctr", { on: null, list: [] }); S.mvt = ls("mvt", { start: null, list: [], end: null });

function compteursGrossesse() {
  return `<p class="muted">Outils pour t'aider à observer : ils ne remplacent pas l'avis de la maternité.</p>
  <details open><summary>⏱️ Compteur de contractions</summary><div id="ctrBox"></div></details>
  <details open><summary>👶 Compteur de mouvements de bébé</summary><div id="mvtBox"></div></details>`;
}
function renderCtr() {
  const o = $("ctrBox"); if (!o) return; const C = S.ctr, now = Date.now(), L = C.list;
  const iv = L.map((x, i) => (i ? (x.s - L[i - 1].s) / 1000 : null)), last = L.filter((x) => now - x.s <= 3600e3), lastIv = iv.filter((v, i) => v !== null && now - L[i].s <= 3600e3);
  const dMoy = last.length ? avg(last.map((x) => (x.e - x.s) / 1000)) : 0, iMoy = lastIv.length ? avg(lastIv) : 0;
  let alerte = "";
  const preterme = (S.sa || 0) < 37;
  if (last.length >= 3 && iMoy && iMoy <= 360 && dMoy >= 45 && (last[last.length - 1].s - last[0].s) >= 3000e3) alerte = box("err", "🛑 <b>Contractions régulières depuis environ 1 heure</b> (toutes les ~5 min, ~1 min chacune) : <b>appelle ta maternité maintenant</b>.");
  else if (last.length >= 4 && iMoy && iMoy <= 600) alerte = box(preterme ? "err" : "warn", preterme ? "🛑 Contractions rapprochées <b>avant 37 SA</b> : appelle ta maternité sans attendre." : "⚠️ Les contractions se rapprochent : continue à les chronométrer, prépare-toi, et appelle la maternité selon sa consigne.");
  o.innerHTML = `<div class="cbox">${C.on ? `<div class="ctr-n" id="ctrLive">${mmss((now - C.on) / 1000)}</div><p class="muted">Contraction en cours depuis ${hhmm(C.on)}</p>` : `<div class="ctr-n">${L.length}</div><p class="muted">contraction(s) enregistrée(s) dans cette séance</p>`}
  ${btn(C.on ? "⏹️ Fin de la contraction" : "▶️ Début d'une contraction", "ctrtoggle", "btnbig")}</div>
  ${alerte}${L.length ? `<div class="metrics">${metric("Dernière heure", last.length + " contr.")}${metric("Durée moyenne", last.length ? Math.round(dMoy) + " s" : "–")}${metric("Intervalle moyen", lastIv.length ? mmss(iMoy) : "–")}</div>
  ${table(["N°", "Début", "Durée", "Intervalle depuis la précédente"], [...L].map((x, i) => ({ "N°": i + 1, "Début": hhmm(x.s), "Durée": Math.round((x.e - x.s) / 1000) + " s", "Intervalle depuis la précédente": iv[i] === null ? "–" : mmss(iv[i]) })).reverse().slice(0, 15))}` : ""}
  <p class="muted">Repère courant : contractions <b>toutes les 5 minutes, d'environ 1 minute, pendant 1 heure</b> (règle 5-1-1) → appeler la maternité. Avant 37 SA, appelle dès que ça se répète. Suis toujours la consigne de ta maternité.</p>
  ${L.length || C.on ? btn("💾 Enregistrer la séance", "ctrsave", "sec") + btn("🗑️ Réinitialiser", "ctrreset", "sec") : ""}${histSeances(12, "contractions")}`;
}
function renderMvt() {
  const o = $("mvtBox"); if (!o) return; const M = S.mvt, now = M.end || Date.now(), n = M.list.length, el = M.start ? (now - M.start) / 1000 : 0;
  const t10 = n >= 10 ? (M.list[9] - M.start) / 60000 : null;
  let msg = "";
  if (M.start && n >= 10) msg = box("ok", `🎉 10 mouvements atteints en ${Math.round(t10)} min : c'est rassurant.`);
  else if (M.start && el >= 7200) msg = box("warn", "⚠️ Moins de 10 mouvements en 2 heures : mange un petit quelque chose, allonge-toi sur le côté gauche et recompte. Si ça persiste, <b>contacte ta maternité le jour même</b>.");
  o.innerHTML = `<div class="cbox"><div class="ctr-n">${n}</div><p class="muted">mouvement(s)${M.start ? ` · depuis ${hhmm(M.start)} · ${mmss(el)}` : ""}</p>
  ${!M.start ? btn("▶️ Démarrer une séance", "mvtstart", "btnbig") : M.end ? "" : btn("👶 +1 mouvement", "mvtadd", "btnbig") + btn("⏹️ Terminer", "mvtend", "sec")}</div>
  ${msg}${n ? `<p class="muted">Heures : ${M.list.map(hhmm).join(" · ")}</p>` : ""}
  <p class="muted">Repère courant : en position calme (allongée sur le côté), compte les mouvements : on attend en général <b>10 mouvements en moins de 2 heures</b>. Une baisse nette ou une absence de mouvements après les avoir sentis régulièrement : <b>consulte rapidement</b> sans attendre le lendemain.</p>
  ${M.start ? btn("💾 Enregistrer la séance", "mvtsave", "sec") + btn("🗑️ Réinitialiser", "mvtreset", "sec") : ""}${histSeances(13, "mouvements")}`;
}
function histSeances(id, nom) {
  const s = cfg(id).seances || []; if (!s.length) return "";
  return fold(`📋 Mes séances enregistrées (${s.length})`, table(["Date", "Heure", "Résumé"], s.map((x) => ({ Date: x.date, Heure: x.heure, "Résumé": x.resume }))));
}
setInterval(() => { if (S.ctr.on && $("ctrLive")) $("ctrLive").textContent = mmss((Date.now() - S.ctr.on) / 1000); if (S.mvt.start && !S.mvt.end && $("mvtBox")) renderMvt(); }, 1000);

Object.assign(ACT_MODES, {
  ctrtoggle() { const C = S.ctr; if (C.on) { C.list.push({ s: C.on, e: Date.now() }); C.on = null; } else C.on = Date.now(); lsSet("ctr", C); renderCtr(); },
  ctrreset() { if (confirm("Effacer la séance en cours ?")) { S.ctr = { on: null, list: [] }; lsSet("ctr", S.ctr); renderCtr(); } },
  async ctrsave() {
    const L = S.ctr.list; if (!L.length) return toast("Aucune contraction à enregistrer.");
    const iv = L.map((x, i) => (i ? (x.s - L[i - 1].s) / 1000 : null)).filter((v) => v !== null), dm = avg(L.map((x) => (x.e - x.s) / 1000));
    const seances = [{ date: fr(today()), heure: hhmm(L[0].s) + " → " + hhmm(L[L.length - 1].e), resume: `${L.length} contractions, durée moyenne ${Math.round(dm)} s${iv.length ? ", intervalle moyen " + mmss(avg(iv)) : ""}` }, ...(cfg(12).seances || [])].slice(0, 40);
    if (await saveCfg(12, { seances })) { S.ctr = { on: null, list: [] }; lsSet("ctr", S.ctr); toast("🎉 Séance enregistrée"); renderCtr(); }
  },
  mvtstart() { S.mvt = { start: Date.now(), list: [], end: null }; lsSet("mvt", S.mvt); renderMvt(); },
  mvtadd() { S.mvt.list.push(Date.now()); lsSet("mvt", S.mvt); renderMvt(); },
  mvtend() { S.mvt.end = Date.now(); lsSet("mvt", S.mvt); renderMvt(); },
  mvtreset() { if (confirm("Effacer la séance en cours ?")) { S.mvt = { start: null, list: [], end: null }; lsSet("mvt", S.mvt); renderMvt(); } },
  async mvtsave() {
    const M = S.mvt; if (!M.start) return; const fin = M.end || Date.now();
    const seances = [{ date: fr(today()), heure: hhmm(M.start) + " → " + hhmm(fin), resume: `${M.list.length} mouvement(s) en ${Math.round((fin - M.start) / 60000)} min` + (M.list.length >= 10 ? ` (10 atteints en ${Math.round((M.list[9] - M.start) / 60000)} min)` : "") }, ...(cfg(13).seances || [])].slice(0, 40);
    if (await saveCfg(13, { seances })) { S.mvt = { start: null, list: [], end: null }; lsSet("mvt", S.mvt); toast("🎉 Séance enregistrée"); renderMvt(); }
  },
});

Object.assign(ACT_MODES, {
  async backup() {
    await loadAll();
    const out = { sauvegarde_du: new Date().toISOString(), tables: S.d, medicaments: S.meds, configuration: S.cfg };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
    a.download = "sauvegarde-suivi-" + today() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast("💾 Sauvegarde téléchargée");
  },
  async logout() { if (confirm("Te déconnecter de cet appareil ? Il faudra ressaisir ton mot de passe.")) await sb.auth.signOut(); } });
