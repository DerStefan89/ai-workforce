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
WS-3b „Detail, Bauen, Click-to-Work“ in Arbeit seit 01.10.2026 (Branch `feat/f725-ws3b-detail`);
WS-4 bis WS-8 offen.

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
| **WS-2a** Entscheidungen & Roadmap | Tabellenabschnitte C und D (mit F-854): `#/attention` „Deine Entscheidungen“, `#/roadmap` als eigene Seite (die Zwischenseite entfällt), reine Module `baueEntscheidungen` (`attention-daten.js`) und `roadmap-anzeige.js`; dazu F-891 | f21-ws2 (IDs `attention-*`, Importzeile (e)) |
| **WS-2b** Übersicht | Tabellenabschnitt B (`views/dashboard.js`), nutzt `baueEntscheidungen` für „Deine nächsten Entscheidungen“ und `roadmap-anzeige.js` für aktuellen Meilenstein und Fortschrittsring | f21-ws2 (Importzeile (e) in dashboard.js) |
| **WS-3a** Board & Listen | Abschnitt E1–E7: Status-Kanban, Listen-Tabs mit Suche, Parser-Befunde, Z-Elemente E2/E3/E7; Bento entfernt (F-892); F-913 | f21-ws2 (IDs `workboard-*`, keine POST-Methode in workboard.js; neu (h)) |
| **WS-3b** Detail, Bauen, Click-to-Work | Abschnitt E8–E13 (Detail, „Auftrag vorbereiten“, Click-to-Work samt Git-Block, 409 mit „Wiederholen“, E13 als kommt), F-914 | f21-ws2, f22, `empfehlung-*.test.mjs` |
| **WS-4** Ablauf & Abnahme | Abschnitt F vollständig, einschließlich F3b (Ablehnen), F5, F6, F7, F8, F9 und F16; Invariante „Anzeige = Start“ | f15-oberflaeche (IDs und Texte), f42, `empfehlung-*.test.mjs`, f20-shell (CI) |
| **WS-5** Ausführungen & Direktstart | Abschnitt G | f12 (Markup der Laufakte), `runs.test.mjs` |
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
