# F35 — Feature bauen aus Akte

## ID
F35

## Titel
Feature bauen aus Akte

## Status
Status: IN_ARBEIT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Aus `features/<id>/feature.md` eines Projekts entsteht per Klick
deterministisch ein Auftrag, der Ziel, Nicht-Ziele und Akzeptanzkriterien
(AK) strukturiert und als Snapshot trägt — ohne diese Kopplung erreicht die
Akzeptanzkriterien einer Feature-Akte nie den ausführenden Bau-Auftrag
(state/findings.md F-728), und die M5-Bestehensbedingung 2 (jedes AK trägt
ein Urteil im Review) bleibt unerfüllbar. Grundlage:
`docs/projekt/zielfassung.md` §13.6 E-M5-16 ("F35 schlank").

## Nicht-Ziele
- **qa-Schritt** (Urteil je AK zusätzlich durch eine `qa`-Rolle statt nur
  `code-reviewer`) — V1-Backlog, Auslöser: der Reviewer urteilt in F30
  ≥ 2× `ERFUELLT`, obwohl das Verhalten real falsch ist.
- **Schema für `architecture-advisor`** (strukturiertes Urteilsschema statt
  Prosa-Advisor-Pass) — V1-Backlog, Auslöser: das Advisor-Urteil wird in F30
  ≥ 2× falsch geparst.
- **Befund-Projektion** (Findings automatisch aus einem Review-Ergebnis in
  `state/findings.md` übernehmen, F22 AK5) — V1-Backlog, Auslöser: Stefan
  sucht Befunde in F30 ≥ 2× manuell zusammen.
- **AKs im Coach-Scope-Modus** (Sparring-Modus `feature`/`projekt` selbst
  strukturierte AK erzeugen lassen) — bleibt WS-1-Scope: die AK-Struktur
  entsteht ausschließlich deterministisch aus der bereits geschriebenen
  Akte, nicht als weiteres Coach-Ausgabeschema.
- **Reviewer-Schema und Urteil je AK** (WS-2) — eigener Workstream, nicht
  Teil von WS-1.
- **ADJUST-Automatik** (WS-3, automatisches
  `ANPASSUNG_ANGEFORDERT` aus Befunden) — eigener Workstream, Start bleibt
  in WS-1 unverändert `ZWINGEND`.
- **Schreiben in Feature-Akten** — WS-1 liest `feature.md` ausschließlich
  lesend; die Akte selbst bleibt nur über bestehende Wege (Architekt-
  Schritt, Mensch) editierbar.

## Workstreams
- **WS-1 — Feature bauen aus Akte (dieser Auftrag).** `POST
  /api/projekte/<projektId>/features/<featureId>/auftrag` leitet
  deterministisch einen Auftrag aus `features/<featureId>/feature.md` ab
  (`baueAuftragAusFeatureAkte`, `src/feature-auftrag/index.ts`) — Ziel,
  Nicht-Ziele und jedes Top-Level-Bullet unter `## Akzeptanzkriterien` als
  eigenes AK (explizite `AK<n>`-IDs übernommen, sonst nach Position
  vergeben). Das Auftragsschema (`schemas/kontrollzustand-auftrag-payload.
  schema.json`, `src/auftrag/`) trägt `akzeptanzkriterien`/`nicht_ziele`
  additiv und optional, `herkunft.art` zusätzlich `'feature_akte'` — hebt
  über `bestimmeEffektiveKontrolltiefe` (`src/router/index.ts`) die
  Kontrolltiefe-Untergrenze auf `standard` (fast-lane ausgeschlossen, hoch
  bleibt möglich), damit ein Feature-Bau nie ohne `code-reviewer`-Schritt
  läuft (state/findings.md F-729). Das Workboard bekommt in der
  Feature-Detailansicht einen "Bauen"-Knopf (nur solange der Status nicht
  `ABGESCHLOSSEN`/`ABGEBROCHEN` ist), der denselben Routen-/
  Fortschrittsbereich wie das bestehende Finding-Click-to-Work (F22 WS-2)
  nutzt.
- **WS-2 — Urteil je AK im Review.** Das Reviewer-Ausgabeschema trägt
  zusätzlich `ak_urteile` (je AK aus `akzeptanzkriterien` ein Urteil
  `ERFUELLT`/`NICHT_ERFUELLT`/`OHNE_BELEG`, mit Beleg). Neue Workflow-Regel:
  ein fehlendes oder nicht erfülltes AK, oder ein AK ohne Beleg, blockiert
  den Workflow (`BLOCKIERT`); eine erkannte Nicht-Ziel-Verletzung wird als
  Befund erfasst. Voraussetzung: WS-1s `akzeptanzkriterien`-Feld am
  Auftrag.
- **WS-3 — ADJUST-Automatik.** Löst nach E-M5-4 automatisch
  `ANPASSUNG_ANGEFORDERT` aus offenen Befunden aus (statt eines manuellen
  Korrekturauftrags) — der erste Schritt jeder Vorlage bleibt weiterhin
  `ZWINGEND` (Start ist kein Automatismus, nur die Korrekturschleife
  danach).

## Akzeptanzkriterien
- AK1 Die Akte F35 besteht `check-feature` und hält den Schnitt WS-1..3,
  die Nicht-Ziele und die Backlog-Auslöser fest.
- AK2 Das Auftragsschema und der Validator akzeptieren
  `akzeptanzkriterien`/`nicht_ziele`/`feature_akte` additiv; Alt-Aufträge
  bleiben gültig; `POST /api/auftraege` lehnt die neuen Felder ab.
- AK3 `baueAuftragAusFeatureAkte` ist deterministisch (gleiche Akte →
  identisches Ergebnis), übernimmt explizite AK-IDs, vergibt sonst
  Positions-IDs und lehnt eine Akte ohne Ziel/AK ab.
- AK4 Die Route liest die Akte aus der repoWurzel des Projekts, validiert
  die featureId und registriert über den bestehenden Pfad.
- AK5 Mit `herkunft feature_akte` wird nie fast-lane gewählt.
- AK6 Der Workboard-Button "Bauen" legt den Auftrag an und routet ihn; die
  Akte bleibt unverändert.
- AK7 Das Gate belegt die Grün- und Rot-Fälle am realen Handler gegen ein
  Fremdprojekt.
- AK8 `npm run check` ist grün.

## Dependencies
- F11 (Auftrag-Modul) — `registriereAuftrag`/`validiereAuftragDaten`, die
  WS-1 additiv um `akzeptanzkriterien`/`nicht_ziele` erweitert.
- F21 (Workboard) — Feature-Akten-Parsing (`src/workboard/features.ts`) und
  die Detailansicht, die WS-1 um den "Bauen"-Knopf ergänzt.
- F22 (Click-to-Work) — der Routen-/Fortschrittsbereich
  (`#workboard-bearbeitung`), den WS-1 für Feature-Akten wiederverwendet.
- F39 WS-2a (Herkunft-Untergrenze) — `bestimmeEffektiveKontrolltiefe`, das
  WS-1 additiv um `herkunft.art: 'feature_akte'` erweitert (Muster
  `projekt_interview`).
- F41 (Projekt-Harness) — E-F41-2 (Workforce-Assets aus der
  Installationswurzel, Projektinhalte aus der repoWurzel), dessen Muster
  WS-1s Route für `features/<id>/feature.md` übernimmt.

## Bekannte Grenzen
- **Fehler-Panel ohne "Wiederholen" vor Auftragserzeugung (QA-Pass-Befund,
  frischer Kontext, 25.09.2026, bereits vorbestehendes F22-WS-2-Verhalten,
  hier nur sichtbarer):** Scheitert "Bauen" mit 400/404/422/500, BEVOR ein
  Auftrag existiert (`zustand.auftragId` bleibt `null`), zeigt
  `renderBearbeitungsInhalt`s `fehler`-Zweig (`public/leitstand/views/
  workboard.js`) bewusst KEINEN "Wiederholen"-Knopf (Muster für Findings
  seit dem QA-Pass vom 14.09.2026: ein erneuter Klick auf dem alten
  `bearbeitungsZustand` hätte sonst einen zweiten Auftrag angelegt). Bleibt
  das Detail-Panel offen (kein Wechsel zu einem anderen Workitem und
  zurück), bleibt die Fehlermeldung stehen — ein Nutzer, der z. B. nach
  einem 422 (defekte Akte) die Akte andernorts korrigiert und ins selbe
  Panel zurückkehrt, sieht keinen erneuten "Bauen"-Knopf. Workaround:
  Detail-Panel schließen und erneut öffnen, oder Seite neu laden. Eine
  saubere Lösung träfe den gemeinsamen F22-WS-2-Zustandsautomaten (auch für
  Findings) und ist bewusst außerhalb dieses WS-1-Zuschnitts.
- **Kein Vorschau-Schritt vor "Bauen" (QA-Pass-Befund, bewusst kein Scope):**
  Die Feature-Detailansicht zeigt vor dem Klick weder die Anzahl noch den
  Inhalt der geparsten Akzeptanzkriterien — Parsing-Eigenheiten (z. B. ein
  Bullet, der zufällig mit `AK<Ziffer>` beginnt und dadurch als explizite ID
  statt als Fließtext gelesen wird, spezifikationsgemäß laut AK3) werden
  erst nach der Auftragserzeugung sichtbar, wenn überhaupt.
