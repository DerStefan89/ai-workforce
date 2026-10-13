# F45 B2a-3 — Plan (Codex-Review-Spec + Ausgaberegel)

Branch `f45/b2a3-codex-review`, Basis `a6d3411` (main mit B2a-2, #330). Grundlage: Auftrag F45 B2a-3 (13.10.2026),
Fixpaket-Zeile B2a-3, Findings F-1063 (K25), F-959, F-998, F-1050, F-639/F-638 (Strict-Modus), Spec
`docs/projekt/codex-review-spec.md` (Stefan, 12.10.2026). Bau erst nach freigegebenem Plan (Auftrag, Ablauf 1).

## Plan v1

### Befunde vorab (Code gegen a6d3411)
- Review-Auftrag (`starteWorkflowSchritt`, `scripts/leitstand-server.mjs` ab Z. 6427): Auftragstext → F-648-Korrektur →
  AK-Block (`baueAkPruefInstruktion`) → Projektkarte (B2a-1) → Beobachtungsblock nur claude-code (F-1062). Keine
  Review-Policy; die Rolle kennt ihre Pflichten nur aus der Checkliste `.claude/agents/code-reviewer.md` in der Karte.
- Gate f45-b2a2 (b) vergleicht den Review-Auftrag VOR der Projektkarte bitgenau → neuer Text gehört hinter die Karte.
- `schemas/ergebnis-code-reviewer.schema.json`: `befunde[]` = {schwere NIEDRIG|MITTEL|HOCH, fundstelle,
  zusammenfassung, beleg}; Strict-Dialekt (jede Eigenschaft in `required`, `additionalProperties:false`), geprüft von
  `check-fix-f639-schema-strict-modus.mjs` und `check-f16-codex-gateway.mjs` (d). Nullable-Muster im Repo:
  `"type": ["string","null"]`, bei Enums zusätzlich `null` in `enum` (`ergebnis-architektur` `kategorie`).
- Codex ist der einzige Worker mit `--output-schema` (Regel 4b); ein claude-code-Reviewer im Ablauf hat kein Schema
  und kein auswertbares Urteil — die Policy wirkt dort nur als Text.
- Gelesen wird das Ergebnis ohne Schemaprüfung (`leseUrteilAusLaufakte`, Z. 4343: urteil Pflicht, Rest normalisiert);
  Regel 1b (urteil) und 1i (AK-Verstöße) in `ermittleNaechstenSchritt` (`src/workflow/index.ts`) halten an. Der
  Review ist in allen Vorlagen der letzte Schritt (BEREIT → `fertig` → Abnahme).
- Abnahme-Projektion GET `/api/workflows/<id>/abnahme` (Z. 7586): `urteil` mit status ok | nicht_lesbar |
  laufakte_fehlt | noch_nicht_gelaufen | kein_review_schritt. Ein FEHLGESCHLAGENER Review erscheint dort als
  `nicht_lesbar` („Urteil konnte nicht gelesen werden“) — der Grund (Werkzeugausfall/Zeitgrenze) steht nur im
  Workflow-`grund`. Anzeige: `views/workflow-abnahme.js` `renderReviewKachel` (Abnahme) und `renderAbnahmeBlick`
  („Auf einen Blick“ im Ablauf-Detail, Leitstand). Geladen per Aufruf (fokus-daten, workboard, workflows), nicht im
  `/api/zustand`-Poll.
- Laufakte: Metadaten kommen über `ausfuehrungsOptionen` in beide Gateways (Muster `projektkarte`, B2a-1); Schema
  `kontrollzustand-laufakte-payload` additiv, Validatoren in `src/claude-code-gateway` und `src/codex-gateway`.
- Projektkarte `fehlend` (B2a-1) ist fail-open und häufig nicht leer (z. B. DoD-Platzhalter, fehlende Checkliste).
- Ohne Arbeitsordner liegt `kontrollzustand/` im geprüften Ordner selbst (untracked) und ändert sich mit jedem Lauf.
- Jarvis (`src/jarvis/index.ts` `baueJarvisAuftragstext`, F44 WS-8b) hat die Regel „direkt ausführbar“ schon, ohne
  „erste Zeile cd auf den vollen Projektpfad“ und ohne „Deine Schritte“ (F-998); der Pfad ist dort nicht bekannt.
- Leitstand-Befehle: `public/leitstand/code-daten.js` `sicherBefehle` (Sichern: add…, commit, push in EINEM Block, kein
  `cd`), genutzt von `views/code.js` (Sichern, Prüfstand: ein Befehl ohne `cd`) und `views/workboard.js` (Sichern);
  `views/auftrag-umgebung.js` zeigt nur `cd`. Projektpfad liegt in der Code-Projektion (`absoluterPfad`).

### 1 Spec-Datei `docs/projekt/codex-review-spec.md`
Kopfabschnitt „Umsetzung in der Workforce“ (B1b: Beobachtung ans Review; B2a-1: Projektkarte für Reviewer, kein
Beobachtungsblock bei Codex; B2a-3: Policy, Schema v2, geprüfter Stand/veraltet, Fehlerfälle; später: §8 Status
strittiger Befunde → B2b, §11 → F-1050), danach der Block SPEC wörtlich (Bytevergleich im Gate gegen einen im Gate
festen sha256 des Spec-Teils).

### 2 Review-Policy — eine Stelle: `src/review-policy/index.ts` (rein)
- `REVIEW_POLICY_VERSION = 'review-policy-1'`, `KEINE_BEFUNDE_SATZ = 'Keine belastbaren Findings im geprüften Scope'`.
- `baueReviewPolicyBlock()` → Text `## Review-Policy (review-policy-1)`: Rolle (unabhängiges technisches Review des
  fertigen Codes, kein Prozessaudit); die fünf Dimensionen mit Spec-Kurzinhalt plus Sicherheitsdefekte; „Explizit
  nicht beauftragt“ (§4, inkl. Ausnahme gezielter Test); „Du darfst auch frühere Architekturannahmen (Architekt-Schritt)
  kritisieren“; „Grüne Tests sind kein Korrektheitsbeweis“; nur aus prüfbarem Kontext ableiten, Unsicherheit kennzeichnen,
  Lücken der Projektkarte als nicht geprüft nennen; Widersprüche zwischen Quellen benennen; Ausgabe je Befund (`id`
  B1…, `dimension`, `schwere` inkl. KRITISCH, `fundstelle`, `zusammenfassung` = Fehlverhalten + warum, `beleg` =
  Repro/Testidee oder statische Begründung, `korrekturrichtung` minimal-invasiv, `evidenz`); ohne Befunde steht
  `KEINE_BEFUNDE_SATZ` in `empfehlung`, nie „fehlerfrei“. Regeln aus ARCHITECTURE/ADRs/DoD werden nicht kopiert —
  Verweis auf die Projektkarte im selben Auftrag.
- Server: genau ein Aufruf in `starteWorkflowSchritt`, für `code-reviewer` (beide Worker), NACH Karte und
  Beobachtungsblock (f45-b2a2 (b) bleibt bitgleich).
- `pruefeReviewErgebnis(ergebnis)` → Verstöße (rein): leere `befunde` ohne den Satz in `empfehlung`; Befund mit
  `null`/fehlendem `id`, `dimension`, `evidenz`, `korrekturrichtung`; doppelte `id`.

### 3 Schema `ergebnis-code-reviewer` v2 (additiv, Strict)
- `befunde[].schwere` enum + `KRITISCH`; neu in `properties` UND `required`, nullable: `id` (string|null),
  `dimension` (bugs|funktion|skalierbarkeit|wartbarkeit|prinzipien|sicherheit|null), `evidenz`
  (confirmed|likely|needs-validation|null), `korrekturrichtung` (string|null). Beschreibung „v2 (F45 B2a-3)“; `null`
  nur für Abwärtskompatibilität — die Policy verlangt Werte, `pruefeReviewErgebnis` prüft sie.
- `geprueft_stand` NICHT im Modellschema (das Modell setzt ihn nicht): der Server schreibt ihn in die Laufakte.
- Alte Ergebnisse (ohne neue Felder) bleiben lesbar: kein Leser verlangt die Felder; Gate prüft ein altes Beispiel.

### 4 Geprüfter Stand und „Review veraltet“ (Spec §9.6)
- `scripts/leitstand/arbeitsstand.mjs`: `standAusTeilen(head, diff, unverfolgt)` (rein) → `"<head>"` bei sauberem
  Ordner, sonst `"<head>+<sha256>"` über `diff-index -p --binary HEAD` und (Pfad, sha256 Inhalt) der unverfolgten
  Dateien (`ls-files --others --exclude-standard -z`). Lesend: `--no-optional-locks`, Plumbing `diff-index` (schreibt
  den Index nie, Muster F46 D4), kein `git status`. Ausgeschlossen per Pathspec `:(exclude)<kontrollzustand relativ>`,
  wenn der Kontrollzustand im Ordner liegt. Zwei dünne Hüllen: synchron beim Schrittstart (Muster `leseVorherStand`),
  asynchron für GET (Event-Loop, P2). Fehler/zu groß → `null` mit Grund.
- Laufakte additiv `review: { policy_version, geprueft_stand: string|null, stand_grund?: string }` (Schema + beide
  Gateways, Muster `projektkarte`), gesetzt beim Start des code-reviewer-Schritts für den Laufordner
  (`laufwurzelFuer`: Arbeitsordner, sonst Projekt).
- Abnahme-Projektion `urteil` (status ok) additiv: `policy_version`, `geprueft_stand`, `aktueller_stand`, `veraltet`
  (true | false | null = nicht bestimmbar), `kontext_luecken` (aus `projektkarte.fehlend` der Review-Laufakte),
  `vertrag_verstoesse` (`pruefeReviewErgebnis`, nur bei gesetzter Policy-Version). Alte Laufakte: Felder null/leer.
- Anzeige über eine reine Funktion `reviewHinweise(urteil)` in `workflow-abnahme.js`, genutzt von
  `renderReviewKachel` (Abnahme) und `renderAbnahmeBlick` (Leitstand, Ablauf-Detail): „Review veraltet — der
  Arbeitsordner hat sich seit dem Review geändert“, „Stand nicht bestimmbar“, „Kontext unvollständig: …“,
  „Review-Vertrag verletzt: …“. `renderBefunde` zeigt id, Dimension, Evidenz, Korrekturrichtung, wenn vorhanden;
  KRITISCH mit Farbe der Fehlerstufe (vorhandene Tokens). i18n de/en/tr/ru.

### 5 Fehlerfälle (Spec §9.8) — kein stilles BEREIT
- Toolausfall/Timeout: Schritt FEHLGESCHLAGEN → Regel 1 hält (Grund im Workflow). Neu in der Projektion: status
  `fehlgeschlagen` (Schrittstatus FEHLGESCHLAGEN/VERWEIGERT) mit `grund` aus dem Workflow statt `nicht_lesbar`.
- Leere Befundliste ohne den Satz, Befund ohne Pflichtwert: neue Regel 1j′ (Name nach freiem Buchstaben) in
  `ermittleNaechstenSchritt`: `vorschrittErgebnis.reviewVerstoesse` nicht leer → `haltKlaerung` mit Grund; berechnet
  im Nachlauf nur, wenn die Laufakte `review.policy_version` trägt (alte Läufe unverändert).
- Unvollständiger Kontext (Karte mit `fehlend`): kein Halt (fail-open wie B2a-1, sonst hielte jeder Lauf mit DoD-
  Platzhaltern), aber sichtbar: `kontext_luecken` in Abnahme und Blick neben dem Urteil; die Policy verlangt, Lücken
  als nicht geprüft zu nennen.

### 6 Ausgaberegel „direkt ausführbar“ (F-959) und „Deine Schritte“ (F-998)
- Jarvis: `baueJarvisAuftragstext(nachricht, verlauf, { projektPfad })` — Regel ergänzt: erste Zeile jedes Blocks
  `cd '<voller Projektpfad>'` (Wert eingesetzt, PowerShell-gequotet); bestehende Punkte bleiben. Neu: „Muss der Mensch
  etwas tun, beginnt 'antwort' mit 'Deine Schritte:' — höchstens drei Zeilen, einfache Sprache; Erklärung und
  Befehlsblöcke danach.“ Server reicht `repoWurzel` (beide Aufrufe Z. 9416/9467).
- Leitstand: `code-daten.js` neue reine Funktion `befehlsBloecke(pfad, folgen)` (jede Folge ein Block, erste Zeile
  `cd <psArgument(pfad)>`); `sicherBefehle` liefert `bloecke` = [cd + add… + commit] und [cd + push] (schädliche
  Folge getrennt), Prüfstand [cd + Prüfbefehl]; `code.js`/`workboard.js` rendern je Block einen Befehlsblock. Ohne
  Pfad → Grund statt Befehl. Render-Nachweis (`npm run render-nachweis`) 1440/390, design-guardian.

### 7 Gate `scripts/check-f45-b2a3-codex-review.mjs` (in `npm run check`, nach f45-b2a2)
(a) Spec-Datei vorhanden, SPEC-Teil bytegleich (fester sha256); (b) über den echten HTTP-Pfad (Attrappe
`fuehreAufgabeDurch`, Gerüst f45-b2a1): Policy-Block genau einmal im Codex- und im Claude-Review-Auftrag, mit
Version; kein Beobachtungsblock bei Codex; Laufakte trägt `review.policy_version` und `geprueft_stand`;
`baueReviewPolicyBlock(` genau einmal im Server; (c) Schema v2: strict-tauglich (Funktion aus f639), neue Felder in
`required` und nullable, altes Ergebnis-Beispiel + alte Laufakte (ohne `review`) gültig/lesbar; (d) veraltet:
Wegwerf-Repo — gleicher Stand → false; Datei geändert, neue unverfolgte Datei → true; Änderung nur in
`kontrollzustand/` → false; `.git/index` unverändert (Bytes + mtime); (e) Fehlerfälle: Review FEHLGESCHLAGEN →
Projektion `fehlgeschlagen` mit Grund, Workflow KLAERUNG_ERFORDERLICH; leere Befunde ohne Satz → Halt mit Grund; mit
Satz → fertig; Karte mit fehlend → `kontext_luecken` in der Projektion; (f) Jarvis-Auftrag enthält jede Regelzeile
inkl. `cd` mit eingesetztem Pfad und „Deine Schritte“; `sicherBefehle` erste Zeile je Block `cd`, push getrennt; (g)
Quelltext: `starteWorkflowSchritt(` genau 6× im Server. Rotfälle kalibriert (je Prüfung ein verfälschter Eingang).
Unit-Tests: `src/review-policy`, `src/workflow` (neue Regel), `arbeitsstand`, `code-daten`, `workflow-abnahme`,
`jarvis`.

### 8 Doku/Register
F-1063 erledigt; F-959 erledigt (Jarvis + Leitstand; Vorlage der Bauaufträge: Nachtrag/Rest benennen); F-998
erledigt für Jarvis (Nachtrag); neues F-1084 PROCESS_IMPROVEMENT P3 (B2a-2 vorab gebaut, Maßnahme umgesetzt ab B2a-3);
Fixpaket-Zeile B2a-3 Ist; Akte F45 (B2a-3, Belege 1/2/10 je Teil; B2a abgeschlossen erst mit Merge von B2a-3);
STATUS; ARCHITECTURE.md §1 (`src/review-policy`, geprüfter Stand) und §2 (lesender Arbeitsstand, kein Index-Schreiben).

### Nicht ändern
`.claude/settings.json`, Hooks, `projekte.json`, `ressourcen.json`, `vorlagen/`, `package.json` außer der Gate-Zeile;
keine Rohströme, keine `*.lokal.json`.

### Offene Punkte (für den Advisor)
O1 `geprueft_stand` als String `head[+sha256]` statt Git-Tree-Hash (ein echter Tree bräuchte `write-tree` mit
Temp-Index = Schreiben in `.git/objects`). O2 Kontextlücken nur anzeigen statt anhalten. O3 Befund mit `null`-Pflichtwert
als Halt (strenger als das Schema). O4 `schwere` bleibt deutsch (NIEDRIG/MITTEL/HOCH/KRITISCH), Spec nennt englische
Werte. O5 Coach-Antworten (zeigen ebenfalls Befehlsblöcke) bleiben ohne Regel — nicht beauftragt.

## Advisor-Pass (13.10.2026, frischer Kontext, `architecture-advisor`)
Urteil **Nicht freigegeben**. Vor dem Bau: (B1) `"<head>+<sha256>"` kippt nach jedem Commit (auch „Sichern“ und
Metadaten-Commit), `diff-index -p` ohne Index-Auffrischung zeigt reine Zeitstempel-Änderungen, und der Git-Starter mit
`--literal-pathspecs` macht `:(exclude)` wirkungslos → Inhalts-Fingerabdruck statt Diff: `ls-tree -r HEAD` + geänderte
(`diff-index --raw -z HEAD`) und neue Dateien (`ls-files --others --exclude-standard -z`) per `hash-object
--stdin-paths` (ohne `-w`), Ausschluss in JS über `istAusnahmePfad`, gespeichert `{ commit, inhalt }`, „veraltet“ nur
über `inhalt`; (B2) Policy „kein Prozessaudit“ widerspricht dem Beobachtungsblock (Claude) und der Karte (jeder
DoD-Punkt als Befund, inkl. Prozesspunkte) → Vorrangregel nötig; Satz nur auf „enthält“ prüfen (`empfehlung` beginnt
mit „Checkliste: …“); (B3) Zuschnitt zu groß (Laufakte-Feld über Execution-Controller und beide Gateways, gebrochene
Tests `code-daten`/`routen-code`, zwei Oberflächen mit Render-Nachweis) → Teilung B2a-3a/B2a-3b vorgeschlagen; (B4)
Werkzeugausfall vor dem ersten Checkpoint heilt den Schritt (lauf_id null) → Projektion `noch_nicht_gelaufen` statt
Grund; (B5) frei ist Regel **1k**, gekoppelt an `output_schema` (claude-code-Reviewer: Policy nur als Text), kein
Auslöser der Anpassungsautomatik, Ausweg nach Halt benennen.
Läuft mit: L1 altes Ergebnis „lesbar“ statt „gültig“; L2 f639 nicht importieren; L3 aktueller Stand nur bei offener
Abnahme, parallel; L4 Zeitgrenze/Größenkappe im synchronen Start; L5 Laufakte-Feld über Gateway-Unit-Tests; L6 sha256
LF-normalisiert; L7 Policy-Hash an Version koppeln; L8 `projektPfad` optional, Text ohne Pfad bitgleich, Arbeitsordner
→ `cd` auf den Worktree; L9 Regelzeilen als Konstante, Coach als Rest von F-959; L10 Kopfkommentar Regeln; L11
Schwere-Zuordnung im Spec-Kopf.

## Entscheidungen Stefan (13.10.2026, nach dem Advisor-Pass)
- **Teilen:** B2a-3a (dieser Branch): Spec, Review-Policy, Schema v2, Regel 1k, Fehlerfall-Anzeige in der Abnahme,
  Jarvis-Regel mit „Deine Schritte“. B2a-3b (danach): geprüfter Stand und „Review veraltet“ (B1/L3/L4), Befehlsblöcke
  im Leitstand mit `cd` und getrennten Blöcken (F-959 Leitstand).
- **Vorrang: Policy vor Karte.** Prozesspunkte der DoD (Reviewer-/QA-Pass, Commit-Freigabe, Render-Nachweis,
  `npm run check`) gelten im Review als „nicht anwendbar (Harness-Abgleich)“. Der Beobachtungsblock bleibt beim
  Claude-Reviewer als ausdrückliche Ausnahme (B1b-1, Beleg 3); Befunde daraus tragen die Dimension `prinzipien`. Codex
  unverändert ohne Block.

## Plan v2 (B2a-3a)
Unverändert aus v1: Befunde vorab; Abschnitt 1 (Spec-Datei) mit Kopf ergänzt um die Teilung, die Schwere-Zuordnung
critical/high/medium/low → KRITISCH/HOCH/MITTEL/NIEDRIG (L11) und „claude-code-Reviewer: Policy nur als Text — ohne
Ausgabeschema keine Vertragsprüfung und keine Abnahme-Anzeige“ (B5).

### 2 Review-Policy `src/review-policy/index.ts` (rein, einzige Quelle)
- `REVIEW_POLICY_VERSION = 'review-policy-1'`, `KEINE_BEFUNDE_SATZ`, `baueReviewPolicyBlock()` wie v1, dazu
  Vorrangregel (B2): „Diese Policy geht der Projektkarte vor: Prozesspunkte der DoD und der Checkliste … bewertest du mit
  ‚nicht anwendbar (Harness-Abgleich)‘, nicht als Befund“; Ausnahme Beobachtungsblock: „Steht unten eine Beobachtung des
  Ausführungslaufs, gilt sie als ausdrücklicher Zusatzauftrag; Befunde daraus mit Dimension ‚prinzipien‘.“ Die
  Policy-Anweisung zur `empfehlung`: Beginnt sie mit „Checkliste: …“ (Karte), steht der Satz danach.
- Server: ein Aufruf in `starteWorkflowSchritt`, nur `code-reviewer`, NACH Karte und Beobachtungsblock (f45-b2a2 (b)
  schneidet bei `# Projektkarte` — bleibt bitgleich). Gate koppelt sha256 des Policy-Texts an die Version (L7).
- `pruefeReviewErgebnis(ergebnis)` → Verstöße: leere `befunde` und `empfehlung` enthält den Satz nicht (Prüfung
  „enthält“, Leerraum normalisiert); Befund ohne Wert für `id`, `dimension`, `evidenz`, `korrekturrichtung`
  (fehlend oder `null`); doppelte `id`.
- Laufakte additiv `review: { policy_version }` (Schema `kontrollzustand-laufakte-payload`, additionalProperties false;
  durchgereicht wie `projektkarte`: Server-Optionen → Execution-Controller (`types.ts`, `index.ts`) → beide Gateways
  inkl. Validator/Typ). B2a-3b ergänzt `geprueft_stand` im selben Objekt. Beleg über Gateway-Unit-Tests (L5).

### 3 Schema v2
Wie v1 (KRITISCH; `id`, `dimension`, `evidenz`, `korrekturrichtung` in `required`, nullable; kein `geprueft_stand` im
Modellschema — gehört in die Laufakte, B2a-3b). Strict-Prüfung bleibt Sache von f639 (L2, nicht importiert). „Alt
lesbar“ statt „alt gültig“ (L1): Gate liest ein v1-Ergebnis über den Leseweg und die Abnahme-Projektion.

### 4 Regel 1k und Fehlerfälle (Spec §9.8)
- `src/workflow`: `SchrittErgebnis.reviewVerstoesse?: string[]`; Regel **1k** nach 1i, gekoppelt an
  `output_schema === 'ergebnis-code-reviewer'` (B5): nicht leer → `haltKlaerung` mit Grund „Review-Vertrag verletzt
  (review-policy-1): …“. Kopfkommentar um 1i/1j/1k ergänzt (L10). Der Nachlauf berechnet die Verstöße nur, wenn die
  Laufakte `review.policy_version` trägt (alte Läufe unverändert). Kein Auslöser der Anpassungsautomatik (sie reagiert
  nur auf BLOCKIERT/AK-Verstöße, `f35-ws3-adjust-automatik.mjs`) — Gate prüft das. Ausweg für Stefan wie bei 1i: in der
  Abnahme (KLAERUNG_ERFORDERLICH erlaubt Anpassung/Ablehnen) „Anpassung anfordern“ oder „Ablehnen“; die Abnahme zeigt
  den Grund.
- Abnahme-Projektion `urteil`:
  - neuer status `fehlgeschlagen` mit `grund` (Workflow-`grund`), wenn der Review-Schritt FEHLGESCHLAGEN/VERWEIGERT
    ist ODER (B4) `lauf_id` null, Workflow KLAERUNG_ERFORDERLICH und `aktiver_schritt_id` = Review-Schritt (geheilter
    Werkzeugausfall vor dem ersten Checkpoint);
  - bei status ok additiv `policy_version` (oder null), `vertrag_verstoesse` (nur mit Policy-Version), `kontext_luecken`
    (`projektkarte.fehlend` der Review-Laufakte, sonst []).
- Anzeige `views/workflow-abnahme.js`: reine Funktion `reviewHinweise(urteil)` → Liste, genutzt von
  `renderReviewKachel` (Abnahme) und `renderAbnahmeBlick` (Ablauf-Detail): „Review-Vertrag verletzt: …“, „Kontext
  unvollständig: …“; `URTEIL_STATUS` + `fehlgeschlagen` mit Grund; `renderBefunde` zeigt id, Dimension, Evidenz,
  Korrekturrichtung, wenn vorhanden; `FARBE_SCHWERE`/`SCHWEREN` + KRITISCH (vorhandene Fehlerfarbe). i18n de/en/tr/ru.
  Render-Nachweis 1440/390 (`npm run render-nachweis`), design-guardian.

### 5 Jarvis (F-959 Jarvis-Teil, F-998)
`REGEL_DIREKT_AUSFUEHRBAR` als exportierte Zeilenliste (L9) mit neuer Zeile „Erste Zeile jedes Blocks: cd auf den
vollen Projektpfad“ — mit `projektPfad` (optional, L8) als eingesetzter, PowerShell-gequoteter Wert, ohne Pfad als
allgemeine Zeile; dazu „Deine Schritte“-Zeile. Server übergibt `repoWurzel` an beiden Aufrufen (Chat, Zusammenfassung).
Jarvis-Test nachgezogen; Spike-Aufruf mit zwei Argumenten bleibt gültig.

### 6 Gate `scripts/check-f45-b2a3-codex-review.mjs`
(a) Spec vorhanden, SPEC-Teil sha256 (LF-normalisiert, L6) gleich dem festen Wert; (b) HTTP-Pfad (Attrappe, Gerüst
f45-b2a1): Policy-Block genau einmal im Codex- und im Claude-Review-Auftrag, hinter der Karte, mit Version; kein
Beobachtungsblock bei Codex; Eingaben tragen `review.policy_version`; Policy-sha256 ↔ Version; `baueReviewPolicyBlock(`
genau einmal im Server; (c) Schema v2: neue Felder in `required`, nullable, KRITISCH; v1-Ergebnis über
`leseUrteilAusLaufakte`/Projektion lesbar, alte Laufakte ohne `review` valide; (e) Fehlerfälle: Review FEHLGESCHLAGEN
→ `fehlgeschlagen` mit Grund; geheilter Review (lauf_id null, KLAERUNG) → `fehlgeschlagen`; leere Befunde ohne Satz →
Regel 1k Halt, keine automatische Anpassung; mit Satz → fertig; Laufakte ohne Policy-Version → kein Halt; Karte mit
`fehlend` → `kontext_luecken`; (f) Jarvis-Auftrag enthält jede Regelzeile, `cd` mit eingesetztem Pfad, „Deine
Schritte“; (g) `starteWorkflowSchritt(` genau 6×. Rotfälle kalibriert (je Prüfung ein verfälschter Eingang).
(d) „veraltet“ folgt mit B2a-3b.

### 7 Doku/Register
F-1063 teilweise (Schema v2, Policy; `geprueft_stand`/veraltet → B2a-3b); F-959 Jarvis-Teil erledigt, Rest Leitstand →
B2a-3b, Coach als Rest benannt; F-998 erledigt für Jarvis; neu F-1084 (P3 PROCESS_IMPROVEMENT, B2a-2 vorab gebaut);
Fixpaket: Zeile B2a-3 geteilt in B2a-3a/B2a-3b (Entscheidung Stefan), Reihenfolge; Akte F45, STATUS, ARCHITECTURE.md
§1 (`src/review-policy`). B2a bleibt offen bis B2a-3b gemergt ist.

## Advisor-Nachpass Plan v2 (13.10.2026, frischer Kontext)
Urteil **Freigegeben mit Hinweisen**, unter der Bedingung der Nachträge V1/V2 und einer Entscheidung zu V3: (V1)
Halt und Fehlschlag enden in KLAERUNG_ERFORDERLICH = Abnahme-Lage `vorab`; `renderReviewKachel` erscheint dort nie,
`renderAbnahmeBlick` zeigt nur status ok → Anzeige gehört in Blick (jeder Status) und `renderVorab`; Render-Nachweis
mit KLAERUNG_ERFORDERLICH. (V2) `check-f15-automat-real.mjs:999` (echtes Codex-Gateway, leere Befunde ohne Satz)
würde mit Regel 1k rot → Fixture bewusst anpassen, alle Gates mit echtem Gateway prüfen. (V3) Halt bei jedem
Vertragsverstoß erzwingt Neubau oder Ablehnung. Läuft mit: Reihenfolge 1b > 1i > 1k, Gate-Fall „keine Automatik“ mit
BEREIT ohne AK; B4-Heuristik trifft auch „nie gestartet“ → neutral „Review nicht gelaufen: …“; Grund bei FEHLGESCHLAGEN
nennt keine Ursache → `laufId` mitgeben; volle Liste der `review`-Durchreichung (Server Z. 2932/3291/6538,
Execution-Controller, Claude-Gateway inkl. Feldliste Z. 1213, Codex-Gateway); Dimension für DoD-/Checklisten-Befunde
nennen; `cd`-Zeile serverseitig mit vorhandenem `psArgument`; Attrappe spiegelt `eingaben.review` in die Laufakte,
Gegenprobe ohne `review`; echter Codex-Lauf (nullbare Enums, Satz) als offener Beleg in die Akte.

## Plan v2.1 (Nachträge vor dem Bau)
- **Entscheidung Stefan zu V3 (13.10.2026):** Regel 1k hält NUR bei „keine Befunde und der Satz fehlt“. Fehlende
  Pflichtwerte (id, dimension, evidenz, korrekturrichtung) und doppelte id zeigt die Abnahme als „Review-Vertrag
  unvollständig: …“, ohne Halt. `pruefeReviewErgebnis` liefert dafür getrennt `{ halt: [], hinweise: [] }`.
- **V1:** `reviewHinweise(urteil)` und der Status `fehlgeschlagen` erscheinen in `renderAbnahmeBlick` für jeden
  Urteilsstatus und in `renderVorab` (Lage `vorab` = KLAERUNG_ERFORDERLICH); `renderReviewKachel` zeigt die Hinweise
  zusätzlich bei ABGESCHLOSSEN. Render-Nachweis: Abnahme ABGESCHLOSSEN mit Hinweisen, KLAERUNG_ERFORDERLICH mit
  Regel-1k-Grund, Review fehlgeschlagen; 1440 und 390.
- **V2:** Fixture `check-f15-automat-real.mjs` bekommt den Satz in `empfehlung` (bewusste Anpassung, im Bericht
  genannt); alle Gates mit echtem Gateway und Review-Fixture per Grep geprüft und gleich behandelt.
- Projektion `fehlgeschlagen`: `grund` (Workflow) und `laufId` (falls vorhanden); geheilter Fall neutral als „Review
  nicht gelaufen“ (`status: 'nicht_gelaufen_klaerung'`).
- Policy nennt die Dimension für DoD-/Checklisten-Befunde (`prinzipien`) und die Reihenfolge: Regel 1b > 1i > 1k.
- Jarvis: der Server baut die `cd`-Zeile mit `psArgument` aus `public/leitstand/code-daten.js` und übergibt sie fertig.
- Gate-Attrappe spiegelt `eingaben.review` in die Laufakte; Gegenprobe ohne `review` → kein Halt.
