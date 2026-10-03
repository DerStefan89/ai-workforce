# Abgleich F46 — Design-Nachbau nach `docs/design/neu/`

Stand: 02.10.2026, Challenger (Grundlage: Repo `main` 7c6d852, Designs vom 02.10.2026).
Referenz: `docs/design/neu/*.webp` (19 Ansichten, 1440 px, Desktop dunkel) und
`docs/design/neu/quelle/*.dc.html` (nur lesen: exakte Farben, Abstände, Schriftgrößen, Texte).
Dieses Dokument ist die Arbeitsgrundlage für F46 D1–D6 und die Prüfliste für design-guardian.
Rangfolge bei Widerspruch: Invarianten > dieses Dokument > Bild > Quelle.

## Leitprinzip (Stefan, 02.10.2026)

Bestand bleibt, der Umbau macht ihn verständlicher. Der heutige Look (Tokens, Schrift, Seitenleiste,
Bilder, Persona) bleibt erhalten; die Designs in `docs/design/neu/` bestimmen den Aufbau der Seiten,
nicht einen neuen Stil.

Jede Seite folgt drei Ebenen:
1. Wo bin ich? — Seitentitel, aktive Markierung in der Seitenleiste, Rückweg (Brotkrume/Reiter),
   Status auf einen Blick.
2. Was ist wichtig? — oben das Wesentliche in wenigen Sätzen („Kurz gesagt“ bzw. Kopfkarten); wenn
   Stefan dran ist, genau ein Hauptknopf.
3. Mehr bei Bedarf — Details darunter, aufklappbar oder verlinkt. Nichts Entscheidungsrelevantes steht
   nur in der Tiefe.

Bei Widerspruch zwischen Design-Bild und Leitprinzip gilt das Leitprinzip.

## 0 Regeln und Legende

Status je Element:
- **U** — Umbau: Daten und Funktion gibt es schon, sie bekommen das neue Layout.
- **S** — neuer kleiner Serverteil, nur lesend; der Workstream steht dabei.
- **K** — kommt: sichtbar, deaktiviert (`aria-disabled`, Baustein `kommt.js`), mit Ziel (Fixpaket-Baustein oder Vorhaben).
- **E** — entfällt; die Funktion bleibt an anderer Stelle erreichbar.

Regeln:
1. Platzhalter und Beispielwerte der Designs (`[n]`, `[…]`, `[Text]`, `{{…}}`, „F44 WS-8a“, „73 %“, „263 offen“, Beispieldiffs) nie ins Produkt. Echte Werte, sonst „—“ oder K.
2. Keine neuen Schreibwege. Was in den Designs speichert, anlegt, verschiebt oder bearbeitet, ist K. Ausnahme sind die bestehenden Entscheidungswege (Freigabe, Ablehnen, Stopp, Rückfrage, Sichtung, Reparatur, Abnahme, Click-to-Work, Installation nach F36); sie bleiben fachlich unverändert und bekommen nur das neue Layout.
3. Kein Terminal-Panel (E-F46-1): Terminal-Knopf und „Ins Terminal“ sind K. Konfiguration (`.claude/settings.json`, Hooks) nur lesend (E-F46-2).
4. Knöpfe „Zustand im Design umschalten“ und der Freigabe/Abnahme-Umschalter in 09-Entscheiden sind Bedienelemente der Vorlage, nicht des Produkts (E).
5. Farben nur über Tokens; Ebenenfarben `--ebene-*` aus D0. Hell, 390 px, 200 % und reduzierte Bewegung leiten die Workstreams aus den Tokens ab.
6. Alle neuen Texte als Schlüssel in de/en/tr/ru. Serverwerte, Projektinhalte und Modellausgaben bleiben in Originalsprache und werden escaped (E-F44-2).
7. Kein heutiges Verhalten fällt weg. Kann eine Ansicht heute mehr, als das Design zeigt, bleibt die Funktion erreichbar (z. B. aufklappbar).
8. Sätze, die etwas über den Zustand behaupten („Was gerade passiert“, „Wenn du nichts tust“, „Jarvis empfiehlt“), werden nur aus vorhandenen Daten gebildet, nie frei formuliert. Fehlt die Quelle: K.
9. Invarianten: CSRF/Origin (F-813), Host-Allowlist (F-814), Server nur 127.0.0.1, F-849; Pflichtbegründung, Freigabe-Veto, „Anzeige = Start“; ein Lauf zur Zeit (D13); eine Live-Region (Persona); `zustand.js` einziger Poll; `api.js` einzige fetch-Stelle.

## 1 Globale Elemente

| Element | Soll | Status | Quelle / Hinweis | WS |
|---|---|---|---|---|
| Seitenleiste | oben Produktübersicht, Roadmap, Entwicklung, Entscheidungen, Produktzyklus, Brain; unten Alle Produkte, Nutzung, Einstellungen, Workforce | U | unverändert aus F44 | – |
| Zähler an „Entscheidungen“ | Anzahl offener Entscheidungen | U | `baueEntscheidungen` aus dem Poll; Abnahmen ab D2 | D2 |
| Kopfleiste | Projekt · Live-Chip · Frag Jarvis · VS Code · Terminal · GitHub | U | Maßgeblich sind die Köpfe in 05–09. Die älteren Köpfe in 01–04 („Wartet auf dich“, „In VS Code öffnen“, „Deutsch“) gelten nicht. Persona-Status (einzige Live-Region), „+“ Neues Projekt, Sprache und Theme bleiben. | – |
| Live-Chip | „● Workforce arbeitet · <Eintrag>“ / „Gerade läuft nichts“ | U | D0; Ziel ab D5 `#/live` | D0, D5 |
| VS Code | `vscode://file/<absoluter Pfad>` | U | `kopf-werkzeuge.js`; F-968 (Standardprojekt) mit dem absoluten Pfad aus der Leseroute | D4 |
| GitHub | Repo bzw. Branch/PR des Kontexts | K → S | Remote-URL aus der Leseroute (D4) | D4 |
| Terminal | Panel neben dem Chat | K | E-F46-1 | – |
| Chat-Dock und große Ansicht (05) | Dock, `#/chat` | U | F44 WS-8; Terminal-Spalte K | – |

**Bestand bleibt** (Stefan, 02.10.2026): Die Seitenleiste behält ihren heutigen Aufbau aus F44 (V10):
Wortmarke JARVIS / AI WORKFORCE, Einträge mit Symbolen, ‚Zuletzt geöffnet‘, unterer Bereich mit der
Illustration assets/gear.webp (.side-art) sowie Alle Produkte, Nutzung, Einstellungen, Profil und
Workforce. Das Persona-Bild (persona-gesicht.webp) bleibt in Kopf, Dock und Chat. Die Designs in
docs/design/neu/ zeigen die Seitenleiste vereinfacht; das ist keine Vorgabe zum Entfernen. Neu kommt nur
der Zähler an ‚Entscheidungen‘ hinzu. (Gate `scripts/check-f46-bestand.mjs`, seit D2.)

Gemeinsame Bausteine (jeweils mit dem ersten Verbraucher gebaut, danach wiederverwendet):
- **Rollen-Kreis** (D1): Planner/Codex (Architekt) · Advisor/Claude · Builder/Claude Code · Prüfschritt/kein Modell · Reviewer/Codex · Abnahme/Du; Satelliten am Builder: code-reviewer, qa, design-guardian (je Claude). Reviewer und code-reviewer sind getrennte Rollen. Status je Rolle (fertig/jetzt/offen) aus den Schritten des Workflows zum Feature; ohne Workflow alle „offen“.
- **Typ-Chips** mit Ebenenfarbe (D1): Meilenstein, Feature, Workstream, Fixpaket, Design, Bug.
- **Kurz gesagt**, **Status-Block**, **Jetzt-Band** (D3). Das Jetzt-Band erscheint nur, wenn Stefan dran ist (offene Freigabe, Rückfrage oder Abnahme), mit genau einem Hauptknopf.
- **Befehlsblock**: vorhanden (`befehlsblock.js`); Befehle direkt ausführbar, keine unmarkierten Platzhalter.
- **Planung mit Begründung** (Priorität, Meilenstein, Schätzung): K überall (Fixpaket B5).

## 2 Navigationskarte

| Route | Ansicht (Design) | WS |
|---|---|---|
| `#/dashboard` | Produktübersicht (02) | D1 |
| `#/roadmap` | Roadmap (03); Reiter Überblick (→ `#/dashboard`) · Roadmap · Projektakte | D1 |
| `#/projektakte` (neu) | Projektakte (09-Projektakte); Seitenleiste markiert „Roadmap“ | D1 |
| `#/attention` | Entscheidungen (09-Main) | D2 |
| `#/workflows/<id>` | Entscheiden: Freigabe (09-Entscheiden) und Abnahme (09-Entscheiden-Abnahme) | D2 |
| `#/workboard/<id>` | Eintrag im Detail: Feature (07-Main), Bug (07-Bug); Workstream (07-Workstream) ist K | D3 |
| `#/workboard` | Entwicklung mit Reiterzeile Kanban-Board · Features · Bugs · Harness Improvements · Tech Debt & Prozess · Aufträge · Code | D4 |
| `#/code` (neu) | Entwicklung › Code (06-Main); Seitenleiste markiert „Entwicklung“ | D4 |
| Reiter „Tech Debt & Prozess“ | 06-TechDebt (bisher Reiter „Weitere“) | D4 |
| `#/projekt` | Auftrag anlegen (04) | D4 |
| `#/runs` | Reiter „Aufträge“: Register Aufträge · Ausführungen (`#/ausfuehrungen`), „+ Auftrag anlegen“ | D5 |
| `#/live` (neu) | Live: zeigt den aktiven Lauf oder den Zustand „nichts läuft“ (08) | D5 |
| `#/runs/<laufId>` | Live-Ansicht eines Laufs; beendeter Lauf = dieselbe Seite im Zustand „beendet“ (08) | D5 |
| `#/capabilities` | Workforce: Reiter Harness-Aufbau · Capability Library · Phasen & Rollen (01) | D6 |
| `#/chat` | große Ansicht (05) | vorhanden |
| unverändert | `#/start`, `#/projekte-uebersicht`, `#/nutzung`, `#/einstellungen`, `#/produktzyklus`, `#/brain` | – |

Festlegungen (reversibel): `#/projektakte`, `#/code` und `#/live` als eigene Routen. Der Reiter „Ausführungen“ der Entwicklung entfällt (E); `#/ausfuehrungen` bleibt als Register unter „Aufträge“ erreichbar (F-964).

## 3 Bedienfluss (Hauptweg)

| # | Schritt | Wo | Was Stefan tut | Stand im Nachbau |
|---|---|---|---|---|
| 1 | Projekt wählen | Kopfleiste | Projekt wählen oder „+“ | U |
| 2 | Idee durchdenken | Chat, Register Product Coach (auch von `#/projekt`) | Gespräch, dann „Als Auftrag anlegen“ → Feature-Akte ENTWURF | U |
| 3 | Auftrag anlegen | `#/projekt` | Titel, gewünschtes Ergebnis, Kontext; rechts prüfen, ob alles bereit ist; „Ablauf vorbereiten“ | U, rechte Spalte S (D4) |
| 4 | Freigeben | `#/attention` → `#/workflows/<id>` | prüfen, was startet; Freigeben / Freigeben & installieren / Ablehnen mit Begründung | U |
| 5 | Zuschauen | Live-Chip → `#/live` | Aktivität und berührte Dateien verfolgen; bei Bedarf abbrechen (Begründung) | U, Aktivität S (D5) |
| 6 | Abnehmen | `#/attention` → `#/workflows/<id>` | AKs mit Urteil und Beleg prüfen, selbst ausprobieren; Annehmen / Anpassung anfordern / Ablehnen mit Begründung | U, Listeneintrag S (D2) |
| 7 | Sichern | `#/code` | Arbeitsstand und Diff ansehen, Befehlsblock kopieren; Commit, Push, PR und Merge macht Stefan | U, Daten S (D4); „Sichern & mergen“ als Entscheidung K |

Überblick daneben: Produktübersicht, Roadmap, Projektakte, Entwicklung, Workforce, Nutzung.

## 4 Seiten

### 4.1 Produktübersicht — `#/dashboard` (02-produktuebersicht--Main) · D1
Zweck: auf einen Blick, wohin das Produkt will, wer gerade arbeitet, wo es steht und was Stefan braucht.
Hauptaufgabe: Lage erfassen und dorthin springen, wo er gebraucht wird.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Kopf: Produktname, aktueller Meilenstein | U | Projektregister, `roadmap.json` |
| Knöpfe „Produkt bearbeiten“, „+ Eintrag erfassen“ | K | Fixpaket B5 (E-F45-1) |
| Knopf „Architektur & Code“ | U | → `#/code` (bis D4: K) |
| Karte Produktmanagement · Ziel dieser Version | U / K | Ziel aus der Projektakten-Quelle (D1); fehlt es: K. Link „Zielgruppe & Erfolgskriterien“ → `#/projektakte` |
| Karte Wer arbeitet gerade: Feature in Arbeit + Rollen-Kreis | U | Feature mit laufendem Workflow, sonst erstes Feature IN_ARBEIT |
| Karte Rolle im Detail: Name, Worker, Bekommt/Liefert, „In diesem Lauf“ | U / K | Bekommt/Liefert K (`src/rollen/types.ts` hat dafür keine Felder; Fixpaket B2); „In diesem Lauf“ aus der Laufakte-Beobachtung des letzten Laufs der Rolle (Dateien, Skills, Agents), sonst „—“ |
| Karte Fortschritt (Ring x/y abgenommen) und Braucht dich (Anzahl → `#/attention`) | U | `fortschritt-ring.js`, `baueEntscheidungen` |
| Vier Kennzahlen: In Arbeit, Deine Entscheidung, Abgenommen, Geplant | U | wie heute (F44 WS-2b) |
| „Der Weg von <Feature>“: Workstream-Zeitleiste | K | Workstreams als Daten und Schätzfelder (Fixpaket B2/B5); Kopf mit Feature-Name U |
| Kacheln Features, Bugs, Harness Improvements mit Anzahl | U | Workitems → Listen der Entwicklung |
| Arbeitsstand mit Filter Alles · Geplant · In Arbeit · Braucht dich · Abgenommen | U | `fokus-daten.js` |
| Zuletzt umgesetzt (Titel, Satz, Ring, „Danach“) | U / K | letztes abgenommenes Feature aus Akte/Roadmap; „Danach“ nur aus `lagebild.md`, sonst K |
| „Was steckt dahinter?“: Code & Änderungen | U | → `#/code` (ab D4) |
| „Architektur & Daten“, „Health & Nachweise“ | K | später |

Entfällt (E): „Deine nächsten Entscheidungen“ (→ Braucht dich, `#/attention`), „Die Workforce gerade“ (→ Live-Chip), „Wer macht was“ (→ Rollen-Kreis), Entwicklungsstand-Liste (→ Roadmap).

### 4.2 Roadmap — `#/roadmap` (03-roadmap--Main) · D1
Zweck: Reihenfolge und Stand aller Meilensteine und Features.
Hauptaufgabe: sehen, was als Nächstes kommt und wo Schätzungen fehlen; Jarvis dazu fragen.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Kopf, Reiter Überblick · Roadmap · Projektakte | U | |
| „Jarvis zur Roadmap fragen“ | U | öffnet den Chat mit vorbefüllter Eingabe, sendet nicht selbst |
| „+ Eintrag erfassen“ | K | Fixpaket B5 |
| Kennzahl Meilensteine x/y, Features abgenommen x/y | U | `roadmap.json` + Akten-Status |
| Kennzahl „Bis M5 fertig“ | U | zeigt „noch nicht berechenbar“ und die Zahl der Einträge ohne Schätzung, solange Schätzfelder fehlen |
| Kennzahl „Plan gegen Ist“ | K | Fixpaket B5 |
| Gantt: Zeilen Meilenstein → Feature, laufender Meilenstein oben, abgeschlossene ausgeblendet mit „Einblenden“, „Alles aufklappen“ | U | `roadmap.json` v0 |
| Workstream-Zeilen, Balken, Zeitachse in AT, Ist-Zone, „Tage/Wochen“, Marker „Schätzung fehlt“ | K | Schema v1, Schätzfelder (Fixpaket B2/B5); keine erfundenen Balken |
| Zeilen Fixpaket, Design-Paket, „Pflege & Fixes“ | K | nicht in `roadmap.json` |
| Detailpanel: Typ, Name, Status, Teil von, Inhalt | U | Roadmap-Eintrag und Akte |
| „Frag Jarvis dazu“ (Warum diese Reihenfolge? Was blockiert das? Schätzung prüfen) | U | befüllt nur die Chat-Eingabe |
| „Anpassen“ (Priorität, Meilenstein, Schätzung, Begründung, Speichern), Balken ziehen | K | Fixpaket B5 |
| Entwicklungsstand mit Filter Alle · Features · Bugs · Harness · Tech Debt | U | Workitems (zieht aus der Produktübersicht hierher) |

### 4.3 Projektakte — `#/projektakte` (09-entscheidungen--Projektakte) · D1
Zweck: was jede Rolle über dieses Projekt wissen muss, an einer Stelle.
Hauptaufgabe: Ziel, Grenzen und Lage lesen und prüfen, ob sie stimmen.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Vision | U | `roadmap.json` · vision |
| Für wen, Führungsprinzip, Arbeitsweise | S | Text aus `docs/projekt/kontext/beschreibung.md` bzw. `anweisungen.md`; nichts frei formulieren |
| Ziel dieser Version, Erfolgskriterien, Bewusst nicht | S / K | aus `docs/projekt/zielfassung.md`, wenn eindeutig auffindbar, sonst K |
| Lage | S | `docs/projekt/kontext/lagebild.md` (erzeugt) |
| Wer diese Akte bekommt | U | Jarvis, Router und Product Coach bekommen sie; Architekt, Advisor und Review heute nicht (F-936, Fixpaket B2). Muss dem Code entsprechen (`scripts/leitstand-server.mjs`, Projektkontext-Anfragen). |
| Quellen mit Pfaden | U | Links „In VS Code öffnen“ |
| „Änderung vorschlagen“ | K | |
| „Harness in der Werkstatt ansehen“ | U | → `#/capabilities` |

Serverteil D1: Eine lesende Route für `beschreibung.md`, `anweisungen.md` und `lagebild.md` (Ordner `docs/projekt/kontext/`) des aktiven Projekts, dazu das Versionsziel aus `docs/projekt/zielfassung.md`, wenn eindeutig auffindbar. Vision und Roadmap kommen aus dem bestehenden `GET /api/roadmap`. Feste Pfadliste, Größengrenze, Fehler als Feldstatus.

### 4.4 Entscheidungen — `#/attention` (09-entscheidungen--Main) · D2
Zweck: alles, was auf Stefan wartet, nach Dringlichkeit.
Hauptaufgabe: die nächste Entscheidung finden und öffnen.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Filter-Chips Alle · Freigaben · Abnahmen · Sichern · Rückfragen · Fehler mit Anzahl | U | Chip „Sichern“ K |
| Karte: Art-Chip, Eintrag, seit wann, Frage, Kontext, Hauptknopf, „Zum Eintrag“ | U | `baueEntscheidungen` |
| „blockiert: …“ und „Jarvis empfiehlt“ auf der Karte | K | keine Quelle; Ausnahme: Katalog-Empfehlung bei Freigaben (U) |
| Arten Freigabe, Rückfrage, Lauf-Fehler, Startproblem, Befund P0/P1 | U | wie heute |
| Art Abnahme | S | Abnahmestand in den Workflow-Kopfdaten; Cache-Stempel beachten (Kopfdaten hängen heute nur an der Workflow-Kette) |
| Art „Sichern & mergen“ | K | kein Zustand (Fixpaket) |
| „Wenn du nichts tust“ | K | keine Quelle |
| Geprüfte Quellen mit Zahl, Defekt-Hinweis statt Entwarnung | U | wie heute; „Offene Abnahmen“ S, „Bereit zum Sichern“ K |
| Zuletzt entschieden | K | keine Leseroute über Entscheidungsartefakte |

Umsetzung D2 (Abweichungen, begründet):
- Katalog-Empfehlung auf Freigabe-Karten: K — sie steht nur im Workflow-Detail, nicht in den Kopfdaten (kein zweiter Abruf je Karte). „blockiert“ und „Jarvis empfiehlt“ stehen einmal über der Liste als „kommt“, nicht auf jeder Karte.
- Gefüllter Hauptknopf nur auf der obersten Karte im aktiven Filter (Leitprinzip: genau ein Hauptknopf); die übrigen Karten tragen einen einfachen Knopf.
- Reihenfolge der Gruppen: Freigaben, Rückfragen, Abnahmen, Fehler, Startprobleme, Befunde — Freigaben und Rückfragen teilen sich die feste Sektion `attention-abschnitt-workflows` (Gate f21-ws2).
- Zahl an „Entscheidungen“: nur Quellen aus dem Poll (ohne Befunde P0/P1, die ein eigener Abruf sind).
- „Zum Eintrag“ nur, wenn der Auftrag eine Workitem-Referenz trägt; Startprobleme ohne Knopf (keine Detailroute).

### 4.5 Entscheiden — `#/workflows/<id>` (09-entscheidungen--Entscheiden, --Entscheiden-Abnahme) · D2
Zweck: eine Entscheidung mit allem, was sie braucht, auf einer Seite.
Hauptaufgabe: prüfen und mit Begründung entscheiden.

Freigabe:

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Kopf (Art · Eintrag, Frage, Einleitung) | U | Workflow |
| „Was startet, wenn du freigibst“: Schritte mit Rolle | U | Workflow-Schritte, `rollen-anzeige.js` |
| Kontrolltiefe, Werkzeugsatz, Zeitgrenze | U | Workflow / Startvorlage |
| Schätzung | K | Fixpaket B5 |
| Arbeitspaket (Umfang, Nicht hier, Risiko, Fertig wenn) | K | Fixpaket B2 |
| Empfehlung zu Fähigkeiten (installiert / vorgeschlagen) | U | F36 |
| Deine Entscheidung: Freigeben · Freigeben & installieren · Ablehnen, Begründung Pflicht | U | bestehende Wege (F44 WS-4a); Veto und „Anzeige = Start“ bleiben |

Abnahme:

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Abnahmekriterien mit Urteil und Beleg, Zusammenfassung „x erfüllt · y nicht erfüllt“ | U | `ak_urteile` aus `GET …/abnahme` |
| Prüfung mit Ergebnis, „Prüfung wiederholen“ | U | bestehend |
| Review-Urteil (Codex) | U | bestehend |
| Urteile je Claude-Prüfer (code-reviewer, qa, design-guardian) | K | keine Quelle; die Laufakte zeigt nur den Aufruf |
| Nachweise (Prüfbericht) | U | bestehend; Kacheln Desktop/Mobil/Hell nur, wenn Dateien vorliegen |
| Selbst ausprobieren: „Produkt öffnen“ | U | F43 `vorschau_url` |
| „Änderungen im Code-Reiter“ | U | → `#/code` (ab D4) |
| Deine Entscheidung: Annehmen · Anpassung anfordern · Ablehnen, Begründung Pflicht | U | bestehend (F44 WS-4b) |

Rechte Spalte mit der Entscheidung läuft beim Scrollen mit. Die heutigen Bereiche Klärung, Reparatur, Architekt-Entscheidung und „Technischer Ablauf“ bleiben erreichbar.

Umsetzung D2 (Abweichungen, begründet):
- Kontrolltiefe: K statt U — sie steht nur im Router-Artefakt, das keinen Lesepfad hat (F-372); Werkzeugsatz, Zeitgrenze und Risiko kommen echt aus dem fälligen Schritt.
- Freigabe: „<Option> bestätigen“ öffnet den bestehenden Freigabedialog als Bestätigung (Kennzeichen beim Öffnen, „Anzeige = Start“, Ablehnen als Veto im selben Dialog) — ein Klick mehr als im Bild, die Invariante geht vor. Die Begründung wandert zwischen Spalte und Dialog. „Freigeben & installieren“ führt zu den Installationsknöpfen des Dialogs (kein neuer Schreibweg) und ist ohne installierbaren Vorschlag gesperrt.
- Abnahmekriterien zeigen Kennung, Beleg und Urteil — das Review liefert den Wortlaut eines AK nicht; der Link „Beleg“ entfällt (der Beleg steht in der Zeile). Die Review-Empfehlung steht in der Kachel gekürzt, im Volltext unter „Nachweise im Einzelnen“.
- „Jarvis empfiehlt“ in der Spalte: K (keine Quelle). Kacheln Desktop/Mobil/Hell entfallen, solange keine Nachweisdateien vorliegen.
- Im Entscheidungsmodus ist „Der Weg zum Ergebnis“ (Timeline, Auf einen Blick, Aktionen mit Stoppen) zugeklappt; der Status steht als Zeile im Kopf. Die Seitenleiste markiert „Entscheidungen“, der Rückweg heißt „← Deine Entscheidungen“.


### 4.6 Eintrag im Detail: Feature — `#/workboard/<id>` (07-eintrag-detail--Main) · D3
Zweck: alles zu einem Feature: was es ist, wo es steht, was Stefan tun muss.
Hauptaufgabe: Stand erfassen; wenn er dran ist, über das Jetzt-Band entscheiden.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Kopf: Typ · ID, Titel, „← Features“ | U | Akte |
| Kurz gesagt: was, gerade, als Nächstes | U | „was“ aus dem Ziel der Akte; „gerade“ und „als Nächstes“ aus Workflow-Status und `naechster.art` |
| Status-Block: Status, Meilenstein | U | Akte, `roadmap.json` |
| Status-Block: Workstreams x/y, Rest, Ist | K | Fixpaket B2/B5 |
| Jetzt-Band: Freigabe oder Abnahme offen → „Ergebnis prüfen →“ | U | → `#/workflows/<id>`; sonst der Satz „Gerade wartet nichts auf dich.“ |
| Das Was: Reiter Auftrag · Abnahmekriterien · Nicht-Ziele | U | Akte |
| Urteil je AK | U | aus der Abnahme des verknüpften Workflows, sonst „noch kein Urteil“ |
| Reiter „Fertig, wenn“ (DoD) | K | Fixpaket B2 |
| Fortschritt: Rollen-Kreis | U | |
| Workstream-Tabelle | K | Fixpaket B2/B5 |
| Code & Doku Review: Änderungen | U | Leseroute D4 (bis dahin K) |
| Code & Doku Review: Prüfungen | K | F-962 |
| Code & Doku Review: Doku (Akte, Register-Zähler) | U | |
| Code & Doku Review: Nachweise | K | keine Leseroute für Nachweisordner |
| Verlauf: Entscheidungen (E-…) | U | Akte |
| Verlauf: Befunde aus diesem Feature | U | Register, nur wenn die Zuordnung maschinenlesbar ist, sonst K |
| Verlauf: Verbrauch | K | Nutzung kennt heute Rolle und Worker, nicht Feature |
| Deine Planung (Priorität, Meilenstein, Schätzung, Speichern) | K | Fixpaket B5 |
| Links: Akte in VS Code, Roadmap | U | |
| Pull Requests auf GitHub | K → U | ab D4 (Remote-URL) |

Entfällt (E): „Insights“, „Offene Frage“, Phasen-Kreis des Produktzyklus (→ Rollen-Kreis).

Umsetzung D3 (Abweichungen, begründet):
- Verlauf · Entscheidungen: K statt U — die Leseroute der Akte (GET …/features/<id>/akte) liefert den
  Abschnitt nicht, D3 ändert den Server nicht (F-995).
- Verlauf · Befunde aus diesem Feature: Treffer der Feature-ID als eigenes Wort im Feld „Feature/Run“,
  gekennzeichnet „laut Feld ‚Entdeckt‘“; ohne Treffer K (keine Zuordnung behauptet).
- Status-Block: „Phase“ und „Gerade dran“ wie im Bild aus dem Ablauf; der Fortschrittsbalken entfällt mit den
  Workstreams (K). Kopfzeile „Abnahme offen“ aus dem Kopfdatum `abnahme.offen` (eine Regel mit D2).
- Jetzt-Band: auch bei Freigabe („Freigabe prüfen →“) und Rückfrage („Rückfrage beantworten →“), je zum
  Ablauf; wartet der Vorschlag aus Click-to-Work auf Freigeben/Ablehnen, steht der Hauptknopf im
  Click-to-Work-Bereich, der optisch an das Band anschließt (eigener Container, damit sein Zustand einen
  Poll überlebt). Ein laufender Ablauf ist keine Rückfrage: die gemeinsame Regel zählt `haltKlaerung` bei
  laufendem Workflow nicht (F-996, gilt für alle Verbraucher der Regel).
- „Deine Planung“ ohne deaktivierte Eingabefelder: Werte nur lesend, „Planung speichern“ als „kommt“
  (keine Felder, die nach Eingabe aussehen). Zusätzlich „Frag Jarvis dazu“ (befüllt nur die Eingabe).
- Rückweg nennt wie bisher das zuletzt aktive Register der Entwicklung (Board oder Liste), nicht fest
  „Features“ — sonst führte „←“ an einen anderen Ort als den, von dem Stefan kam.
- Die Schritte des Ablaufs (bisher „Wer macht was“ und „Stand der Entwicklung“) bleiben unter dem
  Rollen-Kreis aufklappbar (Regel 7); „Eintrag bearbeiten“ im Kopf entfällt mit „Insights“ (beide waren K).

### 4.7 Eintrag im Detail: Workstream (07-eintrag-detail--Workstream) · K
Die ganze Ansicht ist K (Fixpaket B2/B5). Workstreams sind heute kein Datenobjekt; die Seite bestünde sonst aus Beispieldaten. Was sie zeigen würde, liegt im Nachbau an anderer Stelle: Sichern-Block → `#/code` (D4), Bericht des Builders und Aktivität → Live/Lauf (D5), Review-Urteile → Entscheiden (D2).

### 4.8 Eintrag im Detail: Bug — `#/workboard/<id>` (07-eintrag-detail--Bug) · D3
Zweck: ein Fehler, wie schlimm er ist und was mit ihm passiert.
Hauptaufgabe: entscheiden, ob er jetzt behoben wird; später den Fix bestätigen.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Kopf: BUG · ID · Priorität, Titel | U | Register |
| gefunden bei, offen seit | U / K | nur aus maschinenlesbaren Register-Feldern |
| verwandt, Bereich, Auslöser, Schätzung | K | Fixpaket B5 |
| Kurz gesagt: was passiert, wie schlimm, was als Nächstes | U | aus Beschreibung, Auswirkung und Maßnahme des Registers, nicht frei formuliert |
| Jetzt-Band „Jetzt beheben lassen“ | U | bestehendes Click-to-Work |
| „Einplanen …“, „Zurückstellen bis Auslöser“, „Schließen: kein Fehler“ | K | Fixpaket B5 |
| Zustand „Fix bereit zur Bestätigung“ | U | wenn zum Bug eine offene Abnahme existiert (D2-Daten) |
| Fehlerbild: Fundstelle, vorgeschlagene Behebung | U | Register |
| Fehlerbild: Nachstellen, Erwartet/Tatsächlich, Ursache | K | strukturierte Bug-Felder (Fixpaket B5) |
| Behebung in fünf Schritten | U / K | aus dem verknüpften Workflow, wenn vorhanden; Regressionstest K |
| Verlauf des Befunds | K | Register ohne strukturierte Historie |
| Einordnung (Priorität, Zuordnung, Schätzung, Speichern) | K | Fixpaket B5 |
| Links: Fundstelle in VS Code, Eintrag im Register | U | VS-Code-Link nur bei eindeutigem Pfad |

Umsetzung D3 (Abweichungen, begründet):
- Jetzt-Band „Was passiert mit diesem Bug?“: „Jarvis empfiehlt“ ist K (keine Quelle); der Hauptknopf
  „Jetzt beheben lassen“ ist der Einstieg von Click-to-Work und steht mit den drei K-Knöpfen im
  angeschlossenen Click-to-Work-Bereich (eigener Container, Verhalten unverändert). Triage nur bei einem
  offenen Bug, für den kein verknüpfter Ablauf aktiv ist oder auf die Abnahme wartet, und nur bei freiem
  Einstieg — nach einem beendeten, abgelehnten oder gestoppten Fix-Ablauf erscheint sie also wieder
  (Entscheidung Challenger 02.10.2026, F-997). „Jetzt beheben lassen“ und
  die Triage-Knöpfe nur bei einem offenen Bug; ein erledigter heißt wie bisher „Auftrag vorbereiten“.
- Jetzt-Band, wenn Click-to-Work Stefan braucht (Fehler oder Konflikt mit „Wiederholen“): „Der Auftrag braucht
  dich“, an den Bereich angeschlossen. Solange die Verknüpfung lädt oder nicht bestimmbar ist, steht nur
  „lädt“ bzw. „nicht bestimmbar“ — kein „Gerade wartet nichts auf dich“.
- Status-Block: zusätzlich „Ablauf“ (Phase des verknüpften Ablaufs) — Status auf einen Blick, wenn schon
  ein Fix läuft. „Eingeplant“ zeigt nach Bauauftrag D3 die Maßnahme des Registers, gekürzt; das
  strukturierte Feld (eingeplant ja/nein, Zuordnung) bleibt K nach §5 (Fixpaket B5). „verwandt“ und
  „Bereich“ stehen als Chips mit „kommt“; „gefunden“ ohne das Wort „Entdeckt:“ des Registers.
- Kurz gesagt › „Was als Nächstes“: die Maßnahme nur ohne Ablauf; mit Ablauf dieselbe Regel wie beim
  Feature (kein Widerspruch zum Jetzt-Band), bei einem erledigten Befund „nichts mehr“.
- Behebung: Stand je Schritt aus dem Ablauf — Beheben (Ausführungsschritt), Prüfen (Prüfergebnis aus GET
  …/abnahme), Review (Review-Schritt), Bestätigen (Abnahme offen → wartet, angenommen → erledigt);
  Nachstellen und Regressionstest immer K (F-975); ohne Ablauf jeder Schritt K. Kachel „Änderungen“ K bis D4.
- Fehlerbild: darunter aufklappbar der ganze Registereintrag (Beschreibung und alle Felder ungekürzt) —
  „Kurz gesagt“ kürzt, nichts Entscheidungsrelevantes steht nur gekürzt.
- Harness, Tech Debt, Prozess: Gerüst ohne Triage, „Worum es geht“ statt „Fehlerbild“, „Umsetzung“ in vier
  Schritten ohne Nachstellen und Regressionstest; Einstieg „Auftrag vorbereiten“ wie bisher.
- „Einordnung“ ohne Eingabefelder (wie „Deine Planung“): Priorität lesend, Zuordnung, Schätzung und
  „Speichern“ K; zusätzlich „Frag Jarvis dazu“.

### 4.9 Live-Ansicht — `#/live`, `#/runs/<laufId>` (08-live--Main, --Main-nichts-laeuft) · D5
Zweck: sehen, was die Workforce gerade tut, und eingreifen können.
Hauptaufgabe: zuschauen; bei Bedarf mit Begründung abbrechen.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Kopf: Titel (Auftrag/Ziel), Rolle · Worker, Modell laut Startvorlage, Werkzeugsatz | U | Lauf-Detail |
| „Zum Workstream“ | E | stattdessen „Zum Eintrag“ (U) |
| Gerade: letzter Werkzeugaufruf | U | `laufAktivFortschritt` |
| Läuft seit, Zeitgrenze und Rest | U | |
| Schätzung WS | K | Fixpaket B5 |
| Anzahl Aufrufe | S | Zähler zum Ringpuffer |
| Abbrechen … (Begründung), Laufakte | U | bestehend (F44 WS-5a) |
| Ablaufleiste Plan → Freigabe → Bau → Prüfschritt → Review | U | Workflow-Schritte; „Sichern“ und „Merge“ K |
| Aktivität: letzte 50 Aufrufe, neueste oben, Filter Alle · Ändert · Befehle · Fähigkeiten · Warnungen | S | Ringpuffer (nur Speicher, laufId-Prüfung, mit D13 zurückgesetzt); Werkzeug → Verb über i18n |
| „Mehr dazu“: Werkzeug, Ziel, Zeit | U | aus dem Aufruf |
| „Mehr dazu“: Erklärung, Änderungsausschnitt, „Im Umfang?“ | K | keine Quelle bzw. Arbeitspaket (B2) |
| „Frag Jarvis dazu“ | U | befüllt nur die Chat-Eingabe; Jarvis greift nicht in den Lauf ein |
| Berührte Dateien | S | aus den Zielen schreibender Werkzeuge im Ringpuffer; „außerhalb des Umfangs“ K |
| Bremsen & Warnungen (abgelehnte Werkzeuge, Guard-Treffer) | K | das Gateway liefert sie heute nicht |
| Fähigkeiten vorgesehen/genutzt | K | Fixpaket B1 (vorgesehen gegen genutzt; verwandt F-937); nach dem Lauf „genutzt“ aus der Laufakte-Beobachtung (U) |
| Output bisher (je abgeschlossenem Schritt) | U | Ergebnisse der Workflow-Schritte |
| Was der Builder bekommen hat: Arbeitspaket | K | Fixpaket B2 |
| Was der Builder bekommen hat: Kontextpaket | U / K | nur wenn Laufakte oder Context Builder die Liste liefern |
| Zustand „nichts läuft“: Zuletzt (letzter Lauf mit Ergebnis, Dauer) und Als Nächstes (nächster Schritt) | U | Läufe und Workflows aus dem Poll; Bericht im Format geändert/geprüft/erfolgreich/Blocker K (B2) |
| Beendeter Lauf | U | dieselbe Seite im Zustand „beendet“; alles aus dem heutigen Lauf-Detail bleibt erreichbar (Timeline, Aufklappbereiche, G6–G9, F7) |

### 4.10 Aufträge — `#/runs` · D5
Reiter „Aufträge“ der Entwicklung: Register Aufträge · Ausführungen (`#/ausfuehrungen`) und „+ Auftrag anlegen“ (→ `#/projekt`). U. Löst F-964.

Umsetzung D5 (Abweichungen zu §4.9/§4.10, begründet):
- „Abbrechen … (Begründung)“: Der Lauf-Abbruch speichert heute keinen Grund. Läuft der Lauf in einem
  Workflow-Schritt, öffnet „Abbrechen …“ den bestehenden Stopp des Ablaufs mit Pflichtbegründung („Stoppen“
  gesperrt, solange leer), der den Lauf abbricht; ein Einzellauf behält den bestehenden Abbruch ohne Grund
  (keine Änderung an der Abbruch-Logik, F-1003). Der Knopf steht im Status-Block, nicht zusätzlich in der Notiz.
- Aktivität und Berührte Dateien gibt es nur während des Laufs (Ringpuffer nur im Speicher, mit dem Laufende
  gelöscht). Der beendete Lauf zeigt dort einen Hinweis bzw. den Verweis auf den Code-Reiter; „Mehr dazu“
  entfällt nach dem Lauf; „Aufrufe“ heißt dann „nur während des Laufs gezählt“.
- Werkzeugziele sind die Pfade, wie Claude Code sie meldet (meist absolut); sie werden nicht auf den
  Repo-Pfad gekürzt. „In VS Code öffnen“ nur bei absolutem Pfad; „Ganze Änderung“ ist „Änderungen im
  Code-Reiter“ (#/code zeigt den Arbeitsbaum, nicht den Lauf).
- Kopf: „Modell“ zeigt das Modell des Workflow-Schritts; ohne Schritt „Modell laut Startvorlage“.
  „Zum Eintrag“ nur, wenn der Auftrag eine workitem_referenz trägt.
- Ablaufleiste: „Plan“ fasst Architekt und Advisor zusammen, „Freigabe“ ist die Freigabe des Bau-Schritts
  (AUTOMATISCH → „entfällt“), „Prüfschritt“ kommt aus dem Prüfergebnis; ohne Workflow ein Hinweis statt
  Stufen. Output je Schritt: Status, Rolle · Worker und Link auf den Lauf (Ergebnistexte der Schritte gibt
  es nicht als Feld).
- Zuletzt: Ergebnis und Dauer echt; „Geändert/Geprüft/Erfolgreich/Blocker“ als ein Feld „Bericht“ „kommt“
  (B2). Als Nächstes: nächste offene Entscheidung (Reihenfolge wie #/attention), sonst startbereiter
  Schritt mit dem Automaten-Grund, sonst „Auftrag anlegen“ — kein „danach/dann“ (keine Quelle).
- „Frag Jarvis dazu“ füllt Frage plus Bezug (laufId, Aufruf) in die Chat-Eingabe; gesendet wird nichts.
- Die Seitenleiste markiert auf #/live und #/runs/<laufId> wie bisher „Ausführungen“ (unter „Entwicklung“).
- Status-Block: Zeitbalken, „Abbrechen …“ und „Laufakte“ stehen unter dem Rahmen statt darin — der Baustein
  statusBlockHtml ist mit D3 geteilt (F-1004).
- Ist ein Lauf aktiv, der hier keine Seite hat (anderes Projekt oder noch nicht in der Laufliste), zeigt #/live
  „Die Workforce wartet“ mit einem Hinweis statt eines Startangebots (ein Lauf zur Zeit, D13).
- #/runs: Die Überschrift nennt das aktive Register (Aufträge bzw. Ausführungen); darüber die Reiterzeile der
  Entwicklung mit „Aufträge“ aktiv.

### 4.11 Auftrag anlegen — `#/projekt` (04-auftrag-anlegen--Main) · D4
Zweck: einen klaren Auftrag formulieren und sehen, ob alles für den Start bereit ist.
Hauptaufgabe: Auftrag schreiben und „Ablauf vorbereiten“.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Schrittleiste Auftrag · Ablauf prüfen · Freigeben | U | Anzeige |
| Formular Titel, Gewünschtes Ergebnis, Kontext optional, „Ablauf vorbereiten →“ | U | F44 WS-5b |
| Direktstart einzelner Arbeitsschritt (aufklappbar) | U | bestehend |
| Bereit zum Start?: Titel/Ergebnis, Kontext, Prüfbefehl hinterlegt, Kein anderer Lauf aktiv | U | Formular, Startvorlage, `aktiverLauf` |
| Bereit zum Start?: Arbeitsverzeichnis gefunden, Git-Stand, Harness vorhanden | S | Leseroute D4 |
| Bereit zum Start?: Projektkarte | K | Fixpaket B2 |
| Wo gearbeitet wird: Projekt, Arbeitsordner („Pfad kopieren“), Kontrollzustand, Projektwissen | U | Projektregister |
| Wo gearbeitet wird: Git, GitHub | S | Leseroute D4 |
| Wo gearbeitet wird: Vorschau | U | `vorschau_url`; „Festlegen“ K |
| Warnung „Läufe arbeiten direkt auf dem ausgecheckten Branch …“ | U (neuer Hinweistext; Aussage belegt durch F-954, heute nicht angezeigt) | |
| `cd`-Befehl als Befehlsblock | U | `befehlsblock.js` |
| Womit gearbeitet wird: Startvorlage, Worker, Modell, Werkzeugsätze, Prüfbefehl, Zeitgrenze, Kontextbudget | U / S | aus Startvorlage und Profil (`/api/startvorlage/werkzeugsaetze` und Register); was fehlt, über die Leseroute D4 |

### 4.12 Code — `#/code` (06-entwicklung-code--Main) · D4
Zweck: was sich im Repo geändert hat und durch welche Arbeit.
Hauptaufgabe: Stand prüfen und sichern (im eigenen Terminal).

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Arbeitsstand: Branch, Basis, Commits voraus, Dateien nach Ordnern mit Art und Zeilen, Diff-Vorschau, „In VS Code öffnen“ | S | Leseroute `GET /api/projekte/<id>/code` |
| Sichern: Befehlsblock `git add <echte Dateien>`, `git commit -m "<Vorschlag>"`, `git push` | U | echte Dateiliste, keine Platzhalter (F-958); „Ins Terminal“ K |
| Commit-Freigabe: `state/freigabe-commit.md` vorhanden, Alter, gilt 10 Minuten, nur Claude Code | S | Leseroute |
| Prüfstand: Zustand, Tests, Prüfskripte, CI, „von dieser Änderung berührt“ | K | F-962 |
| Prüfstand: Befehlsblock `npm run check` | U | |
| Verlauf auf main: Merges mit Zuordnung aus der Nachricht (Feature, WS, PR), Abstand; Filter | S | Leseroute |
| „Später auf dieser Seite“: Branches & PRs, Lauf-Änderungen, Code-Karte, Brennpunkte | K | |

Leseroute: nur `GET`, `git --no-optional-locks`, Aufruf ohne Shell, Zeitgrenze, nur unter `repo_pfad`, Diff gekappt, Fehler als Feldstatus, Remote-URL über `git remote get-url origin`. Challenger-Prüfung vor dem PR ist Pflicht.

### 4.13 Tech Debt & Prozess — Reiter (06-entwicklung-code--TechDebt) · D4
Zweck: bewusst eingegangene Schulden im Code und in der Arbeitsweise, damit sie eingeplant werden.
Hauptaufgabe: Bestand filtern und einzelne Einträge öffnen.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Art-Karten Technische Schuld (TECH_DEBT) und Prozess-Schuld (PROCESS_IMPROVEMENT) mit Anzahl, als Filter | U | Workitems |
| Filter Priorität P1–P3 | U | |
| Tabelle Art · ID · Titel · Priorität | U | |
| Spalte „Eingeplant“ | U / K | nur aus einem maschinenlesbaren Feld, sonst K (Fixpaket B5) |

Umsetzung D4 (Abweichungen zu §4.11–§4.13, begründet):
- Basis des Arbeitsstands und des Verlaufs ist `origin/main`, ohne ihn `main`: Merges entstehen auf GitHub,
  ein lokales `main` ist oft veraltet oder fehlt im Worktree. Die Seite nennt die Quelle („Quelle: origin/main“).
- Commit-Freigabe aus der Dateizeit von `state/freigabe-commit.md` (nie der Inhalt); der Hook commit-guard
  entscheidet nach dem Zeitstempel in der Datei — der Text sagt das, statt „darf“ absolut zu behaupten.
- Prüfstand: statt des Chips „nicht geprüft“ ein „kommt“ (keine Quelle, F-962); der Befehlsblock nennt den
  Prüfbefehl der Startvorlage der Instanz (bei ai-workforce `npm run check`).
- Verlauf: Beschreibung ohne „fließt als Ist in die Zeitleiste“ (diese Verwendung gibt es noch nicht, Regel 8);
  Zuordnung nur aus dem Betreff-Muster „F46 D3: … (#312)“; Filter „Fixes“/„Doku“ nach dem Anfang des Betreffs.
- Dateiliste und „Sichern“ umfassen den ganzen Arbeitsbaum einschließlich neuer Dateien (Stefan entscheidet,
  was er stagt). Ist die Liste gekappt, der Baum sauber oder kein Branch ausgecheckt, steht statt eines
  Befehls der Grund. Die Dateien sind die des Repos, nicht die eines Eintrags — die Kachel „Änderungen“ im
  Detail verweist deshalb auf #/code und sagt das.
- Tech Debt & Prozess: zusätzlich Status-Chips „Offen · Alle Status“ (sonst wäre Erledigtes aus dem Register
  nicht mehr erreichbar, Regel 7) und die bisherige Suche; Prioritäten aus den vorkommenden Werten;
  „Eingeplant“ = Maßnahme, gekürzt (wie D3).
- Auftrag anlegen: „GitHub · Pull Requests [n] offen“ entfällt (keine Quelle; „Branches & PRs“ ist „Später“);
  die Warnung zum Branch steht immer, bei ausgechecktem `main` mit dem Zusatz „Gerade ist main ausgecheckt.“;
  „Arbeitsverzeichnis gefunden“ heißt: der Ordner existiert und Git antwortet dort (ohne Git „prüfen“, die
  Spalte ist dann nicht bereit). „Ablauf vorbereiten“ bleibt wie bisher bedienbar (Prüfung beim Klick);
  die Spalte nennt darunter „Fehlt noch: …“ statt den Knopf zu sperren.
- „Sichern“ schlägt keinen Befehl vor, wenn main ausgecheckt ist, das letzte Aktualisieren scheiterte, die
  Liste gekappt oder kein Branch ausgecheckt ist; ohne Remote „origin“ entfällt der Push.
- Diff-Vorschau ohne Dateikopf-Zeilen (der Pfad steht im Kopf der Vorschau); Umbenennung und Binärdatei
  bleiben als Infozeile. Ein Name mit führendem „-“ bekommt keinen Diff (Schutz vor Git-Schaltern).
- #/code trägt „Aktualisieren“ (Bauauftrag) statt „Neu laden“ der Entwicklung; der Kopf hat dieselbe
  Eyebrow, ist aber nicht deckungsgleich, weil die Beschreibung der Entwicklung zweizeilig ist.
- Tabellen (Verlauf, Tech Debt) unter 640 px als gestapelte Blöcke mit Beschriftung; „Eingeplant“ trägt den
  Zusatz „laut Maßnahme im Register“.

### 4.14 Workforce — `#/capabilities` (01-workforce-harness--Main, --Library, --Bearbeiten) · D6
Zweck: was die Workforce beim Arbeiten lädt, prüft und befolgt, und welche Fähigkeiten es gibt.
Hauptaufgabe: den Harness verstehen; Fähigkeiten prüfen und freigeben.

| Bereich | Status | Quelle / Hinweis |
|---|---|---|
| Reiter | U | Heute: Harness-Aufbau (kommt), Phasen & Rollen, Fähigkeiten (mit Unterreiter Rollen & Besetzung und Bereich Scout). Soll: Harness-Aufbau · Capability Library (= Fähigkeiten, Rollen & Besetzung und Scout bleiben darin erreichbar) · Phasen & Rollen. |
| Harness-Skelett mit sechs Bausteinen (Regeln, Wissen, Gedächtnis, Rollen & Fähigkeiten, Bremsen, Prüfung & Betrieb), echte Dateien und Anzahlen | S | lesende Route über bekannte Pfade des Projekts |
| Vergleich mit der Vorlage (wie Vorlage / angepasst / nicht in der Vorlage) | S / K | nur wenn die Vorlage im Repo eindeutig ist (`kopiereBaseline`, `src/projekt-anlegen`), sonst K |
| „Genutzt von“-Kürzel je Datei, „Wer nutzt den Harness?“ | K | Fixpaket B1 |
| Detailpanel einer Datei (lesend, gekappt) | S | |
| „Änderung vorschlagen“ | K | E-F46-2 |
| Library: Kennzahlen im Katalog / aktiv / Freigabe offen, Filter, Suche, Tabelle | U | `GET /api/ressourcen` |
| Library: Detail mit „Prüfen & freigeben“ | U | Installationsweg F36 |
| Hinweis „design-guardian fehlt im Katalog“ | S | nicht als fester Text; seit D6 aus dem Abgleich `.claude/agents/` gegen Katalog |
| Bearbeiten (01-workforce-harness--Bearbeiten) | K | ganze Ansicht; Fixpaket B1/B5; settings.json und Hooks nur per Vorschlag (E-F46-2) |

Umsetzung D6 (Abweichungen zu §4.14, begründet):
- Prüfpunkt D6 (§7): Die Vorlage ist nicht eindeutig — die Startvorlage eines neuen Projekts entsteht aus der
  Byte-Kopie der Harness-Baseline (F41), deren Stand im Zielprojekt nicht als Vergleichsbasis vorliegt. Der
  Vergleich „wie Vorlage / angepasst / nicht in der Vorlage“ ist deshalb K (Legende und Detail), keine Punkte
  an den Knoten. Die Leseroute nutzt nur die feste Pfadliste (`scripts/leitstand/routen-harness.mjs`).
- Pfadliste wie im Bauauftrag; `docs/kommentar-standard.md` aus dem Bild steht nicht darin (nicht im Auftrag) und
  ist über „In VS Code öffnen“ der Wurzel bzw. die Projektakte erreichbar. `.github/workflows/` erscheint als
  Ordner mit Anzahl statt als einzelne Datei `ci.yml`; Prüfskripte als Muster `check-*.mjs` mit Anzahl (ohne
  `*.test.mjs`), einzeln im Ordner-Detail.
- Bremsen: jeder Hook ist ein eigener Knoten mit Schloss (Bild); `settings.json` ebenso. Ein Ordner der anderen
  Bausteine ist ein Knoten mit Anzahl; sein Detail listet die direkten Einträge, Dateien davon sind öffenbar.
- Detail: statt Beschreibungssatz, „Wann“ und „Eingehängt in“ (keine Quelle, Regel 8) stehen Größe, Zuletzt
  geändert und „Genutzt von“/„Gegen die Vorlage“ als K; der Dateianfang im `<pre>` trägt den Datei-Kopf.
  „Ganze Datei ansehen“ ist das Scrollen im `<pre>` (bis 64 KB) plus „In VS Code öffnen“; „Sichtbar, aber nicht
  direkt änderbar.“ steht nur bei Bremsen.
- „Wer nutzt den Harness?“ als Karte mit K und Satz zu Fixpaket B1; der Untertitel „— und welches Modell was
  davon nutzt“ entfällt (B1). „Beispiel: CLAUDE.md bearbeiten“ heißt „Harness bearbeiten“ (K, 01-Bearbeiten).
- Library: „Aktiv“ = freigegeben UND verfügbar (`istAktiv`), nicht „im Lauf genutzt“ — der Hinweis darunter sagt
  das; freigegeben, aber nicht verfügbar heißt „Freigegeben · nicht verfügbar“. Kennzahlen Im Katalog · Aktiv ·
  Freigabe offen; zusätzlich zum Bild der Status-Chip
  „Freigabe offen“ (der Filter nach Freigabe bleibt erreichbar, Regel 7). Spalte „Genutzt von“ entfällt in der
  Tabelle (nur K im Detail, B1), der Status ist ein Chip statt eines Schalters (ein Schalter suggerierte einen
  Schreibweg, Regel 2). Detail ohne Lizenz/Kosten (keine Katalogfelder), dafür ID-Felder aus F44 (Phasen, Grund,
  Fehlt für Einsatz). „Prüfen & freigeben“ steht nur bei offener Freigabe, die der F36-Weg installieren
  kann (lesendes Feld `installierbar` der Projektion, dieselbe Regel wie der Server); sonst steht der Grund da.
  Unter 900 px (auch bei 200 % Zoom) ist die Tabelle gestapelt.
- Die Library ist ein Register mit den Unterbereichen Katalog · Rollen & Besetzung · Empfehlungen (Bestand
  F44 WS-7a/7b); der Scout bleibt an der Lücke unter Rollen & Besetzung. Hinweis „liegt im Harness, steht nicht
  im Katalog“ ab D6 aus dem Abgleich (nicht mehr „später“); er entfällt, wenn die Agent-Liste gekappt ist.
- Phasen & Rollen bleibt „kommt“ (Inhalt aus F44 WS-7a); nur Reihenfolge der Register (Bild) und Kopf je Register.

### 4.15 Chat — Dock und große Ansicht (05-jarvis-terminal--Zugang, --Main)
Vorhanden aus F44 WS-8. Terminal-Spalte und „Ins Terminal“ K (E-F46-1). Kein eigener Workstream.

## 5 Was „kommt“ und wohin

| Ziel | Elemente |
|---|---|
| Fixpaket B1 | Fähigkeiten vorgesehen/genutzt (K · Fixpaket B1: vorgesehen gegen genutzt; verwandt F-937), „Wer nutzt den Harness?“, „Genutzt von“, Harness bearbeiten |
| Fixpaket B2 | Arbeitspaket (Freigabe, Live, Workstream), DoD „Fertig, wenn“, Umfangsabgleich „Im Umfang?“, Bericht im Format geändert/geprüft/erfolgreich/Blocker, Projektkarte, Workstreams als Daten, Workstream-Ansicht |
| Fixpaket B5 | Schätzfelder, Gantt-Balken und Zeitachse, Plan gegen Ist, Eintrag erfassen und Akte bearbeiten (E-F45-1), Planung speichern, Roadmap anpassen und ziehen, Bug-Triage außer „Jetzt beheben lassen“, strukturierte Bug-Felder, Einordnung, „Eingeplant“ |
| Fixpaket (ohne Baustein-Nummer) | „Sichern & mergen“ als Zustand und Entscheidungsart, Prüfergebnis festhalten (F-962), Branch pro Lauf (F-954) |
| Eigenes Vorhaben nach dem Fixpaket | Terminal-Panel, „Ins Terminal“ (E-F46-1) |
| Später | Architektur & Daten, Health & Nachweise, Branches & PRs, Lauf-Änderungen, Code-Karte, Brennpunkte, „blockiert“, „Jarvis empfiehlt“ auf Karten, „Wenn du nichts tust“, „Zuletzt entschieden“, Bremsen & Warnungen live, Verbrauch je Feature, Urteile je Claude-Prüfer |

## 6 Schnitt nach Ansichten

| WS | Ansichten | Serverteil |
|---|---|---|
| D0 | — (Grundlage, Live-Chip, Ebenen-Tokens) | – |
| D0b | Designs und dieses Dokument im Repo | – |
| D1 | 02, 03, 09-Projektakte; Rollen-Kreis, Typ-Chips | Leseroute Projektkontext |
| D2 | 09-Main, 09-Entscheiden, 09-Entscheiden-Abnahme | Abnahmestand in den Workflow-Kopfdaten |
| D3 | 07-Main, 07-Bug (07-Workstream K); Kurz gesagt, Status-Block, Jetzt-Band | – |
| D4 | 06-Main, 06-TechDebt, 04, Reiterzeile | Leseroute Code/Arbeitsumgebung |
| D5 | 08 (beide Zustände), Aufträge-Liste, `#/live` | Ringpuffer 50 Aufrufe |
| D6 | 01-Main, 01-Library (01-Bearbeiten K) | Leseroute Harness-Dateien |

## 7 Offene Prüfpunkte für die Workstream-Challenges
- D1: Wo steht das Versionsziel in der Zielfassung eindeutig?
- D2: Abnahmestand in den Kopfdaten ohne zweiten Poll und mit korrektem Cache-Stempel.
- D3: Welche Register-Felder sind maschinenlesbar (gefunden bei, offen seit, Fundstelle, Zuordnung zum Feature)?
- D4: Sicherheit der Leseroute; welche Startvorlagen- und Profildaten liegen schon im Client.
- D5: Liefert die Laufakte das Kontextpaket? Lassen sich schreibende Werkzeugziele sicher aus dem Ringpuffer ableiten?
- D6: Ist die Vorlage für den Harness-Vergleich eindeutig? Lesende Route nur über eine feste Pfadliste.
