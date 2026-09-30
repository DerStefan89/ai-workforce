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
30.09.2026 (Branch `feat/f725-ws0-design-ablage`). WS-1 bis WS-8 offen.

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
| **WS-1** Tokens, Shell, Einstieg | i18n-Kern und -Gate, Sprachwahl im Kopf, Baustein „kommt“ (E-F44-1), Tokens dunkel und hell, Persona-Bild neu kalibrieren (Zuschnitt, Orb, Avatar, Augen-Overlay), eine Live-Region, Typografie, Sidebar V10 auf bestehende Routen, Kopf (Projektauswahl, „+“, Persona mit 4 Status-Texten, Theme), `#/start` mit Motion-Nachweis und Wartezeile, Chat-Dock als Hülle, Einstellungen, Platzhalterseiten, zentraler Neuladen-Hook beim Projektwechsel (F-860), Poll-Fehlerbanner, Zuletzt geöffnet, Manifest, „+“ statt „kommt bald“ (F-862), Sidebar-Kontrast (F-865). Bestehende Views laufen schon im neuen Look (Tokens) | f20-tokens, f28-persona, f21-ws2 (Nav-Anker), f34 (`[hidden]`-Regeln), f20-zustand-poll, neues i18n-Gate, `render-nachweis` (Theme, reduzierte Bewegung, Zoom; F-867) |
| **WS-2** Übersicht, Entscheidungen, Roadmap | Tabellenabschnitte B, C, D (mit F-854) | f21-ws2 (IDs `attention-*`) |
| **WS-3** Entwicklung | Abschnitt E (Board, Listen, Detail, Bauen, Click-to-Work samt Git-Block) | f21-ws2 (IDs `workboard-*`, keine POST-Methode in workboard.js) |
| **WS-4** Ablauf & Abnahme | Abschnitt F vollständig, einschließlich F3b (Ablehnen), F5, F6, F7, F8, F9 und F16; Invariante „Anzeige = Start“ | f15-oberflaeche (IDs und Texte), f42, `empfehlung-*.test.mjs`, f20-shell (CI) |
| **WS-5** Ausführungen & Direktstart | Abschnitt G | f12 (Markup der Laufakte), `runs.test.mjs` |
| **WS-6** Produkte & Nutzung | Abschnitte H (F43/F-849 echt, F-857) und I | f43, f25, f32-ansicht |
| **WS-7** Workforce | Abschnitt J (Katalog, Rollen, Coverage, Scout, Phasen aus Workflows) | – |
| **WS-8** Chat | Abschnitt L (Dock und große Ansicht, alle heutigen Chat-Funktionen) | f34 (IDs, Modus-Buttons) |

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
- **F-776 ist nicht Teil** (Katalogart „referenz“). Challenger-Empfehlung
  vom 30.09.2026: V1-Backlog mit Auslöser; Bestätigung durch Stefan offen.
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
- **WS0-6** `impeccable` installierbar machen: **offen**, nicht erfüllt.
  Stefan entscheidet den `skill_pfad` (mehrere Skill-Ordner im fremden
  Repo); bis dahin bleibt der Punkt in WS-0 offen oder wird ausdrücklich
  in ein Folgepaket verschoben.

## Prüfpunkte für Folgepakete
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
