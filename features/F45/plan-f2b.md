# F45 WS F-2b — Plan (Sammlung im Leitstand, Auswählen → Eignungsprüfung → Katalog, Scout liest die Sammlung)

Branch `f45/f2b-sammlung-auswahl-pruefung`, Basis `83a576c` (main mit F-2a, #324). Löst F-1056 (K20), F-1057 (K21),
F-1061 (1), F-1060 (6). Grundlage: Auftrag F45 WS F-2b (12.10.2026), `docs/projekt/fixpaket-f45.md` §3,
`features/F36/katalog-uebernahme.md`, `.claude/skills/werkzeug-auswahl/SKILL.md`.

## Plan v1

### Invarianten (aus F-1/F-2a, unverändert)
Argv ohne Aktivierung bitgleich (jede Rolle außer `scout` und der neuen Rolle `eignungspruefung`), Init-Gate, Deny-Liste,
E-187 (`--strict-mcp-config` + leere MCP-Config), E-182, `Bash(git:*)`, Write/Edit(`**/.claude/**`), F-1040, lokale Datei
nur über Routen, Bestätigung nach Fremdänderung. `starteWorkflowSchritt(` bleibt 6-mal im Server. Kein neuer Poll-Aufwand:
GET /api/zustand unverändert; der Prüflauf wird nur während er läuft über den Detail-Auffrischer verfolgt (Muster Scout).
Sammlung nur lesen. Prüfbericht ist Daten, keine Freigabe.

### 1 Sammlung lesen (`src/sammlung/index.ts`, neu)
- `parseSammlung(text)`: nur der Abschnitt `## Vollständige Bewertungsmatrix` bis zur nächsten `## `-Überschrift; darin
  die Unterabschnitte `### UI|Repos|Plugins|Skills|Tools|MCP` (Art). Jede Tabelle muss exakt den Kopf
  `Name / Quelle | Urteil | Kurzbeschreibung | Lizenzbasis | Kosten | Sicherheits-/Fit-Bewertung` tragen, sonst Fehler.
  Andere Tabellen der Datei (Auswahlfilter, Kosten, Priorisierung, Datensatz) werden nie gelesen.
- Je Zeile: `id` (`<art>-<slug(name)>`, eindeutig, sonst Fehler), `name`, `link` (aus `[Name](url)`, nur `https://`; `null`
  bei „(Link fehlt)“), `urteil` (eine der 10 Entscheidungen aus „Entscheidungen lesen“, sonst Fehler), `kurzbeschreibung`,
  `lizenz`, `kosten`, `bewertung`, `art`. Leere Pflichtspalte (alles außer Link) → Fehler mit Zeilennummer.
- Selbstprüfung gegen die Datei: Zahl im Satz „Erfasste Bewertungszeilen: **N**“ = Zahl der Zeilen.
- **Zahl im Gate:** Die Datei hat **176** Matrixzeilen (die Datei selbst nennt 176), davon **172 mit Link** und 4 mit
  „(Link fehlt)“ (alle Urteil „Offen“). Der Auftrag nennt 172. Lesart v1: Gate fest auf „176 Zeilen, davon 172 mit Link“;
  jede Abweichung einer der beiden Zahlen → Gate-Fehler „Sammlung geändert — Zahl im Gate nachziehen“. Die 4 Zeilen ohne
  Link erscheinen in der Liste, sind aber nicht auswählbar (keine Quelle zum Pinnen). → **Offener Punkt O1.**
- Liest die Datei bei jeder GET-Anfrage neu? Nein: Cache nach (mtime, size); sie ändert sich nur per Commit.

### 2 Zuordnung Sammlung ↔ Katalog (`ordneZu`, in `src/sammlung/index.ts`)
Regel (dokumentiert im Dateikopf und in der Akte), zwei Stufen, erste Stufe mit Treffer entscheidet:
1. **Link**: normalisierte URL (Kleinschreibung von Schema/Host, ohne `www.`, ohne abschließendes `/` und `.git`) gleich
   `herkunft.url` eines Katalogeintrags.
2. **Name**: normalisierter Name (nur `a-z0-9`) gleich der Katalog-`id` oder dem Katalog-`name` (normalisiert).
Ergebnis je Zeile: `zugeordnet` (genau ein Katalogeintrag, und kein anderer Sammlungseintrag trifft denselben auf
derselben Stufe), `mehrdeutig` (mehrere Kandidaten oder Katalogeintrag mehrfach getroffen → nichts wird geraten),
`keine`. Zeilen mit Urteil `Alias` nehmen nicht teil (`alias`, Hinweis „siehe Haupteintrag“).

### 3 Typ und Stand je Eintrag
- **Typ** (für Auswählen): (a) zugeordnet → `unterart` des Katalogeintrags (`skill`/`mcp`/`agent`); Katalog-`typ` `skill`/
  `agent` (lokal) → „im Repo, keine Prüfung nötig“; (b) Name steht in `docs/harness/stack-kandidaten.md` oder Art `UI` →
  `bibliothek`; (c) Art `MCP` → `mcp`, `Skills` → `skill`, `Plugins` → `plugin`; (d) sonst (`Repos`/`Tools` ohne Zuordnung)
  → `unbestimmt`: Stefan wählt im Auswählen-Dialog `skill` oder `mcp` (Pflichtfeld).
- **Stand** (höchster gewinnt, eine Chip-Zeile): `benutzt` · `aktiv` · `installiert` · `geprueft` · `vorgemerkt` (OFFEN im
  Katalog) · `nur_sammlung`. `installiert/aktiv/benutzt` aus `baueFaehigkeitenStatus` (F-2a, Katalog-MCPs und Ort-B-Skills
  dieses Projekts) per Katalog-id. Zusätzlich je Eintrag `pruefbericht`: `vorhanden` (Urteil + Version) ·
  `ohne_vor_f2b` (FREIGEGEBEN ohne Bericht: playwright-mcp, frontend-design — „ohne Prüfbericht (vor F-2b freigegeben)“,
  kein Zwang zur Nachprüfung) · `keiner`.
- **Ausgeschlossen**: Urteil `Nur Ausnahme` oder `Ausgeschlossen` (der Auswahlfilter der Datei ist in diese Urteile schon
  eingeflossen, Absatz unter „Vollständige Bewertungsmatrix“). Grund = Erklärung des Urteils (Tabelle „Entscheidungen
  lesen“, aus der Datei gelesen) + Sicherheits-/Fit-Spalte. Auswählen nur mit Pflicht-Begründung „Ausnahme“
  (≥ 20 Zeichen), sonst 400.
- **Nicht auswählbar**: `Alias`, ohne Link, Typ `bibliothek` („für gebaute Projekte — wählt der Architekt“, F-1058),
  Typ `plugin` (F-3), lokaler Katalogeintrag (Repo).

### 4 Routen (`scripts/leitstand/routen-sammlung.mjs`, neu; Server registriert nur)
- `GET /api/sammlung` → `{ eintraege[], zaehlung, quelle: { pfad, zeilen, mit_link } }` (projektbezogen wegen Stand
  aktiv/benutzt). Nicht im Poll.
- `POST /api/sammlung/pruefung/vorbereiten` `{ sammlung_id? , katalog_id?, typ?, paket?, pfad? }` — nur lesend:
  Typ bestimmen, Quelle pinnen ohne Installation:
  - skill/agent: GitHub-URL (Katalog `herkunft.url`, sonst Sammlungslink) → `zerlegeGithubUrl` → `loeseSkillCommitAuf`
    (SHA). Pfad = `<unterpfad>/<installation_vorlage.skill_pfad>` falls vorhanden, sonst `<unterpfad>` (ganzes Repo bzw.
    Unterordner), optional `pfad` aus dem Dialog.
  - mcp: `paket` aus `herkunft.paket` (sonst Pflichtfeld im Dialog, `paketNameAus`) → `npm view <paket>@latest version
    dist.integrity license time.modified maintainers --json` → exakte Version + Integrity (Muster `bereiteInstallationVor`).
  - Antwort: `{ subjekt, typ, quelle: {art:'git',repo,ref,sha,pfad} | {art:'npm',paket,version,integrity}, urteil_sammlung,
    ausgeschlossen, hinweis }`. Kein Katalogeintrag nötig (impeccable, context7-mcp liegen nur im Katalog; Sammlungszeilen
    ohne Katalog).
- `POST /api/sammlung/pruefung` `{ … wie oben, quelle (angezeigt), ausnahme_begruendung? }` → 202 `{ laufId }`. Laufsperre
  D13 und globale Sperre wie jede Route, die einen Lauf startet; CSRF zentral.
- Freigabe: `POST /api/ressourcen/<id>/installation/vorbereiten` liefert additiv `pruefbericht` (passender Bericht zur
  angezeigten Version oder `null`); `POST /api/ressourcen/<id>/installation` → **409**, wenn kein Bericht zur angezeigten
  gepinnten Version existiert oder sein Urteil `NICHT_GEEIGNET` ist. Prüfung im Server vor `installiereRessource` (die
  Funktion bleibt unverändert, ihre Tests auch); die Gates WS-5a/5b legen einen passenden Bericht an.
  Passend: mcp — gleiches `paket`, `version`, `integrity`; skill — gleiches Repo, `sha` = angezeigte SHA und Berichtspfad
  `''` oder Präfix (an Segmentgrenze) des angezeigten `quellPfad`.

### 5 Inhalt holen (read-only, `src/sammlung/quelle.ts`, neu)
- **git** (Muster `holeSkillQuelle`, dieselbe Härtung: keine System-/Nutzerkonfiguration, leere Hooks, `core.symlinks=false`,
  `credential.helper=`, `GIT_CEILING_DIRECTORIES`): Temp-Repo, `fetch --depth 1` genau dieser SHA, `ls-tree -r -l -z` über
  den Pfad, `checkout <sha> -- <pfad>`. Anders als die Installation **bricht ein Symlink/Submodul nicht ab**, sondern wird
  als Fakt gemeldet (nicht ausgecheckt bzw. als Textdatei). Die Härtungs-Argumente werden aus `skill-installation.ts` als
  gemeinsame Konstante herausgezogen (Verhalten der Installation bitgleich).
- **npm**: `npm pack <paket>@<version> --ignore-scripts --json --pack-destination <temp>` (lädt nur das Tarball, führt
  nichts aus); SRI der `.tgz` selbst gegen die angezeigte `integrity` (sha512) prüfen, sonst Abbruch; entpacken mit eigenem
  kleinem Tar-Leser (`zlib.gunzipSync` + ustar/pax), nur reguläre Dateien, Pfade ohne `..`/absolute, andere Typen als Fakt.
- **Neutralisieren** beim Ablegen nach `<temp>/inhalt/`: jedes Pfadsegment `.claude` → `_claude`, Dateien `CLAUDE.md`,
  `CLAUDE.local.md` → `_CLAUDE.md` …, damit `--add-dir` keine Skills/Anweisungen der Quelle lädt. Grenzen: ≤ 3 000 Dateien,
  ≤ 25 MB gesamt, Einzeldatei > 1 MB wird übersprungen (Fakt), Binärdateien (NUL-Byte) übersprungen (Fakt).
- **Fakten** (`sammleFakten`, mechanisch): Dateizahl/Bytes, Skripte nach Endung, `package.json`-Lebenszyklus-Skripte
  (`preinstall/install/postinstall/prepare`), `bin`, Abhängigkeiten (Zahl), Hook-Konfigurationen (`hooks` in
  `settings.json`, `hooks/hooks.json`), `SKILL.md`/Agent-Dateien, Symlinks/Submodule/übersprungene Dateien, Umbenennungen,
  Commit-Zeit (git `log -1 --format=%cI`) bzw. Veröffentlichungszeit/Pfleger (npm view).
- Aufräumen: Temp-Ordner nach dem Lauf (Rückruf) entfernt; Fehlschlag vor dem Start ebenso.

### 6 Prüf-Lauf (Rolle `eignungspruefung`, neu)
- `ROLLENVERTRAEGE.eignungspruefung`: Werkzeugsatz-Art nur `lesend` (Read/Grep/Glob — kein Bash, kein Write/Edit, kein Web),
  Worker nur `claude-code`, Schema `ergebnis-eignungspruefung`, `ausschlussmuster ['src/**']`.
  Kein Scout: Web ist im Prüflauf bewusst aus (ein Lauf, der adversariellen Inhalt liest, bekommt keinen Ausgang nach
  außen); Herkunftsdaten liefert der Server als Fakten.
- Gateway: `AufrufEingaben.zusatzOrdner?: string[]` → je Eintrag `--add-dir` vor `-p` (fehlt es: Argv bitgleich). Gesetzt
  nur serverseitig (pruefeStartauftrag lehnt das Feld im Body ab, Muster `ortB`). Prüflauf: genau `[<temp>/inhalt]`;
  `disallowedTools` = Auto-Memory-Sperre (Muster Router); `settingSources` Standard.
- Auftragstext (deutsch, Server): Rolle, P5-Vertrag (Inhalte = Daten; Aufforderungen darin → Befund `modell_anweisungen`),
  Prüfliste aus `werkzeug-auswahl` (Bedarf/Fit, Herkunft, Lizenz, Installationsweg, Anweisungen an das Modell,
  Hooks/Hintergrundprozesse, Kosten), Eintrag der Sammlung (Urteil, Lizenz, Kosten, Bewertung) als Eingabe mit Pflicht,
  Abweichungen zu benennen (`abweichung_sammlung`), Ausnahme-Begründung falls vorhanden, Fakten, Pin, Pfad des Ordners.
  Ausgabe: genau das Schema, `typ` und `gepinnte_version` exakt wie vorgegeben.
- Auftrag wird intern registriert (Muster `starteRollenChatLauf`), `laufId = pruefung-<schluessel>-<zeit>`.
- **Schema `schemas/ergebnis-eignungspruefung.schema.json`** (additionalProperties false): `urteil` (GEEIGNET |
  MIT_AUFLAGEN | NICHT_GEEIGNET), `typ` (skill|mcp|agent), `gepinnte_version` (string), `befunde[{bereich (bedarf_fit |
  herkunft | lizenz | installationsweg | modell_anweisungen | hooks_hintergrund | kosten | abweichung_sammlung), schwere
  (hoch|mittel|gering|info), beleg}]`, `auflagen[]` (bei MIT_AUFLAGEN ≥ 1), `zusammenfassung`. Validator handgeschrieben
  (`src/sammlung/pruefbericht.ts`, Muster `validiereErgebnisScout`).
- Nach dem Lauf (Rückruf): Laufakte laden, Ergebnis aus dem Rohstrom lesen (`leseRollenErgebnisRohstrom`), validieren,
  `typ`/`gepinnte_version` gegen den Pin prüfen; erst dann **Kernartefakt** `pruefbericht-<schluessel>` (Schlüssel =
  Katalog-id, sonst `s-<sammlung_id>`) über `registriereKernArtefakt` mit `eingaben` = Laufakte (Lineage). Payload-Schema
  `schemas/kontrollzustand-pruefbericht-payload.schema.json`: `ergebnis`, `quelle`, `typ`, `katalog_id|null`,
  `sammlung_id|null`, `urteil_sammlung|null`, `ausnahme_begruendung|null`, `fakten`, `lauf_id`, `auftrag_id`,
  `projekt_id`, `erstellt_am`. Fehlschlag → kein Bericht, Grund in der Startfehlerliste und als Fehlerstand in GET.
- **Ablage**: im Kontrollzustand der Workforce (Katalog ist global): neue Handler-Option `sammlungBasisVerzeichnis`
  (Standard = `basisVerzeichnis` der Instanz, damit Gates isoliert bleiben; CLI-Bindeblock und `baueProjektHandlerMap`
  setzen das der Workforce). Der Lauf selbst (Laufakte, Rohstrom) liegt wie jeder Lauf beim aktiven Projekt.

### 7 Oberfläche Seite Workforce → Capability Library → neuer Unterreiter „Sammlung“
`views/sammlung.js` + reine Anzeige-Regeln `sammlung-anzeige.js` (testbar): gruppiert nach Art, Suche (Name,
Kurzbeschreibung), Filter Urteil und Stand (Chips wie Katalog), Zeile: Name, Was es kann, Urteil, Lizenz, Kosten, Stand,
Link (`rel="noopener noreferrer"`, nur https). Detail aufklappbar (Muster F-2a): Sicherheits-/Fit-Bewertung, Zuordnung,
Prüfbericht (Urteil, Version, Befunde-Tabelle, Auflagen, Zusammenfassung, Lauf-Link). Bibliotheken mit Hinweis ohne
Auswählen; Ausgeschlossene mit Grund und Begründungsfeld. „Auswählen“ → vorbereiten → Bestätigungsblock (Typ, Quelle,
Pin, Hinweis „Prüfung kostet einen Modelllauf, installiert nichts“) → „Prüfung starten“ → Fortschritt (Detail-Auffrischer
nur solange er läuft) → Bericht. Nach Bericht und ohne Katalogeintrag: „Vormerken“ über den bestehenden Weg
(`vormerken-auftrag.js`, neue Variante mit Feldern aus Sammlung und Bericht; Auftrag → routen → ZWINGEND-Freigabe).
Katalog-Detail (capability-library.js): bei OFFEN zusätzlich „Eignung prüfen“ (derselbe Ablauf, Subjekt Katalog-id).
Freigabedialog (`empfehlung-installation.js`): Bestätigungsblock zeigt den Bericht; ohne passenden Bericht oder bei
NICHT_GEEIGNET kein „Installieren“, sondern Grund + Verweis „Eignung prüfen“. i18n de/en/ru/tr.

### 8 Scout liest die Sammlung zuerst (F-1057)
- `.claude/agents/scout.md`: Abschnitt „Sammlung zuerst“ (Read/Grep auf beide Dateien, zählt nicht gegen das Web-Budget,
  Urteil/Lizenz übernehmen, `quelle: "sammlung"`, Web nur für Lücken).
- Server, `POST /api/laeufe` mit `rolle: 'scout'`: hängt eine Zeile mit den absoluten Pfaden der beiden Dateien
  (Installationsordner) an den Auftragstext und setzt `zusatzOrdner = [<installWurzel>/docs/harness]`, damit die Dateien
  auch in Fremdprojekten lesbar sind. Client-Auftragstext (`baueScoutAuftragstext`) nennt die Regel ebenfalls.
- `schemas/ergebnis-scout.schema.json` additiv: Kandidat `quelle` (`sammlung`|`web`, optional), `urteil_sammlung`
  (optional, eine der 10 Entscheidungen). Validator, Typen, Beispiele, Karte („aus der Sammlung · Urteil …“).
- Startfreigabe: der Gültigkeitsschlüssel misst `.claude/settings.json` und die darin genannten Hooks
  (`docs/harness/startfreigabe-erneuern.md` Schritt 4), nicht `.claude/agents/`. → v1-Annahme: **keine** neue Startfreigabe
  nötig; zu belegen über den Messcode (`src/invocation-policy`). → **Offener Punkt O3.**

### 9 F-1061 (1) — Stand der lokalen Datei über Neustarts
`erzeugeLokalWaechter(pfad, jetzt, speicher?)`: mit `speicher` wird der zuletzt bekannte Stand als Kernartefakt
`faehigkeiten-lokal-stand` im Kontrollzustand der Workforce gehalten (`registriereKernArtefakt` bei jedem
Route-Schreiben und jeder Bestätigung). Beim Start: kein Eintrag → aktueller Stand gilt als bekannt und wird festgehalten
(erster Start nach dem Update); gleicher Hash → bekannt; anderer Hash → `fremd_geaendert` wie im laufenden Betrieb (Band,
Schreib-Routen 409, Start mit Katalog-Fähigkeiten abgelehnt bis „Datei geprüft – Stand übernehmen“). Ohne `speicher`
(Gates/Tests) unverändert. Schreibfehler des Speichers → geloggt, Route bleibt erfolgreich (Folge beim nächsten Start:
Band — die sichere Richtung). ARCHITECTURE.md §2 Satz „lebt nur im Speicher“ nachziehen. → **Offener Punkt O2.**

### 10 F-1060 (6) Lauf-Detail: voller Hash per Tastatur
`lauf-detail.js` Zeile ~642: `<code title>` → `<details class="hash-detail"><summary><code>abc…</code></summary><code>voller
Hash</code> <button>Kopieren</button></details>` (Muster Freigabe); Kopieren über `navigator.clipboard` mit Rückmeldung.

### 11 Register und Doku
- `state/findings.md`: F-1062 (K24, Codex-Reviewer-Audit-Block), F-1063 (K25, Review-Schema v2), F-1056/F-1057 erledigt,
  F-1061 (1) erledigt (Rest (2), (4)), F-1060 (6) erledigt; neue Findings aus dem Bau. Doppelter Schlussblock in F-1061
  bereinigen.
- `docs/projekt/fixpaket-f45.md` §3: extern_lesend-MCPs (E-F36-4, F-1052) von F-2b nach F-3; Akte `features/F45/feature.md`
  (Statuszeile F-2a gemergt, Abschnitt „Stand F-2b“, Scope-Zeile), `docs/STATUS.md`, ARCHITECTURE.md §2.
- Gate `scripts/check-f45-f2b-sammlung.mjs` (Parser gegen die echte Datei: 176/172, Pflichtspalten; Rollenvertrag;
  Argv-Bitgleichheit ohne zusatzOrdner; Freigabe-409; Server-Muster) in `npm run check`.

### Tests
Parser (nur Matrix — eine Kosten-Tabelle davor/danach zählt nicht; 176/172 gegen die echte Datei; fehlende Spalte,
falscher Kopf, unbekanntes Urteil, doppelte id → Fehler), Zuordnung (eindeutig/mehrdeutig/keine/alias), Typ- und
Standregel, Ausnahme-Begründung Pflicht (400), Freigabe ohne / mit veraltetem / mit NICHT_GEEIGNET-Bericht → 409, mit
passendem → weiter, Ergebnis-Validator (rot/grün, typ/version-Abweichung), Tar-Leser (Pfadangriff, Symlink, pax),
Neutralisierung, git-Quelle mit Attrappen-Runner (Symlink wird Fakt, kein Abbruch), Gateway `--add-dir` nur mit
`zusatzOrdner`, Scout-Schema additiv (alte Ergebnisse gültig, neue Felder geprüft), F-1061 (1) rot/grün (Neustart mit
geänderter Datei → fremd; ohne Änderung → nicht; erster Start → Baseline), Hash-Detail im Lauf-Detail.
Echte Prüfläufe: impeccable (skill, ganzes Repo), context7-mcp (`@upstash/context7-mcp`, nur Prüfung) über eine eigene
Leitstand-Instanz (Muster `features/F45/nachweise/f2a/beleg13.mjs`), Berichte nach `features/F45/nachweise/f2b/`.
Render-Nachweis (Liste, Filter, Detail, ausgeschlossen, Auswählen läuft, Bericht, Freigabe gesperrt ohne Bericht; 390 px,
Zoom 200 %, hell).

### Offene Punkte (nicht stillschweigend entschieden)
- **O1 Zahl 172 vs. 176**: Auftrag nennt 172, die Datei hat 176 Zeilen (eigene Angabe 176), davon 172 mit Link.
  v1: beide Zahlen ins Gate, Zeilen ohne Link sichtbar, aber nicht auswählbar. Alternative: Zeilen ohne Link gar nicht
  zeigen (dann 172 Einträge).
- **O2 F-1061 (1) Ablage**: eigenes Kernartefakt `faehigkeiten-lokal-stand` im Workforce-Kontrollzustand (v1) vs. Hash aus
  der letzten Laufakte (`faehigkeiten_im_lauf`/Vorher-Nachher-Hash) — Letzteres meldet nach jedem Schalterklick ohne
  folgenden Lauf beim Neustart fälschlich „von außen geändert“.
- **O3 Startfreigabe** nach Änderung an `.claude/agents/scout.md` — Annahme „nicht nötig“ muss gegen den Messcode belegt
  werden. Zusätzlich: F-1 hasht Projekt-Agents gegen die Katalog-Datei der Workforce — eine geänderte `scout.md` ändert
  diesen Hash (nur relevant, wo ein Projekt eine Kopie trägt; Skelett trägt scout nicht).
- **O4 Neue Rolle statt `scout`**: v1 nimmt eine neue Rolle `eignungspruefung` (lesend, ohne Web). Kosten: ein
  ROLLENVERTRAEGE-Eintrag, ein Schema; Gates, die Rollen aufzählen (`check-f17-rollenvertrag`, Harness-Abgleich), ziehen nach.
- **O5 Inhalt der Quelle im Lauf**: Neutralisieren von `.claude`/`CLAUDE.md` gegen das automatische Laden über `--add-dir`
  — reicht das? (Verschachtelte `.claude/skills` und `CLAUDE.md` in Unterordnern lädt die CLI ggf. bei Bedarf.) Alternative:
  Prüfordner ohne `--add-dir`, Inhalte als Kontextpaket (Budget 200 KB reicht für ganze Repos nicht).
- **O6 Prüfbericht-Ablage global** (`sammlungBasisVerzeichnis`) vs. im Projekt des Laufs.
- **O7 Vormerken für neue Einträge**: neue Text-Variante im bestehenden Vormerken-Weg; „Ergänzen“ bestehender Einträge
  (z. B. `herkunft.paket` für context7) nicht gebaut → Finding.

## Advisor-Pass (frischer Kontext, architecture-advisor, 12.10.2026)
Urteil **nicht freigegeben** (Richtung trägt, mehrere verhaltensbestimmende Punkte offen). Befunde A1–A21 (Kurzform):
A1 Zuschnitt zu groß, Schätzung fehlt → aufteilen (Stefan) · A2 409 als Rückruf in `InstallationsKontext` unter der
Sperre nach eintragHash (Statuscodes der Gates bleiben); gilt der **neueste** passende Bericht, Suche nach Quelle statt
Schlüssel; quellPfad aus dem durch eintragHash gebundenen Katalogeintrag · A3 Prüflauf immer in der Workforce-Instanz
(Lauf und Bericht in derselben Ablage, Startfreigabe/CLAUDE.md der Workforce) · A4 D13 reservieren → 202 → Holen und Lauf
asynchron, Fehler gibt Sperre frei, Abbruch greift beim Holen, verwaiste Temp-Ordner beim Start räumen · A5 Neutralisieren
mit Normalisierung (Kleinschreibung, NFC, Punkte/Leerzeichen am Ende, `.claude*`), `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`
entfernen, Nachweis über die init-Zeile (Skills/Commands ⊆ gemessene Menge, sonst kein Bericht), Rot-Fall `.ClAuDe`,
Fakten getrennt vom Modellurteil · A6 Tar-Leser: Segment-Allowlist, Gerätenamen, `maxOutputLength`, unbekannte Typen als
Fakt · A7 `npm pack` mit cwd = leerer Temp-Ordner, sha1-Integrity ablehnen · A8 leerer Pfad: Pfadargument weglassen
(echter git-Test), Grenzen per `ls-tree -l` vor dem Checkout · A9 Quellen ohne GitHub/npm → „keine prüfbare Quelle“; MCP
ohne npm → git-Prüfung (nur Information) · A10 vollständige Liste der Rollen-Aufzählungen (benoetigte_capabilities,
F346_AUSNAHMEN/check-f19, check-f17 erwarteteRollen, rollen-anzeige ROLLEN + i18n, rollen.test) und harte Prüfung
Werkzeugsatz = Read,Grep,Glob · A11 O3 geschlossen: keine neue Startfreigabe (`src/invocation-policy/index.ts` misst nur
settings.json + Hooks) · A12 scout.md erreicht den Leitstand-Scout nicht; Server hängt eine kompakte Sammlungsliste an den
Auftragstext, kein `--add-dir` für den Scout, `urteil_sammlung` serverseitig gegen die Sammlung prüfen · A13 Zuordnung trägt;
GitHub-Pfad klein normalisieren, Bibliotheksregel über URL der Stack-Liste, Art nur als Vorschlag · A14 176/172 bestätigt;
feste Zahlen nur im Gate, zur Laufzeit Selbstprüfung (auch je Urteil) · A15 Versionsdrift: „Bericht für X, aktuell Y –
erneut prüfen“; Tree-id als Finding · A16 Modell, Zeitgrenze, Budget, `jsonObjektFallback` · A17 `zusatzOrdner` im Body
ausdrücklich ablehnen + Rot-Fall · A18 F-1061 (1): Stand je Checkout vs. Datei je Nutzer → neben der Datei unter
`~/.ai-workforce` oder Grenze dokumentieren · A19 Vormerken-Variante `typ: extern`, unterart, Ref-URL, skill_pfad/paket ·
A20 Clipboard-Fallback · A21 Bedeutung des Urteils im Bestätigungs- und Freigabedialog, Ausnahme-Begründung dort zeigen.

## Entscheidungen Stefan nach dem Advisor-Pass (12.10.2026)
- **A1 Zuschnitt: teilen.** **F-2b-1** (dieser Branch): Sammlung lesen, Zuordnung, Typ/Stand, Unterreiter „Sammlung“,
  Scout liest die Sammlung (F-1057), F-1060 (6), Register K24/K25, Fixpaket/Akte. **F-2b-2** (eigener Auftrag danach):
  Prüflauf (Rolle `eignungspruefung`, Holen git/npm, Neutralisieren, Init-Nachweis), Prüfbericht als Kernartefakt,
  409-Sperre der Freigabe, Auswählen/Ausnahme-Begründung, Vormerken-Variante, F-1061 (1), echte Prüfläufe impeccable und
  context7-mcp. Advisor-Befunde A2–A10, A15–A19, A21 gelten für F-2b-2 und stehen dort als Eingabe (Plan F-2b-2 v1).
- **O1: alle 176 Zeilen zeigen**, die 4 ohne Link nicht auswählbar; Gate: 176 Zeilen, 172 mit Link.

## Plan v2 — F-2b-1 (gilt; Abweichungen von v1)
Schätzung F-2b-1: ≈ 0,6 AT (Server ≈ 0,25, UI ≈ 0,2, Scout/Register/Nachweis ≈ 0,15). F-2b-2: ≈ 1–1,25 AT (zwei echte
Läufe, Sicherheitsteil).

**Invarianten** wie v1; zusätzlich: Argv **jeder** Rolle bitgleich (auch scout — A12: kein `--add-dir`, nur der Prompt
wächst), kein Schreiben irgendwohin (F-2b-1 ist rein lesend), kein neuer Lauf-Typ, keine neue Rolle.

### 1 `src/sammlung/index.ts` (neu, reine Funktionen)
- `parseSammlung(text)` wie v1 §1; Fehler sammeln statt beim ersten abbrechen; zusätzlich Bedeutung je Urteil aus
  „## Entscheidungen lesen“ (A21) und **Selbstprüfung** gegen „Erfasste Bewertungszeilen: **N**. Aufnehmen: n, …“ — Gesamt
  und je Urteil (A14). Feste Zahlen 176/172 **nur im Gate** (A14); zur Laufzeit erzeugt eine Abweichung der Selbstprüfung
  einen sichtbaren Fehlerstand.
- `normalisiereUrl`: Kleinschreibung der ganzen URL (GitHub owner/repo sind case-insensitiv, A13), ohne `www.`, ohne
  `/`/`.git` am Ende, ohne Query/Fragment. `normalisiereName`: nur `a-z0-9`.
- `ordneZu(eintraege, katalog)`: Stufen Link → Name wie v1 §2; Alias nimmt nicht teil; 1:1-Regel je Stufe.
- `leseStackUrls(text)`: URL-Spalte der Tabelle in `docs/harness/stack-kandidaten.md` (A13) → Menge normalisierter URLs.
- `bestimmeTyp`: Katalog (`unterart`; lokaler `typ` skill/agent → `lokal`) → `stack-liste` (URL in der Stack-Liste) →
  Vorschlag aus dem Abschnitt (MCP→mcp, Skills→skill, Plugins→plugin, UI→bibliothek) mit `typ_quelle: 'abschnitt'` (nur
  Vorschlag, A13) → `unbestimmt`.
- `pruefbareQuelle(link)`: `github.com/<owner>/<repo>…` → `git`; `npmjs.com/package/<name>` → `npm`; sonst `null`
  („keine prüfbare Quelle“, A9).
- `auswahl(eintrag, typ, …)` → `{ auswaehlbar, grund }` für die Anzeige (wirksam erst mit F-2b-2): Alias, ohne Link,
  keine prüfbare Quelle, Bibliothek („für gebaute Projekte — wählt der Architekt“), Plugin (F-3), lokal (Repo);
  `ausgeschlossen` = Urteil `Nur Ausnahme`/`Ausgeschlossen` mit Grund (Bedeutung + Bewertung) → Auswählen nur mit
  Ausnahme-Begründung (F-2b-2).
- `berechneStand(katalogEintrag, katalogStatus)`: `benutzt` · `aktiv` · `installiert` · `vorgemerkt` · `nur_sammlung`;
  `pruefbericht`: `ohne_vor_f2b` (FREIGEGEBEN) oder `keiner` (die Stufe `geprueft` kommt mit F-2b-2; Feld vorbereitet).
- `baueSammlungAnsicht({ text, stackText, katalog, katalogStatus })` → `{ status:'ok', quelle, eintraege, zaehlung,
  urteil_bedeutung }` | `{ status:'fehler', grund }`.
- `baueScoutSammlung(ansicht)` (A12): kompakte Liste `Name | Art | Urteil | Lizenz | Link` je Zeile (~176 Zeilen) plus
  Stack-Liste `Name | URL`, als Anhang an den Scout-Auftrag. `pruefeScoutGegenSammlung(ergebnis, ansicht)`: je Kandidat
  Sammlungstreffer per normalisiertem `quelle_url` → `{ id, urteil, lizenz }` (Serverwahrheit), Abweichung von
  `urteil_sammlung` markiert.

### 2 Route `GET /api/sammlung` (`scripts/leitstand/routen-sammlung.mjs`, Server registriert nur)
Liest beide Dateien aus `installWurzel` (Cache nach mtime/size), Katalog (`leseRessourcenRoh` + `loeseRessourcenAuf`),
Katalog-Status über eine aus `baueFaehigkeitenStatus` herausgezogene Funktion `baueKatalogStatus` (Verhalten von
`baueFaehigkeitenStatus` bitgleich, Test bleibt). Nicht im Poll. Fehler → 200 mit `status:'fehler'` + Grund (Muster
Harness-Abgleich), 500 nur bei ungültigem Katalog.

### 3 Oberfläche — Unterreiter „Sammlung“ (Capability Library)
Wie v1 §7 ohne Auswählen-Ablauf: Liste nach Art gruppiert, Suche, Filter Urteil und Stand, Zeile (Name, Was es kann,
Urteil, Lizenz, Kosten, Stand, Link — nur `https`, `rel="noopener noreferrer"`), Detail aufklappbar (Bewertung, Bedeutung
des Urteils, Zuordnung zum Katalog, Typ mit Quelle der Regel, Prüfbericht „ohne Prüfbericht (vor F-2b freigegeben)“ bzw.
„keiner“). Ausgeschlossene: Grund sichtbar. Bibliotheken: Hinweis. „Auswählen“ als Knopf mit Kennzeichen „kommt“
(`kommtBadge`, F-2b-2) bzw. Grund, warum nicht auswählbar. Lädt mit „Neu laden“/Projektwechsel parallel (Muster F-2a),
kein Poll. Reine Regeln in `public/leitstand/sammlung-anzeige.js` (Filter, Gruppen, Chips; Tests), View
`views/sammlung.js`. i18n de/en/ru/tr (Serverwerte roh + escapeHtml).

### 4 Scout liest die Sammlung (F-1057, A11/A12)
- `POST /api/laeufe` mit `rolle: 'scout'`: der Server hängt `baueScoutSammlung` an den Prompt (Muster `vorbereitet.zeile`)
  mit der Regel „zuerst die Sammlung, Urteil/Lizenz übernehmen, `quelle: "sammlung"`, `urteil_sammlung`; Web nur für Lücken
  — das Lesen der Liste zählt nicht gegen das Web-Budget“. Sammlung nicht lesbar → Hinweiszeile „Sammlung nicht verfügbar:
  …“, Scout läuft wie bisher. Kein `zusatzOrdner`, Argv bitgleich.
- Schema `ergebnis-scout` additiv: Kandidat `quelle` (`sammlung`|`web`), `urteil_sammlung` (eine der 10 Entscheidungen),
  beide optional; Validator, Typen, Beispiele (alt gültig, neu gültig, ungültiger Wert).
- Projektion `scoutErgebnis` additiv `sammlung` je Kandidat (Serverwahrheit, A12); Karte zeigt „aus der Sammlung · Urteil X“
  bzw. „Angabe des Scouts weicht ab“.
- `.claude/agents/scout.md`: Abschnitt „Sammlung zuerst“ (Doku für den Subagenten der Sitzung). Startfreigabe: **nicht
  nötig** (A11, `src/invocation-policy/index.ts` misst nur settings.json + Hooks) — Beleg in die Akte.

### 5 F-1060 (6), Register, Doku, Gate
- `lauf-detail.js`: `<details>` mit vollem Hash als markierbarem Text + „Kopieren“; ohne `navigator.clipboard` sichtbarer
  Hinweis (A20).
- Register: F-1062 (K24), F-1063 (K25) wie Auftrag; F-1057 erledigt; F-1060 (6) erledigt; F-1056 bleibt offen (F-2b-2);
  neues Finding für die Sammlungsquellen ohne Prüfweg (A9) erst mit F-2b-2; doppelter Schlussblock in F-1061 bereinigen.
- Fixpaket §3: Zeile F-2b in F-2b-1/F-2b-2 mit Schätzung; extern_lesend-MCPs (E-F36-4, F-1052) nach F-3. Akte (Statuszeile
  F-2a gemergt #324, „Stand F-2b-1“, Scope), `docs/STATUS.md`.
- Gate `scripts/check-f45-f2b-sammlung.mjs` in `npm run check`: Parser gegen die echte Datei (176/172, Pflichtspalten,
  Selbstprüfung), Route registriert, Scout-Anhang im Server nur für `rolle === 'scout'`, `starteWorkflowSchritt(` 6-mal.
- Render-Nachweis: Sammlung (Liste, Filter, Detail, ausgeschlossen, Bibliothek, nicht auswählbar), Scout-Karte mit
  Sammlungsangabe (Antwort-Attrappe), Lauf-Detail-Hash aufgeklappt; 390 px, Zoom 200 %, hell.

### Tests F-2b-1
Parser (nur Matrix — Kosten-Tabelle davor zählt nicht; echte Datei 176/172; fehlende Spalte, falscher Kopf, unbekanntes
Urteil, doppelte id, Selbstprüfung rot), Zuordnung (eindeutig/mehrdeutig/keine/alias, Groß-/Kleinschreibung), Typregel,
prüfbare Quelle, Stand, Auswahlgrund, Scout-Schema additiv (alt gültig), Scout-Anhang nur für scout, Abgleich
`urteil_sammlung`, Anzeige-Regeln (Filter/Gruppen), Hash-Detail.

## Delta-Advisor-Pass auf Plan v2 (frischer Kontext, 12.10.2026) — freigegeben mit Hinweisen
B1–B14; vor dem Bau festgelegt (v2.1):
- **B1** „Argv bitgleich“ genau: für scout gilt der gestartete Argv (`tokens.slice(0,-1)`, Prompt per stdin, F-642)
  bitgleich, nur der Prompt wächst; für jede andere Rolle das ganze `tokens`.
- **B3** Anhang als reine Funktion (`scripts/leitstand/routen-sammlung.mjs`: `ergaenzeScoutPrompt(rolle, text, installWurzel)`,
  andere Rolle → Text unverändert), Unit-Tests für scout / andere Rolle / Sammlung fehlt. Grenze: ein Scout-Schritt über
  einen Workflow (`starteWorkflowSchritt`) bekommt keinen Anhang (Akte).
- **B6** Katalog-Status über die herausgezogene `baueKatalogStatus` (Verhalten von `baueFaehigkeitenStatus` gleich, Tests
  grün); das Laden (Katalog, lokale Datei, letzte Laufakte) steht einmal in der Sammlungs-Route.
- **B8** Strukturfehler (Kopf, Spalten, Urteil, id, fehlender Abschnitt) → `status:'fehler'`; reine Zählabweichung der
  Selbstprüfung → Liste wird gezeigt, mit Fehlerband (`selbstpruefung[]`), Scout bekommt die Liste.
Mitlaufend: B4 (Validator-Felder, Folge eines falschen Werts in die Akte), B5 („laut Sammlung, aktueller Stand“), B7 (Grund
mit „Vorschlag aus Abschnitt“ kennzeichnen), B9 (Folge einer geänderten scout.md für Projektkopien in die Akte), B10
(Kopieren-Muster aus `befehlsblock.js`), B11 (prüfbare Quelle strukturiert `{art, owner, repo, unterpfad}`/`{art:'npm',
paket}`, Org-/Gist-/Blob-Links → null), B12 (lokale Katalogeinträge: Prüfbericht „lokal“), B13 Reihenfolge Parser/Route →
UI → F-1060 → Scout.

## Nachtrag v2.2 — Bau, Prüfpass und Korrekturrunde F-2b-1 (12.10.2026)
- **Abweichung im Bau:** Die Serverwahrheit für die Scout-Karte steht als eigenes Feld `scoutSammlung` neben dem unveränderten
  `scoutErgebnis` (Lauf-Detail) — das Gate F27 AK14 verlangt das geprüfte Modellergebnis unverändert.
- **Zuordnung:** Die 1:1-Regel gilt über beide Stufen hinweg (ein Katalogeintrag, den zwei Zeilen treffen — gleich auf welcher
  Stufe —, ist für beide „mehrdeutig“); strenger als „je Stufe“ in v2, bei den echten Daten ohne Folge (QA 9).
- **Prüfpass (frischer Kontext):** code-reviewer „freigegeben mit Hinweisen“ (1 mittel: „Kopieren“ am Hash fehlte; 2–9 gering),
  qa „freigegeben mit Hinweisen“ (12 Lücken, keine kritische), design-guardian „nicht freigegeben“ (1 echter Bruch: zweite
  Live-Region `role="status"`; 2–9 Kleinkram).
- **Korrekturrunde (eine):** Live-Region entfernt; Detail ohne Doppeltext und einspaltig; Chips der Urteil-/Stand-Spalte ohne
  Wortbruch, Silbentrennung in der Tabelle; Abstände mit `.v10-seite`; Plural „1 von 176 Einträgen“; sichtbare Titel vor den
  Chip-Reihen; Scout-Zeile als Text + Urteil-Chip; „Kopieren“ am vollen Hash mit Rückfall (markieren + Hinweis), gebunden in
  `views/runs.js`; Filter beim Projektwechsel zurück, nicht mehr vorhandener Stand/Urteil fällt auf „Alle“; eigener Text, wenn
  ein anderer Sammlungseintrag denselben Katalogeintrag trifft; Kennzahl „auswählbar (ab dem nächsten Ausbau)“;
  `decodeURIComponent` ohne Wurf, Ansicht ohne Wurf, Fehler des Katalog-Status als Band (`stand_fehler`), höchstens fünf
  Strukturfehler im Grund, Scout-Abgleich ohne Alias und mit mehreren Zeilen je Link, Urteile aus einer Liste (Gate prüft die
  enum), Parse zwischengespeichert, Kommentar-/Typpflege. Render-Nachweis neu (21 Folgen, Ausschnitte, Tastatur, Scout-Karte
  über Attrappen, ausgeschlossen + auswählbar).
- **Nicht umgesetzt, als Finding (F-1068):** Gruppen einklappbar bei 390 px (QA 6), Texte des Servers (Selbstprüfung,
  Strukturfehler, Katalog-Status) bleiben deutsch (QA 8), Detail als eigene volle Tabellenzeile (design-guardian 3, Variante
  „besser“). Bewusst so: Gate (b) wird rot, sobald eine Zuordnung mehrdeutig ist (QA 12 — Absicht: ein neuer Katalogeintrag soll
  die Zuordnung nicht still verlieren).
