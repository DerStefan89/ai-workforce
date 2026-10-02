# F46 — Design-Nachbau nach neuem Seitenaufbau

## ID
F46

## Titel
Design-Nachbau nach neuem Seitenaufbau: Leitstand nach den neuen Designs umgestalten

## Status
Status: IN_ARBEIT

D0 gemergt #308, 51825aa; D0b gemergt #309, 9c4bf58; D1 gemergt #310, add7c94; D2 gemergt #311, ec3b831;
D3 in Arbeit (Branch `feat/f46-d3-detail`, Basis `ec3b831`). D4 bis D6 offen.

Feature-Nummer: F45 ist durch E-F45-1 (`docs/projekt/zielfassung.md` §13.6) für das Fixpaket
„Arbeitsfähigkeit“ vorgesehen; der Design-Nachbau ist deshalb F46 (Finding F-983).

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Der Leitstand wird nach den neuen Designs umgestaltet. Das ist überwiegend Umbau vorhandener
Funktionen (Layout, Navigation, gemeinsame Bausteine), dazu wenige lesende Serverteile. Der neue
Seitenaufbau (Stefan, 02.10.2026) hat Vorrang vor den Einzeldesigns. D1 bis D6 werden je Workstream
in dieser Akte präzisiert (Abschnitt „Stand D<n>“), bevor gebaut wird.

Grundlage: F44 (Design-Schnitt F-725, Vorlage V10) ist abgenommen; F46 baut auf dessen Shell,
Tokens, i18n und Bausteinen („kommt“, Befehlsblock, Kopf-Werkzeuge) auf. Reihenfolge nach
E-M5-18 (geändert 02.10.2026): F46 → Fixpaket „Arbeitsfähigkeit“ (F45) → F30.

## Grundlage
Seitenspezifikation: `docs/design/abgleich-f46.md` (aus der Design-Vorlage übernommen, sieben Stellen nach dem Code-Abgleich D0b berichtigt).
Design-Referenz: `docs/design/neu/` — Referenz ist das Bild (eine `.webp` je Ansicht, 1440 px, dunkel);
exakte Werte (Farben, Abstände, Schriftgrößen, Texte) stehen im Markup unter `docs/design/neu/quelle/`.
Das Markup ist nur Referenz und wird nie ins Produkt kopiert; Platzhalter (`[n]`, `[…]`, `[Text]`,
`{{…}}`) nie ins Produkt (AK3). Ab D1 arbeiten Bauaufträge und design-guardian gegen diese Ablage (D0b).

## Entscheidungen
- **E-F46-1** (Stefan, 02.10.2026) — Das Terminal-Panel neben Jarvis ist nicht Teil von F46. Es ist
  ein eigenes Vorhaben nach dem Fixpaket mit eigener Sicherheitsprüfung. Bis dahin bleibt „Ins
  Terminal“ ein Baustein „kommt“.
- **E-F46-2** (Stefan, 02.10.2026) — Die wirksame Konfiguration (`.claude/settings.json`, Hooks) ist
  im Leitstand nur lesbar. Änderungen erscheinen nur als Vorschlag; wirksam werden sie erst durch den
  Menschen über Git.
- **Rollen-Festlegung** (Stefan, 02.10.2026) — Im Rollen-Kreis stehen Reviewer (Codex,
  Review-Schritt) und code-reviewer (Claude-Subagent am Builder) als zwei getrennte Rollen.

Beide Entscheidungen stehen auch in `docs/projekt/zielfassung.md` §13.6.

## Scope

| WS | Inhalt | Serverteil | Schätzung AT | Ist |
|---|---|---|---|---|
| D0 | Grundlage (Akte, Roadmap mit Gate, Zielfassung, Register, F44-Abschluss, Ebenen-Farbtokens, Live-Chip in der Kopfleiste) | – | 0,3–0,5 | ≈ 0,2 AT (#308) |
| D0b | Design-Referenz und Seitenspezifikation ins Repo | – | 0,1–0,2 | |
| D1 | Produktübersicht, Roadmap (Meilenstein/Feature aus `roadmap.json` v0; Workstreams und Balken „kommt“), Projektakte; Baustein Rollen-Kreis | Leseroute Kontextdateien | 1–1,5 | ≈ 0,2 AT (#310) |
| D2 | Entscheidungen + Entscheiden (Freigabe, Abnahme); Entscheidungsart `abnahme` | Abnahmestand in den Workflow-Kopfdaten | 1–1,5 | ≈ 0,3 AT (#311) |
| D3 | Eintrag im Detail (Feature, Bug; Workstream-Ansicht kommt (Fixpaket B2/B5)); Bausteine Kurz gesagt, Status-Block, Jetzt-Band; Urteil je AK | – (Urteile aus GET …/abnahme) | 0,5–1 | |
| D4 | Reiterzeile Entwicklung, Code, Tech Debt & Prozess, Auftrag anlegen (rechte Spalte) | Leseroute GET /api/projekte/&lt;id&gt;/code | 1,5–2 | |
| D5 | Live-Ansicht (#/live), beendeter Lauf, Aufträge-Liste | Ringpuffer der letzten 50 Werkzeugaufrufe | 1–1,5 | |
| D6 | Workforce: Harness-Aufbau und Library (Rollen & Besetzung und Scout aus F44 WS-7 bleiben) | Leseroute Harness-Dateien (feste Pfadliste) | 1–1,5 | |

Die Spalte „Ist“ trägt der Challenger nach Abschluss eines Workstreams nach.

## Nicht-Ziele
- **Keine neuen Datenformate:** Arbeitspaket als Daten, Schätzfelder, Workstreams als Datenobjekt,
  Projektkarte für alle Rollen und Branch pro Lauf erscheinen als Baustein „kommt“; echt werden sie im
  Fixpaket „Arbeitsfähigkeit“ (F45).
- **Kein Terminal-Panel** (E-F46-1).
- **Keine Konfiguration bearbeiten** (E-F46-2).
- **Keine neuen Schreibwege** außer den bestehenden Entscheidungswegen; „Anpassen“ in der Roadmap
  bleibt „kommt“.
- **Keine Beispieldaten** im Produkt; feste Antworten nur in den Nachweis-Skripten.

## Akzeptanzkriterien
- AK1: Alle neuen Texte stehen als Schlüssel in de/en/tr/ru; das i18n-Gate ist grün.
- AK2: Keine Farbliterale außerhalb der Token-Blöcke (f20-tokens grün); Ebenen-Farben nur über Tokens.
- AK3: Keine Platzhalter aus den Designs ([n], […]) im Produkt.
- AK4: Fehlendes erscheint als Baustein „kommt“ (sichtbar, aria-disabled), nie als erfundener Wert.
- AK5: Jeder Workstream liefert Render-Nachweise der geänderten Seiten (1440 dunkel/hell, 390 dunkel,
  200 %, ru).
- AK6: Invarianten unverändert: CSRF/Origin (F-813), Host-Allowlist (F-814), Server nur 127.0.0.1,
  F-849; Pflichtbegründung, Freigabe-Veto, „Anzeige = Start“; ein Lauf zur Zeit (D13); eine
  Live-Region (Persona); `zustand.js` einziger Poll; `api.js` einzige fetch-Stelle; Modellausgabe
  escaped.
- AK7: `npm run check` ist grün nach jedem Workstream.

## Dependencies
- F44 (Design-Schnitt F-725, abgenommen 02.10.2026): Shell, Tokens, i18n, Bausteine.
- Reihenfolge `docs/projekt/zielfassung.md` §13.6, E-M5-18 (geändert 02.10.2026): nach F44, vor dem
  Fixpaket „Arbeitsfähigkeit“ und F30.

## Security/Permissions
F46 ändert keine Server-Grenze. Die Serverteile von D1, D2, D4, D5 und D6 sind lesend (D1 Leseroute
Kontextdateien, D2 Abnahmestand in den Kopfdaten, D4 Leseroute Code, D5 Ringpuffer im Speicher, D6
Leseroute Harness-Dateien über eine feste Pfadliste). Erhalten bleiben CSRF/Origin (F-813),
Host-Allowlist (F-814), Bindung an 127.0.0.1, F-849, Pflichtbegründung, Freigabe-Veto, „Anzeige =
Start“, D13 und genau eine Live-Region (Persona). Konfiguration bleibt nur lesbar (E-F46-2).

## Stand D0 „Grundlage“ (02.10.2026)
Branch `feat/design-nachbau-d0` (Basis `7c6d852`), nicht committet. Keine Seite umgebaut, keine
Serveränderung, keine neue Abhängigkeit.
- **Akte und Roadmap:** diese Akte; `docs/projekt/roadmap.json` M5 um F42 (nach F41), F44 (nach F43)
  und F46 (nach F44, vor F30) ergänzt (F-953 erledigt).
- **Gate Akte↔Meilenstein** `scripts/check-akte-meilenstein.mjs` (in `npm run check`): jede Akte
  `features/<id>/feature.md` steht in genau einem Meilenstein, jeder Roadmap-Eintrag hat eine Akte;
  Ausnahmen nur über die Liste im Gate-Kopf mit Begründung (AF-F001, F30). Grün- und Rot-Fälle in
  `scripts/check-akte-meilenstein.test.mjs`.
- **Zielfassung** v1.40: E-M5-18 um die neue Reihenfolge ergänzt (alter Wortlaut bleibt), E-F46-1 und
  E-F46-2 in §13.6.
- **F44** auf `ABGESCHLOSSEN` mit Abschlussvermerk.
- **Ebenen-Farbtokens** in `public/leitstand/style.css` (`--ebene-meilenstein`, `-feature`,
  `-workstream`, `-fixpaket`, `-design`, `-bug`, je mit `-blass`), dunkel und hell. Noch kein
  Verbraucher im Produkt; erster Verbraucher ist D1. Kontrast ≥ 3:1 gegen `--panel` in beiden Themes
  prüft `scripts/check-f20-design-tokens.mjs` (Paare additiv ergänzt).
- **Live-Chip** am Persona-Status (`public/leitstand/live-chip.js`, Test `live-chip.test.mjs`): nur aus
  dem vorhandenen Poll (`aktiverLauf`, `laeufe`), kein fetch, kein Timer, kein aria-live, Punkt
  aria-hidden. Lauf aktiv: „Workforce arbeitet · <Eintrag>“ → `#/runs/<laufId>`; kein Lauf: „Gerade läuft
  nichts“ → `#/ausfuehrungen`; aktiverLauf unbekannt: verborgen. Ein laeufe-Eintrag trägt heute keine
  Rolle, der Eintrag ist deshalb der Auftragstitel (ohne Titel die gekürzte laufId). Fehlt der Lauf in
  `laeufe` ganz (Lauf eines anderen Projekts — `aktiverLauf` gilt nach D13 projektübergreifend), steht
  die gekürzte laufId da, der Link zeigt aber auf `#/ausfuehrungen` statt ins Leere (Prüfpass qa 1).
- **Abweichung von der vorgegebenen Staffelung (zur Entscheidung):** Vorgabe war „≥ 1500 px voller Text,
  darunter gekürzt, < 1280 px kompakt oder im Kopf-Menü“, neben dem Persona-Status. Gemessen ist die
  Kopfleiste aus F44 an ihren Staffelstufen schon voll: frei bei 1340 px etwa 3–15 px, bei 1500 px 0–19 px,
  bei 1600 px etwa 100 px, bei 701/720/390 px 0 px. Ein Chip daneben drückte die Projektauswahl auf null
  (erster Nachweislauf). Gebaut ist deshalb:
  - ab 1151 px steht der Chip **unter** der Statuszeile (Raster neben der Persona, Kopfhöhe 84 px
    unverändert) und nimmt nur freien Platz; die Projektauswahl schrumpft dort nicht mehr (vorher war
    ohnehin Platz frei). Der Zustandstext wird nie gekürzt, auf den engsten Stufen (1340, 1500; ru/tr)
    bricht er in eine zweite Zeile um. Der Eintrag ist erst ab 1700 px sichtbar (auf den freien Platz
    gekürzt, bis 240 px), darunter nur im title und für Screenreader;
  - bis 1150 px steht er wie die Kopf-Werkzeuge in Sidebar bzw. mobilem Menü, dort mit Eintrag und
    Umbruch. Bei geschlossenem Menü zeigt der Kopf bis 1150 px keinen Laufzustand (wie die Statuszeile,
    die dort nur für Screenreader da ist; Prüfpass qa 5).
  Die Staffelung der Kopf-Werkzeuge bleibt unverändert. ru „Gerade läuft nichts“ heißt „Ничего не
  выполняется“ (kürzer, passt bei 1340 px in zwei Zeilen).
- **Register** F-972 bis F-983 eingetragen, F-953 erledigt.
- **Nachweise** `features/F46/nachweise/d0/` (Skript `erzeuge-nachweis.mjs`, Port 4199, nur feste
  Antworten, leert nur die eigenen Folge-Ordner per rmSync), 47 WebP: Kopfleiste Lauf aktiv / kein Lauf je
  1440 dunkel, 1440 hell, 390 dunkel (mit Menü), 200 % (mit Sidebar), ru; Staffelung 1920, 1700, 1600,
  1500, 1340, 1200 sowie ru und tr bei 1340 und 1500 in beiden Zuständen; Klicktabelle (Chip → Lauf, Poll
  ohne Lauf → Chip → Ausführungen, Tastatur, Fokus bleibt beim Zustandswechsel); vor dem ersten Poll
  (Abruf scheitert: Chip verborgen, #poll-fehler sichtbar); Escape-Fall; Musterfeld der sechs
  Ebenen-Farben dunkel und hell mit `protokoll.md` der aufgelösten Werte. Kein waagerechter Überlauf,
  Projektauswahl in allen Kopf-Bildern klickbar (bei 390 px mit offenem Menü verdeckt, wie in F44).
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): alle drei
  „freigegeben mit Hinweisen“, nichts blockierend. Eine Korrekturrunde, eingearbeitet: Lauf ohne Eintrag
  verlinkt auf `#/ausfuehrungen` (qa 1); Zustandstext nie gekürzt, Eintrag im Kopf erst ab 1700 px, kein
  verwaister Trenner (dg 2/3, qa 2); Umbruch im Menü und `flex-shrink: 0` in der Sidebar (dg 3);
  Kommentar zum Poll-Fehler berichtigt (cr 1, qa 3); Gate: Testname, Reihenfolge-Prüfung aus dem Gate-Test
  genommen, Ausnahme ohne ID bzw. doppelt ist Befund, einheitliche Sortierung (cr 2–5, qa 6); Schreiben
  nur bei Änderung (cr 6); Kommentar zum doppelten Selektor (cr 7); Nachweise ru/tr 1340/1500, Fokus beim
  Zustandswechsel, vor dem ersten Poll (qa 2/4).

### Prüfpunkte für D1 (aus dem Prüfpass D0)
- Die `-blass`-Flächen (16 %) sind untereinander kaum unterscheidbar (dunkel: meilenstein, fixpaket, bug;
  hell: meilenstein, fixpaket). Eine blasse Fläche nie ohne die volle Ebenenfarbe zeigen (Kante oder
  Marker wie im Musterbalken) oder den Anteil anheben und neu belegen (dg 4).
- Gold (`--ebene-meilenstein`) und Orange (`--ebene-fixpaket`) liegen im hellen Theme dicht beieinander;
  am ersten echten Verbraucher gegenprüfen (dg 5).
- Die `--ebene-*`-Tokens haben noch keinen Verbraucher; D1 nutzt sie (cr 8).

## Stand D1 „Produktübersicht, Roadmap, Projektakte“ (02.10.2026)
Branch `feat/f46-d1-uebersicht-roadmap` (Basis `9c4bf58`), nicht committet. Grundlage
`docs/design/abgleich-f46.md` §4.1–§4.3, Bilder 02, 03, 09-Projektakte. Keine neue Abhängigkeit, kein
neuer Schreibweg; Entscheidungs-, Freigabe- und Laufwege unverändert.
- **Baustein Rollen-Kreis** `public/leitstand/rollen-kreis.js` (Test `rollen-kreis.test.mjs`): sechs
  Rollen und drei Satelliten (code-reviewer, qa, design-guardian), Reviewer und code-reviewer getrennt.
  Abbildung Schritt-Rolle → Kreis-Rolle als Tabelle (`architekt` → Planner, `architecture-advisor` →
  Advisor, `ausfuehrung` → Builder, `code-reviewer` → Reviewer). Status: Schritt LAEUFT → jetzt, alle
  erledigt → fertig, sonst offen; Prüfschritt fertig nur bei Prüfergebnis GRUEN; Abnahme fertig bei
  gültigem ANGENOMMEN, jetzt bei abgeschlossenem Workflow ohne gültige Entscheidung (nur wenn die
  Abnahme-Quelle geladen ist); Satelliten immer offen (keine Quelle). Status nie nur über Farbe
  (✓ / Punkt / Ring, sr-only-Text, title). Register-Muster (role=tab, Pfeile, Pos1, Ende) steuert
  „Rolle im Detail“. `fokus-daten.js` liefert dafür additiv `pruefergebnis` und `abnahmeEntscheidung`
  aus derselben Abnahme-Antwort.
- **Baustein Typ-Chips** `public/leitstand/typ-chip.js` (Test `typ-chip.test.mjs`): sechs Ebenen über
  `--ebene-*` (blasse Fläche nur mit vollem Punkt, Prüfpunkt D0 dg 4), neutrale Form für Harness, Tech
  Debt, Prozess; Text immer sichtbar.
- **Produktübersicht** `views/dashboard.js`: vier Kopfkarten (Produktmanagement + Ziel aus der
  Projektakte, Rollen-Kreis, Rolle im Detail mit Bekommt/Liefert „kommt“ und „In diesem Lauf“ aus der
  Laufakte-Beobachtung, Fortschritt + Braucht dich), Kennzahlen wie F44, „Der Weg von <Feature>“
  (Zeitleiste „kommt“), Kacheln, Arbeitsstand (Status-Kanban aus `entwicklung-daten.js` mit Filter),
  Zuletzt umgesetzt (letztes abgenommenes Feature; Workstream-Ring und „Danach“ „kommt“; darunter die
  letzte Ausführung), Was steckt dahinter („kommt“), Betrieb, erster Schritt. Entfallen und weiter
  erreichbar: Deine nächsten Entscheidungen → Braucht dich/#/attention, Die Workforce gerade →
  Live-Chip, Wer macht was → Rollen-Kreis/Rolle im Detail, Entwicklungsstand → #/roadmap, Vision →
  #/projektakte. Feature in Arbeit: `waehleFeatureInArbeit` (laufender verknüpfter Ablauf, sonst
  IN_ARBEIT); ohne Feature zeigt der Kreis einen laufenden Ablauf ohne Feature (Prüfpass qa 2, damit
  die frühere „Aktuelle Rolle“ nicht verloren geht).
- **Roadmap** `views/roadmap.js`: Register Überblick · Roadmap · Projektakte (`produktplanung-kopf.js`,
  aria-current), Kennzahlen (Plan gegen Ist „kommt“), Baum Meilenstein → Feature (aktueller oben,
  abgeschlossene ausgeblendet mit „Einblenden“, „Alles aufklappen“), Zeitachse/Tage/Wochen/Balken
  „kommt“, Detailpanel mit Ziel aus der Akte, „Frag Jarvis dazu“ über `chat-dock.js`
  `oeffneChatMitEntwurf` (befüllt, sendet nie), „Anpassen“ „kommt“; Entwicklungsstand mit Filter Alle ·
  Features · Bugs · Harness · Tech Debt (`waehleEntwicklungsstand` additiv mit Typ und Typfilter);
  Noch nicht eingeplant bleibt.
- **Projektakte** `#/projektakte` (`views/projektakte.js`, `projektakte-anzeige.js`, Seitenleiste
  markiert Roadmap über `data-nav-auch` in `router.js`): Vision aus GET …/roadmap; Für wen,
  Führungsprinzip, Bewusst nicht (Abschnitt „Nicht das Ziel“) aus `beschreibung.md`, Arbeitsweise aus
  `anweisungen.md`, Lage aus `lagebild.md` (Abschnitt „Aktuelle Phase“); Ziel und Erfolgskriterien
  aus der Zielfassung nur bei eindeutiger Fundstelle, sonst „kommt“; Texte escaped als Klartext-Absätze.
  „Wer diese Akte bekommt“: Jarvis, Router, Product Coach ja; Architekt, Advisor, Builder, Review fehlt
  — ein Test liest `scripts/leitstand-server.mjs` (Aufrufstellen von `baueProjektkontextAnfragen`) und
  vergleicht. Quellen mit VS-Code-Link aus dem absoluten Pfad der Route; „Änderung vorschlagen“ „kommt“.
- **Leseroute** `GET /api/projektakte` (`scripts/leitstand/routen-projektakte.mjs`, Registrierung nach
  GET /api/roadmap, über den Projekt-Dispatcher als `/api/projekte/<id>/projektakte`; Client
  `api.js` `holeProjektakte`): feste Dateinamen im Kontextordner der Instanz, dazu Status von
  `roadmap.json` und `docs/projekt/zielfassung.md`; kein Anfrageteil wird gelesen; 64 KB je Datei mit
  `gekuerzt`; realpath-Prüfung gegen die Repo-Wurzel; Antwort je Datei `{ status: ok | fehlt | fehler,
  pfad, absolut?, text?, gekuerzt?, grund? }` und `versionsziel { status, meilenstein, zielsatz?,
  kriterien? }`. Versionsziel eindeutig = genau eine Zeile `**Zielsatz <Meilenstein>` (Prüfpunkt D1
  aus §7: für M5 eindeutig). Tests `routen-projektakte.test.mjs` (Grünfall, fehlt, zu groß, außerhalb,
  Junction, Ordner, Versionsziel, HTTP ohne wählbaren Pfad).
- **Texte** de/en/tr/ru; nicht mehr genutzte Schlüssel der alten Übersicht entfernt.
- **Gate-/Test-Änderungen:** keine Gate-Datei geändert. `projekt-wechsel.test.mjs` nachgezogen (Block-IDs
  `uebersicht-ziel`/`uebersicht-fokus` entfallen, Aufrufzahlen für Aufträge und Ablauf-Nachträge, weil
  die Übersicht jetzt Aufträge und den Ablauf des Features lädt; Roadmap-Seite lädt Workitems
  ungefiltert) und um den Projektwechsel der Projektakte ergänzt.
- **Nachweise** `features/F46/nachweise/d1/` (Skript `erzeuge-nachweis.mjs`, Port 4199, nur feste
  Antworten, leert nur die eigenen Ordner): Matrix je Seite 1440 dunkel, 1440 hell, 390 dunkel, 200 %,
  ru; Klicktabellen (Rollen-Register per Klick und Tastatur, Filter, Einblenden, Aufklappen, Auswahl,
  „Frag Jarvis“ ohne Senden — ein POST bekäme 409 mit Marke und #chat-fehler erschiene, bleibt aus);
  Zustände (Ablauf ohne Feature, Roadmap-Abruffehler, lange Texte, Projektakte-Lücken, Abruffehler,
  Übersicht ohne Zielsatz, Escape).
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): alle drei
  „freigegeben mit Hinweisen“, nichts blockierend. Eine Korrekturrunde, eingearbeitet: Abnahme ohne
  Quelle bleibt offen (cr 1), Junction-Test (cr 2), Ersatzzeichen nur bei Kürzung (cr 3), Beobachtung
  nicht im Render-Erzeuger, Nachtrag auch bei neuem Workflow-Stand, Fokus auch für Links (cr 4–6),
  aufgeklappte Bereiche der Projektakte bleiben offen (cr 7), Aufträge der Übersicht mit Zeitlimit
  (cr 8); Builder-Zeile in „Wer diese Akte bekommt“ (dg 2), Entwicklungsstand bei 390 px als Karten
  ohne Spalte Priorität (dg 3), „Alle ansehen“ (dg 4), ru/tr „Feature“ übersetzt (dg 5), Worker im
  title (dg 6), Ring unter „Zuletzt umgesetzt“ als Workstreams „kommt“ (dg 7); Zustände des
  Versionsziels (fehlt / nicht lesbar / lädt) statt pauschal „kommt“ (qa 1), Ablauf ohne Feature
  (qa 2), Projektwechsel-Test der Projektakte (qa 3), Nachweis liest nur die sichtbare Ansicht und
  erkennt Senden (qa 4), „Erneut laden“ der Roadmap auf der Übersicht (qa 5), lange Texte begrenzt und
  belegt (qa 6), „Dateien“ in „In diesem Lauf“ (qa 7), Codeblöcke (qa 8), eigener Text für fehlende
  Vision (qa 9), Zuletzt umgesetzt über Meilensteine hinweg (qa 10), Unterzeile „Braucht dich“ (qa 11).
  Offen als Befund: F-988 bis F-990 (cr 9 Zielfassungspfad, Verknüpfung Feature ↔ Ablauf, Reihenfolge
  statt Abnahmedatum).

### Abweichungen von abgleich-f46.md (zur Kenntnis)
- §4.3 „Bewusst nicht“: Quelle ist `beschreibung.md` › „Nicht das Ziel“ (eindeutig, wörtlich, Quelle
  angezeigt), nicht die Zielfassung — dort gibt es für M5 keine eindeutige Nicht-Ziel-Stelle.
- §4.3 „Wer diese Akte bekommt“: zusätzlich Builder „fehlt“ (das Bild zeigt die Zeile mit Platzhalter;
  der Server versorgt den Builder nicht mit den Kontextdateien).
- §4.1 Feature in Arbeit: ohne Feature zeigt der Kreis einen laufenden Ablauf ohne Feature (Regel 7).
- §4.1 Zuletzt umgesetzt: der Ring der Vorlage zeigt Workstreams → „kommt“; zusätzlich die letzte
  Ausführung (Regel 7). Die Betrieb-Zeile bleibt (Regel 7).
- §4.2 Entwicklungsstand ohne Spalte „Verantwortlich“ (keine Quelle), Priorität als „kommt“.
- Leseroute: Kontextordner ist der `kontext_pfad` der Instanz (Default `docs/projekt/kontext`), also
  genau der Ordner, den die Rollen bekommen; die Dateinamen sind fest.

## Stand D2 „Entscheidungen und Entscheiden“ (02.10.2026)
Branch `feat/f46-d2-entscheidungen` (Basis `add7c94`), nicht committet. Grundlage
`docs/design/abgleich-f46.md` (Leitprinzip, §4.4, §4.5), Bilder 09-Main, 09-Entscheiden,
09-Entscheiden-Abnahme. Keine neue Abhängigkeit, kein neuer Schreibweg, kein neuer Endpunkt, kein
zweiter Poll; die POST-Wege (Freigabe, Ablehnen, Stopp, Rückfrage, Sichtung, Reparatur, Abnahme) und
ihre Prüfungen sind unverändert.
- **Abnahmestand im Poll (S):** eine exportierte Regel `ermittleAbnahmeStand` in
  `scripts/leitstand-server.mjs` für GET …/abnahme (`entscheidung.status`) und die Workflow-Kopfdaten
  (neues Feld `abnahme: { offen, status: nicht_vorhanden | ok | veraltet | nicht_faellig }`). Fällig =
  ABGESCHLOSSEN mit gelaufenem Ausführungsschritt (die Vorbedingungen von POST …/abnahme ANGENOMMEN).
  Cache-Stempel der Kopfdaten: Verbund aus `lineage-workflow-<id>` und
  `lineage-entscheidung-workflow-<id>-abnahme` (ein neuer Bau-Lauf ändert die Workflow-Kette). Test
  `scripts/leitstand-abnahme-stand.test.mjs`: nach echtem POST …/abnahme sofort `offen=false`, nach
  neuem Bau-Lauf `offen=true` (veraltet); Rotprobe ohne zweites Stempelglied schlägt fehl. F-972 erledigt.
- **Entscheidungen `#/attention` (09-Main):** Art „abnahme“ (`filtereOffeneAbnahmen`, Gruppe `abnahmen`,
  Hauptknopf „Ergebnis prüfen“), Filter-Chips mit Anzahl (Sichern „kommt“), Karten mit Art-Chip
  (`typ-chip.js` `artChip`, Tokens `--art-*` als Verweise), Eintrag, „seit“ (nur Lauf/Startproblem), Frage,
  Kontext, Hauptknopf (gefüllt nur auf der obersten Karte — Leitprinzip), „Zum Eintrag“ über Auftrag →
  Workitem-Referenz (nur bei offener Seite geladen, Muster F-920); rechts „Wenn du nichts tust“ (kommt)
  und „Geprüfte Quellen“ (Offene Abnahmen echt, Bereit zum Sichern kommt); „Zuletzt entschieden“ kommt.
  Zahl an „Entscheidungen“ (`entscheidungen-zaehler.js`, nur Poll-Quellen, keine Live-Region). Offene
  Abnahmen zählen auch in der Kennzahl der Übersicht, in Jarvis' „Status“ und „was braucht mich“ und im
  „Nächsten Schritt“ des Chats.
- **Entscheiden `#/workflows/<id>` (09-Entscheiden, -Abnahme):** je nach Zustand Freigabe oder Abnahme,
  ohne Umschalter (`views/workflow-entscheiden.js`, `views/entscheidung-panel.js`,
  `views/workflow-abnahme.js`). Kopf mit Art · Eintrag, Frage, Einleitung aus Daten und Statuszeile;
  Seitenleiste markiert „Entscheidungen“, Rückweg „← Deine Entscheidungen“. Freigabe: Schritte mit Rolle,
  fälliger Schritt, Werkzeugsatz, Zeitgrenze, Risiko echt; Kontrolltiefe (F-372), Schätzung, Arbeitspaket
  kommt; Empfehlung zu Fähigkeiten nur lesend. Abnahme: AKs mit Urteil und Beleg, Zusammenfassung,
  Kacheln Prüfung (mit „Prüfung wiederholen“ nach der heutigen Regel) · Review (Codex; Claude-Prüfer
  kommt) · Nachweise, „Selbst ausprobieren“ mit „Produkt öffnen“ (vorschau_url, F43; Code-Reiter kommt
  bis D4), „Nachweise im Einzelnen“ (Empfehlung im Volltext, Befunde, Dateien, Prüfbericht).
  „Deine Entscheidung“ läuft mit (sticky, bei Überhöhe scrollbar; schmal vor den Aufklappbereichen),
  Absenden gesperrt bis Option und Begründung; Freigabe öffnet den bestehenden Dialog (Kennzeichen,
  „Anzeige = Start“, Veto), die Begründung wandert zwischen Spalte und Dialog; Abnahme schickt POST
  …/abnahme wie bisher. Klärung, Reparatur, Architekt-Entscheidung, Sichtung, Stoppen und „Technischer
  Ablauf“ bleiben erreichbar („Der Weg zum Ergebnis“ im Entscheidungsmodus zugeklappt).
- **Bestand bleibt / Leitprinzip (Nachträge Stefan, 02.10.2026):** Leitprinzip und Regel „Bestand
  bleibt“ in `docs/design/abgleich-f46.md`; Gate `scripts/check-f46-bestand.mjs` (in `npm run check`,
  Grün-/Rotfälle `scripts/check-f46-bestand.test.mjs`); design-guardian-Prüfliste um drei Punkte ergänzt.
- **Texte** de/en/tr/ru (Schlüssel `attention.*`, `entscheiden.*`, `vorfilter.abnahmen.*`); nicht mehr
  genutzte Schlüssel und die CSS der alten Attention-Liste entfernt.
- **Gate-/Test-Änderungen:** kein Gate gelockert; f21-ws2 und f15 unverändert grün (IDs bleiben, neue
  Sektion `attention-abschnitt-abnahmen`). Tests nachgezogen: `projekt-wechsel.test.mjs` (Überschrift
  der Freigabe ist die Frage), `workflows-dialog.test.mjs` (Abnahme-Knopf in der Spalte; neu: Spalte →
  Dialog, Nav-Markierung, Begründung zurück in die Spalte), `workflow-abnahme.test.mjs` (Aufbau
  „entscheidbar“), `chat-anzeige.test.mjs` (Statussatz).
- **Nachweise** `features/F46/nachweise/d2/` (Skript `erzeuge-nachweis.mjs`, Port 4199, nur feste
  Antworten, jeder POST auf `/api/workflows/**` bekäme 409 mit Marke; leert nur die eigenen Ordner):
  Matrix je Seite (Entscheidungen, Freigabe, Abnahme) 1440 dunkel/hell, 390, 200 %, ru; reduzierte
  Bewegung; Klicktabellen (Chips, Sichern kommt per Tastatur, Rückweg; Begründung leer → gesperrt,
  Dialog mit Begründung, Stand-Änderung schließt den Dialog mit Hinweis; Abnahme gesperrt/frei, Alle
  Nachweise, Weg aufklappen); Zustände defekt, leer, Escape.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): dg und cr
  „freigegeben mit Hinweisen“, qa „nicht freigegeben“ (vier mittlere Befunde, nichts blockierend). Eine
  Korrekturrunde, eingearbeitet: Nav-Markierung bei jedem Zeichnen und nur auf der Detailroute (cr 1,
  qa 1); Abnahme-Meldung außerhalb des Aufklappbereichs (qa 2); Begründung zwischen Spalte und Dialog
  (qa 3); Empfehlung im Volltext (qa 4); Abnahmen in Übersicht-Kennzahl und Jarvis (cr 2, qa 5 teilweise
  → F-991); Kommentar zur Regel der Ansicht (cr 4, qa 6); Spalte heilt nach verspäteter Antwort (qa 7);
  Empfehlung im Kennzeichen kodiert (qa 8); Zählername mit Komma (qa 9); Spalte scrollbar und schmal
  vor den Aufklappbereichen (qa 10, dg N2); Text zu „Freigeben & installieren“ (qa 11); Fokus auf Chips
  (qa 12); Messung nur sichtbarer Bereiche (qa 13, dg M1); frühere Entscheidung oben (qa 15); Kopf in der
  Hauptspalte, Spalte neben dem Kopf, keine Überdeckung durch den Chat-Knopf (dg M3); Zahl bei schmaler
  Navigation am Symbol (dg N1); „kommt“-Zeile einmal (dg N3); reduzierte Bewegung (dg N4); Abweichungen
  im Abgleich (dg M2); Aufräumen, Pflichtparameter, Logging, Fokussuche, `aria-haspopup`, Kommentare
  (cr 3, 5–10, qa 14). Offen als Befund: F-991 bis F-994.

### Abweichungen von abgleich-f46.md (zur Kenntnis)
Stehen begründet in `docs/design/abgleich-f46.md` unter §4.4 und §4.5 („Umsetzung D2“): Kontrolltiefe
und Katalog-Empfehlung auf Karten „kommt“, ein gefüllter Hauptknopf nur auf der obersten Karte,
Gruppenreihenfolge, Zähler ohne Befunde, Freigabe über den bestehenden Dialog, AK-Zeilen ohne Wortlaut,
Weg im Entscheidungsmodus zugeklappt.

## Stand D3 „Eintrag im Detail: Feature und Bug“ (02.10.2026)
Branch `feat/f46-d3-detail` (Basis `ec3b831`), nicht committet. Grundlage `docs/design/abgleich-f46.md`
(Leitprinzip, §4.6, §4.7, §4.8), Bilder 07-eintrag-detail--Main und --Bug. Keine Serveränderung, keine neue
Abhängigkeit, kein neuer Schreibweg; Click-to-Work („Auftrag vorbereiten“, „Jetzt beheben lassen“,
Freigeben/Ablehnen des Vorschlags) und seine Sperre (F-922) sind im Verhalten unverändert.
- **Bausteine** `public/leitstand/eintrag-bausteine.js` (Test `eintrag-bausteine.test.mjs`), rein rendernd,
  für D4/D5 wiederverwendbar: „Kurz gesagt“ (Zeilen aus Daten, fehlender Wert „kommt“), Status-Block
  (Schlüssel → Wert, Ton der Kopfzeile, fehlender Wert „kommt“), Jetzt-Band (dran: Eyebrow, Titel, Satz,
  höchstens ein Hauptknopf; sonst die ruhige Zeile „Gerade wartet nichts auf dich.“). Dazu `kuerzeText`
  (erster Satz, Abkürzungen beenden keinen Satz, Schnitt an der Wortgrenze mit „…“ — nie umformuliert),
  `findeFundstellenPfad` (genau ein Repo-Pfad, ohne `..`, ohne absolute Pfade) und `befundeAusFeature`
  (Feature-ID als eigenes Wort im Feld „Feature/Run“).
- **Detail** `public/leitstand/views/workboard-detail.js` neu nach den Bildern, `index.html` mit Kopf
  (Typ-Chip · ID · Priorität, Titel, Chips), „Kurz gesagt“, Status-Block, Jetzt-Band, Click-to-Work,
  Inhalt und rechter Spalte; `views/workboard.js` verdrahtet (Register „Das Was“ und Rollen-Kreis per Klick
  und Pfeiltasten, „Frag Jarvis dazu“ über `chat-dock.js`, befüllt nur die Eingabe).
  - Ob eine Abnahme offen ist, kommt jetzt aus dem Kopfdatum `abnahme.offen` (eine Regel mit D2); GET
    …/abnahme lädt das Detail einmal beim Bestimmen des Ablaufs und bei Übergängen, nie aus dem Poll —
    für Urteile je AK, Prüfergebnis und Entscheidung.
  - **Feature:** Kurz gesagt (was = erster Satz des Ziels; gerade/als Nächstes aus Phase, laufendem
    Schritt und `naechster.art`), Status-Block (Status, Phase, Gerade dran, Meilenstein echt; Workstreams,
    Rest, Ist „kommt“), Jetzt-Band (Abnahme → „Ergebnis prüfen →“, Freigabe → „Freigabe prüfen →“,
    Rückfrage → „Rückfrage beantworten →“, je `#/workflows/<id>`), Das Was (Auftrag · Abnahmekriterien mit
    Urteil und Beleg, sonst „noch kein Urteil“ · Nicht-Ziele · Fertig, wenn „kommt“), Fortschritt
    (Rollen-Kreis mit „Rolle im Detail“; Workstreams „kommt“; Schritte im Einzelnen aufklappbar), Code &
    Doku Review (Doku echt: Akte, Zahl offener Befunde; Änderungen bis D4, Prüfungen F-962, Nachweise
    „kommt“), Verlauf (Befunde laut Feld „Entdeckt“; Entscheidungen F-995 und Verbrauch „kommt“), rechte
    Spalte „Deine Planung“ (Meilenstein echt; Schätzung, Speichern, Pull Requests „kommt“; Akte in VS
    Code, Roadmap, Jarvis).
  - **Bug:** Kopf mit „gefunden: <Feature/Run>“ (verwandt, Bereich „kommt“), Kurz gesagt aus Beschreibung,
    Auswirkung, Maßnahme (gekürzt), Status-Block (Priorität, Eingeplant = Maßnahme, Ablauf echt; Auslöser,
    Schätzung, Offen seit „kommt“), Jetzt-Band „Was passiert mit diesem Bug?“ mit „Jetzt beheben lassen“
    (bestehendes Click-to-Work) und „Einplanen …“, „Zurückstellen bis Auslöser“, „Schließen: kein Fehler“
    als „kommt“; „Fix bereit zur Bestätigung“ bei `abnahme.offen` am Bug-Ablauf. Fehlerbild (Nachstellen,
    Erwartet/Tatsächlich, Ursache „kommt“ — F-975; Fundstelle und vorgeschlagene Behebung echt; ganzer
    Registereintrag aufklappbar), Behebung in fünf Schritten aus dem Ablauf (Nachstellen und
    Regressionstest „kommt“; ohne Ablauf jeder Schritt „kommt“), Verlauf „kommt“, rechte Spalte
    „Einordnung“ (Priorität echt; Zuordnung, Schätzung, Speichern „kommt“; Fundstelle in VS Code nur bei
    eindeutigem Pfad, Eintrag im Register mit Zeile).
  - **Harness, Tech Debt, Prozess:** dasselbe Gerüst ohne Triage („Worum es geht“, „Umsetzung“ in vier
    Schritten ohne Nachstellen/Regressionstest), Einstieg „Auftrag vorbereiten“ wie bisher.
  - Entfallen (E): Insights, „Eintrag bearbeiten“ im Kopf (beide waren „kommt“), „Wer macht was“ als
    eigener Block (→ Rollen-Kreis und Schritte im Einzelnen). F-973 und F-974 erledigt.
- **Rollen-Kreis** `rollen-kreis.js`: optionales ID-Präfix (`idPraefix`, Standard `rollen-kreis`), weil
  Übersicht und Detail gleichzeitig im DOM stehen.
- **Texte** de/en/tr/ru (Schlüssel `eintrag.*`).
- **Gate-/Test-Änderungen:** keine Gate-Datei geändert (die IDs aus f21-ws2 (a) bleiben). Tests nachgezogen:
  `projekt-wechsel.test.mjs` (Kopfdaten mit `abnahme`; Eyebrow als Typ-Chip; Statuszeile → Status-Block;
  „Ergebnis prüfen“ im Jetzt-Band statt `#workboard-detail-aktion`; Bug-Einstieg „Jetzt beheben lassen“),
  `workboard-detail.test.mjs` neu, `rollen-kreis.test.mjs` (Präfix), `eintrag-bausteine.test.mjs` neu.
- **Nachweise** `features/F46/nachweise/d3/` (Skript `erzeuge-nachweis.mjs`, Port 4199, nur feste Antworten,
  jeder POST bekäme 409 mit Marke; leert nur die eigenen Ordner): Feature in Arbeit, Abnahme offen, ohne
  Ablauf; Bug offen, Fix bereit; TECH_DEBT; Matrix (1440 hell, 390, 200 %, ru) für Feature mit offener
  Abnahme und Bug offen; Klicktabellen (Reiter per Klick und Pfeiltaste, Rollen-Kreis per Pfeiltaste,
  „Einplanen …“ ohne Wirkung, ganzer Eintrag, „Ergebnis prüfen →“, Rückweg); Escape-Fall.
- **Befund beim Nachweis, im Nachtrag behoben:** Für einen laufenden Schritt meldet der Automat
  `haltKlaerung`; die gemeinsame Regel las das als Rückfrage (F-996, Altbefund aus D2/F44). Nachtrag
  (Entscheidung Challenger): `filtereAttentionWorkflows` zählt `haltKlaerung` bei laufendem Workflow nicht —
  eine Regel für Entscheidungen, Zähler, „Braucht dich“, Persona, Jarvis und das Jetzt-Band. Der Nachweis
  `feature-in-arbeit` ist danach neu erzeugt. F-996 erledigt.
- **Triage (F-997, Entscheidung Challenger):** „Jetzt beheben lassen“ mit den drei „kommt“-Knöpfen, wenn der
  Bug offen ist und kein verknüpfter Ablauf aktiv ist oder auf die Abnahme wartet — nach einem beendeten,
  abgelehnten oder gestoppten Fix also wieder. F-997 erledigt.
- **Nachweise** nach der Korrekturrunde neu erzeugt, dazu „Bug erledigt“ (F-973): 25 WebP.

- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): cr „freigegeben mit
  Hinweisen“, dg und qa „nicht freigegeben“ (je drei mittlere Befunde, nichts blockierend). Eine
  Korrekturrunde, eingearbeitet: Nachweise neu erzeugt (dg 1); „Was als Nächstes“ eines Befunds mit Ablauf
  aus dem Ablauf, erledigt „nichts mehr“ (dg 2, qa 6 teilweise); Fundstelle mit `<code>` statt Backticks
  (dg 4); „gefunden“ ohne „Entdeckt:“ (dg 5); Beschriftung des Status-Blocks wächst mit (ru, dg 6); kein
  doppelter Status im Rollen-Panel (dg 7); Kreismitte zweizeilig (dg 8); „Jetzt beheben lassen“ und Triage nur
  bei offenem Bug ohne aktiven Ablauf (qa 1; qa 6 → F-997, im Nachtrag entschieden); Jetzt-Band „Der Auftrag braucht
  dich“ bei Fehler/Konflikt von Click-to-Work (qa 2); „lädt“/„nicht bestimmbar“ statt „nichts wartet“, Triage
  nur bei freiem Einstieg (qa 3, cr 7); Abnahme-Antwort geprüft, Hinweis „nicht ladbar“, Logging (qa 4, cr 4);
  Worker nur aus dem Ablauf (qa 5); aufgeklappte Abschnitte und Fokus bleiben beim Neuschreiben (qa 8, cr 2);
  Übergang auch bei anderem Halt, Cursor oder Abnahmestand (cr 1, qa 9, Test); 26 tote Schlüssel je Sprache
  entfernt (cr 3); eine Regel für Endstatus und Bug (cr 5); ID-Präfix in Kurz gesagt und Jetzt-Band (cr 6);
  Band nicht doppelt gerendert (cr 8); Fundstelle verlangt einen Ordner (cr 9); Kommentar (cr 10); Tests für
  Harness, Prozess, Abnahme bei Nicht-Bug, langen Titel (qa 7). Nicht übernommen: dg 3 („Eingeplant“ als
  „kommt“) — der Bauauftrag legt „Eingeplant = Maßnahme“ fest; der Abgleich §4.8 nennt das jetzt ausdrücklich,
  das strukturierte Feld bleibt K nach §5. cr 5 teilweise: `rollenStand` (Behebung) und `kreisStatus`
  (Rollen-Kreis) bleiben getrennt — andere Stufen (fehler/wartet). Umbruch der vier Triage-Knöpfe bei 1440 px
  hingenommen (dg 8). Offen als Befund: F-995 (F-996 und F-997 im Nachtrag erledigt).

### Abweichungen von abgleich-f46.md (zur Kenntnis)
Stehen begründet in `docs/design/abgleich-f46.md` unter §4.6 und §4.8 („Umsetzung D3“).
