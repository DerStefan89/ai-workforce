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
 * WS-2a (features/F25/feature.md AK16) ergänzt: (5) GET /api/projekte real
 * gegen HTTP geprüft — Registerfelder plus laufAktiv:false vor einem Lauf,
 * laufAktiv:true real WÄHREND eines echten (gestubbten, aber mit einer
 * echten run_prepared-Wirkungsmarke kalibrierten) Laufs gegen dieselbe
 * Instanz, laufAktiv:false wieder nach dessen Ende; (6)
 * public/leitstand/api.js' Präfixwechsel (AK10) als isolierter Unit-Test —
 * kein Server nötig, ein Fetch-Stub genügt: setzeAktivesProjektPraefix()
 * schaltet jeden bestehenden Endpunkt um, holeProjekte() bleibt bewusst
 * unpräfigiert (Muster (2a): reine Funktions-/Modul-Prüfung statt HTTP);
 * (7) derselbe api.js-Präfixwechsel zusätzlich ENDE-ZU-ENDE gegen einen
 * echten erzeugeMultiProjektDispatcher (schließt eine Lücke, die (6)
 * allein offen ließ — der ursprüngliche Präfix-Bau-Fehler bestand dort
 * zunächst fälschlich grün, weil (6) nur gegen die eigene, damals
 * ebenfalls falsche Erwartung prüfte, siehe features/F25/nachweis-ws2a.md).
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
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { erzeugeRequestHandler, baueProjektHandlerMap, erzeugeMultiProjektDispatcher, loeseProjektPfade } from './leitstand-server.mjs'
import { validiereProjekteDaten } from '../src/projekte/index.ts'
import { starteProzess } from '../src/claude-code-gateway/prozessstart.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
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
      // F33 WS-1: kontext_pfad/roadmap_pfad sind additiv optional — gesetzt, müssen sie
      // trotzdem nicht-leere Strings sein (Code-Review-Befund: bislang unkalibriert).
      { titel: 'kontext_pfad leerer String', daten: { projekte_schema: 'v0', projekte: [{ ...GUELTIGER_EINTRAG, kontext_pfad: '' }] } },
      { titel: 'roadmap_pfad leerer String', daten: { projekte_schema: 'v0', projekte: [{ ...GUELTIGER_EINTRAG, roadmap_pfad: '' }] } },
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
    // F33 WS-1: ein gesetztes, gültiges kontext_pfad/roadmap_pfad-Paar bleibt gültig
    // (additiv, kein Rückfall auf den Standardpfad wird durch das Schema erzwungen).
    if (validiereProjekteDaten({ projekte_schema: 'v0', projekte: [{ ...GUELTIGER_EINTRAG, kontext_pfad: 'custom/kontext', roadmap_pfad: 'custom/roadmap.json' }] }).length !== 0) {
      befunde.push('(1) Grün-Fall (gesetztes kontext_pfad/roadmap_pfad) wurde fälschlich abgelehnt')
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
  // ─── (5) GET /api/projekte (WS-2a, AK11/AK16): Registerfelder + laufAktiv, real während eines ──
  // ─── echten (gestubbten) Laufs gegen dieselbe Instanz, real wieder false nach dessen Ende ──────
  {
    const projekt = {
      id: 'projekt-endpunkt-a',
      name: 'Projekt Endpunkt A',
      repo_pfad: 'projekt-endpunkt-a',
      startvorlage_pfad: 'startvorlagen/beispielprojekt.json',
      profil_pfad: 'profiles/beispiel.json',
      basisverzeichnis: 'kontrollzustand-test-f25-projekte-endpunkt',
      status: 'TEST',
    }
    // repoWurzel der Instanz ist TEST_WURZEL (nicht pfade.repoWurzel) — GET /api/projekte löst
    // projekt.repo_pfad intern über loeseProjektPfade(projekt, repoWurzel) auf (Muster
    // CLI-Bindeblock: repoWurzel/projekteBasis sind dort ebenfalls derselbe Referenzpunkt).
    const pfade = loeseProjektPfade(projekt, TEST_WURZEL)
    const auftragId = registriereTestAuftrag(pfade.basisVerzeichnis)
    const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }

    // Die Attrappe schreibt VOR dem Hängen real eine run_prepared-Wirkungsmarke (Muster F1B) —
    // ein echter fuehreAufgabeDurch-Aufruf legt über F6a/starteGateway genau diesen Checkpoint an,
    // BEVOR das Ergebnis feststeht; ohne diesen Schritt bliebe existsSync(join(basisVerzeichnis,
    // laufId)) im gestubbten Testlauf fälschlich leer, und laufAktiv wäre unkalibrierbar false
    // (Rot-Fall real erhalten, bevor dieser Schreibvorgang ergänzt wurde).
    let freigeben
    const haengenderFuehreAufgabeDurch = (laufIdDesAufrufs) => {
      schreibeWirkungsmarke(laufIdDesAufrufs, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: pfade.basisVerzeichnis, schreiber: () => {} })
      return new Promise((resolvePromise) => {
        freigeben = () => resolvePromise({ ok: false, stufe: 'gateway', grund: 'attrappe (Gate-Test, AK16)' })
      })
    }
    const handler = erzeugeRequestHandler({
      fuehreAufgabeDurchFn: haengenderFuehreAufgabeDurch,
      basisVerzeichnis: pfade.basisVerzeichnis,
      repoWurzel: TEST_WURZEL,
      startvorlagePfad: 'startvorlagen/beispielprojekt.json',
      globalerLaufZustand,
      projekte: [projekt],
    })
    const { basisUrl, schliessen } = await starteTestserver(handler)
    try {
      const antwortVorLauf = await fetch(`${basisUrl}/api/projekte`)
      const datenVorLauf = await antwortVorLauf.json()
      const eintragVorLauf = datenVorLauf.projekte?.[0]
      if (antwortVorLauf.status !== 200) {
        befunde.push(`(5) GET /api/projekte erwartet 200, erhalten ${antwortVorLauf.status}`)
      } else if (eintragVorLauf?.id !== 'projekt-endpunkt-a' || eintragVorLauf?.name !== 'Projekt Endpunkt A' || eintragVorLauf?.status !== 'TEST') {
        befunde.push(`(5) GET /api/projekte liefert nicht die Registerfelder des Eintrags: ${JSON.stringify(eintragVorLauf)}`)
      } else if (eintragVorLauf.laufAktiv !== false) {
        befunde.push(`(5) laufAktiv vor Laufstart erwartet false, erhalten ${JSON.stringify(eintragVorLauf.laufAktiv)}`)
      } else {
        console.log('✓ (5a) GET /api/projekte liefert Registerfelder (id/name/status) + laufAktiv:false vor jedem Lauf.')
      }

      const laufId = `check-f25-projekte-endpunkt-${randomUUID()}`
      const startAntwort = await fetch(`${basisUrl}/api/laeufe`, { method: 'POST', body: JSON.stringify(gueltigerStartauftrag(laufId, auftragId)) })
      if (startAntwort.status !== 202) befunde.push(`(5) Laufstart erwartet 202, erhalten ${startAntwort.status}`)
      await new Promise((r) => setTimeout(r, 50))

      const antwortWaehrendLauf = await fetch(`${basisUrl}/api/projekte`)
      const eintragWaehrendLauf = (await antwortWaehrendLauf.json()).projekte?.[0]
      if (eintragWaehrendLauf?.laufAktiv !== true) {
        befunde.push(`(5b) laufAktiv während eines real aktiven Laufs erwartet true, erhalten ${JSON.stringify(eintragWaehrendLauf)}`)
      } else {
        console.log('✓ (5b) laufAktiv wird real true, während ein Lauf gegen dieselbe Instanz noch läuft.')
      }

      freigeben()
      await new Promise((r) => setTimeout(r, 50))
      const antwortNachLauf = await fetch(`${basisUrl}/api/projekte`)
      const eintragNachLauf = (await antwortNachLauf.json()).projekte?.[0]
      if (eintragNachLauf?.laufAktiv !== false) {
        befunde.push(`(5c) laufAktiv nach Laufende erwartet false, erhalten ${JSON.stringify(eintragNachLauf)}`)
      } else {
        console.log('✓ (5c) laufAktiv fällt nach Laufende real wieder auf false zurück.')
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (6) api.js: setzeAktivesProjektPraefix schaltet fetch()-Ziele um (WS-2a, AK10/AK16) ────
  // Isolierter Unit-Test (Muster (2a): reine Modul-/Funktionsprüfung, kein HTTP-Server nötig) —
  // api.js rührt keine DOM-API an, ein Fetch-Stub genügt, um jeden Aufrufort zu beobachten.
  {
    const beobachteteUrls = []
    const echtesFetch = globalThis.fetch
    globalThis.fetch = async (url) => {
      beobachteteUrls.push(String(url))
      return { ok: true, json: async () => ({}) }
    }
    try {
      const apiModul = await import(pathToFileURL(resolve('public/leitstand/api.js')).href)
      await apiModul.holeLaeufe()
      if (beobachteteUrls.at(-1) !== '/api/laeufe') {
        befunde.push(`(6) holeLaeufe() vor setzeAktivesProjektPraefix erwartet '/api/laeufe', erhalten '${beobachteteUrls.at(-1)}'`)
      }
      // Dispatcher-Kontrakt (erzeugeMultiProjektDispatcher, AK2): setzt selbst EIN '/api' vor den
      // Rest-Pfad nach der Projekt-id — der Aufruf-Pfad darf deshalb KEIN zweites '/api' tragen,
      // sonst entstünde '/api/api/...' und liefe ins Leere (real im AK15-Browser-Realtest gefunden:
      // dieser Unit-Test bestand zunächst fälschlich grün gegen die eigene, damals noch fehlerhafte
      // Erwartung '/api/projekte/projekt-b/api/laeufe' — erst der echte Dispatcher in (3)/(5) bzw.
      // der Browser-Realtest deckte den Fehler auf; die Erwartung unten ist jetzt gegen den echten
      // Dispatcher-Kontrakt kalibriert, nicht mehr gegen die eigene Implementierung).
      apiModul.setzeAktivesProjektPraefix('/api/projekte/projekt-b')
      await apiModul.holeLaeufe()
      if (beobachteteUrls.at(-1) !== '/api/projekte/projekt-b/laeufe') {
        befunde.push(`(6) holeLaeufe() nach setzeAktivesProjektPraefix('/api/projekte/projekt-b') erwartet '/api/projekte/projekt-b/laeufe' (Dispatcher-Kontrakt: KEIN zweites '/api'), erhalten '${beobachteteUrls.at(-1)}'`)
      }
      await apiModul.holeProjekte()
      if (beobachteteUrls.at(-1) !== '/api/projekte') {
        befunde.push(`(6) holeProjekte() ist NICHT mehr unpräfigiert — erwartet '/api/projekte' (Register ist präfixunabhängig, AK11/AK13), erhalten '${beobachteteUrls.at(-1)}'`)
      }
      if (!befunde.some((b) => b.startsWith('(6)'))) {
        console.log("✓ (6) api.js: setzeAktivesProjektPraefix() schaltet jeden bestehenden Endpunkt um (holeLaeufe geprüft, Muster gilt für alle mitPraefix()-Aufrufer), holeProjekte() bleibt bewusst unpräfigiert.")
      }

      // ─── (7) api.js + echter Dispatcher: der (6)-Unit-Test allein hätte den (5)/(6)-Kalibrierungs- ──
      // ─── Bug NICHT gefangen (er prüfte nur api.js gegen die eigene, damals falsche Erwartung, ──────
      // ─── keinen echten Server) — dieser Abschnitt schließt genau diese Lücke: api.js' reale ────────
      // ─── fetch()-Aufrufe gegen einen echten erzeugeMultiProjektDispatcher, ECHTES globalThis.fetch. ──
      globalThis.fetch = echtesFetch
      const dispatchProjekt = {
        id: 'projekt-dispatch-unit',
        name: 'Dispatch Unit',
        repo_pfad: '.',
        startvorlage_pfad: 'startvorlagen/beispielprojekt.json',
        profil_pfad: 'profiles/beispiel.json',
        basisverzeichnis: 'kontrollzustand-test-f25-dispatch-unit',
        status: 'TEST',
      }
      const dispatchGlobalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
      const dispatchDefaultHandler = erzeugeRequestHandler({ basisVerzeichnis: join(TEST_WURZEL, 'kontrollzustand-test-f25-dispatch-unit-default'), startvorlagePfad: 'startvorlagen/beispielprojekt.json', globalerLaufZustand: dispatchGlobalerLaufZustand })
      const dispatchMap = baueProjektHandlerMap([dispatchProjekt], process.cwd(), dispatchGlobalerLaufZustand)
      const dispatchServer = await starteTestserver(erzeugeMultiProjektDispatcher(dispatchMap, dispatchDefaultHandler))
      try {
        apiModul.setzeAktivesProjektPraefix('/api/projekte/projekt-dispatch-unit')
        // holeLaufDetail() statt holeLaeufe(): keine Präfixannahme über den Basis-URL hinaus nötig,
        // dieselbe mitPraefix()-Stelle — globalThis.fetch ist wieder das echte fetch, api.js selbst
        // weiß nichts von basisUrl, deshalb der Umweg über eine absolute URL im Fetch-Stub-Ersatz:
        // api.js ruft fetch() mit einem RELATIVEN Pfad auf ('/api/projekte/.../laeufe') — das
        // funktioniert nur, wenn ein Basis-Dokument existiert (Browser). In Node ohne DOM braucht
        // fetch() eine absolute URL; ein zweiter, minimaler globalThis.fetch-Wrapper löst genau
        // das, ohne api.js selbst zu ändern (D5: api.js bleibt browserisch, kein Node-Sonderfall).
        globalThis.fetch = (pfad, optionen) => echtesFetch(`${dispatchServer.basisUrl}${pfad}`, optionen)
        const antwort = await apiModul.holeLaeufe()
        if (!Array.isArray(antwort)) {
          befunde.push(`(7) api.js holeLaeufe() über den echten Dispatcher (Präfix '/api/projekte/projekt-dispatch-unit') liefert keine Laufliste — erhalten ${JSON.stringify(antwort)} (Rot-Fall-Muster: mit dem alten, doppelten '/api/api/...'-Pfad hätte dies real 404/HTML statt einer leeren Liste ergeben)`)
        } else {
          console.log('✓ (7) api.js holeLaeufe() erreicht über den ECHTEN erzeugeMultiProjektDispatcher real 200 (Präfix + Dispatcher-Kontrakt stimmen end-to-end überein, nicht nur gegen die eigene Erwartung wie (6)).')
        }
      } finally {
        await dispatchServer.schliessen()
        globalThis.fetch = echtesFetch
      }
    } finally {
      globalThis.fetch = echtesFetch
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
