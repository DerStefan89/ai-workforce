# Nachweis WS-1 — Product Coach Sparring (F34)

Realer Nachweis (AK6): ein Sparring-Gespräch mit drei Turns gegen dieses
Repo (`node scripts/leitstand-server.mjs`, `127.0.0.1:4173`), ausgelöst über
`POST /api/sparring`, projiziert über `GET /api/sparring`. Thema frei
gewählt (Vorschlag aus dem Auftrag): "Design-Phase vor F30 schneiden".
Worker in dieser Umgebung durchgehend `claude-code` (`codex` nicht
verfügbar — dieselbe Worker-Auflösung wie `jarvis`, kein neuer Mechanismus,
siehe `feature.md` "Bekannte Grenzen").

Latenz/Worker aus dem real geschriebenen `laufakte.verbrauch`-Feld
(`kontrollzustand/lineage-laufakte-product-coach-<auftragId>/checkpoints/`).

| Turn | Nachricht (gekürzt) | `art` | Worker | `dauer_ms` | Turns (intern) | Start (UTC) |
|---|---|---|---|---|---|---|
| 1 | "Ich will die Design-Phase vor F30 schneiden. Wie sollten wir das angehen?" | `frage` | claude-code | 88734 | 16 | 2026-09-22T11:11:32Z |
| 2 | "Mit schneiden meine ich (a): WS-3 … direkt in F30 hineinziehen … Zeitdruck …" | `frage` | claude-code | 60279 | 8 | 2026-09-22T11:13:39Z |
| 3 | "… VOR dem Start der Drei-Tage-Uhr fertig … Bitte mach mir jetzt einen Scope-Entwurf …" | `scope_entwurf` | claude-code | 67128 | 8 | 2026-09-22T11:14:57Z |

Durchschnittliche Latenz: ~72 s je Turn (Spanne 60,3–88,7 s) — Turn 1 am
langsamsten, weil er zusätzlich den Projektkontext (Beschreibung,
Anweisungen, Roadmap, Lagebild) zum ersten Mal in dieser Kette einliest.

## Turn 1 — `frage`

> "Design-Phase vor F30" ist hier kein loser Begriff, sondern eine
> dokumentierte Entscheidung (E-M5-2, 20.09.2026): M5-Bau → Design
> fertigstellen → F30 (Dogfooding) als Abschluss. Konkret hängt daran schon
> mindestens ein bewusst zurückgestelltes Stück Arbeit: F29 WS-3 —
> Hover-/Fokus-/Motion-Zustände für interaktive Elemente, laut
> `features/F29/feature.md` ausdrücklich "zurückgestellt in die Phase
> 'Design fertigstellen' nach M5". "Schneiden" kann daher zwei ganz
> unterschiedliche Dinge heißen: (a) die Phase als eigenen Schritt auflösen
> und ihren Inhalt … direkt in F30 mit hineinziehen, oder (b) diesen Inhalt
> fallen lassen … Welches der beiden meinst du — und was treibt das:
> Zeitdruck vor F30, oder die Einschätzung, dass WS-3 für den
> Dogfooding-Zweck keinen Mehrwert bringt?

Real belegt: der Coach hat NICHT zugestimmt, sondern eine reale, im Repo
dokumentierte Entscheidung (E-M5-2) benannt und genau eine Rückfrage
gestellt (Rolleninstruktion "höchstens eine Rückfrage je Turn" eingehalten).

## Turn 2 — `frage`

> Das ist nicht nur eine Umpriorisierung, sondern rührt an zwei
> dokumentierten Entscheidungen: E-M5-1 (20.09.2026) hat den F30-Umfang
> bereits explizit festgelegt … und WS-3 … steht NICHT auf dieser Liste.
> E-M5-2 … hat zusätzlich bewusst die Reihenfolge … als getrennte Phasen
> festgelegt, gerade damit Design-Nacharbeit nicht mit der
> Dogfooding-Messung vermischt wird. … Soll WS-3 … VOR dem Start der
> Drei-Tage-Dogfooding-Uhr fertig gebaut und gemergt sein … — oder soll
> dieser Bau PARALLEL zu den laufenden Dogfooding-Tagen passieren …?

Real belegt: der Coach hinterfragt weiter, statt die erste Antwort des
Menschen unkritisch zu akzeptieren — genau die "Annahmen hinterfragen"-
Instruktion.

## Turn 3 — `scope_entwurf`

Titel: **"Design-Phase vor F30 (WS-3-Nachzug + Roadmap-Karten-Politur)"**

- **Problem:** E-M5-1 hat den F30-Umfang festgelegt, E-M5-2 hat "Design
  fertigstellen" als eigene Phase VOR F30 verankert. Zwei Stücke Arbeit
  sind bewusst in genau diese Phase verschoben, aber noch nicht gebaut:
  F29 WS-3 und `state/findings.md` F-596.
- **Ziel:** F29 WS-3 und F-596 sind gebaut, verifiziert und nach main
  gemergt, BEVOR die Drei-Tage-Dogfooding-Uhr (F30) startet.
- **In Scope:** F29 WS-3 (Hover-/Fokus-/Motion-Zustände über alle Views),
  F-596 (Roadmap-Karte optisch), manuelle Browser-Verifikation.
- **Out of Scope:** der in E-M5-1 festgelegte F30-Inhalt selbst, alle
  anderen offenen F30/F32/F33/F23-Restfindings ohne Design-Phase-Verweis
  (F-593, F-594, F-597, F-599, F-600, F-601, F-602, F-378, F-389, F-392),
  Aktivierung der drei Design-Capabilities, ein automatisiertes visuelles
  Regressions-Gate.
- **Annahmen:** F29 WS-3 und F-596 sind die einzigen mit "Design-Phase vor
  F30" gelabelten Posten (per Grep geprüft, Stand 22.09.2026); Verifikation
  wie beim F29-Abschluss manuell durch Stefan.
- **Offene Fragen:** ob "weitere Design-Nacharbeit" erschöpfend mit diesen
  zwei Posten abgedeckt ist; ob manuelle Browser-Verifikation als
  Abschlusskriterium reicht; Umgang mit neuen optischen Findings aus
  F34–F38 während dieser Phase.
- **Erfolgskriterium:** F29 WS-3 und F-596 sind jeweils in einem eigenen PR
  gemergt und von Stefan im Browser freigegeben; erst danach beginnt der
  F30-Auftrag.

Real belegt: der Scope-Entwurf ist inhaltlich auf REALE Repo-Fundstellen
gestützt (`features/F29/feature.md`, `state/findings.md` F-596), grenzt
explizit gegen zehn andere offene Findings ab, statt sie versehentlich
mitzuziehen — kein generisches Template, sondern ein Ergebnis, das den
tatsächlich eingespeisten Projektkontext (F33-Einspeisung) sichtbar
verwendet hat.

## Volle Rohantworten

Vollständige `coachAntwort`-Objekte aller drei Turns (inkl. `scope`) liegen
im realen `GET /api/sparring`-Ergebnis dieses Laufs; die Kürzungen oben
dienen nur der Lesbarkeit dieser Datei. Quelle:
`kontrollzustand/lineage-sparring-ai-workforce/` (dieser Nachweislauf lief
unpräfigiert, Projekt `ai-workforce`) bzw. die drei
`lineage-laufakte-product-coach-product-coach-sparring-<auftragId>/`-Ketten
für die `verbrauch`-Rohdaten.
