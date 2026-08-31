/**
 * Datei: src/claude-code-gateway/claude-code-gateway.test.ts
 *
 * Zweck: node:test-Fälle für das Claude-Code-Gateway (F6a WS1 + WS2,
 * state/tasks/f6a-claude-code-gateway-ws1.md,
 * state/tasks/f6a-ws2-prozessstart.md). WS1 deckt baueAufruf (Grünfall,
 * Wurf ohne modell) und pruefeUndVerweigereBeiTreffer (Grünfall, Rot-Fall
 * mit realem verweigereStart-Aufruf über F1Bs schreibeWirkungsmarke, Beleg
 * über stelleLaufstatusFest — Muster wie F4s eigener AC7-Test — sowie der
 * F-048-Fenster-Rot-Fall). WS2 deckt starteGateway gegen die
 * TP-03d/TP-01e-Attrappen aus prozessstart.ts (Erfolg, Verweigerung durch
 * WS1s Check ohne Prozessstart, Abbruch ohne Ergebnisobjekt,
 * F2-Registrierung) — kein echter Prozessstart, kein Netz (AK10).
 */

import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { schreibeWirkungsmarke, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import { baueAufruf, pruefeUndVerweigereBeiTreffer, starteGateway } from './index.ts'
import { attrappeMitValidemErgebnis, attrappeOhneErgebnisobjekt } from './prozessstart.ts'
import type { AufrufEingaben, GatewayEingaben, ProzessErgebnis, Starter } from './types.ts'

const KONTROLLZUSTAND_BASIS = 'kontrollzustand-test'
const PROFIL_REFERENZ: ProfilReferenz = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }

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
  const spyStarter: Starter = async (tokens) => {
    starterAufgerufen = true
    return attrappeMitValidemErgebnis(tokens)
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
  const ergebnis: ProzessErgebnis = await attrappeOhneErgebnisobjekt([])
  assert.strictEqual(ergebnis.stdout, '')
  assert.strictEqual(ergebnis.exitCode, 137)
})
