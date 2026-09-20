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

## Nach WS-3-Hebeln, 20.09.2026

Umgesetzt (Branch `feat/f31-ws3-chat-schneller`, Stefans Entscheidung
20.09.2026, Option A): (1) Server-Zeitaufschlüsselung je Lauf hinter
`LEITSTAND_ZEITMESSUNG=1` (`performance.now()`-Marken, eine
`console.log`-Zeile je Lauf, kein Verhalten geändert, wenn die
Variable fehlt); (2) Rolle `jarvis` läuft mit `--setting-sources ''`
statt `'project'` (`AufrufEingaben.settingSources`, ausschließlich vom
Jarvis-Chat-Pfad gesetzt, Body-Feld dafür bei POST /api/laeufe
ausdrücklich abgelehnt); (3) der ausstehende-Lauf-Poll in
`views/chat.js` läuft jetzt über einen eigenen, verketteten
`setTimeout` (500ms statt der bisherigen 2000ms des gemeinsamen
Zustands-Timers), NUR solange ein Lauf aussteht — `zustand.js` und
jeder andere Poll bleiben unverändert bei 2000ms (mechanisch geprüft,
`scripts/check-f20-zustand-poll.mjs` AK3: weiterhin genau ein
`setInterval(` im Client). `npm run check` und `npm run check:template`
grün, siehe Diff-Zusammenfassung unten.

### Diff-Zusammenfassung

- `src/claude-code-gateway/types.ts`, `index.ts`: `AufrufEingaben`
  bekommt ein optionales `settingSources`; `baueAufruf` nutzt
  `eingaben.settingSources ?? 'project'` statt des bisher festen
  Literals. `GatewayOptionen` bekommt einen optionalen
  `zeitmessung`-Rückruf; `starteGateway` ruft ihn an vier Stellen
  (`kontextpaket_startfreigabe`, `prozess_gestartet`,
  `prozess_beendet`, `laufakte_rohstrom_geschrieben`).
- `src/execution-controller/types.ts`, `index.ts`: `AusfuehrungsOptionen`
  bekommt dasselbe optionale `zeitmessung`-Feld, reine Durchreichung
  an `starteGateway` (Muster `zeitgrenzeMs`).
- `scripts/leitstand-server.mjs`: `starteJarvisChatLauf` setzt
  `aufrufEingaben.settingSources: ''` (nur hier); `neueZeitmessung`/
  `markiereZeit`/`protokolliereZeitmessung` sammeln fünf weitere Marken
  (`request_eingang`, `verlauf_geladen`, `ressourcen_worker_aufgeloest`,
  `auftrag_registriert`, `lineage_chat_eintrag_geschrieben`) in
  POST /api/chat, POST /api/chat/zusammenfassen und
  `starteJarvisChatLauf`; `starteLaufUndVergiss` reicht den
  Zeitmarken-Rückruf als sechsten, optionalen Parameter durch.
  `VERBOTENE_OPTIONEN_FELDER` und `pruefeStartauftrag` lehnen
  `aufrufEingaben.settingSources` und `zeitmessung` im Body ab (Muster
  des bestehenden `aufrufEingaben.werkzeugsatz`-Rotfalls).
- `public/leitstand/views/chat.js`: eigener 500ms-`setTimeout`-Poll
  (nicht `setInterval`, siehe Kommentar dort — AK3-Gate bleibt grün),
  startet/stoppt mit `ausstehenderLauf`.
- `docs/projekt/zielfassung.md`: §9.1-Nachtrag (Rolle `jarvis` ohne
  Projekt-Settings, Tabellenzeile unverändert), Changelog-Eintrag
  v1.21 → v1.22.
- Tests: zwei neue `fuehreAufgabeDurch`-Fälle in
  `execution-controller.test.ts` (`settingSources: ''` → Tokens tragen
  `''`; ohne das Feld → unverändert `'project'`); ein neuer Rotfall in
  `check-f11-auftrag.mjs` (`aufrufEingaben.settingSources` im Body →
  400); `check-f31-gedaechtnis.mjs` Fall (a) prüft zusätzlich, dass die
  tatsächlich an den Worker gereichten `aufrufEingaben` `settingSources:
  ''` tragen.
- **Reviewer-/QA-Pass (drei frische Subagenten, siehe unten) fand vier
  reale Befunde, alle vor diesem Stand behoben:** (1) `ARCHITECTURE.md`
  §7 „Aufrufparameter, die eine Schutzschicht abwählen" trug weiterhin
  „Ausnahme: keine", obwohl der Code jetzt genau das für Rolle `jarvis`
  tut — Zeile um eine benannte, eng gefasste Ausnahme ergänzt (Verweis
  auf den `zielfassung.md`-Nachtrag); (2) `protokolliereZeitmessung`
  lief nur auf dem Erfolgspfad, nicht bei Fehlschlag/Abbruch — jetzt
  über `try/finally` im `nachLauf`-Rückruf abgesichert, feuert jetzt
  immer; (3) `planeNaechstenAusstehendenLaufPoll` in `chat.js` plante
  den nächsten Tick ohne `try/finally` — ein Wurf aus
  `pruefeAusstehendenLauf` hätte die Poll-Kette dauerhaft angehalten und
  die Senden-Sperre für den Rest der Sitzung hängen lassen, jetzt mit
  `try/finally` abgesichert; (4) `pruefeAusstehendenLauf` prüfte nach
  seinen `await`s nicht erneut, ob `ausstehenderLauf` inzwischen (z. B.
  durch einen Projektwechsel mitten im Tick) zurückgesetzt wurde — ein
  Re-Check `ausstehenderLauf?.laufId !== laufId` an zwei Stellen
  ergänzt. Außerdem ein bereits vor diesem Diff veralteter Kommentar
  (`scripts/leitstand-server.mjs`, „neun bekannte Felder") korrigiert,
  da er beim Ergänzen von `zeitmessung` ohnehin berührt wurde.

### Vorher/Nachher-Messung (real, `claude-code`, kein Stub)

Vier reale Chat-Turns je Stand über `POST /api/projekte/ai-workforce/chat`
(`kontrollzustand`-Kette dieses Repos, echter `claude-sonnet-5`-Lauf,
Modell/Worker wie in Abschnitt 1): „Sag nur: OK“, „Was ist 2+2?“, „Nenne
eine Farbe.“, dann eine Rückfrage „Welche Farbe hast du gerade
genannt?“ (Gesprächsgedächtnis-Beleg). Beide Stände liefen im selben
Arbeitsverzeichnis nacheinander (nicht als Git-Worktree — ein
Worktree-Versuch scheiterte real an E-188: `arbeitsverzeichnis_pfad`
ist Teil von F4s Gültigkeitsschlüssel und an dieses Repo-Verzeichnis
gepinnt, `starteGateway` lehnte den Lauf aus dem Worktree korrekt mit
„Drift im Gültigkeitsschlüssel“ ab — die Startfreigabe funktioniert wie
vorgesehen). „Vorher" ist deshalb derselbe instrumentierte Branch-Stand
mit Hebel 2 per Hand temporär deaktiviert (`aufrufEingaben:{modell}`
ohne `settingSources`, direkt vor der Messung editiert und danach
wieder auf den echten Branch-Stand zurückgesetzt — `git diff` zeigt
dieselbe Änderung wie vor der Messung) — deckt damit den in der
Aufgabenstellung vorgesehenen zweiten Weg ab und macht Hebel 2 isoliert
messbar (Hebel 1 bleibt in beiden Ständen aktiv, Hebel 3 ist rein
client-seitig und wird unten separat, rechnerisch bewertet, siehe
Methodik-Hinweis). „Klick→Antwort sichtbar" wurde nicht über einen
echten Browser gemessen (keiner in dieser Umgebung verfügbar), sondern
als Server gesamt + halbes Poll-Intervall gerechnet (2000ms vorher,
500ms nachher — Erwartungswert bei gleichverteiltem Tick-Versatz) und
als solches gekennzeichnet.

| Turn | Stand | Klick→Antwort sichtbar (gerechnet) | Server gesamt | CLI Wall-Clock (Server-gemessen) | `duration_ms` | `duration_api_ms` | Thinking-Tokens |
|---|---|---:|---:|---:|---:|---:|---:|
| „Sag nur: OK" | vorher | 19,18s | 18,18s | 17,85s | 9,55s | 9,18s | 435 |
| „Was ist 2+2?" | vorher | 11,01s | 10,01s | 9,73s | 2,16s | 1,83s | 0 |
| „Nenne eine Farbe." | vorher | 11,12s | 10,12s | 9,78s | 2,03s | 1,72s | 0 |
| „Welche Farbe …?" (Rückfrage) | vorher | 11,98s | 10,98s | 10,71s | 2,78s | 2,50s | 0 |
| „Sag nur: OK" | nachher | 11,36s | 11,11s | 10,73s | 1,52s | 3,22s | 0 |
| „Was ist 2+2?" | nachher | 10,04s | 9,79s | 9,52s | 2,15s | 3,39s | 0 |
| „Nenne eine Farbe." (Ausreißer) | nachher | 101,40s | 101,15s | 100,85s | 90,89s | 179,57s | 0 |
| „Nenne eine Farbe." (Wiederholung) | nachher | 13,69s | 13,44s | 13,14s | 5,93s | 6,94s | 482 |
| „Welche Farbe …?" (Rückfrage) | nachher | 10,46s | 10,21s | 9,94s | 2,11s | 3,15s | 39 |

Rückfrage-Turn in beiden Ständen real belegt: Jarvis nennt in der
Rückfrage exakt die zuvor genannte Farbe (vorher: „Blau." → „Blau.";
nachher: „Grün." → „Grün.") — das Gesprächsgedächtnis aus WS-2
funktioniert unverändert ohne Projekt-Settings.

**Ausreißer „Nenne eine Farbe." (nachher):** `duration_api_ms`
(179,57s) liegt über `duration_ms` (90,89s) — ungewöhnlich (normal ist
`duration_ms ≥ duration_api_ms`, vgl. Abschnitt 2), deutet auf einen
providerseitigen Retry oder eine Netzwerkstörung während dieses einen
Aufrufs hin. Die gesamte Zusatzzeit liegt laut Zeitmarken vollständig
zwischen `prozess_gestartet` und `prozess_beendet` (100,85s), also
innerhalb des CLI-Prozesses selbst — kein Server-Codepfad dieses
Auftrags ist beteiligt. Nicht repariert (kein Befund dieses Auftrags),
zur Kontrolle wiederholt (Zeile „Wiederholung" oben, real unauffällig).

### Kernbefund 1 — der 8,7–10,3s-„Server-Overhead" aus Abschnitt 1 ist fast vollständig CLI-Prozess-Eigenzeit, nicht Server-Wrapper-Code

Die neue Zeitaufschlüsselung trennt zum ersten Mal, was in Abschnitt 1
als eine einzige unaufgeschlüsselte Zahl stand. Ergebnis (Spannen über
alle gemessenen Turns je Stand):

- **Prozessstart bis Prozessende** (`prozess_gestartet` →
  `prozess_beendet`, umschließt `starteProzess` in
  `src/claude-code-gateway/index.ts:307-312`): 9,73–10,71s vorher (alle
  vier Turns), 9,52–100,85s nachher (Spanne inkl. Ausreißer — ohne ihn
  9,52–10,73s). Davon ist `duration_ms` (die vom CLI selbst gemeldete
  Zeit) nur ein Teil — 9,73s Wall-Clock gegen 2,16s `duration_ms` beim
  Turn „Was ist 2+2?" (vorher) ist eine Differenz von 7,57s
  **innerhalb des Prozessfensters, aber außerhalb dessen, was der CLI
  selbst als Arbeitszeit meldet**. Das deckt sich mit der in der
  Auftragstellung bereits benannten „~5s CLI-Startzeit pro Lauf
  (Wall-Clock minus duration_ms)" — hier zum ersten Mal mit echten
  Zahlen aus Produktionsverkehr belegt, und mit 7,4–8,3s bei allen acht
  sauberen (nicht vom Ausreißer betroffenen) Turns eher größer als der
  Arbeitsschätzwert. **Ausdrücklich nicht Teil dieses Auftrags**
  (Auftragstext), hier nur gemessen, nicht angefasst.
- **Alles außerhalb des Prozessfensters** (Server gesamt minus
  CLI-Wall-Clock, rechnerisch identisch mit `request_eingang` bis
  `prozess_gestartet` plus `prozess_beendet` bis
  `lineage_chat_eintrag_geschrieben`): 268–347ms vorher (alle vier
  Turns), 266–386ms nachher (alle fünf Turns, Ausreißer eingeschlossen
  — er betrifft ausschließlich das Prozessfenster oben, nicht diesen
  Anteil) — also durchgehend unter einer halben Sekunde, nicht die
  8,7–10,3s aus Abschnitt 1. Die Abschnitt-1-Zahl maß „Gesamt minus
  `duration_ms`" und rechnete damit die CLI-Eigenzeit (siehe oben)
  versehentlich dem Server zu — kein Fehler in Abschnitt 1 (dort war
  keine Zwischenmessung möglich), aber eine Korrektur, die jetzt mit
  echten Marken belegt ist.

### Top-2-Serverphasen außerhalb des CLI-Prozesses (mit Datei:Zeile)

1. **Auftrag- und Kontextpaket-Registrierung** (`request_eingang` →
   `kontextpaket_startfreigabe`, ~230–320ms, der größere der beiden
   Anteile): zwei synchrone Checkpoint-Store-Schreibvorgänge —
   `registriereAuftrag(...)` (`scripts/leitstand-server.mjs:4521`) und
   `baueKontextpaket(...)` (`src/execution-controller/index.ts:269`),
   das intern `registriereKernArtefakt(...)`
   (`src/context-builder/index.ts:201`) aufruft. Beide schreiben in
   voneinander getrennte, eigene Hash-Ketten (`auftrag-<id>` bzw.
   `kontextpaket-<laufId>`, ARCHITECTURE.md §2) — ein Zusammenlegen
   wäre ein Bruch der append-only Ein-Ketten-pro-Artefakt-Regel.
   **Einschätzung:** ohne Eingriff in die Checkpoint-Store-Invarianten
   kaum verkürzbar — die Zeit steckt in echten, synchronen fs-Writes
   plus Hash-Berechnung je Kette, nicht in vermeidbarer Doppelarbeit.
   Bei ~300ms von ~10s Gesamtzeit (≈3%) ist der Hebel ohnehin klein;
   nicht empfohlen.
2. **Lineage-Chat-Eintrag schreiben**
   (`laufakte_rohstrom_geschrieben` → `lineage_chat_eintrag_geschrieben`,
   ~12–103ms): ein weiterer synchroner Checkpoint-Store-Schreibvorgang
   — `registriereKernArtefakt(...)` für `chat-<projektId>`
   (`scripts/leitstand-server.mjs:2636`, aufgerufen aus
   `verarbeiteJarvisChatErgebnis`). **Einschätzung:** derselbe Befund
   wie oben, noch kleiner (unter 1% der Gesamtzeit) — dies IST der
   audit-relevante Schreibvorgang, der den Chat-Verlauf persistiert
   (ARCHITECTURE.md §4: kanonische Laufakte/Lineage); ihn zu
   verzögern oder zu batchen würde die Sichtbarkeit „ein realer Lauf
   → sofort im Verlauf" aufgeben. Nicht empfohlen.

### Kernbefund 2 — Hebel 2s realer Effekt ist in echtem Jarvis-Verkehr kleiner und weniger verlässlich als die isolierte CLI-Messung aus Abschnitt 2 nahelegte

Median „Server gesamt" der drei sauberen (nicht vom Thinking-Reflex
betroffenen) Turns je Stand: 10,12s vorher (`--setting-sources
project`) gegen 10,21s nachher (`--setting-sources ''`) — **kein
messbarer Unterschied** bei n=3 je Stand. `duration_ms` derselben
sauberen Turns: Median 2,16s vorher gegen 2,11s nachher — ein realer,
aber kleiner Unterschied (~50-200ms), weit entfernt von der in
Abschnitt 2 gemessenen CLI-only-Differenz (9,10s → 3,25s, Variante
a→b). Wichtiger noch: der reflexive Thinking-Effekt aus Abschnitt 2
(dort: nur bei Projekt-Settings UND Tools gemeinsam aktiv) trat in
dieser Messung **in beiden Ständen** real auf — einmal vorher (Turn
„Sag nur: OK", 435 Thinking-Tokens, `--setting-sources project`) und
einmal nachher (Wiederholungs-Turn „Nenne eine Farbe.", 482
Thinking-Tokens, `--setting-sources ''`). Das widerspricht der in
Abschnitt 2 aufgestellten Vorbedingung (Settings UND Tools nötig) —
Jarvis' Werkzeugsatz `lesend` ist in beiden Ständen unverändert aktiv,
nur die Settings-Quelle unterscheidet sich, und der Reflex trat trotzdem
ohne Settings auf. **Einschätzung, nicht Befund:** n=4 je Stand ist zu
klein für eine belastbare Aussage zur Reflex-Rate; die Grundannahme aus
Abschnitt 2 (Settings sind eine notwendige Bedingung) ist mit diesen
Daten nicht mehr haltbar, nur noch „Settings erhöhen vermutlich die
Wahrscheinlichkeit". Hebel 2 bleibt trotzdem sinnvoll (löst reale
CLAUDE.md/Hook-Ausführung für einen Lauftyp, der ohnehin einen eigenen
Rollentext hat, Stefans Entscheidung 20.09.2026), aber die ursprünglich
in Abschnitt 2 genannte Erwartung „≈5,9s pro Antwort" hält sich in
echtem Jarvis-Verkehr nicht.

### Hebel 3 (Poll-Intervall) — rechnerisch, nicht live im Browser gemessen

500ms statt 2000ms Poll-Intervall senkt den Erwartungswert der
zusätzlichen Wartezeit nach Laufende von 1000ms auf 250ms (Hälfte des
Intervalls bei gleichverteiltem Tick-Versatz) — ein realer, aber
kleiner und in dieser Messung nicht live-im-Browser nachgewiesener
Effekt (kein Browser in dieser Umgebung verfügbar; die Tabelle oben
rechnet ihn deshalb nur in die „Klick→Antwort sichtbar"-Spalte ein,
klar gekennzeichnet). Verglichen mit dem CLI-Prozessfenster (9,5–18s)
ist das der kleinste der drei Hebel, aber der einzige, dessen Wirkung
in dieser Messung nicht durch reale Modell-Varianz (Thinking-Reflex,
der Ausreißer) verrauscht ist.

## Status
- [ ] Freigegeben
- [ ] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Mit Stefan die Messung durchsprechen: Kernbefund 1 (CLI-Eigenzeit
dominiert, außerhalb dieses Auftrags) legt nahe, dass ein künftiger
Latenz-Workstream dort ansetzen müsste, um einen großen Sprung zu
erzielen — beide hier verbliebenen Server-Phasen sind zusammen unter
einer halben Sekunde und architektonisch an die Checkpoint-Store-
Invarianten gebunden. Kernbefund 2 relativiert Hebel 2s erwarteten
Gewinn gegenüber Abschnitt 2, ohne ihn falsch zu machen (Stefans
CLAUDE.md/Hook-Entscheidung bleibt unabhängig von der Zeitersparnis
gültig). Reviewer-/QA-Pass (drei frische Subagenten) ist durchgelaufen,
vier reale Befunde behoben (siehe Diff-Zusammenfassung), `npm run
check`/`check:template` grün. Freigabe/Commit/Push liegt bei Stefan —
dieser Auftrag committet nichts selbst. Reale
`kontrollzustand/jarvis-jarvis-chat-*`-Läufe aus der Messung liegen
unversioniert im Arbeitsbaum (git-sichtbar, `kontrollzustand/` ist
nicht gitignored) — Stefans Entscheidung, ob sie mit committet oder
vor dem Commit entfernt werden.
