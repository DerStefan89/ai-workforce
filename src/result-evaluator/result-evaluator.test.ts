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
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { attrappeMitValidemErgebnis, attrappeOhneErgebnisobjekt } from '../claude-code-gateway/prozessstart.ts'
import type { LaufakteV0Daten } from '../claude-code-gateway/types.ts'
import { schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { klassifiziereLauf } from './index.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const ROH_BASIS = join(tmpdir(), 'f7-result-evaluator-test')
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function schreibeRohstrom(laufId: string, prozessErgebnis: { stdout: string; stderr: string; exitCode: number | null }): { pfad: string; inhalts_hash: string } {
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
