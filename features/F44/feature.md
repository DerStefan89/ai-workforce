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
(Challenger, 30.09.2026): WS-1a „Fundament“ in Arbeit seit 30.09.2026 (Branch
`feat/f725-ws1a-fundament`); WS-1b und WS-2 bis WS-8 offen.

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
| **WS-2** Übersicht, Entscheidungen, Roadmap | Tabellenabschnitte B, C, D (mit F-854) | f21-ws2 (IDs `attention-*`) |
| **WS-3** Entwicklung | Abschnitt E (Board, Listen, Detail, Bauen, Click-to-Work samt Git-Block) | f21-ws2 (IDs `workboard-*`, keine POST-Methode in workboard.js) |
| **WS-4** Ablauf & Abnahme | Abschnitt F vollständig, einschließlich F3b (Ablehnen), F5, F6, F7, F8, F9 und F16; Invariante „Anzeige = Start“ | f15-oberflaeche (IDs und Texte), f42, `empfehlung-*.test.mjs`, f20-shell (CI) |
| **WS-5** Ausführungen & Direktstart | Abschnitt G | f12 (Markup der Laufakte), `runs.test.mjs` |
| **WS-6** Produkte & Nutzung | Abschnitte H (F43/F-849 echt, F-857) und I | f43, f25, f32-ansicht |
| **WS-7** Workforce | Abschnitt J (Katalog, Rollen, Coverage, Scout, Phasen aus Workflows) | – |
| **WS-8** Chat | Abschnitt L (Dock und große Ansicht, alle heutigen Chat-Funktionen); dazu das Umstellen der Chatspalte auf die Blase (Chat-Dock), das aus WS-1 hierher wandert | f34 (IDs, Modus-Buttons) |

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
| Entwicklung | `#/workboard`, Detail `#/workboard/<id>`; Ablauf `#/workflows/<id>`; Ausführungen `#/runs`, `#/runs/<id>`; Auftrag & Direktstart `#/projekt` |
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
