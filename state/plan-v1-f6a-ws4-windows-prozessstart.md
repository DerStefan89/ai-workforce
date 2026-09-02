<!-- Ziel-Pfad im Repo: state/plan-v1-f6a-ws4-windows-prozessstart.md -->

# Plan v1 — F6a WS4: Windows-tauglicher Prozessstart (F-069)

Vorgänger: `state/plan-v1-f6a-ws2-ws3-prozessstart.md`,
`state/tasks/f6a-ws3-realer-nachweis.md`, `state/gates.md` (WS3-Eintrag
2026-09-02), `state/findings.md` F-057 / F-069.
Challenge: `claude/102_CHALLENGE_F069_WINDOWS_PROZESSSTART.md`.

## 1 Problem

`execFile('claude', tokens, ...)` startet auf der Zielmaschine keinen
Prozess: `claude` löst nur auf `claude.cmd` auf; Node führt `.cmd` ohne
`shell: true` nicht aus (`ENOENT` beim bloßen Namen, synchroner `EINVAL`
bei explizitem `.cmd`). Real gemessen in WS3.

## 2 Entscheidungen (Stefan, 02.09.2026)

**E1 — Startweg: `node` + `cli.js`.** Gestartet wird die
Node-Laufzeit mit dem absoluten Pfad zum CLI-JavaScript der vorhandenen
npm-Global-Installation als erstem Argument. Kein `shell: true`, keine
zusätzliche Werkzeuginstallation. F-057 und AK14 bleiben unverändert
gültig.

**E2 — Pfadherkunft: vom Aufrufer übergeben.** Das Gateway rät den
Startpfad nicht und liest ihn nicht aus dem Arbeitsbaum. Er kommt als
Pflichtfeld in `GatewayEingaben` von außen — analog zu `tokens` und
`werkzeugVersionDeklariert`. Die Vertrauensfrage (E-188-Gültigkeits-
schlüssel) wandert damit zum Aufrufer (später F8), wo sie hingehört.

**Verworfen: `shell: true`.** Bricht AK14 (gemergtes
Akzeptanzkriterium, per Gate-Grep erzwungen) und schaltet den
`cmd.exe`-Parser genau für `-p <Prompt>` wieder ein — Node escaped bei
`shell: true` unter Windows nicht.

## 3 Schnitt

### Schritt 0 — Messen, nicht annehmen

Vor jeder Codeänderung real messen und im Vertragsbericht wörtlich
festhalten:

- `where claude` / `npm root -g`
- Existenz und **exakter Dateiname** des CLI-Einstiegs unter
  `<npm root -g>/@anthropic-ai/claude-code/` (die Annahme „`cli.js`" ist
  eine Annahme, kein Messwert)
- `node <cli-einstieg> --version` → belegt in einem Zug, dass der
  Startweg trägt **und** liefert den E-188-Wert „Version des
  Ausführungswerkzeugs"
- `process.execPath` der Projekt-Node-Laufzeit

Schlägt Schritt 0 fehl (kein auffindbarer JS-Einstieg), **ESCALATE** —
kein Ausweichen auf `shell: true`.

### Schritt 1 — `types.ts`

- `GatewayEingaben` erhält `werkzeugStartziel: string[]` (Pflichtfeld):
  das Argv-Präfix. `[0]` ist das zu startende Programm, alle weiteren
  Elemente stehen **vor** `tokens`. Für E1:
  `[process.execPath, '<absoluter Pfad zum CLI-Einstieg>']`.
- `ProzessErgebnis` erhält `startfehler: { code: string | null; message: string } | null`
  (behebt C3 — der Rohstrom verliert den Startfehler heute vollständig).
- `Starter` erhält das Argv-Präfix als zusätzlichen Parameter.

### Schritt 2 — `prozessstart.ts`

- `starteProzess(startziel, tokens, optionen)` ruft
  `execFile(startziel[0], [...startziel.slice(1), ...tokens], ...)`.
  Weiterhin ausschließlich Argv-Array, weiterhin kein `shell`.
- **Startziel-Guard, vor dem Spawn** (neu, AK15):
  1. `startziel` nicht leer;
  2. `startziel[0]` ist ein **absoluter** Pfad (keine PATH-/PATHEXT-
     Auflösung — genau die Mehrdeutigkeit, die WS3 zu Fall gebracht hat);
  3. Endung von `startziel[0]` ist nicht `.cmd`, `.bat`, `.com`, `.ps1`
     (case-insensitiv);
  4. Datei existiert.
  Verstoß → definierter Fehler, **kein** Spawn-Versuch.
- **Synchroner Wurf abgefangen** (behebt C2): der `execFile`-Aufruf
  liegt in `try/catch`; ein synchroner Wurf wird zu
  `{ stdout: '', stderr: '', exitCode: null, startfehler: {...} }`, nicht
  zu einer geworfenen Ausnahme.
- Callback-Fehler ohne numerischen `code` (z. B. `'ENOENT'`) füllen
  `startfehler`, statt spurlos in `exitCode: null` zu verschwinden.
- Attrappen bekommen `startfehler: null`.

### Schritt 3 — `index.ts`

- `starteGateway` prüft `werkzeugStartziel` **vor** der
  `RUN_PREPARED`-Wirkungsmarke. Ungültiges Startziel →
  `{ ok: false, grund }`, kein Kontrollzustand, keine offene
  `RUN_PREPARED`-Sequenz.
- `werkzeugStartziel` wird an `starteProzess` durchgereicht.
- **`LAUFAKTE_V0` bleibt unverändert** — kein neues Feld, kein
  Schema-Bump. Der Startfehler ist Beobachtung und gehört in den
  Rohstrom, nicht in die kanonische Laufakte.

### Schritt 4 — Gate + Tests

- AK14 (Grep) unverändert erhalten.
- **AK15 neu** in `scripts/check-f6a-claude-code-gateway.mjs`:
  Rot-Fall je Guard-Regel (relativer Pfad; `.cmd`-Endung; nicht
  existierende Datei; leeres Startziel) → jeweils abgelehnt, **ohne**
  Spawn-Versuch; Grün-Fall mit einem echten, harmlosen Startziel
  (`process.execPath` + `-e "process.exit(0)"`) → startet real.
  Nach `ARCHITECTURE.md` §8: ohne kalibrierten Rot- **und** Grün-Fall
  darf die Grenze nicht `ERZWUNGEN` heißen.
- Test für C2: ein `Starter`-freier Pfad, der real synchron wirft, führt
  zu einem Ergebnisobjekt statt zu einer Ausnahme.
- Test für C3: `startfehler` landet im Rohstrom.
- `npm run check` bleibt netzfrei und startet keinen Claude-Code-Prozess
  (AK10) — der AK15-Grün-Fall startet nur `node -e`.

### Schritt 5 — Realer Nachweislauf (Wiederholung von WS3)

`scripts/verify-f6a-real-run.mjs` bekommt das in Schritt 0 gemessene
`werkzeugStartziel` und läuft erneut. Erwartet: echtes
`"type":"result"`-JSON, `beobachtungsbasis_vollstaendig: true`,
Terminalausgang möglich. Ergebnis wörtlich in `state/gates.md`.

**Bedingter Zusatz (F-059, `modell_beobachtet`):** trägt das reale
Ergebnisobjekt die Modellidentität eindeutig, wird die Extraktion in
diesem Vertrag umgesetzt (kleiner Zusatz + Test, schließt F6a AK8).
Ist das Feld mehrdeutig oder fehlt es, bleibt der Wert `null` und wird
als FOLGT dokumentiert — **nicht raten** (Muster F-059/F-061).

## 4 SCOPE-NICHT

- Keine native Claude-Code-Binary installieren (E1 verworfen-Variante).
- Kein `shell: true`, unter keinen Umständen.
- Keine Änderung an `baueAufruf`, `pruefeAufrufparameter`, F1B, F2, F7.
- Keine volle `pruefeStartfreigabe` (bleibt F6b).
- Kein `LAUFAKTE_V0`-Schema-Bump.
- Kein Auflösen des Startpfads im Gateway selbst (E2).

## 5 SCOPE-KANN (gleicher Ort, kleine Härtung)

F-060: das AK14-Muster erkennt `execSync`, andere `.join`-Trennzeichen
und Template-Literal-Zusammenbau nicht. Da Schritt 4 dieselbe Datei
anfasst, kann die Regel hier mitgehärtet werden (Vorbild:
`scripts/check-f4-invocation-policy.mjs:259`). Kein Blocker.

## 6 Offene Unsicherheiten

1. Exakter Dateiname des CLI-Einstiegs (Schritt 0 klärt).
2. Ob `node <cli.js>` sich identisch zu `claude.cmd` verhält
   (Arbeitsverzeichnis, Umgebungsvariablen, `--setting-sources`).
   Schritt 5 klärt real.
3. Ob der Startweg auf einer anderen Maschine trägt — ausdrücklich
   nicht Gegenstand; E2 verlagert das zum Aufrufer.
