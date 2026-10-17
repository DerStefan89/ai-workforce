# Plan v1 — F45 B2b-3b-2b-2a „Rückfrage-Kanal: Einschalten (Opt-in) + Anzeige“

Stand 17.10.2026. Branch `f45/b2b3b2b2a-einschalten-anzeige`, Basis main `cc05137` (#356). Reihenfolge F-1124: Plan → Advisor-Pass
(`advisor-b2b3b2b2a.md`) → Code. Vorab freigegebener Schnitt bei „zu groß“: **2a-1** Server/Evaluator/Gate (Punkte 1–5) | **2a-2**
Oberfläche (Punkte 6–9).

Kontext: F-1126 (3) Auflage B12, F-1128 (3)/R1-Grund/qa L1/E-B7/D13, F-1131 (keine neuen Routen); ARCHITECTURE §1 (Wachstumsbremse),
§3 (Kanal), §4 (Klassifikation); `plan-b2b3b2b1b-v2.md`. Kein echter CLI-Lauf (2b-2b).

## Ziel
Kanal vollständig verdrahtet und bedienbar, aber nur mit `LEITSTAND_RUECKFRAGE=1` aktiv. Ohne Variable: Argv und Auftragstext
bitgleich zu main.

## Teil 2a-1 (Punkte 1–5)

### §1 Opt-in (Punkt 1)
- Neues reines Modul `scripts/leitstand/rueckfrage-einschalten.mjs` (kein I/O, nur Werte):
  - `rueckfrageBasisAusUmgebung(env, port)` ⇒ `http://127.0.0.1:<port>/api` nur bei `env.LEITSTAND_RUECKFRAGE === '1'` und
    ganzzahligem Port > 0; sonst `{ aus: grund }` bzw. undefined (Port 0 ⇒ aus mit Grund, weil die URL vor dem Binden feststehen muss).
  - `rueckfrageOptionFuer(basis, projektId?)` ⇒ undefined ohne Basis; sonst `{ an: true, url }` mit `url = basis` (Workforce) bzw.
    `basis + '/projekte/' + id` (Projekt; id nur bei `ID_MUSTER` aus `src/projekte`, sonst undefined = Kanal für dieses Projekt aus).
  - `rueckfrageStartzeile(basisOderAus)` ⇒ Konsolentext „Rückfrage-Kanal: an (LEITSTAND_RUECKFRAGE=1, <basis>)“ bzw. „aus“ (+ Grund).
    Konsolenzeilen sind Diagnose, keine UI-Texte (keine i18n).
- CLI-Bindeblock: `rueckfrageBasis` einmal berechnen; `defaultHandler` bekommt `rueckfrage: rueckfrageOptionFuer(rueckfrageBasis)`,
  `baueProjektHandlerMap` die neue Option `rueckfrageBasis`; im `listen`-Rückruf eine Startzeile.
- `baueProjektHandlerMap`: Option `rueckfrageBasis` ⇒ je Projekt `...(o !== undefined ? { rueckfrage: o } : {})` mit
  `o = rueckfrageOptionFuer(rueckfrageBasis, projekt.id)`. Ohne Option bleibt der Aufruf von `erzeugeRequestHandler` gleich.
- Live-Anlage (POST /api/projekte, `baueProjektHandlerMap([neuerEintrag] …)`, Server ~8735): reicht `rueckfrageBasis` nur, wenn
  dieser Handler den Kanal an hat (`rueckfrageAn ? rueckfrage.url : undefined` — nur die Workforce-Instanz hat `projektHandlerMap`,
  ihre url ist die Basis).
- Vermittlung bleibt je Instanz (eigene in `erzeugeRequestHandler`); GET `/api/rueckfragen` zeigt nur die eigene (F-1126 (6), Mehrprojekt).

### §2 URL-Basis (Punkt 2)
- `rueckfrage-mcp.mjs`: `post('/rueckfrage/anfrage')` und `post('/rueckfrage/anfrage/<id>/warten')`; `WORKFORCE_RUECKFRAGE_URL`
  ist die API-Basis der Instanz (`…/api` bzw. `…/api/projekte/<id>`). Kopf und ARCHITECTURE §3 nennen das.
- Bestands-Gates, die die url setzen bzw. vergleichen, stellen nur den String auf `${basisUrl}/api` um: b2b3b1 (Z. 267, 280, 381,
  412, 457), b2b3b1b (267), b2b3a-absicherung (287), b2b3b2b1a (284), b2b3b2b1b-r1 (282); dazu `src/rueckfrage/rueckfrage.test.ts`
  nur, falls die Konstante eine URL-Form vorschreibt (prüfen). Keine Bedingung entfällt; je Datei ein Satz im Bericht.
- Neuer Gate-Fall (d): echter `erzeugeMultiProjektDispatcher` mit Workforce-Handler (url `…/api`) und Projekt-Handler (url
  `…/api/projekte/p1`), je mit injizierter Vermittlung und geöffnetem Lauf; das echte MCP-Skript (Attrappen-Client wie b2b3b1)
  fragt `rechte_pruefen` Bash ⇒ offen in `GET /api/projekte/p1/rueckfragen` (nicht in der Workforce-Liste) ⇒ Antwort über
  `POST /api/projekte/p1/rueckfragen/<id>/antwort` ⇒ allow; dasselbe für die Workforce; ein Warten über mehrere Poll-Fenster
  (kurzes Fenster) belegt `…/warten` über den Dispatcher. Rot auf main: Skript postet `/api/api/…` ⇒ 404 ⇒ deny.
  Die Verdrahtung `baueProjektHandlerMap` → `rueckfrageOptionFuer(rueckfrageBasis, projekt.id)` prüft das Gate am Quelltext
  (Handler-Optionen sind von außen nicht lesbar) plus `rueckfrageOptionFuer` funktional.

### §3 Init-Gate Projektinstanz (Punkt 3)
- Kein Code. `RUECKFRAGE_SERVER` steht schon im Soll, sobald `ortBLauf` existiert (Server ~3476, Gate b2b3b1 (a2)). Neuer Fall (i):
  `loeseAusfuehrungsEingabenAuf` mit Fähigkeiten-Kontext (Ort-B, wie ihn eine Projektinstanz baut) und `rueckfrage` ⇒
  `ortBLauf.mcpServer` enthält `rueckfrage`; `pruefeInitZeile` mit diesem Soll gegen eine init-Zeile ohne `rueckfrage` ⇒ Verstoß.
  Ort-B hängt am Fähigkeiten-Kontext, nicht an der Instanz; der Fall belegt den Weg, den ein Projektlauf nimmt.

### §4 Regelzeile `frage_stefan` (Punkt 4)
- `src/rueckfrage/index.ts`: `RUECKFRAGE_REGEL` (eingefrorene Zeilen, Muster `REGEL_DIREKT_AUSFUEHRBAR`), Inhalt:
  Entscheidungen, die nur Stefan treffen kann, über `frage_stefan` einholen statt raten; Bash-Befehle außerhalb der Freigabe legt
  der Leitstand Stefan vor; eine Ablehnung nicht umgehen (kein anderer Weg zum selben Ziel), im Ergebnis nennen; endet
  `frage_stefan` ohne Antwort, gilt der Hinweis „- [x] Blockiert“ (F-689) weiter.
- Server: im bestehenden `if (rueckfrageAn && …)`-Block nach der Zuweisung `auftragstext += '\n\n' + RUECKFRAGE_REGEL.join('\n')`
  (vor `loeseSchrittEingabenAuf`). Ohne Kanal bitgleich.
- Policy/Version: die Ausführung hat keine versionierte Policy (nur `REVIEW_POLICY_VERSION` für code-reviewer, Gate koppelt sha256 an
  die Version); `baueCdRegelZeile` ist ebenfalls unversioniert. ⇒ keine Versionsänderung. Kein Einfluss auf die Startfreigabe (Argv
  ändert sich nicht durch den Text).

### §5 Terminalmarke (Punkt 5)
- `gleicheAblehnungenAb` (src/rueckfrage/protokoll.ts): `{ art: 'nicht_nur_stefan', grund }` mit festen Codes — `protokoll_ungueltig`,
  `protokoll_fremd` (lauf_id/ab), `keine_ablehnung`, `ablehnung_ungueltig`, `id_fehlt`, `id_doppelt`, `kein_eintrag`,
  `eintrag_mehrfach`, `nicht_von_stefan`, `werkzeug_abweichend`, `eingabe_abweichend`, `ablehnungstext_passt_nicht`. Reihenfolge
  der Prüfungen unverändert; nur das Ergebnis trägt den Code. Tests (`protokoll.test.ts` 3 Stellen) prüfen `art` und je Rotfall den Code.
- Vermittlung: `zugang(laufId, melde)` bekommt `zaehlung()` ⇒ `{ stefan_erlaubt, stefan_abgelehnt, frage_beantwortet, nicht_browser }`
  aus `lauf.protokoll` (Speicher, D13; `nicht_browser` = Antworten der drei Arten mit `herkunft: 'nicht_browser'`), null ohne offenen
  Lauf. `eintraegeVon` bleibt bei den Vergleichsfeldern (Advisor B10 alt).
- Controller (`fuehreAufgabeDurch`, ~617): nur mit `eingaben.rueckfrageKanal` — den Zugang so umhüllen, dass `meldeAbweichung` den
  Grund zusätzlich lokal merkt (Signatur von `ermittleRueckfrageProtokoll` bleibt, Gates (a2)/2b-1a unverändert); `zaehlung()`
  vor der Klassifikation lesen (vor `beendeLauf`, wie der Speicher). Neue optionale Eingaben `rueckfrageAbweichung?: string`,
  `rueckfrageZaehlung?: object` an `klassifiziereLauf`. `RueckfrageZugang.zaehlung` optional (Tests/Gates ohne bleiben gültig).
- Evaluator: nur mit `rueckfragen !== undefined` (Kanal an), sonst bitgleich:
  - VERWEIGERT ⇒ `daten.rueckfrage_abgleich = { art, grund }`: `art: 'abgleich'` + Code; `art: 'abweichung'` + R3-Grund (Protokoll
    verworfen); `art: 'kein_protokoll'` (Lauf ohne Rückfrage, nur statische Ablehnungen); `art: 'umgehungsverdacht'` (Abgleich nicht
    geprüft, E-186).
  - ERFOLGREICH/VERWEIGERT ⇒ `daten.rueckfrage_zaehlung` (wenn geliefert).
  - jedes Ergebnis mit R3-Abweichung ⇒ `daten.rueckfrage_abweichung = grund` (bleibt nach Neustart, Terminalmarke im Kontrollzustand).
  - ERFOLGREICH ohne Ablehnung bekommt damit erstmals `daten` (nur Kanal-Läufe). Prüfen: Leser von `daten` einer ERFOLGREICH-Marke
    (Server, UI) — erwartet: keiner verlangt `daten === undefined`.
- Startfehlerliste (R3) bleibt wie in 2b-1a (Gate (r3) unverändert); die eigene Einordnung in der Anzeige folgt in 2a-2.

### Gate `scripts/check-f45-b2b3b2b2a-einschalten.mjs` (in `check:gates`)
(o1) `rueckfrageBasisAusUmgebung`: nur `'1'` schaltet ein (`'0'`, `'true'`, leer, fehlt ⇒ aus); Port 0 ⇒ aus mit Grund. (o2) Server
mit Option aus der Hilfe aus `{}` ⇒ Lauf ohne Kanal, Argv bitgleich zu einem Server ohne Option; Auftragstext ohne Regelzeile, gleich.
(o3) Quelltext: CLI-Block und `baueProjektHandlerMap` setzen `rueckfrage` nur über `rueckfrageOptionFuer(`; Startzeile vorhanden.
(d) Dispatcher Workforce + Projekt (oben). (i) Init-Gate Projektweg. (r) Regelzeile mit Kanal genau einmal, ohne Kanal nicht.
(t) Terminalmarke über `klassifiziereLauf` (Fixtures wie r1t): Code je Rotfall, `abweichung`, `kein_protokoll`, `umgehungsverdacht`,
Zählung inkl. `nicht_browser`, R3 bei ERFOLGREICH; Kanal aus ⇒ daten bitgleich (Positiv- und Negativkontrolle je Fall).
Rot gegen main (F-1127, `git archive`): (d) über `/api/api` ⇒ deny; (t)/(o) über fehlende Exporte (dynamischer Import, Befund statt
Absturz).

### Bestands-Gate b2b3b1 (f) — Änderung mit Begründung
„kein Produktaufrufer setzt die Einschalt-Option“ ist mit dem Auftrag absichtlich falsch. Ersatz (gleich streng): jeder
`erzeugeRequestHandler(`-Aufruf in `leitstand-server.mjs`, der `rueckfrage` nennt, tut es nur als `rueckfrageOptionFuer(` (bzw. Spread
dessen Ergebnisses), und (o1) belegt, dass diese ohne `LEITSTAND_RUECKFRAGE=1` undefined liefert. Die Zuweisungs-Invariante
(„einzige `rueckfrage: { url: rueckfrage.url` hinter `if (rueckfrageAn && …`“, < 800 Zeichen) bleibt wörtlich.

### Wachstumsbremse
Zuwachs ≈ +8 (Import, Bindeblock 3, Handler-Map 2, Live-Anlage 0, Regelzeile 1). Bezahlt durch Auslagern von `loeseProjektPfade`
(reine Funktion, ~25 Zeilen inkl. Doku) nach `scripts/leitstand/projekt-pfade.mjs`, Re-Export aus dem Server (Gate f25 importiert sie
von dort). Netto ≤ 0; Grenze in `wachstumsbremse-server.json` auf das Ist senken ((a3) verlangt Gleichstand). `starteWorkflowSchritt(` 6×.

### Doku 2a-1
ARCHITECTURE §3 (Opt-in `LEITSTAND_RUECKFRAGE=1`, URL-Basis je Instanz, Regelzeile), §4 (`rueckfrage_abgleich`, `rueckfrage_zaehlung`,
`rueckfrage_abweichung` in daten der Terminalmarke); fixpaket-f45 Zeile B2b-3b-2 geteilt (2b-2a einschalten/anzeigen, 2b-2b echter
Lauf/Startfreigabe); Nachträge F-1126, F-1128; neue Findings ab F-1132 (Restpunkte).

## Teil 2a-2 (Punkte 6–9) — Umriss
- GET `/api/rueckfragen` + ein Feld `entschieden` (entschiedene Einträge offener Läufe: id, art, ergebnis, herkunft, zeit) aus der
  Vermittlung; Antwort-Route unverändert; Poll der Instanz des aktiven Laufs (Präfix aus dem Laufzustand).
- `attention-daten.js`: eigene Art `kanal_rueckfrage` (getrennt von `rueckfrage` F-689) in „Deine Entscheidungen“; Bash wörtlich und
  vollständig mit Zeilenzahl; nur „einmal erlauben“/„ablehnen“; Frage mit Optionen + freier Antwort, Steuerzeichen sichtbar maskiert
  (`\u…`-Marke); Restzeit bis Frist; Herkunft je Antwort, „nicht aus dem Browser“ auffällig.
- Abnahme: `abgelehnt_durch_stefan`; VERWEIGERT mit `rueckfrage_abgleich` ⇒ eigener Grund statt F-760-Standardtext; R3 als eigene,
  dauerhafte Meldung (aus `daten.rueckfrage_abweichung`), Startfehler-Eintrag mit `art: 'rueckfrage_abweichung'` aus der Gruppe
  „Startproblem“ heraus.
- i18n de; Render-Nachweis über die neutrale Umgebung (nur neue Instanz), OCR-taugliche .webp; design-guardian-Pass.

## Risiken
- Zuschnitt: 1–9 zusammen ist mehr als ein Baudurchgang + eine Korrekturrunde (2a-1 allein: 1 neues Modul, MCP-Skript, 5 Gates
  umstellen, Server, Protokoll, Vermittlung, Controller, Evaluator, neues Gate, Doku). Empfehlung: Schnitt 2a-1 | 2a-2.
- Port 0 bzw. anderer Bind-Host ⇒ falsche URL — Kanal dann aus (sicher, sichtbar).
- `daten` an ERFOLGREICH-Marken (Kanal-Läufe) neu — Leser prüfen.
- Gate (f) b2b3b1 wird umformuliert — Ersatzbedingung muss gleich streng sein (Advisor bitte prüfen).

## Status
- [ ] Freigegeben

## Nächster sinnvoller Schritt
Advisor-Pass (frischer Kontext) auf diesen Plan.
