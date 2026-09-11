/**
 * Datei: src/result-evaluator/result-evaluator.test.ts
 *
 * Zweck: node:test-Fälle für den Result Evaluator (F7,
 * state/tasks/f7-result-evaluator.md). Deckt die drei Terminalausgänge,
 * die Rohstrom-Integritätsprüfung (Hash-Abweichung, fehlende Datei), die
 * Prüfreihenfolge (AK2: unvollständige Beobachtungsbasis schlägt eine
 * gleichzeitig vorliegende Verweigerung), den defensiven Umgang mit einem
 * fehlenden `permission_denials`-Feld, den tool_input→Tokens-Adapter gegen
 * die realen TP-03d-Messfälle 2/3 und zwei konstruierte E-186-Treffer
 * (einfaches Token, in Shell-Quoting eingebettetes Token — plan-v1
 * Abschnitt 8.4) sowie die informative Durchreichung von
 * `is_error`/`non_execution_kind` (F-061). Nutzt F6as
 * attrappeMitValidemErgebnis/attrappeOhneErgebnisobjekt wörtlich (D5, statt
 * TP-03d Messfall 1 / TP-01e Messfall A neu abzutippen).
 *
 * F14 WS-3 (AK5/AK6): TIMEOUT/ABBRUCH-Rohstrom → grund 'timeout'/
 * 'abgebrochen_manuell' statt des generischen beobachtungsbasis_
 * unvollstaendig, plus Regression, dass beendigungsart:null/fehlend die
 * bestehende Klassifikation unverändert lässt, und dass die geschriebene
 * Terminalmarke daten.letzter_gueltiger_checkpoint (AK6) trägt.
 *
 * F16 WS-2 (AK8): der Codex-Zweig, jeder Prüfschritt einzeln rot
 * kalibriert. Die JSONL-Fixtures sind wörtlich aus den realen Läufen in
 * state/tp-m3-01b-codex-sandbox.md übernommen. Zwei Fälle sind der
 * eigentliche Punkt der Weiche: derselbe Rohstrom OHNE worker-Feld landet
 * im Claude-Code-Zweig und scheitert dort an leseErgebnisobjekt (F-283),
 * und ein Lauf mit Klartext-Blockademeldung wird NICHT VERWEIGERT (F-300).
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { attrappeMitValidemErgebnis, attrappeOhneErgebnisobjekt } from '../claude-code-gateway/prozessstart.ts'
import type { LaufakteV0Daten } from '../claude-code-gateway/types.ts'
import { ladeGueltigeCheckpoints, ladeLetztenGueltigenCheckpoint, schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { klassifiziereLauf } from './index.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const ROH_BASIS = join(tmpdir(), 'f7-result-evaluator-test')
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function schreibeRohstrom(
  laufId: string,
  prozessErgebnis: { stdout: string; stderr: string; exitCode: number | null; beendigungsart?: 'TIMEOUT' | 'ABBRUCH' | null }
): { pfad: string; inhalts_hash: string } {
  const verzeichnis = join(ROH_BASIS, laufId)
  mkdirSync(verzeichnis, { recursive: true })
  const inhalt = JSON.stringify(prozessErgebnis)
  const pfad = join(verzeichnis, 'rohstrom.json')
  writeFileSync(pfad, inhalt, 'utf8')
  return { pfad, inhalts_hash: sha256Hex(inhalt) }
}

function baueLaufakte(
  laufId: string,
  rohstromReferenz: { pfad: string; inhalts_hash: string },
  beobachtungsbasisVollstaendig: boolean
): LaufakteV0Daten {
  return {
    laufakte_schema: 'v0',
    lauf_id: laufId,
    werkzeug_version_deklariert: '2.1.241',
    berechtigungskontext: 'profil-standard',
    arbeitsverzeichnis_pfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
    modell_beobachtet: null,
    beobachtungsbasis_vollstaendig: beobachtungsbasisVollstaendig,
    rohstrom_referenz: rohstromReferenz,
    erstellt_am: new Date().toISOString(),
  }
}

function raeumeKette(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
}

/** Schreibt einen wörtlichen Rohstrom-String (statt eines serialisierten {stdout,stderr,exitCode}-Objekts) — für Fixtures, die einen defekten/untypischen Rohstrominhalt konstruieren. */
function schreibeRohstromRoh(laufId: string, inhalt: string): { pfad: string; inhalts_hash: string } {
  const verzeichnis = join(ROH_BASIS, laufId)
  mkdirSync(verzeichnis, { recursive: true })
  const pfad = join(verzeichnis, 'rohstrom.json')
  writeFileSync(pfad, inhalt, 'utf8')
  return { pfad, inhalts_hash: sha256Hex(inhalt) }
}

test('ERFOLGREICH: TP-03d Messfall 1 (permission_denials leer, gültiges Ergebnisobjekt)', async () => {
  const laufId = neueLaufId('erfolgreich')
  try {
    const prozessErgebnis = await attrappeMitValidemErgebnis([], [])
    const rohstromReferenz = schreibeRohstrom(laufId, prozessErgebnis)
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('VERWEIGERT: TP-03d Messfall 2 (tool_input mit query, kein Verbotswert)', () => {
  const laufId = neueLaufId('verweigert-query')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [
        {
          tool_name: 'WebSearch',
          tool_use_id: 'toolu_015PBDumsC2FBva8TjNrQyTv',
          tool_input: { query: 'example.com "This domain is for use in illustrative examples"' },
        },
      ],
      result: 'Ich habe keinen Zugriff auf ein WebFetch-Tool in dieser Umgebung, und die Nutzung von WebSearch wurde nicht freigegeben.',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'VERWEIGERT')
    assert.equal(ergebnis.ergebnis === 'VERWEIGERT' && ergebnis.bypass_verdacht_anzahl, 0)
  } finally {
    raeumeKette(laufId)
  }
})

test('VERWEIGERT: TP-03d Messfall 3 (tool_input mit command, kein Verbotswert)', () => {
  const laufId = neueLaufId('verweigert-command')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [
        {
          tool_name: 'Bash',
          tool_use_id: 'toolu_01245zrQBLYwK3VjtkruxRWK',
          tool_input: { command: 'npm run allowlist-redfall-probe' },
        },
      ],
      result: 'Der Befehl wurde nicht ausgeführt — er benötigt eine explizite Genehmigung, die ich nicht erhalten habe.',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'VERWEIGERT')
    assert.equal(ergebnis.ergebnis === 'VERWEIGERT' && ergebnis.bypass_verdacht_anzahl, 0)
  } finally {
    raeumeKette(laufId)
  }
})

test('E-186: konstruierter tool_input.command mit Verbotswert aus VERBOTENE_AUFRUFPARAMETER wird gezählt', () => {
  const laufId = neueLaufId('bypass-verdacht')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_konstruiert', tool_input: { command: 'npm run test --dangerously-skip-permissions' } }],
      result: 'verweigert',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'VERWEIGERT')
    assert.equal(ergebnis.ergebnis === 'VERWEIGERT' && ergebnis.bypass_verdacht_anzahl, 1)
  } finally {
    raeumeKette(laufId)
  }
})

test('E-186 (plan-v1 8.4): in Shell-Quoting eingebetteter Verbotswert wird trotzdem gezählt', () => {
  const laufId = neueLaufId('bypass-verdacht-embedded')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_konstruiert-embedded', tool_input: { command: "sh -c 'echo --dangerously-skip-permissions'" } }],
      result: 'verweigert',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'VERWEIGERT')
    assert.equal(ergebnis.ergebnis === 'VERWEIGERT' && ergebnis.bypass_verdacht_anzahl, 1)
  } finally {
    raeumeKette(laufId)
  }
})

test('FEHLGESCHLAGEN: Rohstrom-Hash weicht von rohstrom_referenz.inhalts_hash ab', async () => {
  const laufId = neueLaufId('hash-abweichung')
  try {
    const prozessErgebnis = await attrappeMitValidemErgebnis([], [])
    const rohstromReferenz = schreibeRohstrom(laufId, prozessErgebnis)
    const laufakte = baueLaufakte(laufId, { pfad: rohstromReferenz.pfad, inhalts_hash: 'f'.repeat(64) }, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'rohstrom_integritaet')
  } finally {
    raeumeKette(laufId)
  }
})

test('FEHLGESCHLAGEN: rohstrom_referenz.pfad existiert nicht', () => {
  const laufId = neueLaufId('rohstrom-fehlt')
  try {
    const laufakte = baueLaufakte(laufId, { pfad: join(ROH_BASIS, 'existiert-nicht', 'rohstrom.json'), inhalts_hash: 'a'.repeat(64) }, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'rohstrom_fehlt')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK2: beobachtungsbasis_vollstaendig:false gewinnt gegen ein gleichzeitig nicht-leeres permission_denials', () => {
  const laufId = neueLaufId('ak2-prioritaet')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_ak2', tool_input: { command: 'echo hallo' } }],
      result: 'verweigert',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'beobachtungsbasis_unvollstaendig')
  } finally {
    raeumeKette(laufId)
  }
})

test('ERFOLGREICH: fehlendes permission_denials-Feld wird wie ein leeres Array behandelt (Design-Entscheidung 4)', () => {
  const laufId = neueLaufId('fehlendes-feld')
  try {
    const stdout = JSON.stringify({ type: 'result', result: 'Ausgabe ohne permission_denials-Feld' })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('is_error/non_execution_kind werden informativ durchgereicht, ohne die Klassifikation zu beeinflussen (F-061)', () => {
  const laufId = neueLaufId('informativ')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [],
      is_error: true,
      non_execution_kind: 'diagnose-wert',
      result: 'Ausgabe mit informativen Feldern',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
    assert.equal(ergebnis.ergebnis === 'ERFOLGREICH' && ergebnis.is_error, true)
    assert.equal(ergebnis.ergebnis === 'ERFOLGREICH' && ergebnis.non_execution_kind, 'diagnose-wert')
  } finally {
    raeumeKette(laufId)
  }
})

test('FEHLGESCHLAGEN: TP-01e Messfall A (kein Ergebnisobjekt, beobachtungsbasis_vollstaendig:false)', async () => {
  const laufId = neueLaufId('beobachtungsbasis-unvollstaendig')
  try {
    const prozessErgebnis = await attrappeOhneErgebnisobjekt([], [])
    const rohstromReferenz = schreibeRohstrom(laufId, prozessErgebnis)
    const laufakte = baueLaufakte(laufId, rohstromReferenz, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'beobachtungsbasis_unvollstaendig')
  } finally {
    raeumeKette(laufId)
  }
})

test('FEHLGESCHLAGEN: Rohstrominhalt ist trotz passendem Hash kein gültiges JSON (grund: kein_ergebnisobjekt)', () => {
  const laufId = neueLaufId('kein-ergebnisobjekt-defektes-json')
  try {
    const rohstromReferenz = schreibeRohstromRoh(laufId, 'das ist kein JSON')
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'kein_ergebnisobjekt')
  } finally {
    raeumeKette(laufId)
  }
})

test('FEHLGESCHLAGEN: gültiger Rohstrom-Umschlag, aber stdout liefert kein "type":"result"-Objekt trotz beobachtungsbasis_vollstaendig:true (Diagnosefall, plan-v1 Abschnitt 2 Punkt 3)', () => {
  const laufId = neueLaufId('kein-ergebnisobjekt-falscher-type')
  try {
    const stdout = JSON.stringify({ type: 'system', subtype: 'init' })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'kein_ergebnisobjekt')
  } finally {
    raeumeKette(laufId)
  }
})

test('ERFOLGREICH: permission_denials als Nicht-Array-Wert wird wie ein leeres Array behandelt (Design-Entscheidung 4)', () => {
  const laufId = neueLaufId('permission-denials-kein-array')
  try {
    const stdout = JSON.stringify({ type: 'result', permission_denials: 'kein-array', result: 'Ausgabe mit untypischem permission_denials-Feld' })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('is_error/non_execution_kind werden auch im VERWEIGERT-Zweig informativ durchgereicht', () => {
  const laufId = neueLaufId('informativ-verweigert')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_informativ_verweigert', tool_input: { command: 'echo hallo' } }],
      is_error: true,
      non_execution_kind: 'diagnose-wert-verweigert',
      result: 'verweigert, mit informativen Feldern',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'VERWEIGERT')
    assert.equal(ergebnis.ergebnis === 'VERWEIGERT' && ergebnis.is_error, true)
    assert.equal(ergebnis.ergebnis === 'VERWEIGERT' && ergebnis.non_execution_kind, 'diagnose-wert-verweigert')
  } finally {
    raeumeKette(laufId)
  }
})

test('VERWEIGERT: daten.bypass_verdacht_anzahl kommt im geschriebenen Wirkungsmarke-Eintrag an (F-160)', () => {
  const laufId = neueLaufId('daten-bypass-verdacht')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_daten_bypass', tool_input: { command: 'npm run test --dangerously-skip-permissions' } }],
      is_error: true,
      non_execution_kind: 'diagnose-wert-daten',
      result: 'verweigert',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'VERWEIGERT')

    const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const terminal = kette.find((eintrag) => eintrag.payload.selbst_hash === ergebnis.wirkungsmarke.selbstHash)
    assert.ok(terminal, 'terminaler Wirkungsmarke-Eintrag muss in der Kette auffindbar sein')
    const daten = (terminal?.payload as { daten?: { bypass_verdacht_anzahl?: number; is_error?: unknown; non_execution_kind?: unknown } }).daten
    assert.equal(daten?.bypass_verdacht_anzahl, 1)
    assert.equal(daten?.is_error, true)
    assert.equal(daten?.non_execution_kind, 'diagnose-wert-daten')
  } finally {
    raeumeKette(laufId)
  }
})

test('bekannte Grenze des tool_input-Adapters: ein Verbotswert ohne Wortgrenze (angehängtes Suffix statt eigenständigem Token) wird NICHT gezählt', () => {
  const laufId = neueLaufId('bypass-grenze-ohne-wortgrenze')
  try {
    const stdout = JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_grenzfall', tool_input: { command: 'npm run test--dangerously-skip-permissions' } }],
      result: 'verweigert',
    })
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout, stderr: '', exitCode: 0 })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, true)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'VERWEIGERT')
    // Dokumentierte Grenze (siehe index.ts-Docstring, state/findings.md F-066): pruefeAufrufparameter (F4)
    // vergleicht exakte Tokens, keine Teilstrings — ein an ein anderes Token angehängter Verbotswert bleibt ungezählt.
    assert.equal(ergebnis.ergebnis === 'VERWEIGERT' && ergebnis.bypass_verdacht_anzahl, 0)
  } finally {
    raeumeKette(laufId)
  }
})

test('dokumentiertes F1B-Verhalten: ein zweiter Terminal-Schreibvorgang für dieselbe laufId überschreibt das über stelleLaufstatusFest sichtbare ergebnis nicht (F-067)', async () => {
  const laufId = neueLaufId('doppelaufruf')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    const ersteFixture = await attrappeMitValidemErgebnis([], [])
    const ersteRohstromReferenz = schreibeRohstrom(laufId, ersteFixture)
    klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte: baueLaufakte(laufId, ersteRohstromReferenz, true) }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    const zweiteStdout = JSON.stringify({
      type: 'result',
      permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_doppelaufruf', tool_input: { command: 'echo hallo' } }],
      result: 'verweigert beim zweiten Aufruf',
    })
    const zweiteRohstromReferenz = schreibeRohstrom(`${laufId}-zweiter`, { stdout: zweiteStdout, stderr: '', exitCode: 0 })
    klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte: baueLaufakte(laufId, zweiteRohstromReferenz, true) }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(status.status, 'ABGESCHLOSSEN')
    // F1B paart FIFO: der ERSTE Terminal-Schreibvorgang löst die einzige offene run_prepared-Sequenz auf,
    // der zweite landet unpaariert in terminaleOhneRunPrepared — das sichtbare ergebnis bleibt das erste (ERFOLGREICH),
    // nicht VERWEIGERT vom zweiten Aufruf. Ein Doppelaufruf verschwindet nicht still (terminaleOhneRunPrepared ist nicht leer),
    // aber das ergebnis-Feld zeigt nicht automatisch den zuletzt geschriebenen Wert.
    assert.equal(status.status === 'ABGESCHLOSSEN' && status.ergebnis, 'ERFOLGREICH')
    assert.equal(status.terminaleOhneRunPrepared.length, 1)
  } finally {
    raeumeKette(laufId)
  }
})

test('F14 WS-3 AK5: beendigungsart TIMEOUT klassifiziert als FEHLGESCHLAGEN/timeout, nicht beobachtungsbasis_unvollstaendig', () => {
  const laufId = neueLaufId('timeout')
  try {
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout: '', stderr: '', exitCode: null, beendigungsart: 'TIMEOUT' })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'timeout')
  } finally {
    raeumeKette(laufId)
  }
})

test('F14 WS-3 AK5: beendigungsart ABBRUCH klassifiziert als FEHLGESCHLAGEN/abgebrochen_manuell, nicht beobachtungsbasis_unvollstaendig', () => {
  const laufId = neueLaufId('abbruch')
  try {
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout: '', stderr: '', exitCode: null, beendigungsart: 'ABBRUCH' })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'abgebrochen_manuell')
  } finally {
    raeumeKette(laufId)
  }
})

test('F14 WS-3 Regression: beendigungsart:null lässt beobachtungsbasis_unvollstaendig unverändert', () => {
  const laufId = neueLaufId('regression-beendigungsart-null')
  try {
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout: '', stderr: '', exitCode: 137, beendigungsart: null })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'beobachtungsbasis_unvollstaendig')
  } finally {
    raeumeKette(laufId)
  }
})

test('F14 WS-3 AK6: Terminalmarke für TIMEOUT trägt daten.art/grund/beendigungsart und den davor gültigen Checkpoint', () => {
  const laufId = neueLaufId('ak6-timeout-daten')
  try {
    const { selbstHash: runPreparedHash } = schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const vorherigerCheckpoint = ladeLetztenGueltigenCheckpoint(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(vorherigerCheckpoint?.payload.selbst_hash, runPreparedHash)

    const rohstromReferenz = schreibeRohstrom(laufId, { stdout: '', stderr: '', exitCode: null, beendigungsart: 'TIMEOUT' })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')

    const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const terminal = kette.find((eintrag) => eintrag.payload.selbst_hash === ergebnis.wirkungsmarke.selbstHash)
    assert.ok(terminal, 'terminaler Wirkungsmarke-Eintrag muss in der Kette auffindbar sein')
    const daten = (
      terminal?.payload as {
        daten?: { art?: string; grund?: string; beendigungsart?: string; letzter_gueltiger_checkpoint?: { payload: { selbst_hash: string } } | null }
      }
    ).daten

    assert.equal(daten?.art, 'TIMEOUT')
    assert.equal(daten?.grund, 'timeout')
    assert.equal(daten?.beendigungsart, 'TIMEOUT')
    assert.equal(daten?.letzter_gueltiger_checkpoint?.payload.selbst_hash, runPreparedHash)
  } finally {
    raeumeKette(laufId)
  }
})

test('F14 WS-3 AK6: Terminalmarke für ABBRUCH trägt daten.art:MANUELL/beendigungsart:ABBRUCH', () => {
  const laufId = neueLaufId('ak6-abbruch-daten')
  try {
    const { selbstHash: runPreparedHash } = schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    const rohstromReferenz = schreibeRohstrom(laufId, { stdout: '', stderr: '', exitCode: null, beendigungsart: 'ABBRUCH' })
    const laufakte = baueLaufakte(laufId, rohstromReferenz, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')

    const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const terminal = kette.find((eintrag) => eintrag.payload.selbst_hash === ergebnis.wirkungsmarke.selbstHash)
    assert.ok(terminal, 'terminaler Wirkungsmarke-Eintrag muss in der Kette auffindbar sein')
    const daten = (
      terminal?.payload as {
        daten?: { art?: string; grund?: string; beendigungsart?: string; letzter_gueltiger_checkpoint?: { payload: { selbst_hash: string } } | null }
      }
    ).daten

    assert.equal(daten?.art, 'MANUELL')
    assert.equal(daten?.grund, 'abgebrochen_manuell')
    assert.equal(daten?.beendigungsart, 'ABBRUCH')
    assert.equal(daten?.letzter_gueltiger_checkpoint?.payload.selbst_hash, runPreparedHash)
  } finally {
    raeumeKette(laufId)
  }
})

test('F14 WS-3 AK5: Rohstrom-Integritätsprüfung schlägt auch bei beendigungsart:TIMEOUT zuerst zu (grund bleibt rohstrom_integritaet)', async () => {
  const laufId = neueLaufId('timeout-plus-hash-abweichung')
  try {
    const rohstromReferenz = schreibeRohstrom(laufId, { stdout: '', stderr: '', exitCode: null, beendigungsart: 'TIMEOUT' })
    const laufakte = baueLaufakte(laufId, { pfad: rohstromReferenz.pfad, inhalts_hash: 'f'.repeat(64) }, false)

    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' && ergebnis.grund, 'rohstrom_integritaet')
  } finally {
    raeumeKette(laufId)
  }
})

// ─── F16 WS-2 (AK8): Codex-Zweig ────────────────────────────────────────────
// Jeder Zweig einzeln rot kalibriert. Die JSONL-Zeilen sind wörtlich aus den
// realen Läufen in state/tp-m3-01b-codex-sandbox.md übernommen (Lauf (a) für
// den Erfolgsfall, Lauf (o) für den schemakonformen Fall, Lauf (n) für das
// error-Ereignis, Lauf (h) für die Klartext-Blockade) — kein erfundenes JSONL.

/** Lauf (a), gekürzt auf die für die Klassifikation tragenden Zeilen: thread.started → turn.started → agent_message → turn.completed. */
const CODEX_STDOUT_ERFOLG = [
  '{"type":"thread.started","thread_id":"01a08f5d-1ab2-7ac2-9b41-6bdb224047af"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_3","type":"agent_message","text":"Im aktuellen Verzeichnis liegen 2 Dateien."}}',
  '{"type":"turn.completed","usage":{"input_tokens":31560,"output_tokens":175}}',
].join('\n')

/** Lauf (o): die LETZTE agent_message trägt das schemakonforme JSON-Objekt, die erste freien Text (F-308). */
const CODEX_STDOUT_SCHEMAKONFORM = [
  '{"type":"thread.started","thread_id":"01a08f64-5c5c-7a41-98cf-f4bdf9c4387b"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Ich lese a.txt und prüfe den Inhalt auf konkrete Fehler."}}',
  '{"type":"item.completed","item":{"id":"item_2","type":"agent_message","text":"{\\"urteil\\":\\"BLOCKIERT\\",\\"befunde\\":[],\\"empfehlung\\":\\"kein prüfbarer Code\\"}"}}',
  '{"type":"turn.completed","usage":{"input_tokens":32158,"output_tokens":167}}',
].join('\n')

/** Lauf (n): ohne Anmeldung erscheint ein error-Ereignis auf stdout — der einzige real belegte Weg, auf dem ein Codex-Fehlschlag strukturiert sichtbar wird. */
const CODEX_STDOUT_ERROR = [
  '{"type":"thread.started","thread_id":"01a08f61-0c6e-7662-99a5-a843c049f88a"}',
  '{"type":"turn.started"}',
  '{"type":"error","message":"Reconnecting... 2/5 (unexpected status 401 Unauthorized)"}',
].join('\n')

const CODEX_TOKENS_OHNE_SCHEMA = ['exec', '--json', '--sandbox', 'read-only', '--model', 'gpt-5-codex', 'Prompt']
const CODEX_TOKENS_MIT_SCHEMA = [
  'exec',
  '--json',
  '--sandbox',
  'read-only',
  '--model',
  'gpt-5-codex',
  '--output-schema',
  'C:\\repo\\schemas\\ergebnis-code-reviewer.schema.json',
  'Prompt',
]

/** Schreibt einen Rohstrom in der von starteCodexGateway erzeugten Form (inkl. tokens, AK7). */
function schreibeCodexRohstrom(
  laufId: string,
  werte: { stdout: string; exitCode: number | null; tokens?: string[]; beendigungsart?: 'TIMEOUT' | 'ABBRUCH' | null }
): { pfad: string; inhalts_hash: string } {
  const verzeichnis = join(ROH_BASIS, laufId)
  mkdirSync(verzeichnis, { recursive: true })
  const inhalt = JSON.stringify({
    werkzeugStartziel: ['C:\\codex\\codex.exe'],
    tokens: werte.tokens ?? CODEX_TOKENS_OHNE_SCHEMA,
    stdout: werte.stdout,
    // Wörtlich aus Lauf (a): eine ERROR-Zeile auf stderr bei Exit-Code 0
    // (F-309). Sie steht in JEDEM dieser Fixtures, damit ein Evaluator, der
    // stderr auswerten würde, hier zwangsläufig falsch klassifizierte.
    stderr: 'ERROR codex_models_manager::manager: failed to refresh available models',
    exitCode: werte.exitCode,
    startfehler: null,
    beendigungsart: werte.beendigungsart ?? null,
  })
  const pfad = join(verzeichnis, 'rohstrom.json')
  writeFileSync(pfad, inhalt, 'utf8')
  return { pfad, inhalts_hash: sha256Hex(inhalt) }
}

function baueCodexLaufakte(
  laufId: string,
  rohstromReferenz: { pfad: string; inhalts_hash: string },
  beobachtungsbasisVollstaendig: boolean
): LaufakteV0Daten {
  return {
    ...baueLaufakte(laufId, rohstromReferenz, beobachtungsbasisVollstaendig),
    berechtigungskontext: 'codex-sandbox-read-only',
    worker: 'codex',
    modell_deklariert: 'gpt-5-codex',
  }
}

test('AK8 gruen: ein Codex-Lauf mit turn.completed und Exit 0 ist ERFOLGREICH', () => {
  const laufId = neueLaufId('codex-erfolg')
  try {
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 (F-283, der Punkt der Weiche): derselbe Rohstrom OHNE worker-Feld landet im Claude-Code-Zweig und scheitert an leseErgebnisobjekt', () => {
  const laufId = neueLaufId('codex-ohne-worker')
  try {
    // Identischer Rohstrom, einziger Unterschied: kein worker: 'codex'.
    // Ohne die Weiche wäre das der Normalfall JEDES Codex-Laufs — der Fall
    // belegt, dass die Weiche und nicht ein Zufall den Erfolgsfall oben
    // trägt.
    const laufakte = baueLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'FEHLGESCHLAGEN')
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'kein_ergebnisobjekt')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: fehlender Rohstrom → rohstrom_fehlt (vor allen Codex-Zweigen)', () => {
  const laufId = neueLaufId('codex-rohstrom-fehlt')
  try {
    const laufakte = baueCodexLaufakte(laufId, { pfad: join(ROH_BASIS, laufId, 'gibt-es-nicht.json'), inhalts_hash: 'b'.repeat(64) }, true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'rohstrom_fehlt')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: manipulierter Rohstrom-Hash → rohstrom_integritaet', () => {
  const laufId = neueLaufId('codex-integritaet')
  try {
    const referenz = schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: 0 })
    const laufakte = baueCodexLaufakte(laufId, { ...referenz, inhalts_hash: 'c'.repeat(64) }, true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'rohstrom_integritaet')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: beendigungsart TIMEOUT schlaegt den Codex-Zweig (spezifischer vor generischer)', () => {
  const laufId = neueLaufId('codex-timeout')
  try {
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: '', exitCode: null, beendigungsart: 'TIMEOUT' }), false)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'timeout')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: beendigungsart ABBRUCH → abgebrochen_manuell', () => {
  const laufId = neueLaufId('codex-abbruch')
  try {
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: '', exitCode: null, beendigungsart: 'ABBRUCH' }), false)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'abgebrochen_manuell')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: abgeschnittener Strom (weder turn.completed noch turn.failed) → beobachtungsbasis_unvollstaendig', () => {
  const laufId = neueLaufId('codex-basis')
  try {
    const abgeschnitten = '{"type":"thread.started","thread_id":"01a08f5d"}\n{"type":"turn.started"}'
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: abgeschnitten, exitCode: 0 }), false)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'beobachtungsbasis_unvollstaendig')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: ein error-Ereignis im Strom → turn_failed, auch bei Exit-Code 0', () => {
  const laufId = neueLaufId('codex-error')
  try {
    // Exit-Code 0 ist hier bewusst gesetzt: turn_failed muss VOR exit_code
    // greifen, sonst ginge ein gescheiterter Turn mit sauberem Prozessende
    // verloren.
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERROR, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'turn_failed')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: turn.failed im Strom → turn_failed', () => {
  const laufId = neueLaufId('codex-turn-failed')
  try {
    const stdout = '{"type":"turn.started"}\n{"type":"turn.failed","error":{"message":"HTTP 400"}}'
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'turn_failed')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: Exit-Code ungleich 0 bei sonst vollstaendigem Strom → exit_code', () => {
  const laufId = neueLaufId('codex-exit')
  try {
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: 1 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'exit_code')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 gruen: mit --output-schema und JSON-Objekt in der LETZTEN agent_message → ERFOLGREICH', () => {
  const laufId = neueLaufId('codex-schema-gruen')
  try {
    const laufakte = baueCodexLaufakte(
      laufId,
      schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_SCHEMAKONFORM, exitCode: 0, tokens: CODEX_TOKENS_MIT_SCHEMA }),
      true
    )
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: mit --output-schema, aber freier Text in der letzten agent_message → ergebnis_nicht_schemakonform', () => {
  const laufId = neueLaufId('codex-schema-rot')
  try {
    const laufakte = baueCodexLaufakte(
      laufId,
      schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: 0, tokens: CODEX_TOKENS_MIT_SCHEMA }),
      true
    )
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'ergebnis_nicht_schemakonform')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 (F-308): es zaehlt die LETZTE agent_message — eine fruehere mit JSON rettet einen freien Schlusstext NICHT', () => {
  const laufId = neueLaufId('codex-schema-letzte')
  try {
    const stdout = [
      '{"type":"turn.started"}',
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"{\\"urteil\\":\\"FREIGEGEBEN\\"}"}}',
      '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Fertig, siehe oben."}}',
      '{"type":"turn.completed"}',
    ].join('\n')
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout, exitCode: 0, tokens: CODEX_TOKENS_MIT_SCHEMA }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'ergebnis_nicht_schemakonform')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8: ein JSON-Array in der letzten agent_message ist kein Objekt → ergebnis_nicht_schemakonform', () => {
  const laufId = neueLaufId('codex-schema-array')
  try {
    const stdout = [
      '{"type":"turn.started"}',
      '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"[1,2,3]"}}',
      '{"type":"turn.completed"}',
    ].join('\n')
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout, exitCode: 0, tokens: CODEX_TOKENS_MIT_SCHEMA }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'ergebnis_nicht_schemakonform')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8: OHNE --output-schema bleibt freier Text in der letzten agent_message ERFOLGREICH', () => {
  const laufId = neueLaufId('codex-ohne-schema')
  try {
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 (F-300): ein Codex-Lauf wird NIE VERWEIGERT — auch nicht bei einer Klartext-Blockademeldung im Strom', () => {
  const laufId = neueLaufId('codex-nie-verweigert')
  try {
    // Wörtlich aus Lauf (h): der blockierte Befehl erzeugt KEIN Ereignis,
    // die Blockade steht nur als Klartext in der agent_message. Genau
    // dieser Lauf darf nicht als VERWEIGERT durchgehen — es gibt keine
    // strukturierte Beobachtung, auf die sich das stützen ließe.
    const stdout = [
      '{"type":"thread.started","thread_id":"01a08f60-109f-70d1-819e-69a442cab65d"}',
      '{"type":"turn.started"}',
      '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Das Lesen von a.txt wurde durch die Ausfuehrungsrichtlinie blockiert."}}',
      '{"type":"turn.completed"}',
    ].join('\n')
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.notEqual(ergebnis.ergebnis, 'VERWEIGERT')
    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8: der Codex-Zweig schreibt eine reale Terminalmarke (genau eine, ueber F1B)', () => {
  const laufId = neueLaufId('codex-marke')
  try {
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const checkpoints = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(checkpoints.length, 1)
    assert.ok(ergebnis.wirkungsmarke.pfad.length > 0)
  } finally {
    raeumeKette(laufId)
  }
})

// ─── AK8, Nachtrag aus dem QA-/Reviewer-Pass ────────────────────────────────
// Vier Zweige, die zuvor nur mitgetragen und nicht einzeln gemessen waren.

test('AK8 rot: nicht parsbarer Rohstrom bei PASSENDEM Hash → rohstrom_integritaet (innerer Zweig des Codex-Pfads)', () => {
  const laufId = neueLaufId('codex-integritaet-innen')
  try {
    // Hash passt zum Inhalt — die vorgelagerte Integritätsprüfung greift
    // also NICHT. Erst das JSON.parse im Codex-Zweig scheitert. Ohne diesen
    // Fall wäre das dortige try/catch durch keinen Test erreicht und ließe
    // sich ersatzlos entfernen.
    const referenz = schreibeRohstromRoh(laufId, 'kein JSON, sondern Text')
    const laufakte = baueCodexLaufakte(laufId, referenz, true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'rohstrom_integritaet')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: beobachtungsbasis_vollstaendig true, aber abgeschnittener Strom → der Evaluator glaubt dem Flag nicht', () => {
  const laufId = neueLaufId('codex-flag-luegt')
  try {
    // Das Flag der Laufakte ist eine abgeleitete Behauptung des Gateways.
    // Hier steht es auf true, der Strom trägt aber weder turn.completed noch
    // turn.failed. Ohne die Nachrechnung im Codex-Zweig ginge das still als
    // ERFOLGREICH durch.
    const abgeschnitten = '{"type":"thread.started","thread_id":"01a08f5d"}\n{"type":"turn.started"}'
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: abgeschnitten, exitCode: 0 }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'beobachtungsbasis_unvollstaendig')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8: ein Rohstrom OHNE tokens/stdout (Form aus dem Claude-Code-Pfad) stürzt nicht ab, sondern klassifiziert defensiv', () => {
  const laufId = neueLaufId('codex-felder-fehlen')
  try {
    // Real erreichbar, sobald eine Laufakte worker: 'codex' trägt, ihr
    // Rohstrom aber aus einer anderen Quelle stammt — genau die Form, die
    // F6as starteGateway schreibt (kein tokens-Feld).
    const inhalt = JSON.stringify({ werkzeugStartziel: ['C:\\codex\\codex.exe'], stderr: '', exitCode: 0, startfehler: null, beendigungsart: null })
    const laufakte = baueCodexLaufakte(laufId, schreibeRohstromRoh(laufId, inhalt), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    // Fehlendes stdout heißt: leerer Strom, also weder turn.completed noch
    // turn.failed — die Beobachtungsbasis ist unvollständig, kein Absturz.
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'beobachtungsbasis_unvollstaendig')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8: fehlendes tokens-Feld bedeutet „kein --output-schema" — der Schemazweig greift dann nicht', () => {
  const laufId = neueLaufId('codex-tokens-fehlen')
  try {
    const inhalt = JSON.stringify({ stdout: CODEX_STDOUT_ERFOLG, stderr: '', exitCode: 0, startfehler: null, beendigungsart: null })
    const laufakte = baueCodexLaufakte(laufId, schreibeRohstromRoh(laufId, inhalt), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis, 'ERFOLGREICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: mit --output-schema und GAR KEINER agent_message → ergebnis_nicht_schemakonform', () => {
  const laufId = neueLaufId('codex-schema-keine-nachricht')
  try {
    // Der null-Pfad von istJsonObjekt: kein Auswertepunkt vorhanden. Ein
    // Ergebnis, das es nicht gibt, ist nicht schemakonform — nicht
    // „unentschieden".
    const stdout = '{"type":"turn.started"}\n{"type":"turn.completed"}'
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout, exitCode: 0, tokens: CODEX_TOKENS_MIT_SCHEMA }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'ergebnis_nicht_schemakonform')
  } finally {
    raeumeKette(laufId)
  }
})

test('AK8 rot: exitCode null bei sonst vollständigem Strom → exit_code (null ist kein 0)', () => {
  const laufId = neueLaufId('codex-exit-null')
  try {
    const laufakte = baueCodexLaufakte(laufId, schreibeCodexRohstrom(laufId, { stdout: CODEX_STDOUT_ERFOLG, exitCode: null }), true)
    const ergebnis = klassifiziereLauf(laufId, PROFIL_REFERENZ, { laufakte }, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.equal(ergebnis.ergebnis === 'FEHLGESCHLAGEN' ? ergebnis.grund : '', 'exit_code')
  } finally {
    raeumeKette(laufId)
  }
})
