# F39 WS-3b — Ablaufanleitung für den realen Reallauf (Vorbereitung, WS-3a)

**Dies ist eine Ablaufanleitung, kein Nachweis eines bereits gelaufenen Durchgangs.**
WS-3a bereitet nur vor (dieses Dokument); WS-3b führt den realen Durchlauf
gegen den echten Leitstand durch und ergänzt hier die tatsächlichen
Beobachtungen (Muster `features/F34/nachweis-ws3.md`). Kein Schritt unten
wurde von diesem Auftrag selbst ausgeführt.

## ⚠️ Sicherheitshinweis — vor jedem Schritt lesen

**Der bestehende Nachweis-Auftrag `1b3412a8-88be-45e0-b97d-46e6cc5ba396`
(aus `features/F34/nachweis-ws3.md`, Teil b) darf NIEMALS geroutet oder
gestartet werden.** Er trägt eine mit "Neues Projekt anlegen" (E-M5-14,
Feature `F41`) kollidierende Feature-ID (F-618). Für diesen Reallauf wird
ein **neuer, eigener** Auftrag über ein neues Sparring-Interview angelegt —
niemals der alte wiederverwendet.

## Voraussetzungen

- `npm run leitstand` läuft (Port 4173, `http://127.0.0.1:4173`), gegen
  dieses Repo (`kontrollzustand/` dieses Repos, keine Wegwerf-Kopie —
  Muster F34 WS-3).
- Ein echtes, kleines, im Repo begründbares Thema für das Projekt-Interview
  ist gewählt (Muster F34 WS-3: eine reale, kleine Erweiterung, kein
  Fantasie-Thema).
- Codex CLI ist in der ausführenden Umgebung angemeldet (`schritt-1-architekt`
  und `schritt-4-review` laufen auf Worker `codex`/`gpt-6-astra`, siehe
  `workflow-vorlagen/hoch.json`) — ist Codex nicht verfügbar, weicht der
  reale Worker ab (Muster F34 WS-3, dort `claude-code`-Rückfall bei Router-
  Läufen); das ist dann explizit zu protokollieren, kein Abbruchgrund.

## Ablauf

Pro Schritt: was Stefan klickt, was real erwartet wird, was zu
protokollieren ist. Ein `## <Beobachtung>`-Unterabschnitt wird in WS-3b
unter jedem Schritt ergänzt.

### 0. Vor jedem Reallauf (löst F-636/F-644, Lehren aus Versuch 1/2)

**Warum:** Versuch 2 (23.09.2026) zeigte real zwei vermeidbare Lücken — (1)
unklar, gegen welche Startvorlage/welchen Code-Stand die laufende
Leitstand-Instanz tatsächlich läuft (F-636), (2) ein Testauftrag im
Projektmodus deckt den `ausfuehrung`-Schritt mit echtem Produktcode nie ab,
weil `baueAuftragAusProjektentwurf` (`src/product-coach/index.ts:700`)
Projekt-Erweiterungen strukturell auf „nur Dokumentation" festlegt (F-644).
Seit E-F39-1=B (F-643) gilt zusätzlich: ein schreibender Schritt startet nur
auf einem Branch ≠ `main`/`master` mit sauberem Arbeitsbaum.

1. **Laufende Leitstand-Instanz beenden.** `kontrollzustand/.leitstand.lock`
   prüfen (PID/Port), den Prozess beenden — eine alte Instanz könnte gegen
   eine veraltete Startvorlage oder einen alten Code-Stand laufen.
2. **`LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json` setzen**,
   dann `npm run leitstand` neu starten — stellt sicher, dass Codex
   (`worker.codex`-Block) real verfügbar ist, statt sich auf den
   `projekte.json`-Default zu verlassen.
3. **Einen Arbeits-Branch anlegen** (`git switch -c <name>` gegen `main`,
   NICHT auf `main` bleiben) — Vorbedingung für jeden schreibenden Schritt
   seit E-F39-1=B (F-643); ohne Branch lehnt `schritt-3-ausfuehrung` mit
   „Ausführung gesperrt: du bist auf main" ab.
4. **Einen Auftrag für einen Code-Test im FEATUREmodus anlegen — NICHT im
   Projektmodus** (Coach-Hauptmodus **Sparring**, Untermodus **Feature**,
   nicht **Projekt**), wenn geprüft werden soll, ob `ausfuehrung` echten
   Produktcode schreibt: der Projektmodus-Auftragstext verbietet das
   strukturell (F-644). Der Projektmodus bleibt weiterhin der richtige Weg,
   um die `hoch`-Kontrolltiefe-Untergrenze selbst zu testen (Schritt 1-4
   unten) — für den `ausfuehrung`-Prüfpunkt (Schritt 8) braucht es einen
   ZWEITEN, featuremodus-basierten Testauftrag.

### 1. Sparring-Interview bis `projekt_entwurf`

**Klick:** `#/chat` öffnen, Hauptmodus **Sparring**, Untermodus **Projekt**
wählen, das gewählte Thema in mehreren Turns durchsprechen (Muster
`features/F34/nachweis-ws3.md` Teil a, dort 2 Turns bis zur Konvergenz).

**Erwartet:** Der Coach liefert nach einigen Turns `art: 'projekt_entwurf'`
mit vollständigem Entwurf (Vision/Zielgruppe/Ziele/Scope/Meilensteine/
Features/Capability-Bedarf/Architektur-Hinweise/offene Fragen), Feature-/
Meilenstein-IDs real und kollisionsfrei vergeben (`vergebeFeatureIds` gegen
den aktuellen `docs/projekt/roadmap.json`-Bestand).

**Protokollieren:** Anzahl Turns bis zur Konvergenz, je Turn `art`/
`dauer_ms`/`turns` (intern)/`output_tokens`, vergebene Meilenstein-/
Feature-IDs, Capability-Bedarf-Tabelle (Bedarf/Ressource-ID/Status, keine
erfundene `ressource_id`).

### 2. „Als Auftrag anlegen" klicken

**Klick:** Am `projekt_entwurf`-Eintrag im Chat-Verlauf auf **„Als Auftrag
anlegen"**, Titel/Auftragstext im Dialog prüfen (ggf. anpassen), **Anlegen**
bestätigen.

**Erwartet:** `POST /api/auftraege` liefert `201` mit `auftragId`;
`herkunft: { art: 'projekt_interview' }` wird automatisch mitgesendet
(`leseAuftragKandidat`, `views/chat.js`) — **kein** automatisches
Routen/Starten (Auftrag-Wortlaut, F34 WS-2).

**Erweiterung F-631 (`state/findings.md`):** derselbe Klick löst zusätzlich,
best-effort und fire-and-forget, `POST /api/sparring/<laufId>/auftrag`
(`verknuepfeSparringAuftrag`) aus — dieser Endpunkt prüft laut F-631 NUR die
Form (`auftragId` nicht-leerer String), NICHT, ob `laufId` real ein
bestehender Sparring-Turn und `auftragId` real ein bestehender Auftrag ist.
In diesem realen Lauf sind beide IDs immer real (der Turn stammt aus
Schritt 1, der Auftrag wurde gerade in diesem Schritt angelegt) — die Lücke
bleibt hier folgenlos. Trotzdem protokollieren: ob der Rückverweis (im
Sparring-Verlauf erscheint danach ein „bereits angelegt"-Hinweis am Turn,
`renderAuftragBruecke`) tatsächlich sichtbar wird, und ob die Browser-
Konsole einen Fehler zu diesem Aufruf zeigt (ein Fehler hier wäre der
erste reale Beleg dafür, dass F-631 im Normalbetrieb doch relevant wird —
dann F-631s Priorität in `state/findings.md` neu bewerten).

**Protokollieren:** `auftragId`, Titel (inkl. eines etwaigen F-611/F-612-
artigen Kosmetikbefunds, siehe `features/F34/nachweis-ws3.md`), ob der
Rückverweis-Hinweis erschien.

### 3. Auftrag routen

**Bekannte UI-Lücke (kein neues Finding, nur hier vermerkt):** Ein über die
Chat-Brücke angelegter Auftrag bekommt im Leitstand KEINEN eigenen
„Routen"-Knopf — `routeAuftrag()` (`public/leitstand/api.js`) wird in der
UI ausschließlich aus `views/workboard.js` (Finding-Bearbeitung) und
`views/capabilities.js` (Capability-Gap) ausgelöst, beide für einen anderen
Auftrags-Ursprung gebaut. Für diesen Reallauf ruft Stefan den Endpunkt
deshalb direkt auf (Browser-DevTools-Konsole auf `http://127.0.0.1:4173`,
Herkunft-Header damit korrekt):

```js
fetch(`/api/auftraege/${AUFTRAG_ID}/routen`, { method: 'POST' }).then((r) => r.json()).then(console.log)
```

**Erwartet:** `202` (Router-Lauf gestartet, Worker `codex`/`gpt-6-astra`
oder `claude-code`-Rückfall — Muster `features/F34/nachweis-ws3.md`, dort
Codex nicht verfügbar). Nach Laufende (`verarbeiteRouterErgebnis`) entsteht
asynchron ein neuer Workflow — **entscheidend für F39**: wegen
`herkunft.art === 'projekt_interview'` MUSS `bestimmeEffektiveKontrolltiefe`
die Kontrolltiefe deterministisch auf mindestens `hoch` anheben, selbst wenn
der Router selbst z. B. `standard` vorschlägt (AK9, `src/router/index.ts`).

**Protokollieren:** `GET /api/workflows/<workflowId>` prüfen — `ziel` MUSS
den Vermerk `[Untergrenze hoch wegen herkunft projekt_interview]` tragen
(außer der Router hat ohnehin schon `hoch` vorgeschlagen — dann fehlt der
Vermerk zu Recht, das ist zu unterscheiden); `schritte[].rolle` MUSS mit
`architekt` beginnen (Beleg: die vier Schritte aus `workflow-vorlagen/
hoch.json`, nicht `standard.json`/`fast-lane.json`). Router-Laufdauer/-
Kosten (Verbrauch-Ansicht, Dashboard, siehe unten).

### 4. Workflow öffnen

**Klick:** `#/workflows/<workflowId>` öffnen (Link aus der Workflow-Liste
oder direkt navigieren).

**Erwartet:** Vier Schritte sichtbar (`architekt` → `architecture-advisor`
→ `ausfuehrung` → `code-reviewer`), Status `WARTET_FREIGABE`, aktiver
Schritt `schritt-1-architekt` — ZWINGEND-Schritte starten nie automatisch
(`freigabe: "ZWINGEND"` an allen drei ersten Schritten von `hoch.json`).

### 5. Schritt 1 (`architekt`) freigeben

**Klick:** **„Freigeben"** auf `schritt-1-architekt`.

**Erwartet:** Lauf startet real (Worker `codex`, Modell `gpt-6-astra`,
`--output-schema` gegen `schemas/ergebnis-architektur.schema.json`,
`ausschlussmuster: ['src/**']` — der Architekt liest keinen Code). Nach
Laufende: `ERFOLGREICH` mit strukturiertem `ergebnis-architektur`-JSON,
oder `FEHLGESCHLAGEN` (`ergebnis_nicht_schemakonform`), falls das Modell
kein valides JSON-Objekt lieferte (F39 WS-2a, „Entschieden").

**Protokollieren:**
- Lauf-ID, Dauer (`verbrauch.dauer_ms` aus der Laufakte oder Laufdetail-
  Ansicht), Kosten laut **Verbrauch-Ansicht** (Dashboard → Karte
  „Verbrauch", Zeitraum passend wählen, Summe nach Rolle `architekt` und
  Modell `gpt-6-astra` ablesen).
- **Qualität des Architektur-Ergebnisses** (der eigentliche Prüfpunkt
  dieses Reallaufs): `zusammenfassung` inhaltlich zutreffend?
  `module[]`/`adr_entwuerfe[]`/`schema_entwuerfe[]` — Anzahl und ob sie zum
  realen Thema passen (keine Vorratsarchitektur, CLAUDE.md-
  Entscheidungsregel 4); `evidenz[]` — jeder Eintrag mit plausiblem Marker
  (`[Fakt]`/`[Schlussfolgerung]`/`[Annahme]`/`[offene Unsicherheit]`);
  `capabilities_bedarf[]` — jede `ressource_id` real (kein `null`/`fehlt`
  ohne Grund); `entscheidungen_mensch[]` — Anzahl und ob die Fragen
  tatsächlich entscheidungsreif sind (Optionen mit echten Vor-/Nachteilen,
  keine Scheinfrage).

### 6. Ggf. Architektur-Entscheidung eintragen

**Nur nötig, wenn `entscheidungen_mensch[]` (Schritt 5) nicht leer war** —
Regel 1c hält dann mit `KLAERUNG_ERFORDERLICH` auf `schritt-1-architekt`
an, das Workflow-Detail zeigt das Feld `architekturEntscheidung` (Fragen
mit Optionen, Vor-/Nachteile, Empfehlung des Architekten hervorgehoben).

**Klick:** Je Frage eine Options-Radio-Auswahl treffen (optional eigene
Begründung eintragen), **„Entscheidung speichern"**.

**Erwartet:** `POST /api/workflows/<id>/entscheidung` liefert `202` mit
`status: 'WARTET_FREIGABE'` — der Folgeschritt (`schritt-2-architektur`,
ZWINGEND) ist jetzt freigabebereit, kein Auto-Start.

**War `entscheidungen_mensch[]` leer:** dieser Schritt entfällt, der
Workflow steht nach Schritt 5 bereits direkt auf `WARTET_FREIGABE` für
`schritt-2-architektur`.

**Protokollieren:** Anzahl Fragen, je Frage die gewählte Option, ob sie mit
der Empfehlung des Architekten übereinstimmt oder Stefan bewusst abweicht
(und warum — Entscheidungsregel 5, nicht stillschweigend).

### 7. Advisor (`schritt-2-architektur`) freigeben

**Klick:** **„Freigeben"** auf `schritt-2-architektur`.

**Erwartet:** Lauf startet (Worker `claude-code`, Modell `claude-sonnet-5`,
`output_schema: null` — Prosa-Urteil). Eingaben: der Auftrag, das
Architektur-Ergebnis (`ergebnis-@schritt-1-architekt`) UND eine ggf.
erfasste Entscheidung (`entscheidung-@schritt-1-architekt`, leerer
Hinweistext, falls Schritt 6 entfiel).

**Protokollieren:** Lauf-ID, Dauer, Kosten (wie Schritt 5, Rolle
`architecture-advisor`/Modell `claude-sonnet-5`), Kernaussagen des
Advisor-Urteils — bestätigt er den Architektur-Entwurf, oder weicht er an
einer Stelle ab (welcher)?

### 8. Ausführung (`schritt-3-ausfuehrung`) freigeben

**Klick:** **„Freigeben"** auf `schritt-3-ausfuehrung`.

**Erwartet:** Lauf startet (Worker `claude-code`, schreibender
Werkzeugsatz, Modell `claude-sonnet-5`). Der Auftragstext dieses Schritts
trägt seit F39 WS-3a (Punkt 2, löst `state/findings.md` F-635 zusammen mit
Punkt 1) zusätzlich den Umsetzungs-Zusatzblock
(`baueUmsetzungsInstruktion`, `src/architekt/index.ts`) — real angehängt,
weil `schritt-3-ausfuehrung.eingaben` eine `ergebnis-@schritt-1-architekt`-
Referenz trägt (`workflow-vorlagen/hoch.json`).

**Protokollieren — der zweite Kernprüfpunkt dieses Reallaufs:**
- Für jeden `adr_entwuerfe[]`-Eintrag: wurde real
  `docs/adr/<slug>.md` nach `docs/adr/TEMPLATE.md` angelegt, mit
  fortlaufender ADR-Nummer? Enthält er bei einer erfassten menschlichen
  Entscheidung (Schritt 6) einen Abschnitt „Entscheidung (Mensch)"?
- Für jeden `schema_entwuerfe[]`-Eintrag: wurden real
  `schemas/<name>.schema.json` UND `schemas/examples/<name>.json`
  angelegt, und wurde die Prüfung real in das zuständige Gate eingehängt?
- Für `module[]`/ein neues Datenmodell: wurden NUR die tatsächlich
  gelieferten optionalen Abschnitte (siehe `scripts/check-feature.mjs`,
  F39 WS-3a Punkt 3) in der betroffenen `features/<id>/feature.md`
  ergänzt — nicht leer (`pruefeOptionaleAbschnitte`,
  `src/workboard/feature-abschnitte.ts`)?
- Widerspricht die Umsetzung irgendwo dem Architektur-Entwurf — UND ist das
  vermerkt (Auftrags-Vorgabe „keine Umsetzung, die widerspricht, ohne
  Vermerk")?
- Lauf-ID, Dauer, Kosten (Rolle `ausfuehrung`/Modell `claude-sonnet-5`).

### 9. Review (`schritt-4-review`) — kein Klick nötig

**Erwartet:** Startet automatisch nach `schritt-3-ausfuehrung`
(`freigabe: "AUTOMATISCH"`), Worker `codex`, `output_schema:
'ergebnis-code-reviewer'`, prüft den echten Diff
(`aenderungsuebersicht-@schritt-3-ausfuehrung`).

**Protokollieren:** `urteil`/`befunde`/`empfehlung`, Lauf-ID, Dauer, Kosten
(Rolle `code-reviewer`/Modell `gpt-6-astra`).

## Abschluss und Gesamtprotokoll (in WS-3b zu ergänzen)

- Workflow-Endstatus (`ABGESCHLOSSEN` oder `KLAERUNG_ERFORDERLICH` bei
  einem Review-Befund — dann reguläre Klärung durch Stefan, kein F39-
  spezifischer Sonderfall).
- Tabelle aller vier Lauf-IDs mit Rolle/Worker/Modell/Dauer/Kosten.
- Gesamtkosten laut Verbrauch-Ansicht (Dashboard, Zeitraum „heute" oder
  passend eingegrenzt auf den Zeitraum dieses Laufs).
- `npm run check` MUSS nach Schritt 8 grün bleiben (neue ADR-/Schema-/
  Feature.md-Dateien real geprüft, inkl. `scripts/check-feature.mjs`
  Punkt 3 und einer etwaigen neuen Gate-Einhängung für ein neues Schema).
- Gesamteinschätzung der Architekt-Qualität (Schritt 5) als Grundlage für
  die WS-3b-Abnahmeentscheidung — trägt der reale Architektur-Entwurf
  tatsächlich zu einem besseren Baudurchgang bei, oder ist er nur
  zusätzlicher Ballast?

## Nicht Teil dieses Auftrags (WS-3a)

- Der reale Durchlauf selbst — dieses Dokument ist die Anleitung, nicht der
  Nachweis (WS-3b).
- Jede Änderung an Auftrag `1b3412a8-88be-45e0-b97d-46e6cc5ba396` (siehe
  Sicherheitshinweis oben).
- Ein neuer UI-Knopf für „Auftrag routen" außerhalb von Findings/
  Capability-Gaps (Schritt 3 dokumentiert die Lücke, behebt sie nicht —
  außerhalb des Auftrags-Scopes).
