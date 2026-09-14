/**
 * Datei: public/leitstand/app.js
 *
 * Zweck: Bootstrap der Jarvis Shell (F20 WS-1). Vor dieser Iteration war
 * diese Datei der gesamte Leitstand-Client (rund 1900 Zeilen, alle Views in
 * einem Modul). Seit WS-1 initialisiert sie nur noch den Router und jede
 * View — die eigentliche Logik liegt in router.js, api.js, render.js und
 * views/*.js (native ES-Module, kein Build-Schritt, kein Framework).
 *
 * Wird aufgerufen von:
 * - public/leitstand/index.html (<script type="module" src="/app.js">)
 *
 * Wichtig: Die Reihenfolge unten ist bewusst — jede initXView() registriert
 * ihre Routen bei router.js, BEVOR starteRouter() den ersten dispatch()
 * auslöst. Wird eine neue View ergänzt, muss ihr init-Aufruf vor
 * starteRouter() stehen, sonst greift ihre Route beim ersten Laden nicht.
 * Aus demselben Grund steht initZustandPoll() (F20 WS-2, AK3 — der eine
 * Poll-Timer) NACH allen initXView()-Aufrufen: jede View registriert ihr
 * abonniere() bei zustand.js, bevor der erste Tick etwas zu melden hätte.
 *
 * Dashboard/Projekt/Workboard/Capabilities haben kein eigenes onEnter (reine
 * Anzeige-Views ohne Detail-Unterrouten wie Runs/Workflows) — ihre Routen
 * registriert deshalb die Shell hier zentral, statt jede View das für sich
 * wiederholen zu lassen.
 */

import { registriere, starteRouter } from './router.js'
import { initCapabilitiesView } from './views/capabilities.js'
import { initDashboardView } from './views/dashboard.js'
import { initProjektView } from './views/projekt.js'
import { initRunsView } from './views/runs.js'
import { initWorkboardView } from './views/workboard.js'
import { initWorkflowsView } from './views/workflows.js'
import { initZustandPoll } from './zustand.js'

initDashboardView()
initProjektView()
initWorkboardView()
initRunsView()
initWorkflowsView()
initCapabilitiesView()

registriere(/^#\/dashboard$/, 'dashboard')
registriere(/^#\/projekt$/, 'projekt')
registriere(/^#\/workboard$/, 'workboard')
registriere(/^#\/capabilities$/, 'capabilities')

initZustandPoll()
starteRouter()
