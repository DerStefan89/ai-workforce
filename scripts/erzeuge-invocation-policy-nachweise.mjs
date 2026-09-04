/**
 * Datei: scripts/erzeuge-invocation-policy-nachweise.mjs
 *
 * Zweck: Einmaliger, manueller Nachweis (kein Teil von `npm run check`/
 * `check:template`, kein CI, kein Dauerbetrieb — Präzedenz
 * scripts/verify-rename-atomicity.mjs, scripts/verify-f6a-real-run.mjs).
 * Misst den realen Ist-Zustand dieses Repos für F4/F6b (E-183/E-188,
 * F-081): Hash von `.claude/settings.json` (Werkzeugkonfiguration) plus
 * Hash jeder darin referenzierten Hook-Datei (Schutzskripte), und
 * erzeugt daraus eine BaselineEintrag- und eine
 * WirksamkeitsnachweisEintrag-JSON nach dem Schema aus
 * src/invocation-policy/index.ts. Schreibt beide Dateien in das externe
 * Autorisierungs-Repo, COMMITTET SIE ABER NICHT — Commit bleibt Stefans
 * Terminal vorbehalten (E3-Prinzip: die KI, die den Nachweis erzeugt,
 * darf ihn nicht auch selbst pinnen).
 *
 * Hook-Pfade werden strukturell aus dem geparsten `hooks`-Objekt von
 * settings.json abgeleitet (jedes Ereignis → jeder Matcher-Eintrag →
 * dessen `hooks`-Array → `command`-String), nicht aus einer
 * hartkodierten Liste — kommt morgen ein sechster Hook dazu, nimmt
 * `ermittleHookPfade` ihn automatisch mit, ohne Codeänderung.
 * `ermittleHookPfade`/`ermittleIstZustand` sind seit F6b WS-G nach
 * src/invocation-policy/index.ts verschoben (von dort importiert, hier nur
 * re-exportiert für den bestehenden Selbsttest) — dieselbe Messung nutzt
 * jetzt auch `starteGateway`, kein zweiter, unabhängig gebauter Messweg
 * (F11-Divergenzrisiko).
 * `werkzeug_version_deklariert`, `berechtigungskontext`,
 * `arbeitsverzeichnis_pfad` und `startziel_pfad` beschreiben eine
 * deklarierte Startabsicht, keinen Datei-Ist-Zustand — sie werden daher
 * bewusst nicht gemessen, sondern als Kommandozeilenargumente oder
 * Umgebungsvariablen entgegengenommen (fehlen sie, bricht das Skript
 * vor jedem Schreibvorgang ab, statt einen stillen Default zu raten).
 *
 * Wird aufgerufen von:
 * - Niemand (kein Import durch Produktionscode) — manueller CLI-Aufruf
 *   durch Stefan.
 * - scripts/erzeuge-invocation-policy-nachweise.test.mjs (Selbsttest
 *   gegen ein Wegwerf-Zielverzeichnis, liest aber das reale lokale
 *   .claude/settings.json — nur das externe Schreibziel ist eine
 *   Attrappe).
 *
 * Wichtig: Diese Datei ruft niemals `git commit` im externen Repo auf.
 * Ein Aufrufer, der das ergänzt, verletzt E3 (state/tasks/
 * f6b-ws-e-baseline-und-nachweis-real-erzeugen.md, GOAL).
 *
 * Aufruf: node scripts/erzeuge-invocation-policy-nachweise.mjs \
 *   --werkzeug-version <string> --berechtigungskontext <string> \
 *   --arbeitsverzeichnis-pfad <string> --startziel-pfad <string> \
 *   --rot-fall-beleg <string> [--repo-wurzel <pfad>] \
 *   [--baseline-id <id>] [--nachweis-id <id>]
 * (dieselben Werte auch als Umgebungsvariablen WERKZEUG_VERSION_DEKLARIERT/
 * BERECHTIGUNGSKONTEXT/ARBEITSVERZEICHNIS_PFAD/STARTZIEL_PFAD/
 * ROT_FALL_BELEG möglich, CLI-Flag hat Vorrang)
 * Exit 0 = beide Dateien geschrieben, Exit 1 = Pflichtangabe fehlt oder
 *          erzeugter Eintrag verletzt sein Schema (kein Schreibvorgang)
 */

import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256Hex } from '../src/checkpoint-store/index.ts'
import { ermittleIstZustand, validiereBaselineEintrag, validiereWirksamkeitsnachweisEintrag } from '../src/invocation-policy/index.ts'

export { ermittleHookPfade } from '../src/invocation-policy/index.ts'

// Identisch zu STANDARD_REPO_WURZEL in src/invocation-policy/index.ts:50
// (dort nicht exportiert) — über --repo-wurzel überschreibbar, u.a. für
// den Selbsttest gegen ein Wegwerf-Zielverzeichnis.
const STANDARD_REPO_WURZEL = 'C:\\Users\\stefa\\ai-workforce-autorisierung'
const STANDARD_SETTINGS_PFAD = '.claude/settings.json'

/** Aktueller Zeitstempel im ISO-8601-Format. */
function jetzt() {
  return new Date().toISOString()
}

/**
 * Misst settings.json + referenzierte Hook-Dateien real, baut Baseline-
 * und Wirksamkeitsnachweis-Einträge, validiert beide gegen ihr Schema
 * und schreibt sie — ohne Commit — unter dem bestehenden Ablagemuster
 * (invocation-policy-baseline/<id>.json bzw.
 * invocation-policy-wirksamkeitsnachweis/<id>.json) in repoWurzel.
 * @param {{repoWurzel: string, settingsPfad?: string, istUebrigeFelder: {werkzeug_version_deklariert: string, berechtigungskontext: string, arbeitsverzeichnis_pfad: string, startziel_pfad: string}, rotFallBeleg: string, baselineId?: string, nachweisId?: string}} eingaben
 */
export function erzeugeNachweise(eingaben) {
  const settingsPfad = eingaben.settingsPfad ?? join(process.cwd(), STANDARD_SETTINGS_PFAD)
  const istZustand = ermittleIstZustand(settingsPfad)
  const werkzeugKonfigurationHash = istZustand.werkzeug_konfiguration_hash
  const schutzskripte = istZustand.schutzskripte
  const repoWurzelFuerHooks = dirname(dirname(settingsPfad)) // .claude/settings.json → Repo-Wurzel

  // Repo-relativer Pfad wird aus dem tatsächlich gelesenen settingsPfad
  // abgeleitet (nicht aus der Konstante) — ein Aufrufer, der settingsPfad
  // überschreibt, bekäme sonst einen Baseline-Eintrag, dessen pfad-Feld
  // nicht zum tatsächlich gehashten Inhalt passt (Reviewer-Befund).
  const werkzeugKonfigurationPfad = relative(repoWurzelFuerHooks, settingsPfad).replace(/\\/g, '/')

  const baseline = {
    werkzeug_konfiguration: { pfad: werkzeugKonfigurationPfad, hash: werkzeugKonfigurationHash },
    schutzskripte,
    erzeugt_am: jetzt(),
  }
  const baselineVerstoesse = validiereBaselineEintrag(baseline)
  if (baselineVerstoesse.length > 0) {
    throw new Error(`Erzeugter Baseline-Eintrag verletzt sein Schema: ${baselineVerstoesse.join('; ')}`)
  }

  const nachweis = {
    gueltigkeitsschluessel: {
      werkzeug_konfiguration_hash: werkzeugKonfigurationHash,
      schutzskript_hashes: schutzskripte.map((eintrag) => eintrag.hash),
      werkzeug_version_deklariert: eingaben.istUebrigeFelder.werkzeug_version_deklariert,
      berechtigungskontext: eingaben.istUebrigeFelder.berechtigungskontext,
      arbeitsverzeichnis_pfad: eingaben.istUebrigeFelder.arbeitsverzeichnis_pfad,
      startziel_pfad: eingaben.istUebrigeFelder.startziel_pfad,
    },
    rot_fall_beleg: eingaben.rotFallBeleg,
    geprueft_am: jetzt(),
  }
  const nachweisVerstoesse = validiereWirksamkeitsnachweisEintrag(nachweis)
  if (nachweisVerstoesse.length > 0) {
    throw new Error(`Erzeugter Wirksamkeitsnachweis-Eintrag verletzt sein Schema: ${nachweisVerstoesse.join('; ')}`)
  }

  const baselineId = eingaben.baselineId ?? randomUUID()
  const nachweisId = eingaben.nachweisId ?? randomUUID()
  const baselineInhalt = JSON.stringify(baseline, null, 2)
  const nachweisInhalt = JSON.stringify(nachweis, null, 2)
  const baselinePfad = join(eingaben.repoWurzel, 'invocation-policy-baseline', `${baselineId}.json`)
  const nachweisPfad = join(eingaben.repoWurzel, 'invocation-policy-wirksamkeitsnachweis', `${nachweisId}.json`)

  mkdirSync(dirname(baselinePfad), { recursive: true })
  writeFileSync(baselinePfad, baselineInhalt)
  mkdirSync(dirname(nachweisPfad), { recursive: true })
  writeFileSync(nachweisPfad, nachweisInhalt)

  return {
    baseline,
    baselinePfad,
    baselineDateiHash: sha256Hex(baselineInhalt),
    nachweis,
    nachweisPfad,
    nachweisDateiHash: sha256Hex(nachweisInhalt),
  }
}

// ─── CLI-Einstieg (läuft nur bei direktem Aufruf, nicht beim Import durch
// den Selbsttest — die Pflichtfeld-Prüfung unten soll den Test nicht dazu
// zwingen, alle Werte über argv/env statt direkt über erzeugeNachweise() zu
// setzen) ─────────────────────────────────────────────────────────────────
const istDirekterAufruf = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (istDirekterAufruf) {
  /** Parst --flag wert-Paare; ein Folgetoken, das selbst mit -- beginnt, gilt als nächstes Flag statt als Wert (verhindert Fehlzuordnung bei fehlendem Wert). */
  function leseFlags(argv) {
    const flags = {}
    for (let i = 0; i < argv.length; i++) {
      if (!argv[i].startsWith('--')) continue
      const name = argv[i].slice(2)
      const naechstesToken = argv[i + 1]
      if (naechstesToken !== undefined && !naechstesToken.startsWith('--')) {
        flags[name] = naechstesToken
        i++
      } else {
        flags[name] = undefined
      }
    }
    return flags
  }

  /** Liest einen Pflichtwert erst aus dem CLI-Flag, sonst aus der Umgebungsvariable. */
  function pflichtwert(flags, flagName, envName) {
    return flags[flagName] ?? process.env[envName]
  }

  const flags = leseFlags(process.argv.slice(2))

  const istUebrigeFelder = {
    werkzeug_version_deklariert: pflichtwert(flags, 'werkzeug-version', 'WERKZEUG_VERSION_DEKLARIERT'),
    berechtigungskontext: pflichtwert(flags, 'berechtigungskontext', 'BERECHTIGUNGSKONTEXT'),
    arbeitsverzeichnis_pfad: pflichtwert(flags, 'arbeitsverzeichnis-pfad', 'ARBEITSVERZEICHNIS_PFAD'),
    startziel_pfad: pflichtwert(flags, 'startziel-pfad', 'STARTZIEL_PFAD'),
  }
  const rotFallBeleg = pflichtwert(flags, 'rot-fall-beleg', 'ROT_FALL_BELEG')

  const fehlend = Object.entries(istUebrigeFelder)
    .filter(([, wert]) => wert === undefined)
    .map(([feld]) => feld)
  if (rotFallBeleg === undefined) fehlend.push('rot_fall_beleg')

  if (fehlend.length > 0) {
    console.log('\n=== F6b WS-E — Invocation-Policy-Nachweise erzeugen ===\n')
    console.log(`✗ Pflichtangabe(n) fehlen: ${fehlend.join(', ')}\n`)
    console.log(
      'Aufruf: node scripts/erzeuge-invocation-policy-nachweise.mjs \\\n' +
        '  --werkzeug-version <string> --berechtigungskontext <string> \\\n' +
        '  --arbeitsverzeichnis-pfad <string> --startziel-pfad <string> \\\n' +
        '  --rot-fall-beleg <string> [--repo-wurzel <pfad>]\n' +
        '(alternativ als Umgebungsvariablen WERKZEUG_VERSION_DEKLARIERT/BERECHTIGUNGSKONTEXT/\n' +
        'ARBEITSVERZEICHNIS_PFAD/STARTZIEL_PFAD/ROT_FALL_BELEG)\n'
    )
    process.exit(1)
  }

  const repoWurzel = flags['repo-wurzel'] ?? STANDARD_REPO_WURZEL

  console.log('\n=== F6b WS-E — Invocation-Policy-Nachweise erzeugen (state/tasks/f6b-ws-e-baseline-und-nachweis-real-erzeugen.md) ===\n')
  console.log(`Werkzeugkonfiguration: ${STANDARD_SETTINGS_PFAD}`)
  console.log(`Externes Repo (Schreibziel, KEIN Commit): ${repoWurzel}\n`)

  let ergebnis
  try {
    ergebnis = erzeugeNachweise({
      repoWurzel,
      istUebrigeFelder,
      rotFallBeleg,
      baselineId: flags['baseline-id'],
      nachweisId: flags['nachweis-id'],
    })
  } catch (fehler) {
    console.log(`✗ ${fehler.message}\n`)
    process.exit(1)
  }

  console.log(`Werkzeugkonfiguration-Hash: ${ergebnis.baseline.werkzeug_konfiguration.hash}`)
  console.log(`Schutzskripte (${ergebnis.baseline.schutzskripte.length}):`)
  for (const eintrag of ergebnis.baseline.schutzskripte) {
    console.log(`  - ${eintrag.pfad}  ${eintrag.hash}`)
  }
  console.log('')
  console.log(`✓ Baseline geschrieben: ${ergebnis.baselinePfad}`)
  console.log(`  Datei-Hash: ${ergebnis.baselineDateiHash}`)
  console.log(`✓ Wirksamkeitsnachweis geschrieben: ${ergebnis.nachweisPfad}`)
  console.log(`  Datei-Hash: ${ergebnis.nachweisDateiHash}\n`)

  console.log(
    'Nächster Schritt (Stefans Terminal, NICHT dieses Skript): im externen Repo\n' +
      '`git add` + `git commit`, danach commit_hash unten eintragen.\n'
  )
  console.log('BaselineReferenz (Kopiervorlage, commit_hash erst nach git add + git commit im externen Repo bekannt, hier manuell eintragen):')
  console.log(
    JSON.stringify(
      { pfad: ergebnis.baselinePfad, commit_hash: 'HIER EINTRAGEN NACH git commit', datei_hash: ergebnis.baselineDateiHash },
      null,
      2
    )
  )
  console.log('\nWirksamkeitsnachweisReferenz (Kopiervorlage, commit_hash erst nach git add + git commit im externen Repo bekannt, hier manuell eintragen):')
  console.log(
    JSON.stringify(
      { pfad: ergebnis.nachweisPfad, commit_hash: 'HIER EINTRAGEN NACH git commit', datei_hash: ergebnis.nachweisDateiHash },
      null,
      2
    )
  )
  console.log('')
  process.exit(0)
}
