# F45 B2a-1 — Plan (Projektkarte)

Branch `f45/b2a1-projektkarte`, Basis `c62e7e7` (main mit F-2b-2c, #328). Grundlage: Auftrag F45 B2a-1 (13.10.2026,
Challenger-Schnitt B2a → B2a-1/-2/-3), Fixpaket-Zeile B2a, Belege 1/2/10, Findings F-936, F-1064, F-1065, F-1066, F-929,
F-931, F-829, F-1062. Keine neue Abhängigkeit. Ziel: Architekt, Architecture-Advisor und Code-Reviewer bekommen — für
Claude und Codex gleich, als Text im Auftrag — eine deterministisch je Lauf erzeugte Projektkarte mit Zuschnitt je Rolle.

## Plan v1

### Befunde vorab (Code gegen c62e7e7)
- Projektkontext geht nur an jarvis/router (`baueProjektkontextAnfragen`, `scripts/leitstand-server.mjs` Z. 2342, Aufrufe
  Z. 8485/8640). Der Architekt bekommt Rolleninstruktion, ADR-Block (`leseEntschiedeneAdrs`), Stackhinweis und — nur im
  Modus `projekt` — den Capability-Auszug (Z. 5967–5985). Der Advisor bekommt Rolleninstruktion + ADR-Block (Z. 5993).
- `workflow-vorlagen/hoch.json`: architekt (codex, lesend, `ergebnis-architektur`), architecture-advisor (claude-code,
  lesend), ausfuehrung (claude-code, schreibend), code-reviewer (codex, `ergebnis-code-reviewer`). Codex lädt weder
  CLAUDE.md noch Skills (F-929) → die Karte muss TEXT im Auftrag sein.
- Code-Reviewer: AK-Block Z. 6102 (`baueAkPruefInstruktion`), Beobachtungsblock Z. 6111 — heute auch für codex (F-1062).
- Bestehende Lesepfade, die die Karte wiederverwendet (D5):
  - DoD aus CLAUDE.md: `leseHarnessInventar(wurzel)` (`src/harness-abgleich/index.ts` Z. 258, Einträge `art: 'dod'`,
    Parser `leseDodPunkte`).
  - ADRs: `leseEntschiedeneAdrs(wurzel)` (`src/architekt/index.ts` Z. 489).
  - Versionierte Dateien: `leseVersionierteDateien(wurzel)` (`scripts/leitstand-server.mjs` Z. 2473, git ls-files).
  - Aktive Fähigkeiten: Pipeline des GET `/api/faehigkeiten` (Z. 7706–7760: `leseRessourcenRoh` →
    `ladeFaehigkeitenLokal` → `ermittleProjektFaehigkeiten` → `baueFaehigkeitenStatus`, Feld `aktiv`).
  - Text-Dateien als Modellkontext (beschreibung.md u. a.): die Leseschleife in `loeseAusfuehrungsEingabenAuf`
    (Z. 3133–3148: `loeseEvidenzPfadAuf` + `existsSync/statSync` + `readFileSync`). ARCHITECTURE.md und
    `.claude/agents/code-reviewer.md` liest der Server heute nirgends.
- Ausführungsrahmen-Quellen: Werkzeugsatz des Ausführungsschritts (`loeseWerkzeugsatzAuf(vorlage, name)`), `vorlage.
  bashZeitgrenzeMs`, `vorlage.pruefbefehl`, Arbeitsordner (`laufort.arbeitsordner`); feste Grenzen, die der Kern für
  jeden Lauf erzwingt: kein git (Validator weist `Bash(git…)` ab, E-F754), kein Hintergrund (F-1026, FEHLGESCHLAGEN),
  npm-Installationsskripte aus (`npm_config_ignore_scripts`, `src/claude-code-gateway/index.ts` Z. 705), Löschen nur per
  Löschliste (`baueLoeschlistenSatz`, nur mit Arbeitsordner), ein Befehl je Aufruf (`baueBashAllowlistSatz`).
- Laufakte: Zusatzfelder fließen `loeseAusfuehrungsEingabenAuf` → `AusfuehrungsEingaben` → Controller → Gateway
  (Muster `faehigkeitenImLauf`, nur Claude). Der Codex-Gateway baut seine Laufakte selbst (`src/codex-gateway/index.ts`
  Z. 396). Validator `validiereLaufakteDaten` (Claude-Gateway Z. 1169) + Schema `kontrollzustand-laufakte-payload`.
- Auftrag v0 trägt keinen Feature-Bezug (Schema `kontrollzustand-auftrag-payload`: nur `herkunft.art`) → „Feature-Akte
  falls verknüpft“ ist heute nie verknüpft; der Bezug kommt mit B2a-2.
- Das ARCHITECTURE.md dieses Repos trägt `[FÜLLUNG — GANZE DATEI]` im HTML-Kommentar am Kopf, der Inhalt ist gefüllt →
  die Erkennung muss HTML-Kommentare ignorieren und je `## `-Abschnitt urteilen.

### 1 Modul `src/projektkarte/` (rein, deterministisch, ohne I/O)
`baueProjektkarte(eingaben, rolle) → { text, hash, abschnitte, fehlend }`; `hash` = sha256 über `text`.
Eingaben (alle vom Server gelesen; `null` = nicht verfügbar):
`{ projektbeschreibung: {pfad, text}|null, auftrag: {titel, ziel, akzeptanzkriterien, nicht_ziele}, architektur:
{pfad, text}|null, adrs: string, dateien: string[]|null, rahmen: {werkzeuge, bashRegeln, bashZeitgrenzeMs, pruefbefehl,
arbeitsordner}|null, faehigkeiten: {typ,name,quelle}[]|null, dod: string[]|null, reviewCheckliste: {pfad,text}|null,
lesefehler: string[] }`.

Abschnitte:
| Abschnitt | Inhalt |
|---|---|
| Vorhaben | Projektbeschreibung (Auszug `docs/projekt/kontext/beschreibung.md`), Auftrag (Titel, Ziel des Workflows, AK, Nicht-Ziele — beim code-reviewer nur Verweis auf den AK-Block, keine Doppelung), „Feature-Akte: kein Feature-Bezug im Auftrag (folgt mit B2a-2)“ |
| Bestand | ARCHITECTURE.md-Auszug (Abschnitte ohne `[FÜLLUNG]`; HTML-Kommentare entfernt), Liste nicht beschriebener Abschnitte, „Architektur noch nicht beschrieben“ statt Vorlagentext, wenn Ordnerstruktur UND Datenzugriff Platzhalter sind (F-1066); ADRs (architekt/advisor: Verweis auf den bindenden ADR-Block im selben Auftrag; code-reviewer: Text aus `leseEntschiedeneAdrs`); Ordnerübersicht aus git ls-files (Ordner bis Tiefe 2 mit Dateizahl, je Ordner ≤ 12 Unterordner, gesamt ≤ 60 Zeilen) |
| Ausführungsrahmen | Werkzeuge und erlaubte Befehle aus dem Werkzeugsatz des Ausführungsschritts, kein git, nichts im Hintergrund, ein Befehl je Aufruf, Schreiben nur im Arbeitsordner (bzw. Projektordner), Löschen nur per Löschliste (nur mit Arbeitsordner), npm-Installationsskripte aus, Bash-Zeitgrenze, Prüfbefehl (der Kern führt ihn nach dem Lauf aus); Rollenzeile: architekt → „Planschritt außerhalb des Rahmens nur als Entscheidung (kategorie 'sonstig', Frage beginnt mit 'Ausführungsrahmen:') oder capabilities_bedarf status 'fehlt'“ (F-1064, keine Schemaänderung); advisor → „Planschritt außerhalb des Rahmens ohne diese Meldung ist ein Befund“ |
| Aktive Fähigkeiten | Katalog- und Projekt-Einträge mit `aktiv` aus dem F-1-Stand des Projekts (gleiche Regel wie Seite Workforce) |
| Qualität | DoD aus CLAUDE.md (Punkte), Prüfbefehl; code-reviewer zusätzlich ARCHITECTURE.md als Prüfmaßstab (F-931) und die Checkliste aus `.claude/agents/code-reviewer.md` (Abschnitt „Prüfkriterien“) mit Anweisung „Urteil je Punkt“: jeder nicht erfüllte Punkt ein eigener Befund mit Präfix `DoD:`/`Checkliste:`, in `empfehlung` eine Zeile „Checkliste: n geprüft, m nicht erfüllt, k nicht anwendbar“ (F-829; strukturiertes Feld je Punkt erst mit Review-Schema v2, B2a-3) |

Zuschnitt je Rolle (Größengrenze Gesamttext):
| Rolle | Vorhaben | Bestand | Ausführungsrahmen | Aktive Fähigkeiten | Qualität | Grenze |
|---|---|---|---|---|---|---|
| architekt | ✓ | ✓ | ✓ | ✓ | ✓ | 20 000 Zeichen |
| architecture-advisor | ✓ | ✓ | ✓ | – | ✓ | 16 000 |
| code-reviewer | ✓ (AK als Verweis) | ✓ (ADR-Text) | – | – | ✓ + Checkliste | 14 000 |
| ausfuehrung | – | – | – | – | – | – |
| jarvis/router | unverändert (keine Karte) | | | | | |

`ausfuehrung` bekommt bewusst keine Karte: Ausführungsrahmen steht schon im Auftrag (`baueBashAllowlistSatz`,
`baueLoeschlistenSatz`, Prüfbefehl-Hinweis — dieselben Quellen), die DoD lädt Claude Code selbst aus CLAUDE.md
(`--setting-sources project`); eine Karte wäre Doppelung (Auftrag: „sonst begründet weglassen“).

Kürzung: je Abschnitt eine Obergrenze (Vorhaben 4 000, Bestand 8 000, Rahmen 2 500, Fähigkeiten 1 500, Qualität 4 000),
sichtbarer Marker `… [gekürzt — vollständig in <pfad>]`; danach Gesamtgrenze je Rolle, Kürzung am Ende mit Marker.
`fehlend` listet jede Lücke („ARCHITECTURE.md: fehlt“, „ARCHITECTURE.md: Architektur noch nicht beschrieben“,
„Projektbeschreibung: fehlt“, „DoD: kein Abschnitt …“, „Ordnerübersicht: git nicht lesbar“, „Aktive Fähigkeiten: …“,
„Checkliste code-reviewer: fehlt“), ebenso Lesefehler. Der Text nennt Lücken sichtbar statt sie zu überspringen.
`[FÜLLUNG` und `[FUELLUNG` (Checkliste) gelten beide als Platzhalter; DoD-Punkte „[FÜLLUNG, nur UI]“ bleiben (bedingte
Punkte, so auch in diesem Repo).

Dazu im selben Modul: `analysiereArchitektur(text) → { beschrieben: Abschnitt[], offen: string[], nichtBeschrieben:
boolean, pflichtFehlt: string[] }` — eine Regel für Karte UND Regel 1h (Pflichtabschnitte Ordnerstruktur, Datenzugriff,
Module; „Module“ gilt als erfüllt, wenn ein beschriebener Abschnitt „Modul“ im Titel trägt ODER die Ordnerstruktur
`src/`-Unterordner benennt — offener Punkt O2).

### 2 Server: Einspeisen beim Schrittstart
- Neue Hilfsfunktion `leseProjektkarteEingaben(laufWurzel, …)` im Server: liest beschreibung.md, ARCHITECTURE.md,
  code-reviewer.md über eine aus `loeseAusfuehrungsEingabenAuf` herausgezogene `leseKontextDatei(pfad, wurzel)` (die
  bestehende Leseschleife ruft dieselbe Funktion — kein zweiter Lesepfad), DoD über `leseHarnessInventar`, ADRs über
  `leseEntschiedeneAdrs`, Dateien über `leseVersionierteDateien`, Fähigkeiten über eine aus dem GET-Handler
  herausgezogene `ermittleFaehigkeitenStatus()` (Handler ruft sie ebenfalls). Jede Quelle fail-open: Fehler → `null` +
  Eintrag in `lesefehler`; der Schritt läuft weiter (Muster `filtereExistierendeAnfragen`).
- In `starteWorkflowSchritt` (an der Stelle des AK-Blocks): für `architekt`, `architecture-advisor`, `code-reviewer`
  `karte = baueProjektkarte(…)`, `auftragstext += '\n\n' + karte.text`; `{hash, abschnitte, fehlend}` geht als
  `ausfuehrungsOptionen.projektkarte` in `loeseAusfuehrungsEingabenAuf` → `eingaben.projektkarte`.
  `starteWorkflowSchritt(` bleibt 6× im Server.
- Laufakte: neues optionales Feld `projektkarte: { hash, abschnitte, fehlend }` (Schema additiv, Validator-Zwilling);
  der Controller reicht es an beide Gateways (Codex: `CodexGatewayOptionen.projektkarte`; Claude: `GatewayOptionen`).
  Ohne Karte bleibt jede Laufakte bitgleich.

### 3 Architekt (F-1065)
- Capability-Auszug auch im Modus `feature` (`baueArchitektAuftragstext` ohne Moduswahl; der Server liest
  `ressourcen.json` für beide Modi — im Modus `feature` fail-open: Fehler → kein Auszug + Log, im Modus `projekt`
  bleibt der Abbruch wie heute).
- Rolleninstruktion (beide Modi) bekommt: „Lies die für den Auftrag relevanten Dateien vor dem Entwurf (Projektkarte →
  Bestand) und belege sie im evidenz-Array als [Fakt] mit Pfad.“
- Projektkarte in beiden Modi (Schritt 2).

### 4 F-1066
- `PROJEKTMODUS_SCOPE_ALLOWLIST_DATEIEN` = {`CLAUDE.md`, `ARCHITECTURE.md`}.
- `baueStackEntscheidungsInstruktion`: dritte Pflicht „ARCHITECTURE.md: Abschnitte Ordnerstruktur, Module,
  Datenzugriff füllen, `[FÜLLUNG]` entfernen“.
- Regel 1h (Nachlauf, gleiche Vorbedingung wie CLAUDE.md/ADR, F-714): neues Feld `stackArchitekturFehlt` aus
  `analysiereArchitektur(ARCHITECTURE.md).pflichtFehlt.length > 0` (bzw. Datei fehlt); `src/workflow` Regel 1h meldet
  „Stack entschieden, aber ARCHITECTURE.md ohne Ordnerstruktur/Module/Datenzugriff (F-1066)“ — eigener Verstoß wie F-735.

### 5 F-1062
Beobachtungsblock nur, wenn `(schritt.worker ?? 'claude-code') === 'claude-code'`. Test
`scripts/leitstand/review-beobachtung.test.mjs` anpassen (Codex-Reviewer: kein Block).

### 6 Gate `scripts/check-f45-b2a1-projektkarte.mjs` (in `npm run check`)
(a) Karte für architekt/advisor/code-reviewer: Abschnitte gemäß Tabelle, nicht mehr; (b) Hash stabil bei gleichen
Eingaben, anders bei geänderter ARCHITECTURE.md; (c) `[FÜLLUNG]`-ARCHITECTURE.md (Skelett-Datei
`vorlagen/projekt-skelett/ARCHITECTURE.md`) → „Architektur noch nicht beschrieben“, kein Vorlagentext, `fehlend` gesetzt;
dieses Repo → beschrieben; (d) Kürzung sichtbar über der Grenze; (e) über den echten HTTP-Pfad mit Attrappe (Muster
`review-beobachtung.test.mjs`): hoch-Workflow — Architekt-Auftrag (feature) enthält Bestand und Ausführungsrahmen und
Capability-Auszug, Codex-Review-Auftrag ohne Beobachtungsblock, Claude-Review mit; `eingaben.projektkarte` gesetzt; ohne
ARCHITECTURE.md läuft der Schritt, `fehlend` nennt die Lücke; (f) Allowlist enthält ARCHITECTURE.md; Regel 1h rot bei
Skelett-ARCHITECTURE.md; (g) Laufakte mit/ohne `projektkarte` gegen `validiereLaufakteDaten`; (h) jarvis/router-Pfade
ohne Karte (Quelltextprüfung: `baueProjektkarte` nur in `starteWorkflowSchritt`). Unit-Tests `src/projektkarte/*.test.ts`.

### 7 Echter Nachweis (`features/F45/nachweise/b2a1/`)
Leitstand mit `LEITSTAND_PORT=4199` gegen dieses Repo, kleiner Auftrag (feature) im hoch-Workflow, nur Schritt 1
(architekt, codex) laufen lassen, danach stoppen. Ablegen: Karte (Text + Hash), Entwurf (Ergebnis), Auswertung (kein
git-Schritt, Prüfbefehl `npm run check`, Bestand mit Pfad belegt), Kosten (Tokens aus `verbrauch`) und Dauer. Keine
Rohströme, keine `*.lokal.json`. Leitstand danach beenden.

### 8 Doku/Register
F-936, F-1064, F-1065, F-1066, F-929, F-931, F-829, F-1062 → erledigt bzw. teilweise mit Rest (F-929: Codex bekommt
Projektkarte/DoD/Checkliste als Text; Rest Skills → nicht übertragbar, bewusst; F-931: Review/Advisor ja, qa-Schritt
gibt es erst mit B2b; F-829: Urteil je Punkt im Befund-Format, strukturiert mit B2a-3; F-936: Roadmap/Lagebild nicht in
der Karte — offener Punkt O1). Neue Findings ab F-1082 für Restpunkte. Fixpaket-Zeile B2a → B2a-1/-2/-3 (+ F-1072 →
B2b), Abschnitt 5 „B2a geteilt“; Akte F45, STATUS; ARCHITECTURE.md §1 um `src/projektkarte/` (nur `src/` ist dort
gelistet — Eintrag als Satz unter `src/`); Nachtrag F-1061 (Wortlaut aus dem Auftrag).

### Offene Punkte (nicht stillschweigend entschieden)
- **O1** Roadmap/Lagebild (F-936 nennt sie): nicht in der Karte (Auftrag nennt sie nicht; Größe). Rest in F-936.
- **O2** Pflichtabschnitt „Module“: ARCHITECTURE.md des Skeletts hat keinen Abschnitt „Module“. Regel: erfüllt durch
  einen Abschnitt mit „Modul“ im Titel ODER durch die Ordnerstruktur — oder Skelett um `## Module` ergänzen? (Vorlagen
  sind laut Auftrag „nicht ändern außer begründet“.)
- **O3** Fähigkeiten-Pipeline beim Schrittstart: `ermittleProjektFaehigkeiten` liest `.claude/` des Projektordners und
  Hashes — Kosten je Architekt-Start; vertretbar (ein Start, kein Poll)?
- **O4** Größengrenzen: Zahlen geschätzt (Codex-Prompt per stdin, kein Argv-Limit).
- **O5** Beobachtungsblock für Codex fällt weg — `vorgesehen gegen benutzt` bleibt im Harness-Abgleich (Beleg 12).

## Advisor-Pass (13.10.2026, frischer Kontext, `architecture-advisor`)
Urteil **Freigegeben mit Hinweisen**. Vor dem Bau: (1) Allowlist-Wortlaut „(docs/**, features/**, CLAUDE.md)“ steht an
fünf Stellen (`src/architekt/index.ts:748`, `src/workflow/index.ts:956`, `scripts/leitstand-server.mjs:6560`,
`scripts/check-fixpaket-f35-reallauf.mjs:437/441`); (2) Regel-1h-Verstöße werden auch im VERWEIGERT-Pfad gesammelt
(`leitstand-server.mjs:6563–6568`, Übergabe :6622, `src/workflow/types.ts`); (3) bestehende Gates kehren sich um
(`check-f39-architekt.mjs` (c)/(n1) „feature ohne Capability-Auszug“, `review-beobachtung.test.mjs` nutzt Codex-Reviewer;
Claude-Reviewer nur mit `output_schema: null`); (4) O2: „Module“-Heuristik unbelegt — Vorschlag Pflicht = Ordnerstruktur
+ Datenzugriff, „Module“ als Satz in der Instruktion (Entscheidung Stefan); (6) Checkliste heißt `## Pruefkriterien`,
„nur UI“ einheitlich. Läuft mit: (5) Nummern in Überschriften ignorieren, LF vor Hash, §1-Nachtrag ohne Marker; (7)
Extraktionen unnötig — schmaler fail-open Leser, `kontextPfad`, Fähigkeiten-Teil :7714–7738 reicht, `projektkarte` nach
:6167 setzen; (8) „aktiv“ ≠ was die Ausführung bekommt → Wortlaut „im Projekt eingeschaltet“; (9) Durchreichung durch
beide Gateways ist der einfachste Weg; (10) ADR-Verweis ohne die Überschrift „Bereits entschiedene Projektentscheidungen
(bindend):“ (`check-fixpaket-f35-reallauf.mjs:84/498`); (13) Zuschnitt knapp — Extraktionen, Module-Heuristik und
kompletten hoch-Lauf im Gate streichen.

## Plan v2
Änderungen gegenüber v1 (Rest unverändert):
- **§1 Modul:** Text vor dem Hash auf LF normalisiert; Abschnittstitel ohne Nummer verglichen („## 1. Ordnerstruktur“);
  `[FÜLLUNG`/`[FUELLUNG` beide Platzhalter; Punkte mit „nur UI“ (DoD und Checkliste) bleiben, ohne Marker-Text, und sind
  im Review „nicht anwendbar“, wenn keine UI berührt ist. Skelett §5/§8 (Vorlagentext ohne Marker) erscheinen nur im
  teilweise gefüllten Fall — benannte Grenze. Checklisten-Überschrift `Pruefkriterien`/`Prüfkriterien`.
- **O2 (Standard, Stefan bestätigt oder ändert):** `analysiereArchitektur.pflichtFehlt` = Ordnerstruktur, Datenzugriff
  (gleiche Regel wie „Architektur noch nicht beschrieben“); „Module“ wird Satz der Stack-Instruktion („Module/Ordner
  unter Ordnerstruktur benennen“). Skelett bleibt unverändert.
- **Aktive Fähigkeiten:** Überschrift „Im Projekt eingeschaltete Fähigkeiten“ (Projekt-Agents/-Skills mit Opt-in und
  Freigabe, Katalog-MCPs/-Skills installiert + freigegeben + nicht abgeschaltet); Hinweis „welche Katalog-Fähigkeiten
  die Ausführung bekommt, legt die Empfehlung beim Start fest“; keine zweite Katalogliste neben dem Capability-Auszug.
- **§2 Lesen:** keine Extraktion von `leseKontextDatei` und keiner Status-Funktion. Ein schmaler fail-open Leser
  `leseKarteDatei(rel, wurzel)` mit `loeseEvidenzPfadAuf` für beschreibung.md (Pfad aus `kontextPfad`), ARCHITECTURE.md,
  code-reviewer.md; Fähigkeiten über eine kleine Funktion aus dem Teil :7714–7738 (Katalog + lokale Datei +
  `ermittleProjektFaehigkeiten` + `baueKatalogStatus`/Projekt-Teil über `baueFaehigkeitenStatus` ohne Lauf-Felder).
  `projektkarte` nach :6167 per Spread in `ausfuehrungsOptionen`.
- **§4:** Allowlist-Wortlaut an allen fünf Stellen auf „(docs/**, features/**, CLAUDE.md, ARCHITECTURE.md)“; neues
  Feld `stackArchitekturFehlt` in `src/workflow/types.ts`, Regel 1h (`src/workflow/index.ts`) UND im VERWEIGERT-Pfad
  des Servers.
- **§6 Gate:** kein vollständiger hoch-Lauf; das Gerüst aus `review-beobachtung.test.mjs` (Attrappe
  `fuehreAufgabeDurch`) mit Architekt-, Advisor- und Review-Schritt. Bestehende Gates, begründet geändert:
  `check-f39-architekt.mjs` (c)/(n1) (Feature-Modus jetzt MIT Capability-Auszug, F-1065), `architekt.test`
  (falls betroffen), `check-fixpaket-f35-reallauf.mjs` (a) (Allowlist-Wortlaut), `review-beobachtung.test.mjs`
  (Worker-Parameter: Codex ohne Block, Claude mit Block, `output_schema: null`), `workflow.test` (Regel 1h).
- ADR-Verweis in der Karte ohne die Überschrift des bindenden ADR-Blocks.

## Entscheidung O2 (Challenger, 13.10.2026)
Bestätigt wie Plan v2: Pflicht beim Stack-Entscheid sind die ARCHITECTURE.md-Abschnitte „Ordnerstruktur“ und „Datenzugriff“;
„Module“ steht nur als Satz in der Stack-Instruktion; das Skelett bleibt unverändert.

## Nachtrag (Bau, 13.10.2026)
- Bestehender Lesepfad statt Neubau: `ladeFaehigkeitenGrundlage` aus dem GET-Handler herausgezogen (Fehlertexte gleich) — eine
  Grundlage für Seite Workforce und Karte. `leseKarteDatei` nur für Dateien ohne bestehenden Lesepfad.
- check-f17 (AK1) wertet Rollennamen als Objektschlüssel als zweite Rollenliste → Zuschnitt und Grenzen als `Map`.
- Quellstand (12 Hex) je eingebetteter Datei im Kartentext: eine Änderung hinter einer Kürzung ändert sonst den Hash nicht.
- Echter Architekt-Lauf: Kürzungsmarker lag über der Grenze (Fehler im Bau, vom Entwurf gefunden) → Marker zählt mit; Überschriften
  der Projektbeschreibung kollidierten mit Kartenabschnitten → eingebettete Überschriften auf Ebene 4.
- Prüfpass code-reviewer und qa (beide „nicht freigegeben“, gleicher Hauptgrund: Gesamtkürzung schnitt beim Review die Qualität
  ab) → eine Korrekturrunde: Bestand zuletzt, Grenzen 24 000/20 000/20 000, Kürzung in `abschnitte`/`fehlend` sichtbar, Gate (k)
  mit echter Repo-Größe, Regel 1h im VERWEIGERT-Pfad getestet (check-f42 h5), weitere Punkte siehe Akte „Stand B2a-1“; Rest F-1082.
