# F31 WS-3 — Chat-Latenz: Messung

Reine Messung (kein Produktcode geändert, keine Änderung an Gateway, Hooks,
Settings oder Werkzeugsätzen). Ziel: verstehen, woraus die beobachteten
12–23s pro Chat-Turn bestehen, bevor irgendetwas umgesetzt wird.

## 1. Reale Chat-Läufe (20.09.2026)

Vier reale `jarvis-jarvis-chat-*`-Läufe aus `kontrollzustand-roh/`, Worker
`claude-code`, Modell `claude-sonnet-5`. "Gesamt (Server)" ist die Zeit
zwischen dem `erstellt_am` der Auftrag-Checkpoint (Nachricht abgeschickt)
und dem `erstellt_am` des zugehörigen `lineage-chat-ai-workforce`-Eintrags
(Antwort in der Chat-Historie sichtbar) — deckt damit mehr ab als nur den
CLI-Aufruf: Worker-Auflösung, Auftrag-Registrierung, Prozessstart,
Laufakte-/Lineage-Schreiben nach Laufende.

| Lauf (gekürzte ID) | Nachricht | Gesamt (Server) | CLI `duration_ms` | davon `duration_api_ms` | Diff (CLI − API) | Server-Overhead außerhalb CLI | `num_turns` | Input-Tokens (frisch / cache_creation / cache_read) |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 45188565 | „Nenne mir genau drei Obstsorten, nummeriert." (erste Frage) | 13,80s | 3,55s | 2,84s | 0,71s | **10,25s** | 1 | 2 / 15.981 / 8.583 |
| 30ceb04e | „Was war die zweite?" (Folgefrage) | 12,25s | 3,33s | 2,55s | 0,79s | **8,91s** | 1 | 2 / 10.981 / 13.707 |
| b89132d1 | „Fasse den bisherigen Gesprächsverlauf zusammen…" (Zusammenfassen) | 23,90s | 15,20s | 14,67s | 0,53s | **8,69s** | 1 | 2 / 13.033 / 13.707 |
| 75665aa9 | „Worum ging es bisher?" (erste Folgefrage nach Zusammenfassung) | 17,23s | 8,16s | 7,21s | 0,95s | **9,07s** | 1 | 2 / 9.292 / 13.707 |

Quellen: `kontrollzustand-roh/jarvis-jarvis-chat-<id>/rohstrom.json`;
Zeitstempel aus `kontrollzustand/lineage-auftrag-jarvis-chat-<id>/
checkpoints/1-*.json` (`erstellt_am`), `kontrollzustand/lineage-laufakte-
jarvis-jarvis-chat-<id>/checkpoints/1-*.json` (`erstellt_am`),
`kontrollzustand/lineage-chat-ai-workforce/checkpoints/13–16-*.json`
(`erstellt_am`, per `herkunft.lauf_id` den vier Läufen zugeordnet).

**Kernbefund:** Der Server-Overhead außerhalb der vom CLI selbst
gemeldeten `duration_ms` liegt in allen vier Läufen konstant bei
8,7–10,3s — unabhängig von Nachrichtenlänge oder Antwortlänge. Bei den
beiden kurzen Antworten (45188565, 30ceb04e) ist dieser Overhead sogar
**größer** als die eigentliche Modell-API-Zeit. Diese Zeitspanne umfasst
laut Code (Abschnitt 4) mindestens: Ressourcen-Auflösung, synchrones
Schreiben der Auftragsakte vor dem Lauf, den Prozessstart/-wrapper
(`fuehreAufgabeDurchFn` → Execution-Controller → claude-code-gateway) und
das Laden/Schreiben von Laufakte und Lineage-Chat-Eintrag nach Laufende.
Welcher einzelne Schritt darin wie viel beiträgt, ist mit den hier
verfügbaren Zeitstempeln nicht weiter aufschlüsselbar — das bräuchte
zusätzliche Zwischenstempel im Code selbst (Instrumentierung), die dieser
Auftrag nicht anlegen sollte (nur Messung, kein Produktcode).

## 2. Kontrollierte CLI-Messung (Median aus 3 Läufen je Variante)

Identischer Prompt: `Antworte ausschließlich mit dem JSON
{"art":"antwort","antwort":"OK"}`. Alle Läufe im Repo-Ordner, `--model
claude-sonnet-5 --output-format json -p "<prompt>"` plus die
Variantenflags unten. Werkzeugliste `Read,Grep,Glob` = real verifizierter
Inhalt des `lesend`-Werkzeugsatzes aus `startvorlagen/ai-workforce.json`
(`werkzeugsaetze.lesend.erlaubte_werkzeuge`) — exakt der Satz, den
`POST /api/chat` für Jarvis fest verdrahtet
(`scripts/leitstand-server.mjs:4458`, `loeseAusfuehrungsEingabenAuf(...,
'lesend', ...)`). stdin wurde für alle Läufe explizit geschlossen (Muster
`stdinLeer` aus `src/claude-code-gateway/prozessstart.ts`) — ohne das
hängt der Prozess, weil die Warnung „no stdin data received in 3s,
proceeding without it" (im echten Gateway-Wrapper sichtbar) unter
direkter Shell-Ausführung nicht zuverlässig nach 3s greift.

| Variante | Flags (zusätzlich zu `--model`/`--output-format`/`-p`) | Wall-Clock (Median) | `duration_ms` (Median) | `duration_api_ms` (Median) | `num_turns` | Input-Tokens |
|---|---|---:|---:|---:|---:|---|
| a) Standard (Gateway-Argv 1:1) | `--setting-sources project --tools Read,Grep,Glob --allowedTools Read,Grep,Glob` | 14,65s | 9,50s | 9,10s | 1 | 2 |
| b) ohne Projekt-Settings | `--setting-sources "" --tools Read,Grep,Glob --allowedTools Read,Grep,Glob` | 6,95s | 2,26s | 3,25s | 1 | 2 |
| c) ohne Werkzeuge | `--setting-sources project --tools "" --allowedTools ""` | 6,82s | 1,78s | 1,36s | 1 | 2 |
| d) ohne beides | `--setting-sources "" --tools "" --allowedTools ""` | 6,33s | 1,38s | 2,33s | 1 | 2 |

Einzelwerte je Variante (`duration_ms` / `duration_api_ms` / Wall-Clock):
- a): 6,89s/6,28s/12,84s · 10,06s/9,63s/15,04s · 9,50s/9,10s/14,65s
- b): 2,59s/3,43s/5,83s · 1,84s/2,74s/6,95s · 2,26s/3,25s/7,22s
- c): 1,78s/1,35s/6,82s · 1,77s/1,36s/6,73s · 2,66s/2,26s/7,61s
- d): 1,38s/2,33s/6,33s · 1,26s/2,07s/6,19s · 2,48s/4,69s/7,44s

**Unerwarteter Befund — reflexives Extended Thinking (Variante a):** In
allen drei a)-Läufen erzeugt das Modell 546–805 Thinking-Tokens und
579–826 Output-Tokens (Variante b/c/d: 0 Thinking-Tokens, 20 Output-Tokens
— exakt die angeforderte JSON-Antwort). Ein a)-Lauf ignorierte die
Prompt-Anweisung sogar vollständig und antwortete mit einer Rückfrage
statt dem angeforderten JSON. Der Effekt tritt nur auf, wenn **sowohl**
Projekt-Settings (CLAUDE.md) **als auch** ein Werkzeugsatz aktiv sind
(Variante c: Settings ja, Tools nein → kein Thinking; Variante b: Tools
ja, Settings nein → kein Thinking) — das Modell beginnt offenbar, über
CLAUDE.mds Arbeitsweise-Vorgaben (Briefing, Definition of Done) nach zu
denken, obwohl der Prompt trivial ist. Das ist der Haupttreiber der
Zusatzlatenz von a) gegenüber b)/c)/d), nicht die reine Kontextgröße.

**Methodischer Vorbehalt:** Diese vier Varianten testen die nackte
CLI-Hülle mit dem Gateway-Argv, **nicht** Jarvis' eigenen
Rolleninstruktionstext (`baueJarvisAuftragstext`, der die Nachricht in
einen festen JSON-Antwort-Rahmen einbettet). In den vier echten
Produktionsläufen aus Abschnitt 1 trat das reflexive Thinking praktisch
nicht auf (`thinking_tokens`: 0, 0, 0, 42) — vermutlich weil Jarvis'
Rollentext das Modell klar auf eine feste, kurze Antwort festlegt, wo der
generische Testprompt das nicht tat. Die Diskrepanz zwischen Variante a)
und den echten Läufen ist damit selbst ein Befund (Prompt-Framing
schützt bereits vor dem Reflex), keine Messungenauigkeit.

**Hooks — welche feuern real im `-p`-Modus:**
- `UserPromptSubmit` (`.claude/hooks/session-reminder.cjs`): **feuert**
  bei `--setting-sources project`. Beleg: der Hook schreibt bei jedem
  Aufruf einen Zähler nach `%TEMP%/cc-count-<session_id>.txt` (eigener,
  bereits vorhandener Code, hier nur ausgelesen — kein Hook verändert).
  Für alle drei a)-Session-IDs existiert die Datei
  (`cc-count-5d775dda-…`, `cc-count-0f179241-…`, `cc-count-fd29410b-…`);
  für keine der drei b)-Session-IDs existiert sie. Der Hook feuert damit
  nachweislich bei `project` und nachweislich nicht bei `""`.
- `SessionStart` (`.claude/hooks/zwischenstand-laden.cjs`): strukturell
  plausibel bei jedem `-p`-Aufruf (Matcher `startup|resume|compact|clear|
  fork` deckt jeden Neustart ab), aber **nicht per Seiteneffekt belegbar**
  — der Hook liest `state/zwischenstand/<branch-slug>.md`, diese Datei
  existiert für keinen der getesteten Branches (weder
  `feat/f31-ws3-latenz-messung` noch den Produktions-Branch der vier
  echten Läufe), der Hook beendet sich dann still ohne Output.
- Token-Differenz a) vs. b) als Kontextgrößen-Indikator: `CLAUDE.md` ist
  7.693 Zeichen (~1.900 Tokens grob geschätzt, Zeichen/4). Erster a)-Lauf:
  10.358 (cache_creation) + 6.271 (cache_read) ≈ 16.629 Tokens Kontext;
  erster b)-Lauf: 1.387 + 11.395 ≈ 12.782. Differenz ≈ 3.800 Tokens —
  Größenordnung passt zu CLAUDE.md plus etwas zusätzlicher
  Settings-/Tooldefinitions-Overhead. **Caveat:** Diese Werte stammen aus
  einer Sequenz von Aufrufen im selben 1h-Prompt-Cache-Fenster; nur die
  jeweils ersten Läufe je Variante sind einigermaßen frei von
  Cache-Kontamination durch vorherige Testläufe.

## 3. Codex

Codex ist laut `ressourcen.json` (`freigabe: "FREIGEGEBEN"`) und
`startvorlagen/ai-workforce.json` verfügbar; das deklarierte Binary
(`codex-cli 0.153.4`) existiert am dort hinterlegten Pfad und startet.

Jarvis-Chat wählt Codex als Worker jedoch **nicht** automatisch, außer
`ressourcen.json`-Auflösung meldet ihn als verfügbar — sonst fällt
`starteJarvisChatLauf` (`scripts/leitstand-server.mjs:4428-4443`) auf
`claude-code` zurück, wie in allen vier echten Läufen aus Abschnitt 1
geschehen (`modell_beobachtet: claude-sonnet-5`). Das für Codex
vorgesehene Jarvis-Modell wäre `gpt-6-astra`
(`scripts/leitstand-server.mjs:4438`) — nicht getestet, da nicht Teil der
Aufgabenstellung und ein Live-Aufruf mit unbekanntem, ungetestetem
Modellnamen unkontrolliert scheitern oder Kosten verursachen könnte.

Eine analoge Messung mit dem in `src/codex-gateway/codex-gateway.test.ts`
dokumentierten Modell `gpt-5-codex` schlägt für das aktuell angemeldete
Konto fehl:

```
{"type":"error","status":400,"error":{"type":"invalid_request_error",
"message":"The 'gpt-5-codex' model is not supported when using Codex
with a ChatGPT account."}}
```

Mit weggelassenem `--model` (CLI-Standardmodell) lief ein Lauf durch:
Wall-Clock 11,77s, `input_tokens` 14.327 (davon 12.416 cached),
`output_tokens` 13. Als grobe Referenz brauchbar, aber wegen anderem
Modell/anderer Provider-Pipeline nicht direkt mit Variante a) vergleichbar.

## 4. Client-/Server-Anteile im Code

- **Poll-Intervall:** `public/leitstand/zustand.js:84`
  (`POLL_INTERVALL_MS = 2000`), aktiviert über `setInterval` in Zeile 89.
  `chat.js` abonniert diesen gemeinsamen Timer über
  `abonniereDetailAuffrischer` (`public/leitstand/views/chat.js:111`
  Import, `:249` Kommentar zum Tick-Verhalten, `:448` Registrierung) —
  nach Laufende vergehen im Mittel ~1.000ms (max. 2.000ms), bis der
  nächste Tick die Antwort im Chat sichtbar macht.
- **Synchroner Schreibschritt vor dem Lauf:**
  `scripts/leitstand-server.mjs:4472` — `registriereAuftrag(...)` legt
  die Auftragsakte an, bevor der Worker-Prozess startet.
- **Prozessstart-Wrapper:** `scripts/leitstand-server.mjs:3039` —
  `fuehreAufgabeDurchFn(...)` (Execution-Controller → claude-code-gateway)
  umschließt den `claude.exe`-Start mit Checkpoint-/Hash-Ketten-Mechanik.
  In genau diesem Fenster liegt der in Abschnitt 1 gemessene, nicht
  weiter aufgeschlüsselte 8,7–10,3s-Server-Overhead.
- **Synchrone Schreibschritte nach dem Lauf:**
  `scripts/leitstand-server.mjs:4496` (`ladeArtefaktVersion` lädt die
  Laufakte) und `:4502` (`verarbeiteJarvisChatErgebnis` schreibt den
  `lineage-chat`-Eintrag) — beide laufen im `nachLauf`-Callback, bevor der
  nächste Poll-Tick den Lauf als aufgelöst erkennen kann.

## Top-Hebel (nicht umgesetzt, nur bewertet)

1. **`--setting-sources ""` für Jarvis-Chat (CLAUDE.md/Hooks aus dem
   Ein-Schuss-Lauf ausschließen).** Gemessener Gewinn: `duration_api_ms`
   Median 9,10s → 3,25s (a→b), ≈ 5,9s pro Antwort; Wall-Clock 14,65s →
   6,95s, ≈ 7,7s. **Berührt Harness/Architektur direkt:** verliert den
   `UserPromptSubmit`-Hook (Session-Hygiene-Erinnerung) und den
   `SessionStart`-Hook (Zwischenstand-Injektion) für diesen Lauftyp, sowie
   die deklarative `.claude/settings.json`-Durchsetzung. Risiko: mittel —
   Jarvis baut ohnehin einen eigenen Rolleninstruktionstext
   (`baueJarvisAuftragstext`), CLAUDE.mds SWE-Workflow-Vorgaben sind für
   einen Ein-Schuss-Chat-Lauf womöglich ohnehin irrelevant und lösen laut
   Abschnitt 2 sogar den teuren Thinking-Reflex aus — aber das ist nicht
   vollständig geprüft (nur 4 reale Läufe als Stichprobe).
2. **Werkzeugsatz `lesend` (Read/Grep/Glob) aus Jarvis-Chat entfernen,
   falls Jarvis sie de facto nie nutzt.** Gemessener Gewinn: a→c ≈ 7,7s
   (`duration_api_ms`), b→d klein (≈0,9s, ohne Settings kaum Unterschied).
   Berührt die Werkzeugsatz-Zuordnung der Rolle `jarvis` in der
   Startvorlage — architekturell eine einzelne Feld-Änderung. Risiko:
   niedrig-mittel — keiner der 4 echten Läufe nutzte ein Werkzeug, aber
   die Stichprobe ist klein; Jarvis verlöre die Fähigkeit, bei Bedarf im
   Repo nachzuschauen.
3. **Server-seitigen 8,7–10,3s-Overhead zwischen Laufende und
   Laufakte/Lineage-Chat-Schreiben aufklären.** Größter absoluter Hebel
   der gesamten Messung — konstant in allen 4 echten Läufen, oft größer
   als die Modell-API-Zeit selbst. Kein Harness-Eingriff nötig, um es zu
   MESSEN (nur zusätzliche Zeitstempel im Code), aber die eigentliche
   Ursache liegt vermutlich im Kern (Checkpoint-Store-Hash-Kette,
   Execution-Controller-Wrapper) — Risiko bei einer Fix-Iteration: mittel
   bis hoch, weil Kernmechanik angefasst würde.
4. **Poll-Intervall (2000ms) verkürzen oder durch Push/Event ersetzen.**
   Gemessener Gewinn: im Mittel ≈ 0,5–1s (halbes Intervall im Schnitt).
   Rein clientseitig, keine Architektur-/Harness-Berührung. Risiko:
   niedrig — kleinster Hebel der Liste, aber auch der billigste.
5. **Monitoring-Punkt statt Hebel — reflexives Extended Thinking bei
   künftigen Prompt-Änderungen vermeiden.** Die 4 echten Läufe zeigen
   kaum Thinking-Tokens, Variante a) der kontrollierten Messung dagegen
   546–805. Sollte sich `baueJarvisAuftragstext` künftig ändern und den
   in Abschnitt 2 beobachteten Reflex wieder auslösen, kostet das ~6-8s
   pro Antwort. Empfehlung: bei künftigen Änderungen an
   `baueJarvisAuftragstext` gezielt auf Thinking-Tokens/Output-Länge in
   der Laufakte prüfen. Kein Umsetzungsaufwand jetzt, nur eine
   Prüf-Erinnerung für später.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Mit Stefan die Hebel-Liste durchsprechen und entscheiden, ob/welcher
Hebel in einem eigenen WS-3-Workstream umgesetzt wird — insbesondere ob
`--setting-sources ""` für Jarvis-Chat vertretbar ist, da das die
CLAUDE.md-Disziplin für diesen Lauftyp aufgibt (Frage 3 der
Entscheidungsregel: Scope/Wartbarkeit gegen Frage 4: Komplexität
reduzieren).
