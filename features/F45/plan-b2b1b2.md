# F45 B2b-1b-2 — Plan (Plan v2 der Plan-Stufe)

Branch `f45/b2b1b2-plan-v2` (von origin/main `b5849a5`, nach #339). Grundlage: `features/F45/plan-b2b1b.md` (Plan v2,
Teilung 1b-1/1b-2, Entscheidungen Stefan A2/A5, Fallkennung (c7) „v2 mit neuer Frage“), `features/F45/plan-b2b1.md`
(Advisor-Pass B2/B11/B13/B14, Entscheidungen B4/B5), Rückweg-Regel aus B2b-1a (`pruefeRueckweg`, `grenzen.max_replans`,
je Stufe 1, „Prüfer wiederholen“), Advisor-Schema aus B2b-1b-1. Findings F-909, F-1106 (Rest F-1104 (4) Knopf). Bau erst
nach freigegebenem Plan. Schätzung laut fixpaket ≈ 0,75 AT.

## Plan v1

### 1. Ziel der Iteration

In `hoch` arbeitet die Plan-Stufe wie der manuelle Ablauf: Architekt (Plan v1) → Advisor (Schema 1b-1) → bei
FREIGEGEBEN_MIT_AUFLAGEN/UEBERARBEITEN einmal Architekt mit den Befunden (Plan v2), kein zweiter Advisor → Stefans
ZWINGEND-Freigabe (sieht Plan und Befunde) → Ausführung bekommt nur den letzten Plan.

### 2. Referenzen

Plan-Dateien oben; `scripts/leitstand-server.mjs` (Nachlauf `starteLaufUndVergiss`-Rückruf ~7160–7650, Startweg
`starteWorkflowSchritt` ~6666, GET `/api/workflows/<id>` ~8290, POST `/api/workflows` ~9250, POST …/entscheidung ~10459);
`scripts/leitstand/f35-ws3-adjust-automatik.mjs` (`pruefeRueckweg`); `scripts/leitstand/routen-f39.mjs`
(`findeWorkflowEntscheidungFuerSchritt`); `src/workflow/index.ts` (`ermittleNaechstenSchritt`, `pruefeSchrittForm`);
`public/leitstand/views/workflow-entscheiden.js`, `workflow-eingriffe.js`, `workflows.js`; ARCHITECTURE.md §2/§4/§7.

### 3. Module und Datenbedarf

#### 3.1 Schrittfeld `rueckweg` (additiv, Muster `freigabe_erteilt`)

- `src/workflow/index.ts` `SCHRITT_FELDER` + `pruefeSchrittForm`: optional `rueckweg: { anlass_schritt_id, vorheriger_lauf_id }`
  (beide nicht-leere Strings, keine weiteren Felder). `validiereWorkflowDaten`: `anlass_schritt_id` ist eine bekannte
  schritt_id (B11). `types.ts`, `schemas/kontrollzustand-workflow-payload.schema.json` (optional, additionalProperties false).
- POST `/api/workflows` (Anlage/neue Fassung): `rueckweg` gehört dem Server — nie aus dem Body; eine neue Fassung desselben
  Ablaufs behält je schritt_id den festgehaltenen Wert der gespeicherten Version (Muster `basis_commit`, B11). Grund: eine
  Reparaturfassung nach gescheitertem Plan-v2-Lauf setzt den Architekten zurück; ohne `rueckweg` liefe er als v1 und hinge
  danach am bereits gelaufenen Advisor (Regel 3).

#### 3.2 Rückweg-Entscheidung (rein, Automatik-Datei)

`scripts/leitstand/f35-ws3-adjust-automatik.mjs`:
- `zaehlePlanRueckwege(schritte)` → 1, wenn ein Schritt mit Rolle `architekt` `rueckweg` trägt, sonst 0 (B7).
- `ermittlePlanRueckweg({ workflowDaten, advisorSchrittId, urteil, kernVersionen })` → `{ ausloesen: true, architektSchrittId }`
  | `{ ausloesen: false, art?, grund }`. Bedingungen: Urteil FREIGEGEBEN_MIT_AUFLAGEN/UEBERARBEITEN; der direkte Vorschritt
  des Advisors (`nachfolger === advisor`) hat Rolle `architekt`, ist ERFOLGREICH mit `lauf_id` und trägt noch keinen
  `rueckweg`; dann `pruefeRueckweg({ stufe: 'plan', rueckwegeStufe: zaehlePlanRueckwege, rueckwegeGesamt: plan + kern,
  maxReplans })`. Nur die Grenz-Ablehnung trägt `art: 'grenze'` (Anzeige „Kein Plan v2: <Grund>“, A2).
- `baueSchritteFuerPlanRueckweg(schritte, { architektSchrittId, advisorSchritt })` → neue Schrittliste: Architekt `OFFEN`,
  `lauf_id null`, ohne `freigabe_erteilt`, `rueckweg = { anlass_schritt_id: advisor, vorheriger_lauf_id: <v1-Lauf> }`;
  Advisor unverändert ERFOLGREICH; B13: beim Nachfolger des Advisors entfällt `artefakt:ergebnis-@<advisor>`.
- `pruefeRueckweg` bekommt den Ausweg je Stufe: Bau unverändert („Anpassung wünschen“ oder „Ablehnen“); Plan „Entscheide
  bei der Freigabe der Ausführung: Freigeben oder Ablehnen.“ (der Bau-Satz passt dort nicht).
- Bau-Stufe rechnet ab jetzt `rueckwegeGesamt = Bau + Plan` (`ermittleAutomatischeAnpassung` bekommt `planRueckwege`, hoch
  `max_replans 2` = 1 + 1; standard/fast-lane ohne Architekt unverändert).

#### 3.3 Nachlauf des Advisors (Server, EIN Schreibvorgang)

Im Nachlauf-Rückruf, vor `schreibeWorkflowFortschritt` (Muster 1a): bei Advisor ERFOLGREICH mit gültigem Ergebnis
(`leseAdvisorErgebnisAusLaufakte`, ohnehin gelesen) und Urteil ≠ FREIGEGEBEN → `ermittlePlanRueckweg`. Im Updater:
- `ausloesen` ⇒ Schritte aus `baueSchritteFuerPlanRueckweg`; `naechster = ermittleNaechstenSchritt({ …, schritte,
  aktiver_schritt_id: architekt })` (ohne Vorschrittergebnis ⇒ in hoch `haltFreigabe` am Architekten, ZWINGEND); Grund
  = Freigabe-Grund + „ — Plan v2: Der Architekt überarbeitet den Plan mit n Befund(en) des Advisors.“
- sonst unverändert `ermittleNaechstenSchritt(…, advisorVerstoesse)`.
**Abweichung von Plan v2 (1b):** keine eigene Funktion `wendePlanRueckwegAn` mit zweitem Schreibvorgang und kein
`planRueckwegFolgt` an Regel 1d. Der Rückweg entsteht im selben Schreibvorgang wie der Advisor-Ausgang — kein
Zwischenzustand „KLAERUNG, Plan v2 folgt“, keine Sackgasse bei gescheitertem zweitem Schreiben, keine neue
`schreibeWorkflowFortschritt`-Stelle (F-228-Zählung in `check-f15-workflow.mjs` bleibt). Regel 1d (pure) bleibt wie in
1b-1: Verstöße ⇒ Halt, gültiges Urteil ⇒ weiter; nur Kommentare/Halt-Text werden nachgezogen.
Folgt kein Rückweg (FREIGEGEBEN, Grenze, kein Architekt davor): Weg wie 1b-1 zur ZWINGEND-Freigabe der Ausführung.
Gestartet wird hier nichts Neues: in hoch hält der Architekt an der Freigabe; ein Architekt mit AUTOMATISCH läuft über die
bestehende Auto-Fortsetzung (`starteWorkflowSchritt`, Zahl der Aufrufstellen bleibt 6).

#### 3.4 Architekt-Start mit `rueckweg` (Startweg, nur Text)

`starteWorkflowSchritt`, Zweig `architekt`: trägt der Schritt `rueckweg`, wird an den Architekt-Auftragstext
`baueArchitektPlanV2Instruktion({ planV1, advisor, entscheidungen })` (neu, rein, `src/architekt/index.ts`) angehängt:
Plan v1 als formatiertes JSON (Laufakte `vorheriger_lauf_id`, `leseErgebnistextAusRohstrom`), Urteil, Begründung und je
Befund id/Schwere/Evidenz/Fundstelle/Zusammenfassung/Korrekturrichtung (Laufakte des Anlass-Schritts,
`leseAdvisorErgebnisAusLaufakte`), Stefans Antworten zu v1 als bindender Block (B2), „Schreibe Plan v2 vollständig im
selben Schema (kein Diff); arbeite jeden Befund ein oder begründe in `zusammenfassung`, warum nicht; stelle bereits
beantwortete Fragen nicht erneut“. Laufakte v1 fehlt/unlesbar oder Advisor-Ergebnis ungültig ⇒ Start abgelehnt
(`konflikt`, Grund) — kein stiller v2 ohne v1. Keine neue Aufrufstelle.

#### 3.5 Routing nach Plan v2 (rein, `ermittleNaechstenSchritt`)

Vor `naechsteId = vorschritt.nachfolger`: trägt der Vorschritt `rueckweg`, ist `rueckweg.anlass_schritt_id ===
vorschritt.nachfolger` und dieser Schritt ERFOLGREICH mit `lauf_id`, dann ist der nächste Schritt dessen `nachfolger`
(`null` ⇒ fertig). Kein zweiter Advisor auf v2. Regeln 1/1c davor gelten unverändert (v2 mit offener Frage hält an).
`zaehleGelaufeneSchritte` (F-204) unverändert. Kopfkommentar „Prüfungen (…)“ nennt die neue Regel (3a).

#### 3.6 Entscheidungen zusammenführen (A1)

`findeWorkflowEntscheidungFuerSchritt` (routen-f39.mjs) führt intern alle Versionen derselben schritt_id zusammen: je
`frage` gewinnt die letzte Antwort, Reihenfolge der ersten Nennung, `entschieden_am` der neuesten Version; gleiche
Rückgabeform (`{ schritt_id, antworten, entschieden_am }` | null). Damit lesen alle Stellen (Regel-1c-Aufrufer, GET
`architekturEntscheidung`, `entscheidung-@`, Stack-Instruktion, Regel 1h, Projektion) die Zusammenführung.
Regel-1c-Aufrufer (Nachlauf) und GET-Projektion: „ausstehend“ = es gibt Fragen im aktuellen Lauf, deren `frage` in der
Zusammenführung keine Antwort hat (für v1 gleichwertig zu „keine Entscheidung erfasst“, weil die Route alle Fragen
verlangt). Die Route POST …/entscheidung bleibt (verlangt Antworten auf alle Fragen des aktuellen Laufs).

#### 3.7 Vorlage `hoch`

`workflow-vorlagen/hoch.json`: Ausführung `eingaben` ohne `artefakt:ergebnis-@schritt-2-architektur` (bekommt
`ergebnis-@schritt-1-architekt` = aktuelle `lauf_id`, nach Rückweg Plan v2, E1, und `entscheidung-@schritt-1-architekt`
= Zusammenführung). Advisor-`risiko`: Satz „Bis B2b-1b-2 …“ ersetzt durch den Rückweg. ZWINGEND bleibt bei Architekt,
Advisor, Ausführung; Review AUTOMATISCH.

#### 3.8 Projektion `planFreigabe` (F-1106, A9)

GET `/api/workflows/<id>` additiv `planFreigabe` (sonst null), nur bei `naechster.art === 'haltFreigabe'`:
- fälliger Schritt Rolle `ausfuehrung` und der Ablauf hat einen ERFOLGREICHEN Architekten mit `lauf_id` ⇒
  `{ art: 'ausfuehrung', fassung: rueckweg ? 2 : 1, plan, advisor, keinPlanV2 }`;
- fälliger Schritt Rolle `architekt` mit `rueckweg` ⇒ `{ art: 'plan_v2', fassung: 1, plan (v1 aus vorheriger_lauf_id),
  advisor (Anlass), keinPlanV2: null }`.
`plan = { zusammenfassung, module[{name, zweck}], entscheidungen[{frage, gewaehlt}] } | { fehler }` (Entscheidungen aus der
Zusammenführung); `advisor = { urteil, begruendung, befunde[{id, schwere, evidenz, fundstelle, zusammenfassung,
korrekturrichtung}] } | { fehler } | null`; `keinPlanV2` = Grund aus `ermittlePlanRueckweg` (`art: 'grenze'`), wenn das
Urteil ≠ FREIGEGEBEN und kein Rückweg gelaufen ist. Zwischenspeicher je `(architektLaufId, advisorLaufId)` für die
Laufakten-Teile (fertige Laufakten ändern sich nicht; Poll alle 2 s), Entscheidungen je Anfrage.

#### 3.9 Freigabe-Seite (UI)

`views/workflow-entscheiden.js` `renderFreigabeSeite`: neue Karten vor „Was startet“:
- „Plan, den du freigibst“ (art ausfuehrung) bzw. „Plan v1 — wird überarbeitet“ (art plan_v2): Kennzeichen „Plan v1/v2“,
  Zusammenfassung, Module (Name · Zweck), Entscheidungen (Frage → Antwort); Fehlerfall Fehlertext statt Plan.
- „Befunde des Advisors“: Urteil-Badge, Begründung, je Befund Schwere-Badge, Fundstelle (`<code>`), Zusammenfassung,
  Korrekturrichtung; nach v2 „In Plan v2 eingearbeitet — bitte prüfen.“; vor v2 „Diese Befunde gehen an den Architekten.“;
  gesperrter Rückweg „Kein Plan v2: <Grund>“; leer „Keine Befunde.“; kein Advisor ⇒ keine Karte.
Bestehende Klassen (`entscheiden-karte`, Badge-Klassen der Review-Befunde aus `workflow-abnahme.js`), `escapeHtml`,
`overflow-wrap: anywhere` für lange Texte (bestehende Regel prüfen, sonst eine Zeile CSS ohne neue Farbe). i18n de/en/ru/tr.
`workflows.js` reicht `detail.planFreigabe` in `aktuellesDetail` durch. Keine internen Kennungen im sichtbaren Text
(schritt_ids nur in `<code>` wie bisher nicht nötig — die Karten nennen keine).

#### 3.10 „Prüfer wiederholen“ für den Advisor (Leitstand-Knopf)

- GET `/api/workflows/<id>` additiv `prueferWiederholbar` (boolean), nur berechnet bei KLAERUNG mit Cursor auf einem
  Advisor-Schritt (`pruefschrittWiederholbar` + `ermittlePrueferBefund`, dieselbe Vorbedingung wie die Route).
- `workflow-eingriffe.js` `renderEingriffe(…, prueferWiederholbar)`: Notiz „Der Advisor hat kein verwertbares Ergebnis
  geliefert.“ mit Knopf „Advisor wiederholen“ (`.wf-aktion`, `data-aktion="pruefer-wiederholen"`); `workflows.js`
  `fuehreWorkflowAktionAus` → bestehendes `wiederholePruefer` (api.js) → Detail neu laden; Meldung „Der Advisor ist
  zurückgesetzt und startet nach deiner Freigabe.“ bzw. Fehlertext des Servers.
- Regel-1d-Grund ohne „(im Leitstand noch ohne eigenen Knopf für den Advisor)“.

#### 3.11 Gate `scripts/check-f45-b2b1-rueckweg.mjs` (Kopf 1a + 1b-1 + 1b-2)

Attrappe: Architekt-Läufe bekommen eine echte Laufakte mit `ergebnis-architektur`-JSON aus einer eigenen Warteschlange;
die Attrappe merkt sich `auftragstext` und `anfragen[].pfad` je Lauf. Fixture: Architekt (codex, ergebnis-architektur,
ZWINGEND) → Advisor (Schema, ZWINGEND) → Ausführung (ZWINGEND, Eingaben ergebnis-@/entscheidung-@ Architekt).
- (c) UEBERARBEITEN ⇒ WARTET_FREIGABE am Architekten, Schritt trägt `rueckweg`, GET `planFreigabe.art === 'plan_v2'`;
  Freigabe ⇒ Auftragstext enthält Plan v1 und Befund-IDs; v2 ERFOLGREICH ⇒ WARTET_FREIGABE an der Ausführung (kein
  Advisor-Lauf), `planFreigabe.fassung === 2` mit Befunden; Freigabe ⇒ Ausführung bekommt `artefakt:ergebnis-<v2-lauf>`,
  nicht `ergebnis-<v1-lauf>` und kein Advisor-Ergebnis.
- (c2) nach v2 läuft kein zweiter Advisor (Zahl der Advisor-Läufe 1, Advisor-`lauf_id` unverändert); pure Gegenprobe
  `ermittlePlanRueckweg` mit Architekt, der schon `rueckweg` trägt ⇒ kein Auslösen.
- (c3) FREIGEGEBEN_MIT_AUFLAGEN ⇒ derselbe Rückweg; `max_replans 0` ⇒ kein Rückweg, WARTET_FREIGABE an der Ausführung,
  `planFreigabe.keinPlanV2` nennt die Grenze.
- (c7) v2 mit neuer Frage ⇒ KLAERUNG (Regel 1c, nur die neue Frage offen); POST …/entscheidung ⇒ WARTET_FREIGABE an der
  Ausführung (kein Advisor); `entscheidung-@` der Ausführung enthält v1- und v2-Antwort.
- (d) FREIGEGEBEN ⇒ kein zweiter Architekt-Lauf, Ausführung bekommt Plan v1, `planFreigabe.fassung === 1`.
- (c8) Advisor-Halt (Schemaverstoß) ⇒ GET-Detail `prueferWiederholbar: true`; FREIGEGEBEN-Weg ⇒ false.
- (c9) POST `/api/workflows` mit selbst gesetztem `rueckweg` ⇒ nicht übernommen; neue Fassung eines Ablaufs mit
  `rueckweg` behält ihn.
- (c10) v1-Laufakte fehlt beim Start des v2-Architekten ⇒ Start abgelehnt mit Grund.
Bestehende Fälle (c1)(c1b)(c4…) bleiben (Fixture ohne Architekt ⇒ kein Rückweg).

### 4. Zustände

Default: v1 → Advisor FREIGEGEBEN → Freigabe (Plan v1 + „keine Befunde“) → Ausführung. Rückweg: Advisor MIT_AUFLAGEN/
UEBERARBEITEN → Freigabe Architekt (Plan v1 + Befunde) → v2 → Freigabe Ausführung (Plan v2 + Befunde). Leer: keine Befunde
⇒ Satz; kein Advisor ⇒ keine Karte. Fehler: Advisor-JSON ungültig ⇒ Halt + Knopf „Advisor wiederholen“; v1/Advisor-Laufakte
fehlt ⇒ Start abgelehnt; Plan unlesbar ⇒ Karte mit Fehlertext; Grenze ⇒ „Kein Plan v2: …“. Ladend: bestehender
Seitenzustand (keine eigene Anfrage).

### 5. Akzeptanzkriterien

AK1 MIT_AUFLAGEN/UEBERARBEITEN ⇒ genau ein Architekt-Lauf v2 mit Plan v1, Befunden und Entscheidungen; FREIGEGEBEN ⇒
direkt weiter; Grenze aus `max_replans`, zählt als die eine Korrektur der Plan-Stufe · AK2 nach v2 kein zweiter Advisor ·
AK3 Ausführung bekommt nur den letzten Plan (+ zusammengeführte Entscheidungen); ZWINGEND bleibt · AK4 Freigabe-Seite zeigt
Plan (v1/v2) und Advisor-Befunde mit Urteil, auch vor dem Architekten v2; Render-Nachweis · AK5 Leitstand-Knopf „Advisor
wiederholen“ · AK6 Gate (c)(c2)(c3)(c7)(d)(c8)(c9)(c10) + angepasste Prüfungen grün, `npm run check` Exit 0 · AK7 Doku
(F-909, F-1106 erledigt, Restfindings, fixpaket B2b-1 abgeschlossen).

### 6. Risiken

- R1 Bestands-hoch (Ausführung trägt noch `ergebnis-@<advisor>`): im FREIGEGEBEN-Weg bekommt sie das Advisor-JSON
  zusätzlich (harmlos, keine Befunde); im Rückweg entfernt die neue Fassung die Eingabe (B13).
- R2 Codex-Architekt mit sehr langem Plan v1 im Auftragstext (Prompt über stdin, kein Argv-Problem); Größe wie bisher
  durch den Plan begrenzt.
- R3 UI: neue Karten auf der Freigabe-Seite — Render-Nachweis 390 px und Desktop, lange Fundstellen.
- R4 Schätzung 0,75 AT eng (Gate-Attrappe für Architekt-Laufakten, UI + i18n ×4).

### 7. Anzupassende Prüfungen (Vorabliste)

`check-f39-architekt.mjs` (f) (Ausführung ohne Advisor-Ergebnis); `src/workflow/workflow.test.ts` (Routing, `rueckweg`-Form,
Regel 1d-Text); `scripts/leitstand/f35-ws3-adjust-automatik.test.mjs` (neue reine Funktionen, Ausweg Plan, Gesamtzählung);
`check-f35-ws3-adjust-automatik.mjs` (Gesamtzählung); `src/architekt/architekt.test.ts` (Instruktion);
`public/leitstand/views/workflow-entscheiden.test.mjs`, `workflow-eingriffe.test.mjs`; i18n-Vollständigkeits-Gate;
`check-f15-workflow.mjs` (Vorlagenform; F-228-Zählung unverändert erwartet); Kommentare ohne gezählte Aufruf-Zeichenfolgen.

### 8. Doku

`state/findings.md`: F-909, F-1106 erledigt; F-1104 (4) Knopf erledigt; neue Findings für Offenes (z. B. Route
…/entscheidung verlangt nach v2 auch bereits beantwortete Fragen erneut, falls v2 sie wiederholt; Bestands-hoch R1).
`docs/projekt/fixpaket-f45.md`: B2b-1 abgeschlossen. ARCHITECTURE.md §1 ein Satz (Plan v2). Kein `.claude/`.

### Offene Punkte (nicht stillschweigend entschieden)

O1 Rückweg im selben Schreibvorgang statt `wendePlanRueckwegAn` (Abweichung von Plan v2 1b, §3.3).
O2 `rueckweg` bei neuer Fassung aus dem gespeicherten Stand übernommen statt verworfen (§3.1).
O3 Wiederholt v2 eine schon beantwortete Frage, verlangt die Route sie erneut (Antwort überschreibt in der
   Zusammenführung) — bewusst schmal, Instruktion verbietet die Wiederholung.
O4 Knopf heißt „Advisor wiederholen“ (eigener Text statt „Review wiederholen“).

## Advisor-Pass (14.10.2026, frischer Kontext, `architecture-advisor`)

Urteil: **Nicht freigegeben.** Rollengrenze: nur Read/Grep/Glob, keine Gates/Läufe.

Vor dem Bau zu klären:
- H1 HOCH [Fakt/Schlussfolgerung] Offener Stack: `validiereErgebnisArchitektur` verlangt bei offenem Stack eine
  `kategorie: stack`-Frage (src/architekt/index.ts:428-432), der Stack ist beim v2-Lauf noch offen (CLAUDE.md schreibt erst
  die Ausführung) — „beantwortete Fragen nicht wiederholen“ führt zu Regel-1c-Verstoß und Reparatur-Schleife; wiederholt v2
  die Frage, verlangt die Route sie erneut (O3). Gate-Fremdprojekt ohne CLAUDE.md ⇒ Stack offen.
- M1 MITTEL [Fakt/Schlussfolgerung] O2: setzt eine Reparatur Architekt und Advisor zurück, liest der v2-Start die
  Advisor-Laufakte über eine `lauf_id` null ⇒ dauerhaft abgelehnt; übernommener `rueckweg` wird nach dem Einsetzen nicht
  mehr validiert (POST /api/workflows validiert den Body vorher). Korrektur: `anlass_lauf_id` mitspeichern, Routing nur bei
  gleicher Advisor-`lauf_id`, Übernahme nur bei Rolle architekt + bekanntem Anlass, danach validieren; Sichtungs-Vergleich.
- M2 MITTEL [Schlussfolgerung] Fall „Urteil ≠ FREIGEGEBEN, kein Rückweg, keine Grenze“ (GESTOPPT im Nachlauf, Bestand
  aus 1b-1, kein Architekt davor) ohne Text.
- M3 MITTEL [Schlussfolgerung] Zuschnitt > 1 AT (9 Gate-Fälle, Attrappe, Projektion, UI ×4 Sprachen, Fixture-Server für den
  Render-Nachweis). Option: 2a Kern / 2b Anzeige.

Mitlaufend: N1 Rückweg-Entscheidung und Schrittliste im Updater auf `datenMitSchritt` rechnen · N2 GET
`architekturEntscheidung.fragen` an die Route koppeln · N3 Lineage-Vorgänger der Ausführung ist der Advisor-Lauf
(hinnehmbar, kommentieren) · N4 Bestandsliste: JSDoc `leiteWorkflowFelderAb`, Regel-1d-Kommentar/-Text, Gate-Kopf,
Automatik-Kommentar 166-167, hoch-`risiko`, check-f39 460-464, Beispiel unter `schemas/examples/` falls geprüft,
`docs/STATUS.md` · N5 [offene Unsicherheit] `gleicheEinrichtungAb` mit der Liste von v2.

Entlastend: Updater gibt `schritte` zurück ist eingeführtes Muster, Validierung im selben Schreibvorgang, F-227 unberührt,
GESTOPPT sichere Richtung, F-228-Zählung bleibt, Routing-Stelle richtig (Entscheidungs-Route, Freigabe, Wiederaufnahme,
Regel 3), Zusammenführung rückgabegleich, Body kann keinen Advisor-Sprung erzeugen, Gate machbar, Regel 1d bleibt rein.

## Entscheidungen Stefan (14.10.2026, nach dem Advisor-Pass)

- **H1 = Nur offene Fragen.** v2 wiederholt die Stack-Frage wortgleich, die Antwort zu v1 gilt weiter; Regel 1c hält nur
  bei neuen Fragen, die Route verlangt nur Antworten auf diese.
- **M3 = Teilen.** Diese Iteration baut **B2b-1b-2a „Kern“**; **B2b-1b-2b „Anzeige“** (Projektion `planFreigabe`,
  Karten auf der Freigabe-Seite, Knopf „Advisor wiederholen“, Render-Nachweis; F-1106) folgt als eigener Bau.

## Plan v2 — B2b-1b-2a „Kern“ (Delta zu Plan v1; alles Übrige aus §3.1–3.7 gilt)

- **Umfang:** §3.1–3.7 und das Gate ohne Projektion. §3.8–3.10 (Projektion, UI, Knopf) und Gate (c8) → 2b. Kein UI-Code ⇒
  kein design-guardian/Render-Nachweis in 2a. Schätzung ≈ 0,75 AT.
- **H1:** (1) `baueArchitektPlanV2Instruktion` bekommt `stackOffen`: „Fragen der Kategorie stack wiederholst du wortgleich
  (der Stack ist noch offen); andere bereits beantwortete Fragen stellst du nicht erneut.“ (2) „Offene Fragen“ = Fragen des
  aktuellen Laufs, deren `frage` in der Zusammenführung keine Antwort hat — eine reine Funktion
  `offeneArchitekturFragen(fragen, zusammenfuehrung)` (routen-f39.mjs), genutzt von Regel-1c-Aufrufer (Nachlauf, Anzahl im
  Grund), GET `architekturEntscheidung.fragen` (nur offene, N2) und Route POST …/entscheidung (`pruefeAntwortenGegenFragen`
  gegen die offenen; Route verlangt weiter `KLAERUNG` am Schritt, also ≥ 1 offene Frage). Für v1 gleichwertig zu heute.
  (3) Stack-Instruktion/Regel 1h unverändert: v2 trägt die Stack-Frage selbst, die Zusammenführung ist nicht null.
- **M1:** `rueckweg = { anlass_schritt_id, anlass_lauf_id, vorheriger_lauf_id }` (alle drei Pflicht im Feld). Instruktion
  liest die Advisor-Laufakte über `anlass_lauf_id`. Routing (§3.5) springt nur, wenn der Anlass-Schritt ERFOLGREICH ist und
  `lauf_id === anlass_lauf_id`; sonst normaler Weg (der Advisor prüft v2 neu; ein zweites UEBERARBEITEN läuft dann in die
  Grenze der Plan-Stufe ⇒ Freigabe mit „Kein Plan v2“). POST /api/workflows: gespeicherter `rueckweg` je schritt_id nur
  übernommen, wenn der Schritt im Body noch Rolle `architekt` trägt und `anlass_schritt_id` im Body existiert; danach
  `validiereWorkflowDaten` auf dem eingesetzten Datensatz (Verstoß ⇒ 400). `sichtungsVergleichsform` lässt `rueckweg` aus
  wie `freigabe_erteilt` (dem Server gehörendes Feld). Gate (c9).
- **M2 (in 2a als Halt-Grund):** folgt im Advisor-Nachlauf kein Rückweg bei Urteil ≠ FREIGEGEBEN, hängt der Grund der
  Freigabe der Ausführung „ — Advisor: <Urteil> mit n Befund(en). Kein Plan v2: <Grund>“ an (Grund aus
  `ermittlePlanRueckweg`: Grenze, „kein Architekt direkt vor dem Advisor“, „Plan v2 lief schon“). Mit Rückweg trägt der
  Freigabe-Grund des Architekten „ — Plan v2: Der Architekt überarbeitet den Plan mit n Befund(en) des Advisors (<Urteil>).“;
  nach v2 trägt der Freigabe-Grund der Ausführung „ — Plan v2 liegt vor; der Advisor prüft ihn nicht erneut. Plan und
  Advisor-Befunde stehen im Lauf-Detail.“ (bis 2b). Fälle GESTOPPT/Bestand 1b-1 deckt erst die Projektion in 2b.
- **N1:** `ermittlePlanRueckweg`/`baueSchritteFuerPlanRueckweg` im Updater auf `datenMitSchritt`; vorher nur
  `zaehleKernVersionen`. **N3** kommentiert. **N4** in die Bestandsliste §7. **N5** im Bau geprüft (Gate (c) mit
  unterschiedlicher Einrichtungsliste v1/v2 nur, wenn `gleicheEinrichtungAb` Einträge entfernt — sonst Finding).
- **Gate 2a:** (c) ohne `planFreigabe`, dafür Grund-Texte; (c2); (c3) inkl. `max_replans 0` ⇒ Grund „Kein Plan v2“;
  (c7) v2 wiederholt die Stack-Frage und stellt eine neue ⇒ KLAERUNG, GET `fragen` nur die neue, POST …/entscheidung mit nur
  der neuen Antwort ⇒ WARTET_FREIGABE an der Ausführung, `entscheidung-@` enthält Stack- und neue Antwort; (c11) v2
  wiederholt nur die Stack-Frage ⇒ kein Halt, weiter zur Freigabe der Ausführung; (d); (c9); (c10); (c12) M1: Advisor
  zurückgesetzt ⇒ nach v2 läuft der Advisor erneut (Routing springt nicht). Alle Architekt-Fixtures bei offenem Stack mit
  Stack-Frage (v1 per POST …/entscheidung beantwortet).

## Delta-Advisor-Pass (14.10.2026) und Nachträge zu Plan v2

Urteil: **Freigegeben mit Hinweisen.** Übernommen:
- D1 Route POST …/entscheidung: keine offene Frage ⇒ 409 (statt nur „keine Fragen“); KLAERUNG kann auch aus der
  Einrichtungs-Übernahme kommen. Gate-Fall.
- D2 Ort der M2-Sätze: reine Funktion `planStufenSatz({ naechster, daten, vorschrittId, planEntscheid })` in der
  Automatik-Datei, nur bei `haltFreigabe`; angehängt im Nachlauf (Advisor und Architekt v2) und in der Entscheidungs-Route.
  „Plan v2 liegt vor …“ gilt, wenn der Vorschritt `rueckweg` trägt und der Sprung (Regel 3a) gegriffen hat. Sichtbar über
  den gespeicherten `grund` (die Projektion `naechster` rechnet ihn ohne Anhang — bis 2b hingenommen).
- D3 `offeneArchitekturFragen`: eine Frage gilt nur als beantwortet, wenn die letzte Antwort eine Option der aktuellen Frage
  nennt; Instruktion „Frage und Optionen wortgleich“.
- D4 `ermittlePlanRueckweg` prüft „Plan v2 lief schon“ über `pruefeRueckweg` (Plan-Zählung 1 ⇒ `art: 'grenze'`), keine
  eigene Vorab-Ablehnung; (c12) prüft den Grund.
- D5 AK/Doku 2a: AK4/AK5 (UI, Knopf) → 2b; AK6 = Gate (c)(c2)(c3)(c7)(c9)(c10)(c11)(c12)(d) + D1-Fall; Doku: F-909 erledigt
  (Kern), F-1106 und F-1104 (4) bleiben offen mit Verweis auf 2b; fixpaket: 2a gebaut, 2b offen (B2b-1 also noch nicht
  abgeschlossen). Bis 2b gibt Stefan Plan v2 frei, ohne Plan und Befunde auf der Freigabe-Seite zu sehen (Halt-Grund
  verweist auf das Lauf-Detail). §7 ohne UI-Tests/i18n.
- D6 (c10): der Ablehnungsgrund nennt den Ausweg (neuen Ablauf anlegen), `rueckweg` bleibt serverseitig (Muster
  `basis_commit`).
- D7 Übernahme als reine Funktion `uebernimmRueckwege(bodySchritte, gespeicherteSchritte)` mit Unit-Tests (Rolle geändert,
  Anlass fehlt); Nachvalidierung im Gate; `sichtungsVergleichsform` lässt `rueckweg` aus.
- D8 Gründe der Plan-Stufe ohne „Keine automatische Anpassung:“-Präfix und ohne interne Kennungen; Bau-Texte bitgleich.
- D9 Regel 1d: in 2a nur der Kommentar; der Text-Satz bleibt bis 2b. Kommentar Server 7514 nachziehen.
- D10 Zuschnitt ≈ 0,75 AT knapp, R4 bleibt.

## Bau und Prüfpass B2b-1b-2a (14.10.2026)

Gebaut nach Plan v2 + Nachträgen D1–D10. Unit-Tests zuerst rot (fehlende Exporte bzw. falscher Ausgang), dann grün; Gate
`check-f45-b2b1-rueckweg` um (c)(c2)(c3)(c7)+D1(c9)(c10)(c11)(c12)(d) erweitert, Gegenprobe per Mutation (Regel 3a aus,
Rückweg aus) → je mehrere Fälle rot. Prüfpass (frischer Kontext): code-reviewer BEREIT mit Hinweisen (7), qa
BEREIT_NACH_KORREKTUR (9). Eine Korrekturrunde: Nachvalidierung in POST /api/workflows vor jedem Seiteneffekt;
`pruefeRueckweg` fail-closed bei nicht zählbaren Rückwegen; Stack-Verweis der Instruktion nur bei offenem Stack; eine
Sprung-Regel `planV2Sprungziel` (src/workflow) für Regel 3a und `planStufenSatz` (der Unit-Test fing dabei einen
`??`-Fehler beim Advisor ohne nachfolger); Gründe des v2-Starts und der Route ohne Kennungen/Feldnamen; Kommentare
(Querverweisregeln, optionale Schrittfelder, Lineage N3); Gate (c13) Einrichtung folgt Plan v2, (c14) Reparatur nach
gescheitertem Plan v2, (c10b) Advisor unlesbar. Als Finding: F-1110 (veraltete Antworten, „Plan v1 behalten“, Bau-Summe
nur im Unit-Test, Hülle der Freigabe-Route), F-1108, F-1109; F-1106 bleibt offen (2b). `docs/STATUS.md` nachgezogen.
Nachpass (frischer Kontext): code-reviewer BEREIT (1 Hinweis), qa BEREIT (Hinweise) — als Text-Nachzug übernommen:
`uebernimmRueckwege` übernimmt nur einen formgültigen gespeicherten Wert (beschädigter Bestand bleibt ersetzbar, Unit-Test),
Gate (c10)/(c7-D1) prüfen den genauen Satz, Gate-Listen in F-909/fixpaket, F-1104 (4) → 2b, F-1110 (4).

## Plan 2b — B2b-1b-2b „Anzeige“ (15.10.2026; Delta zu Plan v1 §3.8–3.10, Gate (c8), Zustände §4)

Branch `f45/b2b1b2b-anzeige` (von origin/main `9c8103f`, #340). Schließt B2b-1. Schätzung ≈ 1 AT (R4).

- **P1 Projektion `planFreigabe`** (GET `/api/workflows/<id>`, additiv, sonst `null`, nur bei `naechster.art ===
  'haltFreigabe'`): `{ art: 'ausfuehrung' | 'plan_v2', fassung, plan, advisor, keinPlanV2, rueckweg }` wie §3.8.
  `ausfuehrung`: fälliger Schritt Rolle `ausfuehrung` und ein Architekt ERFOLGREICH mit `lauf_id` ⇒ Plan = dessen
  `lauf_id` (`fassung` 2, wenn er `rueckweg` trägt). Advisor = Schritt `architekt.nachfolger` mit Rolle
  architecture-advisor: dessen `lauf_id`, falls ERFOLGREICH, sonst `rueckweg.anlass_lauf_id`; kein Advisor ⇒ `null`.
  `plan_v2`: fälliger Schritt Rolle `architekt` mit `rueckweg` ⇒ Plan aus `vorheriger_lauf_id`, Advisor aus
  `anlass_lauf_id` (2a, M1), `fassung` 1, `keinPlanV2` null. `plan = { zusammenfassung, module[{name, zweck}],
  entscheidungen[{frage, gewaehlt}] } | { fehler: 'nicht_lesbar' }`, `advisor = { urteil, begruendung, befunde[...] } |
  { fehler: 'nicht_lesbar' }` — Einzelheiten (Lauf-Kennungen) nur ins Log, die Seite zeigt einen übersetzten Satz.
  Entscheidungen = Zusammenführung (`findeWorkflowEntscheidungFuerSchritt`) je Anfrage. Zwischenspeicher je
  `(architektLaufId, advisorLaufId)` (fertige Laufakten ändern sich nicht), höchstens 32 Einträge, ältester fällt.
- **P2 `keinPlanV2` zur Lesezeit (F-1108)**: reine Funktion `ermittleKeinPlanV2({ schritte, maxReplans, advisorSchrittId,
  advisorLaufId, urteil, befundAnzahl, kernVersionen })` (Automatik-Datei) → Grund oder `null`. `null` bei FREIGEGEBEN und
  wenn der Architekt vor dem Advisor `rueckweg.anlass_lauf_id === advisorLaufId` trägt (Plan v2 lief für genau diesen
  Lauf). Sonst `ermittlePlanRueckweg`: gesperrt ⇒ dessen Grund (Grenze, kein Architekt davor, Plan-Stufe verbraucht —
  auch (c12)); „würde auslösen“ ⇒ fester Satz „Plan v2 wurde für dieses Advisor-Ergebnis nicht ausgelöst (der Ablauf war
  angehalten oder stammt aus der Zeit vor Plan v2).“ + Ausweg der Plan-Stufe. Deckt Nachlauf auf GESTOPPT + Reparatur und
  Bestand 1b-1. Der gespeicherte Halt-Grund bleibt wie in 2a (`planStufenSatz` unverändert).
- **P3 Freigabe-Seite** (`renderFreigabeSeite`, Karten vor „Was startet“): „Plan, den du freigibst“ mit Kennzeichen
  „Plan v1/v2“ bzw. „Plan v1 — wird überarbeitet“ + Satz „Wer Plan v1 unverändert will, lehnt ab und legt einen neuen
  Ablauf an.“; Zusammenfassung, Module (Name · Zweck), Entscheidungen (Frage → Antwort); Fehlerfall Satz. „Befunde des
  Advisors“: Urteil-Badge (`ablauf-status` ok/warten/fehler), Begründung, je Befund Schwere-Badge (Muster
  `FARBE_SCHWERE`), Fundstelle in `<code>`, Zusammenfassung, Korrekturrichtung; Hinweis in dieser Reihenfolge:
  `keinPlanV2` ⇒ „Kein Plan v2: <Grund>“, `plan_v2` ⇒ „Diese Befunde gehen an den Architekten.“, Fassung 2 ⇒ „In Plan v2
  eingearbeitet — bitte prüfen.“; leer „Keine Befunde.“; kein Advisor ⇒ keine Karte. Neue Klassen nur für Abstand/Umbruch
  (`overflow-wrap: anywhere`), keine neuen Farben. i18n de/en/ru/tr. `workflows.js` reicht `detail.planFreigabe` in
  `aktuellesDetail`; das Kennzeichen der Seite nimmt die Projektion auf (neu zeichnen bei Änderung).
- **P4 „Advisor wiederholen“** (§3.10): GET additiv `prueferWiederholbar` (boolean; nur bei KLAERUNG mit Cursor auf
  architecture-advisor gerechnet, `pruefschrittWiederholbar` + `ermittlePrueferBefund`, dieselbe Vorbedingung wie die
  Route). `renderEingriffe(…, prueferWiederholbar)`: rote Notiz „Der Advisor hat kein verwertbares Ergebnis geliefert.“ mit
  `.wf-aktion` `data-aktion="pruefer-wiederholen"`; `fuehreWorkflowAktionAus` → `wiederholePruefer` (api.js); Antwort
  WARTET_FREIGABE ⇒ „Der Advisor ist zurückgesetzt und startet nach deiner Freigabe.“, LAEUFT ⇒ Start wie beim Review,
  Fehler ⇒ Servertext. Bedienungs-Kennzeichen nimmt `prueferWiederholbar` auf. Regel-1d-Text ohne „(im Leitstand noch ohne
  eigenen Knopf für den Advisor)“ (D9).
- **P5 Hülle der Freigabe-Route (F-1110 (4))**: `lesePlanV2Eingaben` meldet `ausweg: 'neuer_ablauf'`, `starteWorkflowSchritt`
  reicht es durch (keine neue Aufrufstelle). Reine Funktion `startfehlerSatz({ grund, ausweg })`: „Der Start nach deiner
  Freigabe ist gescheitert: <grund> Die Freigabe ist festgehalten; der Ablauf wartet auf Klärung.“ + je Art: `neuer_ablauf`
  nichts weiter (der Grund nennt „lege den Ablauf neu an“), sonst „Weiter geht es über eine korrigierte Fassung (Ablauf
  reparieren).“ Ohne Schritt-/Workflow-Kennung und „(art)“ im Satz; beides ins Log. Antwortfelder (`art`, `status`, …)
  unverändert.
- **P6 Gate** `check-f45-b2b1-rueckweg.mjs`: (c8) Advisor-Halt (Schemaverstoß) ⇒ `prueferWiederholbar` true, nach
  FREIGEGEBEN-Weg false; (pf1) `plan_v2` vor dem Architekten (Plan v1, Befunde, `rueckweg.anlass_lauf_id`); (pf2) nach v2
  `fassung` 2 mit Plan v2 und Befunden, `keinPlanV2` null; (pf3) FREIGEGEBEN ⇒ `fassung` 1, keine Befunde; (pf4)
  `max_replans` 0 ⇒ `keinPlanV2` mit Grenze; (pf5) Bestand ohne Satz (direkt registriert: Freigabe der Ausführung,
  UEBERARBEITEN, kein `rueckweg`) ⇒ `keinPlanV2` „nicht ausgelöst“; (c10h) Hülle: Grund ohne „korrigierte Fassung“,
  „(konflikt)“, Schritt- und Workflow-Kennung, mit „neu an“; (c15) Bau-Summe: Architekt → Advisor → Ausführung → Review,
  `max_replans` 1, Plan v2 ⇒ Review BLOCKIERT hält ohne kern-Artefakt, Grund „(höchstens 1) sind verbraucht“. Unit-Tests
  `ermittleKeinPlanV2`, `startfehlerSatz`, Views (Karten, Notiz) rot → grün.
- **P7** `zaehlung-*.json` (b1b1) mit `schwaerze()` (Datei als Ganzes, kein CLI-Modus), danach `JSON.parse` je Datei.
- **Render-Nachweis** `features/F45/nachweise/b2b1b2b/`: Instanz nach Muster b2b1 (Attrappe, kein Netz, Projekt mit
  CLAUDE.md ⇒ Stack gefüllt, keine Frage), vier Abläufe nacheinander über den HTTP-Pfad: (a) UEBERARBEITEN ⇒ Freigabe
  Architekt v2; (b) dasselbe + Freigabe ⇒ Freigabe Ausführung nach v2; (c) `max_replans` 0 ⇒ „Kein Plan v2“; (d)
  Advisor-JSON ungültig ⇒ Halt + Knopf, Klick. Je Folge de 1440 dunkel/hell, de 390, ru 390 hell, de 1440 200 %;
  `ueberlauf` bei 390 px; `render-nachweis.mjs` bekommt additiv die Spalte „scrollWidth/clientWidth“ (F-1107 (5)).
- **Nicht** (bleibt F-1110): (1) veraltete Antworten filtern, (2) „Plan v1 freigeben“. Kein `.claude/`, `projekte.json`,
  `ressourcen.json`, Vorlagen, `.githooks`; `starteWorkflowSchritt(` bleibt 6×; F-228-Zählung unverändert.
- **Zustände**: Default Fassung 1 ohne Befunde; Rückweg (a)/(b); Leer „Keine Befunde.“/keine Karte; Fehler Plan/Advisor
  unlesbar ⇒ Satz, Advisor-JSON ungültig ⇒ Notiz + Knopf; Ladend: bestehender Seitenzustand.
- **Risiken**: R1 Poll alle 2 s liest Laufakten ⇒ Zwischenspeicher; `zaehleKernVersionen` nur bei Urteil ≠ FREIGEGEBEN
  ohne Rückweg. R2 Seite wird länger (Karten vor „Was startet“) — Render 390 px/200 %. R3 Zuschnitt knapp: bei „zu groß“
  P5, P6 (c15) und P7 als Finding.
- **Anzupassende Prüfungen**: `src/workflow/workflow.test.ts` (Regel-1d-Text), `f35-ws3-adjust-automatik.test.mjs`,
  `workflow-entscheiden.test.mjs`, `workflow-eingriffe.test.mjs`, i18n-Vollständigkeit, ggf. `check-f15-workflow-oberflaeche`
  (Kennzeichen), Gate-Kopf.

### Advisor-Pass Plan 2b (15.10.2026, frischer Kontext, `architecture-advisor`) und Nachtrag

Urteil: **Freigegeben mit Hinweisen.** A1 Zuschnitt zu groß ⇒ nach Stefans Vorgabe (Auftrag 2b) **P5 (Hülle, F-1110 (4)),
P6 (c15) (Bau-Summe, F-1110 (3)) und P7 (Schwärzung) als Finding F-1111 heraus**, nicht geteilt; dort mit A2 (Startfehlerliste
und Halt-Ablage nutzen denselben `anlass` wie das Log — die Kennungen brauchen einen eigenen Text für Liste/Log) und A6
(`zaehlung-*.json` entstehen bei jeder Startfreigabe-Erneuerung neu ⇒ Schwärzung als Schritt in
`docs/harness/startfreigabe-erneuern.md`; `b1b2/zaehlung-hooks.json` prüfen). Übernommen:
- A3 Hinweis „In Plan v2 eingearbeitet — bitte prüfen.“ nur, wenn der Advisor-Lauf der Karte der Anlass ist
  (`advisorLaufId === rueckweg.anlass_lauf_id`, dieselbe Bedingung wie P2/`planV2Sprungziel`); Projektion `advisorIstAnlass`.
  Kein Rückfall auf `anlass_lauf_id` an der Freigabe der Ausführung (Advisor = dessen lauf_id, wenn ERFOLGREICH, sonst `null`).
- A4 Plan-Quelle an der Freigabe der Ausführung = Architekt aus `findeArchitektEingabeTreffer` (genau der Plan, den die
  Ausführung bekommt, AK3); ohne Treffer keine Projektion.
- A5 kein Seiten-Kennzeichen (`setzeHtml` zeichnet bei geändertem HTML neu); `prueferWiederholbar` ins Bedienungs-Kennzeichen
  vor den Empfehlungsteil.
- A7 Zwischenspeicher nur für fehlerfreie Teile; Schlüssel mit `basisVerzeichnis`.
- A8 (c8) Gegenprobe: KLAERUNG am Architekten (c7) ⇒ `prueferWiederholbar` false.
- A9 `FARBE_SCHWERE` aus `workflow-abnahme.js` exportieren. Zustand: Freigabe der Ausführung nach einem Bau-Rückweg zeigt
  `planFreigabe` erneut; `keinPlanV2` kann dann (Bau-Runden mitgezählt) einen anderen Grund nennen als beim Advisor — hingenommen.
Gate 2b damit: (c8), (pf1)–(pf5). Schätzung ≈ 0,75–1 AT.

## Bau und Prüfpass B2b-1b-2b (15.10.2026)

Gebaut nach Plan 2b + Nachtrag (ohne P5, P6 (c15), P7 → F-1111). Unit-Tests zuerst rot (fehlender Export
`ermittleKeinPlanV2`, Regel-1d-Text, Karten, Notiz), dann grün; Gate `check-f45-b2b1-rueckweg` um (c8)(pf1)–(pf6)
erweitert, Gegenprobe per Mutation (prueferWiederholbar aus, advisorIstAnlass immer, „nicht ausgelöst“ ⇒ null) → (c8)
(pf2/c12)(pf4)(pf5) rot. Render-Nachweis `features/F45/nachweise/b2b1b2b/` (21 Folgen, 390 px überall 390/390).
Prüfpass (frischer Kontext): code-reviewer BEREIT (3 Hinweise), qa BEREIT_NACH_KORREKTUR (7), design-guardian
freigegeben mit Hinweisen (6). Eine Korrekturrunde: Notiz verweist auf „Technischer Ablauf & Serverentscheidung“ (dg 1);
Hinweis der Befund-Karte abgesetzt (dg 3); Fassung 2/„eingearbeitet“ nur, wenn der Architekt seit dem Rückweg neu lief
(qa 2, Gate (pf6)); (c8) Gegenprobe im FREIGEGEBEN-Weg (qa 4); Start mit Vorbereitung des Arbeitsordners nach „Advisor
wiederholen“ ohne Nachsendung, Meldung nennt „Starten“ (cr 1); Dateikopf, ungenutzte Variable (cr 3 teilweise, `wertText`-Kopie → F-1111 (7)). Als Finding:
F-1111 (4)–(7) (qa 3/5/6, cr 2/3), F-1112 (dg 5, vorbestehend). Befund-IDs bleiben sichtbar (dg 2, Abgleich mit Plan v2).
Offen für Stefan: qa 1 — der vorgegebene Satz „Wer Plan v1 unverändert will, lehnt ab und legt einen neuen Ablauf an.“
verspricht mehr, als der neue Ablauf hält (der Architekt plant neu, der Advisor kann wieder Plan v2 auslösen); Text
unverändert gelassen, weil wörtlich beauftragt.
Entscheidung Challenger (15.10.2026) zu qa 1: der Satz wird ersetzt durch „Plan v1 lässt sich hier nicht unverändert freigeben, weil der Advisor Änderungen verlangt. Mit „Ablehnen“ stoppst du den Ablauf.“ (en/ru/tr sinngemäß, Knopfname aus
`entscheiden.freigabe.option.ablehnen` der Sprache); Render-Folgen `a-*` neu erzeugt.
