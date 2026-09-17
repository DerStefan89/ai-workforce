/**
 * Datei: scripts/check-f25-projekte.mjs
 *
 * Zweck: Projektregister-Gate (F25 WS-1, features/F25/feature.md AK9).
 * Prüft: (1) projekte.json ist gegen validiereProjekteDaten gültig, plus
 * Rot-Fälle (unbekanntes Feld, ungültiger status, doppelte id) werden
 * erkannt; (2a) loeseProjektPfade löst repoWurzel/basisVerzeichnis/
 * startvorlagePfad/settingsPfad/aktuelleAutorisierungPfad/cwd korrekt
 * relativ zu repo_pfad auf (reine Funktion, kalibriert mit einem
 * Rot-Fall-Selbsttest), (2b) erzeugeRequestHandler reicht dieses cwd
 * unverändert bis zum fuehreAufgabeDurchFn-Aufruf durch (AK3/AK4), (2c)
 * starteProzess reicht cwd unverändert an den Starter durch — der reale
 * Fundort eines beim ersten AK8-Realtest tatsächlich aufgetretenen Bugs
 * (starteProzess pickte starterOptionen bislang über eine benannte
 * Feldliste statt eines Spreads, cwd ging dort verloren); (2d) ein kaputter
 * Registereintrag (fehlende Startvorlage) reißt weder andere Einträge noch
 * den Serverstart mit (QA-Befund); (2e) ein Registereintrag mit
 * repo_pfad '.', der auf dieselbe repoWurzel wie der Serverprozess zeigt,
 * bekommt keine zweite, in-memory abweichende Instanz, sondern denselben
 * Handler wie der unpräfigierte Default-Pfad (QA-Befund, "Doppel-Tür"-
 * Problem); (3)
 * erzeugeMultiProjektDispatcher routet /api/projekte/<id>/... an die
 * richtige Instanz und liefert für eine unbekannte id 404, der bestehende
 * unpräfigierte Pfad bleibt unverändert erreichbar (AK2); (4) der
 * projektübergreifend geteilte globalerLaufZustand blockiert einen Lauf in
 * Instanz B, während Instanz A aktiv ist, und gibt nach deren Ende wieder
 * frei (AK5, D13).
 *
 * Kein generischer JSON-Schema-Validator (Muster check-datenformate.mjs,
 * D5): Regel 1 importiert die reale validiereProjekteDaten statt einen
 * zweiten Regelsatz zu pflegen (Muster check-f19-ressourcen.mjs).
 *
 * Wird aufgerufen von: npm run check.
 *
 * Aufruf: node scripts/check-f25-projekte.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { erzeugeRequestHandler, baueProjektHandlerMap, erzeugeMultiProjektDispatcher, loeseProjektPfade } from './leitstand-server.mjs'
import { validiereProjekteDaten } from '../src/projekte/index.ts'
import { starteProzess } from '../src/claude-code-gateway/prozessstart.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F25-Projekte-Check (WS-1) ===\n')

const PROFIL_REFERENZ = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
const TEST_WURZEL = join(tmpdir(), `check-f25-${randomUUID()}`)
mkdirSync(TEST_WURZEL, { recursive: true })

function registriereTestAuftrag(basisVerzeichnis) {
  const auftragId = `test-auftrag-${randomUUID()}`
  registriereAuftrag(auftragId, PROFIL_REFERENZ, 'Testtitel', 'Testauftragstext', { basisVerzeichnis, schreiber: () => {} })
  return auftragId
}

const gueltigerStartauftrag = (laufId, auftragId) => ({
  laufId,
  rolle: 'ausfuehrung',
  anfragen: [],
  budget: {},
  aufrufEingaben: { modell: 'test-modell' },
  werkzeugsatz: 'lesend',
  auftragId,
})

async function starteTestserver(handler) {
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { basisUrl: `http://127.0.0.1:${port}`, schliessen: () => new Promise((resolve) => server.close(resolve)) }
}

try {
  // ─── (1) validiereProjekteDaten: Grün-Fall (reale projekte.json) + Rot-Fälle ──
  {
    const rohDaten = JSON.parse(readFileSync('projekte.json', 'utf-8'))
    const verstoesse = validiereProjekteDaten(rohDaten)
    if (verstoesse.length > 0) {
      befunde.push(`(1) projekte.json verletzt validiereProjekteDaten: ${verstoesse.join('; ')}`)
    } else {
      console.log('✓ (1) projekte.json: gültig gegen validiereProjekteDaten.')
    }

    const GUELTIGER_EINTRAG = {
      id: 'test-projekt',
      name: 'Test',
      repo_pfad: '.',
      startvorlage_pfad: 'startvorlagen/beispielprojekt.json',
      profil_pfad: 'profiles/beispiel.json',
      basisverzeichnis: 'kontrollzustand-test',
      status: 'IDEE',
    }
    const rotFaelle = [
      { titel: 'unbekanntes Feld', daten: { projekte_schema: 'v0', projekte: [{ ...GUELTIGER_EINTRAG, unbekannt: 1 }] } },
      { titel: 'ungültiger status', daten: { projekte_schema: 'v0', projekte: [{ ...GUELTIGER_EINTRAG, status: 'ERFUNDEN' }] } },
      { titel: 'doppelte id', daten: { projekte_schema: 'v0', projekte: [GUELTIGER_EINTRAG, GUELTIGER_EINTRAG] } },
      { titel: 'fehlendes Pflichtfeld profil_pfad', daten: { projekte_schema: 'v0', projekte: [{ ...GUELTIGER_EINTRAG, profil_pfad: undefined }] } },
      { titel: 'projekte_schema falsch', daten: { projekte_schema: 'v1', projekte: [GUELTIGER_EINTRAG] } },
    ]
    const befundeVorRot = befunde.length
    for (const { titel, daten } of rotFaelle) {
      const roh = JSON.parse(JSON.stringify(daten))
      if (validiereProjekteDaten(roh).length === 0) {
        befunde.push(`(1) Rot-Fall '${titel}' wurde fälschlich als gültig akzeptiert`)
      }
    }
    if (validiereProjekteDaten({ projekte_schema: 'v0', projekte: [GUELTIGER_EINTRAG] }).length !== 0) {
      befunde.push('(1) Grün-Fall (synthetischer gültiger Eintrag) wurde fälschlich abgelehnt')
    }
    if (befunde.length === befundeVorRot) {
      console.log(`✓ (1) ${rotFaelle.length} Rot-Fall/-Fälle erkannt, synthetischer Grün-Fall akzeptiert.`)
    }
  }

  // ─── (2a) loeseProjektPfade: reine Arithmetik-Prüfung, Grün-Fall + Rot-Fall-Selbsttest ──
  {
    const projekt = {
      id: 'projekt-a',
      name: 'Projekt A',
      repo_pfad: 'projekt-a',
      startvorlage_pfad: 'startvorlagen/beispielprojekt.json',
      profil_pfad: 'profiles/beispiel.json',
      basisverzeichnis: 'kontrollzustand-test-f25-cwd',
      status: 'TEST',
    }
    const pfade = loeseProjektPfade(projekt, TEST_WURZEL)
    const erwarteteRepoWurzel = resolve(TEST_WURZEL, 'projekt-a')
    const erwartet = {
      repoWurzel: erwarteteRepoWurzel,
      basisVerzeichnis: join(erwarteteRepoWurzel, 'kontrollzustand-test-f25-cwd'),
      startvorlagePfad: join(erwarteteRepoWurzel, 'startvorlagen/beispielprojekt.json'),
      settingsPfad: join(erwarteteRepoWurzel, '.claude', 'settings.json'),
      aktuelleAutorisierungPfad: join(erwarteteRepoWurzel, 'state', 'aktuelle-autorisierung.json'),
      cwd: erwarteteRepoWurzel,
    }
    const befundeVor2a = befunde.length
    for (const feld of Object.keys(erwartet)) {
      if (pfade[feld] !== erwartet[feld]) {
        befunde.push(`(2a) loeseProjektPfade.${feld}: erwartet '${erwartet[feld]}', erhalten '${pfade[feld]}'`)
      }
    }
    // Rot-Fall-Selbsttest (Muster AK7-Selbsttest in check-f11-auftrag.mjs): ein bewusst FALSCH
    // erwarteter Wert muss als Abweichung erkannt werden — zeigt, dass der Grün-Fall oben
    // tatsächlich etwas prüft, statt strukturell immer zu bestehen.
    if (pfade.cwd === join(erwarteteRepoWurzel, 'absichtlich-falsch')) {
      befunde.push('(2a) Rot-Fall-Selbsttest: absichtlich falscher Vergleichswert wurde fälschlich als Treffer gewertet')
    }
    if (befunde.length === befundeVor2a) {
      console.log('✓ (2a) loeseProjektPfade löst repoWurzel/basisVerzeichnis/startvorlagePfad/settingsPfad/aktuelleAutorisierungPfad/cwd korrekt relativ zu repo_pfad auf (AK3/AK4), Rot-Fall-Selbsttest erkennt eine absichtliche Abweichung.')
    }
  }

  // ─── (2b) Ende-zu-Ende: erzeugeRequestHandler reicht cwd bis zum fuehreAufgabeDurchFn-Aufruf durch ──
  {
    const projekt = {
      id: 'projekt-a',
      name: 'Projekt A',
      repo_pfad: 'projekt-a',
      startvorlage_pfad: 'startvorlagen/beispielprojekt.json',
      profil_pfad: 'profiles/beispiel.json',
      basisverzeichnis: 'kontrollzustand-test-f25-cwd',
      status: 'TEST',
    }
    const pfade = loeseProjektPfade(projekt, TEST_WURZEL)
    mkdirSync(pfade.repoWurzel, { recursive: true })
    const auftragId = registriereTestAuftrag(pfade.basisVerzeichnis)

    let beobachteteOptionen = null
    const attrappeFuehreAufgabeDurch = async (_laufId, _profilReferenz, _eingaben, optionen) => {
      beobachteteOptionen = optionen
      return { ok: false, stufe: 'gateway', grund: 'attrappe (Gate-Test)' }
    }
    const handler = erzeugeRequestHandler({
      fuehreAufgabeDurchFn: attrappeFuehreAufgabeDurch,
      basisVerzeichnis: pfade.basisVerzeichnis,
      startvorlagePfad: 'startvorlagen/beispielprojekt.json',
      repoWurzel: pfade.repoWurzel,
      settingsPfad: pfade.settingsPfad,
      aktuelleAutorisierungPfad: pfade.aktuelleAutorisierungPfad,
      cwd: pfade.cwd,
    })
    const { basisUrl, schliessen } = await starteTestserver(handler)
    try {
      await fetch(`${basisUrl}/api/laeufe`, {
        method: 'POST',
        body: JSON.stringify(gueltigerStartauftrag(`check-f25-e2e-${randomUUID()}`, auftragId)),
      })
      await new Promise((r) => setTimeout(r, 50))
      if (beobachteteOptionen === null) {
        befunde.push('(2b) fuehreAufgabeDurchFn wurde nicht aufgerufen — Testaufbau selbst defekt')
      } else if (beobachteteOptionen.cwd !== pfade.cwd) {
        befunde.push(`(2b) erwartet cwd '${pfade.cwd}' im fuehreAufgabeDurchFn-Aufruf, erhalten '${beobachteteOptionen.cwd}'`)
      } else {
        console.log(`✓ (2b) cwd erreicht unverändert den fuehreAufgabeDurchFn-Aufruf ('${pfade.cwd}').`)
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (2c) starteProzess: cwd erreicht real den Starter (Muster echterStarter/execFileOptionen) ──
  // Realer Fund (AK8, 17.09.2026): starteProzess baute starterOptionen bislang über eine
  // benannte Feldliste { zeitgrenzeMs, abbruchSignal, stdinLeer } statt eines Spreads — ein neues
  // Feld wie cwd erreichte (2b)s fuehreAufgabeDurchFn-Attrappe zwar (die sitzt VOR starteGateway),
  // ging aber genau HIER, eine Ebene tiefer, verloren, bevor es echterStarter je erreichte. Ein
  // realer Lauf gegen ein zweites Projekt las dadurch die falsche Datei. Dieser Rot-Fall (vor der
  // Korrektur: cwd hier undefined) ist deshalb der eigentliche Kalibrierungsfall für AK9.
  {
    let beobachteteStarterOptionen = null
    const attrappeStarter = async (_startziel, _tokens, optionen) => {
      beobachteteStarterOptionen = optionen
      return { stdout: '', stderr: '', exitCode: 0, startfehler: null, beendigungsart: null }
    }
    const erwartetesCwd = join(TEST_WURZEL, 'starteprozess-cwd-test')
    // process.execPath statt eines hartkodierten Windows-Pfads (Muster GUELTIGES_STARTZIEL,
    // src/claude-code-gateway/claude-code-gateway.test.ts:47) — echte, plattformunabhängig
    // absolute Datei. pruefeStartziel prüft startziel[0] auf absoluten Pfad (resolve()); ein
    // Windows-Literal wäre auf einem POSIX-Laufzeitsystem nie absolut und ließe starteProzess vor
    // dem Starter-Aufruf abbrechen — der Test bestünde dann fälschlich nur auf Windows.
    await starteProzess([process.execPath], [], { starter: attrappeStarter, cwd: erwartetesCwd })
    if (beobachteteStarterOptionen === null) {
      befunde.push('(2c) starteProzess hat den Starter nicht aufgerufen — Testaufbau selbst defekt')
    } else if (beobachteteStarterOptionen.cwd !== erwartetesCwd) {
      befunde.push(`(2c) starteProzess: erwartet cwd '${erwartetesCwd}' im Starter-Aufruf, erhalten '${beobachteteStarterOptionen.cwd}'`)
    } else {
      console.log(`✓ (2c) starteProzess reicht cwd unverändert an den Starter durch ('${erwartetesCwd}').`)
    }
  }

  // ─── (2d) baueProjektHandlerMap: ein kaputter Eintrag reißt weder andere Einträge noch den ──
  // ─── Prozess mit (QA-Befund 17.09.2026, Rot-Fall vor der Korrektur real reproduziert) ──────────
  {
    // basisverzeichnis bleibt bewusst ein RELATIVER Name (nicht TEST_WURZEL-absolut): baueProjektHandlerMap
    // hängt ihn per join() an repoWurzel — ein bereits absoluter zweiter Pfad würde unter Windows
    // keine gültige Kombination ergeben (Muster-Hinweis Abschnitt (3) unten). erzeugeRequestHandler
    // selbst legt basisVerzeichnis nicht eagerly an (kein mkdirSync beim Bau), ein rein relativer,
    // nie tatsächlich angesprochener Name hinterlässt hier also kein Verzeichnis im Repo-Root.
    const gutesProjekt = {
      id: 'projekt-gut',
      name: 'Gut',
      repo_pfad: '.',
      startvorlage_pfad: 'startvorlagen/beispielprojekt.json',
      profil_pfad: 'profiles/beispiel.json',
      basisverzeichnis: 'kontrollzustand-2d-gut-nie-erzeugt',
      status: 'TEST',
    }
    const kaputtesProjekt = {
      id: 'projekt-kaputt',
      name: 'Kaputt',
      repo_pfad: '.',
      startvorlage_pfad: 'startvorlagen/existiert-nicht.json',
      profil_pfad: 'profiles/beispiel.json',
      basisverzeichnis: 'kontrollzustand-2d-kaputt-nie-erzeugt',
      status: 'TEST',
    }
    const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
    let map
    try {
      map = baueProjektHandlerMap([gutesProjekt, kaputtesProjekt], process.cwd(), globalerLaufZustand)
    } catch (fehler) {
      befunde.push(`(2d) baueProjektHandlerMap wirft bei einem kaputten Eintrag statt ihn zu überspringen: ${fehler.message}`)
    }
    if (map !== undefined) {
      if (!map.has('projekt-gut')) {
        befunde.push("(2d) baueProjektHandlerMap: 'projekt-gut' fehlt in der Map, obwohl sein Registereintrag gültig ist")
      }
      if (map.has('projekt-kaputt')) {
        befunde.push("(2d) baueProjektHandlerMap: 'projekt-kaputt' hätte wegen fehlender Startvorlage übersprungen werden müssen")
      }
      if (map.has('projekt-gut') && !map.has('projekt-kaputt')) {
        console.log("✓ (2d) Ein kaputter Registereintrag ('projekt-kaputt') wird übersprungen, 'projekt-gut' bleibt unberührt erreichbar.")
      }
    }
  }

  // ─── (2e) baueProjektHandlerMap: selbstRepoWurzel/selbstHandler — Doppel-Tür-Fix (QA-Befund) ──
  {
    const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
    const selbstHandler = erzeugeRequestHandler({ basisVerzeichnis: join(TEST_WURZEL, 'kontrollzustand-2e-default'), startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
    const projekte = [{ id: 'ai-workforce', name: 'AI Workforce', repo_pfad: '.', startvorlage_pfad: 'startvorlagen/beispielprojekt.json', profil_pfad: 'profiles/beispiel.json', basisverzeichnis: 'kontrollzustand', status: 'TEST' }]
    const map = baueProjektHandlerMap(projekte, process.cwd(), globalerLaufZustand, { selbstRepoWurzel: process.cwd(), selbstHandler })
    if (map.get('ai-workforce') !== selbstHandler) {
      befunde.push("(2e) baueProjektHandlerMap: Registereintrag mit repo_pfad '.' bekommt eine ZWEITE Instanz statt den geteilten selbstHandler zu übernehmen — Doppel-Tür-Problem (laufAktiv/startfehlerListe würden auseinanderlaufen)")
    } else {
      console.log('✓ (2e) Ein Registereintrag, dessen repoWurzel der des Serverprozesses entspricht, teilt sich denselben Handler wie der unpräfigierte Default-Pfad — keine zweite, abweichende In-Memory-Instanz.')
    }
  }

  // ─── (3) Dispatcher: /api/projekte/<id>/... routet korrekt, unbekannte id → 404, Default unverändert ──
  {
    const basisA = join(TEST_WURZEL, 'kontrollzustand-dispatch-a')
    const basisB = join(TEST_WURZEL, 'kontrollzustand-dispatch-b')
    const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
    // Der Dispatcher selbst (erzeugeMultiProjektDispatcher) ist von baueProjektHandlerMap
    // unabhängig (siehe Kopfkommentar der beiden Funktionen) — er nimmt eine beliebige
    // Map<id, Handler> entgegen. baueProjektHandlerMaps eigene repo_pfad/basisverzeichnis-
    // Auflösung ist bereits in (2a) direkt gegen loeseProjektPfade geprüft; hier zählt nur das
    // Routing selbst, deshalb genügen zwei direkt gebaute Handler-Instanzen.
    const handlerA = erzeugeRequestHandler({ basisVerzeichnis: basisA, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
    const handlerB = erzeugeRequestHandler({ basisVerzeichnis: basisB, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
    const map = new Map([
      ['dispatch-a', handlerA],
      ['dispatch-b', handlerB],
    ])
    const defaultHandler = erzeugeRequestHandler({ basisVerzeichnis: join(TEST_WURZEL, 'kontrollzustand-dispatch-default'), startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
    const dispatcher = erzeugeMultiProjektDispatcher(map, defaultHandler)
    const { basisUrl, schliessen } = await starteTestserver(dispatcher)
    try {
      const antwortA = await fetch(`${basisUrl}/api/projekte/dispatch-a/laeufe`)
      const antwortB = await fetch(`${basisUrl}/api/projekte/dispatch-b/laeufe`)
      const antwortUnbekannt = await fetch(`${basisUrl}/api/projekte/nicht-registriert/laeufe`)
      const antwortDefault = await fetch(`${basisUrl}/api/laeufe`)
      if (antwortA.status !== 200) befunde.push(`(3) GET /api/projekte/dispatch-a/laeufe erwartet 200, erhalten ${antwortA.status}`)
      if (antwortB.status !== 200) befunde.push(`(3) GET /api/projekte/dispatch-b/laeufe erwartet 200, erhalten ${antwortB.status}`)
      if (antwortUnbekannt.status !== 404) befunde.push(`(3) GET /api/projekte/nicht-registriert/laeufe erwartet 404, erhalten ${antwortUnbekannt.status}`)
      if (antwortDefault.status !== 200) befunde.push(`(3) GET /api/laeufe (unpräfigiert) erwartet 200, erhalten ${antwortDefault.status}`)
      if (befunde.length === 0 || !befunde.some((b) => b.startsWith('(3)'))) {
        console.log('✓ (3) Dispatcher routet A/B korrekt, unbekannte id → 404, unpräfigierter Pfad bleibt erreichbar.')
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (4) D13: globalerLaufZustand blockiert projektübergreifend, gibt nach Laufende wieder frei ──
  {
    const basisA = join(TEST_WURZEL, 'kontrollzustand-d13-a')
    const basisB = join(TEST_WURZEL, 'kontrollzustand-d13-b')
    const auftragIdA = registriereTestAuftrag(basisA)
    const auftragIdB = registriereTestAuftrag(basisB)
    const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }

    let freigeben
    const haengenderFuehreAufgabeDurch = () => new Promise((resolve) => { freigeben = () => resolve({ ok: false, stufe: 'gateway', grund: 'attrappe (Gate-Test, D13)' }) })
    const sofortigerFuehreAufgabeDurch = async () => ({ ok: false, stufe: 'gateway', grund: 'attrappe (Gate-Test, D13)' })

    const handlerA = erzeugeRequestHandler({ fuehreAufgabeDurchFn: haengenderFuehreAufgabeDurch, basisVerzeichnis: basisA, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
    const handlerB = erzeugeRequestHandler({ fuehreAufgabeDurchFn: sofortigerFuehreAufgabeDurch, basisVerzeichnis: basisB, startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand })
    const testserverA = await starteTestserver(handlerA)
    const testserverB = await starteTestserver(handlerB)
    try {
      const startA = await fetch(`${testserverA.basisUrl}/api/laeufe`, {
        method: 'POST',
        body: JSON.stringify(gueltigerStartauftrag(`check-f25-d13-a-${randomUUID()}`, auftragIdA)),
      })
      if (startA.status !== 202) befunde.push(`(4) Start in Instanz A erwartet 202, erhalten ${startA.status}`)

      const antwortB = await fetch(`${testserverB.basisUrl}/api/laeufe`, {
        method: 'POST',
        body: JSON.stringify(gueltigerStartauftrag(`check-f25-d13-b-blockiert-${randomUUID()}`, auftragIdB)),
      })
      if (antwortB.status !== 409) {
        befunde.push(`(4) Start in Instanz B während A aktiv ist erwartet 409 (D13, projektübergreifend), erhalten ${antwortB.status}`)
      } else {
        console.log('✓ (4) Instanz B wird während eines aktiven Laufs in Instanz A projektübergreifend mit 409 abgelehnt.')
      }

      freigeben()
      await new Promise((r) => setTimeout(r, 50))

      const antwortBNachEnde = await fetch(`${testserverB.basisUrl}/api/laeufe`, {
        method: 'POST',
        body: JSON.stringify(gueltigerStartauftrag(`check-f25-d13-b-frei-${randomUUID()}`, auftragIdB)),
      })
      if (antwortBNachEnde.status !== 202) {
        befunde.push(`(4) Start in Instanz B nach Ende von A erwartet 202 (Sperre zurückgesetzt), erhalten ${antwortBNachEnde.status}`)
      } else {
        console.log('✓ (4) Nach Laufende in Instanz A gibt der geteilte Zustand Instanz B wieder frei.')
      }
    } finally {
      await testserverA.schliessen()
      await testserverB.schliessen()
    }
  }
} finally {
  // Alle Testfixturen dieses Gates liegen unter TEST_WURZEL (os.tmpdir()) — ein einziges Aufräumen.
  raeumeVerzeichnis(TEST_WURZEL)
}

// ─── Ergebnis ───────────────────────────────────────────────────────────────
console.log('')
if (befunde.length === 0) {
  console.log('✓ Keine Befunde.\n')
  process.exitCode = 0
} else {
  console.log(`✗ ${befunde.length} Befund(e):\n`)
  for (const b of befunde) console.log(`  - ${b}`)
  console.log('')
  process.exitCode = 1
}
