# F29 — Design des Leitstands

## ID
F29

## Titel
Design des Leitstands (dunkle Farbwelt, Tokenschicht, Komponenten-Klassenvokabular, neue Shell, Startfläche, alle neun Views)

## Status
Status: WORKSTREAM_SCHNITT_GENEHMIGT

Gültige Status-Werte (geprüft vom Gate): ENTWURF, READY_FOR_TECH, WORKSTREAM_SCHNITT_GENEHMIGT, IN_ARBEIT, FEATURE_GATE, ABGESCHLOSSEN, BLOCKIERT, ABGEBROCHEN.

## Ziel
Der Leitstand bekommt eine durchgehende visuelle Produktisierung: eine dunkle
Farbwelt, eine Tokenschicht über Farbe hinaus (Typografie, Abstände, Radien,
Schatten, Motion-Grundwerte), ein wiederverwendbares Komponenten-
Klassenvokabular, eine neue Shell, eine Startfläche und alle neun bestehenden
Views auf dieses Vokabular umgestellt. Reines Oberflächen-Feature — die
Fachlogik hinter jeder View bleibt unverändert.

## Nicht-Ziele
- Neue Fachfunktionalität oder Backend-Endpunkte. F29 ändert Darstellung,
  nicht Verhalten.
- Änderung an der Persona-Mechanik (F28, `ABGESCHLOSSEN`). Die Persona bleibt
  fachlich unverändert; sie bekommt höchstens abgeleitete Token-Werte, falls
  die neue Farbwelt das verlangt — kein neuer Zustand, kein neuer Poll.
- Mehrbenutzerfähige Theming-Auswahl (z. B. Hell/Dunkel-Umschalter für die
  übrige Shell). F29 legt sich auf eine dunkle Farbwelt fest, kein Theme-
  System mit mehreren gleichwertigen Varianten.
- Automatisiertes visuelles Regressions-Gate über alle neun Views hinweg.
  `playwright-mcp` (WS-1b) liefert die Grundlage für punktuelle,
  referenzgeprüfte Nachweise — kein vollständiges Screenshot-Diff-System als
  Fassung-1-Scope.

## Capability-Bedarf
F29 ist der erste Auftrag, der die drei bisher `OFFEN` geführten Design-
Capabilities im Ressourcenregister real benötigt (löst `state/findings.md`
F-440 — die Capabilities hatten bislang keinen Weg zu einer echten Gap, weil
keine Rolle/kein Feature sie einforderte):

- **UI_UX_DESIGN** (`frontend-design`) — Tokenschicht und
  Komponenten-Klassenvokabular sind Systementscheidungen (Farbsystem,
  Typografie-Skala, Abstandsraster, Konsistenzregeln über neun Views
  hinweg), keine View-für-View-Ad-hoc-Entscheidung. Ohne diese Capability
  entstünde bei jeder View eine neue, unabgestimmte Stilentscheidung.
- **UI_ANIMATION** (`animate-skill`) — WS-1a (Motion-Grundwerte) und WS-3
  (interaktive Elemente: Hover, Fokus, Übergänge) brauchen begründete
  Timing-/Easing-Regeln und einen dokumentierten `prefers-reduced-motion`-
  Fallback statt geschätzter Werte — F28 hat mit `--persona-*`-Timings
  bereits gezeigt, dass geschätzte Werte ein eigenes Risiko sind (siehe
  `features/F28/feature.md`, Risiken).
- **UI_VISUAL_TESTING** (`playwright-mcp`) — neun Views plus neue Shell
  lassen sich nicht zuverlässig allein durch Code-Lesen gegen eine
  Design-Referenz prüfen. F28 WS-2 musste den echten Browser-Blick mangels
  Browser-Automatisierung auf Stefans manuellen Durchklick verschieben
  (siehe `features/F28/feature.md`, Feature Review) — für neun Views ist das
  kein tragfähiger Regelfall mehr.

## Workstreams
- **WS-0 — Capability-Freigabe.** `playwright-mcp`, `frontend-design`,
  `animate-skill` im Ressourcenregister von `OFFEN` auf verfügbar bringen,
  damit WS-1a–WS-3 sie nutzen dürfen. **Status dieses Schnitts: BLOCKIERT**
  — siehe Bekannte Grenzen.
- **WS-1a — Fundament und Shell.** Tokenschicht im `:root`-Block (Farbe,
  Typografie, Abstände, Radien, Schatten, Motion-Grundwerte), neue Shell
  (Navigation, Kopfzeile, Layout-Grundgerüst), Startfläche.
- **WS-1b — Referenz-View und Gate.** Eine erste View vollständig auf das
  neue Vokabular umgestellt als Referenz, plus ein neues, an
  `scripts/check-f28-persona.mjs` angelehntes Gate (Farbliteral-/
  Tokenkonformität), BEVOR die übrigen acht Views folgen — verhindert, dass
  ein Vokabular-Fehler sich achtmal wiederholt.
- **WS-2 — restliche Views.** Die verbleibenden acht Views auf das in WS-1b
  bewährte Vokabular umgestellt.
- **WS-3 — interaktive Elemente.** Hover-, Fokus- und Übergangszustände für
  interaktive Komponenten (Buttons, Karten, Tabs, Formulare), Motion nach
  dem in UI_ANIMATION begründeten Regelwerk, reduced-motion-Fallback
  durchgehend.

## Akzeptanzkriterien
Werden je Workstream zu dessen Start konkretisiert (Muster F28: AK-Nummern
je WS, kalibriertes Gate, Feature Review vor Abschluss). Für diesen Schnitt
verbindlich:
- AK0 `ressourcen.json`: `playwright-mcp`, `frontend-design`,
  `animate-skill` sind entweder freigegeben (WS-0 real abgeschlossen) oder
  der Blocker aus WS-0 ist in dieser Akte benannt, bevor WS-1a beginnt —
  kein Workstream, der eine dieser Capabilities braucht, startet auf
  Zuruf ohne aufgelöste Verfügbarkeit.

## Dependencies
- F27 — Resource Scout, dessen Rolle `scout` und Werkzeugsatz
  `recherchierend` die drei Design-Kandidaten ursprünglich in
  `ressourcen.json` eingetragen haben.
- F28 — Persona v1 (`ABGESCHLOSSEN`), dessen Tokens (`--persona-*`) und
  „dunkle Insel“-Entscheidung der Ausgangspunkt für F29s Farbwelt sind —
  die Persona bleibt fachlich unverändert (siehe Nicht-Ziele).
- F19 — Capability Foundation, deren Register (`ressourcen.json`,
  `schemas/ressourcen.schema.json`, `src/ressourcen/index.ts`) WS-0 nutzt
  und dessen R2-Regel den aktuellen WS-0-Blocker auslöst.

## Betroffene Primitive
`ressourcen.json` (WS-0), `:root`-Block `public/leitstand/style.css`
(WS-1a), Shell-Markup (WS-1a), alle neun View-Module unter
`public/leitstand/views/` (WS-1b, WS-2), interaktive Komponentenklassen
(WS-3).

## Risiken
Die drei Design-Capabilities sind bislang nie real genutzt worden (F-440) —
Zeitaufwand und Passgenauigkeit von `frontend-design`/`animate-skill`/
`playwright-mcp` für dieses Projekt sind unbelegt, bis WS-1a sie zum ersten
Mal einsetzt. `animate-skill` ist inhaltlich auf Next.js/React + Framer
Motion zugeschnitten (siehe Bekannte Grenzen) — der Leitstand ist reines
Vanilla-JS/CSS; die Easing-/Timing-Werte sind stackunabhängig übertragbar,
die Code-Beispiele (`.tsx`, Framer-Motion-API) sind es nicht.

## Bekannte Grenzen
- **WS-0-Blocker (dieser Auftrag, 18.09.2026):** `schemas/
  ressourcen.schema.json` (R2) und `src/ressourcen/index.ts`
  (`validiereRessourcenDaten`) verbieten `freigabe: "FREIGEGEBEN"` bei
  `typ: "extern"` ausdrücklich — Begründung im Schema: „Registrierung
  erzeugt keine Verfügbarkeit". `scripts/check-f19-ressourcen.mjs` prüft
  das zusätzlich als eigene Regression (Regel 5). Das im Auftrag verlangte
  Setzen von `freigabe: "FREIGEGEBEN"` für `playwright-mcp`,
  `frontend-design` und `animate-skill` hätte `npm run check` rot gemacht
  und wurde deshalb **nicht** ausgeführt — die drei Einträge stehen
  weiterhin auf `OFFEN`. Die Capabilities sind über diese Akte jetzt real
  angefordert (löst die „kein Weg zu einer echten Gap"-Hälfte von F-440),
  aber der Weg von `OFFEN` zu tatsächlich nutzbar ist architektonisch noch
  nicht entschieden (Installation durch Stefan mit Wechsel auf `typ:
  "skill"`/`"worker"`? Eine bewusste, dokumentierte R2-Ausnahme für
  vorab-geprüfte externe Kandidaten? — offene Frage, Advisor-Pass vor jeder
  Umsetzung fällig, CLAUDE.md „Entscheidungsregel bei Unsicherheit" Punkt 5).
- `animate-skill` (github.com/delphi-ai/animate-skill) wurde vor diesem
  Eintrag inhaltlich gelesen (SKILL.md, vier Referenzdateien, README,
  Beispiel-Dateiliste): keine Anweisungen, die bestehenden Harness-Regeln
  widersprechen (kein Prompt-Injection-Versuch, keine destruktiven/
  autonomen Anweisungen) — reine Animations-Referenz für Next.js/React/
  Framer Motion.

## Feature Review
Noch nicht fällig — kein Workstream ist `IN_ARBEIT`.
