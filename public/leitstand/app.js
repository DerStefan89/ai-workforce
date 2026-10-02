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
 * Projekt hat kein eigenes onEnter (reine Anzeige-View ohne Detail-
 * Unterrouten wie Runs/Workflows) — seine Route registriert deshalb die
 * Shell hier zentral (F44 WS-2b: Dashboard lädt beim Betreten Roadmap und
 * Workitems und registriert #/dashboard seitdem selbst), statt jede View das für sich
 * wiederholen zu lassen. Workboard ist seit F21 WS-2, Capabilities seit
 * F24 WS-1, Projekte-Übersicht seit F25 WS-2a und Chat seit F26 WS-2a die
 * Ausnahme (seit F44 WS-2b auch das Dashboard): alle brauchen beim Eintritt einen echten Abruf (onEnter)
 * und registrieren ihre Route deshalb selbst (Muster views/runs.js) — KEINE
 * zentrale `#/workboard`- bzw. `#/capabilities`- bzw.
 * `#/projekte-uebersicht`- bzw. `#/chat`-Registrierung mehr hier, sonst
 * träfen zwei Routen denselben Hash mit unterschiedlichem onEnter.
 *
 * initPersona() (F28 WS-1) läuft vor initZustandPoll(), aus demselben Grund
 * wie jede View: es registriert sein abonniere() bei zustand.js, bevor der
 * erste Tick etwas zu melden hätte. initStartView() (F29 WS-1a) registriert
 * aus demselben Grund ebenfalls vor initZustandPoll(). Ebenso initLiveChip()
 * (F46 D0, Live-Chip in der Kopfleiste, live-chip.js) und initEntscheidungenZaehler() (F46 D2,
 * Zahl am Navigationspunkt „Entscheidungen“, entscheidungen-zaehler.js).
 *
 * leiteBeimStartEin() (F29 WS-1a, views/start.js) läuft NACH allen
 * initXView()-Aufrufen (die Route '#/start' muss bereits registriert sein)
 * und VOR starteRouter() — sie setzt den Hash höchstens einmal pro Sitzung
 * auf '#/start', bevor dessen erster dispatch() ihn liest (Datei-Kommentar
 * dort). initShell() hat keine solche Reihenfolge-Abhängigkeit, steht hier nur
 * aus Lesbarkeit neben den anderen init-Aufrufen.
 *
 * F44 WS-1a: initialisiereSprache() (i18n.js) und initialisiereTheme() (theme.js) laufen
 * ALS ERSTES, vor jedem Rendern — jede View, die t() nutzt, soll von Anfang an die gespeicherte
 * Sprache sehen, und theme-color soll zum Theme passen, das das Inline-Skript in index.html
 * schon vor dem ersten Rendern gesetzt hat. Beide Module sind import-sicher (kein Zugriff auf
 * DOM oder Storage beim Import); erst diese Aufrufe lesen localStorage.
 * initEinstellungenView() registriert '#/einstellungen' wie jede andere View vor
 * starteRouter().
 *
 * F44 WS-1b: initPlatzhalterViews() registriert '#/brain' und '#/produktzyklus'
 * (views/platzhalter.js); F44 WS-2b: initNutzungView() registriert '#/nutzung' (views/nutzung.js); F44 WS-2a: initRoadmapView() registriert '#/roadmap'
 * (views/roadmap.js) wie jede andere View vor starteRouter(); F46 D1: initProjektakteView() ebenso '#/projektakte'
 * (views/projektakte.js). initKommt()
 * (kommt.js) hängt einmalig die Sperre für aria-disabled-Knöpfe an (E-F44-1), vor jeder View,
 * damit ihr Einfang-Listener vor allen übrigen Handlern steht. initShell() übersetzt die
 * statischen Texte von Sidebar und Kopf, rendert die Projektauswahl im Kopf
 * (renderProjektKontext, projekt-kontext.js — welches Projekt aktiv ist, entscheidet dessen
 * Modul-Code schon beim Import) und verdrahtet Sidebar und Kopf. Jeder spätere Projektwechsel
 * rendert die Auswahl über setzeAktivesProjekt() selbst neu.
 */

import { initialisiereSprache } from './i18n.js'
import { initKommt } from './kommt.js'
import { initEntscheidungenZaehler } from './entscheidungen-zaehler.js'
import { initLiveChip } from './live-chip.js'
import { registriere, starteRouter } from './router.js'
import { initAttentionView } from './views/attention.js'
import { initCapabilitiesView } from './views/capabilities.js'
import { initChatView } from './views/chat.js'
import { initDashboardView } from './views/dashboard.js'
import { initEinstellungenView } from './views/einstellungen.js'
import { initNutzungView } from './views/nutzung.js'
import { initPlatzhalterViews } from './views/platzhalter.js'
import { initProjektView } from './views/projekt.js'
import { initProjektakteView } from './views/projektakte.js'
import { initProjekteUebersichtView } from './views/projekte-uebersicht.js'
import { initRoadmapView } from './views/roadmap.js'
import { initRunsView } from './views/runs.js'
import { initStartView, leiteBeimStartEin } from './views/start.js'
import { initWorkboardView } from './views/workboard.js'
import { initWorkflowsView } from './views/workflows.js'
import { initPersona } from './persona.js'
import { initShell } from './shell.js'
import { initialisiereTheme } from './theme.js'
import { initZustandPoll } from './zustand.js'

initialisiereSprache()
initialisiereTheme()
initKommt()

initDashboardView()
initProjektView()
initChatView()
initProjekteUebersichtView()
initWorkboardView()
initRunsView()
initWorkflowsView()
initCapabilitiesView()
initAttentionView()
initEinstellungenView()
initPlatzhalterViews()
initNutzungView()
initRoadmapView()
initProjektakteView()
initStartView()
initPersona()
initLiveChip()
initEntscheidungenZaehler()
initShell()

registriere(/^#\/projekt$/, 'projekt')

initZustandPoll()
leiteBeimStartEin()
starteRouter()
