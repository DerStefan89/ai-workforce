# F46 — Design-Nachbau nach neuem Seitenaufbau

## ID
F46

## Titel
Design-Nachbau nach neuem Seitenaufbau: Leitstand nach den neuen Designs umgestalten

## Status
Status: IN_ARBEIT

D0 gemergt #308, 51825aa; D0b in Arbeit (Branch `feat/design-nachbau-d0b`, Basis `51825aa`). D1 bis D6
offen.

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
| D1 | Produktübersicht, Roadmap (Meilenstein/Feature aus `roadmap.json` v0; Workstreams und Balken „kommt“), Projektakte; Baustein Rollen-Kreis | Leseroute Kontextdateien | 1–1,5 | |
| D2 | Entscheidungen + Entscheiden (Freigabe, Abnahme); Entscheidungsart `abnahme` | Abnahmestand in den Workflow-Kopfdaten | 1–1,5 | |
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
