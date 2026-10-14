# F45 B2b-1 — Plan (Rückweg und Plan v2)

Branch `f45/b2b1-rueckweg-plan-v2` (Stefan), Basis `origin/main` `391ae2c`. Grundlage: Auftrag F45 B2b-1 (14.10.2026), Findings F-203, F-909, F-981, F-1085 (1). Bau erst nach freigegebenem Plan.

## Plan v1

Stand: 14.10.2026, Branch `f45/b2b1-rueckweg-plan-v2` (von origin/main 391ae2c). Schätzung 0,5 AT.

### 1. Ziel der Iteration

Die Kette arbeitet wie der manuelle Ablauf: Plan → Advisor → (Plan v2) → Bau → Review, höchstens ein
automatischer Rückweg je Stufe; Grenze aus `grenzen.max_replans`; Halt bei wiederholten Befunden; Advisor
mit festem Ausgabeschema; „Review wiederholen“ nach Werkzeugausfall.

### 2. Referenzen

Auftrag Stefan (Chat 14.10.2026), `.claude/skills/advisor-pass/SKILL.md`, `.claude/agents/architecture-advisor.md`,
`schemas/ergebnis-code-reviewer.schema.json`, F-203, F-204, F-909, F-981, F-1085 (1), ARCHITECTURE.md §2/§4/§7.

### 3. Module und Datenbedarf

#### 3.1 Grenze und Zählung (Umfang 1)

- `scripts/leitstand/f35-ws3-adjust-automatik.mjs`: Konstante `GRENZE_AUTOMATISCHE_ANPASSUNGEN = 3` entfällt.
  Neu `GRENZE_JE_STUFE = 1` und eine reine Funktion
  `pruefeRueckweg({ stufe, rueckwegeStufe, rueckwegeGesamt, maxReplans })` → `{ erlaubt } | { erlaubt: false, grund }`.
  Erlaubt nur, wenn `rueckwegeStufe < 1` UND `rueckwegeGesamt < maxReplans`. `maxReplans` kommt aus
  `workflowDaten.grenzen.max_replans` (löst F-203: erster Leser).
- Zählung **Bau-Stufe**: unverändert `zaehleKernVersionen` (Abnahme-Versionen mit erzeuger `kern`); menschliche
  „Anpassung wünschen“ zählt nicht.
- Zählung **Plan-Stufe**: 1, wenn der Architekt-Schritt das neue Feld `rueckweg` trägt (3.4), sonst 0.
- `rueckwegeGesamt = Plan + Bau`. Vorlagen tragen bereits hoch 2 / standard 1 / fast-lane 1 — Werte bleiben,
  nur der `risiko`-Text bzw. Schema-Beschreibung nennt jetzt die Bedeutung (Summe über die Stufen).
- `ermittleAutomatischeAnpassung` bekommt statt `anzahlBisherigerKernVersionen` die Rückweg-Zahlen und
  `maxReplans`; ihr bisheriger Grenzfall liefert den lesbaren Grund aus `pruefeRueckweg`.
- Lesbarer Halt: Der Halt-Grund aus Regel 1b/1i (bzw. Advisor-Regel, 3.3) wird um den Satz der Automatik ergänzt
  („Kein automatischer Rückweg: Die Bau-Stufe hatte ihren einen Rückweg schon.“ / „… max_replans (1) ist
  ausgeschöpft.“). Umsetzung: Die Rückweg-Entscheidung wird **vor** `schreibeWorkflowFortschritt` berechnet
  (alle Eingaben stehen dann fest) und im Updater an `naechster.grund` angehängt, wenn `naechster.art ===
  'haltKlaerung'` und kein Rückweg folgt. Kein zweiter Schreibvorgang, kein neuer Ausgang.
  `baueAutomatischeAnpassungsBegruendung` nennt „Rückweg 1 von 1 (Bau-Stufe)“ statt „Iteration n von max. 3“.

#### 3.2 Halt bei Wiederholung (Umfang 2)

- Reine Funktion `sindDieselbenBefunde(vorher, jetzt)`: Schlüssel je Befund `schwere|fundstelle` (getrimmt),
  gleich = nicht-leere, gleiche Schlüsselmenge (Reihenfolge egal, Duplikate egal).
- „Vorher“ = Befunde des Reviews aus `bezug.review_lauf_id` der **letzten** Abnahme-Version, wenn deren
  `ergebnis === 'ANPASSUNG_ANGEFORDERT'` und `review_lauf_id !== laufId` (gleicher Lesepfad wie F-648,
  `leseUrteilAusLaufakte`). Gilt nach menschlicher und automatischer Anpassung.
- Reihenfolge in der Entscheidung: Wiederholung vor Grenze — der Grund nennt dann „Der Review meldet nach der
  Korrektur dieselben Befunde (…): kein weiterer Rückweg.“

#### 3.3 Advisor mit Ausgabeschema (Umfang 3)

- Neu `schemas/ergebnis-architecture-advisor.schema.json` (Draft 2020-12, `additionalProperties:false` je Ebene,
  Muster code-reviewer):
  `urteil` ∈ {FREIGEGEBEN, FREIGEGEBEN_MIT_AUFLAGEN, UEBERARBEITEN}; `begruendung` (Sortierung nach Schwere,
  was vor dem Bau zu klären ist — Skill Schritt 8); `befunde[]` je `{ id, schwere (KRITISCH|HOCH|MITTEL|NIEDRIG),
  evidenz (FAKT|SCHLUSSFOLGERUNG|ANNAHME|OFFENE_UNSICHERHEIT — Skill Schritt 6), fundstelle (Datei/Zeile),
  zusammenfassung, korrekturrichtung }`; `entlastend[]` je `{ fundstelle, zusammenfassung }` (Skill Schritt 7);
  `grenzen_der_pruefung` (Rollengrenze/blinde Flecken, Skill Schritt 5). Beispiel unter `schemas/examples/`.
- Konsistenzregeln (im handgeschriebenen Validator, D5 wie `validiereErgebnisArchitektur`): FREIGEGEBEN ⇒
  `befunde` leer (sonst gingen Befunde verloren, weil die Ausführung das Urteil nicht mehr sieht);
  MIT_AUFLAGEN/UEBERARBEITEN ⇒ mindestens ein Befund; `id` eindeutig.
- **Durchsetzung:** Der Advisor-Schritt bleibt `worker: claude-code`, `output_schema: null` (Rollenvertrag,
  Regel 4b unverändert). Der Kern verlangt im Auftragstext JSON nach diesem Schema und prüft das Ergebnis beim
  Lesen (`validiereErgebnisAdvisor` in `src/architecture-advisor/`, JSON aus dem Ergebnistext über den
  bestehenden Leser mit Codezaun-Fallback). Verstoß ⇒ Halt (Regel 1d, neuer Grund mit den Verstößen).
- Regel 1d (pure, `src/workflow/index.ts`): neues Feld `advisorErgebnis` auf `SchrittErgebnis`
  (`{ urteil, verstoesse }`). Verstöße ⇒ haltKlaerung; urteil ≠ FREIGEGEBEN ⇒ haltKlaerung („Plan v2 nötig“);
  nur FREIGEGEBEN setzt fort (Allowlist). `advisorUrteilFehlt` und `leseUrteilAusAdvisorText` entfallen bzw.
  werden ersetzt (Aufrufer prüfen: Test, `check-fixpaket-f35-reallauf.mjs`).
- `baueArchitectureAdvisorAuftragstext`: Rolleninstruktion um die Skill-Regeln ergänzt (Evidenz-Marker, entlastende
  Befunde, Beleg Datei/Zeile, Urteil mit Begründung, Rollengrenze benennen) und JSON-Vertrag statt Prosa.

#### 3.4 Plan v2 in `hoch` (Umfang 4)

- Neues optionales Schrittfeld `rueckweg: { anlass_schritt_id, vorheriger_lauf_id }` (Workflow-Schema +
  `pruefeSchrittForm` + `types.ts`; additiv, Bestandsdaten bleiben gültig — Muster `freigabe_erteilt`).
- Nach einem Advisor-Lauf mit MIT_AUFLAGEN/UEBERARBEITEN und `pruefeRueckweg` erlaubt: neue Workflow-Version
  über `schreibeWorkflowFortschritt` (Funktion `wendePlanRueckwegAn` im Server, neben `wendeAutomatischeAnpassungAn`,
  dieselbe F-228-Begründung für den Ort): Architekt-Schritt `OFFEN`, `lauf_id null`, `freigabe_erteilt` entfernt,
  `rueckweg = { anlass_schritt_id: <advisor>, vorheriger_lauf_id: <plan v1> }`; Advisor-Schritt bleibt
  `ERFOLGREICH` mit seiner `lauf_id`. Status aus `ermittleNaechstenSchritt` ⇒ `WARTET_FREIGABE` (Architekt ist in
  hoch ZWINGEND). Kein Entscheidungsartefakt (kein neuer `art`-Wert nötig).
- Architekt-Start mit `rueckweg`: Auftragstext bekommt `baueArchitektPlanV2Instruktion(planV1Text, advisorErgebnis)`
  (rein, `src/architekt/`): Plan v1 (Ergebnistext der Laufakte `vorheriger_lauf_id`) und je Befund id, Schwere,
  Fundstelle, Zusammenfassung, Korrekturrichtung; „Schreibe Plan v2 vollständig, nicht als Diff.“
- Routing nach Plan v2 (pure, neue Regel in `ermittleNaechstenSchritt`, vor der `nachfolger`-Auflösung): trägt der
  Vorschritt `rueckweg` mit `anlass_schritt_id === vorschritt.nachfolger` und ist dieser Schritt `ERFOLGREICH`
  mit `lauf_id`, ist der nächste Schritt dessen `nachfolger` (Advisor läuft nicht erneut — manueller Ablauf:
  kein zweiter Advisor auf Plan v2; Stefans ZWINGEND-Freigabe vor der Ausführung prüft v2).
- `workflow-vorlagen/hoch.json`: Ausführung ohne `artefakt:ergebnis-@schritt-2-architektur`; sie bekommt nur
  `ergebnis-@schritt-1-architekt` (= aktuelle `lauf_id`, also Plan v2 nach Rückweg) und
  `entscheidung-@schritt-1-architekt`. Advisor-`risiko`-Text aktualisiert.

#### 3.5 „Review wiederholen“ (Umfang 5)

- Reine Vorbedingung `reviewWiederholbar(workflowDaten, reviewErgebnis)`: Workflow `KLAERUNG_ERFORDERLICH`,
  `aktiver_schritt_id` = Review-Schritt (output_schema `ergebnis-code-reviewer`), dessen `lauf_id` gesetzt und
  `status ∈ {FEHLGESCHLAGEN}` (Werkzeugausfall/Zeitgrenze) **oder** `ERFOLGREICH` mit Verstoß gegen den
  Review-Vertrag (Regel 1k; F-1085 (1) nennt beide).
- POST `/api/workflows/<id>/review-wiederholen` (CSRF/Host wie die übrigen POSTs, Laufsperre D13): schreibt eine
  neue Workflow-Version (append-only, §7) mit Review-Schritt `OFFEN`/`lauf_id null`, Cursor auf ihm, Status aus
  `ermittleNaechstenSchritt` (⇒ `LAEUFT`, „startbar“). Kein Abnahme-Artefakt, keine Zählung. **Startet nichts** —
  die Aufrufstellen von `starteWorkflowSchritt` bleiben 6. Der Leitstand ruft danach den bestehenden
  POST `…/starten` (gleicher Weg wie jeder Erststart).
- GET `…/abnahme`: additiv `reviewWiederholbar: boolean` (dieselbe Funktion wie der POST).
- UI (`views/workflow-abnahme.js`, `views/workflows.js`, `api.js`, i18n de/en/ru/tr): Knopf „Review wiederholen“
  in der roten Review-Notiz, wenn `reviewWiederholbar`; der Satz `abnahme.review.weiter` bekommt eine Variante
  mit dem neuen Weg. Klick: POST review-wiederholen, dann POST starten, dann Detail neu laden; Fehler sichtbar
  (bestehende `sendeAbnahmeBedienung`).

#### 3.6 Gate (Umfang 6)

`scripts/check-f45-b2b1-rueckweg.mjs` in `npm run check` (echter Testserver, gestubbter Worker, reale Laufakten —
Muster `check-f35-ws3-adjust-automatik.mjs`):
(a) zweiter automatischer Rückweg derselben Stufe ⇒ Halt (Bau: Review BLOCKIERT → Rückweg → Freigabe → Review
BLOCKIERT mit anderen Befunden ⇒ KLAERUNG, kein zweites kern-Artefakt, Grund nennt die Grenze; Plan: pure
Funktion mit Plan-Zählung 1);
(b) dieselben Befunde zweimal ⇒ Halt mit Wiederholungsgrund (auch nach menschlicher Anpassung, Zählung 0);
(c) hoch, Advisor UEBERARBEITEN ⇒ Architekt erneut (Auftragstext mit Plan v1 + Befunden), danach direkt
Ausführung (kein zweiter Advisor-Lauf), Ausführung bekommt Plan v2 und nicht das Advisor-Ergebnis;
(d) FREIGEGEBEN ⇒ kein zweiter Architekt-Lauf;
(e) Review FEHLGESCHLAGEN ⇒ POST review-wiederholen + starten startet nur den Review-Schritt (Ausführungs-`lauf_id`
unverändert, keine Abnahme-Version).

Bestehende Gates/Tests anpassen: `check-f35-ws3-adjust-automatik.mjs` (d) Grenze 3 → 1 bzw. max_replans;
`f35-ws3-adjust-automatik.test.mjs`; `architecture-advisor.test.ts`; `workflow.test.ts`; ggf.
`check-fixpaket-f35-reallauf.mjs`, `check-f39-architekt.mjs`, `check-f15-workflow.mjs` (Vorlagenform).

#### 3.7 Doku (Umfang 7)

`state/findings.md`: F-203, F-909 erledigt; F-1085 (1) erledigt (Status „teilweise“ bleibt); F-981 Teil
„höchstens ein Rückweg je Stufe, Halt bei zweimal denselben Befunden“ erledigt, Budget offen (B2b-3). Neue
Findings für bewusst Offenes (4.). `docs/projekt/fixpaket-f45.md`: Schnitt B2b-1..4 laut Auftrag.
ARCHITECTURE.md §1: ein Satz zu Advisor-Schema/Rückweg (wo die Regel lebt). `docs/STATUS.md` falls Gate-Liste dort.

### 4. Zustände

- Default: hoch läuft Plan → Advisor FREIGEGEBEN → Ausführung (Freigabe) → Review.
- Leer: Advisor ohne Befunde + FREIGEGEBEN; Review ohne Befunde (Regel 1k unverändert).
- Fehler: Advisor-JSON ungültig ⇒ Halt mit Verstößen; Plan v1-Laufakte fehlt beim Architekt-v2-Start ⇒ Start
  abgelehnt mit Grund (kein stiller Lauf ohne v1); Rückweg-Schreiben scheitert ⇒ Startfehlerliste, Workflow
  bleibt KLAERUNG (wie heute bei der Bau-Automatik); review-wiederholen bei falscher Vorbedingung ⇒ 409.
- UI: Knopf gesperrt während der Anfrage (bestehendes Muster), Fehlertext in der Notiz.

### 5. Akzeptanzkriterien

AK1 Grenze aus `max_replans`, ≤ 1 je Stufe, Halt mit lesbarem Grund · AK2 dieselben Befunde ⇒ sofort Halt ·
AK3 Advisor-Ergebnis schemageprüft (Schema-Datei + Validator + Halt) · AK4 Plan v2 bei MIT_AUFLAGEN/UEBERARBEITEN,
Ausführung bekommt nur den letzten Plan, ZWINGEND bleibt · AK5 Review wiederholen nach Werkzeugausfall, zählt
nicht · AK6 Gate (a)–(e) grün, `npm run check` Exit 0 · AK7 Doku/Findings.

### 6. Risiken

- R1 Bestandsworkflows: persistierte hoch-Workflows tragen noch `ergebnis-@schritt-2-architektur` bei der
  Ausführung — harmlos (bekommt zusätzlich das Advisor-JSON). Läuft dort ein Advisor nach dem Update, gilt der neue
  JSON-Vertrag.
- R2 Verhaltensänderung: statt bis zu 3 automatischen Neubauten nur noch 1 — gewollt (Stefan), Gate f35-ws3 wird
  angepasst.
- R3 Regel 1c bei Plan v2: `findeWorkflowEntscheidungFuerSchritt` findet die Entscheidung zu v1 und hält bei neuen
  offenen Fragen in v2 nicht erneut an.
- R4 F-204: `max_schritte` zählt Schritte mit `lauf_id`, nicht Läufe — Rückwege erhöhen die Zahl nicht.

### Offene Punkte (nicht stillschweigend entschieden)

O1 Advisor-Schema ohne CLI-Durchsetzung: `claude --help` kennt `--json-schema`, das Gateway nutzt es nicht; ein
   echter Lauf wäre Pflicht (F-638/F-1086). Plan: Kern prüft beim Lesen, CLI-Durchsetzung als Finding. Alternative
   Advisor auf `codex` verworfen (Autor und Prüfer gleiches Modell).
O2 Kein zweiter Advisor auf Plan v2 (manueller Ablauf) — Alternative: Architekt + Advisor zurücksetzen (Plan-Stufen-
   grenze dann real erreichbar, aber Zusatzlauf und Sackgasse bei MIT_AUFLAGEN auf v2).
O3 Gesamtgrenze = Summe über Stufen (`max_replans`), je Stufe fest 1 — oder je Stufe = `max_replans` /
   Stufenzahl? Gewählt: Summe + feste 1.
O4 „Dieselben Befunde“ = gleiche Schlüsselmenge; Teilmenge (Korrektur hat nur einen Teil behoben) gilt nicht als
   Wiederholung (greift dann ohnehin die Grenze).
O5 Review wiederholen auch bei Regel 1k (Vertragsbruch), nicht nur Werkzeugausfall — F-1085 (1) nennt beides.
O6 Architekt-v2 braucht erneut Stefans Freigabe (hoch: ZWINGEND vor jedem Schritt).
O7 Zwei Anfragen im UI (review-wiederholen, dann starten) statt einer — Folge der Vorgabe „6 Aufrufstellen“.

## Advisor-Pass (14.10.2026, frischer Kontext, `architecture-advisor`)

Urteil: **Nicht freigegeben** (kein externer Blocker). Rollengrenze: nur Read/Grep/Glob — Gates nicht ausgeführt,
Bruchliste aus dem Quelltext abgeleitet; JSON-Treue eines echten claude-code-Advisors nur im echten Lauf belegbar.

Vor dem Bau zu klären:
- B1 HOCH [Schlussfolgerung] 0,5 AT reichen nicht (≈ 1–1,25 AT). Vorschlag: B2b-1a Bau-Stufe (Umfang 1 Bau, 2, 5 + UI,
  Gate a/b/e) und B2b-1b Plan-Stufe (Umfang 3, 4, Gate c/d; braucht `pruefeRueckweg` aus 1a).
- B2 HOCH [Fakt] R3 ist ein Fehler: `findeWorkflowEntscheidungFuerSchritt` (routen-f39.mjs:114-121) kennt nur die
  schritt_id; Plan v2 bekommt Stefans Entscheidungen nicht, neue Fragen in v2 halten nicht an. Korrektur: Entscheidungen
  als bindender Block in die v2-Instruktion; Nachlauf hält fail-closed bei unbeantworteten Fragen in v2.
- B3 HOCH [Fakt] Gate-Liste unvollständig: check-f15-workflow.mjs:3283-3323 (13/12 → 15/14 Schreib-/eingefroren-Stellen),
  check-f35-ws3 (c) und Z. 346, check-f659:281, f35-ws3-adjust-automatik.test.mjs:21,33, i18n `abnahme.automatisch` „/3“
  (de/en/ru/tr), workflow-abnahme.test.mjs:136; Kommentare dürfen `starteWorkflowSchritt(` nicht enthalten.
- B4 MITTEL-HOCH [Fakt] Nach einem Advisor-Halt (Regel 1d) kein Ausweg außer neuer Fassung. Entscheidung Stefan:
  „Prüfschritt wiederholen“ auch für den Advisor oder Finding + Hinweis im Halt-Grund.
- B5 MITTEL [offene Unsicherheit] Abbildung Skill-„Blockiert“ auf drei Werte; FREIGEGEBEN ⇒ Befunde leer erzwingt bei jedem
  NIEDRIG-Hinweis Plan v2.

Mitlaufend: B6 Validator nur für vom Kern verbrauchte Felder halten, Rest als Hinweis, JSON-Fallback lesen, echter
Advisor-Lauf als Merge-Bedingung · B7 Plan-Zählung greift strukturell nie; Fixtures mit max_replans 0 prüfen
(check-f15-automat-real:377,1041, check-fixpaket-f30-vorbedingungen:398, check-f17:532) · B8 Wiederholungsschlüssel
Schwere + Dateipfad ohne Zeile · B9 1k-Wiederholung nur bei Urteil BEREIT/BEREIT_NACH_KORREKTUR ohne AK-Verstöße ·
B10 Grenzsatz nur bei `art: grenze|wiederholung` · B11 `rueckweg` im POST /api/workflows normalisieren, Validator prüft
`anlass_schritt_id` · B12 Render-Nachweis als AK · B13 Bestands-hoch: `ergebnis-@<advisor>` bei der Ausführung im Rückweg
entfernen · B14 [offene Unsicherheit] Freigabedialog zeigt Plan v2/Befunde nicht — Finding oder bewusst annehmen.

Entlastend: E1 `ergebnis-@` löst auf aktuelle lauf_id · E2 zwei Anfragen (review-wiederholen + starten) robust ·
E3 `freigabe_erteilt` entfernen richtig, Ort von `wendePlanRueckwegAn` richtig · E4 Muster optionales Schrittfeld ·
E5 F-204 schließbar · E6 Präzedenz JSON-Vertrag beim Lesen (eignungspruefung) · E7 gleicher Lesepfad wie F-648 ·
E8 kein zweiter Advisor = manueller Ablauf · E9 Vorbedingung lauf_id gesetzt richtig · E10 NICHT-Liste eingehalten.

## Entscheidungen Stefan (14.10.2026, nach dem Advisor-Pass)

- **B1 = Teilen 1a/1b.** Diese Iteration baut **B2b-1a Bau-Stufe**; **B2b-1b Plan-Stufe** (Advisor-Schema, Plan v2,
  Gate c/d, B2/B5/B6/B11/B13/B14) folgt als eigener Bau und braucht `pruefeRueckweg` aus 1a.
- **B4 = Prüfschritt wiederholen** gilt für `code-reviewer` **und** `architecture-advisor` (eine Funktion, zählt nicht als
  Rückweg).
- **B5 = Blockiert → UEBERARBEITEN** mit Befund „Entscheidung Stefan nötig“ (Architekt nimmt ihn als `entscheidungen_mensch`
  auf); FREIGEGEBEN nur ohne Befunde — umgesetzt in 1b.

## Plan v2 — B2b-1a Bau-Stufe (Schätzung ≈ 0,5 AT)

### 1. Grenze aus `max_replans` (Umfang 1, Bau-Stufe)
- `scripts/leitstand/f35-ws3-adjust-automatik.mjs`: `GRENZE_AUTOMATISCHE_ANPASSUNGEN` entfällt; `GRENZE_JE_STUFE = 1`.
  Neue reine Funktion `pruefeRueckweg({ stufe, rueckwegeStufe, rueckwegeGesamt, maxReplans })` →
  `{ erlaubt: true }` | `{ erlaubt: false, art: 'grenze', grund }` (lesbar, nennt Stufe und Zahl). In 1a ist
  `rueckwegeGesamt = rueckwegeStufe` (Bau, `zaehleKernVersionen`); die Plan-Zählung kommt mit 1b (B7: Plan-Stufe prüft
  dann nur Gesamtgrenze + „Architekt trägt noch keinen rueckweg“).
- `ermittleAutomatischeAnpassung` bekommt `maxReplans`, `vorherigeBefunde`, `befunde` statt der festen Grenze und liefert
  zusätzlich `art: 'grenze' | 'wiederholung'` (B10) — andere Ablehnungen (Schema, Urteil, keine Blockade) ohne `art`.
- Lesbarer Halt: Entscheidung wird **vor** dem Nachlauf-Schreiben berechnet; im Updater wird nur bei `art` grenze/wiederholung
  und `naechster.art === 'haltKlaerung'` der Satz an den Grund gehängt. Kein zusätzlicher Schreibvorgang.
- Begründungskopf: „Automatische Anpassung (Rückweg 1 von 1, Bau-Stufe) nach Review-Urteil …“; i18n `abnahme.automatisch`
  ohne „/3“: „Automatisch angelegt · Rückweg {iteration} von 1 · Start erfordert deine Freigabe“ (de/en/ru/tr).
- Vorlagen: Werte bleiben (hoch 2, standard 1, fast-lane 1); Schema-Beschreibung von `max_replans` nennt die Bedeutung.

### 2. Halt bei Wiederholung (Umfang 2)
- Reine Funktion `sindDieselbenBefunde(vorher, jetzt)`: Schlüssel `schwere|dateipfad`, Dateipfad = `fundstelle` ohne
  angehängte Zeilenangabe (`:12`, `:12-20`, `Z. 12`) (B8); gleich = gleiche, nicht-leere Schlüsselmenge.
- „Vorher“: letzte Abnahme-Version mit `ANPASSUNG_ANGEFORDERT` und `bezug.review_lauf_id !== laufId` → deren Review-Befunde
  (`leseUrteilAusLaufakte`, Lesepfad F-648). Wiederholung wird vor der Grenze geprüft (eigener Grund).

### 3. Prüfschritt wiederholen (Umfang 5 + B4)
- Reine Funktion `pruefschrittWiederholbar(workflowDaten, befund)` (in der Automatik-Datei): Workflow
  `KLAERUNG_ERFORDERLICH`, Cursor-Schritt mit gesetzter `lauf_id` und
  - `code-reviewer` (output_schema `ergebnis-code-reviewer`): `FEHLGESCHLAGEN` (Werkzeugausfall/Zeitgrenze), oder
    `ERFOLGREICH` mit Urteil BEREIT/BEREIT_NACH_KORREKTUR, ohne AK-Verstöße und mit Review-Vertragsverstoß (Regel 1k, B9);
  - `architecture-advisor`: `FEHLGESCHLAGEN` oder `ERFOLGREICH` ohne erkennbares Urteil (Regel 1d).
  VERWEIGERT bewusst nicht (lesender Prüfer, eine Wiederholung liefe in dieselbe Ablehnung).
  Der Server berechnet `befund` aus der Laufakte (dieselben Leser wie im Nachlauf).
- POST `/api/workflows/<id>/pruefschritt-wiederholen` (CSRF/Host wie alle POSTs, D13-Sperre, Laufsperre): 409 bei falscher
  Vorbedingung; sonst neue Workflow-Version über `schreibeWorkflowFortschritt` (liest `eingefroren`) mit Schritt
  `OFFEN`/`lauf_id null`, Cursor auf ihm, Status/Grund aus `ermittleNaechstenSchritt`. Keine Abnahme, keine Zählung,
  **startet nichts** (6 Aufrufstellen bleiben). F-1085 (1) erledigt.
- GET `…/abnahme`: additiv `reviewWiederholbar` (gleiche Funktion).
- UI: Knopf „Review wiederholen“ in der roten Review-Notiz (`views/workflow-abnahme.js`), Klick → POST
  pruefschritt-wiederholen, danach bestehendes POST `…/starten`, dann neu laden (`sendeAbnahmeBedienung`); Satz
  `abnahme.review.weiter` mit Knopf-Variante; i18n de/en/ru/tr. Advisor-Knopf im Leitstand kommt mit 1b (dort wird das
  Advisor-Ergebnis angezeigt) — bis dahin nur über die Route; als Restpunkt in F-1085 bzw. 1b vermerkt.

### 4. Gate `scripts/check-f45-b2b1-rueckweg.mjs` (in `npm run check`)
Echter Testserver, gestubbter Worker, echte Laufakten (Muster `check-f35-ws3-adjust-automatik.mjs`):
(a) Review BLOCKIERT → kern-Rückweg (WARTET_FREIGABE) → Freigabe → Review BLOCKIERT mit **anderen** Befunden ⇒
KLAERUNG, kein zweites kern-Artefakt, Grund nennt die Grenze; dazu Workflow mit `max_replans 0` ⇒ kein Rückweg, Grund
nennt `max_replans`. (b) Menschliche Anpassung, dann Review mit denselben Befunden (andere Zeilennummer) ⇒ KLAERUNG,
kein kern-Artefakt, Grund nennt die Wiederholung. (e) Review FEHLGESCHLAGEN ⇒ GET abnahme `reviewWiederholbar: true`,
POST pruefschritt-wiederholen + POST starten startet nur den Review (Ausführungs-`lauf_id` unverändert, keine neue
Abnahme-Version), Rotfälle: 409 bei falscher Vorbedingung (Workflow nicht KLAERUNG / Review BLOCKIERT), Advisor-Fall
über die reine Funktion. Gate-Fälle (c)/(d) gehören zu 1b.

### 5. Anzupassende Prüfungen (B3)
`check-f15-workflow.mjs` F-228-Zählung 13/12 → 14/13; `check-f35-ws3-adjust-automatik.mjs` (c) zweite kern-Version und
(d) Grenze 3 → neue Grenze, Textfund „max. 3“; `check-f659-review-korrektur-begruendung.mjs:281`;
`scripts/leitstand/f35-ws3-adjust-automatik.test.mjs`; `public/leitstand/views/workflow-abnahme.test.mjs:136`; Fixtures mit
`max_replans 0` (B7) prüfen. Kommentare ohne die Zeichenfolge des Startfunktionsaufrufs.

### 6. Doku
`state/findings.md`: F-203 erledigt (Leser: Bau-Stufe; Plan-Stufe mit 1b), F-1085 (1) erledigt, F-981 Teil „Halt bei
zweimal denselben Befunden, ≤ 1 Rückweg je Stufe“ erledigt (Budget offen → B2b-3), F-204 Nachtrag (E5) erledigt; F-909
bleibt offen → 1b; neue Findings: Advisor-Knopf/Plan-Stufe (1b), O1 CLI-`--json-schema`, B14 Freigabedialog ohne Plan.
`docs/projekt/fixpaket-f45.md`: Schnitt B2b-1..4 (erledigt) + Teilung B2b-1a/1b. ARCHITECTURE.md §1: ein Satz zur Rückweg-Regel.

### 7. Akzeptanzkriterien 1a
AK1 Grenze aus `max_replans`, ≤ 1 je Stufe, Halt mit lesbarem Grund · AK2 dieselben Befunde ⇒ Halt · AK3 Prüfschritt
wiederholen (Review mit UI, Advisor per Route), zählt nicht · AK4 Gate (a)(b)(e) grün, angepasste Prüfungen grün,
`npm run check` Exit 0 · AK5 Render-Nachweis für den Knopf (B12) · AK6 Doku/Findings.

## Delta-Advisor-Pass (14.10.2026) und Nachträge zu Plan v2

Urteil: **Freigegeben mit Hinweisen.** Übernommen:
- D1 (HOCH) `check-f15-automat-real.mjs` Fall (i) legt `max_replans: 0` an und erwartet eine kern-Anpassung → Fixture auf
  `max_replans: 1` (der Fall prüft Regel 1b + Automatik, nicht die Grenze), Kommentar mitziehen.
- D2 Schätzung 1a ≈ 0,75 AT (statt 0,5).
- D3 Advisor-Zweig (Entscheidung B4 bleibt): der Reset entfernt `freigabe_erteilt` (wie `wendeAutomatischeAnpassungAn`);
  Status aus `ermittleNaechstenSchritt` — Review (AUTOMATISCH) ⇒ LAEUFT, der Leitstand startet danach über POST `…/starten`;
  Advisor (ZWINGEND in hoch) ⇒ WARTET_FREIGABE, gestartet über die bestehende Freigabe (Leitstand-Weg vorhanden). HTTP-Fall
  für den Advisor ins Gate. Der Advisor-Zweig liest in 1a die heutige Regel 1d (Urteil fehlt); 1b stellt ihn auf das Schema um.
- D4 Review mit fehlendem/unbekanntem Urteil ⇒ wiederholbar; BLOCKIERT oder AK-Verstoß ⇒ nicht.
- D5 Eine Server-Hilfsfunktion `ermittlePrueferBefund` für GET und POST (kein dritter Leser).
- D6 „Vorher“ = die **neueste** Abnahme-Version, wenn deren Ergebnis ANPASSUNG_ANGEFORDERT ist (Lesepfad F-648).
- D7 Name deutlich getrennt von F-656: Route POST `/api/workflows/<id>/pruefer-wiederholen`, Knopfklasse
  `.wf-pruefer-wiederholen`, i18n `abnahme.pruefer.*`.
- D8 Keine Kommentare mit `schreibeWorkflowFortschritt(` oder `.eingefroren` außerhalb echter Stellen; neue Route nach
  POST `/api/laeufe` (check-f11 sucht das erste `if (laufAktiv)`).
- D9 Nachtrag O4: Die Wiederholungsregel wirkt praktisch nach menschlicher Anpassung (nach automatischer greift schon die
  Grenze); ein reiner AK-Fall ohne Befunde gilt nie als Wiederholung.
- D10 i18n ohne Nenner: „Automatisch angelegt · Rückweg {iteration} · …“ (Bestand mit 2–3 kern-Versionen zeigt sonst „3 von 1“).

## Bau und Prüfpass B2b-1a (14.10.2026)

Gebaut nach Plan v2 + Nachträgen. Unit-Tests zuerst rot (Import fehlte), dann grün; Gate `check-f45-b2b1-rueckweg`
neu, Gegenprobe per Mutation (Grenze 3, Wiederholung aus) → (a) und (b) rot. Prüfpass (frischer Kontext):
code-reviewer BEREIT_NACH_KORREKTUR (3 MITTEL), qa BEREIT_NACH_KORREKTUR, design-guardian nicht freigegeben (2 MITTEL).
Eine Korrekturrunde: globale Laufsperre in der Route, Halt-Gründe ohne Feldnamen („Korrekturrunde“, höchstens drei
Befunde lesbar), Poll-Last (Laufakte durchgereicht, Auftrag nur bei tragendem Urteil), Regex für Zeilen/Spalten,
Befund ohne Fundstelle ⇒ keine Wiederholung, try/catch vor dem Nachlauf-Schreiben, Knopf an `reviewWiederholbar` und auf
eigener Zeile, Teilerfolg im Fehlerstil, Gate (e4)–(e6), Schema-Beschreibung `max_replans`, Doku. Bewusst offen:
F-1104, F-1105, F-1106, F-1107. Plan-Stufe → B2b-1b.
