# Advisor-Pass F45 B5b-1 „Planungsdaten“ — Plan v1

Abgelegt wörtlich aus dem Bericht des Subagenten `architecture-advisor` (frischer Kontext, nur Read/Grep/Glob), 24.10.2026.
Geprüfter Plan: `features/F45/plan-b5b1.md` (v1). Urteil: **Nicht freigegeben** — Schnitt B5b-1a/B5b-1b vorgeschlagen (A1);
der Bauende schneidet nicht selbst (Bauauftrag), Bau gestoppt.

**Geprüft gegen:** `ARCHITECTURE.md` (§1 Wachstumsbremse, §2 :91–97, §3, §7 :170), `docs/architektur/wachstumsbremse.md`,
`docs/architektur/arbeitsordner.md`, `scripts/architektur-kern.json`, `scripts/wachstumsbremse-server.json`,
`docs/projekt/fixpaket-f45.md` (§2 R1–R7 :37–44, §3 :63–125), `features/F45/feature.md` (Status :12, Entscheidungen :22–45,
Scope :47–73), `docs/projekt/zielfassung.md` (:651–707, :850–879), `state/findings.md` (F-917, F-975, F-976, F-1010, F-1175,
höchste ID), `features/F45/advisor-b5a1.md`, `src/feature-auftrag/akte-schreiben.ts`, `src/feature-auftrag/index.ts:78–111`,
`scripts/leitstand/routen-f35.mjs`, `src/workboard/feature-akte-pruefung.ts`, `src/workboard/findings.ts`,
`src/projektkontext/index.ts:24–124`, `scripts/leitstand/routen-roadmap.mjs`, `scripts/leitstand/routen-projektakte.mjs:145–149,
213–236`, `scripts/check-akte-meilenstein.mjs`, `scripts/check-status-akten.mjs`, `scripts/check-f33-roadmap-projektion.mjs`,
`scripts/check-f813-csrf.mjs:119–155, 301`, `scripts/leitstand-server.mjs` (:1716–1782, :8296–8304, :9525–9536),
`public/leitstand/api.js:221–239`, `public/leitstand/roadmap-anzeige.js:118–140`, `public/leitstand/produkte-anzeige.js:86–92`,
`docs/projekt/roadmap.json`, Status-Zeilen aller 48 Akten, die 18 Akten mit `## Workstreams`, die 16 mit `## Workstream-Liste`,
`features/F35/feature.md:12`, `features/F43/feature.md:7`, `docs/STATUS.md:419–421, 480–482, 500–502`.

**Rollengrenze:** nur Read/Grep/Glob, kein Bash/git, nichts ausgeführt. Nicht geprüft: Merge-Daten/PR-Nummern aus `git log`
(Grundlage für Status/Abgenommen der F45-Migration), Byte-Größe von `ARCHITECTURE.md` gegen den Deckel 17 800 B, ob Gates/Tests
heute grün sind, der Text des Bauauftrags selbst (E-B5-3, E-B5-5, E-B5-6, E-KANBAN und „bestehender Mechanismus“ stehen nirgends
im Repo).

## Marker-Legende
[Fakt] belegt (Datei:Zeile) · [Fakt, entlastend] belegt und in Ordnung · [Schlussfolgerung] abgeleitet, nicht ausgeführt ·
[Annahme] plausibel, unbelegt · [offene Unsicherheit] mit diesen Rechten nicht entscheidbar.

## A. Vor dem Bau klären (Entscheidung Stefan/Challenger)

**A1 Zuschnitt zu groß für einen Baudurchgang + eine Korrekturrunde (O7).** [Fakt] Fixpaket gibt B5b-1 einen engeren Inhalt
bei 0,6–0,8 AT (Format, Priorität, Bugs mit Feldern, F-1010; `fixpaket-f45.md:112`). [Fakt] „Anpassen R6“,
„Datenbereinigung als Bestätigungsliste“ und Kennzahlen R2/R5 stehen dort bei B5b-2 (`:113`); der Plan zieht deren Serverseite
nach B5b-1 vor (§6 drei Routen, zwei bis drei Schreibziele; §7 Zeitachse, Kennzahlen, Kanban, Pflege). [Fakt] Vergleich B5a-1:
zwei Schreibrouten auf eine Datei, schon „grenzwertig“ (`advisor-b5a1.md:63`, C13). [Fakt] Ist bei Paketen mit
Advisor-Auflagen real ≈ doppelt (F-3b-1 0,5 → 0,95, `fixpaket-f45.md:81`). [Fakt] Plan §12 nennt das Risiko selbst.
[Schlussfolgerung] Umfang ≈ B5b-1 plus Serverhälfte B5b-2 — nicht tragfähig.
**Schnitt (Vorschlag):**
- **B5b-1a „Planungsdaten lesen“ (Server ±0):** `src/workboard/feature-planung.ts` (Priorität, Abgenommen, strenges
  `## Workstreams`, eingebunden in `pruefeFeatureAkteInhalt`); `src/workboard/roadmap-regeln.ts` (Gate R1 +
  `roadmap-ausnahmen.json`, Bestand von Hand mit den 5 Einträgen, nur lesend); Aufruf in `check-akte-meilenstein.mjs`;
  Migration F45 + F30, F30-Ausnahme entfernt; Bug-Felder (§8); additive Projektion je Feature (`prioritaet`, `abgenommen`,
  `workstreams`, `planung_befunde`) plus `roadmap_hash` (B2); Zeitachse und Kennzahlen R2/R5 als reine Funktionen; F-1010 und
  F-1175; Gate `b5b1a`; Änderungen nur in `routen-roadmap.mjs`.
- **B5b-1b „Planungsdaten schreiben“:** `routen-planung.mjs` (GET bereinigung, POST bestaetigen, PUT planung), Export der Helfer
  aus `routen-f35.mjs`, Ausnahmen ARCHITECTURE §2/§7 (A2, A3), Server-Block mit Ausgleich, CSRF-Probe je Route (B3),
  Rückbau-Test. Abhängigkeit 1b → 1a im CONTEXT benannt.
- Rückfall, falls 1a wächst: Zeitachse/Kennzahlen nach B5b-2 (einziger Verbraucher). `pflege` und `kanban` entfallen in
  beiden Teilen (B1).

**A2 Schreiben von `roadmap.json` und `roadmap-ausnahmen.json` ist eine neue Ausnahme in ARCHITECTURE §2.** [Fakt]
`ARCHITECTURE.md:95–96` „im Projektordner bleibt der Kern lesend, außer der Feature-Akte auf Eingabe“, ebenso
`docs/architektur/arbeitsordner.md:15`. [Fakt] Plan führt es nur unter §11 Doku; bei B5a-1 war derselbe Fall Befund A1 mit
Entscheidung Stefans (`advisor-b5a1.md:25`). [Fakt] `ARCHITECTURE.md:181` verlangt Durchsetzungsgrad. [Schlussfolgerung] Kernsatz
+ Detailtext mit ERZWUNGEN/DEKLARIERT: nur `roadmapPfad` und Ausnahmen-Datei daneben, nur auf direkte Eingabe, Hash-409, nur
Werte bzw. `features`-Literale textuell, Rundlauf, Rückbau best effort DEKLARIERT. [offene Unsicherheit] Deckel 17 800 B
(`scripts/architektur-kern.json:2`) nicht gemessen.

**A3 „Zeilenende erhalten“ für `roadmap.json` widerspricht §7.** [Fakt] `ARCHITECTURE.md:170`: Kern schreibt LF, einzige
Ausnahme bestehende Feature-Akte. [Fakt] Plan §6.2 verlangt es auch für roadmap.json. [Schlussfolgerung] Bei CRLF in einem
Fremdprojekt entweder gegen §7 oder nicht bytegleich. Zu entscheiden: §7-Ausnahme erweitern oder bei CRLF 422 „von Hand“; neue
Ausnahmen-Datei LF. [Fakt, entlastend] hier `* text=auto eol=lf`.

**A4 Migrationsquelle F45-Scope-Tabelle unvollständig; „Bis M5“ zu niedrig (O3).** [Fakt] Scope-Tabelle
(`features/F45/feature.md:49–71`) kennt W1, K, W2, V1 Vorschau nicht (nur `fixpaket-f45.md:99, 105, 115, 117`); W2 ≈ 1,5–3 AT,
V1 0,3–0,5 AT offen. [Fakt] Reihenfolge `… B5b-3 → V1 → B3 → W2 → R → R2 → F30` (`fixpaket-f45.md:121`) weicht von der
Tabellenreihenfolge ab. [Schlussfolgerung] „Bis M5“ ≈ 1,8–3,5 AT zu niedrig, `start_at` mit veralteter Reihenfolge.
Empfehlung: fehlende Zeilen und Feinpakete aus `fixpaket-f45.md` §3 (führende Grundlage, `features/F45/feature.md:20`), Quelle
wörtlich in Notiz, Reihenfolge nach :121 — Bestätigung Stefan nötig (über den Wortlaut „Migration der F45-Tabelle“ hinaus).

**A5 Entscheidungen ohne Repo-Beleg.** [Fakt] E-B5-3, E-B5-5, E-B5-6, E-KANBAN in keiner Datei außer dem Plan. [Fakt] §11
trägt nur E-B5-6 und E-KANBAN nach; E-B5-3 und E-B5-5 fehlen für die F45-Entscheidungen. [offene Unsicherheit] Kanban in §7
kennt nur Akten-Priorität P0–P3; F-917 und `docs/design/abgleich-f725.md` §4 Punkt 4 beschreiben ein Kanban aus
Finding-Prioritäten P0–P4 mit Features unter „ohne Priorität“ (`state/findings.md:6904, 6907`) — ob E-KANBAN = A das ersetzt,
nicht prüfbar.

## B. In Plan v2 festlegen (ohne neue Entscheidung)

**B1 `pflege` in GET /api/roadmap blockiert die Event-Loop; `pflege`/`kanban` unnötig.** [Fakt] `parseFindings` ≈ 130–390 ms
synchron, gecacht nur in `sammleWorkitems` (`leitstand-server.mjs:1716–1720, 1766–1776`). [Fakt] GET /api/roadmap synchron ohne
Cache (`:8301–8303`), ebenso GET /api/projektakte (`routen-projektakte.mjs:228`). [Schlussfolgerung] gefährdet P2 (≤ 200 ms,
`fixpaket-f45.md:30`). [Fakt] Roadmap-Seite lädt `holeWorkitems` schon (`api.js:23`); `kanban` gruppiert nur `prioritaet` um.
Empfehlung: beide streichen, B5b-2 leitet ab; sonst Cache als Rückruf (kostet Server-Zeilen).

**B2 Quelle für `roadmap_hash` fehlt.** [Fakt] PUT verlangt ihn, §7 liefert ihn nicht. [Schlussfolgerung] `roadmap_hash` in
die Projektion, aus demselben Lesevorgang (Advisor B6 B5a-1).

**B3 Keine CSRF-Probe je Route.** [Fakt] `docs/architektur/wachstumsbremse.md:10` verlangt sie (direkt und über
`/api/projekte/<id>/…`); §10 hat keine (bei B5a-1 Befund B2). [Fakt] `check-f813-csrf` (3) erkennt nur
`req.method === '<LITERAL>'` (`:134`). [Schlussfolgerung] Methode als Datum aus dem Modul ist Grauzone; näher am Muster:
Methodenwahl im Server je `art` (`leitstand-server.mjs:9529–9530`). Zusätzlich Rückbau-Fall ins Gate.

**B4 PUT „meilenstein“ gegen Ausnahmen und E-B5-2 nicht festgelegt.** [Schlussfolgerung] F18 aus M3 verschoben ⇒ Ausnahme
verwaist ⇒ Gate rot. „Gate nach Bearbeitung rot ⇒ 422“ muss `pruefeAkteMeilenstein` und `pruefeMeilensteinStatus` auf den
neuen Stand umfassen, nur neue Befunde blockieren (`schonVorher`, `akte-schreiben.ts:375–378`). Empfehlung 422 „erst
bereinigen“. Ungeregelt: Einplanen einer ENTWURF-Akte ohne Meilenstein, Ausplanen (`meilenstein: null`?) (`features/F45/feature.md:44`).

**B5 F30 mit leerer strenger Tabelle machte „Bis M5“ fälschlich berechenbar.** Regel: nicht abgeschlossenes/abgebrochenes
Feature mit `[]` oder `null` zählt als ein Eintrag ohne Schätzung.

**B6 Bereinigung hat Nebenwirkungen außerhalb der Schreibziele.** [Fakt] `docs/STATUS.md:421, 481, 501` nennen F18, F20, F25 in
Standardform mit `FEATURE_GATE`; `check-status-akten` (b) ⇒ nach „F18 → ABGESCHLOSSEN“ ist `npm run check` rot. [Fakt]
„Meilenstein → LAEUFT“ macht M3/M4 zum „aktuellen Meilenstein“ (`routen-projektakte.mjs:147`, `roadmap-anzeige.js:120`). Plan
v2: Folgepflege-Hinweis in der Antwort, Nebenwirkung im Vorschlagstext, DEKLARIERT. [Fakt] F25 „WS-2b/WS-3 noch offen“
(`STATUS.md:501–502`) liegt nach E-M5-17 im V1-Backlog — entscheidet Stefan beim Bestätigen.

**B7 Kennzahlen R2 als zweiter Regelsatz.** [Fakt] Client zählt schon (`roadmap-anzeige.js:128, 140`, `produkte-anzeige.js:92`).
[Fakt] `routen-roadmap.mjs:27` liest Status mit `\s*` (greift über Zeilenenden), `leseFeatureStatus` mit `[ \t]*`.
[Schlussfolgerung] Projektion nutzt `leseFeatureStatus`; Plan hält fest, welche Zählung in B5b-2 führt.

## C. Im Bau mitlaufend
- **C1** [Fakt, entlastend] `findeAbschnitt(inhalt, 'Workstreams', true)` exakt wiederverwendbar; „## Workstream-Liste“ (16
  Akten) trifft nicht. Exakt verwenden.
- **C2** [Fakt] `check-f33-roadmap-projektion.mjs:64`: bei `nicht_vorhanden` genau ein Schlüssel ⇒ neue Top-Level-Felder nur
  bei `status: 'ok'`.
- **C3** Einträge hinter einem Eintrag ohne Schätzung markieren (`nach_unbekannt: true`).
- **C4** Zwei Schreibziele synchron ohne await; `baueGitBlock` für mehrere Pfade verallgemeinern; Köpfe nachziehen.
- **C5** [Fakt] Widersprüche in der Quelle: P „(Bau, nicht gemergt)“ (`feature.md:52`) gegen „P gemergt #317“ (`:12`); „B5a-2 …
  nicht committet“ (`:12`) gegen `e750e94` (#375). Status nur aus git, Texte wörtlich in Notiz.
- **C6** [Annahme] „Abgenommen = Datum des Merge-Commits“ ist Deutung — im Abschnittstext DEKLARIERT.
- **C7** PUT planung legt keine Workstream-Zeilen an ⇒ F30 bleibt ohne Schätzung; als Grenze nennen.
- **C8** Akten P0–P3, Findings P0–P4: Zuordnung von P4 in B5b-2 festlegen.
- **C9** Bei überall strengem `Abgenommen:` sind Fremdakten mit freiem Text per PUT …/akte nicht mehr bearbeitbar (422 „schon
  vorher“); DEKLARIERT.
- **C10** `sha256Hex` existiert (`src/checkpoint-store/index.ts:62`) — keine dritte sha-Hilfe.
- **C11** „≈“ in der strengen Zelle weglassen vertretbar; Zusätze wörtlich in Notiz.

## D. Offene Punkte O1–O7
| Punkt | Urteil | Begründung |
|---|---|---|
| O1 Ausnahmen als `roadmap-ausnahmen.json` | tragfähig, Empfehlung Datendatei (mit A2) | Skript-`AUSNAHMEN` (`check-akte-meilenstein.mjs:48–59`) kann der Server nicht schreiben, Fremdprojekte haben es nicht; R1-Wortlaut „Features … tragen eine Begründung“ (`fixpaket-f45.md:38`) spräche für Aktenzeile, die bei Meilenstein → LAEUFT aber N+1 Dateien bedeutet. Bedingungen: Validierung rein in `roadmap-regeln.ts`, fehlende Datei = keine Ausnahmen, ungültig = Befund nie Wurf, LF, zwei Ausnahme-Orte DEKLARIERT. |
| O2 `Abgenommen:` nur bei strengem Abschnitt streng | Empfehlung: überall ISO-Anfang, F35 umformatieren; Pflicht bei ABGESCHLOSSEN nur bei strengem Abschnitt | Einzige Bestandszeile `features/F35/feature.md:12`, Datum steht darin. Grenze C9. |
| O3 B5a/B5b durch Teilpakete ersetzen | tragfähig, „nichts erfinden“-konform mit Quelle `fixpaket-f45.md` §3 in Notiz | Teilschätzungen `fixpaket-f45.md:110–114`; zusammen mit A4 entscheiden; Bedeutung von Art `fixpaket` im Abschnittstext definieren. |
| O4 `Abgenommen:` bei Bereinigung | tragfähig: Datum der Bestätigung mit Zusatz „(Bereinigung: <grund>)“ | Heute greift O4 nicht (F18/F20/F21/F22/F25 ohne strengen Abschnitt). |
| O5 Änderungszeile je Akte bei Meilenstein → LAEUFT | Empfehlung: keine | keine Akte ändert sich; Grund in der Commit-Nachricht; falls E-B5-3 es verlangt: Stefan. |
| O6 „ohne Bezug“ | nach B5b-2 verschieben (B1); sonst nur existierende IDs zählen | Muster trifft jede genannte Akten-ID, auch nicht existierende. |
| O7 Zuschnitt | nicht tragfähig | A1. |

## E. Geprüft und in Ordnung (Auszug)
R1-Verstöße genau M3/F18, M4/F20, F21, F22, F25; alle 18 `## Workstreams` beginnen mit Bullet/Leerzeile (Regel „streng =
Tabelle“ lässt den Bestand grün); `Abgenommen:` nur F35:12, `Priorität:` nirgends; Bug-Label 0 Treffer unter `state/`; höchste
ID F-1183; `pruefeFeatureAkteInhalt` ist der richtige Integrationspunkt; `validiereRoadmapDaten` hält v0; F30-Ausnahme muss weg;
F30 als ENTWURF in M5 zulässig, AK-Quelle belegt (`zielfassung.md:661–680`), E-F30-3 → F43; Wachstumsbremse erreichbar, keine
Pfadkollision; GET /api/roadmap nicht gepollt; R6 deckt sich mit `fixpaket-f45.md:43`; B5a-1-Schreibmuster sauber übernommen.

## Urteil
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [x] Nicht freigegeben
- [ ] Blockiert

Grundanlage tragfähig; nicht freigegeben wegen Zuschnitt (A1), zwei Architekturregeln ohne eingetragene Ausnahme (A2 §2, A3
§7), Migrationsquelle verfälscht R5 (A4), Projektion riskiert P2 (B1), fehlender Hash-Weg für den Meilenstein-Wechsel (B2) und
`npm run check` rot nach einer Bereinigung (B6). Nicht Blockiert, jeder Punkt hat einen kleinen Ausweg.
Nach Schwere: (1) vor Baubeginn mit Entscheidung A1, A2, A3, A4/O3, A5, O1, O2, O5; (2) in Plan v2 B1–B7, O4, O6; (3)
mitlaufend C1–C11.

## Nächster sinnvoller Schritt
1. Stefan/Challenger entscheidet den Schnitt B5b-1a/B5b-1b (A1); der Bauende stoppt bis dahin.
2. Stefan entscheidet A2, A3, A4/O3, O1, O2, O5; E-B5-3, E-B5-5, E-B5-6, E-KANBAN wörtlich in die F45-Entscheidungen (A5).
3. Plan v2 je Teilpaket mit B1–B7; kein zweiter Advisor-Pass (Regel 3a); danach code-reviewer und qa mit frischem Kontext.
4. Merge-Belege für die Migration per `git log` vom Bauenden erheben.
