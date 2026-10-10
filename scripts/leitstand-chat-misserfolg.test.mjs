/**
 * Datei: scripts/leitstand-chat-misserfolg.test.mjs
 *
 * Zweck: Tests F45 B0 (K5, F-1007, F-1008, F-544, F-986 a) gegen erzeugeRequestHandler mit einer
 * gefälschten fuehreAufgabeDurchFn — kein echter Modell-Lauf:
 * - eigene Chat-Zeitgrenze (Jarvis 180 s, Coach 300 s) geht als zeitgrenzeMs an den Lauf, das
 *   Lauf-Detail meldet sie als laufZeitgrenzeMs; ein an der Grenze beendeter Lauf hinterlässt genau
 *   einen Fehler-Eintrag, D13 ist danach frei;
 * - Abbruch, „nie gestartet“, FEHLGESCHLAGEN, VERWEIGERT und ein Wurf hinterlassen je genau einen als
 *   Fehler gekennzeichneten Eintrag (istFehler, fehler.art, Grund) — nie eine erfundene Antwort;
 * - der Chat-Worker ist fest claude-code, auch wenn die Startvorlage Codex verfügbar macht;
 * - Fehler-Einträge gehen nicht als Gesprächskontext an das Modell;
 * - GET /api/zustand trägt den Start-Hinweis (F-986 a), wenn einer gesetzt ist;
 * - Prüfpass: ERFOLGREICH ohne Laufakte und ein gescheitertes Zusammenfassen hinterlassen einen Eintrag.
 *
 * Wird aufgerufen von: `npm run test` (node --test)
 */

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import test from 'node:test'
import { schreibeWirkungsmarke } from '../src/checkpoint-store/index.ts'
import { registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { beschreibeChatMisserfolg, erzeugeRequestHandler, vergleicheStartordner } from './leitstand-server.mjs'

const STILL = () => {}
const warte = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wartet, bis die Bedingung gilt (statt fester Wartezeiten — Prüfpass F45 B0, cr 8: unter
 * --test-concurrency=4 sind feste 30 ms die Quelle sporadischer Fehler, F-999).
 * @param bedingung - () => boolean | Promise<boolean>
 * @param fristMs - Obergrenze, danach wirft der Test
 */
async function warteBis(bedingung, fristMs = 5000) {
  const ende = Date.now() + fristMs
  while (!(await bedingung())) {
    if (Date.now() > ende) throw new Error('Bedingung nicht innerhalb der Frist erfüllt')
    await warte(10)
  }
}

/**
 * Wartet, bis kein Lauf mehr aktiv ist (D13 frei). Der Fehler-Eintrag entsteht im selben Tick wie das
 * Zurücksetzen der Sperre — ist sie frei, steht er im Verlauf.
 * @param basisUrl - http://127.0.0.1:<port>
 */
async function warteBisLaufFrei(basisUrl) {
  await warteBis(async () => (await (await fetch(`${basisUrl}/api/zustand`)).json()).aktiverLauf?.aktiv === false)
}

/**
 * Startet einen Handler auf einem freien Port und räumt danach auf.
 * @param optionen - zusätzliche erzeugeRequestHandler-Optionen (fuehreAufgabeDurchFn, startvorlagePfad, …)
 * @param pruefung - async (basisUrl, basisVerzeichnis) => void
 */
async function mitServer(optionen, pruefung) {
  const basisVerzeichnis = `kontrollzustand-test-f45-b0-${randomUUID()}`
  raeumeVerzeichnis(basisVerzeichnis)
  const fuehreAufgabeDurchFn = optionen.fuehreAufgabeDurchFn ? (...args) => optionen.fuehreAufgabeDurchFn(basisVerzeichnis, ...args) : undefined
  const server = createServer(erzeugeRequestHandler({ projektId: 'test-f45', startvorlagePfad: 'startvorlagen/beispielprojekt.json', ...optionen, basisVerzeichnis, fuehreAufgabeDurchFn }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    await pruefung(`http://127.0.0.1:${server.address().port}`, basisVerzeichnis)
  } finally {
    await new Promise((resolve) => server.close(resolve))
    raeumeVerzeichnis(basisVerzeichnis)
  }
}

/** Legt die Lauf-Kette an (RUN_PREPARED), damit GET /api/laeufe/<laufId> den Lauf kennt. */
function bereiteLaufVor(basisVerzeichnis, laufId, profilReferenz) {
  schreibeWirkungsmarke(laufId, profilReferenz, 'run_prepared', {}, { basisVerzeichnis, schreiber: STILL })
}

/** Ergebnis eines klassifizierten, nicht erfolgreichen Laufs (Form wie fuehreAufgabeDurch). */
const fehlgeschlagen = (grund) => ({ ok: true, klassifikation: { ergebnis: 'FEHLGESCHLAGEN', grund }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'FEHLGESCHLAGEN' } })

/** @returns Verlauf aus GET /api/chat bzw. /api/sparring */
async function verlauf(basisUrl, pfad) {
  return (await (await fetch(`${basisUrl}${pfad}`)).json()).verlauf
}

test('Jarvis: Lauf an der Zeitgrenze (180 s) → genau ein Fehler-Eintrag, laufZeitgrenzeMs im Detail, D13 danach frei', async () => {
  const gesehen = []
  let freigabe
  await mitServer(
    {
      fuehreAufgabeDurchFn: async (basisVerzeichnis, laufId, profilReferenz, _eingaben, optionen) => {
        gesehen.push({ laufId, zeitgrenzeMs: optionen.zeitgrenzeMs })
        bereiteLaufVor(basisVerzeichnis, laufId, profilReferenz)
        // Ein Lauf, der nicht von selbst endet: erst die „Grenze“ (hier vom Test ausgelöst) beendet ihn
        // so, wie das Gateway einen Prozess an zeitgrenzeMs beendet (beendigungsart TIMEOUT → grund 'timeout').
        await new Promise((resolve) => {
          freigabe = resolve
        })
        return fehlgeschlagen('timeout')
      },
    },
    async (basisUrl) => {
      const antwort = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Hängt dieser Lauf?' }) })
      assert.equal(antwort.status, 202)
      const { laufId } = await antwort.json()
      await warteBis(() => gesehen.length === 1)
      assert.equal(gesehen[0].zeitgrenzeMs, 180_000)
      const detail = await (await fetch(`${basisUrl}/api/laeufe/${laufId}`)).json()
      assert.equal(detail.laufZeitgrenzeMs, 180_000)
      assert.equal(detail.aktiv, true)
      const gesperrt = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'zweite' }) })
      assert.equal(gesperrt.status, 409)
      freigabe()
      await warteBisLaufFrei(basisUrl)
      const eintraege = await verlauf(basisUrl, '/api/chat')
      assert.equal(eintraege.length, 1)
      assert.equal(eintraege[0].laufId, laufId)
      assert.equal(eintraege[0].istFehler, true)
      assert.equal(eintraege[0].fehler.art, 'zeitgrenze')
      assert.equal(eintraege[0].nachricht, 'Hängt dieser Lauf?')
      assert.match(eintraege[0].jarvisAntwort.antwort, /180 s/)
      const danach = await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'D13 frei?' }) })
      assert.equal(danach.status, 202)
      freigabe()
      await warteBisLaufFrei(basisUrl)
    }
  )
})

test('Coach: Zeitgrenze 300 s, Fehler-Eintrag trägt den Untermodus', async () => {
  const gesehen = []
  await mitServer(
    {
      fuehreAufgabeDurchFn: async (_basis, laufId, _profil, eingaben, optionen) => {
        gesehen.push({ zeitgrenzeMs: optionen.zeitgrenzeMs, worker: eingaben.worker })
        return fehlgeschlagen('timeout')
      },
    },
    async (basisUrl) => {
      const antwort = await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht: 'Idee', modus: 'projekt' }) })
      assert.equal(antwort.status, 202)
      await warteBisLaufFrei(basisUrl)
      assert.equal(gesehen[0].zeitgrenzeMs, 300_000)
      const eintraege = await verlauf(basisUrl, '/api/sparring')
      assert.equal(eintraege.length, 1)
      assert.equal(eintraege[0].istFehler, true)
      assert.equal(eintraege[0].fehler.art, 'zeitgrenze')
      assert.equal(eintraege[0].modus, 'projekt')
      assert.match(eintraege[0].coachAntwort.antwort, /300 s/)
    }
  )
})

test('Abbruch durch Stefan → genau ein Fehler-Eintrag „Abgebrochen“', async () => {
  await mitServer(
    {
      fuehreAufgabeDurchFn: async (basisVerzeichnis, laufId, profilReferenz, _eingaben, optionen) => {
        bereiteLaufVor(basisVerzeichnis, laufId, profilReferenz)
        await new Promise((resolve) => optionen.abbruchSignal.addEventListener('abort', resolve))
        return fehlgeschlagen('abgebrochen_manuell')
      },
    },
    async (basisUrl) => {
      const { laufId } = await (await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Bitte abbrechen' }) })).json()
      // Der Abbruch-Hörer steht schon: die Attrappe registriert ihn synchron vor ihrem ersten await.
      const abbruch = await fetch(`${basisUrl}/api/laeufe/${laufId}/abbrechen`, { method: 'POST' })
      assert.equal(abbruch.status, 202)
      await warteBisLaufFrei(basisUrl)
      const eintraege = await verlauf(basisUrl, '/api/chat')
      assert.equal(eintraege.length, 1)
      assert.equal(eintraege[0].istFehler, true)
      assert.equal(eintraege[0].fehler.art, 'abgebrochen')
      assert.equal(eintraege[0].jarvisAntwort.antwort, 'Abgebrochen.')
    }
  )
})

test('„nie gestartet“ (Startfreigabe verweigert) → genau ein Fehler-Eintrag mit Grund', async () => {
  const grund = "Drift im Gültigkeitsschlüssel: 'arbeitsverzeichnis_pfad' (E-188)"
  await mitServer({ fuehreAufgabeDurchFn: async () => ({ ok: false, stufe: 'gateway', grund }) }, async (basisUrl) => {
    assert.equal((await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Startet das?' }) })).status, 202)
    await warteBisLaufFrei(basisUrl)
    const eintraege = await verlauf(basisUrl, '/api/chat')
    assert.equal(eintraege.length, 1)
    assert.equal(eintraege[0].istFehler, true)
    assert.equal(eintraege[0].fehler.art, 'nicht_gestartet')
    assert.ok(eintraege[0].fehler.grund.includes('E-188'), eintraege[0].fehler.grund)
    assert.ok(eintraege[0].jarvisAntwort.antwort.startsWith('Lauf nicht gestartet:'))
  })
})

test('FEHLGESCHLAGEN, VERWEIGERT und ein Wurf hinterlassen je genau einen Fehler-Eintrag, keine Antwort', async () => {
  const ausgaenge = [
    async () => fehlgeschlagen('beobachtungsbasis_unvollstaendig'),
    async () => ({ ok: true, klassifikation: { ergebnis: 'VERWEIGERT', bypass_verdacht_anzahl: 0 }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'VERWEIGERT' } }),
    async () => {
      throw new Error('Prozess nicht startbar')
    },
  ]
  let index = 0
  await mitServer({ fuehreAufgabeDurchFn: async () => ausgaenge[index++]() }, async (basisUrl) => {
    for (let i = 0; i < ausgaenge.length; i++) {
      assert.equal((await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: `Versuch ${i}` }) })).status, 202)
      await warteBisLaufFrei(basisUrl)
    }
    const eintraege = await verlauf(basisUrl, '/api/chat')
    assert.deepEqual(
      eintraege.map((e) => [e.nachricht, e.istFehler, e.fehler.art]),
      [
        ['Versuch 0', true, 'nicht_erfolgreich'],
        ['Versuch 1', true, 'verweigert'],
        ['Versuch 2', true, 'nicht_erfolgreich'],
      ]
    )
    assert.ok(eintraege[0].fehler.grund.includes('beobachtungsbasis_unvollstaendig'))
    assert.ok(eintraege[2].fehler.grund.includes('Prozess nicht startbar'))
  })
})

test('Chat-Worker fest claude-code — auch wenn die Startvorlage Codex verfügbar macht (F-544)', async () => {
  const worker = []
  await mitServer(
    {
      startvorlagePfad: 'startvorlagen/ai-workforce.json',
      fuehreAufgabeDurchFn: async (_basis, _laufId, _profil, eingaben) => {
        // Fehlt worker, ist es 'claude-code' (loeseAusfuehrungsEingabenAuf setzt das Feld nur für andere Worker).
        worker.push({ worker: eingaben.worker ?? 'claude-code', schema: eingaben.ausgabeSchemaPfad ?? null })
        return fehlgeschlagen('beobachtungsbasis_unvollstaendig')
      },
    },
    async (basisUrl) => {
      await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Worker?' }) })
      await warteBisLaufFrei(basisUrl)
      await fetch(`${basisUrl}/api/sparring`, { method: 'POST', body: JSON.stringify({ nachricht: 'Worker?' }) })
      await warteBisLaufFrei(basisUrl)
      assert.deepEqual(worker, [
        { worker: 'claude-code', schema: null },
        { worker: 'claude-code', schema: null },
      ])
    }
  )
})

test('Fehler-Einträge gehen nicht als Gesprächskontext an das Modell', async () => {
  const auftragstexte = []
  let erster = true
  await mitServer(
    {
      fuehreAufgabeDurchFn: async (_basis, _laufId, _profil, eingaben) => {
        auftragstexte.push(eingaben.auftragstext ?? JSON.stringify(eingaben))
        if (erster) {
          erster = false
          return fehlgeschlagen('timeout')
        }
        return fehlgeschlagen('beobachtungsbasis_unvollstaendig')
      },
    },
    async (basisUrl) => {
      await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Erste Frage XYZ-1' }) })
      await warteBisLaufFrei(basisUrl)
      await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Zweite Frage' }) })
      await warteBisLaufFrei(basisUrl)
      assert.equal(auftragstexte.length, 2)
      assert.ok(!auftragstexte[1].includes('XYZ-1'), 'der Fehler-Turn darf nicht im Verlaufsfenster stehen')
    }
  )
})

test('beschreibeChatMisserfolg ordnet jeden Ausgang ein; Erfolg ist kein Misserfolg', () => {
  assert.equal(beschreibeChatMisserfolg({ ok: true, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }, null, false, 180_000), null)
  assert.deepEqual(beschreibeChatMisserfolg(fehlgeschlagen('timeout'), null, false, 180_000), { art: 'zeitgrenze', grund: null, zeitgrenzeMs: 180_000 })
  assert.equal(beschreibeChatMisserfolg(fehlgeschlagen('abgebrochen_manuell'), null, false, 180_000).art, 'abgebrochen')
  // Abbruch angefordert und Lauf scheitert aus anderem Grund: der Abbruch hat ihn beendet.
  assert.equal(beschreibeChatMisserfolg(fehlgeschlagen('beobachtungsbasis_unvollstaendig'), null, true, 180_000).art, 'abgebrochen')
  assert.equal(beschreibeChatMisserfolg({ ok: false, stufe: 'gateway', grund: 'X' }, null, false, 180_000).art, 'nicht_gestartet')
  assert.equal(beschreibeChatMisserfolg(null, new Error('kaputt'), false, 180_000).art, 'nicht_erfolgreich')
  assert.equal(beschreibeChatMisserfolg({ ok: true, laufStatus: { status: 'KLAERUNG_ERFORDERLICH', grund: 'Blocker' } }, null, false, 180_000).art, 'klaerung')
})

test('vergleicheStartordner: gleiche Pfade trotz Trenner und Großschreibung, Abweichung mit beiden Pfaden', () => {
  assert.equal(vergleicheStartordner('C:\\Users\\stefa\\Projekte\\ai-workforce', 'c:/users/stefa/projekte/ai-workforce'), null)
  assert.deepEqual(vergleicheStartordner('C:\\Users\\stefa\\Projekte\\aiw-main-ansicht', 'C:\\Users\\stefa\\Projekte\\ai-workforce'), {
    art: 'falscherOrdner',
    istPfad: 'C:\\Users\\stefa\\Projekte\\aiw-main-ansicht',
    sollPfad: 'C:\\Users\\stefa\\Projekte\\ai-workforce',
  })
})

test('GET /api/zustand trägt den Start-Hinweis lesend (ohne Hinweis null)', async () => {
  const hinweis = { art: 'falscherOrdner', istPfad: 'C:\\x\\worktree', sollPfad: 'C:\\x\\ai-workforce' }
  await mitServer({ startHinweis: hinweis }, async (basisUrl) => {
    const zustand = await (await fetch(`${basisUrl}/api/zustand`)).json()
    assert.deepEqual(zustand.startHinweis, hinweis)
  })
  await mitServer({ startHinweis: null }, async (basisUrl) => {
    const zustand = await (await fetch(`${basisUrl}/api/zustand`)).json()
    assert.equal(zustand.startHinweis, null)
  })
})

test('Prüfpass: ERFOLGREICH ohne Laufakte endet nicht still — genau ein Fehler-Eintrag „unlesbar“', async () => {
  await mitServer({ fuehreAufgabeDurchFn: async () => ({ ok: true, klassifikation: { ergebnis: 'ERFOLGREICH' }, laufStatus: { status: 'ABGESCHLOSSEN', ergebnis: 'ERFOLGREICH' } }) }, async (basisUrl) => {
    assert.equal((await fetch(`${basisUrl}/api/chat`, { method: 'POST', body: JSON.stringify({ nachricht: 'Ohne Laufakte' }) })).status, 202)
    await warteBisLaufFrei(basisUrl)
    const eintraege = await verlauf(basisUrl, '/api/chat')
    assert.equal(eintraege.length, 1)
    assert.equal(eintraege[0].istFehler, true)
    assert.equal(eintraege[0].fehler.art, 'unlesbar')
    assert.ok(eintraege[0].fehler.grund.includes('nicht gefunden'))
  })
})

test('Prüfpass: gescheitertes Zusammenfassen speichert „[Zusammenfassung angefordert]“, nicht die Instruktion', async () => {
  await mitServer({ fuehreAufgabeDurchFn: async () => fehlgeschlagen('timeout') }, async (basisUrl, basisVerzeichnis) => {
    // Vorhandener Verlauf (sonst 409 „kein Verlauf zum Zusammenfassen“), direkt als Kernartefakt.
    const profil = { pfad: 'profiles/beispiel.json', hash: 'a'.repeat(64), version: 1 }
    registriereKernArtefakt('chat-test-f45', profil, { quelle: 'jarvis-chat', lauf_id: 'alt-1' }, { nachricht: 'Frage', jarvisAntwort: { art: 'antwort', antwort: 'Antwort' } }, undefined, { basisVerzeichnis, schreiber: STILL })
    assert.equal((await fetch(`${basisUrl}/api/chat/zusammenfassen`, { method: 'POST', body: '{}' })).status, 202)
    await warteBisLaufFrei(basisUrl)
    const eintraege = await verlauf(basisUrl, '/api/chat')
    assert.equal(eintraege.length, 2)
    assert.equal(eintraege[1].istFehler, true)
    assert.equal(eintraege[1].nachricht, '[Zusammenfassung angefordert]')
  })
})
