/**
 * Datei: public/leitstand/api.js
 *
 * Zweck: Einzige Stelle im Leitstand-Client, die fetch() gegen die
 * bestehenden Endpunkte aufruft (F20 WS-1 Modul-Aufteilung — vorher lagen
 * alle fetch()-Aufrufe verteilt in app.js). Ändert an den Endpunkten selbst
 * NICHTS (F20-Nicht-Ziel) — jede Funktion hier entspricht 1:1 einem bereits
 * bestehenden, bereits gateway-geprüften Aufruf.
 *
 * Absichtlich dünn: eine GET-Funktion liefert das geparste JSON (wie die
 * bisherigen Aufrufstellen es taten), eine schreibende Funktion liefert die
 * rohe Response, weil die aufrufende View den Statuscode selbst auswertet
 * (400/409 mit lesbarem Grund, kein verschluckter Fehler — bestehendes
 * Muster, unverändert übernommen).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/runs.js
 * - public/leitstand/views/projekt.js
 * - public/leitstand/views/workflows.js
 * - public/leitstand/views/workboard.js (F22 WS-2)
 * - public/leitstand/views/projekte-uebersicht.js (F25 WS-2a)
 * - public/leitstand/views/chat.js (F26 WS-2a)
 * - public/leitstand/projekt-kontext.js (F25 WS-2a, setzeAktivesProjektPraefix)
 *
 * Wichtig: Kein Fehler-Handling hier (kein try/catch) — das bleibt Sache der
 * aufrufenden View, die weiß, wie sie einen Fehlschlag anzeigt (Muster
 * zeigeStartFehler/zeigePollFehler). Diese Datei baut nur die Anfrage.
 *
 * F25 WS-2a (AK10): jeder Endpunkt unten außer holeProjekte geht durch
 * mitPraefix() statt eines wörtlichen '/api'-Literals — Default-Präfix
 * '/api' liefert exakt den bisherigen Pfad (Regressionsschutz für
 * 'ai-workforce', kein Verhaltensunterschied ohne Projektwechsel). Jede
 * mitPraefix()-Aufrufstelle unten trägt deshalb NUR noch den Rest-Pfad ohne
 * eigenes '/api' (z. B. '/laeufe' statt '/api/laeufe') — scripts/leitstand-
 * server.mjs' erzeugeMultiProjektDispatcher setzt selbst ein '/api' vor den
 * Rest nach der Projekt-id (Muster GET /api/projekte/<id>/laeufe, F25 WS-1
 * AK2/AK7); ein zweites, mitgeführtes '/api' im Aufruf-Pfad ergäbe dort
 * '/api/api/...' und liefe ins Leere (real im AK15-Browser-Realtest
 * gefunden und behoben, siehe features/F25/feature.md WS-2a). Gesetzt von
 * projekt-kontext.js beim Projektwechsel (Präfix dann '/api/projekte/<id>').
 * holeProjekte() bleibt bewusst UNPRÄFIGIERT (siehe dort) — das Register
 * selbst existiert nur unpräfigiert im bestehenden defaultHandler (AK2).
 */

let aktivesProjektPraefix = '/api'

export function setzeAktivesProjektPraefix(praefix) {
  aktivesProjektPraefix = praefix
}

function mitPraefix(restPfad) {
  return `${aktivesProjektPraefix}${restPfad}`
}

/**
 * Zeitlimit für die beiden periodisch gepollten Abrufe (F-561).
 *
 * Real beobachtet (Stefans Browser, 21.09.2026 12:44 UTC): eine GET-Detailanfrage und ein
 * GET /zustand blieben in der Netzwerk-Konsole OHNE Status hängen, während derselbe Server
 * dieselben Routen per curl in 6-54 ms bzw. 52-122 ms beantwortete — der Abruf hing also im
 * Browser, nicht am Server (Initiator laut Konsole 'main.js', ein von Kaspersky injiziertes
 * Skript, das sich um window.fetch legt und XHRs an ff.kis.v2.scr.kaspersky-labs.com schickt).
 * Ein fetch, das niemals settelt, ließ den Chat-Poll dauerhaft stehen: der ausstehende Lauf
 * wurde nie terminal aufgelöst, obwohl der Server längst ABBRUCH geschrieben hatte.
 *
 * Das Zeitlimit repariert die Ursache nicht (die liegt außerhalb dieser Anwendung), sondern
 * nimmt ihr die Wirkung: ein hängender Abruf bricht nach dieser Frist ab, der Tick zählt als
 * fehlgeschlagen, und die bestehende Poll-Schleife versucht es beim nächsten Tick erneut.
 * 5 s ist großzügig gegenüber den real gemessenen Antwortzeiten (< 0,2 s) und kurz genug,
 * dass eine Auflösung nicht spürbar hängt.
 */
const POLL_ZEITLIMIT_MS = 5000

export const holeLaeufe = () => fetch(mitPraefix('/laeufe')).then((r) => r.json())
export const holeLaufDetail = (laufId) => fetch(mitPraefix(`/laeufe/${encodeURIComponent(laufId)}`), { signal: AbortSignal.timeout(POLL_ZEITLIMIT_MS) })
export const starteLauf = (koerper) => fetch(mitPraefix('/laeufe'), { method: 'POST', body: JSON.stringify(koerper) })
export const abbrichLauf = (laufId) => fetch(mitPraefix(`/laeufe/${encodeURIComponent(laufId)}/abbrechen`), { method: 'POST' })

export const holeStartfehler = () => fetch(mitPraefix('/startfehler')).then((r) => r.json())

// F21 WS-2: einmaliger Abruf beim Betreten der View bzw. bei Filterwechsel — kein Poll
// (Findings/Feature-Akten ändern sich nur durch Commits, siehe views/workboard.js).
export const holeWorkitems = (filter = {}) => {
  const params = new URLSearchParams(filter)
  const query = params.toString()
  return fetch(mitPraefix(`/workitems${query.length > 0 ? `?${query}` : ''}`)).then((r) => r.json())
}

// F20 WS-2 (AK3): Aggregat aus laeufe/startfehler/workflows, gepollt von zustand.js — einzige
// Stelle, die noch periodisch fetch() aufruft.
export const holeZustand = () => fetch(mitPraefix('/zustand'), { signal: AbortSignal.timeout(POLL_ZEITLIMIT_MS) }).then((r) => r.json())

export const holeAuftraege = () => fetch(mitPraefix('/auftraege')).then((r) => r.json())
export const legeAuftragAn = (koerper) => fetch(mitPraefix('/auftraege'), { method: 'POST', body: JSON.stringify(koerper) })

// F22 WS-2: löst den asynchronen Router-Lauf aus (202 + laufId, 409 bei D13 — scripts/leitstand-server.mjs).
export const routeAuftrag = (auftragId) => fetch(mitPraefix(`/auftraege/${encodeURIComponent(auftragId)}/routen`), { method: 'POST' })

export const holeWerkzeugsaetze = () => fetch(mitPraefix('/startvorlage/werkzeugsaetze')).then((r) => r.json())

export const sendeEntscheidungAnfrage = (koerper) => fetch(mitPraefix('/entscheidungen'), { method: 'POST', body: JSON.stringify(koerper) })

export const holeWorkflows = () => fetch(mitPraefix('/workflows')).then((r) => r.json())
// signal optional (Perf-Fix fix/zustand-poll-kosten, Punkt 5): ladeWorkflowDetail bricht damit
// die vorherige Anfrage ab, statt bei jedem Poll-Tick eine weitere parallele zu öffnen — sonst
// erschöpft eine einzige langsame Antwort das Verbindungslimit des Browsers.
export const holeWorkflowDetail = (workflowId, signal) => fetch(mitPraefix(`/workflows/${encodeURIComponent(workflowId)}`), { signal })
export const reicheWorkflowFassungEin = (koerper) => fetch(mitPraefix('/workflows'), { method: 'POST', body: JSON.stringify(koerper) })
export const starteWorkflowSchritt = (workflowId) => fetch(mitPraefix(`/workflows/${encodeURIComponent(workflowId)}/starten`), { method: 'POST', body: JSON.stringify({}) })
export const sendeWorkflowFreigabe = (workflowId, koerper) => fetch(mitPraefix(`/workflows/${encodeURIComponent(workflowId)}/freigabe`), { method: 'POST', body: JSON.stringify(koerper) })
export const stoppeWorkflow = (workflowId, koerper) => fetch(mitPraefix(`/workflows/${encodeURIComponent(workflowId)}/stoppen`), { method: 'POST', body: JSON.stringify(koerper) })
/** F39 WS-2b (löst state/findings.md F-632 Teil b): Fortsetzungsweg für eine Architektur-Entscheidung (Regel 1c). koerper: { schrittId, antworten: [{ frage, gewaehlt, begruendung? }] }. */
export const sendeWorkflowArchitekturEntscheidung = (workflowId, koerper) =>
  fetch(mitPraefix(`/workflows/${encodeURIComponent(workflowId)}/entscheidung`), { method: 'POST', body: JSON.stringify(koerper) })

// F23 WS-2a: Abnahme-Projektion (Urteil, Änderungsübersicht, etwaige bereits vorhandene Entscheidung) und -Schreibstelle.
export const holeAbnahme = (workflowId) => fetch(mitPraefix(`/workflows/${encodeURIComponent(workflowId)}/abnahme`)).then((r) => r.json())
export const sendeAbnahme = (workflowId, koerper) => fetch(mitPraefix(`/workflows/${encodeURIComponent(workflowId)}/abnahme`), { method: 'POST', body: JSON.stringify(koerper) })

// F24: Capabilities v1 (Library, Coverage, Rollen) — rein lesend, kein Poll (dieselben Gründe wie
// holeWorkitems: die Quellen ändern sich nur durch Commits bzw. echte Läufe, kein Live-Zustand).
//
// holeRessourcen/holeAbdeckung werfen bei einer Nicht-2xx-Antwort (anders als die übrigen einfachen
// GET-Wrapper hier) — views/capabilities.js ruft beide über Promise.allSettled auf, damit eine
// defekte Quelle die andere nicht mitreißt (Muster views/workboard.js); fetch() allein löst ein
// Promise NIE über den HTTP-Status auf, nur über echte Netzwerkfehler, ohne den r.ok-Check würde
// ein 500 also fälschlich als 'fulfilled' durchgehen (Code-Review-Befund).
async function holeJsonOderWirf(pfad, optionen) {
  const antwort = await fetch(pfad, optionen)
  if (!antwort.ok) {
    const inhalt = await antwort.json().catch(() => ({}))
    throw new Error(`${antwort.status} ${inhalt.grund ?? ''}`.trim())
  }
  return antwort.json()
}
export const holeRessourcen = () => holeJsonOderWirf(mitPraefix('/ressourcen'))
export const holeAbdeckung = () => holeJsonOderWirf(mitPraefix('/ressourcen/abdeckung'))
export const holeRollenBesetzung = (rolle) => fetch(mitPraefix(`/ressourcen/rollen/${encodeURIComponent(rolle)}`))

// F26 WS-2a: Chat je aktivem Projekt (mitPraefix, wie jeder andere Endpunkt außer holeProjekte).
// sendeChatNachricht löst den asynchronen Jarvis-Lauf aus (202 + laufId/auftragId, 409 bei D13,
// Muster routeAuftrag); holeChatVerlauf projiziert den 'lineage-chat-<projektId>'-Verlauf
// (leer bis zum ersten real abgeschlossenen Lauf, kein Fehler).
export const sendeChatNachricht = (koerper) => fetch(mitPraefix('/chat'), { method: 'POST', body: JSON.stringify(koerper) })
export const holeChatVerlauf = () => fetch(mitPraefix('/chat')).then((r) => r.json())

// F31 WS-2: löst "Zusammenfassen & neu starten" aus (202 + laufId/auftragId, 409 bei D13 oder
// leerem Verlauf, Muster sendeChatNachricht) — leerer Body, das Gedächtnisfenster baut der Server.
export const sendeChatZusammenfassung = () => fetch(mitPraefix('/chat/zusammenfassen'), { method: 'POST', body: JSON.stringify({}) })

// F25 WS-2a (AK11/AK13): bewusst NICHT über mitPraefix — dieser Endpunkt listet das GESAMTE
// Projektregister unabhängig vom gerade aktiven Projekt und existiert nur unpräfigiert im
// bestehenden defaultHandler (scripts/leitstand-server.mjs). Ein Präfix hier würde bei
// aktivem Nicht-Standard-Projekt fälschlich /api/projekte/<id>/projekte ansprechen.
export const holeProjekte = () => holeJsonOderWirf('/api/projekte')

// F33 WS-2: Roadmap-Projektion fürs Workboard (Karte "Roadmap", views/workboard.js) — nur beim
// Öffnen/Aktualisieren des Workboards abgerufen, NICHT im 2s-Poll (roadmap.json ändert sich nur
// durch Commits, Muster holeWorkitems). Liefert immer 200 (nicht_vorhanden/ungueltig sind
// Fachergebnisse im Körper, kein Fehlerstatus, scripts/leitstand/routen-roadmap.mjs). Zeitlimit
// wie holeZustand/holeLaufDetail (QA-Pass-Befund: ein hängender fetch, F-561, würde die Karte
// sonst ohne jede Fehlermeldung dauerhaft auf "Lädt…" stehen lassen).
export const holeRoadmap = () => fetch(mitPraefix('/roadmap'), { signal: AbortSignal.timeout(POLL_ZEITLIMIT_MS) }).then((r) => r.json())

// F32 WS-2: Verbrauchsprojektion fürs Dashboard (Karte "Verbrauch", views/dashboard.js) — nur
// beim Öffnen der View und bei Zeitraumwechsel abgerufen, NICHT im 2s-Poll (Muster holeRoadmap:
// die Laufakten ändern sich nicht durch einen laufenden Poll-Tick, sondern nur durch neue,
// abgeschlossene Läufe). `von` ist ein bereits client-seitig als gültiges ISO-8601-Datum gebauter
// Wert (views/dashboard.js `zeitraumVon`) — kein freies Nutzereingabefeld, deshalb keine eigene
// Formatprüfung hier nötig (F32-Bekannte-Grenze zu `?von=`/`?bis=`). Zeitlimit wie holeRoadmap.
// F-603-Fix: über holeJsonOderWirf statt eines rohen fetch().then(r => r.json()) — ein 500 (Muster
// holeRessourcen/holeAbdeckung) wird jetzt als Wurf erkannt statt fälschlich als Erfolg
// durchzugehen. Die Route selbst liefert bei einem eigenen Fehler ohnehin 200 mit
// { status: 'fehler', grund } (Fachergebnis, Muster baueRoadmapProjektion) — dieser Zweig deckt
// nur einen echten, sonst nicht abgefangenen Serverfehler (z. B. ein toter Prozess) ab.
export const holeVerbrauch = (von) => {
  const query = von === undefined ? '' : `?von=${encodeURIComponent(von)}`
  return holeJsonOderWirf(mitPraefix(`/verbrauch${query}`), { signal: AbortSignal.timeout(POLL_ZEITLIMIT_MS) })
}

// F34 WS-1: Sparring je aktivem Projekt (mitPraefix, wie jeder andere Endpunkt außer holeProjekte).
// sendeSparringNachricht löst den asynchronen Product-Coach-Lauf aus (202 + laufId/auftragId, 409 bei
// D13, Muster sendeChatNachricht); holeSparringVerlauf projiziert den 'lineage-sparring-<projektId>'-
// Verlauf (leer bis zum ersten real abgeschlossenen Lauf, kein Fehler) — über holeJsonOderWirf mit
// Zeitlimit (Muster holeRoadmap/holeVerbrauch, F-561), da noch kein Poll diesen Endpunkt abruft.
export const sendeSparringNachricht = (koerper) => fetch(mitPraefix('/sparring'), { method: 'POST', body: JSON.stringify(koerper) })
export const holeSparringVerlauf = () => holeJsonOderWirf(mitPraefix('/sparring'), { signal: AbortSignal.timeout(POLL_ZEITLIMIT_MS) })

// F34 Fixpaket (löst F-625): Rückverweis Turn→Auftrag NACH einem bereits erfolgreichen
// legeAuftragAn — best-effort, kein Routen/Starten (der Auftrag existiert bereits real).
export const verknuepfeSparringAuftrag = (laufId, auftragId) => fetch(mitPraefix(`/sparring/${encodeURIComponent(laufId)}/auftrag`), { method: 'POST', body: JSON.stringify({ auftragId }) })
