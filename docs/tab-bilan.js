// ===== Import d'un PDF de prise de sang : lecture dans le navigateur (rien n'est envoyé ailleurs) =====
const BIL_ANALYSES = [
  ["HbA1c", /hba1c|h[ée]moglobine\s+glyqu[ée]e|hb\s*a1c/i],
  ["Glycémie à jeun (labo)", /glyc[ée]mie/i],
  ["Insuline", /insulin[ée]?mie|insuline/i],
  ["TSH", /\btsh\b/i],
  ["T4 libre", /t4\s+libre|\bft4\b/i],
  ["Vitamine D", /vitamine\s+d3?\b(?:\s*\(?\s*25\s*-?\s*(?:oh|hydroxy)\w*\)?)?|25\s*-?\s*(?:oh|hydroxy)\w*(?:\s*vitamine\s+d)?/i],
  ["Vitamine B12", /vitamine\s+b\s*12|\bb\s*12\b|cobalamine/i],
  ["Folates (B9)", /folates?|vitamine\s+b\s*9/i],
  ["Ferritine", /ferritine/i],
  ["Fer sérique", /fer\s+s[ée]rique|\bfer\b/i],
  ["Cholestérol total", /cholest[ée]rol\s+total/i],
  ["HDL", /\bhdl\b/i],
  ["LDL", /\bldl\b/i],
  ["Triglycérides", /triglyc[ée]rides?/i],
  ["AMH", /\bamh\b|anti.?m[uü]llerien/i],
  ["FSH", /\bfsh\b/i],
  ["LH", /\blh\b/i],
  ["Œstradiol", /[oœ]strad[iy]ol|estradiol/i],
  ["Progestérone", /progest[ée]rone/i],
  ["Testostérone", /testost[ée]rone/i],
  ["Prolactine", /prolactine/i],
  ["SHBG", /\bshbg\b/i],
  ["CRP", /\bcrp\b|prot[ée]ine\s+c\s+r[ée]active/i],
  ["Hémoglobine", /h[ée]moglobine(?!\s+glyqu)/i],
  ["Créatinine", /cr[ée]atinine/i],
  ["ASAT", /\basat\b|\bsgot\b/i],
  ["ALAT", /\balat\b|\bsgpt\b/i],
  ["Gamma GT", /gamma\s*-?\s*gt|\bggt\b/i],
];
const BIL_UNITES = /(%|g\/l|mg\/l|mg\/dl|g\/dl|mmol\/l|[µμu]mol\/l|nmol\/l|pmol\/l|ng\/ml|pg\/ml|ng\/l|ng\/dl|[µμu]g\/l|[µμu]g\/dl|m?ui\/l|[µμu]ui\/ml|[µμu]ui\/l|mui\/ml|u\/l|ui\/l|iu\/l|miu\/l|g\/24h|\/mm3|giga\/l|t\/l)/i;
const BIL_NUM = "(\\d+(?:[.,]\\d+)?)";
const bilN = (t) => parseFloat(String(t).replace(",", "."));
const BIL_REFS = [
  [/hba1c|glyqu/i, "4,0 - 5,6"], [/glyc[ée]mie/i, "0,70 - 1,10"], [/cholest[ée]rol total/i, "< 2,00"], [/\bhdl\b/i, "> 0,40"],
  [/\bldl\b/i, "< 1,60"], [/triglyc/i, "< 1,50"], [/h[ée]moglobine/i, "12,0 - 16,0"], [/cr[ée]atinine/i, "45 - 90"],
  [/h[ée]maties/i, "3,9 - 5,2"], [/\btsh\b/i, "0,4 - 4,0"], [/vitamine d|25.?oh/i, "30 - 100"], [/b\s*12|cobalamine/i, "200 - 900"],
  [/ferritine/i, "15 - 150"], [/prolactine/i, "4 - 25"], [/\bcrp\b/i, "< 5"], [/\basat\b/i, "< 35"], [/\balat\b/i, "< 35"], [/gamma|\bggt\b/i, "< 40"],
];
const BIL_PHASES = ["Je ne sais pas", "Phase folliculaire (début de cycle)", "Pic d'ovulation", "Phase lutéale (après l'ovulation)", "Ménopause"];
const BIL_HORM = {
  FSH: [[BIL_PHASES[1], 3.5, 12.5], [BIL_PHASES[2], 4.7, 21.5], [BIL_PHASES[3], 1.7, 7.7], [BIL_PHASES[4], 25.8, 134.8]],
  LH: [[BIL_PHASES[1], 2.4, 12.6], [BIL_PHASES[2], 14.0, 95.6], [BIL_PHASES[3], 1.0, 11.4], [BIL_PHASES[4], 7.7, 58.5]],
};
const bilFmt = (x) => String(x).replace(".", ",");
const bilHormone = (nom) => (/\bfsh\b/i.test(nom) ? "FSH" : /\blh\b/i.test(nom) ? "LH" : null);
const bilNormeGen = (nom) => { for (const [re, n] of BIL_REFS) if (re.test(String(nom))) return n; return ""; };
function bilLireNorme(txt) {
  const t = String(txt || "");
  let m = new RegExp(BIL_NUM + "\\s*(?:-|–|à)\\s*" + BIL_NUM).exec(t);
  if (m) return [bilN(m[1]), bilN(m[2])];
  m = new RegExp("([<>≤≥])\\s*" + BIL_NUM).exec(t);
  if (m) { const v = bilN(m[2]); return "<≤".includes(m[1]) ? [null, v] : [v, null]; }
  return [null, null];
}
function bilJuger(v, bas, haut) {
  if (bas !== null && v < bas) return "⬇️ en dessous";
  if (haut !== null && v > haut) return "⬆️ au-dessus";
  if (bas !== null || haut !== null) return "✅ dans la norme";
  return "";
}
function bilAnalyser(texte) {
  const L = texte.split("\n").map((l) => l.trim()).filter(Boolean), out = [];
  for (const [nom, re] of BIL_ANALYSES) {
    for (let i = 0; i < L.length; i++) {
      const m = re.exec(L[i]); if (!m) continue;
      let reste = L[i].slice(m.index + m[0].length);
      if (!new RegExp(BIL_NUM).test(reste) && i + 1 < L.length) reste = L[i + 1];
      const mv = new RegExp(BIL_NUM).exec(reste); if (!mv) continue;
      const apres = reste.slice(mv.index + mv[0].length), mu = BIL_UNITES.exec(apres);
      let norme = "";
      const mr = new RegExp(BIL_NUM + "\\s*(?:-|–|à|a)\\s*" + BIL_NUM).exec(apres);
      if (mr) norme = mr[1] + " - " + mr[2];
      else { const mi = new RegExp("([<>≤≥]=?)\\s*" + BIL_NUM).exec(apres); if (mi) norme = mi[1] + " " + mi[2]; }
      out.push({ ok: true, nom, val: bilFmt(bilN(mv[1])), uni: mu ? mu[1] : "", norme, src: norme ? "labo" : "" });
      break;
    }
  }
  return out;
}
function bilDate(texte) {
  const ok = (j, m, a) => { const d = new Date(Date.UTC(a, m - 1, j)); return d.getUTCMonth() === m - 1 && d.getUTCDate() === j; };
  let m = /pr[ée]l[èe]v\w*[^\d\n]{0,25}(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/i.exec(texte);
  if (m && ok(+m[1], +m[2], +m[3])) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  for (const x of texte.matchAll(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/g)) {
    const j = +x[1], mo = +x[2], a = +x[3];
    if (j >= 1 && j <= 31 && mo >= 1 && mo <= 12 && a >= 2000 && a <= 2100 && ok(j, mo, a)) return `${a}-${String(mo).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
  }
  return "";
}

// lecture du PDF (pdf.js) : on reconstitue les lignes à partir de la position du texte
async function bilLirePdf(file) {
  if (!window.pdfjsLib) throw new Error("La lecture de PDF n'a pas pu se charger (connexion ?). Recharge la page et réessaie.");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let texte = "";
  for (let p = 1; p <= Math.min(pdf.numPages, 15); p++) {
    const c = await (await pdf.getPage(p)).getTextContent(), lignes = [];
    c.items.forEach((it) => {
      if (!it.str || !it.str.trim()) return;
      const y = it.transform[5], x = it.transform[4];
      let l = lignes.find((z) => Math.abs(z.y - y) < 3);
      if (!l) { l = { y, a: [] }; lignes.push(l); }
      l.a.push({ x, s: it.str });
    });
    lignes.sort((a, b) => b.y - a.y).forEach((l) => { texte += l.a.sort((a, b) => a.x - b.x).map((z) => z.s).join(" ") + "\n"; });
  }
  return texte;
}

// norme appliquée à une ligne selon la phase du cycle (FSH / LH)
function bilAppliquerPhase(r, phase) {
  const h = bilHormone(r.nom);
  if (h && phase !== BIL_PHASES[0]) {
    const p = BIL_HORM[h].find((x) => x[0] === phase);
    if (p) { r.norme = bilFmt(p[1]) + " - " + bilFmt(p[2]); r.src = "repère " + phase.split(" (")[0].toLowerCase(); }
  }
}
function bilVerdict(r) {
  const v = num(r.val); if (v === null) return "";
  const h = bilHormone(r.nom);
  if (h && !String(r.norme).trim()) {
    const c = BIL_HORM[h].filter((x) => x[1] <= v && v <= x[2]).map((x) => x[0].split(" (")[0]);
    return c.length ? "Compatible : " + c.join(", ") : "Hors des repères connus";
  }
  const [b, hi] = bilLireNorme(r.norme); return bilJuger(v, b, hi);
}

function pdfImportHtml() {
  const P = S.pdf;
  let h = fold("📄 Importer un PDF de prise de sang (lecture automatique)", `<p class="muted">Le PDF est lu directement sur ton appareil, il n'est envoyé nulle part. Ça marche avec les PDF de laboratoire qui contiennent du texte (pas avec une simple photo ou un scan).</p>
  <div class="fg"><label class="f" for="pdfFile">Choisis le PDF du laboratoire</label><input id="pdfFile" type="file" accept="application/pdf,.pdf"></div>
  ${P && P.err ? box("warn", esc(P.err)) : ""}
  ${P && P.l ? pdfReviewHtml() : ""}`, !!P);
  return h;
}
function pdfReviewHtml() {
  const P = S.pdf;
  const lignes = P.l.map((r, i) => `<tr>
    <td><input type="checkbox" data-pdf="${i}:ok" ${r.ok ? "checked" : ""} aria-label="Garder cette ligne"></td>
    <td><input data-pdf="${i}:nom" value="${esc(r.nom)}" placeholder="Nom de l'examen"></td>
    <td><input data-pdf="${i}:val" value="${esc(r.val)}" placeholder="Valeur" inputmode="decimal" style="min-width:70px"></td>
    <td><input data-pdf="${i}:uni" value="${esc(r.uni)}" placeholder="Unité" style="min-width:70px"></td>
    <td><input data-pdf="${i}:norme" value="${esc(r.norme)}" placeholder="ex : 0,70 - 1,10"></td>
    <td id="pdfv${i}">${esc(bilVerdict(r))}</td></tr>`).join("");
  return `<h4>1. Le texte lu dans ton PDF</h4>
  ${fold("👀 Voir le texte (pour vérifier ou compléter les lignes)", `<textarea readonly style="min-height:200px">${esc(P.texte.slice(0, 8000))}</textarea>`)}
  <h4>2. Les résultats à enregistrer</h4>
  <p class="muted">${P.l.some((r) => r.nom && r.val) ? "J'ai pré-rempli ce que j'ai reconnu. Je ne devine pas le reste : tout est modifiable, tu peux décocher, corriger ou compléter." : "Je n'ai rien reconnu avec certitude, donc je ne devine rien : remplis les lignes à partir du texte ci-dessus."}</p>
  <div class="row">${dateField("pdfDate", "🗓️ Date de la prise de sang (vérifie-la)", P.date, today())}${sel("pdfPhase", "🌸 Moment du cycle (utile pour FSH et LH)", BIL_PHASES, P.phase)}</div>
  <div class="tw"><table><thead><tr><th>✔</th><th>Examen</th><th>Valeur</th><th>Unité</th><th>Doit être entre</th><th>Résultat</th></tr></thead><tbody>${lignes}</tbody></table></div>
  <p>${btn("➕ Ajouter une ligne", "pdfadd", "sec")}${btn("💾 Enregistrer les lignes cochées", "pdfsave")}${btn("✖ Annuler l'import", "pdfcancel", "sec")}</p>
  <p class="muted">Les normes « repère » sont indicatives (adulte, femme) : celle de ton laboratoire, imprimée sur ton PDF, prévaut. Ce n'est pas un diagnostic : à interpréter avec ton médecin.</p>`;
}

const ACT_BILAN = {
  pdfadd() { S.pdf.l.push({ ok: true, nom: "", val: "", uni: "", norme: "", src: "" }); render(); },
  pdfcancel() { S.pdf = null; render(); },
  async pdfsave() {
    const P = S.pdf, date = dval("pdfDate") || P.date, add = [];
    for (const r of P.l) {
      if (!r.ok || !r.nom.trim() || !String(r.val).trim()) continue;
      const v = num(r.val); if (v === null) { toast("La valeur « " + r.val + " » de « " + r.nom + " » n'est pas un nombre."); return; }
      add.push({ Date: date, Examen: r.nom.trim(), Valeur: v, "Unité": r.uni.trim(), Note: "Import PDF" + (r.norme.trim() ? " | norme " + (r.src || "") + " " + r.norme.trim() : "") });
    }
    if (!add.length) { toast("Aucune ligne complète (examen + valeur) n'est cochée."); return; }
    const { error } = await sb.from("resultats_bilans").insert(add);
    if (error) { toast("Erreur : " + error.message); return; }
    await loadTables(["resultats_bilans"]); S.pdf = null; toast("🎉 " + add.length + " résultat(s) enregistré(s) !"); render();
  },
};
const CHG_BILAN = {
  async pdfFile(el) {
    const f = el.files && el.files[0]; if (!f) return;
    S.pdf = { err: "", name: f.name, texte: "", l: null, date: today(), phase: BIL_PHASES[0] };
    toast("Lecture du PDF…");
    try {
      const t = await bilLirePdf(f);
      if (!t.trim()) { S.pdf.err = "Je ne trouve pas de texte dans ce PDF (probablement un scan ou une photo). Télécharge la version PDF d'origine depuis le site du laboratoire, ou saisis les valeurs à la main."; }
      else {
        const d = bilDate(t); S.pdf.date = d && d <= today() ? d : today();
        S.pdf.texte = t; S.pdf.l = bilAnalyser(t);
        for (let i = 0; i < 4; i++) S.pdf.l.push({ ok: false, nom: "", val: "", uni: "", norme: "", src: "" });
        S.pdf.l.forEach((r) => { if (!r.norme && r.nom) { const g = bilNormeGen(r.nom); if (g) { r.norme = g; r.src = "repère général"; } } });
      }
    } catch (e) { S.pdf.err = "Je n'arrive pas à ouvrir ce PDF : " + String(e.message || e).slice(0, 200); }
    render();
  },
  pdfDate(el) { if (S.pdf) S.pdf.date = el.value; },
  pdfPhase(el) { S.pdf.phase = el.value; S.pdf.l.forEach((r) => bilAppliquerPhase(r, el.value)); render(); },
};
// modification d'une ligne du tableau d'import (sans tout redessiner)
document.addEventListener("change", (e) => {
  const el = e.target, k = el.dataset && el.dataset.pdf; if (!k || !S.pdf || !S.pdf.l) return;
  const [i, f] = k.split(":"), r = S.pdf.l[+i]; if (!r) return;
  r[f] = f === "ok" ? el.checked : el.value;
  if (f === "nom" && !String(r.norme).trim()) {
    const g = bilNormeGen(r.nom); if (g) { r.norme = g; r.src = "repère général"; } bilAppliquerPhase(r, S.pdf.phase);
    const n = el.closest("tr").querySelector('[data-pdf$=":norme"]'); if (n) n.value = r.norme;
  }
  if (f === "norme") r.src = "";
  const v = $("pdfv" + i); if (v) v.textContent = bilVerdict(r);
});
