/**
 * Datei: src/claude-code-gateway/claude-code-gateway.test.ts
 *
 * Zweck: node:test-Fälle für das Claude-Code-Gateway (F6a WS1 + WS2 + WS4,
 * state/tasks/f6a-claude-code-gateway-ws1.md,
 * state/tasks/f6a-ws2-prozessstart.md,
 * state/tasks/f6a-ws4-windows-prozessstart.md). WS1 deckt baueAufruf
 * (Grünfall, Wurf ohne modell) und pruefeUndVerweigereBeiTreffer
 * (Grünfall, Rot-Fall mit realem verweigereStart-Aufruf über F1Bs
 * schreibeWirkungsmarke, Beleg über stelleLaufstatusFest — Muster wie F4s
 * eigener AC7-Test — sowie der F-048-Fenster-Rot-Fall). WS2 deckt
 * starteGateway gegen die TP-03d/TP-01e-Attrappen aus prozessstart.ts
 * (Erfolg, Verweigerung durch WS1s Check ohne Prozessstart, Abbruch ohne
 * Ergebnisobjekt, F2-Registrierung) — kein echter Prozessstart, kein Netz
 * (AK10). WS4 deckt pruefeStartziel (AK15-Guard, Grün-/Rot-Fälle je Regel)
 * und starteProzess (Guard vor optionen.starter, plattformunabhängiger
 * NUL-Byte-Auslöser statt des Windows-only-EINVAL-Falls). Alle Attrappen
 * und Spies sind explizit zweiparametrig (startziel, tokens) — ein
 * Ein-Parameter-Callback würde nach dem WS4-Signaturwechsel still am
 * falschen Argument binden (Delta 10).
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { schreibeWirkungsmarke, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import { baueAufruf, leseModellBeobachtet, pruefeUndVerweigereBeiTreffer, starteGateway } from './index.ts'
import { attrappeMitValidemErgebnis, attrappeOhneErgebnisobjekt, pruefeStartziel, starteProzess } from './prozessstart.ts'
import type { AufrufEingaben, GatewayEingaben, ProzessErgebnis, Starter } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
/** Real existierende, absolute, endungs- und sperrlistenkonforme Datei — besteht pruefeStartziel ohne Sonderfall (F6a WS4). */
const GUELTIGES_STARTZIEL = [process.execPath]

function neueLaufId(praefix: string): string {
  return `${praefix}-${randomUUID()}`
}

function raeumeKette(laufId: string): void {
  rmSync(join(KONTROLLZUSTAND_BASIS, laufId), { recursive: true, force: true })
  rmSync(join(KONTROLLZUSTAND_BASIS, `lineage-laufakte-${laufId}`), { recursive: true, force: true })
  rmSync(join('kontrollzustand-roh', laufId), { recursive: true, force: true })
}

function gueltigeGatewayEingaben(laufId: string): GatewayEingaben {
  return {
    laufId,
    profilReferenz: PROFIL_REFERENZ,
    tokens: baueAufruf(gueltigeEingaben()),
    werkzeugStartziel: GUELTIGES_STARTZIEL,
    werkzeugVersionDeklariert: '2.1.241',
    berechtigungskontext: 'profil-standard',
  }
}

function gueltigeEingaben(): AufrufEingaben {
  return { modell: 'sonnet', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read', 'Grep'] } }
}

test('baueAufruf liefert das erwartete Tokens-Array — Grünfall', () => {
  const tokens = baueAufruf(gueltigeEingaben())
  assert.deepStrictEqual(tokens, ['--model', 'sonnet', '--output-format', 'json', '--setting-sources', 'project', '--tools', 'Read,Grep'])
})

test('baueAufruf wirft ohne modell', () => {
  const eingaben = { modell: '', werkzeugsatz: { modus: 'DEKLARIERT', erlaubte_werkzeuge: ['Read'] } } as AufrufEingaben
  assert.throws(() => baueAufruf(eingaben))
})

test('pruefeUndVerweigereBeiTreffer liefert ok:true bei unauffälligen Tokens — Grünfall', () => {
  const tokens = baueAufruf(gueltigeEingaben())
  const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, neueLaufId('gruen'), PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
  assert.strictEqual(ergebnis.ok, true)
})

test('pruefeUndVerweigereBeiTreffer verweigert bei verbotenem Aufrufparameter und schreibt eine reale VERWEIGERT-Terminalmarke — Rot-Fall', () => {
  const laufId = neueLaufId('rot')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const tokens = ['--model', 'sonnet', '--dangerously-skip-permissions']
    const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, laufId, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})

test('pruefeUndVerweigereBeiTreffer verweigert beim F-048-Fenster-Fall (mehrwortiger Verbotseintrag im Tokens-Array)', () => {
  const laufId = neueLaufId('rot-f048')
  try {
    schreibeWirkungsmarke(laufId, PROFIL_REFERENZ, 'run_prepared', {}, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    const tokens = ['--model', 'sonnet', '--permission-mode', 'bypassPermissions', '--output-format', 'json']
    const ergebnis = pruefeUndVerweigereBeiTreffer(tokens, laufId, PROFIL_REFERENZ, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)
    assert.match(ergebnis.grund, /--permission-mode bypassPermissions/)

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'ABGESCHLOSSEN')
    assert.ok(status.status === 'ABGESCHLOSSEN')
    assert.strictEqual(status.ergebnis, 'VERWEIGERT')
  } finally {
    raeumeKette(laufId)
  }
})

// ─── WS2: starteGateway ──────────────────────────────────────────────────────

test('starteGateway liefert eine vollständige Laufakte bei validem Ergebnisobjekt (TP-03d) — Grünfall', async () => {
  const laufId = neueLaufId('gateway-gruen')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.strictEqual(ergebnis.laufakte.beobachtungsbasis_vollstaendig, true)
    // TP-03d Messfall 1 trägt kein modelUsage-Feld (real gemessen vor der
    // CLI-Version aus SCOPE 7) — modell_beobachtet bleibt null, F-059/F-061-Muster.
    assert.strictEqual(ergebnis.laufakte.modell_beobachtet, null)
    assert.strictEqual(ergebnis.versionSequenz, 1)

    // Kein Terminalausgang durch das Gateway selbst (AK5/AK12) — der Lauf
    // bleibt bis F7 bewusst KLAERUNG_ERFORDERLICH.
    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway verweigert bei verbotenem Aufrufparameter — WS1-Check greift, kein Prozessstart', async () => {
  const laufId = neueLaufId('gateway-rot')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const eingaben: GatewayEingaben = {
      ...gueltigeGatewayEingaben(laufId),
      tokens: ['--model', 'sonnet', '--dangerously-skip-permissions'],
    }
    const ergebnis = await starteGateway(eingaben, {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.match(ergebnis.grund, /E-182/)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei Verweigerung nie aufgerufen werden')

    // Kein RUN_PREPARED wurde vor der Prüfung geschrieben (starteGateway
    // prüft zuerst, schreibt erst danach) — verweigereStart hinterlässt
    // damit eine Terminalmarke ohne vorangehendes RUN_PREPARED. F1B
    // wertet das als "keine RUN_PREPARED-Marke kam vor" → NICHT_GESTARTET,
    // nicht ABGESCHLOSSEN (anders als WS1s eigener Rot-Fall-Test, der ein
    // RUN_PREPARED bewusst vorher von Hand schreibt).
    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway kennzeichnet die Laufakte als unvollständig bei einem Fehllauf ohne Ergebnisobjekt (TP-01e)', async () => {
  const laufId = neueLaufId('gateway-abbruch')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeOhneErgebnisobjekt,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, true)
    assert.ok(ergebnis.ok)
    assert.strictEqual(ergebnis.laufakte.beobachtungsbasis_vollstaendig, false)

    // Auch hier keine Terminal-Wirkungsmarke — derselbe KLAERUNG_ERFORDERLICH-Zustand wie im Grünfall.
    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'KLAERUNG_ERFORDERLICH')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway registriert die Laufakte über F2 (Lineage) mit dem exakten Inhalt', async () => {
  const laufId = neueLaufId('gateway-lineage')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeMitValidemErgebnis,
      schreiber: () => {},
    })
    assert.ok(ergebnis.ok)

    const geladen = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis: KONTROLLZUSTAND_BASIS, schreiber: () => {} })
    assert.ok(geladen)
    assert.strictEqual(geladen.erzeugungsart, 'kern')
    assert.deepStrictEqual(geladen.daten, ergebnis.laufakte)
  } finally {
    raeumeKette(laufId)
  }
})

test('starteProzess-Attrappe attrappeOhneErgebnisobjekt liefert kein parsebares "type":"result"-Objekt (TP-01e-Fixture-Selbsttest)', async () => {
  const ergebnis: ProzessErgebnis = await attrappeOhneErgebnisobjekt([], [])
  assert.strictEqual(ergebnis.stdout, '')
  assert.strictEqual(ergebnis.exitCode, 137)
})

// ─── F6a AK8/F-059: leseModellBeobachtet (FOLGT-Klausel WS4, real gemessen SCOPE 7) ──

test('leseModellBeobachtet liefert den Modellnamen bei genau einem modelUsage-Schlüssel — real gemessene Form aus SCOPE 7', () => {
  const ergebnisObjekt = { type: 'result', modelUsage: { 'claude-sonnet-5': { canonicalModel: 'claude-sonnet-5' } } }
  assert.strictEqual(leseModellBeobachtet(ergebnisObjekt), 'claude-sonnet-5')
})

test('leseModellBeobachtet liefert null bei mehreren modelUsage-Schlüsseln — mehrdeutig, nicht geraten', () => {
  const ergebnisObjekt = { type: 'result', modelUsage: { 'claude-sonnet-5': {}, 'claude-haiku-4-5': {} } }
  assert.strictEqual(leseModellBeobachtet(ergebnisObjekt), null)
})

test('leseModellBeobachtet liefert null ohne modelUsage-Feld', () => {
  assert.strictEqual(leseModellBeobachtet({ type: 'result' }), null)
})

test('leseModellBeobachtet liefert null bei null-Ergebnisobjekt', () => {
  assert.strictEqual(leseModellBeobachtet(null), null)
})

// ─── WS4: pruefeStartziel (AK15-Guard) ───────────────────────────────────────

test('pruefeStartziel akzeptiert ein absolutes, endungs- und sperrlistenkonformes, existierendes Startziel — Grünfall', () => {
  const ergebnis = pruefeStartziel(GUELTIGES_STARTZIEL)
  assert.strictEqual(ergebnis.ok, true)
})

test('pruefeStartziel lehnt ein leeres Array ab', () => {
  const ergebnis = pruefeStartziel([])
  assert.strictEqual(ergebnis.ok, false)
})

test('pruefeStartziel lehnt einen relativen Pfad ab', () => {
  const ergebnis = pruefeStartziel(['claude.exe'])
  assert.strictEqual(ergebnis.ok, false)
})

test('pruefeStartziel lehnt eine .cmd-Endung ab', () => {
  const ergebnis = pruefeStartziel([join(process.cwd(), 'claude.cmd')])
  assert.strictEqual(ergebnis.ok, false)
})

test('pruefeStartziel lehnt einen Shell-Basisnamen ab (Sperrliste, auch bei .exe-Endung)', () => {
  const ergebnis = pruefeStartziel([join(process.cwd(), 'cmd.exe')])
  assert.strictEqual(ergebnis.ok, false)
  assert.ok(!ergebnis.ok)
  assert.match(ergebnis.grund, /Shell-Basisnamen-Sperrliste/)
})

test('pruefeStartziel lehnt ein Verzeichnis statt einer Datei ab', () => {
  const ergebnis = pruefeStartziel([process.cwd()])
  assert.strictEqual(ergebnis.ok, false)
})

// ─── WS4: starteProzess (Guard vor optionen.starter, C2-Ergebnisform) ───────

test('starteProzess prüft das Startziel vor optionen.starter — Rot-Fall, Spy-Starter wird nie aufgerufen (Delta 9)', async () => {
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  const ergebnis = await starteProzess([], [], { starter: spyStarter })
  assert.strictEqual(starterAufgerufen, false, 'starter darf bei ungültigem Startziel nie aufgerufen werden')
  assert.strictEqual(ergebnis.exitCode, null)
  assert.ok(ergebnis.startfehler)
})

test('starteProzess resolved statt zu werfen, wenn execFile synchron wirft — NUL-Byte-Token, plattformunabhängig (Delta 5/6)', async () => {
  const ergebnis = await starteProzess(GUELTIGES_STARTZIEL, ['a\u0000b'])
  assert.strictEqual(ergebnis.exitCode, null)
  assert.ok(ergebnis.startfehler, 'startfehler muss bei einem synchronen execFile-Wurf gesetzt sein')
  assert.ok(ergebnis.startfehler.message.length > 0)
})

// ─── WS4: starteGateway mit ungültigem Startziel (Delta 11) ─────────────────

test('starteGateway verweigert bei ungültigem werkzeugStartziel — kein RUN_PREPARED, stelleLaufstatusFest liefert NICHT_GESTARTET', async () => {
  const laufId = neueLaufId('gateway-rot-startziel')
  let starterAufgerufen = false
  const spyStarter: Starter = async (startziel, tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(startziel, tokens)
  }
  try {
    const eingaben: GatewayEingaben = {
      ...gueltigeGatewayEingaben(laufId),
      werkzeugStartziel: [],
    }
    const ergebnis = await starteGateway(eingaben, {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: spyStarter,
      schreiber: () => {},
    })

    assert.strictEqual(ergebnis.ok, false)
    assert.ok(!ergebnis.ok)
    assert.strictEqual(starterAufgerufen, false, 'starteProzess darf bei ungültigem Startziel nie aufgerufen werden')

    const status = stelleLaufstatusFest(laufId, { basisVerzeichnis: KONTROLLZUSTAND_BASIS })
    assert.strictEqual(status.status, 'NICHT_GESTARTET')
  } finally {
    raeumeKette(laufId)
  }
})

test('starteGateway trägt werkzeugStartziel und startfehler im Rohstrom (F-071)', async () => {
  const laufId = neueLaufId('gateway-rohstrom-startfehler')
  try {
    const ergebnis = await starteGateway(gueltigeGatewayEingaben(laufId), {
      basisVerzeichnis: KONTROLLZUSTAND_BASIS,
      rohBasisVerzeichnis: 'kontrollzustand-roh',
      starter: attrappeOhneErgebnisobjekt,
      schreiber: () => {},
    })
    assert.ok(ergebnis.ok)

    const rohInhalt = JSON.parse(readFileSync(ergebnis.laufakte.rohstrom_referenz.pfad, 'utf8'))
    assert.deepStrictEqual(rohInhalt.werkzeugStartziel, GUELTIGES_STARTZIEL)
    assert.strictEqual(rohInhalt.startfehler, null)
  } finally {
    raeumeKette(laufId)
  }
})
