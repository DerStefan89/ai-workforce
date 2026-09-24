/**
 * Datei: public/leitstand/views/chat.js
 *
 * Zweck: View `#/chat` (F26 WS-2a) — natürliche Eingabe im Kontext des
 * aktiven Projekts (Kontextzeile in der Kopfzeile, Muster jeder anderen
 * View, projekt-kontext.js). Der deterministische Vorfilter
 * (jarvis-vorfilter.js) beantwortet "was braucht mich"/"Status…" lokal, ohne
 * Serverkontakt; alles andere geht an POST /api/chat (echter Jarvis-Lauf,
 * asynchron: 202 + laufId, kein Streaming — One-Shot bleibt, E-M4-3 "Der
 * Chat umgeht Router, Freigabe und Automat nicht").
 *
 * F34 WS-2: die Spalte trägt jetzt ZWEI Modi — "Jarvis" (unverändert) und
 * "Sparring" (Rolle 'product-coach', F34 WS-1, POST/GET /api/sparring) —
 * über einen Umschalter (#chat-modus-jarvis-btn/#chat-modus-sparring-btn,
 * initModusUmschalter). MODI (unten) ist die EINZIGE Stelle, an der sich
 * beide Modi unterscheiden (Endpunkte, Antwortfeld im persistierten
 * Eintrag, Titel/Platzhalter, ob Vorfilter/Zusammenfassen gelten) — jede
 * bisherige Jarvis-Funktion (ladeVerlauf, sendeAktuelleEingabe,
 * pruefeAusstehendenLauf, der 500ms-Poll, renderVerlauf, …) ist auf ein
 * 'modus'-Argument parametrisiert statt kopiert (D5). Der Modulzustand
 * (persistierterVerlauf/lokaleEintraege/ausstehenderLauf/zeigeAlle/
 * Poll-Timeout) liegt seither JE MODUS in zustandJeModus — ein in einem
 * Modus ausstehender Lauf pollt unabhängig vom aktuell ANGEZEIGTEN Modus
 * weiter (D13 erlaubt ohnehin nur einen aktiven Lauf serverweit; ein
 * Modus-Wechsel während eines ausstehenden Laufs darf dessen Poll nicht
 * stoppen, sonst bliebe die fertige Antwort unbemerkt liegen, bis die View
 * erneut betreten wird). Der gewählte Modus wird in localStorage gemerkt
 * (try/catch, Muster shell.js CHAT_OFFEN_SCHLUESSEL).
 *
 * F34 WS-2 (löst state/findings.md F-606, "Chat → Auftrag fehlt"): ein
 * Sparring-Turn mit art 'scope_entwurf' und ein Jarvis-Turn mit art
 * 'auftrag_vorschlag' bekommen einen "Als Auftrag anlegen"-Button
 * (initAuftragBruecke) — Klick öffnet eine vorbefüllte, editierbare
 * Bestätigung INLINE unter der Sprechblase (offenerAuftragDialog, EIN
 * Dialog gleichzeitig), erst "Anlegen" ruft POST /api/auftraege
 * (legeAuftragAn, bestehender F12-Pfad, unverändert). Titel/Auftragstext
 * für Sparring kommen aus baueAuftragAusScope (public/leitstand/
 * auftrag-aus-scope.js — reine JS-Kopie von src/product-coach/index.ts'
 * gleichnamiger Funktion, weil ein Browser ohne Build-Schritt kein .ts
 * lädt; Verhaltensgleichheit prüft scripts/check-f34-product-coach.mjs
 * mechanisch gegen dieselben Fixtures), für Jarvis direkt aus
 * auftrag.titel/auftrag.text (kein Builder nötig). KEIN automatisches
 * Anlegen, KEIN Routen/Starten (Auftrag-Wortlaut) — nur POST /api/auftraege,
 * bei Erfolg ein Link auf '#/projekt' (die tatsächliche Aufträge-Übersicht;
 * ein frisch angelegter Auftrag ist kein Workboard-Workitem im F21-Sinn,
 * s. "Bekannte Grenzen" in features/F34/feature.md).
 *
 * Der persistierte Verlauf (GET /api/chat bzw. GET /api/sparring, Checkpoint-Kette
 * 'lineage-chat-<projektId>' bzw. 'lineage-sparring-<projektId>') wird beim ersten Mount der Chat-Spalte
 * (initChatView, Shell-Bootstrap) UND zusätzlich bei jedem Betreten der
 * View '#/chat' geladen (F29 WS-D2-Korrektur: die Chat-Spalte ist ab
 * ≥1280px in jeder View sichtbar, nicht nur unter '#/chat') — ein
 * Reload verliert dadurch nichts (AK4), ABER nur für bereits real
 * ABGESCHLOSSENE/ERFOLGREICHE Jarvis-/Sparring-Antworten. QA-Befund (WS-2a, real
 * nachvollzogen): ein Reload MITTEN in einem ausstehenden Lauf verliert die
 * Pending-Anzeige (ausstehenderLauf lebt nur im Modulspeicher) — die
 * fertige Antwort erscheint danach erst, wenn die View ein weiteres Mal
 * verlassen und wieder betreten wird (registriere-onEnter lädt dann
 * beide Modi neu und findet den inzwischen geschriebenen Eintrag). Kein
 * Datenverlust (der Server hat den Lauf/die Lineage unabhängig vom Client
 * geschrieben), aber kein automatisches Nachladen ohne erneuten
 * View-Eintritt — bewusste, dokumentierte Grenze statt stillschweigend
 * übergangen (CLAUDE.md-Entscheidungsregel 5), eine "läuft gerade etwas"-
 * Projektion über einen Reload hinweg wäre eine eigene Server-Erweiterung.
 *
 * Ein laufender Jarvis-Lauf wurde bis F31 WS-3 über den gemeinsamen
 * 2-Sekunden-Poll (zustand.js, abonniereDetailAuffrischer) verfolgt. F31
 * WS-3 (Latenzmessung, features/F31/latenzmessung.md Abschnitt 4, Hebel 4)
 * ersetzt das durch einen EIGENEN, schnelleren Timer (500ms,
 * ausstehendenLaufTimer unten), der NUR läuft, solange ausstehenderLauf
 * gesetzt ist — der gemeinsame zustand.js-Timer und damit jeder andere Poll
 * (Zustand-Aggregat, Workflow-Detail, F26-Perf-Fix) bleibt unverändert bei
 * 2000ms, diese View liest daraus weiterhin nur letzterZustand (Vorfilter).
 * Erst wenn der Lauf real ABGESCHLOSSEN ist, wird der Verlauf neu geladen
 * (der Server hat den Lineage-Eintrag dann bereits geschrieben, siehe
 * scripts/leitstand-server.mjs starteRollenChatLauf nachLauf-Callback —
 * synchron im selben Tick wie der Terminalstatus, kein Wettlauf). Schlägt
 * dieses Neuladen selbst transient fehl, bleibt der Lauf als ausstehend
 * markiert (QA-Befund) — der nächste Poll-Tick prüft denselben, bereits
 * terminalen Lauf erneut und versucht das Neuladen einfach noch einmal,
 * statt die gerade fertig gewordene Antwort kommentarlos verschwinden zu
 * lassen.
 *
 * Vorfilter-Antworten und ein fehlgeschlagener/verweigerter Jarvis-Lauf
 * erscheinen NUR lokal für diese Sitzung (nicht in lineage-chat, siehe
 * jarvis-vorfilter.js Kopfkommentar) — ein Reload zeigt danach wieder genau
 * den serverseitig persistierten Verlauf. Ein Projektwechsel
 * (projekt-kontext.js, abonniereProjektWechsel) setzt denselben lokalen
 * Zustand zusätzlich explizit zurück (jetzt für BEIDE Modi) — QA-Befund
 * (real reproduziert): ohne diesen Reset blieb eine ausstehende Nachricht/
 * ein lokaler Eintrag aus dem VORHERIGEN Projekt dauerhaft sichtbar bzw.
 * pollte für immer gegen den falschen, jetzt fremden api.js-Präfix (404 bei
 * jedem Tick, Senden-Button blieb tot).
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initChatView beim Bootstrap)
 * - public/leitstand/views/projekte-uebersicht.js (wechsleZuSparringProjekt, F41 WS-2 — "Zum
 *   Coach-Interview" nach dem Anlegen eines neuen Projekts)
 *
 * F29 WS-2a: reine Stylingumstellung auf das Komponentenvokabular aus
 * views/workboard.js (WS-1b) — jeder Verlaufseintrag ist jetzt eine .card,
 * die Quelle ein .badge (ok/aktiv/neutral/fehler, kein neues Farbpaar —
 * "fehler" bleibt Rot, wie in den anderen Views), "Senden" ist
 * .btn.btn-primary. KEIN neuer Schreib-/Auto-Apply-Button, KEINE Änderung
 * an Poll-/Timer-/Sende-Verhalten.
 *
 * F29 WS-D2 (Auftrag Punkt C, "Chat mit Jarvis" in der rechten Spalte —
 * #shell-chat-spalte IST diese rechte Spalte, keine zweite Chat-Ansicht):
 * reine Darstellungsänderung. ladeVerlauf()/pruefeAusstehendenLauf()/der
 * Sende-Ablauf in initSendenFormular() (Vorfilter → POST /api/chat, D13,
 * Terminal-Erkennung) sind UNVERÄNDERT (Nicht-Ziel: Poll-/Sende-Logik). Neu:
 * (a) renderEintrag zerlegt einen Verlaufseintrag jetzt in zwei
 * Sprechblasen (Nutzer rechts, Jarvis links, Mini-Avatare) statt einer
 * Karte; (b) renderVerlauf zeigt standardmäßig nur die LETZTEN ZWEI
 * Einträge, "Ganzen Verlauf öffnen/schließen" (zeigeAlleUmschalten) ist ein
 * rein lokaler Anzeige-Umschalter, kein zweiter Fetch/keine zweite Route;
 * (c) ein Tippindikator ersetzt die Antwort-Sprechblase, solange
 * ausstehenderLauf gesetzt ist; (d) lokale Einträge (vorfilter/fehler) UND
 * ausstehenderLauf tragen jetzt zusätzlich einen client-seitig erfassten
 * zeitstempel (Auftrag: Uhrzeit je Sprechblase) — persistierte, historische
 * Einträge aus GET /api/chat haben serverseitig KEIN Zeitfeld (Datenlage,
 * keine erfundene Zeit), ihre Sprechblase zeigt deshalb keine Uhrzeit; (e)
 * Enter sendet (Shift+Enter bleibt Zeilenumbruch, Auftrag-Hinweistext) —
 * ruft denselben, unveränderten Sende-Pfad wie der Button.
 *
 * F30 WS-1 (Aufgabe 1, additiv, keine Architekturänderung): #chat-abbrechen-btn
 * ist sichtbar, solange ausstehenderLauf gesetzt ist (initAbbrechenBedienung),
 * und löst POST /api/laeufe/<laufId>/abbrechen (F14, bereits von views/runs.js
 * genutzt) aus. Der Klick selbst schreibt KEINEN Verlaufseintrag und setzt
 * ausstehenderLauf NICHT zurück — das bleibt allein Sache des bestehenden
 * pruefeAusstehendenLauf-Polls, der einen jetzt FEHLGESCHLAGENEN Lauf bereits
 * unverändert wie jeden anderen nicht erfolgreichen Lauf terminal auflöst
 * (D13: der Server, nicht der Client, entscheidet, wann der Lauf wirklich
 * nicht mehr aktiv ist — ein sofortiges lokales Auflösen könnte die
 * Senden-Sperre freigeben, während der Server den vorherigen Lauf noch als
 * aktiv führt).
 *
 * F31 WS-2 (Gesprächsgedächtnis + "Zusammenfassen & neu starten"): #chat-zusammenfassen-btn
 * löst POST /api/chat/zusammenfassen aus — denselben D13/202/Poll-Pfad wie eine normale
 * Nachricht (sendeZusammenfassungAnfrage), nur ohne Vorfilter (eine Zusammenfassung hat keine
 * lokal beantwortbare Kurzform). renderVerlauf() leitet die Sperre für BEIDE Buttons aus
 * zustand.sendenLaeuft/ausstehenderLauf ab (Muster Sende-Sperre) — ein zweiter Lauf während eines
 * ausstehenden ist ohnehin per D13 unmöglich.
 * Ein serverseitig erzeugter Zusammenfassungs-Turn trägt istZusammenfassung: true (GET
 * /api/chat, verarbeiteJarvisChatErgebnis) und wird hier zweifach ausgewertet: renderEintrag
 * zeigt ihn mit einem Trenner-Label und einer dezenten Nutzerzeile ("[Zusammenfassung
 * angefordert]"); renderVerlauf setzt bei NICHT zeigeAlle den Standard-Ausschnitt auf "ab dem
 * letzten Zusammenfassungs-Turn (inklusive) plus alles danach" statt der bisherigen letzten
 * zwei Einträge — ohne einen solchen Turn bleibt das Verhalten unverändert (letzte zwei). F34
 * WS-2: 'sparring' kennt kein Zusammenfassen (kein POST /api/sparring/zusammenfassen, F34-WS-1-
 * Nicht-Ziel) — #chat-zusammenfassen-btn bleibt für diesen Modus versteckt (MODI.hatZusammenfassen).
 *
 * F31 WS-3 (Latenzmessung, features/F31/latenzmessung.md Abschnitt 4, Hebel 4): der
 * ausstehenderLauf-Poll läuft seither über eine eigene, verkettete setTimeout-Schleife (500ms,
 * starteAusstehendenLaufPoll/stoppeAusstehendenLaufPoll — bewusst setTimeout statt setInterval,
 * siehe Kommentar dort), NICHT mehr über den gemeinsamen 2-Sekunden-Timer aus zustand.js — der
 * bleibt für jeden anderen Poll (Zustand-Aggregat, Workflow-Detail) unverändert bei 2000ms. Der
 * Poll startet, sobald sendeAktuelleEingabe/sendeZusammenfassungAnfrage ausstehenderLauf setzen,
 * und stoppt, sobald pruefeAusstehendenLauf ihn terminal auflöst oder setzeChatZustandZurueck
 * (Projektwechsel) ihn zurücksetzt — läuft er bereits, ist ein erneutes Starten ein No-op (kein
 * zweiter Poll parallel). Ein Reload MITTEN in einem ausstehenden Lauf startet weiterhin keinen
 * Poll (ausstehenderLauf lebt nur im Modulspeicher, unverändert zur bereits oben dokumentierten
 * Grenze) — dasselbe galt schon für den vorherigen, gemeinsamen Timer, weil pruefeAusstehendenLauf
 * ohne ausstehenderLauf sofort zurückkehrte.
 *
 * fix/chat-fehler-anzeige (F-564, F-576), reine Client-Änderung, kein Server-/Persistenz-Umbau:
 * (F-564) ein manueller Abbruch (#chat-abbrechen-btn) endete serverseitig ununterscheidbar von einem
 * echten Fehlschlag als ABGESCHLOSSEN/FEHLGESCHLAGEN und wurde entsprechend als "nicht erfolgreich
 * (FEHLGESCHLAGEN)" gemeldet, obwohl der Nutzer selbst abgebrochen hatte —
 * beschreibeNichtErfolgreichesEnde meldet diesen Fall jetzt anhand des bereits vorhandenen,
 * sitzungslokalen abbruchAngefordert-Flags als "Lauf abgebrochen.". (F-576) lokaleEintraege wurde
 * bislang IMMER ans Ende der Anzeigeliste gehängt (baueAnzeigeListe), unter der Annahme, ein lokaler
 * Eintrag (Vorfilter-Antwort oder Fehlanzeige) liege chronologisch immer nach dem zuletzt geladenen
 * persistierterVerlauf-Stand — das gilt nur im Push-Moment, nicht mehr sobald danach weitere
 * Nachrichten erfolgreich persistiert werden (ladeVerlauf() lädt nach jedem erfolgreichen Lauf neu).
 * Jeder lokale Eintrag trägt seither persistierterVerlaufLaengeBeiPush (die Länge von
 * persistierterVerlauf zum Push-Zeitpunkt); baueAnzeigeListe() setzt ihn beim Rendern an genau dieser
 * Position zwischen die zu diesem Zeitpunkt bereits persistierten und die seither neu hinzugekommenen
 * persistierten Einträge ein, statt ihn pauschal ans Ende zu hängen.
 *
 * F34 Fixpaket (löst state/findings.md F-624/F-625, Feature-Review-Pass Gesamt 23.09.2026):
 * (F-624) baueAnzeigeListe('sparring') zeigte bislang IMMER den kompletten 'sparring-<projektId>'-
 * Verlauf — 'feature'- und 'projekt'-Turns chronologisch gemischt, ohne jede Kennzeichnung, obwohl das
 * Modell-Kontextfenster (ladeRollenVerlaufsfenster, F-614) längst nach modus filtert. Jeder Eintrag
 * trägt jetzt eintragModus (persistiert: das Server-Feld 'modus'; lokal/ausstehend: der bei Sende-/
 * Push-Zeitpunkt aktive sparringUntermodus), baueAnzeigeListe filtert am Ende NUR für 'sparring' danach
 * — 'jarvis' bleibt bitgenau unverändert. (F-625) "Als Auftrag anlegen" konnte nach einem Moduswechsel
 * oder Reload beliebig oft ein inhaltsgleiches Duplikat anlegen, weil der einzige Erfolgs-Indikator
 * (offenerAuftragDialog.erfolgAuftragId) rein transienter Modulzustand war. Ein erfolgreiches Anlegen
 * schreibt seither zusätzlich einen minimalen Rückverweis (verknuepfeSparringAuftrag, POST
 * /api/sparring/<laufId>/auftrag, best-effort) — GET /api/sparring projiziert ihn als
 * 'auftragErstelltId' je Turn, renderAuftragBruecke zeigt dafür einen statischen "bereits angelegt"-
 * Hinweis statt des Triggers.
 */

import { abbrichLauf, holeChatVerlauf, holeLaufDetail, holeSparringVerlauf, legeAuftragAn, sendeChatNachricht, sendeChatZusammenfassung, sendeSparringNachricht, verknuepfeSparringAuftrag } from '../api.js'
import { escapeHtml, formatiereUhrzeit } from '../render.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { registriere } from '../router.js'
import { abonniere } from '../zustand.js'
import { loeseVorfilterAuf } from '../jarvis-vorfilter.js'
import { baueAuftragAusScope } from '../auftrag-aus-scope.js'
import { baueAuftragAusProjektentwurf, entferneIdPraefix } from '../auftrag-aus-projektentwurf.js'

/**
 * F34 WS-2: die einzige Stelle, an der sich 'jarvis' und 'sparring' unterscheiden — jede Funktion
 * unten nimmt 'modus' als Parameter (oder liest aktiverModus) und schlägt hier nach, statt eine
 * zweite Fassung von ladeVerlauf/sendeAktuelleEingabe/pruefeAusstehendenLauf/renderVerlauf zu
 * pflegen (D5). 'leseAntwort' liest das rollenspezifische Antwortfeld eines persistierten Eintrags
 * (jarvisAntwort/coachAntwort); 'hatVorfilter'/'hatZusammenfassen' schalten Jarvis-only-Bedienung
 * für 'sparring' ab (kein lokaler Vorfilter für Sparring-Anfragen, kein POST
 * /api/sparring/zusammenfassen — F34 WS-1 Nicht-Ziel).
 */
const MODI = {
  jarvis: {
    id: 'jarvis',
    label: 'Jarvis',
    titelText: 'Chat mit Jarvis',
    platzhalter: 'Nachricht an Jarvis …',
    holeVerlauf: holeChatVerlauf,
    sendeNachricht: sendeChatNachricht,
    leseAntwort: (eintrag) => eintrag.jarvisAntwort,
    hatVorfilter: true,
    hatZusammenfassen: true,
    antwortLabel: 'Jarvis',
  },
  sparring: {
    id: 'sparring',
    label: 'Sparring',
    titelText: 'Sparring mit dem Product Coach',
    platzhalter: 'Nachricht an den Product Coach …',
    holeVerlauf: holeSparringVerlauf,
    sendeNachricht: sendeSparringNachricht,
    leseAntwort: (eintrag) => eintrag.coachAntwort,
    hatVorfilter: false,
    hatZusammenfassen: false,
    antwortLabel: 'Coach',
  },
}

const MODUS_SCHLUESSEL = 'leitstand-chat-modus'

/** F34 WS-2: gemerkter Modus (try/catch, Muster shell.js CHAT_OFFEN_SCHLUESSEL) — ein privates Fenster/blockierter Zugriff fällt auf 'jarvis' zurück, kein Absturz. */
function gespeicherterModus() {
  try {
    const wert = localStorage.getItem(MODUS_SCHLUESSEL)
    return wert !== null && Object.hasOwn(MODI, wert) ? wert : 'jarvis'
  } catch {
    return 'jarvis'
  }
}

function speichereModus(modus) {
  try {
    localStorage.setItem(MODUS_SCHLUESSEL, modus)
  } catch {
    // Privates Fenster/blockierter Zugriff — die Präferenz gilt dann nur für die laufende Ansicht.
  }
}

/** F34 WS-2: der gerade angezeigte Modus. */
let aktiverModus = gespeicherterModus()

const UNTERMODUS_SCHLUESSEL = 'leitstand-chat-sparring-untermodus'
const SPARRING_UNTERMODI = ['feature', 'projekt']

/** F34 WS-3: gemerkter Sparring-Unterumschalter ('feature'/'projekt', Muster gespeicherterModus). */
function gespeicherterUntermodus() {
  try {
    const wert = localStorage.getItem(UNTERMODUS_SCHLUESSEL)
    return wert !== null && SPARRING_UNTERMODI.includes(wert) ? wert : 'feature'
  } catch {
    return 'feature'
  }
}

function speichereUntermodus(untermodus) {
  try {
    localStorage.setItem(UNTERMODUS_SCHLUESSEL, untermodus)
  } catch {
    // Privates Fenster/blockierter Zugriff — die Präferenz gilt dann nur für die laufende Ansicht.
  }
}

/**
 * F34 WS-3 (E-M5-12): Sparring-Unterumschalter "Feature | Projekt" — nur im Modus 'sparring'
 * wirksam. 'feature' ist das unveränderte WS-1/WS-2-Sparring (POST /api/sparring ohne 'modus',
 * Server-Standard); 'projekt' löst das Projekt-Interview aus (POST /api/sparring { modus:
 * 'projekt' }, art 'projekt_entwurf' statt 'scope_entwurf'). Beeinflusst NICHT, welcher Verlauf
 * geladen wird — beide Unterumschalter-Stellungen teilen sich denselben 'sparring-<projektId>'-
 * Verlauf (ein Turn trägt serverseitig sein eigenes 'modus'-Feld, GET /api/sparring).
 */
let sparringUntermodus = gespeicherterUntermodus()

/** @returns ein frischer, leerer Zustandsblock für einen Modus (Muster der bisherigen Modulvariablen). */
function neuerModusZustand() {
  return {
    /** F29 WS-D2 (Auftrag Punkt C): true zeigt den vollständigen Verlauf, false nur die letzten zwei Einträge — reiner Anzeige-Umschalter ("Ganzen Verlauf öffnen"/"schließen"), kein zweiter Fetch. */
    zeigeAlle: false,
    /** Persistierter Verlauf aus GET /api/chat bzw. GET /api/sparring, roh (Server-Reihenfolge, aufsteigend). */
    persistierterVerlauf: [],
    /** Lokale, NICHT persistierte Einträge dieser Sitzung — Vorfilter-Antworten (nur 'jarvis') und die Fehlanzeige eines nicht erfolgreichen Laufs (siehe Datei-Kopf, F-576). */
    lokaleEintraege: [],
    /** Der gerade laufende, noch nicht terminierte Lauf DIESES Modus, oder null. @type {{ nachricht: string, laufId: string, messung?: Messung } | null} */
    ausstehenderLauf: null,
    /** F34 WS-2 (Verifikations-Fund): true im schmalen Zeitfenster VOR dem Setzen von ausstehenderLauf (Vorfilter-Abruf/die eigentliche POST-Anfrage) — renderVerlauf() leitet die Sende-Sperre aus diesem Flag UND ausstehenderLauf ab, damit kein zweiter, imperativer Sperr-Mechanismus nötig ist. */
    sendenLaeuft: false,
    /** Handle des eigenen 500ms-Polls DIESES Modus (siehe Datei-Kopf), oder null, solange keiner läuft. */
    ausstehenderLaufTimeout: null,
    /** Verlauf wurde mindestens einmal erfolgreich geladen — steuert, ob initModusUmschalter beim ersten Wechsel in diesen Modus nachlädt. */
    geladen: false,
  }
}

/** F34 WS-2: EIN Zustandsblock je Modus (Muster: unabhängiger Poll pro Modus, s. Datei-Kopf). */
const zustandJeModus = { jarvis: neuerModusZustand(), sparring: neuerModusZustand() }

/** Letztes Zustands-Aggregat aus dem Poll (für den Vorfilter), oder null vor dem ersten Tick. */
let letzterZustand = null

/**
 * F34 WS-2 (löst F-606): der gerade offene "Als Auftrag anlegen"-Bestätigungsdialog, oder null.
 * EIN Dialog gleichzeitig (Muster der einzeiligen Editier-Formulare in views/projekt.js). 'schluessel'
 * identifiziert den Verlaufseintrag, zu dem der Dialog gehört (laufId, sonst Index — s.
 * baueAuftragBrueckenSchluessel), damit ein Re-Render (Poll-Tick) den bereits offenen Dialog samt
 * etwaig bereits editierter Werte nicht verliert.
 * @type {{ modus: string, schluessel: string, titel: string, auftragstext: string, gesperrt: boolean, fehler: string, erfolgAuftragId: string | null } | null}
 */
let offenerAuftragDialog = null

/**
 * Task "Jarvis-Chat-Latenz senken" (state/), Schritt 1: reine Diagnose, kein
 * Servereingriff. Vier Zeitmarken je Turn (performance.now(), monoton,
 * unbeeinflusst von Systemuhr-Sprüngen): tSenden (Absenden-Klick),
 * tServerQuittung (202 von POST /api/chat[/zusammenfassen] erhalten),
 * tPollErgebnis (erster Poll-Tick mit terminalem Ergebnis für DIESEN
 * laufId), tDarstellung (Verlauf/Fehleranzeige gerendert). tickZeiten
 * sammelt performance.now() bei jedem Poll-Tick dieses Laufs (auch den
 * nicht-terminalen) — daraus Tick-Anzahl und größte Tick-Lücke.
 * @typedef {{ tSenden: number, tServerQuittung: number, tickZeiten: number[] }} Messung
 */

/** @param messung - Messung eines Laufs @param tPollErgebnis - performance.now() beim terminalen Poll-Tick @param tDarstellung - performance.now() nach dem Rendern Meldet eine console.info-Zeile mit den vier Deltas plus Tick-Anzahl/größter Tick-Lücke (F-Nachweis, kein Server-Call, keine Persistenz). */
function protokolliereClientLatenz(messung, tPollErgebnis, tDarstellung) {
  const tickLuecken = messung.tickZeiten.slice(1).map((t, i) => t - messung.tickZeiten[i])
  console.info('[jarvis-latenz] Chat-Turn:', {
    absenden_bis_quittung_ms: Math.round(messung.tServerQuittung - messung.tSenden),
    quittung_bis_pollergebnis_ms: Math.round(tPollErgebnis - messung.tServerQuittung),
    pollergebnis_bis_darstellung_ms: Math.round(tDarstellung - tPollErgebnis),
    gesamt_ms: Math.round(tDarstellung - messung.tSenden),
    poll_ticks: messung.tickZeiten.length,
    groesste_poll_luecke_ms: tickLuecken.length === 0 ? null : Math.round(Math.max(...tickLuecken)),
  })
}

const AUSSTEHENDER_LAUF_POLL_MS = 500

/**
 * Plant den nächsten Tick per setTimeout, NICHT setInterval (scripts/check-f20-zustand-poll.mjs
 * AK3 erzwingt mechanisch genau einen 'setInterval('-Aufruf in public/leitstand/**, in zustand.js
 * — Regressionsschutz gegen die vor F20 WS-2 bestehenden Mehrfach-Timer. Dieser Poll ist bewusst
 * KEIN zweiter Aggregat-Timer dieser Art: er zielt auf eine einzelne Lauf-Detailressource
 * (GET /api/laeufe/<laufId>), läuft nur befristet, solange ausstehenderLauf gesetzt ist, und
 * plant erst nach Abschluss des vorherigen Ticks neu — ein langsamer Fetch häuft dadurch keine
 * überlappenden Requests an, wie es bei setInterval möglich wäre). F34 WS-2: 'modus' bindet den
 * Poll an den Modus, für den er gestartet wurde — NICHT an aktiverModus (ein Modus-Wechsel
 * während eines ausstehenden Laufs darf dessen Poll nicht stoppen, s. Datei-Kopf).
 */
function planeNaechstenAusstehendenLaufPoll(modus) {
  const zustand = zustandJeModus[modus]
  zustand.ausstehenderLaufTimeout = setTimeout(async () => {
    // QA-Befund F31 WS-3: try/finally, NICHT nur await — ein Wurf aus pruefeAusstehendenLauf (z. B.
    // ein unerwartet geformtes GET /api/laeufe/<laufId>-Ergebnis) darf die Kette nicht dauerhaft
    // abbrechen. Ohne das bliebe ausstehenderLaufTimeout auf der bereits verbrauchten Timeout-ID
    // stehen, starteAusstehendenLaufPoll hielte den Poll fälschlich für "läuft schon" und der
    // Tippindikator/die Senden-Sperre blieben für den Rest der Sitzung hängen.
    try {
      await pruefeAusstehendenLauf(modus)
    } finally {
      if (zustand.ausstehenderLaufTimeout !== null) planeNaechstenAusstehendenLaufPoll(modus)
    }
  }, AUSSTEHENDER_LAUF_POLL_MS)
}

/** Startet den 500ms-Poll für 'modus', falls noch keiner läuft (No-op sonst) — aufgerufen, sobald ausstehenderLauf gesetzt wird. */
function starteAusstehendenLaufPoll(modus) {
  if (zustandJeModus[modus].ausstehenderLaufTimeout !== null) return
  planeNaechstenAusstehendenLaufPoll(modus)
}

/** Stoppt den 500ms-Poll für 'modus', falls einer läuft (No-op sonst) — aufgerufen, sobald ausstehenderLauf terminal aufgelöst oder zurückgesetzt wird. */
function stoppeAusstehendenLaufPoll(modus) {
  const zustand = zustandJeModus[modus]
  if (zustand.ausstehenderLaufTimeout === null) return
  clearTimeout(zustand.ausstehenderLaufTimeout)
  zustand.ausstehenderLaufTimeout = null
}

/**
 * Task "Jarvis-Chat-Latenz senken", Schritt 4: wird der Tab wieder sichtbar
 * (visibilitychange → 'visible'), während ein Lauf aussteht, löst das
 * SOFORT einen Poll-Tick aus, statt bis zu 500ms auf den nächsten
 * geplanten Tick zu warten — der typische Fall ist ein Nutzer, der den Tab
 * während des Wartens verlassen hat und beim Zurückkehren die Antwort
 * ohne die volle Poll-Verzögerung sehen soll. Kein zweiter setInterval
 * (scripts/check-f20-zustand-poll.mjs AK3 bleibt unberührt, reiner
 * Event-Listener). No-op ohne ausstehenden Lauf oder ohne laufenden Poll
 * (z. B. exakt zwischen Terminallage und stoppeAusstehendenLaufPoll).
 * try/finally wie planeNaechstenAusstehendenLaufPoll (QA-Muster F31 WS-3):
 * ein Wurf aus pruefeAusstehendenLauf darf die Kette nicht abbrechen.
 * F34 WS-2: prüft BEIDE Modi (ein im Hintergrund-Modus ausstehender Lauf
 * profitiert vom Sofort-Tick genauso wie der gerade angezeigte).
 */
async function polleSofortBeiSichtbarkeit() {
  if (document.visibilityState !== 'visible') return
  for (const modus of Object.keys(MODI)) {
    const zustand = zustandJeModus[modus]
    if (zustand.ausstehenderLauf === null || zustand.ausstehenderLaufTimeout === null) continue
    clearTimeout(zustand.ausstehenderLaufTimeout)
    zustand.ausstehenderLaufTimeout = null
    try {
      await pruefeAusstehendenLauf(modus)
    } finally {
      if (zustand.ausstehenderLauf !== null) planeNaechstenAusstehendenLaufPoll(modus)
    }
  }
}

/** @param antwort - Rollen-Ergebnis-artiges Objekt ({ art, antwort, … }) oder null @returns Anzeigetext */
function antwortText(antwort) {
  if (antwort === null || typeof antwort?.antwort !== 'string') return '(keine lesbare Antwort)'
  return antwort.antwort
}

/**
 * Baut die Anzeigeliste: persistierter Verlauf (bereits serverseitig aufsteigend sortiert), lokale Einträge
 * jeweils an der Position einsortiert, die ihr persistierterVerlaufLaengeBeiPush entspricht (F-576, s.
 * lokaleEintraege), und ein etwaiger ausstehender Lauf zuletzt. lokaleEintraege ist nach
 * persistierterVerlaufLaengeBeiPush bereits aufsteigend sortiert (Push-Reihenfolge, persistierterVerlauf
 * wächst zwischen zwei Pushes nie rückwärts — einzige Ausnahme ist setzeChatZustandZurueck, das
 * lokaleEintraege im selben Zug leert), ein sequenzieller Durchlauf beider Listen reicht deshalb. F29 WS-D2:
 * zeitstempel ist bei persistierten Einträgen IMMER null (der Server führt keines, Auftrag Punkt E: keine
 * erfundene Zeit), bei lokalen der beim Push erfasste Wert (s. initSendenFormular/pruefeAusstehendenLauf).
 * F34 Fixpaket (löst F-624): 'feature' und 'projekt' teilen sich denselben persistierten
 * 'sparring-<projektId>'-Verlauf (Muster ladeRollenVerlaufsfenster, das serverseitige Pendant für den
 * Modell-Kontext, F-614) — jeder Eintrag trägt jetzt 'eintragModus' (persistiert: das vom Server
 * gelieferte 'modus'-Feld, Alt-Eintrag ohne Feld gilt als 'feature'; lokal: der bei Sende-/Push-
 * Zeitpunkt aktive sparringUntermodus, s. sendeAktuelleEingabe/pruefeAusstehendenLauf — NICHT der
 * ggf. inzwischen gewechselte aktuelle) und wird am Ende dieser Funktion für 'sparring' danach
 * gefiltert, ob er zum GERADE angezeigten sparringUntermodus gehört — 'jarvis' bleibt unangetastet
 * (kein 'eintragModus'-Konzept dort, die Filterung ist strikt auf modus === 'sparring' gegattert).
 * @param modus - 'jarvis' | 'sparring'
 */
function baueAnzeigeListe(modus) {
  const zustand = zustandJeModus[modus]
  const leseAntwort = MODI[modus].leseAntwort
  const persistiert = zustand.persistierterVerlauf.map((e, index) => {
    const antwort = leseAntwort(e)
    return {
      nachricht: e.nachricht,
      antwortText: antwortText(antwort),
      antwort,
      quelle: modus,
      zeitstempel: null,
      istZusammenfassung: e.istZusammenfassung === true,
      schluessel: e.laufId ?? `persistiert-${index}`,
      eintragModus: e.modus ?? 'feature',
      // F34 Fixpaket (löst F-625): vom Server projizierter Rückverweis — null ohne Zuordnung
      // (Alt-Eintrag oder noch nie über die Brücke angelegt, unverändertes Verhalten).
      auftragErstelltId: e.auftragErstelltId ?? null,
    }
  })
  const liste = []
  let naechsterLokalerIndex = 0
  for (let i = 0; i <= persistiert.length; i++) {
    while (naechsterLokalerIndex < zustand.lokaleEintraege.length && zustand.lokaleEintraege[naechsterLokalerIndex].persistierterVerlaufLaengeBeiPush === i) {
      liste.push(zustand.lokaleEintraege[naechsterLokalerIndex])
      naechsterLokalerIndex++
    }
    if (i < persistiert.length) liste.push(persistiert[i])
  }
  // Reviewer-Befund (fix/chat-fehler-anzeige): persistierterVerlauf wächst normalerweise nie
  // rückwärts, ABER initChatView löst ladeVerlauf() zweifach beim Bootstrap aus (Registrierung +
  // direkter Aufruf) — träfen deren Antworten aus dem Netzwerk außer der Reihe ein, könnte
  // persistierterVerlauf kurzzeitig kürzer sein als beim Push eines lokalen Eintrags. Ohne dieses
  // Sicherheitsnetz würde ein solcher Eintrag in keiner Schleifen-Iteration matchen und
  // kommentarlos aus der Anzeige verschwinden — angehängt bleibt er wenigstens sichtbar (Verhalten
  // vor diesem Fix), statt lautlos verloren zu gehen.
  while (naechsterLokalerIndex < zustand.lokaleEintraege.length) {
    liste.push(zustand.lokaleEintraege[naechsterLokalerIndex])
    naechsterLokalerIndex++
  }
  if (zustand.ausstehenderLauf !== null) {
    liste.push({
      nachricht: zustand.ausstehenderLauf.nachricht,
      antwortText: null,
      antwort: null,
      quelle: 'ausstehend',
      zeitstempel: zustand.ausstehenderLauf.zeitstempel,
      istZusammenfassung: zustand.ausstehenderLauf.istZusammenfassung === true,
      fortschrittText: zustand.ausstehenderLauf.fortschrittText ?? null,
      schluessel: `ausstehend-${zustand.ausstehenderLauf.laufId}`,
      eintragModus: zustand.ausstehenderLauf.sparringUntermodus ?? 'feature',
      auftragErstelltId: null,
    })
  }
  // F34 Fixpaket (löst F-624): NUR 'sparring' filtert nach dem gerade angezeigten sparringUntermodus
  // ('jarvis' kennt kein eintragModus-Konzept, liste bleibt dort bitgenau unverändert) — greift auf
  // ALLE drei Quellen oben gleichermaßen (persistiert/lokal/ausstehend tragen alle ein eintragModus),
  // kein lokaler Eintrag kann den Filter dadurch umgehen.
  return modus === 'sparring' ? liste.filter((eintrag) => eintrag.eintragModus === sparringUntermodus) : liste
}

/** F29 WS-D2 (Auftrag Punkt C): eine Sprechblasen-Zeile — Nutzer rechts eingerückt mit Initialen-Kreis, Jarvis/Coach links mit Mini-Avatar (statischer Ausschnitt aus persona-gesicht.webp, dasselbe Bild wie die Persona — kein neues Bild, aber KEINE eigene montierePersona()-Instanz: eine animierte Instanz pro Sprechblase wäre reiner Overhead für ein 1,5rem-Icon, F28-Nicht-Ziel bleibt unberührt). @param label - sichtbarer Name ('Jarvis'/'Coach' oder 'Stefan') @param zeitHtml - bereits fertiges Uhrzeit-HTML (leer, wenn keine Zeit bekannt) @param textHtml - bereits fertiges Inhalts-HTML @param ausrichtung - 'nutzer' | 'jarvis' */
function chatBubbleReihe(label, zeitHtml, textHtml, ausrichtung) {
  const avatar =
    ausrichtung === 'nutzer'
      ? '<span class="chat-avatar chat-avatar-stefan" aria-hidden="true">S</span>'
      : '<span class="chat-avatar chat-avatar-jarvis" aria-hidden="true"><img src="/persona-gesicht.webp" alt="" /></span>'
  const bubble = `<div class="chat-bubble chat-bubble-${ausrichtung}">
    <p class="chat-bubble-kopf">${escapeHtml(label)}${zeitHtml}</p>
    ${textHtml}
  </div>`
  return `<div class="chat-bubble-reihe chat-bubble-reihe-${ausrichtung}">${ausrichtung === 'nutzer' ? bubble + avatar : avatar + bubble}</div>`
}

const QUELLE_ANTWORT_LABEL = { vorfilter: 'Jarvis (lokal beantwortet)', fehler: 'Lauf nicht erfolgreich' }

/** @param eintraege - string[] @returns eine <ul>-Liste, oder ein Hinweistext bei leerem Array */
function renderStringListe(eintraege) {
  if (!Array.isArray(eintraege) || eintraege.length === 0) return '<p class="chat-scope-leer">(keine)</p>'
  return `<ul class="chat-scope-liste">${eintraege.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
}

/** F34 WS-2: rendert daten.alternativen (art 'alternativen') als Liste aus Titel/Beschreibung/Abwägung. @param alternativen - CoachAlternative[] */
function renderAlternativen(alternativen) {
  if (!Array.isArray(alternativen) || alternativen.length === 0) return ''
  const eintraege = alternativen
    .map(
      (a) => `<li class="chat-alternative">
      <p class="chat-alternative-titel">${escapeHtml(a?.titel ?? '')}</p>
      <p class="chat-alternative-beschreibung">${escapeHtml(a?.beschreibung ?? '')}</p>
      <p class="chat-alternative-abwaegung">${escapeHtml(a?.abwaegung ?? '')}</p>
    </li>`
    )
    .join('')
  return `<ul class="chat-alternativen-liste">${eintraege}</ul>`
}

/** F34 WS-2: rendert daten.scope (art 'scope_entwurf') strukturiert — Problem, Ziel, In/Out of Scope, Annahmen, offene Fragen, Erfolgskriterium. @param scope - CoachScope */
function renderScope(scope) {
  if (scope === null || typeof scope !== 'object') return ''
  const abschnitt = (titel, inhaltHtml) => `<div class="chat-scope-abschnitt"><p class="chat-scope-abschnitt-titel">${escapeHtml(titel)}</p>${inhaltHtml}</div>`
  return `<div class="chat-scope-block">
    ${abschnitt('Problem', `<p>${escapeHtml(scope.problem ?? '')}</p>`)}
    ${abschnitt('Ziel', `<p>${escapeHtml(scope.ziel ?? '')}</p>`)}
    ${abschnitt('In Scope', renderStringListe(scope.in_scope))}
    ${abschnitt('Out of Scope', renderStringListe(scope.out_of_scope))}
    ${abschnitt('Annahmen', renderStringListe(scope.annahmen))}
    ${abschnitt('Offene Fragen', renderStringListe(scope.offene_fragen))}
    ${abschnitt('Erfolgskriterium', `<p>${escapeHtml(scope.erfolgskriterium ?? '')}</p>`)}
  </div>`
}

const CAPABILITY_STATUS_LABEL = { vorhanden: 'vorhanden', offen: 'offen', fehlt: 'fehlt' }

/** F34 WS-3: rendert projekt.capabilities_bedarf mit Status-Markierung (.badge, Muster views/workboard.js). @param bedarf - CapabilityBedarf[] */
function renderCapabilityBedarf(bedarf) {
  if (!Array.isArray(bedarf) || bedarf.length === 0) return '<p class="chat-scope-leer">(keine)</p>'
  const eintraege = bedarf
    .map((b) => {
      const status = CAPABILITY_STATUS_LABEL[b?.status] ?? String(b?.status ?? '')
      const ressourceHtml = b?.ressource_id ? ` — <code>${escapeHtml(b.ressource_id)}</code>` : ''
      const badgeKlasse = b?.status === 'fehlt' ? 'fehler' : b?.status === 'offen' ? 'neutral' : 'ok'
      return `<li class="chat-capability-bedarf-eintrag"><span class="badge ${badgeKlasse}">${escapeHtml(status)}</span> ${escapeHtml(b?.bedarf ?? '')}${ressourceHtml}</li>`
    })
    .join('')
  return `<ul class="chat-capability-bedarf-liste">${eintraege}</ul>`
}

/** F34 WS-3 Korrekturrunde (löst F-612): rendert einen Meilenstein mit seinen Features + zugewiesenen IDs (bereits vom Server über vergebeFeatureIds vergeben) — entferneIdPraefix entfernt einen vom Coach ggf. selbst mitgelieferten ID-artigen Titel-Präfix, sonst entstünde dieselbe sichtbare Dopplung wie im Auftragstext (baueAuftragAusProjektentwurf). @param meilenstein - ZugewiesenerMeilenstein */
function renderProjektMeilenstein(meilenstein) {
  const features = Array.isArray(meilenstein?.features) ? meilenstein.features : []
  const featureEintraege = features
    .map(
      (f) => `<li class="chat-projekt-feature">
        <p class="chat-projekt-feature-titel"><code>${escapeHtml(f?.id ?? '')}</code> — ${escapeHtml(entferneIdPraefix(f?.titel ?? ''))}</p>
        <p class="chat-projekt-feature-ziel">${escapeHtml(f?.ziel ?? '')}</p>
        ${Array.isArray(f?.abhaengig_von_ids) && f.abhaengig_von_ids.length > 0 ? `<p class="chat-projekt-feature-abhaengig">Abhängig von: ${f.abhaengig_von_ids.map((id) => escapeHtml(id)).join(', ')}</p>` : ''}
      </li>`
    )
    .join('')
  return `<div class="chat-projekt-meilenstein">
    <p class="chat-projekt-meilenstein-titel"><code>${escapeHtml(meilenstein?.id ?? '')}</code> — ${escapeHtml(entferneIdPraefix(meilenstein?.titel ?? ''))}</p>
    <p class="chat-projekt-meilenstein-ziel">${escapeHtml(meilenstein?.ziel ?? '')}</p>
    <ul class="chat-projekt-feature-liste">${featureEintraege}</ul>
  </div>`
}

/** F34 WS-3 (E-M5-12): rendert daten.projekt (art 'projekt_entwurf') strukturiert — Vision, Zielgruppe, Ziele, Scope In/Out, Meilensteine mit Features + zugewiesenen IDs, Capability-Bedarf mit Status, offene Fragen. @param projekt - ProjektEntwurf mit bereits vergebenen IDs */
function renderProjekt(projekt) {
  if (projekt === null || typeof projekt !== 'object') return ''
  const abschnitt = (titel, inhaltHtml) => `<div class="chat-scope-abschnitt"><p class="chat-scope-abschnitt-titel">${escapeHtml(titel)}</p>${inhaltHtml}</div>`
  const meilensteine = Array.isArray(projekt.meilensteine) ? projekt.meilensteine : []
  return `<div class="chat-scope-block chat-projekt-block">
    ${abschnitt('Vision', `<p>${escapeHtml(projekt.vision ?? '')}</p>`)}
    ${abschnitt('Zielgruppe', `<p>${escapeHtml(projekt.zielgruppe ?? '')}</p>`)}
    ${abschnitt('Ziele', renderStringListe(projekt.ziele))}
    ${abschnitt('Scope In', renderStringListe(projekt.scope_in))}
    ${abschnitt('Scope Out', renderStringListe(projekt.scope_out))}
    ${abschnitt('Meilensteine', meilensteine.length > 0 ? meilensteine.map(renderProjektMeilenstein).join('') : '<p class="chat-scope-leer">(keine)</p>')}
    ${abschnitt('Capability-Bedarf', renderCapabilityBedarf(projekt.capabilities_bedarf))}
    ${abschnitt('Offene Fragen', renderStringListe(projekt.offene_fragen))}
  </div>`
}

/**
 * F34 WS-2 (löst F-606): eindeutiger Schlüssel für den Auftrag-Brücken-Dialog eines Eintrags —
 * dieselbe Form wie eintrag.schluessel (baueAnzeigeListe), damit ein Klick den richtigen,
 * offenen Dialog wiederfindet, auch über einen Re-Render (Poll-Tick) hinweg.
 * @param modus - 'jarvis' | 'sparring' @param schluessel - eintrag.schluessel @returns Rohmaterial für den Dialog, oder null ohne Kandidat
 */
/**
 * F39 WS-2a (löst state/findings.md F-633 Teil a): jeder Kandidat trägt zusätzlich 'herkunft' —
 * gesetzt VOM CLIENT anhand des Sparring-/Jarvis-Ergebnistyps, nicht vom Server erraten. 'projekt_entwurf'
 * → 'projekt_interview' (löst über src/router/index.ts' bestimmeEffektiveKontrolltiefe eine
 * deterministische Kontrolltiefe-Untergrenze 'hoch' aus, sobald der Auftrag geroutet wird),
 * 'scope_entwurf' → 'sparring', Jarvis' 'auftrag_vorschlag' → 'jarvis'. POST /api/auftraege
 * nimmt das Feld optional an (pruefeAuftragsformular, scripts/leitstand-server.mjs).
 */
function leseAuftragKandidat(modus, antwort) {
  if (antwort === null || typeof antwort !== 'object') return null
  if (modus === 'sparring' && antwort.art === 'scope_entwurf' && antwort.scope) {
    return { ...baueAuftragAusScope(antwort.scope), herkunft: { art: 'sparring' } }
  }
  // F34 WS-3: 'auftragModus' ('neu'/'erweiterung') trägt der Server bereits im persistierten
  // projekt-Objekt (verarbeiteRollenChatErgebnis, leitstand-server.mjs) — das Modell selbst
  // entscheidet das nicht (dieselbe F-595-Begründung wie die Feature-/Meilenstein-IDs).
  if (modus === 'sparring' && antwort.art === 'projekt_entwurf' && antwort.projekt) {
    return { ...baueAuftragAusProjektentwurf(antwort.projekt, antwort.projekt.auftragModus ?? 'neu'), herkunft: { art: 'projekt_interview' } }
  }
  if (modus === 'jarvis' && antwort.art === 'auftrag_vorschlag' && antwort.auftrag) {
    return { titel: antwort.auftrag.titel ?? '', auftragstext: antwort.auftrag.text ?? '', herkunft: { art: 'jarvis' } }
  }
  return null
}

/** F34 WS-2: der "Als Auftrag anlegen"-Button (Trigger) ODER — falls für DIESEN Eintrag bereits offen — der Bestätigungsdialog. F34 Fixpaket (löst F-625): ohne offenen Dialog UND mit bereits registriertem Rückverweis (auftragErstelltId) zeigt sie statt des Triggers einen statischen Hinweis — kein Klick kann dann versehentlich ein inhaltsgleiches Duplikat anlegen. @param modus - 'jarvis' | 'sparring' @param schluessel - eintrag.schluessel @param kandidat - Ergebnis von leseAuftragKandidat @param auftragErstelltId - bereits über die Brücke angelegter Auftrag (F-625), oder null */
function renderAuftragBruecke(modus, schluessel, kandidat, auftragErstelltId) {
  if (kandidat === null) return ''
  if (offenerAuftragDialog === null || offenerAuftragDialog.modus !== modus || offenerAuftragDialog.schluessel !== schluessel) {
    if (auftragErstelltId !== null) {
      return `<div class="chat-auftrag-dialog chat-auftrag-dialog-erfolg">
        <p>Auftrag bereits angelegt (<code>${escapeHtml(auftragErstelltId)}</code>). <a href="#/projekt">Im Auftrag-Bereich ansehen</a></p>
      </div>`
    }
    return `<button type="button" class="btn chat-auftrag-oeffnen-btn" data-auftrag-oeffnen="${escapeHtml(schluessel)}">Als Auftrag anlegen</button>`
  }
  const dialog = offenerAuftragDialog
  if (dialog.erfolgAuftragId !== null) {
    // QA-Befund (F34 WS-2): ohne einen Schließen-Weg blieb die Erfolgsmeldung für diesen Eintrag
    // dauerhaft stehen, bis Modus-/Projektwechsel oder das Öffnen eines ANDEREN Dialogs sie zufällig
    // zurücksetzten — data-auftrag-abbrechen (derselbe Handler wie "Abbrechen" im offenen Formular)
    // setzt offenerAuftragDialog schlicht auf null, der Eintrag zeigt danach wieder den
    // "Als Auftrag anlegen"-Trigger.
    return `<div class="chat-auftrag-dialog chat-auftrag-dialog-erfolg">
      <p>Auftrag angelegt (<code>${escapeHtml(dialog.erfolgAuftragId)}</code>). <a href="#/projekt">Im Auftrag-Bereich ansehen</a></p>
      <button type="button" class="btn" data-auftrag-abbrechen="${escapeHtml(schluessel)}">Schließen</button>
    </div>`
  }
  const fehlerHtml = dialog.fehler ? `<p class="fehler chat-auftrag-dialog-fehler">${escapeHtml(dialog.fehler)}</p>` : ''
  return `<div class="chat-auftrag-dialog">
    <label class="chat-auftrag-dialog-label" for="chat-auftrag-titel">Titel</label>
    <input type="text" id="chat-auftrag-titel" class="chat-auftrag-titel-feld" value="${escapeHtml(dialog.titel)}" ${dialog.gesperrt ? 'disabled' : ''} />
    <label class="chat-auftrag-dialog-label" for="chat-auftrag-text">Auftragstext</label>
    <textarea id="chat-auftrag-text" class="chat-auftrag-text-feld" rows="8" ${dialog.gesperrt ? 'disabled' : ''}>${escapeHtml(dialog.auftragstext)}</textarea>
    ${fehlerHtml}
    <div class="chat-auftrag-dialog-aktionen">
      <button type="button" class="btn btn-primary" data-auftrag-anlegen="${escapeHtml(schluessel)}" ${dialog.gesperrt ? 'disabled' : ''}>Anlegen</button>
      <button type="button" class="btn" data-auftrag-abbrechen="${escapeHtml(schluessel)}" ${dialog.gesperrt ? 'disabled' : ''}>Abbrechen</button>
    </div>
  </div>`
}

/** Ein Verlaufseintrag als zwei Sprechblasen-Zeilen (Nutzerfrage + Antwort bzw. Tippindikator, solange sie aussteht). F31 WS-2: ein Zusammenfassungs-Turn (istZusammenfassung) bekommt zusätzlich einen zentrierten Trenner davor, die Nutzerzeile ("[Zusammenfassung angefordert]") tritt dezent zurück. F34 WS-2: art-abhängiger Inhalt (Text/Alternativen-Liste/strukturierter Scope) plus ggf. die Auftrag-Brücke. @param modus - 'jarvis' | 'sparring' @param eintrag - aus baueAnzeigeListe() @returns HTML-Block */
function renderEintrag(modus, eintrag) {
  const zeitHtml = eintrag.zeitstempel ? ` <span class="chat-bubble-zeit">${escapeHtml(formatiereUhrzeit(eintrag.zeitstempel) ?? '')}</span>` : ''
  const trennerHtml = eintrag.istZusammenfassung === true ? '<p class="chat-zusammenfassung-trenner">Zusammenfassung</p>' : ''
  const nutzerTextKlasse = eintrag.istZusammenfassung === true ? 'chat-bubble-text chat-bubble-text-dezent' : 'chat-bubble-text'
  const nutzerZeile = chatBubbleReihe('Stefan', zeitHtml, `<p class="${nutzerTextKlasse}">${escapeHtml(eintrag.nachricht)}</p>`, 'nutzer')
  if (eintrag.quelle === 'ausstehend') {
    const tippindikator = '<p class="chat-tippindikator" aria-hidden="true"><span></span><span></span><span></span></p>'
    const fortschrittHtml = eintrag.fortschrittText ? `<p class="chat-fortschritt">${escapeHtml(eintrag.fortschrittText)} …</p>` : ''
    return trennerHtml + nutzerZeile + chatBubbleReihe(MODI[modus].antwortLabel, '', tippindikator + fortschrittHtml, 'jarvis')
  }
  const label = QUELLE_ANTWORT_LABEL[eintrag.quelle] ?? MODI[modus].antwortLabel
  const art = eintrag.antwort?.art
  let inhaltHtml = `<p class="chat-bubble-text">${escapeHtml(eintrag.antwortText)}</p>`
  if (art === 'alternativen') inhaltHtml += renderAlternativen(eintrag.antwort?.alternativen)
  if (art === 'scope_entwurf') inhaltHtml += renderScope(eintrag.antwort?.scope)
  if (art === 'projekt_entwurf') inhaltHtml += renderProjekt(eintrag.antwort?.projekt)
  inhaltHtml += renderAuftragBruecke(modus, eintrag.schluessel, leseAuftragKandidat(modus, eintrag.antwort), eintrag.auftragErstelltId ?? null)
  const jarvisZeile = chatBubbleReihe(label, zeitHtml, inhaltHtml, 'jarvis')
  return trennerHtml + nutzerZeile + jarvisZeile
}

/**
 * F31 WS-2: der Standard-Ausschnitt (nicht zeigeAlle) beginnt ab dem letzten Eintrag mit
 * istZusammenfassung (inklusive) plus allem danach — ein Zusammenfassungs-Turn ist der neue
 * "Gesprächsanfang"; ohne einen solchen Turn bleibt es bei den letzten zwei Einträgen
 * (unverändertes WS-D2-Verhalten). @param liste - aus baueAnzeigeListe() @returns der Ausschnitt
 */
function berechneStandardAusschnitt(liste) {
  let letzterZusammenfassungsIndex = -1
  for (let i = liste.length - 1; i >= 0; i--) {
    if (liste[i].istZusammenfassung === true) {
      letzterZusammenfassungsIndex = i
      break
    }
  }
  return letzterZusammenfassungsIndex === -1 ? liste.slice(-2) : liste.slice(letzterZusammenfassungsIndex)
}

/**
 * F29 WS-D2 (Auftrag Punkt C): zeigt standardmäßig nur einen Ausschnitt — "Ganzen Verlauf öffnen"
 * (initGanzenVerlaufLink) schaltet zeigeAlle um und rendert neu, kein zweiter Fetch. QA-Befund
 * F31 WS-2: der Link muss sichtbar bleiben, sobald der Standard-Ausschnitt WENIGER zeigt als die
 * volle Liste — unabhängig vom aktuellen zeigeAlle-Zustand. Die alte Schwelle (liste.length <= 2)
 * blieb aus der Vor-WS-2-Zeit stehen, in der der Ausschnitt IMMER genau "letzte zwei" war; mit
 * einem frühen Zusammenfassungs-Turn (z. B. 1 Nachricht + sofort zusammengefasst, 2 Einträge
 * gesamt) verbarg sie den ersten echten Turn UND den Link, der ihn wieder sichtbar gemacht hätte.
 * F34 WS-2: rendert immer den aktiverModus-Zustand — ein im Hintergrund pollender anderer Modus
 * bleibt unsichtbar, bis dorthin umgeschaltet wird (initModusUmschalter ruft renderVerlauf() beim
 * Wechsel erneut auf).
 */
function renderVerlauf() {
  const modus = aktiverModus
  const konfiguration = MODI[modus]
  const zustand = zustandJeModus[modus]
  document.getElementById('chat-titel').textContent = konfiguration.titelText
  document.getElementById('chat-eingabe').placeholder = konfiguration.platzhalter
  document.getElementById('chat-zusammenfassen-btn').hidden = !konfiguration.hatZusammenfassen
  // F34 WS-3 Korrekturrunde (löst F-620): 'btn-primary' muss bei JEDEM Render gleichlaufend mit
  // aria-pressed gesetzt werden — vorher aktualisierte dieser Block nur aria-pressed, die optische
  // Hervorhebung blieb dauerhaft auf dem Erstzustand stehen (Sichtprüfung, seit WS-2).
  const setzeGedruecktenZustand = (id, gedrueckt) => {
    const element = document.getElementById(id)
    element.setAttribute('aria-pressed', String(gedrueckt))
    element.classList.toggle('btn-primary', gedrueckt)
  }
  setzeGedruecktenZustand('chat-modus-jarvis-btn', modus === 'jarvis')
  setzeGedruecktenZustand('chat-modus-sparring-btn', modus === 'sparring')
  // F34 WS-3: Unterumschalter nur im Modus 'sparring' sichtbar.
  document.getElementById('chat-untermodus-auswahl').hidden = modus !== 'sparring'
  setzeGedruecktenZustand('chat-untermodus-feature-btn', sparringUntermodus === 'feature')
  setzeGedruecktenZustand('chat-untermodus-projekt-btn', sparringUntermodus === 'projekt')

  const container = document.getElementById('chat-verlauf')
  const liste = baueAnzeigeListe(modus)
  const standardAusschnitt = berechneStandardAusschnitt(liste)
  const sichtbar = zustand.zeigeAlle ? liste : standardAusschnitt
  container.innerHTML = sichtbar.length === 0 ? '<p class="leer">Noch keine Nachrichten.</p>' : sichtbar.map((eintrag) => renderEintrag(modus, eintrag)).join('')
  const link = document.getElementById('chat-ganzen-verlauf-link')
  link.hidden = standardAusschnitt.length === liste.length
  link.textContent = zustand.zeigeAlle ? 'Verlauf einklappen' : 'Ganzen Verlauf öffnen'

  // Code-Review-Befund (F34 WS-2, verifiziert in einem zweiten Pass): Sende-/Zusammenfassen-Sperre UND
  // Abbrechen-Button-Text/-Sperre werden bei JEDEM Render VOLLSTÄNDIG aus zustand (dem Zustand des
  // GERADE ANGEZEIGTEN Modus) abgeleitet — kein imperativer Seiteneffekt (setzeSendenSperre/
  // setzeAbbrechenZustand) mehr an anderer Stelle im Code. Der ursprüngliche Bug (geteilte Buttons
  // blieben nach einem Moduswechsel während eines im Hintergrund laufenden Laufs dauerhaft gesperrt)
  // entstand genau daraus, dass ein imperativer Aufruf an 'modus === aktiverModus' gegattert war; der
  // erste Fix behielt aber noch mehrere andere imperative Aufrufe (u. a. in sendeAktuelleEingabe/
  // sendeZusammenfassungAnfrage/initAbbrechenBedienung) bei, die denselben Bug in abgeschwächter Form
  // (transiente Fehlableitung statt Dauerhänger) reproduzieren konnten — deshalb jetzt EINE einzige
  // Ableitungsstelle statt vieler verstreuter Schreibzugriffe auf dieselben zwei DOM-Elemente.
  // 'sendenLaeuft': eigenes Flag für das schmale Zeitfenster VOR dem Setzen von ausstehenderLauf
  // (Vorfilter-Abruf/die eigentliche POST-Anfrage) — ausstehenderLauf existiert dort noch nicht.
  const gesperrt = zustand.sendenLaeuft === true || zustand.ausstehenderLauf !== null
  document.getElementById('chat-senden').disabled = gesperrt
  document.getElementById('chat-zusammenfassen-btn').disabled = gesperrt

  const abbrechenBtn = document.getElementById('chat-abbrechen-btn')
  const abbruchAngefordert = zustand.ausstehenderLauf?.abbruchAngefordert === true
  abbrechenBtn.hidden = zustand.ausstehenderLauf === null
  abbrechenBtn.textContent = abbruchAngefordert ? 'Abbruch angefordert' : 'Lauf abbrechen'
  abbrechenBtn.disabled = abbruchAngefordert
}

function zeigeChatFehler(text) {
  const anzeige = document.getElementById('chat-fehler')
  anzeige.textContent = text
  anzeige.hidden = text === ''
}

/** Lädt GET /api/chat bzw. GET /api/sparring für 'modus' neu — beim Betreten der View, beim ersten Wechsel in einen Modus und nach jedem real terminierten Lauf. @param modus - 'jarvis' | 'sparring' @returns true bei Erfolg, false bei einem (transienten) Fehlschlag — der Aufrufer entscheidet dann, ob erneut versucht wird. */
async function ladeVerlauf(modus) {
  const zustand = zustandJeModus[modus]
  let erfolgreich = true
  try {
    const antwort = await MODI[modus].holeVerlauf()
    zustand.persistierterVerlauf = antwort.verlauf
    zustand.geladen = true
    if (modus === aktiverModus) zeigeChatFehler('')
  } catch (fehler) {
    if (modus === aktiverModus) zeigeChatFehler(`Verlauf konnte nicht geladen werden: ${fehler.message}`)
    erfolgreich = false
  }
  if (modus === aktiverModus) renderVerlauf()
  return erfolgreich
}

/**
 * Terminallage eines Chat-Laufs, der NICHT real ABGESCHLOSSEN/ERFOLGREICH endete — Text für die
 * lokale Fehlanzeige (kein Lineage-Eintrag, siehe Datei-Kopf). F-564: ein Lauf, den DIESE Sitzung selbst
 * per #chat-abbrechen-btn abgebrochen hat (abbruchAngefordert, s. initAbbrechenBedienung), endet serverseitig
 * ebenfalls als ABGESCHLOSSEN/FEHLGESCHLAGEN (scripts/check-f14-abbruch.mjs AK7: beendigungsart 'ABBRUCH' —
 * dieses Feld erreicht den Client nicht extra, ist hier aber auch nicht nötig: nur ein Abbruch DIESER
 * Sitzung kann abbruchAngefordert gesetzt haben) und wurde bislang ununterscheidbar von einem echten
 * Fehlschlag als "FEHLGESCHLAGEN" gemeldet, obwohl der Nutzer selbst abgebrochen hat.
 * Bekannte, dokumentiert akzeptierte Restunschärfe (CLAUDE.md-Entscheidungsregel 5): abbruchAngefordert
 * belegt nur, dass DIESE Sitzung einen Abbruch ANGEFORDERT hat, nicht zwingend, dass der Lauf DESWEGEN
 * fehlschlug — träfe der Abbruch-Request serverseitig erst ein, nachdem der Lauf bereits aus einem
 * unabhängigen Grund gescheitert ist, zeigt diese Funktion trotzdem "Lauf abgebrochen." statt der
 * echten Fehlerursache. Ohne ein eigenes Server-Feld (beendigungsart, s. o.) bis zum Client ist eine
 * hundertprozentige Unterscheidung hier nicht möglich; das enge Zeitfenster wird als akzeptables
 * Restrisiko in Kauf genommen statt eines Server-/Persistenz-Umbaus für diesen kleinen Fix.
 * @param laufStatus - detail.laufStatus aus GET /api/laeufe/<laufId>
 * @param abbruchAngefordert - true, wenn diese Sitzung für DIESEN Lauf zuvor #chat-abbrechen-btn ausgelöst hat
 */
function beschreibeNichtErfolgreichesEnde(laufStatus, abbruchAngefordert) {
  if (abbruchAngefordert === true && laufStatus?.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'FEHLGESCHLAGEN') return 'Lauf abgebrochen.'
  if (laufStatus?.status === 'KLAERUNG_ERFORDERLICH') return `Lauf hält — Klärung erforderlich: ${laufStatus.grund}`
  if (laufStatus?.status === 'ABGESCHLOSSEN') return `Lauf abgeschlossen, aber nicht erfolgreich (${laufStatus.ergebnis}).`
  return `Lauf endete unerwartet (Status: ${laufStatus?.status ?? 'unbekannt'}).`
}

/**
 * F40 WS-1: kurzer Anzeigetext zum letzten live gemeldeten Werkzeugaufruf (GET /api/laeufe/<laufId>, Feld
 * fortschritt) — z. B. "liest docs/STATUS.md". Ein Pfad wird auf seine letzten zwei Segmente gekürzt (absolute
 * Windows-Pfade sind sonst länger als die Sprechblase), jedes Ziel zusätzlich auf 60 Zeichen (Grep-/Glob-Muster
 * können beliebig lang sein, QA-Befund F40 WS-1). @param fortschritt - { werkzeug, ziel } oder null
 * @returns Anzeigetext oder null ohne verwertbaren Fortschritt
 */
function beschreibeFortschritt(fortschritt) {
  if (fortschritt === null || typeof fortschritt !== 'object' || typeof fortschritt.werkzeug !== 'string') return null
  const zielRoh = typeof fortschritt.ziel === 'string' && fortschritt.ziel !== '' ? fortschritt.ziel : null
  const kuerze = (text) => ([...text].length > 60 ? `${[...text].slice(0, 59).join('')}…` : text)
  const ziel = zielRoh === null ? null : kuerze(zielRoh)
  const kurzPfad = zielRoh === null ? null : kuerze(zielRoh.split(/[\\/]/).filter(Boolean).slice(-2).join('/') || zielRoh)
  if (fortschritt.werkzeug === 'Read') return kurzPfad ? `liest ${kurzPfad}` : 'liest eine Datei'
  if (fortschritt.werkzeug === 'Grep') return ziel ? `durchsucht nach „${ziel}“` : 'durchsucht Dateien'
  if (fortschritt.werkzeug === 'Glob') return ziel ? `sucht ${ziel}` : 'sucht Dateien'
  return kurzPfad ? `nutzt ${fortschritt.werkzeug} (${kurzPfad})` : `nutzt ${fortschritt.werkzeug}`
}

/** Bei jedem Tick des eigenen 500ms-Polls geprüft (siehe Datei-Kopf): solange ein Lauf DIESES Modus aussteht, GET /api/laeufe/<laufId> abrufen und bei Terminallage auflösen. @param modus - 'jarvis' | 'sparring' */
async function pruefeAusstehendenLauf(modus) {
  const zustand = zustandJeModus[modus]
  if (zustand.ausstehenderLauf === null) return
  const { laufId, nachricht, messung } = zustand.ausstehenderLauf
  messung?.tickZeiten.push(performance.now())
  let detail
  try {
    const antwort = await holeLaufDetail(laufId)
    if (!antwort.ok) return // Lauf-Detail noch nicht abrufbar (erster Checkpoint fehlt) — nächster Tick versucht es erneut.
    detail = await antwort.json()
  } catch {
    return // Netzwerkfehler dieses Ticks — kein Abbruch, der nächste Tick versucht es erneut.
  }
  // Real beobachtet (F26 WS-2a, echter curl-Nachweis gegen den echten Leitstand-Prozess): ein
  // noch laufender Lauf zeigt laufStatus.status 'KLAERUNG_ERFORDERLICH' ("RUN_PREPARED ohne
  // Terminalartefakt"), SOLANGE er läuft — das ist die normale Zwischenlage zwischen Start und
  // Ende, keine echte Klärungslage. detail.aktiv (D13, dieselbe Serverinstanz) unterscheidet
  // beides zuverlässig: erst wenn die Serverinstanz den Lauf selbst nicht mehr als aktiv führt,
  // ist laufStatus verlässlich terminal. Ein Poll-Tick, der das ignoriert hätte, hätte hier real
  // einen laufenden Lauf fälschlich als "hält — Klärung erforderlich" gemeldet.
  if (detail.aktiv === true) {
    // F40 WS-1: laufender Lauf — Werkzeug-Fortschritt anzeigen, nur bei geänderter Anzeige neu rendern.
    // Erneute laufId-Prüfung nach dem Await (Muster unten): ein Projektwechsel darf nicht überschrieben werden.
    const fortschrittText = beschreibeFortschritt(detail.fortschritt ?? null)
    if (zustand.ausstehenderLauf?.laufId === laufId && fortschrittText !== (zustand.ausstehenderLauf.fortschrittText ?? null)) {
      zustand.ausstehenderLauf.fortschrittText = fortschrittText
      if (modus === aktiverModus) renderVerlauf()
    }
    return
  }
  const laufStatus = detail.laufStatus
  if (laufStatus?.status !== 'ABGESCHLOSSEN' && laufStatus?.status !== 'KLAERUNG_ERFORDERLICH') return // noch nicht terminal (z. B. NICHT_GESTARTET direkt nach 202)
  const tPollErgebnis = performance.now()

  // Code-Review-Befund F31 WS-3: die obigen Awaits geben den Tick frei — ein Projektwechsel
  // (setzeChatZustandZurueck) kann währenddessen ausstehenderLauf bereits auf null gesetzt und
  // den Poll gestoppt haben. Ohne diese erneute Prüfung würde der jetzt fertige, aber schon
  // fremde laufId/nachricht in die lokaleEintraege des NEUEN Projekts geschrieben (falsch
  // zugeordnete Fehlanzeige) bzw. ausstehenderLauf/die Senden-Sperre eines inzwischen anders
  // aufgelösten Zustands überschreiben — Muster initAbbrechenBedienung.
  if (zustand.ausstehenderLauf?.laufId !== laufId) return

  const abbruchAngefordert = zustand.ausstehenderLauf.abbruchAngefordert === true

  if (laufStatus.status === 'ABGESCHLOSSEN' && laufStatus.ergebnis === 'ERFOLGREICH') {
    // ausstehenderLauf bleibt gesetzt, bis ladeVerlauf() wirklich erfolgreich war (QA-Befund):
    // ein transienter Fehlschlag genau in diesem Moment ließe sonst weder die Pending-Anzeige
    // noch den fertigen Eintrag sichtbar — der nächste Tick prüft denselben, bereits terminalen
    // Lauf erneut und versucht das Neuladen einfach noch einmal.
    const geladen = await ladeVerlauf(modus)
    if (!geladen) return
    // ladeVerlauf() ist selbst ein weiterer Await-Punkt — dieselbe Prüfung wie oben, jetzt danach.
    if (zustand.ausstehenderLauf?.laufId !== laufId) return
    // Real reproduziert (state/nachweis-jarvis-latenz.md, "Abbruch Runde 2"): ein Abbruch, der
    // erst NACH dem Ende des Werkzeugprozesses eintrifft, wird vom Server mit 202 quittiert
    // (der Lauf gilt bis zum Ende der Nachbereitung als aktiv), kann den bereits fertigen
    // Prozess aber nicht mehr beenden — der Lauf endet ERFOLGREICH und die Antwort erscheint.
    // Ohne diesen Hinweis sähe der Mensch nur seine Antwort und nie, dass sein Abbruch wirkungslos
    // blieb (genau die Beobachtung, die diesen Auftrag ausgelöst hat).
    if (abbruchAngefordert && modus === aktiverModus) {
      zeigeChatFehler('Abbruch kam zu spät: die Antwort war bereits fertig, der Lauf wurde nicht abgebrochen.')
    }
  } else {
    zustand.lokaleEintraege.push({
      nachricht,
      antwortText: beschreibeNichtErfolgreichesEnde(laufStatus, abbruchAngefordert),
      antwort: null,
      quelle: 'fehler',
      zeitstempel: new Date().toISOString(),
      persistierterVerlaufLaengeBeiPush: zustand.persistierterVerlauf.length,
      schluessel: `fehler-${laufId}`,
      // F34 Fixpaket (löst F-624): der bei SENDE-Zeitpunkt aktive Untermodus (s. sendeAktuelleEingabe)
      // — NICHT der eventuell inzwischen gewechselte aktuelle sparringUntermodus, sonst könnte diese
      // Fehlanzeige den Filter unten umgehen/im falschen Untermodus erscheinen.
      eintragModus: zustand.ausstehenderLauf.sparringUntermodus ?? 'feature',
      auftragErstelltId: null,
    })
  }
  if (messung !== undefined) protokolliereClientLatenz(messung, tPollErgebnis, performance.now())
  // Bug (real reproduziert, state/nachweis-jarvis-latenz.md Abschnitt "Abbruch"): ausstehenderLauf
  // MUSS vor diesem abschließenden renderVerlauf() auf null stehen — renderVerlauf() blendet den
  // Abbrechen-Button nur aus, wenn ausstehenderLauf === null (s. dort), und setzt dessen Text/Sperre
  // nicht zurück. Ein Render VOR dem Nullen (wie bisher im Fehlerzweig oben) ließ den Button nach
  // einem manuellen Abbruch dauerhaft auf "Abbruch angefordert"/gesperrt stehen, obwohl der Lauf
  // längst terminal aufgelöst war.
  zustand.ausstehenderLauf = null
  // Zweiter Code-Review-Fund (F34 WS-2, Verifikations-Pass): der vorherige Fix rief hier zusätzlich
  // das imperative setzeAbbrechenZustand('Lauf abbrechen', false) auf — unconditional zwar, aber ein
  // imperativer Seiteneffekt NEBEN der Ableitung in renderVerlauf() ist genau das Muster, das den
  // ursprünglichen Bug erst ermöglichte (zwei Wahrheiten für denselben Button-Zustand). Text/Sperre
  // des Abbrechen-Buttons werden seither AUSSCHLIESSLICH in renderVerlauf() aus
  // zustand.ausstehenderLauf?.abbruchAngefordert abgeleitet (s. dort) — mit ausstehenderLauf jetzt
  // null ergibt das automatisch den Default ('Lauf abbrechen', nicht gesperrt), kein zweiter Aufruf
  // nötig. renderVerlauf() selbst bleibt unconditional (rendert immer aktiverModus mit dessen EIGENEM,
  // gerade aktualisierten Zustand — korrekt, auch wenn 'modus' hier ein Hintergrund-Modus ist).
  renderVerlauf()
  stoppeAusstehendenLaufPoll(modus)
}

/** Formular „Senden": Vorfilter zuerst (lokal, kein Serverkontakt bei Treffer, NUR im Modus 'jarvis' — MODI.hatVorfilter), sonst POST /api/chat bzw. POST /api/sparring. F29 WS-D2: als benannte Funktion statt eines Inline-Klick-Handlers, damit sowohl der Senden-Button als auch Enter im Eingabefeld (initEingabeTastatur) denselben, unveränderten Ablauf auslösen. F34 WS-2 (Verifikations-Fund): die Sperr-Prüfung liest jetzt zustand.sendenLaeuft/ausstehenderLauf direkt statt des DOM-Attributs — Enter (initEingabeTastatur) ruft diese Funktion ohne je das disabled-Attribut des Buttons zu sehen, ein reiner DOM-Check hier wäre also ohnehin nur die halbe Wahrheit gewesen. */
async function sendeAktuelleEingabe() {
  const modus = aktiverModus
  const zustand = zustandJeModus[modus]
  if (zustand.sendenLaeuft || zustand.ausstehenderLauf !== null) return
  const feld = document.getElementById('chat-eingabe')
  const nachricht = feld.value.trim()
  zeigeChatFehler('')
  if (nachricht === '') {
    zeigeChatFehler('Bitte eine Nachricht eingeben.')
    return
  }

  const tSenden = performance.now()
  zustand.sendenLaeuft = true
  renderVerlauf()
  try {
      if (MODI[modus].hatVorfilter) {
        const vorfilterErgebnis = await loeseVorfilterAuf(nachricht, letzterZustand)
        if (vorfilterErgebnis !== null) {
          zustand.lokaleEintraege.push({
            nachricht,
            antwortText: antwortText(vorfilterErgebnis),
            antwort: null,
            quelle: 'vorfilter',
            zeitstempel: new Date().toISOString(),
            persistierterVerlaufLaengeBeiPush: zustand.persistierterVerlauf.length,
            schluessel: `vorfilter-${Date.now()}`,
          })
          feld.value = ''
          return
        }
      }

      let antwort
      try {
        // F34 WS-3: 'modus' im Body geht NUR im Modus 'sparring' mit (POST /api/chat kennt das
        // Feld nicht und lehnt ein unbekanntes Feld mit 400 ab) — sparringUntermodus bleibt für
        // 'jarvis' unbeachtet.
        const koerper = modus === 'sparring' ? { nachricht, modus: sparringUntermodus } : { nachricht }
        antwort = await MODI[modus].sendeNachricht(koerper)
      } catch (fehler) {
        zeigeChatFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
        return
      }
      const tServerQuittung = performance.now()
      if (antwort.status !== 202) {
        const koerper = await antwort.json().catch(() => ({}))
        zeigeChatFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
        return
      }
      const angenommen = await antwort.json().catch(() => ({}))
      zustand.ausstehenderLauf = {
        nachricht,
        laufId: angenommen.laufId,
        zeitstempel: new Date().toISOString(),
        messung: { tSenden, tServerQuittung, tickZeiten: [] },
        // F34 Fixpaket (löst F-624): der bei SENDE-Zeitpunkt gewählte Untermodus, für baueAnzeigeListes
        // Filter — bleibt für 'jarvis' undefined (kein eintragModus-Konzept dort, s. dort).
        sparringUntermodus: modus === 'sparring' ? sparringUntermodus : undefined,
      }
      starteAusstehendenLaufPoll(modus)
      feld.value = ''
    } finally {
      // sendenLaeuft fällt IMMER weg (das schmale "vor ausstehenderLauf"-Fenster ist vorbei) — bleibt
      // trotzdem gesperrt, wenn ausstehenderLauf jetzt gesetzt ist (renderVerlauf() leitet das ab, s. dort).
      zustand.sendenLaeuft = false
      renderVerlauf()
    }
}

/** F30 WS-1 (Aufgabe 1): Klick auf #chat-abbrechen-btn — POST /api/laeufe/<laufId>/abbrechen (F14), 202 sofort ohne auf das Laufende zu warten (Datei-Kommentar leitstand-server.mjs). Löst selbst KEINE terminale Auflösung aus: der eigene 500ms-Poll (pruefeAusstehendenLauf) behandelt den jetzt FEHLGESCHLAGENEN Lauf anschließend genau wie jeden anderen nicht erfolgreichen Lauf — derselbe Codepfad, keine zweite Auflösungsregel. Nur ein Fehlschlag DIESER Anfrage selbst (Netzwerk, 404 bei einem inzwischen bereits beendeten Lauf) wird hier direkt gemeldet, Muster views/runs.js meldeAbbrechenFehler. Wirkt immer auf den AKTUELL ANGEZEIGTEN Modus (der Button ist ohnehin nur sichtbar, wenn dessen ausstehenderLauf gesetzt ist). F34 WS-2 (Verifikations-Fund): Text/Sperre des Buttons werden nicht mehr imperativ gesetzt, sondern ausschließlich über renderVerlauf()s Ableitung aus zustand.ausstehenderLauf.abbruchAngefordert (s. dort) — jede Zustandsänderung hier mutiert nur noch dieses Feld und ruft renderVerlauf() auf. */
function initAbbrechenBedienung() {
  document.getElementById('chat-abbrechen-btn').addEventListener('click', async () => {
    const modus = aktiverModus
    const zustand = zustandJeModus[modus]
    if (zustand.ausstehenderLauf === null || zustand.ausstehenderLauf.abbruchAngefordert === true) return
    const { laufId } = zustand.ausstehenderLauf
    zustand.ausstehenderLauf.abbruchAngefordert = true
    renderVerlauf()
    try {
      const antwort = await abbrichLauf(laufId)
      if (antwort.ok) {
        // Für die Auswertung in pruefeAusstehendenLauf: ein 202 heißt nur "angenommen", nicht
        // "hat gewirkt" (s. dort) — der Lauf kann trotzdem regulär mit einer Antwort enden.
        return
      }
      if (zustand.ausstehenderLauf?.laufId !== laufId) return // inzwischen anders aufgelöst (Poll/Projektwechsel) — keine Meldung mehr für den falschen Lauf
      const koerper = await antwort.json().catch(() => ({}))
      zustand.ausstehenderLauf.abbruchAngefordert = false
      renderVerlauf()
      zeigeChatFehler(`Abbruch fehlgeschlagen: ${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
    } catch (fehler) {
      if (zustand.ausstehenderLauf?.laufId !== laufId) return
      zustand.ausstehenderLauf.abbruchAngefordert = false
      renderVerlauf()
      zeigeChatFehler(`Abbruch-Anfrage fehlgeschlagen: ${fehler.message}`)
    }
  })
}

/** F31 WS-2: Klick auf #chat-zusammenfassen-btn — POST /api/chat/zusammenfassen, danach derselbe ausstehenderLauf/Tippindikator/Poll-Pfad wie eine normale Nachricht (pruefeAusstehendenLauf löst terminal auf, kein zweiter Codepfad). Kein Vorfilter (eine Zusammenfassung hat keine lokal beantwortbare Kurzform). Ein 409 (D13 oder "kein Verlauf zum Zusammenfassen") erscheint wie bei sendeAktuelleEingabe als Fehleranzeige. Nur im Modus 'jarvis' bedienbar (der Button bleibt für 'sparring' hidden, s. renderVerlauf). F34 WS-2 (Verifikations-Fund): Sperr-Prüfung/-Aufhebung über zustand.sendenLaeuft/ausstehenderLauf statt des DOM-Attributs, Muster sendeAktuelleEingabe. */
async function sendeZusammenfassungAnfrage() {
  const modus = aktiverModus
  const zustand = zustandJeModus[modus]
  if (!MODI[modus].hatZusammenfassen || zustand.sendenLaeuft || zustand.ausstehenderLauf !== null) return
  zeigeChatFehler('')
  const tSenden = performance.now()
  zustand.sendenLaeuft = true
  renderVerlauf()
  try {
    const antwort = await sendeChatZusammenfassung()
    const tServerQuittung = performance.now()
    if (antwort.status !== 202) {
      const koerper = await antwort.json().catch(() => ({}))
      zeigeChatFehler(`${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}`)
      return
    }
    const angenommen = await antwort.json().catch(() => ({}))
    zustand.ausstehenderLauf = {
      nachricht: '[Zusammenfassung angefordert]',
      laufId: angenommen.laufId,
      zeitstempel: new Date().toISOString(),
      istZusammenfassung: true,
      messung: { tSenden, tServerQuittung, tickZeiten: [] },
    }
    starteAusstehendenLaufPoll(modus)
  } catch (fehler) {
    zeigeChatFehler(`Anfrage fehlgeschlagen: ${fehler.message}`)
  } finally {
    zustand.sendenLaeuft = false
    renderVerlauf()
  }
}

function initZusammenfassenBedienung() {
  document.getElementById('chat-zusammenfassen-btn').addEventListener('click', () => void sendeZusammenfassungAnfrage())
}

function initSendenFormular() {
  document.getElementById('chat-senden').addEventListener('click', () => void sendeAktuelleEingabe())
}

/** F29 WS-D2 (Auftrag Punkt C, Hinweistext "Shift + Enter für neue Zeile"): Enter sendet, Shift+Enter bleibt normaler Zeilenumbruch (Browser-Default) — ruft denselben, unveränderten Sende-Pfad wie der Button. */
function initEingabeTastatur() {
  document.getElementById('chat-eingabe').addEventListener('keydown', (ereignis) => {
    if (ereignis.key === 'Enter' && !ereignis.shiftKey) {
      ereignis.preventDefault()
      void sendeAktuelleEingabe()
    }
  })
}

/** F29 WS-D2 (Auftrag Punkt C): "Ganzen Verlauf öffnen"/"schließen" — reiner Anzeige-Umschalter (renderVerlauf), kein zweiter Fetch. */
function initGanzenVerlaufLink() {
  document.getElementById('chat-ganzen-verlauf-link').addEventListener('click', () => {
    zustandJeModus[aktiverModus].zeigeAlle = !zustandJeModus[aktiverModus].zeigeAlle
    renderVerlauf()
  })
}

/** F34 WS-2: "Jarvis"/"Sparring"-Umschalter — reine Anzeige-/Zielwahl (Muster verbrauch-zeitraum-auswahl, btn/btn-primary). Ein Wechsel setzt weder ausstehenderLauf noch den Verlauf des jeweils anderen Modus zurück (beide leben unabhängig in zustandJeModus) — lädt den Zielmodus nur beim ERSTEN Wechsel dorthin nach (zustand.geladen), jeder weitere Wechsel zeigt den bereits geladenen/aktualisierten Stand ohne erneuten Fetch. */
function initModusUmschalter() {
  const waehleModus = (modus) => {
    if (modus === aktiverModus) return
    aktiverModus = modus
    speichereModus(modus)
    offenerAuftragDialog = null
    zeigeChatFehler('')
    if (!zustandJeModus[modus].geladen) {
      void ladeVerlauf(modus)
    } else {
      renderVerlauf()
    }
  }
  document.getElementById('chat-modus-jarvis-btn').addEventListener('click', () => waehleModus('jarvis'))
  document.getElementById('chat-modus-sparring-btn').addEventListener('click', () => waehleModus('sparring'))
}

/**
 * F41 WS-2: von außen aufrufbarer Sprung nach Sparring/Modus "projekt" — Aufruf aus
 * views/projekte-uebersicht.js nach erfolgreichem POST /api/projekte ("Zum Coach-Interview").
 * Dieselbe Umschalt-Logik wie initModusUmschalter/initUntermodusUmschalter (Modus + Unterumschalter
 * setzen, merken, bei Bedarf nachladen, neu rendern), nur ohne einen Button-Klick als Auslöser —
 * Muster der bewussten Funktionsexport-Kopplung aus views/projekt.js (dessen Datei-Kopf,
 * wendeWiederaufnahmeAn) statt eines Event-Bus.
 */
export function wechsleZuSparringProjekt() {
  offenerAuftragDialog = null
  zeigeChatFehler('')
  if (aktiverModus !== 'sparring') {
    aktiverModus = 'sparring'
    speichereModus('sparring')
  }
  if (sparringUntermodus !== 'projekt') {
    sparringUntermodus = 'projekt'
    speichereUntermodus('projekt')
  }
  if (!zustandJeModus.sparring.geladen) {
    void ladeVerlauf('sparring')
  } else {
    renderVerlauf()
  }
}

/**
 * F34 WS-3 (E-M5-12): "Feature"/"Projekt"-Unterumschalter innerhalb des Modus 'sparring' — reine
 * Anzeige-/Zielwahl wie initModusUmschalter, aber OHNE eigenen Verlaufs-Fetch: beide Stellungen
 * teilen sich denselben 'sparring-<projektId>'-Verlauf (ein Turn trägt sein eigenes 'modus'-Feld
 * server-seitig), nur die NÄCHSTE gesendete Nachricht trägt den gewählten Unterumschalter-Wert.
 */
function initUntermodusUmschalter() {
  const waehleUntermodus = (untermodus) => {
    if (untermodus === sparringUntermodus) return
    sparringUntermodus = untermodus
    speichereUntermodus(untermodus)
    offenerAuftragDialog = null
    renderVerlauf()
  }
  document.getElementById('chat-untermodus-feature-btn').addEventListener('click', () => waehleUntermodus('feature'))
  document.getElementById('chat-untermodus-projekt-btn').addEventListener('click', () => waehleUntermodus('projekt'))
}

/**
 * F34 WS-2 (löst F-606): Klick-Delegation für die Auftrag-Brücke (Muster views/workboard.js
 * Listen-Delegation — die Buttons entstehen bei jedem renderVerlauf() neu, ein einziger Listener
 * auf dem Container bleibt gültig). 'Öffnen' baut den Dialog aus leseAuftragKandidat neu (frische
 * Werte); 'Anlegen' ruft POST /api/auftraege (legeAuftragAn, bestehender F12-Pfad) — KEIN
 * automatisches Routen/Starten (Auftrag-Wortlaut).
 *
 * Code-Review-/QA-Befund (F34 WS-2, real reproduziert): Titel-/Textfeld wurden ursprünglich erst bei
 * 'Anlegen' aus dem DOM gelesen, nicht laufend ins Modul gespiegelt — ein Re-Render WÄHREND der
 * Nutzer noch tippte (z. B. ein Poll-Tick des im Hintergrund laufenden ANDEREN Modus, oder ein
 * zweiter, parallel im selben Modus gesendeter Turn) ersetzte das Eingabefeld über renderAuftragBruecke
 * mit dem alten, unbearbeiteten Wert aus offenerAuftragDialog — die Bearbeitung ging kommentarlos
 * verloren. Der zweite Listener unten (input-Delegation) spiegelt jeden Tastendruck SOFORT nach
 * offenerAuftragDialog zurück (ohne renderVerlauf() aufzurufen — kein Re-Render pro Zeichen, nur eine
 * Zustandsaktualisierung), damit ein späterer, fremd ausgelöster Re-Render den zuletzt getippten statt
 * des ursprünglichen Werts anzeigt.
 */
function initAuftragBruecke() {
  document.getElementById('chat-verlauf').addEventListener('input', (ereignis) => {
    if (offenerAuftragDialog === null) return
    if (ereignis.target.id === 'chat-auftrag-titel') offenerAuftragDialog.titel = ereignis.target.value
    if (ereignis.target.id === 'chat-auftrag-text') offenerAuftragDialog.auftragstext = ereignis.target.value
  })
  document.getElementById('chat-verlauf').addEventListener('click', async (ereignis) => {
    const oeffnenBtn = ereignis.target.closest('[data-auftrag-oeffnen]')
    if (oeffnenBtn) {
      const modus = aktiverModus
      const schluessel = oeffnenBtn.dataset.auftragOeffnen
      const eintrag = baueAnzeigeListe(modus).find((e) => e.schluessel === schluessel)
      const kandidat = eintrag ? leseAuftragKandidat(modus, eintrag.antwort) : null
      if (kandidat === null) return
      offenerAuftragDialog = { modus, schluessel, titel: kandidat.titel, auftragstext: kandidat.auftragstext, herkunft: kandidat.herkunft ?? null, gesperrt: false, fehler: '', erfolgAuftragId: null }
      renderVerlauf()
      return
    }
    const abbrechenBtn = ereignis.target.closest('[data-auftrag-abbrechen]')
    if (abbrechenBtn) {
      offenerAuftragDialog = null
      renderVerlauf()
      return
    }
    const anlegenBtn = ereignis.target.closest('[data-auftrag-anlegen]')
    if (anlegenBtn) {
      if (offenerAuftragDialog === null || offenerAuftragDialog.gesperrt) return
      // Verifikations-Fund (F34 WS-2): 'modus'/'schluessel' VOR dem await einfrieren — offenerAuftragDialog
      // ist ein EINZIGER Modulzustand für IRGENDEINEN gerade offenen Dialog. Öffnet der Mensch WÄHREND
      // dieser Anfrage läuft (Dialog ist gesperrt, aber die "Als Auftrag anlegen"-Trigger ANDERER Einträge
      // bleiben bedienbar) den Dialog eines ANDEREN Eintrags, zeigt offenerAuftragDialog danach dessen
      // Daten — ein direktes '{ ...offenerAuftragDialog, … }' nach dem await hätte das Ergebnis DIESER
      // Anfrage fälschlich auf den NEUEN, ungeprüft laufenden Dialog geschrieben (falsche auftragId/falscher
      // Fehlertext am falschen Eintrag). Jede Fortsetzung unten prüft deshalb erneut, ob offenerAuftragDialog
      // noch auf genau diesen schluessel/modus zeigt, bevor sie ihn überschreibt — zeigt er inzwischen auf
      // etwas anderes, bleibt das FREMDE Dialogfeld unangetastet (der Auftrag wurde serverseitig trotzdem
      // real angelegt, nur die UI-Rückmeldung dafür entfällt dann kommentarlos — kein Datenverlust, nur ein
      // fehlender Hinweis in diesem Rand fall).
      const { modus, schluessel, herkunft } = offenerAuftragDialog
      const gehoertNochZuDiesemDialog = () => offenerAuftragDialog !== null && offenerAuftragDialog.modus === modus && offenerAuftragDialog.schluessel === schluessel
      const titelFeld = document.getElementById('chat-auftrag-titel')
      const textFeld = document.getElementById('chat-auftrag-text')
      const titel = titelFeld?.value ?? offenerAuftragDialog.titel
      const auftragstext = textFeld?.value ?? offenerAuftragDialog.auftragstext
      offenerAuftragDialog = { ...offenerAuftragDialog, titel, auftragstext, gesperrt: true, fehler: '' }
      renderVerlauf()
      try {
        // F39 WS-2a: 'herkunft' nur mitgesendet, wenn der Kandidat eine trägt (leseAuftragKandidat) —
        // ein manuell (außerhalb der Chat-Brücke) angelegter Auftrag bleibt ohne das Feld.
        const antwort = await legeAuftragAn({ titel, auftragstext, ...(herkunft !== null ? { herkunft } : {}) })
        const koerper = await antwort.json().catch(() => ({}))
        if (!gehoertNochZuDiesemDialog()) return
        if (antwort.status !== 201) {
          offenerAuftragDialog = { ...offenerAuftragDialog, gesperrt: false, fehler: `${antwort.status}: ${koerper.grund ?? 'unbekannter Fehler'}` }
          renderVerlauf()
          return
        }
        offenerAuftragDialog = { ...offenerAuftragDialog, gesperrt: false, erfolgAuftragId: koerper.auftragId }
        renderVerlauf()
        // F34 Fixpaket (löst F-625): Rückverweis Turn→Auftrag — NUR 'sparring' (F-625-Scope) und NUR
        // für einen echten Turn (schluessel === laufId, nicht 'persistiert-<index>' eines Alt-Eintrags
        // ohne laufId). Best-effort/fire-and-forget: der Auftrag existiert zu diesem Zeitpunkt bereits
        // real (POST /api/auftraege ist längst erfolgreich zurück) — schlägt NUR diese zusätzliche,
        // rein informative Zuordnung fehl, geht kein Auftrag verloren, nur der spätere
        // "bereits angelegt"-Hinweis (renderAuftragBruecke) bleibt dann für diesen Turn aus.
        if (modus === 'sparring' && !schluessel.startsWith('persistiert-')) {
          void verknuepfeSparringAuftrag(schluessel, koerper.auftragId).catch(() => {})
        }
      } catch (fehler) {
        if (!gehoertNochZuDiesemDialog()) return
        offenerAuftragDialog = { ...offenerAuftragDialog, gesperrt: false, fehler: `Anfrage fehlgeschlagen: ${fehler.message}` }
        renderVerlauf()
      }
    }
  })
}

/** QA-Befund WS-2a (real reproduziert): setzt den kompletten lokalen Chat-Zustand BEIDER Modi zurück — aufgerufen bei jedem Projektwechsel (abonniereProjektWechsel), damit weder eine ausstehende Nachricht noch ein lokaler Eintrag aus dem VORHERIGEN Projekt im neuen sichtbar bleibt oder gegen dessen api.js-Präfix weiterpollt (F34 WS-2: beide Modi, da beide unabhängig gegen den projektbezogenen Präfix pollen können). */
function setzeChatZustandZurueck() {
  for (const modus of Object.keys(MODI)) {
    stoppeAusstehendenLaufPoll(modus)
    zustandJeModus[modus] = neuerModusZustand()
  }
  offenerAuftragDialog = null
  zeigeChatFehler('')
  // Sende-/Abbrechen-Zustand braucht keinen eigenen Reset mehr: neuerModusZustand() liefert bereits
  // sendenLaeuft:false/ausstehenderLauf:null, renderVerlauf() leitet die Buttons daraus ab (s. dort).
  renderVerlauf()
}

/** Initialisiert die Chat-View einmalig beim Bootstrap. */
export function initChatView() {
  initSendenFormular()
  initEingabeTastatur()
  initGanzenVerlaufLink()
  initAbbrechenBedienung()
  initZusammenfassenBedienung()
  initModusUmschalter()
  initUntermodusUmschalter()
  initAuftragBruecke()

  // F29 WS-1a: { ueberlagert: true } — Chat ist seither die umschaltbare rechte Spalte der Shell
  // (public/leitstand/shell.js), kein `[data-view]`-Container in <main> mehr; der Dispatch auf
  // '#/chat' lässt die Hauptansicht deshalb unangetastet (router.js Datei-Kommentar). Rein
  // strukturelle Registrierungs-Option, keine Änderung an Verlauf/Formular-Logik dieser Datei.
  registriere(/^#\/chat$/, 'chat', () => {
    void ladeVerlauf(aktiverModus)
  }, { ueberlagert: true })

  // F29 WS-D2-Korrektur: #shell-chat-spalte ist ab ≥1280px in JEDER View sichtbar (shell.js),
  // nicht nur unter '#/chat' — das obige onEnter allein lädt den Verlauf deshalb nicht mehr
  // zuverlässig (z. B. Start → Workboard, ohne '#/chat' je betreten zu haben, blieb die Spalte
  // leer). Einmaliger Ladeversuch hier beim Shell-Bootstrap, unabhängig von der aktiven Route —
  // renderProjektKontext() (app.js) läuft davor, das aktive Projekt steht also bereits fest.
  void ladeVerlauf(aktiverModus)
  renderVerlauf()

  abonniere((zustand) => {
    letzterZustand = zustand
  })
  abonniereProjektWechsel(setzeChatZustandZurueck)

  // Task "Jarvis-Chat-Latenz senken", Schritt 4: siehe Kommentar an polleSofortBeiSichtbarkeit.
  document.addEventListener('visibilitychange', () => void polleSofortBeiSichtbarkeit())
}
