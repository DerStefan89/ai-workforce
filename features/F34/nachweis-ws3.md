# F34 WS-3 — Realer Nachweis: Projekt-Interview

Realer Lauf gegen dieses Repo (`ai-workforce`), 22.09.2026, über den echten
Leitstand (`npm run leitstand`, Port 4173, `kontrollzustand/` dieses Repos
— keine Wegwerf-Kopie). Worker `claude-code` (Codex in dieser Umgebung
nicht verfügbar, dieselbe Worker-Auflösung wie `jarvis`/WS-1/WS-2, kein
Sonderfall). Alle Latenzen (`verbrauch.dauer_ms`) aus der echten Laufakte
(`kontrollzustand/lineage-laufakte-<laufId>/checkpoints/`), nicht
geschätzt.

## Teil (a) — Interview bis `projekt_entwurf`

Thema frei gewählt: eine kleine, real im Repo begründete Erweiterung
(F-590/F-591, "bekannte Fallen" in `CLAUDE.md`) — ein On-Demand-
Aufräumwerkzeug für verwaiste `kontrollzustand-test-*`-Verzeichnisse.

Der Konversationsverlauf lag zu Beginn NICHT leer — `sparring-ai-workforce`
trägt bereits fünf ältere, echte Sparring-Turns aus vorangegangenem
Dogfooding (Modus `feature`, u. a. "Design-Phase vor F30"). Beide neuen
Turns unten sind die Einträge 6 und 7 dieser Kette (`modus: 'projekt'`,
korrekt von den fünf älteren `modus: 'feature'`-Einträgen unterschieden —
`GET /api/sparring` projiziert beide Modi im selben, geteilten Verlauf
nebeneinander, wie spezifiziert).

### Turn 1

**Nachricht:**
> Ich moechte dieses Repo um einen kleinen neuen Meilenstein erweitern:
> eine automatische Aufraeum-Routine fuer verwaiste
> kontrollzustand-test-*-Verzeichnisse (F-590/F-591, siehe CLAUDE.md
> bekannte Fallen). Lass uns das im Projekt-Interview durchgehen.

**Antwort:** `art: 'frage'`, `dauer_ms: 25759` (~25,8 s), `turns: 8`,
`output_tokens: 2104`.

Der Coach ging NICHT reflexhaft auf "automatische Aufräum-Routine" ein,
sondern zitierte die reale, gegenläufige Regel aus `CLAUDE.md`
("verwaiste `kontrollzustand-test-*`-Reste NICHT eigenmächtig löschen —
Stefan entscheidet") und unterschied korrekt zwischen F-590 (P3-
Harness-Finding zu EPERM in `raeumeVerzeichnis`, kein Funktionswunsch) und
F-591 (Prozess-Finding). Rückfrage: On-Demand-Werkzeug (respektiert die
bestehende Regel) oder ein automatischer Mechanismus (Kurskorrektur der
Regel selbst)?

### Turn 2

**Nachricht:**
> Ich meine (a): ein On-Demand-Werkzeug (z.B. npm-Skript), das ich manuell
> aufrufe, um die verwaisten kontrollzustand-test-*-Verzeichnisse
> anzuzeigen und nach Rueckfrage zu loeschen. Keine Kurskorrektur der
> Stefan-entscheidet-Regel, keine Automatik ohne Zutun.

**Antwort:** `art: 'projekt_entwurf'`, `dauer_ms: 41843` (~41,8 s),
`turns: 8`, `output_tokens: 4069`.

Der Coach erklärte alle sechs Interview-Themen für ausreichend geklärt
(Vision/Zielgruppe/Ziele unverändert aus dem bestehenden Projekt
übernommen — korrekt erkannt, dass dies eine **Erweiterung** ist, keine
Neufassung) und lieferte einen vollständigen `projekt_entwurf` — **2
Turns** bis zur Konvergenz (innerhalb des erwarteten 4–6-Turn-Rahmens,
hier schneller, weil der Themenwunsch bereits eng umrissen war).

## Turn-Latenz-Übersicht

| Turn | art | dauer_ms | turns (intern) | output_tokens |
|---|---|---|---|---|
| 1 | frage | 25.759 | 8 | 2.104 |
| 2 | projekt_entwurf | 41.843 | 8 | 4.069 |

## Zugewiesene IDs (real, `vergebeFeatureIds`)

- Meilenstein: **M6** — "M6 — Aufräum-Werkzeug für Testrückstände" (nächste
  freie Nummer nach dem realen Bestand dieses Repos zur Laufzeit, u. a.
  `M1`…`M5`, `F19-bridge` übersprungen).
- Feature: **F41** — "On-Demand-Aufräum-Skript für kontrollzustand-test-*"
  (nächste freie Nummer nach dem realen `features/`-Bestand, u. a.
  `F1B`/`F6a` übersprungen).
- `abhaengig_von_titel`: leer (ein einzelnes Feature, keine Abhängigkeit) —
  kein Fall für eine offene Frage in diesem Lauf.
- `auftragModus`: `"erweiterung"` — korrekt, da `sammleBestehendeIds` beim
  echten Lauf reale Feature-/Meilenstein-IDs in diesem Repo fand.

**Wichtiger Hinweis (real gefunden, Verifikation Challenger, löst
F-618):** der Nachweis-Auftrag `1b3412a8-88be-45e0-b97d-46e6cc5ba396`
(unten, Teil b) trägt eine mit "Neues Projekt anlegen" (E-M5-14)
**kollidierende `F41`** — Ursache war NICHT `vergebeFeatureIds` selbst,
sondern ein unvollständiger Schritt-0-Doku-Nachzug: `docs/projekt/
roadmap.json`s `M5.features` trug F41 zum Zeitpunkt dieses Laufs noch gar
nicht (weder die neue Reihenfolge aus E-M5-13 noch F41 selbst waren
nachgezogen), also war `F41` für `sammleBestehendeIds` schlicht nicht als
belegt erkennbar. **Dieser Auftrag darf deshalb NIEMALS geroutet/gestartet
werden** — er würde real mit dem noch zu bauenden Feature "Neues Projekt
anlegen" kollidieren. `docs/projekt/roadmap.json` ist inzwischen korrigiert
(`M5.features` reserviert `F41` jetzt explizit, auch ohne eigene
`features/F41/`-Akte — die Roadmap-Karte zeigt sie korrekt als
`status: 'keine_akte'`). Ein erneuter Lauf von `vergebeFeatureIds` gegen
denselben Entwurf (Meilenstein-Titel "Aufräum-Werkzeug für
Testrückstände", ein Feature "On-Demand-Aufräum-Skript für
kontrollzustand-test-*") vergibt jetzt real **`M6`/`F42`** statt `M6`/`F41`
— reproduziert direkt gegen die korrigierte `roadmap.json`, ohne das
Interview erneut zu fahren (Teil a/b oben bleiben unverändert der reale
Beleg für den Interview-Mechanismus selbst). Real geprüft: `scripts/
check-f34-product-coach.mjs` Abschnitt (u).

## Capability-Bedarf (real, gegen den echten Capability-Auszug abgebildet)

| Bedarf | Ressource-ID | Status |
|---|---|---|
| Code schreiben (Skript + npm-Eintrag) | `claude-code` | vorhanden |
| Plan vor dem Bau prüfen | `advisor-pass` | vorhanden |
| Fertigen Code prüfen | `claude-code` | vorhanden |
| Akzeptanzkriterien/Randfälle definieren | `claude-code` | vorhanden |
| Spezifikation schreiben | `spec-schreiben` | vorhanden |
| Git-Workflow (Branch, Commit-Konvention) | `git-flow` | vorhanden |

Keine erfundene Ressource — jede `ressource_id` kommt real aus
`ressourcen.json` (über `loeseRessourcenAuf`/`baueCapabilityAuszug`), kein
`status: 'fehlt'` in diesem Lauf (der reale Bedarf war vollständig
abdeckbar).

## Teil (b) — Auftrag angelegt (NICHT geroutet/gestartet)

`baueAuftragAusProjektentwurf(projektMitIds, 'erweiterung')` (Server-TS,
real aufgerufen) lieferte Titel + Auftragstext; `POST /api/auftraege`
registrierte ihn real: **`auftragId: 1b3412a8-88be-45e0-b97d-46e6cc5ba396`**,
Antwort `201`. Danach **kein** `POST /api/laeufe`, **kein** Routen/Starten
— Stefan entscheidet über die Fortsetzung, wie vorgegeben.

**Titel** (real, inkl. des in F-611 dokumentierten Kosmetik-Befunds — der
Titel nennt die unveränderte Gesamt-Vision statt des neuen Meilensteins):

```
Projekt-Erweiterung: AI Workforce führt ein Vorhaben von der Idee bis zum abgenommenen Ergebnis du...
```

**Vollständiger Auftragstext** (byte-genaue Kopie der realen Server-Antwort):

````markdown
# Projekt-Erweiterung: AI Workforce führt ein Vorhaben von der Idee bis zum abgenommenen Ergebnis du...

## Vision
AI Workforce führt ein Vorhaben von der Idee bis zum abgenommenen Ergebnis durch klar getrennte KI-Positionen — für einen einzigen Nutzer, der zugleich Vorarbeiter und einzige Entscheidungsinstanz ist. Dateien und Git sind der führende Zustand; der Kontrollzustand jedes Projekts liegt in dessen eigenem Repository.

## Zielgruppe
Stefan (einziger Nutzer, zugleich Vorarbeiter und einzige Entscheidungsinstanz) sowie ein Kollege in eigener lokaler Instanz.

## Ziele
- Verwaiste kontrollzustand-test-*-Verzeichnisse manuell und sicher aufräumbar machen, ohne die bestehende 'Stefan entscheidet'-Regel aufzuheben
- Keine Automatik ohne menschliches Zutun einführen

## Scope In
- Neues npm-Skript (z. B. npm run raeume-testrueckstaende), das kontrollzustand-test-*-Verzeichnisse im Projektwurzelverzeichnis auflistet
- Anzeige von Anzahl, Namen und ggf. Alter/Größe der gefundenen Verzeichnisse vor jeder Aktion
- Interaktive Rückfrage (Ja/Nein) vor dem Löschen — Abbruch bei Nein oder Nicht-TTY-Kontext
- Löschen ausschließlich über die bestehende raeumeVerzeichnis-Hilfe (scripts/_aufraeumen.ts)

## Scope Out
- Automatischer oder CI-getriggerter Aufruf ohne menschliches Zutun
- Behebung der EPERM-Retry-Ursache in raeumeVerzeichnis (F-590) — bleibt eigenständiges Harness-Finding
- Absenkung oder Änderung des bestehenden maxRetries/retryDelay-Schutzwerts (F-591)
- Aufräumen anderer Wegwerf-Verzeichnisse außerhalb des Musters kontrollzustand-test-*

## Meilensteine
### M6 — M6 — Aufräum-Werkzeug für Testrückstände
Ziel: Stefan kann angesammelte kontrollzustand-test-*-Leichen auf Zuruf einsehen und gezielt entfernen, ohne die bestehende Entscheidungsregel zu verletzen.

#### Features
- F41 — On-Demand-Aufräum-Skript für kontrollzustand-test-*
  Ziel: Ein manuell aufgerufenes npm-Skript zeigt alle verwaisten kontrollzustand-test-*-Verzeichnisse an und löscht sie erst nach expliziter Bestätigung durch Stefan.
  Nicht-Ziele: Keine automatische Ausführung in CI, Git-Hooks oder Hintergrundprozessen; Keine Änderung an raeumeVerzeichnis selbst oder dessen Schutzwerten
  Akzeptanzkriterien: npm run <skriptname> ohne Argumente listet alle vorhandenen kontrollzustand-test-*-Verzeichnisse im Projektwurzelverzeichnis auf; Bei null gefundenen Verzeichnissen meldet das Skript dies und beendet sich ohne Rückfrage; Bei mindestens einem gefundenen Verzeichnis fragt das Skript explizit nach Bestätigung, bevor irgendetwas gelöscht wird; Eine Ablehnung der Rückfrage (oder Nicht-TTY-Ausführung) löscht nichts und beendet sich mit klarer Meldung; Nach Bestätigung werden ausschließlich die zuvor angezeigten Verzeichnisse über raeumeVerzeichnis entfernt; npm run check bleibt grün
  Abhängig von: (keine)

## Capability-Bedarf
- Code schreiben (Skript + npm-Eintrag) — status=vorhanden, ressource=claude-code
- Plan vor dem Bau prüfen — status=vorhanden, ressource=advisor-pass
- Fertigen Code prüfen — status=vorhanden, ressource=claude-code
- Akzeptanzkriterien/Randfälle definieren — status=vorhanden, ressource=claude-code
- Spezifikation schreiben — status=vorhanden, ressource=spec-schreiben
- Git-Workflow (Branch, Commit-Konvention) — status=vorhanden, ressource=git-flow

## Architektur-Hinweise
- Wiederverwendung von raeumeVerzeichnis (scripts/_aufraeumen.ts) statt einer neuen Löschroutine, um die bestehende Retry-/Schutzlogik nicht zu duplizieren
- Skript gehört nach scripts/, nicht src/ — ARCHITECTURE.md legt src/ als einzigen Produktpfad fest, dies ist ein Hilfswerkzeug
- Interaktive Rückfrage über readline/stdin, kein neues Abhängigkeits-Paket nötig

## Offene Fragen
- Soll das Skript zusätzlich Alter (z. B. älter als N Tage) als Filterkriterium anzeigen, oder reicht eine vollständige Liste ohne Filter für den ersten Wurf?
- Soll ein fehlgeschlagenes Löschen (EPERM trotz Retry, F-590) das Skript nur für dieses eine Verzeichnis überspringen und mit den restlichen fortfahren, oder komplett abbrechen?

## Auftrag an den Baudurchgang
Schreibe AUSSCHLIESSLICH Dokumentation, KEIN Produktcode:
1. docs/projekt/kontext/beschreibung.md — um diesen Abschnitt ERGÄNZEN (Bestehendes nicht umschreiben); die Einträge aus 'Capability-Bedarf' mit status 'fehlt' als eigenen Abschnitt "Scout-Kandidaten" aufnehmen ((keine)); die 'Architektur-Hinweise' oben als eigenen Abschnitt "Für den Architekten (F39)" aufnehmen.
2. docs/projekt/roadmap.json — um diese Meilensteine ERGÄNZEN (Bestehendes nicht umschreiben), jeder neue Meilenstein mit Status GEPLANT; muss validiereRoadmapDaten (src/projektkontext/index.ts) bestehen.
3. Je Feature eine eigene features/<id>/feature.md mit den Pflichtabschnitten aus scripts/check-feature.mjs (## Ziel, ## Nicht-Ziele, ## Akzeptanzkriterien, ## Dependencies) und Status: ENTWURF.
npm run check muss danach grün sein.
````

Die sichtbare Dopplung `### M6 — M6 — …` in den Meilensteinen ist real und
in F-612 dokumentiert (der Coach hat seinen eigenen `titel`-Text mit einem
geratenen `"M6 — "`-Präfix begonnen, `baueAuftragAusProjektentwurf` stellt
davor zusätzlich die echte, separat vergebene ID `M6 — ` voran) — kein
Korrektheitsfehler (die tatsächliche ID stammt ausschließlich aus
`vergebeFeatureIds`), nur eine kosmetische Redundanz.

## Ergebnis

- Auftrag real angelegt (`auftragId 1b3412a8-88be-45e0-b97d-46e6cc5ba396`),
  **nicht** geroutet/gestartet — Stefan entscheidet über die Fortsetzung.
  **Dieser Auftrag trägt eine mit E-M5-14 kollidierende `F41` (F-618, s. u.
  "Wichtiger Hinweis") und darf aus genau diesem Grund niemals geroutet/
  gestartet werden.**
- Modus `projekt` real im Lineage-Eintrag gespeichert und über
  `GET /api/sparring` projiziert, neben den fünf älteren `feature`-Turns
  im selben, geteilten Verlauf.
- `vergebeFeatureIds` hat zum Zeitpunkt dieses Laufs IDs vergeben, die NICHT
  kollisionsfrei waren (M6/F41, F-618) — Ursache war ein unvollständiger
  roadmap.json-Nachzug, nicht der Mechanismus selbst; gegen die inzwischen
  korrigierte `roadmap.json` vergibt derselbe Entwurf real M6/**F42** (s. u.).
- `baueCapabilityAuszug` hat real aufgelöste Ressourcen eingespeist, der
  Coach hat ausschließlich echte IDs referenziert, keine erfunden.
- Vier reale, dokumentierte Befunde (F-611, F-612, F-613, F-614) — alle
  inzwischen behoben (`state/findings.md`); ein fünfter (F-618, ebenfalls
  behoben) betraf den vorgelagerten Doku-Nachzug, nicht diesen Mechanismus.

## Nachtrag: Reviewer-/QA-Pass-Fixes (nach diesem Lauf)

Der Reviewer-/QA-Pass (frischer Kontext, direkt im Anschluss an diesen
Nachweis) fand zwei weitere reale Lücken — unabhängig voneinander, beide
noch in derselben Iteration behoben (`features/F34/feature.md` Abschnitt
"WS-3" unter "Feature Review", `state/findings.md` F-613/F-614):

- **F-613** (code-reviewer): die Ressourcen-Erfindungsprüfung und die
  ID-Vergabe hingen am angefragten `modus`, nicht an der zurückgelieferten
  `art` — ein Modell, das seine Rolleninstruktion missachtet, hätte im
  Modus `feature` trotzdem `art: 'projekt_entwurf'` mit unbeachteter
  Ressourcenprüfung UND realen IDs durchbekommen. Jetzt real abgelehnt
  (Vertragsverstoß, sichtbarer Fehler-Turn statt stiller Erfolg).
- **F-614** (qa, unabhängig auch vom code-reviewer gefunden): der oben in
  Teil (a) beschriebene Kontext-Bleed (fünf ältere `feature`-Turns im
  `projekt`-Interview) war kein Beobachtungsartefakt, sondern ein reales
  Verhalten — `ladeRollenVerlaufsfenster` filtert seither nach `modus`.

Dieser Nachweis (Teil a/b) lief bewusst VOR diesen beiden Fixes und zeigt
damit ehrlich den vorgefundenen Zustand — inklusive des realen
Kontext-Bleeds, der F-614 erst auslöste. Beide Fixes sind über neue,
reale Gate-Abschnitte ((s), (t) in `scripts/check-f34-product-coach.mjs`)
geprüft, nicht über einen erneuten Interview-Lauf (der reale 2-Turn-Beleg
oben bleibt gültig und unverändert).

## Nachtrag 2: Verifikation Challenger — F-618 und F-611/F-612 behoben

Eine unabhängige Verifikation (Challenger, frischer Kontext) fand einen
weiteren realen Fehler UND bestätigte, dass F-611/F-612 behoben werden
sollten statt nur dokumentiert zu bleiben:

- **F-618** (Verifikation Challenger): der Schritt-0-Doku-Nachzug vor dem
  Bau hatte `docs/projekt/zielfassung.md`/`docs/STATUS.md`/`features/F34/
  feature.md` aktualisiert, aber `docs/projekt/roadmap.json`s `M5.features`
  unverändert gelassen — weder die neue Reihenfolge (E-M5-13) noch `F41`
  selbst waren dort nachgezogen. Dadurch war `F41` für `sammleBestehendeIds`
  zum Zeitpunkt des Interview-Laufs (Teil a/b oben) nicht als belegt
  erkennbar, und `vergebeFeatureIds` vergab sie real an den Demo-Auftrag —
  kollidierend mit dem für "Neues Projekt anlegen" (E-M5-14) bereits
  geplanten, aber noch nicht gebauten Feature F41. Der Mechanismus
  (`vergebeFeatureIds`) selbst hat korrekt aus dem ihm vorliegenden Bestand
  die nächste freie Nummer berechnet — die Lücke lag ausschließlich im
  vorgelagerten Doku-Nachzug. `docs/projekt/roadmap.json` korrigiert
  (`M5.features` trägt jetzt `F41` explizit, in der Reihenfolge aus
  E-M5-13/14); real geprüft in `scripts/check-f34-product-coach.mjs`
  Abschnitt (u); derselbe Entwurf vergibt gegen die korrigierte
  `roadmap.json` jetzt real `M6`/`F42` (s. o., "Wichtiger Hinweis").
- **F-611** (jetzt behoben, war zuvor nur dokumentiert): der Auftragstitel
  im Modus `erweiterung` wird jetzt aus den Titeln der NEUEN Meilensteine
  gebildet (`"Erweiterung: <Meilenstein-Titel>"`), nicht mehr aus der
  unveränderten Gesamt-`vision`. Für diesen Nachweis-Auftrag würde der
  Titel jetzt lauten: `"Erweiterung: Aufräum-Werkzeug für
  Testrückstände"` statt der ursprünglichen, unbrauchbaren
  `"Projekt-Erweiterung: AI Workforce führt ein Vorhaben von der Idee…"`.
- **F-612** (jetzt behoben, war zuvor nur dokumentiert): ein führendes,
  ID-artiges Präfix im vom Coach gelieferten `titel`-Text
  (`^\s*[MF][0-9]+[A-Za-z]?\s*[—–:-]\s*`) wird jetzt vor dem Voranstellen
  der echten ID entfernt — sowohl in `baueAuftragAusProjektentwurf`
  (Server-TS und Browser-Kopie, weiterhin byte-identisch) als auch in der
  Live-Anzeige (`views/chat.js` `renderProjektMeilenstein`, per QA-Befund
  als zweite Fundstelle nachgetragen). Für diesen Nachweis-Auftrag würde
  die Meilenstein-Überschrift jetzt `### M6 — Aufräum-Werkzeug für
  Testrückstände` lauten statt der ursprünglichen Dopplung `### M6 — M6 —
  Aufräum-Werkzeug für Testrückstände`.

Alle drei Fixes sind real geprüft: `scripts/check-f34-product-coach.mjs`
Abschnitt (u) (neu, F-618), Abschnitt (q) (erweitert um eine zweite
Fixture MIT ID-artigem Titel-Präfix plus explizite Korrektheitsprüfungen
— ein Verifikations-Pass fand die ursprüngliche (q)-Fixture deckte den
F-611/F-612-Fall gar nicht ab), UND zwölf neue Unit-Tests in
`src/product-coach/product-coach.test.ts` (`entferneIdPraefix` direkt,
`baueAuftragAusProjektentwurf` gegen ein Fixture mit realer, über
`vergebeFeatureIds` zugewiesener ID) — kein erneuter Interview-Lauf nötig,
der reale 2-Turn-Beleg (Teil a/b) und der reale Rundlauf-Beleg (Nachtrag
1) bleiben unverändert gültig. Ein Restbefund aus diesem Verifikations-
Pass: **F-619** (`TECH_DEBT`, P3, offen) — `entferneIdPraefix` bereinigt
einen Titel nur mit Trenner nach der ID, ein trennerloser Titel wie
`"M6"` bleibt eine seltene, bewusst akzeptierte Grenze.

## Teil (c) — Realer Render-Nachweis Umschalter (F-620/F-621), 23.09.2026

Sichtprüfung (Stefan) + Challenger fand zwei real sichtbare UI-Bugs, die
kein statischer Gate-Durchlauf hätte finden können (F-622): `renderVerlauf`
aktualisierte `aria-pressed`, nie `classList('btn-primary')` (F-620), und
`.chat-modus-auswahl { display: flex }` überschrieb die UA-`[hidden]`-Regel
(F-621). Nach dem Fix (`views/chat.js` `setzeGedruecktenZustand`,
`style.css` `.chat-modus-auswahl[hidden] { display: none; }`) real gegen
den laufenden Leitstand (`http://127.0.0.1:4173`, bereits laufende Instanz
dieses Repos, `#/chat`) mit Playwright (Chromium, headless) geprüft — kein
Vertrauensvorschuss, ein echter DOM-/CSS-Nachweis. Playwright war in dieser
Umgebung entgegen der ursprünglichen Auftragsannahme NICHT vorinstalliert
(kein `node_modules`-Paket, kein Browser-Cache) und wurde nach Rückfrage an
Stefan installiert (`npm install --save-dev playwright`, Chromium-/
Headless-Shell-Binary manuell via `curl` nachgeladen, da Playwrights eigener
Downloader in dieser Sandbox auf `storage.googleapis.com` timeoutete,
`curl` denselben Host aber erreichte).

Geprüft: `getComputedStyle(...).display` von `#chat-untermodus-auswahl`
(nicht nur das `hidden`-Attribut — genau das war F-621s Lücke) und
`classList.contains('btn-primary')` aller vier Umschalter-Buttons, je
Klick und nach einem Reload mit persistiertem `localStorage`-Modus.

| Aktion | Aktiver Hauptmodus-Button | Aktiver Untermodus-Button | Untermodus sichtbar (`display`) | Chat-Titel |
|---|---|---|---|---|
| Start (kein gespeicherter Modus) | Jarvis | — (Feature, aber ausgeblendet) | nein (`none`) | Chat mit Jarvis |
| Klick „Sparring" | Sparring | Feature | ja (`flex`) | Sparring mit dem Product Coach |
| Klick „Projekt" | Sparring | Projekt | ja (`flex`) | Sparring mit dem Product Coach |
| Klick „Feature" | Sparring | Feature | ja (`flex`) | Sparring mit dem Product Coach |
| Klick „Jarvis" | Jarvis | — (Feature, aber ausgeblendet) | nein (`none`) | Chat mit Jarvis |
| Reload mit gespeichertem Modus `sparring`/`projekt` | Sparring | Projekt | ja (`flex`) | Sparring mit dem Product Coach |

In jedem Schritt trug **genau ein** Button je Gruppe `btn-primary` (nie
keiner, nie mehrere) — vor dem Fix blieb `btn-primary` dauerhaft auf dem
Erstzustand (Jarvis/Feature) stehen, unabhängig vom Klick. Die
Untermodus-Sichtbarkeit folgt jetzt korrekt `getComputedStyle(...).display`
(vor dem Fix `flex` auch im Modus `jarvis`, trotz gesetztem
`hidden`-Attribut). Der Reload-Fall bestätigt: der Initialzustand aus
`localStorage` ist beim ERSTEN Render korrekt, nicht erst nach einem Klick
(Auftragspunkt 2) — `renderVerlauf` leitet `btn-primary` strukturell aus
`aktiverModus`/`sparringUntermodus` ab, es gibt keinen separaten
Initialisierungspfad, der veraltet sein könnte.

Screenshots (Chat-Kopf, zugeschnitten, je 13–20 KB) in
`features/F34/nachweis-ws3-ui/`: `01-initial-jarvis.png`,
`02-sparring-feature.png`, `03-sparring-projekt.png`,
`04-zurueck-jarvis.png`, `05-reload-sparring-projekt.png`.

Gate-Ergänzung: `scripts/check-f34-product-coach.mjs` Abschnitt (v)
(statische Regressionswache — kein Ersatz für diesen realen Nachweis,
sondern eine zusätzliche, schnelle Wache gegen ein offensichtliches
Zurückrollen des Fixes).

**Nachtrag (Harness-Regel, Entscheidung Stefan, 23.09.2026):** F-622 wurde
zur verbindlichen Regel — UI-Workstreams liefern ab sofort einen
Render-Nachweis per `npm run render-nachweis` (`scripts/render-nachweis.mjs`,
generisches Werkzeug: URL + Klickfolge-JSON, Screenshots + Markdown-Tabelle),
verankert in der `CLAUDE.md`-Definition of Done. Die obige Tabelle wurde mit
genau diesem Werkzeug reproduziert (`features/F34/nachweis-ws3-ui/
klickfolge.json` — dieselbe Klickfolge, deckungsgleiches Ergebnis). Dabei
zwei reale, in `render-nachweis.mjs` selbst dokumentierte Stolpersteine
gefunden und behoben: `page.reload()` hängt in dieser Umgebung bei
Hash-URLs (`#/chat`) — `page.goto(url)` auf dieselbe URL ist gleichwertig
und hängt nicht; und eine feste, kurze Wartezeit nach einem Klick liest den
Zustand bei einem ERSTEN Moduswechsel (der seinen Verlauf per Fetch
nachlädt, `chat.js` `ladeVerlauf`) real vor Abschluss dieses Fetches —
`page.waitForLoadState('networkidle', …)` mit Fallback auf eine feste
Wartezeit (falls ein Hintergrund-Poll `networkidle` dauerhaft verhindert)
behebt das strukturell.
