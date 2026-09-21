# Nachweis — Jarvis-Chat-Latenz senken

Auftrag: reale Latenzursachen in Jarvis-Chat beheben (stdin-Wartezeit, Extended
Thinking, Poll-Verzögerung, Client-Instrumentierung) und real belegen. Dieses
Dokument ist der Nachweis nach Umsetzung (Schritte 1–4), Abschnitt a) ist die
Ausgangslage, b)–d) sind reale Nachweisläufe gegen den echten Leitstand aus
diesem Hauptrepo.

## a) Ausgangsmessung vor dem Fix

Realer Lauf `jarvis-jarvis-chat-ac9204a1-d506-4199-9262-cf1faf711d04` (Stefan,
21.09.2026, vor jeder Änderung dieses Auftrags). Belege: die fünf
`kontrollzustand/`-Einträge dieses Laufs
(`jarvis-jarvis-chat-ac9204a1-…`, `lineage-auftrag-jarvis-chat-ac9204a1-…`,
`lineage-kontextpaket-jarvis-chat-ac9204a1-…`,
`lineage-laufakte-jarvis-chat-ac9204a1-…`, sowie Checkpoint 30 der
`lineage-chat-ai-workforce`-Kette), alle unversioniert im Arbeitsbaum
belassen, plus `kontrollzustand-roh/jarvis-jarvis-chat-ac9204a1-…/rohstrom.json`
(real erneut ausgelesen für dieses Dokument).

| Messgröße | Wert |
|---|---|
| Absenden → Antwort im Chat-Verlauf sichtbar (Client, geschätzt) | 102 s |
| Server gesamt (Auftrag-Checkpoint → Chat-Checkpoint) | 37,20 s (06:14:53,663 → 06:15:30,754 real nachgemessen) |
| stderr | `Warning: no stdin data received in 3s, proceeding without it.` |
| `duration_ms` | 20.612 |
| `duration_api_ms` | 21.082 |
| `ttft_ms` | 8.962 |
| `num_turns` | 3 |
| Thinking-Tokens / Output-Tokens | 814 / 1.321 |
| Worker / Modell | `claude-code` / `claude-sonnet-5` |
| ~CLI-Start/-Ende außerhalb `duration_ms` | ~12 s (bekannt, F-501, nicht Teil dieses Auftrags) |
| ~Lücke außerhalb des Servers (Client, Poll+Rendering) | ~65 s, Ursache vor diesem Auftrag ungeklärt |

Inhalt der Antwort war korrekt.

## b) Umgesetzt (Code, Tests, `npm run check`)

1. **Client-Zeitmessung** (`public/leitstand/views/chat.js`): je Turn vier
   Zeitmarken (`performance.now()`: Absenden, Server-Quittung, erster
   terminaler Poll-Tick, Darstellung) plus Poll-Tick-Anzahl und größte
   Tick-Lücke, eine `console.info('[jarvis-latenz] Chat-Turn:', …)`-Zeile pro
   Turn (Browser-Konsole). Gilt für normale Nachricht UND Zusammenfassen.
2. **stdin sofort geschlossen**: `src/claude-code-gateway/index.ts`s
   `starteGateway` setzt jetzt fest `stdinLeer: true` beim Aufruf von
   `starteProzess` — für JEDE Rolle, kein Options-Feld (Muster
   `codex-gateway/index.ts`, dort ebenso hartkodiert). Neue Tests: Spy-Test
   (`stdinLeer` kommt bei `starteProzess` an) und ein echter,
   spy-freier Prozesstest (`process.exit(0)` unbeeinflusst).
3. **Extended Thinking für `jarvis` minimiert**: real via `code.claude.com/docs/en/model-config`
   verifiziert (WebFetch, nicht geraten) — `MAX_THINKING_TOKENS=0` schaltet
   Extended Thinking auf der Anthropic-API ab (Ausnahme: Fable-Modelle, hier
   nicht einschlägig). `--effort` wurde geprüft und verworfen: laut derselben
   Doku steuert es "adaptive reasoning", nicht Extended Thinking. Umgesetzt
   als neues, optionales `AufrufEingaben.umgebungsvariablen` (Muster
   `settingSources`/`mcpConfig`) — nur `starteJarvisChatLauf`
   (`scripts/leitstand-server.mjs`) setzt `{ MAX_THINKING_TOKENS: '0' }`,
   durchgereicht bis zu `execFile`s `env`-Option (ergänzt `process.env`, ersetzt
   es nicht). `pruefeStartauftrag` lehnt das Feld im Body von `POST
   /api/laeufe` für jede Rolle ab (Muster `settingSources`). Betrifft
   ausschließlich den `claude-code`-Pfad — für Codex (eigener Provider, kein
   Anthropic-"Extended Thinking"-Konzept) bewusst nicht verdrahtet.
4. **Poll bei Sichtbarkeit**: `chat.js` löst bei `visibilitychange` →
   `'visible'` sofort einen Poll-Tick aus, wenn ein Lauf aussteht — kein
   zweiter `setInterval` (`check-f20-zustand-poll.mjs` AK3 bleibt grün).

`npm run check`: **Exit 0**, `npm run test`: **596/596 grün**
(inkl. 55 neue/bestehende `claude-code-gateway`- und 32
`execution-controller`-Tests, alle grün). Ein einzelner Lauf von
`check-f10-leitstand.mjs` (F14 WS-4 AK7, Abbruch-Test) schlug einmal mit
404 statt 202 fehl und war beim direkten Retry sowie bei zwei weiteren
Wiederholungen grün — reiner Mock-Test mit fest verdrahteter 120ms-Verzögerung,
berührt von diesem Diff nicht (siehe Abschnitt d unten zur Systemlast an
diesem Nachmittag). Bekannte Falle laut `CLAUDE.md` ("Test scheitert einmalig
… erst wiederholen"), kein Befund an diesem Diff.

## c) Reale Nachweisläufe gegen den echten Leitstand (3 Turns)

Leitstand aus diesem Hauptrepo gestartet
(`LEITSTAND_ZEITMESSUNG=1 node scripts/leitstand-server.mjs`, Default-Startvorlage
`startvorlagen/beispielprojekt.json` — bewusst OHNE `LEITSTAND_STARTVORLAGE_PFAD`,
um dieselbe Worker-Auflösung wie beim Ausgangslauf zu treffen: **realer
Nebenbefund**, siehe unten). Drei echte `POST /api/chat`-Turns mit der Frage
"Wo stehen wir gerade in der Roadmap?" gegen das reale `ai-workforce`-Projekt
(kein Stub, `kontrollzustand`/`kontrollzustand-roh` dieses Repos).

**Wichtiger Vorbehalt zur Systemlast:** Während der Läufe liefen — real per
`tasklist` geprüft — **14 gleichzeitige `claude.exe`-Prozesse** auf dieser
Maschine (andere Sitzungen/Subagenten, nicht von diesem Auftrag gestartet).
Turn 2 lag deshalb bei 188,9 s Server gesamt (Prozessfenster laut
Zeitmessung: `prozess_gestartet`→`prozess_beendet` 187,9 s, `duration_ms` nur
3,46 s — fast die gesamte Zeit ist Warteschlangenzeit außerhalb des
CLI-eigenen Zeitkontos). Die absoluten Zahlen unten sind dadurch **nicht**
gegen den Ausgangslauf vergleichbar — sie belegen Funktionsfähigkeit
(Antwort korrekt, Mechanik greift), nicht Performance. Eine saubere
Vorher/Nachher-Zahl braucht einen Lauf auf einer sonst unbeschäftigten
Maschine (Empfehlung unten).

| Turn | Server gesamt (Auftrag→Chat-Checkpoint) | `duration_ms` | `ttft_ms` | `num_turns` | Thinking-Tokens | stderr | Antwort korrekt |
|---|---:|---:|---:|---:|---:|---|---|
| 1 | 41,94 s* | 6.666 | 2.339 | 2 | 0 | Warning (s. u.) | ja |
| 2 | 188,85 s | 3.460 | 3.339 | 1 | 0 | Warning (s. u.) | ja |
| 3 | 25,93 s | 4.364 | 4.193 | 1 | 0 | Warning (s. u.) | ja |

\* Turn 1 schrieb **keinen** `lineage-chat-ai-workforce`-Checkpoint (siehe
Nebenbefund unten) — Wert ist die Zeitmessungs-Spanne
`request_eingang`→`lineage_chat_eintrag_geschrieben` desselben Laufs, nicht
Checkpoint-zu-Checkpoint wie bei Turn 2/3 und der Ausgangsmessung.

Alle drei Antworten sind inhaltlich korrekt und untereinander konsistent
(„M5, F32 abgeschlossen, F33 WS-0/WS-1 gemergt, F34–F39 + F30 offen"), real
gegen `docs/projekt/roadmap.json` gegengeprüft.

### Realer, unerwarteter Befund 1 — die stdin-Warnung tritt trotz `stdinLeer: true` weiterhin auf

`stderr` aller drei Turns trägt weiterhin wortgleich
`Warning: no stdin data received in 3s, proceeding without it.` — obwohl
Schritt 2 real implementiert UND unit-getestet ist. Gegengeprüft, kein
Einbildungsfehler: ein isolierter `execFile`-Aufruf mit exakt demselben
Mechanismus (`child.stdin.end()` binnen 50–160 ms nach Spawn), gegen dasselbe
`claude.exe`, **9 von 9 Wiederholungen ohne die Warnung** (variiert: mit/ohne
Tools, mit/ohne `env`-Override, verschiedene Promptgrößen bis 20.000 Zeichen).
Der Unterschied zwischen "isoliert: nie" und "im echten Leitstand: 3 von 3"
korreliert zeitlich mit der oben genannten Systemlast (14 gleichzeitige
`claude.exe`). Arbeitshypothese (nicht abschließend belegt): unter realer
CPU-/Scheduler-Konkurrenz bekommt der frisch gestartete `claude.exe`-Prozess
nicht sofort Rechenzeit, um sein stdin zu prüfen — bis dahin ist aus SEINER
Sicht bereits die eigene 3-Sekunden-Frist verstrichen, unabhängig davon, wie
schnell der Elternprozess das EOF tatsächlich gesendet hat. Nicht behoben
(außerhalb der Kontrolle dieses Gateways), aber ein echter Fund: der Nutzen
von Schritt 2 könnte unter Systemlast kleiner ausfallen als die isolierte
Messung nahelegt. Empfehlung: Re-Messung auf einer ruhigen Maschine, bevor der
Effekt als "erledigt" gilt.

### Realer, unerwarteter Befund 2 — Worker-Wahl hängt an der Startvorlage

Mit `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/ai-workforce.json` (die für
dieses Projekt vorgesehene, laut `[F-391]`-Warnung "richtige" Datei) wählt
Jarvis-Chat **Codex**, nicht `claude-code` (real geprüft, ein Testlauf vor der
eigentlichen Messung, `worker: "codex"`, `modellDeklariert: "gpt-6-astra"` in
der Laufakte). Mit der Default-Startvorlage (`beispielprojekt.json`, ohne den
Env-Override) fällt Jarvis auf `claude-code` zurück — **das ist der Zustand,
in dem sowohl der Ausgangslauf als auch alle Fixes dieses Auftrags
funktionieren**. Schritt 2 und Schritt 3 dieses Auftrags wirken ausschließlich
auf dem `claude-code`-Pfad; sie hätten auf den echten, mit der "richtigen"
Startvorlage gestarteten Jarvis-Chat aktuell **keine** Wirkung. Nicht Teil
dieses Auftrags zu klären, warum `beispielprojekt.json` weiterhin die
Default-Startvorlage des Servers ist, obwohl F-391 seit Längerem davor warnt —
neuer Befund, empfohlen für `state/findings.md`.

### Realer, unerwarteter Befund 3 — Turn 1 fehlt im persistierten Chat-Verlauf

Turn 1s Serverlog: `Ergebnis verstößt gegen schemas/ergebnis-jarvis.schema.json:
unbekanntes Feld 'antwort_kurz' (additionalProperties: false)`. Die Laufakte
wurde trotzdem `ABGESCHLOSSEN/ERFOLGREICH`, aber **kein** Checkpoint in
`lineage-chat-ai-workforce` erschien für diesen Lauf (Turn 2 und 3 mit
strukturell identischer Antwortform bekamen beide einen Checkpoint). Nicht
root-caused (außerhalb des Scopes dieses Auftrags), aber real reproduzierbar
beobachtet — ein Nutzer, der genau in diesem Fenster die View verlässt und
wieder betritt, sähe seine Antwort nicht. Empfohlen für `state/findings.md`.

## d) Vierter Turn (Tab im Hintergrund) und Client-Deltas — an Stefan

Schritt 1 (Client-Zeitmessung) und Schritt 4 (Sofort-Poll bei Sichtbarkeit)
sind implementiert, aber ihr Nachweis braucht einen echten Browser-Tab mit
offener DevTools-Konsole — in dieser CLI-Umgebung nicht verfügbar (kein
Browser-Werkzeug), genau die in der Aufgabenstellung vorgesehene Ausnahme.

Der Leitstand läuft bereits (`http://127.0.0.1:4173`,
`LEITSTAND_ZEITMESSUNG=1`, PID 1676 in dieser Shell/echtes Windows-PID 28376) —
die drei Turns oben sind bereits im echten Chat-Verlauf des Projekts
`ai-workforce` sichtbar. Für den vollständigen Nachweis, bitte:

1. Leitstand-Tab öffnen (`#/chat` oder die rechte Chat-Spalte), DevTools-Konsole
   offen lassen.
2. Eine Nachricht "Wo stehen wir gerade in der Roadmap?" senden, Tab die ganze
   Zeit im Vordergrund lassen, bis die Antwort erscheint.
3. Die `console.info('[jarvis-latenz] Chat-Turn:', …)`-Zeile aus der Konsole
   kopieren (enthält `absenden_bis_quittung_ms`, `quittung_bis_pollergebnis_ms`,
   `pollergebnis_bis_darstellung_ms`, `gesamt_ms`, `poll_ticks`,
   `groesste_poll_luecke_ms`).
4. Eine weitere Nachricht senden, den Tab **sofort nach dem Absenden für ca.
   30 s** in den Hintergrund legen (anderer Tab/Fenster), dann zurückkehren —
   dieselbe Konsolenzeile kopieren.
5. Beide Zeilen hier zurückmelden — ich trage sie nach und ziehe das Fazit zu
   Hebel 4 (Poll-Latenz) nach.

Falls der Leitstand-Prozess nicht mehr laufen sollte:
`LEITSTAND_ZEITMESSUNG=1 node scripts/leitstand-server.mjs` aus diesem
Verzeichnis.

## Fazit (vorläufig, Teil d steht aus)

Alle vier Code-Schritte sind real umgesetzt, getestet und laufen im
End-to-End-Test gegen den echten Leitstand fehlerfrei (korrekte Antworten in
3/3 Turns). Die verbleibende Zeit liegt laut Ausgangsmessung weiterhin
überwiegend außerhalb der `duration_ms`-Arbeitszeit des CLI selbst
(F-501, unverändert außerhalb des Scopes) und in einer bislang ungeklärten
Client-Lücke (Abschnitt d) — beides bereits vor diesem Auftrag bekannt. Der
reale Zusatzbefund dieses Laufs: der stdin-Fix wirkt isoliert nachweisbar,
aber unter realer Systemlast trat die Warnung trotzdem in 3/3 Fällen auf, und
Schritt 2/3 verpuffen komplett, sobald der Server (wie eigentlich vorgesehen)
mit `startvorlagen/ai-workforce.json` startet, weil Jarvis dann auf Codex statt
`claude-code` läuft.

## Runde 2 — Challenger-Verifikation: robuste Extraktion, sichtbarer Fehlerfall, geschärfter Vertrag, stdin zweiter Anlauf

Auslöser: realer Lauf `jarvis-jarvis-chat-c53f11b6-e227-40c2-bb17-3ce6c5fc4867`
war nach 44s terminal ERFOLGREICH, aber `result` war Prosa
("Kein neuer Sachstand seit den letzten identischen Antworten — ich antworte
konsistent damit.") gefolgt von einem ```json-Codezaun, zusätzlich
`bezug.workitem` = die eigene Chat-Lauf-ID. Die Chat-UI wartete >3 min ohne
sichtbares Ergebnis, `lineage-chat-ai-workforce` bekam keinen Eintrag.

### Umgesetzt

1. **Robuste Extraktion** (`scripts/leitstand-server.mjs`): `entferneCodezaun`
   sucht einen Codezaun jetzt IRGENDWO im Text (Regex-Suche statt
   `startsWith('```')`) — Prosa davor/danach wird verworfen, statt die
   gesamte Extraktion abzubrechen. Neue Funktion `extrahiereErstesJsonObjekt`
   (Klammerzählung, string-/escape-bewusst) als dritte Fallback-Stufe für
   Prosa + rohes JSON-Objekt GANZ OHNE Zaun. Die dritte Stufe ist über
   `leseRollenErgebnisRohstrom(daten, { jsonObjektFallback })` NUR für
   `leseJarvisErgebnisAusLaufakte` freigeschaltet (D2) — router/scout/
   code-reviewer bleiben unverändert bei den bisherigen zwei Stufen, weil ihr
   `beobachtung`-Feld gegen ein festes Schema-Enum (`[null, 'fence_entfernt']`,
   `schemas/kontrollzustand-router-ergebnis-payload.schema.json`) validiert
   wird und ein dritter Wert das bräche; `leseJarvisErgebnisAusLaufakte` liest
   `beobachtung` ohnehin nie. Unit-Tests (`scripts/check-f31-gedaechtnis.mjs`
   Abschnitt (i)): reines JSON, Codezaun ohne Sprachangabe, Prosa+Codezaun
   (der real aufgetretene Fall), Prosa+rohes JSON-Objekt ohne Zaun, kein JSON
   (bleibt ungültig) — alle fünf grün, plus eine Klammer-im-String-Kalibrierung.
2. **Nie wieder stilles Verlieren**: neue Funktion
   `schreibeJarvisChatFehlerEintrag` schreibt bei einem nach der Extraktion
   weiterhin ungültigen Ergebnis TROTZDEM einen `chat-<projektId>`-Eintrag —
   `jarvisAntwort.art: 'antwort'` (kein neuer art-Wert, `chat.js` zeigt ihn
   ohne UI-Änderung an), `jarvisAntwort.antwort` beginnt mit "Jarvis-Antwort
   konnte nicht gelesen werden: …". Bewusst OHNE `istZusammenfassung: true`,
   auch wenn der fehlgeschlagene Lauf ein Zusammenfassungsversuch war — sonst
   pinnte ein künftiges Verlaufsfenster einen inhaltsleeren Fehlertext als
   neuen "Gesprächsanfang" und verlöre die echte Historie. Gate-Test
   (`check-f31-gedaechtnis.mjs` Abschnitt (j)): ein real ABGESCHLOSSEN/
   ERFOLGREICH beendeter Lauf mit unlesbarem Ergebnis erzeugt GENAU einen
   sichtbaren Fehler-Eintrag, `nachricht` bleibt die echte Nutzerfrage,
   `istZusammenfassung` bleibt `false`.

   **Prüfung "Laufakte ERFOLGREICH trotz Vertragsverstoß — gewollt?"**: JA,
   das ist gewollt und architektonisch beabsichtigt, keine stillschweigend
   akzeptierte Lücke. `klassifiziereLauf`/`ermittleErgebnis`
   (`src/result-evaluator/index.ts`) entscheiden ERFOLGREICH/VERWEIGERT/
   FEHLGESCHLAGEN ausschließlich anhand prozessualer Signale (Exit-Code,
   `permission_denials`, Timeout/Abbruch) — sie öffnen `result` nie und kennen
   kein rollenspezifisches Schema. Das ist die in `claude-code-gateway/
   index.ts`s Kopfkommentar dokumentierte F7-Grenze/AK12 ("kein ergebnis-Feld,
   keine Auswertung … F7 vorbehalten"): ein claude-code-Prozess, der sauber
   durchlief und keine Genehmigung verweigert bekam, IST im F7-Sinne
   erfolgreich — dass der von ihm gelieferte Text dem Jarvis-App-Schema
   widerspricht, ist eine Ebene darüber (F26) und dort jetzt korrekt
   behandelt (Punkt 2 oben), nicht durch eine rückwirkende Änderung der
   Laufakte-Klassifikation. Am Laufakte-Vertrag wurde nichts geändert.
3. **Ausgabevertrag geschärft** (`src/jarvis/index.ts`,
   `baueJarvisAuftragstext`): zwei neue, an den real aufgetretenen Fall
   angelehnte Sätze — (a) das Codezaun-/Prosa-Verbot gilt AUSDRÜCKLICH auch
   bei einer inhaltlich identischen Wiederholung ("kein neuer Sachstand" o. ä.
   darf nicht vorangestellt werden); (b) `bezug` nur mit einer real im
   Kontext/Verlauf genannten Kennung, NIEMALS erfunden, geraten oder die
   eigene `lauf_id`/`auftrag_id` dieses Chat-Laufs. `jarvis.test.ts` (40/40)
   bleibt grün (die Byte-Identitäts-Prüfung für leeren Verlauf ist relativ,
   kein Snapshot).
4. **stdin, zweiter Anlauf** (`src/claude-code-gateway/prozessstart.ts`):
   `echterStarter` nutzt jetzt `child_process.spawn` statt `execFile`. Grund
   real geprüft (node-Probe gegen diese Node-Version): `execFile` reicht eine
   `stdio`-Option NICHT an den zugrunde liegenden Spawn durch — `child.stdin`
   blieb ein offener Pipe-Stream, unabhängig vom übergebenen Wert. `spawn`
   unterstützt denselben `timeout`/`signal`-Vertrag (ebenfalls real geprüft:
   `close(null,'SIGTERM')` + `child.killed===true` bei Timeout, zusätzliches
   `error`-Ereignis mit `ABORT_ERR` bei Abbruch, synchroner Wurf bei
   NUL-Byte-Argv) — nur `encoding`/`maxBuffer` sind execFile-exklusive
   Komfortfunktionen und wurden von Hand nachgebaut (`setEncoding('utf8')`,
   eigene 64-MB-Bytegrenze mit `kindprozess.kill()`). `stdio[0]` steht NUR bei
   `stdinLeer === true` auf `'ignore'` (F-307-Vertrag bleibt opt-in,
   `codex-gateway.test.ts`s Rot-Fall ohne `stdinLeer` bleibt unverändert
   grün). Der bisherige `kindprozess.stdin?.on('error', …)`-Workaround entfällt
   ersatzlos — ohne Pipe-Stream-Objekt gibt es kein `stdin`, an dem ein
   EPIPE/ERR_STREAM_DESTROYED auftreten könnte (real geprüft: `child.stdin`
   ist bei `stdio[0]:'ignore'` `null`). Alle F14/F6a-Prozessstart-Gates bleiben
   grün (55/55 `claude-code-gateway`-Tests, 83/83 `codex-gateway`-Tests,
   inkl. Timeout-, Abbruch-, maxBuffer-, Prozessbaum-Kill- und den drei
   F-307-Tests).

### Realer Nachweis — 5 echte Jarvis-Chat-Turns (21.09.2026, dieser Hauptrepo)

Leitstand aus diesem Hauptrepo neu gestartet
(`LEITSTAND_ZEITMESSUNG=1 node scripts/leitstand-server.mjs`, Default-Startvorlage
`startvorlagen/beispielprojekt.json`, PID 8500). Vor Start real per
`Get-Process` geprüft: **14 gleichzeitige `claude`-Prozesse** und **2
`node`-Prozesse** auf dieser Maschine (andere Sitzungen, nicht von diesem
Auftrag gestartet — vergleichbare Last wie Runde 1).

| Turn | Frage | Server gesamt | `duration_ms` | `duration_api_ms` | `ttft_ms` | `num_turns` | stderr leer | Extraktion nötig | Chat-Eintrag geschrieben | Antwort korrekt |
|---|---|---:|---:|---:|---:|---:|---|---|---|---|
| 1 | Wie ist der Roadmap-Stand? | 10,81 s | 4.499 | 5.739 | 4.445 | 1 | ja | nein | ja | ja* |
| 2 | Was ist F34? | 14,15 s | 7.190 | 7.848 | 2.167 | 2 | ja | **ja** (Prosa+Codezaun) | ja | ja |
| 3 | Welche Findings sind P1? | 46,79 s | 40.134 | 39.173 | 3.109 | 10 | ja | nein | ja | ja |
| 4 | Hallo | 7,74 s | 2.114 | 3.135 | 2.002 | 1 | ja | nein | ja | ja |
| 5 | Was hast du eben gesagt? | 8,88 s | 2.827 | 4.104 | 2.761 | 1 | ja | nein | ja | ja |

\* Turn 1: Antwort selbst korrekt, aber `bezug.auftrag_id` trägt einen
Selbstverweis (s. Befund 4 unten) — deshalb nicht vorbehaltlos "ja".
`usage.output_tokens_details.thinking_tokens` ist in allen fünf Läufen `0`
(`MAX_THINKING_TOKENS=0` wirkt nachweislich), `is_error` in allen fünf `false`.
`stderr` ist in **5 von 5** Turns leer — die in Runde 1 unter identischer
Systemlast (14 `claude`-Prozesse) in 3/3 Fällen aufgetretene
"no stdin data received"-Warnung trat in dieser Runde **kein einziges Mal**
auf. Kein Beweis (unterschiedliche Läufe, keine kontrollierte A/B-Messung),
aber ein starkes Indiz, dass Schritt 4 (stdin nie als Pipe öffnen statt
nachträglichem `end()`) den in Runde 1 dokumentierten Rest-Befund behebt.

### Befund 4 (Runde 2) — ein Vertragsverstoß, den die Extraktion NICHT abfangen kann

Turn 2 (`Was ist F34?`) lieferte real wortgleich dasselbe Verstoßmuster wie
der Auslöser dieser Runde: Prosa ("Keine weitere Fundstelle — F34 ist im
Projektkontext nur als bloße Feature-ID …") gefolgt von einem ```json-Zaun.
Schritt 3 (Prompt-Schärfung) hat das NICHT verhindert — aber Schritt 1
(robuste Extraktion) hat es real aufgefangen: valide Antwort im Chat-Verlauf,
kein Datenverlust. Das bestätigt den Nutzen von Schritt 1 unmittelbar am
selben Verstoßtyp, der Runde 1 ausgelöst hat.

Turn 1 (`Wie ist der Roadmap-Stand?`) zeigt dagegen einen NEUEN, von der
Extraktion strukturell nicht erkennbaren Verstoß: die Antwort ist syntaktisch
und schemakonform gültiges JSON, aber `bezug.auftrag_id` trägt exakt
`jarvis-chat-71e7d6c5-496b-4dde-972e-8a8861dca92a` — die eigene, von
`starteJarvisChatLauf` erst beim Start dieses Laufs per `randomUUID()`
erzeugte `auftragId` dieses selben Chat-Laufs. Diese ID steht an KEINER
Stelle im Prompt (`baueJarvisAuftragstext` kennt sie nicht); sie kann nur
über das dem Modell zur Verfügung stehende `lesend`-Werkzeugset
(Read/Grep/Glob, kein `ausschlussmuster`-Ausschluss für `kontrollzustand/`)
gefunden worden sein — `registriereAuftrag` schreibt die eigene Auftragsakte
BEVOR der Lauf startet, ist also für das Modell bereits auf der Platte
lesbar. Nicht abschließend mit einem Tool-Aufruf-Log belegt, aber die einzige
Erklärung, die ohne Raten auskommt. Da `validiereErgebnisJarvis` nur die
FORM von `bezug` prüft (genau eines von `auftrag_id`/`workitem`, nicht-leerer
String), nicht ob die referenzierte ID real und verschieden vom eigenen Lauf
ist, kann weder Schritt 1 (Extraktion) noch die bestehende Schemaprüfung
diesen Fall erkennen — schemakonformes JSON ist für beide "gültig". Dasselbe
Verstoßmuster (Selbstverweis) trat auch im historischen Chat-Verlauf bereits
mehrfach auf (siehe die Turns `jarvis-chat-cecf0ccd-…`,
`jarvis-chat-5daa4287-…`, `jarvis-chat-c2634172-…` in
`kontrollzustand/lineage-chat-ai-workforce`), ist also kein Einzelfall dieses
einen Laufs.

**Das ist der in Punkt 5 des Auftrags benannte Fall** ("Vertragsverstöße, die
die Extraktion NICHT abfängt"). Ob deshalb `MAX_THINKING_TOKENS=0`
zurückgenommen wird, liegt bei Stefan — dieser Auftrag entscheidet das nicht
selbst (kein Commit, keine stillschweigende Vertragsänderung). Zu bedenken:
der Selbstverweis-Verstoß betrifft ausschließlich `bezug` (ein optionales,
beschreibendes Feld ohne Downstream-Wirkung außer einer potenziell falschen
Verknüpfung in einer künftigen Auswertung) und trat laut den historischen
Chat-Einträgen bereits VOR Runde 1/2 auf — ein ursächlicher Zusammenhang mit
`MAX_THINKING_TOKENS=0` ist damit nicht belegt, im Gegensatz zum
Prosa+Codezaun-Muster (Turn 2), das Runde 1 bereits als mögliche Folge
reduzierter interner Deliberation vermutet hatte.

`npm run check`: **Exit 0**, `npm run test`: **596/596 grün** (2 einmalige,
beim Retry grüne Fehlschläge während der vollen Kette — `EPERM` beim
Aufräumen eines Testverzeichnisses und ein `ENOENT` im F14-WS-2-Prozessbaum-
Kill-Test, beide isoliert und im Retry reproduzierbar grün, bekannte Fallen
laut `CLAUDE.md`, kein Befund an diesem Diff).

## Abbruch — manueller Abbruch-Test bleibt in der UI hängen (F-Nachfolgeauftrag)

Auslöser: Stefans manueller Test (Nachricht gesendet, nach ~3s "Abbrechen"
geklickt) — die UI blieb dauerhaft auf "Abbruch angefordert" stehen, löste
nie auf. Server-seitig war der reale Lauf
(`jarvis-jarvis-chat-170ed078-120a-44ae-9226-3218d540b2aa`) korrekt terminal
(Checkpoint 2: `beendigungsart: ABBRUCH`, `grund: abgebrochen_manuell`).

### 1) Diagnose

`GET /api/laeufe/jarvis-jarvis-chat-170ed078-…` (real abgerufen, Leitstand
Port 4173): `aktiv:false`, `laufStatus:{"status":"ABGESCHLOSSEN","ergebnis":"FEHLGESCHLAGEN",…}`.
Beide Bedingungen aus `pruefeAusstehendenLauf` (`chat.js:378-380`:
`detail.aktiv !== true` UND `laufStatus.status` in
`{ABGESCHLOSSEN, KLAERUNG_ERFORDERLICH}`) sind für DIESEN Lauf bereits wahr —
der Server-Vertrag war zu keinem Zeitpunkt das Problem.

Ursache liegt rein im Client, `pruefeAusstehendenLauf` (`chat.js`, vor dem
Fix): im nicht-erfolgreichen Zweig stand `renderVerlauf()`
(Zeile 402) VOR `ausstehenderLauf = null` (Zeile 405). `renderVerlauf()`
blendet den Abbrechen-Button nur aus, wenn `ausstehenderLauf === null`
(Zeile 321: `chat-abbrechen-btn.hidden = ausstehenderLauf === null`) — zum
Zeitpunkt dieses Renders war er das noch nicht. Nach dem Nullen folgte KEIN
weiterer Render und `setzeAbbrechenZustand` (Text "Abbruch
angefordert"/`disabled:true`, von `initAbbrechenBedienung` beim Klick
gesetzt) wurde nie zurückgesetzt — der Button blieb sichtbar, disabled und
mit dem alten Text stehen, obwohl `ausstehenderLauf` intern längst `null`
war und das Senden-Feld selbst wieder entsperrt wurde
(`setzeSendenSperre(false)` lief korrekt). Derselbe Reihenfolge-Fehler galt
auch im ERFOLGREICH-Zweig (`ladeVerlauf()` rendert ebenfalls vor dem Nullen).

### 2) Regression oder Altfehler

Altfehler. `git diff HEAD -- public/leitstand/views/chat.js` zeigt: die
betroffenen Zeilen (`renderVerlauf()`/`ausstehenderLauf = null`-Reihenfolge)
sind unveränderter Kontext, nicht Teil des Diffs dieses Auftrags — die
eigenen Änderungen (Latenzmessung, `visibilitychange`-Poll) fügen nur neue
Zeitmarken hinzu, greifen in diese Reihenfolge nicht ein.
`git diff HEAD -- scripts/leitstand-server.mjs` enthält keinen Treffer für
`aktiv`/`laufStatus`-Bestimmung — der D13-Aktiv-Flag-Pfad ist unverändert.
`prozessstart.ts` (spawn-Umbau) betrifft nur den Prozessstart, nicht die
Terminal-/Aktiv-Ermittlung nach ABBRUCH.

### 3) Fix

Geändert: `public/leitstand/views/chat.js`, `pruefeAusstehendenLauf` — beide
Zweige (ERFOLGREICH/nicht-erfolgreich) laufen jetzt in einen gemeinsamen
Abschluss: `ausstehenderLauf = null` UND `setzeAbbrechenZustand('Lauf
abbrechen', false)` VOR dem abschließenden `renderVerlauf()`. Der separate
`renderVerlauf()`-Aufruf im nicht-erfolgreichen Zweig entfiel (jetzt Teil des
gemeinsamen Abschlusses). Ergebnis: der Abbrechen-Button wird bei JEDER
terminalen Auflösung zuverlässig ausgeblendet und sein Zustand
(Text/Sperre) zurückgesetzt — unabhängig davon, ob der Lauf abgebrochen
wurde oder nicht. Kein serverseitiger Eingriff nötig (Punkt 1 bestätigt: der
Server lieferte bereits die richtige Auflösungsbedingung).

Eine automatisierte Rot/Grün-Probe für den DOM-Zustand des Buttons selbst
(`hidden`/`disabled`/`textContent`) ist mit dem bestehenden Test-Stack
(`node:test`, kein DOM/kein `jsdom` im Projekt) ohne neue Testinfrastruktur
nicht sinnvoll abbildbar — bewusste Zuschnitt-Entscheidung (CLAUDE.md-Regel
5), nicht stillschweigend übergangen. Der Server-Vertrag, auf dem
`pruefeAusstehendenLauf` seine Entscheidung aufbaut, ist bereits über
`scripts/check-f14-abbruch.mjs` (Teil von `npm run check`) gegen echte
Abbruch-/Timeout-Läufe abgesichert; der reale Nachweis unten (Punkt 4/5)
prüft denselben Vertrag zusätzlich über die echte HTTP-Route, die `chat.js`
tatsächlich abfragt.

### 4/5) Realer Nachweis — 2 echte Chat-Abbrüche über die echte API

Leitstand aus diesem Hauptrepo lief bereits (`http://127.0.0.1:4173`,
PID aus vorherigem Abschnitt) — für diesen Nachweis NICHT neu gestartet
(unverändertes Serververhalten, nur der Client wurde gefixt). Beide Abbrüche
über dieselben Routen wie `chat.js` (`abbrichLauf`/`holeLaufDetail`):
`POST /api/laeufe/<laufId>/abbrechen`, danach `GET /api/laeufe/<laufId>`
real per `curl` abgefragt, bis `aktiv:false`. **Vorbehalt Systemlast**
(gleiche Maschine wie Abschnitt c/Runde 2): 14 gleichzeitige `claude.exe`
während beider Läufe (`tasklist`, real geprüft) — absolute Zeiten sind
dadurch nicht mit einer unbelasteten Maschine vergleichbar; die Poll-Schleife
selbst startete zusätzlich zwei `node`-Subprozesse pro Tick (eigene
Mess-Overhead, kein `chat.js`-Verhalten), die im Feld "Poll-Overhead" unten
ausgewiesenen Zahlen sind entsprechend höher als das reale 500ms-Poll-Delta
von `chat.js`.

| Test | Nachricht → Abbruch nach | `POST …/abbrechen` | `run_prepared` → Terminal-Checkpoint (Server, real) | Terminal-Ergebnis | `GET` zeigt `aktiv:false` (erster erfolgreicher Poll-Tick dieses Nachweis-Skripts) |
|---|---|---|---|---|---|
| A | ~2 s | `202 {"grund":"Abbruch angefordert"}` | 17,94 s (10:01:16,106Z → 10:01:34,043Z) | `ABGESCHLOSSEN/FEHLGESCHLAGEN`, `beendigungsart: ABBRUCH` (Checkpoint, s. u.) | 2. Tick dieses Skripts, `aktiv:false`/`status:ABGESCHLOSSEN` |
| B2 | ~8 s | `202 {"grund":"Abbruch angefordert"}` | 41,77 s (10:02:46,231Z → 10:03:28,000Z) | `ABGESCHLOSSEN/ERFOLGREICH` (Prozess lief trotz Abbruchsignal bis zur eigenen Fertigstellung durch — reale Race, kein Bug dieses Auftrags) | 2. Tick dieses Skripts, `aktiv:false`/`status:ABGESCHLOSSEN` |

Test A endete real als `ABBRUCH` (Checkpoint 2:
`{"art":"terminal","daten":{"art":"MANUELL","beendigungsart":"ABBRUCH","grund":"abgebrochen_manuell"},"ergebnis":"FEHLGESCHLAGEN"}`).
Test B2 (Nachricht bewusst umfangreicher gewählt, um den Lauf über die
8s-Marke hinaus laufen zu lassen) endete trotz akzeptiertem Abbruch
(`202`) als `ERFOLGREICH` — der zugrunde liegende Prozess hatte sein
Ergebnis offenbar bereits geschrieben, bevor das Abbruchsignal griff; auch
das ist für den hier geprüften Vertrag ausreichend, weil `chat.js`
`ABGESCHLOSSEN` so oder so terminal auflöst (Zeile 380). In BEIDEN Fällen
lieferte `GET /api/laeufe/<laufId>` innerhalb der von diesem Skript
beobachteten Zeitgrenze (< 1 Minute, real gemessen, s. o. Vorbehalt) ein
`aktiv:false` mit einem `laufStatus.status`, den `pruefeAusstehendenLauf`
auflöst — der Server-Vertrag hält in beiden real getesteten Timing-Fällen.
Der eigentliche, jetzt gefixte Client-Bug (Button bleibt hängen) ist über
diese API-Nachweise NICHT sichtbar (reiner DOM-Zustand) — der Browser-Klicktest
macht Stefan wie vereinbart selbst.

### `npm run check` nach dem Fix

Erster Lauf: **Exit 1** — `scripts/check-f10-leitstand.mjs` (F14 WS-4 AK7,
unverändert seit HEAD, NICHT Teil dieses Fixes) schlug mit 404 statt 202 fehl
(Abbruch-Endpunkt eines Mock-Laufs mit fest verdrahteten 20ms/120ms-Zeitgrenzen
— unter der bekannten Systemlast dieser Maschine, 14 gleichzeitige `claude.exe`
während des gesamten Auftrags, real per `tasklist` geprüft). In Isolation
**5-mal in Folge reproduziert** (nicht nur einmalig) — per Diff-Review
(`git diff HEAD -- scripts/leitstand-server.mjs`) bestätigt: keine der
Änderungen dieses Auftrags berührt den generischen `/api/laeufe`-Start- oder
Abbruch-Pfad, nur `starteJarvisChatLauf`s Jarvis-Chat-spezifischen
`nachLauf`-Callback (Runde 2) und `pruefeStartauftrag`s Validierung — beides
für diesen Testfall nicht auf dem Codepfad. `npm run test` separat zeigte
zusätzlich einen zweiten, für sich isoliert grünen Fehlschlag
(`claude-code-gateway.test.ts`, F14 WS-2 Prozessbaum-Kill-Test) — derselbe
bereits in Runde 2 dieses Dokuments dokumentierte Flaky-Fall. Beide Fallen
laut `CLAUDE.md` ("Test scheitert einmalig … erst wiederholen"), auch wenn
der erste diesmal 5 statt 1 Wiederholung brauchte, um wieder grün zu laufen.

Zweiter voller Lauf (ohne Codeänderung dazwischen): **Exit 0**, `npm run test`:
**596/596 grün**. Kein Befund an `chat.js` oder an einer der übrigen
Änderungen dieses Auftrags.

## Abbruch Runde 2 — warum ein Abbruch wirkungslos durchkam

Auslöser: Stefans Browser-Test nach dem chat.js-Fix aus Runde 1 — "Lauf abbrechen"
geklickt, der Lauf lief trotzdem zu Ende, die Antwort kam. Dazu
`check-f10-leitstand.mjs` F14 WS-4 AK7 mit 404 statt 202, 5/5 in Isolation.

### 1) Diagnose

**Nicht** die Signalkette. Real geprüft, Schritt für Schritt: der Abbruch-Endpunkt
(`scripts/leitstand-server.mjs:6021-6037`) löst `laufAktivAbortController.abort()` aus;
`starteLaufUndVergiss` (Zeile 3262) reicht `abbruchSignal` an `fuehreAufgabeDurch`, der
Execution-Controller (Zeile 344/366) an `starteGateway`, das an `starteProzess`
(`src/claude-code-gateway/index.ts:395`), das es als `signal` an `spawn` gibt
(`prozessstart.ts:257`). Jede Stufe real belegt: eine Sonde direkt auf `starteProzess`
mit echtem `claude.exe` und Abbruch nach 8 s lieferte `beendigungsart: 'ABBRUCH'`,
`exitCode: null`, aufgelöst 1,1 s nach dem Abbruch. Eine zweite Sonde auf `spawn`
selbst zeigte, dass Node 24 auf Windows das Signal in **jeder** Phase umsetzt (Abbruch
vor dem Spawn, nach 500 ms, nach 1500 ms — jedes Mal `ABORT_ERR` + `close(SIGTERM)`).

**Die Ursache ist ein Zeitfenster, kein kaputter Draht.** `laufAktiv` bleibt vom
Laufstart bis zum Ende der **Nachbereitung** true (Klassifikation, Laufakte,
Lineage-Eintrag — `starteLaufUndVergiss`s `.then()`, Zeile 3291). Der
Werkzeugprozess ist zu diesem Zeitpunkt aber längst beendet. Ein Abbruch, der in
dieses Fenster fällt, findet `laufAktiv === true` und `laufId === laufAktivLaufId` vor,
antwortet deshalb mit **202 "Abbruch angefordert"** — und läuft danach ins Leere: es
gibt keinen Prozess mehr zu töten, der Lauf endet regulär `ERFOLGREICH`, die Antwort
erscheint. Für den Menschen sieht das exakt so aus, wie Stefan es beschrieben hat.

Real reproduziert (Lauf `jarvis-jarvis-chat-cef15143-…`, 21.09.2026): Abbruch nach
12,19 s → **202**, terminal **0,495 s später** `ABGESCHLOSSEN/ERFOLGREICH`,
`exitCode 0`, `stdoutLaenge 3362`. Der Abbruch traf die Nachbereitung, nicht den Prozess.

Dasselbe Muster in Stefans drei Läufen: `duration_ms` der Modellarbeit 10.703 / 4.547 /
5.602 ms, Gesamtdauer `run_prepared`→Terminal aber 28,5 / 17,8 / 20,3 s. Zwischen
Prozessende und Terminal-Checkpoint liegen also zweistellige Sekundenbeträge — ein
weites Fenster, in dem ein Abbruch quittiert wird, ohne zu wirken.

### 2) Regression? Nein.

`git worktree add ../ai-workforce-main-check main` + `npm ci`, dort
`node scripts/check-f10-leitstand.mjs` 5×: **Exit 0, 0, 0, 0, 0**. Derselbe Test auf
diesem Branch, unmittelbar danach unter denselben Bedingungen ebenfalls 5×:
**Exit 0, 0, 0, 0, 0**. Die vorher beobachteten 5/5 Fehlschläge waren **nicht**
codebedingt, sondern ein Wettlauf im Test selbst: der Block gibt dem Mock eine feste
Frist von 120 ms und braucht für seine eigene Vorbereitung (zwei Wirkungsmarken auf
Platte, vier HTTP-Anfragen) idle real ~66 ms — unter CPU-Last (zeitweise 14-16
gleichzeitige `claude.exe` auf dieser Maschine) überschreitet das die 120 ms, der Lauf
ist beim Abbruch bereits beendet, der Endpunkt antwortet **korrekt** mit 404, und der
Test meldet einen Befund. Das ist derselbe Rennentyp wie der Produktionsfehler — was
die Fehldeutung "derselbe Fehler" erklärt, aber keine Regression dieses Branches ist.

**Korrektur zu Runde 1 dieses Dokuments:** dort wurde derselbe Fehlschlag als
"bekannte Falle, im Retry grün" abgehakt. Das war zu schnell — er war reproduzierbar
und hatte eine benennbare Ursache.

### 3) Fix

- `scripts/check-f10-leitstand.mjs` (AK7): der Mock endet nicht mehr nach fester Frist,
  sondern erst, wenn der Test ihn freigibt (`gibLaufFrei()`). Damit prüft der Block
  deterministisch den Abbruch eines **laufenden** Laufs, statt gegen die eigene
  Vorbereitung zu rennen.
- `scripts/check-f14-abbruch.mjs`: neuer Block **(d)** — Abbruch über genau den Pfad der
  Chat-UI (`POST /api/chat` → `POST /api/laeufe/<laufId>/abbrechen` im laufenden
  Prozess) → 202 und terminal `ABBRUCH`/`abgebrochen_manuell`. Der bisherige Block (b)
  deckte nur den Start über `POST /api/laeufe` ab, also einen anderen
  Registrierungspfad derselben D13-Belegung.
- `public/leitstand/views/chat.js`: ein 202 heißt "angenommen", nicht "hat gewirkt".
  Endet ein Lauf, für den ein Abbruch angefordert wurde, trotzdem `ERFOLGREICH`, zeigt
  die View jetzt sichtbar **"Abbruch kam zu spät: die Antwort war bereits fertig, der
  Lauf wurde nicht abgebrochen."** statt den wirkungslosen Abbruch zu verschlucken.

Bewusst **nicht** geändert: der Abbruch tötet keinen bereits beendeten Prozess
rückwirkend, und eine fertige, real erzeugte Antwort wird nicht nachträglich
weggeworfen. Das Fenster selbst schrumpft nur, wenn die Nachbereitung schneller wird —
das ist Messgegenstand (Abschnitt 4), kein Umbau in diesem Auftrag.

### 4) Absende-Latenz (nur gemessen)

Gegen den laufenden Leitstand (Port 4173), je 3 Messungen: `POST /api/chat` bis zur
**202-Antwort: 19 / 20 / 57 ms** (`GET /api/chat`, Verlauf laden: 35 / 19 / 14 ms).
Server-Zeitmarken (`LEITSTAND_ZEITMESSUNG=1`, eigene Instanz) für dieselbe Strecke
`request_eingang` → 202, drei Läufe:

| Posten | Lauf 1 | Lauf 2 | Lauf 3 |
|---|---:|---:|---:|
| `request_eingang` → `verlauf_geladen` | 2,6 ms | 0,3 ms | 0,6 ms |
| → `ressourcen_worker_aufgeloest` | 3,1 ms | 2,3 ms | 2,8 ms |
| → `auftrag_registriert` (dann 202) | 5,7 ms | 4,2 ms | 4,9 ms |
| **Summe Eingang → 202** | **11,4 ms** | **6,8 ms** | **8,3 ms** |

Das Absenden selbst ist also **nicht** die wahrgenommene Wartezeit — größter Posten
darin ist `auftrag_registriert` (Disk-I/O, ~4-6 ms). Die Sekunden liegen dahinter:
`auftrag_registriert` → `kontextpaket_startfreigabe` 254 / 407 / 244 ms, danach der
eigentliche Werkzeugprozess (real `claude.exe`: `duration_ms` 4,5-10,7 s plus
CLI-Start/-Ende, F-501). Der Client-Vorfilter kommt als Erklärung nicht in Frage: er
kehrt ohne Musterfall sofort und ohne Serverkontakt zurück (`jarvis-vorfilter.js:93-95`).

### 5) Realer Nachweis — 3 echte Chat-Abbrüche über den UI-Pfad

Gegen den laufenden Leitstand (Port 4173), je `POST /api/chat` → warten →
`POST /api/laeufe/<laufId>/abbrechen` → `GET /api/laeufe/<laufId>` bis terminal:

| Abbruch nach | HTTP | Terminal | `exitCode` | Zeit Abbruch → terminal |
|---:|---|---|---:|---:|
| 2,16 s | 202 | `ABGESCHLOSSEN/FEHLGESCHLAGEN` (ABBRUCH) | null | **1,37 s** |
| 6,22 s | 202 | `ABGESCHLOSSEN/FEHLGESCHLAGEN` (ABBRUCH) | null | **1,18 s** |
| 12,10 s | 202 | `ABGESCHLOSSEN/FEHLGESCHLAGEN` (ABBRUCH) | null | **0,81 s** |

Alle drei trafen den laufenden Prozess und wirkten. Zum Vergleich der davor
reproduzierte Fehlfall (Abbruch fiel in die Nachbereitung): 202, aber
`ABGESCHLOSSEN/ERFOLGREICH`, `exitCode 0`, 0,50 s bis terminal — dieser Fall ist es,
den die UI seit diesem Fix sichtbar meldet. Der Browser-Klicktest bleibt bei Stefan.

## Aufschlüsselung — wohin die Zeit eines Chat-Turns wirklich geht

Anlass: die Aussage aus "Abbruch Runde 2" ("zwischen Prozessende und
Terminal-Checkpoint liegen zweistellige Sekundenbeträge") war **abgeleitet**, nicht
gemessen — aus (`run_prepared`→Terminal) minus `duration_ms`. Diese Rechnung schlägt
CLI-Start und -Ende, die INNERHALB des Werkzeugprozesses liegen, fälschlich der
Nachbereitung zu. Jetzt direkt gemessen.

**Ergänzte Zeitmarken** (nur bei `LEITSTAND_ZEITMESSUNG=1`, sonst No-op wie bisher;
eine Ausgabezeile je Lauf unverändert): `rohstrom_geschrieben` (trennt den
Rohstrom-Schreibvorgang vom Laufakte-Lineage-Schreibvorgang,
`src/claude-code-gateway/index.ts`), `klassifikation_begonnen` und
`terminal_checkpoint_geschrieben` (`src/execution-controller/index.ts` — die
Klassifikation schreibt die terminale Wirkungsmarke über F1B),
`chat_nachbereitung_begonnen`, `laufakte_geladen`, `chat_eintrag_geschrieben` bzw.
`chat_fehlereintrag_geschrieben` (`scripts/leitstand-server.mjs`). Die bisherige Marke
`lineage_chat_eintrag_geschrieben` heißt jetzt `chat_eintrag_geschrieben`.

**Aufbau:** Leitstand aus diesem Hauptrepo mit `LEITSTAND_ZEITMESSUNG=1` neu gestartet
(Startvorlage `startvorlagen/beispielprojekt.json`, Worker `claude-code`), 5 echte
Jarvis-Turns mit kurzen, verschiedenen Fragen, **keine Abbrüche**, alle 5 terminal
`ERFOLGREICH`/`exitCode 0`. Zu Beginn liefen **16 `claude.exe`** auf dieser Maschine
(`tasklist`, real geprüft) — dieselbe Last-Situation wie in den Runden davor.

| Turn | a) Eingang→Prozessstart | b) Prozess-Wandzeit | c) `duration_ms` (CLI-intern) | b−c (CLI-Start/-Ende) | d) Prozessende→Terminalmarke | e) Terminalmarke→Chat-Eintrag | f) gesamt |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 282 ms | 26.698 ms | 23.006 ms | **3.692 ms** | **21 ms** | 25 ms | 27.026 ms |
| 2 | 207 ms | 8.317 ms | 5.230 ms | **3.087 ms** | **14 ms** | 22 ms | 8.561 ms |
| 3 | 363 ms | 18.927 ms | 15.718 ms | **3.209 ms** | **10 ms** | 8 ms | 19.308 ms |
| 4 | 226 ms | 12.714 ms | 9.652 ms | **3.062 ms** | **17 ms** | 9 ms | 12.966 ms |
| 5 | 374 ms | 5.951 ms | 2.727 ms | **3.224 ms** | **13 ms** | 6 ms | 6.344 ms |

Größte Einzelposten in **d)** (Nachbereitung bis Terminalmarke): Klassifikation →
Terminalmarke 5–12 ms, Rohstrom → Laufakte-Lineage 3–7 ms, Prozessende → Rohstrom
1–4 ms, Laufakte → Klassifikationsbeginn 0 ms. In **e)**: Chat-Eintrag schreiben
3–8 ms, Terminalmarke → Nachbereitungsbeginn 2–12 ms, Laufakte laden 1–4 ms.

### Fazit

**b−c dominiert, d ist vernachlässigbar:** die Nachbereitung nach dem Prozessende
kostet 10–21 ms (plus 6–25 ms bis zum Chat-Eintrag), während allein CLI-Start und
-Ende innerhalb des Werkzeugprozesses bei bemerkenswert konstanten **3,0–3,7 s** je
Turn liegen — bei Turn 5 mehr als die gesamte Modellarbeit (2,7 s).

### Korrektur an "Abbruch Runde 2"

Die dortige Aussage "zwischen Prozessende und Terminal-Checkpoint liegen
zweistellige Sekundenbeträge" ist damit **widerlegt** — real sind es Millisekunden.
Das Fenster, in dem ein Abbruch mit 202 quittiert wird, ohne wirken zu können, ist
entsprechend nur einige Dutzend Millisekunden breit, nicht Sekunden. Der dort
dokumentierte reale Fehlfall (Abbruch nach 12,19 s → 202 → `ERFOLGREICH` 0,495 s
später) bleibt als Beobachtung bestehen, seine Erklärung über ein weites
Nachbereitungsfenster trägt aber nicht: plausibler ist ein Wettlauf unmittelbar am
Prozessende (Prozess hatte seine Ausgabe bereits vollständig geschrieben und beendete
sich, bevor das Signal wirkte). **Nicht abschließend geklärt** — dafür fehlt eine
Messung, die den Abbruchzeitpunkt gegen `prozess_beendet` desselben Laufs stellt.
Der UI-Fix (sichtbarer Hinweis "Abbruch kam zu spät") bleibt davon unberührt richtig,
weil er den beobachtbaren Ausgang meldet, nicht die Ursache.

**Für Jarvis Live (persistente Sitzung) heißt das:** die ~3,1 s CLI-Start/-Ende je
Turn sind der Posten, den eine persistente Sitzung einspart; an der Nachbereitung
(~30 ms) und der Modellarbeit selbst ändert sie nichts.

## Zustand-Poll — warum der Leitstand "ewig lädt" und der Abbruch nicht wirkt

Auslöser: Stefans Netzwerk-Konsole (21.09.2026, ~11:58) — `GET .../zustand` → 200,
88,57 kB, Wartezeit **109.001 ms und 110.314 ms, also 109 s und 110 s** (nicht 109/110 ms —
der Punkt ist der Tausendertrenner), **weitere zustand-Anfragen ohne Status in der
Warteschlange**. Dazu: Leitstand lädt ewig, Senden ≥10 s, "Lauf abbrechen" wirkt nicht —
während dieselben Aufrufe per API in 19–57 ms durchgingen.

### 1a) Route und Messung im Leerlauf

Pfad: **`GET /api/zustand`** (`scripts/leitstand-server.mjs:4081`, Client
`public/leitstand/api.js:72` über `mitPraefix('/zustand')`).

Erste Messung gegen den damals laufenden Leitstand (10× hintereinander, 88.389 B je
Antwort): **13,98 / 35,80 / 45,22 / 13,05 / 21,37 / 2,13 / 2,20 / 2,07 / 1,98 / 2,25 s**.
Das fallende Muster ist die Signatur einer sich leerenden **Warteschlange**: die curl-
Aufrufe standen hinter dem Stapel, den der offene Browser-Tab erzeugt hatte. Gegen einen
frisch gestarteten Server ohne Stapel kostete dieselbe Route **0,08–0,22 s**.

### 1b) Während eines aktiven Jarvis-Chat-Laufs

10 Messungen mit laufendem Chat-Lauf: **0,12–0,31 s** (88.874–89.978 B). Ein aktiver
Lauf verteuert die Route also kaum — er war nie die Ursache.

### 1c) Serverseitige Aufschlüsselung

Bestand dieses Repos: **654 Verzeichnisse** unter `kontrollzustand/`, 912 Dateien, alle
654 mit `checkpoints/`-Unterverzeichnis; davon 164 echte Lauf-Verzeichnisse, 486
`lineage-*`, 16 Workflows.

Alles **synchron** auf dem Event-Loop: `sammleLaeufe` **70–81 ms**, `sammleWorkflows`
**2 ms** (per Instrumentierung gemessen). `sammleLaeufe` iteriert ALLE 654 Verzeichnisse
und bildet je Verzeichnis **zwei** Änderungsstempel (eigene Kette +
`lineage-entscheidung-<laufId>`), jeder bisher aus `existsSync` + `readdirSync().length`
+ `statSync().mtimeMs` — rund 3.900 synchrone Dateisystemaufrufe pro Abfrage, **auch
wenn jeder Lauf im Cache lag**. Isoliert nachgemessen über den echten Bestand: die
Stempelbildung allein kostet **79,1 ms** — praktisch die gesamten ~75 ms von
`sammleLaeufe`.

### 1e) Poll-Frequenz und Überlappung — die eigentliche Ursache

`public/leitstand/zustand.js:89`: `setInterval(pollZustand, 2000)` feuerte **unbedingt**.
Ein Überlappungsschutz existierte nicht: dauerte eine Abfrage länger als 2 s, startete
der nächste Tick trotzdem. Die Anfragen stapeln sich dann unbegrenzt (HTTP/1.1, 6
Verbindungen je Host, Rest in der Browser-Warteschlange — genau das "ohne Status" in
Stefans Konsole). Und weil der Server das Aggregat **synchron** baut, blockiert jede
wartende Zustandsabfrage `POST /api/chat` und `POST /api/laeufe/<id>/abbrechen`
dahinter.

**Ehrliche Lücke in dieser Kette:** ein Stapel wächst nur, wenn eine EINZELNE Abfrage
≥ 2 s braucht. Frisch gestartet braucht sie 0,08–0,3 s — der Überlappungsschutz allein
erklärt den Einstieg in den Stapel also NICHT. Die letzten fünf curl-Werte gegen den
alten Prozess (1,98–2,25 s, nach Leerung der Warteschlange) liegen genau an der
2-Sekunden-Schwelle und sind 10–20× langsamer als frisch. Warum ein länger laufender
Leitstand-Prozess so viel langsamer antwortet, ist **offen** und als **F-556** notiert —
der Überlappungsschutz verhindert die Eskalation, beseitigt aber nicht ihre Ursache.

### 1d) Regression? Nein.

Worktree von `main` (`git worktree add`, `npm ci`), **denselben** `kontrollzustand/`-
Bestand hineinkopiert (654 Verzeichnisse, verifiziert), Leitstand dort auf Port 4180,
10× dieselbe Messung: **0,080–0,283 s** (Median ~0,118 s) — praktisch identisch mit dem
Branch vor dem Fix. Die Kosten der Route und der fehlende Überlappungsschutz sind
**Bestand von main**, keine Regression dieses Branches. (`zustand.js` war auf diesem
Branch bis zu diesem Fix unverändert.) Abweichung vom Auftrag: der Worktree-Pfad
`..\claude-worktrees\...` scheiterte reproduzierbar mit `fatal: Could not reset index
file to revision 'HEAD'`; genutzt wurde `..\ai-workforce-main-check` (dort erfolgreich).

### 2) Fix

- **`public/leitstand/zustand.js`** (Ursache): ein laufender Poll-Tick wird in
  `laufenderPoll` gehalten; ein weiterer Anstoß **läuft am selben Tick mit**, statt einen
  zweiten Abruf zu starten. Bewusst Mitbenutzen statt Überspringen, damit `pollJetzt()`
  seine Zusage behält, erst zurückzukehren, wenn wirklich ein Zustand geholt wurde.
  Kein neuer `setInterval` (AK3 unberührt, weiterhin genau einer).
- **`scripts/leitstand-server.mjs`** (Kosten): `leseCheckpointVerzeichnisStempel` nutzt
  `statSync(..., { throwIfNoEntry: false })` statt `existsSync` + `statSync` — der
  Nichtexistenz-Fall ist derselbe Systemaufruf statt ein zusätzlicher. Die Dateianzahl
  bleibt Teil des Stempels (ohne sie hinge die Invalidierung allein an der
  Verzeichnis-mtime). Stempelbildung **79,1 ms → 52,0 ms** über den echten Bestand.

### 3) Gate

`scripts/check-f20-zustand-poll.mjs`, zwei neue Blöcke:
- **(d)** `GET /api/zustand` gegen den **realen** `kontrollzustand/`-Bestand dieses Repos,
  **Median aus 7 Abrufen < 300 ms** (Median statt Maximum: ein einzelner Ausreißer durch
  fremde CPU-Last ist kein Befund an dieser Route — diese Falle steht in `CLAUDE.md` und
  hat in diesem Repo real schon zu einer Fehldeutung geführt).
- **(e)** Verhaltensprüfung des Überlappungsschutzes: `zustand.js` wird mit gestubbtem
  `fetch`/`document` real importiert, drei gleichzeitige Anstöße müssen **genau einen**
  Abruf auslösen, und nach Abschluss muss der nächste Tick wieder abrufen (Sperre bleibt
  nicht hängen).

**Rot-Fall real nachgewiesen:** mit ausgebautem Überlappungsschutz meldet (e)
`drei gleichzeitige Poll-Anstöße lösten 3 Abrufe aus, erwartet genau 1`; mit Schutz grün.
Ehrliche Einordnung von (d): der ursprüngliche Ausfall (bis 45 s) entstand durch den
Stapel, nicht durch die Einzelabfrage — (d) wäre davor **nicht** rot gewesen (Median
~118 ms). (d) sichert die Einzelkosten gegen künftiges Wachstum, (e) sichert die
tatsächliche Ursache.

### 4) Vorher/Nachher (identischer Bestand, 654 Verzeichnisse)

| Messung | Vorher (main, Port 4180) | Nachher (Branch mit Fix) |
|---|---|---|
| `GET /api/zustand`, 10× | 0,080–0,283 s, Median ~0,118 s | **0,050–0,171 s, Median ~0,057 s** |
| Stempelbildung isoliert | 79,1 ms | **52,0 ms** |
| Überlappende Polls | unbegrenzt (Stapel bis 45 s je Abfrage) | **keine** (3 Anstöße → 1 Abruf) |
| Gate-Median (7 Abrufe) | — | **57 ms < 300 ms** |

### 5) Langlauf-Messung zu F-556 (real, 21.09.2026)

Gemessen gegen den seit dem Fix laufenden Leitstand (PID 3028, `LEITSTAND_ZEITMESSUNG=1`),
**Prozessalter 11,5 min**, RSS **95,3 MB** (Private 76,7 MB), CPU-Zeit gesamt **284,7 s**
(= ~41 % eines Kerns im Dauerbetrieb), **16 `claude.exe`** auf der Maschine.

10× `GET /api/zustand`: **2,44 / 4,58 / 3,32 / 4,16 / 4,28 / 5,18 / 4,57 / 4,73 / 2,98 /
3,13 s** — also **deutlich > 1 s**, gegenüber 0,050–0,171 s desselben Codes unmittelbar
nach dem Start.

**Eingrenzung.** Entscheidend ist ein Gegentest: ein FRISCHER node-Prozess, der zeitgleich
und auf demselben Bestand exakt dieselbe Dateisystemarbeit macht, brauchte **78,1 ms**
(gegenüber 52,0 ms bei ruhiger Maschine) — die Systemlast verteuert die FS-Arbeit also nur
um Faktor ~1,5, nicht um Faktor 30–60. Gleichzeitig zeigte `Get-NetTCPConnection` auf Port
4173 **11 bzw. 26 gleichzeitig offene Verbindungen**: Stefans Browser-Tab läuft noch mit dem
**ungepatchten** Client und stapelt weiter Polls. Die beobachteten 2,4–5,2 s passen
quantitativ zu (Warteschlangentiefe × Servicezeit) — ~26 × ~0,15 s ≈ 3,9 s.

**Daraus folgt:** die Einzel-Servicezeit des alten Prozesses ist mit dieser Messung **nicht**
bestimmt, weil die Warteschlange nie leer war. Der gemessene Wert > 1 s ist Wartezeit, nicht
belegte Rechenzeit je Abfrage. Ob es ZUSÄTZLICH einen Alterungsanteil gibt (Cache-Wachstum,
GC), bleibt **offen** — dafür bräuchte es eine Messung ohne jeden anderen verbundenen
Client. F-556 bleibt damit offen; die naheliegendste Erklärung ist derzeit der
Warteschlangenstau durch den noch nicht neu geladenen Browser-Tab, nicht Prozessalterung.
RSS 95 MB nach 11,5 min zeigt kein Leck-Muster.

## Hängender Abruf im Browser (F-561) — Abbruch löst in der UI nicht auf

Befund aus Stefans Browser-Test (21.09.2026, 12:44–12:45 UTC, mit dem **gefixten** Client):
Laden und Senden schnell, aber "Lauf abbrechen" löste die UI nicht auf. In der
Netzwerk-Konsole hingen `GET .../jarvis-jarvis-chat-f16a63dc-…` (holeLaufDetail) und ein
`GET .../zustand` **ohne Status**; andere zustand-Abrufe: 1.769 / 1.669 ms (89 kB).
Initiator der Fetches laut Konsole **`main.js:5747`**, nicht `api.js` — dasselbe `main.js`
schickt XHRs an `ff.kis.v2.scr.kaspersky-labs.com`.

### a) Server-Log 12:44:45–12:45:30 UTC

Der Lauf `jarvis-jarvis-chat-f16a63dc-…` ist serverseitig sauber und vollständig
abgebrochen worden: `run_prepared` 12:44:47.952Z, Laufakte 12:44:57.783Z, terminale
Wirkungsmarke 12:44:57.813Z, `laufstatus_festgestellt` ABGESCHLOSSEN 12:44:57.822Z. Die
Zeitmessungszeile endet erwartungsgemäß bei `terminal_checkpoint_geschrieben` (kein
Chat-Eintrag, weil der Lauf ABBRUCH und nicht ERFOLGREICH war). `POST …/abbrechen` ist
also angekommen und hat gewirkt — **rund 10 s vor** dem Zeitpunkt, an dem die UI noch
immer wartete. Einschränkung: der Leitstand führt kein Zugriffs-Log, der genaue
Antwortzeitpunkt der GET-Detailanfrage ist daraus **nicht** ablesbar.

### b) Dieselben Routen jetzt per curl (10×)

| Route | Messwerte | Größe |
|---|---|---|
| `GET /api/zustand` | 0,053–0,123 s | 89.843 B |
| `GET /api/laeufe/<laufId>` (Detailroute) | **0,0065–0,0537 s** | 1.917 B |

Zum Vergleich der Browser: 1,669–1,769 s für dieselbe zustand-Route, und die Detailroute
ohne Status hängend.

### c) Einordnung: es hing im Browser, nicht am Server

Der Server beantwortet die Detailroute in **unter 54 ms** und liefert 1,9 kB. Ein Hänger
"ohne Status" bei gleichzeitig 6–54 ms Serverantwort ist serverseitig nicht erklärbar;
zusammen mit dem Initiator `main.js` (statt `api.js`) und den Kaspersky-XHRs ist die
naheliegende Erklärung ein injiziertes Skript, das sich um `window.fetch` legt. Das liegt
**außerhalb dieser Anwendung** — sie kann es nicht reparieren, aber sie darf nicht daran
stehen bleiben.

### Fix (F-561 + F-560)

- **`public/leitstand/api.js`**: `holeLaufDetail` und `holeZustand` laufen mit
  `AbortSignal.timeout(5000)`. Ein hängender Abruf endet damit nach 5 s als Fehlschlag;
  der Chat-Poll zählt den Tick als gescheitert und versucht es 500 ms später erneut, der
  Zustands-Poll gibt `laufenderPoll` wieder frei. 5 s ist großzügig gegenüber den real
  gemessenen < 0,2 s und kurz genug, dass eine Auflösung nicht spürbar hängt.
- **`public/leitstand/zustand.js`** (F-560): jeder Detail-Auffrischer einzeln gefangen
  (Muster der `abnehmer`-Schleife). Ein Wurf beendete `fuehrePollTickAus` sonst mit einer
  Ablehnung — die an `laufenderPoll` gehängte Nachlauf-Kette läuft aber nur im
  Erfüllungsfall an, ein einziger werfender Auffrischer hätte den angeforderten Nachlauf
  dauerhaft ausfallen lassen.

**Gates** in `scripts/check-f20-zustand-poll.mjs`, beide Rot-Fälle real nachgewiesen:
- **(g)** nie antwortender fetch-Stub → Tick endet am Zeitlimit, Schleife läuft weiter und
  löst mit der nächsten echten Antwort auf. Ohne Zeitlimit: *"ließ den Poll-Tick auch nach
  8 s noch hängen"*.
- **(f)** werfender Detail-Auffrischer → Tick und Nachlauf überleben (2 Abrufe, keine
  Ablehnung). Ohne `try/catch`: *"ließ pollJetzt() mit einer Ablehnung enden"*.

## F40 WS-1 — auf die result-Zeile reagieren statt auf das Prozessende

Grundlage: `state/spike-f40-streaming.md` (dort: result-Zeile → Prozessende 590–730 ms,
7 Spike-Läufe). Branch `feat/f40-ws1-streaming`.

**Umgesetzt:**
- `baueAufruf`: `--output-format stream-json --verbose` statt `json`.
- `prozessstart.ts`: stdout wird weiter als String gepuffert, bei
  `StarterOptionen.ergebnisZeileBeendet` zusätzlich zeilenweise gelesen. Die erste
  vollständige `type:"result"`-Zeile löst den Starter sofort auf (`exitCode: null`, weil
  real noch keiner existiert, `ergebnisZeileVorProzessende: true` im Rohstrom). Kam keine
  result-Zeile, entscheidet unverändert die close-Klassifikation (maxBuffer, ABBRUCH,
  TIMEOUT, startfehler, exitCode) — F-570. Ein Zeilenrest ohne `\n` wird nie geparst.
- `leseErgebnisobjekt`: nimmt die letzte result-Zeile aus NDJSON, ein gepuffertes
  json-Objekt (jeder alte Rohstrom) bleibt lesbar. Alle Leser (`leseRollenErgebnisRohstrom`,
  Result Evaluator, Router, Leitstand-Projektion) laufen darüber, ohne eigene Änderung.
  `entferneCodezaun`/`extrahiereErstesJsonObjekt` sind unverändert.
- Werkzeug-Fortschritt: `tool_use`-Zeilen → `GatewayOptionen.beiWerkzeugaufruf` →
  In-Memory `laufAktivFortschritt` (kein Checkpoint, D4) → `GET /api/laeufe/<laufId>`
  Feld `fortschritt` → der bestehende 500ms-Poll in `chat.js` zeigt „liest
  ai-workforce/docs/STATUS.md …“ unter dem Tippindikator. Kein neuer Transport.
- Zeitmessung: neue Gateway-Marke `prozess_close`. Weil der Prozess jetzt NACH der
  Chat-Nachbereitung endet, gibt der Leitstand für diese späte Marke eine zweite
  Zeitmessungs-Zeile aus.

**Gates:** (a) Abbruch und Timeout mitten im Stream (keine result-Zeile, Fragment ohne
Zeilenende) → ABBRUCH/TIMEOUT, kein Hänger, kein Parse-Wurf. (b) echter Kindprozess:
Auflösung vor `close`, Differenz > 0. (c) die fünf Extraktionsfälle aus
`check-f31-gedaechtnis.mjs` (i) laufen jetzt zusätzlich gegen ein NDJSON-stdout mit
result-Zeile (inkl. Köder: result-förmiger Text in einer `tool_result`-Zeile).
Rot-Fälle real: früher Erfolgspfad abgeschaltet → 3 Tests rot, darunter (b);
Zeilen-Parse ohne try → 2 Tests rot, darunter (a); alter `leseErgebnisobjekt` → 4
stream-json-Fälle in (i) rot.

**Realer Nachweis — 5 echte Jarvis-Chat-Turns** (21.09.2026, Leitstand aus diesem Branch,
`LEITSTAND_ZEITMESSUNG=1`, Startvorlage `beispielprojekt.json`, Worker `claude-code`,
18 fremde `claude.exe` auf der Maschine). Poll wie `chat.js` (500 ms). Alle 5
`ABGESCHLOSSEN`/`ERFOLGREICH`, stderr leer, `ergebnisZeileVorProzessende: true`.

| Turn | Frage | `num_turns` | Start→result (neu fertig) | Start→Prozessende (früher fertig) | **Gewinn** | result→Chat-Eintrag | Client gesamt | Fortschritts-Anzeigen |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Hallo | 1 | 4.802 ms | 5.379 ms | **577 ms** | 24 ms | 5.203 ms | 0 |
| 2 | Wie ist der Roadmap-Stand? | 1 | 5.667 ms | 6.258 ms | **591 ms** | 27 ms | 6.179 ms | 0 |
| 3 | Was steht in docs/STATUS.md …? Lies die Datei. | 2 | 8.614 ms | 9.205 ms | **591 ms** | 27 ms | 9.278 ms | 1 (Read STATUS.md) |
| 4 | Welche Findings sind P1 und offen? … | 6 | 30.111 ms | 30.672 ms | **561 ms** | 40 ms | 30.899 ms | 5 (1 Read, 4 Grep) |
| 5 | Was hast du eben gesagt? | 1 | 6.692 ms | 7.301 ms | **610 ms** | 20 ms | 7.204 ms | 0 |

„Früher fertig“ ist das Prozessende im SELBEN Lauf. Dort hat der alte Code aufgelöst, der
Vergleich ist also Vorher/Nachher ohne Streuung zwischen zwei Modellläufen. Ein A/B-Lauf
gegen `main` wurde bewusst nicht als Beleg genommen: die Laufzeiten streuen zwischen
5 und 30 s, 0,6 s gingen darin unter.

**Ergebnis:** 561–610 ms Gewinn je Turn, 5 von 5, im Spike-Band (590–730 ms). Der
Chat-Eintrag steht jetzt 20–40 ms nach der result-Zeile, also rund 0,55 s vor dem
Prozessende. Werkzeug-Fortschritt kam live im Poll an (Turn 4: 5 Zwischenstände).
Die Darstellung im Browser wurde nicht angesehen, nur die API-Antwort des Polls.

**Korrekturrunde nach Code-Review/QA-Pass** (beide mit frischem Kontext):
- F-570-Sperre als reine Funktion `darfFruehAufloesen` mit Rot-Fall. Vorher hätte man die
  Bedingung löschen können, ohne dass ein Test rot wurde. Rot real: Sperre entfernt → Test rot.
- **Nachlauffrist** (`NACHLAUF_FRIST_MS` = 5 s): lebt der Prozess 5 s nach der result-Zeile
  noch, wird er gekillt (plus Windows-Baum-Kill) und das geloggt. Ohne diese Frist würde ein
  hängender, fachlich fertiger Prozess unbeaufsichtigt weiterlaufen, weil der Leitstand D13
  direkt nach der Auflösung freigibt. Rot real: Frist abgeschaltet → Test rot (Prozess lief 20 s).
- **D13-Abwägung (Entscheidung offen, Stefan):** Zwischen result-Zeile und Prozessende
  (real ≈0,6 s, höchstens 5 s) kann ein Folgelauf starten. Dann laufen kurz zwei
  Werkzeugprozesse, obwohl der erste fachlich fertig ist. `ARCHITECTURE.md` §7 verbietet
  „zwei gleichzeitig aktive Arbeitsstränge“. Umgesetzt ist: ein fachlich fertiger Prozess
  zählt nicht als aktiver Strang, die Nachlauffrist begrenzt das Fenster. Die Alternative
  wäre, D13 erst beim Prozessende freizugeben. Das kostet nichts an der Anzeige, verzögert
  aber den nächsten Start um ≈0,6 s.
- Laufansicht: Exit-Code zeigt „— (bei der Ergebniszeile vor Prozessende aufgelöst)“ statt
  „unbekannt“ (Projektion `ergebnisZeileVorProzessende`). Ein Exitcode ≠ 0 oder ein
  Signal-Kill nach der result-Zeile wird geloggt (nicht mehr nur Exitcodes ≠ 0/≠ null).
- Tests ergänzt: Abbruch NACH der result-Zeile (Ergebnis bleibt Erfolg, der Prozess wird
  trotzdem beendet), Nachlauffrist greift und greift nicht, `starteGateway` reicht
  `ergebnisZeileBeendet`/`beiWerkzeugaufruf` durch und schreibt das Flag in den Rohstrom.
- Fortschrittstext: Ziele auf 60 Zeichen gekürzt (lange Grep-Muster), Feld `anzahl` entfernt
  (wurde nicht angezeigt), Typ `Werkzeugaufruf` nach `types.ts`.

**Bekannte Grenzen (nicht behoben):**
- **Rohstrom-Größe:** Die 5 Turns erzeugten 7/7/67/17/7 KB, alte json-Jarvis-Rohströme im
  Median 3 KB (n = 94, max 65 KB). Grund: `tool_result`-Zeilen enthalten ganze Dateien. Für
  den Chat liegt das weit unter der 64-MB-maxBuffer-Grenze. Für lange schreibende Läufe mit
  vielen großen Reads ist es nicht gemessen.
- stderr, das erst nach der result-Zeile kommt, fehlt im Rohstrom.
- Ungetestet: Server-Projektion `fortschritt` und `beschreibeFortschritt` (chat.js hat keinen
  Testeinstieg), Browser-Klicktest (Fortschritt, Abbruch während und nach der result-Zeile).

## Status
- [ ] Freigegeben
- [x] Freigegeben mit Hinweisen
- [ ] Nicht freigegeben
- [ ] Blockiert

## Nächster sinnvoller Schritt
Stefan: 1) Browser-Klicktest für den Abbruch-Fix (Nachricht senden, nach
~3s abbrechen — Button muss jetzt ausgeblendet werden statt hängen zu
bleiben). 2) Befund 4 entscheiden (MAX_THINKING_TOKENS=0 behalten oder
zurücknehmen — der belegte Zusammenhang ist Prosa+Codezaun, nicht der
bezug-Selbstverweis). Danach aus Runde 1 weiterhin offen: Schritt d)
(Browser-Turns) nachliefern, drei Findings aus Runde 1 anlegen, plus ein
neues Finding für den bezug-Selbstverweis (Befund 4). Freigabe/Commit liegt
bei Stefan — dieser Auftrag committet nichts selbst.

## F40 WS-2 — Lagebild statt Werkzeug-Runden

Grundlage: `state/spike-f40-streaming.md` §3/§5 (`docs/STATUS.md` ist in 11 von 15
Mehrrunden-Läufen der erste Zugriff; `state/findings.md`, 592 KB, wird mehrfach
gegrept statt einmal vorab mitgegeben). Branch `feat/f40-ws2-lagebild`.

**Umgesetzt:** `scripts/erzeuge-lagebild.mjs` baut `docs/projekt/kontext/lagebild.md`
deterministisch (kein Zeitstempel) aus `docs/STATUS.md` (Abschnitt "Aktuelle Phase",
wörtlich) und `state/findings.md` (alle offenen P1-Köpfe `**F-NNN** · \`TYP\` · P1 ·
offen` + deren `Titel:`-Zeile, sortiert). `baueProjektkontextAnfragen`
(`scripts/leitstand-server.mjs`) bekommt eine vierte, `notwendig: true`-Anfrage
`${kontextPfad}/lagebild.md` — für `jarvis` UND `router`, gefiltert über die
bestehende `filtereExistierendeAnfragen` (fehlt die Datei, läuft der Lauf trotzdem,
kein neuer Blocker). `scripts/check-f40-lagebild.mjs` (neu in `npm run check`)
prüft Drift zwischen Quelle und committeter Datei real (Grün- und Rot-Fall, Rot real
gegen die tatsächlich committete Datei reproduziert, siehe unten) sowie die
Parser-Grenze zwischen P1/offen und anderen Prioritäten/Status.

**`docs/STATUS.md` vor der Erzeugung korrigiert** (Schritt 3 dieses Auftrags, siehe
Bericht): F32 stand dort als `ABGESCHLOSSEN`, `features/F32/feature.md` sagt
`IN_ARBEIT` (WS-2 UI-Ansicht offen) — STATUS.md war falsch, korrigiert. F40 fehlte
komplett, ergänzt. F30 ("noch nicht begonnen") war bereits korrekt.

**Realer Drift-Nachweis (Red-Case) gegen die tatsächliche Datei:** eine Zeile an
`docs/projekt/kontext/lagebild.md` angehängt, `node scripts/check-f40-lagebild.mjs`
lief real auf Exit 1 (Befund (a): Datei weicht vom erzeugten Inhalt ab), Datei danach
wiederhergestellt, Gate erneut Exit 0. `npm run check` bricht bei Drift also real ab,
nicht nur in einem isolierten Testverzeichnis.

**Realer Nachweis — 5 echte Jarvis-Chat-Turns** (21.09.2026, `LEITSTAND_ZEITMESSUNG=1
LEITSTAND_PORT=4180 node scripts/leitstand-server.mjs`, Startvorlage
`beispielprojekt.json`, Worker `claude-code`, gegen dieses Repo als Projekt
`ai-workforce`). **Vorbehalt Systemlast** (gleiche Maschine wie die übrigen
Nachweise dieses Dokuments): 16 fremde `claude.exe` liefen parallel — absolute
Zeiten sind dadurch nicht mit einer unbelasteten Maschine vergleichbar, das
gemessene Verhalten (Werkzeugaufrufe ja/nein) ist davon unabhängig.

| Frage | `num_turns` | `dauer_ms` | `STATUS.md` als Werkzeugaufruf | `findings.md` als Werkzeugaufruf | Andere Werkzeugaufrufe | Antwort inhaltlich korrekt |
|---|---:|---:|---:|---:|---|---|
| Wo stehen wir gerade in der Roadmap? | 1 | 4.028 | 0 | 0 | keine | ja |
| Welche P1-Findings sind offen? | 2 | 5.834 | 0 | 0 | keine | ja (37 IDs korrekt genannt, Modell zählte sie selbst als "36" — Zähl-Off-by-one des Modells, keine fehlende ID) |
| Was ist der aktuelle Phasen-Stand des Projekts? | 1 | 7.541 | 0 | 0 | keine | ja, inkl. korrekt referenziertem F32-Fix |
| Ist F32 schon abgeschlossen? | 3 | 6.958 | 0 | 0 | `Read features/F32/feature.md`, `Read ~/.claude/…/memory/MEMORY.md` | ja |
| Gibt es offene P1-Findings zu Codex? | 1 | 6.658 | 0 | 0 | keine | ja (alle 10 Codex-P1-TECH_DEBT korrekt genannt) |

Geprüft direkt am echten Rohstrom (`kontrollzustand-roh/<laufId>/rohstrom.json`,
`tool_use`-Blöcke nach `STATUS.md`/`findings.md` im `input` durchsucht) und an der
echten Laufakte (`verbrauch.turns`/`verbrauch.dauer_ms`, F32), nicht nur an der
Chat-Antwort. **0 von 5 Läufen riefen `docs/STATUS.md` oder `state/findings.md` als
Werkzeug auf** — beide Quellen kamen ausschließlich über die vierte
Context-Builder-Einspeisung (Lagebild) an. Zum Vergleich der Spike-Befund
(`state/spike-f40-streaming.md` §3): `docs/STATUS.md` war dort in 11 von 15
Mehrrunden-Läufen ein Werkzeugaufruf, `state/findings.md` in 4 von 15 (bis zu 5×
gegrept in einem einzelnen Lauf) — in dieser Stichprobe (n=5, danach) kein einziger
mehr.

Turn 4 (`Ist F32 schon abgeschlossen?`) griff stattdessen gezielt auf
`features/F32/feature.md` zu — erwartet und richtig: das Lagebild trägt nur die
STATUS-Kurzfassung, nicht den Feature-Akte-Detailtext. Derselbe Lauf griff zusätzlich
auf `~/.claude/projects/…/memory/MEMORY.md` zu — real reproduziert derselbe
Nebenbefund wie im WS-0-Spike (§3: "Jarvis liest das Claude-Code-Gedächtnis des
Entwicklers, nicht Projektkontext, trotz `--setting-sources ''`"). Nicht behoben
(F-567, ausdrücklich außerhalb des Scopes dieses Auftrags).

`num_turns` bleibt bei 5/5 Läufen unter dem, was Mehrrunden-Statusfragen laut Spike
sonst brauchten (die Findings-Frage allein hätte vorher potenziell mehrere Greps
gekostet, hier 0). Kein A/B-Vergleich gegen denselben Fragensatz ohne Lagebild
durchgeführt (hätte einen zweiten Branch-Checkout gebraucht) — der Befund stützt
sich auf die direkte Beobachtung "kein einziger Werkzeugaufruf gegen die beiden
Zieldateien", nicht auf eine Zeitersparnis-Hochrechnung.

Freigabe/Commit liegt bei Stefan (F40 WS-2 committet nichts selbst). Bei Freigabe:
F30 (Dogfooding-Gate) bleibt der einzige noch unbehandelte STATUS-Punkt aus diesem
Auftrag (real geprüft, keine Akte, keine Commits — "noch nicht begonnen" ist
korrekt, keine Korrektur nötig). Empfehlung für eine künftige Iteration: einen
Pre-Commit-Hook oder CI-Schritt erwägen, der `node scripts/erzeuge-lagebild.mjs`
automatisch vor jedem Commit auf `docs/STATUS.md`/`state/findings.md` laufen lässt
— aktuell erkennt `npm run check` Drift erst beim nächsten vollen Lauf, nicht sofort
beim Ändern der Quelle.

## F40 WS-3 — Auto-Memory-Zugriff für jarvis/router unterbunden (löst F-567)

Auftrag: der in WS-2 Turn 4 real reproduzierte Nebenbefund — ein `claude-code`-Prozess
liest trotz `--setting-sources ''` `~/.claude/projects/…/memory/MEMORY.md` (fremder
Entwicklerkontext statt Projektkontext, plus eine zusätzliche Werkzeug-Runde) — sollte
für `jarvis`/`router` unterbunden werden, `ausfuehrung` unverändert. Branch
`fix/f40-ws3-auto-memory` von `main` (974757c).

### 1) Ursache und Abschaltweg (real belegt, nicht geraten)

`claude --help`: `--setting-sources` ist dokumentiert als "Comma-separated list of
setting sources to load (user, project, local)" — reine Datei-Auswahl. Der einzige
Treffer für "memory" im Zusammenhang mit einem Abschaltweg ist `--bare`. WebFetch
gegen `code.claude.com/docs/en/headless` §"Start faster with bare mode" (wörtlich):
"Add `--bare` to reduce startup time by skipping auto-discovery of hooks, skills,
custom commands, subagents, plugins, MCP servers, **auto memory**, and CLAUDE.md."
— und weiter: "`--bare` is the recommended mode for scripted and SDK calls, and will
become the default for `-p` in a future release." Damit ist belegt: Auto-Memory ist
kein Settings-Wert, sondern ein eigener CLI-Systemprompt-Baustein, den
`--setting-sources` nicht steuert — die WS-2/WS-0-Beobachtung ("trotz
`--setting-sources ''`") ist also keine Anomalie, sondern erwartetes Verhalten der
CLI.

`--bare` selbst ist für diesen Aufruf **nicht verfügbar**: `src/invocation-policy/
verbotene-aufrufparameter.ts`s `VERBOTENE_AUFRUFPARAMETER` (E-182) verbietet `--bare`
für JEDEN Aufruf dieses Repos, unabhängig von der Rolle — eine bereits vor diesem
Auftrag bestehende Policy-Entscheidung, nicht Teil dieses Fixes. Zusätzlich schaltet
`--bare` real mehr ab als nur Auto-Memory (Hooks, CLAUDE.md, Attribution) — für
`router` (`--setting-sources` bleibt default `project`) wäre das real die projektweiten
`.claude/settings.json`-Hooks (`guard-settings.js`/`commit-guard.cjs`) betroffen
gewesen, kein gezielter Fix.

Fallback (wie in der Aufgabenstellung vorgesehen): `--disallowedTools
'Read(~/.claude/**)'`. Permission-Rule-Syntax real gegen `code.claude.com/docs/en/
permissions` geprüft (WebFetch): `Read(~/path)` ist "Path from home directory";
"Claude makes a best-effort attempt to apply `Read` rules to all built-in tools that
read files like Grep and Glob" — eine einzige `Read`-Deny-Regel deckt damit auch
Grep/Glob ab, kein separates Pattern je Werkzeug nötig.

### 2) Geänderte Dateien

- `src/claude-code-gateway/types.ts`: `AufrufEingaben.disallowedTools?: string` (neu).
- `src/claude-code-gateway/index.ts`: `baueAufruf` hängt `--disallowedTools <wert>`
  additiv an, wenn das Feld gesetzt ist (kein Default).
- `scripts/leitstand-server.mjs`: `disallowedTools: 'Read(~/.claude/**)'` gesetzt in
  (a) `starteJarvisChatLauf`s `aufrufEingaben` (Rolle `jarvis`) und (b) dem
  Router-Lauf-Handler (`POST /api/auftraege/<id>/routen`, Rolle `router`).
  `pruefeStartauftrag` lehnt `aufrufEingaben.disallowedTools` im Body von
  `POST /api/laeufe` für jede Rolle ab (Muster settingSources/mcpConfig/
  umgebungsvariablen). Rolle `ausfuehrung` unverändert.
- `src/execution-controller/execution-controller.test.ts`: zwei neue Fälle
  (ohne Feld kein `--disallowedTools`; mit Feld landet der Wert unverändert in den
  Tokens) plus der bestehende Codex-Test um `disallowedTools` ergänzt (Codex-Zweig
  trägt es nicht ins Argv, Muster settingSources/mcpConfig).
- `scripts/check-f11-auftrag.mjs`: AK5 um den Rotfall `aufrufEingaben.disallowedTools`
  im Body ergänzt.
- `scripts/check-f31-gedaechtnis.mjs`: (a) um dieselbe Erwartung am echten
  `POST /api/chat`-Pfad ergänzt; neuer Abschnitt (k) (QA-Pass-Befund: (a) deckte nur
  den Jarvis-Pfad, nicht den Router-Pfad ab) prüft dieselbe Erwartung real am echten
  `POST /api/auftraege/<id>/routen`-Pfad.

### 3) Checks und Red-Case

`npm run check`: **Exit 0**, 620/620 Tests grün, kein neuer Befund.

Red-Case real gezeigt (nicht nur behauptet): `git worktree add ../ai-workforce-
f40ws3-redcase main` (974757c, vor diesem Fix), die drei geänderten Testdateien
(`check-f11-auftrag.mjs`, `check-f31-gedaechtnis.mjs`,
`execution-controller.test.ts`) dorthin kopiert, `npm ci`, dann:

| Prüfung | Exit gegen `main` (ohne Fix) | Befund |
|---|---|---|
| `node scripts/check-f11-auftrag.mjs` | **1** | "AK5-Rotfall (F40 WS-3): Body mit 'aufrufEingaben.disallowedTools' sollte für JEDE Rolle abgelehnt werden, wurde durchgelassen" |
| `node scripts/check-f31-gedaechtnis.mjs` | **1** | "(a) F40 WS-3: erwartet aufrufEingaben.disallowedTools 'Read(~/.claude/**)', erhalten {…kein disallowedTools-Feld…}" |
| `node:test` (`F40 WS-3: … landet unverändert in den … Tokens`) | **fail** | `AssertionError: '--disallowedTools' fehlt in den Tokens` |

Alle drei auf diesem Branch grün (Teil des `npm run check`-Laufs oben). Worktree
danach entfernt (`git worktree remove --force`).

Nachträglich (QA-Pass-Korrekturrunde) derselbe Red-Case-Nachweis für den neuen
Abschnitt (k) in `check-f31-gedaechtnis.mjs` (Router-Pfad-Äquivalent zu (a)) über
einen zweiten `git worktree` gegen `main` wiederholt: Exit 1, Befund "(k) F40 WS-3:
erwartet aufrufEingaben.disallowedTools 'Read(~/.claude/**)' am echten
POST /api/auftraege/<id>/routen-Pfad, erhalten {…kein disallowedTools-Feld…}" — auf
diesem Branch grün.

### 4) Realer Nachweis

**(a) Isolierte Kausalprobe** — direkt gegen `claude.exe`, dieselben Tokens wie
`baueAufruf` real produziert (`--setting-sources '' --tools Read --allowedTools Read
--strict-mcp-config --mcp-config '{"mcpServers":{}}'`, plus im MIT-Fall
`--disallowedTools 'Read(~/.claude/**)'` unmittelbar vor `-p`, exakt wie
`baueAufruf` es anhängt — `--model`/`--output-format stream-json --verbose`/`-p`
selbst sind in beiden Läufen gleich und unten aus Platzgründen nicht wiederholt, da
sie für die Fragestellung ohne Wirkung sind), Prompt bittet um den ersten
Zeileninhalt der echten `MEMORY.md`-Datei dieser Maschine (oder `DENIED` bei
Fehlschlag):

| Aufruf | `result` |
|---|---|
| OHNE `--disallowedTools` | `# Memory Index` — echter Dateiinhalt, der Prozess hat real gelesen |
| MIT `--disallowedTools 'Read(~/.claude/**)'` | `DENIED` |

Deterministischer Beleg des Mechanismus, unabhängig von Modell-Variation: derselbe
Aufruf, derselbe Prompt, einziger Unterschied ist das neue Argv-Flag.

**(b) Dieselben 5 Statusfragen wie im WS-2-Nachweis**, real gegen den Leitstand aus
diesem Hauptrepo (`LEITSTAND_ZEITMESSUNG=1 LEITSTAND_PORT=4181 node
scripts/leitstand-server.mjs`, Startvorlage `beispielprojekt.json`, Worker
`claude-code`, 21.09.2026). **Vorbehalt Systemlast** (Muster der übrigen Nachweise
dieses Dokuments): 15 fremde `claude.exe` liefen parallel.

| Frage | `num_turns` | `dauer_ms` | Werkzeugaufrufe gesamt | `~/.claude`-Zugriff | Antwort korrekt |
|---|---:|---:|---:|---:|---|
| Wo stehen wir gerade in der Roadmap? | 1 | 3.625 | 0 | nein | ja |
| Welche P1-Findings sind offen? | 1 | 3.882 | 0 | nein | ja (alle 37 IDs korrekt gelistet, Modell nannte die Summe selbst als "36" — derselbe Zähl-Off-by-one wie im WS-2-Nachweis, keine fehlende ID) |
| Was ist der aktuelle Phasen-Stand des Projekts? | 1 | 4.328 | 0 | nein | ja |
| Ist F32 schon abgeschlossen? | 1 | 3.109 | 0 | nein | ja ("Nein … IN_ARBEIT", korrekt gegen `features/F32/feature.md`) |
| Gibt es offene P1-Findings zu Codex? | 1 | 4.113 | 0 | nein | ja (alle 10 Codex-P1-TECH_DEBT korrekt genannt) |

**0 von 5 Läufen griffen auf `~/.claude/**` zu** — gegenüber 1 von 5 im WS-2-Nachweis
(dort: Turn "Ist F32 schon abgeschlossen?" mit `num_turns:3`, zwei Werkzeugaufrufen
`Read features/F32/feature.md` + `Read ~/.claude/…/memory/MEMORY.md`). Derselbe Turn
antwortet jetzt in 1 Turn ganz ohne Werkzeugaufruf, inhaltlich weiterhin korrekt.
Kein kontrollierter A/B-Vergleich (andere Läufe, kein Doppellauf gegen denselben
Zustand, kleine Stichprobe) — der Rückgang ist ein starkes Indiz, der deterministische
Beleg ist (a).

**(c) Ein realer `router`-Lauf**: ein Testauftrag ("F40 WS-3 Nachweis: Router-Lauf
ohne Auto-Memory-Zugriff", Auftragstext bittet um einen Ein-Schritt-Workflow, der
`scripts/check-f31-gedaechtnis.mjs` liest) über `POST /api/auftraege/<id>/routen`
geroutet. Ergebnis: `num_turns:2`, `duration_ms:12.528`, `is_error:false`, genau
1 Werkzeugaufruf (`Read` auf `scripts/check-f31-gedaechtnis.mjs`, real gelesen — die
Deny-Regel blockiert also NICHT legitime Projektdatei-Reads, nur `~/.claude/**`),
**0 Zugriffe auf `~/.claude/**`**.

Alle Rohstrom-Prüfungen liefen direkt gegen `kontrollzustand-roh/<laufId>/
rohstrom.json` (`tool_use`-Blöcke im `stdout`-NDJSON durchsucht), nicht nur gegen die
Chat-Antwort — Muster des WS-2-Nachweises.

### 5) Blocker

Keine. `npm run check` grün. Reviewer-/QA-Pass mit frischem Kontext (Subagenten
`code-reviewer` + `qa`) ist gelaufen: beide "Freigegeben mit Hinweisen". Der einzige
echte Befund (QA, mittel): `check-f31-gedaechtnis.mjs` (a) deckte nur den
Jarvis-Chat-Pfad ab, kein Äquivalent für den Router-Pfad — behoben durch den neuen
Abschnitt (k) (real gegen den echten `POST /api/auftraege/<id>/routen`-Pfad geprüft,
Red-Case dafür ebenfalls real gegen `main` gezeigt, siehe oben). Der
code-reviewer-Hinweis (doppelter Literalwert `'Read(~/.claude/**)'`) ist ebenfalls
behoben (`AUTO_MEMORY_DENY_REGEL`-Konstante). Zwei niedrigwertige
Dokumentationsbefunde nachgetragen (siehe `features/F40/feature.md` "Bekannte
Grenzen" und die Kausalprobe oben). Freigabe/Commit liegt bei Stefan — dieser
Auftrag committet nichts selbst.
