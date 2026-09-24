/**
 * Datei: scripts/check-f41-projekt-anlegen.mjs
 *
 * Zweck: F41-WS-1-Gate (features/F41/feature.md). Prüft src/projekt-
 * anlegen/index.ts und POST /api/projekte (scripts/leitstand-server.mjs)
 * gegen eine Wegwerf-Fixture: ein externes "Autorisierungs-Repo" (Muster
 * scripts/check-f4-invocation-policy.mjs' neuesExternesRepo/committeBaseline
 * — CI hat kein echtes C:\Users\stefa\ai-workforce-autorisierung, deshalb
 * eine Attrappen-Baseline statt der echten) und ein Wegwerf-"Quellrepo" mit
 * eigenem .claude/settings.json + Hook + state/aktuelle-autorisierung.json
 * (Baseline UND ein zum Fixture-Ist-Zustand passender Wirksamkeitsnachweis
 * — Korrektur 24.09.2026: die POST-Route prüft am Ziel jetzt BEIDE
 * Startbedingungen, siehe (3b)), das gegen beide Attrappen-Referenzen grün
 * validiert.
 *
 * Prüft: (1) loeseZielordner — Containment/Traversal/Symlink/nicht-leer,
 * Grün-Fall Standard + custom zielordner; (2) kopiereBaseline +
 * schreibeStartvorlageUndProfil — byte-identische Kopie, pruefbefehl/
 * pruefZeitgrenzeMs entfernt, profilPfad absolut auf das NEUE profiles/<id>.
 * json (realer Fund, Smoketest: ohne diese Korrektur bindet sich ein neues
 * Projekt beim echten Serverlauf still an ai-workforce's eigenes Profil,
 * weil src/startvorlage/index.ts' leiteProfilReferenzAb profilPfad relativ
 * zum process.cwd() des SERVERPROZESSES liest); (3)
 * pruefeStartbedingung1FuerRepo — Grün gegen die Fixture-Baseline, Rot bei
 * manipuliertem Hook-Hash und bei fehlender/ungültiger
 * aktuelle-autorisierung.json; (3b) pruefeVolleStartfreigabeFuerRepo
 * (Korrektur 24.09.2026, Auftrags-Vorgabe 2 — Bedingung 1 UND 2, dieselben
 * Eingaben wie starteGateway) — Grün gegen einen zum Fixture-Ist-Zustand
 * passenden Wirksamkeitsnachweis, Rot bei einem Wirksamkeitsnachweis mit
 * abweichendem werkzeug_konfiguration_hash im Gültigkeitsschlüssel (E-188),
 * bei unveränderter, weiterhin grüner Bedingung 1; (4) baueNeuenProjektEintrag — repo_pfad-
 * Arithmetik, Rot-Fall-Selbsttest (Muster (2a) in check-f25-projekte.mjs);
 * (5) ladeProjektregisterMitLokal — kein lokales Register, additiver Merge,
 * Verwerfen NUR der lokalen Datei bei Duplikat-id/ungültigem JSON; (6) POST
 * /api/projekte Ende-zu-Ende gegen einen echten Server: Grün-Fall (id
 * erscheint in GET /api/projekte, /api/projekte/<id>/... live ohne
 * Neustart erreichbar, Dateien byte-identisch, Startvorlage ohne
 * pruefbefehl), Rot-Fälle (ungültige id, id-Kollision, Traversal, nicht
 * leerer Zielordner, Quelle nicht grün — nichts angelegt/registriert —,
 * Ziel nach dem Kopieren manipuliert → zurückgebaut, D13 blockiert während
 * globalerLaufZustand.aktiv); (7) Ziel nach dem Kopieren manipuliert →
 * raeumeAngelegtenOrdnerZurueck baut zurück; (8) QA-Befund:
 * raeumeAngelegtenOrdnerZurueck wirft NIE, auch wenn rmSync real an einem
 * offen gehaltenen Datei-Handle scheitert (EBUSY/EPERM unter Windows,
 * absichtlich erzwungen) — meldet { ok:false, grund } statt eines
 * ungefangenen zweiten Wurfs, der den Serverprozess als unhandled
 * rejection mitgerissen hätte.
 *
 * Wird aufgerufen von: `npm run check`.
 *
 * Aufruf: node scripts/check-f41-projekt-anlegen.mjs
 * Exit 0 = sauber, Exit 1 = Befund gefunden
 */

import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { sha256Hex } from '../src/checkpoint-store/index.ts'
import {
  baueNeuenProjektEintrag,
  kopiereBaseline,
  loeseZielordner,
  pruefeStartbedingung1FuerRepo,
  pruefeVolleStartfreigabeFuerRepo,
  raeumeAngelegtenOrdnerZurueck,
  schreibeStartvorlageUndProfil,
} from '../src/projekt-anlegen/index.ts'
import { ladeProjektregisterMitLokal } from '../src/projekte/index.ts'
import { erzeugeRequestHandler, erzeugeMultiProjektDispatcher } from './leitstand-server.mjs'
import { pruefeNeuesProjektFormular } from './leitstand/routen-f41.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

const befunde = []
console.log('\n=== F41-Projekt-Anlegen-Check (WS-1) ===\n')

const TEST_WURZEL = join(tmpdir(), `check-f41-${randomUUID()}`)
mkdirSync(TEST_WURZEL, { recursive: true })

function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8' })
}

function neuesExternesRepo() {
  const repoWurzel = join(TEST_WURZEL, `extern-${randomUUID()}`)
  mkdirSync(repoWurzel, { recursive: true })
  git(repoWurzel, ['init', '--quiet'])
  git(repoWurzel, ['config', 'user.email', 'test@example.invalid'])
  git(repoWurzel, ['config', 'user.name', 'Test'])
  writeFileSync(join(repoWurzel, '.gitattributes'), '* -text\n')
  git(repoWurzel, ['add', '.gitattributes'])
  git(repoWurzel, ['commit', '--quiet', '-m', 'init: Zeilenenden pinnen'])
  return repoWurzel
}

function committeBaseline(repoWurzel, baselineId, inhalt) {
  const relativerPfad = `invocation-policy-baseline/${baselineId}.json`
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', 'baseline'])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

/** Muster committeBaseline — eigener Ordner ('invocation-policy-wirksamkeitsnachweis/'), damit ein Gate-Skript beide Referenzarten unabhängig kalibrieren kann. */
function committeWirksamkeitsnachweis(repoWurzel, nachweisId, inhalt) {
  const relativerPfad = `invocation-policy-wirksamkeitsnachweis/${nachweisId}.json`
  const zielpfad = join(repoWurzel, relativerPfad)
  mkdirSync(dirname(zielpfad), { recursive: true })
  writeFileSync(zielpfad, inhalt)
  git(repoWurzel, ['add', relativerPfad])
  git(repoWurzel, ['commit', '--quiet', '-m', 'wirksamkeitsnachweis'])
  const commitHash = git(repoWurzel, ['rev-parse', 'HEAD']).trim()
  return { pfad: zielpfad, commit_hash: commitHash, datei_hash: sha256Hex(inhalt) }
}

// Eckdaten der Fixture-Startvorlage (unten) — auch für den Bau des passenden Wirksamkeitsnachweises
// gebraucht (Bedingung 2/E-188 vergleicht dagegen), deshalb als Konstanten statt zweimal getippt.
const FIXTURE_WERKZEUG_VERSION = '0.0.0-test'
const FIXTURE_BERECHTIGUNGSKONTEXT = 'profil-standard'
const FIXTURE_STARTZIEL = ['C:\\Program Files\\test\\test.exe']

/**
 * Baut ein Wegwerf-"Quellrepo" mit .claude/settings.json (ein Hook),
 * state/aktuelle-autorisierung.json (zeigt auf externesRepo — inkl. einem
 * ECHTEN, zum Fixture-Ist-Zustand passenden Wirksamkeitsnachweis, Korrektur
 * 24.09.2026: die POST-Route prüft jetzt Bedingung 1 UND 2), startvorlagen/
 * ai-workforce.json (mit pruefbefehl/pruefZeitgrenzeMs, damit AK2 real
 * belegt, dass sie entfernt werden) und profiles/ai-workforce.json.
 * hookInhalt überschreibbar, um gezielt einen Bedingung-1-Rot-Fall
 * (manipulierter Hash) zu bauen; wirksamkeitsnachweisUeberschreibung, um
 * gezielt einen Bedingung-2-Rot-Fall (abweichender Gültigkeitsschlüssel) zu
 * bauen — beide bewusst getrennt, weil sie unterschiedliche Referenzen
 * treffen (Bedingung 1 vergleicht gegen baselineReferenz, Bedingung 2 gegen
 * wirksamkeitsnachweisReferenz — siehe src/invocation-policy/index.ts).
 */
function baueQuellRepo(externesRepo, hookInhalt = 'echter-hook-inhalt', wirksamkeitsnachweisUeberschreibung = undefined) {
  const repoWurzel = join(TEST_WURZEL, `quelle-${randomUUID()}`)
  mkdirSync(join(repoWurzel, '.claude', 'hooks'), { recursive: true })
  mkdirSync(join(repoWurzel, 'state'), { recursive: true })
  mkdirSync(join(repoWurzel, 'startvorlagen'), { recursive: true })
  mkdirSync(join(repoWurzel, 'profiles'), { recursive: true })

  const settingsInhalt = `${JSON.stringify(
    { hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'node .claude/hooks/dummy-hook.js' }] }] } },
    null,
    2
  )}\n`
  writeFileSync(join(repoWurzel, '.claude', 'settings.json'), settingsInhalt)
  writeFileSync(join(repoWurzel, '.claude', 'hooks', 'dummy-hook.js'), hookInhalt)

  const baselineInhalt = JSON.stringify({
    werkzeug_konfiguration: { pfad: join(repoWurzel, '.claude', 'settings.json'), hash: sha256Hex(settingsInhalt) },
    schutzskripte: [{ pfad: '.claude/hooks/dummy-hook.js', hash: sha256Hex('echter-hook-inhalt') }],
  })
  const baselineReferenz = committeBaseline(externesRepo, `f41-${randomUUID()}`, baselineInhalt)

  // pruefeVolleStartfreigabeFuerRepo baut arbeitsverzeichnis_pfad IMMER aus process.cwd() DIESES
  // (Server-/Gate-)Prozesses (Korrektur 24.09.2026, Muster starteGateway) — also dem Repo-Root, aus
  // dem `npm run check`/dieses Skript läuft. Der Wirksamkeitsnachweis muss deshalb GENAU diesen
  // Wert tragen, nicht repoWurzel.
  const gueltigerGueltigkeitsschluessel = {
    werkzeug_konfiguration_hash: sha256Hex(settingsInhalt),
    schutzskript_hashes: [sha256Hex('echter-hook-inhalt')],
    werkzeug_version_deklariert: FIXTURE_WERKZEUG_VERSION,
    berechtigungskontext: FIXTURE_BERECHTIGUNGSKONTEXT,
    arbeitsverzeichnis_pfad: process.cwd(),
    startziel_pfad: FIXTURE_STARTZIEL[0],
  }
  const wirksamkeitsnachweisInhalt = JSON.stringify({
    gueltigkeitsschluessel: { ...gueltigerGueltigkeitsschluessel, ...wirksamkeitsnachweisUeberschreibung },
    rot_fall_beleg: 'F41-Gate-Fixture',
    geprueft_am: new Date().toISOString(),
  })
  const wirksamkeitsnachweisReferenz = committeWirksamkeitsnachweis(externesRepo, `f41-${randomUUID()}`, wirksamkeitsnachweisInhalt)

  writeFileSync(join(repoWurzel, 'state', 'aktuelle-autorisierung.json'), JSON.stringify({ baselineReferenz, wirksamkeitsnachweisReferenz }, null, 2))

  writeFileSync(
    join(repoWurzel, 'startvorlagen', 'ai-workforce.json'),
    JSON.stringify(
      {
        startvorlage_schema: 'v0',
        profilPfad: 'profiles/ai-workforce.json',
        werkzeugStartziel: FIXTURE_STARTZIEL,
        werkzeugVersionDeklariert: FIXTURE_WERKZEUG_VERSION,
        berechtigungskontext: FIXTURE_BERECHTIGUNGSKONTEXT,
        modell: 'test-modell',
        standardBudget: { maxElemente: 1, maxBytes: 1 },
        zeitgrenzeMs: 1000,
        pruefbefehl: ['node', '-e', '1'],
        pruefZeitgrenzeMs: 1000,
        werkzeugsaetze: {
          lesend: { art: 'lesend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] },
          schreibend: { art: 'schreibend', modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Write', 'Edit'] },
        },
      },
      null,
      2
    )
  )
  writeFileSync(join(repoWurzel, 'profiles', 'ai-workforce.json'), JSON.stringify({ projekt: 'ai-workforce', version: 1, gates: [], dod: [], werkzeuge: {}, reviewRegeln: [] }, null, 2))

  return repoWurzel
}

function vergleicheBytes(pfadA, pfadB) {
  return readFileSync(pfadA).equals(readFileSync(pfadB))
}

async function starteTestserver(handler) {
  const server = createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return { basisUrl: `http://127.0.0.1:${port}`, schliessen: () => new Promise((resolve) => server.close(resolve)) }
}

try {
  const externesRepo = neuesExternesRepo()
  const quellRepo = baueQuellRepo(externesRepo)

  // ─── (0) pruefeNeuesProjektFormular: Rot-/Grün-Fälle ────────────────────────────────
  {
    const rotFaelle = [
      { titel: 'id zu kurz', body: { id: 'a', name: 'X' } },
      { titel: 'id Großbuchstabe', body: { id: 'Abc', name: 'X' } },
      { titel: 'id fehlt', body: { name: 'X' } },
      { titel: 'name fehlt', body: { id: 'gueltige-id' } },
      { titel: 'name leer', body: { id: 'gueltige-id', name: '' } },
      { titel: 'zielordner leer', body: { id: 'gueltige-id', name: 'X', zielordner: '' } },
      { titel: 'Body kein Objekt', body: 'text' },
    ]
    const vor = befunde.length
    for (const { titel, body } of rotFaelle) {
      if (pruefeNeuesProjektFormular(body).ok) befunde.push(`(0) Rot-Fall '${titel}' wurde fälschlich als gültig akzeptiert`)
    }
    if (!pruefeNeuesProjektFormular({ id: 'gueltige-id', name: 'X' }).ok) befunde.push('(0) Grün-Fall (ohne zielordner) wurde fälschlich abgelehnt')
    if (!pruefeNeuesProjektFormular({ id: 'gueltige-id', name: 'X', zielordner: 'C:\\irgendwo' }).ok) befunde.push('(0) Grün-Fall (mit zielordner) wurde fälschlich abgelehnt')
    if (befunde.length === vor) console.log(`✓ (0) pruefeNeuesProjektFormular: ${rotFaelle.length} Rot-Fälle erkannt, beide Grün-Fälle akzeptiert.`)
  }

  // ─── (1) loeseZielordner: Containment/Traversal/nicht-leer/Symlink, Grün-Fälle ─────────
  {
    const basis = join(TEST_WURZEL, 'eltern-1')
    mkdirSync(basis, { recursive: true })
    const vor = befunde.length

    const traversal = loeseZielordner(basis, 'irrelevant', '../../ausserhalb')
    if (traversal.ok) befunde.push('(1) Traversal (../../ausserhalb) wurde fälschlich als innerhalb der Basis akzeptiert')

    const auswaerts = loeseZielordner(basis, 'irrelevant', join(TEST_WURZEL, 'ganz-woanders'))
    if (auswaerts.ok) befunde.push('(1) Ein absoluter Pfad außerhalb der Basis wurde fälschlich akzeptiert')

    const nichtLeer = join(basis, 'nicht-leer')
    mkdirSync(nichtLeer, { recursive: true })
    writeFileSync(join(nichtLeer, 'datei.txt'), 'x')
    const nichtLeerErgebnis = loeseZielordner(basis, 'nicht-leer')
    if (nichtLeerErgebnis.ok) befunde.push('(1) Ein bereits nicht-leerer Zielordner wurde fälschlich akzeptiert')

    const leerVorhanden = join(basis, 'leer-vorhanden')
    mkdirSync(leerVorhanden, { recursive: true })
    const leerErgebnis = loeseZielordner(basis, 'leer-vorhanden')
    if (!leerErgebnis.ok) befunde.push(`(1) Ein bereits vorhandener, aber leerer Zielordner wurde fälschlich abgelehnt: ${leerErgebnis.grund}`)

    const standard = loeseZielordner(basis, 'neues-projekt')
    if (!standard.ok || standard.ziel !== join(basis, 'neues-projekt')) befunde.push(`(1) Standard-Zielordner falsch aufgelöst: ${JSON.stringify(standard)}`)

    const custom = loeseZielordner(basis, 'irrelevant', join(basis, 'custom-name'))
    if (!custom.ok || custom.ziel !== join(basis, 'custom-name')) befunde.push(`(1) Custom-Zielordner falsch aufgelöst: ${JSON.stringify(custom)}`)

    // Symlink-Rot-Fall — best effort: Windows verweigert symlinkSync ohne erhöhte Rechte/Dev-Mode
    // real mit EPERM. Kein Befund, wenn das Anlegen selbst scheitert (Umgebungsgrenze, nicht Teil
    // dieses Gates) — nur wenn ein tatsächlich angelegter Symlink NICHT erkannt wird.
    try {
      const echtesVerzeichnis = join(basis, 'symlink-ziel-real')
      mkdirSync(echtesVerzeichnis, { recursive: true })
      const symlinkPfad = join(basis, 'symlink-eltern')
      symlinkSync(echtesVerzeichnis, symlinkPfad, 'junction')
      const ueberSymlink = loeseZielordner(symlinkPfad, 'irrelevant', join(symlinkPfad, 'unterordner'))
      if (ueberSymlink.ok) befunde.push('(1) Ein Zielpfad über einen Symlink wurde fälschlich akzeptiert')
      else console.log('✓ (1e) Symlink im Zielpfad wird erkannt und abgelehnt.')
    } catch (fehler) {
      console.log(`(1e) Symlink-Rot-Fall übersprungen (Umgebung erlaubt kein symlinkSync: ${fehler.message})`)
    }

    if (befunde.length === vor) console.log('✓ (1) loeseZielordner: Traversal/außerhalb-Basis/nicht-leer abgelehnt, vorhandener leerer + beide Grün-Fälle akzeptiert.')
  }

  // ─── (2) kopiereBaseline + schreibeStartvorlageUndProfil ───────────────────────────────
  {
    const ziel = join(TEST_WURZEL, `ziel-kopie-${randomUUID()}`)
    mkdirSync(ziel, { recursive: true })
    const vor = befunde.length

    const kopiert = kopiereBaseline(quellRepo, ziel)
    const erwarteteEintraege = ['.claude\\settings.json', '.claude/hooks/dummy-hook.js', 'state\\aktuelle-autorisierung.json']
    if (kopiert.length !== 3) befunde.push(`(2) kopiereBaseline: erwartet 3 kopierte Pfade, erhalten ${kopiert.length} (${JSON.stringify(kopiert)})`)
    if (!vergleicheBytes(join(quellRepo, '.claude', 'settings.json'), join(ziel, '.claude', 'settings.json'))) befunde.push('(2) settings.json wurde NICHT byte-identisch kopiert')
    if (!vergleicheBytes(join(quellRepo, '.claude', 'hooks', 'dummy-hook.js'), join(ziel, '.claude', 'hooks', 'dummy-hook.js'))) befunde.push('(2) Hook-Datei wurde NICHT byte-identisch kopiert')
    if (!vergleicheBytes(join(quellRepo, 'state', 'aktuelle-autorisierung.json'), join(ziel, 'state', 'aktuelle-autorisierung.json'))) befunde.push('(2) aktuelle-autorisierung.json wurde NICHT byte-identisch kopiert')

    schreibeStartvorlageUndProfil('mein-projekt', quellRepo, ziel)
    const geschriebeneStartvorlage = JSON.parse(readFileSync(join(ziel, 'startvorlagen', 'mein-projekt.json'), 'utf8'))
    if ('pruefbefehl' in geschriebeneStartvorlage) befunde.push("(2) 'pruefbefehl' wurde NICHT aus der neuen Startvorlage entfernt")
    if ('pruefZeitgrenzeMs' in geschriebeneStartvorlage) befunde.push("(2) 'pruefZeitgrenzeMs' wurde NICHT aus der neuen Startvorlage entfernt")
    if (geschriebeneStartvorlage.profilPfad !== join(ziel, 'profiles', 'mein-projekt.json')) {
      befunde.push(`(2) profilPfad zeigt nicht absolut auf das neue Profil: erhalten '${geschriebeneStartvorlage.profilPfad}' (realer Fund, Smoketest: sonst still ai-workforce's eigenes Profil gebunden)`)
    }
    const geschriebenesProfil = JSON.parse(readFileSync(join(ziel, 'profiles', 'mein-projekt.json'), 'utf8'))
    if (geschriebenesProfil.projekt !== 'mein-projekt') befunde.push(`(2) profiles/mein-projekt.json trägt nicht projekt:'mein-projekt', erhalten '${geschriebenesProfil.projekt}'`)
    if (!existsSync(join(ziel, '.gitignore')) || readFileSync(join(ziel, '.gitignore'), 'utf8') !== 'kontrollzustand/\n') {
      befunde.push("(2) .gitignore fehlt oder trägt nicht genau 'kontrollzustand/\\n'")
    }

    if (befunde.length === vor) console.log('✓ (2) kopiereBaseline byte-identisch (3 Dateien), schreibeStartvorlageUndProfil entfernt pruefbefehl/pruefZeitgrenzeMs, setzt profilPfad absolut auf das neue Profil, profil.projekt korrekt, .gitignore korrekt.')
  }

  // ─── (3) pruefeStartbedingung1FuerRepo: Grün + Rot (manipulierter Hook, fehlende Autorisierung) ─
  {
    const vor = befunde.length
    const zielGruen = join(TEST_WURZEL, `ziel-b1-gruen-${randomUUID()}`)
    mkdirSync(zielGruen, { recursive: true })
    kopiereBaseline(quellRepo, zielGruen)
    const gruenErgebnis = pruefeStartbedingung1FuerRepo(zielGruen, { startfreigabeRepoWurzel: externesRepo })
    if (!gruenErgebnis.ok) befunde.push(`(3) Grün-Fall (byte-identische Kopie) wurde fälschlich abgelehnt: ${gruenErgebnis.grund}`)

    // Rot-Fall: Hook nach dem Kopieren manipuliert (Muster CONTEXT "manipulierter Hook-Hash").
    const zielRotHook = join(TEST_WURZEL, `ziel-b1-rot-hook-${randomUUID()}`)
    mkdirSync(zielRotHook, { recursive: true })
    kopiereBaseline(quellRepo, zielRotHook)
    writeFileSync(join(zielRotHook, '.claude', 'hooks', 'dummy-hook.js'), 'manipulierter-inhalt')
    const rotHookErgebnis = pruefeStartbedingung1FuerRepo(zielRotHook, { startfreigabeRepoWurzel: externesRepo })
    if (rotHookErgebnis.ok) befunde.push('(3) Ein nach dem Kopieren manipulierter Hook wurde fälschlich als grün akzeptiert')

    // Rot-Fall: state/aktuelle-autorisierung.json fehlt.
    const zielOhneAutorisierung = join(TEST_WURZEL, `ziel-b1-ohne-autorisierung-${randomUUID()}`)
    mkdirSync(join(zielOhneAutorisierung, '.claude'), { recursive: true })
    writeFileSync(join(zielOhneAutorisierung, '.claude', 'settings.json'), readFileSync(join(quellRepo, '.claude', 'settings.json')))
    const ohneAutorisierungErgebnis = pruefeStartbedingung1FuerRepo(zielOhneAutorisierung, { startfreigabeRepoWurzel: externesRepo })
    if (ohneAutorisierungErgebnis.ok) befunde.push('(3) Ein Ziel ohne state/aktuelle-autorisierung.json wurde fälschlich als grün akzeptiert')

    if (befunde.length === vor) console.log('✓ (3) pruefeStartbedingung1FuerRepo: Grün-Fall akzeptiert, manipulierter Hook + fehlende Autorisierung real abgelehnt.')
  }

  // ─── (3b) pruefeVolleStartfreigabeFuerRepo: Grün (Bedingung 1 UND 2) + Rot bei abweichendem ────
  // ─── Gültigkeitsschlüssel im Wirksamkeitsnachweis (Korrektur 24.09.2026, Auftrags-Vorgabe 2) ────
  {
    const vor = befunde.length
    const neueStartvorlage = { werkzeugVersionDeklariert: FIXTURE_WERKZEUG_VERSION, berechtigungskontext: FIXTURE_BERECHTIGUNGSKONTEXT, werkzeugStartziel: FIXTURE_STARTZIEL }

    const zielGruen = join(TEST_WURZEL, `ziel-voll-gruen-${randomUUID()}`)
    mkdirSync(zielGruen, { recursive: true })
    kopiereBaseline(quellRepo, zielGruen)
    const volleGruenErgebnis = pruefeVolleStartfreigabeFuerRepo(zielGruen, neueStartvorlage, { startfreigabeRepoWurzel: externesRepo })
    if (!volleGruenErgebnis.ok) befunde.push(`(3b) Grün-Fall (Bedingung 1 UND 2, byte-identische Kopie + passender Wirksamkeitsnachweis) wurde fälschlich abgelehnt: ${volleGruenErgebnis.grund}`)

    // Rot-Fall: derselbe Ist-Zustand (Bedingung 1 bleibt grün — eigene, korrekte Baseline), aber ein
    // Wirksamkeitsnachweis mit einem absichtlich abweichenden werkzeug_konfiguration_hash im
    // Gültigkeitsschlüssel (Auftrags-Vorgabe: "Attrappen-Wirksamkeitsnachweis mit abweichendem
    // Hash") — Bedingung 2 muss das als Drift erkennen, unabhängig von Bedingung 1.
    const quellRepoRotB2 = baueQuellRepo(externesRepo, 'echter-hook-inhalt', { werkzeug_konfiguration_hash: 'a'.repeat(64) })
    const zielRotB2 = join(TEST_WURZEL, `ziel-voll-rot-b2-${randomUUID()}`)
    mkdirSync(zielRotB2, { recursive: true })
    kopiereBaseline(quellRepoRotB2, zielRotB2)
    const bedingung1FuerRotB2 = pruefeStartbedingung1FuerRepo(zielRotB2, { startfreigabeRepoWurzel: externesRepo })
    if (!bedingung1FuerRotB2.ok) befunde.push(`(3b) Testaufbau-Fehler: Bedingung 1 hätte für den B2-Rot-Fall grün bleiben müssen, ist aber rot: ${bedingung1FuerRotB2.grund}`)
    const volleRotErgebnis = pruefeVolleStartfreigabeFuerRepo(zielRotB2, neueStartvorlage, { startfreigabeRepoWurzel: externesRepo })
    if (volleRotErgebnis.ok) {
      befunde.push('(3b) Ein Wirksamkeitsnachweis mit abweichendem werkzeug_konfiguration_hash (E-188) wurde fälschlich als grün akzeptiert')
    } else if (!/E-188|Gültigkeitsschlüssel/.test(volleRotErgebnis.grund)) {
      befunde.push(`(3b) Rot-Fall abgelehnt, aber nicht erkennbar wegen E-188/Gültigkeitsschlüssel: ${volleRotErgebnis.grund}`)
    }

    if (befunde.length === vor) console.log('✓ (3b) pruefeVolleStartfreigabeFuerRepo: Grün-Fall (Bedingung 1 UND 2) akzeptiert, abweichender Gültigkeitsschlüssel (E-188) real abgelehnt.')
  }

  // ─── (4) baueNeuenProjektEintrag: repo_pfad-Arithmetik + Rot-Fall-Selbsttest ────────────
  {
    const vor = befunde.length
    const basis = join(TEST_WURZEL, 'repo-basis')
    const ziel = join(TEST_WURZEL, 'geschwister-projekt')
    const eintrag = baueNeuenProjektEintrag('geschwister-projekt', 'Geschwister', ziel, basis)
    if (eintrag.repo_pfad !== '../geschwister-projekt') befunde.push(`(4) repo_pfad falsch: erwartet '../geschwister-projekt', erhalten '${eintrag.repo_pfad}'`)
    if (eintrag.startvorlage_pfad !== 'startvorlagen/geschwister-projekt.json') befunde.push(`(4) startvorlage_pfad falsch: '${eintrag.startvorlage_pfad}'`)
    if (eintrag.profil_pfad !== 'profiles/geschwister-projekt.json') befunde.push(`(4) profil_pfad falsch: '${eintrag.profil_pfad}'`)
    if (eintrag.status !== 'IDEE') befunde.push(`(4) status falsch: erwartet 'IDEE', erhalten '${eintrag.status}'`)
    // Rot-Fall-Selbsttest (Muster check-f25-projekte.mjs (2a)).
    if (eintrag.repo_pfad === '../absichtlich-falsch') befunde.push('(4) Rot-Fall-Selbsttest: absichtlich falscher Vergleichswert wurde fälschlich als Treffer gewertet')
    if (befunde.length === vor) console.log('✓ (4) baueNeuenProjektEintrag löst repo_pfad/startvorlage_pfad/profil_pfad/status korrekt auf, Rot-Fall-Selbsttest bestanden.')
  }

  // ─── (5) ladeProjektregisterMitLokal: kein lokales Register, additiver Merge, Verwerfen NUR lokal ─
  {
    const vor = befunde.length
    const committetPfad = join(TEST_WURZEL, 'projekte-5.json')
    const GUELTIGER_EINTRAG = { id: 'basis-projekt', name: 'Basis', repo_pfad: '.', startvorlage_pfad: 'startvorlagen/x.json', profil_pfad: 'profiles/x.json', basisverzeichnis: 'kontrollzustand-test-f41-5', status: 'IDEE' }
    writeFileSync(committetPfad, JSON.stringify({ projekte_schema: 'v0', projekte: [GUELTIGER_EINTRAG] }))

    const lokalFehltPfad = join(TEST_WURZEL, 'projekte-lokal-fehlt.json')
    const ohneLokal = ladeProjektregisterMitLokal(committetPfad, lokalFehltPfad)
    if (ohneLokal.length !== 1 || ohneLokal[0].id !== 'basis-projekt') befunde.push(`(5) Ohne lokale Datei erwartet genau das committete Register, erhalten ${JSON.stringify(ohneLokal)}`)

    const lokalGueltigPfad = join(TEST_WURZEL, 'projekte-lokal-gueltig.json')
    const NEUER_EINTRAG = { ...GUELTIGER_EINTRAG, id: 'neues-projekt', basisverzeichnis: 'kontrollzustand-test-f41-5b' }
    writeFileSync(lokalGueltigPfad, JSON.stringify({ projekte_schema: 'v0', projekte: [NEUER_EINTRAG] }))
    const mitLokal = ladeProjektregisterMitLokal(committetPfad, lokalGueltigPfad)
    if (mitLokal.length !== 2 || !mitLokal.some((e) => e.id === 'neues-projekt')) befunde.push(`(5) Additiver Merge fehlgeschlagen, erhalten ${JSON.stringify(mitLokal)}`)

    const lokalDuplikatPfad = join(TEST_WURZEL, 'projekte-lokal-duplikat.json')
    writeFileSync(lokalDuplikatPfad, JSON.stringify({ projekte_schema: 'v0', projekte: [{ ...GUELTIGER_EINTRAG }] }))
    const mitDuplikat = ladeProjektregisterMitLokal(committetPfad, lokalDuplikatPfad)
    if (mitDuplikat.length !== 1) befunde.push(`(5) Ein lokales Register mit Duplikat-id hätte NUR verworfen werden müssen (committetes Register bleibt bestehen), erhalten ${JSON.stringify(mitDuplikat)}`)

    const lokalKaputtPfad = join(TEST_WURZEL, 'projekte-lokal-kaputt.json')
    writeFileSync(lokalKaputtPfad, '{ kein gueltiges json')
    const mitKaputterDatei = ladeProjektregisterMitLokal(committetPfad, lokalKaputtPfad)
    if (mitKaputterDatei.length !== 1) befunde.push(`(5) Ein lokales Register mit ungültigem JSON hätte NUR verworfen werden müssen, erhalten ${JSON.stringify(mitKaputterDatei)}`)

    // Code-Review-Befund (F41 WS-1): valides JSON, aber falsche Form (kein Objekt / 'projekte'
    // kein Array) — eigener Rot-Fall, damit dieser Zweig nicht stillschweigend über den
    // "kein Verstoß"-Pfad durchfällt.
    const lokalFalscheFormPfad = join(TEST_WURZEL, 'projekte-lokal-falsche-form.json')
    writeFileSync(lokalFalscheFormPfad, JSON.stringify({ projekte_schema: 'v0', projekte: 'kein-array' }))
    const mitFalscherForm = ladeProjektregisterMitLokal(committetPfad, lokalFalscheFormPfad)
    if (mitFalscherForm.length !== 1) befunde.push(`(5) Ein lokales Register mit 'projekte' als Nicht-Array hätte NUR verworfen werden müssen, erhalten ${JSON.stringify(mitFalscherForm)}`)

    if (befunde.length === vor) console.log("✓ (5) ladeProjektregisterMitLokal: fehlende Datei → nur committet, gültige Datei → additiver Merge, Duplikat-id/ungültiges JSON/falsche Form ('projekte' kein Array) → NUR die lokale Datei verworfen.")
  }

  // ─── (6) POST /api/projekte Ende-zu-Ende: Grün-Fall + Rot-Fälle + D13 ──────────────────
  {
    const vor = befunde.length
    const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
    const projekte = [{ id: 'bereits-registriert', name: 'X', repo_pfad: '.', startvorlage_pfad: 'startvorlagen/ai-workforce.json', profil_pfad: 'profiles/ai-workforce.json', basisverzeichnis: 'kontrollzustand-test-f41-6-bestehend', status: 'IDEE' }]
    const projektHandlerMap = new Map()
    const handler = erzeugeRequestHandler({
      repoWurzel: quellRepo,
      basisVerzeichnis: join(quellRepo, 'kontrollzustand-test-f41-6'),
      startvorlagePfad: join(quellRepo, 'startvorlagen', 'ai-workforce.json'),
      settingsPfad: join(quellRepo, '.claude', 'settings.json'),
      aktuelleAutorisierungPfad: join(quellRepo, 'state', 'aktuelle-autorisierung.json'),
      globalerLaufZustand,
      projekte,
      projektHandlerMap,
      startfreigabeRepoWurzel: externesRepo,
    })
    const dispatcher = erzeugeMultiProjektDispatcher(projektHandlerMap, handler)
    const { basisUrl, schliessen } = await starteTestserver(dispatcher)
    const eltern = dirname(quellRepo)

    async function poste(body) {
      const antwort = await fetch(`${basisUrl}/api/projekte`, { method: 'POST', body: JSON.stringify(body) })
      return { status: antwort.status, daten: await antwort.json() }
    }

    try {
      // Rot: ungültige id.
      const ungueltig = await poste({ id: 'A', name: 'X' })
      if (ungueltig.status !== 400) befunde.push(`(6) ungültige id: erwartet 400, erhalten ${ungueltig.status}`)

      // Rot: id-Kollision gegen das bestehende Register.
      const kollision = await poste({ id: 'bereits-registriert', name: 'X' })
      if (kollision.status !== 409) befunde.push(`(6) id-Kollision: erwartet 409, erhalten ${kollision.status}`)

      // Rot: Traversal.
      const traversal = await poste({ id: 'traversal-projekt', name: 'X', zielordner: join(eltern, '..', 'ausserhalb-f41') })
      if (traversal.status !== 400) befunde.push(`(6) Traversal-Zielordner: erwartet 400, erhalten ${traversal.status}`)
      if (existsSync(join(eltern, '..', 'ausserhalb-f41'))) befunde.push('(6) Traversal-Zielordner wurde trotz 400 tatsächlich angelegt')

      // Rot: Zielordner nicht leer.
      const nichtLeerZiel = join(eltern, 'nicht-leer-projekt')
      mkdirSync(nichtLeerZiel, { recursive: true })
      writeFileSync(join(nichtLeerZiel, 'datei.txt'), 'x')
      const nichtLeer = await poste({ id: 'nicht-leer-projekt', name: 'X' })
      if (nichtLeer.status !== 400) befunde.push(`(6) nicht-leerer Zielordner: erwartet 400, erhalten ${nichtLeer.status}`)

      // Rot: Quelle nicht grün (eigener Handler gegen ein Quellrepo mit manipuliertem Hook).
      const quelleRotRepo = baueQuellRepo(externesRepo, 'manipulierter-quell-hook')
      const quelleRotHandler = erzeugeRequestHandler({ repoWurzel: quelleRotRepo, projekte: [], projektHandlerMap: new Map(), startfreigabeRepoWurzel: externesRepo })
      const quelleRotServer = await starteTestserver(erzeugeMultiProjektDispatcher(new Map(), quelleRotHandler))
      try {
        const zielFuerRot = join(dirname(quelleRotRepo), 'sollte-nicht-entstehen')
        const quelleRotAntwort = await fetch(`${quelleRotServer.basisUrl}/api/projekte`, { method: 'POST', body: JSON.stringify({ id: 'sollte-nicht-entstehen', name: 'X' }) })
        if (quelleRotAntwort.status !== 409) befunde.push(`(6) Quelle nicht grün: erwartet 409, erhalten ${quelleRotAntwort.status}`)
        if (existsSync(zielFuerRot)) befunde.push('(6) Bei roter Quelle wurde trotzdem ein Zielordner angelegt')
      } finally {
        await quelleRotServer.schliessen()
      }

      // D13: globalerLaufZustand.aktiv blockiert POST /api/projekte.
      globalerLaufZustand.aktiv = true
      globalerLaufZustand.laufId = 'ein-anderer-lauf'
      const waehrendD13 = await poste({ id: 'waehrend-d13', name: 'X' })
      if (waehrendD13.status !== 409) befunde.push(`(6) D13: POST /api/projekte während globalerLaufZustand.aktiv erwartet 409, erhalten ${waehrendD13.status}`)
      globalerLaufZustand.aktiv = false
      globalerLaufZustand.laufId = null

      // Grün-Fall: Registrierung erscheint live, ohne Neustart erreichbar, Dateien byte-identisch.
      const gruenerZielordner = join(eltern, 'gruenes-projekt')
      const gruen = await poste({ id: 'gruenes-projekt', name: 'Grünes Projekt', zielordner: gruenerZielordner })
      if (gruen.status !== 201) {
        befunde.push(`(6) Grün-Fall: erwartet 201, erhalten ${gruen.status} (${JSON.stringify(gruen.daten)})`)
      } else {
        if (!vergleicheBytes(join(quellRepo, '.claude', 'settings.json'), join(gruenerZielordner, '.claude', 'settings.json'))) {
          befunde.push('(6) Grün-Fall: settings.json im angelegten Projekt ist NICHT byte-identisch')
        }
        const geschriebeneVorlage = JSON.parse(readFileSync(join(gruenerZielordner, 'startvorlagen', 'gruenes-projekt.json'), 'utf8'))
        if ('pruefbefehl' in geschriebeneVorlage) befunde.push('(6) Grün-Fall: die im Route-Pfad geschriebene Startvorlage trägt noch pruefbefehl')

        const listeAntwort = await fetch(`${basisUrl}/api/projekte`)
        const liste = await listeAntwort.json()
        if (!liste.projekte.some((p) => p.id === 'gruenes-projekt')) befunde.push('(6) Grün-Fall: neues Projekt erscheint NICHT in GET /api/projekte')

        const liveAntwort = await fetch(`${basisUrl}/api/projekte/gruenes-projekt/laeufe`)
        if (liveAntwort.status !== 200) befunde.push(`(6) Grün-Fall: /api/projekte/gruenes-projekt/laeufe (live, ohne Neustart) erwartet 200, erhalten ${liveAntwort.status}`)

        if (befunde.length === vor + 0 && !befunde.some((b) => b.startsWith('(6)'))) {
          console.log('✓ (6) POST /api/projekte: Grün-Fall live registriert (GET /api/projekte + Dispatcher ohne Neustart, Dateien byte-identisch, keine pruefbefehl), Rot-Fälle (id/Kollision/Traversal/nicht-leer/Quelle-nicht-grün/D13) korrekt abgelehnt.')
        }
      }
    } finally {
      await schliessen()
    }
  }

  // ─── (7) Ziel nach dem Kopieren manipuliert → pruefeStartbedingung1FuerRepo erkennt Rot, ────
  // ─── raeumeAngelegtenOrdnerZurueck baut GENAU diesen Ordner zurück (Muster Auftrag (d)) ─────
  {
    const vor = befunde.length
    const ziel = join(TEST_WURZEL, `ziel-rueckbau-${randomUUID()}`)
    mkdirSync(ziel, { recursive: true })
    kopiereBaseline(quellRepo, ziel)
    writeFileSync(join(ziel, '.claude', 'hooks', 'dummy-hook.js'), 'nachtraeglich-manipuliert')
    const pruefung = pruefeStartbedingung1FuerRepo(ziel, { startfreigabeRepoWurzel: externesRepo })
    if (pruefung.ok) befunde.push('(7) Nachträglich manipuliertes Ziel wurde fälschlich als grün akzeptiert')
    const rueckbau = raeumeAngelegtenOrdnerZurueck(ziel)
    if (!rueckbau.ok) befunde.push(`(7) raeumeAngelegtenOrdnerZurueck meldete einen unerwarteten Fehlschlag: ${rueckbau.grund}`)
    if (existsSync(ziel)) befunde.push('(7) raeumeAngelegtenOrdnerZurueck hat den angelegten Ordner NICHT entfernt')
    if (befunde.length === vor) console.log('✓ (7) Rot-Fall am Ziel wird erkannt, raeumeAngelegtenOrdnerZurueck entfernt genau den angelegten Ordner.')
  }

  // ─── (8) QA-Befund: raeumeAngelegtenOrdnerZurueck wirft NIE, auch wenn rmSync real scheitert ──
  // ─── (offen gehaltenes Datei-Handle erzwingt EBUSY/EPERM unter Windows) — meldet { ok:false } ──
  {
    const vor = befunde.length
    const ziel = join(TEST_WURZEL, `ziel-gesperrt-${randomUUID()}`)
    mkdirSync(ziel, { recursive: true })
    const gesperrteDatei = join(ziel, 'gesperrte-datei.txt')
    writeFileSync(gesperrteDatei, 'wird offen gehalten')
    let handle
    try {
      handle = openSync(gesperrteDatei, 'r+')
    } catch {
      handle = undefined
    }
    let wurf = null
    let ergebnis
    try {
      ergebnis = raeumeAngelegtenOrdnerZurueck(ziel)
    } catch (fehler) {
      wurf = fehler
    } finally {
      if (handle !== undefined) closeSync(handle)
    }
    if (wurf !== null) {
      befunde.push(`(8) raeumeAngelegtenOrdnerZurueck hat trotz gesperrtem Handle geworfen (QA-Befund NICHT behoben): ${wurf.message}`)
    } else if (handle === undefined) {
      console.log('(8) übersprungen — offenes Handle konnte auf dieser Umgebung nicht erzwungen werden (kein Befund)')
    } else if (ergebnis.ok === true) {
      console.log('(8) übersprungen — rmSync hat das gesperrte Verzeichnis trotzdem entfernt (Windows-Timing, kein Befund); kein Wurf ist die eigentlich geprüfte Eigenschaft und hielt.')
    } else {
      console.log(`✓ (8) raeumeAngelegtenOrdnerZurueck wirft NICHT bei einem real gesperrten Handle, meldet stattdessen { ok:false, grund }: ${ergebnis.grund}`)
    }
    raeumeAngelegtenOrdnerZurueck(ziel)
    if (befunde.length === vor) console.log('✓ (8) Kein ungefangener Wurf — der QA-Befund (Serverabsturz-Risiko bei blockiertem Handle) ist behoben.')
  }

  // ─── (9) QA-Befund: POST /api/projekte respektiert eine überschriebene projekteLokalPfad-Option ──
  // ─── (Muster LEITSTAND_PROJEKTE_LOKAL_PFAD) statt fest join(repoWurzel, 'projekte.lokal.json') ──
  {
    const vor = befunde.length
    // Eigenes, isoliertes Quellrepo (nicht das von (6)/(9) geteilte 'quellRepo') — sonst hätte
    // (6)s Grün-Fall dort bereits regulär (Standardpfad, korrekt) eine 'projekte.lokal.json'
    // hinterlassen und den unteren "kein Schreiben am Standardort"-Check falsch scheitern lassen.
    const eigeneQuelle = baueQuellRepo(externesRepo)
    const globalerLaufZustand = { aktiv: false, laufId: null, abortController: null }
    const eigenerLokalPfad = join(TEST_WURZEL, `projekte-lokal-custom-${randomUUID()}.json`)
    const projektHandlerMap = new Map()
    const handler = erzeugeRequestHandler({
      repoWurzel: eigeneQuelle,
      basisVerzeichnis: join(eigeneQuelle, 'kontrollzustand-test-f41-9'),
      startvorlagePfad: join(eigeneQuelle, 'startvorlagen', 'ai-workforce.json'),
      globalerLaufZustand,
      projekte: [],
      projektHandlerMap,
      startfreigabeRepoWurzel: externesRepo,
      projekteLokalPfad: eigenerLokalPfad,
    })
    const { basisUrl, schliessen } = await starteTestserver(erzeugeMultiProjektDispatcher(projektHandlerMap, handler))
    try {
      const antwort = await fetch(`${basisUrl}/api/projekte`, { method: 'POST', body: JSON.stringify({ id: 'custom-pfad-projekt', name: 'X', zielordner: join(dirname(eigeneQuelle), 'custom-pfad-projekt') }) })
      if (antwort.status !== 201) befunde.push(`(9) POST /api/projekte (custom projekteLokalPfad): erwartet 201, erhalten ${antwort.status}`)
      if (!existsSync(eigenerLokalPfad)) {
        befunde.push(`(9) Der Eintrag landete NICHT unter der übergebenen projekteLokalPfad-Option ('${eigenerLokalPfad}') — QA-Befund nicht behoben`)
      } else {
        const inhalt = JSON.parse(readFileSync(eigenerLokalPfad, 'utf8'))
        if (!inhalt.projekte.some((p) => p.id === 'custom-pfad-projekt')) befunde.push(`(9) '${eigenerLokalPfad}' trägt nicht den erwarteten Eintrag: ${JSON.stringify(inhalt)}`)
        else console.log('✓ (9) POST /api/projekte schreibt in die übergebene projekteLokalPfad-Option, nicht in eine feste Konstante.')
      }
      const standardOrt = join(eigeneQuelle, 'projekte.lokal.json')
      if (existsSync(standardOrt)) befunde.push(`(9) Zusätzlich wurde fälschlich auch am Standardort geschrieben ('${standardOrt}')`)
    } finally {
      await schliessen()
    }
    if (befunde.length === vor) console.log('✓ (9) Kein Schreiben am (falschen) Standardort, wenn projekteLokalPfad überschrieben ist.')
  }
} finally {
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
