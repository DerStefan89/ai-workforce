/**
 * Datei: scripts/check-f20-leitstand-shell.test.mjs
 *
 * Zweck: Regressionsschutz für den CI-Hänger-Befund (BUG P0, state/findings.md,
 * GitHub-Actions-Lauf #34885699720): starteChrome() lehnte die Promise bei
 * einem Chrome-Startfehler NUR ab (reject), killte den gespawnten Prozess
 * aber nie — die offene stderr-Pipe hielt den Node-Prozess am Leben, CI hing
 * 20+ Minuten statt nach der Frist rot zu werden.
 *
 * Testet starteChrome/beendeProzessUndWarte GEGEN EINEN ATTRAPPEN-PROZESS
 * (`process.execPath -e '<script>'`, kein echtes Chrome) — läuft deshalb
 * überall ohne Chrome/Edge-Installation, ist Teil von `npm run test`/
 * `npm run check` (kein eigener, infrastrukturabhängiger CI-Schritt nötig
 * wie scripts/check-f20-leitstand-shell.mjs selbst). Der Beweis, dass KEIN
 * offener Handle übrig bleibt, läuft über `prozess.exitCode`/`signalCode`
 * (Node setzt diese erst, wenn der Kindprozess TATSÄCHLICH beendet ist —
 * dieselbe Bedingung, die beendeProzessUndWarte selbst zur No-op-Prüfung
 * nutzt) statt über eine OS-Prozesstabellenabfrage, die plattformabhängig
 * unterschiedlich flackern könnte (dieses Repo läuft auf Windows UND Linux-
 * CI-Runnern).
 *
 * Importiert scripts/check-f20-leitstand-shell.mjs — der istDirekterAufruf-
 * Wächter dort (Dateiende) verhindert, dass dieser Import haupt() und damit
 * einen echten Chrome-Lauf auslöst.
 */

import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { beendeProzessUndWarte, starteChrome } from './check-f20-leitstand-shell.mjs'
import { raeumeVerzeichnis } from './_aufraeumen.ts'

/** Legt ein eigenes, kurzlebiges Profilverzeichnis an (starteChrome verlangt einen existierenden Pfad für --user-data-dir, auch wenn die Attrappe ihn nie liest). */
function legeProfilVerzeichnisAn() {
  return mkdtempSync(join(tmpdir(), 'f20-shell-test-profil-'))
}

/** Ist der Kindprozess laut Node selbst nachweislich beendet (kein offener Handle)? Dieselbe Bedingung wie beendeProzessUndWartes No-op-Prüfung. */
function istNachweislichBeendet(prozess) {
  return prozess.exitCode !== null || prozess.signalCode !== null
}

test('starteChrome (Timeout-Zweig): killt den gespawnten Prozess nachweislich, statt ihn nach der Ablehnung weiterlaufen zu lassen', async () => {
  const profilVerzeichnis = legeProfilVerzeichnisAn()
  try {
    // Attrappe druckt NIE 'DevTools listening on ws://...' und bleibt am Leben (setInterval) —
    // erzwingt zuverlässig den Timeout-Zweig, den der reale CI-Hänger real durchlaufen hat.
    // Das abschließende '--' ist Pflicht: starteChrome hängt IMMER noch '--user-data-dir=...' an,
    // und OHNE '--' interpretiert Node dieses Argument selbst als (unbekannte) CLI-Option und
    // bricht sofort mit Exit-Code 9 ab, statt das Skript überhaupt laufen zu lassen.
    const attrappenArgumente = ['-e', 'setInterval(function () {}, 1000)', '--']

    let gefangenerFehler = null
    let prozessRef = null
    try {
      await starteChrome(process.execPath, profilVerzeichnis, { argumente: attrappenArgumente, timeoutMs: 300 })
    } catch (fehler) {
      gefangenerFehler = fehler
      prozessRef = fehler.prozess
    }

    assert.notStrictEqual(gefangenerFehler, null, 'starteChrome hätte wegen der 300ms-Frist ablehnen müssen')
    assert.match(gefangenerFehler.message, /keine DevTools-Adresse/)
    assert.notStrictEqual(prozessRef, undefined, 'die Ablehnung muss den betroffenen Prozess referenzieren (für genau diesen Nachweis)')
    assert.strictEqual(istNachweislichBeendet(prozessRef), true, 'REGRESSION (Befund BUG P0): der Kindprozess lief nach der Ablehnung noch — genau das ließ CI hängen')
  } finally {
    raeumeVerzeichnis(profilVerzeichnis)
  }
})

test('starteChrome (Exit-vor-DevTools-Zweig, gegengeprüft): war bereits vor dem Fix korrekt — Prozess ist beim Reject bereits real beendet', async () => {
  const profilVerzeichnis = legeProfilVerzeichnisAn()
  try {
    // Attrappe beendet sich SOFORT, ohne je die DevTools-Zeile zu drucken ('--' siehe Timeout-Test oben).
    const attrappenArgumente = ['-e', 'process.exit(3)', '--']

    let gefangenerFehler = null
    try {
      await starteChrome(process.execPath, profilVerzeichnis, { argumente: attrappenArgumente, timeoutMs: 5000 })
    } catch (fehler) {
      gefangenerFehler = fehler
    }

    assert.notStrictEqual(gefangenerFehler, null, 'starteChrome hätte wegen des sofortigen Exits ablehnen müssen')
    assert.match(gefangenerFehler.message, /vor der DevTools-Meldung beendet/)
    assert.match(gefangenerFehler.message, /Exit-Code 3/)
    assert.strictEqual(istNachweislichBeendet(gefangenerFehler.prozess), true)
  } finally {
    raeumeVerzeichnis(profilVerzeichnis)
  }
})

test('starteChrome (Spawn-Fehler-Zweig): ein nicht existierender Pfad lehnt sauber ab, statt eine unbehandelte error-Exception zu werfen', async () => {
  const profilVerzeichnis = legeProfilVerzeichnisAn()
  try {
    let gefangenerFehler = null
    try {
      await starteChrome(join(profilVerzeichnis, 'existiert-nicht.exe'), profilVerzeichnis, { timeoutMs: 5000 })
    } catch (fehler) {
      gefangenerFehler = fehler
    }
    assert.notStrictEqual(gefangenerFehler, null, 'starteChrome hätte wegen des ungültigen Pfads ablehnen müssen')
    assert.match(gefangenerFehler.message, /konnte nicht gestartet werden/)
  } finally {
    raeumeVerzeichnis(profilVerzeichnis)
  }
})

test('starteChrome (Grünfall): löst mit der real gemeldeten DevTools-Adresse auf, Prozess bleibt bis zum expliziten Beenden am Leben', async () => {
  const profilVerzeichnis = legeProfilVerzeichnisAn()
  let prozess = null
  try {
    const vorgetaeuschteAdresse = 'ws://127.0.0.1:9999/devtools/browser/f20-shell-test-fake-id'
    // '--' siehe Timeout-Test oben.
    const attrappenArgumente = ['-e', `process.stderr.write('DevTools listening on ${vorgetaeuschteAdresse}\\n'); setInterval(function () {}, 1000)`, '--']

    const ergebnis = await starteChrome(process.execPath, profilVerzeichnis, { argumente: attrappenArgumente, timeoutMs: 5000 })
    prozess = ergebnis.prozess
    assert.strictEqual(ergebnis.browserWsUrl, vorgetaeuschteAdresse)
    assert.strictEqual(istNachweislichBeendet(prozess), false, 'ein erfolgreich gestarteter Prozess darf nicht vorzeitig beendet sein — das ist Sache des Aufrufers')
  } finally {
    // beendeProzessUndWarte zweimal aufgerufen: belegt zugleich, dass ein zweiter Aufruf auf
    // einem bereits beendeten Prozess ein reines No-op ist (die exitCode/signalCode-Prüfung
    // greift), nicht ein zweites Mal kill() gegen einen toten Prozess schickt.
    await beendeProzessUndWarte(prozess)
    assert.strictEqual(prozess === null || istNachweislichBeendet(prozess), true)
    await beendeProzessUndWarte(prozess)
    raeumeVerzeichnis(profilVerzeichnis)
  }
})
