# F44 — Design-Schnitt (F-725)

## ID
F44

## Titel
Design-Schnitt (F-725): Leitstand im Stil der Designvorlage V10

## Status
Status: IN_ARBEIT

Schnitt: Challenger-Dokument „474 — Challenge F-725 Design-Schnitt“ vom
30.09.2026, Ergebnis `GO_STANDARD`; übernommen als
`docs/design/abgleich-f725.md`. WS-0 „Ablage & Harness“ in Arbeit seit
30.09.2026 (Branch `feat/f725-ws0-design-ablage`, gemergt #290). WS-1 ist geteilt
(Challenger, 30.09.2026): WS-1a „Fundament“ gemergt (#291, `1f9ddb2`); WS-1b „Shell &
Einstieg“ gemergt (#292, `71ff28b`). WS-2 ist geteilt (Challenger, 01.10.2026): WS-2a
„Entscheidungen & Roadmap“ gemergt (#293, `7530cbf`); WS-2b „Übersicht“ gemergt (#294, `67e757c`).
WS-3 ist geteilt (Auftrag Stefan, 01.10.2026): WS-3a „Board & Listen“ gemergt (#295, `1191231`);
WS-3b „Detail, Bauen, Click-to-Work“ gemergt (#296, `5b0b683`). WS-4 ist geteilt (Auftrag Stefan,
01.10.2026): WS-4a „Ablauf & Freigabe“ gemergt (#297, `493d953`); WS-4b „Klärung, Reparatur & Abnahme“
gemergt (#298, `772f4e5`). WS-5 ist geteilt (Auftrag Stefan, 01.10.2026): WS-5a „Ausführungen“ gemergt
(#299, `a91029d`); WS-5b „Auftrag & Direktstart“ gemergt (#300, `ca0fbae`).
WS-6a „Alle Produkte“ (Abschnitt H, Auftrag Stefan 01.10.2026) in Arbeit seit 01.10.2026 (Branch
`feat/f725-ws6a-produkte`); Abschnitt I (Nutzung), WS-7 und WS-8 offen.

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Der Leitstand bekommt die Gestaltung und die Interaktionen der
Designvorlage V10 (`docs/design/vorlage-v10/`, führend
`docs/design/vorlage-v10/START-HERE-CLAUDE.md`), ohne dass heutiges
Verhalten wegfällt und ohne Beispieldaten. Stefan soll den Stand als
Produktmanager verstehen, priorisieren, klären und freigeben können.

Maßgeblich ist nicht die Vorlage allein, sondern die Abgleichstabelle in
`docs/design/abgleich-f725.md` (§3): Sie ordnet jedes Vorlage-Element
einem Status zu (V vorhanden, V\* vorhanden trotz „In Entwicklung“, V+
Zusatzabfrage, O nur Optik, Z Zukunft, F fehlt in der Vorlage, – entfällt).
Übernommen werden Gestaltung und Interaktionen, nicht der Code der
Vorlage; die Modulstruktur des Leitstands (`router.js`, `zustand.js` mit
einem Poll, `api.js`, `views/*`) bleibt.

Grundlage: F-725 (Design als eigener Schritt der M5-Reihenfolge,
`docs/projekt/zielfassung.md` §13.6) mit der Scope-Ergänzung vom
29.09.2026 (Ablage der Vorlage, design-guardian mit Playwright-Screenshots,
Motion mit Prüfweg).

## Entscheidungen
- **E-F44-1 = B** (Stefan, 30.09.2026) — Sichtbarkeit der Zukunft:
  Z-Elemente bleiben sichtbar, sind deaktiviert (`aria-disabled="true"`,
  per Tastatur erreichbar, ein Klick löst nichts aus) und tragen das Badge
  „kommt“. Sie zeigen nie Beispieldaten; ohne Datenquelle erscheint der
  Leerzustand der Vorlage. Umsetzung im Einzelnen:
  `docs/design/abgleich-f725.md` §4 Punkt 4.
  Challenger-Empfehlung war **A**: eigene Bereiche als Seite „kommt“,
  eingebettete Zukunftsknöpfe ausblenden.
- **E-F44-2 = B** (Stefan, 30.09.2026) — Sprachen: Vier Sprachen
  de/en/tr/ru gehören zum Design-Schnitt. Kern und Gate in WS-1, die Texte
  je Paket im selben PR; Serverantworten und Projektinhalte bleiben in der
  Originalsprache. Umsetzung: `docs/design/abgleich-f725.md` §5.4.
  Challenger-Empfehlung war **A**: erst Deutsch, Sprachen als eigenes
  Paket später.
- **E-F44-3 = A** (Stefan, 01.10.2026) — Hauptweg auf `#/projekt`: „Ablauf
  vorbereiten“ (Auftrag anlegen → routen → Ablauf auf `#/workflows/<id>` freigeben); der
  Direktstart eines Einzelschritts bleibt als aufklappbarer Nebenweg. Umsetzung: WS-5b
  (`docs/design/abgleich-f725.md` §5.1, Vermerk WS-5b).

## Scope
Pakete nach `docs/design/abgleich-f725.md` §5.1. Jedes UI-Paket (WS-1 bis
WS-8) liefert: alle Texte des Pakets als Schlüssel in de/en/tr/ru,
design-guardian gegen die Referenz-Screenshots, `render-nachweis` bei
1440 px und 390 px, hell und dunkel, mit 200 % Zoom, und die einzeln
abgehakten F-Zeilen des Pakets.

| WS | Inhalt | Gates mit Anpassungsbedarf |
|---|---|---|
| **WS-0** Ablage & Harness (keine UI) | Feature-Akte; Vorlage unverändert unter `docs/design/vorlage-v10/`; Referenz-Screenshots; `docs/design/abgleich-f725.md`; `.claude/agents/design-guardian.md`; `impeccable` installierbar machen (`installation_vorlage`); Token-Gate: `:root[data-theme=…]` zulassen und alle `.css` unter `public/leitstand` scannen | f20-tokens (Erweiterung), check-docs (neuer Agent) |
| **WS-1a** Fundament | i18n-Kern und -Gate, Tokens dunkel und hell samt Typografie und Kontrastprüfung, Theme (`data-theme`, kein Aufblitzen, `theme-color`, Manifest), Seite Einstellungen (`#/einstellungen`, erreichbar über das Dropdown der Nutzerkarte), zentraler Neuladen-Hook beim Projektwechsel (F-860), `render-nachweis` (Theme, reduzierte Bewegung, Zoom; F-867). Sidebar, Kopf, Persona, `#/start` und Chat-Layout bleiben unverändert; bestehende Views bekommen nur die neuen Token-Werte | f20-tokens (Kontrast), neues i18n-Gate |
| **WS-1b** Shell, Einstieg | Sidebar V10 auf bestehende Routen, Kopf (Projektauswahl, „+“ mit F-862, Persona-Bild neu und kalibriert — Zuschnitt, Orb, Avatar, Augen-Overlay —, 4 Statustexte, Sprach- und Theme-Schalter im Kopf), eine Live-Region, `#/start` mit Motion-Nachweis und Wartezeile, Platzhalterseiten, Baustein „kommt“ (E-F44-1), Poll-Fehlerbanner, Zuletzt geöffnet, Sidebar-Kontrast (F-865) | f28-persona, f21-ws2 (Nav-Anker), f34 (`[hidden]`-Regeln), f20-zustand-poll |
| **WS-2a** Entscheidungen & Roadmap | Tabellenabschnitte C und D (mit F-854): `#/attention` „Deine Entscheidungen“, `#/roadmap` als eigene Seite (die Zwischenseite entfällt), reine Module `baueEntscheidungen` (`attention-daten.js`) und `roadmap-anzeige.js`; dazu F-891 | f21-ws2 (IDs `attention-*`, Importzeile (e)) |
| **WS-2b** Übersicht | Tabellenabschnitt B (`views/dashboard.js`), nutzt `baueEntscheidungen` für „Deine nächsten Entscheidungen“ und `roadmap-anzeige.js` für aktuellen Meilenstein und Fortschrittsring | f21-ws2 (Importzeile (e) in dashboard.js) |
| **WS-3a** Board & Listen | Abschnitt E1–E7: Status-Kanban, Listen-Tabs mit Suche, Parser-Befunde, Z-Elemente E2/E3/E7; Bento entfernt (F-892); F-913 | f21-ws2 (IDs `workboard-*`, keine POST-Methode in workboard.js; neu (h)) |
| **WS-3b** Detail, Bauen, Click-to-Work | Abschnitt E8–E13 (Detail, „Auftrag vorbereiten“, Click-to-Work samt Git-Block, 409 mit „Wiederholen“, E13 als kommt), F-914 | f21-ws2, f22, `empfehlung-*.test.mjs` |
| **WS-4a** Ablauf & Freigabe | F0 (Liste „Aufträge“ unter `#/runs`), F2 (Timeline „Der Weg zum Ergebnis“), F3, F3b (Ablehnen), F4, F5 (Freigabedialog mit Katalog-Empfehlung und „Freigeben & installieren“), F10 (Stoppdialog), F12 (Technischer Ablauf); Invariante „Anzeige = Start“; F-874, F-923, F-925, F-926 (Workflow-Detail) | f15-oberflaeche (IDs und Texte), `empfehlung-*.test.mjs`, f20-shell (CI), `projekt-wechsel.test.mjs` |
| **WS-4b** Klärung, Reparatur & Abnahme | F6 (Architekt-Entscheidung), F8 (Reparatur), F9 (Sichtung), F13–F18 (Abnahme samt Prüfung wiederholen); Restyling des bisherigen Bedienblocks | f15-oberflaeche, f23, f42 |
| **WS-5a** Ausführungen | G1–G9 und F7: Register „Aufträge“/„Ausführungen“ (`#/runs`, `#/ausfuehrungen`), Lauf-Detail `#/runs/<laufId>` als Seite mit Notiz je Lage, Timeline, Einordnung, Aufklappbereichen und Dialog (Kenntnisnahme, Klärung, Rückfrage, Abbruch); Prüfpunkte aus WS-4b (Raster von `#/workflows/<id>`) | f12 (f)/(g), f15 (f), f20-leitstand-shell (CI), `runs.test.mjs`, i18n |
| **WS-5b** Auftrag & Direktstart | F1 (Auftrag anlegen) sowie G10 und G11 (Direktstart mit Werkzeugsatz, Evidenzdateien, laufId; Auswahl der Aufträge) in `#/projekt` nach d_auftrag_neu | `projekt-wechsel.test.mjs` (unverändert grün), f20-leitstand-shell (CI, IDs unverändert), i18n; neu `views/projekt.test.mjs` |
| **WS-6** Produkte & Nutzung | Abschnitte H (F43/F-849 echt, F-857) und I | f43, f25, f32-ansicht |
| **WS-7** Workforce | Abschnitt J (Katalog, Rollen, Coverage, Scout, Phasen aus Workflows) | – |
| **WS-8** Chat | Abschnitt L (Dock und große Ansicht, alle heutigen Chat-Funktionen); dazu das Umstellen der Chatspalte auf die Blase (Chat-Dock), das aus WS-1 hierher wandert | f34 (IDs, Modus-Buttons) |

**Vermerk WS-3 (Stefan, 01.10.2026):** E13 „Eintrag bearbeiten“ bleibt in WS-3 als kommt; wird im
Fixpaket Arbeitsfähigkeit, B5, echt (E-F45-1 = A). WS-3 ist in WS-3a „Board & Listen“ (E1–E7) und
WS-3b „Detail, Bauen, Click-to-Work“ (E8–E13, F-914) geteilt; E13 liegt damit in WS-3b.

**Schnitt WS-1 (Challenger, 30.09.2026):** WS-1 ist in WS-1a „Fundament“ und WS-1b
„Shell, Einstieg“ geteilt, damit jedes Teilpaket einen Baudurchgang plus höchstens
eine Korrekturrunde bleibt. Das Chat-Dock (Blase) wandert nach WS-8; bis dahin bleibt
die Chatspalte und bekommt nur die neuen Tokens (Risiko f34, `[hidden]`-Regeln).
Vermerkt in `docs/design/abgleich-f725.md` §5.1.

**Regel für alle Pakete:** Gates prüfen Invarianten. Wo Literale (IDs,
Texte) umziehen, zieht das Gate im selben PR mit und begründet den Umzug.
Die geprüfte Invariante bleibt: 4 Attention-Quellen, Pflichtbegründungen,
Escaping, ein Poll, keine Farbliterale.

### Routenzuordnung
Die Hash-Routen bleiben, die Beschriftung kommt aus der Vorlage; neue
Routen nur für neue Seiten (`docs/design/abgleich-f725.md` §4 Punkt 2 und
§5.2). Der leere Hash führt nach `#/start`, ein unbekannter bleibt bei der
Übersicht.

| Navigation (Vorlage) | Route |
|---|---|
| Produktübersicht | `#/dashboard` |
| Roadmap | `#/roadmap` (neu) |
| Entwicklung | `#/workboard`, Detail `#/workboard/<id>`; Ablauf `#/workflows/<id>`; Ausführungen `#/runs` (Register „Aufträge“) und `#/ausfuehrungen` (Register „Ausführungen“, seit WS-5a), Detail `#/runs/<id>`; Auftrag & Direktstart `#/projekt` |
| Entscheidungen | `#/attention` |
| Produktzyklus / Brain | `#/produktzyklus`, `#/brain` (neu, Platzhalter) |
| Alle Produkte | `#/projekte-uebersicht` |
| Nutzung / Einstellungen | `#/nutzung`, `#/einstellungen` (neu) |
| Workforce | `#/capabilities` mit Registern Harness-Aufbau, Phasen & Rollen, Fähigkeiten |
| Chat | `#/chat` (überlagert → Dock) |

## Nicht-Ziele
- **Kein Backend für Z-Zeilen.** Was Daten oder Endpunkte braucht, die es
  nicht gibt (Zeitplanung, Prioritäten ändern, Eintrag erfassen, Produkt
  bearbeiten, Brain, Produktzyklus, Technik, Deployer), bleibt nach
  E-F44-1 sichtbar und deaktiviert.
- **Kein Vorlage-Code im Produkt.** Übernommen werden Gestaltung und
  Interaktion; `app.js`, `experience.js` und `localization.js` der Vorlage
  werden nicht kopiert, nichts aus `docs/design/vorlage-v10/` wird
  ausgeliefert.
- **Keine Fixtures**, keine Beispielzahlen, kein Badge „Designvorschau“.
- **F-776 ist nicht Teil** (Katalogart „referenz“): V1-Backlog mit Auslöser;
  bestätigt (Stefan/Challenger, 30.09.2026).
- Keine Übersetzung von Serverantworten, Projektinhalten, Nutzereingaben,
  IDs und Befehlen (E-F44-2).

## Akzeptanzkriterien
Bestehensbedingung nach `docs/design/abgleich-f725.md` §5.3.

- **AK1** Alle F-Zeilen der Tabelle sind im neuen Stil vorhanden. Kein
  heutiges Verhalten fällt weg.
- **AK2** Alle V\*-Zeilen sind echt angebunden.
- **AK3** Keine Fixture-Daten, keine Beispielzahlen und kein Badge
  „Designvorschau“ im Produkt.
- **AK4** Z-Elemente sind sichtbar, deaktiviert (`aria-disabled`) und mit
  „kommt“ gekennzeichnet (E-F44-1 = B); keines zeigt Beispieldaten.
- **AK5** `npm run check` ist grün. Die Render-Nachweise je Paket liegen
  vor (Desktop, Mobil, hell, dunkel, reduced motion; nach Scope zusätzlich
  200 % Zoom).
- **AK6** Die Sicherheitsgrenzen bleiben: CSRF (F-813), Host-Allowlist
  (F-814), F-849 (Karte und Empfehlungsblock), ZWINGEND-Freigabe mit
  Pflichtbegründung, Freigabe-Veto (Ablehnen), „Anzeige = Start“, ein Lauf
  zur Zeit, eine Live-Region.
- **AK7** Alle UI-Texte gibt es in de/en/tr/ru über Schlüssel; Plural sowie
  Datums- und Zahlformate laufen über `Intl`; das i18n-Gate ist grün.
  Serverantworten und Projektinhalte bleiben in der Originalsprache
  (E-F44-2 = B).

## Dependencies
- F20/F28/F29 (Shell, Persona, Tokens), F21 (Workboard), F33 (Roadmap),
  F34 (Chat/Coach), F35 (Bauen aus der Akte), F36 (Katalog-Empfehlung,
  Installation, Beobachtung), F39 (Architekt-Entscheidung), F41/F42
  (Projekt anlegen), F43 (Projekt aufrufen) und F-849.
- Nach F43, vor F30 (`docs/projekt/zielfassung.md` §13.6, Reihenfolge).

## Security/Permissions
Der Umbau ändert keine Server-Grenze. Er muss sichtbar erhalten: CSRF
(F-813), Host-Allowlist (F-814), die Leitstand-Port-Sperre F-849 in
Projektkarte und Empfehlungsblock, die Bestätigung vor „Freigeben &
installieren“, das Freigabe-Veto (ABGELEHNT mit Pflichtbegründung) und die
Invariante „Anzeige = Start“. Eine zweite `aria-live`-Region ist
ausgeschlossen (Persona bleibt die einzige).

## Stand WS-0 (30.09.2026)
- Vorlage V10 byte-gleich unter `docs/design/vorlage-v10/` (SHA-256-Liste
  in `docs/design/vorlage-v10/README.md`, gegen das Original geprüft mit
  `sha256sum -c` und `Get-FileHash`; LF-Dateien, die Repo-Regel ändert
  sie nicht).
- 50 Referenz-Screenshots unter `docs/design/vorlage-v10/screens/`, erzeugt
  mit `docs/design/vorlage-v10/erzeuge-screens.mjs`.
- `docs/design/abgleich-f725.md` (Abschnitte 0–8 des Challenger-Dokuments,
  Findings mit echten IDs F-860 bis F-866; §9 ordnet jedes Referenzbild einer Leitstand-Ansicht zu).
- `.claude/agents/design-guardian.md` aktiv.
- Token-Gate `scripts/check-f20-design-tokens.mjs`: `:root[data-theme]`,
  alle `*.css`, Farbfunktionen `rgb`/`hsl`/`hwb`/`lab`/`lch`/`oklab`/`oklch`/`color`,
  Literale in Token-Blöcken nur als Custom Property, Rot/Grün-Selbsttest (F-861).
- **Offen: `impeccable` nicht installierbar gemacht.** Das fremde Repo
  pbakaus/impeccable (HEAD `0d6b47e`, 30.09.2026) trägt nicht genau einen
  Skill-Ordner, sondern je Agent-Harness eine Kopie (dort u. a.
  .claude/skills/impeccable, plugin/skills/impeccable,
  .agents/skills/impeccable, dazu die Quelle skill/). Welcher Pfad gilt,
  entscheidet Stefan; `ressourcen.json` ist unverändert.
- Folge-Findings aus dem Review-Pass: F-867 (render-nachweis), F-868
  (Benutzerpfad in `docs/STATUS.md`).

### Akzeptanzkriterien WS-0
- **WS0-1** 13 Vorlage-Dateien unter `docs/design/vorlage-v10/`, SHA-256
  gleich dem Original (README-Tabelle; `sha256sum -c` und `Get-FileHash`
  am 30.09.2026), Git-Blob ohne Normalisierung (`git hash-object` mit und
  ohne Filter gleich).
- **WS0-2** 50 Referenzbilder nach der Namensliste des Auftrags, Lauf von
  `erzeuge-screens.mjs` mit 0 Seiten-, Anfrage- und HTTP-Fehlern, Exit 0.
- **WS0-3** Token-Gate grün; Selbsttest (3) mit Rot- und Grünfällen;
  vier Mutationen des Gates jeweils rot (F-861).
- **WS0-4** design-guardian liegt in `.claude/agents/`, check-docs findet
  keinen toten Verweis; CLAUDE.md-Zeile aktiv.
- **WS0-5** Nichts unter `public/` geändert, `ressourcen.json` unverändert,
  `npm run check` Exit 0. Beleg 30.09.2026: `npm run check` Exit 0
  (node:test 1080/1080), `npm run check:template` Exit 0.
- **WS0-6** `impeccable` installierbar machen: **geschlossen, nicht
  umgesetzt** (Challenger, 30.09.2026). impeccable wird nicht freigegeben
  (rund 20 Skill-Kopien, Binär-Starter, Verweise auf gesperrte Agents,
  F-815); Neubewertung im Feature „Harness im Lauf“, siehe F-870.

## Stand WS-1a „Fundament“ (30.09.2026)
Branch `feat/f725-ws1a-fundament` (Basis `3c779d8`), nicht committet.
- **i18n-Kern** `public/leitstand/i18n.js` (t, formatiereDatum, formatiereZahl,
  aktuelleSprache, initialisiereSprache, setzeSprache; import-sicher, in Node de;
  Sprachwechsel speichert und lädt neu) mit Wörterbüchern `public/leitstand/i18n/{de,en,tr,ru}.js`
  (26 Schlüssel, nur für WS-1a; en/tr/ru maschinell, F-866). Test `public/leitstand/i18n.test.mjs`.
- **i18n-Gate** `scripts/check-f44-i18n.mjs` in `npm run check`: Schlüsselmengen,
  Platzhalter, Pluralkategorien, keine leeren Werte, kein `#` vor Ziffer/Hex, literale
  t()-Schlüssel in de; Rot-Selbsttest je Regel.
- **Tokens** in `public/leitstand/style.css`: die 71 bisherigen Namen zeigen auf die Werte der
  Vorlage (dunkel = `:root` der Vorlage), die 22 Vorlage-Tokens sind aufgenommen, hell steht in
  `:root[data-theme='light']`. Abgeleitet (nicht in der Vorlage): `--color-text-subtle`
  (Mischung muted/bg), `--color-*-bg` (Statusfarbe zu 8 %, info 6 % in panel), Info-Text =
  muted; `--color-brand-*` zeigt auf Jade, weil die Vorlage nur einen Akzent und keinen Glow
  kennt. `--color-text-subtle` zeigt auf `--muted` (die Vorlage kennt zwei Textstufen; die dritte
  färbt auch kleinen Fließtext und braucht 4,5:1). Karten (`.card`) tragen wie `.panel` der
  Vorlage keinen Schwebeschatten mehr (`--shadow-sm`), `--shadow-md` bleibt für Dropdowns.
  Drei Farbliterale, die die Vorlage in Regeln schreibt (Button-Hover, Hinweis-Kasten),
  stehen als Token. Schrift: Arial für Text, Georgia für h1–h3. `--persona-*` unverändert
  (Persona-Bild und Farben kalibriert WS-1b).
- **Kontrast** im Token-Gate (Abschnitt 4/5): alle Paare bestehen in beiden Themes mit 4,5:1,
  auch `--color-text-subtle`; keine Ausnahme nötig (niedrigste Werte: hell success 4,55:1, hell
  warning 4,69:1, hell muted/subtle auf surface-muted 5,12:1).
- **Theme** `public/leitstand/theme.js`; Inline-Skript im `<head>` von `index.html` gegen
  Aufblitzen (ohne Farbwerte), `theme-color` zur Laufzeit aus `--bg`, Manifest auf
  `#10212b`.
- **Einstellungen** `#/einstellungen` (`public/leitstand/views/einstellungen.js`), Aufbau nach
  `d_einstellungen.png`: Dunkel/Hell, „Sanfte Bewegung“ (Zustand und Schreibpfad in
  `persona.js`, beide Bedienstellen synchron), Hinweis-Kasten (Vorgabe des Auftrags; die
  Fragezeichen-Hinweise, die er beschreibt, gibt es noch nicht — F-873), Sprache als
  Schaltflächengruppe im Stil der Farbschema-Wahl (ein `<select>` lüde unter Windows bei jeder
  Pfeiltaste neu), Fokus auf der Überschrift beim Eintritt, rechte Spalte mit
  Illustration `public/leitstand/assets/gear.webp`. Erreichbar über den Eintrag
  „Einstellungen“ im Dropdown der Nutzerkarte (`shell.js`). Prototyp-Inhalte der Vorlage (A8)
  nicht übernommen.
- **Bild:** Die Vorlage zeigt in den Einstellungen `gear.png` (nicht `armillary.png`).
  Ausgeliefert wird eine auf 480 × 480 verkleinerte WebP-Fassung (Qualität 0,9; 87 KB statt
  1,26 MB), weil ohne neue Abhängigkeit kein verlustfreier WebP-Encoder verfügbar war
  (Chromium kodiert auch bei Qualität 1 verlustbehaftet); das deckt die größte Nutzung der
  Vorlage (240 px) bei doppelter Pixeldichte. Abweichung von §4.5 (verlustfrei, pixelgleich),
  vermerkt in F-869.
- **Neuladen-Hook F-860:** Workboard, Dashboard und Direktstart abonnieren
  `abonniereProjektWechsel`; Überholschutz je Lader; ein werfender Abonnent blockiert die
  übrigen nicht. Beim Wechsel verwirft `zustand.js` einen laufenden Zustands-Abruf
  (Kontext-Generation) und `projekt-kontext.js` stößt sofort einen neuen an; Dashboard und
  Workboard verwerfen das alte Aggregat, das Workboard schließt ein offenes Detail samt
  Click-to-Work-Zustand, der Direktstart verwirft eine vorbereitete Wiederaufnahme und zeigt bis
  zur Antwort „Lädt…“ (Aufträge und Werkzeugsätze). Wiederaufnahme und Click-to-Work-Kette prüfen
  nach jedem Warten, ob das Projekt noch dasselbe ist. Test `public/leitstand/projekt-wechsel.test.mjs`
  (9 Fälle). Nicht erfasst: Workflow-Detail (F-874, WS-4); Wartezeit bis zu 5 s (F-875).
- **render-nachweis F-867:** `farbschema`, `reduzierteBewegung`, `zoom`,
  `localStorageSetzen`, `screenshotVollseite`, WebP-Ausgabe, Schritte `navigiere` und
  `auswaehlen`, Beobachtung `texte`; `goto` wartet nur bis DOMContentLoaded, `load` tolerant.
- **Prüfpässe:** Erster Pass design-guardian, code-reviewer und qa je „Nicht freigegeben“; alle
  Befunde eingearbeitet. Zweiter Pass je „Freigegeben mit Hinweisen“; eingearbeitet: z-index am
  Kopf (Dropdown über dem Körper), kein Fokusring auf der h1, Knöpfe brechen unter 700 px um,
  Fokus bei erneutem Klick auf „Einstellungen“, sichtbarer Hinweis, wenn die Sprache nicht
  gespeichert werden kann, Werkzeugsätze beim Wechsel/Fehler geleert, Projekt-Wächter nach
  `await`, weitere Kontrastpaare (Akzent und Statusfarben auf bg/surface), drei zusätzliche Tests.
- **Nebenbefunde behoben:**
  - Mit der Arial-Schrift wurde der Persona-Status-Chip 1 px höher und fing Klicks auf die Mitte
    der Nutzerkarte ab; der Chip ist jetzt klickdurchlässig (`pointer-events: none`, reine Anzeige).
  - Mit dem Eintrag „Einstellungen“ wurde der Bewegungs-Schalter im Dropdown vom
    `overflow: hidden` des Kopfs abgeschnitten. Der Kopf ist jetzt `overflow: visible`, den
    Zuschnitt des Persona-Bilds oben und unten übernimmt `.persona-oeffner` (`clip-path`);
    nachgemessen: kein anderes Element ragt über den Kopf.
  - Mit Arial trieben die Kopfdaten-Tabellen der Laufkarten (`#/runs`, 390 px) und die
    Verbrauchstabellen (Dashboard, 200 % Zoom; dort schon vor WS-1a) die Seite waagerecht auf;
    `.lauf-kopfdaten td` bricht jetzt um, `.verbrauch-karte` scrollt in sich.
- **Nachweise** `features/F44/nachweise/ws1a/` (Skript `erzeuge-nachweis.mjs`, je Ordner
  `klickfolge.json`, `protokoll.md`, WebP): Routen einstellungen/dashboard/workboard/runs bei
  1440 und 390 px, dunkel und hell, 200 % Zoom (je mit Messung des waagerechten Überlaufs);
  Einstellungen auf ru und tr; Bedienung mit Maus und Tastatur und Klickbarkeit der
  Dropdown-Einträge (1440 px auf `#/dashboard`, 390 px auf `#/workboard`); reduzierte Bewegung;
  kaputte Speicherwerte; Projektwechsel F-860 (mit aktivem Filter vor dem Wechsel, Rückweg B → A).
  Die Spalte „Seite geladen“ steht direkt nach einem Sprachwechsel auf false: abgelesen wird,
  sobald die Überschrift in der neuen Sprache steht, das Bild lädt dann noch. Umgebungsnotiz: Der Leitstand beantwortete Anfragen zeitweise
  so langsam, dass Abrufe mit 5-s-Grenze (Poll, Roadmap) scheiterten; einzelne Aufnahmen zeigen
  deshalb „Roadmap konnte nicht geladen werden“ bzw. „Lädt…“. Dasselbe betraf einmal das Gate
  `check-f20-zustand-poll` (d), das beim Wiederholen grün war.

### Abnahme durch Stefan (Abweichungen von WS1a-8)
- Kopf: `overflow: visible` statt `hidden`, `z-index: 1`, Zuschnitt des Persona-Bilds am Öffner
  (`clip-path`), Status-Chip klickdurchlässig — nötig, damit Dropdown und Nutzerkarte bedienbar
  bleiben.
- `.card` ohne Schwebeschatten wirkt in allen Views (Vorlage `.panel`).
- `.lauf-kopfdaten td` bricht um, `.verbrauch-karte` scrollt in sich (Überlauf durch die neue Schrift).
- F-873: Hinweis-Kasten behalten oder ausblenden.

### Akzeptanzkriterien WS-1a
- **WS1a-1** i18n-Kern import-sicher (Node: de), Rückfall de → Schlüssel mit console.warn,
  Plural über Intl.PluralRules (ru 0/1/2/5/11–14/21 getestet).
- **WS1a-2** i18n-Gate in der Kette, je Regel ein Rotfall im Selbsttest.
- **WS1a-3** Tokens dunkel und hell aus der Vorlage; Kontrast in beiden Themes nach WCAG im
  Token-Gate (alle Textpaare 4,5:1), keine Ausnahme.
- **WS1a-4** Theme ohne Aufblitzen, gespeichert, kaputter Wert → dunkel, `theme-color` aus dem
  Token; Manifest auf `--bg` dunkel.
- **WS1a-5** `#/einstellungen` nach `d_einstellungen.png`, alle Texte über t() in vier
  Sprachen, Bewegungsschalter der Nutzerkarte bleibt.
- **WS1a-6** F-860: Unit-Test und Render-Nachweis (A, dann B: Daten von B).
- **WS1a-7** F-867: Theme, reduzierte Bewegung und Zoom im Klickfolge-Format.
- **WS1a-8** Keine Änderung an Sidebar, Kopf, Persona, `#/start`, Chat-Layout, Server, API;
  keine neue Abhängigkeit; keine zweite aria-live-Region.

## Stand WS-1b „Shell & Einstieg“ (30.09.2026)
Branch `feat/f725-ws1b-shell` (Worktree `../aiw-f725-ws1a`, Basis `1f9ddb2`), nicht committet.
- **Persona-Bild:** `public/leitstand/persona-gesicht.webp` ist `face.png` der Vorlage, verlustfrei mit
  `exact` (cwebp 1.2.1, 0 abweichende Bytes im Pixelvergleich, F-882).
- **Sidebar V10** (`index.html` #shell-sidebar): Wortmarke (Klick → Startfläche wie in der Vorlage),
  Navigation nach §5.2 mit den neuen Routen `#/roadmap`, `#/produktzyklus`, `#/brain`, `#/nutzung`;
  „Entwicklung“ mit den Untereinträgen Ausführungen und Auftrag & Start (F-879); „Zuletzt geöffnet“
  unter der Navigation; Illustration `assets/gear.webp` hinter den unteren Einträgen, am unteren Block
  verankert (F-865); unten Alle Produkte, Nutzung, Einstellungen, Profil, Workforce. Unter 700 px
  ausklappbares Menü. Texte über `data-i18n` (`uebersetzeDokument` in `i18n.js`); das i18n-Gate
  prüft diese Schlüssel jetzt auch in `*.html` (Regel 6, Selbsttest ergänzt).
- **Kopf V10** (#shell-kopf): Projektauswahl (`projekt-kontext.js`, ersetzt die Leiste
  #projekt-kontext) mit „+“ (öffnet das Anlegeformular, F-862), Persona-Knopf mit Statuszeile
  #persona-text-status (einzige aria-live-Region, vier Texte über t()), Sprachwahl, Hell/Dunkel
  (`theme.js`, synchron mit den Einstellungen), „Frag Jarvis“ (= #chat-umschalter, Chatspalte bis
  WS-8). Beide <select> übernehmen eine Tastaturauswahl erst mit Enter oder beim Verlassen (WCAG
  3.2.2). Tagline, Zitat, Partikel (`particle-drift.js` gelöscht), Nutzerkarte samt Dropdown und
  Status-Chip entfallen (F-878); der Bewegungsschalter bleibt auf `#/einstellungen`.
- **Persona:** `object-fit: contain` im Kopf (92 × 58, kleiner wie in der Vorlage) und am
  Chat-Avatar (wie `.bubble-persona`); Badge-Zoom, Augenkern-Overlay, Blickversatz, Lid/Blinzeln,
  Awakening und die Variante 'gross' entfallen (Vorlage hat sie nicht, F-881). Neu `persona-arrive`
  (0,7 s) bei jedem Seitenwechsel. Zustandsfarben über `data-persona-zustand` und die Tokens
  `--persona-denkt/-warten/-fehler` (Palette der Vorlage).
- **Startfläche** `#/start`: Eingang der Vorlage (drei Ebenen, Aufwachen ~2,2 s, „Enter the Rabbit
  hole ↗“ → `#/dashboard`), Wartezeile mit Plural, Einmal-pro-Sitzung-Regel unverändert; Shell
  ausgeblendet, solange sie offen ist (`data-eingang`).
- **Baustein „kommt“** (`kommt.js`, E-F44-1) und Seiten (`views/platzhalter.js`): Brain und
  Produktzyklus als Z-Seiten, Roadmap und Nutzung als Zwischenseiten mit Link (F-880).
- **Poll-Fehlerbanner** #poll-fehler als `.note.red`, Text über t(). **F-873:** Hinweis-Kasten der
  Einstellungen entfernt.
- **render-nachweis:** Schritt `animationenBei` (Motion-Nachweis).
- **Nachweise** `features/F44/nachweise/ws1b/` (kleine Matrix, F-876): `#/dashboard` bei 1440
  dunkel/hell, 390 dunkel, 200 % Zoom, ru; `#/brain`; Start bei 0/800/1600/2400 ms und reduziert;
  Kopf-Persona bei 0/350/700 ms und reduziert; Bedienung (Checkliste „nichts fällt weg“) bei 1024
  und 390 px; Projektwechsel über die Kopfauswahl (A → B, Daten von B; Tastatur-Bremse; Wechsel
  aus `#/runs/<id>`) gegen einen zweiten Leitstand mit Wegwerf-Projekt A und `../f25-testprojekt-b`;
  nach der Korrekturrunde zusätzlich Sidebar ans Ende gescrollt bei 1024 × 800, 1366 × 768 und
  200 % Zoom (dunkel und hell), hell 390, Produktzyklus/Roadmap/Nutzung und das Poll-Fehlerbanner.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal; F-876): alle drei „Nicht
  freigegeben“. Eine Korrekturrunde, eingearbeitet: `initKommt()` stand versehentlich im
  Kommentar von `app.js` (Sperre lief nie) — jetzt aufgerufen und mit `kommt.test.mjs` belegt; die
  Tastatur-Bremse der Kopf-<select> ist ein eigenes Modul `auswahl-bremse.js` mit
  `auswahl-bremse.test.mjs` (Escape verwirft, Alt+↓/Leertaste öffnen, Mausklick nach Pfeiltaste
  ließ Anzeige und aktives Projekt auseinanderlaufen); Projektwechsel aus einem Detail per
  `location.replace`; Register lädt beim Fokus neu, Fehler als sichtbare Option; „+“ bei laufender
  Anlage; F-865 (Illustration nicht mehr über der Hauptnavigation, Schein hinter den unteren
  Einträgen); Sprachwahl unter 420 px als Code; `title` an Persona-Knopf und „Frag Jarvis“;
  error-Tönung gedämpft; Wartezeile ohne Versatz und mit Einblendung; Enter ohne Fokus betritt die
  Startfläche; mobiles Menü schließt auch beim aktiven Eintrag; Kommentare. `render-nachweis` kann
  Anfragen blockieren (`anfragenBlockieren`, für das Fehlerbanner). Rest als Findings F-883 bis F-890.
- **Findings:** neu F-876 bis F-890; erledigt F-862, F-865, F-873, F-878.

### Akzeptanzkriterien WS-1b
- **WS1b-1** Sidebar und Kopf nach Vorlage V10, Nav-Anker für attention unverändert (f21-ws2).
- **WS1b-2** Eine aria-live-Region; vier Statustexte in de/en/tr/ru; i18n-Gate grün.
- **WS1b-3** Persona überall `object-fit: contain`, `persona-arrive` mit Motion-Nachweis, keine
  Farbliterale (f28).
- **WS1b-4** `#/start` nach Vorlage mit Motion-Nachweis, Wartezeile, Ziel `#/dashboard`.
- **WS1b-5** „kommt“ mit `aria-disabled`, per Tastatur erreichbar, ohne Wirkung.
- **WS1b-6** Kein heutiges Verhalten fällt weg (Checkliste im Bericht und in
  `nachweise/ws1b/bedienung`).
- **WS1b-7** `npm run check` und `npm run check:template` grün.

## Stand WS-2a „Entscheidungen & Roadmap“ (01.10.2026)
Branch `feat/f725-ws2a-entscheidungen-roadmap` (Basis `71ff28b`), nicht committet.
- **`#/attention` „Deine Entscheidungen“** (C1–C3, `views/attention.js`, `index.html`): Kopf wie
  die Vorlage (Dein Fokus, Titel, Einleitung über `data-i18n`), eine durchgehende Liste in der
  Reihenfolge Freigaben → Rückfragen → unbestätigte fehlgeschlagene Läufe → Startprobleme →
  Befunde P0/P1. Jede Zeile: Art als Eyebrow (Befund mit Priorität), Titel (Workflow-Ziel,
  Auftragstitel des Laufs, Workitem-Titel, sonst ID), ein Satz (Servertext `grund` oder
  Standardsatz; ID und Zeitpunkt dahinter), Pfeil. Die Zeilen sind Links auf `#/workflows/<id>`,
  `#/runs/<id>`, `#/workboard/<id>` — keine Schreibaktion auf der Seite. Startprobleme ohne
  Link mit Zeitstempel (Intl), laufId und Fehlertext. Die vier Sektionen
  `attention-abschnitt-*` und `attention-leer` bleiben (Gate f21-ws2), als Gruppen ohne
  Kartenrahmen; leer → unsichtbar, defekt → „nicht verfügbar“. „Die vier Quellen“ als Kacheln
  mit Zähler; Hinweis mit „Erneut laden“ bei defekter Quelle; Leerzustand „Für den Moment ist
  alles geklärt.“ mit Link zur Übersicht nur bei vier echt leeren Quellen. Auswahl, Reihenfolge
  und Titel baut die reine Funktion `baueEntscheidungen` (`attention-daten.js`, Test
  `attention-daten.test.mjs`); die Importzeile von `attention.js` ist unverändert.
- **`#/roadmap`** (D1–D4, `views/roadmap.js`; Zwischenseite in `views/platzhalter.js` entfernt):
  Rücklink, Eyebrow, „<Projektname> · Roadmap“, „Eintrag erfassen“ und Register „Projektakte“ mit
  „kommt“, Register Überblick/Roadmap. Meilensteingruppen (details/summary) mit Status und
  „x / y abgenommen“, Feature-Zeilen mit Symbol, Titel, ID und Status als Link ins
  Workboard-Detail. Wochenspalten 1–6 ausgegraut mit „Zeitplanung kommt“, keine Balken, keine
  Termine, keine Prioritätsspalte. Legende; „Noch nicht eingeplant“ aus
  `workitems?typ=FEATURE`. Zustände nicht_vorhanden / ungueltig (Anzahl, Texte aufklappbar) /
  Abruffehler (mit „Erneut laden“). Laden beim Betreten und bei Projektwechsel mit Überholschutz,
  nie aus dem Poll.
- **Reines Modul `public/leitstand/roadmap-anzeige.js`** (Test `roadmap-anzeige.test.mjs`):
  `roadmapZustand`, `aktuellerMeilenstein`, `zaehleMeilenstein`, `statusKategorie`,
  `meilensteinOffen`, `nichtEingeplant`.
- **F-854** (Ursache in `state/findings.md`): `holeRoadmap` über `holeJsonOderWirf`; ein
  Serverfehler erscheint nie als „keine Roadmap“. Die fachliche Lage von haushaltsbuch2 ist
  „ungültig“ (F-894).
- **F-891:** Illustration der Sidebar über Tokens; im hellen Theme links neben den Symbolen.
- **render-nachweis:** Option `anfragenAntworten` (feste JSON-Antwort je Glob-Muster) für
  Fachzustände, die das laufende Projekt nicht hat.
- **Nachweise** `features/F44/nachweise/ws2a/` (Skript `erzeuge-nachweis.mjs`, Leitstand dieses Worktrees auf Port 4381): `#/attention`
  und `#/roadmap` bei 1440 dunkel/hell, 390 dunkel, 200 % Zoom, ru, je Seitenanfang und
  Seitenende; Workitems blockiert; Roadmap blockiert, 404, nicht_vorhanden, ungueltig; Sidebar
  hell und dunkel (F-891). Kein waagerechter Überlauf.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal): alle drei „Nicht freigegeben“.
  Eine Korrekturrunde, eingearbeitet: `#/attention` lädt die Workitems bei Projektwechsel neu
  (alle drei Prüfer; Beleg `projekt-wechsel.test.mjs`, jetzt auch für die Roadmap-Seite);
  russische Quellennamen brechen in der Kachel um; die Übergänge der Roadmap folgen auch dem
  Bewegungsschalter (`data-reduzierte-bewegung`); die Wochenspalten passen bei 1440 px ohne
  Anschnitt; `<summary>` nur mit Phrasing-Inhalt; doppelte CSS-Regel zusammengeführt; Startproblem
  ohne Zeitstempel/Fehler ohne leeres `<time>`; nur für Screenreader sichtbare h2 je Gruppe;
  Fokus nach „Erneut laden“ auf der Überschrift; die Roadmap wartet nicht mehr auf die
  Feature-Workitems; Features ohne Akte ohne Link; `ungueltig` ohne Texte ohne leere
  Aufklappliste; Kopfkommentar `kommt.js`; Unit-Randfälle ergänzt. Nachweise ergänzt um
  Bedienung (Tastatur, „Erneut laden“, Meilenstein aufklappen, Feature öffnen), reduzierte
  Bewegung, Startproblem (mit HTML im Fehlertext, escaped), Leerzustand und defekte
  Aggregat-Quelle. Rest als F-895 bis F-897.
- **Findings:** neu F-891 (erledigt), F-892 bis F-897; erledigt F-854, F-889; F-880 Roadmap-Teil
  erledigt; F-885 auf P3.

### Prüfpunkte aus roadmap-anzeige.js (für WS-2b und WS-3)
- Aktueller Meilenstein: der erste mit Status LAEUFT, sonst der erste nicht abgeschlossene, sonst
  keiner.
- „x / y abgenommen“: x = Features mit Status ABGESCHLOSSEN, y = alle Features des Meilensteins
  einschließlich `keine_akte`.
- Eingeklappt ist nur ein abgeschlossener Meilenstein vor dem aktuellen; der aktuelle, alle
  späteren und jeder nicht abgeschlossene sind offen.
- Statuskategorien: ABGESCHLOSSEN → abgenommen; FEATURE_GATE → Deine Freigabe; LAEUFT,
  IN_ARBEIT, WORKSTREAM_SCHNITT_GENEHMIGT → in Arbeit; BLOCKIERT → Klärung; GEPLANT, ENTWURF,
  READY_FOR_TECH → geplant; ABGEBROCHEN; keine_akte → ohne Akte; alles andere → unbekannt.
- Anzeigezustand: nur die Fachergebnisse nicht_vorhanden, ungueltig (mit Fehlerliste) und ok
  (Meilensteine mit Feature-Listen) gelten; jede andere Antwort ist ein Fehler, nie „keine
  Roadmap“ (F-854).
- „Noch nicht eingeplant“: Features ohne Meilenstein; ohne Roadmap alle Features; bei ungültiger
  oder fehlerhafter Roadmap nicht prüfbar.

### Akzeptanzkriterien WS-2a
- **WS2a-1** `#/attention` nach `d_entscheidungen.png`, Reihenfolge und Ziele wie oben, keine
  Schreibaktion, Startprobleme mit Zeitstempel, laufId und Fehlertext (C3).
- **WS2a-2** Vier Sektionen und `attention-leer` erhalten, Importzeile (e) unverändert;
  f21-ws2 grün.
- **WS2a-3** Defekte Quelle sichtbar („nicht verfügbar“, Hinweis, Kachel), Leerzustand nur bei
  vier echt leeren Quellen.
- **WS2a-4** `#/roadmap` nach `d_/m_projekt_ai-workforce_roadmap.png` mit D1–D4; Z-Elemente
  mit `aria-disabled` und „kommt“, ohne Beispieldaten.
- **WS2a-5** F-854: Serverfehler nie als Leerzustand (Unit-Test und Nachweis).
- **WS2a-6** Texte in de/en/tr/ru, Plural über Intl.PluralRules; i18n-Gate grün.
- **WS2a-7** F-891 mit Nachweis; `npm run check` grün.

## Stand WS-2b „Übersicht“ (01.10.2026)
Branch `feat/f725-ws2b-uebersicht` (Basis `7530cbf`), nicht committet.
- **`#/dashboard` „Produktübersicht“** (Abschnitt B, `views/dashboard.js`, Vorlage d_/l_/m_uebersicht):
  Kopf (B1: Eyebrow, Projektname, „Aktueller Meilenstein“ bzw. alle abgeschlossen / keine Roadmap /
  ungültig / nicht ladbar; „Produkt bearbeiten“, „Architektur & Code“, „+ Eintrag erfassen“ als
  „kommt“), drei Karten (B2 Ring „x / y abgenommen“ mit Sprung zum Entwicklungsstand; B3 Aktuelle
  Rolle aus dem Fokus-Workflow; B4 Deployer als Z-Karte), Vier Werte (B5), Ziel dieser Version (B6,
  Vision unübersetzt, „Ziel schärfen“ und „Zielgruppe & Erfolgskriterien“ als Z), Einstieg
  Produktmanagement (`#/produktzyklus`), Deine nächsten Entscheidungen (B7, die ersten drei aus
  `baueEntscheidungen`, „Alle ansehen“ mit Gesamtzahl, Direktaktion = Link) und Die Workforce
  gerade (B8, „Als Nächstes vorgesehen“ als Z), Der Weg zum Produkt (B9, alle Meilensteine kompakt
  mit Status und „x / y abgenommen“, der aktuelle hervorgehoben, ohne Featurezeilen und Zeitachse),
  Entwicklungsstand (B10, offene P0–P2-Findings und offene Features des aktuellen Meilensteins,
  höchstens acht, Priorität lesend als Z, „Alle ansehen“, drei Kacheln mit offenen Workitems je
  Typ), Wer macht was (B11, Zuvor/Jetzt/Danach, erwarteter Output = `workflow.ziel`, „Letzter
  Worker · Modell: nicht beobachtet“), Zuletzt umgesetzt (B12,
  jüngster Lauf, sein Workflow über `auftragId`, Schritte als kleiner Ring), Was steckt dahinter
  (B13, drei Z-Knöpfe), Betrieb (B16, Läufe/Workflows/Startfehler mit Links, bis WS-5), Leerzustand
  B14 (keine Workitems, keine Roadmap und keine Workflows → „Auftrag beschreiben“, `#/projekt`). Jeder Block hat
  eigene Zustände (lädt, nicht verfügbar, Fehler); ein Block wird nur bei geändertem Inhalt neu
  geschrieben, damit der Poll-Tick keinen Fokus zerstört.
- **Laden:** Roadmap, alle Workitems und P0/P1 beim Betreten (Route jetzt in `dashboard.js`) und
  beim Projektwechsel, je mit Überholschutz, nie aus dem Poll. Der Fokus-Nachtrag lädt nicht aus
  dem Poll, sondern bei wechselnder Workflow-ID, beim Betreten der Seite und 30 s nach einem
  Fehlschlag (Korrekturrunde; Rest F-899).
- **Gemeinsames Fokus-Modul** `public/leitstand/fokus-daten.js` (`waehleFokusWorkflow`,
  `waehleLetztenLauf`, `ladeFokusNachtrag`, `schrittFolge`; Test `fokus-daten.test.mjs`). Logik
  unverändert aus `views/workboard.js` umgezogen, `ladeFokusNachtrag` liefert zusätzlich Worker und
  beobachtetes Modell aus der Laufakte. Das Workboard nutzt das Modul; Bento-Markup und Verhalten
  unverändert, Gate f21-ws2 grün. Keine Duplizierung nötig.
- **`#/nutzung`** (`views/nutzung.js`, F-880 ganz): Verbrauchskarte mit unveränderter Logik und
  unverändertem Markup aus der Übersicht, Seitenkopf über t(), Laden beim Betreten und beim
  Projektwechsel, erneuter Versuch per Klick auf den aktiven Zeitraum nach einem Fehler. Die
  Zwischenseite in `views/platzhalter.js` entfällt.
- **F-898** `#/attention`: Läufe, Startprobleme und Befunde je höchstens 5, „+ x weitere“
  (aria-expanded) klappt auf; Freigaben und Rückfragen vollständig; Zähler bleiben Gesamtzahlen.
- **F-895** `nichtEingeplant`: nur offene Features mit ID nach Roadmap-Regel. **F-896** Gate
  f21-ws2 (e) prüft die Herkunft (Import aus `attention-daten.js`) statt einer wörtlichen Zeile, mit
  Rot-Kalibrierung. **F-897** `kommtKnopf` mit optionalem Symbol („+ Eintrag erfassen“).
- **Nachweise** `features/F44/nachweise/ws2b/` (Skript `erzeuge-nachweis.mjs`, Leitstand dieses Worktrees
  auf Port 4381): `#/dashboard` 1440 dunkel/hell, 390 dunkel, 200 % Zoom, ru (je ganze Seite; ab 1280 px
  als Ausschnitt `#view-dashboard`, weil die Chatspalte bis WS-8 daneben steht und sonst die
  Seitenhöhe bestimmt), reduzierte Bewegung, Tastaturbedienung, Leerzustand B14, Roadmap blockiert,
  Aggregat defekt; `#/nutzung`; `#/attention` mit „+ x weitere“ zu/auf (aria-expanded false → true,
  Fokus bleibt); `#/workboard` als Regressionsbild. Kein waagerechter Überlauf.
  `render-nachweis`: `screenshotAusschnitt` zusammen mit `screenshotVollseite` erfasst die ganze Höhe.
- **Umbrüche als Container-Query** auf die Breite der Übersicht (nicht des Viewports): neben der
  Chatspalte ist der Hauptbereich bei 1440 px nur rund 744 px breit.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal): design-guardian und qa „Nicht
  freigegeben“, code-reviewer „Freigegeben mit Hinweisen“. Eine Korrekturrunde, eingearbeitet:
  Fokus-Nachtrag nach Fehlschlag erneut (30 s) und frisch beim Betreten; ein Wurf beim Rendern trifft
  nur seinen Block (`setzeBlock` mit try/catch); B7-Zähler nur bei vollständigen Quellen (sonst
  „Lädt…“ bzw. „nicht verfügbar“, nie eine Teilsumme); B7-Direktaktion je Art („Freigabe prüfen“,
  „Rückfrage klären“ …); B16 „Workflows“ führt zur Workflow-Liste (`#/runs`); Zahlen in Ring-Label
  und Zählern über Intl, Plural für die Schritte in B12; B12-Titel nie leer; ru einheitlich „веха“;
  Gate f21-ws2 (f): `dashboard.js` importiert aus `api.js` nur `hole*` (Rot-Fall geprüft);
  `render-nachweis` meldet einen fehlenden Ausschnitt und rechnet den Bildlauf ein; Kommentarköpfe
  `api.js`, `kommt.js`, `app.js`; Tests „Poll lädt nicht nach“, „späte Roadmap-Antwort des alten
  Projekts“ (Rot unter Mutation) und `kommtKnopf` mit Symbol; Nachweise 200 % als ganze Seite,
  reduzierte Bewegung, Tastatur. Zunächst nicht übernommen, weil der Auftrag es anders vorgab
  (F-903, F-904, F-905); nach Entscheidung des Challengers umgesetzt, siehe unten. Rest als F-902,
  F-906, F-907; F-899 und F-901 ergänzt.
- **Findings:** neu F-898 (erledigt), F-899 bis F-908 (F-903, F-904, F-905 erledigt); erledigt
  F-880, F-895, F-896, F-897.

### Entscheidungen Challenger (01.10.2026) zum Prüfpass WS-2b, umgesetzt
- **F-903 (BUG P2):** B14 nur bei leeren Workitems, Roadmap `nicht_vorhanden` und
  `zustand.workflows` als leerem Array; defekte oder vorhandene Workflows zeigen die normalen
  Blöcke (Test und Nachweis `dashboard-b14-wartender-workflow`).
- **F-904:** „Geplant“ zählt nur ENTWURF und READY_FOR_TECH.
- **F-905:** Die Vorgabe des Auftrags war falsch; jetzt nach Vorlage: B9 alle Meilensteine
  kompakt, B10 offene P0–P2-Findings und offene Features des aktuellen Meilensteins (höchstens
  acht, `waehleEntwicklungsstand` mit Unit-Test), Reihenfolge B10 vor B11. Nachweise neu.
- **F-908** (Node 22 in den Übergaben, `package.json` verlangt 24.x) neu, offen.

### Prüfpunkte aus der Übersicht (Regeln B1, B2, B5)
- **B1** „Aktueller Meilenstein“ = `aktuellerMeilenstein(roadmap)` (erster mit LAEUFT, sonst erster
  nicht abgeschlossener). Ohne ihn: „Alle Meilensteine sind abgeschlossen.“, „Noch keine Roadmap
  hinterlegt.“, „Die Roadmap ist ungültig …“ bzw. „… konnte nicht geladen werden.“ — nie leer.
- **B2** Ring „x / y abgenommen“ = `zaehleMeilenstein(aktueller Meilenstein)`: x = Features mit
  ABGESCHLOSSEN, y = alle Features des Meilensteins einschließlich `keine_akte`. Ungültige oder nicht
  ladbare Roadmap → „nicht verfügbar“.
- **B5** In Arbeit = `aktiverLauf.aktiv ? 1 : 0`; Deine Entscheidung = Anzahl
  `filtereAttentionWorkflows`; Abgenommen = x aus B2; Geplant = `zaehleGeplant` (Features des
  aktuellen Meilensteins mit ENTWURF oder READY_FOR_TECH; WORKSTREAM_SCHNITT_GENEHMIGT zählt wie
  in den Zeilen als „in Arbeit“, F-904). Eine
  defekte Quelle zeigt „nicht verfügbar“, nie 0; ohne aktuellen Meilenstein (keine Roadmap, alles
  abgeschlossen) steht „–“.

### Akzeptanzkriterien WS-2b
- **WS2b-1** `#/dashboard` nach d_/l_/m_uebersicht mit den Blöcken 1–13 (B1–B14, B16), keine
  Schreibaktion, Z-Elemente mit `aria-disabled` und „kommt“ ohne Beispieldaten.
- **WS2b-2** Regeln B1/B2/B5 wie oben (Unit-Tests `roadmap-anzeige.test.mjs`).
- **WS2b-3** Laden beim Betreten und Projektwechsel mit Überholschutz, nie aus dem Poll
  (`projekt-wechsel.test.mjs`); Fokus-Nachtrag nur bei ID-Wechsel.
- **WS2b-4** Ein Fehler in einem Block blendet die anderen nicht aus (Nachweise Roadmap blockiert,
  Aggregat defekt); B14 nur bei leeren Workitems und `nicht_vorhanden`.
- **WS2b-5** `fokus-daten.js` import-sicher mit Unit-Test; Workboard nutzt es, f21-ws2 grün.
- **WS2b-6** `#/nutzung` zeigt den Verbrauch (F-880); F-895, F-896, F-897, F-898 erledigt.
- **WS2b-7** Texte in de/en/tr/ru, Plural über Intl.PluralRules, Zahlen über Intl; i18n-Gate und
  `npm run check` grün.

## Stand WS-3a „Board & Listen“ (01.10.2026)
Branch `feat/f725-ws3a-board` (Basis `67e757c`), nicht committet.
- **Reines Modul `public/leitstand/entwicklung-daten.js`** (Test `entwicklung-daten.test.mjs`, kein DOM,
  kein I/O): `baueBoard(workitems, workflows, auftraege)` ordnet in dieser Prüfreihenfolge zu —
  a) abgenommen: Feature ABGESCHLOSSEN, Finding ERLEDIGT; b) braucht_dich: Feature FEATURE_GATE oder
  BLOCKIERT oder ein verknüpfter Workflow in `filtereAttentionWorkflows`; c) in_arbeit: Feature
  IN_ARBEIT oder WORKSTREAM_SCHNITT_GENEHMIGT oder ein verknüpfter, nicht terminaler Workflow (Status
  aus `FORTSETZBARE_WORKFLOW_STATUS`, `src/workflow/index.ts`: OFFEN, WARTET_FREIGABE, LAEUFT,
  KLAERUNG_ERFORDERLICH); d) geplant: Feature ENTWURF/READY_FOR_TECH, Finding OFFEN; e) außerhalb
  (nur Zahl). Verknüpfung `workflow.auftragId` → Auftrag (GET …/auftraege) →
  `workitem_referenz === workitem:<quelle>:<id>`. Je Spalte höchstens 12 Karten, P0 → P4, bei
  gleicher Stufe Feature vor Finding, sonst Quellreihenfolge; der Rest als Zahl je Listen-Tab.
  `sucheWorkitems` über id und titel ohne Groß-/Kleinschreibung.
- **`#/workboard` „Entwicklung“** (`views/workboard.js`, `index.html`, Vorlage d_arbeit_board,
  d_arbeit_features): Kopf „Arbeit im Überblick“ mit „Neu laden“ und „+ Eintrag erfassen“ (kommt,
  E7); Register Kanban-Board · Features · Bugs · Harness Improvements · Weitere (TECH_DEBT und
  PROCESS_IMPROVEMENT, E5) sowie Aufträge (`#/projekt`) und Ausführungen (`#/runs`) als Links;
  Titel und Einleitung je Register. Board: Darstellung „Kanban · Status“ echt, „Kanban · Priorität“
  (E2) und „Zeitleiste“ (E3) kommt (aria-disabled, ohne Beispieldaten); Ansicht-Chips
  Alles/Geplant/In Arbeit/Braucht dich/Abgenommen; Karte mit Typ, Priorität (nur Findings), Titel,
  Status und ID als Link ins Detail; Leerzustand je Spalte nach Vorlage; „+ x weitere“ springt in
  den passenden Listen-Tab mit Spaltenfilter (entfernbarer Chip); Zahl „außerhalb des Boards“;
  Hinweis, wenn Workflows oder Aufträge nicht verfügbar sind (die Karten stehen dann nur nach
  Status). Listen-Tabs: Serverfilter über `holeWorkitems(filter)` (Typ nur bei „Weitere“, Status,
  Priorität nicht bei Features), Suchfeld clientseitig. Parser-Befunde (E6) über Board und Listen.
  Detail und Click-to-Work funktional unverändert; das Detail findet ein Workitem jetzt auch in der
  ungefilterten Liste des Boards.
- **Laden:** Workitems und Aufträge beim Betreten der Seite, bei „Neu laden“ und beim Projektwechsel
  (F-860), je mit Überholschutz, nie aus dem Poll; ein Wechsel Board ↔ Detail lädt nicht erneut.
  Workflows aus dem bestehenden Poll-Abo; ein Tick schreibt Board bzw. Liste nur bei geändertem
  Inhalt.
- **Bento entfernt (F-892):** sechs Karten, Icons, Fokus- und Rollen-Cache, Roadmap-Abruf,
  Abnahme-Vorauswahl (F-916), `#workboard-bento` und die nur dort genutzten CSS-Regeln. Die von
  `views/projekte-uebersicht.js` mitgenutzten Regeln (`bento-fokus-*`, `bento-meta-*`) bleiben bis
  WS-6. `fokus-daten.js` bleibt (`views/dashboard.js`); der nur vom Bento genutzte Export
  `LEERER_FOKUS` ist entfernt. `views/workflows.js` unverändert.
- **F-913:** `waehleFokusWorkflow` wählt den ersten Eintrag aus `baueEntscheidungen` (Freigabe vor
  Rückfrage); Test gegen die alte Fassung rot.
- **Gate f21-ws2:** neu (h) — `entwicklung-daten.js` bezieht „Braucht dich“ aus
  `filtereAttentionWorkflows` und prüft `naechster.art` nicht selbst (beide Rotfälle geprüft);
  `entwicklung-daten.js` in der Syntaxprüfung (g). Kein Literal zieht um: alle IDs aus (a) bleiben
  in `index.html`, `holeWorkitems(filter)` bleibt in `workboard.js`.
- **`projekt-wechsel.test.mjs`:** Die Erwartung „Workboard lädt die Roadmap“ entfällt mit dem Bento;
  neu: Aufträge beim Wechsel, Betreten lädt Workitems und Aufträge, Poll lädt nichts nach, Board
  zeigt ein Finding mit wartendem Workflow unter „Braucht dich“, Board → Detail lädt nicht erneut.
- **Entscheidung (dokumentiert):** Features tragen keine Priorität (src/workboard/types.ts); sie
  stehen in einer Spalte wie in GET …/workitems hinter allen priorisierten Findings. Die Regel
  „bei gleicher Stufe Feature vor Finding“ greift damit erst, wenn Features eine Priorität bekommen.
  Mit vielen offenen Findings zeigt „Geplant“ deshalb kaum Features; „+ x weitere“ führt zu ihnen
  (Tab Features).
- **Nachweise** `features/F44/nachweise/ws3a/` (Skript `erzeuge-nachweis.mjs`, Leitstand dieses Worktrees
  auf Port 4381): `#/workboard` Board und Tab „Bugs“ bei 1440 dunkel/hell (Ausschnitt in ganzer Höhe),
  390 dunkel und 200 % (Viewport — die ganze Seite überschreitet die WebP-Höhe; bei 200 % zusätzlich
  Karten und Zeilen per Fokus in den Viewport geholt), ru; feste Antworten: „Braucht dich“ über den
  Auftrag mit Klick ins Detail, Workflow-Quelle defekt, Tab „Weitere“ mit Typ-Chips und Parser-Befund
  (HTML escaped), Tab „Features“ ohne Prioritätschips, Deep-Link mit „Schließen“ und erneutem Öffnen;
  Bedienung (Enter auf „Kanban · Priorität“ ohne Wirkung, Ansicht-Chips, „+ x weitere“, Suche,
  Spaltenfilter entfernen); `#/dashboard` als Regressionsbild (F-913). Kein waagerechter Überlauf.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal): alle drei „Nicht freigegeben“.
  Eine Korrekturrunde, eingearbeitet: Überholschutz der Liste beim Projektwechsel (`ladeListe` erhöht
  den Zähler auch auf dem Board und leert die Liste; Test „späte Listenantwort des alten Projekts“, rot
  unter der alten Fassung) — damit findet das Detail auf dem Board nie einen veralteten Listenstand;
  Karten öffnen das Detail über `navigiere` (auch nach „Schließen“); Verlassen der Seite wird an der
  Sichtbarkeit nach dem Routing erkannt (das Chat-Overlay friert das Board nicht mehr ein); der Poll
  rendert nur den sichtbaren Bereich; `baueBoard` unterscheidet „lädt“ (undefined) und „nicht
  verfügbar“ (null), die Ansicht nutzt das (leise Zeile bzw. Hinweis, neutraler Leertext in „In
  Arbeit“/„Braucht dich“); fällt ein gewählter Filterwert nach „Neu laden“ weg, lädt die Liste mit dem
  gültigen Filter neu; Listenzeile nach Vorlage (Symbol, Titel, „ID · Typ · Priorität“, übersetzter
  Status) mit Umbruch unter 560 px; Register mit gerader Linie, Kopfaktionen nebeneinander, mobile
  Kartentypografie; Regel c vor e dokumentiert und getestet (a > c, b/c > e); `Object.hasOwn` für
  Prioritäten; Gate (h) prüft auch den Aufruf und hat eine eingebaute Rot-Kalibrierung (h-kal);
  Tests „Neu laden“ und erneutes Betreten; Kommentarköpfe `attention-daten.js`, `kommt.js`,
  `api.js`. Nicht übernommen, als Findings: E2 lesend nach §4 Punkt 4 (F-917, Widerspruch zum
  Auftrag, Entscheidung Stefan), Auswahlfelder statt Chips (F-918), Aussagekraft des Boards und Länge
  der Liste nach „+ x weitere“ (F-919), Laden beim Projektwechsel ohne offene Seite (F-920, der
  Auftrag verlangt es), Karte mit Rolle/Fortschritt und Ladezustand im Detail (F-921, WS-3b). Der
  Ansicht-Chip bleibt beim Projektwechsel bewusst stehen (Darstellungswahl, kein Projektinhalt).
- **Entscheidung F-917 (Stefan, 01.10.2026):** E2 „Kanban · Priorität“ bleibt in F44 „kommt“ (deaktiviert,
  keine Daten), abweichend von `docs/design/abgleich-f725.md` §4 Punkt 4 (dort vermerkt); ein nur
  lesendes Prioritäts-Kanban wird im Fixpaket „Arbeitsfähigkeit“ (B5 Feature-Fluss) neu bewertet.
- **Findings:** neu F-913 (erledigt), F-914 bis F-921 (F-917 entschieden); erledigt F-892.

### Akzeptanzkriterien WS-3a
- **WS3a-1** `#/workboard` nach d_arbeit_board mit Kopf, Registern, Board-Modi (E2/E3 kommt),
  Ansicht-Chips, Spalten, Karten, Leerzuständen und „+ x weitere“; Z-Elemente mit `aria-disabled`
  und „kommt“ ohne Beispieldaten.
- **WS3a-2** Zuordnungsregel a–e mit Vorrang, Verknüpfung über den Auftrag, Begrenzung und
  Sortierung (Unit-Tests `entwicklung-daten.test.mjs`).
- **WS3a-3** Listen-Tabs mit Serverfilter und Suche (E4, E5), Parser-Befunde sichtbar (E6).
- **WS3a-4** Aufträge nur beim Betreten, „Neu laden“ und Projektwechsel, nie aus dem Poll
  (`projekt-wechsel.test.mjs`).
- **WS3a-5** Bento entfernt (F-892), F-913 erledigt; Detail und Click-to-Work unverändert,
  f21-ws2 grün.
- **WS3a-6** Texte in de/en/tr/ru, Plural über Intl.PluralRules, Zahlen über Intl; i18n-Gate und
  `npm run check` grün.

## Stand WS-3b „Detail & Click-to-Work“ (01.10.2026)
Branch `feat/f725-ws3b-detail` (Basis `1191231`), nicht committet.
- **Leseendpunkt Akte:** `src/feature-auftrag` `leseFeatureAkteAnzeige(inhalt, featureId)` auf demselben
  internen Leser `leseAkte` wie `baueAuftragAusFeatureAkte` (keine zweite Parse-Logik; der Auftragstext
  bleibt bitgenau, Snapshot-Test grün). `GET /api/features/<id>/akte` über den Multi-Projekt-Dispatcher
  (Logik `leseFeatureAkteFuerAnzeige` in `scripts/leitstand/routen-f35.mjs`): 400 bei ungültiger ID
  (F-595), 404 ohne Akte, 200 `{ status: 'ok', id, titel, featureStatus, ziel, nicht_ziele,
  akzeptanzkriterien }` bzw. 200 `{ status: 'unvollstaendig', id, grund }`. **Abweichung vom Auftrag:**
  Der Feature-Status heißt `featureStatus`, weil `status` schon den Antwortzustand trägt (ein Objekt
  kann den Schlüssel nur einmal führen). Gate `check-f35-ws1` (g) prüft die vier Fälle am echten
  HTTP-Pfad und dass kein Artefakt geschrieben wird. `api.js` `holeFeatureAkte` über
  `holeJsonOderWirf`.
- **Detail als ganze Seite** `#/workboard/<id>` (d_arbeit_f35, E8/E13): Übersicht (`#workboard-uebersicht`:
  Kopf, Register, Board, Listen) ausgeblendet, „← <Register>“ führt zum zuletzt aktiven Register
  zurück. Kopf mit Typ · ID, Titel, „Ergebnis prüfen“ (nur wenn der verknüpfte Ablauf ABGESCHLOSSEN ist
  und noch keine gültige Abnahme-Entscheidung hat — Regel wie `views/workflows.js`
  renderAbnahmeEntscheidung, Link auf `#/workflows/<id>`), „Eintrag bearbeiten“ und „Insights ansehen“
  als kommt; Statuszeile (Status, Phase, „Gerade dran“); „Auftrag vorbereiten“; „Wer macht was“
  (Zuvor/Jetzt/Danach über `schrittFolge`); „Was soll möglich werden“ (Feature: Ziel aus der Akte;
  Finding: „Was funktioniert nicht?“ bzw. „Was soll besser werden?“ mit Beschreibung, Fundstelle,
  Auswirkung, Maßnahme, Feature/Run); „Stand der Entwicklung“ (Schritte, x/y, Fortschrittsbalken);
  „Woran wir ein gutes Ergebnis erkennen“ (AKs der Akte, bei unvollständiger Akte Grund und Pfad;
  Finding: Hinweis, dass die Kriterien im Auftrag entstehen; Nicht-Ziele aufklappbar); „Einordnung &
  Quelle“; rechte Spalte „Deine Produktplanung“ (Priorität bzw. „Ohne Priorität“, Meilenstein aus der
  Roadmap nur lesend; Zeitfenster, Ändern, „Planung speichern“ als kommt); „Insights & Erkenntnisse“
  als Z-Element ohne Beispielkarten. Die IDs `workboard-detail`, `-titel`, `-inhalt`, `-schliessen`,
  `workboard-bearbeitung` bleiben. Gerendert in `views/workboard-detail.js` (rein, ohne fetch und
  DOM; Test `workboard-detail.test.mjs`).
- **Nachtrag des Details** (`detailNachtrag`): beim Öffnen Akte und Roadmap (Features), Schritte des
  verknüpften Ablaufs (`holeWorkflowDetail`) und bei ABGESCHLOSSEN die Abnahme. Verknüpfung wie das
  Board (`baueVerknuepfung`, `verknuepfterWorkflow`: wartend vor nicht terminal vor dem letzten). Ist sie
  beim Öffnen noch nicht bestimmbar (Deep-Link vor Poll bzw. Aufträgen), lädt der erste Tick, der sie
  bestimmbar macht. **Entscheidung im Prüfpass:** Danach lädt ein Tick nur bei einem Übergang nach —
  ein anderer Ablauf wird maßgeblich (etwa nach „Auftrag vorbereiten“; dann lädt die Seite auch die
  Aufträge einmal neu, ereignisgetrieben) oder der maßgebliche wechselt seine Phase
  (`<workflowId>|<Phase>`); ein Tick ohne Übergang lädt nichts (Tests). So widersprechen Statuszeile,
  „Wer macht was“ und „Stand“ dem Click-to-Work-Bereich nicht. Ein Poll-Tick schreibt Kopf, Statuszeile,
  Inhalt und den Click-to-Work-Bereich nur bei geändertem HTML (aufgeklappte Abschnitte und der Fokus auf
  „Freigeben“ bleiben). Ladezustand beim Deep-Link bis zu den Workitems (F-921); im Fehlerzustand ein
  eigenes „Erneut laden“, ohne Eintrag keine Z-Knöpfe.
- **Click-to-Work (E9–E12):** Einstieg heißt „Auftrag vorbereiten“ (IDs `#workboard-bearbeiten` bzw.
  `#workboard-bauen` unverändert); Verhalten, Phasen, Freigabe (`empfehlungIds`, feste Begründung
  F-375) unverändert. Vorschlag, Konflikt 409 („Es läuft bereits eine Ausführung.“ mit „Wiederholen“),
  Fehler, Kette und Git-Block „Commit / Push / PR“ im Stil V10, Texte über i18n einschließlich der
  Platzhalter im Git-Block (Server- und Projekttexte escaped). Nach einem Zustandswechsel geht der
  Fokus auf die Überschrift bzw. den Hinweis des neuen Zustands (ohne zweite Live-Region). **F-922
  (Entscheidung Challenger, 01.10.2026, reversibel):** „Auftrag vorbereiten“ ist gesperrt (disabled,
  aria-disabled, Hinweis über i18n, Link „Ablauf öffnen“), solange ein verknüpfter Workflow nicht
  terminal ist (`laufenderWorkflow`, dieselbe Statusmenge wie das Board) oder eine Abnahme offen ist
  (dieselbe Angabe wie „Ergebnis prüfen“); solange die Verknüpfung lädt, ebenfalls. Klasse
  `wb-freigeben` bleibt, der Installierbar-Hinweis steht weiter direkt davor
  (`empfehlung-anzeige.test.mjs`). Die Kette zeigt Rollennamen.
- **F-914:** `public/leitstand/rollen-anzeige.js` (`rollenName`, gemeinsame Spalte `werSpalte`) für die
  neun Rollen aus `ROLLENVERTRAEGE`; genutzt in B3/B11, Detail und Kette.
- **F-919 (teilweise):** Sortierung P0, P1, Features, P2, P3, P4, ohne Priorität; „Alle x anzeigen“ mit
  der Zahl der ganzen Spalte im Ziel-Tab. Offen: „Abgenommen“ nach Erledigungsdatum (F-915).
- **F-920:** Projektwechsel bei geschlossener Seite setzt nur zurück; das nächste Betreten lädt.
- **F-921:** Karte zeigt die Phase des verknüpften Ablaufs aus dem Aggregat (ohne x/y).
- **F-918 entschieden:** Filter-Chips bleiben (gleiche Funktion, Gate-IDs, keine Datenänderung).
- **Gate f21-ws2:** (f) gilt auch für `views/workboard-detail.js` (kein schreibender Request, aus api.js
  höchstens hole*, kein fetch/document/window, Rot-Kalibrierung (f-kal)); (g) prüft zusätzlich
  `views/workboard-detail.js` und `rollen-anzeige.js`. Kein Literal zieht um.
- **render-nachweis:** optional `methode` je fester Antwort (GET und POST auf `/api/auftraege` getrennt).
- **Akten:** `docs/design/abgleich-f725.md` Vermerk zu E11 (die Git-Befehle gibt es seit F22 AK6; offen
  war nur der Stil).
- **Nachweise** `features/F44/nachweise/ws3b/` (Skript `erzeuge-nachweis.mjs`, Leitstand dieses Worktrees auf
  Port 4381, feste Antworten): Detail Feature (Akte mit AKs, abgeschlossener Ablauf mit offener Abnahme)
  und Detail Finding bis zum Click-to-Work-Vorschlag, je 1440 dunkel und hell, 390 dunkel, 200 %, ru;
  dazu Feature ru-390 und mit reduzierter Bewegung; Konflikt 409 mit „Wiederholen“; Finding nach
  „Freigeben“ bis „abgeschlossen“ mit Git-Block (1440 dunkel, 390 hell), „Ablehnen“ und Freigabe-Fehler;
  `#/workboard` 1440 dunkel gegen echte Daten (ganze Seite und sichtbarer Ausschnitt, F-919/F-921, „Alle
  x anzeigen“ in den Tab); `#/dashboard` 1440 dunkel (F-914). Kein waagerechter Überlauf.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal): design-guardian und qa „Nicht
  freigegeben“, code-reviewer „Freigegeben mit Hinweisen“. Eine Korrekturrunde, eingearbeitet: Detail
  folgt Click-to-Work und Phasenwechseln (Aufträge nach dem Anlegen neu, Nachladen bei Übergang, Tests);
  Fokus nach Zustandswechsel und Schreiben nur bei geändertem HTML; Tests 409 → „Wiederholen“ (genau ein
  Auftrag), späte Akte nach Projektwechsel, Übergang lädt genau einmal; Phase „Deine Abnahme“ bei offener
  Abnahme, Phasen-Label im Stil der Vorlage, nur eine Primäraktion; Git-Platzhalter und Skill-Name über
  i18n; „Erneut laden“ im Fehlerzustand; keine Z-Knöpfe ohne Eintrag; `pruefeAkte` prüft die Einträge;
  Zwischenspeicher für „Ergebnis prüfen“; JSDoc `featureStatus`; Gate (f) für das Render-Modul;
  fehlende Nachweis-Zustände ergänzt. Nicht übernommen, als Findings: doppelter Auftrag (F-922,
  danach per Challenger-Entscheidung im selben Paket erledigt), Hash nach Projektwechsel (F-923), Feature-Ordner außerhalb des Musters (F-924),
  URIError im Router (F-925), Zurück und History (F-926), Modellzeile/weitere Abläufe/fehlende Quelle im
  Detail (F-927), Größe von `workboard.js` (F-928). Eine zweite Live-Region (`aria-live` am
  Click-to-Work-Bereich, Vorschlag qa) bleibt ausgeschlossen (Invariante: eine Live-Region).
- **Findings:** neu F-922 (erledigt, Sperre) und F-923 bis F-928 (offen); erledigt F-914, F-920, F-921;
  F-918 entschieden; F-919 teilweise (offen bleibt die Sortierung von „Abgenommen“). Aus den Fragen
  Stefans (Challenger, 01.10.2026) neu F-929 bis F-933 (Fixpaket Arbeitsfähigkeit, Baustein 1 bzw. F-930
  nach F30).

### Akzeptanzkriterien WS-3b
- **WS3b-1** `GET /api/features/<id>/akte` lesend (400/404/200 ok/unvollständig, kein Artefakt), derselbe
  Leser wie der Bau-Auftrag (Gate `check-f35-ws1` (g), `feature-auftrag.test.ts`).
- **WS3b-2** `#/workboard/<id>` als ganze Seite nach d_arbeit_f35 mit allen Abschnitten, Leer-, Lade- und
  Fehlerzuständen; Z-Elemente `aria-disabled` mit „kommt“ ohne Beispieldaten (`workboard-detail.test.mjs`).
- **WS3b-3** Nachtrag nur beim Öffnen, nie aus dem Poll; Ladezustand beim Deep-Link
  (`projekt-wechsel.test.mjs`).
- **WS3b-4** Click-to-Work mit „Auftrag vorbereiten“, Verhalten unverändert, Texte über i18n; Gate f21-ws2
  und `empfehlung-anzeige.test.mjs` grün.
- **WS3b-5** F-914, F-920, F-921 erledigt, F-918 entschieden, F-919 teilweise.
- **WS3b-6** Texte in de/en/tr/ru, i18n-Gate und `npm run check` grün.

## Stand WS-4a „Ablauf & Freigabe“ (01.10.2026)
Branch `feat/f725-ws4a-ablauf` (Basis `5b0b683`), nicht committet.
- **Detail als ganze Seite** `#/workflows/<id>` (d_workflow_neu; F2, F12): „← Alle Aufträge“, Eyebrow
  „Auftrag & Ablauf“, Titel = `ziel` (Rückfall `workflowId`), Unterzeile der Vorlage. Liste, Startfehler und
  Läufe sind ausgeblendet (Klasse `workflow-seite-offen` an `#view-runs`, nicht deren `hidden`).
  „Der Weg zum Ergebnis“ als Timeline in Planreihenfolge (`ordneSchritteNachPlan`): je Schritt Rollenname
  (`rollen-anzeige.js`), Status als Satz, „Verantwortung: <worker>“ und bei ZWINGEND „Start nur mit deiner
  Freigabe“; am vom Server genannten Schritt eine Marke je `naechster.art`; außerhalb der Kette
  ausgewiesen; keine Zweck-Sätze je Rolle. Rechte Spalte „Auf einen Blick“: Status (Lage), Projekt,
  aktueller Schritt (Cursor, ohne Cursor `naechster.schrittId`), Verantwortung („Du“ bei einem Halt, sonst
  die Rolle; `status` LAEUFT hat Vorrang wie bei der Lage). Alles reine Anzeigeabbildung von `status` und
  `naechster.art` (`LAGE_JE_AUSGANG`, `KATEGORIE_JE_AUSGANG`, `MARKE_JE_AUSGANG`).
- **Aktionen** unter der Timeline nur nach `naechster.art` bzw. `status`: haltFreigabe → „Nächsten Schritt
  freigeben“ (Dialog), starte → „Starten“ (direkt), stoppbarer Status bei gültiger Fassung → „Ausführung
  stoppen“ (Dialog). Architekt-Entscheidung, Sichtung und Reparatur stehen funktional und im Markup
  unverändert im bisherigen Bedienblock (Restyling WS-4b; Gate f42 bindet
  `renderArchitekturEntscheidung`); ohne fällige Bedienung bleibt der Block leer.
- **Dialog** `#workflow-dialog` (nativ, `showModal`, außerhalb der vom Poll ersetzten Container; F3, F3b,
  F4, F5, F10): Inhalt beim Öffnen aus dem aktuellen Detail. Freigabe: fälliger Schritt, `renderEmpfehlung`
  samt „Freigeben & installieren“ (`bindeEmpfehlungInstallation` am Dialog), Pflichtfeld
  `wf-freigabe-begruendung`, Installierbar-Hinweis direkt vor „Freigeben & starten“
  (`data-empfehlung-ids` aus `empfehlungIdsFuerFreigabe`, „Anzeige = Start“), „Ablehnen“ (ABGELEHNT,
  dieselbe Pflichtbegründung, Freigabe-Veto) und „Abbrechen“. Stopp: Pflichtfeld `wf-stopp-begruendung`,
  „Stoppen“, „Abbrechen“. Ändert sich das Bedienungs-Kennzeichen bei offenem Dialog, schließt er mit „Der
  Stand hat sich geändert — bitte erneut prüfen.“ (Fokus auf die Meldung; kein Nachladen in den offenen
  Dialog); eine angefangene Begründung steht beim erneuten Öffnen desselben Halts wieder im Feld (F-809,
  ohne Empfehlung im Vergleich). Kein `aria-live` im Dialog; Fehler (Pflicht, 409, 4xx) stehen im Dialog,
  der offen bleibt (Fokus auf Feld bzw. Meldung); Erfolg schließt ihn, die Meldung steht am Ablauf und
  bekommt den Fokus. Escape und „Abbrechen“ schließen ohne Wirkung; verlässt der Hash das Detail,
  schließt der Dialog ebenfalls. Freigeben und Ablehnen sind während der Anfrage gemeinsam gesperrt.
- **F12** `<details>` „Technischer Ablauf & Serverentscheidung“ außerhalb der ersetzten Container (bleibt
  beim Poll offen): Kopfdaten samt Lage, Verdikt und Grund, Schritttabelle mit Cursor, fällig, „läuft
  jetzt“ und `workflow-lauf-verweis` (waagerecht scrollbar statt Wortbruch).
- **F0** `#/runs` mit V10-Seitenkopf (Eyebrow „Produktentwicklung“, „Ausführungen“, „Auftrag anlegen“ →
  `#/projekt`) und der Liste „Aufträge“ (`#workflows-abschnitt` bleibt): Zeile nach d_arbeit_verlauf —
  Titel = Ziel, darunter `workflowId` als code mit Fassung und Cursor, bei einem Halt-Grund der Grund;
  rechts Lage und Pfeil; die ganze Zeile führt zu `#/workflows/<id>`. Ein Poll-Tick schreibt die Liste
  nur bei geändertem HTML (Fokus bleibt). Leerzustand („Noch keine Aufträge mit Ablauf.“) und
  Fehlerzustand („Aufträge nicht verfügbar.“, keine Entwarnung) im Stil V10. Startfehler und Läufe
  unverändert darunter (WS-5); keine Register-Tabs.
- **F-926-Muster (Workflow-Detail):** „← Alle Aufträge“ geht per `history.back()` zurück, wenn der vorige
  Eintrag `#/runs` war, sonst per `navigiere`; danach liegt der Fokus auf der Zeile des Workflows (ohne
  Zeile auf der Seitenüberschrift). Der Workboard-Teil von F-926 ist nicht mitgebaut.
- **Modulschnitt:** `views/workflow-detail.js` (rein rendernd, ohne api.js, in Node ohne DOM importierbar;
  Test `views/workflow-detail.test.mjs`: Timeline-Reihenfolge, Zyklus, Statusabbildung, Aktionen,
  Escaping, Leer- und Fehlerzustand, F12). In `views/workflows.js` bleiben Laden, Kennzeichen, Dialog und
  alle POST-Aufrufe; Abnahme (`renderAbnahme*`, `renderUrteil`, `renderAenderungsuebersicht`,
  `renderPruefergebnis`) und `renderArchitekturEntscheidung` sind nicht verschoben (WS-4b, Gates f23/f42).
- **F-874, F-923:** `views/workflows.js` abonniert `abonniereProjektWechsel`: Dialog, Detail, Bedienzustand
  und offener Reparaturentwurf werden verworfen, der Hash geht ohne neuen Eintrag auf `#/runs`
  (`router.js` `ersetzeRoute`: `history.replaceState` plus `dispatch`); dasselbe für ein offenes
  `#/workboard/<id>` → `#/workboard`. Der Wechsel über den Kopf ersetzte den Hash schon vorher
  (`shell.js` `DETAIL_ROUTEN`); die Hooks gelten für jeden Wechselweg. `projekt-wechsel.test.mjs` um beide
  Fälle ergänzt (Rotfall belegt). F-885 bleibt offen.
- **F-925:** `router.js` `dispatch` dekodiert vor dem Umschalten; ein URIError führt ohne neuen Eintrag auf
  die Standardroute, kein onEnter sieht den kaputten Wert (`router.test.mjs`).
- **i18n:** alle angefassten Texte als Schlüssel `ablauf.*` in de/en/tr/ru (Seitenkopf, Liste, Lage,
  Timeline, Auf einen Blick, Aktionen, Dialog, Meldungen, F12). Serverwerte (`grund`, `ziel`, IDs, Status,
  Worker) bleiben roh. Unverändert deutsch bleiben die Texte der Blöcke von WS-4b (Architekt, Sichtung,
  Reparatur, Abnahme).
- **Gates:** f15 liest `views/workflows.js` und `views/workflow-detail.js` zusammen; `<h2>Workflows</h2>`,
  „Fassung ungültig“, „läuft jetzt“ und „(hält nicht an)“ sind Schlüssel — das Gate prüft je Schlüssel im
  Code und deutschen Wörterbuchwert (`verlangeText`, Rotfall belegt); (f) prüft die Syntax des neuen
  Moduls. f20-leitstand-shell (CI): die Klickfolge öffnet zuerst den Dialog, dann wird die Begründung
  gesetzt. Tokens: `--dialog-backdrop`, `--danger-line`, `--timeline-glanz` (hell eigener Wert).
- **render-nachweis:** `anfragenAntworten` auch je Schritt (Vorrang ab diesem Schritt),
  `warteAufSelector.zustand` und je Schritt `ohneAusschnitt`.
- **Nachweise** `features/F44/nachweise/ws4a/` (Skript `erzeuge-nachweis.mjs`, Leitstand dieses Worktrees
  auf Port 4381, feste Antworten): Liste `#/runs` und Detail im Freigabe-Halt mit Katalog-Empfehlung samt
  offenem Dialog, je 1440 dunkel und hell, 390 dunkel, 200 %, ru; Liste → Detail → „← Alle Aufträge“ mit
  Fokus auf der Zeile; Dialog mit Pflichtmeldung und 409; Dialog schließt bei Stand-Änderung; Ablehnen;
  Stoppen-Dialog (Pflicht, Escape; 1440 und 390); Detail „läuft“; Detail KLAERUNG_ERFORDERLICH mit altem
  Bedienblock; F12 aufgeklappt (bleibt nach Poll-Ticks offen); reduzierte Bewegung.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): code-reviewer und qa
  „Freigegeben mit Hinweisen“, design-guardian „Nicht freigegeben“ (knapp). Eine Korrekturrunde, eingearbeitet:
  - **Dialog während einer laufenden Bedienung gesperrt** (Escape über `cancel`, „Abbrechen“, Schließen,
    erneutes Öffnen; alle Knöpfe disabled): genau ein POST. Die Antwort gehört zu Workflow, Projekt und Dialog
    beim Absenden — nach einem Wechsel wird sie verworfen (keine Meldung von A unter B, kein Schließen eines neu
    geöffneten Dialogs). Eine Stand-Änderung während der Anfrage schließt den Dialog erst mit der Antwort
    (kein kurzes „Stand geändert“ über der eigenen Entscheidung); ein Fehler bei geändertem Stand steht am Ablauf.
  - **Fehlerzustand des Details** (404, 500, Netz): Timeline, Blick, Aktionen und F12 geleert, kein Dialog aus dem
    alten Stand, der Bedienblock nur ausgeblendet (angefangene Begründungen überstehen einen kurzen Fehler); der
    Fehler flackert bei Poll-Ticks nicht mehr.
  - **Nur die Empfehlung geändert** (etwa nach „Freigeben & installieren“ im Dialog): eigene Meldung im Stil
    Hinweis, die Begründung steht beim erneuten Öffnen wieder im Feld; ein Dialog anderer Art lässt die gerettete
    Begründung liegen.
  - **F4/F5 übersetzt** (`empfehlung-anzeige.js`, `empfehlung-installation.js`; Schlüssel `empfehlung.*`,
    `installation.*`, deutsche Texte wortgleich, Pluralformen über `Intl`), „Wird genutzt“/„Passt, nicht im Lauf“
    als Ankreuzliste mit disabled-Checkboxen (rein anzeigend, „Anzeige = Start“ unverändert), Knöpfe im Stil
    `.button`. Gilt auch im Workboard-Vorschlag (WS-3b), dort derselbe Baustein.
  - **Design:** Timeline-Text 12/10 px in `--muted` wie die Vorlage; Listenzeile ≤ 700 px mit Status und Pfeil
    untereinander, h3 18 px, Status 9 px; „Auf einen Blick“ ≤ 700 px einspaltig; kein Dialogschatten; der vom
    Server genannte Schritt ist „current“ (amber) auch nach seinem Lauf (Rückfrage des Architekten).
  - Strg/Cmd-Klick auf eine Zeile öffnet einen neuen Tab; `ersetzeRoute` setzt den Merker des Routers zurück.
  - **Tests:** `views/workflows-dialog.test.mjs` (Stand-Änderung mit geretteter Begründung, Sperre und genau ein
    POST, späte Antwort verworfen, 409 im Dialog, Ladefehler; Rotfall belegt), Timeline im Klärungsfall.
  - **Nachweise ergänzt:** hell 390 (Liste, Freigabe-Dialog), Tab-Fokus im Dialog, Deep-Link 404 (bleibt nach
    Poll-Ticks stehen), Installation im Dialog mit geretteter Begründung, Spalte „Fokus-ID“.
  Nicht übernommen: die Reihenfolge Bedienblock vor der Aktionszeile und der Satz „siehe Block ‚Bedienung‘ oben“
  in der Abnahme (beides WS-4b, Prüfpunkt unten); `workflows.js` schneiden und `tx()` zusammenführen (F-935);
  Browser-Zurück bei offenem Dialog verwirft die Begründung ohne Rückfrage (Klasse F-885, offen).

### Akzeptanzkriterien WS-4a
- **WS4a-1** `#/workflows/<id>` als ganze Seite nach d_workflow_neu (Timeline, Auf einen Blick, Aktionen,
  F12), Liste/Startfehler/Läufe ausgeblendet; reine Anzeigeabbildung von `status`/`naechster.art`
  (`workflow-detail.test.mjs`).
- **WS4a-2** Freigabe, Ablehnen und Stoppen nur über den Dialog mit Pflichtbegründung; „Anzeige = Start“
  (`data-empfehlung-ids`), Fehler im offenen Dialog, Schließen bei Stand-Änderung; Gates f15 und
  f20-leitstand-shell (CI), `empfehlung-*.test.mjs` grün.
- **WS4a-3** `#/runs` mit Seitenkopf und Liste „Aufträge“ samt Leer- und Fehlerzustand; Startfehler und
  Läufe unverändert.
- **WS4a-4** F-874, F-923, F-925 erledigt; F-926 für das Workflow-Detail (`projekt-wechsel.test.mjs`,
  `router.test.mjs`).
- **WS4a-5** Texte in de/en/tr/ru (einschließlich F4/F5), i18n-Gate und `npm run check` grün; Render-Nachweise
  liegen vor.

### Prüfpunkte für WS-4b (aus dem Prüfpass WS-4a)
- Reihenfolge: In der Vorlage steht die Aktionszeile direkt unter der Timeline; heute liegt der bisherige
  Bedienblock (Architekt, Sichtung, Reparatur) dazwischen.
- Die Abnahme sagt im Freigabe-Halt „siehe Block ‚Bedienung‘ oben“ — die Freigabe liegt seit WS-4a in der
  Aktionszeile bzw. im Dialog.
- Die Texte der Blöcke von WS-4b (Architekt, Sichtung, Reparatur, Abnahme) sind noch deutsch.

## Stand WS-4b „Klärung, Reparatur & Abnahme“ (01.10.2026)
Branch `feat/f725-ws4b-abnahme` (Basis `493d953`), nicht committet. Vorlage V10 d_abnahme_f35 (d/m/l),
d_workflow_klaerung; Abgleich F-725 F6, F8, F9, F13–F18 (Vermerk §5.1). Die drei Prüfpunkte aus WS-4a sind
erledigt: Notizen stehen über der Timeline, die Aktionszeile direkt darunter; kein Verweis auf „Block
‚Bedienung‘“ mehr; alle Texte in de/en/tr/ru.
- **Abnahme (F13–F18)** auf `#/workflows/<id>`, ohne neue Route. Die Lage kommt allein aus GET …/abnahme
  (`abnahmeLage`). **Regel (Entscheidung Challenger 01.10.2026):** „Passt das Ergebnis?“ steht nur bei
  `workflowStatus` ABGESCHLOSSEN ohne aktuelle Entscheidung (ANGENOMMEN erlaubt); erlaubt der Server sonst
  eine Aktion (heute ABGELEHNT/ANPASSUNG_ANGEFORDERT bei KLAERUNG_ERFORDERLICH, vor und nach dem Bau, auch im
  Sichtungs-Halt), steht unter der Timeline der kompakte **vorab**-Block mit nur den erlaubten Knöpfen und
  demselben Pflichtfeld — „Ergebnis ablehnen oder Anpassung wünschen“ samt „Geänderte Dateien“ und
  „Prüfbericht & Nachweise“ als `<details>`, wenn die Ausführung gelaufen ist, sonst „Auftrag ablehnen oder
  Anpassung wünschen“ —, sonst die Zeile „Deine Abnahme folgt …“. Im Fall „entscheidbar“ steht über der Timeline
  der Abschnitt „Dein letztes Wort · Passt das Ergebnis?“ mit Status „Deine Abnahme fehlt“: Notiz „Empfehlung
  des Code Reviewers“ (Urteil übersetzt, `empfehlung` roh, Farbe je Urteil), „Vereinbart & überprüft“ aus
  `ak_urteile` (Symbol plus Text, Nachweis = `beleg`), Befunde als Liste (Schwere, Fundstelle,
  Zusammenfassung, Beleg), `<details>` „Geänderte Dateien · n Dateien“ (heutige Tabelle) und „Prüfbericht &
  Nachweise“ (Prüfergebnis, F16 „Prüfung wiederholen“ nach unveränderter Regel; bei wiederholbarer Prüfung
  aufgeklappt) und „Deine Entscheidung“ inline (Pflichtfeld `wf-abnahme-begruendung`, „Ergebnis abnehmen“,
  „Anpassung wünschen“, „Ablehnen“; Klasse `wf-abnahme-aktion` und `data-aktion` unverändert; bei ABGESCHLOSSEN
  sind alle drei erlaubt). **Offen** (Freigabe-Halt,
  gestoppt ohne Entscheidung): eine Zeile „Deine Abnahme folgt, wenn Umsetzung und Prüfung abgeschlossen
  sind.“ unter den Aktionen (`#workflow-abnahme-stand`). **Entschieden**: kompakte Zeile mit Ergebnis,
  Begründung und Datum (Intl); F18 „Automatisch angelegt · Iteration n/3 · Start erfordert deine Freigabe“ als
  Notiz nur bei `erzeuger` `kern`. Eine **veraltete** Entscheidung bleibt als Hinweis sichtbar (Audit-Spur,
  F-384). Greift die F-656-Regel außerhalb des Abschnitts, steht die Prüfzeile mit Knopf auch dort.
  Kein erfundener Text „Was sich verbessert hat“ (der Seitenkopf trägt das Ziel). Die Nicht-ok-Texte von
  Urteil, Änderungsübersicht und Prüfergebnis sind inhaltlich gleich, nur übersetzt.
- **Auf einen Blick:** sobald GET …/abnahme da ist, „Review-Urteil“ (bei vorhandenem Urteil, Statuspunkt)
  und „Deine Abnahme“ (Noch offen bzw. Ergebnis) mit dem Hinweis der Vorlage („‚Ausführung erfolgreich‘ heißt
  nur …“). Detail und Abnahme kommen über getrennte Endpunkte; `zeichneBlick` setzt beide zusammen.
- **Kennzeichen:** Die Abnahme wird nur bei echter Änderung neu gebaut (Kennzeichen um Halt,
  Entscheidungsversion und Review-Lauf erweitert); wird sie bei gleichem Workflow neu gebaut, steht eine
  angefangene Begründung wieder im Feld (samt Fokus). Nach einer Abnahme bekommt die Meldung den Fokus; eine
  Antwort zu einem inzwischen geschlossenen Workflow wird verworfen. Beim Ladefehler des Details wird die
  Abnahme nur ausgeblendet.
- **Klärung (F6):** Notiz „Jarvis braucht deine Entscheidung.“ mit der ersten Frage (bei mehreren „und n
  weitere“) und „Rückfrage beantworten“. Der Knopf öffnet `#workflow-dialog` mit der Art `klaerung`: das
  Formular aus `renderArchitekturEntscheidung` (Optionen als Radio-Karten mit Vor- und Nachteilen, die
  Empfehlung per Titel vorgewählt, eigene Begründung je Frage, „Entscheidung speichern“). Sperre während des
  POST, Schließen bei Stand-Änderung und Verwerfen später Antworten wie bei der Freigabe; eine nur geänderte
  Katalog-Empfehlung schließt Rückfrage und Sichtung nicht (`dialogUeberholt`).
- **Sichtung (F9, F-768):** Notiz „Abgelehnte Befehle sichten“ (Schritt, Lauf mit Verweis auf das
  Lauf-Detail) und „Sichtung bestätigen“; Dialog `sichtung` mit dem Rest des bisherigen Satzes (Nachfolger,
  Folgen), Pflichtfeld `wf-sichtung-begruendung` und „Sichtung bestätigt – weiter“. `bestaetigeSichtung`
  unverändert, nur aus dem Dialog (Sperre, Fehler im Dialog).
- **Reparatur (F8):** Notiz rot „Dieser Ablauf ist nicht gültig. Start und Freigabe sind gesperrt.“ bei
  ungültiger Fassung, sonst bernstein „Der Ablauf steht.“ (GESTOPPT, KLAERUNG_ERFORDERLICH), Knopf „Ablauf
  reparieren“. Der Editor bleibt inline unter der Notiz (`#workflow-reparatur`, der Poll fasst ihn nicht
  an), neuer Stil, Warnungen F-219/223/226/240/384 inhaltlich gleich als Schlüssel `reparatur.warnung.*`;
  IDs `wf-reparatur-*` unverändert. Die Überschrift „Bedienung“ entfällt.
- **Modulschnitt (F-935 erledigt):** `views/workflow-abnahme.js` (Abnahme, Blick-Zeilen) und
  `views/workflow-eingriffe.js` (Notizen, Dialoginhalte Freigabe/Stopp/Rückfrage/Sichtung, Reparatureditor,
  `baueReparaturEntwurf`, `ermittleAbgeschwaechteFreigabenAnzeige`, `ermittleReparaturWarnungen`) — beide rein,
  ohne schreibende api.js-Funktion, in Node ohne DOM importierbar, mit Tests `workflow-abnahme.test.mjs` und
  `workflow-eingriffe.test.mjs`. In `views/workflows.js` (jetzt unter 1 000 Zeilen) bleiben Bedienlogik,
  Kennzeichen, Dialogsteuerung und alle POSTs; Meldungen über ein gemeinsames `zeigeMeldung`.
- **tHtml (F-935, F-940 erledigt):** `i18n.js` exportiert `tHtml(schluessel, werte, htmlWerte)` =
  escapeHtml(t(…)) mit optionalen HTML-Platzhaltern; die fünf lokalen `tx()` und `txHtml` sind ersetzt.
  `scripts/check-f44-i18n.mjs` (6) prüft literale `t(` und `tHtml(`, Selbsttest (7) mit Rotfällen; 626 statt
  300 geprüfte Aufrufe, kein Schlüssel fehlte.
- **Restpunkte WS-4a:** Timeline ohne „Läuft · läuft jetzt“ (aktiver laufender Schritt: „Läuft jetzt“);
  Worker lesbar über `worker.<id>` mit Rückfall auf die ID (`workerName`, Zwillingstest gegen `WORKER` in
  `src/workflow/index.ts`), in der F12-Tabelle roh; die disabled-angekreuzte Checkbox der Katalog-Empfehlung
  selbst gezeichnet (Tokens `--check-rand`, `--check-haken`, Kontrastpaare im Token-Gate, hell 5,05:1);
  F-926 Workboard-Teil („← <Register>“ per `history.back()` aus der Übersicht, Fokus auf Karte bzw. Zeile).
- **i18n:** alle angefassten Texte als Schlüssel `abnahme.*`, `eingriff.*`, `reparatur.*`, `worker.*` in
  de/en/tr/ru; Serverwerte (`grund`, `beleg`, `befunde`, `empfehlung`, Pfade, IDs, Statuswerte) bleiben roh.
- **Gates:** f15 liest zusätzlich `workflow-eingriffe.js` und `workflow-abnahme.js`; (h) „Ablauf reparieren“
  und die Warnungen als Schlüssel plus de-Wert, `reicheWorkflowFassungEin(koerper)` wörtlich in
  `views/workflows.js`; (f) prüft die Syntax beider Module. f42 (i) liest die Datei, in der
  `renderArchitekturEntscheidung` liegt (Begründung im Gate-Kopf, Rotfall belegt). Token-Gate: neue
  Kontrastpaare. `empfehlung-anzeige.test.mjs` liest den Freigabedialog in `workflow-eingriffe.js`.
  `workflows-dialog.test.mjs` um `klaerung` und `sichtung` ergänzt (Sperre, Stand-Änderung; Rotfall belegt).
  f23, f652, f656: Server unverändert.
- **Nachweise** `features/F44/nachweise/ws4b/` (Skript `erzeuge-nachweis.mjs`, leert vor dem Lauf nur die
  eigenen Folge-Ordner; Leitstand dieses Worktrees auf Port 4381, feste Antworten; Workboard mit echten
  Daten).

- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): alle drei „Freigegeben
  mit Hinweisen“. Eine Korrekturrunde, eingearbeitet:
  - **Abnahme gesperrt während des POST** (alle Knöpfe, „Prüfung wiederholen“ und das Feld; kein Neu-Rendern
    bis zur Antwort): genau ein POST. Eine späte Antwort nach einem Wechsel wird verworfen; die Sperren des
    alten Workflows (Dialog, Abnahme) blockieren einen neuen nicht.
  - **Sichtung nur für den angezeigten Halt** (gleiche `lauf_id`, sonst 409 im Dialog, kein POST).
  - **Meldung beim richtigen Block:** über der Timeline nur in der Lage „entscheidbar“, sonst unter der Timeline
    (vorab, entschieden, Prüfung wiederholen); Abnahme-Felder mit `aria-describedby` auf die Meldung.
  - **Robustheit:** fehlende Änderungsübersicht gilt als nicht gelaufen; fehlende `optionen`/`vorteile`/
    `nachteile`/`dateien` brechen nichts; das Abnahme-Kennzeichen gilt erst nach gelungenem Rendern; das
    Kennzeichen der Rückfrage enthält die Fragetexte; ein Fehler bei geändertem Stand rettet die Begründung;
    die späte Antwort der Reparatur wird verworfen; der Ladefehler blendet auch die Abnahme-Meldung aus.
  - **Design:** Zahlen in „Geänderte Dateien“ brechen nicht um (`.abnahme-dateien`), Abstand des Hinweises
    „Frühere Entscheidung“, Mono-Schrift über `--font-family-mono`, Knöpfe bei 390 px in natürlicher Breite,
    „(+n weitere Fragen)“ statt „und n weitere“; `rollen-anzeige.js` nutzt `tHtml`.
  - **Tests:** `workflows-dialog.test.mjs` um Abnahme-Sperre, späte Antworten (Abnahme, Rückfrage), Rettung der
    Begründung beim Wechsel vorab → entscheidbar und Sichtung mit anderem Lauf (je Rotfall belegt).
  - **Nachweise ergänzt:** Wechsel vorab → entschieden, vorab auf Türkisch, Klärung auf Englisch, Spalte
    „Fokus-name/Wert“ (Fokus auf der vorgewählten Option).
  Nicht übernommen: die Dialogsteuerung als eigenes Modul (F-941, `views/workflows.js` knapp unter 1 000
  Zeilen); bei 1440 px rutscht „Ablehnen“ in eine zweite Zeile und bei 200 % Zoom stehen die Werte in „Auf
  einen Blick“ etwas höher als ihre Beschriftungen — beides folgt aus der Spaltenbreite bzw. dem Raster aus
  WS-4a (Prüfpunkt unten). Die Fachfrage aus dem QA-Pass (Sichtungs-Halt nach dem Bau mit
  „Passt das Ergebnis?“) ist entschieden: siehe Regel oben (nur bei ABGESCHLOSSEN).

### Akzeptanzkriterien WS-4b
- **WS4b-1** Abnahme in vier Lagen (entscheidbar, vorab, offen, entschieden) nach d_abnahme_f35 auf `#/workflows/<id>`; Nicht-ok-Texte inhaltlich
  gleich; F16 und F18 unverändert (`workflow-abnahme.test.mjs`).
- **WS4b-2** Klärung und Sichtung als Notiz mit Dialog (Sperre, Stand-Änderung, späte Antwort); Reparatur als
  Notiz mit Editor inline; IDs unverändert (`workflows-dialog.test.mjs`, `workflow-eingriffe.test.mjs`, f15).
- **WS4b-3** Modulschnitt und `tHtml`; `views/workflows.js` unter 1 000 Zeilen; i18n-Gate prüft `tHtml(`.
- **WS4b-4** Restpunkte WS-4a erledigt (Timeline, Worker, Checkbox-Kontrast, F-926 Workboard).
- **WS4b-5** Texte in de/en/tr/ru, `npm run check` grün; Render-Nachweise liegen vor.

### Prüfpunkte für WS-5 (aus dem Prüfpass WS-4b)
- Hauptspalte der Seite `#/workflows/<id>` (aus WS-4a) ist schmaler als in der Vorlage: bei 1440 px rutscht
  „Ablehnen“ in eine zweite Zeile; bei 200 % Zoom stehen die Werte in „Auf einen Blick“ etwa 10 px höher als
  ihre Beschriftungen.
- F-941: Dialogsteuerung aus `views/workflows.js` in ein eigenes Modul schneiden, bevor weitere Bedienung dazukommt.

## Stand WS-5a „Ausführungen“ (01.10.2026)
Branch `feat/f725-ws5a-ausfuehrungen` (Basis `772f4e5`), nicht committet. Vorlage V10 d_arbeit_verlauf,
d_ausfuehrung_failed (d/m/l); Abgleich F-725 G1–G9, F7 (Vermerk §5.1). Nur Leitstand-UI, keine Serveränderung.
- **Register** unter `#/runs` (d_arbeit_verlauf, nur die zwei echten): „Aufträge“ = `#/runs` (Standard, Liste
  `#workflows-abschnitt` unverändert) und „Ausführungen“ = `#/ausfuehrungen` (View `runs`). Reiter als Links mit
  `aria-current` und `.active`. Abweichung von §5.2: `#/runs/<laufId>` matcht `[^/]+` und würde mit einer laufId
  „ausfuehrungen“ kollidieren. Der Sidebar-Eintrag „Ausführungen“ führt nach `#/ausfuehrungen` (Name = Register);
  ru/tr nutzen durchgehend einen Begriff („Запуски“, „Çalıştırmalar“). Übersicht (B16: Läufe, Startfehler), Reiter „Ausführungen“ der Entwicklung und der
  Projektwechsel auf einem Lauf-Detail (`shell.js` `DETAIL_ROUTEN`, `runs.js` Hook) führen nach `#/ausfuehrungen`.
- **G1 Register „Ausführungen“:** Hinweisnotiz der Vorlage, Linienliste: Titel = `auftragsbezug.titel` (sonst
  laufId), darunter laufId als code, Kettenintegrität nur bei Bruch (rot), rechts Statuspunkt (Erfolgreich,
  Fehlgeschlagen, Verweigert, Klärung nötig, Läuft — „Läuft“ aus `zustand.aktiverLauf`, löst F-844), „Zur Kenntnis
  genommen“, Zeit über Intl, Pfeil; die ganze Zeile führt zu `#/runs/<laufId>` (Strg/Cmd-Klick neuer Tab). Worker und
  Rolle stehen nicht in der Liste (F-942). Der Poll schreibt Liste und Startfehler nur bei geändertem HTML. Leer-
  und Fehlerzustand im V10-Stil, keine Entwarnung bei `null`. Startfehler als Abschnitt im Register, gleiche Daten.
- **Lauf-Detail `#/runs/<laufId>` als Seite** (d_ausfuehrung_failed, Muster `#/workflows/<id>`): „← Alle
  Ausführungen“ (F-926: `history.back()` aus der Liste, Fokus auf der Zeile, sonst `navigiere`), Eyebrow „Ein
  Arbeitsschritt“, h1 = Auftragstitel (sonst laufId), Unterzeile je Lage, Statuspunkt rechts; Spalte „Einordnung“:
  Auftrag, Rolle (`kontextpaket.rolle`, lesbar), Worker (`workerName`), Ergebnis, Zeit (letzter gültiger Checkpoint).
  Kopf, Register und Workflow-Seite blendet die Klasse `lauf-seite-offen` an `#view-runs` aus.
- **Notiz je Lage** (`ermittleLaufLage`, Regeln von `renderEntscheidungBlock` F-828 inhaltlich exakt, `hatBypassVerdacht`):
  a) Fehler (FEHLGESCHLAGEN, VERWEIGERT ohne Bypass): rot, Status neutral benannt, G3 „Ursache in Klartext“ als
  Baustein „kommt“, vorhandene Servertexte roh (`non_execution_kind`, abgelehnte Werkzeuge); „Fehler zur Kenntnis
  nehmen“ (G6) und „Fortsetzung vorbereiten“ (G7); schon zur Kenntnis genommen (`kenntnisgenommen` aus dem Aggregat) →
  Zeile statt Knopf. b) Klärung (nicht aktiv): bernstein, `grund` roh, „Klärung auflösen“ (G8) und Fortsetzung.
  c) Rückfrage (F7, VERWEIGERT mit Bypass-Verdacht, auch aktiv): Bypass-Daten, „Rückfrage beantworten“ und
  Fortsetzung; im Nachlauf (aktiv) zusätzlich „Lauf abbrechen“ und keine Fortsetzung. d) läuft: „Stand beim Öffnen
  (Uhrzeit)“, „Aktualisieren“ und „Lauf abbrechen“ (G9); nach einem angeforderten Abbruch steht der Knopf gesperrt
  „Abbruch angefordert“, bis der Lauf nicht mehr aktiv ist. e) erfolgreich: keine Aktion. Der Abbruch hängt wie vorher
  an `detail.aktiv`, nicht an der Lage. „Aktualisieren“ gibt es in jeder Lage (lädt das Detail neu, F-363 bleibt). „Fortsetzung vorbereiten“
  folgt der bisherigen Wiederaufnahme-Regel (D-F10-1), nicht solange der Lauf aktiv ist; `wendeWiederaufnahmeAn`
  unverändert. „Einordnung“ ohne die Zeile „Abnahme · Separat erforderlich“ der Vorlage (die Abnahme hängt am Auftrag,
  nicht am Lauf; dafür „Zeit“).
- **G2 „Was passiert ist“:** Timeline aus `detail.checkpoints` nach `sequenz`; Titel je typ über Schlüssel
  (`lauf.passiert.typ.*`, Wirkungsmarke je Art) mit Rückfall auf den rohen typ, Unterzeile `lineage.beschreibung` roh
  (ungültig: Gründe), Meta Zeit (Intl), Schritt, Ergebnis, Artefakt; Punkt rot bei ungültig, bernstein bei stale und
  beim letzten Eintrag eines nicht erfolgreichen Laufs.
- **G4/G5 Aufklappbereiche** (`<details>` außerhalb der neu gezeichneten Container, bleiben beim Aktualisieren offen):
  „Auftrag, Kontext & Nachweise“, „Worker, Modell & Herkunft“ (Laufakte, Werte roh, Modelle mit Rang), „Technisches
  Protokoll“ (Klärzustand-Tabelle, Rohstrom, Checkpoint-Tabelle samt Kettenintegrität und Zahl gültiger Checkpoints aus
  den Kopfdaten des Servers — die Daten der entfallenen Kopfdaten-Tabelle der Liste; die Tabelle scrollt waagerecht
  statt mitten im Wort zu brechen), „Tatsächlich verwendete Fähigkeiten“ (Zeile Beobachtung, echt, kein „kommt“).
- **Dialog `#lauf-dialog`** (nativ, außerhalb der Container; G6, G8, F7, G9) mit eigener kleiner Steuerung in
  `views/runs.js` (F-941 nicht geschnitten): Fokus auf dem Pflichtfeld (Abbruch: „Zurück“), Escape, genau ein POST
  (Sperre: Knöpfe, Felder, Escape, „Abbrechen“, Wiederöffnen), Fehler (Pflicht, 400) im offenen Dialog, Erfolg → Dialog
  zu, Meldung mit Fokus, `pollJetzt`, Detail neu. Späte Antworten zu einem anderen Lauf oder Projekt werden verworfen
  (F-860); ein geänderter Stand (Aktualisieren, Kenntnisnahme im Aggregat) schließt einen offenen Dialog mit „Der Stand
  hat sich geändert“. Kenntnisnahme und Klärung mit Pflichtbegründung, Rückfrage mit Pflichtantwort; der Abbruch ist
  eine Bestätigung **ohne** Grundfeld (der Endpunkt speichert keinen Grund). Keine Live-Region im Dialog.
- **Prüfpunkte WS-4b** auf `#/workflows/<id>` im gemeinsamen Raster behoben (gilt auch für das Lauf-Detail): ab 1280 px
  steht die Chatspalte dauerhaft daneben (bis WS-8); `.workflow-seite` ist deshalb ein Container — bei höchstens 900 px
  Seitenbreite (und Viewport über 800 px) bekommt die Seitenspalte 220 px statt 285 px, „Ablehnen“ steht bei 1440 px
  in einer Zeile. Im zweispaltigen Raster (≤ 800 px, 200 % Zoom) haben Beschriftung und Wert denselben Abstand und
  dieselbe Grundlinie. Die Reviewer-Notiz nennt keinen Schema-Pfad mehr (`abnahme.empfehlung.lauf`, vier Sprachen).
- **Modulschnitt:** `views/lauf-detail.js` (rein rendernd, ohne api.js, in Node ohne DOM importierbar; Test
  `views/lauf-detail.test.mjs`); `views/runs.js` (567 Zeilen) behält Laden, Dialogsteuerung und alle POSTs
  (Test `views/runs-dialog.test.mjs`); `runs.test.mjs` prüft die Lageregeln F-828 und D-F10-1. `views/workflows.js`
  nur um die Route `#/ausfuehrungen` ergänzt (schließt die Workflow-Seite). Alte Kartenregeln (`.lauf`,
  `.startfehler-eintrag`, `#lauf-detail` mit Monospace) entfernt.
- **i18n:** 163 Schlüssel `lauf.*`, `ausfuehrung.*` in de/en/tr/ru, Plural und Datum über Intl; Serverwerte (grund,
  laufId, typ, Pfade, Statuswerte in Tabellen, beobachtung, Worker/Modell der Laufakte) roh.
- **Gates:** f12 (f)/(g) lesen `views/lauf-detail.js` und prüfen Schlüssel plus de-Wert (Label↔Feld gepaart und
  escaped, keine unqualifizierte „Modell“-Zeile; `auftrag_fehlt` genau einmal escaped über `t()` mit rohem
  `{auftragId}`), Rotfälle belegt; f15 (f) Syntaxprüfung des neuen Moduls (Rotfall belegt), (c) unverändert;
  f20-leitstand-shell (CI): die Klickfolge öffnet zuerst „Klärung auflösen“, IDs und POST unverändert; i18n-Gate grün.
- **Nachweise** `features/F44/nachweise/ws5a/` (Skript `erzeuge-nachweis.mjs`, leert nur die eigenen Folge-Ordner;
  Leitstand dieses Worktrees auf Port 4381, feste Antworten): 13 Folgen, 47 WebP — Matrix je Darstellung (1440
  dunkel und hell, 390 dunkel, 200 %, ru) über `#/ausfuehrungen`, `#/runs` mit Reitern, Lagen a, c, d und
  `#/workflows/<id>` mit Abnahme; Dialog 390 hell; Kenntnisnahme (Pflicht, Erfolg, Zeile statt Knopf), Klärung mit
  400 im Dialog und Escape, Rückfrage, Abbruch, „← Alle Ausführungen“ mit Fokus auf der Zeile, alle Aufklappbereiche
  (bleiben nach „Aktualisieren“ offen), Leer- und Fehlerzustand, Detail 404. Kein waagerechter Überlauf.

- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): alle drei „Nicht freigegeben“.
  Eine Korrekturrunde, eingearbeitet:
  - **Bypass-Fall im Nachlauf** (code-reviewer K1, qa 1): „Lauf abbrechen“ fehlte, „Fortsetzung“ erschien bei aktivem
    Lauf — jetzt Abbruch an `aktiv`, `darfFortsetzen(…, aktiv)`; Test in `runs.test.mjs` (Rotfall belegt).
  - **Abbruch angefordert** (qa 2): gesperrter Knopf statt erneut bedienbar (`runs-dialog.test.mjs`, Rotfall belegt).
  - **Zustand beim Verlassen der View** (code-reviewer V2): ein Hash außerhalb von `#/runs`, `#/ausfuehrungen`,
    `#/runs/<id>`, `#/workflows/<id>` schließt das Detail (späte Antworten verworfen, kein veralteter
    `history.back()`); **Generation** je Laufwechsel (A → B → A verwirft die alte Antwort). Beides getestet, Rotfälle belegt.
  - **Fortsetzung getestet** (code-reviewer V4, qa AT-2): Vorbelegung über `wendeWiederaufnahmeAn`, 404 als Meldung
    mit Fokus, späte Antwort nach Laufwechsel verworfen.
  - **Fokus statt Live-Region** für Fehler außerhalb des Dialogs, der Fortsetzung und des nicht ladbaren Details; der
    Fehlerzustand blendet das leere Gerüst aus (Klasse `lauf-nicht-ladbar`) und eine alte Meldung.
  - **Kettenintegrität vom Server** (Kopfdaten) statt eigener Rechnung; bei defekter Quelle bleibt `kenntnisgenommen`
    beim letzten Stand; verworfene Antworten als `console.warn`; Zahlen im Rohstrom escaped; Timeline-Sortierung robust.
  - **Design:** Listenzeilen bei 200 % rücken als Ganzes um statt Zeichen für Zeichen (`.lauf-zeile`, `.workflow-zeile`);
    Checkpoint-Tabelle ohne Wortbruch; Timeline-Uhrzeit ohne Sekunden; Sidebar „Ausführungen“ → `#/ausfuehrungen`,
    Begriffe in ru/tr vereinheitlicht; tote Regeln `.wiederaufnahme-btn`/`.details-btn` entfernt.
  - Nachweise neu erzeugt (alle Folgen).
  Nicht übernommen (Prüfpunkte unten): Wiederholen-Knopf im Fehlerzustand, Ergebnis einer Bedienung nach Navigation
  während der Anfrage, zweimal Escape in Chrome, „beantwortet“-Marke in Lage c, Text der Lage d im Nachlauf,
  Fokusverlust bei geänderter Liste.

### Akzeptanzkriterien WS-5a
- **WS5a-1** Register „Aufträge“ (`#/runs`) und „Ausführungen“ (`#/ausfuehrungen`) als Links mit `aria-current`;
  Übersicht B16 und Projektwechsel führen nach `#/ausfuehrungen`.
- **WS5a-2** Liste nach d_arbeit_verlauf (Titel, laufId, Bruch, Status inkl. „Läuft“, Kenntnisnahme, Zeit) samt
  Startfehlern, Leer- und Fehlerzustand; Schreiben nur bei geändertem HTML (`lauf-detail.test.mjs`, `runs-dialog.test.mjs`).
- **WS5a-3** Lauf-Detail als Seite nach d_ausfuehrung_failed mit Notiz je Lage a–e, Timeline, Einordnung und vier
  Aufklappbereichen; Lageregeln F-828 unverändert (`runs.test.mjs`); Checkpoints und Kettenintegrität sichtbar.
- **WS5a-4** Kenntnisnahme, Klärung, Rückfrage und Abbruch nur über `#lauf-dialog`: Pflichtangaben, genau ein POST,
  späte Antworten verworfen, Stand-Änderung schließt (`runs-dialog.test.mjs`, Rotfälle belegt).
- **WS5a-5** Prüfpunkte WS-4b erledigt (Ablehnen in einer Zeile bei 1440 px, Werte auf Höhe bei 200 %, kein
  Schema-Pfad).
- **WS5a-6** Texte in de/en/tr/ru, Gates f12, f15, i18n und `npm run check` grün; Render-Nachweise liegen vor.

### Prüfpunkte für WS-5b
- F1, G10, G11 in `#/projekt` nach d_auftrag_neu; „Fortsetzung vorbereiten“ landet dort (Vorbelegung über
  `wendeWiederaufnahmeAn`) — die Vorbelegung muss im neuen Formular sichtbar bleiben.
- In Lage a stehen drei Knöpfe; bei schmaler Hauptspalte rutscht „Aktualisieren“ in eine zweite Zeile.
- Aus dem Prüfpass WS-5a (qa): Fehlerzustand des Details ohne „Erneut laden“; das Ergebnis einer Dialog-Bedienung geht
  verloren, wenn man während der Anfrage die Seite verlässt (Verhalten festlegen); zweimaliges Escape während einer
  hängenden Anfrage im echten Chrome nachprüfen; Lage c kennt nach einer gespeicherten Antwort kein „beantwortet“
  (Server liefert kein Merkmal); Lage d im Nachlauf zeigt oben das Ergebnis, die Notiz „läuft noch“; ändert sich die
  Liste, geht der Fokus einer Zeile verloren (wie bei „Aufträge“).
- F-942 (Worker und Rolle in der Liste), F-363/F-365 (Detail nicht gepollt; ein 400 bei veraltetem Stand steht
  jetzt im Dialog, „Aktualisieren“ holt den Stand) und F-941 (gemeinsames Dialogmodul) bleiben offen.

## Stand WS-5b „Auftrag & Direktstart“ (01.10.2026)
Branch `feat/f725-ws5b-auftrag` (Basis `a91029d`), nicht committet. Vorlage V10 d_auftrag_neu; Abgleich F-725 F1,
G10, G11 (Vermerk §5.1); Entscheidung E-F44-3 = A. Nur Leitstand-UI, keine Serveränderung.
- **`#/projekt` als Seite** (Route unverändert): „← Alle Aufträge“ (F-926-Muster: kam die Seite direkt aus `#/runs`,
  `history.back()`, sonst `navigiere('#/runs')`), Eyebrow „Ein klarer Auftrag“, h1 „Was soll deine Workforce
  erledigen?“, Beschreibung, Schrittanzeige 1 Auftrag · 2 Ablauf prüfen · 3 Freigeben als Liste mit
  `aria-current="step"` am aktuellen Schritt (Schritt 3 findet auf `#/workflows/<id>` statt).
- **Formular:** Titel (→ `titel`, `#auftrag-titel`), „Gewünschtes Ergebnis“ (→ `auftragstext`,
  `#auftrag-auftragstext`), `<details>` „Kontext hinzufügen · optional“ mit freiem Feld `#auftrag-kontext`; ist es nicht
  leer, wird es als Absatz mit der festen Zeile „Kontext:“ (Projektinhalt, nicht übersetzt) an den Auftragstext
  gehängt (`baueAuftragstext`). Notiz der Vorlage, primär „Ablauf vorbereiten“, sekundär „Lieber mit dem Coach
  besprechen“ als Baustein „kommt“ (Chat-Dock folgt in WS-8). Abweichung von der Vorlage: kein Feld „Relevante
  Dateien oder Nachweise“ im Kontext — Evidenzdateien gehören zum Direktstart (G10), der Kontext ist freier Text.
- **„Ablauf vorbereiten“** (Muster Click-to-Work, klein und lokal; `views/workboard.js` unverändert): POST …/auftraege
  → bei 201 POST …/auftraege/<id>/routen → bei 202 Schritt 2 „Jarvis bereitet den Ablauf vor …“ mit Auftrag und laufId
  (Fokus auf der Notiz, keine Live-Region). Gewartet wird über das Zustands-Aggregat (`abonniere`, kein eigener Timer):
  erscheint `router-<auftragId>` in `zustand.workflows`, navigiert die Seite nach `#/workflows/router-<auftragId>` —
  dort gibt der bestehende Dialog (F3) frei, eine zweite Freigabe-UI gibt es nicht —, und die Felder werden geleert.
  Ein Startfehler mit genau dieser laufId → rote Notiz mit dem Fehler roh und „Erneut versuchen“; 409 (D13) →
  bernsteinfarbene Notiz mit `grund` roh und „Erneut versuchen“; eine andere Antwort oder ein Netzfehler beim Routen →
  rote Notiz. „Erneut versuchen“ routet nur denselben Auftrag neu, legt nie einen zweiten an. Fehler beim Anlegen
  (≠ 201) → `#auftrag-anlegen-fehler` mit Fokus, Eingaben bleiben. Während der Anfrage sind beide Anlege-Knöpfe
  gesperrt, genau ein POST je Klick. „Neuen Auftrag beschreiben“ beendet die Vorbereitung ohne Serverwirkung (Text
  bleibt). Erscheint der Ablauf, während der Nutzer woanders ist, springt die Seite nicht; beim Zurückkommen steht
  „Der Ablauf ist vorbereitet“ mit dem Link „Ablauf prüfen“.
- **Projektwechsel** (F-860, Teil F-885): eine laufende Vorbereitung des alten Projekts wird verworfen (späte Antworten
  und Aggregat-Treffer gehen ins Leere), Schritt 1 erscheint; Titel, Ergebnis und Kontext bleiben stehen.
- **Direktstart** (G10, G11) als `<details id="direktstart">` „Einzelnen Arbeitsschritt direkt starten“ unter dem
  Hauptweg: Auftragsauswahl `#start-auftrag`, Werkzeugsatz, Evidenzdateien, laufId, „Starten“, Wiederaufnahme-Hinweis —
  IDs, Verhalten und POST-Körper unverändert (rolle/budget/modell fest, F-161). „Auftrag ohne Ablauf anlegen“
  (`#auftrag-anlegen`) nimmt Titel/Ergebnis/Kontext von oben, legt nur den Auftrag an, lädt die Auswahl neu und wählt
  ihn. `wendeWiederaufnahmeAn` öffnet `#direktstart` und legt den Fokus auf seine Überschrift (statt `scrollIntoView`
  in `views/runs.js`). Alte Regeln `#auftrag-start` entfernt.
- **Modulschnitt:** reines Modul `views/auftrag-vorbereitung.js` (Kontext-Anhang, Aggregat-Treffer, Notiz je Phase; ohne
  DOM und api.js importierbar); Bedienung und Anfragen in `views/projekt.js`. Die Kette „anlegen → routen → warten“
  steht damit zweimal (F-943).
- **i18n:** 67 Schlüssel (`auftrag.*`, `direktstart.*`, `lauf.aktion.erneutLaden`) in de/en/tr/ru; auch die bisher
  deutschen Literale des Direktstarts sind Schlüssel. Serverwerte (grund, auftragId, laufId, Fehlertext) roh;
  POST-Werte des Direktstarts (`frage`, `begruendung`) unverändert.
- **Prüfpunkte für WS-5b** (aus WS-5a), soweit `#/projekt` oder `#/runs`: F1/G10/G11 und die sichtbare
  Wiederaufnahme-Vorbelegung erledigt (oben); Fehlerzustand des Lauf-Details hat jetzt „Erneut laden“ (lädt dasselbe
  Detail, Test `runs-dialog.test.mjs`, Rotfall belegt); ändert der Poll die Liste „Aufträge“ oder „Ausführungen“,
  bleibt der Fokus auf derselben Zeile (`ersetzeListeMitFokus` in `render.js`, Test `render.test.mjs`, Rotfall belegt).
  Begründet stehen gelassen: Umbruch von „Aktualisieren“ in Lage a bei schmaler Hauptspalte (gewollter Umbruch, kein
  Überlauf); Ergebnis einer Dialog-Bedienung nach Verlassen der Seite (Verhalten festlegen, Entscheidung Mensch);
  zweimal Escape im echten Chrome (Browserprüfung, nicht dieses Paket); „beantwortet“ in Lage c (Server liefert kein
  Merkmal, keine Serveränderung); Text der Lage d im Nachlauf (Lauf-Detail, nicht dieses Paket); F-942, F-363/F-365,
  F-941 offen.
- **Gates:** keines musste mitziehen — `#auftrag-anlegen`, `#auftrag-titel`, `#auftrag-auftragstext`,
  `#auftrag-anlegen-fehler` und alle `start-*` bleiben, die Klickfolge von f20-leitstand-shell (CI) klickt sie per
  Skript auch im geschlossenen `<details>`; `projekt-wechsel.test.mjs` und `runs-dialog.test.mjs` unverändert grün,
  i18n-Gate grün. Neue Tests: `views/projekt.test.mjs` (18 Fälle, Rotfälle per Mutation belegt: Überholschutz der
  Routen-Antwort und des Anlegens, zweiter Auftrag bei „Erneut versuchen“, Sperre, laufId-Abgleich, Projektwechsel,
  Wiederaufnahme, Kontext-Anhang, Navigation nur auf `#/projekt`, dazu die Fälle der Korrekturrunde unten),
  `render.test.mjs`, ein Fall in `runs-dialog.test.mjs`.
- **Nachweise** `features/F44/nachweise/ws5b/` (Skript `erzeuge-nachweis.mjs`, leert nur die eigenen Folge-Ordner,
  feste Antworten): 8 Folgen, 40 WebP — Matrix je Darstellung (1440 dunkel und hell, 390 dunkel, 200 %, ru): leer,
  ausgefüllt mit offenem Kontext, Schritt 2 wartet, 409-Notiz, Startfehler-Notiz, Direktstart offen mit
  Wiederaufnahme; Hauptweg: `#/runs` → „Auftrag anlegen“ → „← Alle Aufträge“ (history.back()), Schritt 2, Ablauf im
  Aggregat → `#/workflows/router-nw-h` mit dem bestehenden Freigabeknopf, zurück mit geleerten Feldern; reduzierte
  Bewegung (leer, Schritt 2); Zustände: Anlegefehler am Formular, Schritt 2 mit gesperrtem „Auftrag ohne Ablauf
  anlegen“ samt Hinweis, Ablauf erscheint während der Nutzer woanders ist → „bereit“ → Klick „Ablauf prüfen“,
  Lauf-Detail 404 mit „Erneut laden“ und erfolgreichem Neuladen. Kein
  waagerechter Überlauf, keine zweite Live-Region. Gelaufen gegen die bereits laufende Leitstand-Instanz dieses
  Worktrees (Port 4173; eine zweite Instanz verweigert der Instanz-Lock) — alle schreibenden Anfragen sind Festantworten.

- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): design-guardian und
  code-reviewer „Nicht freigegeben“, qa „Freigegeben mit Hinweisen“. Eine Korrekturrunde, eingearbeitet:
  - **„Auftrag ohne Ablauf anlegen“ in Schritt 2** (alle drei): legte aus den verborgenen Feldern einen zweiten Auftrag
    an, ein Fehler blieb unsichtbar. Jetzt gesperrt, solange eine Vorbereitung besteht, mit Hinweis „zuerst ‚Neuen
    Auftrag beschreiben‘“; Guard auch in der Funktion. Der Render-Nachweis fand dabei einen Folgefehler (nach einem
    Anlegefehler blieb der Knopf gesperrt) — behoben. Tests mit Rotfall.
  - **„Neuen Auftrag beschreiben“ nach dem 201** (qa): der Text stand noch und erzeugte beim erneuten Absenden ein
    Duplikat. Entscheidung im Korrekturgang: der Auftrag ist angelegt, sein Text liegt beim Server — „Neuen Auftrag
    beschreiben“ leert die Felder und eine alte Fehlerzeile. Test mit Rotfall. **Entscheidung bestätigt** (Challenger,
    01.10.2026): „Neuen Auftrag beschreiben“ in Schritt 2 leert die Felder — bleibt so.
  - **Antworten ohne Wert** (code-reviewer 2, qa N9): ein 201 ohne `auftragId` ist ein Fehler am Formular (kein
    POST …//routen); ein 4xx beim Routen (z. B. 404) bietet kein „Erneut versuchen“ mehr, nur „Neuen Auftrag
    beschreiben“; 5xx und Netzfehler weiter mit „Erneut versuchen“.
  - **Veraltete laufId** (code-reviewer 3): jeder Routen-Versuch beginnt ohne laufId. Test mit Rotfall.
  - **Kein Sprung aus einer Eingabe** (qa N1): liegt der Fokus im Direktstart, wenn der Ablauf erscheint, springt die
    Seite nicht, sondern zeigt „Der Ablauf ist vorbereitet“. Strg-/Mittelklick auf „Ablauf prüfen“ lässt die Seite
    unverändert.
  - **Rückmeldung** nach „Auftrag ohne Ablauf anlegen“: Fokus auf die Auswahl mit dem neuen Auftrag.
  - **Logging** in allen Fehlerpfaden (`console.error`), Funktionsdoku für `zeigeStartFehler`/`zeigeStartErfolg`,
    Dateikopf von `render.js`; `.auftrag-seite small[hidden]` gegen die Autor-Regel (F-622).
  - **Texte:** neutraler Titel des 409 („Gerade nicht möglich“ — der Server antwortet 409 auch bei Projektsperre und
    belegter laufId; der Grund steht roh darunter); Platzhalter des Kontexts ohne „Dateien“; tr-Wortstellung im
    Wiederaufnahme-Hinweis.
  - **Tests:** Netzfehler beim Routen und beim Anlegen, Projektwechsel während POST …/auftraege, 404 ohne „Erneut
    versuchen“, 201 ohne `auftragId`, Sperre in Schritt 2, „Neuen Auftrag beschreiben“, Fokus im Direktstart; der
    Direktstart-Fall ist nicht mehr vom vorigen Test abhängig; der falsch benannte Fall heißt jetzt „nach einem 500“.
  - **Nachweise:** Folge „bewegung-reduziert“, Folge „zustaende“ (siehe oben), das Bild der Ablauf-Seite als
    Ausschnitt `#view-runs`, Protokollspalten ohne Texte verborgener Elemente („Direktstart offen“ als
    vorhanden-Prüfung).
  - **Abgleich:** der Rücklink „← Alle Aufträge“ statt „← Arbeit“ steht im Vermerk WS-5b.
  Nicht übernommen (Prüfpunkte → Fixpaket B5): Wiederaufnahme-Satz aus zwei Schlüsseln, rohe ISO-Zeit in der Auswahl,
  Enter im Titelfeld, Pflichtprüfung im Client, Zeitlimit für POST …/routen, Sprachwechsel verwirft Eingaben, laufId
  als Link, Abonnement-Reihenfolge (Titel der Ablauf-Seite kurz als ID).
- **Schätzung** 0,3–0,6 AT (Challenger); Ist: nach Merge (F-944).

### Akzeptanzkriterien WS-5b
- **WS5b-1** `#/projekt` nach d_auftrag_neu: back-Link, Eyebrow, Frage, Beschreibung, Schrittanzeige mit
  `aria-current="step"`, Formular mit Titel, Ergebnis, Kontext (aufklappbar), Notiz, „Ablauf vorbereiten“ und Coach
  als „kommt“.
- **WS5b-2** „Ablauf vorbereiten“: genau ein POST …/auftraege je Klick, danach routen; Schritt 2 mit Auftrag und
  laufId; Warten nur über das Aggregat; Treffer `router-<auftragId>` → Navigation zum Ablauf, Freigabe nur dort;
  Felder danach leer (`views/projekt.test.mjs`).
- **WS5b-3** Startfehler mit genau dieser laufId (rot), 409 (bernstein, `grund` roh), 5xx und Netzfehler beim Routen
  bieten „Erneut versuchen“, das nie einen zweiten Auftrag anlegt (4xx nicht); Fehler beim Anlegen (auch 201 ohne
  `auftragId`) stehen am Formular, Eingaben bleiben; in Schritt 2 ist „Auftrag ohne Ablauf anlegen“ gesperrt.
- **WS5b-4** Projektwechsel verwirft die Vorbereitung samt späten Antworten und Aggregat-Treffern; der Text bleibt.
- **WS5b-5** Direktstart aufklappbar mit unveränderten IDs, Verhalten und POST-Körper; „Auftrag ohne Ablauf anlegen“
  wählt den neuen Auftrag; die Wiederaufnahme öffnet `#direktstart` und fokussiert ihn.
- **WS5b-6** Texte in de/en/tr/ru, i18n-Gate und `npm run check` grün; Render-Nachweise liegen vor.

### Prüfpunkte für WS-6 → Fixpaket B5 (betreffen #/projekt, nicht H/I)
- Die Kette „anlegen → routen → warten“ steht in `views/workboard.js` und `views/projekt.js` (F-943); beim Schnitt
  F-928 zusammenlegen.
- Die Auswahl im Direktstart zeigt `erstellt_am` roh (ISO); der laufId-Vorschlag hängt am Optionstext — eine
  lesbare Zeit ändert den Vorschlag mit (Verhalten festlegen).
- Der Wiederaufnahme-Hinweis setzt sich aus zwei Schlüsseln um die laufId zusammen; besser ein Schlüssel mit
  Platzhalter über `tHtml` (F-940), sobald die Tests das Element nicht mehr per ID lesen.
- Verhalten festlegen (qa WS-5b): Enter im Titelfeld startet die schreibende Kette sofort (wie die Vorlage, Formular
  mit Submit); keine Pflicht- und Leerzeichenprüfung im Client (der Server prüft nur auf leer); POST …/routen ohne
  Zeitlimit, „wird geroutet“ ohne Ausweg; ein Sprachwechsel lädt neu und verwirft Text und Vorbereitung (F-885);
  die laufId eines Startfehlers ist kein Link nach `#/runs/<laufId>`.
- Reihenfolge der Abonnenten: `#/projekt` navigiert, bevor `views/workflows.js` das Aggregat desselben Ticks kennt —
  der Titel der Ablauf-Seite zeigt bis zur Detailantwort kurz die ID.
- „Lieber mit dem Coach besprechen“ bleibt „kommt“ bis WS-8 (Chat-Dock).
- Die Wartezeit in Schritt 2 hat keine Obergrenze (der Router-Lauf meldet entweder den Ablauf oder einen
  Startfehler); hängt er, hilft „Neuen Auftrag beschreiben“ oder der Blick in „Ausführungen“.

## Stand WS-6a „Alle Produkte“ (01.10.2026)
Branch `feat/f725-ws6a-produkte` (Basis `ca0fbae`), nicht committet. Vorlage V10 d_projekte, m_projekte, d_projekt_neu;
Abgleich F-725 H1–H7 (Vermerk WS-6a unter §5.1). Nur Leitstand-UI, keine Serveränderung, kein neuer Endpunkt.
- **`#/projekte-uebersicht` nach d_projekte:** Eyebrow „Dein Produktportfolio“, h1 „Was entwickeln wir?“,
  Beschreibung, rechts „+ Neues Produkt“ (`#projekte-anlegen-oeffnen`, primär) und „Neu laden“ (Symbolknopf).
  Darunter die Zeile „n Produkte · Ausführung aktiv / Keine Ausführung aktiv · Du priorisierst · die Workforce
  entwickelt“ (Plural über `Intl.PluralRules`, „aktiv“ = irgendein Projekt mit `laufAktiv`). Karten im
  Zweierraster (eine Spalte unter 1100 px).
- **Karte (H1):** Ordner-Symbol, Statuszeile (`kartenLage`: Entscheidungen > 0 → „Deine Entscheidung“, sonst
  `laufAktiv` → „Läuft“, sonst „Bereit“), Name, Ring „Erfasste Einträge abgenommen“ (alle Features aller
  Meilensteine, `zaehleRoadmap` neu in `roadmap-anzeige.js`; Ring aus `fortschritt-ring.js`, aus `views/dashboard.js`
  herausgelöst), Ziel = `roadmap.vision` roh und escaped, sonst „Noch kein Ziel festgehalten“ (Korrektur H1: V+ statt
  Z), drei Werte Entscheidungen (`baueEntscheidungen(zustand, P0/P1).eintraege.length`, dieselbe Auswahl wie „Deine
  Entscheidungen“; P0/P1-Filter als reine `waehleP0P1` aus `attention-daten.js`), abgenommen x/y, gerade aktiv („Ja“
  / „—“). Fuß: „Weiterarbeiten →“ mit dem Verhalten des früheren „Öffnen“ (setzeAktivesProjekt, merkeGeoeffnet,
  `#/dashboard`), auch auf der aktiven Karte; dort entfällt nur das erneute `setzeAktivesProjekt`, das die Abonnenten
  des Projektwechsels (F-860, u. a. einen laufenden Chat) ohne Wechsel zurückgesetzt hätte. Hinweis rechts „Du bist
  gefragt“ / „Läuft gerade“ / „Nächsten Schritt planen“. Die aktive Karte trägt einen Mint-Rahmen und „Aktives
  Produkt“; ein Wechsel über die Auswahl im Kopf verschiebt nur diese Markierung.
- **Zähler lazy je Karte (V+, F-945):** die Liste steht sofort; je Karte GET `/api/projekte/<id>/roadmap`, `…/zustand`
  und `…/workitems?status=OFFEN` mit expliziter id (neu in `api.js`: `holeProjektRoadmap`, `holeProjektZustand`,
  `holeProjektOffeneWorkitems` im Muster `holeProjektAufruf`, mit Zeitlimit; die präfixgebundenen Funktionen bleiben).
  Roadmap und Entscheidungen scheitern je für sich zu „—“ mit dem Grund im `title` (und als Text für Screenreader);
  ohne Entscheidungszahl entscheidet nur `laufAktiv` über die Statuszeile. Späte Antworten nach „Neu laden“ oder
  erneutem Betreten schreiben nicht in die neu gerenderte Karte (Render-Stand, `findeKarte`); dasselbe gilt für eine
  späte Antwort von GET `/api/projekte`.
- **F43 und F-849 (H5, H6; Sicherheitsgrenze §5.3 Punkt 6):** je Karte `<details class="projekt-technik">` „Vorschau &
  Aufruf · Technik“ mit ID, vollem `repo_pfad` (bricht um, kein Überlauf bei 390 px → F-857 erledigt), Serverstatus
  roh, H7 „Produkt bearbeiten“ als Baustein „kommt“ und dem unveränderten F43-Block (`.projekt-aufruf`,
  `data-aufruf-id`, `renderVorschau`/`renderAufrufBereich`, Nachlade-Timer). Die Zusammenfassung zeigt den Kurzstand
  aus `daten.vorschau` (`vorschauKurzstand`: erreichbar / nicht erreichbar / gesperrt (Leitstand-Port) / nicht gesetzt;
  „wird geprüft“ bzw. „nicht ladbar“). Ein Öffnen-Link entsteht nur in `renderVorschau`.
  `projekt-aufruf-anzeige.js` ist unverändert und bleibt deutsch (f43 prüft dessen Ausgabe) — die Ausgabe im
  Block („Vorschau wird geprüft…“, „Aufrufen“, „Läuft…“, Hinweise zu `vorschau_url`/`startbefehl`) erscheint
  deshalb auch in en/tr/ru deutsch; die Texte der View um den Block herum sind Schlüssel.
- **„Neues Produkt“ als Unterseite `#/projekte-uebersicht/neu` nach d_projekt_neu (H3, H4, A14):** gleicher
  View-Container und dieselbe Nav-Markierung „Alle Produkte“. „← Alle Produkte“, Eyebrow, h1 „Was möchtest du
  entwickeln?“, Beschreibung. Pflicht ist nur der Produktname. „Was soll dein Produkt ermöglichen?“ (readonly,
  `aria-disabled`) und „Zielgruppe ergänzen · optional“ sind „kommt“, ohne Beispieldaten (E-F44-1 = B; kein
  Speicherort). „Projektordner · optional“ (`#projekte-anlegen-zielordner-details`) mit ID und Zielordner. Die ID
  leitet `leiteProjektIdAb` aus dem Namen ab, solange sie nicht von Hand geändert wurde (eine geleerte ID wird bei der
  nächsten Namenseingabe bzw. beim Absenden wieder abgeleitet): Kleinbuchstaben, ä→ae, ö→oe, ü→ue, ß→ss, danach übrige
  Akzente entfernt (ç→c, ş→s, é→e, ı→i — Abweichung vom Auftrag aus der Korrekturrunde: tr ist eine UI-Sprache), sonst
  „-“, zusammengefasst, Ränder getrimmt, gekürzt auf 41 Zeichen; unter 2 Zeichen leer (Server:
  `^[a-z0-9][a-z0-9-]{1,40}$` für neue Projekte). Leerer Slug (z. B. kyrillischer Name oder „X“) → Klappe auf, „Bitte
  eine ID angeben“, Fokus auf der ID, kein POST. Server- und Netzfehler beim Anlegen bekommen den Fokus (keine eigene
  Live-Region). IDs `projekte-anlegen-*`, POST-Körper
  `{ id, name[, zielordner] }`, die gemeinsame Sperre von „Produkt anlegen“, „Abbrechen“ und „+ Neues Produkt“ während
  der Anfrage, die Fehleranzeige (Status und `grund` roh) und die Erfolgsbox (Git-Befehle, Trust-Hinweis, „Zum
  Coach-Interview“, `ladeProjektAuswahl`) bleiben. Nach Erfolg steht die Box auf der Unterseite (Fokus auf „Nächste
  Schritte“); „Schließen“ und „Abbrechen“ führen nach `#/projekte-uebersicht`, die Liste lädt beim Betreten neu.
  Betreten der Unterseite setzt Formular und Box zurück, außer eine Anlage läuft oder ihr Ergebnis traf ein, während
  die Unterseite verlassen war (dann steht es beim nächsten Betreten, Fokus darauf); steht der Nutzer bei Erfolg auf
  der Liste, lädt sie sofort neu. `oeffneAnlegenFormularAusKopf`
  (F-862) navigiert nur noch auf die Unterseite; die Regel „Anlage läuft → nichts zurücksetzen“ liegt im Eintritt.
  Ein Projektwechsel setzt das Formular nicht zurück.
- **Modulschnitt:** reines Modul `produkte-anzeige.js` (ID-Ableitung, Statuszeile, Kennzahlen aus Roadmap bzw. Zustand
  und Workitems, Vorschau-Kurzstand; ohne DOM importierbar); Bedienung und Abrufe in `views/projekte-uebersicht.js`.
  Alte Regeln `.projekte-kopf*`, `.projekte-karte*`, `#projekte-anlegen-formular …` und die nur noch hier genutzten
  `.bento-*`-Bausteine sind entfernt; die Ring-Regeln gelten für Übersicht und „Alle Produkte“.
- **i18n:** 67 Schlüssel (`produkte.*`, `produktNeu.*`) in de/en/tr/ru, auch die bisher deutschen Texte der View um den
  F43-Block. Projektdaten (Name, vision, Pfad, Status, `grund`) bleiben roh.
- **Gates:** keines musste mitziehen — f43, f25, f41, f21-ws2, f20-tokens, i18n-Gate und `projekt-wechsel.test.mjs`
  unverändert grün (kein Gate liest die Literale dieser View). Neue Tests: `produkte-anzeige.test.mjs`
  (ID-Ableitung samt Servermuster für neue Projekte, Akzenten, Mindest- und Höchstlänge — Rotfall der Mindestlänge per
  Mutation belegt —, Ring-Summe über alle Meilensteine, Ring im Modus „unbekannt“, Statuszeile/Hinweis, Kennzahlen mit
  defekten Quellen, Vorschau-Kurzstand). Der Schutz gegen späte Antworten (Render-Stand) ist nur im Code und im
  Prüfpass belegt, nicht durch einen Test.
- **Festlegungen:** Solange die Zahl der Entscheidungen fehlt (lädt oder nicht ladbar), entscheidet nur `laufAktiv` über
  die Statuszeile („Bereit“ neben „—“). Der Ring zeigt „–“ (Halbgeviert, aus der Übersicht übernommen), die Werte „—“.
  Der Schutz gegen späte Antworten gilt für die Zähler; der F43-Block behält sein bisheriges Verhalten.
- **Nachweise** `features/F44/nachweise/ws6a/` (Skript `erzeuge-nachweis.mjs`, leert nur die eigenen Folge-Ordner, feste
  Antworten, eigener Leitstand auf Port 4199): 8 Folgen, 37 WebP — Matrix je Darstellung (1440 dunkel und hell, 390
  dunkel und hell, 200 %, ru): Liste mit Zählern, Technik-Klappe der langen Karte offen (F-857), leere Unterseite,
  ausgefüllt mit abgeleiteter ID, „Nächste Schritte“; reduzierte Bewegung (Liste, Unterseite); Zustände:
  Technik-Klappen gesperrt (F-849, kein Öffnen-Link) und erreichbar, „+“ im Kopf, kyrillischer Name → leere ID, 409 mit
  Fokus auf der Meldung, „Abbrechen“, erneutes Betreten setzt zurück, 201 → „Schließen“, leere Liste, Ladefehler ohne
  Intro-Zeile. Kein waagerechter Überlauf, keine zweite Live-Region.
- **Prüfpass** (design-guardian, code-reviewer, qa parallel, einmal, frischer Kontext): design-guardian „Freigegeben mit
  Hinweisen“, code-reviewer und qa „Nicht freigegeben“. Eine Korrekturrunde, eingearbeitet:
  - **Intro-Zeile trotz `hidden` sichtbar** (code-reviewer, F-622-Muster; im eigenen Nachweis neben dem Ladefehler):
    Regel `.produkte-intro[hidden]` und Leeren des Inhalts.
  - **Ergebnis der Anlage ging verloren**, wenn die Unterseite während des POST verlassen wurde (qa 1): es bleibt bis
    zum nächsten Betreten; steht der Nutzer auf der Liste, lädt ein Erfolg sie neu.
  - **Fehler beim Anlegen ohne Fokus** (qa 2, design-guardian 2): Fokus auf die Meldung, `aria-describedby` an Name und ID.
  - **ID-Ableitung** (code-reviewer 2/3, qa 5/6): unter 2 Zeichen leer, Akzente lesbar, geleerte ID beim Absenden
    abgeleitet; Test gegen das Muster für neue Projekte.
  - **Körper ohne `projekte`** ist ein Ladefehler statt eines Wurfs (code-reviewer 1).
  - **Kleinkram:** „gerade aktiv“ „—“ mit lesbarem „Nein“; ru-Texte (Ring-Bezeichnung ohne Plural, „Готов“);
    `hyphens: manual` für Projektnamen (design-guardian 3); Statuszeilen-Klassen einmal (`chipKlassen`); Funktionsdoku;
    Kopf von `kommt.js`; Folge „bewegung-reduziert“ (design-guardian 1); Vermerk WS-6a ergänzt (design-guardian 4).
  Nicht übernommen: siehe „Prüfpunkte `#/projekte-uebersicht`“ unten.

### Akzeptanzkriterien WS-6a
- **WS6a-1** `#/projekte-uebersicht` nach d_projekte: Eyebrow, Frage, Beschreibung, „+ Neues Produkt“, „Neu laden“,
  Zeile „n Produkte · Ausführung aktiv/Keine Ausführung aktiv · Du priorisierst · die Workforce entwickelt“ (Plural
  über `Intl.PluralRules`).
- **WS6a-2** Karte je Projekt mit Statuszeile (Entscheidung vor Läuft vor Bereit), Name, Ziel aus `roadmap.vision`
  (roh, escaped; sonst „Noch kein Ziel festgehalten“), Ring über alle Features aller Meilensteine, drei Werten und
  Hinweis; „Weiterarbeiten →“ auch auf der aktiven Karte, die erkennbar markiert ist (`produkte-anzeige.test.mjs`).
- **WS6a-3** Zähler lazy je Karte mit expliziter id; jeder Teil scheitert einzeln zu „—“ mit Grund im `title`; späte
  Antworten der Zähler schreiben nicht in eine neu gerenderte Karte (F43-Block wie bisher).
- **WS6a-4** Klappe „Vorschau & Aufruf · Technik“ mit ID, vollem Pfad ohne Überlauf bei 390 px (F-857), Status roh,
  „Produkt bearbeiten“ als „kommt“ und dem unveränderten F43-Block; Kurzstand der Vorschau in der Zusammenfassung;
  kein Öffnen-Link bei gesperrter Vorschau (F-849); f43 unverändert grün.
- **WS6a-5** `#/projekte-uebersicht/neu` nach d_projekt_neu: Pflicht nur der Name, Ziel und Zielgruppe „kommt“, ID aus
  dem Namen abgeleitet (unter 2 Zeichen leer → Klappe offen, Fehler, kein POST); POST-Körper, Sperre, Fehleranzeige
  (mit Fokus) und „Nächste Schritte“ wie F41; Betreten setzt zurück, außer eine Anlage läuft oder ihr Ergebnis ist noch
  ungesehen; „+“ im Kopf führt auf die Unterseite.
- **WS6a-6** Texte in de/en/tr/ru, i18n-Gate und `npm run check` grün; Render-Nachweise liegen vor.

### Prüfpunkte `#/projekte-uebersicht` (aus dem Prüfpass WS-6a; nach Route abgelegt, F-946)
- Das Zeitlimit von 5 s der Zähler zählt die Wartezeit im Browser mit (4·n gleichzeitige Abrufe, 6 Verbindungen je
  Host) — mit mindestens 8 Projekten gegen einen echten Server prüfen; Maßnahme F-945.
- „Neu laden“ bricht laufende Abrufe nicht ab; GET `/api/projekte` hat kein Zeitlimit („Lädt…“ kann stehen bleiben).
- Enter im Produktnamen sendet nicht ab (kein Formular-Element); Fokus nach „Abbrechen“, „Schließen“ und
  „← Alle Produkte“ liegt auf `body`.
- Das „+“ im Kopf heißt „Neues Projekt anlegen“, die Seite „Neues Produkt“ (Schlüssel `kopf.neuesProjekt`, Shell).
- Nach „Aufrufen“ mischt sich in en/tr/ru das deutsche `projekt-aufruf-anzeige.js` mit den übersetzten Texten der View.
- Kein automatischer Test für den Schutz gegen späte Antworten und für „Anlage läuft, Seite verlassen“
  (render-nachweis kann eine Antwort nicht zurückhalten); die Protokollspalten messen das eigene `hidden`, nicht die
  Sichtbarkeit des Elternteils.
- Bei 200 % Zoom endet die Sidebar im Vollseitenbild nach „Brain“ (Shell, WS-1b, nicht dieses Paket).

## Prüfpunkte für Folgepakete
Aus den Prüfpässen WS-1a (30.09.2026), für WS-1b:
- Persona im hellen Theme: dunkler Fleck mit schwarzem Lid-Band auf hellem Kopf
  (`bedienung/bedienung-hell.webp`) — mit dem neuen Persona-Bild kalibrieren.
- Status-Chip verdeckt im Zustand error den Namen in der Nutzerkarte (`style.css`
  `.nutzerkarte-status-chip-host`), besonders bei 200 % Zoom.
- Bei 390 px steht über der Navigation ein leerer Streifen von etwa 200 px.
- Theme, Sprache und Bewegung gleichen sich zwischen Tabs erst beim Neuladen an (kein
  `storage`-Event); eine Änderung von `prefers-reduced-motion` zur Laufzeit erreicht das Häkchen
  der Einstellungen erst beim nächsten Rendern — Verhalten festlegen.
- Bei gesperrtem Storage wechselt das Theme sichtbar, bleibt aber nicht gespeichert, obwohl der
  Text „wird gespeichert“ sagt.

Aus dem QA-Pass WS-0 (30.09.2026); jedes UI-Paket prüft die zutreffenden:
- Startfläche: Link und Motiv sind bei t = 0 unsichtbar, sollen aber sofort
  bedienbar sein — Tastaturfokus und Fokusreihenfolge festlegen (WS-1).
- Leerer Hash nach `#/start` gegen „einmal pro Sitzung“: Verhalten beim
  zweiten leeren Hash festlegen (WS-1).
- Projektwechsel (F-860) mit offener Eingabe (Pflichtbegründung im
  Freigabedialog, Chat-Entwurf) und späten Poll-Antworten des alten
  Projekts (WS-1).
- i18n: russische Pluralformen bei 0, 11–14, 21; `aria-label`/`title` als
  Text; ein Sprachwechsel löst keine Ansage der Live-Region aus (WS-1 ff.).
- Mobil: lange Projektnamen im Kopf, lange tr/ru-Texte, die Blase „Frag
  Jarvis“ über Pflichtfeldern und Knöpfen; hell und mobil zusammen.
- Z-Elemente mit `aria-disabled`: Enter und Leertaste lösen nichts aus,
  auch kein Submit; „kommt“ ist für Screenreader lesbar; die
  Fokusreihenfolge zu „Ablehnen“ bleibt unverändert.
- Theme: `theme-color` zur Laufzeit aus dem Token lesen, kein Flackern beim
  ersten Laden, kaputter localStorage-Wert fällt auf dunkel zurück;
  Vorrang zwischen Bewegungsschalter und `prefers-reduced-motion`
  entscheiden (WS-1).
- Persona-Bildtausch: Augen-Overlay bei 200 % Zoom und 390 px, Orb und
  Avatar im hellen Theme (WS-1).
- Freigabedialog: „Ablehnen“ per Tastatur ohne Umweg, leere Begründung als
  Fehlerzustand, Katalog-Checkboxen bleiben `disabled` (WS-4).
