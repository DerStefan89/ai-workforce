#!/usr/bin/env node
/**
 * Datei: features/F45/nachweise/b2b3b2b2a2/instanz.mjs
 *
 * Zweck: Leitstand-Testinstanz für den Render-Nachweis F45 B2b-3b-2b-2a-2 „Rückfrage-Kanal: Oberfläche“ (render/erzeuge-nachweis.mjs).
 * Neutrale Umgebung als erster Import (F-1125). Über den echten erzeugeMultiProjektDispatcher (Advisor M7): Workforce-Instanz mit
 * Register (ein Projekt „haushaltsbuch“) und Projektinstanz mit eingeschaltetem Kanal und injizierter Vermittlung. Ein Lauf ist aktiv
 * (globalerLaufZustand, Laufordner im Kontrollzustand des Projekts ⇒ GET /api/projekte meldet laufAktiv) — der Leitstand findet so
 * die Projektinstanz (instanzPraefixDesLaufs ⇒ /api/projekte/haushaltsbuch). Offen: zwei Bash-Befehle (mehrzeilig mit Tab; mit
 * `<img>`-Text) und eine Frage mit U+202E/U+200B und leerer Option; eine vierte Rückfrage beantwortet die Instanz selbst per HTTP
 * ohne Browser-Kopf ⇒ „nicht aus dem Browser“ in „Zuletzt entschieden“.
 *
 * Wird aufgerufen von: Hand — `node features/F45/nachweise/b2b3b2b2a2/instanz.mjs`; bleibt offen bis Strg+C (oder
 * B2B3B2B2A2_ENDE_NACH_MS). Nicht Teil von `npm run check`.
 *
 * Wichtig: `neutrale-umgebung-starten.mjs` muss der ERSTE Import bleiben (Gate f45-b2b3e1 (p2b)). Kein echter CLI-Lauf.
 */

import '../../../../scripts/neutrale-umgebung-starten.mjs'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { erzeugeMultiProjektDispatcher, erzeugeRequestHandler } from '../../../../scripts/leitstand-server.mjs'
import { erzeugeRueckfrageVermittlung } from '../../../../scripts/leitstand/rueckfrage-vermittlung.mjs'

const INSTALL = join(import.meta.dirname, '..', '..', '..', '..')
const PORT = Number(process.env.B2B3B2B2A2_PORT ?? 4407)
const LAUF = 'lauf-render-kanal'
const wurzel = mkdtempSync(join(tmpdir(), 'f45-b2b3b2b2a2-render-'))
const workforce = join(wurzel, 'workforce')
const projekt = join(wurzel, 'haushaltsbuch')
mkdirSync(join(projekt, 'kontrollzustand', LAUF), { recursive: true })
mkdirSync(join(workforce, 'kontrollzustand'), { recursive: true })
writeFileSync(join(projekt, 'README.md'), '# Haushaltsbuch\n')

const basisUrl = `http://127.0.0.1:${PORT}`
const globalerLaufZustand = { aktiv: true, laufId: LAUF, abortController: null }
const vermittlung = erzeugeRueckfrageVermittlung()
const register = [{ id: 'haushaltsbuch', name: 'Haushaltsbuch', repo_pfad: projekt, basisverzeichnis: 'kontrollzustand', startvorlage_pfad: 'startvorlage.json' }]
const projektHandler = erzeugeRequestHandler({
  basisVerzeichnis: join(projekt, 'kontrollzustand'),
  repoWurzel: projekt,
  installWurzel: INSTALL,
  startvorlagePfad: join(INSTALL, 'startvorlagen', 'beispielprojekt.json'),
  projektId: 'haushaltsbuch',
  globalerLaufZustand,
  rueckfrage: { an: true, url: `${basisUrl}/api/projekte/haushaltsbuch` },
  rueckfrageVermittlung: vermittlung,
  laufausgabeWurzel: join(wurzel, 'laufausgabe-p'),
  rohBasisVerzeichnis: join(wurzel, 'roh-p'),
})
const projektHandlerMap = new Map([['haushaltsbuch', projektHandler]])
const workforceHandler = erzeugeRequestHandler({
  basisVerzeichnis: join(workforce, 'kontrollzustand'),
  repoWurzel: workforce,
  installWurzel: INSTALL,
  startvorlagePfad: join(INSTALL, 'startvorlagen', 'beispielprojekt.json'),
  projektId: 'ai-workforce',
  istWorkforceInstanz: true,
  globalerLaufZustand,
  projekte: register,
  projektHandlerMap,
  rueckfrage: { an: true, url: `${basisUrl}/api` },
  laufausgabeWurzel: join(wurzel, 'laufausgabe-w'),
  rohBasisVerzeichnis: join(wurzel, 'roh-w'),
})
const leitstand = createServer(erzeugeMultiProjektDispatcher(projektHandlerMap, workforceHandler))
await new Promise((r) => leitstand.listen(PORT, '127.0.0.1', r))

vermittlung.oeffneLauf(LAUF, { token: 'c'.repeat(64), arbeitsordner: projekt, werkzeugNamen: ['Read', 'Write', 'Bash'] })
const stelle = (daten) => vermittlung.stelle(LAUF, daten)
const vorab = stelle({ art: 'rechte', tool_name: 'Bash', input: { command: 'git push --force origin main' }, tool_use_id: 'toolu_vorab' })
stelle({ art: 'rechte', tool_name: 'Bash', input: { command: 'cd app\n\tnpm run build &&\n\tnpm publish --access public\n\n# Ende' }, tool_use_id: 'toolu_1' })
stelle({ art: 'rechte', tool_name: 'Bash', input: { command: 'echo "<img src=x onerror=alert(1)>" > notiz.html' }, tool_use_id: 'toolu_2' })
stelle({ art: 'frage', frage: 'Welche Datenbank soll der Export nutzen?\nBitte kurz begründen.‮', optionen: ['SQLite', 'Postgres​', ' '], tool_use_id: 'toolu_3' })
// Eine Antwort von einem lokalen Prozess ohne Browser-Kopf (E-B7): echter POST über den Dispatcher.
const antwort = await fetch(`${basisUrl}/api/projekte/haushaltsbuch/rueckfragen/${vorab.id}/antwort`, { method: 'POST', body: JSON.stringify({ entscheidung: 'ablehnen' }) })
console.log(`Vorab-Antwort ohne Browser-Kopf: HTTP ${antwort.status}`)
console.log(`Testinstanz B2b-3b-2b-2a-2 offen: ${basisUrl}/#/attention (beenden mit Strg+C)`)
const endeNachMs = Number(process.env.B2B3B2B2A2_ENDE_NACH_MS ?? 0)
if (endeNachMs > 0) setTimeout(() => process.exit(0), endeNachMs)
