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
 * Dashboard/Projekt/Attention haben kein eigenes onEnter (reine Anzeige-
 * Views ohne Detail-Unterrouten wie Runs/Workflows) — ihre Routen
 * registriert deshalb die Shell hier zentral, statt jede View das für sich
 * wiederholen zu lassen. Workboard ist seit F21 WS-2, Capabilities seit
 * F24 WS-1, Projekte-Übersicht seit F25 WS-2a und Chat seit F26 WS-2a die
 * Ausnahme: alle vier brauchen beim Eintritt einen echten Abruf (onEnter)
 * und registrieren ihre Route deshalb selbst (Muster views/runs.js) — KEINE
 * zentrale `#/workboard`- bzw. `#/capabilities`- bzw.
 * `#/projekte-uebersicht`- bzw. `#/chat`-Registrierung mehr hier, sonst
 * träfen zwei Routen denselben Hash mit unterschiedlichem onEnter.
 *
 * initPersona() (F28 WS-1) läuft vor initZustandPoll(), aus demselben Grund
 * wie jede View: es registriert sein abonniere() bei zustand.js, bevor der
 * erste Tick etwas zu melden hätte.
 *
 * renderProjektKontext() (F25 WS-2a, AK14) läuft einmalig beim Bootstrap,
 * damit die Kopfzeile von Anfang an das aktive Projekt zeigt — welches das
 * ist (Standardprojekt oder ein aus der Sitzung wiederhergestelltes, siehe
 * projekt-kontext.js Kopfkommentar) entscheidet bereits deren eigener
 * Modul-Top-Level-Code, der vor diesem Aufruf gelaufen ist. Jeder spätere
 * Projektwechsel rendert die Kopfzeile über setzeAktivesProjekt() selbst
 * neu, kein zweiter Aufrufpunkt hier nötig.
 */

import { registriere, starteRouter } from './router.js'
import { renderProjektKontext } from './projekt-kontext.js'
import { initAttentionView } from './views/attention.js'
import { initCapabilitiesView } from './views/capabilities.js'
import { initChatView } from './views/chat.js'
import { initDashboardView } from './views/dashboard.js'
import { initProjektView } from './views/projekt.js'
import { initProjekteUebersichtView } from './views/projekte-uebersicht.js'
import { initRunsView } from './views/runs.js'
import { initWorkboardView } from './views/workboard.js'
import { initWorkflowsView } from './views/workflows.js'
import { initPersona } from './persona.js'
import { initZustandPoll } from './zustand.js'

renderProjektKontext()

initDashboardView()
initProjektView()
initChatView()
initProjekteUebersichtView()
initWorkboardView()
initRunsView()
initWorkflowsView()
initCapabilitiesView()
initAttentionView()
initPersona()

registriere(/^#\/dashboard$/, 'dashboard')
registriere(/^#\/projekt$/, 'projekt')

initZustandPoll()
starteRouter()
