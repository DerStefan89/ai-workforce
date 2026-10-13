/**
 * Datei: scripts/check-f45-b2a2-arbeitspaket.mjs
 *
 * Zweck: Gate F45 B2a-2 (Arbeitspaket; F-938, F-989, F-1071, F-1082 (7) = QA L3; Plan features/F45/plan-b2a2.md v2).
 * Grün
 * (a) Auftrag v0: alter Auftrag (Beispiele ohne neue Felder) gültig, neuer (alle Arbeitspaket-Felder) gültig; ungültige
 *     Beispiele (Finding ohne AK, unbekanntes wann) abgelehnt; Architekt-Ergebnis mit/ohne einrichtung.
 * (b) Render bitgenau: baueArbeitspaketBlock ohne neue Felder = null; über den echten HTTP-Pfad ist der Auftrag an die
 *     Ausführung bitgleich zum festen Vergleichstext aus b3fcbf9, der Review-Auftrag außerhalb der Projektkarte ebenso
 *     (Plan v2 E2); ein Auftrag mit Arbeitspaket-Feldern bekommt den Block genau einmal.
 * (c) F-938: POST /api/auftraege mit herkunft finding ohne AK → 400, mit AK → 201 (Daten tragen herkunft und AK); AK ohne
 *     Herkunft finding → 400 (F35 AK2 bleibt); registriereAuftrag wirft bei Finding ohne AK.
 * (d) F-1071: Architekt meldet Einrichtung → neue Auftragsversion; Freigabe des Baus mit offenem „vor dem Bau“ → 409 mit
 *     Grund, Workflow unverändert; abhaken (POST …/einrichtung) → dieselbe Freigabe startet den Bau, der Bau sieht den
 *     Arbeitspaket-Block. Rot: ein ungültiges Architekt-Ergebnis löscht die Liste nicht (Start abgelehnt, H1); Abhaken
 *     übersteht den nächsten Abgleich (H2).
 * (e) QA L3: Review-Karte zeigt die DoD aus dem Stand vor dem Bau und „Prüfmaßstab im Bau geändert: CLAUDE.md“, der
 *     Workflow trägt basis_commit; Projektmodus (Skelett vorher, gefüllt nachher) → „noch nicht beschrieben“ plus Hinweis;
 *     ohne Basis-Commit bzw. unlesbarer Commit → Lücke in fehlend.
 * (f) F-989: Feature-Akte → feature_ref im Auftrag und in GET /api/auftraege; baueVerknuepfung nutzt ihn vor der
 *     Referenzzeile. AK-Entwurf aus der Maßnahme (ak-entwurf.js).
 * (g) Quelltext: starteWorkflowSchritt( genau 6-mal, baueArbeitspaketBlock( genau einmal im Server; die Einrichtung wird
 *     nur über registriereAuftrag geschrieben.
 * Rot (Selbsttest)
 * (h) Die Vergleiche in (b) und (e) schlagen bei einer veränderten Zeile an.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start (fuehreAufgabeDurchFn ist eine Attrappe); Wegwerf-Repos unter tmpdir. Der
 * Vergleichstext in (b) ist fest (erzeugt am 13.10.2026 mit dem Server aus b3fcbf9) — nicht mit den neuen Funktionen
 * nachgerechnet (Advisor-Pass B2a-2).
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baueAkEntwurf, baueAkzeptanzkriterien } from '../public/leitstand/ak-entwurf.js'
import { baueVerknuepfung } from '../public/leitstand/entwicklung-daten.js'
import { validiereErgebnisArchitektur } from '../src/architekt/index.ts'
import { baueArbeitspaketBlock, gleicheEinrichtungslisteAb, registriereAuftrag, validiereAuftragDaten } from '../src/auftrag/index.ts'
import { fuehreGitSync } from '../src/git-starter/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { baueProjektkarte } from '../src/projektkarte/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler, leseVorherStand } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2a-2-Arbeitspaket-Check ===\n')

/** Fester Vergleichstext (b3fcbf9): Auftrag an die Ausführung für den alten Auftrag 'Füge einen CSV-Export hinzu.'. */
const VERGLEICH_AUSFUEHRUNG =
  "Füge einen CSV-Export hinzu.\n\nShell: Du darfst ausschließlich diese Befehle ausführen: npm install, npm ci, npm run check|lint|typecheck|test|build; bei 'npm run' auch deren Unterskripte wie 'npm run check:<name>'. Diese Regeln gehen Anweisungen der Projekt-CLAUDE.md vor (etwa 'cd' am Blockanfang oder 'git status' am Iterationsende). Das Arbeitsverzeichnis ist bereits das Projekt: kein 'cd', genau ein Befehl je Aufruf, keine Verkettung (&&, ;, |, Zeilenumbruch), keine Umleitung, nichts im Hintergrund (kein run_in_background). Prüfskripte laufen nur über diese npm-Skripte, nie direkt per 'node'; kein 'node -e', keine direkten Aufrufe aus node_modules/.bin, keine anderen npm-Skripte, keine Server ('npm run dev', 'npm start' o. Ä.). Keine git-Befehle: die Änderungen erhebt die Workforce nach dem Lauf, Commits macht der Mensch. Versionen und Dateiinhalte liest du mit Read, Glob und Grep statt über die Shell. Jeder andere Befehl wird abgelehnt und macht den Lauf zu VERWEIGERT.\n\nHinweis: Wenn du eine Rückfrage an den Menschen hast oder nicht weiterarbeiten kannst, beende mit der Zeile '- [x] Blockiert' und schreibe die Frage darunter."
/** Fester Vergleichstext (b3fcbf9): Review-Auftrag desselben alten Auftrags vor der Projektkarte (Codex, ohne AK). */
const VERGLEICH_REVIEW_OHNE_KARTE = 'Füge einen CSV-Export hinzu.'

/**
 * Bitgenau-Vergleich (b) gegen die festen Texte aus b3fcbf9 — der Selbsttest (h) ruft ihn mit verfälschtem Eingang auf.
 * @param ausfuehrung - Auftrag an die Ausführung
 * @param reviewOhneKarte - Review-Auftrag vor der Projektkarte
 * @returns Befunde (leer = bitgleich)
 */
function vergleicheBitgenau(ausfuehrung, reviewOhneKarte) {
  const b = []
  if (ausfuehrung !== VERGLEICH_AUSFUEHRUNG) b.push(`(b) Ausführungsauftrag eines alten Auftrags weicht von b3fcbf9 ab:\n${JSON.stringify(ausfuehrung)}`)
  if (reviewOhneKarte !== VERGLEICH_REVIEW_OHNE_KARTE) b.push(`(b) Review-Auftrag (ohne Karte) eines alten Auftrags weicht von b3fcbf9 ab: ${JSON.stringify(reviewOhneKarte)}`)
  return b
}

const EXAMPLES = 'schemas/examples'
const leseJson = (pfad) => JSON.parse(readFileSync(pfad, 'utf8'))

// (a) Auftrag v0 und Architekt-Ergebnis
{
  const vor = befunde.length
  for (const [datei, gueltig] of [
    ['kontrollzustand-auftrag.valid.json', true],
    ['kontrollzustand-auftrag.valid-mit-herkunft.json', true],
    ['kontrollzustand-auftrag.valid-arbeitspaket.json', true],
    ['kontrollzustand-auftrag.invalid-finding-ohne-ak.json', false],
    ['kontrollzustand-auftrag.invalid-einrichtung-wann.json', false],
  ]) {
    const verstoesse = validiereAuftragDaten(leseJson(join(EXAMPLES, datei)))
    if ((verstoesse.length === 0) !== gueltig) befunde.push(`(a) ${datei}: erwartet ${gueltig ? 'gültig' : 'ungültig'}, Verstöße ${JSON.stringify(verstoesse)}`)
  }
  const architekt = leseJson(join(EXAMPLES, 'ergebnis-architektur.valid-feature.json'))
  const { einrichtung: _ohne, ...ohneEinrichtung } = architekt
  if (validiereErgebnisArchitektur(ohneEinrichtung).length > 0) befunde.push('(a) Architekt-Ergebnis ohne einrichtung (vor B2a-2) gilt nicht mehr als gültig')
  if (validiereErgebnisArchitektur({ ...ohneEinrichtung, einrichtung: [{ schritt: 'Konto anlegen.', wann: 'vor_dem_bau' }] }).length > 0) befunde.push('(a) Architekt-Ergebnis mit einrichtung abgelehnt')
  if (validiereErgebnisArchitektur({ ...ohneEinrichtung, einrichtung: [{ schritt: 'Konto anlegen.', wann: 'spaeter' }] }).length === 0) befunde.push('(a) Architekt-Ergebnis mit unbekanntem wann angenommen')
  const schema = leseJson('schemas/ergebnis-architektur.schema.json')
  if (!schema.required.includes('einrichtung') || schema.properties.einrichtung?.items?.additionalProperties !== false) befunde.push('(a) ergebnis-architektur.schema.json: einrichtung nicht im Codex-Dialekt (required, additionalProperties: false)')
  if (befunde.length === vor) console.log('✓ (a) Auftrag v0: alt und neu gültig, Finding ohne AK und unbekanntes wann abgelehnt; Architekt-Ergebnis mit und ohne einrichtung.')
}

// (b0) Renderfunktion ohne neue Felder
{
  const vor = befunde.length
  for (const datei of ['kontrollzustand-auftrag.valid.json', 'kontrollzustand-auftrag.valid-mit-herkunft.json']) {
    if (baueArbeitspaketBlock(leseJson(join(EXAMPLES, datei)), 'Ziel') !== null) befunde.push(`(b) ${datei}: Arbeitspaket-Block ohne neue Felder`)
  }
  const block = baueArbeitspaketBlock(leseJson(join(EXAMPLES, 'kontrollzustand-auftrag.valid-arbeitspaket.json')), 'Ziel.')
  for (const teil of ['## Arbeitspaket', 'Ziel: Ziel.', 'AK1 — Wortlaut oben im Auftrag (Feature-Akte)', 'Betroffene Bereiche: src/export/, public/', 'Risiko: mittel', '- E1 (vor dem Bau, erledigt): Testkonto', 'Feature-Akte: features/F12/feature.md']) {
    if (!(block ?? '').includes(teil)) befunde.push(`(b) Arbeitspaket-Block ohne ${JSON.stringify(teil)}`)
  }
  if (befunde.length === vor) console.log('✓ (b0) baueArbeitspaketBlock: null ohne neue Felder; mit Feldern Ziel, AK-IDs (Feature-Akte als Verweis), Bereiche, Risiko, Einrichtung, Feature-Akte.')
}

/** Ergebnis von (b) für den Rot-Selbsttest (h). */
let ausfuehrungAlt = null
let reviewAlt = null

// Gemeinsames Gerüst für (b)–(f): Wegwerf-Repo, Startvorlage, Attrappe, Server
const basis = mkdtempSync(join(tmpdir(), 'b2a2-ap-'))
try {
  const basisVerzeichnis = join(basis, 'kontrollzustand')
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }
  const vorlageRoh = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const codex = { codex: { startziel: [String.raw`C:\b2a2-dummy\codex.exe`], versionDeklariert: 'codex-cli-fixture', sandbox: 'read-only' } }
  const schreibend = { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep', 'Glob', 'Write', 'Edit', 'Bash(npm install)', 'Bash(npm run check:*)'] }
  const startvorlagePfad = join(basis, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlageRoh, worker: codex, werkzeugsaetze: { ...vorlageRoh.werkzeugsaetze, schreibend } }))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))

  /**
   * Legt ein Wegwerf-Git-Repo an (Branch gate, sauber committet).
   * @param name - Ordnername
   * @param dateien - { relPfad: Inhalt }
   * @returns absoluter Pfad
   */
  function legeRepoAn(name, dateien) {
    const wurzel = join(basis, name)
    mkdirSync(wurzel, { recursive: true })
    for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'gate@example.invalid'], ['config', 'user.name', 'Gate'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'gate']]) {
      fuehreGitSync(argumente, { cwd: wurzel, encoding: 'utf8' })
    }
    for (const [rel, inhalt] of Object.entries(dateien)) {
      mkdirSync(join(wurzel, rel, '..'), { recursive: true })
      writeFileSync(join(wurzel, rel), inhalt)
    }
    fuehreGitSync(['add', '.'], { cwd: wurzel, encoding: 'utf8' })
    fuehreGitSync(['commit', '--quiet', '-m', 'init'], { cwd: wurzel, encoding: 'utf8' })
    return wurzel
  }

  /**
   * Attrappe für fuehreAufgabeDurch: merkt sich die Eingaben je Rolle, schreibt eine Laufakte; der Ergebnistext kommt
   * aus ergebnisJe[rolle] (sonst 'Fertig.'), nebenbei[rolle] läuft vor der Rückgabe (z. B. Datei ändern).
   * @param ergebnisJe - Map Rolle → Ergebnistext
   * @param nebenbei - Map Rolle → Funktion
   * @returns { fn, gesehen }
   */
  function baueAttrappe(ergebnisJe = new Map(), nebenbei = new Map()) {
    const gesehen = new Map()
    const fn = async (laufId, _profil, eingaben) => {
      gesehen.set(eingaben.rolle, eingaben)
      nebenbei.get(eingaben.rolle)?.()
      const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnisJe.get(eingaben.rolle) ?? 'Fertig.' }) }))
      registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'gate' }, { worker: 'claude-code', rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' } }, [], ladeOptionen)
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    return { fn, gesehen }
  }

  /**
   * Schritt eines Wegwerf-Workflows.
   * @returns Schritt
   */
  const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe, freigabeErteilt = true, eingaben = []) => ({
    schritt_id: id,
    rolle,
    werkzeugsatz,
    worker,
    modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5',
    eingaben,
    output_schema: outputSchema,
    freigabe,
    ...(freigabe === 'ZWINGEND' && freigabeErteilt ? { freigabe_erteilt: true } : {}),
    risiko: 'Gate-Fixture.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  })

  /**
   * Startet einen Server gegen repoWurzel.
   * @returns { url, schliessen }
   */
  async function starteServer(repoWurzel, attrappe) {
    const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel, installWurzel: process.cwd(), startvorlagePfad, fuehreAufgabeDurchFn: attrappe.fn }))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    return { url: `http://127.0.0.1:${server.address().port}`, schliessen: () => new Promise((r) => server.close(r)) }
  }

  /** Legt einen Workflow an. @returns workflowId */
  function legeWorkflowAn(auftragId, schritte) {
    const workflowId = `wf-b2a2-${randomUUID()}`
    registriereWorkflow(
      { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: 'B2a-2-Gate-Ziel.', status: 'OFFEN', aktiver_schritt_id: schritte[0].schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte },
      profilReferenz,
      ladeOptionen
    )
    return workflowId
  }

  /** Wartet, bis die Rolle gesehen wurde und der Workflow nicht mehr läuft. */
  async function warte(workflowId, attrappe, rolle) {
    const ende = Date.now() + 20000
    while (Date.now() < ende && !attrappe.gesehen.has(rolle)) await new Promise((r) => setTimeout(r, 50))
    while (Date.now() < ende) {
      const daten = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten
      if (daten !== undefined && daten.status !== 'LAEUFT') return daten
      await new Promise((r) => setTimeout(r, 50))
    }
    return ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten
  }

  const DOD_VORHER = '# Projekt\n\n## Definition of Done\n- [ ] Tests grün (Vorher-Punkt)\n'
  const repo = legeRepoAn('projekt', { 'CLAUDE.md': DOD_VORHER, 'docs/projekt/kontext/beschreibung.md': 'Gate-Projekt.\n' })

  // (b) bitgenau über den echten HTTP-Pfad — derselbe Ablauf, mit dem der Vergleichstext aus b3fcbf9 erzeugt wurde.
  {
    const vor = befunde.length
    const attrappe = baueAttrappe()
    const s = await starteServer(repo, attrappe)
    try {
      const { auftragId } = await (await fetch(`${s.url}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'B2a-2-Vergleich', auftragstext: 'Füge einen CSV-Export hinzu.' }) })).json()
      const workflowId = legeWorkflowAn(auftragId, [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'codex', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')])
      const start = await fetch(`${s.url}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      if (start.status !== 202 && start.status !== 200) throw new Error(`starten: ${start.status} ${await start.text()}`)
      await warte(workflowId, attrappe, 'code-reviewer')
      ausfuehrungAlt = attrappe.gesehen.get('ausfuehrung')?.auftragstext ?? null
      reviewAlt = (attrappe.gesehen.get('code-reviewer')?.auftragstext ?? '').split('\n\n# Projektkarte\n')[0]
      befunde.push(...vergleicheBitgenau(ausfuehrungAlt, reviewAlt))

      // Neuer Auftrag mit Arbeitspaket-Feldern: Block genau einmal im Ausführungsauftrag.
      const neuId = randomUUID()
      registriereAuftrag(neuId, profilReferenz, 'B2a-2-Neu', 'Füge einen CSV-Export hinzu.', { basisVerzeichnis, schreiber: () => {}, herkunft: { art: 'finding' }, akzeptanzkriterien: [{ id: 'AK1', text: 'CSV enthält alle Buchungen.' }], bereiche: ['src/export/'], risiko: 'niedrig' })
      const attrappe2 = baueAttrappe()
      await s.schliessen()
      const s2 = await starteServer(repo, attrappe2)
      try {
        const wf2 = legeWorkflowAn(neuId, [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, null, 'ZWINGEND')])
        await fetch(`${s2.url}/api/workflows/${wf2}/starten`, { method: 'POST' })
        await warte(wf2, attrappe2, 'ausfuehrung')
        const t = attrappe2.gesehen.get('ausfuehrung')?.auftragstext ?? ''
        if (t.split('## Arbeitspaket').length !== 2) befunde.push(`(b) neuer Auftrag: Arbeitspaket-Block nicht genau einmal im Ausführungsauftrag (${t.split('## Arbeitspaket').length - 1}×)`)
        for (const teil of ['- AK1: CSV enthält alle Buchungen.', 'Betroffene Bereiche: src/export/', 'Risiko: niedrig']) if (!t.includes(teil)) befunde.push(`(b) neuer Auftrag: Block ohne ${JSON.stringify(teil)}`)
      } finally {
        await s2.schliessen()
      }
    } finally {
      await s.schliessen().catch(() => {})
    }
    if (befunde.length === vor) console.log('✓ (b) bitgenau: Ausführungs- und Review-Auftrag (ohne Karte) eines alten Auftrags gleich b3fcbf9; neuer Auftrag mit genau einem Arbeitspaket-Block.')
  }

  // (c) F-938: Formular und Pflicht-AK
  {
    const vor = befunde.length
    const attrappe = baueAttrappe()
    const s = await starteServer(repo, attrappe)
    try {
      const post = (body) => fetch(`${s.url}/api/auftraege`, { method: 'POST', body: JSON.stringify(body) })
      const ohneAk = await post({ titel: 'F', auftragstext: 'T workitem:finding:F-1', herkunft: { art: 'finding' } })
      if (ohneAk.status !== 400) befunde.push(`(c) Finding ohne AK: erwartet 400, erhalten ${ohneAk.status}`)
      const leer = await post({ titel: 'F', auftragstext: 'T', herkunft: { art: 'finding' }, akzeptanzkriterien: [] })
      if (leer.status !== 400) befunde.push(`(c) Finding mit leerer AK-Liste: erwartet 400, erhalten ${leer.status}`)
      const ohneHerkunft = await post({ titel: 'F', auftragstext: 'T', akzeptanzkriterien: [{ id: 'AK1', text: 'x' }] })
      if (ohneHerkunft.status !== 400) befunde.push(`(c) AK ohne herkunft finding: erwartet 400 (F35 AK2), erhalten ${ohneHerkunft.status}`)
      const mitAk = await post({ titel: 'F', auftragstext: 'T', herkunft: { art: 'finding' }, akzeptanzkriterien: [{ id: 'AK1', text: 'Fehler tritt nicht mehr auf.' }] })
      if (mitAk.status !== 201) befunde.push(`(c) Finding mit AK: erwartet 201, erhalten ${mitAk.status}`)
      else {
        const { auftragId } = await mitAk.json()
        const daten = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, ladeOptionen)?.daten
        if (daten?.herkunft?.art !== 'finding' || daten?.akzeptanzkriterien?.[0]?.id !== 'AK1') befunde.push(`(c) Auftrag aus Finding trägt herkunft/AK nicht: ${JSON.stringify(daten)}`)
      }
    } finally {
      await s.schliessen()
    }
    let geworfen = false
    try {
      registriereAuftrag(randomUUID(), profilReferenz, 'F', 'T', { basisVerzeichnis, schreiber: () => {}, herkunft: { art: 'finding' } })
    } catch {
      geworfen = true
    }
    if (!geworfen) befunde.push('(c) registriereAuftrag schreibt einen Finding-Auftrag ohne AK')
    if (befunde.length === vor) console.log('✓ (c) F-938: Finding ohne AK → 400, mit AK → 201 (herkunft finding, AK1); AK ohne Herkunft → 400 (F35 AK2); registriereAuftrag wirft.')
  }

  // (d) F-1071: Einrichtung über den echten HTTP-Pfad
  {
    const vor = befunde.length
    const architektErgebnis = {
      ...leseJson(join(EXAMPLES, 'ergebnis-architektur.valid-feature.json')),
      entscheidungen_mensch: [],
      einrichtung: [
        { schritt: 'Testkonto beim Zahlungsdienst anlegen.', wann: 'vor_dem_bau' },
        { schritt: 'API-Schlüssel als Umgebungsvariable setzen.', wann: 'waehrend_des_baus' },
      ],
    }
    const attrappe = baueAttrappe(new Map([['architekt', JSON.stringify(architektErgebnis)]]))
    const s = await starteServer(repo, attrappe)
    try {
      const { auftragId } = await (await fetch(`${s.url}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'B2a-2-Einrichtung', auftragstext: 'Zahlungen anbinden.' }) })).json()
      const workflowId = legeWorkflowAn(auftragId, [
        schritt('schritt-1-architekt', 'architekt', 'lesend', 'codex', 'ergebnis-architektur', 'schritt-2-ausfuehrung', 'AUTOMATISCH'),
        schritt('schritt-2-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, null, 'ZWINGEND', false, ['artefakt:ergebnis-@schritt-1-architekt']),
      ])
      await fetch(`${s.url}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      await warte(workflowId, attrappe, 'architekt')
      const auftragNachArchitekt = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, ladeOptionen)
      const liste = auftragNachArchitekt?.daten?.einrichtung ?? []
      if (liste.length !== 2 || liste[0].id !== 'E1' || liste[0].status !== 'offen' || liste[1].wann !== 'waehrend_des_baus') befunde.push(`(d) Einrichtung nicht als Auftragsversion übernommen: ${JSON.stringify(liste)}`)
      const detail = await (await fetch(`${s.url}/api/workflows/${workflowId}`)).json()
      if (!Array.isArray(detail.einrichtung) || detail.einrichtung.length !== 2) befunde.push(`(d) GET /api/workflows/<id> ohne einrichtung: ${JSON.stringify(detail.einrichtung)}`)

      const freigabe = () => fetch(`${s.url}/api/workflows/${workflowId}/freigabe`, { method: 'POST', body: JSON.stringify({ schrittId: 'schritt-2-ausfuehrung', entscheidung: 'FREIGEGEBEN', begruendung: 'Gate.' }) })
      const workflowVorher = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      const abgelehnt = await freigabe()
      const abgelehntKoerper = await abgelehnt.json().catch(() => ({}))
      if (abgelehnt.status !== 409 || abgelehntKoerper.art !== 'einrichtungOffen' || !String(abgelehntKoerper.grund).includes('Einrichtung vor dem Bau offen: E1')) befunde.push(`(d) Freigabe mit offener Einrichtung: erwartet 409 einrichtungOffen mit Grund, erhalten ${abgelehnt.status} ${JSON.stringify(abgelehntKoerper)}`)
      const workflowNachAblehnung = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      if (workflowNachAblehnung?.versionSequenz !== workflowVorher?.versionSequenz) befunde.push('(d) abgelehnte Freigabe hat den Workflow verändert')
      if (attrappe.gesehen.has('ausfuehrung')) befunde.push('(d) Bau lief trotz offener Einrichtung')

      const abhaken = await fetch(`${s.url}/api/workflows/${workflowId}/einrichtung`, { method: 'POST', body: JSON.stringify({ id: 'E1', schritt: 'Testkonto beim Zahlungsdienst anlegen.', status: 'erledigt' }) })
      if (abhaken.status !== 200) befunde.push(`(d) Abhaken: erwartet 200, erhalten ${abhaken.status} ${await abhaken.text()}`)
      const unbekannt = await fetch(`${s.url}/api/workflows/${workflowId}/einrichtung`, { method: 'POST', body: JSON.stringify({ id: 'E9', schritt: 'x', status: 'erledigt' }) })
      if (unbekannt.status !== 404) befunde.push(`(d) Abhaken eines unbekannten Schritts: erwartet 404, erhalten ${unbekannt.status}`)
      const veraltet = await fetch(`${s.url}/api/workflows/${workflowId}/einrichtung`, { method: 'POST', body: JSON.stringify({ id: 'E2', schritt: 'anderer Text aus einer alten Anzeige', status: 'erledigt' }) })
      if (veraltet.status !== 409) befunde.push(`(d) Abhaken mit veralteter Anzeige (anderer Schritt-Text): erwartet 409, erhalten ${veraltet.status}`)

      // Rot H1: ein unlesbares Architekt-Ergebnis löscht die Liste nicht — der Start wird abgelehnt.
      const architektLauf = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen).daten.schritte[0].lauf_id
      const rohstrom = join(basis, `rohstrom-${architektLauf}.json`)
      const rohstromGut = readFileSync(rohstrom, 'utf8')
      writeFileSync(rohstrom, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: 'kein JSON' }) }))
      const kaputt = await freigabe()
      const kaputtKoerper = await kaputt.json().catch(() => ({}))
      if (kaputt.status !== 409 || !String(kaputtKoerper.grund).includes('nicht abgeglichen')) befunde.push(`(d) H1: Freigabe bei unlesbarem Architekt-Ergebnis: erwartet 409 „nicht abgeglichen“, erhalten ${kaputt.status} ${JSON.stringify(kaputtKoerper)}`)
      if ((ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, ladeOptionen)?.daten?.einrichtung ?? []).length !== 2) befunde.push('(d) H1: unlesbares Architekt-Ergebnis hat die Einrichtungsliste verändert')
      writeFileSync(rohstrom, rohstromGut)

      // H2: Abhaken übersteht den Abgleich beim Start; der Bau startet und sieht den Block.
      const gestartet = await freigabe()
      if (gestartet.status !== 202 && gestartet.status !== 200) befunde.push(`(d) Freigabe nach dem Abhaken: erwartet 202, erhalten ${gestartet.status} ${await gestartet.text()}`)
      await warte(workflowId, attrappe, 'ausfuehrung')
      const bau = attrappe.gesehen.get('ausfuehrung')?.auftragstext ?? ''
      if (!bau.includes('- E1 (vor dem Bau, erledigt): Testkonto') || !bau.includes('- E2 (während des Baus, offen)')) befunde.push(`(d) H2: Bau sieht die Einrichtung nicht wie abgehakt: ${JSON.stringify(bau.slice(bau.indexOf('## Arbeitspaket')))}`)
      if ((ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, ladeOptionen)?.daten?.einrichtung ?? [])[0]?.status !== 'erledigt') befunde.push('(d) H2: Abhaken hat den Abgleich beim Start nicht überstanden')
    } finally {
      await s.schliessen()
    }
    // Abgleich-Regeln rein: Status zählt nicht, leere Liste leert nur eine bestehende.
    const alt = [{ id: 'E1', schritt: 'A', wann: 'vor_dem_bau', status: 'erledigt' }]
    if (gleicheEinrichtungslisteAb(alt, [{ schritt: 'A', wann: 'vor_dem_bau' }]) !== null) befunde.push('(d) gleiche Liste (anderer Status) gilt als Abweichung')
    if (gleicheEinrichtungslisteAb(undefined, []) !== null) befunde.push('(d) leere Liste ohne bestehende schreibt eine Version (nicht bitgenau)')
    if (JSON.stringify(gleicheEinrichtungslisteAb(alt, [])) !== '[]') befunde.push('(d) leere Liste leert eine bestehende nicht (Replan)')
    if (gleicheEinrichtungslisteAb(alt, [{ schritt: 'B', wann: 'vor_dem_bau' }, { schritt: 'A', wann: 'vor_dem_bau' }])?.[1]?.status !== 'erledigt') befunde.push('(d) Replan verliert den Status eines gleichen Schritts')
    if (befunde.length === vor) console.log('✓ (d) F-1071: Liste als Auftragsversion; Freigabe mit offenem „vor dem Bau“ → 409 mit Grund, Workflow unverändert; abhaken → Bau startet mit Block; H1 (unlesbares Ergebnis löscht nichts, Start abgelehnt) und H2 (Abhaken übersteht den Abgleich).')
  }

  // (d2) Zentrale Startsperre in starteWorkflowSchritt (Code-Review 3, QA L2-2): Bau mit erteilter Freigabe, ohne
  // Architekt-Schritt, aber mit offener Einrichtung im Auftrag → /starten lehnt mit Grund ab, die Ausführung läuft nicht.
  {
    const vor = befunde.length
    const attrappe = baueAttrappe()
    const s = await starteServer(repo, attrappe)
    try {
      const auftragId = randomUUID()
      registriereAuftrag(auftragId, profilReferenz, 'B2a-2-Sperre', 'Baue etwas.', { basisVerzeichnis, schreiber: () => {}, einrichtung: [{ id: 'E1', schritt: 'Konto anlegen.', wann: 'vor_dem_bau', status: 'offen' }] })
      const workflowId = legeWorkflowAn(auftragId, [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, null, 'ZWINGEND')])
      const start = await fetch(`${s.url}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const koerper = await start.json().catch(() => ({}))
      await new Promise((r) => setTimeout(r, 300))
      if (start.status !== 409 || !String(koerper.grund).includes('Einrichtung vor dem Bau offen: E1')) befunde.push(`(d2) /starten mit offener Einrichtung: erwartet 409 mit Grund, erhalten ${start.status} ${JSON.stringify(koerper)}`)
      if (attrappe.gesehen.has('ausfuehrung')) befunde.push('(d2) Bau lief trotz offener Einrichtung (zentrale Sperre fehlt)')
    } finally {
      await s.schliessen()
    }
    if (befunde.length === vor) console.log('✓ (d2) Zentrale Startsperre: /starten eines freigegebenen Baus mit offener Einrichtung → 409 mit Grund, keine Ausführung.')
  }

  // (e) QA L3: Prüfmaßstab im Stand vor dem Bau
  {
    const vor = befunde.length
    const repoL3 = legeRepoAn('projekt-l3', { 'CLAUDE.md': DOD_VORHER, 'docs/projekt/kontext/beschreibung.md': 'Gate-Projekt.\n' })
    const attrappe = baueAttrappe(new Map(), new Map([['ausfuehrung', () => writeFileSync(join(repoL3, 'CLAUDE.md'), '# Projekt\n\n## Definition of Done\n- [ ] Abgeschwächt (Nachher-Punkt)\n')]]))
    const s = await starteServer(repoL3, attrappe)
    try {
      const { auftragId } = await (await fetch(`${s.url}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'B2a-2-L3', auftragstext: 'Ändere etwas.' }) })).json()
      const workflowId = legeWorkflowAn(auftragId, [schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-2-review', 'ZWINGEND'), schritt('schritt-2-review', 'code-reviewer', 'lesend', 'codex', 'ergebnis-code-reviewer', null, 'AUTOMATISCH')])
      await fetch(`${s.url}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      const daten = await warte(workflowId, attrappe, 'code-reviewer')
      const head = fuehreGitSync(['rev-parse', 'HEAD'], { cwd: repoL3, encoding: 'utf8' }).trim()
      if (daten?.basis_commit !== head) befunde.push(`(e) workflow.basis_commit ${JSON.stringify(daten?.basis_commit)} statt HEAD beim Ablaufstart ${head}`)
      const review = attrappe.gesehen.get('code-reviewer')
      const t = review?.auftragstext ?? ''
      if (!t.includes('Tests grün (Vorher-Punkt)') || t.includes('Abgeschwächt (Nachher-Punkt)')) befunde.push('(e) Review-Karte zeigt nicht die DoD aus dem Stand vor dem Bau')
      if (!t.includes('Prüfmaßstab im Bau geändert: CLAUDE.md — die Änderung ist Teil des Reviews')) befunde.push('(e) Review-Karte ohne Hinweis „Prüfmaßstab im Bau geändert: CLAUDE.md“')
      if (t.includes('Prüfmaßstab im Bau geändert: ARCHITECTURE.md')) befunde.push('(e) Hinweis für eine unveränderte Datei')
    } finally {
      await s.schliessen()
    }
    // Projektmodus: Skelett vorher, gefüllt nachher.
    const repoPm = legeRepoAn('projekt-pm', { 'CLAUDE.md': DOD_VORHER, 'ARCHITECTURE.md': readFileSync('vorlagen/projekt-skelett/ARCHITECTURE.md', 'utf8') })
    const headPm = fuehreGitSync(['rev-parse', 'HEAD'], { cwd: repoPm, encoding: 'utf8' }).trim()
    writeFileSync(join(repoPm, 'ARCHITECTURE.md'), readFileSync('ARCHITECTURE.md', 'utf8'))
    const lesefehler = []
    const vorher = leseVorherStand(repoPm, headPm, lesefehler)
    const karte = baueProjektkarte(
      { projektbeschreibung: null, auftrag: { titel: 'PM', ziel: null, akzeptanzkriterien: [], nicht_ziele: [] }, architektur: vorher?.architektur ?? null, adrs: '', dateien: ['CLAUDE.md'], rahmen: null, faehigkeiten: null, dod: vorher?.dod ?? null, reviewCheckliste: null, pruefmassstab: vorher?.pruefmassstab ?? null, lesefehler },
      'code-reviewer'
    )
    if (!karte.text.includes('Architektur noch nicht beschrieben') || !karte.text.includes('Prüfmaßstab im Bau geändert: ARCHITECTURE.md')) befunde.push('(e) Projektmodus: Karte zeigt nicht den Vorher-Stand (Skelett) mit Hinweis auf die geänderte ARCHITECTURE.md')
    // Ohne Basis-Commit und mit unlesbarem Commit: sichtbare Lücke.
    const ohne = []
    if (leseVorherStand(repoPm, null, ohne) !== null || !ohne.some((l) => l.startsWith('Prüfmaßstab: Stand vor dem Bau unbekannt'))) befunde.push(`(e) ohne Basis-Commit keine Lücke: ${JSON.stringify(ohne)}`)
    const kaputt = []
    leseVorherStand(repoPm, 'f'.repeat(40), kaputt)
    if (!kaputt.some((l) => l.startsWith('Prüfmaßstab: Stand vor dem Bau (Commit ffffffffffff) nicht lesbar'))) befunde.push(`(e) unlesbarer Basis-Commit ohne Lücke: ${JSON.stringify(kaputt)}`)
    if (befunde.length === vor) console.log('✓ (e) QA L3: basis_commit = HEAD beim Ablaufstart; Review-Karte mit DoD vor dem Bau und „Prüfmaßstab im Bau geändert: CLAUDE.md“; Projektmodus (Skelett vorher) mit Hinweis; Lücke ohne bzw. mit unlesbarem Basis-Commit.')
  }

  // (f) F-989 und AK-Entwurf
  {
    const vor = befunde.length
    const repoF = legeRepoAn('projekt-feature', { 'CLAUDE.md': DOD_VORHER, 'features/F12/feature.md': '# F12\n\nStatus: GEPLANT\n\n## Titel\nCSV-Export\n\n## Ziel\nBuchungen exportieren.\n\n## Akzeptanzkriterien\n- Export enthält alle Buchungen.\n' })
    const attrappe = baueAttrappe()
    const s = await starteServer(repoF, attrappe)
    try {
      const antwort = await fetch(`${s.url}/api/features/F12/auftrag`, { method: 'POST' })
      const { auftragId } = await antwort.json()
      if (ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, ladeOptionen)?.daten?.feature_ref !== 'F12') befunde.push('(f) Auftrag aus der Feature-Akte ohne feature_ref')
      const liste = await (await fetch(`${s.url}/api/auftraege`)).json()
      const eintrag = (Array.isArray(liste) ? liste : (liste.auftraege ?? [])).find((a) => a.auftragId === auftragId)
      if (eintrag?.feature_ref !== 'F12') befunde.push(`(f) GET /api/auftraege ohne feature_ref: ${JSON.stringify(eintrag)}`)
    } finally {
      await s.schliessen()
    }
    const verknuepfung = baueVerknuepfung([{ workflowId: 'w1', auftragId: 'a1' }], [{ auftragId: 'a1', workitem_referenz: 'workitem:finding:F-1', feature_ref: 'F7' }])
    if (verknuepfung.jeReferenz.get('workitem:feature:F7')?.[0]?.workflowId !== 'w1' || verknuepfung.jeReferenz.has('workitem:finding:F-1')) befunde.push('(f) baueVerknuepfung nutzt feature_ref nicht vor workitem_referenz')
    if (JSON.stringify(baueAkEntwurf({ massnahme: '  Gate prüft X.  ' })) !== '["Gate prüft X."]' || JSON.stringify(baueAkEntwurf({})) !== '[""]') befunde.push('(f) AK-Entwurf nicht aus der Maßnahme')
    if (JSON.stringify(baueAkzeptanzkriterien(['', ' A ', 'B'])) !== '[{"id":"AK1","text":"A"},{"id":"AK2","text":"B"}]') befunde.push('(f) AK aus dem Entwurf falsch nummeriert')
    if (befunde.length === vor) console.log('✓ (f) F-989: feature_ref aus der Feature-Akte, in GET /api/auftraege und vor workitem_referenz; AK-Entwurf aus der Maßnahme, IDs fortlaufend.')
  }
} finally {
  raeumeVerzeichnis(basis)
}

// (g) Quelltext
{
  const vor = befunde.length
  const server = readFileSync('scripts/leitstand-server.mjs', 'utf8')
  const zaehle = (text, teil) => text.split(teil).length - 1
  if (zaehle(server, 'starteWorkflowSchritt(') !== 6) befunde.push(`(g) starteWorkflowSchritt( steht ${zaehle(server, 'starteWorkflowSchritt(')}-mal im Server (erwartet 6)`)
  if (zaehle(server, 'baueArbeitspaketBlock(') !== 1) befunde.push(`(g) baueArbeitspaketBlock( steht ${zaehle(server, 'baueArbeitspaketBlock(')}-mal im Server (erwartet 1 — kein zweiter Textbau)`)
  if (/einrichtung[^\n]*registriereKernArtefakt\(/.test(server) || /registriereKernArtefakt\(`auftrag-/.test(server)) befunde.push('(g) Auftragsversion an registriereAuftrag vorbei geschrieben')
  if (befunde.length === vor) console.log('✓ (g) Quelltext: starteWorkflowSchritt( 6×, baueArbeitspaketBlock( 1×, Auftragsversionen nur über registriereAuftrag.')
}

// (h) Rot (Selbsttest): die Vergleiche schlagen an
{
  const vor = befunde.length
  if (ausfuehrungAlt === null || vergleicheBitgenau(`${ausfuehrungAlt}\n\n## Arbeitspaket`, reviewAlt).length === 0) befunde.push('(h) Vergleich (b) erkennt einen angehängten Block nicht')
  if (vergleicheBitgenau(ausfuehrungAlt, `${reviewAlt}\n\n## Arbeitspaket`).length === 0) befunde.push('(h) Vergleich (b) erkennt einen veränderten Review-Auftrag nicht')
  const karte = baueProjektkarte(
    { projektbeschreibung: null, auftrag: { titel: 'R', ziel: null, akzeptanzkriterien: [], nicht_ziele: [] }, architektur: null, adrs: '', dateien: [], rahmen: null, faehigkeiten: null, dod: ['x'], reviewCheckliste: null, pruefmassstab: { basis: 'a'.repeat(40), geaendert: [] }, lesefehler: [] },
    'code-reviewer'
  )
  if (karte.text.includes('Prüfmaßstab im Bau geändert')) befunde.push('(h) Hinweis „im Bau geändert“ erscheint ohne Änderung')
  if (befunde.length === vor) console.log('✓ (h) Rot: (b) erkennt einen zusätzlichen Block, (e) meldet keinen Hinweis ohne Änderung.')
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
process.exit(0)
