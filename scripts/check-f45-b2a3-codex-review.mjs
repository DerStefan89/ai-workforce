/**
 * Datei: scripts/check-f45-b2a3-codex-review.mjs
 *
 * Zweck: Gate F45 B2a-3a (Codex-Review-Spec + Ausgaberegel; F-1063, F-959, F-998; Plan features/F45/plan-b2a3.md v2.1).
 * Grün
 * (a) docs/projekt/codex-review-spec.md vorhanden, der Teil ab „SPEC-ANFANG“ bytegleich (sha256, LF-normalisiert) zum
 *     am 13.10.2026 aus dem Bauauftrag geschriebenen Stand; Kopfabschnitt „Umsetzung in der Workforce“ vorhanden.
 * (b) Über den echten HTTP-Pfad (Attrappe für fuehreAufgabeDurch): der Review-Auftrag von Codex UND Claude trägt den
 *     Policy-Block genau einmal, mit Version, hinter der Projektkarte; Codex ohne Beobachtungsblock, Claude mit (davor);
 *     die Ausführung bekommt keine Policy; eingaben.review.policy_version gesetzt (den geprüften Stand prüft f45-b2a3b). Der Policy-Text ist an die Version
 *     gekoppelt (fester sha256 je Version); baueReviewPolicyBlock( steht genau einmal im Server.
 * (c) Schema ergebnis-code-reviewer v2: id, dimension, evidenz, korrekturrichtung in required und nullable, KRITISCH;
 *     strict-tauglich bleibt Sache von check-fix-f639; eine alte Laufakte ohne review ist gültig, ein Ergebnis v1 über
 *     GET …/abnahme lesbar (status ok, policy_version null, kein Vertragsbefund).
 * (e) Fehlerfälle (Spec §9.8) über den HTTP-Pfad: Review FEHLGESCHLAGEN oder VERWEIGERT → Projektion 'fehlgeschlagen' mit
 *     Ursache im Grund;
 *     geheilter Ausfall (kein Laufverzeichnis) → 'nicht_gelaufen_klaerung' mit Grund; leere Befunde ohne den Satz →
 *     Regel 1k hält (KLAERUNG_ERFORDERLICH), keine automatische Anpassung; mit dem Satz → ABGESCHLOSSEN; ohne
 *     review in der Laufakte → kein Halt (Gegenprobe); Befund ohne Pflichtwert → Hinweis ohne Halt; Karte mit Lücke →
 *     kontext_luecken.
 * (f) Jarvis-Auftrag: jede Zeile der Regel „direkt ausführbar“, Blockform mit eingesetzter, gequoteter Ortszeile (seit
 *     F45 B2b-4b statt cd, F-1088 (5)), „Deine Schritte“; der Server baut die Ortsangaben an beiden Aufrufen über
 *     baueJarvisOrte(repoWurzel, offeneAblaufOrte()) und ruft weder cdZeile noch ortZeile selbst.
 * (g) Quelltext: starteWorkflowSchritt( genau 6-mal im Server.
 * Rot (Selbsttest, kalibriert)
 * (h) Jede Prüfung aus (a), (b), (c), (f) schlägt bei einem verfälschten Eingang an.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start (fuehreAufgabeDurchFn ist eine Attrappe; sie spiegelt eingaben.review und
 * eingaben.projektkarte in die Laufakte wie die echten Gateways — deren Durchreichung belegen die Gateway-Unit-Tests).
 * Wegwerf-Repos unter tmpdir. Ein Text der Policy ohne neue Version macht (b) rot — dann REVIEW_POLICY_VERSION erhöhen
 * und POLICY_HASH nachtragen.
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { BLOCK_FUSS, BLOCK_KOPF, ortZeile } from '../public/leitstand/code-daten.js'
import { validiereLaufakteDaten } from '../src/claude-code-gateway/index.ts'
import { fuehreGitSync } from '../src/git-starter/index.ts'
import { baueJarvisAuftragstext, REGEL_DEINE_SCHRITTE, REGEL_DIREKT_AUSFUEHRBAR } from '../src/jarvis/index.ts'
import { ladeArtefaktVersion, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { baueReviewPolicyBlock, DIMENSIONEN, EVIDENZEN, KEINE_BEFUNDE_SATZ, REVIEW_POLICY_VERSION } from '../src/review-policy/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb } from '../src/startvorlage/index.ts'
import { registriereWorkflow } from '../src/workflow/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { erzeugeRequestHandler } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-B2a-3a-Codex-Review-Check ===\n')

const sha256 = (text) => createHash('sha256').update(text).digest('hex')

/** Fester sha256 des Spec-Teils (ab der Zeile nach „SPEC-ANFANG“, LF), geschrieben am 13.10.2026 aus dem Bauauftrag. */
const SPEC_HASH = '6fb5765549d660b278969a7022217a4ecbced0b8062bd759739210df53b02dc2'
/** sha256 des Policy-Texts je Version — ein neuer Text braucht eine neue Version (L7). */
const POLICY_HASH = { 'review-policy-1': '665f2b912e835b0c220d33d832c4f3201b06c2aa6c3d705f833ceb99abe2065a' }

/**
 * (a) Prüft den Text der Spec-Datei.
 * @param text - Inhalt von docs/projekt/codex-review-spec.md
 * @returns Befunde
 */
function pruefeSpec(text) {
  const b = []
  const lf = text.replace(/\r\n/g, '\n')
  if (!lf.startsWith('## Umsetzung in der Workforce\n')) b.push('(a) Kopfabschnitt „Umsetzung in der Workforce“ fehlt am Anfang')
  const marke = lf.indexOf('<!-- SPEC-ANFANG')
  if (marke < 0) return [...b, '(a) Markierung SPEC-ANFANG fehlt']
  const spec = lf.slice(lf.indexOf('\n', marke) + 1)
  if (sha256(spec) !== SPEC_HASH) b.push(`(a) Spec-Teil weicht vom festen Stand ab (sha256 ${sha256(spec)})`)
  for (const teil of ['B2a-3a', 'B2a-3b', '§8 Status strittiger Befunde', 'B2b', 'F-1050', 'KRITISCH/HOCH/MITTEL/NIEDRIG']) if (!lf.slice(0, marke).includes(teil)) b.push(`(a) Kopfabschnitt ohne ${JSON.stringify(teil)}`)
  return b
}

/**
 * (b) Prüft einen Review-Auftrag auf den Policy-Block.
 * @param text - Auftragstext
 * @param worker - 'codex' oder 'claude-code'
 * @returns Befunde
 */
function pruefeReviewAuftrag(text, worker) {
  const b = []
  const block = baueReviewPolicyBlock()
  const anzahl = text.split(block).length - 1
  if (anzahl !== 1) b.push(`(b) ${worker}: Policy-Block ${anzahl}-mal im Review-Auftrag (erwartet 1)`)
  if (!text.includes(`## Review-Policy (${REVIEW_POLICY_VERSION})`)) b.push(`(b) ${worker}: Version fehlt im Text`)
  const karte = text.indexOf('# Projektkarte')
  if (karte < 0 || text.indexOf(block) < karte) b.push(`(b) ${worker}: Policy steht nicht hinter der Projektkarte`)
  const beobachtung = text.indexOf('Beobachtung des Ausführungslaufs')
  if (worker === 'codex' && beobachtung >= 0) b.push('(b) codex: Beobachtungsblock im Review-Auftrag (F-1062)')
  if (worker === 'claude-code' && (beobachtung < 0 || beobachtung > text.indexOf(block))) b.push('(b) claude-code: Beobachtungsblock fehlt oder steht hinter der Policy')
  return b
}

/**
 * (c) Prüft das Reviewer-Schema auf die v2-Felder.
 * @param schema - geparstes Schema
 * @returns Befunde
 */
function pruefeSchemaV2(schema) {
  const b = []
  const item = schema?.properties?.befunde?.items
  for (const feld of ['id', 'dimension', 'evidenz', 'korrekturrichtung']) {
    if (!item?.required?.includes(feld)) b.push(`(c) '${feld}' fehlt in required`)
    const typ = item?.properties?.[feld]?.type
    if (!Array.isArray(typ) || !typ.includes('null')) b.push(`(c) '${feld}' ist nicht nullable`)
  }
  for (const [feld, werte] of [
    // Code-Review 4: Erwartung aus der einen Quelle (src/review-policy), nicht als zweites Literal.
    ['dimension', [...DIMENSIONEN, null]],
    ['evidenz', [...EVIDENZEN, null]],
  ]) {
    if (JSON.stringify(item?.properties?.[feld]?.enum) !== JSON.stringify(werte)) b.push(`(c) '${feld}'-Enum weicht ab: ${JSON.stringify(item?.properties?.[feld]?.enum)}`)
  }
  if (!item?.properties?.schwere?.enum?.includes('KRITISCH')) b.push('(c) Schwere KRITISCH fehlt')
  if ('geprueft_stand' in (schema?.properties ?? {})) b.push('(c) geprueft_stand im Modellschema (setzt der Server)')
  return b
}

/**
 * (f) Prüft den Jarvis-Auftrag auf die Ausgaberegel.
 * @param text - Auftragstext
 * @param ortsZeile - erwartete Ortszeile des Projekts
 * @returns Befunde
 */
function pruefeJarvis(text, ortsZeile) {
  const b = []
  for (const zeile of [...REGEL_DIREKT_AUSFUEHRBAR, ...REGEL_DEINE_SCHRITTE]) if (!text.includes(zeile)) b.push(`(f) Regelzeile fehlt: ${zeile.slice(0, 60)}`)
  if (!text.includes(`erste Zeile „${BLOCK_KOPF}“, zweite Zeile die Ortszeile, danach die Befehle, letzte Zeile „${BLOCK_FUSS}“`)) b.push('(f) Blockform fehlt')
  if (!text.includes(`- Ortszeile für das Projekt: ${ortsZeile}`)) b.push('(f) Ortszeile mit eingesetztem Pfad fehlt')
  for (const teil of ['PowerShell (Windows)', 'getrennte Blöcke', 'Anführungszeichen', '--no-verify', 'auf main pushen', 'Keine Platzhalter', "'Deine Schritte:'", 'höchstens drei Zeilen', 'einfache Sprache']) {
    if (!text.includes(teil)) b.push(`(f) Regelteil fehlt: ${teil}`)
  }
  return b
}

// (a) Spec-Datei
const SPEC_TEXT = existsSync('docs/projekt/codex-review-spec.md') ? readFileSync('docs/projekt/codex-review-spec.md', 'utf8') : ''
{
  const vor = befunde.length
  if (SPEC_TEXT === '') befunde.push('(a) docs/projekt/codex-review-spec.md fehlt')
  else befunde.push(...pruefeSpec(SPEC_TEXT))
  if (befunde.length === vor) console.log('✓ (a) Spec-Datei: Kopfabschnitt vorhanden, Spec-Teil bytegleich zum festen Stand.')
}

/**
 * (b0) Prüft Inhalt und Versionskopplung des Policy-Texts und die eine Stelle im Server.
 * @param block - Policy-Text
 * @param version - Version
 * @param server - Quelltext des Servers
 * @returns Befunde
 */
function pruefePolicy(block, version, server) {
  const b = []
  if (POLICY_HASH[version] !== sha256(block)) b.push(`(b) Policy-Text ohne passende Version: ${version} erwartet ${POLICY_HASH[version]}, ist ${sha256(block)} — Text geändert? Version erhöhen.`)
  for (const teil of ['Bugs und Korrektheit', 'Funktionsfähigkeit', 'Skalierbarkeit', 'Wartbarkeit', 'Technische Prinzipien und Definitionen', 'Sicherheitsdefekte', 'Explizit nicht beauftragt', 'Du darfst auch frühere Architekturannahmen (Architekt-Schritt) kritisieren', 'Grüne Tests sind kein Korrektheitsbeweis', KEINE_BEFUNDE_SATZ]) {
    if (!block.includes(teil)) b.push(`(b) Policy ohne ${JSON.stringify(teil)}`)
  }
  const aufrufe = server.split('baueReviewPolicyBlock(').length - 1
  if (aufrufe !== 1) b.push(`(b) baueReviewPolicyBlock( ${aufrufe}-mal im Server (erwartet 1)`)
  return b
}

/**
 * (g) und (f, Server-Teil) prüfen den Quelltext des Servers.
 * @param server - Quelltext
 * @returns Befunde
 */
function pruefeServerQuelltext(server) {
  const b = []
  const starte = server.split('starteWorkflowSchritt(').length - 1
  if (starte !== 6) b.push(`(g) starteWorkflowSchritt( ${starte}-mal im Server (erwartet 6)`)
  if (!server.includes("import { baueJarvisOrte, waehleOffeneArbeitsordner } from './leitstand/jarvis-orte.mjs'")) b.push('(f) baueJarvisOrte nicht aus scripts/leitstand/jarvis-orte.mjs importiert')
  const aufrufe = server.split(', verlaufsfenster, baueJarvisOrte(repoWurzel, offeneAblaufOrte()))').length - 1
  if (aufrufe !== 2) b.push(`(f) der Server baut die Ortsangaben ${aufrufe}-mal aus dem Projektpfad (erwartet 2: Chat und Zusammenfassung)`)
  for (const name of ['cdZeile', 'ortZeile(']) if (server.includes(name)) b.push(`(f) der Server nutzt ${name} selbst (eine Quelle: jarvis-orte.mjs)`)
  return b
}

// (b0) Policy-Text an Version gekoppelt, eine Stelle im Server
const SERVER = readFileSync('scripts/leitstand-server.mjs', 'utf8')
{
  const vor = befunde.length
  befunde.push(...pruefePolicy(baueReviewPolicyBlock(), REVIEW_POLICY_VERSION, SERVER))
  if (befunde.length === vor) console.log('✓ (b0) Policy: Inhalt vollständig, Text an die Version gekoppelt, eine Stelle im Server.')
}

// (c) Schema v2 und alte Laufakte
const SCHEMA = JSON.parse(readFileSync('schemas/ergebnis-code-reviewer.schema.json', 'utf8'))
{
  const vor = befunde.length
  befunde.push(...pruefeSchemaV2(SCHEMA))
  const altDaten = JSON.parse(readFileSync('schemas/examples/kontrollzustand-laufakte-vollstaendig.valid.json', 'utf8'))
  if ('review' in altDaten) befunde.push('(c) Beispiel-Laufakte trägt schon review — kein Altfall')
  else if (validiereLaufakteDaten(altDaten).length > 0) befunde.push(`(c) alte Laufakte ohne review ungültig: ${validiereLaufakteDaten(altDaten).join('; ')}`)
  if (validiereLaufakteDaten({ ...altDaten, review: { policy_version: REVIEW_POLICY_VERSION } }).length > 0) befunde.push('(c) Laufakte mit review ungültig')
  if (befunde.length === vor) console.log('✓ (c) Schema v2: neue Felder in required und nullable, KRITISCH, kein geprueft_stand im Modellschema; alte Laufakte gültig.')
}

// (f) Jarvis
{
  const vor = befunde.length
  const ortsZeile = ortZeile(String.raw`C:\Projekte\mein projekt`)
  if (ortsZeile !== String.raw`Set-Location -LiteralPath 'C:\Projekte\mein projekt' -ErrorAction Stop`) befunde.push(`(f) ortZeile quotet den Pfad nicht wie erwartet: ${ortsZeile}`)
  befunde.push(...pruefeJarvis(baueJarvisAuftragstext('Wie sichere ich?', [], { block: { kopf: BLOCK_KOPF, ortZeile: ortsZeile, fuss: BLOCK_FUSS } }), ortsZeile))
  if (befunde.length === vor) console.log('✓ (f) Jarvis: Regel „direkt ausführbar“ vollständig, Blockform mit eingesetzter Ortszeile, „Deine Schritte“ (Server-Teil in (g)).')
}

// (g) Quelltext (mit dem Server-Teil von (f))
{
  const vor = befunde.length
  befunde.push(...pruefeServerQuelltext(SERVER))
  if (befunde.length === vor) console.log('✓ (g) starteWorkflowSchritt( genau 6-mal im Server; Ortsangaben aus baueJarvisOrte an beiden Jarvis-Aufrufen, kein eigenes cdZeile/ortZeile.')
}

// (h) Rot-Selbsttest
{
  const vor = befunde.length
  const rot = [
    ['Spec verändert', pruefeSpec(SPEC_TEXT.replace('## 4. Explizit nicht beauftragt', '## 4. Nicht beauftragt'))],
    ['Spec ohne Kopf', pruefeSpec(SPEC_TEXT.slice(SPEC_TEXT.indexOf('<!-- SPEC-ANFANG')))],
    ['Codex mit Beobachtung', pruefeReviewAuftrag(`x\n\n# Projektkarte\nk\n\nBeobachtung des Ausführungslaufs: y\n\n${baueReviewPolicyBlock()}`, 'codex')],
    ['Policy doppelt', pruefeReviewAuftrag(`# Projektkarte\n${baueReviewPolicyBlock()}\n${baueReviewPolicyBlock()}`, 'codex')],
    ['Policy vor der Karte', pruefeReviewAuftrag(`${baueReviewPolicyBlock()}\n# Projektkarte\n`, 'codex')],
    ['Claude ohne Beobachtung', pruefeReviewAuftrag(`# Projektkarte\n${baueReviewPolicyBlock()}`, 'claude-code')],
    ['Schema: Feld nicht in required', pruefeSchemaV2({ ...SCHEMA, properties: { ...SCHEMA.properties, befunde: { ...SCHEMA.properties.befunde, items: { ...SCHEMA.properties.befunde.items, required: ['schwere'] } } } })],
    ['Schema: nicht nullable', pruefeSchemaV2(JSON.parse(JSON.stringify(SCHEMA).replace('"type":["string","null"],"minLength":1,"description":"v2: Befund-ID', '"type":"string","minLength":1,"description":"v2: Befund-ID')))],
    ['Jarvis ohne „Deine Schritte“', pruefeJarvis(baueJarvisAuftragstext('x', [], { block: { kopf: BLOCK_KOPF, ortZeile: 'o', fuss: BLOCK_FUSS } }).replace(REGEL_DEINE_SCHRITTE[0], ''), 'o')],
    ['Jarvis mit Platzhalter statt Pfad', pruefeJarvis(baueJarvisAuftragstext('x'), ortZeile('C:\\p'))],
    ['Jarvis mit cd statt Blockform', pruefeJarvis(baueJarvisAuftragstext('x', [], { block: { kopf: 'cd', ortZeile: "cd 'C:\\p'", fuss: '' } }), ortZeile('C:\\p'))],
    ['Policy-Text ohne neue Version', pruefePolicy(`${baueReviewPolicyBlock()} `, REVIEW_POLICY_VERSION, SERVER)],
    ['Policy zweimal im Server', pruefePolicy(baueReviewPolicyBlock(), REVIEW_POLICY_VERSION, `${SERVER}\nbaueReviewPolicyBlock()`)],
    ['starteWorkflowSchritt( siebenmal', pruefeServerQuelltext(`${SERVER}\nstarteWorkflowSchritt(`)],
    ['Ort-Optionen nur einmal', pruefeServerQuelltext(SERVER.replace(', verlaufsfenster, baueJarvisOrte(repoWurzel, offeneAblaufOrte()))', ', verlaufsfenster, {})'))],
    ['Server baut die Ortszeile selbst', pruefeServerQuelltext(`${SERVER}\nortZeile(repoWurzel)`)],
  ]
  for (const [name, ergebnis] of rot) if (ergebnis.length === 0) befunde.push(`(h) Rotfall '${name}' wird nicht erkannt`)
  if (befunde.length === vor) console.log(`✓ (h) Rot-Selbsttest: ${rot.length} verfälschte Eingänge erkannt.`)
}

// (b), (c2), (e) über den echten HTTP-Pfad
const basis = mkdtempSync(join(tmpdir(), 'b2a3-review-'))
try {
  const REPO_CLAUDE = readFileSync('CLAUDE.md', 'utf8')
  const REPO_CHECKLISTE = readFileSync('.claude/agents/code-reviewer.md', 'utf8')
  /**
   * Legt ein Wegwerf-Git-Repo an.
   * @param name - Ordnername
   * @param mitArchitektur - ARCHITECTURE.md anlegen (ohne → Lücke in der Karte)
   * @returns absoluter Pfad
   */
  function legeRepoAn(name, mitArchitektur) {
    const wurzel = join(basis, name)
    mkdirSync(join(wurzel, 'docs', 'projekt', 'kontext'), { recursive: true })
    mkdirSync(join(wurzel, '.claude', 'agents'), { recursive: true })
    for (const argumente of [['init', '--quiet'], ['config', 'user.email', 'gate@example.invalid'], ['config', 'user.name', 'Gate'], ['config', 'core.autocrlf', 'false'], ['checkout', '--quiet', '-b', 'gate']]) {
      fuehreGitSync(argumente, { cwd: wurzel, encoding: 'utf8' })
    }
    writeFileSync(join(wurzel, 'CLAUDE.md'), REPO_CLAUDE)
    writeFileSync(join(wurzel, 'docs', 'projekt', 'kontext', 'beschreibung.md'), 'Gate-Projekt: ein Haushaltsbuch.\n')
    writeFileSync(join(wurzel, '.claude', 'agents', 'code-reviewer.md'), REPO_CHECKLISTE)
    if (mitArchitektur) writeFileSync(join(wurzel, 'ARCHITECTURE.md'), readFileSync('ARCHITECTURE.md', 'utf8'))
    fuehreGitSync(['add', '.'], { cwd: wurzel, encoding: 'utf8' })
    fuehreGitSync(['commit', '--quiet', '-m', 'init'], { cwd: wurzel, encoding: 'utf8' })
    return wurzel
  }

  const basisVerzeichnis = join(basis, 'kontrollzustand')
  const vorlageRoh = ladeStartvorlage('startvorlagen/beispielprojekt.json')
  const codex = { codex: { startziel: [String.raw`C:\b2a3-dummy\codex.exe`], versionDeklariert: 'codex-cli-fixture', sandbox: 'read-only' } }
  const startvorlagePfad = join(basis, 'startvorlage.json')
  writeFileSync(startvorlagePfad, JSON.stringify({ ...vorlageRoh, worker: codex }))
  const profilReferenz = leiteProfilReferenzAb(ladeStartvorlage(startvorlagePfad))
  const ladeOptionen = { basisVerzeichnis, schreiber: () => {} }

  /**
   * Attrappe für fuehreAufgabeDurch: merkt sich die Eingaben je Rolle und legt eine Laufakte an. Der Review liefert
   * `review.ergebnis` (Objekt) oder scheitert (`review.fehlschlag`: 'mitOrdner' = Lauf mit Checkpoint, 'geheilt' = vor
   * dem ersten Checkpoint, 'verweigert' = Lauf VERWEIGERT); `review.spiegeln` (Standard true) übernimmt eingaben.review in die Laufakte wie die Gateways.
   * @param review - Verhalten des Review-Laufs
   * @returns { fn, gesehen }
   */
  function baueAttrappe(review) {
    const gesehen = new Map()
    const fn = async (laufId, _profil, eingaben) => {
      gesehen.set(eingaben.rolle, eingaben)
      if (eingaben.rolle === 'code-reviewer' && review.fehlschlag !== undefined) {
        if (review.fehlschlag !== 'geheilt') mkdirSync(join(basisVerzeichnis, laufId), { recursive: true })
        if (review.fehlschlag === 'verweigert') {
          return { ok: true, klassifikation: { ergebnis: 'VERWEIGERT', non_execution_kind: 'Gate: Schreibversuch abgelehnt', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }
        }
        return { ok: false, grund: 'Gate: Werkzeugausfall (Zeitgrenze)' }
      }
      const rohstromPfad = join(basis, `rohstrom-${laufId}.json`)
      const ergebnis = eingaben.rolle === 'code-reviewer' ? JSON.stringify(review.ergebnis) : 'Fertig.'
      writeFileSync(rohstromPfad, JSON.stringify({ stdout: JSON.stringify({ type: 'result', result: ergebnis }) }))
      const daten = {
        worker: 'claude-code',
        rohstrom_referenz: { pfad: rohstromPfad, inhalts_hash: 'x' },
        ...(eingaben.rolle === 'ausfuehrung' ? { beobachtung: { init_tools: [], init_agents: [], init_skills: [], init_mcp_server: [], skill_aufrufe: [], subagent_aufrufe: [], mcp_aufrufe: [] } } : {}),
        ...(eingaben.projektkarte !== undefined ? { projektkarte: eingaben.projektkarte } : {}),
        ...(eingaben.review !== undefined && review.spiegeln !== false ? { review: eingaben.review } : {}),
      }
      registriereKernArtefakt(`laufakte-${laufId}`, profilReferenz, { erzeuger: 'kern', schritt: 'gate' }, daten, [], ladeOptionen)
      return { ok: true, klassifikation: { ergebnis: 'ERFOLGREICH', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }
    }
    return { fn, gesehen }
  }

  /**
   * Schritt eines Wegwerf-Workflows.
   * @param id - schritt_id
   * @param rolle - Rolle
   * @param werkzeugsatz - Werkzeugsatz
   * @param worker - Worker
   * @param outputSchema - Schema oder null
   * @param nachfolger - Nachfolger oder null
   * @param freigabe - Freigabestufe
   * @returns Schritt
   */
  const schritt = (id, rolle, werkzeugsatz, worker, outputSchema, nachfolger, freigabe) => ({
    schritt_id: id,
    rolle,
    werkzeugsatz,
    worker,
    modell: worker === 'codex' ? 'gpt-6-astra' : 'claude-sonnet-5',
    eingaben: [],
    output_schema: outputSchema,
    freigabe,
    ...(freigabe === 'ZWINGEND' ? { freigabe_erteilt: true } : {}),
    risiko: 'Gate-Fixture.',
    zeitgrenze_ms: 600000,
    nachfolger,
    status: 'OFFEN',
    lauf_id: null,
  })

  /**
   * Ablauf Bau → Review über den Server; wartet, bis der Workflow nicht mehr läuft, und liest Workflow und Abnahme.
   * @param repoWurzel - Wegwerf-Repo
   * @param reviewWorker - 'codex' (mit Ausgabeschema) oder 'claude-code' (ohne, Regel 4b)
   * @param review - Verhalten des Review-Laufs (siehe baueAttrappe)
   * @returns { gesehen, workflow, abnahme, abnahmeVersion }
   */
  async function fuehreDurch(repoWurzel, reviewWorker, review) {
    const attrappe = baueAttrappe(review)
    const server = createServer(erzeugeRequestHandler({ basisVerzeichnis, repoWurzel, installWurzel: process.cwd(), startvorlagePfad, fuehreAufgabeDurchFn: attrappe.fn }))
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const basisUrl = `http://127.0.0.1:${server.address().port}`
    try {
      const auftrag = await fetch(`${basisUrl}/api/auftraege`, { method: 'POST', body: JSON.stringify({ titel: 'B2a-3-Gate', auftragstext: 'Füge einen CSV-Export hinzu.' }) })
      const { auftragId } = await auftrag.json()
      const workflowId = `wf-b2a3-${randomUUID()}`
      const schritte = [
        schritt('schritt-1-ausfuehrung', 'ausfuehrung', 'schreibend', 'claude-code', null, 'schritt-2-review', 'ZWINGEND'),
        schritt('schritt-2-review', 'code-reviewer', 'lesend', reviewWorker, reviewWorker === 'codex' ? 'ergebnis-code-reviewer' : null, null, 'AUTOMATISCH'),
      ]
      registriereWorkflow(
        { workflow_schema: 'v0', workflow_id: workflowId, auftrag_id: auftragId, version: 1, ziel: 'B2a-3-Gate-Ziel.', status: 'OFFEN', aktiver_schritt_id: schritte[0].schritt_id, grenzen: { max_schritte: 6, max_replans: 1 }, schritte },
        profilReferenz,
        ladeOptionen
      )
      const start = await fetch(`${basisUrl}/api/workflows/${workflowId}/starten`, { method: 'POST' })
      if (start.status !== 200 && start.status !== 202) throw new Error(`starten: ${start.status} ${await start.text()}`)
      const ende = Date.now() + 20000
      while (Date.now() < ende && !attrappe.gesehen.has('code-reviewer')) await new Promise((r) => setTimeout(r, 50))
      let workflow = null
      while (Date.now() < ende) {
        workflow = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)?.daten ?? null
        if (workflow !== null && workflow.status !== 'LAEUFT' && workflow.schritte[1].status !== 'LAEUFT') break
        await new Promise((r) => setTimeout(r, 50))
      }
      const abnahme = await (await fetch(`${basisUrl}/api/workflows/${workflowId}/abnahme`)).json()
      const abnahmeVersion = ladeArtefaktVersion(`entscheidung-workflow-${workflowId}-abnahme`, undefined, ladeOptionen)
      return { gesehen: attrappe.gesehen, workflow, abnahme, abnahmeVersion }
    } finally {
      await new Promise((r) => server.close(r))
    }
  }

  const repoMit = legeRepoAn('projekt-mit', true)
  const repoOhne = legeRepoAn('projekt-ohne', false)
  const BEFUND = { id: 'B1', dimension: 'bugs', schwere: 'HOCH', fundstelle: 'src/a.ts:3', zusammenfassung: 'Grenzfall', beleg: 'Test x', korrekturrichtung: 'Grenze prüfen', evidenz: 'confirmed' }
  const ergebnis = (felder) => ({ urteil: 'BEREIT', befunde: [], empfehlung: `Checkliste: alles erfüllt. ${KEINE_BEFUNDE_SATZ}.`, ak_urteile: [], ...felder })

  // (b) Codex- und Claude-Review-Auftrag
  {
    const vor = befunde.length
    const codexLauf = await fuehreDurch(repoMit, 'codex', { ergebnis: ergebnis({}) })
    const codexReview = codexLauf.gesehen.get('code-reviewer')
    befunde.push(...pruefeReviewAuftrag(codexReview?.auftragstext ?? '', 'codex'))
    // F45 B2a-3b (Advisor N1): nur policy_version — geprueft_stand/stand_grund prüft check-f45-b2a3b-review-stand.mjs (b).
    if (codexReview?.review?.policy_version !== REVIEW_POLICY_VERSION) befunde.push(`(b) codex: eingaben.review ${JSON.stringify(codexReview?.review)}`)
    if ((codexLauf.gesehen.get('ausfuehrung')?.auftragstext ?? '').includes('## Review-Policy') || codexLauf.gesehen.get('ausfuehrung')?.review !== undefined) befunde.push('(b) die Ausführung bekommt die Review-Policy')
    if (codexLauf.workflow?.status !== 'ABGESCHLOSSEN') befunde.push(`(b) Grünfall (BEREIT, Satz vorhanden) endet ${codexLauf.workflow?.status}: ${codexLauf.workflow?.grund}`)
    const claudeLauf = await fuehreDurch(repoMit, 'claude-code', { ergebnis: ergebnis({}) })
    const claudeReview = claudeLauf.gesehen.get('code-reviewer')
    befunde.push(...pruefeReviewAuftrag(claudeReview?.auftragstext ?? '', 'claude-code'))
    // F45 B2a-3b (Advisor N1): nur policy_version — geprueft_stand/stand_grund prüft check-f45-b2a3b-review-stand.mjs (b).
    if (claudeReview?.review?.policy_version !== REVIEW_POLICY_VERSION) befunde.push(`(b) claude-code: eingaben.review ${JSON.stringify(claudeReview?.review)}`)
    if (befunde.length === vor) console.log('✓ (b) Policy genau einmal hinter der Karte im Codex- und im Claude-Review-Auftrag; Codex ohne, Claude mit Beobachtungsblock; review.policy_version in den Eingaben; Ausführung ohne Policy.')
  }

  // (c2) Ergebnis v1 (ohne neue Felder, Laufakte ohne review) über die Abnahme lesbar
  {
    const vor = befunde.length
    const v1 = await fuehreDurch(repoMit, 'codex', { ergebnis: { urteil: 'BEREIT', befunde: [{ schwere: 'MITTEL', fundstelle: 'a.ts', zusammenfassung: 'z', beleg: 'b' }], empfehlung: 'alt', ak_urteile: [] }, spiegeln: false })
    const u = v1.abnahme?.urteil
    if (u?.status !== 'ok' || u.policy_version !== null || u.vertrag_verstoesse.length > 0 || u.vertrag_hinweise.length > 0 || u.befunde?.[0]?.schwere !== 'MITTEL') befunde.push(`(c) Ergebnis v1 nicht wie erwartet lesbar: ${JSON.stringify(u)}`)
    if (v1.workflow?.status !== 'ABGESCHLOSSEN') befunde.push(`(c) Ergebnis v1 hält an: ${v1.workflow?.grund}`)
    if (befunde.length === vor) console.log('✓ (c2) Ergebnis v1 ohne review in der Laufakte: lesbar, kein Vertragsbefund, kein Halt.')
  }

  // (e) Fehlerfälle
  {
    const vor = befunde.length
    const fehl = await fuehreDurch(repoMit, 'codex', { fehlschlag: 'mitOrdner' })
    // qa 1 / Code-Review 2: der Grund nennt die Ursache, nicht nur „endete FEHLGESCHLAGEN“.
    if (fehl.workflow?.status !== 'KLAERUNG_ERFORDERLICH' || fehl.abnahme?.urteil?.status !== 'fehlgeschlagen' || !String(fehl.abnahme.urteil.grund ?? '').includes('— Ursache: ') || !String(fehl.abnahme.urteil.grund).includes('Gate: Werkzeugausfall')) {
      befunde.push(`(e1) Werkzeugausfall: ${fehl.workflow?.status} / ${JSON.stringify(fehl.abnahme?.urteil)}`)
    }
    const verweigert = await fuehreDurch(repoMit, 'codex', { fehlschlag: 'verweigert' })
    if (verweigert.abnahme?.urteil?.status !== 'fehlgeschlagen' || verweigert.abnahme.urteil.schrittStatus !== 'VERWEIGERT' || !String(verweigert.abnahme.urteil.grund ?? '').includes('Ursache: verweigert')) {
      befunde.push(`(e1b) Review VERWEIGERT: ${verweigert.workflow?.status} / ${JSON.stringify(verweigert.abnahme?.urteil)}`)
    }
    const geheilt = await fuehreDurch(repoMit, 'codex', { fehlschlag: 'geheilt' })
    if (geheilt.workflow?.status !== 'KLAERUNG_ERFORDERLICH' || geheilt.abnahme?.urteil?.status !== 'nicht_gelaufen_klaerung' || typeof geheilt.abnahme.urteil.grund !== 'string') {
      befunde.push(`(e2) Ausfall vor dem ersten Checkpoint: ${geheilt.workflow?.status} / ${JSON.stringify(geheilt.abnahme?.urteil)}`)
    }
    const ohneSatz = await fuehreDurch(repoMit, 'codex', { ergebnis: ergebnis({ empfehlung: 'Checkliste: alles erfüllt. Fehlerfrei.' }) })
    if (ohneSatz.workflow?.status !== 'KLAERUNG_ERFORDERLICH' || !String(ohneSatz.workflow?.grund ?? '').includes('Review-Vertrag verletzt')) befunde.push(`(e3) leere Befunde ohne Satz halten nicht: ${ohneSatz.workflow?.status} ${ohneSatz.workflow?.grund}`)
    if ((ohneSatz.abnahme?.urteil?.vertrag_verstoesse ?? []).length !== 1) befunde.push(`(e3) Abnahme ohne Vertragsverstoß: ${JSON.stringify(ohneSatz.abnahme?.urteil)}`)
    if (ohneSatz.abnahmeVersion !== null) befunde.push('(e3) Regel 1k löste eine automatische Anpassung aus')
    const gegenprobe = await fuehreDurch(repoMit, 'codex', { ergebnis: ergebnis({ empfehlung: 'Fehlerfrei.' }), spiegeln: false })
    if (gegenprobe.workflow?.status !== 'ABGESCHLOSSEN') befunde.push(`(e4) Gegenprobe ohne review in der Laufakte hält an: ${gegenprobe.workflow?.grund}`)
    const hinweis = await fuehreDurch(repoOhne, 'codex', { ergebnis: ergebnis({ befunde: [{ ...BEFUND, korrekturrichtung: null }], empfehlung: 'Korrektur empfohlen.' }) })
    if (hinweis.workflow?.status !== 'ABGESCHLOSSEN') befunde.push(`(e5) fehlender Pflichtwert hält an: ${hinweis.workflow?.grund}`)
    if (!(hinweis.abnahme?.urteil?.vertrag_hinweise ?? []).some((h) => h.includes("'korrekturrichtung' fehlt"))) befunde.push(`(e5) Hinweis fehlt: ${JSON.stringify(hinweis.abnahme?.urteil?.vertrag_hinweise)}`)
    if (!(hinweis.abnahme?.urteil?.kontext_luecken ?? []).includes('ARCHITECTURE.md: fehlt')) befunde.push(`(e6) Kontextlücke fehlt: ${JSON.stringify(hinweis.abnahme?.urteil?.kontext_luecken)}`)
    if (befunde.length === vor) {
      console.log('✓ (e) Fehlerfälle: Werkzeugausfall und VERWEIGERT → „fehlgeschlagen“ mit Ursache; Ausfall vor dem Checkpoint → „nicht gelaufen“ mit Grund; leere Befunde ohne Satz → Halt (Regel 1k), keine Automatik; Gegenprobe ohne review → kein Halt; fehlender Pflichtwert → Hinweis ohne Halt; Kartenlücke → kontext_luecken.')
    }
  }
} finally {
  raeumeVerzeichnis(basis)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const befund of befunde) console.error(`  - ${befund}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
